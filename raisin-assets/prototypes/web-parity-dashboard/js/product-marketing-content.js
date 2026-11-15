/**
 * Product marketing copy — Web-Dashboard Figma 395:56288 (Products)
 * Savings variants · Investments · Retirement · For Minors
 * Percentages use German formatting (3,50 %) as in the design frames.
 * `products` / `tabProducts` tie each promo to a product type, so markets that do not
 * offer it never advertise it (see `sectionForMarket`).
 */

import { offers } from "./markets.js";

export const SAVINGS_PRODUCT_MARKETING_CARDS = [
  {
    badges: ["Fixed term deposit"],
    products: ["fixed-term"],
    title: "Your future deserves stability",
    body: "Secure returns of up to 3,50% p.a. – no risks or fluctuations for your short-term goals.",
    image: "control/product-marketing-savings-stability.png",
    nav: "products/savings",
  },
  {
    badges: ["Overnight deposit"],
    products: ["overnight"],
    title: "Flexible and secure",
    body: "Earn up to 3,00% p.a. on savings from €1, with no fees and a flexible plan.",
    image: "control/product-marketing-savings-flexible.png",
    nav: "products/savings",
  },
  {
    badges: ["Notice account"],
    products: ["notice"],
    title: "Save smarter, earn more",
    body: "Enjoy competitive rates, secure savings, and the flexibility to plan ahead while your money grows.",
    image: "control/product-marketing-savings-smarter.png",
    nav: "products/savings",
  },
];

export const INVESTMENT_PENSION_HOME_CAROUSEL_TITLE = "Investment and pension products";

export const INVESTMENT_PRODUCT_MARKETING_CARDS = [
  {
    badges: ["Digital Wealth Management"],
    products: ["dwm"],
    title: "Invest now with asset management",
    body: "Invest and earn up to 3,70% p.a. of interest + automatically in a global portfolio developed by experts",
    image: "control/product-marketing-invest-dwm.png",
    nav: "products/investments",
    cta: "Digital Wealth Management",
  },
  {
    badges: ["Money market portfolio"],
    products: ["money-market"],
    title: "Flexible and secure",
    body: "Available daily with 2,08% p.a. interest after all costs",
    image: "control/product-marketing-invest-mmp.png",
    nav: "products/investments",
    cta: "Money market portfolio",
  },
  {
    badges: ["ETF Rürup"],
    products: ["etf-rurup"],
    title: "Deduct over €29,000 from your taxes",
    body:
      "With the Rürup ETF, you can deduct your contributions each year as pension expenses for tax purposes. This can be up to 100% in 2025.",
    image: "control/product-marketing-invest-ruerup.png",
    nav: "products/retirement",
    cta: "Rürup ETF",
  },
];

/** Figma Web-Dashboard-Parity 543:64120 — OV cards in Popular products carousel. */
export const INVESTMENT_PENSION_CAROUSEL_CARDS = [
  {
    products: ["dwm"],
    title: "Wealth Management",
    body: "Invest and earn up to 3.70% p.a. of interest + automatically in a global portfolio developed by experts",
    image: "ds/overview-ov-wealth-management.png",
    nav: "products/investments",
  },
  {
    products: ["etf-rurup"],
    pension: true,
    title: "ETF Rürup",
    body: "Available daily with 2.08% p.a. interest after all costs",
    image: "ds/overview-ov-etf-ruerup.png",
    nav: "products/retirement",
  },
  {
    products: ["etf-rurup"],
    pension: true,
    title: "Altersvorsorgedepot",
    body: "Government-subsidized securities account",
    image: "ds/overview-ov-altersvorsorgedepot.png",
    nav: "products/retirement",
  },
  {
    products: ["dwm"],
    title: "Kinder depo",
    body: "Your child’s future, professionally managed",
    image: "ds/overview-ov-kinder-depo.png",
    nav: "products/investments",
  },
  {
    products: ["fixed-term"],
    savings: true,
    title: "Savings",
    body: "Secure returns of up to 3.50% p.a. with no risks",
    image: "ds/overview-ov-savings.png",
    nav: "products/savings",
  },
];

