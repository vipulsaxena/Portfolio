#!/usr/bin/env node
/**
 * Integration test: one session, full message thread, admin retrieval
 */
const API = process.env.API_BASE_URL || "https://portfolio-chat.vipul-saxena01.workers.dev";
const ORIGIN = process.env.ORIGIN || "https://vipulsaxena.com";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "vipulknows26";

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${options.method || "GET"} ${path} -> ${res.status}: ${text}`);
  }
  return data;
}

async function main() {
  console.log("=== Chat sync integration test ===");
  console.log("API:", API);

  const { sessionId } = await request("/api/chat/session", {
    method: "POST",
    body: JSON.stringify({ page: "test-chat-sync.html" }),
  });
  console.log("Session:", sessionId);

  const thread = [
    ["bot", "Hey — I'm Vipul. Ask me about my work."],
    ["user", "What are you working on at Raisin?"],
    ["bot", "At Raisin I'm simplifying wealth management across EU, UK, and US."],
    ["user", "portfolio26"],
    ["bot", "You're in — ask me anything about Raisin, OLX, N26, or GoMart."],
    ["user", "what was the impact at Raisin?"],
    ["bot", "Wealth Hub MVP across 12 markets plus design enablement."],
    ["user", "email@test.com"],
    ["bot", "So, what is it about that you'd like to get in touch?"],
    ["user", "I'd like to discuss hiring"],
  ];

  for (const [role, content] of thread) {
    await request("/api/chat/message", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        role,
        content,
        page: "test-chat-sync.html",
      }),
    });
  }
  console.log(`Posted ${thread.length} messages`);

  // Long-thread test: session rate limit must not block full conversations
  for (let i = 0; i < 40; i++) {
    try {
      await request("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          role: i % 2 === 0 ? "user" : "bot",
          content: `Long thread message ${i + 1}`,
          page: "test-chat-sync.html",
        }),
      });
    } catch (err) {
      throw new Error(`long-thread failed at ${i + 1} (total ${thread.length + i + 1}): ${err.message}`);
    }
  }
  const expectedTotal = thread.length + 40;
  console.log(`Posted ${expectedTotal} messages total (including long-thread test)`);

  await request("/api/chat/session", {
    method: "PATCH",
    body: JSON.stringify({
      sessionId,
      email: "email@test.com",
      intent: "hiring discussion",
      unlocked_at: new Date().toISOString(),
      page: "test-chat-sync.html",
    }),
  });
  console.log("Patched session with email + unlock");

  const { token } = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password: ADMIN_PASS }),
  });
  console.log("Admin token obtained");

  const detail = await request(`/api/admin/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const messages = detail.messages || [];
  const userCount = messages.filter((m) => m.role === "user").length;
  const botCount = messages.filter((m) => m.role === "bot").length;
  const email = detail.session?.email;

  console.log("\nResults:");
  console.log("  Total messages in admin:", messages.length);
  console.log("  User messages:", userCount);
  console.log("  Bot messages:", botCount);
  console.log("  Session email:", email);

  if (messages.length < expectedTotal) {
    throw new Error(`Expected >= ${expectedTotal} messages, got ${messages.length}`);
  }
  if (userCount < 4) {
    throw new Error(`Expected >= 4 user messages, got ${userCount}`);
  }
  if (email !== "email@test.com") {
    throw new Error(`Email not saved: ${email}`);
  }

  // Simulate parallel ensureSession — only one session ID should be used
  const parallel = await Promise.all([
    request("/api/chat/session", { method: "POST", body: JSON.stringify({ page: "parallel-test.html" }) }),
    request("/api/chat/session", { method: "POST", body: JSON.stringify({ page: "parallel-test.html" }) }),
    request("/api/chat/session", { method: "POST", body: JSON.stringify({ page: "parallel-test.html" }) }),
  ]);
  const parallelIds = parallel.map((r) => r.sessionId);
  const uniqueParallel = new Set(parallelIds);
  console.log("\nParallel session POST (old client bug):", parallelIds.length, "requests,", uniqueParallel.size, "unique IDs");
  if (uniqueParallel.size !== 3) {
    console.log("  Note: server creates new ID per POST — client must dedupe (sessionEnsurePromise)");
  }

  console.log("\nPASS: full thread persisted and retrievable via admin API");
  console.log("Session ID for manual check:", sessionId);
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
