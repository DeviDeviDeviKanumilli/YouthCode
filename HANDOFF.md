# EcoSentinel Platform Handoff

Running handoff for the full EcoSentinel platform: shared backend, mobile consumer app, and research web dashboard. Update this file after semi-major changes so collaborators can see current progress, verification status, and remaining work.

**Product authority:** `Project_spec.md` (full product spec), `AGENTS.md` (agent rules and wording), `Shared_Backend_plan.md` (backend milestone checklist).

## Repository

- Repository: `DeviDeviDeviKanumilli/YouthCode`
- Branch: `main` (tracks `origin/main`)
- Feature branches `mobile-ui` and `web-dashboard-ui` were merged into `main` on 2026-06-27 and deleted.

## What EcoSentinel Is

EcoSentinel is an AI ecological intelligence platform for the tri-state MVP (NY, NJ, PA). It turns local nature sightings into structured, uncertainty-aware ecological signals for the public and researchers—not a basic species-ID app or a pin map.

```txt
EcoSentinel turns local nature sightings into ecological forecasts.
```

Core pipeline:

```txt
Observation → Identification → Taxonomic normalization → Environmental enrichment
→ Signal scoring → Forecast visualization → Verification → Research export
```

## Platform Layout

| Area | Path | Stack | Role |
|------|------|-------|------|
| Shared backend | `apps/api` | FastAPI, PostgreSQL/PostGIS, Alembic, Redis | All ecological intelligence, APIs, exports, demo seed |
| Consumer app | `apps/mobile` | Expo, React Native, TypeScript, Expo Router | Map-first sightings, report flow, intelligence cards, Watch |
| Research dashboard | `apps/web` | Vite, React 19, TypeScript, Leaflet | Verification queue, observations, maps, sampling gaps, exports, AI analyst |

Supporting docs:

- Mobile integration: `apps/api/docs/mobile_integration.md`
- Research integration: `apps/api/docs/research_dashboard_integration.md`
- API contract: `apps/api/docs/frontend_contract.md`
- Mobile UI issues log: `Mobile_UI_Issues.md`
- Web dashboard detail log: `Web_Dashboard_UI_Handoff.md`
- Research UI design: `Research_Dashboard_UI_Guide.md`
- Mobile build plan: `mobileAppMigration.md`
- Backend roadmap status: `IMPLEMENTATION_ROADMAP.md`

## MVP Vertical Slice Status

Against the judge-facing demo path in `AGENTS.md` and `Project_spec.md`:

| # | Requirement | Backend | Mobile | Web dashboard |
|---|-------------|---------|--------|---------------|
| 1 | Upload a sighting (photo, location, habitat answers) | Done | Done (`Report` tab) | N/A (research-facing) |
| 2 | Store observation and media metadata | Done | Done | N/A |
| 3 | Suggest possible species with uncertainty | Done | Done (intelligence card) | Done (queue/detail) |
| 4 | Enrich with ecological context | Done | Partial (card summaries) | Done (detail panels) |
| 5 | Compute Ecological Signal Priority | Done | Done (card) | Done (filters, queue, table) |
| 6 | Show Sighting Intelligence Card | Done | Done | Done (verification detail) |
| 7 | Appear on Forecast Map | Done | Done (Explore/Watch GeoJSON) | Done (Forecast Map screen) |
| 8 | Enter research verification queue | Done | N/A | Done |
| 9 | Verify, reject, or request more evidence | Done | N/A | Done (+ history) |
| 10 | Export CSV and GeoJSON | Done | N/A | Done (live export lifecycle) |

**MVP vertical slice:** functionally demonstrated end-to-end with local API + demo seed. Production deployment, full auth UI, and live external data feeds are not complete.

## Component Status

### Shared backend (`apps/api`)

- Milestones **M1–M15 complete** per `IMPLEMENTATION_ROADMAP.md` and `Shared_Backend_plan.md`.
- Alembic head: **0017** (includes Watch screen data system).
- Local verification: `make check` passes (~232+ tests); `python -m app.scripts.demo` runs full backend demo flow.
- Key surfaces: observations, media upload, identification, intelligence card, signal scoring, forecast (public + research), sampling gaps, verification, exports, assistant context (observation/region/research), consumer Watch API, demo scenarios.
- Auth: internal JWT helpers exist; **`GET /auth/me` is exposed**; **`POST /auth/token` is documented in contracts but not mounted as a public route**—frontends use `requester_id` / optional bearer env vars for local research mode.
- Docker Compose defined; local dev often uses `apps/api/.venv` + Postgres when Docker is unavailable.

### Mobile consumer app (`apps/mobile`)

**Screens (Expo Router):**

- **Explore** (`index`) — map-first home, public forecast GeoJSON, draggable sheet, demo scenarios, nearby region summary.
- **Watch** — backend Watch cards, good places, map overlay context.
- **Report** — camera capture, habitat clues, privacy, upload, identification pipeline, intelligence card + grounded assistant context on result; local draft persistence.
- **Sightings** — user observation list, intelligence detail (`/sightings/[id]`), follow-up report routing.
- **Profile** — API/session/location status, field-guide cards.
- **Detail routes** — `watch/item/[id]`, `watch/place/[id]`, `observations/[id]` (alternate observation detail).

**Verified locally:**

- `npm run typecheck` passes
- `npm test` passes (20 files, 51 tests)

**Not built (product spec):**

- Full conversational AI chat (context panels only; no chat backend)
- Survey sessions / structured class field surveys
- Population Signal Tracker UI
- Dedicated Native Biodiversity Stress layer screen
- Production API host / store release

