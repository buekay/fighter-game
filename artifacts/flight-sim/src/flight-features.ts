import { BOSS_SEQUENCE, type EncounterKind } from './boss-encounters';
import { readStoredJson, writeStoredJson } from './storage';

export interface FlightOptions {
  coop: boolean;
  training: boolean;
  target: 'dummy' | EncounterKind;
  difficulty: 'easy' | 'normal' | 'hard';
}
export const DEFAULT_FLIGHT_OPTIONS: FlightOptions = { coop: false, training: false, target: 'dummy', difficulty: 'normal' };
export const TRAINING_DIFFICULTY = { easy: .6, normal: 1, hard: 1.5 };
export interface Point { x: number; y: number }
export interface Bounds extends Point { width: number; height: number }

export interface BossPart {
  id: 'weapon' | 'drive'; name: string; hp: number; maxHp: number;
  x: number; y: number; width: number; height: number;
}
const PART_NAMES: Record<EncounterKind, [string, string]> = {
  titan: ['Plasmakanone', 'Schildreaktor'], tank: ['Railgun', 'Kettenantrieb'],
  spider: ['Netzwerfer', 'Beinservo'], submarine: ['Torpedorohr', 'Tauchmotor'],
  city: ['Geschützturm', 'Generator'],
};
export function createBossParts(kind: EncounterKind, hp: number): BossPart[] {
  return (['weapon', 'drive'] as const).map((id, index) => ({
    id, name: PART_NAMES[kind][index], hp: Math.max(1, Math.round(hp * .12)),
    maxHp: Math.max(1, Math.round(hp * .12)), x: .03, y: index === 0 ? .12 : .66, width: .55, height: .22,
  }));
}
export function partBounds(boss: Bounds, part: BossPart): Bounds {
  return { x: boss.x + boss.width * part.x, y: boss.y + boss.height * part.y,
    width: boss.width * part.width, height: boss.height * part.height };
}
export function overlaps(a: Bounds, b: Bounds): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
export function hitBossPart(boss: Bounds, parts: BossPart[], shot: Bounds, damage: number): BossPart | null {
  const part = parts.find(p => p.hp > 0 && overlaps(partBounds(boss, p), shot));
  if (!part || !Number.isFinite(damage) || damage <= 0) return null;
  part.hp = Math.max(0, part.hp - damage);
  return part;
}

export type HazardKind = 'debris' | 'sand' | 'wave' | 'wind' | 'ice' | 'rock' | 'lava' | 'vine' | 'lightning' | 'asteroid';
export const HAZARDS: Record<string, { kind: HazardKind; name: string; color: string }> = {
  city: { kind: 'debris', name: 'Trümmerfeld', color: '#fda4af' },
  desert: { kind: 'sand', name: 'Sandfront', color: '#fde68a' },
  ocean: { kind: 'wave', name: 'Wasserfontäne', color: '#67e8f9' },
  plains: { kind: 'wind', name: 'Windböe', color: '#bbf7d0' },
  arctic: { kind: 'ice', name: 'Eisschollen', color: '#a5f3fc' },
  canyon: { kind: 'rock', name: 'Engpass', color: '#fdba74' },
  volcano: { kind: 'lava', name: 'Lavaausbruch', color: '#fb923c' },
  jungle: { kind: 'vine', name: 'Rankenwand', color: '#86efac' },
  storm: { kind: 'lightning', name: 'Blitzeinschlag', color: '#e9d5ff' },
  space: { kind: 'asteroid', name: 'Asteroidenfeld', color: '#c4b5fd' },
};
export interface Hazard extends Bounds {
  kind: HazardKind; name: string; color: string; warningMs: number; lifeMs: number; vx: number; vy: number;
}
/** A 1.5 second stationary warning always precedes an active obstacle. */
export function createHazards(biome: string, random: number): Hazard[] {
  const def = HAZARDS[biome] ?? HAZARDS.city;
  const base = { ...def, warningMs: 1500, lifeMs: 7000, vx: -135, vy: 0 };
  const y = 110 + Math.max(0, Math.min(1, random)) * 340;
  if (def.kind === 'rock' || def.kind === 'vine') {
    const gapY = Math.max(145, Math.min(425, y));
    return [{ ...base, x: 830, y: 65, width: 58, height: gapY - 65 },
      { ...base, x: 830, y: gapY + 130, width: 58, height: 600 - gapY - 130 }];
  }
  if (def.kind === 'lightning' || def.kind === 'lava' || def.kind === 'wave') {
    return [{ ...base, x: 120 + random * 590, y: def.kind === 'lightning' ? 65 : 345,
      width: def.kind === 'lightning' ? 44 : 78, height: def.kind === 'lightning' ? 500 : 255,
      vx: 0, lifeMs: 1800 }];
  }
  if (def.kind === 'wind' || def.kind === 'sand') return [{ ...base, x: 820, y, width: 130, height: 110, vx: -180 }];
  return [0, 1, 2].map(i => ({ ...base, x: 815 + i * 34, y: Math.max(75, Math.min(520, y + (i - 1) * 145)),
    width: 38 + i * 7, height: 38 + i * 7, vx: -145 - i * 18, vy: (i - 1) * 12 }));
}
export function tickHazard(h: Hazard, ms: number): void {
  const activeMs = Math.max(0, ms - h.warningMs);
  h.warningMs = Math.max(0, h.warningMs - ms);
  h.lifeMs -= activeMs;
  h.x += h.vx * activeMs / 1000; h.y += h.vy * activeMs / 1000;
}

