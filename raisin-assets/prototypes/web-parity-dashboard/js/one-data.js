import { formatPercent } from "./format.js";
import { DEFAULT_MARKET, getMarket } from "./markets.js";

/** Product-row rate label (en-INT percent, no p.a. suffix). */
function rateLabel(rateDecimal) {
  return formatPercent(rateDecimal * 100, 2);
}

/**
 * One Data — the single portfolio model shared by Control, Hypothesis A and Hypothesis B.
 *
 * Source of truth: "📊 One Data: Dummy Portfolio for designers (WIP)" (Confluence 5050106274).
 * REGISTRY below is a verbatim transcription of the master variable table; every number a
 * screen renders is derived from it, so the three prototypes can never drift apart.
 *
 * Where the document and the table disagree, the JSON/table value wins (doc §1.2) and
 * `npm run check:data` reports the delta instead of silently reconciling it.
 */

/** §4 Interest Rates — annual, simple interest (§6, Model A). */
export const RATES = {
  fixed_term: 0.0256,
  overnight: 0.032,
  notice: 0.018,
  dwm: 0.021,
  money_market: 0.021,
  etf_rurup: 0.0117,
};

/** §5.1 Lifecycle horizons, in years. */
export const LIFECYCLE_YEARS = { uhnw: 11, hnw: 6, affluent: 4, retail: 0.25 };

/**
 * §5.2 Earnings terms. UHNW and HNW use the documented overrides; Affluent and Retail
 * follow the configured model, which resolves to their lifecycle horizon.
 */
export const EARNING_TERMS = {
  uhnw: { fixed_term: 2, overnight: 1, notice: 1.5, dwm: 1, money_market: 0.25, pension: 11 },
  hnw: { fixed_term: 2, overnight: 1, notice: 1.5, dwm: 1, money_market: 0.25, pension: 6 },
  affluent: { fixed_term: 4, overnight: 4, notice: 4, dwm: 4, money_market: 4, pension: 4 },
  retail: { fixed_term: 0.25, overnight: 0.25, notice: 0.25, dwm: 0.25, money_market: 0.25, pension: 0.25 },
};

/** §7 Product caps. */
export const PRODUCT_CAPS = { overnight: 2, notice: 1 };

/** §8 Legacy fields — present in the Figma JSON, excluded from every roll-up. */
export const LEGACY_FIELDS = ["notice_bank_j_total", "money_market2_total", "money_market2_earnings"];

/**
 * §10 Master variable registry, one column per persona mode.
 * Transcribed as-is — do not "fix" values here; fix them in Confluence and re-transcribe.
 */
