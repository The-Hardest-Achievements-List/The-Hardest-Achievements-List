import { useEffect, useState } from "react";
import {
  formatDate,
  formatDisplayVersion,
  formatLength,
  getNotesFullText,
  getYouTubeEmbedUrl,
  isValidDate,
  normalizeYouTubeUrl,
} from "../utils/format";
import { useLevelThumbnail } from "./LevelCard";
import { TAG_DEFINITIONS } from "./Header";
import {
  formatEstimateDisplay,
  hasEstimate,
  hasProjectedShift,
  hasResolvableEstimate,
} from "../utils/estimateRank";
import Tooltip, { ProjectedRankTooltipContent } from "./Tooltip";

const DISPLAYABLE_TAGS = new Set(Object.keys(TAG_DEFINITIONS));

export default function LevelModal({
  level: a,
  onClose,
  hideRank,
  isPendingEstimate,
  pendingMainCount = 0,
  showProjectedRanks = false,
}) {
  const UNDEFINED_LABEL = "undefined";
  const asDisplayString = (value) =>
    typeof value === "string" && value.trim() ? value.trim() : UNDEFINED_LABEL;
  const asDisplayNumber = (value) =>
    typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : UNDEFINED_LABEL;
  const asDisplayDate = (value) =>
    isValidDate(value) ? formatDate(value) : UNDEFINED_LABEL;
  const asDisplayLength = (value) =>
    typeof value === "number" && Number.isFinite(value) && value > 0
      ? formatLength(value)
      : UNDEFINED_LABEL;
  const displayName = asDisplayString(a.name);
  const displayPlayer = asDisplayString(a.player);
  const displayLevelID = asDisplayNumber(a.levelID);
  const displayDate = a.timelineDateLabel ?? asDisplayDate(a.date);
  const displayLength = asDisplayLength(a.length);
  const displayVersion = formatDisplayVersion(a.version) ?? UNDEFINED_LABEL;
  const displaySubmitter = asDisplayString(a.submitter);
  const notesText = getNotesFullText(a.notes);

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
  const tags = Array.isArray(a?.tags)
    ? a.tags
    : typeof a?.tags === "string"
      ? a.tags.split(/\s*,\s*/)
      : [];
  const displayTags = tags
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag) return false;
      const lowered = tag.toLowerCase();
      if (lowered === "undefined" || lowered === "null") return false;
      return DISPLAYABLE_TAGS.has(tag);
    });
  const pendingRemoval = displayTags.includes("Pending Removal");
  const { currentUrl, loadedUrl, onError, onLoad } = useLevelThumbnail({
    thumbnail: a.thumbnail,
    showcaseVideo: a.showcaseVideo,
    video: a.video,
    levelID: a.levelID,
    lazy: false,
  });

  const handleCopy = (value) => {
    navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setTimeout(() => setCopiedValue(null), 2000);
  };

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
        className={`modal${pendingRemoval ? " is-pending-removal" : ""}`}
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
            {!hideRank && isPendingEstimate && pendingRankLabel != null && (
              <span
                className={`modal__rank${!hasResolvableEstimate(a, pendingMainCount) ? " modal__rank--unknown" : ""}`}
              >
                {pendingRankLabel}
              </span>
            )}
            {!hideRank && !isPendingEstimate && officialRank != null && (
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
              {displayTags.map((t, index) => (
                <span key={`${t}-${index}`} className="modal__tag" data-tag={t}>
                  {t}
                </span>
              ))}
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
                onClick={() => handleCopy(displayLevelID)}
                style={{ cursor: "pointer" }}
                title="Click to copy"
              >
                {copiedValue === displayLevelID ? "✓ Copied" : displayLevelID}
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

          <div className="modal__links">
            {a.video && (
              <a
                href={normalizeYouTubeUrl(a.video)}
                target="_blank"
                rel="noopener noreferrer"
                className="modal__link modal__link--primary"
              >
                Watch Achievement ↗
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
