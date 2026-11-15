/**
 * Lifetime earnings — dashboard widget + detail page (Figma 440:*).
 * Shared across Control, Hypothesis A and Hypothesis B; variant chrome stays outside.
 */

import { CATEGORIES, WEALTH } from "./data.js";
import {
  formatAxisEurTop,
  formatDateDe,
  formatEurBefore,
  formatMonthYearDe,
  formatProductEarn,
  formatSignedEur,
} from "./format.js";
import { categoryIconUrl, markIconHtml } from "./raisin-icons.js";

const A = "assets/figma/control";

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const eurBefore = formatEurBefore;
const signedBefore = (n) => formatSignedEur(n, "before");

/** Positive/negative performance delta — blue-600 (#1D5A9A) via `.ds-earn`. */
function performanceEarnHtml(value) {
  const text = formatProductEarn(value, "before") ?? formatSignedEur(value, "before");
  if (!text) return "";
  const down = text.startsWith("−") || text.startsWith("-");
  return `<span class="ds-earn${down ? " ds-earn--down" : ""}">${esc(text)}</span>`;
}

const CHART_START = new Date(2025, 5, 1);
const CHART_END = new Date(2026, 1, 1);

export function axisTopEarnings(value) {
  return formatAxisEurTop(value);
}

/** Lifetime total on the detail page — savings lifetime plus scaled category earnings. */
export function lifetimeEarningsModel() {
  const scale = WEALTH.savingsEarnings > 0 ? WEALTH.lifetimeEarnings / WEALTH.savingsEarnings : 1;
  const categories = CATEGORIES.filter((c) => !c.isEmpty).map((c) => {
    const lifetime = c.id === "savings" ? WEALTH.lifetimeEarnings : c.earnings * scale;
    const year = c.earnings;
    const active = c.subcategories.reduce((n, s) => n + s.products.filter((p) => !p.isPending).length, 0);
    return { ...c, lifetime, year, active };
  });
  const total = categories.reduce((sum, c) => sum + c.lifetime, 0);
  return { total, categories, yearTotal: WEALTH.totalEarnings };
}

function formatChartDate(ratio) {
  const t = CHART_START.getTime() + ratio * (CHART_END.getTime() - CHART_START.getTime());
  return formatDateDe(new Date(t));
}

function chartTickerMarkup() {
  return `
    <div class="lifetime-earnings-chart__ticker" aria-hidden="true">
      <span>${formatMonthYearDe(CHART_START)}</span>
      <span>${formatMonthYearDe(CHART_END)}</span>
    </div>`;
}

function valueAtRatio(ratio, peak) {
  const eased = ratio * ratio * (3 - 2 * ratio);
  return peak * eased;
}

function easeRatio(ratio) {
  return ratio * ratio * (3 - 2 * ratio);
}

/** Approximate Y on the exported total curve (209px-tall plot). */
function scrubDotTopPercent(ratio) {
  return 78 - easeRatio(ratio) * 52;
}

const DETAIL_SERIES = [
  { id: "total", label: "Total", bar: "grey900", dot: (r) => scrubDotTopPercent(r), minRatio: 0 },
  { id: "savings", label: "Savings", bar: "blue", dot: (r) => 54 - easeRatio(r) * 16, minRatio: 0 },
  { id: "investments", label: "Investments", bar: "yellow", dot: (r) => 72 - easeRatio(Math.max(0, (r - 0.55) / 0.45)) * 20, minRatio: 0.55 },
  { id: "retirement", label: "Pension", bar: "green", dot: (r) => 86 - easeRatio(Math.max(0, (r - 0.78) / 0.22)) * 6, minRatio: 0.78 },
];

