/**
 * Deposit Catalog adapter — turns `GET /v1/public/products` into offer view models.
 *
 * API definition:
 * https://dev.raisin.systems/catalog/default/api/deposit-catalog-management-service-api/definition#/Deposit%20product/get-v1-public-products
 *
 * The endpoint is unauthenticated but only routable from the Raisin network, so the
 * prototype tries the live API first and falls back to `data/catalog-snapshot.json`,
 * which is stored in the same response shape. Nothing downstream knows the difference.
 */

import { DEFAULT_MARKET, catalogChannel, getMarket, offers as marketOffers } from "./markets.js";

const DEFAULT_QUERY = {
  distributor_id: "Raisin",
  distribution_channel_id: "raisin_direct_retail_deu",
  country_code: "DEU",
  limit: "100",
  offset: "0",
};

const TYPE_LABELS = {
  TERM: { id: "fixed-term", label: "Fixed-term deposit", short: "Fixed term" },
  OVERNIGHT: { id: "overnight", label: "Overnight deposit", short: "Overnight" },
  NOTICE: { id: "notice", label: "Notice account", short: "Notice" },
};

/** Markets with a `data/catalog-{market}.json` snapshot; others would 404 in the console. */
const MARKET_SNAPSHOTS = new Set([]);

const TONES = ["blue", "navy", "pink", "purple", "red", "green"];

/** Live binding — screens read this; `loadCatalog()` swaps it in once resolved. */
export let CATALOG = { source: "pending", offers: [], byType: { "fixed-term": [], overnight: [], notice: [] } };

const num = (v) => (v == null || v === "" ? null : Number(v));

function termLabel(entry) {
  const period = entry.term?.period;
  const unit = entry.term?.unit;
  if (period && unit === "months") {
    if (period % 12 === 0) return `${period / 12} year${period / 12 > 1 ? "s" : ""}`;
    return `${period} months`;
  }
  if (period && unit) return `${period} ${unit}`;

  const notice = entry.conditions?.termination?.notice_period;
  if (notice?.period) return `${notice.period} ${notice.unit ?? "days"} notice`;
  return entry.product_type === "OVERNIGHT" ? "Available daily" : "Flexible";
}

/** Term in years, used to project what an offer would earn. */
function termYears(entry) {
  const period = entry.term?.period;
  if (period && entry.term?.unit === "months") return period / 12;
  if (period && entry.term?.unit === "years") return period;
  return 1;
}

function badges(entry) {
  const labels = entry.display?.labels ?? [];
  const out = [];
  if (labels.includes("finanztest_best_list")) out.push("Best in class");
  if (entry.deposit_taking_bank?.branch_country?.source_tax_applicable === false) out.push("No source tax");
  else if (labels.includes("no_source_tax")) out.push("No source tax");
  if (labels.includes("top_offers_mobile_dashboard")) out.push("Popular");
  return out;
}

export function normaliseOffer(entry, index = 0) {
  const bank = entry.deposit_taking_bank ?? {};
  const country = bank.branch_country ?? {};
  const rates = entry.interest_rates ?? {};
  const type = TYPE_LABELS[entry.marketed_as_product_type ?? entry.product_type] ?? TYPE_LABELS.TERM;
  const nominal = num(rates.interest_rate_nominal) ?? 0;

  return {
    id: entry.id,
    typeId: type.id,
    type: type.label,
    typeShort: type.short,
    bank: bank.name ?? "Partner bank",
    bankId: bank.id ?? entry.id,
    country: country.name ?? "—",
    rating: country.rating ?? "—",
    countryLabel: `${country.name ?? "—"} (${country.rating ?? "—"})`,
    ratePct: nominal,
    rate: nominal.toFixed(2),
    rateEffective: num(rates.interest_rate_effective),
    term: termLabel(entry),
    termYears: termYears(entry),
    minAmount: num(entry.conditions?.opening?.minimum_amount) ?? 0,
    maxAmount: num(entry.conditions?.maximum_balance_decimal),
    sourceTaxFree: country.source_tax_applicable === false,
    badges: badges(entry),
    letter: (bank.name ?? "R").charAt(0).toUpperCase(),
    tone: TONES[index % TONES.length],
    labels: entry.display?.labels ?? [],
  };
}

function shape(offers, source) {
  const byType = { "fixed-term": [], overnight: [], notice: [] };
  offers.forEach((offer) => byType[offer.typeId]?.push(offer));
  Object.values(byType).forEach((list) => list.sort((a, b) => b.ratePct - a.ratePct));
  return { source, offers: [...offers].sort((a, b) => b.ratePct - a.ratePct), byType };
}

function marketQuery(marketId) {
  if (marketId === DEFAULT_MARKET) return DEFAULT_QUERY;
  return { ...DEFAULT_QUERY, distribution_channel_id: catalogChannel(marketId), country_code: getMarket(marketId).iso3 };
}

function buildUrl(marketId) {
  const cfg = globalThis.RAISIN_CATALOG ?? {};
  if (!cfg.baseUrl) return null;
  const url = new URL(`${String(cfg.baseUrl).replace(/\/$/, "")}/v1/public/products`);
  Object.entries({ ...marketQuery(marketId), ...(cfg.query ?? {}) }).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

async function fetchJson(url, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve the catalog for a market. Live API when reachable, then the market's snapshot
 * (`data/catalog-{market}.json`), then the German snapshot limited to the deposit types
 * the market sells — the prototype must always render offers, so failures downgrade.
 */
export async function loadCatalog(marketId = DEFAULT_MARKET) {
  const liveUrl = buildUrl(marketId);
  const sellable = (offer) => marketOffers(marketId, offer.typeId);

  if (liveUrl) {
    try {
      const payload = await fetchJson(liveUrl);
      const offers = (payload.entries ?? []).map(normaliseOffer);
      if (offers.length) {
        CATALOG = shape(offers, "live");
        return CATALOG;
      }
    } catch {
      // fall through to the snapshot
    }
  }

  if (marketId !== DEFAULT_MARKET && MARKET_SNAPSHOTS.has(marketId)) {
    try {
      const payload = await fetchJson(`data/catalog-${marketId}.json`);
      const offers = (payload.entries ?? []).map(normaliseOffer).filter(sellable);
      if (offers.length) {
        CATALOG = shape(offers, "snapshot");
        return CATALOG;
      }
    } catch {
      // no market snapshot yet
    }
  }

  try {
    const payload = await fetchJson("data/catalog-snapshot.json");
    CATALOG = shape((payload.entries ?? []).map(normaliseOffer).filter(sellable), "snapshot");
  } catch {
    CATALOG = shape([], "unavailable");
  }
  return CATALOG;
}

/** Top offers for a category, ordered by rate. `investments`/`retirement` have no catalog feed yet. */
export function offersFor(categoryId, limit = 4) {
  if (categoryId === "savings" || !categoryId) return CATALOG.offers.slice(0, limit);
  if (CATALOG.byType[categoryId]) return CATALOG.byType[categoryId].slice(0, limit);
  return [];
}

export function findOffer(id) {
  return CATALOG.offers.find((o) => o.id === id) ?? null;
}

/** Best available rate, used for "you could earn more" style prompts. */
export function topRate(typeId) {
  const list = typeId ? CATALOG.byType[typeId] ?? [] : CATALOG.offers;
  return list[0] ?? null;
}
