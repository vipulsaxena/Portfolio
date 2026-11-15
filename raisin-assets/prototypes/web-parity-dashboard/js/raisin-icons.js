/**
 * Raisin Design System icons (Foundation file) — single source for Control, A and B.
 * Assets live under assets/figma/ds/.
 */

export const DS_ASSETS = "assets/figma/ds";

/** MobileAppIcons-24px — Foundation BefblnCjiI04TIdU3M1oWe (Savings / Investments / Rürup). */
const CATEGORY_FILES = {
  savings: "raisin-savings.svg",
  investments: "raisin-invest.svg",
  retirement: "raisin-pensions.svg",
};

const PRODUCT_FILES = {
  "fixed-term": "product-fixed-term.svg",
  fixed: "product-fixed-term.svg",
  overnight: "product-overnight.svg",
  notice: "product-notice.svg",
  dwm: "product-dwm.svg",
  "money-market": "product-etf.svg",
  "etf-rurup": "product-ruerup.svg",
  etf: "product-etf.svg",
  ruerup: "product-ruerup.svg",
  rürup: "product-ruerup.svg",
};

const UI_FILES = {
  portfolio: "icon-portfolio.svg",
  wallet: "icon-wallet.svg",
  payments: "icon-payments.svg",
  pie: "icon-pie.svg",
  raisinSymbol: "icon-raisin-symbol.svg",
};

/** Rendered size inside 56px allocation rings (24px DS glyph ÷ 1.5). */
export const RING_CENTER_ICON_PX = 16;

/** Center glyph inside allocation rings — RaisinIcons-24px / RaisinProductIcons-24px (Foundation). */
const RING_CENTER = {
  savings: () => categoryIconUrl("savings"),
  invest: () => categoryIconUrl("investments"),
  retire: () => categoryIconUrl("retirement"),
  investments: () => categoryIconUrl("investments"),
  retirement: () => categoryIconUrl("retirement"),
  portfolio: () => uiIconUrl("portfolio"),
  wallet: () => uiIconUrl("wallet"),
  raisin: () => uiIconUrl("wallet"),
  pie: () => uiIconUrl("pie"),
  s1: () => productIconUrl("fixed-term"),
  s2: () => productIconUrl("overnight"),
  s3: () => productIconUrl("notice"),
  "fixed-term": () => productIconUrl("fixed-term"),
  overnight: () => productIconUrl("overnight"),
  notice: () => productIconUrl("notice"),
  dwm: () => productIconUrl("dwm"),
  ruerup: () => productIconUrl("ruerup"),
  "etf-rurup": () => productIconUrl("etf-rurup"),
};

/** Portfolio / ring color ids from One Data (`color` field). */
const COLOR_KIND_TO_CATEGORY = {
  savings: "savings",
  invest: "investments",
  retire: "retirement",
};

export function categoryIconUrl(categoryId) {
  const file = CATEGORY_FILES[categoryId] ?? CATEGORY_FILES.savings;
  return `${DS_ASSETS}/${file}`;
}

export function productIconUrl(productKey) {
  const file = PRODUCT_FILES[productKey] ?? PRODUCT_FILES["fixed-term"];
  return `${DS_ASSETS}/${file}`;
}

export function uiIconUrl(kind) {
  const file = UI_FILES[kind] ?? UI_FILES.pie;
  return `${DS_ASSETS}/${file}`;
}

/** Subcategory row icon — savings product types, DWM, money market, ETF Rürup, etc. */
export function subcategoryIconUrl(subcategoryId, categoryId) {
  if (PRODUCT_FILES[subcategoryId]) return productIconUrl(subcategoryId);
  if (categoryId === "investments") return productIconUrl("dwm");
  if (categoryId === "retirement") return productIconUrl("etf-rurup");
  return categoryIconUrl(categoryId);
}

export function resolveIconUrl({ kind, categoryId, subcategoryId, iconKey } = {}) {
  if (iconKey) {
    if (UI_FILES[iconKey]) return uiIconUrl(iconKey);
    if (PRODUCT_FILES[iconKey]) return productIconUrl(iconKey);
    if (CATEGORY_FILES[iconKey]) return categoryIconUrl(iconKey);
  }
  if (subcategoryId && categoryId) return subcategoryIconUrl(subcategoryId, categoryId);
  if (subcategoryId) return productIconUrl(subcategoryId);
  if (kind && COLOR_KIND_TO_CATEGORY[kind]) return categoryIconUrl(COLOR_KIND_TO_CATEGORY[kind]);
  if (kind && CATEGORY_FILES[kind]) return categoryIconUrl(kind);
  if (kind && PRODUCT_FILES[kind]) return productIconUrl(kind);
  if (kind && UI_FILES[kind]) return uiIconUrl(kind);
  if (categoryId) return categoryIconUrl(categoryId);
  return categoryIconUrl("savings");
}

export function iconImg({ src, size = 24, className = "ds-icon" }) {
  return `<img class="${className}" src="${src}" width="${size}" height="${size}" alt="" loading="lazy" decoding="async" />`;
}

export function markIconHtml(opts = {}) {
  const src = resolveIconUrl(opts);
  const size = opts.size ?? 24;
  return iconImg({ src, size });
}

export function ringCenterIconHtml(kind = "pie", size = RING_CENTER_ICON_PX) {
  const src = (RING_CENTER[kind] ?? RING_CENTER.pie)();
  return iconImg({ src, size, className: "ds-icon ds-icon--ring" });
}

/** Icon tile in `ds-mark` footprint (wallet actions, nav rows, pending DWM). */
export function tileIconHtml(kind, size = 20) {
  const src = (RING_CENTER[kind] ?? (() => resolveIconUrl({ kind })))();
  return iconImg({ src, size, className: "ds-icon ds-icon--tile" });
}

export function categoryIconForColor(color) {
  return categoryIconUrl(COLOR_KIND_TO_CATEGORY[color] ?? color ?? "savings");
}

/** Resolve `src` for portfolio rows — accepts legacy control filenames or full paths. */
export function rowIconSrc(icon) {
  if (!icon) return categoryIconUrl("savings");
  if (icon.startsWith("assets/") || icon.startsWith("/")) return icon;
  const legacy = {
    "icon-product-fixed-term.svg": productIconUrl("fixed-term"),
    "icon-product-overnight.svg": productIconUrl("overnight"),
    "icon-product-notice.svg": productIconUrl("notice"),
    "icon-product-generic.svg": productIconUrl("dwm"),
  };
  return legacy[icon] ?? `${DS_ASSETS}/${icon.replace(/^.*\//, "")}`;
}
