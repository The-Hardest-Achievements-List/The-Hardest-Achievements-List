import { useEffect, useRef, useState } from "react";
import { paginateRows } from "../utils/leaderboard";
import PaginationControls from "../components/PaginationControls";
import { formatDate } from "../utils/format";

const STAFF_ROLE_COLORS = {
  "Owner": "#ff3900",
  "Elder Moderator": "#2943ee",
  "List Moderator": "#2599ff",
  "Developer": "9580ff",
  "List Helper": "#4fddff",
  "Server Moderator": "#36e9b8",
  "Trial Staff": "#57f369",
  "Integrity Moderator": "#ffc963",
};

const STAFF_ROLE_CLASS = {
  "Owner": "home__editor-card--owner",
  "Elder Moderator": "home__editor-card--elder-moderator",
  "List Moderator": "home__editor-card--list-moderator",
  "Developer": "home__editor-card--developer",
  "List Helper": "home__editor-card--list-helper",
  "Server Moderator": "home__editor-card--server-moderator",
  "Trial Staff": "home__editor-card--trial-staff",
  "Integrity Moderator": "home__editor-card--integrity-moderator",
};

const STAFF_ROLE_PRIORITY = [
  "Owner",
  "Elder Moderator",
  "List Moderator",
  "Developer",
  "List Helper",
  "Server Moderator",
  "Trial Staff",
  "Integrity Moderator",
];

