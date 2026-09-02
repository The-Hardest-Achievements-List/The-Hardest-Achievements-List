import { TAG_DEFINITIONS, TAG_ICONS } from "../utils/tags";
import Tooltip from "./Tooltip";

export default function FilterTagChips({
  tags,
  activeTags,
  toggleTag,
  className = "hd__chips",
  useTooltip = true,
}) {
  const safeTags = Array.isArray(tags) ? tags : [];

  return (
    <div className={className}>
      {safeTags.map((tag) => {
        const state = activeTags.get(tag);
        const def = TAG_DEFINITIONS[tag] || {};
        const label = (
          <>
            {TAG_ICONS[tag] && (
              <i className={`fas ${TAG_ICONS[tag]}`} aria-hidden="true" />
            )}
            {def.text || tag}
          </>
        );

        return (
          <button
            key={tag}
            type="button"
            className={`hd__chip${state === "include" ? " is-include" : ""}${state === "exclude" ? " is-exclude" : ""}${def.className ? ` ${def.className}` : ""}`}
            onClick={() => toggleTag(tag)}
            title={
              useTooltip
                ? undefined
                : def.tooltip ||
                  (state === "include"
                    ? "Include only"
                    : state === "exclude"
                      ? "Exclude"
                      : "Not filtering")
            }
          >
            {useTooltip ? <Tooltip text={def.tooltip}>{label}</Tooltip> : label}
          </button>
        );
      })}
    </div>
  );
}
