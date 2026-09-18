export function getAircraftUltiIds(
  hybridActive: boolean,
  build: { bodySkin: string; wingSkin: string; engineSkin: string },
  fallbackSkin: { id: string },
): Set<string> {
  return new Set(hybridActive
    ? [build.bodySkin, build.wingSkin, build.engineSkin]
    : [fallbackSkin.id]);
}

export function getDroneUltiIds(build: { bodySkin: string; coreSkin: string; weaponSkin: string }): Set<string> {
  return new Set([build.bodySkin, build.coreSkin, build.weaponSkin]);
}

export function getDroneUltiBoosts(ids: Set<string>, active: boolean) {
  if (!active) return { fireRate: 1, damage: 1 };
  // Shared boosts use the strongest component; distinct effects apply together.
  return {
    fireRate: ids.has("drone_omega") ? 0.25 : ids.has("drone_solar") ? 0.33 : 0.5,
    damage: ids.has("drone_omega") ? 4 : ids.has("drone_solar") || ids.has("drone_nova") ? 3 : 2,
  };
}
