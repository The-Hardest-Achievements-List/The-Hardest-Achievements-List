import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const timelinePath = path.join(__dirname, "..", "data", "timeline.json");
const proofDir = path.join(__dirname, "..", "images", "proofs");

const GITHUB_BASE =
  "https://raw.githubusercontent.com/The-Hardest-Achievements-List/The-Hardest-Achievements-List/refs/heads/main/images/proofs/";

const FILE_ALIASES = {
  "cataclysm (old) 71%": "Cataclysm (Old) 71%.png",
};

const files = fs.readdirSync(proofDir).filter((name) => !name.startsWith("."));
const fileByBase = new Map(
  files.map((file) => [file.replace(/\.[^.]+$/, "").toLowerCase(), file]),
);

const toGithubProofUrl = (entryName) => {
  const key = entryName.trim().toLowerCase();
  const filename =
    FILE_ALIASES[key] ?? fileByBase.get(key) ?? `${entryName}.png`;
  return `${GITHUB_BASE}${encodeURIComponent(filename).replace(/%20/g, "%20")}`;
};

const timeline = JSON.parse(fs.readFileSync(timelinePath, "utf8"));

const updated = timeline.map((entry) => {
  if (entry.image !== "local" && entry.image !== "local image" && entry.image !== "Local image") {
    return entry;
  }

  const fileKey = entry.name.trim().toLowerCase();
  const hasFile = FILE_ALIASES[fileKey] || fileByBase.has(fileKey);

  return {
    ...entry,
    image: hasFile ? toGithubProofUrl(entry.name) : null,
  };
});

fs.writeFileSync(timelinePath, `${JSON.stringify(updated, null, 2)}\n`);
console.log(
  "Updated",
  updated.filter((e) => e.image?.includes("images/proofs")).length,
  "image URLs",
);
