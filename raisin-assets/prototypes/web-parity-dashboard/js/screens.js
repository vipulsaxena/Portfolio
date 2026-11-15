// Prototype only — production version needs loading/error/empty states, i18n, a11y.
// Visual target: Web-Dashboard-Parity frames 1:10261 (Control), 168:46436 (A), 338:25402 (B).
// Tokens mirror themeV2. Fonts: Basier Square (UI) + Lay Grotesk (amounts) via css/fonts.css.
//
// Every figure here comes from `js/data.js`, which is bound to the active One Data persona.
// Control, A and B therefore always show the same portfolio; only the layout differs.

import { ATTENTION_ITEMS, CATEGORIES, MODEL, WALLET_TRANSACTIONS, WEALTH, getSubcategory } from "./data.js";
import { SAVINGS_DRILL_SUBLEVELS, SAVINGS_MENU_ITEMS } from "./control.js";
import {
  INVESTMENT_PENSION_CAROUSEL_CARDS,
  INVESTMENT_PRODUCT_MARKETING_CARDS,
  INVESTMENT_PRODUCT_SECTION,
  MINORS_PRODUCT_SECTION,
  RETIREMENT_PRODUCT_SECTION,
  SAVINGS_PRODUCT_SECTION,
  investmentCarouselForMarket,
  sectionForMarket,
} from "./product-marketing-content.js";
import { CATALOG, offersFor } from "./catalog.js";
import { bankAvatarMarkup } from "./bank-assets.js";
import {
  categoryIconForColor,
  iconImg,
  markIconHtml,
  ringCenterIconHtml,
  RING_CENTER_ICON_PX,
  subcategoryIconUrl,
  tileIconHtml,
  uiIconUrl,
} from "./raisin-icons.js";
import {
  renderDsEarningsShowMoreBtn,
  renderDsEarningsWidgetCard,
  renderDsLifetimeEarningsPage,
} from "./lifetime-earnings.js";
import { renderProductionTopHeader } from "./production-header.js";
import {
  activeSavingsSubcategories,
  INVESTMENT_PRODUCTS,
  marketType,
  offers as marketOffers,
  RETIREMENT_PRODUCTS,
} from "./markets.js";
import {
  activeCategories,
  activeSubcategories,
  bProductTabDescriptors,
  controlProductTabItems,
  dsTabIsActive as productTabIsActive,
} from "./product-tab-model.js";
import {
  formatAxisEurTop,
  formatCatalogRate,
  formatEurBefore,
  formatMaturingLabel,
  formatMoney,
  formatPercentDe,
  formatProductEarn,
  formatRatePa,
  formatSignedEur,
} from "./format.js";

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const CTL_ASSETS = "assets/figma/control";

const money = formatMoney;
const eur = formatEurBefore;
const signed = (n) => formatSignedEur(n, "before");

const RATE_350 = () => formatRatePa(3.5);
const RATE_370 = () => formatRatePa(3.7);
const RATE_208 = () => formatRatePa(2.08);

const DEPOSIT_TYPE_LABEL = {
  "fixed-term": "Fix Term Deposit",
  overnight: "Overnight deposit",
  notice: "Notice account",
};

/** Savings pending rows — settlement phase (Figma savings portfolio). */
const SAVINGS_PENDING_STATUS = {
  "ftd-pending-a": "Pending order",
  "ftd-pending-b": "In transit",
  "on-pending-a": "In transit",
};

function savingsPendingStatus(p) {
  if (!p.isPending) return null;
  return SAVINGS_PENDING_STATUS[p.id] ?? "Pending order";
}

function hasSavingsPendingHoldings() {
  return holdings("savings").some((p) => p.isPending);
}

function savingsPendingWealthNote() {
  if (!hasSavingsPendingHoldings()) return "";
  return `<p class="ds-savings-pending-note" role="note">Amounts shown in grey are pending and are not included in Total Wealth.</p>`;
}

function depositMetaLine(p) {
  const rate = formatRatePa(p.ratePct ?? p.rate);
  if (p.isPending) {
    if (p.subId === "overnight") return `Current rate: ${rate}`;
    if (p.subId === "notice") return rate;
    if (p.subId === "fixed-term") return `${rate} · ${p.termLabel}`;
    return `${p.termLabel} · ${p.country}`;
  }
  if (p.subId === "overnight") return `Current rate: ${rate}`;
  if (p.subId === "notice") return rate;
  return `${rate} · ${p.termLabel}`;
}

function depositMetaChip(p) {
  if (!p.subId) return null;
  return DEPOSIT_TYPE_LABEL[p.subId] || null;
}

/* ── One Data accessors ── */

const cat = (id) => CATEGORIES.find((c) => c.id === id);
const sub = (catId, subId) => cat(catId)?.subcategories.find((s) => s.id === subId);
const savings = () => cat("savings");

/** Active holdings across the portfolio, newest-looking first — used by the list screens. */
const holdings = (catId) =>
  (catId ? [cat(catId)] : CATEGORIES)
    .filter(Boolean)
    .flatMap((c) => c.subcategories.flatMap((s) => s.products.map((p) => ({ ...p, subId: s.id, catId: c.id }))));

const pendingHoldings = () => holdings().filter((p) => p.isPending);
const activeHoldings = (catId) => holdings(catId).filter((p) => !p.isPending);

/** Pending orders are funded from the Raisin Account, so they reserve cash before settling. */
function wallet() {
  const reserved = Math.min(MODEL.pending.total, WEALTH.availableCash);
  return {
    balance: WEALTH.availableCash,
    reserved,
    available: WEALTH.availableCash - reserved,
    shortfall: Math.max(MODEL.pending.total - WEALTH.availableCash, 0),
  };
}

/** `depositRow` input for a One Data holding. */
function holdingRow(p, extras = {}) {
  const pendingStatus = savingsPendingStatus(p);
  return {
    letter: p.letter,
    tone: p.tone,
    name: p.bank,
    subId: p.subId,
    meta: depositMetaLine(p),
    metaChip: depositMetaChip(p),
    amount: eur(p.amount),
    earn: p.isPending ? null : formatProductEarn(p.earnings),
    amountMuted: Boolean(p.isPending),
    status: pendingStatus,
    statusTone: pendingStatus ? "chip" : undefined,
    progress: p.progress,
    note: p.maturity && !p.isPending ? formatMaturingLabel(p.maturity) : null,
    ...extras,
  };
}

function logo() {
  return `<img class="ds-logo" src="assets/raisin-logo.svg" width="139" height="32" alt="Raisin" />`;
}

function dsHeaderMenuButton() {
  return `<button type="button" class="ds-header__menu" data-ds-nav-toggle aria-expanded="false" aria-controls="ds-primary-nav" aria-label="Open menu"><span aria-hidden="true">☰</span></button>`;
}

export function renderDsHeader(concept, screen) {
  if (concept === "a") {
    const tabs = [
      { label: "Overview", nav: "overview", active: screen === "overview" },
      { label: "Products", nav: "products", active: screen === "products" || screen === "offer" },
      { label: "Wallet", nav: "wallet", active: screen === "wallet" },
      { label: "Inbox", nav: "#", chip: "5", chipClass: "ds-chip--count" },
      { label: "Alerts", nav: "attention", chip: "10", chipClass: "ds-chip--danger", active: screen === "attention" },
    ];
    const links = tabs
      .map(
        (tab) => `
              <a href="#" class="ds-header__link${tab.active ? " is-active" : ""}" data-nav="${tab.nav}" data-ds-nav-link>
                ${esc(tab.label)}${tab.chip ? `<span class="ds-chip ${tab.chipClass || "ds-chip--count"}">${tab.chip}</span>` : ""}
              </a>`
      )
      .join("");
    return `
      <header class="ds-header ds-header--a">
        <div class="ds-header__inner">
          <a href="#" data-nav="overview">${logo()}</a>
          ${dsHeaderMenuButton()}
          <nav id="ds-primary-nav" class="ds-header__nav ds-header__nav--pill" aria-label="Primary">${links}</nav>
          <button type="button" class="ds-avatar ds-avatar--menu" aria-label="Account menu">
            <span class="ds-avatar__initials">RF</span>
            <span class="ds-avatar__chev" aria-hidden="true">▾</span>
          </button>
        </div>
      </header>`;
  }

  if (concept === "control") {
    return renderProductionTopHeader("control", screen);
  }

  return renderProductionTopHeader("b", screen);
}

function dsSavingsSubmenu(currentParam) {
  const current =
    currentParam === "savings" || SAVINGS_DRILL_SUBLEVELS.has(currentParam) ? currentParam : null;
  return `
    <div class="ds-tab-menu" role="menu" aria-label="Savings sub-levels" hidden>
      ${SAVINGS_MENU_ITEMS.filter((item) => item.id === "savings" || activeSubs(savings()).some((s) => s.id === item.id)).map(
        (item) => `
      <button type="button" role="menuitem" class="ds-tab-menu__item${current === item.id ? " is-current" : ""}" data-nav="category/${item.id}">
        ${esc(item.label)}
      </button>`
      ).join("")}
    </div>`;
}

function productTabs(items, categoryParam = "") {
  return `
    <div class="ds-tabs" role="tablist">
      ${items
        .map((tab) => {
          const chevron = tab.chevron ? `<span class="ds-tab__chevron" aria-hidden="true">▾</span>` : "";
          if (tab.disabled) {
            return `
        <button type="button" class="ds-tab is-disabled" role="tab" aria-selected="false" disabled>
          ${esc(tab.label)}${chevron}
        </button>`;
          }
          if (tab.navigable === false) {
            return `
        <button type="button" class="ds-tab${tab.active ? " is-active" : ""}" role="tab" aria-selected="${tab.active ? "true" : "false"}" tabindex="-1" aria-disabled="true">
          ${esc(tab.label)}${chevron}
        </button>`;
          }
          if (tab.menu) {
            return `
        <div class="ds-tab-wrap">
          <button type="button" class="ds-tab ds-tab--interactive${tab.active ? " is-active" : ""}" role="tab" aria-selected="${tab.active ? "true" : "false"}"
            aria-haspopup="menu" aria-expanded="false" data-ds-savings-menu>
            ${esc(tab.label)}${chevron}
          </button>
          ${dsSavingsSubmenu(categoryParam)}
        </div>`;
          }
          return `
        <button type="button" class="ds-tab ds-tab--interactive${tab.active ? " is-active" : ""}" role="tab" aria-selected="${tab.active ? "true" : "false"}" data-nav="${tab.nav}">
          ${esc(tab.label)}${chevron}
        </button>`;
        })
        .join("")}
    </div>`;
}

/**
 * Product tab bar. It is page chrome in the Figma frames, not part of a screen
 * body, so it stays mounted while the active tab changes.
 */
const DS_TAB_MODEL = {
  control: [
    { label: "Home", nav: "overview", screen: "overview" },
    { label: "Savings", nav: "category/savings", screen: "category", param: "savings", chevron: true },
    { label: "Investments", nav: "category/investments", screen: "category", param: "investments" },
    { label: "Retirement", nav: "category/retirement", screen: "category", param: "retirement" },
  ],
  b: [
    { label: "Home", nav: "overview", screen: "overview", navigable: true },
    { label: "Savings", nav: "category/savings", screen: "category", param: "savings", chevron: true, menu: true, navigable: true },
    { label: "Investments", screen: "category", param: "investments", navigable: false },
    { label: "Retirement", screen: "category", param: "retirement", navigable: false },
    { label: "Wallet", nav: "wallet", screen: "wallet", navigable: true },
  ],
};

const activeSubs = (c) => c.subcategories.filter((s) => s.products.some((p) => !p.isPending));

function controlTabModelForDs() {
  const items = controlProductTabItems();
  if (!items) return null;
  return items.map((item) => {
    if (item.id === "home") {
      return { label: item.label, nav: item.nav, screen: "overview" };
    }
    if (SAVINGS_DRILL_SUBLEVELS.has(item.id)) {
      return { label: item.label, nav: item.nav, screen: "category", param: item.id };
    }
    if (item.menu) {
      return { label: item.label, screen: "category", param: "savings", chevron: true, menu: true };
    }
    if (item.id === "savings") {
      return { label: item.label, nav: item.nav, screen: "category", param: "savings" };
    }
    return { label: item.label, screen: "category", param: item.id, navigable: false };
  });
}

function bTabModel() {
  const [home, savingsTab, investTab, retireTab, walletTab] = DS_TAB_MODEL.b;
  return bProductTabDescriptors({ home, savingsTab, investTab, retireTab, walletTab });
}

export function renderDsTabs(concept, screen, params = []) {
  const model =
    concept === "b" ? bTabModel() : concept === "control" ? controlTabModelForDs() : DS_TAB_MODEL[concept];
  if (!model) return "";
  const tabs = model.map((tab) => ({
    ...tab,
    active: productTabIsActive(tab, screen, params),
  }));
  // A screen outside the tab set is a sub-page; it gets a Back link instead.
  if (!tabs.some((tab) => tab.active)) return "";
  return productTabs(tabs, params[0] || "");
}

