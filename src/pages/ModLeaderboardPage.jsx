import { useState, Fragment } from "react";
import achievementsData from "../../data/achievements.json";
import pendingData from "../../data/pending.json";
import legacyData from "../../data/legacy.json";
import timelineData from "../../data/timeline.json";
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

function fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

const LIST_LABEL = {
  achievements: "Classic Main",
  pending: "Classic Pending",
  legacy: "Classic Removed",
  timeline: "Classic Timeline",
  platformers: "Platformer Main",
  platformertimeline: "Platformer Timeline",
};

function buildModBoard() {
  const all = [
    ...achievementsData.map((e) => ({ ...e, _list: "achievements" })),
    ...pendingData.map((e) => ({ ...e, _list: "pending" })),
    ...legacyData.map((e) => ({ ...e, _list: "legacy" })),
    ...timelineData.map((e) => ({ ...e, _list: "timeline" })),
    ...platformersData.map((e) => ({ ...e, _list: "platformers" })),
    ...platformerTimelineData.map((e) => ({
      ...e,
      _list: "platformertimeline",
    })),
  ].filter((e) => e.submitter);

  const map = new Map();
  for (const e of all) {
    if (!map.has(e.submitter)) map.set(e.submitter, []);
    map.get(e.submitter).push(e);
  }
  return [...map.entries()]
    .map(([name, submissions]) => ({
      name,
      submissions,
      pts: submissions.length,
    }))
    .sort((a, b) => b.pts - a.pts);
}

const MOD_BOARD = buildModBoard();
const MEDALS = ["gold", "silver", "bronze"];

function ModDetailContent({ mod, pos }) {
  return (
    <>
      <div className="lb__detail-hd">
        <div className="lb__detail-left">
          <span className="lb__detail-pos">#{pos + 1}</span>
          <h2 className="lb__detail-name">{mod.name}</h2>
        </div>
        <span className="lb__detail-xp">{mod.pts} pts</span>
      </div>
      <div className="lb__achs">
        {mod.submissions.map((e, j) => (
          <div key={j} className="lb__ach" title={e.notes || undefined}>
            <span className="lb__ach-rank">
              {e.rank != null ? "#" + e.rank : "—"}
            </span>
            <div className="lb__ach-info">
              <span className="lb__ach-name">{e.name}</span>
              <span className="lb__ach-meta">
                {LIST_LABEL[e._list]} · {fmt(e.date)}
              </span>
            </div>
            <span className="lb__ach-xp">+1</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function ModLeaderboardPage() {
  const [sel, setSel] = useState(null);
  const mod = sel != null ? MOD_BOARD[sel] : null;

  return (
    <div className="lb">
      <div className="lb__head">
        <h1 className="lb__title">Mod Leaderboard</h1>
        <p className="lb__sub">
          {MOD_BOARD.length} moderators · ranked by submissions
        </p>
      </div>

      <div className={`lb__layout${mod ? " has-detail" : ""}`}>
        <div className="lb__list">
          {MOD_BOARD.map((m, i) => (
            <Fragment key={m.name}>
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
                  <span className="lb__pname">{m.name}</span>
                </div>
                <span className="lb__xp-total">
                  {m.pts} <span>pts</span>
                </span>
              </div>
              {sel === i && (
                <div className="lb__detail lb__detail--inline">
                  <ModDetailContent mod={m} pos={i} />
                </div>
              )}
            </Fragment>
          ))}
        </div>

        {mod && (
          <div className="lb__detail lb__detail--sidebar">
            <ModDetailContent mod={mod} pos={sel} />
          </div>
        )}
      </div>
    </div>
  );
}
