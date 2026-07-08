export interface LifeState {
  hp: number;
  maxHp: number;
  lives: number;
  gameOver: boolean;
}

export interface EnemyDamageState {
  hp: number;
  shieldHp?: number;
}

export interface EnemyDamageResult extends Required<EnemyDamageState> {
  absorbedByShield: boolean;
  destroyed: boolean;
}

export interface PlayerHitProtectionState {
  shieldTimer: number;
  shieldHp: number;
  invincibleTimer: number;
  stealthTimer: number;
}

export interface PlayerHitProtectionResult {
  protected: boolean;
  shieldTimer: number;
  shieldHp: number;
}

export const MAX_LEVEL = 500;
export const PLAYER_SHIELD_HP = 5;
export const COIN_REWARD_MULTIPLIER = 5;
export const HEAL_ULTI_RESTORE = 5;
export const KEYBOARD_CONTROL_HELP = [
  ["WASD / Pfeiltasten", "Bewegen"],
  ["LEERTASTE", "Schießen"],
  ["Q", "Clone-Ulti"],
  ["E", "Laser-Ulti"],
  ["R", "Stealth-Ulti"],
  ["H", "Heil-Ulti"],
  ["P", "Pause"],
] as const;
export const MOBILE_CONTROL_HELP = [
  "Linke Seite -> Joystick (Bewegen)",
  "FIRE -> Schießen",
  "CLONE -> Clone-Ulti (Q)",
  "LASER -> Laser-Ulti (E)",
  "STEALTH -> Stealth-Ulti (R)",
  "HEAL -> Heil-Ulti (H)",
] as const;
const EARLY_MILESTONE_BOSS_LEVELS = new Set([3, 5, 8, 10, 12, 15, 18]);
const BASE_LEVEL_THRESHOLDS = [
  0, 150, 350, 600, 900, 1300, 1800, 2400, 3100, 4000,
  5100, 6400, 7900, 9600, 11500, 13700, 16200, 19000, 22200, 25800,
  29800, 34200, 38900, 43900, 49300, 55100, 61300, 67900, 74900, 82400,
  90400, 99000, 108000, 117500, 127500, 138000, 149000, 160500, 172500, 185000,
  198000, 212000, 226500, 241500, 257000, 273000, 289500, 306500, 324000, 342000,
  365000, 390000, 417000, 446000, 477000, 510000, 546000, 584000, 624000, 667000,
  713000, 762000, 814000, 870000, 930000, 994000, 1062000, 1136000, 1215000, 1300000,
  1390000, 1487000, 1590000, 1700000, 1817000, 1942000, 2076000, 2218000, 2370000, 2530000,
  2705000, 2892000, 3090000, 3305000, 3535000, 3782000, 4047000, 4330000, 4630000, 4955000,
  5300000, 5672000, 6069000, 6494000, 6949000, 7435000, 7955000, 8512000, 9108000, 9748000,
];

export function getLevelThreshold(level: number): number {
  const clampedLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));

  if (clampedLevel <= BASE_LEVEL_THRESHOLDS.length) {
    return BASE_LEVEL_THRESHOLDS[clampedLevel - 1];
  }

  const previous = BASE_LEVEL_THRESHOLDS[BASE_LEVEL_THRESHOLDS.length - 1];
  const span = clampedLevel - BASE_LEVEL_THRESHOLDS.length;
  return previous + Math.round(70000 * span + 2800 * span * span);
}

export function getLevelForScore(score: number): number {
  let level = 1;

  for (let candidate = 2; candidate <= MAX_LEVEL; candidate++) {
    if (score < getLevelThreshold(candidate)) break;
    level = candidate;
  }

  return level;
}

export function isBossEligibleLevel(level: number): boolean {
  return level < 20 || level % 5 === 0;
}

export function isMilestoneBossLevel(level: number): boolean {
  return EARLY_MILESTONE_BOSS_LEVELS.has(level) || (level >= 20 && level % 5 === 0);
}

export function calculateCoinReward(score: number): number {
  return Math.max(0, Math.floor(score * COIN_REWARD_MULTIPLIER));
}

export function formatLockedSkinPrice(cost: number): string {
  return `${Math.round(cost / 1000)}k`;
}

export function shouldShowVirtualControls(hasTouch: boolean, hasCoarsePointer: boolean): boolean {
  return hasTouch || hasCoarsePointer;
}

export function applyEnemyDamage(state: EnemyDamageState, damage: number): EnemyDamageResult {
  const shieldHp = Math.max(0, state.shieldHp ?? 0);

  if (shieldHp > 0) {
    return {
      hp: state.hp,
      shieldHp: shieldHp - 1,
      absorbedByShield: true,
      destroyed: false,
    };
  }

  const hp = Math.max(0, state.hp - damage);
  return {
    hp,
    shieldHp: 0,
    absorbedByShield: false,
    destroyed: hp <= 0,
  };
}

export function applyPlayerHitProtection(state: PlayerHitProtectionState): PlayerHitProtectionResult {
  if (state.stealthTimer > 0 || state.invincibleTimer > 0) {
    return {
      protected: true,
      shieldTimer: state.shieldTimer,
      shieldHp: state.shieldHp,
    };
  }

  if (state.shieldTimer > 0 && state.shieldHp > 0) {
    const shieldHp = Math.max(0, state.shieldHp - 1);

    return {
      protected: true,
      shieldTimer: shieldHp > 0 ? state.shieldTimer : 0,
      shieldHp,
    };
  }

  return {
    protected: false,
    shieldTimer: 0,
    shieldHp: 0,
  };
}

export function applyPlayerDamage(state: LifeState, damage: number): LifeState {
  const hp = Math.max(0, state.hp - damage);

  if (hp > 0) {
    return { ...state, hp };
  }

  const lives = Math.max(0, state.lives - 1);

  if (lives > 0) {
    return {
      ...state,
      hp: state.maxHp,
      lives,
      gameOver: false,
    };
  }

  return {
    ...state,
    hp: 0,
    lives,
    gameOver: true,
  };
}
