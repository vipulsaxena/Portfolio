/**
 * Locale formatting (Format Standards).
 * https://raisin-jira.atlassian.net/wiki/spaces/RAIS/pages/4498686250
 *
 * Default en-INT (English COM): comma thousands, dot decimals, € X,XXX.XX with a narrow
 * no-break space after €, rates X.XX % p. a., negatives with the true minus U+2212.
 * `setFormatLocale()` switches to another row of the standard; the currency comes from the
 * market, the digit and symbol rules from the locale.
 */

const NNBSP = "\u202F";
const MINUS = "\u2212";

/**
 * One row of the Format Standards table. `ui` / `text` / `signed` receive the currency
 * symbol and the formatted digits. en-INT keeps its text form as `X,XXX.XX €`.
 */
const LOCALES = {
  "en-INT": {
    group: ",", decimal: ".", dateSep: ".", pctSpace: true,
    ui: (s, n) => `${s}${NNBSP}${n}`,
    text: (s, n) => `${n}${NNBSP}${s}`,
    signed: null,
    rate: (n) => `${n}${NNBSP}%${NNBSP}p.${NNBSP}a.`,
  },
  "en-GB": {
    group: ",", decimal: ".", dateSep: ".", pctSpace: false,
    ui: (s, n) => `${s}${NNBSP}${n}`,
    text: (s, n) => `${s}${n}`,
    signed: (s, n) => `${s}${n}`,
    rate: (n) => `${n}%${NNBSP}AER`,
  },
  "en-IE": {
    group: ",", decimal: ".", dateSep: ".", pctSpace: false,
    ui: (s, n) => `${s}${n}`,
    text: (s, n) => `${s}${n}`,
    signed: (s, n) => `${s}${n}`,
    rate: (n) => `${n}%${NNBSP}AER`,
  },
  "de-DE": {
    group: ".", decimal: ",", dateSep: ".", pctSpace: true,
    ui: (s, n) => `${n}${NNBSP}${s}`,
    text: (s, n) => `${n}${NNBSP}${s}`,
    signed: (s, n) => `${n}${NNBSP}${s}`,
    rate: (n) => `${n}${NNBSP}%${NNBSP}p.${NNBSP}a.`,
  },
  "de-AT": null,
  "nl-NL": {
    group: ".", decimal: ",", dateSep: "-", pctSpace: false,
    ui: (s, n) => `${s}${NNBSP}${n}`,
    text: (s, n) => `${s}${NNBSP}${n}`,
    signed: (s, n) => `${s}${NNBSP}${n}`,
    rate: (n) => `${n}%${NNBSP}p.j.`,
  },
  "fi-FI": {
    group: NNBSP, decimal: ",", dateSep: ".", pctSpace: true,
    ui: (s, n) => `${n}${NNBSP}${s}`,
    text: (s, n) => `${n}${NNBSP}${s}`,
    signed: (s, n) => `${n}${NNBSP}${s}`,
    rate: (n) => `${n}${NNBSP}%${NNBSP}p.${NNBSP}a.`,
  },
  "fr-FR": {
    group: NNBSP, decimal: ",", dateSep: "/", pctSpace: true,
    ui: (s, n) => `${n}${NNBSP}${s}`,
    text: (s, n) => `${n}${NNBSP}${s}`,
    signed: (s, n) => `${n}${NNBSP}${s}`,
    rate: (n) => `${n}${NNBSP}%${NNBSP}p.${NNBSP}a.`,
  },
  "it-IT": {
    group: ".", decimal: ",", dateSep: ".", pctSpace: false,
    ui: (s, n) => `${n}${NNBSP}${s}`,
    text: (s, n) => `${n}${NNBSP}${s}`,
    signed: (s, n) => `${n}${NNBSP}${s}`,
    rate: (n) => `${n}%${NNBSP}annuo lordo`,
  },
  "pl-PL": {
    group: NNBSP, decimal: ",", dateSep: ".", pctSpace: true,
    ui: (s, n) => `${n}${NNBSP}${s}`,
    text: (s, n) => `${n}${NNBSP}${s}`,
    signed: (s, n) => `${n}${NNBSP}${s}`,
    rate: (n) => `${n}${NNBSP}%${NNBSP}w skali roku`,
  },
  "es-ES": {
    group: ".", decimal: ",", dateSep: "/", pctSpace: true,
    ui: (s, n) => `${n}${NNBSP}${s}`,
    text: (s, n) => `${n}${NNBSP}${s}`,
    signed: (s, n) => `${n}${NNBSP}${s}`,
    rate: (n) => `${n}${NNBSP}%${NNBSP}TIN`,
  },
};
LOCALES["de-AT"] = LOCALES["de-DE"];

const SYMBOLS = { EUR: "€", GBP: "£", PLN: "zł" };

/** The złoty sign always follows the amount, whatever the locale's € position. */
const SUFFIX_ONLY = new Set(["PLN"]);

let spec = LOCALES["en-INT"];
let localeId = "en-INT";
let currency = "EUR";
let symbol = SYMBOLS.EUR;

/** Native locale of each UI language when it is not the market's own language. */
const LANGUAGE_LOCALE = { en: "en-INT", de: "de-DE", nl: "nl-NL", es: "es-ES", fr: "fr-FR", it: "it-IT", pl: "pl-PL", fi: "fi-FI" };

/**
 * Locale for a UI language in a market: the market's own row when the language matches it
 * (English in the UK → en-GB, German in Austria → de-AT), otherwise the language's row.
 */
