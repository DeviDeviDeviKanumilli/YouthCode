# EcoSentinel Web Dashboard Handoff

Web-dashboard-specific change log. For platform-wide status, MVP checklist, and runbooks, read **`HANDOFF.md`**.

## Current Branch

- Branch: `main`
- Remote tracking branch: `origin/main`
- Code path: `apps/web`

## Working Rules

- Keep dashboard work under `apps/web`.
- Use `Research_Dashboard_UI_Guide.md` as the product and visual direction source.
- Use `apps/api/docs/research_dashboard_integration.md` and `apps/api/docs/frontend_contract.md` for API alignment.
- Prefer deterministic demo data when the API is unavailable.
- Do not implement ecological logic in the dashboard; present backend results only.

## Current Status (2026-06-27)

All eight screens are implemented on `main`: Overview, Verification Queue, Observations, Forecast Map, Sampling Gaps, Export Center, AI Analyst, Settings.

| Capability | Status |
|------------|--------|
| Demo fallback mode | Done |
| Live API mode (`npm run sync-api`) | Done |
| Research observation filters → API query params | Done |
| Verification queue + actions + history | Done |
| Export create → poll → `download_url` | Done |
| Forecast research GeoJSON map | Done |
| Sampling gaps (research mode) | Done |
| AI Analyst grounded context | Done |
| Error states (401/403, API fallback, missing context) | Done |
| CI build (`.github/workflows/web-dashboard.yml`) | Done |
| Auth sign-in UI | Not built (`POST /auth/token` route missing) |
| Save view / flag / sampling plan stubs | localStorage only |

## Handoff Log

### 2026-06-27 - Demo date alignment and dynamic subtitle fixes

Changed:

- Updated all `demoObservations` `submittedAt` dates to June 2026 so they fall within the default filter window.
- Updated `demoExports` IDs and requested dates to June 2026.
- Removed hardcoded month phrase from `buildAnalystAnswer`.
- Changed Overview KPI subtitle to dynamic "Current dashboard filters".

Verified: `npm run build`, `npm run smoke`.

### 2026-06-27 - Visual design cleanup

Changed:

- Full `styles.css` rewrite: minimal scientific workbench per `Research_Dashboard_UI_Guide.md`.
- Per-screen layout polish: verification sticky review bar, analyst 3-column layout, export configure/review split, map layer drawer overlay.
- Sidebar narrowed; filter rail collapsed by default.

Verified: `npm run build`, `npm run smoke` (13 screenshots).

### 2026-06-27 - API validation, filters, history, exports, and CI

Changed:

- Wired dashboard filters to `GET /research/observations` query params.
- Live verification history from `GET /verification/{observation_id}/history`.
- Export lifecycle: `POST /research/export` → `GET /research/exports/{export_id}` → `download_url`.
- Added `.github/workflows/web-dashboard.yml`, fixed `sync-api-env.mjs`, improved error/export states.

Verified: live API checks against local `apps/api/.venv` + Postgres; `npm run build`, `npm run smoke`.

### 2026-06-27 - Initial research dashboard on `main`

Changed:

- Added `apps/web` Vite + React dashboard with demo data and API client.
- Vite dev proxy `/api` → `http://127.0.0.1:8000`.
- Smoke script with Playwright screenshots.

## MVP Checklist (web dashboard scope)

1. Requester identity for research endpoints — partial (`VITE_REQUESTER_ID`, optional bearer; no sign-in form)
2. Verification queue — done
3. Filter observations — done
4. Observation detail view — done
5. Media, species, uncertainty, habitat, context, signal priority, provenance — done
6. Verify, reject, request more evidence — done
7. Research Forecast Map — done
8. Sampling-gap context — done
9. CSV/GeoJSON exports with privacy options — done
10. Grounded AI Analyst — done

## Run Locally

```bash
cd apps/web
npm install
npm run dev
```

API mode (backend required):

```bash
cd apps/api && source .venv/bin/activate
python -m alembic upgrade head && python -m app.scripts.demo
cd apps/web && npm run sync-api && npm run dev
```

Smoke screenshots:

```bash
npm run build && npm run preview   # terminal 1
npm run smoke                      # terminal 2
```
