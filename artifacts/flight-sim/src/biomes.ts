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
  | "cruiser"
  | "delta"
  | "orbiter"
  | "walker"
  | "battery"
  | "frigate";

export type BiomeEnemyBand = "air" | "ground" | "surface";
export type BiomeTimeOfDay = "day" | "night";

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
  enemies: readonly BiomeEnemyDefinition[];
}

export const LEVELS_PER_BIOME = 5;
export const NIGHT_BACKGROUND_CHANCE = 0.2;

export const BIOMES: readonly BiomeDefinition[] = [
  {
    id: "city", name: "Neon-Metropole", subtitle: "Daecher, Schienen und Drohnenspuren",
    skyTop: "#07152b", skyBottom: "#3a6b91",
    enemies: [
      { id: "city_interceptor", name: "Metro-Abfangjaeger", visual: "interceptor", band: "air", color: "#ff3f81", accent: "#7df9ff", baseHp: 2, hpPerLevel: .45, width: 46, height: 25, minSpeed: 2.5, maxSpeed: 4.1, points: 34, fireCooldown: [58, 90] },
      { id: "city_police_drone", name: "Polizei-Drohne", visual: "drone", band: "air", color: "#2d8cff", accent: "#ff334d", baseHp: 4, hpPerLevel: .65, width: 42, height: 34, minSpeed: 1.6, maxSpeed: 2.7, points: 48, fireCooldown: [52, 82] },
      { id: "city_hover_tank", name: "Skyline-Schwebepanzer", visual: "tank", band: "ground", color: "#56677d", accent: "#ffcc33", baseHp: 8, hpPerLevel: 1.2, width: 62, height: 34, minSpeed: .8, maxSpeed: 1.4, points: 76, fireCooldown: [76, 112] },
      { id: "city_rooftop_delta", name: "Dachkanten-Jäger", visual: "delta", band: "air", color: "#6547a8", accent: "#f9a8ff", baseHp: 3, hpPerLevel: .5, width: 52, height: 30, minSpeed: 2.7, maxSpeed: 4.3, points: 42, fireCooldown: [62, 96] },
      { id: "city_signal_orbiter", name: "Signal-Sonde", visual: "orbiter", band: "air", color: "#237b91", accent: "#93ffff", baseHp: 4, hpPerLevel: .6, width: 48, height: 38, minSpeed: 1.9, maxSpeed: 3.1, points: 50, fireCooldown: [56, 88] },
      { id: "city_security_heli", name: "Wachhelikopter", visual: "helicopter", band: "air", color: "#34496c", accent: "#ff9955", baseHp: 6, hpPerLevel: .8, width: 58, height: 32, minSpeed: 1.4, maxSpeed: 2.4, points: 62, fireCooldown: [64, 100] },
      { id: "city_street_walker", name: "Straßenläufer", visual: "walker", band: "ground", color: "#626b7a", accent: "#ff668c", baseHp: 7, hpPerLevel: 1.0, width: 54, height: 40, minSpeed: 1.0, maxSpeed: 1.7, points: 70, fireCooldown: [70, 108] },
      { id: "city_rail_battery", name: "Schienen-Batterie", visual: "battery", band: "ground", color: "#384451", accent: "#ffe477", baseHp: 9, hpPerLevel: 1.2, width: 64, height: 36, minSpeed: .7, maxSpeed: 1.2, points: 82, fireCooldown: [84, 120] },
    ],
  },
  {
    id: "desert", name: "Ewige Wueste", subtitle: "Duenenmeer und vereinzelte Kakteen",
    skyTop: "#2a77b8", skyBottom: "#ffd28a",
    enemies: [
      { id: "desert_sand_wasp", name: "Sandwespe", visual: "interceptor", band: "air", color: "#d98b2b", accent: "#fff0a8", baseHp: 2, hpPerLevel: .5, width: 43, height: 24, minSpeed: 2.8, maxSpeed: 4.5, points: 38, fireCooldown: [62, 94] },
      { id: "desert_scorpion", name: "Skorpion-Drohne", visual: "crawler", band: "ground", color: "#8b4513", accent: "#ff9f1c", baseHp: 5, hpPerLevel: .85, width: 50, height: 30, minSpeed: 1.3, maxSpeed: 2.1, points: 58, fireCooldown: [66, 100] },
      { id: "desert_missile_tank", name: "Duenen-Raketenpanzer", visual: "tank", band: "ground", color: "#a06b32", accent: "#ff3b24", baseHp: 9, hpPerLevel: 1.25, width: 64, height: 36, minSpeed: .75, maxSpeed: 1.25, points: 82, fireCooldown: [70, 104] },
      { id: "desert_dune_delta", name: "Dünenfalke", visual: "delta", band: "air", color: "#c99553", accent: "#ffe6a1", baseHp: 3, hpPerLevel: .55, width: 52, height: 30, minSpeed: 3.0, maxSpeed: 4.6, points: 46, fireCooldown: [60, 94] },
      { id: "desert_mirage_heli", name: "Fata-Morgana-Helikopter", visual: "helicopter", band: "air", color: "#927245", accent: "#a4efff", baseHp: 6, hpPerLevel: .85, width: 58, height: 32, minSpeed: 1.6, maxSpeed: 2.6, points: 66, fireCooldown: [62, 98] },
      { id: "desert_sand_skimmer", name: "Sandgleiter", visual: "skimmer", band: "ground", color: "#b16b37", accent: "#ffdf69", baseHp: 4, hpPerLevel: .65, width: 52, height: 26, minSpeed: 2.2, maxSpeed: 3.6, points: 54, fireCooldown: [58, 92] },
      { id: "desert_scarab_walker", name: "Skarabäus-Läufer", visual: "walker", band: "ground", color: "#66523a", accent: "#ffc36b", baseHp: 8, hpPerLevel: 1.1, width: 56, height: 40, minSpeed: 1.0, maxSpeed: 1.8, points: 78, fireCooldown: [72, 110] },
      { id: "desert_sun_battery", name: "Sonnen-Artillerie", visual: "battery", band: "ground", color: "#73502d", accent: "#ff7841", baseHp: 10, hpPerLevel: 1.3, width: 66, height: 38, minSpeed: .65, maxSpeed: 1.1, points: 90, fireCooldown: [82, 118] },
    ],
  },
  {
    id: "ocean", name: "Endloser Ozean", subtitle: "Offene See bis zum Horizont",
    skyTop: "#087ab7", skyBottom: "#a7ecff",
    enemies: [
      { id: "ocean_sea_skimmer", name: "Wellen-Skimmer", visual: "skimmer", band: "surface", color: "#00a8cc", accent: "#e8ffff", baseHp: 3, hpPerLevel: .55, width: 48, height: 24, minSpeed: 2.5, maxSpeed: 4.0, points: 42, fireCooldown: [56, 88] },
      { id: "ocean_patrol_boat", name: "Patrouillenboot", visual: "ship", band: "surface", color: "#416a83", accent: "#ffcf4d", baseHp: 7, hpPerLevel: 1, width: 64, height: 34, minSpeed: 1.0, maxSpeed: 1.7, points: 70, fireCooldown: [64, 96] },
      { id: "ocean_submarine", name: "Jagd-U-Boot", visual: "submarine", band: "surface", color: "#173d52", accent: "#59e1ff", baseHp: 10, hpPerLevel: 1.3, width: 70, height: 31, minSpeed: .85, maxSpeed: 1.45, points: 90, fireCooldown: [72, 108] },
      { id: "ocean_albatross_delta", name: "Albatros-Jäger", visual: "delta", band: "air", color: "#54869e", accent: "#d0ffff", baseHp: 4, hpPerLevel: .6, width: 54, height: 30, minSpeed: 2.8, maxSpeed: 4.4, points: 52, fireCooldown: [58, 90] },
      { id: "ocean_sonar_orbiter", name: "Sonar-Sonde", visual: "orbiter", band: "air", color: "#25788b", accent: "#7dffd9", baseHp: 5, hpPerLevel: .75, width: 48, height: 38, minSpeed: 1.8, maxSpeed: 3.0, points: 60, fireCooldown: [60, 94] },
      { id: "ocean_coast_heli", name: "Küsten-Gunship", visual: "helicopter", band: "air", color: "#324e65", accent: "#ffb75a", baseHp: 7, hpPerLevel: 1.0, width: 60, height: 34, minSpeed: 1.4, maxSpeed: 2.4, points: 76, fireCooldown: [56, 90] },
      { id: "ocean_reef_frigate", name: "Riff-Fregatte", visual: "frigate", band: "surface", color: "#486878", accent: "#b7eaff", baseHp: 12, hpPerLevel: 1.45, width: 76, height: 40, minSpeed: .7, maxSpeed: 1.25, points: 104, fireCooldown: [78, 114] },
      { id: "ocean_abyss_hunter", name: "Tiefseejäger", visual: "submarine", band: "surface", color: "#122d45", accent: "#57c8fa", baseHp: 11, hpPerLevel: 1.35, width: 72, height: 33, minSpeed: 1.0, maxSpeed: 1.6, points: 98, fireCooldown: [66, 102] },
    ],
  },
  {
    id: "plains", name: "Weite Ebene", subtitle: "Flaches Land und schwere Verbaende",
    skyTop: "#2684c6", skyBottom: "#d8f4ff",
    enemies: [
      { id: "plains_attack_heli", name: "Angriffshelikopter", visual: "helicopter", band: "air", color: "#52673e", accent: "#ffdb58", baseHp: 4, hpPerLevel: .7, width: 54, height: 30, minSpeed: 1.8, maxSpeed: 3.0, points: 52, fireCooldown: [52, 86] },
      { id: "plains_battle_tank", name: "Kampfpanzer", visual: "tank", band: "ground", color: "#4f6137", accent: "#e8efb0", baseHp: 9, hpPerLevel: 1.3, width: 62, height: 35, minSpeed: .8, maxSpeed: 1.4, points: 82, fireCooldown: [68, 102] },
      { id: "plains_rocket_carrier", name: "Raketenwerfer", visual: "tank", band: "ground", color: "#34452d", accent: "#ff6542", baseHp: 7, hpPerLevel: 1.05, width: 67, height: 37, minSpeed: .7, maxSpeed: 1.2, points: 88, fireCooldown: [48, 78] },
      { id: "plains_field_delta", name: "Feldjäger", visual: "delta", band: "air", color: "#748445", accent: "#eaff99", baseHp: 4, hpPerLevel: .65, width: 52, height: 30, minSpeed: 2.7, maxSpeed: 4.2, points: 54, fireCooldown: [58, 92] },
      { id: "plains_watch_drone", name: "Späher-Drohne", visual: "drone", band: "air", color: "#66785d", accent: "#8de5ff", baseHp: 5, hpPerLevel: .8, width: 44, height: 34, minSpeed: 2.1, maxSpeed: 3.3, points: 62, fireCooldown: [54, 88] },
      { id: "plains_iron_walker", name: "Eisenläufer", visual: "walker", band: "ground", color: "#455239", accent: "#ffd473", baseHp: 10, hpPerLevel: 1.35, width: 58, height: 42, minSpeed: .95, maxSpeed: 1.6, points: 94, fireCooldown: [68, 102] },
      { id: "plains_siege_crawler", name: "Belagerungskrabbler", visual: "crawler", band: "ground", color: "#3d5436", accent: "#f1e59a", baseHp: 8, hpPerLevel: 1.15, width: 58, height: 36, minSpeed: 1.2, maxSpeed: 2.0, points: 84, fireCooldown: [64, 98] },
      { id: "plains_field_battery", name: "Feld-Artillerie", visual: "battery", band: "ground", color: "#3b4930", accent: "#ff8755", baseHp: 12, hpPerLevel: 1.5, width: 68, height: 38, minSpeed: .6, maxSpeed: 1.05, points: 106, fireCooldown: [80, 116] },
    ],
  },
  {
    id: "arctic", name: "Eisgrenze", subtitle: "Schnee, Gletscher und gefrorene See",
    skyTop: "#6f9fc3", skyBottom: "#eafaff",
    enemies: [
      { id: "arctic_frost_jet", name: "Frostjaeger", visual: "interceptor", band: "air", color: "#b7e8ff", accent: "#356dff", baseHp: 4, hpPerLevel: .7, width: 47, height: 25, minSpeed: 2.6, maxSpeed: 4.2, points: 52, fireCooldown: [54, 86] },
      { id: "arctic_snow_drone", name: "Schneedrohne", visual: "drone", band: "air", color: "#dff8ff", accent: "#55c7ff", baseHp: 6, hpPerLevel: .9, width: 45, height: 35, minSpeed: 1.6, maxSpeed: 2.6, points: 64, fireCooldown: [58, 92] },
      { id: "arctic_ice_cannon", name: "Gletscherkanone", visual: "tank", band: "ground", color: "#708da2", accent: "#9cffff", baseHp: 11, hpPerLevel: 1.4, width: 65, height: 37, minSpeed: .7, maxSpeed: 1.2, points: 96, fireCooldown: [66, 102] },
      { id: "arctic_blizzard_delta", name: "Blizzard-Jäger", visual: "delta", band: "air", color: "#88b6d0", accent: "#e9ffff", baseHp: 5, hpPerLevel: .8, width: 54, height: 30, minSpeed: 2.9, maxSpeed: 4.5, points: 64, fireCooldown: [54, 88] },
      { id: "arctic_aurora_orbiter", name: "Polarlicht-Sonde", visual: "orbiter", band: "air", color: "#527f99", accent: "#8affdc", baseHp: 7, hpPerLevel: 1.0, width: 50, height: 38, minSpeed: 1.9, maxSpeed: 3.1, points: 78, fireCooldown: [58, 92] },
      { id: "arctic_glacier_walker", name: "Gletscherläufer", visual: "walker", band: "ground", color: "#8ba3b4", accent: "#7ce9ff", baseHp: 12, hpPerLevel: 1.5, width: 58, height: 42, minSpeed: .85, maxSpeed: 1.5, points: 106, fireCooldown: [70, 104] },
      { id: "arctic_ice_skimmer", name: "Eisgleiter", visual: "skimmer", band: "surface", color: "#6fa6bd", accent: "#c5faff", baseHp: 6, hpPerLevel: .95, width: 54, height: 28, minSpeed: 2.3, maxSpeed: 3.7, points: 72, fireCooldown: [56, 90] },
      { id: "arctic_frost_frigate", name: "Frost-Fregatte", visual: "frigate", band: "surface", color: "#4f6f88", accent: "#8dbeff", baseHp: 14, hpPerLevel: 1.65, width: 76, height: 40, minSpeed: .65, maxSpeed: 1.15, points: 120, fireCooldown: [78, 114] },
    ],
  },
  {
    id: "canyon", name: "Roter Canyon", subtitle: "Felstuerme und enge Schluchten",
    skyTop: "#7c3c35", skyBottom: "#ffbd72",
    enemies: [
      { id: "canyon_eagle", name: "Canyon-Adler", visual: "interceptor", band: "air", color: "#a93e2c", accent: "#ffd166", baseHp: 4, hpPerLevel: .75, width: 49, height: 27, minSpeed: 2.4, maxSpeed: 3.9, points: 56, fireCooldown: [54, 88] },
      { id: "canyon_rock_crawler", name: "Felskrabbler", visual: "crawler", band: "ground", color: "#70402d", accent: "#ff8154", baseHp: 8, hpPerLevel: 1.1, width: 54, height: 33, minSpeed: 1.1, maxSpeed: 1.8, points: 76, fireCooldown: [62, 96] },
      { id: "canyon_siege_tank", name: "Schluchtenpanzer", visual: "tank", band: "ground", color: "#5b2d25", accent: "#ffbe55", baseHp: 12, hpPerLevel: 1.5, width: 68, height: 39, minSpeed: .65, maxSpeed: 1.1, points: 102, fireCooldown: [64, 98] },
      { id: "canyon_cliff_delta", name: "Klippenfalke", visual: "delta", band: "air", color: "#ba6650", accent: "#ffe093", baseHp: 5, hpPerLevel: .85, width: 54, height: 30, minSpeed: 3.0, maxSpeed: 4.6, points: 68, fireCooldown: [54, 88] },
      { id: "canyon_ravine_heli", name: "Schluchten-Gunship", visual: "helicopter", band: "air", color: "#80513b", accent: "#ffb655", baseHp: 9, hpPerLevel: 1.2, width: 60, height: 34, minSpeed: 1.5, maxSpeed: 2.5, points: 94, fireCooldown: [58, 92] },
      { id: "canyon_rock_skimmer", name: "Felsgleiter", visual: "skimmer", band: "ground", color: "#9d5439", accent: "#ffc79b", baseHp: 7, hpPerLevel: 1.05, width: 54, height: 28, minSpeed: 2.1, maxSpeed: 3.4, points: 80, fireCooldown: [60, 94] },
      { id: "canyon_mesa_walker", name: "Mesa-Läufer", visual: "walker", band: "ground", color: "#694633", accent: "#ff9066", baseHp: 13, hpPerLevel: 1.6, width: 60, height: 42, minSpeed: .8, maxSpeed: 1.45, points: 114, fireCooldown: [68, 102] },
      { id: "canyon_ravine_battery", name: "Schluchten-Artillerie", visual: "battery", band: "ground", color: "#592f28", accent: "#ffce66", baseHp: 14, hpPerLevel: 1.7, width: 68, height: 38, minSpeed: .6, maxSpeed: 1.05, points: 122, fireCooldown: [80, 116] },
    ],
  },
  {
    id: "volcano", name: "Vulkanzone", subtitle: "Aschehimmel und rasende Lavastroeme",
    skyTop: "#120a12", skyBottom: "#77261f",
    enemies: [
      { id: "volcano_fire_wasp", name: "Feuerwespe", visual: "drone", band: "air", color: "#d93318", accent: "#ffd23f", baseHp: 5, hpPerLevel: .8, width: 44, height: 34, minSpeed: 2.1, maxSpeed: 3.5, points: 62, fireCooldown: [48, 78] },
      { id: "volcano_magma_skimmer", name: "Magma-Skimmer", visual: "skimmer", band: "surface", color: "#4b1712", accent: "#ff6b18", baseHp: 8, hpPerLevel: 1.15, width: 54, height: 27, minSpeed: 1.8, maxSpeed: 3.0, points: 78, fireCooldown: [54, 84] },
      { id: "volcano_lava_tank", name: "Lavapanzer", visual: "tank", band: "ground", color: "#351412", accent: "#ff3d00", baseHp: 13, hpPerLevel: 1.6, width: 68, height: 39, minSpeed: .65, maxSpeed: 1.15, points: 108, fireCooldown: [60, 94] },
      { id: "volcano_ash_delta", name: "Aschejäger", visual: "delta", band: "air", color: "#723533", accent: "#ffcb73", baseHp: 6, hpPerLevel: .9, width: 54, height: 30, minSpeed: 3.1, maxSpeed: 4.7, points: 74, fireCooldown: [52, 86] },
      { id: "volcano_ember_interceptor", name: "Glut-Abfangjäger", visual: "interceptor", band: "air", color: "#ac3d26", accent: "#ffe578", baseHp: 5, hpPerLevel: .85, width: 46, height: 26, minSpeed: 3.3, maxSpeed: 4.9, points: 68, fireCooldown: [56, 90] },
      { id: "volcano_cinder_orbiter", name: "Schlacke-Sonde", visual: "orbiter", band: "air", color: "#51313c", accent: "#ff9466", baseHp: 9, hpPerLevel: 1.2, width: 50, height: 38, minSpeed: 1.8, maxSpeed: 3.0, points: 94, fireCooldown: [54, 88] },
      { id: "volcano_basalt_walker", name: "Basaltläufer", visual: "walker", band: "ground", color: "#39282a", accent: "#ff793c", baseHp: 14, hpPerLevel: 1.7, width: 60, height: 44, minSpeed: .8, maxSpeed: 1.4, points: 124, fireCooldown: [68, 102] },
      { id: "volcano_magma_battery", name: "Magma-Batterie", visual: "battery", band: "ground", color: "#44201d", accent: "#ffd152", baseHp: 15, hpPerLevel: 1.8, width: 70, height: 40, minSpeed: .6, maxSpeed: 1.0, points: 132, fireCooldown: [76, 112] },
    ],
  },
  {
    id: "jungle", name: "Urwald-Ruinen", subtitle: "Dichter Dschungel und vergessene Tempel",
    skyTop: "#174f46", skyBottom: "#8fcf79",
    enemies: [
      { id: "jungle_hornet", name: "Dschungelhornisse", visual: "drone", band: "air", color: "#6b8f2a", accent: "#e7ff58", baseHp: 5, hpPerLevel: .8, width: 43, height: 34, minSpeed: 2.2, maxSpeed: 3.6, points: 62, fireCooldown: [50, 82] },
      { id: "jungle_gunship", name: "Urwald-Gunship", visual: "helicopter", band: "air", color: "#315837", accent: "#ffb84d", baseHp: 9, hpPerLevel: 1.2, width: 60, height: 34, minSpeed: 1.3, maxSpeed: 2.2, points: 84, fireCooldown: [50, 80] },
      { id: "jungle_temple_guard", name: "Tempelwaechter", visual: "crawler", band: "ground", color: "#37513b", accent: "#71f2a1", baseHp: 13, hpPerLevel: 1.55, width: 60, height: 38, minSpeed: .8, maxSpeed: 1.35, points: 106, fireCooldown: [62, 96] },
      { id: "jungle_canopy_delta", name: "Baumkronen-Jäger", visual: "delta", band: "air", color: "#4e753e", accent: "#caff83", baseHp: 6, hpPerLevel: .9, width: 52, height: 30, minSpeed: 2.8, maxSpeed: 4.4, points: 74, fireCooldown: [54, 88] },
      { id: "jungle_river_skimmer", name: "Flussgleiter", visual: "skimmer", band: "surface", color: "#376b55", accent: "#79f6cc", baseHp: 8, hpPerLevel: 1.1, width: 56, height: 28, minSpeed: 2.0, maxSpeed: 3.3, points: 88, fireCooldown: [58, 92] },
      { id: "jungle_viper_drone", name: "Vipern-Drohne", visual: "drone", band: "air", color: "#568143", accent: "#ffd76b", baseHp: 7, hpPerLevel: 1.0, width: 46, height: 36, minSpeed: 2.3, maxSpeed: 3.7, points: 82, fireCooldown: [52, 86] },
      { id: "jungle_ruin_walker", name: "Ruinenläufer", visual: "walker", band: "ground", color: "#4b5e42", accent: "#b8ffa0", baseHp: 14, hpPerLevel: 1.65, width: 60, height: 42, minSpeed: .85, maxSpeed: 1.5, points: 122, fireCooldown: [68, 104] },
      { id: "jungle_temple_battery", name: "Tempel-Artillerie", visual: "battery", band: "ground", color: "#2b4936", accent: "#ffc760", baseHp: 15, hpPerLevel: 1.8, width: 68, height: 38, minSpeed: .65, maxSpeed: 1.1, points: 132, fireCooldown: [78, 114] },
    ],
  },
  {
    id: "storm", name: "Gewitterfront", subtitle: "Starkregen, Blitze und Orkanboeen",
    skyTop: "#101827", skyBottom: "#566579",
    enemies: [
      { id: "storm_glider", name: "Sturmglaeter", visual: "interceptor", band: "air", color: "#66758f", accent: "#f8f46a", baseHp: 5, hpPerLevel: .85, width: 48, height: 25, minSpeed: 2.8, maxSpeed: 4.5, points: 66, fireCooldown: [46, 76] },
      { id: "storm_thunder_drone", name: "Donnerdrohne", visual: "drone", band: "air", color: "#39495f", accent: "#75e8ff", baseHp: 8, hpPerLevel: 1.1, width: 47, height: 37, minSpeed: 1.8, maxSpeed: 3.0, points: 80, fireCooldown: [48, 78] },
      { id: "storm_lightning_carrier", name: "Blitztraeger", visual: "cruiser", band: "air", color: "#283344", accent: "#eaff68", baseHp: 14, hpPerLevel: 1.65, width: 73, height: 42, minSpeed: .8, maxSpeed: 1.4, points: 112, fireCooldown: [52, 84] },
      { id: "storm_squall_delta", name: "Böenjäger", visual: "delta", band: "air", color: "#526984", accent: "#fff59e", baseHp: 6, hpPerLevel: .95, width: 54, height: 30, minSpeed: 3.2, maxSpeed: 4.8, points: 78, fireCooldown: [50, 84] },
      { id: "storm_ion_orbiter", name: "Ionen-Sonde", visual: "orbiter", band: "air", color: "#384c70", accent: "#b5adff", baseHp: 10, hpPerLevel: 1.3, width: 52, height: 40, minSpeed: 2.0, maxSpeed: 3.3, points: 102, fireCooldown: [52, 86] },
      { id: "storm_hurricane_heli", name: "Orkan-Gunship", visual: "helicopter", band: "air", color: "#455363", accent: "#a1efff", baseHp: 11, hpPerLevel: 1.4, width: 62, height: 34, minSpeed: 1.6, maxSpeed: 2.7, points: 110, fireCooldown: [54, 88] },
      { id: "storm_flash_interceptor", name: "Blitz-Abfangjäger", visual: "interceptor", band: "air", color: "#65798b", accent: "#ffe46b", baseHp: 5, hpPerLevel: .9, width: 48, height: 26, minSpeed: 3.5, maxSpeed: 5.0, points: 74, fireCooldown: [56, 90] },
      { id: "storm_tempest_frigate", name: "Gewitter-Fregatte", visual: "frigate", band: "air", color: "#273b55", accent: "#b7edff", baseHp: 16, hpPerLevel: 1.85, width: 78, height: 42, minSpeed: .8, maxSpeed: 1.4, points: 140, fireCooldown: [74, 110] },
    ],
  },
  {
    id: "space", name: "Tiefer Weltraum", subtitle: "Sternenfelder und ferne Planeten",
    skyTop: "#000006", skyBottom: "#070b24",
    enemies: [
      { id: "space_comet_fighter", name: "Kometenjaeger", visual: "interceptor", band: "air", color: "#755cff", accent: "#a9f7ff", baseHp: 6, hpPerLevel: .9, width: 48, height: 25, minSpeed: 3.0, maxSpeed: 4.8, points: 70, fireCooldown: [44, 74] },
      { id: "space_satellite_hunter", name: "Satellitenjaeger", visual: "drone", band: "air", color: "#596b8d", accent: "#55ddff", baseHp: 9, hpPerLevel: 1.2, width: 49, height: 39, minSpeed: 1.8, maxSpeed: 3.0, points: 86, fireCooldown: [46, 76] },
      { id: "space_void_cruiser", name: "Leerenkreuzer", visual: "cruiser", band: "air", color: "#221848", accent: "#df5cff", baseHp: 15, hpPerLevel: 1.75, width: 76, height: 44, minSpeed: .75, maxSpeed: 1.35, points: 118, fireCooldown: [48, 80] },
      { id: "space_nebula_delta", name: "Nebeljäger", visual: "delta", band: "air", color: "#8263b2", accent: "#9ef3ff", baseHp: 7, hpPerLevel: 1.0, width: 54, height: 30, minSpeed: 3.3, maxSpeed: 5.0, points: 84, fireCooldown: [48, 82] },
      { id: "space_pulsar_orbiter", name: "Pulsar-Sonde", visual: "orbiter", band: "air", color: "#46558b", accent: "#ffa3ee", baseHp: 11, hpPerLevel: 1.4, width: 52, height: 40, minSpeed: 2.1, maxSpeed: 3.4, points: 110, fireCooldown: [50, 84] },
      { id: "space_asteroid_drone", name: "Asteroiden-Drohne", visual: "drone", band: "air", color: "#686e85", accent: "#8affdd", baseHp: 10, hpPerLevel: 1.3, width: 50, height: 38, minSpeed: 2.0, maxSpeed: 3.2, points: 102, fireCooldown: [54, 88] },
      { id: "space_eclipse_cruiser", name: "Eklipsen-Kreuzer", visual: "cruiser", band: "air", color: "#32254f", accent: "#d2aaff", baseHp: 16, hpPerLevel: 1.85, width: 78, height: 44, minSpeed: .9, maxSpeed: 1.5, points: 140, fireCooldown: [62, 96] },
      { id: "space_nova_frigate", name: "Nova-Fregatte", visual: "frigate", band: "air", color: "#382556", accent: "#ffbb73", baseHp: 18, hpPerLevel: 2.0, width: 80, height: 42, minSpeed: .7, maxSpeed: 1.25, points: 152, fireCooldown: [72, 108] },
    ],
  },
] as const;

export function getBiomeForLevel(level: number): BiomeDefinition {
  const safeLevel = Math.max(1, Math.floor(level));
  const index = Math.floor((safeLevel - 1) / LEVELS_PER_BIOME) % BIOMES.length;
  return BIOMES[index];
}

export function selectBiomeTimeOfDay(roll: number): BiomeTimeOfDay {
  return roll < NIGHT_BACKGROUND_CHANCE ? "night" : "day";
}

export function getBiomeEnemyDefinition(enemyId: string | undefined): BiomeEnemyDefinition | null {
  if (!enemyId) return null;
  for (const biome of BIOMES) {
    const enemy = biome.enemies.find(candidate => candidate.id === enemyId);
    if (enemy) return enemy;
  }
  return null;
}
