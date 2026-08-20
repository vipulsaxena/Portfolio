import {
  detectHighlights,
  mergeHighlights,
  FILTER_TAGS,
  type HighlightTag,
} from "./highlights";
import {
  adminCookieHeader,
  clearAdminCookie,
  createAdminToken,
  getAdminToken,
  isValidAdminSession,
  registerAdminSession,
  revokeAdminSession,
  TTL_MS,
} from "./auth";

import { SYSTEM_PROMPT } from "./knowledge";

export interface Env {
  DB: D1Database;
  AI: Ai;
  ADMIN_PASSWORD: string;
  ALLOWED_ORIGINS: string;
}

// IP-based abuse guard only — do not cap per-session message count (long chats must persist).
const IP_RATE_LIMIT = 500;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
let schemaReady: Promise<void> | null = null;

async function ensureSchema(env: Env): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      try {
        await env.DB.prepare(
          "ALTER TABLE sessions ADD COLUMN read_at TEXT"
        ).run();
      } catch {
        // Column already exists on migrated databases.
      }
    })();
  }
  return schemaReady;
}

function getClientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseJsonArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function getAllowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  const allowed = getAllowedOrigins(env);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
  if (allowed.includes(origin) || allowed.includes("*")) {
    headers["Access-Control-Allow-Origin"] = origin || allowed[0];
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

function json(
  data: unknown,
  status: number,
  request: Request,
  env: Env,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request, env),
      ...extraHeaders,
    },
  });
}

