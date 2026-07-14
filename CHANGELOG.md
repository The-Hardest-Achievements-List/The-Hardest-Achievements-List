# Changelog

Changes from `79cbce0` (*Standardizing JSON field order and tag arrays format & order on achievement.json while also adding noclip and other tags to some entries*) through `87fcf22` (*Adding changelog panel, large codebase refactor, optimization, and bug fixes*), including the current post-commit UI fixes.

- **Range:** 2026-07-06 → 2026-07-14
- **Commits:** 21 feature commits
- **Files changed:** 99 (+38,518 / −18,654 lines, including current working-tree changes)

---

## Commits (newest first)

| Commit   | Date       | Description |
|----------|------------|-------------|
| `PENDING` | 2026-07-14 | **Hash placeholder:** align modal tag icons and labels with the shared registry; fix rename-only changelog events incorrectly reporting an unchanged rank as movement |
| `87fcf22` | 2026-07-14 | Homepage Changelog panel; component/CSS architecture refactor; lazy leaderboard and data chunking; expanded-group virtualization fixes |
| `3987c8d` | 2026-07-12 | Legacy List restored; timeline `image`/`proof` split; `images/thumbnails` & `images/proofs`; cross-list replacement duplicates |
| `5269d38` | 2026-07-10 | Leaderboard rework; regional/country leaderboard; `ModLeaderboardPage` merged into submissions mode |
| `10c2dbc` | 2026-07-10 | Data normalization refactor; notes/tooltip UI polish; Twitch link support |
| `48b392a` | 2026-07-09 | Notes display overhaul (string or array); grouped-card & mobile edge-case fixes |
| `dce23bf` | 2026-07-09 | Font Awesome npm bundle (icon fix); NLW estimate sorting; mobile header/sidebar polish |
| `239bdc0` | 2026-07-09 | Mobile/small-viewport UI fixes; projected-ranks toggle in drawer; tag/data cleanup |
| `389fad7` | 2026-07-09 | Fix pending entries disappearing when `duplicateOf` references a main-list parent |
| `c835988` | 2026-07-09 | Expand entry schema normalization (null fields, YouTube links, pending sort) |
| `58b5242` | 2026-07-09 | Timeline inferred dates for missing `date`; YouTube URL normalization |
| `4910d5d` | 2026-07-09 | Move variant toggle to a more visible position on grouped cards |
| `e9e8401` | 2026-07-09 | Add `normalize:entries` script for field/tag ordering |
| `7e49b75` | 2026-07-08 | Extending Classic list features to Pending and Timeline list |
| `c59a8b7` | 2026-07-08 | Minor UI improvement on filter chips |
| `42a6077` | 2026-07-08 | Improving level thumbnail retrieval & loading system |
| `b5114d5` | 2026-07-07 | Adding Pending Removal tags |
| `be87c3d` | 2026-07-07 | Adding rank projection system that works with pending submissions + minor UI improvement |
| `45f1b3c` | 2026-07-07 | Normalizing all instances of `id` into `levelID` and restoring logo image |
| `010a7a9` | 2026-07-07 | Fixing timestamp not working on iframe embed video |
| `79cbce0` | 2026-07-06 | Standardized JSON field and tag-array order; added Noclip and other tags to selected achievements |

---

## Summary

This period focused on data normalization (`id` → `levelID`, schema enforcement via `normalize:entries`), pending-submission rank projections (now shared across Classic and Platformer lists), thumbnail loading improvements, timeline date inference, YouTube URL normalization, duplicate-grouping fixes, a new **Pending Removal** tag, responsive UI work (mobile drawer, sidebar breakpoint at 1024px), **NLW** pending-estimate handling, rich **notes** display, a full **leaderboard** rewrite with **regional/country** rankings, **Legacy List** restoration, and timeline **video vs. image proof** separation with asset path migration to `images/`. The 2026-07-14 update adds a data-backed **homepage Changelog panel**, reorganizes the UI into smaller shared components and co-located stylesheets, improves list virtualization and bundle loading, extends inferred timeline dates to sorting, and fixes several display and normalization edge cases.

---

## Latest update — 2026-07-14

### Homepage Changelog panel (`87fcf22`)

The homepage now includes a structured change-history feed instead of relying only on this repository changelog.

