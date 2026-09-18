export const BOSS_SEQUENCE = ["titan", "tank", "spider", "submarine", "city"] as const;
export type EncounterKind = typeof BOSS_SEQUENCE[number];
export const BOSS_NAMES: Record<EncounterKind, string> = {
  titan: "Titan", tank: "Panzer", spider: "Spinnenroboter", submarine: "U-Boot", city: "Festungsstadt",
};
export const ENCOUNTER_HEALTH = 9_000;
export const CITY_WEAPONS = ["flame", "rocket", "cannon", "flame", "rocket", "cannon"] as const;
export function encounterHealth(kind: EncounterKind): number[] {
  const count = kind === "city" ? CITY_WEAPONS.length : 1;
  return Array.from({ length: count }, (_, i) => Math.floor(ENCOUNTER_HEALTH / count) + (i < ENCOUNTER_HEALTH % count ? 1 : 0));
}
export function encounterComplete(members: readonly { killRegistered?: boolean }[]): boolean {
  return members.length > 0 && members.every(member => member.killRegistered);
}

/** First cycle: 20, 25, 30, 35, 40; subsequent cycles: every ten levels. */
export function getBossForLevel(level: number): EncounterKind | null {
  if (!Number.isInteger(level) || level < 20) return null;
  if (level <= 40) return level % 5 === 0 ? BOSS_SEQUENCE[(level - 20) / 5] : null;
  return level % 10 === 0 ? BOSS_SEQUENCE[((level - 50) / 10) % BOSS_SEQUENCE.length] : null;
}

/** Large score rewards must not skip a boss, nor advance past a living boss. */
export function getEncounterProgressionLevel(
  current: number, target: number, spawnedLevels: ReadonlySet<number>, encounterActive: boolean,
): number {
  if (encounterActive) return current;
  for (let level = current; level <= target; level++) {
    if (getBossForLevel(level) && !spawnedLevels.has(level)) return level;
  }
  return target;
}

export const BOSS_DIMENSIONS: Record<EncounterKind, { width: number; height: number }> = {
  titan: { width: 270, height: 232 }, tank: { width: 310, height: 230 },
  spider: { width: 310, height: 280 }, submarine: { width: 350, height: 185 },
  city: { width: 164, height: 112 },
};
export function cityMountPosition(slot: number, canvasWidth: number, canvasHeight: number) {
  return { x: canvasWidth - 390 + (slot % 2) * 190, y: 190 + Math.floor(slot / 2) * ((canvasHeight - 350) / 2) };
}
