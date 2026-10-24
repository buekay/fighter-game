import assert from 'node:assert/strict';
import { getGhostWorld, GHOST_WORLDS, GHOST_AIRCRAFT, createGhostShots, getGhostAircraft, ensureGhostAircraft, prepareGhostSpawn, shouldSpawnRareGhostAircraft, canSpawnElementSpirit, RARE_GHOST_AIRCRAFT_CHANCE, type GhostAircraftId } from './ghost-worlds';
import { getCampaignLandscape, isCampaignBossLevel } from './campaign';
const seen = new Set();
for (let level = 1; level <= 500; level++) {
  const world = getGhostWorld(level);
  assert.equal(getCampaignLandscape(level).ghostWorld, world);
  if (world) {
    assert.equal(isCampaignBossLevel(level), false, 'ghost sectors do not replace boss arenas');
    assert.ok(getCampaignLandscape(level).name.includes(world.name));
    seen.add(world);
  }
}
assert.equal(seen.size, GHOST_WORLDS.length);
for (const invalid of [0, -1, NaN, Infinity, 4.5, 504]) assert.equal(getGhostWorld(invalid), null);
for (let level = 1; level < 15; level++) assert.equal(getGhostWorld(level), null, 'no ghost worlds before level 15');
assert.equal(getGhostWorld(15), null, 'level 15 keeps its boss encounter');
assert.equal(getGhostWorld(16), GHOST_WORLDS[0]);
assert.equal(getGhostWorld(24), GHOST_WORLDS[1]);
assert.equal(getGhostWorld(32), GHOST_WORLDS[2]);
assert.equal(GHOST_AIRCRAFT.length, 18);
assert.equal(new Set(GHOST_AIRCRAFT.map(a => a.element)).size, 4);
assert.equal(new Set(GHOST_AIRCRAFT.map(a => a.shotColor)).size, 18);
for (const aircraft of GHOST_AIRCRAFT) {
  assert.equal(getGhostAircraft(aircraft.id), aircraft);
  const shots = createGhostShots(aircraft.id, { x: 700, y: 300 }, { x: 100, y: 300 });
  assert.equal(shots.length, aircraft.count);
  assert.ok(shots.every(shot => shot.color === aircraft.shotColor && shot.ghostElement === aircraft.element));
  assert.ok(shots.every(shot => shot.vx < 0 && shot.damage === 2 && !shot.fromPlayer));
  assert.ok(shots.every(shot => Math.abs(Math.hypot(shot.vx, shot.vy) - aircraft.shotSpeed) < 1e-9));
  assert.ok(Math.abs(shots.reduce((sum, shot) => sum + shot.vy, 0)) < 1e-9, 'symmetric spread');
  const aimed = createGhostShots(aircraft.id, { x: 700, y: 200 }, { x: 100, y: 450 });
  assert.ok(aimed.reduce((sum, shot) => sum + shot.vy, 0) > 0, 'aim at current attack target');
}
assert.equal(getGhostAircraft(undefined), undefined);
assert.equal(getGhostAircraft('unknown'), undefined);
console.log('Ghost world progression tests passed');

for (const roll of [0, .25, .5, .75, 1, NaN, -3, 9]) {
  const formation: { color: string; shootCooldown: number; ghostAircraftId?: GhostAircraftId } = { color: '#ff0000', shootCooldown: 200 };
  ensureGhostAircraft(formation, roll);
  const aircraft = getGhostAircraft(formation.ghostAircraftId)!;
  assert.ok(aircraft, 'every formation receives a valid elemental aircraft');
  assert.equal(formation.color, aircraft.color);
  assert.equal(formation.shootCooldown, aircraft.cooldown);
  formation.shootCooldown = 7;
  const previousId = formation.ghostAircraftId;
  ensureGhostAircraft(formation, .8);
  assert.equal(formation.ghostAircraftId, previousId, 'variant remains stable across frames');
  assert.equal(formation.shootCooldown, 7, 'normal updates do not reset cooldown');
}
assert.deepEqual(createGhostShots('bad' as GhostAircraftId, { x: 0, y: 0 }, { x: 1, y: 0 }), []);

