# EcoSentinel Mobile App Migration Plan

This plan describes how to add the EcoSentinel React Native consumer app to this repository and wire it to the existing FastAPI backend. The visual source of truth is `stitchDesignReference.txt`; the backend contract source of truth is `apps/api/docs/frontend_contract.md`, `apps/api/docs/mobile_integration.md`, and the Watch schemas in `apps/api/app/schemas/watch.py`.

## Goals

- Create a new Expo React Native app under `apps/mobile`.
- Use TypeScript and Expo Router.
- Target the Android emulator first.
- Wire the Watch tab to the existing FastAPI Watch endpoints.
- Keep the backend unchanged unless a small compatibility fix is strictly required.
- Preserve safe ecological language: possible, likely, needs verification, worth checking, high-value signal, and insufficient evidence.

## Current Repo State

- Backend exists under `apps/api`.
- Mobile app now exists under `apps/mobile` and is wired to the backend Watch endpoints.
- `stitchDesignReference.txt` contains the HTML UI reference for Explore, Watch, Sightings, Guide/Profile-style screens, and Report flow screens.
- `mobile-ui` is the working branch and tracks `origin/mobile-ui`.
- Major changes should be committed and pushed to `origin/mobile-ui`.
- `HANDOFF.md` should be updated after each semi-major change.

## Implementation Status

- `apps/mobile` has been scaffolded with Expo Router and TypeScript.
- The Watch tab, Watch detail routes, and Report placeholder are implemented.
- Mobile unit tests pass and TypeScript checks pass with the current codebase.
- Emulator verification notes are recorded in `HANDOFF.md`.

## Environment And Local Wiring

Development target:

- OS: Pop!_OS 22.04 LTS, Ubuntu Jammy based.
- Android SDK path: `/home/chessdroid108/Android/Sdk`.
- AVD name: `Pixel_10_Pro_XL`.
- Emulator binary: `/home/chessdroid108/Android/Sdk/emulator/emulator`.
- ADB binary: `/home/chessdroid108/Android/Sdk/platform-tools/adb`.
- FastAPI runs locally on port `8000`.
- Android emulator reaches the host backend through `http://10.0.2.2:8000`.

Backend startup:

```bash
cd apps/api
source .venv/bin/activate
python -m alembic upgrade head
python -m app.scripts.seed
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Verify Watch endpoint:

```bash
curl "http://127.0.0.1:8000/consumer/watch?lat=40.714&lon=-74.006&radius_km=5"
```

Mobile startup after scaffolding:

```bash
cd apps/mobile
npx expo start --android
```

Physical Android phone development build:

```bash
cd apps/mobile
npm run dev-client
```

Use `eas build -p android --profile development` to produce the installable dev client APK. Set `EXPO_PUBLIC_API_BASE_URL` to your computer's LAN IP when running the packager for a physical phone, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.0.142:8000 npm run dev-client
```

## App Structure

Create:

```txt
apps/mobile/
  app/
    _layout.tsx
    (tabs)/
      _layout.tsx
      index.tsx
      watch.tsx
      report.tsx
      sightings.tsx
      profile.tsx
    watch/
      item/[id].tsx
      place/[id].tsx
  src/
    api/
      client.ts
      watch.ts
    components/
      cards/
      layout/
    theme/
      colors.ts
      spacing.ts
      typography.ts
    types/
      watch.ts
```

Use Expo Router for navigation and keep route names stable:

- `/(tabs)` is the mobile shell.
- `/(tabs)/index` is Explore/Home.
- `/(tabs)/watch` is the primary Watch tab.
- `/(tabs)/report` is the Report placeholder and receives Watch prefill params.
- `/(tabs)/sightings` is the My Sightings placeholder.
- `/(tabs)/profile` is the Profile/Guide placeholder for now.
- `/watch/item/[id]` fetches Watch item detail.
- `/watch/place/[id]` fetches Good Place detail.

## Design Direction

Use `stitchDesignReference.txt` as the design source of truth, adapted to React Native primitives.

Core visual language:

- Dark ecological header backgrounds with warm mist bottom sheets.
- Cream cards (`#FCFAF4`) on mist background (`#F4F1E8`).
- Ink text (`#07110D`) with muted gray secondary text.
- Moss green accents for ecological/watch states.
- Clear blue (`#3B5B9E` or similar) for the central report action.
- Rounded bottom navigation with a raised center report FAB.
- Rounded cards and drawer-like screens, but avoid nested card-on-card layouts.
- Outdoor-friendly, calm, useful, and field-oriented; no marketing hero page.

Primary Watch screen layout:

- Dark header with title `Watch`.
- Region label from backend.
- Updated time from backend.
- Subtle demo-location copy until real location is implemented.
- Warm rounded content sheet.
- `Watched near you` section with backend Watch cards.
- `Good places to check` horizontal card section.
- Loading state.
- Error state with retry.
- Empty state from backend when provided.

## Backend API Integration

Create `src/api/client.ts`:

```ts
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://10.0.2.2:8000";

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GET ${path} failed: ${response.status} ${text}`);
  }
  return response.json() as Promise<T>;
}
```

Create `src/api/watch.ts`:

```ts
import { apiGet } from "./client";
import type {
  GoodPlaceDetail,
  WatchItemDetail,
  WatchScreenResponse,
} from "../types/watch";

