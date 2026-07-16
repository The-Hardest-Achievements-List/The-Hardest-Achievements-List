import {
  getDuplicateParentIds,
  isGroupedDuplicate,
  isPendingListSource,
  isReplacementDuplicate,
} from "./groupDuplicates.js";
import {
  resolvePlayerCountries,
  resolvePlayerCountry,
} from "./playerCountries.js";

export const POINTS = {
  baseScore: 1000,
  rankExponent: 2.4,
  minXp: 0.01,
};

export const SORT_DIR_OPTIONS = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

export function getLeaderboardPath(mode, listSource) {
  if (mode === "players") {
    return listSource === "platformer"
      ? "/leaderboard/players/platformer"
      : "/leaderboard/players";
  }
  if (mode === "countries") {
    return listSource === "platformer"
      ? "/leaderboard/countries/platformer"
      : "/leaderboard/countries";
  }
  if (mode === "submissions") {
    return listSource === "platformer"
      ? "/leaderboard/submission/platformer"
      : "/leaderboard/submission";
  }
  return "/leaderboard/players";
}

function normalizeNameKey(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function findParentEntries(entry, entries) {
  const parentRefs = getDuplicateParentIds(entry);
  if (parentRefs.length === 0) return [];

  const parentKeys = new Set(parentRefs.map(normalizeNameKey));
  return entries.filter(
    (candidate) =>
      !isGroupedDuplicate(candidate, entries) &&
      parentKeys.has(normalizeNameKey(candidate?.name)),
  );
}

export function calculateXp(position, listSize) {
  const p = Math.max(1, Number(position) || 1);
  const n = Math.max(1, Number(listSize) || 1);
  const positionPercent = n === 1 ? 1 : 1 - (p - 1) / Math.max(1, n - 1);
  const points =
    Math.pow(positionPercent, POINTS.rankExponent) * POINTS.baseScore;
  const rounded = Math.round(points * 100) / 100;
  return Math.max(POINTS.minXp, rounded);
}

/** Shared XP-then-best-rank comparison; returns 0 on a full tie so callers
 * can apply their own final tiebreaker. */
export function compareByXpAndBestRank(a, b) {
  if (b.totalXP !== a.totalXP) return b.totalXP - a.totalXP;
  const rankA = a.bestRank ?? Number.POSITIVE_INFINITY;
  const rankB = b.bestRank ?? Number.POSITIVE_INFINITY;
  if (rankA !== rankB) return rankA - rankB;
  return 0;
}

function compareByXpThenBestRank(a, b) {
  return (
    compareByXpAndBestRank(a, b) ||
    String(a.name ?? "").localeCompare(String(b.name ?? ""))
  );
}

export function getEntryRank(entry) {
  return entry?.listPosition ?? entry?.rank ?? null;
}

function sortByListPosition(entries) {
  return [...entries].sort((a, b) => {
    const pendingA = isPendingListSource(a) ? 1 : 0;
    const pendingB = isPendingListSource(b) ? 1 : 0;
    if (pendingA !== pendingB) return pendingA - pendingB;
    return (
      (getEntryRank(a) ?? Number.POSITIVE_INFINITY) -
      (getEntryRank(b) ?? Number.POSITIVE_INFINITY)
    );
  });
}

export function withListPositions(entries) {
  return entries.map((entry, index) => ({
    ...entry,
    listPosition: index + 1,
    listSize: entries.length,
  }));
}

export function withGlobalRank(rows) {
  return rows.map((row, index) => ({
    ...row,
    globalRank: index + 1,
  }));
}

/** Competition ranks (1, 2, 2, 4). Rows must already be sorted by score. */
export function withCompetitionRank(rows, getScore) {
  const result = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const globalRank =
      index > 0 && getScore(row) === getScore(rows[index - 1])
        ? result[index - 1].globalRank
        : index + 1;

    result.push({ ...row, globalRank });
  }

  return result;
}

export function buildListPositionMap(entries) {
  const map = new Map();
  const positioned = withListPositions(entries);

  for (const entry of positioned) {
    if (isGroupedDuplicate(entry, entries)) continue;
    map.set(normalizeNameKey(entry.name), entry.listPosition);
  }

  return map;
}

function resolveListPositionFromMaps(nameKey, classicMap, platformerMap) {
  const classicRank = classicMap.get(nameKey);
  const platformerRank = platformerMap.get(nameKey);

  if (classicRank != null && platformerRank != null) {
    return Math.min(classicRank, platformerRank);
  }

  return classicRank ?? platformerRank ?? null;
}

