/**
 * UI translation for the market / language switcher.
 *
 * Screens render English; after each render `translateDom()` rewrites text nodes and
 * accessible attributes in place. English in Germany — the default — is never touched.
 *
 * Lookup order for every string:
 *   1. market overlay (English → English): product naming and legal copy that differ by
 *      market, e.g. "Easy access" and FSCS protection in the UK
 *   2. language dictionary (`js/i18n/<lang>.js`): exact strings, then `{0}` templates for
 *      strings that carry amounts or names, then " · "-separated segments one by one
 *
 * Template captures are translated again and hard-coded amounts / rates inside them are
 * re-formatted for the active locale, so marketing copy follows the Format Standards too.
 * Translations are prototype copy drafted for review, not approved market copy.
 */

import { formatEurAfterWhole, formatPercent, formatRatePa } from "./format.js";
import de from "./i18n/de.js";
import nl from "./i18n/nl.js";
import es from "./i18n/es.js";
import fr from "./i18n/fr.js";
import it from "./i18n/it.js";
import pl from "./i18n/pl.js";
import fi from "./i18n/fi.js";
import { EN_TEMPLATES, MARKET_OVERLAYS } from "./i18n/overlays.js";

const DICTIONARIES = { de, nl, es, fr, it, pl, fi };

const ATTRIBUTES = ["aria-label", "title", "placeholder", "alt", "data-label"];
const SKIP = "[data-i18n-skip], script, style, noscript, code, kbd";
const HAS_LETTERS = /\p{L}/u;
const SEPARATOR = " · ";

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Formatted figures use no-break spaces (NBSP, narrow NBSP) that dictionaries write as plain
 * spaces, so keys and lookups are compared with those folded to a plain space. */
const NBSPS = /[\u00A0\u202F]/g;
const foldSpaces = (s) => s.replace(NBSPS, " ");

/** "Please transfer {0} to {1}" → { re: /^Please transfer (.+?) to (.+?)$/, slots: [0, 1] } */
function compileTemplates(templates = {}) {
  return Object.entries(templates).map(([source, target]) => {
    const slots = [];
    const pattern = source
      .split(/(\{\d\})/)
      .map((part) => {
        const slot = part.match(/^\{(\d)\}$/);
        if (!slot) return escapeRe(part).replace(/ /g, "[ \\u00A0\\u202F]");
        slots.push(Number(slot[1]));
        return "(.+?)";
      })
      .join("");
    return { re: new RegExp(`^${pattern}$`, "u"), slots, target };
  });
}

const compiled = new Map();
function compiledFor(key, table) {
  if (!compiled.has(key)) {
    const exact = {};
    for (const [source, target] of Object.entries(table.exact ?? {})) exact[foldSpaces(source)] = target;
    compiled.set(key, { exact, templates: compileTemplates(table.templates) });
  }
  return compiled.get(key);
}

/**
 * Hard-coded figures in English copy ("3.50% p.a.", "€1", "€29,000", "57%") re-formatted
 * for the locale. Amounts use the text form of the Format Standards (copy, not UI values).
 */
function reformatFigure(value) {
  const rate = value.match(/^(\d+)[.,](\d{1,2})\s?%\s?p\.\s?a\.$/);
  if (rate) return formatRatePa(Number(`${rate[1]}.${rate[2]}`));
  const money = value.match(/^€\s?(\d{1,3}(?:,\d{3})+|\d+)$/);
  if (money) return formatEurAfterWhole(Number(money[1].replace(/,/g, "")));
  const share = value.match(/^(\d+)%$/);
  if (share) return formatPercent(Number(share[1]));
  return null;
}

/** A formatted amount or share in any supported locale, optionally signed. */
const FIGURE = String.raw`[+\u2212-]?(?:[€£]\u202F?)?\d[\d.,\u202F\u00A0]*(?:\u202F?(?:€|£|zł|%))?`;
const LABEL_FIGURE = new RegExp(`^(.+?)(,? )(${FIGURE})$`, "u");
const LABEL_PAREN = /^(.+?) \(([^()]*)\)$/u;

/**
 * Chart read-outs and accessible names built from data: "Savings (57 %)",
 * "Savings, € 345,849.00", "Savings € 1.00, Investments € 2.00". Only the labels change.
 */