- **Classic / Platformer / Timeline tabs:** switches between independent history feeds with accessible tab roles and selected-state announcements
- **Automatic event classification:** distinguishes additions, removals, rank increases, rank decreases, renames or progress updates, timeline changes, and achievement-baseline milestones
- **Detailed headlines:** combines old/new names and ranks, movement direction, and neighboring entries (`above` / `below`) where that context is available
- **Milestone support:** reports list creation and achievement-baseline increases alongside ordinary list changes
- **Date grouping:** groups events under human-readable headings such as **Today**, **Yesterday**, or a full calendar date
- **Pagination:** displays ten events per page using the same shared pagination component as the leaderboard
- **Current follow-up fix:** rename-only and progress-only events whose rank did not change no longer claim that an entry “moved from #N to #N”
- **New structural data sources:** `classicchangelog.json`, `platformerchangelog.json`, `timelinechangelog.json`, and `milestones.json`; routine edits to individual list records are intentionally omitted from this document

### Homepage layout, staff, and navigation (`87fcf22`)

- Reworked the homepage into a two-column desktop layout: **Staff** on the left, with **Community** and **Changelog** panels stacked on the right
- Added responsive height synchronization with `ResizeObserver` so the stacked side panels align with the staff panel without forcing fixed content heights
- Collapses to a single-column layout below 640px and limits the mobile changelog panel height for easier scrolling
- Converted staff entries into structured records with multiple roles and optional external profile links
- Added gradient staff-role colors, keyboard focus styling, descriptive link labels, and safe external-link attributes
- Updated homepage quick links to use in-app SPA navigation, avoiding full-page reloads when opening Main, Pending, Timeline, Legacy, or Leaderboard views

### Shared components and utilities (`87fcf22`)

The refactor reduces duplicated UI logic while preserving the existing card-based interface.

- **`src/utils/tags.js`:** centralizes Classic/Platformer tag lists, icons, labels, class names, and tooltip definitions for filters, cards, modals, and normalization
- **`src/utils/display.js`:** centralizes safe conversion and fallback handling for names, ranks, dates, lengths, and tags
- **`src/hooks/useLevelThumbnail.js`:** moves thumbnail lazy-loading and fallback behavior out of `LevelCard.jsx` so cards, modals, and backgrounds share one hook
- **`CardTags.jsx`:** owns overflow-aware card tags and their tooltips
- **`TruncatedCardName.jsx`:** isolates measured, binary-search name truncation
- **`FilterDrawer.jsx`:** separates mobile filter controls from the main header
- **`HeaderControls.jsx`:** shares mode, scale, Discord, and sort controls
- **`SelectDropdown.jsx`:** replaces separate drawer, sidebar, and leaderboard dropdown implementations
- **`PaginationControls.jsx`:** provides one pagination implementation for the homepage changelog and leaderboard
- **`constants/sortOptions.js`:** provides shared sort-field and sort-direction options
- **`utils/playerCountries.js`:** separates player/country lookup helpers from leaderboard aggregation and avoids circular utility dependencies

### Stylesheet reorganization (`87fcf22`)

- Reduced `src/styles.css` to an import manifest instead of a 4,000-line global stylesheet
- Split styles by ownership into `styles/base.css`, component stylesheets (`Header.css`, `FilterDrawer.css`, `LevelList.css`, `LevelModal.css`), and page stylesheets (`HomePage.css`, `LeaderboardPage.css`)
- Preserved the existing cascade while making component styling easier to locate and maintain

### Performance and rendering (`87fcf22`)

- Lazy-loads `LeaderboardPage` with React `lazy()` / `Suspense`, keeping leaderboard code out of the initial application render path
- Configures Vite to emit JSON data imports in a dedicated `data` chunk
- Corrects virtual-list offsets when grouped duplicate cards are expanded by measuring expanded rows and including their extra height in window calculations
- Uses `ResizeObserver` to keep virtualized row measurements accurate as grouped content changes size
- Keeps the existing Intersection Observer thumbnail loading and fallback chain, now through the extracted shared hook

### List, timeline, and leaderboard behavior (`87fcf22`)

