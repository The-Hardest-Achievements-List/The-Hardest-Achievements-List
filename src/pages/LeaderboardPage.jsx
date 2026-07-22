import { useState, useRef, useEffect, Fragment, useMemo } from "react";
import { formatDate, getNotesPreview } from "../utils/format";
import CountryFilterModal from "../components/CountryFilterModal";
import SelectDropdown from "../components/SelectDropdown";
import PaginationControls from "../components/PaginationControls";
import {
  buildPlayerBoard,
  buildSubmissionBoard,
  buildListPositionMap,
  getEntryRank,
  paginateRows,
  sortLeaderboardRows,
  isShadowRealmRow,
  PLAYER_SORT_OPTIONS,
  COUNTRY_SORT_OPTIONS,
  SUBMISSION_SORT_OPTIONS,
  SORT_DIR_OPTIONS,
  getLeaderboardPath,
} from "../utils/leaderboard";
import {
  buildCountryBoard,
  getCountryName,
  normalizeCountryCode,
  normalizeCountryCodes,
} from "../utils/countryLeaderboard";
import { annotateVariantProximity } from "../utils/groupDuplicates";
import achievementsData from "../../data/achievements.json";
import playerCountriesData from "../../data/playercountries.json";
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

const getRowCountries = (row) => {
  if (Array.isArray(row?.countries) && row.countries.length) {
    return row.countries;
  }
  return normalizeCountryCodes(row?.country);
};

/** Shows all nationality flags; trims with +N when the row is too narrow. */
const NationalityFlags = ({
  codes,
  size = 18,
  className = "lb__flags",
  flagClassName = "lb__flag-img lb__flag-img--inline",
}) => {
  const normalized = useMemo(() => {
    if (Array.isArray(codes)) {
      return codes.map(normalizeCountryCode).filter(Boolean);
    }
    return normalizeCountryCodes(codes);
  }, [codes]);
  const codesKey = normalized.join(",");
  const containerRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(normalized.length);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || normalized.length === 0) {
      setVisibleCount(0);
      return undefined;
    }

    const GAP = 4;
    const MORE_WIDTH = 22;
    const flagCount = normalized.length;

    const measure = () => {
      const available = el.clientWidth;
      if (available <= 0) {
        setVisibleCount(flagCount);
        return;
      }

      const fullWidth = flagCount * size + Math.max(0, flagCount - 1) * GAP;
      if (fullWidth <= available) {
        setVisibleCount(flagCount);
        return;
      }

      let fit = 0;
      for (let i = 0; i < flagCount; i += 1) {
        const flagsWidth = (i + 1) * size + i * GAP;
        const remaining = flagCount - (i + 1);
        const withMore =
          remaining > 0 ? flagsWidth + GAP + MORE_WIDTH : flagsWidth;
        if (withMore > available) break;
        fit = i + 1;
      }

      setVisibleCount(Math.max(1, Math.min(fit || 1, flagCount)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [codesKey, normalized.length, size]);

  if (!normalized.length) return null;

  const visible = normalized.slice(0, visibleCount);
  const hiddenCount = Math.max(0, normalized.length - visible.length);
  const title = normalized.map((code) => getCountryName(code)).join(", ");

  return (
    <span
      ref={containerRef}
      className={className}
      title={title}
      aria-label={title}
    >
      {visible.map((code) => (
        <CountryFlag key={code} code={code} className={flagClassName} size={size} />
      ))}
      {hiddenCount > 0 ? (
        <span className="lb__flags-more">+{hiddenCount}</span>
      ) : null}
    </span>
  );
};

const getRowKey = (row, mode) => (mode === "countries" ? row.code : row.name);

const UNKNOWN_COUNTRY_VALUE = "unknown";

const applyCountryFilter = (rows, selectedCountries) => {
  if (!selectedCountries?.length) return rows;

  return rows.filter((row) => {
    // TheShadowRealm is outside the nationality filter system.
    if (isShadowRealmRow(row)) return false;

    const playerCountries = Array.isArray(row.countries)
      ? row.countries
      : normalizeCountryCodes(row.country);

    if (selectedCountries.includes(UNKNOWN_COUNTRY_VALUE) && !playerCountries.length) {
      return true;
    }

    return playerCountries.some((code) => selectedCountries.includes(code));
  });
};

const rowMatchesSearch = (row, query, mode) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  // Unsearchable easter-egg row — never matches a query.
  if (isShadowRealmRow(row)) return false;

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

  if (name.includes(normalized) || bestName.includes(normalized)) return true;

  const playerCountries = Array.isArray(row.countries)
    ? row.countries
    : normalizeCountryCodes(row.country);

  return playerCountries.some((code) => {
    const countryName = getCountryName(code).toLowerCase();
    return (
      code.toLowerCase().includes(normalized) ||
      countryName.includes(normalized)
    );
  });
};

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

