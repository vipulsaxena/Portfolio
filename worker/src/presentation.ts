import {
  isValidSessionId,
  randomSessionId,
  randomToken,
  sanitizeState,
  type PresentationState,
  type ServerMessage,
  type SessionStats,
} from "./presentation-protocol";

export interface PresentationEnv {
  PRESENTATION: DurableObjectNamespace;
}

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const PRESENTER_GONE_MS = 30 * 60 * 1000;
const SCROLL_MIN_INTERVAL_MS = 50;
const START_RATE_LIMIT = 30;
const START_WINDOW_MS = 60 * 60 * 1000;

const startBuckets = new Map<string, { count: number; resetAt: number }>();

type Role = "presenter" | "audience";

interface SocketMeta {
  role: Role;
  participantId: string;
  following: boolean;
}

interface RoomData {
  initialized: boolean;
  presenterToken: string;
  state: PresentationState | null;
  ended: boolean;
  createdAt: number;
  lastPresenterSeenAt: number;
  lastScrollAt: number;
  peakFollowing: number;
  peakConnected: number;
}

function emptyRoom(): RoomData {
  return {
    initialized: false,
    presenterToken: "",
    state: null,
    ended: false,
    createdAt: 0,
    lastPresenterSeenAt: 0,
    lastScrollAt: 0,
    peakFollowing: 0,
    peakConnected: 0,
  };
}

export class PresentationRoom {
  private room: RoomData = emptyRoom();
  private loaded = false;

  constructor(
    private readonly ctx: DurableObjectState,
    _env: PresentationEnv
  ) {}

  private async load(): Promise<void> {
    if (this.loaded) return;
    const stored = await this.ctx.storage.get<RoomData>("room");
    if (stored) this.room = stored;
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await this.ctx.storage.put("room", this.room);
  }

  private meta(ws: WebSocket): SocketMeta | null {
    return (ws.deserializeAttachment() as SocketMeta | null) || null;
  }

