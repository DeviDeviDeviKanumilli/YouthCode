# SproutGo — Points & Rarity

Concrete scoring rules. The baseline said "points based on rarity" and "diminishing returns"
but never gave numbers. These are the MVP starting values — **all tunable**, centralized in
one backend config object so balancing doesn't require code changes scattered across routes.

> Cross-refs: rarity tiers from [DATA_MODEL](./DATA_MODEL.md); awarded in the
> `POST /observations` pipeline in [API_CONTRACT](./API_CONTRACT.md).

## Base points by rarity

| Rarity | Base points |
|--------|-------------|
| COMMON | 10 |
| UNCOMMON | 25 |
| RARE | 60 |
| LEGENDARY | 150 |

## First-discovery bonus

When a user logs a species **for the first time** (no existing `PlantDexEntry`):

```
points = basePoints * FIRST_DISCOVERY_MULTIPLIER
FIRST_DISCOVERY_MULTIPLIER = 2.0
```

So a first RARE find = 60 × 2.0 = 120 points. This is the moment the First Discovery modal
(design.md §8.8) fires.

## Duplicate / diminishing returns

Re-photographing a species the user already has yields reduced points that decay with the
number of prior observations of that species:

```
points = round(basePoints * DUP_FACTOR ^ min(timesObserved, DUP_CAP_INDEX))
DUP_FACTOR     = 0.5
DUP_CAP_INDEX  = 4     // floor stops decaying past the 4th dup
MIN_DUP_POINTS = 1     // never award 0 for a valid capture
```

Example (COMMON, base 10): 2nd sighting → 5, 3rd → 3, 4th → 1, 5th+ → 1.

## Daily same-species quota

To incentivize exploring new species over farming one (InitialIdea "diminishing returns"):

```
DAILY_SAME_SPECIES_CAP = 5   // exact number pending OPEN_QUESTIONS #4
```

Captures beyond the cap for the **same species in one day** still save the observation
(so the photo/map data isn't lost) but award `0` points and return `429`-style metadata
`{ quotaReached: true }` so the UI can explain it. Different species are unaffected.

## Rarity assignment

- **Seed time:** rarity is set per species in the seed data (see
  [LIBRARY_SEED](./LIBRARY_SEED.md)). Simple, deterministic, good enough for MVP.
- **AI-created entries:** default to `COMMON` unless the AI result includes a rarity signal;
  flagged for later review.
- **Future (post-MVP):** recompute rarity from observation frequency across the user base
  (rarer = fewer global observations). Tracked in OPEN_QUESTIONS #7. Keep rarity reads behind
  a single accessor so this can change without touching scoring.

## Leaderboard

`Profile.totalPoints` is the denormalized sum, incremented transactionally on each award —
no expensive aggregation at read time. Leaderboard scope (global / friends / both) is
pending OPEN_QUESTIONS #3; the `GET /leaderboard` endpoint already accepts a `scope` param.

## Config object (single source of truth)

```ts
export const SCORING = {
  base: { COMMON: 10, UNCOMMON: 25, RARE: 60, LEGENDARY: 150 },
  firstDiscoveryMultiplier: 2.0,
  dupFactor: 0.5,
  dupCapIndex: 4,
  minDupPoints: 1,
  dailySameSpeciesCap: 5,
} as const;
```

Unit tests in [TESTING](./TESTING.md) pin these formulas so balance changes are intentional.
