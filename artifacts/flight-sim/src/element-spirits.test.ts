import assert from 'node:assert/strict';
import { awakenSpirit, tickSpirit, spiritTouches } from './element-spirits';

assert.equal(awakenSpirit('lava', 900, 600).friendly, true);
assert.equal(awakenSpirit('lightning', 300, 250).friendly, false);
assert.equal(awakenSpirit('ice', 300, 250).element, 'crystal');
for (const hz of [30, 60, 120]) {
  const spirit = awakenSpirit('lightning', 300, 250);
  for (let frame = 0; frame < hz * 4; frame++) tickSpirit(spirit, 1000 / hz, [{ x: 380, y: 250 }]);
  assert.equal(spirit.friendly, true, `calming at ${hz} Hz`);
  assert.equal(tickSpirit(spirit, 1000 / hz, [{ x: 300, y: 250 }]), 'gift');
  assert.equal(tickSpirit(spirit, 1000 / hz, [{ x: 300, y: 250 }]), 'waiting', 'gift only once');
}
const hostile = awakenSpirit('debris', 300, 250);
for (let i = 0; i < 100; i++) tickSpirit(hostile, 50, [{ x: 300, y: 250 }]);
assert.equal(hostile.friendly, false, 'dangerous core cannot calm a spirit');
const before = hostile.remainingMs;
tickSpirit(hostile, 0, []);
assert.equal(hostile.remainingMs, before, 'paused time stays frozen');
const friendly = awakenSpirit('wave', 300, 250);
tickSpirit(friendly, 1200, []);
assert.equal(tickSpirit(friendly, 20, [{ x: 300, y: 250 }]), 'gift', 'either active pilot can collect');
console.log('Element spirit rules passed');

const waking = awakenSpirit('lightning', 300, 250);
tickSpirit(waking, 1200, [{ x: 380, y: 250 }]);
assert.equal(waking.calmMs, 0, 'awakening time cannot count toward calming');
assert.equal(tickSpirit(waking, 2499, [{ x: 380, y: 250 }]), 'waiting');
assert.equal(tickSpirit(waking, 1, [{ x: 380, y: 250 }]), 'calmed');
const coop = awakenSpirit('ice', 300, 250);
tickSpirit(coop, 1200, []);
assert.equal(tickSpirit(coop, 2500, [{ x: 300, y: 250 }, { x: 380, y: 250 }]), 'calmed', 'partner in core does not block other pilot');
const unsafe = awakenSpirit('ice', 300, 250);
tickSpirit(unsafe, 1200, []);
tickSpirit(unsafe, 3000, [{ x: 350, y: 250 }]);
assert.equal(unsafe.calmMs, 0, 'inner danger zone cannot calm a spirit');
const expired = awakenSpirit('wave', 300, 250);
assert.equal(tickSpirit(expired, 20000, [{ x: 300, y: 250 }]), 'waiting', 'expired spirits cannot award gifts');
assert.equal(expired.remainingMs, 0);
const contact = awakenSpirit('ice', 300, 250);
contact.ageMs = 1200;
assert.equal(spiritTouches(contact, { x: 330, y: 240, width: 52, height: 28 }), true, 'wing contact hits even when center is outside core');
assert.equal(spiritTouches(contact, { x: 340, y: 240, width: 52, height: 28 }), false);
contact.friendly = true;
assert.equal(spiritTouches(contact, { x: 300, y: 250, width: 52, height: 28 }), false);
