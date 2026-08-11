export type BiomeId =
  | "city"
  | "desert"
  | "ocean"
  | "plains"
  | "arctic"
  | "canyon"
  | "volcano"
  | "jungle"
  | "storm"
  | "space";

export type BiomeEnemyVisual =
  | "interceptor"
  | "drone"
  | "tank"
  | "skimmer"
  | "ship"
  | "submarine"
  | "helicopter"
  | "crawler"
  | "cruiser";

export type BiomeEnemyBand = "air" | "ground" | "surface";

export interface BiomeEnemyDefinition {
  id: string;
  name: string;
  visual: BiomeEnemyVisual;
  band: BiomeEnemyBand;
  color: string;
  accent: string;
  baseHp: number;
  hpPerLevel: number;
  width: number;
  height: number;
  minSpeed: number;
  maxSpeed: number;
  points: number;
  fireCooldown: readonly [number, number];
}

export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  subtitle: string;
  skyTop: string;
  skyBottom: string;
  enemies: readonly [BiomeEnemyDefinition, BiomeEnemyDefinition, BiomeEnemyDefinition];
}

export const LEVELS_PER_BIOME = 5;

export const BIOMES: readonly BiomeDefinition[] = [
  {
    id: "city", name: "Neon-Metropole", subtitle: "Daecher, Schienen und Drohnenspuren",
    skyTop: "#07152b", skyBottom: "#3a6b91",
    enemies: [
      { id: "city_interceptor", name: "Metro-Abfangjaeger", visual: "interceptor", band: "air", color: "#ff3f81", accent: "#7df9ff", baseHp: 2, hpPerLevel: .45, width: 46, height: 25, minSpeed: 2.5, maxSpeed: 4.1, points: 34, fireCooldown: [58, 90] },
      { id: "city_police_drone", name: "Polizei-Drohne", visual: "drone", band: "air", color: "#2d8cff", accent: "#ff334d", baseHp: 4, hpPerLevel: .65, width: 42, height: 34, minSpeed: 1.6, maxSpeed: 2.7, points: 48, fireCooldown: [52, 82] },
      { id: "city_hover_tank", name: "Skyline-Schwebepanzer", visual: "tank", band: "ground", color: "#56677d", accent: "#ffcc33", baseHp: 8, hpPerLevel: 1.2, width: 62, height: 34, minSpeed: .8, maxSpeed: 1.4, points: 76, fireCooldown: [76, 112] },
    ],
  },
  {
    id: "desert", name: "Ewige Wueste", subtitle: "Duenenmeer und vereinzelte Kakteen",
    skyTop: "#2a77b8", skyBottom: "#ffd28a",
    enemies: [
      { id: "desert_sand_wasp", name: "Sandwespe", visual: "interceptor", band: "air", color: "#d98b2b", accent: "#fff0a8", baseHp: 2, hpPerLevel: .5, width: 43, height: 24, minSpeed: 2.8, maxSpeed: 4.5, points: 38, fireCooldown: [62, 94] },
      { id: "desert_scorpion", name: "Skorpion-Drohne", visual: "crawler", band: "ground", color: "#8b4513", accent: "#ff9f1c", baseHp: 5, hpPerLevel: .85, width: 50, height: 30, minSpeed: 1.3, maxSpeed: 2.1, points: 58, fireCooldown: [66, 100] },
      { id: "desert_missile_tank", name: "Duenen-Raketenpanzer", visual: "tank", band: "ground", color: "#a06b32", accent: "#ff3b24", baseHp: 9, hpPerLevel: 1.25, width: 64, height: 36, minSpeed: .75, maxSpeed: 1.25, points: 82, fireCooldown: [70, 104] },
    ],
  },
  {
    id: "ocean", name: "Endloser Ozean", subtitle: "Offene See bis zum Horizont",
    skyTop: "#087ab7", skyBottom: "#a7ecff",
    enemies: [
      { id: "ocean_sea_skimmer", name: "Wellen-Skimmer", visual: "skimmer", band: "surface", color: "#00a8cc", accent: "#e8ffff", baseHp: 3, hpPerLevel: .55, width: 48, height: 24, minSpeed: 2.5, maxSpeed: 4.0, points: 42, fireCooldown: [56, 88] },
      { id: "ocean_patrol_boat", name: "Patrouillenboot", visual: "ship", band: "surface", color: "#416a83", accent: "#ffcf4d", baseHp: 7, hpPerLevel: 1, width: 64, height: 34, minSpeed: 1.0, maxSpeed: 1.7, points: 70, fireCooldown: [64, 96] },
      { id: "ocean_submarine", name: "Jagd-U-Boot", visual: "submarine", band: "surface", color: "#173d52", accent: "#59e1ff", baseHp: 10, hpPerLevel: 1.3, width: 70, height: 31, minSpeed: .85, maxSpeed: 1.45, points: 90, fireCooldown: [72, 108] },
    ],
  },
  {
    id: "plains", name: "Weite Ebene", subtitle: "Flaches Land und schwere Verbaende",
    skyTop: "#2684c6", skyBottom: "#d8f4ff",
    enemies: [
      { id: "plains_attack_heli", name: "Angriffshelikopter", visual: "helicopter", band: "air", color: "#52673e", accent: "#ffdb58", baseHp: 4, hpPerLevel: .7, width: 54, height: 30, minSpeed: 1.8, maxSpeed: 3.0, points: 52, fireCooldown: [52, 86] },
      { id: "plains_battle_tank", name: "Kampfpanzer", visual: "tank", band: "ground", color: "#4f6137", accent: "#e8efb0", baseHp: 9, hpPerLevel: 1.3, width: 62, height: 35, minSpeed: .8, maxSpeed: 1.4, points: 82, fireCooldown: [68, 102] },
      { id: "plains_rocket_carrier", name: "Raketenwerfer", visual: "tank", band: "ground", color: "#34452d", accent: "#ff6542", baseHp: 7, hpPerLevel: 1.05, width: 67, height: 37, minSpeed: .7, maxSpeed: 1.2, points: 88, fireCooldown: [48, 78] },
    ],
  },
  {
    id: "arctic", name: "Eisgrenze", subtitle: "Schnee, Gletscher und gefrorene See",
    skyTop: "#6f9fc3", skyBottom: "#eafaff",
    enemies: [
      { id: "arctic_frost_jet", name: "Frostjaeger", visual: "interceptor", band: "air", color: "#b7e8ff", accent: "#356dff", baseHp: 4, hpPerLevel: .7, width: 47, height: 25, minSpeed: 2.6, maxSpeed: 4.2, points: 52, fireCooldown: [54, 86] },
      { id: "arctic_snow_drone", name: "Schneedrohne", visual: "drone", band: "air", color: "#dff8ff", accent: "#55c7ff", baseHp: 6, hpPerLevel: .9, width: 45, height: 35, minSpeed: 1.6, maxSpeed: 2.6, points: 64, fireCooldown: [58, 92] },
      { id: "arctic_ice_cannon", name: "Gletscherkanone", visual: "tank", band: "ground", color: "#708da2", accent: "#9cffff", baseHp: 11, hpPerLevel: 1.4, width: 65, height: 37, minSpeed: .7, maxSpeed: 1.2, points: 96, fireCooldown: [66, 102] },
    ],
  },
  {
    id: "canyon", name: "Roter Canyon", subtitle: "Felstuerme und enge Schluchten",
    skyTop: "#7c3c35", skyBottom: "#ffbd72",
    enemies: [
      { id: "canyon_eagle", name: "Canyon-Adler", visual: "interceptor", band: "air", color: "#a93e2c", accent: "#ffd166", baseHp: 4, hpPerLevel: .75, width: 49, height: 27, minSpeed: 2.4, maxSpeed: 3.9, points: 56, fireCooldown: [54, 88] },
      { id: "canyon_rock_crawler", name: "Felskrabbler", visual: "crawler", band: "ground", color: "#70402d", accent: "#ff8154", baseHp: 8, hpPerLevel: 1.1, width: 54, height: 33, minSpeed: 1.1, maxSpeed: 1.8, points: 76, fireCooldown: [62, 96] },
      { id: "canyon_siege_tank", name: "Schluchtenpanzer", visual: "tank", band: "ground", color: "#5b2d25", accent: "#ffbe55", baseHp: 12, hpPerLevel: 1.5, width: 68, height: 39, minSpeed: .65, maxSpeed: 1.1, points: 102, fireCooldown: [64, 98] },
    ],
  },
  {
    id: "volcano", name: "Vulkanzone", subtitle: "Aschehimmel und rasende Lavastroeme",
    skyTop: "#120a12", skyBottom: "#77261f",
    enemies: [
      { id: "volcano_fire_wasp", name: "Feuerwespe", visual: "drone", band: "air", color: "#d93318", accent: "#ffd23f", baseHp: 5, hpPerLevel: .8, width: 44, height: 34, minSpeed: 2.1, maxSpeed: 3.5, points: 62, fireCooldown: [48, 78] },
      { id: "volcano_magma_skimmer", name: "Magma-Skimmer", visual: "skimmer", band: "surface", color: "#4b1712", accent: "#ff6b18", baseHp: 8, hpPerLevel: 1.15, width: 54, height: 27, minSpeed: 1.8, maxSpeed: 3.0, points: 78, fireCooldown: [54, 84] },
      { id: "volcano_lava_tank", name: "Lavapanzer", visual: "tank", band: "ground", color: "#351412", accent: "#ff3d00", baseHp: 13, hpPerLevel: 1.6, width: 68, height: 39, minSpeed: .65, maxSpeed: 1.15, points: 108, fireCooldown: [60, 94] },
    ],
  },
  {
    id: "jungle", name: "Urwald-Ruinen", subtitle: "Dichter Dschungel und vergessene Tempel",
    skyTop: "#174f46", skyBottom: "#8fcf79",
    enemies: [
      { id: "jungle_hornet", name: "Dschungelhornisse", visual: "drone", band: "air", color: "#6b8f2a", accent: "#e7ff58", baseHp: 5, hpPerLevel: .8, width: 43, height: 34, minSpeed: 2.2, maxSpeed: 3.6, points: 62, fireCooldown: [50, 82] },
      { id: "jungle_gunship", name: "Urwald-Gunship", visual: "helicopter", band: "air", color: "#315837", accent: "#ffb84d", baseHp: 9, hpPerLevel: 1.2, width: 60, height: 34, minSpeed: 1.3, maxSpeed: 2.2, points: 84, fireCooldown: [50, 80] },
      { id: "jungle_temple_guard", name: "Tempelwaechter", visual: "crawler", band: "ground", color: "#37513b", accent: "#71f2a1", baseHp: 13, hpPerLevel: 1.55, width: 60, height: 38, minSpeed: .8, maxSpeed: 1.35, points: 106, fireCooldown: [62, 96] },
    ],
  },
  {
    id: "storm", name: "Gewitterfront", subtitle: "Starkregen, Blitze und Orkanboeen",
    skyTop: "#101827", skyBottom: "#566579",
    enemies: [
      { id: "storm_glider", name: "Sturmglaeter", visual: "interceptor", band: "air", color: "#66758f", accent: "#f8f46a", baseHp: 5, hpPerLevel: .85, width: 48, height: 25, minSpeed: 2.8, maxSpeed: 4.5, points: 66, fireCooldown: [46, 76] },
      { id: "storm_thunder_drone", name: "Donnerdrohne", visual: "drone", band: "air", color: "#39495f", accent: "#75e8ff", baseHp: 8, hpPerLevel: 1.1, width: 47, height: 37, minSpeed: 1.8, maxSpeed: 3.0, points: 80, fireCooldown: [48, 78] },
      { id: "storm_lightning_carrier", name: "Blitztraeger", visual: "cruiser", band: "air", color: "#283344", accent: "#eaff68", baseHp: 14, hpPerLevel: 1.65, width: 73, height: 42, minSpeed: .8, maxSpeed: 1.4, points: 112, fireCooldown: [52, 84] },
    ],
  },
  {
    id: "space", name: "Tiefer Weltraum", subtitle: "Sternenfelder und ferne Planeten",
    skyTop: "#000006", skyBottom: "#070b24",
    enemies: [
      { id: "space_comet_fighter", name: "Kometenjaeger", visual: "interceptor", band: "air", color: "#755cff", accent: "#a9f7ff", baseHp: 6, hpPerLevel: .9, width: 48, height: 25, minSpeed: 3.0, maxSpeed: 4.8, points: 70, fireCooldown: [44, 74] },
      { id: "space_satellite_hunter", name: "Satellitenjaeger", visual: "drone", band: "air", color: "#596b8d", accent: "#55ddff", baseHp: 9, hpPerLevel: 1.2, width: 49, height: 39, minSpeed: 1.8, maxSpeed: 3.0, points: 86, fireCooldown: [46, 76] },
      { id: "space_void_cruiser", name: "Leerenkreuzer", visual: "cruiser", band: "air", color: "#221848", accent: "#df5cff", baseHp: 15, hpPerLevel: 1.75, width: 76, height: 44, minSpeed: .75, maxSpeed: 1.35, points: 118, fireCooldown: [48, 80] },
    ],
  },
] as const;

export function getBiomeForLevel(level: number): BiomeDefinition {
  const safeLevel = Math.max(1, Math.floor(level));
  const index = Math.floor((safeLevel - 1) / LEVELS_PER_BIOME) % BIOMES.length;
  return BIOMES[index];
}

export function getBiomeEnemyDefinition(enemyId: string | undefined): BiomeEnemyDefinition | null {
  if (!enemyId) return null;
  for (const biome of BIOMES) {
    const enemy = biome.enemies.find(candidate => candidate.id === enemyId);
    if (enemy) return enemy;
  }
  return null;
}
