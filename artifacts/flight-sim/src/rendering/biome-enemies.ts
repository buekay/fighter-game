import type { BiomeEnemyVisual } from "../biomes";

// Local hull bounds include barrels, feet, rotors and the outer stroke.
// Exhaust and status indicators are cosmetic and keep their separate sizing.
const MODEL_BOUNDS: Record<BiomeEnemyVisual, readonly [number, number, number, number]> = {
  interceptor: [-24.75, -18.75, 34, 18.75],
  drone: [-23.5, -24.5, 19.5, 24.5],
  tank: [-25, -15, 36, 18],
  skimmer: [-31.5, -7.5, 35, 17],
  ship: [-34.5, -16.5, 34, 22],
  submarine: [-34.5, -17.5, 34.5, 22],
  helicopter: [-38, -12.5, 35, 20],
  crawler: [-26.5, -23.5, 31, 12.5],
  cruiser: [-34.75, -18.75, 40, 18.75],
  delta: [-25.5, -17.5, 28.5, 17.5],
  orbiter: [-22.5, -19.5, 22.5, 19.5],
  walker: [-22.5, -21.5, 27, 18.5],
  battery: [-27, -14, 30, 17.5],
  frigate: [-31.5, -18.5, 32, 18.5],
};

export function getBiomeEnemyRenderTransform(visual: BiomeEnemyVisual, width: number, height: number) {
  const [left, top, right, bottom] = MODEL_BOUNDS[visual];
  return {
    scaleX: width / (right - left),
    scaleY: height / (bottom - top),
    offsetX: -(left + right) / 2,
    offsetY: -(top + bottom) / 2,
  };
}

