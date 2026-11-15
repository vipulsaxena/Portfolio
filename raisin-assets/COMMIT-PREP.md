# Commit prep — Raisin deck (Nov 2026)

Use this checklist before your manual commit to `gh-pages`.

## What’s in this change

| Area | Files |
|------|--------|
| Deck | `raisin-presentation.html`, `js/raisin-present.js`, `js/portfolio-lightbox.js` |
| Case study | `raisin.html`, `raisin-assets/assets/js/summary2.js`, `raisin-assets/assets/css/summary2.css` |
| Media | `raisin-assets/assets/img/**`, `raisin-assets/assets/video/**` (WebP + MP4 only in tree) |
| Tooling | `raisin-assets/scripts/regenerate-deck-webp.mjs`, `_sources/README.md` |

## Suggested commit message

```
Raisin deck: Wealth Hub + mobile journey polish, substeps, and assets

Presentation deck substeps (3.4/7.5, 14.1/14.2), validation/mobile launch copy,
lightbox + layout fixes; regenerate dashboard webp and ship mp4-only video paths.
```

## Pre-flight

1. **Hard-refresh** `raisin-presentation.html` — spot-check slides **3.4**, **7.4/7.5**, **14.1/14.2**, **15**, **17**, counter **/25**.
2. **Regenerate WebP** if you changed any PNG in `_sources/`:
   ```bash
   cd raisin-assets/scripts && node regenerate-deck-webp.mjs --force
   ```
3. Bump `?v=` on any asset you replaced if CDN/browser cache is sticky (e.g. `anatomy.webp`, `design_system.webp`).
4. **Do not commit** `_sources/`, `review/`, `.tmp-shots/`, or `node_modules/`.

## Git hygiene (optional size win)

If you still have **tracked PNG/MOV** under `assets/img/dashboard-web/` or `assets/video/**/*.mov`, consider removing them from the index (masters now live in `_sources/`):

```bash
git rm --cached raisin-assets/assets/img/dashboard-web/*.png 2>/dev/null
git rm --cached raisin-assets/assets/video/dashboard-web/*.mov 2>/dev/null
```

Keep **webp** and **mp4** tracked.

## Deploy note

GitHub Pages serves this branch as static files — no build step. After push, allow ~1–2 min and hard-refresh production.