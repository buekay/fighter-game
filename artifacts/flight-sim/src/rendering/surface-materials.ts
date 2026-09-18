import type { BiomeId } from "../biomes";

// Bounded by the ten biomes. Each material is generated once, then tiled in one fill.
const patterns = new WeakMap<CanvasRenderingContext2D, Map<BiomeId, CanvasPattern>>();
let finish: HTMLCanvasElement | undefined;

export function drawSurfaceMaterial(ctx: CanvasRenderingContext2D, biome: BiomeId, time: number, width: number, height: number) {
  if (biome === "space" || biome === "storm") return;
  let cache = patterns.get(ctx);
  if (!cache) { cache = new Map(); patterns.set(ctx, cache); }
  let pattern = cache.get(biome);
  if (!pattern) {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 256;
    const brush = tile.getContext("2d")!;
    let seed = 1947;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const water = biome === "ocean";
    const sand = biome === "desert" || biome === "canyon";
    for (let i = 0; i < 650; i++) {
      const x = random() * 256, y = random() * 256;
      brush.fillStyle = i % 3 ? "rgba(10,20,20,.065)" : "rgba(245,240,218,.10)";
      brush.fillRect(x, y, water ? 5 + random() * 12 : sand ? 2 + random() * 4 : 1 + random() * 2, water ? .7 : 1);
    }
    pattern = ctx.createPattern(tile, "repeat")!;
    cache.set(biome, pattern);
  }
  ctx.save();
  ctx.translate(-(time * 1.55 % 256), 0);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width + 256, height);
  ctx.restore();
}

export function drawLensFinish(ctx: CanvasRenderingContext2D, width: number, height: number) {
  if (!finish || finish.width !== width || finish.height !== height) {
    finish = document.createElement("canvas");
    finish.width = width; finish.height = height;
    const brush = finish.getContext("2d")!;
    const shade = brush.createRadialGradient(width * .48, height * .44, height * .3, width * .48, height * .44, width * .66);
    shade.addColorStop(.45, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,5,12,.30)");
    brush.fillStyle = shade; brush.fillRect(0, 0, width, height);
  }
  ctx.drawImage(finish, 0, 0);
}
