/*
 * Control variant — Home (1:10261), Savings / Category (1:10396) and
 * Savings / All deposits (12:9931) from the Web-Dashboard-Parity file.
 *
 * Layout, imagery and copy are transcribed from the frames; every figure comes from
 * the active One Data persona via data.js, so Control reconciles with A and B.
 * The donut arcs are exported Figma art at fixed proportions — decorative only.
 */

import { ATTENTION_ITEMS, CATEGORIES, MODEL, WEALTH, fmt } from "./data.js";
import { offersFor } from "./catalog.js";
import {
  formatAxisEurTop,
  formatEurBefore,
  formatMaturingLabel,
  formatPercent,
  formatProgressPercent,
  formatCatalogRate,
  formatRatePa,
  formatSignedEur,
} from "./format.js";
import { bankLogoFile } from "./bank-assets.js";
import { renderControlEarningsWidget, renderControlLifetimeEarningsPage } from "./lifetime-earnings.js";
import { rowIconSrc, subcategoryIconUrl } from "./raisin-icons.js";
import { renderProductionTopHeader } from "./production-header.js";
import {
  INVESTMENT_PRODUCT_SECTION,
  SAVINGS_PRODUCT_SECTION,
  sectionForMarket,
} from "./product-marketing-content.js";
import {
  activeCategories,
  activeSubcategories,
  controlProductTabItems,
  isControlTabActive,
  savingsMenuLevelIds,
} from "./product-tab-model.js";
import { activeSavingsSubcategories, marketType, offers as marketOffers } from "./markets.js";

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const A = "assets/figma/control";

const cat = (id) => CATEGORIES.find((c) => c.id === id);
const savings = () => cat("savings");
/** One savings product type — the sub-levels behind the Savings tab menu. */
const sub = (id) => savings().subcategories.find((s) => s.id === id);

const signedEur = (n) => formatSignedEur(n, "before");

/** Round the earnings chart's upper bound up to a readable 1 / 2 / 5 step. */
function axisTop(value) {
  return formatAxisEurTop(value);
}
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Unsettled orders, carrying the bank each one was placed with. */
const pendingOrders = () =>
  savings()
    .subcategories.flatMap((s) => s.products.filter((p) => p.isPending).map((p) => ({ ...p, subLabel: s.label })))
    .map((p) => ({
      bank: p.bank.replace(/ — pending order$/, ""),
      amount: p.amount,
      meta: `${p.subLabel} · awaiting transfer`,
      logo: bankLogoFile(p.bank),
    }));

/** Pending orders reserve cash in the Raisin Account before they settle. */
function wallet() {
  const reserved = Math.min(MODEL.pending.total, WEALTH.availableCash);
  return {
    balance: WEALTH.availableCash,
    reserved,
    available: WEALTH.availableCash - reserved,
  };
}

const chevron = (cls = "") =>
  `<img class="${cls}" src="${A}/icon-chevron-right.svg" width="24" height="24" alt="" />`;

/* ── Donuts ──────────────────────────────────────────────────────────────
 * The frame exports each arc as its own SVG at fixed proportions. Those can't
 * follow the data, so the ring is drawn from the persona's shares using the
 * palette taken from the exported legend dots.
 */

const DONUT_COLORS = {
  savings: "#62AFFF",
  investments: "#FFC36B",
  retirement: "#75BB6F",
  "fixed-term": "#62AFFF",
  overnight: "#2471C1",
  notice: "#164576",
};

/* Savings-only markets reuse the three hue families per product type (Raisin Product Colors):
 * fixed term Blue 300, overnight Yellow 300, notice Green 300. */
const SAVINGS_ONLY_COLORS = { overnight: "#FFC36B", notice: "#75BB6F" };
const SAVINGS_ONLY_TONES = { overnight: "invest", notice: "retire" };
const savingsOnly = () => marketType(MODEL.market) === "savings-only";
const donutColor = (id) => (savingsOnly() && SAVINGS_ONLY_COLORS[id]) || DONUT_COLORS[id];

const SERIES_COLORS = ["#62AFFF", "#3096FF", "#2471C1", "#1D5A9A", "#164576", "#103154", "#091B2F", "#DFEFFF", "#A7D2FF"];

/** Ring drawn as stroked arcs so each slice is proportional to its amount. */
function ring(slices, { size = 410, stroke = 56 } = {}) {
  const total = slices.reduce((n, s) => n + s.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s, i) => {
      const len = total ? (s.value / total) * c : 0;
      /* Only savings slices drill down, so only those are links. The rest stay
       * hoverable for the read-out but are not focusable or clickable. */
      const link = s.nav
        ? `data-nav="${s.nav}" tabindex="0" role="link" aria-label="${esc(`${s.label}, ${fmt(s.value)}`)}"`
        : "";
      const dash = `<circle class="ctl-donut__arc${s.nav ? " is-linked" : ""}" style="--arc:${s.color}"
        data-slice="${i}" ${link} cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
        stroke-width="${stroke}" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${size / 2} ${size / 2})"></circle>`;
      offset += len;
      return dash;
    })
    .join("");

  return `<svg class="ctl-donut__ring" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(
    slices.map((s) => `${s.label} ${fmt(s.value)}`).join(", ")
  )}">${arcs || `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#E6EDF5" stroke-width="${stroke}" />`}</svg>`;
}

/** Savings holdings, ordered by size — the "all deposits" and "by country" groupings.
 *  Pass a subcategory id to scope the list to one sub-level. */
