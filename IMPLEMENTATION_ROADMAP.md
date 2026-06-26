# EcoSentinel Backend Implementation Roadmap

This roadmap turns `Shared_Backend_plan.md` into an execution sequence. Keep it updated as milestones are completed, and commit/push at each sub-milestone.

## Working Rules

- Implement in milestone order unless a later item is needed to complete the current milestone cleanly.
- Commit and push after each sub-milestone, using messages like `M1.1 Add backend project foundation`.
- Keep the API contract friendly to both planned frontends:
  - Expo mobile app for consumer sightings and intelligence cards.
  - Web research dashboard for verification, maps, filters, and exports.
- Keep ecological logic in backend services, not frontend-specific code.
- Prefer deterministic mock/static providers for MVP reliability, then add live integrations behind provider interfaces.
- Treat Supabase as an allowed deployment/auth/database target, but keep local Docker Postgres/PostGIS supported for development and tests.

## Architecture Decisions For Initial Build

- Backend language: Python 3.12+.
- Web framework: FastAPI.
- Database access: SQLAlchemy 2.0 async ORM.
- Schemas/settings: Pydantic v2 and pydantic-settings.
- Migrations: Alembic.
- Database: PostgreSQL with PostGIS.
- Cache/jobs: Redis with a later queue adapter.
- Storage: abstract storage service with local adapter first, S3-compatible adapter later.
- Tests: pytest, pytest-asyncio, and httpx.
- Quality: Ruff and mypy.

## Milestone Execution Plan

### M1 - Project Foundation

M1.1 project setup:

- Create `apps/api` backend structure.
- Add Python package metadata and dependency groups.
- Add settings, logging, error helpers, app factory, health router, and basic tests.
- Add `.env.example`, README, Makefile commands, Ruff, mypy, and pytest config.

M1.2 Docker Compose local environment:

- Add API Dockerfile.
- Add `docker-compose.yml` with API, Postgres/PostGIS, Redis, and optional MinIO.
- Add local service env defaults and startup commands.

M1.3 health and system endpoints:

- Add `/health`, `/health/db`, `/health/redis`, and `/version`.
- Add integration tests and graceful disabled/unavailable behavior.

M1.4 migration foundation:

- Configure SQLAlchemy async engine/session.
- Configure Alembic.
- Add initial migration enabling PostGIS.
- Add base model conventions.
- Add migration tests or documented local migration verification.

### M2 - Core Data Model

- Add users, species, observations, media, identifications, environmental context, signal scores, verification, and export tracking.
- Add schemas, repositories, services, endpoints, migrations, and tests per sub-milestone.
- Keep observation geometry and privacy behavior ready for map/export APIs.

### M3 - Observation API and Consumer Backend Flow

- Complete sighting creation, media attachment, habitat answer validation, intelligence card, my sightings, and nearby-region summary.
- Make responses immediately usable by an Expo app.

### M4 - Identification and Taxonomy

- Add provider interface, deterministic mock identification, identify endpoint, normalization service, and MVP species seed data.

### M5 - Environmental Enrichment

- Add enrichment provider interface, static geospatial layers, enrichment endpoint, and nearby records summary.

### M6 - Ecological Signal Priority

- Add transparent scoring constants, component scoring functions, recompute endpoint, and explanation generator.
- Enforce uncertainty-aware labels and wording.

### M7 - Forecast Layers and Map APIs

- Add public and research GeoJSON endpoints, simple possible corridor generator, and time/species/verification filters.

### M8 - Sampling Gap Layer

- Add sampling grid persistence, label logic, and public/research sampling APIs.

### M9 - Verification and Research Workbench APIs

- Add research observation search, verification queue, role-aware verification actions, and audit trail.

### M10 - Research Export System

- Add CSV and GeoJSON exports with filters, privacy handling, and export history.

### M11 - Assistant Context API

- Add grounded context endpoints for observations, regions, and research questions.
- Add assistant safety contract and allowed-claims generator.

### M12 - Auth, Authorization, and Security

- Add auth integration. Supabase JWT verification is preferred if a project is available; internal JWT remains acceptable for local-only MVP.
- Add RBAC, rate limits/input limits, and geolocation privacy.

### M13 - Background Jobs and Pipeline Orchestration

- Add Redis-backed job queue, observation pipeline orchestration, and pipeline status endpoint.

### M14 - Demo Seed Data and Reliability

- Add tri-state seed data, deterministic demo scenarios, API docs, and integration guides.

### M15 - Final Quality Gate

- Run full tests, lint, type checking, migrations, demo script, and API contract review.
- Verify both consumer and research dashboard integration requirements are covered.

## Current Status

- Planning docs exist and are pushed to GitHub.
- M1.1 project foundation is implemented, verified, committed, and pushed.
- M1.2 Docker Compose local environment is implemented; Docker runtime verification is pending because Docker is not installed in this environment.
- M1.3 health and system endpoints are implemented, verified, committed, and pushed.
- M1.4 migration foundation is implemented and locally verified with Alembic head discovery. Real `upgrade head` verification is pending until Postgres/Docker or an active Supabase project is available.
- M2.1 users and roles is implemented, locally verified, committed, and pushed.
- M2.2 species table is implemented, locally verified, committed, and pushed.
- M2.3 observations table with PostGIS geometry is implemented, locally verified, committed, and pushed.
- M2.4 media table and storage adapter are implemented, locally verified, committed, and pushed.
- M2.5 AI identifications table is implemented, locally verified, committed, and pushed.
- M2.6 environmental context table is implemented, locally verified, committed, and pushed.
- M2.7 signal scores table is implemented, locally verified, committed, and pushed.
- M2.8 verification table is implemented, locally verified, committed, and pushed.
- M2.9 export tracking table is implemented, locally verified, committed, and pushed.
- M2 is complete against the current local verification gates: `make check` passes with 64 tests and Alembic head is `0010`.
- M3.1 consumer observation/media flow is covered by the observation and media APIs from M2.3 and M2.4.
- M3.2 adaptive habitat answer validation is implemented, locally verified, committed, and pushed.
- M3.3 Sighting Intelligence Card API is implemented, locally verified, committed, and pushed.
- M3.4 My Sightings API is implemented, locally verified, committed, and pushed.
- M3.5 Local Ecosystem Region API is implemented and locally verified with `make check` passing 81 tests.
- M4.1 Identification Provider Interface is implemented and locally verified with `make check` passing 86 tests.
- M4.2 Identify From Media endpoint is implemented with AI-suggested verification status updates and locally verified with `make check` passing 90 tests.
- M4.3 Taxonomy normalization service is implemented and locally verified with `make check` passing 94 tests.
- M4.4 MVP species seed data is implemented and locally verified with `make check` passing 97 tests. Alembic head is `0011`.
- M4 is complete against the current local verification gates.
- Next step: begin M5.1 Environmental enrichment provider interface.