- Timeline sorting now uses inferred dates when the stored date is missing or invalid, extending the earlier inferred-date display behavior to ordering
- Inferred timeline range labels now order neighboring dates chronologically
- Unknown pending estimates share the unresolved estimate sort tier instead of being placed in a separate trailing tier
- Expanded duplicate variants receive the projected-rank display setting consistently
- Player leaderboard `achievementCount` now counts all displayed achievements, including duplicate-associated records, so the count matches the board's achievement details and XP treatment
- Switching list tab or mode resets search, tag filters, sort field, and direction to prevent stale controls from leaking into another dataset
- Platformer navigation excludes Legacy, and invalid Platformer Legacy routes redirect to Platformer Main
- Leaderboard navigation preserves the current leaderboard mode and source when navigating within the leaderboard
- Modal copy feedback timers are cleaned up on unmount, and clipboard failures are handled without leaving rejected promises

### Tag display consistency (current follow-up)

- Level modals now consume the shared `TAG_DEFINITIONS` and `TAG_ICONS` registry used by the rest of the application
- Replaced modal-only text pseudo-glyphs with the shared Font Awesome icons and canonical display labels
- Added modal styling for shared tag classes, including the **Pending Removal** treatment

### Normalization and schema support (`87fcf22`)

- `normalize:entries` now normalizes and newest-first sorts all four changelog/milestone data sources
- Added dedicated list-changelog, timeline-changelog, and milestone field orders and normalizers
- Added changelog import aliases for alternate old/new name and rank headings
- Platformer Pending now uses its own pending-entry field order, including duplicate, notes, and estimate fields, instead of the Platformer Main schema
- Tag normalization imports the canonical order from `src/utils/tags.js`, removing a duplicated tag registry from the script

### Removed or superseded (`87fcf22`)

- Removed the unused **LIST** layout mode and its alternate grouped-card rendering; the application now has one card layout with adjustable scale
- Removed the obsolete `hideRank` prop chain; pending estimate/rank presentation is decided directly from entry context
- Removed unused homepage statistics calculations that were not rendered
- Removed obsolete duplicate helper exports and the unused `main/direction-c.jsx` source file
- Removed one-off migration scripts after their image/proof migrations were completed; `normalize:entries` remains the supported normalization path
- The committed modal pseudo-icon implementation was superseded by the shared tag registry integration described above and is therefore not recorded as a separate feature


## Features

### Entry normalization script (`e9e8401`, `c835988`)

`npm run normalize:entries` (`scripts/normalize-entries.mjs`) enforces a consistent JSON schema across all data files.

- Reorders fields per list type (Classic, Pending, Platformer); pending uses a separate field order (`estimateLower` / `estimateUpper` before video fields)
- Sorts tags to match `CLASSIC_TAGS` / `PLATFORMER_TAGS` from the canonical registry in `src/utils/tags.js`
- Fills missing schema fields with `null`; strips undeclared fields
- Normalizes `video` / `showcaseVideo` via shared `normalizeYouTubeUrl()` from `format.js`
- Sorts `pending.json` and `platformerpending.json` alphabetically by name
- Covers `legacy.json` in addition to the other data files
- Timeline entries use `TIMELINE_FIELD_ORDER` with `image` and `proof` fields (`3987c8d`)
- Spreadsheet import aliases (`Name` → `name`, etc.) via `applyFieldAliases()` (`10c2dbc`)
- Coerces `estimateLower` / `estimateUpper` through `normalizeEstimateField()` (`dce23bf`)
- Reports per-file change summaries when run

### Timeline inferred dates (`58b5242`)

Entries with missing or invalid `date` no longer show blank/`undefined` labels.

- `isValidDate()`, `buildTimelineDateLabelMap()`, `getTimelineEntryKey()` in `format.js`
- Display falls back to neighbor dates (e.g. `12 Mar 24 – 18 Mar 24`, or `?` when only one side is known)
- `LevelList` passes inferred labels to cards and modals via `timelineDateLabel`

### YouTube URL normalization (`58b5242`, folded into `c835988`)

- `normalizeYouTubeUrl()` canonicalizes watch/live/shorts/youtu.be links to `youtu.be/{id}` (preserving `?t=` start time)
- Fixes malformed schemes (`https:/…` → `https://…`)
- `getYouTubeVideoId()` now recognizes `/shorts/` URLs

### Duplicate grouping fix (`389fad7`)

Pending (or other) entries with `duplicateOf` pointing at a parent **in the same list** are grouped as variants. Entries referencing a parent **outside** the current list (e.g. pending child of a main-list level) now render as standalone cards instead of being dropped.

- New `isGroupedDuplicate()` in `groupDuplicates.js`; rank assignment and `totalCount` use it

### Rank projection slot logic (`c835988`)

