import {
  ATTENTION_ITEMS,
  CATEGORIES,
  MODEL,
  PERSONA,
  PERSONAS,
  PRODUCT_CATEGORIES,
  PRODUCT_OFFERS,
  PRODUCTION_TABS,
  WALLET_TRANSACTIONS,
  WEALTH,
  fmt,
  getCategory,
  getProduct,
  getSubcategory,
  LANGUAGE,
  MARKET,
  personaBlurb,
} from "./data.js";
import { formatEurBefore, formatProductEarn, formatRatePa, formatSignedEur } from "./format.js";
import { LANGUAGES, MARKETS } from "./markets.js";
import { translateDom } from "./i18n.js";
import { VARIANTS } from "./variants.js";
import { categoryIconForColor, iconImg } from "./raisin-icons.js";
import {
  renderParityHeader,
  renderAOverview,
  renderACategoryScreen,
  renderAProductsScreen,
  renderAAttentionPage,
  renderAttentionPanel,
  renderAForYou,
} from "./hypothesis-a.js";
import {
  renderAAlerts,
  renderAProducts,
  renderAWallet,
  renderBAlerts,
  renderBProducts,
  renderBWallet,
  renderControlScreen,
  renderDsCategoryScreen,
  renderDsHeader,
  renderDsTabs,
  renderHypothesisA,
  renderHypothesisAHome,
  renderHypothesisB,
  renderHypothesisBHome,
  renderHypothesisBSavingsSublevel,
  renderDsLifetimeEarnings,
} from "./screens.js";
import { renderPersonaReview } from "./persona-review.js";
import {
  renderControlFooter,
  renderControlHome,
  renderControlLifetimeEarnings,
  renderControlSavings,
  CONTROL_SUBLEVELS,
  SAVINGS_DRILL_SUBLEVELS,
} from "./control.js";
import { bindEarningsCharts } from "./lifetime-earnings.js";

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Connected external accounts sit outside One Data; scale them so the figure stays plausible. */
export const externalBalance = () => Math.round(WEALTH.aop * 0.03);

/* ── Prototype chrome ── */

function renderProtoBar(activeId) {
  const main = ["control", "a", "b"];
  const pills = main
    .map((id) => {
      const v = VARIANTS[id];
      const isActive = id === activeId;
      return `<button type="button" class="proto-pill${isActive ? " is-active" : ""}" data-variant="${id}" aria-pressed="${isActive}">${esc(v.label)}</button>`;
    })
    .join("");

  const onReview = activeId === "review";

  return `
    <div class="proto-bar" data-cursor-src="src/proto/ProtoBar.tsx:1" data-i18n-skip translate="no">
      <div class="proto-bar__start">
        <a href="#review" class="proto-cta${onReview ? " is-active" : ""}" data-nav="__review__"${onReview ? ' aria-current="page"' : ""}>Persona review</a>
        ${renderReportsMenu()}
        <div class="proto-hint proto-hint--row">
          ${renderOneDataPills()}
          <span class="proto-hint__sep" aria-hidden="true">·</span>
          ${renderLocaleSwitch()}
          <span class="proto-hint__sep" aria-hidden="true">·</span>
          <span class="proto-hint proto-hint--feedback">
            <span class="proto-hint__info" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
            </span>
            <span>Press <kbd>c</kbd> to add feedbacks</span>
          </span>
        </div>
      </div>
      <div class="proto-bar__end">
        <div class="proto-bar__variants" role="tablist">${pills}</div>
      </div>
    </div>`;
}

/** Static report pages that live next to the SPA. Relative hrefs so they resolve under the Pages subpath. */
const REPORT_LINKS = [
  { href: "prototype-review/", label: "Prototype review", hint: "Skills vs. custom prompting" },
  { href: "snow-flake-events/", label: "Snowflake events", hint: "Dashboard FE events per market" },
];

function renderReportsMenu() {
  const items = REPORT_LINKS.map(
    (l) => `
        <li role="none">
          <a role="menuitem" class="proto-menu__item" href="${l.href}">
            <span class="proto-menu__item-label">${esc(l.label)}</span>
            <span class="proto-menu__item-hint">${esc(l.hint)}</span>
          </a>
        </li>`
  ).join("");

  return `
    <div class="proto-menu" data-proto-menu data-cursor-src="src/proto/ReportsMenu.tsx:1">
      <button type="button" class="proto-menu__toggle" data-proto-menu-toggle aria-haspopup="menu" aria-expanded="false" aria-controls="proto-reports-menu">
        Reports
        <svg class="proto-menu__chevron" width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <ul class="proto-menu__list" id="proto-reports-menu" role="menu" aria-label="Reports" hidden>${items}
      </ul>
    </div>`;
}

let detachProtoMenu = null;

function bindProtoMenu(root) {
  detachProtoMenu?.();
  detachProtoMenu = null;

  const menu = root.querySelector("[data-proto-menu]");
  const toggle = menu?.querySelector("[data-proto-menu-toggle]");
  const list = menu?.querySelector(".proto-menu__list");
  if (!menu || !toggle || !list) return;

  const items = () => [...list.querySelectorAll("[role=menuitem]")];
  const isOpen = () => !list.hidden;
  const setOpen = (open, { focus } = {}) => {
    list.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    if (open && focus === "first") items()[0]?.focus();
    if (open && focus === "last") items().at(-1)?.focus();
  };

  const onToggle = (e) => {
    e.stopPropagation();
    setOpen(!isOpen());
  };
  const onToggleKey = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    // Handled here; stop the document-level handler from also moving focus.
    e.preventDefault();
    e.stopPropagation();
    setOpen(true, { focus: e.key === "ArrowDown" ? "first" : "last" });
  };
  const onOutside = (e) => {
    if (isOpen() && !menu.contains(e.target)) setOpen(false);
  };
  const onKey = (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") {
      setOpen(false);
      toggle.focus();
      return;
    }
    if (e.key === "Tab") { setOpen(false); return; }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const list_ = items();
    const i = list_.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    list_[(i + (e.key === "ArrowDown" ? 1 : -1) + list_.length) % list_.length].focus();
  };

  toggle.addEventListener("click", onToggle);
  toggle.addEventListener("keydown", onToggleKey);
  document.addEventListener("click", onOutside);
  document.addEventListener("keydown", onKey);

  detachProtoMenu = () => {
    toggle.removeEventListener("click", onToggle);
    toggle.removeEventListener("keydown", onToggleKey);
    document.removeEventListener("click", onOutside);
    document.removeEventListener("keydown", onKey);
  };
}

/**
 * One Data persona pills (compact). Changing persona reloads every variant from the same registry.
 */
function renderOneDataPills() {
  const buttons = PERSONAS.map((p) => {
    const isActive = p.id === PERSONA;
    return `<button type="button" class="proto-persona proto-persona--compact${isActive ? " is-active" : ""}" data-persona="${p.id}" role="tab" aria-selected="${isActive}" title="${esc(p.label)} — ${esc(personaBlurb(p.id))}">${esc(p.short)}</button>`;
  }).join("");

  return `
    <span class="proto-one-data" data-cursor-src="src/proto/PersonaSwitch.tsx:1">
      <span class="proto-one-data__label">One Data</span>
      <span class="proto-persona-switch__group proto-persona-switch__group--compact" role="tablist" aria-label="Portfolio persona">${buttons}</span>
      <strong class="proto-one-data__aop">${esc(formatEurBefore(WEALTH.aop))}</strong>
    </span>`;
}