function valuesAtRatio(ratio) {
  const model = lifetimeEarningsModel();
  const t = easeRatio(ratio);
  const savings = model.categories.find((c) => c.id === "savings");
  const investments = model.categories.find((c) => c.id === "investments");
  const retirement = model.categories.find((c) => c.id === "retirement");
  return {
    total: model.total * t,
    savings: (savings?.lifetime ?? 0) * t,
    investments: ratio < 0.55 ? 0 : (investments?.lifetime ?? 0) * easeRatio((ratio - 0.55) / 0.45),
    retirement: ratio < 0.78 ? 0 : (retirement?.lifetime ?? 0) * easeRatio((ratio - 0.78) / 0.22),
  };
}

const CATEGORY_META = {
  savings: { tone: "blue", nav: "category/savings" },
  investments: { tone: "yellow", nav: "category/investments" },
  retirement: { tone: "green", nav: "category/retirement" },
};

const CATEGORY_LABEL = { savings: "Savings", investments: "Investments", retirement: "Pension" };

function detailScrubMarkup() {
  const dots = DETAIL_SERIES
    .map(
      (s) =>
        `<span class="le-chart__dot le-chart__dot--${s.bar}" data-earnings-dot="${s.id}" hidden aria-hidden="true"></span>`
    )
    .join("");
  return `
    <div class="le-chart__scrub" data-earnings-scrub hidden>
      <span class="le-chart__scrub-line" aria-hidden="true"></span>
      ${dots}
    </div>`;
}

function detailPlotMarkup() {
  return `
    <div class="le-chart__plot" data-earnings-plot>
      <div class="le-chart__layers" aria-hidden="true">
        <img class="le-chart__layer le-chart__layer--total" src="${A}/earnings-line-total.svg" width="792" height="165" alt="" />
        <img class="le-chart__layer le-chart__layer--savings" src="${A}/earnings-line-savings.svg" width="792" height="81" alt="" />
        <img class="le-chart__layer le-chart__layer--investments" src="${A}/earnings-line-investments.svg" width="301" height="60" alt="" />
        <img class="le-chart__layer le-chart__layer--pension" src="${A}/earnings-line-pension.svg" width="161" height="26" alt="" />
      </div>
      <img class="le-chart__baseline" src="${A}/earnings-axis.svg" width="792" height="1" alt="" />
      ${detailScrubMarkup()}
    </div>`;
}

function widgetPlotMarkup() {
  return `
    <div class="ctl-chartbox__plot earnings-widget__plot" data-earnings-plot>
      <img class="earnings-widget__shade" src="${A}/earnings-widget-area.svg" width="362" height="150" alt="" aria-hidden="true" />
      <div class="earnings-widget__lines" aria-hidden="true">
        <img class="earnings-widget__line earnings-widget__line--muted" data-earnings-widget-muted src="${A}/earnings-widget-line-muted.svg" width="360" height="140" alt="" hidden />
        <img class="earnings-widget__line earnings-widget__line--solid" data-earnings-widget-solid src="${A}/earnings-widget-line-solid.svg" width="360" height="140" alt="" />
      </div>
      <img class="ctl-chartbox__baseline earnings-widget__axis" src="${A}/earnings-widget-axis.svg" width="360" height="1" alt="" />
      <div class="lifetime-earnings-chart__scrub earnings-widget__scrub" data-earnings-scrub>
        <span class="lifetime-earnings-chart__scrub-vline" aria-hidden="true"></span>
        <span class="lifetime-earnings-chart__scrub-dot earnings-widget__dot" aria-hidden="true"></span>
      </div>
    </div>`;
}

function widgetPlotMarkupDs() {
  return widgetPlotMarkup().replace(/ctl-chartbox__plot/g, "ds-performance-chart__plot").replace(/ctl-chartbox__baseline/g, "ds-performance-chart__baseline");
}

function hoverSummaryMarkup() {
  const cols = DETAIL_SERIES
    .map(
      (s) => `
      <div class="le-hover-metric">
        <span class="le-hover-metric__bar le-hover-metric__bar--${s.bar}" aria-hidden="true"></span>
        <div>
          <p class="le-hover-metric__label">${esc(s.label)}</p>
          <p class="le-hover-metric__value" data-earnings-metric="${s.id}">—</p>
        </div>
      </div>`
    )
    .join("");
  return `
    <div class="le-hover-summary" data-earnings-summary-hover aria-hidden="true">
      <div class="le-hover-summary__grid">${cols}</div>
      <p class="le-hover-summary__date" data-earnings-hover-date></p>
    </div>`;
}

