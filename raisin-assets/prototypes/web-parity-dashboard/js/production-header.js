/**
 * Production top nav (Figma 12:11178) — shared by Control shell and Hypothesis B.
 * Visual parity via ctl-* classes; routes stay variant-scoped (#control/* vs #b/* or data-nav).
 */

const CTL_ASSETS = "assets/figma/control";

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function logoLink(variantId) {
  const img = `<img class="ctl-logo" src="assets/raisin-logo.svg" width="139" height="32" alt="Raisin" />`;
  if (variantId === "b") {
    return `<a href="#" class="ctl-logo-link" data-nav="overview">${img}</a>`;
  }
  return img;
}

function mobileMenuButton() {
  return `<button type="button" class="ds-header__menu" data-ds-nav-toggle aria-expanded="false" aria-controls="ds-primary-nav" aria-label="Open menu"><span aria-hidden="true">☰</span></button>`;
}

function navItem(variantId, label, path, { static: isStatic = false } = {}) {
  const cls = `ctl-nav__link${isStatic ? " ctl-nav__link--static" : ""}`;
  if (isStatic) {
    return `<span class="${cls}">${esc(label)}</span>`;
  }
  if (variantId === "b") {
    const dataNav = path === "products" ? "products" : "overview";
    return `<a href="#" class="${cls}" data-nav="${dataNav}" data-ds-nav-link>${esc(label)}</a>`;
  }
  const hash = path === "products" ? `#control/products` : `#control/overview`;
  return `<a href="${hash}" class="${cls}">${esc(label)}</a>`;
}

/**
 * @param {"control" | "b"} variantId
 * @param {string} screen — active route screen (overview, products, …)
 */
export function renderProductionTopHeader(variantId, screen) {
  const tabs = [
    navItem(variantId, "Dashboard", "overview"),
    navItem(variantId, "Offers", "products"),
    navItem(variantId, "Financial Guide", "overview", { static: variantId === "b" }),
    navItem(variantId, "Help", "overview", { static: variantId === "b" }),
  ].join("");

  const headerClass =
    variantId === "b" ? "ctl-header ds-top-header ds-header--b" : "ctl-header ds-top-header";

  return `
    <header class="${headerClass}" data-cursor-src="src/control/Header.tsx:1">
      <div class="ctl-shell ctl-header__inner">
        ${logoLink(variantId)}
        ${variantId === "b" ? mobileMenuButton() : ""}
        <div class="ctl-nav">
          <nav id="ds-primary-nav" class="ctl-nav__tabs" aria-label="Primary">${tabs}</nav>
          <div class="ctl-nav__account">
            <button type="button" class="ctl-avatar" aria-label="Account">BL</button>
            <button type="button" class="ctl-iconbtn" aria-label="Account menu">
              <img src="${CTL_ASSETS}/icon-chevron-down.svg" width="24" height="24" alt="" />
            </button>
          </div>
        </div>
      </div>
    </header>`;
}
