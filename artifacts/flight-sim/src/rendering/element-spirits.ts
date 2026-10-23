import type { ElementSpirit } from '../element-spirits';

export function drawElementSpirit(ctx: CanvasRenderingContext2D, spirit: ElementSpirit, reducedMotion: boolean): void {
  ctx.save();
  ctx.translate(spirit.x, spirit.y);
  const time = reducedMotion ? 0 : spirit.ageMs / 1000;
  ctx.globalAlpha = Math.min(1, .55 + spirit.ageMs / 1200, spirit.remainingMs / 600);
  // Soft outer light leaves the material surface and silhouette readable.
  const aura = ctx.createRadialGradient(0, 0, 15, 0, 0, 47);
  aura.addColorStop(0, spirit.color + '65'); aura.addColorStop(1, spirit.color + '00');
  ctx.fillStyle = aura; ctx.fillRect(-47, -47, 94, 94);
  // Layered vapor trails have soft edges and varying density, like drifting smoke.
  for (let i = 5; i >= 0; i--) {
    ctx.save();
    ctx.translate(13 + i * 6, Math.sin(time * .7 + i * .8) * (3 + i));
    ctx.scale(1.4 + i * .12, .55 + i * .06);
    const vapor = ctx.createRadialGradient(0, -3, 1, 0, 0, 23);
    vapor.addColorStop(0, spirit.color + (i < 2 ? '35' : '18'));
    vapor.addColorStop(.5, spirit.color + '10'); vapor.addColorStop(1, spirit.color + '00');
    ctx.fillStyle = vapor; ctx.fillRect(-23, -23, 46, 46); ctx.restore();
  }
  ctx.save();
  ctx.translate(0, Math.sin(time * 1.4) * 2);
  ctx.scale(1 + Math.sin(time * .8) * .018, 1 + Math.cos(time * .7) * .025);
  if (spirit.element === 'water') {
    // A suspended wave folds around a hollow center, with a tapering liquid tail.
    ctx.beginPath(); ctx.moveTo(5, -34);
    ctx.bezierCurveTo(36, -20, 34, 6, 18, 21);
    ctx.bezierCurveTo(8, 31, -9, 25, -18, 37);
    ctx.bezierCurveTo(-15, 19, -34, 11, -28, -9);
    ctx.bezierCurveTo(-24, -27, -7, -24, 5, -34); ctx.closePath();
    const liquid = ctx.createLinearGradient(-28, -20, 29, 24);
    liquid.addColorStop(0, '#e1fff7'); liquid.addColorStop(.22, '#81e7da');
    liquid.addColorStop(.5, '#409eb0'); liquid.addColorStop(.75, '#245774'); liquid.addColorStop(1, '#87dcd8');
    ctx.fillStyle = liquid; ctx.strokeStyle = '#bbfff1'; ctx.lineWidth = 1.2; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, -21); ctx.bezierCurveTo(25, -8, 16, 18, -1, 16);
    ctx.bezierCurveTo(-20, 14, -17, -5, -6, -10); ctx.strokeStyle = '#e6fff3c0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-19, -12); ctx.bezierCurveTo(-28, 3, -8, 20, -13, 27);
    ctx.strokeStyle = '#79bfcf'; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4 + time * .3;
      const x = Math.cos(angle) * 35, y = Math.sin(angle) * 30;
      ctx.fillStyle = '#acf8eb'; ctx.beginPath(); ctx.ellipse(x, y, 1.8, 3.1, angle, 0, Math.PI * 2); ctx.fill();
    }
  } else if (spirit.element === 'ember' || spirit.element === 'crystal') {
    const ember = spirit.element === 'ember';
    // Uneven orbiting chunks form a broken shell around an exposed energy seam.
    const heart = ctx.createRadialGradient(0, 0, 1, 0, 0, 25);
    heart.addColorStop(0, ember ? '#fff5c9' : '#efffff');
    heart.addColorStop(.35, ember ? '#ffb14b' : '#a7dfff'); heart.addColorStop(1, spirit.color + '00');
    ctx.fillStyle = heart; ctx.fillRect(-25, -25, 50, 50);
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7 + Math.sin(i * 4.7) * .2 + time * .09;
      const distance = 16 + Math.sin(i * 5) * 4 + Math.sin(time + i) * 2;
      ctx.save(); ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance); ctx.rotate(angle + Math.sin(i * 3) * .4);
      ctx.scale(.75 + (i % 3) * .17, .8 + (i % 2) * .25);
      const material = ctx.createLinearGradient(-12, -7, 14, 7);
      material.addColorStop(0, ember ? '#3c3330' : '#1c476c');
      material.addColorStop(.48, ember ? '#9a7551' : '#94d6ed');
      material.addColorStop(1, ember ? '#dfad71' : '#e3ffff');
      ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(ember ? 6 : 16, -6);
      ctx.lineTo(ember ? 13 : 22, 1); ctx.lineTo(7, 9); ctx.lineTo(-10, 5); ctx.closePath();
      ctx.fillStyle = material; ctx.fill(); ctx.strokeStyle = ember ? '#c5a284' : '#b6f6ff'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(0, 0); ctx.lineTo(-10, 5);
      ctx.strokeStyle = ember ? '#ffc780' : '#f1ffff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(7, 9); ctx.strokeStyle = ember ? '#382822' : '#346a99'; ctx.lineWidth = 1; ctx.stroke();
      // Hairline fractures and tiny highlights give each chunk a weathered surface.
      ctx.beginPath(); ctx.moveTo(3, -5); ctx.lineTo(1, -1); ctx.lineTo(5, 2);
      ctx.strokeStyle = ember ? '#392a24' : '#467d9d'; ctx.lineWidth = .65; ctx.stroke();
      ctx.fillStyle = ember ? '#e3ba86' : '#efffff'; ctx.fillRect(5, -5, 1.2, .8);
      ctx.restore();
    }
    for (let i = 0; i < 8; i++) {
      const phase = (i / 8 + time * .12) % 1;
      ctx.fillStyle = ember ? '#ffd69c' : '#d9fbff';
      ctx.globalAlpha *= .8; ctx.beginPath(); ctx.arc(Math.sin(i * 7) * (18 + phase * 12), 25 - phase * 61, 1.1, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha /= .8;
    }
  } else {
    // Layered cloud curls enclose a bright, branching electrical discharge.
    for (let i = 0; i < 8; i++) {
      const angle = i * 2.4 + time * .15;
      const x = Math.cos(angle) * 17, y = Math.sin(angle) * 21;
      const cloud = ctx.createRadialGradient(x - 3, y - 5, 1, x, y, 17);
      cloud.addColorStop(0, '#eee7ff'); cloud.addColorStop(.35, '#b2a1d9');
      cloud.addColorStop(.7, '#575473ee'); cloud.addColorStop(1, '#19283a00');
      ctx.fillStyle = cloud; ctx.fillRect(x - 17, y - 17, 34, 34);
    }
    ctx.beginPath(); ctx.moveTo(9, -29); ctx.lineTo(-3, -11); ctx.lineTo(7, -8);
    ctx.lineTo(-9, 12); ctx.lineTo(0, 10); ctx.lineTo(-12, 31);
    ctx.strokeStyle = '#968aff'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = '#f5f1ff'; ctx.lineWidth = 1.7; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, -5); ctx.lineTo(17, 1); ctx.lineTo(23, 15);
    ctx.strokeStyle = '#d6cfff'; ctx.lineWidth = .9; ctx.stroke();
  }
  ctx.restore();
  if ((spirit.flashUntilMs ?? 0) > spirit.ageMs) {
    ctx.save();
    ctx.globalAlpha *= Math.min(1, ((spirit.flashUntilMs ?? 0) - spirit.ageMs) / 250);
    ctx.strokeStyle = spirit.color; ctx.lineWidth = 2;
    if (spirit.beamTarget) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(spirit.beamTarget.x - spirit.x, spirit.beamTarget.y - spirit.y); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.3; ctx.stroke();
    } else {
      // Brief outward sparks show an ability without suggesting an approach zone.
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3 + .2;
        ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 33, Math.sin(angle) * 33);
        ctx.lineTo(Math.cos(angle) * 43, Math.sin(angle) * 43); ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();
}
