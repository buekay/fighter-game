import type { ElementSpirit } from '../element-spirits';

export function drawElementSpirit(ctx: CanvasRenderingContext2D, spirit: ElementSpirit, reducedMotion: boolean): void {
  ctx.save();
  ctx.translate(spirit.x, spirit.y);
  const time = reducedMotion ? 0 : spirit.ageMs / 1000;
  ctx.globalAlpha = Math.min(1, spirit.ageMs / 1200, spirit.remainingMs / 600);
  ctx.strokeStyle = spirit.friendly ? '#82f6bc' : '#ff929b';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 7]); ctx.beginPath(); ctx.arc(0, 0, spirit.friendly ? 65 : 110, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  if (!spirit.friendly && spirit.calmMs > 0) {
    ctx.lineWidth = 4; ctx.strokeStyle = '#82f6bc'; ctx.beginPath();
    ctx.arc(0, 0, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, spirit.calmMs / 2500)); ctx.stroke();
  }
  ctx.fillStyle = spirit.color; ctx.strokeStyle = spirit.color;
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7 + time * .45;
    const radius = 20 + Math.sin(time * 2 + i) * 4;
    ctx.save(); ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius); ctx.rotate(angle + time * .2);
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 42);
  glow.addColorStop(0, '#ffffff'); glow.addColorStop(.18, spirit.color); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'center'; ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText(spirit.name + (spirit.friendly ? ' · FREUNDLICH' : ' · FEINDLICH'), 0, -58);
  ctx.font = '11px sans-serif';
  ctx.fillText(spirit.friendly ? 'Anfliegen: Heilung & Schutz' : 'Im Ring bleiben: beruhigen', 0, 61);
  ctx.restore();
}
