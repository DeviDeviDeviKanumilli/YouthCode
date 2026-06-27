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
- `cd apps/mobile && npm test` passed: 4 files, 13 tests.
- `cd apps/api && ./.venv/bin/python -m ruff check .` passed.
- `cd apps/api && ./.venv/bin/python -m mypy app tests` passed.
- `cd apps/api && ./.venv/bin/python -m pytest` passed: 243 tests.

## Product Checklist Notes

- Observation upload flow is wired through backend observation, media byte upload, identification, and intelligence card endpoints.
- Report prefill context from Watch, Good Places, and sighting history is now visible before submission and carried into backend habitat answers.
- My Sightings is wired to `GET /users/{user_id}/observations`.
- Watch and Explore are wired to backend local signal endpoints.
- Forecast Map now consumes the public forecast endpoint, but still renders a simplified abstract map rather than geospatial shapes.
- Profile now provides a practical integration status screen.
- Research dashboard flows remain outside the mobile app scope.