function translateStructured(text, table) {
  const paren = text.match(LABEL_PAREN);
  if (paren) {
    const label = applyTable(paren[1], table);
    const inner = HAS_LETTERS.test(paren[2]) ? applyTable(paren[2], table) ?? paren[2] : paren[2];
    if (label != null || inner !== paren[2]) return `${label ?? paren[1]} (${inner})`;
  }
  const figure = text.match(LABEL_FIGURE);
  if (figure) {
    const label = applyTable(figure[1], table);
    if (label != null) return `${label}${figure[2]}${figure[3]}`;
  }
  if (text.includes(", ")) {
    const parts = text.split(", ");
    const next = parts.map((p) => {
      const m = p.match(LABEL_FIGURE);
      if (m) return `${applyTable(m[1], table) ?? m[1]}${m[2]}${m[3]}`;
      return applyTable(p, table) ?? p;
    });
    if (parts.every((p) => LABEL_FIGURE.test(p)) && next.some((p, i) => p !== parts[i])) return next.join(", ");
  }
  return null;
}

function applyTable(text, table) {
  if (!table) return null;
  const folded = foldSpaces(text);
  if (Object.prototype.hasOwnProperty.call(table.exact, folded)) return table.exact[folded];
  for (const { re, slots, target } of table.templates) {
    const m = text.match(re);
    if (!m || m.slice(1).some((c) => c.includes(SEPARATOR))) continue;
    return target.replace(/\{(\d)\}/g, (_, n) => {
      const captured = m[slots.indexOf(Number(n)) + 1] ?? "";
      return reformatFigure(captured) ?? translateFragment(captured, table);
    });
  }
  return null;
}

/** Captured names and labels: translated when the dictionary knows them, else kept. */
function translateFragment(fragment, table) {
  if (!HAS_LETTERS.test(fragment)) return fragment;
  return applyTable(fragment, table) ?? fragment;
}

const translateOne = (text, table) => applyTable(text, table) ?? translateStructured(text, table);

function translateWith(text, tables) {
  let out = text;
  let changed = false;
  for (const table of tables) {
    const hit = translateOne(out, table);
    if (hit != null) {
      out = hit;
      changed = true;
      continue;
    }
    if (out.includes(SEPARATOR)) {
      const parts = out.split(SEPARATOR);
      const next = parts.map((p) => (HAS_LETTERS.test(p) ? translateOne(p, table) ?? p : reformatFigure(p) ?? p));
      if (next.some((p, i) => p !== parts[i])) {
        out = next.join(SEPARATOR);
        changed = true;
      }
    }
  }
  return changed ? out : null;
}

/** Translation steps for a language in a market — `null` when nothing would change. */
export function tablesFor(language, market) {
  const overlay = MARKET_OVERLAYS[market];
  const tables = [];
  if (overlay?.all) tables.push(compiledFor(`${market}:all`, overlay.all));
  if (language === "en") {
    if (!overlay) return null;
    if (overlay.en) tables.push(compiledFor(`${market}:en`, overlay.en));
    tables.push(compiledFor("en:figures", { templates: EN_TEMPLATES }));
    return tables;
  }
  const dict = DICTIONARIES[language];
  if (dict) tables.push(compiledFor(language, dict));
  return tables.length ? tables : null;
}

/** Translate one English UI string for a language and market. */
export function translateText(text, language, market) {
  const tables = tablesFor(language, market);
  if (!tables) return text;
  const key = text.replace(/[ \t\r\n]+/g, " ").trim();
  return translateWith(key, tables) ?? text;
}

export function translateDom(root, language, market) {
  const tables = tablesFor(language, market);
  if (!tables) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest(SKIP) || !HAS_LETTERS.test(node.nodeValue) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const [, lead, core, trail] = node.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const key = core.replace(/[ \t\r\n]+/g, " ");
    const hit = translateWith(key, tables);
    if (hit != null) node.nodeValue = `${lead}${hit}${trail}`;
  }

  root.querySelectorAll(ATTRIBUTES.map((a) => `[${a}]`).join(",")).forEach((el) => {
    if (el.closest("[data-i18n-skip]")) return;
    for (const attr of ATTRIBUTES) {
      const value = el.getAttribute(attr);
      if (!value || !HAS_LETTERS.test(value)) continue;
      const hit = translateWith(value.replace(/[ \t\r\n]+/g, " ").trim(), tables);
      if (hit != null) el.setAttribute(attr, hit);
    }
  });
}
