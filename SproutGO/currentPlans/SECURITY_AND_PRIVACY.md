# SproutGo — Security & Privacy

Security and privacy plan for the MVP. Audience is **13+ only**, so there is no COPPA scope
(see bottom). The two highest-stakes items: the Prisma/RLS interaction and GPS location
privacy for rare plants.

> Cross-refs: tables/fields from [DATA_MODEL](./DATA_MODEL.md); auth convention from
> [API_CONTRACT](./API_CONTRACT.md); secret handling from [REPO_STRUCTURE](./REPO_STRUCTURE.md).

## Auth model

- Supabase Auth issues a JWT on login. The mobile app stores it via the Supabase client and
  sends it as `Authorization: Bearer <token>` on every backend call.
- The Vercel backend **verifies the JWT and resolves `userId` before any write**. Writes use
  that authenticated id — a client-supplied `userId` is never trusted.
- `Profile.id` == `auth.users.id`, so the auth identity is the join key for ownership checks.

## ⚠️ Critical: Prisma service role bypasses RLS

The backend connects to Postgres with a **service-role / direct connection**, which
**bypasses Supabase Row Level Security entirely.** RLS policies do **not** protect data
reached through the Prisma client. Therefore:

- **The API layer is the real authorization boundary.** Every route must explicitly scope
  queries to the caller (`where: { userId }`) and check ownership before update/delete.
- RLS is still defined as **defense-in-depth** for any path that uses the user-scoped
  Supabase client (e.g. direct Storage access from the app), but it is not the primary guard
  for Prisma-served data.
- Never expose the service-role key or the direct DB URL to the client.

## RLS policy plan (defense-in-depth)

For tables accessible via the user-scoped client:

| Table | Read | Write |
|-------|------|-------|
| Profile | public fields readable by authenticated users | owner only |
| Observation | owner always; others per `privacy` + friendship | owner only |
| PlantDexEntry | owner; friends if profile shared | owner only |
| Post | per `privacy` (public / friends / owner) | owner; delete by owner or admin |
| Like / Comment | readable with parent post | owner only (one like per user/post) |
| FriendRequest | sender or receiver | sender creates; receiver responds |
| Plant (Library) | all authenticated | admin/seed only |

## Location privacy (SPEC §7.4)

- Each `Observation` has a `privacy` setting (PUBLIC / FRIENDS / PRIVATE).
- **The owner always sees their own exact coordinates.**
- For **rare/sensitive plants** (RARE, LEGENDARY, or INVASIVE-sensitive), public/friend views
  receive **fuzzed coordinates** — snapped to a coarse grid / random offset within a radius —
  never the exact point. Fuzzing radius pending OPEN_QUESTIONS #8 (e.g. ~500 m–1 km).
- Common plants may show approximate public locations.
- Fuzzing happens **server-side** before the response leaves the backend; the exact value is
  never sent to non-owners.

## Secrets

- All secrets are Vercel env vars, never in the app bundle: Supabase service key, direct DB
  URL, OpenAI key, Mapbox token (use a URL-restricted public Mapbox token on the client).
- See the `.env.example` checklist in [REPO_STRUCTURE](./REPO_STRUCTURE.md).

## Moderation (SPEC §7.8)

- `POST /posts/:id/report` lets any user flag content.
- `Profile.isAdmin` users can delete reported posts/comments.
- Ownership rule: users may only edit/delete their own content (enforced in the API layer).
- MVP scope is intentionally minimal — report + admin delete. No automated filtering yet.

## Input & abuse hardening

- Validate all request bodies (e.g. zod) at route boundaries; reject unknown `userId` spoofing.
- Per-user rate limits on AI endpoints (identify, chat) — see [AI_INTEGRATION](./AI_INTEGRATION.md).
- Validate that an uploaded `imagePath` sits under the caller's own Storage prefix before
  creating an observation.

## Audience / COPPA

MVP is **13+ only** — enforced at signup (date-of-birth gate / terms). This keeps COPPA out
of scope. **If under-13 users are ever added**, this expands materially: verifiable parental
consent, stricter/located-disabled handling for minors, tighter moderation, and data-minimization
review. Tracked as a flag, not in MVP scope.
