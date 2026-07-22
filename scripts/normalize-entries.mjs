import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeYouTubeUrl } from "../src/utils/format.js";
import { normalizeEstimateField } from "../src/utils/estimateRank.js";
import { CLASSIC_TAGS, PLATFORMER_TAGS } from "../src/utils/tags.js";
const ESTIMATE_FIELDS = new Set(["estimateLower", "estimateUpper"]);
const hasEstimateFields = (fieldOrder) =>
  fieldOrder.includes("estimateLower") && fieldOrder.includes("estimateUpper");

/**
 * Repair common hand-edit JSON mistakes so `JSON.parse` can succeed.
 * Handles: trailing commas, missing values after `"key":`, missing `]` before
 * `}`, bare `undefined`/`NaN`, and line/block comments outside strings.
 */
export const repairJsonText = (text) => {
  const source = String(text ?? "").replace(/^\uFEFF/, "");
  const repairs = [];
  const out = [];
  const stack = [];
  let i = 0;
  let inString = false;
  let escape = false;

  const peekNonWs = (from) => {
    let j = from;
    while (j < source.length) {
      const ch = source[j];
      if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
        j += 1;
        continue;
      }
      // line comment
      if (ch === "/" && source[j + 1] === "/") {
        j += 2;
        while (j < source.length && source[j] !== "\n") j += 1;
        continue;
      }
      // block comment
      if (ch === "/" && source[j + 1] === "*") {
        j += 2;
        while (j + 1 < source.length && !(source[j] === "*" && source[j + 1] === "/")) {
          j += 1;
        }
        j = Math.min(j + 2, source.length);
        continue;
      }
      return j;
    }
    return j;
  };

  const readStringAt = (from) => {
    if (source[from] !== '"') return null;
    let j = from + 1;
    let esc = false;
    while (j < source.length) {
      const ch = source[j];
      if (esc) {
        esc = false;
        j += 1;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        j += 1;
        continue;
      }
      if (ch === '"') return { end: j, raw: source.slice(from, j + 1) };
      j += 1;
    }
    return null;
  };

  const stripTrailingComma = (closing) => {
    let k = out.length - 1;
    while (k >= 0 && /\s/.test(out[k])) k -= 1;
    if (k >= 0 && out[k] === ",") {
      out.splice(k, 1);
      repairs.push(`removed trailing comma before ${closing}`);
    }
  };

  const matchBareLiteral = (from, literal) => {
    if (!source.startsWith(literal, from)) return false;
    const next = source[from + literal.length];
    if (next != null && /[A-Za-z0-9_$]/.test(next)) return false;
    const prev = source[from - 1];
    if (prev != null && /[A-Za-z0-9_$]/.test(prev)) return false;
    return true;
  };

  while (i < source.length) {
    const ch = source[i];

    if (inString) {
      out.push(ch);
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      i += 1;
      continue;
    }

    // Strip comments outside strings
    if (ch === "/" && source[i + 1] === "/") {
      const start = i;
      i += 2;
      while (i < source.length && source[i] !== "\n") i += 1;
      repairs.push(`removed line comment at ${start}`);
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      const start = i;
      i += 2;
      while (i + 1 < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
        i += 1;
      }
      i = Math.min(i + 2, source.length);
      repairs.push(`removed block comment at ${start}`);
      continue;
    }

    if (ch === '"') {
      inString = true;
      out.push(ch);
      i += 1;
      continue;
    }

    if (ch === "{") {
      stack.push("{");
      out.push(ch);
      i += 1;
      continue;
    }

    if (ch === "[") {
      stack.push("[");
      out.push(ch);
      i += 1;
      continue;
    }

    if (ch === "}") {
      while (stack.length > 0 && stack[stack.length - 1] === "[") {
        stripTrailingComma("]");
        out.push("]");
        stack.pop();
        repairs.push("inserted missing ] before }");
      }
      stripTrailingComma("}");
      if (stack.length > 0 && stack[stack.length - 1] === "{") stack.pop();
      out.push("}");
      i += 1;
      continue;
    }

    if (ch === "]") {
      stripTrailingComma("]");
      if (stack.length > 0 && stack[stack.length - 1] === "[") stack.pop();
      out.push("]");
      i += 1;
      continue;
    }

    if (ch === ":") {
      out.push(":");
      i += 1;
      const valueStart = peekNonWs(i);

      // Missing value: `"key":` then `}` / `]` / `,` / EOF
      if (valueStart >= source.length) {
        out.push(" null");
        repairs.push("inserted null for missing value");
        continue;
      }

      const next = source[valueStart];
      if (next === "}" || next === "]" || next === ",") {
        out.push(" null");
        repairs.push("inserted null for missing value");
        while (i < valueStart) {
          out.push(source[i]);
          i += 1;
        }
        continue;
      }

      // Missing value: `"key":` then another `"nextKey":`
      if (next === '"') {
        const str = readStringAt(valueStart);
        if (str) {
          const afterStr = peekNonWs(str.end + 1);
          if (afterStr < source.length && source[afterStr] === ":") {
            // Need a comma so the following property remains valid JSON.
            out.push(" null,");
            repairs.push("inserted null for missing value before next key");
            while (i < valueStart) {
              out.push(source[i]);
              i += 1;
            }
            continue;
          }
        }
      }

      continue;
    }

    if (matchBareLiteral(i, "undefined") || matchBareLiteral(i, "NaN")) {
      const literal = source.startsWith("undefined", i) ? "undefined" : "NaN";
      out.push("null");
      i += literal.length;
      repairs.push(`replaced ${literal} with null`);
      continue;
    }

    out.push(ch);
    i += 1;
  }

  // Close any still-open arrays/objects (best-effort)
  while (stack.length > 0) {
    const open = stack.pop();
    if (open === "[") {
      stripTrailingComma("]");
      out.push("]");
      repairs.push("inserted missing ] at end of input");
    } else {
      stripTrailingComma("}");
      out.push("}");
      repairs.push("inserted missing } at end of input");
    }
  }

  return { text: out.join(""), repairs };
};

