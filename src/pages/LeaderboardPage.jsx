import { useState, useRef, useEffect, Fragment, useMemo } from "react";
import { getNotesPreview } from "../utils/format";
import CountryFilterModal from "../components/CountryFilterModal";
import {
  buildPlayerBoard,
  buildSubmissionBoard,
  buildListPositionMap,
  getEntryRank,
  paginateRows,
  sortLeaderboardRows,
  getPaginationItems,
  PLAYER_SORT_OPTIONS,
  COUNTRY_SORT_OPTIONS,
  SUBMISSION_SORT_OPTIONS,
  SORT_DIR_OPTIONS,
} from "../utils/leaderboard";
import {
  buildCountryBoard,
  getCountryName,
  normalizeCountryCode,
} from "../utils/countryLeaderboard";
import achievementsData from "../../data/achievements.json";
import playerCountriesData from "../../data/playerCountries.json";
import pendingData from "../../data/pending.json";
import legacyData from "../../data/legacy.json";
import timelineData from "../../data/timeline.json";
import platformerpendingData from "../../data/platformerpending.json";
import platformersData from "../../data/platformers.json";
import platformerTimelineData from "../../data/platformertimeline.json";

const CountryFlag = ({ code, className = "lb__flag-img", size = 18 }) => {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return null;

  const height = Math.round(size * 0.75);

  return (
    <img
      src={`https://flagcdn.com/w40/${normalized.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${normalized.toLowerCase()}.png 2x`}
      alt=""
      className={className}
      width={size}
      height={height}
      loading="lazy"
      decoding="async"
    />
  );
};

const getRowKey = (row, mode) => (mode === "countries" ? row.code : row.name);

const UNKNOWN_COUNTRY_VALUE = "unknown";

const applyCountryFilter = (rows, selectedCountries) => {
  if (!selectedCountries?.length) return rows;

  return rows.filter((row) => {
    if (selectedCountries.includes(UNKNOWN_COUNTRY_VALUE) && !row.country) {
      return true;
    }
    if (row.country && selectedCountries.includes(row.country)) return true;
    return false;
  });
};

const rowMatchesSearch = (row, query, mode) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const name = String(row.name ?? "").toLowerCase();
  const bestName = String(row.best?.name ?? "").toLowerCase();
  const bestPlayer = String(row.best?.player ?? "").toLowerCase();

  if (mode === "countries") {
    return (
      name.includes(normalized) ||
      bestName.includes(normalized) ||
      bestPlayer.includes(normalized)
    );
  }

  return name.includes(normalized) || bestName.includes(normalized);
};

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const SOURCE_LABEL = {
  classic: "Classic",
  pending: "Classic Pending",
  legacy: "Legacy",
  timeline: "Classic Timeline",
  platformer: "Platformer",
  platformertimeline: "Platformer Timeline",
  platformerpending: "Platformer Pending",
};

const MEDALS = ["gold", "silver", "bronze"];
const PAGE_SIZE = 25;

const POINT_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

function Points({ value }) {
  const s = POINT_FORMATTER.format(value ?? 0);
  const parts = s.split(".");
  const intPart = parts[0];
  const decPart = parts[1];

  return (
    <>
      {intPart}
      {decPart ? (
        <span className="lb__decimal" style={{ color: "#777" }}>
          {`.${decPart}`}
        </span>
      ) : null}
    </>
  );
}

function LbDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  leading,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className={`lb__dropdown${className ? ` ${className}` : ""}`} ref={ref}>
      <button
        type="button"
        className="lb__dropdown-btn"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        {leading}
        <span className="lb__dropdown-label">{selected?.label}</span>
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
        <div className="lb__dropdown-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              className={`lb__dropdown-item${value === option.value ? " is-active" : ""}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.leading ? (
                <span className="lb__dropdown-item-leading">{option.leading}</span>
              ) : null}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatRank(rank) {
  return rank != null ? `#${rank}` : "—";
}

