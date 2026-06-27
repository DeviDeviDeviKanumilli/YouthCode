# SproutGo — Deploy `apps/api` to Vercel (Hobby / free)

Step-by-step for hosting the Next.js backend. The mobile app calls this URL as
`EXPO_PUBLIC_API_BASE_URL`.

> Prerequisite: a Supabase project with Postgres, Auth, and an `observations` Storage bucket.
> Run `npm run db:migrate` from your machine before the API can serve real traffic.

## Vercel Hobby (free) — what you get

Source: [Vercel Hobby plan](https://vercel.com/docs/plans/hobby), [pricing](https://vercel.com/pricing).

| Resource | Hobby limit | Notes for SproutGo |
|----------|-------------|-------------------|
| Price | $0 | No credit card required |
| Function invocations | 1M / month | Fine for dev + small beta |
| Active CPU | ~4 hours / month | Heavy traffic or slow handlers can exhaust this |
| Bandwidth | 100 GB / month | API JSON responses are small |
| Function duration | Up to **60s** default on Hobby (configurable; see dashboard) | `POST /observations` + OpenAI must finish in time |
| Memory | 2 GB / function | Enough for Prisma + OpenAI |
| Commercial use | **Personal / non-commercial only** | Paid product → Pro per [ToS](https://vercel.com/docs/plans/hobby) |

**Not included on Vercel:** Supabase, OpenAI, Mapbox — those have their own free tiers and bills.

**Cannot buy overage on Hobby** — if you hit caps, wait for the monthly reset or upgrade to Pro.

---

## 1. Supabase (do this first)

1. Create a project at [supabase.com](https://supabase.com).
2. **Database** → Settings → Connection string:
   - **Pooler (6543)** → `DATABASE_URL` (runtime on Vercel)
   - **Direct (5432)** → `DIRECT_URL` (migrations on your laptop only)
3. **Project Settings → API**:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role (secret)
   - `SUPABASE_JWT_SECRET` = JWT Secret (under JWT Settings)
4. **Storage** → create bucket `observations` (private; API uses service role).
5. Locally, from repo root:

```bash
cp .env.example .env
# fill DATABASE_URL, DIRECT_URL, Supabase keys
npm install
npm run db:migrate
```

---

## 2. Create the Vercel project

1. Sign in at [vercel.com](https://vercel.com) (GitHub login is easiest).
2. **Add New → Project** → import `DeviDeviDeviKanumilli/SproutGO` (or your fork).
3. **Root Directory** → **Edit** → set to `apps/api`.
4. Framework should auto-detect **Next.js**.
5. **Build settings** (should match `apps/api/vercel.json`):
   - Install: `cd ../.. && npm install`
   - Build: `cd ../.. && npm run build:shared && npm run db:generate && npm run build -w @sproutgo/api`
6. Do **not** deploy yet — add env vars first.

---

## 3. Environment variables (Vercel dashboard)

Project → **Settings → Environment Variables**. Add for **Production** (and Preview if you want PR deploys):

| Name | Where to get it | Sensitive |
|------|-----------------|-----------|
| `DATABASE_URL` | Supabase pooler URL, port **6543**, `?pgbouncer=true&connection_limit=1` | Yes |
| `DIRECT_URL` | Supabase direct URL, port **5432** | Yes (build/migrate only; optional on Vercel if you never migrate in CI) |
| `SUPABASE_URL` | Supabase project URL | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase API → service_role | Yes |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret | Yes |
| `OPENAI_API_KEY` | platform.openai.com | Yes |

Copy from your local `.env`. **Never** commit real values to git.

Optional: omit `OPENAI_API_KEY` only if you accept stub identification (`StubPlantIdentifier` when the key is missing).

---

## 4. Deploy

Click **Deploy**. First build may take a few minutes (monorepo install + Prisma generate).

Production URL will look like:

`https://sproutgo-api-xxx.vercel.app`

(or your custom project name)

### Smoke test

```bash
curl https://YOUR_DEPLOYMENT.vercel.app/api/v1/health
```

Expected: `{"status":"ok","service":"sproutgo-api","version":"v1"}`

Authenticated routes need a Supabase user JWT:

`Authorization: Bearer <access_token>`

---

## 5. Point the mobile app at Vercel

In `.env` (or EAS secrets):

```bash
EXPO_PUBLIC_API_BASE_URL=https://YOUR_DEPLOYMENT.vercel.app
```

No trailing slash. The client appends `/api/v1`.

Rebuild or restart Expo after changing env vars.

---

## 6. CLI deploy (optional)

From repo root:

```bash
npm i -g vercel
cd apps/api
vercel link
vercel env pull   # after setting vars in dashboard
vercel --prod
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails: cannot find `@sproutgo/shared` | Root Directory must be `apps/api`; install must run from monorepo root (see `vercel.json`). |
| Build fails: Prisma client | Ensure `npm run db:generate` is in the build command. |
| `Missing required env var` at runtime | Add all vars in Vercel → redeploy. |
| `too many connections` | `DATABASE_URL` must use pooler **6543**, not direct 5432. |
| 504 on `/observations` | OpenAI slow; Hobby timeout — retry or shorten prompt; consider Pro for longer limits. |
| Mobile can't reach API | Use HTTPS Vercel URL; on a physical phone, not `localhost`. |
| CORS errors | Next.js API routes on same deployment are same-origin for mobile `fetch`; issues are usually wrong base URL or auth. |

---

## Migrations on production

Run from your laptop (recommended), not on every Vercel build:

```bash
npm run db:migrate
# or: npm run migrate:deploy -w @sproutgo/db
```

Use `DIRECT_URL` (5432) for migrations; `DATABASE_URL` (6543) for the running API.

---

## When to upgrade off Hobby

- Commercial / revenue-generating app (Vercel ToS)
- Need >60s function timeouts reliably
- Exceed 1M invocations or 4 CPU-hours / month
- Team features, spend alerts, purchasable overage → **Pro** ($20/mo + usage)

For a student/personal SproutGo MVP, Hobby is usually enough.
