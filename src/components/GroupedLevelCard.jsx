import React, { useState, useCallback, useId } from "react";
import LevelCard from "./LevelCard";
import "./GroupedLevelCard.css";

function GroupedLevelCard({
  achievement: mainAchievement,
  duplicates,
  index,
  isTimeline,
  getTimelineDateLabel,
  hideRank,
  isPendingEstimate,
  pendingMainCount = 0,
  showProjectedRanks,
  onClick,
  layoutMode,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const duplicatesRegionId = useId();

  const handleToggleExpanded = useCallback((e) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div className="grouped-achievement">
      <div className="grouped-achievement__main">
        <LevelCard
          achievement={mainAchievement}
          index={index}
          isTimeline={isTimeline}
          timelineDateLabel={getTimelineDateLabel(mainAchievement)}
          hideRank={hideRank}
          isPendingEstimate={isPendingEstimate}
          pendingMainCount={pendingMainCount}
          showProjectedRanks={showProjectedRanks}
          onClick={onClick}
          layoutMode={layoutMode}
        />
        {duplicates && duplicates.length > 0 && (
          <button
            type="button"
            className="grouped-achievement__toggle"
            onClick={handleToggleExpanded}
            title={
              isExpanded
                ? "Hide duplicates"
                : `Show ${duplicates.length} duplicate(s)`
            }
            aria-expanded={isExpanded}
            aria-controls={duplicatesRegionId}
            aria-label={
              isExpanded
                ? `Hide ${duplicates.length} variant${duplicates.length !== 1 ? "s" : ""}`
                : `Show ${duplicates.length} variant${duplicates.length !== 1 ? "s" : ""}`
            }
          >
            <span className="grouped-achievement__toggle-icon">
              {isExpanded ? "▼" : "▶"}
            </span>
            <span className="grouped-achievement__toggle-text">
              {duplicates.length} variant{duplicates.length !== 1 ? "s" : ""}
            </span>
          </button>
        )}
      </div>

      {isExpanded && duplicates && duplicates.length > 0 && (
        <div
          id={duplicatesRegionId}
          className="grouped-achievement__duplicates"
        >
          {duplicates.map((duplicate, i) => (
            <div
              key={duplicate.levelID != null ? `${duplicate.levelID}-${i}` : `${duplicate.name}-${i}`}
              className="grouped-achievement__duplicate-item"
            >
              <LevelCard
                achievement={duplicate}
                index={-1}
                isTimeline={isTimeline}
                timelineDateLabel={getTimelineDateLabel(duplicate)}
                hideRank={hideRank}
                isPendingEstimate={isPendingEstimate}
                pendingMainCount={pendingMainCount}
                onClick={onClick}
                layoutMode={layoutMode}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(GroupedLevelCard);
