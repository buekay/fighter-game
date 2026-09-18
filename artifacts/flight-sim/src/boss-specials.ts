import type { EncounterKind } from "./boss-encounters";

export const SPECIAL_NAMES: Record<EncounterKind, readonly [string, string, string]> = {
  titan: ["Reaktor-Stern", "Ionenfächer", "Plasma-Spirale"],
  tank: ["Dreifach-Railgun", "Mörser-Sperrfeuer", "Belagerungswalze"],
  spider: ["Elektro-Netz", "Achtbein-Kreuzfeuer", "Sägezahn-Spirale"],
  submarine: ["Torpedo-Rudel", "Tiefenminen", "Sonar-Schockwelle"],
  city: ["Feuersturm", "Orbital-Bombardement", "Festungs-Salve"],
};
export const SPECIAL_WARNING_FRAMES = 90;
export interface SpecialShot {
  x: number; y: number; vx: number; vy: number; damage: number;
  color: string; lifetime: number; fromPlayer: false;
  isMissile?: boolean; trackPlayer?: boolean; isFlame?: boolean;
  collisionWidth?: number; collisionHeight?: number;
}
export interface SpecialMount { x: number; y: number }
export interface BossSpecialState {
  kind: EncounterKind; index: number; stage: "cooldown" | "warning" | "firing";
  remaining: number; volley: number; origin: SpecialMount; target: SpecialMount;
  mounts: SpecialMount[];
}
export function createBossSpecial(kind: EncounterKind): BossSpecialState {
  return { kind, index: 0, stage: "cooldown", remaining: 180, volley: 0,
    origin: { x: 0, y: 0 }, target: { x: 0, y: 0 }, mounts: [] };
}
export function specialVolleyCount(kind: EncounterKind, index: number): number {
  return ({ titan: [1, 5, 7], tank: [3, 4, 5], spider: [3, 2, 7], submarine: [3, 2, 2], city: [7, 4, 3] } as const)[kind][index];
}

/** Fixed-step state machine: locked warning targets, bounded volleys, no attacks while frozen. */
export function advanceBossSpecial(
  state: BossSpecialState, frames: number, mounts: readonly SpecialMount[], target: SpecialMount,
  healthRatio: number, frozen = false,
): SpecialShot[] {
  if (frozen || mounts.length === 0 || frames <= 0) return [];
  const shots: SpecialShot[] = [];
  if (state.kind === "city" && state.stage !== "cooldown") {
    state.mounts = state.mounts.filter(locked => mounts.some(live => Math.hypot(live.x - locked.x, live.y - locked.y) < 1));
  }
  state.remaining -= Math.min(frames, 12);
  while (state.remaining <= 0) {
    if (state.stage === "cooldown") {
      state.stage = "warning";
      state.remaining += SPECIAL_WARNING_FRAMES;
      state.mounts = mounts.map(mount => ({ ...mount }));
      state.origin = { ...mounts[0] };
      state.target = { ...target };
    } else if (state.stage === "warning") {
      state.stage = "firing"; state.volley = 0;
      shots.push(...createSpecialVolley(state));
      state.remaining += 14;
    } else {
      state.volley++;
      if (state.volley >= specialVolleyCount(state.kind, state.index)) {
        state.stage = "cooldown";
        state.index = (state.index + 1) % 3;
        state.remaining += healthRatio <= .3 ? 165 : healthRatio <= .6 ? 210 : 270;
      } else {
        shots.push(...createSpecialVolley(state));
        state.remaining += 14;
      }
    }
  }
  return shots;
}

export function createSpecialVolley(state: BossSpecialState): SpecialShot[] {
  const { kind, index, volley: v, origin: o, target: t } = state;
  const shots: SpecialShot[] = [];
  const aim = Math.atan2(t.y - o.y, t.x - o.x);
  const emit = (x: number, y: number, angle: number, speed: number, color: string, damage = 3, extra: Partial<SpecialShot> = {}) => {
    shots.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      fromPlayer: false, damage, color, lifetime: 220, ...extra });
  };
  const fan = (mount: SpecialMount, center: number, count: number, spread: number, speed: number, color: string, extra: Partial<SpecialShot> = {}) => {
    for (let i = 0; i < count; i++) emit(mount.x, mount.y, center + (i - (count - 1) / 2) * spread, speed, color, 3, extra);
  };
  const ring = (x: number, y: number, count: number, speed: number, color: string, offset = 0) => {
    for (let i = 0; i < count; i++) emit(x, y, i / count * Math.PI * 2 + offset, speed, color, 2);
  };
  if (kind === "titan") {
    if (index === 0) { ring(o.x, o.y, 24, 4.2, "#f0abfc"); ring(o.x, o.y, 16, 2.8, "#67e8f9", .1); }
    if (index === 1) fan(o, aim + (v - 2) * .22, 5, .08, 7, "#67e8f9");
    if (index === 2) ring(o.x, o.y, 8, 3.8, "#c084fc", v * .22);
  } else if (kind === "tank") {
    if (index === 0) emit(o.x, o.y + (v - 1) * 35, aim, 10, "#fef08a", 5, { collisionWidth: 30, collisionHeight: 12 });
    if (index === 1) ring(Math.max(50, t.x - 50 + v * 34), Math.max(65, Math.min(535, t.y)), 8, 2.6, "#fb923c", v * .2);
    if (index === 2) for (let i = 0; i < 7; i++) {
      if (i === (v + 2) % 7) continue;
      emit(o.x, 85 + i * 70, Math.PI, 4.3, "#fbbf24", 4, { collisionWidth: 18, collisionHeight: 18 });
    }
  } else if (kind === "spider") {
    if (index === 0) for (let i = 0; i < 9; i++) emit(o.x - v * 50, 80 + i * 54, Math.PI + (i % 2 ? .16 : -.16), 2.3, "#e879f9", 2, { lifetime: 260 });
    if (index === 1) for (let i = 0; i < 8; i++) {
      const y = o.y + (i - 3.5) * 30;
      emit(o.x + 25, y, Math.atan2(t.y - y, t.x - o.x), 6, "#fb7185", 3);
    }
    if (index === 2) ring(o.x, o.y, 9, 4, "#d8b4fe", v * .18);
  } else if (kind === "submarine") {
    if (index === 0) fan(o, aim, 3, .4, 4.5, "#67e8f9", { isMissile: true, trackPlayer: true, lifetime: 180 });
    if (index === 1) for (let i = 0; i < 5; i++) emit(Math.max(60, t.x - 130 + i * 65), 70 + v * 250, Math.PI / 2, .9, "#38bdf8", 4, { lifetime: 260, collisionWidth: 22, collisionHeight: 22 });
    if (index === 2) ring(o.x, o.y, 28, v ? 5 : 3, "#a5f3fc", v * .1);
  } else {
    if (index === 0) for (const mount of state.mounts.filter((_, i) => i % 2 === 0)) {
      fan(mount, Math.PI + Math.sin(v * .4) * .25, 5, .13, 6, "#fb923c", { isFlame: true, damage: 1, lifetime: 65, collisionWidth: 18, collisionHeight: 18 });
    }
    if (index === 1) for (let i = 0; i < 6; i++) {
      if (i === 2) continue;
      emit(70 + i * 75, 65, Math.PI / 2, 5.5, "#fda4af", 4, { collisionWidth: 16, collisionHeight: 22 });
    }
    if (index === 2) for (const mount of state.mounts) fan(mount, Math.atan2(t.y - mount.y, t.x - mount.x), 2, .18, 4, "#fbbf24", { isMissile: true, lifetime: 200 });
  }
  return shots;
}
