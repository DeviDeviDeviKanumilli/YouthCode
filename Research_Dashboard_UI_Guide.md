# EcoSentinel Research Dashboard UI Guide

Living design notes for the desktop research dashboard. Update this file whenever the dashboard direction changes, new screens are added, or implementation reveals a product gap.

Last updated: 2026-06-27

## Product Intent

The research dashboard is a serious ecological workbench, not a marketing page and not a generic analytics template. It should help researchers, reviewers, conservation groups, park managers, and survey leads verify observations, inspect ecological context, understand uncertainty, diagnose sampling gaps, and export model-ready records.

The interface should feel minimal, scientific, calm, and operational. The reference screenshots have a useful product structure, but the final UI should be more restrained: fewer framed cards, fewer badges, fewer repeated controls, quieter color, clearer language, and more emphasis on maps, tables, evidence, uncertainty, and verification workflow.

Core promise:

```txt
EcoSentinel turns local nature sightings into ecological forecasts.
```

Dashboard promise:

```txt
Help researchers verify, analyze, and export uncertainty-aware ecological signals.
```

## Overall Design Direction

Use a style best described as **minimal scientific workbench**.

- Prioritize dense, scannable information over decorative composition.
- Use maps, tables, and detail panels as the primary surfaces.
- Prefer line separators and quiet panels over stacked cards.
- Use color only to communicate state, priority, or ecological layer meaning.
- Keep the green brand accent, but balance it with neutral canvas, muted blue, amber, and restrained red so the UI does not become a one-note green theme.
- Keep corners tight: 6-8px maximum for most panels, controls, and repeated items.
- Avoid nested cards. A card inside a card should be redesigned as a section, row, tab, drawer, or divider group.
- Avoid large explanatory text inside the application. Use concise labels, tooltips, and contextual help where needed.
- Make the first screen useful immediately. No landing page.

## What Works In The Reference Screens

- The dashboard has a clear set of primary areas: Overview, Verification Queue, Observations, Forecast Map, Sampling Gaps, Exports, AI Analyst, Settings.
- The left navigation is stable and understandable.
- The map is correctly treated as a central product surface.
- The verification workflow has the right ingredients: evidence, possible species, confidence, habitat answers, environmental context, nearby records, provenance, notes, and review actions.
- The observation table has the right direction: filters, saved views, selectable rows, columns, pagination, and a detail drawer.
- The Sampling Gaps screen correctly explains that absence is not the same as true absence.
- The Export Center correctly separates configuration, preview, privacy/ethics warnings, and export history.
- The AI Analyst screen correctly attempts to show active context, cited sources, confidence, uncertainty, and exportable results.

Keep these structural ideas, but simplify the visual execution.

## High-Priority Problems To Fix

### 1. The UI Is Too Busy

The current reference uses many bordered cards, nested cards, badges, mini-panels, icons, toggles, charts, and parallel detail areas. It looks polished, but it demands too much visual parsing.

Fix:

- Reduce the number of surfaces visible at once.
- Replace repeated cards with compact rows, tables, tabs, and drawers.
- Keep only one primary detail panel open at a time.
- Use one active accent per screen.
- Remove decorative icons where text or table structure already explains the content.

### 2. Filter Controls Are Repeated And Ambiguous

Several screens show a global filter button, active filter count, collapse filters control, inline dropdowns, filter chips, and page-specific filters. Users should not have to infer which controls affect the map, table, side panel, exports, or analyst context.

Fix:

- Use one global filter bar below the page title.
- Show active filter chips only when values are non-default.
- Use page-local filter drawers for advanced filters.
- Always label the filter scope: `Map`, `Table`, `Queue`, `Export`, or `Analyst context`.
- Replace vague labels like `5 active` with `5 filters active`.
- Do not show `Collapse filters` unless there is a visible expanded filter area.

### 3. Dates And Counts Must Be Internally Consistent

One reference shows active date filters for April 1-April 30 while visible table records are dated May 29-May 31. Another screen shows `Needs Verification: 1,246` while the sidebar queue badge shows `12`.

Fix:

