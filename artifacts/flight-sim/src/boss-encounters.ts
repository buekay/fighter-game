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