const savingsHoldings = (subId) =>
  savings()
    .subcategories.filter((s) => !subId || s.id === subId)
    .flatMap((s) =>
      s.products.map((p) => ({
        ...p,
        subId: s.id,
        subLabel: s.label,
        maturityLabel: p.maturity ? formatMaturingLabel(p.maturity) : "",
        renewalLabel: p.progress > 60 ? "Renewal: deactivated" : `Renewal for a ${p.termLabel} term`,
        noticeLabel: s.id === "notice" ? `Notice period: ${p.termLabel}` : "",
      }))
    )
    .sort((a, b) => b.amount - a.amount);

const series = (entries) =>
  entries
    .filter(([, value]) => value > 0)
    .map(([label, value], i) => ({ label, value, color: SERIES_COLORS[i % SERIES_COLORS.length] }));

const DONUTS = {
  category: {
    size: "",
    label: "Your Wealth",
    // Invested portfolio only — Raisin Account cash is shown in the rail, not in this ring.
    amount: () => fmt(WEALTH.totalInvested),
    series: () => {
      if (savingsOnly()) {
        return activeSavingsSubcategories(CATEGORIES).map((s) => ({
          label: s.label,
          value: s.amount,
          color: donutColor(s.id),
          nav: CONTROL_SUBLEVELS.has(s.id) ? `category/${s.id}` : null,
        }));
      }
      return [
        // Savings is the only branch with pages behind it, so it is the only link.
        ...CATEGORIES.map((c) => ({
          label: c.label,
          value: c.amount,
          color: donutColor(c.id),
          nav: c.id === "savings" ? "category/savings" : null,
        })),
      ].filter((s) => s.value > 0);
    },
  },

  product: {
    size: "ctl-donut--savings",
    label: "Savings",
    amount: () => fmt(savings().amount),
    series: () =>
      savings()
        .subcategories.filter((s) => !s.isEmpty)
        .map((s) => ({
          label: s.label,
          value: s.amount,
          color: donutColor(s.id),
          nav: CONTROL_SUBLEVELS.has(s.id) ? `category/${s.id}` : null,
        })),
  },

  /* Bank and country regroup the holdings, so both follow the sub-level in scope. */
  bank: {
    size: "ctl-donut--deposits",
    label: (subId) => (subId ? sub(subId).label : "All Deposits"),
    muted: true,
    amount: (subId) => fmt(subId ? sub(subId).amount : savings().amount),
    series: (subId) => series(savingsHoldings(subId).map((p) => [p.bank, p.amount])),
  },

  country: {
    size: "ctl-donut--deposits",
    label: (subId) => (subId ? sub(subId).label : "All Deposits"),
    muted: true,
    amount: (subId) => fmt(subId ? sub(subId).amount : savings().amount),
    series: (subId) => {
      const byCountry = new Map();
      savingsHoldings(subId).forEach((p) => {
        const key = p.rating ? `${p.country} (${p.rating})` : p.country;
        byCountry.set(key, (byCountry.get(key) ?? 0) + p.amount);
      });
      return series([...byCountry.entries()].sort((a, b) => b[1] - a[1]));
    },
  },
};

const value = (v, subId) => (typeof v === "function" ? v(subId) : v);

/* Hovering a slice reads it out in the middle of the ring, so every slice carries
 * its own share of the total alongside the label the legend already shows. */
function renderDonut(key, subId) {
  const d = DONUTS[key];
  const slices = d.series(subId).filter((s) => s.value > 0);
  const total = slices.reduce((n, s) => n + s.value, 0);
  const share = (v) => (total ? Math.round((v / total) * 100) : 0);

  const legend = slices
    .map(
      (s, i) => `
      <li class="ctl-legend__item" data-slice="${i}" data-label="${esc(`${s.label} (${formatPercent(share(s.value))})`)}"
        data-amount="${esc(fmt(s.value))}">
        <span class="ctl-legend__dot" style="--arc:${s.color}"></span>${esc(s.label)}
      </li>`
    )
    .join("");

  return `
    <div class="ctl-chart" data-control-donut>
      <div class="ctl-donut ${d.size}">
        ${ring(slices)}
        <div class="ctl-donut__center">
          <p class="ctl-donut__label${d.muted ? " ctl-donut__label--muted" : ""}" data-donut-label>${esc(value(d.label, subId))}</p>
          <p class="ctl-donut__amount" data-donut-amount>${esc(value(d.amount, subId))}</p>
        </div>
      </div>
      <ul class="ctl-legend">${legend}</ul>
    </div>`;
}

/* ── Shared chrome ── */

function renderHeader(screen = "overview") {
  return renderProductionTopHeader("control", screen);
}

/* The Savings tab carries a chevron in the frames: it opens the sub-level menu
 * rather than navigating, so "Savings" is the first entry in its own menu. */
const SUBLEVELS = [
  { id: "savings", label: "Savings" },
  { id: "fixed-term", label: "Fix term deposits" },
  { id: "overnight", label: "Overnight deposits" },
  { id: "notice", label: "Notice accounts" },
];

export const CONTROL_SUBLEVELS = new Set(SUBLEVELS.map((s) => s.id));

/** Savings product-type routes (excludes the aggregate `savings` id). */
export const SAVINGS_DRILL_SUBLEVELS = new Set(
  SUBLEVELS.filter((s) => s.id !== "savings").map((s) => s.id)
);

export const SAVINGS_MENU_ITEMS = SUBLEVELS;

