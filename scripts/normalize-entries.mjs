import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeYouTubeUrl } from "../src/utils/format.js";
import { normalizeEstimateField } from "../src/utils/estimateRank.js";

const ESTIMATE_FIELDS = new Set(["estimateLower", "estimateUpper"]);
const hasEstimateFields = (fieldOrder) =>
  fieldOrder.includes("estimateLower") && fieldOrder.includes("estimateUpper");

const CLASSIC_TAGS = [
  "Level",
  "Challenge",
  "Low Hertz",
  "Progress",
  "Consistency",
  "Verified",
  "Rated",
  "Formerly Rated",
  "Tentative",
  "Noclip",
  "Speedhack",
  "Mobile",
  "2P",
  "Coin Route",
  "Miscellaneous",
  "Outdated Version",
  "Pending Removal",
];

const PLATFORMER_TAGS = [
  "Platformer",
  "Deathless",
  "Rated",
  "Verified",
  "Consistency",
  "Progress",
  "Speedrun",
  "Low Hertz",
  "Mobile",
  "Coin Route",
  "Miscellaneous",
  "Outdated Version",
  "Pending Removal",
];

const CLASSIC_FIELD_ORDER = [
  "name",
  "player",
  "levelID",
  "date",
  "length",
  "version",
  "submitter",
  "video",
  "showcaseVideo",
  "thumbnail",
  "duplicateOf",
  "notes",
  "tags",
];

const PENDING_FIELD_ORDER = [
  "name",
  "player",
  "levelID",
  "date",
  "length",
  "version",
  "submitter",
  "estimateLower",
  "estimateUpper",
  "video",
  "showcaseVideo",
  "thumbnail",
  "duplicateOf",
  "notes",
  "tags",
];

const PLATFORMER_FIELD_ORDER = [
  "name",
  "player",
  "levelID",
  "date",
  "length",
  "version",
  "submitter",
  "video",
  "showcaseVideo",
  "thumbnail",
  "tags",
];

export const VIDEO_FIELDS = ["video", "showcaseVideo"];

const sortTags = (tags, tagOrder) => {
  if (!Array.isArray(tags)) return tags;
  const index = new Map(tagOrder.map((tag, i) => [tag, i]));
  return [...tags].sort((a, b) => {
    const rankA = index.has(a) ? index.get(a) : tagOrder.length;
    const rankB = index.has(b) ? index.get(b) : tagOrder.length;
    return rankA - rankB || a.localeCompare(b);
  });
};

const normalizeTagValue = (tag) => {
  if (typeof tag !== "string") return null;
  const trimmed = tag.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered === "undefined" || lowered === "null") return null;

  return trimmed;
};

const normalizeNonEmptyStringField = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeNumberField = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeDateField = (value) => {
  const normalized = normalizeNonEmptyStringField(value);
  if (!normalized) return null;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? null : normalized;
};

const normalizeVersionAlias = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^alpha$/i.test(trimmed)) return "Alpha";
  if (/^beta$/i.test(trimmed)) return "Beta";
  return null;
};

const isValidNumericVersion = (value) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value > 0 &&
  (Number.isInteger(value) || /^\d+\.\d+$/.test(String(value)));

const normalizeVersionField = (value) => {
  const alias = normalizeVersionAlias(value);
  if (alias) return alias;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return isValidNumericVersion(parsed) ? parsed : null;
  }

  if (isValidNumericVersion(value)) return value;

  return null;
};

const normalizeEstimateNumber = (value) => {
  const parsed = normalizeNumberField(value);
  if (parsed == null) return null;
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1000) return null;
  return parsed;
};

const normalizeEstimateAlias = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^nlw$/i.test(trimmed)) return "NLW";
  if (/^not\s+list\s+worthy$/i.test(trimmed)) return "NLW";
  return null;
};

