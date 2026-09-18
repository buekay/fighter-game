import { BOSS_NAMES, CITY_WEAPONS, ENCOUNTER_HEALTH, type EncounterKind } from "../boss-encounters";
import { SPECIAL_NAMES, SPECIAL_WARNING_FRAMES, type BossSpecialState } from "../boss-specials";

export interface BossBody {
  x: number; y: number; width: number; height: number;
  hp: number; maxHp: number; color: string;
  encounterKind?: EncounterKind; citySlot?: number;
  titanShieldTimer?: number; poisonTimer?: number; ultimateFreezeTimer?: number;
  bossCannonsDisabled?: boolean; bossEngineDisabled?: boolean;
}
export const BOSS_ACCENTS: Record<EncounterKind, string> = {
  titan: "#e879f9", tank: "#fbbf24", spider: "#c084fc", submarine: "#67e8f9", city: "#fb923c",
};
const CODE: Record<EncounterKind, string> = { titan: "T-01 / PROMETHEUS", tank: "P-02 / IRONCLAD", spider: "S-03 / ARACHNE", submarine: "U-04 / ABYSS", city: "C-05 / CITADEL" };

// Shared metalwork. All bodies use a 300 × 220 design space inside their hitbox.
function metal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dark = false) {
  const g = ctx.createLinearGradient(x, y, x + w * .3, y + h);
  g.addColorStop(0, dark ? "#293340" : "#a3b0b8"); g.addColorStop(.18, dark ? "#111923" : "#586775");
  g.addColorStop(.54, dark ? "#26323d" : "#374653"); g.addColorStop(.8, dark ? "#101720" : "#657582"); g.addColorStop(1, "#101821");
  return g;
}
function plate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dark = false, bevel = 6) {
  ctx.beginPath(); ctx.moveTo(x + bevel, y); ctx.lineTo(x + w - bevel, y); ctx.lineTo(x + w, y + bevel);
  ctx.lineTo(x + w, y + h - bevel); ctx.lineTo(x + w - bevel, y + h); ctx.lineTo(x + bevel, y + h);
  ctx.lineTo(x, y + h - bevel); ctx.lineTo(x, y + bevel); ctx.closePath();
  ctx.fillStyle = metal(ctx, x, y, w, h, dark); ctx.fill(); ctx.strokeStyle = "#a8bac877"; ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = "#dce6eb88"; ctx.beginPath(); ctx.moveTo(x + bevel, y + 2); ctx.lineTo(x + w - bevel, y + 2); ctx.stroke();
  if (w > 20 && h > 18) for (const rx of [x + 7, x + w - 7]) for (const ry of [y + 7, y + h - 7]) {
    ctx.fillStyle = "#020711"; ctx.beginPath(); ctx.arc(rx, ry, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#bdc9d3"; ctx.fillRect(rx - 1, ry - 1.5, 2, 1);
  }
}
function joint(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, accent: string, turn = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(turn);
  ctx.fillStyle = metal(ctx, -r, -r, r * 2, r * 2); ctx.strokeStyle = "#b8c8d0"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillStyle = "#0a111b"; ctx.fillRect(r * .55, -1.2, r * .3, 2.4); }
  ctx.fillStyle = "#080f19"; ctx.beginPath(); ctx.arc(0, 0, r * .53, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * .4, -.5, Math.PI * 1.2); ctx.stroke(); ctx.restore();
}
function piston(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, thickness = 8) {
  ctx.lineCap = "round"; ctx.strokeStyle = "#060c15"; ctx.lineWidth = thickness + 4;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  ctx.strokeStyle = "#a5b4be"; ctx.lineWidth = thickness * .5; ctx.stroke();
  ctx.strokeStyle = "#495865"; ctx.lineWidth = thickness;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (bx - ax) * .53, ay + (by - ay) * .53); ctx.stroke();
  ctx.lineCap = "butt";
}
function vents(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, height: number) {
  ctx.fillStyle = "#050b12";
  for (let i = 0; i < count; i++) { ctx.fillRect(x + i * 6, y, 3, height); ctx.fillStyle = "#93a6b066"; ctx.fillRect(x + i * 6, y, 1, height); ctx.fillStyle = "#050b12"; }
}
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, accent: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "#fff8e6"); g.addColorStop(.18, accent); g.addColorStop(.48, accent + "aa"); g.addColorStop(1, accent + "00");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function barrel(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, accent: string, double = false) {
  plate(ctx, x, y - 8, length, 16, true, 3);
  ctx.fillStyle = "#9dabb5"; ctx.fillRect(x + 7, y - 9, 5, 18); ctx.fillRect(x + length - 9, y - 9, 4, 18);
  ctx.fillStyle = "#03080f"; ctx.fillRect(x - 2, y - 6, 6, 12);
  ctx.fillStyle = accent; ctx.fillRect(x - 1, y - (double ? 4 : 2), 2, double ? 8 : 4);
}

