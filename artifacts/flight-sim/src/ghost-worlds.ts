export const GHOST_WORLDS = [
  { name: 'Nebelreich', sky: '#080f25', horizon: '#244e60', color: '#8cf5e5', accent: '#e0fffa', event: 'wave' as const },
  { name: 'Splitterdimension', sky: '#100b29', horizon: '#443666', color: '#c8b0ff', accent: '#f6e7ff', event: 'ice' as const },
  { name: 'Geistersturm', sky: '#061b24', horizon: '#205550', color: '#93ffca', accent: '#e4fff3', event: 'lightning' as const },
] as const;
export type GhostWorld = typeof GHOST_WORLDS[number];
/** Two spirit sectors per ten levels; normal biome progression stays intact. */
export function getGhostWorld(level: number): GhostWorld | null {
  if (!Number.isInteger(level) || level < 1 || level > 500 || (level % 10 !== 4 && level % 10 !== 6)) return null;
  return GHOST_WORLDS[(Math.floor(level / 10) * 2 + (level % 10 === 6 ? 1 : 0)) % GHOST_WORLDS.length];
}
export const GHOST_AIRCRAFT = [
  { name: 'Nebeljäger', width: 50, height: 30, hp: 3, speed: 2.7, points: 55 },
  { name: 'Phantomflügel', width: 64, height: 42, hp: 6, speed: 1.9, points: 80 },
  { name: 'Seelenbomber', width: 78, height: 46, hp: 10, speed: 1.2, points: 110 },
] as const;
