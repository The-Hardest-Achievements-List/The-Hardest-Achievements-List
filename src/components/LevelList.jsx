import React from "react";
import LevelCard from "./LevelCard";
import GroupedLevelCard from "./GroupedLevelCard";
import { groupAchievementsByDuplicates } from "../utils/groupDuplicates";
import { buildTimelineDateLabelMap, getTimelineEntryKey } from "../utils/format";
import { TAG_DEFINITIONS, TAG_ICONS } from "./Header";
import Tooltip from "./Tooltip";

const SORT_OPTS = [
  { value: "rank", label: "Rank" },
  { value: "name", label: "Name" },
  { value: "length", label: "Length" },
  { value: "date", label: "Date" },
];

const SORT_DIR_OPTS = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

const LIST_GAP = 14;
const MOBILE_LIST_GAP = 7;
const LIST_ROW_HEIGHT = 96;
const CARD_ROW_HEIGHT = 180;
const MOBILE_CARD_ROW_HEIGHT = 120;
const OVERSCAN = 10;

function getItemHeight(layoutMode, cardScale) {
  if (layoutMode === "LIST") return LIST_ROW_HEIGHT + LIST_GAP;
  const isNarrow =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 640px)").matches;
  if (isNarrow) return MOBILE_CARD_ROW_HEIGHT + MOBILE_LIST_GAP;
  return CARD_ROW_HEIGHT * (Number(cardScale) || 1) + LIST_GAP;
}

function getAchievementListKey(achievement) {
  if (achievement.levelID != null) {
    return `${achievement.levelID}::${achievement.name}::${achievement.player ?? ""}`;
  }
  return `${achievement.name}::${achievement.player ?? ""}::${achievement.date ?? ""}`;
}

