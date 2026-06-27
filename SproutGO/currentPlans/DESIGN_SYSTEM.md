# DESIGN_SYSTEM.md

**Status:** living source of truth for SproutGo visual design.
**Supersedes:** `InitalPlans/design.md §3–5` (frozen baseline — do not edit there).

## Why this doc exists

The original color/type tokens in `design.md` were a first sketch. The actual
screens were later designed in **Google Stitch** (Material 3), which produced a
complete, precise token ramp across all 13 screens. Those exports are the
authoritative design now. `apps/mobile/src/theme/index.ts` mirrors the tokens
below.

## Typefaces

- **Plus Jakarta Sans** — display/headlines, section titles. Weights 600/700.
- **Inter** — body, captions, badges, scientific names. Weights 400/600.
- **Material Symbols Outlined** — all icons.

(MVP may fall back to system fonts; load the two families via `expo-font` when
polishing.)

## Color tokens (Material 3 ramp)

| Token | Hex | Use |
|---|---|---|
| primary | `#006c0c` | primary actions, active states |
| primary-container | `#1c871e` | filled emphasis surfaces |
| on-primary | `#ffffff` | text/icons on primary |
| on-primary-container | `#f8fff0` | text on primary-container |
| secondary | `#3b6751` | secondary actions |
| secondary-container | `#bbeacf` | active tab pill, success fills |
| on-secondary-container | `#406b56` | text on secondary-container |
| tertiary | `#a52a66` | rare accent / highlights |
| background / surface | `#f5fbee` | base screen color |
| surface-container-lowest | `#ffffff` | cards |
| surface-container-low | `#f0f6e8` | soft elevated panels |
| surface-container | `#eaf0e3` | grouped containers |
| surface-container-high | `#e4eadd` | raised containers |
| surface-container-highest / variant | `#dee5d7` | chips, inputs |
| surface-dim | `#d6dccf` | dimmed surfaces |
| on-surface | `#171d15` | primary text, headings |
| on-surface-variant | `#3f4a3b` | captions, secondary metadata |
| outline | `#6f7a6a` | strong borders |
| outline-variant | `#becab7` | dividers, subtle borders |
| accent-gold | `#D4AF37` | reward accent (sparingly) |
| error | `#ba1a1a` | error / destructive |
| status-error | `#D32F2F` | inline error text |
| inverse-surface | `#2c3229` | snackbars, inverse panels |
| inverse-primary | `#77dd6a` | primary on inverse surfaces |

### Rarity colors

Always pair with a text label — never communicate rarity by color alone.

| Rarity | Hex |
|---|---|
| Common | `#228B22` |
| Uncommon | `#20B2AA` |
| Rare | `#800080` |
| Legendary | `#D4AF37` |

## Type scale

| Role | Size / line-height | Weight | Family | Notes |
|---|---|---|---|---|
| headline-lg | 32 / 40 | 700 | Plus Jakarta Sans | -0.02em; mobile 28/36 |
| section-title | 20 / 28 | 600 | Plus Jakarta Sans | |
| body-md | 16 / 24 | 400 | Inter | |
| caption | 14 / 20 | 400 | Inter | |
| scientific-name | 13 / 18 | 400 italic | Inter | |
| badge-label | 12 / 16 | 600 | Inter | 0.05em uppercase |

## Spacing (8-point)

`xs 4 · sm 8 · md/gutter 16 · lg/container-margin 24 · xl 32 · hero 40`

## Radius

`button 16 · card 20 · cardLarge(feed) 24 · image 20 · sheet 28 · modal 40 · pill 9999`

## Key component patterns

- **Bottom nav:** Map / PlantDex / **Capture (centered, raised `-top-6`, emphasized)** /
  Feed / Profile. Active tab = `secondary-container` bg + `on-secondary-container`
  text, fully rounded pill.
- **Collectible badge:** hexagon via CSS
  `clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)`.
- **Reward sheet / discovery modal:** slide-up sheet, hexagon badge, points delta
  (e.g. +65 / +200 bonus), confidence %, `radius.modal` (40) corners.
- **Plant cards:** `surface-container-lowest` on `background`, `radius.card` (20),
  rarity chip + scientific name (italic).

## Mapping to code

`apps/mobile/src/theme/index.ts` is the runtime mirror of this doc. Token name
changes here must be reflected there (and vice versa). The theme additionally
exposes the full M3 surface ramp (`surfaceLowest`…`surfaceDim`), `secondary*`,
`tertiary`, `outline*`, and `inverse*` for screen work in M1–M5.
