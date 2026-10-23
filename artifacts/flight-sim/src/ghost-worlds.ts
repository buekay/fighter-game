export const GHOST_WORLDS = [
  { name: 'Nebelreich', sky: '#080f25', horizon: '#244e60', color: '#8cf5e5', accent: '#e0fffa', event: 'wave' as const },
  { name: 'Splitterdimension', sky: '#100b29', horizon: '#443666', color: '#c8b0ff', accent: '#f6e7ff', event: 'ice' as const },
  { name: 'Geistersturm', sky: '#061b24', horizon: '#205550', color: '#93ffca', accent: '#e4fff3', event: 'lightning' as const },
] as const;
export type GhostWorld = typeof GHOST_WORLDS[number];
/** One spirit sector every 8 levels, starting at level 16 after the level-15 unlock. */
export function getGhostWorld(level: number): GhostWorld | null {
  if (!Number.isInteger(level) || level < 15 || level > 500 || level % 8 !== 0) return null;
  return GHOST_WORLDS[Math.floor((level - 16) / 8) % GHOST_WORLDS.length];
}
export type GhostElement = 'ember' | 'water' | 'crystal' | 'storm';
export const GHOST_AIRCRAFT = [
  { id: 'ember', element: 'ember', name: 'Glutphantom', width: 60, height: 36, hp: 5, speed: 2.4, points: 70, color: '#ff9654', shotColor: '#ff792e', cooldown: 90, shotSpeed: 4.2, spread: .12, count: 2 },
  { id: 'water', element: 'water', name: 'Gezeitengeist', width: 68, height: 40, hp: 7, speed: 1.8, points: 85, color: '#6ce6e3', shotColor: '#39d9ed', cooldown: 115, shotSpeed: 3.3, spread: .18, count: 3 },
  { id: 'crystal', element: 'crystal', name: 'Splitterflügel', width: 76, height: 46, hp: 9, speed: 1.4, points: 105, color: '#cca9ff', shotColor: '#c487ff', cooldown: 140, shotSpeed: 3.8, spread: .17, count: 5 },
  { id: 'storm', element: 'storm', name: 'Donnererscheinung', width: 54, height: 32, hp: 4, speed: 3.0, points: 80, color: '#dceaa0', shotColor: '#e6ff5c', cooldown: 80, shotSpeed: 5.4, spread: 0, count: 1 },
  { id: 'ash-wing', element: 'ember', name: 'Aschenschwinge', width: 78, height: 44, hp: 10, speed: 1.3, points: 115, color: '#efb376', shotColor: '#ffb348', cooldown: 135, shotSpeed: 3.5, spread: .15, count: 4 },
  { id: 'tide-spear', element: 'water', name: 'Nebellanze', width: 58, height: 30, hp: 4, speed: 2.9, points: 75, color: '#83bfff', shotColor: '#66aaff', cooldown: 75, shotSpeed: 4.8, spread: 0, count: 1 },
  { id: 'frost-crown', element: 'crystal', name: 'Frostkrone', width: 82, height: 48, hp: 12, speed: 1.1, points: 130, color: '#a2f2f9', shotColor: '#aff6ff', cooldown: 160, shotSpeed: 3.0, spread: .2, count: 7 },
  { id: 'storm-scythe', element: 'storm', name: 'Sturmsichel', width: 66, height: 42, hp: 6, speed: 2.5, points: 95, color: '#baacff', shotColor: '#9b83ff', cooldown: 105, shotSpeed: 4.6, spread: .22, count: 3 },
] as const;
export type GhostAircraftId = typeof GHOST_AIRCRAFT[number]['id'];
export function getGhostAircraft(id: string | undefined) {
  return GHOST_AIRCRAFT.find(aircraft => aircraft.id === id);
}
export function createGhostShots(id: GhostAircraftId, origin: { x: number; y: number }, target: { x: number; y: number }) {
  const aircraft = getGhostAircraft(id);
  if (!aircraft) return [];
  const aim = Math.atan2(target.y - origin.y, target.x - origin.x);
  return Array.from({ length: aircraft.count }, (_, index) => {
    const angle = aim + (index - (aircraft.count - 1) / 2) * aircraft.spread;
    return { ...origin, vx: Math.cos(angle) * aircraft.shotSpeed, vy: Math.sin(angle) * aircraft.shotSpeed,
      fromPlayer: false, damage: 2, color: aircraft.shotColor, ghostElement: aircraft.element,
      collisionWidth: 8, collisionHeight: 8, lifetime: 240 };
  });
}

/** Formations and scripted waves must receive the same elemental weapons as regular spawns. */
export function ensureGhostAircraft<T extends { ghostAircraftId?: GhostAircraftId; color: string; shootCooldown: number }>(enemy: T, roll: number): void {
  if (getGhostAircraft(enemy.ghostAircraftId)) return;
  const safeRoll = Number.isFinite(roll) ? Math.max(0, Math.min(1, roll)) : 0;
  const aircraft = GHOST_AIRCRAFT[Math.min(GHOST_AIRCRAFT.length - 1, Math.floor(safeRoll * GHOST_AIRCRAFT.length))];
  enemy.ghostAircraftId = aircraft.id; enemy.color = aircraft.color;
  enemy.shootCooldown = Math.min(enemy.shootCooldown, aircraft.cooldown);
}

/** Convert every enemy source before insertion, including secret aces and rare events. */
export function prepareGhostSpawn<T extends {
  type: string; color: string; shootCooldown: number; ghostAircraftId?: GhostAircraftId;
  encounterKind?: string; parts?: unknown; shieldHp?: number;
  campaignBoss?: boolean; submarineDiveMs?: number;
}>(enemy: T, level: number, roll: number): T {
  if (!getGhostWorld(level)) return enemy;
  const ghost = { ...enemy };
  ensureGhostAircraft(ghost, roll);
  ghost.type = getGhostAircraft(ghost.ghostAircraftId)?.element === 'crystal' ? 'bomber' : 'fighter';
  delete ghost.encounterKind;
  delete ghost.parts;
  delete ghost.campaignBoss;
  ghost.submarineDiveMs = 0;
  ghost.shieldHp = 0;
  return ghost;
}