`getProjectionSlot()` adjusts how pending entries are placed when their estimate range starts at or below the current main-list size (uses midpoint vs. baseline position).

### Mobile / small-viewport UI (`239bdc0`)

Responsive layout consolidated around a **1024px** breakpoint.

- Sidebar hidden below 1024px; filters, sort, mode, card scale, and projected-ranks toggle live in the nav drawer
- Removed the separate mobile filter modal; active-tag count badge moves to the nav button
- `overflow-x: clip` on `html`/`body`; list padding and card `max-width` fixes for narrow viewports
- Desktop sidebar sort controls stack vertically; projected-ranks toggle wired through `Header` props

### Grouped card variant toggle (`4910d5d`)

Duplicate expand/collapse button moved from bottom-right to the left edge of the thumbnail column for visibility. Added `aria-expanded`, `aria-controls`, and `type="button"`.

### Classic features extended to Platformer lists (`7e49b75`)

Rank projection, pending estimate search/sort, and estimate badges — previously Classic-only — now apply to **Platformer Main** and **Platformer Pending** as well.

- **`App.jsx`:** `isClassicMain` / `isClassicPending` replaced with mode-agnostic `isMainList` / `isPendingList`
- **Projection:** `buildMainProjection()` selects `achievementsData` + `pendingData` (Classic) or `platformersData` + `platformerpendingData` (Platformer) based on the active mode
- **Sidebar toggle:** "Projected ranks" now available on both Classic Main and Platformer Main
- **Pending list:** estimate-based sort, estimate search, and estimate rank badges work on Platformer Pending (no longer hidden behind Classic-only checks)
- **`data/pending.json`:** `estimateLower` / `estimateUpper` added to 12 additional Classic pending entries
- **`data/platformertimeline.json`:** removed static `rank` fields from all 23 entries — timeline rank is now derived from list order, consistent with Classic Timeline

### Rank projection system (`be87c3d`, extended in `7e49b75`)

A rank projection system simulates how the **Main** list (Classic or Platformer) would reorder once pending submissions are placed.

- **New utility:** `src/utils/estimateRank.js`
  - `buildMainProjection()` — merges main + pending entries by estimate midpoint and computes projected ranks for main-list items
  - `hasEstimate()` / `formatEstimateDisplay()` — reads `estimateLower` / `estimateUpper` on pending entries
  - `comparePendingEstimate()` — sorts the Classic Pending list by estimate range
  - `matchesEstimateSearch()` — lets search match estimate ranges (e.g. `#2`, `#1 to #11`, or "Unknown projection")
- **Pending data:** `estimateLower` and `estimateUpper` fields added to pending entries in `data/pending.json`
- **UI toggle:** "Projected ranks" checkbox in the sidebar (Main list in either mode), persisted to `localStorage` as `hd-show-projected-ranks`
- **Display:** Main-list cards/modals show `current → projected` rank badges when a shift is predicted; pending list shows estimate badges (e.g. `#2 to #11`) instead of hiding rank entirely
- **Tooltip:** `ProjectedRankTooltipContent` explains the shift and delta

### Pending Removal tag (`b5114d5`)

New tag for levels marked for removal due to redundancy.

- Added to `CLASSIC_TAGS` and `PLATFORMER_TAGS` (now centralized in `src/utils/tags.js`)
- Tag definition and icon (`fa-trash-can`) are centralized in `src/utils/tags.js`; presentation lives in the owning component stylesheets
- Visual treatment on cards, modals, and leaderboard rows (`is-pending-removal` class — red accent border/background)
- Applied to at least one entry in `data/achievements.json`

### Thumbnail retrieval & loading (`42a6077`, `45f1b3c`)

Major overhaul of how level thumbnails are fetched and displayed.

- **Shared hook:** `useLevelThumbnail()` (now located in `src/hooks/useLevelThumbnail.js`)
  - Intersection Observer lazy-loading (200px root margin)
  - Fallback chain: explicit thumbnail → levelthumbs.prevter.me (high/small/default) → YouTube showcase → YouTube player video
  - Rejects images below 200×200 px and tries the next URL in sequence
  - Used by `LevelCard`, `LevelModal`, and the app background (`AppBackground` in `App.jsx`)
- **`format.js` changes:**
  - `getThumbnailUrlSequence()` now memoized (LRU cache, 500 entries)
  - `normalizeThumbnail()` handles GitHub blob URLs
  - Level thumb API: `https://levelthumbs.prevter.me/thumbnail/{levelID}/…`
