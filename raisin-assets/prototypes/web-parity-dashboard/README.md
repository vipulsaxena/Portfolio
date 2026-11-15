# Web Dashboard Parity

Static prototypes for **Control**, **Hypothesis A**, and **Hypothesis B** (Gate 2). All three read the **same One Data portfolio** — switch persona in the top bar and every variant updates together. Layout and IA follow the current Figma frames. **Hypothesis C is retired** — `#c`, `#c3`, and related aliases open **Control**.

**Figma file:** [Web-Dashboard-Parity](https://www.figma.com/design/07Wy5a0QTAQAk2DhCiIIay/Web-Dashboard-Parity)

## Live on GitLab Pages

Published from `main` via [`.gitlab-ci.yml`](.gitlab-ci.yml). After the Pages job succeeds, the site is available at:

**Base URL:**  
https://raisin-global.gitlab.io/raisin-gmbh/poc/design/playground/web-parity-dashboard/

*(Private group Pages may require Raisin GitLab sign-in.)*

| Variant | Intent | Open on Pages |
|---------|--------|----------------|
| **Control** | Production-style home — category donut, portfolio cards, popular deposits | [Control overview](https://raisin-global.gitlab.io/raisin-gmbh/poc/design/playground/web-parity-dashboard/#control/overview) |
| **Hypothesis A** | Overview home — total wealth, portfolio allocation rings, performance | [Hypothesis A overview](https://raisin-global.gitlab.io/raisin-gmbh/poc/design/playground/web-parity-dashboard/#a/overview) |
| **Hypothesis B** | Home tab — wealth donut, grouped portfolio, wallet / attention | [Hypothesis B overview](https://raisin-global.gitlab.io/raisin-gmbh/poc/design/playground/web-parity-dashboard/#b/overview) |
| **Persona review** | Reinhold, Thomas, and Sandra attempt the Home job on all three variants | [Persona review](https://raisin-global.gitlab.io/raisin-gmbh/poc/design/playground/web-parity-dashboard/#review) |

Use the **top pills** in the UI to switch variants and the **One Data** control to switch persona. Open **Persona review** from the yellow CTA in that same bar. Legacy hashes: `#c1` → A, `#c2` → B.

The **Reports** dropdown in the same bar opens the two static report pages:

| Page | Path | What it is |
|------|------|------------|
| Prototype review | [`/prototype-review/`](prototype-review/index.html) | Skills vs. custom prompting retrospective |
| Snowflake events | [`/snow-flake-events/`](snow-flake-events/index.html) | Customer Portal **dashboard** front-end events per market (web). Germany first — tracking plan (PDF) vs. `cp-dashboard` code vs. Snowplow counts for `raisin.com/de-de`, last 90 days. Data snapshot lives in [`snow-flake-events/data.js`](snow-flake-events/data.js). |

**Deploy status:** [CI/CD → Pipelines](https://gitlab.com/raisin-global/raisin-gmbh/poc/design/playground/web-parity-dashboard/-/pipelines) · **Pages settings:** [Deploy → Pages](https://gitlab.com/raisin-global/raisin-gmbh/poc/design/playground/web-parity-dashboard/-/pages)

## Hypotheses vs Figma

| Variant | Hash (local or Pages) | Figma frame |
|---------|------------------------|-------------|
| Control | `#control/overview` | [63:61903](https://www.figma.com/design/07Wy5a0QTAQAk2DhCiIIay/Web-Dashboard-Parity?node-id=63-61903) — Home, donut, portfolio, offers |
| Hypothesis A | `#a/overview` | [194:19954](https://www.figma.com/design/07Wy5a0QTAQAk2DhCiIIay/Web-Dashboard-Parity?node-id=194-19954) — Overview home, portfolio, performance |
| Hypothesis B | `#b/overview` | [302:35437](https://www.figma.com/design/07Wy5a0QTAQAk2DhCiIIay/Web-Dashboard-Parity?node-id=302-35437) — Home tab, donut, portfolio |

## Run locally

```bash
cd web-parity-prototype
npm run start
# or: python3 -m http.server 4173
```

Open http://localhost:4173 and append a hash from the table above.

### Typography (Lay Grotesk + Basier Square)

Brand fonts are self-hosted under [`assets/fonts/`](assets/fonts/) and wired in [`css/fonts.css`](css/fonts.css). **Basier Square** is the default UI/body face (`--font-body`); **Lay Grotesk** is used for amounts and display figures (`--font-display`), with tabular figures on money.

Type scale and letter-spacing tokens live in [`css/tokens.css`](css/tokens.css) and match Figma typographyV2 (Subtitle 1/2, Body md, Display xs–lg). Row amounts use **Text md Medium** (Basier); card and donut money uses **Display xs** (Lay) unless marked `--sm` / hero **Display lg**.

To refresh fonts from the design-system repo (GitLab SSH access required):

```bash
git clone --depth 1 --filter=blob:none --sparse \
  git@gitlab.com:raisin-global/raisin-gmbh/poc/design/systems/typography.git .raisin-fonts \
  && FONTS_DIR=assets/fonts bash .raisin-fonts/install-fonts.sh \
  && rm -rf .raisin-fonts
```

## Annotate feedback

Press **`c`** on any element to leave feedback. Comments are filed against GitLab project  
`raisin-global/raisin-gmbh/poc/design/playground/web-parity-dashboard` (GitLab OAuth in the browser).

## Data — One Data, one model

Every figure in all three prototypes derives from [One Data (Confluence)](https://raisin-jira.atlassian.net/wiki/spaces/Design/pages/5050106274), transcribed verbatim into [`js/one-data.js`](js/one-data.js). Nothing is hardcoded in a screen, so Control, A and B cannot drift apart — including Control's pixel-faithful Figma rebuild in [`js/control.js`](js/control.js).

| Persona | AOP | Shape |
|---------|-----|-------|
| **UHNW Core** (default) | €627.959,41 | 8 savings products, DWM ×2, money market, ETF Rürup |
| **HNW Core** | €376.841,98 | 7 savings products, DWM ×2, no pension |
| **Affluent Core** | €181.788,00 | Savings only — investments and retirement are empty states |
| **Retail Young** | €21.974,00 | One fixed-term deposit, €8 cash |

Switch with the **One Data** control in the top bar. The choice is remembered per browser and rides along in the URL (`#a/overview?p=hnw`), so a shared link opens the same layout *and* the same portfolio.

### Math check

```bash
npm run check:data      # add -- --json for machine-readable output
```

Reconciles each persona against the documented rules — AOP, layer roll-ups, bank-level roll-ups, the simple-interest earnings formula (§6), product caps (§7) and legacy fields (§8) — at ±€0,01. It currently reports **14 failing identities**, all in the source data rather than the code. The load-bearing ones:

| Persona | Variable | Issue |
|---------|----------|-------|
| UHNW | `dwm_portfolio2_total` | €25,13 above the value implied by `dwm_total` |
| UHNW | `fix_term_bank_e_earnings` | €0,04 below `total × 2,56% × 2y` |
| HNW | `total_invested` | €308,14 above `savings + ipp + pension` |
| HNW | `notice_bank_i_total` | €53.289,35 against a `notice_total` of €21.502,00 |
| HNW | `fix_term_bank_b/c/d_earnings` | €3,32 each above the formula |
| Affluent | `overnight_bank_f_earnings` | Uses a 1-year term; `overnight_earnings` uses 4 years |

Screens fall back to the authoritative total wherever a component disagrees, so the UI stays internally consistent while the report keeps the discrepancy visible.

One documented behaviour is *not* an error: savings earnings are never capitalised, so `total_principal + total_earnings` exceeds `total_invested` by exactly `savings_earnings` (§1.2). The check labels this as a note.

### Two deliberate departures from the frames

Both were needed to keep the variants reconcilable, and are worth a design decision before Gate 2:

- **Control's donut is drawn from the data.** The frame exports each arc as a fixed-proportion SVG, which can't follow a persona (and showed three slices for savings-only Affluent). The ring is now stroked from the real shares using the exported palette, and the legend carries amounts.
- **All amounts use German digit grouping.** The frames mix `€ 146,803.00` and `186.070,21 €` for the same kind of figure; on a German-market portfolio that reads as a bug when variants sit side by side. Symbol position still follows each frame.

## Offers — Deposit Catalog API

Offer rails are fed by [`GET /v1/public/products`](https://dev.raisin.systems/catalog/default/api/deposit-catalog-management-service-api/definition#/Deposit%20product/get-v1-public-products) from the [deposit-catalog-management-service](https://gitlab.com/raisin-global/raisin-gmbh/deposit-brokerage-squad/deposit-catalog-management-service). Rates, terms, bank names, country ratings, source-tax status and minimum amounts all come from the response — nothing is invented.

The endpoint is unauthenticated but only routable from the Raisin network, so [`js/catalog.js`](js/catalog.js) tries the live API and falls back to [`data/catalog-snapshot.json`](data/catalog-snapshot.json), stored in the same response shape. Each offer rail prints which source it used.

```bash
npm run catalog:refresh                                    # needs Raisin network access
npm run catalog:refresh -- --base-url https://api.dev-weltsparen.de/dcms
```

To read live rates in the browser, set `baseUrl` in the `window.RAISIN_CATALOG` block in [`index.html`](index.html).

## Repository

https://gitlab.com/raisin-global/raisin-gmbh/poc/design/playground/web-parity-dashboard
