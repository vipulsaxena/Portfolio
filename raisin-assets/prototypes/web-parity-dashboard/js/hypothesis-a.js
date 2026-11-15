/**
 * Hypothesis A — mobile parity / central unit / OV cards (Figma 194:*)
 */

import {
  ATTENTION_ITEMS,
  CATEGORIES,
  MODEL,
  PRODUCT_OFFERS,
  WEALTH,
  fmt,
  getCategory,
  getSubcategory,
} from "./data.js";
import { formatEurBefore, formatProductEarn, formatRatePa } from "./format.js";

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const INVESTMENT_DISCOVERY = [
  {
    id: "dwm",
    title: "Digital asset management",
    body: `Target return up to ${formatRatePa(7.4)} with managed portfolios.`,
    icon: "spark",
  },
  {
    id: "etf",
    title: "ETF brokerage",
    body: "Build long-term wealth with self-directed ETFs.",
    icon: "pie",
  },
  {
    id: "interest",
    title: "Interest portfolio",
    body: `${formatRatePa(2.29)} interest on a diversified bond portfolio.`,
    icon: "wave",
  },
  {
    id: "minor",
    title: "Minor account",
    body: "Long-term investment for children with tax benefits.",
    icon: "bear",
  },
];

export const PRODUCT_MARKETING = {
  savings: {
    chip: "Fixed Term Deposit",
    title: "Your future deserves stability",
    body: "Secure returns of up to 3.50% p.a. – no risks or fluctuations for your short-term goals.",
  },
  investments: {
    chip: "Digital Wealth Management",
    title: "Invest now with asset management",
    body: "Invest and earn up to 3.70% p.a. of interest + automatically in a global portfolio developed by experts",
  },
  retirement: {
    chip: "ETF Rürup",
    title: "Deduct over €29,000 from your taxes",
    body: "With the Rürup ETF, you can deduct your contributions each year as pension expenses for tax purposes. This can be up to 100% in 2025.",
  },
};

export function renderParityHeader(screen) {
  const tabs = [
    { id: "overview", label: "Overview", nav: "overview" },
    { id: "products", label: "Products", nav: "products" },
    { id: "alerts", label: "Alerts", nav: "attention", badge: 10, badgeTone: "alert" },
    { id: "inbox", label: "Inbox", nav: "#", badge: 5, badgeTone: "muted" },
  ];

  return `
    <header class="site-header site-header--parity" data-cursor-src="src/layout/SiteHeaderParity.tsx:1">
      <div class="site-header__brand">raisin</div>
      <nav class="site-header__nav site-header__nav--parity" aria-label="Primary">
        ${tabs
          .map((tab) => {
            const active =
              (tab.id === "overview" && screen === "overview") ||
              (tab.id === "products" && (screen === "products" || screen.startsWith("offer"))) ||
              (tab.id === "alerts" && screen === "attention")
                ? " is-active"
                : "";
            return `<a href="#" class="site-header__tab${active}" data-nav="${tab.nav}">${esc(tab.label)}${
              tab.badge
                ? `<span class="site-header__chip site-header__chip--${tab.badgeTone}">${tab.badge}</span>`
                : ""
            }</a>`;
          })
          .join("")}
      </nav>
      <button type="button" class="site-header__avatar" aria-label="Account menu">
        <span>RF</span>
        <span class="site-header__avatar-chevron" aria-hidden="true">▾</span>
      </button>
    </header>`;
}

function ringSvg(pct, color, size = "md") {
  const r = size === "sm" ? 28 : size === "lg" ? 44 : 36;
  const stroke = size === "sm" ? 5 : 6;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(pct, 100) / 100) * c;
  const dim = (r + stroke) * 2;
  return `
    <svg class="cat-ring__svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" aria-hidden="true">
      <circle class="cat-ring__track" cx="${r + stroke}" cy="${r + stroke}" r="${r}" fill="none" stroke-width="${stroke}"/>
      <circle class="cat-ring__fill cat-ring__fill--${color}" cx="${r + stroke}" cy="${r + stroke}" r="${r}" fill="none" stroke-width="${stroke}"
        stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"
        transform="rotate(-90 ${r + stroke} ${r + stroke})"/>
    </svg>`;
}

