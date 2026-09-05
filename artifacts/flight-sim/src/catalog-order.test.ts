import assert from "node:assert/strict";
import {
  SHOP_RARITY_ORDER,
  SHOP_RARITY_SEQUENCE,
  orderCatalog,
} from "./catalog-order";

assert.deepEqual(SHOP_RARITY_SEQUENCE, ["rare", "epic", "legendary", "ultraLegendary", "ultimate"]);
assert.equal(SHOP_RARITY_ORDER.rare, 0);
assert.equal(SHOP_RARITY_ORDER.ultimate, 4);

const entries = [
  { id: "ultimate", name: "Omega", rarity: "ultimate" as const, cost: 1 },
  { id: "expensive", name: "Zulu", rarity: "rare" as const, cost: 20 },
  { id: "alpha-b", name: "Alpha", rarity: "rare" as const, cost: 10 },
  { id: "alpha-a", name: "Alpha", rarity: "rare" as const, cost: 10 },
  { id: "epic", name: "Beta", rarity: "epic" as const, cost: 5 },
];

assert.deepEqual(orderCatalog(entries).map(entry => entry.id), [
  "alpha-a",
  "alpha-b",
  "expensive",
  "epic",
  "ultimate",
]);
assert.deepEqual(entries.map(entry => entry.id), ["ultimate", "expensive", "alpha-b", "alpha-a", "epic"]);
