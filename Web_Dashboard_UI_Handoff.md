# EcoSentinel Web Dashboard Handoff

Running handoff log for the research dashboard on the `web-dashboard-ui` branch.

## Current Branch

- Branch: `web-dashboard-ui`
- Remote tracking branch: `origin/web-dashboard-ui`
- Repository: `DeviDeviDeviKanumilli/YouthCode`

## Working Rules

- Keep dashboard work under `apps/web`.
- Use `Research_Dashboard_UI_Guide.md` as the product and visual direction source.
- Use `apps/api/docs/research_dashboard_integration.md` and `apps/api/docs/frontend_contract.md` for API alignment.
- Prefer deterministic demo data when the API is unavailable.
- Do not implement ecological logic in the dashboard; present backend results only.

## Handoff Log

### 2026-06-27 - API validation, filters, history, exports, and CI

Changed:

- Fixed `apps/web/scripts/sync-api-env.mjs` to use `apps/api/.venv/bin/python` when available, so local API mode can generate `.env.local` from the real backend environment.
- Wired the global dashboard filters to real research API query params for `GET /research/observations`, including `species_id`, `bbox`, `region_code`, `from_date`, `to_date`, `verification_status`, `signal_label`, `needs_review`, and `has_media`.
- Kept deterministic demo fallback when the API is unavailable, while adding a distinct API fallback banner when API mode is configured but requests fail.
- Added live verification history loading from `GET /verification/{observation_id}/history` on the verification screen.
- Switched export creation to `POST /research/export`, then refreshes lifecycle state through `GET /research/exports/{export_id}` so completed exports use the real `download_url`.
- Added clearer export state handling for `Processing`, `Completed`, and `Failed`, plus refresh/retry behavior.
- Added calmer, specific UI states for API auth/permission failures, missing media, and missing environmental context.
- Added requester identity visibility in the dashboard UX instead of building a token form against the missing `POST /auth/token` endpoint.
- Added `.github/workflows/web-dashboard.yml` to run `npm ci` and `npm run build` in `apps/web`.
- Updated the smoke script to tolerate current export row actions (`Retry`, `Refresh`, or `Download`) instead of assuming a single demo-only failed export state.

Verified:

- `docker compose up -d postgres redis api` is blocked locally because `docker` is not installed in this environment.
- Local API validation succeeded using `apps/api/.venv`, local Postgres, and the existing API `.env`.
- `cd apps/api && ./.venv/bin/alembic current` reported `0017 (head)`.
- `cd apps/api && ./.venv/bin/python -m app.scripts.demo` succeeded and produced a valid reviewer `requester_id`.
- `cd apps/web && npm run sync-api` now succeeds and writes `.env.local`.
- `cd apps/web && npm run build` passes.
- `cd apps/web && npm run smoke` passes.
- Focused live API verification succeeded for:
  - `GET /research/observations`
  - `GET /research/verification-queue`
  - `GET /verification/{observation_id}/history`
  - `POST /verification/{observation_id}`
  - `POST /research/export`
  - `GET /research/exports/{export_id}`
  - `POST /assistant/context/research`
  - `GET /forecast/research`

Notes:

- `POST /auth/token` is still missing from the backend routes; the dashboard intentionally stays on requester identity + optional `VITE_API_TOKEN` instead of adding a broken auth form.
- `POST /research/exports` still creates pending export records without a generated download. The dashboard now uses `POST /research/export` for the actual researcher export workflow, then refreshes the corresponding record through `GET /research/exports/{export_id}`.

### 2026-06-27 - API mode wiring for local development

Changed:

- Default dev API base to `/api` (Vite proxy to `http://127.0.0.1:8000`).
- Added `loadForecastResearch()` and map rendering from `GET /forecast/research` GeoJSON when API mode is active.
- Added export `download_url` support and `npm run sync-api` to write `.env.local` with a seeded reviewer `requester_id`.
- Added optional `VITE_API_TOKEN` bearer header support for future auth token flows.

Verified:

- `npm run build` passes.
- `npm run smoke` passes in demo fallback mode.
- Live API E2E pending: requires `docker compose up -d postgres redis api` and `npm run sync-api`.

## MVP Checklist

1. Sign in or use local development requester identity — partial (`VITE_REQUESTER_ID`, role switcher; bearer token UI not built)
2. See a verification queue — done
3. Filter observations — done (search + demo filter chips)
4. Open an observation detail view — done
5. Inspect media, species, uncertainty, habitat, context, signal priority, provenance — done (demo rich; API enriches from verification queue)
6. Verify, reject, or request more evidence with required notes — done (`Field confirmed` admin-only)
7. See the record on the research Forecast Map — done (demo corridors; observations from API when available)
8. Inspect sampling-gap context — done (API research mode when available)
9. Create CSV and GeoJSON exports with privacy-aware options — done (API create/list with demo fallback)
10. Ask the AI Analyst a grounded research question — done (API POST + local fallback)

## Run Locally

```bash
cd apps/web
npm install
npm run dev
```

Optional API mode (with backend running):

```bash
# Terminal 1 — from repo root
docker compose up -d postgres redis api
cd apps/api && python3 -m alembic upgrade head

# Terminal 2 — dashboard
cd apps/web
npm run sync-api   # writes .env.local with reviewer requester_id
npm run dev        # proxies /api -> http://127.0.0.1:8000
```

Manual API env:

```bash
cp .env.example .env.local
# VITE_API_BASE_URL=/api
# VITE_REQUESTER_ID=<reviewer-uuid-from-demo-script>
npm run dev
```

Smoke screenshots:

```bash
npm run build
npm run preview
npm run smoke
```
