# Mobile UI Issues Log

Date: 2026-06-27
Branch: `main`

## Fixed In This Pass

- Forecast Map UI was static in the mobile app even though the backend exposes `GET /forecast/public`.
  - Added a mobile forecast API client.
  - Added forecast layer summarization for observations, known records, possible corridors, sampling gaps, and static context.
  - Wired Watch and Explore map headers to show backend-derived public forecast feature counts.

- App startup requested camera permission before the user opened Report.
  - Removed the global camera permission request from `LocationProvider`.
  - Camera permission now stays scoped to the Report flow, where the user expects it.

- Profile tab still read like a placeholder and did not help verify backend wiring.
  - Added API health/version status from `GET /health` and `GET /version`.
  - Added local observer session status from the backend-backed `UserProvider`.
  - Added location permission/status controls.

- Watch and Explore target refreshes did not await all backend refresh work.
  - Converted screen load functions to async flows.
  - Refresh now waits for both Watch data and Forecast Map data.

- Report actions from Watch, Good Places, and Sightings did not visibly show all route context before submission.
  - Added a compact Report context panel on the clue step.
  - Preserved `watch_item_id`, `suggested_species_id`, `place_id`, `habitat_hint`, and follow-up observation ID in submitted habitat answers.
  - Added unit coverage for Report context normalization.

- Mobile photo submission registered metadata without sending image bytes to backend-readable storage.
  - Added `POST /observations/{observation_id}/media/upload`.
  - Added local media byte storage and `/media-files` static serving for development.
  - Updated Report to upload the captured photo before identification.
  - Updated Sightings thumbnail handling for backend-relative media URLs.

- Nearby Region Summary existed in the backend but was not surfaced in the mobile UI.
  - Added a mobile client for `GET /regions/nearby`.
  - Added a local ecosystem card on Explore with watched species, nearby signal, recent point, sampling, and uncertainty context.
  - Added unit coverage for region summary counts.

- Saved Sightings could not reopen the backend Sighting Intelligence Card.
  - Added a saved sighting detail route backed by `GET /observations/{observation_id}/intelligence-card`.
  - Updated Sightings list cards to open the intelligence card while keeping follow-up reporting as a separate action.
  - Added unit coverage for intelligence-card title and priority display fallbacks.

- Watch item and Good Place detail screens ignored backend `mapOverlay` context.
  - Added a shared Map Overlay Summary component for detail screens.
  - Shows potential spread corridor/context type, geometry availability, record point availability, and uncertainty-aware map copy.
  - Added unit coverage for map overlay display copy.

- Observation-specific Assistant Context existed in the backend but was not visible in mobile.
  - Added a mobile client for `GET /assistant/context/observation/{observation_id}`.
  - Added a grounded assistant context panel on saved Sighting Intelligence Card detail.
  - Shows allowed claim count, evidence availability, required uncertainty notice, data source count, and verification status.
  - Added unit coverage for assistant context summarization.

- Sampling Gap Layer was only represented as a forecast count in mobile.
  - Added a mobile client for `GET /sampling-gaps?bbox=...&mode=public`.
  - Added an Explore Sampling Gap Layer card with nearby grid-cell count, top sampling label, explanation, uncertainty, and label breakdown.
  - Added unit coverage for bbox generation and sampling label summarization.

- Backend API errors were shown directly in mobile UI panels.
  - Added a structured `ApiError` and user-safe `messageForError` helper.
  - Updated backend-backed screens/hooks to show calm retryable copy for 404, 422, 429, 5xx, and network failures.
  - Added unit coverage for user-safe error mapping.

- Area-level Assistant Context existed in the backend but was not visible in mobile.
  - Added a mobile client for `GET /assistant/context/region`.
  - Added a grounded area context card on Explore with observation count, sampling-cell count, signal counts, sampling-gap counts, high-priority records, data sparsity warning, uncertainty notice, and data-source count.
  - Added unit coverage for region assistant context summarization.

- Startup backend health/version checks were only visible after opening Profile.
  - Added an app-wide System Status provider that calls `/health` and `/version` at startup.
  - Added a shared degraded-backend banner in the main tab frame with safe copy and retry behavior.
  - Refactored Profile to reuse the same startup status instead of issuing a separate health/version request.
  - Added unit coverage for healthy, unavailable, and degraded system-status summaries.