export const REGISTRY = {
  uhnw: {
    available_cash: 24987.0,
    dwm_count: 2,
    dwm_earnings: 3355.47,
    dwm_portfolio1_earnings: 2013.28,
    dwm_portfolio1_total: 95870.48,
    dwm_portfolio2_earnings: 1342.19,
    dwm_portfolio2_total: 63938.78,
    dwm_total: 159784.13,
    etf_rurup_earnings: 5832.43,
    etf_rurup_total: 45318.0,
    fix_term_bank_a_earnings: 1887.69,
    fix_term_bank_a_total: 36869.0,
    fix_term_bank_b_earnings: 1887.69,
    fix_term_bank_b_total: 36869.0,
    fix_term_bank_c_earnings: 2194.89,
    fix_term_bank_c_total: 42869.0,
    fix_term_bank_count: 5,
    fix_term_bank_d_earnings: 2194.89,
    fix_term_bank_d_total: 42869.0,
    fix_term_bank_e_earnings: 2194.96,
    fix_term_bank_e_total: 42871.0,
    fix_term_earnings: 10360.17,
    fix_term_total: 214347.0,
    fixed_term_pending_bank_a: 6000.0,
    fixed_term_pending_bank_b: 6000.0,
    ipp_earnings: 3579.17,
    ipp_total: 205972.98,
    mm_count: 1,
    money_market1_earnings: 223.7,
    money_market1_total: 42609.68,
    money_market2_earnings: 7355.42,
    money_market2_total: 31847.36,
    money_market_earnings: 223.7,
    money_market_total: 42609.68,
    notice_bank_i_earnings: 580.55,
    notice_bank_i_total: 21502.0,
    notice_bank_count: 1,
    notice_bank_j_total: 16589.43,
    notice_earnings: 580.55,
    notice_total: 21502.0,
    overnight_bank_count: 2,
    overnight_bank_f_earnings: 1568.0,
    overnight_bank_f_total: 49000.0,
    overnight_bank_g_earnings: 1760.0,
    overnight_bank_g_total: 55000.0,
    overnight_earnings: 3328.0,
    overnight_pending_bank_a: 6000.0,
    overnight_total: 110000.0,
    pension_count: 1,
    pension_earnings: 5832.43,
    pension_total: 51150.43,
    savings_earnings: 14268.72,
    savings_earnings_lifetime: 102551.0,
    savings_total: 345849.0,
    total_assets_on_platform: 627959.41,
    total_earnings: 23680.32,
    total_invested: 602972.41,
    total_principal: 593560.81,
  },
  hnw: {
    available_cash: 9628.0,
    dwm_count: 2,
    dwm_earnings: 883.68,
    dwm_portfolio1_earnings: 551.3,
    dwm_portfolio1_total: 26300.0,
    dwm_portfolio2_earnings: 332.38,
    dwm_portfolio2_total: 15780.0,
    dwm_total: 42080.0,
    etf_rurup_earnings: 0.0,
    etf_rurup_total: 0.0,
    fix_term_bank_a_earnings: 1433.7,
    fix_term_bank_a_total: 28002.0,
    fix_term_bank_b_earnings: 1744.22,
    fix_term_bank_b_total: 34002.0,
    fix_term_bank_c_earnings: 1744.22,
    fix_term_bank_c_total: 34002.0,
    fix_term_bank_count: 4,
    fix_term_bank_d_earnings: 1744.22,
    fix_term_bank_d_total: 34002.0,
    fix_term_bank_e_earnings: 0.0,
    fix_term_bank_e_total: 0.0,
    fix_term_earnings: 6656.41,
    fix_term_total: 136008.0,
    fixed_term_pending_bank_a: 6000.0,
    fixed_term_pending_bank_b: 0.0,
    ipp_earnings: 965.84,
    ipp_total: 58695.84,
    mm_count: 1,
    money_market1_earnings: 82.16,
    money_market1_total: 15650.0,
    money_market2_earnings: 0.0,
    money_market2_total: 0.0,
    money_market_earnings: 82.16,
    money_market_total: 15650.0,
    notice_bank_i_earnings: 580.55,
    notice_bank_i_total: 53289.35,
    notice_bank_count: 1,
    notice_bank_j_total: 2322.22,
    notice_earnings: 580.55,
    notice_total: 21502.0,
    overnight_bank_count: 2,
    overnight_bank_f_earnings: 2219.2,
    overnight_bank_f_total: 69350.0,
    overnight_bank_g_earnings: 2411.2,
    overnight_bank_g_total: 75350.0,
    overnight_earnings: 4630.4,
    overnight_pending_bank_a: 6000.0,
    overnight_total: 150700.0,
    pension_count: 0,
    pension_earnings: 0.0,
    pension_total: 0.0,
    savings_earnings: 11867.36,
    savings_earnings_lifetime: 49200.0,
    savings_total: 308210.0,
    total_assets_on_platform: 376841.98,
    total_earnings: 12833.2,
    total_invested: 367213.98,
    total_principal: 365940.0,
  },
  affluent: {
    available_cash: 868.0,
    dwm_count: 0,
    dwm_earnings: 0.0,
    dwm_portfolio1_earnings: 0.0,
    dwm_portfolio1_total: 0.0,
    dwm_portfolio2_earnings: 0.0,
    dwm_portfolio2_total: 0.0,
    dwm_total: 0.0,
    etf_rurup_earnings: 0.0,
    etf_rurup_total: 0.0,
    fix_term_bank_a_earnings: 4748.08,
    fix_term_bank_a_total: 46368.0,
    fix_term_bank_b_earnings: 4692.17,
    fix_term_bank_b_total: 45822.0,
    fix_term_bank_c_earnings: 3351.55,
    fix_term_bank_c_total: 32730.0,
    fix_term_bank_count: 3,
    fix_term_bank_d_earnings: 0.0,
    fix_term_bank_d_total: 0.0,
    fix_term_bank_e_earnings: 0.0,
    fix_term_bank_e_total: 0.0,
    fix_term_earnings: 12791.8,
    fix_term_total: 130920.0,
    fixed_term_pending_bank_a: 6000.0,
    fixed_term_pending_bank_b: 0.0,
    ipp_earnings: 0.0,
    ipp_total: 0.0,
    mm_count: 0,
    money_market1_earnings: 0.0,
    money_market1_total: 0.0,
    money_market2_earnings: 0.0,
    money_market2_total: 0.0,
    money_market_earnings: 0.0,
    money_market_total: 0.0,
    notice_bank_i_earnings: 0.0,
    notice_bank_i_total: 0.0,
    notice_bank_count: 0,
    notice_bank_j_total: 0.0,
    notice_earnings: 0.0,
    notice_total: 0.0,
    overnight_bank_count: 1,
    overnight_bank_f_earnings: 1600.0,
    overnight_bank_f_total: 50000.0,
    overnight_bank_g_earnings: 0.0,
    overnight_bank_g_total: 0.0,
    overnight_earnings: 6400.0,
    overnight_pending_bank_a: 0.0,
    overnight_total: 50000.0,
    pension_count: 0,
    pension_earnings: 0.0,
    pension_total: 0.0,
    savings_earnings: 19191.8,
    savings_earnings_lifetime: 22509.0,
    savings_total: 180920.0,
    total_assets_on_platform: 181788.0,
    total_earnings: 19191.8,
    total_invested: 180920.0,
    total_principal: 180920.0,
  },
  retail: {
    available_cash: 8.0,
    dwm_count: 0,
    dwm_earnings: 0.0,
    dwm_portfolio1_earnings: 0.0,
    dwm_portfolio1_total: 0.0,
    dwm_portfolio2_earnings: 0.0,
    dwm_portfolio2_total: 0.0,
    dwm_total: 0.0,
    etf_rurup_earnings: 0.0,
    etf_rurup_total: 0.0,
    fix_term_bank_a_earnings: 140.58,
    fix_term_bank_a_total: 21966.0,
    fix_term_bank_b_earnings: 0.0,
    fix_term_bank_b_total: 0.0,
    fix_term_bank_c_earnings: 0.0,
    fix_term_bank_c_total: 0.0,
    fix_term_bank_count: 1,
    fix_term_bank_d_earnings: 0.0,
    fix_term_bank_d_total: 0.0,
    fix_term_bank_e_earnings: 0.0,
    fix_term_bank_e_total: 0.0,
    fix_term_earnings: 140.58,
    fix_term_total: 21966.0,
    fixed_term_pending_bank_a: 0.0,
    fixed_term_pending_bank_b: 0.0,
    ipp_earnings: 0.0,
    ipp_total: 0.0,
    mm_count: 0,
    money_market1_earnings: 0.0,
    money_market1_total: 0.0,
    money_market2_earnings: 0.0,
    money_market2_total: 0.0,
    money_market_earnings: 0.0,
    money_market_total: 0.0,
    notice_bank_i_earnings: 0.0,
    notice_bank_i_total: 0.0,
    notice_bank_count: 0,
    notice_bank_j_total: 0.0,
    notice_earnings: 0.0,
    notice_total: 0.0,
    overnight_bank_count: 0,
    overnight_bank_f_earnings: 0.0,
    overnight_bank_f_total: 0.0,
    overnight_bank_g_earnings: 0.0,
    overnight_bank_g_total: 0.0,
    overnight_earnings: 0.0,
    overnight_pending_bank_a: 0.0,
    overnight_total: 0.0,
    pension_count: 0,
    pension_earnings: 0.0,
    pension_total: 0.0,
    savings_earnings: 140.58,
    savings_earnings_lifetime: 141.0,
    savings_total: 21966.0,
    total_assets_on_platform: 21974.0,
    total_earnings: 140.58,
    total_invested: 21966.0,
    total_principal: 21966.0,
  },
};

