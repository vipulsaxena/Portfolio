#!/usr/bin/env node
/**
 * Copy-only migration: Resource/ → site/assets/
 * Reads from ../Resource or site/Resource symlink. Never writes to Resource/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, "..");
const RESOURCE_ROOT = path.resolve(SITE_ROOT, "../Resource");
const ASSETS_ROOT = path.join(SITE_ROOT, "assets");
const REPLACEMENTS_FILE = path.join(__dirname, "summary2-path-replacements.json");

/** @type {Record<string, { out: string, action: 'reuse' | 'copy' | 'process', maxEdge?: number, quality?: number, lossless?: boolean }>} */
const MAPPING = {
  // ── Hero bento (2400px, q96 — retina + hover/press zoom headroom) ───────────
  "Resource/Branding journey/Raisin_Logo_RGB/RGB/SVG/Raisin_Logo_White_RGB.svg": {
    out: "assets/img/branding/raisin-logo-white.svg",
    action: "copy",
  },
  "Resource/Extracts/iPhone 17 Pro mockup on a pink round table (Mockuuups Studio).jpg": {
    out: "assets/img/hero-bento/iphone-17-pink-table.webp",
    action: "process",
    maxEdge: 2400,
    quality: 96,
  },
  "Resource/Extracts/Free MacBook Pro mockup on round table (Mockuuups Studio).jpg": {
    out: "assets/img/hero-bento/macbook-round-table.webp",
    action: "process",
    maxEdge: 2400,
    quality: 96,
  },
  "Resource/Extracts/Free Rock iPhone 15 Pro Mockup (Mockuuups Studio).png": {
    out: "assets/img/hero-bento/rock-iphone-15.webp",
    action: "process",
    maxEdge: 2400,
    quality: 96,
  },
  "Resource/Extracts/Free Clean desk with Dell display mockup (Mockuuups Studio).jpg": {
    out: "assets/img/hero-bento/dell-desk.webp",
    action: "process",
    maxEdge: 2400,
    quality: 96,
  },
  "Resource/Extracts/Free mockup of man pointing on iPad (Mockuuups Studio).jpg": {
    out: "assets/img/hero-bento/ipad-pointing.webp",
    action: "process",
    maxEdge: 2400,
    quality: 96,
  },
  "Resource/Extracts/Free Smartphone Mockup with Credit Card Terminal (Mockuuups Studio).jpg": {
    out: "assets/img/hero-bento/smartphone-terminal.webp",
    action: "process",
    maxEdge: 1920,
    quality: 85,
  },

  // ── Branding / Koto ───────────────────────────────────────────────────────
  "Resource/Branding journey/Branding(Koto)/32.png": {
    out: "assets/img/branding/koto-32.webp",
    action: "process",
    maxEdge: 1920,
    lossless: true,
  },
  "Resource/Branding journey/Branding(Koto)/41.png": {
    out: "assets/img/branding/koto-41.webp",
    action: "process",
    maxEdge: 1920,
    lossless: true,
  },
  "Resource/Branding journey/Branding(Koto)/54.png": {
    out: "assets/img/branding/koto-54.webp",
    action: "process",
    maxEdge: 1920,
    lossless: true,
  },

  // ── Proof of old world (2400px lightbox) ──────────────────────────────────
  "Resource/proof-of-old-world/dashboard-mobile-email/old dashbaord.jpg": {
    out: "assets/img/proof/old-dashboard.jpg.webp",
    action: "process",
    maxEdge: 2400,
    quality: 90,
  },
  "Resource/proof-of-old-world/dashboard-mobile-email/Pull to refresh.png": {
    out: "assets/img/proof/pull-to-refresh.webp",
    action: "process",
    maxEdge: 2400,
    lossless: true,
  },
  "Resource/proof-of-old-world/dashboard-mobile-email/email.png": {
    out: "assets/img/proof/email.webp",
    action: "process",
    maxEdge: 2400,
    lossless: true,
  },
  "Resource/proof-of-old-world/sketch_tofigma.png": {
    out: "assets/img/proof/sketch-to-figma.webp",
    action: "process",
    maxEdge: 2400,
    lossless: true,
  },
  "Resource/proof-of-old-world/scramble.png": {
    out: "assets/img/proof/scramble.webp",
    action: "process",
    maxEdge: 2400,
    lossless: true,
  },
  "Resource/proof-of-old-world/solo.png": {
    out: "assets/img/proof/solo.webp",
    action: "process",
    maxEdge: 2400,
    lossless: true,
  },
  "Resource/proof-of-old-world/dash_new.png": {
    out: "assets/img/proof/dash-new.webp",
    action: "process",
    maxEdge: 2400,
    lossless: true,
  },
  "Resource/proof-of-old-world/dash_old.png": {
    out: "assets/img/proof/dash-old.webp",
    action: "process",
    maxEdge: 2400,
    lossless: true,
  },
  "Resource/proof-of-old-world/01HNW.png": {
    out: "assets/img/proof/persona-hnw.webp",
    action: "process",
    maxEdge: 1920,
    lossless: true,
  },
  "Resource/proof-of-old-world/02AF.png": {
    out: "assets/img/proof/persona-affluent.webp",
    action: "process",
    maxEdge: 1920,
    lossless: true,
  },
  "Resource/proof-of-old-world/03AY.png": {
    out: "assets/img/proof/persona-affluent-young.webp",
    action: "process",
    maxEdge: 1920,
    lossless: true,
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  "Resource/Dashboard/Web Dashboard/Color Map light.jpg": {
    out: "assets/img/dashboard-web/color-map-light.webp",
    action: "process",
    maxEdge: 2400,
    quality: 90,
  },
  "Resource/Dashboard/Mobile App/Research data/mobile_research.png": {
    out: "assets/img/dashboard-mobile/mobile-research.webp",
    action: "process",
    maxEdge: 2400,
    lossless: true,
  },
  "Resource/Dashboard/Mobile App/Research data/compare.png": {
    out: "assets/img/dashboard-mobile/compare.webp",
    action: "process",
    maxEdge: 2400,
    lossless: true,
  },
  "Resource/Dashboard/Mobile App/Research data/maze-report.png": {
    out: "assets/img/dashboard-mobile/maze-report.webp",
    action: "process",
    maxEdge: 2400,
    lossless: true,
  },
  "Resource/Extracts/Multi-mocks/new dashboard multiple mocks.png": {
    out: "assets/img/dashboard-mobile/multi-mocks.webp",
    action: "process",
    maxEdge: 2400,
    lossless: true,
  },
  "Resource/Extracts/Free Isometric Samsung Galaxy S26 Mockup (Mockuuups Studio).png": {
    out: "assets/img/dashboard-mobile/samsung-earnings-mockup.webp",
    action: "process",
    maxEdge: 800,
    lossless: true,
  },

  // ── 4-tabs (native size, lossless) ────────────────────────────────────────
  "Resource/Extracts/4 tabs/d1.png": { out: "assets/img/dashboard-mobile/tabs/d1.webp", action: "process", lossless: true },
  "Resource/Extracts/4 tabs/d2.png": { out: "assets/img/dashboard-mobile/tabs/d2.webp", action: "process", lossless: true },
  "Resource/Extracts/4 tabs/d3.png": { out: "assets/img/dashboard-mobile/tabs/d3.webp", action: "process", lossless: true },
  "Resource/Extracts/4 tabs/d4.png": { out: "assets/img/dashboard-mobile/tabs/d4.webp", action: "process", lossless: true },
  "Resource/Extracts/4 tabs/l1.png": { out: "assets/img/dashboard-mobile/tabs/l1.webp", action: "process", lossless: true },
  "Resource/Extracts/4 tabs/l2.png": { out: "assets/img/dashboard-mobile/tabs/l2.webp", action: "process", lossless: true },
  "Resource/Extracts/4 tabs/l3.png": { out: "assets/img/dashboard-mobile/tabs/l3.webp", action: "process", lossless: true },
  "Resource/Extracts/4 tabs/l4.png": { out: "assets/img/dashboard-mobile/tabs/l4.webp", action: "process", lossless: true },

  // ── WoW — reuse existing optimized PNGs ───────────────────────────────────
  "Resource/Ways of Working initiative/Cover Component.png": {
    out: "assets/img/wow/cover-component.png",
    action: "reuse",
  },
  "Resource/Ways of Working initiative/Discovery and collaboartion tools.png": {
    out: "assets/img/wow/discovery-tools.png",
    action: "reuse",
  },
  "Resource/Ways of Working initiative/Page setup.png": {
    out: "assets/img/wow/page-setup.png",
    action: "reuse",
  },
  "Resource/Ways of Working initiative/Tables and links.png": {
    out: "assets/img/wow/tables-links.png",
    action: "reuse",
  },
  "Resource/Ways of Working initiative/Status quo.png": {
    out: "assets/img/wow/status-quo.png",
    action: "reuse",
  },
  "Resource/Ways of Working initiative/Stickers.png": {
    out: "assets/img/wow/stickers.png",
    action: "reuse",
  },
  "Resource/Ways of Working initiative/Presentation/Ways of Working Figma02.jpg": {
    out: "assets/img/wow/figma-02.webp",
    action: "process",
    maxEdge: 1920,
    quality: 90,
  },
  "Resource/Ways of Working initiative/Presentation/Ways of Working Figma03.jpg": {
    out: "assets/img/wow/figma-03.webp",
    action: "process",
    maxEdge: 1920,
    quality: 90,
  },
  "Resource/Ways of Working initiative/Presentation/Ways of Working Figma04.jpg": {
    out: "assets/img/wow/figma-04.webp",
    action: "process",
    maxEdge: 1920,
    quality: 90,
  },
  "Resource/Ways of Working initiative/Presentation/Ways of Working Figma05.jpg": {
    out: "assets/img/wow/figma-05.webp",
    action: "process",
    maxEdge: 1920,
    quality: 90,
  },
  "Resource/Ways of Working initiative/Presentation/wow_Workshop.png": {
    out: "assets/img/wow/workshop.webp",
    action: "process",
    maxEdge: 1920,
    lossless: true,
  },
  "Resource/Ways of Working initiative/Presentation/wow_Workshop07.png": {
    out: "assets/img/wow/workshop-07.webp",
    action: "process",
    maxEdge: 1920,
    lossless: true,
  },

  // ── Prototyping carousel (1920px) ─────────────────────────────────────────
  "Resource/Principal of prototyping/Principal of Prototyping.jpg": {
    out: "assets/img/prototyping/principal-of-prototyping.webp",
    action: "process",
    maxEdge: 1920,
    quality: 90,
  },
  "Resource/Principal of prototyping/slide-2.jpg": { out: "assets/img/prototyping/slide-2.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/slide-3.jpg": { out: "assets/img/prototyping/slide-3.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/slide-4.jpg": { out: "assets/img/prototyping/slide-4.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/slide-5.jpg": { out: "assets/img/prototyping/slide-5.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/slide-6.jpg": { out: "assets/img/prototyping/slide-6.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/slide-7.jpg": { out: "assets/img/prototyping/slide-7.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/slide-8.jpg": { out: "assets/img/prototyping/slide-8.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/slide-12.jpg": { out: "assets/img/prototyping/slide-12.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/Figma-make/Slide 16_9 - 1.jpg": { out: "assets/img/prototyping/figma-make-01.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/Figma-make/Slide 16_9 - 2.jpg": { out: "assets/img/prototyping/figma-make-02.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/Figma-make/Slide 16_9 - 4.jpg": { out: "assets/img/prototyping/figma-make-04.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/Figma-make/Slide 16_9 - 5.jpg": { out: "assets/img/prototyping/figma-make-05.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/Figma-make/Slide 16_9 - 6.jpg": { out: "assets/img/prototyping/figma-make-06.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/Figma-make/Slide 16_9 - 7.jpg": { out: "assets/img/prototyping/figma-make-07.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/Figma-make/Slide 16_9 - 8.jpg": { out: "assets/img/prototyping/figma-make-08.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/Figma-make/Slide 16_9 - 9.jpg": { out: "assets/img/prototyping/figma-make-09.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/Figma-make/Slide 16_9 - 11.jpg": { out: "assets/img/prototyping/figma-make-11.webp", action: "process", maxEdge: 1920, quality: 90 },
  "Resource/Principal of prototyping/Figma-make/Slide 16_9 - 12.jpg": { out: "assets/img/prototyping/figma-make-12.webp", action: "process", maxEdge: 1920, quality: 90 },

  // ── Brand / wrapped / deposits ────────────────────────────────────────────
  "Resource/Wrapped/IPP.png": {
    out: "assets/img/brand/wrapped-ipp.webp",
    action: "process",
    maxEdge: 1920,
    lossless: true,
  },
  "Resource/Wrapped/Top Banks.png": {
    out: "assets/img/brand/wrapped-3-top-banks.png",
    action: "reuse",
  },
  "Resource/all deposits/All Deposits.png": {
    out: "assets/img/brand/all-deposits.webp",
    action: "process",
    maxEdge: 2400,
    lossless: true,
  },
  "Resource/all deposits/Category.png": {
    out: "assets/img/brand/deposits-category.webp",
    action: "process",
    maxEdge: 2400,
    lossless: true,
  },
  "Resource/iso_dash.png": {
    out: "assets/img/brand/iso-dash.webp",
    action: "process",
    maxEdge: 3200,
    lossless: true,
  },
  "Resource/emails.png": {
    out: "assets/img/emails/overview.webp",
    action: "process",
    maxEdge: 1920,
    lossless: true,
  },

  // ── Vision / AI ───────────────────────────────────────────────────────────
  "Resource/Raisin Vision/Slide@2x.png": {
    out: "assets/img/vision/cura-bg.webp",
    action: "process",
    maxEdge: 1920,
    quality: 85,
  },
  "Resource/AI Enablement/Adobe Express - file.png": {
    out: "assets/img/ai-enablement/program-overview.webp",
    action: "process",
    maxEdge: 1600,
    lossless: true,
  },
  "Resource/AI Enablement/4 tools /workflow.webp": {
    out: "assets/img/ai-enablement/workflow.webp",
    action: "copy",
  },
  "Resource/AI Enablement/4 tools /tool-1.jpg": {
    out: "assets/img/ai-enablement/tool-1.webp",
    action: "process",
    lossless: true,
  },
  "Resource/AI Enablement/4 tools /tool-2.jpg": {
    out: "assets/img/ai-enablement/tool-2.webp",
    action: "process",
    lossless: true,
  },
  "Resource/AI Enablement/4 tools /tool-3.jpg": {
    out: "assets/img/ai-enablement/tool-3.webp",
    action: "process",
    lossless: true,
  },
  "Resource/AI Enablement/4 tools /tool-4.jpg": {
    out: "assets/img/ai-enablement/tool-4.webp",
    action: "process",
    lossless: true,
  },

  // ── Video (converted separately; mapping for HTML replace) ────────────────
  "Resource/proof-of-old-world/wireframe_solution.mov": {
    out: "assets/video/proof/wireframe-solution.mp4",
    action: "reuse",
  },
};

function resourcePath(resourceKey) {
  const rel = resourceKey.replace(/^Resource\//, "");
  const viaSymlink = path.join(SITE_ROOT, "Resource", rel);
  const direct = path.join(RESOURCE_ROOT, rel);
  if (fs.existsSync(viaSymlink)) return viaSymlink;
  if (fs.existsSync(direct)) return direct;
  return viaSymlink;
}

function assertSafeOutput(outRel) {
  const abs = path.resolve(SITE_ROOT, outRel);
  if (abs.includes(path.resolve(RESOURCE_ROOT))) {
    throw new Error(`Refusing to write into Resource: ${outRel}`);
  }
  if (!abs.startsWith(ASSETS_ROOT)) {
    throw new Error(`Output must be under site/assets: ${outRel}`);
  }
  return abs;
}

function fmtBytes(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

async function processImage(srcAbs, destAbs, opts) {
  let pipeline = sharp(srcAbs);
  const meta = await pipeline.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const maxEdge = opts.maxEdge;

  if (maxEdge && Math.max(w, h) > maxEdge) {
    if (w >= h) {
      pipeline = pipeline.resize({ width: maxEdge, withoutEnlargement: true });
    } else {
      pipeline = pipeline.resize({ height: maxEdge, withoutEnlargement: true });
    }
  }

  if (opts.lossless) {
    pipeline = pipeline.webp({ lossless: true, effort: 6 });
  } else {
    pipeline = pipeline.webp({ quality: opts.quality ?? 90, effort: 6 });
  }

  await pipeline.toFile(destAbs);
  const outMeta = await sharp(destAbs).metadata();
  return { width: outMeta.width, height: outMeta.height };
}

async function main() {
  const force = process.argv.includes("--force");
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const onlyFilter = onlyArg ? onlyArg.slice("--only=".length) : null;

  let existing = { replacements: {}, dimensions: {} };
  if (fs.existsSync(REPLACEMENTS_FILE)) {
    existing = JSON.parse(fs.readFileSync(REPLACEMENTS_FILE, "utf8"));
  }

  const replacements = { ...existing.replacements };
  const dimensions = { ...existing.dimensions };
  let processed = 0;
  let skipped = 0;
  let reused = 0;
  let totalIn = 0;
  let totalOut = 0;

  for (const [resourceKey, spec] of Object.entries(MAPPING)) {
    const outRel = spec.out;
    if (onlyFilter && !outRel.includes(onlyFilter)) continue;
    replacements[resourceKey] = outRel;
    assertSafeOutput(outRel);
    const destAbs = path.join(SITE_ROOT, outRel);

    if (spec.action === "reuse") {
      const targetAbs = path.join(SITE_ROOT, outRel);
      if (!fs.existsSync(targetAbs)) {
        console.error(`REUSE missing: ${outRel}`);
        process.exitCode = 1;
        continue;
      }
      reused++;
      console.log(`REUSE  ${resourceKey} → ${outRel}`);
      continue;
    }

    const srcAbs = resourcePath(resourceKey);
    if (!fs.existsSync(srcAbs)) {
      console.error(`MISSING source: ${resourceKey} (${srcAbs})`);
      process.exitCode = 1;
      continue;
    }

    const srcStat = fs.statSync(srcAbs);
    totalIn += srcStat.size;

    if (spec.action === "copy") {
      fs.mkdirSync(path.dirname(destAbs), { recursive: true });
      if (!force && fs.existsSync(destAbs) && fs.statSync(destAbs).mtimeMs >= srcStat.mtimeMs) {
        skipped++;
        console.log(`SKIP   ${path.basename(destAbs)} (up to date)`);
      } else {
        fs.copyFileSync(srcAbs, destAbs);
        processed++;
        const outStat = fs.statSync(destAbs);
        totalOut += outStat.size;
        console.log(`COPY   ${fmtBytes(srcStat.size)} → ${fmtBytes(outStat.size)}  ${outRel}`);
      }
      continue;
    }

    if (spec.action === "process") {
      fs.mkdirSync(path.dirname(destAbs), { recursive: true });
      if (!force && fs.existsSync(destAbs) && fs.statSync(destAbs).mtimeMs >= srcStat.mtimeMs) {
        skipped++;
        const outMeta = await sharp(destAbs).metadata();
        dimensions[outRel] = { width: outMeta.width, height: outMeta.height };
        console.log(`SKIP   ${path.basename(destAbs)} (up to date)`);
        continue;
      }
      const dims = await processImage(srcAbs, destAbs, spec);
      dimensions[outRel] = dims;
      const outStat = fs.statSync(destAbs);
      totalOut += outStat.size;
      processed++;
      console.log(
        `PROC   ${fmtBytes(srcStat.size)} → ${fmtBytes(outStat.size)}  ${dims.width}x${dims.height}  ${outRel}`
      );
    }
  }

  fs.writeFileSync(
    REPLACEMENTS_FILE,
    JSON.stringify({ replacements, dimensions }, null, 2)
  );

  console.log("\n── Summary ──");
  console.log(`Processed: ${processed}  Reused: ${reused}  Skipped: ${skipped}`);
  console.log(`Input processed: ${fmtBytes(totalIn)}  Output written: ${fmtBytes(totalOut)}`);
  console.log(`Replacements written to ${REPLACEMENTS_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
