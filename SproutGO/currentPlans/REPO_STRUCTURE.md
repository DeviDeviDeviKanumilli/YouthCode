# SproutGo — Repository Structure

Day-one layout so the mobile app, backend, and shared code have a home before any code is
written. The baseline named the stack (Expo + Vercel + Prisma + Supabase) but not how the
repo is organized.

> Cross-refs: env vars tie to [SECURITY_AND_PRIVACY](./SECURITY_AND_PRIVACY.md); Prisma
> schema is generated from [DATA_MODEL](./DATA_MODEL.md); seed script from
> [LIBRARY_SEED](./LIBRARY_SEED.md).

## Decision: monorepo

**Recommended: a single monorepo** (pnpm or npm workspaces). Rationale:
- Mobile and backend **share types** — the `IdResult`, API payload shapes, and enums should
  be defined once and imported by both. Two repos would duplicate or drift them.
- The Prisma schema and generated client are shared between backend routes and the seed
  script.
- One PR can change an endpoint and its mobile caller together.

Tradeoff: slightly more tooling setup (workspaces, build filtering). Acceptable for a
small team. (OPEN_QUESTIONS #6 — confirm before scaffolding.)

## Layout

```
SproutGO/
├─ apps/
│  ├─ mobile/                 # Expo / React Native app
│  │  ├─ app/                 # screens (expo-router): map, camera, plantdex, feed, profile…
│  │  ├─ src/
│  │  │  ├─ components/       # reusable UI from design.md component system
│  │  │  ├─ features/         # capture, plantdex, library, social, chat
│  │  │  ├─ lib/              # supabase client, api client, hooks
│  │  │  └─ theme/            # color/spacing tokens from design.md §3–5
│  │  ├─ app.config.ts        # Expo config (EAS, plugins incl. rnmapbox)
│  │  └─ package.json
│  └─ api/                    # Vercel backend (Next.js API routes or Node)
│     ├─ src/
│     │  ├─ routes/           # endpoints per API_CONTRACT domains
│     │  ├─ services/         # PlantIdentifier impls, scoring, chat prompt builder
│     │  ├─ lib/              # prisma client, auth (JWT verify), supabase admin
│     │  └─ config/           # SCORING object, thresholds
│     └─ package.json
├─ packages/
│  ├─ db/                     # Prisma schema + client + seed script
│  │  ├─ prisma/schema.prisma # generated from DATA_MODEL.md
│  │  ├─ seed/                # LIBRARY_SEED script + normalized dataset
│  │  └─ package.json
│  └─ shared/                 # types + enums shared by mobile & api
│     ├─ src/types.ts         # API payloads, IdResult
│     └─ src/enums.ts         # Rarity, NativeStatus, Privacy, … (single source)
├─ currentPlans/              # these living docs
├─ InitalPlans/               # frozen baselines
├─ .env.example
└─ package.json               # workspace root
```

Shared enums live in `packages/shared/src/enums.ts` and are the single source mirrored by
the Prisma enums (kept in sync; Prisma is generator of record for the DB, `shared` for app
code).

## `.env.example` checklist

Committed with placeholder values; real values are Vercel env vars / local `.env` (gitignored).

```
# --- Backend only (NEVER in the mobile bundle) ---
DATABASE_URL=             # Supabase pooler URL, port 6543 (see TECH_RISKS)
DIRECT_URL=               # Supabase direct URL, port 5432 (migrations only)
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
SUPABASE_JWT_SECRET=      # to verify incoming app tokens

# --- Safe for client (public, restricted) ---
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_MAPBOX_TOKEN= # URL-restricted public token
EXPO_PUBLIC_API_BASE_URL= # Vercel deployment URL
```

Note the two DB URLs: Prisma **runtime** uses the pooler (`DATABASE_URL`, 6543) while
**migrations** use the direct connection (`DIRECT_URL`, 5432) — required for Supabase +
serverless (see [TECH_RISKS](./TECH_RISKS.md)).

## Tooling notes

- TypeScript across all packages; `shared` built first.
- Mobile requires a **custom EAS dev build** (not Expo Go) because of `@rnmapbox/maps` —
  see [TECH_RISKS](./TECH_RISKS.md).
- `.gitignore` already excludes `.claude/settings.local.json`; add `.env`, `node_modules`,
  Expo/EAS artifacts when scaffolding.
