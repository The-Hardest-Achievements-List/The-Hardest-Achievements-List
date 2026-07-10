import { useState, useRef, useEffect } from "react";
import Tooltip from "./Tooltip";

const TABS = ["HOME", "MAIN", "PENDING", "TIMELINE", "LEADERBOARD"];

const TAB_ICONS = {
  HOME: "fa-house",
  MAIN: "fa-bars",
  PENDING: "fa-clock",
  TIMELINE: "fa-clock-rotate-left",
  LEADERBOARD: "fa-ranking-star",
};

const TAG_ICONS = {
  Level: "fa-square",
  Challenge: "fa-bullseye",
  "2P": "fa-handshake",
  "Low Hertz": "fa-wave-square",
  Progress: "fa-chart-line",
  Consistency: "fa-repeat",
  Verified: "fa-circle-check",
  Rated: "fa-star",
  "Formerly Rated": "fa-star-half-stroke",
  Tentative: "fa-hourglass-half",
  "Outdated Version": "fa-clock-rotate-left",
  "Pending Removal": "fa-trash-can",
  "Coin Route": "fa-coins",
  Noclip: "fa-ghost",
  Speedhack: "fa-gauge-high",
  Mobile: "fa-mobile-screen",
  Miscellaneous: "fa-puzzle-piece",
  Platformer: "fa-person-running",
  Deathless: "fa-heart-pulse",
  Speedrun: "fa-stopwatch",
};

const TAG_DEFINITIONS = {
  Platformer: {
    className: "tag-platformer",
    text: "Platformer",
    tooltip: "Uses platformer mode, a side-scrolling mode added in update 2.2.",
  },
  Level: {
    className: "tag-level",
    text: "Level",
    tooltip: "A traditional level, which spans 30+ seconds.",
  },
  Challenge: {
    className: "tag-challenge",
    text: "Challenge",
    tooltip: "Tiny or short length level; a level that spans under 30 seconds.",
  },
  "Low Hertz": {
    className: "tag-low-hertz",
    text: "Low Hertz",
    tooltip:
      "Done at a low hz. Added when it significantly increases difficulty.",
  },
  Mobile: {
    className: "tag-mobile",
    text: "Mobile",
    tooltip: "Played on mobile.",
  },
  Speedhack: {
    className: "tag-speedhack",
    text: "Speedhack",
    tooltip: "Altered speed of the game.",
  },
  Noclip: {
    className: "tag-noclip",
    text: "Noclip",
    tooltip: "Done with noclip on.",
  },
  Deathless: {
    className: "tag-deathless",
    text: "Deathless",
    tooltip: "Platformer done without dying.",
  },
  Miscellaneous: {
    className: "tag-miscellaneous",
    text: "Miscellaneous",
    tooltip: "An achievement that doesn't fit with any other tags.",
  },
  Progress: {
    className: "tag-progress",
    text: "Progress",
    tooltip: "Parts of the level completed.",
  },
  Consistency: {
    className: "tag-consistency",
    text: "Consistency",
    tooltip: "Progress done in a row.",
  },
  Speedrun: {
    className: "tag-speedrun",
    text: "Speedrun",
    tooltip: "Time of completion contributes to the difficulty.",
  },
  "2P": {
    className: "tag-2p",
    text: "2 Player",
    tooltip: "Level uses 2 player mode.",
  },
  Rated: {
    className: "tag-rated",
    text: "Rated",
    tooltip: "Level is rated in-game.",
  },
  "Formerly Rated": {
    className: "tag-formerly-rated",
    text: "Formerly Rated",
    tooltip: "Level was rated but had its rating status removed.",
  },
  "Outdated Version": {
    className: "tag-outdated-version",
    text: "Outdated Version",
    tooltip:
      "Achievement is on an older version of its level than the current one, or done on a version before the latest release.",
  },
  "Pending Removal": {
    className: "tag-pending-removal",
    text: "Pending Removal",
    tooltip: "Levels set to be removed due to redundancy.",
  },
  Verified: {
    className: "tag-verified",
    text: "Verified",
    tooltip: "Levels that are verified without alterations such as speedhack.",
  },
  "Coin Route": {
    className: "tag-coin-route",
    text: "Coin Route",
    tooltip: "Coin(s) collected that contribute to the difficulty.",
  },
  Tentative: {
    className: "tag-tentative",
    text: "Tentative",
    tooltip: "Tentative placement; unfixed; subject to change.",
  },
};

export { TAG_ICONS, TAG_DEFINITIONS };

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

