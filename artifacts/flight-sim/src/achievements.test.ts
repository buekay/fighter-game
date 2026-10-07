import assert from "node:assert/strict";
import { ACHIEVEMENTS, achievementProgress, loadAchievements, saveAchievements, newlyUnlockedAchievements, normalizeRunStats } from "./achievements";
import { createMission, missionProgress } from "./missions";

const empty = normalizeRunStats(undefined);
for (const malformed of [undefined, null, [], "old save", { kills: -10, bosses: Infinity, powerUps: "50", damageTaken: NaN }]) {
  assert.deepEqual(normalizeRunStats(malformed), empty);
}
// Preserve fractional damage and tolerate older saves with only some statistics.
assert.deepEqual(normalizeRunStats({ kills: 24, damageTaken: 4.5 }), { ...empty, kills: 24, damageTaken: 4.5 });

for (const achievement of ACHIEVEMENTS) {
  const below = { ...empty, [achievement.stat]: achievement.target - .5 };
  assert.equal(newlyUnlockedAchievements(below, []).some(a => a.id === achievement.id), false);
  const reached = { ...empty, [achievement.stat]: achievement.target };
  assert.equal(newlyUnlockedAchievements(reached, []).some(a => a.id === achievement.id), true);
  assert.equal(newlyUnlockedAchievements(reached, [achievement.id]).some(a => a.id === achievement.id), false);
  assert.equal(achievementProgress(achievement, reached, false), achievement.target);
  assert.equal(achievementProgress(achievement, empty, true), achievement.target);
}

// Saving and restoring a partial run must keep its next unlock within reach.
const restored = normalizeRunStats(JSON.parse(JSON.stringify({ ...empty, kills: 24, missions: 2, maxCombo: 19 })));
assert.equal(newlyUnlockedAchievements(restored, ["first_sortie", "mission_first"]).length, 0);
restored.kills++;
assert.deepEqual(newlyUnlockedAchievements(restored, ["first_sortie", "mission_first"]).map(a => a.id), ["on_a_roll"]);
// Restored kills cannot immediately replay an already earned mission reward.
assert.equal(missionProgress(createMission(0, restored), restored, 0), 0);
assert.equal(achievementProgress(ACHIEVEMENTS[0], { ...empty, kills: 100 }, false), 10);

const values = new Map<string, string>();
const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem(key: string) { return values.get(key) ?? null; },
  setItem(key: string, value: string) { values.set(key, value); },
} });
try {
  values.set("fighter-command-achievements", JSON.stringify(["first_sortie", "first_sortie", "unknown", null]));
  assert.deepEqual(loadAchievements(), ["first_sortie"]);
  saveAchievements(["first_sortie", "on_a_roll"]);
  assert.deepEqual(loadAchievements(), ["first_sortie", "on_a_roll"]);
  values.set("fighter-command-achievements", "broken JSON");
  assert.deepEqual(loadAchievements(), []);
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota"); },
  } });
  assert.deepEqual(loadAchievements(), []);
  assert.doesNotThrow(() => saveAchievements(["first_sortie"]));
  // The in-memory unlock list remains authoritative if persistence fails.
  const owned = newlyUnlockedAchievements(restored, []).map(a => a.id);
  saveAchievements(owned);
  assert.deepEqual(newlyUnlockedAchievements(restored, owned), []);
} finally {
  if (original) Object.defineProperty(globalThis, "localStorage", original);
  else Reflect.deleteProperty(globalThis, "localStorage");
}
console.log("Achievement progression tests passed");