const getPrimaryRole = (roles) => {
  for (const role of STAFF_ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return "Trial Staff";
};

const getStaffColorFromRoles = (roles) =>
  STAFF_ROLE_COLORS[getPrimaryRole(roles)];

const EDITORS = [
  {
    name: "Anceps",
    roles: ["Owner"],
    url: {
      youtube: "https://www.youtube.com/@ancepsbutworse",
      discord: null,
    },
  },
  {
    name: "Arcadie",
    roles: ["Elder Moderator"],
    url: {
      youtube: "https://www.youtube.com/@GW-Arcadie",
      discord: null,
    },
  },
  {
    name: "QwidziT",
    roles: ["Developer"],
    url: {
      youtube: "https://www.youtube.com/@qwidzitgd",
      discord: null,
    },
  },
  {
    name: "TYATYAPKA",
    roles: ["List Moderator"],
    url: {
      youtube: "https://www.youtube.com/@TYATYAPKA",
      discord: null,
    },
  },
  {
    name: "SupremeSDB",
    roles: ["List Moderator"],
    url: {
      youtube: "https://www.youtube.com/@SupremeSDB",
      discord: null,
    },
  },
  {
    name: "Excryst",
    roles: ["List Moderator", "Developer"],
    url: {
      youtube: "https://www.youtube.com/@excryst",
      discord: "https://discord.com/users/997320515867922473",
    },
  },
  {
    name: "Exiled_Shade",
    roles: ["List Helper"],
    url: {
      youtube: "https://www.youtube.com/@exiled_shadegd",
      discord: null,
    },
  },
  {
    name: "raine",
    roles: ["Server Moderator"],
    url: {
      youtube: "https://www.youtube.com/@rtwnr",
      discord: null,
    },
  },
  {
    name: "aytch0008",
    roles: ["Server Moderator"],
    url: {
      youtube: "https://www.youtube.com/@aytch0008",
      discord: null,
    },
  },
  {
    name: "Statera",
    roles: ["Trial Staff"],
    url: {
      youtube: "https://www.youtube.com/@stateragd",
      discord: null,
    },
  },
  {
    name: "NucDev",
    roles: ["Integrity Moderator"],
    url: {
      youtube: "https://www.youtube.com/@NucDev",
      discord: null,
    },
  },
  {
    name: "Mentrillum",
    roles: ["Integrity Moderator"],
    url: {
      youtube: "https://www.youtube.com/@RealDeathCorridor",
      discord: null,
    },
  },
].map((editor) => ({
  ...editor,
  primaryRole: getPrimaryRole(editor.roles),
  color: getStaffColorFromRoles(editor.roles),
  roleClass: STAFF_ROLE_CLASS[getPrimaryRole(editor.roles)],
}));

const HISTORY_TABS = [
  { id: "classic", label: "Classic" },
  { id: "platformer", label: "Platformer" },
  { id: "timeline", label: "Timeline" },
];

const PAGE_SIZE = 10;

function formatDateLabel(iso) {
  if (!iso) return "Pre-dating";

  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";

  return formatDate(iso);
}

function inferChange(entry) {
  if (entry.list === "classic" || entry.list === "platformer") {
    return {
      kind: "milestone",
      action: entry.from == null ? "created" : "baseline",
    };
  }

  if (entry.timelineAdded != null) return { kind: "added", action: "timeline_added" };
  if (entry.timelineRemoved != null) return { kind: "removed", action: "timeline_removed" };

  // Variant link changes share +/- icons with normal add/remove, but use purple styling.
  if (entry.variantAdded != null) {
    return { kind: "variant-added", action: "variant_added" };
  }
  if (entry.variantRemoved != null) {
    return { kind: "variant-removed", action: "variant_removed" };
  }

  const { currentRank, newRank, currentName, newName } = entry;
  const renamed = Boolean(currentName && newName && currentName !== newName);

  // Renames win over add/remove even if ranks are partial/null. Optional ranks
  // still drive up/down when both are present and differ.
  if (renamed) {
    if (currentRank != null && newRank != null) {
      if (newRank < currentRank) return { kind: "up", action: "updated" };
      if (newRank > currentRank) return { kind: "down", action: "updated" };
    }
    return { kind: "updated", action: "updated" };
  }

  if (currentRank == null && newRank != null) return { kind: "added", action: "added" };
  if (currentRank != null && newRank == null) return { kind: "removed", action: "removed" };

  if (currentRank != null && newRank != null) {
    if (newRank < currentRank) return { kind: "up", action: "moved" };
    if (newRank > currentRank) return { kind: "down", action: "moved" };
  }

  return { kind: "updated", action: "updated" };
}

function getChangeKind(entry) {
  return inferChange(entry).kind;
}

function ChangeIcon({ kind }) {
  const icon =
    kind === "added" || kind === "variant-added"
      ? "fa-plus"
      : kind === "up"
        ? "fa-caret-up"
        : kind === "down"
          ? "fa-caret-down"
          : kind === "removed" || kind === "variant-removed"
            ? "fa-minus"
            : kind === "milestone"
              ? "fa-flag"
              : "fa-pen";

  return (
    <span className={`home-change__icon home-change__icon--${kind}`} aria-hidden="true">
      <i className={`fas ${icon}`}></i>
    </span>
  );
}

function buildChangeHeadline(entry, kind) {
  const {
    name,
    currentName,
    newName,
    currentRank,
    newRank,
    timelineAdded,
    timelineRemoved,
    from,
    to,
    variantAdded,
    variantRemoved,
  } = entry;
  const { action } = inferChange(entry);
  const displayName = newName || currentName || name;

  if (action === "created") {
    const listLabel = entry.list === "platformer" ? "Platformer list" : "List";
    return (
      <>
        {listLabel} created with <strong>{to}</strong> as the achievement baseline
      </>
    );
  }

  if (action === "baseline") {
    const listPrefix =
      entry.list === "platformer" ? "Platformer achievement baseline" : "Achievement baseline";
    if (from && to) {
      return (
        <>
          {listPrefix} raised from {from} to <strong>{to}</strong>
        </>
      );
    }
    return (
      <>
        {listPrefix} raised to <strong>{to}</strong>
      </>
    );
  }

  const moveDir =
    kind === "up" ? "up" : kind === "down" ? "down" : null;
  const ranksDiffer =
    currentRank != null && newRank != null && currentRank !== newRank;
  const movePhrase =
    ranksDiffer && moveDir
      ? <> and moved {moveDir} from #{currentRank} to #{newRank}</>
      : ranksDiffer
        ? <> and moved from #{currentRank} to #{newRank}</>
        : null;

  if (action === "updated") {
    const renamed = currentName && newName && currentName !== newName;
    if (renamed) {
      return (
        <>
          {currentName} updated to <strong>{newName}</strong>
          {movePhrase}
        </>
      );
    }
    if (movePhrase) {
      return (
        <>
          <strong>{displayName}</strong>
          {movePhrase}
        </>
      );
    }
    return (
      <>
        <strong>{displayName}</strong> updated
      </>
    );
  }

  if (action === "moved") {
    return (
      <>
        <strong>{displayName}</strong> moved {moveDir || ""} from #{currentRank}{" "}
        to #{newRank}
      </>
    );
  }

  if (action === "added") {
    return (
      <>
        <strong>{newName}</strong> added at #{newRank}
      </>
    );
  }

  if (action === "variant_added") {
    return (
      <>
        <strong>{newName || displayName}</strong> added as a variant of {variantAdded}
        {movePhrase}
      </>
    );
  }

  if (action === "variant_removed") {
    return (
      <>
        <strong>{currentName || displayName}</strong> removed as a variant of {variantRemoved}
        {movePhrase}
      </>
    );
  }

  if (action === "removed") {
    return (
      <>
        <strong>{currentName}</strong> removed from #{currentRank}
      </>
    );
  }

  if (action === "timeline_added") {
    return (
      <>
        <strong>{displayName}</strong> added to Timeline ({formatDate(timelineAdded)})
      </>
    );
  }

  if (action === "timeline_removed") {
    return (
      <>
        <strong>{displayName}</strong> removed from Timeline ({formatDate(timelineRemoved)})
      </>
    );
  }

  return <strong>{displayName}</strong>;
}

function ChangeEntry({ entry }) {
  const { above, below } = entry;
  const kind = getChangeKind(entry);
  const neighborPrefix =
    kind === "removed" || kind === "variant-removed" ? "Formerly" : "Now";
  const hasNeighbors = kind !== "milestone" && Boolean(below || above);

  return (
    <div className={`home-change home-change--${kind}`}>
      <ChangeIcon kind={kind} />
      <div className="home-change__content">
        <div className="home-change__headline">
          {buildChangeHeadline(entry, kind)}
        </div>

        {hasNeighbors ? (
          <div className="home-change__details">
            {below ? (
              <div>
                {neighborPrefix} below {below}
              </div>
            ) : null}
            {above ? (
              <div>
                {neighborPrefix} above {above}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function groupByDate(entries) {
  // Group by date key (not adjacency) so a date header appears exactly once
  // per page even if the paginated slice has non-contiguous same-date rows.
  const groups = [];
  const groupsByKey = new Map();

  for (const entry of entries) {
    const key = entry.date || "undated";
    let group = groupsByKey.get(key);
    if (!group) {
      group = { key, label: formatDateLabel(entry.date), entries: [] };
      groupsByKey.set(key, group);
      groups.push(group);
    }
    group.entries.push(entry);
  }

  return groups;
}

function ChangelogPanel({
  classicChangelog,
  platformerChangelog,
  timelineChangelog,
}) {
  const [tab, setTab] = useState("classic");
  const [page, setPage] = useState(1);

  const events =
    tab === "platformer"
      ? platformerChangelog
      : tab === "timeline"
        ? timelineChangelog
        : classicChangelog;

  const pagination = paginateRows(events, page, PAGE_SIZE);
  const groups = groupByDate(pagination.rows);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    if (page !== pagination.page) setPage(pagination.page);
  }, [page, pagination.page]);

  return (
    <section className="home__panel home__panel--changelog">
      <div className="home__changelog-head">
        <h2 className="home__panel-title home__changelog-title">
          <i className="fas fa-clock-rotate-left" aria-hidden="true"></i>
          Changelog
        </h2>
        <div className="home__changelog-tabs" role="tablist" aria-label="Changelog list">
          {HISTORY_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`home__changelog-tab${tab === item.id ? " is-active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {pagination.totalCount === 0 ? (
        <p className="home__empty">
          {tab === "platformer"
            ? "No platformer history events yet."
            : tab === "timeline"
              ? "No timeline history events yet."
              : "No history events yet."}
        </p>
      ) : (
        <>
          <div className="home__changelog-feed lb__scrollbar">
            {groups.map((group) => (
              <div key={group.key} className="home__changelog-group">
                <div className="home__changelog-date">{group.label}</div>
                <div className="home__changes">
                  {group.entries.map((entry, index) => (
                    <ChangeEntry
                      key={`${group.key}-${index}-${entry.list || ""}-${entry.to || entry.newName || entry.currentName || entry.name || ""}`}
                      entry={entry}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <PaginationControls
            classPrefix="home"
            ellipsisLabel="…"
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}

function normalizeExternalUrl(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const EDITOR_LINK_KEYS = [
  { key: "youtube", icon: "fab fa-youtube", label: "YouTube" },
  { key: "discord", icon: "fab fa-discord", label: "Discord" },
];

function getEditorLinks(urls) {
  if (!urls || typeof urls !== "object") return [];

  return EDITOR_LINK_KEYS.flatMap(({ key, icon, label }) => {
    const href = normalizeExternalUrl(urls[key]);
    return href ? [{ key, platform: key, href, icon, label }] : [];
  });
}

function EditorCard({ editor }) {
  const { name, roles, url, roleClass } = editor;
  const links = getEditorLinks(url);

  return (
    <div className={`home__editor-card ${roleClass}`}>
      <div className="home__editor-top">
        <div className="home__editor-name">{name}</div>
        {links.length > 0 ? (
          <div className="home__editor-links">
            {links.map((link) => (
              <a
                key={link.key}
                href={link.href}
                className={`home__editor-link home__editor-link--${link.platform}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name} on ${link.label}`}
              >
                <i className={link.icon} aria-hidden="true"></i>
              </a>
            ))}
          </div>
        ) : null}
      </div>
      <div className="home__editor-role">{roles.join(" / ")}</div>
    </div>
  );
}

export default function HomePage({
  classicChangelog = [],
  platformerChangelog = [],
  timelineChangelog = [],
  onNavigate,
}) {
  const staffRef = useRef(null);
  const [sideMaxHeight, setSideMaxHeight] = useState(null);

  const handleSpaNav = (event, mode, active) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    if (typeof onNavigate !== "function") return;
    event.preventDefault();
    onNavigate(mode, active);
  };

  useEffect(() => {
    const staffEl = staffRef.current;
    if (!staffEl) return undefined;

    const syncHeight = () => {
      if (window.matchMedia("(max-width: 640px)").matches) {
        setSideMaxHeight(null);
        return;
      }
      setSideMaxHeight(staffEl.offsetHeight);
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(staffEl);
    window.addEventListener("resize", syncHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, []);

  return (
    <div className="home">
      <section className="home__hero">
        <img
          src="/THAL.png"
          alt="Hardest Achievements logo"
          className="home__hero-logo"
        />
        <h1 className="home__title">The Hardest Achievements List</h1>
        <p className="home__desc">
          A community-maintained ranking of the most difficult achievements in
          Geometry Dash.
        </p>
        <div className="home__hero-actions">
          <a
            href="/classic"
            className="home__hero-btn"
            onClick={(e) => handleSpaNav(e, "classic", "MAIN")}
          >
            <i className="fas fa-bars home__hero-icon" aria-hidden="true"></i>
            <span className="home__hero-label">Main List</span>
          </a>
          <a
            href="/classic/timeline"
            className="home__hero-btn"
            onClick={(e) => handleSpaNav(e, "classic", "TIMELINE")}
          >
            <i
              className="fas fa-clock-rotate-left home__hero-icon"
              aria-hidden="true"
            ></i>
            <span className="home__hero-label">Timeline</span>
          </a>
          <a
            href="/classic/pending"
            className="home__hero-btn"
            onClick={(e) => handleSpaNav(e, "classic", "PENDING")}
          >
            <i className="fas fa-clock home__hero-icon" aria-hidden="true"></i>
            <span className="home__hero-label">Pending</span>
          </a>
          <a
            href="/classic/legacy"
            className="home__hero-btn"
            onClick={(e) => handleSpaNav(e, "classic", "LEGACY")}
          >
            <i
              className="fas fa-box-archive home__hero-icon"
              aria-hidden="true"
            ></i>
            <span className="home__hero-label">Legacy</span>
          </a>
          <a
            href="/leaderboard"
            className="home__hero-btn"
            onClick={(e) => handleSpaNav(e, "classic", "LEADERBOARD")}
          >
            <i
              className="fas fa-ranking-star home__hero-icon"
              aria-hidden="true"
            ></i>
            <span className="home__hero-label">Leaderboard</span>
          </a>
        </div>
      </section>

      <div className="home__cols">
        <section className="home__panel home__panel--staff" ref={staffRef}>
          <h2 className="home__panel-title">Staff</h2>
          <div className="home__editors">
            {EDITORS.map((editor) => (
              <EditorCard key={editor.name} editor={editor} />
            ))}
          </div>
        </section>

        <div
          className="home__side"
          style={
            sideMaxHeight != null ? { maxHeight: sideMaxHeight } : undefined
          }
        >
          <section className="home__panel home__panel--community">
            <h2 className="home__panel-title">Our Community</h2>
            <div className="home__discord-invite">
              <p>
                Join our Discord server to connect with our community and share
                your achievements.
              </p>
              <a
                href="https://discord.gg/zp4mfdsguA"
                target="_blank"
                rel="noopener noreferrer"
                className="home__hero-btn"
              >
                <i
                  className="fab fa-discord home__hero-icon"
                  aria-hidden="true"
                ></i>
                <span className="home__hero-label">Join Discord</span>
              </a>
            </div>
          </section>

          <ChangelogPanel
            classicChangelog={classicChangelog}
            platformerChangelog={platformerChangelog}
            timelineChangelog={timelineChangelog}
          />
        </div>
      </div>
    </div>
  );
}
