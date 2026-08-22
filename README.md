# Portfolio

Personal portfolio website for showcasing product design work, case studies, and background. The site is a static front-end project deployed via GitHub Pages.

## Tech stack

| Layer | Technologies |
| --- | --- |
| **Markup & content** | HTML5, semantic structure, Open Graph / Twitter meta tags |
| **Styling** | CSS3 (custom stylesheets), [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts |
| **Layout (case studies)** | [Tailwind CSS](https://tailwindcss.com/) (CDN) on selected project pages |
| **3D & motion** | [Spline](https://spline.design/) viewer, [PixiJS](https://pixijs.com/) (animated background), [Vanilla Tilt](https://mickuuh.com/VanillaTilt.js/) |
| **Scripts** | Vanilla JavaScript (ES modules + classic scripts), jQuery (legacy helpers on index) |
| **Local dev** | [http-server](https://www.npmjs.com/package/http-server) |
| **Hosting** | GitHub Pages (`gh-pages` branch) |
| **Chat API** | Cloudflare Workers + D1 (free tier) |

## Portfolio chat

Visitors chat via the floating widget (replaces the Google Form). Conversations are stored in Cloudflare D1. Admin home: `/admin/` — LLM Chat at `/admin/llm-chat/` (password via `ADMIN_PASSWORD` secret), Presentation mode at `/admin/presentation/`.

### Setup

1. Follow [worker/README.md](worker/README.md) to create Cloudflare account, D1 database, and deploy the API.
2. Set `API_BASE_URL` in [js/vipul-chat-config.js](js/vipul-chat-config.js) and [admin/admin-config.js](admin/admin-config.js) to your Worker URL.
3. Push static site to `gh-pages` as usual.

### Local chat development

```bash
# Terminal 1 — static site
npm start

# Terminal 2 — API
cd worker && npm install && npm run db:migrate:local && npm run dev
```

Chat works offline without API (UI + answers); messages persist once API is running.

## Codebase overview

```
Portfolio/
├── index.html          # Home — work grid, password-gated case study modals
├── about.html          # About — bio, interactive avatar, Spline scene
├── *.html              # Case study pages (e.g. raisin, olx, n26, goplay)
├── template.html       # Reusable case study layout reference
├── css/
│   ├── style.css       # Global styles, layout, components
│   ├── shell.css       # Shared header, footer, navigation shell
│   ├── zoom.css        # Image lightbox / zoom
│   └── tiny-slider.css # Carousel styles
├── js/
│   ├── vipul-chat.js           # Chat widget UI + state machine
│   ├── vipul-chat-knowledge.js # Answer knowledge base
│   ├── vipul-chat-config.js    # API URL config
│   ├── portfolio-gate.js       # Case study password verify
│   ├── custom.js               # AI Colors background (PixiJS orbs + dot grid)
│   ├── dot-grid.js     # Interactive dot grid
│   ├── liquid-glass.js # Glass card hover effects
│   ├── sonic.js        # UI sound feedback
│   ├── about-avatar.js # About page avatar morph on bio hover
│   ├── zoom.js         # Image zoom behavior
│   └── transition.js   # Page transitions
├── images/             # Logos, previews, avatars, media assets
├── assets/             # Case study media (screenshots, video, exports)
├── admin/              # Chat conversation admin panel
├── worker/             # Cloudflare Worker API + D1 schema
└── package.json        # Local dev server script
```

### Main pages

- **Home (`index.html`)** — Project list with modal previews for selected case studies.
- **About (`about.html`)** — Profile copy with hover-triggered avatar transitions over a Spline 3D board.
- **Case studies** — Long-form project pages built with Tailwind and shared shell components.

### Notable interactions

- **AI Colors** — Procedural background palette randomization (`js/custom.js`).
- **Liquid glass** — Frosted card hover states (`js/liquid-glass.js`).
- **Sonic feedback** — Optional UI sounds (`js/sonic.js`).
- **Avatar morph** — Crossfades between PNG avatars when hovering highlighted bio phrases (`js/about-avatar.js`).

## Local development

```bash
npm install
npm start
```

This runs `http-server` and serves the site at `http://localhost:8080` (default port). Open `index.html` or `about.html` in the browser.

> **Note:** Some features (ES modules, WASM, Spline) require serving over HTTP — opening files directly via `file://` may not work reliably.

## Deployment

The live site is published from the **`gh-pages`** branch to GitHub Pages. Push to that branch to update production.

## Browser support

Modern evergreen browsers (Chrome, Firefox, Safari, Edge). CSS uses `rem` units, flexbox, and progressive enhancement; reduced-motion preferences are respected where implemented.

## License

ISC — see `package.json`.
