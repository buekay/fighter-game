import assert from "node:assert/strict";
import { claimLightningTargets } from "./fire-sword-chain";

const enemy = (x: number, y = 0) => ({ x, y, width: 20, height: 20, hp: 100, dead: false });
const a = enemy(0), b = enemy(100), c = enemy(200), outside = enemy(301);
const dead = { ...enemy(50), dead: true }, destroyed = { ...enemy(60), hp: 0 };
const visited = new Set([a]);
const enemies = [a, b, c, outside, dead, destroyed];
assert.deepEqual(claimLightningTargets(a, enemies, visited), [b]);
assert.deepEqual(claimLightningTargets(b, enemies, visited), [c]);
assert.deepEqual(claimLightningTargets(c, enemies, visited), []);
assert.deepEqual(claimLightningTargets(a, enemies, visited), []);
const diagonal = enemy(80, 80);
assert.deepEqual(claimLightningTargets(a, [diagonal], new Set()), []);
// Simultaneous initial targets may not hit one another again.
assert.deepEqual(claimLightningTargets(a, [a, b], new Set([a, b])), []);
