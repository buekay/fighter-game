interface LightningTarget {
  x: number; y: number; width: number; height: number;
  hp: number; dead?: boolean;
}

// Reserve targets across all branches of one discharge to prevent cycles and duplicates.
export function claimLightningTargets<T extends LightningTarget>(source: T, candidates: T[], visited: Set<T>): T[] {
  visited.add(source);
  return candidates.filter(target => {
    if (visited.has(target) || target.dead || target.hp <= 0) return false;
    const distance = Math.hypot(
      target.x + target.width / 2 - source.x - source.width / 2,
      target.y + target.height / 2 - source.y - source.height / 2,
    );
    if (distance > 100) return false;
    visited.add(target);
    return true;
  });
}