/**
 * @param {"widget" | "detail"} size
 * @param {number} peak
 * @param {"ctl" | "ds"} skin
 */
export function earningsInteractiveChart(size, peak, skin = "ctl") {
  const isWidget = size === "widget";
  const isDs = skin === "ds";

  const ticker = chartTickerMarkup();

  if (!isWidget) {
    const axisTop = esc(axisTopEarnings(peak));
    return `
    <div class="lifetime-earnings-chart lifetime-earnings-chart--detail" data-earnings-chart data-earnings-size="detail" data-earnings-peak="${peak}">
      <div class="le-chart__canvas">
        <span class="le-chart__axis le-chart__axis--top" data-earnings-axis-top>${axisTop}</span>
        ${detailPlotMarkup()}
        <span class="le-chart__axis le-chart__axis--bottom">${formatEurBefore(0)}</span>
      </div>
      ${ticker}
    </div>`;
  }

  const innerCls = isDs ? "ds-performance-chart ds-performance-chart--widget-inner" : "ctl-chartbox";
  const axisTopCls = isDs ? "ds-performance-chart__axis ds-performance-chart__axis--top" : "ctl-chartbox__axis ctl-chartbox__axis--top";
  const axisBottomCls = isDs ? "ds-performance-chart__axis ds-performance-chart__axis--bottom" : "ctl-chartbox__axis ctl-chartbox__axis--bottom";
  const plot = isDs ? widgetPlotMarkupDs() : widgetPlotMarkup();

  return `
    <div class="lifetime-earnings-chart lifetime-earnings-chart--widget lifetime-earnings-chart--interactive" data-earnings-chart data-earnings-size="widget" data-earnings-peak="${peak}">
      <div class="${innerCls}">
        <span class="${axisTopCls}" data-earnings-axis-top>${esc(axisTopEarnings(peak))}</span>
        ${plot}
        <span class="${axisBottomCls}">${formatEurBefore(0)}</span>
      </div>
      ${ticker}
    </div>`;
}

function categoryRowsCtl(categories) {
  return categories
    .map((c) => {
      const meta = CATEGORY_META[c.id] ?? CATEGORY_META.savings;
      const toneCls =
        c.id === "investments" ? " ctl-row__icon--invest" : c.id === "retirement" ? " ctl-row__icon--retire" : "";
      return `
      <button type="button" class="ctl-row" data-nav="${meta.nav}">
        <div class="ctl-row__main">
          <div class="ctl-row__lead">
            <span class="ctl-row__icon${toneCls}"><img src="${categoryIconUrl(c.id)}" alt="" width="24" height="24" /></span>
            <span class="ctl-row__copy">
              <span class="ctl-row__name">${esc(CATEGORY_LABEL[c.id] ?? c.label)}</span>
              <span class="ctl-row__meta">${c.active} Active</span>
            </span>
          </div>
          <div class="ctl-row__trail">
            <div class="ctl-row__amountline"><p class="ctl-row__amount">${esc(eurBefore(c.lifetime))}</p></div>
            <span class="ctl-row__meta">${performanceEarnHtml(c.year)} this year</span>
          </div>
        </div>
      </button>`;
    })
    .join("");
}