const sublevel = (id) => SUBLEVELS.find((s) => s.id === id) ?? SUBLEVELS[0];

function renderSublevelMenu(current) {
  const menuIds = savingsMenuLevelIds();
  const items = SUBLEVELS.filter((s) => menuIds.has(s.id)).map((s) => {
    const isCurrent = s.id === current;
    return `<button type="button" role="menuitem" class="ctl-menu__item${isCurrent ? " is-current" : ""}"
      ${isCurrent ? 'aria-current="page"' : ""} data-nav="category/${s.id}">${esc(s.label)}</button>`;
  }).join("");

  return `<div class="ctl-menu" role="menu" aria-label="Savings sub-levels" hidden>${items}</div>`;
}

function renderTabs(active, sub = "savings") {
  const items = controlProductTabItems();
  if (!items) return "";

  return `
    <div class="ctl-tabs" role="tablist" aria-label="Product areas">
      ${items
        .map((item) => {
          const isActive = isControlTabActive(item, active, sub);
          const inner = `${esc(item.label)}${item.menu ? `<img class="ctl-tab__chevron" src="${A}/icon-chevron-down.svg" width="16" height="16" alt="" />` : ""}`;

          if (item.menu) {
            return `
              <div class="ctl-tab-wrap">
                <button type="button" class="ctl-tab${isActive ? " is-active" : ""}" role="tab" aria-selected="${isActive}"
                  aria-haspopup="menu" aria-expanded="false" data-control-menu>${inner}</button>
                ${renderSublevelMenu(sub)}
              </div>`;
          }
          if (!item.nav) {
            return `<span class="ctl-tab" role="tab" aria-disabled="true">${inner}</span>`;
          }
          return `<button type="button" class="ctl-tab${isActive ? " is-active" : ""}" role="tab" aria-selected="${isActive}" data-nav="${item.nav}">${inner}</button>`;
        })
        .join("")}
    </div>`;
}

const FOOTER_LINKS = ["Impressum", "Datenschutz", "Cookie-Richtlinie", "Rechtliche Dokumente"];
const SOCIALS = ["linkedin", "x", "instagram", "facebook", "youtube"];

/** Production footer (12:12204) — shared by Control, Hypothesis A and B. */
export function renderControlFooter(variantId = "control") {
  const home = `#${variantId}/overview`;
  return `
    <footer class="ctl-footer" data-cursor-src="src/control/Footer.tsx:1">
      <div class="ctl-shell">
        <div class="ctl-footer__top">
          <img class="ctl-logo" src="assets/raisin-logo.svg" width="139" height="32" alt="Raisin" />
          <div class="ctl-footer__social">
            <p class="ctl-footer__follow">Follow us</p>
            <div class="ctl-footer__icons">
              ${SOCIALS.map((id) => `<a href="${home}" aria-label="${esc(id)}"><img src="${A}/social-${id}.svg" alt="" /></a>`).join("")}
            </div>
          </div>
        </div>
        <hr class="ctl-footer__rule" />
        <div class="ctl-footer__bottom">
          <div class="ctl-footer__links">
            <span>© 2024 Raisin SE</span>
            ${FOOTER_LINKS.map((l) => `<a href="${home}">${esc(l)}</a>`).join("")}
          </div>
          <div class="ctl-footer__badges">
            <img src="${A}/badge-climate-action.svg" alt="We take Climate Action" />
            <img src="${A}/badge-tuv.svg" alt="TÜV geprüfter Datenschutz" />
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </div>
        </div>
      </div>
    </footer>`;
}

/* ── Building blocks ── */

const textButton = (label, { leading = "" } = {}) => `
  <button type="button" class="ctl-textbtn${leading ? " ctl-textbtn--leading" : ""}">
    ${esc(label)}${leading ? `<img src="${A}/${leading}" width="24" height="24" alt="" />` : chevron()}
  </button>`;

const alert = ({ mode, title, body, extra = "", cta, link }) => `
  <div class="ctl-alert${mode === "error" ? " ctl-alert--error" : ""}">
    <span class="ctl-alert__icon"><img src="${A}/icon-${mode === "error" ? "error" : "info"}.svg" width="24" height="24" alt="" /></span>
    <div class="ctl-alert__content">
      <div class="ctl-alert__copy">
        <p class="ctl-subtitle">${esc(title)}</p>
        <p>${esc(body)}</p>
        ${extra ? `<p>${esc(extra)}</p>` : ""}
      </div>
      ${cta ? `<div><button type="button" class="ctl-btn">${esc(cta)}</button></div>` : ""}
      ${link ? textButton(link) : ""}
    </div>
  </div>`;

const productRow = ({ icon, tone, name, meta, amount, ret, nav = "category/savings" }) => `
  <button type="button" class="ctl-row" data-nav="${nav}">
    <div class="ctl-row__main">
      <div class="ctl-row__lead">
        <span class="ctl-row__icon${tone ? ` ctl-row__icon--${tone}` : ""}"><img src="${rowIconSrc(icon)}" alt="" width="24" height="24" /></span>
        <span class="ctl-row__copy">
          <span class="ctl-row__name">${esc(name)}</span>
          <span class="ctl-row__meta">${esc(meta)}</span>
        </span>
      </div>
      <div class="ctl-row__trail">
        <div class="ctl-row__amountline"><p class="ctl-row__amount">${esc(amount)}</p></div>
        ${
          ret
            ? `<span class="ctl-return">${esc(ret)}<img src="${A}/icon-info-sm.svg" width="16" height="16" alt="" /></span>`
            : ""
        }
      </div>
    </div>
  </button>`;

