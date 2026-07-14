import { useState, useRef, useEffect } from "react";
import FilterDrawer from "./FilterDrawer";
import {
  DiscordButton,
  HeaderSortGroup,
  ModeToggle,
  ScaleControls,
} from "./HeaderControls";

const ALL_TABS = ["HOME", "MAIN", "PENDING", "TIMELINE", "LEGACY", "LEADERBOARD"];
const getTabsForMode = (mode) =>
  mode === "platformer" ? ALL_TABS.filter((t) => t !== "LEGACY") : ALL_TABS;

const TAB_ICONS = {
  HOME: "fa-house",
  MAIN: "fa-bars",
  TIMELINE: "fa-clock-rotate-left",
  PENDING: "fa-clock",
  LEGACY: "fa-box-archive",
  LEADERBOARD: "fa-ranking-star",
};

const hasListControls = (t) =>
  t === "MAIN" || t === "LEGACY" || t === "PENDING" || t === "TIMELINE";
const hasListFilters = hasListControls;

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

function MobileNav({ active, setActive, tabs }) {
  const [open, setOpen] = useState(false);
  const [fitsInline, setFitsInline] = useState(false);
  const wrapRef = useRef(null);
  const measureRef = useRef(null);
  const dropdownRef = useRef(null);
  const navTabs = tabs ?? ALL_TABS;

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
    window.addEventListener("resize", check);
    check();

    if (document.fonts?.ready) {
      document.fonts.ready.then(check).catch(() => {});
    }

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [active]);

  const activeTab = navTabs.includes(active) ? active : navTabs[0];

  const handleSelect = (tab) => {
    setActive(tab);
    setOpen(false);
  };

  return (
    <div className="hd__nav-mobile" ref={wrapRef}>
      <div className="hd__nav-mobile-measure" ref={measureRef} aria-hidden="true">
        {navTabs.map((t) => (
          <span key={t} className="hd__nav-btn hd__nav-mobile-tab">
            <i className={`fas ${TAB_ICONS[t]}`} aria-hidden="true" />
            <span className="hd__nav-label">{t}</span>
          </span>
        ))}
      </div>

      {fitsInline ? (
        <nav className="hd__nav-mobile-tabs" aria-label="List navigation">
          {navTabs.map((t) => (
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
              {navTabs.map((t) => (
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

const MOBILE_NAV_QUERY = "(max-width: 1024px)";
const SEARCH_MIN_WIDTH = 220;
const DISCORD_BTN_WIDTH = 44;
const CONTROLS_INNER_GAP = 12;
const NAV_FIT_SLACK = 8;

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
  cardScale,
  setCardScale,
  cardWidth,
  setCardWidth,
  projectionAvailable = false,
  showProjectedRanks = false,
  setShowProjectedRanks,
}) {
  const [showNav, setShowNav] = useState(false);
  const [compactNav, setCompactNav] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(MOBILE_NAV_QUERY).matches
      : false,
  );
  const tabs = getTabsForMode(mode);

  const rowRef = useRef(null);
  const brandRef = useRef(null);
  const navMeasureRef = useRef(null);
  const compactNavRef = useRef(compactNav);

  useEffect(() => {
    compactNavRef.current = compactNav;
  }, [compactNav]);

  useEffect(() => {
    if (active === "HOME") return;

    const row = rowRef.current;
    const navMeasure = navMeasureRef.current;
    if (!row || !navMeasure) return;

    const setCompact = (next) => {
      if (compactNavRef.current === next) return;
      compactNavRef.current = next;
      setCompactNav(next);
    };

    const measureNeeded = () => {
      const gap =
        Number.parseFloat(
          getComputedStyle(row).columnGap || getComputedStyle(row).gap,
        ) || 0;
      const brandW = brandRef.current?.offsetWidth ?? 0;
      const navW = navMeasure.scrollWidth;
      const needsControls = hasListControls(active);

      if (!needsControls) return brandW + gap + navW;

      const controlsW =
        SEARCH_MIN_WIDTH + CONTROLS_INNER_GAP + DISCORD_BTN_WIDTH;
      return brandW + gap * 2 + controlsW + navW;
    };

    const check = () => {
      if (window.matchMedia(MOBILE_NAV_QUERY).matches) {
        setCompact(true);
        return;
      }

      const needed = measureNeeded();
      const available = row.clientWidth;

      if (compactNavRef.current) {
        // Expand once there is clear room for the full desktop header.
        if (needed + NAV_FIT_SLACK <= available) setCompact(false);
        return;
      }

      if (needed > available) setCompact(true);
    };

    const ro = new ResizeObserver(check);
    ro.observe(row);
    ro.observe(navMeasure);
    if (brandRef.current) ro.observe(brandRef.current);

    const media = window.matchMedia(MOBILE_NAV_QUERY);
    media.addEventListener("change", check);
    window.addEventListener("resize", check);
    check();

    if (document.fonts?.ready) {
      document.fonts.ready.then(check).catch(() => {});
    }

    return () => {
      ro.disconnect();
      media.removeEventListener("change", check);
      window.removeEventListener("resize", check);
    };
  }, [active, mode, tabs.length]);

  return (
    <>
      <header
        className={`hd${compactNav ? " hd--compact-nav" : ""}`}
      >
        <div className="hd__layout">
          <div className="hd__row" ref={rowRef}>
            {active !== "HOME" && (
              <div className="hd__brand" ref={brandRef}>
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

            <div className="hd__nav-fit-measure" ref={navMeasureRef} aria-hidden="true">
              {tabs.map((t) => (
                <span key={t} className="hd__nav-btn">
                  <i className={`fas ${TAB_ICONS[t]}`} aria-hidden="true" />
                  <span className="hd__nav-label">{t}</span>
                </span>
              ))}
            </div>

            {hasListControls(active) ? (
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
                  <DiscordButton />

                  <HeaderSortGroup
                    sort={sort}
                    setSort={setSort}
                    sortDir={sortDir}
                    setSortDir={setSortDir}
                  />

                  <ScaleControls
                    idPrefix="header"
                    cardScale={cardScale}
                    setCardScale={setCardScale}
                    cardWidth={cardWidth}
                    setCardWidth={setCardWidth}
                  />

                  <ModeToggle mode={mode} setMode={setMode} />

                </div>
              </div>
            ) : (
              active !== "HOME" && (
                // No search/sort/scale controls on this tab, but keep the same
                // flex filler so nav tabs land in the exact same spot as on
                // list pages, with the Discord button anchored beside them.
                <div className="hd__controls-wrapper hd__controls-wrapper--minimal">
                  <DiscordButton />
                </div>
              )
            )}

            {active !== "HOME" && (
                <nav className="hd__nav-right">
                  {tabs.map((t) => (
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
                <MobileNav active={active} setActive={setActive} tabs={tabs} />
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
        </div>
      </header>

      {showNav && (
        <FilterDrawer
          onClose={() => setShowNav(false)}
          search={search}
          setSearch={setSearch}
          mode={mode}
          setMode={setMode}
          sort={sort}
          setSort={setSort}
          sortDir={sortDir}
          setSortDir={setSortDir}
          cardScale={cardScale}
          setCardScale={setCardScale}
          cardWidth={cardWidth}
          setCardWidth={setCardWidth}
          projectionAvailable={projectionAvailable}
          showProjectedRanks={showProjectedRanks}
          setShowProjectedRanks={setShowProjectedRanks}
          allTags={allTags}
          activeTags={activeTags}
          toggleTag={toggleTag}
        />
      )}

    </>
  );
}
