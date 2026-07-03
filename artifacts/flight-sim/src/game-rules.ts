export interface LifeState {
  hp: number;
  maxHp: number;
  lives: number;
  gameOver: boolean;
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
