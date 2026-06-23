import { useEffect, useState } from "react";
import {
  formatDate,
  formatLength,
  getYouTubeVideoId,
  getThumbnailUrlSequence,
} from "../utils/format";

export default function LevelModal({ level: a, onClose, hideRank }) {
  const [copiedValue, setCopiedValue] = useState(null);
  const thumbnailUrlSequence = getThumbnailUrlSequence(
    a.thumbnail,
    a.showcaseVideo,
    a.video,
    a.levelID,
  );
  const [urlIndex, setUrlIndex] = useState(0);

  const currentThumbnailUrl = thumbnailUrlSequence[urlIndex] || null;

  const handleImageError = () => {
    if (urlIndex < thumbnailUrlSequence.length - 1) {
      setUrlIndex(urlIndex + 1);
    }
  };

  const handleImageLoad = (e) => {
    if (e.target.naturalWidth === 0 || e.target.naturalHeight === 0) {
      handleImageError();
    }
  };

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
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__thumb">
          {currentThumbnailUrl && (
            <img
              src={currentThumbnailUrl}
              alt={a.name}
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          )}
          <div className="modal__thumb-fade" />
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal__body">
          <div className="modal__top-row">
            {!hideRank && a.rank != null && (
              <span className="modal__rank">#{a.rank}</span>
            )}
            <div className="modal__tags">
              {(a.tags ?? []).map((t) => (
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
                onClick={() => handleCopy(formatDate(a.date))}
                style={{ cursor: "pointer" }}
                title="Click to copy"
              >
                {copiedValue === formatDate(a.date)
                  ? "✓ Copied"
                  : formatDate(a.date)}
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
                  const videoId = getYouTubeVideoId(a.video);
                  return videoId ? (
                    <div key="achievement-video">
                      <span className="modal__embed-label">
                        Achievement Video
                      </span>
                      <div className="modal__embed">
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
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
                  const videoId = getYouTubeVideoId(a.showcaseVideo);
                  return videoId ? (
                    <div
                      key="showcase-video"
                      style={{ marginTop: a.video ? "16px" : 0 }}
                    >
                      <span className="modal__embed-label">Level Showcase</span>
                      <div className="modal__embed">
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
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
                href={a.video}
                target="_blank"
                rel="noopener noreferrer"
                className="modal__link modal__link--primary"
              >
                Watch Achievement ↗
              </a>
            )}
            {a.showcaseVideo && (
              <a
                href={a.showcaseVideo}
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
