import type { BiomeEnemyVisual } from "../biomes";

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