function sparkline() {
  return `
    <svg class="ds-spark" viewBox="0 0 280 72" aria-hidden="true">
      <path d="M0 58 C 30 56, 40 50, 70 48 S 110 52, 140 40 S 190 18, 230 22 S 260 8, 280 6" fill="none" stroke="currentColor" stroke-width="2"/>
    </svg>`;
}

function performanceSpark() {
  const top = Math.max(1, Math.ceil(WEALTH.lifetimeEarnings / 1000));
  return `
    <div class="ds-sparkwrap">
      ${sparkline()}
      <div class="ds-spark-axis" aria-hidden="true"><span>${formatAxisEurTop(top * 1000)}</span><span>${formatAxisEurTop(0)}</span></div>
    </div>`;
}

function carouselHead(title, linkLabel, nav) {
  const titleBlock = linkLabel
    ? `<h3 class="ds-sub">${esc(title)}</h3>`
    : `<h3 class="ds-sub ds-carousel-head__title">
        <button type="button" class="ds-carousel-head__link" data-nav="${esc(nav || "products/savings")}">
          ${esc(title)}<span class="ds-chevron" aria-hidden="true">›</span>
        </button>
      </h3>`;
  return `
    <div class="ds-carousel-head" data-carousel-head>
      ${titleBlock}
      <div class="ds-carousel-head__actions">
        ${linkLabel ? `<button type="button" class="ds-textbtn" data-nav="${nav}">${esc(linkLabel)}</button>` : ""}
        <span class="ds-carousel-nav" aria-hidden="true">
          <button type="button" class="ds-carousel-btn" data-carousel-prev disabled aria-label="Previous">‹</button>
          <button type="button" class="ds-carousel-btn" data-carousel-next aria-label="Next">›</button>
        </span>
      </div>
    </div>`;
}

function productBadgeChip(label) {
  if (!label) return "";
  const lower = label.toLowerCase();
  let icon = "";
  if (lower.includes("sustain")) icon = `${CTL_ASSETS}/label-sustainable.svg`;
  else if (lower.includes("tax") || lower.includes("simplified")) icon = `${CTL_ASSETS}/label-no-source-tax.svg`;
  else if (lower.includes("market")) icon = `${CTL_ASSETS}/label-market-leading-rate.svg`;
  return `<span class="ds-label-chip">${icon ? `<img class="ds-label-chip__icon" src="${icon}" width="16" height="16" alt="" />` : ""}${esc(label)}</span>`;
}

function productCarousel(children, { busy = false } = {}) {
  const busyAttr = busy ? ` aria-busy="true" aria-label="Loading offers"` : "";
  return `<div class="ds-product-carousel" data-product-carousel${busyAttr}><div class="ds-product-carousel__track">${children}</div></div>`;
}

function catalogOfferSkeletons(count = 4) {
  return Array.from(
    { length: count },
    () => `
    <div class="ds-product-card ds-product-card--skeleton" aria-hidden="true">
      <span class="ds-product-card__head">
        <span class="ds-skeleton ds-skeleton--avatar"></span>
        <span class="ds-product-card__name">
          <span class="ds-skeleton ds-skeleton--line ds-skeleton--md"></span>
          <span class="ds-skeleton ds-skeleton--line ds-skeleton--sm"></span>
        </span>
      </span>
      <span class="ds-skeleton ds-skeleton--line ds-skeleton--rate"></span>
      <span class="ds-skeleton ds-skeleton--line ds-skeleton--sm"></span>
    </div>`
  ).join("");
}

function catalogDepositSkeletons(count = 3) {
  return Array.from(
    { length: count },
    () => `
    <div class="ds-deposit-offer ds-deposit-offer--skeleton" aria-hidden="true">
      <span class="ds-deposit-offer__head">
        <span class="ds-skeleton ds-skeleton--avatar ds-skeleton--avatar-sm"></span>
        <span class="ds-skeleton ds-skeleton--line ds-skeleton--md" style="flex:1"></span>
      </span>
      <span class="ds-skeleton ds-skeleton--line ds-skeleton--rate"></span>
    </div>`
  ).join("");
}

function portfolioGroupHead(title, count) {
  return `<h3 class="ds-sub ds-portfolio-group"><span>${esc(title)} <span class="ds-chip">${count}</span></span><span class="ds-chevron" aria-hidden="true">›</span></h3>`;
}

/** Popular deposits card — ProductSuggestionCard (bank logo, Display xs rate, label chips). */
function savingProductTile({ letter, tone = "navy", bank, country, rate, meta, badge, nav = "products/savings" }) {
  const avatar = bank ? bankAvatarMarkup(bank) : mark(letter, tone);
  return `
    <button type="button" class="ds-product-card" data-nav="${nav}">
      <span class="ds-product-card__head">
        ${avatar}
        <span class="ds-product-card__name">
          <strong>${esc(bank)}</strong>
          <small>${esc(country)}</small>
        </span>
      </span>
      <span class="ds-product-card__rate">${esc(formatRatePa(rate))}</span>
      <small class="ds-product-card__meta">${esc(meta)}</small>
      ${badge ? productBadgeChip(badge) : ""}
    </button>`;
}

function catalogProductCard(o) {
  return savingProductTile({
    bank: o.bank,
    country: o.countryLabel,
    rate: formatCatalogRate(o.rate),
    meta: `${o.term} · ${o.typeShort}`,
    badge: o.badges[0],
    nav: `offer/${o.id}`,
  });
}

/** Catalog-backed offer tiles, ordered by rate. */
function offerTiles(limit = 5, typeId = "savings") {
  if (CATALOG.source === "pending") {
    return catalogOfferSkeletons(Math.min(limit, 4));
  }
  const offers = offersFor(typeId, limit);
  if (!offers.length) {
    return `<p class="ds-kicker" role="status">${CATALOG.source === "unavailable" ? "Catalog unavailable." : "No offers available right now."}</p>`;
  }
  return offers.map(catalogProductCard).join("");
}

/** Figma 14728:151165 — investment & pension carousel on B home Popular products. */
const INVESTMENT_MEDIA_CAROUSEL = (cards = INVESTMENT_PENSION_CAROUSEL_CARDS) =>
  cards.map((card) => marketingCard({ ...card, carousel: true })).join("");

/** Heading + carousel, or nothing in markets without investment or pension products. */
function investmentCarouselBlock() {
  const carousel = investmentCarouselForMarket(MODEL.market);
  if (!carousel) return "";
  return `${carouselHead(carousel.title, null, "products/investments")}
              ${productCarousel(INVESTMENT_MEDIA_CAROUSEL(carousel.cards))}`;
}

/** Ad Banner (1:10374) — 16:9 image header, chip, Subtitle 1, secondary button. */
function adBanner({ image, badge, title, cta, nav = "products/savings" }) {
  return `
    <section class="ds-ad">
      <img class="ds-ad__image" src="assets/figma/${image}" alt="" loading="lazy" />
      <div class="ds-ad__content">
        <span class="ds-label-chip ds-label-chip--lg">${esc(badge)}</span>
        <h2 class="ds-h">${esc(title)}</h2>
        <button type="button" class="ds-btn ds-btn--ghost ds-btn--block" data-nav="${nav}">${esc(cta)}</button>
      </div>
    </section>`;
}

/** Marketing card — Web-Dashboard promo (chips + copy + 200px image). */
function marketingCard({ badge, badges, title, body, image, cta, nav, carousel = false }) {
  const chips = badges ?? (badge ? [badge] : []);
  const chipsHtml = chips.length
    ? `<div class="ds-marketing__chips">${chips.map((b) => `<span class="ds-label-chip ds-label-chip--lg">${esc(b)}</span>`).join("")}</div>`
    : "";
  if (carousel) {
    return `
    <button type="button" class="ds-marketing ds-marketing--carousel" data-nav="${esc(nav || "products/investments")}">
      <img class="ds-marketing__image" src="assets/figma/${image}" alt="" width="96" height="96" loading="lazy" />
      <div class="ds-marketing__copy">
        <h3>${esc(title)}</h3>
        <p class="ds-marketing__body">${esc(body)}</p>
      </div>
    </button>`;
  }
  return `
    <article class="ds-marketing">
      <div class="ds-marketing__copy">
        ${chipsHtml}
        <h3>${esc(title)}</h3>
        <p class="ds-marketing__body">${esc(body)}</p>
        ${cta ? `<button type="button" class="ds-btn ds-btn--ghost" data-nav="${nav}">${esc(cta)}</button>` : ""}
      </div>
      <img class="ds-marketing__image" src="assets/figma/${image}" alt="" width="200" height="200" loading="lazy" />
    </article>`;
}

function marketingCardsStack(cards) {
  return `<div class="ds-product-section__cards">${cards.map((card) => marketingCard(card)).join("")}</div>`;
}

/** Underline tabs inside product cards (Figma 395:56288 · 163:22721) — not header Tabs 2.0 pills. */
function productPromoTabsUnderline(tabs, sectionId, activeIndex = 0) {
  const active = Math.min(Math.max(0, activeIndex), tabs.length - 1);
  return `
    <div class="ds-promo-tabs ds-promo-tabs--underline ds-product-section__tabs" role="tablist">
      ${tabs
        .map(
          (label, i) => `
        <button type="button" class="ds-filter${i === active ? " is-active" : ""}" role="tab"
          aria-selected="${i === active ? "true" : "false"}" aria-controls="${esc(`${sectionId}-panel-${i}`)}"
          data-promo-tab="${i}" tabindex="${i === active ? "0" : "-1"}">
          ${esc(label)}
        </button>`
        )
        .join("")}
    </div>`;
}

function productPromoActiveIndex(section, promoTabState = {}) {
  const sectionId = section.id || "product-promo";
  const max = Math.max(0, (section.cards?.length ?? 1) - 1);
  const raw = Number(promoTabState[sectionId]);
  if (!Number.isFinite(raw)) return 0;
  return Math.min(Math.max(0, raw), max);
}

function promoCardLayout(section, concept) {
  if (concept === "control" || concept === "b") return { chipsBelow: false };
  return { chipsBelow: Boolean(section.chipsBelow) };
}

function productPromoChipsBelow(section, concept) {
  return promoCardLayout(section, concept).chipsBelow;
}

function marketingCardProducts(card, { chipsBelow = false } = {}) {
  const chips = card.badges ?? (card.badge ? [card.badge] : []);
  const chipsHtml = chips.length
    ? `<div class="ds-marketing__chips">${chips.map((b) => `<span class="ds-label-chip ds-label-chip--lg">${esc(b)}</span>`).join("")}</div>`
    : "";
  const text = `
    <div class="ds-marketing__text">
      <h3>${esc(card.title)}</h3>
      <p class="ds-marketing__body">${esc(card.body)}</p>
    </div>`;
  const copy = chipsBelow ? `${text}${chipsHtml}` : `${chipsHtml}${text}`;
  const tag = card.nav ? "button" : "article";
  const attrs = card.nav ? ` type="button" data-nav="${esc(card.nav)}"` : "";
  return `
    <${tag} class="ds-marketing ds-marketing--products"${attrs}>
      <div class="ds-marketing__copy">${copy}</div>
      <img class="ds-marketing__image" src="assets/figma/${card.image}" alt="" width="132" height="132" loading="lazy" />
    </${tag}>`;
}

function controlProductRow(row) {
  const src =
    row.subcategoryId && row.categoryId
      ? subcategoryIconUrl(row.subcategoryId, row.categoryId)
      : categoryIconForColor(row.icon);
  return `
    <button type="button" class="ds-portfolio-product">
      <span class="ds-portfolio-product__icon ds-mark ds-mark--${row.tone}" aria-hidden="true">${iconImg({ src, size: 24 })}</span>
      <span class="ds-portfolio-product__copy"><strong>${esc(row.name)}</strong><small>${esc(row.meta)}</small></span>
      <span class="ds-portfolio-product__amount"><strong>${esc(row.amount)}</strong>${row.earn ? `<em class="ds-earn${row.earn.includes("−") || row.earn.startsWith("-") ? " ds-earn--down" : ""}">${esc(row.earn)}</em>` : ""}</span>
    </button>`;
}

function buildDonutCircles(parts, r = 46, gapRatio = 0.014, interactive = false, strokeWidth = 14) {
  const c = 2 * Math.PI * r;
  const gap = c * gapRatio;
  const drawable = c - gap * parts.length;
  let offset = 0;
  return parts
    .map((part, i) => {
      const len = drawable * part.pct;
      const slice = interactive ? ` class="ds-donut__arc" data-slice="${i}"` : "";
      const node = `<circle${slice} cx="60" cy="60" r="${r}" fill="none" stroke="${part.color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" />`;
      offset += len + gap;
      return node;
    })
    .join("");
}

function wealthDonut(parts, label, amount) {
  const circles = buildDonutCircles(parts);
  return `
    <div class="ds-donut" role="img" aria-label="${esc(label)} ${esc(amount)}">
      <svg viewBox="0 0 120 120" width="220" height="220">
        <g transform="rotate(-90 60 60)">${circles}</g>
      </svg>
      <div class="ds-donut__center">
        <span>${esc(label)}</span>
        <strong>${esc(amount)}</strong>
      </div>
    </div>`;
}

