/**
 * Persona-bound view of One Data — every screen imports from here.
 *
 * Exports are `let` bindings on purpose: ES module bindings are live, so calling
 * `setPersona()` and re-rendering updates Control, Hypothesis A and Hypothesis B
 * from the same source in one pass. Source registry: `js/one-data.js`.
 */

import { CATALOG, offersFor } from "./catalog.js";
import {
  formatEurAfter,
  formatEurAfterWhole,
  formatEurBefore,
  formatEurBeforeWhole,
  formatRatePa,
  resolveFormatLocale,
  setFormatLocale,
} from "./format.js";
import { DEFAULT_LANGUAGE, DEFAULT_MARKET, getMarket, isLanguage, isMarket, offers } from "./markets.js";

export {
  formatEurAfter,
  formatEurBefore,
  formatRatePa,
  formatProductEarn,
  formatSignedEur,
  formatPercent,
  formatPercentDe,
} from "./format.js";
import { DEFAULT_PERSONA, PERSONAS, buildPersonaModel, isPersona } from "./one-data.js";

export { PERSONAS, DEFAULT_PERSONA, isPersona };

/** Default UI currency — en-INT: € X,XXX.XX */
export const fmt = formatEurBefore;

/** Whole euros (UI, symbol first). */
export const fmt0 = formatEurBeforeWhole;

export let PERSONA = DEFAULT_PERSONA;
/** Market and UI language — Germany and English unless the link or the switcher says otherwise. */
export let MARKET = DEFAULT_MARKET;
export let LANGUAGE = DEFAULT_LANGUAGE;
export let MODEL = buildPersonaModel(PERSONA, MARKET);
export let WEALTH = MODEL.wealth;
export let CATEGORIES = MODEL.categories;
export let AOP_TABS = [];
export let ATTENTION_ITEMS = [];
export let WALLET_TRANSACTIONS = [];
export let PRODUCT_OFFERS = { savings: [], investments: [], retirement: [] };
export let PRODUCT_CATEGORIES = [];

/** Hypothesis B — production-style sub-nav (Home + categories + Wallet). */
export const PRODUCTION_TABS = [
  { id: "overview", label: "Home" },
  { id: "savings", label: "Savings" },
  { id: "investments", label: "Investments" },
  { id: "retirement", label: "Retirement" },
  { id: "wallet", label: "Wallet" },
];

export let SIGNPOST_ITEMS = [];

function buildAopTabs(model) {
  return [
    { id: "overview", label: "Overview", amount: model.wealth.aop, color: "navy" },
    ...model.categories.map((c) => ({ id: c.id, label: c.label, amount: c.amount, color: c.color })),
  ];
}

/**
 * Attention items are data-driven: a persona with no pending order must not be told
 * it has one, and the rate prompt quotes whatever the catalog actually returned.
 */
function buildAttention(model) {
  const items = [];
  const best = CATALOG.offers[0];

  if (model.pending.total > 0) {
    items.push({
      id: "pending",
      severity: "warning",
      title: `${model.pending.count} pending deposit${model.pending.count > 1 ? "s" : ""}`,
      body: `${fmt(model.pending.total)} in fixed-term and overnight orders are processing.`,
      cta: "View orders",
      dismissible: true,
    });
  }

  if (model.wealth.availableCash < 1000) {
    items.push({
      id: "balance",
      severity: "critical",
      title: "Low Raisin Account balance",
      body: `${fmt(model.wealth.availableCash)} available. Top up to keep orders and savings plans running.`,
      cta: "Add money",
      dismissible: false,
    });
  }

  if (best) {
    items.push({
      id: "rate",
      severity: "info",
      title: `New rate available — ${formatRatePa(best.rate)}`,
      body: `${best.bank} · ${best.term} · ${best.countryLabel}. Above your current ${formatRatePa(model.categories[0].subcategories[0].ratePct)} fixed-term rate.`,
      cta: "Explore",
      dismissible: true,
    });
  }

  items.push(
    {
      id: "kyc",
      severity: "critical",
      title: "Time to re-authenticate your account",
      body: "Your KYC has expired. Re-authenticate within 3 months to keep your Raisin account active.",
      cta: "Retry identification",
      dismissible: false,
    },
    {
      id: "tax",
      severity: "info",
      title: "Tax document ready",
      body: `Your annual tax statement covers ${fmt(model.wealth.totalEarnings)} in earnings.`,
      cta: "Download",
      dismissible: true,
    },
    {
      id: "referral",
      severity: "info",
      title: `Invite friends, earn ${formatEurBefore(50)}`,
      body: "Share your referral link before 30 September.",
      cta: "Share",
      dismissible: true,
    },
    {
      id: "survey",
      severity: "info",
      title: "Help us improve",
      body: "2-minute survey about your dashboard experience.",
      cta: "Start",
      dismissible: true,
    }
  );

  return items;
}

