import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  startTransition,
  lazy,
  Suspense,
} from "react";
import Header from "./components/Header";
import { useLevelThumbnail } from "./hooks/useLevelThumbnail";
import HomePage from "./pages/HomePage";

const LevelList = lazy(() => import("./components/LevelList"));
const LevelModal = lazy(() => import("./components/LevelModal"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
import {
  getDuplicateParentIds,
  getAchievementKey,
  annotateGroupedVariants,
  isCrossListReplacementChild,
  getCrossListReplacementParents,
} from "./utils/groupDuplicates";
import {
  comparePendingEstimate,
  matchesEstimateSearch,
  buildMainProjection,
  getMainListCount,
} from "./utils/estimateRank";
import {
  isValidDate,
  getTimelineEntryKey,
  buildTimelineDateLabelMap,
  buildTimelineDateSortMap,
} from "./utils/format";
import { CLASSIC_TAGS, PLATFORMER_TAGS } from "./utils/tags";
import { getLeaderboardPath } from "./utils/leaderboard";
import {
  entryMatchesRangeFilter,
  hasRangeFilterBounds,
} from "./utils/rangeFilter";

import classicChangelogData from "../data/classicchangelog.json";
import milestonesData from "../data/milestones.json";
import platformerChangelogData from "../data/platformerchangelog.json";
import timelineChangelogData from "../data/timelinechangelog.json";
import {
  buildDataMap,
  getCachedListData,
  loadListData,
} from "./data/listData";

function isMilestoneEntry(entry) {
  return entry?.list === "classic" || entry?.list === "platformer";
}

function mergeChangelogWithMilestones(changelog, milestones) {
  return [...changelog, ...milestones].sort((a, b) => {
    const dateCmp = String(b.date || "").localeCompare(String(a.date || ""));
    if (dateCmp !== 0) return dateCmp;
    // Milestones first on the same day so list-wide events stand out.
    return Number(isMilestoneEntry(b)) - Number(isMilestoneEntry(a));
  });
}

const classicChangelogWithMilestones = mergeChangelogWithMilestones(
  classicChangelogData,
  milestonesData.filter((entry) => entry.list === "classic"),
);

const platformerChangelogWithMilestones = mergeChangelogWithMilestones(
  platformerChangelogData,
  milestonesData.filter((entry) => entry.list === "platformer"),
);

const NO_LIST = new Set(["HOME", "LEADERBOARD"]);

function AppBackground({ achievement }) {
  const { imgRef, currentUrl, loadedUrl, onError, onLoad } = useLevelThumbnail({
    thumbnail: achievement?.thumbnail,
    showcaseVideo: achievement?.showcaseVideo,
    video: achievement?.video,
    levelID: achievement?.levelID,
    lazy: false,
    enabled: Boolean(achievement),
  });

  return (
    <>
      {currentUrl && !loadedUrl && (
        <img
          ref={imgRef}
          src={currentUrl}
          alt=""
          aria-hidden
          decoding="async"
          onError={onError}
          onLoad={onLoad}
          style={{ display: "none" }}
        />
      )}
      {loadedUrl && (
        <div
          className="app-bg__img"
          style={{ backgroundImage: `url("${loadedUrl}")` }}
        />
      )}
    </>
  );
}

function parseRoute() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length === 0 || parts[0] === "home")
    return { mode: "classic", active: "HOME" };
  if (parts[0] === "leaderboard") {
    const section = parts[1];
    if (section === "players") {
      return {
        mode: "classic",
        active: "LEADERBOARD",
        lbMode: "players",
        listSource: parts[2] === "platformer" ? "platformer" : "classic",
      };
    }
    if (section === "platformer") {
      return {
        mode: "classic",
        active: "LEADERBOARD",
        lbMode: "players",
        listSource: "platformer",
      };
    }
    if (section === "countries") {
      return {
        mode: "classic",
        active: "LEADERBOARD",
        lbMode: "countries",
        listSource: parts[2] === "platformer" ? "platformer" : "classic",
      };
    }
    if (section === "submission" || section === "submissions") {
      return {
        mode: "classic",
        active: "LEADERBOARD",
        lbMode: "submissions",
        listSource: parts[2] === "platformer" ? "platformer" : "classic",
      };
    }
    return {
      mode: "classic",
      active: "LEADERBOARD",
      lbMode: "players",
      listSource: "classic",
    };
  }
  const modeMap = { classic: "classic", plat: "platformer" };
  const tabMap = {
    legacy: "LEGACY",
    pending: "PENDING",
    timeline: "TIMELINE",
  };
  const mode = modeMap[parts[0]] || "classic";
  let active = tabMap[parts[1]] || "MAIN";
  if (mode === "platformer" && active === "LEGACY") active = "MAIN";
  return { mode, active };
}