function toLevelModalEntry(entry) {
  const listRank = getEntryRank(entry);
  return {
    ...entry,
    listRank,
    rank: listRank,
  };
}

function getLeaderboardPath(mode, listSource) {
  if (mode === "players") {
    return listSource === "platformer"
      ? "/leaderboard/players/platformer"
      : "/leaderboard/players";
  }
  if (mode === "countries") {
    return listSource === "platformer"
      ? "/leaderboard/countries/platformer"
      : "/leaderboard/countries";
  }
  if (mode === "submissions") {
    return listSource === "platformer"
      ? "/leaderboard/submission/platformer"
      : "/leaderboard/submission";
  }
  return "/leaderboard/players";
}

const combinedClassic = achievementsData.map((entry) => ({
  ...entry,
  _src: "classic",
}));

const platformerList = platformersData.map((entry) => ({
  ...entry,
  _src: "platformer",
}));

const CLASSIC_POSITION_MAP = buildListPositionMap(combinedClassic);
const PLATFORMER_POSITION_MAP = buildListPositionMap(platformerList);

const PLAYER_BOARDS = {
  classic: buildPlayerBoard(combinedClassic, playerCountriesData),
  platformer: buildPlayerBoard(platformerList, playerCountriesData),
};

const COUNTRY_BOARDS = {
  classic: buildCountryBoard(PLAYER_BOARDS.classic, playerCountriesData),
  platformer: buildCountryBoard(PLAYER_BOARDS.platformer, playerCountriesData),
};

export const DEFAULT_BOARDS = {
  players: PLAYER_BOARDS,
  countries: COUNTRY_BOARDS,
  submissions: null,
};

const CLASSIC_SUBMISSION_SOURCES = new Set([
  "classic",
  "pending",
  "legacy",
  "timeline",
]);

const PLATFORMER_SUBMISSION_SOURCES = new Set([
  "platformer",
  "platformerpending",
  "platformertimeline",
]);

const ALL_SUBMISSION_ENTRIES = [
  ...achievementsData.map((entry) => ({ ...entry, _src: "classic" })),
  ...pendingData.map((entry) => ({ ...entry, _src: "pending" })),
  ...legacyData.map((entry) => ({ ...entry, _src: "legacy" })),
  ...timelineData.map((entry) => ({ ...entry, _src: "timeline" })),
  ...platformersData.map((entry) => ({ ...entry, _src: "platformer" })),
  ...platformerpendingData.map((entry) => ({
    ...entry,
    _src: "platformerpending",
  })),
  ...platformerTimelineData.map((entry) => ({
    ...entry,
    _src: "platformertimeline",
  })),
];

function filterSubmissionEntries(listSource) {
  const allowed =
    listSource === "platformer"
      ? PLATFORMER_SUBMISSION_SOURCES
      : CLASSIC_SUBMISSION_SOURCES;

  return ALL_SUBMISSION_ENTRIES.filter((entry) => allowed.has(entry._src));
}

const SUBMISSION_BOARDS = {
  classic: buildSubmissionBoard(
    filterSubmissionEntries("classic"),
    CLASSIC_POSITION_MAP,
    PLATFORMER_POSITION_MAP,
  ),
  platformer: buildSubmissionBoard(
    filterSubmissionEntries("platformer"),
    CLASSIC_POSITION_MAP,
    PLATFORMER_POSITION_MAP,
  ),
};

DEFAULT_BOARDS.submissions = SUBMISSION_BOARDS;

const COUNTRY_FILTER_OPTIONS = [
  ...new Set(
    Object.values(playerCountriesData).map((code) => String(code).toUpperCase()),
  ),
]
  .sort((a, b) => getCountryName(a).localeCompare(getCountryName(b)))
  .map((code) => ({
    value: code,
    label: getCountryName(code),
    name: getCountryName(code),
  }));

function getDefaultSort(mode) {
  return "globalRank";
}

