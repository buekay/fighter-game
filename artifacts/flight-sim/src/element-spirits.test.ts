import assert from 'node:assert/strict';
import { awakenSpirit, tickSpirit } from './element-spirits';

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
