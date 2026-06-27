# CLAUDE.md — DevHack / EcoSentinel iOS workspace

> **Read first, every session, before touching anything:**
>
> 1. `HANDOFF.md` — running log of mobile UI changes and verification state.
> 2. `AGENTS.md` — product identity, MVP scope, language rules, ecological-priority formula, milestones.
>
> Do not skip these. They contain the working rules, branch policy, and ecological-wording rules that the project has committed to.

## What this workspace is

This is the iOS-focused fork of the EcoSentinel project (upstream: `DeviDeviDeviKanumilli/YouthCode`).

The "Android app" is actually an **Expo / React Native / TypeScript** app under `apps/mobile`. Expo builds for both Android and iOS from the same source. iOS parity is achieved by running the same Expo app on iOS — there is no separate native Swift implementation to keep in sync.

The legacy empty UIKit template in `DevHack/` is preserved as historical scaffolding only. It is not the shipping iOS app. Do not add features to it.

## Approach: Option A (Expo on iOS)

The Expo app at `apps/mobile` already declares iOS support in `app.json`:

```json
"ios": { "bundleIdentifier": "com.youthcode.ecosentinel", "supportsTablet": true }
```

Native iOS project files (`apps/mobile/ios/`) are **generated on demand** by `npx expo prebuild` and are gitignored. Treat them as build output, not source.

## Branch policy

- All iOS-fork work lives on the **`IOSBranch`** branch.
- Do not commit to `main` from this workspace.
- Never commit logs, `node_modules`, `.expo/`, `ios/`, `android/`, `Pods/`, `DerivedData/`, or `.env` files. The `.gitignore` enforces this — do not weaken it.
- Follow the upstream rule from `HANDOFF.md`: update the handoff log after every semi-major change.

## Running the iOS app

Prerequisites (one-time):

```bash
# Xcode 15+ from the App Store, with Command Line Tools
xcode-select --install

# CocoaPods (the Expo iOS build needs it)
sudo gem install cocoapods
# or via Homebrew: brew install cocoapods

# Node 20+ and npm
node --version  # should be >=20
```

Install JS dependencies:

```bash
cd apps/mobile
npm install
```

Point the app at a backend. For the local FastAPI server in `apps/api`:

```bash
# iOS Simulator can reach the host directly via localhost
export EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

For a physical iPhone on the same Wi-Fi, use the Mac's LAN IP:

```bash
export EXPO_PUBLIC_API_BASE_URL=http://<your-mac-LAN-IP>:8000
```

Run on the iOS Simulator:

```bash
cd apps/mobile
npx expo run:ios
```

On first run, `expo run:ios` will:

1. Run `expo prebuild` and create `apps/mobile/ios/` (gitignored).
2. Run `pod install`.
3. Build the iOS app and boot the Simulator.

To rebuild after adding a native dependency:

```bash
rm -rf apps/mobile/ios apps/mobile/node_modules
npm install
npx expo run:ios
```

## Backend (so the app has data)

The mobile app expects the FastAPI backend in `apps/api`. The easiest path is Docker Compose:

```bash
docker compose up   # starts Postgres + API
```

See `apps/api/README.md` / `AGENTS.md` for the manual Python setup if Docker is unavailable.

The demo QA checklist at the bottom of `HANDOFF.md` is the canonical "is iOS ready?" test list. Run it in the iOS Simulator before declaring parity.

## Ecological-wording reminder

`AGENTS.md` defines required language. Use *possible / likely / needs verification / high-value signal / possible invasive concern*. Avoid *confirmed invasion / danger score / definitely / will spread here*. This rule applies to any user-facing copy you add, in any language or platform.

## What lives where

```
/                       workspace root (git root, IOSBranch)
├── CLAUDE.md           this file
├── .gitignore          excludes logs, node_modules, ios/, Pods/, .env, ...
├── HANDOFF.md          READ FIRST — running mobile UI log
├── AGENTS.md           READ FIRST — product identity, rules, milestones
├── DevHack/            legacy empty UIKit Xcode template (not the shipping app)
└── apps/
    ├── mobile/         Expo app — this is the iOS app (and Android app)
    │   ├── app/        expo-router screens
    │   ├── src/        api, providers, theme, helpers, types
    │   └── app.json    iOS bundle id is com.youthcode.ecosentinel
    ├── api/            FastAPI backend (Python 3.12+, PostGIS)
    └── web/            research dashboard (separate from mobile)
```

## When in doubt

- Mobile UI work → conventions and recent changes live in `HANDOFF.md` and `apps/mobile/CLAUDE.md`.
- Product/wording/architecture questions → `AGENTS.md`.
- Backend contract → `apps/api` plus the OpenAPI doc the API serves at `/openapi.json`.
- Visual reference → `stitchDesignReference.txt`.
- iOS build issues → usually `rm -rf apps/mobile/ios` and re-run `npx expo run:ios`.
