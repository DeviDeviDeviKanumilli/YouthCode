# API Examples

Base URL for local development:

```text
http://127.0.0.1:8000
```

## Create an Observation

```bash
curl -sS -X POST http://127.0.0.1:8000/observations \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-06-26T12:00:00Z",
    "latitude": "40.714000",
    "longitude": "-74.006000",
    "region_code": "NY",
    "privacy_level": "public",
    "habitat_answers": {
      "near_water": true,
      "growth_form": "dense_patch"
    }
  }'
```

Expected response shape:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "timestamp": "2026-06-26T12:00:00Z",
  "latitude": "40.714000",
  "longitude": "-74.006000",
  "region_code": "NY",
  "privacy_level": "public"
}
```

## Add Media Metadata

```bash
curl -sS -X POST http://127.0.0.1:8000/observations/{observation_id}/media \
  -H "Content-Type: application/json" \
  -d '{
    "file_type": "image",
    "mime_type": "image/jpeg",
    "storage_key": "observations/demo/photo.jpg",
    "public_url": "https://example.test/photo.jpg",
    "caption": "Stem and leaf detail"
  }'
```

## Run AI Identification

```bash
curl -sS -X POST http://127.0.0.1:8000/observations/{observation_id}/identify \
  -H "Content-Type: application/json" \
  -d '{"media_id": "00000000-0000-0000-0000-000000000000"}'
```

The MVP provider is deterministic in local development. Production can swap in a real
provider behind the same response contract.

## Public Forecast Map

```bash
curl -sS "http://127.0.0.1:8000/forecast/public?bbox=-74.03,40.69,-73.98,40.75"
```

Important GeoJSON feature layers:

- `observations`
- `known_records`
- `possible_corridors`
- `waterways`
- `roads_trails`
- `parks`
- `sampling_gap_grid`

## Sampling Gaps

```bash
curl -sS "http://127.0.0.1:8000/sampling-gaps?bbox=-74.03,40.69,-73.98,40.75&mode=public"
```

Use `mode=research` when the dashboard needs detailed counts and risk context.

## Research Search

Research routes require either a bearer token or `requester_id` for local development.

```bash
curl -sS "http://127.0.0.1:8000/research/observations?requester_id={researcher_id}&signal_label=high_value_verification_candidate&limit=25"
```

Useful filters:

- `candidate_name`
- `verification_status`
- `signal_label`
- `min_signal_score`
- `max_signal_score`
- `bbox`
- `region_code`
- `needs_review`
- `sampling_label`

## Verification Action

```bash
curl -sS -X POST http://127.0.0.1:8000/verification/{observation_id} \
  -H "Content-Type: application/json" \
  -d '{
    "requester_id": "{reviewer_id}",
    "status": "expert_verified",
    "reviewer_type": "agency_reviewer",
    "review_notes": "Confirmed from submitted evidence."
  }'
```

## Exports

```bash
curl -sS -X POST http://127.0.0.1:8000/research/exports \
  -H "Content-Type: application/json" \
  -d '{
    "requester_id": "{researcher_id}",
    "export_format": "csv",
    "filters": {
      "region_code": "NY",
      "verification_status": "expert_verified"
    }
  }'
```

Supported formats:

- `csv`
- `geojson`

## Assistant Context

```bash
curl -sS "http://127.0.0.1:8000/assistant/context/observation/{observation_id}"
curl -sS "http://127.0.0.1:8000/assistant/context/region?lat=40.714&lon=-74.006&radius_km=10"
curl -sS "http://127.0.0.1:8000/assistant/context/research?requester_id={researcher_id}&bbox=-74.03,40.69,-73.98,40.75"
```

Assistant copy must follow the [assistant safety contract](assistant_safety_contract.md).

## Demo Scenarios

```bash
cd apps/api
python -m app.scripts.seed
curl -sS http://127.0.0.1:8000/demo/scenarios
```

Each scenario includes:

- `script_steps`
- `map_query`
- `expected_outputs`
- `observed_outputs`
- `assertions`

All assertion values should be `true` for a reliable product demo.
