// Phase A — `npm run seed:scrape` (maintainer-only, network). Generates the committed
// seed/plants.normalized.json from the iNaturalist API: the most-observed plant species in the
// seed region (New Jersey), which gives REAL taxonomy, a frequency-based rarity signal, native
// vs. introduced status, CC-licensed photos, and short descriptions — no manual USDA export.
//
// This is NOT part of db:seed: it hits the network and runs rarely. db:seed (seed.ts) only
// reads the JSON this produces, fully offline. See LIBRARY_SEED.md.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SEED_FILE_VERSION, type NormalizedPlant, type NormalizedSeedFile, type PlantType, type NativeStatus, type Rarity } from "./lib/types";

const OUT_JSON = fileURLToPath(new URL("./plants.normalized.json", import.meta.url));

// iNaturalist place id for New Jersey + the Plantae taxon id (resolves OPEN_QUESTIONS #1).
const NJ_PLACE_ID = 51;
const PLANTAE_TAXON_ID = 47126;
const TARGET = 300;
const UA = "SproutGo-Seed/1.0 (plant library seed; contact: sproutgo)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  throw new Error(`giving up on ${url}`);
}

// --- Type heuristics (iNat has no growth-habit field) -----------------------
const GRASS_FAMILIES = new Set(["Poaceae", "Cyperaceae", "Juncaceae", "Typhaceae"]);
const TREE_GENERA = new Set([
  "Acer", "Quercus", "Betula", "Pinus", "Tsuga", "Fagus", "Carya", "Fraxinus", "Picea",
  "Populus", "Salix", "Ulmus", "Juglans", "Liriodendron", "Liquidambar", "Nyssa", "Platanus",
  "Tilia", "Castanea", "Catalpa", "Robinia", "Gleditsia", "Celtis", "Sassafras", "Magnolia",
  "Cornus", "Amelanchier", "Carpinus", "Ostrya", "Cercis", "Morus", "Ailanthus", "Paulownia",
  "Pseudotsuga", "Abies", "Thuja", "Chamaecyparis", "Larix", "Aesculus", "Diospyros",
]);
const SHRUB_GENERA = new Set([
  "Rhododendron", "Kalmia", "Vaccinium", "Viburnum", "Ilex", "Lindera", "Hamamelis", "Rosa",
  "Rubus", "Berberis", "Ligustrum", "Lonicera", "Spiraea", "Cornus", "Sambucus", "Clethra",
  "Rhus", "Toxicodendron", "Hydrangea", "Forsythia", "Euonymus", "Cephalanthus", "Myrica",
  "Comptonia", "Gaylussacia", "Leucothoe", "Pieris", "Mahonia", "Elaeagnus", "Rosa",
]);

function classifyType(family: string | null, klass: string | null, genus: string | null): PlantType {
  if (klass === "Polypodiopsida") return "FERN";
  if (family && GRASS_FAMILIES.has(family)) return "GRASS";
  if (genus && TREE_GENERA.has(genus)) return "TREE";
  if (genus && SHRUB_GENERA.has(genus)) return "SHRUB";
  // Most remaining herbaceous taxa are forbs people photograph as "flowers".
  return "FLOWER";
}

// Well-known Northeast invasives — establishment_means only distinguishes native/introduced,
// so flag the notable invasives explicitly (drives the bold chat persona + rarity=COMMON).
const INVASIVE = new Set([
  "Artemisia vulgaris", "Alliaria petiolata", "Rosa multiflora", "Berberis thunbergii",
  "Reynoutria japonica", "Fallopia japonica", "Lonicera japonica", "Lonicera maackii",
  "Ailanthus altissima", "Celastrus orbiculatus", "Microstegium vimineum", "Hedera helix",
  "Ligustrum obtusifolium", "Elaeagnus umbellata", "Rhamnus cathartica", "Frangula alnus",
  "Cirsium arvense", "Centaurea stoebe", "Phragmites australis", "Lythrum salicaria",
  "Glechoma hederacea", "Toxicodendron radicans", "Ranunculus ficaria", "Ficaria verna",
]);

function nativeStatusOf(scientificName: string, establishment: string | null): NativeStatus {
  if (INVASIVE.has(scientificName)) return "INVASIVE";
  if (establishment === "native") return "NATIVE";
  if (establishment === "introduced") return "INTRODUCED";
  return "UNKNOWN";
}

// Rarity from observation-frequency rank (POINTS_AND_RARITY #7): the list is sorted most- to
// least-observed, so a percentile split gives a realistic spread (lots common, few legendary).
function rarityByRank(index: number, total: number): Rarity {
  const p = index / total;
  if (p < 0.55) return "COMMON";
  if (p < 0.85) return "UNCOMMON";
  if (p < 0.97) return "RARE";
  return "LEGENDARY";
}

