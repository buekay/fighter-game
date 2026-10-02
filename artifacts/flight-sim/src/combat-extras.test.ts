import assert from "node:assert/strict";
import { activateExtra, applyExtraDamage, blockWithExtra, collectChaos, consumeCounter, createCombatExtras, distanceToTrail, EXTRA_ITEMS, hasExtraFire, getMagnetTarget, magnetStep, tickCombatExtras } from "./combat-extras";

const owned = EXTRA_ITEMS.map(item => item.id);
const life = { hp: 3, maxHp: 10, lives: 2, gameOver: false };
const origin = { x: 100, y: 100 };
const extra = createCombatExtras();
assert.equal(activateExtra(extra, "shadow_dash", []), false, "locked extras cannot activate");
assert.equal(activateExtra(extra, "shadow_dash", owned), true);
assert.equal(activateExtra(extra, "shadow_dash", owned), false, "cooldown prevents repeats");
assert.equal(blockWithExtra(extra), "dash");
tickCombatExtras(extra, 15);
assert.equal(blockWithExtra(extra), null, "dash protection expires after 250 ms");
tickCombatExtras(extra, 345);
assert.equal(activateExtra(extra, "shadow_dash", owned), true);

for (const hz of [30, 60, 120]) {
  const timed = createCombatExtras();
  activateExtra(timed, "perfect_counter", owned);
  for (let i = 0; i < hz / 2; i++) tickCombatExtras(timed, 60 / hz);
  assert.equal(timed.parry, 0);
  assert.equal(timed.cooldowns.perfect_counter, 210);
}
const counter = createCombatExtras();
activateExtra(counter, "perfect_counter", owned);
tickCombatExtras(counter, 14);
assert.equal(blockWithExtra(counter), "counter", "late hit inside window counters");
assert.equal(blockWithExtra(counter), null, "one counter per activation");
assert.equal(consumeCounter(counter), 2);
assert.equal(consumeCounter(counter), 1, "one amplified volley only");
tickCombatExtras(counter, 240);
activateExtra(counter, "perfect_counter", owned);
tickCombatExtras(counter, 15);
assert.equal(blockWithExtra(counter), null, "hit after window cannot counter");
tickCombatExtras(counter, 240);
activateExtra(counter, "perfect_counter", owned);
blockWithExtra(counter);
tickCombatExtras(counter, 300);
assert.equal(consumeCounter(counter), 1, "unused charge expires");

const spark = createCombatExtras();
assert.equal(applyExtraDamage(spark, life, 2, true, origin).hp, 1);
assert.equal(spark.sparkUsed, false, "near-lethal damage does not waste rescue");
const rescued = applyExtraDamage(spark, life, 30, true, origin);
assert.deepEqual(rescued, { ...life, hp: 1 });
assert.equal(spark.pulse?.pending, true);
assert.equal(spark.sparkUsed, true);
assert.equal(applyExtraDamage(spark, rescued, 2, true, origin).lives, 1);
const resumed = createCombatExtras(spark.sparkUsed, 7);
assert.equal(applyExtraDamage(resumed, { ...life, lives: 1 }, 30, true, origin).gameOver, true);
assert.equal(resumed.kills, 7);
assert.equal(createCombatExtras().sparkUsed, false, "new mission rearms rescue");
assert.equal(applyExtraDamage(createCombatExtras(), life, 30, false, origin).lives, 1);

const chaos = createCombatExtras();
assert.equal(collectChaos(chaos, 0), "rapid");
assert.equal(collectChaos(chaos, .5), "fire");
assert.equal(hasExtraFire(chaos, []), true);
tickCombatExtras(chaos, 479);
assert.equal(chaos.chaos, "fire");
assert.equal(collectChaos(chaos, .999), "magnet");
assert.equal(chaos.chaosTime, 480, "pickup replaces effect and refreshes duration");
tickCombatExtras(chaos, 480);
assert.equal(chaos.chaos, null);
assert.equal(hasExtraFire(chaos, ["fire_core"]), true);
assert.equal(hasExtraFire(chaos, []), false);
assert.deepEqual(magnetStep(origin, { x: 500, y: 100 }, 1), { x: 0, y: 0 });
assert.deepEqual(magnetStep(origin, { x: 101, y: 100 }, 5), { x: 1, y: 0 }, "pull cannot overshoot target");
assert.deepEqual(magnetStep(origin, { x: 150, y: 100 }, 2), { x: 10, y: 0 });
assert.equal(distanceToTrail({ x: 50, y: 12 }, { x: 0, y: 0 }, { x: 100, y: 0 }), 12);
assert.equal(distanceToTrail({ x: 130, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }), 30);
assert.equal(distanceToTrail(origin, origin, origin), 0, "dash against edge has finite trail geometry");
console.log("Combat extras: ownership, cooldowns, timing, rescue, chaos and combinations passed");

assert.deepEqual(getMagnetTarget({ x: 850, y: 200 }, null, 900), { x: 700, y: 200 }, "right edge keeps pull target away from player");
assert.deepEqual(getMagnetTarget({ x: 250, y: 200 }, { from: { x: 110, y: 200 }, to: { x: 250, y: 200 }, life: 100, tick: 0 }, 900), { x: 110, y: 200 }, "magnet targets burning trail for combo");
