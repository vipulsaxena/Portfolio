// Prototype only — synthetic persona pass, not research. Job, attention and funnel charts are
// simulated from the walkthroughs; only the market audit comes from rendering the prototype.

import { MARKETS, marketType } from "./markets.js";

const CONFLUENCE_URL =
  "https://raisin-jira.atlassian.net/wiki/spaces/Design/pages/4628218209/Dashboard+Comprehensive+Summary";
const SKILL_URL =
  "https://gitlab.com/raisin-global/ai-enablement/raisin-agent-plugins/-/blob/main/skills/persona-review/SKILL.md";

/* ── Study data ── */

/** Segment focus share from the Raisin persona posters — used to weight every score. */
const PERSONAS = [
  { id: "thomas", name: "Thomas", full: "Thomas Grünwald", age: 61, segment: "Affluent Core", cadence: "Weekly · laptop", weight: 0.6, initials: "TG" },
  { id: "reinhold", name: "Reinhold", full: "Reinhold Finck", age: 69, segment: "HNW Core", cadence: "1–2× a year", weight: 0.3, initials: "RF" },
  { id: "sandra", name: "Sandra", full: "Sandra Schmidt", age: 40, segment: "Affluent Young", cadence: "Daily · fluent", weight: 0.1, initials: "SS" },
];

const VARIANTS = [
  { id: "c", label: "Control", short: "C" },
  { id: "a", label: "Hypothesis A", short: "A" },
  { id: "b", label: "Hypothesis B", short: "B" },
];

/**
 * Seven MVP jobs from the Dashboard Comprehensive Summary.
 * Scores per variant are [thomas, reinhold, sandra]: 1 done, 0.5 friction, 0 failed, null not tested.
 */
const JOBS = [
  { job: "Monitor overall wealth", component: "Overview", priority: "High", scores: { c: [1, 1, 1], a: [1, 1, 1], b: [1, 1, 1] } },
  { job: "Track performance", component: "Earnings", priority: "High", scores: { c: [1, 0.5, 1], a: [1, 1, 1], b: [1, 1, 1] } },
  { job: "Identify & complete actions", component: "Needs attention · Pending", priority: "High", scores: { c: [0.5, 0.5, 0], a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 1] } },
  { job: "Manage portfolio", component: "Portfolio · maturity", priority: "High", scores: { c: [0.5, 0, 0.5], a: [0.5, 0, 0.5], b: [0.5, 0, 0.5] } },
  { job: "Discover opportunities", component: "Promotions · Top offers", priority: "Medium", scores: { c: [0.5, 0, 0], a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 1] } },
  { job: "Manage funds", component: "Raisin Account", priority: "Low", scores: { c: [0.5, 0.5, 0.5], a: [1, 0.5, 1], b: [1, 1, 1] } },
  { job: "Manage profile", component: "Profile", priority: "Low", scores: { c: [null, null, null], a: [null, null, null], b: [null, null, null] } },
];

/** Login task broken into steps. Values per variant are [thomas, reinhold, sandra]. */
const FUNNEL = [
  { step: "See the total", values: { c: [1, 1, 1], a: [1, 1, 1], b: [1, 1, 1] } },
  { step: "Spot what’s urgent", values: { c: [0.5, 1, 0.5], a: [0.5, 0.5, 0.5], b: [0.5, 1, 0.5] } },
  { step: "Act on it (KYC / fund order)", values: { c: [0.5, 0.5, 0], a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 1] } },
  { step: "Find next maturity", values: { c: [0, 0, 0], a: [0, 0, 0], b: [0, 0, 0] } },
];

/**
 * Simulated attention map per home, drawn on a wireframe of the live layout.
 * Region boxes are % of a 1440-wide page; heat is 0–1; order is first-fixation rank.
 */
