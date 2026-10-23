import type { HazardKind } from './environment-hazards';

export interface ElementSpirit {
  x: number; y: number; ageMs: number; remainingMs: number;
  nextActionMs?: number; summoned?: number; flashUntilMs?: number; beamTarget?: { x: number; y: number };
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
  const activeStep = Math.max(0, step - Math.max(0, 1200 - spirit.ageMs));
  spirit.ageMs += step; spirit.remainingMs -= step;
  if (spirit.remainingMs <= 0) return 'waiting';
  const distance = pilots.reduce((nearest, pilot) => Math.min(nearest, Math.hypot(pilot.x - spirit.x, pilot.y - spirit.y)), Infinity);
  if (spirit.ageMs < 1200) return 'waiting';
  if (spirit.friendly && distance < 65) { spirit.remainingMs = 0; return 'gift'; }
  if (!spirit.friendly) {
    const calming = pilots.some(pilot => { const d = Math.hypot(pilot.x - spirit.x, pilot.y - spirit.y); return d >= 65 && d < 110; });
    spirit.calmMs = calming ? spirit.calmMs + activeStep : Math.max(0, spirit.calmMs - activeStep * .5);
    if (spirit.calmMs >= 2500) { spirit.friendly = true; spirit.nextActionMs = spirit.ageMs + 1800; return 'calmed'; }
  }
  return 'waiting';
}

/** The visible core collides with the pilot's full body, including its wings. */
export function spiritTouches(spirit: ElementSpirit, pilot: { x: number; y: number; width: number; height: number }): boolean {
  if (spirit.friendly || spirit.ageMs < 1200 || spirit.remainingMs <= 0) return false;
  const x = Math.max(pilot.x, Math.min(spirit.x, pilot.x + pilot.width));
  const y = Math.max(pilot.y, Math.min(spirit.y, pilot.y + pilot.height));
  return Math.hypot(x - spirit.x, y - spirit.y) < 33;
}

export type SpiritAction = 'heal' | 'attack' | 'cannon' | 'summon';
/** Active age drives abilities, so pausing and frame rate cannot speed them up. */
export function nextSpiritAction(spirit: ElementSpirit): SpiritAction | null {
  if (spirit.remainingMs <= 0 || spirit.ageMs < (spirit.nextActionMs ?? 3000)) return null;
  const action: SpiritAction = spirit.friendly ? (spirit.element === 'water' ? 'heal' : 'attack')
    : spirit.element === 'crystal' ? 'summon' : 'cannon';
  spirit.nextActionMs = spirit.ageMs + (action === 'summon' ? 5000 : action === 'heal' ? 3000 : action === 'attack' ? 1800 : 2400);
  if (action === 'summon' && (spirit.summoned ?? 0) >= 4) return null;
  return action;
}