/**
 * Bank slots A–I are anonymous in One Data. Screens need a name, a country and a rating,
 * so each slot maps to a real Raisin partner bank. Amounts always come from the registry;
 * only the label is added here.
 */
const BANK_SLOTS = {
  fix_term_bank_a: { name: "Klarna Bank", country: "Sweden", rating: "AAA", letter: "K", tone: "pink", termLabel: "2 years", maturity: "14.03.2027", progress: 62 },
  fix_term_bank_b: { name: "Illimity Bank", country: "Italy", rating: "BBB", letter: "I", tone: "blue", termLabel: "1 year", maturity: "02.11.2026", progress: 41 },
  fix_term_bank_c: { name: "Banca Progetto", country: "Italy", rating: "BBB", letter: "B", tone: "navy", termLabel: "3 years", maturity: "19.12.2028", progress: 28 },
  fix_term_bank_d: { name: "BluOr Bank", country: "Latvia", rating: "A−", letter: "B", tone: "purple", termLabel: "2 years", maturity: "24.06.2027", progress: 49 },
  fix_term_bank_e: { name: "Rietumu Banka", country: "Latvia", rating: "A−", letter: "R", tone: "red", termLabel: "4 years", maturity: "09.12.2029", progress: 15 },
  overnight_bank_f: { name: "Collector Bank", country: "Sweden", rating: "AAA", letter: "C", tone: "blue", termLabel: "Available daily" },
  overnight_bank_g: { name: "Banca Sistema", country: "Italy", rating: "BBB", letter: "B", tone: "navy", termLabel: "Available daily" },
  notice_bank_i: { name: "HoistSpar", country: "Sweden", rating: "AAA", letter: "H", tone: "navy", termLabel: "31 days notice" },
};