- Visible rows must match active filters.
- If a count is scoped, name the scope: `12 assigned to you`, `1,246 pending system-wide`, `312 priority ecological signals this month`.
- Every KPI should include the date range and filter scope used to compute it.
- Export previews must use the same filters shown in the filter summary.

### 4. Required Product Language Is Not Strict Enough

The screenshots mix labels like `High Priority`, `Priority ecological signal`, `Model Risk`, `Spread Risk`, and `High-value verification`. This weakens the product vocabulary and may overstate certainty.

Fix:

- Use **Ecological Signal Priority** as the score name everywhere.
- Never use `danger score`.
- Avoid `Model Risk` unless the backend explicitly exposes a risk model; prefer `Signal priority`, `Pathway context`, or `Potential spread corridor`.
- Use the official signal labels:
  - `Low signal`
  - `Moderate signal`
  - `High-value verification candidate`
  - `Priority ecological signal`
  - `Insufficient evidence`
- Use uncertainty-aware wording:
  - `possible`
  - `likely`
  - `needs verification`
  - `potential spread corridor`
  - `possible invasive concern`
  - `insufficient evidence`
- Only use confirmed language when verification status supports it: `expert_verified` or `field_confirmed`.

### 5. Verification Actions Need More Integrity

The huge bottom buttons are visible and useful, but the flow is underspecified. `Reject` and `Needs More Evidence` cannot be one-click actions without structured notes. `Expert Verified` requires role permissions and usually a verified species.

Fix:

- Only show verification actions to roles allowed to perform them.
- `Expert Verified` must require selected species and reviewer identity.
- `Field Confirmed` must exist for reviewer/admin workflows where field validation is supported.
- `Reject` must require reviewer notes.
- `Needs More Evidence` must require a reason or requested evidence type.
- Destructive actions should use confirmation or a required note, not just a large red button.
- After any action, update status, queue position, history, map state, and export eligibility.

### 6. Source And Evidence Types Are Mixed Too Freely

Some reference panels combine photo observations, iNaturalist source labels, eDNA lab feed, hydrology data, and visual evidence as if they are the same record type. That creates scientific ambiguity.

Fix:

- Separate `Observation evidence` from `Context sources`.
- Do not show eDNA fields on a photo observation unless the record is explicitly an eDNA detection.
- Label each source with its role:
  - `Media evidence`
  - `Community observation`
  - `Verified external record`
  - `Environmental covariate`
  - `Hydrology layer`
  - `Land cover layer`
  - `Sampling effort signal`
- External `research grade` should not be confused with EcoSentinel verification. Label it as `External grade` when relevant.

### 7. The AI Analyst Should Not Show "Thought Process"

The reference includes a `Thought process` module. The dashboard should not expose hidden chain-of-thought. Researchers need reproducible methods, sources, and uncertainty, not private reasoning traces.

Fix:

- Replace `Thought process` with `Method`, `Evidence used`, or `Analysis steps`.
- Show concise, auditable steps:
  - `Filtered observations`
  - `Compared against previous period`
  - `Checked verification status`
  - `Summarized uncertainty factors`
- Always include data sources used, confidence, uncertainty, verification status, and model version when relevant.
- The analyst must say `insufficient evidence` when evidence is weak.

### 8. The Map UI Has Too Many Competing Panels

The reference map screens show global filters, map layer cards, signal lens cards, legends, selected-record panels, vertical mode rails, and bottom legends at the same time. The map should be the dominant workspace.

Fix:

- Keep the map large and uninterrupted.
- Use collapsible left layer drawer and right selected-record drawer.
- Use a compact bottom legend only when layers are visible.
- Avoid floating cards in the middle of the map unless opened by the user.
- Layer controls should be grouped by purpose:
  - `Records`
  - `Ecological context`
  - `Sampling`
  - `Infrastructure`
  - `Basemap`
- `Signal Lens` should be a map mode, not a generic card repeated across screens.

### 9. The Sidebar Is Useful But Overweighted

The sidebar currently contains navigation, data sync, documentation, and profile cards. This makes the persistent chrome heavier than the work area.

Fix:

- Keep primary navigation persistent.
- Move `Data Sync` to a compact status indicator in the top bar or footer.
- Move `Documentation` to a help menu.
- Keep profile minimal: avatar/name/role with account menu.
- Consider a collapsed rail mode for map-heavy screens.

### 10. The UI Relies Too Much On Color

Verification state, priority, map markers, confidence, and sampling categories often rely on color alone.

Fix:

- Pair color with labels, icons, patterns, or shapes.
- Ensure map markers have distinct shapes or outlines.
- Use hatching for corridors and sampling categories.
- Make table status chips readable in grayscale.
- Red should be reserved for rejection/destructive action or the highest signal state, not generic attention.

### 11. Some Actions Are Undefined Or Risky

`Share`, app launcher icons, `Flag`, `Create Follow-up Task`, `Add to Sampling Plan`, `Save View`, and single-observation export appear in the reference but are not fully defined by the current MVP.

Fix:

- Hide or disable actions until the workflow exists.
- If present, show permission and privacy behavior.
- `Share` must respect privacy level and export permissions.
- `Save View` should store filters, columns, sort, map extent, and layer state.
- `Add to Sampling Plan` should be omitted until sampling plans exist.
- Single-record export should follow the same privacy rules as research exports.

### 12. Empty, Loading, Error, And Permission States Are Missing

The reference only shows ideal populated states.

Fix:

- Design states for loading, empty results, no map layers, no media, missing environmental context, unavailable exports, failed export generation, insufficient evidence, unauthorized actions, expired session, API error, and rate limit.
- These states should be plain, calm, and actionable.
- Do not use alarmist language.

## Minimal UI Principles

### Layout

- Use a fixed desktop app shell: left nav, top utility bar, content workspace.
- Keep the page title and primary action at the top of the workspace.
- Use a single filter row per page.
- Use drawers for details, not multiple stacked detail cards.
- Prefer two-column workspaces:
  - list/table/map on the left
  - selected detail on the right
- For review screens, use:
  - queue list
  - evidence/detail
  - sticky review action bar

### Typography

- Use a restrained type scale.
- Page titles should be clear but not oversized.
- Table and panel labels should be compact.
- Scientific names should use a subtle italic style.
- Avoid tiny text below 12px.
- Do not use negative letter spacing.

### Color

Recommended palette direction:

```txt
Canvas:        #F7F8F5
Surface:       #FFFFFF
Ink:           #102019
Muted text:    #5F6C63
Border:        #DDE5DC
Brand green:   #0B6B43
Soft green:    #DDEADB
Amber:         #B86B00
Red:           #B63A32
Muted blue:    #356C9A
```

Rules:

- Use green for brand, verified state, and primary action.
- Use amber for pending or needs-more-evidence states.
- Use red for rejected/destructive actions and highest-priority ecological signals only.
- Use blue for sampling-gap or neutral data layers.
- Keep backgrounds neutral.

### Panels And Cards

- Use 1px borders and minimal shadows.
- Radius should usually be 6-8px.
- Avoid nested cards.
- Use table rows, grouped sections, and dividers instead of card grids when showing operational data.
- A card should represent one repeated item, modal, or focused tool, not every section of the page.

### Badges And Labels

Keep badges rare and semantic. Avoid turning every fact into a pill.

Verification badges:

- `Unverified`
- `Needs more evidence`
- `Expert verified`
- `Field confirmed`
- `Rejected`

Signal badges:

- `Low signal`
- `Moderate signal`
- `High-value verification candidate`
- `Priority ecological signal`
- `Insufficient evidence`

Source badges:

- `User submitted`
- `iNaturalist`
- `GBIF`
- `USGS NAS`
- `NLCD`
- `NOAA`
- `OpenStreetMap`
- `Seeded demo data`

### Buttons

- Primary actions should be rare.
- Use icon buttons for common tools: search, filters, columns, download, map, close, more.
- Use text buttons for destructive or high-commitment actions.
- `Reject` should never be the visual equal of `Expert Verified`; it should require note/confirmation.
- Buttons must not resize based on label changes.

### Tables

- Tables are core dashboard surfaces, not secondary views.
- Default columns should be few and high-value:
  - observation ID
  - thumbnail
  - possible species
  - confidence
  - verification status
  - Ecological Signal Priority
  - region
  - submitted date
