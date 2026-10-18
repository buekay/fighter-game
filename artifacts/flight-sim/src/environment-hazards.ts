import type { Bounds } from './flight-features';

export type HazardKind = 'debris' | 'sand' | 'wave' | 'wind' | 'ice' | 'rock' | 'lava' | 'vine' | 'lightning' | 'asteroid';
export const HAZARDS: Record<string, { kind: HazardKind; name: string; color: string }> = {
  city: { kind: 'debris', name: 'Herabfallende Trümmer', color: '#879198' },
  desert: { kind: 'sand', name: 'Sandsturm', color: '#b99a6a' },
  ocean: { kind: 'wave', name: 'Wasserhose', color: '#a1b9c3' },
  plains: { kind: 'wind', name: 'Seitenwind', color: '#b9c4c4' },
  arctic: { kind: 'ice', name: 'Eisberg', color: '#a7c6d2' },
  canyon: { kind: 'rock', name: 'Felspassage', color: '#a17a5b' },
  volcano: { kind: 'lava', name: 'Vulkanische Auswürfe', color: '#75665c' },
  jungle: { kind: 'vine', name: 'Hohe Baumkronen', color: '#42634b' },
  storm: { kind: 'lightning', name: 'Gewitterzelle', color: '#b7bfd2' },
  space: { kind: 'asteroid', name: 'Asteroiden', color: '#8d8781' },
};
export interface Hazard extends Bounds {
  kind: HazardKind; name: string; color: string; warningMs: number; lifeMs: number;
  vx: number; vy: number; gravity: number; ageMs: number; durationMs: number;
  seed: number; rotation: number; spin: number;
  outline?: readonly (readonly [number, number])[];
}
export function createHazards(biome: string, random: number): Hazard[] {
  const r = Number.isFinite(random) ? Math.max(0, Math.min(1, random)) : .5;
  const def = HAZARDS[biome] ?? HAZARDS.city;
  const base: Hazard = { ...def, x: 870, y: 160 + r * 220, width: 48, height: 48,
    warningMs: 1500, lifeMs: 8500, durationMs: 8500, vx: -130, vy: 0, gravity: 0,
    ageMs: 0, seed: r * 71 + 5, rotation: r * 2, spin: 0 };
  if (def.kind === 'rock') {
    const gapY = 150 + r * 170;
    return [{ ...base, x: 865, y: 0, width: 150, height: gapY, outline: [[0, 0], [1, 0], [1, .78], [.74, .9], [.48, 1], [.22, .83], [0, .65]] },
      { ...base, x: 865, y: gapY + 170, width: 175, height: 600 - gapY - 170,
        outline: [[0, .3], [.18, .13], [.48, 0], [.75, .16], [1, .06], [1, 1], [0, 1]] }];
  }
  if (def.kind === 'vine' || def.kind === 'ice') {
    const height = def.kind === 'ice' ? 105 + r * 85 : 120 + r * 100;
    return [{ ...base, width: def.kind === 'ice' ? 165 : 210, y: 600 - height, height,
      outline: def.kind === 'ice' ? [[0, 1], [.1, .65], [.22, .56], [.43, 0], [.63, .24], [.7, .58], [.9, .7], [1, 1]]
        : [[0, 1], [0, .55], [.12, .28], [.24, .32], [.34, .07], [.5, 0], [.62, .15], [.76, .06], [.9, .35], [1, .55], [1, 1]] }];
  }
  if (def.kind === 'lightning') return [{ ...base, x: 210 + r * 480, y: 45, width: 30, height: 530, vx: 0,
    warningMs: 2000, durationMs: 220, lifeMs: 220, rotation: 0 }];
  if (def.kind === 'wave') return [{ ...base, x: 800, y: 195, width: 90, height: 350, vx: -100,
    rotation: 0, durationMs: 9000, lifeMs: 9000 }];
  if (def.kind === 'wind' || def.kind === 'sand') return [{ ...base, x: 860, y: 110 + r * 130,
    width: def.kind === 'sand' ? 280 : 240, height: 210, vx: -160, vy: def.kind === 'wind' ? (r < .5 ? -16 : 16) : 8,
    rotation: 0, durationMs: 8500, lifeMs: 8500 }];
  return [0, 1, 2].map(i => ({ ...base, seed: base.seed + i * 13, x: 870 + i * 100,
    y: def.kind === 'lava' ? 540 + i * 12 : def.kind === 'debris' ? 65 + i * 85 : 110 + i * 145,
    width: 30 + i * 10, height: def.kind === 'debris' ? 18 + i * 5 : 30 + i * 10,
    vx: def.kind === 'lava' ? -165 - i * 15 : -130 - i * 15,
    vy: def.kind === 'lava' ? -235 - r * 65 - i * 20 : def.kind === 'debris' ? 20 + i * 15 : (r - .5) * 25,
    gravity: def.kind === 'lava' ? 115 : def.kind === 'debris' ? 45 : 0,
    spin: def.kind === 'asteroid' ? .2 + i * .12 : .65 + i * .2,
  }));
}
export function tickHazard(h: Hazard, ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0) return;
  const activeMs = Math.max(0, ms - h.warningMs);
  h.warningMs = Math.max(0, h.warningMs - ms);
  const seconds = activeMs / 1000;
  h.ageMs += activeMs; h.lifeMs -= activeMs;
  h.x += h.vx * seconds;
  h.y += h.vy * seconds + .5 * h.gravity * seconds * seconds;
  h.vy += h.gravity * seconds;
  h.rotation += h.spin * seconds;
}
function inside(x: number, y: number, points: readonly (readonly [number, number])[]): boolean {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i], [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) hit = !hit;
  }
  return hit;
}
/** Terrain uses its visible outline; airborne bodies use an inset ellipse, never their empty corners. */
export function hazardHits(h: Hazard, box: Bounds): boolean {
  if (h.warningMs > 0 || h.lifeMs <= 0 || box.x + box.width < h.x || box.x > h.x + h.width || box.y + box.height < h.y || box.y > h.y + h.height) return false;
  if (h.outline) {
    const x0 = (box.x - h.x) / h.width, x1 = (box.x + box.width - h.x) / h.width;
    const y0 = (box.y - h.y) / h.height, y1 = (box.y + box.height - h.y) / h.height;
    if ([[x0, y0], [x1, y0], [x0, y1], [x1, y1]].some(([x, y]) => inside(x, y, h.outline!))) return true;
    for (let i = 0; i < h.outline.length; i++) {
      const [x, y] = h.outline[i], [endX, endY] = h.outline[(i + 1) % h.outline.length];
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return true;
      let enter = 0, exit = 1;
      for (const [start, delta, min, max] of [[x, endX - x, x0, x1], [y, endY - y, y0, y1]]) {
        if (delta === 0) { if (start < min || start > max) { exit = -1; break; } }
        else { const a = (min - start) / delta, b = (max - start) / delta; enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b)); }
      }
      if (enter <= exit) return true;
    }
    return false;
  }
  const rx = h.width * .46, ry = h.height * .46;
  const cx = h.x + h.width / 2, cy = h.y + h.height / 2;
  const nx = Math.max(box.x, Math.min(cx, box.x + box.width));
  const ny = Math.max(box.y, Math.min(cy, box.y + box.height));
  return ((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2 <= 1;
}
/** Gusts ramp in and out and push with the direction of the air mass. */
export function hazardPush(h: Hazard): number {
  if (h.warningMs > 0 || h.lifeMs <= 0) return 0;
  const envelope = Math.min(1, h.ageMs / 650, h.lifeMs / 650);
  return Math.sign(h.vy || 1) * (h.kind === 'sand' ? 55 : 95) * envelope;
}