const IPP_SLOTS = {
  dwm_portfolio1: { name: "Digital Wealth Management", meta: "Growth portfolio · Risk class 4", letter: "D", tone: "navy" },
  dwm_portfolio2: { name: "First car for Maja", meta: "Child portfolio · Risk class 3", letter: "F", tone: "purple" },
  money_market1: { name: "Money Market", meta: "Low risk · Risk class 2", letter: "M", tone: "blue" },
  etf_rurup: { name: "ETF Rürup", meta: "Tax-advantaged pension · Global ETF", letter: "R", tone: "green" },
};

export const PERSONAS = [
  { id: "uhnw", label: "UHNW Core", short: "UHNW", blurb: "11 years on platform · 8 savings products · DWM + Rürup" },
  { id: "hnw", label: "HNW Core", short: "HNW", blurb: "6 years on platform · 7 savings products · DWM, no pension" },
  { id: "affluent", label: "Affluent Core", short: "Affluent", blurb: "4 years on platform · savings only · no investments" },
  { id: "retail", label: "Retail Young", short: "Retail", blurb: "3 months on platform · one fixed-term deposit" },
];

export const DEFAULT_PERSONA = "uhnw";

export const isPersona = (id) => PERSONAS.some((p) => p.id === id);

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const pct = (part, whole) => (whole ? round2((part / whole) * 100) : 0);

/**
 * Registry leaves per product type. Every other money field is a roll-up of these, in the
 * order of the identities `scripts/math-check.mjs` checks.
 */
const PRODUCT_LEAVES = {
  "fixed-term": [
    ...["a", "b", "c", "d", "e"].flatMap((k) => [`fix_term_bank_${k}_total`, `fix_term_bank_${k}_earnings`]),
    "fixed_term_pending_bank_a",
    "fixed_term_pending_bank_b",
  ],
  overnight: [...["f", "g"].flatMap((k) => [`overnight_bank_${k}_total`, `overnight_bank_${k}_earnings`]), "overnight_pending_bank_a"],
  notice: ["notice_bank_i_total", "notice_bank_i_earnings", "notice_bank_j_total"],
  dwm: ["dwm_portfolio1_total", "dwm_portfolio1_earnings", "dwm_portfolio2_total", "dwm_portfolio2_earnings"],
  "money-market": ["money_market1_total", "money_market1_earnings", "money_market2_total", "money_market2_earnings"],
  "etf-rurup": ["etf_rurup_total", "etf_rurup_earnings"],
};

