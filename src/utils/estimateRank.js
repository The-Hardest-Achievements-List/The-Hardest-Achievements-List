import { isDuplicateAchievement } from "./groupDuplicates.js";

export const NLW_ESTIMATE = "NLW";
export const NLW_ESTIMATE_LABEL = "Not List Worthy";
export const PURE_NLW_ESTIMATE_LABEL = "Questionable to be List Worthy";
export const INVALID_ESTIMATE_LABEL = "undefined";
export const MAX_ESTIMATE_VALUE = 1000;

function isEstimateNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_ESTIMATE_VALUE
  );
}

export function normalizeEstimateField(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^nlw$/i.test(trimmed)) return NLW_ESTIMATE;
    if (/^not\s+list\s+worthy$/i.test(trimmed)) return NLW_ESTIMATE;
    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue) && isEstimateNumber(numericValue)) {
      return numericValue;
    }
    return null;
  }
  if (isEstimateNumber(value)) return value;
  return null;
}

export function isNlwEstimateField(value) {
  return value === NLW_ESTIMATE;
}

export function isNlwEstimate(entry) {
  return (
    isNlwEstimateField(entry?.estimateLower) ||
    isNlwEstimateField(entry?.estimateUpper)
  );
}

export function isPureNlwEstimate(entry) {
  return (
    isNlwEstimateField(entry?.estimateLower) &&
    isNlwEstimateField(entry?.estimateUpper)
  );
}

export function getMainListCount(mainEntries) {
  if (!Array.isArray(mainEntries)) return 0;
  return mainEntries.reduce(
    (count, entry) => count + (isDuplicateAchievement(entry) ? 0 : 1),
    0,
  );
}

export function hasEstimate(entry) {
  const lo = entry?.estimateLower;
  const hi = entry?.estimateUpper;
  if (isNlwEstimateField(lo) || isNlwEstimateField(hi)) return false;
  return isEstimateNumber(lo) && isEstimateNumber(hi) && lo <= hi;
}

export function resolveEstimateBound(value, mainCount) {
  if (isNlwEstimateField(value)) return getTailProjectionSlot(mainCount);
  if (isEstimateNumber(value)) return value;
  return null;
}

export function getResolvedBounds(entry, mainCount) {
  const lowerField = normalizeEstimateField(entry?.estimateLower);
  const upperField = normalizeEstimateField(entry?.estimateUpper);
  if (lowerField == null || upperField == null) return null;
  if (isNlwEstimateField(lowerField) && isNlwEstimateField(upperField)) {
    const tail = getTailProjectionSlot(mainCount);
    return { lower: tail, upper: tail };
  }
  if (isNlwEstimateField(lowerField) && !isNlwEstimateField(upperField)) {
    return null;
  }

  const rawLower = resolveEstimateBound(lowerField, mainCount);
  const rawUpper = resolveEstimateBound(upperField, mainCount);
  if (rawLower == null || rawUpper == null) return null;
  if (rawLower > rawUpper) return null;

  return { lower: rawLower, upper: rawUpper };
}

export function hasResolvableEstimate(entry, mainCount) {
  return getResolvedBounds(entry, mainCount) != null;
}

export function getResolvedMidpoint(entry, mainCount) {
  const bounds = getResolvedBounds(entry, mainCount);
  if (!bounds) return null;
  return (bounds.lower + bounds.upper) / 2;
}

export const UNKNOWN_ESTIMATE_LABEL = "Unknown projection";

export const PROJECTION_TOOLTIP =
  "Rank after all pending entries are placed. Not list worthy resolves to just below the current list end; unknown projections are placed last.";

export function getEstimateMidpoint(entry) {
  if (!hasEstimate(entry)) return null;
  return (entry.estimateLower + entry.estimateUpper) / 2;
}

export function getTailProjectionSlot(mainCount) {
  return mainCount + 0.5;
}

export function getProjectionSlot(entry, mainCount) {
  return getResolvedMidpoint(entry, mainCount);
}

/** Case-insensitive name tiebreaker for equal estimate ranges (always ascending). */
export function compareEntryName(a, b) {
  return (a?.name ?? "").toLowerCase().localeCompare((b?.name ?? "").toLowerCase());
}

function getResolvedSortKey(entry, mainCount) {
  const bounds = getResolvedBounds(entry, mainCount);
  if (!bounds) {
    return { tier: 2, midpoint: Infinity, lower: Infinity, upper: Infinity };
  }
  return {
    tier: 0,
    midpoint: (bounds.lower + bounds.upper) / 2,
    lower: bounds.lower,
    upper: bounds.upper,
  };
}

export function comparePendingEstimate(a, b, sortDir = "asc", mainCount = 0) {
  const ka = getResolvedSortKey(a, mainCount);
  const kb = getResolvedSortKey(b, mainCount);
  const dir = sortDir === "asc" ? 1 : -1;

  if (ka.tier !== kb.tier) {
    if (ka.tier === 2) return 1;
    if (kb.tier === 2) return -1;
    return ka.tier - kb.tier;
  }

  if (ka.tier === 0) {
    if (ka.midpoint !== kb.midpoint) return (ka.midpoint - kb.midpoint) * dir;
    if (ka.lower !== kb.lower) return (ka.lower - kb.lower) * dir;
    if (ka.upper !== kb.upper) return (ka.upper - kb.upper) * dir;
  }

  return compareEntryName(a, b);
}

function compareProjectionItems(a, b, mainCount) {
  if (a.slot !== b.slot) return a.slot - b.slot;
  if (a.type !== b.type) return a.type === "pending" ? -1 : 1;
  if (a.type === "pending" && b.type === "pending") {
    return comparePendingEstimate(a.entry, b.entry, "asc", mainCount);
  }
  return compareEntryName(a, b);
}

