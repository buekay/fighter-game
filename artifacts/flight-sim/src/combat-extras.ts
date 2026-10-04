import { applyPlayerDamage, type LifeState } from "./game-rules";

export const EXTRA_ITEMS = [
  { id: "shadow_dash", name: "Schatten-Dash-Ulti", rarity: "epic", cost: 50_000, desc: "Ausrüstbare Ulti: Ohne Bewegung und ohne Feuerspur, 0,25 Sek. geschützt. Ein Doppelgänger bleibt 10 Sek. stehen und zieht alle Gegnerangriffe auf sich. 8 Sek. Ladezeit; erneut nutzbar, sobald der Doppelgänger verschwindet." },
  { id: "perfect_counter", name: "Konter-Ulti", rarity: "rare", cost: 50_000, desc: "Ausrüstbare Ulti: Konterschild für 0,25 Sek. Ein abgewehrter Treffer lädt die nächste Hauptwaffen-Salve 5 Sek. lang auf 2× Schaden. 4 Sek. Ladezeit." },
  { id: "magnet_fist", name: "Magnetfaust-Ulti", rarity: "epic", cost: 100_000, desc: "Ausrüstbare Ulti: Zieht normale Gegner 1,5 Sek. in die Feuerlinie vor deinem Jet und sammelt nahe Pickups. Bosse sind immun. 10 Sek. Ladezeit." },
  { id: "last_spark", name: "Letzter Funke", rarity: "legendary", cost: 200_000, desc: "Automatisch einmal pro Einsatz: Ein tödlicher Treffer lässt 1 HP übrig. Eine Druckwelle räumt nahe Geschosse ab und verursacht 12 Schaden. Kein zusätzliches Leben; Fortsetzen lädt den Funken nicht neu." },
  { id: "chaos_pickup", name: "Chaos-Pickup", rarity: "rare", cost: 50_000, desc: "Jeder 15. Abschuss hinterlässt ein CHAOS-Pickup. Einsammeln verleiht zufällig 8 Sek. Schnellfeuer, Feuerkraft oder Magnetfeld. Neue Pickups ersetzen den Effekt. Funktioniert auch mit Ulti-Abschüssen." },
  { id: "fire_core", name: "Feuerkern", rarity: "epic", cost: 100_000, desc: "Dauerhaft +15 % Hauptwaffen-Schaden." },
] as const;
export type ExtraAction = "shadow_dash" | "perfect_counter" | "magnet_fist";
export const EXTRA_ACTIONS: readonly ExtraAction[] = ["shadow_dash", "perfect_counter", "magnet_fist"];
export function isCombatUlti(id: string): id is ExtraAction {
  return EXTRA_ACTIONS.some(action => action === id);
}
export const COMBAT_ULTI_RECHARGE: Record<ExtraAction, number> = {
  shadow_dash: 480, perfect_counter: 240, magnet_fist: 600,
};
export const SHADOW_DECOY_DURATION = 10 * 60;
export function createShadowDecoy(position: Point): Point & { life: number } {
  return { ...position, life: SHADOW_DECOY_DURATION };
}
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
export function tickCombatExtras(state: CombatExtras, frames: number, rechargeMultiplier = 1): void {
  const dt = Math.max(0, frames);
  for (const id of EXTRA_ACTIONS) state.cooldowns[id] = Math.max(0, state.cooldowns[id] - dt * rechargeMultiplier);
  for (const key of ["dashProtection", "parry", "charged", "magnet", "chaosTime"] as const) state[key] = Math.max(0, state[key] - dt);
  if (!state.chaosTime) state.chaos = null;
  for (const key of ["decoy", "trail", "pulse"] as const) {
    const effect = state[key];
    if (effect) { effect.life -= dt; if (effect.life <= 0) state[key] = null; }
  }
}
export function activateExtra(state: CombatExtras, action: ExtraAction, owned: readonly string[], loadout: readonly string[]): boolean {
  if (action === "shadow_dash" && state.decoy) return false;
  if (!loadout.includes(action) || !owned.includes(action) || state.cooldowns[action] > 0) return false;
  if (action === "shadow_dash") { state.cooldowns[action] = COMBAT_ULTI_RECHARGE[action]; state.dashProtection = 15; }
  if (action === "perfect_counter") { state.cooldowns[action] = COMBAT_ULTI_RECHARGE[action]; state.parry = 15; }
  if (action === "magnet_fist") { state.cooldowns[action] = COMBAT_ULTI_RECHARGE[action]; state.magnet = 90; }
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

export function combatUltiStates(state: CombatExtras) {
  const entry = (id: ExtraAction, label: string, active: number, duration: number, color: string) => ({
    label, key: "", charge: COMBAT_ULTI_RECHARGE[id] - state.cooldowns[id], max: COMBAT_ULTI_RECHARGE[id],
    active, duration, color, activeColors: [color, "#ffffff"] as [string, string],
    chargeColors: ["#312e81", color] as [string, string],
  });
  return {
    shadow_dash: entry("shadow_dash", "DASH", state.decoy?.life ?? 0, SHADOW_DECOY_DURATION, "#c4b5fd"),
    perfect_counter: entry("perfect_counter", "KONTER", state.parry, 15, "#67e8f9"),
    magnet_fist: entry("magnet_fist", "MAGNET", state.magnet, 90, "#d8b4fe"),
  };
}
