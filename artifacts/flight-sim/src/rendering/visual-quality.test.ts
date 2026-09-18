import assert from "node:assert/strict";
import { VisualQuality } from "./visual-quality";

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
