import { getGhostAircraft, type GhostAircraftId, type GhostElement, type GhostWorld } from '../ghost-worlds';

const noise = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
function mist(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, opacity: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradient.addColorStop(0, color + Math.round(opacity * 255).toString(16).padStart(2, '0'));
  gradient.addColorStop(.5, color + Math.round(opacity * 90).toString(16).padStart(2, '0'));
  gradient.addColorStop(1, color + '00');
  ctx.fillStyle = gradient; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
}
export function drawGhostWorld(ctx: CanvasRenderingContext2D, world: GhostWorld, time: number, reducedMotion: boolean, economical: boolean): void {
  const t = reducedMotion ? 0 : time * .036;
  ctx.save();
  const sky = ctx.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(0, world.sky); sky.addColorStop(.62, world.horizon); sky.addColorStop(1, '#101b25');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 900, 600);
  mist(ctx, 630, 170, 330, 260, world.color, .15);
  // An eclipsed moon gives the scenery a consistent upper-right light source.
  const moon = ctx.createRadialGradient(633, 122, 3, 650, 140, 47);
  moon.addColorStop(0, '#dce8e5'); moon.addColorStop(.55, '#8badae'); moon.addColorStop(1, '#3a535c');
  ctx.fillStyle = moon; ctx.beginPath(); ctx.arc(650, 140, 44, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = world.sky + 'dd'; ctx.beginPath(); ctx.arc(632, 128, 42, 0, Math.PI * 2); ctx.fill();
  // Broken mountain ridges disappear into atmospheric perspective.
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath(); ctx.moveTo(-80, 600);
    for (let i = 0; i < 22; i++) {
      const x = i * 52 - 70;
      ctx.lineTo(x, 330 + layer * 65 - noise(i + layer * 37) * (85 + layer * 20));
    }
    ctx.lineTo(1000, 600); ctx.closePath();
    ctx.fillStyle = ['#26374480', '#192b35b0', '#10212ae0'][layer]; ctx.fill();
  }
  // A deep, irregular rift rather than a pair of drawn rings.
  ctx.save(); ctx.translate(360, 220); ctx.rotate(-.22);
  mist(ctx, 0, 0, 95, 160, world.color, .12);
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) {
    const a = i * Math.PI * 2 / 48; const rough = 1 + noise(i + 8) * .07;
    const x = Math.cos(a) * 43 * rough, y = Math.sin(a) * 108 * rough;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fillStyle = '#030a16b0'; ctx.fill(); ctx.strokeStyle = world.color + '65'; ctx.lineWidth = 1.3; ctx.stroke();
  for (let i = 0; i < 8; i++) mist(ctx, Math.cos(i * .8) * 47, Math.sin(i * .8) * 110, 19, 29, world.color, .12);
  ctx.restore();
  // Irregular stone masses have lit upper planes, dark fractures and hanging roots of rock.
  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i < 7; i++) {
      const seed = i + layer * 21;
      const x = ((i * 174 + layer * 84 - t * (layer + 1) * 3) % 1280 + 1280) % 1280 - 170;
      const y = 405 + noise(seed) * 95 + layer * 76;
      const w = 52 + noise(seed + 3) * 45;
      ctx.save(); ctx.globalAlpha = layer ? .92 : .52;
      const stone = ctx.createLinearGradient(x, y - 10, x + 10, y + 100);
      stone.addColorStop(0, '#657579'); stone.addColorStop(.18, '#394c51'); stone.addColorStop(.65, '#172a32'); stone.addColorStop(1, '#0b1722');
      ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * .6, y - 12); ctx.lineTo(x + w * .45, y - 18);
      ctx.lineTo(x + w, y - 3); ctx.lineTo(x + w * .7, y + 22); ctx.lineTo(x + w * .24, y + 53);
      ctx.lineTo(x + w * .1, y + 88); ctx.lineTo(x - w * .17, y + 58); ctx.lineTo(x - w * .5, y + 42); ctx.closePath();
      ctx.fillStyle = stone; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * .2, y + 7); ctx.lineTo(x + w, y - 3);
      ctx.strokeStyle = '#adc1bc55'; ctx.lineWidth = 1.1; ctx.stroke();
      for (let crack = 0; crack < 5; crack++) {
        const cx = x - w * .55 + crack * w * .25;
        ctx.beginPath(); ctx.moveTo(cx, y + 10); ctx.lineTo(cx + 5, y + 26); ctx.lineTo(cx - 2, y + 40 + noise(seed + crack) * 15);
        ctx.strokeStyle = '#08131c85'; ctx.lineWidth = 1; ctx.stroke();
      }
      // Crumbled masonry, with a bevel on its moonlit face.
      for (let pillar = 0; pillar < 3; pillar++) {
        const px = x - 28 + pillar * 25, height = 28 + noise(seed * 5 + pillar) * 45;
        const masonry = ctx.createLinearGradient(px - 5, 0, px + 8, 0);
        masonry.addColorStop(0, '#26363e'); masonry.addColorStop(.7, '#75868a'); masonry.addColorStop(1, '#a0b1ad');
        ctx.fillStyle = masonry; ctx.beginPath(); ctx.moveTo(px - 6, y - 4); ctx.lineTo(px - 5, y - height);
        ctx.lineTo(px + 1, y - height - 4); ctx.lineTo(px + 7, y - height + 3); ctx.lineTo(px + 6, y - 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#172730aa'; ctx.lineWidth = 1;
        for (let joint = 12; joint < height - 4; joint += 12) { ctx.beginPath(); ctx.moveTo(px - 5, y - joint); ctx.lineTo(px + 6, y - joint - 2); ctx.stroke(); }
      }
      ctx.restore();
    }
    for (let i = 0; i < (economical ? 5 : 10); i++) {
      const x = ((i * 137 - t * (layer + 1) * 7) % 1200 + 1200) % 1200 - 150;
      mist(ctx, x, 370 + layer * 160 + Math.sin(i * 3 + t * .04) * 37, 200, 47 + noise(i) * 40, '#afc6c6', .12);
    }
  }
  for (let i = 0; i < (economical ? 12 : 30); i++) {
    const x = ((i * 173.3 - t * 8) % 940 + 940) % 940;
    const y = 55 + (i * 83.7 % 500) + Math.sin(t * .3 + i) * 7;
    ctx.fillStyle = world.accent + '65'; ctx.beginPath(); ctx.arc(x, y, i % 4 === 0 ? 1.3 : .6, 0, Math.PI * 2); ctx.fill();
  }
  const vignette = ctx.createRadialGradient(450, 280, 160, 450, 280, 550);
  vignette.addColorStop(0, '#02071200'); vignette.addColorStop(1, '#020712a0');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, 900, 600);
  ctx.restore();
}

