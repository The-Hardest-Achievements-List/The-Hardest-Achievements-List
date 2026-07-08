import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeYouTubeUrl } from "../src/utils/format.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");

const VIDEO_FIELDS = ["video", "showcaseVideo"];

const FILES = [
  "achievements.json",
  "pending.json",
  "timeline.json",
  "platformers.json",
  "platformerpending.json",
  "platformertimeline.json",
];

const normalizeEntryVideos = (entry) => {
  let changed = false;
  const next = { ...entry };

  for (const field of VIDEO_FIELDS) {
    if (typeof next[field] !== "string") continue;
    const normalized = normalizeYouTubeUrl(next[field]);
    if (normalized !== next[field]) {
      next[field] = normalized;
      changed = true;
    }
  }

  return { entry: next, changed };
};

let totalChanged = 0;

for (const file of FILES) {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`Skipped ${file} (not found)`);
    continue;
  }

  const entries = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let fileChanged = 0;

  const normalized = entries.map((entry) => {
    const { entry: nextEntry, changed } = normalizeEntryVideos(entry);
    if (changed) fileChanged += 1;
    return nextEntry;
  });

  if (fileChanged > 0) {
    fs.writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`);
    totalChanged += fileChanged;
  }

  console.log(
    `Processed ${file}: ${normalized.length} entries, ${fileChanged} updated`,
  );
}

console.log(`Done. ${totalChanged} entries had YouTube links normalized.`);
