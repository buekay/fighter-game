import assert from "node:assert/strict";
import { advanceMission, createMission, missionProgress } from "./missions";

const stats = { kills: 300, nearMisses: 80, perfectBosses: 5, maxCombo: 100 };

// Each repeated objective requires new events after activation.
for (const [index, key, target] of [
  [4, "kills", 30], [6, "nearMisses", 8], [7, "perfectBosses", 1],
] as const) {
  const mission = createMission(index, stats);
  assert.equal(missionProgress(mission, stats, 0), 0);
  assert.equal(advanceMission(mission, stats, 0, 1000).completed, false);
  const almost = { ...stats, [key]: stats[key] + target - 1 };
  assert.equal(advanceMission(mission, almost, 0, 1000).completed, false);
  const achieved = { ...stats, [key]: stats[key] + target };
  assert.equal(advanceMission(mission, achieved, 0, 1000).completed, true);
}

// An old personal best cannot fulfill the current combo objective.
const comboMission = createMission(1, stats);
assert.equal(missionProgress(comboMission, stats, 0), 0);
assert.equal(advanceMission(comboMission, stats, 19, 1000).completed, false);
const completedCombo = advanceMission(comboMission, stats, 20, 1000);
assert.equal(completedCombo.completed, true);
assert.equal(missionProgress(completedCombo, stats, 0), 20);

// Completion rewards are signaled once; only active play time advances the goal.
assert.equal(advanceMission(completedCombo, stats, 0, 1000), completedCombo);
assert.equal(advanceMission(completedCombo, stats, 0, 3199), completedCombo);
const next = advanceMission(completedCombo, stats, 0, 3200);
assert.equal(next.type, "near_miss");
assert.equal(next.completed, false);
assert.equal(missionProgress(next, stats, 0), 0);

// A complete cycle must not start an automatic stream of free rewards.
let mission = createMission();
let elapsed = 0;
const runStats = { kills: 0, nearMisses: 0, perfectBosses: 0 };
for (let index = 0; index < 4; index++) {
  if (index === 0) runStats.kills = 30;
  if (index === 2) runStats.nearMisses = 8;
  if (index === 3) runStats.perfectBosses = 1;
  mission = advanceMission(mission, runStats, index === 1 ? 20 : 0, elapsed);
  assert.equal(mission.completed, true);
  elapsed += 2200;
  mission = advanceMission(mission, runStats, 0, elapsed);
  assert.equal(mission.completed, false);
}
assert.equal(mission.index, 4);
assert.equal(missionProgress(mission, runStats, 0), 0);
assert.equal(advanceMission(mission, runStats, 0, elapsed + 60_000).completed, false);

// Replacing a run discards the completed goal and its pending transition.
const restarted = createMission();
assert.equal(advanceMission(restarted, { kills: 0, nearMisses: 0, perfectBosses: 0 }, 0, 5000), restarted);
console.log("Mission progression tests passed");