const HEATMAPS = {
  c: {
    note: "The rate offer inside Needs attention pulls the first look away from KYC. The offer wall below the portfolio gets almost no attention.",
    regions: [
      { label: "Header", x: 0, y: 0, w: 100, h: 7, heat: 0.1 },
      { label: "Overview · donut", x: 0, y: 9, w: 64, h: 24, heat: 0.95, order: 1 },
      { label: "Needs attention (rate offer first)", x: 0, y: 35, w: 64, h: 20, heat: 0.75, order: 2, flag: true },
      { label: "Portfolio", x: 0, y: 57, w: 64, h: 20, heat: 0.35, order: 4 },
      { label: "Offer wall", x: 0, y: 79, w: 64, h: 21, heat: 0.12 },
      { label: "Raisin Account", x: 67, y: 9, w: 33, h: 18, heat: 0.55, order: 3 },
      { label: "Earnings", x: 67, y: 29, w: 33, h: 16, heat: 0.3 },
      { label: "Popular deposits", x: 67, y: 47, w: 33, h: 53, heat: 0.15 },
    ],
  },
  a: {
    note: "Without the pending block, the left column goes straight from total to portfolio. Performance gets the second look. Needs attention sits below it with no buttons, and the static “Alerts 10” chip gets a glance but no click.",
    regions: [
      { label: "Header · Alerts 10", x: 0, y: 0, w: 100, h: 7, heat: 0.4, order: 3, flag: true },
      { label: "Total wealth", x: 0, y: 9, w: 64, h: 20, heat: 0.95, order: 1 },
      { label: "Portfolio · rings", x: 0, y: 31, w: 64, h: 26, heat: 0.5, order: 4 },
      { label: "Popular products", x: 0, y: 59, w: 64, h: 24, heat: 0.25 },
      { label: "Closed", x: 0, y: 85, w: 64, h: 15, heat: 0.05 },
      { label: "Performance", x: 67, y: 9, w: 33, h: 20, heat: 0.55, order: 2 },
      { label: "Needs attention (no buttons)", x: 67, y: 31, w: 33, h: 18, heat: 0.45, order: 5, flag: true },
      { label: "Wallet", x: 67, y: 51, w: 33, h: 26, heat: 0.35 },
      { label: "For you", x: 67, y: 79, w: 33, h: 21, heat: 0.12 },
    ],
  },
  b: {
    note: "Needs attention is still seen second, but the tiles have no buttons and KYC can fall out of the preview. Attention stalls there, and people have to find “Show all” before they can act.",
    regions: [
      { label: "Header", x: 0, y: 0, w: 100, h: 7, heat: 0.1 },
      { label: "Tabs · Wallet", x: 0, y: 8, w: 100, h: 5, heat: 0.3 },
      { label: "Overview · donut", x: 0, y: 15, w: 64, h: 24, heat: 0.9, order: 1 },
      { label: "Portfolio", x: 0, y: 41, w: 64, h: 24, heat: 0.45, order: 3 },
      { label: "Wallet · reserved", x: 0, y: 67, w: 64, h: 20, heat: 0.4 },
      { label: "Closed", x: 0, y: 89, w: 64, h: 11, heat: 0.05 },
      { label: "Needs attention (no buttons)", x: 67, y: 15, w: 33, h: 20, heat: 0.85, order: 2, flag: true },
      { label: "Earnings", x: 67, y: 37, w: 33, h: 16, heat: 0.45, order: 4 },
      { label: "For you", x: 67, y: 55, w: 33, h: 18, heat: 0.15 },
      { label: "Popular", x: 67, y: 75, w: 33, h: 25, heat: 0.2 },
    ],
  },
};

/** Fold on a 1440×900 laptop viewport, as % of the wireframe height. */
const FOLD_PCT = 46;

/** What moved between the 24 Sep pass and this one. */
const CHANGES = [
  { tone: "ok", text: "A and B’s Needs attention now shows urgent items only, and its badge matches (rate offer gone)." },
  { tone: "no", text: "A and B’s pending-payments block is gone from Home, and alert tiles have no buttons, so acting takes a detour." },
  { tone: "no", text: "Warnings sort before critical items: with a low balance, KYC drops out of the two-item preview." },
  { tone: "mid", text: "Ten markets, local formats and seven languages added. That’s the scope of the new market section." },
];

const FINDINGS = [
  {
    tone: "no",
    title: "Still no home tells you what matures next",
    body: "Measured across 60 market × home × persona renders: zero maturity lines on Home. The dates only appear on Home for customers who hold a single product type.",
    job: "Manage portfolio",
  },
  {
    tone: "no",
    title: "B lost its lead on urgent actions",
    body: "The pending block and alert buttons are gone. Thomas (60% of the base) now sees “pending” and “low balance” but not KYC, and has to find “Show all” before he can act. B’s action score fell from 100% to 55%.",
    job: "Identify & complete actions",
  },
  {
    tone: "ok",
    title: "A and B’s Needs attention is clean now",
    body: "Only warnings and critical items make it in, and the badge counts exactly those. Control still puts a rate offer first and counts all seven items.",
    job: "Identify & complete actions",
  },
  {
    tone: "mid",
    title: "Markets mostly hold up, with a few trust leaks",
    body: "Local text is fully translated and nothing overflows at 1440 px. But UK and Poland customers see a € referral bonus, savings-only markets see “Invest” prompts, and every market opens in English.",
    job: "All jobs",
  },
];

