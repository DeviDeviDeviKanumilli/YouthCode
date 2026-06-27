import type { Plant } from "@sproutgo/shared";
import { Rarity } from "@sproutgo/shared";
import type { LibrarySort } from "@/lib/validation";

// Rarest first for the "rarity" sort (design: rare species stand out).
const RARITY_RANK: Record<Rarity, number> = {
  [Rarity.LEGENDARY]: 0,
  [Rarity.RARE]: 1,
  [Rarity.UNCOMMON]: 2,
  [Rarity.COMMON]: 3,
};

export function compareBy(sort: LibrarySort) {
  return (a: Plant, b: Plant): number => {
    if (sort === "rarity") {
      const r = RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity];
      if (r !== 0) return r;
    } else if (sort === "recent") {
      const t = b.createdAt.localeCompare(a.createdAt); // ISO strings sort chronologically
      if (t !== 0) return t;
    }
    // Stable, human-friendly tiebreak: common name (fallback scientific), case-insensitive.
    const an = (a.commonName ?? a.scientificName).toLowerCase();
    const bn = (b.commonName ?? b.scientificName).toLowerCase();
    return an.localeCompare(bn);
  };
}
