import assert from "node:assert/strict";
import {
  applyEnemyDamage,
  applyPlayerHitProtection,
  applyPlayerDamage,
  calculateCoinReward,
  formatLockedSkinPrice,
  getCrossedMilestoneLevels,
  getBackgroundMusicTheme,
  getLevelForScore,
  getProgressedLevel,
  getPilotLevelForScore,
  getPilotLevelThreshold,
  getLevelThreshold,
  getDroneStats,
  getDroneUpgradeCost,
  getAircraftUpgradeCost,
  getAircraftUpgradeStats,
  getEnemySpawnRate,
  getEnemyAttackTarget,
  getNormalBossDamage,
  GAME_MODES,
  getGameModeRules,
  getModeCoinMultiplier,
  getDailyChallengeRules,
  HEAL_ULTI_RESTORE,
  KEYBOARD_CONTROL_HELP,
  isBossEligibleLevel,
  isLaserDeviceEligibleLevel,
  isMilestoneBossLevel,
  isTitanBossLevel,
  MOBILE_CONTROL_HELP,
  PLAYER_SHIELD_HP,
  shouldUseAboveCloudsBackground,
  shouldUseCityBackground,
  shouldUseSpaceBackground,
  shouldShowVirtualControls,
  selectEnemyVariant,
  type EnemyDamageState,
  type LifeState,
} from "./game-rules";
import {
  SECTOR_CHOICES,
  formatRunDuration,
  getBossPhase,
  getMutatorForLevel,
  getUpgradeSynergies,
} from "./game-enhancements";

const damagedWithSpareLife: LifeState = {
  hp: 2,
  maxHp: 10,
  lives: 2,
  gameOver: false,
};

assert.deepEqual(
  getEnemyAttackTarget(
    "protect",
    { x: 20, y: 30, width: 40, height: 20 },
    { x: 100, y: 200, width: 60, height: 40 },
  ),
  { x: 130, y: 220 },
);
assert.deepEqual(
  getEnemyAttackTarget(
    "classic",
    { x: 20, y: 30, width: 40, height: 20 },
    { x: 100, y: 200, width: 60, height: 40 },
  ),
  { x: 40, y: 40 },
);

assert.deepEqual(applyPlayerDamage(damagedWithSpareLife, 3), {
  hp: 10,
  maxHp: 10,
  lives: 1,
  gameOver: false,
});

const damagedOnLastLife: LifeState = {
  hp: 2,
  maxHp: 10,
  lives: 1,
  gameOver: false,
};

assert.deepEqual(applyPlayerDamage(damagedOnLastLife, 3), {
  hp: 0,
  maxHp: 10,
  lives: 0,
  gameOver: true,
});

assert.equal(getLevelForScore(getLevelThreshold(1)), 1);
assert.equal(getLevelThreshold(2), 225);
assert.equal(getLevelThreshold(10), 6_000);
assert.equal(getLevelThreshold(100), 14_622_000);
assert.equal(getLevelForScore(getLevelThreshold(250)), 250);
assert.equal(getLevelForScore(getLevelThreshold(500)), 500);
assert.equal(getLevelForScore(getLevelThreshold(500) + 999_999_999), 500);
assert.equal(getProgressedLevel(10, 0), 10);
assert.equal(getProgressedLevel(2, getLevelThreshold(5)), 5);
assert.deepEqual(getCrossedMilestoneLevels(1, 10, 3, 3), [3, 6, 9]);
assert.deepEqual(getCrossedMilestoneLevels(5, 15, 5, 5), [10, 15]);
assert.deepEqual(getCrossedMilestoneLevels(15, 10, 5, 5), []);

assert.equal(getPilotLevelForScore(0), 1);
assert.equal(getPilotLevelThreshold(5), 120_000);
assert.equal(getPilotLevelThreshold(10), 200_000);
assert.equal(getPilotLevelThreshold(15), 400_000);
assert.equal(getPilotLevelThreshold(20), 600_000);
assert.equal(getPilotLevelThreshold(25), 800_000);
assert.equal(getPilotLevelForScore(119_999), 4);
assert.equal(getPilotLevelForScore(120_000), 5);
assert.equal(getPilotLevelForScore(199_999), 9);
assert.equal(getPilotLevelForScore(200_000), 10);
assert.equal(getPilotLevelForScore(400_000), 15);
assert.equal(getPilotLevelForScore(600_000), 20);

assert.equal(isBossEligibleLevel(19), true);
assert.equal(isBossEligibleLevel(20), true);
assert.equal(isBossEligibleLevel(21), false);
assert.equal(isBossEligibleLevel(25), true);
assert.equal(isBossEligibleLevel(499), false);
assert.equal(isBossEligibleLevel(500), true);