function categoryRowsDs(categories, concept) {
  const tone = (c) => (c.color === "savings" ? "blue" : c.color === "invest" ? "pink" : "green");
  const navigable = (id) => concept !== "b" || id === "savings";
  return categories
    .map((c) => {
      const inner = `
        <span class="ds-portfolio-product__icon ds-mark ds-mark--${tone(c)}">${markIconHtml({ categoryId: c.id })}</span>
        <span class="ds-portfolio-product__copy">
          <strong>${esc(CATEGORY_LABEL[c.id] ?? c.label)}</strong>
          <small>${c.active} Active</small>
        </span>
        <span class="ds-portfolio-product__amount">
          <strong>${esc(eurBefore(c.lifetime))}</strong>
          ${c.year ? `${performanceEarnHtml(c.year)} <span class="ds-portfolio-product__period">this year</span>` : ""}
        </span>`;
      if (!navigable(c.id)) {
        return `<div class="ds-portfolio-product ds-portfolio-product--static">${inner}</div>`;
      }
      return `<button type="button" class="ds-portfolio-product" data-nav="category/${c.id}">${inner}</button>`;
    })
    .join("");
}

function earningsDisclaimer() {
  return `<p class="le-disclaimer">Pre-tax earnings, actual payout depends on your personal situation. Past performance is not an indicator of future performance, see <a href="#">risk disclosures</a>.</p>`;
}

function earningsDetailBody({ variant }) {
  const { total, categories, yearTotal } = lifetimeEarningsModel();
  const chart = earningsInteractiveChart("detail", total);
  const rows =
    variant === "control" ? categoryRowsCtl(categories) : categoryRowsDs(categories, variant);

  return `
    <button type="button" class="le-back" data-go-back>
      <img src="${A}/icon-chevron-right.svg" width="24" height="24" alt="" class="le-back__icon" />
      Back
    </button>
    <section class="le-card">
      <h1 class="le-title">Lifetime earnings</h1>
      <div class="le-chart-head" data-earnings-chart-head>
        <div class="le-chart-head__viewport">
          <div class="le-total" data-earnings-summary-default>
            <p class="le-kicker">Total</p>
            <p class="le-amount">${esc(eurBefore(total))}</p>
            <p class="le-year">${esc(signedBefore(yearTotal))} this year</p>
          </div>
          ${hoverSummaryMarkup()}
        </div>
      </div>
      ${chart}
      <div class="le-categories">
        <h2 class="le-subtitle">Categories</h2>
        <div class="le-rows">${rows}</div>
      </div>
      ${earningsDisclaimer()}
    </section>`;
}

/** Control dashboard rail widget (12:5574) with scrub + navigation. */
export function renderControlEarningsWidget() {
  const peak = WEALTH.lifetimeEarnings;
  return `
    <section class="ctl-card ctl-earnings-widget" data-earnings-widget data-cursor-src="src/control/EarningsWidget.tsx:1">
      <div class="ctl-earnings__head">
        <div class="earnings-widget__head-copy">
          <h2 class="ctl-title">Lifetime earnings</h2>
          <div class="earnings-widget__value-block">
            <p class="ctl-earnings__amount" data-earnings-headline>${esc(eurBefore(peak))}</p>
            <p class="ctl-earnings__date earnings-widget__date" data-earnings-date aria-hidden="true"></p>
          </div>
        </div>
        <button type="button" class="ctl-textbtn" data-nav="lifetime-earnings">
          <span>Show more</span>
          <img src="${A}/icon-chevron-right.svg" width="24" height="24" alt="" />
        </button>
      </div>
      ${earningsInteractiveChart("widget", peak)}
    </section>`;
}

/** Hypothesis A/B — trailing chevron stays on one line with the label. */
export function renderDsEarningsShowMoreBtn() {
  return `<button type="button" class="ds-textbtn ds-textbtn--trailing" data-nav="lifetime-earnings">
          <span>Show more</span>
          <img src="${A}/icon-chevron-right.svg" width="24" height="24" alt="" />
        </button>`;
}

const dsShowMoreBtn = renderDsEarningsShowMoreBtn();

