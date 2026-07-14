import SelectDropdown from "./SelectDropdown";
import { TAG_DEFINITIONS, TAG_ICONS } from "../utils/tags";
import { SORT_OPTS, SORT_DIR_OPTS } from "../constants/sortOptions";
import { ModeToggle, ScaleControls } from "./HeaderControls";

export default function FilterDrawer({
  onClose,
  search,
  setSearch,
  mode,
  setMode,
  sort,
  setSort,
  sortDir,
  setSortDir,
  cardScale,
  setCardScale,
  cardWidth,
  setCardWidth,
  projectionAvailable,
  showProjectedRanks,
  setShowProjectedRanks,
  allTags,
  activeTags,
  toggleTag,
}) {
  return (
    <div className="flt-overlay" onClick={onClose}>
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

        <div className="flt-section">
          <span className="flt-lbl">CARD SCALE</span>
          <ScaleControls
            idPrefix="drawer"
            className="hd__layout-group hd__layout-group--drawer"
            cardScale={cardScale}
            setCardScale={setCardScale}
            cardWidth={cardWidth}
            setCardWidth={setCardWidth}
          />
        </div>

        <div className="flt-section">
          <span className="flt-lbl">MODE</span>
          <ModeToggle mode={mode} setMode={setMode} />
        </div>

        <div className="flt-section">
          <span className="flt-lbl">SORT</span>
          <div className="hd__sort-group hd__sort-group--mobile">
            <div className="flt-sort-row">
              <SelectDropdown
                value={sort}
                options={SORT_OPTS}
                onChange={setSort}
                ariaLabel="Sort by"
                variant="hd-drawer"
              />
              <SelectDropdown
                value={sortDir}
                options={SORT_DIR_OPTS}
                onChange={setSortDir}
                ariaLabel="Sort direction"
                variant="hd-drawer"
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
  );
}
