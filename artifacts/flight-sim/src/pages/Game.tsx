import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Vec2 { x: number; y: number }

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; radius: number;
}

interface Star {
  x: number; y: number;
  speed: number; brightness: number; size: number;
}

interface Building {
  x: number; width: number; height: number;
  windows: { wx: number; wy: number; lit: boolean }[];
}

interface Bullet {
  x: number; y: number;
  vx: number; vy: number;
  fromPlayer: boolean;
  damage: number;
  isMissile?: boolean;
  missileTarget?: Enemy | null;
  trackPlayer?: boolean;
}

interface Enemy {
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  width: number; height: number;
  type: "scout" | "fighter" | "bomber" | "boss";
  shootCooldown: number;
  points: number;
  color: string;
  angle: number;
  oscillate?: number;
  dead?: boolean;
  missileTimer?: number;
  bossVyTimer?: number;
  bossVyDir?: number;
}

interface PowerUp {
  x: number; y: number;
  type: "health" | "shield" | "speed";
  vy: number;
}

interface GameState {
  score: number;
  level: number;
  hp: number;
  maxHp: number;
  shield: number;
  speed: number;
  weaponTier: number;
  lives: number;
  gameOver: boolean;
  started: boolean;
  paused: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CANVAS_W = 900;
const CANVAS_H = 600;
const PLAYER_W = 52;
const PLAYER_H = 28;
const BASE_BULLET_SPEED = 10;
const ENEMY_BULLET_SPEED = 3;

const LEVEL_THRESHOLDS = [
  // 1-10
  0, 150, 350, 600, 900, 1300, 1800, 2400, 3100, 4000,
  // 11-20
  5100, 6400, 7900, 9600, 11500, 13700, 16200, 19000, 22200, 25800,
  // 21-30
  29800, 34200, 38900, 43900, 49300, 55100, 61300, 67900, 74900, 82400,
  // 31-40
  90400, 99000, 108000, 117500, 127500, 138000, 149000, 160500, 172500, 185000,
  // 41-50
  198000, 212000, 226500, 241500, 257000, 273000, 289500, 306500, 324000, 342000,
  9999999,
];
const MILESTONE_LEVELS = new Set([3, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50]);
const WEAPON_TIERS = [
  { name: "Single Cannon",    guns: 1, spread: false, missile: false, fireRate: 280, bulletDmg: 1 },
  { name: "Twin Cannons",     guns: 2, spread: false, missile: false, fireRate: 250, bulletDmg: 1 },
  { name: "Triple Burst",     guns: 3, spread: true,  missile: false, fireRate: 220, bulletDmg: 1 },
  { name: "Quad Cannons",     guns: 4, spread: true,  missile: false, fireRate: 190, bulletDmg: 1 },
  { name: "Missile Lock",     guns: 3, spread: true,  missile: true,  fireRate: 170, bulletDmg: 2 },
  { name: "Superweapon",      guns: 5, spread: true,  missile: true,  fireRate: 140, bulletDmg: 2 },
];

// ─── Save / load ─────────────────────────────────────────────────────────────

const SAVE_KEY = "fighter-command-save";

interface SaveData {
  score: number; level: number; hp: number; maxHp: number;
  weaponTier: number; speed: number; lives: number; savedAt: number;
}

function saveGame(gs: GameState) {
  try {
    const data: SaveData = {
      score: gs.score, level: gs.level, hp: gs.hp, maxHp: gs.maxHp,
      weaponTier: gs.weaponTier, speed: gs.speed, lives: gs.lives,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* storage unavailable */ }
}

function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as SaveData) : null;
  } catch { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}

// ─── Skins, shop & persistent data ───────────────────────────────────────────

const SKIN_KEY    = "fighter-command-skin";
const HS_KEY      = "fighter-command-hs";
const COINS_KEY   = "fighter-command-coins";
const UNLOCKS_KEY = "fighter-command-unlocks";

const JET_SKINS = [
  { id: "steel",   name: "Steel",     body: "#1a2a4a", stroke: "#2a4a8a", glow: "#00cfff", cost: 0     },
  { id: "fire",    name: "Feuer",     body: "#3a1500", stroke: "#8a3a00", glow: "#ff6600", cost: 25000 },
  { id: "jade",    name: "Jade",      body: "#0a2a1a", stroke: "#1a5a2a", glow: "#00ff88", cost: 25000 },
  { id: "gold",    name: "Gold",      body: "#2a2000", stroke: "#5a4a00", glow: "#ffcc00", cost: 25000 },
  { id: "shadow",  name: "Schatten",  body: "#0d0d12", stroke: "#2a1a3a", glow: "#aa44ff", cost: 25000 },
  { id: "crimson", name: "Scharlach", body: "#2a0a0a", stroke: "#5a1a1a", glow: "#ff2244", cost: 25000 },
] as const;
type JetSkin = typeof JET_SKINS[number];

const SHOP_ITEMS = [
  { id: "ulti_boost",     name: "Ulti-Boost",       desc: "Ultis laden 50% schneller",                    cost: 25000 },
  { id: "extra_life",     name: "+1 Leben",          desc: "Starte mit 4 statt 3 Leben",                   cost: 25000 },
  { id: "weapon_head",    name: "Waffen-Vorstart",   desc: "Starte auf Waffentier 2",                      cost: 25000 },
  { id: "clone_upgrade",  name: "Clone-Ulti ⬆",     desc: "Clone feuert Raketen & lädt 25% schneller",    cost: 25000 },
  { id: "laser_upgrade",  name: "Laser-Ulti ⬆",     desc: "Laser macht 2× Schaden & hält 25% länger",     cost: 25000 },
] as const;