const normalizeTags = (tags, tagOrder) => {
  if (tags == null) return [];
  const allowedTags = new Set(tagOrder);
  const source =
    Array.isArray(tags)
      ? tags
      : typeof tags === "string"
        ? tags.split(/\s*,\s*/)
        : [];

  const cleaned = source
    .map(normalizeTagValue)
    .filter((tag) => Boolean(tag) && allowedTags.has(tag));

  return sortTags([...new Set(cleaned)], tagOrder);
};

/** Accepts a string or string[]; empty / invalid values become null. */
export const normalizeNotesField = (value) => {
  if (value == null) return null;

  if (typeof value === "string") {
    return normalizeNonEmptyStringField(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map(normalizeNonEmptyStringField)
      .filter(Boolean);
    return parts.length ? parts : null;
  }

  return null;
};

export const normalizeVideoField = (value) => {
  if (value == null || typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  return normalizeYouTubeUrl(trimmed);
};

function validateEstimatePair(entry) {
  const lower =
    normalizeEstimateAlias(entry.estimateLower) ??
    normalizeEstimateNumber(entry.estimateLower);
  const upper =
    normalizeEstimateAlias(entry.estimateUpper) ??
    normalizeEstimateNumber(entry.estimateUpper);
  entry.estimateLower = lower;
  entry.estimateUpper = upper;

  const hasEstimate = lower != null || upper != null;
  if (!hasEstimate) return;

  if (lower == null || upper == null) {
    entry.estimateLower = null;
    entry.estimateUpper = null;
    return;
  }

  const bothNlw = lower === "NLW" && upper === "NLW";
  const mixedUpperNlw = typeof lower === "number" && upper === "NLW";
  const mixedLowerNlw = lower === "NLW" && typeof upper === "number";
  const bothNumeric = typeof lower === "number" && typeof upper === "number";

  if (bothNlw) return;

  if (mixedLowerNlw) {
    entry.estimateLower = null;
    entry.estimateUpper = null;
    return;
  }

  if (mixedUpperNlw) {
    if (!normalizeEstimateNumber(lower)) {
      entry.estimateLower = null;
      entry.estimateUpper = null;
    }
    return;
  }

  if (!bothNumeric) {
    entry.estimateLower = null;
    entry.estimateUpper = null;
    return;
  }

  if (lower > upper) {
    entry.estimateLower = null;
    entry.estimateUpper = null;
  }
}

export const sortEntriesByName = (entries) =>
  [...entries].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

/** Rebuild a plain object with keys sorted alphabetically (localeCompare). */
export const sortObjectKeys = (obj) => {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const sorted = {};
  for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
    sorted[key] = obj[key];
  }
  return sorted;
};

export const normalizeEntry = (entry, fieldOrder, tagOrder) => {
  const result = {};
  const addedFields = [];
  const removedFields = [];
  let videoChanges = 0;

  for (const key of fieldOrder) {
    if (!(key in entry)) {
      result[key] = key === "tags" ? [] : null;
      addedFields.push(key);
      continue;
    }

    if (key === "tags") {
      result[key] = normalizeTags(entry.tags, tagOrder);
      continue;
    }

    if (key === "notes") {
      result[key] = normalizeNotesField(entry.notes);
      continue;
    }

    if (VIDEO_FIELDS.includes(key)) {
      const normalized = normalizeVideoField(entry[key]);
      if (typeof entry[key] === "string" && normalized !== entry[key]) {
        videoChanges += 1;
      }
      result[key] = normalized;
      continue;
    }

    if (ESTIMATE_FIELDS.has(key)) {
      result[key] = entry[key];
      continue;
    }

    if (key === "name" || key === "player" || key === "submitter") {
      result[key] = normalizeNonEmptyStringField(entry[key]);
      continue;
    }

    if (key === "video") {
      const normalized = normalizeVideoField(entry[key]);
      result[key] = normalizeNonEmptyStringField(normalized);
      continue;
    }

    if (key === "levelID" || key === "length") {
      result[key] = normalizeNumberField(entry[key]);
      continue;
    }

    if (key === "date") {
      result[key] = normalizeDateField(entry[key]);
      continue;
    }

    if (key === "version") {
      result[key] = normalizeVersionField(entry[key]);
      continue;
    }

    result[key] = entry[key];
  }

  if (hasEstimateFields(fieldOrder)) {
    validateEstimatePair(result);
  }

  for (const key of Object.keys(entry)) {
    if (!fieldOrder.includes(key)) {
      removedFields.push(key);
    }
  }

  const previous = {};
  for (const key of fieldOrder) {
    if (!(key in entry)) continue;
    if (key === "tags") {
      previous[key] = normalizeTags(entry.tags, tagOrder);
    } else if (key === "notes") {
      previous[key] = normalizeNotesField(entry.notes);
    } else if (VIDEO_FIELDS.includes(key)) {
      previous[key] = normalizeVideoField(entry[key]);
    } else if (ESTIMATE_FIELDS.has(key)) {
      previous[key] = normalizeEstimateField(entry[key]);
    } else {
      previous[key] = entry[key];
    }
  }

  const changed =
    addedFields.length > 0 ||
    removedFields.length > 0 ||
    videoChanges > 0 ||
    JSON.stringify(result) !== JSON.stringify(previous);

  return {
    entry: result,
    addedFields,
    removedFields,
    videoChanges,
    changed,
  };
};

const normalizeClassicEntry = (entry) =>
  normalizeEntry(entry, CLASSIC_FIELD_ORDER, CLASSIC_TAGS);

const normalizePendingEntry = (entry) =>
  normalizeEntry(entry, PENDING_FIELD_ORDER, CLASSIC_TAGS);

const normalizePlatformerEntry = (entry) =>
  normalizeEntry(entry, PLATFORMER_FIELD_ORDER, PLATFORMER_TAGS);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = path.join(__dirname, "..", "data");

export const FILES = [
  { file: "achievements.json", normalize: normalizeClassicEntry },
  { file: "pending.json", normalize: normalizePendingEntry, sortByName: true },
  { file: "timeline.json", normalize: normalizeClassicEntry },
  { file: "platformers.json", normalize: normalizePlatformerEntry },
  { file: "platformerpending.json", normalize: normalizePlatformerEntry, sortByName: true },
  { file: "platformertimeline.json", normalize: normalizePlatformerEntry },
];

/** Plain object maps (not entry arrays). Keys are sorted alphabetically on write. */
export const OBJECT_FILES = [
  { file: "playerCountries.json", sortKeys: true },
];

const VERSION_FLOAT_MARKER = "__THAL_VERSION_FLOAT__:";

const toVersionFloatToken = (value) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    if (Number.isInteger(value)) return `${VERSION_FLOAT_MARKER}${value}.0`;
    const asText = String(value);
    if (/^\d+\.\d+$/.test(asText)) return `${VERSION_FLOAT_MARKER}${asText}`;
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return value;
    if (!/^\d+(\.\d+)?$/.test(trimmed)) return value;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) return value;
    if (Number.isInteger(parsed)) return `${VERSION_FLOAT_MARKER}${parsed}.0`;
    return `${VERSION_FLOAT_MARKER}${trimmed.includes(".") ? trimmed : String(parsed)}`;
  }

  return value;
};