function getEmptyMessage(mode, hasActiveFilters) {
  if (!hasActiveFilters) {
    if (mode === "countries") return "No countries found.";
    if (mode === "submissions") return "No submitters found.";
    return "No players found.";
  }

  if (mode === "countries") return "No countries match your filters.";
  if (mode === "submissions") return "No submitters match your filters.";
  return "No players match your filters.";
}

function getLeaderboardCountLabel(mode, count) {
  if (mode === "countries") {
    return count === 1 ? "1 country" : `${count} countries`;
  }
  if (mode === "submissions") {
    return count === 1 ? "1 submitter" : `${count} submitters`;
  }
  return count === 1 ? "1 player" : `${count} players`;
}

function getCountryFilterLeading(selectedCountries) {
  if (!selectedCountries.length) {
    return <span className="lb__filter-globe">🌐</span>;
  }

  if (selectedCountries.length === 1) {
    const code = selectedCountries[0];
    if (code === UNKNOWN_COUNTRY_VALUE) {
      return <span className="lb__filter-globe">?</span>;
    }
    return <CountryFlag code={code} size={16} />;
  }

  return <span className="lb__filter-globe">🌐</span>;
}

function getCountryFilterLabel(selectedCountries) {
  if (!selectedCountries.length) return "All countries";

  if (selectedCountries.length === 1) {
    const code = selectedCountries[0];
    if (code === UNKNOWN_COUNTRY_VALUE) return "Unknown";
    return getCountryName(code);
  }

  return `${selectedCountries.length} countries`;
}

const SITE_HEADER_HEIGHT = 80;

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

function DetailScroll({ children }) {
  return <div className="lb__detail-scroll lb__scrollbar">{children}</div>;
}

function isPendingSubmission(entry) {
  return entry?._src === "pending" || entry?._src === "platformerpending";
}

function AchievementRow({
  entry,
  meta,
  points,
  isDuplicate = false,
  pendingRemoval = entry?.tags?.includes("Pending Removal"),
  isPending = isPendingSubmission(entry),
  onAchievementClick,
}) {
  const clickable = Boolean(onAchievementClick);
  const pointsValue = points ?? entry.points ?? 0;
  let statusClass = "";
  if (pendingRemoval) statusClass = " is-pending-removal";
  else if (isPending) statusClass = " is-pending";

  return (
    <div
      className={`lb__ach${isDuplicate ? " is-duplicate" : ""}${statusClass}${clickable ? " lb__ach--clickable" : ""}`}
      title={getNotesPreview(entry.notes) || undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={
        clickable
          ? () => onAchievementClick(toLevelModalEntry(entry))
          : undefined
      }
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onAchievementClick(toLevelModalEntry(entry));
              }
            }
          : undefined
      }
    >
      <span className="lb__ach-rank">{formatRank(getEntryRank(entry))}</span>
      <div className="lb__ach-info">
        <span className="lb__ach-name">{entry.name}</span>
        <span className="lb__ach-meta">{meta}</span>
      </div>
      <span className="lb__ach-points">
        {points != null ? (
          <>
            +<Points value={pointsValue} />
          </>
        ) : (
          pointsValue
        )}
      </span>
    </div>
  );
}