function buildDefaultBoards() {
  const combinedClassic = annotateVariantProximity(
    achievementsData.map((entry) => ({
      ...entry,
      _src: "classic",
    })),
  );

  const platformerList = annotateVariantProximity(
    platformersData.map((entry) => ({
      ...entry,
      _src: "platformer",
    })),
  );

  const classicPending = annotateVariantProximity(
    pendingData.map((entry) => ({
      ...entry,
      _src: "pending",
    })),
  );

  const platformerPending = annotateVariantProximity(
    platformerpendingData.map((entry) => ({
      ...entry,
      _src: "platformerpending",
    })),
  );

  const classicPositionMap = buildListPositionMap(combinedClassic);
  const platformerPositionMap = buildListPositionMap(platformerList);

  const players = {
    classic: buildPlayerBoard(
      [...combinedClassic, ...classicPending],
      playerCountriesData,
    ),
    platformer: buildPlayerBoard(
      [...platformerList, ...platformerPending],
      playerCountriesData,
    ),
  };

  const countries = {
    classic: buildCountryBoard(players.classic, playerCountriesData),
    platformer: buildCountryBoard(players.platformer, playerCountriesData),
  };

  const allSubmissionEntries = [
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

  const filterSubmissionEntries = (listSource) => {
    const allowed =
      listSource === "platformer"
        ? PLATFORMER_SUBMISSION_SOURCES
        : CLASSIC_SUBMISSION_SOURCES;

    return allSubmissionEntries.filter((entry) => allowed.has(entry._src));
  };

  const submissions = {
    classic: buildSubmissionBoard(
      filterSubmissionEntries("classic"),
      classicPositionMap,
      platformerPositionMap,
      playerCountriesData,
    ),
    platformer: buildSubmissionBoard(
      filterSubmissionEntries("platformer"),
      classicPositionMap,
      platformerPositionMap,
      playerCountriesData,
    ),
  };

  return { players, countries, submissions };
}

let cachedDefaultBoards = null;

/** Boards are built lazily on first use (not at module import) and cached. */
export function getDefaultBoards() {
  if (!cachedDefaultBoards) cachedDefaultBoards = buildDefaultBoards();
  return cachedDefaultBoards;
}

const COUNTRY_FILTER_OPTIONS = [
  ...new Set(
    Object.values(playerCountriesData).flatMap((value) =>
      normalizeCountryCodes(value),
    ),
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

// Fallback used only until the real site header is measured on mount.
const SITE_HEADER_HEIGHT_FALLBACK = 80;

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
  isReplacement = Boolean(entry?.isReplacement),
  isPending = isPendingSubmission(entry),
  onAchievementClick,
}) {
  const clickable = Boolean(onAchievementClick);
  const pointsValue = points ?? entry.points ?? 0;
  let statusClass = "";
  if (pendingRemoval) statusClass = " is-pending-removal";
  else if (isReplacement) statusClass = " is-replacement";
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
                meta={`${entry.player} · ${SOURCE_LABEL[entry._src]} · ${formatDate(entry.date)}`}
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
            <h2 className="lb__detail-name">
              <NationalityFlags
                codes={getRowCountries(player)}
                className="lb__flags lb__flags--detail"
              />
              {player.name}
            </h2>
          </div>
          <span className="lb__detail-points">{player.pts} submissions</span>
        </div>

        <DetailScroll>
          <div className="lb__achs">
            {player.submissions.map((entry, index) => (
              <AchievementRow
                key={`${entry.name}-${index}-${entry._src}`}
                entry={entry}
                meta={`${SOURCE_LABEL[entry._src] ?? "Classic"} · ${formatDate(entry.date)}`}
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
            <NationalityFlags
              codes={getRowCountries(player)}
              className="lb__flags lb__flags--detail"
            />
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
              meta={`${SOURCE_LABEL[entry._src]} · ${formatDate(entry.date)}`}
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

export default function LeaderboardPage({
  initialMode = "players",
  initialListSource = "classic",
  onAchievementClick,
  boards = getDefaultBoards(),
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
  // TheShadowRealm only appears on the last page if you walked there
  // (prev page → last), not if you jumped straight to the last page button.
  const [shadowRealmUnlocked, setShadowRealmUnlocked] = useState(false);
  const headRef = useRef(null);
  const layoutRef = useRef(null);
  const paginationRef = useRef(null);
  const sidebarRef = useRef(null);
  const [headHeight, setHeadHeight] = useState(0);
  const [sidebarBounds, setSidebarBounds] = useState(null);
  const [siteHeaderHeight, setSiteHeaderHeight] = useState(
    SITE_HEADER_HEIGHT_FALLBACK,
  );
  const isMobileLayout = useMediaQuery("(max-width: 640px)");

  useEffect(() => {
    setMode(initialMode);
    setListSource(initialListSource);
    setSelectedKey(null);
    setCountryDetailView("players");
    setPage(1);
    setShadowRealmUnlocked(false);
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
    return playerBoard.some(
      (row) =>
        !isShadowRealmRow(row) &&
        !(Array.isArray(row.countries) ? row.countries : []).length,
    );
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

  // Paginate without TheShadowRealm so jumping to "last" never reveals it.
  // When unlocked, append them only onto the last page's rows.
  const { regularRows, shadowRows } = useMemo(() => {
    const regular = [];
    const shadow = [];
    for (const row of processedLeaderboard) {
      if (mode === "players" && isShadowRealmRow(row)) shadow.push(row);
      else regular.push(row);
    }
    return { regularRows: regular, shadowRows: shadow };
  }, [processedLeaderboard, mode]);

  const pagination = useMemo(() => {
    const base = paginateRows(regularRows, page, PAGE_SIZE);
    const onLastPage = base.page === base.totalPages;
    const showShadow =
      mode === "players" &&
      shadowRealmUnlocked &&
      onLastPage &&
      shadowRows.length > 0;

    return {
      ...base,
      rows: showShadow ? [...base.rows, ...shadowRows] : base.rows,
    };
  }, [regularRows, shadowRows, page, mode, shadowRealmUnlocked]);

  const selectedRow = useMemo(() => {
    if (!selectedKey) return null;
    const fromPage = pagination.rows.find(
      (row) => getRowKey(row, mode) === selectedKey,
    );
    if (fromPage) return fromPage;
    return (
      regularRows.find((row) => getRowKey(row, mode) === selectedKey) ?? null
    );
  }, [pagination.rows, regularRows, selectedKey, mode]);

  useEffect(() => {
    setPage(1);
    setSelectedKey(null);
    setShadowRealmUnlocked(false);
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

  // Track the real site header height so the leaderboard's own sticky head
  // lines up flush beneath it, exactly like the list pages do.
  useEffect(() => {
    const siteHeader = document.querySelector(".hd");

    const measure = () => {
      if (siteHeader) setSiteHeaderHeight(siteHeader.getBoundingClientRect().height);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    if (siteHeader) observer.observe(siteHeader);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const sidebarStickyTop = siteHeaderHeight + headHeight + 16;

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

      const stickTop = siteHeaderHeight + headHeight + 16;
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
  }, [
    selectedRow,
    headHeight,
    siteHeaderHeight,
    pagination.page,
    mode,
    listSource,
    isMobileLayout,
  ]);

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
    const { totalPages } = paginateRows(regularRows, page, PAGE_SIZE);
    const safeNext = Math.min(Math.max(1, nextPage), totalPages);

    // Unlock only when stepping onto the last page from the page before it.
    if (mode === "players" && safeNext === totalPages && totalPages > 1) {
      setShadowRealmUnlocked(page === totalPages - 1);
    } else {
      setShadowRealmUnlocked(false);
    }

    setPage(safeNext);
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
        style={isMobileLayout ? undefined : { top: `${siteHeaderHeight}px` }}
      >
        <h1 className="lb__title">Leaderboard</h1>
        <p className="lb__sub">
          {getLeaderboardCountLabel(mode, regularRows.length)}
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

          <SelectDropdown
            value={sortKey}
            ariaLabel="Sort leaderboard"
            options={sortOptions}
            onChange={setSortKey}
            variant="lb"
          />

          <SelectDropdown
            value={sortDir}
            ariaLabel="Sort direction"
            options={SORT_DIR_OPTIONS}
            onChange={setSortDir}
            variant="lb"
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
                          <NationalityFlags codes={getRowCountries(row)} />
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
        <PaginationControls
          classPrefix="lb"
          ellipsisLabel="..."
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