function checkIpRateLimit(request: Request): boolean {
  const key = `ip:${getClientIp(request)}`;
  const bucket = rateBuckets.get(key);
  const now = Date.now();
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= IP_RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

async function ensureSession(env: Env, sessionId: string, page?: string) {
  const existing = await env.DB.prepare(
    "SELECT id FROM sessions WHERE id = ?"
  )
    .bind(sessionId)
    .first();

  if (existing) return;

  const ts = nowIso();
  await env.DB.prepare(
    `INSERT INTO sessions (id, page_first_seen, highlights, created_at, updated_at)
     VALUES (?, ?, '[]', ?, ?)`
  )
    .bind(sessionId, page || null, ts, ts)
    .run();
}

async function updateSessionHighlights(
  env: Env,
  sessionId: string,
  newTags: HighlightTag[]
) {
  if (!newTags.length) return;
  const row = await env.DB.prepare(
    "SELECT highlights FROM sessions WHERE id = ?"
  )
    .bind(sessionId)
    .first<{ highlights: string }>();

  const current = parseJsonArray<HighlightTag>(row?.highlights, []);
  const merged = mergeHighlights(current, newTags);
  await env.DB.prepare(
    "UPDATE sessions SET highlights = ?, updated_at = ? WHERE id = ?"
  )
    .bind(JSON.stringify(merged), nowIso(), sessionId)
    .run();
}

async function handleChatSession(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as {
    sessionId?: string;
    page?: string;
  };

  const sessionId = body.sessionId || crypto.randomUUID();
  await ensureSession(env, sessionId, body.page);

  return json({ sessionId }, 200, request, env);
}

async function handleChatMessage(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as {
    sessionId?: string;
    role?: string;
    content?: string;
    tags?: HighlightTag[];
    page?: string;
  };

  if (!body.sessionId || !body.role || body.content == null) {
    return json({ error: "sessionId, role, content required" }, 400, request, env);
  }

  if (!checkIpRateLimit(request)) {
    return json({ error: "Rate limit exceeded" }, 429, request, env);
  }

  await ensureSession(env, body.sessionId, body.page);

  const tags = detectHighlights(
    body.content,
    body.role,
    body.tags || []
  );

  const ts = nowIso();
  await env.DB.prepare(
    `INSERT INTO messages (session_id, role, content, tags, created_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      body.sessionId,
      body.role,
      body.content,
      JSON.stringify(tags),
      ts
    )
    .run();

  await env.DB.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?")
    .bind(ts, body.sessionId)
    .run();

  await updateSessionHighlights(env, body.sessionId, tags);

  return json({ ok: true, tags }, 200, request, env);
}

async function handlePatchSession(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as {
    sessionId?: string;
    email?: string;
    intent?: string;
    unlocked_at?: string;
    page?: string;
  };

  if (!body.sessionId) {
    return json({ error: "sessionId required" }, 400, request, env);
  }

  await ensureSession(env, body.sessionId, body.page);

  const tags: HighlightTag[] = [];
  if (body.email) tags.push("contact_info");
  if (body.unlocked_at) tags.push("unlocked");

  const ts = nowIso();
  await env.DB.prepare(
    `UPDATE sessions SET
      email = COALESCE(?, email),
      intent = COALESCE(?, intent),
      unlocked_at = COALESCE(?, unlocked_at),
      updated_at = ?
     WHERE id = ?`
  )
    .bind(
      body.email ?? null,
      body.intent ?? null,
      body.unlocked_at ?? null,
      ts,
      body.sessionId
    )
    .run();

  await updateSessionHighlights(env, body.sessionId, tags);

  if (body.email) {
    await env.DB.prepare(
      `INSERT INTO messages (session_id, role, content, tags, created_at)
       VALUES (?, 'system', ?, ?, ?)`
    )
      .bind(
        body.sessionId,
        `Contact captured: ${body.email}`,
        JSON.stringify(["contact_info"]),
        ts
      )
      .run();
  }

  if (body.unlocked_at) {
    await env.DB.prepare(
      `INSERT INTO messages (session_id, role, content, tags, created_at)
       VALUES (?, 'system', ?, ?, ?)`
    )
      .bind(
        body.sessionId,
        "Portfolio unlocked",
        JSON.stringify(["unlocked"]),
        ts
      )
      .run();
  }

  return json({ ok: true }, 200, request, env);
}

async function handleAdminLogin(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as { password?: string };
  const password = env.ADMIN_PASSWORD || "vipulknows26";

  if (!body.password || body.password !== password) {
    return json({ error: "Invalid password" }, 401, request, env);
  }

  const token = await createAdminToken(password);
  await registerAdminSession(token);

  return json(
    { ok: true, token },
    200,
    request,
    env,
    {
      "Set-Cookie": adminCookieHeader(token, Math.floor(TTL_MS / 1000)),
    }
  );
}

async function handleAdminLogout(
  request: Request,
  env: Env
): Promise<Response> {
  const token = getAdminToken(request);
  revokeAdminSession(token);
  return json(
    { ok: true },
    200,
    request,
    env,
    { "Set-Cookie": clearAdminCookie() }
  );
}

function requireAdmin(request: Request): boolean {
  return isValidAdminSession(getAdminToken(request));
}

const CONVERSATION_FILTER_SQL: Record<string, string> = {
  two_way: `EXISTS (
      SELECT 1 FROM messages mu
      WHERE mu.session_id = s.id AND mu.role = 'user' AND LENGTH(TRIM(mu.content)) > 0
    ) AND EXISTS (
      SELECT 1 FROM messages mb
      WHERE mb.session_id = s.id AND mb.role IN ('bot', 'assistant') AND LENGTH(TRIM(mb.content)) > 0
    )`,
  bot_only: `NOT EXISTS (
      SELECT 1 FROM messages mu
      WHERE mu.session_id = s.id AND mu.role = 'user' AND LENGTH(TRIM(mu.content)) > 0
    )`,
};

async function handleAdminSessions(
  request: Request,
  env: Env
): Promise<Response> {
  if (!requireAdmin(request)) {
    return json({ error: "Unauthorized" }, 401, request, env);
  }

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter");
  const filterTag = filter ? FILTER_TAGS[filter] : null;
  const conversationWhere = filter ? CONVERSATION_FILTER_SQL[filter] : null;

  const rows = await env.DB.prepare(
    `SELECT s.*,
      (SELECT content FROM messages m WHERE m.session_id = s.id AND m.role = 'user' ORDER BY m.id DESC LIMIT 1) AS last_user_message
     FROM sessions s
     ${conversationWhere ? `WHERE ${conversationWhere}` : ""}
     ORDER BY s.updated_at DESC
     LIMIT 200`
  ).all();

  type AdminSessionRow = Record<string, unknown> & {
    highlights: HighlightTag[];
    read: boolean;
  };

  let sessions: AdminSessionRow[] = (rows.results || []).map((s) => ({
    ...(s as Record<string, unknown>),
    highlights: parseJsonArray((s as Record<string, string>).highlights, []),
    read: Boolean((s as Record<string, unknown>).read_at),
  }));

  if (filter === "unread") {
    sessions = sessions.filter((s) => !s.read);
  } else if (filter === "read") {
    sessions = sessions.filter((s) => s.read);
  } else if (filterTag) {
    sessions = sessions.filter((s) =>
      (s.highlights as HighlightTag[]).includes(filterTag)
    );
  }

  sessions.sort((a, b) =>
    String(b.updated_at).localeCompare(String(a.updated_at))
  );

  return json({ sessions }, 200, request, env);
}

async function handleAdminSessionDetail(
  request: Request,
  env: Env,
  sessionId: string
): Promise<Response> {
  if (!requireAdmin(request)) {
    return json({ error: "Unauthorized" }, 401, request, env);
  }

  const session = await env.DB.prepare("SELECT * FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first();

  if (!session) {
    return json({ error: "Not found" }, 404, request, env);
  }

  const messages = await env.DB.prepare(
    "SELECT * FROM messages WHERE session_id = ? ORDER BY id DESC"
  )
    .bind(sessionId)
    .all();

  const parsedMessages = (messages.results || []).map((m) => ({
    ...m,
    tags: parseJsonArray((m as Record<string, string>).tags, []),
  }));

  return json(
    {
      session: {
        ...session,
        highlights: parseJsonArray(
          (session as Record<string, string>).highlights,
          []
        ),
        read: Boolean((session as Record<string, unknown>).read_at),
      },
      messages: parsedMessages,
    },
    200,
    request,
    env
  );
}

async function handleAdminPatchSession(
  request: Request,
  env: Env,
  sessionId: string
): Promise<Response> {
  if (!requireAdmin(request)) {
    return json({ error: "Unauthorized" }, 401, request, env);
  }

  const body = (await request.json()) as { read?: boolean };

  if (typeof body.read !== "boolean") {
    return json({ error: "read boolean required" }, 400, request, env);
  }

  const session = await env.DB.prepare("SELECT id FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first();

  if (!session) {
    return json({ error: "Not found" }, 404, request, env);
  }

  const readAt = body.read ? nowIso() : null;
  await env.DB.prepare("UPDATE sessions SET read_at = ? WHERE id = ?")
    .bind(readAt, sessionId)
    .run();

  return json({ ok: true, read: body.read, read_at: readAt }, 200, request, env);
}

async function handleAdminDeleteSession(
  request: Request,
  env: Env,
  sessionId: string
): Promise<Response> {
  if (!requireAdmin(request)) {
    return json({ error: "Unauthorized" }, 401, request, env);
  }

  const session = await env.DB.prepare("SELECT id FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first();

  if (!session) {
    return json({ error: "Not found" }, 404, request, env);
  }

  await env.DB.batch([
    env.DB.prepare("DELETE FROM messages WHERE session_id = ?").bind(sessionId),
    env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId),
  ]);

  return json({ ok: true }, 200, request, env);
}

function extractAiReply(result: unknown): string {
  if (!result) return "";
  if (typeof result === "string") return result.trim();

  if (typeof result !== "object") return "";

  const r = result as Record<string, unknown>;

  if (typeof r.response === "string") return r.response.trim();

  // Some models return { response: { response: "..." } } for JSON mode
  if (r.response && typeof r.response === "object") {
    const nested = r.response as Record<string, unknown>;
    if (typeof nested.response === "string") return nested.response.trim();
    if (typeof nested.text === "string") return nested.text.trim();
  }

  if (typeof r.result === "string") return r.result.trim();
  if (typeof r.text === "string") return r.text.trim();
  if (typeof r.output === "string") return r.output.trim();

  if (Array.isArray(r.choices) && r.choices[0]) {
    const choice = r.choices[0] as {
      message?: { content?: string };
      text?: string;
    };
    if (choice.message?.content) return choice.message.content.trim();
    if (choice.text) return choice.text.trim();
  }

  return "";
}

async function runCompletion(
  env: Env,
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<string> {
  if (!env.AI) {
    console.error("CRITICAL: env.AI binding is missing or undefined.");
    return "";
  }

  const models = [
    "@cf/meta/llama-3.1-8b-instruct-fast",
    "@cf/mistral/mistral-7b-instruct-v0.2-lora",
  ];

  for (const model of models) {
    try {
      console.log(`[Workers AI] Executing model ${model}...`);
  
      const result: unknown = await env.AI.run(
        model,
        {
          messages,
          max_tokens: 256,
          temperature: 0.4,
        },
        {
          gateway: {
            id: "default", // Auto-creates and routes through default AI Gateway
            skipCache: false,
            cacheTtl: 3360,
          },
        }
      );
  
      console.log(
        `[Workers AI] Raw result from ${model}:`,
        JSON.stringify(result)
      );
  
      const reply = extractAiReply(result);
      if (reply) return reply;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Workers AI Error] Model ${model} failed:`, message, err);
    }
  }

  return "";
}

