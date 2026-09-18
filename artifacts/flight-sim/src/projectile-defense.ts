export interface InterceptableProjectile {
  x: number;
  y: number;
  previousX?: number;
  previousY?: number;
  fromPlayer: boolean;
  isMissile?: boolean;
  meleeRange?: number;
  collisionWidth?: number;
  collisionHeight?: number;
  interceptionHits?: number;
}

export const PROJECTILE_DEFENSE_HITS = 4;

// Sweep both projectiles across the frame so fast shots cannot skip a hit.
function contactTime(shot: InterceptableProjectile, target: InterceptableProjectile): number | null {
  const shotWidth = shot.collisionWidth ?? 14;
  const halfWidth = (shotWidth + (target.collisionWidth ?? 8)) / 2;
  const halfHeight = ((shot.collisionHeight ?? (shot.isMissile ? 8 : 4)) + (target.collisionHeight ?? 8)) / 2;
  const startX = (shot.previousX ?? shot.x) + shotWidth / 2 - (target.previousX ?? target.x);
  const startY = (shot.previousY ?? shot.y) - (target.previousY ?? target.y);
  const endX = shot.x + shotWidth / 2 - target.x;
  const endY = shot.y - target.y;
  let enter = 0;
  let exit = 1;
  for (const [start, delta, radius] of [[startX, endX - startX, halfWidth], [startY, endY - startY, halfHeight]]) {
    if (delta === 0) {
      if (Math.abs(start) > radius) return null;
      continue;
    }
    const a = (-radius - start) / delta;
    const b = (radius - start) / delta;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return null;
  }
  return enter;
}

export function interceptProjectiles<T extends InterceptableProjectile>(
  projectiles: T[], enabled: boolean, onHit: (target: T, destroyed: boolean) => void,
): T[] {
  if (!enabled) return projectiles;
  const targets = projectiles.filter(projectile => !projectile.fromPlayer);
  const removed = new Set<T>();
  for (const shot of projectiles) {
    if (!shot.fromPlayer || shot.meleeRange) continue;
    let closest: T | undefined;
    let earliest = Infinity;
    for (const target of targets) {
      if (removed.has(target)) continue;
      const time = contactTime(shot, target);
      if (time !== null && time < earliest) {
        earliest = time;
        closest = target;
      }
    }
    if (!closest) continue;
    removed.add(shot);
    closest.interceptionHits = (closest.interceptionHits ?? 0) + 1;
    const destroyed = closest.interceptionHits >= PROJECTILE_DEFENSE_HITS;
    if (destroyed) removed.add(closest);
    onHit(closest, destroyed);
  }
  return projectiles.filter(projectile => !removed.has(projectile));
}