function saveHighScore(s: number) { try { if (s > loadHighScore()) localStorage.setItem(HS_KEY, String(s)); } catch {} }
function loadHighScore(): number  { try { return parseInt(localStorage.getItem(HS_KEY) ?? "0", 10) || 0; } catch { return 0; } }
function addCoins(n: number)      { try { localStorage.setItem(COINS_KEY, String(loadCoins() + n)); } catch {} }
function spendCoins(n: number)    { try { const c = loadCoins(); if (c >= n) localStorage.setItem(COINS_KEY, String(c - n)); } catch {} }
function loadCoins(): number      { try { return parseInt(localStorage.getItem(COINS_KEY) ?? "0", 10) || 0; } catch { return 0; } }
function saveSkin(id: string)     { try { localStorage.setItem(SKIN_KEY, id); } catch {} }
function loadSkin(): string       { try { return localStorage.getItem(SKIN_KEY) ?? "steel"; } catch { return "steel"; } }
function addUnlock(id: string)    { try { const u = loadUnlocks(); if (!u.includes(id)) localStorage.setItem(UNLOCKS_KEY, JSON.stringify([...u, id])); } catch {} }
function loadUnlocks(): string[]  { try { return JSON.parse(localStorage.getItem(UNLOCKS_KEY) ?? "[]") as string[]; } catch { return []; } }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function dist(a: Vec2, b: Vec2) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function rectHit(ax: number, ay: number, aw: number, ah: number,
                 bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────

function drawPlayerJet(ctx: CanvasRenderingContext2D, x: number, y: number, tier: number, shieldActive: boolean, skin?: JetSkin) {
  ctx.save();
  ctx.translate(x + PLAYER_W / 2, y + PLAYER_H / 2);

  // Engine glow
  const glowColors = ["#00cfff", "#00cfff", "#00ff88", "#ff9900", "#ff4444", "#ff00ff"];
  const glow = skin?.glow ?? glowColors[Math.min(tier, glowColors.length - 1)];
  const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 40);
  grad.addColorStop(0, glow + "55");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();

  // Body
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(-20, -10);
  ctx.lineTo(-28, -5);
  ctx.lineTo(-20, 0);
  ctx.lineTo(-28, 5);
  ctx.lineTo(-20, 10);
  ctx.closePath();
  ctx.fillStyle = skin?.body ?? "#1a2a4a";
  ctx.fill();
  ctx.strokeStyle = skin?.stroke ?? "#2a4a8a";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cockpit
  ctx.beginPath();
  ctx.ellipse(8, 0, 10, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = glow + "cc";
  ctx.fill();

  // Wing stripes per tier
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-14, -22); ctx.lineTo(-22, -10); ctx.closePath();
  ctx.fillStyle = skin?.body ?? "#162040"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-14, 22); ctx.lineTo(-22, 10); ctx.closePath();
  ctx.fillStyle = skin?.body ?? "#162040"; ctx.fill(); ctx.stroke();

  // Gun barrels
  const gunOffsets = [
    [],
    [0],
    [-8, 8],
    [-12, 0, 12],
    [-14, -5, 5, 14],
    [-14, -7, 0, 7, 14],
  ];
  const offsets = gunOffsets[Math.min(tier, gunOffsets.length - 1)];
  offsets.forEach(oy => {
    ctx.beginPath();
    ctx.moveTo(28, oy - 1.5);
    ctx.lineTo(38, oy - 1.5);
    ctx.lineTo(38, oy + 1.5);
    ctx.lineTo(28, oy + 1.5);
    ctx.closePath();
    ctx.fillStyle = glow;
    ctx.fill();
  });

  // Shield
  if (shieldActive) {
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.strokeStyle = "#00ffff88";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#00ffff11";
    ctx.fill();
  }

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  ctx.save();
  ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
  ctx.rotate(Math.PI); // facing left

  switch (e.type) {
    case "scout": {
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-12, -8);
      ctx.lineTo(-18, -3);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-18, 3);
      ctx.lineTo(-12, 8);
      ctx.closePath();
      ctx.fillStyle = "#3a0a0a";
      ctx.fill();
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath(); ctx.ellipse(4, 0, 7, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = e.color + "99"; ctx.fill();
      break;
    }
    case "fighter": {
      ctx.beginPath();
      ctx.moveTo(24, 0); ctx.lineTo(-16, -12); ctx.lineTo(-22, -5); ctx.lineTo(-14, 0);
      ctx.lineTo(-22, 5); ctx.lineTo(-16, 12); ctx.closePath();
      ctx.fillStyle = "#1a1a00";
      ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(-16, -24); ctx.lineTo(-22, -12); ctx.closePath();
      ctx.fillStyle = "#0a0a00"; ctx.fill(); ctx.strokeStyle = e.color; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 12); ctx.lineTo(-16, 24); ctx.lineTo(-22, 12); ctx.closePath();
      ctx.fillStyle = "#0a0a00"; ctx.fill(); ctx.strokeStyle = e.color; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(6, 0, 9, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = e.color + "99"; ctx.fill();
      break;
    }
    case "bomber": {
      ctx.beginPath();
      ctx.moveTo(18, 0); ctx.lineTo(-10, -18); ctx.lineTo(-28, -10); ctx.lineTo(-20, 0);
      ctx.lineTo(-28, 10); ctx.lineTo(-10, 18); ctx.closePath();
      ctx.fillStyle = "#0a1a00";
      ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = e.color + "99"; ctx.fill();
      break;
    }
    case "boss": {
      ctx.beginPath();
      ctx.moveTo(40, 0); ctx.lineTo(-20, -28); ctx.lineTo(-36, -14); ctx.lineTo(-24, 0);
      ctx.lineTo(-36, 14); ctx.lineTo(-20, 28); ctx.closePath();
      ctx.fillStyle = "#1a001a";
      ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -28); ctx.lineTo(-24, -44); ctx.lineTo(-36, -28); ctx.closePath();
      ctx.fillStyle = "#100010"; ctx.fill(); ctx.strokeStyle = e.color; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 28); ctx.lineTo(-24, 44); ctx.lineTo(-36, 28); ctx.closePath();
      ctx.fillStyle = "#100010"; ctx.fill(); ctx.strokeStyle = e.color; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(8, 0, 14, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = e.color + "bb"; ctx.fill();
      // HP bar
      const barW = 64, barH = 6;
      ctx.fillStyle = "#333";
      ctx.fillRect(-barW / 2, -e.height / 2 - 16, barW, barH);
      ctx.fillStyle = e.color;
      ctx.fillRect(-barW / 2, -e.height / 2 - 16, barW * (e.hp / e.maxHp), barH);
      break;
    }
  }

  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
  ctx.save();
  if (b.isMissile && b.trackPlayer) {
    // Enemy homing missile — magenta/purple
    ctx.translate(b.x, b.y);
    const ang = Math.atan2(b.vy, b.vx);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(12, 0); ctx.lineTo(-6, -5); ctx.lineTo(-4, 0); ctx.lineTo(-6, 5); ctx.closePath();
    ctx.fillStyle = "#dd00ff"; ctx.fill();
    ctx.shadowColor = "#aa00ff"; ctx.shadowBlur = 10;
    ctx.fill();
    ctx.beginPath(); ctx.arc(-9, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#88008888"; ctx.fill();
  } else if (b.isMissile) {
    ctx.translate(b.x, b.y);
    const ang = Math.atan2(b.vy, b.vx);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(12, 0); ctx.lineTo(-6, -4); ctx.lineTo(-4, 0); ctx.lineTo(-6, 4); ctx.closePath();
    ctx.fillStyle = "#ff6600"; ctx.fill();
    ctx.beginPath(); ctx.arc(-8, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ff330088"; ctx.fill();
  } else if (b.fromPlayer) {
    ctx.beginPath();
    ctx.rect(b.x - 2, b.y - 2, 14, 4);
    ctx.fillStyle = "#00ffff";
    ctx.shadowColor = "#00ffff"; ctx.shadowBlur = 8;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ff4444";
    ctx.shadowColor = "#ff4444"; ctx.shadowBlur = 6;
    ctx.fill();
  }
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const alpha = p.life / p.maxLife;
  if (alpha <= 0) return;
  const radius = Math.max(0.1, p.radius * alpha);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = p.color;
  ctx.fill();
  ctx.restore();
}

function spawnExplosion(particles: Particle[], x: number, y: number, big: boolean) {
  const count = big ? 40 : 16;
  const colors = ["#ff9900", "#ff4400", "#ffcc00", "#ffffff", "#ff6600"];
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(big ? 1 : 0.5, big ? 6 : 3);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(20, 45), maxLife: 45,
      color: colors[Math.floor(rand(0, colors.length))],
      radius: rand(2, big ? 6 : 3),
    });
  }
}

