# SproutGo — Testing & QA Strategy

The baseline docs don't mention testing at all. This defines what to test, at which level,
and the manual checks for device-only paths (camera, GPS, map) that automated tests can't
cover.

> Cross-refs: scoring formulas from [POINTS_AND_RARITY](./POINTS_AND_RARITY.md); pipeline
> from [API_CONTRACT](./API_CONTRACT.md); risk areas from [TECH_RISKS](./TECH_RISKS.md).

## Levels

### Unit
Pure logic, no I/O. Highest value, fastest.
- **Scoring** — every formula in the `SCORING` config: base by rarity, first-discovery
  multiplier, duplicate decay, daily-quota zeroing. Pin exact expected values so balance
  changes are deliberate.
- **AI result mapping** — `IdResult` → match / auto-create (≥0.85) / uncertain (<0.85)
  branching; rejects malformed AI JSON.
- **Coordinate fuzzing** — rare-plant coords are offset for non-owners; owner gets exact.
- **Friendship id ordering** — pair stored with `userAId < userBId`, no dupes.

### Integration
API routes against a **real test Postgres** (not mocked). A mocked DB would hide schema,
constraint, and RLS-bypass mistakes — exactly the class of bug that matters here.
- Auth: requests without/with invalid JWT are rejected; writes use the token's `userId`,
  never a client-supplied one.
- `POST /observations` end-to-end with a **stubbed `PlantIdentifier`** (deterministic
  `IdResult`) so the pipeline is tested without real OpenAI calls/cost.
- Ownership: user A cannot edit/delete user B's posts/observations.
- Unique constraints: one like per user/post; one PlantDexEntry per user/species.

### E2E (app)
Happy path on a real/simulated device with Detox or Maestro:
- sign up → grant permissions → capture → result → PlantDex unlock.
- post a discovery → like/comment.
- add a friend (two test accounts).

Keep E2E to the critical loop; it's slow and brittle, so don't chase coverage here.

## Manual device checklist (per milestone)

Camera, GPS, and Mapbox behavior can't be reliably unit-tested — verify by hand on **both
iOS and Android** at the end of each relevant milestone:
- [ ] Camera opens, captures, preview retake/use works.
- [ ] Location permission grant **and** denial paths (denied → identify still works, no map post).
- [ ] Map renders with nature styling; avatar centered; markers appear; bottom sheet opens.
- [ ] Upload succeeds on slow network; failure shows retry.
- [ ] Identification result renders for matched, auto-created, and uncertain cases.
- [ ] First Discovery modal fires only on first species find.

## Tooling

| Layer | Tool |
|-------|------|
| Unit | Jest (or Vitest) |
| Component (RN) | React Native Testing Library |
| API integration | Jest + test Postgres (Supabase branch or local container) |
| E2E | Detox or Maestro |
| Types | `tsc --noEmit` in CI across all workspaces |

## CI gate (minimum)

On each PR: typecheck + lint + unit + API integration must pass. E2E runs on a schedule or
pre-release rather than every PR (cost/flakiness). Don't mark a feature done with failing or
skipped tests in its area.
