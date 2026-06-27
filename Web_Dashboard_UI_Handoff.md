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
