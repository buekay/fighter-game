/** Layered, pointed blue flames; angle points from the base toward the flame tip. */
export function drawSkyFlame(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, phase: number) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  const flicker = Math.sin(phase) * length * .16;
  for (const [scale, color] of [[1, '#0875ff'], [.7, '#38cfff'], [.38, '#e5fcff']] as const) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -length * .24 * scale);
    ctx.bezierCurveTo(length * .4 * scale, -length * .38 * scale,
      length * .52 * scale, flicker - length * .18 * scale, length * scale, flicker);
    ctx.bezierCurveTo(length * .55 * scale, flicker + length * .08 * scale,
      length * .35 * scale, length * .38 * scale, 0, length * .24 * scale);
    ctx.quadraticCurveTo(-length * .2 * scale, 0, 0, -length * .24 * scale);
    ctx.fill();
  }
  ctx.restore();
}