/** Market + UI language. Both drive Control, A and B together; Germany / English by default. */
function renderLocaleSwitch() {
  const select = (id, label, key, options, current) => `
    <label class="proto-locale" for="${id}">
      <span class="proto-locale__label">${esc(label)}</span>
      <select id="${id}" class="proto-locale__select" ${key}>
        ${options.map((o) => `<option value="${o.id}"${o.id === current ? " selected" : ""}>${esc(o.text)}</option>`).join("")}
      </select>
    </label>`;

  return `
    <span class="proto-locale-group" data-cursor-src="src/proto/LocaleSwitch.tsx:1">
      ${select("proto-market", "Country", "data-market-select", MARKETS.map((m) => ({ id: m.id, text: `${m.flag} ${m.label}` })), MARKET)}
      ${select("proto-language", "Language", "data-language-select", LANGUAGES.map((l) => ({ id: l.id, text: l.native })), LANGUAGE)}
    </span>`;
}

/* ── Category rings (separate ring per category) ── */

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

function renderCategoryRings(mode, ringView = "allocation", size = "md") {
  const isPerf = ringView === "performance";
  const rings = CATEGORIES.map((cat) => {
    const pct = isPerf ? Math.min(cat.perfPct * 8, 100) : cat.pct;
    const center = isPerf ? `+${cat.perfPct}%` : `${Math.round(cat.pct)}%`;
    const sub = isPerf ? fmt(cat.earnings) : fmt(cat.amount);
    return `
      <button type="button" class="cat-ring cat-ring--${size} cat-ring--${cat.color}" data-nav="category/${cat.id}" data-cursor-src="src/components/CategoryRing.tsx:${cat.id}">
        <div class="cat-ring__visual">${ringSvg(pct, cat.color, size)}<span class="cat-ring__center">${center}</span></div>
        <span class="cat-ring__label">${esc(cat.label)}</span>
        <strong class="cat-ring__amount">${sub}</strong>
      </button>`;
  }).join("");

  const cls =
    mode === "inline"
      ? "cat-rings cat-rings--inline"
      : mode === "cards"
        ? "cat-rings cat-rings--cards"
        : "cat-rings cat-rings--hero";

  return `<div class="${cls}" data-cursor-src="src/components/CategoryRings.tsx:1">${rings}</div>`;
}

function renderAllocPerfToggle(ringView) {
  return `
    <div class="seg-toggle" role="tablist" aria-label="Ring view" data-cursor-src="src/components/AllocPerfToggle.tsx:1">
      <button type="button" class="seg-toggle__btn${ringView === "allocation" ? " is-active" : ""}" data-ring-view="allocation" role="tab" aria-selected="${ringView === "allocation"}">Allocation</button>
      <button type="button" class="seg-toggle__btn${ringView === "performance" ? " is-active" : ""}" data-ring-view="performance" role="tab" aria-selected="${ringView === "performance"}">Performance</button>
    </div>`;
}

/* ── Header & chrome ── */

function renderHeader(variant, screen) {
  if (variant.concept === "control" || variant.concept === "a" || variant.concept === "b") {
    return renderDsHeader(variant.concept, screen);
  }

  const badge =
    variant.headerBadge && screen === "overview"
      ? `<button type="button" class="attention-badge" data-scroll-attention data-cursor-src="src/components/AttentionBadge.tsx:1">
          <span>Needs attention</span><span class="attention-badge__count">${variant.attention.badgeCount}</span>
        </button>`
      : "";

  if (variant.headerMode === "parity") {
    return renderParityHeader(screen);
  }

  if (variant.headerMode === "mobile") {
    const navItems = [
      { id: "overview", label: "Overview" },
      { id: "products", label: "Products" },
      { id: "inbox", label: "Inbox", badge: variant.attention.badgeCount },
      { id: "profile", label: "Profile" },
    ];
    return `
      <header class="site-header site-header--mobile" data-cursor-src="src/layout/SiteHeaderMobile.tsx:1">
        <div class="site-header__brand">raisin</div>
        <nav class="site-header__nav site-header__nav--mobile">
          ${navItems
            .map((item) => {
              const active =
                (item.id === "overview" && screen === "overview") ||
                (item.id === "products" && (screen === "products" || screen.startsWith("offer")))
                  ? " is-active"
                  : "";
              const nav = item.id === "overview" ? "overview" : item.id === "products" ? "products" : "#";
              return `<a href="#" class="site-header__tab${active}" data-nav="${nav}">${esc(item.label)}${
                item.badge ? `<span class="site-header__tab-badge">${item.badge}</span>` : ""
              }</a>`;
            })
            .join("")}
        </nav>
        <div class="site-header__actions">${badge}<span aria-hidden="true">👤</span></div>
      </header>`;
  }

  const dashActive = screen !== "products" ? " is-active" : "";
  const prodActive = screen === "products" ? " is-active" : "";

  return `
    <header class="site-header" data-cursor-src="src/layout/SiteHeader.tsx:1">
      <div class="site-header__brand">raisin</div>
      <nav class="site-header__nav">
        <a href="#" class="${dashActive}" data-nav="overview">Home</a>
        <a href="#" data-nav="products">Offers</a>
        <a href="#">Help</a>
      </nav>
      <div class="site-header__actions">
        ${badge}
        <span>UHNW · DE · €</span>
        <span aria-hidden="true">👤</span>
      </div>
    </header>`;
}

/** Categories that render the DS category composition rather than a legacy list. */
const CATEGORY_TABS = new Set(["investments", "retirement"]);

function renderProductionTabs(activeTab = "overview") {
  return `
    <div class="prod-tabs" role="tablist" data-cursor-src="src/components/ProductionTabs.tsx:1">
      ${PRODUCTION_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const nav =
          tab.id === "overview"
            ? "overview"
            : tab.id === "wallet"
              ? "wallet"
              : `category/${tab.id}`;
        return `<button type="button" class="prod-tab${isActive ? " is-active" : ""}" data-nav="${nav}" role="tab" aria-selected="${isActive}">${esc(tab.label)}</button>`;
      }).join("")}
    </div>`;
}

function renderBreadcrumb(variantId, screen, params) {
  const crumbs = [{ label: "Dashboard", nav: "overview" }];
  if (screen === "category" && params[0]) {
    const cat = getCategory(params[0]);
    crumbs.push({ label: cat?.label || params[0], nav: null });
  } else if (screen === "subcategory" && params.length >= 2) {
    const cat = getCategory(params[0]);
    crumbs.push({ label: cat?.label || params[0], nav: `category/${params[0]}` });
    const sub = getSubcategory(params[0], params[1]);
    crumbs.push({ label: sub?.label || params[1], nav: null });
  } else if (screen === "product" && params.length >= 3) {
    const cat = getCategory(params[0]);
    const sub = getSubcategory(params[0], params[1]);
    crumbs.push({ label: cat?.label, nav: `category/${params[0]}` });
    crumbs.push({ label: sub?.label, nav: `subcategory/${params[0]}/${params[1]}` });
    crumbs.push({ label: "Product detail", nav: null });
  } else if (screen === "products") {
    crumbs.push({ label: "Products", nav: null });
  } else if (screen === "wallet") {
    crumbs.push({ label: "Raisin Account", nav: null });
  }

  return `
    <nav class="breadcrumb" aria-label="Breadcrumb" data-cursor-src="src/components/Breadcrumb.tsx:1">
      <button type="button" class="breadcrumb__back" data-go-back aria-label="Go back">←</button>
      ${crumbs
        .map((c, i) => {
          const isLast = i === crumbs.length - 1;
          if (isLast || !c.nav) return `<span class="breadcrumb__current">${esc(c.label)}</span>`;
          return `<button type="button" class="breadcrumb__link" data-nav="${c.nav}">${esc(c.label)}</button><span class="breadcrumb__sep">/</span>`;
        })
        .join("")}
    </nav>`;
}

/* ── Attention & wallet ── */

