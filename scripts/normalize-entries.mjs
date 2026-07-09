import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeYouTubeUrl } from "../src/utils/format.js";
import { normalizeEstimateField } from "../src/utils/estimateRank.js";

const ESTIMATE_FIELDS = new Set(["estimateLower", "estimateUpper"]);

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

const normalizeTags = (tags, tagOrder) => {
  if (tags == null) return [];
  if (Array.isArray(tags)) return sortTags(tags, tagOrder);
  if (typeof tags === "string") {
    return sortTags(tags.split(/\s*,\s*/).filter(Boolean), tagOrder);
  }
  return tags;
};

export const normalizeVideoField = (value) => {
  if (value == null || typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  return normalizeYouTubeUrl(trimmed);
};

export const sortEntriesByName = (entries) =>
  [...entries].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

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

    if (VIDEO_FIELDS.includes(key)) {
      const normalized = normalizeVideoField(entry[key]);
      if (typeof entry[key] === "string" && normalized !== entry[key]) {
        videoChanges += 1;
      }
      result[key] = normalized;
      continue;
    }

    if (ESTIMATE_FIELDS.has(key)) {
      result[key] = normalizeEstimateField(entry[key]);
      continue;
    }

    result[key] = entry[key];
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

    fs.writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`);

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
