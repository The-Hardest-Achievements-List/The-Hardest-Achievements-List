import LevelCard from "./LevelCard";
import GroupedLevelCard from "./GroupedLevelCard";
import { groupAchievementsByDuplicates } from "../utils/groupDuplicates";
import { TAG_ICONS, TAG_DEFINITIONS } from "./Header";
import Tooltip from "./Tooltip";

export default function LevelList({
  data,
  totalCount,
  activeTags,
  toggleTag,
  isTimeline,
  hideRank,
  onCardClick,
}) {
  const { mainAchievements } = groupAchievementsByDuplicates(data);
  const includeTags = [];
  const excludeTags = [];
  activeTags.forEach((state, tag) => {
    if (state === "include") includeTags.push(tag);
    else if (state === "exclude") excludeTags.push(tag);
  });

  return (
    <>
      <div className="resultmeta">
        <span className="resultmeta__count">
          <strong>{mainAchievements.length}</strong> of{" "}
          <strong>{totalCount}</strong>
        </span>
        <span className="resultmeta__summary">
          {includeTags.length > 0 && (
            <>
              <span
                style={{
                  marginRight: "8px",
                  color: "var(--ink-3)",
                  fontSize: "10px",
                }}
              >
                Include:
              </span>
              {includeTags.map((t) => (
                <span
                  key={t}
                  className="resultmeta__tag resultmeta__tag--include"
                >
                  <Tooltip
                    text={
                      (TAG_DEFINITIONS[t] && TAG_DEFINITIONS[t].tooltip) || t
                    }
                  >
                    {TAG_ICONS[t] && (
                      <i
                        className={`fas ${TAG_ICONS[t]}`}
                        style={{ marginRight: "0.35rem" }}
                      />
                    )}
                    {(TAG_DEFINITIONS[t] && TAG_DEFINITIONS[t].text) || t}
                  </Tooltip>
                  <button onClick={() => toggleTag(t)}>✕</button>
                </span>
              ))}
            </>
          )}
          {excludeTags.length > 0 && (
            <>
              <span
                style={{
                  marginRight: "8px",
                  marginLeft: "12px",
                  color: "var(--ink-3)",
                  fontSize: "10px",
                }}
              >
                Exclude:
              </span>
              {excludeTags.map((t) => (
                <span
                  key={t}
                  className="resultmeta__tag resultmeta__tag--exclude"
                >
                  <Tooltip
                    text={
                      (TAG_DEFINITIONS[t] && TAG_DEFINITIONS[t].tooltip) || t
                    }
                  >
                    {TAG_ICONS[t] && (
                      <i
                        className={`fas ${TAG_ICONS[t]}`}
                        style={{ marginRight: "0.35rem" }}
                      />
                    )}
                    {(TAG_DEFINITIONS[t] && TAG_DEFINITIONS[t].text) || t}
                  </Tooltip>
                  <button onClick={() => toggleTag(t)}>✕</button>
                </span>
              ))}
            </>
          )}
        </span>
      </div>

      <main className="list">
        {data.length === 0 ? (
          <div className="list__empty">No entries found.</div>
        ) : (
          mainAchievements.map((a, i) =>
            a.hasDuplicates ? (
              <GroupedLevelCard
                key={a.id ?? i}
                achievement={a}
                duplicates={a.duplicates}
                index={i}
                isTimeline={isTimeline}
                hideRank={hideRank}
                onClick={onCardClick}
              />
            ) : (
              <LevelCard
                key={a.id ?? i}
                achievement={a}
                index={i}
                isTimeline={isTimeline}
                hideRank={hideRank}
                onClick={onCardClick}
              />
            ),
          )
        )}
      </main>
    </>
  );
}