- **`index.html`:** preconnect hints for `levelthumbs.prevter.me`, `img.youtube.com`, `i.ytimg.com`
- **Card styling:** thumbnail applied via CSS variable `--thumb-url` on the card element (background image on `.card__content`)

### YouTube embed timestamps (`010a7a9`)

Videos with `?t=` or `?start=` parameters now play from the correct timestamp in embedded iframes.

- **New helpers in `format.js`:** `getYouTubeStartSeconds()`, `getYouTubeEmbedUrl()`
- **`LevelModal.jsx`:** iframes use `getYouTubeEmbedUrl()` instead of bare video ID embed URLs

### Font Awesome bundle fix (`dce23bf`)

Sidebar/tab icons were invisible because the Google Fonts URL used `andfamily=` instead of `&family=`, and the Font Awesome CDN link was unreliable.

- **`@fortawesome/fontawesome-free`** added as an npm dependency and imported in `main.jsx`
- CDN Font Awesome link removed from `index.html`; Google Fonts URL corrected

### NLW pending estimates & projection sorting (`dce23bf`, refined in `10c2dbc`)

Pending rank projection now understands **Not List Worthy** estimate bounds and sorts more consistently.

- **`estimateRank.js`:** `NLW_ESTIMATE`, `normalizeEstimateField()`, `getResolvedBounds()`, `getResolvedMidpoint()`, `hasResolvableEstimate()`
- Estimate strings `"NLW"` / `"Not List Worthy"` map to tail-of-list projection slots; pure NLW shows **Questionable to be List Worthy**; mixed numeric/NLW ranges get labeled bounds
- Invalid estimate input displays as **undefined**; unknown/missing as **Unknown projection**
- `comparePendingEstimate()` and `buildMainProjection()` use resolved bounds/midpoints; `getProjectionSlot()` respects NLW tail placement
- **`normalize-entries.mjs`:** coerces estimate fields via shared `normalizeEstimateField()`

### Notes display (`48b392a`, `10c2dbc`)

The `notes` field supports a single string or a string array (multi-paragraph entries).

- **`format.js`:** `getNotesParts()`, `getNotesPreview()`, `getNotesFullText()`, `hasNotes()`, `hasNotesBeyondPreview()`, `getNotesExtraCount()`, viewport-aware `truncateNotesPreview()`
- **`LevelCard.jsx`:** `CardNoteButton` with hover tooltip (first note preview + “+N more” hint); corner note icon on card layout
- **`LevelModal.jsx`:** dedicated Notes section with full joined text
- **`GroupedLevelCard`:** note button/tooltip on grouped variants
- Leaderboard achievement rows show note preview via `title` attribute

### Leaderboard rework & regional rankings (`5269d38`, extended in `3987c8d`)

The leaderboard was rebuilt as a unified page with three modes and Classic/Platformer data sources.

- **New utilities:** `src/utils/leaderboard.js`, `src/utils/countryLeaderboard.js`
  - XP formula: `1000 × positionPercent^2.4` (minimum 0.01 XP); duplicate variants inherit parent list position for scoring
  - `buildPlayerBoard()`, `buildSubmissionBoard()`, `buildCountryBoard()` with competition ranks for tied submission counts
  - Cross-list rank resolution via Classic + Platformer position maps
- **`LeaderboardPage.jsx`:** Players / Countries / Submissions tabs; Classic vs Platformer source toggle; search, sort, pagination; expandable detail panel with achievement lists
- **`CountryFilterModal.jsx`:** multi-select country filter with flag icons; **Unknown** option for players without a mapped country
- **`data/playercountries.json`:** player → ISO 3166-1 alpha-2 code map (supports multi-country arrays, e.g. dual nationality)
- **Routes:** `/leaderboard/players`, `/leaderboard/countries`, `/leaderboard/submission` (+ `/platformer` variants)
- **`ModLeaderboardPage.jsx` removed** — submitter leaderboard lives under Submissions mode
- Country detail view toggles between contributing players and aggregated achievements
- Replacement-duplicate and pending-submission rows get distinct styling; clickable rows open the level modal

### Legacy List restoration (`3987c8d`)

The archived **Legacy** tab returns in the main navigation.