/** themeV2 chart fills (Donut / Ring) — lighter 300 palette per Figma + components-lib */
const CHART_SEGMENT = {
  savings: "var(--color-blue-300)",
  invest: "var(--color-yellow-300)",
  retire: "var(--color-green-300)",
  wallet: "var(--color-grey-400)",
};

/** Overview donut segments for savings product types (fixed / overnight / notice). */
const SAVINGS_SUB_DONUT = {
  "fixed-term": { color: CHART_SEGMENT.savings, dotClass: "ds-dot--savings" },
  overnight: { color: CHART_SEGMENT.invest, dotClass: "ds-dot--s2" },
  notice: { color: CHART_SEGMENT.retire, dotClass: "ds-dot--s3" },
};

/** Hypothesis B overview — hoverable ring + legend (Control donut read-out parity). */
function bOverviewDonutChart() {
  const defaultLabel = "Total Wealth";
  const defaultAmount = eur(WEALTH.aop);
  const walletSlices =
    WEALTH.availableCash > 0
      ? [
          {
            pct: WEALTH.cashPct / 100,
            color: CHART_SEGMENT.wallet,
            dotClass: "ds-dot--wallet",
            label: "Wallet",
            amount: eur(WEALTH.availableCash),
          },
        ]
      : [];
  const aop = WEALTH.aop || 1;
  const categorySlices =
    marketType(MODEL.market) === "savings-only"
      ? activeSavingsSubcategories(CATEGORIES).map((s) => {
        const style = SAVINGS_SUB_DONUT[s.id] ?? SAVINGS_SUB_DONUT["fixed-term"];
        return {
          pct: s.amount / aop,
          color: style.color,
          dotClass: style.dotClass,
          label: s.label,
          amount: eur(s.amount),
        };
        })
      : CATEGORIES.filter((c) => !c.isEmpty).map((c) => ({
        pct: c.pctOfAop / 100,
        color: CHART_SEGMENT[c.color === "savings" ? "savings" : c.color === "invest" ? "invest" : "retire"],
        dotClass: `ds-dot--${c.color}`,
        label: c.label,
        amount: eur(c.amount),
        }));
  const slices = [...categorySlices, ...walletSlices].filter((s) => s.pct > 0);

  /* Figma 344:29081 — 342px ring, ~51px stroke (r=51, stroke 18 @ viewBox 120) */
  const circles = buildDonutCircles(slices, 51, 0.014, true, 18);
  const legend = slices
    .map(
      (s, i) => `
    <li class="ds-legend__item" data-slice="${i}" data-label="${esc(s.label)}" data-amount="${esc(s.amount)}">
      <i class="ds-dot ${esc(s.dotClass)}" aria-hidden="true"></i>
      <span class="ds-legend__label">${esc(s.label)}</span>
    </li>`
    )
    .join("");

  return `
    <div class="ds-overview-chart" data-ds-donut>
      <div class="ds-donut ds-donut--overview" role="group" aria-label="${esc(defaultLabel)} ${esc(defaultAmount)}">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <g transform="rotate(-90 60 60)">${circles}</g>
        </svg>
        <div class="ds-donut__center">
          <span data-donut-label>${esc(defaultLabel)}</span>
          <strong data-donut-amount>${esc(defaultAmount)}</strong>
        </div>
      </div>
      <ul class="ds-legend">${legend}</ul>
    </div>`;
}

/** Control donut — invested split only; the Raisin Account sits in its own card. */
function donut() {
  const parts = CATEGORIES.filter((c) => !c.isEmpty).map((c) => ({
    pct: c.pct / 100,
    color: CHART_SEGMENT[c.color === "savings" ? "savings" : c.color === "invest" ? "invest" : "retire"],
  }));
  return wealthDonut(parts, "Your Wealth", eur(WEALTH.totalInvested));
}

const RING_GEOM = { size: 56, cx: 28, cy: 28, r: 22, sw: 5 };

function ringArcs(segments) {
  const { cx, cy, r, sw } = RING_GEOM;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const track = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--color-grey-100)" stroke-width="${sw}"/>`;
  const arcs = segments
    .map((seg) => {
      const len = c * (seg.pct / 100);
      const arc = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += len;
      return arc;
    })
    .join("");
  return track + arcs;
}

const RING_STROKE_BY_KIND = {
  savings: CHART_SEGMENT.savings,
  investments: CHART_SEGMENT.invest,
  invest: CHART_SEGMENT.invest,
  retirement: CHART_SEGMENT.retire,
  retire: CHART_SEGMENT.retire,
  wallet: CHART_SEGMENT.wallet,
  raisin: "var(--color-yellow-300)",
  s1: "var(--color-blue-300)",
  s2: "var(--color-blue-500)",
  s3: "var(--color-blue-800)",
};

/* Savings-only markets: overnight Yellow 300, notice Green 300 (Raisin Product Colors). */
const SAVINGS_ONLY_STROKE = { s2: CHART_SEGMENT.invest, s3: CHART_SEGMENT.retire };

function ringStroke(kind) {
  if (marketType(MODEL.market) === "savings-only" && SAVINGS_ONLY_STROKE[kind]) return SAVINGS_ONLY_STROKE[kind];
  return RING_STROKE_BY_KIND[kind] || CHART_SEGMENT.savings;
}

const RING_ICON_KIND = {
  savings: "savings",
  investments: "investments",
  invest: "invest",
  retirement: "retirement",
  retire: "retire",
  wallet: "wallet",
  raisin: "raisin",
  portfolio: "portfolio",
  pie: "pie",
  s1: "s1",
  s2: "s2",
  s3: "s3",
};

/** Allocation ring — mirrors mobile `Ring` segments (Blue300 / Yellow300 / Green300). */
function allocationRing(pct, kind = "savings", { center } = {}) {
  const color = ringStroke(kind);
  const iconKind = center ?? RING_ICON_KIND[kind] ?? kind;
  const { size } = RING_GEOM;
  return `
    <div class="ds-allocation-ring" aria-hidden="true">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        ${ringArcs([{ pct, color }])}
      </svg>
      <span class="ds-allocation-ring__icon">${ringCenterIconHtml(iconKind, RING_CENTER_ICON_PX)}</span>
    </div>`;
}

function portfolioMixRing() {
  const { size } = RING_GEOM;
  const segments = CATEGORIES.filter((c) => !c.isEmpty).map((c) => ({
    pct: c.pct,
    color: CHART_SEGMENT[c.color === "savings" ? "savings" : c.color === "invest" ? "invest" : "retire"],
  }));
  return `
    <div class="ds-allocation-ring" aria-hidden="true">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        ${ringArcs(segments)}
      </svg>
      <span class="ds-allocation-ring__icon">${ringCenterIconHtml("portfolio", RING_CENTER_ICON_PX)}</span>
    </div>`;
}

function mark(letter, tone) {
  return `<span class="ds-mark ds-mark--${tone}" aria-hidden="true">${esc(letter)}</span>`;
}

/** Leading icon tile — same footprint as `mark`, but carries a DS glyph. */
function iconTile(kind, tone = "plain") {
  const key = kind === "invest" ? "dwm" : kind;
  return `<span class="ds-mark ds-mark--${tone}" aria-hidden="true">${tileIconHtml(key)}</span>`;
}

function progress(pct) {
  if (pct == null) return "";
  return `
    <div class="ds-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <span class="ds-progress__track"><span class="ds-progress__fill" style="width:${pct}%"></span></span>
    </div>`;
}

function depositLeading(row) {
  if (row.name && !row.useMark) return bankAvatarMarkup(row.name);
  return mark(row.letter, row.tone);
}

function depositRow(row) {
  const earnDown = row.earn && (row.earn.startsWith("−") || row.earn.startsWith("-"));
  const metaLine = row.metaChip
    ? `<p class="ds-deposit__meta-line">${esc(row.meta)} ${productBadgeChip(row.metaChip)}</p>`
    : `<p>${esc(row.meta)}</p>`;
  return `
    <article class="ds-deposit${row.filter ? ` ds-deposit--${row.filter}` : ""}">
      <div class="ds-deposit__main">
        ${depositLeading(row)}
        <div class="ds-deposit__copy">
          <strong>${esc(row.name)}</strong>
          ${metaLine}
          ${row.badge ? `<span class="ds-status">${esc(row.badge)}</span>` : ""}
        </div>
        <div class="ds-deposit__amount">
          <span class="ds-deposit__amount-row">
            ${
              row.status
                ? `<span class="ds-status${row.statusTone === "chip" ? " ds-status--chip" : ` ds-status--${row.statusTone || "muted"}`}">${esc(row.status)}</span>`
                : ""
            }
            <strong${row.amountMuted ? ` class="is-muted"` : ""}>${esc(row.amount)}</strong>
          </span>
          ${row.earn ? `<span class="ds-earn${earnDown ? " ds-earn--down" : ""}">${esc(row.earn)}</span>` : ""}
        </div>
      </div>
      ${progress(row.progress)}
      ${
        row.note
          ? `<p class="ds-deposit__note"><span>${esc(row.note)}</span>${row.noteRight ? `<span>${esc(row.noteRight)}</span>` : ""}</p>`
          : ""
      }
      ${
        row.alert
          ? `<div class="ds-alert ds-alert--inset"><p><strong>${esc(row.alert.title)}</strong></p><p>${esc(row.alert.body)}</p></div>`
          : ""
      }
      ${
        row.actions
          ? `<div class="ds-deposit__actions">${row.actions.map((label) => `<button type="button" class="ds-textbtn">${esc(label)} ›</button>`).join("")}</div>`
          : ""
      }
    </article>`;
}

function offerRow(offer) {
  return `
    <button type="button" class="ds-offer" data-nav="products/savings">
      ${mark(offer.letter, offer.tone)}
      <div>
        <strong>${esc(offer.bank)}</strong>
        <p class="ds-offer__rate">${esc(formatRatePa(offer.rate))}</p>
        <p>${esc(offer.meta)}</p>
      </div>
    </button>`;
}

export function renderControlScreen() {
  const alerts = ATTENTION_ITEMS.filter((item) => item.severity !== "info").slice(0, 2);
  const firstPending = pendingHoldings()[0];

  return `
    <div class="ds-page">
      <div class="ds-split">
        <div class="ds-stack">
          <section class="ds-card ds-overview">
            <h2 class="ds-h">Overview</h2>
            <div class="ds-overview__body">
              ${donut()}
              <ul class="ds-legend">
                ${CATEGORIES.filter((c) => !c.isEmpty)
                  .map((c) => `<li><i class="ds-dot ds-dot--${c.color}"></i>${esc(c.label)}</li>`)
                  .join("")}
              </ul>
            </div>
          </section>

          <section class="ds-card">
            <div class="ds-card__head">
              <h2 class="ds-h">Needs attention</h2>
              <button type="button" class="ds-textbtn" data-nav="attention">Show all</button>
            </div>
            ${alerts
              .map(
                (item, i) => `
            <div class="ds-alert">
              <p><strong>${esc(item.title)}</strong></p>
              <p>${esc(item.body)}</p>
              <button type="button" class="ds-btn${i ? " ds-btn--ghost" : ""}" data-nav="${item.id === "balance" ? "wallet" : "attention"}">${esc(item.cta)}</button>
            </div>`
              )
              .join("")}
          </section>

          ${
            firstPending
              ? `<section class="ds-card ds-card--flat">
            ${depositRow({
              ...holdingRow(firstPending),
              alert: {
                title: `Please transfer ${eur(firstPending.amount)} to your Raisin account`,
                body: "We can only process your order once we have enough funds on your Raisin account.",
              },
              actions: ["Details", "Taxation", "Documents"],
            })}
          </section>`
              : ""
          }

          <section class="ds-card">
            <div class="ds-card__head">
              <h2 class="ds-h">Portfolio</h2>
              <button type="button" class="ds-textbtn" data-nav="products">Show all their Products ›</button>
            </div>
            ${CATEGORIES.filter((c) => !c.isEmpty)
              .map(
                (c) =>
                  portfolioGroupHead(c.label, c.productCount) +
                  c.subcategories
                    .filter((s) => !s.isEmpty)
                    .map((s) =>
                      controlProductRow({
                        categoryId: c.id,
                        subcategoryId: s.id,
                        icon: c.color,
                        tone: portfolioSubTone(c, s.id),
                        name: s.label,
                        meta: `${s.products.filter((p) => !p.isPending).length} Product${s.products.filter((p) => !p.isPending).length === 1 ? "" : "s"}${s.pending ? ` · ${eur(s.pending)} pending` : ""}`,
                        amount: eur(s.amount),
                        earn: formatProductEarn(s.earnings),
                      })
                    )
                    .join("")
              )
              .join("")}
          </section>

          ${productSectionCard(SAVINGS_PRODUCT_SECTION, "b")}

          <section class="ds-card">
            <h2 class="ds-h">${esc(INVESTMENT_PRODUCT_SECTION.title)}</h2>
            <div class="ds-promo-tabs" role="tablist">
              ${INVESTMENT_PRODUCT_SECTION.tabs
                .map(
                  (tab, i) =>
                    `<button type="button" class="ds-filter${i === 0 ? " is-active" : ""}">${esc(tab)}</button>`
                )
                .join("")}
            </div>
            ${marketingCardsStack(INVESTMENT_PRODUCT_SECTION.cards)}
          </section>

          <section class="ds-card">
            <h2 class="ds-h">All available child investment products</h2>
            <div class="ds-promo-tabs" role="tablist">
              <button type="button" class="ds-filter is-active">Digital wealth management</button>
              <button type="button" class="ds-filter">Kinderdepot</button>
            </div>
            ${marketingCard({
              badge: "Digital Wealth Management",
              title: "Your child’s future, professionally managed",
              body: "Invest for your child with a globally diversified portfolio developed by experts.",
              image: "product-kinderdepot.png",
            })}
          </section>
        </div>

        <aside class="ds-stack">
          <section class="ds-card">
            <h2 class="ds-h">Raisin Account</h2>
            <p class="ds-amount">${eur(WEALTH.availableCash)}</p>
            <p>Available balance <strong>${eur(wallet().available)}</strong></p>
            <p>Reserved for pending orders <strong>${eur(wallet().reserved)}</strong></p>
            ${wallet().shortfall ? `<p class="ds-earn ds-earn--down">${esc(eur(wallet().shortfall))} short of the pending orders</p>` : ""}
          </section>
          ${earningsCard()}
          ${adBanner({
            image: "referral-friends.png",
            badge: "Raisin Friends",
            title: `Refer your friends and you can both earn ${eur(50)}`,
            cta: "Learn More",
          })}
          ${adBanner({
            image: "promo-wealth-portrait.png",
            badge: "Digital Wealth Management",
            title: "Invest amounts automatically to better compensate for fluctuations.",
            cta: "Save now",
            nav: "products/investments",
          })}
          <section class="ds-card">
            <div class="ds-card__head">
              <h2 class="ds-h">Popular deposits</h2>
              <button type="button" class="ds-textbtn" data-nav="products/savings">More offers ›</button>
            </div>
            <div class="ds-product-list">
              ${offerTiles(5)}
            </div>
          </section>
          ${adBanner({
            image: "product-savings.png",
            badge: "No Risk Deposit",
            title: "Grow your savings effortlessly",
            cta: "Learn More",
          })}
        </aside>
      </div>
    </div>`;
}

