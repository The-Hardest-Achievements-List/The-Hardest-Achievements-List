import { useState, useRef, useEffect, Fragment, useMemo } from "react";
import { getDuplicateParentId } from "../utils/groupDuplicates";
import achievementsData from "../../data/achievements.json";
import pendingData from "../../data/pending.json";
import legacyData from "../../data/legacy.json";
import timelineData from "../../data/timeline.json";
import platformerpendingData from "../../data/platformerpending.json";
import platformersData from "../../data/platformers.json";
import platformerTimelineData from "../../data/platformertimeline.json";

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
  legacy: "Classic Removed",
  timeline: "Classic Timeline",
  platformer: "Platformer",
  platformertimeline: "Platformer Timeline",
  platformerpending: "Platformer Pending",
};

const MODE_LABEL = {
  classic: "Classic",
  platformer: "Platformer",
  submissions: "Submissions",
};

const MEDALS = ["gold", "silver", "bronze"];

const POINTS = {
  baseScore: 1000,
  rankExponent: 2.4,
};

const POINT_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function roundTo(value, step) {
  return Math.round(value / step) * step;
}

function fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

function formatPoints(value) {
  return POINT_FORMATTER.format(value ?? 0);
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
        <span
          className="lb__decimal"
          style={{ color: "#777" }}
        >{`.${decPart}`}</span>
      ) : null}
    </>
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calculateXp(position, listSize) {
  const p = Math.max(1, Number(position) || 1);
  const n = Math.max(1, Number(listSize) || 1);
  const positionPercent = n === 1 ? 1 : 1 - (p - 1) / Math.max(1, n - 1);
  const points =
    Math.pow(positionPercent, POINTS.rankExponent) * POINTS.baseScore;
  return Math.round(points * 100) / 100;
}

function sortByRank(entries) {
  return [...entries].sort((a, b) => (a.rank ?? 999999) - (b.rank ?? 999999));
}

function buildBoard(entries) {
  const entriesWithPosition = entries.map((e, index) => ({
    ...e,
    listPosition: index + 1,
    listSize: entries.length,
  }));

  const grouped = new Map();

  for (const e of entriesWithPosition) {
    if (!e.player || e.player === "-") continue;
    if (!grouped.has(e.player)) grouped.set(e.player, []);
    grouped.get(e.player).push(e);
  }

  return [...grouped.entries()]
    .map(([name, ach]) => {
      const sorted = sortByRank(ach);

      const achievements = sorted.map((e) => {
        const isDuplicate = !!getDuplicateParentId(e);
        const points = isDuplicate
          ? 0
          : calculateXp(e.listPosition, e.listSize);

        return { ...e, points };
      });

      const totalXP =
        Math.round(
          achievements.reduce((sum, e) => sum + (e.points ?? 0), 0) * 100,
        ) / 100;

      return {
        name,
        achievements,
        totalXP,
        best: achievements[0] ?? null,
      };
    })
    .sort((a, b) => b.totalXP - a.totalXP);
}

const combinedClassic = achievementsData
  .map((e) => ({ ...e, _src: "classic" }))
  .sort((a, b) => (a.rank ?? 999999) - (b.rank ?? 999999));

const platformerList = platformersData
  .map((e) => ({ ...e, _src: "platformer" }))
  .sort((a, b) => (a.rank ?? 999999) - (b.rank ?? 999999));

function buildSubmissionBoard(entries) {
  const submissions = entries
    .map((e) => ({
      ...e,
      _src: e._src || "classic",
    }))
    .filter((e) => e.submitter && e.submitter !== "-");

  const grouped = new Map();

  for (const e of submissions) {
    if (!grouped.has(e.submitter)) grouped.set(e.submitter, []);
    grouped.get(e.submitter).push(e);
  }

  return [...grouped.entries()]
    .map(([name, items]) => ({
      name,
      submissions: items,
      pts: items.length,
      best: items[0],
    }))
    .sort((a, b) => b.pts - a.pts);
}

const BOARDS = {
  classic: buildBoard(combinedClassic),
  platformer: buildBoard(platformerList),
  submissions: buildSubmissionBoard([
    ...achievementsData.map((e) => ({ ...e, _src: "classic" })),
    ...pendingData.map((e) => ({ ...e, _src: "pending" })),
    ...legacyData.map((e) => ({ ...e, _src: "legacy" })),
    ...timelineData.map((e) => ({ ...e, _src: "timeline" })),
    ...platformersData.map((e) => ({ ...e, _src: "platformer" })),
    ...platformerpendingData.map((e) => ({ ...e, _src: "platformerpending" })),
    ...platformerTimelineData.map((e) => ({
      ...e,
      _src: "platformertimeline",
    })),
  ]),
};