- **`App.jsx`:** `LEGACY` list in `DATA_MAP`; `legacyRankOffset` continues rank numbering after the current Main list size
- **`data/legacy.json`:** re-normalized and populated (~100 entries) with the same schema as Classic Main
- **`Header.jsx`:** Legacy tab with archive icon; Classic-only (no Platformer legacy list)
- **`HomePage.jsx`:** Legacy is available from the homepage's SPA quick navigation
- Leaderboard player/submission boards include legacy-sourced achievements

### Timeline video vs. proof separation (`3987c8d`)

Classic Timeline entries now distinguish watchable videos from static/image proofs.

- **Schema:** timeline-only `image` (PNG/screenshot proof) and `proof` (external proof URL) fields — separate from `video` / `showcaseVideo`
- **`LevelModal.jsx`:** Achievement Video embeds (YouTube/Twitch) vs **Achievement Proof** image panel vs **View Proof** external link
- **`format.js`:** `normalizeImageUrl()`, `normalizeProofUrl()`, `isWatchableAchievementUrl()` (YouTube + Twitch)
- **`data/timeline.json`:** legacy combined proof URLs split into `image` or `proof` as appropriate
- **`images/proofs/`:** 12 local PNG proof assets; GitHub raw URLs updated via migration scripts

### Image asset path migration (`3987c8d`)

Manual thumbnails and proofs moved under `images/`.

- **`thumbnails/` → `images/thumbnails/`** — all manual override PNGs relocated; JSON thumbnail URLs updated to `…/images/thumbnails/…`
- **`normalizeThumbnail()`** and normalize script paths aligned with the new directory layout
- **Migration scripts:** `migrate-image-urls.mjs`, `split-timeline-image-proof.mjs`, `apply-github-proof-urls.mjs` (one-off migrations, since removed — superseded by `normalize-entries.mjs`)

### Cross-list replacement duplicates (`3987c8d`)

Duplicate grouping expanded for replacement variants and multi-parent links.

- **`duplicateOf`** accepts `string | string[] | null`; `getDuplicateParentIds()` normalizes to a unique parent list
- **`isReplacementDuplicate()`**, **`isCrossListReplacementPair()`**, **`getCrossListReplacementParents()`** — pending/main cross-list replacements tagged with `isReplacement` for UI and leaderboard XP
- **`getDuplicateGroupLabel()`** distinguishes replacement groups in grouped cards
- Grouped cards and leaderboard show replacement styling (`is-replacement` class)

---

## Data changes

### Field rename: `id` → `levelID` (`45f1b3c`)

All JSON data files normalized to use `levelID` instead of `id`. No remaining `"id":` fields in `data/`.

| File | Approx. entries with `levelID` |
|------|-------------------------------|
| `achievements.json` | 100 |
| `legacy.json` | 100 |
| `pending.json` | 91 |
| `timeline.json` | 83 |
| `platformers.json` | 84 |
| `platformertimeline.json` | 19 |
| `platformerpending.json` | 10 |

React keys and duplicate grouping updated to use `levelID` (fallback: `name`).

### Other data updates

- **`achievements.json`** — tag additions (including Pending Removal, Noclip, Speedhack, Miscellaneous), field reordering, schema null-fill (~ongoing maintenance across multiple commits)
- **`legacy.json`** — re-populated and normalized in `3987c8d` (~100 entries); included in leaderboard scoring
- **`timeline.json`** / **`platformertimeline.json`** — field order and content updates; invalid dates handled in UI; Classic timeline gains `image` + `proof` fields (`3987c8d`)
- **`pending.json`** / **`platformerpending.json`** — `estimateLower` / `estimateUpper` on additional entries; NLW string estimates supported; alphabetical sort via normalize script; `undefined` values replaced with `null`
- **`platformertimeline.json`** — static `rank` fields removed; ordering is positional (`7e49b75`)
- **`playercountries.json`** — **new** player nationality map for regional leaderboard (`5269d38`)
- **`images/thumbnails/`** — manual thumbnail PNG overrides (migrated from `thumbnails/` in `3987c8d`)
- **`images/proofs/`** — timeline screenshot proofs (`3987c8d`)
- **`achievements.json`** — multi-line `notes` arrays on select entries (`48b392a`)

---

## UI / UX improvements

### Responsive layout (`239bdc0`)

- Breakpoint raised from 640px to **1024px** for hiding sidebar and showing mobile drawer controls
- Drawer includes card scale sliders, sort direction dropdown (`DrawerSelect`), and projected-ranks checkbox
- Filter badge on nav button reflects active tag count