/** Savings holdings as filterable rows for the A / B savings screens. */
const FILTER_BY_SUB = { "fixed-term": "fixed", overnight: "overnight", notice: "notice" };

function parseDeDotDate(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parts = String(value).split(".");
  if (parts.length !== 3) return Number.POSITIVE_INFINITY;
  const [day, month, year] = parts.map((n) => Number.parseInt(n, 10));
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return Number.POSITIVE_INFINITY;
  return new Date(year, month - 1, day).getTime();
}

const SAVINGS_SORTS = [
  { id: "opening", label: "Opening date" },
  { id: "amount", label: "Amount" },
  { id: "maturity", label: "Maturity" },
];

function sortSavingsDepositRows(rows, sortKey) {
  const list = [...rows];
  const pendingFirst = (a, b) => Number(b._isPending) - Number(a._isPending);
  if (sortKey === "amount") {
    list.sort((a, b) => pendingFirst(a, b) || b._amount - a._amount);
    return list;
  }
  if (sortKey === "maturity") {
    list.sort((a, b) => pendingFirst(a, b) || parseDeDotDate(a._maturity) - parseDeDotDate(b._maturity));
    return list;
  }
  // Pending settlements first, then lower term progress ≈ opened more recently.
  list.sort((a, b) => pendingFirst(a, b) || a._opening - b._opening);
  return list;
}

function savingsRows(subId = null) {
  return holdings("savings")
    .filter((p) => !subId || p.subId === subId)
    .map((p) => ({
      ...holdingRow(p, { actions: p.isPending ? ["Details"] : ["Details", "Taxation", "Documents"] }),
      filter: FILTER_BY_SUB[p.subId],
      _isPending: Boolean(p.isPending),
      _amount: p.amount,
      _maturity: p.maturity,
      _opening: p.progress ?? (p.isPending ? 100 : 50),
    }));
}

const A_PORTFOLIO_LABEL = { savings: "Savings", investments: "Investment", retirement: "Pension" };

function categoryStatusMeta(c) {
  const products = c.subcategories.flatMap((s) => s.products);
  const processing = products.filter((p) => !p.isPending && p.progress != null && p.progress > 0 && p.progress < 100).length;
  const parts = [`${Math.round(c.pct)}% Allocation`, `${c.productCount} Active`];
  if (processing) parts.push(`${processing} Processing`);
  if (c.pendingCount) parts.push(`${c.pendingCount} Pending`);
  return parts.join(" · ");
}

function categoryRingKind(c) {
  if (c.id === "savings") return "savings";
  if (c.id === "investments") return "investments";
  if (c.id === "retirement") return "retirement";
  return c.color;
}

function portfolioEarnInfoTooltip() {
  return `<span class="ds-earn-tooltip">
      <button type="button" class="ds-earn-tooltip__trigger" aria-label="Performance details">
        <img class="ds-portfolio-row__earn-info" src="${CTL_ASSETS}/icon-info-16.svg" width="16" height="16" alt="" />
      </button>
      <span class="ds-earn-tooltip__bubble" role="tooltip">Performance for active invested amount</span>
    </span>`;
}

/** Trailing column — amount on first line, lifetime delta on second (Figma 203:97878). */
function portfolioRowTrail(amount, earnings, { withInfo = false } = {}) {
  const earnFmt = formatProductEarn(earnings, "after");
  const delta =
    earnFmt != null
      ? `<span class="ds-portfolio-row__earn-line">${
          withInfo
            ? `<span class="ds-portfolio-row__earn">${esc(earnFmt)}</span>${portfolioEarnInfoTooltip()}`
            : `<span class="ds-portfolio-row__earn">${esc(earnFmt)}</span>`
        }</span>`
      : "";
  return `<div class="ds-portfolio-row__trail"><strong class="ds-portfolio-row__value">${eur(amount)}</strong>${delta}</div>`;
}

function portfolioRowInner(c, { interactive }) {
  const label = A_PORTFOLIO_LABEL[c.id] || c.label;
  const ring = allocationRing(Math.round(c.pct), categoryRingKind(c));
  const copy = `<div class="ds-portfolio-row__copy"><strong>${esc(label)}</strong><p>${esc(categoryStatusMeta(c))}</p></div>`;
  const trail = portfolioRowTrail(c.amount, c.id === "investments" ? c.earnings : null, {
    withInfo: c.id === "investments" && c.earnings != null && c.earnings !== 0,
  });
  const tag = interactive ? "button" : "div";
  const type = interactive ? ' type="button"' : "";
  const nav = interactive && c.id === "savings" ? ' data-nav="category/savings"' : "";
  const staticCls = interactive ? "" : " ds-alloc-row--static";
  return `<${tag}${type} class="ds-alloc-row ds-portfolio-row${staticCls}"${nav}>
    ${ring}
    ${copy}
    ${trail}
  </${tag}>`;
}

function axisTopEarnings(value) {
  return formatAxisEurTop(value);
}

function pendingDepositRow(p) {
  return depositRow({
    ...holdingRow(p),
    progress: p.progress ?? 0,
    actions: ["Details"],
    earn: null,
    amountMuted: true,
  });
}

function pendingBlock(concept = "b") {
  const rows = pendingHoldings();
  if (!rows.length) return "";
  const items = rows.map((p) => pendingDepositRow(p)).join("");
  if (concept === "a") {
    return `
    <div class="ds-section">
      <h2 class="ds-h">Pending payments</h2>
      <section class="ds-card ds-card--stack ds-card--pending">${items}</section>
    </div>`;
  }
  return `
    <section class="ds-card ds-card--stack ds-card--pending">
      <h2 class="ds-h">Pending payments</h2>
      ${items}
    </section>`;
}

function portfolioSubMeta(s, c) {
  const active = s.products.filter((p) => !p.isPending).length;
  const pending = s.products.filter((p) => p.isPending).length;
  const processing = s.products.filter((p) => !p.isPending && p.progress != null && p.progress > 0 && p.progress < 100).length;
  if (c.id === "savings") {
    const parts = [`${active} Active`];
    if (processing) parts.push(`${processing} Processing`);
    if (pending) parts.push(`${pending} Pending`);
    return parts.join(" · ");
  }
  if (c.id === "investments" && pending) return `${pending} Pending`;
  if (s.pending) return `${active} Active · ${eur(s.pending)} pending`;
  return `${active} Active`;
}

/** Savings product-type icon tones in savings-only markets (blue / yellow / green). */
const SAVINGS_SUB_PORTFOLIO_TONE = { "fixed-term": "blue", overnight: "yellow", notice: "green" };

function portfolioCategoryTone(c) {
  return c.color === "savings" ? "blue" : c.color === "invest" ? "pink" : "green";
}

function portfolioSubTone(c, subId) {
  if (c.id === "savings" && marketType(MODEL.market) === "savings-only" && subId) {
    return SAVINGS_SUB_PORTFOLIO_TONE[subId] ?? "blue";
  }
  return portfolioCategoryTone(c);
}

function groupedPortfolioRows(format = eur) {
  const active = activeCategories();

  const groupForCategory = (c) => {
    const heldSubs = activeSubcategories(c);
    if (heldSubs.length === 1) {
      const s = heldSubs[0];
      const headLabel = active.length === 1 ? s.label : c.label;
      const rows = sortSavingsDepositRows(
        s.products.map((p) => ({
          ...holdingRow(p, {
            actions: p.isPending ? ["Details"] : ["Details", "Taxation", "Documents"],
            filter: FILTER_BY_SUB[p.subId],
          }),
          _isPending: Boolean(p.isPending),
          _amount: p.amount,
          _maturity: p.maturity,
          _opening: p.progress ?? (p.isPending ? 100 : 50),
        })),
        "opening"
      );
      const pendingNote = c.id === "savings" ? savingsPendingWealthNote() : "";
      return (
        portfolioGroupHead(headLabel, c.productCount) +
        `<div class="ds-portfolio-single">${rows.map(depositRow).join("")}${pendingNote}</div>`
      );
    }
    return (
      portfolioGroupHead(c.label, c.productCount) +
      heldSubs
        .map((s) =>
          controlProductRow({
            categoryId: c.id,
            subcategoryId: s.id,
            icon: c.color,
            tone: portfolioSubTone(c, s.id),
            name: s.label,
            meta: portfolioSubMeta(s, c),
            amount: format(s.amount),
            earn: formatProductEarn(s.earnings, "before"),
          })
        )
        .join("")
    );
  };

  return active.map(groupForCategory).join("");
}

function performanceRailA() {
  return `
    <div class="ds-rail-section ds-rail-section--performance">
      <div class="ds-rail-head">
        <h2 class="ds-h">Performance</h2>
        ${renderDsEarningsShowMoreBtn()}
      </div>
      ${renderDsEarningsWidgetCard("ds-performance ds-earnings-widget--home", {
        embeddedHead: false,
        showMoreInCard: false,
      })}
    </div>`;
}

function attentionAlertTone(severity) {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warn";
  return "info";
}

function attentionAlertIcon(severity) {
  return severity === "critical" ? `${CTL_ASSETS}/icon-error.svg` : `${CTL_ASSETS}/icon-info.svg`;
}

/** Dashboard alert tiles — Figma needs-attention rail (danger / warn / info). */
function attentionAlertsMarkup(items) {
  return items
    .map(
      (item) => `
        <div class="ds-alert ds-alert--${attentionAlertTone(item.severity)}">
          <span class="ds-alert__icon" aria-hidden="true"><img src="${attentionAlertIcon(item.severity)}" width="24" height="24" alt="" /></span>
          <div>
            <p><strong>${esc(item.title)}</strong></p>
            <p>${esc(item.body)}</p>
          </div>
        </div>`
    )
    .join("");
}

const attentionUrgentItems = () => ATTENTION_ITEMS.filter((i) => i.severity !== "info");

function attentionRailA() {
  const urgent = attentionUrgentItems();
  const preview = urgent.slice(0, 2);
  return `
    <div class="ds-rail-section" id="attention-panel">
      <div class="ds-rail-head">
        <h2 class="ds-h">Needs attention <span class="ds-chip ds-chip--alert">${urgent.length}</span></h2>
        <button type="button" class="ds-textbtn" data-nav="attention">See all ›</button>
      </div>
      <section class="ds-card ds-card--alerts">
        ${attentionAlertsMarkup(preview)}
      </section>
    </div>`;
}

function alertsSectionA() {
  const items = ATTENTION_ITEMS;
  return `
    <div class="ds-section">
      <div class="ds-rail-head">
        <h2 class="ds-h">Needs attention <span class="ds-chip ds-chip--alert">${items.length}</span></h2>
      </div>
      <section class="ds-card ds-card--alerts">
        ${attentionAlertsMarkup(items)}
      </section>
    </div>`;
}

