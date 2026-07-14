import React from "react";
import LevelCard from "./LevelCard";
import GroupedLevelCard from "./GroupedLevelCard";
import SelectDropdown from "./SelectDropdown";
import { groupAchievementsByDuplicates } from "../utils/groupDuplicates";
import { TAG_DEFINITIONS, TAG_ICONS } from "../utils/tags";
import { SORT_OPTS, SORT_DIR_OPTS } from "../constants/sortOptions";
import { ModeToggle, ScaleControls } from "./HeaderControls";
import Tooltip from "./Tooltip";

const LIST_GAP = 14;
const MOBILE_LIST_GAP = 7;
const CARD_ROW_HEIGHT = 180;
const MOBILE_CARD_ROW_HEIGHT = 120;
const OVERSCAN = 10;
const NARROW_VIEWPORT_QUERY = "(max-width: 640px)";

function useIsNarrowViewport() {
  const [isNarrow, setIsNarrow] = React.useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(NARROW_VIEWPORT_QUERY).matches,
  );

  React.useEffect(() => {
    const media = window.matchMedia(NARROW_VIEWPORT_QUERY);
    const onChange = () => setIsNarrow(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isNarrow;
}

function getItemHeight(cardScale, isNarrow) {
  if (isNarrow) return MOBILE_CARD_ROW_HEIGHT + MOBILE_LIST_GAP;
  return CARD_ROW_HEIGHT * (Number(cardScale) || 1) + LIST_GAP;
}

/** Sum of expansion extras for items strictly before `index`. */
function sumExtrasBefore(extraOffsets, index) {
  let total = 0;
  for (const item of extraOffsets) {
    if (item.index >= index) break;
    total += item.extra;
  }
  return total;
}

/** Sum of expansion extras for items at or after `index`. */
function sumExtrasFrom(extraOffsets, index) {
  let total = 0;
  for (const item of extraOffsets) {
    if (item.index >= index) total += item.extra;
  }
  return total;
}

/** Item index containing the given document-relative offset, accounting for
 * expanded rows that are taller than the base item height. */
function findIndexAtOffset(offset, itemHeight, extraOffsets) {
  let consumedExtra = 0;
  for (const { index, extra } of extraOffsets) {
    const rowTop = index * itemHeight + consumedExtra;
    if (offset < rowTop) break;
    if (offset < rowTop + itemHeight + extra) return index;
    consumedExtra += extra;
  }
  return Math.floor((offset - consumedExtra) / itemHeight);
}

function getAchievementListKey(achievement) {
  if (achievement.levelID != null) {
    return `${achievement.levelID}::${achievement.name}::${achievement.player ?? ""}`;
  }
  return `${achievement.name}::${achievement.player ?? ""}::${achievement.date ?? ""}`;
}

function useWindowedRange(itemCount, itemHeight, listRef, extraOffsets) {
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
      let start;
      let end;
      if (extraOffsets.length === 0) {
        // Fully-collapsed list: keep the original fixed-height math untouched.
        start = Math.max(
          0,
          Math.floor((scrollY - listTop) / itemHeight) - OVERSCAN,
        );
        end = Math.min(
          itemCount,
          Math.ceil((scrollY + viewport - listTop) / itemHeight) + OVERSCAN,
        );
      } else {
        start = Math.max(
          0,
          findIndexAtOffset(scrollY - listTop, itemHeight, extraOffsets) -
            OVERSCAN,
        );
        end = Math.min(
          itemCount,
          findIndexAtOffset(
            scrollY + viewport - listTop,
            itemHeight,
            extraOffsets,
          ) +
            1 +
            OVERSCAN,
        );
      }
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
  }, [itemCount, itemHeight, listRef, extraOffsets]);

  return range;
}

