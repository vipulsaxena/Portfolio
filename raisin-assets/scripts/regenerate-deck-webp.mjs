#!/usr/bin/env node
/**
 * Regenerate deck/case-study WebP from _sources masters (quality 86, effort 6).
 * Safe to re-run; skips when WebP is newer than source unless --force.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAAIN = path.resolve(__dirname, "..");
const SOURCES = path.join(RAAIN, "_sources");

/** @type {{ src: string, out: string, maxEdge?: number, lossless?: boolean }[]} */
const JOBS = [
  { src: "dashboard-web/img/anatomy.png", out: "assets/img/dashboard-web/anatomy.webp" },
  { src: "dashboard-web/img/color_map.png", out: "assets/img/dashboard-web/color_map.webp" },
  { src: "dashboard-web/img/comp.png", out: "assets/img/dashboard-web/comp.webp" },
  { src: "dashboard-web/img/design_system.png", out: "assets/img/dashboard-web/design_system.webp" },
  { src: "dashboard-web/img/discovery.png", out: "assets/img/dashboard-web/discovery.webp" },
  { src: "dashboard-web/img/early-sketch.png", out: "assets/img/dashboard-web/early-sketch.webp" },
  { src: "dashboard-web/img/final_vd.png", out: "assets/img/dashboard-web/final_vd.webp" },
  { src: "dashboard-web/img/final_vd_full.png", out: "assets/img/dashboard-web/final_vd_full.webp" },
  { src: "dashboard-web/img/quote.png", out: "assets/img/dashboard-web/quote.webp" },
  { src: "dashboard-web/img/research-output.png", out: "assets/img/dashboard-web/research-output.webp" },
  { src: "dashboard-web/img/stake_comp.png", out: "assets/img/dashboard-web/stake_comp.webp" },
  { src: "dashboard-web/img/ab-test.png", out: "assets/img/dashboard-web/ab-test.webp" },
  { src: "proof/dash-new.png", out: "assets/img/proof/dash-new.webp" },
];

const QUALITY = 86;
const force = process.argv.includes("--force");

function fmtBytes(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

async function toWebp(srcAbs, destAbs, opts) {
  let pipeline = sharp(srcAbs);
  const meta = await pipeline.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const maxEdge = opts.maxEdge;
  if (maxEdge && Math.max(w, h) > maxEdge) {
    pipeline =
      w >= h
        ? pipeline.resize({ width: maxEdge, withoutEnlargement: true })
        : pipeline.resize({ height: maxEdge, withoutEnlargement: true });
  }
  if (opts.lossless) {
    await pipeline.webp({ lossless: true, effort: 6 }).toFile(destAbs);
  } else {
    await pipeline.webp({ quality: QUALITY, effort: 6 }).toFile(destAbs);
  }
}

async function main() {
  let done = 0;
  let skip = 0;
  for (const job of JOBS) {
    const srcAbs = path.join(SOURCES, job.src);
    const destAbs = path.join(RAAIN, job.out);
    if (!fs.existsSync(srcAbs)) {
      console.warn(`SKIP (no source) ${job.src}`);
      skip++;
      continue;
    }
    const srcM = fs.statSync(srcAbs).mtimeMs;
    if (!force && fs.existsSync(destAbs) && fs.statSync(destAbs).mtimeMs >= srcM) {
      console.log(`SKIP (up to date) ${path.basename(destAbs)}`);
      skip++;
      continue;
    }
    fs.mkdirSync(path.dirname(destAbs), { recursive: true });
    await toWebp(srcAbs, destAbs, job);
    const inS = fs.statSync(srcAbs).size;
    const outS = fs.statSync(destAbs).size;
    console.log(`OK   ${job.src} → ${job.out}  ${fmtBytes(inS)} → ${fmtBytes(outS)}`);
    done++;
  }
  console.log(`\nDone: ${done}  Skipped: ${skip}  (quality ${QUALITY}, effort 6)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});