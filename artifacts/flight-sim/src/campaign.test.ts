import assert from 'node:assert/strict';
import { MAX_LEVEL, getLevelThreshold } from './game-rules';
import { BIOMES, getAvailableBiomeEnemies } from './biomes';
import { normalizeCompleted, isLevelUnlocked, getCampaignTarget, canCompleteCampaignLevel, getCampaignLandscape, completeCampaignLevel, loadCompletedLevels, getCampaignMode, isCampaignProtectLevel, isCampaignBossLevel } from './campaign';
assert.equal(isLevelUnlocked(1, 0), true);
assert.equal(isLevelUnlocked(2, 0), false);
assert.equal(isLevelUnlocked(4, 2), false);
assert.equal(isLevelUnlocked(3, 2), true);
for (const invalid of [0, -1, 1.5, NaN, MAX_LEVEL+1]) assert.equal(isLevelUnlocked(invalid, MAX_LEVEL), false);
for (const corrupt of [null, '8', NaN, Infinity, {}, 1.5]) assert.equal(normalizeCompleted(corrupt), 0);
for(let level=1;level<MAX_LEVEL;level++) assert.equal(getCampaignTarget(level), (getLevelThreshold(level+1)-getLevelThreshold(level))*10);
assert.ok(getCampaignTarget(MAX_LEVEL)>0);
assert.equal(canCompleteCampaignLevel(1, getCampaignTarget(1)-1, false), false);
assert.equal(canCompleteCampaignLevel(1, getCampaignTarget(1), false), true);
assert.equal(canCompleteCampaignLevel(20, getCampaignTarget(20), false), false);
assert.equal(canCompleteCampaignLevel(20, getCampaignTarget(20), true), true);
assert.equal(canCompleteCampaignLevel(20, 0, true), false);
assert.equal(canCompleteCampaignLevel(3, getCampaignTarget(3), false), false);
assert.equal(canCompleteCampaignLevel(3, getCampaignTarget(3), true), true);
assert.equal(canCompleteCampaignLevel(MAX_LEVEL, getCampaignTarget(MAX_LEVEL), true), true);
const signatures = new Set(Array.from({length:MAX_LEVEL},(_,i)=>JSON.stringify(getCampaignLandscape(i+1))));
assert.equal(signatures.size, MAX_LEVEL);
// Each return to a landscape unlocks one additional enemy, starting on visit two.
for (let level = 1; level <= MAX_LEVEL; level++) {
  const biome = getCampaignLandscape(level).biome;
  const available = getAvailableBiomeEnemies(biome, level);
  assert.equal(available.length, Math.min(8, 3 + Math.floor((level - 1) / 10)));
  assert.ok(available.every(enemy => enemy.minLevel <= level));
}
for (const [index, biome] of BIOMES.entries()) {
  assert.ok(biome.enemies.slice(0, 3).every(enemy => enemy.minLevel === 1));
  for (const [tier, enemy] of biome.enemies.slice(3).entries()) {
    const unlock = index + 11 + tier * 10;
    assert.equal(enemy.minLevel, unlock);
    assert.equal(getCampaignLandscape(unlock).biome.id, biome.id);
    assert.ok(!getAvailableBiomeEnemies(biome, unlock - 1).includes(enemy));
    assert.ok(getAvailableBiomeEnemies(biome, unlock).includes(enemy));
    assert.ok(getAvailableBiomeEnemies(biome, unlock + 10).includes(enemy));
  }
}
const values = new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{ configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)} });
assert.equal(completeCampaignLevel(2),0);
assert.equal(completeCampaignLevel(1),1);
assert.equal(loadCompletedLevels(),1);
assert.equal(completeCampaignLevel(2),2);
assert.equal(completeCampaignLevel(1),2);
assert.equal(completeCampaignLevel(4),2);
console.log('Campaign progression tests passed');

assert.equal(getCampaignMode(1), 'classic');
assert.equal(getCampaignMode(7), 'protect');
assert.equal(getCampaignMode(49), 'protect');
assert.equal(getCampaignMode(70), 'classic', 'Boss levels keep their boss encounter');
assert.equal(canCompleteCampaignLevel(7, 1_000_000, false, 179_999), false, 'Score cannot end protection early');
assert.equal(canCompleteCampaignLevel(7, 0, false, 180_000), true, 'Surviving three minutes completes protection');
for (let level = 1; level <= MAX_LEVEL; level++) {
  if (isCampaignProtectLevel(level)) assert.equal(isCampaignBossLevel(level), false);
}
