import assert from 'node:assert/strict';
import { awakenSpirit, tickSpirit, spiritTouches, nextSpiritAction, moveSpirit } from './element-spirits';

assert.equal(awakenSpirit('lava', 900, 600).friendly, true);
assert.equal(awakenSpirit('lightning', 300, 250).friendly, false);
assert.equal(awakenSpirit('ice', 300, 250).element, 'crystal');
for (const hz of [30, 60, 120]) {
  for (const kind of ['lightning', 'ice'] as const) {
    const spirit = awakenSpirit(kind, 300, 250);
    for (let frame = 0; frame < hz * 10; frame++) {
      assert.equal(tickSpirit(spirit, 1000 / hz, [{ x: 380, y: 250 }, { x: 300, y: 250 }]), 'waiting');
    }
    assert.equal(spirit.friendly, false, `hostile spirit stays hostile at ${hz} Hz`);
    assert.equal(nextSpiritAction(spirit), kind === 'ice' ? 'summon' : 'cannon');
  }
}
const hostile = awakenSpirit('debris', 300, 250);
for (let i = 0; i < 100; i++) tickSpirit(hostile, 50, [{ x: 300, y: 250 }]);
assert.equal(hostile.friendly, false, 'contact does not change allegiance');
const before = hostile.remainingMs;
tickSpirit(hostile, 0, []);
assert.equal(hostile.remainingMs, before, 'paused time stays frozen');
const friendly = awakenSpirit('wave', 300, 250);
tickSpirit(friendly, 1200, []);
assert.equal(tickSpirit(friendly, 20, [{ x: 300, y: 250 }]), 'gift', 'either active pilot can collect');
console.log('Element spirit rules passed');

const expired = awakenSpirit('wave', 300, 250);
assert.equal(tickSpirit(expired, 20000, [{ x: 300, y: 250 }]), 'waiting', 'expired spirits cannot award gifts');
assert.equal(expired.remainingMs, 0);
const contact = awakenSpirit('ice', 300, 250);
contact.ageMs = 1200;
assert.equal(spiritTouches(contact, { x: 330, y: 240, width: 52, height: 28 }), true, 'wing contact hits even when center is outside core');
assert.equal(spiritTouches(contact, { x: 340, y: 240, width: 52, height: 28 }), false);
contact.friendly = true;
assert.equal(spiritTouches(contact, { x: 300, y: 250, width: 52, height: 28 }), false);

for (const hz of [30, 60, 120]) {
  for (const [kind, action, count] of [['wave', 'heal', 3], ['lava', 'attack', 4], ['lightning', 'cannon', 3]] as const) {
    const spirit = awakenSpirit(kind, 300, 250);
    let actions = 0;
    for (let i = 0; i < hz * 10; i++) {
      tickSpirit(spirit, 1000 / hz, []);
      const result = nextSpiritAction(spirit);
      if (result) { assert.equal(result, action); actions++; }
    }
    assert.equal(actions, count, `${action} cadence at ${hz} Hz`);
  }
}
const summoner = awakenSpirit('ice', 300, 250);
summoner.ageMs = 3000;
assert.equal(nextSpiritAction(summoner), 'summon');
summoner.summoned = 4; summoner.ageMs = 8000;
assert.equal(nextSpiritAction(summoner), null, 'summoning is capped');
const pausedSpirit = awakenSpirit('wave', 300, 250);
pausedSpirit.ageMs = 3000;
assert.equal(nextSpiritAction(pausedSpirit), 'heal');
for (let i = 0; i < 100; i++) { tickSpirit(pausedSpirit, 0, []); assert.equal(nextSpiritAction(pausedSpirit), null); }

const positions: { x: number; y: number }[] = [];
for (const hz of [30, 60, 120]) {
  const drifting = awakenSpirit('lightning', 500, 300);
  moveSpirit(drifting);
  for (let i = 0; i < hz * 10; i++) { tickSpirit(drifting, 1000 / hz, []); moveSpirit(drifting); }
  assert.ok(drifting.x < 400, 'spirit travels through the world');
  assert.notEqual(drifting.y, 300, 'spirit also drifts vertically');
  positions.push({ x: drifting.x, y: drifting.y });
  const beforePause = { x: drifting.x, y: drifting.y };
  tickSpirit(drifting, 0, []); moveSpirit(drifting);
  assert.deepEqual({ x: drifting.x, y: drifting.y }, beforePause);
}
for (const position of positions) {
  assert.ok(Math.abs(position.x - positions[0].x) < 1e-7);
  assert.ok(Math.abs(position.y - positions[0].y) < 1e-7);
}
const edgeSpirit = awakenSpirit('wave', 140, 470);
for (let i = 0; i < 150; i++) {
  tickSpirit(edgeSpirit, 100, []); moveSpirit(edgeSpirit);
  assert.ok(edgeSpirit.x >= 75 && edgeSpirit.x <= 825 && edgeSpirit.y >= 95 && edgeSpirit.y <= 505);
}
