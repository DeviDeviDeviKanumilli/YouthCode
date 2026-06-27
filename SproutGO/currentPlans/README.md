# currentPlans — Maintenance Guide

This folder holds the **living, authoritative plans** for SproutGo. If you want to know what the project is supposed to do *right now*, read the documents here — not `InitalPlans/`.

## Folder roles

| Folder | Status | Rule |
| --- | --- | --- |
| `InitalPlans/` | Frozen baseline | **Do not edit.** Read-only historical record of the original idea, spec, design, and features. |
| `currentPlans/` | Active / living | Edit freely. This is the single source of truth going forward. |

`InitalPlans/` is the snapshot of where the project started. It is kept for reference and to show how thinking evolved. Never update it — if something there is now wrong or outdated, capture the correction here in `currentPlans/` instead.

## What lives here

The current plans mirror the original document set, kept up to date as decisions change:

- `InitialIdea.md` — the product vision and elevator pitch
- `SPEC.md` — product features, data models, tech stack, MVP criteria
- `design.md` — visual direction and screen-level UI specs
- `features.md` — feature breakdown and status

(Copy a document over from `InitalPlans/` the first time you need to revise it, then maintain the copy here.)

## Gap docs (new)

These are **net-new build-ready artifacts** — not migrated baselines. They fill the gap
between the `InitalPlans/` vision and what a developer needs to actually start coding
(concrete schema, endpoints, scoring numbers, seed mapping, AI contracts, security policies,
structure, milestones, testing, risks). Read them in this order:

1. [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) — unmade decisions + the 4 locked ones
2. [DATA_MODEL.md](./DATA_MODEL.md) — full schema, enums, indexes (source for `schema.prisma`)
3. [API_CONTRACT.md](./API_CONTRACT.md) — backend endpoint catalog + identify flow
4. [POINTS_AND_RARITY.md](./POINTS_AND_RARITY.md) — concrete scoring rules
5. [LIBRARY_SEED.md](./LIBRARY_SEED.md) — USDA/Wikimedia seeding plan
6. [AI_INTEGRATION.md](./AI_INTEGRATION.md) — OpenAI ID + chat, swappable identifier
7. [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md) — auth, RLS caveat, location privacy
8. [REPO_STRUCTURE.md](./REPO_STRUCTURE.md) — monorepo layout + `.env` checklist
9. [BUILD_MILESTONES.md](./BUILD_MILESTONES.md) — full-stack build order M0–M5
10. [TESTING.md](./TESTING.md) — test strategy + manual device checklist
11. [TECH_RISKS.md](./TECH_RISKS.md) — known gotchas + mitigations

Locked decisions (2026-05-30): gap docs only · iOS+Android via Expo · OpenAI vision for
plant ID (swappable) · 13+ audience. See OPEN_QUESTIONS.md for the rest.
