# SproutGo — Data Model

Concrete schema for the MVP. This is the direct source for `schema.prisma`. The baseline
SPEC named these models; this doc defines their fields, types, relations, enums, and
indexes. Backend is Prisma + Supabase Postgres; `Profile.id` mirrors Supabase
`auth.users.id`.

> Cross-refs: enums here are reused in [API_CONTRACT](./API_CONTRACT.md) and
> [POINTS_AND_RARITY](./POINTS_AND_RARITY.md). Privacy enforcement is detailed in
> [SECURITY_AND_PRIVACY](./SECURITY_AND_PRIVACY.md).

## Enums

| Enum | Values |
|------|--------|
| `Rarity` | `COMMON`, `UNCOMMON`, `RARE`, `LEGENDARY` |
| `NativeStatus` | `NATIVE`, `INTRODUCED`, `INVASIVE`, `UNKNOWN` |
| `Privacy` | `PUBLIC`, `FRIENDS`, `PRIVATE` |
| `FriendStatus` | `PENDING`, `ACCEPTED`, `REJECTED`, `BLOCKED` |
| `IdStatus` | `PENDING`, `MATCHED`, `UNCERTAIN` |
| `PlantType` | `TREE`, `FLOWER`, `SHRUB`, `FERN`, `GRASS`, `OTHER` |
| `IdSource` | `OPENAI`, `PLANTID`, `PLANTNET`, `SEED`, `MANUAL` |

## Models

### Profile
Mirrors Supabase auth user. `id` == `auth.users.id` (no separate PK).

| Field | Type | Null | Notes |
|-------|------|------|-------|
| id | uuid (PK) | no | == auth.users.id |
| username | string unique | no | |
| avatarUrl | string | yes | Supabase Storage path |
| bio | string | yes | |
| totalPoints | int | no | default 0; denormalized for leaderboard |
| isAdmin | bool | no | default false; for moderation |
| createdAt | datetime | no | |

Relations: observations[], plantDexEntries[], posts[], likes[], comments[], chatMessages[],
sentRequests[], receivedRequests[].

### Plant (global Library)
| Field | Type | Null | Notes |
|-------|------|------|-------|
| id | uuid (PK) | no | |
| scientificName | string unique | no | primary match key for AI results |
| commonName | string | yes | |
| family | string | yes | |
| genus | string | yes | |
| type | PlantType | no | default OTHER |
| description | text | yes | |
| habitat | text | yes | |
| nativeStatus | NativeStatus | no | default UNKNOWN |
| rarity | Rarity | no | default COMMON |
| imageUrl | string | yes | representative image |
| source | IdSource | no | SEED for imported; OPENAI for AI-created |
| confidence | float | yes | set when AI auto-created the entry |
| createdAt | datetime | no | |

Indexes: `scientificName` (unique), `commonName`, `type`, `rarity`, `nativeStatus`.
Full-text search on (commonName, scientificName, description) — see LIBRARY_SEED.

### Observation (one discovery event)
| Field | Type | Null | Notes |
|-------|------|------|-------|
| id | uuid (PK) | no | |
| userId | uuid (FK→Profile) | no | |
| plantId | uuid (FK→Plant) | yes | null while PENDING |
| imagePath | string | no | Supabase Storage path |
| latitude | float | yes | null if location denied |
| longitude | float | yes | |
| confidence | float | yes | AI confidence for this obs |
| idStatus | IdStatus | no | default PENDING |
| privacy | Privacy | no | default PUBLIC |
| pointsAwarded | int | no | default 0 |
| createdAt | datetime | no | |

Indexes: `(userId)`, `(plantId)`, `(latitude, longitude)` for bounding-box queries,
`(createdAt)`.

### PlantDexEntry (unique species per user)
| Field | Type | Null | Notes |
|-------|------|------|-------|
| id | uuid (PK) | no | |
| userId | uuid (FK→Profile) | no | |
| plantId | uuid (FK→Plant) | no | |
| firstDiscoveredAt | datetime | no | |
| firstObservationId | uuid (FK→Observation) | yes | |
| timesObserved | int | no | default 1 |