function renderAttention(variant, compact = false) {
  if (variant.concept === "a") return renderAttentionPanel(variant, compact);

  const { attention } = variant;
  const visible = ATTENTION_ITEMS.slice(0, attention.visibleCount);
  const summary =
    attention.showSummary && MODEL.pending.count
      ? `<div class="attention-summary" data-cursor-src="src/components/AttentionSummary.tsx:1">
        <span class="attention-summary__icon" aria-hidden="true">⏳</span>
        <div><strong>${MODEL.pending.count} pending deposit${MODEL.pending.count === 1 ? "" : "s"}</strong><span>${esc(fmt(MODEL.pending.total))} processing</span></div>
      </div>`
      : "";

  const items = visible
    .map((item, i) => {
      const dismiss = attention.showDismiss
        ? `<button type="button" class="btn btn--ghost" data-dismiss="${item.id}" aria-label="Dismiss">✕</button>`
        : "";
      return `
        <article class="attention-item${item.severity === "critical" ? " attention-item--critical" : ""}${compact ? " attention-item--compact" : ""}" data-attention-id="${item.id}" data-cursor-src="src/components/AttentionItem.tsx:${i + 1}">
          <div class="attention-item__body"><h4>${esc(item.title)}</h4><p>${esc(item.body)}</p></div>
          <div class="attention-item__actions"><button type="button" class="btn btn--secondary">${esc(item.cta)}</button>${dismiss}</div>
        </article>`;
    })
    .join("");

  const hidden = ATTENTION_ITEMS.length - attention.visibleCount;
  const showAll =
    attention.showAll && hidden > 0
      ? `<button type="button" class="show-all" data-show-all-attention>Show all</button>`
      : "";

  return `
    <section class="card attention-card" id="attention-panel" data-cursor-src="src/components/AttentionCard.tsx:1">
      <div class="card__header">
        <h3 class="card__title">Needs your attention</h3>
        <span class="attention-pill">${attention.badgeCount}</span>
      </div>
      ${summary}
      <div class="attention-list">${items}</div>
      ${showAll}
    </section>`;
}

function renderWalletRail(compact = false) {
  const actions = compact
    ? `<div class="wallet-actions wallet-actions--compact">
        <button type="button" class="wallet-action" data-cursor-src="src/components/WalletAction.tsx:1"><span class="wallet-action__icon">↓</span>Deposit</button>
        <button type="button" class="wallet-action"><span class="wallet-action__icon">↑</span>Withdraw</button>
        <button type="button" class="wallet-action" data-nav="products"><span class="wallet-action__icon">+</span>Invest</button>
      </div>`
    : `<div class="wallet-actions">
        <button type="button" class="wallet-action"><span class="wallet-action__icon">↓</span>Deposit</button>
        <button type="button" class="wallet-action"><span class="wallet-action__icon">↑</span>Withdraw</button>
        <button type="button" class="wallet-action" data-nav="products"><span class="wallet-action__icon">+</span>Invest</button>
      </div>`;

  const txs = WALLET_TRANSACTIONS.slice(0, compact ? 3 : 5)
    .map(
      (tx, i) => `
      <div class="tx-row" data-cursor-src="src/components/TransactionRow.tsx:${i + 1}">
        <span>${esc(tx.label)}<br><small>${esc(tx.date)}</small></span>
        <strong class="${tx.amount < 0 ? "tx-row--debit" : "tx-row--credit"}">${esc(formatSignedEur(tx.amount))}</strong>
      </div>`
    )
    .join("");

  return `
    <section class="card wallet-card" data-cursor-src="src/components/WalletCard.tsx:1">
      <div class="card__header">
        <h3 class="card__title">Raisin Account</h3>
        <button type="button" class="card__link" data-nav="wallet">View all</button>
      </div>
      <p class="wallet-card__balance">${esc(fmt(WEALTH.availableCash))}</p>
      <p class="wallet-card__meta">Available cash · included in AOP</p>
      ${actions}
      <h4 class="wallet-card__section">Recent transactions</h4>
      ${txs}
    </section>`;
}

/* ── Portfolio sections ── */

function renderCategoryCards() {
  return `
    <section class="card portfolio-card" data-cursor-src="src/components/PortfolioCategories.tsx:1">
      <div class="card__header">
        <h3 class="card__title">Your portfolio</h3>
        <span class="card__meta">${CATEGORIES.reduce((n, c) => n + c.productCount, 0)} products</span>
      </div>
      <div class="category-cards">
        ${CATEGORIES.map(
          (cat, i) => `
          <button type="button" class="category-card category-card--${cat.color}" data-nav="category/${cat.id}" data-cursor-src="src/components/CategoryCard.tsx:${i + 1}">
            <div class="category-card__leading">
              <span class="category-card__dot" aria-hidden="true"></span>
              <div>
                <span class="category-card__label">${esc(cat.label)}</span>
                <span class="category-card__count">${cat.productCount} products · ${cat.subcategories.length} types</span>
              </div>
            </div>
            <div class="category-card__trailing">
              <strong>${esc(fmt(cat.amount))}</strong>
              <span class="category-card__chevron" aria-hidden="true">›</span>
            </div>
          </button>`
        ).join("")}
      </div>
    </section>`;
}

function renderSubcategoryList(catId) {
  const cat = getCategory(catId);
  if (!cat) return "";
  return `
    <section class="card" data-cursor-src="src/components/SubcategoryList.tsx:1">
      <div class="card__header"><h3 class="card__title">${esc(cat.label)} breakdown</h3></div>
      <div class="subcategory-list">
        ${cat.subcategories
          .map(
            (sub, i) => `
            <button type="button" class="subcategory-row" data-nav="subcategory/${catId}/${sub.id}" data-cursor-src="src/components/SubcategoryRow.tsx:${i + 1}">
              <div>
                <strong>${esc(sub.label)}</strong>
                <span>${esc(sub.count)}</span>
              </div>
              <div class="subcategory-row__right">
                <strong>${esc(fmt(sub.amount))}</strong>
                <span class="subcategory-row__earn">${esc(formatProductEarn(sub.earnings))} earnings</span>
                <span class="category-card__chevron">›</span>
              </div>
            </button>`
          )
          .join("")}
      </div>
      <button type="button" class="btn btn--primary btn--block" data-nav="products/${catId}" style="margin-top:1rem">Order new ${esc(cat.label.toLowerCase())} product</button>
    </section>`;
}

