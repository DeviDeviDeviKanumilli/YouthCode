# HANDOFF.md

**Last updated:** 2026-05-30
**Branch:** `main` (latest commit pushed to origin)

## Latest iOS / Xcode readiness update — 2026-05-30

This pass focused on making the mobile app prebuild cleanly for iOS/Xcode.

- **Fixed React Native codegen failure from `@rnmapbox/maps`.** The mobile package had
  `"@rnmapbox/maps": "~10.1.33"`, which allowed npm to install `10.1.45`. That newer
  patch version ships `NativeRNMBXLocationModule.ts` with
  `readonly onLocationUpdate: EventEmitter<LocationEvent>`, which React Native 0.74
  codegen rejects with:
  `UnsupportedModulePropertyParserError: TypeScript interfaces extending TurboModule must only contain FunctionTypeAnnotation's`.
- **Pinned Mapbox exactly to `10.1.33`.** Updated `apps/mobile/package.json` and
  `package-lock.json` so the install resolves to `@rnmapbox/maps@10.1.33`. The
  `10.1.33` tarball does not include the failing iOS `NativeRNMBXLocationModule` spec,
  so the codegen blocker is gone.
- **Cleaned local mobile env syntax.** `apps/mobile/.env` had the Mapbox download token
  line polluted with extra prose, causing `source .env` to emit a shell error. The local,
  gitignored file was cleaned without committing secrets.
- **Verified the new Mapbox download token.** A token preflight against the Mapbox iOS
  binary URL returned HTTP `200` after the user replaced the token. Earlier token checks
  returned `401`.
- **Ran iOS prebuild through CocoaPods.** `cd apps/mobile && set -a && source .env &&
  set +a && npm run prebuild:ios` completed far enough to generate
  `apps/mobile/ios/SproutGo.xcworkspace` and `apps/mobile/ios/Podfile.lock`. The generated
  `apps/mobile/ios/` directory is gitignored and intentionally not staged.
- **CocoaPods delay note.** The slow portion was not Mapbox after token repair; CocoaPods
  spent several minutes cloning/indexing `https://github.com/zxingify/zxingify-objc.git`
  at tag `3.6.9`. Let it run on first install.
- **Validation after dependency pin:** `npm run typecheck -w @sproutgo/mobile` passed and
  `npm run test -w @sproutgo/mobile` passed (22 mobile tests).

Current local Xcode path:

```bash
cd /Users/devk/SproutGO/apps/mobile
set -a
source .env
set +a
npm run prebuild:ios
open ios/SproutGo.xcworkspace
```

Important: `apps/mobile/.env` remains gitignored and must contain a real
`MAPBOX_DOWNLOAD_TOKEN` with Mapbox `DOWNLOADS:READ` scope. Do not commit that token.

## Cloud provisioning — Supabase is now LIVE (this session)

The Supabase backend was provisioned and is no longer a placeholder:
- **Project:** `sproutGO` (ref `mhhffxioybsmozbpokes`, region us-west-2, ACTIVE_HEALTHY).
- **Schema applied:** initial Prisma migration `20260530171505_init` created and applied
  via `DIRECT_URL`. All 10 app tables exist (`Profile`, `Plant`, `Observation`,
  `PlantDexEntry`, `Post`, `Like`, `Comment`, `FriendRequest`, `Friendship`,
  `ChatMessage`) + `_prisma_migrations`. **Note:** this added the first migration file
  under `packages/db/prisma/migrations/` — previously the repo had none. It is
  **untracked / uncommitted**.
- **Storage:** private bucket `observations` created. RLS policy
  `own_prefix_observation_uploads` lets an authenticated user INSERT only under their own
  `<userId>/` prefix — matches `uploadObservationPhoto()` and the API's prefix guard.
- **RLS hardening:** Row Level Security ENABLED on all 10 app tables with **no policies**.
  This is correct for this architecture: the mobile client only uses Supabase for Auth +
  Storage (never direct table reads/writes), and the API talks to Postgres via Prisma +
  service-role (bypasses RLS, the R3 auth boundary). RLS-with-no-policy closes the
  anon-key direct-access hole without affecting the backend.
- **`.env` (repo root, gitignored):** filled with `SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_URL`, anon key, `service_role` (legacy `eyJ…` JWT — the new
  `sb_secret_…` format is NOT accepted by `supabaseAdmin()`/`createClient`),
  `SUPABASE_JWT_SECRET`, `DATABASE_URL` (6543 pooler, MUST keep
  `?pgbouncer=true&connection_limit=1` — R2), `DIRECT_URL` (5432).