export function drawFortressCity(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save(); ctx.translate(width - 405, 90);
  const h = height - 145;
  // Armored arcology platform with a central service trench and dense extruded towers.
  ctx.fillStyle = "#000711bb"; ctx.fillRect(-12, 12, 420, h + 8);
  plate(ctx, 0, 0, 402, h, true, 18);
  ctx.fillStyle = "#0a1019"; ctx.fillRect(182, 12, 24, h - 24);
  ctx.setLineDash([9, 7]); ctx.strokeStyle = "#fbbf2477"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(194, 14); ctx.lineTo(194, h - 14); ctx.stroke(); ctx.setLineDash([]);
  for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
    const x = 18 + col * 61 + (col > 2 ? 8 : 0), y = 18 + row * 68;
    const rise = 10 + (row * 3 + col * 7) % 19;
    ctx.fillStyle = "#050b13"; ctx.fillRect(x + 6, y + 9, 44, 47);
    plate(ctx, x, y - rise, 41, 50 + rise, true, 3);
    ctx.fillStyle = "#748492"; ctx.fillRect(x + 3, y - rise + 3, 35, 5);
    ctx.fillStyle = (col + row) % 3 ? "#fbbf24aa" : "#67e8f9aa";
    for (let floor = 0; floor < 4; floor++) for (let win = 0; win < 3; win++) {
      ctx.fillRect(x + 7 + win * 10, y + floor * 10, 3, 4);
    }
    if ((row + col) % 4 === 0) { piston(ctx, x + 20, y - rise, x + 20, y - rise - 12, 2); glow(ctx, x + 20, y - rise - 12, 4, "#fb7185"); }
  }
  for (let y = 30; y < h; y += 65) { plate(ctx, -8, y, 18, 35, false, 3); ctx.fillStyle = "#fbbf24"; ctx.fillRect(-5, y + 8, 4, 15); }
  ctx.restore();
}