export function getWatchScreen(lat: number, lon: number, radiusKm = 5) {
  return apiGet<WatchScreenResponse>(
    `/consumer/watch?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`
  );
}

export function getWatchItemDetail(id: string) {
  return apiGet<WatchItemDetail>(`/consumer/watch/items/${id}`);
}

export function getWatchPlaceDetail(id: string) {
  return apiGet<GoodPlaceDetail>(`/consumer/watch/places/${id}`);
}
```

Use this default location until real location permission is added:

```ts
export const DEMO_LOCATION = {
  lat: 40.714,
  lon: -74.006,
  radiusKm: 5,
};
```

Do not block the app on location permissions. If real location is not available, use the demo location and show subtle copy such as `Using demo area`.

## TypeScript Contract

Create `src/types/watch.ts` from the backend camelCase response fields:

- `WatchScreenResponse`
- `WatchItem`
- `GoodPlaceToCheck`
- `WatchItemDetail`
- `GoodPlaceDetail`
- evidence, action, overlay, empty-state, and region helper types.

Match backend enum values exactly:

- Watch item types: `species_watch`, `seasonal_watch`, `habitat_watch`, `tree_health`, `aquatic_watch`.
- Good place types: `creek_edges`, `trail_entrances`, `park_boundaries`, `street_trees`, `wetland_edges`, `garden_edges`.
- Confidence labels: `low`, `medium`, `high`.
- Detail/action types should be rendered by their `label`, with known report actions wired to the Report placeholder.

## Watch Screen Behavior

The Watch screen must render backend data only.

Data flow:

1. Load `getWatchScreen(DEMO_LOCATION.lat, DEMO_LOCATION.lon, DEMO_LOCATION.radiusKm)` on mount.
2. Show a skeleton/loading state while pending.
3. If fetch fails, show calm error copy and a retry button.
4. If `emptyState` exists and lists are sparse, render the backend title/message/action label.
5. Render `watchedNearYou` as primary list cards.
6. Render `goodPlacesToCheck` as horizontal square cards.
7. Refresh by re-running the fetch through retry or pull-to-refresh if added.

Watch item card:

- Image if `imageUrl` exists.
- `label`, `title`, `summary`.
- Chips from `chips`.
- Priority/confidence visual treatment.
- Primary action from `nextAction.label`.
- Tapping card opens `/watch/item/[id]`.
- If `nextAction.type === "start_report_with_species"`, primary action routes to report with prefilled params.

Good place card:

- Image if `imageUrl` exists.
- `title`, `summary`, chips, priority.
- Tapping card opens `/watch/place/[id]`.
- If `nextAction.type === "start_report_with_place_context"`, primary action routes to report with prefilled params.

## Detail Screen Behavior

Watch item detail:

- Route: `/watch/item/[id]`.
- Fetch: `GET /consumer/watch/items/{id}`.
- Render as a bottom-sheet style detail page.
- Include image, label, title, explanation, what to look for, where to look, photo tips, lookalike notes, local context, uncertainty notice, and actions.
- Wire `start_report_with_species` actions to Report.

Good place detail:

- Route: `/watch/place/[id]`.
- Fetch: `GET /consumer/watch/places/{id}`.
- Render as a bottom-sheet style detail page.
- Include image/map-style header if available, title, summary, why it matters, what to look for, useful photo tips, relevant watch items, uncertainty notice, and actions.
- Wire `start_report_with_place_context` actions to Report.

## Report Prefill Behavior

For Watch species report actions, navigate to `/(tabs)/report` with:

```ts
{
  source: "watch_item",
  watchItemId: item.id,
  suggestedSpeciesId: item.speciesId,
  suggestedSpeciesName: item.title,
}
```

For Good Place report actions, navigate to `/(tabs)/report` with:

```ts
{
  source: "good_place",
  placeId: place.id,
  placeType: place.type,
  habitatHint: place.type === "creek_edges" ? "near_water" : undefined,
}
```

The Report screen can remain a placeholder for this migration stage, but it must visibly show all received params.

## Placeholder Screens

Explore/Home:

- Use the map-and-bottom-sheet composition from the reference.
- Placeholder can use static UI only for now.
- Keep first screen app-like, not a landing page.

Sightings:

- Use the field notes visual direction from the reference.
- Placeholder can show empty/coming-soon content.

Profile:

- Use the Guide/Profile placeholder role for now.
- Keep it minimal until auth/user flows are implemented.

## Verification Checklist

Backend:

- `python -m alembic upgrade head`
- `python -m app.scripts.seed`
- `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`
- `curl "http://127.0.0.1:8000/consumer/watch?lat=40.714&lon=-74.006&radius_km=5"`

Mobile:

- `cd apps/mobile`
- `npx expo start --android`
- Confirm Watch screen loads backend cards from `http://10.0.2.2:8000`.
- Tap species card and confirm detail screen loads.
- Tap place card and confirm place detail screen loads.
- Tap report actions and confirm Report placeholder displays params.
- Confirm loading, retry, and empty states exist.

Repo workflow:

- Update `HANDOFF.md` after semi-major changes.
- Commit scoped changes.
- Push to `origin/mobile-ui`.
