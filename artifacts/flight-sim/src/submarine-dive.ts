export const SUBMARINE_DIVE_MS = 10_000;
export interface SubmarineDiveState {
  encounterKind?: string;
  hp: number;
  maxHp: number;
  submarineDiveUsed?: boolean;
  submarineDiveMs?: number;
}
export const isSubmerged = (enemy: SubmarineDiveState) =>
  enemy.encounterKind === "submarine" && (enemy.submarineDiveMs ?? 0) > 0;

/** Every damage source uses this boundary, including splash, poison and lasers. */
export function setEnemyHealth(enemy: SubmarineDiveState, nextHp: number): void {
  if (isSubmerged(enemy) && nextHp < enemy.hp) return;
  if (enemy.encounterKind === "submarine" && !enemy.submarineDiveUsed &&
      enemy.hp > 0 && nextHp < enemy.hp && nextHp <= enemy.maxHp / 2) {
    enemy.hp = Math.min(enemy.hp, enemy.maxHp / 2);
    enemy.submarineDiveUsed = true;
    enemy.submarineDiveMs = SUBMARINE_DIVE_MS;
    return;
  }
  enemy.hp = nextHp;
}

export function advanceSubmarineDive(enemy: SubmarineDiveState, elapsedMs: number): void {
  if (isSubmerged(enemy)) enemy.submarineDiveMs = Math.max(0, enemy.submarineDiveMs! - Math.max(0, elapsedMs));
}
