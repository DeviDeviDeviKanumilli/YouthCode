# EcoSentinel E2E & Demo QA Log

Automated QA scripts for the MVP vertical slice and judge-demo readiness. Platform context: `HANDOFF.md`.

Last run: **2026-06-27** (local API at `http://127.0.0.1:8000`)

## Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Full vertical slice | `node scripts/e2e-mvp-qa.mjs` | Upload → identify → queue → forecast → verify → export → analyst |
| Web API mode | `cd apps/web && npm run sync-api && npm run qa-api` | Same endpoints the research dashboard uses |
| Mobile judge QA | `cd apps/mobile && npm run judge-qa` | Typecheck, unit tests, mobile API surfaces + manual checklist |

Optional env: `E2E_API_BASE` / `QA_API_BASE` (default `http://127.0.0.1:8000`).

**Prerequisites:** Postgres migrated, API running, `python -m app.scripts.demo` reachable via `apps/api/.venv`.

## Latest Results (2026-06-27)

### 1. Full E2E vertical slice — **14/14 PASS**

```
PASS  API health
PASS  Demo seed + backend vertical slice
PASS  Create consumer user
PASS  Upload observation (mobile Report equivalent)
PASS  Attach media evidence
PASS  Species identification
PASS  Pipeline status
PASS  Forecast map research payload (34 features)
PASS  Verification queue contains new sighting
PASS  Reviewer verifies observation (expert_verified)
PASS  Verification history
PASS  Research CSV export + download_url (complete)
PASS  AI Analyst research context (9 top records)
PASS  Intelligence card (mobile detail)
```

### 2. Mobile judge QA — **6/6 automated PASS** + manual checklist pending

Automated:

- API reachable
- `npm run typecheck`
- `npm test` (51 tests)
- `GET /consumer/watch` (2 watch cards)
- `GET /forecast/public` (20 features)
- Intelligence card after demo pipeline

Skipped (optional): Android emulator not connected — complete the 10-item manual checklist on device with `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000`.

### 3. Web API-mode QA — **10/10 PASS**

```
PASS  Resolve reviewer requester_id (sync-api)
PASS  GET /research/observations (13 rows)
PASS  GET /research/verification-queue (4 items)
PASS  GET /verification/{id}/history
PASS  POST /verification/{id} (needs more evidence)
PASS  POST /research/export + download_url (complete)
PASS  GET /research/exports (history)
PASS  GET /forecast/research (40 features)
PASS  GET /sampling-gaps (research)
PASS  POST /assistant/context/research (AI Analyst)
```

## Manual follow-up (judge demo)

Run on Android emulator or device with API seeded:

1. Explore map pan/zoom and layer pills
2. Draggable Explore/Watch sheet
3. Pin → intelligence card
4. Demo scenarios
5. Full Report flow (photo → analyze → card)
6. Draft resume after force-close
7. Sightings list detail
8. Watch items/places refresh
9. Profile API status
10. Uncertainty wording audit

## Re-run before demo

```bash
# Terminal 1 — API
cd apps/api && source .venv/bin/activate
python -m alembic upgrade head && python -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — QA
cd /path/to/Youthcode
node scripts/e2e-mvp-qa.mjs
cd apps/web && npm run sync-api && npm run qa-api
cd apps/mobile && npm run judge-qa
```