export function drawEncounterBoss(ctx: CanvasRenderingContext2D, e: BossBody, time: number) {
  const kind = e.encounterKind!;
  const accent = BOSS_ACCENTS[kind];
  ctx.save(); ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
  ctx.scale(e.width / 300, e.height / 220);
  // Contact shadow maintains depth without per-frame blur filters.
  ctx.fillStyle = "#00071388"; ctx.beginPath(); ctx.ellipse(8, 15, 133, 88, 0, 0, Math.PI * 2); ctx.fill();
  if (kind === "tank") {
    for (const side of [-1, 1]) {
      plate(ctx, -140, side * 76 - 25, 280, 50, true, 14);
      for (let i = 0; i < 12; i++) {
        const x = -130 + i * 22;
        plate(ctx, x, side * 76 - 21, 17, 42, true, 2);
        ctx.fillStyle = "#91a0aa55"; ctx.fillRect(x + 2, side * 76 - 15, 12, 3);
      }
      for (let i = 0; i < 6; i++) joint(ctx, -109 + i * 43, side * 76, 13, "#818d98", time * .001);
      piston(ctx, -93, side * 34, -112, side * 61); piston(ctx, 87, side * 34, 110, side * 61);
    }
    plate(ctx, -113, -57, 244, 114, false, 25);
    plate(ctx, 66, -45, 52, 90, true); vents(ctx, 74, -32, 6, 64);
    for (const side of [-1, 1]) {
      plate(ctx, -95, side * 40 - 13, 94, 26, true);
      ctx.fillStyle = accent; for (let i = 0; i < 5; i++) ctx.fillRect(-83 + i * 14, side * 40 - 6, 5, 12);
    }
    joint(ctx, 11, 0, 49, accent, time * .0002);
    plate(ctx, -54, -33, 100, 66, false, 18);
    piston(ctx, -35, -24, -117, -24, 9); piston(ctx, -35, 24, -117, 24, 9);
    barrel(ctx, -148, 0, 121, accent, true);
    plate(ctx, 11, -19, 28, 38, true); glow(ctx, 25, 0, 14, accent);
    ctx.fillStyle = "#e5e7eb"; ctx.font = "bold 8px monospace"; ctx.fillText("02 / SIEGE", 64, 6);
  } else if (kind === "spider") {
    for (const side of [-1, 1]) for (let leg = 0; leg < 4; leg++) {
      const rootX = -52 + leg * 34, kneeX = -116 + leg * 74;
      const step = Math.sin(time * .003 + leg * 1.7 + side) * 7;
      const kneeY = side * (62 + (leg % 2) * 8), footX = Math.max(-143, Math.min(143, kneeX + (leg < 2 ? -13 : 13) + step));
      piston(ctx, rootX, side * 25, kneeX, kneeY, 13);
      piston(ctx, kneeX, kneeY, footX, side * 102, 9);
      joint(ctx, kneeX, kneeY, 10, accent); joint(ctx, rootX, side * 25, 8, accent);
      plate(ctx, footX - 7, side * 102 - 5, 14, 10, true, 2);
      ctx.strokeStyle = accent + "77"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rootX, side * 29); ctx.quadraticCurveTo(kneeX + 15, side * 34, kneeX, kneeY); ctx.stroke();
    }
    plate(ctx, -66, -42, 145, 84, false, 24);
    plate(ctx, 23, -31, 45, 62, true, 10); vents(ctx, 30, -23, 6, 46);
    joint(ctx, -10, 0, 31, accent, -time * .0006); glow(ctx, -10, 0, 21, accent);
    plate(ctx, -103, -25, 43, 50, true, 12);
    for (const y of [-14, 0, 14]) glow(ctx, -91, y, 6, "#fb7185");
    for (const side of [-1, 1]) { piston(ctx, -82, side * 20, -121, side * 33, 8); barrel(ctx, -141, side * 31, 30, accent); }
  } else if (kind === "submarine") {
    for (const side of [-1, 1]) {
      plate(ctx, 52, side * 66 - 18, 64, 36, true, 10);
      piston(ctx, 83, side * 28, 101, side * 76, 10);
      plate(ctx, -90, side * 55 - 14, 78, 28, true);
      for (let i = 0; i < 4; i++) joint(ctx, -78 + i * 17, side * 55, 6, accent);
    }
    ctx.beginPath(); ctx.ellipse(-6, 0, 138, 65, 0, 0, Math.PI * 2);
    ctx.fillStyle = metal(ctx, -145, -65, 280, 130); ctx.fill(); ctx.strokeStyle = "#a4bdc9"; ctx.lineWidth = 2; ctx.stroke();
    for (let rib = 0; rib < 7; rib++) {
      const x = -95 + rib * 30;
      ctx.strokeStyle = "#080f1ccc"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(x, 0, 8, 57 - Math.abs(x) * .11, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.strokeStyle = "#b7cbd855"; ctx.lineWidth = 1; ctx.stroke();
    }
    plate(ctx, -38, -38, 104, 76, true, 19);
    plate(ctx, -10, -24, 42, 48, false, 8); joint(ctx, 11, 0, 14, accent, time * .0008);
    piston(ctx, 8, -23, 8, -83, 5); barrel(ctx, -15, -84, 29, accent);
    for (const side of [-1, 1]) { barrel(ctx, -146, side * 24, 33, accent, true); glow(ctx, -107, side * 20, 8, accent); }
    joint(ctx, 125, 0, 26, accent, time * .006);
    for (const y of [-40, 40]) { ctx.fillStyle = accent; ctx.fillRect(-66, y, 82, 2); }
    ctx.fillStyle = "#cedae2"; ctx.font = "bold 9px monospace"; ctx.fillText("U-04", 42, 4);
  } else if (kind === "titan") {
    for (const side of [-1, 1]) {
      piston(ctx, 20, side * 20, 83, side * 76, 14);
      plate(ctx, -86, side * 67 - 30, 213, 60, true, 17);
      plate(ctx, -51, side * 67 - 19, 133, 38, false, 11);
      vents(ctx, 47, side * 67 - 13, 5, 26);
      for (let i = 0; i < 3; i++) barrel(ctx, -141 + i * 4, side * (52 + i * 13), 66, accent);
      glow(ctx, 125, side * 67, e.bossEngineDisabled ? 5 : 23, "#67e8f9");
    }
    plate(ctx, -75, -40, 202, 80, false, 22);
    plate(ctx, -115, -21, 111, 42, true, 12);
    joint(ctx, 13, 0, 43, accent, time * .0004);
    joint(ctx, 13, 0, 30, "#67e8f9", -time * .0007); glow(ctx, 13, 0, 24, accent);
    plate(ctx, 66, -24, 44, 48, true); vents(ctx, 72, -15, 5, 30);
    for (const side of [-1, 1]) { ctx.strokeStyle = "#67e8f9"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-37, side * 26); ctx.lineTo(-61, side * 14); ctx.lineTo(-106, side * 14); ctx.stroke(); }
    if ((e.titanShieldTimer ?? 0) > 0) {
      ctx.strokeStyle = "#67e8f9bb"; ctx.fillStyle = "#67e8f912"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, 149, 108, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([5, 7]); ctx.strokeStyle = "#e879f9"; ctx.stroke(); ctx.setLineDash([]);
    }
  } else {
    const weapon = CITY_WEAPONS[e.citySlot ?? 0];
    plate(ctx, -147, -102, 294, 204, true, 15);
    for (const side of [-1, 1]) {
      plate(ctx, -122, side * 71 - 20, 246, 40, false);
      vents(ctx, 58, side * 71 - 12, 9, 24);
      piston(ctx, 60, side * 36, 90, side * 64, 10);
    }
    joint(ctx, 12, 0, 60, accent, time * .0001);
    plate(ctx, -67, -40, 134, 80, false, 16);
    if (weapon === "flame") {
      for (const side of [-1, 1]) { plate(ctx, 69, side * 29 - 18, 54, 36, true, 12); ctx.fillStyle = "#f97316"; ctx.fillRect(78, side * 29 - 12, 8, 24); barrel(ctx, -146, side * 23, 92, "#fb923c", true); }
      glow(ctx, -41, 0, 19, "#fb923c");
    } else if (weapon === "rocket") {
      for (const side of [-1, 1]) {
        plate(ctx, -84, side * 27 - 18, 139, 36, true);
        for (let i = 0; i < 5; i++) joint(ctx, -68 + i * 25, side * 27, 8, "#fb7185");
      }
    } else { barrel(ctx, -147, -15, 125, "#fbbf24", true); barrel(ctx, -147, 15, 125, "#fbbf24", true); joint(ctx, 27, 0, 19, "#fbbf24"); }
    // Individual module condition; the full city's HP lives in the shared boss bar.
    ctx.fillStyle = "#050a12"; ctx.fillRect(-113, 89, 226, 5);
    ctx.fillStyle = accent; ctx.fillRect(-113, 89, 226 * Math.max(0, e.hp / e.maxHp), 5);
  }
  if (e.hp / e.maxHp < .6) {
    ctx.strokeStyle = "#03060bdd"; ctx.lineWidth = 2;
    for (let i = 0; i < (e.hp / e.maxHp < .3 ? 7 : 3); i++) { const x = 25 + i * 12; ctx.beginPath(); ctx.moveTo(x, -22); ctx.lineTo(x - 14, -7); ctx.lineTo(x - 7, 5); ctx.stroke(); }
    glow(ctx, 60, 17, 9, "#fb923c");
  }
  if ((e.poisonTimer ?? 0) > 0 || (e.ultimateFreezeTimer ?? 0) > 0) {
    ctx.strokeStyle = (e.ultimateFreezeTimer ?? 0) > 0 ? "#a5f3fc" : "#fb7185"; ctx.lineWidth = 2;
    ctx.strokeRect(-148, -108, 296, 216);
  }
  ctx.restore();
}