export function resolveFormatLocale(language, market) {
  if (market && language === market.language) return market.locale;
  return LANGUAGE_LOCALE[language] ?? "en-INT";
}

export function setFormatLocale(id = "en-INT", currencyCode = "EUR") {
  localeId = LOCALES[id] ? id : "en-INT";
  spec = LOCALES[localeId];
  currency = SYMBOLS[currencyCode] ? currencyCode : "EUR";
  symbol = SYMBOLS[currency];
}

export const currentFormatLocale = () => ({ locale: localeId, currency, symbol });

const isLegacy = () => localeId === "en-INT";

const nfCache = new Map();
function nfDigits(digits) {
  if (!nfCache.has(digits)) {
    nfCache.set(digits, new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  }
  return nfCache.get(digits);
}

const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** en-US digits re-punctuated for the locale, so 4-digit amounts group everywhere. */
function localise(enUs) {
  if (isLegacy()) return enUs;
  return enUs.replace(/[,.]/g, (ch) => (ch === "," ? spec.group : spec.decimal));
}

const digits = (n, fractionDigits) => localise(nfDigits(fractionDigits).format(n));

const ui = (n) => (SUFFIX_ONLY.has(currency) ? `${n}${NNBSP}${symbol}` : spec.ui(symbol, n));
const text = (n) => (SUFFIX_ONLY.has(currency) ? `${n}${NNBSP}${symbol}` : spec.text(symbol, n));

/** Amount without currency symbol — always 2 fraction digits. */
export function formatMoney(n) {
  return digits(n, 2);
}

/** @deprecated Use formatMoney — kept for imports. */
export const formatMoneyDe = formatMoney;

/** UI currency — en-INT: € 1,234.56 */
export function formatEurBefore(n) {
  return ui(formatMoney(n));
}

/** Text / suffix form — en-INT: 1,234.56 € */
export function formatEurAfter(n) {
  return text(formatMoney(n));
}

/** Whole amount, UI form. */
export function formatEurBeforeWhole(n) {
  return ui(localise(nf0.format(n)));
}

/** Whole amount, text form. */
export function formatEurAfterWhole(n) {
  return text(localise(nf0.format(n)));
}

/** Interest rate — en-INT: 2.56 % p. a. */
export function formatRatePa(ratePctOrString) {
  let num;
  if (typeof ratePctOrString === "number") {
    num = ratePctOrString;
  } else {
    const raw = String(ratePctOrString).replace(/[^\d,.-]/g, "").replace(",", ".");
    num = Number.parseFloat(raw);
    if (!Number.isFinite(num)) return String(ratePctOrString);
  }
  return spec.rate(digits(num, 2));
}

/** Signed amount without the sign's currency rules — the locale's (+ / −) column. */
function signedBody(abs) {
  const n = formatMoney(abs);
  if (SUFFIX_ONLY.has(currency)) return `${n}${NNBSP}${symbol}`;
  return spec.signed(symbol, n);
}

/** Signed currency — en-INT: +€ X,XXX.XX / −€ X,XXX.XX (UI, symbol first). */
export function formatSignedEur(n, position = "before") {
  const sign = n < 0 ? MINUS : "+";
  if (isLegacy()) {
    const fmt = position === "before" ? formatEurBefore : formatEurAfter;
    return `${sign}${fmt(Math.abs(n))}`;
  }
  return `${sign}${signedBody(Math.abs(n))}`;
}

const pad2 = (v) => String(v).padStart(2, "0");

/** Calendar date — dd.mm.yyyy (en-INT); dd-mm-yyyy (nl), dd/mm/yyyy (fr, es). */
export function formatDateDe(date) {
  const d = date instanceof Date ? date : new Date(date);
  return [pad2(d.getDate()), pad2(d.getMonth() + 1), d.getFullYear()].join(spec.dateSep);
}

/** Chart axis month — mm.yyyy */
export function formatMonthYearDe(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${pad2(d.getMonth() + 1)}${spec.dateSep}${d.getFullYear()}`;
}

/** Maturity line on deposit rows — One Data dates are dd.mm.yyyy; re-punctuated per locale. */
export function formatMaturingLabel(dateStr) {
  if (!dateStr) return "";
  return `Maturing${NNBSP}${String(dateStr).replace(/\./g, spec.dateSep)}`;
}

/** Catalog / API rate string → percent body (no % p.a. suffix). */
export function formatCatalogRate(rate) {
  const raw = String(rate).replace(/[^\d,.-]/g, "").replace(",", ".");
  const num = Number.parseFloat(raw);
  if (!Number.isFinite(num)) return String(rate);
  return digits(num, 2);
}

/** Compact chart axis top label — € 12K */
export function formatAxisEurTop(value) {
  if (value <= 0) return ui("0");
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const top = [1, 2, 5, 10].map((s) => s * magnitude).find((s) => s >= value) ?? magnitude * 10;
  return top >= 1000 ? ui(`${Math.round(top / 1000)}K`) : ui(String(top));
}

/** Share / allocation — 36 % */
export function formatPercent(n, fractionDigits = 0) {
  return `${digits(n, fractionDigits)}${spec.pctSpace ? NNBSP : ""}%`;
}

/** @deprecated Use formatPercent */
export const formatPercentDe = formatPercent;

/** Product-row earnings delta — omit zero; true minus for negatives. */
export function formatProductEarn(n, position = "before") {
  if (n == null || n === 0) return null;
  return formatSignedEur(n, position);
}

/** Progress / scrubber — 97 % */
export function formatProgressPercent(n, fractionDigits = 0) {
  return formatPercent(n, fractionDigits);
}