- Demo scenarios from the mobile integration guide were not available in the mobile UI.
  - Added a mobile client and hook for `GET /demo/scenarios`.
  - Added a deterministic demo scenario deck on Explore using only backend-approved scenario title/script/output text.
  - Selecting a scenario switches the Forecast Map request to the scenario `map_query.bbox`.
  - Added an action to open the seeded observation's backend Sighting Intelligence Card.
  - Added unit coverage for demo scenario summary copy and deterministic check counts.

- Report habitat clues used mobile-only `not_sure` values and did not collect habitat type.
  - Normalized uncertain answers to backend-friendly `unknown` values before submission.
  - Added a habitat type question to improve backend enrichment/scoring context.
  - Inferred initial habitat type from Watch/Good Place context while keeping the answer editable.
  - Preserved report provenance in `habitat_answers` without triggering strict adaptive validation conflicts.
  - Added unit coverage for answer normalization, habitat inference, and submitted payload shape.

- Report did not expose the backend privacy levels to users.
  - Added a Location Privacy selector to the Report clue step.
  - Kept `obscured` as the default for normal consumer sightings.
  - Added clear warning copy before the user selects public exact coordinates.
  - Added a private option for sensitive sightings.
  - Added unit coverage for privacy defaults and copy.

- Report result did not surface the backend pipeline status endpoint.
  - Added a mobile client for `GET /observations/{observation_id}/pipeline-status`.
  - Added a processing status card after Report submission when pipeline status is available.
  - Shows completed steps, failed steps, and the backend's next available user action.
  - Keeps the Sighting Intelligence Card visible if the optional pipeline-status call fails.
  - Added unit coverage for pipeline status titles, step labels, and next-action copy.

## Remaining Issues / Limitations

- Android simulator verification could not be completed in this environment.
  - `adb devices` returned no attached device.
  - Android SDK/emulator binaries were not present under the usual macOS paths.

- Live local API flow could not be fully exercised against Postgres in this environment.
  - `GET /health` and `GET /version` responded from the local API server.
  - DB-backed endpoints returned connection errors because Postgres was not running.
  - `docker` is not installed, so the compose stack could not be started here.
  - Focused backend integration tests for the same mobile-facing endpoints passed in the API test environment.

- Production S3-compatible storage is still a future hardening task.
  - The app now uploads image bytes to backend local storage for development and demos.
  - A production deployment should add the S3 adapter or presigned URL workflow behind the same media contract.

## Verification Run

- `cd apps/mobile && npm run typecheck` passed.
- `cd apps/mobile && npm test` passed: 14 files, 35 tests.
- `cd apps/api && ./.venv/bin/python -m ruff check .` passed.
- `cd apps/api && ./.venv/bin/python -m mypy app tests` passed.
- `cd apps/api && ./.venv/bin/python -m pytest` passed: 243 tests.

## Product Checklist Notes

- Observation upload flow is wired through backend observation, media byte upload, identification, and intelligence card endpoints.
- Saved observations can reopen the backend Sighting Intelligence Card from the Sightings tab.
- Report prefill context from Watch, Good Places, and sighting history is now visible before submission and carried into backend habitat answers.
- My Sightings is wired to `GET /users/{user_id}/observations`.
- Watch and Explore are wired to backend local signal endpoints.
- Explore now uses `GET /regions/nearby` for local ecosystem and sampling context.
- Watch detail screens now surface backend map overlay context where provided.
- Saved sighting detail now surfaces grounded observation Assistant Context.
- Explore now surfaces public Sampling Gap Layer context and absence cautions.
- Backend error states now use user-safe mobile copy instead of raw response bodies.
- Explore now surfaces grounded area-level Assistant Context.
- App startup now checks backend health/version and surfaces a degraded-backend banner across the main mobile shell.
- Explore now surfaces deterministic demo scenarios and can frame the Forecast Map with scenario bbox context.
- Report now submits backend-friendly habitat clue values and habitat type context.
- Report now lets users choose public, obscured, or private location privacy while defaulting to obscured.
- Report result now surfaces backend pipeline status when available.
- Forecast Map now consumes the public forecast endpoint, but still renders a simplified abstract map rather than geospatial shapes.
- Profile now provides a practical integration status screen.
- Research dashboard flows remain outside the mobile app scope.
