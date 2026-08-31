export const PAGE_IDS = [
  "index",
  "about",
  "olx",
  "n26",
  "gomart",
  "raisin",
  "goplay",
  "instalively",
  "silent-ninja",
] as const;

export type PageId = (typeof PAGE_IDS)[number];

export interface PresentationState {
  page: PageId;
  /** True when the presenter is on *-presentation.html (slide deck), false on web scroll view. */
  deck: boolean | null;
  slide: number | null;
  section: string | null;
  scroll: number | null;
  widgets: Record<string, string> | null;
  highlight: string | null;
  ts: number;
}

export type ClientMessage =
  | { type: "HELLO"; role: "presenter"; presenterToken: string }
  | { type: "HELLO"; role: "audience"; participantId?: string }
  | { type: "STATE"; state: PresentationState }
  | { type: "FOLLOW" }
  | { type: "UNFOLLOW" }
  | { type: "FORCE_FOLLOW" }
  | { type: "END" }
  | { type: "PING" };

export type ServerMessage =
  | {
      type: "SNAPSHOT";
      state: PresentationState | null;
      connected: number;
      following: number;
      ended: boolean;
      presenterConnected: boolean;
      participantId?: string;
    }
  | { type: "STATE"; state: PresentationState }
  | { type: "FORCE_FOLLOW"; state: PresentationState | null }
  | { type: "COUNTS"; connected: number; following: number; presenterConnected: boolean }
  | { type: "ENDED"; stats?: SessionStats }
  | { type: "PONG" }
  | { type: "ERROR"; code: string };

export interface SessionStats {
  durationMs: number;
  connected: number;
  following: number;
  peakFollowing: number;
  peakConnected: number;
}

const PAGE_SET = new Set<string>(PAGE_IDS);
const SECTION_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const WIDGET_KEY_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$/;
const WIDGET_VAL_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

function sanitizeWidgets(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  const keys = Object.keys(src).slice(0, 24);
  for (const key of keys) {
    if (!WIDGET_KEY_RE.test(key)) continue;
    const val = src[key];
    if (typeof val !== "string" || !WIDGET_VAL_RE.test(val)) continue;
    out[key] = val;
  }
  return Object.keys(out).length ? out : null;
}

export function widgetsSignature(widgets: Record<string, string> | null | undefined): string {
  if (!widgets) return "";
  return Object.keys(widgets)
    .sort()
    .map((k) => k + "=" + widgets[k])
    .join("&");
}

export function sanitizeState(raw: unknown): PresentationState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.page !== "string" || !PAGE_SET.has(o.page)) return null;
  let deck: boolean | null = null;
  if (o.deck !== null && o.deck !== undefined) {
    if (typeof o.deck !== "boolean") return null;
    deck = o.deck;
  }
  let slide: number | null = null;
  if (o.slide !== null && o.slide !== undefined) {
    if (typeof o.slide !== "number" || !Number.isInteger(o.slide) || o.slide < 1 || o.slide > 200) {
      return null;
    }
    slide = o.slide;
  }
  let section: string | null = null;
  if (o.section !== null && o.section !== undefined) {
    if (typeof o.section !== "string" || !SECTION_RE.test(o.section)) return null;
    section = o.section;
  }
  let scroll: number | null = null;
  if (o.scroll !== null && o.scroll !== undefined) {
    if (typeof o.scroll !== "number" || !Number.isFinite(o.scroll)) return null;
    scroll = Math.max(0, Math.min(1, o.scroll));
  }
  const widgets = sanitizeWidgets(o.widgets);
  let highlight: string | null = null;
  if (o.highlight !== null && o.highlight !== undefined) {
    if (typeof o.highlight !== "string" || !WIDGET_VAL_RE.test(o.highlight)) return null;
    highlight = o.highlight;
  }
  const ts = typeof o.ts === "number" && Number.isFinite(o.ts) ? o.ts : Date.now();
  return { page: o.page as PageId, deck, slide, section, scroll, widgets, highlight, ts };
}

export function randomToken(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SESSION_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function randomSessionId(length = 8): string {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SESSION_ALPHABET[buf[i] % SESSION_ALPHABET.length];
  }
  return out;
}

export function isValidSessionId(id: string): boolean {
  return /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6,16}$/.test(id);
}
