import { useLayoutEffect, useRef, useState } from "react";

const SUFFIX_RE = /\s+in a row$/i;
const ELLIPSIS = " … ";
const MIN_TAIL_SEGMENTS = 1;
const PREFERRED_TAIL_SEGMENTS = 2;
const NAME_LINE_COUNT = 2;
const CONSISTENCY_SUFFIX = " in a row";
/** Cache fitted bodies across virtualized remounts (name|widthBucket → body). */
const fitCache = new Map();
const FIT_CACHE_MAX = 400;

/** Progress hyphens must not soft-wrap (otherwise "65-79%" → "65-" / "79% …"). */
function hardenProgressText(text) {
  return text.replace(/-/g, "\u2011");
}

function parseCardNameSegments(name) {
  const suffixMatch = name.match(SUFFIX_RE);
  const suffix = suffixMatch ? CONSISTENCY_SUFFIX : "";
  const body = suffixMatch
    ? name.slice(0, -suffixMatch[0].length).trimEnd()
    : name;
  const segments = body
    .split(",")
    .map((part) => hardenProgressText(part.trim()))
    .filter(Boolean);
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
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return lineHeight * NAME_LINE_COUNT;
}

function applyNameDom(element, body, suffix) {
  const bodyEl = element.querySelector(".card__name-body");
  const suffixEl = element.querySelector(".card__name-suffix");
  if (!bodyEl) return false;
  if (suffix && !suffixEl) return false;

  bodyEl.textContent = body;
  if (suffixEl) {
    suffixEl.textContent = suffix;
  }
  return true;
}

/**
 * Measure body + nowrap suffix with the 2-line clamp lifted so a clipped
 * suffix cannot look like a successful fit.
 */
function nameFits(element, body, suffix) {
  if (!applyNameDom(element, body, suffix)) return false;

  const prevMaxHeight = element.style.maxHeight;
  const prevOverflow = element.style.overflow;
  element.style.maxHeight = "none";
  element.style.overflow = "visible";

  const contentHeight = element.scrollHeight;
  const maxAllowed = getMaxNameHeight(element);

  element.style.maxHeight = prevMaxHeight;
  element.style.overflow = prevOverflow;

  return contentHeight <= maxAllowed + 0.5;
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
      if (nameFits(element, candidate, suffix)) {
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

  if (nameFits(element, fullBody, suffix)) {
    return fullBody;
  }

  const best = findBestSegmentBody(element, segments, suffix);
  if (best) {
    return best;
  }

  // Segment-boundary fallthrough only — never carve mid-"65-79%".
  const fallbackBodies = [];
  if (segments.length > 2) {
    fallbackBodies.push(minimalTruncatedBody(segments));
  }
  if (segments.length > 0) {
    fallbackBodies.push(`${segments[0]}${ELLIPSIS}`);
    fallbackBodies.push(segments[0]);
  }
  if (suffix) {
    fallbackBodies.push("…");
  }

  for (const candidate of fallbackBodies) {
    if (nameFits(element, candidate, suffix)) {
      return candidate;
    }
  }

  return minimalTruncatedBody(segments);
}

function cacheKey(name, width) {
  // Bucket width so tiny sub-pixel changes don't bust the cache.
  return `${name}::${Math.round(width / 4) * 4}`;
}

function rememberFit(key, body) {
  if (fitCache.size >= FIT_CACHE_MAX) {
    const oldest = fitCache.keys().next().value;
    fitCache.delete(oldest);
  }
  fitCache.set(key, body);
}

export default function TruncatedCardName({ name, className }) {
  const ref = useRef(null);
  const { suffix, segments } = parseCardNameSegments(name);
  const fullBody = segments.join(", ");
  const [displayBody, setDisplayBody] = useState(fullBody);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const updateDisplayName = () => {
      if (element.clientWidth <= 0) {
        applyNameDom(element, fullBody, suffix);
        setDisplayBody(fullBody);
        return;
      }

      const key = cacheKey(name, element.clientWidth);
      const cached = fitCache.get(key);
      if (cached != null) {
        applyNameDom(element, cached, suffix);
        setDisplayBody((prev) => (prev === cached ? prev : cached));
        return;
      }

      const nextBody = fitCardName(element, name);
      rememberFit(key, nextBody);
      // nameFits mutates the live spans while probing candidates. Restore the
      // selected candidate even when React bails out because state is unchanged.
      applyNameDom(element, nextBody, suffix);
      setDisplayBody((prev) => (prev === nextBody ? prev : nextBody));
    };

    updateDisplayName();

    let resizeRaf = 0;
    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        updateDisplayName();
      });
    };

    let fontsPromise = null;
    if (document.fonts?.ready) {
      fontsPromise = document.fonts.ready.then(() => {
        if (ref.current) updateDisplayName();
      });
    }

    const observer = new ResizeObserver(onResize);
    observer.observe(element);
    window.addEventListener("resize", onResize);

    return () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      // fonts.ready can't be cancelled; the ref check above guards stale work.
      void fontsPromise;
    };
  }, [name, fullBody, suffix]);

  const plainDisplay = `${displayBody}${suffix}`.replace(/\u2011/g, "-");
  const isTruncated = plainDisplay !== name;

  return (
    <h2
      ref={ref}
      className={className}
      title={isTruncated ? name : undefined}
    >
      <span className="card__name-body">{displayBody}</span>
      {suffix ? (
        <span className="card__name-suffix">{suffix}</span>
      ) : null}
    </h2>
  );
}