assert.equal(isMilestoneBossLevel(18), true);
assert.equal(isMilestoneBossLevel(19), false);
assert.equal(isMilestoneBossLevel(20), true);
assert.equal(isMilestoneBossLevel(21), false);
assert.equal(isMilestoneBossLevel(25), true);
assert.equal(isMilestoneBossLevel(500), true);

assert.equal(isTitanBossLevel(10), false);
assert.equal(isTitanBossLevel(19), false);
assert.equal(isTitanBossLevel(20), true);
assert.equal(isTitanBossLevel(30), true);

assert.equal(isLaserDeviceEligibleLevel(9), false);
assert.equal(isLaserDeviceEligibleLevel(10), true);
assert.equal(isLaserDeviceEligibleLevel(500), true);

assert.equal(getGameModeRules("protect").durationSeconds, 180);
assert.equal(getGameModeRules("protect").label, "Beschützen");
assert.equal(getModeCoinMultiplier("protect"), 1.4);

assert.equal(getEnemySpawnRate(1), 200);
assert.equal(getEnemySpawnRate(9), 64);
assert.equal(getEnemySpawnRate(10), 32);
assert.equal(getEnemySpawnRate(50), 32);

assert.ok(Math.abs(getNormalBossDamage(3, 9) - 0.6) < Number.EPSILON);
assert.equal(getNormalBossDamage(1, 9), 0.2);
assert.equal(getNormalBossDamage(3, 10), 3);

assert.equal(shouldUseSpaceBackground(49), false);
assert.equal(shouldUseSpaceBackground(50), true);
assert.equal(shouldUseSpaceBackground(500), true);

assert.equal(shouldUseAboveCloudsBackground(19), false);
assert.equal(shouldUseAboveCloudsBackground(20), true);
assert.equal(shouldUseAboveCloudsBackground(49), true);
assert.equal(shouldUseAboveCloudsBackground(50), false);

assert.equal(shouldUseCityBackground(10), true);
assert.equal(shouldUseCityBackground(11), false);

assert.equal(getBackgroundMusicTheme(1), "city");
assert.equal(getBackgroundMusicTheme(10), "city");
assert.equal(getBackgroundMusicTheme(11), "sky");
assert.equal(getBackgroundMusicTheme(19), "sky");
assert.equal(getBackgroundMusicTheme(20), "clouds");
assert.equal(getBackgroundMusicTheme(49), "clouds");
assert.equal(getBackgroundMusicTheme(50), "space");
assert.equal(getBackgroundMusicTheme(500), "space");

const shieldedTie: EnemyDamageState = { hp: 3, shieldHp: 2 };
assert.deepEqual(applyEnemyDamage(shieldedTie, 4), {
  hp: 3,
  shieldHp: 1,
  absorbedByShield: true,
  destroyed: false,
});

assert.deepEqual(applyEnemyDamage({ hp: 3, shieldHp: 1 }, 4), {
  hp: 3,
  shieldHp: 0,
  absorbedByShield: true,
  destroyed: false,
});

assert.deepEqual(applyEnemyDamage({ hp: 3, shieldHp: 0 }, 4), {
  hp: 0,
  shieldHp: 0,
  absorbedByShield: false,
  destroyed: true,
});

let playerProtection = {
  shieldTimer: 300,
  shieldHp: PLAYER_SHIELD_HP,
  invincibleTimer: 0,
  stealthTimer: 0,
};

for (let i = 0; i < PLAYER_SHIELD_HP; i++) {
  const result = applyPlayerHitProtection(playerProtection);
  assert.equal(result.protected, true);
  playerProtection = {
    ...playerProtection,
    shieldTimer: result.shieldTimer,
    shieldHp: result.shieldHp,
  };
}

assert.deepEqual(applyPlayerHitProtection(playerProtection), {
  protected: false,
  shieldTimer: 0,
  shieldHp: 0,
});

assert.equal(KEYBOARD_CONTROL_HELP.some(([key, desc]) => key === "H" && desc === "Heil-Ulti"), true);
assert.equal(MOBILE_CONTROL_HELP.some((line) => line.includes("STEALTH")), true);
assert.equal(MOBILE_CONTROL_HELP.some((line) => line.includes("HEAL")), true);

assert.equal(formatLockedSkinPrice(25000), "25k");
assert.equal(formatLockedSkinPrice(80000), "80k");

assert.equal(calculateCoinReward(0), 0);
assert.equal(calculateCoinReward(500), 500);
assert.equal(calculateCoinReward(1234), 1234);