- Extra columns should be hidden behind column settings.
- Row detail should open in a right drawer.
- Bulk actions should remain disabled until rows are selected.

### Maps

- Map should not be visually trapped inside decorative cards.
- Use stable controls: zoom, locate, fullscreen, layer drawer.
- Legends should reflect only visible layers.
- Selected record detail should appear in a right drawer.
- Research maps can use exact coordinates for authorized users only.
- Public map payloads and research map payloads must never be mixed.

## Page-By-Page Direction

### Overview

Purpose: give researchers a fast operational read of the current ecological signal workload.

Keep:

- Top KPIs.
- Forecast map preview.
- Priority review stream.
- Selected observation detail.
- Provenance summary.

Simplify:

- Limit KPIs to 4:
  - `Total observations`
  - `Needs verification`
  - `Priority ecological signals`
  - `Under-sampled zones`
- Remove mini trend charts unless they are meaningful and clickable.
- Replace the selected observation card cluster with a single detail drawer or compact bottom panel.
- Do not duplicate the same observation across map, stream, selected detail, and provenance unless selection state is clear.

Required fixes:

- Explain whether each KPI is filtered, regional, monthly, or system-wide.
- Use `Ecological Signal Priority`, not `High Priority` as a standalone concept.
- Make `Under-sampled zones` specify grid size and region.

### Verification Queue

Purpose: help reviewers decide what needs review first and record defensible verification actions.

Recommended layout:

- Left: queue list with sort and essential filters.
- Center: selected observation evidence and context.
- Right: possible species, notes, provenance, and verification history.
- Bottom or right sticky: review actions.

Keep visible:

- possible species
- scientific name
- confidence and confidence label
- media evidence
- similar-species warnings when available
- location summary
- source
- verification status
- Ecological Signal Priority label
- reason codes
- habitat answers
- environmental context
- nearby records
- reviewer notes
- verification history

Simplify:

- Collapse evidence thumbnails after 4 items.
- Use tabs for `Evidence`, `Context`, `History`, and `Provenance` if the page gets too dense.
- Remove share/flag unless implemented and permission-aware.

Required fixes:

- Add `Field confirmed` when role and workflow allow it.
- Require notes for `Reject`.
- Require requested evidence type for `Needs more evidence`.
- Do not allow expert verification without selected species.
- Show model/provider version for AI identification and signal score.

### Observations

Purpose: provide a high-density research table for filtering, comparing, and opening records.

Keep:

- Saved views.
- Active filter chips.
- Column selector.
- Row selection.
- Right detail drawer.
- Export selected/action affordance.

Simplify:

- Do not open a large side panel by default on first load; open it only after selection.
- Keep the row density consistent.
- Avoid redundant pills in each row.

Required fixes:

- Active date filters must match visible row dates.
- `Confidence` needs tooltip or explanation: identity confidence, not verification certainty.
- `Signal Priority` values must use official labels or compact score + label.
- If native/non-target examples appear in the same table, their signal type must be clear so the table does not imply every record is invasive.

### Forecast Map

Purpose: show where observations, verified records, possible spread corridors, signal clusters, and sampling gaps matter spatially.

Keep:

- Full map workspace.
- Date comparison controls.
- Layer toggles.
- Selected record panel.
- Legend.

Simplify:

- Collapse the layer drawer by default after the user chooses layers.
- Move vertical mode rail into a compact segmented control or top-level tabs.
- Do not show layer drawer, signal lens drawer, selected record drawer, and bottom legend all expanded unless the user asked for that state.

Required fixes:

- Label corridors as `Potential spread corridors`.
- Do not imply exact prediction.
- Show coordinate precision/privacy state somewhere in selected-record details.
- Keep research exact-coordinate data out of public views.

### Sampling Gaps

Purpose: identify where data is weak, biased, missing, or likely to produce false absence assumptions.

Keep:

- Grid map.
- Category legend.
- Analysis summary.
- Grid cell summary table.
- Absence caveat.

Simplify:

- Make the caveat shorter and more permanent:
  - `No observations does not mean true absence.`
