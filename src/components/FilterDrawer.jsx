import SelectDropdown from "./SelectDropdown";
import { SORT_OPTS, SORT_DIR_OPTS } from "../constants/sortOptions";
import { ModeToggle, ScaleControls } from "./HeaderControls";
import FilterTagChips from "./FilterTagChips";
import RangeFilters from "./RangeFilters";

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
  canShowAllTags = false,
  showAllTags = false,
  setShowAllTags,
  progressFrom = "",
  setProgressFrom,
  progressTo = "",
  setProgressTo,
  hzMin = "",
  setHzMin,
  hzMax = "",
  setHzMax,
  lengthMin = "",
  setLengthMin,
  lengthMax = "",
  setLengthMax,
  dateFrom = "",
  setDateFrom,
  dateTo = "",
  setDateTo,
  hasActiveFilters = false,
  onResetFilters,
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
          <div className="sidebar__filter-head">
            <span className="flt-lbl">FILTER</span>
            <button
              type="button"
              className="sidebar__reset-btn"
              onClick={onResetFilters}
              disabled={!hasActiveFilters}
            >
              Reset
            </button>
          </div>
          <FilterTagChips
            tags={allTags}
            activeTags={activeTags}
            toggleTag={toggleTag}
            className="hd__chips hd__chips--mobile hd__chips--sidebar-grid"
            useTooltip={false}
          />
          {canShowAllTags && (
            <button
              type="button"
              className="sidebar__tags-toggle"
              onClick={() => setShowAllTags?.(!showAllTags)}
            >
              {showAllTags ? "Show list tags" : "Show all tags"}
            </button>
          )}
          <div className="sidebar__range-section">
            <RangeFilters
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              showLength={mode !== "platformer"}
              showProgress={activeTags.get("Progress") === "include"}
              showHertz={activeTags.get("Low Hertz") === "include"}
              progressFrom={progressFrom}
              progressTo={progressTo}
              onProgressFromChange={setProgressFrom}
              onProgressToChange={setProgressTo}
              hzMin={hzMin}
              hzMax={hzMax}
              onHzMinChange={setHzMin}
              onHzMaxChange={setHzMax}
              lengthMin={lengthMin}
              lengthMax={lengthMax}
              onLengthMinChange={setLengthMin}
              onLengthMaxChange={setLengthMax}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