const ISSUES = [
  { sev: "Blocker", title: "Next maturity not on Home", personas: ["thomas", "reinhold", "sandra"], variants: ["c", "a", "b"], job: "Manage portfolio", fix: "One line on Home: bank, date, amount, renew CTA — for every portfolio shape." },
  { sev: "Major", title: "Alert tiles have no action and pending block removed", personas: ["thomas", "reinhold", "sandra"], variants: ["a", "b"], job: "Identify & complete actions", fix: "Give each tile its CTA (Retry identification, Add money, View orders)." },
  { sev: "Major", title: "KYC pushed out of the preview by warnings", personas: ["thomas", "sandra"], variants: ["c", "a", "b"], job: "Identify & complete actions", fix: "Sort critical before warning; show up to 3 items." },
  { sev: "Major", title: "Rate offer inside Needs attention", personas: ["thomas", "reinhold", "sandra"], variants: ["c"], job: "Identify & complete actions", fix: "Only blocking items in attention; move offers to discovery." },
  { sev: "Major", title: "Badge counts not tied to real blockers", personas: ["thomas", "reinhold", "sandra"], variants: ["c", "a"], job: "Identify & complete actions", fix: "Control badge = urgent count; wire A’s header chips to data." },
  { sev: "Major", title: "Offer wall lengthens the check", personas: ["thomas", "sandra"], variants: ["c"], job: "Discover opportunities", fix: "Cap discovery on Home to one compact module below the portfolio." },
  { sev: "Minor", title: "Wallet named five ways", personas: ["reinhold"], variants: ["b"], job: "Manage funds", fix: "Pick one name (Raisin Account) and two figures: available, reserved." },
  { sev: "Minor", title: "Dense portfolio meta (8 Active · 5 Processing · 3 Pending)", personas: ["thomas"], variants: ["a"], job: "Manage portfolio", fix: "Show product count and total; move statuses into the drill-down." },
  { sev: "Minor", title: "Carousel dots and 12–14 px meta text", personas: ["reinhold"], variants: ["a"], job: "Discover opportunities", fix: "Use arrows or a static list; 16 px minimum for readable copy." },
];

const WALKTHROUGHS = [
  {
    id: "thomas",
    quote: "I want order, not a project. If a number changes between two boxes, I stop.",
    verdicts: { c: ["Partial", "mid"], a: ["Partial", "mid"], b: ["Partial", "mid"] },
    lines: {
      c: "Sees low balance and the rate offer. KYC is not on Home, so he doesn’t know it expired.",
      a: "His preferred layout. Sees “pending” and “low balance” in the right column but no button, and KYC isn’t among them.",
      b: "Tabs still fit him. Same two alerts, and no buttons: “Where do I add money from here?” He finds it in the wallet, but misses KYC.",
    },
    leave: "Ambiguous alerts, or figures that disagree.",
  },
  {
    id: "reinhold",
    quote: "I don’t want to refer friends. I want to know what’s happening with my money.",
    verdicts: { c: ["Struggled", "mid"], a: ["Struggled", "mid"], b: ["Partial", "mid"] },
    lines: {
      c: "The rate offer at the top of Needs attention makes the module look like an ad. He might fund the orders with help. Ignores the offer wall.",
      a: "Trusts the total. Ignores “Alerts 10”. Sees KYC late, below Performance, and there’s no button on it.",
      b: "Sees KYC at the top of the right column. The tile has no button, so he has to find the small “Show all” link.",
    },
    leave: "An attention module that sells, or a Home that hides what’s due.",
  },
  {
    id: "sandra",
    quote: "Two minutes. Number, blockers, out.",
    verdicts: { c: ["Struggled", "mid"], a: ["Partial", "mid"], b: ["Done", "ok"] },
    lines: {
      c: "Scrolls through ads. Skips the rate offer in Needs attention, and KYC isn’t there anyway.",
      a: "Fastest to scan. The fake header counts annoy her, and the button-less alerts feel like a dead end.",
      b: "Clicks “Show all” without thinking and finds KYC. The only persona who clears it in one pass.",
    },
    leave: "Wasted scroll, or alerts she can’t trust.",
  },
];

const RECOMMENDATIONS = [
  { title: "Put actions back on the alert tiles", body: "One CTA per tile, critical sorted before warning, up to 3 visible. This restores B’s lead on the highest-value job.", effort: "S", jobs: ["Identify & complete actions"] },
  { title: "Add a next-maturity line to Home", body: "Bank, date, amount and a renew button, for every portfolio shape, not only single-product customers. It closes the only gap that every persona hits.", effort: "S", jobs: ["Manage portfolio"] },
  { title: "Take B’s information architecture forward with A’s wealth hero", body: "B’s tabs, top-right attention and wallet, plus A’s total and Performance module at the top of the Overview.", effort: "M", jobs: ["Monitor wealth", "Track performance", "Manage funds"] },
  { title: "Make market content match the market", body: "Referral amounts in the market’s currency, no invest prompts where investments aren’t offered, and default the language to the market’s.", effort: "S", jobs: ["Discover opportunities", "All jobs"] },
];