### Filter chips (`c59a8b7`, `be87c3d`)

- Filter chips no longer show inline tag icons — text-only labels for a cleaner look
- Chips use consistent `min-width`, flex centering, and improved tooltip container alignment
- **Tag filter behavior change:** sidebar now shows the full predefined tag list (`CLASSIC_TAGS` / `PLATFORMER_TAGS`) instead of only tags present in the current dataset

### Sidebar & sorting (`be87c3d`)

- Sort direction changed to a dedicated **Ascending / Descending** sidebar dropdown (now implemented by shared `SelectDropdown`)
- Collapse button redesigned: full-width with "Hide panel" / "Show panel" label; vertical label when collapsed
- Accessibility: `aria-label`, `aria-expanded`, `type="button"` on controls

### Tooltips (`be87c3d`)

- Rewritten `Tooltip.jsx` — portals to `document.body`, viewport-aware positioning (flips above/below), scroll/resize tracking
- Supports rich `content` prop (used for projected rank tooltips) in addition to plain `text`
- Updated `Tooltip.css` with portal styles and projection tooltip layout

### Rank badge styling

- Improved contrast (`color: var(--ink)`), tabular numerals, text shadow
- Unknown estimate badge variant (`card__rank-badge--unknown`, `modal__rank--unknown`)
- Projection arrow badge (`rank-projection`, `rank-projection--single` when toggle is off)

### Assets

- **`public/THAL.png`** restored (logo used in `index.html` preload)

### Mobile header & sidebar (`dce23bf`, `48b392a`)

- Drawer/nav icon visibility restored; additional small-screen spacing and overflow fixes
- Grouped-card layout edge cases on narrow viewports

### Notes & card tooltips (`48b392a`, `10c2dbc`)

- Viewport-scaled note preview tooltips on cards; full notes in modal
- Note tooltip styles in `Tooltip.css`

### Leaderboard UI (`5269d38`, `3987c8d`)

- Full-page leaderboard layout with sticky header, sidebar detail panel, and pagination
- Country flags via `flagcdn.com`; country filter modal; mobile layout at 640px
- Player/country/submission mode toggles and Classic/Platformer source switch

---

## Files changed by area

### Application core
- `src/App.jsx` — projection state, `AppBackground`, pending estimate search/sort; mode-agnostic Main/Pending list handling (`7e49b75`); `isGroupedDuplicate` for rank/count (`389fad7`); Header projection props (`239bdc0`); Legacy list + rank offset (`3987c8d`); leaderboard routing (`5269d38`); changelog data wiring, inferred timeline sort maps, and lazy leaderboard loading (`87fcf22`)
- `src/utils/estimateRank.js` — projection logic; NLW estimates + resolved bounds (`dce23bf`, `10c2dbc`); `getProjectionSlot()` (`c835988`)
- `src/utils/format.js` — YouTube timestamps & normalization, thumbnail memoization, levelthumbs API, timeline date inference (`58b5242`); notes helpers + proof/image URL helpers (`48b392a`, `3987c8d`); `formatDisplayVersion()` (`10c2dbc`)
- `src/utils/groupDuplicates.js` — `isGroupedDuplicate()`, cross-list duplicate handling (`389fad7`); multi-parent `duplicateOf`, replacement duplicates (`3987c8d`)
- `src/utils/leaderboard.js` — **new** XP/player/submission board logic (`5269d38`)
- `src/utils/countryLeaderboard.js` — **new** regional aggregation (`5269d38`)
- `scripts/normalize-entries.mjs` — data normalization (`e9e8401`, expanded `c835988`, `10c2dbc`, `3987c8d`); timeline `image`/`proof` field order; field aliases; estimate coercion
- `scripts/migrate-image-urls.mjs`, `split-timeline-image-proof.mjs`, `apply-github-proof-urls.mjs` — one-off asset URL migration (`3987c8d`); removed after migration completed (superseded by `normalize-entries.mjs`)
- `package.json` — `normalize:entries` script; `@fortawesome/fontawesome-free` (`dce23bf`)