- Replace large help button with a small help icon and tooltip.
- Keep category descriptions in a right detail panel or expandable list.

Required fixes:

- Every grid statistic should show region, date range, grid size, and mode.
- `Confidence` for gap cells should specify confidence in the gap classification, not species confidence.
- Hatching/patterns should remain distinct from map corridors.

### Export Center

Purpose: let researchers create privacy-aware CSV and GeoJSON exports using current filters.

Keep:

- Configure and preview sections.
- Format choice.
- Include-field toggles.
- Privacy and data ethics notice.
- Export history.

Simplify:

- Use a two-step flow:
  - `Configure`
  - `Review and create`
- Hide advanced options by default.
- Make preview compact and tied directly to current filters.

Required fixes:

- Make privacy behavior explicit before export creation.
- Disabled fields need reasons, e.g. `Observer information requires admin permission`.
- Show whether private records are excluded, obscured, or included.
- Show expiration policy for generated downloads.
- Export history should distinguish `created`, `processing`, `complete`, `failed`, and `expired`.

### AI Analyst

Purpose: answer research questions using grounded platform context, uncertainty, and cited sources.

Keep:

- Active context panel.
- Question composer.
- Answer area.
- Confidence and uncertainty section.
- Cited data sources.
- Related records.
- Export/save analysis actions.

Simplify:

- The answer should be the primary content, not surrounded by many side cards.
- Suggested questions should be compact.
- Move top records/sampling concerns to a collapsible right rail.

Required fixes:

- Replace `Thought process` with `Method` or `Evidence used`.
- Do not show private reasoning traces.
- Include model version, data sources, filters, and timestamp.
- Say `insufficient evidence` when data is weak.
- Avoid unsupported ecological claims or guaranteed forecasts.
- `Verified Mode` should be renamed to something precise, such as `Use verified records only` or `Verified context`.

### Settings

Purpose: manage account, roles, workspace preferences, API/data policy links, notification preferences, and saved views.

Keep it minimal. Settings should not compete with the research workflow.

## Canonical Dashboard Navigation

Primary nav:

```txt
Overview
Verification Queue
Observations
Forecast Map
Sampling Gaps
Exports
AI Analyst
Settings
```

Possible future nav, only when implemented:

```txt
Sampling Plans
Data Sources
Model Cards
Admin
```

Do not add future sections to the sidebar until they have real workflows.

## Required UI States

Every major dashboard page needs:

- loading state
- empty state
- filtered-empty state
- API error state
- unauthorized state
- insufficient evidence state
- stale data/sync warning
- read-only role state
- export failed state
- no media state
- missing environmental context state
- map layer unavailable state

State copy must be calm and specific.

Examples:

```txt
No observations match these filters.
```

```txt
Environmental context is not available for this observation yet.
```

```txt
Insufficient evidence to compute Ecological Signal Priority.
```

```txt
You need reviewer access to verify observations.
```

## Accessibility Requirements

- Do not rely on color alone.
- All icon-only buttons need tooltips and accessible labels.
- Text must fit in buttons, chips, rows, and panels at desktop and tablet widths.
- Tables need keyboard navigation and visible focus states.
- Map markers need accessible equivalents in the table/list.
- Controls must have a minimum 40px target size.
- Contrast must pass WCAG AA for text and essential UI state.
- Modals/drawers must trap focus and close predictably.

## Data And API Alignment

The dashboard should use the frozen frontend contract and research integration guide.

Primary endpoints:

```txt
POST /auth/token
GET /auth/me
GET /forecast/research
GET /sampling-gaps?mode=research
GET /research/observations
GET /research/verification-queue
POST /verification/{observation_id}
GET /verification/{observation_id}/history
POST /research/export
POST /research/exports
GET /research/exports
GET /research/exports/{export_id}
PATCH /research/exports/{export_id}
GET /assistant/context/research
GET /observations/{observation_id}/pipeline-status
```

Role expectations:

- `researcher`: search observations and request exports.
- `reviewer`: researcher tools plus verification actions.
- `admin`: all research workflows, role management, and private export access.

## Content Rules

Use:

- `possible`
- `likely`
- `needs verification`
- `high-value signal`
- `high-value verification candidate`
- `potential spread corridor`
- `insufficient evidence`
- `possible invasive concern`

Avoid:

- `confirmed invasion`
- `guaranteed prediction`
- `danger score`
- `definitely dangerous`
- `will spread here`
- `true population size` from casual sightings alone

Only use confirmed language when verification status supports it.

## MVP Definition For The Dashboard UI

The dashboard MVP is complete when a researcher or reviewer can:

1. Sign in or use a local development requester identity.
2. See a verification queue.
3. Filter observations.
4. Open an observation detail view.
5. Inspect media, possible species, uncertainty, habitat answers, environmental context, nearby records, signal priority, and provenance.
6. Verify, reject, or request more evidence with required notes where applicable.
7. See the record on the research Forecast Map.
8. Inspect sampling-gap context.
9. Create CSV and GeoJSON exports with privacy-aware options.
10. Ask the AI Analyst a grounded research question and see sources, uncertainty, and model/version context.

## Implementation Guardrails

- Build desktop-first.
- Keep route handlers and ecological logic in the backend; the dashboard only presents API results.
- Do not hardcode unsupported ecological facts into the UI.
- Do not invent status labels outside the backend contract.
- Do not display research-coordinate payloads in public UI.
- Do not expose private records or precise sensitive locations without the required role.
- Prefer deterministic seeded data for demos.
- Keep visual density high, but visual decoration low.

## Open Design Questions

- Should the first dashboard screen be `Overview` or `Verification Queue` for reviewers?
- Should the Forecast Map own the global date range, or should each page keep its own date filter?
- Should `Save View` be part of MVP or a post-MVP feature?
- Should single-observation export exist, or should all exports go through Export Center?
- Should map layer presets exist for `Reviewer`, `Researcher`, and `Sampling survey` workflows?
- Should the AI Analyst appear as a full page only, or also as a contextual side panel on map/table pages?

## Current Recommendation

Use the screenshots as a structural reference, not as the final visual density target. The final EcoSentinel dashboard should be quieter and sharper:

- fewer panels
- fewer badges
- more table/map space
- clearer filter scope
- stricter scientific wording
- better role-aware verification flows
- stronger privacy/source separation
- explicit uncertainty everywhere

The best version should feel like a research instrument: precise, calm, and trustworthy.

## Implementation Status

Initial normal React implementation lives in:

```txt
apps/web
```

Run it with:

```txt
cd apps/web
npm install
npm run dev
```

Build check:

```txt
cd apps/web
npm run build
```

Interaction smoke check:

```txt
cd apps/web
npm run smoke
```

Implemented first-pass sections:

- Overview
- Verification Queue
- Observations
- Forecast Map
- Sampling Gaps
- Export Center
- AI Analyst
- Settings

Current implementation notes:

- Uses Vite, TypeScript, normal React, and CSS.
- Uses deterministic typed demo data with a typed API boundary and live-backend fallback support.
- Supports hash navigation for direct section URLs: `#overview`, `#verification`, `#observations`, `#forecast`, `#sampling`, `#exports`, `#analyst`, and `#settings`.
- Keeps the minimal scientific workbench direction: restrained panels, fewer badges, scoped filters, table/map-first layout, and uncertainty-aware wording.
- Uses a real interactive Leaflet/OpenStreetMap research map with markers, popups, potential corridor overlays, and sampling-gap overlays.
- Verification actions, export format selection, export creation, and filter clearing have visible UI state changes.
- Verified locally with `npm run build` and `npm run smoke`.
- The smoke check verifies map tiles, filter clearing/restoring, verification action feedback, export creation feedback, and the populated Settings page.

Latest implementation pass:

- Forecast Map layer controls now drive real map state for verified records, unverified records, potential spread corridors, sampling gaps, waterways, and roads/trails.
- The map legend now only shows currently visible layers.
- Sampling Gaps now uses the same real Leaflet/OpenStreetMap surface instead of a decorative fake grid.
- Verification actions now require visible reviewer notes for `Needs more evidence` and `Reject with notes`, and the evidence request type is explicit.
- Observation table controls now work: `Show source` toggles an actual source column and `Export view` creates a visible export request.
- Export history actions now show stateful feedback for download, retry, and processing details.
- Documentation in the sidebar now opens a short in-app guide hint that points to this living UI guide.
- Filter chips wrap cleanly instead of clipping on narrower workspaces.
- Local screenshot QA artifacts are saved under `apps/web/artifacts/` and ignored by git.
- Verified again with `npm run build` and `npm run smoke` after the map/control updates.

