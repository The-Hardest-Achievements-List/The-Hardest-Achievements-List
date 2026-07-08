import React from "react";
import LevelCard from "./LevelCard";
import GroupedLevelCard from "./GroupedLevelCard";
import { groupAchievementsByDuplicates } from "../utils/groupDuplicates";
import { buildTimelineDateLabelMap, getTimelineEntryKey } from "../utils/format";
import { TAG_DEFINITIONS } from "./Header";
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
        {label}
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

export default function LevelList({
  data,
  totalCount,
  activeTags,
  allTags,
  toggleTag,
  isTimeline,
  hideRank,
  isPendingEstimate,
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
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const safeData = Array.isArray(data) ? data : [];
  const { mainAchievements } = groupAchievementsByDuplicates(safeData);
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
  const includeTags = [];
  const excludeTags = [];
  activeTags.forEach((state, tag) => {
    if (state === "include") includeTags.push(tag);
    else if (state === "exclude") excludeTags.push(tag);
  });

  return (
    <>
      <main
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
                  className="fas fa-running"
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
          mainAchievements.map((a, i) => {
            const listKey = a.levelID != null ? `${a.levelID}-${i}` : `${a.name}-${i}`;
            return a.hasDuplicates ? (
              <GroupedLevelCard
                key={listKey}
                achievement={a}
                duplicates={a.duplicates}
                index={i}
                isTimeline={isTimeline}
                getTimelineDateLabel={getTimelineDateLabel}
                hideRank={hideRank}
                isPendingEstimate={isPendingEstimate}
                showProjectedRanks={showProjectedRanks}
                onClick={handleCardClick}
                layoutMode={layoutMode}
              />
            ) : (
              <LevelCard
                key={listKey}
                achievement={a}
                index={i}
                isTimeline={isTimeline}
                timelineDateLabel={getTimelineDateLabel(a)}
                hideRank={hideRank}
                isPendingEstimate={isPendingEstimate}
                showProjectedRanks={showProjectedRanks}
                onClick={handleCardClick}
                layoutMode={layoutMode}
              />
            );
          })
        )}
      </main>
    </>
  );
}
