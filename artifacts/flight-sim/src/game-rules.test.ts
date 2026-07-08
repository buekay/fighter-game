import assert from "node:assert/strict";
import {
  applyEnemyDamage,
  applyPlayerHitProtection,
  applyPlayerDamage,
  calculateCoinReward,
  formatLockedSkinPrice,
  getLevelForScore,
  getLevelThreshold,
  HEAL_ULTI_RESTORE,
  KEYBOARD_CONTROL_HELP,
  isBossEligibleLevel,
  isMilestoneBossLevel,
  MOBILE_CONTROL_HELP,
  PLAYER_SHIELD_HP,
  shouldShowVirtualControls,
  type EnemyDamageState,
  type LifeState,
} from "./game-rules";

const damagedWithSpareLife: LifeState = {
  hp: 2,
  maxHp: 10,
  lives: 2,
  gameOver: false,
};

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
assert.equal(getLevelForScore(getLevelThreshold(250)), 250);
assert.equal(getLevelForScore(getLevelThreshold(500)), 500);
assert.equal(getLevelForScore(getLevelThreshold(500) + 999_999_999), 500);

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
assert.equal(calculateCoinReward(500), 2500);
assert.equal(calculateCoinReward(1234), 6170);

assert.equal(shouldShowVirtualControls(false, false), false);
assert.equal(shouldShowVirtualControls(false, true), true);
assert.equal(shouldShowVirtualControls(true, false), true);

assert.equal(HEAL_ULTI_RESTORE, 5);
