import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  MAX_LEVEL,
  PLAYER_SHIELD_HP,
  applyEnemyDamage,
  applyPlayerHitProtection,
  applyPlayerDamage,
  calculateCoinReward,
  formatLockedSkinPrice,
  getDroneStats,
  getDroneUpgradeCost,
  getAircraftUpgradeCost,
  getAircraftUpgradeStats,
  getLevelForScore,
  getPilotLevelForScore,
  getLevelThreshold,
  HEAL_ULTI_RESTORE,
  KEYBOARD_CONTROL_HELP,
  isBossEligibleLevel,
  isMilestoneBossLevel,
  MOBILE_CONTROL_HELP,
  shouldUseAboveCloudsBackground,
  shouldUseCityBackground,
  shouldUseSpaceBackground,
  shouldShowVirtualControls,
} from "../game-rules";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Vec2 { x: number; y: number }

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; radius: number;
}

interface Star {
  x: number; y: number;
  speed: number; brightness: number; size: number;
}

interface Building {
  x: number; width: number; height: number;
  windows: { wx: number; wy: number; lit: boolean }[];
}

interface Bullet {
  x: number; y: number;
  vx: number; vy: number;
  fromPlayer: boolean;
  damage: number;
  isMissile?: boolean;
  missileTarget?: Enemy | null;
  trackPlayer?: boolean;
  lifetime?: number;
  color?: string;
  stunFrames?: number;
}

interface Enemy {
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  width: number; height: number;
  type: "scout" | "fighter" | "bomber" | "boss" | "overlord" | "interceptor" | "gunship" | "tiefighter" | "emeraldtiefighter" | "plasmawing" | "sentinel";
  shootCooldown: number;
  points: number;
  color: string;
  angle: number;
  oscillate?: number;
  dead?: boolean;
  missileTimer?: number;
  bossVyTimer?: number;
  bossVyDir?: number;
  bossAge?: number;
  specialAttackTimer?: number;
  fighterDodgeTimer?: number;
  fighterDodgeDir?: number;
  tieDodgeTimer?: number;
  tieDodgeDir?: number;
  shieldHp?: number;
  ultimateFreezeTimer?: number;
  ultimateSlowTimer?: number;
  ultimateDotTimer?: number;
}

const isBossEnemy = (enemy: Enemy) => enemy.type === "boss" || enemy.type === "overlord";

interface PowerUp {
  x: number; y: number;
  type: "health" | "shield" | "speed" | "speedboost";
  vy: number;
}

type ShopRarity = "rare" | "epic" | "legendary" | "ultraLegendary";

interface GameState {
  score: number;
  level: number;
  hp: number;
  maxHp: number;
  shield: number;
  speed: number;
  weaponTier: number;
  lives: number;
  gameOver: boolean;
  started: boolean;
  paused: boolean;
}

interface GameSettings {
  language: "de" | "en";
  tutorial: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  touchControls: "auto" | "always" | "never";
  soundVolume: number;
  musicVolume: number;
}

type RunUpgradeId = "rapid_fire" | "damage" | "max_hp" | "drone" | "critical" | "shield";
interface RunUpgrade { id: RunUpgradeId; icon: string; name: string; description: string }
interface RunStats { kills: number; bosses: number; damageTaken: number; powerUps: number }
interface Achievement { id: string; icon: string; name: string; description: string; target: number; reward: number; stat: keyof RunStats }

// ─── Constants ───────────────────────────────────────────────────────────────

const CANVAS_W = 900;
const CANVAS_H = 600;
const FRAME_MS = 1000 / 60;
const PLAYER_W = 52;
const PLAYER_H = 28;
const BASE_BULLET_SPEED = 10;
const ENEMY_BULLET_SPEED = 3;

const SHOP_RARITIES: Record<ShopRarity, { label: string; color: string; glow: string }> = {
  rare:      { label: "SELTEN",    color: "#a8b0ba", glow: "#d6dbe166" },
  epic:      { label: "EPISCH",    color: "#b44cff", glow: "#b44cff88" },
  legendary: { label: "LEGENDÄR", color: "#ffe600", glow: "#ffe600cc" },
  ultraLegendary: { label: "ULTRA LEGENDÄR", color: "#53d8ff", glow: "#00aaffee" },
} as const;
const SHOP_RARITY_ORDER: Record<ShopRarity, number> = {
  rare: 0,
  epic: 1,
  legendary: 2,
  ultraLegendary: 3,
};
const SHOP_RARITY_MIN_LEVEL: Record<ShopRarity, number> = {
  rare: 1,
  epic: 5,
  legendary: 10,
  ultraLegendary: 15,
};

function isShopRarityUnlocked(rarity: ShopRarity, playerLevel: number): boolean {
  return playerLevel >= SHOP_RARITY_MIN_LEVEL[rarity];
}

const LEVEL_THRESHOLDS = Array.from({ length: MAX_LEVEL }, (_, i) => getLevelThreshold(i + 1));
const WEAPON_TIERS = [
  { name: "Single Cannon",    guns: 1, spread: false, missile: false, fireRate: 280, bulletDmg: 1 },
  { name: "Twin Cannons",     guns: 2, spread: false, missile: false, fireRate: 250, bulletDmg: 1 },
  { name: "Triple Burst",     guns: 3, spread: true,  missile: false, fireRate: 220, bulletDmg: 1 },
  { name: "Quad Cannons",     guns: 4, spread: true,  missile: false, fireRate: 190, bulletDmg: 1 },
  { name: "Missile Lock",     guns: 3, spread: true,  missile: true,  fireRate: 170, bulletDmg: 2 },
  { name: "Superweapon",      guns: 5, spread: true,  missile: true,  fireRate: 140, bulletDmg: 2 },
  { name: "Plasma Array",     guns: 6, spread: true,  missile: true,  fireRate: 115, bulletDmg: 3 },
  { name: "Devastator",       guns: 7, spread: true,  missile: true,  fireRate: 90,  bulletDmg: 4 },
];

// ─── Save / load ─────────────────────────────────────────────────────────────

const SAVE_KEY = "fighter-command-save";

interface SaveData {
  score: number; level: number; hp: number; maxHp: number;
  weaponTier: number; speed: number; lives: number; savedAt: number;
  runUpgrades?: Record<RunUpgradeId, number>;
  upgradeLevel?: number;
  aircraftLevel?: number;
}

const EMPTY_RUN_UPGRADES: Record<RunUpgradeId, number> = {
  rapid_fire: 0, damage: 0, max_hp: 0, drone: 0, critical: 0, shield: 0,
};

function saveGame(gs: GameState, runUpgrades: Record<RunUpgradeId, number>, upgradeLevel: number) {
  try {
    const data: SaveData = {
      score: gs.score, level: gs.level, hp: gs.hp, maxHp: gs.maxHp,
      weaponTier: gs.weaponTier, speed: gs.speed, lives: gs.lives,
      runUpgrades: { ...runUpgrades }, upgradeLevel,
      aircraftLevel: loadAircraftLevels()[loadSkin()] ?? 1,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* storage unavailable */ }
}

function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as SaveData) : null;
  } catch { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}

// ─── Skins, shop & persistent data ───────────────────────────────────────────

const SKIN_KEY    = "fighter-command-skin";
const ULTI_SKIN_KEY = "fighter-command-ulti-skin";
const DRONE_SKIN_KEY = "fighter-command-drone-skin";
const HS_KEY      = "fighter-command-hs";
const COINS_KEY   = "fighter-command-coins";
const DAILY_CHEST_KEY = "fighter-command-daily-chest";
const DAILY_CHEST_REWARD = 10_000;
const UNLOCKS_KEY = "fighter-command-unlocks";
const AIRCRAFT_LEVELS_KEY = "fighter-command-aircraft-levels";
const DRONE_LEVELS_KEY = "fighter-command-drone-levels";

const JET_SKINS = [
  { id: "steel", name: "Steel", body: "#1a2a4a", stroke: "#2a4a8a", glow: "#00cfff", cost: 0, rarity: "rare", ultiName: "Stahlfestung", ultiDesc: "Starker Schutzschild und stark verringerter Schaden." },
  { id: "fire", name: "Feuer", body: "#3a1500", stroke: "#8a3a00", glow: "#ff6600", cost: 50000, rarity: "rare", ultiName: "Feuersturm", ultiDesc: "Alle Gegner brennen und erleiden fortlaufend Schaden." },
  { id: "jade", name: "Jade", body: "#0a2a1a", stroke: "#1a5a2a", glow: "#00ff88", cost: 50000, rarity: "rare", ultiName: "Lebensenergie", ultiDesc: "Heilt sofort 5 HP und aktiviert einen Schutzschild." },
  { id: "gold", name: "Gold", body: "#2a2000", stroke: "#5a4a00", glow: "#ffcc00", cost: 50000, rarity: "rare", ultiName: "Goldrausch", ultiDesc: "Doppelte Punkte und deutlich schnellere Feuerrate." },
  { id: "shadow", name: "Schatten", body: "#0d0d12", stroke: "#2a1a3a", glow: "#aa44ff", cost: 50000, rarity: "rare", ultiName: "Phantomflug", ultiDesc: "Unsichtbar und unverwundbar; endet mit einer Schockwelle." },
  { id: "crimson", name: "Scharlach", body: "#2a0a0a", stroke: "#5a1a1a", glow: "#ff2244", cost: 50000, rarity: "rare", ultiName: "Blutrausch", ultiDesc: "Doppelter Schaden und massiv erhöhte Feuerrate." },
  { id: "galaxy", name: "Galaxy", body: "#06063a", stroke: "#1a1a6a", glow: "#4488ff", cost: 80000, rarity: "epic", ultiName: "Schwarzes Loch", ultiDesc: "Zieht Gegner zur Mitte und beschädigt sie dauerhaft." },
  { id: "neon", name: "Neon", body: "#001a10", stroke: "#004422", glow: "#00ffcc", cost: 80000, rarity: "epic", ultiName: "Kettenblitz", ultiDesc: "Blitze springen fortlaufend durch alle Gegner." },
  { id: "arctic", name: "Arktis", body: "#142030", stroke: "#3a6a8a", glow: "#aaddff", cost: 80000, rarity: "epic", ultiName: "Absoluter Nullpunkt", ultiDesc: "Friert Gegner und gegnerische Projektile vollständig ein." },
  { id: "lava", name: "Lava", body: "#2a0800", stroke: "#7a2200", glow: "#ff4400", cost: 80000, rarity: "epic", ultiName: "Vulkanausbruch", ultiDesc: "Explosive Lavawellen verursachen hohen Flächenschaden." },
  { id: "xwing", name: "X-Wing", body: "#252528", stroke: "#505060", glow: "#ff2200", cost: 120000, rarity: "legendary", ultiName: "Rebellenangriff", ultiDesc: "Zwei verbündete X-Wings greifen mit dir gemeinsam an." },
  { id: "tiefighter", name: "TIE Fighter", body: "#101015", stroke: "#303040", glow: "#33ddff", cost: 120000, rarity: "legendary", ultiName: "Imperialer Schwarm", ultiDesc: "Vier TIE-Jäger umkreisen dich und feuern gemeinsam." },
  { id: "n1", name: "N-1 Jäger", body: "#34383c", stroke: "#8c949b", glow: "#cfd6dc", cost: 200000, rarity: "ultraLegendary", ultiName: "Naboo-Blitz", ultiDesc: "Unverwundbar: Naboo-Blitz, Schwarzes Loch und Rebellenangriff zugleich." },
] as const;
type JetSkin = typeof JET_SKINS[number];

const DRONE_SKINS = [
  { id: "drone_violet", name: "Violett", body: "#24153c", stroke: "#b86cff", core: "#f0d5ff", cost: 0, rarity: "rare" },
  { id: "drone_ember", name: "Glut", body: "#3b1608", stroke: "#ff6a28", core: "#ffe0a8", cost: 25000, rarity: "rare" },
  { id: "drone_ion", name: "Ion", body: "#092a38", stroke: "#22dfff", core: "#d9fbff", cost: 50000, rarity: "rare" },
  { id: "drone_phantom", name: "Phantom", body: "#171224", stroke: "#e94cff", core: "#ffffff", cost: 80000, rarity: "epic" },
  { id: "drone_solar", name: "Solar", body: "#332a05", stroke: "#ffe34c", core: "#fffbd1", cost: 120000, rarity: "legendary" },
] as const;
type DroneSkin = typeof DRONE_SKINS[number];

interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  rarity: ShopRarity;
  requires?: string;
}

const SHOP_ITEMS: readonly ShopItem[] = [
  { id: "drone_mk2",     name: "Drohne MK II",      desc: "+1 Drohnenschaden und 12% schnelleres Feuer",      cost: 50000,  rarity: "rare" },
  { id: "drone_mk3",     name: "Drohne MK III",     desc: "Zwei Kanonen und nochmals 12% schnelleres Feuer", cost: 80000,  rarity: "epic", requires: "drone_mk2" },
  { id: "drone_mk4",     name: "Drohne MK IV",      desc: "+1 Drohnenschaden und nochmals 12% schneller",    cost: 120000, rarity: "legendary", requires: "drone_mk3" },
  { id: "drone_mk5",     name: "Drohne MK V",       desc: "Hochleistungsantrieb: nochmals 12% schneller",     cost: 120000, rarity: "legendary", requires: "drone_mk4" },
  { id: "drone_mk6",     name: "Drohne MK VI",      desc: "Drei Kanonen, +1 Schaden und nochmals 12% schneller", cost: 200000, rarity: "ultraLegendary", requires: "drone_mk5" },
  { id: "drone_mk7",     name: "Drohne MK VII",     desc: "Quantenkühlung: nochmals 12% schnelleres Feuer",  cost: 200000, rarity: "ultraLegendary", requires: "drone_mk6" },
  { id: "drone_mk8",     name: "Drohne MK VIII",    desc: "+1 Drohnenschaden bei maximaler Feuerrate",       cost: 200000, rarity: "ultraLegendary", requires: "drone_mk7" },
  { id: "ulti_boost",    name: "Ulti-Boost",       desc: "Ultis laden 50% schneller",                      cost: 50000,  rarity: "rare" },
  { id: "extra_life",    name: "+1 Leben",          desc: "Starte mit 4 statt 3 Leben",                     cost: 50000,  rarity: "rare" },
  { id: "weapon_head",   name: "Waffen-Vorstart",   desc: "Starte auf Waffentier 2",                        cost: 50000,  rarity: "rare" },
  { id: "clone_upgrade", name: "Flugzeug-Ulti ⬆", desc: "Die Flugzeug-Ulti lädt 25% schneller", cost: 50000, rarity: "rare" },
  { id: "laser_upgrade", name: "Laser-Ulti ⬆",     desc: "Laser macht 2× Schaden & hält 25% länger",       cost: 50000,  rarity: "rare" },
  { id: "clone_laser", name: "Flügelmann-Laser", desc: "Beschworene Flügelmänner kopieren den Laser", cost: 80000, rarity: "epic" },
  { id: "stealth_ulti",  name: "Stealth-Ulti 👁",  desc: "10 Sek. unsichtbar & unverwundbar  [Taste R]",    cost: 120000, rarity: "legendary" },
  { id: "heal_ulti",     name: "Heil-Ulti ❤",      desc: "Heilt 5 HP sofort [Taste H]",                    cost: 120000, rarity: "legendary" },
  { id: "ultimate_ulti", name: "Ultimate Ulti ⚡", desc: "10 Sek. Titanenschild, 2× Schaden, Frost & Kettenblitze [Taste U]", cost: 200000, rarity: "ultraLegendary" },
  { id: "max_hp",        name: "Panzer-HP",         desc: "+5 maximale HP (dauerhaft)",                     cost: 50000,  rarity: "rare" },
  { id: "speed_item",    name: "Speed-Triebwerk",   desc: "+0.5 permanente Geschwindigkeit",                cost: 50000,  rarity: "rare" },
  { id: "armor",         name: "Panzerung",         desc: "Treffer geben nur 0.5 HP Schaden",               cost: 80000,  rarity: "epic" },
] as const;
const SORTED_SHOP_ITEMS = [...SHOP_ITEMS].sort(
  (a, b) => SHOP_RARITY_ORDER[a.rarity] - SHOP_RARITY_ORDER[b.rarity],
);

const NAME_KEY         = "fighter-command-name";
const BULLET_COLOR_KEY = "fighter-command-bcolor";
const SETTINGS_KEY     = "fighter-command-settings";
const TUTORIAL_KEY     = "fighter-command-tutorial-seen";
const BRIEFING_KEY     = "fighter-command-briefing-seen";
const DEFAULT_SETTINGS: GameSettings = {
  language: "de",
  tutorial: true,
  reducedMotion: false,
  highContrast: false,
  touchControls: "auto",
  soundVolume: 0.65,
  musicVolume: 0.25,
};

const RUN_UPGRADES: RunUpgrade[] = [
  { id: "rapid_fire", icon: "⚡", name: "Overdrive", description: "20% schneller feuern (stapelbar)" },
  { id: "damage", icon: "💥", name: "Schwere Munition", description: "+1 Schaden für alle Geschosse" },
  { id: "max_hp", icon: "❤", name: "Nanopanzerung", description: "+3 maximale HP und sofort heilen" },
  { id: "drone", icon: "🛸", name: "Drohnen-Overclock", description: "Drohne wird für diesen Einsatz eine Stufe stärker" },
  { id: "critical", icon: "🎯", name: "Zielcomputer", description: "15% Chance auf dreifachen Schaden" },
  { id: "shield", icon: "🛡", name: "Notfallschild", description: "Sofort ein Schild; lädt nach Bossen neu" },
];
const ACHIEVEMENT_KEY = "fighter-command-achievements";
const ACHIEVEMENTS: Achievement[] = [
  { id: "first_sortie", icon: "✈", name: "Erster Einsatz", description: "Besiege 10 Gegner", target: 10, reward: 500, stat: "kills" },
  { id: "on_a_roll", icon: "🔥", name: "Nicht zu stoppen", description: "Besiege 25 Gegner in einem Einsatz", target: 25, reward: 1000, stat: "kills" },
  { id: "sky_sweeper", icon: "⚡", name: "Himmelsfeger", description: "Besiege 50 Gegner in einem Einsatz", target: 50, reward: 1800, stat: "kills" },
  { id: "ace", icon: "🎯", name: "Fliegerass", description: "Besiege 100 Gegner in einem Einsatz", target: 100, reward: 3000, stat: "kills" },
  { id: "elite_ace", icon: "🦅", name: "Elite-Ass", description: "Besiege 250 Gegner in einem Einsatz", target: 250, reward: 7500, stat: "kills" },
  { id: "legend_of_the_skies", icon: "🌌", name: "Legende der Lüfte", description: "Besiege 500 Gegner in einem Einsatz", target: 500, reward: 15000, stat: "kills" },
  { id: "air_superiority", icon: "🛩", name: "Luftüberlegenheit", description: "Besiege 750 Gegner in einem Einsatz", target: 750, reward: 22000, stat: "kills" },
  { id: "thousand_down", icon: "💯", name: "Tausendfacher Abschuss", description: "Besiege 1.000 Gegner in einem Einsatz", target: 1000, reward: 30000, stat: "kills" },
  { id: "storm_of_lead", icon: "🌪", name: "Sturm aus Stahl", description: "Besiege 1.500 Gegner in einem Einsatz", target: 1500, reward: 42000, stat: "kills" },
  { id: "enemy_extinction", icon: "☄", name: "Auslöschung", description: "Besiege 2.000 Gegner in einem Einsatz", target: 2000, reward: 55000, stat: "kills" },
  { id: "untouchable_hunter", icon: "🔱", name: "Jäger ohne Grenzen", description: "Besiege 3.000 Gegner in einem Einsatz", target: 3000, reward: 75000, stat: "kills" },
  { id: "sky_legend", icon: "👑", name: "Herrscher des Himmels", description: "Besiege 4.000 Gegner in einem Einsatz", target: 4000, reward: 100000, stat: "kills" },
  { id: "five_thousand", icon: "🌠", name: "Die glorreichen 5.000", description: "Besiege 5.000 Gegner in einem Einsatz", target: 5000, reward: 125000, stat: "kills" },
  { id: "endless_barrage", icon: "♾", name: "Endloses Sperrfeuer", description: "Besiege 7.500 Gegner in einem Einsatz", target: 7500, reward: 175000, stat: "kills" },
  { id: "ten_thousand", icon: "🏆", name: "Unsterbliche Legende", description: "Besiege 10.000 Gegner in einem Einsatz", target: 10000, reward: 250000, stat: "kills" },
  { id: "first_boss", icon: "💥", name: "David gegen Goliath", description: "Besiege einen Boss", target: 1, reward: 1500, stat: "bosses" },
  { id: "boss_hunter", icon: "☠", name: "Bossjäger", description: "Besiege 3 Bosse in einem Einsatz", target: 3, reward: 5000, stat: "bosses" },
  { id: "boss_breaker", icon: "🔨", name: "Bossbrecher", description: "Besiege 5 Bosse in einem Einsatz", target: 5, reward: 8000, stat: "bosses" },
  { id: "boss_nemesis", icon: "👹", name: "Erzfeind der Bosse", description: "Besiege 10 Bosse in einem Einsatz", target: 10, reward: 16000, stat: "bosses" },
  { id: "boss_apocalypse", icon: "🌋", name: "Boss-Apokalypse", description: "Besiege 20 Bosse in einem Einsatz", target: 20, reward: 30000, stat: "bosses" },
  { id: "boss_annihilator", icon: "⚔", name: "Titanenbezwinger", description: "Besiege 30 Bosse in einem Einsatz", target: 30, reward: 45000, stat: "bosses" },
  { id: "boss_nightmare", icon: "🌑", name: "Albtraum der Bosse", description: "Besiege 40 Bosse in einem Einsatz", target: 40, reward: 60000, stat: "bosses" },
  { id: "boss_half_century", icon: "🎖", name: "Halbes Jahrhundert", description: "Besiege 50 Bosse in einem Einsatz", target: 50, reward: 80000, stat: "bosses" },
  { id: "boss_dominator", icon: "🦾", name: "Boss-Dominator", description: "Besiege 75 Bosse in einem Einsatz", target: 75, reward: 110000, stat: "bosses" },
  { id: "boss_centurion", icon: "🏛", name: "Boss-Zenturio", description: "Besiege 100 Bosse in einem Einsatz", target: 100, reward: 150000, stat: "bosses" },
  { id: "boss_reaper", icon: "🗡", name: "Titanenschnitter", description: "Besiege 150 Bosse in einem Einsatz", target: 150, reward: 220000, stat: "bosses" },
  { id: "boss_final_judgment", icon: "⚖", name: "Jüngstes Gericht", description: "Besiege 200 Bosse in einem Einsatz", target: 200, reward: 300000, stat: "bosses" },
  { id: "scavenger", icon: "🧲", name: "Bergungsexperte", description: "Sammle 3 Power-ups in einem Einsatz", target: 3, reward: 750, stat: "powerUps" },
  { id: "collector", icon: "💎", name: "Sammler", description: "Sammle 10 Power-ups in einem Einsatz", target: 10, reward: 2000, stat: "powerUps" },
  { id: "power_hungry", icon: "🔋", name: "Energiehungrig", description: "Sammle 20 Power-ups in einem Einsatz", target: 20, reward: 4500, stat: "powerUps" },
  { id: "arsenal_master", icon: "🚀", name: "Arsenalmeister", description: "Sammle 35 Power-ups in einem Einsatz", target: 35, reward: 8000, stat: "powerUps" },
  { id: "overcharged", icon: "✨", name: "Voll aufgeladen", description: "Sammle 50 Power-ups in einem Einsatz", target: 50, reward: 14000, stat: "powerUps" },
  { id: "power_stockpile", icon: "📦", name: "Energievorrat", description: "Sammle 75 Power-ups in einem Einsatz", target: 75, reward: 20000, stat: "powerUps" },
  { id: "power_century", icon: "💯", name: "Power-Jubiläum", description: "Sammle 100 Power-ups in einem Einsatz", target: 100, reward: 28000, stat: "powerUps" },
  { id: "power_magnet", icon: "🧲", name: "Supermagnet", description: "Sammle 150 Power-ups in einem Einsatz", target: 150, reward: 40000, stat: "powerUps" },
  { id: "power_overflow", icon: "🌈", name: "Energieüberfluss", description: "Sammle 200 Power-ups in einem Einsatz", target: 200, reward: 55000, stat: "powerUps" },
  { id: "power_vault", icon: "🏦", name: "Power-Tresor", description: "Sammle 300 Power-ups in einem Einsatz", target: 300, reward: 75000, stat: "powerUps" },
  { id: "power_core", icon: "☀", name: "Lebender Reaktor", description: "Sammle 400 Power-ups in einem Einsatz", target: 400, reward: 100000, stat: "powerUps" },
  { id: "power_master", icon: "🪄", name: "Meister der Energie", description: "Sammle 500 Power-ups in einem Einsatz", target: 500, reward: 140000, stat: "powerUps" },
  { id: "power_infinite", icon: "♾", name: "Unendliche Energie", description: "Sammle 750 Power-ups in einem Einsatz", target: 750, reward: 200000, stat: "powerUps" },
  { id: "tough_hide", icon: "🩹", name: "Nur ein Kratzer", description: "Überstehe 5 Schadenspunkte in einem Einsatz", target: 5, reward: 750, stat: "damageTaken" },
  { id: "battle_worn", icon: "🪖", name: "Kampferprobt", description: "Überstehe 10 Schadenspunkte in einem Einsatz", target: 10, reward: 1500, stat: "damageTaken" },
  { id: "hard_to_kill", icon: "🛡", name: "Nicht kleinzukriegen", description: "Überstehe 20 Schadenspunkte in einem Einsatz", target: 20, reward: 3000, stat: "damageTaken" },
  { id: "iron_wings", icon: "🪽", name: "Eiserne Schwingen", description: "Überstehe 35 Schadenspunkte in einem Einsatz", target: 35, reward: 5500, stat: "damageTaken" },
  { id: "survivor", icon: "❤", name: "Überlebenskünstler", description: "Überstehe 50 Schadenspunkte in einem Einsatz", target: 50, reward: 8500, stat: "damageTaken" },
  { id: "scarred_veteran", icon: "🦿", name: "Narben des Krieges", description: "Überstehe 75 Schadenspunkte in einem Einsatz", target: 75, reward: 13000, stat: "damageTaken" },
  { id: "indestructible", icon: "💪", name: "Unzerstörbar", description: "Überstehe 100 Schadenspunkte in einem Einsatz", target: 100, reward: 20000, stat: "damageTaken" },
  { id: "flying_fortress", icon: "🏰", name: "Fliegende Festung", description: "Überstehe 150 Schadenspunkte in einem Einsatz", target: 150, reward: 32000, stat: "damageTaken" },
  { id: "damage_sponge", icon: "🔧", name: "Stahlgewitter überlebt", description: "Überstehe 200 Schadenspunkte in einem Einsatz", target: 200, reward: 50000, stat: "damageTaken" },
  { id: "phoenix", icon: "🔥", name: "Phönix", description: "Überstehe 300 Schadenspunkte in einem Einsatz", target: 300, reward: 80000, stat: "damageTaken" },
];
function loadAchievements(): string[] { try { return JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY) ?? "[]") as string[]; } catch { return []; } }
function saveAchievements(ids: string[]) { try { localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(ids)); } catch {} }
function saveHighScore(s: number) { try { if (s > loadHighScore()) localStorage.setItem(HS_KEY, String(s)); } catch {} }
function loadHighScore(): number  { try { return parseInt(localStorage.getItem(HS_KEY) ?? "0", 10) || 0; } catch { return 0; } }
function addCoins(n: number)      { try { localStorage.setItem(COINS_KEY, String(loadCoins() + n)); } catch {} }
function setCoinsAbsolute(n: number) { try { localStorage.setItem(COINS_KEY, String(n)); } catch {} }
function spendCoins(n: number)    { try { const c = loadCoins(); if (c >= n) localStorage.setItem(COINS_KEY, String(c - n)); } catch {} }
function loadCoins(): number      { try { return parseInt(localStorage.getItem(COINS_KEY) ?? "0", 10) || 0; } catch { return 0; } }
function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function canClaimDailyChest(): boolean {
  try { return localStorage.getItem(DAILY_CHEST_KEY) !== getLocalDateKey(); } catch { return false; }
}
function claimDailyChest(): boolean {
  if (!canClaimDailyChest()) return false;
  try {
    addCoins(DAILY_CHEST_REWARD);
    localStorage.setItem(DAILY_CHEST_KEY, getLocalDateKey());
    return true;
  } catch { return false; }
}
function saveSkin(id: string)     { try { localStorage.setItem(SKIN_KEY, id); } catch {} }
function loadSkin(): string       { try { return localStorage.getItem(SKIN_KEY) ?? "steel"; } catch { return "steel"; } }
function saveUltiSkin(id: string) { try { localStorage.setItem(ULTI_SKIN_KEY, id); } catch {} }
function loadUltiSkin(): string   { try { return localStorage.getItem(ULTI_SKIN_KEY) ?? loadSkin(); } catch { return loadSkin(); } }
function saveDroneSkin(id: string) { try { localStorage.setItem(DRONE_SKIN_KEY, id); } catch {} }
function loadDroneSkin(): string   { try { return localStorage.getItem(DRONE_SKIN_KEY) ?? "drone_violet"; } catch { return "drone_violet"; } }
function addUnlock(id: string)    { try { const u = loadUnlocks(); if (!u.includes(id)) localStorage.setItem(UNLOCKS_KEY, JSON.stringify([...u, id])); } catch {} }
function loadUnlocks(): string[]  { try { return JSON.parse(localStorage.getItem(UNLOCKS_KEY) ?? "[]") as string[]; } catch { return []; } }
function loadAircraftLevels(): Record<string, number> {
  try {
    const saved = JSON.parse(localStorage.getItem(AIRCRAFT_LEVELS_KEY) ?? "{}") as Record<string, number>;
    return Object.fromEntries(Object.entries(saved).map(([id, level]) => [id, getAircraftUpgradeStats(level).level]));
  } catch { return {}; }
}
function saveAircraftLevels(levels: Record<string, number>) { try { localStorage.setItem(AIRCRAFT_LEVELS_KEY, JSON.stringify(levels)); } catch {} }
function loadDroneLevels(): Record<string, number> {
  try {
    const saved = JSON.parse(localStorage.getItem(DRONE_LEVELS_KEY) ?? "{}") as Record<string, number>;
    return Object.fromEntries(Object.entries(saved).map(([id, level]) => [id, Math.max(1, Math.min(10, Math.floor(level))) ]));
  } catch { return {}; }
}
function saveDroneLevels(levels: Record<string, number>) { try { localStorage.setItem(DRONE_LEVELS_KEY, JSON.stringify(levels)); } catch {} }
function unlockAll()              { try { const all = [...JET_SKINS.map(s => s.id), ...DRONE_SKINS.map(s => s.id), ...SHOP_ITEMS.map(i => i.id)]; localStorage.setItem(UNLOCKS_KEY, JSON.stringify(all)); } catch {} }
function saveName(n: string)      { try { localStorage.setItem(NAME_KEY, n); } catch {} }
function loadName(): string       { try { return localStorage.getItem(NAME_KEY) ?? "Pilot"; } catch { return "Pilot"; } }
function saveBulletColor(c: string) { try { localStorage.setItem(BULLET_COLOR_KEY, c); } catch {} }
function loadBulletColor(): string  { try { return localStorage.getItem(BULLET_COLOR_KEY) ?? "#00ffff"; } catch { return "#00ffff"; } }
function loadSettings(): GameSettings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<GameSettings> }; }
  catch { return DEFAULT_SETTINGS; }
}
function saveSettings(settings: GameSettings) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {} }

