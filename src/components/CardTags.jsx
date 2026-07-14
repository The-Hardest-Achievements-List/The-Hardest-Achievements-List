import { useLayoutEffect, useRef, useState } from "react";
import { TAG_DEFINITIONS, TAG_ICONS } from "../utils/tags";
import Tooltip from "./Tooltip";

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

export default function CardTags({ tags, listNote }) {
  const containerRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(tags.length);
  const hasListNote = Boolean(listNote);

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
  }, [tags, visibleCount, hasListNote]);

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
