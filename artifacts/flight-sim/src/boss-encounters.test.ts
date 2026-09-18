import assert from "node:assert/strict";
import { BOSS_SEQUENCE, CITY_WEAPONS, ENCOUNTER_HEALTH, encounterHealth, encounterComplete } from "./boss-encounters";
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
console.log("Boss encounter tests passed");