const NEXT_STEPS = [
  { label: "Moderated usability", detail: "5 per cell (A, B, production control), with at least 2 aged 65+. Same login task." },
  { label: "Success metrics", detail: "Task success, time to KYC, maturity found unaided, SEQ after each job." },
  { label: "First-click test", detail: "Unmoderated, n ≈ 50 per variant: “Where would you renew a deposit?” Checks the maturity gap." },
  { label: "Analytics baseline", detail: "Datadog/Looker: CTR on Needs attention vs. promo cards on production today." },
];

/**
 * Market audit — measured with `scripts/market-audit.mjs` (Playwright, 1440×900) on
 * 30 Sep 2026: 10 markets × 3 homes × HNW + Affluent, local language vs. English.
 * Check values: "ok" | "mid" | "no" | null (not applicable), each with a short label.
 */
const MARKET_CHECKS = [
  { id: "lang", label: "Local copy", hint: "Visible multi-word strings translated (bank names excluded)" },
  { id: "entry", label: "Opens in local language", hint: "Language on first visit, without a lang link" },
  { id: "fit", label: "Layout fit", hint: "Clipped or overflowing text at 1440 px, local language" },
  { id: "currency", label: "Currency", hint: "Foreign currency symbols on Home" },
  { id: "offer", label: "Offer fit", hint: "Prompts for products the market doesn’t sell" },
  { id: "kyc", label: "KYC on Home", hint: "Affluent persona (Thomas, Sandra) sees the KYC alert without “Show all”" },
];

const MARKET_REVIEW = {
  de: {
    checks: { lang: ["ok", "100%"], entry: ["no", "English"], fit: ["ok", "0"], currency: ["ok", "€ only"], offer: ["ok", "All sold"], kyc: ["no", "Hidden"] },
    note: "Baseline. Every finding above applies as-is. Reinhold, 69, lands in English unless the link sets German.",
  },
  nl: {
    checks: { lang: ["ok", "100%"], entry: ["no", "English"], fit: ["ok", "0"], currency: ["ok", "€ only"], offer: ["ok", "No pension shown"], kyc: ["ok", "Visible"] },
    note: "The healthiest market. Larger portfolios keep Affluent cash above 1.000 €, so no low-balance alert and KYC stays in the preview. B works as intended here.",
  },
  at: {
    checks: { lang: ["ok", "100% (de)"], entry: ["no", "English"], fit: ["ok", "0"], currency: ["ok", "€ only"], offer: ["mid", "“Invest” in A/B"], kyc: ["no", "Hidden"] },
    note: "Savings only, German copy. A’s wallet activity shows “Invest” and B’s Popular shows “Ready to invest” for products Austria doesn’t sell. Portfolio sizes are simulated.",
  },
  es: {
    checks: { lang: ["ok", "100%"], entry: ["no", "English"], fit: ["ok", "0"], currency: ["ok", "€ only"], offer: ["mid", "“Invest” in A/B"], kyc: ["no", "Hidden"] },
    note: "Same shape as Austria, backed by a real median (25.000 €). Spanish runs longer but still fits.",
  },
  gb: {
    checks: { lang: [null, "Native EN"], entry: ["ok", "English"], fit: ["ok", "0"], currency: ["no", "€ 50 referral"], offer: ["mid", "“Invest” in A/B"], kyc: ["no", "Hidden"] },
    note: "The UK glossary works (Fix rate bonds, Easy access, FSCS £120k). But the For you referral in A and B promises “€ 50” on a pound dashboard. Amounts are euro figures with a £ sign, with no currency conversion.",
  },
  ie: {
    checks: { lang: [null, "Native EN"], entry: ["ok", "English"], fit: ["ok", "0"], currency: ["ok", "€ only"], offer: ["mid", "“Invest” in A/B"], kyc: ["no", "Hidden"] },
    note: "Fixed-term and overnight only. Uses generic EU English (no Irish glossary or DGS wording check). Portfolio sizes are simulated.",
  },
  fr: {
    checks: { lang: ["ok", "100%"], entry: ["no", "English"], fit: ["ok", "0"], currency: ["ok", "€ only"], offer: ["mid", "“Invest” in A/B"], kyc: ["no", "Hidden"] },
    note: "Fixed-term and overnight. French expansion fits at 1440 px. Portfolio sizes are simulated.",
  },
  fi: {
    checks: { lang: ["ok", "100%"], entry: ["no", "English"], fit: ["ok", "0"], currency: ["ok", "€ only"], offer: ["mid", "“Invest” in A/B"], kyc: ["no", "Hidden"] },
    note: "The longest compound words of any language, and still no clipping at 1440 px. Check narrower widths next. Portfolio sizes are simulated.",
  },
  pl: {
    checks: { lang: ["ok", "100%"], entry: ["no", "English"], fit: ["ok", "0"], currency: ["no", "€ 50 referral"], offer: ["mid", "“Invest” in A/B"], kyc: ["no", "Hidden"] },
    note: "zł is shown after the amount, correctly. But the referral in A and B shows “€ 50”, and amounts are euro figures with no conversion: a “HNW” 118.658 zł portfolio is only about 27k €.",
  },
  it: {
    checks: { lang: ["ok", "100%"], entry: ["no", "English"], fit: ["ok", "0"], currency: ["ok", "€ only"], offer: ["mid", "“Invest” in A/B"], kyc: ["no", "Hidden"] },
    note: "Fixed-term and overnight. Italian banks (Banca Progetto, Illimity) show up as local brands, which is right. Portfolio sizes are simulated.",
  },
};

