/** Simulation time is measured in 60 Hz frames, independently of render FPS. */
export function skyLaserDamage(frameDelta: number): number {
  return 300 * Math.max(0, frameDelta) / 60;
}

export function skyReflectedDamage(incomingDamage: number): number {
  return Math.max(0, incomingDamage) * .5;
}

/** Call with visible targets; strength is the remaining health of a living enemy. */
export function strongestSkyTarget<T extends { hp: number; dead?: boolean }>(targets: readonly T[]): T | undefined {
  return targets.reduce<T | undefined>((best, target) =>
    !target.dead && target.hp > 0 && (!best || target.hp > best.hp) ? target : best, undefined);
}

/** Fly independently, patrolling the battlefield even when no enemy survives. */
export function moveSkyClone(
  position: { x: number; y: number },
  target: { x: number; y: number } | undefined,
  elapsedFrames: number,
  frameDelta: number,
  bounds: { width: number; height: number },
): { x: number; y: number } {
  const angle = elapsedFrames * .055;
  const destination = target
    ? { x: target.x + Math.cos(angle) * 55, y: target.y + Math.sin(angle) * 55 }
    : { x: bounds.width * (.62 + .25 * Math.cos(angle * .5)),
        y: bounds.height * (.5 + .34 * Math.sin(angle)) };
  const dx = Math.max(0, Math.min(bounds.width, destination.x)) - position.x;
  const dy = Math.max(0, Math.min(bounds.height, destination.y)) - position.y;
  const distance = Math.hypot(dx, dy);
  const step = Math.min(distance, 14 * Math.max(0, frameDelta));
  return distance === 0 ? { ...position }
    : { x: position.x + dx / distance * step, y: position.y + dy / distance * step };
}
