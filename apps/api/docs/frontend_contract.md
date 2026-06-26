# Frontend API Contract Freeze

Contract version: `0.1.0`

Frozen OpenAPI artifact: `docs/openapi.json`

Local base URL:

```text
http://127.0.0.1:8000
```

## Auth Requirements

Public or anonymous flows:

- `GET /health`
- `GET /version`
- `POST /observations`
- `GET /observations/{observation_id}`
- `POST /observations/{observation_id}/media`
- `POST /observations/{observation_id}/identify`
- `GET /observations/{observation_id}/intelligence-card`
- `GET /forecast/public`
- `GET /sampling-gaps?mode=public`
- `GET /regions/nearby`
- `GET /demo/scenarios`

Authenticated or role-scoped flows:

- Use `POST /auth/token` to obtain an internal bearer token.
- Use `GET /auth/me` to validate the active user.
- Research endpoints accept bearer auth. Local development endpoints may also accept
  `requester_id` where the OpenAPI schema exposes it.
- Research access roles: `researcher`, `reviewer`, `admin`.
- Verification actions require `reviewer` or `admin`.
- Private export access requires `admin`.

Bearer header:

```text
Authorization: Bearer {token}
```

## Error Response Format

All application errors use:

```json
{
  "code": "machine_readable_error",
  "message": "Human-readable explanation.",
  "details": null
}
```

Frontend handling:

- `401`: request sign-in or provide `requester_id` in local development.
- `403`: hide restricted action and explain permission requirements.
- `404`: show missing/deleted record state.
- `422`: map validation errors to form fields.
- `429`: retry later and preserve local drafts.

## Mobile Endpoint List

Observation capture:

- `POST /observations`
- `GET /observations/{observation_id}`
- `POST /observations/{observation_id}/media`
- `GET /observations/{observation_id}/media`
- `POST /observations/{observation_id}/identify`
- `GET /observations/{observation_id}/intelligence-card`

User and personal history:

- `POST /users`
- `GET /users/{user_id}`
- `GET /users/{user_id}/observations`

Consumer map and local context:

- `GET /forecast/public`
- `GET /sampling-gaps`
- `GET /regions/nearby`

Assistant context:

- `GET /assistant/context/observation/{observation_id}`
- `GET /assistant/context/region`

Demo support:

- `GET /demo/scenarios`
- `GET /demo/scenarios/{scenario_id}`

## Research Dashboard Endpoint List

Auth and users:

- `POST /auth/token`
- `GET /auth/me`
- `POST /users`
- `GET /users/{user_id}`
- `PATCH /users/{user_id}/role`

Research map and search:

- `GET /forecast/research`
- `GET /sampling-gaps?mode=research`
- `GET /research/observations`
- `GET /assistant/context/research`

Verification:

- `GET /research/verification-queue`
- `POST /verification/{observation_id}`
- `GET /verification/{observation_id}/history`

Exports:

- `POST /research/export`
- `POST /research/exports`
- `GET /research/exports`
- `GET /research/exports/{export_id}`
- `PATCH /research/exports/{export_id}`

Pipeline status:

- `GET /observations/{observation_id}/pipeline-status`

## Shared Response Schemas

Use the canonical schemas in `docs/openapi.json`. The most important shared schemas are:

- `ErrorResponse`
- `ObservationRead`
- `ObservationCreateResponse`
- `MediaRead`
- `AIIdentificationRead`
- `EnvironmentalContextRead`
- `SignalScoreRead`
- `ScoreExplanation`
- `IntelligenceCard`
- `GeoJSONFeature`
- `GeoJSONFeatureCollection`
- `ResearchObservationPage`
- `VerificationQueueResponse`
- `ExportJobRead`
- `AssistantContextResponse`
- `DemoScenario`

## Example Payloads

Create observation:

```json
{
  "timestamp": "2026-06-26T12:00:00Z",
  "latitude": "40.714000",
  "longitude": "-74.006000",
  "region_code": "NY",
  "privacy_level": "obscured",
  "habitat_answers": {
    "near_water": true,
    "growth_form": "dense_patch"
  }
}
```

Public forecast query:

```text
GET /forecast/public?bbox=-74.03,40.69,-73.98,40.75
```

Research observation query:

```text
GET /research/observations?signal_label=high_value_verification_candidate&needs_review=true&limit=25
```

Verification action:

```json
{
  "requester_id": "00000000-0000-0000-0000-000000000000",
  "status": "expert_verified",
  "reviewer_type": "agency_reviewer",
  "review_notes": "Confirmed from submitted evidence."
}
```

Export request:

```json
{
  "requester_id": "00000000-0000-0000-0000-000000000000",
  "export_format": "geojson",
  "filters": {
    "region_code": "NY",
    "verification_status": "expert_verified"
  }
}
```

## Contract Change Rules

- Additive fields are allowed after this freeze when clients can ignore them.
- Removing fields, renaming fields, changing enum values, or changing auth requirements
  requires a version bump and frontend coordination.
- Privacy behavior is part of the contract: public map and normal research exports must not
  leak private coordinates.
- Assistant responses must follow `docs/assistant_safety_contract.md`.