export function renderPortfolioViewToggle(activeView) {
  const views = [
    { id: "chart", label: "By allocation", icon: "◔" },
    { id: "list", label: "By category", icon: "☰" },
    { id: "global", label: "By region", icon: "◉" },
  ];
  return `
    <div class="view-toggle" role="tablist" aria-label="Portfolio view" data-cursor-src="src/components/ViewToggle.tsx:1">
      <span class="view-toggle__label">By category</span>
      ${views
        .map(
          (v) => `
        <button type="button" class="view-toggle__btn${activeView === v.id ? " is-active" : ""}" data-portfolio-view="${v.id}" role="tab" aria-selected="${activeView === v.id}" title="${esc(v.label)}">
          <span aria-hidden="true">${v.icon}</span>
        </button>`
        )
        .join("")}
    </div>`;
}

function renderBalanceChart() {
  return `
    <div class="balance-chart" aria-hidden="true" data-cursor-src="src/components/BalanceChart.tsx:1">
      <svg viewBox="0 0 320 100" preserveAspectRatio="none" class="balance-chart__svg">
        <defs>
          <linearGradient id="aChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--raisin-teal)" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="var(--raisin-teal)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path class="balance-chart__area" d="M0,88 C40,82 80,70 120,58 S200,35 260,28 300,22 320,18 L320,100 L0,100 Z" fill="url(#aChartFill)"/>
        <path class="balance-chart__line" d="M0,88 C40,82 80,70 120,58 S200,35 260,28 300,22 320,18" fill="none" stroke="var(--raisin-teal)" stroke-width="2.5"/>
      </svg>
      <div class="balance-chart__axis">
        <span>€0</span>
        <span>€150K</span>
      </div>
    </div>`;
}

export function renderCategoryBalanceHero(cat) {
  const balanceLabel =
    cat.id === "investments" ? "Investment balance" : cat.id === "savings" ? "Savings balance" : `${cat.label} balance`;
  return `
    <section class="card balance-hero" data-cursor-src="src/variants/a/BalanceHero.tsx:1">
      <p class="balance-hero__label">${esc(balanceLabel)}</p>
      <p class="balance-hero__amount">${esc(fmt(cat.amount))}</p>
      <p class="balance-hero__delta">${esc(formatProductEarn(cat.earnings))}</p>
      ${renderBalanceChart()}
    </section>`;
}

function renderFeatureRow(cat, ringView) {
  const isPerf = ringView === "performance";
  const pct = isPerf ? Math.min(cat.perfPct * 8, 100) : cat.pct;
  const center = isPerf ? `+${cat.perfPct}%` : `${Math.round(cat.pct)}%`;
  const sub = isPerf ? `Performance · ${cat.productCount} products` : `${Math.round(cat.pct)}% allocation · ${cat.productCount} products`;

  return `
    <button type="button" class="feature-row feature-row--interactive" data-nav="category/${cat.id}" data-cursor-src="src/components/FeatureRow.tsx:${cat.id}">
      <div class="feature-row__ring-wrap">
        ${ringSvg(pct, cat.color, "sm")}
        <span class="feature-row__ring-center">${center}</span>
      </div>
      <div class="feature-row__body">
        <strong>${esc(cat.label)}</strong>
        <span>${sub}</span>
      </div>
      <div class="feature-row__right">
        <strong>${esc(fmt(cat.amount))}</strong>
        <span class="feature-row__earn">${esc(formatProductEarn(cat.earnings))} <span class="info-dot" title="Lifetime earnings">i</span></span>
      </div>
    </button>`;
}

function renderSubcategoryFeatureRow(catId, sub) {
  const pct = Math.round((sub.amount / getCategory(catId).amount) * 100);
  return `
    <button type="button" class="feature-row feature-row--interactive" data-nav="subcategory/${catId}/${sub.id}">
      <div class="feature-row__ring-wrap">
        ${ringSvg(pct, getCategory(catId).color, "sm")}
        <span class="feature-row__ring-center">${pct}%</span>
      </div>
      <div class="feature-row__body">
        <strong>${esc(sub.label)}</strong>
        <span>${esc(sub.count)}</span>
      </div>
      <div class="feature-row__right">
        <strong>${esc(fmt(sub.amount))}</strong>
        <span class="feature-row__earn">${esc(formatProductEarn(sub.earnings))}</span>
      </div>
    </button>`;
}