export const parseJsonLenient = (text, label = "JSON") => {
  const { text: repairedText, repairs } = repairJsonText(text);
  try {
    return { data: JSON.parse(repairedText), repairs, repairedText };
  } catch (error) {
    const hint =
      repairs.length > 0
        ? ` (after ${repairs.length} repair attempt(s))`
        : "";
    throw new Error(`Failed to parse ${label}${hint}: ${error.message}`);
  }
};

const readJsonFile = (filePath, label = path.basename(filePath)) => {
  const raw = fs.readFileSync(filePath, "utf8");
  return parseJsonLenient(raw, label);
};

/** Classic list-changelog entries have this fixed nullable shape/key order. */
const CLASSIC_CHANGELOG_FIELDS = [
  "date",
  "currentName",
  "newName",
  "currentRank",
  "newRank",
  "below",
  "above",
  "variantAdded",
  "variantRemoved",
];

/**
 * Stable sort newest-to-oldest by `date` (YYYY-MM-DD strings).
 * Entries without a date sink to the end; original order is preserved
 * for equal dates and among dateless entries.
 */
export const sortChangelogNewestFirst = (entries) =>
  [...entries]
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const dateA = a.entry.date;
      const dateB = b.entry.date;
      if (dateA == null && dateB == null) return a.index - b.index;
      if (dateA == null) return 1;
      if (dateB == null) return -1;
      if (dateA !== dateB) return String(dateB).localeCompare(String(dateA));
      return a.index - b.index;
    })
    .map(({ entry }) => entry);

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

/** Classic timeline entries only — image proofs and web-post proof links. */
const TIMELINE_FIELD_ORDER = [
  "name",
  "player",
  "levelID",
  "date",
  "length",
  "version",
  "submitter",
  "video",
  "showcaseVideo",
  "image",
  "proof",
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
  "duplicateOf",
  "notes",
  "tags",
];

