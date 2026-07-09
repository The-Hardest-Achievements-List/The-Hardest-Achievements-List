import { useEffect, useState } from "react";
import {
  formatDate,
  formatLength,
  getYouTubeEmbedUrl,
  normalizeYouTubeUrl,
} from "../utils/format";
import { useLevelThumbnail } from "./LevelCard";
import {
  formatEstimateDisplay,
  hasEstimate,
  hasProjectedShift,
  hasResolvableEstimate,
} from "../utils/estimateRank";
import Tooltip, { ProjectedRankTooltipContent } from "./Tooltip";

export default function LevelModal({
  level: a,
  onClose,
  hideRank,
  isPendingEstimate,
  pendingMainCount = 0,
  showProjectedRanks = false,
}) {
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
  const dateDisplay = a.timelineDateLabel ?? formatDate(a.date);
  const tags = Array.isArray(a?.tags)
    ? a.tags
    : typeof a?.tags === "string"
      ? a.tags.split(/\s*,\s*/).filter(Boolean)
      : [];
  const pendingRemoval = tags.includes("Pending Removal");
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
              alt={a.name}
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
              {tags.map((t) => (
                <span key={t} className="modal__tag" data-tag={t}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <h2 className="modal__name">{a.name}</h2>
          <div className="modal__player">
            <span className="modal__player-by">by</span>
            <span className="modal__player-name">{a.player}</span>
          </div>

          <div className="modal__stats">
            {a.levelID && (
              <div className="modal__stat">
                <span className="lbl">LEVEL ID</span>
                <span
                  className="val"
                  onClick={() => handleCopy(a.levelID)}
                  style={{ cursor: "pointer" }}
                  title="Click to copy"
                >
                  {copiedValue === a.levelID ? "✓ Copied" : a.levelID}
                </span>
              </div>
            )}
            <div className="modal__stat">
              <span className="lbl">DATE</span>
              <span
                className="val"
                onClick={() => handleCopy(dateDisplay)}
                style={{ cursor: "pointer" }}
                title="Click to copy"
              >
                {copiedValue === dateDisplay
                  ? "✓ Copied"
                  : dateDisplay}
              </span>
            </div>
            {!!a.length && (
              <div className="modal__stat">
                <span className="lbl">LENGTH</span>
                <span
                  className="val"
                  onClick={() => handleCopy(formatLength(a.length))}
                  style={{ cursor: "pointer" }}
                  title="Click to copy"
                >
                  {copiedValue === formatLength(a.length)
                    ? "✓ Copied"
                    : formatLength(a.length)}
                </span>
              </div>
            )}
            <div className="modal__stat">
              <span className="lbl">VERSION</span>
              <span
                className="val"
                onClick={() => handleCopy(a.version ?? "2.2")}
                style={{ cursor: "pointer" }}
                title="Click to copy"
              >
                {copiedValue === (a.version ?? "2.2")
                  ? "✓ Copied"
                  : (a.version ?? "2.2")}
              </span>
            </div>
            {a.submitter && (
              <div className="modal__stat">
                <span className="lbl">SUBMITTED BY</span>
                <span
                  className="val"
                  onClick={() => handleCopy(a.submitter)}
                  style={{ cursor: "pointer" }}
                  title="Click to copy"
                >
                  {copiedValue === a.submitter ? "✓ Copied" : a.submitter}
                </span>
              </div>
            )}
          </div>

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