function renderDepositListing(catId, sub, product) {
  const bankInitial = product.bank.charAt(0);
  return `
    <article class="deposit-listing" data-cursor-src="src/components/DepositListing.tsx:1">
      <div class="deposit-listing__head">
        <div class="deposit-listing__bank-avatar" aria-hidden="true">${esc(bankInitial)}</div>
        <div class="deposit-listing__meta">
          <strong>${esc(product.bank)}</strong>
          <span>Current rate: ${esc(formatRatePa(product.ratePct ?? product.rate))} · ${esc(sub.label)}</span>
          ${sub.id === "overnight" ? `<span>Savings plan: ${esc(formatEurBefore(200))} weekly (Next: 15.10.2024)</span>` : ""}
        </div>
        <div class="deposit-listing__amount">
          <strong>${esc(fmt(product.amount))}</strong>
          <button type="button" class="earn-info" aria-label="Earnings info">${esc(formatProductEarn(sub.earnings / sub.products.length))} <span class="info-dot">i</span></button>
        </div>
      </div>
      <div class="deposit-listing__actions">
        <button type="button" class="text-btn" data-nav="product/${catId}/${sub.id}/${product.id}">Details ›</button>
        <button type="button" class="text-btn">Transactions ›</button>
        <button type="button" class="text-btn">Deposit ›</button>
        <button type="button" class="text-btn" data-nav="products/${catId}">Order ›</button>
        <button type="button" class="text-btn">Manage ›</button>
      </div>
    </article>`;
}

function renderNoticeListing() {
  const sub = getSubcategory("savings", "notice");
  const product = sub?.products[0];
  if (!product) return "";
  return `
    <article class="deposit-listing deposit-listing--compact" data-cursor-src="src/components/ListingNA.tsx:1">
      <div class="deposit-listing__head">
        <div class="deposit-listing__bank-avatar deposit-listing__bank-avatar--muted">N</div>
        <div class="deposit-listing__meta">
          <strong>${esc(product.bank)}</strong>
          <span>Notice account · ${esc(formatRatePa(product.ratePct ?? product.rate))}</span>
        </div>
        <strong>${esc(fmt(product.amount))}</strong>
      </div>
    </article>`;
}

function renderSavingsPortfolio(uiState) {
  const cat = getCategory("savings");
  const allDeposits = uiState.savingsFilter === "all-deposits";

  const header = `
    <div class="portfolio-panel__toolbar">
      <div class="portfolio-panel__title">
        <h3>Savings</h3>
        <span class="chip">${cat.productCount}</span>
      </div>
      <label class="select-field">
        <span class="visually-hidden">Deposit view</span>
        <select class="select-field__input" data-savings-filter>
          <option value="by-type"${!allDeposits ? " selected" : ""}>By product type</option>
          <option value="all-deposits"${allDeposits ? " selected" : ""}>All deposits</option>
        </select>
      </label>
    </div>`;

  if (!allDeposits) {
    return `
      <section class="card portfolio-panel" data-cursor-src="src/variants/a/SavingsCategory.tsx:1">
        ${header}
        <div class="portfolio-panel__list">
          ${cat.subcategories.map((sub) => renderSubcategoryFeatureRow("savings", sub)).join("")}
        </div>
        <button type="button" class="btn btn--ghost btn--center" data-savings-filter-value="all-deposits">Show all deposits</button>
      </section>`;
  }

  const ftd = cat.subcategories[0];
  const overnight = cat.subcategories[1];

  return `
    <section class="card portfolio-panel portfolio-panel--expanded" data-cursor-src="src/variants/a/AllDeposits.tsx:1">
      ${header}
      <div class="combo-head"><span>Fixed-term</span><strong>${esc(fmt(ftd.amount))}</strong></div>
      ${ftd.products
        .slice(0, 2)
        .map((p) => renderDepositListing("savings", ftd, p))
        .join("")}
      <div class="combo-head"><span>Overnight</span><strong>${esc(fmt(overnight.amount))}</strong></div>
      ${overnight.products.map((p) => renderDepositListing("savings", overnight, p)).join("")}
      <div class="combo-head"><span>Notice</span><strong>${esc(fmt(cat.subcategories[2].amount))}</strong></div>
      ${renderNoticeListing()}
      <button type="button" class="btn btn--secondary btn--center">Show all</button>
    </section>`;
}

