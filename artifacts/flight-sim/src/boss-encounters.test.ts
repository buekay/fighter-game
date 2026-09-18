import assert from "node:assert/strict";
import { getBossForLevel, getEncounterProgressionLevel, BOSS_SEQUENCE, CITY_WEAPONS, ENCOUNTER_HEALTH, encounterHealth, encounterComplete } from "./boss-encounters";
import { BOSS_FIGHT_COUNT } from "./game-rules";
assert.deepEqual(BOSS_SEQUENCE, ["titan", "tank", "spider", "submarine", "city"]);
assert.equal(BOSS_SEQUENCE.length, BOSS_FIGHT_COUNT);
for (const kind of BOSS_SEQUENCE) {
  const health = encounterHealth(kind);
  assert.equal(health.reduce((sum, hp) => sum + hp, 0), ENCOUNTER_HEALTH);
  assert.ok(health.every(hp => hp > 0 && Number.isInteger(hp)));
}
assert.equal(encounterHealth("city").length, CITY_WEAPONS.length);
assert.ok(CITY_WEAPONS.includes("flame"));
const defenders = CITY_WEAPONS.map(() => ({ killRegistered: false }));
assert.equal(encounterComplete([]), false);
for (let i = 0; i < defenders.length; i++) {
  assert.equal(encounterComplete(defenders), false);
  defenders[i].killRegistered = true;
}
assert.equal(encounterComplete(defenders), true);

for (let level = 1; level <= 500; level++) {
  const expected: string | null = level >= 20 && level <= 40 && level % 5 === 0
    ? BOSS_SEQUENCE[(level - 20) / 5]
    : level >= 50 && level % 10 === 0 ? BOSS_SEQUENCE[((level - 50) / 10) % 5] : null;
  assert.equal(getBossForLevel(level), expected, `Boss at level ${level}`);
}
assert.equal(getBossForLevel(20.5), null);
assert.equal(getBossForLevel(NaN), null);
assert.equal(getEncounterProgressionLevel(19, 36, new Set(), false), 20);
assert.equal(getEncounterProgressionLevel(20, 36, new Set(), false), 20);
assert.equal(getEncounterProgressionLevel(20, 36, new Set([20]), true), 20);
assert.equal(getEncounterProgressionLevel(20, 36, new Set([20]), false), 25);
assert.equal(getEncounterProgressionLevel(40, 105, new Set([40]), false), 50);
assert.equal(getEncounterProgressionLevel(50, 50, new Set([50]), false), 50);
assert.equal(getEncounterProgressionLevel(90, 105, new Set([90]), false), 100);

console.log("Boss encounter tests passed");