const groupHead = (label, count) => `
  <div class="ctl-group-head">
    <h3 class="ctl-subtitle">${esc(label)}</h3>
    <span class="ctl-chip">${esc(count)}</span>
  </div>`;

/** One row per product type held, at the authoritative One Data subtotal. */
const categoryRows = (categoryId) =>
  cat(categoryId)
    .subcategories.filter((s) => !s.isEmpty)
    .map((s) => ({
      icon: subcategoryIconUrl(s.id, categoryId),
      tone:
        categoryId === "savings"
          ? (savingsOnly() && SAVINGS_ONLY_TONES[s.id]) || undefined
          : categoryId === "investments"
            ? "invest"
            : "retire",
      // Savings product types have their own sub-level page; the others land on Savings.
      nav: categoryId === "savings" && CONTROL_SUBLEVELS.has(s.id) ? `category/${s.id}` : "category/savings",
      name: s.label,
      meta: [plural(s.products.filter((p) => !p.isPending).length, "Product"), s.pending ? `${fmt(s.pending)} pending` : null]
        .filter(Boolean)
        .join(" · "),
      amount: fmt(s.amount),
      ret: s.earnings ? signedEur(s.earnings) : undefined,
    }));

/* ── Products marketing card (12:12482) ── */

const MARKETING = [
  {
    heading: SAVINGS_PRODUCT_SECTION.title,
    tabs: SAVINGS_PRODUCT_SECTION.tabs,
    cards: SAVINGS_PRODUCT_SECTION.cards,
  },
  {
    heading: INVESTMENT_PRODUCT_SECTION.title,
    tabs: INVESTMENT_PRODUCT_SECTION.tabs,
    cards: INVESTMENT_PRODUCT_SECTION.cards,
  },
  {
    heading: "All available child investment products",
    chips: ["Digital Wealth Management", "Money market portfolio"],
    title: "Your child’s future, professionally managed",
    body: "Open a Child Savings Account in just minutes and invest in professionally managed portfolios to support their future from birth to their 18th birthday.",
    image: "marketing-child.png",
  },
];

function ctlMarketingArticle(card, { chipsBelow = false } = {}) {
  const chips = card.badges ?? [];
  const chipsHtml = chips.length
    ? `<div class="ctl-labels">${chips.map((c) => `<span class="ctl-chip ctl-chip--lg">${esc(c)}</span>`).join("")}</div>`
    : "";
  const text = `
            <div class="ctl-marketing__text">
              <p class="ctl-subtitle">${esc(card.title)}</p>
              <p class="ctl-body">${esc(card.body)}</p>
            </div>`;
  const copy = chipsBelow ? `${text}${chipsHtml}` : `${chipsHtml}${text}`;
  return `
        <article class="ctl-marketing">
          <div class="ctl-marketing__copy">${copy}</div>
          <img class="ctl-marketing__image" src="assets/figma/${card.image}" width="200" height="200" alt="" loading="lazy" />
        </article>`;
}

function ctlPromoActiveIndex(section, promoTabState = {}) {
  const sectionId = section.id || "product-promo";
  const max = Math.max(0, (section.cards?.length ?? 1) - 1);
  const raw = Number(promoTabState[sectionId]);
  if (!Number.isFinite(raw)) return 0;
  return Math.min(Math.max(0, raw), max);
}

function ctlPromoTabs(tabs, sectionId, activeIndex) {
  return `
    <div class="ctl-underline-tabs ds-product-section__tabs" role="tablist">
      ${tabs
        .map(
          (label, i) => `
        <button type="button" class="ctl-underline-tab${i === activeIndex ? " is-active" : ""}" role="tab"
          aria-selected="${i === activeIndex ? "true" : "false"}" aria-controls="${esc(`${sectionId}-panel-${i}`)}"
          data-promo-tab="${i}" tabindex="${i === activeIndex ? "0" : "-1"}">${esc(label)}</button>`
        )
        .join("")}
    </div>`;
}

function ctlPromoPanels(cards, sectionId, activeIndex, chipsBelow) {
  return `
    <div class="ds-product-section__panels">
      ${cards
        .map(
          (card, i) => `
        <div class="ds-product-section__panel" id="${esc(`${sectionId}-panel-${i}`)}" role="tabpanel"
          data-promo-panel="${i}"${i !== activeIndex ? " hidden" : ""}>
          ${ctlMarketingArticle(card, { chipsBelow })}
        </div>`
        )
        .join("")}
    </div>`;
}

function marketMarketing() {
  const market = MODEL.market;
  const [savings, investments, child] = MARKETING;
  const gate = (s, source) => {
    const section = sectionForMarket(source, market);
    return section
      ? { ...s, id: source.id, chipsBelow: source.chipsBelow, tabs: section.tabs, cards: section.cards }
      : null;
  };
  return [
    gate(savings, SAVINGS_PRODUCT_SECTION),
    gate(investments, INVESTMENT_PRODUCT_SECTION),
    marketOffers(market, "dwm") ? child : null,
  ].filter(Boolean);
}

