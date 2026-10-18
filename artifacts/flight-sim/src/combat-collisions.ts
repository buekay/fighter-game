export interface CollisionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MovingProjectile {
  x: number;
  y: number;
  previousX?: number;
  previousY?: number;
  fromPlayer: boolean;
  isMissile?: boolean;
  collisionWidth?: number;
  collisionHeight?: number;
}

/** Sweep a projectile against a moving box using relative motion.
 * Player shots use their left edge as x; hostile shots use their center.
 */
export function projectileHitsBounds(
  shot: MovingProjectile,
  bounds: CollisionBounds,
  previousBounds: Pick<CollisionBounds, "x" | "y"> = bounds,
): boolean {
  const width = shot.collisionWidth ?? (shot.fromPlayer ? 14 : 8);
  const height = shot.collisionHeight ?? (shot.fromPlayer ? shot.isMissile ? 8 : 4 : 8);
  const offsetX = shot.fromPlayer ? width / 2 : 0;
  const startX = (shot.previousX ?? shot.x) + offsetX - previousBounds.x;
  const startY = (shot.previousY ?? shot.y) - previousBounds.y;
  const endX = shot.x + offsetX - bounds.x;
  const endY = shot.y - bounds.y;
  let enter = 0;
  let exit = 1;
  for (const [start, delta, min, max] of [
    [startX, endX - startX, -width / 2, bounds.width + width / 2],
    [startY, endY - startY, -height / 2, bounds.height + height / 2],
  ]) {
    if (delta === 0) {
      if (start < min || start > max) return false;
      continue;
    }
    const a = (min - start) / delta;
    const b = (max - start) / delta;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return false;
  }
  return true;
}
