import { useLayoutEffect, useRef, useState } from "react";

const SUFFIX_RE = /\s+in a row$/i;
const ELLIPSIS = " … ";
const MIN_TAIL_SEGMENTS = 1;
const PREFERRED_TAIL_SEGMENTS = 2;
const NAME_LINE_COUNT = 2;

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

export default function TruncatedCardName({ name, className }) {
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