function raisinBrandMark(size = 18) {
  return `<span class="ds-mark ds-mark--raisin" aria-hidden="true">${iconImg({
    src: uiIconUrl("raisinSymbol"),
    size,
    className: "ds-icon ds-icon--raisin-symbol",
  })}</span>`;
}

function walletBalanceRowIcon(kind) {
  const iconKind = kind === "pie" ? "pie" : "wallet";
  return `<span class="ds-wallet-balance-row__icon" aria-hidden="true">${markIconHtml({ kind: iconKind, size: 24 })}</span>`;
}

function walletBalanceRow({ label, meta, amount, iconKind = "wallet", interactive, nav = "wallet" }) {
  const tag = interactive ? "button" : "div";
  const type = interactive ? ' type="button"' : "";
  const navAttr = interactive ? ` data-nav="${nav}"` : "";
  return `
      <${tag}${type} class="ds-wallet-balance-row"${navAttr}>
        ${walletBalanceRowIcon(iconKind)}
        <span class="ds-wallet-balance-row__copy">
          <strong>${esc(label)}</strong>
          <span>${esc(meta)}</span>
        </span>
        <strong class="ds-wallet-balance-row__amount">${amount}</strong>
      </${tag}>`;
}

function walletAvailableBalanceBlock({ rowsInteractive = true, layout = "card" } = {}) {
  const pendingMeta = MODEL.pending.count
    ? `${MODEL.pending.count} pending order${MODEL.pending.count === 1 ? "" : "s"}`
    : "For a product or transaction";
  const balanceRows = `
    ${walletBalanceRow({
      label: "Current balance",
      meta: "Raisin Transaction Account",
      amount: eur(wallet().balance),
      iconKind: "wallet",
      interactive: false,
    })}
    ${walletBalanceRow({
      label: "Reserved balance",
      meta: pendingMeta,
      amount: eur(wallet().reserved),
      iconKind: "pie",
      interactive: false,
    })}`;

  if (layout === "home") {
    return `
    <button type="button" class="ds-wallet-home-chevron" data-nav="wallet" aria-label="Open wallet">
      <img src="${CTL_ASSETS}/icon-chevron-right.svg" width="24" height="24" alt="" />
    </button>
    <div class="ds-wallet-home-head">
      <div class="ds-wallet-central ds-wallet-central--home">
        <p class="ds-wallet-card__label ds-wallet-home__label">Wallet (Available balance)</p>
        <p class="ds-amount ds-amount--md ds-amount--tight">${eur(wallet().available)}</p>
      </div>
    </div>
    <div class="ds-wallet-balance-rows">${balanceRows}</div>`;
  }

  if (layout === "tab") {
    return `
    <div class="ds-wallet-central">
      <p class="ds-wallet-card__label ds-wallet-central__label">
        <span>Available balance</span>
        <img class="ds-wallet-card__info" src="${CTL_ASSETS}/icon-info-16.svg" width="16" height="16" alt="" />
      </p>
      <p class="ds-amount ds-amount--md ds-amount--tight ds-wallet-central__amount">${eur(wallet().available)}</p>
    </div>
    <div class="ds-wallet-balance-rows ds-wallet-balance-rows--tab">${balanceRows}</div>`;
  }

  if (layout === "rail") {
    return `
    <div class="ds-wallet-rail-summary">
      <p class="ds-wallet-card__label ds-wallet-card__label--rail">Available balance</p>
      <p class="ds-amount ds-amount--wallet ds-amount--wallet-rail">${eur(wallet().available)}</p>
    </div>`;
  }

  return `
    <div class="ds-wallet-card__hero">
      ${raisinBrandMark()}
      <div class="ds-wallet-card__balance">
        <p class="ds-wallet-card__label">
          <span>Available balance</span>
          <img class="ds-wallet-card__info" src="${CTL_ASSETS}/icon-info-16.svg" width="16" height="16" alt="" />
        </p>
        <p class="ds-amount ds-amount--wallet">${eur(wallet().available)}</p>
      </div>
    </div>
    <div class="ds-wallet-card__subrows ds-wallet-balance-rows ds-wallet-balance-rows--nested">${balanceRows}</div>`;
}

function walletQuickActions(variant = "default") {
  const mod = variant === "rail" ? " ds-wallet-actions--rail" : "";
  return `
    <div class="ds-wallet-actions${mod}">
      <button type="button" class="ds-wallet-action" data-nav="products/investments">
        <span class="ds-wallet-action__btn" aria-hidden="true">
          <img class="ds-wallet-action__glyph" src="${CTL_ASSETS}/icon-wallet-invest.svg" width="24" height="24" alt="" />
        </span>
        <span class="ds-wallet-action__label">Invest</span>
      </button>
      <button type="button" class="ds-wallet-action" data-nav="wallet">
        <span class="ds-wallet-action__btn" aria-hidden="true">
          <img class="ds-wallet-action__glyph ds-wallet-action__glyph--add" src="${CTL_ASSETS}/icon-arrow-right-filled.svg" width="24" height="24" alt="" />
        </span>
        <span class="ds-wallet-action__label">Add</span>
      </button>
      <button type="button" class="ds-wallet-action" data-nav="wallet">
        <span class="ds-wallet-action__btn" aria-hidden="true">
          <img class="ds-wallet-action__glyph ds-wallet-action__glyph--withdraw" src="${CTL_ASSETS}/icon-arrow-right-filled.svg" width="24" height="24" alt="" />
        </span>
        <span class="ds-wallet-action__label">Withdraw</span>
      </button>
    </div>`;
}

function walletRailA() {
  return `
    <div class="ds-rail-section ds-rail-section--wallet">
      <div class="ds-rail-head">
        <h2 class="ds-h">Wallet</h2>
        <button type="button" class="ds-textbtn ds-textbtn--trailing" data-nav="wallet">
          <span>More</span>
          <img src="${CTL_ASSETS}/icon-chevron-right.svg" width="24" height="24" alt="" />
        </button>
      </div>
      ${walletBalanceCard({ layout: "rail", rowsInteractive: false, withActions: true, withActivity: true })}
    </div>`;
}

const DS_FOR_YOU_SLIDES = [
  {
    title: `Refer your friends and you can both earn ${eur(50)}`,
    body: "Explore all possibilities to grow your wealth with Raisin",
    media: `${CTL_ASSETS}/ad-referral.png`,
  },
  {
    title: "Boost your savings with a new fixed-term deposit",
    body: "Protection limit: up to €100,000 per bank · DGS insured",
    media: `${CTL_ASSETS}/ad-grow-savings.png`,
  },
  {
    title: "Invest automatically to smooth market fluctuations",
    body: "Digital wealth management tailored to your goals",
    media: `${CTL_ASSETS}/ad-wealth-portrait.png`,
  },
  {
    title: "Earn more with competitive overnight rates",
    body: "Flexible access from partner banks across Europe",
    media: `${CTL_ASSETS}/marketing-savings.png`,
  },
];

function forYouSlideIndex(index) {
  const n = DS_FOR_YOU_SLIDES.length;
  return ((index % n) + n) % n;
}

function forYouCarouselNav() {
  return `
    <span class="ds-carousel-nav">
      <button type="button" class="ds-carousel-btn ds-for-you__arrow" data-for-you-step="-1" aria-label="Previous offer">‹</button>
      <button type="button" class="ds-carousel-btn ds-for-you__arrow" data-for-you-step="1" aria-label="Next offer">›</button>
    </span>`;
}

function forYouRailA(slideIndex = 0) {
  const i = forYouSlideIndex(slideIndex);
  const count = DS_FOR_YOU_SLIDES.length;
  return `
    <div
      class="ds-rail-section"
      data-for-you-carousel
      data-for-you-count="${count}"
      data-for-you-active="${i}">
      <div class="ds-rail-head">
        <h2 class="ds-h">For you</h2>
        ${forYouCarouselNav()}
      </div>
      ${forYouCard(slideIndex, { embeddedHead: false, carouselHost: false })}
    </div>`;
}

function walletPromoLink() {
  return `
    <button type="button" class="ds-wallet-promo" data-nav="wallet">
      <span class="ds-wallet-promo__icon" aria-hidden="true">${iconImg({ src: uiIconUrl("raisinSymbol"), size: 18, className: "ds-icon ds-icon--raisin-symbol" })}</span>
      <span class="ds-wallet-promo__copy">
        <strong>Available balance</strong>
        <small>Ready to invest</small>
      </span>
      <strong class="ds-wallet-promo__amount">${eur(wallet().available)}</strong>
    </button>`;
}

/** Matured products are outside One Data, so the count scales with time on platform. */
const CLOSED_DEPOSIT_BANKS = ["Aka bank", "HoistSpar", "Bentley Bank"];

function closedProductsRow() {
  const count = 7;
  const more = 11;
  return `
    <div class="ds-closed__row">
      <div class="ds-closed__marks" aria-hidden="true">
        ${CLOSED_DEPOSIT_BANKS.map((name) => bankAvatarMarkup(name)).join("")}
        <span class="ds-chip">+${more}</span>
      </div>
      <div class="ds-closed__copy">
        <strong>${count} Deposits</strong>
        <p>Matured deposits</p>
      </div>
    </div>`;
}

/** Hypothesis B — closed/matured savings (Home + Savings; title outside white card). */
function bClosedDepositsSection() {
  return `
          <div class="ds-section ds-section--closed">
            <h2 class="ds-h">Closed products</h2>
            <section class="ds-card ds-closed">
              ${closedProductsRow()}
            </section>
          </div>`;
}

const ALERT_TONE = { critical: "danger", warning: "warn", info: "" };

function attentionRail() {
  const urgent = attentionUrgentItems();
  const preview = urgent.slice(0, 2);
  return `
    <section class="ds-card ds-card--alerts" id="attention-panel">
      <div class="ds-card__head ds-card__head--attention">
        <h2 class="ds-h">Needs attention <span class="ds-chip ds-chip--alert">${urgent.length}</span></h2>
      </div>
      ${attentionAlertsMarkup(preview)}
      <button type="button" class="ds-textbtn" data-nav="attention">Show all ›</button>
    </section>`;
}

function earningsCard() {
  return renderDsEarningsWidgetCard("ds-earnings-widget--home ds-performance");
}

/** Ad Banner (194:20121) — copy left, 100px media right, dot pager; nav in head or rail. */
function forYouCard(slideIndex = 0, { embeddedHead = true, carouselHost = true } = {}) {
  const i = forYouSlideIndex(slideIndex);
  const slide = DS_FOR_YOU_SLIDES[i];
  const count = DS_FOR_YOU_SLIDES.length;
  const carouselAttrs = carouselHost
    ? `data-for-you-carousel data-for-you-count="${count}" data-for-you-active="${i}"`
    : "";
  const head = embeddedHead
    ? `<div class="ds-for-you__head">
        <h2 class="ds-h">For you</h2>
        ${forYouCarouselNav()}
      </div>`
    : "";

  const noHeadMod = embeddedHead ? "" : " ds-for-you--no-head";
  return `
    <section class="ds-card ds-for-you${noHeadMod}" ${carouselAttrs}>
      ${head}
      <div class="ds-for-you__body">
        <div class="ds-for-you__copy">
          <h3>${esc(slide.title)}</h3>
          <p>${esc(slide.body)}</p>
        </div>
        <img class="ds-for-you__media" src="${slide.media}" alt="" width="100" height="100" loading="lazy" />
      </div>
      <div class="ds-for-you__pager">
        <div class="ds-dots" role="tablist" aria-label="For you offers">
          ${DS_FOR_YOU_SLIDES.map(
            (_, idx) =>
              `<button type="button" class="ds-for-you__dot${idx === i ? " is-active" : ""}" data-for-you="${idx}" role="tab" aria-selected="${idx === i}"></button>`
          ).join("")}
        </div>
      </div>
    </section>`;
}

function backLink() {
  return `<button type="button" class="ds-textbtn ds-back" data-go-back>‹ Back</button>`;
}

function raisinAccountBody() {
  return `
      <p class="ds-amount">${eur(WEALTH.availableCash)}</p>
      <p class="ds-kicker">Balance breakdown ⓘ</p>
      <div class="ds-actions">
        <button type="button" class="ds-action" data-nav="products/savings"><span>+</span>Invest</button>
        <button type="button" class="ds-action" data-nav="wallet"><span>↑</span>Add</button>
        <button type="button" class="ds-action" data-nav="wallet"><span>↓</span>Withdraw</button>
      </div>
      <h3 class="ds-sub">Account activity</h3>
      ${activityRows()}
      <button type="button" class="ds-textbtn" data-nav="wallet">Show all transactions</button>`;
}

/** A: section title outside the white card; B: title inside the card (Figma Hyp B). */
function raisinAccountCard(concept = "b") {
  if (concept === "a") {
    return `
    <div class="ds-rail-section">
      <h2 class="ds-h">Raisin Account</h2>
      <section class="ds-card">${raisinAccountBody()}</section>
    </div>`;
  }
  return `
    <section class="ds-card">
      <h2 class="ds-h">Raisin Account</h2>
      ${raisinAccountBody()}
    </section>`;
}

