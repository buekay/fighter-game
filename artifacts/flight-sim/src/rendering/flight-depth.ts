// Small, fixed sprite cache: no full-screen blur passes or per-particle gradients.
const sprites = new Map<string, HTMLCanvasElement>();
export const MAX_VISUAL_PARTICLES = 220;

function softSprite(kind: "cloud" | "shadow" | "smoke") {
  let sprite = sprites.get(kind);
  if (sprite) return sprite;
  sprite = document.createElement("canvas");
  sprite.width = sprite.height = 128;
  const ctx = sprite.getContext("2d")!;
  const gradient = ctx.createRadialGradient(58, 54, 2, 64, 64, 64);
  const color = kind === "cloud" ? "225,240,250" : kind === "shadow" ? "2,8,18" : "78,66,62";
  gradient.addColorStop(0, `rgba(${color},.7)`);
  gradient.addColorStop(.45, `rgba(${color},.35)`);
  gradient.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  sprites.set(kind, sprite);
  return sprite;
}

export function drawFlightShadow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.drawImage(softSprite("shadow"), x - width * .2 + 16, y - height * .2 + 22, width * 1.4, height * 1.4);
}

export function drawHullShade(ctx: CanvasRenderingContext2D, wingSpan: number) {
  ctx.drawImage(softSprite("shadow"), -38, -wingSpan * .55, 72, wingSpan * 1.2);
}

export function applyFlightBank(ctx: CanvasRenderingContext2D, bank: number) {
  // Small visual roll only; the centre and gameplay hitbox remain fixed.
  ctx.rotate(bank * .09);
  ctx.transform(1, 0, bank * .14, 1 - Math.abs(bank) * .16, 0, 0);
}

export function drawEnginePlume(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, bank: number, color: string, reducedMotion: boolean) {
  const pulse = reducedMotion ? 0 : Math.sin(time * .65) * 3 + Math.sin(time * .27) * 2;
  ctx.save();
  ctx.translate(x, y);
  applyFlightBank(ctx, bank);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = color;
  ctx.globalAlpha = .28;
  ctx.beginPath(); ctx.moveTo(3, -7); ctx.quadraticCurveTo(-22, -5, -38 - pulse, 0); ctx.quadraticCurveTo(-22, 5, 3, 7); ctx.fill();
  ctx.globalAlpha = .9;
  ctx.fillStyle = "#c9f5ff";
  ctx.beginPath(); ctx.moveTo(2, -3); ctx.lineTo(-23 - pulse * .7, 0); ctx.lineTo(2, 3); ctx.fill();
  ctx.restore();
}

export function drawDepthClouds(ctx: CanvasRenderingContext2D, time: number, dense = false) {
  ctx.save();
  // Two altitudes move at different speeds. Low opacity preserves enemy visibility.
  for (let i = 0; i < (dense ? 8 : 5); i++) {
    const near = i % 2 === 0;
    const span = 1320;
    const x = ((i * 281 - time * (near ? 1.25 : .48)) % span + span) % span - 260;
    const y = 30 + (i * 137) % 510;
    const width = near ? 280 : 180;
    ctx.globalAlpha = near ? .14 : .09;
    ctx.drawImage(softSprite("cloud"), x + 24, y + 28, width, width * .42);
  }
  ctx.restore();
}

export function drawSmoke(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, progress: number) {
  const size = radius * (1 + progress * 2.5);
  ctx.drawImage(softSprite("smoke"), x - size, y - size, size * 2, size * 2);
}