/** Platformer pending — same estimate/notes/duplicate support as classic pending. */
const PLATFORMER_PENDING_FIELD_ORDER = [
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

const LIST_CHANGELOG_FIELD_ORDER = CLASSIC_CHANGELOG_FIELDS;

const TIMELINE_CHANGELOG_FIELD_ORDER = [
  "date",
  "name",
  "timelineAdded",
  "timelineRemoved",
];

const MILESTONE_FIELD_ORDER = ["date", "list", "from", "to"];
const MILESTONE_LISTS = new Set(["classic", "platformer"]);

/** Spreadsheet / import column names → canonical schema keys. */
const FIELD_ALIASES = {
  Name: "name",
  Player: "player",
  "Level ID": "levelID",
  Date: "date",
  Length: "length",
  Version: "version",
  Submitter: "submitter",
  "Player Video": "video",
  "Showcase Video": "showcaseVideo",
};

export const applyFieldAliases = (entry) => {
  if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
    return entry;
  }

  const mapped = { ...entry };
  for (const [alias, canonical] of Object.entries(FIELD_ALIASES)) {
    if (!(alias in mapped)) continue;
    if (!(canonical in mapped) || mapped[canonical] == null || mapped[canonical] === "") {
      mapped[canonical] = mapped[alias];
    }
    delete mapped[alias];
  }
  return mapped;
};

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
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered === "undefined" || lowered === "null") return null;

  return trimmed;
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

/** Accepts a string or string[] of parent names. Multi-parent stays an array. */
export const normalizeDuplicateOfField = (value) => {
  if (value == null) return null;

  if (typeof value === "string") {
    return normalizeNonEmptyStringField(value);
  }

  if (Array.isArray(value)) {
    const seen = new Set();
    const parents = [];
    for (const item of value) {
      const name = normalizeNonEmptyStringField(item);
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      parents.push(name);
    }
    if (parents.length === 0) return null;
    if (parents.length === 1) return parents[0];
    return parents;
  }

  return null;
};

export const normalizeVideoField = (value) => {
  const normalized = normalizeNonEmptyStringField(value);
  if (!normalized) return null;
  return normalizeYouTubeUrl(normalized);
};