export function buildMainProjection(mainEntries, pendingEntries, getKey) {
  if (!Array.isArray(pendingEntries) || pendingEntries.length === 0) {
    return null;
  }

  const items = [];
  let listRank = 0;

  for (const entry of mainEntries) {
    if (isDuplicateAchievement(entry)) continue;
    listRank += 1;
    items.push({
      type: "main",
      key: getKey(entry),
      slot: listRank,
      name: entry.name ?? "",
      entry,
    });
  }

  const mainCount = listRank;

  for (const entry of pendingEntries) {
    if (isDuplicateAchievement(entry)) continue;
    const slot = getProjectionSlot(entry, mainCount);
    items.push({
      type: "pending",
      key: getKey(entry),
      slot,
      name: entry.name ?? "",
      unknown: slot == null,
      entry,
    });
  }

  const maxKnownSlot = items.reduce(
    (max, item) =>
      item.unknown ? max : Math.max(max, item.slot ?? 0),
    mainCount,
  );
  const unknownSlot = maxKnownSlot + 1;

  for (const item of items) {
    if (item.unknown) item.slot = unknownSlot;
  }

  items.sort((a, b) => compareProjectionItems(a, b, mainCount));

  const projectionByKey = new Map();
  items.forEach((item, index) => {
    if (item.type === "main") {
      projectionByKey.set(item.key, index + 1);
    }
  });

  return projectionByKey;
}

export function hasProjectedShift(entry) {
  return (
    entry?.projectedRank != null &&
    entry?.listRank != null &&
    entry.projectedRank !== entry.listRank
  );
}

export function formatEstimate(entry, mainCount = null) {
  if (mainCount != null && hasResolvableEstimate(entry, mainCount)) {
    if (isPureNlwEstimate(entry)) return PURE_NLW_ESTIMATE_LABEL;

    const loField = entry.estimateLower;
    const hiField = entry.estimateUpper;
    const loNlw = isNlwEstimateField(loField);
    const hiNlw = isNlwEstimateField(hiField);

    if (!loNlw && hiNlw) return `#${loField} to ${NLW_ESTIMATE_LABEL}`;
    if (loNlw && !hiNlw) return `${NLW_ESTIMATE_LABEL} to #${hiField}`;

    if (loField === hiField) return `#${loField}`;
    return `#${loField} to #${hiField}`;
  }

  if (isPureNlwEstimate(entry)) return PURE_NLW_ESTIMATE_LABEL;

  if (isNlwEstimate(entry)) {
    const loField = entry.estimateLower;
    const hiField = entry.estimateUpper;
    if (!isNlwEstimateField(loField) && isNlwEstimateField(hiField)) {
      return `#${loField} to ${NLW_ESTIMATE_LABEL}`;
    }
    if (isNlwEstimateField(loField) && !isNlwEstimateField(hiField)) {
      return `${NLW_ESTIMATE_LABEL} to #${hiField}`;
    }
  }

  if (!hasEstimate(entry)) return null;
  const lo = entry.estimateLower;
  const hi = entry.estimateUpper;
  if (lo === hi) return `#${lo}`;
  return `#${lo} to #${hi}`;
}

export function formatEstimateDisplay(entry, mainCount = null) {
  const rawLower = entry?.estimateLower;
  const rawUpper = entry?.estimateUpper;
  const hasRawEstimate = rawLower != null || rawUpper != null;
  const normalizedLower = normalizeEstimateField(rawLower);
  const normalizedUpper = normalizeEstimateField(rawUpper);
  const hasInvalidInput =
    hasRawEstimate &&
    (normalizedLower == null || normalizedUpper == null || !hasResolvableEstimate({
      ...entry,
      estimateLower: normalizedLower,
      estimateUpper: normalizedUpper,
    }, mainCount));

  if (hasInvalidInput) return INVALID_ESTIMATE_LABEL;
  return formatEstimate(entry, mainCount) ?? UNKNOWN_ESTIMATE_LABEL;
}

export function matchesEstimateSearch(entry, q, mainCount = 0) {
  if (!q) return false;
  const pureLabel = PURE_NLW_ESTIMATE_LABEL.toLowerCase();
  const mixedLabel = NLW_ESTIMATE_LABEL.toLowerCase();
  const token = NLW_ESTIMATE.toLowerCase();

  if (pureLabel.includes(q)) return isPureNlwEstimate(entry);
  if (mixedLabel.includes(q)) return isNlwEstimate(entry) && !isPureNlwEstimate(entry);
  if (token.includes(q) || q.includes(token)) return isNlwEstimate(entry);
  if (UNKNOWN_ESTIMATE_LABEL.toLowerCase().includes(q)) {
    return !hasResolvableEstimate(entry, mainCount);
  }
  if (hasResolvableEstimate(entry, mainCount)) {
    const bounds = getResolvedBounds(entry, mainCount);
    const lo = String(bounds.lower);
    const hi = String(bounds.upper);
    if (
      lo.includes(q) ||
      hi.includes(q) ||
      `${lo}-${hi}`.includes(q) ||
      `${lo} to ${hi}`.includes(q)
    ) {
      return true;
    }
  }
  if (!hasEstimate(entry)) return false;
  const lo = String(entry.estimateLower);
  const hi = String(entry.estimateUpper);
  return (
    lo.includes(q) ||
    hi.includes(q) ||
    `${lo}-${hi}`.includes(q) ||
    `${lo} to ${hi}`.includes(q)
  );
}
