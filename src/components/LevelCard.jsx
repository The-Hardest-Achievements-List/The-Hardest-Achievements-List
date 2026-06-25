import React, { useState, useCallback, useMemo } from "react";
import {
  formatDate,
  formatLength,
  getThumbnailUrlSequence,
} from "../utils/format";
import { TAG_ICONS, TAG_DEFINITIONS } from "./Header";
import Tooltip from "./Tooltip";

function LevelCard({
  achievement: a,
  index,
  isTimeline,
  hideRank,
  onClick,
  layoutMode = "CARD",
}) {
  const shouldShowRank = !hideRank && !isTimeline && index !== -1;
  const podiumRank = shouldShowRank
    ? (a.rank ?? a.listRank ?? index + 1)
    : null;
  const isPodium = !isTimeline && index < 3 && !hideRank;
  const isDuplicate = index === -1;

  const tags = React.useMemo(() => {
    if (Array.isArray(a.tags)) return a.tags;
    if (typeof a.tags === "string") return a.tags.split(/\s*,\s*/).filter(Boolean);
    return [];
  }, [a.tags]);

  const thumbnailUrlSequence = useMemo(
    () =>
      getThumbnailUrlSequence(a.thumbnail, a.showcaseVideo, a.video, a.levelID),
    [a.thumbnail, a.showcaseVideo, a.video, a.levelID],
  );

  const [urlIndex, setUrlIndex] = useState(0);
  const currentThumbnailUrl = thumbnailUrlSequence[urlIndex] || null;

  const handleImageError = useCallback(() => {
    setUrlIndex((prev) =>
      prev < thumbnailUrlSequence.length - 1 ? prev + 1 : prev,
    );
  }, [thumbnailUrlSequence.length]);

  const handleImageLoad = useCallback(
    (e) => {
      if (e.target.naturalWidth === 0 || e.target.naturalHeight === 0) {
        handleImageError();
      }
    },
    [handleImageError],
  );

  const handleCardClick = useCallback(() => {
    onClick(a);
  }, [onClick, a]);

  return (
    <article
      className={`card${isPodium ? " is-podium" : ""}${isTimeline ? " is-timeline" : ""}${isDuplicate ? " is-duplicate" : ""}${layoutMode === "LIST" ? " card--list" : ""}`}
      onClick={handleCardClick}
    >
      <div
        className="card__content"
        style={{
          backgroundImage:
            layoutMode === "CARD" && currentThumbnailUrl
              ? `url(${currentThumbnailUrl})`
              : undefined,
        }}
      >
        <div className="card__detail">
          <div className="card__detail-top">
            <div className="card__rank-row">
              {!isDuplicate &&
                (isTimeline ? (
                  <span className="card__rank-badge">{formatDate(a.date)}</span>
                ) : (
                  podiumRank != null && (
                    <span className="card__rank-badge">#{podiumRank}</span>
                  )
                ))}
            </div>
            <h2 className="card__name">{a.name}</h2>
            <div className="card__player">
              <span className="card__player-by">by</span>
              <span className="card__player-name">{a.player}</span>
            </div>
          </div>

          <div className="card__detail-bottom">
            <div className="card__stats">
              {a.levelID != null && (
                <div>
                  <span className="lbl">ID</span>
                  <span className="val">{a.levelID}</span>
                </div>
              )}
              {!isTimeline && (
                <div>
                  <span className="lbl">DATE</span>
                  <span className="val">{formatDate(a.date)}</span>
                </div>
              )}
              {!!a.length && (
                <div>
                  <span className="lbl">LEN</span>
                  <span className="val">{formatLength(a.length)}</span>
                </div>
              )}
              <div>
                <span className="lbl">VER</span>
                <span className="val">{a.version ?? "2.2"}</span>
              </div>
            </div>
            <div className="card__tags">
              {tags.map((t) => {
                const def = TAG_DEFINITIONS[t] || {};
                return (
                  <span key={t} className={`card__tag ${def.className || ""}`}>
                    <Tooltip text={def.tooltip || t}>
                      {def.icon ? (
                        <img
                          src={def.icon}
                          alt=""
                          style={{ marginRight: "0.35rem", height: 12 }}
                        />
                      ) : (
                        TAG_ICONS[t] && (
                          <i
                            className={`fas ${TAG_ICONS[t]}`}
                            style={{ marginRight: "0.35rem" }}
                          />
                        )
                      )}
                      {def.text || t}
                    </Tooltip>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {layoutMode === "CARD" && (
        <div className="card__thumb">
          {currentThumbnailUrl ? (
            <img
              src={currentThumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onError={handleImageError}
              onLoad={handleImageLoad}
              width="100%"
              height="100%"
            />
          ) : (
            <div className="card__thumb-placeholder" />
          )}
          <div className="card__thumb-fade" />
          {a.notes && <div className="card__notes-overlay">{a.notes}</div>}
        </div>
      )}
    </article>
  );
}

export default React.memo(LevelCard);
