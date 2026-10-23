import type { HazardKind } from './environment-hazards';

export interface ElementSpirit {
  x: number; y: number; ageMs: number; remainingMs: number;
  calmMs: number; friendly: boolean; name: string; color: string;
  element: 'ember' | 'water' | 'crystal' | 'storm'; event: string;
}
export function awakenSpirit(kind: HazardKind, x: number, y: number): ElementSpirit {
  const definition = kind === 'lava'
    ? { element: 'ember' as const, name: 'Glutgeist', color: '#ffbc70', friendly: true, event: 'Glut flammt auf' }
    : kind === 'wave' || kind === 'wind' || kind === 'vine'
      ? { element: 'water' as const, name: 'Quellgeist', color: '#70e7d5', friendly: true, event: 'Die Elemente sammeln sich' }
      : kind === 'lightning' || kind === 'sand'
        ? { element: 'storm' as const, name: 'Sturmgeist', color: '#c4afff', friendly: false, event: 'Ein Sturm entlädt sich' }
        : { element: 'crystal' as const, name: 'Splittergeist', color: '#9bdbff', friendly: false, event: 'Materie zerbricht' };
  return { ...definition, x: Math.max(140, Math.min(720, x)), y: Math.max(130, Math.min(470, y)),
    ageMs: 0, remainingMs: 16000, calmMs: 0 };
}
/** Stay in the outer ring for 2.5 seconds to calm a hostile spirit. */
export function tickSpirit(spirit: ElementSpirit, ms: number, pilots: readonly { x: number; y: number }[]): 'waiting' | 'calmed' | 'gift' {
  if (!Number.isFinite(ms) || ms <= 0 || spirit.remainingMs <= 0) return 'waiting';
  const step = Math.min(ms, spirit.remainingMs);
  spirit.ageMs += step; spirit.remainingMs -= step;
  const distance = pilots.reduce((nearest, pilot) => Math.min(nearest, Math.hypot(pilot.x - spirit.x, pilot.y - spirit.y)), Infinity);
  if (spirit.ageMs < 1200) return 'waiting';
  if (spirit.friendly && distance < 65) { spirit.remainingMs = 0; return 'gift'; }
  if (!spirit.friendly) {
    spirit.calmMs = distance >= 45 && distance < 110 ? spirit.calmMs + step : Math.max(0, spirit.calmMs - step * .5);
    if (spirit.calmMs >= 2500) { spirit.friendly = true; return 'calmed'; }
  }
  return 'waiting';
}