function renderInvestmentsPortfolio(uiState) {
  const cat = getCategory("investments");
  const rows = [
    { id: "dwm", label: "DWM", pct: 10, amount: 1450, earn: 0, products: 1 },
    { id: "money-market", label: "Money Market", pct: 65, amount: 4200, earn: 600, products: 1 },
    { id: "etf", label: "ETF Brokerage", pct: 25, amount: 3800, earn: 500, products: 1 },
  ];

  return `
    <section class="card portfolio-panel" data-cursor-src="src/variants/a/InvestmentsCategory.tsx:1">
      <div class="portfolio-panel__head">
        <h2 class="section-title">Portfolio</h2>
        ${renderPortfolioViewToggle(uiState.portfolioView)}
      </div>
      <div class="portfolio-panel__list">
        ${rows
          .map(
            (row) => `
          <button type="button" class="feature-row feature-row--interactive" data-nav="subcategory/investments/${row.id === "etf" ? "money-market" : row.id}">
            <div class="feature-row__ring-wrap">
              ${ringSvg(row.pct, "invest", "sm")}
              <span class="feature-row__ring-center">${row.pct}%</span>
            </div>
            <div class="feature-row__body">
              <strong>${esc(row.label)}</strong>
              <span>${row.pct}% allocation · ${row.products} product</span>
            </div>
            <div class="feature-row__right">
              <strong>${esc(fmt(row.amount))}</strong>
              ${row.earn ? `<span class="feature-row__earn">${esc(formatProductEarn(row.earn))} <span class="info-dot">i</span></span>` : ""}
            </div>
          </button>`
          )
          .join("")}
      </div>
      <button type="button" class="btn btn--ghost btn--center">Show all</button>
      <p class="portfolio-panel__footnote">${cat.productCount} active products · ${esc(fmt(cat.amount))} total</p>
    </section>`;
}

export function renderInvestmentDiscoveryRail() {
  return `
    <aside class="discovery-rail" data-cursor-src="src/variants/a/InvestmentDiscovery.tsx:1">
      <div class="discovery-rail__head">
        <h3>All investment products</h3>
      </div>
      <div class="discovery-rail__list">
        ${INVESTMENT_DISCOVERY.map(
          (item) => `
          <button type="button" class="discovery-card" data-nav="products/investments">
            <span class="discovery-card__icon discovery-card__icon--${item.icon}" aria-hidden="true"></span>
            <div>
              <strong>${esc(item.title)}</strong>
              <span>${esc(item.body)}</span>
            </div>
            <span class="discovery-card__chevron" aria-hidden="true">›</span>
          </button>`
        ).join("")}
      </div>
    </aside>`;
}

export function renderACategoryScreen(catId, uiState) {
  const cat = getCategory(catId);
  if (!cat) return `<p>Category not found.</p>`;

  const back = `
    <button type="button" class="back-link" data-go-back data-cursor-src="src/components/BackLink.tsx:1">
      <span aria-hidden="true">←</span> Back
    </button>`;

  let portfolio = "";
  if (catId === "savings") portfolio = renderSavingsPortfolio(uiState);
  else if (catId === "investments") portfolio = renderInvestmentsPortfolio(uiState);
  else {
    portfolio = `
      <section class="card portfolio-panel">
        <div class="portfolio-panel__head">
          <h2 class="section-title">Portfolio</h2>
          ${renderPortfolioViewToggle(uiState.portfolioView)}
        </div>
        <div class="portfolio-panel__list">
          ${cat.subcategories.map((sub) => renderSubcategoryFeatureRow(catId, sub)).join("")}
        </div>
      </section>`;
  }

  const sideRail = catId === "investments" ? renderInvestmentDiscoveryRail() : "";

  return `
    <div class="a-category-layout${sideRail ? " a-category-layout--split" : ""}">
      <div class="a-category-layout__main">
        ${back}
        ${renderCategoryBalanceHero(cat)}
        ${portfolio}
      </div>
      ${sideRail}
    </div>`;
}

