## EcoSentinel Brief Project Spec

This is the compact product spec. For **live platform progress and runbooks**, read `HANDOFF.md`. For agent build behavior, architecture boundaries, wording rules, and milestone gates, read `AGENTS.md`. For backend implementation tasks, read `Shared_Backend_plan.md`.

**Project name:** EcoSentinel
**Category:** AI ecological intelligence platform
**Primary MVP focus:** Invasive species and native biodiversity stress
**MVP geography:** New York, New Jersey, Pennsylvania
**Core idea:** EcoSentinel turns local nature sightings into ecological signals that can be understood by the public and used by researchers. 

EcoSentinel is not just a “identify this plant” app. It is a two-sided platform that helps everyday users report and understand ecological change, while giving researchers structured, reviewable, and exportable ecological data.

## Product Purpose

Communities often notice ecological change before experts can fully observe it. A student might see an unusual insect, a resident might notice an invasive vine spreading, or a park volunteer might see fewer native plants. These observations are usually scattered, noisy, biased, and hard to use scientifically.

EcoSentinel solves this by converting simple field observations into structured ecological intelligence.

The product takes a user sighting and turns it into:

```txt
Photo/location upload
→ possible species identification
→ ecological context
→ signal priority score
→ map visualization
→ verification queue
→ researcher-ready export
```

## Two Main Experiences

### 1. Consumer Experience

Built as an **Expo + React Native mobile app**.

Primary users:

```txt
Students
Residents
Hikers
Gardeners
Teachers
Community volunteers
```

Main purpose:

```txt
Help users understand local ecological change and contribute useful sightings.
```

Core consumer features:

```txt
Local Ecosystem Home
Photo-based sighting upload
GPS/location confirmation
Adaptive habitat questions
Sighting Intelligence Card
Simplified Forecast Map
AI explanation panel
My Sightings history
```

The consumer app should be mobile-first because users will often be outdoors when submitting sightings.

The Sighting Intelligence Card should explain:

```txt
Possible species
Confidence level
Similar species warning
Native/invasive/unknown status
Nearby known records
Habitat match
Waterway/road/trail pathway context
Sampling value
Verification status
Why the sighting may matter
```

Important rule: the consumer experience must avoid overclaiming. It should say “possible,” “likely,” “needs verification,” and “high-value signal,” not “confirmed invasion” or “guaranteed prediction.”

## 2. Research Experience

Built as an independent **web dashboard** that connects directly to the shared backend.

Primary users:

```txt
Researchers
Ecologists
Conservation groups
Park managers
Expert reviewers
Teachers running field surveys
```

Main purpose:

```txt
Help serious users verify, analyze, filter, and export ecological observation data.
```

Core research features:

```txt
Research Workbench
Verification Queue
Advanced Forecast Map
Observation table
Sampling Gap Layer
Signal priority filters
Species/region/date filters
Bias diagnostics
Export Center
Research AI Analyst
```

The research dashboard should be desktop-first because it involves maps, tables, filters, exports, and layered ecological analysis.

Research users should be able to:

```txt
Review high-priority sightings
Verify or reject observations
See sampling-bias warnings
Inspect environmental context
Filter by species, region, date, and signal score
Export CSV or GeoJSON
Identify under-sampled areas
Prioritize field surveys
```

## Shared Backend

The backend is the core intelligence layer. Both the mobile app and research dashboard connect to it independently.

```txt
Expo Consumer App  ─────┐
                        │
                        ▼
                 Shared Backend API
                        ▲
                        │
Research Dashboard ─────┘
```

The backend should own:

```txt
Observation storage
Media/photo metadata
Species candidate identification
Taxonomic normalization
Environmental enrichment
Ecological Signal Priority scoring
Forecast map layer generation
Sampling gap analysis
Verification workflow
Research exports
AI assistant context
Privacy and provenance rules
```

The frontends should not contain the main ecological logic. They should call backend APIs.

## Recommended Tech Stack

### Consumer Mobile App

```txt
Expo
React Native
TypeScript
Expo Router
React Query
NativeWind or Tamagui
expo-camera or expo-image-picker
expo-location
react-native-maps or Mapbox
```

### Research Web Dashboard

```txt
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Mapbox GL
deck.gl
TanStack Table
React Query
Recharts
```

### Shared Backend

```txt
FastAPI
Python
PostgreSQL
PostGIS
SQLAlchemy or SQLModel
Alembic
Redis
S3-compatible object storage
Pytest
Pydantic
```

### AI and Data Services

```txt
Vision model for possible species identification
LLM for explanations and research summaries
PostGIS for spatial queries
Rules-based scoring engine for MVP
Cached tri-state ecological data for reliable demo
```

## Core Data Pipeline

EcoSentinel’s main backend pipeline:

```txt
Observation
→ Identification
→ Taxonomic normalization
→ Environmental enrichment
→ Signal scoring
→ Forecast visualization
→ Verification
→ Research export
```

Each uploaded observation should become a structured record with:

```txt
Observation ID
User/source
Timestamp
Latitude/longitude
Coordinate uncertainty
Photo/media evidence
Habitat answers
Possible species
Scientific name
Confidence level
Verification status
Land-cover context
Waterway distance
Road/trail distance
Park proximity
Nearby known records
Sampling-density score
Signal priority score
Model version
Data provenance
Export permissions
```

## Main Feature: Forecast Map

The Forecast Map is the main visual feature.

It should show:

```txt
User sightings
Known records
Verified records
AI-suggested records
Possible spread corridors
Waterways
Roads/trails
Parks
Sampling gaps
Native biodiversity stress signals
Time-based changes
```

For consumers, the map should be simplified.
For researchers, the map can include advanced layers and filters.

## Main Model Output: Ecological Signal Priority

The core score should be called **Ecological Signal Priority**, not “danger score.”

It should rank observations by ecological usefulness and verification need.

Score components:

```txt
Identity confidence
Local novelty
Habitat match
Spread-pathway risk
Nearby verified record context
Ecological sensitivity
Sampling-gap value
Temporal clustering
Uncertainty penalty
```

Labels:

```txt
Low signal
Moderate signal
High-value verification candidate
Priority ecological signal
Insufficient evidence
```

## MVP Scope

The MVP should prove one complete vertical slice:

```txt
1. A user uploads a sighting from the mobile app.
2. The backend stores the observation and image metadata.
3. The system suggests a possible species.
4. The system enriches the sighting with local ecological context.
5. The system calculates an Ecological Signal Priority score.
6. The mobile app shows a Sighting Intelligence Card.
7. The sighting appears on the Forecast Map.
8. The research dashboard receives it in a verification queue.
9. A researcher verifies or rejects the sighting.
10. The researcher exports the record as CSV or GeoJSON.
```

## MVP Demo Species

Use a small, reliable set of demo species:

```txt
Japanese knotweed
Spotted lanternfly
Emerald ash borer
Water chestnut
Purple loosestrife
```

## Product Differentiation

EcoSentinel is not:

```txt
A basic species-ID app
A generic citizen-science upload app
A static invasive-species database
A simple map of pins
```

EcoSentinel is:

```txt
A public ecological learning tool
A community ecological sensor network
A geospatial intelligence platform
A researcher data-prep pipeline
A forecasting interface for possible ecological change
```

## Build Principle

The safest architecture is:

```txt
Mobile app = collect and explain sightings
Research dashboard = verify, analyze, and export data
Backend = ecological intelligence engine
```

The backend should be API-first, rigorously tested, and independent of both frontends.
