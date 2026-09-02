import { formatDate, formatLength, isValidDate } from "./format";
import { TAG_DEFINITIONS } from "./tags";

export const UNDEFINED_LABEL = "undefined";
export const UNRELEASED_LABEL = "unreleased";

export const DISPLAYABLE_TAGS = new Set(Object.keys(TAG_DEFINITIONS));

export function asDisplayString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : UNDEFINED_LABEL;
}

export function asDisplayNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : UNDEFINED_LABEL;
}

export function asDisplayLevelID(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
  }
  if (value == null) {
    return UNRELEASED_LABEL;
  }
  return UNDEFINED_LABEL;
}

export function hasValidLevelID(value) {
  if (typeof value === "number" && Number.isFinite(value)) return true;
  if (typeof value === "string") return /^\d+$/.test(value.trim());
  return false;
}

export function asDisplayDate(value) {
  return isValidDate(value) ? formatDate(value) : UNDEFINED_LABEL;
}

export function asDisplayLength(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? formatLength(value)
    : UNDEFINED_LABEL;
}

/** Normalizes raw tags (array or comma-separated string) down to the
 * displayable subset, dropping blanks and "undefined"/"null" placeholders. */
export function filterDisplayableTags(rawTags) {
  const source = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === "string"
      ? rawTags.split(/\s*,\s*/)
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
}