export function resolveAchievementListPosition(entry, classicMap, platformerMap) {
  const parentRefs = getDuplicateParentIds(entry);
  // Pending replacements link to a main-list parent via duplicateOf, but they
  // are not on that list yet — do not inherit the parent's rank for display.
  if (parentRefs.length > 0 && !isPendingListSource(entry)) {
    let bestRank = null;
    for (const parentRef of parentRefs) {
      const parentRank = resolveListPositionFromMaps(
        normalizeNameKey(parentRef),
        classicMap,
        platformerMap,
      );
      if (parentRank == null) continue;
      if (bestRank == null || parentRank < bestRank) bestRank = parentRank;
    }
    if (bestRank != null) return bestRank;
  }

  return resolveListPositionFromMaps(
    normalizeNameKey(entry.name),
    classicMap,
    platformerMap,
  );
}

export function buildPositionByNameMap(entriesWithPosition) {
  const map = new Map();

  for (const entry of entriesWithPosition) {
    map.set(normalizeNameKey(entry.name), entry.listPosition);
  }

  return map;
}

export function resolveAchievementXpPosition(
  entry,
  entriesWithPosition,
  positionByName,
) {
  if (isGroupedDuplicate(entry, entriesWithPosition)) {
    const parentRefs = getDuplicateParentIds(entry);
    let bestPosition = null;
    for (const parentRef of parentRefs) {
      const parentPosition = positionByName.get(normalizeNameKey(parentRef));
      if (parentPosition == null) continue;
      if (bestPosition == null || parentPosition < bestPosition) {
        bestPosition = parentPosition;
      }
    }
    if (bestPosition != null) return bestPosition;
  }

  return entry.listPosition;
}

export function buildPlayerBoard(entries, playerCountries = null) {
  const mainEntries = [];
  const pendingEntries = [];

  for (const entry of entries) {
    if (isPendingListSource(entry)) pendingEntries.push(entry);
    else mainEntries.push(entry);
  }

  // Rank/XP sizing comes from the main list only so pending never dilutes scores.
  const mainWithPosition = withListPositions(mainEntries);
  const listSize = mainWithPosition.length;
  const positionByName = buildPositionByNameMap(mainWithPosition);
  const pendingWithMeta = pendingEntries.map((entry) => ({
    ...entry,
    listPosition: null,
    listSize,
  }));
  const entriesWithPosition = [...mainWithPosition, ...pendingWithMeta];
  const sourceEntries = [...mainEntries, ...pendingEntries];
  const grouped = new Map();

  for (const entry of entriesWithPosition) {
    if (!entry.player || entry.player === "-") continue;
    if (!grouped.has(entry.player)) grouped.set(entry.player, []);
    grouped.get(entry.player).push(entry);
  }

  const board = [...grouped.entries()]
    .map(([name, playerEntries]) => {
      const sorted = sortByListPosition(playerEntries);

      const achievements = sorted.map((entry) => {
        const isPending = isPendingListSource(entry);
        const isDuplicate = isGroupedDuplicate(entry, sourceEntries);
        const parentEntries = isDuplicate
          ? findParentEntries(entry, entriesWithPosition)
          : [];
        const isReplacement =
          isDuplicate &&
          parentEntries.some((parentEntry) =>
            isReplacementDuplicate(parentEntry, entry),
          );
        const xpPosition = isPending
          ? null
          : resolveAchievementXpPosition(
              entry,
              entriesWithPosition,
              positionByName,
            );
        const points =
          isPending || xpPosition == null
            ? 0
            : calculateXp(xpPosition, entry.listSize);

        return { ...entry, points, isDuplicate, isReplacement, xpPosition };
      });

      const best =
        achievements.find((entry) => !isPendingListSource(entry)) ??
        achievements[0] ??
        null;
      const totalXP =
        Math.round(
          achievements.reduce((sum, entry) => sum + (entry.points ?? 0), 0) *
            100,
        ) / 100;

      return {
        name,
        country: resolvePlayerCountry(playerCountries, name),
        countries: resolvePlayerCountries(playerCountries, name),
        achievements,
        // Counts grouped duplicates too, matching totalXP semantics (duplicates
        // intentionally contribute XP as well).
        achievementCount: achievements.length,
        totalXP,
        best,
        bestRank: getEntryRank(best),
      };
    })
    .sort(compareByXpThenBestRank);

  return withGlobalRank(board);
}

