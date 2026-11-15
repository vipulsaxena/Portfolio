import { renderDashboard, bindInteractions } from "./render.js";
import {
  parseRoute,
  navigate,
  navigatePersona,
  navigateLocale,
  goBack,
  isHypothesisAPortfolioDrill,
  isHypothesisBCategoryScreen,
  routeLocationKey,
  updateRouteUi,
} from "./navigation.js";
import { VARIANTS, VARIANT_ALIASES } from "./variants.js";
import { DEFAULT_PERSONA, LANGUAGE, MARKET, PERSONA, isPersona, setLanguage, setMarket, setPersona } from "./data.js";
import { loadCatalog } from "./catalog.js";
import { DEFAULT_LANGUAGE, DEFAULT_MARKET, isLanguage, isMarket, marketType } from "./markets.js";
import { translateDom } from "./i18n.js";
import { truncateOverflowing, watchTruncation } from "./truncate.js";

const root = document.getElementById("app");
watchTruncation(() => root);
const PERSONA_KEY = "web-parity:persona";
const MARKET_KEY = "web-parity:market";
const LANGUAGE_KEY = "web-parity:language";

const readStored = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStored = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode — the hash still carries the choice
  }
};

const uiState = {
  ringView: "allocation",
  aopTab: "overview",
  portfolioView: "list",
  savingsFilter: "all",
  savingsSort: "opening",
  productTab: "savings",
  productPromoTabs: {},
  forYouIndex: 0,
  controlView: "category",
};

let lastRouteKey = "";

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  root.scrollTop = 0;
  const main = root.querySelector(".app-main");
  if (main) main.scrollTop = 0;
  const dsMain = root.querySelector(".ds-main");
  if (dsMain) dsMain.scrollTop = 0;
  const ctlPage = root.querySelector(".ctl-page");
  if (ctlPage) ctlPage.scrollTop = 0;
}

function queueScrollToTop() {
  requestAnimationFrame(() => {
    scrollToTop();
    requestAnimationFrame(scrollToTop);
  });
}

function resolveVariant(id) {
  if (id === "review") return "review";
  if (VARIANT_ALIASES[id]) return VARIANT_ALIASES[id];
  if (VARIANTS[id]) return id;
  return "control";
}

/**
 * Persona precedence: the link wins, then the last choice in this browser, then UHNW.
 * `setPersona` rebuilds the shared data bindings, so all three variants follow along.
 */
function syncPersona(routePersona) {
  const stored = (() => {
    try {
      return localStorage.getItem(PERSONA_KEY);
    } catch {
      return null;
    }
  })();

  const next = [routePersona, stored, DEFAULT_PERSONA].find((id) => isPersona(id)) ?? DEFAULT_PERSONA;
  if (next !== PERSONA) setPersona(next);
  return next;
}

/** Market and language follow the persona's precedence: link, then this browser, then DE / EN. */
function syncLocale(routeMarket, routeLanguage) {
  const market = [routeMarket, readStored(MARKET_KEY), DEFAULT_MARKET].find((id) => isMarket(id));
  const language = [routeLanguage, readStored(LANGUAGE_KEY), DEFAULT_LANGUAGE].find((id) => isLanguage(id));
  if (market !== MARKET) setMarket(market);
  if (language !== LANGUAGE) setLanguage(language);
}

/** Document-level hooks: language for assistive tech, market type for product colours. */
function applyDocumentLocale() {
  document.documentElement.lang = LANGUAGE;
  const type = marketType(MARKET);
  if (type === "all") delete document.documentElement.dataset.marketType;
  else document.documentElement.dataset.marketType = type;
}

function paint(html) {
  root.innerHTML = html;
  translateDom(root, LANGUAGE, MARKET);
  /* After layout: translated labels can outgrow their controls. */
  requestAnimationFrame(() => truncateOverflowing(root));
}

let catalogMarket = null;

/** Offers are per market; reload in the background whenever the market changes. */
function ensureCatalog() {
  if (catalogMarket === MARKET) return;
  const requested = (catalogMarket = MARKET);
  loadCatalog(requested).then(() => {
    if (requested !== MARKET) return;
    setPersona(PERSONA);
    render();
  });
}

