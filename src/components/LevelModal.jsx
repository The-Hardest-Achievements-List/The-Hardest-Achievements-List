import { useEffect, useRef, useState } from "react";
import {
  formatDisplayVersion,
  getNotesFullText,
  getYouTubeEmbedUrl,
  isWatchableAchievementUrl,
  normalizeImageUrl,
  normalizeProofUrl,
  normalizeYouTubeUrl,
} from "../utils/format";
import {
  UNDEFINED_LABEL,
  UNRELEASED_LABEL,
  asDisplayDate,
  asDisplayLength,
  asDisplayLevelID,
  asDisplayString,
  filterDisplayableTags,
} from "../utils/display";
import { useLevelThumbnail } from "../hooks/useLevelThumbnail";
import {
  formatEstimateDisplay,
  hasProjectedShift,
  hasResolvableEstimate,
} from "../utils/estimateRank";
import Tooltip, { ProjectedRankTooltipContent } from "./Tooltip";
import { TAG_DEFINITIONS, TAG_ICONS } from "../utils/tags";

export default function LevelModal({
  level: a,
  onClose,
  isPendingEstimate,
  pendingMainCount = 0,
  showProjectedRanks = false,
}) {
  const displayName = asDisplayString(a.name);
  const displayPlayer = asDisplayString(a.player);
  const displayLevelID = asDisplayLevelID(a.levelID);
  const canCopyLevelID = displayLevelID !== UNRELEASED_LABEL;
  const displayDate = a.timelineDateLabel ?? asDisplayDate(a.date);
  const displayLength = asDisplayLength(a.length);
  const displayVersion = formatDisplayVersion(a.version) ?? UNDEFINED_LABEL;
  const displaySubmitter = asDisplayString(a.submitter);
  const notesText = getNotesFullText(a.notes);
  const imageUrl = normalizeImageUrl(a.image);
  const proofUrl = normalizeProofUrl(a.proof);

  const [copiedValue, setCopiedValue] = useState(null);
  const officialRank =
    !isPendingEstimate && (a.listRank != null || a.rank != null)
      ? a.listRank ?? a.rank
      : null;
  const pendingRankLabel = isPendingEstimate
    ? formatEstimateDisplay(a, pendingMainCount)
    : null;
  const showProjectedShift =
    showProjectedRanks && !isPendingEstimate && hasProjectedShift(a);
  const displayTags = filterDisplayableTags(a?.tags);
  const pendingRemoval = displayTags.includes("Pending Removal");
  const isReplacement = Boolean(a?.isReplacement);
  const { currentUrl, loadedUrl, onError, onLoad } = useLevelThumbnail({
    thumbnail: a.thumbnail,
    showcaseVideo: a.showcaseVideo,
    video: a.video,
    levelID: a.levelID,
    lazy: false,
  });

  const copyTimersRef = useRef([]);

  const handleCopy = (value) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedValue(value);
    copyTimersRef.current.push(setTimeout(() => setCopiedValue(null), 2000));
  };

  useEffect(
    () => () => {
      copyTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    },
    [],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal${pendingRemoval ? " is-pending-removal" : ""}${isReplacement ? " is-replacement" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__thumb">
          {currentUrl && (
            <img
              src={currentUrl}
              alt={displayName}
              onError={onError}
              onLoad={onLoad}
            />
          )}
          {!loadedUrl && !currentUrl && (
            <div className="card__thumb-placeholder" />
          )}
          <div className="modal__thumb-fade" />
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal__body">
          <div className="modal__top-row">
            {isPendingEstimate && pendingRankLabel != null && (
              <span
                className={`modal__rank${!hasResolvableEstimate(a, pendingMainCount) ? " modal__rank--unknown" : ""}`}
              >
                {pendingRankLabel}
              </span>
            )}
            {!isPendingEstimate && officialRank != null && (
              hasProjectedShift(a) ? (
                <Tooltip
                  content={
                    showProjectedShift ? (
                      <ProjectedRankTooltipContent entry={a} />
                    ) : null
                  }
                >
                  <span
                    className={`modal__rank modal__rank--official rank-projection${showProjectedShift ? "" : " rank-projection--single"}`}
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
                <span className="modal__rank modal__rank--official">
                  #{officialRank}
                </span>
              )
            )}
            <div className="modal__tags">
              {displayTags.map((t, index) => {
                const def = TAG_DEFINITIONS[t] || {};
                return (
                  <span
                    key={`${t}-${index}`}
                    className={`modal__tag ${def.className || ""}`}
                  >
                    {TAG_ICONS[t] && (
                      <i
                        className={`fas ${TAG_ICONS[t]}`}
                        aria-hidden="true"
                      />
                    )}
                    {def.text || t}
                  </span>
                );
              })}
            </div>
          </div>

          <h2 className="modal__name">{displayName}</h2>
          <div className="modal__player">
            <span className="modal__player-by">by</span>
            <span className="modal__player-name">{displayPlayer}</span>
          </div>

          <div className="modal__stats">
            <div className="modal__stat">
              <span className="lbl">LEVEL ID</span>
              <span
                className="val"
                onClick={
                  canCopyLevelID
                    ? () => handleCopy(displayLevelID)
                    : undefined
                }
                style={canCopyLevelID ? { cursor: "pointer" } : undefined}
                title={canCopyLevelID ? "Click to copy" : undefined}
              >
                {canCopyLevelID && copiedValue === displayLevelID
                  ? "✓ Copied"
                  : displayLevelID}
              </span>
            </div>
            <div className="modal__stat">
              <span className="lbl">DATE</span>
              <span
                className="val"
                onClick={() => handleCopy(displayDate)}
                style={{ cursor: "pointer" }}
                title="Click to copy"
              >
                {copiedValue === displayDate
                  ? "✓ Copied"
                  : displayDate}
              </span>
            </div>
            <div className="modal__stat">
              <span className="lbl">LENGTH</span>
              <span
                className="val"
                onClick={() => handleCopy(displayLength)}
                style={{ cursor: "pointer" }}
                title="Click to copy"
              >
                {copiedValue === displayLength
                  ? "✓ Copied"
                  : displayLength}
              </span>
            </div>
            <div className="modal__stat">
              <span className="lbl">VERSION</span>
              <span
                className="val"
                onClick={() => handleCopy(displayVersion)}
                style={{ cursor: "pointer" }}
                title="Click to copy"
              >
                {copiedValue === displayVersion
                  ? "✓ Copied"
                  : displayVersion}
              </span>
            </div>
            <div className="modal__stat">
              <span className="lbl">SUBMITTED BY</span>
              <span
                className="val"
                onClick={() => handleCopy(displaySubmitter)}
                style={{ cursor: "pointer" }}
                title="Click to copy"
              >
                {copiedValue === displaySubmitter ? "✓ Copied" : displaySubmitter}
              </span>
            </div>
          </div>

          {notesText && (
            <div className="modal__notes">
              <span className="modal__embed-label">Notes</span>
              <p className="modal__notes-body">{notesText}</p>
            </div>
          )}

          {(a.video || a.showcaseVideo) && (
            <div className="modal__embed-section">
              {a.video &&
                (() => {
                  const embedUrl = getYouTubeEmbedUrl(a.video);
                  return embedUrl ? (
                    <div key="achievement-video">
                      <span className="modal__embed-label">
                        Achievement Video
                      </span>
                      <div className="modal__embed">
                        <iframe
                          src={embedUrl}
                          title="Achievement Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : null;
                })()}
              {a.showcaseVideo &&
                (() => {
                  const embedUrl = getYouTubeEmbedUrl(a.showcaseVideo);
                  return embedUrl ? (
                    <div
                      key="showcase-video"
                      style={{ marginTop: a.video ? "16px" : 0 }}
                    >
                      <span className="modal__embed-label">Level Showcase</span>
                      <div className="modal__embed">
                        <iframe
                          src={embedUrl}
                          title="Level Showcase"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : null;
                })()}
            </div>
          )}

          {imageUrl && (
            <div className="modal__proof-section">
              <span className="modal__embed-label">Achievement Proof</span>
              <div className="modal__embed modal__embed--proof">
                <img src={imageUrl} alt={displayName} loading="lazy" />
              </div>
            </div>
          )}

          <div className="modal__links">
            {a.video && isWatchableAchievementUrl(a.video) && (
              <a
                href={normalizeYouTubeUrl(a.video)}
                target="_blank"
                rel="noopener noreferrer"
                className="modal__link modal__link--primary"
              >
                Watch Achievement ↗
              </a>
            )}
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`modal__link${!a.video || !isWatchableAchievementUrl(a.video) ? " modal__link--primary" : ""}`}
              >
                View Image ↗
              </a>
            )}
            {proofUrl && (
              <a
                href={proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`modal__link${(!a.video || !isWatchableAchievementUrl(a.video)) && !imageUrl ? " modal__link--primary" : ""}`}
              >
                View Proof ↗
              </a>
            )}
            {a.showcaseVideo && (
              <a
                href={normalizeYouTubeUrl(a.showcaseVideo)}
                target="_blank"
                rel="noopener noreferrer"
                className="modal__link"
              >
                Level Showcase ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