function DrawerSelect({ value, options, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div className="hd__sel hd__sel--drawer" ref={ref}>
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

function SortSelect({ sort, setSort }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
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

const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.04.037.052a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const isHome = (t) => t === "HOME";
const hasListControls = (t) => t === "MAIN" || t === "PENDING" || t === "TIMELINE";
const hasListFilters = (t) => t === "MAIN" || t === "PENDING" || t === "TIMELINE";

const ChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path
      d="M2 3.5L5 6.5L8 3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const FiltersIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M4 21v-7" />
    <path d="M4 10V3" />
    <path d="M12 21v-9" />
    <path d="M12 8V3" />
    <path d="M20 21v-5" />
    <path d="M20 12V3" />
    <path d="M2 14h4" />
    <path d="M10 8h4" />
    <path d="M18 16h4" />
  </svg>
);

function MobileNav({ active, setActive }) {
  const [open, setOpen] = useState(false);
  const [fitsInline, setFitsInline] = useState(false);
  const wrapRef = useRef(null);
  const measureRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!fitsInline) setOpen(false);
  }, [fitsInline]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    const parent = wrap?.parentElement;
    if (!wrap || !measure || !parent) return;

    const check = () => {
      const filtersBtn = parent.querySelector(".hd__nav-mobile-btn");
      const styles = getComputedStyle(parent);
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
      const filtersWidth = filtersBtn
        ? filtersBtn.getBoundingClientRect().width + gap
        : 0;
      const available = parent.clientWidth - filtersWidth;
      const needed = measure.scrollWidth;
      const nextFits = needed > 0 && needed <= available;
      setFitsInline((prev) => (prev === nextFits ? prev : nextFits));
    };

    const ro = new ResizeObserver(check);
    ro.observe(parent);
    ro.observe(measure);
    check();

    if (document.fonts?.ready) {
      document.fonts.ready.then(check).catch(() => {});
    }

    return () => ro.disconnect();
  }, [active]);

  const activeTab = TABS.includes(active) ? active : TABS[0];

  const handleSelect = (tab) => {
    setActive(tab);
    setOpen(false);
  };

  return (
    <div className="hd__nav-mobile" ref={wrapRef}>
      <div className="hd__nav-mobile-measure" ref={measureRef} aria-hidden="true">
        {TABS.map((t) => (
          <span key={t} className="hd__nav-btn hd__nav-mobile-tab">
            <i className={`fas ${TAB_ICONS[t]}`} aria-hidden="true" />
            <span className="hd__nav-label">{t}</span>
          </span>
        ))}
      </div>

      {fitsInline ? (
        <nav className="hd__nav-mobile-tabs" aria-label="List navigation">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`hd__nav-btn hd__nav-mobile-tab${active === t ? " is-active" : ""}`}
              onClick={() => setActive(t)}
              aria-current={active === t ? "page" : undefined}
            >
              <i className={`fas ${TAB_ICONS[t]}`} aria-hidden="true" />
              <span className="hd__nav-label">{t}</span>
            </button>
          ))}
        </nav>
      ) : (
        <div className="hd__nav-mobile-dropdown" ref={dropdownRef}>
          <button
            type="button"
            className="hd__nav-mobile-dropdown-btn hd__nav-mobile-action-btn"
            aria-label="Choose list"
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((o) => !o)}
          >
            <i className={`fas ${TAB_ICONS[activeTab]}`} aria-hidden="true" />
            <span className="hd__nav-mobile-dropdown-label">{activeTab}</span>
            <ChevronDown />
          </button>
          {open && (
            <div className="hd__nav-mobile-dropdown-menu" role="menu">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="menuitem"
                  className={`hd__nav-mobile-dropdown-item${active === t ? " is-active" : ""}`}
                  onClick={() => handleSelect(t)}
                >
                  <i className={`fas ${TAB_ICONS[t]}`} aria-hidden="true" />
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Header({
  mode,
  setMode,
  active,
  setActive,
  search,
  setSearch,
  sort,
  setSort,
  sortDir,
  setSortDir,
  activeTags,
  toggleTag,
  allTags,
  totalCount,
  layoutMode,
  setLayoutMode,
  cardScale,
  setCardScale,
  cardWidth,
  setCardWidth,
  projectionAvailable = false,
  showProjectedRanks = false,
  setShowProjectedRanks,
}) {
  if (active === "HOME") return null;

  const [showNav, setShowNav] = useState(false);
  const [showHeader, setShowHeader] = useState(true);

  return (
    <>
      <header className={`hd${showHeader ? "" : " hd--compact"}`}>
        <div className="hd__layout">
          <div className="hd__row">
            {active !== "HOME" && (
              <div className="hd__brand">
                <div
                  className="hd__logo hd__logo--home"
                  onClick={() => setActive("HOME")}
                >
                  <img src="/THAL.png" alt="" className="hd__logo-square" />
                </div>
                <div className="hd__brand-meta">
                  <div className="hd__brand-title">
                    The Hardest Achievements List
                  </div>
                </div>
              </div>
            )}

            {showHeader && hasListControls(active) && (
              <>
                <div className="hd__controls-wrapper">
                  <div className="hd__search">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name, player, level ID"
                    />
                  </div>

                  <div className="hd__right-group">
                    <a
                      href="https://discord.gg/zp4mfdsguA"
                      className="hd__discord"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Discord"
                    >
                      <DiscordIcon />
                    </a>

                    <div className="hd__sort-group">
                      <span className="hd__sort-lbl">SORT</span>
                      <SortSelect sort={sort} setSort={setSort} />
                      <button
                        className="hd__sort-dir"
                        onClick={() =>
                          setSortDir(sortDir === "asc" ? "desc" : "asc")
                        }
                      >
                        <i
                          className={`fas ${sortDir === "asc" ? "fa-arrow-up" : "fa-arrow-down"}`}
                          style={{ marginRight: "0.5rem" }}
                        />
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
                              onChange={(e) =>
                                setCardScale(Number(e.target.value))
                              }
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
                              onChange={(e) =>
                                setCardWidth(Number(e.target.value))
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="hd__mode-toggle">
                      <button
                        className={mode === "classic" ? "is-active" : ""}
                        onClick={() => setMode("classic")}
                      >
                        <i
                          className="fas fa-cube"
                          style={{ marginRight: "0.5rem" }}
                        />{" "}
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

                  </div>
                </div>
              </>
            )}

            {showHeader && active !== "HOME" && (
                <nav className="hd__nav-right">
                  {TABS.map((t) => (
                    <button
                      key={t}
                      className={`hd__nav-btn${active === t ? " is-active" : ""}`}
                      onClick={() => setActive(t)}
                    >
                      <i className={`fas ${TAB_ICONS[t]}`} />
                      <span className="hd__nav-label">{t}</span>
                    </button>
                  ))}
                </nav>
            )}

            {active !== "HOME" && (
              <div className="hd__mobile-actions">
                <MobileNav active={active} setActive={setActive} />
                {hasListFilters(active) && (
                  <button
                    type="button"
                    className="hd__nav-mobile-btn hd__nav-mobile-action-btn"
                    onClick={() => setShowNav(true)}
                    aria-label="Open filters"
                  >
                    <FiltersIcon />
                    <span className="hd__nav-mobile-btn-label">Filters</span>
                    {activeTags.size > 0 && (
                      <span className="hd__filter-badge">{activeTags.size}</span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {}
        </div>
      </header>

      {}
      {showNav && (
        <div className="flt-overlay" onClick={() => setShowNav(false)}>
          <div className="flt-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="flt-drawer__handle" />

            <div className="flt-section">
              <span className="flt-lbl">SEARCH</span>
              <div className="hd__search hd__search--mobile">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, player, level ID"
                />
              </div>
            </div>

            {layoutMode === "CARD" && (
              <div className="flt-section">
                <span className="flt-lbl">CARD SCALE</span>
                <div className="hd__layout-group hd__layout-group--drawer">
                  <div className="hd__scale-control">
                    <label htmlFor="drawer-card-scale-y">Scale Y</label>
                    <input
                      id="drawer-card-scale-y"
                      type="range"
                      min="0.5"
                      max="1.25"
                      step="0.05"
                      value={cardScale}
                      onChange={(e) => setCardScale(Number(e.target.value))}
                    />
                  </div>
                  <div className="hd__scale-control">
                    <label htmlFor="drawer-card-scale-x">Scale X</label>
                    <input
                      id="drawer-card-scale-x"
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={cardWidth}
                      onChange={(e) => setCardWidth(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flt-section">
              <span className="flt-lbl">MODE</span>
              <div className="hd__mode-toggle">
                <button
                  className={mode === "classic" ? "is-active" : ""}
                  onClick={() => setMode("classic")}
                >
                  <i
                    className="fas fa-cube"
                    style={{ marginRight: "0.5rem" }}
                  />{" "}
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
            </div>

            <div className="flt-section">
              <span className="flt-lbl">SORT</span>
              <div className="hd__sort-group hd__sort-group--mobile">
                <div className="flt-sort-row">
                  <DrawerSelect
                    value={sort}
                    options={SORT_OPTS}
                    onChange={setSort}
                    ariaLabel="Sort by"
                  />
                  <DrawerSelect
                    value={sortDir}
                    options={SORT_DIR_OPTS}
                    onChange={setSortDir}
                    ariaLabel="Sort direction"
                  />
                </div>
              </div>
              {projectionAvailable && (
                <label className="hd__toggle hd__toggle--drawer">
                  <input
                    type="checkbox"
                    checked={showProjectedRanks}
                    onChange={(e) => setShowProjectedRanks(e.target.checked)}
                  />
                  <span className="hd__toggle-label">Projected ranks</span>
                </label>
              )}
            </div>

            <div className="flt-section">
              <span className="flt-lbl">FILTER</span>
              <div className="hd__chips hd__chips--mobile">
                {allTags.map((t) => {
                  const state = activeTags.get(t);
                  const def = TAG_DEFINITIONS[t] || {};
                  return (
                    <button
                      key={t}
                      className={`hd__chip${state === "include" ? " is-include" : ""}${state === "exclude" ? " is-exclude" : ""} ${def.className || ""}`}
                      onClick={() => toggleTag(t)}
                      title={
                        def.tooltip ||
                        (state === "include"
                          ? "Include only"
                          : state === "exclude"
                            ? "Exclude"
                            : "Not filtering")
                      }
                    >
                      {TAG_ICONS[t] && (
                        <i className={`fas ${TAG_ICONS[t]}`} aria-hidden="true" />
                      )}
                      {def.text || t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