function translated(language: GameSettings["language"], german: string, english: string) {
  return language === "de" ? german : english;
}
function tutorialSeen(): boolean { try { return localStorage.getItem(TUTORIAL_KEY) === "1"; } catch { return false; } }
function markTutorialSeen() { try { localStorage.setItem(TUTORIAL_KEY, "1"); } catch {} }
function briefingSeen(): boolean { try { return localStorage.getItem(BRIEFING_KEY) === "1"; } catch { return false; } }
function markBriefingSeen() { try { localStorage.setItem(BRIEFING_KEY, "1"); } catch {} }

const LEADERBOARD_KEY = "fighter-command-lb";
interface LeaderEntry { name: string; score: number; ts: number }
function addLeaderboardEntry(name: string, score: number) {
  try {
    const entries: LeaderEntry[] = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) ?? "[]");
    entries.push({ name: name || "Pilot", score, ts: Date.now() });
    entries.sort((a, b) => b.score - a.score);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {}
}
function loadLeaderboard(): LeaderEntry[] {
  try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) ?? "[]") as LeaderEntry[]; } catch { return []; }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function dist(a: Vec2, b: Vec2) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function rectHit(ax: number, ay: number, aw: number, ah: number,
                 bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────

function drawPlayerJet(ctx: CanvasRenderingContext2D, x: number, y: number, tier: number, shieldActive: boolean, skin?: JetSkin, shieldColor?: string) {
  ctx.save();
  ctx.translate(x + PLAYER_W / 2, y + PLAYER_H / 2);

  // ── TIE Fighter special skin ──
  if (skin?.id === "tiefighter") {
    const glow = skin.glow;
    const drawTieHex = (cy: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * 60 - 90) * Math.PI / 180;
        const px = -2 + 14 * Math.cos(a), py = cy + 14 * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = skin.body; ctx.fill();
      ctx.strokeStyle = skin.stroke; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = glow; ctx.lineWidth = 0.8;
      [-7, 0, 7].forEach(dy => { ctx.beginPath(); ctx.moveTo(-2 - 12, cy + dy); ctx.lineTo(-2 + 12, cy + dy); ctx.stroke(); });
      ctx.restore();
    };
    drawTieHex(-20); drawTieHex(20);
    ctx.strokeStyle = "#505060"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-2, -9); ctx.lineTo(-2, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, 9); ctx.lineTo(-2, 6); ctx.stroke();
    ctx.beginPath(); ctx.arc(-2, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#18181e"; ctx.fill(); ctx.strokeStyle = "#404450"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(-3, -1, 5, 0, Math.PI * 2);
    ctx.fillStyle = glow + "99"; ctx.fill();
    ctx.fillStyle = "#555566"; ctx.fillRect(8, -1.5, 14, 3);
    const rgTie = ctx.createRadialGradient(-2, 0, 1, -2, 0, 18);
    rgTie.addColorStop(0, glow + "66"); rgTie.addColorStop(1, "transparent");
    ctx.fillStyle = rgTie; ctx.beginPath(); ctx.arc(-2, 0, 18, 0, Math.PI * 2); ctx.fill();
    if (shieldActive) {
      ctx.beginPath(); ctx.arc(-2, 0, 32, 0, Math.PI * 2);
      ctx.strokeStyle = "#00ffff88"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#00ffff11"; ctx.fill();
    }
    ctx.restore(); return;
  }

  // ── N-1 Starfighter (Mandalorian) special skin ──
  if (skin?.id === "n1") {
    const glow = skin.glow;
    const rgN1 = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
    rgN1.addColorStop(0, glow + "44"); rgN1.addColorStop(1, "transparent");
    ctx.fillStyle = rgN1; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();

    // Broad swept wings are drawn behind the fuselage so the N-1 silhouette
    // remains readable at the small in-game scale.
    const drawN1Wing = (side: -1 | 1) => {
      ctx.beginPath();
      ctx.moveTo(9, side * 4);
      ctx.lineTo(-14, side * 22);
      ctx.lineTo(-28, side * 19);
      ctx.lineTo(-22, side * 8);
      ctx.closePath();
      ctx.fillStyle = "#596169";
      ctx.fill();
      ctx.strokeStyle = "#e2e7eb";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(2, side * 7);
      ctx.lineTo(-20, side * 17);
      ctx.strokeStyle = glow + "bb";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-13, side * 19, 7, 3.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#30363b";
      ctx.fill();
      ctx.strokeStyle = "#b9c2c9";
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    drawN1Wing(-1);
    drawN1Wing(1);

    ctx.beginPath();
    ctx.moveTo(30, 0); ctx.lineTo(10, -5); ctx.lineTo(-22, -6);
    ctx.lineTo(-30, -2); ctx.lineTo(-30, 2); ctx.lineTo(-22, 6); ctx.lineTo(10, 5); ctx.closePath();
    ctx.fillStyle = skin.body; ctx.fill(); ctx.strokeStyle = glow; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(12, 0, 9, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#77ddcc99"; ctx.fill(); ctx.strokeStyle = "#aaffee"; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = glow; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(24, -4); ctx.lineTo(2, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24, 4); ctx.lineTo(2, 4); ctx.stroke();
    ctx.beginPath(); ctx.arc(-6, -9, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#3355aa"; ctx.fill(); ctx.strokeStyle = "#aabbff"; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(-6, -9, 2, 0, Math.PI * 2); ctx.fillStyle = "#aabbff44"; ctx.fill();
    ctx.fillStyle = "#9aa2a9"; ctx.fillRect(28, -1.5, 12, 3);
    if (shieldActive) {
      const sc = shieldColor ?? "#cfd6dc";
      ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.strokeStyle = sc + "99"; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = sc + "11"; ctx.fill();
    }
    ctx.restore(); return;
  }

  // ── X-Wing special skin ──
  if (skin?.id === "xwing") {
    ctx.beginPath();
    ctx.moveTo(28,0); ctx.lineTo(-22,-8); ctx.lineTo(-28,-3); ctx.lineTo(-20,0); ctx.lineTo(-28,3); ctx.lineTo(-22,8);
    ctx.closePath(); ctx.fillStyle = "#303035"; ctx.fill(); ctx.strokeStyle = "#606070"; ctx.lineWidth = 1.5; ctx.stroke();
    const wingParts: [number,number,number,number,number,number,number,number][] = [
      [-4,-4, -24,-36, -30,-24, -18,-8],
      [-4, 4, -24, 36, -30, 24, -18, 8],
      [ 4,-4,  -6,-26, -16,-18,  -4,-6],
      [ 4, 4,  -6, 26, -16, 18,  -4, 6],
    ];
    wingParts.forEach(([x1,y1,x2,y2,x3,y3,x4,y4]) => {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.lineTo(x4,y4);
      ctx.closePath(); ctx.fillStyle = "#22222a"; ctx.fill(); ctx.strokeStyle = "#505060"; ctx.lineWidth = 1.5; ctx.stroke();
    });
    ctx.strokeStyle = "#cc2200"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-6,-18); ctx.lineTo(-18,-30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, 18); ctx.lineTo(-18, 30); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(8, 0, 9, 5, 0, 0, Math.PI*2);
    ctx.fillStyle = "#77aacc88"; ctx.fill(); ctx.strokeStyle = "#aaddff"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#888898";
    [[-26,-1.5],[-26,1.5],[-12,-1.5],[-12,1.5]].forEach(([gy]) => { ctx.fillRect(28, gy, 14, 2); });
    const rg = ctx.createRadialGradient(0,0,2,0,0,28);
    rg.addColorStop(0,"#ff220033"); rg.addColorStop(1,"transparent");
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0,0,28,0,Math.PI*2); ctx.fill();
    if (shieldActive) {
      ctx.beginPath(); ctx.arc(0,0,34,0,Math.PI*2);
      ctx.strokeStyle="#00ffff88"; ctx.lineWidth=2; ctx.stroke(); ctx.fillStyle="#00ffff11"; ctx.fill();
    }
    ctx.restore(); return;
  }

  // Engine glow
  const glowColors = ["#00cfff", "#00cfff", "#00ff88", "#ff9900", "#ff4444", "#ff00ff"];
  const glow = skin?.glow ?? glowColors[Math.min(tier, glowColors.length - 1)];
  const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 40);
  grad.addColorStop(0, glow + "55");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();

  // Body
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(-20, -10);
  ctx.lineTo(-28, -5);
  ctx.lineTo(-20, 0);
  ctx.lineTo(-28, 5);
  ctx.lineTo(-20, 10);
  ctx.closePath();
  ctx.fillStyle = skin?.body ?? "#1a2a4a";
  ctx.fill();
  ctx.strokeStyle = skin?.stroke ?? "#2a4a8a";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cockpit
  ctx.beginPath();
  ctx.ellipse(8, 0, 10, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = glow + "cc";
  ctx.fill();

  // Wing stripes per tier
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-14, -22); ctx.lineTo(-22, -10); ctx.closePath();
  ctx.fillStyle = skin?.body ?? "#162040"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-14, 22); ctx.lineTo(-22, 10); ctx.closePath();
  ctx.fillStyle = skin?.body ?? "#162040"; ctx.fill(); ctx.stroke();

  // Gun barrels
  const gunOffsets = [
    [],
    [0],
    [-8, 8],
    [-12, 0, 12],
    [-14, -5, 5, 14],
    [-14, -7, 0, 7, 14],
    [-15, -9, -3, 3, 9, 15],
    [-16, -10, -4, 0, 4, 10, 16],
  ];
  const offsets = gunOffsets[Math.min(tier, gunOffsets.length - 1)];
  offsets.forEach(oy => {
    ctx.beginPath();
    ctx.moveTo(28, oy - 1.5);
    ctx.lineTo(38, oy - 1.5);
    ctx.lineTo(38, oy + 1.5);
    ctx.lineTo(28, oy + 1.5);
    ctx.closePath();
    ctx.fillStyle = glow;
    ctx.fill();
  });

  // Shield
  if (shieldActive) {
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.strokeStyle = "#00ffff88";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#00ffff11";
    ctx.fill();
  }

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  ctx.save();
  ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
  ctx.rotate(Math.PI); // facing left

  switch (e.type) {
    case "scout": {
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-12, -8);
      ctx.lineTo(-18, -3);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-18, 3);
      ctx.lineTo(-12, 8);
      ctx.closePath();
      ctx.fillStyle = "#3a0a0a";
      ctx.fill();
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath(); ctx.ellipse(4, 0, 7, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = e.color + "99"; ctx.fill();
      break;
    }
    case "fighter": {
      ctx.beginPath();
      ctx.moveTo(24, 0); ctx.lineTo(-16, -12); ctx.lineTo(-22, -5); ctx.lineTo(-14, 0);
      ctx.lineTo(-22, 5); ctx.lineTo(-16, 12); ctx.closePath();
      ctx.fillStyle = "#1a1a00";
      ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(-16, -24); ctx.lineTo(-22, -12); ctx.closePath();
      ctx.fillStyle = "#0a0a00"; ctx.fill(); ctx.strokeStyle = e.color; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 12); ctx.lineTo(-16, 24); ctx.lineTo(-22, 12); ctx.closePath();
      ctx.fillStyle = "#0a0a00"; ctx.fill(); ctx.strokeStyle = e.color; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(6, 0, 9, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = e.color + "99"; ctx.fill();
      break;
    }
    case "bomber": {
      ctx.beginPath();
      ctx.moveTo(18, 0); ctx.lineTo(-10, -18); ctx.lineTo(-28, -10); ctx.lineTo(-20, 0);
      ctx.lineTo(-28, 10); ctx.lineTo(-10, 18); ctx.closePath();
      ctx.fillStyle = "#0a1a00";
      ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = e.color + "99"; ctx.fill();
      break;
    }
    case "boss": {
      ctx.beginPath();
      ctx.moveTo(40, 0); ctx.lineTo(-20, -28); ctx.lineTo(-36, -14); ctx.lineTo(-24, 0);
      ctx.lineTo(-36, 14); ctx.lineTo(-20, 28); ctx.closePath();
      ctx.fillStyle = "#1a001a";
      ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -28); ctx.lineTo(-24, -44); ctx.lineTo(-36, -28); ctx.closePath();
      ctx.fillStyle = "#100010"; ctx.fill(); ctx.strokeStyle = e.color; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 28); ctx.lineTo(-24, 44); ctx.lineTo(-36, 28); ctx.closePath();
      ctx.fillStyle = "#100010"; ctx.fill(); ctx.strokeStyle = e.color; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(8, 0, 14, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = e.color + "bb"; ctx.fill();
      // HP bar
      const barW = 64, barH = 6;
      ctx.fillStyle = "#333";
      ctx.fillRect(-barW / 2, -e.height / 2 - 16, barW, barH);
      ctx.fillStyle = e.color;
      ctx.fillRect(-barW / 2, -e.height / 2 - 16, barW * (e.hp / e.maxHp), barH);
      break;
    }
    case "overlord": {
      const pulse = 0.75 + Math.sin(performance.now() * 0.008) * 0.25;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 18 + pulse * 12;
      // Broad armored silhouette with split wings and a glowing reactor core.
      ctx.beginPath();
      ctx.moveTo(52, 0); ctx.lineTo(18, -18); ctx.lineTo(-8, -42); ctx.lineTo(-46, -48);
      ctx.lineTo(-34, -20); ctx.lineTo(-58, -10); ctx.lineTo(-40, 0);
      ctx.lineTo(-58, 10); ctx.lineTo(-34, 20); ctx.lineTo(-46, 48);
      ctx.lineTo(-8, 42); ctx.lineTo(18, 18); ctx.closePath();
      const hull = ctx.createLinearGradient(-58, 0, 52, 0);
      hull.addColorStop(0, "#050914"); hull.addColorStop(.55, "#16233b"); hull.addColorStop(1, "#09030f");
      ctx.fillStyle = hull; ctx.fill();
      ctx.strokeStyle = e.color; ctx.lineWidth = 3; ctx.stroke();
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "#7eeaff"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(29, 0); ctx.lineTo(-22, -31); ctx.lineTo(-43, -35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(29, 0); ctx.lineTo(-22, 31); ctx.lineTo(-43, 35); ctx.stroke();
      ctx.beginPath(); ctx.arc(10, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,70,190,${.55 + pulse * .35})`; ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(10, 0, 6 + pulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff"; ctx.fill();
      // Three forward weapon ports telegraph its spread and special attack.
      [-18, 0, 18].forEach(offset => {
        ctx.beginPath(); ctx.arc(34, offset, 4, 0, Math.PI * 2);
        ctx.fillStyle = offset === 0 ? "#ff4fc8" : "#6fe9ff"; ctx.fill();
      });
      ctx.shadowBlur = 0;
      const barW = 92, barH = 7;
      ctx.fillStyle = "#170d20"; ctx.fillRect(-barW / 2, -e.height / 2 - 17, barW, barH);
      ctx.fillStyle = e.color; ctx.fillRect(-barW / 2, -e.height / 2 - 17, barW * (e.hp / e.maxHp), barH);
      ctx.strokeStyle = "#ffffff88"; ctx.lineWidth = 1; ctx.strokeRect(-barW / 2, -e.height / 2 - 17, barW, barH);
      break;
    }
    case "interceptor": {
      ctx.beginPath();
      ctx.moveTo(18,0); ctx.lineTo(-10,-6); ctx.lineTo(-16,-2); ctx.lineTo(-8,0); ctx.lineTo(-16,2); ctx.lineTo(-10,6);
      ctx.closePath(); ctx.fillStyle="#001a1a"; ctx.fill(); ctx.strokeStyle=e.color; ctx.lineWidth=1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(-10,-14); ctx.lineTo(-14,-6); ctx.closePath();
      ctx.fillStyle="#001010"; ctx.fill(); ctx.strokeStyle=e.color; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(-10,14); ctx.lineTo(-14,6); ctx.closePath();
      ctx.fillStyle="#001010"; ctx.fill(); ctx.strokeStyle=e.color; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(2,0,5,3,0,0,Math.PI*2); ctx.fillStyle=e.color+"99"; ctx.fill();
      break;
    }
    case "plasmawing": {
      ctx.beginPath();
      ctx.moveTo(22, 0); ctx.lineTo(-8, -7); ctx.lineTo(-24, -19); ctx.lineTo(-17, -3);
      ctx.lineTo(-17, 3); ctx.lineTo(-24, 19); ctx.lineTo(-8, 7); ctx.closePath();
      ctx.fillStyle = "#160022"; ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(3, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff"; ctx.shadowColor = e.color; ctx.shadowBlur = 14; ctx.fill();
      break;
    }
    case "sentinel": {
      ctx.beginPath();
      ctx.moveTo(20, 0); ctx.lineTo(5, -17); ctx.lineTo(-18, -17); ctx.lineTo(-27, 0);
      ctx.lineTo(-18, 17); ctx.lineTo(5, 17); ctx.closePath();
      ctx.fillStyle = "#071522"; ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.rect(-12, -8, 18, 16); ctx.fillStyle = e.color + "66"; ctx.fill();
      if ((e.shieldHp ?? 0) > 0) {
        ctx.beginPath(); ctx.arc(-2, 0, 29, 0, Math.PI * 2);
        ctx.strokeStyle = "#66ddff88"; ctx.lineWidth = 2; ctx.stroke();
      }
      break;
    }
    case "gunship": {
      ctx.beginPath();
      ctx.moveTo(22,0); ctx.lineTo(-14,-20); ctx.lineTo(-32,-12); ctx.lineTo(-22,0); ctx.lineTo(-32,12); ctx.lineTo(-14,20);
      ctx.closePath(); ctx.fillStyle="#1a0a00"; ctx.fill(); ctx.strokeStyle=e.color; ctx.lineWidth=2.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(4,0,8,5,0,0,Math.PI*2); ctx.fillStyle=e.color+"99"; ctx.fill();
      const bW=e.width*0.8,bH=4;
      ctx.fillStyle="#333"; ctx.fillRect(-bW/2,-e.height/2-8,bW,bH);
      ctx.fillStyle=e.color; ctx.fillRect(-bW/2,-e.height/2-8,bW*(e.hp/e.maxHp),bH);
      break;
    }
    case "tiefighter":
    case "emeraldtiefighter": {
      const tg = e.color;
      if (e.type === "emeraldtiefighter") {
        ctx.shadowColor = tg;
        ctx.shadowBlur = 12 + Math.sin(performance.now() * 0.006) * 5;
      }
      const drawEnemyHex = (cy: number) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * 60 - 90) * Math.PI / 180;
          const px = -2 + 12 * Math.cos(a), py = cy + 12 * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = "#0a0a12"; ctx.fill(); ctx.strokeStyle = tg; ctx.lineWidth = 1.5; ctx.stroke();
      };
      drawEnemyHex(-16); drawEnemyHex(16);
      ctx.strokeStyle = tg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-2, -7); ctx.lineTo(-2, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, 7); ctx.lineTo(-2, 4); ctx.stroke();
      ctx.beginPath(); ctx.arc(-2, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#12121a"; ctx.fill(); ctx.strokeStyle = tg; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(-3, -1, 4, 0, Math.PI * 2);
      ctx.fillStyle = tg + "88"; ctx.fill();
      if ((e.shieldHp ?? 0) > 0) {
        ctx.beginPath();
        ctx.arc(-2, 0, 27, 0, Math.PI * 2);
        ctx.strokeStyle = "#88ddff99";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#88ddff12";
        ctx.fill();
      }
      break;
    }
  }

  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
  ctx.save();
  if (b.isMissile && b.trackPlayer) {
    // Enemy homing missile — magenta/purple
    ctx.translate(b.x, b.y);
    const ang = Math.atan2(b.vy, b.vx);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(12, 0); ctx.lineTo(-6, -5); ctx.lineTo(-4, 0); ctx.lineTo(-6, 5); ctx.closePath();
    ctx.fillStyle = "#dd00ff"; ctx.fill();
    ctx.shadowColor = "#aa00ff"; ctx.shadowBlur = 10;
    ctx.fill();
    ctx.beginPath(); ctx.arc(-9, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#88008888"; ctx.fill();
  } else if (b.isMissile) {
    ctx.translate(b.x, b.y);
    const ang = Math.atan2(b.vy, b.vx);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(12, 0); ctx.lineTo(-6, -4); ctx.lineTo(-4, 0); ctx.lineTo(-6, 4); ctx.closePath();
    ctx.fillStyle = "#ff6600"; ctx.fill();
    ctx.beginPath(); ctx.arc(-8, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ff330088"; ctx.fill();
  } else if (b.fromPlayer) {
    const bc = b.color ?? "#00ffff";
    ctx.beginPath();
    ctx.rect(b.x - 2, b.y - 2, 14, 4);
    ctx.fillStyle = bc;
    ctx.shadowColor = bc; ctx.shadowBlur = 8;
    ctx.fill();
  } else {
    const bc = b.color ?? "#ff4444";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = bc;
    ctx.shadowColor = bc; ctx.shadowBlur = 6;
    ctx.fill();
  }
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const alpha = p.life / p.maxLife;
  if (alpha <= 0) return;
  const radius = Math.max(0.1, p.radius * alpha);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = p.color;
  ctx.fill();
  ctx.restore();
}

function drawCombatDrone(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, skin: DroneSkin = DRONE_SKINS[0]) {
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 0.08) * 4);
  ctx.shadowColor = skin.stroke; ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(16, 0); ctx.lineTo(2, -8); ctx.lineTo(-13, -5); ctx.lineTo(-18, 0); ctx.lineTo(-13, 5); ctx.lineTo(2, 8); ctx.closePath();
  ctx.fillStyle = skin.body; ctx.fill(); ctx.strokeStyle = skin.stroke; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(3, 0, 4, 0, Math.PI * 2); ctx.fillStyle = skin.core; ctx.fill();
  ctx.fillStyle = skin.stroke; ctx.fillRect(13, -1.5, 10, 3);
  const glow = ctx.createRadialGradient(-16, 0, 1, -16, 0, 12);
  glow.addColorStop(0, skin.stroke + "aa"); glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(-16, 0, 12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function spawnExplosion(particles: Particle[], x: number, y: number, big: boolean) {
  const count = big ? 40 : 16;
  const colors = ["#ff9900", "#ff4400", "#ffcc00", "#ffffff", "#ff6600"];
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(big ? 1 : 0.5, big ? 6 : 3);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(20, 45), maxLife: 45,
      color: colors[Math.floor(rand(0, colors.length))],
      radius: rand(2, big ? 6 : 3),
    });
  }
}

// Small synthesizer: keeps the game self-contained without external audio files.
class GameAudio {
  context: AudioContext | null = null;
  musicTimer = 0;
  musicStep = 0;
  unlock(): Promise<boolean> {
    try {
      this.context ??= new AudioContext();
    } catch {
      return Promise.resolve(false);
    }
    if (this.context.state === "running") return Promise.resolve(true);
    if (this.context.state === "closed") return Promise.resolve(false);
    return this.context.resume().then(() => this.context?.state === "running").catch(() => false);
  }
  private playTone(ac: AudioContext, frequency: number, duration: number, volume: number, type: OscillatorType, slide: number) {
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, ac.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), ac.currentTime + duration);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    osc.connect(gain); gain.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + duration);
  }
  tone(frequency: number, duration: number, volume: number, type: OscillatorType = "square", slide = 0) {
    if (volume <= 0) return;
    void this.unlock().then(ready => {
      const ac = this.context;
      if (ready && ac) this.playTone(ac, frequency, duration, volume, type, slide);
    });
  }
  effect(kind: "hit" | "explosion" | "pickup" | "boss" | "upgrade", volume: number) {
    const map = { hit: [150, .07, "sawtooth", -70], explosion: [90, .28, "sawtooth", -50], pickup: [620, .16, "sine", 500], boss: [55, .7, "sawtooth", -20], upgrade: [440, .35, "triangle", 440] } as const;
    const [f, d, t, s] = map[kind]; this.tone(f, d, volume * .35, t, s);
  }
  updateMusic(level: number, volume: number, dtScale: number) {
    if (volume <= 0) return;
    this.musicTimer -= dtScale;
    if (this.musicTimer > 0) return;
    this.musicTimer = level >= 50 ? 18 : level >= 20 ? 23 : 28;

    // Minor, open intervals make the procedural soundtrack feel spacious
    // instead of resembling a conventional arcade pulse.
    const sequences = level >= 50
      ? [110, 164.81, 220, 261.63, 329.63, 261.63, 220, 164.81]
      : level >= 20
        ? [98, 146.83, 196, 246.94, 293.66, 246.94, 196, 146.83]
        : [82.41, 123.47, 164.81, 220, 246.94, 220, 164.81, 123.47];
    const step = this.musicStep++;
    const note = sequences[step % sequences.length];

    // Soft arpeggio, slow sub-space drone and a sparse stellar shimmer.
    this.tone(note, .55, volume * .22, "triangle", note * .015);
    if (step % 4 === 0) this.tone(sequences[0] / 2, 2.2, volume * .12, "sine", -2);
    if (step % 8 === 6) this.tone(note * 4, .7, volume * .055, "sine", note * .3);
  }
}

// ─── Main Game Component ──────────────────────────────────────────────────────

export default function Game() {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>({
    score: 0, level: 1, hp: 10, maxHp: 10,
    shield: 0, speed: 3.2, weaponTier: 0,
    lives: 3, gameOver: false, started: false, paused: false,
  });
  const [displayState, setDisplayState] = useState({ ...stateRef.current });
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const lastFireRef = useRef(0);
  const lastDroneFireRef = useRef(0);
  const lastMissileRef = useRef(0);
  const playerRef = useRef({ x: 60, y: CANVAS_H / 2 - PLAYER_H / 2 });
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const enemySpawnTimerRef = useRef(0);
  const timeRef = useRef(0);
  const displaySyncTimerRef = useRef(0);
  const shieldTimerRef = useRef(0);
  const invincibleRef = useRef(0);
  const movementStunRef = useRef(0);

  // ── Touch / virtual controls ──
  const joystickRef = useRef({ active: false, id: -1, centerX: 0, centerY: 0, curX: 0, curY: 0 });
  const touchFireRef = useRef({ active: false, id: -1 });
  const showVirtualControlsRef = useRef(false);

  // ── Ultima ──
  const ultimaChargeRef = useRef(0);
  const ultimaActiveRef = useRef(0);
  const laserChargeRef = useRef(0);
  const laserActiveRef = useRef(0);

  // ── City background ──
  const cityFarRef  = useRef<Building[]>([]);
  const cityNearRef = useRef<Building[]>([]);

  // ── Checkpoint save tracking ──
  const saveExistsRef = useRef(!!loadSave());
  const milestoneBossFiredRef = useRef<Set<number>>(new Set());
  const gameOverCountdownRef = useRef(0);
  const activeSkinRef = useRef<JetSkin>(JET_SKINS.find(s => s.id === loadSkin()) ?? JET_SKINS[0]);
  const activeUltiSkinRef = useRef<JetSkin>(JET_SKINS.find(s => s.id === loadUltiSkin()) ?? JET_SKINS[0]);
  const activeDroneSkinRef = useRef<DroneSkin>(DRONE_SKINS.find(s => s.id === loadDroneSkin()) ?? DRONE_SKINS[0]);
  const activeUnlocksRef = useRef<string[]>([]);
  const stealthChargeRef = useRef(0);
  const stealthActiveRef = useRef(0);
  const healChargeRef = useRef(0);
  const healActiveRef = useRef(0);
  const ultimateChargeRef = useRef(0);
  const ultimateActiveRef = useRef(0);
  const speedBoostRef = useRef(0);
  const n1ShieldTimerRef = useRef(0);
  const playerShieldHpRef = useRef(0);
  const bestScoreRef = useRef(loadHighScore());
  const activeBulletColorRef = useRef(loadBulletColor());
  const playerNameRef = useRef(loadName());
  const [selectedSkin, setSelectedSkin] = useState(() => loadSkin());
  const [selectedUltiSkin, setSelectedUltiSkin] = useState(() => loadUltiSkin());
  const [selectedDroneSkin, setSelectedDroneSkin] = useState(() => loadDroneSkin());
  const [coins, setCoins] = useState(() => loadCoins());
  const [aircraftLevels, setAircraftLevels] = useState<Record<string, number>>(() => loadAircraftLevels());
  const [droneLevels, setDroneLevels] = useState<Record<string, number>>(() => loadDroneLevels());
  const aircraftUpgradeRef = useRef(getAircraftUpgradeStats(loadAircraftLevels()[loadSkin()] ?? 1));
  const droneLevelRef = useRef(loadDroneLevels()[loadDroneSkin()] ?? 1);
  const [highScore, setHighScore] = useState(() => loadHighScore());
  const [unlockedItems, setUnlockedItems] = useState<string[]>(() => loadUnlocks());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const settingsRef = useRef(settings);
  const language = settings.language;
  const [pauseView, setPauseView] = useState<"menu" | "settings">("menu");
  const [tutorialStage, setTutorialStage] = useState(-1);
  const audioRef = useRef(new GameAudio());
  const runUpgradesRef = useRef<Record<RunUpgradeId, number>>({ rapid_fire: 0, damage: 0, max_hp: 0, drone: 0, critical: 0, shield: 0 });
  const runStatsRef = useRef<RunStats>({ kills: 0, bosses: 0, damageTaken: 0, powerUps: 0 });
  const [runUpgradeChoices, setRunUpgradeChoices] = useState<RunUpgrade[]>([]);
  const upgradeLevelRef = useRef(0);
  const [achievementToast, setAchievementToast] = useState<Achievement | null>(null);
  const [achievements, setAchievements] = useState<string[]>(() => loadAchievements());
  const tutorialStageRef = useRef(-1);
  const [fullscreenSupported] = useState(() => {
    const root = document.documentElement as FullscreenElement;
    return Boolean(root.requestFullscreen || root.webkitRequestFullscreen);
  });

  const syncDisplay = useCallback(() => {
    setDisplayState({ ...stateRef.current });
    setHighScore(loadHighScore());
  }, []);

  const updateSettings = useCallback((next: GameSettings) => {
    const previous = settingsRef.current;
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
    // Range input events are trusted gestures, so they are also a reliable way
    // to unlock Web Audio and give immediate feedback for both volume controls.
    if (next.musicVolume !== previous.musicVolume && next.musicVolume > 0) {
      audioRef.current.tone(147, .3, next.musicVolume * .3, "triangle");
    } else if (next.soundVolume !== previous.soundVolume && next.soundVolume > 0) {
      audioRef.current.effect("pickup", next.soundVolume);
    }
  }, []);

  const checkAchievements = useCallback(() => {
    const owned = loadAchievements();
    const unlocked = ACHIEVEMENTS.find(a => !owned.includes(a.id) && runStatsRef.current[a.stat] >= a.target);
    if (!unlocked) return;
    const next = [...owned, unlocked.id];
    saveAchievements(next); addCoins(unlocked.reward); setAchievements(next); setCoins(loadCoins());
    setAchievementToast(unlocked); audioRef.current.effect("upgrade", settingsRef.current.soundVolume);
    window.setTimeout(() => setAchievementToast(current => current?.id === unlocked.id ? null : current), 3500);
  }, []);

  const chooseRunUpgrade = useCallback((upgrade: RunUpgrade) => {
    runUpgradesRef.current[upgrade.id] += 1;
    if (upgrade.id === "max_hp") { stateRef.current.maxHp += 3; stateRef.current.hp = stateRef.current.maxHp; }
    if (upgrade.id === "shield") { shieldTimerRef.current = 600; playerShieldHpRef.current = PLAYER_SHIELD_HP; }
    saveGame(stateRef.current, runUpgradesRef.current, upgradeLevelRef.current);
    saveExistsRef.current = true;
    setRunUpgradeChoices([]); stateRef.current.paused = false; audioRef.current.effect("upgrade", settingsRef.current.soundVolume); syncDisplay();
  }, [syncDisplay]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translated(language, "Fighter Command", "Fighter Command");
  }, [language]);

  useEffect(() => {
    // Browsers only allow Web Audio to start during a trusted user gesture.
    // Capture all supported controls so mouse, touch and keyboard starts work.
    const unlockAudio = () => audioRef.current.unlock();
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  const finishTutorial = useCallback(() => {
    tutorialStageRef.current = -1;
    setTutorialStage(-1);
    markTutorialSeen();
  }, []);

  useEffect(() => {
    const fullscreenDocument = document as FullscreenDocument;
    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || fullscreenDocument.webkitFullscreenElement));
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);
    syncFullscreen();
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const fullscreenDocument = document as FullscreenDocument;
    const active = document.fullscreenElement || fullscreenDocument.webkitFullscreenElement;

    try {
      if (active) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else await fullscreenDocument.webkitExitFullscreen?.();
      } else {
        const shell = shellRef.current as FullscreenElement | null;
        if (shell?.requestFullscreen) await shell.requestFullscreen();
        else await shell?.webkitRequestFullscreen?.();
      }
    } catch {
      // Browsers may reject fullscreen when device or embedding policy forbids it.
    }
  }, []);

  const initStars = useCallback(() => {
    starsRef.current = Array.from({ length: 120 }, () => ({
      x: rand(0, CANVAS_W),
      y: rand(0, CANVAS_H),
      speed: rand(0.3, 2),
      brightness: rand(0.4, 1),
      size: rand(0.5, 2),
    }));
  }, []);

  const initCity = useCallback(() => {
    const genLayer = (count: number, minH: number, maxH: number, minW: number, maxW: number): Building[] => {
      const out: Building[] = [];
      let cx = 0;
      for (let i = 0; i < count; i++) {
        const w = Math.floor(rand(minW, maxW));
        const h = Math.floor(rand(minH, maxH));
        const wins: Building["windows"] = [];
        for (let r = 0; r < Math.floor(h / 22); r++)
          for (let c = 0; c < Math.floor(w / 16); c++)
            wins.push({ wx: 5 + c * 16, wy: 6 + r * 22, lit: Math.random() < 0.35 });
        out.push({ x: cx, width: w, height: h, windows: wins });
        cx += w + 10;
      }
      return out;
    };
    cityFarRef.current  = genLayer(30, 50, 130, 28, 65);
    cityNearRef.current = genLayer(20, 100, 210, 44, 100);
  }, []);

  const spawnEnemy = useCallback((level: number) => {
    const roll = Math.random();
    let type: Enemy["type"] = "scout";
    let hp = 1, w = 40, h = 20, vx = -rand(1.5, 3), pts = 10, color = "#ff4444";
    const bossInterval = Math.max(220, 1200 - level * 60);
    const isBossLevel = level >= 3 && isBossEligibleLevel(level) && timeRef.current % bossInterval < 5;
    const bossHpBase = (25 + level * 6) * (level >= 8 ? 5 : level >= 5 ? 3 : 1);

    if (isBossLevel && enemiesRef.current.filter(isBossEnemy).length === 0) {
      const isSuperBoss = level >= 12 && timeRef.current % (bossInterval * 4) < 5;
      type = "boss";
      hp   = isSuperBoss ? bossHpBase * 3 : bossHpBase;
      w    = isSuperBoss ? 130 : 90;
      h    = isSuperBoss ? 102 : 68;
      vx   = isSuperBoss ? -rand(0.4, 0.9) : -rand(0.6, 1.2);
      pts  = isSuperBoss ? 600 : 100;
      color = isSuperBoss ? "#ff00cc" : "#cc00ff";
    } else if (level >= 7 && roll < 0.10) {
      type = "gunship"; hp = 8 + level * 2; w = 64; h = 46; vx = -rand(0.5, 1.0); pts = 80; color = "#ff6600";
    } else if (level >= 12 && roll < 0.15) {
      type = "emeraldtiefighter"; hp = 12; w = 48; h = 44; vx = -rand(2.0, 3.2); pts = 90; color = "#39ff88";
    } else if (level >= 8 && roll < 0.20) {
      type = "sentinel"; hp = 10 + level; w = 58; h = 42; vx = -rand(0.7, 1.2); pts = 75; color = "#55bbff";
    } else if (level >= 10 && roll < 0.32) {
      type = "tiefighter"; hp = 5; w = 42; h = 38; vx = -rand(2.0, 3.2); pts = 45; color = "#0099ff";
    } else if (level >= 3 && roll < 0.44) {
      type = "plasmawing"; hp = 2 + Math.floor(level / 3); w = 46; h = 34; vx = -rand(2.4, 3.8); pts = 35; color = "#cc55ff";
    } else if (level >= 5 && roll < 0.55) {
      type = "interceptor"; hp = 1; w = 36; h = 22; vx = -rand(3.5, 5.5); pts = 20; color = "#00ffcc";
    } else if (level >= 4 && roll < 0.68) {
      type = "bomber"; hp = 4 + level; w = 56; h = 40; vx = -rand(0.8, 1.5); pts = 60; color = "#44ff44";
    } else if (level >= 2 && roll < 0.84) {
      type = "fighter"; hp = 2 + Math.floor(level / 2); w = 48; h = 28; vx = -rand(1.8, 3.2); pts = 30; color = "#ffcc00";
    }

    // After level 5 enemies award bonus score so levels go faster
    if (level > 5) pts = Math.round(pts * (1 + (level - 5) * 0.18));

    const y = rand(20, CANVAS_H - h - 20);
    const enemy: Enemy = {
      x: CANVAS_W + 20, y,
      vx, vy: 0,
      hp, maxHp: hp,
      width: w, height: h,
      type,
      shootCooldown: type === "plasmawing" ? rand(35, 55) : type === "emeraldtiefighter" ? rand(80, 120) : type === "tiefighter" ? rand(40, 60) : rand(60, 120),
      points: pts, color,
      angle: 0,
      oscillate: type === "plasmawing" ? 1.6 : type === "scout" ? rand(-0.4, 0.4) : 0,
      shieldHp: type === "sentinel" ? 6 : type === "emeraldtiefighter" ? 4 : type === "tiefighter" ? 2 : 0,
      bossAge: type === "boss" ? 0 : undefined,
    };
    enemiesRef.current.push(enemy);

    if (type === "emeraldtiefighter") {
      const pairOffset = y < CANVAS_H / 2 ? 58 : -58;
      enemiesRef.current.push({
        ...enemy,
        x: enemy.x + 64,
        y: clamp(enemy.y + pairOffset, 20, CANVAS_H - h - 20),
        shootCooldown: rand(80, 120),
      });
    }
  }, []);

  const fireBullets = useCallback((now: number) => {
    const gs = stateRef.current;
    const tier = WEAPON_TIERS[gs.weaponTier];
    const persistentDroneUpgrades = [
      "drone_mk2", "drone_mk3", "drone_mk4", "drone_mk5",
      "drone_mk6", "drone_mk7", "drone_mk8",
    ]
      .filter(id => activeUnlocksRef.current.includes(id)).length;
    const drone = getDroneStats(persistentDroneUpgrades + droneLevelRef.current - 1, runUpgradesRef.current.drone);
    const droneFireRate = 280 * drone.fireRateMultiplier;

    if (now - lastDroneFireRef.current >= droneFireRate) {
      lastDroneFireRef.current = now;
      const droneX = playerRef.current.x + PLAYER_W / 2;
      const droneY = clamp(playerRef.current.y - 30, 22, CANVAS_H - 22) + Math.sin(timeRef.current * 0.08) * 4;
      const offsets = drone.guns === 3 ? [-7, 0, 7] : drone.guns === 2 ? [-4, 4] : [0];
      offsets.forEach(offset => bulletsRef.current.push({
        x: droneX + 22,
        y: droneY + offset,
        vx: BASE_BULLET_SPEED,
        vy: 0,
        fromPlayer: true,
        damage: drone.damage + runUpgradesRef.current.damage,
        color: "#b86cff",
      }));
    }

    const aircraftUltiFireRate = ultimaActiveRef.current > 0 && ["gold", "crimson"].includes(activeUltiSkinRef.current.id) ? 0.45 : 1;
    const fireRate = tier.fireRate * Math.pow(0.8, runUpgradesRef.current.rapid_fire) * aircraftUpgradeRef.current.fireRateMultiplier * aircraftUltiFireRate;
    if (now - lastFireRef.current < fireRate) return;
    lastFireRef.current = now;
    const px = playerRef.current.x + PLAYER_W;
    const py = playerRef.current.y + PLAYER_H / 2;

    const gunOffsets: number[][] = [
      [0], [-8, 8], [-12, 0, 12], [-14, -5, 5, 14], [-14, -7, 0, 7, 14],
      [-15, -9, -3, 3, 9, 15], [-16, -10, -4, 0, 4, 10, 16],
    ];
    const offsets = gunOffsets[Math.min(tier.guns - 1, gunOffsets.length - 1)];

    offsets.forEach((oy, i) => {
      let vx = BASE_BULLET_SPEED;
      let vy = 0;
      if (tier.spread && offsets.length > 1) {
        const spread = (i - (offsets.length - 1) / 2) * 0.12;
        vy = spread * BASE_BULLET_SPEED;
      }
      bulletsRef.current.push({
        x: px, y: py + oy,
        vx, vy,
        fromPlayer: true,
        damage: tier.bulletDmg + runUpgradesRef.current.damage + aircraftUpgradeRef.current.damageBonus,
        color: activeBulletColorRef.current,
      });
    });
    // Summoned wingmen fire during the X-Wing, TIE and N-1 aircraft ultimates.
    if (ultimaActiveRef.current > 0 && ["xwing", "tiefighter", "n1"].includes(activeUltiSkinRef.current.id)) {
      const wingmen = activeUltiSkinRef.current.id === "tiefighter" ? [-72, -36, 36, 72] : [-50, 50];
      wingmen.forEach(wingOffset => offsets.forEach((oy, i) => {
        let cvx = BASE_BULLET_SPEED;
        let cvy = 0;
        if (tier.spread && offsets.length > 1) {
          const spread = (i - (offsets.length - 1) / 2) * 0.12;
          cvy = spread * BASE_BULLET_SPEED;
        }
        const wingY = clamp(playerRef.current.y + PLAYER_H / 2 + wingOffset, PLAYER_H, CANVAS_H - PLAYER_H);
        bulletsRef.current.push({ x: px, y: wingY + oy, vx: cvx, vy: cvy, fromPlayer: true, damage: tier.bulletDmg + aircraftUpgradeRef.current.damageBonus, color: activeBulletColorRef.current });
      }));
    }

    // Missiles
    if (tier.missile && now - lastMissileRef.current > 1800) {
      lastMissileRef.current = now;
      const target = enemiesRef.current[0] ?? null;
      bulletsRef.current.push({
        x: px, y: py,
        vx: 7, vy: 0,
        fromPlayer: true, damage: 4 + aircraftUpgradeRef.current.damageBonus,
        isMissile: true, missileTarget: target,
      });
    }
  }, []);

  const startGame = useCallback((fromSave = false) => {
    audioRef.current.unlock();
    const save = fromSave ? loadSave() : null;
    const unlocks = loadUnlocks();
    const aircraftStats = getAircraftUpgradeStats(loadAircraftLevels()[loadSkin()] ?? 1);
    droneLevelRef.current = loadDroneLevels()[loadDroneSkin()] ?? 1;
    const savedAircraftStats = getAircraftUpgradeStats(save?.aircraftLevel ?? 1);
    aircraftUpgradeRef.current = aircraftStats;
    activeUnlocksRef.current = unlocks;
    activeBulletColorRef.current = loadBulletColor();
    playerNameRef.current = loadName();
    stealthChargeRef.current = 0;
    stealthActiveRef.current = 0;
    healChargeRef.current = 0;
    healActiveRef.current = 0;
    ultimateChargeRef.current = 0;
    ultimateActiveRef.current = 0;
    speedBoostRef.current = 0;
    n1ShieldTimerRef.current = 0;
    playerShieldHpRef.current = 0;
    bestScoreRef.current = loadHighScore();
    runUpgradesRef.current = save?.runUpgrades
      ? { ...EMPTY_RUN_UPGRADES, ...save.runUpgrades }
      : { ...EMPTY_RUN_UPGRADES };
    runStatsRef.current = { kills: 0, bosses: 0, damageTaken: 0, powerUps: 0 };
    upgradeLevelRef.current = save?.upgradeLevel ?? 0;
    setRunUpgradeChoices([]);
    const baseMaxHp = (unlocks.includes("max_hp") ? 15 : 10) + aircraftStats.maxHpBonus;
    const baseSpeed = 3.2 + (unlocks.includes("speed_item") ? 0.5 : 0) + aircraftStats.speedBonus;
    stateRef.current = {
      score:      save?.score  ?? 0,
      level:      save?.level  ?? 1,
      hp:         save ? Math.min(save.hp + aircraftStats.maxHpBonus - savedAircraftStats.maxHpBonus, save.maxHp + aircraftStats.maxHpBonus - savedAircraftStats.maxHpBonus) : baseMaxHp,
      maxHp:      save ? save.maxHp + aircraftStats.maxHpBonus - savedAircraftStats.maxHpBonus : baseMaxHp,
      shield:     0,
      speed:      save ? save.speed + aircraftStats.speedBonus - savedAircraftStats.speedBonus : baseSpeed,
      weaponTier: fromSave ? (save?.weaponTier ?? 0) : (unlocks.includes("weapon_head") ? 2 : 0),
      lives:      save?.lives  ?? (unlocks.includes("extra_life") ? 4 : 3),
      gameOver: false, started: true, paused: false,
    };
    playerRef.current = { x: 60, y: CANVAS_H / 2 - PLAYER_H / 2 };
    bulletsRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    enemySpawnTimerRef.current = 0;
    timeRef.current = 0;
    lastFireRef.current = 0;
    lastDroneFireRef.current = 0;
    lastMissileRef.current = 0;
    shieldTimerRef.current = 0;
    invincibleRef.current = 0;
    movementStunRef.current = 0;
    ultimaChargeRef.current = 0;
    ultimaActiveRef.current = 0;
    laserChargeRef.current = 0;
    laserActiveRef.current = 0;
    ultimateChargeRef.current = 0;
    ultimateActiveRef.current = 0;
    milestoneBossFiredRef.current = new Set();
    saveExistsRef.current = !!loadSave();
    setPauseView("menu");
    const shouldTeach = settingsRef.current.tutorial && !tutorialSeen() && !fromSave;
    tutorialStageRef.current = shouldTeach ? 0 : -1;
    setTutorialStage(shouldTeach ? 0 : -1);
    syncDisplay();
  }, [syncDisplay]);

  const returnToHangar = useCallback(() => {
    const gs = stateRef.current;
    if (gs.score > 0) saveGame(gs, runUpgradesRef.current, upgradeLevelRef.current);
    gs.started = false;
    gs.paused = false;
    keysRef.current.clear();
    setPauseView("menu");
    tutorialStageRef.current = -1;
    setTutorialStage(-1);
    saveExistsRef.current = !!loadSave();
    setCoins(loadCoins());
    syncDisplay();
  }, [syncDisplay]);

  // Helper: map a clientX/Y to canvas-space coords
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (CANVAS_W / rect.width),
      y: (clientY - rect.top)  * (CANVAS_H / rect.height),
    };
  }, []);

  useEffect(() => {
    initStars();
    initCity();
    const onKey = (e: KeyboardEvent, down: boolean) => {
      keysRef.current[down ? "add" : "delete"](e.key);
      if (down && tutorialStageRef.current === 0 && ["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        tutorialStageRef.current = 1; setTutorialStage(1);
      }
      if (down && tutorialStageRef.current === 1 && e.key === " ") {
        tutorialStageRef.current = 2; setTutorialStage(2);
        window.setTimeout(finishTutorial, 1400);
      }
      if (e.key === " " && !stateRef.current.started) startGame(saveExistsRef.current);
      if ((e.key === "n" || e.key === "N") && !stateRef.current.started && down) {
        clearSave(); saveExistsRef.current = false; startGame(false);
      }
      if ((e.key === "p" || e.key === "P") && down) {
        if (stateRef.current.started && !stateRef.current.gameOver) {
          stateRef.current.paused = !stateRef.current.paused;
          syncDisplay();
        }
      }
      if ((e.key === "r" || e.key === "R") && down && stateRef.current.started &&
          !stateRef.current.gameOver && !stateRef.current.paused) {
        if (stealthChargeRef.current >= STEALTH_MAX && stealthActiveRef.current === 0
            && activeUnlocksRef.current.includes("stealth_ulti")) {
          stealthActiveRef.current = STEALTH_DURATION;
          stealthChargeRef.current = 0;
        }
      }
      if ((e.key === "h" || e.key === "H") && down && stateRef.current.started &&
          !stateRef.current.gameOver && !stateRef.current.paused) {
        if (healChargeRef.current >= HEAL_MAX && healActiveRef.current === 0
            && activeUnlocksRef.current.includes("heal_ulti")) {
          stateRef.current.hp = Math.min(stateRef.current.maxHp, stateRef.current.hp + HEAL_ULTI_RESTORE);
          healActiveRef.current = HEAL_DURATION;
          healChargeRef.current = 0;
          syncDisplay();
        }
      }
      if ((e.key === "u" || e.key === "U") && down && stateRef.current.started &&
          !stateRef.current.gameOver && !stateRef.current.paused &&
          ultimateChargeRef.current >= ULTIMATE_MAX && ultimateActiveRef.current === 0 &&
          activeUnlocksRef.current.includes("ultimate_ulti")) {
        ultimateActiveRef.current = ULTIMATE_DURATION;
        ultimateChargeRef.current = 0;
        stateRef.current.hp = Math.min(stateRef.current.maxHp, stateRef.current.hp + ULTIMATE_HEAL);
        syncDisplay();
      }
      if ((e.key === "q" || e.key === "Q") && down && stateRef.current.started &&
          !stateRef.current.gameOver && !stateRef.current.paused) {
        if (ultimaChargeRef.current >= ULTI_MAX && ultimaActiveRef.current === 0) {
          ultimaActiveRef.current = ULTI_DURATION;
          ultimaChargeRef.current = 0;
          if (activeUltiSkinRef.current.id === "jade") stateRef.current.hp = Math.min(stateRef.current.maxHp, stateRef.current.hp + 5);
          if (["steel", "jade"].includes(activeUltiSkinRef.current.id)) {
            shieldTimerRef.current = ULTI_DURATION;
            playerShieldHpRef.current = activeUltiSkinRef.current.id === "steel" ? 12 : 6;
          }
          syncDisplay();
        }
      }
      if ((e.key === "e" || e.key === "E") && down && stateRef.current.started &&
          !stateRef.current.gameOver && !stateRef.current.paused) {
        if (laserChargeRef.current >= LASER_MAX && laserActiveRef.current === 0) {
          laserActiveRef.current = LASER_DURATION;
          laserChargeRef.current = 0;
        }
      }
    };
    const onKeyDown = (e: KeyboardEvent) => onKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => onKey(e, false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [finishTutorial, initCity, initStars, startGame, syncDisplay]);

  useEffect(() => {
    const pointerQuery = window.matchMedia?.("(pointer: coarse)");
    const updateVirtualControlVisibility = () => {
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const preference = settingsRef.current.touchControls;
      showVirtualControlsRef.current = preference === "always" || (preference === "auto" && shouldShowVirtualControls(hasTouch, pointerQuery?.matches ?? false));
    };

    updateVirtualControlVisibility();
    pointerQuery?.addEventListener?.("change", updateVirtualControlVisibility);
    return () => pointerQuery?.removeEventListener?.("change", updateVirtualControlVisibility);
  }, []);

  // Touch event setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const gs = stateRef.current;

      // Tap to start / restart
      if (!gs.started) { startGame(saveExistsRef.current); return; }
      if (gs.gameOver) { startGame(false); return; }
      // Tap to unpause
      if (gs.paused) { gs.paused = false; syncDisplay(); return; }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const { x, y } = toCanvas(t.clientX, t.clientY);
        if (x < CANVAS_W / 2) {
          if (tutorialStageRef.current === 0) { tutorialStageRef.current = 1; setTutorialStage(1); }
          // Left half → joystick
          if (!joystickRef.current.active) {
            joystickRef.current = { active: true, id: t.identifier, centerX: x, centerY: y, curX: x, curY: y };
          }
        } else {
          // Check ULTI button first
          const du = Math.hypot(x - ULTI_BTN_X, y - ULTI_BTN_Y);
          const dl = Math.hypot(x - LASER_BTN_X, y - LASER_BTN_Y);
          const ds = Math.hypot(x - STEALTH_BTN_X, y - STEALTH_BTN_Y);
          const dh = Math.hypot(x - HEAL_BTN_X, y - HEAL_BTN_Y);
          const dx = Math.hypot(x - ULTIMATE_BTN_X, y - ULTIMATE_BTN_Y);
          if (dx <= ULTIMATE_BTN_R + 12 && ultimateChargeRef.current >= ULTIMATE_MAX && ultimateActiveRef.current === 0
              && activeUnlocksRef.current.includes("ultimate_ulti")) {
            ultimateActiveRef.current = ULTIMATE_DURATION;
            ultimateChargeRef.current = 0;
            stateRef.current.hp = Math.min(stateRef.current.maxHp, stateRef.current.hp + ULTIMATE_HEAL);
            syncDisplay();
          } else if (dh <= HEAL_BTN_R + 12 && healChargeRef.current >= HEAL_MAX && healActiveRef.current === 0
              && activeUnlocksRef.current.includes("heal_ulti")) {
            stateRef.current.hp = Math.min(stateRef.current.maxHp, stateRef.current.hp + HEAL_ULTI_RESTORE);
            healActiveRef.current = HEAL_DURATION;
            healChargeRef.current = 0;
            syncDisplay();
          } else if (ds <= STEALTH_BTN_R + 12 && stealthChargeRef.current >= STEALTH_MAX && stealthActiveRef.current === 0
              && activeUnlocksRef.current.includes("stealth_ulti")) {
            stealthActiveRef.current = STEALTH_DURATION;
            stealthChargeRef.current = 0;
          } else if (dl <= LASER_BTN_R + 12 && laserChargeRef.current >= LASER_MAX && laserActiveRef.current === 0) {
            laserActiveRef.current = LASER_DURATION;
            laserChargeRef.current = 0;
          } else if (du <= ULTI_BTN_R + 12 && ultimaChargeRef.current >= ULTI_MAX && ultimaActiveRef.current === 0) {
            ultimaActiveRef.current = ULTI_DURATION;
            ultimaChargeRef.current = 0;
            if (activeUltiSkinRef.current.id === "jade") stateRef.current.hp = Math.min(stateRef.current.maxHp, stateRef.current.hp + 5);
            if (["steel", "jade"].includes(activeUltiSkinRef.current.id)) {
              shieldTimerRef.current = ULTI_DURATION;
              playerShieldHpRef.current = activeUltiSkinRef.current.id === "steel" ? 12 : 6;
            }
            syncDisplay();
          } else if (!touchFireRef.current.active) {
            if (tutorialStageRef.current === 1) {
              tutorialStageRef.current = 2; setTutorialStage(2); window.setTimeout(finishTutorial, 1400);
            }
            touchFireRef.current = { active: true, id: t.identifier };
          }
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystickRef.current.id) {
          const { x, y } = toCanvas(t.clientX, t.clientY);
          joystickRef.current.curX = x;
          joystickRef.current.curY = y;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystickRef.current.id) {
          joystickRef.current.active = false;
          joystickRef.current.id = -1;
        }
        if (t.identifier === touchFireRef.current.id) {
          touchFireRef.current.active = false;
          touchFireRef.current.id = -1;
        }
      }
    };

    canvas.addEventListener("touchstart",  onTouchStart, { passive: false });
    canvas.addEventListener("touchmove",   onTouchMove,  { passive: false });
    canvas.addEventListener("touchend",    onTouchEnd,   { passive: false });
    canvas.addEventListener("touchcancel", onTouchEnd,   { passive: false });

    return () => {
      canvas.removeEventListener("touchstart",  onTouchStart);
      canvas.removeEventListener("touchmove",   onTouchMove);
      canvas.removeEventListener("touchend",    onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [finishTutorial, startGame, syncDisplay, toCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let lastTime = 0;

    const loop = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const dt = lastTime === 0 ? FRAME_MS : Math.min(timestamp - lastTime, 50);
      const dtScale = dt / FRAME_MS;
      lastTime = timestamp;

      const gs = stateRef.current;
      timeRef.current += dtScale;

      const spaceBackground = shouldUseSpaceBackground(gs.level);
      const aboveCloudsBackground = shouldUseAboveCloudsBackground(gs.level);
      const cityBackground = shouldUseCityBackground(gs.level);

      if (spaceBackground) {
        ctx.fillStyle = "#000006";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        starsRef.current.forEach(s => {
          if (!settingsRef.current.reducedMotion) s.x -= s.speed * 1.8;
          if (s.x < -12) { s.x = CANVAS_W + 12; s.y = rand(0, CANVAS_H); }
          ctx.globalAlpha = 0.35 + s.brightness * 0.65;
          ctx.fillStyle = s.size > 1.6 ? "#c9dcff" : "#ffffff";
          const streak = settingsRef.current.reducedMotion ? s.size : 2 + s.speed * 4;
          ctx.fillRect(s.x, s.y, streak, Math.max(1, s.size));
        });
        ctx.globalAlpha = 1;
      } else {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        skyGrad.addColorStop(0, aboveCloudsBackground ? "#126ed0" : "#1a70c4");
        skyGrad.addColorStop(0.5, aboveCloudsBackground ? "#61bdf4" : "#5ab2e8");
        skyGrad.addColorStop(1, aboveCloudsBackground ? "#d8f2ff" : "#b0ddf5");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        starsRef.current.slice(0, 14).forEach(s => {
          if (!settingsRef.current.reducedMotion) s.x -= s.speed * 0.18;
          if (s.x < -120) { s.x = CANVAS_W + 120; s.y = rand(18, CANVAS_H * 0.38); }
          const cw = 50 + s.size * 28, ch = 18 + s.size * 7;
          ctx.save();
          ctx.globalAlpha = 0.22 + s.brightness * 0.12;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.ellipse(s.x, s.y, cw, ch, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(s.x + cw * 0.32, s.y - ch * 0.4, cw * 0.65, ch * 0.65, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(s.x - cw * 0.28, s.y - ch * 0.3, cw * 0.55, ch * 0.55, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        });
        ctx.globalAlpha = 1;

        if (aboveCloudsBackground) {
          const cloudTop = CANVAS_H * 0.73;
          const cloudGrad = ctx.createLinearGradient(0, cloudTop, 0, CANVAS_H);
          cloudGrad.addColorStop(0, "#ffffffee");
          cloudGrad.addColorStop(0.45, "#ddecf8f2");
          cloudGrad.addColorStop(1, "#a9c8e2");
          ctx.fillStyle = cloudGrad;
          ctx.fillRect(0, cloudTop + 26, CANVAS_W, CANVAS_H - cloudTop);

          const drift = settingsRef.current.reducedMotion ? 0 : (timeRef.current * 0.16) % 150;
          for (let x = -110 - drift; x < CANVAS_W + 130; x += 105) {
            const y = cloudTop + Math.sin((x + drift) * 0.025) * 10;
            ctx.fillStyle = "#f8fdffff";
            ctx.beginPath();
            ctx.ellipse(x, y + 28, 78, 34, 0, 0, Math.PI * 2);
            ctx.ellipse(x + 34, y + 5, 48, 36, 0, 0, Math.PI * 2);
            ctx.ellipse(x - 30, y + 12, 44, 29, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      const drawCityLayer = (buildings: Building[], speed: number, fillColor: string) => {
        const totalW = buildings.reduce((s, b) => s + b.width + 10, 0);
        if (totalW === 0) return;
        const offset = settingsRef.current.reducedMotion ? 0 : (timeRef.current * speed) % totalW;
        for (const b of buildings) {
          let rx = b.x - offset;
          if (rx + b.width < 0) rx += totalW;
          if (rx > CANVAS_W) continue;
          ctx.fillStyle = fillColor;
          ctx.fillRect(rx, CANVAS_H - b.height, b.width, b.height);
          // Glass reflections (daytime)
          for (const w of b.windows) {
            if (!w.lit) continue;
            ctx.fillStyle = "#ffffff18";
            ctx.fillRect(rx + w.wx, CANVAS_H - b.height + w.wy, 5, 7);
          }
        }
      };
      if (cityBackground) {
        drawCityLayer(cityFarRef.current,  0.3, "#2c3f62");
        drawCityLayer(cityNearRef.current, 0.9, "#1a2840");
      }

      if (!gs.started) {
        return; // Hangar React overlay handles this screen
      }

      if (gs.paused) {
        return;
      }

      if (gs.gameOver) {
        gameOverCountdownRef.current += dtScale;
        ctx.save();
        ctx.fillStyle = "rgba(4,12,28,0.84)";
        ctx.beginPath(); ctx.roundRect(CANVAS_W/2-260, CANVAS_H/2-78, 520, 195, 14); ctx.fill();
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff4444"; ctx.font = "bold 52px 'Inter', sans-serif";
        ctx.shadowColor = "#ff4444"; ctx.shadowBlur = 20;
        ctx.fillText("GAME OVER", CANVAS_W/2, CANVAS_H/2-36);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff"; ctx.font = "24px 'Inter', sans-serif";
        ctx.fillText(`Score: ${gs.score.toLocaleString("de-DE")}`, CANVAS_W/2, CANVAS_H/2+10);
        ctx.fillStyle = "#aaa"; ctx.font = "15px 'Inter', sans-serif";
        ctx.fillText(`Level ${gs.level}  ·  ${WEAPON_TIERS[gs.weaponTier].name}`, CANVAS_W/2, CANVAS_H/2+40);
        ctx.fillStyle = "#ffcc44"; ctx.font = "13px 'Inter', sans-serif";
        ctx.fillText("🏆 Score gespeichert — Rangliste im Hangar!", CANVAS_W/2, CANVAS_H/2+62);
        ctx.fillStyle = "#ffd966"; ctx.font = "bold 16px 'Inter', sans-serif";
        ctx.fillText(`Belohnung: +${calculateCoinReward(gs.score).toLocaleString("de-DE")} Credits`, CANVAS_W/2, CANVAS_H/2+86);
        const sLeft = Math.max(0, Math.ceil((200 - gameOverCountdownRef.current) / 60));
        ctx.fillStyle = sLeft > 0 ? "#666" : "#ffcc00";
        ctx.font = "13px 'Inter', sans-serif";
        ctx.fillText(sLeft > 0 ? `Zurück zum Hangar in ${sLeft}s …  (SPACE zum Überspringen)` : "Zum Hangar …", CANVAS_W/2, CANVAS_H/2+72);
        ctx.restore();
        if (keysRef.current.has(" ") || gameOverCountdownRef.current > 200) {
          gameOverCountdownRef.current = 0;
          gs.started = false; gs.gameOver = false;
          syncDisplay();
        }
        return;
      }

      audioRef.current.updateMusic(gs.level, settingsRef.current.musicVolume, dtScale);

      // ── Input & Player Movement ──
      const n1UltiSpeed = activeUltiSkinRef.current.id === "n1" && ultimaActiveRef.current > 0 ? 2 : 1;
      const speedMult = (activeSkinRef.current?.id === "n1" ? 1.15 : 1) * n1UltiSpeed * (speedBoostRef.current > 0 ? 2 : 1);
      const spd = gs.speed * speedMult;
      const js = joystickRef.current;
      const JOY_RADIUS = 70;

      movementStunRef.current = Math.max(0, movementStunRef.current - dtScale);
      if (movementStunRef.current <= 0 && js.active) {
        const dx = js.curX - js.centerX;
        const dy = js.curY - js.centerY;
        const d = Math.hypot(dx, dy);
        const norm = Math.min(d, JOY_RADIUS) / JOY_RADIUS;
        if (d > 8) {
          playerRef.current.x = clamp(playerRef.current.x + (dx / d) * norm * spd * 0.8 * dtScale, 0, CANVAS_W * 0.75);
          playerRef.current.y = clamp(playerRef.current.y + (dy / d) * norm * spd * dtScale,       0, CANVAS_H - PLAYER_H);
        }
      } else if (movementStunRef.current <= 0) {
        if (keysRef.current.has("ArrowUp") || keysRef.current.has("w") || keysRef.current.has("W")) {
          playerRef.current.y = clamp(playerRef.current.y - spd * dtScale, 0, CANVAS_H - PLAYER_H);
        }
        if (keysRef.current.has("ArrowDown") || keysRef.current.has("s") || keysRef.current.has("S")) {
          playerRef.current.y = clamp(playerRef.current.y + spd * dtScale, 0, CANVAS_H - PLAYER_H);
        }
        if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a") || keysRef.current.has("A")) {
          playerRef.current.x = clamp(playerRef.current.x - spd * 0.8 * dtScale, 0, CANVAS_W - PLAYER_W);
        }
        if (keysRef.current.has("ArrowRight") || keysRef.current.has("d") || keysRef.current.has("D")) {
          playerRef.current.x = clamp(playerRef.current.x + spd * 0.8 * dtScale, 0, CANVAS_W * 0.75);
        }
      }

      const firing = keysRef.current.has(" ") || touchFireRef.current.active;
      if (firing) fireBullets(timestamp);

      // ── Level / Weapon tier ──
      const nextLevel = getLevelForScore(gs.score);
      if (nextLevel !== gs.level) {
        gs.level = nextLevel;
        const tierIndex = Math.min(nextLevel - 1, WEAPON_TIERS.length - 1);
        gs.weaponTier = Math.max(gs.weaponTier, tierIndex);
        gs.speed = 3.2 + (nextLevel - 1) * 0.25 + (activeUnlocksRef.current.includes("speed_item") ? 0.5 : 0) + aircraftUpgradeRef.current.speedBonus;
        saveGame(gs, runUpgradesRef.current, upgradeLevelRef.current);
        saveExistsRef.current = true;
        if (nextLevel >= 5 && nextLevel % 5 === 0 && upgradeLevelRef.current !== nextLevel) {
          upgradeLevelRef.current = nextLevel;
          const choices = [...RUN_UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
          setRunUpgradeChoices(choices); gs.paused = true; syncDisplay();
        }
      }

      // ── Milestone boss: spawn a mega-boss when entering key levels ──
      if (isMilestoneBossLevel(gs.level) && !milestoneBossFiredRef.current.has(gs.level) &&
          enemiesRef.current.filter(isBossEnemy).length === 0) {
        milestoneBossFiredRef.current.add(gs.level);
        const ml = gs.level;
        const mbHp = 80 + ml * 12;
        enemiesRef.current.push({
          x: CANVAS_W + 20,
          y: rand(40, CANVAS_H - 100),
          vx: -rand(0.45, 0.8),
          vy: 0,
          hp: mbHp, maxHp: mbHp,
          width: 115, height: 88,
          type: "boss",
          shootCooldown: 12,
          points: 100,
          color: "#ff2200",
          angle: 0,
          oscillate: 0,
          bossAge: 0,
        });
        audioRef.current.effect("boss", settingsRef.current.soundVolume);
      }

      // ── Spawn enemies ──
      const spawnRate = Math.max(32, 110 - gs.level * 10);
      enemySpawnTimerRef.current += dtScale;
      if (enemySpawnTimerRef.current >= spawnRate) {
        enemySpawnTimerRef.current = 0;
        spawnEnemy(gs.level);
      }

      // ── Update bullets ──
      bulletsRef.current = bulletsRef.current.filter(b => {
        // Lifetime expiry (boss missiles)
        if (b.lifetime !== undefined) {
          b.lifetime -= dtScale;
          if (b.lifetime <= 0) return false;
        }
        // Red bullet wave (level 8+)
        if (b.fromPlayer && b.color === "#ff3333" && gs.level >= 8) {
          b.vy = Math.sin(timeRef.current * 0.08 + b.x * 0.03) * 3;
        }
        if (b.isMissile && b.missileTarget && !b.missileTarget.dead) {
          const tx = b.missileTarget.x + b.missileTarget.width / 2;
          const ty = b.missileTarget.y + b.missileTarget.height / 2;
          const ang = Math.atan2(ty - b.y, tx - b.x);
          const steer = 1 - Math.pow(1 - 0.08, dtScale);
          b.vx += (Math.cos(ang) * 0.6 - b.vx) * steer;
          b.vy += (Math.sin(ang) * 0.6 - b.vy) * steer;
          const spd2 = Math.hypot(b.vx, b.vy);
          const ms = 7;
          if (spd2 > ms) { b.vx = b.vx / spd2 * ms; b.vy = b.vy / spd2 * ms; }
        }
        // Enemy homing missile tracks player
        if (b.trackPlayer && !b.fromPlayer) {
          const tx = playerRef.current.x + PLAYER_W / 2;
          const ty = playerRef.current.y + PLAYER_H / 2;
          const ang = Math.atan2(ty - b.y, tx - b.x);
          const steer = 1 - Math.pow(1 - 0.06, dtScale);
          b.vx += (Math.cos(ang) * 0.5 - b.vx) * steer;
          b.vy += (Math.sin(ang) * 0.5 - b.vy) * steer;
          const sp = Math.hypot(b.vx, b.vy);
          if (sp > 5) { b.vx = b.vx / sp * 5; b.vy = b.vy / sp * 5; }
        }
        const projectileSpeed = !b.fromPlayer && ultimaActiveRef.current > 0 && activeUltiSkinRef.current.id === "arctic" ? 0 : 1;
        b.x += b.vx * dtScale * projectileSpeed;
        b.y += b.vy * dtScale * projectileSpeed;
        drawBullet(ctx, b);
        return b.x > -20 && b.x < CANVAS_W + 20 && b.y > -20 && b.y < CANVAS_H + 20;
      });

      // ── Update enemies ──
      if (invincibleRef.current > 0) invincibleRef.current = Math.max(0, invincibleRef.current - dtScale);
      if (shieldTimerRef.current > 0) {
        shieldTimerRef.current = Math.max(0, shieldTimerRef.current - dtScale);
        if (shieldTimerRef.current <= 0) playerShieldHpRef.current = 0;
      }

      // ── Ultima charge & countdown ──
      if (ultimaActiveRef.current > 0) {
        ultimaActiveRef.current = Math.max(0, ultimaActiveRef.current - dtScale);
        if (["steel", "shadow", "n1"].includes(activeUltiSkinRef.current.id)) invincibleRef.current = Math.max(invincibleRef.current, 3);
      } else if (ultimaChargeRef.current < ULTI_MAX) {
        const cloneMult = activeUnlocksRef.current.includes("ulti_boost") ? 1.5 : 1;
        const cloneBonus = activeUnlocksRef.current.includes("clone_upgrade") ? 1.25 : 1;
        ultimaChargeRef.current = Math.min(ULTI_MAX, ultimaChargeRef.current + 0.09 * cloneMult * cloneBonus * dtScale);
      }
      // ── Laser charge & countdown ──
      if (laserActiveRef.current > 0) {
        laserActiveRef.current = Math.max(0, laserActiveRef.current - dtScale);
      } else if (laserChargeRef.current < LASER_MAX) {
        const laserMult = activeUnlocksRef.current.includes("ulti_boost") ? 1.5 : 1;
        const laserBonus = activeUnlocksRef.current.includes("laser_upgrade") ? 1.25 : 1;
        laserChargeRef.current = Math.min(LASER_MAX, laserChargeRef.current + 0.10 * laserMult * laserBonus * dtScale);
      }
      // ── Stealth charge & countdown ──
      if (stealthActiveRef.current > 0) {
        stealthActiveRef.current = Math.max(0, stealthActiveRef.current - dtScale);
      } else if (stealthChargeRef.current < STEALTH_MAX && activeUnlocksRef.current.includes("stealth_ulti")) {
        stealthChargeRef.current = Math.min(STEALTH_MAX, stealthChargeRef.current + 0.10 * dtScale);
      }
      // Lädt halb so schnell wie Stealth (nochmals verdoppelte Ladegeschwindigkeit).
      if (ultimateActiveRef.current > 0) {
        ultimateActiveRef.current = Math.max(0, ultimateActiveRef.current - dtScale);
      } else if (ultimateChargeRef.current < ULTIMATE_MAX && activeUnlocksRef.current.includes("ultimate_ulti")) {
        ultimateChargeRef.current = Math.min(ULTIMATE_MAX, ultimateChargeRef.current + ULTIMATE_CHARGE_RATE * dtScale);
      }
      // ── Heal charge & countdown ──
      if (healActiveRef.current > 0) {
        healActiveRef.current = Math.max(0, healActiveRef.current - dtScale);
      } else if (healChargeRef.current < HEAL_MAX && activeUnlocksRef.current.includes("heal_ulti")) {
        const healMult = activeUnlocksRef.current.includes("ulti_boost") ? 1.5 : 1;
        healChargeRef.current = Math.min(HEAL_MAX, healChargeRef.current + 0.10 * healMult * dtScale);
      }
      // ── Speed boost countdown ──
      if (speedBoostRef.current > 0) speedBoostRef.current = Math.max(0, speedBoostRef.current - dtScale);
      // ── N-1 Starfighter passive: auto-shield every 20s for 3s ──
      if (activeSkinRef.current?.id === "n1") {
        n1ShieldTimerRef.current += dtScale;
        if (n1ShieldTimerRef.current >= 1200 && shieldTimerRef.current <= 0) {
          n1ShieldTimerRef.current = 0;
          shieldTimerRef.current = 180;
          playerShieldHpRef.current = PLAYER_SHIELD_HP;
        }
      }

      enemiesRef.current = enemiesRef.current.filter(e => {
        if (e.dead) return false;
        // From level 10 onward, a boss that survives for 20 seconds evolves.
        if (e.type === "boss" && gs.level >= 10) {
          e.bossAge = (e.bossAge ?? 0) + dtScale;
          if (e.bossAge >= 1200) {
            const centerX = e.x + e.width / 2;
            const centerY = e.y + e.height / 2;
            const bonusHp = Math.round(e.maxHp * .5);
            e.type = "overlord";
            e.width = 138; e.height = 104;
            e.x = centerX - e.width / 2; e.y = centerY - e.height / 2;
            e.maxHp += bonusHp; e.hp += bonusHp;
            e.points *= 2;
            e.color = "#ff4fc8";
            e.shootCooldown = 20;
            e.specialAttackTimer = 150;
            spawnExplosion(particlesRef.current, centerX, centerY, true);
            audioRef.current.effect("boss", settingsRef.current.soundVolume);
          }
        }
        if (ultimaActiveRef.current > 0) {
          const aircraftId = activeUltiSkinRef.current.id;
          const blackHoleActive = aircraftId === "galaxy" || aircraftId === "n1";
          if (blackHoleActive) {
            const targetX = CANVAS_W * .58;
            const targetY = CANVAS_H * .5;
            e.x += (targetX - (e.x + e.width / 2)) * .012 * dtScale;
            e.y += (targetY - (e.y + e.height / 2)) * .012 * dtScale;
            e.hp -= .10 * dtScale;
          }
          if (aircraftId === "arctic") e.ultimateFreezeTimer = Math.max(e.ultimateFreezeTimer ?? 0, ultimaActiveRef.current);
          if (aircraftId === "fire") e.hp -= .11 * dtScale;
          if (aircraftId === "neon") e.hp -= .14 * dtScale;
          if (aircraftId === "lava") e.hp -= .18 * dtScale;
          if (aircraftId === "shadow" && ultimaActiveRef.current < 3) e.hp -= 14;
          if (e.hp <= 0) {
            spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, isBossEnemy(e));
            gs.score += e.points * (aircraftId === "gold" ? 2 : 1);
            runStatsRef.current.kills += 1;
            if (isBossEnemy(e)) runStatsRef.current.bosses += 1;
            e.dead = true;
            checkAchievements();
            audioRef.current.effect("explosion", settingsRef.current.soundVolume);
            syncDisplay();
            return false;
          }
        }
        if (ultimateActiveRef.current > 0) {
          e.ultimateSlowTimer = Math.max(e.ultimateSlowTimer ?? 0, ultimateActiveRef.current);
          e.ultimateDotTimer = (e.ultimateDotTimer ?? ULTIMATE_DOT_INTERVAL) - dtScale;
          if (e.ultimateDotTimer <= 0) {
            e.hp -= ULTIMATE_DOT_DAMAGE;
            e.ultimateDotTimer += ULTIMATE_DOT_INTERVAL;
            spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, false);
            if (e.hp <= 0) {
              gs.score += e.points * (ultimaActiveRef.current > 0 && activeUltiSkinRef.current.id === "gold" ? 2 : 1);
              runStatsRef.current.kills += 1;
              if (isBossEnemy(e)) runStatsRef.current.bosses += 1;
              e.dead = true;
              checkAchievements();
              audioRef.current.effect("explosion", settingsRef.current.soundVolume);
              syncDisplay();
              return false;
            }
          }
        }
        e.ultimateFreezeTimer = Math.max(0, (e.ultimateFreezeTimer ?? 0) - dtScale);
        e.ultimateSlowTimer = Math.max(0, (e.ultimateSlowTimer ?? 0) - dtScale);
        const statusSpeed = (e.ultimateFreezeTimer ?? 0) > 0 ? 0 : (e.ultimateSlowTimer ?? 0) > 0 ? ULTIMATE_SLOW_FACTOR : 1;
        e.x += e.vx * dtScale * statusSpeed;
        e.y += e.vy * dtScale * statusSpeed;
        if (e.oscillate) e.y += Math.sin(timeRef.current * 0.04) * Math.abs(e.oscillate) * 0.8 * dtScale * statusSpeed;
        e.y = clamp(e.y, 0, CANVAS_H - e.height);

        // Boss movement
        if (isBossEnemy(e)) {
          e.vx = Math.sin(timeRef.current * 0.02) * -1.2;
          if (e.x > CANVAS_W - e.width - 10) e.x = CANVAS_W - e.width - 10;
          if (e.x < CANVAS_W * 0.5) e.x = CANVAS_W * 0.5;

          // Vertical dodge every 4 s (level 10+)
          if (gs.level >= 10) {
            e.bossVyTimer = (e.bossVyTimer ?? 0) + dtScale;
            if (e.bossVyTimer >= 240) {
              e.bossVyTimer = 0;
              e.bossVyDir = Math.random() > 0.5 ? 1 : -1;
            }
            const dodgeDecay = Math.max(0, 1 - e.bossVyTimer / 90);
            e.vy = (e.bossVyDir ?? 0) * 2.2 * dodgeDecay;
          }
          // Three phases: movement and attacks intensify below 60% and 30% HP.
          const phase = e.hp / e.maxHp <= .3 ? 3 : e.hp / e.maxHp <= .6 ? 2 : 1;
          e.color = e.type === "overlord"
            ? (phase === 3 ? "#ffffff" : phase === 2 ? "#6fe9ff" : "#ff4fc8")
            : (phase === 3 ? "#ff3300" : phase === 2 ? "#ff00aa" : e.color);
          if (phase >= 2) e.vy += Math.sin(timeRef.current * .055) * (phase === 3 ? 1.7 : .9);

          // Homing missile every 4 s (level 10+)
          if (gs.level >= 10) {
            e.missileTimer = (e.missileTimer ?? 240) - dtScale;
            if (e.missileTimer <= 0) {
              e.missileTimer = 240;
              bulletsRef.current.push({
                x: e.x, y: e.y + e.height / 2,
                vx: -4, vy: 0,
                fromPlayer: false,
                damage: 2,
                isMissile: true,
                trackPlayer: true,
                lifetime: 720,
              });
            }
          }

          // Overlord special: a telegraphed radial plasma burst every 3 seconds.
          if (e.type === "overlord" && (e.ultimateFreezeTimer ?? 0) <= 0) {
            e.specialAttackTimer = (e.specialAttackTimer ?? 180) - dtScale;
            if (e.specialAttackTimer <= 0) {
              e.specialAttackTimer = 180;
              const px = playerRef.current.x + PLAYER_W / 2;
              const py = playerRef.current.y + PLAYER_H / 2;
              const originX = e.x + 12;
              const originY = e.y + e.height / 2;
              const aim = Math.atan2(py - originY, px - originX);
              for (let s = -3; s <= 3; s++) {
                const angle = aim + s * .19;
                bulletsRef.current.push({
                  x: originX, y: originY,
                  vx: Math.cos(angle) * 5.2, vy: Math.sin(angle) * 5.2,
                  fromPlayer: false, damage: 3,
                  color: s === 0 ? "#ffffff" : "#ff4fc8",
                  lifetime: 300,
                });
              }
              spawnExplosion(particlesRef.current, originX, originY, false);
            }
          }
        }

        // Fighter dodge (level 8+, every 5s = 300 frames)
        if (e.type === "fighter" && gs.level >= 8) {
          e.fighterDodgeTimer = (e.fighterDodgeTimer ?? 0) + dtScale;
          if (e.fighterDodgeTimer >= 300) {
            e.fighterDodgeTimer = 0;
            e.fighterDodgeDir = Math.random() > 0.5 ? 1 : -1;
          }
          const fDecay = Math.max(0, 1 - (e.fighterDodgeTimer % 300) / 90);
          e.vy = (e.fighterDodgeDir ?? 0) * 2.5 * fDecay;
        }
        // TIE Fighter dodge (every 1.5s = 90 frames)
        if (e.type === "tiefighter" || e.type === "emeraldtiefighter") {
          e.tieDodgeTimer = (e.tieDodgeTimer ?? 0) + dtScale;
          if (e.tieDodgeTimer >= 90) {
            e.tieDodgeTimer = 0;
            e.tieDodgeDir = Math.random() > 0.5 ? 1 : -1;
          }
          const tDecay = Math.max(0, 1 - (e.tieDodgeTimer % 90) / 45);
          e.vy = (e.tieDodgeDir ?? 0) * 3.5 * tDecay;
        }

        // Off screen left
        if (e.x + e.width < -20) return false;

        // Enemy shooting
        if ((e.ultimateFreezeTimer ?? 0) <= 0) e.shootCooldown -= dtScale;
        if (e.shootCooldown <= 0 && (e.ultimateFreezeTimer ?? 0) <= 0) {
          const bossPhase = isBossEnemy(e) ? (e.hp / e.maxHp <= .3 ? 3 : e.hp / e.maxHp <= .6 ? 2 : 1) : 0;
          e.shootCooldown = e.type === "overlord" ? (bossPhase === 3 ? 10 : 16) : e.type === "boss" ? (bossPhase === 3 ? 12 : bossPhase === 2 ? 18 : 25) : e.type === "plasmawing" ? rand(38, 58) : e.type === "emeraldtiefighter" ? rand(80, 120) : e.type === "tiefighter" ? rand(40, 60) : e.type === "bomber" ? 55 : rand(70, 120);
          if (e.type === "tiefighter" || e.type === "emeraldtiefighter" || e.type === "plasmawing") {
            // TIE Fighter: aimed shot toward player
            const px = playerRef.current.x + PLAYER_W / 2;
            const py = playerRef.current.y + PLAYER_H / 2;
            const dx = px - e.x; const dy = py - (e.y + e.height / 2);
            const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const spd2 = ENEMY_BULLET_SPEED * (e.type === "plasmawing" ? 1.8 : 1.4);
            bulletsRef.current.push({
              x: e.x, y: e.y + e.height / 2,
              vx: dx / d * spd2, vy: dy / d * spd2,
              fromPlayer: false, damage: e.type === "plasmawing" ? 1 : 2,
              color: e.type === "plasmawing" ? "#cc55ff" : e.type === "emeraldtiefighter" ? "#ff8fda" : undefined,
              stunFrames: e.type === "emeraldtiefighter" ? 120 : undefined,
            });
          } else {
            const shotCount = isBossEnemy(e) ? (bossPhase === 3 ? 7 : bossPhase === 2 ? 5 : 3) : e.type === "bomber" ? 2 : 1;
            for (let s = 0; s < shotCount; s++) {
              const spread = (s - (shotCount - 1) / 2) * 0.25;
              bulletsRef.current.push({
                x: e.x, y: e.y + e.height / 2,
                vx: -ENEMY_BULLET_SPEED + (isBossEnemy(e) ? -1 : 0),
                vy: spread * ENEMY_BULLET_SPEED,
                fromPlayer: false, damage: isBossEnemy(e) ? 3 : 2,
                color: e.type === "overlord" ? "#6fe9ff" : e.type === "boss" && bossPhase === 3 ? "#ff3300" : undefined,
              });
            }
          }
        }

        // Draw enemy
        drawEnemy(ctx, e);

        // Enemy-player collision
        if (invincibleRef.current <= 0 && stealthActiveRef.current <= 0 && ultimateActiveRef.current <= 0 &&
          rectHit(playerRef.current.x, playerRef.current.y, PLAYER_W, PLAYER_H, e.x, e.y, e.width, e.height)) {
          const protection = applyPlayerHitProtection({
            shieldTimer: shieldTimerRef.current,
            shieldHp: playerShieldHpRef.current,
            invincibleTimer: 0,
            stealthTimer: 0,
          });
          shieldTimerRef.current = protection.shieldTimer;
          playerShieldHpRef.current = protection.shieldHp;
          if (protection.protected) {
            spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, false);
            e.dead = true; return false;
          }
          const collDmg = activeUnlocksRef.current.includes("armor") ? 0.5 : 1;
          const nextLifeState = applyPlayerDamage(gs, collDmg);
          gs.hp = nextLifeState.hp;
          gs.lives = nextLifeState.lives;
          gs.gameOver = nextLifeState.gameOver;
          invincibleRef.current = 140;
          spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, true);
          e.dead = true;
          if (gs.gameOver) { clearSave(); saveHighScore(gs.score); addLeaderboardEntry(playerNameRef.current, gs.score); addCoins(calculateCoinReward(gs.score)); saveExistsRef.current = false; syncDisplay(); }
          syncDisplay();
          return false;
        }

        // Bullet-enemy collision
        let hit = false;
        bulletsRef.current = bulletsRef.current.filter(b => {
          if (!b.fromPlayer || hit) return true;
          const bw = b.isMissile ? 14 : 14;
          const bh = b.isMissile ? 8 : 4;
          if (!rectHit(b.x, b.y - bh / 2, bw, bh, e.x, e.y, e.width, e.height)) return true;
          const critical = runUpgradesRef.current.critical > 0 && Math.random() < Math.min(.45, .15 * runUpgradesRef.current.critical);
          const aircraftDamage = ultimaActiveRef.current > 0 && activeUltiSkinRef.current.id === "crimson" ? 2 : 1;
          const damageResult = applyEnemyDamage(e, b.damage * (critical ? 3 : 1) * aircraftDamage * (ultimateActiveRef.current > 0 ? 2 : 1));
          e.hp = damageResult.hp;
          e.shieldHp = damageResult.shieldHp;
          if (ultimateActiveRef.current > 0) e.ultimateFreezeTimer = ultimateActiveRef.current;
          spawnExplosion(particlesRef.current, b.x, b.y, false);
          audioRef.current.effect("hit", settingsRef.current.soundVolume);
          hit = true;
          if (damageResult.destroyed) {
            spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, isBossEnemy(e));
            gs.score += e.points * (ultimaActiveRef.current > 0 && activeUltiSkinRef.current.id === "gold" ? 2 : 1);
            runStatsRef.current.kills += 1;
            if (isBossEnemy(e)) runStatsRef.current.bosses += 1;
            checkAchievements();
            audioRef.current.effect("explosion", settingsRef.current.soundVolume);
            ultimaChargeRef.current = Math.min(ULTI_MAX, ultimaChargeRef.current +
              (isBossEnemy(e) ? 45 : e.type === "bomber" ? 20 : e.type === "fighter" ? 11 : 6));
            laserChargeRef.current = Math.min(LASER_MAX, laserChargeRef.current +
              (isBossEnemy(e) ? 60 : e.type === "bomber" ? 28 : e.type === "fighter" ? 14 : 8));
            e.dead = true;
            // Boss always drops health
            if (isBossEnemy(e)) {
              powerUpsRef.current.push({ x: e.x + e.width / 2, y: e.y + e.height / 2, type: "health", vy: 1.2 });
              stealthChargeRef.current = Math.min(STEALTH_MAX, stealthChargeRef.current + 50);
              if (runUpgradesRef.current.shield > 0) { shieldTimerRef.current = 600; playerShieldHpRef.current = PLAYER_SHIELD_HP; }
            }
            healChargeRef.current = Math.min(HEAL_MAX, healChargeRef.current +
              (isBossEnemy(e) ? 60 : e.type === "bomber" ? 28 : e.type === "fighter" ? 14 : 8));
            // Power-up chance
            if (Math.random() < 0.20) {
              const roll2 = Math.random();
              const pType: PowerUp["type"] = roll2 < 0.12 ? "speedboost" : roll2 < 0.45 ? "health" : roll2 < 0.72 ? "shield" : "speed";
              powerUpsRef.current.push({
                x: e.x + e.width / 2, y: e.y + e.height / 2,
                type: pType,
                vy: 1.2,
              });
            }
            syncDisplay();
            return false;
          }
          return false;
        });
        return !e.dead;
      });

      // ── Bullet-player collision ──
      bulletsRef.current = bulletsRef.current.filter(b => {
        if (b.fromPlayer) return true;
        const bw = 8, bh = 8;
        if (!rectHit(b.x - bw / 2, b.y - bh / 2, bw, bh, playerRef.current.x, playerRef.current.y, PLAYER_W, PLAYER_H)) return true;
        if (ultimateActiveRef.current > 0) {
          spawnExplosion(particlesRef.current, b.x, b.y, false);
          return false;
        }
        const protection = applyPlayerHitProtection({
          shieldTimer: shieldTimerRef.current,
          shieldHp: playerShieldHpRef.current,
          invincibleTimer: invincibleRef.current,
          stealthTimer: stealthActiveRef.current,
        });
        shieldTimerRef.current = protection.shieldTimer;
        playerShieldHpRef.current = protection.shieldHp;
        if (protection.protected) {
          spawnExplosion(particlesRef.current, b.x, b.y, false);
          return false;
        }
        const bulletDmg = activeUnlocksRef.current.includes("armor") ? Math.max(0.5, b.damage * 0.5) : b.damage;
        runStatsRef.current.damageTaken += bulletDmg;
        checkAchievements();
        const nextLifeState = applyPlayerDamage(gs, bulletDmg);
        gs.hp = nextLifeState.hp;
        gs.lives = nextLifeState.lives;
        gs.gameOver = nextLifeState.gameOver;
        if (b.stunFrames) movementStunRef.current = b.stunFrames;
        invincibleRef.current = 100;
        spawnExplosion(particlesRef.current, b.x, b.y, false);
        if (gs.gameOver) { clearSave(); saveHighScore(gs.score); addLeaderboardEntry(playerNameRef.current, gs.score); addCoins(calculateCoinReward(gs.score)); saveExistsRef.current = false; }
        syncDisplay();
        return false;
      });

      // ── Power-ups ──
      powerUpsRef.current = powerUpsRef.current.filter(p => {
        p.y += p.vy * dtScale;
        if (p.y > CANVAS_H + 20) return false;
        // Draw
        const colors: Record<PowerUp["type"], string> = { health: "#00ff88", shield: "#00ccff", speed: "#ffcc00", speedboost: "#ff9900" };
        const labels: Record<PowerUp["type"], string> = { health: "+HP", shield: "SHD", speed: "SPD", speedboost: "2×SPD" };
        const c = colors[p.type];
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = c + "44";
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = c;
        ctx.font = "bold 9px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labels[p.type], p.x, p.y);
        ctx.restore();
        // Pickup
        if (dist(playerRef.current, p) < 24) {
          runStatsRef.current.powerUps += 1; checkAchievements();
          audioRef.current.effect("pickup", settingsRef.current.soundVolume);
          if (p.type === "health") gs.hp = Math.min(gs.maxHp, gs.hp + 3);
          if (p.type === "shield") {
            shieldTimerRef.current = 300;
            playerShieldHpRef.current = PLAYER_SHIELD_HP;
          }
          if (p.type === "speed") gs.speed = Math.min(6, gs.speed + 0.5);
          if (p.type === "speedboost") speedBoostRef.current = 480;
          syncDisplay();
          return false;
        }
        return true;
      });

      // ── Particles ──
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx * dtScale; p.y += p.vy * dtScale;
        p.life -= dtScale;
        drawParticle(ctx, p);
        return p.life > 0;
      });

      // ── Laser beams ──
      const laserBeams: number[] = [];
      if (laserActiveRef.current > 0) laserBeams.push(playerRef.current.y + PLAYER_H / 2);
      if (laserActiveRef.current > 0 && ultimaActiveRef.current > 0 && ["xwing", "tiefighter", "n1"].includes(activeUltiSkinRef.current.id) && activeUnlocksRef.current.includes("clone_laser")) {
        const cloneY = clamp(playerRef.current.y + 56, 0, CANVAS_H - PLAYER_H);
        laserBeams.push(cloneY + PLAYER_H / 2);
      }
      if (laserBeams.length > 0) {
        const lx = playerRef.current.x + PLAYER_W + 4;
        const beamW = CANVAS_W - lx;
        const flicker = 0.75 + 0.25 * Math.sin(timeRef.current * 0.6);
        for (const ly of laserBeams) {
          ctx.save();
          ctx.globalAlpha = 0.28 * flicker;
          ctx.fillStyle = "#ff5500"; ctx.shadowColor = "#ff3300"; ctx.shadowBlur = 50;
          ctx.fillRect(lx, ly - 18, beamW, 36);
          ctx.globalAlpha = 0.55 * flicker;
          ctx.fillStyle = "#ffaa00"; ctx.shadowBlur = 25;
          ctx.fillRect(lx, ly - 7, beamW, 14);
          ctx.globalAlpha = flicker;
          ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 8;
          ctx.fillRect(lx, ly - 2, beamW, 4);
          ctx.restore();
        }
        // Damage enemies in laser path
        for (const e of enemiesRef.current) {
          if (e.dead) continue;
          if (e.x + e.width < lx) continue;
          const beamHits = laserBeams.filter(ly => e.y + e.height >= ly - 18 && e.y <= ly + 18).length;
          if (beamHits === 0) continue;
          e.hp -= 0.38 * beamHits * dtScale;
          if (e.hp <= 0) {
            spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, isBossEnemy(e));
            gs.score += e.points * (ultimaActiveRef.current > 0 && activeUltiSkinRef.current.id === "gold" ? 2 : 1);
            runStatsRef.current.kills += 1;
            if (isBossEnemy(e)) runStatsRef.current.bosses += 1;
            checkAchievements(); audioRef.current.effect("explosion", settingsRef.current.soundVolume);
            ultimaChargeRef.current = Math.min(ULTI_MAX, ultimaChargeRef.current + (isBossEnemy(e) ? 25 : 4));
            laserChargeRef.current = Math.min(LASER_MAX, laserChargeRef.current + (isBossEnemy(e) ? 30 : 5));
            stealthChargeRef.current = Math.min(STEALTH_MAX, stealthChargeRef.current + (isBossEnemy(e) ? 30 : 4));
            e.dead = true;
            syncDisplay();
          }
        }
      }

      // ── Aircraft-ultimate visuals ──
      if (ultimaActiveRef.current > 0 && ["galaxy", "n1"].includes(activeUltiSkinRef.current.id)) {
        const holeX = CANVAS_W * .58, holeY = CANVAS_H * .5;
        const pulse = 1 + Math.sin(timeRef.current * .12) * .12;
        ctx.save();
        ctx.translate(holeX, holeY); ctx.scale(pulse, pulse);
        const vortex = ctx.createRadialGradient(0, 0, 4, 0, 0, 68);
        vortex.addColorStop(0, "#000000"); vortex.addColorStop(.45, "#10002d"); vortex.addColorStop(.72, "#5533ff99"); vortex.addColorStop(1, "#4488ff00");
        ctx.fillStyle = vortex; ctx.shadowColor = "#7755ff"; ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.arc(0, 0, 68, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#aaddff"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 58, 20, timeRef.current * .025, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // ── Draw player and summoned wingmen ──
      if (movementStunRef.current > 0) {
        ctx.save();
        ctx.fillStyle = "#ff8fda";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.shadowColor = "#ff8fda";
        ctx.shadowBlur = 8;
        ctx.fillText("BEWEGUNG BLOCKIERT", playerRef.current.x + PLAYER_W / 2, playerRef.current.y - 10);
        ctx.restore();
      }
      if (ultimateActiveRef.current > 0) {
        const cx = playerRef.current.x + PLAYER_W / 2;
        const cy = playerRef.current.y + PLAYER_H / 2;
        ctx.save();
        ctx.translate(cx, cy); ctx.scale(1.16, 1.16); ctx.translate(-cx, -cy);
        drawPlayerJet(ctx, playerRef.current.x, playerRef.current.y, gs.weaponTier, true, activeSkinRef.current, "#35bfff");
        ctx.restore();
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "#35bfff";
        ctx.shadowBlur = 24;
        for (const e of enemiesRef.current) {
          const ex = e.x + e.width / 2, ey = e.y + e.height / 2;
          const dx = ex - cx, dy = ey - cy;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const normalX = -dy / distance, normalY = dx / distance;
          const points: { x: number; y: number }[] = [{ x: cx, y: cy }];
          for (let i = 1; i < 9; i++) {
            const progress = i / 9;
            const jag = Math.sin(timeRef.current * 1.7 + i * 8.31 + e.x * .17 + e.y * .11) * (i % 2 === 0 ? 15 : 10);
            points.push({ x: cx + dx * progress + normalX * jag, y: cy + dy * progress + normalY * jag });
          }
          points.push({ x: ex, y: ey });

          const strokeBolt = (color: string, width: number) => {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.stroke();
          };
          strokeBolt("#168cff99", 10);
          strokeBolt("#57d9ff", 5);
          strokeBolt("#e9fbff", 1.8);

          for (const branchIndex of [3, 6]) {
            const start = points[branchIndex];
            const direction = branchIndex === 3 ? -1 : 1;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(start.x + dx * .07 + normalX * 24 * direction, start.y + dy * .07 + normalY * 24 * direction);
            ctx.lineTo(start.x + dx * .12 + normalX * 36 * direction, start.y + dy * .12 + normalY * 36 * direction);
            ctx.strokeStyle = "#8be8ff";
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
        }
        ctx.restore();
      } else if (stealthActiveRef.current > 0) {
        ctx.save();
        ctx.globalAlpha = 0.15 + 0.1 * Math.sin(timeRef.current * 0.25);
        ctx.shadowColor = "#00ffee"; ctx.shadowBlur = 20;
        drawPlayerJet(ctx, playerRef.current.x, playerRef.current.y, gs.weaponTier, false, activeSkinRef.current);
        ctx.restore();
      } else if (invincibleRef.current <= 0 || Math.floor(timeRef.current / 5) % 2 === 0) {
        {
          const shieldHp = playerShieldHpRef.current;
          const _sc = (activeSkinRef.current?.id === "n1" && shieldTimerRef.current > 0)
            ? (shieldHp <= 1 ? "#ff2200" : shieldHp <= 3 ? "#ff9900" : "#cfd6dc") : undefined;
          drawPlayerJet(ctx, playerRef.current.x, playerRef.current.y, gs.weaponTier, shieldTimerRef.current > 0, activeSkinRef.current, _sc);
        }
        if (ultimaActiveRef.current > 0 && ["xwing", "tiefighter", "n1"].includes(activeUltiSkinRef.current.id)) {
          const wingmen = activeUltiSkinRef.current.id === "tiefighter" ? [-72, -36, 36, 72] : [-50, 50];
          const allySkin = JET_SKINS.find(s => s.id === (activeUltiSkinRef.current.id === "tiefighter" ? "tiefighter" : "xwing")) ?? activeSkinRef.current;
          wingmen.forEach((wingOffset, index) => {
            const wingY = clamp(playerRef.current.y + wingOffset, 0, CANVAS_H - PLAYER_H);
            ctx.save();
            ctx.globalAlpha = 0.72 + 0.2 * Math.sin(timeRef.current * .18 + index);
            ctx.shadowColor = allySkin.glow;
            ctx.shadowBlur = 18;
            drawPlayerJet(ctx, playerRef.current.x - 18 - Math.abs(wingOffset) * .12, wingY, gs.weaponTier, false, allySkin);
            ctx.restore();
          });
        }
      }
      const droneX = playerRef.current.x + PLAYER_W / 2;
      const droneY = clamp(playerRef.current.y - 30, 22, CANVAS_H - 22);
      drawCombatDrone(ctx, droneX, droneY, timeRef.current, activeDroneSkinRef.current);

      // ── Engine exhaust ──
      if (Math.random() < 1 - Math.pow(0.6, dtScale)) {
        const tier = WEAPON_TIERS[gs.weaponTier];
        const glowColors = ["#00cfff", "#00cfff", "#00ff88", "#ff9900", "#ff4444", "#ff00ff"];
        particlesRef.current.push({
          x: playerRef.current.x + 2, y: playerRef.current.y + PLAYER_H / 2 + rand(-4, 4),
          vx: -rand(1, 3), vy: rand(-0.5, 0.5),
          life: rand(8, 18), maxLife: 18,
          color: glowColors[Math.min(gs.weaponTier, glowColors.length - 1)],
          radius: rand(2, 5),
        });
        void tier;
      }

      // ── Max score tracking ──
      if (gs.score > bestScoreRef.current) { bestScoreRef.current = gs.score; saveHighScore(gs.score); }

      // ── HUD ──
      drawHUD(ctx, gs, ultimaChargeRef.current, ultimaActiveRef.current, laserChargeRef.current, laserActiveRef.current, stealthChargeRef.current, stealthActiveRef.current, healChargeRef.current, healActiveRef.current, ultimateChargeRef.current, ultimateActiveRef.current, bestScoreRef.current, activeUnlocksRef.current);

      // ── Virtual controls overlay ──
      if (showVirtualControlsRef.current) {
        drawVirtualControls(ctx, joystickRef.current, touchFireRef.current.active, ultimaChargeRef.current, ultimaActiveRef.current, laserChargeRef.current, laserActiveRef.current, stealthChargeRef.current, stealthActiveRef.current, healChargeRef.current, healActiveRef.current, ultimateChargeRef.current, ultimateActiveRef.current, activeUnlocksRef.current);
      }

      // Sync display once per ~30 frames for React state
      displaySyncTimerRef.current += dtScale;
      if (displaySyncTimerRef.current >= 30) {
        displaySyncTimerRef.current = 0;
        syncDisplay();
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [checkAchievements, fireBullets, spawnEnemy, startGame, syncDisplay]);

  const handleSkinSelect = (id: string) => {
    const skin = JET_SKINS.find(s => s.id === id);
    if (!skin) return;
    setSelectedSkin(id);
    saveSkin(id);
    activeSkinRef.current = skin;
  };

  const handleUltiSkinSelect = (id: string) => {
    const skin = JET_SKINS.find(s => s.id === id);
    const owned = skin?.cost === 0 || loadUnlocks().includes(id);
    if (!skin || !owned) return;
    setSelectedUltiSkin(id);
    saveUltiSkin(id);
    activeUltiSkinRef.current = skin;
  };

  const handleDroneSkinSelect = (id: string) => {
    const skin = DRONE_SKINS.find(s => s.id === id);
    if (!skin) return;
    setSelectedDroneSkin(id);
    saveDroneSkin(id);
    activeDroneSkinRef.current = skin;
  };

  const handleAircraftUpgrade = () => {
    const currentLevel = aircraftLevels[selectedSkin] ?? 1;
    const cost = getAircraftUpgradeCost(currentLevel);
    if (cost === null || loadCoins() < cost) return;
    const next = { ...aircraftLevels, [selectedSkin]: currentLevel + 1 };
    spendCoins(cost);
    saveAircraftLevels(next);
    setAircraftLevels(next);
    setCoins(loadCoins());
    aircraftUpgradeRef.current = getAircraftUpgradeStats(currentLevel + 1);
    audioRef.current.effect("upgrade", settingsRef.current.soundVolume);
  };

  const handleDroneUpgrade = () => {
    const currentLevel = droneLevels[selectedDroneSkin] ?? 1;
    const cost = getDroneUpgradeCost(currentLevel);
    if (cost === null || loadCoins() < cost) return;
    const next = { ...droneLevels, [selectedDroneSkin]: currentLevel + 1 };
    spendCoins(cost);
    saveDroneLevels(next);
    setDroneLevels(next);
    setCoins(loadCoins());
    droneLevelRef.current = currentLevel + 1;
    audioRef.current.effect("upgrade", settingsRef.current.soundVolume);
  };

  const handleDailyChestClaim = () => {
    if (!claimDailyChest()) return;
    setCoins(loadCoins());
    audioRef.current.effect("upgrade", settingsRef.current.soundVolume);
  };

  const handleBuy = (itemId: string) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    if (!isShopRarityUnlocked(item.rarity, getPilotLevelForScore(loadHighScore()))) return;
    if (item.requires && !loadUnlocks().includes(item.requires)) return;
    if (loadCoins() < item.cost) return;
    spendCoins(item.cost);
    addUnlock(itemId);
    setCoins(loadCoins());
    setUnlockedItems(loadUnlocks());
  };

  const handleUnlockSkin = (skinId: string) => {
    const sk = JET_SKINS.find(s => s.id === skinId);
    if (!sk || sk.cost === 0) return;
    if (!isShopRarityUnlocked(sk.rarity, getPilotLevelForScore(loadHighScore()))) return;
    if (loadCoins() < sk.cost) return;
    spendCoins(sk.cost);
    addUnlock(skinId);
    setCoins(loadCoins());
    setUnlockedItems(loadUnlocks());
    handleSkinSelect(skinId);
  };

  const handleUnlockDroneSkin = (skinId: string) => {
    const skin = DRONE_SKINS.find(s => s.id === skinId);
    if (!skin || skin.cost === 0 || loadCoins() < skin.cost) return;
    if (!isShopRarityUnlocked(skin.rarity, getPilotLevelForScore(loadHighScore()))) return;
    spendCoins(skin.cost);
    addUnlock(skinId);
    setCoins(loadCoins());
    setUnlockedItems(loadUnlocks());
    handleDroneSkinSelect(skinId);
  };

  return (
    <div
      ref={shellRef}
      className={`game-shell flex flex-col items-center justify-center w-full bg-[#08080e] select-none ${settings.highContrast ? "high-contrast" : ""}`}
      style={{ touchAction: "none" }}
    >
      <div className="game-frame relative rounded overflow-hidden shadow-[0_0_40px_#00cfff22]"
        style={{ border: "1px solid rgba(0,207,255,0.15)" }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="game-canvas block"
          style={{ objectFit: "contain", touchAction: "none" }}
          tabIndex={0}
        />
        {achievementToast && (
          <div className="absolute left-1/2 top-4 z-50 w-[min(90%,390px)] -translate-x-1/2 rounded-xl border border-amber-300 bg-slate-950/95 p-3 text-center shadow-[0_0_30px_#ffcc0066]">
            <div className="text-xs font-black uppercase tracking-[.25em] text-amber-300">Erfolg freigeschaltet</div>
            <div className="mt-1 text-lg font-black text-white">{achievementToast.icon} {achievementToast.name}</div>
            <div className="text-sm text-slate-300">+{achievementToast.reward.toLocaleString("de-DE")} Credits</div>
          </div>
        )}
        {runUpgradeChoices.length > 0 && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-4">
            <div className="w-full max-w-2xl text-center">
              <div className="text-xs font-black uppercase tracking-[.3em] text-violet-300">Sektor geschafft</div>
              <h2 className="mt-2 text-3xl font-black text-white">WÄHLE EIN UPGRADE</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {runUpgradeChoices.map(upgrade => (
                  <button key={upgrade.id} onClick={() => chooseRunUpgrade(upgrade)} className="rounded-2xl border border-violet-400/60 bg-violet-950/60 p-5 text-left transition hover:-translate-y-1 hover:border-violet-200 hover:bg-violet-900/70">
                    <div className="text-4xl">{upgrade.icon}</div><div className="mt-3 font-black text-white">{upgrade.name}</div>
                    <div className="mt-1 text-sm text-slate-300">{upgrade.description}</div>
                    {runUpgradesRef.current[upgrade.id] > 0 && <div className="mt-3 text-xs font-bold text-violet-300">Aktuell: Stufe {runUpgradesRef.current[upgrade.id]}</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {displayState.started && !displayState.gameOver && (
          <div className="absolute top-[54px] right-2 z-10 flex gap-1.5">
            {fullscreenSupported && (
              <button
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? translated(language, "Vollbild beenden", "Exit fullscreen") : translated(language, "Vollbild öffnen", "Enter fullscreen")}
                title={isFullscreen ? translated(language, "Vollbild beenden", "Exit fullscreen") : translated(language, "Vollbild", "Fullscreen")}
                className="font-bold rounded px-2 py-1 text-sm"
                style={{ background: "rgba(4,10,24,0.85)", border: "1px solid #334466", color: "#7799bb" }}
              >
                {isFullscreen ? "↙" : "⛶"}
              </button>
            )}
            <button
              onClick={() => { stateRef.current.paused = !stateRef.current.paused; setPauseView("menu"); syncDisplay(); }}
              aria-label={displayState.paused ? translated(language, "Spiel fortsetzen", "Resume game") : translated(language, "Spiel pausieren", "Pause game")}
              className="font-bold rounded px-2 py-1 text-sm"
              style={{ background: "rgba(4,10,24,0.85)", border: "1px solid #334466", color: "#7799bb" }}
            >
              {displayState.paused ? translated(language, "▶ WEITER", "▶ RESUME") : "⏸"}
            </button>
          </div>
        )}
        {!displayState.started && (
          <HangarOverlay
            selectedSkin={selectedSkin}
            selectedUltiSkin={selectedUltiSkin}
            selectedDroneSkin={selectedDroneSkin}
            coins={coins}
            highScore={highScore}
            unlockedItems={unlockedItems}
            aircraftLevels={aircraftLevels}
            droneLevels={droneLevels}
            hasSave={saveExistsRef.current}
            saveData={saveExistsRef.current ? loadSave() : null}
            onStart={() => startGame(saveExistsRef.current)}
            onNewGame={() => startGame(false)}
            onSkinSelect={handleSkinSelect}
            onUltiSkinSelect={handleUltiSkinSelect}
            onDroneSkinSelect={handleDroneSkinSelect}
            onBuy={handleBuy}
            onUnlockSkin={handleUnlockSkin}
            onUnlockDroneSkin={handleUnlockDroneSkin}
            onAircraftUpgrade={handleAircraftUpgrade}
            onDroneUpgrade={handleDroneUpgrade}
            onDailyChestClaim={handleDailyChestClaim}
            fullscreenSupported={fullscreenSupported}
            isFullscreen={isFullscreen}
            onFullscreenToggle={toggleFullscreen}
            onAdminActivate={() => {
              setCoinsAbsolute(99999999);
              unlockAll();
              setCoins(loadCoins());
              setUnlockedItems(loadUnlocks());
            }}
            settings={settings}
            onSettingsChange={updateSettings}
            achievements={achievements}
          />
        )}
        {displayState.started && displayState.paused && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(2,8,20,0.86)" }}>
            {pauseView === "settings" ? (
              <div className="pause-panel h-full w-full max-w-2xl overflow-hidden rounded-2xl" style={{ background: "#071126", border: "1px solid #285078" }}>
                <SettingsScreen settings={settings} onChange={updateSettings} onBack={() => setPauseView("menu")} />
              </div>
            ) : (
              <div className="pause-panel w-full max-w-sm rounded-2xl p-5 text-center" style={{ background: "#071126", border: "1px solid #285078", boxShadow: "0 0 40px #00cfff22" }}>
                <div className="text-xs uppercase tracking-[0.3em] text-cyan-400">{translated(language, "Mission unterbrochen", "Mission paused")}</div>
                <h2 className="mt-2 text-3xl font-black text-white">{translated(language, "PAUSE", "PAUSED")}</h2>
                <div className="mt-5 flex flex-col gap-2">
                  <button autoFocus onClick={() => { stateRef.current.paused = false; setPauseView("menu"); syncDisplay(); }} className="pause-primary rounded-xl py-3 font-black tracking-widest">{translated(language, "▶ WEITERSPIELEN", "▶ RESUME")}</button>
                  <button onClick={() => startGame(false)} className="pause-secondary rounded-xl py-3 font-bold">{translated(language, "↻ NEU STARTEN", "↻ RESTART")}</button>
                  <button onClick={() => setPauseView("settings")} className="pause-secondary rounded-xl py-3 font-bold">{translated(language, "⚙ EINSTELLUNGEN", "⚙ SETTINGS")}</button>
                  <button onClick={returnToHangar} className="pause-secondary rounded-xl py-3 font-bold">{translated(language, "⌂ ZUM HANGAR", "⌂ RETURN TO HANGAR")}</button>
                </div>
                <div className="mt-4 text-xs text-slate-500">{translated(language, "P drücken, um weiterzuspielen", "Press P to resume")}</div>
              </div>
            )}
          </div>
        )}
        {displayState.started && !displayState.paused && tutorialStage >= 0 && (
          <div className="tutorial-card absolute bottom-5 left-1/2 z-20 w-[min(92%,430px)] -translate-x-1/2 rounded-2xl px-5 py-4 text-center" style={{ background: "rgba(4,12,28,0.94)", border: "1px solid #00cfff", boxShadow: "0 0 30px #00cfff33" }}>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-400">Training {tutorialStage + 1}/3</div>
            <div className="mt-1 text-lg font-black text-white">{tutorialStage === 0 ? translated(language, "Bewege deinen Jet", "Move your jet") : tutorialStage === 1 ? translated(language, "Eröffne das Feuer", "Open fire") : translated(language, "Bereit für die Mission!", "Ready for the mission!")}</div>
            <div className="mt-1 text-sm text-slate-300">{tutorialStage === 0 ? translated(language, "WASD / Pfeiltasten · auf Touch links ziehen", "WASD / arrow keys · drag left on touch") : tutorialStage === 1 ? translated(language, "LEERTASTE halten · auf Touch rechts halten", "Hold SPACE · hold right on touch") : translated(language, "Ultimates werden erklärt, sobald sie bereit sind.", "Ultimates are explained when they are ready.")}</div>
            {tutorialStage < 2 && <button onClick={finishTutorial} className="mt-2 text-xs font-bold text-slate-400 underline underline-offset-4">{translated(language, "Training überspringen", "Skip training")}</button>}
          </div>
        )}
      </div>
      {displayState.started && !displayState.gameOver && (
        <div className="mt-2 text-xs text-gray-600 tracking-wider hidden sm:block">
          WASD · SPACE — Schuss · Q — Jet-Ulti · E — Laser · R — Stealth · H — Heil · P — Pause
        </div>
      )}
    </div>
  );
}

// ─── Hangar Overlay ───────────────────────────────────────────────────────────

function HangarOverlay({
  selectedSkin, selectedUltiSkin, selectedDroneSkin, coins, highScore, unlockedItems, aircraftLevels, droneLevels, hasSave, saveData,
  onStart, onNewGame, onSkinSelect, onUltiSkinSelect, onDroneSkinSelect, onBuy, onUnlockSkin, onUnlockDroneSkin, onAircraftUpgrade, onDroneUpgrade, onDailyChestClaim, onAdminActivate,
  fullscreenSupported, isFullscreen, onFullscreenToggle, settings, onSettingsChange, achievements,
}: {
  selectedSkin: string; selectedUltiSkin: string; selectedDroneSkin: string; coins: number; highScore: number;
  aircraftLevels: Record<string, number>;
  droneLevels: Record<string, number>;
  unlockedItems: string[]; hasSave: boolean; saveData: { level: number; score: number; weaponTier: number } | null;
  onStart: () => void; onNewGame: () => void;
  onSkinSelect: (id: string) => void; onUltiSkinSelect: (id: string) => void; onDroneSkinSelect: (id: string) => void; onBuy: (id: string) => void; onUnlockSkin: (id: string) => void; onUnlockDroneSkin: (id: string) => void;
  onAircraftUpgrade: () => void;
  onDroneUpgrade: () => void;
  onDailyChestClaim: () => void;
  onAdminActivate: () => void;
  fullscreenSupported: boolean; isFullscreen: boolean; onFullscreenToggle: () => void;
  settings: GameSettings; onSettingsChange: (settings: GameSettings) => void;
  achievements: string[];
}) {
  const language = settings.language;
  const [view, setView] = useState<"main" | "briefing" | "upgrades" | "settings" | "leaderboard" | "achievements">(
    () => settings.tutorial && !briefingSeen() ? "briefing" : "main",
  );
  const [hoverSkin, setHoverSkin] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState(() => loadName());
  const [bulletColor, setBulletColor] = useState(() => loadBulletColor());
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  const previewRef = useRef<HTMLCanvasElement>(null);
  const activeSkinId = hoverSkin ?? selectedSkin;
  const skin = JET_SKINS.find(s => s.id === activeSkinId) ?? JET_SKINS[0];
  const nextPurchase = [...JET_SKINS.filter(s => s.cost > 0 && !unlockedItems.includes(s.id)), ...DRONE_SKINS.filter(s => s.cost > 0 && !unlockedItems.includes(s.id)), ...SHOP_ITEMS.filter(i => !unlockedItems.includes(i.id))]
    .sort((a, b) => a.cost - b.cost)[0];

  useEffect(() => {
    const c = previewRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 240, 140);
    const bg = ctx.createLinearGradient(0, 0, 0, 140);
    bg.addColorStop(0, "#0a1628"); bg.addColorStop(1, "#050a10");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 240, 140);
    const gg = ctx.createRadialGradient(120, 70, 4, 120, 70, 65);
    gg.addColorStop(0, skin.glow + "44"); gg.addColorStop(1, "transparent");
    ctx.fillStyle = gg; ctx.fillRect(0, 0, 240, 140);
    drawPlayerJet(ctx, 90, 56, 5, false, skin);
    drawCombatDrone(ctx, 105, 38, 0, DRONE_SKINS.find(s => s.id === selectedDroneSkin) ?? DRONE_SKINS[0]);
  }, [activeSkinId, skin, selectedDroneSkin]);

  if (view === "briefing") {
    return (
      <div className="hangar-layer absolute inset-0 overflow-hidden" style={{ background: "rgba(4,12,28,0.98)" }}>
        <BriefingScreen
          language={language}
          onDone={() => { markBriefingSeen(); setView("main"); }}
        />
      </div>
    );
  }

  if (view === "upgrades") {
    return (
      <div className="hangar-layer absolute inset-0 overflow-hidden" style={{ background: "rgba(4,12,28,0.97)" }}>
        <ShopScreen coins={coins} playerLevel={getPilotLevelForScore(highScore)} unlockedItems={unlockedItems} aircraftLevels={aircraftLevels} droneLevels={droneLevels} selectedSkin={selectedSkin} selectedUltiSkin={selectedUltiSkin} selectedDroneSkin={selectedDroneSkin}
          onBack={() => setView("main")} onBuy={onBuy} onUnlockSkin={onUnlockSkin} onSkinSelect={onSkinSelect}
          onUltiSkinSelect={onUltiSkinSelect} onUnlockDroneSkin={onUnlockDroneSkin} onDroneSkinSelect={onDroneSkinSelect} onAircraftUpgrade={onAircraftUpgrade} onDroneUpgrade={onDroneUpgrade} onDailyChestClaim={onDailyChestClaim} />
      </div>
    );
  }
  if (view === "settings") {
    return (
      <div className="hangar-layer absolute inset-0 overflow-hidden" style={{ background: "rgba(4,12,28,0.97)" }}>
        <SettingsScreen settings={settings} onChange={onSettingsChange} onBack={() => setView("main")} />
      </div>
    );
  }
  if (view === "leaderboard") {
    return (
      <div className="hangar-layer absolute inset-0 overflow-hidden" style={{ background: "rgba(4,12,28,0.97)" }}>
        <LeaderboardScreen onBack={() => setView("main")} />
      </div>
    );
  }
  if (view === "achievements") {
    return <div className="hangar-layer absolute inset-0 overflow-hidden" style={{ background: "rgba(4,12,28,0.97)" }}><AchievementsScreen unlocked={achievements} onBack={() => setView("main")} /></div>;
  }

  return (
    <div className="hangar-layer hangar-main absolute inset-0 flex flex-col items-center justify-between px-6 py-4 overflow-y-auto"
      style={{ background: "rgba(4,12,28,0.90)" }}>
      {/* ── Top bar ── */}
      <div className="w-full flex items-start justify-between">
        <div>
          <div className="font-black text-2xl tracking-widest" style={{ color: "#00cfff", textShadow: "0 0 14px #00cfff99" }}>
            FIGHTER COMMAND
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{translated(language, "2D Kampfjet-Simulator", "2D fighter jet simulator")}</div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div className="rounded-full border border-cyan-400/50 bg-cyan-950/60 px-3 py-1 text-sm font-black tracking-wider text-cyan-300"
            title={translated(language, "Höchstes erreichtes Spielerlevel", "Highest player level reached")}>
            🛡 PILOT-LEVEL {getPilotLevelForScore(highScore)}
          </div>
          <div className="text-yellow-300 font-bold text-sm">⭐ {highScore.toLocaleString("de-DE")}</div>
          <div className="text-amber-400 font-bold text-sm" title={translated(language, "Verfügbare Credits", "Available credits")}>💰 {coins.toLocaleString(language === "de" ? "de-DE" : "en-US")} Credits</div>
          <button onClick={() => setView("leaderboard")}
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ background: "rgba(0,180,255,0.12)", border: "1px solid #1a4466", color: "#44aadd" }}>
            {translated(language, "🏆 RANGLISTE", "🏆 LEADERBOARD")}
          </button>
          <button onClick={() => setView("achievements")} className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(255,190,0,.12)", border: "1px solid #665018", color: "#ffcc44" }}>🏅 ERFOLGE {achievements.length}/{ACHIEVEMENTS.length}</button>
        </div>
      </div>

      {/* ── Pilot name ── */}
      <div className="w-full flex items-center gap-2 px-1">
        <span className="text-slate-400 text-xs whitespace-nowrap">🧑‍✈️ Name:</span>
        <input
          value={playerName}
          onChange={e => { setPlayerName(e.target.value); saveName(e.target.value); }}
          maxLength={20}
          placeholder="Pilot"
          className="flex-1 px-2 py-1 rounded-lg text-sm font-bold text-white outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid #334466", color: "#00cfff" }}
        />
      </div>

      {/* ── Jet preview ── */}
      <div className="hangar-preview flex flex-col items-center gap-2">
        <div className="text-xs text-slate-500 uppercase tracking-widest">{translated(language, "Dein Jet", "Your jet")}</div>
        <div className="hangar-preview-canvas rounded-2xl overflow-hidden"
          style={{ border: `1.5px solid ${skin.glow}55`, boxShadow: `0 0 24px ${skin.glow}33` }}>
          <canvas ref={previewRef} width={240} height={140} className="block" />
        </div>
        <div className="font-bold text-white text-sm tracking-wide">{skin.name}</div>
        <div className="max-w-sm rounded-xl border px-3 py-2 text-center" style={{ borderColor: `${skin.glow}55`, background: `${skin.glow}12` }}>
          <div className="text-xs font-black uppercase tracking-wider" style={{ color: skin.glow }}>ULTI · {skin.ultiName} · 10 SEK.</div>
          <div className="mt-1 text-[11px] leading-snug text-slate-300">{skin.ultiDesc}</div>
        </div>
        <div className="rounded-full border border-cyan-400/40 bg-cyan-950/50 px-3 py-0.5 text-[11px] font-black tracking-wider text-cyan-300">
          JET-LEVEL {aircraftLevels[selectedSkin] ?? 1}
        </div>
        {/* Colour picker dots */}
        <div className="hangar-skins flex max-w-full gap-2.5 mt-0.5 overflow-x-auto px-2 py-2">
          {JET_SKINS.map(s => {
            const owned = s.cost === 0 || unlockedItems.includes(s.id);
            const active = s.id === selectedSkin;
            const previewing = s.id === hoverSkin;
            return (
              <button key={s.id}
                onClick={() => owned ? onSkinSelect(s.id) : setView("upgrades")}
                onMouseEnter={() => setHoverSkin(s.id)}
                onMouseLeave={() => setHoverSkin(null)}
                aria-label={owned ? `${s.name} auswählen` : `${s.name}, gesperrt, ${s.cost.toLocaleString("de-DE")} Credits`}
                title={owned ? s.name : `${s.name} — 🔒 ${s.cost.toLocaleString("de-DE")} Credits`}
                style={{
                  width: 22, height: 22, borderRadius: "50%", background: s.glow,
                  border: previewing ? `3px solid #fff` : active ? "3px solid #fff" : `2px solid ${s.glow}66`,
                  opacity: owned ? 1 : 0.3,
                  boxShadow: previewing ? `0 0 14px ${s.glow}, 0 0 4px #fff8` : active ? `0 0 10px ${s.glow}` : "none",
                  transform: previewing ? "scale(1.25)" : "scale(1)",
                  transition: "transform 0.12s, box-shadow 0.12s",
                }}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-slate-500 text-xs">Drohne:</span>
          {DRONE_SKINS.map(s => {
            const owned = s.cost === 0 || unlockedItems.includes(s.id);
            return <button key={s.id} onClick={() => owned ? onDroneSkinSelect(s.id) : setView("upgrades")}
              aria-label={owned ? `${s.name} Drohnen-Skin auswählen` : `${s.name} Drohnen-Skin gesperrt`}
              title={owned ? s.name : `${s.name} — 🔒 ${s.cost.toLocaleString("de-DE")} Credits`}
              style={{ width: 20, height: 20, borderRadius: "50%", background: s.stroke, opacity: owned ? 1 : .3,
                border: selectedDroneSkin === s.id ? "3px solid #fff" : `2px solid ${s.stroke}66`,
                boxShadow: selectedDroneSkin === s.id ? `0 0 10px ${s.stroke}` : "none" }} />;
          })}
          <span className="rounded-full border border-violet-400/40 bg-violet-950/50 px-2 py-0.5 text-[10px] font-black text-violet-300">LV {droneLevels[selectedDroneSkin] ?? 1}</span>
        </div>
        {/* Bullet color picker */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-slate-500 text-xs">{translated(language, "Schussfarbe:", "Shot color:")}</span>
          {[{ color: "#00ffff", label: "Blau" }, { color: "#ff3333", label: "Rot" }, { color: "#00ff88", label: "Grün" }, { color: "#ffff00", label: "Gelb" }, { color: "#ff00ff", label: "Lila" }].map(opt => (
            <button key={opt.color} onClick={() => { setBulletColor(opt.color); saveBulletColor(opt.color); }}
              title={opt.label}
              style={{
                width: 20, height: 20, borderRadius: "50%", background: opt.color,
                border: bulletColor === opt.color ? "3px solid #fff" : "2px solid transparent",
                boxShadow: bulletColor === opt.color ? `0 0 10px ${opt.color}` : "none",
                transform: bulletColor === opt.color ? "scale(1.2)" : "scale(1)",
                transition: "all 0.12s",
              }} />
          ))}
        </div>
        {/* Continue hint */}
        {hasSave && saveData && (
          <div className="text-xs text-emerald-400/80 mt-1">
            {translated(language, "Gespeichert", "Saved")}: {translated(language, "Level", "Level")} {saveData.level} · {saveData.score.toLocaleString(language === "de" ? "de-DE" : "en-US")} {translated(language, "Punkte", "points")} · {WEAPON_TIERS[saveData.weaponTier]?.name}
          </div>
        )}
        {nextPurchase && (
          <div className="hangar-progress w-full max-w-md mt-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{translated(language, "Nächstes Ziel", "Next goal")}: {nextPurchase.name}</span>
              <span>{Math.min(coins, nextPurchase.cost).toLocaleString("de-DE")} / {nextPurchase.cost.toLocaleString("de-DE")} Credits</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, coins / nextPurchase.cost * 100)}%` }} /></div>
          </div>
        )}
      </div>

      {/* ── Bottom buttons ── */}
      <div className="hangar-actions w-full flex gap-2">
        <button onClick={() => setView("upgrades")}
          className="flex-1 py-3 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95"
          style={{ background: "rgba(50,15,90,0.75)", border: "1.5px solid #7733bb", color: "#cc88ff" }}>
          <span aria-hidden="true">⚔️</span> <span className="hangar-action-label">SHOP</span>
        </button>
        <div className="flex-[1.6] flex flex-col gap-1.5">
          {hasSave ? (
            <>
              <button onClick={onStart}
                className="w-full py-2.5 rounded-xl font-bold text-base tracking-widest transition-all active:scale-95"
                style={{ background: "rgba(0,70,140,0.85)", border: "2px solid #00cfff", color: "#00cfff", textShadow: "0 0 10px #00cfff88" }}>
                {translated(language, "▶ WEITERSPIELEN", "▶ CONTINUE")}
              </button>
              <button onClick={onNewGame}
                className="w-full py-1.5 rounded-xl font-bold text-xs tracking-wider transition-all active:scale-95"
                style={{ background: "rgba(20,20,30,0.7)", border: "1px solid #334466", color: "#667799" }}>
                {translated(language, "NEU STARTEN", "NEW GAME")}
              </button>
            </>
          ) : (
            <button onClick={onStart}
              className="w-full py-3 rounded-xl font-bold text-lg tracking-widest transition-all active:scale-95"
              style={{ background: "rgba(0,70,140,0.85)", border: "2px solid #00cfff", color: "#00cfff", textShadow: "0 0 10px #00cfff88" }}>
              {translated(language, "▶ STARTEN", "▶ START")}
            </button>
          )}
        </div>
        <button onClick={() => setView("settings")}
          className="flex-1 py-3 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95"
          style={{ background: "rgba(15,30,45,0.75)", border: "1.5px solid #335566", color: "#7799bb" }}>
          <span aria-hidden="true">⚙️</span> <span className="hangar-action-label">{translated(language, "EINSTELLUNGEN", "SETTINGS")}</span>
        </button>
      </div>
      {/* Admin button (bottom-right) */}
      <div className="w-full flex justify-end gap-2 mt-1">
        <button onClick={() => setView("briefing")}
          className="text-xs rounded px-2 py-0.5"
          style={{ color: "#8bdfff", background: "rgba(0,180,255,0.08)", border: "1px solid #1a4466" }}>
          {translated(language, "? ANLEITUNG", "? HOW TO PLAY")}
        </button>
        {fullscreenSupported && (
          <button onClick={onFullscreenToggle}
            aria-label={isFullscreen ? translated(language, "Vollbild beenden", "Exit fullscreen") : translated(language, "Vollbild öffnen", "Enter fullscreen")}
            className="text-xs rounded px-2 py-0.5"
            style={{ color: "#7799bb", background: "rgba(0,180,255,0.08)", border: "1px solid #1a4466" }}>
            {isFullscreen ? translated(language, "↙ Vollbild beenden", "↙ Exit fullscreen") : translated(language, "⛶ Vollbild", "⛶ Fullscreen")}
          </button>
        )}
        <button onClick={() => setShowAdmin(v => !v)}
          className="text-xs rounded px-2 py-0.5"
          style={{ color: "#556688", background: "rgba(255,255,255,0.04)", border: "1px solid #223344" }}>
          ⚙ Admin
        </button>
      </div>
      {/* Admin panel */}
      {showAdmin && (
        <div className="absolute inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.88)" }}>
          <div className="flex flex-col gap-4 rounded-2xl p-6 w-72"
            style={{ background: "#0a0f20", border: "1.5px solid #2244aa" }}>
            <div className="font-black text-lg tracking-wide" style={{ color: "#00cfff" }}>ADMIN PANEL</div>
            <div className="text-slate-400 text-sm">Pilot: <span className="text-white font-bold">{playerName || "Pilot"}</span></div>
            <div className="text-slate-400 text-sm">Spieler aktiv: <span className="text-emerald-400 font-bold">1 (lokal)</span></div>
            <div className="text-slate-500 text-xs">Admin-Code eingeben:</div>
            <input
              value={adminCode}
              onChange={e => setAdminCode(e.target.value)}
              placeholder="Code..."
              className="px-3 py-2 rounded-lg text-sm font-mono outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid #334466", color: "#fff" }}
            />
            {adminMsg && <div className="text-emerald-400 text-sm font-bold">{adminMsg}</div>}
            <div className="flex gap-2">
              <button onClick={() => {
                if (adminCode === "buelli-best 1") {
                  onAdminActivate();
                  setAdminMsg("✓ Admin-Modus aktiv! Alle Inhalte freigeschaltet.");
                  setAdminCode("");
                } else {
                  setAdminMsg("✗ Falscher Code.");
                }
              }}
                className="flex-1 py-2 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ background: "rgba(0,80,200,0.5)", border: "1px solid #0066ff", color: "#66aaff" }}>
                Aktivieren
              </button>
              <button onClick={() => { setShowAdmin(false); setAdminMsg(""); setAdminCode(""); }}
                className="flex-1 py-2 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #334", color: "#667799" }}>
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shop Screen ──────────────────────────────────────────────────────────────

function ShopStarfield() {
  const stars = useMemo(() => Array.from({ length: 90 }, (_: unknown, i: number) => ({
    cx: ((i * 37 + 13) % 100), cy: ((i * 53 + 7) % 100),
    r: 0.5 + (i % 3) * 0.5, op: 0.3 + (i % 5) * 0.14,
  })), []);
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(170deg,#000012 0%,#02020e 55%,#050518 100%)" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {stars.map((s, i) => <circle key={i} cx={`${s.cx}%`} cy={`${s.cy}%`} r={s.r} fill="#fff" opacity={s.op} />)}
        <text x="50%" y="8%" textAnchor="middle" style={{ fontFamily: "'Courier New', monospace", fontSize: 11, fill: "#ffcc00", opacity: 0.6, fontWeight: "bold", letterSpacing: 2 }}>
          ✦ A LONG TIME AGO IN A GALAXY FAR, FAR AWAY ✦
        </text>
      </svg>
    </div>
  );
}

function ShopScreen({ coins, playerLevel, unlockedItems, aircraftLevels, droneLevels, selectedSkin, selectedUltiSkin, selectedDroneSkin, onBack, onBuy, onUnlockSkin, onSkinSelect, onUltiSkinSelect, onUnlockDroneSkin, onDroneSkinSelect, onAircraftUpgrade, onDroneUpgrade, onDailyChestClaim }: {
  coins: number; playerLevel: number; unlockedItems: string[]; selectedSkin: string; selectedUltiSkin: string; selectedDroneSkin: string;
  aircraftLevels: Record<string, number>;
  droneLevels: Record<string, number>;
  onBack: () => void; onBuy: (id: string) => void;
  onUnlockSkin: (id: string) => void; onSkinSelect: (id: string) => void;
  onUltiSkinSelect: (id: string) => void;
  onUnlockDroneSkin: (id: string) => void; onDroneSkinSelect: (id: string) => void;
  onAircraftUpgrade: () => void;
  onDroneUpgrade: () => void;
  onDailyChestClaim: () => void;
}) {
  const [dailyChestAvailable, setDailyChestAvailable] = useState(() => canClaimDailyChest());
  const selectedJet = JET_SKINS.find(s => s.id === selectedSkin) ?? JET_SKINS[0];
  const aircraftStats = getAircraftUpgradeStats(aircraftLevels[selectedSkin] ?? 1);
  const aircraftUpgradeCost = getAircraftUpgradeCost(aircraftStats.level);
  const selectedDrone = DRONE_SKINS.find(s => s.id === selectedDroneSkin) ?? DRONE_SKINS[0];
  const droneLevel = droneLevels[selectedDroneSkin] ?? 1;
  const droneUpgradeCost = getDroneUpgradeCost(droneLevel);
  const mkUpgrades = ["drone_mk2", "drone_mk3", "drone_mk4", "drone_mk5", "drone_mk6", "drone_mk7", "drone_mk8"].filter(id => unlockedItems.includes(id)).length;
  const droneStats = getDroneStats(mkUpgrades + droneLevel - 1);
  return (
    <div className="relative flex flex-col h-full p-4 gap-3 overflow-y-auto select-none text-white">
      <ShopStarfield />
      <div className="relative z-10 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-xl font-bold px-2">←</button>
        <h2 className="font-bold text-xl tracking-wide" style={{ textShadow: "0 0 12px #00cfff88" }}>SHOP</h2>
        <span className="rounded-full border border-cyan-400/50 bg-cyan-950/60 px-2.5 py-1 text-xs font-black text-cyan-300">PILOT-LEVEL {playerLevel}</span>
        <span className="ml-auto text-amber-300 font-bold text-sm">💰 {coins.toLocaleString("de-DE")}</span>
      </div>

      <button
        type="button"
        disabled={!dailyChestAvailable}
        onClick={() => {
          onDailyChestClaim();
          setDailyChestAvailable(canClaimDailyChest());
        }}
        className="relative z-10 flex shrink-0 items-center gap-4 rounded-2xl p-4 text-left transition active:scale-[.99] disabled:cursor-default disabled:opacity-60"
        style={{ background: dailyChestAvailable ? "linear-gradient(110deg,rgba(120,70,0,.82),rgba(40,24,4,.92))" : "rgba(20,24,36,.82)", border: `1px solid ${dailyChestAvailable ? "#fbbf24" : "#475569"}`, boxShadow: dailyChestAvailable ? "0 0 22px #f59e0b44" : "none" }}
      >
        <span className={`text-4xl ${dailyChestAvailable ? "animate-pulse" : "grayscale"}`}>🎁</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Tägliche Truhe</span>
          <span className="block font-black text-white">{dailyChestAvailable ? "+10.000 Credits abholen" : "Heute bereits abgeholt"}</span>
          <span className="block text-xs text-slate-300">{dailyChestAvailable ? "Jeden Tag wartet eine neue Belohnung auf dich." : "Morgen ist die nächste Truhe verfügbar."}</span>
        </span>
        <span className={`rounded-lg px-3 py-2 text-xs font-black ${dailyChestAvailable ? "bg-amber-400 text-slate-950" : "bg-slate-700 text-slate-300"}`}>
          {dailyChestAvailable ? "ÖFFNEN" : "✓ GEÖFFNET"}
        </span>
      </button>

      <div className="relative z-10 flex flex-wrap gap-2 text-[10px] font-black tracking-wider">
        {(Object.keys(SHOP_RARITIES) as ShopRarity[]).map(key => {
          const rarity = SHOP_RARITIES[key];
          const unlocked = isShopRarityUnlocked(key, playerLevel);
          return <span key={key} className="rounded px-2 py-0.5" style={{ opacity: unlocked ? 1 : .45, color: rarity.color, border: `1px solid ${rarity.color}`, boxShadow: unlocked ? `0 0 7px ${rarity.glow}` : undefined }}>{unlocked ? "" : "🔒 "}{rarity.label} · LVL {SHOP_RARITY_MIN_LEVEL[key]}</span>;
        })}
      </div>

      <div className="relative z-10 rounded-2xl p-4" style={{ background: `${selectedJet.glow}12`, border: `1px solid ${selectedJet.glow}77`, boxShadow: `0 0 18px ${selectedJet.glow}22` }}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl" style={{ background: selectedJet.body, border: `2px solid ${selectedJet.glow}`, boxShadow: `0 0 12px ${selectedJet.glow}66` }}>✈</div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Flugzeug verbessern</div>
            <div className="font-black">{selectedJet.name} · Level {aircraftStats.level}/10</div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${aircraftStats.level * 10}%`, boxShadow: "0 0 8px #22d3ee" }} /></div>
          </div>
          {aircraftUpgradeCost === null ? (
            <span className="shrink-0 rounded-lg border border-emerald-400/50 px-3 py-2 text-xs font-black text-emerald-300">MAX</span>
          ) : (
            <button onClick={onAircraftUpgrade} disabled={coins < aircraftUpgradeCost}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-black transition active:scale-95 disabled:opacity-40"
              style={{ background: "rgba(8,90,120,.65)", border: "1px solid #22d3ee", color: "#a5f3fc" }}>
              LEVEL {aircraftStats.level + 1}<br />💰 {aircraftUpgradeCost.toLocaleString("de-DE")}
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[10px] text-slate-300">
          <div className="rounded-lg bg-black/25 p-1.5"><b className="block text-white">+{aircraftStats.maxHpBonus}</b>HP</div>
          <div className="rounded-lg bg-black/25 p-1.5"><b className="block text-white">+{aircraftStats.damageBonus}</b>Schaden</div>
          <div className="rounded-lg bg-black/25 p-1.5"><b className="block text-white">+{aircraftStats.speedBonus.toFixed(1)}</b>Tempo</div>
          <div className="rounded-lg bg-black/25 p-1.5"><b className="block text-white">+{Math.round((1 - aircraftStats.fireRateMultiplier) * 100)}%</b>Feuerrate</div>
        </div>
      </div>

      <div className="relative z-10 rounded-2xl p-4" style={{ background: `${selectedDrone.stroke}12`, border: `1px solid ${selectedDrone.stroke}77`, boxShadow: `0 0 18px ${selectedDrone.stroke}22` }}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl" style={{ background: selectedDrone.body, border: `2px solid ${selectedDrone.stroke}`, boxShadow: `0 0 12px ${selectedDrone.stroke}66` }}>🛸</div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Drohne verbessern</div>
            <div className="font-black">{selectedDrone.name} · Level {droneLevel}/10</div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-violet-400" style={{ width: `${droneLevel * 10}%`, boxShadow: "0 0 8px #c084fc" }} /></div>
          </div>
          {droneUpgradeCost === null ? (
            <span className="shrink-0 rounded-lg border border-emerald-400/50 px-3 py-2 text-xs font-black text-emerald-300">MAX</span>
          ) : (
            <button onClick={onDroneUpgrade} disabled={coins < droneUpgradeCost}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-black transition active:scale-95 disabled:opacity-40"
              style={{ background: "rgba(80,25,120,.65)", border: "1px solid #c084fc", color: "#e9d5ff" }}>
              LEVEL {droneLevel + 1}<br />💰 {droneUpgradeCost.toLocaleString("de-DE")}
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px] text-slate-300">
          <div className="rounded-lg bg-black/25 p-1.5"><b className="block text-white">{droneStats.damage}</b>Schaden</div>
          <div className="rounded-lg bg-black/25 p-1.5"><b className="block text-white">{droneStats.guns}</b>Kanonen</div>
          <div className="rounded-lg bg-black/25 p-1.5"><b className="block text-white">+{Math.round((1 - droneStats.fireRateMultiplier) * 100)}%</b>Feuerrate</div>
        </div>
      </div>

      <div className="relative z-10 text-slate-400 text-xs uppercase tracking-widest">Jet-Skins</div>
      <div className="relative z-10 grid grid-cols-3 gap-2 shrink-0">
        {JET_SKINS.map(s => {
          const owned = s.cost === 0 || unlockedItems.includes(s.id);
          const active = s.id === selectedSkin;
          const canAfford = coins >= s.cost;
          const levelUnlocked = isShopRarityUnlocked(s.rarity, playerLevel);
          const rarity = SHOP_RARITIES[s.rarity];
          return (
            <button key={s.id}
              onClick={() => owned ? onSkinSelect(s.id) : canAfford && levelUnlocked ? onUnlockSkin(s.id) : undefined}
              disabled={!owned && !levelUnlocked}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95"
              style={{
                background: active ? s.glow + "22" : "rgba(255,255,255,0.05)",
                borderTop: active ? `2px solid ${s.glow}` : `1px solid ${s.glow}33`,
                borderBottom: active ? `2px solid ${s.glow}` : `1px solid ${s.glow}33`,
                borderLeft: `4px solid ${rarity.color}`,
                borderRight: `4px solid ${rarity.color}`,
                boxShadow: s.rarity === "legendary" || s.rarity === "ultraLegendary" ? `0 0 12px ${rarity.glow}` : undefined,
                opacity: !owned && (!canAfford || !levelUnlocked) ? 0.45 : 1,
              }}>
              <div className="w-5 h-5 rounded-full" style={{ background: s.glow, boxShadow: `0 0 8px ${s.glow}88` }} />
              <div className="text-xs font-bold">{s.name}</div>
              <div className="text-[9px] font-black leading-tight" style={{ color: s.glow }}>{s.ultiName} · 10 SEK.</div>
              <div className="line-clamp-3 text-[8px] leading-tight text-slate-400">{s.ultiDesc}</div>
              <div className="text-[10px] font-bold text-cyan-300">Level {aircraftLevels[s.id] ?? 1}</div>
              <div className="text-[9px] font-black tracking-wider" style={{ color: rarity.color, textShadow: `0 0 6px ${rarity.glow}` }}>{rarity.label}</div>
              {owned
                ? <div className="text-green-400 text-xs">{active ? "✓ Aktiv" : "Wählen"}</div>
                : <div className={`text-xs font-bold ${canAfford && levelUnlocked ? "text-amber-300" : "text-slate-500"}`}>
                    {!levelUnlocked ? `🔒 Level ${SHOP_RARITY_MIN_LEVEL[s.rarity]}` : canAfford ? `💰 ${formatLockedSkinPrice(s.cost)}` : `🔒 ${formatLockedSkinPrice(s.cost)}`}
                  </div>
              }
            </button>
          );
        })}
      </div>

      <div className="relative z-10 text-slate-400 text-xs uppercase tracking-widest mt-1">Flugzeug-Ulti wählen</div>
      <div className="relative z-10 grid grid-cols-3 gap-2 shrink-0">
        {JET_SKINS.filter(s => s.cost === 0 || unlockedItems.includes(s.id)).map(s => {
          const active = s.id === selectedUltiSkin;
          return (
            <button key={s.id} onClick={() => onUltiSkinSelect(s.id)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95"
              style={{ background: active ? s.glow + "22" : "rgba(255,255,255,0.05)", border: `1px solid ${active ? s.glow : s.glow + "44"}`, boxShadow: active ? `0 0 12px ${s.glow}55` : undefined }}>
              <div className="text-xs font-black" style={{ color: s.glow }}>{s.ultiName}</div>
              <div className="line-clamp-2 text-[8px] leading-tight text-slate-400">{s.ultiDesc}</div>
              <div className={`text-[10px] font-bold ${active ? "text-green-400" : "text-cyan-300"}`}>{active ? "✓ Aktiv" : "Auswählen"}</div>
            </button>
          );
        })}
      </div>

      <div className="relative z-10 text-slate-400 text-xs uppercase tracking-widest mt-1">Drohnen-Skins</div>
      <div className="relative z-10 grid grid-cols-3 gap-2 shrink-0">
        {DRONE_SKINS.map(s => {
          const owned = s.cost === 0 || unlockedItems.includes(s.id);
          const active = s.id === selectedDroneSkin;
          const canAfford = coins >= s.cost;
          const levelUnlocked = isShopRarityUnlocked(s.rarity, playerLevel);
          const rarity = SHOP_RARITIES[s.rarity];
          return <button key={s.id} onClick={() => owned ? onDroneSkinSelect(s.id) : canAfford && levelUnlocked ? onUnlockDroneSkin(s.id) : undefined} disabled={!owned && !levelUnlocked}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95"
            style={{ background: active ? s.stroke + "22" : "rgba(255,255,255,0.05)", border: `1px solid ${s.stroke}55`, borderLeft: `4px solid ${rarity.color}`, opacity: !owned && (!canAfford || !levelUnlocked) ? .45 : 1 }}>
            <div className="w-8 h-4 rounded-full" style={{ background: s.body, border: `2px solid ${s.stroke}`, boxShadow: `0 0 8px ${s.stroke}` }} />
            <div className="text-xs font-bold">{s.name}</div>
            <div className="text-[9px] font-black" style={{ color: rarity.color }}>{rarity.label}</div>
            <div className="text-[10px] font-bold text-violet-300">Level {droneLevels[s.id] ?? 1}</div>
            {owned ? <div className="text-green-400 text-xs">{active ? "✓ Aktiv" : "Wählen"}</div> :
              <div className={`text-xs font-bold ${canAfford && levelUnlocked ? "text-amber-300" : "text-slate-500"}`}>{!levelUnlocked ? `🔒 Level ${SHOP_RARITY_MIN_LEVEL[s.rarity]}` : `${canAfford ? "💰" : "🔒"} ${formatLockedSkinPrice(s.cost)}`}</div>}
          </button>;
        })}
      </div>

      <div className="relative z-10 text-slate-400 text-xs uppercase tracking-widest mt-1">Upgrades</div>
      <div className="relative z-10 flex flex-col gap-2">
        {SORTED_SHOP_ITEMS.map(item => {
          const owned = unlockedItems.includes(item.id);
          const prerequisiteMet = !item.requires || unlockedItems.includes(item.requires);
          const levelUnlocked = isShopRarityUnlocked(item.rarity, playerLevel);
          const canAfford = coins >= item.cost && prerequisiteMet && levelUnlocked;
          const rarity = SHOP_RARITIES[item.rarity];
          return (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{
                background: owned ? "rgba(0,180,80,0.10)" : "rgba(255,255,255,0.05)",
                borderTop: `1px solid ${owned ? "#00aa4444" : "#334"}`,
                borderBottom: `1px solid ${owned ? "#00aa4444" : "#334"}`,
                borderLeft: `5px solid ${rarity.color}`,
                borderRight: `5px solid ${rarity.color}`,
                boxShadow: item.rarity === "legendary" || item.rarity === "ultraLegendary" ? `0 0 14px ${rarity.glow}` : undefined,
              }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-sm">{item.name}</div>
                  <span className="text-[9px] font-black tracking-wider" style={{ color: rarity.color, textShadow: `0 0 6px ${rarity.glow}` }}>{rarity.label}</span>
                </div>
                <div className="text-slate-400 text-xs">{item.desc}</div>
              </div>
              {owned
                ? <span className="text-green-400 font-bold text-lg shrink-0">✓</span>
                : !levelUnlocked
                  ? <span className="text-slate-500 text-xs font-bold shrink-0">🔒 Level {SHOP_RARITY_MIN_LEVEL[item.rarity]}</span>
                : !prerequisiteMet
                  ? <span className="text-slate-500 text-xs font-bold shrink-0">🔒 Vorstufe</span>
                : <button onClick={() => canAfford && onBuy(item.id)} disabled={!canAfford}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: "rgba(80,50,0,0.6)", border: "1px solid #aa8800", color: "#ffcc44" }}>
                    💰 {item.cost.toLocaleString("de-DE")}
                  </button>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Leaderboard Screen ───────────────────────────────────────────────────────

function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const entries = loadLeaderboard();
  return (
    <div className="flex flex-col h-full px-4 py-4" style={{ color: "#c8d8f0" }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-xs px-3 py-1 rounded font-bold"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid #334466", color: "#7799bb" }}>
          ← ZURÜCK
        </button>
        <div className="font-black text-lg tracking-widest" style={{ color: "#ffcc00", textShadow: "0 0 12px #ffcc0099" }}>
          🏆 RANGLISTE
        </div>
        <div className="text-xs text-slate-500 ml-auto">(lokal – dieses Gerät)</div>
      </div>
      {entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          Noch keine Einträge. Spiel beenden um deinen Score zu speichern!
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1 pr-1" style={{ maxHeight: "calc(100% - 60px)" }}>
          {entries.slice(0, 30).map((e, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: i === 0 ? "rgba(255,204,0,0.12)" : i === 1 ? "rgba(180,180,180,0.10)" : i === 2 ? "rgba(180,90,0,0.10)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${i === 0 ? "#ffcc0040" : i < 3 ? "#33445540" : "#1a2a3a"}`,
              }}>
              <span className="text-xs font-black w-6 text-center" style={{ color: i === 0 ? "#ffcc00" : i === 1 ? "#aabbcc" : i === 2 ? "#cc8844" : "#446677" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </span>
              <span className="flex-1 text-sm font-bold truncate" style={{ color: i < 3 ? "#e0f0ff" : "#8899bb" }}>
                {e.name}
              </span>
              <span className="text-sm font-black tabular-nums" style={{ color: i === 0 ? "#ffcc00" : "#00cfff" }}>
                {e.score.toLocaleString("de-DE")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AchievementsScreen({ unlocked, onBack }: { unlocked: string[]; onBack: () => void }) {
  return <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 text-white">
    <div className="flex items-center gap-3"><button onClick={onBack} className="min-h-11 min-w-11 text-xl text-slate-300">←</button><h2 className="text-xl font-black tracking-wide">MISSIONEN & ERFOLGE</h2><span className="ml-auto text-amber-300">{unlocked.length}/{ACHIEVEMENTS.length}</span></div>
    <p className="text-sm text-slate-400">Erfülle diese Ziele innerhalb eines Einsatzes. Belohnungen werden sofort gutgeschrieben.</p>
    <div className="grid gap-3 sm:grid-cols-2">{ACHIEVEMENTS.map(a => { const done = unlocked.includes(a.id); return <div key={a.id} className="rounded-2xl border p-4" style={{ borderColor: done ? "#facc15" : "#334155", background: done ? "rgba(120,85,0,.2)" : "rgba(15,23,42,.7)" }}>
      <div className="flex items-start gap-3"><div className={`text-3xl ${done ? "" : "grayscale opacity-40"}`}>{a.icon}</div><div><div className="font-black">{a.name} {done && "✓"}</div><div className="text-sm text-slate-400">{a.description}</div><div className="mt-2 text-xs font-bold text-amber-300">Belohnung: {a.reward.toLocaleString("de-DE")} Credits</div></div></div>
    </div>})}</div>
  </div>;
}

// ─── First-mission briefing ───────────────────────────────────────────────────

function BriefingScreen({ language, onDone }: { language: GameSettings["language"]; onDone: () => void }) {
  const sections = language === "de" ? [
    { icon: "🎯", title: "Dein Auftrag", text: "Fliege nach rechts durch immer schwierigere Sektoren, besiege Gegner und sammle Punkte. Dein Level steigt automatisch mit deiner Punktzahl; Bosskämpfe markieren wichtige Etappen." },
    { icon: "❤", title: "Überleben", text: "Treffer kosten HP. Sind deine HP leer, verlierst du ein Leben und startest mit voller Energie neu. Nach dem letzten Leben endet die Mission. Schilde fangen Treffer ab." },
    { icon: "📦", title: "Power-ups", text: "Abgeschossene Gegner können Heilung, Schilde und Geschwindigkeits-Boosts fallen lassen. Fliege durch ein Power-up, um es sofort einzusammeln." },
    { icon: "⚡", title: "Waffen & Ultimates", text: "Halte Feuer gedrückt. Jedes Flugzeug besitzt eine eigene 10-Sekunden-Ulti. Jet-Ulti, Laser, Stealth und Heilung laden sich im Kampf auf." },
    { icon: "⬆", title: "Fortschritt", text: "Nach geschafften Sektoren wählst du eines von drei Run-Upgrades. Checkpoints speichern deinen Lauf. Ein gespeicherter Einsatz kann später im Hangar fortgesetzt werden." },
    { icon: "💰", title: "Credits & Hangar", text: "Am Missionsende wird jeder Punkt zu einem Credit. Im Shop kaufst du damit dauerhafte Verbesserungen und Jet-Skins. Erfolge geben zusätzliche Credits." },
  ] : [
    { icon: "🎯", title: "Your mission", text: "Fly right through increasingly difficult sectors, defeat enemies, and score points. Your level rises automatically with your score; boss fights mark major milestones." },
    { icon: "❤", title: "Survival", text: "Hits cost HP. When HP reaches zero, you lose a life and return at full health. The mission ends after your last life. Shields absorb hits." },
    { icon: "📦", title: "Power-ups", text: "Defeated enemies may drop health, shields, and speed boosts. Fly through a power-up to collect it immediately." },
    { icon: "⚡", title: "Weapons & ultimates", text: "Hold fire to shoot continuously. Every aircraft has its own 10-second ultimate. Aircraft ultimate, laser, stealth, and healing charge during combat." },
    { icon: "⬆", title: "Progress", text: "After clearing sectors, choose one of three run upgrades. Checkpoints save your run, which you can continue later from the hangar." },
    { icon: "💰", title: "Credits & hangar", text: "At mission end, every point becomes one credit. Spend credits on permanent upgrades and jet skins. Achievements award extra credits." },
  ];
  const keyboardHelp = language === "de" ? KEYBOARD_CONTROL_HELP : [
    ["WASD / Arrow keys", "Move"], ["SPACE", "Shoot"], ["Q", "Aircraft ultimate"],
    ["E", "Laser ultimate"], ["R", "Stealth ultimate"], ["H", "Healing ultimate"], ["U", "Ultimate Ulti"], ["P", "Pause"],
  ] as const;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-5 text-white sm:px-7">
      <div className="mx-auto w-full max-w-4xl">
        <div className="text-center">
          <div className="text-xs font-black uppercase tracking-[.3em] text-cyan-400">{translated(language, "Einsatzbriefing", "Mission briefing")}</div>
          <h2 className="mt-1 text-2xl font-black sm:text-3xl">{translated(language, "SO FUNKTIONIERT FIGHTER COMMAND", "HOW FIGHTER COMMAND WORKS")}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-300">{translated(language, "Lies das Briefing einmal durch – danach übst du Bewegung und Schießen direkt im ersten Einsatz.", "Read this briefing once—then practice movement and shooting during your first mission.")}</p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(section => (
            <div key={section.title} className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
              <div className="flex items-center gap-2 font-black text-cyan-100"><span className="text-xl" aria-hidden="true">{section.icon}</span>{section.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{section.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-cyan-700/60 bg-cyan-950/25 p-4">
            <h3 className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">{translated(language, "Tastatur", "Keyboard")}</h3>
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {keyboardHelp.map(([key, desc]) => <div key={key} className="flex items-center gap-2 text-xs"><kbd className="min-w-[82px] rounded border border-slate-600 bg-slate-800 px-2 py-1 text-center font-mono text-white">{key}</kbd><span className="text-slate-300">{desc}</span></div>)}
            </div>
          </div>
          <div className="rounded-xl border border-violet-700/60 bg-violet-950/25 p-4">
            <h3 className="text-xs font-black uppercase tracking-[.2em] text-violet-300">{translated(language, "Touch-Steuerung", "Touch controls")}</h3>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <p><strong className="text-white">{translated(language, "Links ziehen:", "Drag left:")}</strong> {translated(language, "Jet mit dem virtuellen Joystick bewegen.", "Move the jet with the virtual joystick.")}</p>
              <p><strong className="text-white">FIRE:</strong> {translated(language, "gedrückt halten, um dauerhaft zu schießen.", "hold to keep firing.")}</p>
              <p><strong className="text-white">ULTI · LASER · STEALTH · HEAL:</strong> {translated(language, "antippen, sobald die jeweilige Fähigkeit bereit ist.", "tap once the corresponding ability is ready.")}</p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 mt-5 bg-gradient-to-t from-[#040c1c] via-[#040c1c] to-transparent pt-4 pb-1 text-center">
          <button autoFocus onClick={onDone} className="pause-primary min-h-12 w-full max-w-md rounded-xl px-6 py-3 font-black tracking-widest">
            {translated(language, "VERSTANDEN – ZUM HANGAR", "GOT IT — GO TO HANGAR")}
          </button>
          <div className="mt-2 text-[11px] text-slate-500">{translated(language, "Die Anleitung ist im Hangar jederzeit wieder erreichbar.", "You can reopen this guide from the hangar at any time.")}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

function SettingsScreen({ settings, onChange, onBack }: { settings: GameSettings; onChange: (settings: GameSettings) => void; onBack: () => void }) {
  const [name, setName] = useState(() => loadName());
  const language = settings.language;
  const keyboardHelp = language === "de" ? KEYBOARD_CONTROL_HELP : [
    ["WASD / Arrow keys", "Move"], ["SPACE", "Shoot"], ["Q", "Aircraft ultimate"],
    ["E", "Laser ultimate"], ["R", "Stealth ultimate"], ["H", "Healing ultimate"], ["U", "Ultimate Ulti"], ["P", "Pause"],
  ] as const;
  const mobileHelp = language === "de" ? MOBILE_CONTROL_HELP : [
    "Left side -> Joystick (move)", "FIRE -> Shoot", "ULTI -> Aircraft ultimate (Q)",
    "LASER -> Laser ultimate (E)", "STEALTH -> Stealth ultimate (R)", "HEAL -> Healing ultimate (H)",
  ] as const;
  const toggle = (key: "tutorial" | "reducedMotion" | "highContrast") => onChange({ ...settings, [key]: !settings[key] });
  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto text-white select-none">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label={translated(language, "Zurück", "Back")} className="min-h-11 min-w-11 text-slate-300 hover:text-white text-xl font-bold px-2">←</button>
        <h2 className="font-bold text-xl tracking-wide">{translated(language, "EINSTELLUNGEN", "SETTINGS")}</h2>
      </div>
      <div className="settings-grid grid gap-2 sm:grid-cols-2">
        <label className="rounded-xl border border-cyan-700/70 bg-cyan-950/30 p-3">
          <span className="block text-sm font-bold">{translated(language, "Sprache", "Language")}</span>
          <span className="mb-2 block text-xs text-slate-400">{translated(language, "Sprache der Menüs und Hinweise.", "Language used for menus and hints.")}</span>
          <select aria-label={translated(language, "Sprache auswählen", "Select language")} value={language} onChange={e => onChange({ ...settings, language: e.target.value as GameSettings["language"] })} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white">
            <option value="de">Deutsch</option><option value="en">English</option>
          </select>
        </label>
        <SettingToggle label={translated(language, "Einführung anzeigen", "Show tutorial")} description={translated(language, "Erklärt Bewegung und Schießen beim ersten Start.", "Explains movement and shooting on the first start.")} checked={settings.tutorial} onClick={() => toggle("tutorial")} />
        <SettingToggle label={translated(language, "Bewegung reduzieren", "Reduce motion")} description={translated(language, "Reduziert dekorative Effekte und Animationen.", "Reduces decorative effects and animations.")} checked={settings.reducedMotion} onClick={() => toggle("reducedMotion")} />
        <SettingToggle label={translated(language, "Hoher Kontrast", "High contrast")} description={translated(language, "Verstärkt Texte, Rahmen und Bedienelemente.", "Strengthens text, borders and controls.")} checked={settings.highContrast} onClick={() => toggle("highContrast")} />
        <VolumeSetting label={translated(language, "Soundeffekte", "Sound effects")} value={settings.soundVolume} onChange={value => onChange({ ...settings, soundVolume: value })} />
        <VolumeSetting label={translated(language, "Musik", "Music")} value={settings.musicVolume} onChange={value => onChange({ ...settings, musicVolume: value })} />
        <label className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
          <span className="block text-sm font-bold">{translated(language, "Touch-Steuerung", "Touch controls")}</span>
          <span className="mb-2 block text-xs text-slate-400">{translated(language, "Virtuelle Steuerung im Spielfeld.", "Virtual controls in the play area.")}</span>
          <select value={settings.touchControls} onChange={e => onChange({ ...settings, touchControls: e.target.value as GameSettings["touchControls"] })} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white">
            <option value="auto">{translated(language, "Automatisch", "Automatic")}</option><option value="always">{translated(language, "Immer anzeigen", "Always show")}</option><option value="never">{translated(language, "Nie anzeigen", "Never show")}</option>
          </select>
        </label>
      </div>
      <div className="text-slate-500 text-xs uppercase tracking-widest">{translated(language, "Tastatur", "Keyboard")}</div>
      <div className="flex flex-col gap-2">
        {keyboardHelp.map(([key, desc]) => (
          <div key={key} className="flex items-center gap-3">
            <kbd className="px-2 py-1 rounded-md bg-slate-800 text-slate-200 text-xs font-mono min-w-[120px] text-center border border-slate-600">{key}</kbd>
            <span className="text-slate-300 text-sm">{desc}</span>
          </div>
        ))}
      </div>
      <div className="text-slate-500 text-xs uppercase tracking-widest mt-2">{translated(language, "Mobil / Touch", "Mobile / Touch")}</div>
      <div className="flex flex-col gap-1 text-slate-300 text-sm">
        {mobileHelp.map((line) => (
          <div key={line}>{line.replaceAll("->", "→")}</div>
        ))}
      </div>
      <div className="text-slate-500 text-xs uppercase tracking-widest mt-2">{translated(language, "Piloten-Name", "Pilot name")}</div>
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={e => { setName(e.target.value); saveName(e.target.value); }}
          maxLength={20}
          placeholder="Pilot"
          className="flex-1 px-2 py-1.5 rounded-lg text-sm font-bold outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid #334466", color: "#00cfff" }}
        />
      </div>
      <div className="text-slate-500 text-xs uppercase tracking-widest mt-2">Shop</div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-slate-200"><strong className="text-amber-300">{translated(language, "Punkte → Credits:", "Points → credits:")}</strong> {translated(language, "Am Ende einer Mission erhältst du für jeden Punkt einen Credit. Beispiel: 1.000 Punkte = 1.000 Credits.", "At the end of a mission, you receive one credit for every point. Example: 1,000 points = 1,000 credits.")}</div>
    </div>
  );
}

function VolumeSetting({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="rounded-xl border border-slate-700 bg-slate-900/70 p-3"><span className="flex justify-between text-sm font-bold"><span>{label}</span><span>{Math.round(value * 100)}%</span></span><input className="mt-3 w-full accent-cyan-400" type="range" min="0" max="1" step="0.05" value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}

function SettingToggle({ label, description, checked, onClick }: { label: string; description: string; checked: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onClick} className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-left">
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-cyan-500" : "bg-slate-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} /></span>
      <span><span className="block text-sm font-bold text-white">{label}</span><span className="block text-xs text-slate-400">{description}</span></span>
    </button>
  );
}

// ─── Virtual controls overlay (drawn on canvas) ───────────────────────────────

const JOY_BASE_R = 56;
const JOY_KNOB_R = 22;
const FIRE_BTN_R = 46;
const FIRE_BTN_X = CANVAS_W - 80;
const FIRE_BTN_Y = CANVAS_H - 90;
const ULTI_BTN_X = CANVAS_W - 210;
const ULTI_BTN_Y = CANVAS_H - 90;
const ULTI_BTN_R = 36;
const ULTI_MAX = 300;
const ULTI_DURATION = 600;
const LASER_MAX = 520;
const LASER_DURATION = 600;
const LASER_BTN_X = CANVAS_W - 80;
const LASER_BTN_Y = CANVAS_H - 195;
const LASER_BTN_R = 36;
const STEALTH_MAX = 520;
const STEALTH_DURATION = 600;
const STEALTH_BTN_X = CANVAS_W - 210;
const STEALTH_BTN_Y = CANVAS_H - 195;
const STEALTH_BTN_R = 36;
const HEAL_MAX = 520;
const HEAL_DURATION = 120;
const HEAL_BTN_X = CANVAS_W - 340;
const HEAL_BTN_Y = CANVAS_H - 195;
const HEAL_BTN_R = 36;
const ULTIMATE_MAX = STEALTH_MAX;
const ULTIMATE_DURATION = 600;
const ULTIMATE_CHARGE_RATE = 0.05;
const ULTIMATE_DOT_INTERVAL = 60;
const ULTIMATE_DOT_DAMAGE = 8;
const ULTIMATE_HEAL = 3;
const ULTIMATE_SLOW_FACTOR = 0.45;
const ULTIMATE_BTN_X = CANVAS_W - 340;
const ULTIMATE_BTN_Y = CANVAS_H - 90;
const ULTIMATE_BTN_R = 38;

function drawVirtualControls(
  ctx: CanvasRenderingContext2D,
  js: { active: boolean; centerX: number; centerY: number; curX: number; curY: number },
  fireActive: boolean,
  ultimaCharge: number,
  ultimaActive: number,
  laserCharge: number,
  laserActive: number,
  stealthCharge: number,
  stealthActive: number,
  healCharge: number,
  healActive: number,
  ultimateCharge: number,
  ultimateActive: number,
  unlocks: string[],
) {
  ctx.save();
  ctx.globalAlpha = 0.45;

  // ── Joystick hint (left zone) — always show base when inactive ──
  const baseX = js.active ? js.centerX : 110;
  const baseY = js.active ? js.centerY : CANVAS_H - 100;

  // Base ring
  ctx.beginPath();
  ctx.arc(baseX, baseY, JOY_BASE_R, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffffff11";
  ctx.fill();

  // Knob
  let kx = baseX, ky = baseY;
  if (js.active) {
    const dx = js.curX - js.centerX;
    const dy = js.curY - js.centerY;
    const d = Math.hypot(dx, dy);
    const clamped = Math.min(d, JOY_BASE_R - JOY_KNOB_R);
    kx = js.centerX + (dx / (d || 1)) * clamped;
    ky = js.centerY + (dy / (d || 1)) * clamped;
  }
  ctx.beginPath();
  ctx.arc(kx, ky, JOY_KNOB_R, 0, Math.PI * 2);
  ctx.fillStyle = js.active ? "#00cfff99" : "#ffffff44";
  ctx.fill();
  ctx.strokeStyle = "#ffffff66";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── Fire button (right zone) ──
  ctx.beginPath();
  ctx.arc(FIRE_BTN_X, FIRE_BTN_Y, FIRE_BTN_R, 0, Math.PI * 2);
  ctx.fillStyle = fireActive ? "#ff443388" : "#ff443322";
  ctx.fill();
  ctx.strokeStyle = fireActive ? "#ff6644cc" : "#ff444466";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.globalAlpha = fireActive ? 0.95 : 0.5;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("FIRE", FIRE_BTN_X, FIRE_BTN_Y);

  // ── ULTI button ──
  const ultiReady = ultimaCharge >= ULTI_MAX && ultimaActive === 0;
  const ultiGlow = ultiReady ? (0.55 + 0.45 * Math.sin(Date.now() / 200)) : 0.45;
  ctx.globalAlpha = ultiGlow;
  ctx.beginPath();
  ctx.arc(ULTI_BTN_X, ULTI_BTN_Y, ULTI_BTN_R, 0, Math.PI * 2);
  ctx.fillStyle   = ultimaActive > 0 ? "#ff00ff55" : ultiReady ? "#cc00ff44" : "#44004422";
  ctx.strokeStyle = ultimaActive > 0 ? "#ff00ffcc" : ultiReady ? "#cc00ffcc" : "#88008866";
  ctx.lineWidth = 2.5;
  ctx.fill(); ctx.stroke();

  // Charge arc
  if (ultimaActive === 0 && ultimaCharge < ULTI_MAX) {
    const pct = ultimaCharge / ULTI_MAX;
    ctx.beginPath();
    ctx.arc(ULTI_BTN_X, ULTI_BTN_Y, ULTI_BTN_R - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.strokeStyle = "#aa00ff";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.globalAlpha = ultiReady ? 0.95 : 0.55;
  ctx.fillStyle = ultiReady ? "#ff00ff" : "#cc88cc";
  ctx.font = `bold ${ultiReady ? 12 : 10}px 'Inter', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ultimaActive > 0 ? "ULTI!" : "ULTI", ULTI_BTN_X, ULTI_BTN_Y);

  // ── LASER button ──
  const laserReady = laserCharge >= LASER_MAX && laserActive === 0;
  const laserGlow = laserReady ? (0.55 + 0.45 * Math.sin(Date.now() / 180)) : 0.45;
  ctx.globalAlpha = laserGlow;
  ctx.beginPath();
  ctx.arc(LASER_BTN_X, LASER_BTN_Y, LASER_BTN_R, 0, Math.PI * 2);
  ctx.fillStyle   = laserActive > 0 ? "#ff880055" : laserReady ? "#ff660044" : "#44110022";
  ctx.strokeStyle = laserActive > 0 ? "#ffaa00cc" : laserReady ? "#ff8800cc" : "#88440066";
  ctx.lineWidth = 2.5;
  ctx.fill(); ctx.stroke();

  if (laserActive === 0 && laserCharge < LASER_MAX) {
    const lp = laserCharge / LASER_MAX;
    ctx.beginPath();
    ctx.arc(LASER_BTN_X, LASER_BTN_Y, LASER_BTN_R - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lp);
    ctx.strokeStyle = "#ff6600"; ctx.lineWidth = 4; ctx.stroke();
  }

  ctx.globalAlpha = laserReady ? 0.95 : 0.55;
  ctx.fillStyle = laserReady ? "#ffaa00" : "#cc8844";
  ctx.font = `bold ${laserReady ? 11 : 9}px 'Inter', sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(laserActive > 0 ? "LASER!" : "LASER", LASER_BTN_X, LASER_BTN_Y);

  // ── STEALTH button ──
  if (unlocks.includes("stealth_ulti")) {
    const stealthReady = stealthCharge >= STEALTH_MAX && stealthActive === 0;
    const stealthGlow = stealthReady ? (0.55 + 0.45 * Math.sin(Date.now() / 160)) : 0.45;
    ctx.globalAlpha = stealthGlow;
    ctx.beginPath();
    ctx.arc(STEALTH_BTN_X, STEALTH_BTN_Y, STEALTH_BTN_R, 0, Math.PI * 2);
    ctx.fillStyle   = stealthActive > 0 ? "#00ffff33" : stealthReady ? "#00ddcc44" : "#00222222";
    ctx.strokeStyle = stealthActive > 0 ? "#00ffffcc" : stealthReady ? "#00ddcccc" : "#00888866";
    ctx.lineWidth = 2.5;
    ctx.fill(); ctx.stroke();

  if (stealthActive === 0 && stealthCharge < STEALTH_MAX) {
    const sp = stealthCharge / STEALTH_MAX;
    ctx.beginPath();
    ctx.arc(STEALTH_BTN_X, STEALTH_BTN_Y, STEALTH_BTN_R - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sp);
    ctx.strokeStyle = "#00ccbb"; ctx.lineWidth = 4; ctx.stroke();
  }

  ctx.globalAlpha = stealthReady ? 0.95 : 0.55;
  ctx.fillStyle = stealthActive > 0 ? "#00ffff" : stealthReady ? "#00ddcc" : "#339988";
  ctx.font = `bold ${stealthReady ? 10 : 9}px 'Inter', sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(stealthActive > 0 ? "STEALTH!" : "STEALTH", STEALTH_BTN_X, STEALTH_BTN_Y);
  }

  // ── HEAL button ──
  if (unlocks.includes("heal_ulti")) {
    const healReady = healCharge >= HEAL_MAX && healActive === 0;
    const healGlowA = healReady ? (0.55 + 0.45 * Math.sin(Date.now() / 160)) : 0.45;
    ctx.globalAlpha = healGlowA;
    ctx.beginPath();
    ctx.arc(HEAL_BTN_X, HEAL_BTN_Y, HEAL_BTN_R, 0, Math.PI * 2);
    ctx.fillStyle   = healActive > 0 ? "#ff006633" : healReady ? "#ff224444" : "#220a0a22";
    ctx.strokeStyle = healActive > 0 ? "#ff0066cc" : healReady ? "#ff2244cc" : "#88222266";
    ctx.lineWidth = 2.5;
    ctx.fill(); ctx.stroke();

  if (healActive === 0 && healCharge < HEAL_MAX) {
    const hp2 = healCharge / HEAL_MAX;
    ctx.beginPath();
    ctx.arc(HEAL_BTN_X, HEAL_BTN_Y, HEAL_BTN_R - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hp2);
    ctx.strokeStyle = "#ff4466"; ctx.lineWidth = 4; ctx.stroke();
  }

  if (unlocks.includes("ultimate_ulti")) {
    const ready = ultimateCharge >= ULTIMATE_MAX && ultimateActive === 0;
    ctx.globalAlpha = ready ? 0.9 : 0.5;
    ctx.beginPath(); ctx.arc(ULTIMATE_BTN_X, ULTIMATE_BTN_Y, ULTIMATE_BTN_R, 0, Math.PI * 2);
    ctx.fillStyle = ultimateActive > 0 ? "#0088ff88" : "#001b4433";
    ctx.strokeStyle = ready || ultimateActive > 0 ? "#45d8ff" : "#17608a";
    ctx.lineWidth = 3; ctx.fill(); ctx.stroke();
    if (ultimateActive === 0 && ultimateCharge < ULTIMATE_MAX) {
      ctx.beginPath();
      ctx.arc(ULTIMATE_BTN_X, ULTIMATE_BTN_Y, ULTIMATE_BTN_R - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ultimateCharge / ULTIMATE_MAX);
      ctx.strokeStyle = "#22aaff"; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.fillStyle = "#8eeaff"; ctx.font = "bold 10px 'Inter', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(ultimateActive > 0 ? "ULTIMATE!" : "ULTIMATE", ULTIMATE_BTN_X, ULTIMATE_BTN_Y);
  }

  ctx.globalAlpha = healReady ? 0.95 : 0.55;
  ctx.fillStyle = healActive > 0 ? "#ff6699" : healReady ? "#ff4466" : "#884455";
  ctx.font = `bold ${healReady ? 10 : 9}px 'Inter', sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(healActive > 0 ? "HEAL! ❤" : "HEAL ❤", HEAL_BTN_X, HEAL_BTN_Y);
  }

  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, gs: GameState, ultimaCharge: number, ultimaActive: number, laserCharge: number, laserActive: number, stealthCharge: number, stealthActive: number, healCharge: number, healActive: number, ultimateCharge: number, ultimateActive: number, bestScore: number, unlocks: string[]) {
  ctx.save();
  ctx.textBaseline = "top";

  // Top bar background
  ctx.fillStyle = "rgba(4,10,24,0.72)";
  ctx.fillRect(0, 0, CANVAS_W, 82);

  // Score
  ctx.fillStyle = "#00cfff";
  ctx.font = "bold 18px 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE`, 16, 6);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.fillText(`${gs.score}`, 16, 24);

  // Level
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 14px 'Inter', sans-serif";
  ctx.fillText(`LEVEL ${gs.level}`, CANVAS_W / 2, 4);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px 'Inter', sans-serif";
  ctx.fillText(WEAPON_TIERS[gs.weaponTier].name.toUpperCase(), CANVAS_W / 2, 22);

  // XP bar (progress to next level)
  const thresholds = LEVEL_THRESHOLDS;
  const lo = thresholds[gs.level - 1] ?? 0;
  const hi = thresholds[gs.level] ?? lo + 999;
  const pct = gs.level >= MAX_LEVEL ? 1 : Math.min(1, (gs.score - lo) / (hi - lo));
  const barX = CANVAS_W / 2 - 80, barY = 36, barW = 160, barH = 5;
  ctx.fillStyle = "#222";
  ctx.fillRect(barX, barY, barW, barH);
  const xpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  xpGrad.addColorStop(0, "#00cfff");
  xpGrad.addColorStop(1, "#7700ff");
  ctx.fillStyle = xpGrad;
  ctx.fillRect(barX, barY, barW * pct, barH);

  // HP bar
  const hpW = 130;
  ctx.textAlign = "right";
  ctx.fillStyle = "#ff4444";
  ctx.font = "bold 14px 'Inter', sans-serif";
  ctx.fillText("HP", CANVAS_W - hpW - 8, 6);
  ctx.fillStyle = "#222";
  ctx.fillRect(CANVAS_W - hpW - 4, 6, hpW, 12);
  const hpGrad = ctx.createLinearGradient(CANVAS_W - hpW - 4, 0, CANVAS_W - 4, 0);
  hpGrad.addColorStop(0, "#ff2222");
  hpGrad.addColorStop(1, "#ff8800");
  ctx.fillStyle = hpGrad;
  ctx.fillRect(CANVAS_W - hpW - 4, 6, hpW * (gs.hp / gs.maxHp), 12);

  // Lives
  ctx.textAlign = "right";
  ctx.fillStyle = "#aaa";
  ctx.font = "13px 'Inter', sans-serif";
  ctx.fillText(`LIVES: ${"★".repeat(Math.max(0, gs.lives))}`, CANVAS_W - 8, 24);

  // Best score
  if (bestScore > 0) {
    ctx.fillStyle = "#ffaa00";
    ctx.font = "10px 'Inter', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`BEST: ${bestScore.toLocaleString("de-DE")}`, CANVAS_W - 8, 39);
  }

  const drawUltBar = (
    label: string, key: string,
    charge: number, maxCharge: number, active: number, duration: number,
    x: number, y: number, w: number, h: number,
    activeColors: [string, string], chargeColors: [string, string], labelColor: string,
  ) => {
    const pct = Math.min(1, charge / maxCharge);
    const ready = pct >= 1 && active === 0;
    ctx.textAlign = "left"; ctx.font = "bold 9px 'Inter', sans-serif";
    ctx.fillStyle = ready ? labelColor : active > 0 ? labelColor + "cc" : "#556";
    ctx.fillText(label, x, y);
    ctx.fillStyle = "#111"; ctx.fillRect(x + 30, y, w, h);
    if (active > 0) {
      const ap = active / duration;
      const ag = ctx.createLinearGradient(x + 30, 0, x + 30 + w, 0);
      ag.addColorStop(0, activeColors[0]); ag.addColorStop(1, activeColors[1]);
      ctx.fillStyle = ag; ctx.fillRect(x + 30, y, w * ap, h);
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 120);
      ctx.fillStyle = labelColor; ctx.font = "bold 9px 'Inter', sans-serif";
      ctx.fillText("ACTIVE", x + w + 36, y);
      ctx.globalAlpha = 1;
    } else if (pct > 0) {
      const cg = ctx.createLinearGradient(x + 30, 0, x + 30 + w, 0);
      cg.addColorStop(0, chargeColors[0]); cg.addColorStop(1, chargeColors[1]);
      ctx.fillStyle = cg; ctx.fillRect(x + 30, y, w * pct, h);
      if (ready) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 200);
        ctx.fillStyle = labelColor; ctx.font = "bold 9px 'Inter', sans-serif";
        ctx.fillText(`${key} — READY!`, x + w + 36, y);
        ctx.globalAlpha = 1;
      }
    }
  };

  drawUltBar("JET ULTI", "Q", ultimaCharge, ULTI_MAX, ultimaActive, ULTI_DURATION,
    16, 43, 120, 5, ["#ff00ff","#8800ff"],  ["#6600bb","#cc00ff"], "#ff44ff");
  drawUltBar("LASER",   "E", laserCharge,   LASER_MAX,   laserActive,   LASER_DURATION,
    16, 53, 120, 5, ["#ff8800","#ffdd00"],  ["#cc4400","#ff8800"], "#ffaa22");
  if (unlocks.includes("stealth_ulti")) {
    drawUltBar("STEALTH", "R", stealthCharge, STEALTH_MAX, stealthActive, STEALTH_DURATION,
      16, 63, 120, 5, ["#00ffee","#0088ff"], ["#004488","#00aacc"], "#00ddcc");
  }
  if (unlocks.includes("heal_ulti")) {
    drawUltBar("HEAL", "H", healCharge, HEAL_MAX, healActive, HEAL_DURATION,
      16, 73, 120, 5, ["#ff6699","#ff0044"], ["#aa2233","#ff3366"], "#ff4466");
  }
  if (unlocks.includes("ultimate_ulti")) {
    drawUltBar("OMEGA", "U", ultimateCharge, ULTIMATE_MAX, ultimateActive, ULTIMATE_DURATION,
      190, 63, 120, 5, ["#55e8ff", "#087cff"], ["#075080", "#28c8ff"], "#62ddff");
  }

  ctx.restore();
}
