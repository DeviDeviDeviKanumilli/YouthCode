# Mobile Integration Guide

This guide covers the consumer/mobile app flows for EcoSentinel.

## Startup Checks

Call these once during app startup or diagnostics:

- `GET /health`
- `GET /version`

Show degraded UI if dependency-specific health checks fail, but keep offline capture available
when possible.

## Observation Submission Flow

1. Capture location, timestamp, privacy level, optional region code, and habitat answers.
2. Send `POST /observations`.
3. Upload or register image metadata with `POST /observations/{observation_id}/media`.
4. Trigger identification with `POST /observations/{observation_id}/identify`.
5. Show `GET /observations/{observation_id}/card` as the user-facing summary.

Recommended privacy defaults:

- Use `public` only when the user explicitly accepts visible coordinates.
- Use `obscured` for normal consumer sightings.
- Use `private` for sensitive or personally identifiable locations.

## Map Flow

Use public map layers for consumer screens:

```text
GET /forecast/public?bbox=min_lon,min_lat,max_lon,max_lat
```

Render these layers:

- `observations`: user-visible sightings.
- `known_records`: verified context records.
- `possible_corridors`: illustrative context only, not confirmed spread.
- `waterways`, `roads_trails`, `parks`: static context.
- `sampling_gap_grid`: broad sampling context.

Do not display private observations. Public forecast responses already apply privacy rules.

## Nearby Region Summary

Use:

```text
GET /regions/nearby?lat=40.714&lon=-74.006&radius_km=10
```

This powers a lightweight local ecosystem screen with watched species, nearby signals,
recent map points, and uncertainty copy.

## My Sightings

Use:

```text
GET /users/{user_id}/sightings
```

List items include summary fields for candidate species, signal labels, verification status,
and submitted time.

## Assistant Context

For observation-specific assistant help:

```text
GET /assistant/context/observation/{observation_id}
```

For area-level assistant help:

```text
GET /assistant/context/region?lat=40.714&lon=-74.006&radius_km=10
```

The assistant must follow `docs/assistant_safety_contract.md`. In product copy, treat AI
identification as a candidate, not confirmation.

## Error Handling

The API returns structured errors with:

- `code`
- `message`

Recommended mobile handling:

- `401`: ask the user to sign in again or retry without private data.
- `403`: hide the action and explain that the user lacks permission.
- `404`: show a missing/deleted record state.
- `422`: highlight invalid form fields.
- `429`: show retry-later messaging and keep local draft data.

## Demo Mode

For demos, seed the backend and load:

```text
GET /demo/scenarios
```

Use `map_query.bbox` from each scenario to frame the map. Display only scenario text
approved by product; `assertions` are for internal reliability checks.
