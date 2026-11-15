/**
 * Lightweight screen router — the hash encodes variant + screen stack, and `?p=` carries
 * the One Data persona so a link shares both the layout and the portfolio behind it.
 * e.g. #a/overview?p=hnw, #control/category/savings, #b/products
 *
 * Optional query (bookmarkable UI state):
 *   sf   — savings portfolio filter (all | fixed | overnight | notice)
 *   ptab — products tab (savings | investments | retirement)
 *   ring — ring view (allocation | performance)
 *   cv   — Control savings donut grouping (category | bank | country)
 *   m    — market (de | nl | at | es | gb | ie | fr | fi | pl | it); omitted for Germany
 *   lang — UI language (en | de | nl | es | fr | it | pl | fi); omitted for English
 */

import { DEFAULT_LANGUAGE, DEFAULT_MARKET, isLanguage, isMarket } from "./markets.js";

function splitHash() {
  const raw = (location.hash || "#control").replace(/^#/, "");
  const [path, query = ""] = raw.split("?");
  return { path, query };
}

const SAVINGS_FILTERS = new Set(["all", "fixed", "overnight", "notice"]);
const PRODUCT_TABS = new Set(["savings", "investments", "retirement"]);
const RING_VIEWS = new Set(["allocation", "performance"]);
const CONTROL_VIEWS = new Set(["category", "bank", "country"]);

export function readRouteQuery(queryString = splitHash().query) {
  const q = new URLSearchParams(queryString);
  const sf = q.get("sf");
  const ptab = q.get("ptab");
  const ring = q.get("ring");
  const cv = q.get("cv");
  const m = q.get("m");
  const lang = q.get("lang");
  return {
    persona: q.get("p"),
    market: m && isMarket(m) ? m : null,
    language: lang && isLanguage(lang) ? lang : null,
    savingsFilter: sf && SAVINGS_FILTERS.has(sf) ? sf : null,
    productTab: ptab && PRODUCT_TABS.has(ptab) ? ptab : null,
    ringView: ring && RING_VIEWS.has(ring) ? ring : null,
    controlView: cv && CONTROL_VIEWS.has(cv) ? cv : null,
  };
}

function writeRouteQuery(fields) {
  const q = new URLSearchParams();
  if (fields.persona) q.set("p", fields.persona);
  if (fields.market && fields.market !== DEFAULT_MARKET) q.set("m", fields.market);
  if (fields.language && fields.language !== DEFAULT_LANGUAGE) q.set("lang", fields.language);
  if (fields.savingsFilter && fields.savingsFilter !== "all") q.set("sf", fields.savingsFilter);
  if (fields.productTab && fields.productTab !== "savings") q.set("ptab", fields.productTab);
  if (fields.ringView && fields.ringView !== "allocation") q.set("ring", fields.ringView);
  if (fields.controlView && fields.controlView !== "category") q.set("cv", fields.controlView);
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

function hashFor(path, queryFields) {
  const current = readRouteQuery();
  const merged = { ...current, ...queryFields };
  if (queryFields.persona === null) merged.persona = null;
  return `#${path}${writeRouteQuery(merged)}`;
}

export function parseRoute() {
  const { path, query } = splitHash();
  const parts = path.split("/").filter(Boolean);
  const ui = readRouteQuery(query);
  return {
    variantId: parts[0] || "control",
    screen: parts[1] || "overview",
    params: parts.slice(2),
    persona: ui.persona,
    ...ui,
  };
}

export function navigate(variantId, screen, ...params) {
  const path = [variantId, screen, ...params].filter(Boolean).join("/");
  location.hash = hashFor(path, readRouteQuery()).slice(1);
}

/** Swap the persona without leaving the current screen. */
export function navigatePersona(persona) {
  const { path } = splitHash();
  location.hash = hashFor(path || "control", { ...readRouteQuery(), persona }).slice(1);
}

/** Swap market or language without leaving the current screen. */
export function navigateLocale(patch) {
  const { path } = splitHash();
  location.hash = hashFor(path || "control", { ...readRouteQuery(), ...patch }).slice(1);
}

/** Update bookmarkable UI flags without changing variant/screen path. */
export function updateRouteUi(patch) {
  const { path } = splitHash();
  const next = { ...readRouteQuery(), ...patch };
  location.hash = hashFor(path || "control/overview", next).slice(1);
}

export function goBack(variantId, screen, params) {
  if (screen === "product" && params.length >= 3) {
    navigate(variantId, "subcategory", params[0], params[1]);
  } else if (screen === "subcategory" && params.length >= 2) {
    navigate(variantId, "category", params[0]);
  } else if (screen === "category" && params.length >= 1) {
    navigate(variantId, "overview");
  } else if (screen === "lifetime-earnings") {
    navigate(variantId, "overview");
  } else {
    navigate(variantId, "overview");
  }
}

/** Hypothesis A only drills into the savings category (mobile parity scope). */
export const HYPOTHESIS_A_DRILL_CATEGORY = "savings";

/** Hypothesis B — investment and pension tabs are visible but not in prototype scope. */
export const HYPOTHESIS_B_BLOCKED_CATEGORIES = new Set(["investments", "retirement"]);

export function isHypothesisBCategoryScreen(screen, params = []) {
  const cat = params[0];
  if (!cat || !HYPOTHESIS_B_BLOCKED_CATEGORIES.has(cat)) return false;
  if (screen === "category") return true;
  if (screen === "subcategory" || screen === "product") return true;
  return false;
}

export function isHypothesisAPortfolioDrill(screen, params = []) {
  const cat = params[0];
  if (!cat) return false;
  if (screen === "category") return cat !== HYPOTHESIS_A_DRILL_CATEGORY;
  if (screen === "subcategory" || screen === "product") return cat !== HYPOTHESIS_A_DRILL_CATEGORY;
  return false;
}

export function routeLocationKey({ variantId, screen, params = [] }) {
  return [variantId, screen, ...params].join("/");
}