function activityLeading(tx) {
  if (tx.isTopUp) return raisinBrandMark(16);
  if (tx.bank) return bankAvatarMarkup(tx.bank);
  const name = tx.title ?? tx.label.split("—").pop().trim();
  return mark(name.charAt(0).toUpperCase(), "navy");
}

function activityRows(limit = 3, variant = "default") {
  const walletActivity = variant === "wallet-tab" || variant === "wallet-rail";
  const rowClass = walletActivity ? "ds-wallet-activity-item" : "ds-activity-row ds-activity-row--wallet";
  return WALLET_TRANSACTIONS.slice(0, limit)
    .map((tx) => {
      const title = tx.title ?? tx.label.split("—").pop().trim();
      const meta = tx.meta ?? tx.label.split("—")[0].trim();
      const amountTone = tx.amount < 0 ? "debit" : "credit";
      const rowBody = `
      ${activityLeading(tx)}
      <span class="ds-activity-row__copy"><strong>${esc(title)}</strong><small>${esc(tx.date)} · ${esc(meta)}</small></span>
      <strong class="ds-activity-row__amount ds-activity-row__amount--${amountTone}">${esc(signed(tx.amount, eur))}</strong>`;
      if (walletActivity) {
        return `<div class="${rowClass}">${rowBody}</div>`;
      }
      return `<button type="button" class="${rowClass}" data-nav="wallet">${rowBody}</button>`;
    })
    .join("");
}

/* ── Wallet screen blocks (A 395:57509 · B 344:55283) ── */

function walletBalanceCard({
  rowsInteractive = true,
  withActions = false,
  withActivity = false,
  layout = "card",
} = {}) {
  const tabLayout = layout === "tab";
  const homeLayout = layout === "home";
  const railLayout = layout === "rail";
  const mod = tabLayout ? " ds-wallet-card--tab" : homeLayout ? " ds-wallet-card--home" : "";
  const railMod = railLayout ? " ds-wallet-card--rail" : "";
  const actions =
    withActions || tabLayout || withActivity ? walletQuickActions(railLayout ? "rail" : "default") : "";
  const activityVariant = tabLayout ? "wallet-tab" : "wallet-rail";
  const activity =
    withActivity
      ? railLayout
        ? `
        <div class="ds-wallet-card__rail-activity">
          <h3 class="ds-wallet-card__activity-title">Account activity</h3>
          <div class="ds-activity-list ds-wallet-activity-list">${activityRows(3, activityVariant)}</div>
          <button type="button" class="ds-textbtn ds-textbtn--center ds-wallet-card__footer-link" data-nav="wallet">Show all transactions</button>
        </div>`
        : `
        <h3 class="ds-wallet-card__activity-title">Account activity</h3>
        <div class="ds-activity-list ds-wallet-activity-list">${activityRows(3, activityVariant)}</div>
        <button type="button" class="ds-textbtn ds-textbtn--center ds-wallet-card__footer-link" data-nav="wallet">Show all transactions</button>`
      : "";
  const balanceBlock = walletAvailableBalanceBlock({ rowsInteractive, layout });
  const body = railLayout
    ? `<div class="ds-wallet-card__rail-top">${balanceBlock}${actions}</div>${activity}`
    : `${balanceBlock}${actions}${activity}`;
  return `
    <section class="ds-card ds-wallet-card${mod}${railMod}">
      ${body}
    </section>`;
}

function accountActivityCard() {
  return `
    <section class="ds-card">
      ${activityRows()}
      <button type="button" class="ds-textbtn ds-textbtn--center" data-nav="wallet">Show all transactions</button>
    </section>`;
}

function walletMoreRows(variant = "default") {
  const rows = [
    { icon: "pie", title: "Show all transactions", meta: "Across raisin account" },
    { icon: "wallet", title: "Payment methods", meta: "All registered payment methods" },
    { icon: "savings", title: "Reference account", meta: "Manage all reference accounts" },
  ];
  const rowClass = variant === "wallet-tab" ? "ds-wallet-more-row" : "ds-nav-row";
  return rows
    .map(
      (row) => `
    <button type="button" class="${rowClass}" data-nav="wallet">
      ${iconTile(row.icon)}
      <span class="ds-nav-row__copy"><strong>${esc(row.title)}</strong><small>${esc(row.meta)}</small></span>
      <span class="ds-nav-row__chevron" aria-hidden="true">›</span>
    </button>`
    )
    .join("");
}

/* ── Alerts screen (A 169:63322 · B 395:56704) ── */

const alertItems = () =>
  ATTENTION_ITEMS.map((item) => ({
    tone: ALERT_TONE[item.severity] || "info",
    title: item.title,
    body: item.body,
    action: item.cta,
  }));

/**
 * A boxes each alert in its own bordered card; B separates them with dividers
 * and exposes an inline action link per alert.
 */
function alertsCard({ boxed = false, actions = false } = {}) {
  const head = `<h2 class="ds-h">Needs attention <span class="ds-chip ds-chip--alert">${ATTENTION_ITEMS.length}</span></h2>`;
  const items = alertItems()
    .map(
      (item) => `
        <article class="ds-alert-item">
          <span class="ds-alert__icon ds-alert__icon--${item.tone}" aria-hidden="true">ⓘ</span>
          <div class="ds-alert-item__copy">
            <strong>${esc(item.title)}</strong>
            <p>${esc(item.body)}</p>
            ${actions && item.action ? `<button type="button" class="ds-textbtn" data-nav="wallet">${esc(item.action)} ›</button>` : ""}
          </div>
        </article>`
    )
    .join("");

  if (boxed) {
    return `
    <div class="ds-section">
      ${head}
      <section class="ds-card ds-alerts ds-alerts--boxed">${items}</section>
    </div>`;
  }

  return `
    <section class="ds-card ds-alerts">
      <div class="ds-card__head ds-card__head--attention">${head}</div>
      ${items}
    </section>`;
}

/* ── Products screen (A 163:21990 · B 395:56288) ── */

const PRODUCT_SECTIONS = [
  SAVINGS_PRODUCT_SECTION,
  INVESTMENT_PRODUCT_SECTION,
  RETIREMENT_PRODUCT_SECTION,
  MINORS_PRODUCT_SECTION,
];

/** Promo sections the current market can sell. */
const marketProductSections = () => PRODUCT_SECTIONS.map((s) => sectionForMarket(s, MODEL.market)).filter(Boolean);

function productSectionBody(section, concept = "b", promoTabState = {}) {
  const dsProducts = concept === "b" || concept === "control";

  if (section.cards?.length && dsProducts && !section.tabs?.length) {
    const card = section.cards[0];
    return `
      <div class="ds-product-section__body">
        <div class="ds-product-section__panels">
          <div class="ds-product-section__panel" role="tabpanel">
            ${marketingCardProducts(card, promoCardLayout(section, concept))}
          </div>
        </div>
      </div>`;
  }

  if (section.cards?.length && section.tabs?.length) {
    const cardLayout = promoCardLayout(section, concept);
    const sectionId = section.id || "product-promo";
    const activeIndex = productPromoActiveIndex(section, promoTabState);
    const tabs = productPromoTabsUnderline(section.tabs, sectionId, activeIndex);
    const panels = section.cards
      .map(
        (card, i) => `
        <div class="ds-product-section__panel" id="${esc(`${sectionId}-panel-${i}`)}" role="tabpanel"
          data-promo-panel="${i}"${i !== activeIndex ? " hidden" : ""}>
          ${marketingCardProducts(card, cardLayout)}
        </div>`
      )
      .join("");
    return `
      <div class="ds-product-section__body">
        ${tabs}
        <div class="ds-product-section__panels">${panels}</div>
      </div>`;
  }

  const tabs =
    section.tabs?.length
      ? `<div class="ds-promo-tabs ds-promo-tabs--underline" role="tablist">
              ${section.tabs
                .map(
                  (tab, i) =>
                    `<button type="button" class="ds-filter${i === 0 ? " is-active" : ""}">${esc(tab)}</button>`
                )
                .join("")}
            </div>`
      : "";
  if (section.cards?.length) {
    if (concept === "a") {
      const chipsBelow = productPromoChipsBelow(section, concept);
      const cards = section.cards
        .map((card) => marketingCardProducts(card, { chipsBelow }))
        .join("");
      return `<div class="ds-product-section__body">${cards}</div>`;
    }
    return `${tabs}${marketingCardsStack(section.cards)}`;
  }
  return `
      ${tabs}
      <div class="ds-product-section__promo">
        <div class="ds-product-section__copy">
          <strong>${esc(section.name)}</strong>
          <p>${esc(section.body)}</p>
          <div class="ds-product-section__badges">
            ${(section.badges ?? []).map((badge) => `<span class="ds-label-chip">${esc(badge)}</span>`).join("")}
          </div>
        </div>
        <img src="assets/figma/${section.image}" alt="" width="80" height="65" loading="lazy" />
      </div>`;
}

function productSectionCard(section, concept = "b", promoTabState = {}) {
  const tabbed = Boolean(section.cards?.length && section.tabs?.length);
  const sectionId = section.id || "product-promo";
  const tabAttr = tabbed ? ` data-ds-product-section data-product-section-id="${esc(sectionId)}"` : "";
  if (concept === "a") {
    return `
    <div class="ds-section">
      <h2 class="ds-h">${esc(section.title)}</h2>
      <section class="ds-card ds-product-section"${tabAttr}>${productSectionBody(section, concept, promoTabState)}</section>
    </div>`;
  }
  return `
    <section class="ds-card ds-product-section"${tabAttr}>
      <h2 class="ds-h">${esc(section.title)}</h2>
      ${productSectionBody(section, concept, promoTabState)}
    </section>`;
}

function popularDepositOffers(variant = "rail") {
  if (CATALOG.source === "pending") {
    return catalogDepositSkeletons(3);
  }
  const offers = offersFor("savings", 5);
  if (!offers.length) {
    return `<p class="ds-kicker" role="status">No offers available right now.</p>`;
  }
  if (variant === "tile") {
    return offers.map((o) => catalogProductCard(o)).join("");
  }
  return offers
    .map(
      (o) => `
        <button type="button" class="ds-deposit-offer" data-nav="offer/${o.id}">
          <span class="ds-deposit-offer__head">${bankAvatarMarkup(o.bank)}<strong>${esc(o.bank)}</strong></span>
          <span class="ds-product-card__rate">${esc(formatRatePa(formatCatalogRate(o.rate)))}</span>
          <small class="ds-product-card__meta">${esc(o.type)} · ${esc(o.term)} · ${esc(o.countryLabel)}</small>
          <span class="ds-deposit-offer__badges">
            ${o.badges.map((badge) => productBadgeChip(badge)).join("")}
          </span>
        </button>`
    )
    .join("");
}

/** A: title outside + nested offer tiles; B: title inside + divider rows. */
function popularDepositsCard(concept = "b", { embed = false } = {}) {
  const offers = popularDepositOffers(concept === "a" ? "tile" : "rail");
  if (concept === "a") {
    const sectionCls = embed ? "ds-section ds-savings-top__popular" : "ds-rail-section";
    return `
    <div class="${sectionCls}">
      <div class="ds-rail-head">
        <h2 class="ds-h">Popular deposits</h2>
        <button type="button" class="ds-textbtn" data-nav="products/savings">More offers ›</button>
      </div>
      <section class="ds-card ds-card--nested-list ds-card--popular-deposits">${offers}</section>
    </div>`;
  }
  return `
    <section class="ds-card ds-card--popular-deposits-rail">
      <div class="ds-card__head">
        <h2 class="ds-h">Popular Deposits</h2>
        <button type="button" class="ds-textbtn" data-nav="products/savings">More offers ›</button>
      </div>
      ${offers}
    </section>`;
}

/** Popular products rail — wallet promo + two carousels (B overview, wallet, alerts). */
function popularProductsCard() {
  const catalogBusy = CATALOG.source === "pending";
  return `
    <section class="ds-card ds-card--popular"${catalogBusy ? ' aria-busy="true"' : ""}>
      <h2 class="ds-h">Popular products</h2>
      ${walletPromoLink()}
      ${carouselHead("Saving products", null, "products/savings")}
      ${productCarousel(offerTiles(8), { busy: catalogBusy })}
      ${investmentCarouselBlock()}
    </section>`;
}

/* ── Screens ── */

/**
 * Investments and Retirement have no dedicated Figma frame, so they reuse the
 * Savings-overview composition scoped to the category. The tab bar is page
 * chrome, so it stays mounted regardless of which category is active.
 */
const CATEGORY_SECTIONS = { investments: PRODUCT_SECTIONS[1], retirement: PRODUCT_SECTIONS[2] };

function categoryContent(categoryId) {
  const c = cat(categoryId);
  if (!c || !CATEGORY_SECTIONS[categoryId]) return null;
  return {
    label: c.label,
    total: eur(c.amount),
    kicker: c.label,
    isEmpty: c.isEmpty,
    groups: c.subcategories
      .filter((s) => !s.isEmpty)
      .map((s) => ({
        title: s.label,
        count: s.products.length,
        rows: s.products.map((p) => holdingRow(p)),
      })),
    sections: [sectionForMarket(CATEGORY_SECTIONS[categoryId], MODEL.market)].filter(Boolean),
  };
}