export const normalizeProofField = (value) => {
  const normalized = normalizeNonEmptyStringField(value);
  if (!normalized) return null;
  if (!/^https?:\/\//i.test(normalized)) return null;
  return normalized;
};

export const normalizeImageField = (value) => {
  const normalized = normalizeNonEmptyStringField(value);
  if (!normalized) return null;
  if (!/^https?:\/\//i.test(normalized)) return null;

  if (normalized.includes("github.com") && normalized.includes("/blob/")) {
    return normalized
      .replace("https://github.com/", "https://raw.githubusercontent.com/")
      .replace("/blob", "")
      .replace(/\?raw=true$/, "");
  }

  return normalized;
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

export const sortObjectKeys = (obj) => {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const sorted = {};
  for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
    sorted[key] = obj[key];
  }
  return sorted;
};

export const normalizeEntry = (entry, fieldOrder, tagOrder) => {
  entry = applyFieldAliases(entry);
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

    if (key === "duplicateOf") {
      result[key] = normalizeDuplicateOfField(entry.duplicateOf);
      continue;
    }

    if (key === "image" || key === "thumbnail") {
      result[key] = normalizeImageField(entry[key]);
      continue;
    }

    if (key === "proof") {
      result[key] = normalizeProofField(entry[key]);
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

    result[key] =
      typeof entry[key] === "string"
        ? normalizeNonEmptyStringField(entry[key])
        : entry[key];
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
    } else     if (key === "notes") {
      previous[key] = normalizeNotesField(entry.notes);
    } else if (key === "duplicateOf") {
      previous[key] = normalizeDuplicateOfField(entry.duplicateOf);
    } else if (key === "image") {
      previous[key] = normalizeImageField(entry[key]);
    } else if (key === "thumbnail") {
      previous[key] = entry[key];
    } else if (key === "proof") {
      previous[key] = normalizeProofField(entry[key]);
    } else if (VIDEO_FIELDS.includes(key)) {
      previous[key] = entry[key];
    } else if (ESTIMATE_FIELDS.has(key)) {
      previous[key] = entry[key];
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

const normalizeTimelineEntry = (entry) =>
  normalizeEntry(entry, TIMELINE_FIELD_ORDER, CLASSIC_TAGS);

const normalizePendingEntry = (entry) =>
  normalizeEntry(entry, PENDING_FIELD_ORDER, CLASSIC_TAGS);

const normalizePlatformerEntry = (entry) =>
  normalizeEntry(entry, PLATFORMER_FIELD_ORDER, PLATFORMER_TAGS);

const normalizePlatformerPendingEntry = (entry) =>
  normalizeEntry(entry, PLATFORMER_PENDING_FIELD_ORDER, PLATFORMER_TAGS);

const normalizeNonEmptyOrNull = (value) => {
  if (value == null) return null;
  if (typeof value === "string") {
    return normalizeNonEmptyStringField(value);
  }
  return value;
};

const normalizeRankOrNull = (value) => {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

export const normalizeListChangelogEntry = (entry) => {
  const source = entry && typeof entry === "object" ? entry : {};
  const normalized = {
    date: normalizeDateField(source.date),
    currentName: normalizeNonEmptyOrNull(
      source.currentName ?? source.nameFrom ?? null,
    ),
    newName: normalizeNonEmptyOrNull(source.newName ?? source.nameTo ?? null),
    currentRank: normalizeRankOrNull(
      source.currentRank ?? source.from ?? null,
    ),
    newRank: normalizeRankOrNull(source.newRank ?? source.to ?? null),
    below: normalizeNonEmptyOrNull(source.below),
    above: normalizeNonEmptyOrNull(source.above),
    variantAdded: normalizeNonEmptyOrNull(source.variantAdded),
    variantRemoved: normalizeNonEmptyOrNull(source.variantRemoved),
  };

  const previous = {};
  for (const key of LIST_CHANGELOG_FIELD_ORDER) {
    previous[key] = normalized[key];
  }

  const addedFields = LIST_CHANGELOG_FIELD_ORDER.filter(
    (key) => !(key in source),
  );
  const removedFields = Object.keys(source).filter(
    (key) => !LIST_CHANGELOG_FIELD_ORDER.includes(key),
  );
  const changed =
    addedFields.length > 0 ||
    removedFields.length > 0 ||
    LIST_CHANGELOG_FIELD_ORDER.some((key) => source[key] !== normalized[key]);

  return {
    entry: previous,
    changed,
    addedFields,
    removedFields,
    videoChanges: 0,
  };
};

export const normalizeTimelineChangelogEntry = (entry) => {
  const source = entry && typeof entry === "object" ? entry : {};
  const normalized = {
    date: normalizeDateField(source.date),
    name: normalizeNonEmptyOrNull(source.name),
    timelineAdded: normalizeDateField(source.timelineAdded),
    timelineRemoved: normalizeDateField(source.timelineRemoved),
  };

  const previous = {};
  for (const key of TIMELINE_CHANGELOG_FIELD_ORDER) {
    previous[key] = normalized[key];
  }

  const addedFields = TIMELINE_CHANGELOG_FIELD_ORDER.filter(
    (key) => !(key in source),
  );
  const removedFields = Object.keys(source).filter(
    (key) => !TIMELINE_CHANGELOG_FIELD_ORDER.includes(key),
  );
  const changed =
    addedFields.length > 0 ||
    removedFields.length > 0 ||
    TIMELINE_CHANGELOG_FIELD_ORDER.some(
      (key) => source[key] !== normalized[key],
    );

  return {
    entry: previous,
    changed,
    addedFields,
    removedFields,
    videoChanges: 0,
  };
};

export const normalizeMilestoneEntry = (entry) => {
  const source = entry && typeof entry === "object" ? entry : {};
  const rawList = normalizeNonEmptyOrNull(source.list);
  const list = MILESTONE_LISTS.has(rawList) ? rawList : null;
  const normalized = {
    date: normalizeDateField(source.date),
    list,
    from: normalizeNonEmptyOrNull(source.from),
    to: normalizeNonEmptyOrNull(source.to ?? source.baseline ?? null),
  };

  const previous = {};
  for (const key of MILESTONE_FIELD_ORDER) {
    previous[key] = normalized[key];
  }

  const addedFields = MILESTONE_FIELD_ORDER.filter((key) => !(key in source));
  const removedFields = Object.keys(source).filter(
    (key) => !MILESTONE_FIELD_ORDER.includes(key),
  );
  const changed =
    addedFields.length > 0 ||
    removedFields.length > 0 ||
    MILESTONE_FIELD_ORDER.some((key) => source[key] !== normalized[key]);

  return {
    entry: previous,
    changed,
    addedFields,
    removedFields,
    videoChanges: 0,
  };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = path.join(__dirname, "..", "data");

export const FILES = [
  { file: "achievements.json", normalize: normalizeClassicEntry },
  { file: "pending.json", normalize: normalizePendingEntry, sortByName: true },
  { file: "legacy.json", normalize: normalizeClassicEntry },
  { file: "timeline.json", normalize: normalizeTimelineEntry },
  { file: "platformers.json", normalize: normalizePlatformerEntry },
  { file: "platformerpending.json", normalize: normalizePlatformerPendingEntry, sortByName: true },
  { file: "platformertimeline.json", normalize: normalizePlatformerEntry },
  {
    file: "classicchangelog.json",
    normalize: normalizeListChangelogEntry,
    sortNewestFirst: true,
  },
  {
    file: "milestones.json",
    normalize: normalizeMilestoneEntry,
    sortNewestFirst: true,
  },
  {
    file: "platformerchangelog.json",
    normalize: normalizeListChangelogEntry,
    sortNewestFirst: true,
  },
  {
    file: "timelinechangelog.json",
    normalize: normalizeTimelineChangelogEntry,
    sortNewestFirst: true,
  },
];

/** Plain object maps (not entry arrays). Keys are sorted alphabetically on write. */
export const OBJECT_FILES = [
  { file: "playercountries.json", sortKeys: true },
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

  for (const {
    file,
    normalize,
    sortByName = false,
    sortNewestFirst = false,
  } of FILES) {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipped ${file} (not found)`);
      continue;
    }

    const { data: entries, repairs } = readJsonFile(filePath, file);
    if (!Array.isArray(entries)) {
      console.warn(`Skipped ${file} (expected an array)`);
      continue;
    }

    const results = entries.map(normalize);
    let normalized = results.map((result) => result.entry);
    const summary = summarize(results);

    let orderChanged = false;
    if (sortByName) {
      const namesBefore = normalized.map((entry) => entry.name).join("\0");
      normalized = sortEntriesByName(normalized);
      orderChanged =
        namesBefore !== normalized.map((entry) => entry.name).join("\0");
    } else if (sortNewestFirst) {
      const before = JSON.stringify(normalized);
      normalized = sortChangelogNewestFirst(normalized);
      orderChanged = before !== JSON.stringify(normalized);
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
    if (repairs.length > 0) {
      console.log(`  json repairs: ${repairs.length}`);
      for (const repair of repairs) {
        console.log(`    - ${repair}`);
      }
    }
    if (sortByName || sortNewestFirst) {
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

    const { data, repairs } = readJsonFile(filePath, file);
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
    if (repairs.length > 0) {
      console.log(`  json repairs: ${repairs.length}`);
      for (const repair of repairs) {
        console.log(`    - ${repair}`);
      }
    }
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
