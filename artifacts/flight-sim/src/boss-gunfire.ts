import type { EncounterKind } from "./boss-encounters";
import type { SpecialMount, SpecialShot } from "./boss-specials";

export const BOSS_SHOT_COLORS: Record<EncounterKind, string> = {
  titan: "#c084fc", tank: "#fbbf24", spider: "#4ade80",
  submarine: "#38bdf8", city: "#fb7185",
};

/** Basic guns have their own cadence, independent of special attack stages. */
export const BOSS_GUN_INTERVAL = { tank: 32, spider: 24, submarine: 28, city: 48 } as const;

export function createBossGunfire(
  kind: Exclude<EncounterKind, "titan">, origin: SpecialMount, target: SpecialMount, volley: number,
): SpecialShot[] {
  const aim = Math.atan2(target.y - origin.y, target.x - origin.x);
  const offsets = kind === "tank" ? [0]
    : kind === "spider" ? [-.3, 0, .3]
    : kind === "submarine" ? [-.07, .07]
    : [Math.sin(volley * .6) * .24];
  const speed = kind === "tank" ? 7 : kind === "submarine" ? 5.5 : 4.5;
  return offsets.map(offset => ({
    x: origin.x, y: origin.y,
    vx: Math.cos(aim + offset) * speed, vy: Math.sin(aim + offset) * speed,
    color: BOSS_SHOT_COLORS[kind], fromPlayer: false, damage: kind === "tank" ? 3 : 2,
    lifetime: 220, collisionWidth: kind === "tank" ? 16 : 10, collisionHeight: 6,
  }));
}
