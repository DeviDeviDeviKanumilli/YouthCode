# Web Dashboard UI Handoff

Last updated: June 27, 2026

Branch: `web-dashboard-ui`

Dev server: `http://127.0.0.1:5174/`

## Current Objective

Build the EcoSentinel research dashboard as a minimalist, working desktop web application that matches the supplied dashboard references while keeping the product scientific, uncertainty-aware, and map-first.

The user likes the reference UI direction but wants it more minimal. The big issues called out were:

- The earlier map was effectively not usable or real enough.
- The verification queue had too much negative space.
- Buttons and controls needed to actually work, not just look clickable.
- The app should continue becoming a complete research dashboard, not a partial mockup.

## Product Rules To Preserve

- Use uncertainty-aware language: possible, likely, needs verification, high-value signal, high-value verification candidate, potential spread corridor, insufficient evidence.
- Use `Ecological Signal Priority`, never danger score.
- Do not claim confirmed spread or guaranteed predictions.
- Forecast Map is the central research demo feature.
- Dashboard audience is researchers, ecologists, park managers, teachers running surveys, and expert reviewers.

## Implemented Web App

The web dashboard is in `apps/web`.

Main files:

- `apps/web/src/App.tsx`
- `apps/web/src/ResearchMap.tsx`
- `apps/web/src/api.ts`
- `apps/web/src/data.ts`
- `apps/web/src/types.ts`
- `apps/web/src/styles.css`
- `apps/web/scripts/smoke-dashboard.mjs`

The app is a Vite React TypeScript dashboard with Leaflet and OpenStreetMap tiles.

Implemented pages:

- Overview
- Verification Queue
- Observations
- Forecast Map
- Sampling Gaps
- Export Center
- AI Analyst
- Settings

## Functional Behavior Implemented

- Real Leaflet map tiles load in Overview, Forecast Map, and Sampling Gaps.
- Forecast Map has working layer toggles for records, corridors, sampling gaps, waterways, roads/trails, parks, and clusters.
- Global filters and search affect visible observations, KPI counts, streams, tables, maps, sampling context, AI context, and export counts.
- Clear filters and restore demo filters are functional.
- Selection is resilient: when filters hide a selected record, the app selects the first visible record; when no rows are visible, pages show empty states.
- Verification Queue supports role-aware review actions.
- Reviewer/admin can Expert Verify, request Needs More Evidence, or Reject with notes.
- Researcher role is blocked from verification actions with clear UI feedback.
- Observations supports saving views, toggling the source column, selecting records, and creating an export request from the table view.
- Export Center supports CSV/GeoJSON selection, field toggles, dynamic field counts, dynamic estimated file size, creating export rows, downloading completed exports, and retrying failed exports.
- AI Analyst accepts a typed research question, produces a deterministic grounded answer from current observations, supports saved analyses, and shows confidence/uncertainty context.
- Settings controls the active role and persists it locally.
- Notifications and app menu popovers work.
- Role, selected record, saved views, and saved AI analyses persist in localStorage.

## Most Recent Work

- Added `retryExport(row)` in `App`.
- Passed `onRetryExport` into `ExportCenter`.
- Passed `onRetryExport` into `ExportHistory`.
- Failed export rows now call `onRetryExport(row)` and queue a new Processing row with the same export details.
- Added smoke coverage for the Retry button.
- Updated `Research_Dashboard_UI_Guide.md` with the export retry integrity pass.
- Captured and inspected `apps/web/artifacts/exports-retry.png`.

Latest checks:

- `npm run build` passed.
- `npm run smoke` passed.

## Verification Status

Previous full verification before this in-progress retry pass:

- `npm run build` passed.
- `npm run smoke` passed.
- Smoke tests covered map tiles, global filters, empty states, role permissions, verification notes, Forecast Map layers, Sampling map tiles, saved observation view, table export, AI Analyst ask/save, Export Center field toggles/create/download, Settings role persistence, and localStorage persistence.

Latest retry pass has been rerun and passed.

## Git Notes

- Do not edit `HANDOFF.md` unless explicitly asked.
- This file is the dashboard-specific handoff.
- Do not revert unrelated mobile changes in the worktree.
- `apps/web/artifacts/` is ignored by web `.gitignore`.
