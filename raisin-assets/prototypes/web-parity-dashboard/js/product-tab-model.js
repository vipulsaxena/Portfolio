/**
 * Dynamic product-area tabs (Control + Hypothesis B) driven by One Data.
 * Figma: 12:17212 — single category + single product type → no tabs;
 *        12:14287 — savings-only, multiple types → Home + Fix term / Overnight / …
 */

import { CATEGORIES } from "./data.js";

export const SAVINGS_DRILL_SUBLEVELS = new Set(["fixed-term", "overnight", "notice"]);

export const SAVINGS_SUB_TAB_LABEL = {
  "fixed-term": "Fix term",
  overnight: "Overnight",
  notice: "Notice",
};

export const activeCategories = () => CATEGORIES.filter((c) => !c.isEmpty);
export const activeSubcategories = (category) => category.subcategories.filter((s) => !s.isEmpty);

/** Header product tabs hidden when the user holds one product type in one category. */
export function hideProductAreaTabs() {
  const active = activeCategories();
  return active.length === 1 && activeSubcategories(active[0]).length === 1;
}

/**
 * Control chrome tabs (no Wallet). Returns `null` when the bar should not render.
 */
export function controlProductTabItems() {
  if (hideProductAreaTabs()) return null;

  const home = { id: "home", label: "Home", nav: "overview" };
  const active = activeCategories();

  if (active.length === 1 && active[0].id === "savings") {
    const subs = activeSubcategories(active[0]);
    if (subs.length > 1) {
      return [
        home,
        ...subs.map((s) => ({
          id: s.id,
          label: SAVINGS_SUB_TAB_LABEL[s.id] ?? s.label,
          nav: `category/${s.id}`,
        })),
      ];
    }
  }

  const items = [home];
  for (const c of active) {
    if (c.id === "savings") {
      const subs = activeSubcategories(c);
      items.push(
        subs.length > 1
          ? { id: "savings", label: "Savings", menu: true }
          : { id: "savings", label: "Savings", nav: "category/savings" }
      );
    } else {
      items.push({ id: c.id, label: c.label });
    }
  }
  return items;
}

/** Savings sub-level menu entries — aggregate Savings + active product types only. */
export function savingsMenuLevelIds() {
  const sav = CATEGORIES.find((c) => c.id === "savings");
  if (!sav) return new Set(["savings"]);
  return new Set(["savings", ...activeSubcategories(sav).map((s) => s.id)]);
}

export function isControlTabActive(item, activeTabId, savingsSub = "savings") {
  if (item.id === activeTabId) return true;
  if (item.menu && item.id === "savings") {
    return SAVINGS_DRILL_SUBLEVELS.has(activeTabId) || (activeTabId === "savings" && savingsSub !== "savings");
  }
  return false;
}

/** Hypothesis B — includes Wallet. Control may hide tabs for a single product type; B always shows Home + active areas + Wallet. */
export function bProductTabDescriptors({ home, savingsTab, investTab, retireTab, walletTab }) {
  const byId = { savings: savingsTab, investments: investTab, retirement: retireTab };
  const activeCats = activeCategories().filter((c) => byId[c.id]);
  const middle = [];

  if (activeCats.length === 1) {
    const c = activeCats[0];
    const subs = activeSubcategories(c);
    if (c.id === "savings" && subs.length > 1) {
      for (const s of subs) {
        middle.push({
          label: SAVINGS_SUB_TAB_LABEL[s.id] ?? s.label,
          nav: `category/${s.id}`,
          screen: "category",
          param: s.id,
          navigable: true,
        });
      }
      return [home, ...middle, walletTab];
    }
    const tab = byId[c.id];
    return [home, { ...tab, chevron: false, menu: false, navigable: true }, walletTab];
  }

  for (const c of activeCats) {
    const tab = byId[c.id];
    const subs = c.id === "savings" ? activeSubcategories(c) : [];
    middle.push(
      c.id === "savings" && subs.length > 1 ? { ...tab, chevron: true, menu: true } : { ...tab, chevron: false, menu: false }
    );
  }
  return [home, ...middle, walletTab];
}

export function dsTabIsActive(tab, screen, params = []) {
  if (tab.disabled) return false;
  if (tab.param && SAVINGS_DRILL_SUBLEVELS.has(tab.param)) {
    return screen === "category" && tab.param === params[0];
  }
  if (tab.param === "savings") {
    return screen === "category" && (params[0] === "savings" || SAVINGS_DRILL_SUBLEVELS.has(params[0]));
  }
  return tab.screen === screen && (!tab.param || tab.param === params[0]);
}
