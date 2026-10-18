import assert from 'node:assert/strict';
import { BOSS_SEQUENCE } from './boss-encounters';
import { createBossSpecial, advanceBossSpecial } from './boss-specials';
import { createBossParts, partBounds, hitBossPart, HAZARDS, createHazards, tickHazard, hazardHits, hazardPush, createSecret, loadMasteries, saveMasteries, masteryFor, masteryUnlocked, recordMastery, loadDefeatedBosses, rememberBoss, createCoopPilot, damageCoop, tickCoop, rollingDps } from './flight-features';

// Aimed parts are independent, finite, and cannot be damaged through the other region.
for (const kind of BOSS_SEQUENCE) {
  const boss = { x: 500, y: 100, width: 300, height: 200 };
  const parts = createBossParts(kind, 1000);
  assert.equal(hitBossPart(boss, parts, { x: 700, y: 195, width: 8, height: 8 }, 10), null);
  for (const part of parts) {
    const b = partBounds(boss, part);
    const hit = { x: b.x + 5, y: b.y + 5, width: 8, height: 8 };
    assert.equal(hitBossPart(boss, parts, hit, -1), null);
    assert.equal(hitBossPart(boss, parts, hit, NaN), null);
    assert.equal(hitBossPart(boss, parts, hit, 20), part);
    assert.equal(part.hp, 100);
    hitBossPart(boss, parts, hit, 9999);
    assert.equal(part.hp, 0);
    assert.equal(hitBossPart(boss, parts, hit, 20), null);
  }
}
// Removing a weapon cancels the matching special, but the other attacks continue.
for (const kind of ['tank', 'spider', 'submarine'] as const) {
  const special = createBossSpecial(kind);
  special.stage = 'warning'; special.remaining = 1;
  assert.deepEqual(advanceBossSpecial(special, 2, [{ x: 700, y: 300 }], { x: 50, y: 300 }, 1, false, [0]), []);
  special.index = 1; special.stage = 'warning'; special.remaining = 1;
  special.origin = { x: 700, y: 300 }; special.target = { x: 50, y: 300 };
  assert.ok(advanceBossSpecial(special, 2, [{ x: 700, y: 300 }], { x: 50, y: 300 }, 1, false, [0]).length > 0);
}
// Natural terrain stays anchored and airborne hazards have physically plausible motion.
for (const biome of Object.keys(HAZARDS)) {
  for (const random of [0, .5, 1, NaN, Infinity]) {
    const hazards = createHazards(biome, random);
    assert.ok(hazards.length > 0 && hazards.length <= 3);
    for (const h of hazards) {
      assert.ok(h.width > 0 && h.height > 0 && Number.isFinite(h.x) && Number.isFinite(h.y));
      const original = { ...h };
      const center = { x: h.x + h.width * .4, y: h.y + h.height * .4, width: 8, height: 8 };
      assert.equal(hazardHits(h, center), false, 'Warnings never damage the pilot');
      tickHazard(h, 1000);
      assert.equal(h.warningMs, original.warningMs - 1000);
      assert.equal(h.x, original.x); assert.equal(h.y, original.y);
      tickHazard(h, original.warningMs - 1000 + 250);
      assert.equal(h.warningMs, 0);
      assert.equal(h.x, original.x + h.vx * .25);
      assert.equal(h.y, original.y + original.vy * .25 + .5 * h.gravity * .25 ** 2);
      assert.equal(h.lifeMs, original.lifeMs - 250);
      assert.equal(hazardHits(h, { x: -200, y: -200, width: 10, height: 10 }), false);
      h.lifeMs = 0; assert.equal(hazardHits(h, center), false);
    }
  }
}
for (const biome of ['canyon', 'jungle', 'arctic', 'space', 'city', 'volcano', 'storm']) {
  const h = createHazards(biome, .5)[0];
  tickHazard(h, h.warningMs);
  if (h.outline) {
    assert.equal(hazardHits(h, { x: h.x + h.width * .43, y: h.y + h.height * .65, width: 3, height: 3 }), true);
    if (biome !== 'canyon') assert.equal(hazardHits(h, { x: h.x + 1, y: h.y + 1, width: 2, height: 2 }), false, 'Empty terrain corners are safe');
  } else {
    assert.equal(hazardHits(h, { x: h.x + h.width / 2, y: h.y + h.height / 2, width: 4, height: 4 }), true);
    assert.equal(hazardHits(h, { x: h.x, y: h.y, width: 1, height: 1 }), false);
  }
}
for (const r of [0, .5, 1]) {
  const canyon = createHazards('canyon', r);
  assert.equal(canyon[1].y - (canyon[0].y + canyon[0].height), 170);
  for (const biome of ['arctic', 'jungle']) { const h = createHazards(biome, r)[0]; assert.equal(h.y + h.height, 600); }
}
for (const biome of ['space', 'city', 'volcano']) {
  const reference = createHazards(biome, .5)[0]; tickHazard(reference, 4500);
  for (const hz of [30, 60, 120]) {
    const h = createHazards(biome, .5)[0];
    for (let i = 0; i < hz * 4.5; i++) tickHazard(h, 1000 / hz);
    for (const key of ['x', 'y', 'vy', 'rotation', 'lifeMs'] as const) assert.ok(Math.abs(h[key] - reference[key]) < 1e-7, `${biome} ${key} stable at ${hz}Hz`);
  }
}
const meteor = createHazards('space', .5)[0]; assert.equal(meteor.gravity, 0);
const lava = createHazards('volcano', .5)[0]; assert.ok(lava.vy < 0 && lava.gravity > 0);
const debris = createHazards('city', .5)[0]; assert.ok(debris.vy > 0 && debris.gravity > 0);
const bolt = createHazards('storm', .5)[0]; assert.equal(bolt.lifeMs, 220); assert.equal(bolt.warningMs, 2000);
for (const r of [.2, .8]) {
  const wind = createHazards('plains', r)[0]; assert.equal(hazardPush(wind), 0);
  tickHazard(wind, wind.warningMs + 325);
  assert.ok(Math.abs(hazardPush(wind)) <= 95 / 2 + 1e-8);
  assert.equal(Math.sign(hazardPush(wind)), Math.sign(wind.vy));
  const paused = { ...wind }; tickHazard(wind, 0); tickHazard(wind, NaN); assert.deepEqual(wind, paused);
}
assert.equal(createSecret(0).kind, 'wreck'); assert.equal(createSecret(.5).kind, 'rescue'); assert.equal(createSecret(.99).kind, 'ace');
const values = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v),
} });
values.set('fighter-command-mastery-v1', JSON.stringify({ bad: null, corrupt: { kills: 'x', precision: -4 }, valid: { kills: 44, precision: 15, enabled: false } }));
const loaded = loadMasteries();
assert.equal(loaded.bad, undefined); assert.deepEqual(loaded.corrupt, { kills: 0, precision: 0, enabled: true });
assert.equal(masteryUnlocked(loaded.valid), true); assert.equal(loaded.valid.enabled, false);
const all = {};
assert.equal(masteryUnlocked(masteryFor(all, 'laser')), false);
for (let i = 0; i < 39; i++) assert.equal(recordMastery(all, 'laser', true, i < 12), false);
assert.equal(recordMastery(all, 'laser', true, false), true);
assert.equal(recordMastery(all, 'laser', true, false), false);
saveMasteries(all); assert.deepEqual(loadMasteries(), all);
assert.deepEqual(loadDefeatedBosses(19), []); assert.deepEqual(loadDefeatedBosses(25), ['titan', 'tank']);
rememberBoss('spider', 0); assert.deepEqual(loadDefeatedBosses(0), ['spider']);
values.set('fighter-command-defeated-bosses-v1', '{}'); assert.deepEqual(loadDefeatedBosses(20), ['titan']);
// Damage protection, downing, proximity reset and both revive directions.
for (const hz of [30, 60, 120]) {
  const p = createCoopPilot(10);
  assert.equal(damageCoop(p, 10), false);
  tickCoop(p, { x: 400, y: 0 }, false, 2000);
  assert.equal(damageCoop(p, 20), true); assert.equal(p.down, true);
  assert.equal(damageCoop(p, 1), false);
  tickCoop(p, p, false, 1200); assert.equal(p.reviveMs, 1200);
  tickCoop(p, { x: 500, y: 0 }, false, 10); assert.equal(p.reviveMs, 0);
  for (let i = 0; i < hz * 3; i++) tickCoop(p, p, false, 1000 / hz);
  assert.equal(p.down, false); assert.equal(p.hp, 5);
  assert.equal(tickCoop(p, p, true, 2500), 'leader');
  p.down = true; assert.equal(tickCoop(p, p, true, 10000), null);
}
const samples = [{ time: 0, damage: 5 }, { time: 2000, damage: 10 }, { time: 7000, damage: 15 }];
assert.equal(rollingDps(samples, 7000), 5); assert.equal(samples.length, 2);
assert.equal(rollingDps(samples, 13000), 0);
// Unavailable storage never crashes progression.
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
assert.deepEqual(loadMasteries(), {}); saveMasteries(all); rememberBoss('titan', 0);
console.log('Flight features: boss parts, hazards, secrets, mastery, training DPS and co-op rules passed.');
