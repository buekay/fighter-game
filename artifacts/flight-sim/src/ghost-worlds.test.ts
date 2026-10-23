import assert from 'node:assert/strict';
import { getGhostWorld, GHOST_WORLDS, GHOST_AIRCRAFT } from './ghost-worlds';
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
assert.equal(getGhostWorld(4), GHOST_WORLDS[0]);
assert.equal(getGhostWorld(6), GHOST_WORLDS[1]);
assert.equal(getGhostWorld(14), GHOST_WORLDS[2]);
assert.equal(GHOST_AIRCRAFT.length, 3);
console.log('Ghost world progression tests passed');