const PRODUCT_COUNTS = {
  "fixed-term": "fix_term_bank_count",
  overnight: "overnight_bank_count",
  notice: "notice_bank_count",
  dwm: "dwm_count",
  "money-market": "mm_count",
  "etf-rurup": "pension_count",
};

/** Per-product roll-ups: [target, components]. Zeroed outright when the market lacks the product. */
const PRODUCT_ROLLUPS = {
  "fixed-term": [
    ["fix_term_total", [...["a", "b", "c", "d", "e"].map((k) => `fix_term_bank_${k}_total`), "fixed_term_pending_bank_a", "fixed_term_pending_bank_b"]],
    ["fix_term_earnings", ["a", "b", "c", "d", "e"].map((k) => `fix_term_bank_${k}_earnings`)],
  ],
  overnight: [
    ["overnight_total", ["overnight_bank_f_total", "overnight_bank_g_total", "overnight_pending_bank_a"]],
    ["overnight_earnings", ["overnight_bank_f_earnings", "overnight_bank_g_earnings"]],
  ],
  notice: [
    ["notice_total", ["notice_bank_i_total"]],
    ["notice_earnings", ["notice_bank_i_earnings"]],
  ],
  dwm: [
    ["dwm_total", ["dwm_portfolio1_total", "dwm_portfolio2_total"]],
    ["dwm_earnings", ["dwm_portfolio1_earnings", "dwm_portfolio2_earnings"]],
  ],
  "money-market": [
    ["money_market_total", ["money_market1_total"]],
    ["money_market_earnings", ["money_market1_earnings"]],
  ],
  "etf-rurup": [
    ["pension_earnings", ["etf_rurup_earnings"]],
    ["pension_total", ["etf_rurup_total", "etf_rurup_earnings"]],
  ],
};

/** Portfolio roll-ups across products, innermost first. */
const PORTFOLIO_ROLLUPS = [
  ["savings_total", ["fix_term_total", "overnight_total", "notice_total"]],
  ["savings_earnings", ["fix_term_earnings", "overnight_earnings", "notice_earnings"]],
  ["ipp_earnings", ["dwm_earnings", "money_market_earnings"]],
  ["ipp_total", ["dwm_total", "money_market_total", "ipp_earnings"]],
  ["total_invested", ["savings_total", "ipp_total", "pension_total"]],
  ["total_principal", ["savings_total", "dwm_total", "money_market_total", "etf_rurup_total"]],
  ["total_earnings", ["savings_earnings", "ipp_earnings", "pension_earnings"]],
  ["total_assets_on_platform", ["total_invested", "available_cash"]],
];

/**
 * Simulated registry for one persona in one market. Germany returns the transcribed
 * registry untouched. Elsewhere: products the market does not offer are removed, every
 * remaining leaf is scaled by the market's AoP factor and rounded to the cent, and each
 * roll-up is rebuilt as the sum of its rounded parts. Where the published registry itself
 * misses an identity, that gap is kept (scaled), so `check:data` reports the same findings
 * in every market instead of hiding them.
 */
export function buildMarketRegistry(personaId, marketId = DEFAULT_MARKET) {
  const source = REGISTRY[personaId];
  const market = getMarket(marketId);
  if (market.id === DEFAULT_MARKET) return source;

  const f = market.scale;
  const offered = (product) => market.products.includes(product);
  const v = { ...source };
  const sum = (keys, reg) => keys.reduce((n, k) => n + (reg[k] ?? 0), 0);
  const rollup = (target, parts) => {
    const gap = source[target] - sum(parts, source);
    v[target] = round2(sum(parts, v) + gap * f);
  };

  for (const [product, leaves] of Object.entries(PRODUCT_LEAVES)) {
    for (const key of leaves) v[key] = offered(product) ? round2(source[key] * f) : 0;
    if (!offered(product)) v[PRODUCT_COUNTS[product]] = 0;
  }
  v.available_cash = round2(source.available_cash * f);

  for (const [product, rollups] of Object.entries(PRODUCT_ROLLUPS)) {
    for (const [target, parts] of rollups) {
      if (offered(product)) rollup(target, parts);
      else v[target] = 0;
    }
  }
  PORTFOLIO_ROLLUPS.forEach(([target, parts]) => rollup(target, parts));

  v.savings_earnings_lifetime = source.savings_earnings
    ? round2(source.savings_earnings_lifetime * (v.savings_earnings / source.savings_earnings))
    : round2(source.savings_earnings_lifetime * f);

  return v;
}