export default function LevelList({
  data,
  activeTags,
  allTags,
  toggleTag,
  listKey,
  isTimeline,
  isPendingEstimate,
  pendingMainCount = 0,
  projectionAvailable,
  showProjectedRanks,
  setShowProjectedRanks,
  onCardClick,
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
  const getTimelineDateLabel = React.useCallback(
    (achievement) => achievement.timelineDateLabel ?? null,
    [],
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
  const isNarrow = useIsNarrowViewport();
  const itemHeight = getItemHeight(cardScale, isNarrow);
  const windowRef = React.useRef(null);
  // Measured extra height (beyond the base row height) of grouped cards whose
  // duplicates are currently expanded, keyed by achievement list key.
  const [expandedExtras, setExpandedExtras] = React.useState(() => new Map());

  const extraOffsets = React.useMemo(() => {
    if (expandedExtras.size === 0) return [];
    const offsets = [];
    mainAchievements.forEach((achievement, index) => {
      const extra = expandedExtras.get(getAchievementListKey(achievement));
      if (extra) offsets.push({ index, extra });
    });
    return offsets;
  }, [expandedExtras, mainAchievements]);

  const { start, end } = useWindowedRange(
    mainAchievements.length,
    itemHeight,
    listRef,
    extraOffsets,
  );
  const topSpacer = start * itemHeight + sumExtrasBefore(extraOffsets, start);
  const bottomSpacer = Math.max(
    0,
    (mainAchievements.length - end) * itemHeight +
      sumExtrasFrom(extraOffsets, end),
  );
  const visibleAchievements = mainAchievements.slice(start, end);

  React.useEffect(() => {
    const windowEl = windowRef.current;
    if (!windowEl) return undefined;

    const gap = isNarrow ? MOBILE_LIST_GAP : LIST_GAP;
    const collapsedRowHeight = itemHeight - gap;

    const measureExpandedExtras = () => {
      const next = new Map();
      const children = windowEl.children;
      // Rendered children map 1:1 (in order) to the visible slice.
      for (let offset = 0; offset < children.length; offset += 1) {
        const child = children[offset];
        if (!child.classList.contains("grouped-achievement")) continue;
        if (!child.querySelector(".grouped-achievement__duplicates")) continue;
        const achievement = mainAchievements[start + offset];
        const extra = child.offsetHeight - collapsedRowHeight;
        if (achievement && extra > 0.5) {
          next.set(getAchievementListKey(achievement), extra);
        }
      }

      setExpandedExtras((prev) => {
        if (prev.size === next.size) {
          let unchanged = true;
          for (const [key, value] of next) {
            if (prev.get(key) !== value) {
              unchanged = false;
              break;
            }
          }
          if (unchanged) return prev;
        }
        return next;
      });
    };

    measureExpandedExtras();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measureExpandedExtras);
    observer.observe(windowEl);
    return () => observer.disconnect();
  }, [mainAchievements, start, end, itemHeight, isNarrow]);

  return (
    <>
      <main
        ref={listRef}
        className={`list list--card${sidebarCollapsed ? " is-sidebar-collapsed" : ""}`}
        style={{ "--card-height": cardScale, "--card-width": cardWidth }}
      >
        <aside
          className={`list__sidebar${sidebarCollapsed ? " is-collapsed" : ""}`}
        >
          <ModeToggle mode={mode} setMode={setMode} />

          <ScaleControls
            idPrefix="sidebar"
            cardScale={cardScale}
            setCardScale={setCardScale}
            cardWidth={cardWidth}
            setCardWidth={setCardWidth}
          />

          <div className="hd__sort-group list__sort-group">
            <span className="hd__sort-lbl">SORT</span>
            <div className="list__sort-controls">
              <SelectDropdown
                  value={sort}
                  options={SORT_OPTS}
                  onChange={setSort}
                  ariaLabel="Sort by"
                  variant="hd-compact"
                />
                <SelectDropdown
                  value={sortDir}
                  options={SORT_DIR_OPTS}
                  onChange={setSortDir}
                  ariaLabel="Sort direction"
                  variant="hd-compact"
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
        {safeData.length === 0 ? (
          <div className="list__empty">No entries found.</div>
        ) : (
          <div
            ref={windowRef}
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
                  isPendingEstimate={isPendingEstimate}
                  pendingMainCount={pendingMainCount}
                  showProjectedRanks={showProjectedRanks}
                  onClick={handleCardClick}
                />
              ) : (
                <LevelCard
                  key={itemKey}
                  achievement={a}
                  index={i}
                  isTimeline={isTimeline}
                  timelineDateLabel={getTimelineDateLabel(a)}
                  isPendingEstimate={isPendingEstimate}
                  pendingMainCount={pendingMainCount}
                  showProjectedRanks={showProjectedRanks}
                  onClick={handleCardClick}
                />
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
