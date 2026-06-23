import { useState, useMemo, useEffect } from "react";
import Header from "./components/Header";
import LevelList from "./components/LevelList";
import LevelModal from "./components/LevelModal";
import HomePage from "./pages/HomePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ModLeaderboardPage from "./pages/ModLeaderboardPage";
import { getDuplicateParentId } from "./utils/groupDuplicates";

import achievementsData from "../data/achievements.json";
import pendingData from "../data/pending.json";
import legacyData from "../data/legacy.json";
import timelineData from "../data/timeline.json";
import platformersData from "../data/platformers.json";
import platformerTimelineData from "../data/platformertimeline.json";
import platformerpendingData from "../data/platformerpending.json";

const CLASSIC_TAGS = [
  "Level",
  "Challenge",
  "2P",
  "Low Hertz",
  "Progress",
  "Consistency",
  "Verified",
  "Rated",
  "Formerly Rated",
  "Tentative",
  "Outdated Version",
  "Coin Route",
  "Noclip",
  "Speedhack",
  "Mobile",
  "Miscellaneous",
];

const PLATFORMER_TAGS = [
  "Platformer",
  "Deathless",
  "Coin Route",
  "Rated",
  "Verified",
  "Consistency",
  "Progress",
  "Speedrun",
  "Low Hertz",
  "Mobile",
  "Outdated Version",
];

const DATA_MAP = {
  classic: {
    MAIN: achievementsData,
    PENDING: pendingData,
    REMOVED: legacyData,
    TIMELINE: timelineData,
  },
  platformer: {
    MAIN: platformersData,
    PENDING: platformerpendingData,
    REMOVED: [],
    TIMELINE: platformerTimelineData,
  },
};

const ALL_LISTS_COUNT =
  achievementsData.length +
  pendingData.length +
  legacyData.length +
  timelineData.length +
  platformersData.length +
  platformerTimelineData.length +
  platformerpendingData.length;

achievementsData.length +
  pendingData.length +
  legacyData.length +
  timelineData.length +
  platformersData.length +
  platformerTimelineData.length;

const NO_LIST = new Set(["HOME", "LEADERBOARD", "MODLB"]);

function parseRoute() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length === 0 || parts[0] === "home")
    return { mode: "classic", active: "HOME" };
  if (parts[0] === "leaderboard")
    return { mode: "classic", active: "LEADERBOARD" };
  if (parts[0] === "mod-lb") return { mode: "classic", active: "MODLB" };
  const modeMap = { classic: "classic", plat: "platformer" };
  const tabMap = {
    pending: "PENDING",
    removed: "REMOVED",
    timeline: "TIMELINE",
  };
  const mode = modeMap[parts[0]] || "classic";
  const active = tabMap[parts[1]] || "MAIN";
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

  function navigate(newMode, newActive) {
    if (newActive === "HOME") {
      history.pushState({}, "", "/");
      setRoute({ mode: newMode, active: "HOME" });
      return;
    }
    if (newActive === "LEADERBOARD") {
      history.pushState({}, "", "/leaderboard");
      setRoute({ mode: newMode, active: "LEADERBOARD" });
      return;
    }
    if (newActive === "MODLB") {
      history.pushState({}, "", "/mod-leaderboard");
      setRoute({ mode: newMode, active: "MODLB" });
      return;
    }
    const modeSlug = newMode === "platformer" ? "plat" : "classic";
    const tabSlug = newActive === "MAIN" ? "" : newActive.toLowerCase();
    const path = tabSlug ? `/${modeSlug}/${tabSlug}` : `/${modeSlug}`;
    history.pushState({}, "", path);
    setRoute({ mode: newMode, active: newActive });
  }

  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const rawData = NO_LIST.has(active) ? [] : DATA_MAP[mode][active] || [];
  const allTags = (() => {
    const tags = new Set();

    rawData.forEach((item) => {
      const itemTags = Array.isArray(item.tags)
        ? item.tags
        : typeof item.tags === "string" && item.tags
          ? [item.tags]
          : [];

      itemTags.forEach((tag) => {
        if (tag) tags.add(tag);
      });
    });

    const sourceTags = mode === "classic" ? CLASSIC_TAGS : PLATFORMER_TAGS;
    return sourceTags.filter((tag) => tags.has(tag));
  })();

  const toggleTag = (t) => {
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
  };

  useEffect(() => {
    setActiveTags(new Map());
    setSort("rank");
    setSortDir("asc");
  }, [mode]);

  useEffect(() => {
    setSearch("");
  }, [active, mode]);

  const filteredData = useMemo(() => {
    let data = [...rawData];

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          a.player?.toLowerCase().includes(q) ||
          String(a.levelID ?? "").includes(q) ||
          String(a.rank ?? "").includes(q),
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
      let va, vb;
      if (sort === "rank") {
        const ra = a.rank;
        const rb = b.rank;
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
        va = new Date(a.date ?? 0).getTime();
        vb = new Date(b.date ?? 0).getTime();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [rawData, search, activeTags, sort, sortDir]);

  useEffect(() => {
    const update = () => {
      const cards = document.querySelectorAll(".card");
      setShowScrollTop(
        cards.length >= 10 && cards[9].getBoundingClientRect().bottom < 0,
      );
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [filteredData]);

  const bgImage = !NO_LIST.has(active) ? (rawData[0]?.thumbnail ?? null) : null;

  return (
    <div className="app">
      <div className="app-bg">
        {bgImage && (
          <div
            className="app-bg__img"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
        )}
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
        setSortDir={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        activeTags={activeTags}
        toggleTag={toggleTag}
        allTags={allTags}
        totalCount={ALL_LISTS_COUNT}
      />

      {active === "HOME" ? (
        <HomePage
          totalCount={
            achievementsData.length +
            pendingData.length +
            legacyData.length +
            platformersData.length
          }
          achievementsData={achievementsData}
          pendingData={pendingData}
          legacyData={legacyData}
          timelineData={timelineData}
          platformersData={platformersData}
          platformerTimelineData={platformerTimelineData}
        />
      ) : active === "LEADERBOARD" ? (
        <LeaderboardPage />
      ) : active === "MODLB" ? (
        <ModLeaderboardPage />
      ) : (
        <LevelList
          data={filteredData}
          totalCount={rawData.filter((a) => !getDuplicateParentId(a)).length}
          activeTags={activeTags}
          toggleTag={toggleTag}
          isTimeline={active === "TIMELINE"}
          hideRank={active === "PENDING"}
          onCardClick={setSelectedLevel}
        />
      )}

      {selectedLevel && (
        <LevelModal
          level={selectedLevel}
          onClose={() => setSelectedLevel(null)}
          hideRank={active === "PENDING"}
        />
      )}

      {showScrollTop && (
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
