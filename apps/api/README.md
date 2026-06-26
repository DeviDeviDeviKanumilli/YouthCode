# EcoSentinel API

Shared FastAPI backend for EcoSentinel.

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

## Current M1.1 Surface

- `GET /health`
- `GET /health/db`
- `GET /health/redis`
- `GET /version`

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
