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
  getEnemySpawnRate,
  GAME_MODES,
  getDailyChallengeRules,
  getGameModeRules,
  getModeCoinMultiplier,
  getLevelForScore,
  getNormalBossDamage,
  getPilotLevelForScore,
  getLevelThreshold,
  HEAL_ULTI_RESTORE,
  isBossEligibleLevel,
  isLaserDeviceEligibleLevel,
  isMilestoneBossLevel,
  isTitanBossLevel,
  shouldUseAboveCloudsBackground,
  shouldUseCityBackground,
  shouldUseSpaceBackground,
  shouldShowVirtualControls,
  selectEnemyVariant,
  type GameMode,
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

interface BackgroundTransition {
  snapshot: HTMLCanvasElement;
  elapsed: number;
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
  isPoisonMissile?: boolean;
  normalBossProjectile?: boolean;
  nearMissed?: boolean;
  weaponId?: string;
}

interface Enemy {
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  width: number; height: number;
  type: "scout" | "fighter" | "bomber" | "boss" | "overlord" | "titan" | "interceptor" | "gunship" | "tiefighter" | "emeraldtiefighter" | "plasmawing" | "sentinel" | "laserdevice";
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
  poisonTimer?: number;
  poisonTickTimer?: number;
  titanShieldCooldown?: number;
  titanShieldTimer?: number;
  titanHealTimer?: number;
  titanDashCooldown?: number;
  titanDashTimer?: number;
  titanDashHomeX?: number;
  titanDashHomeY?: number;
  titanDashStageX?: number;
  titanDashTargetX?: number;
  titanDashTargetY?: number;
  titanReinforcementsSpawned?: boolean;
  ramDamage?: number;
  trackPlayerRam?: boolean;
  isGolden?: boolean;
  goldenTimer?: number;
  waveId?: number;
  bossTopPartHp?: number;
  bossBottomPartHp?: number;
  bossCannonsDisabled?: boolean;
  bossEngineDisabled?: boolean;
  archetype?: "healer" | "shield" | "kamikaze";
  eliteModifier?: "armored" | "swift" | "frenzied";
  supportCooldown?: number;
  baseShootCooldown?: number;
}

const isBossEnemy = (enemy: Enemy) => enemy.type === "boss" || enemy.type === "overlord" || enemy.type === "titan";
const BOSS_HEALTH_MULTIPLIER = 1.3;
const GOLDEN_ENEMY_CHANCE = 0.05;
const increasedBossHealth = (hp: number) => Math.round(hp * BOSS_HEALTH_MULTIPLIER);
const isTitanInvulnerable = (enemy: Enemy) => enemy.type === "titan" &&
  ((enemy.titanShieldTimer ?? 0) > 0 || (enemy.titanDashTimer ?? 0) > 0);

interface PowerUp {
  x: number; y: number;
  type: "health" | "shield" | "speed" | "speedboost";
  vy: number;
}

type WeaponCrateRarity = "selten" | "episch" | "legendär";
type WeaponCrateKind = "rockets" | "laser" | "plasma";
interface WeaponCrateDefinition {
  id: string;
  name: string;
  rarity: WeaponCrateRarity;
  kind: WeaponCrateKind;
  color: string;
  fireRate: number;
  damage: number;
}

type ShopRarity = "rare" | "epic" | "legendary" | "ultraLegendary" | "ultimate";

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

type KeyBindingAction = "up" | "down" | "left" | "right" | "fire" | "pause" | "ability1" | "ability2" | "ability3";
type KeyBindings = Record<KeyBindingAction, string>;

interface GameSettings {
  language: "de" | "en" | "tr" | "fr" | "es";
  tutorial: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  touchControls: "auto" | "always" | "never";
  autoFire: boolean;
  keyBindings: KeyBindings;
  soundVolume: number;
  musicVolume: number;
}

type RunUpgradeId = "rapid_fire" | "damage" | "max_hp" | "drone" | "critical" | "shield" |
  "missile_mastery" | "chain_lightning" | "cryo_rounds" | "glass_cannon" | "vampiric" | "graze_core" |
  "afterburner" | "extra_life" | "repair_nanites" | "bounty_hunter" | "boss_hunter" |
  "kinetic_accelerator" | "reactive_armor" | "salvager" | "flux_capacitor" | "shield_matrix";
interface RunUpgrade { id: RunUpgradeId; icon: string; name: string; description: string }
interface RunStats {
  kills: number;
  bosses: number;
  damageTaken: number;
  powerUps: number;
  flawlessKills: number;
  perfectBosses: number;
  fullHealthPickups: number;
  maxCombo: number;
  nearMisses: number;
  missions: number;
}
interface Achievement { id: string; icon: string; name: string; description: string; target: number; reward: number; stat: keyof RunStats }
interface FloatingText { x: number; y: number; text: string; color: string; life: number; maxLife: number }
type MissionType = "kills" | "combo" | "near_miss" | "flawless_boss";
interface Mission { type: MissionType; title: string; target: number; reward: number; completed: boolean }
interface ActiveWave { id: number; name: string; active: boolean; isMajor: boolean }

// ─── Constants ───────────────────────────────────────────────────────────────

const CANVAS_W = 900;
const CANVAS_H = 600;
const FRAME_MS = 1000 / 60;
const PLAYER_W = 52;
const PLAYER_H = 28;
const BASE_BULLET_SPEED = 10;
const ENEMY_BULLET_SPEED = 3;
const BACKGROUND_TRANSITION_MS = 1100;
const TITAN_SHIELD_COOLDOWN = 15 * 60;
const TITAN_SHIELD_DURATION = 5 * 60;
const TITAN_DASH_COOLDOWN = 10 * 60;
const LASER_DEVICE_CHANCE = 0.10;
const LASER_DEVICE_SHIELD_HP = 5;
const LASER_DEVICE_DAMAGE = 5;
const LASER_DEVICE_BEAM_WIDTH = 12;
const WEAPON_CRATE_INTERVAL_MS = 20_000;
const WEAPON_CRATE_DURATION_MS = 5_000;
const PROTECT_PACKAGE_MAX_HP = 300;
const PROTECT_PACKAGE_WIDTH = 72;
const PROTECT_PACKAGE_HEIGHT = 42;
const PROTECT_PACKAGE_MIN_Y = 115;
const PROTECT_PACKAGE_MAX_Y = CANVAS_H - 115 - PROTECT_PACKAGE_HEIGHT;
const PROTECT_PACKAGE_FIRE_INTERVAL_MS = 5_000;
const PROTECT_PACKAGE_SPEED = 2.35;
const PROTECT_PACKAGE_EVASION_LOOKAHEAD = 105;
const WEAPON_CRATES: readonly WeaponCrateDefinition[] = [
  { id: "falcon-rockets", name: "Falken-Raketen", rarity: "selten", kind: "rockets", color: "#60a5fa", fireRate: 720, damage: 9 },
  { id: "nova-laser", name: "Nova-Laser", rarity: "episch", kind: "laser", color: "#d946ef", fireRate: 105, damage: 3.2 },
  { id: "sun-plasma", name: "Sonnen-Plasma", rarity: "legendär", kind: "plasma", color: "#fbbf24", fireRate: 230, damage: 6 },
] as const;
const WEAPON_CRATE_RARITY_COLOR: Record<WeaponCrateRarity, string> = {
  selten: "#60a5fa",
  episch: "#d946ef",
  legendär: "#fbbf24",
};

function chooseProtectPackageTargetY(
  escort: { x: number; y: number; direction: number },
  bullets: readonly Bullet[],
  enemies: readonly Enemy[],
) {
  const centerX = escort.x + PROTECT_PACKAGE_WIDTH / 2;
  const patrolTarget = escort.direction > 0 ? PROTECT_PACKAGE_MAX_Y : PROTECT_PACKAGE_MIN_Y;
  const candidates: number[] = [escort.y];
  for (let y = PROTECT_PACKAGE_MIN_Y; y <= PROTECT_PACKAGE_MAX_Y; y += 18) candidates.push(y);
  candidates.push(PROTECT_PACKAGE_MAX_Y);

  let bestY = escort.y;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidateY of candidates) {
    const centerY = candidateY + PROTECT_PACKAGE_HEIGHT / 2;
    let score = Math.abs(candidateY - patrolTarget) * .18 + Math.abs(candidateY - escort.y) * .4;

    for (const bullet of bullets) {
      if (bullet.fromPlayer) continue;
      const relativeX = centerX - bullet.x;
      const crossingTime = Math.abs(bullet.vx) > .05 ? relativeX / bullet.vx : Number.POSITIVE_INFINITY;
      if (crossingTime < 0 || crossingTime > PROTECT_PACKAGE_EVASION_LOOKAHEAD) continue;
      const predictedY = bullet.y + bullet.vy * crossingTime;
      const clearance = PROTECT_PACKAGE_HEIGHT / 2 + 24;
      const distanceY = Math.abs(predictedY - centerY);
      if (distanceY < clearance) {
        const urgency = 1 - crossingTime / PROTECT_PACKAGE_EVASION_LOOKAHEAD;
        score += 12_000 * (1 - distanceY / clearance) * (.35 + urgency);
      }
    }

    for (const enemy of enemies) {
      if (enemy.dead || enemy.hp <= 0) continue;
      const relativeX = centerX - (enemy.x + enemy.width / 2);
      const crossingTime = Math.abs(enemy.vx) > .05 ? relativeX / enemy.vx : Number.POSITIVE_INFINITY;
      if (crossingTime < 0 || crossingTime > 90) continue;
      const predictedY = enemy.y + enemy.height / 2 + enemy.vy * crossingTime;
      const clearance = PROTECT_PACKAGE_HEIGHT / 2 + enemy.height / 2 + 20;
      const distanceY = Math.abs(predictedY - centerY);
      if (distanceY < clearance) {
        const urgency = 1 - crossingTime / 90;
        score += 18_000 * (1 - distanceY / clearance) * (.5 + urgency);
      }
    }

    if (score < bestScore) {
      bestScore = score;
      bestY = candidateY;
    }
  }
  return bestY;
}

function drawProtectPackage(ctx: CanvasRenderingContext2D, position: Vec2, hp: number, time: number) {
  const { x, y } = position;
  const width = PROTECT_PACKAGE_WIDTH;
  const height = PROTECT_PACKAGE_HEIGHT;
  const ratio = Math.max(0, hp / PROTECT_PACKAGE_MAX_HP);
  ctx.save();
  const glow = ratio > .35 ? "#38bdf8" : "#ff3344";
  ctx.shadowColor = glow;
  ctx.shadowBlur = 15 + Math.sin(time * .12) * 4;

  // Animated twin engines.
  for (const engineY of [y + 9, y + height - 9]) {
    const flame = 12 + Math.sin(time * .35 + engineY) * 4;
    const exhaust = ctx.createLinearGradient(x - flame, 0, x + 8, 0);
    exhaust.addColorStop(0, "#38bdf800");
    exhaust.addColorStop(.55, "#38bdf8aa");
    exhaust.addColorStop(1, "#ffffff");
    ctx.fillStyle = exhaust;
    ctx.beginPath();
    ctx.moveTo(x + 7, engineY - 4); ctx.lineTo(x - flame, engineY);
    ctx.lineTo(x + 7, engineY + 4); ctx.closePath(); ctx.fill();
  }

  // Armoured transport-drone silhouette.
  const hull = ctx.createLinearGradient(x, y, x + width, y + height);
  hull.addColorStop(0, "#334b68");
  hull.addColorStop(.48, "#17283f");
  hull.addColorStop(1, "#0b1424");
  ctx.fillStyle = hull;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 5);
  ctx.lineTo(x + width - 19, y + 2);
  ctx.lineTo(x + width, y + height / 2);
  ctx.lineTo(x + width - 19, y + height - 2);
  ctx.lineTo(x + 7, y + height - 5);
  ctx.lineTo(x, y + height / 2);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;

  // Cargo core, cockpit and targeting cannon.
  ctx.fillStyle = "#c08b2d";
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x + 16, y + 8, 27, height - 16, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#67e8f9";
  ctx.beginPath(); ctx.moveTo(x + 48, y + 9); ctx.lineTo(x + 61, y + height / 2);
  ctx.lineTo(x + 48, y + height - 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#dbeafe";
  ctx.fillRect(x + width - 2, y + height / 2 - 2, 12, 4);
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x + 8, y + 9, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 8, y + height - 9, 2.5, 0, Math.PI * 2); ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#fff7d6";
  ctx.font = "900 8px 'Inter', sans-serif";
  ctx.fillText("CARGO", x + 29.5, y + height / 2 - 4);
  ctx.fillStyle = "#101827";
  ctx.fillRect(x - 2, y + height + 9, width + 14, 7);
  ctx.fillStyle = ratio > .35 ? "#22c55e" : "#ef4444";
  ctx.fillRect(x - 2, y + height + 9, (width + 14) * ratio, 7);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px 'Inter', sans-serif";
  ctx.fillText(`SCHUTZZIEL · ${Math.ceil(hp)} HP`, x + width / 2, y + height + 20);
  ctx.restore();
}

function drawWeaponCrate(
  ctx: CanvasRenderingContext2D,
  player: Vec2,
  crate: WeaponCrateDefinition,
  active: boolean,
  time: number,
) {
  const x = player.x - 25;
  const y = player.y + PLAYER_H / 2;
  const rarityColor = WEAPON_CRATE_RARITY_COLOR[crate.rarity];
  ctx.save();
  ctx.shadowColor = rarityColor;
  ctx.shadowBlur = active ? 18 + Math.sin(time * .3) * 5 : 7;
  ctx.fillStyle = active ? crate.color + "aa" : "#101a2a";
  ctx.strokeStyle = rarityColor;
  ctx.lineWidth = active ? 3 : 2;
  if (crate.kind === "rockets") {
    // Armoured twin-pod with two visible launch tubes.
    ctx.beginPath();
    ctx.roundRect(x - 13, y - 11, 24, 22, 3);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = rarityColor;
    for (const py of [-5, 5]) {
      ctx.beginPath(); ctx.arc(x - 6, y + py, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillRect(x + 4, y - 7, 3, 14);
  } else if (crate.kind === "laser") {
    // Slim angular emitter with a bright focusing lens.
    ctx.beginPath();
    ctx.moveTo(x - 14, y); ctx.lineTo(x - 7, y - 9); ctx.lineTo(x + 10, y - 6);
    ctx.lineTo(x + 13, y); ctx.lineTo(x + 10, y + 6); ctx.lineTo(x - 7, y + 9);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rarityColor;
    ctx.beginPath(); ctx.arc(x - 6, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x, y - 1.5, 11, 3);
  } else {
    // Round plasma reactor with fins and a pulsing energy core.
    ctx.beginPath(); ctx.arc(x - 1, y, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rarityColor;
    ctx.beginPath(); ctx.arc(x - 1, y, active ? 5 + Math.sin(time * .35) : 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 9); ctx.lineTo(x - 2, y - 15); ctx.lineTo(x + 2, y - 9);
    ctx.moveTo(x - 6, y + 9); ctx.lineTo(x - 2, y + 15); ctx.lineTo(x + 2, y + 9);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x + 11, y);
  ctx.lineTo(player.x + 2, player.y + PLAYER_H / 2);
  ctx.stroke();
  ctx.restore();
}


const SHOP_RARITIES: Record<ShopRarity, { label: string; color: string; glow: string }> = {
  rare:      { label: "SELTEN",    color: "#a8b0ba", glow: "#d6dbe166" },
  epic:      { label: "EPISCH",    color: "#b44cff", glow: "#b44cff88" },
  legendary: { label: "LEGENDÄR", color: "#ffe600", glow: "#ffe600cc" },
  ultraLegendary: { label: "ULTRA LEGENDÄR", color: "#53d8ff", glow: "#00aaffee" },
  ultimate: { label: "ULTIMATE", color: "#e7edf7", glow: "#cbd5e1ee" },
} as const;
const ULTIMATE_GRADIENT = "linear-gradient(90deg, #f8fafc 0%, #67e8f9 22%, #c4b5fd 43%, #f9a8d4 63%, #fde68a 82%, #f8fafc 100%)";
const ULTIMATE_GLOW = "0 0 7px #f8fafc, 0 0 14px #67e8f9aa, 0 0 21px #f472b688";

function shopRarityLabelStyle(rarity: ShopRarity) {
  if (rarity === "ultimate") {
    return {
      color: "transparent",
      background: ULTIMATE_GRADIENT,
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      textShadow: "0 0 7px #ffffff99",
    };
  }
  return {
    color: SHOP_RARITIES[rarity].color,
    textShadow: `0 0 6px ${SHOP_RARITIES[rarity].glow}`,
  };
}

function shopRarityGlow(rarity: ShopRarity, size: number) {
  return rarity === "ultimate" ? ULTIMATE_GLOW : `0 0 ${size}px ${SHOP_RARITIES[rarity].glow}`;
}
const SHOP_RARITY_ORDER: Record<ShopRarity, number> = {
  rare: 0,
  epic: 1,
  legendary: 2,
  ultraLegendary: 3,
  ultimate: 4,
};
const SHOP_RARITY_MIN_LEVEL: Record<ShopRarity, number> = {
  rare: 1,
  epic: 5,
  legendary: 10,
  ultraLegendary: 15,
  ultimate: 20,
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

type WeaponCurrency = "credits" | "gems";
type WeaponPattern = "focused" | "twin" | "spread" | "rapid" | "missile";
interface WeaponDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: ShopRarity;
  cost: number;
  currency: WeaponCurrency;
  pattern: WeaponPattern;
  guns: number;
  damage: number;
  fireRate: number;
  color: string;
}

const WEAPONS: readonly WeaponDefinition[] = [
  { id: "pulse_cannon", name: "Falke MK-I", icon: "➤", description: "Zuverlässige, präzise Einzelkanone.", rarity: "rare", cost: 0, currency: "credits", pattern: "focused", guns: 1, damage: 2, fireRate: 250, color: "#35d7ff" },
  { id: "twin_fang", name: "Doppelzahn", icon: "ᐅᐅ", description: "Zwei parallele Läufe für konstanten Schaden.", rarity: "rare", cost: 35_000, currency: "credits", pattern: "twin", guns: 2, damage: 2, fireRate: 235, color: "#34d399" },
  { id: "nova_scatter", name: "Nova-Streuer", icon: "✦", description: "Breite Fächersalve gegen Gegnergruppen.", rarity: "epic", cost: 90_000, currency: "credits", pattern: "spread", guns: 5, damage: 2, fireRate: 390, color: "#c084fc" },
  { id: "volt_repeater", name: "Volt-Repetierer", icon: "ϟ", description: "Extrem schnelle Ionenprojektile.", rarity: "epic", cost: 900, currency: "gems", pattern: "rapid", guns: 2, damage: 2, fireRate: 105, color: "#facc15" },
  { id: "titan_lance", name: "Titanenlanze", icon: "◆", description: "Langsame, gebündelte Schüsse mit enormem Schaden.", rarity: "legendary", cost: 240_000, currency: "credits", pattern: "focused", guns: 1, damage: 12, fireRate: 520, color: "#fb7185" },
  { id: "seraph_barrage", name: "Seraph-Salve", icon: "♛", description: "Lenkraketen und Dreifachfeuer in einer Waffe.", rarity: "ultraLegendary", cost: 3_500, currency: "gems", pattern: "missile", guns: 3, damage: 7, fireRate: 260, color: "#67e8f9" },
  { id: "omega_prism", name: "Omega-Prisma", icon: "✺", description: "Ultimate Energiestreuer mit sieben Strahlen.", rarity: "ultimate", cost: 9_000, currency: "gems", pattern: "spread", guns: 7, damage: 8, fireRate: 175, color: "#f9a8d4" },
] as const;
const WEAPON_KEY = "fighter-command-weapons";
const WEAPON_LEVELS_KEY = "fighter-command-weapon-levels";
const MAX_WEAPON_LEVEL = 10;

function loadWeapons(): string[] {
  try {
    const raw = localStorage.getItem(WEAPON_KEY);
    const legacy = localStorage.getItem("fighter-command-weapon");
    const parsed = raw ? JSON.parse(raw) as unknown : legacy ? [legacy] : [WEAPONS[0].id];
    if (!Array.isArray(parsed)) return [WEAPONS[0].id];
    const valid = parsed.filter((id): id is string => typeof id === "string" && WEAPONS.some(weapon => weapon.id === id));
    return [...new Set(valid)].slice(0, 2).length ? [...new Set(valid)].slice(0, 2) : [WEAPONS[0].id];
  } catch { return [WEAPONS[0].id]; }
}
function saveWeapons(ids: string[]) { try { localStorage.setItem(WEAPON_KEY, JSON.stringify(ids.slice(0, 2))); } catch {} }
function loadWeaponLevels(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(WEAPON_LEVELS_KEY) ?? "{}") as unknown;
    if (!isRecord(parsed)) return {};
    return Object.fromEntries(WEAPONS.map(weapon => [weapon.id, Math.max(1, Math.min(MAX_WEAPON_LEVEL, Math.floor(finiteNumber(parsed[weapon.id]) ?? 1)))]));
  } catch { return {}; }
}
function saveWeaponLevels(levels: Record<string, number>) { try { localStorage.setItem(WEAPON_LEVELS_KEY, JSON.stringify(levels)); } catch {} }
function getWeaponUpgradeCost(level: number): number | null {
  return level >= MAX_WEAPON_LEVEL ? null : 120 + level * level * 55;
}
function getWeaponStats(weapon: WeaponDefinition, level: number) {
  const upgrades = Math.max(0, level - 1);
  return {
    damage: weapon.damage + upgrades * Math.max(1, Math.ceil(weapon.damage * .16)),
    fireRate: Math.max(65, weapon.fireRate * (1 - upgrades * .035)),
  };
}

// ─── Save / load ─────────────────────────────────────────────────────────────

const SAVE_KEY = "fighter-command-save";

interface SaveData {
  score: number; level: number; hp: number; maxHp: number;
  weaponTier: number; speed: number; lives: number; savedAt: number;
  runUpgrades?: Record<RunUpgradeId, number>;
  upgradeLevel?: number;
  aircraftLevel?: number;
  aircraftBuild?: AircraftBuild;
}

const EMPTY_RUN_UPGRADES: Record<RunUpgradeId, number> = {
  rapid_fire: 0, damage: 0, max_hp: 0, drone: 0, critical: 0, shield: 0,
  missile_mastery: 0, chain_lightning: 0, cryo_rounds: 0, glass_cannon: 0,
  vampiric: 0, graze_core: 0,
  afterburner: 0, extra_life: 0, repair_nanites: 0, bounty_hunter: 0, boss_hunter: 0,
  kinetic_accelerator: 0, reactive_armor: 0, salvager: 0, flux_capacitor: 0, shield_matrix: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function loadStringArray(key: string): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(saved) ? saved.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function saveGame(gs: GameState, runUpgrades: Record<RunUpgradeId, number>, upgradeLevel: number) {
  try {
    const data: SaveData = {
      score: gs.score, level: gs.level, hp: gs.hp, maxHp: gs.maxHp,
      weaponTier: gs.weaponTier, speed: gs.speed, lives: gs.lives,
      runUpgrades: { ...runUpgrades }, upgradeLevel,
      aircraftLevel: loadAircraftLevels()[loadSkin()] ?? 1,
      aircraftBuild: loadAircraftBuild(),
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* storage unavailable */ }
}

function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as unknown;
    if (!isRecord(saved)) return null;

    const score = finiteNumber(saved.score);
    const level = finiteNumber(saved.level);
    const hp = finiteNumber(saved.hp);
    const maxHp = finiteNumber(saved.maxHp);
    const weaponTier = finiteNumber(saved.weaponTier);
    const speed = finiteNumber(saved.speed);
    const lives = finiteNumber(saved.lives);
    const savedAt = finiteNumber(saved.savedAt);
    if ([score, level, hp, maxHp, weaponTier, speed, lives, savedAt].some(value => value === null)) return null;

    const savedRunUpgrades = isRecord(saved.runUpgrades) ? saved.runUpgrades : null;
    const rawAircraftBuild = isRecord(saved.aircraftBuild) ? saved.aircraftBuild : null;
    const savedAircraftBuild = rawAircraftBuild
      ? {
          wing: WING_MODULES.some(module => module.id === rawAircraftBuild.wing)
            ? rawAircraftBuild.wing as WingModuleId
            : "balanced",
          engine: ENGINE_MODULES.some(module => module.id === rawAircraftBuild.engine)
            ? rawAircraftBuild.engine as EngineModuleId
            : "ion",
          bodySkin: typeof rawAircraftBuild.bodySkin === "string" && JET_SKINS.some(skin => skin.id === rawAircraftBuild.bodySkin)
            ? rawAircraftBuild.bodySkin
            : loadSkin(),
          wingSkin: typeof rawAircraftBuild.wingSkin === "string" && JET_SKINS.some(skin => skin.id === rawAircraftBuild.wingSkin)
            ? rawAircraftBuild.wingSkin
            : loadSkin(),
          engineSkin: typeof rawAircraftBuild.engineSkin === "string" && JET_SKINS.some(skin => skin.id === rawAircraftBuild.engineSkin)
            ? rawAircraftBuild.engineSkin
            : loadSkin(),
        }
      : undefined;
    const runUpgrades = savedRunUpgrades
      ? Object.fromEntries(
          Object.keys(EMPTY_RUN_UPGRADES).map(id => [
            id,
            id === "extra_life"
              ? Math.min(1, Math.max(0, Math.floor(finiteNumber(savedRunUpgrades[id]) ?? 0)))
              : Math.max(0, Math.floor(finiteNumber(savedRunUpgrades[id]) ?? 0)),
          ]),
        ) as Record<RunUpgradeId, number>
      : undefined;

    return {
      score: Math.max(0, Math.floor(score!)),
      level: Math.max(1, Math.min(MAX_LEVEL, Math.floor(level!))),
      hp: Math.max(0, hp!),
      maxHp: Math.max(1, maxHp!),
      weaponTier: Math.max(0, Math.min(WEAPON_TIERS.length - 1, Math.floor(weaponTier!))),
      speed: Math.max(0.1, speed!),
      lives: Math.max(0, Math.floor(lives!)),
      savedAt: Math.max(0, savedAt!),
      runUpgrades,
      upgradeLevel: Math.max(0, Math.floor(finiteNumber(saved.upgradeLevel) ?? 0)),
      aircraftLevel: getAircraftUpgradeStats(finiteNumber(saved.aircraftLevel) ?? 1).level,
      aircraftBuild: savedAircraftBuild,
    };
  } catch { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}

// ─── Skins, shop & persistent data ───────────────────────────────────────────

const SKIN_KEY    = "fighter-command-skin";
const DRONE_SKIN_KEY = "fighter-command-drone-skin";
const WEAPON_CRATE_KEY = "fighter-command-weapon-crate";
const HS_KEY      = "fighter-command-hs";
const COINS_KEY   = "fighter-command-coins";
const GEMS_KEY    = "fighter-command-gems";
const STARTING_COINS = 30_000;
const DAILY_CHEST_KEY = "fighter-command-daily-chest";
const DAILY_CHEST_REWARDS = [10_000, 15_000] as const;
const UNLOCKS_KEY = "fighter-command-unlocks";
const AIRCRAFT_LEVELS_KEY = "fighter-command-aircraft-levels";
const DRONE_LEVELS_KEY = "fighter-command-drone-levels";
const ULTI_LOADOUT_KEY = "fighter-command-ulti-loadout";
const ULTI_LOADOUT_SLOTS = 3;

const JET_SKINS = [
  { id: "steel", name: "Aegis", body: "#1a2a4a", stroke: "#2a4a8a", glow: "#00cfff", cost: 0, rarity: "rare", ultiName: "Stahlfestung", ultiDesc: "Starker Schutzschild und stark verringerter Schaden." },
  { id: "fire", name: "Ignis", body: "#3a1500", stroke: "#8a3a00", glow: "#ff6600", cost: 50000, rarity: "rare", ultiName: "Feuersturm", ultiDesc: "Alle Gegner brennen und erleiden fortlaufend Schaden." },
  { id: "jade", name: "Viridia", body: "#0a2a1a", stroke: "#1a5a2a", glow: "#00ff88", cost: 50000, rarity: "rare", ultiName: "Lebensenergie", ultiDesc: "Heilt sofort 5 HP und aktiviert einen Schutzschild." },
  { id: "gold", name: "Midas", body: "#2a2000", stroke: "#5a4a00", glow: "#ffcc00", cost: 50000, rarity: "rare", ultiName: "Goldrausch", ultiDesc: "Doppelte Punkte und deutlich schnellere Feuerrate." },
  { id: "shadow", name: "Nyx", body: "#0d0d12", stroke: "#2a1a3a", glow: "#aa44ff", cost: 50000, rarity: "rare", ultiName: "Phantomflug", ultiDesc: "Unsichtbar und unverwundbar; endet mit einer Schockwelle." },
  { id: "crimson", name: "Ravena", body: "#2a0a0a", stroke: "#5a1a1a", glow: "#ff2244", cost: 50000, rarity: "rare", ultiName: "Blutrausch", ultiDesc: "Doppelter Schaden und massiv erhöhte Feuerrate." },
  { id: "galaxy", name: "Orion", body: "#06063a", stroke: "#1a1a6a", glow: "#4488ff", cost: 100000, rarity: "epic", ultiName: "Schwarzes Loch", ultiDesc: "Zieht Gegner zur Mitte und beschädigt sie dauerhaft." },
  { id: "neon", name: "Voltara", body: "#001a10", stroke: "#004422", glow: "#00ffcc", cost: 100000, rarity: "epic", ultiName: "Kettenblitz", ultiDesc: "Blitze springen fortlaufend durch alle Gegner." },
  { id: "arctic", name: "Boreas", body: "#142030", stroke: "#3a6a8a", glow: "#aaddff", cost: 100000, rarity: "epic", ultiName: "Absoluter Nullpunkt", ultiDesc: "Friert Gegner und gegnerische Projektile vollständig ein." },
  { id: "lava", name: "Vulkara", body: "#2a0800", stroke: "#7a2200", glow: "#ff4400", cost: 100000, rarity: "epic", ultiName: "Vulkanausbruch", ultiDesc: "Explosive Lavawellen verursachen hohen Flächenschaden." },
  { id: "xwing", name: "X-Wing", body: "#252528", stroke: "#505060", glow: "#ff2200", cost: 200000, rarity: "legendary", ultiName: "Rebellenangriff", ultiDesc: "Zwei verbündete X-Wings greifen mit dir gemeinsam an." },
  { id: "tiefighter", name: "TIE Fighter", body: "#101015", stroke: "#303040", glow: "#33ddff", cost: 200000, rarity: "legendary", ultiName: "Imperialer Schwarm", ultiDesc: "Vier TIE-Jäger umkreisen dich und feuern gemeinsam." },
  { id: "n1", name: "Naboo-Sternjäger", body: "#34383c", stroke: "#8c949b", glow: "#cfd6dc", cost: 400000, rarity: "ultraLegendary", ultiName: "Naboo-Blitz", ultiDesc: "Unverwundbar: Naboo-Blitz, Schwarzes Loch und gezielte X-Wing-Feuerbälle zugleich." },
  { id: "solaris", name: "Solaris Prime", body: "#4a1900", stroke: "#ff8a00", glow: "#fff06a", cost: 1000000, rarity: "ultimate", ultiName: "Phönix-Protokoll", ultiDesc: "Repariert den Jet vollständig, aktiviert einen Schild und verstärkt Kanonen und Feuerrate massiv." },
  { id: "voidreaper", name: "Void Reaper", body: "#10052d", stroke: "#6d28d9", glow: "#e879f9", cost: 1000000, rarity: "ultimate", ultiName: "Nullzone", ultiDesc: "Löscht gegnerische Projektile, verlangsamt alle Gegner und verdoppelt deinen Waffenschaden." },
] as const;
type JetSkin = typeof JET_SKINS[number];

const DRONE_SKINS = [
  { id: "drone_violet", name: "Amethyst-Wächter", body: "#24153c", stroke: "#b86cff", core: "#f0d5ff", cost: 0, rarity: "rare", ultiName: "Amethyst-Bastion", ultiDesc: "Verstärkt den Schild und verdoppelt den Drohnenschaden." },
  { id: "drone_ember", name: "Aschenfalke", body: "#3b1608", stroke: "#ff6a28", core: "#ffe0a8", cost: 25000, rarity: "rare", ultiName: "Glutsturm", ultiDesc: "Verbrennt alle Gegner und verdoppelt den Drohnenschaden." },
  { id: "drone_ion", name: "Ionensturm", body: "#092a38", stroke: "#22dfff", core: "#d9fbff", cost: 50000, rarity: "rare", ultiName: "Ionen-Kaskade", ultiDesc: "Kettenenergie trifft fortlaufend alle Gegner." },
  { id: "drone_phantom", name: "Nachtgeist", body: "#171224", stroke: "#e94cff", core: "#ffffff", cost: 100000, rarity: "epic", ultiName: "Phantomkern", ultiDesc: "Macht den Piloten unverwundbar und überlädt die Drohne." },
  { id: "drone_solar", name: "Sonnenlanze", body: "#332a05", stroke: "#ffe34c", core: "#fffbd1", cost: 200000, rarity: "legendary", ultiName: "Solar-Salve", ultiDesc: "Dreifache Drohnen-Feuerrate und dreifacher Schaden." },
  { id: "drone_frost", name: "Frostklinge", body: "#10273b", stroke: "#9ee8ff", core: "#ffffff", cost: 100000, rarity: "epic", ultiName: "Kryo-Impuls", ultiDesc: "Friert alle Gegner während der kombinierten Ulti ein." },
  { id: "drone_venom", name: "Vipernauge", body: "#102b16", stroke: "#66ff55", core: "#eaffd9", cost: 200000, rarity: "legendary", ultiName: "Toxische Wolke", ultiDesc: "Vergiftet alle Gegner und überlädt die Drohnenkanonen." },
  { id: "drone_nova", name: "Nova-Kern", body: "#351018", stroke: "#ff4f72", core: "#fff0b8", cost: 400000, rarity: "ultraLegendary", ultiName: "Supernova", ultiDesc: "Eine dauerhafte Nova-Welle fügt allen Gegnern hohen Schaden zu." },
  { id: "drone_void", name: "Leerenläufer", body: "#080914", stroke: "#6574ff", core: "#dfe4ff", cost: 400000, rarity: "ultraLegendary", ultiName: "Dimensionsriss", ultiDesc: "Reißt die Dimension auf und entreißt allen Gegnern sofort Lebensenergie." },
  { id: "drone_omega", name: "Seraph", body: "#eef2ff", stroke: "#67e8f9", core: "#f9a8d4", cost: 1000000, rarity: "ultimate", ultiName: "Omega-Protokoll", ultiDesc: "Aktiviert einen Titanenschild, friert alle Gegner ein und vervierfacht Drohnenschaden und Feuerrate." },
] as const;
type DroneSkin = typeof DRONE_SKINS[number];

type WingModuleId = "balanced" | "striker" | "bulwark";
type EngineModuleId = "ion" | "afterburner" | "phase";
type DroneRoleId = "assault" | "guardian" | "repair" | "collector";
type DroneWeaponId = "pulse" | "rail_lance" | "ion_spread";
interface DroneWeaponDefinition {
  id: DroneWeaponId;
  icon: string;
  name: string;
  description: string;
  fireRate: number;
  damageMultiplier: number;
  color: string;
}
interface AircraftBuild {
  wing: WingModuleId;
  engine: EngineModuleId;
  bodySkin: string;
  wingSkin: string;
  engineSkin: string;
}
interface DroneBuild {
  bodySkin: string;
  coreSkin: string;
  weaponSkin: string;
}

const AIRCRAFT_BUILD_KEY = "fighter-command-aircraft-build";
const HYBRID_ACTIVE_KEY = "fighter-command-hybrid-active";
const HYBRID_BUILD_COST = 100_000;
const DRONE_ROLE_KEY = "fighter-command-drone-role";
const DRONE_WEAPON_KEY = "fighter-command-drone-weapon";
const DRONE_BUILD_KEY = "fighter-command-drone-build";
const WING_MODULES: readonly { id: WingModuleId; icon: string; name: string; description: string; hp: number; damage: number; fireRate: number }[] = [
  { id: "balanced", icon: "◇", name: "Aegis-Flügel", description: "Ausgewogen und ohne Nachteile.", hp: 0, damage: 0, fireRate: 1 },
  { id: "striker", icon: "≫", name: "Jäger-Flügel", description: "+25 % Schaden, aber −2 maximale HP.", hp: -2, damage: .25, fireRate: 1 },
  { id: "bulwark", icon: "⬡", name: "Bollwerk-Flügel", description: "+5 maximale HP, aber 12 % langsameres Feuer.", hp: 5, damage: 0, fireRate: 1.12 },
] as const;
const ENGINE_MODULES: readonly { id: EngineModuleId; icon: string; name: string; description: string; speed: number; fireRate: number }[] = [
  { id: "ion", icon: "◉", name: "Ionenantrieb", description: "Stabiler Standardantrieb.", speed: 0, fireRate: 1 },
  { id: "afterburner", icon: "🔥", name: "Nachbrenner", description: "+0,8 Tempo, aber 8 % langsameres Feuer.", speed: .8, fireRate: 1.08 },
  { id: "phase", icon: "✦", name: "Phasenantrieb", description: "+0,35 Tempo und 10 % schnelleres Feuer.", speed: .35, fireRate: .9 },
] as const;
const DRONE_ROLES: readonly { id: DroneRoleId; icon: string; name: string; description: string }[] = [
  { id: "assault", icon: "⚔", name: "Angriff", description: "Schnelles Feuer und 35 % mehr Drohnenschaden." },
  { id: "guardian", icon: "🛡", name: "Wächter", description: "Lädt regelmäßig einen Schutzpunkt nach." },
  { id: "repair", icon: "✚", name: "Sanitäter", description: "Repariert alle 12 Sekunden einen HP." },
  { id: "collector", icon: "◆", name: "Sammler", description: "Zielsuchende Schüsse und 25 % mehr Credits aus Ereignissen." },
] as const;
const DRONE_WEAPONS: readonly DroneWeaponDefinition[] = [
  { id: "pulse", icon: "•", name: "Impulskanone", description: "Schnelle, präzise Standardschüsse.", fireRate: 1, damageMultiplier: 1, color: "#b86cff" },
  { id: "rail_lance", icon: "━", name: "Rail-Lanze", description: "Seltene, extrem schnelle Präzisionsschüsse mit hohem Schaden.", fireRate: 1.8, damageMultiplier: 2.4, color: "#fb7185" },
  { id: "ion_spread", icon: "ϟ", name: "Ionenstreuer", description: "Drei Energieschüsse decken einen breiten Bereich ab.", fireRate: 1.35, damageMultiplier: .72, color: "#22d3ee" },
] as const;

function loadAircraftBuild(): AircraftBuild {
  try {
    const parsed = JSON.parse(localStorage.getItem(AIRCRAFT_BUILD_KEY) ?? "{}") as Partial<AircraftBuild>;
    const fallbackSkin = loadSkin();
    const validSkin = (id: unknown) => typeof id === "string" && JET_SKINS.some(skin => skin.id === id) ? id : fallbackSkin;
    return {
      wing: WING_MODULES.some(module => module.id === parsed.wing) ? parsed.wing! : "balanced",
      engine: ENGINE_MODULES.some(module => module.id === parsed.engine) ? parsed.engine! : "ion",
      bodySkin: validSkin(parsed.bodySkin),
      wingSkin: validSkin(parsed.wingSkin),
      engineSkin: validSkin(parsed.engineSkin),
    };
  } catch {
    const fallbackSkin = loadSkin();
    return { wing: "balanced", engine: "ion", bodySkin: fallbackSkin, wingSkin: fallbackSkin, engineSkin: fallbackSkin };
  }
}
function saveAircraftBuild(build: AircraftBuild) { try { localStorage.setItem(AIRCRAFT_BUILD_KEY, JSON.stringify(build)); } catch {} }
function loadHybridActive() { try { return localStorage.getItem(HYBRID_ACTIVE_KEY) === "1"; } catch { return false; } }
function saveHybridActive(active: boolean) { try { localStorage.setItem(HYBRID_ACTIVE_KEY, active ? "1" : "0"); } catch {} }
function loadDroneRole(): DroneRoleId {
  try {
    const saved = localStorage.getItem(DRONE_ROLE_KEY) as DroneRoleId | null;
    return DRONE_ROLES.some(role => role.id === saved) ? saved! : "assault";
  } catch { return "assault"; }
}
function saveDroneRole(role: DroneRoleId) { try { localStorage.setItem(DRONE_ROLE_KEY, role); } catch {} }
function loadDroneWeapon(): DroneWeaponId {
  try {
    const saved = localStorage.getItem(DRONE_WEAPON_KEY) as DroneWeaponId | null;
    return DRONE_WEAPONS.some(weapon => weapon.id === saved) ? saved! : "pulse";
  } catch { return "pulse"; }
}
function saveDroneWeapon(weapon: DroneWeaponId) { try { localStorage.setItem(DRONE_WEAPON_KEY, weapon); } catch {} }
function loadDroneBuild(): DroneBuild {
  const fallback = loadDroneSkin();
  try {
    const parsed = JSON.parse(localStorage.getItem(DRONE_BUILD_KEY) ?? "{}") as Partial<DroneBuild>;
    const valid = (id: unknown) => typeof id === "string" && DRONE_SKINS.some(skin => skin.id === id) ? id : fallback;
    return { bodySkin: valid(parsed.bodySkin), coreSkin: valid(parsed.coreSkin), weaponSkin: valid(parsed.weaponSkin) };
  } catch { return { bodySkin: fallback, coreSkin: fallback, weaponSkin: fallback }; }
}
function saveDroneBuild(build: DroneBuild) { try { localStorage.setItem(DRONE_BUILD_KEY, JSON.stringify(build)); } catch {} }

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
  { id: "drone_mk3",     name: "Drohne MK III",     desc: "Zwei Kanonen und nochmals 12% schnelleres Feuer", cost: 100000, rarity: "epic", requires: "drone_mk2" },
  { id: "drone_mk4",     name: "Drohne MK IV",      desc: "+1 Drohnenschaden und nochmals 12% schneller",    cost: 200000, rarity: "legendary", requires: "drone_mk3" },
  { id: "drone_mk5",     name: "Drohne MK V",       desc: "Hochleistungsantrieb: nochmals 12% schneller",     cost: 200000, rarity: "legendary", requires: "drone_mk4" },
  { id: "drone_mk6",     name: "Drohne MK VI",      desc: "Drei Kanonen, +1 Schaden und nochmals 12% schneller", cost: 400000, rarity: "ultraLegendary", requires: "drone_mk5" },
  { id: "drone_mk7",     name: "Drohne MK VII",      desc: "Quantenkühlung: nochmals 12% schnelleres Feuer",  cost: 400000, rarity: "ultraLegendary", requires: "drone_mk6" },
  { id: "drone_mk8",     name: "Drohne MK VIII",     desc: "+1 Drohnenschaden bei maximaler Feuerrate",       cost: 400000, rarity: "ultraLegendary", requires: "drone_mk7" },
  { id: "ulti_boost",    name: "Ulti-Boost",       desc: "Ultis laden 50% schneller",                      cost: 50000,  rarity: "rare" },
  { id: "extra_life",    name: "+1 Leben",          desc: "Starte mit 4 statt 3 Leben",                     cost: 50000,  rarity: "rare" },
  { id: "weapon_head",   name: "Waffen-Vorstart",   desc: "Starte auf Waffentier 2",                        cost: 50000,  rarity: "rare" },
  { id: "clone_upgrade", name: "Flugzeug-Ulti ⬆", desc: "Die Flugzeug-Ulti lädt 25% schneller", cost: 50000, rarity: "rare" },
  { id: "laser_upgrade", name: "Laser-Ulti ⬆",     desc: "Laser macht 2× Schaden & hält 25% länger",       cost: 50000,  rarity: "rare" },
  { id: "clone_laser", name: "Flügelmann-Laser", desc: "Beschworene Flügelmänner kopieren den Laser", cost: 100000, rarity: "epic" },
  { id: "stealth_ulti",  name: "Stealth-Ulti 👁",  desc: "10 Sek. unsichtbar & unverwundbar  [Taste R]",    cost: 200000, rarity: "legendary" },
  { id: "heal_ulti",     name: "Heil-Ulti ❤",      desc: "Heilt 5 HP sofort [Taste H]",                    cost: 200000, rarity: "legendary" },
  { id: "poison_missiles_ulti", name: "Gift-Raketen-Ulti ☣", desc: "3 Lenkraketen: 20 Schaden + 5 Sek. Gift [Taste T]", cost: 200000, rarity: "legendary" },
  { id: "absorber_ulti", name: "Absorber-Ulti ◖", desc: "10 Sek. unzerstörbares pinkes Frontschild; Treffer erhöhen den Schaden auf 2×, 4×, dann 8× [Taste F]", cost: 400000, rarity: "ultraLegendary" },
  { id: "ultimate_ulti", name: "Ultimate Ulti ⚡", desc: "10 Sek. Titanenschild, 2× Schaden, Frost & Kettenblitze [Taste U]", cost: 1000000, rarity: "ultimate" },
  { id: "max_hp",        name: "Panzer-HP",         desc: "+5 maximale HP (dauerhaft)",                     cost: 50000,  rarity: "rare" },
  { id: "speed_item",    name: "Speed-Triebwerk",   desc: "+0.5 permanente Geschwindigkeit",                cost: 50000,  rarity: "rare" },
  { id: "armor",         name: "Panzerung",         desc: "Treffer geben nur 0.5 HP Schaden",               cost: 100000, rarity: "epic" },
] as const;
const SORTED_SHOP_ITEMS = [...SHOP_ITEMS].sort(
  (a, b) => SHOP_RARITY_ORDER[a.rarity] - SHOP_RARITY_ORDER[b.rarity] || a.cost - b.cost || a.name.localeCompare(b.name, "de"),
);
const SORTED_WEAPONS = [...WEAPONS].sort(
  (a, b) => SHOP_RARITY_ORDER[a.rarity] - SHOP_RARITY_ORDER[b.rarity] || a.cost - b.cost || a.name.localeCompare(b.name, "de"),
);
const SORTED_JET_SKINS = [...JET_SKINS].sort(
  (a, b) => SHOP_RARITY_ORDER[a.rarity] - SHOP_RARITY_ORDER[b.rarity] || a.cost - b.cost || a.name.localeCompare(b.name, "de"),
);
const SORTED_DRONE_SKINS = [...DRONE_SKINS].sort(
  (a, b) => SHOP_RARITY_ORDER[a.rarity] - SHOP_RARITY_ORDER[b.rarity] || a.cost - b.cost || a.name.localeCompare(b.name, "de"),
);

type UltiLoadoutId = "jet" | "laser" | "stealth_ulti" | "heal_ulti" | "poison_missiles_ulti" | "absorber_ulti" | "ultimate_ulti";
const ULTI_LOADOUT_OPTIONS: readonly { id: UltiLoadoutId; name: string; key: string; requires?: string }[] = [
  { id: "jet", name: "Flugzeug-Ulti", key: "Q" },
  { id: "laser", name: "Laser-Ulti", key: "E" },
  { id: "stealth_ulti", name: "Stealth-Ulti", key: "R", requires: "stealth_ulti" },
  { id: "heal_ulti", name: "Heil-Ulti", key: "H", requires: "heal_ulti" },
  { id: "poison_missiles_ulti", name: "Gift-Raketen-Ulti", key: "T", requires: "poison_missiles_ulti" },
  { id: "absorber_ulti", name: "Absorber-Ulti", key: "F", requires: "absorber_ulti" },
  { id: "ultimate_ulti", name: "Ultimate Ulti", key: "U", requires: "ultimate_ulti" },
];
function loadUltiLoadout(): UltiLoadoutId[] {
  const available = ULTI_LOADOUT_OPTIONS.filter(option => !option.requires || loadUnlocks().includes(option.requires)).map(option => option.id);
  try {
    const saved = JSON.parse(localStorage.getItem(ULTI_LOADOUT_KEY) ?? "null") as unknown;
    if (!Array.isArray(saved)) return available.slice(0, ULTI_LOADOUT_SLOTS);
    return saved.filter((id): id is UltiLoadoutId => typeof id === "string" && available.includes(id as UltiLoadoutId)).slice(0, ULTI_LOADOUT_SLOTS);
  } catch { return available.slice(0, ULTI_LOADOUT_SLOTS); }
}
function saveUltiLoadout(ids: UltiLoadoutId[]) { try { localStorage.setItem(ULTI_LOADOUT_KEY, JSON.stringify(ids)); } catch {} }

const NAME_KEY         = "fighter-command-name";
const PILOT_KILLS_KEY  = "fighter-command-pilot-kills";
const SETTINGS_KEY     = "fighter-command-settings";
const TUTORIAL_KEY     = "fighter-command-tutorial-seen";
const BRIEFING_KEY     = "fighter-command-briefing-seen";
const DEFAULT_KEY_BINDINGS: KeyBindings = {
  up: "KeyW",
  down: "KeyS",
  left: "KeyA",
  right: "KeyD",
  fire: "Space",
  pause: "KeyP",
  ability1: "Digit1",
  ability2: "Digit2",
  ability3: "Digit3",
};
const DEFAULT_SETTINGS: GameSettings = {
  language: "de",
  tutorial: true,
  reducedMotion: false,
  highContrast: false,
  touchControls: "auto",
  autoFire: false,
  keyBindings: DEFAULT_KEY_BINDINGS,
  soundVolume: 0.65,
  musicVolume: 0.25,
};

function formatKeyCode(code: string): string {
  if (code === "Space") return "SPACE";
  if (code === "Escape") return "ESC";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Arrow")) return ({ ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" } as Record<string, string>)[code] ?? code;
  return code;
}

const RUN_UPGRADES: RunUpgrade[] = [
  { id: "rapid_fire", icon: "⚡", name: "Overdrive", description: "20% schneller feuern (stapelbar)" },
  { id: "damage", icon: "💥", name: "Schwere Munition", description: "+1 Schaden für alle Geschosse" },
  { id: "max_hp", icon: "❤", name: "Nanopanzerung", description: "+3 maximale HP und sofort heilen" },
  { id: "drone", icon: "🛸", name: "Drohnen-Overclock", description: "Drohne wird für diesen Einsatz eine Stufe stärker" },
  { id: "critical", icon: "🎯", name: "Zielcomputer", description: "15% Chance auf dreifachen Schaden" },
  { id: "shield", icon: "🛡", name: "Notfallschild", description: "Sofort ein Schild; lädt nach Bossen neu" },
  { id: "missile_mastery", icon: "🚀", name: "Raketenlabor", description: "Raketen feuern schneller und verursachen +4 Schaden" },
  { id: "chain_lightning", icon: "🌩", name: "Tesla-Munition", description: "Treffer können auf einen zweiten Gegner überspringen" },
  { id: "cryo_rounds", icon: "❄", name: "Kryo-Geschosse", description: "Treffer verlangsamen Gegner gelegentlich" },
  { id: "glass_cannon", icon: "☄", name: "Glaskanone", description: "Massiv mehr Schaden, aber 2 weniger maximale HP" },
  { id: "vampiric", icon: "🩸", name: "Energieernte", description: "Jeder 15. Abschuss repariert 1 HP" },
  { id: "graze_core", icon: "🌀", name: "Risiko-Reaktor", description: "Near Misses laden beide Ultis deutlich auf" },
  { id: "afterburner", icon: "🔥", name: "Nachbrenner", description: "+0,4 Bewegungsgeschwindigkeit" },
  { id: "extra_life", icon: "💚", name: "Rettungskapsel", description: "+1 zusätzliches Leben" },
  { id: "repair_nanites", icon: "🔧", name: "Reparatur-Naniten", description: "Jeder 10. Abschuss repariert 1 HP" },
  { id: "bounty_hunter", icon: "💰", name: "Kopfgeld-Protokoll", description: "+25% Punkte für Abschüsse" },
  { id: "boss_hunter", icon: "👹", name: "Bossbrecher", description: "+30% Schaden gegen Bosse" },
  { id: "kinetic_accelerator", icon: "➶", name: "Kinetik-Beschleuniger", description: "Geschosse fliegen 20% schneller" },
  { id: "reactive_armor", icon: "🧱", name: "Reaktivpanzerung", description: "15% weniger eingehender Schaden" },
  { id: "salvager", icon: "🧲", name: "Bergungsdrohne", description: "+10% Chance auf Power-ups" },
  { id: "flux_capacitor", icon: "🔋", name: "Flux-Kondensator", description: "Beide Ultis laden 25% schneller" },
  { id: "shield_matrix", icon: "🔷", name: "Schildmatrix", description: "Schilde erhalten +2 Trefferpunkte" },
];

function createMission(index = 0): Mission {
  const missions: Omit<Mission, "completed">[] = [
    { type: "kills", title: "Zerstöre 30 Gegner", target: 30, reward: 5000 },
    { type: "combo", title: "Erreiche eine 20er-Combo", target: 20, reward: 6500 },
    { type: "near_miss", title: "Schaffe 8 Near Misses", target: 8, reward: 7000 },
    { type: "flawless_boss", title: "Besiege einen Boss ohne Treffer", target: 1, reward: 9000 },
  ];
  return { ...missions[index % missions.length], completed: false };
}

function missionProgress(mission: Mission, stats: RunStats): number {
  if (mission.type === "kills") return stats.kills;
  if (mission.type === "combo") return stats.maxCombo;
  if (mission.type === "near_miss") return stats.nearMisses;
  return stats.perfectBosses;
}
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
  { id: "clean_sweep", icon: "✨", name: "Saubere Arbeit", description: "Besiege 25 Gegner in Folge, ohne Schaden zu nehmen", target: 25, reward: 3500, stat: "flawlessKills" },
  { id: "untouchable_ace", icon: "🦅", name: "Unberührbares Ass", description: "Besiege 100 Gegner in Folge, ohne Schaden zu nehmen", target: 100, reward: 12000, stat: "flawlessKills" },
  { id: "perfect_boss", icon: "💎", name: "Perfekter Bosskampf", description: "Besiege einen Boss, ohne im Kampf Schaden zu nehmen", target: 1, reward: 6000, stat: "perfectBosses" },
  { id: "perfect_boss_trio", icon: "👑", name: "Makelloser Bossjäger", description: "Gewinne drei Bosskämpfe in einem Einsatz ohne Schaden", target: 3, reward: 18000, stat: "perfectBosses" },
  { id: "full_health_salvage", icon: "🧲", name: "Mutige Bergung", description: "Sammle fünf Power-ups bei voller Gesundheit", target: 5, reward: 4000, stat: "fullHealthPickups" },
  { id: "combo_25", icon: "🔥", name: "Kettenreaktion", description: "Erreiche eine 25er-Combo", target: 25, reward: 5000, stat: "maxCombo" },
  { id: "combo_75", icon: "🌋", name: "Unaufhaltsam", description: "Erreiche eine 75er-Combo", target: 75, reward: 18000, stat: "maxCombo" },
  { id: "near_miss_10", icon: "🌀", name: "Haarscharf", description: "Schaffe 10 Near Misses in einem Einsatz", target: 10, reward: 4500, stat: "nearMisses" },
  { id: "near_miss_50", icon: "🪽", name: "Projektiltänzer", description: "Schaffe 50 Near Misses in einem Einsatz", target: 50, reward: 18000, stat: "nearMisses" },
  { id: "mission_first", icon: "📡", name: "Befehl ausgeführt", description: "Schließe ein Missionsziel ab", target: 1, reward: 4000, stat: "missions" },
  { id: "mission_five", icon: "🎖", name: "Elite-Einsatzkraft", description: "Schließe fünf Missionsziele in einem Einsatz ab", target: 5, reward: 20000, stat: "missions" },
];
function loadAchievements(): string[] { return loadStringArray(ACHIEVEMENT_KEY); }
function saveAchievements(ids: string[]) { try { localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(ids)); } catch {} }
function saveHighScore(s: number) { try { if (s > loadHighScore()) localStorage.setItem(HS_KEY, String(s)); } catch {} }
function loadHighScore(): number  { try { return parseInt(localStorage.getItem(HS_KEY) ?? "0", 10) || 0; } catch { return 0; } }
function addCoins(n: number)      { try { localStorage.setItem(COINS_KEY, String(loadCoins() + n)); } catch {} }
function setCoinsAbsolute(n: number) { try { localStorage.setItem(COINS_KEY, String(n)); } catch {} }
function spendCoins(n: number)    { try { const c = loadCoins(); if (c >= n) localStorage.setItem(COINS_KEY, String(c - n)); } catch {} }
function addGems(n: number)       { try { localStorage.setItem(GEMS_KEY, String(loadGems() + n)); } catch {} }
function spendGems(n: number)     { try { const gems = loadGems(); if (gems >= n) localStorage.setItem(GEMS_KEY, String(gems - n)); } catch {} }
function loadGems(): number       { try { return Math.max(0, parseInt(localStorage.getItem(GEMS_KEY) ?? "0", 10) || 0); } catch { return 0; } }
function loadCoins(): number      {
  try {
    const savedCoins = localStorage.getItem(COINS_KEY);
    if (savedCoins === null) return STARTING_COINS;
    const coins = parseInt(savedCoins, 10);
    return Number.isFinite(coins) ? coins : STARTING_COINS;
  } catch {
    return STARTING_COINS;
  }
}
function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function getEffectiveGameModeRules(mode: GameMode) {
  const base = getGameModeRules(mode);
  if (mode !== "daily") return base;
  const daily = getDailyChallengeRules(getLocalDateKey());
  return {
    ...base,
    label: `Tagesmission: ${daily.name}`,
    description: daily.description,
    durationSeconds: daily.durationSeconds,
    startingLives: daily.startingLives,
    spawnRateMultiplier: daily.spawnRateMultiplier,
  };
}
function canClaimDailyChest(): boolean {
  try { return localStorage.getItem(DAILY_CHEST_KEY) !== getLocalDateKey(); } catch { return false; }
}
function claimDailyChest(): number | null {
  if (!canClaimDailyChest()) return null;
  try {
    const reward = DAILY_CHEST_REWARDS[Math.random() < 0.5 ? 0 : 1];
    addCoins(reward);
    localStorage.setItem(DAILY_CHEST_KEY, getLocalDateKey());
    return reward;
  } catch { return null; }
}
function saveSkin(id: string)     { try { localStorage.setItem(SKIN_KEY, id); } catch {} }
function loadSkin(): string       { try { return localStorage.getItem(SKIN_KEY) ?? "steel"; } catch { return "steel"; } }
function saveDroneSkin(id: string) { try { localStorage.setItem(DRONE_SKIN_KEY, id); } catch {} }
function loadDroneSkin(): string   { try { return localStorage.getItem(DRONE_SKIN_KEY) ?? "drone_violet"; } catch { return "drone_violet"; } }
function saveWeaponCrate(id: string) { try { localStorage.setItem(WEAPON_CRATE_KEY, id); } catch {} }
function loadWeaponCrate(): string { try { return localStorage.getItem(WEAPON_CRATE_KEY) ?? WEAPON_CRATES[0].id; } catch { return WEAPON_CRATES[0].id; } }
function addUnlock(id: string)    { try { const u = loadUnlocks(); if (!u.includes(id)) localStorage.setItem(UNLOCKS_KEY, JSON.stringify([...u, id])); } catch {} }
function loadUnlocks(): string[]  { return loadStringArray(UNLOCKS_KEY); }
function loadAircraftLevels(): Record<string, number> {
  try {
    const saved = JSON.parse(localStorage.getItem(AIRCRAFT_LEVELS_KEY) ?? "{}") as unknown;
    if (!isRecord(saved)) return {};
    return Object.fromEntries(Object.entries(saved).map(([id, level]) => [id, getAircraftUpgradeStats(finiteNumber(level) ?? 1).level]));
  } catch { return {}; }
}
function saveAircraftLevels(levels: Record<string, number>) { try { localStorage.setItem(AIRCRAFT_LEVELS_KEY, JSON.stringify(levels)); } catch {} }
function loadDroneLevels(): Record<string, number> {
  try {
    const saved = JSON.parse(localStorage.getItem(DRONE_LEVELS_KEY) ?? "{}") as unknown;
    if (!isRecord(saved)) return {};
    return Object.fromEntries(Object.entries(saved).map(([id, level]) => [id, Math.max(1, Math.min(10, Math.floor(finiteNumber(level) ?? 1))) ]));
  } catch { return {}; }
}
function saveDroneLevels(levels: Record<string, number>) { try { localStorage.setItem(DRONE_LEVELS_KEY, JSON.stringify(levels)); } catch {} }
function unlockAll()              { try { const all = [...JET_SKINS.map(s => s.id), ...DRONE_SKINS.map(s => s.id), ...SHOP_ITEMS.map(i => i.id)]; localStorage.setItem(UNLOCKS_KEY, JSON.stringify(all)); } catch {} }
function saveName(n: string)      { try { localStorage.setItem(NAME_KEY, n); } catch {} }
function loadName(): string       { try { return localStorage.getItem(NAME_KEY) ?? "Pilot"; } catch { return "Pilot"; } }
function loadPilotKills(): number { try { return Math.max(0, Number(localStorage.getItem(PILOT_KILLS_KEY)) || 0); } catch { return 0; } }
function addPilotKill(): number {
  const kills = loadPilotKills() + 1;
  try { localStorage.setItem(PILOT_KILLS_KEY, String(kills)); } catch {}
  return kills;
}
function getPilotLevelFromKills(kills = loadPilotKills()) { return getPilotLevelForScore(kills * 1000); }
function loadSettings(): GameSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as unknown;
    if (!isRecord(saved)) return DEFAULT_SETTINGS;
    const languages: GameSettings["language"][] = ["de", "en", "tr", "fr", "es"];
    const touchModes: GameSettings["touchControls"][] = ["auto", "always", "never"];
    const savedBindings = isRecord(saved.keyBindings) ? saved.keyBindings : {};
    const keyBindings = Object.fromEntries(
      Object.entries(DEFAULT_KEY_BINDINGS).map(([action, fallback]) => [
        action,
        typeof savedBindings[action] === "string" ? savedBindings[action] : fallback,
      ]),
    ) as KeyBindings;
    return {
      language: languages.includes(saved.language as GameSettings["language"]) ? saved.language as GameSettings["language"] : DEFAULT_SETTINGS.language,
      tutorial: typeof saved.tutorial === "boolean" ? saved.tutorial : DEFAULT_SETTINGS.tutorial,
      reducedMotion: typeof saved.reducedMotion === "boolean" ? saved.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
      highContrast: typeof saved.highContrast === "boolean" ? saved.highContrast : DEFAULT_SETTINGS.highContrast,
      touchControls: touchModes.includes(saved.touchControls as GameSettings["touchControls"]) ? saved.touchControls as GameSettings["touchControls"] : DEFAULT_SETTINGS.touchControls,
      autoFire: typeof saved.autoFire === "boolean" ? saved.autoFire : DEFAULT_SETTINGS.autoFire,
      keyBindings,
      soundVolume: Math.max(0, Math.min(1, finiteNumber(saved.soundVolume) ?? DEFAULT_SETTINGS.soundVolume)),
      musicVolume: Math.max(0, Math.min(1, finiteNumber(saved.musicVolume) ?? DEFAULT_SETTINGS.musicVolume)),
    };
  } catch { return DEFAULT_SETTINGS; }
}
function saveSettings(settings: GameSettings) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {} }

const TURKISH_TRANSLATIONS: Readonly<Record<string, string>> = {
  "2D fighter jet simulator": "2D savaş uçağı simülatörü",
  "? HOW TO PLAY": "? NASIL OYNANIR",
  "Always show": "Her zaman göster",
  "At the end of a mission, you receive one credit for every point. Example: 1,000 points = 1,000 credits.": "Görev sonunda her puan için bir kredi kazanırsın. Örnek: 1.000 puan = 1.000 kredi.",
  "Automatic": "Otomatik",
  "Available credits": "Mevcut krediler",
  "Back": "Geri",
  "Drag left:": "Solda sürükle:",
  "Enter fullscreen": "Tam ekrana geç",
  "Exit fullscreen": "Tam ekrandan çık",
  "Explains movement and shooting on the first start.": "İlk başlangıçta hareket etmeyi ve ateş etmeyi açıklar.",
  "Fighter Command": "Fighter Command",
  "Fullscreen": "Tam ekran",
  "GOT IT — GO TO HANGAR": "ANLADIM — HANGARA GİT",
  "HOW FIGHTER COMMAND WORKS": "FIGHTER COMMAND NASIL OYNANIR",
  "High contrast": "Yüksek kontrast",
  "Highest player level reached": "Ulaşılan en yüksek oyuncu seviyesi",
  "Hold SPACE · hold right on touch": "BOŞLUK tuşunu basılı tut · dokunmatikte sağ tarafa basılı tut",
  "Keyboard": "Klavye",
  "Language": "Dil",
  "Language used for menus and hints.": "Menülerde ve ipuçlarında kullanılan dil.",
  "Level": "Seviye",
  "Mission briefing": "Görev brifingi",
  "Mission paused": "Görev duraklatıldı",
  "Mobile / Touch": "Mobil / Dokunmatik",
  "The jet follows your finger directly.": "Uçak parmağını doğrudan takip eder.",
  "Move your jet": "Uçağını hareket ettir",
  "Music": "Müzik",
  "NEW GAME": "YENİ OYUN",
  "Never show": "Asla gösterme",
  "Next goal": "Sonraki hedef",
  "Open fire": "Ateş aç",
  "PAUSED": "DURAKLATILDI",
  "Pause game": "Oyunu duraklat",
  "Pilot name": "Pilot adı",
  "Points → credits:": "Puanlar → krediler:",
  "Press P to resume": "Devam etmek için P tuşuna bas",
  "Ready for the mission!": "Göreve hazırsın!",
  "Reduce motion": "Hareketi azalt",
  "Reduces decorative effects and animations.": "Dekoratif efektleri ve animasyonları azaltır.",
  "Resume game": "Oyuna devam et",
  "SETTINGS": "AYARLAR",
  "Saved": "Kaydedildi",
  "Select language": "Dil seç",
  "Show tutorial": "Eğitimi göster",
  "Skip training": "Eğitimi atla",
  "Sound effects": "Ses efektleri",
  "Strengthens text, borders and controls.": "Metinleri, kenarlıkları ve kontrolleri daha belirgin yapar.",
  "Touch controls": "Dokunmatik kontroller",
  "Drag your finger across the left side. The jet follows it directly.": "Parmağını sol tarafta sürükle. Uçak parmağını doğrudan takip eder.",
  "Ultimates are explained when they are ready.": "Özel yetenekler hazır olduklarında açıklanır.",
  "Virtual controls in the play area.": "Oyun alanındaki sanal kontroller.",
  "WASD / arrow keys · drag left on touch": "WASD / yön tuşları · dokunmatikte solda sürükle",
  "You can reopen this guide from the hangar at any time.": "Bu rehberi hangardan istediğin zaman yeniden açabilirsin.",
  "Your jet": "Uçağın",
  "Your objective is simple: survive as long as possible, destroy enemies, and make your jet stronger throughout the mission. Read this briefing once—then practice movement and shooting during your first deployment.": "Hedefin basit: mümkün olduğunca uzun süre hayatta kal, düşmanları yok et ve görev boyunca uçağını güçlendir. Bu brifingi bir kez oku; ardından ilk görevinde hareket ve atış alıştırması yap.",
  "hold to keep firing.": "sürekli ateş etmek için basılı tut.",
  "points": "puan",
  "tap once the corresponding ability is ready.": "ilgili yetenek hazır olduğunda bir kez dokun.",
  "↙ Exit fullscreen": "↙ Tam ekrandan çık",
  "↻ RESTART": "↻ YENİDEN BAŞLAT",
  "⌂ RETURN TO HANGAR": "⌂ HANGARA DÖN",
  "▶ CONTINUE": "▶ DEVAM ET",
  "▶ RESUME": "▶ DEVAM ET",
  "▶ START": "▶ BAŞLAT",
  "⚙ SETTINGS": "⚙ AYARLAR",
  "⛶ Fullscreen": "⛶ Tam ekran",
  "🏆 LEADERBOARD": "🏆 LİDERLİK TABLOSU",
};

function translated(language: GameSettings["language"], german: string, english: string) {
  if (language === "de") return german;
  if (language === "tr") return TURKISH_TRANSLATIONS[english] ?? english;
  if (language === "fr") return ({
    "Language": "Langue", "Select language": "Choisir la langue", "SETTINGS": "PARAMÈTRES",
    "Back": "Retour", "NEW GAME": "NOUVELLE PARTIE", "Your jet": "Votre chasseur",
    "Available credits": "Crédits disponibles",
    "Touch controls": "Commandes tactiles", "Music": "Musique", "Sound effects": "Effets sonores",
  } as Record<string, string>)[english] ?? english;
  if (language === "es") return ({
    "Language": "Idioma", "Select language": "Elegir idioma", "SETTINGS": "AJUSTES",
    "Back": "Atrás", "NEW GAME": "NUEVA PARTIDA", "Your jet": "Tu caza",
    "Available credits": "Créditos disponibles",
    "Touch controls": "Controles táctiles", "Music": "Música", "Sound effects": "Efectos de sonido",
  } as Record<string, string>)[english] ?? english;
  return english;
}

function localeFor(language: GameSettings["language"]) {
  return language === "de" ? "de-DE" : language === "tr" ? "tr-TR" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US";
}
function tutorialSeen(): boolean { try { return localStorage.getItem(TUTORIAL_KEY) === "1"; } catch { return false; } }
function markTutorialSeen() { try { localStorage.setItem(TUTORIAL_KEY, "1"); } catch {} }
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

function drawPlayerJet(ctx: CanvasRenderingContext2D, x: number, y: number, tier: number, shieldActive: boolean, skin?: JetSkin, shieldColor?: string, aircraftLevel = 1) {
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

  // Every original aircraft has its own silhouette. Persistent aircraft levels
  // add progressively richer hull markings, fins and illuminated armour seams.
  const level = clamp(Math.floor(aircraftLevel), 1, 10);
  const profile = {
    steel:      { nose: 27, tail: -28, waist: 11, wingX: -10, wingTip: 25, sweep: -24, cockpitX: 8, cockpitW: 10, pattern: 0 },
    fire:       { nose: 31, tail: -25, waist: 8,  wingX: -5,  wingTip: 19, sweep: -29, cockpitX: 11, cockpitW: 8, pattern: 1 },
    jade:       { nose: 29, tail: -31, waist: 7,  wingX: -13, wingTip: 28, sweep: -17, cockpitX: 5, cockpitW: 12, pattern: 2 },
    gold:       { nose: 25, tail: -26, waist: 13, wingX: -4,  wingTip: 22, sweep: -20, cockpitX: 7, cockpitW: 9, pattern: 3 },
    shadow:     { nose: 34, tail: -23, waist: 6,  wingX: 2,   wingTip: 25, sweep: -25, cockpitX: 13, cockpitW: 7, pattern: 4 },
    crimson:    { nose: 30, tail: -30, waist: 9,  wingX: -8,  wingTip: 31, sweep: -19, cockpitX: 9, cockpitW: 9, pattern: 5 },
    galaxy:     { nose: 28, tail: -28, waist: 12, wingX: -15, wingTip: 30, sweep: -8,  cockpitX: 4, cockpitW: 11, pattern: 6 },
    neon:       { nose: 33, tail: -27, waist: 7,  wingX: -1,  wingTip: 22, sweep: -31, cockpitX: 12, cockpitW: 8, pattern: 7 },
    arctic:     { nose: 26, tail: -32, waist: 10, wingX: -16, wingTip: 27, sweep: -12, cockpitX: 3, cockpitW: 12, pattern: 8 },
    lava:       { nose: 29, tail: -27, waist: 12, wingX: -9,  wingTip: 24, sweep: -27, cockpitX: 8, cockpitW: 10, pattern: 9 },
    solaris:    { nose: 35, tail: -30, waist: 9,  wingX: -3,  wingTip: 34, sweep: -22, cockpitX: 12, cockpitW: 10, pattern: 10 },
    voidreaper: { nose: 32, tail: -34, waist: 6,  wingX: -12, wingTip: 35, sweep: -14, cockpitX: 10, cockpitW: 8, pattern: 11 },
  }[skin?.id ?? "steel"] ?? { nose: 28, tail: -28, waist: 10, wingX: -10, wingTip: 22, sweep: -22, cockpitX: 8, cockpitW: 10, pattern: 0 };

  // Wings behind the fuselage; alternating tips make even similarly coloured
  // craft readable by silhouette alone.
  for (const side of [-1, 1]) {
    const s = side as -1 | 1;
    ctx.beginPath();
    ctx.moveTo(4, s * (profile.waist - 2));
    ctx.lineTo(profile.wingX, s * profile.wingTip);
    ctx.lineTo(profile.sweep, s * (profile.wingTip - 4));
    ctx.lineTo(profile.tail + 5, s * 7);
    ctx.closePath();
    ctx.fillStyle = skin?.body ?? "#162040"; ctx.fill();
    ctx.strokeStyle = skin?.stroke ?? "#2a4a8a"; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // Body
  ctx.beginPath();
  ctx.moveTo(profile.nose, 0);
  ctx.lineTo(-10, -profile.waist);
  ctx.lineTo(profile.tail, -5);
  ctx.lineTo(profile.tail + 6, 0);
  ctx.lineTo(profile.tail, 5);
  ctx.lineTo(-10, profile.waist);
  ctx.closePath();
  ctx.fillStyle = skin?.body ?? "#1a2a4a";
  ctx.fill();
  ctx.strokeStyle = skin?.stroke ?? "#2a4a8a";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cockpit
  ctx.beginPath();
  ctx.ellipse(profile.cockpitX, 0, profile.cockpitW, Math.max(4, profile.waist - 4), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow + "cc";
  ctx.fill();

  // Model-specific pattern. More stripes light up at levels 3/5/7/9.
  const marks = 1 + Math.floor(level / 2);
  ctx.save();
  ctx.strokeStyle = glow; ctx.lineCap = "round";
  ctx.shadowColor = glow; ctx.shadowBlur = level >= 7 ? 5 : 0;
  for (let i = 0; i < marks; i++) {
    const t = marks === 1 ? .5 : i / (marks - 1);
    const px = -18 + t * 30;
    const spread = 4 + ((profile.pattern * 3 + i * 5) % Math.max(6, profile.wingTip - 5));
    ctx.lineWidth = i === 0 ? 1.8 : 1;
    ctx.beginPath();
    if (profile.pattern % 4 === 0) { ctx.moveTo(px, -spread); ctx.lineTo(px + 7, 0); ctx.lineTo(px, spread); }
    else if (profile.pattern % 4 === 1) { ctx.moveTo(px - 5, -spread); ctx.lineTo(px + 7, -spread + 5); ctx.moveTo(px - 5, spread); ctx.lineTo(px + 7, spread - 5); }
    else if (profile.pattern % 4 === 2) { ctx.arc(px, 0, Math.min(spread, 5 + i * 2), -.8, .8); ctx.moveTo(px, -spread); ctx.lineTo(px + 4, spread); }
    else { ctx.moveTo(px - 4, -spread); ctx.lineTo(px + 5, 0); ctx.lineTo(px - 4, spread); ctx.moveTo(px + 2, -spread); ctx.lineTo(px + 9, 0); ctx.lineTo(px + 2, spread); }
    ctx.stroke();
  }
  if (level >= 5) {
    const finLength = 5 + level;
    ctx.fillStyle = glow + "66"; ctx.strokeStyle = glow;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(profile.tail + 7, side * 4); ctx.lineTo(profile.tail - finLength, side * (6 + level)); ctx.lineTo(profile.tail + 13, side * 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  if (level >= 9) {
    ctx.beginPath(); ctx.arc(profile.cockpitX, 0, profile.cockpitW + 4, 0, Math.PI * 2);
    ctx.setLineDash([2, 3]); ctx.strokeStyle = "#ffffff"; ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();

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
    ctx.moveTo(profile.nose - 1, oy - 1.5);
    ctx.lineTo(profile.nose + 10, oy - 1.5);
    ctx.lineTo(profile.nose + 10, oy + 1.5);
    ctx.lineTo(profile.nose - 1, oy + 1.5);
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

function JetShopImage({ skin, aircraftLevel }: { skin: JetSkin; aircraftLevel: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 140;
    const height = 82;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(1.25, 1.25);
    ctx.translate(-width / 2, -height / 2);
    drawPlayerJet(
      ctx,
      width / 2 - PLAYER_W / 2,
      height / 2 - PLAYER_H / 2,
      1,
      false,
      skin,
      undefined,
      aircraftLevel,
    );
    ctx.restore();
  }, [aircraftLevel, skin]);

  return (
    <div
      className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border"
      style={{
        background: `radial-gradient(circle at center, ${skin.glow}22 0%, rgba(2,6,23,.82) 72%)`,
        borderColor: `${skin.glow}44`,
      }}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-auto max-w-full"
        role="img"
        aria-label={`${skin.name} Flugzeug`}
      />
    </div>
  );
}

function drawCombinedPlayerJet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tier: number,
  shieldActive: boolean,
  build: AircraftBuild,
  fallbackSkin: JetSkin,
  shieldColor?: string,
  aircraftLevel = 1,
) {
  const bodySkin = JET_SKINS.find(skin => skin.id === build.bodySkin) ?? fallbackSkin;
  const wingSkin = JET_SKINS.find(skin => skin.id === build.wingSkin) ?? fallbackSkin;
  const engineSkin = JET_SKINS.find(skin => skin.id === build.engineSkin) ?? fallbackSkin;
  ctx.save();
  ctx.translate(x + PLAYER_W / 2, y + PLAYER_H / 2);
  const pulse = .75 + Math.sin(performance.now() * .008) * .25;
  const aura = ctx.createRadialGradient(0, 0, 3, 0, 0, 42);
  aura.addColorStop(0, bodySkin.glow + "55");
  aura.addColorStop(1, "transparent");
  ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.fill();

  // Preserve the recognizable silhouettes of both selected aircraft. The
  // previous generic hybrid shape only borrowed their colours, which made
  // distinctive craft such as the TIE, X-Wing and N-1 look malformed.
  const drawClippedSourceJet = (skin: JetSkin, clip: () => void) => {
    ctx.save();
    ctx.beginPath();
    clip();
    ctx.clip();
    drawPlayerJet(ctx, -PLAYER_W / 2, -PLAYER_H / 2, tier, false, skin, undefined, aircraftLevel);
    ctx.restore();
  };

  // Aircraft B contributes everything outside the central fuselage band.
  drawClippedSourceJet(wingSkin, () => {
    ctx.rect(-48, -44, 96, 36);
    ctx.rect(-48, 8, 96, 36);
  });

  // Aircraft A contributes its complete, undistorted hull.
  drawClippedSourceJet(bodySkin, () => {
    ctx.rect(-48, -10, 96, 20);
  });

  // A small illuminated join makes the two real silhouettes read as one
  // assembled craft without covering their model-specific details.
  ctx.save();
  ctx.globalAlpha = .75;
  ctx.shadowColor = bodySkin.glow;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = bodySkin.glow;
  ctx.lineWidth = 1;
  for (const side of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(-17, side * 8);
    ctx.quadraticCurveTo(-2, side * 11, 15, side * 8);
    ctx.stroke();
  }
  ctx.restore();

  ctx.shadowColor = engineSkin.glow;
  ctx.shadowBlur = 15;
  for (const side of [-1, 1] as const) {
    ctx.beginPath();
    ctx.roundRect(-25, side * 8 - 3, 16, 6, 3);
    ctx.fillStyle = engineSkin.body;
    ctx.fill();
    ctx.strokeStyle = engineSkin.stroke;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-27, side * 8, 3.5 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = engineSkin.glow;
    ctx.fill();
  }
  if (aircraftLevel >= 5) {
    ctx.setLineDash([3, 3]); ctx.strokeStyle = wingSkin.glow;
    ctx.beginPath(); ctx.arc(2, 0, 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  if (shieldActive) {
    const color = shieldColor ?? "#35d7ff";
    ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.strokeStyle = color + "aa"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = color + "12"; ctx.fill();
  }
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  ctx.save();
  ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
  ctx.rotate(Math.PI); // facing left
  const visualScale = e.type === "boss" ? 1.14 : isBossEnemy(e) ? 1.06 : e.type === "gunship" || e.type === "sentinel" ? 1.14 : 1.22;
  ctx.scale(visualScale, visualScale);

  const now = performance.now();
  const pulse = 0.72 + Math.sin(now * 0.009 + e.x * 0.03) * 0.18;
  const roleColor = e.archetype === "healer" ? "#55ff9a" : e.archetype === "shield" ? "#58d8ff" :
    e.archetype === "kamikaze" ? "#ff3b45" : null;
  if (roleColor) {
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(e.width, e.height) * .66 + pulse * 3, 0, Math.PI * 2);
    ctx.strokeStyle = roleColor + "cc";
    ctx.lineWidth = e.archetype === "kamikaze" ? 3 : 2;
    ctx.setLineDash(e.archetype === "kamikaze" ? [3, 4] : [7, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (e.eliteModifier) {
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(e.width, e.height) * .76, 0, Math.PI * 2);
    ctx.strokeStyle = e.eliteModifier === "armored" ? "#b9c5d6" :
      e.eliteModifier === "swift" ? "#fff06a" : "#ff67c8";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (e.isGolden) {
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, Math.max(e.width, e.height) * .72);
    glow.addColorStop(0, "rgba(255,245,120,0.22)");
    glow.addColorStop(.58, "rgba(255,215,0,0.12)");
    glow.addColorStop(1, "rgba(255,200,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.width * .7, e.height * (.8 + pulse * .15), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const hullGradient = (dark: string, mid: string, highlight = e.color) => {
    const gradient = ctx.createLinearGradient(-e.width / 2, -e.height / 2, e.width / 2, e.height / 2);
    gradient.addColorStop(0, dark);
    gradient.addColorStop(0.52, mid);
    gradient.addColorStop(0.78, dark);
    gradient.addColorStop(1, highlight + "55");
    return gradient;
  };
  const drawEngine = (x: number, y: number, size: number, color = e.color) => {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    const flame = ctx.createLinearGradient(x - size * 2.4, y, x + size * 0.2, y);
    flame.addColorStop(0, "transparent");
    flame.addColorStop(0.55, color + "55");
    flame.addColorStop(1, "#ffffff");
    ctx.beginPath();
    ctx.moveTo(x + 2, y - size * 0.45);
    ctx.lineTo(x - size * (1.6 + pulse), y);
    ctx.lineTo(x + 2, y + size * 0.45);
    ctx.closePath();
    ctx.fillStyle = flame;
    ctx.fill();
    ctx.restore();
  };
  const drawPanelLine = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = "#ffffff3d"; ctx.lineWidth = 0.8; ctx.stroke();
  };

  // Every enemy gets a readable propulsion signature, even against dark backgrounds.
  if (e.type === "titan") {
    drawEngine(-61, -35, 15, e.color); drawEngine(-61, 0, 12, "#ff4fd8"); drawEngine(-61, 35, 15, e.color);
  } else if (e.type === "overlord") {
    drawEngine(-43, -26, 12); drawEngine(-43, 26, 12);
  } else if (e.type === "boss" && !e.bossEngineDisabled) {
    drawEngine(-29, -18, 9); drawEngine(-29, 18, 9);
  } else if (e.type === "bomber" || e.type === "gunship" || e.type === "sentinel") {
    drawEngine(-22, -8, 7); drawEngine(-22, 8, 7);
  } else if (e.type !== "tiefighter" && e.type !== "emeraldtiefighter") {
    drawEngine(-14, 0, 7);
  }

  ctx.shadowColor = e.isGolden ? "#ffe45c" : e.color;
  ctx.shadowBlur = e.isGolden ? 22 + pulse * 10 : 9;

  switch (e.type) {
    case "scout": {
      // Razor-like light fighter: split wings, armored spine and twin cannons.
      ctx.beginPath();
      ctx.moveTo(23, 0);
      ctx.lineTo(4, -6);
      ctx.lineTo(-13, -16);
      ctx.lineTo(-9, -5);
      ctx.lineTo(-18, -2);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-18, 2);
      ctx.lineTo(-9, 5);
      ctx.lineTo(-13, 16);
      ctx.lineTo(4, 6);
      ctx.closePath();
      ctx.fillStyle = hullGradient("#160406", "#5b1520");
      ctx.fill();
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath(); ctx.ellipse(5, 0, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = e.color + "99"; ctx.fill();
      ctx.beginPath(); ctx.ellipse(7, -1, 3.5, 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#fff4f6"; ctx.fill();
      drawPanelLine(-10, -4, 8, 0); drawPanelLine(-10, 4, 8, 0);
      ctx.fillStyle = "#fff"; ctx.fillRect(16, -5, 9, 2); ctx.fillRect(16, 3, 9, 2);
      break;
    }
    case "fighter": {
      ctx.beginPath();
      ctx.moveTo(24, 0); ctx.lineTo(-16, -12); ctx.lineTo(-22, -5); ctx.lineTo(-14, 0);
      ctx.lineTo(-22, 5); ctx.lineTo(-16, 12); ctx.closePath();
      ctx.fillStyle = hullGradient("#151204", "#554b0b");
      ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(-16, -24); ctx.lineTo(-22, -12); ctx.closePath();
      ctx.fillStyle = hullGradient("#080804", "#332e08"); ctx.fill(); ctx.strokeStyle = e.color; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 12); ctx.lineTo(-16, 24); ctx.lineTo(-22, 12); ctx.closePath();
      ctx.fillStyle = hullGradient("#080804", "#332e08"); ctx.fill(); ctx.strokeStyle = e.color; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(6, 0, 9, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = e.color + "99"; ctx.fill();
      drawPanelLine(-14, -8, 10, 0); drawPanelLine(-14, 8, 10, 0);
      ctx.fillStyle = "#fff7b0"; ctx.fillRect(19, -7, 6, 2); ctx.fillRect(19, 5, 6, 2);
      break;
    }
    case "bomber": {
      ctx.beginPath();
      ctx.moveTo(18, 0); ctx.lineTo(-10, -18); ctx.lineTo(-28, -10); ctx.lineTo(-20, 0);
      ctx.lineTo(-28, 10); ctx.lineTo(-10, 18); ctx.closePath();
      ctx.fillStyle = hullGradient("#071006", "#244814");
      ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = e.color + "99"; ctx.fill();
      drawPanelLine(-18, -11, 8, -3); drawPanelLine(-18, 11, 8, 3);
      [-9, 9].forEach(y => { ctx.beginPath(); ctx.arc(12, y, 2.5, 0, Math.PI * 2); ctx.fillStyle = "#fff4bd"; ctx.fill(); });
      // Heavy ordnance pods make the bomber distinct at a glance.
      [-14, 14].forEach(y => {
        ctx.beginPath(); ctx.roundRect(-11, y - 4, 19, 8, 3);
        ctx.fillStyle = "#10180d"; ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = "#fff7cf"; ctx.fillRect(5, y - 1, 6, 2);
      });
      break;
    }
    case "boss": {
      ctx.beginPath();
      ctx.moveTo(40, 0); ctx.lineTo(-20, -28); ctx.lineTo(-36, -14); ctx.lineTo(-24, 0);
      ctx.lineTo(-36, 14); ctx.lineTo(-20, 28); ctx.closePath();
      ctx.fillStyle = hullGradient("#100310", "#47134c");
      ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -28); ctx.lineTo(-24, -44); ctx.lineTo(-36, -28); ctx.closePath();
      ctx.fillStyle = hullGradient("#090109", "#2e0a32"); ctx.fill(); ctx.strokeStyle = e.color; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 28); ctx.lineTo(-24, 44); ctx.lineTo(-36, 28); ctx.closePath();
      ctx.fillStyle = hullGradient("#090109", "#2e0a32"); ctx.fill(); ctx.strokeStyle = e.color; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(8, 0, 14, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = e.color + "bb"; ctx.fill();
      ctx.beginPath(); ctx.arc(8, 0, 5 + pulse * 2, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
      drawPanelLine(-24, -23, 20, -5); drawPanelLine(-24, 23, 20, 5);
      [-16, 0, 16].forEach(y => { ctx.fillStyle = "#ffedf9"; ctx.fillRect(31, y - 1.5, 8, 3); });
      // HP bar
      const barW = 64, barH = 6;
      ctx.fillStyle = "#333";
      ctx.fillRect(-barW / 2, -e.height / 2 - 16, barW, barH);
      ctx.fillStyle = e.color;
      ctx.fillRect(-barW / 2, -e.height / 2 - 16, barW * (e.hp / e.maxHp), barH);
      break;
    }
    case "overlord": {
      const overlordPulse = 0.75 + Math.sin(now * 0.008) * 0.25;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 18 + overlordPulse * 12;
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
      ctx.fillStyle = `rgba(255,70,190,${.55 + overlordPulse * .35})`; ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(10, 0, 6 + overlordPulse * 2, 0, Math.PI * 2);
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
    case "titan": {
      const phase = e.hp / e.maxHp <= .3 ? 3 : e.hp / e.maxHp <= .6 ? 2 : 1;
      const titanPulse = .65 + Math.sin(now * .012) * .35;
      const phaseColor = phase === 3 ? "#fff36a" : phase === 2 ? "#45f6ff" : "#ff3fd2";
      ctx.shadowColor = phaseColor; ctx.shadowBlur = 26 + titanPulse * 20;
      // Crown-like outer wings become more elaborate in every damage phase.
      ctx.beginPath();
      ctx.moveTo(68, 0); ctx.lineTo(27, -20); ctx.lineTo(5, -48); ctx.lineTo(-40, -63);
      ctx.lineTo(-32, -31); ctx.lineTo(-68, -18); ctx.lineTo(-49, 0);
      ctx.lineTo(-68, 18); ctx.lineTo(-32, 31); ctx.lineTo(-40, 63);
      ctx.lineTo(5, 48); ctx.lineTo(27, 20); ctx.closePath();
      const titanHull = ctx.createLinearGradient(-70, -55, 68, 50);
      titanHull.addColorStop(0, phase === 1 ? "#190622" : "#071b2b");
      titanHull.addColorStop(.5, phase === 3 ? "#573b00" : "#26103d");
      titanHull.addColorStop(1, "#03040d");
      ctx.fillStyle = titanHull; ctx.fill(); ctx.strokeStyle = phaseColor; ctx.lineWidth = 4; ctx.stroke();
      if (phase >= 2) {
        [-1, 1].forEach(side => {
          ctx.beginPath(); ctx.moveTo(-15, side * 38); ctx.lineTo(-55, side * (phase === 3 ? 78 : 70)); ctx.lineTo(12, side * 51); ctx.closePath();
          ctx.fillStyle = phase === 3 ? "#ffb00044" : "#00ddff33"; ctx.fill(); ctx.strokeStyle = phaseColor; ctx.lineWidth = 2; ctx.stroke();
        });
      }
      // Armored reactor, crown prongs and six weapon ports.
      ctx.beginPath(); ctx.arc(15, 0, 21, 0, Math.PI * 2); ctx.fillStyle = "#090914"; ctx.fill(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(15, 0, 10 + titanPulse * 4, 0, Math.PI * 2); ctx.fillStyle = phaseColor; ctx.fill();
      [-27, -16, -5, 5, 16, 27].forEach(offset => { ctx.beginPath(); ctx.arc(48, offset, 4, 0, Math.PI * 2); ctx.fillStyle = offset % 2 ? "#fff" : phaseColor; ctx.fill(); });
      if (phase === 3) {
        [-1, 1].forEach(side => { ctx.beginPath(); ctx.moveTo(-12, side * 47); ctx.lineTo(20, side * 72); ctx.lineTo(32, side * 35); ctx.closePath(); ctx.fillStyle = "#ffe34a55"; ctx.fill(); ctx.stroke(); });
      }
      if ((e.titanShieldTimer ?? 0) > 0) {
        ctx.beginPath(); ctx.ellipse(0, 0, 84, 75, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,35,190,${.12 + titanPulse * .12})`; ctx.fill();
        ctx.strokeStyle = "#ff23be"; ctx.lineWidth = 5; ctx.stroke();
      }
      const barW = 130, barH = 9;
      ctx.shadowBlur = 0; ctx.fillStyle = "#160718"; ctx.fillRect(-barW / 2, -e.height / 2 - 20, barW, barH);
      ctx.fillStyle = phaseColor; ctx.fillRect(-barW / 2, -e.height / 2 - 20, barW * (e.hp / e.maxHp), barH);
      ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = 1; ctx.strokeRect(-barW / 2, -e.height / 2 - 20, barW, barH);
      break;
    }
    case "interceptor": {
      ctx.beginPath();
      ctx.moveTo(24,0); ctx.lineTo(4,-5); ctx.lineTo(-12,-10); ctx.lineTo(-18,-3); ctx.lineTo(-8,0); ctx.lineTo(-18,3); ctx.lineTo(-12,10); ctx.lineTo(4,5);
      ctx.closePath(); ctx.fillStyle=hullGradient("#031112", "#0a464b"); ctx.fill(); ctx.strokeStyle=e.color; ctx.lineWidth=1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3,-3); ctx.lineTo(-8,-19); ctx.lineTo(-16,-15); ctx.lineTo(-11,-6); ctx.closePath();
      ctx.fillStyle="#001010"; ctx.fill(); ctx.strokeStyle=e.color; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3,3); ctx.lineTo(-8,19); ctx.lineTo(-16,15); ctx.lineTo(-11,6); ctx.closePath();
      ctx.fillStyle="#001010"; ctx.fill(); ctx.strokeStyle=e.color; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(5,0,7,3.5,0,0,Math.PI*2); ctx.fillStyle=e.color+"99"; ctx.fill();
      ctx.beginPath(); ctx.ellipse(7,-.5,3,1.5,0,0,Math.PI*2); ctx.fillStyle="#edffff"; ctx.fill();
      drawPanelLine(-10, -5, 10, 0); drawPanelLine(-10, 5, 10, 0);
      ctx.fillStyle = "#dfffff"; ctx.fillRect(17, -6, 9, 2); ctx.fillRect(17, 4, 9, 2);
      break;
    }
    case "plasmawing": {
      ctx.beginPath();
      ctx.moveTo(22, 0); ctx.lineTo(-8, -7); ctx.lineTo(-24, -19); ctx.lineTo(-17, -3);
      ctx.lineTo(-17, 3); ctx.lineTo(-24, 19); ctx.lineTo(-8, 7); ctx.closePath();
      ctx.fillStyle = hullGradient("#0c0215", "#4c1268"); ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(3, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff"; ctx.shadowColor = e.color; ctx.shadowBlur = 14; ctx.fill();
      drawPanelLine(-17, -11, 8, -3); drawPanelLine(-17, 11, 8, 3);
      ctx.fillStyle = e.color; ctx.fillRect(16, -7, 8, 2); ctx.fillRect(16, 5, 8, 2);
      break;
    }
    case "sentinel": {
      ctx.beginPath();
      ctx.moveTo(20, 0); ctx.lineTo(5, -17); ctx.lineTo(-18, -17); ctx.lineTo(-27, 0);
      ctx.lineTo(-18, 17); ctx.lineTo(5, 17); ctx.closePath();
      ctx.fillStyle = hullGradient("#040c14", "#173c58"); ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.rect(-12, -8, 18, 16); ctx.fillStyle = e.color + "66"; ctx.fill();
      drawPanelLine(-19, -12, 11, -8); drawPanelLine(-19, 12, 11, 8);
      ctx.beginPath(); ctx.arc(-3, 0, 4 + pulse, 0, Math.PI * 2); ctx.fillStyle = "#eaffff"; ctx.fill();
      [-12, 12].forEach(y => {
        ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(25, y * .72); ctx.lineTo(8, y * .5); ctx.closePath();
        ctx.fillStyle = "#0a1e2d"; ctx.fill(); ctx.strokeStyle = e.color; ctx.stroke();
      });
      if ((e.shieldHp ?? 0) > 0) {
        ctx.beginPath(); ctx.arc(-2, 0, 29, 0, Math.PI * 2);
        ctx.strokeStyle = "#66ddff88"; ctx.lineWidth = 2; ctx.stroke();
      }
      break;
    }
    case "gunship": {
      ctx.beginPath();
      ctx.moveTo(22,0); ctx.lineTo(-14,-20); ctx.lineTo(-32,-12); ctx.lineTo(-22,0); ctx.lineTo(-32,12); ctx.lineTo(-14,20);
      ctx.closePath(); ctx.fillStyle=hullGradient("#140804", "#593016"); ctx.fill(); ctx.strokeStyle=e.color; ctx.lineWidth=2.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(4,0,8,5,0,0,Math.PI*2); ctx.fillStyle=e.color+"99"; ctx.fill();
      drawPanelLine(-21, -14, 10, -4); drawPanelLine(-21, 14, 10, 4);
      [-11, 11].forEach(y => { ctx.fillStyle = "#fff0d0"; ctx.fillRect(17, y - 2, 8, 4); });
      [-15, 15].forEach(y => {
        ctx.beginPath(); ctx.arc(-7, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#21130a"; ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#fff3db"; ctx.fillRect(-3, y - 1.5, 15, 3);
      });
      const bW=e.width*0.8,bH=4;
      ctx.fillStyle="#333"; ctx.fillRect(-bW/2,-e.height/2-8,bW,bH);
      ctx.fillStyle=e.color; ctx.fillRect(-bW/2,-e.height/2-8,bW*(e.hp/e.maxHp),bH);
      break;
    }
    case "laserdevice": {
      // A stationary, heavily armored laser generator with emitters on both ends.
      const devicePulse = .65 + Math.sin(now * .018) * .35;
      ctx.shadowColor = "#ff1d2e";
      ctx.shadowBlur = 8 + devicePulse * 9;
      ctx.beginPath();
      ctx.roundRect(-19, -22, 38, 44, 7);
      ctx.fillStyle = hullGradient("#050608", "#282c31", "#60656b");
      ctx.fill();
      ctx.strokeStyle = "#858b92";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#0a0b0d";
      ctx.fillRect(-13, -15, 26, 30);
      ctx.strokeStyle = "#42474d";
      ctx.lineWidth = 1;
      ctx.strokeRect(-13, -15, 26, 30);
      [-1, 1].forEach(side => {
        const emitterY = side * 24;
        ctx.beginPath();
        ctx.moveTo(-12, emitterY - side * 8);
        ctx.lineTo(12, emitterY - side * 8);
        ctx.lineTo(8, emitterY);
        ctx.lineTo(-8, emitterY);
        ctx.closePath();
        ctx.fillStyle = "#111317";
        ctx.fill();
        ctx.strokeStyle = "#747a80";
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, emitterY, 4 + devicePulse, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#ff1028";
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#111318";
      ctx.fill();
      ctx.strokeStyle = "#9ba1a7";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3 + devicePulse, 0, Math.PI * 2);
      ctx.fillStyle = "#ff2438";
      ctx.fill();
      if ((e.shieldHp ?? 0) > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 31, 0, Math.PI * 2);
        ctx.fillStyle = "#58d8ff12";
        ctx.fill();
        ctx.strokeStyle = "#73ddffbb";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      const bW = e.width * .9, bH = 4;
      ctx.fillStyle = "#26282c";
      ctx.fillRect(-bW / 2, -e.height / 2 - 9, bW, bH);
      ctx.fillStyle = "#ff6b24";
      ctx.fillRect(-bW / 2, -e.height / 2 - 9, bW * (e.hp / e.maxHp), bH);
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
        ctx.fillStyle = hullGradient("#05060b", e.type === "emeraldtiefighter" ? "#123c2c" : "#18263a"); ctx.fill(); ctx.strokeStyle = tg; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-10, cy); ctx.lineTo(6, cy); ctx.strokeStyle = "#ffffff42"; ctx.lineWidth = 1; ctx.stroke();
      };
      drawEnemyHex(-16); drawEnemyHex(16);
      ctx.strokeStyle = tg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-2, -7); ctx.lineTo(-2, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, 7); ctx.lineTo(-2, 4); ctx.stroke();
      ctx.beginPath(); ctx.arc(-2, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#12121a"; ctx.fill(); ctx.strokeStyle = tg; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(-3, -1, 4, 0, Math.PI * 2);
      ctx.fillStyle = tg + "88"; ctx.fill();
      ctx.beginPath(); ctx.arc(-3, -1, 2 + pulse, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
      drawEngine(-12, -16, 5, tg); drawEngine(-12, 16, 5, tg);
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

  if (isBossEnemy(e)) {
    const drawDetachableModule = (y: number, kind: "cannon" | "engine") => {
      const moduleX = -e.width * .2;
      const moduleWidth = Math.max(20, e.width * .22);
      const moduleHeight = Math.max(11, e.height * .13);
      ctx.save();
      ctx.translate(moduleX, y);
      ctx.shadowColor = kind === "cannon" ? "#ff4668" : "#64e8ff";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(-moduleWidth / 2, -moduleHeight / 2, moduleWidth, moduleHeight, 4);
      ctx.fillStyle = kind === "cannon"
        ? hullGradient("#19040b", "#7c1735", "#ff4668")
        : hullGradient("#03141c", "#0e5064", "#64e8ff");
      ctx.fill();
      ctx.strokeStyle = kind === "cannon" ? "#ff7890" : "#a8f5ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      if (kind === "cannon") {
        ctx.fillStyle = "#fff1f4";
        ctx.fillRect(moduleWidth * .3, -moduleHeight * .28, moduleWidth * .55, 3);
        ctx.fillRect(moduleWidth * .3, moduleHeight * .28 - 3, moduleWidth * .55, 3);
      } else {
        drawEngine(-moduleWidth * .55, 0, Math.max(8, moduleHeight * .7), "#64e8ff");
        ctx.beginPath();
        ctx.arc(moduleWidth * .15, 0, moduleHeight * .24, 0, Math.PI * 2);
        ctx.fillStyle = "#e8fdff";
        ctx.fill();
      }
      ctx.restore();
    };

    // Rotation makes positive local Y the visually upper module on screen.
    if (!e.bossCannonsDisabled) drawDetachableModule(e.height * .34, "cannon");
    if (!e.bossEngineDisabled) drawDetachableModule(-e.height * .34, "engine");
  }

  if (e.archetype || e.eliteModifier) {
    const roleIcon = e.archetype === "healer" ? "+" : e.archetype === "shield" ? "◆" :
      e.archetype === "kamikaze" ? "!" : e.eliteModifier === "armored" ? "A" :
      e.eliteModifier === "swift" ? "S" : "F";
    const badgeColor = roleColor ?? (e.eliteModifier === "armored" ? "#b9c5d6" :
      e.eliteModifier === "swift" ? "#fff06a" : "#ff67c8");
    ctx.beginPath();
    ctx.arc(0, -e.height / 2 - 9, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#06101a";
    ctx.fill();
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = badgeColor;
    ctx.font = "bold 9px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(roleIcon, 0, -e.height / 2 - 9);
  }

  if ((e.poisonTimer ?? 0) > 0) {
    const poisonPulse = 0.5 + Math.sin(performance.now() * 0.018) * 0.5;
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = 0.15 + poisonPulse * 0.55;
    ctx.fillStyle = "#ff1010";
    ctx.fillRect(-e.width / 2 - 12, -e.height / 2 - 18, e.width + 24, e.height + 36);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.25 + poisonPulse * 0.75;
    ctx.shadowColor = "#ff2020";
    ctx.shadowBlur = 8 + poisonPulse * 18;
    ctx.strokeStyle = "#ff3030";
    ctx.lineWidth = 1.5 + poisonPulse * 2;
    ctx.strokeRect(-e.width / 2 - 5, -e.height / 2 - 5, e.width + 10, e.height + 10);
  }

  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
  ctx.save();
  if (b.isPoisonMissile) {
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.shadowColor = "#65ff38";
    ctx.shadowBlur = 10;
    const body = ctx.createLinearGradient(-9, 0, 14, 0);
    body.addColorStop(0, "#2b073e");
    body.addColorStop(0.42, "#4c1464");
    body.addColorStop(0.68, "#171c20");
    body.addColorStop(1, "#caff54");
    ctx.beginPath();
    ctx.moveTo(17, 0); ctx.quadraticCurveTo(12, -5.5, 6, -5.5); ctx.lineTo(-9, -4.5);
    ctx.lineTo(-13, 0); ctx.lineTo(-9, 4.5); ctx.lineTo(6, 5.5); ctx.quadraticCurveTo(12, 5.5, 17, 0); ctx.closePath();
    ctx.fillStyle = body; ctx.fill();
    ctx.strokeStyle = "#d8ff72"; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(-7, -2.7); ctx.lineTo(9, -2.1);
    ctx.strokeStyle = "#ffffff80"; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4, -4.5); ctx.lineTo(-4, 4.5); ctx.moveTo(7, -5); ctx.lineTo(7, 5);
    ctx.strokeStyle = "#b84cffaa"; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3, -4.5); ctx.lineTo(-12, -11); ctx.lineTo(3, -5.3);
    ctx.moveTo(-3, 4.5); ctx.lineTo(-12, 11); ctx.lineTo(3, 5.3);
    ctx.strokeStyle = "#c55cff"; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(5, 0, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = "#efffd5"; ctx.fill();
    ctx.strokeStyle = "#282d31"; ctx.lineWidth = 0.8; ctx.stroke();
    const exhaust = ctx.createLinearGradient(-28, 0, -13, 0);
    exhaust.addColorStop(0, "#7d12ff00"); exhaust.addColorStop(0.45, "#9a26ff99"); exhaust.addColorStop(1, "#e7ff6eee");
    ctx.shadowColor = "#b84cff"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(-13, -2.8); ctx.lineTo(-28, 0); ctx.lineTo(-13, 2.8); ctx.closePath();
    ctx.fillStyle = exhaust; ctx.fill();
  } else if (b.weaponId === "seraph_barrage" && b.isMissile) {
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.shadowColor = "#67e8f9"; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(5, -6); ctx.lineTo(-7, -4); ctx.lineTo(-12, 0); ctx.lineTo(-7, 4); ctx.lineTo(5, 6); ctx.closePath();
    const seraphGradient = ctx.createLinearGradient(-12, 0, 16, 0);
    seraphGradient.addColorStop(0, "#2563eb"); seraphGradient.addColorStop(.55, "#67e8f9"); seraphGradient.addColorStop(1, "#ffffff");
    ctx.fillStyle = seraphGradient; ctx.fill();
    ctx.strokeStyle = "#cffafe"; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-11, -2.5); ctx.lineTo(-25, 0); ctx.lineTo(-11, 2.5);
    ctx.fillStyle = "#a855f7aa"; ctx.fill();
  } else if (b.isMissile && b.trackPlayer) {
    // Enemy homing missile — magenta/purple
    ctx.translate(b.x, b.y);
    const ang = Math.atan2(b.vy, b.vx);
    ctx.rotate(ang);
    const body = ctx.createLinearGradient(0, -5, 0, 5);
    body.addColorStop(0, "#ff8cff"); body.addColorStop(0.45, "#b900df"); body.addColorStop(1, "#4d075e");
    ctx.shadowColor = "#aa00ff"; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(12, 0); ctx.quadraticCurveTo(7, -4.5, -5, -4); ctx.lineTo(-6, 4); ctx.quadraticCurveTo(7, 4.5, 12, 0); ctx.closePath();
    ctx.fillStyle = body; ctx.fill();
    ctx.strokeStyle = "#ffc6ff"; ctx.lineWidth = 1; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-7, -5); ctx.lineTo(-5, -1);
    ctx.moveTo(-3, 4); ctx.lineTo(-7, 5); ctx.lineTo(-5, 1);
    ctx.strokeStyle = "#ff8cff"; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -2.5); ctx.lineTo(-11, 0); ctx.lineTo(-6, 2.5); ctx.closePath();
    ctx.fillStyle = "#ff45dbaa"; ctx.fill();
  } else if (b.isMissile) {
    ctx.translate(b.x, b.y);
    const ang = Math.atan2(b.vy, b.vx);
    ctx.rotate(ang);
    const body = ctx.createLinearGradient(0, -4, 0, 4);
    body.addColorStop(0, "#fff3cf"); body.addColorStop(0.4, "#ff8a18"); body.addColorStop(1, "#8f2109");
    ctx.shadowColor = "#ff6a00"; ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.moveTo(12, 0); ctx.quadraticCurveTo(7, -4, -5, -3.6); ctx.lineTo(-6, 3.6); ctx.quadraticCurveTo(7, 4, 12, 0); ctx.closePath();
    ctx.fillStyle = body; ctx.fill();
    ctx.strokeStyle = "#ffd08a"; ctx.lineWidth = 1; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(-2, -3.7); ctx.lineTo(-6, -5); ctx.lineTo(-5, -1);
    ctx.moveTo(-2, 3.7); ctx.lineTo(-6, 5); ctx.lineTo(-5, 1);
    ctx.strokeStyle = "#ffb24d"; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -2.4); ctx.lineTo(-12, 0); ctx.lineTo(-6, 2.4); ctx.closePath();
    ctx.fillStyle = "#ff4b18bb"; ctx.fill();
  } else if (b.fromPlayer) {
    const bc = b.color ?? "#00ffff";
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.fillStyle = bc; ctx.strokeStyle = "#ffffffcc";
    ctx.shadowColor = bc; ctx.shadowBlur = 10;
    if (b.weaponId === "seraph_barrage") {
      ctx.beginPath(); ctx.moveTo(13, 0); ctx.quadraticCurveTo(2, -6, -7, -3); ctx.lineTo(-2, 0); ctx.lineTo(-7, 3); ctx.quadraticCurveTo(2, 6, 13, 0); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.stroke();
    } else if (b.weaponId === "twin_fang") {
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(2, -4); ctx.lineTo(-7, 0); ctx.lineTo(2, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-18, 0); ctx.strokeStyle = `${bc}88`; ctx.lineWidth = 2; ctx.stroke();
    } else if (b.weaponId === "nova_scatter") {
      ctx.beginPath(); ctx.arc(2, 0, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(15, 0); ctx.moveTo(2, -8); ctx.lineTo(2, 8); ctx.strokeStyle = `${bc}aa`; ctx.lineWidth = 1.5; ctx.stroke();
    } else if (b.weaponId === "volt_repeater") {
      ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-2, 2); ctx.lineTo(3, -3); ctx.lineTo(10, 2); ctx.strokeStyle = bc; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.stroke();
    } else if (b.weaponId === "titan_lance") {
      const lanceGradient = ctx.createLinearGradient(-20, 0, 22, 0);
      lanceGradient.addColorStop(0, `${bc}00`); lanceGradient.addColorStop(.45, bc); lanceGradient.addColorStop(1, "#ffffff");
      ctx.fillStyle = lanceGradient; ctx.fillRect(-20, -3, 42, 6);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(4, -1, 18, 2);
    } else if (b.weaponId === "omega_prism") {
      ctx.beginPath();
      for (let point = 0; point < 8; point++) {
        const radius = point % 2 === 0 ? 9 : 3.5;
        const angle = point * Math.PI / 4;
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.roundRect(-3, -2.5, 17, 5, 2); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.fillRect(7, -1, 7, 2);
    }
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

function drawLaserDeviceBeam(ctx: CanvasRenderingContext2D, e: Enemy, time: number) {
  const beamX = e.x + e.width / 2;
  const upperHeight = Math.max(0, e.y);
  const lowerY = e.y + e.height;
  const lowerHeight = Math.max(0, CANVAS_H - lowerY);
  const flicker = .78 + Math.sin(time * .55) * .22;

  ctx.save();
  ctx.globalAlpha = .2 * flicker;
  ctx.fillStyle = "#ff001d";
  ctx.shadowColor = "#ff001d";
  ctx.shadowBlur = 28;
  ctx.fillRect(beamX - 11, 0, 22, upperHeight);
  ctx.fillRect(beamX - 11, lowerY, 22, lowerHeight);
  ctx.globalAlpha = .62 * flicker;
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#ff1830";
  ctx.fillRect(beamX - LASER_DEVICE_BEAM_WIDTH / 2, 0, LASER_DEVICE_BEAM_WIDTH, upperHeight);
  ctx.fillRect(beamX - LASER_DEVICE_BEAM_WIDTH / 2, lowerY, LASER_DEVICE_BEAM_WIDTH, lowerHeight);
  ctx.globalAlpha = flicker;
  ctx.shadowBlur = 5;
  ctx.fillStyle = "#fff5f5";
  ctx.fillRect(beamX - 2, 0, 4, upperHeight);
  ctx.fillRect(beamX - 2, lowerY, 4, lowerHeight);
  ctx.restore();
}

function drawCombatDrone(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, skin: DroneSkin = DRONE_SKINS[0], level = 1) {
  const visualLevel = Math.max(1, Math.floor(level));
  const tier = Math.min(4, Math.floor((visualLevel - 1) / 3));
  const guns = getDroneStats(visualLevel - 1).guns;
  const pulse = 0.5 + Math.sin(time * 0.14) * 0.5;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 0.08) * 4);

  // High-level drones carry a rotating energy stabilizer behind the hull.
  if (tier >= 3) {
    ctx.save();
    ctx.rotate(time * 0.018);
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.arc(0, 0, 14 + pulse * 2, 0, Math.PI * 2);
    ctx.strokeStyle = skin.stroke + "aa"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  // Each visual tier adds broader, more aggressive wing geometry.
  if (tier >= 1) {
    ctx.beginPath();
    ctx.moveTo(5, -7); ctx.lineTo(-7 - tier * 2, -12 - tier); ctx.lineTo(-13, -5);
    ctx.moveTo(5, 7); ctx.lineTo(-7 - tier * 2, 12 + tier); ctx.lineTo(-13, 5);
    ctx.strokeStyle = skin.stroke; ctx.lineWidth = 2 + tier * 0.25; ctx.stroke();
  }

  ctx.shadowColor = skin.stroke; ctx.shadowBlur = 16 + tier * 3;
  ctx.beginPath();
  ctx.moveTo(16 + tier, 0); ctx.lineTo(2, -8 - tier); ctx.lineTo(-13 - tier, -5 - tier * .4); ctx.lineTo(-18 - tier, 0); ctx.lineTo(-13 - tier, 5 + tier * .4); ctx.lineTo(2, 8 + tier); ctx.closePath();
  ctx.fillStyle = skin.body; ctx.fill(); ctx.strokeStyle = skin.stroke; ctx.lineWidth = 2; ctx.stroke();

  // Armour seams make intermediate upgrades visible even before the silhouette changes.
  if (visualLevel >= 2) {
    ctx.beginPath();
    ctx.moveTo(-10, -4); ctx.lineTo(1, -6 - tier); ctx.lineTo(10, 0); ctx.lineTo(1, 6 + tier); ctx.lineTo(-10, 4);
    ctx.strokeStyle = skin.stroke + "88"; ctx.lineWidth = 1; ctx.stroke();
  }
  if (visualLevel >= 5) {
    ctx.fillStyle = skin.stroke + "55";
    ctx.fillRect(-9, -8 - tier, 3, 4);
    ctx.fillRect(-9, 4 + tier, 3, 4);
  }

  ctx.beginPath(); ctx.arc(3, 0, 4 + tier * .65, 0, Math.PI * 2);
  ctx.fillStyle = skin.core; ctx.fill();
  if (visualLevel >= 8) {
    ctx.beginPath(); ctx.arc(3, 0, 7 + pulse * 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = skin.core + "bb"; ctx.lineWidth = 1; ctx.stroke();
  }

  // The weapon model mirrors the actual one-, two- or three-gun drone stats.
  ctx.fillStyle = skin.stroke;
  const gunOffsets = guns === 3 ? [-5, 0, 5] : guns === 2 ? [-3.5, 3.5] : [0];
  gunOffsets.forEach(offset => ctx.fillRect(12 + tier, offset - 1.2, 11 + tier, 2.4));

  const engineX = -16 - tier;
  const glow = ctx.createRadialGradient(engineX, 0, 1, engineX, 0, 12 + tier * 2);
  glow.addColorStop(0, skin.stroke + "aa"); glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(engineX, 0, 12 + tier * 2, 0, Math.PI * 2); ctx.fill();
  if (tier >= 2) {
    ctx.fillStyle = skin.core;
    ctx.beginPath(); ctx.arc(engineX, -4.5, 1.5 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(engineX, 4.5, 1.5 + pulse, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawCombinedCombatDrone(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, build: DroneBuild, fallback: DroneSkin, level = 1) {
  const body = DRONE_SKINS.find(skin => skin.id === build.bodySkin) ?? fallback;
  const core = DRONE_SKINS.find(skin => skin.id === build.coreSkin) ?? fallback;
  const weapons = DRONE_SKINS.find(skin => skin.id === build.weaponSkin) ?? fallback;
  drawCombatDrone(ctx, x, y, time, body, level);
  const tier = Math.min(4, Math.floor((Math.max(1, level) - 1) / 3));
  const guns = getDroneStats(Math.max(0, level - 1)).guns;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * .08) * 4);
  ctx.shadowColor = core.core; ctx.shadowBlur = 13;
  ctx.beginPath(); ctx.arc(3, 0, 5 + tier * .7, 0, Math.PI * 2);
  ctx.fillStyle = core.core; ctx.fill();
  ctx.strokeStyle = core.stroke; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.shadowColor = weapons.stroke; ctx.shadowBlur = 9;
  const offsets = guns === 3 ? [-5, 0, 5] : guns === 2 ? [-3.5, 3.5] : [0];
  offsets.forEach(offset => {
    ctx.beginPath(); ctx.roundRect(10 + tier, offset - 2, 15 + tier, 4, 2);
    ctx.fillStyle = weapons.body; ctx.fill();
    ctx.strokeStyle = weapons.stroke; ctx.lineWidth = 1.3; ctx.stroke();
  });
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
  const lastFireRef = useRef<Record<string, number>>({});
  const lastDroneFireRef = useRef(0);
  const lastWingmanFireRef = useRef(0);
  const lastMissileRef = useRef(0);
  const playerRef = useRef({ x: 60, y: CANVAS_H / 2 - PLAYER_H / 2 });
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const starsRef = useRef<Star[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const weaponCrateRef = useRef<WeaponCrateDefinition>(WEAPON_CRATES.find(crate => crate.id === loadWeaponCrate()) ?? WEAPON_CRATES[0]);
  const weaponCrateNextActivationRef = useRef(WEAPON_CRATE_INTERVAL_MS);
  const weaponCrateActiveUntilRef = useRef(0);
  const lastWeaponCrateFireRef = useRef(0);
  const enemySpawnTimerRef = useRef(0);
  const timeRef = useRef(0);
  const runElapsedMsRef = useRef(0);
  const protectPackageHpRef = useRef(PROTECT_PACKAGE_MAX_HP);
  const protectPackageHitCooldownRef = useRef(0);
  const protectPackageRef = useRef({ x: 150, y: CANVAS_H / 2 - PROTECT_PACKAGE_HEIGHT / 2, direction: 1 });
  const protectPackageLastFireRef = useRef(0);
  const bossRushSpawnTimerRef = useRef(0);
  const displaySyncTimerRef = useRef(0);
  const shieldTimerRef = useRef(0);
  const invincibleRef = useRef(0);
  const movementStunRef = useRef(0);
  const comboRef = useRef(0);
  const comboTimerRef = useRef(0);
  const comboMilestoneRef = useRef({ combo: 0, timer: 0 });
  const nearMissCooldownRef = useRef(0);
  const screenShakeRef = useRef(0);
  const waveTimerRef = useRef(0);
  const waveSequenceRef = useRef(0);
  const activeWaveRef = useRef<ActiveWave | null>(null);
  const waveBannerRef = useRef({ text: "", timer: 0 });
  const titanWarningRef = useRef(0);
  const missionRef = useRef<Mission>({ type: "kills", title: "Zerstöre 30 Gegner", target: 30, reward: 5000, completed: false });

  // ── Touch / virtual controls ──
  const joystickRef = useRef({ active: false, id: -1, centerX: 0, centerY: 0, curX: 0, curY: 0 });
  const touchFireRef = useRef({ active: false, id: -1 });
  const showVirtualControlsRef = useRef(false);
  const gamepadInputRef = useRef({ x: 0, y: 0, firing: false });
  const gamepadButtonsRef = useRef<boolean[]>([]);

  // ── Ultima ──
  const ultimaChargeRef = useRef(0);
  const ultimaActiveRef = useRef(0);
  const laserChargeRef = useRef(0);
  const laserActiveRef = useRef(0);

  // ── City background ──
  const cityFarRef  = useRef<Building[]>([]);
  const cityNearRef = useRef<Building[]>([]);
  const backgroundTransitionRef = useRef<BackgroundTransition | null>(null);

  // ── Checkpoint save tracking ──
  const saveExistsRef = useRef(!!loadSave());
  const milestoneBossFiredRef = useRef<Set<number>>(new Set());
  const titanBossFiredRef = useRef<Set<number>>(new Set());
  const gameOverCountdownRef = useRef(0);
  const activeSkinRef = useRef<JetSkin>(JET_SKINS.find(s => s.id === loadSkin()) ?? JET_SKINS[0]);
  const activeUltiSkinRef = useRef<JetSkin>(JET_SKINS.find(s => s.id === loadSkin()) ?? JET_SKINS[0]);
  const activeDroneSkinRef = useRef<DroneSkin>(DRONE_SKINS.find(s => s.id === loadDroneSkin()) ?? DRONE_SKINS[0]);
  const aircraftBuildRef = useRef<AircraftBuild>(loadAircraftBuild());
  const hybridActiveRef = useRef(loadHybridActive());
  const droneBuildRef = useRef<DroneBuild>(loadDroneBuild());
  const droneRoleRef = useRef<DroneRoleId>(loadDroneRole());
  const droneWeaponRef = useRef<DroneWeaponDefinition>(DRONE_WEAPONS.find(weapon => weapon.id === loadDroneWeapon()) ?? DRONE_WEAPONS[0]);
  const droneSupportTimerRef = useRef(0);
  const rareEventTimerRef = useRef(0);
  const nextRareEventRef = useRef(rand(2100, 3300));
  const activeUnlocksRef = useRef<string[]>([]);
  const activeUltiLoadoutRef = useRef<UltiLoadoutId[]>(loadUltiLoadout());
  const stealthChargeRef = useRef(0);
  const stealthActiveRef = useRef(0);
  const healChargeRef = useRef(0);
  const healActiveRef = useRef(0);
  const poisonMissileChargeRef = useRef(0);
  const absorberChargeRef = useRef(0);
  const absorberActiveRef = useRef(0);
  const absorberHitsRef = useRef(0);
  const ultimateChargeRef = useRef(0);
  const ultimateActiveRef = useRef(0);
  const speedBoostRef = useRef(0);
  const n1ShieldTimerRef = useRef(0);
  const playerShieldHpRef = useRef(0);
  const bestScoreRef = useRef(loadHighScore());
  const pilotLevelRef = useRef(getPilotLevelFromKills());
  const activeWeaponsRef = useRef<WeaponDefinition[]>(loadWeapons().map(id => WEAPONS.find(weapon => weapon.id === id) ?? WEAPONS[0]));
  const weaponLevelsRef = useRef(loadWeaponLevels());
  const playerNameRef = useRef(loadName());
  const [selectedSkin, setSelectedSkin] = useState(() => loadSkin());
  const [selectedDroneSkin, setSelectedDroneSkin] = useState(() => loadDroneSkin());
  const [aircraftBuild, setAircraftBuild] = useState<AircraftBuild>(() => loadAircraftBuild());
  const [hybridActive, setHybridActive] = useState(() => loadHybridActive());
  const [droneBuild, setDroneBuild] = useState<DroneBuild>(() => loadDroneBuild());
  const [droneRole, setDroneRole] = useState<DroneRoleId>(() => loadDroneRole());
  const [selectedDroneWeapon, setSelectedDroneWeapon] = useState<DroneWeaponId>(() => loadDroneWeapon());
  const [selectedWeaponCrate, setSelectedWeaponCrate] = useState(() => loadWeaponCrate());
  const [coins, setCoins] = useState(() => loadCoins());
  const [gems, setGems] = useState(() => loadGems());
  const [selectedWeapons, setSelectedWeapons] = useState<string[]>(() => loadWeapons());
  const [weaponLevels, setWeaponLevels] = useState<Record<string, number>>(() => loadWeaponLevels());
  const [aircraftLevels, setAircraftLevels] = useState<Record<string, number>>(() => loadAircraftLevels());
  const [droneLevels, setDroneLevels] = useState<Record<string, number>>(() => loadDroneLevels());
  const aircraftUpgradeRef = useRef(getAircraftUpgradeStats(loadAircraftLevels()[loadSkin()] ?? 1));
  const droneLevelRef = useRef(loadDroneLevels()[loadDroneSkin()] ?? 1);
  const [highScore, setHighScore] = useState(() => loadHighScore());
  const [unlockedItems, setUnlockedItems] = useState<string[]>(() => loadUnlocks());
  const [ultiLoadout, setUltiLoadout] = useState<UltiLoadoutId[]>(() => loadUltiLoadout());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const settingsRef = useRef(settings);
  const language = settings.language;
  const [pauseView, setPauseView] = useState<"menu" | "settings">("menu");
  const [tutorialStage, setTutorialStage] = useState(-1);
  const [showVirtualControls, setShowVirtualControls] = useState(false);
  const [isPortraitPhone, setIsPortraitPhone] = useState(false);
  const isPortraitPhoneRef = useRef(false);
  const audioRef = useRef(new GameAudio());
  const runUpgradesRef = useRef<Record<RunUpgradeId, number>>({ ...EMPTY_RUN_UPGRADES });
  const runStatsRef = useRef<RunStats>({
    kills: 0, bosses: 0, damageTaken: 0, powerUps: 0,
    flawlessKills: 0, perfectBosses: 0, fullHealthPickups: 0,
    maxCombo: 0, nearMisses: 0, missions: 0,
  });
  const bossDamageStartRef = useRef(0);
  const activeModeRef = useRef<GameMode>("classic");
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>("classic");
  const runResultRef = useRef<"game_over" | "complete">("game_over");
  const rewardGrantedRef = useRef(false);
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
    setCoins(loadCoins());
    setGems(loadGems());
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
    const unlocked = ACHIEVEMENTS.filter(a => !owned.includes(a.id) && runStatsRef.current[a.stat] >= a.target);
    if (unlocked.length === 0) return;
    const next = [...owned, ...unlocked.map(achievement => achievement.id)];
    saveAchievements(next);
    addCoins(unlocked.reduce((reward, achievement) => reward + achievement.reward, 0));
    setAchievements(next);
    setCoins(loadCoins());
    const toastAchievement = unlocked[unlocked.length - 1];
    setAchievementToast(toastAchievement);
    audioRef.current.effect("upgrade", settingsRef.current.soundVolume);
    window.setTimeout(() => setAchievementToast(current => current?.id === toastAchievement.id ? null : current), 3500);
  }, []);

  const registerKill = useCallback((enemy: Enemy) => {
    runStatsRef.current.kills += 1;
    runStatsRef.current.flawlessKills += 1;
    comboRef.current += 1;
    comboTimerRef.current = 150;
    if (comboRef.current % 100 === 0) {
      comboMilestoneRef.current = { combo: comboRef.current, timer: 150 };
    }
    runStatsRef.current.maxCombo = Math.max(runStatsRef.current.maxCombo, comboRef.current);
    const comboMultiplier = Math.min(4, 1 + Math.floor(comboRef.current / 10) * .25);
    stateRef.current.score += Math.round(enemy.points * (comboMultiplier - 1));
    pilotLevelRef.current = getPilotLevelFromKills(addPilotKill());
    floatingTextsRef.current.push({
      x: enemy.x + enemy.width / 2, y: enemy.y,
      text: comboRef.current >= 2 ? `${comboRef.current}× COMBO` : `+${enemy.points}`,
      color: comboRef.current >= 10 ? "#ffcc33" : "#ffffff", life: 55, maxLife: 55,
    });
    screenShakeRef.current = Math.max(screenShakeRef.current, isBossEnemy(enemy) ? 16 : 3);
    if (runUpgradesRef.current.vampiric > 0 && runStatsRef.current.kills % 15 === 0) {
      stateRef.current.hp = Math.min(stateRef.current.maxHp, stateRef.current.hp + runUpgradesRef.current.vampiric);
      floatingTextsRef.current.push({ x: playerRef.current.x, y: playerRef.current.y, text: "+HP ENERGIEERNTE", color: "#ff6688", life: 70, maxLife: 70 });
    }
    if (runUpgradesRef.current.repair_nanites > 0 && runStatsRef.current.kills % 10 === 0) {
      stateRef.current.hp = Math.min(stateRef.current.maxHp, stateRef.current.hp + runUpgradesRef.current.repair_nanites);
      floatingTextsRef.current.push({ x: playerRef.current.x, y: playerRef.current.y, text: "+HP NANITEN", color: "#67e8f9", life: 70, maxLife: 70 });
    }
    stateRef.current.score += Math.round(enemy.points * runUpgradesRef.current.bounty_hunter * .25);
    if (enemy.isGolden) {
      const reward = 750 + stateRef.current.level * 100;
      addCoins(reward);
      stateRef.current.score += reward;
      setCoins(loadCoins());
      waveBannerRef.current = { text: `GOLDJAGD +${reward} CREDITS`, timer: 150 };
    }
    if (isBossEnemy(enemy)) {
      runStatsRef.current.bosses += 1;
      if (runStatsRef.current.damageTaken === bossDamageStartRef.current) {
        runStatsRef.current.perfectBosses += 1;
      }
    }
    checkAchievements();
  }, [checkAchievements]);

  const recordPlayerDamage = useCallback((damage: number) => {
    runStatsRef.current.damageTaken += damage;
    runStatsRef.current.flawlessKills = 0;
    comboRef.current = 0;
    comboTimerRef.current = 0;
    comboMilestoneRef.current = { combo: 0, timer: 0 };
    nearMissCooldownRef.current = 0;
    screenShakeRef.current = Math.max(screenShakeRef.current, 10);
    checkAchievements();
  }, [checkAchievements]);

  const grantRunReward = useCallback(() => {
    if (rewardGrantedRef.current) return;
    rewardGrantedRef.current = true;
    const gs = stateRef.current;
    if (activeModeRef.current === "classic") {
      clearSave();
      saveExistsRef.current = false;
    }
    saveHighScore(gs.score);
    addLeaderboardEntry(playerNameRef.current, gs.score);
    const creditReward = Math.round(calculateCoinReward(gs.score) * getModeCoinMultiplier(activeModeRef.current));
    addCoins(creditReward);
    addGems(Math.floor(creditReward / 100));
    syncDisplay();
  }, [syncDisplay]);

  const chooseRunUpgrade = useCallback((upgrade: RunUpgrade) => {
    if (upgrade.id === "extra_life" && runUpgradesRef.current.extra_life >= 1) return;
    runUpgradesRef.current[upgrade.id] += 1;
    if (upgrade.id === "max_hp") { stateRef.current.maxHp += 3; stateRef.current.hp = stateRef.current.maxHp; }
    if (upgrade.id === "shield") { shieldTimerRef.current = 600; playerShieldHpRef.current = PLAYER_SHIELD_HP + runUpgradesRef.current.shield_matrix * 2; }
    if (upgrade.id === "shield_matrix" && shieldTimerRef.current > 0) { playerShieldHpRef.current += 2; }
    if (upgrade.id === "afterburner") { stateRef.current.speed += .4; }
    if (upgrade.id === "extra_life") { stateRef.current.lives += 1; }
    if (upgrade.id === "glass_cannon") {
      stateRef.current.maxHp = Math.max(3, stateRef.current.maxHp - 2);
      stateRef.current.hp = Math.min(stateRef.current.hp, stateRef.current.maxHp);
    }
    upgradeLevelRef.current = stateRef.current.level;
    if (activeModeRef.current === "classic") {
      saveGame(stateRef.current, runUpgradesRef.current, upgradeLevelRef.current);
      saveExistsRef.current = true;
    }
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

  useEffect(() => {
    const updateOrientation = () => {
      const portrait = window.innerWidth <= 700 && window.innerHeight > window.innerWidth;
      isPortraitPhoneRef.current = portrait;
      setIsPortraitPhone(portrait);
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  useEffect(() => {
    const pauseIfPlaying = () => {
      const gs = stateRef.current;
      if (!gs.started || gs.gameOver || gs.paused) return;
      gs.paused = true;
      keysRef.current.clear();
      touchFireRef.current.active = false;
      joystickRef.current.active = false;
      setPauseView("menu");
      syncDisplay();
    };
    const onVisibilityChange = () => {
      if (document.hidden) pauseIfPlaying();
    };
    window.addEventListener("blur", pauseIfPlaying);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("blur", pauseIfPlaying);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [syncDisplay]);

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
      hp   = increasedBossHealth(isSuperBoss ? bossHpBase * 3 : bossHpBase);
      w    = isSuperBoss ? 130 : 90;
      h    = isSuperBoss ? 102 : 68;
      vx   = isSuperBoss ? -rand(0.4, 0.9) : -rand(0.6, 1.2);
      pts  = isSuperBoss ? 600 : 100;
      color = isSuperBoss ? "#ff00cc" : "#cc00ff";
    } else if (isLaserDeviceEligibleLevel(level) && roll < LASER_DEVICE_CHANCE &&
        !enemiesRef.current.some(enemy => enemy.type === "laserdevice" && !enemy.dead)) {
      type = "laserdevice"; hp = (8 + level * 2) * 3; w = 52; h = 58; vx = -rand(1.1, 1.5); pts = 100; color = "#777c82";
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

    const isGolden = !["boss", "overlord", "titan", "laserdevice"].includes(type) && Math.random() < GOLDEN_ENEMY_CHANCE;
    if (isGolden) hp *= 2;

    // After level 5 enemies award bonus score so levels go faster
    if (level > 5) pts = Math.round(pts * (1 + (level - 5) * 0.18));

    const y = type === "laserdevice" ? CANVAS_H / 2 - h / 2 : rand(20, CANVAS_H - h - 20);
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
      shieldHp: type === "laserdevice" ? LASER_DEVICE_SHIELD_HP : type === "sentinel" ? 6 : type === "emeraldtiefighter" ? 4 : type === "tiefighter" ? 2 : 0,
      bossAge: type === "boss" ? 0 : undefined,
      isGolden,
      goldenTimer: isGolden ? 600 : undefined,
      bossTopPartHp: type === "boss" ? Math.max(5, Math.round(hp * .12)) : undefined,
      bossBottomPartHp: type === "boss" ? Math.max(5, Math.round(hp * .12)) : undefined,
    };
    const variant = selectEnemyVariant(level, type, Math.random(), Math.random(), Math.random());
    if (variant === "healer" || variant === "shield" || variant === "kamikaze") {
      enemy.archetype = variant;
      enemy.supportCooldown = enemy.archetype === "healer" ? rand(100, 160) :
        enemy.archetype === "shield" ? rand(130, 190) : 0;
      if (enemy.archetype === "healer") {
        enemy.hp = enemy.maxHp = Math.ceil(enemy.maxHp * 1.35);
        enemy.points = Math.round(enemy.points * 1.6);
        enemy.color = "#55ff9a";
      } else if (enemy.archetype === "shield") {
        enemy.hp = enemy.maxHp = Math.ceil(enemy.maxHp * 1.5);
        enemy.points = Math.round(enemy.points * 1.7);
        enemy.color = "#58d8ff";
      } else {
        enemy.hp = enemy.maxHp = Math.max(1, Math.ceil(enemy.maxHp * .8));
        enemy.points = Math.round(enemy.points * 1.5);
        enemy.color = "#ff3b45";
        enemy.vx *= 1.2;
        enemy.ramDamage = 3;
      }
    } else if (variant) {
      enemy.eliteModifier = variant;
      enemy.points *= 2;
      if (enemy.eliteModifier === "armored") {
        enemy.hp = enemy.maxHp = Math.ceil(enemy.maxHp * 2.25);
      } else if (enemy.eliteModifier === "swift") {
        enemy.vx *= 1.55;
      } else {
        enemy.shootCooldown *= .55;
      }
    }
    if (isBossEnemy(enemy)) bossDamageStartRef.current = runStatsRef.current.damageTaken;
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

  const spawnBossRushEnemy = useCallback((bossNumber: number) => {
    const power = Math.max(1, bossNumber);
    const titan = power % 5 === 0;
    const overlord = !titan && power % 3 === 0;
    const type: Enemy["type"] = titan ? "titan" : overlord ? "overlord" : "boss";
    const hp = increasedBossHealth((titan ? 520 : overlord ? 240 : 100) + power * (titan ? 70 : 32));
    const width = titan ? 158 : overlord ? 138 : 112;
    const height = titan ? 136 : overlord ? 104 : 86;
    if (titan) titanWarningRef.current = 180;
    enemiesRef.current.push({
      x: CANVAS_W + 24,
      y: CANVAS_H / 2 - height / 2,
      vx: titan ? -.55 : -.75,
      vy: 0,
      hp,
      maxHp: hp,
      width,
      height,
      type,
      shootCooldown: titan ? 14 : 18,
      points: 900 + power * 350,
      color: titan ? "#ff3fd2" : overlord ? "#ff4fc8" : "#ff2200",
      angle: 0,
      oscillate: 0,
      bossAge: type === "boss" ? 0 : undefined,
      missileTimer: titan ? 180 : undefined,
      specialAttackTimer: titan || overlord ? 150 : undefined,
      titanShieldCooldown: titan ? TITAN_SHIELD_COOLDOWN : undefined,
      titanShieldTimer: titan ? 0 : undefined,
      titanHealTimer: titan ? 60 : undefined,
      titanDashCooldown: titan ? TITAN_DASH_COOLDOWN : undefined,
      titanDashTimer: titan ? 0 : undefined,
      titanReinforcementsSpawned: titan ? false : undefined,
      bossTopPartHp: Math.max(8, Math.round(hp * .12)),
      bossBottomPartHp: Math.max(8, Math.round(hp * .12)),
    });
    bossDamageStartRef.current = runStatsRef.current.damageTaken;
    audioRef.current.effect("boss", settingsRef.current.soundVolume);
  }, []);

  const spawnFormationWave = useCallback((level: number) => {
    const waveId = ++waveSequenceRef.current;
    const pattern = waveId % 3;
    const isMajor = waveId % 5 === 0;
    const name = isMajor
      ? "MASSIVER GEGNERANGRIFF"
      : pattern === 0 ? "V-FORMATION" : pattern === 1 ? "BOMBER-ESKORTE" : "ABFANGSCHWARM";
    const count = isMajor ? 12 : pattern === 1 ? 5 : 7;
    const centerY = rand(150, CANVAS_H - 150);
    for (let index = 0; index < count; index++) {
      const isBomber = pattern === 1 && index === 0;
      const type: Enemy["type"] = isBomber ? "bomber" : level >= 5 && pattern === 2 ? "interceptor" : "fighter";
      const width = isBomber ? 56 : type === "interceptor" ? 36 : 48;
      const height = isBomber ? 40 : type === "interceptor" ? 22 : 28;
      const row = pattern === 0 ? Math.abs(index - Math.floor(count / 2)) : Math.floor(index / 2);
      const side = index % 2 === 0 ? -1 : 1;
      const y = pattern === 0
        ? centerY + (index - Math.floor(count / 2)) * 52
        : centerY + side * (35 + row * 45);
      const hp = isBomber ? 8 + level : type === "interceptor" ? 2 : 3 + Math.floor(level / 3);
      enemiesRef.current.push({
        x: CANVAS_W + 50 + row * 65,
        y: clamp(y, 90, CANVAS_H - height - 25),
        vx: isBomber ? -1.1 : type === "interceptor" ? -4.3 : -2.5,
        vy: 0,
        hp, maxHp: hp, width, height, type,
        shootCooldown: rand(65, 115),
        points: isBomber ? 110 : 45,
        color: isBomber ? "#ff7800" : "#ffd23f",
        angle: 0,
        oscillate: pattern === 2 ? 1.2 : 0,
        waveId,
      });
    }
    activeWaveRef.current = { id: waveId, name, active: true, isMajor };
    if (isMajor) {
      waveBannerRef.current = { text: `⚠ ${name} · ${count} GEGNER`, timer: 150 };
      audioRef.current.effect("boss", settingsRef.current.soundVolume * .6);
    }
  }, []);

  const fireBullets = useCallback((now: number) => {
    const gs = stateRef.current;
    const wingModule = WING_MODULES.find(module => module.id === aircraftBuildRef.current.wing) ?? WING_MODULES[0];
    const engineModule = ENGINE_MODULES.find(module => module.id === aircraftBuildRef.current.engine) ?? ENGINE_MODULES[0];
    const role = droneRoleRef.current;
    const buildDamageMultiplier = 1 + runUpgradesRef.current.glass_cannon * .65;
    const persistentDroneUpgrades = [
      "drone_mk2", "drone_mk3", "drone_mk4", "drone_mk5",
      "drone_mk6", "drone_mk7", "drone_mk8",
    ]
      .filter(id => activeUnlocksRef.current.includes(id)).length;
    const drone = getDroneStats(persistentDroneUpgrades + droneLevelRef.current - 1, runUpgradesRef.current.drone);
    const droneUltiActive = ultimaActiveRef.current > 0;
    const droneUltiId = activeDroneSkinRef.current.id;
    const droneFireMultiplier = droneUltiActive
      ? droneUltiId === "drone_omega" ? 0.25 : droneUltiId === "drone_solar" ? 0.33 : 0.5
      : 1;
    const droneDamageMultiplier = droneUltiActive
      ? droneUltiId === "drone_omega" ? 4 : droneUltiId === "drone_solar" || droneUltiId === "drone_nova" ? 3 : 2
      : 1;
    const droneWeapon = droneWeaponRef.current;
    const droneFireRate = 280 * drone.fireRateMultiplier * droneFireMultiplier * droneWeapon.fireRate * (role === "assault" ? .72 : 1);

    if (now - lastDroneFireRef.current >= droneFireRate) {
      lastDroneFireRef.current = now;
      const droneX = playerRef.current.x + PLAYER_W / 2;
      const droneY = clamp(playerRef.current.y - 30, 22, CANVAS_H - 22) + Math.sin(timeRef.current * 0.08) * 4;
      const offsets = drone.guns === 3 ? [-7, 0, 7] : drone.guns === 2 ? [-4, 4] : [0];
      const collectorTarget = role === "collector"
        ? enemiesRef.current.filter(enemy => !enemy.dead && enemy.hp > 0)
            .sort((a, b) => Math.hypot(a.x - droneX, a.y - droneY) - Math.hypot(b.x - droneX, b.y - droneY))[0] ?? null
        : null;
      const weaponSpread = droneWeapon.id === "ion_spread" ? [-.16, 0, .16] : [0];
      offsets.forEach(offset => weaponSpread.forEach(spread => bulletsRef.current.push({
        x: droneX + 22, y: droneY + offset,
        vx: droneWeapon.id === "rail_lance" ? 17 : BASE_BULLET_SPEED,
        vy: spread * BASE_BULLET_SPEED,
        fromPlayer: true,
        damage: (drone.damage + runUpgradesRef.current.damage) * droneWeapon.damageMultiplier * droneDamageMultiplier * buildDamageMultiplier * (role === "assault" ? 1.35 : 1),
        color: droneWeapon.color,
        isMissile: role === "collector",
        missileTarget: collectorTarget,
        weaponId: `drone_${droneWeapon.id}`,
      })));
    }

    const px = playerRef.current.x + PLAYER_W;
    const py = playerRef.current.y + PLAYER_H / 2;
    if (ultimaActiveRef.current > 0 && ["xwing", "n1"].includes(activeUltiSkinRef.current.id) &&
        now - lastWingmanFireRef.current >= 500) {
      lastWingmanFireRef.current = now;
      const livingTargets = enemiesRef.current.filter(enemy => !enemy.dead && enemy.hp > 0);
      [-50, 50].forEach((wingOffset, index) => {
        const wingY = clamp(playerRef.current.y + PLAYER_H / 2 + wingOffset, PLAYER_H, CANVAS_H - PLAYER_H);
        const target = [...livingTargets].sort((a, b) =>
          Math.hypot(a.x - px, a.y - wingY) - Math.hypot(b.x - px, b.y - wingY))[index % Math.max(1, livingTargets.length)] ?? null;
        bulletsRef.current.push({
          x: px, y: wingY, vx: 8.5, vy: 0, fromPlayer: true,
          damage: 5 + aircraftUpgradeRef.current.damageBonus,
          color: "#ff6a20", isMissile: true, missileTarget: target,
        });
      });
    }

    const aircraftUltiFireRate = ultimaActiveRef.current > 0 && ["gold", "crimson", "solaris"].includes(activeUltiSkinRef.current.id) ? 0.45 : 1;
    const gunOffsets: number[][] = [
      [0], [-8, 8], [-12, 0, 12], [-14, -5, 5, 14], [-14, -7, 0, 7, 14],
      [-15, -9, -3, 3, 9, 15], [-16, -10, -4, 0, 4, 10, 16],
    ];
    activeWeaponsRef.current.forEach((weapon, weaponIndex) => {
      const weaponStats = getWeaponStats(weapon, weaponLevelsRef.current[weapon.id] ?? 1);
      const tierFireBonus = Math.max(.62, 1 - gs.weaponTier * .045);
      const fireRate = weaponStats.fireRate * tierFireBonus * Math.pow(0.8, runUpgradesRef.current.rapid_fire) * aircraftUpgradeRef.current.fireRateMultiplier * aircraftUltiFireRate * wingModule.fireRate * engineModule.fireRate;
      if (now - (lastFireRef.current[weapon.id] ?? 0) < fireRate) return;
      lastFireRef.current[weapon.id] = now;
      const offsets = gunOffsets[Math.min(weapon.guns - 1, gunOffsets.length - 1)];
      const slotOffset = activeWeaponsRef.current.length > 1 ? (weaponIndex === 0 ? -4 : 4) : 0;

      offsets.forEach((oy, i) => {
      let vx = BASE_BULLET_SPEED * Math.pow(1.2, runUpgradesRef.current.kinetic_accelerator);
      let vy = 0;
      if (weapon.pattern === "spread" && offsets.length > 1) {
        const spread = (i - (offsets.length - 1) / 2) * 0.15;
        vy = spread * vx;
      }
      bulletsRef.current.push({
        x: px, y: py + oy + slotOffset,
        vx, vy,
        fromPlayer: true,
        damage: (weaponStats.damage + Math.floor(gs.weaponTier / 2) + runUpgradesRef.current.damage + aircraftUpgradeRef.current.damageBonus) * buildDamageMultiplier * (1 + wingModule.damage),
        color: weapon.color,
        weaponId: weapon.id,
      });
      });
    // TIE wingmen copy the normal cannons. X-Wings use their own targeted
    // two-shots-per-second fireball cadence below.
      if (ultimaActiveRef.current > 0 && activeUltiSkinRef.current.id === "tiefighter") {
      const wingmen = [-72, -36, 36, 72];
      wingmen.forEach(wingOffset => offsets.forEach((oy, i) => {
        let cvx = BASE_BULLET_SPEED;
        let cvy = 0;
        if (weapon.pattern === "spread" && offsets.length > 1) {
          const spread = (i - (offsets.length - 1) / 2) * 0.12;
          cvy = spread * BASE_BULLET_SPEED;
        }
        const wingY = clamp(playerRef.current.y + PLAYER_H / 2 + wingOffset, PLAYER_H, CANVAS_H - PLAYER_H);
        bulletsRef.current.push({
          x: px, y: wingY + oy, vx: cvx, vy: cvy, fromPlayer: true,
          damage: weaponStats.damage + aircraftUpgradeRef.current.damageBonus,
          color: weapon.color,
          weaponId: weapon.id,
        });
      }));
      }

    // Missiles
    const missileCooldown = 1800 * Math.pow(.72, runUpgradesRef.current.missile_mastery);
      if (weapon.pattern === "missile" && now - lastMissileRef.current > missileCooldown) {
      lastMissileRef.current = now;
      const target = enemiesRef.current[0] ?? null;
      bulletsRef.current.push({
        x: px, y: py,
        vx: 7, vy: 0,
        fromPlayer: true, damage: (weaponStats.damage * 1.8 + aircraftUpgradeRef.current.damageBonus + runUpgradesRef.current.missile_mastery * 4) * buildDamageMultiplier,
        color: weapon.color, weaponId: weapon.id, isMissile: true, missileTarget: target,
      });
      }
    });
  }, []);

  const fireWeaponCrate = useCallback((now: number) => {
    const crate = weaponCrateRef.current;
    if (now - lastWeaponCrateFireRef.current < crate.fireRate) return;
    lastWeaponCrateFireRef.current = now;
    const x = playerRef.current.x - 14;
    const y = playerRef.current.y + PLAYER_H / 2;
    const target = enemiesRef.current
      .filter(enemy => !enemy.dead && enemy.hp > 0)
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0] ?? null;

    if (crate.kind === "rockets") {
      [-5, 5].forEach(offset => bulletsRef.current.push({
        x, y: y + offset, vx: 7, vy: 0, fromPlayer: true,
        damage: crate.damage, color: crate.color, isMissile: true, missileTarget: target,
      }));
    } else if (crate.kind === "laser") {
      bulletsRef.current.push({
        x, y, vx: 15, vy: 0, fromPlayer: true,
        damage: crate.damage, color: crate.color, lifetime: 55,
      });
    } else {
      [-.22, 0, .22].forEach(spread => bulletsRef.current.push({
        x, y, vx: 11, vy: spread * 11, fromPlayer: true,
        damage: crate.damage, color: crate.color,
      }));
    }
  }, []);

  const startGame = useCallback((fromSave = false, requestedMode: GameMode = selectedGameMode) => {
    audioRef.current.unlock();
    const save = fromSave ? loadSave() : null;
    const mode = fromSave ? "classic" : requestedMode;
    const modeRules = getEffectiveGameModeRules(mode);
    activeModeRef.current = mode;
    const unlocks = loadUnlocks();
    const aircraftStats = getAircraftUpgradeStats(loadAircraftLevels()[loadSkin()] ?? 1);
    const build = loadAircraftBuild();
    const wingModule = WING_MODULES.find(module => module.id === build.wing) ?? WING_MODULES[0];
    const engineModule = ENGINE_MODULES.find(module => module.id === build.engine) ?? ENGINE_MODULES[0];
    const savedWingModule = save?.aircraftBuild
      ? WING_MODULES.find(module => module.id === save.aircraftBuild!.wing) ?? WING_MODULES[0]
      : wingModule;
    const savedEngineModule = save?.aircraftBuild
      ? ENGINE_MODULES.find(module => module.id === save.aircraftBuild!.engine) ?? ENGINE_MODULES[0]
      : engineModule;
    aircraftBuildRef.current = build;
    hybridActiveRef.current = loadHybridActive();
    droneBuildRef.current = loadDroneBuild();
    droneRoleRef.current = loadDroneRole();
    droneWeaponRef.current = DRONE_WEAPONS.find(weapon => weapon.id === loadDroneWeapon()) ?? DRONE_WEAPONS[0];
    droneLevelRef.current = loadDroneLevels()[loadDroneSkin()] ?? 1;
    const savedAircraftStats = getAircraftUpgradeStats(save?.aircraftLevel ?? 1);
    aircraftUpgradeRef.current = aircraftStats;
    activeUnlocksRef.current = unlocks;
    activeUltiLoadoutRef.current = loadUltiLoadout();
    activeWeaponsRef.current = loadWeapons().map(id => WEAPONS.find(weapon => weapon.id === id) ?? WEAPONS[0]);
    weaponLevelsRef.current = loadWeaponLevels();
    playerNameRef.current = loadName();
    stealthChargeRef.current = STEALTH_MAX;
    stealthActiveRef.current = 0;
    healChargeRef.current = HEAL_MAX;
    healActiveRef.current = 0;
    poisonMissileChargeRef.current = POISON_MISSILE_MAX;
    absorberChargeRef.current = ABSORBER_MAX;
    absorberActiveRef.current = 0;
    absorberHitsRef.current = 0;
    ultimateChargeRef.current = ULTIMATE_MAX;
    ultimateActiveRef.current = 0;
    speedBoostRef.current = 0;
    n1ShieldTimerRef.current = 0;
    playerShieldHpRef.current = 0;
    bestScoreRef.current = loadHighScore();
    pilotLevelRef.current = getPilotLevelFromKills();
    runUpgradesRef.current = save?.runUpgrades
      ? { ...EMPTY_RUN_UPGRADES, ...save.runUpgrades }
      : { ...EMPTY_RUN_UPGRADES };
    runStatsRef.current = {
      kills: 0, bosses: 0, damageTaken: 0, powerUps: 0,
      flawlessKills: 0, perfectBosses: 0, fullHealthPickups: 0,
      maxCombo: 0, nearMisses: 0, missions: 0,
    };
    bossDamageStartRef.current = 0;
    upgradeLevelRef.current = save?.upgradeLevel ?? 0;
    setRunUpgradeChoices([]);
    const baseMaxHp = Math.max(3, (unlocks.includes("max_hp") ? 15 : 10) + aircraftStats.maxHpBonus + wingModule.hp);
    const baseSpeed = 3.2 + (unlocks.includes("speed_item") ? 0.5 : 0) + aircraftStats.speedBonus + engineModule.speed;
    const savedMaxHpDelta = aircraftStats.maxHpBonus - savedAircraftStats.maxHpBonus +
      wingModule.hp - savedWingModule.hp;
    const resumedMaxHp = save ? Math.max(3, save.maxHp + savedMaxHpDelta) : baseMaxHp;
    const resumedHp = save ? Math.max(0, Math.min(save.hp + savedMaxHpDelta, resumedMaxHp)) : baseMaxHp;
    const resumedSpeed = save
      ? Math.max(0.1, save.speed + aircraftStats.speedBonus - savedAircraftStats.speedBonus +
          engineModule.speed - savedEngineModule.speed)
      : baseSpeed;
    stateRef.current = {
      score:      save?.score  ?? 0,
      level:      save?.level  ?? 1,
      hp:         resumedHp,
      maxHp:      resumedMaxHp,
      shield:     0,
      speed:      resumedSpeed,
      weaponTier: fromSave ? (save?.weaponTier ?? 0) : (unlocks.includes("weapon_head") ? 2 : 0),
      lives:      save?.lives  ?? modeRules.startingLives ?? (unlocks.includes("extra_life") ? 4 : 3),
      gameOver: false, started: true, paused: false,
    };
    const pendingRunUpgrade = fromSave &&
      stateRef.current.level >= 3 &&
      stateRef.current.level % 3 === 0 &&
      upgradeLevelRef.current !== stateRef.current.level;
    if (pendingRunUpgrade) {
      setRunUpgradeChoices([...RUN_UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3));
      stateRef.current.paused = true;
    }
    playerRef.current = { x: 60, y: CANVAS_H / 2 - PLAYER_H / 2 };
    bulletsRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    powerUpsRef.current = [];
    weaponCrateRef.current = WEAPON_CRATES.find(crate => crate.id === loadWeaponCrate()) ?? WEAPON_CRATES[0];
    weaponCrateNextActivationRef.current = WEAPON_CRATE_INTERVAL_MS;
    weaponCrateActiveUntilRef.current = 0;
    lastWeaponCrateFireRef.current = 0;
    enemySpawnTimerRef.current = 0;
    timeRef.current = 0;
    runElapsedMsRef.current = 0;
    protectPackageHpRef.current = PROTECT_PACKAGE_MAX_HP;
    protectPackageHitCooldownRef.current = 0;
    protectPackageRef.current = { x: 150, y: CANVAS_H / 2 - PROTECT_PACKAGE_HEIGHT / 2, direction: 1 };
    protectPackageLastFireRef.current = 0;
    bossRushSpawnTimerRef.current = 0;
    runResultRef.current = "game_over";
    rewardGrantedRef.current = false;
    lastFireRef.current = {};
    lastDroneFireRef.current = 0;
    lastWingmanFireRef.current = 0;
    lastMissileRef.current = 0;
    shieldTimerRef.current = 0;
    invincibleRef.current = 0;
    movementStunRef.current = 0;
    comboRef.current = 0;
    comboTimerRef.current = 0;
    comboMilestoneRef.current = { combo: 0, timer: 0 };
    screenShakeRef.current = 0;
    waveTimerRef.current = 0;
    waveSequenceRef.current = 0;
    activeWaveRef.current = null;
    waveBannerRef.current = { text: "MISSION GESTARTET", timer: 120 };
    droneSupportTimerRef.current = 0;
    rareEventTimerRef.current = 0;
    nextRareEventRef.current = rand(2100, 3300);
    titanWarningRef.current = 0;
    missionRef.current = createMission(0);
    ultimaChargeRef.current = ULTI_MAX;
    ultimaActiveRef.current = 0;
    laserChargeRef.current = LASER_MAX;
    laserActiveRef.current = 0;
    ultimateChargeRef.current = ULTIMATE_MAX;
    ultimateActiveRef.current = 0;
    milestoneBossFiredRef.current = new Set();
    titanBossFiredRef.current = new Set();
    saveExistsRef.current = !!loadSave();
    if (mode === "classic") {
      saveGame(stateRef.current, runUpgradesRef.current, upgradeLevelRef.current);
      saveExistsRef.current = true;
    }
    setPauseView("menu");
    const shouldTeach = settingsRef.current.tutorial && !tutorialSeen() && !fromSave;
    tutorialStageRef.current = shouldTeach ? 0 : -1;
    setTutorialStage(shouldTeach ? 0 : -1);
    syncDisplay();
  }, [selectedGameMode, syncDisplay]);

  const returnToHangar = useCallback(() => {
    const gs = stateRef.current;
    if (gs.score > 0 && activeModeRef.current === "classic") saveGame(gs, runUpgradesRef.current, upgradeLevelRef.current);
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

  const firePoisonMissiles = useCallback(() => {
    const living = enemiesRef.current.filter(enemy => !enemy.dead && enemy.hp > 0);
    const normalTargets = living.filter(enemy => !isBossEnemy(enemy));
    const eligibleTargets = normalTargets.length > 0 ? normalTargets : living.filter(isBossEnemy);
    if (eligibleTargets.length === 0) return false;

    const px = playerRef.current.x + PLAYER_W;
    const py = playerRef.current.y + PLAYER_H / 2;
    eligibleTargets.sort((a, b) =>
      Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py),
    );
    [-10, 0, 10].forEach((offset, index) => {
      bulletsRef.current.push({
        x: px,
        y: py + offset,
        vx: POISON_MISSILE_SPEED,
        vy: offset * 0.035,
        fromPlayer: true,
        damage: POISON_MISSILE_DIRECT_DAMAGE,
        isMissile: true,
        isPoisonMissile: true,
        missileTarget: eligibleTargets[index] ?? null,
        lifetime: 420,
      });
    });
    return true;
  }, []);

  const activateCombinedJetAndDroneUlti = useCallback(() => {
    if (ultimaChargeRef.current < ULTI_MAX || ultimaActiveRef.current > 0 || !activeUltiLoadoutRef.current.includes("jet")) return false;
    ultimaActiveRef.current = ULTI_DURATION;
    ultimaChargeRef.current = 0;

    if (activeUltiSkinRef.current.id === "jade") stateRef.current.hp = Math.min(stateRef.current.maxHp, stateRef.current.hp + 5);
    if (["steel", "jade"].includes(activeUltiSkinRef.current.id)) {
      shieldTimerRef.current = ULTI_DURATION;
      playerShieldHpRef.current = activeUltiSkinRef.current.id === "steel" ? 12 : 6;
    }
    if (activeUltiSkinRef.current.id === "solaris") {
      stateRef.current.hp = stateRef.current.maxHp;
      shieldTimerRef.current = ULTI_DURATION;
      playerShieldHpRef.current = 8;
    }

    // Every drone contributes its own ultimate to the aircraft ultimate.
    const droneId = activeDroneSkinRef.current.id;
    if (droneId === "drone_violet") {
      shieldTimerRef.current = Math.max(shieldTimerRef.current, ULTI_DURATION);
      playerShieldHpRef.current += 4;
    }
    if (droneId === "drone_phantom") invincibleRef.current = Math.max(invincibleRef.current, ULTI_DURATION);
    if (droneId === "drone_omega") {
      shieldTimerRef.current = Math.max(shieldTimerRef.current, ULTI_DURATION);
      playerShieldHpRef.current = Math.max(playerShieldHpRef.current, 12);
    }
    if (droneId === "drone_void") {
      enemiesRef.current.forEach(enemy => {
        if (enemy.dead || enemy.hp <= 0 || isTitanInvulnerable(enemy)) return;
        const ruptureDamage = isBossEnemy(enemy) ? Math.min(20, enemy.maxHp * .15) : enemy.hp * .35;
        enemy.hp = Math.max(1, enemy.hp - ruptureDamage);
        spawnExplosion(particlesRef.current, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, false);
      });
    }

    syncDisplay();
    return true;
  }, [syncDisplay]);

  const activateAbility = useCallback((id: UltiLoadoutId | undefined) => {
    if (!id || !stateRef.current.started || stateRef.current.gameOver || stateRef.current.paused) return false;
    const titanDashing = enemiesRef.current.some(enemy => enemy.type === "titan" && (enemy.titanDashTimer ?? 0) > 0);
    if (titanDashing) return false;

    if (id === "jet") return activateCombinedJetAndDroneUlti();
    if (id === "laser" && laserChargeRef.current >= LASER_MAX && laserActiveRef.current === 0) {
      laserActiveRef.current = LASER_DURATION;
      laserChargeRef.current = 0;
      return true;
    }
    if (id === "stealth_ulti" && stealthChargeRef.current >= STEALTH_MAX && stealthActiveRef.current === 0 &&
        activeUnlocksRef.current.includes(id)) {
      stealthActiveRef.current = STEALTH_DURATION;
      stealthChargeRef.current = 0;
      return true;
    }
    if (id === "heal_ulti" && healChargeRef.current >= HEAL_MAX && healActiveRef.current === 0 &&
        activeUnlocksRef.current.includes(id)) {
      stateRef.current.hp = Math.min(stateRef.current.maxHp, stateRef.current.hp + HEAL_ULTI_RESTORE);
      healActiveRef.current = HEAL_DURATION;
      healChargeRef.current = 0;
      syncDisplay();
      return true;
    }
    if (id === "poison_missiles_ulti" && poisonMissileChargeRef.current >= POISON_MISSILE_MAX &&
        activeUnlocksRef.current.includes(id) && firePoisonMissiles()) {
      poisonMissileChargeRef.current = 0;
      return true;
    }
    if (id === "absorber_ulti" && absorberChargeRef.current >= ABSORBER_MAX && absorberActiveRef.current === 0 &&
        activeUnlocksRef.current.includes(id)) {
      absorberActiveRef.current = ABSORBER_DURATION;
      absorberChargeRef.current = 0;
      absorberHitsRef.current = 0;
      return true;
    }
    if (id === "ultimate_ulti" && ultimateChargeRef.current >= ULTIMATE_MAX && ultimateActiveRef.current === 0 &&
        activeUnlocksRef.current.includes(id)) {
      ultimateActiveRef.current = ULTIMATE_DURATION;
      ultimateChargeRef.current = 0;
      stateRef.current.hp = Math.min(stateRef.current.maxHp, stateRef.current.hp + ULTIMATE_HEAL);
      syncDisplay();
      return true;
    }
    return false;
  }, [activateCombinedJetAndDroneUlti, firePoisonMissiles, syncDisplay]);

  useEffect(() => {
    initStars();
    initCity();
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const target = e.target as HTMLElement | null;
      const isMenuControl = Boolean(target?.closest("button, input, select, textarea, [role='button']"));
      const method = down ? "add" : "delete";
      keysRef.current[method](e.key);
      keysRef.current[method](e.code);
      const bindings = settingsRef.current.keyBindings;
      const movementCodes = [bindings.up, bindings.down, bindings.left, bindings.right, "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (down && tutorialStageRef.current === 0 && movementCodes.includes(e.code)) {
        if (settingsRef.current.autoFire) {
          tutorialStageRef.current = 2;
          setTutorialStage(2);
          window.setTimeout(finishTutorial, 1100);
        } else {
          tutorialStageRef.current = 1;
          setTutorialStage(1);
        }
      }
      if (down && tutorialStageRef.current === 1 && e.code === bindings.fire) {
        tutorialStageRef.current = 2; setTutorialStage(2);
        window.setTimeout(finishTutorial, 1100);
      }
      if (down && e.code === bindings.fire && !stateRef.current.started && !isMenuControl) {
        e.preventDefault();
        const shouldContinueClassicSave = saveExistsRef.current && selectedGameMode === "classic";
        startGame(shouldContinueClassicSave, selectedGameMode);
      }
      if ((e.key === "n" || e.key === "N") && !stateRef.current.started && down) {
        clearSave(); saveExistsRef.current = false; startGame(false);
      }
      if (down && (e.code === bindings.pause || e.code === "Escape")) {
        e.preventDefault();
        if (stateRef.current.started && !stateRef.current.gameOver) {
          stateRef.current.paused = !stateRef.current.paused;
          setPauseView("menu");
          syncDisplay();
        }
      }
      if (down && e.code === bindings.ability1) {
        activateAbility(activeUltiLoadoutRef.current[0]);
      }
      if (down && e.code === bindings.ability2) {
        activateAbility(activeUltiLoadoutRef.current[1]);
      }
      if (down && e.code === bindings.ability3) {
        activateAbility(activeUltiLoadoutRef.current[2]);
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
  }, [activateAbility, finishTutorial, initCity, initStars, startGame, syncDisplay]);

  useEffect(() => {
    let gamepadFrame = 0;
    const pollGamepad = () => {
      gamepadFrame = window.requestAnimationFrame(pollGamepad);
      const pad = navigator.getGamepads?.().find(candidate => candidate?.connected) ?? null;
      if (!pad) {
        gamepadInputRef.current = { x: 0, y: 0, firing: false };
        gamepadButtonsRef.current = [];
        return;
      }

      const deadZone = 0.18;
      const axisX = Math.abs(pad.axes[0] ?? 0) >= deadZone ? pad.axes[0] ?? 0 : 0;
      const axisY = Math.abs(pad.axes[1] ?? 0) >= deadZone ? pad.axes[1] ?? 0 : 0;
      gamepadInputRef.current = {
        x: axisX,
        y: axisY,
        firing: Boolean(pad.buttons[0]?.pressed || pad.buttons[7]?.pressed),
      };
      if (tutorialStageRef.current === 0 && (axisX !== 0 || axisY !== 0)) {
        if (settingsRef.current.autoFire) {
          tutorialStageRef.current = 2;
          setTutorialStage(2);
          window.setTimeout(finishTutorial, 1100);
        } else {
          tutorialStageRef.current = 1;
          setTutorialStage(1);
        }
      } else if (tutorialStageRef.current === 1 && gamepadInputRef.current.firing) {
        tutorialStageRef.current = 2;
        setTutorialStage(2);
        window.setTimeout(finishTutorial, 1100);
      }

      const previous = gamepadButtonsRef.current;
      const pressedOnce = (index: number) => Boolean(pad.buttons[index]?.pressed) && !previous[index];
      if (pressedOnce(9) && stateRef.current.started && !stateRef.current.gameOver) {
        stateRef.current.paused = !stateRef.current.paused;
        setPauseView("menu");
        syncDisplay();
      }
      if (pressedOnce(4)) activateAbility(activeUltiLoadoutRef.current[0]);
      if (pressedOnce(5)) activateAbility(activeUltiLoadoutRef.current[1]);
      if (pressedOnce(6)) activateAbility(activeUltiLoadoutRef.current[2]);
      gamepadButtonsRef.current = pad.buttons.map(button => button.pressed);
    };
    pollGamepad();
    return () => window.cancelAnimationFrame(gamepadFrame);
  }, [activateAbility, finishTutorial, syncDisplay]);

  useEffect(() => {
    const pointerQuery = window.matchMedia?.("(pointer: coarse)");
    const updateVirtualControlVisibility = () => {
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const preference = settingsRef.current.touchControls;
      const shouldShow = preference === "always" || (preference === "auto" && shouldShowVirtualControls(hasTouch, pointerQuery?.matches ?? false));
      showVirtualControlsRef.current = shouldShow;
      setShowVirtualControls(shouldShow);
    };

    updateVirtualControlVisibility();
    pointerQuery?.addEventListener?.("change", updateVirtualControlVisibility);
    return () => pointerQuery?.removeEventListener?.("change", updateVirtualControlVisibility);
  }, [settings.touchControls]);

  // Touch event setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const gs = stateRef.current;

      // The hangar has explicit start buttons. Ignoring canvas taps while the
      // game is stopped prevents a touch intended for an overlay button from
      // leaking through and launching a mission.
      if (!gs.started) return;
      if (gs.gameOver) { startGame(false); return; }
      // Tap to unpause
      if (gs.paused) { gs.paused = false; syncDisplay(); return; }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const { x, y } = toCanvas(t.clientX, t.clientY);
        if (x < CANVAS_W / 2) {
          if (tutorialStageRef.current === 0) {
            if (settingsRef.current.autoFire) {
              tutorialStageRef.current = 2;
              setTutorialStage(2);
              window.setTimeout(finishTutorial, 1100);
            } else {
              tutorialStageRef.current = 1;
              setTutorialStage(1);
            }
          }
          // Left half → direct finger-follow movement
          if (!joystickRef.current.active) {
            joystickRef.current = { active: true, id: t.identifier, centerX: x, centerY: y, curX: x, curY: y };
          }
        } else {
          // Check ULTI button first
          const titanDashing = enemiesRef.current.some(enemy => enemy.type === "titan" && (enemy.titanDashTimer ?? 0) > 0);
          const distanceToUlti = (id: UltiLoadoutId) => {
            const position = getUltiButtonPosition(activeUltiLoadoutRef.current, id);
            return position ? Math.hypot(x - position[0], y - position[1]) : Number.POSITIVE_INFINITY;
          };
          const du = distanceToUlti("jet");
          const dl = distanceToUlti("laser");
          const ds = distanceToUlti("stealth_ulti");
          const dh = distanceToUlti("heal_ulti");
          const dx = distanceToUlti("ultimate_ulti");
          const dp = distanceToUlti("poison_missiles_ulti");
          const da = distanceToUlti("absorber_ulti");
          if (titanDashing && Math.min(du, dl, ds, dh, dx, dp, da) <= 50) {
            continue;
          } else if (da <= ABSORBER_BTN_R + 12 && absorberChargeRef.current >= ABSORBER_MAX && absorberActiveRef.current === 0
              && activeUnlocksRef.current.includes("absorber_ulti") && activeUltiLoadoutRef.current.includes("absorber_ulti")) {
            absorberActiveRef.current = ABSORBER_DURATION;
            absorberChargeRef.current = 0;
            absorberHitsRef.current = 0;
          } else if (dp <= POISON_MISSILE_BTN_R + 12 && poisonMissileChargeRef.current >= POISON_MISSILE_MAX
              && activeUnlocksRef.current.includes("poison_missiles_ulti") && activeUltiLoadoutRef.current.includes("poison_missiles_ulti")
              && firePoisonMissiles()) {
            poisonMissileChargeRef.current = 0;
          } else if (dx <= ULTIMATE_BTN_R + 12 && ultimateChargeRef.current >= ULTIMATE_MAX && ultimateActiveRef.current === 0
              && activeUnlocksRef.current.includes("ultimate_ulti") && activeUltiLoadoutRef.current.includes("ultimate_ulti")) {
            ultimateActiveRef.current = ULTIMATE_DURATION;
            ultimateChargeRef.current = 0;
            stateRef.current.hp = Math.min(stateRef.current.maxHp, stateRef.current.hp + ULTIMATE_HEAL);
            syncDisplay();
          } else if (dh <= HEAL_BTN_R + 12 && healChargeRef.current >= HEAL_MAX && healActiveRef.current === 0
              && activeUnlocksRef.current.includes("heal_ulti") && activeUltiLoadoutRef.current.includes("heal_ulti")) {
            stateRef.current.hp = Math.min(stateRef.current.maxHp, stateRef.current.hp + HEAL_ULTI_RESTORE);
            healActiveRef.current = HEAL_DURATION;
            healChargeRef.current = 0;
            syncDisplay();
          } else if (ds <= STEALTH_BTN_R + 12 && stealthChargeRef.current >= STEALTH_MAX && stealthActiveRef.current === 0
              && activeUnlocksRef.current.includes("stealth_ulti") && activeUltiLoadoutRef.current.includes("stealth_ulti")) {
            stealthActiveRef.current = STEALTH_DURATION;
            stealthChargeRef.current = 0;
          } else if (dl <= LASER_BTN_R + 12 && laserChargeRef.current >= LASER_MAX && laserActiveRef.current === 0 && activeUltiLoadoutRef.current.includes("laser")) {
            laserActiveRef.current = LASER_DURATION;
            laserChargeRef.current = 0;
          } else if (du <= ULTI_BTN_R + 12 && ultimaChargeRef.current >= ULTI_MAX && ultimaActiveRef.current === 0 && activeUltiLoadoutRef.current.includes("jet")) {
            activateCombinedJetAndDroneUlti();
            syncDisplay();
          } else if (!settingsRef.current.autoFire && !touchFireRef.current.active) {
            if (tutorialStageRef.current === 1) {
              tutorialStageRef.current = 2; setTutorialStage(2); window.setTimeout(finishTutorial, 1100);
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
  }, [finishTutorial, firePoisonMissiles, startGame, syncDisplay, toCanvas]);

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
          if (!settingsRef.current.reducedMotion) s.x -= s.speed * 2.8 * BACKGROUND_SPEED_MULTIPLIER;
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
          if (!settingsRef.current.reducedMotion) s.x -= s.speed * 0.32 * BACKGROUND_SPEED_MULTIPLIER;
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

          const drift = settingsRef.current.reducedMotion ? 0 : (timeRef.current * 0.3 * BACKGROUND_SPEED_MULTIPLIER) % 150;
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
        drawCityLayer(cityFarRef.current,  0.55 * BACKGROUND_SPEED_MULTIPLIER, "#2c3f62");
        drawCityLayer(cityNearRef.current, 1.55 * BACKGROUND_SPEED_MULTIPLIER, "#1a2840");
      }

      const backgroundTransition = backgroundTransitionRef.current;
      if (backgroundTransition) {
        if (settingsRef.current.reducedMotion) {
          backgroundTransitionRef.current = null;
        } else {
          backgroundTransition.elapsed += dt;
          const progress = Math.min(1, backgroundTransition.elapsed / BACKGROUND_TRANSITION_MS);
          const easedProgress = progress * progress * (3 - 2 * progress);

          ctx.save();
          ctx.globalAlpha = 1 - easedProgress;
          ctx.drawImage(backgroundTransition.snapshot, 0, 0);

          // A narrow light front makes the scene change feel intentional while
          // keeping enemies and controls unobscured during gameplay.
          const frontX = -CANVAS_W * 0.2 + progress * CANVAS_W * 1.4;
          const lightFront = ctx.createLinearGradient(frontX - 90, 0, frontX + 90, 0);
          lightFront.addColorStop(0, "rgba(150,225,255,0)");
          lightFront.addColorStop(0.5, `rgba(210,245,255,${Math.sin(progress * Math.PI) * 0.24})`);
          lightFront.addColorStop(1, "rgba(150,225,255,0)");
          ctx.globalAlpha = 1;
          ctx.fillStyle = lightFront;
          ctx.fillRect(frontX - 90, 0, 180, CANVAS_H);
          ctx.restore();

          if (progress >= 1) backgroundTransitionRef.current = null;
        }
      }

      if (!gs.started) {
        return; // Hangar React overlay handles this screen
      }

      if (isPortraitPhoneRef.current) {
        return;
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
        const completed = runResultRef.current === "complete";
        ctx.fillStyle = completed ? "#4ade80" : "#ff4444"; ctx.font = "bold 46px 'Inter', sans-serif";
        ctx.shadowColor = completed ? "#4ade80" : "#ff4444"; ctx.shadowBlur = 20;
        ctx.fillText(completed ? "MISSION GESCHAFFT" : "GAME OVER", CANVAS_W/2, CANVAS_H/2-36);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff"; ctx.font = "24px 'Inter', sans-serif";
        ctx.fillText(`Score: ${gs.score.toLocaleString("de-DE")}`, CANVAS_W/2, CANVAS_H/2+10);
        ctx.fillStyle = "#aaa"; ctx.font = "15px 'Inter', sans-serif";
        ctx.fillText(`Level ${gs.level}  ·  ${WEAPON_TIERS[gs.weaponTier].name}`, CANVAS_W/2, CANVAS_H/2+40);
        ctx.fillStyle = "#ffcc44"; ctx.font = "13px 'Inter', sans-serif";
        ctx.fillText("🏆 Score gespeichert — Rangliste im Hangar!", CANVAS_W/2, CANVAS_H/2+62);
        ctx.fillStyle = "#ffd966"; ctx.font = "bold 16px 'Inter', sans-serif";
        const modeReward = Math.round(calculateCoinReward(gs.score) * getModeCoinMultiplier(activeModeRef.current));
        const gemReward = Math.floor(modeReward / 100);
        ctx.fillText(`Belohnung: +${modeReward.toLocaleString("de-DE")} Credits · +${gemReward.toLocaleString("de-DE")} Juwelen`, CANVAS_W/2, CANVAS_H/2+86);
        const sLeft = Math.max(0, Math.ceil((200 - gameOverCountdownRef.current) / 60));
        ctx.fillStyle = sLeft > 0 ? "#666" : "#ffcc00";
        ctx.font = "13px 'Inter', sans-serif";
        ctx.fillText(sLeft > 0 ? `Zurück zum Hangar in ${sLeft}s …  (SPACE zum Überspringen)` : "Zum Hangar …", CANVAS_W/2, CANVAS_H/2+110);
        ctx.restore();
        if (keysRef.current.has(settingsRef.current.keyBindings.fire) || gameOverCountdownRef.current > 200) {
          gameOverCountdownRef.current = 0;
          gs.started = false; gs.gameOver = false;
          syncDisplay();
        }
        return;
      }

      const tutorialActive = tutorialStageRef.current >= 0;
      if (tutorialActive) {
        enemiesRef.current = [];
        bulletsRef.current = bulletsRef.current.filter(bullet => bullet.fromPlayer);
        enemySpawnTimerRef.current = 0;
        bossRushSpawnTimerRef.current = 0;
        invincibleRef.current = Math.max(invincibleRef.current, 10);
      } else {
        runElapsedMsRef.current += dt;
      }
      const modeRules = getEffectiveGameModeRules(activeModeRef.current);
      if (modeRules.durationSeconds !== null && runElapsedMsRef.current >= modeRules.durationSeconds * 1000) {
        if (activeModeRef.current === "protect") gs.score += 10_000;
        runResultRef.current = "complete";
        gs.gameOver = true;
        grantRunReward();
        return;
      }

      if (activeModeRef.current === "protect") {
        const escort = protectPackageRef.current;
        const targetY = chooseProtectPackageTargetY(escort, bulletsRef.current, enemiesRef.current);
        const targetDelta = targetY - escort.y;
        const desiredDirection = Math.abs(targetDelta) > 2 ? Math.sign(targetDelta) : escort.direction;
        const nextY = Math.max(
          PROTECT_PACKAGE_MIN_Y,
          Math.min(PROTECT_PACKAGE_MAX_Y, escort.y + desiredDirection * PROTECT_PACKAGE_SPEED * dtScale),
        );
        const wouldHitAircraft = enemiesRef.current.some(enemy =>
          !enemy.dead && enemy.hp > 0 &&
          rectHit(
            escort.x - 8, nextY - 8,
            PROTECT_PACKAGE_WIDTH + 16, PROTECT_PACKAGE_HEIGHT + 16,
            enemy.x, enemy.y, enemy.width, enemy.height,
          ));
        if (!wouldHitAircraft) escort.y = nextY;
        escort.direction = desiredDirection || escort.direction;
        if (escort.y <= PROTECT_PACKAGE_MIN_Y) {
          escort.y = PROTECT_PACKAGE_MIN_Y;
          escort.direction = 1;
        } else if (escort.y >= PROTECT_PACKAGE_MAX_Y) {
          escort.y = PROTECT_PACKAGE_MAX_Y;
          escort.direction = -1;
        }

        if (runElapsedMsRef.current - protectPackageLastFireRef.current >= PROTECT_PACKAGE_FIRE_INTERVAL_MS) {
          const originX = escort.x + PROTECT_PACKAGE_WIDTH + 10;
          const originY = escort.y + PROTECT_PACKAGE_HEIGHT / 2;
          const target = enemiesRef.current
            .filter(enemy => !enemy.dead && enemy.hp > 0)
            .sort((a, b) =>
              Math.hypot(a.x - originX, a.y + a.height / 2 - originY) -
              Math.hypot(b.x - originX, b.y + b.height / 2 - originY))[0];
          if (target) {
            const targetX = target.x + target.width / 2;
            const targetY = target.y + target.height / 2;
            const angle = Math.atan2(targetY - originY, targetX - originX);
            bulletsRef.current.push({
              x: originX,
              y: originY,
              vx: Math.cos(angle) * 12,
              vy: Math.sin(angle) * 12,
              fromPlayer: true,
              damage: 14,
              color: "#67e8f9",
              weaponId: "escort-cannon",
            });
            protectPackageLastFireRef.current = runElapsedMsRef.current;
            audioRef.current.tone(680, .13, settingsRef.current.soundVolume * .32, "square");
            floatingTextsRef.current.push({
              x: originX, y: originY - 12, text: "ZIEL ERFASST", color: "#67e8f9", life: 45, maxLife: 45,
            });
          }
        }
      }

      audioRef.current.updateMusic(gs.level, settingsRef.current.musicVolume, dtScale);

      if (screenShakeRef.current > 0 && !settingsRef.current.reducedMotion) {
        const strength = screenShakeRef.current;
        canvas.style.transform = `translate(${rand(-strength, strength)}px, ${rand(-strength, strength)}px)`;
        screenShakeRef.current = Math.max(0, screenShakeRef.current - 1.4 * dtScale);
      } else {
        canvas.style.transform = "";
      }
      if (comboTimerRef.current > 0) {
        comboTimerRef.current = Math.max(0, comboTimerRef.current - dtScale);
        if (comboTimerRef.current === 0) comboRef.current = 0;
      }
      nearMissCooldownRef.current = Math.max(0, nearMissCooldownRef.current - dtScale);
      const activeMission = missionRef.current;
      if (!activeMission.completed && missionProgress(activeMission, runStatsRef.current) >= activeMission.target) {
        activeMission.completed = true;
        addCoins(activeMission.reward);
        runStatsRef.current.missions += 1;
        checkAchievements();
        waveBannerRef.current = { text: `MISSION ERFÜLLT · +${activeMission.reward}`, timer: 180 };
        audioRef.current.effect("upgrade", settingsRef.current.soundVolume);
        window.setTimeout(() => {
          missionRef.current = createMission(runStatsRef.current.missions);
          waveBannerRef.current = { text: "NEUES MISSIONSZIEL", timer: 100 };
        }, 2200);
      }

      // ── Input & Player Movement ──
      const n1UltiSpeed = activeUltiSkinRef.current.id === "n1" && ultimaActiveRef.current > 0 ? 2 : 1;
      const speedMult = (activeSkinRef.current?.id === "n1" ? 1.15 : 1) * n1UltiSpeed * (speedBoostRef.current > 0 ? 2 : 1);
      const spd = gs.speed * speedMult;
      const js = joystickRef.current;
      const gamepad = gamepadInputRef.current;
      const bindings = settingsRef.current.keyBindings;
      const keyPressed = (action: KeyBindingAction) => keysRef.current.has(bindings[action]);

      movementStunRef.current = Math.max(0, movementStunRef.current - dtScale);
      if (movementStunRef.current <= 0 && js.active) {
        playerRef.current.x = clamp(js.curX - PLAYER_W / 2, 0, CANVAS_W - PLAYER_W);
        playerRef.current.y = clamp(js.curY - PLAYER_H / 2, 0, CANVAS_H - PLAYER_H);
      } else if (movementStunRef.current <= 0) {
        if (keyPressed("up") || keysRef.current.has("ArrowUp")) {
          playerRef.current.y = clamp(playerRef.current.y - spd * dtScale, 0, CANVAS_H - PLAYER_H);
        }
        if (keyPressed("down") || keysRef.current.has("ArrowDown")) {
          playerRef.current.y = clamp(playerRef.current.y + spd * dtScale, 0, CANVAS_H - PLAYER_H);
        }
        if (keyPressed("left") || keysRef.current.has("ArrowLeft")) {
          playerRef.current.x = clamp(playerRef.current.x - spd * 0.8 * dtScale, 0, CANVAS_W - PLAYER_W);
        }
        if (keyPressed("right") || keysRef.current.has("ArrowRight")) {
          playerRef.current.x = clamp(playerRef.current.x + spd * 0.8 * dtScale, 0, CANVAS_W - PLAYER_W);
        }
        if (gamepad.x !== 0 || gamepad.y !== 0) {
          playerRef.current.x = clamp(playerRef.current.x + gamepad.x * spd * 0.8 * dtScale, 0, CANVAS_W - PLAYER_W);
          playerRef.current.y = clamp(playerRef.current.y + gamepad.y * spd * dtScale, 0, CANVAS_H - PLAYER_H);
        }
      }

      const firing = settingsRef.current.autoFire || keyPressed("fire") || touchFireRef.current.active || gamepad.firing;
      if (firing) fireBullets(timestamp);

      if (runElapsedMsRef.current >= weaponCrateNextActivationRef.current) {
        weaponCrateActiveUntilRef.current = runElapsedMsRef.current + WEAPON_CRATE_DURATION_MS;
        weaponCrateNextActivationRef.current += WEAPON_CRATE_INTERVAL_MS;
        const crate = weaponCrateRef.current;
        waveBannerRef.current = {
          text: `${crate.name.toUpperCase()} · ${crate.rarity.toUpperCase()} · 5 SEKUNDEN`,
          timer: 110,
        };
        audioRef.current.effect("upgrade", settingsRef.current.soundVolume * .7);
      }
      const weaponCrateActive = runElapsedMsRef.current < weaponCrateActiveUntilRef.current;
      if (weaponCrateActive) fireWeaponCrate(timestamp);

      // ── Level / Weapon tier ──
      const nextLevel = getLevelForScore(gs.score);
      if (nextLevel !== gs.level) {
        const backgroundChanges =
          shouldUseSpaceBackground(nextLevel) !== shouldUseSpaceBackground(gs.level) ||
          shouldUseAboveCloudsBackground(nextLevel) !== shouldUseAboveCloudsBackground(gs.level) ||
          shouldUseCityBackground(nextLevel) !== shouldUseCityBackground(gs.level);
        if (backgroundChanges && !settingsRef.current.reducedMotion) {
          const snapshot = document.createElement("canvas");
          snapshot.width = CANVAS_W;
          snapshot.height = CANVAS_H;
          snapshot.getContext("2d")?.drawImage(canvas, 0, 0);
          backgroundTransitionRef.current = { snapshot, elapsed: 0 };
        }
        const gainedLevels = nextLevel - gs.level;
        gs.level = nextLevel;
        waveBannerRef.current = { text: `LEVEL ${nextLevel} · WAFFEN VERBESSERT`, timer: 110 };
        screenShakeRef.current = Math.max(screenShakeRef.current, 5);
        const tierIndex = Math.min(nextLevel - 1, WEAPON_TIERS.length - 1);
        gs.weaponTier = Math.max(gs.weaponTier, tierIndex);
        gs.speed += gainedLevels * 0.25;
        if (activeModeRef.current === "classic") {
          saveGame(gs, runUpgradesRef.current, upgradeLevelRef.current);
          saveExistsRef.current = true;
        }
        if (nextLevel >= 3 && nextLevel % 3 === 0 && upgradeLevelRef.current !== nextLevel) {
          const availableUpgrades = runUpgradesRef.current.extra_life >= 1
            ? RUN_UPGRADES.filter(upgrade => upgrade.id !== "extra_life")
            : RUN_UPGRADES;
          const choices = [...availableUpgrades].sort(() => Math.random() - 0.5).slice(0, 3);
          setRunUpgradeChoices(choices); gs.paused = true; syncDisplay();
        }
      }

      // ── Titan: exclusive boss fight every tenth level, starting at level 20 ──
      if (activeModeRef.current !== "boss_rush" && isTitanBossLevel(gs.level) && !titanBossFiredRef.current.has(gs.level)) {
        titanBossFiredRef.current.add(gs.level);
        // An evolved milestone Overlord has 1.5x its initial HP. The Titan has exactly 15x that value.
        const overlordHp = Math.round((80 + gs.level * 12) * 1.5);
        const titanHp = increasedBossHealth(overlordHp * 15);
        enemiesRef.current = [];
        bulletsRef.current = bulletsRef.current.filter(b => b.fromPlayer);
        titanWarningRef.current = 180;
        enemiesRef.current.push({
          x: CANVAS_W + 25,
          y: CANVAS_H / 2 - 68,
          vx: -.55, vy: 0,
          hp: titanHp, maxHp: titanHp,
          width: 158, height: 136,
          type: "titan",
          shootCooldown: 14,
          points: 5000 + gs.level * 250,
          color: "#ff3fd2",
          angle: 0,
          oscillate: 0,
          missileTimer: 180,
          specialAttackTimer: 150,
          titanShieldCooldown: TITAN_SHIELD_COOLDOWN,
          titanShieldTimer: 0,
          titanHealTimer: 60,
          titanDashCooldown: TITAN_DASH_COOLDOWN,
          titanDashTimer: 0,
          titanReinforcementsSpawned: false,
          bossTopPartHp: Math.max(10, Math.round(titanHp * .10)),
          bossBottomPartHp: Math.max(10, Math.round(titanHp * .10)),
        });
        bossDamageStartRef.current = runStatsRef.current.damageTaken;
        audioRef.current.effect("boss", settingsRef.current.soundVolume);
      }

      const titanActive = enemiesRef.current.some(e => e.type === "titan" && !e.dead);

      // ── Drone support roles ──
      droneSupportTimerRef.current += dtScale;
      const droneRole = droneRoleRef.current;
      const supportInterval = droneRole === "guardian" ? 8 * 60 : 12 * 60;
      if ((droneRole === "guardian" || droneRole === "repair") && droneSupportTimerRef.current >= supportInterval) {
        droneSupportTimerRef.current = 0;
        if (droneRole === "guardian") {
          shieldTimerRef.current = Math.max(shieldTimerRef.current, 8 * 60);
          playerShieldHpRef.current = Math.min(5, playerShieldHpRef.current + 1);
          waveBannerRef.current = { text: "🛡 WÄCHTERDROHNE · SCHILD +1", timer: 90 };
        } else if (gs.hp < gs.maxHp) {
          gs.hp = Math.min(gs.maxHp, gs.hp + 1);
          waveBannerRef.current = { text: "✚ SANITÄTERDROHNE · +1 HP", timer: 90 };
        }
        audioRef.current.effect("pickup", settingsRef.current.soundVolume * .55);
      }

      // ── Rare encounters: one surprising event roughly every 35–55 seconds ──
      if (!tutorialActive && activeModeRef.current !== "boss_rush") {
        rareEventTimerRef.current += dtScale;
        if (rareEventTimerRef.current >= nextRareEventRef.current && !titanActive) {
          rareEventTimerRef.current = 0;
          nextRareEventRef.current = rand(2100, 3300);
          const eventRoll = Math.random();
          if (eventRoll < .34) {
            waveBannerRef.current = { text: "☄ SELTENES EREIGNIS · METEORSTURM", timer: 180 };
            for (let index = 0; index < 9; index++) {
              const hp = 2 + Math.floor(gs.level / 4);
              enemiesRef.current.push({
                x: CANVAS_W + 80 + index * 65, y: rand(25, CANVAS_H - 45),
                vx: -rand(5.5, 8), vy: rand(-.5, .5), hp, maxHp: hp,
                width: 30, height: 18, type: "interceptor", shootCooldown: 999,
                points: 80 + gs.level * 5, color: "#ff7a28", angle: 0,
                archetype: "kamikaze", ramDamage: 2,
              });
            }
          } else if (eventRoll < .67) {
            gs.hp = Math.min(gs.maxHp, gs.hp + 3);
            shieldTimerRef.current = Math.max(shieldTimerRef.current, 10 * 60);
            playerShieldHpRef.current = Math.max(playerShieldHpRef.current, 3);
            waveBannerRef.current = { text: "✦ SELTENES EREIGNIS · REPARATURNEBEL · +3 HP", timer: 180 };
          } else {
            const collectorBonus = droneRole === "collector" ? 1.25 : 1;
            const eventCredits = Math.round((1500 + gs.level * 250) * collectorBonus);
            addCoins(eventCredits);
            gs.score += eventCredits;
            waveBannerRef.current = { text: `◆ SCHATZKONVOI · +${eventCredits.toLocaleString("de-DE")} CREDITS`, timer: 180 };
            for (let index = 0; index < 5; index++) {
              const hp = 3 + Math.floor(gs.level / 3);
              enemiesRef.current.push({
                x: CANVAS_W + 60 + index * 75, y: 110 + index * 78,
                vx: -2.2, vy: 0, hp, maxHp: hp, width: 45, height: 25,
                type: "fighter", shootCooldown: rand(90, 140), points: 250,
                color: "#ffd84d", angle: 0, isGolden: true, goldenTimer: 900,
              });
            }
          }
          audioRef.current.effect("boss", settingsRef.current.soundVolume * .7);
        }
      }

      // ── Milestone boss: spawn a mega-boss when entering key levels ──
      if (activeModeRef.current !== "boss_rush" && !titanActive && !isTitanBossLevel(gs.level) && isMilestoneBossLevel(gs.level) && !milestoneBossFiredRef.current.has(gs.level) &&
          enemiesRef.current.filter(isBossEnemy).length === 0) {
        milestoneBossFiredRef.current.add(gs.level);
        const ml = gs.level;
        const mbHp = increasedBossHealth(80 + ml * 12);
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
          bossTopPartHp: Math.max(8, Math.round(mbHp * .12)),
          bossBottomPartHp: Math.max(8, Math.round(mbHp * .12)),
        });
        bossDamageStartRef.current = runStatsRef.current.damageTaken;
        audioRef.current.effect("boss", settingsRef.current.soundVolume);
      }

      // ── Spawn enemies ──
      if (tutorialActive) {
        enemySpawnTimerRef.current = 0;
        bossRushSpawnTimerRef.current = 0;
      } else if (activeModeRef.current === "boss_rush") {
        bossRushSpawnTimerRef.current += dtScale;
        if (!enemiesRef.current.some(enemy => isBossEnemy(enemy) && !enemy.dead) && bossRushSpawnTimerRef.current >= 90) {
          bossRushSpawnTimerRef.current = 0;
          spawnBossRushEnemy(runStatsRef.current.bosses + 1);
        }
      } else {
        const spawnRate = getEnemySpawnRate(gs.level) * getEffectiveGameModeRules(activeModeRef.current).spawnRateMultiplier;
        enemySpawnTimerRef.current += dtScale;
        waveTimerRef.current += dtScale;
        if (!titanActive && waveTimerRef.current >= 780 && !activeWaveRef.current?.active) {
          waveTimerRef.current = 0;
          spawnFormationWave(gs.level);
        }
        if (!titanActive && enemySpawnTimerRef.current >= spawnRate) {
          enemySpawnTimerRef.current = 0;
          spawnEnemy(gs.level);
        }
      }

      if (activeWaveRef.current?.active &&
          !enemiesRef.current.some(enemy => enemy.waveId === activeWaveRef.current?.id && !enemy.dead)) {
        activeWaveRef.current.active = false;
        addCoins(500);
        gs.score += 500;
        if (activeWaveRef.current.isMajor) {
          waveBannerRef.current = { text: "GROSSANGRIFF ABGEWEHRT · +500", timer: 130 };
          audioRef.current.effect("upgrade", settingsRef.current.soundVolume);
        }
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
        const living = b.isPoisonMissile ? enemiesRef.current.filter(enemy => !enemy.dead && enemy.hp > 0) : [];
        const normalTargets = living.filter(enemy => !isBossEnemy(enemy));
        const reservedTargets = new Set(bulletsRef.current
          .filter(other => other !== b && other.isPoisonMissile && other.missileTarget && !other.missileTarget.dead)
          .map(other => other.missileTarget));
        if (b.isPoisonMissile && (!b.missileTarget || b.missileTarget.dead || b.missileTarget.hp <= 0 ||
          (isBossEnemy(b.missileTarget) && normalTargets.length > 0))) {
          const eligibleTargets = (normalTargets.length > 0 ? normalTargets : living.filter(isBossEnemy))
            .filter(enemy => !reservedTargets.has(enemy));
          b.missileTarget = eligibleTargets.sort((a, target) =>
            Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(target.x - b.x, target.y - b.y),
          )[0] ?? null;
        }
        if (b.isMissile && b.missileTarget && !b.missileTarget.dead) {
          const tx = b.missileTarget.x + b.missileTarget.width / 2;
          const ty = b.missileTarget.y + b.missileTarget.height / 2;
          const ang = Math.atan2(ty - b.y, tx - b.x);
          const targetSpeed = b.isPoisonMissile ? POISON_MISSILE_SPEED : 0.6;
          const steer = 1 - Math.pow(1 - (b.isPoisonMissile ? 0.2 : 0.08), dtScale);
          b.vx += (Math.cos(ang) * targetSpeed - b.vx) * steer;
          b.vy += (Math.sin(ang) * targetSpeed - b.vy) * steer;
          const spd2 = Math.hypot(b.vx, b.vy);
          const ms = b.isPoisonMissile ? POISON_MISSILE_SPEED : 7;
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
        if (!b.fromPlayer && ultimaActiveRef.current > 0 && activeUltiSkinRef.current.id === "voidreaper") return false;
        const projectileSpeed = !b.fromPlayer && ultimaActiveRef.current > 0 && activeUltiSkinRef.current.id === "arctic" ? 0 : 1;
        b.x += b.vx * dtScale * projectileSpeed;
        b.y += b.vy * dtScale * projectileSpeed;
        drawBullet(ctx, b);
        return b.x > -20 && b.x < CANVAS_W + 20 && b.y > -20 && b.y < CANVAS_H + 20;
      });

      // ── Update enemies ──
      protectPackageHitCooldownRef.current = Math.max(0, protectPackageHitCooldownRef.current - dtScale);
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
        const fluxBonus = 1 + runUpgradesRef.current.flux_capacitor * .25;
        ultimaChargeRef.current = Math.min(ULTI_MAX, ultimaChargeRef.current + 0.09 * cloneMult * cloneBonus * fluxBonus * dtScale);
      }
      // ── Laser charge & countdown ──
      if (laserActiveRef.current > 0) {
        laserActiveRef.current = Math.max(0, laserActiveRef.current - dtScale);
      } else if (laserChargeRef.current < LASER_MAX) {
        const laserMult = activeUnlocksRef.current.includes("ulti_boost") ? 1.5 : 1;
        const laserBonus = activeUnlocksRef.current.includes("laser_upgrade") ? 1.25 : 1;
        const fluxBonus = 1 + runUpgradesRef.current.flux_capacitor * .25;
        laserChargeRef.current = Math.min(LASER_MAX, laserChargeRef.current + 0.10 * laserMult * laserBonus * fluxBonus * dtScale);
      }
      // ── Stealth charge & countdown ──
      if (stealthActiveRef.current > 0) {
        stealthActiveRef.current = Math.max(0, stealthActiveRef.current - dtScale);
      } else if (stealthChargeRef.current < STEALTH_MAX && activeUnlocksRef.current.includes("stealth_ulti")) {
        stealthChargeRef.current = Math.min(STEALTH_MAX, stealthChargeRef.current + 0.10 * dtScale);
      }
      // Same base charge speed and capacity as Stealth.
      if (poisonMissileChargeRef.current < POISON_MISSILE_MAX && activeUnlocksRef.current.includes("poison_missiles_ulti")) {
        poisonMissileChargeRef.current = Math.min(POISON_MISSILE_MAX, poisonMissileChargeRef.current + 0.10 * dtScale);
      }
      // Das Absorberschild lädt halb so schnell wie die normale Flugzeug-Ulti.
      if (absorberActiveRef.current > 0) {
        absorberActiveRef.current = Math.max(0, absorberActiveRef.current - dtScale);
      } else if (absorberChargeRef.current < ABSORBER_MAX && activeUnlocksRef.current.includes("absorber_ulti")) {
        absorberChargeRef.current = Math.min(ABSORBER_MAX, absorberChargeRef.current + ABSORBER_CHARGE_RATE * dtScale);
      }
      // Lädt halb so schnell wie Stealth (nochmals verdoppelte Ladegeschwindigkeit).
      // The module is tethered behind the aircraft and is drawn first so the
      // jet naturally appears in front of it.
      drawWeaponCrate(ctx, playerRef.current, weaponCrateRef.current, weaponCrateActive, timeRef.current);

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

      const halfLifeTitan = enemiesRef.current.find(e => e.type === "titan" && !e.dead &&
        e.hp <= e.maxHp * .5 && !e.titanReinforcementsSpawned);
      if (halfLifeTitan) {
        halfLifeTitan.titanReinforcementsSpawned = true;
        [-70, 0, 70].forEach((offset, index) => {
          enemiesRef.current.push({
            x: CANVAS_W + 30 + index * 45,
            y: clamp(playerRef.current.y + offset, 18, CANVAS_H - 42),
            vx: -13, vy: 0,
            hp: 8, maxHp: 8,
            width: 48, height: 26,
            type: "scout",
            shootCooldown: 999999,
            points: 75,
            color: "#ff2020",
            angle: 0,
            oscillate: 0,
            ramDamage: 3,
            trackPlayerRam: true,
          });
        });
        audioRef.current.effect("boss", settingsRef.current.soundVolume);
      }

      enemiesRef.current = enemiesRef.current.filter(e => {
        if (e.type === "titan") {
          e.titanShieldTimer = Math.max(0, (e.titanShieldTimer ?? 0) - dtScale);
          e.titanShieldCooldown = (e.titanShieldCooldown ?? TITAN_SHIELD_COOLDOWN) - dtScale;
          if (e.titanShieldCooldown <= 0) {
            e.titanShieldTimer = TITAN_SHIELD_DURATION;
            e.titanShieldCooldown = TITAN_SHIELD_COOLDOWN;
          }
          e.titanHealTimer = (e.titanHealTimer ?? 60) - dtScale;
          while (e.titanHealTimer <= 0) {
            e.hp = Math.min(e.maxHp, e.hp + 1);
            e.titanHealTimer += 60;
          }
          e.titanDashCooldown = (e.titanDashCooldown ?? TITAN_DASH_COOLDOWN) - dtScale;
          if ((e.titanDashTimer ?? 0) <= 0) {
            if (e.titanDashCooldown <= 0) {
              e.titanDashCooldown = TITAN_DASH_COOLDOWN;
              e.titanDashTimer = 180;
              e.titanDashHomeX = e.x;
              e.titanDashHomeY = e.y;
              e.titanDashStageX = clamp(playerRef.current.x + 245, CANVAS_W * .45, CANVAS_W - e.width - 12);
              e.titanDashTargetX = Math.max(-e.width - 15, playerRef.current.x - e.width - 40);
              e.titanDashTargetY = clamp(playerRef.current.y + PLAYER_H / 2 - e.height / 2, 0, CANVAS_H - e.height);
              e.titanShieldTimer = Math.max(e.titanShieldTimer ?? 0, 180);
            }
          } else {
            e.titanDashTimer = Math.max(0, (e.titanDashTimer ?? 0) - dtScale);
          }
        }
        if ((e.poisonTimer ?? 0) > 0 && !isTitanInvulnerable(e)) {
          e.poisonTickTimer = (e.poisonTickTimer ?? POISON_TICK_INTERVAL) - dtScale;
          while (e.poisonTickTimer <= 0) {
            e.hp -= POISON_TICK_DAMAGE;
            e.poisonTickTimer += POISON_TICK_INTERVAL;
          }
          e.poisonTimer = Math.max(0, (e.poisonTimer ?? 0) - dtScale);
          if (e.hp <= 0) {
            spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, isBossEnemy(e));
            gs.score += e.points;
            registerKill(e);
            e.dead = true;
            audioRef.current.effect("explosion", settingsRef.current.soundVolume);
            syncDisplay();
            return false;
          }
        }
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
        if (ultimaActiveRef.current > 0 && !isTitanInvulnerable(e)) {
          const aircraftId = activeUltiSkinRef.current.id;
          const droneId = activeDroneSkinRef.current.id;
          const blackHoleActive = aircraftId === "galaxy" || aircraftId === "n1";
          if (blackHoleActive) {
            const targetX = CANVAS_W * .58;
            const targetY = CANVAS_H * .5;
            e.x += (targetX - (e.x + e.width / 2)) * .012 * dtScale;
            e.y += (targetY - (e.y + e.height / 2)) * .012 * dtScale;
            e.hp -= .10 * dtScale;
          }
          if (aircraftId === "voidreaper") e.ultimateSlowTimer = Math.max(e.ultimateSlowTimer ?? 0, ultimaActiveRef.current);
          if (aircraftId === "arctic") e.ultimateFreezeTimer = Math.max(e.ultimateFreezeTimer ?? 0, ultimaActiveRef.current);
          if (aircraftId === "fire") e.hp -= .11 * dtScale;
          if (aircraftId === "neon") e.hp -= .14 * dtScale;
          if (aircraftId === "lava") e.hp -= .18 * dtScale;
          if (aircraftId === "shadow" && ultimaActiveRef.current < 3) e.hp -= 14;
          if (droneId === "drone_ember") e.hp -= .08 * dtScale;
          if (droneId === "drone_ion") e.hp -= .10 * dtScale;
          if (droneId === "drone_frost") e.ultimateFreezeTimer = Math.max(e.ultimateFreezeTimer ?? 0, ultimaActiveRef.current);
          if (droneId === "drone_omega") e.ultimateFreezeTimer = Math.max(e.ultimateFreezeTimer ?? 0, ultimaActiveRef.current);
          if (droneId === "drone_venom") {
            e.poisonTimer = Math.max(e.poisonTimer ?? 0, ultimaActiveRef.current);
            e.poisonTickTimer = Math.min(e.poisonTickTimer ?? POISON_TICK_INTERVAL, POISON_TICK_INTERVAL);
          }
          if (droneId === "drone_nova") e.hp -= .14 * dtScale;
          if (e.hp <= 0) {
            spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, isBossEnemy(e));
            gs.score += e.points * (aircraftId === "gold" ? 2 : 1);
            registerKill(e);
            e.dead = true;
            audioRef.current.effect("explosion", settingsRef.current.soundVolume);
            syncDisplay();
            return false;
          }
        }
        if (ultimateActiveRef.current > 0 && !isTitanInvulnerable(e)) {
          e.ultimateSlowTimer = Math.max(e.ultimateSlowTimer ?? 0, ultimateActiveRef.current);
          e.ultimateDotTimer = (e.ultimateDotTimer ?? ULTIMATE_DOT_INTERVAL) - dtScale;
          if (e.ultimateDotTimer <= 0) {
            e.hp -= ULTIMATE_DOT_DAMAGE;
            e.ultimateDotTimer += ULTIMATE_DOT_INTERVAL;
            spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, false);
            if (e.hp <= 0) {
              gs.score += e.points * (ultimaActiveRef.current > 0 && activeUltiSkinRef.current.id === "gold" ? 2 : 1);
              registerKill(e);
              e.dead = true;
              audioRef.current.effect("explosion", settingsRef.current.soundVolume);
              syncDisplay();
              return false;
            }
          }
        }
        e.ultimateFreezeTimer = Math.max(0, (e.ultimateFreezeTimer ?? 0) - dtScale);
        e.ultimateSlowTimer = Math.max(0, (e.ultimateSlowTimer ?? 0) - dtScale);
        const statusSpeed = ((e.ultimateFreezeTimer ?? 0) > 0 ? 0 : (e.ultimateSlowTimer ?? 0) > 0 ? ULTIMATE_SLOW_FACTOR : 1) *
          (e.bossEngineDisabled ? .62 : 1);
        if (e.isGolden) {
          e.goldenTimer = Math.max(0, (e.goldenTimer ?? 600) - dtScale);
          if (e.goldenTimer <= 0) e.vx = -8;
        }
        if ((e.archetype === "healer" || e.archetype === "shield") && (e.ultimateFreezeTimer ?? 0) <= 0) {
          e.supportCooldown = (e.supportCooldown ?? 120) - dtScale;
          if (e.supportCooldown <= 0) {
            const nearbyAllies = enemiesRef.current.filter(ally =>
              ally !== e && !ally.dead && ally.hp > 0 && !isBossEnemy(ally) &&
              Math.hypot(ally.x - e.x, ally.y - e.y) <= 210,
            );
            if (e.archetype === "healer") {
              const target = nearbyAllies
                .filter(ally => ally.hp < ally.maxHp)
                .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
              if (target) {
                const restored = Math.max(1, Math.ceil(target.maxHp * .18));
                target.hp = Math.min(target.maxHp, target.hp + restored);
                floatingTextsRef.current.push({
                  x: target.x + target.width / 2, y: target.y,
                  text: `+${restored}`, color: "#55ff9a", life: 48, maxLife: 48,
                });
                spawnExplosion(particlesRef.current, target.x + target.width / 2, target.y + target.height / 2, false);
              }
              e.supportCooldown = 150;
            } else {
              const targets = nearbyAllies
                .filter(ally => (ally.shieldHp ?? 0) < 2)
                .sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))
                .slice(0, 3);
              targets.forEach(target => {
                target.shieldHp = Math.max(target.shieldHp ?? 0, 2);
                floatingTextsRef.current.push({
                  x: target.x + target.width / 2, y: target.y,
                  text: "SCHILD", color: "#58d8ff", life: 48, maxLife: 48,
                });
              });
              e.supportCooldown = 180;
            }
          }
        }
        if (e.archetype === "kamikaze" && !e.trackPlayerRam &&
            e.x < CANVAS_W * .78 && Math.abs((e.y + e.height / 2) - (playerRef.current.y + PLAYER_H / 2)) < 170) {
          e.trackPlayerRam = true;
          waveBannerRef.current = { text: "⚠ KAMIKAZE IM ANFLUG", timer: 55 };
          audioRef.current.tone(190, .12, settingsRef.current.soundVolume * .4, "sawtooth");
        }
        if (e.trackPlayerRam) {
          const dx = playerRef.current.x + PLAYER_W / 2 - (e.x + e.width / 2);
          const dy = playerRef.current.y + PLAYER_H / 2 - (e.y + e.height / 2);
          const distance = Math.max(1, Math.hypot(dx, dy));
          e.vx = dx / distance * 13;
          e.vy = dy / distance * 13;
        }
        e.x += e.vx * dtScale * statusSpeed;
        e.y += e.vy * dtScale * statusSpeed;
        if (e.oscillate) e.y += Math.sin(timeRef.current * 0.04) * Math.abs(e.oscillate) * 0.8 * dtScale * statusSpeed;
        e.y = clamp(e.y, 0, CANVAS_H - e.height);
        if (e.type === "laserdevice") {
          const centerX = CANVAS_W / 2 - e.width / 2;
          if (e.x <= centerX) {
            e.x = centerX;
            e.y = CANVAS_H / 2 - e.height / 2;
            e.vx = 0;
            e.vy = 0;
          }
        }

        // Boss movement
        if (isBossEnemy(e)) {
          e.vx = Math.sin(timeRef.current * 0.02) * -1.2;
          if (e.x > CANVAS_W - e.width - 10) e.x = CANVAS_W - e.width - 10;
          if (e.x < CANVAS_W * 0.5) e.x = CANVAS_W * 0.5;

          if (e.type === "titan" && (e.titanDashTimer ?? 0) > 0) {
            const remaining = e.titanDashTimer ?? 0;
            const homeX = e.titanDashHomeX ?? e.x;
            const homeY = e.titanDashHomeY ?? e.y;
            const stageX = e.titanDashStageX ?? homeX;
            const strikeX = e.titanDashTargetX ?? playerRef.current.x - e.width;
            const targetY = e.titanDashTargetY ?? e.y;
            if (remaining > 120) {
              const progress = (180 - remaining) / 60;
              e.x = homeX + (stageX - homeX) * progress;
              e.y = homeY + (targetY - homeY) * progress;
            } else if (remaining > 75) {
              const progress = (120 - remaining) / 45;
              e.x = stageX + (strikeX - stageX) * progress;
              e.y = targetY;
            } else {
              const progress = (75 - remaining) / 75;
              e.x = strikeX + (homeX - strikeX) * progress;
              e.y = targetY + (homeY - targetY) * progress;
            }
          }

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
          e.color = e.type === "titan"
            ? (phase === 3 ? "#fff36a" : phase === 2 ? "#45f6ff" : "#ff3fd2")
            : e.type === "overlord"
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
          if ((e.type === "overlord" || e.type === "titan") && (e.ultimateFreezeTimer ?? 0) <= 0) {
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
                  color: s === 0 ? "#ffffff" : e.type === "titan" ? e.color : "#ff4fc8",
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
        if (e.type !== "laserdevice" && (e.ultimateFreezeTimer ?? 0) <= 0) e.shootCooldown -= dtScale;
        if (e.type !== "laserdevice" && e.shootCooldown <= 0 && (e.ultimateFreezeTimer ?? 0) <= 0) {
          const bossPhase = isBossEnemy(e) ? (e.hp / e.maxHp <= .3 ? 3 : e.hp / e.maxHp <= .6 ? 2 : 1) : 0;
          const baseCooldown = e.type === "overlord" || e.type === "titan" ? (bossPhase === 3 ? 10 : 16) : e.type === "boss" ? (bossPhase === 3 ? 12 : bossPhase === 2 ? 18 : 25) : e.type === "plasmawing" ? rand(38, 58) : e.type === "emeraldtiefighter" ? rand(80, 120) : e.type === "tiefighter" ? rand(40, 60) : e.type === "bomber" ? 55 : rand(70, 120);
          e.shootCooldown = baseCooldown * (e.bossCannonsDisabled ? 1.8 : 1) *
            (e.eliteModifier === "frenzied" ? .55 : 1);
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
            const shotCount = isBossEnemy(e)
              ? Math.max(1, (bossPhase === 3 ? 7 : bossPhase === 2 ? 5 : 3) - (e.bossCannonsDisabled ? 2 : 0))
              : e.type === "bomber" ? 2 : 1;
            for (let s = 0; s < shotCount; s++) {
              const spread = (s - (shotCount - 1) / 2) * 0.25;
              bulletsRef.current.push({
                x: e.x, y: e.y + e.height / 2,
                vx: -ENEMY_BULLET_SPEED + (isBossEnemy(e) ? -1 : 0),
                vy: spread * ENEMY_BULLET_SPEED,
                fromPlayer: false,
                damage: isBossEnemy(e) ? 3 : 2,
                normalBossProjectile: e.type === "boss",
                color: e.type === "titan" ? e.color : e.type === "overlord" ? "#6fe9ff" : e.type === "boss" && bossPhase === 3 ? "#ff3300" : undefined,
              });
            }
          }
        }

        // The laser device stays active from the moment it enters the battlefield.
        if (e.type === "laserdevice") {
          drawLaserDeviceBeam(ctx, e, timeRef.current);
          const beamX = e.x + e.width / 2 - LASER_DEVICE_BEAM_WIDTH / 2;
          const playerTouchesUpperBeam = rectHit(
            playerRef.current.x, playerRef.current.y, PLAYER_W, PLAYER_H,
            beamX, 0, LASER_DEVICE_BEAM_WIDTH, e.y,
          );
          const playerTouchesLowerBeam = rectHit(
            playerRef.current.x, playerRef.current.y, PLAYER_W, PLAYER_H,
            beamX, e.y + e.height, LASER_DEVICE_BEAM_WIDTH, CANVAS_H - e.y - e.height,
          );
          if ((playerTouchesUpperBeam || playerTouchesLowerBeam) &&
              invincibleRef.current <= 0 && stealthActiveRef.current <= 0 && ultimateActiveRef.current <= 0) {
            const protection = applyPlayerHitProtection({
              shieldTimer: shieldTimerRef.current,
              shieldHp: playerShieldHpRef.current,
              invincibleTimer: invincibleRef.current,
              stealthTimer: stealthActiveRef.current,
            });
            shieldTimerRef.current = protection.shieldTimer;
            playerShieldHpRef.current = protection.shieldHp;
            invincibleRef.current = protection.protected ? 90 : 140;
            spawnExplosion(
              particlesRef.current,
              playerRef.current.x + PLAYER_W / 2,
              playerRef.current.y + PLAYER_H / 2,
              !protection.protected,
            );
            audioRef.current.effect("hit", settingsRef.current.soundVolume);
            if (!protection.protected) {
              const laserDamage = LASER_DEVICE_DAMAGE * Math.pow(.85, runUpgradesRef.current.reactive_armor);
              recordPlayerDamage(laserDamage);
              const nextLifeState = applyPlayerDamage(gs, laserDamage);
              gs.hp = nextLifeState.hp;
              gs.lives = nextLifeState.lives;
              gs.gameOver = nextLifeState.gameOver;
              if (gs.gameOver) grantRunReward();
            }
            syncDisplay();
          }
        }

        // Draw enemy
        drawEnemy(ctx, e);
        if (e.isGolden) {
          ctx.save();
          ctx.textAlign = "center";
          ctx.font = "bold 11px 'Inter', sans-serif";
          ctx.fillStyle = "#ffe45c";
          ctx.shadowColor = "#ffcc00";
          ctx.shadowBlur = 8;
          ctx.fillText(`GOLD · ${Math.max(0, Math.ceil((e.goldenTimer ?? 0) / 60))}s`, e.x + e.width / 2, e.y - 9);
          ctx.restore();
        }
        if (isBossEnemy(e)) {
          const topAlive = (e.bossTopPartHp ?? 0) > 0;
          const bottomAlive = (e.bossBottomPartHp ?? 0) > 0;
          ctx.save();
          for (const [cy, alive, label] of [
            [e.y + e.height * .26, topAlive, "KANONE"],
            [e.y + e.height * .74, bottomAlive, "ANTRIEB"],
          ] as const) {
            ctx.beginPath();
            ctx.arc(e.x + e.width * .18, cy, 8, 0, Math.PI * 2);
            ctx.fillStyle = alive ? "#ff3344aa" : "#223344aa";
            ctx.strokeStyle = alive ? "#ffffff" : "#667788";
            ctx.lineWidth = 2;
            ctx.fill(); ctx.stroke();
            if (alive) {
              ctx.font = "bold 8px 'Inter', sans-serif";
              ctx.textAlign = "left";
              ctx.fillStyle = "#ffffff";
              ctx.fillText(label, e.x + e.width * .18 + 12, cy - 4);
            }
          }
          ctx.restore();
        }

        // In Beschützen mode, enemies that reach the package damage the objective.
        if (activeModeRef.current === "protect" && protectPackageHitCooldownRef.current <= 0 &&
            rectHit(protectPackageRef.current.x, protectPackageRef.current.y, PROTECT_PACKAGE_WIDTH, PROTECT_PACKAGE_HEIGHT,
              e.x, e.y, e.width, e.height)) {
          const packageDamage = isBossEnemy(e) ? 25 : e.type === "bomber" ? 18 : 12;
          protectPackageHpRef.current = Math.max(0, protectPackageHpRef.current - packageDamage);
          protectPackageHitCooldownRef.current = 24;
          spawnExplosion(particlesRef.current, protectPackageRef.current.x + PROTECT_PACKAGE_WIDTH / 2,
            protectPackageRef.current.y + PROTECT_PACKAGE_HEIGHT / 2, false);
          audioRef.current.effect("hit", settingsRef.current.soundVolume);
          e.dead = !isBossEnemy(e);
          if (protectPackageHpRef.current <= 0) {
            runResultRef.current = "game_over";
            gs.gameOver = true;
            grantRunReward();
          }
          return !e.dead;
        }

        // Enemy-player collision
        const playerTouchesEnemy = rectHit(playerRef.current.x, playerRef.current.y, PLAYER_W, PLAYER_H, e.x, e.y, e.width, e.height);
        if (e.type === "titan" && playerTouchesEnemy && invincibleRef.current <= 0 &&
            stealthActiveRef.current <= 0 && ultimateActiveRef.current <= 0) {
          const protection = applyPlayerHitProtection({
            shieldTimer: shieldTimerRef.current,
            shieldHp: playerShieldHpRef.current,
            invincibleTimer: invincibleRef.current,
            stealthTimer: stealthActiveRef.current,
          });
          shieldTimerRef.current = protection.shieldTimer;
          playerShieldHpRef.current = protection.shieldHp;
          if (protection.protected) {
            invincibleRef.current = 90;
            spawnExplosion(particlesRef.current, playerRef.current.x + PLAYER_W / 2, playerRef.current.y + PLAYER_H / 2, false);
            audioRef.current.effect("hit", settingsRef.current.soundVolume);
            return true;
          }
          const collisionDamage = ((e.titanDashTimer ?? 0) > 0 ? 10 : 1) *
            Math.pow(.85, runUpgradesRef.current.reactive_armor);
          recordPlayerDamage(collisionDamage);
          const nextLifeState = applyPlayerDamage(gs, collisionDamage);
          gs.hp = nextLifeState.hp;
          gs.lives = nextLifeState.lives;
          gs.gameOver = nextLifeState.gameOver;
          invincibleRef.current = 90;
          spawnExplosion(particlesRef.current, playerRef.current.x + PLAYER_W / 2, playerRef.current.y + PLAYER_H / 2, true);
          audioRef.current.effect("hit", settingsRef.current.soundVolume);
          if (gs.gameOver) grantRunReward();
          syncDisplay();
        }
        const absorberShieldHit = absorberActiveRef.current > 0 &&
          rectHit(playerRef.current.x + PLAYER_W - 2 + ABSORBER_SHIELD_FORWARD_OFFSET, playerRef.current.y - ABSORBER_SHIELD_PADDING,
            ABSORBER_SHIELD_WIDTH, PLAYER_H + ABSORBER_SHIELD_PADDING * 2,
            e.x, e.y, e.width, e.height);
        if (absorberShieldHit && e.type !== "titan") {
          absorberHitsRef.current = Math.min(3, absorberHitsRef.current + 1);
          spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, false);
          audioRef.current.effect("hit", settingsRef.current.soundVolume);
          e.dead = true;
          return false;
        }
        if ((invincibleRef.current <= 0 || e.trackPlayerRam) && stealthActiveRef.current <= 0 && ultimateActiveRef.current <= 0 &&
          e.type !== "titan" && playerTouchesEnemy) {
          const collidedWithBoss = isBossEnemy(e);
          if (collidedWithBoss) e.hp = Math.max(0, e.hp - 1);
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
            e.dead = collidedWithBoss ? e.hp <= 0 : true;
            return !e.dead;
          }
          const rawCollisionDamage = e.ramDamage ?? (e.type === "boss"
            ? getNormalBossDamage(1, gs.level)
            : collidedWithBoss ? 1
            : activeUnlocksRef.current.includes("armor") ? 0.5 : 1);
          const collDmg = rawCollisionDamage * Math.pow(.85, runUpgradesRef.current.reactive_armor);
          recordPlayerDamage(collDmg);
          const nextLifeState = applyPlayerDamage(gs, collDmg);
          gs.hp = nextLifeState.hp;
          gs.lives = nextLifeState.lives;
          gs.gameOver = nextLifeState.gameOver;
          invincibleRef.current = 140;
          spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, !collidedWithBoss || e.hp <= 0);
          e.dead = collidedWithBoss ? e.hp <= 0 : true;
          if (gs.gameOver) grantRunReward();
          syncDisplay();
          return !e.dead;
        }

        // Bullet-enemy collision
        let hit = false;
        bulletsRef.current = bulletsRef.current.filter(b => {
          if (!b.fromPlayer || hit) return true;
          if (b.isPoisonMissile && b.missileTarget !== e) return true;
          const bw = b.isMissile ? 14 : 14;
          const bh = b.isMissile ? 8 : 4;
          if (!rectHit(b.x, b.y - bh / 2, bw, bh, e.x, e.y, e.width, e.height)) return true;
          const critical = runUpgradesRef.current.critical > 0 && Math.random() < Math.min(.45, .15 * runUpgradesRef.current.critical);
          const activeAircraftId = activeUltiSkinRef.current.id;
          const aircraftDamage = ultimaActiveRef.current > 0
            ? activeAircraftId === "solaris" ? 3 : ["crimson", "voidreaper"].includes(activeAircraftId) ? 2 : 1
            : 1;
          const absorberDamage = absorberActiveRef.current > 0 && absorberHitsRef.current > 0
            ? Math.pow(2, absorberHitsRef.current) : 1;
          let weakpointMultiplier = 1;
          if (isBossEnemy(e)) {
            const relativeY = (b.y - e.y) / e.height;
            const rawPartDamage = Math.max(1, b.damage);
            if (relativeY < .42 && (e.bossTopPartHp ?? 0) > 0) {
              e.bossTopPartHp = Math.max(0, (e.bossTopPartHp ?? 0) - rawPartDamage);
              weakpointMultiplier = 1.6;
              if (e.bossTopPartHp === 0 && !e.bossCannonsDisabled) {
                e.bossCannonsDisabled = true;
                spawnExplosion(particlesRef.current, e.x + e.width * .3, e.y + e.height * .26, true);
                for (let fragment = 0; fragment < 10; fragment++) {
                  particlesRef.current.push({
                    x: e.x + e.width * .3,
                    y: e.y + e.height * .26,
                    vx: rand(-5.5, -1.5),
                    vy: rand(-4, 4),
                    life: rand(42, 76),
                    maxLife: 76,
                    color: fragment % 2 === 0 ? "#ff4668" : "#9aa4b5",
                    radius: rand(2, 5),
                  });
                }
                waveBannerRef.current = { text: "BOSS-KANONEN ZERSTÖRT", timer: 100 };
                screenShakeRef.current = Math.max(screenShakeRef.current, 11);
              }
            } else if (relativeY > .58 && (e.bossBottomPartHp ?? 0) > 0) {
              e.bossBottomPartHp = Math.max(0, (e.bossBottomPartHp ?? 0) - rawPartDamage);
              weakpointMultiplier = 1.6;
              if (e.bossBottomPartHp === 0 && !e.bossEngineDisabled) {
                e.bossEngineDisabled = true;
                spawnExplosion(particlesRef.current, e.x + e.width * .3, e.y + e.height * .74, true);
                for (let fragment = 0; fragment < 10; fragment++) {
                  particlesRef.current.push({
                    x: e.x + e.width * .3,
                    y: e.y + e.height * .74,
                    vx: rand(-6, -2),
                    vy: rand(-4, 4),
                    life: rand(42, 76),
                    maxLife: 76,
                    color: fragment % 2 === 0 ? "#64e8ff" : "#9aa4b5",
                    radius: rand(2, 5),
                  });
                }
                waveBannerRef.current = { text: "BOSS-ANTRIEB ZERSTÖRT", timer: 100 };
                screenShakeRef.current = Math.max(screenShakeRef.current, 11);
              }
            }
          }
          const bossHunterMultiplier = isBossEnemy(e) ? 1 + runUpgradesRef.current.boss_hunter * .3 : 1;
          const dealtDamage = b.damage * (critical ? 3 : 1) * aircraftDamage * absorberDamage *
            (ultimateActiveRef.current > 0 ? 2 : 1) * weakpointMultiplier * bossHunterMultiplier;
          const damageResult = isTitanInvulnerable(e)
            ? { hp: e.hp, shieldHp: e.shieldHp ?? 0, absorbedByShield: true, destroyed: false }
            : applyEnemyDamage(e, dealtDamage);
          e.hp = damageResult.hp;
          e.shieldHp = damageResult.shieldHp;
          floatingTextsRef.current.push({
            x: b.x, y: b.y,
            text: damageResult.absorbedByShield ? "BLOCK" : `${critical ? "KRIT " : ""}${Math.round(dealtDamage)}`,
            color: damageResult.absorbedByShield ? "#66ddff" : critical ? "#ffe45c" : weakpointMultiplier > 1 ? "#ff6688" : "#ffffff",
            life: 34, maxLife: 34,
          });
          if (runUpgradesRef.current.cryo_rounds > 0 && Math.random() < Math.min(.5, runUpgradesRef.current.cryo_rounds * .18)) {
            e.ultimateSlowTimer = Math.max(e.ultimateSlowTimer ?? 0, 90);
          }
          if (runUpgradesRef.current.chain_lightning > 0 && Math.random() < Math.min(.6, runUpgradesRef.current.chain_lightning * .2)) {
            const chained = enemiesRef.current.find(other => other !== e && !other.dead && other.hp > 1 &&
              Math.hypot(other.x - e.x, other.y - e.y) < 210);
            if (chained) {
              chained.hp = Math.max(1, chained.hp - 2 * runUpgradesRef.current.chain_lightning);
              spawnExplosion(particlesRef.current, chained.x + chained.width / 2, chained.y + chained.height / 2, false);
              floatingTextsRef.current.push({ x: chained.x, y: chained.y, text: "⚡ KETTE", color: "#72e8ff", life: 40, maxLife: 40 });
            }
          }
          if (b.isPoisonMissile && !isTitanInvulnerable(e)) {
            e.poisonTimer = POISON_DURATION;
            e.poisonTickTimer = POISON_TICK_INTERVAL;
          }
          if (ultimateActiveRef.current > 0 && !isTitanInvulnerable(e)) e.ultimateFreezeTimer = ultimateActiveRef.current;
          spawnExplosion(particlesRef.current, b.x, b.y, false);
          if (critical) {
            audioRef.current.tone(920, .07, settingsRef.current.soundVolume * .28, "square");
          } else if (damageResult.absorbedByShield) {
            audioRef.current.tone(540, .06, settingsRef.current.soundVolume * .2, "sine");
          } else {
            audioRef.current.effect("hit", settingsRef.current.soundVolume);
          }
          hit = true;
          if (damageResult.destroyed) {
            spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, isBossEnemy(e));
            gs.score += e.points * (ultimaActiveRef.current > 0 && activeUltiSkinRef.current.id === "gold" ? 2 : 1);
            registerKill(e);
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
              if (runUpgradesRef.current.shield > 0) {
                shieldTimerRef.current = 600;
                playerShieldHpRef.current = PLAYER_SHIELD_HP + runUpgradesRef.current.shield_matrix * 2;
              }
            }
            healChargeRef.current = Math.min(HEAL_MAX, healChargeRef.current +
              (isBossEnemy(e) ? 60 : e.type === "bomber" ? 28 : e.type === "fighter" ? 14 : 8));
            // Power-up chance
            if (Math.random() < Math.min(.8, 0.20 + runUpgradesRef.current.salvager * .10)) {
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
        if (activeModeRef.current === "protect" &&
            rectHit(b.x - bw / 2, b.y - bh / 2, bw, bh,
              protectPackageRef.current.x, protectPackageRef.current.y,
              PROTECT_PACKAGE_WIDTH, PROTECT_PACKAGE_HEIGHT)) {
          protectPackageHpRef.current = Math.max(0, protectPackageHpRef.current - Math.max(2, b.damage * 2));
          spawnExplosion(particlesRef.current, b.x, b.y, false);
          audioRef.current.effect("hit", settingsRef.current.soundVolume);
          if (protectPackageHpRef.current <= 0) {
            runResultRef.current = "game_over";
            gs.gameOver = true;
            grantRunReward();
          }
          return false;
        }
        const shieldX = playerRef.current.x + PLAYER_W - 2 + ABSORBER_SHIELD_FORWARD_OFFSET;
        const shieldY = playerRef.current.y - ABSORBER_SHIELD_PADDING;
        if (absorberActiveRef.current > 0 && b.vx < 0 &&
            rectHit(b.x - bw / 2, b.y - bh / 2, bw, bh, shieldX, shieldY,
              ABSORBER_SHIELD_WIDTH, PLAYER_H + ABSORBER_SHIELD_PADDING * 2)) {
          absorberHitsRef.current = Math.min(3, absorberHitsRef.current + 1);
          spawnExplosion(particlesRef.current, b.x, b.y, false);
          audioRef.current.effect("hit", settingsRef.current.soundVolume);
          return false;
        }
        if (!rectHit(b.x - bw / 2, b.y - bh / 2, bw, bh, playerRef.current.x, playerRef.current.y, PLAYER_W, PLAYER_H)) {
          const nearDistance = Math.hypot(
            b.x - (playerRef.current.x + PLAYER_W / 2),
            b.y - (playerRef.current.y + PLAYER_H / 2),
          );
          if (!b.nearMissed && nearDistance < 43 && nearMissCooldownRef.current <= 0) {
            b.nearMissed = true;
            nearMissCooldownRef.current = 12;
            runStatsRef.current.nearMisses += 1;
            comboTimerRef.current = Math.max(comboTimerRef.current, 100);
            const charge = 4 + runUpgradesRef.current.graze_core * 8;
            ultimaChargeRef.current = Math.min(ULTI_MAX, ultimaChargeRef.current + charge);
            laserChargeRef.current = Math.min(LASER_MAX, laserChargeRef.current + charge);
            floatingTextsRef.current.push({
              x: playerRef.current.x + PLAYER_W, y: playerRef.current.y,
              text: "NEAR MISS", color: "#67e8f9", life: 55, maxLife: 55,
            });
            audioRef.current.tone(760, .06, settingsRef.current.soundVolume * .18, "sine");
            checkAchievements();
          }
          return true;
        }
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
          audioRef.current.tone(620, .08, settingsRef.current.soundVolume * .25, "sine");
          return false;
        }
        const protectedBulletDamage = activeUnlocksRef.current.includes("armor") ? Math.max(0.5, b.damage * 0.5) : b.damage;
        const rawBulletDamage = b.normalBossProjectile
          ? getNormalBossDamage(protectedBulletDamage, gs.level)
          : protectedBulletDamage;
        const bulletDmg = rawBulletDamage * Math.pow(.85, runUpgradesRef.current.reactive_armor);
        if (activeUnlocksRef.current.includes("armor")) {
          audioRef.current.tone(120, .08, settingsRef.current.soundVolume * .2, "square");
        }
        recordPlayerDamage(bulletDmg);
        const nextLifeState = applyPlayerDamage(gs, bulletDmg);
        gs.hp = nextLifeState.hp;
        gs.lives = nextLifeState.lives;
        gs.gameOver = nextLifeState.gameOver;
        if (b.stunFrames) movementStunRef.current = b.stunFrames;
        invincibleRef.current = 100;
        spawnExplosion(particlesRef.current, b.x, b.y, false);
        if (gs.gameOver) grantRunReward();
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
          runStatsRef.current.powerUps += 1;
          if (gs.hp >= gs.maxHp) runStatsRef.current.fullHealthPickups += 1;
          checkAchievements();
          audioRef.current.effect("pickup", settingsRef.current.soundVolume);
          if (p.type === "health") gs.hp = Math.min(gs.maxHp, gs.hp + 3);
          if (p.type === "shield") {
            shieldTimerRef.current = 300;
            playerShieldHpRef.current = PLAYER_SHIELD_HP;
          }
          if (p.type === "speed") gs.speed = Math.max(gs.speed, Math.min(6, gs.speed + 0.5));
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
      floatingTextsRef.current = floatingTextsRef.current.filter(item => {
        item.y -= .65 * dtScale;
        item.life -= dtScale;
        ctx.save();
        ctx.globalAlpha = Math.max(0, item.life / item.maxLife);
        ctx.fillStyle = item.color;
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 7;
        ctx.font = "bold 12px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(item.text, item.x, item.y);
        ctx.restore();
        return item.life > 0;
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
          const absorberDamage = absorberActiveRef.current > 0 && absorberHitsRef.current > 0
            ? Math.pow(2, absorberHitsRef.current) : 1;
          if (!isTitanInvulnerable(e)) e.hp -= 0.38 * beamHits * absorberDamage * dtScale;
          if (e.hp <= 0) {
            spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, isBossEnemy(e));
            gs.score += e.points * (ultimaActiveRef.current > 0 && activeUltiSkinRef.current.id === "gold" ? 2 : 1);
            registerKill(e);
            audioRef.current.effect("explosion", settingsRef.current.soundVolume);
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
        ctx.rotate(timeRef.current * .018);
        for (let ring = 0; ring < 4; ring++) {
          ctx.rotate(ring % 2 ? -.34 : .25);
          ctx.strokeStyle = ["#ffffff", "#7ee7ff", "#a65cff", "#ff5dc8"][ring];
          ctx.globalAlpha = .9 - ring * .15;
          ctx.lineWidth = 4 - ring * .55;
          ctx.beginPath();
          ctx.ellipse(0, 0, 54 + ring * 10, 13 + ring * 4, ring * .42, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#000";
        ctx.shadowColor = "#000"; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
        for (let star = 0; star < 12; star++) {
          const angle = star * Math.PI / 6 + timeRef.current * .035;
          const radius = 32 + (star % 4) * 13;
          ctx.fillStyle = star % 2 ? "#9aeaff" : "#eeb7ff";
          ctx.fillRect(Math.cos(angle) * radius, Math.sin(angle) * radius * .42, 2.5, 2.5);
        }
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
      if (absorberActiveRef.current > 0) {
        const shieldX = playerRef.current.x + PLAYER_W + 9 + ABSORBER_SHIELD_FORWARD_OFFSET;
        const shieldY = playerRef.current.y + PLAYER_H / 2;
        const shieldTop = shieldY - PLAYER_H * 0.62;
        const shieldBottom = shieldY + PLAYER_H * 0.62;
        const shieldCurve = 12;
        const pulse = 0.78 + 0.22 * Math.sin(timeRef.current * 0.18);
        ctx.save();
        const gradient = ctx.createLinearGradient(shieldX - 8, 0, shieldX + ABSORBER_SHIELD_WIDTH, 0);
        gradient.addColorStop(0, "#ff4fc844");
        gradient.addColorStop(1, "#ff8beeff");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 6;
        ctx.shadowColor = "#ff43d7";
        ctx.shadowBlur = 20 + pulse * 12;
        ctx.beginPath();
        ctx.moveTo(shieldX, shieldTop);
        ctx.quadraticCurveTo(shieldX + shieldCurve, shieldY, shieldX, shieldBottom);
        ctx.stroke();
        ctx.globalAlpha = 0.16 + pulse * 0.1;
        ctx.fillStyle = "#ff4fc8";
        ctx.beginPath();
        ctx.moveTo(shieldX, shieldTop);
        ctx.quadraticCurveTo(shieldX + shieldCurve, shieldY, shieldX, shieldBottom);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "#ffd8f6";
        ctx.font = "bold 11px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${absorberHitsRef.current > 0 ? Math.pow(2, absorberHitsRef.current) : 1}× DMG`, shieldX + 18, shieldY - PLAYER_H);
        ctx.restore();
      }
      if (ultimateActiveRef.current > 0) {
        const cx = playerRef.current.x + PLAYER_W / 2;
        const cy = playerRef.current.y + PLAYER_H / 2;
        ctx.save();
        ctx.translate(cx, cy); ctx.scale(1.16, 1.16); ctx.translate(-cx, -cy);
        if (hybridActiveRef.current) drawCombinedPlayerJet(ctx, playerRef.current.x, playerRef.current.y, gs.weaponTier, true, aircraftBuildRef.current, activeSkinRef.current, "#35bfff", aircraftUpgradeRef.current.level);
        else drawPlayerJet(ctx, playerRef.current.x, playerRef.current.y, gs.weaponTier, true, activeSkinRef.current, "#35bfff", aircraftUpgradeRef.current.level);
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
        if (hybridActiveRef.current) drawCombinedPlayerJet(ctx, playerRef.current.x, playerRef.current.y, gs.weaponTier, false, aircraftBuildRef.current, activeSkinRef.current, undefined, aircraftUpgradeRef.current.level);
        else drawPlayerJet(ctx, playerRef.current.x, playerRef.current.y, gs.weaponTier, false, activeSkinRef.current, undefined, aircraftUpgradeRef.current.level);
        ctx.restore();
      } else {
        {
          const shieldHp = playerShieldHpRef.current;
          const _sc = (activeSkinRef.current?.id === "n1" && shieldTimerRef.current > 0)
            ? (shieldHp <= 1 ? "#ff2200" : shieldHp <= 3 ? "#ff9900" : "#cfd6dc") : undefined;
          // Keep the selected skin visible during post-hit invincibility. The
          // previous on/off blink skipped drawing the aircraft in some frames,
          // which looked like the skin had failed to load.
          ctx.save();
          if (invincibleRef.current > 0) {
            ctx.globalAlpha = 0.48 + 0.22 * Math.sin(timeRef.current * 0.32);
          }
          if (hybridActiveRef.current) drawCombinedPlayerJet(ctx, playerRef.current.x, playerRef.current.y, gs.weaponTier, shieldTimerRef.current > 0, aircraftBuildRef.current, activeSkinRef.current, _sc, aircraftUpgradeRef.current.level);
          else drawPlayerJet(ctx, playerRef.current.x, playerRef.current.y, gs.weaponTier, shieldTimerRef.current > 0, activeSkinRef.current, _sc, aircraftUpgradeRef.current.level);
          ctx.restore();
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
      ctx.save();
      if (ultimaActiveRef.current > 0) {
        ctx.shadowColor = activeDroneSkinRef.current.stroke;
        ctx.shadowBlur = 28 + 8 * Math.sin(timeRef.current * .25);
      }
      const droneVisualLevel = droneLevelRef.current
        + ["drone_mk2", "drone_mk3", "drone_mk4", "drone_mk5", "drone_mk6", "drone_mk7", "drone_mk8"].filter(id => activeUnlocksRef.current.includes(id)).length
        + runUpgradesRef.current.drone;
      drawCombinedCombatDrone(ctx, droneX, droneY, timeRef.current, droneBuildRef.current, activeDroneSkinRef.current, droneVisualLevel);
      ctx.restore();

      // Keep the remaining duration of every active ultimate visible above the pilot.
      drawActiveUltiCountdowns(ctx, playerRef.current.x, playerRef.current.y, [
        { key: "Q", remaining: ultimaActiveRef.current, color: "#ff44ff" },
        { key: "E", remaining: laserActiveRef.current, color: "#ffaa22" },
        { key: "R", remaining: stealthActiveRef.current, color: "#00ddcc" },
        { key: "H", remaining: healActiveRef.current, color: "#ff4466" },
        { key: "F", remaining: absorberActiveRef.current, color: "#ff72dc" },
        { key: "U", remaining: ultimateActiveRef.current, color: "#62ddff" },
      ]);

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

      if (activeModeRef.current === "protect") {
        drawProtectPackage(ctx, protectPackageRef.current, protectPackageHpRef.current, timeRef.current);
      }

      // ── HUD ──
      drawHUD(ctx, gs, ultimaChargeRef.current, ultimaActiveRef.current, laserChargeRef.current, laserActiveRef.current, stealthChargeRef.current, stealthActiveRef.current, healChargeRef.current, healActiveRef.current, poisonMissileChargeRef.current, absorberChargeRef.current, absorberActiveRef.current, absorberHitsRef.current, ultimateChargeRef.current, ultimateActiveRef.current, bestScoreRef.current, pilotLevelRef.current, activeUnlocksRef.current, activeUltiLoadoutRef.current, [formatKeyCode(settingsRef.current.keyBindings.ability1), formatKeyCode(settingsRef.current.keyBindings.ability2), formatKeyCode(settingsRef.current.keyBindings.ability3)], activeModeRef.current, runElapsedMsRef.current);
      {
        const crate = weaponCrateRef.current;
        const remainingMs = weaponCrateActive
          ? weaponCrateActiveUntilRef.current - runElapsedMsRef.current
          : weaponCrateNextActivationRef.current - runElapsedMsRef.current;
        const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
        const rarityColor = WEAPON_CRATE_RARITY_COLOR[crate.rarity];
        ctx.save();
        ctx.textAlign = "right";
        ctx.fillStyle = rarityColor;
        ctx.shadowColor = rarityColor;
        ctx.shadowBlur = weaponCrateActive ? 12 : 4;
        ctx.font = "900 12px 'Inter', sans-serif";
        ctx.fillText(`${crate.name} · ${crate.rarity.toUpperCase()}`, CANVAS_W - 20, 100);
        ctx.shadowBlur = 0;
        ctx.fillStyle = weaponCrateActive ? "#ffffff" : "#9fb3c8";
        ctx.font = "bold 11px 'Inter', sans-serif";
        ctx.fillText(weaponCrateActive ? `AKTIV · ${seconds}s` : `BEREIT IN ${seconds}s`, CANVAS_W - 20, 116);
        ctx.restore();
      }
      const mission = missionRef.current;
      const progress = Math.min(mission.target, missionProgress(mission, runStatsRef.current));
      ctx.save();
      ctx.fillStyle = "rgba(4,10,24,.82)";
      ctx.beginPath(); ctx.roundRect(12, 94, 265, 50, 9); ctx.fill();
      ctx.strokeStyle = mission.completed ? "#4ade80" : "#38bdf8";
      ctx.stroke();
      ctx.textAlign = "left";
      ctx.fillStyle = mission.completed ? "#4ade80" : "#7dd3fc";
      ctx.font = "bold 10px 'Inter', sans-serif";
      ctx.fillText(mission.completed ? "MISSION ERFÜLLT" : "MISSIONSZIEL", 22, 102);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px 'Inter', sans-serif";
      ctx.fillText(`${mission.title}  ${progress}/${mission.target}`, 22, 118);
      ctx.fillStyle = "#18263c"; ctx.fillRect(22, 135, 235, 4);
      ctx.fillStyle = mission.completed ? "#4ade80" : "#38bdf8";
      ctx.fillRect(22, 135, 235 * Math.min(1, progress / mission.target), 4);
      if (comboMilestoneRef.current.timer > 0) {
        comboMilestoneRef.current.timer = Math.max(0, comboMilestoneRef.current.timer - dtScale);
        const milestoneCombo = comboMilestoneRef.current.combo;
        const comboMultiplier = Math.min(4, 1 + Math.floor(milestoneCombo / 10) * .25);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffe45c";
        ctx.shadowColor = "#ff7a18"; ctx.shadowBlur = 12;
        ctx.font = "bold 34px 'Inter', sans-serif";
        ctx.fillText(`${milestoneCombo}× MEGA-COMBO · SCORE ×${comboMultiplier.toFixed(2)}`, CANVAS_W / 2, 96);
      }
      if (waveBannerRef.current.timer > 0) {
        waveBannerRef.current.timer = Math.max(0, waveBannerRef.current.timer - dtScale);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#00cfff"; ctx.shadowBlur = 20;
        ctx.font = "bold 24px 'Inter', sans-serif";
        ctx.fillText(waveBannerRef.current.text, CANVAS_W / 2, 155);
      }
      if (titanWarningRef.current > 0) {
        titanWarningRef.current = Math.max(0, titanWarningRef.current - dtScale);
        const pulse = .72 + Math.sin(timeRef.current * .28) * .28;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = `rgba(255, 18, 42, ${pulse})`;
        ctx.shadowColor = "#ff001e";
        ctx.shadowBlur = 22;
        ctx.font = "900 34px 'Inter', sans-serif";
        ctx.fillText("⚠ WARNING: TITAN APPROACHING ⚠", CANVAS_W / 2, 188);
      }
      ctx.restore();

      // ── Virtual controls overlay ──
      if (showVirtualControlsRef.current) {
        drawVirtualControls(ctx, touchFireRef.current.active, settingsRef.current.autoFire, ultimaChargeRef.current, ultimaActiveRef.current, laserChargeRef.current, laserActiveRef.current, stealthChargeRef.current, stealthActiveRef.current, healChargeRef.current, healActiveRef.current, poisonMissileChargeRef.current, absorberChargeRef.current, absorberActiveRef.current, absorberHitsRef.current, ultimateChargeRef.current, ultimateActiveRef.current, activeUnlocksRef.current, activeUltiLoadoutRef.current);
        if (enemiesRef.current.some(enemy => enemy.type === "titan" && (enemy.titanDashTimer ?? 0) > 0)) {
          ctx.save(); ctx.font = "bold 25px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          activeUltiLoadoutRef.current.forEach(id => {
            const pos = getUltiButtonPosition(activeUltiLoadoutRef.current, id); if (!pos) return;
            ctx.fillStyle = "#120008dd"; ctx.beginPath(); ctx.arc(pos[0], pos[1], 31, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#ff3344"; ctx.fillText("☠", pos[0], pos[1] + 1);
          });
          ctx.restore();
        }
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
  }, [checkAchievements, fireBullets, grantRunReward, recordPlayerDamage, registerKill, spawnBossRushEnemy, spawnEnemy, spawnFormationWave, startGame, syncDisplay]);

  const handleSkinSelect = (id: string) => {
    const skin = JET_SKINS.find(s => s.id === id);
    if (!skin) return;
    setSelectedSkin(id);
    saveSkin(id);
    activeSkinRef.current = skin;
    activeUltiSkinRef.current = skin;
    setHybridActive(false);
    saveHybridActive(false);
    hybridActiveRef.current = false;
  };

  const handleUltiLoadoutChange = (ids: UltiLoadoutId[]) => {
    const next = ids.slice(0, ULTI_LOADOUT_SLOTS);
    setUltiLoadout(next);
    saveUltiLoadout(next);
    activeUltiLoadoutRef.current = next;
  };

  const handleDroneSkinSelect = (id: string) => {
    const skin = DRONE_SKINS.find(s => s.id === id);
    if (!skin) return;
    setSelectedDroneSkin(id);
    saveDroneSkin(id);
    activeDroneSkinRef.current = skin;
  };

  const handleAircraftBuildChange = (next: AircraftBuild) => {
    setAircraftBuild(next);
    saveAircraftBuild(next);
    aircraftBuildRef.current = next;
  };

  const handleHybridSelect = () => {
    setHybridActive(true);
    saveHybridActive(true);
    hybridActiveRef.current = true;
  };

  const handleHybridBuild = () => {
    if (loadCoins() < HYBRID_BUILD_COST) return false;
    spendCoins(HYBRID_BUILD_COST);
    setCoins(loadCoins());
    handleHybridSelect();
    audioRef.current.effect("upgrade", settingsRef.current.soundVolume);
    return true;
  };

  const handleDroneRoleChange = (role: DroneRoleId) => {
    setDroneRole(role);
    saveDroneRole(role);
    droneRoleRef.current = role;
  };

  const handleDroneBuildChange = (next: DroneBuild) => {
    setDroneBuild(next);
    saveDroneBuild(next);
    droneBuildRef.current = next;
  };

  const handleDroneWeaponChange = (id: DroneWeaponId) => {
    const weapon = DRONE_WEAPONS.find(candidate => candidate.id === id);
    if (!weapon) return;
    setSelectedDroneWeapon(id);
    saveDroneWeapon(id);
    droneWeaponRef.current = weapon;
  };

  const handleWeaponCrateSelect = (id: string) => {
    const crate = WEAPON_CRATES.find(item => item.id === id);
    if (!crate) return;
    setSelectedWeaponCrate(id);
    saveWeaponCrate(id);
    weaponCrateRef.current = crate;
  };

  const handleAircraftUpgrade = () => {
    const currentLevel = aircraftLevels[selectedSkin] ?? 1;
    const creditCost = getAircraftUpgradeCost(currentLevel);
    const cost = creditCost === null ? null : Math.ceil(creditCost / 100);
    if (cost === null || loadGems() < cost) return;
    const next = { ...aircraftLevels, [selectedSkin]: currentLevel + 1 };
    spendGems(cost);
    saveAircraftLevels(next);
    setAircraftLevels(next);
    setGems(loadGems());
    aircraftUpgradeRef.current = getAircraftUpgradeStats(currentLevel + 1);
    audioRef.current.effect("upgrade", settingsRef.current.soundVolume);
  };

  const handleDroneUpgrade = () => {
    const currentLevel = droneLevels[selectedDroneSkin] ?? 1;
    const creditCost = getDroneUpgradeCost(currentLevel);
    const cost = creditCost === null ? null : Math.ceil(creditCost / 100);
    if (cost === null || loadGems() < cost) return;
    const next = { ...droneLevels, [selectedDroneSkin]: currentLevel + 1 };
    spendGems(cost);
    saveDroneLevels(next);
    setDroneLevels(next);
    setGems(loadGems());
    droneLevelRef.current = currentLevel + 1;
    audioRef.current.effect("upgrade", settingsRef.current.soundVolume);
  };

  const handleWeaponSelect = (id: string) => {
    const weapon = WEAPONS.find(candidate => candidate.id === id);
    if (!weapon || (weapon.cost > 0 && !loadUnlocks().includes(`weapon_${id}`))) return;
    const next = selectedWeapons.includes(id)
      ? selectedWeapons.length > 1 ? selectedWeapons.filter(weaponId => weaponId !== id) : selectedWeapons
      : selectedWeapons.length < 2 ? [...selectedWeapons, id] : [selectedWeapons[0], id];
    saveWeapons(next);
    setSelectedWeapons(next);
    activeWeaponsRef.current = next.map(weaponId => WEAPONS.find(candidate => candidate.id === weaponId) ?? WEAPONS[0]);
  };

  const handleWeaponBuy = (id: string) => {
    const weapon = WEAPONS.find(candidate => candidate.id === id);
    if (!weapon || weapon.cost === 0 || !isShopRarityUnlocked(weapon.rarity, getPilotLevelFromKills())) return;
    const unlockId = `weapon_${id}`;
    if (loadUnlocks().includes(unlockId)) return;
    if (weapon.currency === "gems") {
      if (loadGems() < weapon.cost) return;
      spendGems(weapon.cost);
      setGems(loadGems());
    } else {
      if (loadCoins() < weapon.cost) return;
      spendCoins(weapon.cost);
      setCoins(loadCoins());
    }
    addUnlock(unlockId);
    setUnlockedItems(loadUnlocks());
    const next = selectedWeapons.length < 2 ? [...selectedWeapons, id] : [selectedWeapons[0], id];
    saveWeapons(next);
    setSelectedWeapons(next);
    activeWeaponsRef.current = next.map(weaponId => WEAPONS.find(candidate => candidate.id === weaponId) ?? WEAPONS[0]);
  };

  const handleWeaponUpgrade = (id: string) => {
    const weapon = WEAPONS.find(candidate => candidate.id === id);
    const owned = weapon?.cost === 0 || loadUnlocks().includes(`weapon_${id}`);
    const currentLevel = weaponLevels[id] ?? 1;
    const cost = getWeaponUpgradeCost(currentLevel);
    if (!weapon || !owned || cost === null || loadGems() < cost) return;
    spendGems(cost);
    const next = { ...weaponLevels, [id]: currentLevel + 1 };
    saveWeaponLevels(next);
    setWeaponLevels(next);
    setGems(loadGems());
    weaponLevelsRef.current = next;
    audioRef.current.effect("upgrade", settingsRef.current.soundVolume);
  };

  const handleDailyChestClaim = (): number | null => {
    const reward = claimDailyChest();
    if (reward === null) return null;
    setCoins(loadCoins());
    audioRef.current.effect("upgrade", settingsRef.current.soundVolume);
    return reward;
  };

  const handleBuy = (itemId: string) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    if (loadUnlocks().includes(item.id)) return;
    if (!isShopRarityUnlocked(item.rarity, getPilotLevelFromKills())) return;
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
    if (!isShopRarityUnlocked(sk.rarity, getPilotLevelFromKills())) return;
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
    if (!isShopRarityUnlocked(skin.rarity, getPilotLevelFromKills())) return;
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
        {displayState.started && isPortraitPhone && (
          <div className="orientation-gate fixed inset-0 z-[70] flex items-center justify-center bg-[#030814]/95 p-6 text-center text-white">
            <div className="max-w-sm rounded-3xl border border-cyan-400/60 bg-slate-950/95 p-7 shadow-[0_0_45px_#22d3ee33]">
              <div className="text-6xl" aria-hidden="true">📱↻</div>
              <h2 className="mt-4 text-2xl font-black">GERÄT DREHEN</h2>
              <p className="mt-2 text-sm text-slate-300">Das Spielfeld ist im Querformat größer und leichter zu steuern. Die Mission wartet, bis du dein Gerät gedreht hast.</p>
              {fullscreenSupported && (
                <button onClick={toggleFullscreen} className="pause-primary mt-5 min-h-12 w-full rounded-xl px-5 py-3 font-black">
                  ⛶ VOLLBILD ÖFFNEN
                </button>
              )}
            </div>
          </div>
        )}
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
          <div className="absolute top-[90px] right-2 z-10 flex gap-1.5">
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
            ultiLoadout={ultiLoadout}
            selectedDroneSkin={selectedDroneSkin}
            aircraftBuild={aircraftBuild}
            hybridActive={hybridActive}
            droneBuild={droneBuild}
            droneRole={droneRole}
            selectedDroneWeapon={selectedDroneWeapon}
            selectedWeaponCrate={selectedWeaponCrate}
            selectedWeapons={selectedWeapons}
            selectedGameMode={selectedGameMode}
            coins={coins}
            gems={gems}
            highScore={highScore}
            unlockedItems={unlockedItems}
            aircraftLevels={aircraftLevels}
            droneLevels={droneLevels}
            weaponLevels={weaponLevels}
            hasSave={saveExistsRef.current}
            saveData={saveExistsRef.current ? loadSave() : null}
            onStart={() => startGame(saveExistsRef.current)}
            onNewGame={() => startGame(false)}
            onGameModeChange={setSelectedGameMode}
            onSkinSelect={handleSkinSelect}
            onUltiLoadoutChange={handleUltiLoadoutChange}
            onDroneSkinSelect={handleDroneSkinSelect}
            onAircraftBuildChange={handleAircraftBuildChange}
            onHybridSelect={handleHybridSelect}
            onHybridBuild={handleHybridBuild}
            onDroneBuildChange={handleDroneBuildChange}
            onDroneRoleChange={handleDroneRoleChange}
            onDroneWeaponChange={handleDroneWeaponChange}
            onWeaponCrateSelect={handleWeaponCrateSelect}
            onBuy={handleBuy}
            onUnlockSkin={handleUnlockSkin}
            onUnlockDroneSkin={handleUnlockDroneSkin}
            onAircraftUpgrade={handleAircraftUpgrade}
            onDroneUpgrade={handleDroneUpgrade}
            onWeaponSelect={handleWeaponSelect}
            onWeaponBuy={handleWeaponBuy}
            onWeaponUpgrade={handleWeaponUpgrade}
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
                  <button onClick={() => startGame(false, activeModeRef.current)} className="pause-secondary rounded-xl py-3 font-bold">{translated(language, "↻ NEU STARTEN", "↻ RESTART")}</button>
                  <button onClick={() => setPauseView("settings")} className="pause-secondary rounded-xl py-3 font-bold">{translated(language, "⚙ EINSTELLUNGEN", "⚙ SETTINGS")}</button>
                  <button onClick={returnToHangar} className="pause-secondary rounded-xl py-3 font-bold">{translated(language, "⌂ ZUM HANGAR", "⌂ RETURN TO HANGAR")}</button>
                </div>
                <div className="mt-4 text-xs text-slate-500">ESC oder {formatKeyCode(settings.keyBindings.pause)} drücken, um weiterzuspielen</div>
              </div>
            )}
          </div>
        )}
        {displayState.started && !displayState.paused && tutorialStage >= 0 && (
          <>
            <div className="tutorial-card absolute left-1/2 top-20 z-20 w-[min(92%,460px)] -translate-x-1/2 rounded-2xl px-5 py-4 text-center" style={{ background: "rgba(4,12,28,0.96)", border: "1px solid #00cfff", boxShadow: "0 0 30px #00cfff33" }}>
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-400">Training {tutorialStage + 1}/3</div>
              <div className="mt-1 text-lg font-black text-white">{tutorialStage === 0 ? translated(language, "Bewege deinen Jet", "Move your jet") : tutorialStage === 1 ? translated(language, "Jetzt schießen", "Now fire") : translated(language, "Bereit für die Mission!", "Ready for the mission!")}</div>
              {tutorialStage === 0 && !showVirtualControls && (
                <div className="mt-3 flex items-center justify-center gap-4">
                  <div className="grid grid-cols-3 gap-1" aria-label={translated(language, "WASD-Tasten", "WASD keys")}>
                    <span /><kbd className="tutorial-key">{formatKeyCode(settings.keyBindings.up)}</kbd><span />
                    <kbd className="tutorial-key">{formatKeyCode(settings.keyBindings.left)}</kbd><kbd className="tutorial-key">{formatKeyCode(settings.keyBindings.down)}</kbd><kbd className="tutorial-key">{formatKeyCode(settings.keyBindings.right)}</kbd>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{translated(language, "ODER", "OR")}</span>
                  <div className="grid grid-cols-3 gap-1" aria-label={translated(language, "Pfeiltasten", "Arrow keys")}>
                    <span /><kbd className="tutorial-key">↑</kbd><span />
                    <kbd className="tutorial-key">←</kbd><kbd className="tutorial-key">↓</kbd><kbd className="tutorial-key">→</kbd>
                  </div>
                </div>
              )}
              {tutorialStage === 1 && !showVirtualControls && <kbd className="tutorial-space mt-3 inline-block">{formatKeyCode(settings.keyBindings.fire)} GEDRÜCKT HALTEN</kbd>}
              {showVirtualControls && tutorialStage < 2 && <div className="mt-2 text-sm font-bold text-slate-200">{tutorialStage === 0 ? translated(language, "Ziehe deinen Finger links über das Spielfeld. Der Jet folgt ihm direkt.", "Drag your finger across the left side. The jet follows it directly.") : translated(language, "Halte rechts den roten FIRE-Knopf gedrückt.", "Hold the red FIRE button on the right.")}</div>}
              {tutorialStage === 2 && <div className="mt-2 text-sm text-slate-300">{settings.autoFire ? "Gut gemacht! Dein Jet feuert automatisch. Deine zwei ausgerüsteten Fähigkeiten nutzt du mit den eingeblendeten Tasten." : translated(language, "Gut gemacht! Volle Spezialanzeigen leuchten auf. Nutze dann die angezeigte Taste oder den entsprechenden Touch-Knopf.", "Well done! Full ability meters light up. Then use the displayed key or matching touch button.")}</div>}
              {tutorialStage < 2 && <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-cyan-200">Sicheres Training · Gegner warten</div>}
              {tutorialStage < 2 && <div className="mt-2 text-xs font-bold text-emerald-300">{translated(language, "Probiere es jetzt aus, um fortzufahren.", "Try it now to continue.")}</div>}
              {tutorialStage < 2 && <button onClick={finishTutorial} className="mt-2 text-xs font-bold text-slate-400 underline underline-offset-4">{translated(language, "Training überspringen", "Skip training")}</button>}
            </div>
            {showVirtualControls && tutorialStage === 0 && <div className="tutorial-pointer absolute bottom-[155px] left-[4%] z-20 text-center text-cyan-200"><div className="text-sm font-black">{translated(language, "HIER ZIEHEN", "DRAG HERE")}</div><div className="text-4xl">↓</div></div>}
            {showVirtualControls && tutorialStage === 1 && <div className="tutorial-pointer absolute bottom-[150px] right-[3%] z-20 text-center text-red-300"><div className="text-sm font-black">{translated(language, "HIER HALTEN", "HOLD HERE")}</div><div className="text-4xl">↓</div></div>}
          </>
        )}
      </div>
      {displayState.started && !displayState.gameOver && (
        <div className="mt-2 text-xs text-gray-600 tracking-wider hidden sm:block">
          {formatKeyCode(settings.keyBindings.up)}{formatKeyCode(settings.keyBindings.left)}{formatKeyCode(settings.keyBindings.down)}{formatKeyCode(settings.keyBindings.right)} — Bewegen · {settings.autoFire ? "AUTO-FIRE" : `${formatKeyCode(settings.keyBindings.fire)} — Schuss`} · {formatKeyCode(settings.keyBindings.ability1)}/{formatKeyCode(settings.keyBindings.ability2)}/{formatKeyCode(settings.keyBindings.ability3)} — Fähigkeiten · ESC — Pause
        </div>
      )}
    </div>
  );
}

// ─── Hangar Overlay ───────────────────────────────────────────────────────────

function JetBuildThumbnail({ skin }: { skin: JetSkin }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#10213a"); background.addColorStop(1, "#050914");
      ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 1;
      for (let x = 8; x < width; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
      const glow = ctx.createRadialGradient(width / 2, height / 2, 2, width / 2, height / 2, Math.min(width, height) * .48);
      glow.addColorStop(0, skin.glow + "55"); glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2, height / 2);
      const jetScale = Math.min(width / 110, height / 78);
      ctx.scale(jetScale, jetScale);
      drawPlayerJet(ctx, -PLAYER_W / 2, -PLAYER_H / 2, 3, false, skin, undefined, 3);
      ctx.restore();
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [skin]);
  return <canvas ref={ref} className="block aspect-[7/4] h-auto w-full rounded-lg" aria-hidden="true" />;
}

function DroneBuildThumbnail({ skin }: { skin: DroneSkin }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
    background.addColorStop(0, "#211536"); background.addColorStop(1, "#070812");
    ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#382653";
    for (let x = 8; x < canvas.width; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    ctx.save(); ctx.translate(50, 30); ctx.scale(1.65, 1.65);
    drawCombatDrone(ctx, 0, 0, 0, skin, 4);
    ctx.restore();
  }, [skin]);
  return <canvas ref={ref} width={100} height={60} className="block h-[60px] w-full rounded-lg" aria-hidden="true" />;
}

function WorkshopScreen({ build, droneBuild, droneRole, selectedSkin, selectedDroneSkin, unlockedItems, coins, onBuildChange, onDroneBuildChange, onDroneRoleChange, onBuild, onBack }: {
  build: AircraftBuild;
  droneBuild: DroneBuild;
  droneRole: DroneRoleId;
  selectedSkin: string;
  selectedDroneSkin: string;
  unlockedItems: string[];
  coins: number;
  onBuildChange: (build: AircraftBuild) => void;
  onDroneBuildChange: (build: DroneBuild) => void;
  onDroneRoleChange: (role: DroneRoleId) => void;
  onBuild: () => void;
  onBack: () => void;
}) {
  const availableJets = JET_SKINS.filter(skin => skin.cost === 0 || unlockedItems.includes(skin.id) || skin.id === selectedSkin);
  const availableDrones = DRONE_SKINS.filter(skin => skin.cost === 0 || unlockedItems.includes(skin.id) || skin.id === selectedDroneSkin);
  const skinName = (id: string) => JET_SKINS.find(skin => skin.id === id)?.name ?? "Aegis";
  const JetSelector = ({ title, slot }: { title: string; slot: "primary" | "secondary" }) =>
    <section className="mt-5">
      <h3 className="font-black" style={{ color: slot === "primary" ? "#67e8f9" : "#c4b5fd" }}>{title}</h3>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {availableJets.map(skin => {
          const active = slot === "primary" ? build.bodySkin === skin.id : build.wingSkin === skin.id;
          return <button key={`${slot}-${skin.id}`} onClick={() => onBuildChange(slot === "primary"
            ? { ...build, bodySkin: skin.id, engineSkin: skin.id }
            : { ...build, wingSkin: skin.id })}
          className="rounded-xl p-3 text-left transition active:scale-95"
          style={{ background: active ? `${skin.glow}30` : "rgba(15,23,42,.8)", border: `2px solid ${active ? skin.glow : "#334155"}`, boxShadow: active ? `0 0 12px ${skin.glow}55` : "none" }}>
          <JetBuildThumbnail skin={skin} />
          <span className="mt-2 block text-xs font-black">{skin.name}</span>
        </button>})}
      </div>
    </section>;
  const DroneSelector = ({ title, slot }: { title: string; slot: "primary" | "secondary" }) =>
    <section className="mt-4">
      <h3 className="text-sm font-black text-fuchsia-200">{title}</h3>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {availableDrones.map(skin => {
          const active = slot === "primary" ? droneBuild.bodySkin === skin.id : droneBuild.weaponSkin === skin.id;
          return <button key={`${slot}-${skin.id}`} onClick={() => onDroneBuildChange(slot === "primary"
            ? { ...droneBuild, bodySkin: skin.id, coreSkin: skin.id }
            : { ...droneBuild, weaponSkin: skin.id })}
          className="rounded-xl p-3 text-left transition active:scale-95"
          style={{ background: active ? `${skin.stroke}30` : "rgba(15,23,42,.8)", border: `2px solid ${active ? skin.stroke : "#334155"}` }}>
          <DroneBuildThumbnail skin={skin} />
          <span className="mt-2 block text-xs font-black">{skin.name}</span>
        </button>})}
      </div>
    </section>;
  return <div className="hangar-layer absolute inset-0 z-20 flex h-full flex-col overflow-y-auto bg-[#040c1c] p-4 text-white">
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="min-h-11 min-w-11 text-xl text-slate-300">←</button>
        <div><div className="text-xs font-black uppercase tracking-[.25em] text-cyan-400">Hangar-Werkstatt</div><h2 className="text-2xl font-black">FLUGZEUG-BAUKASTEN</h2></div>
      </div>
      <p className="mt-2 text-sm text-slate-400">Wähle genau zwei vollständige Flugzeuge. Der Baukasten erzeugt daraus automatisch einen sichtbaren Hybrid-Jet.</p>

      <JetSelector title="1 · FLUGZEUG A" slot="primary" />
      <JetSelector title="2 · FLUGZEUG B" slot="secondary" />

      <div className="mt-7 rounded-2xl border border-fuchsia-500/40 bg-fuchsia-950/15 p-4">
        <h3 className="text-lg font-black text-fuchsia-300">DROHNEN-BAUKASTEN</h3>
        <p className="text-xs text-slate-400">Wähle genau zwei vollständige Drohnen. Gehäuse, Kern und Waffen werden automatisch gemischt.</p>
        <DroneSelector title="1 · DROHNE A" slot="primary" />
        <DroneSelector title="2 · DROHNE B" slot="secondary" />
      </div>

      <section className="mt-5">
        <h3 className="font-black text-violet-200">3 · DROHNENROLLE</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{DRONE_ROLES.map(role => <button key={role.id} onClick={() => onDroneRoleChange(role.id)}
          className="rounded-2xl p-4 text-left transition active:scale-95" style={{ background: droneRole === role.id ? "rgba(109,40,217,.3)" : "rgba(15,23,42,.8)", border: `1px solid ${droneRole === role.id ? "#c4b5fd" : "#334155"}` }}>
          <div className="text-3xl">{role.icon}</div><div className="mt-2 font-black">{role.name}</div><div className="mt-1 text-xs text-slate-400">{role.description}</div>
        </button>)}</div>
      </section>

      <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/25 p-4 text-sm">
        <div className="text-xs font-black uppercase tracking-wider text-emerald-300">Deine Kombinationen</div>
        <div className="mt-1 font-black">Jet: {skinName(build.bodySkin)} + {skinName(build.wingSkin)}</div>
        <div className="mt-1 font-black text-fuchsia-200">Drohne: {DRONE_SKINS.find(skin => skin.id === droneBuild.bodySkin)?.name} + {DRONE_SKINS.find(skin => skin.id === droneBuild.weaponSkin)?.name}</div>
      </div>
      <button onClick={onBuild} disabled={coins < HYBRID_BUILD_COST}
        className="pause-primary mt-5 min-h-12 w-full rounded-xl font-black disabled:cursor-not-allowed disabled:opacity-40">
        HYBRID BAUEN · 💰 {HYBRID_BUILD_COST.toLocaleString("de-DE")} CREDITS
      </button>
      {coins < HYBRID_BUILD_COST && <div className="mt-2 text-center text-xs font-bold text-red-300">Noch {(HYBRID_BUILD_COST - coins).toLocaleString("de-DE")} Credits benötigt</div>}
    </div>
  </div>;
}

function HangarOverlay({
  selectedSkin, ultiLoadout, selectedDroneSkin, aircraftBuild, hybridActive, droneBuild, droneRole, selectedDroneWeapon, selectedWeaponCrate, selectedWeapons, selectedGameMode, coins, gems, highScore, unlockedItems, aircraftLevels, droneLevels, weaponLevels, hasSave, saveData,
  onStart, onNewGame, onGameModeChange, onSkinSelect, onUltiLoadoutChange, onDroneSkinSelect, onAircraftBuildChange, onHybridSelect, onHybridBuild, onDroneBuildChange, onDroneRoleChange, onDroneWeaponChange, onWeaponCrateSelect, onWeaponSelect, onWeaponBuy, onWeaponUpgrade, onBuy, onUnlockSkin, onUnlockDroneSkin, onAircraftUpgrade, onDroneUpgrade, onDailyChestClaim, onAdminActivate,
  fullscreenSupported, isFullscreen, onFullscreenToggle, settings, onSettingsChange, achievements,
}: {
  selectedSkin: string; ultiLoadout: UltiLoadoutId[]; selectedDroneSkin: string; aircraftBuild: AircraftBuild; hybridActive: boolean; droneBuild: DroneBuild; droneRole: DroneRoleId; selectedDroneWeapon: DroneWeaponId; selectedWeaponCrate: string; selectedWeapons: string[]; selectedGameMode: GameMode; coins: number; gems: number; highScore: number;
  aircraftLevels: Record<string, number>;
  droneLevels: Record<string, number>;
  weaponLevels: Record<string, number>;
  unlockedItems: string[]; hasSave: boolean; saveData: { level: number; score: number; weaponTier: number } | null;
  onStart: () => void; onNewGame: () => void;
  onGameModeChange: (mode: GameMode) => void;
  onSkinSelect: (id: string) => void; onUltiLoadoutChange: (ids: UltiLoadoutId[]) => void; onDroneSkinSelect: (id: string) => void; onWeaponCrateSelect: (id: string) => void; onBuy: (id: string) => void; onUnlockSkin: (id: string) => void; onUnlockDroneSkin: (id: string) => void;
  onAircraftBuildChange: (build: AircraftBuild) => void;
  onHybridSelect: () => void;
  onHybridBuild: () => boolean;
  onDroneBuildChange: (build: DroneBuild) => void;
  onDroneRoleChange: (role: DroneRoleId) => void;
  onDroneWeaponChange: (weapon: DroneWeaponId) => void;
  onAircraftUpgrade: () => void;
  onDroneUpgrade: () => void;
  onWeaponSelect: (id: string) => void;
  onWeaponBuy: (id: string) => void;
  onWeaponUpgrade: (id: string) => void;
  onDailyChestClaim: () => number | null;
  onAdminActivate: () => void;
  fullscreenSupported: boolean; isFullscreen: boolean; onFullscreenToggle: () => void;
  settings: GameSettings; onSettingsChange: (settings: GameSettings) => void;
  achievements: string[];
}) {
  const language = settings.language;
  const [view, setView] = useState<"main" | "briefing" | "upgrades" | "workshop" | "settings" | "leaderboard" | "achievements">("main");
  const [hoverSkin, setHoverSkin] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState(() => loadName());
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
    if (hybridActive) drawCombinedPlayerJet(ctx, 90, 56, 5, false, aircraftBuild, skin, undefined, aircraftLevels[skin.id] ?? 1);
    else drawPlayerJet(ctx, 90, 56, 5, false, skin, undefined, aircraftLevels[skin.id] ?? 1);
    drawCombinedCombatDrone(ctx, 105, 38, 0, droneBuild, DRONE_SKINS.find(s => s.id === selectedDroneSkin) ?? DRONE_SKINS[0], droneLevels[selectedDroneSkin] ?? 1);
    drawWeaponCrate(ctx, { x: 90, y: 56 }, WEAPON_CRATES.find(crate => crate.id === selectedWeaponCrate) ?? WEAPON_CRATES[0], true, 0);
  // Sub-views unmount the preview canvas. Redraw when returning to the main
  // hangar even if the selected skins and their levels did not change.
  }, [view, activeSkinId, skin, selectedDroneSkin, selectedWeaponCrate, aircraftBuild, hybridActive, droneBuild, aircraftLevels, droneLevels]);

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
        <ShopScreen coins={coins} gems={gems} playerLevel={getPilotLevelFromKills()} unlockedItems={unlockedItems} aircraftLevels={aircraftLevels} droneLevels={droneLevels} weaponLevels={weaponLevels} selectedSkin={selectedSkin} ultiLoadout={ultiLoadout} selectedDroneSkin={selectedDroneSkin} selectedDroneWeapon={selectedDroneWeapon} selectedWeapons={selectedWeapons}
          onBack={() => setView("main")} onBuy={onBuy} onUnlockSkin={onUnlockSkin} onSkinSelect={onSkinSelect}
          onUltiLoadoutChange={onUltiLoadoutChange} onUnlockDroneSkin={onUnlockDroneSkin} onDroneSkinSelect={onDroneSkinSelect} onDroneWeaponChange={onDroneWeaponChange} onAircraftUpgrade={onAircraftUpgrade} onDroneUpgrade={onDroneUpgrade} onWeaponSelect={onWeaponSelect} onWeaponBuy={onWeaponBuy} onWeaponUpgrade={onWeaponUpgrade} onDailyChestClaim={onDailyChestClaim} />
      </div>
    );
  }
  if (view === "workshop") {
    return <WorkshopScreen build={aircraftBuild} droneBuild={droneBuild} droneRole={droneRole} selectedSkin={selectedSkin} selectedDroneSkin={selectedDroneSkin} unlockedItems={unlockedItems} coins={coins}
      onBuildChange={onAircraftBuildChange} onDroneBuildChange={onDroneBuildChange} onDroneRoleChange={onDroneRoleChange}
      onBuild={() => { if (onHybridBuild()) setView("main"); }}
      onBack={() => setView("main")} />;
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
            fighter-game
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{translated(language, "2D Kampfjet-Simulator", "2D fighter jet simulator")}</div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div className="rounded-full border border-cyan-400/50 bg-cyan-950/60 px-3 py-1 text-sm font-black tracking-wider text-cyan-300"
            title={translated(language, "Höchstes erreichtes Spielerlevel", "Highest player level reached")}>
            🛡 PILOT-LEVEL {getPilotLevelFromKills()}
          </div>
          <div className="text-cyan-300 font-bold text-sm" title="Juwelen für Flugzeug- und Drohnen-Upgrades">💎 {gems.toLocaleString("de-DE")} Juwelen</div>
          <div className="text-slate-300 font-bold text-sm">⭐ {highScore.toLocaleString("de-DE")} Highscore</div>
          <div className="text-amber-400 font-bold text-sm" title={translated(language, "Verfügbare Credits", "Available credits")}>💰 {coins.toLocaleString(localeFor(language))} Credits</div>
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

      <button
        type="button"
        onPointerDown={event => event.stopPropagation()}
        onTouchStart={event => event.stopPropagation()}
        onClick={event => { event.preventDefault(); event.stopPropagation(); setView("workshop"); }}
        className="relative z-30 min-h-11 w-full max-w-md shrink-0 touch-manipulation rounded-xl px-4 py-2 text-sm font-black tracking-wide transition active:scale-95"
        style={{ background: "linear-gradient(90deg, rgba(8,145,178,.45), rgba(109,40,217,.45))", border: "2px solid #67e8f9", color: "#cffafe", pointerEvents: "auto" }}
      >
        🔧 BAUKASTEN ÖFFNEN
      </button>

      {/* ── Jet preview ── */}
      <div className="hangar-preview flex flex-col items-center gap-2">
        <div className="text-xs text-slate-500 uppercase tracking-widest">{translated(language, "Dein Jet", "Your jet")}</div>
        <div className="hangar-preview-canvas rounded-2xl overflow-hidden"
          style={{ border: `1.5px solid ${skin.glow}55`, boxShadow: `0 0 24px ${skin.glow}33` }}>
          <canvas ref={previewRef} width={240} height={140} className="block" />
        </div>
        <div className="font-bold text-white text-sm tracking-wide">{hybridActive ? `Hybrid · ${JET_SKINS.find(item => item.id === aircraftBuild.bodySkin)?.name} + ${JET_SKINS.find(item => item.id === aircraftBuild.wingSkin)?.name}` : skin.name}</div>
        <div className="max-w-sm rounded-xl border px-3 py-2 text-center" style={{ borderColor: `${skin.glow}55`, background: `${skin.glow}12` }}>
          <div className="text-xs font-black uppercase tracking-wider" style={{ color: skin.glow }}>{skin.ultiName}</div>
        </div>
        <div className="rounded-full border border-cyan-400/40 bg-cyan-950/50 px-3 py-0.5 text-[11px] font-black tracking-wider text-cyan-300">
          JET-LEVEL {aircraftLevels[selectedSkin] ?? 1}
        </div>
        {/* Colour picker dots */}
        <div className="hangar-skins flex max-w-full gap-2.5 mt-0.5 overflow-x-auto px-2 py-2">
          {JET_SKINS.filter(s => s.cost === 0 || unlockedItems.includes(s.id)).map(s => {
            const active = !hybridActive && s.id === selectedSkin;
            const previewing = s.id === hoverSkin;
            return (
              <button key={s.id}
                onClick={() => onSkinSelect(s.id)}
                onMouseEnter={() => setHoverSkin(s.id)}
                onMouseLeave={() => setHoverSkin(null)}
                aria-label={`${s.name} auswählen`}
                title={s.name}
                className="hangar-skin-button"
                style={{
                  width: 38, height: 38, minWidth: 38, borderRadius: "50%", background: s.glow,
                  border: previewing ? `3px solid #fff` : active ? "3px solid #fff" : `2px solid ${s.glow}66`,
                  boxShadow: previewing ? `0 0 14px ${s.glow}, 0 0 4px #fff8` : active ? `0 0 10px ${s.glow}` : "none",
                  transform: previewing ? "scale(1.25)" : "scale(1)",
                  transition: "transform 0.12s, box-shadow 0.12s",
                }}
              />
            );
          })}
          <button
            type="button"
            onClick={onHybridSelect}
            aria-label="Hybrid-Jet auswählen"
            title="Dein gespeicherter Hybrid-Jet"
            className="hangar-skin-button grid place-items-center font-black text-white"
            style={{
              width: 46, height: 38, minWidth: 46, borderRadius: 10,
              background: `linear-gradient(135deg, ${JET_SKINS.find(item => item.id === aircraftBuild.bodySkin)?.glow ?? "#22d3ee"} 0 50%, ${JET_SKINS.find(item => item.id === aircraftBuild.wingSkin)?.glow ?? "#a78bfa"} 50% 100%)`,
              border: hybridActive ? "3px solid #fff" : "2px solid #67e8f9",
              boxShadow: hybridActive ? "0 0 16px #67e8f9" : "none",
            }}
          >H</button>
        </div>
        <div className="hangar-drone-skins flex items-center justify-center gap-2 mt-1">
          <span className="text-slate-500 text-xs">Drohne:</span>
          {DRONE_SKINS.filter(s => s.cost === 0 || unlockedItems.includes(s.id)).map(s => {
            return <button key={s.id} onClick={() => onDroneSkinSelect(s.id)}
              aria-label={`${s.name} Drohnen-Skin auswählen`}
              title={s.name}
              className="hangar-skin-button"
              style={{ width: 38, height: 38, minWidth: 38, borderRadius: "50%", background: s.stroke,
                border: selectedDroneSkin === s.id ? "3px solid #fff" : `2px solid ${s.stroke}66`,
                boxShadow: selectedDroneSkin === s.id ? `0 0 10px ${s.stroke}` : "none" }} />;
          })}
          <span className="rounded-full border border-violet-400/40 bg-violet-950/50 px-2 py-0.5 text-[10px] font-black text-violet-300">LV {droneLevels[selectedDroneSkin] ?? 1}</span>
        </div>
        <div className="hangar-crate-skins flex items-center justify-center gap-2 mt-1">
          <span className="text-slate-500 text-xs">Waffenmodul:</span>
          {WEAPON_CRATES.map(crate => (
            <button
              key={crate.id}
              onClick={() => onWeaponCrateSelect(crate.id)}
              aria-label={`${crate.name} als Waffenmodul auswählen`}
              title={`${crate.name} · ${crate.rarity}`}
              className="hangar-skin-button grid place-items-center font-black text-xs"
              style={{
                width: 42, height: 34, minWidth: 42, borderRadius: crate.kind === "plasma" ? "50%" : crate.kind === "laser" ? 5 : 9,
                color: "#fff", background: `${crate.color}35`,
                border: selectedWeaponCrate === crate.id ? "3px solid #fff" : `2px solid ${crate.color}`,
                boxShadow: selectedWeaponCrate === crate.id ? `0 0 12px ${crate.color}` : "none",
              }}
            >
              {crate.kind === "rockets" ? "••" : crate.kind === "laser" ? "◇" : "●"}
            </button>
          ))}
        </div>
        {/* Continue hint */}
        {hasSave && saveData && (
          <div className="text-xs text-emerald-400/80 mt-1">
            {translated(language, "Gespeichert", "Saved")}: {translated(language, "Level", "Level")} {saveData.level} · {saveData.score.toLocaleString(localeFor(language))} {translated(language, "Punkte", "points")} · {WEAPON_TIERS[saveData.weaponTier]?.name}
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

      {/* ── Game mode selection ── */}
      <div className="w-full">
        <div className="mb-1 text-center text-[10px] font-black uppercase tracking-[.24em] text-violet-300">Spielmodus</div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {GAME_MODES.map(mode => {
            const active = mode.id === selectedGameMode;
            return (
              <button
                key={mode.id}
                onClick={() => onGameModeChange(mode.id)}
                title={mode.description}
                className="min-w-0 rounded-lg px-1.5 py-1.5 text-center transition active:scale-95"
                style={{
                  background: active ? "rgba(109,40,217,.42)" : "rgba(255,255,255,.045)",
                  border: `1px solid ${active ? "#a78bfa" : "#334155"}`,
                  color: active ? "#ede9fe" : "#94a3b8",
                  boxShadow: active ? "0 0 14px #8b5cf633" : "none",
                }}
              >
                <span className="block text-base">{mode.icon}</span>
                <span className="block truncate text-[10px] font-black">{mode.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-1 text-center text-[10px] text-slate-400">
          {getEffectiveGameModeRules(selectedGameMode).description}
          {getModeCoinMultiplier(selectedGameMode) > 1 && ` · ${getModeCoinMultiplier(selectedGameMode)}× Credits`}
        </div>
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
                {getEffectiveGameModeRules(selectedGameMode).icon} {getEffectiveGameModeRules(selectedGameMode).label.toUpperCase()} STARTEN
              </button>
            </>
          ) : (
            <button onClick={onStart}
              className="w-full py-3 rounded-xl font-bold text-lg tracking-widest transition-all active:scale-95"
              style={{ background: "rgba(0,70,140,0.85)", border: "2px solid #00cfff", color: "#00cfff", textShadow: "0 0 10px #00cfff88" }}>
              ▶ {getEffectiveGameModeRules(selectedGameMode).label.toUpperCase()} STARTEN
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
      </svg>
    </div>
  );
}

function ShopScreen({ coins, gems, playerLevel, unlockedItems, aircraftLevels, droneLevels, weaponLevels, selectedSkin, ultiLoadout, selectedDroneSkin, selectedDroneWeapon, selectedWeapons, onBack, onBuy, onUnlockSkin, onSkinSelect, onUltiLoadoutChange, onUnlockDroneSkin, onDroneSkinSelect, onDroneWeaponChange, onAircraftUpgrade, onDroneUpgrade, onWeaponSelect, onWeaponBuy, onWeaponUpgrade, onDailyChestClaim }: {
  coins: number; gems: number; playerLevel: number; unlockedItems: string[]; selectedSkin: string; ultiLoadout: UltiLoadoutId[]; selectedDroneSkin: string; selectedDroneWeapon: DroneWeaponId; selectedWeapons: string[];
  aircraftLevels: Record<string, number>;
  droneLevels: Record<string, number>;
  weaponLevels: Record<string, number>;
  onBack: () => void; onBuy: (id: string) => void;
  onUnlockSkin: (id: string) => void; onSkinSelect: (id: string) => void;
  onUltiLoadoutChange: (ids: UltiLoadoutId[]) => void;
  onUnlockDroneSkin: (id: string) => void; onDroneSkinSelect: (id: string) => void;
  onDroneWeaponChange: (id: DroneWeaponId) => void;
  onAircraftUpgrade: () => void;
  onDroneUpgrade: () => void;
  onWeaponSelect: (id: string) => void;
  onWeaponBuy: (id: string) => void;
  onWeaponUpgrade: (id: string) => void;
  onDailyChestClaim: () => number | null;
}) {
  type ShopSection = "weapons" | "levels" | "skins" | "ultis" | "upgrades";
  const shopSections: readonly { id: ShopSection; icon: string; label: string; description: string }[] = [
    { id: "weapons", icon: "🎯", label: "Waffen", description: "Kaufen, ausrüsten und verbessern" },
    { id: "levels", icon: "⬆", label: "Level", description: "Jet und Drohne verstärken" },
    { id: "skins", icon: "🎨", label: "Skins", description: "Aussehen auswählen" },
    { id: "ultis", icon: "⚡", label: "Ultis", description: "Loadout zusammenstellen" },
    { id: "upgrades", icon: "🔧", label: "Extras", description: "Dauerhafte Verbesserungen" },
  ];
  const [shopSection, setShopSection] = useState<ShopSection>("weapons");
  const [dailyChestAvailable, setDailyChestAvailable] = useState(() => canClaimDailyChest());
  const [dailyChestOpening, setDailyChestOpening] = useState(false);
  const [dailyChestCelebrating, setDailyChestCelebrating] = useState(false);
  const [dailyChestReward, setDailyChestReward] = useState<number | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<{ name: string; cost: number; currency: "credits" | "gems"; action: () => void } | null>(null);
  const [purchaseCelebration, setPurchaseCelebration] = useState<{ name: string; nonce: number } | null>(null);
  const dailyChestTimers = useRef<number[]>([]);
  useEffect(() => () => dailyChestTimers.current.forEach(window.clearTimeout), []);

  const requestPurchase = (name: string, cost: number, action: () => void, currency: "credits" | "gems" = "credits") => {
    setPendingPurchase({ name, cost, currency, action });
  };

  const confirmPurchase = () => {
    if (!pendingPurchase || (pendingPurchase.currency === "gems" ? gems : coins) < pendingPurchase.cost) return;
    const purchasedName = pendingPurchase.name;
    pendingPurchase.action();
    setPendingPurchase(null);
    setPurchaseCelebration({ name: purchasedName, nonce: Date.now() });
    dailyChestTimers.current.push(window.setTimeout(() => setPurchaseCelebration(null), 1500));
  };

  const openDailyChest = () => {
    if (!dailyChestAvailable || dailyChestOpening) return;
    const reward = onDailyChestClaim();
    if (reward === null) return;
    setDailyChestReward(reward);
    setDailyChestOpening(true);
    dailyChestTimers.current.push(window.setTimeout(() => {
      setDailyChestAvailable(false);
      setDailyChestCelebrating(true);
    }, 520));
    dailyChestTimers.current.push(window.setTimeout(() => {
      setDailyChestOpening(false);
      setDailyChestCelebrating(false);
    }, 1800));
  };
  const selectedJet = JET_SKINS.find(s => s.id === selectedSkin) ?? JET_SKINS[0];
  const aircraftStats = getAircraftUpgradeStats(aircraftLevels[selectedSkin] ?? 1);
  const aircraftCreditCost = getAircraftUpgradeCost(aircraftStats.level);
  const aircraftUpgradeCost = aircraftCreditCost === null ? null : Math.ceil(aircraftCreditCost / 100);
  const selectedDrone = DRONE_SKINS.find(s => s.id === selectedDroneSkin) ?? DRONE_SKINS[0];
  const droneLevel = droneLevels[selectedDroneSkin] ?? 1;
  const droneCreditCost = getDroneUpgradeCost(droneLevel);
  const droneUpgradeCost = droneCreditCost === null ? null : Math.ceil(droneCreditCost / 100);
  const mkUpgrades = ["drone_mk2", "drone_mk3", "drone_mk4", "drone_mk5", "drone_mk6", "drone_mk7", "drone_mk8"].filter(id => unlockedItems.includes(id)).length;
  const droneStats = getDroneStats(mkUpgrades + droneLevel - 1);
  return (
    <div className="relative flex flex-col h-full p-4 gap-3 overflow-y-auto select-none text-white">
      <ShopStarfield />
      {pendingPurchase && (
        <div className="purchase-confirmation fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="purchase-title">
          <div className="w-full max-w-sm rounded-3xl border border-amber-300/70 bg-[#090d1d]/95 p-6 text-center shadow-[0_0_45px_#fbbf2444]">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-amber-300/60 bg-amber-400/10 text-4xl shadow-[0_0_25px_#fbbf2444]">{pendingPurchase.currency === "gems" ? "💎" : "💰"}</div>
            <div className="mt-4 text-[10px] font-black uppercase tracking-[.28em] text-amber-300">Kauf bestätigen</div>
            <h3 id="purchase-title" className="mt-2 text-2xl font-black text-white">Bist du sicher?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Möchtest du <b className="text-white">{pendingPurchase.name}</b> für{" "}
              <b className="text-amber-300">{pendingPurchase.cost.toLocaleString("de-DE")} {pendingPurchase.currency === "gems" ? "Juwelen" : "Credits"}</b> kaufen?
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button autoFocus onClick={() => setPendingPurchase(null)} className="rounded-xl border border-slate-500 bg-slate-800/80 px-4 py-3 font-black text-slate-200 transition hover:bg-slate-700">
                ABBRECHEN
              </button>
              <button onClick={confirmPurchase} className="purchase-confirm-button rounded-xl border border-amber-200 bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300 active:scale-95">
                KAUFEN
              </button>
            </div>
          </div>
        </div>
      )}
      {purchaseCelebration && (
        <div key={purchaseCelebration.nonce} className="purchase-celebration pointer-events-none fixed inset-0 z-50 grid place-items-center" role="status" aria-live="polite">
          <div className="purchase-flash absolute inset-0" />
          <div className="purchase-success relative rounded-3xl border border-emerald-300/80 bg-slate-950/95 px-8 py-6 text-center shadow-[0_0_60px_#34d39977]">
            <div className="purchase-check mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-400 text-5xl font-black text-slate-950">✓</div>
            <div className="mt-4 text-[11px] font-black uppercase tracking-[.3em] text-emerald-300">Kauf erfolgreich</div>
            <div className="mt-1 text-xl font-black text-white">{purchaseCelebration.name}</div>
            <div className="purchase-spark purchase-spark-a">✦</div>
            <div className="purchase-spark purchase-spark-b">✦</div>
            <div className="purchase-spark purchase-spark-c">✦</div>
            <div className="purchase-spark purchase-spark-d">✦</div>
          </div>
        </div>
      )}
      <div className="relative z-10 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-xl font-bold px-2">←</button>
        <h2 className="font-bold text-xl tracking-wide" style={{ textShadow: "0 0 12px #00cfff88" }}>SHOP</h2>
        <span className="rounded-full border border-cyan-400/50 bg-cyan-950/60 px-2.5 py-1 text-xs font-black text-cyan-300">PILOT-LEVEL {playerLevel}</span>
        <span className="ml-auto text-cyan-300 font-bold text-sm">💎 {gems.toLocaleString("de-DE")}</span>
        <span className="text-amber-300 font-bold text-sm">💰 {coins.toLocaleString("de-DE")}</span>
      </div>

      <button
        type="button"
        disabled={!dailyChestAvailable || dailyChestOpening}
        onClick={openDailyChest}
        className={`daily-chest relative z-10 flex shrink-0 items-center gap-4 overflow-hidden rounded-2xl p-4 text-left transition active:scale-[.99] disabled:cursor-default ${dailyChestOpening ? "daily-chest-opening" : ""} ${dailyChestCelebrating ? "daily-chest-celebrating" : ""} ${!dailyChestAvailable && !dailyChestOpening ? "opacity-60" : ""}`}
        style={{ background: dailyChestAvailable ? "linear-gradient(110deg,rgba(120,70,0,.82),rgba(40,24,4,.92))" : "rgba(20,24,36,.82)", border: `1px solid ${dailyChestAvailable ? "#fbbf24" : "#475569"}`, boxShadow: dailyChestAvailable ? "0 0 22px #f59e0b44" : "none" }}
      >
        <span className={`daily-chest-icon relative z-10 text-4xl ${dailyChestAvailable ? "animate-pulse" : "grayscale"}`}>{dailyChestCelebrating ? "🧰" : "🎁"}</span>
        {dailyChestCelebrating && (
          <span className="pointer-events-none absolute inset-0" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6].map(i => <span key={i} className="daily-chest-coin" style={{ "--coin-x": `${(i - 3) * 25}px`, "--coin-y": `${-48 - Math.abs(i - 3) * 5}px`, animationDelay: `${i * 35}ms` } as React.CSSProperties}>●</span>)}
            <span className="daily-chest-reward">+{dailyChestReward?.toLocaleString("de-DE")}</span>
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Tägliche Truhe</span>
          <span className="block font-black text-white">{dailyChestOpening ? "Truhe wird geöffnet …" : dailyChestAvailable ? "Tägliche Belohnung abholen" : "Heute bereits abgeholt"}</span>
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
          return <span key={key} className="rounded px-2 py-0.5" style={{
            opacity: unlocked ? 1 : .45,
            ...shopRarityLabelStyle(key),
            border: `1px solid ${rarity.color}`,
            boxShadow: unlocked ? shopRarityGlow(key, 7) : undefined,
          }}>{unlocked ? "" : "🔒 "}{rarity.label} · LVL {SHOP_RARITY_MIN_LEVEL[key]}</span>;
        })}
      </div>

      <nav className="relative z-10 grid grid-cols-5 gap-1 rounded-2xl border border-slate-700/80 bg-slate-950/80 p-1.5" aria-label="Shop-Bereiche">
        {shopSections.map(section => {
          const active = shopSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setShopSection(section.id)}
              aria-pressed={active}
              title={section.description}
              className={`min-w-0 rounded-xl px-1 py-2 text-center transition ${active ? "bg-cyan-400 text-slate-950 shadow-[0_0_16px_#22d3ee66]" : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"}`}
            >
              <span className="block text-base leading-none">{section.icon}</span>
              <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-wide">{section.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="relative z-10 rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-3 py-2 text-xs text-slate-300">
        <b className="text-cyan-300">{shopSections.find(section => section.id === shopSection)?.label}:</b>{" "}
        {shopSections.find(section => section.id === shopSection)?.description}
        <span className="ml-2 text-slate-500">Sortiert nach Seltenheit und Preis.</span>
      </div>

      {shopSection === "weapons" && (
      <div className="relative z-10">
        <div className="text-xs font-black uppercase tracking-[.2em] text-rose-300">Waffenarsenal</div>
        <div className="mt-1 text-xs text-slate-400">Kaufe Waffen mit Credits oder Juwelen, rüste bis zu zwei gleichzeitig aus und verbessere sie bis Level 10.</div>
        <div className="mt-2 text-[10px] font-black uppercase tracking-wider text-cyan-300">Waffenslots {selectedWeapons.length}/2 belegt</div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SORTED_WEAPONS.map(weapon => {
            const owned = weapon.cost === 0 || unlockedItems.includes(`weapon_${weapon.id}`);
            const active = selectedWeapons.includes(weapon.id);
            const slot = active ? selectedWeapons.indexOf(weapon.id) + 1 : null;
            const level = weaponLevels[weapon.id] ?? 1;
            const stats = getWeaponStats(weapon, level);
            const upgradeCost = getWeaponUpgradeCost(level);
            const levelUnlocked = isShopRarityUnlocked(weapon.rarity, playerLevel);
            const canAfford = weapon.currency === "gems" ? gems >= weapon.cost : coins >= weapon.cost;
            const rarity = SHOP_RARITIES[weapon.rarity];
            const buy = () => requestPurchase(weapon.name, weapon.cost, () => onWeaponBuy(weapon.id), weapon.currency);
            return <div key={weapon.id} className="rounded-2xl p-3" style={{
              background: active ? `${weapon.color}20` : "rgba(255,255,255,.045)",
              border: `1px solid ${active ? weapon.color : rarity.color}88`,
              borderLeft: `5px solid ${rarity.color}`,
              boxShadow: active ? `0 0 18px ${weapon.color}44` : undefined,
              opacity: !owned && !levelUnlocked ? .48 : 1,
            }}>
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl font-black" style={{ color: weapon.color, background: `${weapon.color}16`, border: `1px solid ${weapon.color}88`, textShadow: `0 0 9px ${weapon.color}` }}>{weapon.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><b>{weapon.name}</b><span className="text-[9px] font-black" style={shopRarityLabelStyle(weapon.rarity)}>{rarity.label}</span></div>
                  <div className="text-[11px] text-slate-400">{weapon.description}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px]">
                <span className="rounded bg-black/25 p-1"><b className="block text-white">{stats.damage}</b>Schaden</span>
                <span className="rounded bg-black/25 p-1"><b className="block text-white">{weapon.guns}</b>Schüsse</span>
                <span className="rounded bg-black/25 p-1"><b className="block text-white">{Math.round(1000 / stats.fireRate * 10) / 10}/s</b>Feuerrate</span>
              </div>
              <div className="mt-2 flex gap-2">
                {!owned ? (
                  <button disabled={!levelUnlocked || !canAfford} onClick={buy} className="flex-1 rounded-lg border border-amber-400/50 bg-amber-950/50 px-2 py-2 text-xs font-black text-amber-200 disabled:opacity-35">
                    {!levelUnlocked ? `🔒 Pilot-Level ${SHOP_RARITY_MIN_LEVEL[weapon.rarity]} erforderlich` : `${weapon.currency === "gems" ? "💎" : "💰"} ${weapon.cost.toLocaleString("de-DE")}`}
                  </button>
                ) : (
                  <button onClick={() => onWeaponSelect(weapon.id)} className="flex-1 rounded-lg border border-cyan-400/50 bg-cyan-950/50 px-2 py-2 text-xs font-black text-cyan-200">
                    {active ? `✓ SLOT ${slot} · ABLEGEN` : selectedWeapons.length < 2 ? "AUSRÜSTEN" : "SLOT 2 ERSETZEN"}
                  </button>
                )}
                {owned && <button disabled={upgradeCost === null || gems < upgradeCost} onClick={() => upgradeCost !== null && requestPurchase(`${weapon.name} auf Level ${level + 1}`, upgradeCost, () => onWeaponUpgrade(weapon.id), "gems")} className="rounded-lg border border-violet-400/50 bg-violet-950/50 px-2 py-2 text-xs font-black text-violet-200 disabled:opacity-35">
                  {upgradeCost === null ? "MAX" : `LVL ${level} → ${level + 1} · 💎 ${upgradeCost}`}
                </button>}
              </div>
            </div>;
          })}
        </div>

        <div className="mt-6 border-t border-violet-400/25 pt-5">
          <div className="text-xs font-black uppercase tracking-[.2em] text-violet-300">Drohnenwaffen</div>
          <div className="mt-1 text-xs text-slate-400">Wähle eine separate Waffe für deine Begleitdrohne. Drohnenlevel und Rollen verstärken sie weiterhin.</div>
          <div className="mt-2 text-[10px] font-black uppercase tracking-wider text-violet-200">Drohnen-Waffenslot 1/1 belegt</div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {DRONE_WEAPONS.map(weapon => {
              const active = selectedDroneWeapon === weapon.id;
              const shots = weapon.id === "ion_spread" ? 3 : 1;
              const damage = Math.round(droneStats.damage * weapon.damageMultiplier * 10) / 10;
              const fireRate = Math.round(1000 / (280 * droneStats.fireRateMultiplier * weapon.fireRate) * 10) / 10;
              return (
                <button
                  key={weapon.id}
                  type="button"
                  onClick={() => onDroneWeaponChange(weapon.id)}
                  aria-pressed={active}
                  className="rounded-2xl p-3 text-left transition active:scale-[.98]"
                  style={{
                    background: active ? `${weapon.color}20` : "rgba(255,255,255,.045)",
                    border: `1px solid ${active ? weapon.color : `${weapon.color}66`}`,
                    borderLeft: `5px solid ${weapon.color}`,
                    boxShadow: active ? `0 0 18px ${weapon.color}44` : undefined,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl font-black" style={{ color: weapon.color, background: `${weapon.color}16`, border: `1px solid ${weapon.color}88`, textShadow: `0 0 9px ${weapon.color}` }}>{weapon.icon}</span>
                    <span className="min-w-0">
                      <b className="block text-white">{weapon.name}</b>
                      <span className="text-[11px] text-slate-400">{weapon.description}</span>
                    </span>
                  </div>
                  <span className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px] text-slate-300">
                    <span className="rounded bg-black/25 p-1"><b className="block text-white">{damage}</b>Schaden</span>
                    <span className="rounded bg-black/25 p-1"><b className="block text-white">{shots}</b>Schüsse</span>
                    <span className="rounded bg-black/25 p-1"><b className="block text-white">{fireRate}/s</b>Feuerrate</span>
                  </span>
                  <span className="mt-2 block rounded-lg border border-violet-400/50 bg-violet-950/50 px-2 py-2 text-center text-xs font-black text-violet-200">
                    {active ? "✓ AUSGERÜSTET" : "AUSRÜSTEN"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {shopSection === "levels" && (<>
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
            <button onClick={() => requestPurchase(`${selectedJet.name} auf Level ${aircraftStats.level + 1}`, aircraftUpgradeCost, onAircraftUpgrade, "gems")} disabled={gems < aircraftUpgradeCost}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-black transition active:scale-95 disabled:opacity-40"
              style={{ background: "rgba(8,90,120,.65)", border: "1px solid #22d3ee", color: "#a5f3fc" }}>
              LEVEL {aircraftStats.level + 1}<br />💎 {aircraftUpgradeCost.toLocaleString("de-DE")}
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
            <button onClick={() => requestPurchase(`${selectedDrone.name} auf Level ${droneLevel + 1}`, droneUpgradeCost, onDroneUpgrade, "gems")} disabled={gems < droneUpgradeCost}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-black transition active:scale-95 disabled:opacity-40"
              style={{ background: "rgba(80,25,120,.65)", border: "1px solid #c084fc", color: "#e9d5ff" }}>
              LEVEL {droneLevel + 1}<br />💎 {droneUpgradeCost.toLocaleString("de-DE")}
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px] text-slate-300">
          <div className="rounded-lg bg-black/25 p-1.5"><b className="block text-white">{droneStats.damage}</b>Schaden</div>
          <div className="rounded-lg bg-black/25 p-1.5"><b className="block text-white">{droneStats.guns}</b>Kanonen</div>
          <div className="rounded-lg bg-black/25 p-1.5"><b className="block text-white">+{Math.round((1 - droneStats.fireRateMultiplier) * 100)}%</b>Feuerrate</div>
        </div>
      </div>
      </>)}

      {shopSection === "skins" && (<>
      <div className="relative z-10 text-slate-400 text-xs uppercase tracking-widest">Jet-Skins</div>
      <div className="relative z-10 grid grid-cols-3 gap-2 shrink-0">
        {SORTED_JET_SKINS.map(s => {
          const owned = s.cost === 0 || unlockedItems.includes(s.id);
          const active = s.id === selectedSkin;
          const canAfford = coins >= s.cost;
          const aircraftLevel = aircraftLevels[s.id] ?? 1;
          const levelUnlocked = isShopRarityUnlocked(s.rarity, playerLevel);
          const rarity = SHOP_RARITIES[s.rarity];
          return (
            <button key={s.id}
              onClick={() => owned ? onSkinSelect(s.id) : canAfford && levelUnlocked ? requestPurchase(`Jet-Skin ${s.name}`, s.cost, () => onUnlockSkin(s.id)) : undefined}
              disabled={!owned && !levelUnlocked}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95"
              style={{
                background: active ? s.glow + "22" : "rgba(255,255,255,0.05)",
                borderTop: active ? `2px solid ${s.glow}` : `1px solid ${s.glow}33`,
                borderBottom: active ? `2px solid ${s.glow}` : `1px solid ${s.glow}33`,
                borderLeft: `4px solid ${rarity.color}`,
                borderRight: `4px solid ${rarity.color}`,
                boxShadow: SHOP_RARITY_ORDER[s.rarity] >= SHOP_RARITY_ORDER.legendary ? shopRarityGlow(s.rarity, 12) : undefined,
                opacity: !owned && (!canAfford || !levelUnlocked) ? 0.45 : 1,
              }}>
              <JetShopImage skin={s} aircraftLevel={aircraftLevel} />
              <div className="text-center text-xs font-bold">{s.name}</div>
              <div className="text-[9px] font-black leading-tight" style={{ color: s.glow }}>{s.ultiName}</div>
              <div className="text-[10px] font-bold text-cyan-300">Level {aircraftLevel}</div>
              <div className="text-[9px] font-black tracking-wider" style={shopRarityLabelStyle(s.rarity)}>{rarity.label}</div>
              {owned
                ? <div className="text-green-400 text-xs">{active ? "✓ Aktiv" : "Wählen"}</div>
                : <div className={`text-xs font-bold ${canAfford && levelUnlocked ? "text-amber-300" : "text-slate-500"}`}>
                    {!levelUnlocked ? `🔒 Pilot-Level ${SHOP_RARITY_MIN_LEVEL[s.rarity]} erforderlich` : canAfford ? `💰 ${formatLockedSkinPrice(s.cost)}` : `🔒 ${formatLockedSkinPrice(s.cost)}`}
                  </div>
              }
            </button>
          );
        })}
      </div>
      </>)}

      {shopSection === "ultis" && (<>
      <div className="relative z-10 flex items-center justify-between text-slate-400 text-xs uppercase tracking-widest mt-1">
        <span>Ulti-Loadout</span><span className="text-violet-300">{ultiLoadout.length}/{ULTI_LOADOUT_SLOTS} belegt</span>
      </div>
      <div className="relative z-10 rounded-2xl border border-violet-400/40 bg-violet-950/20 p-3">
        <div className="mb-2 text-[10px] text-slate-400">Entferne Ultis, ändere ihre Reihenfolge oder setze neu gekaufte Ultis ein.</div>
        <div className="flex flex-col gap-2">
          {ultiLoadout.map((id, index) => {
            const option = ULTI_LOADOUT_OPTIONS.find(item => item.id === id)!;
            const move = (offset: number) => { const next = [...ultiLoadout]; const target = index + offset; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; onUltiLoadoutChange(next); };
            return <div key={id} className="flex items-center gap-2 rounded-xl border border-violet-400/30 bg-black/25 p-2">
              <span className="w-12 text-xs font-black text-violet-300">SLOT {index + 1}</span><span className="flex-1 text-sm font-bold">{option.name} <b className="text-cyan-300">[{option.key}]</b></span>
              <button onClick={() => move(-1)} disabled={index === 0} className="rounded px-2 py-1 disabled:opacity-25">↑</button>
              <button onClick={() => move(1)} disabled={index === ultiLoadout.length - 1} className="rounded px-2 py-1 disabled:opacity-25">↓</button>
              <button onClick={() => onUltiLoadoutChange(ultiLoadout.filter(item => item !== id))} className="rounded px-2 py-1 text-red-300" aria-label={`${option.name} entfernen`}>✕</button>
            </div>;
          })}
          {Array.from({ length: ULTI_LOADOUT_SLOTS - ultiLoadout.length }, (_, index) => (
            <div key={`empty-${index}`} className="flex items-center gap-2 rounded-xl border border-dashed border-slate-600/70 bg-black/10 p-2 text-slate-500">
              <span className="w-12 text-xs font-black">SLOT {ultiLoadout.length + index + 1}</span>
              <span className="flex-1 text-sm">Leer</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {ULTI_LOADOUT_OPTIONS.filter(option => (!option.requires || unlockedItems.includes(option.requires)) && !ultiLoadout.includes(option.id)).map(option =>
            <button key={option.id} onClick={() => onUltiLoadoutChange([...ultiLoadout, option.id])} disabled={ultiLoadout.length >= ULTI_LOADOUT_SLOTS} className="rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-30">+ {option.name}</button>
          )}
        </div>
      </div>
      </>)}

      {shopSection === "skins" && (<>
      <div className="relative z-10 text-slate-400 text-xs uppercase tracking-widest mt-1">Drohnen-Skins</div>
      <div className="relative z-10 grid grid-cols-3 gap-2 shrink-0">
        {SORTED_DRONE_SKINS.map(s => {
          const owned = s.cost === 0 || unlockedItems.includes(s.id);
          const active = s.id === selectedDroneSkin;
          const canAfford = coins >= s.cost;
          const levelUnlocked = isShopRarityUnlocked(s.rarity, playerLevel);
          const rarity = SHOP_RARITIES[s.rarity];
          return <button key={s.id} onClick={() => owned ? onDroneSkinSelect(s.id) : canAfford && levelUnlocked ? requestPurchase(`Drohnen-Skin ${s.name}`, s.cost, () => onUnlockDroneSkin(s.id)) : undefined} disabled={!owned && !levelUnlocked}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95"
            style={{
              background: s.rarity === "ultimate"
                ? "linear-gradient(110deg, rgba(248,250,252,.16), rgba(103,232,249,.10), rgba(249,168,212,.12), rgba(253,230,138,.10))"
                : active ? s.stroke + "22" : "rgba(255,255,255,0.05)",
              border: `1px solid ${s.stroke}55`,
              borderLeft: `4px solid ${rarity.color}`,
              borderRight: `4px solid ${rarity.color}`,
              boxShadow: SHOP_RARITY_ORDER[s.rarity] >= SHOP_RARITY_ORDER.legendary ? shopRarityGlow(s.rarity, 12) : undefined,
              opacity: !owned && (!canAfford || !levelUnlocked) ? .45 : 1,
            }}>
            <div className="w-8 h-4 rounded-full" style={{ background: s.body, border: `2px solid ${s.stroke}`, boxShadow: `0 0 8px ${s.stroke}` }} />
            <div className="text-xs font-bold">{s.name}</div>
            <div className="text-[9px] font-black" style={shopRarityLabelStyle(s.rarity)}>{rarity.label}</div>
            <div className="text-[9px] font-black" style={{ color: s.stroke }}>{s.ultiName}</div>
            <div className="text-[10px] font-bold text-violet-300">Level {droneLevels[s.id] ?? 1}</div>
            {owned ? <div className="text-green-400 text-xs">{active ? "✓ Aktiv" : "Wählen"}</div> :
              <div className={`text-xs font-bold ${canAfford && levelUnlocked ? "text-amber-300" : "text-slate-500"}`}>{!levelUnlocked ? `🔒 Pilot-Level ${SHOP_RARITY_MIN_LEVEL[s.rarity]} erforderlich` : `${canAfford ? "💰" : "🔒"} ${formatLockedSkinPrice(s.cost)}`}</div>}
          </button>;
        })}
      </div>
      </>)}

      {shopSection === "upgrades" && (<>
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
                background: item.rarity === "ultimate"
                  ? "linear-gradient(110deg, rgba(248,250,252,.12), rgba(103,232,249,.08), rgba(249,168,212,.10), rgba(253,230,138,.08))"
                  : owned ? "rgba(0,180,80,0.10)" : "rgba(255,255,255,0.05)",
                borderTop: `1px solid ${owned ? "#00aa4444" : "#334"}`,
                borderBottom: `1px solid ${owned ? "#00aa4444" : "#334"}`,
                borderLeft: `5px solid ${rarity.color}`,
                borderRight: `5px solid ${rarity.color}`,
                boxShadow: SHOP_RARITY_ORDER[item.rarity] >= SHOP_RARITY_ORDER.legendary ? shopRarityGlow(item.rarity, 14) : undefined,
              }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-sm">{item.name}</div>
                  <span className="text-[9px] font-black tracking-wider" style={shopRarityLabelStyle(item.rarity)}>{rarity.label}</span>
                </div>
                <div className="text-slate-400 text-xs">{item.desc}</div>
              </div>
              {owned
                ? <span className="text-green-400 font-bold text-lg shrink-0">✓</span>
                : !levelUnlocked
                  ? <span className="text-slate-500 text-xs font-bold shrink-0">🔒 Pilot-Level {SHOP_RARITY_MIN_LEVEL[item.rarity]} erforderlich</span>
                : !prerequisiteMet
                  ? <span className="text-slate-500 text-xs font-bold shrink-0">🔒 Vorstufe</span>
                : <button onClick={() => canAfford && requestPurchase(item.name, item.cost, () => onBuy(item.id))} disabled={!canAfford}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: "rgba(80,50,0,0.6)", border: "1px solid #aa8800", color: "#ffcc44" }}>
                    💰 {item.cost.toLocaleString("de-DE")}
                  </button>
              }
            </div>
          );
        })}
      </div>
      </>)}
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
    { icon: "🎯", title: "Dein Auftrag", text: "Steuere deinen Jet durch automatisch scrollende, immer schwierigere Sektoren. Weiche Feinden und Geschossen aus, schieße Gegner ab und sammle möglichst viele Punkte. Mit deiner Punktzahl steigt auch dein Pilot-Level; Bosskämpfe markieren die großen Etappen eines Einsatzes." },
    { icon: "❤", title: "Überleben", text: "Jeder gegnerische Treffer zieht dir HP ab. Fallen deine HP auf null, verlierst du ein Leben und kehrst mit voller Energie zurück. Nach dem letzten Leben ist der Einsatz beendet. Ein aktiver Schild fängt Schaden zuerst ab – Ausweichen bleibt trotzdem die sicherste Taktik." },
    { icon: "📦", title: "Power-ups", text: "Zerstörte Gegner können nützliche Pick-ups hinterlassen: Heilung stellt HP wieder her, Schilde geben zusätzlichen Schutz und Tempo-Boosts machen deinen Jet vorübergehend schneller. Berühre ein Symbol mit deinem Jet, bevor es vom Bildschirm verschwindet." },
    { icon: "⚡", title: "Waffen & Fähigkeiten", text: "Halte die Feuertaste gedrückt oder aktiviere optional Auto-Fire in den Einstellungen. Vor dem Start rüstest du höchstens zwei Spezialfähigkeiten aus; sobald eine Anzeige voll ist, aktivierst du sie mit der eingeblendeten Taste oder dem Touch-Knopf." },
    { icon: "⬆", title: "Fortschritt", text: "Nach abgeschlossenen Sektoren pausiert das Gefecht und du wählst eines von drei Upgrades für den aktuellen Lauf. Diese Boni gelten bis zum Missionsende. Checkpoints speichern Level, Punktzahl und Waffenstufe, sodass du einen unterbrochenen Einsatz später über „Weiterspielen“ fortsetzen kannst." },
    { icon: "💎", title: "Credits, Juwelen & Hangar", text: "Nach dem Missionsende wird jeder erzielte Punkt in einen Credit umgewandelt. Zusätzlich erhältst du je 100 Einsatz-Credits ein Juwel. Flugzeug- und Drohnen-Level bezahlst du mit Juwelen; Skins und weitere Shopartikel weiterhin mit Credits." },
  ] : language === "tr" ? [
    { icon: "🎯", title: "Görevin", text: "Uçağını giderek zorlaşan ve otomatik kayan sektörlerde yönlendir. Düşmanlardan ve mermilerden kaç, hedefleri vur ve mümkün olduğunca çok puan topla. Puanın arttıkça pilot seviyen yükselir; bölüm sonu savaşları görevin büyük aşamalarını belirler." },
    { icon: "❤", title: "Hayatta kalma", text: "Her düşman isabeti HP'ni azaltır. HP sıfıra düştüğünde bir can kaybeder ve tam enerjiyle geri dönersin. Son canından sonra görev biter. Aktif kalkan önce hasarı emer, ancak kaçınmak hâlâ en güvenli taktiktir." },
    { icon: "📦", title: "Güçlendirmeler", text: "Yok edilen düşmanlar yararlı güçlendirmeler bırakabilir: sağlık HP'ni yeniler, kalkanlar ek koruma sağlar ve hız takviyeleri uçağını geçici olarak hızlandırır. Simgeler ekrandan çıkmadan önce uçağınla onlara dokun." },
    { icon: "⚡", title: "Silahlar ve özel yetenekler", text: "Kesintisiz ateş etmek için ateş kontrolünü basılı tut. Savaş sırasında uçağına özel 10 saniyelik yetenek ile lazer, gizlilik ve iyileştirme dolar. Gösterge dolduğunda ekrandaki tuşla yeteneği etkinleştir." },
    { icon: "⬆", title: "İlerleme", text: "Sektörleri tamamladıktan sonra savaş durur ve mevcut görev için üç geliştirmeden birini seçersin. Bu bonuslar görev sonuna kadar geçerlidir. Kontrol noktaları seviyeni, puanını ve silah kademeni kaydeder; böylece göreve daha sonra Devam Et ile dönebilirsin." },
    { icon: "💎", title: "Krediler, mücevherler ve hangar", text: "Görev sonunda her puan bir krediye dönüşür ve her 100 görev kredisi için bir mücevher kazanırsın. Uçak ve drone seviyeleri mücevherlerle; görünümler ve diğer mağaza ürünleri kredilerle alınır." },
  ] : [
    { icon: "🎯", title: "Your mission", text: "Pilot your jet through automatically scrolling sectors that become progressively harder. Dodge enemies and projectiles, shoot down targets, and score as many points as possible. Your pilot level rises with your score, while boss fights mark the major milestones of a mission." },
    { icon: "❤", title: "Survival", text: "Every enemy hit reduces your HP. When HP reaches zero, you lose a life and return at full health. The mission ends after your final life. An active shield absorbs damage first, but dodging remains your safest tactic." },
    { icon: "📦", title: "Power-ups", text: "Destroyed enemies may leave useful pick-ups behind: health restores HP, shields provide extra protection, and speed boosts temporarily make your jet faster. Touch an icon with your jet before it leaves the screen." },
    { icon: "⚡", title: "Weapons & abilities", text: "Hold the fire control or optionally enable auto-fire in Settings. Equip up to two special abilities before launch; once a meter is full, activate it with the displayed key or touch button." },
    { icon: "⬆", title: "Progress", text: "After clearing sectors, combat pauses and you choose one of three upgrades for the current run. These bonuses last until the mission ends. Checkpoints save your level, score, and weapon tier so you can resume an interrupted mission later with Continue." },
    { icon: "💎", title: "Credits, gems & hangar", text: "At the end of a mission, every point becomes one credit, and every 100 mission credits also earn one gem. Aircraft and drone levels cost gems; skins and other shop items continue to cost credits." },
  ];
  const keyboardHelp = language === "de" ? [
    ["WASD / Pfeile", "Bewegen"],
    ["AUTO", "Dauerfeuer"],
    ["1", "Fähigkeit 1"],
    ["2", "Fähigkeit 2"],
    ["ESC", "Pause"],
  ] as const : language === "tr" ? [
    ["WASD / Oklar", "Hareket"],
    ["AUTO", "Otomatik ateş"],
    ["1", "Yetenek 1"],
    ["2", "Yetenek 2"],
    ["ESC", "Duraklat"],
  ] as const : [
    ["WASD / Arrows", "Move"],
    ["AUTO", "Auto-fire"],
    ["1", "Ability 1"],
    ["2", "Ability 2"],
    ["ESC", "Pause"],
  ] as const;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-5 text-white sm:px-7">
      <div className="mx-auto w-full max-w-4xl">
        <div className="text-center">
          <div className="text-xs font-black uppercase tracking-[.3em] text-cyan-400">{translated(language, "Einsatzbriefing", "Mission briefing")}</div>
          <h2 className="mt-1 text-2xl font-black sm:text-3xl">{translated(language, "SO FUNKTIONIERT FIGHTER COMMAND", "HOW FIGHTER COMMAND WORKS")}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{translated(language, "Dein Ziel ist einfach: so lange wie möglich überleben, Gegner ausschalten und deinen Jet während des Einsatzes immer stärker machen. Lies das Briefing einmal durch – danach übst du Bewegung und Schießen direkt in deiner ersten Mission.", "Your objective is simple: survive as long as possible, destroy enemies, and make your jet stronger throughout the mission. Read this briefing once—then practice movement and shooting during your first deployment.")}</p>
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
              <p><strong className="text-white">{translated(language, "Links ziehen:", "Drag left:")}</strong> {translated(language, "Der Jet folgt deinem Finger direkt.", "The jet follows your finger directly.")}</p>
              <p><strong className="text-white">AUTO-FIRE:</strong> Optional in den Einstellungen aktivierbar.</p>
              <p><strong className="text-white">FÄHIGKEIT 1 · 2:</strong> Die zwei ausgerüsteten Knöpfe antippen, sobald sie bereit sind.</p>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-800/80 bg-[#040c1c] pt-4 pb-1 text-center">
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
  const toggle = (key: "tutorial" | "reducedMotion" | "highContrast" | "autoFire") => onChange({ ...settings, [key]: !settings[key] });
  const updateBinding = (action: KeyBindingAction, code: string) => {
    onChange({ ...settings, keyBindings: { ...settings.keyBindings, [action]: code } });
  };
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
            <option value="de">Deutsch</option><option value="en">English</option><option value="tr">Türkçe</option><option value="fr">Français</option><option value="es">Español</option>
          </select>
        </label>
        <SettingToggle label={translated(language, "Einführung anzeigen", "Show tutorial")} description={translated(language, "Erklärt Bewegung und Schießen beim ersten Start.", "Explains movement and shooting on the first start.")} checked={settings.tutorial} onClick={() => toggle("tutorial")} />
        <SettingToggle label="Automatisches Dauerfeuer" description="Der Jet schießt selbstständig; FIRE bleibt optional." checked={settings.autoFire} onClick={() => toggle("autoFire")} />
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
      <div className="text-slate-500 text-xs uppercase tracking-widest">Tastaturbelegung</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <KeyBindingSetting label="Nach oben" value={settings.keyBindings.up} onChange={value => updateBinding("up", value)} />
        <KeyBindingSetting label="Nach unten" value={settings.keyBindings.down} onChange={value => updateBinding("down", value)} />
        <KeyBindingSetting label="Nach links" value={settings.keyBindings.left} onChange={value => updateBinding("left", value)} />
        <KeyBindingSetting label="Nach rechts" value={settings.keyBindings.right} onChange={value => updateBinding("right", value)} />
        <KeyBindingSetting label="Feuern" value={settings.keyBindings.fire} onChange={value => updateBinding("fire", value)} />
        <KeyBindingSetting label="Pause" value={settings.keyBindings.pause} onChange={value => updateBinding("pause", value)} />
        <KeyBindingSetting label="Fähigkeit 1" value={settings.keyBindings.ability1} onChange={value => updateBinding("ability1", value)} />
        <KeyBindingSetting label="Fähigkeit 2" value={settings.keyBindings.ability2} onChange={value => updateBinding("ability2", value)} />
        <KeyBindingSetting label="Fähigkeit 3" value={settings.keyBindings.ability3} onChange={value => updateBinding("ability3", value)} />
      </div>
      <div className="text-slate-500 text-xs uppercase tracking-widest mt-2">Gamepad & Touch</div>
      <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
        <div><strong className="text-white">Gamepad:</strong> linker Stick bewegt, A/RT feuert, LB/RB/LT nutzt Fähigkeit 1/2/3, Menü pausiert.</div>
        <div className="mt-1"><strong className="text-white">Touch:</strong> links ziehen zum Bewegen; die drei großen Fähigkeitsknöpfe rechts antippen.</div>
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

const KEY_BINDING_OPTIONS = [
  "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Space", "KeyQ", "KeyE", "KeyR", "KeyF", "KeyH", "KeyP", "Digit1", "Digit2", "Digit3", "Escape",
] as const;

function KeyBindingSetting({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
      <span className="text-sm font-bold text-slate-200">{label}</span>
      <select aria-label={`${label} belegen`} value={value} onChange={event => onChange(event.target.value)} className="min-h-10 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-black text-cyan-200">
        {!KEY_BINDING_OPTIONS.includes(value as typeof KEY_BINDING_OPTIONS[number]) && <option value={value}>{formatKeyCode(value)}</option>}
        {KEY_BINDING_OPTIONS.map(code => <option key={code} value={code}>{formatKeyCode(code)}</option>)}
      </select>
    </label>
  );
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

const FIRE_BTN_R = 46;
const FIRE_BTN_X = CANVAS_W - 80;
const FIRE_BTN_Y = CANVAS_H - 90;
const ULTI_BTN_R = 36;
const ULTI_MAX = 300;
const ULTI_DURATION = 600;
const LASER_MAX = 520;
const LASER_DURATION = 600;
const LASER_BTN_R = 36;
const STEALTH_MAX = 520;
const STEALTH_DURATION = 600;
const POISON_MISSILE_MAX = STEALTH_MAX;
const POISON_MISSILE_DIRECT_DAMAGE = 20;
const POISON_MISSILE_SPEED = 10.5;
const POISON_DURATION = 300;
const POISON_TICK_INTERVAL = 60;
const POISON_TICK_DAMAGE = 3;
const POISON_MISSILE_BTN_R = 36;
const ABSORBER_MAX = ULTI_MAX;
const ABSORBER_DURATION = 600;
const ABSORBER_CHARGE_RATE = 0.045;
const ABSORBER_SHIELD_WIDTH = 24;
const ABSORBER_SHIELD_PADDING = 5;
const ABSORBER_SHIELD_FORWARD_OFFSET = 5;
const BACKGROUND_SPEED_MULTIPLIER = 2;
const ABSORBER_BTN_R = 36;
const STEALTH_BTN_R = 36;
const HEAL_MAX = 520;
const HEAL_DURATION = 120;
const HEAL_BTN_R = 36;
const ULTIMATE_MAX = STEALTH_MAX;
const ULTIMATE_DURATION = 600;
const ULTIMATE_CHARGE_RATE = 0.05;
const ULTIMATE_DOT_INTERVAL = 60;
const ULTIMATE_DOT_DAMAGE = 8;
const ULTIMATE_HEAL = 3;
const ULTIMATE_SLOW_FACTOR = 0.45;
const ULTIMATE_BTN_R = 38;

const ULTI_SLOT_POSITIONS: readonly [number, number][] = [
  [CANVAS_W - 420, CANVAS_H - 195],
  [CANVAS_W - 340, CANVAS_H - 195],
  [CANVAS_W - 210, CANVAS_H - 195],
  [CANVAS_W - 340, CANVAS_H - 90],
  [CANVAS_W - 210, CANVAS_H - 90],
];

function getUltiButtonPosition(loadout: UltiLoadoutId[], id: UltiLoadoutId): [number, number] | null {
  return ULTI_SLOT_POSITIONS[loadout.indexOf(id)] ?? null;
}

type ActiveUltiCountdown = { key: string; remaining: number; color: string };

function drawActiveUltiCountdowns(
  ctx: CanvasRenderingContext2D,
  playerX: number,
  playerY: number,
  ultis: ActiveUltiCountdown[],
) {
  const active = ultis.filter(ulti => ulti.remaining > 0);
  if (active.length === 0) return;

  const text = active
    .map(ulti => active.length === 1 ? `${Math.ceil(ulti.remaining / 60)}` : `${ulti.key} ${Math.ceil(ulti.remaining / 60)}`)
    .join("  ·  ");
  const centerX = playerX + PLAYER_W / 2;
  const centerY = Math.max(98, playerY - 12);

  ctx.save();
  ctx.font = "900 18px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const width = ctx.measureText(text).width + 18;

  ctx.fillStyle = "rgba(2, 7, 18, 0.84)";
  ctx.strokeStyle = active.length === 1 ? active[0].color : "#ffffffaa";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(centerX - width / 2, centerY - 14, width, 28, 9);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = active.length === 1 ? active[0].color : "#ffffff";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, centerX, centerY + 1);
  ctx.restore();
}

function drawVirtualControls(
  ctx: CanvasRenderingContext2D,
  fireActive: boolean,
  autoFire: boolean,
  ultimaCharge: number,
  ultimaActive: number,
  laserCharge: number,
  laserActive: number,
  stealthCharge: number,
  stealthActive: number,
  healCharge: number,
  healActive: number,
  poisonMissileCharge: number,
  absorberCharge: number,
  absorberActive: number,
  absorberHits: number,
  ultimateCharge: number,
  ultimateActive: number,
  unlocks: string[],
  ultiLoadout: UltiLoadoutId[],
) {
  ctx.save();
  ctx.globalAlpha = 0.45;
  const position = (id: UltiLoadoutId) => getUltiButtonPosition(ultiLoadout, id) ?? [0, 0];
  const [ultiX, ultiY] = position("jet");
  const [laserX, laserY] = position("laser");
  const [stealthX, stealthY] = position("stealth_ulti");
  const [healX, healY] = position("heal_ulti");
  const [poisonX, poisonY] = position("poison_missiles_ulti");
  const [absorberX, absorberY] = position("absorber_ulti");
  const [ultimateX, ultimateY] = position("ultimate_ulti");

  // ── Fire button (right zone) ──
  if (!autoFire) {
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
  }

  // ── ULTI button ──
  if (ultiLoadout.includes("jet")) {
  const ultiReady = ultimaCharge >= ULTI_MAX && ultimaActive === 0;
  const ultiGlow = ultiReady ? (0.55 + 0.45 * Math.sin(Date.now() / 200)) : 0.45;
  ctx.globalAlpha = ultiGlow;
  ctx.beginPath();
  ctx.arc(ultiX, ultiY, ULTI_BTN_R, 0, Math.PI * 2);
  ctx.fillStyle   = ultimaActive > 0 ? "#ff00ff55" : ultiReady ? "#cc00ff44" : "#44004422";
  ctx.strokeStyle = ultimaActive > 0 ? "#ff00ffcc" : ultiReady ? "#cc00ffcc" : "#88008866";
  ctx.lineWidth = 2.5;
  ctx.fill(); ctx.stroke();

  // Charge arc
  if (ultimaActive === 0 && ultimaCharge < ULTI_MAX) {
    const pct = ultimaCharge / ULTI_MAX;
    ctx.beginPath();
    ctx.arc(ultiX, ultiY, ULTI_BTN_R - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.strokeStyle = "#aa00ff";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.globalAlpha = ultiReady ? 0.95 : 0.55;
  ctx.fillStyle = ultiReady ? "#ff00ff" : "#cc88cc";
  ctx.font = `bold ${ultiReady ? 12 : 10}px 'Inter', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ultimaActive > 0 ? `${Math.ceil(ultimaActive / 60)}s` : "ULTI", ultiX, ultiY);
  }

  // ── LASER button ──
  if (ultiLoadout.includes("laser")) {
  const laserReady = laserCharge >= LASER_MAX && laserActive === 0;
  const laserGlow = laserReady ? (0.55 + 0.45 * Math.sin(Date.now() / 180)) : 0.45;
  ctx.globalAlpha = laserGlow;
  ctx.beginPath();
  ctx.arc(laserX, laserY, LASER_BTN_R, 0, Math.PI * 2);
  ctx.fillStyle   = laserActive > 0 ? "#ff880055" : laserReady ? "#ff660044" : "#44110022";
  ctx.strokeStyle = laserActive > 0 ? "#ffaa00cc" : laserReady ? "#ff8800cc" : "#88440066";
  ctx.lineWidth = 2.5;
  ctx.fill(); ctx.stroke();

  if (laserActive === 0 && laserCharge < LASER_MAX) {
    const lp = laserCharge / LASER_MAX;
    ctx.beginPath();
    ctx.arc(laserX, laserY, LASER_BTN_R - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lp);
    ctx.strokeStyle = "#ff6600"; ctx.lineWidth = 4; ctx.stroke();
  }

  ctx.globalAlpha = laserReady ? 0.95 : 0.55;
  ctx.fillStyle = laserReady ? "#ffaa00" : "#cc8844";
  ctx.font = `bold ${laserReady ? 11 : 9}px 'Inter', sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(laserActive > 0 ? `${Math.ceil(laserActive / 60)}s` : "LASER", laserX, laserY);
  }

  // ── STEALTH button ──
  if (unlocks.includes("absorber_ulti") && ultiLoadout.includes("absorber_ulti")) {
    const ready = absorberCharge >= ABSORBER_MAX && absorberActive === 0;
    ctx.globalAlpha = ready ? 0.95 : 0.48;
    ctx.beginPath(); ctx.arc(absorberX, absorberY, ABSORBER_BTN_R, 0, Math.PI * 2);
    ctx.fillStyle = absorberActive > 0 ? "#ff35c477" : ready ? "#ff55cf44" : "#3c082f33";
    ctx.strokeStyle = ready || absorberActive > 0 ? "#ff79df" : "#7c2968";
    ctx.lineWidth = 3; ctx.fill(); ctx.stroke();
    if (absorberActive === 0 && !ready) {
      ctx.beginPath();
      ctx.arc(absorberX, absorberY, ABSORBER_BTN_R - 4, -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * absorberCharge / ABSORBER_MAX);
      ctx.strokeStyle = "#ff55cf"; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.fillStyle = "#ffd0f4"; ctx.font = "bold 9px 'Inter', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(absorberActive > 0 ? `${Math.ceil(absorberActive / 60)}s` : "ABS", absorberX, absorberY);
  }

  // ── STEALTH button ──
  if (unlocks.includes("stealth_ulti") && ultiLoadout.includes("stealth_ulti")) {
    const stealthReady = stealthCharge >= STEALTH_MAX && stealthActive === 0;
    const stealthGlow = stealthReady ? (0.55 + 0.45 * Math.sin(Date.now() / 160)) : 0.45;
    ctx.globalAlpha = stealthGlow;
    ctx.beginPath();
    ctx.arc(stealthX, stealthY, STEALTH_BTN_R, 0, Math.PI * 2);
    ctx.fillStyle   = stealthActive > 0 ? "#00ffff33" : stealthReady ? "#00ddcc44" : "#00222222";
    ctx.strokeStyle = stealthActive > 0 ? "#00ffffcc" : stealthReady ? "#00ddcccc" : "#00888866";
    ctx.lineWidth = 2.5;
    ctx.fill(); ctx.stroke();

  if (stealthActive === 0 && stealthCharge < STEALTH_MAX) {
    const sp = stealthCharge / STEALTH_MAX;
    ctx.beginPath();
    ctx.arc(stealthX, stealthY, STEALTH_BTN_R - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sp);
    ctx.strokeStyle = "#00ccbb"; ctx.lineWidth = 4; ctx.stroke();
  }

  ctx.globalAlpha = stealthReady ? 0.95 : 0.55;
  ctx.fillStyle = stealthActive > 0 ? "#00ffff" : stealthReady ? "#00ddcc" : "#339988";
  ctx.font = `bold ${stealthReady ? 10 : 9}px 'Inter', sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(stealthActive > 0 ? `${Math.ceil(stealthActive / 60)}s` : "STEALTH", stealthX, stealthY);
  }

  // ── HEAL button ──
  if (unlocks.includes("heal_ulti") && ultiLoadout.includes("heal_ulti")) {
    const healReady = healCharge >= HEAL_MAX && healActive === 0;
    const healGlowA = healReady ? (0.55 + 0.45 * Math.sin(Date.now() / 160)) : 0.45;
    ctx.globalAlpha = healGlowA;
    ctx.beginPath();
    ctx.arc(healX, healY, HEAL_BTN_R, 0, Math.PI * 2);
    ctx.fillStyle   = healActive > 0 ? "#ff006633" : healReady ? "#ff224444" : "#220a0a22";
    ctx.strokeStyle = healActive > 0 ? "#ff0066cc" : healReady ? "#ff2244cc" : "#88222266";
    ctx.lineWidth = 2.5;
    ctx.fill(); ctx.stroke();

  if (healActive === 0 && healCharge < HEAL_MAX) {
    const hp2 = healCharge / HEAL_MAX;
    ctx.beginPath();
    ctx.arc(healX, healY, HEAL_BTN_R - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hp2);
    ctx.strokeStyle = "#ff4466"; ctx.lineWidth = 4; ctx.stroke();
  }

  if (unlocks.includes("poison_missiles_ulti") && ultiLoadout.includes("poison_missiles_ulti")) {
    const ready = poisonMissileCharge >= POISON_MISSILE_MAX;
    ctx.globalAlpha = ready ? 0.9 : 0.45;
    ctx.beginPath(); ctx.arc(poisonX, poisonY, POISON_MISSILE_BTN_R, 0, Math.PI * 2);
    ctx.fillStyle = ready ? "#7a101066" : "#24060644";
    ctx.strokeStyle = ready ? "#ff3030" : "#782020";
    ctx.lineWidth = 2.5; ctx.fill(); ctx.stroke();
    if (!ready) {
      ctx.beginPath();
      ctx.arc(poisonX, poisonY, POISON_MISSILE_BTN_R - 4, -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * poisonMissileCharge / POISON_MISSILE_MAX);
      ctx.strokeStyle = "#ff3030"; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.globalAlpha = ready ? 1 : 0.6; ctx.fillStyle = "#ff6868"; ctx.font = "bold 10px 'Inter', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("GIFT", poisonX, poisonY);
  }

  if (unlocks.includes("ultimate_ulti") && ultiLoadout.includes("ultimate_ulti")) {
    const ready = ultimateCharge >= ULTIMATE_MAX && ultimateActive === 0;
    ctx.globalAlpha = ready ? 0.9 : 0.5;
    ctx.beginPath(); ctx.arc(ultimateX, ultimateY, ULTIMATE_BTN_R, 0, Math.PI * 2);
    ctx.fillStyle = ultimateActive > 0 ? "#0088ff88" : "#001b4433";
    ctx.strokeStyle = ready || ultimateActive > 0 ? "#45d8ff" : "#17608a";
    ctx.lineWidth = 3; ctx.fill(); ctx.stroke();
    if (ultimateActive === 0 && ultimateCharge < ULTIMATE_MAX) {
      ctx.beginPath();
      ctx.arc(ultimateX, ultimateY, ULTIMATE_BTN_R - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ultimateCharge / ULTIMATE_MAX);
      ctx.strokeStyle = "#22aaff"; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.fillStyle = "#8eeaff"; ctx.font = "bold 10px 'Inter', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(ultimateActive > 0 ? `${Math.ceil(ultimateActive / 60)}s` : "ULTIMATE", ultimateX, ultimateY);
  }

  ctx.globalAlpha = healReady ? 0.95 : 0.55;
  ctx.fillStyle = healActive > 0 ? "#ff6699" : healReady ? "#ff4466" : "#884455";
  ctx.font = `bold ${healReady ? 10 : 9}px 'Inter', sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(healActive > 0 ? `${Math.ceil(healActive / 60)}s` : "HEAL ❤", healX, healY);
  }

  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, gs: GameState, ultimaCharge: number, ultimaActive: number, laserCharge: number, laserActive: number, stealthCharge: number, stealthActive: number, healCharge: number, healActive: number, poisonMissileCharge: number, absorberCharge: number, absorberActive: number, absorberHits: number, ultimateCharge: number, ultimateActive: number, bestScore: number, pilotLevel: number, unlocks: string[], ultiLoadout: UltiLoadoutId[], abilityKeys: [string, string, string], mode: GameMode, elapsedMs: number) {
  ctx.save();
  ctx.textBaseline = "top";

  // Top bar background
  ctx.fillStyle = "rgba(4,10,24,0.72)";
  ctx.fillRect(0, 0, CANVAS_W, 86);

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
  const modeRules = getEffectiveGameModeRules(mode);
  const remaining = modeRules.durationSeconds === null ? null : Math.max(0, modeRules.durationSeconds - Math.floor(elapsedMs / 1000));
  ctx.fillStyle = "#a78bfa";
  ctx.font = "bold 10px 'Inter', sans-serif";
  const timerText = remaining === null ? "" : ` · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  ctx.fillText(`${modeRules.icon} ${modeRules.label.toUpperCase()}${timerText}`, CANVAS_W / 2, 48);

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
  ctx.fillStyle = "#67e8f9";
  ctx.font = "bold 10px 'Inter', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`PILOT-LEVEL ${pilotLevel}`, CANVAS_W - 8, 52);

  const drawUltBar = (
    label: string, key: string,
    charge: number, maxCharge: number, active: number, duration: number,
    x: number, y: number, w: number, h: number,
    activeColors: [string, string], chargeColors: [string, string], labelColor: string,
  ) => {
    const pct = Math.min(1, charge / maxCharge);
    const ready = pct >= 1 && active === 0;
    const barX = x + 56;
    ctx.textAlign = "left"; ctx.font = "bold 9px 'Inter', sans-serif";
    ctx.fillStyle = ready ? labelColor : active > 0 ? labelColor + "cc" : "#556";
    ctx.fillText(label, x, y);
    ctx.fillStyle = "#111"; ctx.fillRect(barX, y, w, h);
    if (active > 0) {
      const ap = active / duration;
      const ag = ctx.createLinearGradient(barX, 0, barX + w, 0);
      ag.addColorStop(0, activeColors[0]); ag.addColorStop(1, activeColors[1]);
      ctx.fillStyle = ag; ctx.fillRect(barX, y, w * ap, h);
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 120);
      ctx.fillStyle = labelColor; ctx.font = "bold 8px 'Inter', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("ACTIVE", barX + w, y);
      ctx.globalAlpha = 1;
    } else if (pct > 0) {
      const cg = ctx.createLinearGradient(barX, 0, barX + w, 0);
      cg.addColorStop(0, chargeColors[0]); cg.addColorStop(1, chargeColors[1]);
      ctx.fillStyle = cg; ctx.fillRect(barX, y, w * pct, h);
      if (ready) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 200);
        ctx.fillStyle = labelColor; ctx.font = "bold 8px 'Inter', sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`${key} READY`, barX + w, y);
        ctx.globalAlpha = 1;
      }
    }
  };

  const multiplier = absorberHits > 0 ? Math.pow(2, absorberHits) : 1;
  const hudUltis: Record<UltiLoadoutId, Parameters<typeof drawUltBar> extends never ? never : {
    label: string; key: string; charge: number; max: number; active: number; duration: number;
    activeColors: [string, string]; chargeColors: [string, string]; color: string;
  }> = {
    jet: { label: "JET ULTI", key: "Q", charge: ultimaCharge, max: ULTI_MAX, active: ultimaActive, duration: ULTI_DURATION, activeColors: ["#ff00ff","#8800ff"], chargeColors: ["#6600bb","#cc00ff"], color: "#ff44ff" },
    laser: { label: "LASER", key: "E", charge: laserCharge, max: LASER_MAX, active: laserActive, duration: LASER_DURATION, activeColors: ["#ff8800","#ffdd00"], chargeColors: ["#cc4400","#ff8800"], color: "#ffaa22" },
    stealth_ulti: { label: "STEALTH", key: "R", charge: stealthCharge, max: STEALTH_MAX, active: stealthActive, duration: STEALTH_DURATION, activeColors: ["#00ffee","#0088ff"], chargeColors: ["#004488","#00aacc"], color: "#00ddcc" },
    heal_ulti: { label: "HEAL", key: "H", charge: healCharge, max: HEAL_MAX, active: healActive, duration: HEAL_DURATION, activeColors: ["#ff6699","#ff0044"], chargeColors: ["#aa2233","#ff3366"], color: "#ff4466" },
    poison_missiles_ulti: { label: "GIFT", key: "T", charge: poisonMissileCharge, max: POISON_MISSILE_MAX, active: 0, duration: 1, activeColors: ["#ff3030","#8b0000"], chargeColors: ["#681010","#ff3030"], color: "#ff4040" },
    absorber_ulti: { label: `ABS ${multiplier}×`, key: "F", charge: absorberCharge, max: ABSORBER_MAX, active: absorberActive, duration: ABSORBER_DURATION, activeColors: ["#ff8bea","#ff2dbd"], chargeColors: ["#7a145f","#ff55cf"], color: "#ff72dc" },
    ultimate_ulti: { label: "OMEGA", key: "U", charge: ultimateCharge, max: ULTIMATE_MAX, active: ultimateActive, duration: ULTIMATE_DURATION, activeColors: ["#55e8ff","#087cff"], chargeColors: ["#075080","#28c8ff"], color: "#62ddff" },
  };
  ultiLoadout.forEach((id, slot) => {
    const item = hudUltis[id];
    if (!item || (id !== "jet" && id !== "laser" && !unlocks.includes(id))) return;
    const column = Math.floor(slot / 3);
    const row = slot % 3;
    drawUltBar(`${slot + 1} ${item.label}`, abilityKeys[slot] ?? item.key, item.charge, item.max, item.active, item.duration,
      16 + column * 190, 47 + row * 10, 108, 5, item.activeColors, item.chargeColors, item.color);
  });

  ctx.restore();
}