/**
 * Hybrid family filter:
 * - Parent match on search → parent + all variants; names ignored.
 * - Parent match on tags → same expand; children inherit the parent's tag pass.
 * - Child-only match → host the parent (variant button) + that child;
 *   siblings do not expand.
 * - Hitchhiking only while the expanding parent remains present.
 * - Pending search hits seed a host parent only (not a full family expand).
 * - After tags/range, drop host shells with no remaining nested children
 *   (except seed hosts, which pending replacements may still attach to).
 */
function filterEntriesByFamilySemantics(
  entries,
  {
    query,
    matchesSearch,
    includeTags = [],
    excludeTags = [],
    seedHostParentKeys = [],
    rangeFilter = null,
  },
) {
  const hasSearch = Boolean(query);
  const hasRange = hasRangeFilterBounds(rangeFilter ?? {});
  const hasTags =
    includeTags.length > 0 || excludeTags.length > 0 || hasRange;
  const passesTags = (entry) =>
    entryMatchesActiveTags(entry, includeTags, excludeTags) &&
    entryMatchesRangeFilter(entry, rangeFilter ?? {});
  // Hosts skip include tags so parents can nest matching children, but excludes
  // still apply (an excluded parent must not resurface as a shell).
  const passesHostExcludes = (entry) =>
    entryMatchesActiveTags(entry, [], excludeTags);

  const searchExpandParentKeys = new Set();
  const hostParentKeys = new Set(
    seedHostParentKeys.filter(Boolean).map((key) => key),
  );

  if (hasSearch) {
    for (const entry of entries) {
      if (!matchesSearch(entry, query)) continue;
      const parentIds = getDuplicateParentIds(entry);
      if (parentIds.length === 0) {
        searchExpandParentKeys.add(getAchievementKey(entry));
        continue;
      }
      for (const parentRef of parentIds) {
        hostParentKeys.add(getAchievementKey({ name: parentRef }));
      }
    }
  }

  let data = entries;
  if (hasSearch) {
    data = entries.filter((entry) => {
      if (matchesSearch(entry, query)) return true;

      const parentIds = getDuplicateParentIds(entry);
      if (parentIds.length === 0) {
        const key = getAchievementKey(entry);
        return searchExpandParentKeys.has(key) || hostParentKeys.has(key);
      }

      return parentIds.some((parentRef) =>
        searchExpandParentKeys.has(getAchievementKey({ name: parentRef })),
      );
    });
  }

  if (!hasTags) {
    return {
      entries: data,
      expandingParentKeys: hasSearch
        ? searchExpandParentKeys
        : new Set(
            data
              .filter((entry) => getDuplicateParentIds(entry).length === 0)
              .map((entry) => getAchievementKey(entry)),
          ),
    };
  }

  // Child-only tag hits host their parents so variants nest under the toggle
  // instead of rendering as orphan cards.
  for (const entry of data) {
    const parentIds = getDuplicateParentIds(entry);
    if (parentIds.length === 0) continue;
    if (hasSearch && !matchesSearch(entry, query)) continue;
    if (!passesTags(entry)) continue;
    for (const parentRef of parentIds) {
      hostParentKeys.add(getAchievementKey({ name: parentRef }));
    }
  }

  // Tag-passing parents that are allowed to expand / inherit to children.
  // Tags-only: every tag-passing parent expands.
  // With search: only search-expand roots that still pass tags (not mere hosts).
  const expandingParentKeys = new Set();
  for (const entry of data) {
    if (getDuplicateParentIds(entry).length > 0) continue;
    if (!passesTags(entry)) continue;
    const key = getAchievementKey(entry);
    if (!hasSearch || searchExpandParentKeys.has(key)) {
      expandingParentKeys.add(key);
    }
  }

  data = data.filter((entry) => {
    const parentIds = getDuplicateParentIds(entry);
    if (parentIds.length === 0) {
      const key = getAchievementKey(entry);
      if (hostParentKeys.has(key)) return passesHostExcludes(entry);
      return passesTags(entry);
    }
    if (
      parentIds.some((parentRef) =>
        expandingParentKeys.has(getAchievementKey({ name: parentRef })),
      )
    ) {
      return true;
    }
    // Personal pass only — family-pulled non-hits must not orphan after the
    // expanding parent is tag-dropped.
    if (hasSearch && !matchesSearch(entry, query)) return false;
    return passesTags(entry);
  });

  // Search can host a parent for a child that later fails tags/range. Drop
  // those empty shells so include filters don't leak non-matching parents.
  // Seed hosts stay — pending replacements attach from the other list next.
  const seedHostKeys = new Set(
    seedHostParentKeys.filter(Boolean).map((key) => key),
  );
  const nestedUnder = new Set();
  for (const entry of data) {
    for (const parentRef of getDuplicateParentIds(entry)) {
      nestedUnder.add(getAchievementKey({ name: parentRef }));
    }
  }
  data = data.filter((entry) => {
    if (getDuplicateParentIds(entry).length > 0) return true;
    const key = getAchievementKey(entry);
    if (passesTags(entry)) return true;
    if (nestedUnder.has(key)) return true;
    return seedHostKeys.has(key) && passesHostExcludes(entry);
  });

  return { entries: data, expandingParentKeys };
}