const spiritLevels = Array.from({ length: 500 }, (_, i) => i + 1).filter(level => getGhostWorld(level));
assert.equal(spiritLevels.length, 61);
assert.equal(spiritLevels[0], 16);
for (let i = 1; i < spiritLevels.length; i++) assert.equal(spiritLevels[i] - spiritLevels[i - 1], 8);
for (const level of [20, 26, 34, 46]) assert.equal(getGhostWorld(level), null);

for (const element of ['ember', 'water', 'crystal', 'storm']) assert.equal(GHOST_AIRCRAFT.filter(a => a.element === element).length, element === 'ember' || element === 'water' ? 5 : 4);
assert.equal(new Set(GHOST_AIRCRAFT.map(a => a.id)).size, 18);

for (const type of ['scout', 'fighter', 'bomber', 'biome', 'laserdevice', 'overlord', 'titan', 'boss']) {
  const source: { type: string; color: string; shootCooldown: number; encounterKind?: string; parts?: unknown; shieldHp?: number; campaignBoss?: boolean; submarineDiveMs?: number; ghostAircraftId?: GhostAircraftId } = { type, color: '#f00', shootCooldown: 60, encounterKind: 'titan', parts: [{}], shieldHp: 5, campaignBoss: true, submarineDiveMs: 3000 };
  const ghost = prepareGhostSpawn(source, 16, .3);
  assert.ok(getGhostAircraft(ghost.ghostAircraftId));
  assert.ok(ghost.type === 'fighter' || ghost.type === 'bomber');
  assert.equal(ghost.encounterKind, undefined);
  assert.equal(ghost.parts, undefined);
  assert.equal(ghost.shieldHp, 0);
  assert.equal(ghost.submarineDiveMs, 0);
  assert.equal(ghost.campaignBoss, undefined);
  assert.equal(source.type, type, 'source template is preserved');
  assert.equal(prepareGhostSpawn(source, 15, .3), source, 'normal boss levels keep their original enemies');
}

const newAircraft = GHOST_AIRCRAFT.filter(a => 'outline' in a);
assert.equal(newAircraft.length, 10, 'ten additional aircraft have distinct hulls');
assert.equal(new Set(newAircraft.map(a => JSON.stringify(a.outline))).size, 10);
for (const aircraft of newAircraft) {
  assert.ok(aircraft.outline.every(([x, y]) => Math.abs(x) <= 39 && Math.abs(y) <= 23), 'new hulls fit their collision bounds');
}
const selected = new Set();
for (let i = 0; i < GHOST_AIRCRAFT.length; i++) {
  const enemy: { color: string; shootCooldown: number; ghostAircraftId?: GhostAircraftId } = { color: '', shootCooldown: 200 };
  ensureGhostAircraft(enemy, (i + .5) / GHOST_AIRCRAFT.length);
  selected.add(enemy.ghostAircraftId);
}
assert.equal(selected.size, 18, 'all eighteen aircraft are reachable in the spawn pool');

for (let level = 1; level <= 500; level++) {
  assert.equal(canSpawnElementSpirit(level), Boolean(getGhostWorld(level)), 'element spirits only exist in ghost worlds');
  assert.equal(shouldSpawnRareGhostAircraft(level, 0), level >= 15 && !getGhostWorld(level));
}
assert.equal(shouldSpawnRareGhostAircraft(17, RARE_GHOST_AIRCRAFT_CHANCE - .000001), true);
assert.equal(shouldSpawnRareGhostAircraft(17, RARE_GHOST_AIRCRAFT_CHANCE), false);
for (const roll of [NaN, Infinity, -1, 1]) assert.equal(shouldSpawnRareGhostAircraft(17, roll), false);
let rareCount = 0;
for (let i = 0; i < 10000; i++) if (shouldSpawnRareGhostAircraft(17, i / 10000)) rareCount++;
assert.equal(rareCount, 20, '0.2 percent of regular spawns are rare ghost aircraft');