export function drawBiomeEnemyBody(
  ctx: CanvasRenderingContext2D,
  visual: BiomeEnemyVisual,
  body: string,
  accent: string,
  pulse: number,
  hullGradient: (dark: string, mid: string, highlight?: string) => CanvasGradient,
  width: number,
  height: number,
) {
  const drawPanelLine = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = "#ffffff3d"; ctx.lineWidth = .8; ctx.stroke();
  };
  const outline = "#ffffff88";
  const modelTransform = getBiomeEnemyRenderTransform(visual, width, height);
  ctx.save();
  ctx.scale(modelTransform.scaleX, modelTransform.scaleY);
  ctx.translate(modelTransform.offsetX, modelTransform.offsetY);
  ctx.lineWidth = 1;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";

  if (drawExtendedBiomeEnemy(ctx, visual, body, accent, hullGradient("#111820", body, accent), pulse)) {
    // Additional silhouettes share the biome palette and metal finish.
  } else if (visual === "tank") {
    // Local Y is inverted by the enemy-facing rotation above.
    ctx.fillStyle = "#111820";
    ctx.beginPath(); ctx.roundRect(-25, -15, 48, 12, 6); ctx.fill();
    for (let x = -18; x <= 16; x += 11) {
      ctx.beginPath(); ctx.arc(x, -9, 4, 0, Math.PI * 2); ctx.fillStyle = "#4b5563"; ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-22, -3); ctx.lineTo(-15, 10); ctx.lineTo(14, 10); ctx.lineTo(24, 1); ctx.lineTo(18, -4); ctx.closePath();
    ctx.fillStyle = hullGradient("#111820", body, accent); ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
    ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(-5, 8, 22, 10, 4); ctx.fill();
    ctx.fillStyle = accent; ctx.fillRect(11, 12, 25, 4);
    ctx.beginPath(); ctx.arc(2, 13, 3, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
  } else if (visual === "ship" || visual === "submarine") {
    ctx.beginPath();
    if (visual === "ship") {
      ctx.moveTo(31, -4); ctx.lineTo(20, -16); ctx.lineTo(-28, -15); ctx.lineTo(-34, -4); ctx.closePath();
    } else {
      ctx.ellipse(0, -4, 34, 13, 0, 0, Math.PI * 2);
    }
    ctx.fillStyle = hullGradient("#07131c", body, accent); ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
    ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(-10, 0, 24, 11, 3); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(3, 10); ctx.lineTo(3, 21); ctx.lineTo(10, 21); ctx.stroke();
    ctx.fillStyle = accent; ctx.fillRect(12, 5, visual === "ship" ? 22 : 13, 3);
    if (visual === "ship") {
      ctx.fillStyle = "#dff8ff"; ctx.fillRect(-6, 4, 5, 4); ctx.fillRect(2, 4, 5, 4);
    }
  } else if (visual === "helicopter") {
    ctx.beginPath(); ctx.ellipse(4, 0, 23, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = hullGradient("#101a13", body, accent); ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-16, 2); ctx.lineTo(-37, 8); ctx.lineTo(-38, 2); ctx.lineTo(-14, -4); ctx.closePath();
    ctx.fillStyle = body; ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 19); ctx.moveTo(-28, 7); ctx.lineTo(-34, 15); ctx.moveTo(-34, 7); ctx.lineTo(-28, 15); ctx.stroke();
    ctx.strokeStyle = "#d9f7ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-31, 19); ctx.lineTo(31, 19); ctx.stroke();
    ctx.fillStyle = accent; ctx.fillRect(18, -2, 17, 3);
  } else if (visual === "drone") {
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = hullGradient("#071018", body, accent); ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(-2, side * 17, 21, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = accent; ctx.stroke();
      ctx.beginPath(); ctx.arc(5, side * 17, 3, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(9, 0, 5 + pulse, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
  } else if (visual === "crawler") {
    ctx.beginPath();
    ctx.moveTo(24, 0); ctx.lineTo(12, 12); ctx.lineTo(-17, 10); ctx.lineTo(-26, 0); ctx.lineTo(-14, -8); ctx.lineTo(14, -8); ctx.closePath();
    ctx.fillStyle = hullGradient("#170d08", body, accent); ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
    ctx.strokeStyle = body; ctx.lineWidth = 5;
    for (const x of [-16, -2, 12]) {
      ctx.beginPath(); ctx.moveTo(x, -5); ctx.lineTo(x - 7, -18); ctx.lineTo(x + 1, -21); ctx.stroke();
    }
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(10, 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(14, 0, 17, 3);
  } else if (visual === "skimmer") {
    ctx.beginPath();
    ctx.moveTo(31, 1); ctx.lineTo(16, 11); ctx.lineTo(-22, 9); ctx.lineTo(-31, -3); ctx.lineTo(10, -7); ctx.closePath();
    ctx.fillStyle = hullGradient("#051720", body, accent); ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(0, 17); ctx.lineTo(14, 16); ctx.lineTo(18, 8); ctx.closePath();
    ctx.fillStyle = accent + "88"; ctx.fill();
    ctx.fillStyle = accent; ctx.fillRect(15, 3, 20, 3);
  } else if (visual === "cruiser") {
    ctx.beginPath();
    ctx.moveTo(38, 0); ctx.lineTo(14, 10); ctx.lineTo(-14, 18); ctx.lineTo(-34, 10);
    ctx.lineTo(-25, 0); ctx.lineTo(-34, -10); ctx.lineTo(-14, -18); ctx.lineTo(14, -10); ctx.closePath();
    ctx.fillStyle = hullGradient("#070515", body, accent); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(4, 0, 13, 7, 0, 0, Math.PI * 2); ctx.fillStyle = accent + "88"; ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(28, -2, 12, 4);
    drawPanelLine(-22, -8, 18, -5); drawPanelLine(-22, 8, 18, 5);
  } else {
    ctx.beginPath();
    ctx.moveTo(29, 0); ctx.lineTo(5, -6); ctx.lineTo(-16, -18); ctx.lineTo(-10, -4);
    ctx.lineTo(-24, 0); ctx.lineTo(-10, 4); ctx.lineTo(-16, 18); ctx.lineTo(5, 6); ctx.closePath();
    ctx.fillStyle = hullGradient("#090b16", body, accent); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(7, 0, 9, 4, 0, 0, Math.PI * 2); ctx.fillStyle = accent + "99"; ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(20, -1.5, 14, 3);
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

// Draw in the same left-facing local coordinates as the existing enemy models.
export function drawExtendedBiomeEnemy(
  ctx: CanvasRenderingContext2D,
  visual: BiomeEnemyVisual,
  body: string,
  accent: string,
  hull: CanvasGradient,
  pulse: number,
): boolean {
  const finishHull = () => {
    ctx.fillStyle = hull;
    ctx.fill();
    ctx.strokeStyle = "#d8e7eeaa";
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  switch (visual) {
    case "delta": {
      ctx.beginPath();
      ctx.moveTo(28, 0); ctx.lineTo(-23, -17); ctx.lineTo(-15, -4);
      ctx.lineTo(-25, 0); ctx.lineTo(-15, 4); ctx.lineTo(-23, 17); ctx.closePath();
      finishHull();
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-19, -12); ctx.lineTo(14, 0); ctx.lineTo(-19, 12); ctx.stroke();
      ctx.fillStyle = accent + "bb";
      ctx.beginPath(); ctx.ellipse(9, 0, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#edfaff";
      ctx.fillRect(5, -10, 13, 2); ctx.fillRect(5, 8, 13, 2);
      break;
    }
    case "orbiter": {
      ctx.strokeStyle = body; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 17, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(18, 0); ctx.lineTo(0, -10); ctx.lineTo(-14, 0); ctx.lineTo(0, 10); ctx.closePath();
      finishHull();
      for (const y of [-16, 16]) {
        ctx.beginPath(); ctx.roundRect(-7, y - 3, 14, 6, 2); finishHull();
        ctx.fillStyle = accent; ctx.fillRect(1, y - 1, 5, 2);
      }
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(6, 0, 4 + pulse, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "walker": {
      ctx.lineCap = "round";
      for (const x of [-13, 10]) {
        ctx.strokeStyle = "#151d24"; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 6, -11); ctx.lineTo(x + 3, -18); ctx.stroke();
        ctx.strokeStyle = body; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.arc(x - 6, -11, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#24313b"; ctx.fillRect(x - 2, -20, 14, 4);
      }
      ctx.beginPath(); ctx.roundRect(-19, -2, 36, 19, 5); finishHull();
      ctx.beginPath(); ctx.roundRect(0, 7, 18, 11, 3); finishHull();
      ctx.fillStyle = accent; ctx.fillRect(10, 10, 17, 4);
      ctx.fillStyle = "#eaffff"; ctx.fillRect(5, 14, 7, 2);
      ctx.lineCap = "butt";
      break;
    }
    case "battery": {
      ctx.fillStyle = "#141c24";
      ctx.beginPath(); ctx.roundRect(-27, -14, 49, 11, 4); ctx.fill();
      for (let x = -20; x <= 16; x += 9) {
        ctx.beginPath(); ctx.arc(x, -9, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#74828b"; ctx.fill();
      }
      ctx.beginPath(); ctx.roundRect(-25, -4, 48, 13, 4); finishHull();
      ctx.beginPath();
      ctx.moveTo(-13, 7); ctx.lineTo(-17, 17); ctx.lineTo(16, 17); ctx.lineTo(22, 7); ctx.closePath();
      finishHull();
      for (const x of [-8, 2, 12]) {
        ctx.fillStyle = "#141c24"; ctx.fillRect(x - 3, 10, 7, 5);
        ctx.fillStyle = accent; ctx.fillRect(x, 11, 3, 3);
      }
      ctx.fillStyle = accent; ctx.fillRect(20, 0, 10, 3);
      break;
    }
    case "frigate": {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(31, side * 12); ctx.lineTo(17, side * 18);
        ctx.lineTo(-27, side * 18); ctx.lineTo(-31, side * 9); ctx.lineTo(18, side * 7); ctx.closePath();
        finishHull();
        ctx.fillStyle = accent; ctx.fillRect(-23, side * 13 - 1, 14, 2);
        ctx.fillStyle = "#edfaff"; ctx.fillRect(19, side * 12 - 1, 13, 2);
      }
      ctx.beginPath();
      ctx.moveTo(25, 0); ctx.lineTo(7, -8); ctx.lineTo(-22, -7);
      ctx.lineTo(-28, 0); ctx.lineTo(-22, 7); ctx.lineTo(7, 8); ctx.closePath();
      finishHull();
      ctx.fillStyle = accent + "aa";
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = accent;
      ctx.beginPath(); ctx.moveTo(-16, -5); ctx.lineTo(-16, 5); ctx.stroke();
      break;
    }
    default: return false;
  }
  return true;
}
