import assert from "node:assert/strict";
import { steerTitan, type TitanTactics } from "./titan-tactics";

const body = { x: 650, y: 240, width: 130, height: 130 };
const target = { x: 90, y: 300 };
let result = steerTitan(body, target, 0, 1, [], 1, 900, 600);
assert.equal(result.state.action, "flank");
result = steerTitan(body, target, 0, 1, [], 100, 900, 600, result.state);
assert.equal(result.state.action, "pressure");
assert.ok(result.vx < 0, "Pressure closes distance");
result = steerTitan(body, target, 0, 1, [], 120, 900, 600, result.state);
assert.equal(result.state.action, "recover");
assert.ok(result.vx > 0, "Recovery opens distance and creates an attack window");
const threat = [{ x: 500, y: 310, vx: 8, vy: 0, fromPlayer: true }];
result = steerTitan(body, target, 0, 1, threat, 1, 900, 600);
assert.equal(result.state.action, "evade");
assert.ok(result.vy < 0, "Evades away from the incoming shot");
result = steerTitan(body, target, 0, 1, threat, 45, 900, 600, result.state);
assert.notEqual(result.state.action, "evade", "Cannot dodge continuously through a volley");
const safe = steerTitan(body, target, 0, 1, [{ ...threat[0], y: 40 }], 1, 900, 600);
assert.notEqual(safe.state.action, "evade", "Ignores shots that cannot hit");
const bottom = steerTitan({ ...body, y: 460 }, {x: 0, y: 900}, 100, .2, [], 1, 900, 600);
assert.ok(bottom.state.targetY <= 442 && bottom.state.targetY >= 28);
assert.ok(Math.abs(bottom.vy) <= 3.6 && Math.abs(bottom.vx) <= 3.6);
// Several minutes of tactical movement at different frame rates stay within arena bounds.
for (const dt of [.5, 1, 2]) {
  const moving = { ...body };
  let state: TitanTactics | undefined;
  for (let frame = 0; frame < 7200 / dt; frame++) {
    const next = steerTitan(moving, {x: 70, y: 300 + Math.sin(frame * dt / 60) * 230}, 2, .25, [], dt, 900, 600, state);
    state = next.state;
    moving.x += next.vx * dt; moving.y += next.vy * dt;
    assert.ok(moving.x >= 450 && moving.x + moving.width <= 900);
    assert.ok(moving.y >= 0 && moving.y + moving.height <= 600);
  }
}
