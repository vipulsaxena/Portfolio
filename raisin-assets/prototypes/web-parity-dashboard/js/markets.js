/**
 * Raisin markets (US excluded) — which product types each market offers and how large a
 * typical portfolio is there. Germany is the baseline: it offers every product and its
 * One Data registry is used unscaled.
 *
 * Products: "Raisin Products by Market" (Confluence compilation, 29 Sep 2026) and
 * "Raisin Product Colors" (Design 5205754022) for the market types.
 * Scale: median AoP of funded customers at day 420, relative to Germany (€30,025) —
 * "CLTV POC dataset" (DT 5971771451). NL €39,166 · ES €25,000 · UK €7,211.
 * No per-customer figure exists for AT, FR, IE, FI, PL or IT; those use launch-year tiers
 * (2016 like ES · 2019 · 2023+) and are flagged `simulatedScale`.
 */

export const SAVINGS_PRODUCTS = ["fixed-term", "overnight", "notice"];
export const INVESTMENT_PRODUCTS = ["dwm", "money-market"];
export const RETIREMENT_PRODUCTS = ["etf-rurup"];
export const ALL_PRODUCTS = [...SAVINGS_PRODUCTS, ...INVESTMENT_PRODUCTS, ...RETIREMENT_PRODUCTS];

const FIXED_OVERNIGHT = ["fixed-term", "overnight"];

export const MARKETS = [
  { id: "de", label: "Germany", flag: "🇩🇪", iso3: "DEU", locale: "de-DE", language: "de", currency: "EUR", products: ALL_PRODUCTS, scale: 1 },
  { id: "nl", label: "Netherlands", flag: "🇳🇱", iso3: "NLD", locale: "nl-NL", language: "nl", currency: "EUR", products: [...SAVINGS_PRODUCTS, ...INVESTMENT_PRODUCTS], scale: 1.3 },
  { id: "at", label: "Austria", flag: "🇦🇹", iso3: "AUT", locale: "de-AT", language: "de", currency: "EUR", products: SAVINGS_PRODUCTS, scale: 0.83, simulatedScale: true },
  { id: "es", label: "Spain", flag: "🇪🇸", iso3: "ESP", locale: "es-ES", language: "es", currency: "EUR", products: SAVINGS_PRODUCTS, scale: 0.83 },
  { id: "gb", label: "United Kingdom", flag: "🇬🇧", iso3: "GBR", locale: "en-GB", language: "en", currency: "GBP", products: SAVINGS_PRODUCTS, scale: 0.24 },
  { id: "ie", label: "Ireland", flag: "🇮🇪", iso3: "IRL", locale: "en-IE", language: "en", currency: "EUR", products: FIXED_OVERNIGHT, scale: 0.6, simulatedScale: true },
  { id: "fr", label: "France", flag: "🇫🇷", iso3: "FRA", locale: "fr-FR", language: "fr", currency: "EUR", products: FIXED_OVERNIGHT, scale: 0.83, simulatedScale: true },
  { id: "fi", label: "Finland", flag: "🇫🇮", iso3: "FIN", locale: "fi-FI", language: "fi", currency: "EUR", products: FIXED_OVERNIGHT, scale: 0.4, simulatedScale: true },
  { id: "pl", label: "Poland", flag: "🇵🇱", iso3: "POL", locale: "pl-PL", language: "pl", currency: "PLN", products: FIXED_OVERNIGHT, scale: 0.4, simulatedScale: true },
  { id: "it", label: "Italy", flag: "🇮🇹", iso3: "ITA", locale: "it-IT", language: "it", currency: "EUR", products: FIXED_OVERNIGHT, scale: 0.4, simulatedScale: true },
];

export const DEFAULT_MARKET = "de";

export const LANGUAGES = [
  { id: "en", label: "English", native: "English" },
  { id: "de", label: "German", native: "Deutsch" },
  { id: "nl", label: "Dutch", native: "Nederlands" },
  { id: "es", label: "Spanish", native: "Español" },
  { id: "fr", label: "French", native: "Français" },
  { id: "it", label: "Italian", native: "Italiano" },
  { id: "pl", label: "Polish", native: "Polski" },
  { id: "fi", label: "Finnish", native: "Suomi" },
];

export const DEFAULT_LANGUAGE = "en";

export const isMarket = (id) => MARKETS.some((m) => m.id === id);
export const isLanguage = (id) => LANGUAGES.some((l) => l.id === id);
export const getMarket = (id) => MARKETS.find((m) => m.id === id) ?? MARKETS.find((m) => m.id === DEFAULT_MARKET);

export const offers = (market, productId) => getMarket(market).products.includes(productId);

/** "all" (DE) · "savings-investment" (NL) · "savings-only" (everyone else). */
export function marketType(market) {
  const { products } = getMarket(market);
  if (RETIREMENT_PRODUCTS.some((p) => products.includes(p))) return "all";
  if (INVESTMENT_PRODUCTS.some((p) => products.includes(p))) return "savings-investment";
  return "savings-only";
}

/** Non-empty savings product types — used for overview donuts in savings-only markets. */
export function activeSavingsSubcategories(categories) {
  const sav = categories.find((c) => c.id === "savings");
  return sav ? sav.subcategories.filter((s) => !s.isEmpty) : [];
}

/** Deposit Catalog distribution channel — assumed to follow the German `raisin_direct_retail_deu` pattern. */
export const catalogChannel = (market) => `raisin_direct_retail_${getMarket(market).iso3.toLowerCase()}`;