function CountryDetailContent({ country, view, onViewChange, onAchievementClick }) {
  return (
    <div className="lb__detail-body">
      <div className="lb__detail-hd">
        <div className="lb__detail-left">
          <span className="lb__detail-pos">#{country.globalRank}</span>
          <h2 className="lb__detail-name">
            <CountryFlag code={country.code} className="lb__flag-img lb__flag-img--inline" />
            {country.name}
          </h2>
        </div>
        <span className="lb__detail-points">
          <Points value={country.totalXP} /> pts
        </span>
      </div>

      <div className="lb__mode-toggle lb__mode-toggle--nested lb__detail-toggle">
        <button
          type="button"
          className={`lb__mode-btn${view === "players" ? " is-active" : ""}`}
          onClick={() => onViewChange("players")}
        >
          Players
        </button>
        <button
          type="button"
          className={`lb__mode-btn${view === "achievements" ? " is-active" : ""}`}
          onClick={() => onViewChange("achievements")}
        >
          Achievements
        </button>
      </div>

      <DetailScroll>
        {view === "players" ? (
          <div className="lb__achs">
            {country.players.map((player) => (
              <div key={player.name} className="lb__ach">
                <span className="lb__ach-rank">#{player.globalRank}</span>
                <div className="lb__ach-info">
                  <span className="lb__ach-name">{player.name}</span>
                  <span className="lb__ach-meta">
                    {player.best
                      ? `${formatRank(player.bestRank)} · ${player.best.name}`
                      : "—"}
                  </span>
                </div>
                <span className="lb__ach-points">
                  <Points value={player.totalXP} />
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="lb__achs">
            {country.achievements.map((entry) => (
              <AchievementRow
                key={`${entry.name}-${entry.listPosition}-${entry._src}-${entry.player}`}
                entry={entry}
                meta={`${entry.player} · ${SOURCE_LABEL[entry._src]} · ${fmt(entry.date)}`}
                points={entry.points ?? 0}
                onAchievementClick={onAchievementClick}
              />
            ))}
          </div>
        )}
      </DetailScroll>
    </div>
  );
}

function DetailContent({
  player,
  mode,
  countryDetailView,
  onCountryDetailViewChange,
  onAchievementClick,
}) {
  if (mode === "countries") {
    return (
      <CountryDetailContent
        country={player}
        view={countryDetailView}
        onViewChange={onCountryDetailViewChange}
        onAchievementClick={onAchievementClick}
      />
    );
  }

  if (mode === "submissions") {
    return (
      <div className="lb__detail-body">
        <div className="lb__detail-hd">
          <div className="lb__detail-left">
            <span className="lb__detail-pos">#{player.globalRank}</span>
            <h2 className="lb__detail-name">{player.name}</h2>
          </div>
          <span className="lb__detail-points">{player.pts} submissions</span>
        </div>

        <DetailScroll>
          <div className="lb__achs">
            {player.submissions.map((entry, index) => (
              <AchievementRow
                key={`${entry.name}-${index}-${entry._src}`}
                entry={entry}
                meta={`${SOURCE_LABEL[entry._src] ?? "Classic"} · ${fmt(entry.date)}`}
                points={1}
                onAchievementClick={onAchievementClick}
              />
            ))}
          </div>
        </DetailScroll>
      </div>
    );
  }

  return (
    <div className="lb__detail-body">
      <div className="lb__detail-hd">
        <div className="lb__detail-left">
          <span className="lb__detail-pos">#{player.globalRank}</span>
          <h2 className="lb__detail-name">
            {player.country ? (
              <CountryFlag
                code={player.country}
                className="lb__flag-img lb__flag-img--inline"
              />
            ) : null}
            {player.name}
          </h2>
        </div>
        <span className="lb__detail-points">
          <Points value={player.totalXP} /> pts
        </span>
      </div>

      <DetailScroll>
        <div className="lb__achs">
          {player.achievements.map((entry) => (
            <AchievementRow
              key={`${entry.name}-${entry.listPosition}-${entry._src}`}
              entry={entry}
              meta={`${SOURCE_LABEL[entry._src]} · ${fmt(entry.date)}`}
              points={entry.points ?? 0}
              isDuplicate={entry.isDuplicate}
              onAchievementClick={onAchievementClick}
            />
          ))}
        </div>
      </DetailScroll>
    </div>
  );
}

function EllipsisJump({ defaultPage, totalPages, onPageChange }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(defaultPage));

  useEffect(() => {
    setValue(String(defaultPage));
  }, [defaultPage]);

  const commit = () => {
    const nextPage = Number(value);
    if (!Number.isFinite(nextPage)) {
      setEditing(false);
      return;
    }
    onPageChange(Math.min(Math.max(1, nextPage), totalPages));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        className="lb__page-input lb__page-input--ellipsis"
        type="number"
        min={1}
        max={totalPages}
        value={value}
        autoFocus
        aria-label="Jump to page"
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="lb__page-ellipsis"
      aria-label={`Jump near page ${defaultPage}`}
      onClick={() => {
        setValue(String(defaultPage));
        setEditing(true);
      }}
    >
      ...
    </button>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  const items = getPaginationItems(page, totalPages);

  if (totalPages <= 1) return null;

  return (
    <div className="lb__pagination">
      <button
        type="button"
        className="lb__page-btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>

      <div className="lb__page-numbers">
        {items.map((item, index) => {
          if (item.type === "ellipsis") {
            return (
              <EllipsisJump
                key={`${item.side}-${index}`}
                defaultPage={item.defaultPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            );
          }

          return (
            <button
              key={item.value}
              type="button"
              className={`lb__page-num${item.value === page ? " is-active" : ""}`}
              onClick={() => onPageChange(item.value)}
            >
              {item.value}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="lb__page-btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

export default function LeaderboardPage({
  initialMode = "players",
  initialListSource = "classic",
  onAchievementClick,
  boards = DEFAULT_BOARDS,
}) {
  const [mode, setMode] = useState(initialMode);
  const [listSource, setListSource] = useState(initialListSource);
  const [selectedKey, setSelectedKey] = useState(null);
  const [countryFilter, setCountryFilter] = useState([]);
  const [countryFilterOpen, setCountryFilterOpen] = useState(false);
  const [countryDetailView, setCountryDetailView] = useState("players");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState(getDefaultSort(initialMode));
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const headRef = useRef(null);
  const layoutRef = useRef(null);
  const paginationRef = useRef(null);
  const sidebarRef = useRef(null);
  const [headHeight, setHeadHeight] = useState(0);
  const [sidebarBounds, setSidebarBounds] = useState(null);
  const isMobileLayout = useMediaQuery("(max-width: 640px)");

  useEffect(() => {
    setMode(initialMode);
    setListSource(initialListSource);
    setSelectedKey(null);
    setCountryDetailView("players");
    setPage(1);
    setSortKey(getDefaultSort(initialMode));
    setSortDir("asc");
  }, [initialMode, initialListSource]);

  const baseLeaderboard = useMemo(() => {
    if (mode === "countries") return boards.countries[listSource];
    if (mode === "submissions") return boards.submissions[listSource];
    return boards.players[listSource];
  }, [mode, listSource, boards]);

  const sortOptions = useMemo(() => {
    if (mode === "countries") return COUNTRY_SORT_OPTIONS;
    if (mode === "submissions") return SUBMISSION_SORT_OPTIONS;
    return PLAYER_SORT_OPTIONS;
  }, [mode]);

  const hasUnknownNationalityPlayers = useMemo(() => {
    const playerBoard = boards.players[listSource] ?? [];
    return playerBoard.some((row) => !row.country);
  }, [boards.players, listSource]);

  const countryFilterModalOptions = useMemo(() => {
    const options = hasUnknownNationalityPlayers
      ? [
          { value: UNKNOWN_COUNTRY_VALUE, label: "Unknown" },
          ...COUNTRY_FILTER_OPTIONS,
        ]
      : COUNTRY_FILTER_OPTIONS;

    return options.map((option) => ({
      ...option,
      leading:
        option.value === UNKNOWN_COUNTRY_VALUE ? (
          <span className="lb__filter-globe">?</span>
        ) : (
          <CountryFlag code={option.value} size={16} />
        ),
    }));
  }, [hasUnknownNationalityPlayers]);

  const processedLeaderboard = useMemo(() => {
    let rows = baseLeaderboard;

    if (mode === "players" && countryFilter.length > 0) {
      rows = applyCountryFilter(rows, countryFilter);
    }

    if (searchQuery.trim()) {
      rows = rows.filter((row) => rowMatchesSearch(row, searchQuery, mode));
    }

    return sortLeaderboardRows(rows, sortKey, sortDir);
  }, [baseLeaderboard, mode, countryFilter, searchQuery, sortKey, sortDir]);

  const pagination = useMemo(
    () => paginateRows(processedLeaderboard, page, PAGE_SIZE),
    [processedLeaderboard, page],
  );

  const selectedRow = useMemo(() => {
    if (!selectedKey) return null;
    return (
      processedLeaderboard.find((row) => getRowKey(row, mode) === selectedKey) ??
      null
    );
  }, [processedLeaderboard, selectedKey, mode]);

  useEffect(() => {
    setPage(1);
    setSelectedKey(null);
  }, [mode, listSource, countryFilter, searchQuery, sortKey, sortDir]);

  useEffect(() => {
    setCountryDetailView("players");
  }, [selectedKey]);

  useEffect(() => {
    if (mode !== "players") {
      setCountryFilter([]);
      setCountryFilterOpen(false);
    }
    setSearchQuery("");
  }, [mode]);

  useEffect(() => {
    if (hasUnknownNationalityPlayers) return;
    setCountryFilter((current) => {
      if (!current.includes(UNKNOWN_COUNTRY_VALUE)) return current;
      return current.filter((code) => code !== UNKNOWN_COUNTRY_VALUE);
    });
  }, [hasUnknownNationalityPlayers]);

  useEffect(() => {
    if (!sortOptions.some((option) => option.value === sortKey)) {
      setSortKey(getDefaultSort(mode));
    }
  }, [sortOptions, sortKey, mode]);

  useEffect(() => {
    if (!headRef.current) return;

    setHeadHeight(headRef.current.offsetHeight);

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setHeadHeight(entry.contentRect.height);
    });

    observer.observe(headRef.current);
    return () => observer.disconnect();
  }, [mode, listSource, countryFilter, searchQuery, sortOptions.length]);

  const sidebarStickyTop = SITE_HEADER_HEIGHT + headHeight + 16;

  const sidebarStyle = sidebarBounds
    ? {
        top: `${sidebarBounds.top}px`,
        maxHeight: `${sidebarBounds.maxHeight}px`,
      }
    : {
        top: `${sidebarStickyTop}px`,
        maxHeight: `calc(100vh - ${sidebarStickyTop + 16}px)`,
      };

  useEffect(() => {
    if (!selectedRow || isMobileLayout) {
      setSidebarBounds(null);
      return;
    }

    const measureSidebarBounds = () => {
      const layout = layoutRef.current;
      const pagination = paginationRef.current;
      if (!layout) return;

      const stickTop = SITE_HEADER_HEIGHT + headHeight + 16;
      const gap = 16;
      const layoutRect = layout.getBoundingClientRect();
      let maxHeight = window.innerHeight - stickTop - gap;

      if (pagination) {
        const paginationTop = pagination.getBoundingClientRect().top;
        if (paginationTop > stickTop) {
          maxHeight = Math.min(maxHeight, paginationTop - stickTop - gap);
        }
      }

      const layoutLimit = layoutRect.bottom - stickTop - gap;
      if (layoutLimit > 0) {
        maxHeight = Math.min(maxHeight, layoutLimit);
      }

      setSidebarBounds({
        top: stickTop,
        maxHeight: Math.max(180, maxHeight),
      });
    };

    measureSidebarBounds();
    window.addEventListener("resize", measureSidebarBounds);
    window.addEventListener("scroll", measureSidebarBounds, { passive: true });

    return () => {
      window.removeEventListener("resize", measureSidebarBounds);
      window.removeEventListener("scroll", measureSidebarBounds);
    };
  }, [selectedRow, headHeight, pagination.page, mode, listSource, isMobileLayout]);

  useEffect(() => {
    if (!selectedKey || isMobileLayout) return;

    const frame = requestAnimationFrame(() => {
      const sidebar = sidebarRef.current;
      const head = headRef.current;
      if (!sidebar || !head) return;

      const sidebarRect = sidebar.getBoundingClientRect();
      const headRect = head.getBoundingClientRect();
      const minTop = headRect.bottom + 16;

      if (sidebarRect.top < minTop) {
        window.scrollBy({
          top: sidebarRect.top - minTop,
          behavior: "smooth",
        });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [selectedKey, headHeight, isMobileLayout]);

  useEffect(() => {
    if (!isMobileLayout) return;

    const syncStickyOffsets = () => {
      const siteHeader = document.querySelector(".hd");
      const toolbar = document.querySelector(".lb__toolbar--sticky");
      const root = document.documentElement;

      if (siteHeader) {
        root.style.setProperty(
          "--lb-sticky-top",
          `${siteHeader.getBoundingClientRect().height}px`,
        );
      }

      if (toolbar) {
        root.style.setProperty(
          "--lb-toolbar-height",
          `${toolbar.getBoundingClientRect().height}px`,
        );
      }
    };

    syncStickyOffsets();

    const observers = [];
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(syncStickyOffsets);
      const siteHeader = document.querySelector(".hd");
      const toolbar = document.querySelector(".lb__toolbar--sticky");

      if (siteHeader) observer.observe(siteHeader);
      if (toolbar) observer.observe(toolbar);
      observers.push(observer);
    }

    window.addEventListener("resize", syncStickyOffsets);

    return () => {
      observers.forEach((observer) => observer.disconnect());
      window.removeEventListener("resize", syncStickyOffsets);
    };
  }, [isMobileLayout, mode, listSource, headHeight]);

  useEffect(() => {
    if (!isMobileLayout) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [isMobileLayout, mode, listSource, pagination.page]);

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    setSelectedKey(null);
  };

  function navigateLeaderboard(nextMode, nextListSource = listSource) {
    const path = getLeaderboardPath(nextMode, nextListSource);
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function switchMode(nextMode) {
    navigateLeaderboard(nextMode, listSource);
  }

  function switchListSource(nextSource) {
    navigateLeaderboard(mode, nextSource);
  }

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    (mode === "players" && countryFilter.length > 0);

  return (
    <div className="lb">
      <div
        ref={headRef}
        className={`lb__head${isMobileLayout ? "" : " lb__head--sticky"}`}
      >
        <h1 className="lb__title">Leaderboard</h1>
        <p className="lb__sub">
          {getLeaderboardCountLabel(mode, processedLeaderboard.length)}
        </p>

        <div className="lb__mode-toggle">
          <button
            className={`lb__mode-btn${mode === "players" ? " is-active" : ""}`}
            onClick={() => switchMode("players")}
          >
            Players
          </button>
          <button
            className={`lb__mode-btn${mode === "countries" ? " is-active" : ""}`}
            onClick={() => switchMode("countries")}
          >
            Countries
          </button>
          <button
            className={`lb__mode-btn${mode === "submissions" ? " is-active" : ""}`}
            onClick={() => switchMode("submissions")}
          >
            Submissions
          </button>
        </div>

        {(mode === "players" || mode === "countries" || mode === "submissions") && (
          <div className="lb__mode-toggle lb__mode-toggle--nested">
            <button
              className={`lb__mode-btn${listSource === "classic" ? " is-active" : ""}`}
              onClick={() => switchListSource("classic")}
            >
              Classic List
            </button>
            <button
              className={`lb__mode-btn${listSource === "platformer" ? " is-active" : ""}`}
              onClick={() => switchListSource("platformer")}
            >
              Platformer List
            </button>
          </div>
        )}

        <div
          className={`lb__toolbar${isMobileLayout ? " lb__toolbar--sticky" : ""}`}
        >
          <input
            className="lb__search"
            type="search"
            value={searchQuery}
            placeholder={
              mode === "countries"
                ? "Search countries..."
                : mode === "submissions"
                  ? "Search submitters..."
                  : "Search players..."
            }
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Search leaderboard"
          />

          {mode === "players" && (
            <div className="lb__dropdown lb__dropdown--country">
              <button
                type="button"
                className="lb__dropdown-btn"
                aria-label="Filter by country"
                aria-haspopup="dialog"
                onClick={() => setCountryFilterOpen(true)}
              >
                {getCountryFilterLeading(countryFilter)}
                <span className="lb__dropdown-label">
                  {getCountryFilterLabel(countryFilter)}
                </span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path
                    d="M2 3.5L5 6.5L8 3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          )}

          <LbDropdown
            value={sortKey}
            ariaLabel="Sort leaderboard"
            options={sortOptions}
            onChange={setSortKey}
          />

          <LbDropdown
            value={sortDir}
            ariaLabel="Sort direction"
            options={SORT_DIR_OPTIONS}
            onChange={setSortDir}
          />
        </div>
      </div>

      <div
        ref={layoutRef}
        className={`lb__layout${selectedRow && !isMobileLayout ? " has-detail" : ""}`}
      >
        <div className="lb__list">
          {pagination.totalCount === 0 && (
            <p className="lb__empty">
              {getEmptyMessage(mode, hasActiveFilters)}
            </p>
          )}

          {pagination.rows.map((row) => {
            const rowKey = getRowKey(row, mode);
            const isSelected = selectedKey === rowKey;
            const displayRank = row.globalRank;

            return (
              <Fragment key={rowKey}>
                <div
                  className={`lb__row${isSelected ? " is-sel" : ""}`}
                  onClick={() => setSelectedKey(isSelected ? null : rowKey)}
                >
                  <span
                    className={`lb__pos${displayRank <= 3 ? ` lb__pos--${MEDALS[displayRank - 1]}` : ""}`}
                  >
                    {displayRank}
                  </span>

                  <div className="lb__pinfo">
                    {mode === "countries" ? (
                      <>
                        <span className="lb__pname">
                          <CountryFlag
                            code={row.code}
                            className="lb__flag-img lb__flag-img--inline"
                          />
                          <span className="lb__pname-text">{row.name}</span>
                        </span>
                        <span
                          className="lb__pbest"
                          title={
                            row.best
                              ? `${formatRank(row.bestRank)} · ${row.best.name} by ${row.best.player}`
                              : undefined
                          }
                        >
                          {row.best
                            ? `${formatRank(row.bestRank)} · ${row.best.name} by ${row.best.player}`
                            : "—"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="lb__pname">
                          {row.country ? (
                            <CountryFlag
                              code={row.country}
                              className="lb__flag-img lb__flag-img--inline"
                            />
                          ) : null}
                          <span className="lb__pname-text">{row.name}</span>
                        </span>
                        <span
                          className="lb__pbest"
                          title={
                            row.best
                              ? `${formatRank(row.bestRank)} · ${row.best.name}`
                              : undefined
                          }
                        >
                          {row.best
                            ? `${formatRank(row.bestRank)} · ${row.best.name}`
                            : "—"}
                        </span>
                      </>
                    )}
                  </div>

                  <span className="lb__points-total">
                    {mode === "submissions" ? (
                      <>
                        {row.pts} <span>submissions</span>
                      </>
                    ) : (
                      <>
                        <Points value={row.totalXP} /> <span>pts</span>
                      </>
                    )}
                  </span>
                </div>

                {isSelected && (
                  <div className="lb__detail lb__detail--inline">
                    <DetailContent
                      player={row}
                      mode={mode}
                      countryDetailView={countryDetailView}
                      onCountryDetailViewChange={setCountryDetailView}
                      onAchievementClick={onAchievementClick}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        {selectedRow && !isMobileLayout && (
          <div
            ref={sidebarRef}
            className="lb__detail lb__detail--sidebar"
            style={sidebarStyle}
          >
            <DetailContent
              player={selectedRow}
              mode={mode}
              countryDetailView={countryDetailView}
              onCountryDetailViewChange={setCountryDetailView}
              onAchievementClick={onAchievementClick}
            />
          </div>
        )}
      </div>

      <div ref={paginationRef}>
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      <CountryFilterModal
        open={countryFilterOpen}
        value={countryFilter}
        options={countryFilterModalOptions}
        onChange={setCountryFilter}
        onClose={() => setCountryFilterOpen(false)}
      />
    </div>
  );
}
