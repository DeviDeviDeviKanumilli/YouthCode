# Research Dashboard Integration Guide

This guide covers researcher, reviewer, and admin workflows.

## Auth and Roles

Use a bearer token from:

```text
POST /auth/token
```

Then confirm the active user:

```text
GET /auth/me
```

Research endpoints accept a bearer token. Local development may also pass `requester_id`
where documented by the endpoint.

Role expectations:

- `researcher`: can search research observations and request exports.
- `reviewer`: can use researcher tools and perform verification actions.
- `admin`: can manage roles and use all research workflows.

## Research Map

Use:

```text
GET /forecast/research?bbox=min_lon,min_lat,max_lon,max_lat&requester_id={researcher_id}
```

Optional `layer` filters:

- `observations`
- `verified_records`
- `unverified_records`
- `waterways`
- `roads_trails`
- `parks`
- `possible_corridors`
- `sampling_gap_grid`
- `signal_clusters`

Research map responses include exact coordinates for authorized users. Do not reuse research
map payloads in public UI.

## Sampling Gaps

Use public mode for broad map context:

```text
GET /sampling-gaps?bbox=min_lon,min_lat,max_lon,max_lat&mode=public
```

Use research mode for detailed counts and risk context:

```text
GET /sampling-gaps?bbox=min_lon,min_lat,max_lon,max_lat&mode=research
```

Important fields:

- `sampling_label`
- `observation_count`
- `verified_count`
- `recent_observation_count`
- `risk_context`
- `uncertainty`

## Observation Search

Use:

```text
GET /research/observations?requester_id={researcher_id}&limit=50&offset=0
```

Recommended dashboard filters:

- `species_id`
- `candidate_name`
- `verification_status`
- `signal_label`
- `min_signal_score`
- `max_signal_score`
- `bbox`
- `region_code`
- `from_date`
- `to_date`
- `has_media`
- `needs_review`
- `sampling_label`

Recommended sorts:

- `submitted_at_desc`
- `submitted_at_asc`
- `signal_score_desc`
- `signal_score_asc`

## Verification Queue

Use:

```text
GET /research/verification-queue?requester_id={reviewer_id}
```

Prioritize rows with:

- high `signal_score`
- `high_value_verification_candidate`
- `priority_ecological_signal`
- `needs_review=true`
- `needs_structured_survey` or other high-gap sampling labels

## Verification Actions

Use:

```text
POST /research/verification/{observation_id}/actions
```

Common statuses:

- `expert_verified`
- `field_confirmed`
- `rejected`
- `needs_more_evidence`

After an action, refresh:

- `GET /research/verification/{observation_id}/events`
- `GET /research/observations`
- `GET /forecast/research`

## Exports

Create an export:

```text
POST /research/exports
```

List export history:

```text
GET /research/exports?requester_id={researcher_id}
```

Fetch one export record:

```text
GET /exports/{export_id}
```

Supported formats:

- `csv`
- `geojson`

Privacy rules are applied by role and export format. Treat exported files as research data,
not public app content.

## Assistant Context

Use:

```text
GET /assistant/context/research?requester_id={researcher_id}&bbox=min_lon,min_lat,max_lon,max_lat
```

Assistant output must cite data sources, express uncertainty, and avoid claims that exceed
verification status. See `docs/assistant_safety_contract.md`.

## Demo Mode

Run seed data, then call:

```text
GET /demo/scenarios
```

For each scenario:

- Use `script_steps` for the narrated demo flow.
- Use `map_query.bbox` to frame the map.
- Use `observed_outputs` to verify the backend state.
- Require all `assertions` to be `true` before presenting the demo.
