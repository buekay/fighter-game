export const SHOP_RARITY_SEQUENCE = [
  "rare",
  "epic",
  "legendary",
  "ultraLegendary",
  "ultimate",
] as const;

export type ShopRarity = (typeof SHOP_RARITY_SEQUENCE)[number];

export const SHOP_RARITY_ORDER: Readonly<Record<ShopRarity, number>> =
  Object.fromEntries(SHOP_RARITY_SEQUENCE.map((rarity, index) => [rarity, index])) as Record<ShopRarity, number>;

export interface OrderedCatalogEntry {
  id?: string;
  name: string;
  rarity: ShopRarity;
  cost: number;
}

/**
 * Keeps every catalogue consistent: rarity first, then price, then a stable
 * German name/id fallback. The input arrays remain untouched.
 */
export function compareCatalogEntries(a: OrderedCatalogEntry, b: OrderedCatalogEntry): number {
  return SHOP_RARITY_ORDER[a.rarity] - SHOP_RARITY_ORDER[b.rarity]
    || a.cost - b.cost
    || a.name.localeCompare(b.name, "de")
    || (a.id ?? "").localeCompare(b.id ?? "", "de");
}

export function orderCatalog<T extends OrderedCatalogEntry>(entries: readonly T[]): T[] {
  return [...entries].sort(compareCatalogEntries);
}
