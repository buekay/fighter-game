import assert from "node:assert/strict";
import { VisualQuality } from "./visual-quality";
import { canvasResolution } from "./canvas-resolution";

assert.deepEqual(canvasResolution(900, 600, 900, 2), {
  width: 1800, height: 1200, scaleX: 2, scaleY: 2,
}, "Retina landscape renders at display resolution");
assert.deepEqual(canvasResolution(600, 900, 400, 3), {
  width: 1200, height: 1800, scaleX: 2, scaleY: 2,
}, "Portrait accounts for both CSS size and device density");
assert.equal(canvasResolution(900, 600, 2000, 3).scaleX, 2, "Large displays keep a bounded pixel budget");
assert.equal(canvasResolution(900, 600, 375, 1).scaleX, 1, "Small screens retain the logical resolution");
assert.equal(canvasResolution(900, 600, 900, NaN).scaleX, 1, "Invalid device density falls back safely");
const fractional = canvasResolution(600, 900, 437, 1.25);
assert.equal(fractional.scaleX * 600, fractional.width, "Rounded pixels use the actual horizontal scale");
assert.equal(fractional.scaleY * 900, fractional.height, "Rounded pixels use the actual vertical scale");

const quality = new VisualQuality();
for (let i = 0; i < 600; i++) quality.update(1000 / 60);
assert.equal(quality.economical, false, "60 Hz keeps full detail");
quality.update(90);
for (let i = 0; i < 60; i++) quality.update(1000 / 60);
assert.equal(quality.economical, false, "One frame spike must not lower detail");
for (let i = 0; i < 60; i++) quality.update(1000 / 30);
assert.equal(quality.economical, true, "Sustained 30 Hz lowers cosmetic load");
for (let i = 0; i < 120; i++) quality.update(1000 / 60);
assert.equal(quality.economical, true, "Short recovery must not oscillate quality");
for (const value of [NaN, Infinity, -1, 0, 10000]) quality.update(value);
assert.equal(quality.economical, true, "Paused and invalid samples are ignored");
for (let i = 0; i < 250; i++) quality.update(1000 / 60);
assert.equal(quality.economical, false, "Sustained recovery restores full detail");
for (let i = 0; i < 600; i++) quality.update(1000 / 120);
assert.equal(quality.economical, false, "High refresh displays keep full detail");