function SidebarSelect({ value, options, onChange, ariaLabel }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div className="hd__sel hd__sel--compact" ref={ref}>
      <button
        type="button"
        className="hd__sel-btn"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="hd__sel-btn-label">{label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <div className="hd__sel-menu">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`hd__sel-item${value === o.value ? " is-active" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useWindowedRange(itemCount, itemHeight, listRef) {
  const [range, setRange] = React.useState({
    start: 0,
    end: Math.min(itemCount, 24),
  });
  const listTopRef = React.useRef(0);
  const rafRef = React.useRef(0);
  const scrollingRef = React.useRef(false);
  const scrollEndTimerRef = React.useRef(0);

  React.useEffect(() => {
    const measureListTop = () => {
      const listEl = listRef.current;
      if (!listEl) return;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      // Cache document Y of the list once per layout; recalculating every
      // scroll frame from getBoundingClientRect fights sticky/chrome motion.
      listTopRef.current = listEl.getBoundingClientRect().top + scrollY;
    };

    const updateRange = () => {
      if (itemCount <= 0 || itemHeight <= 0) {
        setRange({ start: 0, end: 0 });
        return;
      }

      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const viewport = window.innerHeight || 800;
      const listTop = listTopRef.current;
      const start = Math.max(
        0,
        Math.floor((scrollY - listTop) / itemHeight) - OVERSCAN,
      );
      const end = Math.min(
        itemCount,
        Math.ceil((scrollY + viewport - listTop) / itemHeight) + OVERSCAN,
      );
      setRange((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end },
      );
    };

    const onScroll = () => {
      scrollingRef.current = true;
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        updateRange();
      });
      window.clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = window.setTimeout(() => {
        scrollingRef.current = false;
        measureListTop();
        updateRange();
      }, 120);
    };

    const onResize = () => {
      if (scrollingRef.current) return;
      measureListTop();
      updateRange();
    };

    measureListTop();
    updateRange();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      window.clearTimeout(scrollEndTimerRef.current);
    };
  }, [itemCount, itemHeight, listRef]);

  return range;
}

export default function LevelList({
  data,
  totalCount,
  activeTags,
  allTags,
  toggleTag,
  listKey,
  isTimeline,
  hideRank,
  isPendingEstimate,
  pendingMainCount = 0,
  projectionAvailable,
  showProjectedRanks,
  setShowProjectedRanks,
  onCardClick,
  layoutMode,
  setLayoutMode,
  cardScale,
  setCardScale,
  cardWidth,
  setCardWidth,
  sort,
  setSort,
  sortDir,
  setSortDir,
  mode,
  setMode,
  listKind = null,
  otherList = [],
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const listRef = React.useRef(null);
  const safeData = Array.isArray(data) ? data : [];
  const { mainAchievements } = React.useMemo(
    () =>
      groupAchievementsByDuplicates(safeData, {
        listKind,
        otherList,
        mainSrc: mode === "platformer" ? "platformer" : "classic",
        pendingSrc: mode === "platformer" ? "platformerpending" : "pending",
      }),
    [safeData, listKind, otherList, mode],
  );
  const timelineDateLabels = React.useMemo(
    () => (isTimeline ? buildTimelineDateLabelMap(safeData) : null),
    [isTimeline, safeData],
  );
  const getTimelineDateLabel = React.useCallback(
    (achievement) => timelineDateLabels?.get(getTimelineEntryKey(achievement)),
    [timelineDateLabels],
  );
  const handleCardClick = React.useCallback(
    (achievement) => {
      const label = getTimelineDateLabel(achievement);
      onCardClick(
        label ? { ...achievement, timelineDateLabel: label } : achievement,
      );
    },
    [onCardClick, getTimelineDateLabel],
  );
  const safeAllTags = Array.isArray(allTags) ? allTags : [];
  const itemHeight = getItemHeight(layoutMode, cardScale);
  const { start, end } = useWindowedRange(
    mainAchievements.length,
    itemHeight,
    listRef,
  );
  const topSpacer = start * itemHeight;
  const bottomSpacer = Math.max(0, (mainAchievements.length - end) * itemHeight);
  const visibleAchievements = mainAchievements.slice(start, end);

  return (
    <>
      <main
        ref={listRef}
        className={`list list--${layoutMode.toLowerCase()}${sidebarCollapsed ? " is-sidebar-collapsed" : ""}`}
        style={
          layoutMode === "CARD"
            ? { "--card-height": cardScale, "--card-width": cardWidth }
            : undefined
        }
      >
        {layoutMode === "CARD" && (
          <aside
            className={`list__sidebar${sidebarCollapsed ? " is-collapsed" : ""}`}
          >
            <div className="hd__mode-toggle">
              <button
                className={mode === "classic" ? "is-active" : ""}
                onClick={() => setMode("classic")}
              >
                <i className="fas fa-cube" style={{ marginRight: "0.5rem" }} />{" "}
                Classic
              </button>
              <button
                className={mode === "platformer" ? "is-active" : ""}
                onClick={() => setMode("platformer")}
              >
                <i
                  className="fas fa-person-running"
                  style={{ marginRight: "0.5rem" }}
                />{" "}
                Platformer
              </button>
            </div>

            <div className="hd__layout-group">
              {layoutMode === "CARD" && (
                <>
                  <div className="hd__scale-control">
                    <label htmlFor="card-scale-y">Scale Y</label>
                    <input
                      id="card-scale-y"
                      type="range"
                      min="0.65"
                      max="1.25"
                      step="0.05"
                      value={cardScale}
                      onChange={(e) => setCardScale(Number(e.target.value))}
                    />
                  </div>
                  <div className="hd__scale-control">
                    <label htmlFor="card-scale-x">Scale X</label>
                    <input
                      id="card-scale-x"
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={cardWidth}
                      onChange={(e) => setCardWidth(Number(e.target.value))}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="hd__sort-group list__sort-group">
              <span className="hd__sort-lbl">SORT</span>
              <div className="list__sort-controls">
                <SidebarSelect
                  value={sort}
                  options={SORT_OPTS}
                  onChange={setSort}
                  ariaLabel="Sort by"
                />
                <SidebarSelect
                  value={sortDir}
                  options={SORT_DIR_OPTS}
                  onChange={setSortDir}
                  ariaLabel="Sort direction"
                />
              </div>
              {projectionAvailable && (
                <label className="hd__toggle hd__toggle--inline">
                  <input
                    type="checkbox"
                    checked={showProjectedRanks}
                    onChange={(e) => setShowProjectedRanks(e.target.checked)}
                  />
                  <span className="hd__toggle-label">Projected ranks</span>
                </label>
              )}
            </div>

            <div className="hd__filters list__filters">
              <span className="hd__fgroup-lbl">FILTER</span>
              <div className="hd__chips">
                {safeAllTags.map((t) => {
                  const state = activeTags.get(t);
                  const def = TAG_DEFINITIONS[t] || {};
                  return (
                    <button
                      key={t}
                      className={`hd__chip${state === "include" ? " is-include" : ""}${state === "exclude" ? " is-exclude" : ""} ${def.className || ""}`}
                      onClick={() => toggleTag(t)}
                    >
                      <Tooltip text={def.tooltip}>
                        {TAG_ICONS[t] && (
                          <i className={`fas ${TAG_ICONS[t]}`} aria-hidden="true" />
                        )}
                        {def.text || t}
                      </Tooltip>
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              className="sidebar__collapse-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!sidebarCollapsed}
            >
              <i
                className={`fas ${sidebarCollapsed ? "fa-chevron-left" : "fa-chevron-right"}`}
                aria-hidden="true"
              />
              <span className="sidebar__collapse-btn-label">
                {sidebarCollapsed ? "Show panel" : "Hide panel"}
              </span>
            </button>
          </aside>
        )}
        {safeData.length === 0 ? (
          <div className="list__empty">No entries found.</div>
        ) : (
          <div
            className="list__window"
            style={{
              paddingTop: topSpacer,
              paddingBottom: bottomSpacer,
            }}
          >
            {visibleAchievements.map((a, offset) => {
              const i = start + offset;
              const itemKey = `${listKey ?? "list"}::${getAchievementListKey(a)}`;
              return a.hasDuplicates ? (
                <GroupedLevelCard
                  key={itemKey}
                  achievement={a}
                  duplicates={a.duplicates}
                  index={i}
                  isTimeline={isTimeline}
                  getTimelineDateLabel={getTimelineDateLabel}
                  hideRank={hideRank}
                  isPendingEstimate={isPendingEstimate}
                  pendingMainCount={pendingMainCount}
                  showProjectedRanks={showProjectedRanks}
                  onClick={handleCardClick}
                  layoutMode={layoutMode}
                />
              ) : (
                <LevelCard
                  key={itemKey}
                  achievement={a}
                  index={i}
                  isTimeline={isTimeline}
                  timelineDateLabel={getTimelineDateLabel(a)}
                  hideRank={hideRank}
                  isPendingEstimate={isPendingEstimate}
                  pendingMainCount={pendingMainCount}
                  showProjectedRanks={showProjectedRanks}
                  onClick={handleCardClick}
                  layoutMode={layoutMode}
                />
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
