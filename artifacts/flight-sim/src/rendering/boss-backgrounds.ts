import type { EncounterKind } from "../boss-encounters";

export type BossArena = EncounterKind | "boss" | "overlord";

/** Select living bosses only; the city's arena lasts until its last turret falls. */
export function getBossArena(enemies: readonly {
  type: string; encounterKind?: EncounterKind; dead?: boolean; hp: number;
}[]): BossArena | null {
  const boss = enemies.find(e => !e.dead && e.hp > 0 && e.encounterKind)
    ?? enemies.find(e => !e.dead && e.hp > 0 && ["boss", "overlord", "titan"].includes(e.type));
  return boss ? boss.encounterKind ?? boss.type as BossArena : null;
}

const PALETTES: Record<BossArena, readonly [string, string, string]> = {
  titan: ["#09051b", "#29143c", "#b78ce8"],
  tank: ["#24170d", "#584128", "#b89b61"],
  spider: ["#041510", "#12352a", "#52a983"],
  submarine: ["#031423", "#073848", "#52a9b5"],
  city: ["#200e1c", "#45222d", "#ce788b"],
  boss: ["#1c0c0a", "#49221c", "#c78263"],
  overlord: ["#051422", "#14344b", "#67abbf"],
};

/** Low-contrast scenery keeps hostile projectiles readable. All coordinates are world-space. */
export function drawBossBackground(
  ctx: CanvasRenderingContext2D, kind: BossArena, width: number, height: number,
  time: number, reducedMotion: boolean, economical: boolean,
) {
  const t = reducedMotion ? 0 : time;
  const [dark, light, accent] = PALETTES[kind];
  ctx.save();
  const sky = ctx.createLinearGradient(0, 0, width, height);
  sky.addColorStop(0, dark); sky.addColorStop(1, light);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = accent; ctx.lineWidth = 1;
  if (kind === "titan" || kind === "overlord") {
    // Orbital reactor / command station, with distant stars and concentric machinery.
    ctx.fillStyle = accent;
    for (let i = 0; i < (economical ? 35 : 75); i++) {
      const x = ((i * 137.3 - t * .12) % width + width) % width;
      ctx.globalAlpha = .15 + (i % 4) * .08;
      ctx.fillRect(x, (i * 79.7) % height, 2, 2);
    }
    ctx.globalAlpha = .17;
    for (let r = 65; r < 310; r += 45) {
      ctx.beginPath(); ctx.arc(width * .78, height * .48, r, 0, Math.PI * 2); ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + t * .0008;
      ctx.beginPath(); ctx.moveTo(width * .78 + Math.cos(a) * 70, height * .48 + Math.sin(a) * 70);
      ctx.lineTo(width * .78 + Math.cos(a) * 290, height * .48 + Math.sin(a) * 290); ctx.stroke();
    }
  } else if (kind === "tank" || kind === "boss") {
    // Sand, armored trenches and cratered ground.
    for (let i = 0; i < 14; i++) {
      const x = ((i * 113 - t * .2) % (width + 100) + width + 100) % (width + 100) - 50;
      const y = (i * 97) % height;
      ctx.globalAlpha = .28; ctx.fillStyle = dark;
      ctx.beginPath(); ctx.ellipse(x, y, 45, 17, -.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = .22; ctx.lineWidth = 9;
    for (const y of [height * .18, height * .82]) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y - 35); ctx.stroke();
    }
  } else if (kind === "spider") {
    // Mechanical web suspended over a dark robotics factory.
    ctx.globalAlpha = .16;
    const cx = width * .8, cy = height * .5;
    for (let ring = 1; ring <= 7; ring++) {
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = i * Math.PI / 6;
        const x = cx + Math.cos(a) * ring * 70, y = cy + Math.sin(a) * ring * 55;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(i * Math.PI / 6) * 650, cy + Math.sin(i * Math.PI / 6) * 520); ctx.stroke();
    }
  } else if (kind === "submarine") {
    // Deep sea with dim shafts of light, bubbles and a rocky seabed.
    ctx.fillStyle = accent; ctx.globalAlpha = .055;
    for (let i = 0; i < 5; i++) {
      const x = i * width / 4 + Math.sin(t * .003 + i) * 20;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 100, height); ctx.lineTo(x + 190, height); ctx.lineTo(x + 35, 0); ctx.fill();
    }
    ctx.globalAlpha = .22;
    for (let i = 0; i < (economical ? 12 : 26); i++) {
      ctx.beginPath(); ctx.arc((i * 137) % width, ((i * 83 - t * .3) % height + height) % height, 2 + i % 4, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = .65; ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 30) ctx.lineTo(x, height - 24 - Math.sin(x * .023) * 14);
    ctx.lineTo(width, height); ctx.fill();
  } else {
    // Fortress metropolis: layered towers, glowing windows and fortified avenues.
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < 18; i++) {
        const x = i * 65 - layer * 28, h = 45 + (i * 71 + layer * 43) % 135;
        const y = layer ? height - h : 0;
        ctx.globalAlpha = .7; ctx.fillStyle = dark; ctx.fillRect(x, y, 48, h);
        ctx.globalAlpha = .2; ctx.fillStyle = accent;
        for (let wy = y + 12; wy < y + h - 8; wy += 16) {
          ctx.fillRect(x + 10, wy, 5, 3); ctx.fillRect(x + 30, wy, 5, 3);
        }
      }
    }
    ctx.globalAlpha = .12;
    for (const y of [height * .36, height * .64]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  }
  ctx.restore();
}