export function drawGhostAircraft(ctx: CanvasRenderingContext2D, enemy: { x: number; y: number; width: number; height: number; ghostAircraftId?: GhostAircraftId }, environment: GhostWorld, time: number, reducedMotion: boolean): void {
  const aircraft = getGhostAircraft(enemy.ghostAircraftId);
  const world = aircraft ? { ...environment, color: aircraft.color } : environment;
  const element = aircraft?.element;
  ctx.save(); ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
  ctx.scale(enemy.width / 80, enemy.height / 48);
  const pulse = reducedMotion ? .96 : .94 + Math.sin(time * .0015 + enemy.x * .02) * .05;
  // Vapor dissipates behind the engines; no repeated wireframe silhouettes.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const drift = reducedMotion ? 0 : Math.sin(time * .002 + i + side) * i * .7;
      mist(ctx, 29 + i * 8, side * 6 + drift, 10 + i * 3, 2 + i * 1.1, world.color, .12 - i * .018);
    }
  }
  ctx.globalAlpha = pulse;
  const metal = ctx.createLinearGradient(0, -23, 0, 23);
  metal.addColorStop(0, '#e0f4f2f0'); metal.addColorStop(.24, '#94bec8d0'); metal.addColorStop(.48, '#e1f8faf0'); metal.addColorStop(.57, '#54788ed0'); metal.addColorStop(1, '#29485bd0');
  ctx.fillStyle = metal; ctx.strokeStyle = '#e5ffff'; ctx.lineWidth = 1.1;
  const bomber = enemy.width >= 75;
  ctx.beginPath();
  if (aircraft && 'outline' in aircraft) {
    for (const [index, point] of aircraft.outline.entries()) {
      if (index === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    }
  } else if (aircraft?.id === 'ash-wing') {
    // Broad flying wing with four engine recesses.
    ctx.moveTo(-38, 0); ctx.lineTo(-14, -8); ctx.lineTo(-3, -22); ctx.lineTo(12, -22);
    ctx.lineTo(34, -12); ctx.lineTo(28, -7); ctx.lineTo(38, -3); ctx.lineTo(33, 0);
    ctx.lineTo(38, 3); ctx.lineTo(28, 7); ctx.lineTo(34, 12); ctx.lineTo(12, 22);
    ctx.lineTo(-3, 22); ctx.lineTo(-14, 8);
  } else if (aircraft?.id === 'tide-spear') {
    // Long narrow nose, short forward fins and split tail.
    ctx.moveTo(-39, 0); ctx.quadraticCurveTo(-21, -7, -7, -4); ctx.lineTo(-12, -14);
    ctx.lineTo(1, -11); ctx.lineTo(15, -21); ctx.lineTo(23, -18); ctx.lineTo(16, -5);
    ctx.lineTo(38, -10); ctx.lineTo(31, 0); ctx.lineTo(38, 10); ctx.lineTo(16, 5);
    ctx.lineTo(23, 18); ctx.lineTo(15, 21); ctx.lineTo(1, 11); ctx.lineTo(-12, 14);
    ctx.lineTo(-7, 4); ctx.quadraticCurveTo(-21, 7, -39, 0);
  } else if (aircraft?.id === 'frost-crown') {
    // A seven-point crystal crown wraps around the central fuselage.
    ctx.moveTo(-39, 0); ctx.lineTo(-16, -7); ctx.lineTo(-21, -20); ctx.lineTo(-3, -13);
    ctx.lineTo(5, -23); ctx.lineTo(14, -13); ctx.lineTo(31, -21); ctx.lineTo(27, -8);
    ctx.lineTo(39, 0); ctx.lineTo(27, 8); ctx.lineTo(31, 21); ctx.lineTo(14, 13);
    ctx.lineTo(5, 23); ctx.lineTo(-3, 13); ctx.lineTo(-21, 20); ctx.lineTo(-16, 7);
  } else if (aircraft?.id === 'storm-scythe') {
    // Swept crescent wings curve forward around an open central tail.
    ctx.moveTo(-38, 0); ctx.lineTo(-15, -5); ctx.bezierCurveTo(-30, -26, 15, -29, 37, -10);
    ctx.quadraticCurveTo(11, -17, 8, -5); ctx.lineTo(29, -3); ctx.lineTo(24, 0);
    ctx.lineTo(29, 3); ctx.quadraticCurveTo(7, 6, 37, 18);
    ctx.bezierCurveTo(8, 26, -26, 23, -15, 5);
  } else if (element === 'water') {
    ctx.moveTo(-38, 0); ctx.bezierCurveTo(-26, -10, -12, -4, -6, -9);
    ctx.bezierCurveTo(14, -29, 33, -23, 22, -14); ctx.quadraticCurveTo(11, -4, 38, -6);
    ctx.lineTo(31, 0); ctx.lineTo(38, 6); ctx.quadraticCurveTo(11, 4, 22, 14);
    ctx.bezierCurveTo(33, 23, 14, 29, -6, 9); ctx.bezierCurveTo(-12, 4, -26, 10, -38, 0);
  } else if (element === 'crystal') {
    ctx.moveTo(-39, 0); ctx.lineTo(-12, -6); ctx.lineTo(-2, -22); ctx.lineTo(7, -13);
    ctx.lineTo(21, -23); ctx.lineTo(18, -9); ctx.lineTo(37, -15); ctx.lineTo(29, 0);
    ctx.lineTo(37, 15); ctx.lineTo(18, 9); ctx.lineTo(21, 23); ctx.lineTo(7, 13);
    ctx.lineTo(-2, 22); ctx.lineTo(-12, 6);
  } else if (element === 'storm') {
    ctx.moveTo(-39, 0); ctx.lineTo(-8, -5); ctx.lineTo(14, -23); ctx.lineTo(8, -9);
    ctx.lineTo(29, -17); ctx.lineTo(21, -5); ctx.lineTo(38, -5); ctx.lineTo(31, 0);
    ctx.lineTo(38, 5); ctx.lineTo(21, 5); ctx.lineTo(29, 17); ctx.lineTo(8, 9);
    ctx.lineTo(14, 23); ctx.lineTo(-8, 5);
  } else {
    ctx.moveTo(-38, 0); ctx.bezierCurveTo(-28, -5, -18, -5, -10, -5);
    ctx.lineTo(bomber ? 3 : 13, -23); ctx.lineTo(24, -21); ctx.lineTo(16, -5);
    ctx.lineTo(29, -5); ctx.lineTo(34, -12); ctx.lineTo(39, -11); ctx.lineTo(36, 0);
    ctx.lineTo(39, 11); ctx.lineTo(34, 12); ctx.lineTo(29, 5); ctx.lineTo(16, 5);
    ctx.lineTo(24, 21); ctx.lineTo(bomber ? 3 : 13, 23); ctx.lineTo(-10, 5); ctx.bezierCurveTo(-18, 5, -28, 5, -38, 0);
  }
  ctx.closePath();
  ctx.save(); ctx.strokeStyle = '#07131f'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  ctx.fill(); ctx.stroke();
  ctx.save(); ctx.clip(); ctx.fillStyle = world.color + '65'; ctx.fillRect(-40, -24, 80, 48); ctx.restore();
  // Curved fuselage and glass canopy catch the same overhead light as the ruins.
  const fuselage = ctx.createLinearGradient(0, -5, 0, 6);
  fuselage.addColorStop(0, '#64818e90'); fuselage.addColorStop(.28, '#edf7f1d0'); fuselage.addColorStop(.55, '#8baeb7a0'); fuselage.addColorStop(1, '#142737c0');
  ctx.fillStyle = fuselage; ctx.beginPath(); ctx.ellipse(-3, 0, 33, 5, 0, 0, Math.PI * 2); ctx.fill();
  const canopy = ctx.createLinearGradient(-18, -4, -10, 4);
  canopy.addColorStop(0, '#d3f9ff'); canopy.addColorStop(.3, '#628b9c'); canopy.addColorStop(1, '#102335');
  ctx.fillStyle = canopy; ctx.beginPath(); ctx.ellipse(-17, -.5, 8, 2.7, -.02, 0, Math.PI * 2); ctx.fill();
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#172c3eaa'; ctx.beginPath(); ctx.ellipse(19, side * 6, 11, 2.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b7d3d480'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(-7, side * 5); ctx.lineTo(15, side * 19); ctx.lineTo(19, side * 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, side * 7); ctx.lineTo(13, side * 14); ctx.strokeStyle = '#18313f90'; ctx.stroke();
    mist(ctx, 30, side * 6, 8, 3, world.color, .45);
  }
  ctx.strokeStyle = world.color; ctx.lineWidth = 1.3;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(-5, side * 4);
    if (element === 'water') { ctx.bezierCurveTo(16, side * 4, 2, side * 19, 22, side * 16); }
    else if (element === 'storm') { ctx.lineTo(8, side * 8); ctx.lineTo(3, side * 13); ctx.lineTo(22, side * 18); }
    else { ctx.lineTo(5, side * 10); ctx.lineTo(17, side * 8); ctx.lineTo(21, side * 18); }
    ctx.stroke();
  }
  ctx.fillStyle = world.color; ctx.beginPath(); ctx.ellipse(2, 0, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = world.color + '65'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(-32, -1); ctx.lineTo(-24, -3); ctx.stroke();
  ctx.restore();
}

/** All elemental shots share the same small collision body; trails are cosmetic. */
export function drawGhostShot(ctx: CanvasRenderingContext2D, shot: { x: number; y: number; vx: number; vy: number; color?: string }, element: GhostElement): void {
  ctx.save(); ctx.translate(shot.x, shot.y); ctx.rotate(Math.atan2(shot.vy, shot.vx));
  const color = shot.color ?? '#ddffff';
  const trail = ctx.createLinearGradient(-20, 0, 4, 0);
  trail.addColorStop(0, color + '00'); trail.addColorStop(1, color + 'b0');
  ctx.fillStyle = trail; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(0, -3); ctx.lineTo(4, 0); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = color; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
  ctx.beginPath();
  if (element === 'crystal') { ctx.moveTo(5, 0); ctx.lineTo(-1, -4); ctx.lineTo(-6, 0); ctx.lineTo(-1, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (element === 'storm') { ctx.moveTo(-10, 2); ctx.lineTo(-3, -3); ctx.lineTo(0, 2); ctx.lineTo(6, -1); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke(); }
  else { ctx.ellipse(0, 0, element === 'water' ? 5 : 4, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff8df'; ctx.beginPath(); ctx.ellipse(1, -1, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