function renderMarketing(promoTabState = {}) {
  const sections = marketMarketing().map((s) => {
    const sectionId = s.id || "product-promo";
    const tabbed = Boolean(s.tabs?.length && s.cards?.length && s.tabs.length === s.cards.length);
    const chipsBelow = Boolean(s.chipsBelow);

    let body;
    if (tabbed) {
      const activeIndex = ctlPromoActiveIndex({ id: sectionId, cards: s.cards }, promoTabState);
      body = `
        <div class="ctl-section" data-ds-product-section data-product-section-id="${esc(sectionId)}">
          ${ctlPromoTabs(s.tabs, sectionId, activeIndex)}
          ${ctlPromoPanels(s.cards, sectionId, activeIndex, chipsBelow)}
        </div>`;
    } else if (s.cards?.length === 1) {
      body = `<div class="ctl-section">${ctlMarketingArticle(s.cards[0], { chipsBelow })}</div>`;
    } else if (s.cards?.length) {
      body = `<div class="ctl-marketing-stack">${s.cards.map((card) => ctlMarketingArticle(card, { chipsBelow })).join("")}</div>`;
    } else {
      body = `<div class="ctl-section">${ctlMarketingArticle({
        badges: s.chips,
        title: s.title,
        body: s.body,
        image: s.image.startsWith("control/") ? s.image : `control/${s.image}`,
      })}</div>`;
    }

    return `
      <h3 class="ctl-title">${esc(s.heading)}</h3>
      ${body}`;
  }).join("");

  return `<section class="ctl-card" data-cursor-src="src/control/ProductMarketing.tsx:1">${sections}</section>`;
}

/* ── Right rail (12:11173) ── */

const LABEL_TEXT = {
  "no-source-tax": "No source tax",
  sustainable: "Sustainable",
  "market-leading-rate": "Market leading rate",
};

const offerCards = (limit = 5) =>
  offersFor("savings", limit).map((o, i) => ({
    logo: bankLogoFile(o.bank),
    name: o.bank,
    rate: formatRatePa(formatCatalogRate(o.rate)),
    meta: [o.type, o.term, o.countryLabel].filter(Boolean),
    labels: [
      o.sourceTaxFree ? "no-source-tax" : null,
      o.badges.includes("Sustainable") ? "sustainable" : null,
      i === 0 ? "market-leading-rate" : null,
    ].filter(Boolean),
  }));

function renderRail() {
  const w = wallet();
  const offers = offerCards().map(
    (o) => `
      <button type="button" class="ctl-offer" data-nav="category/savings">
        <span class="ctl-offer__head">
          <span class="ctl-row__avatar"><img src="${A}/${o.logo}" alt="" loading="lazy" /></span>
          <span class="ctl-offer__name">${esc(o.name)}</span>
        </span>
        <p class="ctl-offer__rate">${esc(o.rate)}</p>
        <p class="ctl-offer__meta">${o.meta.map(esc).join(" · ")}</p>
        <span class="ctl-labels">
          ${o.labels
            .map(
              (l) =>
                `<span class="ctl-label"><img src="${A}/label-${l}.svg" width="16" height="16" alt="" />${esc(LABEL_TEXT[l])}</span>`
            )
            .join("")}
        </span>
      </button>`
  ).join("");

  return `
    <section class="ctl-card" data-cursor-src="src/control/RaisinAccount.tsx:1">
      <div class="ctl-card__head"><h2 class="ctl-title">Raisin Account</h2></div>
      <div class="ctl-account__body">
        <p class="ctl-account__amount">${esc(fmt(w.balance))}</p>
        <div>
          <img class="ctl-account__divider" src="${A}/divider.svg" width="360" height="1" alt="" />
          <dl class="ctl-account__list">
            <dt>Available balance<img src="${A}/icon-info-16.svg" width="16" height="16" alt="" /></dt>
            <dd>${esc(fmt(w.available))}</dd>
          </dl>
          <dl class="ctl-account__list">
            <dt>Reserved balance<img src="${A}/icon-info-16.svg" width="16" height="16" alt="" /></dt>
            <dd>${esc(fmt(w.reserved))}</dd>
          </dl>
        </div>
      </div>
    </section>

    ${renderControlEarningsWidget()}

    <section class="ctl-card ctl-ad" data-cursor-src="src/control/AdBanner.tsx:1">
      <div class="ctl-ad__body">
        <div class="ctl-ad__copy">
          <h2 class="ctl-title">Refer your friends and you can both earn ${esc(formatEurBefore(50))}</h2>
          <p class="ctl-body">Explore all possibilities to grow your wealth with Raisin</p>
        </div>
        <img class="ctl-ad__media" src="${A}/ad-referral.png" width="120" height="120" alt="" loading="lazy" />
      </div>
      <button type="button" class="ctl-btn ctl-btn--outline ctl-btn--block">Learn More</button>
    </section>

${
      marketOffers(MODEL.market, "dwm")
        ? `    <section class="ctl-card ctl-ad--media" data-cursor-src="src/control/AdBanner.tsx:20">
      <img class="ctl-ad__hero" src="${A}/ad-wealth-portrait.png" alt="" loading="lazy" />
      <div class="ctl-ad__content">
        <div class="ctl-labels"><span class="ctl-chip ctl-chip--lg">Digital Wealth Management</span></div>
        <h2 class="ctl-title">Invest amounts automatically to better compensate for fluctuations.</h2>
        <button type="button" class="ctl-btn ctl-btn--outline ctl-btn--block">Save now</button>
      </div>
    </section>`
        : ""
    }

    <section class="ctl-card" data-cursor-src="src/control/PopularDeposits.tsx:1">
      <div class="ctl-card__head">
        <h2 class="ctl-title">Popular deposits</h2>
        ${textButton("More offers")}
      </div>
      <div class="ctl-rows">${offers}</div>
    </section>

    <section class="ctl-card ctl-ad" data-cursor-src="src/control/AdBanner.tsx:40">
      <div class="ctl-ad__body">
        <div class="ctl-ad__copy">
          <h2 class="ctl-title">Grow Your Savings Effortlessly</h2>
          <p class="ctl-body">Don’t miss out on competitive returns. Limited time offer.</p>
        </div>
        <img class="ctl-ad__media" src="${A}/ad-grow-savings.png" width="120" height="120" alt="" loading="lazy" />
      </div>
      <button type="button" class="ctl-btn ctl-btn--outline ctl-btn--block">Learn More</button>
    </section>`;
}

