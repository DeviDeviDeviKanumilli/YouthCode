# SproutGo — Implementation Handoff

> **Start here in a new session.** This orients you to build SproutGo from the planning docs.
> Read this, then `currentPlans/`. The four docs in `InitalPlans/` are the **frozen** original
> vision — read-only; never edit them.

## Latest operational note (2026-05-30)

The live implementation handoff is now `currentPlans/HANDOFF.md`. The repo is no longer
planning-only. Most recent iOS/Xcode readiness work:

- Pinned `@rnmapbox/maps` from `~10.1.33` to exact `10.1.33` in `apps/mobile/package.json`
  and `package-lock.json`. The floated `10.1.45` package introduced a React Native 0.74
  codegen crash in `NativeRNMBXLocationModule` (`onLocationUpdate: EventEmitter<...>`).
- Cleaned the local, gitignored `apps/mobile/.env` Mapbox download token line so
  `source .env` works. The replacement Mapbox download token was checked against the iOS
  binary endpoint and returned HTTP `200`.
- `npm run prebuild:ios` completed after CocoaPods downloaded Mapbox and cloned
  `zxingify-objc`; `apps/mobile/ios/SproutGo.xcworkspace` and `Podfile.lock` were generated
  locally. `apps/mobile/ios/` is ignored and intentionally not committed.
- Verified `npm run typecheck -w @sproutgo/mobile` and
  `npm run test -w @sproutgo/mobile` pass.

For current cloud/mobile status, deployment caveats, and next steps, read
`currentPlans/HANDOFF.md`.

## What SproutGo is

A social, geotagged plant-discovery mobile app. Core loop: walk around → photograph a plant →
AI identifies the species → earn points by rarity → it unlocks in your personal **PlantDex** →
optionally post it to friends/community. Plus a global plant **Library**, a Pokémon-GO-style
exploration **Map**, social feed/forum/friends, and AI **plant chat** (talk to a discovered
plant in-character).

## Current state (2026-05-30)

- **No application code yet.** The repo is planning-only.
- Git is initialized; `main` is pushed to `github.com/DeviDeviDeviKanumilli/SproutGO` (public).
- Planning is **complete and build-ready** in `currentPlans/`.
- `.claude/settings.local.json` is gitignored (personal, public repo) — keep it that way.

## Locked decisions

- Mobile: **iOS + Android** from one **Expo / React Native** codebase.
- Plant ID: **OpenAI vision** for MVP, behind a **swappable `PlantIdentifier` interface**.
- Audience: **13+ only** (no COPPA scope).
- Planning lives in `currentPlans/` only; `InitalPlans/` stays frozen.

## Tech stack

Expo/React Native · Vercel (Next.js API routes) · Prisma · Supabase (Postgres + Auth +
Storage) · OpenAI API · Mapbox. Mobile → Vercel API → Prisma → Supabase. Secrets live only
in the backend.

## The planning docs (read in this order)

All live in `currentPlans/`:

1. `OPEN_QUESTIONS.md` — **read first.** Decisions still unmade (see below); don't guess.
2. `DATA_MODEL.md` — full schema, enums, indexes → source for `schema.prisma`.
3. `API_CONTRACT.md` — backend endpoints + the core identify pipeline + auth convention.
4. `POINTS_AND_RARITY.md` — concrete scoring (`SCORING` config object).
5. `LIBRARY_SEED.md` — USDA→`Plant` mapping, Wikimedia images, seed script.
6. `AI_INTEGRATION.md` — `PlantIdentifier` interface, ID prompt/JSON schema, chat persona.
7. `SECURITY_AND_PRIVACY.md` — auth boundary, RLS caveat, location fuzzing, moderation.
8. `REPO_STRUCTURE.md` — monorepo layout + `.env.example` checklist.
9. `BUILD_MILESTONES.md` — full-stack build order M0–M5.
10. `TESTING.md` — test strategy + manual device checklist.
11. `TECH_RISKS.md` — gotchas + mitigations.

## Resolve before / while coding (from OPEN_QUESTIONS.md)

These block specific pieces — decide them with the project owner, don't assume:
- Seed region scope (NJ / NE US / broader) and species count (~300?).
- Leaderboard scope (global / friends / both).
- Daily same-species capture quota (exact number).
- Persist plant-chat history, or session-only?
- Confirm monorepo vs. two repos.
- Rare-plant coordinate-fuzzing radius.

## Recommended first steps

1. **Confirm OPEN_QUESTIONS** items that affect structure (monorepo) and seed scope.
2. **M0 — Foundation** (see `BUILD_MILESTONES.md`):
   - Scaffold the monorepo from `REPO_STRUCTURE.md` (`apps/mobile`, `apps/api`,
     `packages/db`, `packages/shared`).
   - Write `schema.prisma` directly from `DATA_MODEL.md`; run the first Supabase migration.
   - Wire Supabase Auth (13+ gate) + `Profile` creation + backend JWT verification.
   - Get a **custom EAS dev build** running on iOS + Android (required for Mapbox — see R1).
3. **Seed the Library** (`LIBRARY_SEED.md`) before M1 so AI matching has data.
4. **M1 — core discovery loop** (capture → AI → PlantDex). This is the spine; polish it
   before map richness.

## Three things that will bite you if ignored (see TECH_RISKS.md)

- **R1:** `@rnmapbox/maps` does **not** run in Expo Go — you need a custom EAS dev build.
- **R2:** Prisma + Supabase serverless → use the **pooler (port 6543)** at runtime,
  **direct (5432)** for migrations, single client instance per function.
- **R3:** The service-role Prisma client **bypasses RLS** — the **API layer is the real
  auth boundary.** Every route must scope to the authenticated `userId`.

## Ground rules

- Edit `currentPlans/` freely (it's the living source of truth); **never** edit `InitalPlans/`.
- Keep secrets out of the mobile bundle and out of git; `.env` is gitignored.
- Update `OPEN_QUESTIONS.md` as decisions get made (move items to "Resolved" with the date).
