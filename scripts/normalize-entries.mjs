import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
  "estimateLower",
  "estimateUpper",
  "notes",
  "video",
  "showcaseVideo",
  "thumbnail",
  "duplicateOf",
  "tags",
  "originalName",
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

const sortTags = (tags, tagOrder) => {
  if (!Array.isArray(tags)) return tags;
  const index = new Map(tagOrder.map((tag, i) => [tag, i]));
  return [...tags].sort((a, b) => {
    const rankA = index.has(a) ? index.get(a) : tagOrder.length;
    const rankB = index.has(b) ? index.get(b) : tagOrder.length;
    return rankA - rankB || a.localeCompare(b);
  });
};

const reorderEntry = (entry, fieldOrder, tagOrder) => {
  const result = {};

  for (const key of fieldOrder) {
    if (!(key in entry)) continue;
    if (key === "tags") {
      const tags = entry.tags;
      if (Array.isArray(tags)) {
        result[key] = sortTags(tags, tagOrder);
      } else if (typeof tags === "string") {
        result[key] = sortTags(
          tags.split(/\s*,\s*/).filter(Boolean),
          tagOrder,
        );
      } else {
        result[key] = tags;
      }
      continue;
    }
    result[key] = entry[key];
  }

  for (const key of Object.keys(entry)) {
    if (!(key in result)) result[key] = entry[key];
  }

  return result;
};

const normalizeClassicEntry = (entry) =>
  reorderEntry(entry, CLASSIC_FIELD_ORDER, CLASSIC_TAGS);

const normalizePlatformerEntry = (entry) =>
  reorderEntry(entry, PLATFORMER_FIELD_ORDER, PLATFORMER_TAGS);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");

const FILES = [
  { file: "achievements.json", normalize: normalizeClassicEntry },
  { file: "pending.json", normalize: normalizeClassicEntry },
  { file: "timeline.json", normalize: normalizeClassicEntry },
  { file: "platformers.json", normalize: normalizePlatformerEntry },
  { file: "platformerpending.json", normalize: normalizePlatformerEntry },
  { file: "platformertimeline.json", normalize: normalizePlatformerEntry },
];

for (const { file, normalize } of FILES) {
  const filePath = path.join(dataDir, file);
  const entries = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const normalized = entries.map(normalize);
  fs.writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`);
  console.log(`Normalized ${file} (${normalized.length} entries)`);
}