function lifecycleLabel(years) {
  if (years < 1) return `${Math.round(years * 12)} months`;
  return `${years} year${years === 1 ? "" : "s"}`;
}

/** Persona one-liner built from what the persona actually holds in the market. */
function marketBlurb(personaId, v) {
  const savingsCount = v.fix_term_bank_count + v.overnight_bank_count + v.notice_bank_count;
  const invest = [v.dwm_total ? "DWM" : null, v.money_market_total ? "Money market" : null, v.pension_total ? "Rürup" : null].filter(Boolean);
  return [
    `${lifecycleLabel(LIFECYCLE_YEARS[personaId])} on platform`,
    savingsCount === 1 ? "one savings product" : `${savingsCount} savings products`,
    invest.length ? invest.join(" + ") : "savings only",
  ].join(" · ");
}

function bankProduct(v, slotKey, idPrefix, rate, pending = 0) {
  const total = v[`${slotKey}_total`] ?? 0;
  if (!total) return null;
  const slot = BANK_SLOTS[slotKey];
  return {
    id: `${idPrefix}-${slotKey.slice(-1)}`,
    registryKey: slotKey,
    bank: slot.name,
    country: slot.country,
    rating: slot.rating,
    letter: slot.letter,
    tone: slot.tone,
    amount: total,
    earnings: v[`${slotKey}_earnings`] ?? 0,
    ratePct: rate * 100,
    rate: rateLabel(rate),
    termLabel: slot.termLabel,
    maturity: slot.maturity,
    progress: slot.progress,
    pending,
  };
}

function termYearsLabel(years) {
  if (years === 1) return "1 year";
  if (Number.isInteger(years)) return `${years} years`;
  const months = Math.round(years * 12);
  if (months === 12) return "1 year";
  if (months % 12 === 0) return `${months / 12} years`;
  return `${months} months`;
}

function pendingProduct(id, bank, amount, letter, tone, opts = {}) {
  if (!amount) return null;
  const subId = opts.subId ?? "fixed-term";
  const ratePct =
    opts.ratePct ??
    (subId === "overnight" ? RATES.overnight * 100 : subId === "notice" ? RATES.notice * 100 : RATES.fixed_term * 100);
  return {
    id,
    bank,
    country: opts.country ?? "Germany",
    letter,
    tone,
    amount,
    earnings: 0,
    ratePct,
    rate: formatPercent(ratePct, 2),
    termLabel: opts.termLabel ?? "Awaiting transfer",
    subId,
    isPending: true,
    progress: 0,
  };
}

