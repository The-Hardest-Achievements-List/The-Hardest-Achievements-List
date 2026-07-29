import { useLayoutEffect, useRef, useState } from "react";
import { TAG_DEFINITIONS, TAG_ICONS } from "../utils/tags";
import Tooltip from "./Tooltip";

function CardTag({ tag, hidden }) {
  const def = TAG_DEFINITIONS[tag] || {};

  return (
    <span
      className={`card__tag ${def.className || ""}`}
      style={hidden ? { display: "none" } : undefined}
      aria-hidden={hidden ? true : undefined}
    >
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

function fitVisibleTagCount(container, tagCount) {
  if (!container || tagCount <= 0) return 0;
  if (container.clientHeight <= 0) return tagCount;

  const tagEls = Array.from(
    container.querySelectorAll(".card__tag:not(.card__tag--overflow)"),
  );
  if (tagEls.length === 0) return tagCount;

  const overflowEl = container.querySelector(".card__tag--overflow");
  const prevDisplays = tagEls.map((el) => el.style.display);
  const prevOverflowDisplay = overflowEl ? overflowEl.style.display : "";
  const prevOverflowText = overflowEl ? overflowEl.textContent : "";

  const fits = (count) => {
    tagEls.forEach((el, i) => {
      el.style.display = i < count ? "" : "none";
    });
    if (overflowEl) {
      overflowEl.style.display = count < tagCount ? "" : "none";
      if (count < tagCount) {
        overflowEl.textContent = `+${tagCount - count}`;
      }
    }
    return container.scrollHeight <= container.clientHeight + 1;
  };

  let best = 0;
  let lo = 0;
  let hi = tagEls.length;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (fits(mid)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  tagEls.forEach((el, i) => {
    el.style.display = prevDisplays[i];
  });
  if (overflowEl) {
    overflowEl.style.display = prevOverflowDisplay;
    overflowEl.textContent = prevOverflowText;
  }

  return best;
}

export default function CardTags({ tags, listNote }) {
  const containerRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(tags.length);
  const hasListNote = Boolean(listNote);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || tags.length === 0) {
      setVisibleCount(tags.length);
      return undefined;
    }

    const update = () => {
      const next = fitVisibleTagCount(container, tags.length);
      setVisibleCount((prev) => (prev === next ? prev : next));
    };

    update();

    let resizeRaf = 0;
    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        update();
      });
    };

    const observer = new ResizeObserver(onResize);
    observer.observe(container);
    return () => {
      observer.disconnect();
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
    };
  }, [tags, hasListNote]);

  const hiddenCount = Math.max(0, tags.length - visibleCount);
  const hiddenLabel = tags.slice(visibleCount).join(", ");

  return (
    <div ref={containerRef} className="card__tags">
      {listNote}
      {tags.map((tag, index) => (
        <CardTag
          key={`${tag}-${index}`}
          tag={tag}
          hidden={index >= visibleCount}
        />
      ))}
      <span
        className="card__tag card__tag--overflow"
        title={hiddenCount > 0 ? hiddenLabel : undefined}
        style={hiddenCount > 0 ? undefined : { display: "none" }}
        aria-hidden={hiddenCount > 0 ? undefined : true}
      >
        {hiddenCount > 0 ? `+${hiddenCount}` : ""}
      </span>
    </div>
  );
}