function filterOtherListByFamilySemantics(
  otherEntries,
  {
    query,
    matchesSearch,
    includeTags = [],
    excludeTags = [],
    parentKeysPresent,
    expandingParentKeys,
    resolveParentKeys,
    rangeFilter = null,
  },
) {
  if (!Array.isArray(otherEntries) || otherEntries.length === 0) return [];
  const hasSearch = Boolean(query);
  const hasRange = hasRangeFilterBounds(rangeFilter ?? {});
  const hasTags =
    includeTags.length > 0 || excludeTags.length > 0 || hasRange;
  if (!hasSearch && !hasTags) return otherEntries;

  const passesTags = (entry) =>
    entryMatchesActiveTags(entry, includeTags, excludeTags) &&
    entryMatchesRangeFilter(entry, rangeFilter ?? {});

  return otherEntries.filter((entry) => {
    const parentKeys = resolveParentKeys(entry).filter((key) =>
      parentKeysPresent.has(key),
    );
    if (parentKeys.length === 0) return false;

    const inheritsFromExpandingParent = parentKeys.some((key) =>
      expandingParentKeys.has(key),
    );
    if (inheritsFromExpandingParent) return true;

    if (hasSearch && !matchesSearch(entry, query)) return false;
    if (hasTags && !passesTags(entry)) return false;
    return true;
  });
}

function entryMatchesActiveTags(achievement, includeTags, excludeTags) {
  if (includeTags.length > 0) {
    if (
      !achievement.tags ||
      !includeTags.every((tag) => achievement.tags.includes(tag))
    ) {
      return false;
    }
  }
  if (excludeTags.length > 0) {
    if (
      achievement.tags &&
      !excludeTags.every((tag) => !achievement.tags.includes(tag))
    ) {
      return false;
    }
  }
  return true;
}

