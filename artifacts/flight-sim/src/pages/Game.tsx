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

interface Bullet {
  x: number; y: number;
  vx: number; vy: number;
  fromPlayer: boolean;
  damage: number;
  isMissile?: boolean;
  missileTarget?: Enemy | null;
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
const ENEMY_BULLET_SPEED = 4;

const LEVEL_THRESHOLDS = [0, 150, 350, 600, 900, 1250, 9999];
const WEAPON_TIERS = [
  { name: "Single Cannon",    guns: 1, spread: false, missile: false, fireRate: 280, bulletDmg: 1 },
  { name: "Twin Cannons",     guns: 2, spread: false, missile: false, fireRate: 250, bulletDmg: 1 },
  { name: "Triple Burst",     guns: 3, spread: true,  missile: false, fireRate: 220, bulletDmg: 1 },
  { name: "Quad Cannons",     guns: 4, spread: true,  missile: false, fireRate: 190, bulletDmg: 1 },
  { name: "Missile Lock",     guns: 3, spread: true,  missile: true,  fireRate: 170, bulletDmg: 2 },
  { name: "Superweapon",      guns: 5, spread: true,  missile: true,  fireRate: 140, bulletDmg: 2 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function dist(a: Vec2, b: Vec2) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function rectHit(ax: number, ay: number, aw: number, ah: number,
                 bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────

function drawPlayerJet(ctx: CanvasRenderingContext2D, x: number, y: number, tier: number, shieldActive: boolean) {
  ctx.save();
  ctx.translate(x + PLAYER_W / 2, y + PLAYER_H / 2);

  // Engine glow
  const glowColors = ["#00cfff", "#00cfff", "#00ff88", "#ff9900", "#ff4444", "#ff00ff"];
  const glow = glowColors[Math.min(tier, glowColors.length - 1)];
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
  ctx.fillStyle = "#1a2a4a";
  ctx.fill();
  ctx.strokeStyle = "#2a4a8a";
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
  ctx.fillStyle = "#162040"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-14, 22); ctx.lineTo(-22, 10); ctx.closePath();
  ctx.fillStyle = "#162040"; ctx.fill(); ctx.stroke();

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
  if (b.isMissile) {
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
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
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
    score: 0, level: 1, hp: 5, maxHp: 5,
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

  const spawnEnemy = useCallback((level: number) => {
    const roll = Math.random();
    let type: Enemy["type"] = "scout";
    let hp = 1, w = 40, h = 20, vx = -rand(1.5, 3), pts = 10, color = "#ff4444";
    const isBossLevel = level >= 3 && timeRef.current % (1200 - level * 80) < 5;

    if (isBossLevel && enemiesRef.current.filter(e => e.type === "boss").length === 0) {
      type = "boss"; hp = 12 + level * 3; w = 80; h = 60; vx = -rand(0.6, 1.2); pts = 200 + level * 50; color = "#cc00ff";
    } else if (level >= 4 && roll < 0.15) {
      type = "bomber"; hp = 4 + level; w = 56; h = 40; vx = -rand(0.8, 1.5); pts = 60; color = "#44ff44";
    } else if (level >= 2 && roll < 0.4) {
      type = "fighter"; hp = 2 + Math.floor(level / 2); w = 48; h = 28; vx = -rand(1.8, 3.2); pts = 30; color = "#ffcc00";
    }

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

  const startGame = useCallback(() => {
    stateRef.current = {
      score: 0, level: 1, hp: 5, maxHp: 5,
      shield: 0, speed: 3.2, weaponTier: 0,
      lives: 3, gameOver: false, started: true, paused: false,
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
    syncDisplay();
  }, [syncDisplay]);

  useEffect(() => {
    initStars();
    const onKey = (e: KeyboardEvent, down: boolean) => {
      keysRef.current[down ? "add" : "delete"](e.key);
      if (e.key === " " && !stateRef.current.started) startGame();
      if (e.key === "p" || e.key === "P") {
        if (stateRef.current.started && !stateRef.current.gameOver) {
          stateRef.current.paused = !stateRef.current.paused;
          syncDisplay();
        }
      }
    };
    window.addEventListener("keydown", e => onKey(e, true));
    window.addEventListener("keyup", e => onKey(e, false));
    return () => {
      window.removeEventListener("keydown", e => onKey(e, true));
      window.removeEventListener("keyup", e => onKey(e, false));
    };
  }, [initStars, startGame, syncDisplay]);

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

      // ── Clear ──
      ctx.fillStyle = "#08080e";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // ── Stars ──
      starsRef.current.forEach(s => {
        s.x -= s.speed;
        if (s.x < 0) { s.x = CANVAS_W; s.y = rand(0, CANVAS_H); }
        ctx.globalAlpha = s.brightness;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (!gs.started) {
        // Title screen
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = "#00cfff";
        ctx.font = "bold 52px 'Inter', sans-serif";
        ctx.shadowColor = "#00cfff"; ctx.shadowBlur = 20;
        ctx.fillText("FIGHTER COMMAND", CANVAS_W / 2, CANVAS_H / 2 - 80);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#aaa";
        ctx.font = "20px 'Inter', sans-serif";
        ctx.fillText("2D Fighter Jet Simulator", CANVAS_W / 2, CANVAS_H / 2 - 40);
        ctx.fillStyle = "#fff";
        ctx.font = "16px 'Inter', sans-serif";
        ctx.fillText("Arrow Keys / WASD — Move      Space — Shoot", CANVAS_W / 2, CANVAS_H / 2 + 10);
        ctx.fillText("Collect points to unlock powerful weapons!", CANVAS_W / 2, CANVAS_H / 2 + 38);

        const pulse = 0.6 + 0.4 * Math.sin(timestamp / 500);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = "#ffcc00";
        ctx.font = "bold 22px 'Inter', sans-serif";
        ctx.fillText("Press SPACE to Launch", CANVAS_W / 2, CANVAS_H / 2 + 80);
        ctx.globalAlpha = 1;

        // Weapon tier preview
        ctx.fillStyle = "#555";
        ctx.font = "13px 'Inter', sans-serif";
        ctx.fillText("WEAPONS: Single → Twin → Triple → Quad → Missile Lock → Superweapon", CANVAS_W / 2, CANVAS_H / 2 + 130);
        ctx.restore();
        return;
      }

      if (gs.paused) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 40px 'Inter', sans-serif";
        ctx.fillText("PAUSED", CANVAS_W / 2, CANVAS_H / 2);
        ctx.font = "18px 'Inter', sans-serif";
        ctx.fillStyle = "#aaa";
        ctx.fillText("Press P to continue", CANVAS_W / 2, CANVAS_H / 2 + 40);
        ctx.restore();
        return;
      }

      if (gs.gameOver) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff4444";
        ctx.font = "bold 52px 'Inter', sans-serif";
        ctx.shadowColor = "#ff4444"; ctx.shadowBlur = 20;
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 60);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "26px 'Inter', sans-serif";
        ctx.fillText(`Final Score: ${gs.score}`, CANVAS_W / 2, CANVAS_H / 2);
        ctx.fillStyle = "#aaa";
        ctx.font = "18px 'Inter', sans-serif";
        ctx.fillText(`Reached Level ${gs.level} · Weapon: ${WEAPON_TIERS[gs.weaponTier].name}`, CANVAS_W / 2, CANVAS_H / 2 + 38);
        const pulse2 = 0.6 + 0.4 * Math.sin(timestamp / 500);
        ctx.globalAlpha = pulse2;
        ctx.fillStyle = "#ffcc00";
        ctx.font = "bold 20px 'Inter', sans-serif";
        ctx.fillText("Press SPACE to Play Again", CANVAS_W / 2, CANVAS_H / 2 + 90);
        ctx.globalAlpha = 1;
        ctx.restore();

        const spacePressed = keysRef.current.has(" ");
        if (spacePressed) startGame();
        return;
      }

      // ── Input & Player Movement ──
      const spd = gs.speed;
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
        playerRef.current.x = clamp(playerRef.current.x + spd * 0.8, 0, CANVAS_W / 2);
      }

      const firing = keysRef.current.has(" ");
      if (firing) fireBullets(timestamp);

      // ── Level / Weapon tier ──
      const newLevel = LEVEL_THRESHOLDS.findIndex((t, i) =>
        gs.score >= t && gs.score < (LEVEL_THRESHOLDS[i + 1] ?? Infinity)
      );
      if (newLevel > 0 && newLevel !== gs.level - 1) {
        gs.level = newLevel + 1;
        gs.weaponTier = Math.min(newLevel, WEAPON_TIERS.length - 1);
        gs.speed = 3.2 + newLevel * 0.25;
      }

      // ── Spawn enemies ──
      const spawnRate = Math.max(40, 110 - gs.level * 12);
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
        b.x += b.vx;
        b.y += b.vy;
        drawBullet(ctx, b);
        return b.x > -20 && b.x < CANVAS_W + 20 && b.y > -20 && b.y < CANVAS_H + 20;
      });

      // ── Update enemies ──
      if (invincibleRef.current > 0) invincibleRef.current--;
      if (shieldTimerRef.current > 0) shieldTimerRef.current--;

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
              fromPlayer: false, damage: e.type === "boss" ? 2 : 1,
            });
          }
        }

        // Draw enemy
        drawEnemy(ctx, e);

        // Enemy-player collision
        if (invincibleRef.current <= 0 && shieldTimerRef.current <= 0 &&
          rectHit(playerRef.current.x, playerRef.current.y, PLAYER_W, PLAYER_H, e.x, e.y, e.width, e.height)) {
          gs.hp = Math.max(0, gs.hp - 2);
          invincibleRef.current = 90;
          spawnExplosion(particlesRef.current, e.x + e.width / 2, e.y + e.height / 2, true);
          e.dead = true;
          if (gs.hp <= 0) { gs.gameOver = true; syncDisplay(); }
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
        invincibleRef.current = 60;
        spawnExplosion(particlesRef.current, b.x, b.y, false);
        if (gs.hp <= 0) { gs.gameOver = true; }
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
          if (p.type === "health") gs.hp = Math.min(gs.maxHp, gs.hp + 2);
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

      // ── Draw player ──
      if (invincibleRef.current <= 0 || Math.floor(timeRef.current / 5) % 2 === 0) {
        drawPlayerJet(ctx, playerRef.current.x, playerRef.current.y, gs.weaponTier, shieldTimerRef.current > 0);
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
      drawHUD(ctx, gs, starsRef.current.length);

      // Sync display once per ~30 frames for React state
      if (timeRef.current % 30 === 0) syncDisplay();
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [fireBullets, spawnEnemy, startGame, syncDisplay]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-[#08080e] select-none">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="border border-cyan-900/40 shadow-[0_0_40px_#00cfff22] rounded"
        style={{ maxWidth: "100%", maxHeight: "100vh", objectFit: "contain" }}
        tabIndex={0}
        onClick={() => {
          if (!stateRef.current.started || stateRef.current.gameOver) startGame();
        }}
      />
      {displayState.started && !displayState.gameOver && (
        <div className="mt-2 text-xs text-gray-600 tracking-wider">
          ARROW KEYS / WASD — Move &nbsp;·&nbsp; SPACE — Fire &nbsp;·&nbsp; P — Pause
        </div>
      )}
    </div>
  );
}

function drawHUD(ctx: CanvasRenderingContext2D, gs: GameState, _stars: number) {
  ctx.save();
  ctx.textBaseline = "top";

  // Top bar background
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, CANVAS_W, 44);

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
  const thresholds = [0, 150, 350, 600, 900, 1250, 9999];
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

  ctx.restore();
}