const MARKET_TYPE_LABEL = { all: "All products", "savings-investment": "Savings + invest", "savings-only": "Savings only" };

/* ── Helpers ── */

const persona = (id) => PERSONAS.find((p) => p.id === id);
const variantOf = (id) => VARIANTS.find((v) => v.id === id);

/** Weighted by segment share; null (not tested) returns null. */
function weighted(values) {
  if (values.every((v) => v == null)) return null;
  return PERSONAS.reduce((sum, p, i) => sum + p.weight * (values[i] ?? 0), 0);
}

const pct = (n) => `${Math.round(n * 100)}%`;
const toneFor = (n) => (n == null ? "na" : n >= 0.8 ? "ok" : n >= 0.5 ? "mid" : "no");

function avatar(id, size = "") {
  const p = persona(id);
  return `<span class="pr-av pr-av--${p.id}${size ? ` pr-av--${size}` : ""}" title="${p.full}" aria-hidden="true">${p.initials}</span>`;
}

function simBadge(text = "Simulated") {
  return `<span class="pr-sim" title="Derived from the synthetic persona walkthrough — not recorded data">${text}</span>`;
}

function sectionHead(kicker, title, aside = "") {
  return `
    <header class="pr-sec__head">
      <div>
        <p class="pr-sec__kicker">${kicker}</p>
        <h2 class="pr-sec__title">${title}</h2>
      </div>
      ${aside}
    </header>`;
}

/* ── Sections ── */

function hero() {
  const scored = JOBS.flatMap((j) => VARIANTS.flatMap((v) => j.scores[v.id])).filter((s) => s != null).length;
  return `
    <header class="pr-hero" id="pr-top">
      <p class="pr-kicker">Research readout · Web Dashboard Parity · Pass 2 · 30 Sep 2026</p>
      <h1>The latest changes cost B its lead on urgent actions. No home shows what matures next.</h1>
      <p class="pr-lede">A synthetic persona review of three dashboard homes, scored against the seven jobs in the <a href="${CONFLUENCE_URL}">Dashboard Comprehensive Summary</a> and weighted by segment share. New this pass: a measured audit of all ten markets.</p>
      <ul class="pr-stats" aria-label="Study at a glance">
        <li><strong>3</strong><span>personas</span></li>
        <li><strong>3</strong><span>homes</span></li>
        <li><strong>7</strong><span>jobs</span></li>
        <li><strong>${scored}</strong><span>judgements</span></li>
        <li><strong>${MARKETS.length}</strong><span>markets</span></li>
        <li><strong>108</strong><span>measured renders</span></li>
      </ul>
      <p class="pr-caveat"><strong>Synthetic pass.</strong> Heatmaps, funnels and job scores are simulated from the walkthroughs. They are not recorded data. Only the market audit is measured, by rendering the prototype. Validate with real users, especially 65+.</p>
      <div class="pr-changes">
        <p class="pr-changes__title">Since the 24 Sep pass</p>
        <ul>
          ${CHANGES.map((c) => `<li class="pr-changes__item pr-changes__item--${c.tone}">${c.text}</li>`).join("")}
        </ul>
      </div>
      <nav class="pr-toc" aria-label="Sections">
        <a href="#review" data-pr-jump="pr-findings">Findings</a>
        <a href="#review" data-pr-jump="pr-jobs">Jobs × homes</a>
        <a href="#review" data-pr-jump="pr-heat">Attention</a>
        <a href="#review" data-pr-jump="pr-funnel">Task funnel</a>
        <a href="#review" data-pr-jump="pr-issues">Issues</a>
        <a href="#review" data-pr-jump="pr-voices">Personas</a>
        <a href="#review" data-pr-jump="pr-next">Recommendation</a>
        <a href="#review" data-pr-jump="pr-markets">Markets</a>
      </nav>
    </header>`;
}

