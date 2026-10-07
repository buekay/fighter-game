import assert from "node:assert/strict";
import { BIOMES } from "../biomes";
import { drawExtendedBiomeEnemy, getBiomeEnemyRenderTransform } from "./biome-enemies";

type Bounds = [number, number, number, number];
type Transform = { sx: number; sy: number; tx: number; ty: number };

// Record actual fill/stroke geometry, including the game's outer scale. This
// catches new wing, cannon or leg coordinates that exceed the collision box.
class GeometryContext {
  lineWidth = 1;
  path: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
  bounds: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
  transform: Transform = { sx: 1, sy: 1, tx: 0, ty: 0 };
  stack: Transform[] = [];
  save() { this.stack.push({ ...this.transform }); }
  restore() { this.transform = this.stack.pop()!; }
  scale(x: number, y: number) { this.transform.sx *= x; this.transform.sy *= y; }
  translate(x: number, y: number) { this.transform.tx += x * this.transform.sx; this.transform.ty += y * this.transform.sy; }
  beginPath() { this.path = [Infinity, Infinity, -Infinity, -Infinity]; }
  closePath() {}
  moveTo(x: number, y: number) { this.point(x, y); }
  lineTo(x: number, y: number) { this.point(x, y); }
  point(x: number, y: number) {
    this.path = [Math.min(this.path[0], x), Math.min(this.path[1], y), Math.max(this.path[2], x), Math.max(this.path[3], y)];
  }
  roundRect(x: number, y: number, w: number, h: number) { this.point(x, y); this.point(x + w, y + h); }
  ellipse(x: number, y: number, rx: number, ry: number) { this.point(x - rx, y - ry); this.point(x + rx, y + ry); }
  arc(x: number, y: number, r: number) { this.ellipse(x, y, r, r); }
  fill() { this.record(this.path); }
  stroke() {
    const half = this.lineWidth / 2;
    this.record([this.path[0] - half, this.path[1] - half, this.path[2] + half, this.path[3] + half]);
  }
  fillRect(x: number, y: number, w: number, h: number) { this.record([x, y, x + w, y + h]); }
  record([left, top, right, bottom]: Bounds) {
    const { sx, sy, tx, ty } = this.transform;
    this.bounds = [Math.min(this.bounds[0], left * sx + tx), Math.min(this.bounds[1], top * sy + ty),
      Math.max(this.bounds[2], right * sx + tx), Math.max(this.bounds[3], bottom * sy + ty)];
  }
}

const extended = new Set(["delta", "orbiter", "walker", "battery", "frigate"]);
for (const enemy of BIOMES.flatMap(biome => biome.enemies)) {
  if (!extended.has(enemy.visual)) continue;
  for (const pulse of [.54, .72, .90]) {
    const geometry = new GeometryContext();
    const ctx = geometry as unknown as CanvasRenderingContext2D;
    const outerScale = 1.22;
    geometry.scale(outerScale, outerScale);
    const transform = getBiomeEnemyRenderTransform(enemy.visual, enemy.width / outerScale, enemy.height / outerScale);
    geometry.save();
    geometry.scale(transform.scaleX, transform.scaleY);
    geometry.translate(transform.offsetX, transform.offsetY);
    assert.equal(drawExtendedBiomeEnemy(ctx, enemy.visual, enemy.color, enemy.accent, {} as CanvasGradient, pulse), true);
    geometry.restore();
    assert.deepEqual(geometry.transform, { sx: outerScale, sy: outerScale, tx: 0, ty: 0 });
    const [left, top, right, bottom] = geometry.bounds;
    const epsilon = 1e-8;
    assert.ok(left >= -enemy.width / 2 - epsilon && right <= enemy.width / 2 + epsilon, `${enemy.id}: solid model fits hitbox horizontally`);
    assert.ok(top >= -enemy.height / 2 - epsilon && bottom <= enemy.height / 2 + epsilon, `${enemy.id}: solid model fits hitbox vertically`);
    assert.ok(right - left >= enemy.width * .9 && bottom - top >= enemy.height * .9, `${enemy.id}: model fills its hitbox`);
  }
}

const unfitted = new GeometryContext();
unfitted.scale(1.22, 1.22);
drawExtendedBiomeEnemy(unfitted as unknown as CanvasRenderingContext2D, "delta", "#6547a8", "#f9a8ff", {} as CanvasGradient, .72);
assert.ok(unfitted.bounds[3] - unfitted.bounds[1] > 30, "Regression reproduces the original enlarged delta wings");
assert.equal(drawExtendedBiomeEnemy({} as CanvasRenderingContext2D, "tank", "#000000", "#ffffff", {} as CanvasGradient, .72), false);
console.log("Biome model geometry regression tests passed");
