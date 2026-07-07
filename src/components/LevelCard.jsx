import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  formatDate,
  formatLength,
  getThumbnailUrlSequence,
} from "../utils/format";
import { TAG_ICONS, TAG_DEFINITIONS } from "./Header";
import Tooltip, { ProjectedRankTooltipContent } from "./Tooltip";
import {
  formatEstimateDisplay,
  hasEstimate,
  hasProjectedShift,
} from "../utils/estimateRank";

const MIN_THUMBNAIL_DIMENSION = 200;

export function useLevelThumbnail({
  thumbnail,
  showcaseVideo,
  video,
  levelID,
  lazy = true,
  enabled = true,
}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(!lazy);
  const [urlIndex, setUrlIndex] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState(null);
  const [exhausted, setExhausted] = useState(false);

  const sequence = useMemo(() => {
    if (!enabled) return [];
    return getThumbnailUrlSequence(thumbnail, showcaseVideo, video, levelID);
  }, [thumbnail, showcaseVideo, video, levelID, enabled]);

  useEffect(() => {
    setUrlIndex(0);
    setLoadedUrl(null);
    setExhausted(false);
  }, [sequence]);

  useEffect(() => {
    if (!lazy || !enabled) {
      setInView(true);
      return undefined;
    }

    setInView(false);
    const element = ref.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { rootMargin: "200px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [lazy, enabled, sequence]);

  const shouldLoad = enabled && inView && !exhausted;
  const currentUrl = shouldLoad ? (sequence[urlIndex] ?? null) : null;

  const onError = useCallback(() => {
    setLoadedUrl(null);
    setUrlIndex((prev) => {
      if (prev < sequence.length - 1) return prev + 1;
      setExhausted(true);
      return prev;
    });
  }, [sequence.length]);

  const onLoad = useCallback(
    (e) => {
      const { naturalWidth, naturalHeight } = e.target;
      if (
        naturalWidth === 0 ||
        naturalHeight === 0 ||
        (naturalWidth < MIN_THUMBNAIL_DIMENSION &&
          naturalHeight < MIN_THUMBNAIL_DIMENSION)
      ) {
        onError();
        return;
      }

      setLoadedUrl(e.target.currentSrc || e.target.src);
    },
    [onError],
  );

  return {
    ref,
    currentUrl,
    loadedUrl,
    onError,
    onLoad,
  };
}

function LevelCard({  achievement: a,
  index,
  isTimeline,
  hideRank,
  isPendingEstimate,
  showProjectedRanks = false,
  onClick,
  layoutMode = "CARD",
}) {
  const shouldShowRank =
    !isTimeline && index !== -1 && (isPendingEstimate || !hideRank);
  const officialRank = shouldShowRank
    ? (a.rank ?? a.listRank ?? index + 1)
    : null;
  const pendingRankBadge = isPendingEstimate ? formatEstimateDisplay(a) : null;
  const showProjectedShift =
    showProjectedRanks && !isPendingEstimate && hasProjectedShift(a);
  const isPodium =
    !isTimeline &&
    index < 3 &&
    (isPendingEstimate ? hasEstimate(a) : !hideRank);
  const isDuplicate = index === -1;

  const tags = React.useMemo(() => {
    if (Array.isArray(a.tags)) return a.tags;
    if (typeof a.tags === "string") return a.tags.split(/\s*,\s*/).filter(Boolean);
    return [];
  }, [a.tags]);
  const pendingRemoval = tags.includes("Pending Removal");
  const isCardLayout = layoutMode === "CARD";

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
    enabled: isCardLayout,
  });

  const handleCardClick = useCallback(() => {
    onClick(a);
  }, [onClick, a]);

  return (
    <article
      ref={thumbnailRef}
      className={`card${isPodium ? " is-podium" : ""}${isTimeline ? " is-timeline" : ""}${isDuplicate ? " is-duplicate" : ""}${pendingRemoval ? " is-pending-removal" : ""}${layoutMode === "LIST" ? " card--list" : ""}`}
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
                  <span className="card__rank-badge">{formatDate(a.date)}</span>
                ) : isPendingEstimate ? (
                  pendingRankBadge != null && (
                    <span
                      className={`card__rank-badge${!hasEstimate(a) ? " card__rank-badge--unknown" : ""}`}
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

      {isCardLayout && (
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
          {a.notes && <div className="card__notes-overlay">{a.notes}</div>}
        </div>
      )}
    </article>
  );
}

export default React.memo(LevelCard);