function findings() {
  return `
    <section class="pr-sec" id="pr-findings">
      ${sectionHead("01 · Key findings", "What we learned")}
      <div class="pr-findings">
        ${FINDINGS.map(
          (f, i) => `
        <article class="pr-finding pr-finding--${f.tone}">
          <span class="pr-finding__n">${i + 1}</span>
          <div>
            <h3>${f.title}</h3>
            <p>${f.body}</p>
            <span class="pr-chip">${f.job}</span>
          </div>
        </article>`
        ).join("")}
      </div>
    </section>`;
}

function jobsMatrix() {
  const totals = VARIANTS.map((v) => {
    const vals = JOBS.map((j) => weighted(j.scores[v.id])).filter((n) => n != null);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });
  const best = Math.max(...totals);

  const cell = (values) => {
    const w = weighted(values);
    const dots = values
      .map((s, i) => `<i class="pr-dot pr-dot--${toneFor(s)}" title="${PERSONAS[i].name}: ${s == null ? "not tested" : pct(s)}"></i>`)
      .join("");
    return `<td class="pr-heat pr-heat--${toneFor(w)}"><strong>${w == null ? "—" : pct(w)}</strong><span class="pr-dots">${dots}</span></td>`;
  };

  return `
    <section class="pr-sec" id="pr-jobs">
      ${sectionHead("02 · Jobs to be done", "How well each home serves each job", simBadge("Weighted score"))}
      <p class="pr-sec__lede">Percent = job success weighted by segment (Thomas 60%, Reinhold 30%, Sandra 10%). Dots = each persona in that order.</p>
      <div class="pr-matrix-wrap">
        <table class="pr-matrix">
          <thead>
            <tr>
              <th scope="col">Job <span>component · priority</span></th>
              ${VARIANTS.map((v) => `<th scope="col">${v.label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${JOBS.map(
              (j) => `
            <tr>
              <th scope="row">${j.job}<span>${j.component} · <em class="pr-prio pr-prio--${j.priority.toLowerCase()}">${j.priority}</em></span></th>
              ${VARIANTS.map((v) => cell(j.scores[v.id])).join("")}
            </tr>`
            ).join("")}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Overall<span>mean of tested jobs</span></th>
              ${totals.map((t) => `<td class="pr-total${t === best ? " pr-total--best" : ""}">${pct(t)}</td>`).join("")}
            </tr>
          </tfoot>
        </table>
      </div>
      <ul class="pr-legend" aria-label="Legend">
        <li><i class="pr-dot pr-dot--ok"></i>80–100%</li>
        <li><i class="pr-dot pr-dot--mid"></i>50–79%</li>
        <li><i class="pr-dot pr-dot--no"></i>Under 50%</li>
        <li><i class="pr-dot pr-dot--na"></i>Not tested</li>
      </ul>
    </section>`;
}

function heatmap(vid) {
  const map = HEATMAPS[vid];
  const blocks = map.regions
    .map(
      (r) => `
      <div class="pr-wf__block${r.flag ? " pr-wf__block--flag" : ""}" style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%">
        <span class="pr-wf__label">${r.label}</span>
      </div>`
    )
    .join("");
  const blobs = map.regions
    .filter((r) => r.heat >= 0.2)
    .map((r) => {
      const size = 24 + r.heat * 46;
      return `<span class="pr-wf__blob" style="left:${r.x + r.w / 2}%;top:${r.y + r.h / 2}%;width:${size}%;opacity:${0.25 + r.heat * 0.6}"></span>`;
    })
    .join("");
  const pins = map.regions
    .filter((r) => r.order)
    .map((r) => `<span class="pr-wf__pin" style="left:${r.x + 3}%;top:${r.y + 2}%">${r.order}</span>`)
    .join("");

  return `
    <figure class="pr-heatmap">
      <figcaption>${variantOf(vid).label}</figcaption>
      <div class="pr-wf" role="img" aria-label="Simulated attention map for ${variantOf(vid).label}">
        ${blocks}${blobs}${pins}
        <span class="pr-wf__fold" style="top:${FOLD_PCT}%"><em>Fold · 1440×900</em></span>
      </div>
      <p class="pr-heatmap__note">${map.note}</p>
    </figure>`;
}

function heatmaps() {
  return `
    <section class="pr-sec" id="pr-heat">
      ${sectionHead("03 · Attention", "Where eyes go on first load", simBadge())}
      <p class="pr-sec__lede">Simulated attention maps on wireframes of each home. Warmer areas get more attention, numbered pins show first-look order, and red outlines mark a problem area. Built from the walkthroughs, not eye tracking.</p>
      <div class="pr-heatmaps">${VARIANTS.map((v) => heatmap(v.id)).join("")}</div>
      <div class="pr-heat-scale" aria-hidden="true"><span>Low</span><i></i><span>High attention</span></div>
    </section>`;
}

function funnel() {
  const rows = VARIANTS.map((v) => {
    const steps = FUNNEL.map((s) => weighted(s.values[v.id]));
    return `
      <div class="pr-funnel__row">
        <p class="pr-funnel__variant">${v.label}</p>
        <ol class="pr-funnel__steps">
          ${steps
            .map(
              (n, i) => `
          <li>
            <span class="pr-funnel__bar"><span class="pr-funnel__fill pr-funnel__fill--${toneFor(n)}" style="width:${Math.max(n * 100, 1.5)}%"></span></span>
            <span class="pr-funnel__val">${pct(n)}</span>
            <span class="pr-funnel__step">${FUNNEL[i].step}</span>
          </li>`
            )
            .join("")}
        </ol>
      </div>`;
  }).join("");

  return `
    <section class="pr-sec" id="pr-funnel">
      ${sectionHead("04 · Task funnel", "Where the login task drops off", simBadge("Weighted"))}
      <p class="pr-sec__lede">Share of the weighted base that finishes each step from Home. B holds best through “act”. Every home drops to 0% at maturity.</p>
      <div class="pr-funnel">${rows}</div>
    </section>`;
}

function issues() {
  const sevRank = { Blocker: 0, Major: 1, Minor: 2 };
  const sorted = [...ISSUES].sort(
    (a, b) =>
      sevRank[a.sev] - sevRank[b.sev] ||
      b.personas.reduce((s, id) => s + persona(id).weight, 0) - a.personas.reduce((s, id) => s + persona(id).weight, 0)
  );
  return `
    <section class="pr-sec" id="pr-issues">
      ${sectionHead("05 · Issue log", "Ranked by severity and reach")}
      <p class="pr-sec__lede">Reach = share of the weighted base that hits the issue.</p>
      <ol class="pr-issues">
        ${sorted
          .map((it) => {
            const reach = it.personas.reduce((s, id) => s + persona(id).weight, 0);
            return `
        <li class="pr-issue pr-issue--${it.sev.toLowerCase()}">
          <div class="pr-issue__main">
            <span class="pr-sev pr-sev--${it.sev.toLowerCase()}">${it.sev}</span>
            <h3>${it.title}</h3>
            <p class="pr-issue__fix"><span>Fix</span> ${it.fix}</p>
          </div>
          <div class="pr-issue__meta">
            <div class="pr-reach" title="Reach ${pct(reach)}">
              <span class="pr-reach__bar"><span style="width:${reach * 100}%"></span></span>
              <span>${pct(reach)}</span>
            </div>
            <div class="pr-issue__who">${it.personas.map((id) => avatar(id, "sm")).join("")}</div>
            <div class="pr-issue__where">${VARIANTS.map((v) => `<span class="pr-vtag${it.variants.includes(v.id) ? " is-on" : ""}">${v.short}</span>`).join("")}</div>
          </div>
        </li>`;
          })
          .join("")}
      </ol>
    </section>`;
}

function voices() {
  return `
    <section class="pr-sec" id="pr-voices">
      ${sectionHead("06 · Persona walkthroughs", "In their words")}
      <div class="pr-voices">
        ${WALKTHROUGHS.map((w) => {
          const p = persona(w.id);
          return `
        <details class="pr-voice">
          <summary>
            ${avatar(p.id)}
            <span class="pr-voice__who">
              <strong>${p.full}, ${p.age}</strong>
              <span>${p.segment} · ${p.cadence} · ${Math.round(p.weight * 100)}% of base</span>
            </span>
            <span class="pr-voice__verdicts">
              ${VARIANTS.map((v) => `<span class="pr-verdict pr-verdict--${w.verdicts[v.id][1]}"><em>${v.short}</em>${w.verdicts[v.id][0]}</span>`).join("")}
            </span>
          </summary>
          <div class="pr-voice__body">
            <blockquote>“${w.quote}”</blockquote>
            <dl class="pr-voice__lines">
              ${VARIANTS.map((v) => `<div><dt>${v.label}</dt><dd>${w.lines[v.id]}</dd></div>`).join("")}
            </dl>
            <p class="pr-voice__leave"><strong>Would leave if:</strong> ${w.leave}</p>
          </div>
        </details>`;
        }).join("")}
      </div>
    </section>`;
}

function nextSteps() {
  return `
    <section class="pr-sec" id="pr-next">
      ${sectionHead("07 · Recommendation", "What to take into Gate 3")}
      <ol class="pr-recs">
        ${RECOMMENDATIONS.map(
          (r, i) => `
        <li class="pr-rec">
          <span class="pr-rec__n">${i + 1}</span>
          <div>
            <h3>${r.title} <span class="pr-effort">${r.effort === "Base" ? "Base" : `Effort ${r.effort}`}</span></h3>
            <p>${r.body}</p>
            <div class="pr-rec__jobs">${r.jobs.map((j) => `<span class="pr-chip">${j}</span>`).join("")}</div>
          </div>
        </li>`
        ).join("")}
      </ol>
      <div class="pr-plan">
        <h3>Validate with real customers</h3>
        <ul>
          ${NEXT_STEPS.map((s) => `<li><strong>${s.label}</strong><span>${s.detail}</span></li>`).join("")}
        </ul>
      </div>
    </section>`;
}

function markets() {
  const cell = (check) => {
    const [tone, text] = check;
    return `<td class="pr-heat pr-heat--${tone ?? "na"} pr-heat--text">${text}</td>`;
  };
  const passCount = (review) => Object.values(review.checks).filter(([t]) => t === "ok").length;
  const applicable = (review) => Object.values(review.checks).filter(([t]) => t != null).length;

  return `
    <section class="pr-sec" id="pr-markets">
      ${sectionHead("08 · Markets", "How each market holds up", `<span class="pr-measured" title="Rendered with Playwright at 1440×900 — scripts/market-audit.mjs">Measured</span>`)}
      <p class="pr-sec__lede">Every home rendered for each market with the HNW and Affluent portfolios, in the local language and in English: 108 renders. Unlike the sections above, these are measured results, not simulations.</p>
      <div class="pr-matrix-wrap">
        <table class="pr-matrix pr-matrix--markets">
          <thead>
            <tr>
              <th scope="col">Market <span>offer · currency</span></th>
              ${MARKET_CHECKS.map((c) => `<th scope="col" title="${c.hint}">${c.label}</th>`).join("")}
              <th scope="col">Pass</th>
            </tr>
          </thead>
          <tbody>
            ${MARKETS.map((m) => {
              const r = MARKET_REVIEW[m.id];
              return `
            <tr>
              <th scope="row">${m.label}<span>${MARKET_TYPE_LABEL[marketType(m.id)]} · ${m.currency}</span></th>
              ${MARKET_CHECKS.map((c) => cell(r.checks[c.id])).join("")}
              <td class="pr-total">${passCount(r)}/${applicable(r)}</td>
            </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
      <ul class="pr-legend" aria-label="Legend">
        <li><i class="pr-dot pr-dot--ok"></i>Pass</li>
        <li><i class="pr-dot pr-dot--mid"></i>Friction</li>
        <li><i class="pr-dot pr-dot--no"></i>Fail</li>
        <li><i class="pr-dot pr-dot--na"></i>Not applicable</li>
      </ul>

      <div class="pr-market-cards">
        ${MARKETS.map((m) => {
          const r = MARKET_REVIEW[m.id];
          const fails = Object.values(r.checks).filter(([t]) => t === "no").length;
          const tone = fails >= 3 ? "no" : fails >= 2 ? "mid" : "ok";
          return `
        <article class="pr-market pr-market--${tone}">
          <header>
            <strong>${m.label}</strong>
            <span>${m.language.toUpperCase()} · ${m.currency}${m.simulatedScale ? " · sim. scale" : ""}</span>
          </header>
          <p>${r.note}</p>
        </article>`;
        }).join("")}
      </div>

      <div class="pr-plan">
        <h3>Across all markets</h3>
        <ul>
          <li><strong>Affluent customers miss KYC in 9 of 10 markets</strong><span>Their low balance adds an alert that pushes KYC out of the preview. Only the Netherlands is spared.</span></li>
          <li><strong>Every market opens in English</strong><span>Language defaults to EN unless the link or browser memory says otherwise. The market should set the default.</span></li>
          <li><strong>Home shows no maturity in any market</strong><span>0 of 60 English renders show a maturity line, so the blocker is universal.</span></li>
          <li><strong>Not yet measured</strong><span>Narrow widths (1024, 390), screen readers, and local legal copy beyond the UK’s FSCS line.</span></li>
        </ul>
      </div>
    </section>`;
}

export function renderPersonaReview() {
  return `
    <article class="pr-page">
      ${hero()}
      ${findings()}
      ${jobsMatrix()}
      ${heatmaps()}
      ${funnel()}
      ${issues()}
      ${voices()}
      ${nextSteps()}
      ${markets()}
      <p class="pr-foot">Synthetic persona pass: a friction detector, not a substitute for testing with real users (especially 65+). Heatmaps, funnels and scores are simulated from the walkthroughs. The market audit is measured (scripts/market-audit.mjs, 30 Sep 2026). Personas walked on One Data HNW (Reinhold) and Affluent (Thomas, Sandra) in Germany. Method: <a href="${SKILL_URL}">persona-review 1.1.3</a> · Context: <a href="${CONFLUENCE_URL}">Dashboard Comprehensive Summary</a>.</p>
    </article>`;
}