function renderOvAllocationCards() {
  const investedPct = Math.round((WEALTH.totalInvested / WEALTH.aop) * 100);
  const cashPct = Math.round((WEALTH.availableCash / WEALTH.aop) * 100);
  return `
    <div class="ov-allocation-row" data-cursor-src="src/variants/a/OvCards.tsx:1">
      <button type="button" class="ov-allocation-card ov-allocation-card--interactive" data-scroll-portfolio>
        <div class="ov-allocation-card__ring">${ringSvg(investedPct, "savings", "sm")}</div>
        <div>
          <span class="ov-allocation-card__eyebrow">Portfolio</span>
          <strong>${esc(fmt(WEALTH.totalInvested))}</strong>
          <small>${CATEGORIES.reduce((n, c) => n + c.productCount, 0)} products</small>
        </div>
        <span class="category-card__chevron" aria-hidden="true">›</span>
      </button>
      <button type="button" class="ov-allocation-card ov-allocation-card--interactive" data-nav="wallet">
        <div class="ov-allocation-card__ring">${ringSvg(cashPct, "navy", "sm")}</div>
        <div>
          <span class="ov-allocation-card__eyebrow">Raisin Account</span>
          <strong>${esc(fmt(WEALTH.availableCash))}</strong>
          <small>Available cash</small>
        </div>
        <span class="category-card__chevron" aria-hidden="true">›</span>
      </button>
    </div>`;
}

export function renderAOverview(uiState) {
  return `
    <section class="card overview-hero overview-hero--a" data-cursor-src="src/variants/a/Overview.tsx:1">
      <h2 class="section-title">Overview</h2>
      <div class="overview-hero__wrapper">
        <div class="overview-hero__row">
          <div class="central-unit central-unit--a">
            <p class="central-unit__label">Total wealth</p>
            <p class="central-unit__amount">${esc(formatEurBefore(WEALTH.aop))}</p>
          </div>
          ${renderOvAllocationCards()}
        </div>
      </div>
    </section>
    <section class="card portfolio-panel" id="portfolio-panel" data-cursor-src="src/variants/a/PortfolioOverview.tsx:1">
      <div class="portfolio-panel__head">
        <h2 class="section-title">Portfolio</h2>
        ${renderPortfolioViewToggle(uiState.portfolioView)}
      </div>
      <div class="portfolio-panel__list">
        ${CATEGORIES.map((c) => renderFeatureRow(c, uiState.ringView)).join("")}
      </div>
      <div class="portfolio-panel__other">
        <h3 class="section-subtitle">Other banks</h3>
        <button type="button" class="feature-row feature-row--interactive" data-nav="wallet">
          <div class="feature-row__avatar"></div>
          <div class="feature-row__body"><strong>External account</strong><span>1 bank connected</span></div>
          <strong>${esc(fmt(Math.round(WEALTH.aop * 0.03)))}</strong>
        </button>
      </div>
    </section>`;
}

function renderPopularDepositsMain() {
  const offers = PRODUCT_OFFERS.savings.slice(0, 4);
  return `
    <section class="card" data-cursor-src="src/components/PopularDeposits.tsx:1">
      <div class="card__header">
        <h3 class="card__title">Popular deposits for you</h3>
        <button type="button" class="card__link" data-nav="products/savings">See all rates</button>
      </div>
      <div class="ov-grid ov-grid--main">
        ${offers
          .map(
            (o, i) => `
          <button type="button" class="ov-offer-card ov-offer-card--wide ov-offer-card--interactive" data-nav="offer/${o.id}" data-cursor-src="src/components/OvCard.tsx:${i + 1}">
            <div class="ov-offer-card__thumb" aria-hidden="true"></div>
            <span class="ov-offer-card__rate">${esc(o.rate)}</span>
            <strong>${esc(o.bank)}</strong>
            <span>${esc(o.term)}</span>
          </button>`
          )
          .join("")}
      </div>
    </section>`;
}

