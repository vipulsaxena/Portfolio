/*
 * Ellipsis for flex-based controls (chips, buttons, tabs, status labels).
 *
 * `text-overflow` does not apply to flex containers, so when a control's label overflows
 * its box (typically after translation) the label text node is wrapped in `.trunc-text`
 * and the full string is kept in `title`. Controls that fit are never touched, which keeps
 * the default English view identical.
 */

const CANDIDATES = [
  ".ctl-chip",
  ".ctl-btn",
  ".ctl-textbtn",
  ".ctl-tab",
  ".ctl-underline-tab",
  ".ctl-nav__link",
  ".ctl-return",
  ".ds-chip",
  ".ds-label-chip",
  ".ds-btn",
  ".ds-textbtn",
  ".ds-tab",
  ".ds-filter",
  ".ds-status",
  ".ds-tab-menu__item",
].join(",");

const SKIP = "[data-i18n-skip]";
const EPSILON = 1;

const overflows = (el) => {
  if (el.scrollWidth > el.clientWidth + EPSILON) return true;
  const parent = el.parentElement;
  if (!parent) return false;
  return el.getBoundingClientRect().right > parent.getBoundingClientRect().right + EPSILON;
};

function truncateLabel(el) {
  if (el.querySelector(":scope > .trunc-text")) return;
  const texts = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && /\S/.test(n.nodeValue));
  if (!texts.length) return;
  const node = texts.reduce((a, b) => (b.nodeValue.length > a.nodeValue.length ? b : a));
  const label = node.nodeValue.replace(/\s+/g, " ").trim();
  const span = document.createElement("span");
  span.className = "trunc-text";
  span.textContent = label;
  node.replaceWith(span);
  el.classList.add("trunc-host");
  if (!el.title) el.title = label;
}

/** Tag labels that overflow their bounds; safe to call repeatedly. */
export function truncateOverflowing(root = document) {
  root.querySelectorAll(CANDIDATES).forEach((el) => {
    if (el.closest(SKIP) || !overflows(el)) return;
    truncateLabel(el);
  });

  /* Block-level labels are clamped by CSS; expose their full text on hover / to AT. */
  root
    .querySelectorAll(
      ".ctl-row__name, .ctl-row__meta, .ds-portfolio-row__copy strong, .ds-portfolio-row__copy p, .ds-portfolio-product__copy strong, .ds-portfolio-product__copy small, .ds-legend__label, .ds-offer strong, .ds-offer p"
    )
    .forEach((el) => {
      if (el.closest(SKIP) || el.title) return;
      if (el.scrollWidth > el.clientWidth + EPSILON) el.title = el.textContent.trim();
    });
}

let resizeTimer = 0;
export function watchTruncation(getRoot) {
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => truncateOverflowing(getRoot()), 150);
  });
}
