import assert from 'node:assert/strict';
import { moveSkyClone, skyLaserDamage, skyReflectedDamage, strongestSkyTarget } from './sky-ultimate';

for (const fps of [30, 60, 120, 144]) {
  const damage = Array.from({ length: fps }).reduce<number>(sum => sum + skyLaserDamage(60 / fps), 0);
  assert.ok(Math.abs(damage - 300) < 1e-8, `${fps} FPS must deal 300 damage in a second`);
}
assert.equal(skyReflectedDamage(10), 5);
assert.equal(skyReflectedDamage(.5), .25);
assert.equal(skyReflectedDamage(0), 0);
const weak = { hp: 20 }, strong = { hp: 300, dead: false }, dead = { hp: 1000, dead: true };
assert.equal(strongestSkyTarget([weak, dead, strong]), strong);
strong.dead = true;
assert.equal(strongestSkyTarget([weak, dead, strong]), weak);
assert.equal(strongestSkyTarget([]), undefined);
assert.equal(strongestSkyTarget([{ hp: 0 }, dead]), undefined);
console.log('Sky ultimate tests passed');

// The clone keeps flying without enemies and orbits rather than parking on a boss.
const bounds = { width: 900, height: 500 };
const position = { x: 100, y: 100 };
assert.notDeepEqual(moveSkyClone(position, undefined, 30, 1, bounds), position);
assert.notDeepEqual(moveSkyClone(position, position, 30, 1, bounds), position);
assert.deepEqual(moveSkyClone(position, undefined, 30, 0, bounds), position);
for (const fps of [30, 60, 120]) {
  const moved = moveSkyClone(position, { x: 800, y: 400 }, 0, 60 / fps, bounds);
  assert.ok(Math.abs(Math.hypot(moved.x - position.x, moved.y - position.y) - 14 * 60 / fps) < 1e-8);
}