/* ── Home: needs attention (12:14048) ── */

function renderNeedsAttention() {
  const w = wallet();

  const alerts = ATTENTION_ITEMS.filter((item) => item.id !== "pending")
    .slice(0, 2)
    .map((item) =>
      alert({
        mode: item.severity === "critical" ? "error" : "info",
        title: item.title,
        body: item.body,
        cta: item.cta,
      })
    )
    .join("");

  /* Each unsettled order needs funding before it can be placed. */
  const orders = pendingOrders()
    .map((order) => {
      const shortfall = Math.max(0, order.amount - w.available);
      return `
      <article class="ctl-row">
        <div class="ctl-row__main">
          <div class="ctl-row__lead">
            <span class="ctl-row__avatar"><img src="${A}/${order.logo}" alt="" loading="lazy" /></span>
            <span class="ctl-row__copy">
              <span class="ctl-row__name">${esc(order.bank)}</span>
              <span class="ctl-row__meta">${esc(order.meta)}</span>
            </span>
          </div>
          <div class="ctl-row__trail">
            <div class="ctl-row__amountline">
              <span class="ctl-chip ctl-chip--status">Pending order</span>
              <p class="ctl-row__amount ctl-row__amount--muted">${esc(fmt(order.amount))}</p>
            </div>
          </div>
        </div>
        <div class="ctl-indent">
          <div class="ctl-progress">
            <span class="ctl-progress__track"></span>
            <span class="ctl-progress__value">${esc(formatProgressPercent(0))}</span>
          </div>
        </div>
        <div class="ctl-indent">
          ${
            shortfall > 0
              ? alert({
                  mode: "info",
                  title: `Please transfer ${fmt(shortfall)} to your Raisin account`,
                  body: "We can only process your order once you have enough funds on your Raisin account.",
                  extra: "Account holder: John Doe · IBAN: DE12 1232 2321 3231 1212 · BIC: MHBFDEFFXXX",
                  link: "This is a link button",
                })
              : ""
          }
          <div class="ctl-actions">
            ${textButton("Details")}
            ${textButton("Taxation")}
            ${textButton("Documents")}
          </div>
        </div>
      </article>`;
    })
    .join("");

  return `
    <section class="ctl-card" data-cursor-src="src/control/NeedsAttention.tsx:1">
      <div class="ctl-card__head">
        <div class="ctl-card__heading">
          <h2 class="ctl-subtitle">Needs attention</h2>
          <span class="ctl-chip ctl-chip--alert">${ATTENTION_ITEMS.length}</span>
        </div>
        ${textButton("Show all")}
      </div>
      ${alerts}
      ${orders}
    </section>`;
}

/* ── Home: portfolio (1:10279) ── */

function enrichSavingsHolding(p, s) {
  return {
    ...p,
    subId: s.id,
    subLabel: s.label,
    maturityLabel: p.maturity ? formatMaturingLabel(p.maturity) : "",
    renewalLabel: p.progress > 60 ? "Renewal: deactivated" : `Renewal for a ${p.termLabel} term`,
    noticeLabel: s.id === "notice" ? `Notice period: ${p.termLabel}` : "",
  };
}

function savingsHoldingRow(p, s) {
  const row = enrichSavingsHolding(p, s);
  if (p.isPending) return pendingDepositRow(row);
  return s.id === "fixed-term" ? fixedTermRow(row) : flexibleRow(row);
}

function portfolioGroupBody(c) {
  const heldSubs = activeSubcategories(c);
  if (heldSubs.length === 1) {
    const s = heldSubs[0];
    if (c.id === "savings") {
      const rows = s.products.map((p) => savingsHoldingRow(p, s)).join("");
      return `<div class="ctl-rows">${rows}</div>`;
    }
    const rows = s.products
      .filter((p) => !p.isPending)
      .map((p) =>
        productRow({
          icon: subcategoryIconUrl(s.id, c.id),
          tone: c.id === "investments" ? "invest" : "retire",
          name: p.bank,
          meta: [p.termLabel, p.country].filter(Boolean).join(" · "),
          amount: fmt(p.amount),
          ret: p.earnings ? signedEur(p.earnings) : undefined,
        })
      )
      .join("");
    return `<div class="ctl-rows">${rows}</div>`;
  }
  const rows = categoryRows(c.id);
  return rows.length
    ? `<div class="ctl-rows">${rows.map(productRow).join("")}</div>`
    : `<div class="ctl-rows"><p class="ctl-body ctl-empty">Not started — explore ${esc(c.label.toLowerCase())} products.</p></div>`;
}

