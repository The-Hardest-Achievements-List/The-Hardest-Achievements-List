import React, { useCallback, useEffect, useState } from "react";
import {
  formatDate,
  formatDisplayVersion,
  getNotesExtraCount,
  getNotesPreview,
  getNotesPreviewMaxLength,
  hasNotes,
  hasNotesBeyondPreview,
} from "../utils/format";
import {
  UNDEFINED_LABEL,
  asDisplayDate,
  asDisplayLength,
  asDisplayNumber,
  asDisplayString,
  filterDisplayableTags,
} from "../utils/display";
import Tooltip, { ProjectedRankTooltipContent } from "./Tooltip";
import TruncatedCardName from "./TruncatedCardName";
import CardTags from "./CardTags";
import { useLevelThumbnail } from "../hooks/useLevelThumbnail";
import {
  formatEstimateDisplay,
  getExactEstimatePodiumPlace,
  hasProjectedShift,
  hasResolvableEstimate,
} from "../utils/estimateRank";

export function CardNoteButton({ notes, onOpen }) {
  const [previewMaxLength, setPreviewMaxLength] = useState(getNotesPreviewMaxLength);

  useEffect(() => {
    const updatePreviewLimit = () => {
      setPreviewMaxLength(getNotesPreviewMaxLength());
    };
    updatePreviewLimit();
    window.addEventListener("resize", updatePreviewLimit);
    return () => window.removeEventListener("resize", updatePreviewLimit);
  }, []);

  const preview = getNotesPreview(notes, previewMaxLength);
  if (!preview) return null;

  const hasMore = hasNotesBeyondPreview(notes, previewMaxLength);
  const extraCount = getNotesExtraCount(notes);
  const noteClassName = `card__note-tag${hasMore ? " card__note-tag--more" : ""}`;

  const tooltipContent = (
    <div className="note-tooltip">
      <p className="note-tooltip__body">{preview}</p>
      {hasMore ? (
        <p className="note-tooltip__hint">Click card for full notes</p>
      ) : null}
    </div>
  );

  return (
    <Tooltip content={tooltipContent} className={noteClassName}>
      <button
        type="button"
        className="card__note-tag__btn"
        onClick={(e) => {
          e.stopPropagation();
          onOpen?.();
        }}
        aria-label={hasMore ? "Notes — click for full text" : "Notes"}
      >
        <i className="fas fa-comment-dots" aria-hidden="true" />
        <span className="card__note-tag__label">Note</span>
        {extraCount > 0 ? (
          <span className="card__note-tag__more" aria-hidden="true">
            +{extraCount}
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}

function LevelCard({
  achievement: a,
  index,
  isTimeline,
  timelineDateLabel,
  isPendingEstimate,
  pendingMainCount = 0,
  showProjectedRanks = false,
  onClick,
  cornerActions = null,
}) {
  const displayedDate = timelineDateLabel ?? formatDate(a.date);
  const displayedName = asDisplayString(a.name);
  const displayedPlayer = asDisplayString(a.player);
  const displayedLevelID = asDisplayNumber(a.levelID);
  const displayedLength = asDisplayLength(a.length);
  const displayedVersion = formatDisplayVersion(a.version) ?? UNDEFINED_LABEL;
  const displayedDateValue = asDisplayDate(a.date);
  const shouldShowRank = !isTimeline && index !== -1;
  const officialRank = shouldShowRank
    ? (a.rank ?? a.listRank ?? index + 1)
    : null;
  const pendingRankBadge = isPendingEstimate
    ? formatEstimateDisplay(a, pendingMainCount)
    : null;
  const showProjectedShift =
    showProjectedRanks && !isPendingEstimate && hasProjectedShift(a);
  // Main list: real list ranks 1–3.
  // Pending: only when estimateLower === estimateUpper === 1|2|3 (exact top).
  const podiumPlace = !isTimeline
    ? isPendingEstimate
      ? getExactEstimatePodiumPlace(a)
      : officialRank != null && officialRank >= 1 && officialRank <= 3
        ? officialRank
        : null
    : null;
  const isPodium = podiumPlace != null;
  const isDuplicate = index === -1;

  const tags = React.useMemo(() => filterDisplayableTags(a.tags), [a.tags]);
  const pendingRemoval = tags.includes("Pending Removal");
  const isReplacement = Boolean(a.isReplacement);

  const {
    ref: thumbnailRef,
    currentUrl,
    loadedUrl,
    onError,
    onLoad,
  } = useLevelThumbnail({
    thumbnail: a.thumbnail,
    showcaseVideo: a.showcaseVideo,
    video: a.video,
    levelID: a.levelID,
    enabled: true,
  });

  const handleCardClick = useCallback(() => {
    onClick(a);
  }, [onClick, a]);

  const showCornerNote = hasNotes(a.notes);
  const showCornerActions = showCornerNote || Boolean(cornerActions);

  return (
    <article
      ref={thumbnailRef}
      className={`card${isPodium ? ` is-podium is-podium--${podiumPlace}` : ""}${isTimeline ? " is-timeline" : ""}${isDuplicate ? " is-duplicate" : ""}${pendingRemoval ? " is-pending-removal" : ""}${isReplacement ? " is-replacement" : ""}${showCornerNote ? " has-corner-note" : ""}${cornerActions ? " has-corner-variant" : ""}`}
      style={
        loadedUrl ? { "--thumb-url": `url("${loadedUrl}")` } : undefined
      }
      onClick={handleCardClick}
    >
      <div className="card__content">
        <div className="card__detail">
          <div className="card__detail-top">
            <div className="card__rank-row">
              {!isDuplicate &&
                (isTimeline ? (
                  <span className="card__rank-badge">{displayedDate}</span>
                ) : isPendingEstimate ? (
                  pendingRankBadge != null && (
                    <span
                      className={`card__rank-badge${!hasResolvableEstimate(a, pendingMainCount) ? " card__rank-badge--unknown" : ""}`}
                    >
                      {pendingRankBadge}
                    </span>
                  )
                ) : hasProjectedShift(a) ? (
                  <Tooltip
                    content={
                      showProjectedShift ? (
                        <ProjectedRankTooltipContent entry={a} />
                      ) : null
                    }
                  >
                    <span
                      className={`card__rank-badge rank-projection${showProjectedShift ? "" : " rank-projection--single"}`}
                    >
                      <span className="rank-projection__current">#{officialRank}</span>
                      <span className="rank-projection__arrow" aria-hidden="true">
                        →
                      </span>
                      <span className="rank-projection__projected">
                        #{a.projectedRank}
                      </span>
                    </span>
                  </Tooltip>
                ) : (
                  officialRank != null && (
                    <span className="card__rank-badge">#{officialRank}</span>
                  )
                ))}
            </div>
            <TruncatedCardName name={displayedName} className="card__name" />
            <div className="card__player">
              <span className="card__player-by">by</span>
              <span className="card__player-name">{displayedPlayer}</span>
            </div>
          </div>

          <div className="card__detail-bottom">
            <div className="card__stats">
              {typeof a.levelID === "number" && Number.isFinite(a.levelID) && (
                <div>
                  <span className="lbl">ID</span>
                  <span className="val">{displayedLevelID}</span>
                </div>
              )}
              {!isTimeline && (
                <div>
                  <span className="lbl">DATE</span>
                  <span className="val">{displayedDateValue}</span>
                </div>
              )}
              <div>
                <span className="lbl">LEN</span>
                <span className="val">{displayedLength}</span>
              </div>
              <div>
                <span className="lbl">VER</span>
                <span className="val">{displayedVersion}</span>
              </div>
            </div>
            <CardTags tags={tags} listNote={null} />
          </div>
        </div>
        {showCornerActions && (
          <div
            className="card__corner-actions"
            onClick={(e) => e.stopPropagation()}
          >
            {showCornerNote && (
              <CardNoteButton notes={a.notes} onOpen={handleCardClick} />
            )}
            {cornerActions}
          </div>
        )}
      </div>

      <div className="card__thumb">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt=""
            decoding="async"
            onError={onError}
            onLoad={onLoad}
            width="100%"
            height="100%"
          />
        ) : (
          <div className="card__thumb-placeholder" />
        )}
        <div className="card__thumb-fade" />
      </div>
    </article>
  );
}

export default React.memo(LevelCard);