export const SAVINGS_PRODUCT_SECTION = {
  id: "savings-promo",
  title: "All available products",
  tabs: ["Fix term deposits", "Overnight deposits", "Notice account"],
  tabProducts: ["fixed-term", "overnight", "notice"],
  cards: SAVINGS_PRODUCT_MARKETING_CARDS,
};

export const INVESTMENT_PRODUCT_SECTION = {
  id: "investment-promo",
  title: "Investment products",
  tabs: ["Digital wealth management", "Money market portfolio", "ETF Rürup"],
  tabProducts: ["dwm", "money-market", "etf-rurup"],
  chipsBelow: true,
  cards: INVESTMENT_PRODUCT_MARKETING_CARDS,
};

export const RETIREMENT_PRODUCT_SECTION = {
  id: "retirement-promo",
  title: "Retirement products",
  tabs: ["ETF Rürup", "Altersvorsorgedepot"],
  tabProducts: ["etf-rurup", "etf-rurup"],
  chipsBelow: true,
  cards: [
    {
      badges: ["ETF Rürup"],
      products: ["etf-rurup"],
      title: "Deduct over €29,000 from your taxes",
      body:
        "With the Rürup ETF, you can deduct your contributions each year as pension expenses for tax purposes. This can be up to 100% in 2025.",
      image: "control/product-marketing-invest-ruerup.png",
      nav: "products/retirement",
    },
    {
      badges: ["Unique offering"],
      products: ["etf-rurup"],
      title: "Invest now with asset management",
      body: "Government-subsidized securities account",
      image: "control/product-carousel-altersvorsorgedepot.png",
      nav: "products/retirement",
    },
  ],
};

export const MINORS_PRODUCT_SECTION = {
  id: "minors-promo",
  title: "For Minors",
  tabs: [],
  chipsBelow: true,
  cards: [
    {
      badges: ["Digital Wealth Management", "Money market portfolio"],
      products: ["dwm", "money-market"],
      title: "Your child’s future, professionally managed",
      body:
        "Open a Child Savings Account in just minutes and invest in professionally managed portfolios to support their future from birth to their 18th birthday.",
      image: "control/product-carousel-kinderdepo.png",
      nav: "products/investments",
    },
  ],
};

/* ── Market availability ── */

const availableIn = (market) => (item) => !item.products || item.products.some((p) => offers(market, p));

/**
 * A promo section with only the product types the market offers. Tabs and cards are
 * index-aligned, so they are filtered together. `null` when nothing is left to promote.
 */
export function sectionForMarket(section, market) {
  const keep = (i) => {
    const product = section.tabProducts?.[i];
    const card = section.cards?.[i];
    return (!product || offers(market, product)) && (!card || availableIn(market)(card));
  };
  const aligned = section.tabs?.length && section.tabs.length === section.cards?.length;
  const next = aligned
    ? { ...section, tabs: section.tabs.filter((_, i) => keep(i)), cards: section.cards.filter((_, i) => keep(i)) }
    : { ...section, cards: section.cards?.filter(availableIn(market)) };
  if (next.tabProducts) next.tabProducts = section.tabProducts.filter((_, i) => !aligned || keep(i));
  return next.cards?.length ? next : null;
}

/**
 * Home carousel of investment and pension cards for the market — `null` in savings-only
 * markets, where only the savings card would be left. The title drops "pension" where the
 * market has no pension product.
 */
export function investmentCarouselForMarket(market) {
  const cards = INVESTMENT_PENSION_CAROUSEL_CARDS.filter(availableIn(market));
  if (!cards.some((c) => !c.savings)) return null;
  return {
    title: cards.some((c) => c.pension) ? INVESTMENT_PENSION_HOME_CAROUSEL_TITLE : "Investment products",
    cards,
  };
}