function renderPortfolio() {
  const active = activeCategories();
  const groups = active.length
    ? active
        .map((c) => {
          const headLabel =
            active.length === 1 && activeSubcategories(c).length === 1 ? activeSubcategories(c)[0].label : c.label;
          return `${groupHead(headLabel, String(c.productCount))}${portfolioGroupBody(c)}`;
        })
        .join("")
    : `<p class="ctl-body ctl-empty">No active products yet.</p>`;

  return `
    <section class="ctl-card" data-cursor-src="src/control/Portfolio.tsx:1">
      <div class="ctl-card__head">
        <h2 class="ctl-title">Portfolio</h2>
        ${textButton("Show Inactive Products")}
      </div>
      ${groups}
    </section>`;
}

/* ── Savings overview card with the category / bank / country toggle ── */

const TOGGLE_VIEWS = [
  { id: "category", icon: "icon-pie.svg", label: "Product category", donut: "product" },
  { id: "bank", icon: "icon-list.svg", label: "All deposits", donut: "bank" },
  { id: "country", icon: "icon-globe.svg", label: "By country", donut: "country" },
];

/** Grouping by product category says nothing inside a single product type,
 *  so a sub-level offers the bank and country groupings only. */
const togglesFor = (subId) => (subId ? TOGGLE_VIEWS.filter((v) => v.id !== "category") : TOGGLE_VIEWS);

function renderSavingsOverview(view, subId) {
  const views = togglesFor(subId);
  const current = views.find((v) => v.id === view) || views[0];
  // "All deposits" only reads true across the whole category.
  const label = current.id === "bank" && subId ? "By bank" : current.label;

  return `
    <section class="ctl-card" data-cursor-src="src/control/SavingsOverview.tsx:1">
      <div class="ctl-card__head">
        <h2 class="ctl-title">Saving overview</h2>
        <div class="ctl-view-toggle">
          <p class="ctl-view-toggle__label">${esc(label)}</p>
          <div class="ctl-switchgroup" role="tablist" aria-label="Group deposits by">
            ${views
              .map(
                (v) => `
              <button type="button" class="ctl-switch${v.id === current.id ? " is-active" : ""}" role="tab"
                aria-selected="${v.id === current.id}" aria-label="${esc(v.label)}" data-control-view="${v.id}">
                <img src="${A}/${v.icon}" width="16" height="16" alt="" />
              </button>`
              )
              .join("")}
          </div>
        </div>
      </div>
      ${renderDonut(current.donut, subId)}
    </section>`;
}

/* ── Savings: portfolio by product category (1:10417) ── */

function renderSavingsPortfolio() {
  return `
    <section class="ctl-card" data-cursor-src="src/control/SavingsPortfolio.tsx:1">
      <div class="ctl-card__head">
        <h2 class="ctl-title">Portfolio</h2>
        ${textButton("Show Inactive Products")}
      </div>
      ${groupHead("Savings", String(savings().productCount))}
      <div class="ctl-rows">${categoryRows("savings").map(productRow).join("")}</div>
    </section>`;
}

/* ── Savings: all deposits (12:9990) ── */

function depositRow({ logo, name, meta, amount, progress, fill, maturity, renewal, actions }) {
  return `
    <article class="ctl-row">
      <div class="ctl-row__main">
        <div class="ctl-row__lead">
          <span class="ctl-row__avatar ctl-row__avatar--contain"><img src="${A}/${logo}" alt="" loading="lazy" /></span>
          <span class="ctl-row__copy">
            <span class="ctl-row__name">${esc(name)}</span>
            <span class="ctl-row__meta">${esc(meta)}</span>
          </span>
        </div>
        <div class="ctl-row__trail">
          <div class="ctl-row__amountline"><p class="ctl-row__amount">${esc(amount)}</p></div>
        </div>
      </div>
      <div class="ctl-indent">
        <div class="ctl-progress">
          <span class="ctl-progress__track"><span class="ctl-progress__fill" style="right:${fill}"></span></span>
          <span class="ctl-progress__value">${esc(progress)}</span>
        </div>
        <div class="ctl-helper"><span>${esc(maturity)}</span><span>${esc(renewal)}</span></div>
      </div>
      <div class="ctl-indent ctl-actions">
        ${actions.map((a) => textButton(a)).join("")}
      </div>
    </article>`;
}

/* Fixed-term holdings show a maturity progress bar; the rest expose top-up / withdraw. */
function fixedTermRow(p) {
  const progress = p.progress ?? 0;
  return depositRow({
    logo: bankLogoFile(p.bank),
    name: p.bank,
    meta: [formatRatePa(p.ratePct ?? p.rate), p.termLabel, "Fix Term Deposit"].filter(Boolean).join(" · "),
    amount: fmt(p.amount),
    progress: formatProgressPercent(progress),
    fill: `${100 - progress}%`,
    maturity: p.maturityLabel,
    renewal: p.renewalLabel,
    actions: ["Details", "Taxation", "Documents"],
  });
}

/* An order that has not settled yet: no term running, no actions to take. */
function pendingDepositRow(p) {
  return `
    <article class="ctl-row">
      <div class="ctl-row__main">
        <div class="ctl-row__lead">
          <span class="ctl-row__avatar ctl-row__avatar--contain"><img src="${A}/${bankLogoFile(p.bank)}" alt="" loading="lazy" /></span>
          <span class="ctl-row__copy">
            <span class="ctl-row__name">${esc(p.bank.replace(/ — pending order$/, ""))}</span>
            <span class="ctl-row__meta">${esc(p.subLabel)} · awaiting transfer</span>
          </span>
        </div>
        <div class="ctl-row__trail">
          <div class="ctl-row__amountline">
            <span class="ctl-chip ctl-chip--status">Pending order</span>
            <p class="ctl-row__amount ctl-row__amount--muted">${esc(fmt(p.amount))}</p>
          </div>
        </div>
      </div>
    </article>`;
}