function buildSavings(v, personaId) {
  const terms = EARNING_TERMS[personaId];
  const ftPending = (v.fixed_term_pending_bank_a ?? 0) + (v.fixed_term_pending_bank_b ?? 0);
  const onPending = v.overnight_pending_bank_a ?? 0;

  const fixedTerm = {
    id: "fixed-term",
    label: "Fixed-term deposits",
    registryKey: "fix_term_total",
    amount: v.fix_term_total,
    earnings: v.fix_term_earnings,
    ratePct: RATES.fixed_term * 100,
    termYears: terms.fixed_term,
    activeCount: v.fix_term_bank_count,
    pending: ftPending,
    products: [
      bankProduct(v, "fix_term_bank_a", "ftd", RATES.fixed_term),
      bankProduct(v, "fix_term_bank_b", "ftd", RATES.fixed_term),
      bankProduct(v, "fix_term_bank_c", "ftd", RATES.fixed_term),
      bankProduct(v, "fix_term_bank_d", "ftd", RATES.fixed_term),
      bankProduct(v, "fix_term_bank_e", "ftd", RATES.fixed_term),
      pendingProduct("ftd-pending-a", "Klarna Bank", v.fixed_term_pending_bank_a, "K", "pink", {
        subId: "fixed-term",
        termLabel: termYearsLabel(terms.fixed_term),
      }),
      pendingProduct("ftd-pending-b", "Illimity Bank", v.fixed_term_pending_bank_b, "I", "blue", {
        subId: "fixed-term",
        termLabel: termYearsLabel(terms.fixed_term),
      }),
    ].filter(Boolean),
  };

  const overnight = {
    id: "overnight",
    label: "Overnight deposits",
    registryKey: "overnight_total",
    amount: v.overnight_total,
    earnings: v.overnight_earnings,
    ratePct: RATES.overnight * 100,
    termYears: terms.overnight,
    activeCount: v.overnight_bank_count,
    pending: onPending,
    products: [
      bankProduct(v, "overnight_bank_f", "on", RATES.overnight),
      bankProduct(v, "overnight_bank_g", "on", RATES.overnight),
      pendingProduct("on-pending-a", "Collector Bank", onPending, "C", "blue", {
        subId: "overnight",
        termLabel: "Available daily",
        country: "Sweden",
      }),
    ].filter(Boolean),
  };

  const notice = {
    id: "notice",
    label: "Notice accounts",
    registryKey: "notice_total",
    amount: v.notice_total,
    earnings: v.notice_earnings,
    ratePct: RATES.notice * 100,
    termYears: terms.notice,
    activeCount: v.notice_bank_count,
    pending: 0,
    // notice_bank_i_total is unreliable for HNW (see math check), so the single holding
    // is presented at the authoritative notice_total.
    products: v.notice_total
      ? [
          {
            ...bankProduct({ ...v, notice_bank_i_total: v.notice_total }, "notice_bank_i", "na", RATES.notice),
            earnings: v.notice_earnings,
          },
        ]
      : [],
  };

  return [fixedTerm, overnight, notice];
}

function buildInvestments(v, personaId) {
  const terms = EARNING_TERMS[personaId];
  const dwmProducts = [
    ["dwm_portfolio1", v.dwm_portfolio1_total, v.dwm_portfolio1_earnings],
    ["dwm_portfolio2", v.dwm_portfolio2_total, v.dwm_portfolio2_earnings],
  ]
    .filter(([, total]) => total > 0)
    .map(([key, total, earnings]) => ({
      id: key.replace("_portfolio", "-"),
      registryKey: `${key}_total`,
      bank: IPP_SLOTS[key].name,
      country: IPP_SLOTS[key].meta,
      letter: IPP_SLOTS[key].letter,
      tone: IPP_SLOTS[key].tone,
      amount: total,
      earnings,
      ratePct: RATES.dwm * 100,
      rate: rateLabel(RATES.dwm),
      termLabel: "Managed",
    }));

  const mmProducts = v.money_market_total
    ? [
        {
          id: "mm-1",
          registryKey: "money_market_total",
          bank: IPP_SLOTS.money_market1.name,
          country: IPP_SLOTS.money_market1.meta,
          letter: IPP_SLOTS.money_market1.letter,
          tone: IPP_SLOTS.money_market1.tone,
          amount: v.money_market_total,
          earnings: v.money_market_earnings,
          ratePct: RATES.money_market * 100,
          rate: rateLabel(RATES.money_market),
          termLabel: "Flexible",
        },
      ]
    : [];

  return [
    {
      id: "dwm",
      label: "Digital wealth management",
      registryKey: "dwm_total",
      amount: v.dwm_total,
      earnings: v.dwm_earnings,
      ratePct: RATES.dwm * 100,
      termYears: terms.dwm,
      activeCount: v.dwm_count,
      pending: 0,
      products: dwmProducts,
    },
    {
      id: "money-market",
      label: "Money market",
      registryKey: "money_market_total",
      amount: v.money_market_total,
      earnings: v.money_market_earnings,
      ratePct: RATES.money_market * 100,
      termYears: terms.money_market,
      activeCount: v.mm_count,
      pending: 0,
      products: mmProducts,
    },
  ];
}

