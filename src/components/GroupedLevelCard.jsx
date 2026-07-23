import React, { useState, useCallback, useId, useMemo } from "react";
import LevelCard from "./LevelCard";
import { getDuplicateGroupLabel } from "../utils/groupDuplicates";
import "./GroupedLevelCard.css";

function GroupedLevelCard({
  achievement: mainAchievement,
  duplicates,
  index,
  isTimeline,
  getTimelineDateLabel,
  isPendingEstimate,
  pendingMainCount = 0,
  showProjectedRanks,
  onClick,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const duplicatesRegionId = useId();

  const handleToggleExpanded = useCallback((e) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  const hasVariants = duplicates && duplicates.length > 0;
  const groupLabel = useMemo(
    () => getDuplicateGroupLabel(duplicates),
    [duplicates],
  );
  const showLabel = isExpanded
    ? `Hide ${groupLabel.text}`
    : `Show ${groupLabel.text}`;
  const hasReplacementLabel = groupLabel.replacementCount > 0;
  const toggleClassName = `grouped-achievement__toggle${hasReplacementLabel ? " is-replacement-label" : ""}`;

  const variantToggle = hasVariants ? (
    <button
      type="button"
      className={toggleClassName}
      onClick={handleToggleExpanded}
      title={showLabel}
      aria-expanded={isExpanded}
      aria-controls={duplicatesRegionId}
      aria-label={showLabel}
    >
      <i
        className={`fas fa-chevron-${isExpanded ? "down" : "right"} grouped-achievement__toggle-icon`}
        aria-hidden="true"
      />
      <span className="grouped-achievement__toggle-text">
        {groupLabel.text}
      </span>
      <span className="grouped-achievement__toggle-count" aria-hidden="true">
        {groupLabel.count}
      </span>
    </button>
  ) : null;

  return (
    <div className="grouped-achievement">
      <div className="grouped-achievement__main">
        <LevelCard
          achievement={mainAchievement}
          index={index}
          isTimeline={isTimeline}
          timelineDateLabel={getTimelineDateLabel(mainAchievement)}
          isPendingEstimate={isPendingEstimate}
          pendingMainCount={pendingMainCount}
          showProjectedRanks={showProjectedRanks}
          onClick={onClick}
          cornerActions={variantToggle}
        />
      </div>

      {isExpanded && duplicates && duplicates.length > 0 && (
        <div
          id={duplicatesRegionId}
          className="grouped-achievement__duplicates"
        >
          {duplicates.map((duplicate, i) => (
            <div
              key={
                duplicate.levelID != null
                  ? `${duplicate.levelID}-${i}`
                  : `${duplicate.name}-${i}`
              }
              className={`grouped-achievement__duplicate-item${duplicate.isReplacement ? " is-replacement" : ""}`}
            >
              <LevelCard
                achievement={duplicate}
                index={-1}
                isTimeline={isTimeline}
                timelineDateLabel={getTimelineDateLabel(duplicate)}
                isPendingEstimate={isPendingEstimate}
                pendingMainCount={pendingMainCount}
                showProjectedRanks={showProjectedRanks}
                onClick={onClick}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(GroupedLevelCard);