export function drawEncounterHealthBar(ctx: CanvasRenderingContext2D, enemies: readonly BossBody[], viewWidth: number, top: number, state?: BossSpecialState | null) {
  const first = enemies[0]; if (!first?.encounterKind) return;
  const kind = first.encounterKind;
  const hp = enemies.reduce((total, e) => total + Math.max(0, e.hp), 0);
  const maxHp = kind === "city" ? ENCOUNTER_HEALTH : first.maxHp;
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const width = Math.min(460, viewWidth - 60), x = (viewWidth - width) / 2;
  const phase = ratio <= .3 ? 3 : ratio <= .6 ? 2 : 1;
  ctx.save();
  plate(ctx, x - 12, top, width + 24, 60, true, 8);
  ctx.fillStyle = "#e5edf5"; ctx.font = "bold 12px monospace"; ctx.textAlign = "left";
  ctx.fillText(BOSS_NAMES[kind].toUpperCase(), x, top + 15);
  ctx.fillStyle = BOSS_ACCENTS[kind]; ctx.textAlign = "right";
  ctx.fillText(`PHASE ${phase}  ·  ${Math.ceil(hp).toLocaleString("de-DE")} / ${maxHp.toLocaleString("de-DE")}`, x + width, top + 15);
  ctx.fillStyle = "#070910"; ctx.fillRect(x, top + 22, width, 12);
  const spectrum = ctx.createLinearGradient(x, 0, x + width, 0);
  spectrum.addColorStop(0, "#67e8f9"); spectrum.addColorStop(.36, "#a78bfa"); spectrum.addColorStop(.7, BOSS_ACCENTS[kind]); spectrum.addColorStop(1, "#fde68a");
  ctx.fillStyle = spectrum; ctx.fillRect(x, top + 22, width * ratio, 12);
  ctx.fillStyle = "#ffffff55"; ctx.fillRect(x, top + 22, width * ratio, 3);
  ctx.strokeStyle = "#cbd5e199"; ctx.lineWidth = 1; ctx.strokeRect(x, top + 22, width, 12);
  for (const threshold of [.3, .6]) { ctx.fillStyle = "#070b14"; ctx.fillRect(x + width * threshold, top + 22, 2, 12); }
  ctx.textAlign = "left"; ctx.font = "10px monospace"; ctx.fillStyle = "#91a4b7";
  const warning = state && state.stage !== "cooldown";
  ctx.fillText(warning ? `⚠ ${SPECIAL_NAMES[kind][state.index].toUpperCase()}${state.stage === "warning" ? ` · ${(state.remaining / 60).toFixed(1)}s` : " · AKTIV"}` : CODE[kind], x, top + 49);
  if (kind === "city") { ctx.textAlign = "right"; ctx.fillStyle = BOSS_ACCENTS.city; ctx.fillText(`${enemies.length}/6 SYSTEME`, x + width, top + 49); }
  ctx.restore();
}

