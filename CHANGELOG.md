# Changelog

Changes from `79cbce0` (*Standardizing JSON field order and tag arrays format & order on achievement.json while also adding noclip and other tags to some entries*) through `c59a8b7` (*Minor UI Improvement on filter chips*).

**Range:** 2026-07-07 → 2026-07-08  
**Commits:** 6  
**Files changed:** 21 (+12,295 / −12,558 lines)

---

## Summary

This period focused on data normalization (`id` → `levelID`), pending-submission rank projections, thumbnail loading improvements, a new **Pending Removal** tag, YouTube embed timestamp fixes, and several UI/UX refinements across cards, filters, tooltips, and the sidebar.

---

## Commits (newest first)

| Commit   | Date       | Description |
|----------|------------|-------------|
| `c59a8b7` | 2026-07-08 | Minor UI improvement on filter chips |
| `42a6077` | 2026-07-08 | Improving level thumbnail retrieval & loading system |
| `b5114d5` | 2026-07-07 | Adding Pending Removal tags |
| `be87c3d` | 2026-07-07 | Adding rank projection system that works with pending submissions + minor UI improvement |
| `45f1b3c` | 2026-07-07 | Normalizing all instances of `id` into `levelID` and restoring logo image |
| `010a7a9` | 2026-07-07 | Fixing timestamp not working on iframe embed video |

---

## Features

### Rank projection system (`be87c3d`)

A new rank projection system simulates how the **Classic Main** list would reorder once pending submissions are placed.

- **New utility:** `src/utils/estimateRank.js`
  - `buildMainProjection()` — merges main + pending entries by estimate midpoint and computes projected ranks for main-list items
  - `hasEstimate()` / `formatEstimateDisplay()` — reads `estimateLower` / `estimateUpper` on pending entries
  - `comparePendingEstimate()` — sorts the Classic Pending list by estimate range
  - `matchesEstimateSearch()` — lets search match estimate ranges (e.g. `#2`, `#1 to #11`, or "Unknown projection")
- **Pending data:** `estimateLower` and `estimateUpper` fields added to pending entries in `data/pending.json`
- **UI toggle:** "Projected ranks" checkbox in the sidebar (Classic Main only), persisted to `localStorage` as `hd-show-projected-ranks`
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

- **`achievements.json`** — tag additions (including Pending Removal), field reordering, `id` removal (~1,069 line diff; mostly structural)
- **`legacy.json`** — large structural normalization (~19,540 lines touched)
- **`timeline.json`** / **`platformertimeline.json`** — field order and content updates
- **`pending.json`** — `estimateLower` / `estimateUpper` on sample entries

---

## UI / UX improvements

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
- Updated `tooltip.css` with portal styles and projection tooltip layout

### Rank badge styling

- Improved contrast (`color: var(--ink)`), tabular numerals, text shadow
- Unknown estimate badge variant (`card__rank-badge--unknown`, `modal__rank--unknown`)
- Projection arrow badge (`rank-projection`, `rank-projection--single` when toggle is off)

### Assets

- **`public/THAL.png`** restored (logo used in `index.html` preload)

---

## Files changed by area

### Application core
- `src/App.jsx` — projection state, `AppBackground`, pending estimate search/sort, tag list source
- `src/utils/estimateRank.js` — **new** projection logic
- `src/utils/format.js` — YouTube timestamps, thumbnail memoization, levelthumbs API

### Components
- `src/components/LevelCard.jsx` — `useLevelThumbnail` hook, projection/estimate badges, pending removal styling
- `src/components/LevelModal.jsx` — shared thumbnail hook, projection ranks, embed URL fix
- `src/components/LevelList.jsx` — projection toggle, sort direction select, prop passthrough
- `src/components/GroupedLevelCard.jsx` — projection + estimate props
- `src/components/Header.jsx` — Pending Removal tag; chip icon removal
- `src/components/Tooltip.jsx` — portal-based positioning, projection content
- `src/components/tooltip.css` — portal + projection styles

### Pages
- `src/pages/LeaderboardPage.jsx` — pending removal styling on achievement rows
- `src/pages/ModLeaderboardPage.jsx` — pending removal styling on submission rows

### Styles & HTML
- `src/styles.css` — chips, sidebar, projection badges, pending removal theme (~283 lines)
- `index.html` — preconnect + logo preload

### Data
- `data/achievements.json`, `data/legacy.json`, `data/timeline.json`, `data/platformertimeline.json`, `data/pending.json`

---

## Breaking / migration notes

1. **Data schema:** Any code or scripts expecting an `id` field on level entries must use `levelID` instead.
2. **Pending entries:** To participate in rank projection, entries need `estimateLower` and `estimateUpper` (finite numbers, `lower ≤ upper`). Missing estimates sort last and display as "Unknown projection".
3. **Thumbnail sources:** The app now depends on `levelthumbs.prevter.me` as a fallback; network access to that host improves thumbnail coverage.
4. **Local storage:** New key `hd-show-projected-ranks` (`"true"` / `"false"`).

---

## Generate this range again

```bash
git log 79cbce020a5064635d58be7ffca70ac64f9039a4..HEAD --oneline
git diff 79cbce020a5064635d58be7ffca70ac64f9039a4..HEAD --stat
```