function renderProductList(catId, subId) {
  const sub = getSubcategory(catId, subId);
  if (!sub) return "";
  return `
    <section class="card" data-cursor-src="src/components/ProductList.tsx:1">
      <div class="card__header"><h3 class="card__title">${esc(sub.label)}</h3><span>${esc(sub.count)}</span></div>
      <div class="product-list">
        ${sub.products
          .map(
            (p, i) => `
            <button type="button" class="product-row" data-nav="product/${catId}/${subId}/${p.id}" data-cursor-src="src/components/ProductRow.tsx:${i + 1}">
              <div>
                <strong>${esc(p.bank)}</strong>
                <span>${esc(formatRatePa(p.ratePct ?? p.rate))}</span>
                ${p.pending ? `<span class="product-row__pending">${esc(formatEurBefore(p.pending))} pending</span>` : ""}
              </div>
              <div class="product-row__right">
                <strong>${esc(fmt(p.amount))}</strong>
                <span class="category-card__chevron">›</span>
              </div>
            </button>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderProductDetail(catId, subId, prodId) {
  const product = getProduct(catId, subId, prodId);
  const sub = getSubcategory(catId, subId);
  const cat = getCategory(catId);
  if (!product) return `<p>Product not found.</p>`;
  return `
    <section class="card product-detail" data-cursor-src="src/components/ProductDetail.tsx:1">
      <div class="product-detail__header">
        <span class="product-detail__badge product-detail__badge--${cat?.color}">${esc(cat?.label)}</span>
        <h2>${esc(product.bank)}</h2>
        <p class="product-detail__amount">${esc(fmt(product.amount))}</p>
      </div>
      <dl class="detail-grid">
        <div><dt>Interest rate</dt><dd>${esc(formatRatePa(product.ratePct ?? product.rate))}</dd></div>
        <div><dt>Product type</dt><dd>${esc(sub?.label)}</dd></div>
        ${product.pending ? `<div><dt>Pending deposit</dt><dd>${esc(fmt(product.pending))}</dd></div>` : ""}
        <div><dt>Status</dt><dd>Active</dd></div>
      </dl>
      <div class="product-detail__actions">
        <button type="button" class="btn btn--primary">Add funds</button>
        <button type="button" class="btn btn--secondary">Manage</button>
      </div>
    </section>`;
}

/* ── Products discovery ── */

function renderProductsScreen(filterId) {
  const cats = filterId
    ? PRODUCT_CATEGORIES.filter((c) => c.id === filterId || filterId.startsWith(c.id))
    : PRODUCT_CATEGORIES;

  const offers = filterId
    ? PRODUCT_OFFERS[filterId] || []
    : [...PRODUCT_OFFERS.savings, ...PRODUCT_OFFERS.investments, ...PRODUCT_OFFERS.retirement];

  return `
    <div class="products-screen" data-cursor-src="src/pages/Products.tsx:1">
      <section class="card">
        <div class="card__header"><h2 class="card__title">Discover products</h2></div>
        <p class="products-screen__intro">Order new savings, investments, or retirement products — same catalogue as the mobile app.</p>
        <div class="product-type-grid">
          ${cats
            .map(
              (c, i) => `
              <button type="button" class="product-type-card product-type-card--${c.icon}" data-nav="products/${c.id}" data-cursor-src="src/components/ProductTypeCard.tsx:${i + 1}">
                <span class="product-type-card__icon">${iconImg({ src: categoryIconForColor(c.icon), size: 24, className: "product-type-card__glyph" })}</span>
                <strong>${esc(c.label)}</strong>
                <span>${esc(c.desc)}</span>
                <span class="product-type-card__count">${c.count} product types</span>
              </button>`
            )
            .join("")}
        </div>
      </section>
      <section class="card">
        <div class="card__header">
          <h3 class="card__title">${filterId ? `Top ${esc(getCategory(filterId)?.label || "offers")}` : "Popular offers"}</h3>
          <a href="#" class="card__link">See all rates</a>
        </div>
        <div class="offers-grid">
          ${offers
            .map(
              (o, i) => `
              <button type="button" class="offer-card${o.missing ? " offer-card--missing" : ""}" data-nav="offer/${o.id}" data-cursor-src="src/components/OfferCard.tsx:${i + 1}">
                <span class="offer-card__type">${esc(o.type)}</span>
                <strong>${esc(o.bank)}</strong>
                <span class="offer-card__term">${esc(o.term)}</span>
                <span class="offer-card__rate">${esc(o.rate)}</span>
                ${o.missing ? '<span class="signpost__badge">Coming soon</span>' : '<span class="offer-card__cta">Order now →</span>'}
              </button>`
            )
            .join("")}
        </div>
      </section>
      <section class="card promo-card" data-cursor-src="src/components/PromoCard.tsx:1">
        <h4>€200 weekly savings plan</h4>
        <p>Automate deposits into your Raisin Account. Next deposit: 15 Oct 2024.</p>
        <button type="button" class="btn btn--secondary">Set up plan</button>
      </section>
    </div>`;
}

function renderOfferDetail(offerId) {
  const all = [...PRODUCT_OFFERS.savings, ...PRODUCT_OFFERS.investments, ...PRODUCT_OFFERS.retirement];
  const offer = all.find((o) => o.id === offerId);
  if (!offer) return renderProductsScreen();
  return `
    <section class="card product-detail" data-cursor-src="src/pages/OfferDetail.tsx:1">
      <span class="product-detail__badge">${esc(offer.type)}</span>
      <h2>${esc(offer.bank)}</h2>
      <p class="product-detail__amount">${esc(formatRatePa(offer.ratePct ?? offer.rate))}</p>
      <p>${esc(offer.term)} · Estimated for the ${esc(MODEL.label)} profile</p>
      <div class="order-form">
        <label>Deposit amount<input type="text" value="${esc(fmt(Math.max(offer.minAmount ?? 0, WEALTH.availableCash)))}" class="input"/></label>
        <label>Term<select class="input"><option>${esc(offer.term)}</option></select></label>
      </div>
      <button type="button" class="btn btn--primary btn--block">Continue to order</button>
    </section>`;
}

function renderWalletScreen() {
  return `
    <div class="wallet-screen" data-cursor-src="src/pages/Wallet.tsx:1">
      <section class="card wallet-hero">
        <p class="wallet-hero__label">Raisin Account balance</p>
        <h2 class="wallet-hero__amount">${esc(formatEurBefore(WEALTH.availableCash))}</h2>
        <p class="wallet-hero__meta">Part of your ${esc(formatEurBefore(WEALTH.aop))} total assets on platform</p>
        <div class="wallet-actions">${["Deposit", "Withdraw", "Invest"].map((l, i) => `<button type="button" class="wallet-action" ${l === "Invest" ? 'data-nav="products"' : ""}><span class="wallet-action__icon">${["↓", "↑", "+"][i]}</span>${l}</button>`).join("")}</div>
      </section>
      <section class="card">
        <div class="card__header"><h3 class="card__title">All transactions</h3></div>
        ${WALLET_TRANSACTIONS.map((tx) => `<div class="tx-row"><span>${esc(tx.label)}<br><small>${esc(tx.date)}</small></span><strong>${esc(fmt(Math.abs(tx.amount)))}</strong></div>`).join("")}
      </section>
    </div>`;
}

/* ── Shared content blocks ── */

function renderEarningsWidget() {
  return `
    <section class="card" data-cursor-src="src/components/EarningsWidget.tsx:1">
      <div class="card__header">
        <h3 class="card__title">Earnings</h3>
        <span class="card__meta">Lifetime · Model A</span>
      </div>
      <p class="earnings-total">${esc(formatProductEarn(WEALTH.totalEarnings))} <span>total earnings</span></p>
      <div class="earnings-breakdown">
        ${CATEGORIES.map((c) => `<div class="earnings-row"><span>${esc(c.label)}</span><strong>${esc(formatProductEarn(c.earnings))}</strong></div>`).join("")}
      </div>
      <div class="earnings-chart" aria-hidden="true"></div>
    </section>`;
}

function renderPopularDeposits(compact = false) {
  const offers = PRODUCT_OFFERS.savings.slice(0, 4);
  if (compact) {
    return `
      <section class="card popular-rail" data-cursor-src="src/components/PopularDepositsRail.tsx:1">
        <div class="card__header">
          <h3 class="card__title">Popular deposits for you</h3>
          <button type="button" class="card__link" data-nav="products/savings">See all</button>
        </div>
        <div class="ov-grid ov-grid--rail">
          ${offers
            .map(
              (o, i) => `
            <button type="button" class="ov-offer-card" data-nav="offer/${o.id}" data-cursor-src="src/components/OvCard.tsx:${i + 1}">
              <span class="ov-offer-card__rate">${esc(o.rate)}</span>
              <strong>${esc(o.bank)}</strong>
              <span>${esc(o.term)}</span>
            </button>`
            )
            .join("")}
        </div>
      </section>`;
  }

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
          <button type="button" class="ov-offer-card ov-offer-card--wide" data-nav="offer/${o.id}" data-cursor-src="src/components/OvCard.tsx:${i + 1}">
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

function renderForYou(variant, forYouIndex = 0) {
  if (variant?.concept === "a") return renderAForYou(forYouIndex);

  return `
    <section class="card for-you" data-cursor-src="src/components/ForYouBanner.tsx:1">
      <div class="card__header"><h3 class="card__title">For you</h3></div>
      <div class="for-you__body">
        <div>
          <p class="for-you__headline">Boost your savings with a new fixed-term deposit</p>
          <p class="for-you__copy">Protection limit: up to €100,000 per bank · DGS insured</p>
        </div>
        <div class="for-you__media" aria-hidden="true"></div>
      </div>
      <div class="for-you__dots" aria-hidden="true"><span class="is-active"></span><span></span><span></span><span></span></div>
    </section>`;
}

function renderCentralUnit() {
  return `
    <div class="central-unit" data-cursor-src="src/components/CentralUnit.tsx:1">
      <p class="central-unit__label">Total wealth</p>
      <p class="central-unit__amount">${esc(formatEurBefore(WEALTH.aop))}</p>
    </div>`;
}

function renderDonutHero(state) {
  const { ringView } = state;
  return `
    <section class="card wealth-section" data-cursor-src="src/variants/b/WealthHero.tsx:1">
      <h2 class="section-title">Your wealth</h2>
      <div class="wealth-section__top">
        ${renderAllocPerfToggle(ringView)}
      </div>
      <div class="donut-card donut-card--4">
        <div class="donut-visual donut-visual--aop" role="img" aria-label="Allocation chart">
          <div class="donut-visual__center">
            <strong>${esc(fmt(WEALTH.aop))}</strong>
            <span>Total wealth</span>
          </div>
        </div>
        <ul class="legend">
          ${CATEGORIES.map(
            (c) =>
              `<li><span><span class="legend__dot legend__dot--${c.color}"></span>${esc(c.label)}</span><strong>${esc(fmt(c.amount))}</strong></li>`
          ).join("")}
          <li><span><span class="legend__dot legend__dot--navy"></span>Raisin Account</span><strong>${esc(fmt(WEALTH.availableCash))}</strong></li>
        </ul>
      </div>
    </section>`;
}

function renderAllocationBar() {
  const segments = [
    { color: "savings", pct: CATEGORIES[0].pct },
    { color: "invest", pct: CATEGORIES[1].pct },
    { color: "retire", pct: CATEGORIES[2].pct },
    { color: "navy", pct: (WEALTH.availableCash / WEALTH.aop) * 100 },
  ];
  return `
    <div class="alloc-bar-wrap" data-cursor-src="src/components/AllocationBar.tsx:1">
      ${renderAllocPerfToggle("allocation")}
      <div class="alloc-bar" aria-hidden="true">
        ${segments.map((s) => `<span class="alloc-bar__seg alloc-bar__seg--${s.color}" style="flex:${s.pct.toFixed(1)}"></span>`).join("")}
      </div>
      <ul class="legend legend--inline">
        ${CATEGORIES.map(
          (c) =>
            `<li><span class="legend__dot legend__dot--${c.color}"></span>${esc(c.label)} <strong>${esc(fmt(c.amount))}</strong></li>`
        ).join("")}
        <li><span class="legend__dot legend__dot--navy"></span>Raisin Account <strong>${esc(fmt(WEALTH.availableCash))}</strong></li>
      </ul>
    </div>`;
}

function renderFeatureRow(cat, withRing = false) {
  const ring = withRing
    ? `<div class="feature-row__ring">${ringSvg(cat.pct, cat.color, "sm")}</div>`
    : `<div class="feature-row__avatar feature-row__avatar--${cat.color}"></div>`;
  return `
    <button type="button" class="feature-row" data-nav="category/${cat.id}" data-cursor-src="src/components/FeatureRow.tsx:${cat.id}">
      ${ring}
      <div class="feature-row__body">
        <strong>${esc(cat.label)}</strong>
        <span>${Math.round(cat.pct)}% allocation · ${cat.productCount} products</span>
      </div>
      <div class="feature-row__right">
        <strong>${esc(fmt(cat.amount))}</strong>
        <span class="feature-row__earn">${esc(formatProductEarn(cat.earnings))}</span>
      </div>
    </button>`;
}

function renderCompactProductRow(sub, product) {
  return `
    <div class="feature-row feature-row--static" data-cursor-src="src/components/ProductFeatureRow.tsx:1">
      <div class="feature-row__avatar"></div>
      <div class="feature-row__body">
        <strong>${esc(product.bank)}</strong>
        <span>${esc(formatRatePa(product.ratePct ?? product.rate))}</span>
      </div>
      <strong>${esc(fmt(product.amount))}</strong>
    </div>`;
}

function renderExpandedOvernightListing() {
  const sub = getSubcategory("savings", "overnight");
  const product = sub?.products[0];
  if (!product) return "";
  return `
    <div class="listing-on card" data-cursor-src="src/components/ListingOvernight.tsx:1">
      <div class="listing-on__head">
        <div><span class="listing-on__type">Overnight</span><strong>${esc(fmt(sub.amount))}</strong></div>
      </div>
      <div class="listing-on__main">
        <div class="listing-on__bank">${esc(product.bank)}</div>
        <div class="listing-on__meta">Current rate: ${esc(formatRatePa(product.ratePct ?? product.rate))} · Overnight deposit</div>
        <div class="listing-on__meta">Savings plan: ${esc(formatEurBefore(200))} weekly (Next: 15.10.2024)</div>
        <div class="listing-on__balance">${esc(fmt(product.amount))}</div>
      </div>
      <div class="listing-on__actions">
        ${["Details", "Transactions", "Deposit", "Order", "Manage", "Cancel"].map((l) => `<button type="button" class="link-btn">${l} ›</button>`).join("")}
      </div>
    </div>`;
}

function renderPortfolioBlock(mode) {
  if (mode === "rings") {
    return `
      <section class="card portfolio-stack" data-cursor-src="src/variants/a/Portfolio.tsx:1">
        <h2 class="section-title">Portfolio</h2>
        <div class="portfolio-stack__list">
          ${CATEGORIES.map((c) => renderFeatureRow(c, true)).join("")}
        </div>
        <div class="portfolio-stack__other">
          <h3 class="section-subtitle">Other banks</h3>
          <button type="button" class="feature-row" data-nav="wallet">
            <div class="feature-row__avatar"></div>
            <div class="feature-row__body"><strong>External account</strong><span>1 bank connected</span></div>
            <strong>${esc(fmt(externalBalance()))}</strong>
          </button>
        </div>
      </section>`;
  }

  if (mode === "compact") {
    const sections = CATEGORIES.map((cat) => {
      const productRows = cat.subcategories
        .slice(0, 3)
        .map((sub) => sub.products[0])
        .filter(Boolean)
        .map((p) => renderCompactProductRow(null, p))
        .join("");
      return `
        <div class="portfolio-section">
          <div class="portfolio-section__head"><h3>${esc(cat.label)}</h3><span class="chip">${cat.productCount}</span></div>
          ${productRows}
        </div>`;
    }).join("");
    return `
      <section class="card portfolio-stack" data-cursor-src="src/variants/b/Portfolio.tsx:1">
        <h2 class="section-title">Portfolio</h2>
        ${sections}
        <div class="portfolio-section">
          <div class="portfolio-section__head"><h3>Other banks</h3><span class="chip">1</span></div>
          ${renderCompactProductRow(null, { bank: "Commerzbank", rate: "—", amount: 18420 })}
        </div>
      </section>`;
  }

  // expanded (C)
  const savings = getCategory("savings");
  const ftdProducts = savings.subcategories[0].products.slice(0, 2);
  return `
    <section class="card portfolio-stack portfolio-stack--expanded" data-cursor-src="src/variants/c/Portfolio.tsx:1">
      <div class="portfolio-section">
        <div class="portfolio-section__head"><h3>Savings</h3><span class="chip">${savings.productCount}</span></div>
        <div class="combo-head"><span>Fixed-term</span><strong>${esc(fmt(savings.subcategories[0].amount))}</strong></div>
        ${ftdProducts
          .map(
            (p) => `
          <div class="feature-row feature-row--tall feature-row--static">
            <div class="feature-row__body"><strong>${esc(p.bank)}</strong><span>${esc(formatRatePa(p.ratePct ?? p.rate))} · Pending ${p.pending ? fmt(p.pending) : "—"}</span></div>
            <strong>${esc(fmt(p.amount))}</strong>
          </div>`
          )
          .join("")}
        <button type="button" class="show-all">Show all</button>
        <div class="combo-head"><span>Overnight</span><strong>${esc(fmt(savings.subcategories[1].amount))}</strong></div>
        ${renderExpandedOvernightListing()}
        <div class="combo-head"><span>Notice</span><strong>${esc(fmt(savings.subcategories[2].amount))}</strong></div>
        ${renderCompactProductRow(null, savings.subcategories[2].products[0])}
      </div>
      ${CATEGORIES.filter((c) => c.id !== "savings")
        .map((cat) => {
          const prods = cat.subcategories.flatMap((s) => s.products).slice(0, cat.id === "investments" ? 3 : 2);
          return `
          <div class="portfolio-section">
            <div class="portfolio-section__head"><h3>${esc(cat.label)}</h3><span class="chip">${cat.productCount}</span></div>
            ${prods.map((p) => renderCompactProductRow(null, p)).join("")}
            ${cat.id === "investments" ? '<button type="button" class="show-all">Show all</button>' : ""}
          </div>`;
        })
        .join("")}
      <div class="portfolio-section">
        <div class="portfolio-section__head"><h3>Wallet</h3><span class="chip">1</span></div>
        ${renderCompactProductRow(null, { bank: "Commerzbank", rate: "External", amount: 18420 })}
      </div>
    </section>`;
}

function renderOvAllocationCards() {
  return `
    <div class="ov-allocation-row" data-cursor-src="src/variants/a/OvCards.tsx:1">
      <button type="button" class="ov-allocation-card" data-nav="category/savings">
        <div class="ov-allocation-card__ring">${ringSvg(57, "savings", "sm")}</div>
        <div><span>Portfolio</span><strong>${esc(fmt(WEALTH.totalInvested))}</strong><small>${CATEGORIES.reduce((n, c) => n + c.productCount, 0)} products</small></div>
        <span class="category-card__chevron">›</span>
      </button>
      <button type="button" class="ov-allocation-card" data-nav="wallet">
        <div class="ov-allocation-card__ring">${ringSvg(4, "navy", "sm")}</div>
        <div><span>Raisin Account</span><strong>${esc(fmt(WEALTH.availableCash))}</strong><small>Available cash</small></div>
        <span class="category-card__chevron">›</span>
      </button>
    </div>`;
}

function renderRailBlock(id, variant) {
  switch (id) {
    case "wallet":
      return renderWalletRail(true);
    case "earnings":
      return renderEarningsWidget();
    case "attention":
      return renderAttention(variant, true);
    case "foryou":
      return renderForYou(variant, variant._forYouIndex ?? 0);
    case "popular":
      return renderPopularDeposits(true);
    default:
      return "";
  }
}

function renderRail(variant) {
  return variant.railOrder.map((id) => renderRailBlock(id, variant)).join("");
}

function renderControlDonut() {
  return `
    <section class="card" data-cursor-src="src/components/PortfolioCard.tsx:1">
      <div class="card__header"><h3 class="card__title">Your wealth</h3></div>
      <div class="aop-hero aop-hero--control">
        <div>
          <p class="aop-hero__label">Total assets on platform</p>
          <h2 class="aop-hero__total">${esc(formatEurBefore(WEALTH.aop))}</h2>
          <p class="aop-hero__sub">Invested ${esc(fmt(WEALTH.totalInvested))} · Cash ${esc(fmt(WEALTH.availableCash))}</p>
        </div>
        <ul class="legend">
          ${CATEGORIES.map((c) => `<li><span><span class="legend__dot legend__dot--${c.color}"></span>${esc(c.label)}</span><strong>${esc(fmt(c.amount))}</strong></li>`).join("")}
        </ul>
      </div>
    </section>`;
}

/* ── Concept-specific overviews ── */

function renderControlOverview() {
  return renderControlScreen();
}

function renderAOverviewScreen(uiState = {}) {
  return renderHypothesisAHome(uiState);
}

function renderBOverview(uiState = {}) {
  return renderHypothesisBHome(uiState);
}

/* ── Main render ── */

export function renderDashboard(variantId, route, uiState = {}) {
  if (variantId === "review") {
    return `
    ${renderProtoBar("review")}
    <div class="app-shell app-shell--ds">
      <div class="app-main">
        <main class="ds-main">${renderPersonaReview()}</main>
      </div>
    </div>`;
  }

  const variant = VARIANTS[variantId] || VARIANTS.control;
  const { screen, params } = route;

  /* Control is a straight transcription of the Figma frames, so it renders its
   * own header, rail and footer instead of going through the shared chrome. */
  const controlScreen =
    variant.concept === "control" &&
    (screen === "overview" ||
      screen === "lifetime-earnings" ||
      (screen === "category" && CONTROL_SUBLEVELS.has(params[0])));

  if (controlScreen) {
    const body =
      screen === "lifetime-earnings"
        ? renderControlLifetimeEarnings()
        : screen === "overview"
          ? renderControlHome(uiState)
          : renderControlSavings(params[0], params[1] || uiState.controlView || "category", uiState);
    return `
    ${renderProtoBar(variantId)}
    <div class="app-shell app-shell--control">
      <div class="app-main">${body}</div>
    </div>`;
  }

  const ringView = uiState.ringView || "allocation";
  const forYouIndex = uiState.forYouIndex ?? 0;
  if (variant.concept === "a") variant._forYouIndex = forYouIndex;

  const prodTab =
    screen === "wallet"
      ? "wallet"
      : screen === "category" && params[0]
        ? params[0]
        : "overview";
  const state = { ringView, prodTab };

  /*
   * The product tab bar is page chrome in the Figma frames: it stays mounted
   * across Home / category / Wallet so switching tabs never unmounts it.
   * Sub-pages (Products, Alerts, offer details) use a Back link instead.
   */
  const TAB_SCREENS = new Set(["overview", "category", "wallet"]);
  const chrome = [];
  if (TAB_SCREENS.has(screen)) {
    const tabs = renderDsTabs(variant.concept, screen, params);
    if (tabs) chrome.push(tabs);
  }
  if (variant.productionTabs && (screen === "overview" || screen === "wallet"))
    chrome.push(renderProductionTabs(prodTab));

  let primary = "";
  let dsScreen = false;

  if (screen === "overview") {
    dsScreen = true;
    if (variant.concept === "control") primary = renderControlOverview();
    else if (variant.concept === "a") primary = renderAOverviewScreen(uiState);
    else if (variant.concept === "b") primary = renderHypothesisBHome(uiState);
  } else if (screen === "attention") {
    if (variant.concept === "a") {
      primary = renderAAlerts();
      dsScreen = true;
    } else if (variant.concept === "b" || variant.concept === "control") {
      primary = renderBAlerts();
      dsScreen = true;
    } else {
      primary = renderBreadcrumb(variantId, screen, params) + renderAttention(variant);
    }
  } else if (screen === "category" && params[0] === "savings") {
    if (variant.concept === "a") {
      primary = renderHypothesisA(uiState);
      dsScreen = true;
    } else {
      primary = renderHypothesisB(uiState);
      dsScreen = true;
    }
  } else if (screen === "category" && variant.concept === "b" && SAVINGS_DRILL_SUBLEVELS.has(params[0])) {
    primary = renderHypothesisBSavingsSublevel(params[0], uiState);
    dsScreen = true;
  } else if (screen === "category" && CATEGORY_TABS.has(params[0])) {
    primary = renderDsCategoryScreen(variant.concept, params[0], uiState);
    dsScreen = true;
  } else if (screen === "category") {
    primary =
      variant.concept === "a"
        ? renderACategoryScreen(params[0], uiState)
        : renderBreadcrumb(variantId, screen, params) + renderSubcategoryList(params[0]);
  } else if (screen === "subcategory") {
    primary = renderBreadcrumb(variantId, screen, params) + renderProductList(params[0], params[1]);
  } else if (screen === "product") {
    primary = renderBreadcrumb(variantId, screen, params) + renderProductDetail(params[0], params[1], params[2]);
  } else if (screen === "products") {
    dsScreen = true;
    primary =
      variant.concept === "a"
        ? renderAProducts(uiState)
        : renderBProducts(uiState, variant.concept === "control" ? "control" : "b");
  } else if (screen === "offer") {
    primary = renderBreadcrumb(variantId, screen, params) + renderOfferDetail(params[0]);
  } else if (screen === "wallet") {
    dsScreen = true;
    // Control has no Wallet tab, so it reaches this screen as a sub-page.
    primary =
      variant.concept === "a" ? renderAWallet() : renderBWallet(variant.concept === "control", uiState);
  } else if (screen === "lifetime-earnings") {
    dsScreen = true;
    primary = renderDsLifetimeEarnings(variant.concept);
  }

  const useRail =
    variant.rail &&
    (screen === "overview" ||
      (variant.concept === "a" && screen === "products") ||
      (variant.concept === "b" && screen === "wallet" && false));
  const railHtml = useRail && (screen === "overview" || screen === "products") ? renderRail(variant) : "";

  const gridClass =
    useRail && (screen === "overview" || screen === "products")
      ? "dashboard__grid"
      : "dashboard__grid dashboard__grid--full";

  const ds = variant.concept === "control" || variant.concept === "a" || variant.concept === "b";
  const pageGradient =
    variant.gradient && (variant.concept === "a" || variant.concept === "b") ? " app-shell--hyp-gradient" : "";
  const gradClass = ds ? ` app-shell--ds app-shell--${variant.concept}${pageGradient}` : "";
  const fullBleed = ds && dsScreen;

  return `
    ${renderProtoBar(variantId)}
    <div class="app-shell${gradClass}">
      <div class="app-main">
        ${renderHeader(variant, screen)}
        ${chrome.length ? `<div class="dashboard-chrome">${chrome.join("")}</div>` : ""}
        <main class="${fullBleed ? "ds-main" : "dashboard"}" data-cursor-src="src/pages/Dashboard.tsx:1">
          ${
            fullBleed
              ? primary
              : `<div class="${gridClass}">
            <div class="dashboard__primary">${primary}</div>
            ${railHtml ? `<aside class="dashboard__rail">${railHtml}</aside>` : ""}
          </div>`
          }
        </main>
        ${fullBleed ? renderControlFooter(variantId) : ""}
      </div>
    </div>`;
}

let detachStickySummary = null;

function bindProductSectionPromoTabs(root, { onProductPromoTab } = {}) {
  root.querySelectorAll("[data-ds-product-section]").forEach((section) => {
    if (section.dataset.promoTabsBound === "1") return;
    section.dataset.promoTabsBound = "1";

    const sectionId = section.getAttribute("data-product-section-id");

    const activate = (tab) => {
      const idx = tab.getAttribute("data-promo-tab");
      if (idx == null) return;
      if (onProductPromoTab && sectionId) {
        onProductPromoTab(sectionId, Number(idx));
        return;
      }
      const tabs = section.querySelectorAll("[data-promo-tab]");
      const panels = section.querySelectorAll("[data-promo-panel]");
      tabs.forEach((t) => {
        const active = t.getAttribute("data-promo-tab") === idx;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
        t.tabIndex = active ? 0 : -1;
      });
      panels.forEach((panel) => {
        const show = panel.getAttribute("data-promo-panel") === idx;
        panel.hidden = !show;
      });
    };

    section.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-promo-tab]");
      if (!tab || !section.contains(tab)) return;
      e.preventDefault();
      e.stopPropagation();
      activate(tab);
    });

    section.addEventListener("keydown", (e) => {
      const tab = e.target.closest("[data-promo-tab]");
      if (!tab || !section.contains(tab)) return;
      const tabs = [...section.querySelectorAll("[data-promo-tab]")];
      const i = tabs.indexOf(tab);
      if (i < 0) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = tabs[(i + 1) % tabs.length];
        activate(next);
        next.focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = tabs[(i - 1 + tabs.length) % tabs.length];
        activate(prev);
        prev.focus();
      }
    });
  });
}