export function renderDsCategoryScreen(concept, category, uiState = {}) {
  const content = categoryContent(category);
  if (!content) return "";
  const forYouIdx = uiState.forYouIndex ?? 0;
  const rail =
    concept === "b"
      ? `${attentionRail()}${earningsCard()}${forYouCard(forYouIdx)}${popularProductsCard()}`
      : `${raisinAccountCard("a")}${popularDepositsCard("a")}`;

  const portfolioInner =
    content.isEmpty
      ? `<p class="ds-kicker">No ${esc(content.label.toLowerCase())} products yet — the offers below are a starting point.</p>`
      : content.groups
          .map((group) => portfolioGroupHead(group.title, group.count) + group.rows.map(depositRow).join(""))
          .join("");

  const portfolioBlock =
    concept === "a"
      ? `<div class="ds-section"><h2 class="ds-h">Portfolio</h2><section class="ds-card">${portfolioInner}</section></div>`
      : `<section class="ds-card"><h2 class="ds-h">Portfolio</h2>${portfolioInner}</section>`;

  const stackClass = concept === "a" ? "ds-stack ds-stack--sections" : "ds-stack";

  return `
    <div class="ds-page${concept === "a" ? " ds-page--a" : " ds-page--b"}">
      <div class="ds-split">
        <div class="${stackClass}">
          <h2 class="ds-h ds-h--page">${esc(content.label)} overview</h2>
          <section class="ds-card">
            <p class="ds-kicker">${esc(content.kicker)}</p>
            <p class="ds-amount ds-amount--md">${esc(content.total)}</p>
          </section>
          ${portfolioBlock}
          ${content.sections.map((s) => productSectionCard(s, concept, uiState.productPromoTabs ?? {})).join("")}
        </div>
        <aside class="${concept === "a" ? "ds-stack ds-stack--sections" : "ds-stack"}">${rail}</aside>
      </div>
    </div>`;
}

export function renderAWallet() {
  return `
    <div class="ds-page ds-page--a ds-page--a-wallet">
      <div class="ds-split">
        <div class="ds-stack ds-stack--sections">
          <div class="ds-section">
            <h2 class="ds-h">Wallet</h2>
            ${walletBalanceCard({ rowsInteractive: true, withActions: true, layout: "tab" })}
          </div>
          <div class="ds-section">
            <h2 class="ds-h">Account activity</h2>
            <section class="ds-card ds-card--wallet-activity">
              <div class="ds-wallet-activity-list">${activityRows(3, "wallet-tab")}</div>
              <button type="button" class="ds-textbtn ds-textbtn--center" data-nav="wallet">Show all transactions</button>
            </section>
          </div>
        </div>
        <aside class="ds-stack ds-stack--sections">
          <div class="ds-section">
            <h2 class="ds-h">More</h2>
            <section class="ds-card">${walletMoreRows()}</section>
          </div>
        </aside>
      </div>
    </div>`;
}

export function renderBWallet(showBack = false, uiState = {}) {
  const forYouIdx = uiState.forYouIndex ?? 0;
  return `
    <div class="ds-page ds-page--b ds-page--b-wallet">
      ${showBack ? backLink() : ""}
      <div class="ds-split">
        <div class="ds-stack ds-stack--sections">
          <div class="ds-section">
            <h2 class="ds-h">Wallet</h2>
            ${walletBalanceCard({ withActions: true, rowsInteractive: true, layout: "tab" })}
          </div>
          <div class="ds-section">
            <h2 class="ds-h">Account activity</h2>
            <section class="ds-card ds-card--wallet-activity">
              <div class="ds-wallet-activity-list">${activityRows(3, "wallet-tab")}</div>
              <button type="button" class="ds-textbtn ds-textbtn--center" data-nav="wallet">Show all transactions</button>
            </section>
          </div>
          <div class="ds-section">
            <h2 class="ds-h">More</h2>
            <section class="ds-card ds-card--wallet-more">${walletMoreRows("wallet-tab")}</section>
          </div>
        </div>
        <aside class="ds-stack">
          ${attentionRail()}
          ${earningsCard()}
          ${forYouCard(forYouIdx)}
          ${popularProductsCard()}
        </aside>
      </div>
    </div>`;
}

export function renderAProducts(uiState = {}) {
  const promoTabState = uiState.productPromoTabs ?? {};
  return `
    <div class="ds-page ds-page--a ds-page--a-products">
      <div class="ds-split">
        <div class="ds-stack ds-stack--sections">
          ${marketProductSections().map((s) => productSectionCard(s, "a", promoTabState)).join("")}
        </div>
        <aside class="ds-stack ds-stack--sections">
          ${raisinAccountCard("a")}
          ${popularDepositsCard("a")}
        </aside>
      </div>
    </div>`;
}

export function renderBProducts(uiState = {}, concept = "b") {
  const promoTabState = uiState.productPromoTabs ?? {};
  const pageClass =
    concept === "control" ? "ds-page ds-page--products ds-page--control-products" : "ds-page ds-page--b ds-page--products";
  return `
    <div class="${pageClass}">
      ${concept === "control" ? "" : backLink()}
      <div class="ds-split">
        <div class="ds-stack ds-stack--sections">
          ${marketProductSections().map((s) => productSectionCard(s, concept, promoTabState)).join("")}
        </div>
        <aside class="ds-stack">
          ${popularDepositsCard("b")}
        </aside>
      </div>
    </div>`;
}

export function renderAAlerts() {
  return `
    <div class="ds-page ds-page--a">
      <div class="ds-split">
        <div class="ds-stack ds-stack--sections">
          ${alertsSectionA()}
        </div>
        <aside class="ds-stack ds-stack--sections">
          ${raisinAccountCard("a")}
        </aside>
      </div>
    </div>`;
}

export function renderDsLifetimeEarnings(concept) {
  return renderDsLifetimeEarningsPage(concept);
}

export function renderBAlerts() {
  return `
    <div class="ds-page ds-page--b">
      ${backLink()}
      <div class="ds-split">
        <div class="ds-stack">
          ${alertsCard({ actions: true })}
        </div>
        <aside class="ds-stack">
          ${popularProductsCard()}
        </aside>
      </div>
    </div>`;
}

const A_ADD_CATEGORY = {
  savings: { title: "Savings", body: "Secure returns with no risks", nav: "products/savings" },
  investments: { title: "Investments", body: "Managed wealth over 8k stocks", nav: "products/investments" },
  retirement: { title: "Pension", body: "Unlock Full Tax deductibility", nav: "products/retirement" },
};

const A_SUB_LABEL = {
  "fixed-term": "Fixed term deposits",
  overnight: "Overnight deposits",
  notice: "Notice accounts",
  dwm: "Digital wealth management",
  "money-market": "Money market",
  "etf-rurup": "ETF Rürup",
};

const A_SUB_LIST_TITLE = {
  "fixed-term": "Fix Term Deposit",
  overnight: "Overnight Deposit",
  notice: "Notice Account",
};

const A_ADD_SUB_BODY = {
  "fixed-term": "Lock in guaranteed rates",
  overnight: "Flexible access with daily interest",
  notice: "Enjoy Flexibility to plan ahead",
  dwm: "Expert-built global portfolios",
  "money-market": "Available daily, low risk",
  "etf-rurup": "Unlock Full Tax deductibility",
};

const A_SUB_RING = { "fixed-term": "s1", overnight: "s2", notice: "s3" };

function addEntryRowA({ title, body, nav }) {
  return `<button type="button" class="ds-alloc-row ds-portfolio-row ds-portfolio-row--add" data-nav="${esc(nav)}">
    <span class="ds-portfolio-row__add-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    </span>
    <div class="ds-portfolio-row__copy"><strong>${esc(title)}</strong><p>${esc(body)}</p></div>
  </button>`;
}

function subStatusMeta(s) {
  const active = s.products.filter((p) => !p.isPending);
  const pending = s.products.length - active.length;
  const processing = active.filter((p) => p.progress != null && p.progress > 0 && p.progress < 100).length;
  const parts = [`${Math.round(s.pct)}% Allocation`, `${active.length} Active`];
  if (processing) parts.push(`${processing} Processing`);
  if (pending) parts.push(`${pending} Pending`);
  return parts.join(" · ");
}

function subcategoryRowA(c, s) {
  const ring = allocationRing(Math.round(s.pct), A_SUB_RING[s.id] ?? categoryRingKind(c), { center: s.id });
  const copy = `<div class="ds-portfolio-row__copy"><strong>${esc(A_SUB_LABEL[s.id] ?? s.label)}</strong><p>${esc(subStatusMeta(s))}</p></div>`;
  const trail = `<div class="ds-portfolio-row__trail"><strong class="ds-portfolio-row__value">${eur(s.amount)}</strong></div>`;
  if (c.id === "savings") {
    return `<button type="button" class="ds-alloc-row ds-portfolio-row" data-nav="category/savings">${ring}${copy}${trail}</button>`;
  }
  return `<div class="ds-alloc-row ds-portfolio-row ds-alloc-row--static">${ring}${copy}${trail}</div>`;
}

function emptyCategoryOfferedInMarket(catId) {
  if (catId === "savings") return true;
  if (catId === "investments") return INVESTMENT_PRODUCTS.some((p) => marketOffers(MODEL.market, p));
  if (catId === "retirement") return RETIREMENT_PRODUCTS.some((p) => marketOffers(MODEL.market, p));
  return false;
}

/** Add rows for savings product types the market offers but the user does not hold. */
function offeredEmptySavingsSubRowsA(savingsCat) {
  return savingsCat.subcategories
    .filter((s) => s.isEmpty && marketOffers(MODEL.market, s.id) && s.id !== "notice")
    .map((s) =>
      addEntryRowA({
        title: A_SUB_LABEL[s.id] ?? s.label,
        body: A_ADD_SUB_BODY[s.id] ?? "",
        nav: A_ADD_CATEGORY.savings.nav,
      })
    )
    .join("");
}

function missingParentRowsA() {
  if (marketType(MODEL.market) === "savings-only") {
    const active = CATEGORIES.filter((c) => !c.isEmpty);
    if (active.length === 1 && active[0].id === "savings") {
      const heldSubs = active[0].subcategories.filter((s) => !s.isEmpty);
      if (heldSubs.length !== 1) return "";
    }
    const sav = CATEGORIES.find((c) => c.id === "savings");
    return sav ? offeredEmptySavingsSubRowsA(sav) : "";
  }
  return CATEGORIES.filter((c) => c.isEmpty && emptyCategoryOfferedInMarket(c.id))
    .map((c) => addEntryRowA(A_ADD_CATEGORY[c.id] ?? { title: c.label, body: "", nav: "products" }))
    .join("");
}

/**
 * Hypothesis A portfolio adapts to One Data:
 * one product type held → list its products (554:72924);
 * several types inside one category → type rows + entry points for missing types (554:75075);
 * several categories → category rows. Missing parent categories always get an entry point.
 */
function portfolioSectionA(sort = "opening") {
  const active = CATEGORIES.filter((c) => !c.isEmpty);
  if (active.length === 1) {
    const c = active[0];
    const heldSubs = c.subcategories.filter((s) => !s.isEmpty);
    if (heldSubs.length === 1) {
      const s = heldSubs[0];
      const rows = sortSavingsDepositRows(
        holdings(c.id)
          .filter((p) => p.subId === s.id)
          .map((p) => ({
            ...holdingRow(p, { actions: p.isPending ? ["Details"] : ["Details", "Taxation", "Documents"] }),
            _isPending: Boolean(p.isPending),
            _amount: p.amount,
            _maturity: p.maturity,
            _opening: p.progress ?? (p.isPending ? 100 : 50),
          })),
        sort
      );
      return `
            <section class="ds-card ds-card--portfolio ds-card--portfolio-products">
              <div class="ds-savings-portfolio__head">
                <h3 class="ds-h ds-savings-portfolio__title">${esc(A_SUB_LIST_TITLE[s.id] ?? s.label)} <span class="ds-chip">${rows.length}</span></h3>
                ${bSavingsSortSelect(sort)}
              </div>
              ${rows.map(depositRow).join("")}
              ${savingsPendingWealthNote()}
              ${missingParentRowsA()}
            </section>`;
    }
    const missingSubs =
      c.id === "savings"
        ? offeredEmptySavingsSubRowsA(c)
        : c.subcategories
            .filter((s) => s.isEmpty && s.id !== "notice")
            .map((s) =>
              addEntryRowA({
                title: A_SUB_LABEL[s.id] ?? s.label,
                body: A_ADD_SUB_BODY[s.id] ?? "",
                nav: A_ADD_CATEGORY[c.id]?.nav ?? "products",
              })
            )
            .join("");
    return `
            <section class="ds-card ds-card--portfolio">
              ${heldSubs.map((s) => subcategoryRowA(c, s)).join("")}
              ${missingSubs}
              ${missingParentRowsA()}
            </section>`;
  }
  return `
            <section class="ds-card ds-card--portfolio">
              ${active.map((c) => portfolioRowA(c)).join("")}
              ${missingParentRowsA()}
            </section>`;
}

