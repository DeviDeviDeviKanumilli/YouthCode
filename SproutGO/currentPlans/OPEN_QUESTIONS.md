# SproutGo — Open Questions

Running log of decisions not yet made. Resolve these as the project progresses; each
unresolved item is a place where a builder would otherwise have to guess. When an item is
decided, move it to the "Resolved" section with the answer and date.

> These are **net-new** planning docs added to `currentPlans/`. The four baselines in
> `InitalPlans/` remain frozen and were not migrated.

## Locked decisions (2026-05-30)

- **Planning scope:** Add gap docs only; do not migrate the four `InitalPlans/` baselines.
- **Platforms:** iOS + Android from one Expo / React Native codebase.
- **Plant identification:** OpenAI vision for MVP, behind a swappable `PlantIdentifier`
  interface so a dedicated API (Plant.id / Pl@ntNet) can replace it later.
- **Audience:** 13+ only. No COPPA scope for MVP.

## Open

| # | Question | Why it matters | Affects |
|---|----------|----------------|---------|
| 3 | Leaderboard scope — global, friends-only, or both? | Changes data model + query design | `DATA_MODEL.md`, `API_CONTRACT.md` |
| 4 | Daily same-species capture quota — exact number? | Diminishing-returns rule needs a concrete cap | `POINTS_AND_RARITY.md` |
| 7 | How is rarity assigned at seed time vs. recomputed from observation frequency later? | Affects points and the rare-marker UI | `POINTS_AND_RARITY.md`, `LIBRARY_SEED.md` |
| 8 | Coordinate-fuzzing radius for rare/sensitive plants? | Privacy rule needs a concrete distance | `SECURITY_AND_PRIVACY.md` |

## Resolved

| # | Question | Decision | Date |
|---|----------|----------|------|
| 6 | Monorepo or two repos for mobile + backend? | **Monorepo**, npm workspaces (`apps/*`, `packages/*`) per `REPO_STRUCTURE.md`. Chosen because mobile + backend share types/enums and the Prisma schema. npm (not pnpm) since pnpm/yarn aren't installed in the build env. Scaffolded in M0. | 2026-05-30 |
| 1 | Seed region scope — NJ only, NE US, or broader? | **Northeastern US** — the 9 NE states (`CT, MA, ME, NH, NJ, NY, PA, RI, VT`), encoded in `packages/db/seed/lib/regions.ts`. A tight region maximizes AI match accuracy with minimal "not in Library" churn. | 2026-05-30 (M3) |
| 2 | Target species count for initial seed? | **~300** (`SEED_TARGET_COUNT = 300`), capped curated-genus-first then alphabetical. Drives PlantDex completion math (`completionPct`). | 2026-05-30 (M3) |
| 5 | Persist plant-chat history in MVP, or session-only? | **Persist** — `ChatMessage` rows are written per exchange (the model already existed). Enables history that survives restart (`GET /chat/:plantId`) and real per-user rate limiting counted from rows. | 2026-05-30 (M5) |
