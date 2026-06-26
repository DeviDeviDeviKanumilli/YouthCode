# EcoSentinel API

Shared FastAPI backend for EcoSentinel: observation intake, AI-assisted identification,
ecological signal scoring, public/research map layers, sampling gaps, verification workflows,
exports, assistant context, and deterministic product demos.

## Local Setup

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
cp .env.example .env
python -m uvicorn app.main:app --reload
```

The API will start at `http://127.0.0.1:8000`.

Interactive OpenAPI docs are available at:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- Raw schema: `http://127.0.0.1:8000/openapi.json`

## Commands

From the repository root:

```bash
make dev
make api-dev
make test
make lint
make typecheck
make check
```

From `apps/api` directly:

```bash
python -m pytest
python -m ruff check .
python -m mypy app tests
python -m alembic upgrade head
```

## Endpoint Overview

Health and system:

- `GET /health`
- `GET /health/db`
- `GET /health/redis`
- `GET /version`

Auth and users:

- `POST /auth/token`
- `GET /auth/me`
- `POST /users`
- `GET /users/{user_id}`
- `PATCH /users/{user_id}/role`

Consumer app:

- `POST /observations`
- `GET /observations/{observation_id}`
- `POST /observations/{observation_id}/media`
- `GET /observations/{observation_id}/media`
- `POST /observations/{observation_id}/identify`
- `GET /observations/{observation_id}/card`
- `GET /users/{user_id}/sightings`
- `GET /regions/nearby`
- `GET /assistant/context/observation/{observation_id}`
- `GET /assistant/context/region`

Species, enrichment, and scoring:

- `POST /species`
- `GET /species`
- `GET /species/search`
- `GET /species/{species_id}`
- `PATCH /species/{species_id}`
- `POST /environmental-context/{observation_id}/enrich`
- `GET /environmental-context/{observation_id}`
- `GET /nearby-records/{observation_id}`
- `POST /signal-scores/{observation_id}/recompute`
- `GET /signal-scores/{observation_id}`
- `GET /signal-scores/{observation_id}/explanation`
- `GET /observations/{observation_id}/pipeline-status`

Maps and sampling gaps:

- `GET /forecast/public`
- `GET /forecast/research`
- `GET /sampling-gaps`

Research dashboard:

- `GET /research/observations`
- `GET /research/verification-queue`
- `POST /research/verification/{observation_id}/actions`
- `GET /research/verification/{observation_id}/events`
- `POST /research/exports`
- `GET /research/exports`
- `GET /exports/{export_id}`
- `GET /assistant/context/research`

Demo:

- `GET /demo/scenarios`
- `GET /demo/scenarios/{scenario_id}`

## Integration Docs

- [API examples](docs/api_examples.md)
- [Mobile integration guide](docs/mobile_integration.md)
- [Research dashboard integration guide](docs/research_dashboard_integration.md)
- [Assistant safety contract](docs/assistant_safety_contract.md)

## Demo Seed Data

Run the seed command before using the deterministic product demo:

```bash
cd apps/api
python -m app.scripts.seed
```

Then call `GET /demo/scenarios`. The response includes three scripted scenarios,
the seeded observation IDs, expected outputs, observed backend outputs, and boolean
assertions that should all be `true`.

Demo scenario IDs:

- `student_knotweed_near_creek`
- `resident_low_priority_park`
- `student_under_sampled_survey`

Alembic migrations live in `apps/api/alembic`.

## Docker Compose

From the repository root:

```bash
make dev
```

This starts:

- API at `http://localhost:8000`
- PostgreSQL/PostGIS at `localhost:5432`
- Redis at `localhost:6379`

Optional MinIO storage can be started with:

```bash
docker compose --profile storage up --build
```
