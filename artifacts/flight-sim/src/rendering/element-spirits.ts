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
  // Element-specific material fragments embedded in diffuse vapor.
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.399 + time * .18;
    const radius = 9 + i * 2.5;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    ctx.save(); ctx.translate(x, y);
    const vapor = ctx.createRadialGradient(0, 0, 0, 0, 0, 17);
    vapor.addColorStop(0, spirit.color + '45'); vapor.addColorStop(1, spirit.color + '00');
    ctx.fillStyle = vapor; ctx.fillRect(-17, -17, 34, 34);
    if (spirit.element === 'water') {
      const water = ctx.createRadialGradient(-2, -3, 0, 0, 0, 7);
      water.addColorStop(0, '#e4ffffb0'); water.addColorStop(.4, '#6cabb780'); water.addColorStop(1, '#16334340');
      ctx.fillStyle = water; ctx.beginPath(); ctx.ellipse(0, 0, 5, 8, angle, 0, Math.PI * 2); ctx.fill();
    } else if (spirit.element === 'storm') {
      ctx.strokeStyle = spirit.color + '90'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(-1, -2); ctx.lineTo(2, 1); ctx.lineTo(8, -5); ctx.stroke();
    } else {
      ctx.rotate(angle);
      const material = ctx.createLinearGradient(-6, -8, 6, 9);
      material.addColorStop(0, spirit.element === 'ember' ? '#bcb0a0' : '#d5e6e9b0');
      material.addColorStop(.35, spirit.element === 'ember' ? '#514540' : '#7793a280');
      material.addColorStop(1, spirit.element === 'ember' ? '#201d22' : '#1a344b90');
      ctx.fillStyle = material; ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(3, -6); ctx.lineTo(6, 1); ctx.lineTo(1, 8); ctx.lineTo(-5, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = spirit.element === 'ember' ? '#ff9e5380' : '#defaff80'; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(0, -1); ctx.lineTo(1, 8); ctx.stroke();
    }
    ctx.restore();
  }
  const glow = ctx.createRadialGradient(-3, -4, 0, 0, 0, 35);
  glow.addColorStop(0, '#d9eeed70'); glow.addColorStop(.23, spirit.color + '45'); glow.addColorStop(1, spirit.color + '00');
  ctx.fillStyle = glow; ctx.fillRect(-35, -35, 70, 70);
  ctx.textAlign = 'center'; ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText(spirit.name + (spirit.friendly ? ' · FREUNDLICH' : ' · FEINDLICH'), 0, -58);
  ctx.font = '11px sans-serif';
  ctx.fillText(spirit.friendly ? 'Anfliegen: Heilung & Schutz' : 'Im Ring bleiben: beruhigen', 0, 61);
  ctx.restore();
}