function render() {
  const { variantId, screen, params, persona, market, language, savingsFilter, productTab, ringView, controlView } = parseRoute();
  syncLocale(market, language);
  ensureCatalog();
  syncPersona(persona);
  applyDocumentLocale();
  const resolved = resolveVariant(variantId);

  if (resolved === "a" && isHypothesisAPortfolioDrill(screen, params)) {
    navigate("a", "overview");
    return;
  }

  if (resolved === "b" && isHypothesisBCategoryScreen(screen, params)) {
    navigate("b", "overview");
    return;
  }

  const routeKey = routeLocationKey({ variantId: resolved, screen, params });
  const enteredLevel = routeKey !== lastRouteKey;
  lastRouteKey = routeKey;

  if (resolved === "review") {
    document.title = "Web Dashboard Parity — Persona review";
    paint(renderDashboard("review", { screen, params }, uiState));
    bindInteractions(root, { onNavigate: handleNav });
    if (enteredLevel) queueScrollToTop();
    return;
  }
  const route = { screen, params };

  if (savingsFilter) uiState.savingsFilter = savingsFilter;
  if (productTab) uiState.productTab = productTab;
  if (ringView) uiState.ringView = ringView;
  if (controlView) uiState.controlView = controlView;

  if (screen === "category" && params[0]) uiState.aopTab = params[0];
  if (screen === "products" && params[0] && ["savings", "investments", "retirement"].includes(params[0])) {
    uiState.productTab = params[0];
  }
  if (screen === "overview") uiState.aopTab = "overview";

  const v = VARIANTS[resolved] || VARIANTS.control;
  document.title = `Web Dashboard Parity — ${v.label}`;
  paint(renderDashboard(resolved, route, uiState));

  bindInteractions(root, {
    onNavigate: handleNav,
    onRingView: (view) => {
      uiState.ringView = view;
      updateRouteUi({ ringView: view });
    },
    onAopTab: (tab) => {
      uiState.aopTab = tab;
      render();
    },
    onPortfolioView: (view) => {
      uiState.portfolioView = view;
      render();
    },
    onSavingsFilter: (value) => {
      uiState.savingsFilter = value;
      updateRouteUi({ savingsFilter: value });
    },
    onSavingsSort: (value) => {
      uiState.savingsSort = value;
      render();
    },
    onProductTab: (tab) => {
      uiState.productTab = tab;
      updateRouteUi({ productTab: tab });
    },
    onProductPromoTab: (sectionId, index) => {
      uiState.productPromoTabs = { ...uiState.productPromoTabs, [sectionId]: index };
      render();
    },
    onForYou: (index) => {
      uiState.forYouIndex = index;
      render();
    },
    onControlView: (view) => {
      uiState.controlView = view;
      updateRouteUi({ controlView: view });
    },
  });

  if (enteredLevel) {
    queueScrollToTop();
  }
}

function handleNav(target) {
  if (target === "__review__") {
    location.hash = "review";
    return;
  }
  if (target.startsWith("__variant__/")) {
    const vid = target.split("/")[1];
    navigate(vid, "overview");
    return;
  }
  if (target.startsWith("__persona__/")) {
    const id = target.split("/")[1];
    writeStored(PERSONA_KEY, id);
    navigatePersona(id);
    return;
  }
  if (target.startsWith("__market__/")) {
    const id = target.split("/")[1];
    if (!isMarket(id)) return;
    writeStored(MARKET_KEY, id);
    navigateLocale({ market: id });
    return;
  }
  if (target.startsWith("__lang__/")) {
    const id = target.split("/")[1];
    if (!isLanguage(id)) return;
    writeStored(LANGUAGE_KEY, id);
    navigateLocale({ language: id });
    return;
  }
  if (target === "__back__") {
    const { variantId, screen, params } = parseRoute();
    goBack(resolveVariant(variantId), screen, params);
    return;
  }

  const { variantId } = parseRoute();
  const vid = resolveVariant(variantId);
  const parts = target.split("/");
  const screen = parts[0];
  const params = parts.slice(1);
  if (vid === "a" && isHypothesisAPortfolioDrill(screen, params)) return;
  if (vid === "b" && isHypothesisBCategoryScreen(screen, params)) return;
  navigate(vid, screen, ...params);
}

window.addEventListener("hashchange", render);

const PORTFOLIO_PERSONA_MAP = {
  "retail-young": "retail",
  "affluent-core": "affluent",
  "hnw-core": "hnw",
  "uhnw-core": "uhnw",
};

function mapPortfolioPersona(personaId) {
  if (!personaId) return null;
  if (PORTFOLIO_PERSONA_MAP[personaId]) return PORTFOLIO_PERSONA_MAP[personaId];
  if (isPersona(personaId)) return personaId;
  return null;
}

function isPortfolioEmbed() {
  return document.documentElement.classList.contains("portfolio-embed-root");
}

if (isPortfolioEmbed()) {
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "persona-select") {
      const mapped = mapPortfolioPersona(data.personaId);
      if (mapped) navigatePersona(mapped);
    }
    if (data.type === "variant-select" && data.variant) {
      const vid = resolveVariant(data.variant);
      const { screen } = parseRoute();
      navigate(vid, screen && screen !== "review" ? screen : "overview");
    }
  });
}

// First paint runs on the bundled snapshot; the catalog resolves in the background and
// re-renders once real rates are in, so the prototype never shows an empty offers rail.
render();