/** Hypothesis A — only savings opens the portfolio drill-down; invest/pension stay display-only. */
function portfolioRowA(c) {
  const label = A_PORTFOLIO_LABEL[c.id] || c.label;
  const ringKind = categoryRingKind(c);

  if (c.isEmpty) {
    if (c.id === "savings") {
      return `<button type="button" class="ds-alloc-row ds-portfolio-row" data-nav="category/savings">
        ${allocationRing(0, ringKind)}
        <div class="ds-portfolio-row__copy"><strong>${esc(label)}</strong><p>Not started · explore products</p></div>
        <div class="ds-portfolio-row__trail"><strong class="ds-portfolio-row__value">—</strong></div>
      </button>`;
    }
    return `<div class="ds-alloc-row ds-portfolio-row ds-alloc-row--static">
      ${allocationRing(0, ringKind)}
      <div class="ds-portfolio-row__copy"><strong>${esc(label)}</strong><p>Not started</p></div>
      <div class="ds-portfolio-row__trail"><strong class="ds-portfolio-row__value">—</strong></div>
    </div>`;
  }

  return portfolioRowInner(c, { interactive: c.id === "savings" });
}

export function renderHypothesisAHome(uiState = {}) {
  const forYouIdx = uiState.forYouIndex ?? 0;
  const investedPct = Math.round(WEALTH.investedPct);
  const cashPct = Math.round(WEALTH.cashPct);

  return `
    <div class="ds-page ds-page--a ds-page--a-home">
      <div class="ds-split">
        <div class="ds-stack ds-stack--sections">
          <div class="ds-section">
            <h2 class="ds-h">Overview</h2>
            <section class="ds-card ds-savings-hero">
              <div class="ds-savings-hero__amount">
                <span>Total Wealth</span>
                <strong>${eur(WEALTH.aop)}</strong>
              </div>
              <ul class="ds-alloc-list ds-alloc-list--static" aria-label="Wealth allocation">
                <li>${portfolioMixRing()}<div><span>Portfolio</span><small>${formatPercentDe(investedPct)}</small></div><strong>${eur(WEALTH.totalInvested)}</strong></li>
                <li>${allocationRing(cashPct, "raisin")}<div><span>Raisin Account</span><small>${formatPercentDe(cashPct)}</small></div><strong>${eur(WEALTH.availableCash)}</strong></li>
              </ul>
            </section>
          </div>
          <div class="ds-section">
            <h2 class="ds-h">Portfolio</h2>
            ${portfolioSectionA(bSavingsSortFromState(uiState))}
          </div>
          <div class="ds-section">
            <h2 class="ds-h">Popular products</h2>
            <section class="ds-card ds-card--popular"${CATALOG.source === "pending" ? ' aria-busy="true"' : ""}>
              ${carouselHead("Saving products", "More offers", "products/savings")}
              ${productCarousel(offerTiles(8), { busy: CATALOG.source === "pending" })}
              ${investmentCarouselBlock()}
            </section>
          </div>
          <div class="ds-section ds-section--closed">
            <h2 class="ds-h">Closed products</h2>
            <section class="ds-card ds-closed">
              ${closedProductsRow()}
            </section>
          </div>
        </div>
        <aside class="ds-stack ds-stack--sections">
          ${performanceRailA()}
          ${attentionRailA()}
          ${walletRailA()}
          ${forYouRailA(forYouIdx)}
        </aside>
      </div>
    </div>`;
}

export function renderHypothesisBHome(uiState = {}) {
  const forYouIdx = uiState.forYouIndex ?? 0;
  return `
    <div class="ds-page ds-page--b">
      <div class="ds-split">
        <div class="ds-stack">
          <section class="ds-card ds-overview">
            <h2 class="ds-h">Overview</h2>
            <div class="ds-overview__body">
              ${bOverviewDonutChart()}
            </div>
          </section>
          <section class="ds-card ds-card--portfolio-groups">
            <h2 class="ds-h">Portfolio</h2>
            <p class="ds-amount ds-amount--md">${eur(WEALTH.totalInvested)}</p>
            ${groupedPortfolioRows()}
          </section>
          ${walletBalanceCard({ rowsInteractive: true, layout: "home" })}
          ${bClosedDepositsSection()}
        </div>
        <aside class="ds-stack">
          ${attentionRail()}
          ${earningsCard()}
          ${forYouCard(forYouIdx)}
          ${popularProductsCard()}
        </aside>
      </div>
    </div>`;
}

export function renderHypothesisA(uiState = {}) {
  const rawFilter = uiState.savingsFilter;
  const filter = ["all", "fixed", "overnight", "notice"].includes(rawFilter) ? rawFilter : "all";
  const rawSort = uiState.savingsSort;
  const sort = SAVINGS_SORTS.some((s) => s.id === rawSort) ? rawSort : "opening";
  const filters = [
    { id: "all", label: "All" },
    { id: "fixed", label: "Fixed term deposits" },
    { id: "overnight", label: "Overnight deposits" },
    { id: "notice", label: "Notice accounts" },
  ];
  const rows = sortSavingsDepositRows(
    savingsRows().filter((row) => filter === "all" || row.filter === filter),
    sort
  );
  const sav = savings();
  const activeCount = sav.subcategories
    .flatMap((s) => s.products)
    .filter((p) => !p.isPending).length;

  return `
    <div class="ds-page ds-page--a ds-page--a-savings">
      <div class="ds-split ds-split--savings-overview">
        <div class="ds-stack ds-stack--sections">
          ${backLink()}
          <div class="ds-section">
            <h2 class="ds-h">Overview</h2>
            <section class="ds-card ds-savings-hero">
              <div class="ds-savings-hero__amount">
                <span>Savings</span>
                <strong>${eur(sav.amount)}</strong>
              </div>
              <ul class="ds-alloc-list ds-alloc-list--static" aria-label="Savings allocation">
                ${sav.subcategories
                  .filter((s) => !s.isEmpty)
                  .map(
                    (s, i) =>
                      `<li>${allocationRing(Math.round(s.pct), `s${i + 1}`)}<div><span>${esc(s.label)}</span><small>${formatPercentDe(Math.round(s.pct))}</small></div><strong>${esc(eur(s.amount))}</strong></li>`
                  )
                  .join("")}
              </ul>
            </section>
          </div>

          <div class="ds-section">
            <h2 class="ds-h">Portfolio</h2>
            <section class="ds-card ds-card--portfolio-panel" id="portfolio-panel">
              <div class="ds-filters ds-filters--underline" role="tablist" aria-label="Deposit type">
                ${filters
                  .map(
                    (item) => `
                <button type="button" class="ds-filter${filter === item.id ? " is-active" : ""}" role="tab" aria-selected="${filter === item.id}" data-savings-filter-value="${item.id}">${esc(item.label)}</button>`
                  )
                  .join("")}
              </div>
              <div class="ds-portfolio-toolbar">
                <h3 class="ds-sub">All active deposits <span class="ds-chip">${activeCount}</span></h3>
                <label class="ds-select ds-select--toolbar">
                  <span class="ds-select__label">Sorting</span>
                  <select data-savings-sort aria-label="Sorting">
                    ${SAVINGS_SORTS.map(
                      (item) =>
                        `<option value="${item.id}"${sort === item.id ? " selected" : ""}>${esc(item.label)}</option>`
                    ).join("")}
                  </select>
                </label>
              </div>
              <div class="ds-portfolio-deposits">
                ${rows.map(depositRow).join("")}
              </div>
              ${savingsPendingWealthNote()}
              <button type="button" class="ds-btn ds-btn--ghost ds-showmore">Show more</button>
            </section>
          </div>

          <div class="ds-section ds-section--closed">
            <h2 class="ds-h">Closed products</h2>
            <section class="ds-card ds-closed">
              ${closedProductsRow()}
            </section>
          </div>
        </div>

        <aside class="ds-stack ds-stack--sections ds-savings-overview-rail">
          ${popularDepositsCard("a")}
        </aside>
      </div>
    </div>`;
}

const SAVINGS_ALLOC_DOT = { "fixed-term": "s1", overnight: "s2", notice: "s3" };

function savingsAllocDotClass(subId) {
  return SAVINGS_ALLOC_DOT[subId] ? `ds-dot--${SAVINGS_ALLOC_DOT[subId]}` : "ds-dot--s1";
}

function bSavingsSortFromState(uiState = {}) {
  const raw = uiState.savingsSort;
  return SAVINGS_SORTS.some((s) => s.id === raw) ? raw : "opening";
}

function bSavingsSortSelect(sort) {
  return `
    <label class="ds-select ds-select--sort">
      <span class="ds-select__label">Sorting</span>
      <select data-savings-sort aria-label="Sorting">
        ${SAVINGS_SORTS.map(
          (item) =>
            `<option value="${item.id}"${sort === item.id ? " selected" : ""}>${esc(item.label)}</option>`
        ).join("")}
      </select>
    </label>`;
}

function bSavingsDepositsCard({ title, count, rows, sort, emptyMessage }) {
  const pendingNote = savingsPendingWealthNote();
  const list =
    rows.length
      ? `
            ${rows.map(depositRow).join("")}
            ${pendingNote}
            <button type="button" class="ds-btn ds-btn--ghost ds-showmore">Show more</button>`
      : `<p class="ds-kicker">${esc(emptyMessage)}</p>`;

  return `
          <section class="ds-card ds-card--savings-portfolio">
            <div class="ds-savings-portfolio__head">
              <h2 class="ds-h ds-savings-portfolio__title">${esc(title)} <span class="ds-chip">${count}</span></h2>
              ${bSavingsSortSelect(sort)}
            </div>
            ${list}
          </section>`;
}

function bSavingsSummaryCard({ title, amount, showAllocation = true }) {
  const sav = savings();
  const segments = sav.subcategories.filter((s) => !s.isEmpty);
  const allocation =
    showAllocation && segments.length
      ? `
            <div class="ds-bar" aria-hidden="true">
              ${segments
                .map((s) => `<span class="ds-bar__seg ds-bar__seg--${esc(s.id)}" style="flex:${s.pct.toFixed(1)}"></span>`)
                .join("")}
            </div>
            <ul class="ds-legend ds-legend--row ds-savings-summary__legend">
              ${segments
                .map(
                  (s) =>
                    `<li><i class="ds-dot ${savingsAllocDotClass(s.id)}"></i>${esc(s.label)} <strong>${formatPercentDe(Math.round(s.pct))}</strong></li>`
                )
                .join("")}
            </ul>`
      : "";

  return `
          <section class="ds-card ds-savings-summary${showAllocation ? "" : " ds-savings-summary--total-only"}" data-sticky-summary>
            <div class="ds-savings-summary__head">
              <p class="ds-kicker">${esc(title)}</p>
              <p class="ds-amount ds-amount--sm">${amount}</p>
            </div>
            ${allocation}
          </section>`;
}

function bSavingsRailAside(uiState = {}) {
  const forYouIdx = uiState.forYouIndex ?? 0;
  return `
        <aside class="ds-stack">
          ${attentionRail()}
          ${earningsCard()}
          ${forYouCard(forYouIdx)}
          ${popularProductsCard()}
        </aside>`;
}

export function renderHypothesisB(uiState = {}) {
  const sort = bSavingsSortFromState(uiState);
  const rows = sortSavingsDepositRows(savingsRows(), sort);
  const sav = savings();
  const savingsCount = sav.productCount + sav.pendingCount;

  return `
    <div class="ds-page ds-page--b ds-page--b-savings">
      <div class="ds-split">
        <div class="ds-stack">
          ${bSavingsSummaryCard({ title: "Savings overview", amount: eur(sav.amount), showAllocation: true })}

          ${bSavingsDepositsCard({
            title: "Savings",
            count: savingsCount,
            rows,
            sort,
            emptyMessage: "No savings deposits yet.",
          })}

          ${bClosedDepositsSection()}
        </div>

        ${bSavingsRailAside(uiState)}
      </div>
    </div>`;
}

/** B savings sub-level — total only (no allocation viz), scoped deposit list. */
export function renderHypothesisBSavingsSublevel(subId, uiState = {}) {
  const sub = getSubcategory("savings", subId);
  const label = sub?.label ?? subId;
  const amount = sub ? eur(sub.amount) : eur(savings().amount);
  const sort = bSavingsSortFromState(uiState);
  const rows = sortSavingsDepositRows(savingsRows(subId), sort);
  const count = rows.length;

  return `
    <div class="ds-page ds-page--b ds-page--b-savings ds-page--b-savings-sub">
      <div class="ds-split">
        <div class="ds-stack">
          ${bSavingsSummaryCard({ title: label, amount, showAllocation: false })}

          ${bSavingsDepositsCard({
            title: label,
            count,
            rows,
            sort,
            emptyMessage: `No ${label.toLowerCase()} yet.`,
          })}
        </div>

        ${bSavingsRailAside(uiState)}
      </div>
    </div>`;
}
