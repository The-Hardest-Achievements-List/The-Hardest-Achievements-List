import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  formatDate,
  formatDisplayVersion,
  formatLength,
  getNotesExtraCount,
  getNotesPreview,
  getNotesPreviewMaxLength,
  getThumbnailUrlSequence,
  hasNotes,
  hasNotesBeyondPreview,
  isValidDate,
} from "../utils/format";
import { TAG_DEFINITIONS, TAG_ICONS } from "./Header";
import Tooltip, { ProjectedRankTooltipContent } from "./Tooltip";
import {
  formatEstimateDisplay,
  hasEstimate,
  hasProjectedShift,
  hasResolvableEstimate,
} from "../utils/estimateRank";

const MIN_THUMBNAIL_DIMENSION = 200;

const SUFFIX_RE = /\s+in a row$/i;
const ELLIPSIS = " … ";
const MIN_TAIL_SEGMENTS = 1;
const PREFERRED_TAIL_SEGMENTS = 2;
const NAME_LINE_COUNT = 2;
const DISPLAYABLE_TAGS = new Set(Object.keys(TAG_DEFINITIONS));
const UNDEFINED_LABEL = "undefined";

function asDisplayString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : UNDEFINED_LABEL;
}

function asDisplayNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : UNDEFINED_LABEL;
}

function asDisplayDate(value) {
  return isValidDate(value) ? formatDate(value) : UNDEFINED_LABEL;
}

function asDisplayLength(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? formatLength(value)
    : UNDEFINED_LABEL;
}

function parseCardNameSegments(name) {
  const suffixMatch = name.match(SUFFIX_RE);
  const suffix = suffixMatch ? suffixMatch[0] : "";
  const body = suffix ? name.slice(0, -suffix.length).trimEnd() : name;
  const segments = body.split(",").map((part) => part.trim()).filter(Boolean);
  return { segments, suffix };
}

function minimalTruncatedBody(segments) {
  if (segments.length <= 2) {
    return segments.join(", ");
  }

  return `${segments[0]}${ELLIPSIS}${segments[segments.length - 1]}`;
}

function middleTruncateSegments(
  segments,
  headCount,
  tailSegmentCount = PREFERRED_TAIL_SEGMENTS,
) {
  const tailCount = Math.min(
    tailSegmentCount,
    Math.max(MIN_TAIL_SEGMENTS, segments.length - 1),
  );
  const headMax = segments.length - tailCount;

  if (headMax <= 0 || segments.length <= tailCount + 1) {
    return segments.join(", ");
  }

  const safeHeadCount = Math.max(1, Math.min(headCount, headMax));
  const head = segments.slice(0, safeHeadCount).join(", ");
  const tail = segments.slice(-tailCount).join(", ");

  if (safeHeadCount >= headMax) {
    return tail ? `${head}, ${tail}` : head;
  }

  return `${head}${ELLIPSIS}${tail}`;
}

function getMaxNameHeight(element) {
  const style = window.getComputedStyle(element);
  const lineHeight = parseFloat(style.lineHeight);
  return lineHeight * NAME_LINE_COUNT;
}

function renderName(element, body, suffix) {
  const bodyEl = element.querySelector(".card__name-body");
  const suffixEl = element.querySelector(".card__name-suffix");
  if (!bodyEl) return false;

  bodyEl.textContent = body;
  if (suffixEl) {
    suffixEl.textContent = suffix;
  }

  return element.scrollHeight <= getMaxNameHeight(element) + 0.5;
}

function findBestSegmentBody(element, segments, suffix) {
  const tailOptions = suffix
    ? [PREFERRED_TAIL_SEGMENTS, MIN_TAIL_SEGMENTS]
    : [PREFERRED_TAIL_SEGMENTS];

  for (const tailCount of tailOptions) {
    const safeTailCount = Math.min(
      tailCount,
      Math.max(MIN_TAIL_SEGMENTS, segments.length - 1),
    );
    const headMax = segments.length - safeTailCount;

    if (headMax <= 0 || segments.length <= safeTailCount + 1) {
      continue;
    }

    let lo = 1;
    let hi = headMax;
    let best = null;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const candidate = middleTruncateSegments(segments, mid, safeTailCount);
      if (renderName(element, candidate, suffix)) {
        best = candidate;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (best) return best;
  }

  return null;
}

function fitCardName(element, name) {
  const { segments, suffix } = parseCardNameSegments(name);
  const fullBody = segments.join(", ");

  if (renderName(element, fullBody, suffix)) {
    return fullBody;
  }

  const best = findBestSegmentBody(element, segments, suffix);
  if (best) {
    return best;
  }

  return minimalTruncatedBody(segments);
}

function TruncatedCardName({ name, className }) {
  const ref = useRef(null);
  const { suffix } = parseCardNameSegments(name);
  const fullBody = suffix ? name.slice(0, -suffix.length).trimEnd() : name;
  const [displayBody, setDisplayBody] = useState(fullBody);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const updateDisplayName = () => {
      const width = element.clientWidth;
      if (width <= 0) {
        setDisplayBody(fullBody);
        return;
      }

      setDisplayBody(fitCardName(element, name));
    };

    updateDisplayName();

    const observer = new ResizeObserver(updateDisplayName);
    observer.observe(element);
    window.addEventListener("resize", updateDisplayName);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDisplayName);
    };
  }, [name, fullBody]);

  const displayName = `${displayBody}${suffix}`;
  const isTruncated = displayName !== name;

  return (
    <h2
      ref={ref}
      className={className}
      title={isTruncated ? name : undefined}
    >
      <span className="card__name-body">{displayBody}</span>
      {suffix ? <span className="card__name-suffix">{suffix}</span> : null}
    </h2>
  );
}

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