// Accept any explicitly-licensed photo (CC / CC0 / PD), storing the license + attribution.
// iNaturalist default photos are predominantly cc-by-NC, fine for this non-commercial student
// MVP's display use; reject only "all rights reserved" (null/"c"). NOTE: swap NC images for
// CC-BY/CC0/PD before any commercial launch.
function usableLicense(code: string | null): boolean {
  return code != null && code !== "" && code !== "c";
}

function titleCase(s: string | null): string | null {
  if (!s) return null;
  return s.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function stripHtml(s: string | null | undefined): string | null {
  if (!s) return null;
  const text = s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > 500 ? text.slice(0, 497).trimEnd() + "…" : text;
}

interface Candidate {
  taxonId: number;
  scientificName: string;
  commonName: string | null;
  photo: { url: string; license: string | null; attribution: string | null; sourceUrl: string | null } | null;
}

async function main(): Promise<void> {
  // 1. Most-observed NJ plant species (research grade), paginated.
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 3 && candidates.length < TARGET + 60; page++) {
    const j = await getJson(
      `https://api.inaturalist.org/v1/observations/species_counts?place_id=${NJ_PLACE_ID}` +
        `&taxon_id=${PLANTAE_TAXON_ID}&quality_grade=research&per_page=200&page=${page}`,
    );
    for (const r of j.results ?? []) {
      const t = r.taxon;
      if (!t || t.rank !== "species" || !t.name || seen.has(t.name)) continue;
      seen.add(t.name);
      const dp = t.default_photo;
      candidates.push({
        taxonId: t.id,
        scientificName: t.name,
        commonName: titleCase(t.preferred_common_name ?? null),
        photo: dp?.medium_url
          ? {
              url: dp.medium_url,
              license: dp.license_code ?? null,
              attribution: stripHtml(dp.attribution),
              sourceUrl: dp.url ?? null,
            }
          : null,
      });
    }
    await sleep(800);
  }
  const top = candidates.slice(0, TARGET);
  console.log(`[scrape] ${candidates.length} candidate species; taking top ${top.length}`);

  // 2. Batch taxa details (family/class + native status + description), 30 ids per call.
  const detail = new Map<number, { family: string | null; klass: string | null; establishment: string | null; description: string | null }>();
  for (let i = 0; i < top.length; i += 30) {
    const ids = top.slice(i, i + 30).map((c) => c.taxonId).join(",");
    const j = await getJson(`https://api.inaturalist.org/v1/taxa/${ids}?place_id=${NJ_PLACE_ID}`);
    for (const t of j.results ?? []) {
      const ancestors = t.ancestors ?? [];
      detail.set(t.id, {
        family: ancestors.find((a: any) => a.rank === "family")?.name ?? null,
        klass: ancestors.find((a: any) => a.rank === "class")?.name ?? null,
        establishment:
          typeof t.establishment_means === "string"
            ? t.establishment_means
            : t.establishment_means?.establishment_means ?? null,
        description: stripHtml(t.wikipedia_summary),
      });
    }
    await sleep(800);
  }

  // 3. Map → NormalizedPlant.
  const plants: NormalizedPlant[] = top.map((c, index) => {
    const d = detail.get(c.taxonId) ?? { family: null, klass: null, establishment: null, description: null };
    const genus = c.scientificName.split(/\s+/)[0] ?? null;
    const freeImage = c.photo && usableLicense(c.photo.license) ? c.photo : null;
    return {
      scientificName: c.scientificName,
      commonName: c.commonName,
      family: d.family,
      genus,
      type: classifyType(d.family, d.klass, genus),
      nativeStatus: nativeStatusOf(c.scientificName, d.establishment),
      rarity: rarityByRank(index, top.length),
      description: d.description,
      habitat: null,
      imageUrl: freeImage?.url ?? null,
      imageLicense: freeImage?.license ?? null,
      imageAttribution: freeImage?.attribution ?? null,
      imageSourceUrl: freeImage?.sourceUrl ?? null,
    };
  });

  const withImage = plants.filter((p) => p.imageUrl).length;
  console.log(`[scrape] ${plants.length} species, ${withImage} with CC images`);

  const file: NormalizedSeedFile = {
    version: SEED_FILE_VERSION,
    generatedAt: new Date().toISOString(),
    sourceQuery: `iNaturalist research-grade plant species_counts, place_id=${NJ_PLACE_ID} (New Jersey), top ${TARGET} by observation frequency`,
    count: plants.length,
    plants,
  };
  writeFileSync(OUT_JSON, JSON.stringify(file, null, 2));
  console.log(`[scrape] wrote ${OUT_JSON}`);
}

main().catch((err) => {
  console.error("[scrape] failed:", err);
  process.exitCode = 1;
});
