import { partBounds, SECRET_NAMES, type Bounds, type BossPart, type Hazard, type SecretSignal, type CoopPilot } from '../flight-features';

export function drawBossParts(ctx: CanvasRenderingContext2D, boss: Bounds, parts: BossPart[]) {
  ctx.save(); ctx.font = 'bold 10px Inter, sans-serif';
  for (const part of parts) {
    const b = partBounds(boss, part); const color = part.id === 'weapon' ? '#fb923c' : '#67e8f9';
    ctx.strokeStyle = part.hp > 0 ? color : '#64748b'; ctx.lineWidth = 2;
    ctx.setLineDash(part.hp > 0 ? [] : [3, 4]); ctx.strokeRect(b.x, b.y, b.width, b.height);
    ctx.fillStyle = part.hp > 0 ? '#071126bb' : '#101820ee'; ctx.fillRect(b.x, b.y, b.width, b.height);
    if (part.hp > 0) {
      ctx.fillStyle = color; ctx.fillRect(b.x, b.y + b.height - 3, b.width * part.hp / part.maxHp, 3);
      ctx.fillText(part.name, b.x + 3, b.y + 13);
    } else { ctx.fillStyle = '#94a3b8'; ctx.fillText('× ' + part.name, b.x + 3, b.y + 13); }
  }
  ctx.restore();
}
export function drawHazards(ctx: CanvasRenderingContext2D, hazards: Hazard[]) {
  ctx.save(); ctx.font = 'bold 12px Inter, sans-serif';
  for (const h of hazards) {
    ctx.fillStyle = h.color; ctx.strokeStyle = h.color;
    ctx.globalAlpha = h.warningMs > 0 ? .16 : .7;
    if (h.warningMs > 0) { ctx.fillRect(h.x, h.y, h.width, h.height); ctx.globalAlpha = 1; ctx.setLineDash([6, 5]); ctx.strokeRect(h.x, h.y, h.width, h.height); ctx.setLineDash([]); ctx.fillText('⚠ ' + h.name, Math.min(h.x, 740), Math.max(90, h.y - 12)); }
    else if (['asteroid', 'ice', 'debris'].includes(h.kind)) {
      ctx.beginPath(); ctx.moveTo(h.x + h.width * .2, h.y); ctx.lineTo(h.x + h.width * .8, h.y + 3); ctx.lineTo(h.x + h.width, h.y + h.height * .6); ctx.lineTo(h.x + h.width * .5, h.y + h.height); ctx.lineTo(h.x, h.y + h.height * .7); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1; ctx.stroke();
    } else {
      ctx.fillRect(h.x, h.y, h.width, h.height); ctx.globalAlpha = 1;
      ctx.beginPath(); for (let y = h.y; y < h.y + h.height; y += 24) { ctx.moveTo(h.x, y); ctx.lineTo(h.x + h.width, y + 14); } ctx.stroke();
    }
  }
  ctx.restore();
}
export function drawSecret(ctx: CanvasRenderingContext2D, signal: SecretSignal) {
  ctx.save(); ctx.strokeStyle = '#fcd34d'; ctx.fillStyle = '#fcd34d'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(signal.x, signal.y, signal.phase === 'signal' ? 40 : 60, 0, Math.PI * 2); ctx.stroke();
  ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(signal.phase === 'signal' ? '◇ GEHEIMES SIGNAL' : SECRET_NAMES[signal.kind], signal.x, signal.y - 48);
  ctx.fillText(signal.phase === 'signal' ? 'Anfliegen · ' + Math.ceil(signal.remainingMs / 1000) + ' s' : 'In der Nähe bleiben · ' + Math.ceil(signal.progressMs / 1000) + '/3 s', signal.x, signal.y + 62);
  ctx.fillText(signal.kind === 'wreck' ? '▣' : signal.kind === 'rescue' ? '✚' : '✦', signal.x, signal.y + 5); ctx.restore();
}
export function drawCoopStatus(ctx: CanvasRenderingContext2D, partner: CoopPilot, _leader: Bounds, _leaderDown: boolean) {
  ctx.save(); ctx.font = 'bold 12px Inter, sans-serif'; ctx.fillStyle = '#67e8f9';
  ctx.fillText(`P2 · ${Math.ceil(partner.hp)}/${partner.maxHp} HP · ${partner.armedMs > 0 ? 'TEAM-ULTI BEREIT!' : partner.ultiCooldownMs > 0 ? 'Team-Ulti ' + Math.ceil(partner.ultiCooldownMs / 1000) + ' s' : 'RShift: Team-Ulti'}`, 18, 115);
  ctx.restore();
}
export function drawCoopRevival(ctx: CanvasRenderingContext2D, partner: CoopPilot, leader: Bounds, leaderDown: boolean) {
  ctx.save(); ctx.font = 'bold 12px Inter, sans-serif';
  for (const p of [ ...(partner.down ? [partner] : []), ...(leaderDown ? [leader] : []) ]) {
    ctx.strokeStyle = '#4ade80'; ctx.beginPath(); ctx.arc(p.x + 26, p.y + 14, 80, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#4ade80'; ctx.fillText('RETTEN · ' + Math.floor(partner.reviveMs / 25) + '%', p.x, p.y - 12);
  }
  ctx.restore();
}