export default function App() {
  const [route, setRoute] = useState(parseRoute);
  const { mode, active } = route;
  // Home can paint without list JSON; leaderboard + lists need it (shared cache).
  const needsListData = active !== "HOME";

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("rank");
  const [sortDir, setSortDir] = useState("asc");
  const [activeTags, setActiveTags] = useState(new Map());
  const [progressFrom, setProgressFrom] = useState("");
  const [progressTo, setProgressTo] = useState("");
  const [hzMin, setHzMin] = useState("");
  const [hzMax, setHzMax] = useState("");
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [pendingJumpKey, setPendingJumpKey] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [listData, setListData] = useState(() => getCachedListData());
  const [listDataError, setListDataError] = useState(null);
  const [listLoadNonce, setListLoadNonce] = useState(0);
  const [cardScale, setCardScale] = useState(() => {
    if (typeof window === "undefined") return 0.95;
    const stored = window.localStorage.getItem("hd-card-scale");
    return stored != null ? Number(stored) : 0.95;
  });
  const [cardWidth, setCardWidth] = useState(() => {
    if (typeof window === "undefined") return 1;
    const stored = window.localStorage.getItem("hd-card-width");
    return stored != null ? Number(stored) : 1;
  });
  const [showProjectedRanks, setShowProjectedRanks] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("hd-show-projected-ranks") === "true";
  });

  const retryListData = () => {
    setListDataError(null);
    setListLoadNonce((n) => n + 1);
  };

  useEffect(() => {
    if (listData) return undefined;

    let cancelled = false;
    const applyData = (data) => {
      if (cancelled) return;
      setListData(data);
      setListDataError(null);
    };
    const applyError = (error) => {
      if (!cancelled) setListDataError(error);
    };

    // preload-list-data.js may already have started this on list routes.
    // On Home, warm immediately after paint (no idle delay) so navigation is snappy.
    loadListData().then(applyData).catch(applyError);

    return () => {
      cancelled = true;
    };
  }, [needsListData, listData, listLoadNonce]);

  function navigate(newMode, newActive) {
    // Platformer has no legacy list — fall back to main.
    const activeTab =
      newMode === "platformer" && newActive === "LEGACY" ? "MAIN" : newActive;

    if (activeTab === "HOME") {
      history.pushState({}, "", "/");
      startTransition(() => {
        setRoute({ mode: newMode, active: "HOME" });
      });
      return;
    }
    if (activeTab === "LEADERBOARD") {
      const lbMode =
        active === "LEADERBOARD" ? (route.lbMode ?? "players") : "players";
      const listSource =
        active === "LEADERBOARD"
          ? (route.listSource ?? "classic")
          : "classic";
      const path =
        lbMode === "players" && listSource === "classic"
          ? "/leaderboard"
          : getLeaderboardPath(lbMode, listSource);
      history.pushState({}, "", path);
      startTransition(() => {
        setRoute({
          mode: newMode,
          active: "LEADERBOARD",
          lbMode,
          listSource,
        });
      });
      return;
    }
    const modeSlug = newMode === "platformer" ? "plat" : "classic";
    const tabSlug = activeTab === "MAIN" ? "" : activeTab.toLowerCase();
    const path = tabSlug ? `/${modeSlug}/${tabSlug}` : `/${modeSlug}`;
    history.pushState({}, "", path);
    startTransition(() => {
      setRoute({ mode: newMode, active: activeTab });
    });
  }

  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("hd-card-scale", String(cardScale));
    } catch (error) {}
  }, [cardScale]);

  useEffect(() => {
    try {
      window.localStorage.setItem("hd-card-width", String(cardWidth));
    } catch (error) {}
  }, [cardWidth]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "hd-show-projected-ranks",
        String(showProjectedRanks),
      );
    } catch (error) {}
  }, [showProjectedRanks]);

  const isPendingList = active === "PENDING";
  const isMainList = active === "MAIN";
  const isLegacyList = active === "LEGACY";
  const dataMap = useMemo(() => buildDataMap(listData), [listData]);
  const listDataReady = Boolean(listData) || !needsListData;
  const mainEntries = useMemo(() => {
    if (!listData) return [];
    return annotateGroupedVariants(
      mode === "classic" ? listData.achievements : listData.platformers,
    );
  }, [mode, listData]);
  const pendingEntries = useMemo(() => {
    if (!listData) return [];
    return annotateGroupedVariants(
      mode === "classic" ? listData.pending : listData.platformerPending,
    );
  }, [mode, listData]);
  const pendingMainCount = useMemo(
    () => getMainListCount(mainEntries),
    [mainEntries],
  );
  const legacyRankOffset = isLegacyList ? pendingMainCount : 0;
  const mainProjectionByKey = useMemo(() => {
    if (!isMainList || !listData) return null;
    return buildMainProjection(mainEntries, pendingEntries, getAchievementKey);
  }, [isMainList, mode, mainEntries, pendingEntries, listData]);
  const projectionAvailable = mainProjectionByKey != null;
  const rawSource = NO_LIST.has(active) ? null : dataMap?.[mode]?.[active];
  const rawData = useMemo(() => {
    if (!listData) return [];
    if (isMainList) return mainEntries;
    if (isPendingList) return pendingEntries;
    if (!Array.isArray(rawSource)) return [];
    return annotateGroupedVariants(rawSource);
  }, [
    isMainList,
    isPendingList,
    mainEntries,
    pendingEntries,
    rawSource,
    listData,
  ]);
  const isTimeline = active === "TIMELINE";
  const timelineDateLabelMap = useMemo(
    () => (isTimeline ? buildTimelineDateLabelMap(rawData) : null),
    [isTimeline, rawData],
  );
  const timelineDateSortMap = useMemo(
    () => (isTimeline ? buildTimelineDateSortMap(rawData) : null),
    [isTimeline, rawData],
  );
  const rawDataWithListRank = useMemo(() => {
    if (!Array.isArray(rawData)) return [];

    const parentRankByKey = new Map();
    let rank = 0;

    const ranked = rawData.map((achievement) => {
      // Same-list variants are rankless; stamps come from annotateGroupedVariants.
      if (achievement.isGroupedVariant) {
        return achievement;
      }

      rank += 1;
      const listRank = rank + legacyRankOffset;
      const key = getAchievementKey(achievement);
      if (key) {
        parentRankByKey.set(key, listRank);
      }
      const timelineKey = getTimelineEntryKey(achievement);
      const projectedRank =
        mainProjectionByKey != null
          ? (mainProjectionByKey.get(key) ?? null)
          : null;
      return {
        ...achievement,
        listRank,
        projectedRank,
        ...(timelineDateLabelMap
          ? {
              timelineDateLabel:
                timelineDateLabelMap.get(timelineKey) ?? null,
            }
          : {}),
        ...(timelineDateSortMap
          ? {
              sortDateMs: timelineDateSortMap.get(timelineKey) ?? null,
            }
          : {}),
      };
    });

    // Variants inherit the parent's list rank for orphan / filter views.
    return ranked.map((achievement) => {
      if (!achievement.isGroupedVariant) return achievement;

      let inheritedRank = null;
      for (const parentRef of getDuplicateParentIds(achievement)) {
        const parentRank = parentRankByKey.get(
          getAchievementKey({ name: parentRef }),
        );
        if (parentRank == null) continue;
        if (inheritedRank == null || parentRank < inheritedRank) {
          inheritedRank = parentRank;
        }
      }
      if (inheritedRank == null) return achievement;

      return {
        ...achievement,
        listRank: inheritedRank,
        listRankInherited: true,
      };
    });
  }, [
    rawData,
    mainProjectionByKey,
    legacyRankOffset,
    timelineDateLabelMap,
    timelineDateSortMap,
  ]);

  const allTags = mode === "classic" ? CLASSIC_TAGS : PLATFORMER_TAGS;

  const itemMatchesSearch = (achievement, q) =>
    achievement.name?.toLowerCase().includes(q) ||
    achievement.player?.toLowerCase().includes(q) ||
    String(achievement.levelID ?? "").includes(q) ||
    String(achievement.rank ?? achievement.listRank ?? "").includes(q) ||
    (isPendingList && matchesEstimateSearch(achievement, q, pendingMainCount));

  const toggleTag = (t) => {
    startTransition(() => {
      const next = new Map(activeTags);
      const current = next.get(t);

      if (current === null || current === undefined) {
        next.set(t, "include");
      } else if (current === "include") {
        next.set(t, "exclude");
      } else {
        next.delete(t);
      }
      setActiveTags(next);
    });
  };

  const progressFilterEnabled = activeTags.get("Progress") === "include";
  const hertzFilterEnabled = activeTags.get("Low Hertz") === "include";

  const rangeFilter = useMemo(
    () => ({
      progressEnabled: progressFilterEnabled,
      progressFrom,
      progressTo,
      hertzEnabled: hertzFilterEnabled,
      hzMin,
      hzMax,
    }),
    [
      progressFilterEnabled,
      progressFrom,
      progressTo,
      hertzFilterEnabled,
      hzMin,
      hzMax,
    ],
  );

  const hasListContextFilter =
    Boolean(search.trim()) ||
    activeTags.size > 0 ||
    hasRangeFilterBounds(rangeFilter);

  const jumpToListPosition = useCallback(
    (achievement) => {
      if (!achievement) return;

      // Replacements live on pending — jump there instead of failing on main.
      const jumpToPending = Boolean(achievement.isReplacement);
      let targetKey = getAchievementKey(achievement);

      // Same-list variants nest under a parent after filters clear — scroll there.
      // Replacements keep their own key so pending list can find them.
      if (!jumpToPending && achievement.isGroupedVariant) {
        const parentIds = getDuplicateParentIds(achievement);
        if (parentIds.length > 0) {
          targetKey = getAchievementKey({ name: parentIds[0] });
        }
      }

      // Sync updates — startTransition would deprioritize the clear+scroll and feel laggy.
      setPendingJumpKey(targetKey);
      setSearch("");
      setActiveTags(new Map());
      setProgressFrom("");
      setProgressTo("");
      setHzMin("");
      setHzMax("");

      if (jumpToPending && active !== "PENDING") {
        const modeSlug = mode === "platformer" ? "plat" : "classic";
        history.pushState({}, "", `/${modeSlug}/pending`);
        // Sync route (not startTransition) so the pending list mounts with the jump key.
        setRoute({ mode, active: "PENDING" });
      }
    },
    [active, mode],
  );

  const clearPendingJump = useCallback(() => {
    setPendingJumpKey(null);
  }, []);

  useEffect(() => {
    setSearch("");
    setActiveTags(new Map());
    setProgressFrom("");
    setProgressTo("");
    setHzMin("");
    setHzMax("");
    // Do not clear pendingJumpKey here — Jump may switch MAIN → PENDING with the
    // key already set; LevelList clears it after scrolling (or on a miss).
    if (!NO_LIST.has(active)) {
      setSort("rank");
      setSortDir("asc");
    }
  }, [active, mode]);

  useEffect(() => {
    // Jump scrolls to the target card; don't yank back to top on the same nav.
    if (pendingJumpKey) return;
    window.scrollTo(0, 0);
    setShowScrollTop(false);
    // pendingJumpKey is read as a same-render gate only; must not re-fire when Jump clears it.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- list change only
  }, [active, mode]);

  const activeTagLists = useMemo(() => {
    const includeTags = [];
    const excludeTags = [];
    activeTags.forEach((state, tag) => {
      if (state === "include") includeTags.push(tag);
      else if (state === "exclude") excludeTags.push(tag);
    });
    return { includeTags, excludeTags };
  }, [activeTags]);

  const { filteredData, expandingParentKeys, parentKeysPresent } =
    useMemo(() => {
      if (!Array.isArray(rawDataWithListRank)) {
        return {
          filteredData: [],
          expandingParentKeys: new Set(),
          parentKeysPresent: new Set(),
        };
      }

      const searchQuery = search.trim() ? search.toLowerCase() : "";
      const { includeTags, excludeTags } = activeTagLists;

      const seedHostParentKeys = [];
      if (searchQuery && isMainList) {
        const listSrc = {
          mainSrc: mode === "platformer" ? "platformer" : "classic",
          pendingSrc: mode === "platformer" ? "platformerpending" : "pending",
        };
        pendingEntries.forEach((achievement) => {
          if (!itemMatchesSearch(achievement, searchQuery)) return;
          if (!isCrossListReplacementChild(achievement, mainEntries, listSrc)) {
            return;
          }
          getCrossListReplacementParents(
            achievement,
            mainEntries,
            listSrc,
          ).forEach((parent) => {
            seedHostParentKeys.push(getAchievementKey(parent));
          });
        });
      }

      const { entries, expandingParentKeys: expandingKeys } =
        filterEntriesByFamilySemantics(rawDataWithListRank, {
          query: searchQuery,
          matchesSearch: itemMatchesSearch,
          includeTags,
          excludeTags,
          seedHostParentKeys,
          rangeFilter,
        });

      // Copy before sort so unfiltered paths still get a new array identity
      // (in-place sort of a shared ref would leave LevelList's memo stale).
      const sortedEntries = [...entries].sort((a, b) => {
        if (sort === "rank" && isPendingList) {
          return comparePendingEstimate(a, b, sortDir, pendingMainCount);
        }

        let va, vb;
        if (sort === "rank") {
          const ra = a.rank ?? a.listRank;
          const rb = b.rank ?? b.listRank;
          const aIsRanked = ra != null;
          const bIsRanked = rb != null;
          if (!aIsRanked && !bIsRanked) return 0;
          if (!aIsRanked) return 1;
          if (!bIsRanked) return -1;
          va = ra;
          vb = rb;
        } else if (sort === "name") {
          va = (a.name ?? "").toLowerCase();
          vb = (b.name ?? "").toLowerCase();
        } else if (sort === "length") {
          va = a.length ?? 0;
          vb = b.length ?? 0;
        } else {
          const getSortDateMs = (entry) => {
            if (entry.sortDateMs != null) return entry.sortDateMs;
            if (isValidDate(entry.date)) return new Date(entry.date).getTime();
            return null;
          };
          const aMs = getSortDateMs(a);
          const bMs = getSortDateMs(b);
          if (aMs == null && bMs == null) return 0;
          if (aMs == null) return 1;
          if (bMs == null) return -1;
          va = aMs;
          vb = bMs;
        }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });

      const present = new Set(
        sortedEntries
          .filter((entry) => getDuplicateParentIds(entry).length === 0)
          .map((entry) => getAchievementKey(entry)),
      );

      return {
        filteredData: sortedEntries,
        expandingParentKeys: expandingKeys,
        parentKeysPresent: present,
      };
    }, [
      rawDataWithListRank,
      search,
      activeTagLists,
      rangeFilter,
      sort,
      sortDir,
      isPendingList,
      isMainList,
      pendingMainCount,
      pendingEntries,
      mainEntries,
      mode,
    ]);

  const filteredOtherList = useMemo(() => {
    const source = isMainList
      ? pendingEntries
      : isPendingList
        ? mainEntries
        : [];
    if (!Array.isArray(source) || source.length === 0) return [];

    const searchQuery = search.trim() ? search.toLowerCase() : "";
    const { includeTags, excludeTags } = activeTagLists;
    const listSrc = {
      mainSrc: mode === "platformer" ? "platformer" : "classic",
      pendingSrc: mode === "platformer" ? "platformerpending" : "pending",
    };

    // When filtering main, otherList is pending replacements of present parents.
    // When filtering pending, otherList is main parents (rarely attached the same way).
    const parentPool = isMainList ? filteredData : mainEntries;

    return filterOtherListByFamilySemantics(source, {
      query: searchQuery,
      matchesSearch: itemMatchesSearch,
      includeTags,
      excludeTags,
      rangeFilter,
      parentKeysPresent,
      expandingParentKeys,
      resolveParentKeys: (entry) => {
        if (isMainList) {
          return getCrossListReplacementParents(entry, parentPool, listSrc).map(
            (parent) => getAchievementKey(parent),
          );
        }
        return getDuplicateParentIds(entry).map((name) =>
          getAchievementKey({ name }),
        );
      },
    });
  }, [
    isMainList,
    isPendingList,
    pendingEntries,
    mainEntries,
    filteredData,
    search,
    activeTagLists,
    rangeFilter,
    parentKeysPresent,
    expandingParentKeys,
    mode,
  ]);

  useEffect(() => {
    if (active === "LEADERBOARD" || active === "HOME") {
      setShowScrollTop(false);
      return undefined;
    }
    let raf = 0;
    const update = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const next = window.scrollY > 900;
        setShowScrollTop((prev) => (prev === next ? prev : next));
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", update);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [active, mode]);

  const topAchievement = !NO_LIST.has(active) ? (rawData[0] ?? null) : null;

  return (
    <div className="app">
      <div className="app-bg">
        <AppBackground achievement={topAchievement} />
        <div className="app-bg__tint" />
        <div className="app-bg__grid" />
      </div>

      <Header
        mode={mode}
        setMode={(m) => navigate(m, active)}
        active={active}
        setActive={(a) => navigate(mode, a)}
        search={search}
        setSearch={setSearch}
        sort={sort}
        setSort={setSort}
        sortDir={sortDir}
        setSortDir={setSortDir}
        activeTags={activeTags}
        toggleTag={toggleTag}
        allTags={allTags}
        progressFrom={progressFrom}
        setProgressFrom={setProgressFrom}
        progressTo={progressTo}
        setProgressTo={setProgressTo}
        hzMin={hzMin}
        setHzMin={setHzMin}
        hzMax={hzMax}
        setHzMax={setHzMax}
        cardScale={cardScale}
        setCardScale={setCardScale}
        cardWidth={cardWidth}
        setCardWidth={setCardWidth}
        projectionAvailable={projectionAvailable}
        showProjectedRanks={showProjectedRanks}
        setShowProjectedRanks={setShowProjectedRanks}
      />

      {active === "HOME" ? (
        <HomePage
          classicChangelog={classicChangelogWithMilestones}
          platformerChangelog={platformerChangelogWithMilestones}
          timelineChangelog={timelineChangelogData}
          onNavigate={navigate}
        />
      ) : active === "LEADERBOARD" ? (
        <Suspense
          fallback={
            <div className="list-boot" role="status" aria-live="polite">
              Loading leaderboard…
            </div>
          }
        >
          <LeaderboardPage
            listData={listData}
            listDataError={listDataError}
            onRetryListData={retryListData}
            initialMode={route.lbMode ?? "players"}
            initialListSource={route.listSource ?? "classic"}
            onAchievementClick={setSelectedLevel}
          />
        </Suspense>
      ) : !listDataReady ? (
        <div className="list-boot" role="status" aria-live="polite">
          {listDataError ? (
            <>
              <span>Failed to load list data.</span>
              <button
                type="button"
                className="list-boot__retry"
                onClick={retryListData}
              >
                Try again
              </button>
            </>
          ) : (
            "Loading list…"
          )}
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="list-boot" role="status" aria-live="polite">
              Loading list…
            </div>
          }
        >
          <LevelList
            key={`${mode}-${active}`}
            listKey={`${mode}-${active}`}
            data={filteredData}
            activeTags={activeTags}
            allTags={allTags}
            toggleTag={toggleTag}
            progressFrom={progressFrom}
            setProgressFrom={setProgressFrom}
            progressTo={progressTo}
            setProgressTo={setProgressTo}
            hzMin={hzMin}
            setHzMin={setHzMin}
            hzMax={hzMax}
            setHzMax={setHzMax}
            isTimeline={isTimeline}
            isPendingEstimate={isPendingList}
            pendingMainCount={pendingMainCount}
            projectionAvailable={projectionAvailable}
            showProjectedRanks={showProjectedRanks}
            setShowProjectedRanks={setShowProjectedRanks}
            onCardClick={setSelectedLevel}
            cardScale={cardScale}
            setCardScale={setCardScale}
            cardWidth={cardWidth}
            setCardWidth={setCardWidth}
            sort={sort}
            setSort={setSort}
            sortDir={sortDir}
            setSortDir={setSortDir}
            mode={mode}
            setMode={(m) => navigate(m, active)}
            listKind={isMainList ? "main" : isPendingList ? "pending" : null}
            otherList={filteredOtherList}
            showJumpToList={hasListContextFilter}
            onJumpToList={jumpToListPosition}
            pendingJumpKey={pendingJumpKey}
            onJumpHandled={clearPendingJump}
          />
        </Suspense>
      )}

      {selectedLevel && (
        <Suspense fallback={null}>
          <LevelModal
            level={selectedLevel}
            onClose={() => setSelectedLevel(null)}
            isPendingEstimate={
              selectedLevel._src
                ? ["pending", "platformerpending"].includes(selectedLevel._src)
                : isPendingList
            }
            pendingMainCount={pendingMainCount}
            showProjectedRanks={showProjectedRanks && isMainList}
          />
        </Suspense>
      )}

      {showScrollTop && active !== "LEADERBOARD" && active !== "HOME" && (
        <button
          className="scroll-top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Go to top"
        >
          <i className="fas fa-arrow-up" style={{ marginRight: "0.5rem" }} />{" "}
          TOP
        </button>
      )}
    </div>
  );
}