⚠️ **SECURITY — unrotated leaked secrets.** During setup the OpenAI API key and the
Supabase DB password were pasted into the chat transcript and are therefore compromised.
They are still the live values in `.env`. **Rotate both before any deploy:** revoke the
OpenAI key at platform.openai.com; reset the DB password in Supabase → Settings →
Database (then update `DATABASE_URL` + `DIRECT_URL`). Do NOT copy the current values into
Vercel.

**Still pending for a working cloud deploy:** Vercel project not yet created/connected;
its env vars not set. Migration file above not committed. Mapbox token absent.

## Where the project stands

**M5 — Plant chat is now wired (the final MVP milestone, criterion #15).** Converse with a
discovered plant's persona:
- **Backend** — `POST /chat/:plantId` (send a message → reply) and `GET /chat/:plantId`
  (recent history). PlantDex-gated (403 until the species is discovered); grounded persona
  system prompt built deterministically from rarity/native-status/type
  (`lib/chat/persona.ts`) injecting only Library facts; per-user rate limit counted from
  persisted rows. History is **persisted** as `ChatMessage` (resolves OPEN_QUESTIONS #5) so it
  survives restarts and powers the rate limit. Provider is swappable like identify
  (`getPlantChatter()` → OpenAI `gpt-4o-mini`, or an offline stub in dev/test; never the stub
  in production).
- **Mobile** — `chat/[id]` is wired: loads the plant header + history, sends messages with a
  typing indicator and suggestion chips, and shows a "discover first" lock state on 403. No
  more mock fixtures in the chat screen.
- This was the last screen on mock data. **All 15 MVP completion criteria are now wired in
  code.** Remaining mock usage is only the Settings screen (UI-only by design) + the onboarding
  slides constant.

Earlier: **M4 — Social layer is now wired in code, against a LIVE database.** The Supabase env was
provisioned, so the schema was migrated and the Library seeded for real:
- **Live DB** — the schema is migrated and the Library seeded (21 species); the private
  `observations` Storage bucket exists. All three migration files are now committed in
  `packages/db/prisma/migrations/` (`20260530171505_init` + `20260530175743_add_plant_attribution`
  from the provisioning commit, then `20260530180000_add_report` added this pass for the
  moderation model). Future schema changes use `db:migrate`/`db:seed` normally.
- **Secrets** — real credentials were briefly pasted into the git-tracked `.env.example`;
  they were relocated to gitignored `.env` files (root, `apps/api/.env`, `packages/db/.env`,
  `apps/mobile/.env`) and `.env.example` was restored to placeholders. **Never put real values
  in `.env.example`.**
- **Backend** — full social surface: `POST/GET /posts`, `GET/DELETE /posts/:id`,
  `POST/DELETE /posts/:id/like`, `POST /posts/:id/comments`, `POST /posts/:id/report`;
  `GET /users/search`, `POST/GET /friends/requests`, `PATCH /friends/requests/:id`,
  `GET /friends`, `DELETE /friends/:id`; and `GET /profile/:id` extended to the full social
  profile (stats + friendship status + recent discoveries + posts). Privacy enforced in the
  Prisma `where`; like/comment counters and the friend-request→Friendship transition are
  transactional; admin-delete gated on `Profile.isAdmin`; post images served via short-lived
  signed URLs. New helpers: `lib/posts.ts`, `lib/friends.ts` (orderedPair/computeFriendship).
- **Mobile** — feed (3 scopes + optimistic likes), post detail + comments, post composer
  (discovery + forum thread), forums (category list → thread), friends (search/requests/
  accept-reject), and both profile screens (own + public, friendship-aware) are wired. Shared
  `PostCard` + `ProfileContent` components. The capture "Share Discovery" now passes the
  observation into the composer. Mock fixtures remain only for the M5 chat screen + settings.
- Out of scope (deferred): friend suggestions (dropped); settings persistence (UI-only);
  threaded comment replies; plant chat (`chat/[id]`) → **M5**.

Earlier: **M3 — Library & PlantDex screens** (on top of a P1+P2+P3 security sweep):
- **Library seed pipeline** (`packages/db/seed/`) — a two-phase USDA/Wikimedia pipeline:
  `seed:scrape` (maintainer-only, network: USDA NE-states CSV → normalize/dedup/cap to
  ~300 → resolve one CC/PD Commons image+license per species → committed
  `plants.normalized.json`) and the offline, idempotent `db:seed` loader
  (`createMany skipDuplicates`). A committed ~21-species NE stand-in dataset lets the
  loader + screens work before the full scrape runs. Resolves OPEN_QUESTIONS #1 (NE US)
  and #2 (~300). Pure modules (`usda`, `normalize`, `rarity`, `wikimedia`, `loader`) are
  unit-tested (27 db tests).
- **Backend** — new `GET /library` (q/type/rarity/native/sort + offset pagination via
  `contains` + facet indexes), new `GET /library/:plantId` (plant + privacy-filtered
  community photos + server-fuzzed sightings), and `GET /plantdex/me` extended with the
  full `catalog` for locked grid states. `computeStats` extracted to `lib/stats.ts`.
- **Mobile** — Library tab now hits `/library` (search + facet chips + sort, debounced);
  Plant Detail (`plant/[id]`) is wired to `/library/:id` (real fields, CC attribution,
  real sighting counts; no more hardcoded confidence); the PlantDex grid renders the full
  catalog with locked silhouettes for undiscovered species.
- **Schema** — added nullable `imageLicense` / `imageAttribution` / `imageSourceUrl` to
  `Plant`. **This migration is NOT yet created/applied** — it stacks on the unapplied
  security-sweep migration (publicLat/Long, `privacy @default(PRIVATE)`,
  `Profile.dateOfBirth`); both need a provisioned Supabase DB (`db:migrate`).
- Out of scope (deferred): `GET /plantdex/:userId` + Feed → M4; Postgres FTS → post-M3
  (`contains` covers MVP); plant chat → M5 (Detail keeps the button, no handler yet).

Earlier: M0 + M1 complete; **M2 — Map & geolocation wired**:
- **Backend** — `GET /api/v1/observations?bbox=` returns privacy-filtered discovery
  pins (own + PUBLIC + accepted-FRIENDS), with rare/sensitive plant coordinates
  fuzzed server-side (`geo.ts`, ~500m snap-to-grid; resolves OPEN_QUESTIONS #8 for
  M2). Covered by vitest (geo, marker serializer, bbox validation).
- **Mobile** — capture now grabs best-effort GPS (`expo-location`) and threads
  lat/long into `POST /observations`; the Map tab is a real `@rnmapbox/maps` map
  (rarity markers, user-location dot, marker preview sheet, location-denied
  fallback) fed by the bbox endpoint, replacing the mock grid.

Earlier: M1 — `POST /observations` identify→score→PlantDex pipeline + swappable
`PlantIdentifier`, `GET /plantdex/me`, and the live capture→upload→result→PlantDex
flow.

**Project is now curated for a custom dev build (Xcode).** `@rnmapbox/maps` cannot
run in Expo Go, so the app needs a dev build to launch — see the new
**`currentPlans/DEV_BUILD.md`** for the full local-iOS (recommended on this Mac:
Xcode 26.3 + CocoaPods already present) and EAS-cloud paths. Added `expo-dev-client`,
`apps/mobile/eas.json`, and `prebuild`/`prebuild:ios` npm scripts.

**Still UI-only / mock-backed:** the PlantDex detail screen (`plant/[id]`, reached
from both the result screen and the map sheet), plus some M3/M4 screens (forum
thread, plant chat). M3–M5 remain. See `currentPlans/BUILD_MILESTONES.md`.

The backend pipeline runs today against a **deterministic stub identifier** (no
credentials needed); the OpenAI vision adapter activates automatically when
`OPENAI_API_KEY` is set. Library matching still benefits from a seeded Library
(`LIBRARY_SEED.md`) — unseeded, the stub auto-creates `OPENAI`-sourced Plant rows.

Verified green (latest, M3):
- `npm run build:shared` + `npm run db:generate` + `npm run typecheck` — pass across all
  4 workspaces
- `npm run test` — 111 tests pass (shared 6, db 27, api 56, mobile 22): scoring, identify,
  observation pipeline, geo fuzzing, marker serializer, bbox + library validation, library
  sort, and the seed pipeline (rarity, USDA transforms, normalize/cap, image license gate,
  committed-dataset integrity)

**NOT runtime-verified:** the Mapbox map and the live GPS→bbox round-trip. Mapbox
needs the dev build (won't run in Expo Go) and a Mapbox token (still absent). The
backend now has a live Supabase DB + Storage bucket (see "Cloud provisioning" above),
but the capture→upload→unlock loop and the map have not yet been exercised end-to-end
against the live API (no Vercel deploy yet; OpenAI key needs rotating first).

Supabase is provisioned (above). OpenAI, Mapbox, Vercel, and the EAS/dev build remain
the user's to wire. `.env` at repo root holds the live Supabase values; secrets stay
backend-only, never in the mobile bundle.

## What changed most recently (this commit — M1 loop wired end-to-end)

Completed the M1 discovery loop on top of the backend pipeline from `91896ff`:

- `apps/api/src/app/api/v1/plantdex/me/route.ts` — `GET /plantdex/me` returning
  `{ entries: PlantDexEntry[], stats }`, scoped to the authenticated user; each
  entry embeds its resolved `Plant` so the grid renders in one fetch.
- Shared `PlantDexEntry` / `PlantDexResponse` types + `serializePlantDexEntry`.
- vitest suite (`apps/api/vitest.config.ts` + 2 test files, 10 tests): stub
  identifier determinism/shape, and the scoring branches (auto-create threshold,
  first-discovery, duplicate decay + cap, quota boundary).
- Mobile capture flow, now live instead of mock:
  - `capture.tsx` — `expo-camera` viewfinder + permission gate + shutter.
  - `src/lib/storage.ts` — uploads the photo to Supabase Storage under
    `<userId>/<uuid>.jpg` (the prefix the API enforces).
  - `src/lib/captureStore.ts` — passes the photo URI / `ObservationResult`
    between the capture→processing→result screens.
  - `processing.tsx` — uploads then `POST /observations`, with a failure/retry
    state replacing the old fixed timer.
  - `result.tsx` — renders the real `ObservationResult` with distinct MATCHED /
    UNCERTAIN / quota-reached views.
  - `plantdex.tsx` — fetches `/plantdex/me` on focus with loading/empty/error
    states.
- Added the `expo-camera` dependency.

## Git state

M0 (`05f37d6`), the M1 UI shell (`7ef20be`), the backend spine (`91896ff`), the
loop-wiring commit (`05970ae`), and the M2 + security-hardening work (through
`220954b`) are on `origin/main`. The `m1-m2-optimizations` branch was pushed earlier
but is fully contained in `main` (it was the merge base) — safe to delete.

**Uncommitted in the working tree (this session):**
- `packages/db/prisma/migrations/20260530171505_init/` — the first Prisma migration
  file, generated when the schema was applied to the live cloud DB. Should be committed
  so `migrate:deploy` is reproducible in CI/Vercel.
- Doc updates: this `HANDOFF.md` and `CLAUDE.md`.
- `.env` (gitignored — never commit; holds live Supabase values + the unrotated leaked
  secrets).

## Next steps

The backend now has a live Supabase DB + Storage. Remaining to reach a working cloud app:

1. **Rotate the leaked secrets FIRST** (user-owned) — OpenAI key + Supabase DB password
   (see the ⚠️ note up top). Update `DATABASE_URL`/`DIRECT_URL` with the new password.
   Nothing should go to Vercel until this is done.
2. **Commit the migration file** — `packages/db/prisma/migrations/...init` is untracked;
   Vercel/CI need it for `prisma migrate deploy`.
3. **Wire Vercel** (user creates project; can be CLI- or dashboard-driven) — import the
   repo, Root Directory `apps/api`, framework Next.js, build per `apps/api/vercel.json`.
   Set env vars (the rotated `.env` values) in the Vercel dashboard. Note: the stub
   identifier is gated out of production, so `OPENAI_API_KEY` is effectively REQUIRED for
   the deployed `/observations` to identify. Then smoke-test `GET /api/v1/health`.
4. **Mobile dev build** — set `EXPO_PUBLIC_API_BASE_URL` to the Vercel URL +
   `EXPO_PUBLIC_MAPBOX_TOKEN`, run the Xcode/EAS dev build (`DEV_BUILD.md`), and walk
   capture→upload→identify→PlantDex against the live API.
5. **PlantDex detail screen** (`plant/[id]`) — still mock-backed; needs a real read.
6. **Seed the Library** (`LIBRARY_SEED.md`) — DB is live now; the stub auto-creates rows
   meanwhile.

Constraints still in force:
- Commit ONLY when explicitly asked.
- `InitalPlans/` frozen; `currentPlans/` is the living source of truth.
- Secrets are backend-only, never in the mobile bundle. Never commit `.env`.
- Per CLAUDE.md: no self-attribution in commits/PRs (overrides any harness default).