assert.equal(shouldShowVirtualControls(false, false), false);
assert.equal(shouldShowVirtualControls(false, true), true);
assert.equal(shouldShowVirtualControls(true, false), true);

assert.equal(HEAL_ULTI_RESTORE, 5);

assert.equal(selectEnemyVariant(19, "fighter", 0, 0, 0), null);
assert.equal(selectEnemyVariant(20, "boss", 0, 0, 0), null);
assert.equal(selectEnemyVariant(20, "fighter", .1, .9, .1), "healer");
assert.equal(selectEnemyVariant(20, "fighter", .1, .9, .5), "shield");
assert.equal(selectEnemyVariant(20, "fighter", .1, .9, .9), "kamikaze");
assert.equal(selectEnemyVariant(49, "fighter", .5, .05, .1), null);
assert.equal(selectEnemyVariant(50, "fighter", .5, .05, .1), "armored");
assert.equal(selectEnemyVariant(50, "fighter", .5, .05, .5), "swift");
assert.equal(selectEnemyVariant(50, "fighter", .5, .05, .9), "frenzied");
assert.equal(selectEnemyVariant(20, "fighter", .5, .5, .5), null);

assert.deepEqual(GAME_MODES.map(mode => mode.id), ["classic", "blitz", "boss_rush", "one_life", "protect", "daily"]);
assert.equal(getGameModeRules("blitz").durationSeconds, 300);
assert.equal(getGameModeRules("one_life").startingLives, 1);
assert.equal(getModeCoinMultiplier("classic"), 1);
assert.equal(getModeCoinMultiplier("one_life"), 1.5);
assert.deepEqual(getDailyChallengeRules("2026-07-26"), getDailyChallengeRules("2026-07-26"));
assert.notDeepEqual(getDailyChallengeRules("2026-07-26"), getDailyChallengeRules("2026-07-27"));

assert.equal(getAircraftUpgradeCost(1), 50000);
assert.equal(getAircraftUpgradeCost(5), 1250000);
assert.equal(getAircraftUpgradeCost(9), 4050000);
assert.equal(getAircraftUpgradeCost(10), null);
assert.equal(getDroneUpgradeCost(1), 40000);
assert.equal(getDroneUpgradeCost(5), 1000000);
assert.equal(getDroneUpgradeCost(9), 3240000);
assert.equal(getDroneUpgradeCost(10), null);
assert.deepEqual(getAircraftUpgradeStats(1), { level: 1, maxHpBonus: 0, damageBonus: 0, speedBonus: 0, fireRateMultiplier: 1 });
assert.deepEqual(getAircraftUpgradeStats(5), { level: 5, maxHpBonus: 8, damageBonus: 2, speedBonus: 0.4, fireRateMultiplier: 0.9 });
assert.deepEqual(getAircraftUpgradeStats(99), { level: 10, maxHpBonus: 18, damageBonus: 4, speedBonus: 0.9, fireRateMultiplier: 0.775 });

assert.deepEqual(getDroneStats(0), { level: 1, guns: 1, damage: 1, fireRateMultiplier: 1 });
assert.deepEqual(getDroneStats(2), { level: 3, guns: 2, damage: 2, fireRateMultiplier: 0.76 });
assert.deepEqual(getDroneStats(3, 1), { level: 5, guns: 2, damage: 3, fireRateMultiplier: 0.52 });
assert.deepEqual(getDroneStats(5), { level: 6, guns: 3, damage: 4, fireRateMultiplier: 0.4 });
assert.deepEqual(getDroneStats(7), { level: 8, guns: 3, damage: 5, fireRateMultiplier: 0.28 });
assert.deepEqual(getDroneStats(20), { level: 21, guns: 3, damage: 11, fireRateMultiplier: 0.28 });

assert.equal(getBossPhase(100, 100), 1);
assert.equal(getBossPhase(60, 100), 2);
assert.equal(getBossPhase(30, 100), 3);
assert.equal(getMutatorForLevel(1).id, "none");
assert.equal(getMutatorForLevel(4).id, "swarm");
assert.equal(getMutatorForLevel(8).id, "bullet_time");
assert.equal(formatRunDuration(125_900), "2:05");
assert.deepEqual(
  getUpgradeSynergies({ chain_lightning: 1, cryo_rounds: 1 }).map(synergy => synergy.id),
  ["frost_storm"],
);
assert.deepEqual(
  getUpgradeSynergies({ missile_mastery: 1, cryo_rounds: 1, shield: 1, reactive_armor: 1 }).map(synergy => synergy.id),
  ["cryo_warheads", "ramming_field"],
);
assert.equal(SECTOR_CHOICES.length, 15);
assert.equal(new Set(SECTOR_CHOICES.map(choice => choice.id)).size, 15);