export function renderAProductsScreen(filterId, uiState) {
  const tab = filterId && ["savings", "investments", "retirement"].includes(filterId) ? filterId : uiState.productTab || "savings";
  const marketing = PRODUCT_MARKETING[tab];

  const tabs = ["savings", "investments", "retirement"].map((id) => {
    const label = id === "savings" ? "Savings" : id === "investments" ? "Investments" : "Retirement";
    return `<button type="button" class="product-tab${tab === id ? " is-active" : ""}" data-product-tab="${id}" role="tab">${label}</button>`;
  });

  const sections = {
    savings: [
      { title: "Available savings products", key: "savings" },
      { title: "Available investment products", key: "investments" },
      { title: "Retirement", key: "retirement" },
    ],
    investments: [
      { title: "Available investment products", key: "investments" },
      { title: "Available savings products", key: "savings" },
      { title: "Minor account", key: "retirement" },
    ],
    retirement: [
      { title: "Retirement products", key: "retirement" },
      { title: "Available savings products", key: "savings" },
      { title: "Available investment products", key: "investments" },
    ],
  };

  const hero = `
    <section class="card products-hero" data-cursor-src="src/pages/ProductsA.tsx:1">
      <h2 class="section-title">Products</h2>
      <div class="product-tab-row" role="tablist">${tabs.join("")}</div>
      <div class="marketing-card">
        <div class="marketing-card__body">
          <span class="marketing-card__chip">${esc(marketing.chip)}</span>
          <h3>${esc(marketing.title)}</h3>
          <p>${esc(marketing.body)}</p>
        </div>
        <div class="marketing-card__visual" aria-hidden="true"></div>
      </div>
    </section>`;

  const blocks = sections[tab]
    .map(({ title, key }) => {
      const offers = PRODUCT_OFFERS[key] || [];
      return `
        <section class="card product-section-card">
          <h3 class="card__title">${esc(title)}</h3>
          <div class="product-discovery-grid">
            ${offers
              .map(
                (o) => `
              <button type="button" class="discovery-card discovery-card--product" data-nav="offer/${o.id}">
                <div>
                  <strong>${esc(o.bank)}</strong>
                  <span>${esc(o.type)} · ${esc(o.term)}</span>
                  <span class="discovery-card__rate">${esc(o.rate)}</span>
                </div>
                <span class="discovery-card__chevron">›</span>
              </button>`
              )
              .join("")}
          </div>
        </section>`;
    })
    .join("");

  return `${hero}${blocks}`;
}

export function renderAAttentionRail(variant) {
  return renderAttentionPanel(variant, true);
}

export function renderAttentionPanel(variant, compact = false) {
  const visibleCount = compact ? variant.attention.visibleCount : ATTENTION_ITEMS.length;
  const visible = ATTENTION_ITEMS.slice(0, visibleCount);

  const summary = MODEL.pending.count
    ? `
    <div class="attention-summary attention-summary--rich" data-cursor-src="src/components/AttentionSummary.tsx:1">
      <span class="attention-summary__icon attention-summary__icon--clock" aria-hidden="true"></span>
      <div>
        <strong>${MODEL.pending.count} pending deposit${MODEL.pending.count === 1 ? "" : "s"}</strong>
        <span>${esc(fmt(MODEL.pending.total))} processing</span>
      </div>
    </div>`
    : "";

  const items = visible
    .map((item, i) => {
      const tone = item.severity === "critical" ? "critical" : item.id === "pending" ? "warning" : "info";
      return `
        <article class="attention-alert attention-alert--${tone}${compact ? " attention-alert--compact" : ""}" data-attention-id="${item.id}" data-cursor-src="src/components/AttentionItem.tsx:${i + 1}">
          <div class="attention-alert__icon" aria-hidden="true">${tone === "critical" ? "!" : "i"}</div>
          <div class="attention-alert__body">
            <h4>${esc(item.title)}</h4>
            <p>${esc(item.body)}</p>
            <button type="button" class="btn btn--primary btn--sm">${esc(item.cta)}</button>
          </div>
          ${variant.attention.showDismiss ? `<button type="button" class="attention-alert__close" data-dismiss="${item.id}" aria-label="Dismiss">×</button>` : ""}
        </article>`;
    })
    .join("");

  const showAll =
    compact && ATTENTION_ITEMS.length > variant.attention.visibleCount
      ? `<button type="button" class="show-all" data-nav="attention">Show all</button>`
      : "";

  return `
    <section class="card attention-card attention-card--a" id="attention-panel" data-cursor-src="src/components/AttentionCard.tsx:1">
      <div class="card__header">
        <h3 class="card__title">Needs your attention</h3>
        <span class="attention-pill">${variant.attention.badgeCount}</span>
      </div>
      ${summary}
      <div class="attention-list">${items}</div>
      ${showAll}
    </section>`;
}

