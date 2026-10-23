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
  { id: 'cinder-arrow', element: 'ember', name: 'Funkenpfeil', width: 50, height: 28, hp: 3, speed: 3.4, points: 80, color: '#ffd077', shotColor: '#ffcf55', cooldown: 68, shotSpeed: 5.1, spread: 0.09, count: 2, outline: [[-39, 0], [4, -9], [21, -22], [26, -19], [17, -4], [38, -7], [32, 0], [38, 7], [17, 4], [26, 19], [21, 22], [4, 9]] },
  { id: 'magma-manta', element: 'ember', name: 'Magmaschatten', width: 88, height: 48, hp: 14, speed: 1.0, points: 145, color: '#ff7e68', shotColor: '#ff5849', cooldown: 165, shotSpeed: 3.2, spread: 0.16, count: 6, outline: [[-36, 0], [-23, -10], [-29, -20], [-9, -14], [11, -23], [32, -18], [38, -7], [26, -4], [30, 0], [26, 4], [38, 7], [32, 18], [11, 23], [-9, 14], [-29, 20], [-23, 10]] },
  { id: 'ember-trident', element: 'ember', name: 'Glutdreizack', width: 72, height: 42, hp: 8, speed: 1.9, points: 105, color: '#ffb995', shotColor: '#ff9f7a', cooldown: 120, shotSpeed: 4.1, spread: 0.25, count: 3, outline: [[-39, 0], [-17, -4], [-31, -15], [-9, -12], [-16, -23], [12, -16], [33, -18], [24, -5], [39, -4], [31, 0], [39, 4], [24, 5], [33, 18], [12, 16], [-16, 23], [-9, 12], [-31, 15], [-17, 4]] },
  { id: 'mist-ray', element: 'water', name: 'Nebelgleiter', width: 74, height: 44, hp: 8, speed: 2.0, points: 100, color: '#75ffe7', shotColor: '#50f5c2', cooldown: 125, shotSpeed: 3.6, spread: 0.15, count: 4, outline: [[-38, 0], [-20, -7], [-11, -17], [4, -23], [23, -17], [38, -10], [17, -8], [28, -3], [20, 0], [28, 3], [17, 8], [38, 10], [23, 17], [4, 23], [-11, 17], [-20, 7]] },
  { id: 'abyss-wing', element: 'water', name: 'Tiefenflügel', width: 86, height: 46, hp: 13, speed: 1.2, points: 140, color: '#739aef', shotColor: '#557dff', cooldown: 155, shotSpeed: 3.7, spread: 0.21, count: 5, outline: [[-39, 0], [-14, -5], [-8, -23], [6, -21], [4, -10], [24, -21], [38, -18], [23, -4], [36, 0], [23, 4], [38, 18], [24, 21], [4, 10], [6, 21], [-8, 23], [-14, 5]] },
  { id: 'torrent-fin', element: 'water', name: 'Strömungsklinge', width: 62, height: 34, hp: 5, speed: 3.1, points: 90, color: '#9fe8ff', shotColor: '#7de8fa', cooldown: 85, shotSpeed: 5.0, spread: 0.13, count: 2, outline: [[-39, 0], [-12, -6], [-24, -19], [-6, -15], [12, -23], [15, -8], [35, -12], [30, -3], [39, 0], [30, 3], [35, 12], [15, 8], [12, 23], [-6, 15], [-24, 19], [-12, 6]] },
  { id: 'prism-lance', element: 'crystal', name: 'Prismenlanze', width: 58, height: 36, hp: 5, speed: 2.8, points: 95, color: '#f2b9f2', shotColor: '#ff9be9', cooldown: 100, shotSpeed: 5.2, spread: 0, count: 1, outline: [[-39, 0], [-15, -5], [-3, -18], [9, -10], [21, -23], [26, -12], [20, -4], [38, -8], [30, 0], [38, 8], [20, 4], [26, 12], [21, 23], [9, 10], [-3, 18], [-15, 5]] },
  { id: 'shard-fortress', element: 'crystal', name: 'Scherbenfestung', width: 92, height: 50, hp: 16, speed: 0.9, points: 160, color: '#d5bdff', shotColor: '#e0b0ff', cooldown: 180, shotSpeed: 3.1, spread: 0.18, count: 7, outline: [[-38, 0], [-24, -10], [-12, -7], [-19, -22], [-1, -18], [10, -23], [18, -14], [35, -19], [30, -7], [39, 0], [30, 7], [35, 19], [18, 14], [10, 23], [-1, 18], [-19, 22], [-12, 7], [-24, 10]] },
  { id: 'ion-fork', element: 'storm', name: 'Ionenzwilling', width: 68, height: 40, hp: 7, speed: 2.7, points: 110, color: '#b5f8b0', shotColor: '#96ff83', cooldown: 95, shotSpeed: 5.0, spread: 0.11, count: 2, outline: [[-39, -9], [-21, -15], [6, -23], [15, -17], [1, -9], [31, -13], [38, -8], [22, -3], [31, 0], [22, 3], [38, 8], [31, 13], [1, 9], [15, 17], [6, 23], [-21, 15], [-39, 9], [-11, 0]] },
  { id: 'tempest-halo', element: 'storm', name: 'Sturmkranz', width: 80, height: 48, hp: 11, speed: 1.7, points: 135, color: '#f4e5a5', shotColor: '#fff0a0', cooldown: 145, shotSpeed: 4.5, spread: 0.2, count: 5, outline: [[-39, 0], [-24, -9], [-16, -21], [3, -23], [23, -17], [38, -5], [24, -9], [10, -12], [0, -10], [-7, 0], [0, 10], [10, 12], [24, 9], [38, 5], [23, 17], [3, 23], [-16, 21], [-24, 9]] },
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