async function handleChatComplete(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as {
    message?: string;
    unlocked?: boolean;
    history?: { role: string; content: string }[];
    topicCompany?: string;
  };

  if (!body.message?.trim()) {
    return json({ error: "message required" }, 400, request, env);
  }

  const history = (body.history || []).slice(-4);
  const topicNote = body.topicCompany
    ? `\nCurrent conversation topic company: ${body.topicCompany}.`
    : "";

  const systemContent =
    SYSTEM_PROMPT +
    (body.unlocked
      ? "\nUser has unlocked password-gated case studies."
      : "\nUser has NOT unlocked password-gated case studies yet.") +
    topicNote;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [{ role: "system", content: systemContent }];

  history.forEach((m) => {
    const role = m.role === "user" ? "user" : "assistant";
    if (m.content && m.content.trim()) {
      messages.push({
        role,
        content: m.content.trim(),
      });
    }
  });

  messages.push({ role: "user", content: body.message.trim() });

  try {
    const reply = await runCompletion(env, messages);

    if (reply) {
      return json({ reply, fallback: false }, 200, request, env);
    }

    return json({ reply: null, fallback: true }, 200, request, env);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("AI Route Exception:", message, err);
    return json({ reply: null, fallback: true }, 200, request, env);
  }
}

async function handleAdminMe(
  request: Request,
  env: Env
): Promise<Response> {
  if (!requireAdmin(request)) {
    return json({ authenticated: false }, 200, request, env);
  }
  return json({ authenticated: true }, 200, request, env);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }

    try {
      await ensureSchema(env);

      if (url.pathname === "/api/chat/session" && request.method === "POST") {
        return handleChatSession(request, env);
      }
      if (url.pathname === "/api/chat/message" && request.method === "POST") {
        return handleChatMessage(request, env);
      }
      if (url.pathname === "/api/chat/session" && request.method === "PATCH") {
        return handlePatchSession(request, env);
      }
      if (url.pathname === "/api/chat/complete" && request.method === "POST") {
        return handleChatComplete(request, env);
      }
      if (url.pathname === "/api/admin/login" && request.method === "POST") {
        return handleAdminLogin(request, env);
      }
      if (url.pathname === "/api/admin/logout" && request.method === "POST") {
        return handleAdminLogout(request, env);
      }
      if (url.pathname === "/api/admin/me" && request.method === "GET") {
        return handleAdminMe(request, env);
      }
      if (url.pathname === "/api/admin/sessions" && request.method === "GET") {
        return handleAdminSessions(request, env);
      }
      const detailMatch = url.pathname.match(
        /^\/api\/admin\/sessions\/([^/]+)$/
      );
      if (detailMatch && request.method === "GET") {
        return handleAdminSessionDetail(request, env, detailMatch[1]);
      }
      if (detailMatch && request.method === "PATCH") {
        return handleAdminPatchSession(request, env, detailMatch[1]);
      }
      if (detailMatch && request.method === "DELETE") {
        return handleAdminDeleteSession(request, env, detailMatch[1]);
      }

      return json({ error: "Not found" }, 404, request, env);
    } catch (err) {
      console.error(err);
      return json({ error: "Internal server error" }, 500, request, env);
    }
  },
};
