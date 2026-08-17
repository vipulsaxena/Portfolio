#!/usr/bin/env node
/**
 * Smoke test: POST /api/chat/complete — Workers AI must return a live reply
 */
const API =
  process.env.API_BASE_URL ||
  "https://portfolio-chat.vipul-saxena01.workers.dev";
const ORIGIN = process.env.ORIGIN || "https://vipulsaxena.com";

async function main() {
  console.log("=== Workers AI complete test ===");
  console.log("API:", API);

  const res = await fetch(`${API}/api/chat/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
    },
    body: JSON.stringify({
      message: "What is your design approach? Answer in 2 sentences.",
      unlocked: false,
      history: [],
    }),
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON response");
  }

  if (!data.reply || data.fallback === true) {
    throw new Error(
      "Workers AI did not return a live reply. Check wrangler [ai] binding and Cloudflare Workers AI dashboard."
    );
  }

  console.log("\nPASS: reply length", data.reply.length);
  console.log("Preview:", data.reply.slice(0, 200));
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