function bindProductCarousels(root) {
  root.querySelectorAll("[data-carousel-head]").forEach((head) => {
    const carousel = head.nextElementSibling;
    const track = carousel?.matches("[data-product-carousel]") ? carousel.querySelector(".ds-product-carousel__track") : null;
    if (!track) return;

    const prev = head.querySelector("[data-carousel-prev]");
    const next = head.querySelector("[data-carousel-next]");
    const step = () => Math.max(track.clientWidth * 0.85, 160);

    const syncButtons = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
    };

    prev?.addEventListener("click", () => {
      track.scrollBy({ left: -step(), behavior: "smooth" });
    });
    next?.addEventListener("click", () => {
      track.scrollBy({ left: step(), behavior: "smooth" });
    });
    track.addEventListener("scroll", syncButtons, { passive: true });
    syncButtons();
    requestAnimationFrame(syncButtons);
    track.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", syncButtons, { once: true });
    });
  });
}

/* Condense the sticky summary card once it reaches its sticky offset. */
function bindStickySummary(root) {
  detachStickySummary?.();
  detachStickySummary = null;

  const card = root.querySelector("[data-sticky-summary]");
  if (!card) return;

  const stickyTop = parseFloat(getComputedStyle(card).top) || 0;
  let frame = 0;

  const sync = () => {
    frame = 0;
    card.classList.toggle("is-condensed", card.getBoundingClientRect().top <= stickyTop + 1);
  };

  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(sync);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  sync();

  detachStickySummary = () => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}