/** Recent activity — Figma wallet rail (Aka bank, Collector, Top-up) with bank avatars. */
function buildTransactions(model) {
  const savings = model.categories[0];
  const overnight = savings.subcategories[1];
  const fixed = savings.subcategories[0];
  const collector =
    overnight.products.find((p) => p.bank.includes("Collector"))?.bank ??
    savings.subcategories.flatMap((s) => s.products).find((p) => p.bank.includes("Collector"))?.bank ??
    "Collector Bank";
  const rows = [
    {
      bank: "EM Bank",
      title: "Aka bank",
      date: "12 Sep",
      meta: "Outgoing transfer",
      amount: -10000,
      reserved: true,
      label: `Outgoing transfer — Aka bank`,
      type: "debit",
    },
    {
      bank: collector,
      title: "Collector",
      date: "8 Sep",
      meta: "Incoming transfer",
      amount: 5000,
      label: `Incoming transfer — Collector`,
      type: "credit",
    },
    {
      isTopUp: true,
      title: "Top-up",
      date: "5 Sep",
      meta: "Raisin Account",
      amount: round(model.wealth.availableCash * 0.2),
      label: "Top-up — Raisin Account",
      type: "credit",
    },
  ];

  if (model.pending.total) {
    rows.unshift({
      bank: fixed.products[0]?.bank ?? "Rietumu Banka",
      title: fixed.products[0]?.bank?.replace(/ Bank.*$/, "") ?? "Rietumu",
      date: "22 Aug",
      meta: "Pending order",
      amount: -model.pending.total,
      reserved: true,
      label: `Pending order — ${fixed.products[0]?.bank ?? "Fixed term"}`,
      type: "debit",
    });
  }

  return rows.slice(0, 4);
}

const round = (n) => Math.round(n * 100) / 100;

/** Map catalog offers onto the legacy offer shape the discovery screens expect. */
function buildOffers(model) {
  const savings = offersFor("savings", 6).map((o) => ({
    id: o.id,
    bank: o.bank,
    rate: formatRatePa(o.rate),
    term: o.term,
    type: o.typeShort,
    ratePct: o.ratePct,
    country: o.countryLabel,
    badges: o.badges,
    minAmount: o.minAmount,
  }));

  const hasInvestments = !model.categories[1].isEmpty;
  const hasPension = !model.categories[2].isEmpty;
  const investmentMarket = offers(model.market, "dwm") || offers(model.market, "money-market");

  return {
    savings,
    investments: [
      { id: "offer-dwm", product: "dwm", bank: "Digital Wealth Management", rate: formatRatePa(2.1), term: "Managed", type: "DWM", missing: false, owned: hasInvestments },
      { id: "offer-mm", product: "money-market", bank: "Money Market", rate: formatRatePa(2.1), term: "Flexible", type: "Money Market", missing: false, owned: hasInvestments },
      { id: "offer-etf", bank: "ETF savings plan", rate: "Varies", term: "Self-directed", type: "ETF", missing: true },
    ].filter((o) => (o.product ? offers(model.market, o.product) : investmentMarket)),
    retirement: [
      { id: "offer-rurup", product: "etf-rurup", bank: "ETF Rürup", rate: formatRatePa(1.17), term: "Tax-advantaged", type: "Pension", missing: false, owned: hasPension },
      { id: "offer-riester", product: "etf-rurup", bank: "Altersvorsorgedepot", rate: "Varies", term: "Subsidised", type: "Pension", missing: true },
    ].filter((o) => offers(model.market, o.product)),
  };
}

function buildProductCategories(model) {
  return model.categories.map((c) => ({
    id: c.id,
    label: c.label,
    desc: c.subcategories.map((s) => s.label).join(" · "),
    icon: c.color,
    count: c.typeCount || c.subcategories.length,
    owned: !c.isEmpty,
  }));
}

function buildSignposts(model) {
  const items = model.categories.flatMap((cat) =>
    cat.subcategories.map((sub) => ({
      id: sub.id,
      label: sub.label,
      icon: cat.color,
      hasProduct: !sub.isEmpty,
    }))
  );
  items.push({ id: "discover", label: "Discover more", icon: "discover", missing: true });
  return items;
}

/** Recompute every persona-bound binding. Call this, then re-render. */
export function setPersona(id) {
  PERSONA = isPersona(id) ? id : DEFAULT_PERSONA;
  setFormatLocale(resolveFormatLocale(LANGUAGE, getMarket(MARKET)), getMarket(MARKET).currency);
  MODEL = buildPersonaModel(PERSONA, MARKET);
  WEALTH = MODEL.wealth;
  CATEGORIES = MODEL.categories;
  AOP_TABS = buildAopTabs(MODEL);
  ATTENTION_ITEMS = buildAttention(MODEL);
  WALLET_TRANSACTIONS = buildTransactions(MODEL);
  PRODUCT_OFFERS = buildOffers(MODEL);
  PRODUCT_CATEGORIES = buildProductCategories(MODEL);
  SIGNPOST_ITEMS = buildSignposts(MODEL);
  return MODEL;
}

/** Switch market: product range, simulated balances and currency all follow. Re-render after. */
export function setMarket(id) {
  MARKET = isMarket(id) ? id : DEFAULT_MARKET;
  return setPersona(PERSONA);
}

/** Switch UI language; formatting follows the language within the current market. Re-render after. */
export function setLanguage(id) {
  LANGUAGE = isLanguage(id) ? id : DEFAULT_LANGUAGE;
  return setPersona(PERSONA);
}

/** Persona blurbs as they read in the current market — the switcher's tooltips. */
export function personaBlurb(id) {
  return buildPersonaModel(id, MARKET).blurb;
}

setPersona(DEFAULT_PERSONA);

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id);
}

export function getSubcategory(catId, subId) {
  return getCategory(catId)?.subcategories.find((s) => s.id === subId);
}

export function getProduct(catId, subId, prodId) {
  return getSubcategory(catId, subId)?.products.find((p) => p.id === prodId);
}