// ─── Main Game Component ──────────────────────────────────────────────────────

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>({
    score: 0, level: 1, hp: 10, maxHp: 10,
    shield: 0, speed: 3.2, weaponTier: 0,
    lives: 3, gameOver: false, started: false, paused: false,
  });
  const [displayState, setDisplayState] = useState({ ...stateRef.current });
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const lastFireRef = useRef(0);
  const lastMissileRef = useRef(0);
  const playerRef = useRef({ x: 60, y: CANVAS_H / 2 - PLAYER_H / 2 });
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const enemySpawnTimerRef = useRef(0);
  const timeRef = useRef(0);
  const shieldTimerRef = useRef(0);
  const invincibleRef = useRef(0);

  // ── Touch / virtual controls ──
  const joystickRef = useRef({ active: false, id: -1, centerX: 0, centerY: 0, curX: 0, curY: 0 });
  const touchFireRef = useRef({ active: false, id: -1 });
  const touchUltiRef = useRef({ triggered: false });

  // ── Ultima ──
  const ultimaChargeRef = useRef(0);
  const ultimaActiveRef = useRef(0);
  const laserChargeRef = useRef(0);
  const laserActiveRef = useRef(0);

  // ── City background ──
  const cityFarRef  = useRef<Building[]>([]);
  const cityNearRef = useRef<Building[]>([]);

  // ── Checkpoint save tracking ──
  const saveExistsRef = useRef(!!loadSave());
  const milestoneBossFiredRef = useRef<Set<number>>(new Set());
  const gameOverCountdownRef = useRef(0);
  const activeSkinRef = useRef<JetSkin>(JET_SKINS.find(s => s.id === loadSkin()) ?? JET_SKINS[0]);
  const activeUnlocksRef = useRef<string[]>([]);
  const [selectedSkin, setSelectedSkin] = useState(() => loadSkin());
  const [coins, setCoins] = useState(() => loadCoins());
  const [highScore, setHighScore] = useState(() => loadHighScore());
  const [unlockedItems, setUnlockedItems] = useState<string[]>(() => loadUnlocks());

  const syncDisplay = useCallback(() => {
    setDisplayState({ ...stateRef.current });
  }, []);

  const initStars = useCallback(() => {
    starsRef.current = Array.from({ length: 120 }, () => ({
      x: rand(0, CANVAS_W),
      y: rand(0, CANVAS_H),
      speed: rand(0.3, 2),
      brightness: rand(0.4, 1),
      size: rand(0.5, 2),
    }));
  }, []);

  const initCity = useCallback(() => {
    const genLayer = (count: number, minH: number, maxH: number, minW: number, maxW: number): Building[] => {
      const out: Building[] = [];
      let cx = 0;
      for (let i = 0; i < count; i++) {
        const w = Math.floor(rand(minW, maxW));
        const h = Math.floor(rand(minH, maxH));
        const wins: Building["windows"] = [];
        for (let r = 0; r < Math.floor(h / 22); r++)
          for (let c = 0; c < Math.floor(w / 16); c++)
            wins.push({ wx: 5 + c * 16, wy: 6 + r * 22, lit: Math.random() < 0.35 });
        out.push({ x: cx, width: w, height: h, windows: wins });
        cx += w + 10;
      }
      return out;
    };
    cityFarRef.current  = genLayer(30, 50, 130, 28, 65);
    cityNearRef.current = genLayer(20, 100, 210, 44, 100);
  }, []);

  const spawnEnemy = useCallback((level: number) => {
    const roll = Math.random();
    let type: Enemy["type"] = "scout";
    let hp = 1, w = 40, h = 20, vx = -rand(1.5, 3), pts = 10, color = "#ff4444";
    const bossInterval = Math.max(220, 1200 - level * 60);
    const isBossLevel = level >= 3 && timeRef.current % bossInterval < 5;

    if (isBossLevel && enemiesRef.current.filter(e => e.type === "boss").length === 0) {
      type = "boss"; hp = 25 + level * 6; w = 90; h = 68; vx = -rand(0.6, 1.2); pts = 50; color = "#cc00ff";
    } else if (level >= 4 && roll < 0.15) {
      type = "bomber"; hp = 4 + level; w = 56; h = 40; vx = -rand(0.8, 1.5); pts = 60; color = "#44ff44";
    } else if (level >= 2 && roll < 0.4) {
      type = "fighter"; hp = 2 + Math.floor(level / 2); w = 48; h = 28; vx = -rand(1.8, 3.2); pts = 30; color = "#ffcc00";
    }

    // After level 5 enemies award bonus score so levels go faster
    if (level > 5) pts = Math.round(pts * (1 + (level - 5) * 0.18));

    const y = rand(20, CANVAS_H - h - 20);
    enemiesRef.current.push({
      x: CANVAS_W + 20, y,
      vx, vy: 0,
      hp, maxHp: hp,
      width: w, height: h,
      type, shootCooldown: rand(60, 120),
      points: pts, color,
      angle: 0,
      oscillate: type === "scout" ? rand(-0.4, 0.4) : 0,
    });
  }, []);

  const fireBullets = useCallback((now: number) => {
    const gs = stateRef.current;
    const tier = WEAPON_TIERS[gs.weaponTier];
    if (now - lastFireRef.current < tier.fireRate) return;
    lastFireRef.current = now;
    const px = playerRef.current.x + PLAYER_W;
    const py = playerRef.current.y + PLAYER_H / 2;

    const gunOffsets: number[][] = [
      [0], [-8, 8], [-12, 0, 12], [-14, -5, 5, 14], [-14, -7, 0, 7, 14],
    ];
    const offsets = gunOffsets[Math.min(tier.guns - 1, gunOffsets.length - 1)];

    offsets.forEach((oy, i) => {
      let vx = BASE_BULLET_SPEED;
      let vy = 0;
      if (tier.spread && offsets.length > 1) {
        const spread = (i - (offsets.length - 1) / 2) * 0.12;
        vy = spread * BASE_BULLET_SPEED;
      }
      bulletsRef.current.push({
        x: px, y: py + oy,
        vx, vy,
        fromPlayer: true,
        damage: tier.bulletDmg,
      });
    });

    // Clone fires when ultima active
    if (ultimaActiveRef.current > 0) {
      const cloneY = clamp(playerRef.current.y + PLAYER_H / 2 + 54, PLAYER_H, CANVAS_H - PLAYER_H);
      offsets.forEach((oy, i) => {
        let cvx = BASE_BULLET_SPEED;
        let cvy = 0;
        if (tier.spread && offsets.length > 1) {
          const spread = (i - (offsets.length - 1) / 2) * 0.12;
          cvy = spread * BASE_BULLET_SPEED;
        }
        bulletsRef.current.push({ x: px, y: cloneY + oy, vx: cvx, vy: cvy, fromPlayer: true, damage: tier.bulletDmg });
      });
    }

    // Missiles
    if (tier.missile && now - lastMissileRef.current > 1800) {
      lastMissileRef.current = now;
      const target = enemiesRef.current[0] ?? null;
      bulletsRef.current.push({
        x: px, y: py,
        vx: 7, vy: 0,
        fromPlayer: true, damage: 4,
        isMissile: true, missileTarget: target,
      });
    }
  }, []);

  const startGame = useCallback((fromSave = false) => {
    const save = fromSave ? loadSave() : null;
    const unlocks = loadUnlocks();
    activeUnlocksRef.current = unlocks;
    stateRef.current = {
      score:      save?.score  ?? 0,
      level:      save?.level  ?? 1,
      hp:         save?.hp     ?? 10,
      maxHp:      save?.maxHp  ?? 10,
      shield:     0,
      speed:      save?.speed  ?? 3.2,
      weaponTier: fromSave ? (save?.weaponTier ?? 0) : (unlocks.includes("weapon_head") ? 2 : 0),
      lives:      save?.lives  ?? (unlocks.includes("extra_life") ? 4 : 3),
      gameOver: false, started: true, paused: false,
    };
    playerRef.current = { x: 60, y: CANVAS_H / 2 - PLAYER_H / 2 };
    bulletsRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    enemySpawnTimerRef.current = 0;
    timeRef.current = 0;
    lastFireRef.current = 0;
    lastMissileRef.current = 0;
    shieldTimerRef.current = 0;
    invincibleRef.current = 0;
    ultimaChargeRef.current = 0;
    ultimaActiveRef.current = 0;
    laserChargeRef.current = 0;
    laserActiveRef.current = 0;
    milestoneBossFiredRef.current = new Set();
    saveExistsRef.current = !!loadSave();
    syncDisplay();
  }, [syncDisplay]);

  // Helper: map a clientX/Y to canvas-space coords
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (CANVAS_W / rect.width),
      y: (clientY - rect.top)  * (CANVAS_H / rect.height),
    };
  }, []);

  useEffect(() => {
    initStars();
    initCity();
    const onKey = (e: KeyboardEvent, down: boolean) => {
      keysRef.current[down ? "add" : "delete"](e.key);
      if (e.key === " " && !stateRef.current.started) startGame(saveExistsRef.current);
      if ((e.key === "n" || e.key === "N") && !stateRef.current.started && down) {
        clearSave(); saveExistsRef.current = false; startGame(false);
      }
      if ((e.key === "p" || e.key === "P") && down) {
        if (stateRef.current.started && !stateRef.current.gameOver) {
          stateRef.current.paused = !stateRef.current.paused;
          syncDisplay();
        }
      }
      if ((e.key === "q" || e.key === "Q") && down && stateRef.current.started &&
          !stateRef.current.gameOver && !stateRef.current.paused) {
        if (ultimaChargeRef.current >= ULTI_MAX && ultimaActiveRef.current === 0) {
          ultimaActiveRef.current = ULTI_DURATION;
          ultimaChargeRef.current = 0;
        }
      }
      if ((e.key === "e" || e.key === "E") && down && stateRef.current.started &&
          !stateRef.current.gameOver && !stateRef.current.paused) {
        if (laserChargeRef.current >= LASER_MAX && laserActiveRef.current === 0) {
          laserActiveRef.current = LASER_DURATION;
          laserChargeRef.current = 0;
        }
      }
    };
    window.addEventListener("keydown", e => onKey(e, true));
    window.addEventListener("keyup", e => onKey(e, false));
    return () => {
      window.removeEventListener("keydown", e => onKey(e, true));
      window.removeEventListener("keyup", e => onKey(e, false));
    };
  }, [initCity, initStars, startGame, syncDisplay]);

  // Touch event setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const gs = stateRef.current;

      // Tap to start / restart
      if (!gs.started) { startGame(saveExistsRef.current); return; }
      if (gs.gameOver) { startGame(false); return; }
      // Tap to unpause
      if (gs.paused) { gs.paused = false; syncDisplay(); return; }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const { x, y } = toCanvas(t.clientX, t.clientY);
        if (x < CANVAS_W / 2) {
          // Left half → joystick
          if (!joystickRef.current.active) {
            joystickRef.current = { active: true, id: t.identifier, centerX: x, centerY: y, curX: x, curY: y };
          }
        } else {
          // Check ULTI button first
          const du = Math.hypot(x - ULTI_BTN_X, y - ULTI_BTN_Y);
          const dl = Math.hypot(x - LASER_BTN_X, y - LASER_BTN_Y);
          if (dl <= LASER_BTN_R + 12 && laserChargeRef.current >= LASER_MAX && laserActiveRef.current === 0) {
            laserActiveRef.current = LASER_DURATION;
            laserChargeRef.current = 0;
          } else if (du <= ULTI_BTN_R + 12 && ultimaChargeRef.current >= ULTI_MAX && ultimaActiveRef.current === 0) {
            ultimaActiveRef.current = ULTI_DURATION;
            ultimaChargeRef.current = 0;
          } else if (!touchFireRef.current.active) {
            touchFireRef.current = { active: true, id: t.identifier };
          }
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystickRef.current.id) {
          const { x, y } = toCanvas(t.clientX, t.clientY);
          joystickRef.current.curX = x;
          joystickRef.current.curY = y;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystickRef.current.id) {
          joystickRef.current.active = false;
          joystickRef.current.id = -1;
        }
        if (t.identifier === touchFireRef.current.id) {
          touchFireRef.current.active = false;
          touchFireRef.current.id = -1;
        }
      }
    };

    canvas.addEventListener("touchstart",  onTouchStart, { passive: false });
    canvas.addEventListener("touchmove",   onTouchMove,  { passive: false });
    canvas.addEventListener("touchend",    onTouchEnd,   { passive: false });
    canvas.addEventListener("touchcancel", onTouchEnd,   { passive: false });

    return () => {
      canvas.removeEventListener("touchstart",  onTouchStart);
      canvas.removeEventListener("touchmove",   onTouchMove);
      canvas.removeEventListener("touchend",    onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [startGame, syncDisplay, toCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let lastTime = 0;

    const loop = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const dt = Math.min(timestamp - lastTime, 50);
      lastTime = timestamp;

      const gs = stateRef.current;
      timeRef.current += 1;

      // ── Clear (daytime sky) ──
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      skyGrad.addColorStop(0,   "#1a70c4");
      skyGrad.addColorStop(0.5, "#5ab2e8");
      skyGrad.addColorStop(1,   "#b0ddf5");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // ── Clouds ──
      starsRef.current.slice(0, 14).forEach(s => {
        s.x -= s.speed * 0.18;
        if (s.x < -120) { s.x = CANVAS_W + 120; s.y = rand(18, CANVAS_H * 0.38); }
        const cw = 50 + s.size * 28, ch = 18 + s.size * 7;
        ctx.save();
        ctx.globalAlpha = 0.22 + s.brightness * 0.12;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.ellipse(s.x, s.y, cw, ch, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(s.x + cw * 0.32, s.y - ch * 0.4, cw * 0.65, ch * 0.65, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(s.x - cw * 0.28, s.y - ch * 0.3, cw * 0.55, ch * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1;

      // ── City silhouette (daytime) ──
      const drawCityLayer = (buildings: Building[], speed: number, fillColor: string) => {
        const totalW = buildings.reduce((s, b) => s + b.width + 10, 0);
        if (totalW === 0) return;
        const offset = (timeRef.current * speed) % totalW;
        for (const b of buildings) {
          let rx = b.x - offset;
          if (rx + b.width < 0) rx += totalW;
          if (rx > CANVAS_W) continue;
          ctx.fillStyle = fillColor;
          ctx.fillRect(rx, CANVAS_H - b.height, b.width, b.height);
          // Glass reflections (daytime)
          for (const w of b.windows) {
            if (!w.lit) continue;
            ctx.fillStyle = "#ffffff18";
            ctx.fillRect(rx + w.wx, CANVAS_H - b.height + w.wy, 5, 7);
          }
        }
      };
      drawCityLayer(cityFarRef.current,  0.3, "#2c3f62");
      drawCityLayer(cityNearRef.current, 0.9, "#1a2840");

      if (!gs.started) {
        return; // Hangar React overlay handles this screen
      }

      if (gs.paused) {
        ctx.save();
        ctx.fillStyle = "rgba(4,12,28,0.72)";
        ctx.fillRect(CANVAS_W / 2 - 200, CANVAS_H / 2 - 55, 400, 110);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px 'Inter', sans-serif";
        ctx.fillText("PAUSED", CANVAS_W / 2, CANVAS_H / 2);
        ctx.font = "18px 'Inter', sans-serif";
        ctx.fillStyle = "#ccddff";
        ctx.fillText("Press P or Tap to continue", CANVAS_W / 2, CANVAS_H / 2 + 40);
        ctx.restore();
        return;
      }

      if (gs.gameOver) {
        gameOverCountdownRef.current++;
        ctx.save();
        ctx.fillStyle = "rgba(4,12,28,0.84)";
        ctx.beginPath(); ctx.roundRect(CANVAS_W/2-260, CANVAS_H/2-78, 520, 195, 14); ctx.fill();
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff4444"; ctx.font = "bold 52px 'Inter', sans-serif";
        ctx.shadowColor = "#ff4444"; ctx.shadowBlur = 20;
        ctx.fillText("GAME OVER", CANVAS_W/2, CANVAS_H/2-36);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff"; ctx.font = "24px 'Inter', sans-serif";
        ctx.fillText(`Score: ${gs.score.toLocaleString("de-DE")}`, CANVAS_W/2, CANVAS_H/2+10);
        ctx.fillStyle = "#aaa"; ctx.font = "15px 'Inter', sans-serif";
        ctx.fillText(`Level ${gs.level}  ·  ${WEAPON_TIERS[gs.weaponTier].name}`, CANVAS_W/2, CANVAS_H/2+40);
        const sLeft = Math.max(0, Math.ceil((200 - gameOverCountdownRef.current) / 60));
        ctx.fillStyle = sLeft > 0 ? "#666" : "#ffcc00";
        ctx.font = "13px 'Inter', sans-serif";
        ctx.fillText(sLeft > 0 ? `Zurück zum Hangar in ${sLeft}s …  (SPACE zum Überspringen)` : "Zum Hangar …", CANVAS_W/2, CANVAS_H/2+72);
        ctx.restore();
        if (keysRef.current.has(" ") || gameOverCountdownRef.current > 200) {
          gameOverCountdownRef.current = 0;
          gs.started = false; gs.gameOver = false;
          syncDisplay();
        }
        return;
      }

      // ── Input & Player Movement ──
      const spd = gs.speed;
      const js = joystickRef.current;
      const JOY_RADIUS = 70;

      if (js.active) {
        const dx = js.curX - js.centerX;
        const dy = js.curY - js.centerY;
        const d = Math.hypot(dx, dy);
        const norm = Math.min(d, JOY_RADIUS) / JOY_RADIUS;
        if (d > 8) {
          playerRef.current.x = clamp(playerRef.current.x + (dx / d) * norm * spd * 0.8, 0, CANVAS_W * 0.75);
          playerRef.current.y = clamp(playerRef.current.y + (dy / d) * norm * spd,        0, CANVAS_H - PLAYER_H);
        }
      } else {
        if (keysRef.current.has("ArrowUp") || keysRef.current.has("w") || keysRef.current.has("W")) {
          playerRef.current.y = clamp(playerRef.current.y - spd, 0, CANVAS_H - PLAYER_H);
        }
        if (keysRef.current.has("ArrowDown") || keysRef.current.has("s") || keysRef.current.has("S")) {
          playerRef.current.y = clamp(playerRef.current.y + spd, 0, CANVAS_H - PLAYER_H);
        }
        if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a") || keysRef.current.has("A")) {
          playerRef.current.x = clamp(playerRef.current.x - spd * 0.8, 0, CANVAS_W - PLAYER_W);
        }
        if (keysRef.current.has("ArrowRight") || keysRef.current.has("d") || keysRef.current.has("D")) {
          playerRef.current.x = clamp(playerRef.current.x + spd * 0.8, 0, CANVAS_W * 0.75);
        }
      }

      const firing = keysRef.current.has(" ") || touchFireRef.current.active;
      if (firing) fireBullets(timestamp);

      // ── Level / Weapon tier ──
      const newLevel = LEVEL_THRESHOLDS.findIndex((t, i) =>
        gs.score >= t && gs.score < (LEVEL_THRESHOLDS[i + 1] ?? Infinity)
      );
      if (newLevel > 0 && newLevel !== gs.level - 1) {
        gs.level = newLevel + 1;
        gs.weaponTier = Math.min(newLevel, WEAPON_TIERS.length - 1);
        gs.speed = 3.2 + newLevel * 0.25;
        saveGame(gs);
        saveExistsRef.current = true;
      }

      // ── Milestone boss: spawn a mega-boss when entering key levels ──
      if (MILESTONE_LEVELS.has(gs.level) && !milestoneBossFiredRef.current.has(gs.level) &&
          enemiesRef.current.filter(e => e.type === "boss").length === 0) {
        milestoneBossFiredRef.current.add(gs.level);
        const ml = gs.level;
        const mbHp = 80 + ml * 12;
        enemiesRef.current.push({
          x: CANVAS_W + 20,
          y: rand(40, CANVAS_H - 100),
          vx: -rand(0.45, 0.8),
          vy: 0,
          hp: mbHp, maxHp: mbHp,
          width: 115, height: 88,
          type: "boss",
          shootCooldown: 12,
          points: 50,
          color: "#ff2200",
          angle: 0,
          oscillate: 0,
        });
      }

      // ── Spawn enemies ──
      const spawnRate = Math.max(55, 145 - gs.level * 12);
      enemySpawnTimerRef.current++;
      if (enemySpawnTimerRef.current >= spawnRate) {
        enemySpawnTimerRef.current = 0;
        spawnEnemy(gs.level);
      }

      // ── Update bullets ──
      bulletsRef.current = bulletsRef.current.filter(b => {
        if (b.isMissile && b.missileTarget && !b.missileTarget.dead) {
          const tx = b.missileTarget.x + b.missileTarget.width / 2;
          const ty = b.missileTarget.y + b.missileTarget.height / 2;
          const ang = Math.atan2(ty - b.y, tx - b.x);
          b.vx += (Math.cos(ang) * 0.6 - b.vx) * 0.08;
          b.vy += (Math.sin(ang) * 0.6 - b.vy) * 0.08;
          const spd2 = Math.hypot(b.vx, b.vy);
          const ms = 7;
          if (spd2 > ms) { b.vx = b.vx / spd2 * ms; b.vy = b.vy / spd2 * ms; }
        }
        // Enemy homing missile tracks player
        if (b.trackPlayer && !b.fromPlayer) {
          const tx = playerRef.current.x + PLAYER_W / 2;
          const ty = playerRef.current.y + PLAYER_H / 2;
          const ang = Math.atan2(ty - b.y, tx - b.x);
          b.vx += (Math.cos(ang) * 0.5 - b.vx) * 0.06;
          b.vy += (Math.sin(ang) * 0.5 - b.vy) * 0.06;
          const sp = Math.hypot(b.vx, b.vy);
          if (sp > 5) { b.vx = b.vx / sp * 5; b.vy = b.vy / sp * 5; }
        }
        b.x += b.vx;
        b.y += b.vy;
        drawBullet(ctx, b);
        return b.x > -20 && b.x < CANVAS_W + 20 && b.y > -20 && b.y < CANVAS_H + 20;
      });

      // ── Update enemies ──
      if (invincibleRef.current > 0) invincibleRef.current--;
      if (shieldTimerRef.current > 0) shieldTimerRef.current--;

      // ── Ultima charge & countdown ──
      if (ultimaActiveRef.current > 0) {
        ultimaActiveRef.current--;
      } else if (ultimaChargeRef.current < ULTI_MAX) {
        const cloneMult = activeUnlocksRef.current.includes("ulti_boost") ? 1.5 : 1;
        const cloneBonus = activeUnlocksRef.current.includes("clone_upgrade") ? 1.25 : 1;
        ultimaChargeRef.current = Math.min(ULTI_MAX, ultimaChargeRef.current + 0.18 * cloneMult * cloneBonus);
      }
      // ── Laser charge & countdown ──
      if (laserActiveRef.current > 0) {
        laserActiveRef.current--;
      } else if (laserChargeRef.current < LASER_MAX) {
        const laserMult = activeUnlocksRef.current.includes("ulti_boost") ? 1.5 : 1;
        const laserBonus = activeUnlocksRef.current.includes("laser_upgrade") ? 1.25 : 1;
        laserChargeRef.current = Math.min(LASER_MAX, laserChargeRef.current + 0.10 * laserMult * laserBonus);
      }

      enemiesRef.current = enemiesRef.current.filter(e => {
        if (e.dead) return false;
        e.x += e.vx;
        e.y += e.vy;
        if (e.oscillate) e.y += Math.sin(timeRef.current * 0.04) * Math.abs(e.oscillate) * 0.8;
        e.y = clamp(e.y, 0, CANVAS_H - e.height);

        // Boss movement
        if (e.type === "boss") {
          e.vx = Math.sin(timeRef.current * 0.02) * -1.2;
          if (e.x > CANVAS_W - e.width - 10) e.x = CANVAS_W - e.width - 10;
          if (e.x < CANVAS_W * 0.5) e.x = CANVAS_W * 0.5;

          // Vertical dodge every 4 s (level 10+)
          if (gs.level >= 10) {
            e.bossVyTimer = (e.bossVyTimer ?? 0) + 1;
            if (e.bossVyTimer >= 240) {
              e.bossVyTimer = 0;
              e.bossVyDir = Math.random() > 0.5 ? 1 : -1;
            }
            const dodgeDecay = Math.max(0, 1 - e.bossVyTimer / 90);
            e.vy = (e.bossVyDir ?? 0) * 2.2 * dodgeDecay;
          }

          // Homing missile every 4 s (level 10+)
          if (gs.level >= 10) {
            e.missileTimer = (e.missileTimer ?? 240) - 1;
            if (e.missileTimer <= 0) {
              e.missileTimer = 240;
              bulletsRef.current.push({
                x: e.x, y: e.y + e.height / 2,
                vx: -4, vy: 0,
                fromPlayer: false,
                damage: 2,
                isMissile: true,
                trackPlayer: true,
              });
            }
          }
        }

        // Off screen left
        if (e.x + e.width < -20) return false;

        // Enemy shooting
        e.shootCooldown--;
        if (e.shootCooldown <= 0) {
          e.shootCooldown = e.type === "boss" ? 25 : e.type === "bomber" ? 55 : rand(70, 120);
          const shotCount = e.type === "boss" ? 3 : e.type === "bomber" ? 2 : 1;
          for (let s = 0; s < shotCount; s++) {
            const spread = (s - (shotCount - 1) / 2) * 0.25;
            bulletsRef.current.push({
              x: e.x, y: e.y + e.height / 2,
              vx: -ENEMY_BULLET_SPEED + (e.type === "boss" ? -1 : 0),
              vy: spread * ENEMY_BULLET_SPEED,
              fromPlayer: false, damage: e.type === "boss" ? 3 : 1,
            });
          }
        }

        // Draw enemy
        drawEnemy(ctx, e);

        // Enemy-player collision
        if (invincibleRef.current <= 0 && shieldTimerRef.current <= 0 &&
          rectHit(playerRef.current.x, playerRef.current.y, PLAYER_W, PLAYER_H, e.x, e.y, e.width, e.height)) {
          gs.hp = Math.max(0, gs.hp - 1);
          invincibleRef.current = 140;
          spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, true);
          e.dead = true;
          if (gs.hp <= 0) { gs.gameOver = true; clearSave(); saveHighScore(gs.score); addCoins(gs.score); saveExistsRef.current = false; syncDisplay(); }
          syncDisplay();
          return false;
        }

        // Bullet-enemy collision
        let hit = false;
        bulletsRef.current = bulletsRef.current.filter(b => {
          if (!b.fromPlayer || hit) return true;
          const bw = b.isMissile ? 14 : 14;
          const bh = b.isMissile ? 8 : 4;
          if (!rectHit(b.x, b.y - bh / 2, bw, bh, e.x, e.y, e.width, e.height)) return true;
          e.hp -= b.damage;
          spawnExplosion(particlesRef.current, b.x, b.y, false);
          hit = true;
          if (e.hp <= 0) {
            spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, e.type === "boss");
            gs.score += e.points;
            ultimaChargeRef.current = Math.min(ULTI_MAX, ultimaChargeRef.current +
              (e.type === "boss" ? 90 : e.type === "bomber" ? 40 : e.type === "fighter" ? 22 : 12));
            laserChargeRef.current = Math.min(LASER_MAX, laserChargeRef.current +
              (e.type === "boss" ? 60 : e.type === "bomber" ? 28 : e.type === "fighter" ? 14 : 8));
            e.dead = true;
            // Power-up chance
            if (Math.random() < 0.18) {
              const types: PowerUp["type"][] = ["health", "shield", "speed"];
              powerUpsRef.current.push({
                x: e.x + e.width / 2, y: e.y + e.height / 2,
                type: types[Math.floor(Math.random() * types.length)],
                vy: 1.2,
              });
            }
            syncDisplay();
            return false;
          }
          return false;
        });
        return !e.dead;
      });

      // ── Bullet-player collision ──
      bulletsRef.current = bulletsRef.current.filter(b => {
        if (b.fromPlayer) return true;
        const bw = 8, bh = 8;
        if (!rectHit(b.x - bw / 2, b.y - bh / 2, bw, bh, playerRef.current.x, playerRef.current.y, PLAYER_W, PLAYER_H)) return true;
        if (shieldTimerRef.current > 0) {
          spawnExplosion(particlesRef.current, b.x, b.y, false);
          return false;
        }
        if (invincibleRef.current > 0) return false;
        gs.hp = Math.max(0, gs.hp - b.damage);
        invincibleRef.current = 100;
        spawnExplosion(particlesRef.current, b.x, b.y, false);
        if (gs.hp <= 0) { gs.gameOver = true; clearSave(); saveHighScore(gs.score); addCoins(gs.score); saveExistsRef.current = false; }
        syncDisplay();
        return false;
      });

      // ── Power-ups ──
      powerUpsRef.current = powerUpsRef.current.filter(p => {
        p.y += p.vy;
        if (p.y > CANVAS_H + 20) return false;
        // Draw
        const colors: Record<PowerUp["type"], string> = { health: "#00ff88", shield: "#00ccff", speed: "#ffcc00" };
        const labels: Record<PowerUp["type"], string> = { health: "+HP", shield: "SHD", speed: "SPD" };
        const c = colors[p.type];
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = c + "44";
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = c;
        ctx.font = "bold 9px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labels[p.type], p.x, p.y);
        ctx.restore();
        // Pickup
        if (dist(playerRef.current, p) < 24) {
          if (p.type === "health") gs.hp = Math.min(gs.maxHp, gs.hp + 3);
          if (p.type === "shield") shieldTimerRef.current = 300;
          if (p.type === "speed") gs.speed = Math.min(6, gs.speed + 0.5);
          syncDisplay();
          return false;
        }
        return true;
      });

      // ── Particles ──
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx; p.y += p.vy;
        p.life--;
        drawParticle(ctx, p);
        return p.life > 0;
      });

      // ── Laser beam ──
      if (laserActiveRef.current > 0) {
        const ly = playerRef.current.y + PLAYER_H / 2;
        const lx = playerRef.current.x + PLAYER_W + 4;
        const beamW = CANVAS_W - lx;
        const flicker = 0.75 + 0.25 * Math.sin(timeRef.current * 0.6);
        ctx.save();
        ctx.globalAlpha = 0.28 * flicker;
        ctx.fillStyle = "#ff5500"; ctx.shadowColor = "#ff3300"; ctx.shadowBlur = 50;
        ctx.fillRect(lx, ly - 18, beamW, 36);
        ctx.globalAlpha = 0.55 * flicker;
        ctx.fillStyle = "#ffaa00"; ctx.shadowBlur = 25;
        ctx.fillRect(lx, ly - 7, beamW, 14);
        ctx.globalAlpha = flicker;
        ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 8;
        ctx.fillRect(lx, ly - 2, beamW, 4);
        ctx.restore();
        // Damage enemies in laser path
        for (const e of enemiesRef.current) {
          if (e.dead) continue;
          if (e.x + e.width < lx) continue;
          if (e.y + e.height < ly - 18 || e.y > ly + 18) continue;
          e.hp -= 0.38;
          if (e.hp <= 0) {
            spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, e.type === "boss");
            gs.score += e.points;
            ultimaChargeRef.current = Math.min(ULTI_MAX, ultimaChargeRef.current + (e.type === "boss" ? 50 : 8));
            laserChargeRef.current = Math.min(LASER_MAX, laserChargeRef.current + (e.type === "boss" ? 30 : 5));
            e.dead = true;
            syncDisplay();
          }
        }
      }

      // ── Draw player (+ clone when ultima active) ──
      if (invincibleRef.current <= 0 || Math.floor(timeRef.current / 5) % 2 === 0) {
        drawPlayerJet(ctx, playerRef.current.x, playerRef.current.y, gs.weaponTier, shieldTimerRef.current > 0, activeSkinRef.current);
        if (ultimaActiveRef.current > 0) {
          const cloneY = clamp(playerRef.current.y + 56, 0, CANVAS_H - PLAYER_H);
          ctx.save();
          const pulse = 0.65 + 0.35 * Math.sin(timeRef.current * 0.18);
          ctx.globalAlpha = pulse;
          ctx.shadowColor = "#ff00ff";
          ctx.shadowBlur = 18;
          drawPlayerJet(ctx, playerRef.current.x, cloneY, gs.weaponTier, false, activeSkinRef.current);
          ctx.restore();
        }
      }

      // ── Engine exhaust ──
      if (Math.random() < 0.4) {
        const tier = WEAPON_TIERS[gs.weaponTier];
        const glowColors = ["#00cfff", "#00cfff", "#00ff88", "#ff9900", "#ff4444", "#ff00ff"];
        particlesRef.current.push({
          x: playerRef.current.x + 2, y: playerRef.current.y + PLAYER_H / 2 + rand(-4, 4),
          vx: -rand(1, 3), vy: rand(-0.5, 0.5),
          life: rand(8, 18), maxLife: 18,
          color: glowColors[Math.min(gs.weaponTier, glowColors.length - 1)],
          radius: rand(2, 5),
        });
        void tier;
      }

      // ── HUD ──
      drawHUD(ctx, gs, ultimaChargeRef.current, ultimaActiveRef.current, laserChargeRef.current, laserActiveRef.current);

      // ── Virtual controls overlay ──
      drawVirtualControls(ctx, joystickRef.current, touchFireRef.current.active, ultimaChargeRef.current, ultimaActiveRef.current, laserChargeRef.current, laserActiveRef.current);

      // Sync display once per ~30 frames for React state
      if (timeRef.current % 30 === 0) syncDisplay();
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [fireBullets, spawnEnemy, startGame, syncDisplay]);

  const handleSkinSelect = (id: string) => {
    const skin = JET_SKINS.find(s => s.id === id);
    if (!skin) return;
    setSelectedSkin(id);
    saveSkin(id);
    activeSkinRef.current = skin;
  };

  const handleBuy = (itemId: string) => {
    if (loadCoins() < 25000) return;
    spendCoins(25000);
    addUnlock(itemId);
    setCoins(loadCoins());
    setUnlockedItems(loadUnlocks());
  };

  const handleUnlockSkin = (skinId: string) => {
    if (loadCoins() < 25000) return;
    spendCoins(25000);
    addUnlock(skinId);
    setCoins(loadCoins());
    setUnlockedItems(loadUnlocks());
    handleSkinSelect(skinId);
  };

  return (
    <div
      className="flex flex-col items-center justify-center w-full h-screen bg-[#08080e] select-none"
      style={{ touchAction: "none" }}
    >
      <div className="relative rounded overflow-hidden shadow-[0_0_40px_#00cfff22]"
        style={{ maxWidth: "100%", maxHeight: "100vh", border: "1px solid rgba(0,207,255,0.15)" }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block"
          style={{ maxWidth: "100%", maxHeight: "100vh", objectFit: "contain", touchAction: "none" }}
          tabIndex={0}
        />
        {!displayState.started && (
          <HangarOverlay
            selectedSkin={selectedSkin}
            coins={coins}
            highScore={highScore}
            unlockedItems={unlockedItems}
            hasSave={saveExistsRef.current}
            saveData={saveExistsRef.current ? loadSave() : null}
            onStart={() => startGame(saveExistsRef.current)}
            onNewGame={() => startGame(false)}
            onSkinSelect={handleSkinSelect}
            onBuy={handleBuy}
            onUnlockSkin={handleUnlockSkin}
          />
        )}
      </div>
      {displayState.started && !displayState.gameOver && (
        <div className="mt-2 text-xs text-gray-600 tracking-wider hidden sm:block">
          WASD — Bewegen &nbsp;·&nbsp; SPACE — Schießen &nbsp;·&nbsp; Q — Clone &nbsp;·&nbsp; E — Laser &nbsp;·&nbsp; P — Pause
        </div>
      )}
    </div>
  );
}

// ─── Hangar Overlay ───────────────────────────────────────────────────────────

function HangarOverlay({
  selectedSkin, coins, highScore, unlockedItems, hasSave, saveData,
  onStart, onNewGame, onSkinSelect, onBuy, onUnlockSkin,
}: {
  selectedSkin: string; coins: number; highScore: number;
  unlockedItems: string[]; hasSave: boolean; saveData: { level: number; score: number; weaponTier: number } | null;
  onStart: () => void; onNewGame: () => void;
  onSkinSelect: (id: string) => void; onBuy: (id: string) => void; onUnlockSkin: (id: string) => void;
}) {
  const [view, setView] = useState<"main" | "upgrades" | "settings">("main");
  const [hoverSkin, setHoverSkin] = useState<string | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const activeSkinId = hoverSkin ?? selectedSkin;
  const skin = JET_SKINS.find(s => s.id === activeSkinId) ?? JET_SKINS[0];

  useEffect(() => {
    const c = previewRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 240, 140);
    const bg = ctx.createLinearGradient(0, 0, 0, 140);
    bg.addColorStop(0, "#0a1628"); bg.addColorStop(1, "#050a10");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 240, 140);
    const gg = ctx.createRadialGradient(120, 70, 4, 120, 70, 65);
    gg.addColorStop(0, skin.glow + "44"); gg.addColorStop(1, "transparent");
    ctx.fillStyle = gg; ctx.fillRect(0, 0, 240, 140);
    drawPlayerJet(ctx, 90, 56, 5, false, skin);
  }, [activeSkinId, skin]);

  if (view === "upgrades") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ background: "rgba(4,12,28,0.97)" }}>
        <ShopScreen coins={coins} unlockedItems={unlockedItems} selectedSkin={selectedSkin}
          onBack={() => setView("main")} onBuy={onBuy} onUnlockSkin={onUnlockSkin} onSkinSelect={onSkinSelect} />
      </div>
    );
  }
  if (view === "settings") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ background: "rgba(4,12,28,0.97)" }}>
        <SettingsScreen onBack={() => setView("main")} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between px-6 py-4"
      style={{ background: "rgba(4,12,28,0.90)" }}>
      {/* ── Top bar ── */}
      <div className="w-full flex items-start justify-between">
        <div>
          <div className="font-black text-2xl tracking-widest" style={{ color: "#00cfff", textShadow: "0 0 14px #00cfff99" }}>
            FIGHTER COMMAND
          </div>
          <div className="text-xs text-slate-400 mt-0.5">2D Kampfjet-Simulator</div>
        </div>
        <div className="text-right">
          <div className="text-yellow-300 font-bold text-sm">⭐ {highScore.toLocaleString("de-DE")}</div>
          <div className="text-amber-400 font-bold text-sm">💰 {coins.toLocaleString("de-DE")}</div>
        </div>
      </div>

      {/* ── Jet preview ── */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-xs text-slate-500 uppercase tracking-widest">Dein Jet</div>
        <div className="rounded-2xl overflow-hidden"
          style={{ border: `1.5px solid ${skin.glow}55`, boxShadow: `0 0 24px ${skin.glow}33` }}>
          <canvas ref={previewRef} width={240} height={140} className="block" />
        </div>
        <div className="font-bold text-white text-sm tracking-wide">{skin.name}</div>
        {/* Colour picker dots */}
        <div className="flex gap-2.5 mt-0.5">
          {JET_SKINS.map(s => {
            const owned = s.cost === 0 || unlockedItems.includes(s.id);
            const active = s.id === selectedSkin;
            const previewing = s.id === hoverSkin;
            return (
              <button key={s.id}
                onClick={() => owned ? onSkinSelect(s.id) : setView("upgrades")}
                onMouseEnter={() => setHoverSkin(s.id)}
                onMouseLeave={() => setHoverSkin(null)}
                title={owned ? s.name : `${s.name} — 🔒 ${s.cost.toLocaleString("de-DE")} Punkte`}
                style={{
                  width: 22, height: 22, borderRadius: "50%", background: s.glow,
                  border: previewing ? `3px solid #fff` : active ? "3px solid #fff" : `2px solid ${s.glow}66`,
                  opacity: owned ? 1 : 0.3,
                  boxShadow: previewing ? `0 0 14px ${s.glow}, 0 0 4px #fff8` : active ? `0 0 10px ${s.glow}` : "none",
                  transform: previewing ? "scale(1.25)" : "scale(1)",
                  transition: "transform 0.12s, box-shadow 0.12s",
                }}
              />
            );
          })}
        </div>
        {/* Continue hint */}
        {hasSave && saveData && (
          <div className="text-xs text-emerald-400/80 mt-1">
            Gespeichert: Level {saveData.level} · {saveData.score.toLocaleString("de-DE")} Punkte · {WEAPON_TIERS[saveData.weaponTier]?.name}
          </div>
        )}
      </div>

      {/* ── Bottom buttons ── */}
      <div className="w-full flex gap-2">
        <button onClick={() => setView("upgrades")}
          className="flex-1 py-3 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95"
          style={{ background: "rgba(50,15,90,0.75)", border: "1.5px solid #7733bb", color: "#cc88ff" }}>
          ⚔️ AUFRÜSTEN
        </button>
        <div className="flex-[1.6] flex flex-col gap-1.5">
          {hasSave ? (
            <>
              <button onClick={onStart}
                className="w-full py-2.5 rounded-xl font-bold text-base tracking-widest transition-all active:scale-95"
                style={{ background: "rgba(0,70,140,0.85)", border: "2px solid #00cfff", color: "#00cfff", textShadow: "0 0 10px #00cfff88" }}>
                ▶ WEITERSPIELEN
              </button>
              <button onClick={onNewGame}
                className="w-full py-1.5 rounded-xl font-bold text-xs tracking-wider transition-all active:scale-95"
                style={{ background: "rgba(20,20,30,0.7)", border: "1px solid #334466", color: "#667799" }}>
                NEU STARTEN
              </button>
            </>
          ) : (
            <button onClick={onStart}
              className="w-full py-3 rounded-xl font-bold text-lg tracking-widest transition-all active:scale-95"
              style={{ background: "rgba(0,70,140,0.85)", border: "2px solid #00cfff", color: "#00cfff", textShadow: "0 0 10px #00cfff88" }}>
              ▶ STARTEN
            </button>
          )}
        </div>
        <button onClick={() => setView("settings")}
          className="flex-1 py-3 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95"
          style={{ background: "rgba(15,30,45,0.75)", border: "1.5px solid #335566", color: "#7799bb" }}>
          ⚙️ EINSTELLUNGEN
        </button>
      </div>
    </div>
  );
}

