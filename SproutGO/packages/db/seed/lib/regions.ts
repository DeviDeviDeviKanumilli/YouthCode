// Seed region scope + curation constants (resolves OPEN_QUESTIONS #1/#2).
// Region: the 9 Northeastern US states. Target: ~300 species. A tight region sharply improves
// AI match accuracy and minimizes "AI found a plant not in the Library" churn (LIBRARY_SEED.md).

// USDA state distribution codes for the Northeast. The maintainer filters the USDA PLANTS
// Advanced Search by these when exporting seed/data/usda-ne.raw.csv.
export const NE_STATES = ["CT", "MA", "ME", "NH", "NJ", "NY", "PA", "RI", "VT"] as const;

export const SEED_TARGET_COUNT = 300;

// Recognizable NE genera prioritized when capping to SEED_TARGET_COUNT (so the seed surfaces
// the maples/oaks/milkweeds people actually photograph). Candidates are sorted curated-genus
// first, then alphabetically, then sliced — deterministic and documented.
export const CURATED_GENERA = [
  "Acer", "Quercus", "Betula", "Pinus", "Tsuga", "Fagus", "Carya", "Fraxinus",
  "Asclepias", "Trillium", "Sanguinaria", "Lobelia", "Cypripedium", "Cornus",
  "Rhododendron", "Kalmia", "Vaccinium", "Rudbeckia", "Echinacea", "Aquilegia",
  "Viola", "Symphyotrichum", "Solidago", "Monarda", "Liriodendron", "Nyssa",
] as const;

// Hand-curated notable regional specialties → LEGENDARY (rare/iconic NE natives). Crude by
// design; OPEN_QUESTIONS #7 covers recomputing rarity from real observation frequency later.
export const LEGENDARY_SPECIES = new Set<string>([
  "Cypripedium acaule", // Pink Lady's Slipper
  "Cypripedium reginae", // Showy Lady's Slipper
  "Sarracenia purpurea", // Purple Pitcher Plant
  "Arethusa bulbosa", // Dragon's Mouth Orchid
]);

// stateCount thresholds for the rarity heuristic (number of NE states a taxon is recorded in).
export const RARITY_COMMON_MIN_STATES = 7;
export const RARITY_UNCOMMON_MIN_STATES = 3;