export function renderAAttentionPage() {
  const critical = `
    <article class="attention-alert attention-alert--critical attention-alert--page">
      <div class="attention-alert__icon" aria-hidden="true">!</div>
      <div class="attention-alert__body">
        <h4>Your Raisin account balance is overdrawn</h4>
        <p>Transfer money to your Raisin account to prevent transactions from being declined.</p>
        <button type="button" class="btn btn--primary">Balance account</button>
      </div>
    </article>`;

  const kyc = `
    <article class="attention-alert attention-alert--info attention-alert--page">
      <div class="attention-alert__icon" aria-hidden="true">i</div>
      <div class="attention-alert__body">
        <h4>Time to re-authenticate your account</h4>
        <p>Your KYC has expired. Please re-authenticate within the next 3 months to keep your Raisin account active.</p>
        <button type="button" class="btn btn--primary">Retry identification</button>
      </div>
    </article>`;

  const pendingCards = [
    { bank: "Klarna Bank", type: "Fix Term Deposit", rate: `${formatRatePa(3.65)} · 1 year`, amount: 10000 },
    { bank: "Portfolio 5", type: "Digital wealth management", rate: "Managed portfolio", amount: 10000 },
    { bank: "Klarna Bank", type: "Overnight", rate: `${formatRatePa(3.65)} · Overnight`, amount: 10000 },
  ]
    .map(
      (card, i) => `
      <article class="pending-order-card" data-cursor-src="src/components/PendingOrderCard.tsx:${i + 1}">
        <div class="pending-order-card__head">
          <div class="pending-order-card__bank">${esc(card.bank.charAt(0))}</div>
          <div>
            <strong>${esc(card.bank)}</strong>
            <span class="pending-order-card__badge">Pending order</span>
            <span>${esc(card.rate)} · ${esc(card.type)}</span>
          </div>
          <strong>${esc(fmt(card.amount))}</strong>
        </div>
        <div class="pending-order-card__progress"><span style="width:0%"></span></div>
        <div class="transfer-callout">
          <p><strong>Please transfer ${esc(fmt(card.amount))}</strong> to fund this order.</p>
          <dl>
            <div><dt>IBAN</dt><dd>DE12 1232 2321 3231 1212</dd></div>
            <div><dt>BIC</dt><dd>RAISDEFFXXX</dd></div>
          </dl>
          <button type="button" class="text-btn">This is a link button ›</button>
        </div>
      </article>`
    )
    .join("");

  return `
    <div class="attention-page" data-cursor-src="src/pages/AttentionA.tsx:1">
      <button type="button" class="back-link" data-go-back><span aria-hidden="true">←</span> Back</button>
      <h1 class="attention-page__title">Needs attention <span class="attention-pill attention-pill--lg">10</span></h1>
      ${critical}
      ${kyc}
      <div class="pending-orders">${pendingCards}</div>
    </div>`;
}

export function renderAForYou(slideIndex = 0) {
  const slides = [
    {
      headline: "Boost your savings with a new fixed-term deposit",
      copy: "Protection limit: up to €100,000 per bank · DGS insured",
    },
    {
      headline: "Earn more with overnight deposits",
      copy: "Flexible access with competitive rates from partner banks.",
    },
    {
      headline: "Diversify with investments",
      copy: "Explore DWM and ETF options tailored to your profile.",
    },
    {
      headline: "Plan ahead for retirement",
      copy: "Tax-advantaged ETF Rürup for long-term growth.",
    },
  ];
  const slide = slides[slideIndex] || slides[0];

  return `
    <section class="card for-you for-you--a" data-cursor-src="src/components/ForYouBanner.tsx:1">
      <div class="card__header"><h3 class="card__title">For you</h3></div>
      <div class="for-you__body">
        <div>
          <p class="for-you__headline">${esc(slide.headline)}</p>
          <p class="for-you__copy">${esc(slide.copy)}</p>
        </div>
        <div class="for-you__media" aria-hidden="true"></div>
      </div>
      <div class="for-you__dots" role="tablist" aria-label="Carousel">
        ${slides
          .map(
            (_, i) =>
              `<button type="button" class="for-you__dot${i === slideIndex ? " is-active" : ""}" data-for-you="${i}" role="tab" aria-selected="${i === slideIndex}"></button>`
          )
          .join("")}
      </div>
    </section>`;
}
