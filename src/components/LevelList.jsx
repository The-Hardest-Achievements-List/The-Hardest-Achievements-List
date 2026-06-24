import React from "react";
import LevelCard from "./LevelCard";
import GroupedLevelCard from "./GroupedLevelCard";
import { groupAchievementsByDuplicates } from "../utils/groupDuplicates";
import { TAG_ICONS, TAG_DEFINITIONS } from "./Header";
import Tooltip from "./Tooltip";

const SORT_OPTS = [
  { value: "rank", label: "Rank" },
  { value: "name", label: "Name" },
  { value: "length", label: "Length" },
  { value: "date", label: "Date" },
];

function SortSelect({ sort, setSort }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = SORT_OPTS.find((o) => o.value === sort)?.label ?? "Rank";

  return (
    <div className="hd__sel" ref={ref}>
      <button className="hd__sel-btn" onClick={() => setOpen((o) => !o)}>
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
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
          {SORT_OPTS.map((o) => (
            <button
              key={o.value}
              className={`hd__sel-item${sort === o.value ? " is-active" : ""}`}
              onClick={() => {
                setSort(o.value);
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
  const { mainAchievements } = groupAchievementsByDuplicates(data);
  const includeTags = [];
  const excludeTags = [];
  activeTags.forEach((state, tag) => {
    if (state === "include") includeTags.push(tag);
    else if (state === "exclude") excludeTags.push(tag);
  });

  return (
    <>
      <main
        className={`list list--${layoutMode.toLowerCase()}`}
        style={
          layoutMode === "CARD"
            ? { "--card-height": cardScale, "--card-width": cardWidth }
            : undefined
        }
      >
        {layoutMode === "CARD" && (
          <aside className="list__sidebar">
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
                      min="0.5"
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

            <div className="hd__sort-group">
              <span className="hd__sort-lbl">SORT</span>
              <SortSelect sort={sort} setSort={setSort} />
              <button className="hd__sort-dir" onClick={setSortDir}>
                <i
                  className={`fas ${sortDir === "asc" ? "fa-arrow-up" : "fa-arrow-down"}`}
                  style={{ marginRight: "0.5rem" }}
                />
              </button>
            </div>

            <div className="hd__filters list__filters">
              <span className="hd__fgroup-lbl">FILTER</span>
              <div className="hd__chips">
                {allTags.map((t) => {
                  const state = activeTags.get(t);
                  const def = TAG_DEFINITIONS[t] || {};
                  return (
                    <button
                      key={t}
                      className={`hd__chip${state === "include" ? " is-include" : ""}${state === "exclude" ? " is-exclude" : ""} ${def.className || ""}`}
                      onClick={() => toggleTag(t)}
                    >
                      <Tooltip text={def.tooltip}>
                        {def.icon ? (
                          <img
                            src={def.icon}
                            alt=""
                            style={{ marginRight: "0.35rem", height: 12 }}
                          />
                        ) : (
                          TAG_ICONS[t] && (
                            <i
                              className={`fas ${TAG_ICONS[t]}`}
                              style={{ marginRight: "0.35rem" }}
                            />
                          )
                        )}
                        {def.text || t}
                      </Tooltip>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
        {data.length === 0 ? (
          <div className="list__empty">No entries found.</div>
        ) : (
          mainAchievements.map((a, i) =>
            a.hasDuplicates ? (
              <GroupedLevelCard
                key={a.id ?? i}
                achievement={a}
                duplicates={a.duplicates}
                index={i}
                isTimeline={isTimeline}
                hideRank={hideRank}
                onClick={onCardClick}
                layoutMode={layoutMode}
              />
            ) : (
              <LevelCard
                key={a.id ?? i}
                achievement={a}
                index={i}
                isTimeline={isTimeline}
                hideRank={hideRank}
                onClick={onCardClick}
                layoutMode={layoutMode}
              />
            ),
          )
        )}
      </main>
    </>
  );
}