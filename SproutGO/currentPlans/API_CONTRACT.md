# SproutGo — API Contract

Endpoint catalog for the Vercel backend (Next.js API routes / Node). The mobile app never
talks to Prisma or external services directly — it calls these routes, which hold all
secrets and enforce auth.

> Cross-refs: payload shapes use enums from [DATA_MODEL](./DATA_MODEL.md); scoring fields
> come from [POINTS_AND_RARITY](./POINTS_AND_RARITY.md); auth rules are detailed in
> [SECURITY_AND_PRIVACY](./SECURITY_AND_PRIVACY.md).

## Conventions

- **Auth:** the app sends the Supabase session JWT as `Authorization: Bearer <token>`.
  Every route marked **Auth: yes** verifies the token and resolves the caller's `userId`
  before any read/write. Writes always use the authenticated id — never a client-supplied
  `userId`.
- **Base path:** `/api/v1`.
- **Errors:** JSON `{ "error": { "code": string, "message": string } }` with standard HTTP
  status (400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict,
  429 quota, 500 server).
- **IDs:** all uuids. Timestamps ISO 8601 UTC.

## Auth / profile

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| POST | `/profile` | yes | `{ username, avatarUrl?, bio? }` | `Profile` | 409 username taken |
| GET | `/profile/me` | yes | — | `Profile` + stats | 401 |
| PATCH | `/profile/me` | yes | `{ username?, avatarUrl?, bio? }` | `Profile` | 403, 409 |
| GET | `/profile/:id` | yes | — | public `Profile` view | 404 |

Signup/login themselves are handled by the Supabase client SDK in the app; the backend only
manages the `Profile` row keyed to the auth user id.

## Observations (the core identify flow)

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| POST | `/observations` | yes | `{ imagePath, latitude?, longitude?, privacy? }` | `ObservationResult` | 400, 429 quota |
| GET | `/observations/:id` | yes | — | `Observation` | 403, 404 |
| GET | `/observations?bbox=minLng,minLat,maxLng,maxLat` | yes | — | `Observation[]` (privacy-filtered) | 400 |
| PATCH | `/observations/:id` | yes | `{ privacy }` | `Observation` | 403, 404 |

**`POST /observations` server pipeline** (see [AI_INTEGRATION](./AI_INTEGRATION.md) and
[POINTS_AND_RARITY](./POINTS_AND_RARITY.md)):
1. Verify JWT → `userId`. Validate `imagePath` belongs to the caller's storage prefix.
2. Enforce daily same-species quota (deferred until species known → re-checked post-ID).
3. Create `Observation` (idStatus `PENDING`).
4. Call `PlantIdentifier.identify(imagePath)` → `{ scientificName, commonName, family, confidence }`.
5. Match `Plant` by `scientificName`. If found → link (`MATCHED`). If not found and
   confidence ≥ 0.85 → create `Plant` (`source=OPENAI`), link (`MATCHED`). If confidence
   < 0.85 → leave `plantId` null-or-tentative, set `UNCERTAIN`.
6. Upsert `PlantDexEntry`; compute first-discovery vs. duplicate; award points; bump
   `Profile.totalPoints` and `timesObserved` transactionally.
7. Return `ObservationResult`: the observation, resolved plant (if any), `confidence`,
   `isFirstDiscovery`, `pointsAwarded`, `idStatus`.

`ObservationResult` is the payload the **Identification Result** screen renders.

## PlantDex / Library

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/plantdex/me` | yes | — | `{ entries: PlantDexEntry[], stats }` | 401 |
| GET | `/plantdex/:userId` | yes | — | public PlantDex (friend-visibility) | 403 |
| GET | `/library?q=&type=&rarity=&native=&sort=` | yes | — | `Plant[]` (paginated) | 400 |
| GET | `/library/:plantId` | yes | — | `Plant` + community photos + map sightings | 404 |

`stats` = `{ speciesDiscovered, photosSubmitted, rareFound, totalPoints, completionPct }`.

## Social — posts, likes, comments

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| POST | `/posts` | yes | `{ observationId?, plantId?, imagePath?, title?, caption?, category?, privacy }` | `Post` | 400 |
| GET | `/posts?scope=feed\|friends\|forum&category=` | yes | — | `Post[]` (paginated) | 400 |
| GET | `/posts/:id` | yes | — | `Post` + comments | 404 |
| DELETE | `/posts/:id` | yes | — | `204` | 403 (owner/admin only) |
| POST | `/posts/:id/like` | yes | — | `{ liked: true, likeCount }` | 409 already |
| DELETE | `/posts/:id/like` | yes | — | `{ liked: false, likeCount }` | 404 |
| POST | `/posts/:id/comments` | yes | `{ body }` | `Comment` | 400 |
| POST | `/posts/:id/report` | yes | `{ reason }` | `204` | 404 |

> **M4 notes (implemented):** `report` persists a `Report` row (moderation trail) rather than
> being a logged no-op; `DELETE /posts/:id` is gated to the owner OR `Profile.isAdmin`.
> **Forums are not a separate model** — a forum "thread" is a `Post` with a `category` from the
> fixed `FORUM_CATEGORIES` list (`packages/shared`); browse via `GET /posts?scope=forum&category=`.
> Post images are returned as short-lived signed URLs (the `observations` bucket is private).
> `GET /profile/:id` returns the full social profile (stats + friendship status + recent
> discoveries + visible posts) and works for self (`friendship: "self"`). Friend **suggestions**
> were dropped for MVP (search + requests only).

## Friends

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/users/search?q=` | yes | — | `Profile[]` (public) | 400 |
| POST | `/friends/requests` | yes | `{ receiverId }` | `FriendRequest` | 409 dup, 400 self |
| GET | `/friends/requests?box=incoming\|outgoing` | yes | — | `FriendRequest[]` | — |
| PATCH | `/friends/requests/:id` | yes | `{ action: accept\|reject }` | `FriendRequest` | 403, 404 |
| GET | `/friends` | yes | — | `Profile[]` | — |
| DELETE | `/friends/:userId` | yes | — | `204` | 404 |

Accepting a request creates the `Friendship` row (ordered ids) in the same transaction.

## Plant chat

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| POST | `/chat/:plantId` | yes | `{ message, history? }` | `{ reply }` | 403 not in PlantDex, 404, 429 |

Server loads the `Plant` Library entry, builds the grounded persona prompt (personality by
rarity/type), calls OpenAI, returns the reply. Persists a `ChatMessage` only if
OPEN_QUESTIONS #5 resolves to "persist"; otherwise the app passes recent `history` back each
turn. Gate: caller must have a `PlantDexEntry` for `plantId` (chat unlocks on discovery).

## Leaderboard

Scope pending OPEN_QUESTIONS #3.

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/leaderboard?scope=global\|friends` | yes | — | `{ rank, entries: { userId, username, totalPoints }[] }` |
