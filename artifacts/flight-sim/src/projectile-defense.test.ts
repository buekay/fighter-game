import assert from "node:assert/strict";
import { interceptProjectiles, type InterceptableProjectile } from "./projectile-defense";

const projectile = (fromPlayer: boolean, overrides: Partial<InterceptableProjectile> = {}): InterceptableProjectile => ({ x: 100, y: 100, fromPlayer, ...overrides });
const events: boolean[] = [];
const target = projectile(false);
const onHit = (_: InterceptableProjectile, destroyed: boolean) => events.push(destroyed);
for (let hit = 1; hit <= 4; hit++) {
  const survivors = interceptProjectiles([projectile(true), target], true, onHit);
  assert.equal(target.interceptionHits, hit);
  assert.deepEqual(survivors, hit < 4 ? [target] : []);
}
assert.deepEqual(events, [false, false, false, true]);
const disabled = [projectile(true), projectile(false)];
assert.equal(interceptProjectiles(disabled, false, onHit), disabled);
assert.equal(disabled[1].interceptionHits, undefined);
const missed = [projectile(true, { y: 120 }), projectile(false)];
assert.deepEqual(interceptProjectiles(missed, true, onHit), missed);
const melee = [projectile(true, { meleeRange: 100 }), projectile(false)];
assert.deepEqual(interceptProjectiles(melee, true, onHit), melee);
const near = projectile(false, { x: 100, previousX: 120 });
const far = projectile(false, { x: 140, previousX: 160 });
const fast = projectile(true, { x: 200, previousX: 0 });
assert.deepEqual(interceptProjectiles([far, fast, near], true, onHit), [far, near]);
assert.equal(near.interceptionHits, 1);
assert.equal(far.interceptionHits, undefined);
const extraShot = projectile(true);
assert.deepEqual(interceptProjectiles([projectile(false), ...Array.from({ length: 4 }, () => projectile(true)), extraShot], true, onHit), [extraShot]);
const separate = [projectile(false), projectile(false)];
interceptProjectiles([projectile(true), ...separate], true, onHit);
assert.equal(separate[0].interceptionHits, 1);
assert.equal(separate[1].interceptionHits, undefined);
console.log("Projectile defense tests passed");
