import assert from "node:assert/strict";
import { loadSave, saveGame } from "./pages/Game";
import { canCompleteCampaignLevel, getCampaignTarget } from "./campaign";

const values = new Map<string, string>();
const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  },
});

try {
  const state = {
    score: 1234, level: 20, hp: 8, maxHp: 10, shield: 0, speed: 3.2,
    weaponTier: 0, lives: 2, gameOver: false, started: true, paused: false,
  };
  saveGame(state, {} as Parameters<typeof saveGame>[1], [], 1, "none", false, 0,
    undefined, 65_000, true);
  const saved = loadSave()!;
  assert.equal(saved.elapsedMs, 65_000, "Resuming retains total active play time");
  assert.equal(saved.campaignBossDefeated, true, "A defeated boss stays defeated");
  assert.equal(canCompleteCampaignLevel(saved.level, saved.score, saved.campaignBossDefeated!), false);
  assert.equal(canCompleteCampaignLevel(saved.level, getCampaignTarget(saved.level), saved.campaignBossDefeated!), true);

  const raw = JSON.parse(values.get("fighter-command-save")!);
  delete raw.elapsedMs;
  delete raw.campaignBossDefeated;
  values.set("fighter-command-save", JSON.stringify(raw));
  assert.equal(loadSave()!.elapsedMs, 0, "Legacy saves remain resumable");
  assert.equal(loadSave()!.campaignBossDefeated, false);

  for (const elapsedMs of [-1, null, "65000", {}, 1e400]) {
    values.set("fighter-command-save", JSON.stringify({ ...raw, elapsedMs, campaignBossDefeated: "true" }));
    assert.equal(loadSave()!.elapsedMs, 0);
    assert.equal(loadSave()!.campaignBossDefeated, false);
  }

  saveGame(state, {} as Parameters<typeof saveGame>[1]);
  assert.equal(loadSave()!.elapsedMs, 0, "New runs clear earlier checkpoint progress");
  assert.equal(loadSave()!.campaignBossDefeated, false);
  console.log("Save progress regression tests passed");
} finally {
  if (originalDescriptor) Object.defineProperty(globalThis, "localStorage", originalDescriptor);
  else Reflect.deleteProperty(globalThis, "localStorage");
}
