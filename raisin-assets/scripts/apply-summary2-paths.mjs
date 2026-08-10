#!/usr/bin/env node
/**
 * Apply path replacements to summary2.html from summary2-path-replacements.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, "..");
const HTML_PATH = path.join(SITE_ROOT, "summary2.html");
const REPLACEMENTS_PATH = path.join(__dirname, "summary2-path-replacements.json");

const { replacements, dimensions } = JSON.parse(fs.readFileSync(REPLACEMENTS_PATH, "utf8"));

let html = fs.readFileSync(HTML_PATH, "utf8");
let count = 0;

for (const [resourceKey, outPath] of Object.entries(replacements)) {
  const encoded = resourceKey.split("/").map(encodeURIComponent).join("/").replace(/%20/g, "%20");
  // encodeURIComponent encodes spaces as %20 but also encodes parens etc - match HTML style
  const htmlEncoded = "Resource/" + resourceKey.slice("Resource/".length)
    .split("/")
    .map((seg) => seg.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/@/g, "%40"))
    .join("/");

  const variants = new Set([
    resourceKey,
    htmlEncoded,
    resourceKey.replace(/ /g, "%20"),
  ]);

  for (const from of variants) {
    const before = html;
    html = html.split(from).join(outPath);
    if (html !== before) count += (before.split(from).length - 1);
  }
}

// Update width/height on migrated images where we have dimensions
for (const [outPath, dims] of Object.entries(dimensions)) {
  const { width, height } = dims;
  const escaped = outPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `(src="${escaped}")([^>]*?)width="\\d+"\\s+height="\\d+"`,
    "g"
  );
  html = html.replace(re, `$1$2width="${width}" height="${height}"`);

  const re2 = new RegExp(
    `(src="${escaped}")((?![^>]*width=)[^>]*)>`,
    "g"
  );
  // Only add dimensions to hero/carousel imgs that had them - skip for now if complex
}

fs.writeFileSync(HTML_PATH, html);
console.log(`Updated ${HTML_PATH}: ${count} replacements applied`);

const remaining = (html.match(/Resource\//g) || []).length;
console.log(`Remaining Resource/ refs: ${remaining}`);
if (remaining > 0) {
  const lines = html.split("\n");
  lines.forEach((line, i) => {
    if (line.includes("Resource/")) console.log(`  L${i + 1}: ${line.trim().slice(0, 120)}`);
  });
  process.exitCode = 1;
}
