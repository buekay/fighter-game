import assert from "node:assert/strict";
import { interceptProjectiles, type InterceptableProjectile } from "./projectile-defense";

const projectile = (fromPlayer: boolean, overrides: Partial<InterceptableProjectile> = {}): InterceptableProjectile => ({ x: 100, y: 100, fromPlayer, ...overrides });
const swing = (overrides: Partial<InterceptableProjectile> = {}) => projectile(true, { meleeRange: 100, collisionWidth: 100, collisionHeight: 50, ...overrides });
const events: boolean[] = [];
const target = projectile(false);
const onHit = (_: InterceptableProjectile, destroyed: boolean) => events.push(destroyed);
for (let hit = 1; hit <= 4; hit++) {
  const attack = swing();
  const survivors = interceptProjectiles([attack, target], true, onHit);
  assert.equal(target.interceptionHits, hit);
  assert.deepEqual(survivors, hit < 4 ? [attack, target] : [attack]);
  // Remaining in range over several frames must not count as more swings.
  interceptProjectiles(survivors, true, onHit);
  assert.equal(target.interceptionHits, hit);
}
assert.deepEqual(events, [false, false, false, true]);
const disabled = [swing(), projectile(false)];
assert.equal(interceptProjectiles(disabled, false, onHit), disabled);
assert.equal(disabled[1].interceptionHits, undefined);
const ranged = [projectile(true), projectile(true, { isMissile: true }), projectile(false)];
assert.deepEqual(interceptProjectiles(ranged, true, onHit), ranged);
assert.equal(ranged[2].interceptionHits, undefined);
const missed = [swing({ y: 200 }), projectile(false)];
assert.deepEqual(interceptProjectiles(missed, true, onHit), missed);
assert.equal(missed[1].interceptionHits, undefined);
// Fast enemy shots crossing the blade between frames still register.
const fast = projectile(false, { x: 0, previousX: 300 });
interceptProjectiles([swing(), fast], true, onHit);
assert.equal(fast.interceptionHits, 1);
// A swing remains available for enemy collisions and can strike multiple shots.
const targets = [projectile(false), projectile(false, { x: 150 })];
const attack = swing();
assert.deepEqual(interceptProjectiles([attack, ...targets], true, onHit), [attack, ...targets]);
assert.deepEqual(targets.map(t => t.interceptionHits), [1, 1]);
interceptProjectiles([attack, ...targets], true, onHit);
assert.deepEqual(targets.map(t => t.interceptionHits), [1, 1]);
console.log("Projectile defense tests passed");