Functional workbench pass:

- Research role is now active local UI state. Switching `researcher`, `reviewer`, or `admin` changes permission behavior and is reflected in the session menu.
- The top notification and app-menu buttons now open useful popovers instead of acting as decorative icons.
- Reviewer permissions are enforced in the UI: non-reviewer roles see the verification permission notice and disabled review actions.
- Observation saved views now work locally. `Save view` stores the current visible table context, and saved view chips can be selected.
- The AI Analyst now accepts a typed research question, produces a deterministic grounded answer from the current observation context, saves analyses, and includes method, sources, confidence, and uncertainty.
- The analyst returns `Insufficient evidence` language when the current visible observation set is empty.
- Settings can change the active verification role, keeping the shell role/session behavior consistent.
- Smoke coverage now verifies notifications, app menu/session role, role-based verification permissions, saved views, analyst asking/saving, map tiles, map layer controls, table export, export creation, export-history feedback, and settings role changes.
- Latest checks passed: `npm run build` and `npm run smoke`.

Persistence and export-integrity pass:

- Active role and selected observation now persist in local storage for development/demo sessions.
- Saved observation views now persist in local storage.
- Saved AI Analyst analyses now persist in local storage.
- Export Center include-field toggles now control actual export request flags instead of being decorative.
- Export preview field counts and estimated file size update from the selected export fields and format.
- Smoke coverage now clears local storage for deterministic setup, then verifies local persistence survives reload for role, saved observation views, and saved AI analyses.
- Smoke coverage now verifies export field toggles change the preview field count before creating an export.
- Latest checks passed: `npm run build` and `npm run smoke`.

Filter consistency pass:

- Global filter state now lives at the dashboard shell level instead of inside the visual filter rail.
- Active filters now affect visible observations, KPI metrics, priority review rows, Forecast Map records, Sampling Gap map records, AI Analyst context, and Export Center record counts.
- Clearing filters expands the visible demo dataset; restoring filters narrows it back to the high-value unverified/needs-review demo context.
- Export requests now include the visible record count in their filter payload.
- Smoke coverage now verifies filtered and unfiltered visible counts.
- Latest checks passed: `npm run build` and `npm run smoke`.

Selection and download integrity pass:

- Selected observation now stays consistent with the visible filtered/search result set. If filters hide the selected record, the dashboard selects the first visible record instead of showing stale detail.
- Completed export rows now trigger a real browser download using generated CSV or GeoJSON content instead of only showing a status message.
- CSV downloads include export metadata and privacy notes.
- GeoJSON downloads produce a valid empty `FeatureCollection` with export metadata and privacy notes until backend-generated files are available.
- Smoke coverage now verifies the hidden-selected-record case and asserts the browser download event for completed exports.
- Latest checks passed: `npm run build` and `npm run smoke`.

Empty-result integrity pass:

- Selected observation can now be `null` when active search and filters return no observations.
- Overview, Verification Queue, Observations, Forecast Map, and Sampling Gaps now render explicit empty states instead of stale selected-record details.
- Review actions are disabled when no visible record is selected.
- No-result search now shows zero KPI counts, no map records, an empty priority stream, and no selected-observation detail.
- Smoke coverage now verifies a no-result search state and recovery back to a visible record.
- Latest checks passed: `npm run build` and `npm run smoke`.

Export retry integrity pass:

- Failed export rows now queue a real retry entry in the export history instead of only showing a message.
- Retry entries preserve the original export format, filter count, and record count, then appear at the top of the table with `Processing` status.
- The retry action keeps the Export Center minimal: one compact action button, one status message, and one visible table update.
- Smoke coverage now clicks a failed export retry and verifies the new processing retry row appears.
- Latest checks passed: `npm run build` and `npm run smoke`.