export type SecretKind = 'wreck' | 'rescue' | 'ace';
export interface SecretSignal extends Point { kind: SecretKind; remainingMs: number; phase: 'signal' | 'active'; progressMs: number }
export const SECRET_NAMES = { wreck: 'Vergessenes Wrack', rescue: 'Pilot in Not', ace: 'Verstecktes Fliegerass' };
export function createSecret(random: number): SecretSignal {
  return { kind: random < 1 / 3 ? 'wreck' : random < 2 / 3 ? 'rescue' : 'ace', x: 530, y: 135 + random * 300,
    remainingMs: 14000, phase: 'signal', progressMs: 0 };
}

export interface WeaponMastery { kills: number; precision: number; enabled: boolean }
export const MASTERY_KILLS = 40;
export const MASTERY_PRECISION = 12;
export function masteryUnlocked(m: WeaponMastery): boolean { return m.kills >= MASTERY_KILLS && m.precision >= MASTERY_PRECISION; }
export function loadMasteries(): Record<string, WeaponMastery> {
  const raw = readStoredJson('fighter-command-mastery-v1', {});
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, WeaponMastery> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue;
    const m = value as Partial<WeaponMastery>;
    const count = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(1e7, Math.floor(n))) : 0;
    result[id] = { kills: count(m.kills), precision: count(m.precision), enabled: m.enabled !== false };
  }
  return result;
}
export function saveMasteries(m: Record<string, WeaponMastery>): void { writeStoredJson('fighter-command-mastery-v1', m); }
export function masteryFor(all: Record<string, WeaponMastery>, id: string): WeaponMastery {
  return all[id] ?? { kills: 0, precision: 0, enabled: true };
}
export function recordMastery(all: Record<string, WeaponMastery>, id: string, kill: boolean, precision: boolean): boolean {
  const m = masteryFor(all, id); const before = masteryUnlocked(m);
  all[id] = { ...m, kills: m.kills + Number(kill), precision: m.precision + Number(precision) };
  return !before && masteryUnlocked(all[id]);
}
export function masteryVariant(pattern: string): string {
  return pattern === 'melee' ? 'Weite Klinge: größerer Trefferbogen' : pattern === 'missile'
    ? 'Jägerraketen: jede Salve erfasst ein Ziel' : pattern === 'spread'
      ? 'Fächer: zusätzliche äußere Projektile' : 'Gabelschuss: zwei schräge Zusatzgeschosse';
}
export function loadDefeatedBosses(completed: number): EncounterKind[] {
  const raw = readStoredJson('fighter-command-defeated-bosses-v1', []);
  return BOSS_SEQUENCE.filter((kind, i) => completed >= 20 + i * 5 || Array.isArray(raw) && raw.includes(kind));
}
export function rememberBoss(kind: EncounterKind, completed: number): void {
  writeStoredJson('fighter-command-defeated-bosses-v1', [...new Set([...loadDefeatedBosses(completed), kind])]);
}

export interface CoopPilot extends Point {
  hp: number; maxHp: number; invincibleMs: number; reviveMs: number; lastFireMs: number;
  ultiCooldownMs: number; armedMs: number; down: boolean; lastShots: Record<string, number>;
}
export function createCoopPilot(maxHp: number): CoopPilot {
  return { x: 90, y: 370, hp: maxHp, maxHp, invincibleMs: 2000, reviveMs: 0, lastFireMs: -1000,
    ultiCooldownMs: 0, armedMs: 0, down: false, lastShots: {} };
}
export function damageCoop(p: CoopPilot, damage: number): boolean {
  if (p.down || p.invincibleMs > 0) return false;
  p.hp = Math.max(0, p.hp - damage); p.invincibleMs = 1200;
  if (p.hp === 0) { p.down = true; p.reviveMs = 0; }
  return true;
}
/** Both pilots can be revived by staying close. Progress resets on leaving range. */
export function tickCoop(p: CoopPilot, leader: Point, leaderDown: boolean, ms: number): 'partner' | 'leader' | null {
  p.invincibleMs = Math.max(0, p.invincibleMs - ms);
  p.ultiCooldownMs = Math.max(0, p.ultiCooldownMs - ms);
  p.armedMs = Math.max(0, p.armedMs - ms);
  if (p.down && leaderDown || !p.down && !leaderDown) { p.reviveMs = 0; return null; }
  p.reviveMs = Math.hypot(p.x - leader.x, p.y - leader.y) < 95 ? p.reviveMs + ms : 0;
  if (p.reviveMs < 2500) return null;
  p.reviveMs = 0;
  if (p.down) { p.down = false; p.hp = Math.max(1, Math.ceil(p.maxHp / 2)); p.invincibleMs = 2500; return 'partner'; }
  return 'leader';
}
export interface DamageSample { time: number; damage: number }
export function rollingDps(samples: DamageSample[], now: number): number {
  while (samples.length && samples[0].time < now - 5000) samples.shift();
  return samples.reduce((total, s) => total + s.damage, 0) / Math.max(1, Math.min(5, now / 1000));
}