export function buildSubmissionBoard(
  entries,
  classicMap,
  platformerMap,
  playerCountries = null,
) {
  const submissions = entries
    .map((entry) => ({
      ...entry,
      _src: entry._src || "classic",
    }))
    .filter((entry) => entry.submitter && entry.submitter !== "-");

  const grouped = new Map();

  for (const entry of submissions) {
    if (!grouped.has(entry.submitter)) grouped.set(entry.submitter, []);
    grouped.get(entry.submitter).push(entry);
  }

  const board = [...grouped.entries()]
    .map(([name, items]) => {
      const rankedItems = items
        .map((entry) => ({
          ...entry,
          listPosition: resolveAchievementListPosition(
            entry,
            classicMap,
            platformerMap,
          ),
        }))
        .sort(
          (a, b) =>
            (a.listPosition ?? Number.POSITIVE_INFINITY) -
            (b.listPosition ?? Number.POSITIVE_INFINITY),
        );

      const rankedOnList = rankedItems.filter(
        (entry) => entry.listPosition != null,
      );
      const best = rankedOnList[0] ?? rankedItems[0] ?? null;

      return {
        name,
        country: resolvePlayerCountry(playerCountries, name),
        countries: resolvePlayerCountries(playerCountries, name),
        submissions: rankedItems,
        pts: items.length,
        best,
        totalXP: items.length,
        bestRank: best?.listPosition ?? null,
        achievementCount: items.length,
      };
    })
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });

  return withCompetitionRank(board, (row) => row.pts);
}

const BOARD_SORT_OPTIONS = [
  { value: "globalRank", label: "Rank" },
  { value: "bestRank", label: "Hardest Achievement" },
  { value: "name", label: "Name" },
];

export const PLAYER_SORT_OPTIONS = BOARD_SORT_OPTIONS;
export const COUNTRY_SORT_OPTIONS = BOARD_SORT_OPTIONS;
export const SUBMISSION_SORT_OPTIONS = BOARD_SORT_OPTIONS;

export function sortLeaderboardRows(rows, sortKey, sortDir) {
  const dir = sortDir === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    let cmp = 0;

    switch (sortKey) {
      case "name":
        cmp = String(a.name ?? "").localeCompare(String(b.name ?? ""));
        break;
      case "country":
        cmp = String(a.country ?? "ZZ").localeCompare(String(b.country ?? "ZZ"));
        break;
      case "globalRank":
        cmp = (a.globalRank ?? Number.POSITIVE_INFINITY) -
          (b.globalRank ?? Number.POSITIVE_INFINITY);
        break;
      case "bestRank": {
        const rankA = a.bestRank ?? Number.POSITIVE_INFINITY;
        const rankB = b.bestRank ?? Number.POSITIVE_INFINITY;
        cmp = rankA - rankB;
        break;
      }
      case "achievementCount":
        cmp = (a.achievementCount ?? 0) - (b.achievementCount ?? 0);
        break;
      case "totalXP":
      default:
        cmp = (a.totalXP ?? a.pts ?? 0) - (b.totalXP ?? b.pts ?? 0);
        break;
    }

    if (cmp === 0 && sortKey === "totalXP") {
      const rankA = a.bestRank ?? Number.POSITIVE_INFINITY;
      const rankB = b.bestRank ?? Number.POSITIVE_INFINITY;
      cmp = rankA - rankB;
    }

    if (cmp === 0) {
      cmp = (a.globalRank ?? Number.POSITIVE_INFINITY) -
        (b.globalRank ?? Number.POSITIVE_INFINITY);
    }

    if (cmp === 0) {
      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    }

    return cmp * dir;
  });
}

export function paginateRows(rows, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    totalCount: rows.length,
    startIndex: start,
  };
}

export function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 1) return [];

  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => ({
      type: "page",
      value: index + 1,
    }));
  }

  const pages = new Set([currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  pages.add(1);
  pages.add(totalPages);

  const sorted = [...pages].sort((a, b) => a - b);
  const items = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index];

    if (index > 0) {
      const leftPage = sorted[index - 1];
      const rightPage = page;

      if (rightPage - leftPage > 1) {
        const isLeftEllipsis = rightPage <= currentPage + 1;
        items.push({
          type: "ellipsis",
          side: isLeftEllipsis ? "left" : "right",
          defaultPage: isLeftEllipsis ? rightPage - 1 : leftPage + 1,
        });
      } else if (
        leftPage === 1 &&
        currentPage > 2 &&
        rightPage === currentPage - 1
      ) {
        items.push({
          type: "ellipsis",
          side: "left",
          defaultPage: rightPage - 1,
        });
      }
    }

    items.push({ type: "page", value: page });
  }

  return items;
}
