window.VIPUL_CHAT_CONFIG = {
  // Replace after `wrangler deploy` — see worker/README.md
  API_BASE_URL: "https://portfolio-chat.vipul-saxena01.workers.dev",
  SESSION_KEY: "vipulChatSessionId",
  UNLOCK_KEY: "portfolioChatUnlocked",
  GATE_KEYS: [
    "raisinAccessGranted",
    "olxAccessGranted",
    "n26AccessGranted",
    "gomartAccessGranted",
  ],
};