**Runtime QA:** see Mobile Judge Demo QA Checklist below. Android emulator verification depends on local SDK availability.

### Research web dashboard (`apps/web`)

**Screens (8):** Overview, Verification Queue, Observations, Forecast Map, Sampling Gaps, Export Center, AI Analyst, Settings.

**Modes:**

- **Demo mode** — deterministic seeded data when API unavailable (default `npm run dev`).
- **API mode** — `npm run sync-api` writes `.env.local` with reviewer `requester_id`; Vite proxies `/api` → `http://127.0.0.1:8000`.

**Verified locally:**

- `npm run build` passes
- `npm run smoke` passes (Playwright screenshots)
- CI: `.github/workflows/web-dashboard.yml` (`npm ci` + `npm run build`)

**Intentional gaps:**

- No auth sign-in UI (`POST /auth/token` route missing; uses `VITE_REQUESTER_ID` + optional `VITE_API_TOKEN`)
- Stub actions still local-only: flag record, sampling plan, follow-up task, save view
- Production CORS / deployed API URL not configured

## Product Spec: Still Open

From `Project_spec.md`, not yet implemented as full product surfaces:

- Population Signal Tracker (time-slider trends, grid occupancy)
- Dedicated Native Biodiversity Stress layer (beyond forecast signal types)
- School survey sessions and negative (“not found”) records workflow
- Live GBIF / iNaturalist / state invasive DB ingestion (MVP uses seeded/cached tri-state data)
- Research Workbench extras: covariate explorer, model-card view, full bias diagnostics UI
- Public “Local Ecosystem Home” as specified (partial via Explore + `GET /regions/nearby`)
- Phase 2+ roadmap items in spec section 21

## How to Run Locally

### Backend

```bash
cd apps/api
source .venv/bin/activate
python -m alembic upgrade head
python -m app.scripts.demo    # or: python -m app.scripts.seed
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

With Docker (when available): `docker compose up -d postgres redis api` from repo root.

### Mobile

```bash
cd apps/mobile
npm install
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run start
# Android emulator host loopback: http://10.0.2.2:8000
```

### Research dashboard

```bash
cd apps/web
npm install
npm run dev              # demo mode
npm run sync-api && npm run dev   # API mode after backend + demo seed
```

## Recent Platform Changes (2026-06-27)

- Merged `mobile-ui` and `web-dashboard-ui` into `main`; deleted both feature branches.
- Mobile: observation detail route (`/observations/[id]`), pipeline status helpers, type fixes after merge.
- Web: full research dashboard with live API filters, verification history, export lifecycle, design cleanup, demo date alignment.
- Backend validation confirmed on local API (Docker unavailable on some machines; venv path works).

## Mobile Judge Demo QA Checklist

Run with API seeded, Android emulator or device, `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000`.

1. **Explore map:** Forecast map loads; pan/zoom; layer pills show signal/gap counts.
2. **Draggable sheet:** Explore/Watch sheet snaps and scrolls independently.
3. **Observation tap:** Pin opens Sighting Intelligence Card detail.
4. **Demo scenarios:** Seeded scenario reframes map; Open card reaches intelligence detail.
5. **Report flow:** Photo → clues → analyze → intelligence card + assistant context.
6. **Draft resume:** Mid-report force-close → resume banner works.
7. **Sightings:** List loads; cards open intelligence detail.
8. **Watch:** Items and places load; map refresh works.
9. **Profile:** API/session/location status reflects backend.
10. **Uncertainty copy:** Uses possible / needs verification framing only.

## Web Dashboard QA Checklist

1. **Demo mode:** `npm run dev` — observations visible in Overview, Queue, Observations.
2. **API mode:** `npm run sync-api` — live queue, verify action, export download URL.
3. **Smoke:** `npm run build && npm run preview` then `npm run smoke`.
4. **Screens:** All 8 nav items render without console errors.

## Handoff Log (condensed)

Detailed mobile issue history lives in `Mobile_UI_Issues.md`. Web dashboard iteration history lives in `Web_Dashboard_UI_Handoff.md`.

### 2026-06-27 — Platform merge to `main`

- Merged mobile and research dashboard feature branches into `main`.
- Resolved mobile merge conflicts favoring evolved `main` mobile flows while keeping `/observations/[id]` route.
- Research dashboard taken from `web-dashboard-ui` branch (complete `apps/web`).
- Post-merge: mobile typecheck fixed; web build/smoke pass.

### 2026-06-27 — Research dashboard complete on feature branch (now on `main`)

- Live API: research filters, verification history, `POST /research/export` lifecycle, error states, CI workflow.
- Visual: minimal scientific workbench across 8 screens per `Research_Dashboard_UI_Guide.md`.
- Demo data dates aligned to default June 2026 filter window.

### 2026-06-27 — Mobile integration phases B–E (on `main`)

- Interactive forecast map, draggable sheets, intelligence card parity, report drafts, env handling.
- `npm test`: 51 tests passing.

### 2026-06-26 — Mobile scaffold

- Created `apps/mobile` with Expo Router; first Watch backend wiring.

## Working Rules for Contributors

- Work on `main`; push major changes to `origin/main`.
- Keep ecological logic in `apps/api`, not frontends.
- Follow uncertainty language in `AGENTS.md` (Ecological Signal Priority, not “danger score”).
- Update this file after semi-major changes; update `Mobile_UI_Issues.md` or `Web_Dashboard_UI_Handoff.md` for surface-specific detail.
- Do not commit secrets, `node_modules`, or build artifacts.
