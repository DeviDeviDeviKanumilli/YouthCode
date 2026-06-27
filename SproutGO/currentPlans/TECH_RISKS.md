# SproutGo — Technical Risks

Known gotchas captured before they cost days. Each has a concrete mitigation so the team
hits them with a plan, not a surprise.

> Cross-refs: stack/env from [REPO_STRUCTURE](./REPO_STRUCTURE.md); AI accuracy from
> [AI_INTEGRATION](./AI_INTEGRATION.md); seeding from [LIBRARY_SEED](./LIBRARY_SEED.md).

## R1 — Mapbox needs a custom dev build (HIGH likelihood)
`@rnmapbox/maps` ships its own native code and **does not run in Expo Go.** Because the
Map tab imports it, the whole app now requires a custom dev build to launch — Expo Go
will crash on the Map tab. (Note: `expo-camera` and `expo-location` DO run in Expo Go;
Mapbox is the sole forcing function.)
- **Mitigation:** build a **custom dev build** (`expo-dev-client`). On this Mac the
  local Xcode toolchain is already present, so `npm run prebuild:ios && npm run ios` is
  the fastest path; EAS cloud builds are the alternative. Full step-by-step (Mapbox
  tokens, iOS/EAS routes, Android caveats, troubleshooting) is in
  [DEV_BUILD](./DEV_BUILD.md). The rnmapbox config plugin is wired in `app.config.ts`
  and `apps/mobile/eas.json` is in place.

## R2 — Prisma + Supabase serverless connection exhaustion (HIGH)
Vercel functions are serverless; each invocation can open a DB connection. Postgres connection
limits are hit fast, causing intermittent `too many connections` errors that look random.
- **Mitigation:** Prisma **runtime** connects through the **Supabase pooler (port 6543,
  pgbouncer)** via `DATABASE_URL`; **migrations** use the **direct connection (port 5432)**
  via `DIRECT_URL`. Use a single Prisma client instance per function (global singleton). This
  is in the `.env.example` checklist already.

## R3 — Service-role Prisma bypasses RLS (HIGH impact)
Because the backend uses a service-role/direct connection, **RLS does not protect
Prisma-served data.** A missing `where: { userId }` is a real data-leak, not a caught error.
- **Mitigation:** the **API layer is the authorization boundary** — every route scopes to the
  authenticated `userId` and checks ownership. Integration tests assert A-can't-touch-B
  ([TESTING](./TESTING.md)). Detailed in [SECURITY_AND_PRIVACY](./SECURITY_AND_PRIVACY.md).

## R4 — OpenAI plant-ID accuracy (HIGH — biggest product risk)
General vision models are weaker at fine species-level botanical ID than dedicated services.
Wrong IDs pollute the auto-created Library and mislead users.
- **Mitigation:** (a) **region-limit** the Library so the match space is small
  ([LIBRARY_SEED](./LIBRARY_SEED.md)); (b) **0.85 confidence threshold** before auto-creating
  entries, else mark UNCERTAIN; (c) the **swappable `PlantIdentifier` interface** lets
  Plant.id / Pl@ntNet drop in if accuracy is inadequate — no caller changes. Validate ID
  quality early in M1 on real local plants.

## R5 — Image upload reliability & cost (MEDIUM)
Field use means flaky mobile networks; large photos are slow and inflate storage/AI cost.
- **Mitigation:** client-side resize/compress before upload; retry-with-backoff + clear
  failure UI; **never re-identify a stored image** (reuse the result).

## R6 — GPS permission denied / inaccurate (MEDIUM)
Users may deny location, or it's imprecise under canopy.
- **Mitigation:** identify works **without** location; the observation just won't post to the
  public map. Explicit denied-state UI. Owner-exact / fuzzed-public coordinate handling
  already specified ([SECURITY_AND_PRIVACY](./SECURITY_AND_PRIVACY.md)).

## R7 — Wikimedia image licensing (MEDIUM legal)
Seed images carry CC licenses requiring attribution; shipping them without it is a violation.
- **Mitigation:** store author + license + source URL with each `imageUrl`; skip species with
  no CC/PD image (placeholder badge) rather than embedding unlicensed art.

## R8 — External service cost at scale (LOW-MEDIUM)
OpenAI, Mapbox, Supabase all meter usage; an unbounded loop or abuse spikes cost.
- **Mitigation:** per-user rate limits on AI endpoints; cache Library reads; monitor token
  usage; map loads via a restricted public token. ([AI_INTEGRATION](./AI_INTEGRATION.md) §cost.)

## Risk register summary

| ID | Risk | Likelihood | Impact | Primary mitigation |
|----|------|-----------|--------|--------------------|
| R1 | Mapbox/Expo Go incompatibility | High | High | EAS dev build from M0 |
| R2 | Serverless DB connections | High | High | Supabase pooler + singleton client |
| R3 | RLS bypass via service role | High | High | API-layer auth + tests |
| R4 | OpenAI ID accuracy | High | High | region limit + threshold + swappable API |
| R5 | Upload reliability/cost | Medium | Medium | compress, retry, no re-ID |
| R6 | GPS denied/inaccurate | Medium | Medium | identify-without-location fallback |
| R7 | Image licensing | Medium | Medium | store attribution, skip if none |
| R8 | Service cost at scale | Low-Med | Medium | rate limits, caching, monitoring |