function buildRetirement(v, personaId) {
  return [
    {
      id: "etf-rurup",
      label: "ETF Rürup",
      registryKey: "pension_total",
      amount: v.pension_total,
      earnings: v.pension_earnings,
      ratePct: RATES.etf_rurup * 100,
      termYears: EARNING_TERMS[personaId].pension,
      activeCount: v.pension_count,
      pending: 0,
      products: v.pension_total
        ? [
            {
              id: "rurup-1",
              registryKey: "etf_rurup_total",
              bank: IPP_SLOTS.etf_rurup.name,
              country: IPP_SLOTS.etf_rurup.meta,
              letter: IPP_SLOTS.etf_rurup.letter,
              tone: IPP_SLOTS.etf_rurup.tone,
              amount: v.pension_total,
              earnings: v.pension_earnings,
              ratePct: RATES.etf_rurup * 100,
              rate: rateLabel(RATES.etf_rurup),
              termLabel: "Until retirement",
            },
          ]
        : [],
    },
  ];
}

/**
 * Derive the screen model for one persona. Category totals come straight from the registry;
 * only shares and counts are computed, so the prototypes and Figma stay in lockstep.
 */
export function buildPersonaModel(personaId = DEFAULT_PERSONA, marketId = DEFAULT_MARKET) {
  const id = isPersona(personaId) ? personaId : DEFAULT_PERSONA;
  const market = getMarket(marketId);
  const v = buildMarketRegistry(id, market.id);
  const persona = PERSONAS.find((p) => p.id === id);
  const meta = market.id === DEFAULT_MARKET ? persona : { ...persona, blurb: marketBlurb(id, v) };

  const definitions = [
    { id: "savings", label: "Savings", color: "savings", total: v.savings_total, earnings: v.savings_earnings, subcategories: buildSavings(v, id) },
    { id: "investments", label: "Investments", color: "invest", total: v.ipp_total, earnings: v.ipp_earnings, subcategories: buildInvestments(v, id) },
    { id: "retirement", label: "Retirement", color: "retire", total: v.pension_total, earnings: v.pension_earnings, subcategories: buildRetirement(v, id) },
  ];

  const categories = definitions.map((def) => {
    const subcategories = def.subcategories.map((sub) => ({
      ...sub,
      count: `${sub.activeCount} Active`,
      isEmpty: sub.amount === 0,
      pct: pct(sub.amount, def.total),
    }));
    const productCount = subcategories.reduce((n, s) => n + s.products.filter((p) => !p.isPending).length, 0);
    const pendingCount = subcategories.reduce((n, s) => n + s.products.filter((p) => p.isPending).length, 0);
    return {
      ...def,
      amount: def.total,
      subcategories,
      productCount,
      pendingCount,
      typeCount: subcategories.filter((s) => !s.isEmpty).length,
      isEmpty: def.total === 0,
      pct: pct(def.total, v.total_invested),
      pctOfAop: pct(def.total, v.total_assets_on_platform),
      // "Performance" toggle: earnings as a share of the money that produced them.
      perfPct: def.total ? round2((def.earnings / def.total) * 100) : 0,
    };
  });

  const pendingTotal =
    (v.fixed_term_pending_bank_a ?? 0) + (v.fixed_term_pending_bank_b ?? 0) + (v.overnight_pending_bank_a ?? 0);

  return {
    id,
    market: market.id,
    label: meta.label,
    short: meta.short,
    blurb: meta.blurb,
    lifecycleYears: LIFECYCLE_YEARS[id],
    registry: v,
    wealth: {
      aop: v.total_assets_on_platform,
      availableCash: v.available_cash,
      totalInvested: v.total_invested,
      totalPrincipal: v.total_principal,
      totalEarnings: v.total_earnings,
      lifetimeEarnings: v.savings_earnings_lifetime,
      savingsEarnings: v.savings_earnings,
      ippEarnings: v.ipp_earnings,
      pensionEarnings: v.pension_earnings,
      investedPct: pct(v.total_invested, v.total_assets_on_platform),
      cashPct: pct(v.available_cash, v.total_assets_on_platform),
    },
    categories,
    pending: {
      total: pendingTotal,
      count: [v.fixed_term_pending_bank_a, v.fixed_term_pending_bank_b, v.overnight_pending_bank_a].filter(Boolean).length,
    },
    counts: {
      products: categories.reduce((n, c) => n + c.productCount, 0),
      pending: categories.reduce((n, c) => n + c.pendingCount, 0),
    },
  };
}
