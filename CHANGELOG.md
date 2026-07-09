# Changelog

Changes from `79cbce0` (*Standardizing JSON field order and tag arrays format & order on achievement.json while also adding noclip and other tags to some entries*) through `239bdc0` (*Fixing UI bug on smaller viewport and adding tags & fixing undefined value on entries*).

**Range:** 2026-07-07 → 2026-07-09  
**Commits:** 13 (feature); 66 total in range  
**Files changed:** 47 (+19,372 / −13,834 lines)

---

## Summary

This period focused on data normalization (`id` → `levelID`, schema enforcement via `normalize:entries`), pending-submission rank projections (now shared across Classic and Platformer lists), thumbnail loading improvements, timeline date inference, YouTube URL normalization, duplicate-grouping fixes, a new **Pending Removal** tag, and responsive UI work (mobile drawer, sidebar breakpoint at 1024px).

---

## Commits (newest first)

| Commit   | Date       | Description |
|----------|------------|-------------|
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

---

## Features

### Entry normalization script (`e9e8401`, `c835988`)

`npm run normalize:entries` (`scripts/normalize-entries.mjs`) enforces a consistent JSON schema across all data files.

- Reorders fields per list type (Classic, Pending, Platformer); pending uses a separate field order (`estimateLower` / `estimateUpper` before video fields)
- Sorts tags to match `CLASSIC_TAGS` / `PLATFORMER_TAGS` in `App.jsx`
- Fills missing schema fields with `null`; strips undeclared fields
- Normalizes `video` / `showcaseVideo` via shared `normalizeYouTubeUrl()` from `format.js`
- Sorts `pending.json` and `platformerpending.json` alphabetically by name
- Covers `legacy.json` in addition to the other data files
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

- Added to `CLASSIC_TAGS` and `PLATFORMER_TAGS` in `App.jsx`
- Tag definition, icon (`fa-trash-can`), and styling in `Header.jsx` / `styles.css`
- Visual treatment on cards, modals, and leaderboard rows (`is-pending-removal` class — red accent border/background)
- Applied to at least one entry in `data/achievements.json`

### Thumbnail retrieval & loading (`42a6077`, `45f1b3c`)

Major overhaul of how level thumbnails are fetched and displayed.

- **New hook:** `useLevelThumbnail()` exported from `LevelCard.jsx`
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
- **`legacy.json`** — large structural normalization (~19,540 lines touched); now included in `normalize:entries`
- **`timeline.json`** / **`platformertimeline.json`** — field order and content updates; invalid dates handled in UI
- **`pending.json`** / **`platformerpending.json`** — `estimateLower` / `estimateUpper` on additional entries; alphabetical sort via normalize script; `undefined` values replaced with `null`
- **`platformertimeline.json`** — static `rank` fields removed; ordering is positional (`7e49b75`)
- **`thumbnails/`** — manual thumbnail PNG overrides added for several levels

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

- Sort direction changed from a toggle button to a dedicated **Ascending / Descending** dropdown (`SidebarSelect`)
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

---

## Files changed by area

### Application core
- `src/App.jsx` — projection state, `AppBackground`, pending estimate search/sort, tag list source; mode-agnostic Main/Pending list handling (`7e49b75`); `isGroupedDuplicate` for rank/count (`389fad7`); Header projection props (`239bdc0`)
- `src/utils/estimateRank.js` — projection logic; `getProjectionSlot()` (`c835988`)
- `src/utils/format.js` — YouTube timestamps & normalization, thumbnail memoization, levelthumbs API, timeline date inference (`58b5242`)
- `src/utils/groupDuplicates.js` — `isGroupedDuplicate()`, cross-list duplicate handling (`389fad7`)
- `scripts/normalize-entries.mjs` — **new** data normalization (`e9e8401`, expanded `c835988`)
- `package.json` — `normalize:entries` script

### Components
- `src/components/LevelCard.jsx` — `useLevelThumbnail` hook, projection/estimate badges, pending removal styling, timeline date label
- `src/components/LevelModal.jsx` — shared thumbnail hook, projection ranks, embed URL fix, timeline date label
- `src/components/LevelList.jsx` — projection toggle, sort direction select, timeline date label map (`58b5242`)
- `src/components/GroupedLevelCard.jsx` / `.css` — projection + estimate props; variant toggle repositioned (`4910d5d`)
- `src/components/Header.jsx` — Pending Removal tag; chip icon removal; mobile drawer controls (`239bdc0`); tag defs for Noclip, Speedhack, Miscellaneous
- `src/components/Tooltip.jsx` — portal-based positioning, projection content
- `src/components/Tooltip.css` — renamed from `tooltip.css`; portal + projection styles

### Pages
- `src/pages/LeaderboardPage.jsx` — pending removal styling on achievement rows
- `src/pages/ModLeaderboardPage.jsx` — pending removal styling on submission rows

### Styles & HTML
- `src/styles.css` — chips, sidebar, projection badges, pending removal theme, responsive drawer/breakpoint (`239bdc0`)
- `index.html` — preconnect + logo preload

### Data
- `data/*.json` — schema normalization, tag/field ordering, estimate fields, timeline rank cleanup
- `thumbnails/*.png` — manual thumbnail overrides

---

## Breaking / migration notes

1. **Data schema:** Any code or scripts expecting an `id` field on level entries must use `levelID` instead.
2. **Data schema:** All list types now declare a fixed field set; missing values are `null`. Run `npm run normalize:entries` after manual edits. Undeclared fields are stripped.
3. **Pending entries:** To participate in rank projection, entries need `estimateLower` and `estimateUpper` (finite numbers, `lower ≤ upper`). Missing estimates sort last and display as "Unknown projection". Applies to both Classic and Platformer pending lists.
4. **Timeline data:** `platformertimeline.json` no longer stores per-entry `rank`; position in the array defines display order. Invalid/missing `date` values are inferred in the UI from neighbors.
5. **Thumbnail sources:** The app now depends on `levelthumbs.prevter.me` as a fallback; network access to that host improves thumbnail coverage.
6. **Local storage:** New key `hd-show-projected-ranks` (`"true"` / `"false"`).
7. **Duplicate grouping:** `duplicateOf` only groups an entry as a variant when the referenced parent exists in the **same** list.

---

## Generate this range again

```bash
git log 79cbce020a5064635d58be7ffca70ac64f9039a4..HEAD --oneline
git diff 79cbce020a5064635d58be7ffca70ac64f9039a4..HEAD --stat
```
