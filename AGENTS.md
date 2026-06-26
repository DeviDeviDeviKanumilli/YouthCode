# EcoSentinel Agent Guide

This file is the working memory for agents building EcoSentinel in this workspace. Use it before making architecture, product, API, or wording decisions.

## Product Identity

EcoSentinel is an AI ecological intelligence platform. It is not a basic species identification app, a generic citizen-science feed, or a static map of pins.

The product turns local nature sightings into structured, uncertainty-aware ecological signals that can be understood by the public and used by researchers.

Core pitch:

```txt
EcoSentinel turns local nature sightings into ecological forecasts.
```

Judge-facing demo statement:

```txt
Today, a student can upload one photo. EcoSentinel identifies what it might be, checks known records, reads the surrounding environment, detects whether the sighting is ecologically meaningful, maps possible spread corridors, and stores the record in a format researchers can actually use.
```

## MVP Focus

- Geography: New York, New Jersey, Pennsylvania.
- Primary use case: invasive species plus native biodiversity stress.
- Architecture should remain region-agnostic for future U.S. expansion.
- The MVP should prove one complete vertical slice, not every future ecological model.

The MVP is complete when:

1. A user can upload a sighting.
2. The backend stores the observation and media metadata.
3. The system suggests a possible species with uncertainty.
4. The system enriches the sighting with ecological context.
5. The system computes Ecological Signal Priority.
6. The mobile app can show a Sighting Intelligence Card.
7. The sighting appears on a Forecast Map.
8. The research dashboard receives it in a verification queue.
9. A reviewer can verify, reject, or request more evidence.
10. A researcher can export CSV and GeoJSON.

## Product Boundaries

EcoSentinel has two frontend experiences and one shared intelligence backend.

Consumer app:

- Built separately with Expo, React Native, and TypeScript.
- Mobile-first for outdoor sightings.
- Users include students, residents, hikers, gardeners, teachers, and community volunteers.
- Main actions: discover local signals, upload sightings, answer habitat questions, read the Sighting Intelligence Card, view a simplified Forecast Map, and ask plain-language ecological questions.

Research dashboard:

- Built separately as a desktop-first web dashboard.
- Connects directly to the shared backend, independently from the mobile app.
- Users include researchers, ecologists, conservation groups, park managers, teachers running surveys, and expert reviewers.
- Main actions: verify records, filter observations, inspect map layers, diagnose sampling gaps, review signal priority, and export research-ready data.

Shared backend:

- Owns all ecological intelligence.
- Must be API-first.
- Frontends should not implement core ecological logic.
- Core logic belongs in typed services, not route handlers.

## Core Pipeline

Every important feature should map back to this pipeline:

```txt
Observation
-> Identification
-> Taxonomic normalization
-> Environmental enrichment
-> Signal scoring
-> Forecast visualization
-> Verification
-> Research export
```

Each observation should eventually become a model-ready ecological record with:

- observation ID, user/source, timestamp, location, coordinate uncertainty
- media evidence and habitat answers
- possible species, scientific name, confidence, similar-species warnings
- verification status and reviewer notes where relevant
- land cover, canopy, impervious surface, NDVI, climate context where available
- distance to water, roads, trails, parks, and nearby records
- sampling-density or sampling-gap context
- Ecological Signal Priority score, label, reasons, and model version
- provenance, privacy level, export permissions, and data sources used

## Required Language Rules

Uncertainty is a product requirement, not polish.

Use:

- possible
- likely
- needs verification
- high-value signal
- high-value verification candidate
- potential spread corridor
- insufficient evidence
- possible invasive concern

Avoid:

- confirmed invasion
- guaranteed prediction
- danger score
- definitely dangerous
- will spread here
- true population size from casual sightings alone

Only use confirmed language when verification status supports it, such as `expert_verified` or `field_confirmed`.

The main score is called **Ecological Signal Priority**, never "danger score."

## Ecological Signal Priority

Purpose: rank observations by ecological usefulness and verification need.

Formula concept:

```txt
0.20 identity confidence
+ 0.15 local novelty
+ 0.15 habitat match
+ 0.15 spread pathway risk
+ 0.10 nearby verified record context
+ 0.10 ecological sensitivity
+ 0.10 sampling gap value
+ 0.05 temporal clustering
- uncertainty penalty
```

Labels:

- 0-25: Low signal
- 26-50: Moderate signal
- 51-75: High-value verification candidate
- 76-100: Priority ecological signal
- Special case: Insufficient evidence

Scores must be explainable. Store machine-readable reason codes and user-facing explanations.

## Main Product Features

Forecast Map:

- The central visual metaphor and main demo feature.
- Public mode should be simple and readable.
- Research mode can expose advanced filters, layers, covariates, and export boundaries.
- Show possible spread corridors, not exact predictions.

Sighting Intelligence Card:

- Explains the meaning of a single upload.
- Include possible species, confidence, similar-species warning, local status, nearby records, habitat match, pathway context, sampling value, verification status, signal priority, uncertainty notice, and data sources.

Sampling Gap Layer:

- Exposes where data is weak, biased, or missing.
- Prevents treating "no observations" as true absence.
- Labels include well sampled, under-sampled, road/trail-biased, park-biased, high-risk under-sampled, needs structured survey, and likely false absence.

Research Workbench:

- Verification queue, observation table, advanced map, filters, bias diagnostics, covariate explorer, export center, model-card view, provenance log, and AI research analyst.

AI Ecological Analyst:

- Must answer from grounded platform context.
- Must include data sources used, confidence, uncertainty, verification status, and model version when relevant.
- Must say "insufficient evidence" when the evidence is weak.

## Data Sources To Design Around

Biodiversity:

- GBIF for occurrences, species lookup, taxonomic normalization, and historical comparison.
- iNaturalist for community observations and recent context; avoid inefficient large-scale scraping.
- EDDMapS and iMapInvasives-style systems for invasive-species workflow inspiration and verified records where allowed.
- USGS NAS for nonindigenous aquatic species.
- NY/NJ/PA invasive systems for tri-state relevance.

Environmental:

- USGS NLCD for land cover, tree canopy, and impervious surface.
- NASA NDVI for vegetation greenness.
- NOAA Climate Data Online for weather and climate context.
- USGS hydrography / 3DHP for waterways.
- OpenStreetMap or similar for roads, trails, parks, schools, and human movement proxies, with licensing tracked.

For the MVP, prefer seeded/cached tri-state data where live APIs would make the demo unreliable.

## Backend Architecture Preferences

Recommended stack:

- Python 3.12+
- FastAPI
- Pydantic v2 and pydantic-settings
- PostgreSQL with PostGIS
- SQLAlchemy 2.0 or SQLModel
- Alembic
- Redis plus RQ, Celery, or Arq for background jobs
- S3-compatible storage interface with local development adapter
- Pytest, pytest-asyncio, httpx
- Ruff
- Mypy or Pyright
- Docker Compose

Suggested repo shape:

```txt
apps/
  api/
    app/
      main.py
      core/
      db/
      models/
      schemas/
      api/
      services/
      repositories/
      jobs/
      tests/
    alembic/
    pyproject.toml
    Dockerfile
```

Implementation rules:

- Every endpoint has Pydantic request and response schemas.
- Every database change has an Alembic migration.
- Every public endpoint has integration tests.
- Every service has unit tests.
- Keep route handlers thin.
- Put ecological logic in services.
- Put reusable database queries in repositories when useful.
- Use structured logging and clear error responses.
- Use OpenAPI tags.
- Do not hardcode secrets.
- Document environment variables in `.env.example`.
- Do not let AI generate unsupported ecological facts.

## Core Domain Modules

- auth
- users
- observations
- media
- species
- identification
- taxonomy
- enrichment
- scoring
- forecast
- sampling
- verification
- research
- export
- assistant
- provenance
- privacy
- jobs

## MVP Demo Species

Seed these for deterministic demos:

- Japanese knotweed
- Spotted lanternfly
- Emerald ash borer
- Water chestnut
- Purple loosestrife

## Milestone Order

Use `Shared_Backend_plan.md` as the detailed checklist. Do not skip acceptance gates.

1. M1 Project Foundation
2. M2 Core Data Model
3. M3 Observation API and Consumer Backend Flow
4. M4 Species Identification and Taxonomic Normalization
5. M5 Environmental Enrichment
6. M6 Ecological Signal Priority Scoring
7. M7 Forecast Layers and Map APIs
8. M8 Sampling Gap Layer
9. M9 Verification and Research Workbench APIs
10. M10 Research Export System
11. M11 Assistant Context API
12. M12 Authentication, Authorization, and Security Hardening
13. M13 Background Jobs and Pipeline Orchestration
14. M14 Demo Seed Data and Reliability
15. M15 Final Quality Gate

## Quality Gates

Before moving to the next milestone:

- `pytest` passes.
- `ruff check` passes.
- type checking passes or documented exceptions exist.
- migrations upgrade cleanly.
- affected endpoints have integration coverage.
- ecological wording follows the uncertainty rules.
- privacy/provenance behavior is explicit where location or exports are involved.

## Strategic Product Notes

- Open the product with a map-first experience and a floating upload action.
- The product should feel clean, scientific, and useful, not cartoonish, alarmist, or gamified.
- The research value is not volume alone. It is structured observations, environmental covariates, verification levels, sampling effort, bias diagnostics, and exportable model-ready data.
- The strongest differentiator is the combination of AI-assisted identification, ecological context, Forecast Map, Sampling Gap Layer, verification workflow, and researcher-ready exports.