let detachControlMenu = null;
let detachDsNavMenu = null;

function bindDsNavMenu(root) {
  detachDsNavMenu?.();
  detachDsNavMenu = null;

  const toggle = root.querySelector("[data-ds-nav-toggle]");
  const nav = root.querySelector("#ds-primary-nav");
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  const onToggle = (e) => {
    e.stopPropagation();
    setOpen(!nav.classList.contains("is-open"));
  };

  const onOutside = (e) => {
    if (nav.classList.contains("is-open") && !nav.contains(e.target) && e.target !== toggle) {
      setOpen(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  };

  const onNav = () => setOpen(false);

  toggle.addEventListener("click", onToggle);
  document.addEventListener("click", onOutside);
  document.addEventListener("keydown", onKey);
  nav.querySelectorAll("[data-ds-nav-link]").forEach((link) => {
    link.addEventListener("click", onNav);
  });

  detachDsNavMenu = () => {
    toggle.removeEventListener("click", onToggle);
    document.removeEventListener("click", onOutside);
    document.removeEventListener("keydown", onKey);
    nav.querySelectorAll("[data-ds-nav-link]").forEach((link) => {
      link.removeEventListener("click", onNav);
    });
  };
}

let detachDsSavingsMenu = null;

/** Hypothesis B — Savings tab opens sub-level routes on hover (Control menu parity). */
function bindDsSavingsMenu(root) {
  detachDsSavingsMenu?.();
  detachDsSavingsMenu = null;

  const cleanups = [];
  root.querySelectorAll("[data-ds-savings-menu]").forEach((trigger) => {
    const wrap = trigger.closest(".ds-tab-wrap");
    const menu = wrap?.querySelector(".ds-tab-menu");
    if (!wrap || !menu) return;

    let closeTimer = null;
    const setOpen = (open) => {
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
    };

    const open = () => {
      clearTimeout(closeTimer);
      setOpen(true);
    };

    const scheduleClose = () => {
      closeTimer = setTimeout(() => setOpen(false), 120);
    };

    wrap.addEventListener("mouseenter", open);
    wrap.addEventListener("mouseleave", scheduleClose);
    menu.addEventListener("mouseenter", open);
    menu.addEventListener("mouseleave", scheduleClose);

    const onKey = (e) => {
      if (e.key === "Escape" && !menu.hidden) {
        setOpen(false);
        trigger.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    cleanups.push(() => {
      wrap.removeEventListener("mouseenter", open);
      wrap.removeEventListener("mouseleave", scheduleClose);
      menu.removeEventListener("mouseenter", open);
      menu.removeEventListener("mouseleave", scheduleClose);
      document.removeEventListener("keydown", onKey);
    });
  });

  detachDsSavingsMenu = () => cleanups.forEach((fn) => fn());
}

/* The Savings tab menu is local chrome: it opens on hover (not click) and never
 * goes through uiState, so opening it does not re-render or scroll the page. */
function bindControlMenu(root) {
  detachControlMenu?.();
  detachControlMenu = null;

  const trigger = root.querySelector("[data-control-menu]");
  const wrap = trigger?.closest(".ctl-tab-wrap");
  const menu = wrap?.querySelector(".ctl-menu");
  if (!trigger || !wrap || !menu) return;

  let closeTimer = null;
  const setOpen = (open) => {
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  };

  const open = () => {
    clearTimeout(closeTimer);
    setOpen(true);
  };

  const scheduleClose = () => {
    closeTimer = setTimeout(() => setOpen(false), 120);
  };

  wrap.addEventListener("mouseenter", open);
  wrap.addEventListener("mouseleave", scheduleClose);
  menu.addEventListener("mouseenter", open);
  menu.addEventListener("mouseleave", scheduleClose);

  const onKey = (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      setOpen(false);
      trigger.focus();
    }
  };
  document.addEventListener("keydown", onKey);

  detachControlMenu = () => {
    clearTimeout(closeTimer);
    wrap.removeEventListener("mouseenter", open);
    wrap.removeEventListener("mouseleave", scheduleClose);
    menu.removeEventListener("mouseenter", open);
    menu.removeEventListener("mouseleave", scheduleClose);
    document.removeEventListener("keydown", onKey);
  };
}

/**
 * Donut read-out (11031:109895): pointing at a slice — on the ring or in the
 * legend — dims the others and swaps the centre for that slice's share. Clicks
 * are handled by the shared [data-nav] binding, so only savings slices navigate.
 */
function bindControlDonut(root) {
  root.querySelectorAll("[data-control-donut], [data-ds-donut]").forEach((chart) => {
    const label = chart.querySelector("[data-donut-label]");
    const amount = chart.querySelector("[data-donut-amount]");
    if (!label || !amount) return;
    const rest = { label: label.textContent, amount: amount.textContent };
    const parts = (i) => chart.querySelectorAll(`[data-slice="${i}"]`);

    const read = (i) => {
      const entry = chart.querySelector(
        `.ctl-legend__item[data-slice="${i}"], .ds-legend__item[data-slice="${i}"]`
      );
      if (!entry) return;
      chart.classList.add("is-reading");
      chart.querySelectorAll(".is-active").forEach((el) => el.classList.remove("is-active"));
      parts(i).forEach((el) => el.classList.add("is-active"));
      label.textContent = entry.dataset.label;
      amount.textContent = entry.dataset.amount;
    };

    const clear = () => {
      chart.classList.remove("is-reading");
      chart.querySelectorAll(".is-active").forEach((el) => el.classList.remove("is-active"));
      label.textContent = rest.label;
      amount.textContent = rest.amount;
    };

    chart.querySelectorAll("[data-slice]").forEach((el) => {
      el.addEventListener("mouseenter", () => read(el.dataset.slice));
      el.addEventListener("mouseleave", clear);
      el.addEventListener("focus", () => read(el.dataset.slice));
      el.addEventListener("blur", clear);
      // SVG shapes do not fire click from the keyboard.
      el.addEventListener("keydown", (e) => {
        if (el.dataset.nav && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }
      });
    });

    chart.addEventListener("mouseleave", clear);
  });
}

export function bindInteractions(
  root,
  {
    onNavigate,
    onRingView,
    onAopTab,
    onPortfolioView,
    onSavingsFilter,
    onSavingsSort,
    onProductTab,
    onProductPromoTab,
    onForYou,
    onControlView,
  }
) {
  bindStickySummary(root);
  bindProtoMenu(root);
  bindControlMenu(root);
  bindDsSavingsMenu(root);
  bindDsNavMenu(root);
  bindControlDonut(root);
  bindProductCarousels(root);
  bindProductSectionPromoTabs(root, { onProductPromoTab });
  bindEarningsCharts(root);

  root.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      onNavigate(el.dataset.nav);
    });
  });

  root.querySelectorAll("[data-pr-jump]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById(el.dataset.prJump)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  root.querySelectorAll("[data-variant]").forEach((btn) => {
    btn.addEventListener("click", () => onNavigate(`__variant__/${btn.dataset.variant}`));
  });

  root.querySelector("[data-market-select]")?.addEventListener("change", (e) => onNavigate(`__market__/${e.target.value}`));
  root.querySelector("[data-language-select]")?.addEventListener("change", (e) => onNavigate(`__lang__/${e.target.value}`));
  root.querySelectorAll("[data-persona]").forEach((btn) => {
    btn.addEventListener("click", () => onNavigate(`__persona__/${btn.dataset.persona}`));
  });

  root.querySelectorAll("[data-ring-view]").forEach((btn) => {
    btn.addEventListener("click", () => onRingView(btn.dataset.ringView));
  });

  root.querySelectorAll("[data-control-view]").forEach((btn) => {
    btn.addEventListener("click", () => onControlView?.(btn.dataset.controlView));
  });

  root.querySelectorAll("[data-portfolio-view]").forEach((btn) => {
    btn.addEventListener("click", () => onPortfolioView?.(btn.dataset.portfolioView));
  });

  root.querySelectorAll("[data-savings-sort]").forEach((select) => {
    select.addEventListener("change", () => onSavingsSort?.(select.value));
  });

  root.querySelectorAll("[data-savings-filter-value]").forEach((btn) => {
    btn.addEventListener("click", () => onSavingsFilter?.(btn.dataset.savingsFilterValue));
  });

  root.querySelectorAll("[data-product-tab]").forEach((btn) => {
    btn.addEventListener("click", () => onProductTab?.(btn.dataset.productTab));
  });

  root.querySelectorAll("[data-for-you]").forEach((btn) => {
    btn.addEventListener("click", () => onForYou?.(Number(btn.dataset.forYou)));
  });

  root.querySelectorAll("[data-for-you-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const host = btn.closest("[data-for-you-carousel]");
      if (!host) return;
      const count = Number(host.dataset.forYouCount) || 1;
      const current = Number(host.dataset.forYouActive) || 0;
      const step = Number(btn.dataset.forYouStep) || 0;
      const next = (current + step + count) % count;
      onForYou?.(next);
    });
  });

  root.querySelectorAll("[data-go-back]").forEach((btn) => {
    btn.addEventListener("click", () => onNavigate("__back__"));
  });

  root.querySelectorAll("[data-scroll-attention]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("attention-panel")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  root.querySelectorAll("[data-scroll-portfolio]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("portfolio-panel")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  root.querySelectorAll("[data-dismiss]").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest("[data-attention-id]")?.remove();
    });
  });

  root.querySelectorAll("[data-show-all-attention]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const list = btn.previousElementSibling;
      ATTENTION_ITEMS.forEach((item, i) => {
        if (list?.children[i]) return;
        const el = document.createElement("article");
        el.className = "attention-item attention-item--compact";
        el.dataset.attentionId = item.id;
        el.innerHTML = `<div class="attention-item__body"><h4>${esc(item.title)}</h4><p>${esc(item.body)}</p></div><div class="attention-item__actions"><button type="button" class="btn btn--secondary">${esc(item.cta)}</button></div>`;
        translateDom(el, LANGUAGE, MARKET);
        list?.appendChild(el);
      });
      btn.remove();
    });
  });
}