export function drawSpecialWarning(ctx: CanvasRenderingContext2D, state: BossSpecialState) {
  if (state.stage !== "warning") return;
  const { kind, index, target: t, origin: o } = state;
  ctx.save(); ctx.strokeStyle = BOSS_ACCENTS[kind]; ctx.fillStyle = BOSS_ACCENTS[kind] + "12";
  ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]);
  // Locks indicate the actual origins/lanes used by each special.
  if ((kind === "tank" && index === 1) || (kind === "submarine" && index === 1)) {
    const count = kind === "tank" ? 4 : 5;
    for (let i = 0; i < count; i++) {
      const x = kind === "tank" ? Math.max(50, t.x - 50 + i * 34) : Math.max(60, t.x - 130 + i * 65);
      const ys = kind === "tank" ? [Math.max(65, Math.min(535, t.y))] : [70, 320];
      for (const y of ys) { ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillRect(x - 3, y - 3, 6, 6); }
    }
  } else if (kind === "city" && index === 1) {
    for (let i = 0; i < 6; i++) if (i !== 2) { ctx.fillRect(62 + i * 75, 65, 16, 500); ctx.strokeRect(62 + i * 75, 65, 16, 500); }
  } else if ((kind === "tank" && index === 2) || (kind === "spider" && index === 0)) {
    const count = kind === "tank" ? 7 : 9;
    for (let i = 0; i < count; i++) { const y = kind === "tank" ? 85 + i * 70 : 80 + i * 54; ctx.beginPath(); ctx.moveTo(o.x, y); ctx.lineTo(20, y); ctx.stroke(); }
  } else {
    for (const mount of state.mounts) {
      ctx.beginPath(); ctx.arc(mount.x, mount.y, 20 + 25 * (1 - state.remaining / SPECIAL_WARNING_FRAMES), 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mount.x, mount.y); ctx.lineTo(t.x, t.y); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(t.x, t.y, 20, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