function DetailContent({ player, pos, mode }) {
  if (mode === "submissions") {
    return (
      <>
        <div className="lb__detail-hd">
          <div className="lb__detail-left">
            <span className="lb__detail-pos">#{pos + 1}</span>
            <h2 className="lb__detail-name">{player.name}</h2>
          </div>
          <span className="lb__detail-xp">{player.pts} submissions</span>
        </div>

        <div className="lb__achs">
          {player.submissions.map((e, index) => (
            <div
              key={`${e.name}-${index}-${e._src}`}
              className="lb__ach"
              title={e.notes || undefined}
            >
              <span className="lb__ach-rank">
                {e.rank != null ? `#${e.rank}` : "—"}
              </span>
              <div className="lb__ach-info">
                <span className="lb__ach-name">{e.name}</span>
                <span className="lb__ach-meta">
                  {SOURCE_LABEL[e._src] ?? "Classic"} · {fmt(e.date)}
                </span>
              </div>
              <span className="lb__ach-xp">+1</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="lb__detail-hd">
        <div className="lb__detail-left">
          <span className="lb__detail-pos">#{pos + 1}</span>
          <h2 className="lb__detail-name">{player.name}</h2>
        </div>
        <span className="lb__detail-xp">
          <Points value={player.totalXP} /> XP
        </span>
      </div>

      <div className="lb__achs">
        {player.achievements.map((e) => {
          const isDuplicate = !!getDuplicateParentId(e);
          const xpValue = e.points ?? 0;

          return (
            <div
              key={`${e.name}-${e.rank}-${e._src}`}
              className={`lb__ach${isDuplicate ? " is-duplicate" : ""}`}
              title={e.notes || undefined}
            >
              <span className="lb__ach-rank">#{e.rank}</span>
              <div className="lb__ach-info">
                <span className="lb__ach-name">{e.name}</span>
                <span className="lb__ach-meta">
                  {SOURCE_LABEL[e._src]} · {fmt(e.date)}
                </span>
              </div>
              <span className="lb__ach-xp">
                +<Points value={xpValue} />
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function LeaderboardPage() {
  const [mode, setMode] = useState("classic");
  const [sel, setSel] = useState(null);
  const headRef = useRef(null);
  const [headHeight, setHeadHeight] = useState(0);

  const leaderboard = useMemo(() => BOARDS[mode], [mode]);
  const player = sel != null ? leaderboard[sel] : null;

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
  }, []);

  const sidebarStyle = player
    ? {
        top: headHeight,
        maxHeight: `calc(100vh - ${headHeight}px - 32px)`,
      }
    : undefined;

  function switchMode(nextMode) {
    setMode(nextMode);
    setSel(null);
  }

  return (
    <div className="lb">
      <div ref={headRef} className="lb__head lb__head--sticky">
        <h1 className="lb__title">Leaderboard</h1>

        <div className="lb__mode-toggle">
          <button
            className={`lb__mode-btn${mode === "classic" ? " is-active" : ""}`}
            onClick={() => switchMode("classic")}
          >
            Classic
          </button>
          <button
            className={`lb__mode-btn${mode === "platformer" ? " is-active" : ""}`}
            onClick={() => switchMode("platformer")}
          >
            Platformer
          </button>
          <button
            className={`lb__mode-btn${mode === "submissions" ? " is-active" : ""}`}
            onClick={() => switchMode("submissions")}
          >
            Submissions
          </button>
        </div>

        <p className="lb__sub">
          {leaderboard.length} {MODE_LABEL[mode].toLowerCase()} · ranked by{" "}
          {mode === "submissions" ? "submission count" : "total points"}
        </p>
      </div>

      <div className={`lb__layout${player ? " has-detail" : ""}`}>
        <div className="lb__list">
          {leaderboard.map((p, i) => (
            <Fragment key={p.name}>
              <div
                className={`lb__row${sel === i ? " is-sel" : ""}`}
                onClick={() => setSel(sel === i ? null : i)}
              >
                <span
                  className={`lb__pos${i < 3 ? " lb__pos--" + MEDALS[i] : ""}`}
                >
                  {i + 1}
                </span>

                <div className="lb__pinfo">
                  <span className="lb__pname">{p.name}</span>
                  <span className="lb__pbest">{p.best?.name ?? "—"}</span>
                </div>

                <span className="lb__xp-total">
                  {mode === "submissions" ? (
                    <>
                      {p.pts} <span>submissions</span>
                    </>
                  ) : (
                    <>
                      <Points value={p.totalXP} /> <span>XP</span>
                    </>
                  )}
                </span>
              </div>

              {sel === i && (
                <div className="lb__detail lb__detail--inline">
                  <DetailContent player={p} pos={i} mode={mode} />
                </div>
              )}
            </Fragment>
          ))}
        </div>

        {player && (
          <div className="lb__detail lb__detail--sidebar" style={sidebarStyle}>
            <DetailContent player={player} pos={sel} mode={mode} />
          </div>
        )}
      </div>
    </div>
  );
}