export function renderDsEarningsWidgetCard(
  extraClass = "",
  { heading = "Lifetime earnings", embeddedHead = true, showMoreInCard = false } = {}
) {
  const peak = WEALTH.lifetimeEarnings;
  const headMod = embeddedHead ? "" : " ds-earnings-widget--external-head";
  const innerMetricLabel = embeddedHead
    ? ""
    : `<p class="ds-earnings-widget__metric-label">Lifetime earnings</p>`;
  const amountRow = `
          <div class="ds-earnings-widget__amount-row">
            <p class="ds-earnings-widget__amount" data-earnings-headline>${eurBefore(peak)}</p>
            ${showMoreInCard ? dsShowMoreBtn : ""}
          </div>`;
  const valueBlock = `
        <div class="earnings-widget__value-block">
          ${innerMetricLabel}
          ${showMoreInCard ? amountRow : `<p class="ds-earnings-widget__amount" data-earnings-headline>${eurBefore(peak)}</p>`}
          <p class="ds-kicker ds-earnings-widget__date earnings-widget__date" data-earnings-date aria-hidden="true"></p>
        </div>`;
  const head = embeddedHead
    ? `
      <div class="ds-card__head ds-card__head--plain">
        <div class="earnings-widget__head-copy">
          <h2 class="ds-h">${heading}</h2>
          ${valueBlock}
        </div>
        ${dsShowMoreBtn}
      </div>`
    : valueBlock;
  return `
    <section class="ds-card ds-earnings-widget${headMod}${extraClass ? ` ${extraClass}` : ""}" data-earnings-widget>
      ${head}
      ${earningsInteractiveChart("widget", peak, "ds")}
    </section>`;
}

export function renderControlLifetimeEarningsPage() {
  return earningsDetailBody({ variant: "control" });
}

export function renderDsLifetimeEarningsPage(concept) {
  const pageClass = concept === "a" ? "ds-page ds-page--a ds-page--earnings" : "ds-page ds-page--b ds-page--earnings";
  return `<div class="${pageClass}">${earningsDetailBody({ variant: concept })}</div>`;
}

let detachEarningsCharts = null;

