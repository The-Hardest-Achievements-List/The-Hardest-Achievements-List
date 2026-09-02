import React, { useCallback, useEffect, useRef, useState } from "react";
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
  asDisplayLevelID,
  asDisplayString,
  filterDisplayableTags,
  hasValidLevelID,
} from "../utils/display";
import Tooltip, { ProjectedRankTooltipContent } from "./Tooltip";
import TruncatedCardName from "./TruncatedCardName";
import CardTags from "./CardTags";
import { CountryFlagRow } from "./CountryFlag";
import AchievementThumbnail from "./AchievementThumbnail";
import playerCountriesData from "../../data/playercountries.json";
import { resolvePlayerCountries } from "../utils/playerCountries";
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
  onJumpToList = null,
  isJumpHighlight = false,
}) {
  const displayedDate = timelineDateLabel ?? formatDate(a.date);
  const displayedName = asDisplayString(a.name);
  const displayedPlayer = asDisplayString(a.player);
  const playerCountryCodes = resolvePlayerCountries(
    playerCountriesData,
    a.player,
  );
  const displayedLevelID = asDisplayLevelID(a.levelID);
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
  const cardRef = useRef(null);

  const handlePrimaryThumb = useCallback((url) => {
    const el = cardRef.current;
    if (!el) return;
    if (url) {
      el.style.setProperty("--thumb-url", `url("${url}")`);
    } else {
      el.style.removeProperty("--thumb-url");
    }
  }, []);

  const handleCardClick = useCallback(() => {
    onClick(a);
  }, [onClick, a]);

  const handleJumpClick = useCallback(
    (e) => {
      e.stopPropagation();
      onJumpToList?.(a);
    },
    [onJumpToList, a],
  );

  const showJumpButton = typeof onJumpToList === "function";
  const showCornerNote = hasNotes(a.notes);
  const showCornerActions = showCornerNote || Boolean(cornerActions);

  return (
    <article
      ref={cardRef}
      className={`card${isPodium ? ` is-podium is-podium--${podiumPlace}` : ""}${isTimeline ? " is-timeline" : ""}${isDuplicate ? " is-duplicate" : ""}${pendingRemoval ? " is-pending-removal" : ""}${isReplacement ? " is-replacement" : ""}${showCornerNote ? " has-corner-note" : ""}${cornerActions ? " has-corner-variant" : ""}${showJumpButton ? " has-jump-tab" : ""}${isJumpHighlight ? " is-jump-highlight" : ""}`}
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
              <CountryFlagRow
                codes={playerCountryCodes}
                size={14}
                className="card__player-flags"
                flagClassName="card__player-flag"
              />
            </div>
          </div>

          <div className="card__detail-bottom">
            {showJumpButton && (
              <button
                type="button"
                className="card__jump-tab"
                onClick={handleJumpClick}
                title="Clear search/filters and jump to this spot in the full list"
                aria-label="Jump to list position"
              >
                <i className="fas fa-location-crosshairs" aria-hidden="true" />
                <span className="card__jump-tab__label">Jump</span>
              </button>
            )}
            <div className="card__stats">
              {hasValidLevelID(a.levelID) && (
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

      <AchievementThumbnail
        achievement={a}
        className="card__thumb"
        fadeClassName="card__thumb-fade"
        pendingClassName="card__thumb-img--pending"
        lazy={false}
        onLoadedUrl={handlePrimaryThumb}
      />
    </article>
  );
}

export default React.memo(LevelCard);
