import type { Hazard } from '../environment-hazards';
const noise = (seed: number, i: number) => { const n = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return n - Math.floor(n); };
function outline(ctx: CanvasRenderingContext2D, h: Hazard) {
  ctx.beginPath(); h.outline!.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(h.x + x * h.width, h.y + y * h.height); else ctx.lineTo(h.x + x * h.width, h.y + y * h.height); }); ctx.closePath();
}
function terrain(ctx: CanvasRenderingContext2D, h: Hazard) {
  const ice = h.kind === 'ice', trees = h.kind === 'vine';
  outline(ctx, h);
  const g = ctx.createLinearGradient(h.x, h.y, h.x + h.width, h.y + h.height);
  g.addColorStop(0, ice ? '#e1eef1' : trees ? '#6a8051' : '#b18d6b');
  g.addColorStop(.35, ice ? '#a3c1cf' : trees ? '#38583c' : '#7e5d48');
  g.addColorStop(1, ice ? '#4f7b91' : trees ? '#172f29' : '#403c37');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  if (trees) {
    for (let i = 0; i < 34; i++) {
      const x = h.x + noise(h.seed, i) * h.width, y = h.y + noise(h.seed + 3, i) * h.height;
      const r = 14 + noise(h.seed + 5, i) * 26;
      const leaves = ctx.createRadialGradient(x - r * .3, y - r * .35, 2, x, y, r);
      leaves.addColorStop(0, ['#59744c', '#52734a', '#668353', '#6a8051'][i % 4]); leaves.addColorStop(1, '#203f2e'); ctx.fillStyle = leaves;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * .75, -.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#99aa6f25'; ctx.beginPath(); ctx.arc(x - r * .15, y - r * .1, r * .7, 3.5, 5.4); ctx.stroke();
    }
  } else {
    for (let i = 0; i < 14; i++) {
      const y = h.y + h.height * i / 14;
      ctx.strokeStyle = ice ? '#effaff55' : i % 2 ? '#cda68155' : '#241f1c55'; ctx.lineWidth = ice ? 1 : 3;
      ctx.beginPath();
      if (ice) { const x = h.x + noise(h.seed, i) * h.width; ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 18); ctx.lineTo(x + 4, y + 35); }
      else { ctx.moveTo(h.x - 8, y); ctx.lineTo(h.x + h.width * .5, y + 9 + noise(h.seed, i) * 12); ctx.lineTo(h.x + h.width + 8, y - 3); }
      ctx.stroke();
    }
    if (ice) { ctx.fillStyle = '#f1fbff55'; ctx.beginPath(); ctx.moveTo(h.x + h.width * .43, h.y); ctx.lineTo(h.x + h.width * .64, h.y + h.height); ctx.lineTo(h.x + h.width * .15, h.y + h.height); ctx.fill(); }
  }
  ctx.restore(); outline(ctx, h); ctx.strokeStyle = ice ? '#d6e8edaa' : trees ? '#59724e' : '#c3a08277'; ctx.lineWidth = 1.5; ctx.stroke();
}
function body(ctx: CanvasRenderingContext2D, h: Hazard, reduced: boolean) {
  ctx.save(); ctx.translate(h.x + h.width / 2, h.y + h.height / 2); ctx.scale(h.width / Math.min(h.width, h.height), h.height / Math.min(h.width, h.height)); ctx.rotate(reduced ? h.seed : h.rotation);
  const r = Math.min(h.width, h.height) * .48;
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, h.kind === 'debris' ? '#a0a6a9' : '#9c9284'); g.addColorStop(.45, '#625f58'); g.addColorStop(1, '#282e31');
  ctx.fillStyle = g; ctx.strokeStyle = '#bac2bd66'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) { const angle = i / 9 * Math.PI * 2, radius = r * (.8 + noise(h.seed, i) * .2); const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const x = (noise(h.seed + 2, i) - .5) * r, y = (noise(h.seed + 4, i) - .5) * r;
    ctx.fillStyle = '#1c242c66'; ctx.beginPath(); ctx.ellipse(x, y, r * .18, r * .12, i, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b6aca455'; ctx.beginPath(); ctx.arc(x, y, r * .17, 3.4, 5.4); ctx.stroke();
  }
  if (h.kind === 'debris') { ctx.strokeStyle = '#d0d2ce99'; ctx.beginPath(); ctx.moveTo(-r * .65, -r * .3); ctx.lineTo(r * .7, r * .25); ctx.stroke(); ctx.fillStyle = '#333d43'; ctx.fillRect(-r * .2, -r * .6, 3, r * 1.2); }
  if (h.kind === 'lava') {
    ctx.strokeStyle = '#ed8a42'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * .4, -r * .7); ctx.lineTo(r * .1, 0); ctx.lineTo(-r * .1, r * .5); ctx.stroke();
    ctx.fillStyle = '#e6a45a'; ctx.beginPath(); ctx.arc(-r * .25, -r * .2, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  if (h.kind === 'lava') for (let i = 1; i < 5; i++) {
    ctx.fillStyle = `rgba(88,78,70,${.2 * (1 - i / 5)})`;
    ctx.beginPath(); ctx.arc(h.x + h.width / 2 + i * 9, h.y + h.height / 2 - h.vy * i * .016, 5 + i * 2, 0, Math.PI * 2); ctx.fill();
  }
}
function air(ctx: CanvasRenderingContext2D, h: Hazard, reduced: boolean) {
  const sand = h.kind === 'sand';
  // Soft, bounded dust wisps follow one coherent air mass; no solid collision-looking rectangle.
  const phase = reduced ? 0 : h.ageMs * .0003;
  for (let i = 0; i < (sand ? 18 : 9); i++) {
    const x = h.x + noise(h.seed, i) * h.width, y = h.y + noise(h.seed + 4, i) * h.height;
    const sway = Math.sin(phase + i) * 9;
    if (sand) {
      ctx.fillStyle = '#b79b6a22'; ctx.beginPath(); ctx.ellipse(x, y + sway, 45 + i % 3 * 8, 18 + i % 4 * 4, .12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#d6bd8d44'; ctx.lineWidth = 1;
    } else { ctx.strokeStyle = '#d8e2df66'; ctx.lineWidth = 1.2; }
    ctx.beginPath(); ctx.moveTo(x - 35, y); ctx.bezierCurveTo(x - 10, y - 4 + sway, x + 12, y + 7 + sway, x + 35, y + 6); ctx.stroke();
  }
}
function waterspout(ctx: CanvasRenderingContext2D, h: Hazard, reduced: boolean) {
  const cx = h.x + h.width / 2;
  const phase = reduced ? 0 : h.ageMs * .004;
  const funnel = ctx.createLinearGradient(h.x, h.y, h.x + h.width, h.y);
  funnel.addColorStop(0, '#d6e1e188'); funnel.addColorStop(.35, '#a3b6bdcc'); funnel.addColorStop(.65, '#5e798b99'); funnel.addColorStop(1, '#c3d5d588');
  ctx.fillStyle = funnel;
  ctx.beginPath(); ctx.moveTo(cx - h.width * .44, h.y);
  ctx.bezierCurveTo(cx - h.width * .2, h.y + h.height * .2, cx - h.width * .1, h.y + h.height * .65, cx - h.width * .44, h.y + h.height);
  ctx.lineTo(cx + h.width * .44, h.y + h.height);
  ctx.bezierCurveTo(cx + h.width * .1, h.y + h.height * .65, cx + h.width * .2, h.y + h.height * .2, cx + h.width * .44, h.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9caeb7aa';
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(cx - 36 + i * 18, h.y - 4 - (i % 2) * 7, 28, 13, 0, 0, Math.PI * 2); ctx.fill(); }
  for (let i = 0; i < 28; i++) {
    const t = i / 27, y = h.y + h.height * t;
    const radius = h.width * (.44 - .3 * Math.sin(t * Math.PI));
    ctx.strokeStyle = i % 3 ? '#9eb6bf33' : '#d6e7e966'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(cx + Math.sin(t * 4 + phase) * 5, y, radius, 5 + t * 4, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // Broad spray at sea level, with a narrow condensation funnel above it.
  ctx.fillStyle = '#d6e9eb55'; ctx.beginPath(); ctx.ellipse(cx, h.y + h.height - 5, h.width * .62, 15, 0, 0, Math.PI * 2); ctx.fill();
}
function lightning(ctx: CanvasRenderingContext2D, h: Hazard) {
  const cx = h.x + h.width / 2;
  // Charged cloud remains visible through the warning. The actual strike is brief.
  ctx.fillStyle = '#40495377';
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(cx - 60 + i * 23, h.y + 10 - (i % 2) * 12, 34, 17, 0, 0, Math.PI * 2); ctx.fill(); }
  if (h.warningMs > 0) { ctx.strokeStyle = '#c3cddd66'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 17, h.y + 16); ctx.lineTo(cx + 4, h.y + 35); ctx.lineTo(cx - 2, h.y + 46); ctx.stroke(); return; }
  // A shared stable zigzag stays within the narrow physical strike corridor.
  ctx.beginPath(); ctx.moveTo(cx, h.y + 24);
  for (let i = 1; i <= 14; i++) ctx.lineTo(cx + (noise(h.seed, i) - .5) * h.width * .7, h.y + h.height * i / 14);
  ctx.strokeStyle = '#a4b7d488'; ctx.lineWidth = 8; ctx.stroke();
  ctx.strokeStyle = '#e5eef5'; ctx.lineWidth = 2; ctx.stroke();
}
export function drawHazards(ctx: CanvasRenderingContext2D, hazards: Hazard[], reducedMotion = false) {
  ctx.save();
  for (const h of hazards) {
    ctx.save();
    // Preview the real silhouette before activation, with no artificial box or colored wall.
    ctx.globalAlpha = h.warningMs > 0 && h.kind !== 'lightning' ? .38 : 1;
    if (h.outline) terrain(ctx, h);
    else if (h.kind === 'wind' || h.kind === 'sand') air(ctx, h, reducedMotion);
    else if (h.kind === 'wave') waterspout(ctx, h, reducedMotion);
    else if (h.kind === 'lightning') lightning(ctx, h);
    else body(ctx, h, reducedMotion);
    if (h.warningMs > 0) {
      ctx.globalAlpha = .9; ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#e2d3b6';
      const x = Math.max(16, Math.min(h.x, 720)), y = Math.max(95, Math.min(560, h.y - 14));
      ctx.fillText('⚠ ' + h.name, x, y);
    }
    ctx.restore();
  }
  ctx.restore();
}