export const stringifyEntries = (entries) => {
  // JSON.stringify drops the trailing .0 on whole numbers (1.0 -> 1).
  // Use a temporary string token, then unquote it so the file keeps 1.0 / 2.0.
  const json = JSON.stringify(
    entries,
    (key, value) => (key === "version" ? toVersionFloatToken(value) : value),
    2,
  );
  return `${json.replace(
    new RegExp(`"${VERSION_FLOAT_MARKER}(\\d+\\.\\d+)"`, "g"),
    "$1",
  )}\n`;
};

export const stringifyObject = (obj) => `${JSON.stringify(obj, null, 2)}\n`;

const summarize = (normalizedResults) => {
  const addedFieldCounts = {};
  const removedFieldCounts = {};
  let modifiedEntries = 0;
  let videoChanges = 0;

  normalizedResults.forEach((result) => {
    if (!result.changed) return;
    modifiedEntries += 1;
    videoChanges += result.videoChanges;
    for (const field of result.addedFields) {
      addedFieldCounts[field] = (addedFieldCounts[field] || 0) + 1;
    }
    for (const field of result.removedFields) {
      removedFieldCounts[field] = (removedFieldCounts[field] || 0) + 1;
    }
  });

  return {
    modifiedEntries,
    videoChanges,
    addedFieldCounts,
    removedFieldCounts,
  };
};

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  let totalModified = 0;
  let totalVideoChanges = 0;
  const globalAdded = {};
  const globalRemoved = {};

  for (const { file, normalize, sortByName = false } of FILES) {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipped ${file} (not found)`);
      continue;
    }

    const entries = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const results = entries.map(normalize);
    let normalized = results.map((result) => result.entry);
    const summary = summarize(results);

    let orderChanged = false;
    if (sortByName) {
      const namesBefore = normalized.map((entry) => entry.name).join("\0");
      normalized = sortEntriesByName(normalized);
      orderChanged =
        namesBefore !== normalized.map((entry) => entry.name).join("\0");
    }

    fs.writeFileSync(filePath, stringifyEntries(normalized));

    totalModified += summary.modifiedEntries;
    totalVideoChanges += summary.videoChanges;
    for (const [field, count] of Object.entries(summary.addedFieldCounts)) {
      globalAdded[field] = (globalAdded[field] || 0) + count;
    }
    for (const [field, count] of Object.entries(summary.removedFieldCounts)) {
      globalRemoved[field] = (globalRemoved[field] || 0) + count;
    }

    console.log(`Normalized ${file}:`);
    console.log(`  entries: ${entries.length}`);
    console.log(`  modified: ${summary.modifiedEntries}`);
    console.log(`  video links normalized: ${summary.videoChanges}`);
    if (sortByName) {
      console.log(`  order changed: ${orderChanged ? "yes" : "no"}`);
    }
    if (Object.keys(summary.addedFieldCounts).length > 0) {
      console.log(
        `  fields added (null): ${JSON.stringify(summary.addedFieldCounts)}`,
      );
    }
    if (Object.keys(summary.removedFieldCounts).length > 0) {
      console.log(`  fields removed: ${JSON.stringify(summary.removedFieldCounts)}`);
    }
  }

  for (const { file, sortKeys = false } of OBJECT_FILES) {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipped ${file} (not found)`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (data == null || typeof data !== "object" || Array.isArray(data)) {
      console.warn(`Skipped ${file} (expected a plain object)`);
      continue;
    }

    const keysBefore = Object.keys(data);
    const normalized = sortKeys ? sortObjectKeys(data) : data;
    const keysAfter = Object.keys(normalized);
    const orderChanged =
      keysBefore.length !== keysAfter.length ||
      keysBefore.some((key, index) => key !== keysAfter[index]);

    fs.writeFileSync(filePath, stringifyObject(normalized));

    console.log(`Normalized ${file}:`);
    console.log(`  keys: ${keysAfter.length}`);
    if (sortKeys) {
      console.log(`  order changed: ${orderChanged ? "yes" : "no"}`);
    }
  }

  console.log("---");
  console.log(`Total modified entries: ${totalModified}`);
  console.log(`Total video links normalized: ${totalVideoChanges}`);
  if (Object.keys(globalAdded).length > 0) {
    console.log(`Total fields added (null): ${JSON.stringify(globalAdded)}`);
  }
  if (Object.keys(globalRemoved).length > 0) {
    console.log(`Total fields removed: ${JSON.stringify(globalRemoved)}`);
  }
}
