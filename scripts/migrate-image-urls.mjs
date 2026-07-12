import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");

const REPO = "The-Hardest-Achievements-List/The-Hardest-Achievements-List";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/refs/heads/main/`;
const THUMB_BASE = `${RAW_BASE}images/thumbnails/`;

const THAL_COMMIT_THUMB_RE =
  /https?:\/\/(?:raw\.githubusercontent\.com|github\.com)\/The-Hardest-Achievements-List\/The-Hardest-Achievements-List\/[0-9a-f]{40}\/(?:images\/)?thumbnails\/([^?"'\s]+)(?:\?raw=true)?/gi;

const rewriteString = (value) => {
  if (typeof value !== "string") return value;

  let next = value
    .replace(/\/refs\/heads\/main\/thumbnails\//g, "/refs/heads/main/images/thumbnails/")
    .replace(/\/blob\/main\/thumbnails\//g, "/blob/main/images/thumbnails/")
    .replace(/\/refs\/heads\/main\/proofs\//g, "/refs/heads/main/images/proofs/");

  next = next.replace(
    /https:\/\/github\.com\/AncepsGD\/the-hardest-achievements-list\/blob\/main\//gi,
    RAW_BASE,
  );
  next = next.replace(
    /https:\/\/raw\.githubusercontent\.com\/AncepsGD\/the-hardest-achievements-list\/refs\/heads\/main\//gi,
    RAW_BASE,
  );

  next = next.replace(
    THAL_COMMIT_THUMB_RE,
    (_, encodedFile) => `${THUMB_BASE}${encodedFile}`,
  );

  if (next.includes("github.com") && next.includes("/blob/")) {
    next = next
      .replace("https://github.com/", "https://raw.githubusercontent.com/")
      .replace("/blob/main/", "/refs/heads/main/")
      .replace(/\?raw=true$/, "");
  }

  return next;
};

const walk = (value) => {
  if (typeof value === "string") return rewriteString(value);
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, entryValue] of Object.entries(value)) {
      out[key] = walk(entryValue);
    }
    return out;
  }
  return value;
};

for (const file of fs.readdirSync(dataDir).filter((name) => name.endsWith(".json"))) {
  const fullPath = path.join(dataDir, file);
  const raw = fs.readFileSync(fullPath, "utf8");
  const data = JSON.parse(raw);
  const updated = walk(data);
  const out = `${JSON.stringify(updated, null, 2)}\n`;
  if (out !== raw) {
    fs.writeFileSync(fullPath, out);
    console.log(`Updated ${file}`);
  }
}
