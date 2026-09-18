export interface FireSwordLightning {
  x: number;
  y: number;
  range: number;
  targets: { x: number; y: number }[];
  remainingMs: number;
}

export const FIRE_SWORD_LIGHTNING_DURATION_MS = 650;

// Independent of projectiles: the discharge remains visible after a hit or kill.
export function drawFireSwordLightning(
  ctx: CanvasRenderingContext2D,
  effect: FireSwordLightning,
  reducedMotion: boolean,
) {
  const progress = 1 - effect.remainingMs / FIRE_SWORD_LIGHTNING_DURATION_MS;
  const phase = reducedMotion ? 0 : Math.floor(progress * 8);
  ctx.save();
  ctx.globalAlpha = Math.min(1, effect.remainingMs / 250);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "#ffd21f";
  ctx.shadowBlur = 18;

  // Short radial arcs show the activation even when no enemy is in range.
  const endpoints = Array.from({ length: 7 }, (_, index) => {
    const angle = index * Math.PI * 2 / 7;
    const radius = effect.range * (reducedMotion ? .55 : .4 + progress * .35);
    return { x: effect.x + Math.cos(angle) * radius, y: effect.y + Math.sin(angle) * radius };
  });
  endpoints.push(...effect.targets);
  endpoints.forEach((target, index) => {
    const dx = target.x - effect.x;
    const dy = target.y - effect.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y);
    for (let step = 1; step < 8; step++) {
      const offset = Math.sin(step * 12.7 + index * 4.3 + phase * 2.1) * Math.min(15, length * .14);
      ctx.lineTo(effect.x + dx * step / 8 - dy / length * offset,
        effect.y + dy * step / 8 + dx / length * offset);
    }
    ctx.lineTo(target.x, target.y);
    ctx.strokeStyle = "#ffd21f";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = "#fffbd6";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  ctx.restore();
}