// ─── Shop Screen ──────────────────────────────────────────────────────────────

function ShopScreen({ coins, unlockedItems, selectedSkin, onBack, onBuy, onUnlockSkin, onSkinSelect }: {
  coins: number; unlockedItems: string[]; selectedSkin: string;
  onBack: () => void; onBuy: (id: string) => void;
  onUnlockSkin: (id: string) => void; onSkinSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full p-4 gap-3 overflow-y-auto select-none text-white">
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-xl font-bold px-2">←</button>
        <h2 className="font-bold text-xl tracking-wide">AUFRÜSTEN</h2>
        <span className="ml-auto text-amber-300 font-bold text-sm">💰 {coins.toLocaleString("de-DE")}</span>
      </div>

      <div className="text-slate-500 text-xs uppercase tracking-widest">Jet-Skins · 25.000 Punkte</div>
      <div className="grid grid-cols-3 gap-2 shrink-0">
        {JET_SKINS.map(s => {
          const owned = s.cost === 0 || unlockedItems.includes(s.id);
          const active = s.id === selectedSkin;
          const canAfford = coins >= s.cost;
          return (
            <button key={s.id}
              onClick={() => owned ? onSkinSelect(s.id) : canAfford ? onUnlockSkin(s.id) : undefined}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95"
              style={{
                background: active ? s.glow + "22" : "rgba(255,255,255,0.04)",
                border: active ? `2px solid ${s.glow}` : `1px solid ${s.glow}33`,
                opacity: !owned && !canAfford ? 0.45 : 1,
              }}>
              <div className="w-5 h-5 rounded-full" style={{ background: s.glow, boxShadow: `0 0 8px ${s.glow}88` }} />
              <div className="text-xs font-bold">{s.name}</div>
              {owned
                ? <div className="text-green-400 text-xs">{active ? "✓ Aktiv" : "Wählen"}</div>
                : <div className={`text-xs font-bold ${canAfford ? "text-amber-300" : "text-slate-500"}`}>
                    {canAfford ? "💰 Kaufen" : "🔒"}
                  </div>
              }
            </button>
          );
        })}
      </div>

      <div className="text-slate-500 text-xs uppercase tracking-widest mt-1">Upgrades · je 25.000 Punkte</div>
      <div className="flex flex-col gap-2">
        {SHOP_ITEMS.map(item => {
          const owned = unlockedItems.includes(item.id);
          const canAfford = coins >= item.cost;
          return (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: owned ? "rgba(0,180,80,0.10)" : "rgba(255,255,255,0.04)", border: `1px solid ${owned ? "#00aa4444" : "#333"}` }}>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{item.name}</div>
                <div className="text-slate-400 text-xs">{item.desc}</div>
              </div>
              {owned
                ? <span className="text-green-400 font-bold text-lg shrink-0">✓</span>
                : <button onClick={() => canAfford && onBuy(item.id)} disabled={!canAfford}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: "rgba(80,50,0,0.6)", border: "1px solid #aa8800", color: "#ffcc44" }}>
                    💰 {item.cost.toLocaleString("de-DE")}
                  </button>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

function SettingsScreen({ onBack }: { onBack: () => void }) {
  const controls = [
    ["WASD / Pfeiltasten", "Bewegen"],
    ["LEERTASTE", "Schießen"],
    ["Q", "Clone-Ulti"],
    ["E", "Laser-Ulti"],
    ["P", "Pause"],
  ];
  return (
    <div className="flex flex-col h-full p-4 gap-4 text-white select-none">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-xl font-bold px-2">←</button>
        <h2 className="font-bold text-xl tracking-wide">EINSTELLUNGEN</h2>
      </div>
      <div className="text-slate-500 text-xs uppercase tracking-widest">Tastatur</div>
      <div className="flex flex-col gap-2">
        {controls.map(([key, desc]) => (
          <div key={key} className="flex items-center gap-3">
            <kbd className="px-2 py-1 rounded-md bg-slate-800 text-slate-200 text-xs font-mono min-w-[120px] text-center border border-slate-600">{key}</kbd>
            <span className="text-slate-300 text-sm">{desc}</span>
          </div>
        ))}
      </div>
      <div className="text-slate-500 text-xs uppercase tracking-widest mt-2">Mobil / Touch</div>
      <div className="flex flex-col gap-1 text-slate-300 text-sm">
        <div>Linke Seite → Joystick (Bewegen)</div>
        <div>FIRE → Schießen</div>
        <div>CLONE → Clone-Ulti (Q)</div>
        <div>LASER → Laser-Ulti (E)</div>
      </div>
      <div className="text-slate-500 text-xs uppercase tracking-widest mt-2">Shop</div>
      <div className="text-slate-300 text-sm">Sammle Punkte beim Spielen — sie bleiben als Währung erhalten.<br />Jedes Item im Shop kostet <span className="text-amber-300 font-bold">25.000 Punkte</span>.</div>
    </div>
  );
}

// ─── Virtual controls overlay (drawn on canvas) ───────────────────────────────

const JOY_BASE_R = 56;
const JOY_KNOB_R = 22;
const FIRE_BTN_R = 46;
const FIRE_BTN_X = CANVAS_W - 80;
const FIRE_BTN_Y = CANVAS_H - 90;
const ULTI_BTN_X = CANVAS_W - 210;
const ULTI_BTN_Y = CANVAS_H - 90;
const ULTI_BTN_R = 36;
const ULTI_MAX = 300;
const ULTI_DURATION = 480;
const LASER_MAX = 520;
const LASER_DURATION = 480;
const LASER_BTN_X = CANVAS_W - 80;
const LASER_BTN_Y = CANVAS_H - 195;
const LASER_BTN_R = 36;

function drawVirtualControls(
  ctx: CanvasRenderingContext2D,
  js: { active: boolean; centerX: number; centerY: number; curX: number; curY: number },
  fireActive: boolean,
  ultimaCharge: number,
  ultimaActive: number,
  laserCharge: number,
  laserActive: number,
) {
  ctx.save();
  ctx.globalAlpha = 0.45;

  // ── Joystick hint (left zone) — always show base when inactive ──
  const baseX = js.active ? js.centerX : 110;
  const baseY = js.active ? js.centerY : CANVAS_H - 100;

  // Base ring
  ctx.beginPath();
  ctx.arc(baseX, baseY, JOY_BASE_R, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffffff11";
  ctx.fill();

  // Knob
  let kx = baseX, ky = baseY;
  if (js.active) {
    const dx = js.curX - js.centerX;
    const dy = js.curY - js.centerY;
    const d = Math.hypot(dx, dy);
    const clamped = Math.min(d, JOY_BASE_R - JOY_KNOB_R);
    kx = js.centerX + (dx / (d || 1)) * clamped;
    ky = js.centerY + (dy / (d || 1)) * clamped;
  }
  ctx.beginPath();
  ctx.arc(kx, ky, JOY_KNOB_R, 0, Math.PI * 2);
  ctx.fillStyle = js.active ? "#00cfff99" : "#ffffff44";
  ctx.fill();
  ctx.strokeStyle = "#ffffff66";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── Fire button (right zone) ──
  ctx.beginPath();
  ctx.arc(FIRE_BTN_X, FIRE_BTN_Y, FIRE_BTN_R, 0, Math.PI * 2);
  ctx.fillStyle = fireActive ? "#ff443388" : "#ff443322";
  ctx.fill();
  ctx.strokeStyle = fireActive ? "#ff6644cc" : "#ff444466";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.globalAlpha = fireActive ? 0.95 : 0.5;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("FIRE", FIRE_BTN_X, FIRE_BTN_Y);

  // ── ULTI button ──
  const ultiReady = ultimaCharge >= ULTI_MAX && ultimaActive === 0;
  const ultiGlow = ultiReady ? (0.55 + 0.45 * Math.sin(Date.now() / 200)) : 0.45;
  ctx.globalAlpha = ultiGlow;
  ctx.beginPath();
  ctx.arc(ULTI_BTN_X, ULTI_BTN_Y, ULTI_BTN_R, 0, Math.PI * 2);
  ctx.fillStyle   = ultimaActive > 0 ? "#ff00ff55" : ultiReady ? "#cc00ff44" : "#44004422";
  ctx.strokeStyle = ultimaActive > 0 ? "#ff00ffcc" : ultiReady ? "#cc00ffcc" : "#88008866";
  ctx.lineWidth = 2.5;
  ctx.fill(); ctx.stroke();

  // Charge arc
  if (ultimaActive === 0 && ultimaCharge < ULTI_MAX) {
    const pct = ultimaCharge / ULTI_MAX;
    ctx.beginPath();
    ctx.arc(ULTI_BTN_X, ULTI_BTN_Y, ULTI_BTN_R - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.strokeStyle = "#aa00ff";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.globalAlpha = ultiReady ? 0.95 : 0.55;
  ctx.fillStyle = ultiReady ? "#ff00ff" : "#cc88cc";
  ctx.font = `bold ${ultiReady ? 12 : 10}px 'Inter', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ultimaActive > 0 ? "ULTI!" : "ULTI", ULTI_BTN_X, ULTI_BTN_Y);

  // ── LASER button ──
  const laserReady = laserCharge >= LASER_MAX && laserActive === 0;
  const laserGlow = laserReady ? (0.55 + 0.45 * Math.sin(Date.now() / 180)) : 0.45;
  ctx.globalAlpha = laserGlow;
  ctx.beginPath();
  ctx.arc(LASER_BTN_X, LASER_BTN_Y, LASER_BTN_R, 0, Math.PI * 2);
  ctx.fillStyle   = laserActive > 0 ? "#ff880055" : laserReady ? "#ff660044" : "#44110022";
  ctx.strokeStyle = laserActive > 0 ? "#ffaa00cc" : laserReady ? "#ff8800cc" : "#88440066";
  ctx.lineWidth = 2.5;
  ctx.fill(); ctx.stroke();

  if (laserActive === 0 && laserCharge < LASER_MAX) {
    const lp = laserCharge / LASER_MAX;
    ctx.beginPath();
    ctx.arc(LASER_BTN_X, LASER_BTN_Y, LASER_BTN_R - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lp);
    ctx.strokeStyle = "#ff6600"; ctx.lineWidth = 4; ctx.stroke();
  }

  ctx.globalAlpha = laserReady ? 0.95 : 0.55;
  ctx.fillStyle = laserReady ? "#ffaa00" : "#cc8844";
  ctx.font = `bold ${laserReady ? 11 : 9}px 'Inter', sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(laserActive > 0 ? "LASER!" : "LASER", LASER_BTN_X, LASER_BTN_Y);

  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, gs: GameState, ultimaCharge: number, ultimaActive: number, laserCharge: number, laserActive: number) {
  ctx.save();
  ctx.textBaseline = "top";

  // Top bar background (taller to fit both ult bars)
  ctx.fillStyle = "rgba(4,10,24,0.72)";
  ctx.fillRect(0, 0, CANVAS_W, 56);

  // Score
  ctx.fillStyle = "#00cfff";
  ctx.font = "bold 18px 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE`, 16, 6);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.fillText(`${gs.score}`, 16, 24);

  // Level
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 14px 'Inter', sans-serif";
  ctx.fillText(`LEVEL ${gs.level}`, CANVAS_W / 2, 4);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px 'Inter', sans-serif";
  ctx.fillText(WEAPON_TIERS[gs.weaponTier].name.toUpperCase(), CANVAS_W / 2, 22);

  // XP bar (progress to next level)
  const thresholds = LEVEL_THRESHOLDS;
  const lo = thresholds[gs.level - 1] ?? 0;
  const hi = thresholds[gs.level] ?? lo + 999;
  const pct = Math.min(1, (gs.score - lo) / (hi - lo));
  const barX = CANVAS_W / 2 - 80, barY = 36, barW = 160, barH = 5;
  ctx.fillStyle = "#222";
  ctx.fillRect(barX, barY, barW, barH);
  const xpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  xpGrad.addColorStop(0, "#00cfff");
  xpGrad.addColorStop(1, "#7700ff");
  ctx.fillStyle = xpGrad;
  ctx.fillRect(barX, barY, barW * pct, barH);

  // HP bar
  const hpW = 130;
  ctx.textAlign = "right";
  ctx.fillStyle = "#ff4444";
  ctx.font = "bold 14px 'Inter', sans-serif";
  ctx.fillText("HP", CANVAS_W - hpW - 8, 6);
  ctx.fillStyle = "#222";
  ctx.fillRect(CANVAS_W - hpW - 4, 6, hpW, 12);
  const hpGrad = ctx.createLinearGradient(CANVAS_W - hpW - 4, 0, CANVAS_W - 4, 0);
  hpGrad.addColorStop(0, "#ff2222");
  hpGrad.addColorStop(1, "#ff8800");
  ctx.fillStyle = hpGrad;
  ctx.fillRect(CANVAS_W - hpW - 4, 6, hpW * (gs.hp / gs.maxHp), 12);

  // Lives
  ctx.textAlign = "right";
  ctx.fillStyle = "#aaa";
  ctx.font = "13px 'Inter', sans-serif";
  ctx.fillText(`LIVES: ${"★".repeat(Math.max(0, gs.lives))}`, CANVAS_W - 8, 24);

  const drawUltBar = (
    label: string, key: string,
    charge: number, maxCharge: number, active: number, duration: number,
    x: number, y: number, w: number, h: number,
    activeColors: [string, string], chargeColors: [string, string], labelColor: string,
  ) => {
    const pct = Math.min(1, charge / maxCharge);
    const ready = pct >= 1 && active === 0;
    ctx.textAlign = "left"; ctx.font = "bold 9px 'Inter', sans-serif";
    ctx.fillStyle = ready ? labelColor : active > 0 ? labelColor + "cc" : "#556";
    ctx.fillText(label, x, y);
    ctx.fillStyle = "#111"; ctx.fillRect(x + 30, y, w, h);
    if (active > 0) {
      const ap = active / duration;
      const ag = ctx.createLinearGradient(x + 30, 0, x + 30 + w, 0);
      ag.addColorStop(0, activeColors[0]); ag.addColorStop(1, activeColors[1]);
      ctx.fillStyle = ag; ctx.fillRect(x + 30, y, w * ap, h);
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 120);
      ctx.fillStyle = labelColor; ctx.font = "bold 9px 'Inter', sans-serif";
      ctx.fillText("ACTIVE", x + w + 36, y);
      ctx.globalAlpha = 1;
    } else if (pct > 0) {
      const cg = ctx.createLinearGradient(x + 30, 0, x + 30 + w, 0);
      cg.addColorStop(0, chargeColors[0]); cg.addColorStop(1, chargeColors[1]);
      ctx.fillStyle = cg; ctx.fillRect(x + 30, y, w * pct, h);
      if (ready) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 200);
        ctx.fillStyle = labelColor; ctx.font = "bold 9px 'Inter', sans-serif";
        ctx.fillText(`${key} — READY!`, x + w + 36, y);
        ctx.globalAlpha = 1;
      }
    }
  };

  drawUltBar("CLONE", "Q", ultimaCharge, ULTI_MAX, ultimaActive, ULTI_DURATION,
    16, 42, 120, 5, ["#ff00ff","#8800ff"], ["#6600bb","#cc00ff"], "#ff44ff");
  drawUltBar("LASER", "E", laserCharge, LASER_MAX, laserActive, LASER_DURATION,
    16, 52, 120, 5, ["#ff8800","#ffdd00"], ["#cc4400","#ff8800"], "#ffaa22");

  ctx.restore();
}