Index: **unique `(userId, plantId)`** — enforces one PlantDex entry per species per user.

### Post (social feed / forum)
| Field | Type | Null | Notes |
|-------|------|------|-------|
| id | uuid (PK) | no | |
| userId | uuid (FK→Profile) | no | |
| observationId | uuid (FK→Observation) | yes | null for text-only forum posts |
| plantId | uuid (FK→Plant) | yes | |
| imagePath | string | yes | |
| title | string | yes | forum posts use title; feed posts may omit |
| caption | text | yes | |
| category | string | yes | forum category; null for feed posts |
| generalLocation | string | yes | coarse, not exact GPS |
| privacy | Privacy | no | default PUBLIC |
| likeCount | int | no | default 0; denormalized |
| commentCount | int | no | default 0; denormalized |
| createdAt | datetime | no | |

Indexes: `(userId)`, `(category)`, `(createdAt)`.

### Like (one per user per post)
| Field | Type | Null | Notes |
|-------|------|------|-------|
| id | uuid (PK) | no | |
| userId | uuid (FK→Profile) | no | |
| postId | uuid (FK→Post) | no | |
| createdAt | datetime | no | |

Index: **unique `(userId, postId)`** — prevents double-liking.

### Comment
| Field | Type | Null | Notes |
|-------|------|------|-------|
| id | uuid (PK) | no | |
| postId | uuid (FK→Post) | no | |
| userId | uuid (FK→Profile) | no | |
| body | text | no | |
| createdAt | datetime | no | |

Index: `(postId, createdAt)`.

### FriendRequest
| Field | Type | Null | Notes |
|-------|------|------|-------|
| id | uuid (PK) | no | |
| senderId | uuid (FK→Profile) | no | |
| receiverId | uuid (FK→Profile) | no | |
| status | FriendStatus | no | default PENDING |
| createdAt | datetime | no | |
| respondedAt | datetime | yes | |

Index: **unique `(senderId, receiverId)`** — one outstanding request per direction.

### Friendship
Materialized accepted relationship for fast lookups. Store one row per pair with ordered
ids (`userAId` < `userBId`) to avoid duplicates.

| Field | Type | Null | Notes |
|-------|------|------|-------|
| id | uuid (PK) | no | |
| userAId | uuid (FK→Profile) | no | lower id |
| userBId | uuid (FK→Profile) | no | higher id |
| createdAt | datetime | no | |

Index: **unique `(userAId, userBId)`**.

### ChatMessage (plant chat history)
Persisted only if OPEN_QUESTIONS #5 resolves to "persist". Otherwise session-only and this
model is dropped.

| Field | Type | Null | Notes |
|-------|------|------|-------|
| id | uuid (PK) | no | |
| userId | uuid (FK→Profile) | no | |
| plantId | uuid (FK→Plant) | no | |
| userMessage | text | no | |
| aiResponse | text | no | |
| createdAt | datetime | no | |

Index: `(userId, plantId, createdAt)`.

## Geospatial query note

For the MVP, store `latitude`/`longitude` as plain floats and query nearby observations with
a **bounding-box filter** (`lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?`) computed from the
map viewport, then refine by distance in the API layer. This avoids the PostGIS setup cost
and is sufficient at MVP scale. If/when observation density or radius-accuracy demands it,
enable the Supabase **PostGIS** extension and switch to a `geography(Point)` column with a
GiST index and `ST_DWithin` queries. Keep the query behind a single backend function so the
swap is localized.

## Notes for schema.prisma

- `Profile.id` has no `@default` — it is set to the Supabase auth user id on signup.
- Denormalized counters (`totalPoints`, `likeCount`, `commentCount`, `timesObserved`) are
  updated transactionally in the same API call that creates the underlying row.
- All `userId` FKs are the join point for RLS / API auth checks
  (see [SECURITY_AND_PRIVACY](./SECURITY_AND_PRIVACY.md)).
