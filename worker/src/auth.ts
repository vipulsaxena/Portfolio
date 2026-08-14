const COOKIE_NAME = "portfolio_admin";
const TTL_MS = 24 * 60 * 60 * 1000;

export async function hashToken(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAdminToken(secret: string): Promise<string> {
  const raw = `${secret}:${Date.now()}:${crypto.randomUUID()}`;
  return hashToken(raw);
}

export function adminCookieHeader(token: string, maxAgeSec: number): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}`;
}

export function clearAdminCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function getAdminCookie(request: Request): string | null {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getAdminToken(request: Request): string | null {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return getAdminCookie(request);
}

interface AdminSession {
  token: string;
  expiresAt: number;
}

// In-memory admin sessions (per isolate; re-login after cold start is acceptable for v1)
const sessions = new Map<string, AdminSession>();

export async function registerAdminSession(token: string): Promise<void> {
  sessions.set(token, { token, expiresAt: Date.now() + TTL_MS });
}

export function isValidAdminSession(token: string | null): boolean {
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function revokeAdminSession(token: string | null): void {
  if (token) sessions.delete(token);
}

export { COOKIE_NAME, TTL_MS };
