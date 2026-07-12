import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const timelinePath = path.join(__dirname, "..", "data", "timeline.json");

const FIELD_ORDER = [
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

const isImageProofUrl = (url) => {
  if (typeof url !== "string" || !url.trim()) return false;
  if (/images\/proofs\//i.test(url)) return true;
  return /\.(png|jpe?g|gif|webp|avif|svg)(?:$|\?|#)/i.test(url);
};

const timeline = JSON.parse(fs.readFileSync(timelinePath, "utf8"));

const updated = timeline.map((entry) => {
  let image = entry.image ?? null;
  let proof = entry.proof ?? null;

  if (proof && isImageProofUrl(proof)) {
    image = proof;
    proof = null;
  }

  const next = {};
  for (const key of FIELD_ORDER) {
    if (key === "image") next[key] = image;
    else if (key === "proof") next[key] = proof;
    else next[key] = entry[key] ?? (key === "tags" ? [] : null);
  }
  return next;
});

fs.writeFileSync(timelinePath, `${JSON.stringify(updated, null, 2)}\n`);
console.log(
  "image:",
  updated.filter((e) => e.image).length,
  "proof:",
  updated.filter((e) => e.proof).length,
);
