# SproutGo — Library Seed Plan

How the global `Plant` Library gets pre-populated before launch. The baseline named USDA
PLANTS and Wikimedia but gave no column mapping, dedup strategy, or script outline. This is
that plan.

> Cross-refs: target table is `Plant` in [DATA_MODEL](./DATA_MODEL.md); rarity values feed
> [POINTS_AND_RARITY](./POINTS_AND_RARITY.md); region/count are tracked in
> [OPEN_QUESTIONS](./OPEN_QUESTIONS.md) #1 and #2.

## Region & size

Scope pending OPEN_QUESTIONS #1/#2. **Recommended MVP:** restrict to a single region
(New Jersey or the northeastern US) and ~300 species. A tight region sharply improves AI
match accuracy and minimizes "AI found a plant not in the Library" churn (SPEC §3.8).

## Sources

1. **USDA PLANTS** — names + taxonomy. Downloadable checklist (CSV). Authoritative for US
   common/scientific names, family, genus, native status. Public domain.
2. **Wikimedia Commons / Wikidata** — one representative image per scientific name. Each
   image carries a license (CC-BY, CC-BY-SA, PD). **Store the attribution** (author +
   license + source URL) alongside `imageUrl` — required by most CC licenses.

## Column mapping (USDA → `Plant`)

| `Plant` field | USDA source | Transform |
|---------------|-------------|-----------|
| scientificName | Scientific Name w/o Author | trim; dedup key |
| commonName | Common Name | title-case; pick primary if multiple |
| family | Family | as-is |
| genus | Genus | as-is (or split from scientificName) |
| type | Growth Habit | map Tree/Shrub/Forb→FLOWER/Graminoid→GRASS/Fern→FERN/else OTHER |
| nativeStatus | Native Status | map `N*`→NATIVE, `I*`→INTRODUCED, invasive list→INVASIVE, else UNKNOWN |
| description | — | from Wikidata short description or left null for MVP |
| habitat | — | optional; Wikidata/USDA notes or null |
| rarity | — | assigned heuristically (below) |
| imageUrl | Wikimedia | resolve per scientificName; store attribution |
| source | — | constant `SEED` |

## Rarity assignment at seed time

No reliable per-species rarity in USDA. MVP heuristic (deterministic, documented):
- INVASIVE or very common natives → `COMMON`
- typical natives → `COMMON`/`UNCOMMON` by USDA distribution breadth if available
- species with narrow/limited distribution flags → `RARE`
- a small hand-curated list of notable regional specialties → `LEGENDARY`

Flagged as crude; OPEN_QUESTIONS #7 covers recomputing rarity from real observation
frequency post-launch.

## Dedup & integrity

- **Dedup key = `scientificName`** (unique constraint in schema). Collapse USDA synonym rows
  to the accepted name before insert.
- Skip rows with no scientific name.
- Images: if no CC/PD image resolves, leave `imageUrl` null rather than embedding an
  unlicensed image. UI shows a placeholder badge.

## Seed script outline

Lives at `apps/api` (or a `packages/db` script) per [REPO_STRUCTURE](./REPO_STRUCTURE.md):

```
1. Load USDA CSV → parse rows.
2. Filter to region species list.
3. Normalize names; collapse synonyms; map fields per table above.
4. Resolve one Wikimedia image + license per scientificName (cache results to JSON
   so re-runs don't re-hit the API).
5. Assign rarity via heuristic.
6. prisma.plant.createMany({ data, skipDuplicates: true }).
7. Build full-text search index on (commonName, scientificName, description).
8. Print summary: inserted / skipped / missing-image counts.
```

Idempotent: re-running with `skipDuplicates` + the image cache won't create dupes or
re-download. Store the intermediate normalized dataset (`seed/plants.normalized.json`) in the
repo so seeding is reproducible without re-scraping.

## Full-text search

After seeding, create a Postgres FTS index so `GET /library?q=` matches partial names and
keywords (e.g. "maple" → Red/Sugar/Silver Maple), per SPEC §3.3. B-tree indexes on
`type`/`rarity`/`nativeStatus` (defined in DATA_MODEL) cover the filter facets.
