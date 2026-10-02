import { applyPlayerDamage, type LifeState } from "./game-rules";

export const EXTRA_ITEMS = [
  { id: "shadow_dash", name: "Schatten-Dash", rarity: "rare", cost: 50_000, desc: "[Shift / Pad X] 140 px in Flugrichtung ausweichen, 0,25 Sek. geschützt. Ein Doppelgänger lenkt 1,5 Sek. Beschuss ab. 6 Sek. Abklingzeit. Mit Feuerkern, Chaos-Feuer oder aktiver Feuer-Ulti: brennende Spur." },
  { id: "perfect_counter", name: "Perfekter Konter", rarity: "rare", cost: 50_000, desc: "[C / Pad B] Konterschild für 0,25 Sek. Ein abgewehrter Treffer lädt die nächste Hauptwaffen-Salve 5 Sek. lang auf 2× Schaden. 4 Sek. Abklingzeit." },
  { id: "magnet_fist", name: "Magnetfaust · Traktorimpuls", rarity: "epic", cost: 100_000, desc: "[V / Pad Y] Zieht normale Gegner 1,5 Sek. in die Feuerlinie vor deinem Jet und sammelt nahe Pickups. Bosse sind immun. 10 Sek. Abklingzeit. Eine aktive Brandspur wird zum Sogziel." },
  { id: "last_spark", name: "Letzter Funke", rarity: "legendary", cost: 200_000, desc: "Automatisch einmal pro Einsatz: Ein tödlicher Treffer lässt 1 HP übrig. Eine Druckwelle räumt nahe Geschosse ab und verursacht 12 Schaden. Kein zusätzliches Leben; Fortsetzen lädt den Funken nicht neu." },
  { id: "chaos_pickup", name: "Chaos-Pickup", rarity: "rare", cost: 50_000, desc: "Jeder 8. Abschuss hinterlässt ein CHAOS-Pickup. Einsammeln verleiht zufällig 8 Sek. Schnellfeuer, Feuerkraft oder Magnetfeld. Neue Pickups ersetzen den Effekt. Funktioniert auch mit Ulti-Abschüssen." },
  { id: "fire_core", name: "Feuerkern", rarity: "epic", cost: 100_000, desc: "Dauerhaft +15 % Hauptwaffen-Schaden. Mit Schatten-Dash entsteht für 2 Sek. eine Brandspur (8 Schaden/Sek.). Mit Magnetfaust lassen sich normale Gegner hineinziehen." },
] as const;
export type ExtraAction = "shadow_dash" | "perfect_counter" | "magnet_fist";
export const EXTRA_ACTIONS: readonly { id: ExtraAction; label: string; key: string; code: string }[] = [
  { id: "shadow_dash", label: "Dash", key: "Shift", code: "ShiftLeft" },
  { id: "perfect_counter", label: "Konter", key: "C", code: "KeyC" },
  { id: "magnet_fist", label: "Magnet", key: "V", code: "KeyV" },
];
export type ChaosEffect = "rapid" | "fire" | "magnet";
export const CHAOS_LABELS: Record<ChaosEffect, string> = { rapid: "SCHNELLFEUER", fire: "FEUERKRAFT", magnet: "MAGNETFELD" };
export interface Point { x: number; y: number }
export interface CombatExtras {
  cooldowns: Record<ExtraAction, number>;
  dashProtection: number;
  parry: number;
  charged: number;
  magnet: number;
  decoy: (Point & { life: number }) | null;
  trail: { from: Point; to: Point; life: number; tick: number } | null;
  chaos: ChaosEffect | null;
  chaosTime: number;
  kills: number;
  sparkUsed: boolean;
  pulse: (Point & { life: number; pending: boolean }) | null;
}
export function createCombatExtras(sparkUsed = false, kills = 0): CombatExtras {
  return { cooldowns: { shadow_dash: 0, perfect_counter: 0, magnet_fist: 0 }, dashProtection: 0,
    parry: 0, charged: 0, magnet: 0, decoy: null, trail: null, chaos: null, chaosTime: 0,
    kills, sparkUsed, pulse: null };
}
// Timers use the game's normalized 60-Hz frames and advance only during play.
export function tickCombatExtras(state: CombatExtras, frames: number): void {
  const dt = Math.max(0, frames);
  for (const id of EXTRA_ACTIONS) state.cooldowns[id.id] = Math.max(0, state.cooldowns[id.id] - dt);
  for (const key of ["dashProtection", "parry", "charged", "magnet", "chaosTime"] as const) state[key] = Math.max(0, state[key] - dt);
  if (!state.chaosTime) state.chaos = null;
  for (const key of ["decoy", "trail", "pulse"] as const) {
    const effect = state[key];
    if (effect) { effect.life -= dt; if (effect.life <= 0) state[key] = null; }
  }
}
export function activateExtra(state: CombatExtras, action: ExtraAction, owned: readonly string[]): boolean {
  if (!owned.includes(action) || state.cooldowns[action] > 0) return false;
  if (action === "shadow_dash") { state.cooldowns[action] = 360; state.dashProtection = 15; }
  if (action === "perfect_counter") { state.cooldowns[action] = 240; state.parry = 15; }
  if (action === "magnet_fist") { state.cooldowns[action] = 600; state.magnet = 90; }
  return true;
}
export function blockWithExtra(state: CombatExtras): "counter" | "dash" | null {
  if (state.parry > 0) { state.parry = 0; state.charged = 300; return "counter"; }
  return state.dashProtection > 0 ? "dash" : null;
}
export function consumeCounter(state: CombatExtras): number {
  if (state.charged <= 0) return 1;
  state.charged = 0;
  return 2;
}
export function applyExtraDamage(state: CombatExtras, life: LifeState, damage: number, ownsSpark: boolean, position: Point): LifeState {
  if (ownsSpark && !state.sparkUsed && !life.gameOver && life.hp > 0 && damage >= life.hp) {
    state.sparkUsed = true;
    state.pulse = { ...position, life: 36, pending: true };
    return { ...life, hp: Math.min(1, life.maxHp) };
  }
  return applyPlayerDamage(life, damage);
}
export function collectChaos(state: CombatExtras, roll: number): ChaosEffect {
  state.chaos = (["rapid", "fire", "magnet"] as const)[Math.min(2, Math.max(0, Math.floor(roll * 3)))];
  state.chaosTime = 480;
  return state.chaos;
}
export function hasExtraFire(state: CombatExtras, owned: readonly string[]): boolean {
  return owned.includes("fire_core") || state.chaos === "fire";
}
export function magnetStep(position: Point, target: Point, frames: number): Point {
  const dx = target.x - position.x, dy = target.y - position.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 260 || distance < 1) return { x: 0, y: 0 };
  const step = Math.min(distance, 5 * Math.max(0, frames));
  return { x: dx / distance * step, y: dy / distance * step };
}
export function distanceToTrail(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x, dy = to.y - from.y;
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(point.x - from.x - t * dx, point.y - from.y - t * dy);
}

/** Prefer the far end of a burning dash so the tractor and trail combine. */
export function getMagnetTarget(playerCenter: Point, trail: CombatExtras["trail"], worldWidth: number): Point {
  if (trail) {
    const ends = [trail.from, trail.to];
    const farEnd = ends.find(point => Math.hypot(point.x - playerCenter.x, point.y - playerCenter.y) >= 100);
    if (farEnd) return { ...farEnd };
  }
  return { x: playerCenter.x + 150 <= worldWidth - 35 ? playerCenter.x + 150 : playerCenter.x - 150, y: playerCenter.y };
}
