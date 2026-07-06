export function hasEstimate(entry) {
  const lo = entry?.estimateLower;
  const hi = entry?.estimateUpper;
  return Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi;
}

export const UNKNOWN_ESTIMATE_LABEL = "Unknown projection";

export const PROJECTION_TOOLTIP =
  "Rank after pending entries are placed. Unknown projections are placed last.";

export function getEstimateMidpoint(entry) {
  if (!hasEstimate(entry)) return null;
  return (entry.estimateLower + entry.estimateUpper) / 2;
}

export function buildMainProjection(mainEntries, pendingEntries, getKey) {
  if (!Array.isArray(pendingEntries) || pendingEntries.length === 0) {
    return null;
  }

  const items = [];
  let listRank = 0;

  for (const entry of mainEntries) {
    if (entry?.duplicateOf) continue;
    listRank += 1;
    items.push({
      type: "main",
      key: getKey(entry),
      slot: listRank,
      name: entry.name ?? "",
    });
  }

  const mainCount = listRank;

  for (const entry of pendingEntries) {
    const midpoint = getEstimateMidpoint(entry);
    items.push({
      type: "pending",
      key: getKey(entry),
      slot: midpoint,
      name: entry.name ?? "",
      unknown: midpoint == null,
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

  items.sort((a, b) => {
    if (a.slot !== b.slot) return a.slot - b.slot;
    if (a.type !== b.type) return a.type === "pending" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

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

export function formatEstimate(entry) {
  if (!hasEstimate(entry)) return null;
  const lo = entry.estimateLower;
  const hi = entry.estimateUpper;
  if (lo === hi) return `#${lo}`;
  return `#${lo} to #${hi}`;
}

export function formatEstimateDisplay(entry) {
  return formatEstimate(entry) ?? UNKNOWN_ESTIMATE_LABEL;
}

export function comparePendingEstimate(a, b, sortDir = "asc") {
  const getKey = (entry) => {
    if (!hasEstimate(entry)) {
      return { known: false, lower: Infinity, upper: Infinity };
    }
    return {
      known: true,
      lower: entry.estimateLower,
      upper: entry.estimateUpper,
    };
  };

  const ka = getKey(a);
  const kb = getKey(b);
  const dir = sortDir === "asc" ? 1 : -1;

  if (ka.known !== kb.known) return ka.known ? -1 * dir : 1 * dir;
  if (ka.lower !== kb.lower) return (ka.lower - kb.lower) * dir;
  if (ka.upper !== kb.upper) return (ka.upper - kb.upper) * dir;
  return (a.name ?? "").localeCompare(b.name ?? "");
}

export function matchesEstimateSearch(entry, q) {
  if (!q) return false;
  if (UNKNOWN_ESTIMATE_LABEL.toLowerCase().includes(q)) return !hasEstimate(entry);
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
