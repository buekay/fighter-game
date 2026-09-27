import { advanceSubmarineDive, isSubmerged, setEnemyHealth } from "./submarine-dive";
import assert from "node:assert/strict";
import { BOSS_SEQUENCE, BOSS_DIMENSIONS, cityMountPosition } from "./boss-encounters";
import { createBossSpecial, advanceBossSpecial, SPECIAL_NAMES, SPECIAL_WARNING_FRAMES } from "./boss-specials";
import { BOSS_SHOT_COLORS, createBossGunfire } from "./boss-gunfire";

const mounts = [{ x: 550, y: 200 }, { x: 730, y: 420 }];
const target = { x: 150, y: 300 };
assert.equal(new Set(Object.values(BOSS_SHOT_COLORS)).size, BOSS_SEQUENCE.length);
for (const kind of ["tank", "spider", "submarine", "city"] as const) {
  const shots = createBossGunfire(kind, mounts[0], target, 0);
  assert.equal(shots.length, { tank: 1, spider: 3, submarine: 2, city: 1 }[kind]);
  for (const shot of shots) {
    assert.equal(shot.color, BOSS_SHOT_COLORS[kind]);
    assert.ok(shot.vx < 0, "Basic guns must aim toward the target");
    assert.ok([shot.x, shot.y, shot.vx, shot.vy].every(Number.isFinite));
  }
}
assert.notDeepEqual(createBossGunfire("city", mounts[0], target, 0),
  createBossGunfire("city", mounts[0], target, 1), "City guns sweep between volleys");
for (const kind of BOSS_SEQUENCE) {
  assert.equal(new Set(SPECIAL_NAMES[kind]).size, 3);
  const state = createBossSpecial(kind);
  for (let frame = 0; frame < 180; frame++) assert.equal(advanceBossSpecial(state, 1, mounts, target, 1).length, 0);
  assert.equal(state.stage, "warning");
  assert.equal(state.remaining, SPECIAL_WARNING_FRAMES);
  const beforeFreeze = structuredClone(state);
  assert.deepEqual(advanceBossSpecial(state, 60, mounts, target, 1, true), []);
  assert.deepEqual(state, beforeFreeze);
  for (let frame = 1; frame < SPECIAL_WARNING_FRAMES; frame++) {
    assert.equal(advanceBossSpecial(state, 1, mounts, { x: 300, y: 100 }, 1).length, 0);
    assert.deepEqual(state.target, target, "Warning target must remain locked");
  }
  assert.ok(advanceBossSpecial(state, 1, mounts, target, 1).length > 0);
  const fired = new Set([state.index]);
  for (let frame = 0; frame < 1800; frame++) {
    const shots = advanceBossSpecial(state, 1, mounts, target, .5);
    if (shots.length) fired.add(state.index);
    assert.ok(shots.length <= 90);
    for (const shot of shots) {
      assert.ok([shot.x, shot.y, shot.vx, shot.vy, shot.damage, shot.lifetime].every(Number.isFinite));
      assert.ok(shot.lifetime > 0 && shot.lifetime <= 300);
      assert.equal(shot.fromPlayer, false);
    }
  }
  assert.deepEqual([...fired].sort(), [0, 1, 2]);
  // Identical simulated duration at 30/60/120 Hz must produce the same shots.
  const totals = [2, 1, .5].map(step => {
    const s = createBossSpecial(kind);
    let count = 0;
    for (let frames = 0; frames < 2400; frames += step) count += advanceBossSpecial(s, step, mounts, target, 1).length;
    return count;
  });
  assert.equal(totals[0], totals[1]); assert.equal(totals[1], totals[2]);
}
const city = createBossSpecial("city");
city.stage = "warning"; city.remaining = 1; city.mounts = [...mounts]; city.origin = mounts[0]; city.target = target;
advanceBossSpecial(city, 1, [mounts[1]], target, 1);
assert.deepEqual(city.mounts, [mounts[1]], "Destroyed city mounts cannot keep attacking");
const stopped = structuredClone(city);
assert.deepEqual(advanceBossSpecial(city, 1, [], target, 1), []);
assert.deepEqual(city, stopped);
for (let slot = 0; slot < 6; slot++) {
  const p = cityMountPosition(slot, 900, 600), size = BOSS_DIMENSIONS.city;
  assert.ok(p.x >= 450 && p.x + size.width <= 900);
  assert.ok(p.y >= 90 && p.y + size.height <= 600);
}
assert.deepEqual(BOSS_DIMENSIONS.titan, { width: 190, height: 164 });
assert.ok(BOSS_DIMENSIONS.tank.width > 190);
assert.ok(BOSS_DIMENSIONS.spider.height > 164);
assert.ok(BOSS_DIMENSIONS.submarine.width > 230);
console.log("Boss special attack tests passed");

// Diving catches the half-health boundary even for lethal burst damage.
const submarine = { encounterKind: "submarine", hp: 9000, maxHp: 9000 };
setEnemyHealth(submarine, 4501);
assert.equal(isSubmerged(submarine), false);
setEnemyHealth(submarine, -1000);
assert.equal(submarine.hp, 4500);
assert.equal(isSubmerged(submarine), true);
const submergedSpecial = createBossSpecial("submarine");
submergedSpecial.stage = "warning"; submergedSpecial.remaining = 1;
const lockedSpecial = structuredClone(submergedSpecial);
for (let tick = 0; tick < 100; tick++) {
  setEnemyHealth(submarine, submarine.hp - 10000);
  assert.equal(submarine.hp, 4500, "All damage is blocked underwater");
  assert.deepEqual(advanceBossSpecial(submergedSpecial, 1, [], target, .5), []);
}
assert.deepEqual(submergedSpecial, lockedSpecial, "Submerged weapons must pause, not queue attacks");
advanceSubmarineDive(submarine, 9999);
assert.equal(isSubmerged(submarine), true);
advanceSubmarineDive(submarine, 1);
assert.equal(isSubmerged(submarine), false);
setEnemyHealth(submarine, 4000);
assert.equal(submarine.hp, 4000);
assert.equal(isSubmerged(submarine), false, "The dive happens only once");
setEnemyHealth(submarine, 0);
assert.equal(submarine.hp, 0);
for (const encounterKind of ["titan", "tank", "spider", "city"]) {
  const other = { encounterKind, hp: 9000, maxHp: 9000 };
  setEnemyHealth(other, 0);
  assert.equal(other.hp, 0);
  assert.equal(isSubmerged(other), false);
}
console.log("Submarine dive tests passed");
