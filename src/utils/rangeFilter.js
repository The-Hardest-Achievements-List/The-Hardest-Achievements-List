/** Parse a progress % range from an achievement name (`13-72%` or `3.13%`).
 * Noclip progress with no usable % in the name is treated as a full 0–100 run. */
export function parseProgressRange(name, tags = null) {
  if (!name && !(Array.isArray(tags) && tags.includes("Noclip"))) return null;

  // Ignore accuracy percentages so they don't masquerade as progress.
  const cleaned = name
    ? String(name).replace(/\d+(?:\.\d+)?%\s*accuracy/gi, "")
    : "";

  const range = cleaned.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*%/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return { start: Math.min(start, end), end: Math.max(start, end) };
  }

  const single = cleaned.match(/(\d+(?:\.\d+)?)\s*%/);
  if (single) {
    const pct = Number(single[1]);
    if (!Number.isFinite(pct)) return null;
    return { start: 0, end: pct };
  }

  if (Array.isArray(tags) && tags.includes("Noclip")) {
    return { start: 0, end: 100 };
  }

  return null;
}

/** Parse a Hz value from an achievement name (`60hz`, `144hz`). */
export function parseHertz(name) {
  if (!name) return null;
  const match = String(name).match(/(\d+)\s*hz\b/i);
  if (!match) return null;
  const hz = Number(match[1]);
  return Number.isFinite(hz) ? hz : null;
}

function parseBound(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Match Progress / Low Hertz bounds parsed from the name.
 * Progress: start >= From and end <= To.
 * Hertz: value >= Min and value <= Max.
 * Empty bounds are unrestricted. When a dimension is enabled but the name
 * has no parseable value, the entry fails that dimension.
 */
export function entryMatchesRangeFilter(
  achievement,
  {
    progressEnabled = false,
    progressFrom = "",
    progressTo = "",
    hertzEnabled = false,
    hzMin = "",
    hzMax = "",
  } = {},
) {
  if (progressEnabled) {
    const from = parseBound(progressFrom);
    const to = parseBound(progressTo);
    if (from != null || to != null) {
      const range = parseProgressRange(
        achievement?.name,
        achievement?.tags,
      );
      if (!range) return false;
      if (from != null && range.start < from) return false;
      if (to != null && range.end > to) return false;
    }
  }

  if (hertzEnabled) {
    const min = parseBound(hzMin);
    const max = parseBound(hzMax);
    if (min != null || max != null) {
      const hz = parseHertz(achievement?.name);
      if (hz == null) return false;
      if (min != null && hz < min) return false;
      if (max != null && hz > max) return false;
    }
  }

  return true;
}

export function hasRangeFilterBounds({
  progressEnabled = false,
  progressFrom = "",
  progressTo = "",
  hertzEnabled = false,
  hzMin = "",
  hzMax = "",
} = {}) {
  if (progressEnabled && (progressFrom !== "" || progressTo !== "")) return true;
  if (hertzEnabled && (hzMin !== "" || hzMax !== "")) return true;
  return false;
}
