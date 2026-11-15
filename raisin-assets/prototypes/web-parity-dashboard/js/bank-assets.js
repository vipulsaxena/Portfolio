/**
 * Bank logos exported from Figma (Control frames). Used by Control and DS screens (A/B).
 * Catalog API bank names are matched fuzzily when there is no exact key.
 */

export const BANK_ASSETS_BASE = "assets/figma/control";

/** Filename under BANK_ASSETS_BASE — keys are substrings of catalog `deposit_taking_bank.name`. */
export const OFFER_LOGO_FILES = {
  Klarna: "bank-klarna.png",
  Illimity: "bank-illimity.png",
  "Vivi Banca": "bank-vivi-banca.png",
  Rietumu: "bank-rietumu.png",
  EM: "bank-em.png",
  Aka: "bank-em.png",
  Collector: "bank-illimity.png",
  Aareal: "bank-rietumu.png",
  HoistSpar: "bank-vivi-banca.png",
  Bentley: "bank-klarna.png",
};

const DEFAULT_LOGO = "bank-money-happy.png";

export function bankLogoFile(bankName) {
  if (!bankName) return DEFAULT_LOGO;
  const trimmed = bankName.trim();
  for (const [key, file] of Object.entries(OFFER_LOGO_FILES)) {
    if (trimmed === key || trimmed.startsWith(`${key} `) || trimmed.includes(key)) return file;
  }
  const short = trimmed.replace(/\s+Bank.*$/i, "").trim();
  for (const [key, file] of Object.entries(OFFER_LOGO_FILES)) {
    if (short === key || key.startsWith(short) || short.startsWith(key)) return file;
  }
  return DEFAULT_LOGO;
}

export function bankLogoUrl(bankName) {
  return `${BANK_ASSETS_BASE}/${bankLogoFile(bankName)}`;
}

/** 48px bank tile — same footprint as `ds-mark` on product cards. */
export function bankAvatarMarkup(bankName) {
  const src = bankLogoUrl(bankName);
  return `<span class="ds-bank-avatar" aria-hidden="true"><img src="${escAttr(src)}" alt="" width="48" height="48" loading="lazy" /></span>`;
}

function escAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