function bindWidgetChart(chart, cleanups) {
  const plot = chart.querySelector("[data-earnings-plot]");
  const scrub = chart.querySelector("[data-earnings-scrub]");
  const solid = chart.querySelector("[data-earnings-widget-solid]");
  const muted = chart.querySelector("[data-earnings-widget-muted]");
  const shade = chart.querySelector(".earnings-widget__shade");
  const dot = scrub?.querySelector(".earnings-widget__dot");
  const widget = chart.closest("[data-earnings-widget]");
  const headline = widget?.querySelector("[data-earnings-headline]");
  const headlineDate = widget?.querySelector("[data-earnings-date]");

  if (!plot || !scrub || !solid || !muted) return;

  const peak = Number(chart.dataset.earningsPeak) || WEALTH.lifetimeEarnings;
  const formatHeadline = (value) => eurBefore(value);
  const restHeadline = formatHeadline(peak);

  const setRest = () => {
    muted.hidden = true;
    solid.style.clipPath = "";
    if (shade) shade.style.clipPath = "";
    chart.classList.remove("is-scrubbing");
    widget?.classList.remove("is-scrubbing");
    if (headline) headline.textContent = restHeadline;
    if (headlineDate) {
      headlineDate.textContent = "";
      headlineDate.setAttribute("aria-hidden", "true");
    }
  };

  const setRatio = (ratio) => {
    const clamped = Math.max(0.05, Math.min(0.92, ratio));
    const pct = clamped * 100;
    const pctStr = `${pct}%`;

    muted.hidden = false;
    scrub.style.setProperty("--scrub-x", pctStr);
    chart.classList.add("is-scrubbing");
    widget?.classList.add("is-scrubbing");

    /* Full gray underlay; navy on top clipped left — one stroke per segment, no seam duplicate. */
    solid.style.clipPath = `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;
    if (shade) shade.style.clipPath = `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;

    if (dot) dot.style.top = `${scrubDotTopPercent(clamped)}%`;

    const value = valueAtRatio(clamped, peak);
    if (headline) headline.textContent = formatHeadline(value);
    if (headlineDate) {
      headlineDate.textContent = formatChartDate(clamped);
      headlineDate.removeAttribute("aria-hidden");
    }
  };

  const clear = () => setRest();

  setRest();

  const onMove = (event) => {
    const rect = plot.getBoundingClientRect();
    if (!rect.width) return;
    setRatio((event.clientX - rect.left) / rect.width);
  };

  const onDown = (e) => {
    plot.setPointerCapture(e.pointerId);
    onMove(e);
  };
  const onUp = (e) => {
    try {
      plot.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  plot.addEventListener("pointermove", onMove);
  plot.addEventListener("pointerleave", clear);
  plot.addEventListener("pointerdown", onDown);
  plot.addEventListener("pointerup", onUp);

  cleanups.push(() => {
    plot.removeEventListener("pointermove", onMove);
    plot.removeEventListener("pointerleave", clear);
    plot.removeEventListener("pointerdown", onDown);
    plot.removeEventListener("pointerup", onUp);
  });
}

function bindDetailChart(chart, cleanups) {
  const plot = chart.querySelector("[data-earnings-plot]");
  const scrub = chart.querySelector("[data-earnings-scrub]");
  const card = chart.closest(".le-card");
  const chartHead = card?.querySelector("[data-earnings-chart-head]");
  const hoverDate = card?.querySelector("[data-earnings-hover-date]");

  if (!plot || !scrub) return;

  const setRatio = (ratio) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    const pct = `${clamped * 100}%`;
    const values = valuesAtRatio(clamped);

    scrub.hidden = false;
    scrub.style.setProperty("--scrub-x", pct);
    chart.classList.add("is-scrubbing");
    chartHead?.classList.add("is-scrubbing");

    if (hoverDate) hoverDate.textContent = formatChartDate(clamped);

    DETAIL_SERIES.forEach((s) => {
      const metric = card?.querySelector(`[data-earnings-metric="${s.id}"]`);
      const dot = scrub.querySelector(`[data-earnings-dot="${s.id}"]`);
      if (clamped < s.minRatio) {
        dot?.setAttribute("hidden", "");
        if (metric) metric.textContent = "—";
        return;
      }
      const top = s.dot(clamped);
      if (dot) {
        dot.style.top = `${top}%`;
        dot.removeAttribute("hidden");
      }
      if (metric) metric.textContent = eurBefore(values[s.id] ?? 0);
    });
  };

  const clear = () => {
    scrub.hidden = true;
    chart.classList.remove("is-scrubbing");
    chartHead?.classList.remove("is-scrubbing");
    scrub.querySelectorAll("[data-earnings-dot]").forEach((d) => d.setAttribute("hidden", ""));
  };

  const onMove = (event) => {
    const rect = plot.getBoundingClientRect();
    if (!rect.width) return;
    setRatio((event.clientX - rect.left) / rect.width);
  };

  const onDown = (e) => {
    plot.setPointerCapture(e.pointerId);
    onMove(e);
  };
  const onUp = (e) => {
    try {
      plot.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  plot.addEventListener("pointermove", onMove);
  plot.addEventListener("pointerleave", clear);
  plot.addEventListener("pointerdown", onDown);
  plot.addEventListener("pointerup", onUp);

  cleanups.push(() => {
    plot.removeEventListener("pointermove", onMove);
    plot.removeEventListener("pointerleave", clear);
    plot.removeEventListener("pointerdown", onDown);
    plot.removeEventListener("pointerup", onUp);
  });
}

export function bindEarningsCharts(root) {
  detachEarningsCharts?.();
  detachEarningsCharts = null;

  const cleanups = [];

  root.querySelectorAll('[data-earnings-chart][data-earnings-size="widget"]').forEach((chart) => {
    bindWidgetChart(chart, cleanups);
  });

  root.querySelectorAll('[data-earnings-chart][data-earnings-size="detail"]').forEach((chart) => {
    bindDetailChart(chart, cleanups);
  });

  if (cleanups.length) {
    detachEarningsCharts = () => cleanups.forEach((fn) => fn());
  }
}
