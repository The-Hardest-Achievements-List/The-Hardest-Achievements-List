import {
  useState,
  useMemo,
  useEffect,
  startTransition,
  lazy,
  Suspense,
} from "react";
import Header from "./components/Header";
import LevelList from "./components/LevelList";
import LevelModal from "./components/LevelModal";
import { useLevelThumbnail } from "./hooks/useLevelThumbnail";
import HomePage from "./pages/HomePage";

const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
import {
  getDuplicateParentIds,
  getAchievementKey,
  isGroupedDuplicate,
  getParentKeysInList,
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

import achievementsData from "../data/achievements.json";
import pendingData from "../data/pending.json";
import legacyData from "../data/legacy.json";
import timelineData from "../data/timeline.json";
import platformersData from "../data/platformers.json";
import platformerTimelineData from "../data/platformertimeline.json";
import platformerpendingData from "../data/platformerpending.json";
import classicChangelogData from "../data/classicchangelog.json";
import milestonesData from "../data/milestones.json";
import platformerChangelogData from "../data/platformerchangelog.json";
import timelineChangelogData from "../data/timelinechangelog.json";

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

const DATA_MAP = {
  classic: {
    MAIN: achievementsData,
    LEGACY: legacyData,
    PENDING: pendingData,
    TIMELINE: timelineData,
  },
  platformer: {
    MAIN: platformersData,
    LEGACY: [],
    PENDING: platformerpendingData,
    TIMELINE: platformerTimelineData,
  },
};

const NO_LIST = new Set(["HOME", "LEADERBOARD"]);

function AppBackground({ achievement }) {
  const { currentUrl, loadedUrl, onError, onLoad } = useLevelThumbnail({
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
          src={currentUrl}
          alt=""
          aria-hidden
          onError={onError}
          onLoad={onLoad}
          style={{ display: "none" }}
        />
      )}
      {loadedUrl && (
        <div
          className="app-bg__img"
          style={{ backgroundImage: `url(${loadedUrl})` }}
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

export default function App() {
  const [route, setRoute] = useState(parseRoute);
  const { mode, active } = route;

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("rank");
  const [sortDir, setSortDir] = useState("asc");
  const [activeTags, setActiveTags] = useState(new Map());
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
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
  const mainEntries = mode === "classic" ? achievementsData : platformersData;
  const pendingEntries = mode === "classic" ? pendingData : platformerpendingData;
  const pendingMainCount = useMemo(
    () => getMainListCount(mainEntries),
    [mainEntries],
  );
  const legacyRankOffset = isLegacyList ? pendingMainCount : 0;
  const mainProjectionByKey = useMemo(() => {
    if (!isMainList) return null;
    return buildMainProjection(mainEntries, pendingEntries, getAchievementKey);
  }, [isMainList, mode, mainEntries, pendingEntries]);
  const projectionAvailable = mainProjectionByKey != null;
  const rawData = NO_LIST.has(active) ? [] : (Array.isArray(DATA_MAP[mode]?.[active]) ? DATA_MAP[mode][active] : []);
  const rawDataParentKeys = useMemo(
    () => getParentKeysInList(rawData),
    [rawData],
  );
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
    let rank = 0;
    return rawData.map((achievement) => {
      if (isGroupedDuplicate(achievement, rawData, rawDataParentKeys)) {
        return achievement;
      }
      rank += 1;
      const key = getAchievementKey(achievement);
      const timelineKey = getTimelineEntryKey(achievement);
      const projectedRank =
        mainProjectionByKey != null
          ? (mainProjectionByKey.get(key) ?? null)
          : null;
      return {
        ...achievement,
        listRank: rank + legacyRankOffset,
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
  }, [
    rawData,
    rawDataParentKeys,
    mainProjectionByKey,
    legacyRankOffset,
    timelineDateLabelMap,
    timelineDateSortMap,
  ]);

  const allTags = mode === "classic" ? CLASSIC_TAGS : PLATFORMER_TAGS;

  const getParentKeysForEntry = (achievement) => {
    const duplicateParents = getDuplicateParentIds(achievement);
    if (duplicateParents.length === 0) {
      return [getAchievementKey(achievement)];
    }
    return duplicateParents.map((name) => getAchievementKey({ name }));
  };

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

  useEffect(() => {
    setSearch("");
    setActiveTags(new Map());
    if (!NO_LIST.has(active)) {
      setSort("rank");
      setSortDir("asc");
    }
  }, [active, mode]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setShowScrollTop(false);
  }, [active, mode]);

  const filteredData = useMemo(() => {
    if (!Array.isArray(rawDataWithListRank)) return [];
    let data = [...rawDataWithListRank];

    if (search.trim()) {
      const q = search.toLowerCase();
      const includedParentKeys = new Set();
      const listSrc = {
        mainSrc: mode === "platformer" ? "platformer" : "classic",
        pendingSrc: mode === "platformer" ? "platformerpending" : "pending",
      };

      rawDataWithListRank.forEach((achievement) => {
        if (itemMatchesSearch(achievement, q)) {
          getParentKeysForEntry(achievement).forEach((key) =>
            includedParentKeys.add(key),
          );
        }
      });

      // Pending replacements live under main parents — include them in MAIN search.
      if (isMainList) {
        pendingEntries.forEach((achievement) => {
          if (!itemMatchesSearch(achievement, q)) return;
          if (!isCrossListReplacementChild(achievement, mainEntries, listSrc)) {
            return;
          }
          getCrossListReplacementParents(
            achievement,
            mainEntries,
            listSrc,
          ).forEach((parent) => {
            includedParentKeys.add(getAchievementKey(parent));
          });
        });
      }

      data = data.filter((achievement) =>
        getParentKeysForEntry(achievement).some((key) =>
          includedParentKeys.has(key),
        ),
      );
    }

    if (activeTags.size > 0) {
      const includeTags = [];
      const excludeTags = [];
      activeTags.forEach((state, tag) => {
        if (state === "include") includeTags.push(tag);
        else if (state === "exclude") excludeTags.push(tag);
      });
      if (includeTags.length > 0) {
        data = data.filter(
          (a) => a.tags && includeTags.every((t) => a.tags.includes(t)),
        );
      }
      if (excludeTags.length > 0) {
        data = data.filter(
          (a) => !a.tags || excludeTags.every((t) => !a.tags.includes(t)),
        );
      }
    }

    data.sort((a, b) => {
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

    return data;
  }, [
    rawDataWithListRank,
    search,
    activeTags,
    sort,
    sortDir,
    isPendingList,
    isMainList,
    pendingMainCount,
    pendingEntries,
    mainEntries,
    mode,
  ]);

  useEffect(() => {
    if (active === "LEADERBOARD" || active === "HOME") {
      setShowScrollTop(false);
      return undefined;
    }
    const update = () => {
      setShowScrollTop(window.scrollY > 900);
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [active, mode]);

  const topAchievement = !NO_LIST.has(active) ? rawData[0] : null;

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
        <Suspense fallback={null}>
          <LeaderboardPage
            initialMode={route.lbMode ?? "players"}
            initialListSource={route.listSource ?? "classic"}
            onAchievementClick={setSelectedLevel}
          />
        </Suspense>
      ) : (
        <LevelList
          key={`${mode}-${active}`}
          listKey={`${mode}-${active}`}
          data={filteredData}
          activeTags={activeTags}
          allTags={allTags}
          toggleTag={toggleTag}
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
          otherList={isMainList ? pendingEntries : isPendingList ? mainEntries : []}
        />
      )}

      {selectedLevel && (
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