  private setMeta(ws: WebSocket, meta: SocketMeta): void {
    ws.serializeAttachment(meta);
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* closed */
    }
  }

  private counts(): { connected: number; following: number; presenterConnected: boolean } {
    let connected = 0;
    let following = 0;
    let presenterConnected = false;
    for (const ws of this.ctx.getWebSockets()) {
      const m = this.meta(ws);
      if (!m) continue;
      if (m.role === "audience") {
        connected += 1;
        if (m.following) following += 1;
      } else if (m.role === "presenter") {
        presenterConnected = true;
      }
    }
    return { connected, following, presenterConnected };
  }

  private broadcast(msg: ServerMessage, to: "all" | "audience" = "all"): void {
    for (const ws of this.ctx.getWebSockets()) {
      const m = this.meta(ws);
      if (!m) continue;
      if (to === "audience" && m.role !== "audience") continue;
      this.send(ws, msg);
    }
  }

  private sessionStats(): SessionStats {
    const c = this.counts();
    return {
      durationMs: Math.max(0, Date.now() - (this.room.createdAt || Date.now())),
      connected: c.connected,
      following: c.following,
      peakFollowing: Math.max(this.room.peakFollowing || 0, c.following),
      peakConnected: Math.max(this.room.peakConnected || 0, c.connected),
    };
  }

  private async endRoom(): Promise<void> {
    const stats = this.sessionStats();
    this.room.ended = true;
    await this.persist();
    this.broadcast({ type: "ENDED", stats });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(1000, "ended");
      } catch {
        /* ignore */
      }
    }
  }

  private broadcastCounts(): void {
    const c = this.counts();
    if (c.following > (this.room.peakFollowing || 0)) this.room.peakFollowing = c.following;
    if (c.connected > (this.room.peakConnected || 0)) this.room.peakConnected = c.connected;
    void this.persist();
    this.broadcast({ type: "COUNTS", ...c });
  }

  private scheduleAlarm(): void {
    const untilSession = this.room.createdAt + SESSION_TTL_MS;
    const untilGone = this.room.lastPresenterSeenAt + PRESENTER_GONE_MS;
    const when = Math.min(untilSession, untilGone);
    void this.ctx.storage.setAlarm(when);
  }

  async alarm(): Promise<void> {
    await this.load();
    if (this.room.ended) {
      await this.ctx.storage.deleteAll();
      return;
    }
    const now = Date.now();
    const expired =
      now > this.room.createdAt + SESSION_TTL_MS ||
      now > this.room.lastPresenterSeenAt + PRESENTER_GONE_MS;
    if (expired) {
      await this.endRoom();
      await this.ctx.storage.deleteAll();
    }
  }

  async fetch(request: Request): Promise<Response> {
    await this.load();
    const url = new URL(request.url);

    if (url.pathname === "/init" && request.method === "POST") {
      const body = (await request.json()) as { presenterToken?: string };
      if (!body.presenterToken) {
        return Response.json({ error: "missing_token" }, { status: 400 });
      }
      this.room = {
        initialized: true,
        presenterToken: body.presenterToken,
        state: null,
        ended: false,
        createdAt: Date.now(),
        lastPresenterSeenAt: Date.now(),
        lastScrollAt: 0,
        peakFollowing: 0,
        peakConnected: 0,
      };
      await this.persist();
      this.scheduleAlarm();
      return Response.json({ ok: true });
    }

    if (url.pathname === "/ws" && request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      if (!this.room.initialized || this.room.ended) {
        this.send(pair[1], this.room.ended ? { type: "ENDED" } : { type: "ERROR", code: "not_found" });
        try {
          pair[1].close(this.room.ended ? 1000 : 4404, this.room.ended ? "ended" : "not_found");
        } catch {
          /* ignore */
        }
      }
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.load();
    if (typeof message !== "string") return;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(message) as Record<string, unknown>;
    } catch {
      this.send(ws, { type: "ERROR", code: "bad_json" });
      return;
    }

    const type = data.type;
    if (type === "PING") {
      this.send(ws, { type: "PONG" });
      return;
    }

    if (this.room.ended) {
      this.send(ws, { type: "ENDED", stats: this.sessionStats() });
      return;
    }

    if (type === "HELLO") {
      await this.handleHello(ws, data);
      return;
    }

    const meta = this.meta(ws);
    if (!meta) {
      this.send(ws, { type: "ERROR", code: "hello_required" });
      return;
    }

    if (type === "STATE") {
      if (meta.role !== "presenter") {
        this.send(ws, { type: "ERROR", code: "forbidden" });
        return;
      }
      const state = sanitizeState(data.state);
      if (!state) {
        this.send(ws, { type: "ERROR", code: "bad_state" });
        return;
      }
      const now = Date.now();
      this.room.lastPresenterSeenAt = now;
      const scrollOnly =
        this.room.state &&
        this.room.state.page === state.page &&
        this.room.state.slide === state.slide &&
        this.room.state.section === state.section;
      if (scrollOnly && now - this.room.lastScrollAt < SCROLL_MIN_INTERVAL_MS) {
        this.room.state = state;
        return;
      }
      if (scrollOnly) this.room.lastScrollAt = now;
      this.room.state = state;
      await this.persist();
      this.scheduleAlarm();
      this.broadcast({ type: "STATE", state }, "audience");
      return;
    }

    if (type === "FOLLOW" || type === "UNFOLLOW") {
      if (meta.role !== "audience") return;
      meta.following = type === "FOLLOW";
      this.setMeta(ws, meta);
      this.broadcastCounts();
      return;
    }

    if (type === "FORCE_FOLLOW") {
      if (meta.role !== "presenter") {
        this.send(ws, { type: "ERROR", code: "forbidden" });
        return;
      }
      for (const socket of this.ctx.getWebSockets()) {
        const m = this.meta(socket);
        if (!m || m.role !== "audience") continue;
        m.following = true;
        this.setMeta(socket, m);
      }
      this.broadcast({ type: "FORCE_FOLLOW", state: this.room.state }, "audience");
      this.broadcastCounts();
      return;
    }

    if (type === "END") {
      if (meta.role !== "presenter") {
        this.send(ws, { type: "ERROR", code: "forbidden" });
        return;
      }
      await this.endRoom();
    }
  }

  private async handleHello(ws: WebSocket, data: Record<string, unknown>): Promise<void> {
    if (!this.room.initialized) {
      this.send(ws, { type: "ERROR", code: "not_found" });
      ws.close(4404, "not_found");
      return;
    }

    if (data.role === "presenter") {
      if (typeof data.presenterToken !== "string" || data.presenterToken !== this.room.presenterToken) {
        this.send(ws, { type: "ERROR", code: "forbidden" });
        ws.close(4403, "forbidden");
        return;
      }
      this.setMeta(ws, { role: "presenter", participantId: "presenter", following: false });
      this.room.lastPresenterSeenAt = Date.now();
      await this.persist();
      const c = this.counts();
      this.send(ws, {
        type: "SNAPSHOT",
        state: this.room.state,
        ended: false,
        ...c,
      });
      this.broadcastCounts();
      return;
    }

    if (data.role === "audience") {
      const participantId =
        typeof data.participantId === "string" && data.participantId.length >= 8
          ? data.participantId.slice(0, 64)
          : randomToken(16);
      this.setMeta(ws, { role: "audience", participantId, following: false });
      const c = this.counts();
      this.send(ws, {
        type: "SNAPSHOT",
        state: this.room.state,
        ended: false,
        participantId,
        ...c,
      });
      this.broadcastCounts();
      return;
    }

    this.send(ws, { type: "ERROR", code: "bad_hello" });
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.load();
    const meta = this.meta(ws);
    if (meta?.role === "presenter") {
      this.room.lastPresenterSeenAt = Date.now();
      await this.persist();
      this.scheduleAlarm();
    }
    this.broadcastCounts();
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }
}

function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

function allowStart(request: Request): boolean {
  const key = clientIp(request);
  const now = Date.now();
  const bucket = startBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    startBuckets.set(key, { count: 1, resetAt: now + START_WINDOW_MS });
    return true;
  }
  if (bucket.count >= START_RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

export async function handlePresentStart(
  request: Request,
  env: PresentationEnv,
  json: (data: unknown, status: number) => Response
): Promise<Response> {
  if (!allowStart(request)) {
    return json({ error: "rate_limited" }, 429);
  }
  const sessionId = randomSessionId(8);
  const presenterToken = randomToken(24);
  const stub = env.PRESENTATION.get(env.PRESENTATION.idFromName(sessionId));
  const initRes = await stub.fetch("https://presentation/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presenterToken }),
  });
  if (!initRes.ok) {
    return json({ error: "init_failed" }, 500);
  }
  return json({ sessionId, presenterToken }, 200);
}

export async function handlePresentWs(
  request: Request,
  env: PresentationEnv,
  json: (data: unknown, status: number) => Response
): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = (url.searchParams.get("session") || "").toUpperCase();
  if (!isValidSessionId(sessionId)) {
    return json({ error: "bad_session" }, 400);
  }
  if (request.headers.get("Upgrade") !== "websocket") {
    return json({ error: "upgrade_required" }, 426);
  }
  const stub = env.PRESENTATION.get(env.PRESENTATION.idFromName(sessionId));
  return stub.fetch(new Request("https://presentation/ws", request));
}