function flexibleRow(p) {
  return `
    <article class="ctl-row">
      <div class="ctl-row__main">
        <div class="ctl-row__lead">
          <span class="ctl-row__avatar ctl-row__avatar--contain"><img src="${A}/${bankLogoFile(p.bank)}" alt="" loading="lazy" /></span>
          <span class="ctl-row__copy">
            <span class="ctl-row__name">${esc(p.bank)}</span>
            <span class="ctl-row__meta">Current rate: ${esc(formatRatePa(p.ratePct ?? p.rate))} · ${esc(p.subLabel)}</span>
            ${p.noticeLabel ? `<span class="ctl-row__meta">${esc(p.noticeLabel)}</span>` : ""}
          </span>
        </div>
        <div class="ctl-row__trail">
          <div class="ctl-row__amountline"><p class="ctl-row__amount">${esc(fmt(p.amount))}</p></div>
          ${
            p.earnings
              ? `<span class="ctl-return ctl-return--lg">${esc(signedEur(p.earnings))}<img src="${A}/icon-info.svg" width="24" height="24" alt="" /></span>`
              : ""
          }
        </div>
      </div>
      <div class="ctl-indent ctl-actions ctl-actions--split">
        <span class="ctl-actions__group">${textButton("Details")}${textButton("Transactions")}</span>
        <span class="ctl-actions__group">
          ${textButton("Top-up", { leading: "icon-plus.svg" })}
          ${textButton("Withdraw", { leading: "icon-minus.svg" })}
        </span>
      </div>
    </article>`;
}

function renderAllDeposits(subId) {
  const scope = subId ? sub(subId) : savings();
  const holdings = savingsHoldings(subId);
  const rows = holdings
    .map((p) => {
      if (p.isPending) return pendingDepositRow(p);
      return p.subId === "fixed-term" ? fixedTermRow(p) : flexibleRow(p);
    })
    .join("");

  return `
    <section class="ctl-card" data-cursor-src="src/control/AllDeposits.tsx:1">
      <div class="ctl-card__head">
        <h2 class="ctl-title">Portfolio</h2>
        ${textButton("Show Inactive Products")}
      </div>

      <div class="ctl-group-head ctl-group-head--split">
        <div class="ctl-card__heading">
          <h3 class="ctl-subtitle">${esc(subId ? scope.label : "Savings")}</h3>
          <span class="ctl-chip">${subId ? holdings.length : savings().productCount}</span>
        </div>
        <label class="ctl-select">
          <span class="ctl-select__label">Sorting</span>
          <select data-control-sort>
            <option>Opening Date(Ascending)</option>
            <option>Opening Date(Descending)</option>
            <option>Maturity date</option>
            <option>Interest rate</option>
          </select>
          <img class="ctl-select__chevron" src="${A}/icon-chevron-down.svg" width="24" height="24" alt="" />
        </label>
      </div>

      <div class="ctl-rows">${rows}</div>
      <button type="button" class="ctl-btn ctl-btn--outline ctl-showmore">Show more</button>
    </section>`;
}

/* ── Pages ── */

function page(tab, main, sub = "savings") {
  return `
    ${renderHeader()}
    <main class="ctl-page" data-cursor-src="src/control/Page.tsx:1">
      <div class="ctl-shell">
        ${renderTabs(tab, sub)}
        <div class="ctl-split">
          <div class="ctl-col">${main}</div>
          <aside class="ctl-col">${renderRail()}</aside>
        </div>
      </div>
    </main>
    ${renderControlFooter("control")}`;
}

export function renderControlHome(uiState = {}) {
  const promoTabState = uiState.productPromoTabs ?? {};
  return page(
    "home",
    `
    <section class="ctl-card" data-cursor-src="src/control/Overview.tsx:1">
      <div class="ctl-card__head"><h2 class="ctl-title">Overview</h2></div>
      ${renderDonut("category")}
    </section>
    ${renderNeedsAttention()}
    ${renderPortfolio()}
    ${renderMarketing(promoTabState)}`
  );
}

/**
 * Savings and its three sub-levels share one page: the sub-level narrows the
 * donut and the portfolio list to a single product type.
 */
export function renderControlLifetimeEarnings() {
  return `
    ${renderHeader()}
    <main class="ctl-page ctl-page--earnings" data-cursor-src="src/control/LifetimeEarnings.tsx:1">
      <div class="ctl-shell ctl-shell--narrow">
        ${renderControlLifetimeEarningsPage()}
      </div>
    </main>
    ${renderControlFooter("control")}`;
}

export function renderControlSavings(subId = "savings", view = "category", uiState = {}) {
  const scoped = subId === "savings" ? null : subId;
  const current = togglesFor(scoped).some((v) => v.id === view) ? view : togglesFor(scoped)[0].id;
  const body = current === "category" ? renderSavingsPortfolio() : renderAllDeposits(scoped);

  const tabId = subId === "savings" ? "savings" : subId;
  return page(
    tabId,
    `${renderSavingsOverview(current, scoped)}${body}${renderMarketing(uiState.productPromoTabs ?? {})}`,
    sublevel(subId).id
  );
}
