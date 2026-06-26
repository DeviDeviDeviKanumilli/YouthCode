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
```

## Current M1.1 Surface

- `GET /health`
- `GET /version`

Database, Redis, Docker Compose, and Alembic setup are added in later M1 sub-milestones.
