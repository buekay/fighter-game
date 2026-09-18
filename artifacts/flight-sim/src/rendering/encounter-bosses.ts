import { BOSS_NAMES, CITY_WEAPONS, type EncounterKind } from "../boss-encounters";

interface BossBody {
  x: number; y: number; width: number; height: number;
  hp: number; maxHp: number; color: string;
  encounterKind?: EncounterKind; citySlot?: number;
}

export function drawFortressCity(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  const left = width - 300;
  ctx.fillStyle = "#111c2e";
  ctx.fillRect(left, 65, 300, height - 110);
  ctx.strokeStyle = "#64748b"; ctx.lineWidth = 5;
  ctx.strokeRect(left, 65, 300, height - 110);
  // Dense city blocks, roads and illuminated windows behind the six defenders.
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 5; col++) {
      const x = left + 14 + col * 59;
      const y = 78 + row * ((height - 140) / 9);
      ctx.fillStyle = (row + col) % 2 ? "#334155" : "#263449";
      ctx.fillRect(x, y, 42, 38);
      ctx.fillStyle = "#fbbf2477";
      for (let w = 0; w < 3; w++) ctx.fillRect(x + 6 + w * 11, y + 8, 4, 12);
    }
  }
  ctx.fillStyle = "#fbbf24"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("FESTUNGSSTADT", left + 150, 55);
  ctx.restore();
}

export function drawEncounterBoss(ctx: CanvasRenderingContext2D, e: BossBody, time: number) {
  const kind = e.encounterKind!;
  ctx.save(); ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
  const w = e.width, h = e.height;
  ctx.lineWidth = 3; ctx.strokeStyle = e.color; ctx.fillStyle = "#253344";
  const box = (x: number, y: number, width: number, height: number, radius = 6) => {
    ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill(); ctx.stroke();
  };
  if (kind === "tank") {
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#111827"; box(-w / 2, side * h * .32 - 15, w, 30);
      ctx.fillStyle = "#64748b";
      for (let i = 0; i < 9; i++) ctx.fillRect(-w / 2 + 8 + i * 20, side * h * .32 - 11, 7, 22);
    }
    ctx.fillStyle = "#4d6338"; box(-w * .4, -h * .25, w * .8, h * .5);
    ctx.fillStyle = "#82945c"; box(-25, -27, 70, 54);
    ctx.fillStyle = "#28351c"; box(-w / 2, -9, w / 2, 18, 2);
  } else if (kind === "spider") {
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 7;
    for (const side of [-1, 1]) for (let leg = 0; leg < 4; leg++) {
      const x = (leg - 1.5) * w * .19;
      const step = Math.sin(time * .005 + leg * 2) * 7;
      ctx.beginPath(); ctx.moveTo(x * .45, side * 14);
      ctx.lineTo(x, side * h * .34); ctx.lineTo(x + step, side * h * .48); ctx.stroke();
    }
    ctx.fillStyle = "#332246"; ctx.beginPath(); ctx.ellipse(0, 0, w * .28, h * .27, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fb7185";
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(-w * .2, side * 10, 6, 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === "submarine") {
    ctx.fillStyle = "#163b50"; box(-w / 2, -h * .32, w, h * .64, 30);
    ctx.fillStyle = "#4b8290"; box(-10, -h / 2, 48, h * .3);
    ctx.beginPath(); ctx.moveTo(9, -h / 2); ctx.lineTo(9, -h / 2 - 12); ctx.lineTo(-12, -h / 2 - 12); ctx.stroke();
    ctx.fillStyle = "#67e8f9";
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-60 + i * 30, 0, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = "#94a3b8"; ctx.beginPath(); ctx.moveTo(w / 2, -22); ctx.lineTo(w / 2, 22); ctx.stroke();
  } else {
    const weapon = CITY_WEAPONS[e.citySlot ?? 0];
    ctx.fillStyle = "#374151"; box(-w / 2, -h / 2, w, h, 4);
    ctx.fillStyle = weapon === "flame" ? "#9a3412" : weapon === "rocket" ? "#164e63" : "#4d5c31";
    box(-25, -22, 54, 44);
    for (const side of [-1, 1]) box(-w / 2, side * 12 - 5, 35, 10, 2);
    ctx.fillStyle = weapon === "flame" ? "#fb923c" : "#e2e8f0";
    ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(weapon === "flame" ? "FLAMMENWERFER" : weapon === "rocket" ? "RAKETENWACHE" : "PANZERWACHE", 0, 4);
  }
  const barY = -h / 2 - 22;
  ctx.fillStyle = "#020617"; ctx.fillRect(-w / 2, barY, w, 7);
  ctx.fillStyle = e.color; ctx.fillRect(-w / 2, barY, w * Math.max(0, e.hp / e.maxHp), 7);
  ctx.fillStyle = "#f8fafc"; ctx.textAlign = "center"; ctx.font = "bold 12px sans-serif";
  ctx.fillText(`${kind === "city" ? "WACHE" : BOSS_NAMES[kind].toUpperCase()} · ${Math.ceil(e.hp)}`, 0, barY - 5);
  ctx.restore();
}
