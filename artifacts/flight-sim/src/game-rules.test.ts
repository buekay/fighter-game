import assert from "node:assert/strict";
import {
  applyEnemyDamage,
  applyPlayerHitProtection,
  applyPlayerDamage,
  getLevelForScore,
  getLevelThreshold,
  isBossEligibleLevel,
  isMilestoneBossLevel,
  PLAYER_SHIELD_HP,
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