function CardTag({ tag }) {
  const def = TAG_DEFINITIONS[tag] || {};

  return (
    <span className={`card__tag ${def.className || ""}`}>
      <Tooltip text={def.tooltip || tag}>
        {def.icon ? (
          <img src={def.icon} alt="" />
        ) : (
          TAG_ICONS[tag] && (
            <i className={`fas ${TAG_ICONS[tag]}`} aria-hidden="true" />
          )
        )}
        {def.text || tag}
      </Tooltip>
    </span>
  );
}

function CardTags({ tags, listNote }) {
  const containerRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(tags.length);

  useLayoutEffect(() => {
    setVisibleCount(tags.length);
  }, [tags]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || tags.length === 0) return undefined;

    const checkOverflow = () => {
      if (container.scrollHeight > container.clientHeight + 1) {
        setVisibleCount((count) => Math.max(0, count - 1));
      }
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(container);
    return () => observer.disconnect();
  }, [tags, visibleCount, listNote]);

  const hiddenCount = Math.max(0, tags.length - visibleCount);
  const hiddenLabel = tags.slice(visibleCount).join(", ");
  const visibleTags = tags.slice(0, visibleCount);

  return (
    <div ref={containerRef} className="card__tags">
      {listNote}
      {visibleTags.map((tag, index) => (
        <CardTag key={`${tag}-${index}`} tag={tag} />
      ))}
      {hiddenCount > 0 && (
        <span className="card__tag card__tag--overflow" title={hiddenLabel}>
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

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

function LevelCard({
  achievement: a,
  index,
  isTimeline,
  timelineDateLabel,
  hideRank,
  isPendingEstimate,
  pendingMainCount = 0,
  showProjectedRanks = false,
  onClick,
  layoutMode = "CARD",
  cornerActions = null,
}) {
  const displayedDate = timelineDateLabel ?? formatDate(a.date);
  const displayedName = asDisplayString(a.name);
  const displayedPlayer = asDisplayString(a.player);
  const displayedLevelID = asDisplayNumber(a.levelID);
  const displayedLength = asDisplayLength(a.length);
  const displayedVersion = formatDisplayVersion(a.version) ?? UNDEFINED_LABEL;
  const displayedDateValue = asDisplayDate(a.date);
  const shouldShowRank =
    !isTimeline && index !== -1 && (isPendingEstimate || !hideRank);
  const officialRank = shouldShowRank
    ? (a.rank ?? a.listRank ?? index + 1)
    : null;
  const pendingRankBadge = isPendingEstimate
    ? formatEstimateDisplay(a, pendingMainCount)
    : null;
  const showProjectedShift =
    showProjectedRanks && !isPendingEstimate && hasProjectedShift(a);
  const isPodium =
    !isTimeline &&
    index < 3 &&
    (isPendingEstimate ? hasEstimate(a) : !hideRank);
  const isDuplicate = index === -1;

  const tags = React.useMemo(() => {
    const source = Array.isArray(a.tags)
      ? a.tags
      : typeof a.tags === "string"
        ? a.tags.split(/\s*,\s*/)
        : [];

    return source
      .filter((tag) => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter((tag) => {
        if (!tag) return false;
        const lowered = tag.toLowerCase();
        if (lowered === "undefined" || lowered === "null") return false;
        return DISPLAYABLE_TAGS.has(tag);
      });
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

  const showCornerNote = isCardLayout && hasNotes(a.notes);
  const showCornerActions = showCornerNote || Boolean(cornerActions);

  return (
    <article
      ref={thumbnailRef}
      className={`card${isPodium ? " is-podium" : ""}${isTimeline ? " is-timeline" : ""}${isDuplicate ? " is-duplicate" : ""}${pendingRemoval ? " is-pending-removal" : ""}${showCornerNote ? " has-corner-note" : ""}${cornerActions ? " has-corner-variant" : ""}${layoutMode === "LIST" ? " card--list" : ""}`}
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
              <div>
                <span className="lbl">ID</span>
                <span className="val">{displayedLevelID}</span>
              </div>
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
            <CardTags
              tags={tags}
              listNote={
                !isCardLayout && hasNotes(a.notes) ? (
                  <CardNoteButton notes={a.notes} onOpen={handleCardClick} />
                ) : null
              }
            />
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
        </div>
      )}
    </article>
  );
}

export default React.memo(LevelCard);
