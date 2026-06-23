const EDITORS = [
  "Anceps — Owner",
  "stax — Elder List Moderator",
  "Arcadie — Elder List Moderator",
  "TYATYAPKA — List Moderator",
  "rain — List Moderator",
  "exiled_shade — List Helper",
  "jak — List Helper",
  "Qwidzit — List Helper",
  "Excryst — Trial Moderator",
  "aytch008 — Trial Moderator",
  "NucDev — Integrity Moderator",
  "Mentrillum — Integrity Moderator",
];

const ROLE_COLORS = {
  Owner: "#ff3900",
  "Elder List Moderator": "#2943ee",
  "List Moderator": "#2599ff",
  "List Helper": "#4fddff",
  "Trial Moderator": "#36e9b8",
  "Integrity Moderator": "#ffc963",
};

const FILE_LABELS = {
  achievements: "Classic Main",
  pending: "Classic Pending",
  legacy: "Classic Removed",
  timeline: "Classic Timeline",
  platformers: "Platformer Main",
  platformertimeline: "Platformer Timeline",
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

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

function ChangeEntry({ entry }) {
  const {
    type,
    levelName,
    player,
    fileKey,
    rank,
    fromRank,
    toRank,
    timestamp,
  } = entry;
  const list = FILE_LABELS[fileKey] || fileKey;
  let text = "";
  if (type === "added")
    text = `${levelName} by ${player} added at #${rank} on ${list}`;
  if (type === "removed")
    text = `${levelName} by ${player} removed from #${rank} on ${list}`;
  if (type === "moved") {
    const dir = toRank < fromRank ? "up" : "down";
    text = `${levelName} by ${player} moved ${dir} — #${fromRank} → #${toRank} on ${list}`;
  }
  return (
    <div className={`home-change home-change--${type}`}>
      <span className="home-change__badge">{type}</span>
      <span className="home-change__text">{text}</span>
      <span className="home-change__date">{formatDate(timestamp)}</span>
    </div>
  );
}

function StatCard({ label, value, unit = "" }) {
  return (
    <div className="home__stat-card">
      <div className="home__stat-value">{value}</div>
      <div className="home__stat-label">{label}</div>
      {unit && <div className="home__stat-unit">{unit}</div>}
    </div>
  );
}

function EditorCard({ editor }) {
  const [name, role] = editor.split(" — ");
  const color = ROLE_COLORS[role] || "#999999";
  return (
    <div className="home__editor-card" style={{ "--editor-color": color }}>
      <div className="home__editor-name">{name}</div>
      <div className="home__editor-role">{role}</div>
    </div>
  );
}

export default function HomePage({
  totalCount,
  achievementsData = [],
  pendingData = [],
  legacyData = [],
  timelineData = [],
  platformersData = [],
  platformerTimelineData = [],
}) {
  const allData = [
    ...achievementsData,
    ...timelineData,
    ...platformersData,
    ...platformerTimelineData,
  ];
  const players = allData.map((i) => i.player).filter(Boolean);
  const uniquePlayers = new Set(players);
  const playerCounts = {};
  players.forEach((p) => {
    playerCounts[p] = (playerCounts[p] || 0) + 1;
  });
  const topPlayerEntry = Object.entries(playerCounts).sort(
    (a, b) => b[1] - a[1],
  )[0];

  const topPlayerShare = topPlayerEntry
    ? Math.round((topPlayerEntry[1] / players.length) * 100)
    : 0;
  const lengths = allData
    .map((i) => i.length)
    .filter((n) => typeof n === "number" && n > 0);

  const avgLength = lengths.length
    ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
    : 0;

  const minLength = lengths.length ? Math.min(...lengths) : 0;
  const maxLength = lengths.length ? Math.max(...lengths) : 0;
  const rangeLength = maxLength - minLength;
  const tagCounts = {};
  allData.forEach((item) => {
    const tags = Array.isArray(item.tags)
      ? item.tags
      : typeof item.tags === "string" && item.tags
        ? [item.tags]
        : [];
    tags.forEach((tag) => {
      if (!tag) return;
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const uniqueTags = Object.keys(tagCounts).length;

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const versionCounts = {};
  allData.forEach((item) => {
    if (item.version) {
      versionCounts[item.version] = (versionCounts[item.version] || 0) + 1;
    }
  });
  const versionEntries = Object.entries(versionCounts);
  const topVersion = versionEntries.sort((a, b) => b[1] - a[1])[0];
  const versionDiversity = versionEntries.length;
  const categoryCounts = {
    achievements: achievementsData.length,
    pending: pendingData.length,
    timeline: timelineData.length,
    platformers: platformersData.length,
    platformerTimeline: platformerTimelineData.length,
  };

  const categoryTotal = Object.values(categoryCounts).reduce(
    (a, b) => a + b,
    0,
  );

  const categoryPercent = (n) =>
    categoryTotal ? Math.round((n / categoryTotal) * 100) : 0;

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
          <a href="/classic" className="home__hero-btn">
            <i className="fas fa-bars home__hero-icon" aria-hidden="true"></i>
            <span className="home__hero-label">Main List</span>
          </a>
          <a href="/classic/pending" className="home__hero-btn">
            <i className="fas fa-clock home__hero-icon" aria-hidden="true"></i>
            <span className="home__hero-label">Pending</span>
          </a>
          <a href="/classic/timeline" className="home__hero-btn">
            <i
              className="fas fa-clock-rotate-left home__hero-icon"
              aria-hidden="true"
            ></i>
            <span className="home__hero-label">Timeline</span>
          </a>
          <a href="/leaderboard" className="home__hero-btn">
            <i
              className="fas fa-ranking-star home__hero-icon"
              aria-hidden="true"
            ></i>
            <span className="home__hero-label">Leaderboard</span>
          </a>
        </div>
      </section>

      <div className="home__cols">
        <section className="home__panel">
          <h2 className="home__panel-title">Staff</h2>
          <div className="home__editors">
            {EDITORS.map((e) => (
              <EditorCard key={e} editor={e} />
            ))}
          </div>
        </section>

        <section className="home__panel home__panel--wide">
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
      </div>
    </div>
  );
}
