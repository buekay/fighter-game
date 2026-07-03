import assert from "node:assert/strict";
import { applyPlayerDamage, type LifeState } from "./game-rules";

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