### Components
- `src/components/LevelCard.jsx` — projection/estimate badges, pending removal styling, timeline date label, and note tooltips; thumbnail loading now lives in `src/hooks/useLevelThumbnail.js`, while tag overflow and measured-name logic live in `CardTags.jsx` and `TruncatedCardName.jsx`
- `src/components/LevelModal.jsx` — shared thumbnail hook, projection ranks, embed URL fix, timeline date label; notes section; video vs image proof sections (`3987c8d`)
- `src/components/LevelList.jsx` — projection toggle, sort direction select, timeline date label map (`58b5242`); replacement duplicate handling (`3987c8d`)
- `src/components/GroupedLevelCard.jsx` / `.css` — projection + estimate props; variant toggle repositioned (`4910d5d`); notes on variants (`48b392a`); replacement styling (`3987c8d`)
- `src/components/Header.jsx` — chip icon removal, responsive navigation, and Legacy tab (`3987c8d`); mobile filters moved to `FilterDrawer.jsx`, controls to `HeaderControls.jsx`, and tag definitions to `src/utils/tags.js` in `87fcf22`
- `src/components/CountryFilterModal.jsx` — **new** regional filter UI (`5269d38`)
- `src/components/Tooltip.jsx` — portal-based positioning, projection content
- `src/components/Tooltip.css` — portal + projection + note tooltip styles

### Pages
- `src/pages/LeaderboardPage.jsx` — full rewrite: players/countries/submissions, XP scoring, country filter, pagination (`5269d38`); legacy source + replacement styling (`3987c8d`)
- `src/pages/HomePage.jsx` — staff/community layout, SPA quick navigation, and tabbed/paginated Changelog panel (`87fcf22`)
- ~~`src/pages/ModLeaderboardPage.jsx`~~ — **removed**; submitter view merged into `LeaderboardPage` submissions mode (`5269d38`)

### Styles & HTML
- `src/styles.css` — import manifest for the split style architecture; global foundations live in `src/styles/base.css`, with header, drawer, list, modal, homepage, and leaderboard rules in their corresponding component/page stylesheets (`87fcf22`)
- `index.html` — preconnect + logo preload; Font Awesome CDN removed (`dce23bf`)
- `src/main.jsx` — Font Awesome npm import (`dce23bf`)

### Data
- `data/*.json` — schema normalization, tag/field ordering, estimate fields, timeline rank cleanup, timeline proof split
- `data/playercountries.json` — player country codes
- `images/thumbnails/*.png`, `images/proofs/*.png` — manual image assets

---

## Breaking / migration notes

1. **Data schema:** Any code or scripts expecting an `id` field on level entries must use `levelID` instead.
2. **Data schema:** All list types and changelog/milestone feeds now declare fixed field sets; missing list-entry values are `null`. Run `npm run normalize:entries` after manual edits. Undeclared fields are stripped, and history feeds are sorted newest-first.
3. **Pending entries:** To participate in rank projection, entries need `estimateLower` and `estimateUpper` (finite numbers, `"NLW"`, or `"Not List Worthy"`; `lower ≤ upper` when both numeric). Missing estimates sort last and display as "Unknown projection". Applies to both Classic and Platformer pending lists.
4. **Timeline data:** `platformertimeline.json` no longer stores per-entry `rank`; position in the array defines display order. Invalid/missing `date` values are inferred in the UI from neighbors. Classic `timeline.json` uses separate `image` (screenshot) and `proof` (URL) fields — not interchangeable with `video`.
5. **Thumbnail sources:** The app now depends on `levelthumbs.prevter.me` as a fallback; network access to that host improves thumbnail coverage. Manual overrides live under **`images/thumbnails/`** (not `thumbnails/`).
6. **Local storage:** New key `hd-show-projected-ranks` (`"true"` / `"false"`).
7. **Duplicate grouping:** `duplicateOf` only groups an entry as a variant when the referenced parent exists in the **same** list. Value may be a string or string array. Cross-list replacement pairs get `isReplacement` tagging instead of grouping.
8. **Notes field:** `notes` may be `null`, a string, or a string array; arrays are joined with blank lines in the modal.
9. **Leaderboard routes:** `/leaderboard/mod` is removed; use `/leaderboard/submission` (or `/leaderboard/submission/platformer`). Player and country boards accept optional `/platformer` suffix.
10. **Player countries:** Regional leaderboard reads `data/playercountries.json`; unmapped players appear only when filtering by **Unknown**.

---

## Generate this range again

```bash
git log 79cbce020a5064635d58be7ffca70ac64f9039a4..HEAD --oneline
git diff 79cbce020a5064635d58be7ffca70ac64f9039a4..HEAD --stat
```
