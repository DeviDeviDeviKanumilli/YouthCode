# SproutGo — Build Milestones

Full-stack build order. The baseline's `design.md` §16 sequences the **UI** phases; this maps
the **end-to-end** build (DB + backend + app) to the 15 MVP completion criteria in SPEC §8,
so each milestone is independently demoable.

> Cross-refs: criteria from SPEC §8; UI phases from design.md §16; structure from
> [REPO_STRUCTURE](./REPO_STRUCTURE.md).

## M0 — Foundation
**Goal:** a coherent shell with auth and a live DB before any feature work.
- Scaffold monorepo (apps/mobile, apps/api, packages/db, packages/shared).
- Generate `schema.prisma` from [DATA_MODEL](./DATA_MODEL.md); first migration on Supabase.
- Supabase Auth signup/login (13+ gate); `Profile` creation; JWT verify in backend.
- Custom EAS dev build working on iOS + Android simulators/devices.
- Bottom-tab navigation + theme tokens from design.md.
- **Demo:** sign up, log in, see empty tabbed app on both platforms.
- **Criteria covered:** #1.

## M1 — Core discovery loop (highest priority)
**Goal:** the capture→AI→PlantDex loop SPEC §17 calls the must-be-polished path.
- Camera + photo preview screens.
- Upload to Supabase Storage → `imagePath`.
- `POST /observations` pipeline: `PlantIdentifier` (OpenAI), Library match / 0.85 auto-create
  / UNCERTAIN branch, points award, PlantDex upsert.
- Identification Result + First Discovery modal.
- Seed the Library first (see [LIBRARY_SEED](./LIBRARY_SEED.md)) so matching has data.
- **Demo:** photograph a plant → get an ID + points → see it unlock in PlantDex.
- **Criteria covered:** #3, #4, #5, #6, #7, #8, #9, #10 (PlantDex side).

## M2 — Map & geolocation
**Goal:** discoveries appear on the stylized exploration map.
- Mapbox via `@rnmapbox/maps` (custom dev build), nature styling, centered avatar.
- GPS tracking + permission flow; write lat/long on observations.
- `GET /observations?bbox=` bounding-box query; rarity markers + bottom sheet.
- Location-denied fallback (identify still works, no map post).
- **Demo:** walk around, see your + nearby discoveries as markers.
- **Criteria covered:** #2, plus geotag half of #7.

## M3 — Library & PlantDex screens
**Goal:** discovery feels collectible and educational.
- PlantDex grid (badges, locked/discovered states), progress + stats.
- Library search/filter (FTS + facet indexes), Plant Detail screen.
- **Demo:** browse full Library, filter, open a plant, see personal PlantDex progress.
- **Criteria covered:** #10 (Library side).

## M4 — Social layer
**Goal:** community without disrupting the core loop.
- Posts (from observations), feed (global/friends/forum scopes), likes, comments.
- Friends: search, requests, accept/reject, friends list; friendship-gated visibility.
- Report + admin delete (moderation MVP).
- **Demo:** post a discovery, like/comment, add a friend, use a forum category.
- **Criteria covered:** #11, #12, #13, #14.

## M5 — Plant chat
**Goal:** the differentiating AI persona, after plant data screens are stable.
- `POST /chat/:plantId` (PlantDex-gated), grounded persona prompt, chat UI with suggested
  questions.
- History persisted or session-only per OPEN_QUESTIONS #5.
- **Demo:** open a discovered plant, chat with it in character.
- **Criteria covered:** #15.

## Sequencing notes

- **M1 before M2** deliberately: the discovery loop is the product's spine and must be
  polished before map richness (SPEC §17).
- The Library **seed must run before M1** can match anything.
- Leaderboard/quests are post-MVP; quota/points (M1) ship with the loop.
- Each milestone ends with the manual device checklist in [TESTING](./TESTING.md) for
  camera/GPS/map paths that can't be unit-tested.
