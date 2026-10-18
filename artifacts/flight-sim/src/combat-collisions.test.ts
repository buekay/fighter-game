import assert from "node:assert/strict";
import { projectileHitsBounds, type MovingProjectile } from "./combat-collisions";

const target = { x: 100, y: 100, width: 20, height: 20 };
const shot = (overrides: Partial<MovingProjectile> = {}): MovingProjectile => ({
  x: 160, previousX: 60, y: 110, fromPlayer: true, ...overrides,
});

assert.equal(projectileHitsBounds(shot(), target), true, "fast shots cross thin targets");
assert.equal(projectileHitsBounds(shot({ x: 60, previousX: 160, fromPlayer: false }), target), true,
  "hostile shots sweep in the opposite direction");
assert.equal(projectileHitsBounds(shot({ y: 130 }), target), false, "near misses stay misses");
assert.equal(projectileHitsBounds(shot({ previousX: 140, x: 160 }), target), false,
  "shots moving away do not hit retroactively");
assert.equal(projectileHitsBounds(shot({ x: 110, previousX: undefined }), target), true,
  "new shots still test their spawn position");
assert.equal(projectileHitsBounds(shot({ x: 87, previousX: 87 }), target), true,
  "player shots extend rightward from x");
assert.equal(projectileHitsBounds(shot({ x: 87, previousX: 87, fromPlayer: false }), target), false,
  "hostile shots are centered at x");
assert.equal(projectileHitsBounds(shot({ x: 90, previousX: 90, y: 95,
  collisionWidth: 24, collisionHeight: 12 }), target), true, "custom hitboxes are respected");

// An enclosing rectangle would invent a hit along this diagonal.
assert.equal(projectileHitsBounds(shot({ previousX: 0, previousY: 0, x: 200, y: 100 }), target), false);
assert.equal(projectileHitsBounds(shot({ x: 110, previousX: 110 }),
  { ...target, y: 160 }, { x: 100, y: 60 }), true, "moving targets can cross stationary shots");
assert.equal(projectileHitsBounds(shot({ previousX: 50, x: 150 }),
  { ...target, x: 200 }, { x: 100, y: 100 }), false, "parallel movement preserves separation");

// The flight must hit at every supported frame rate, including steps with
// both endpoints outside the target.
for (const hz of [30, 60, 120]) {
  let x = 0;
  let struck = false;
  for (let frame = 0; frame < hz && !struck; frame++) {
    const previousX = x;
    x += 3600 / hz;
    struck = projectileHitsBounds(shot({ previousX, x }), target);
  }
  assert.equal(struck, true, `${hz} Hz flight hits the target`);
}

const viewport = { x: -20, y: -20, width: 940, height: 640 };
assert.equal(projectileHitsBounds(shot({ previousX: 880, x: 1020 }), viewport), true,
  "keep exiting shots for their final collision check");
assert.equal(projectileHitsBounds(shot({ previousX: 1020, x: 1160 }), viewport), false,
  "remove shots after their entire segment leaves the field");

console.log("combat collision tests passed");
