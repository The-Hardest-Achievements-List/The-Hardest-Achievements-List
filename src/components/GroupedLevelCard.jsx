import React, { useState, useCallback } from "react";
import LevelCard from "./LevelCard";
import "./GroupedLevelCard.css";

function GroupedLevelCard({
  achievement: mainAchievement,
  duplicates,
  index,
  isTimeline,
  hideRank,
  onClick,
  layoutMode,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

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
          hideRank={hideRank}
          onClick={onClick}
          layoutMode={layoutMode}
        />
        {duplicates && duplicates.length > 0 && (
          <button
            className="grouped-achievement__toggle"
            onClick={handleToggleExpanded}
            title={
              isExpanded
                ? "Hide duplicates"
                : `Show ${duplicates.length} duplicate(s)`
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
        <div className="grouped-achievement__duplicates">
          {duplicates.map((duplicate, i) => (
            <div
              key={duplicate.id != null ? `${duplicate.id}-${i}` : `duplicate-${i}`}
              className="grouped-achievement__duplicate-item"
            >
              <LevelCard
                achievement={duplicate}
                index={-1}
                isTimeline={isTimeline}
                hideRank={hideRank}
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
