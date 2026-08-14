(function (global) {
  "use strict";

  var CONFIG = global.VIPUL_CHAT_CONFIG || {};
  var KNOWLEDGE = global.VipulChatKnowledge;

  var STATE = {
    IDLE: "idle",
    COLLECT_EMAIL: "collect_email",
    COLLECT_INTENT: "collect_intent",
    AWAIT_PASSWORD: "await_password",
    UNLOCKED: "unlocked",
  };

  var currentState = STATE.IDLE;
  var sessionId = null;
  var pendingEmail = "";
  var isOpen = false;
  var isResponding = false;
  var lastBotChunkId = null;
  var recentHistory = [];
  var wrapEl = null;
  var els = {};

  function getSessionId() {
    try {
      var stored = localStorage.getItem(CONFIG.SESSION_KEY);
      if (stored) return stored;
    } catch (e) {}
    return null;
  }

  function setSessionId(id) {
    sessionId = id;
    try { localStorage.setItem(CONFIG.SESSION_KEY, id); } catch (e) {}
  }

  function isUnlocked() {
    try {
      if (sessionStorage.getItem(CONFIG.UNLOCK_KEY) === "1") return true;
    } catch (e) {}
    return false;
  }

  function grantUnlock() {
    try {
      sessionStorage.setItem(CONFIG.UNLOCK_KEY, "1");
      (CONFIG.GATE_KEYS || []).forEach(function (key) {
        sessionStorage.setItem(key, "1");
      });
    } catch (e) {}
    currentState = STATE.UNLOCKED;
    syncPatchSession({ unlocked_at: new Date().toISOString() });
  }

  function apiUrl(path) {
    return (CONFIG.API_BASE_URL || "").replace(/\/$/, "") + path;
  }

  function apiFetch(path, options) {
    var base = CONFIG.API_BASE_URL;
    if (!base || base.indexOf("REPLACE") !== -1) {
      return Promise.resolve(null);
    }
    return fetch(apiUrl(path), options).catch(function (err) {
      console.warn("[vipul-chat] API request failed:", path, err);
      return null;
    });
  }

  var sessionEnsurePromise = null;

  function ensureSession() {
    if (sessionId) return Promise.resolve(sessionId);

    var stored = getSessionId();
    if (stored) {
      sessionId = stored;
      return Promise.resolve(sessionId);
    }

    if (sessionEnsurePromise) return sessionEnsurePromise;

    sessionEnsurePromise = apiFetch("/api/chat/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: getPageName() }),
    })
      .then(function (res) {
        if (!res || !res.ok) {
          var fallbackId = crypto.randomUUID();
          setSessionId(fallbackId);
          return fallbackId;
        }
        return res.json().then(function (data) {
          setSessionId(data.sessionId);
          return data.sessionId;
        });
      })
      .catch(function () {
        sessionEnsurePromise = null;
        var fallbackId = crypto.randomUUID();
        setSessionId(fallbackId);
        return fallbackId;
      });

    return sessionEnsurePromise;
  }

  function syncMessage(role, content, tags) {
    return ensureSession().then(function () {
      return apiFetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          role: role,
          content: content,
          tags: tags || [],
          page: getPageName(),
        }),
      });
    }).then(function (res) {
      if (!res || !res.ok) {
        console.warn("[vipul-chat] message sync failed:", role, res && res.status);
        return false;
      }
      return true;
    });
  }

  function syncPatchSession(patch) {
    return ensureSession().then(function () {
      return apiFetch("/api/chat/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({ sessionId: sessionId, page: getPageName() }, patch)),
      });
    }).then(function (res) {
      if (!res || !res.ok) {
        console.warn("[vipul-chat] session patch failed:", res && res.status);
        return false;
      }
      return true;
    });
  }

  function getPageName() {
    var p = global.location.pathname.split("/").pop();
    return p || "index.html";
  }

  function scrollMessages() {
    if (els.messages) els.messages.scrollTop = els.messages.scrollHeight;
  }

  function pushHistory(role, content) {
    recentHistory.push({ role: role, content: content });
    if (recentHistory.length > 12) recentHistory = recentHistory.slice(-12);
  }

  function addMessage(role, text) {
    if (!els.messages) return;
    var div = document.createElement("div");
    div.className = "vipul-chat-msg vipul-chat-msg--" + role;
    div.textContent = text;
    els.messages.appendChild(div);
    scrollMessages();
    if (role === "user" || role === "bot") {
      pushHistory(role, text);
      syncMessage(role, text);
    }
  }

  function clearActiveChips() {
    if (!els.messages) return;
    var turns = els.messages.querySelectorAll(".vipul-chat-turn");
    if (!turns.length) return;
    var last = turns[turns.length - 1];
    var chips = last.querySelector(".vipul-chat-chips");
    if (chips) chips.remove();
  }

  function addBotTurn(text, chips) {
    if (!els.messages) return;
    var turn = document.createElement("div");
    turn.className = "vipul-chat-turn";
    var msg = document.createElement("div");
    msg.className = "vipul-chat-msg vipul-chat-msg--bot";
    msg.textContent = text;
    turn.appendChild(msg);

    if (chips && chips.length) {
      var row = document.createElement("div");
      row.className = "vipul-chat-chips";
      chips.forEach(function (label) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "vipul-chat-chip";
        btn.textContent = label;
        btn.addEventListener("click", function () {
          handleUserInput(label);
        });
        row.appendChild(btn);
      });
      turn.appendChild(row);
    }

    els.messages.appendChild(turn);
    scrollMessages();
    pushHistory("bot", text);
    syncMessage("bot", text);
  }

  function setChips(chips) {
    clearActiveChips();
    if (!els.messages || !chips || !chips.length) return;
    var turns = els.messages.querySelectorAll(".vipul-chat-turn");
    var turn = turns.length ? turns[turns.length - 1] : null;
    if (!turn) return;

    var row = document.createElement("div");
    row.className = "vipul-chat-chips";
    chips.forEach(function (label) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vipul-chat-chip";
      btn.textContent = label;
      btn.addEventListener("click", function () {
        handleUserInput(label);
      });
      row.appendChild(btn);
    });
    turn.appendChild(row);
    scrollMessages();
  }

  function hideChips() {
    clearActiveChips();
  }

  function setInputEnabled(enabled) {
    if (els.input) els.input.disabled = !enabled;
    if (els.send) els.send.disabled = !enabled;
    if (els.messages) {
      els.messages.querySelectorAll(".vipul-chat-chip").forEach(function (btn) {
        btn.disabled = !enabled;
      });
    }
  }

  function showTyping() {
    if (!els.messages || els.typingEl) return;
    var div = document.createElement("div");
    div.className = "vipul-chat-typing";
    div.setAttribute("aria-hidden", "true");
    div.innerHTML = "<span></span><span></span><span></span>";
    els.messages.appendChild(div);
    els.typingEl = div;
    scrollMessages();
  }

  function hideTyping() {
    if (els.typingEl) {
      els.typingEl.remove();
      els.typingEl = null;
    }
  }

  function randomDelay() {
    return 1000 + Math.floor(Math.random() * 3000);
  }

  function deliverBotResponse(getResponse) {
    if (isResponding) return Promise.resolve();
    isResponding = true;
    setInputEnabled(false);
    showTyping();

    var delayP = new Promise(function (resolve) {
      setTimeout(resolve, randomDelay());
    });

    return Promise.all([delayP, Promise.resolve(getResponse())])
      .then(function (results) { return results[1]; })
      .then(function (payload) {
        hideTyping();
        if (!payload || !payload.text) return;
        if (payload.chunkId) lastBotChunkId = payload.chunkId;
        addBotTurn(payload.text, payload.chips && payload.chips.length ? payload.chips : null);
      })
      .finally(function () {
        isResponding = false;
        setInputEnabled(true);
        if (els.input && isOpen) els.input.focus();
      });
  }

  function botSay(text, chips, chunkId) {
    return deliverBotResponse(function () {
      return { text: text, chips: chips, chunkId: chunkId || null };
    });
  }

  function fetchAIComplete(query) {
    return apiFetch("/api/chat/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: query,
        unlocked: isUnlocked() || currentState === STATE.UNLOCKED,
        history: recentHistory.slice(-6),
      }),
    }).then(function (res) {
      if (!res || !res.ok) return null;
      return res.json().then(function (data) {
        if (data && data.reply && !data.fallback) return data.reply;
        return null;
      });
    });
  }

  function startContactFlow(prefill) {
    currentState = STATE.COLLECT_EMAIL;
    botSay(prefill || "Happy to connect — what's your email?", []);
  }

  function startPasswordFlow() {
    currentState = STATE.AWAIT_PASSWORD;
    botSay(
      "Enter the portfolio password here to unlock recent case studies and deeper answers. Don't have it? Say \"request access\" and I'll take your details.",
      ["Request access"]
    );
  }

  function getPublicTeaser(companyId) {
    var publicId = KNOWLEDGE.getPublicChunkId(companyId);
    return KNOWLEDGE.CHUNKS[publicId] || KNOWLEDGE.CHUNKS.raisin_public;
  }

  function answerImpact(query, unlocked) {
    var company = KNOWLEDGE.getCompanyFromQuery(query);
    if (company) {
      var impactId = KNOWLEDGE.getImpactChunkId(company);
      if (unlocked && KNOWLEDGE.CHUNKS[impactId]) {
        botSay(KNOWLEDGE.CHUNKS[impactId], null, impactId);
        return;
      }
      if (!unlocked) {
        botSay(
          getPublicTeaser(company) +
            " I can share more on impact and metrics in the full case study — enter the portfolio password or request access.",
          ["Enter password", "Request access"],
          KNOWLEDGE.getPublicChunkId(company)
        );
        return;
      }
    }

    deliverBotResponse(function () {
      return fetchAIComplete(query).then(function (aiReply) {
        if (aiReply) return { text: aiReply };
        return {
          text:
            "Impact varied by project — at Raisin it was coherence across 12 markets and enablement; at OLX monetisation lift at 317M+ user scale; at N26 clarity across 25 markets. Happy to go deeper on any of these.",
          chips: ["Tell me about Raisin", "OLX monetisation work"],
        };
      });
    });
  }

  function completeContactFlow(intentText) {
    var email = pendingEmail;
    syncPatchSession({ email: email, intent: intentText });
    pendingEmail = "";
    currentState = isUnlocked() ? STATE.UNLOCKED : STATE.IDLE;

    var reply;
    var chips = null;

    if (/\b(hiring|recruit|recruiter|interview|role|position|job)\b/i.test(intentText)) {
      reply = "Thanks — I'll follow up at " + email + " about hiring.";
    } else if (/\b(freelance|contract|consult|founder|startup)\b/i.test(intentText)) {
      reply = "Thanks — I'll follow up at " + email + " about working together.";
    } else if (/\b(mentor|mentorship|adplist|portfolio review)\b/i.test(intentText)) {
      reply =
        "Thanks — I'll follow up at " + email + ". You can also book a session on ADPList from my homepage.";
    } else if (/\b(password|access|case stud)/i.test(intentText)) {
      reply = "Thanks — I'll follow up at " + email + " with portfolio access details.";
    } else {
      reply = "Thanks — I'll reply at " + email + " soon.";
    }

    if (!isUnlocked()) {
      reply += " If you'd like case study access before we connect, you can enter the portfolio password anytime.";
      chips = ["Enter password"];
    }

    botSay(reply, chips);
  }

  function handleDeflectPrivate() {
    botSay(
      "I don't share that here — happy to discuss directly. Want to leave your email and what this is about?",
      ["Yes, get in touch"]
    );
  }

  function answerFromIntent(intent, query) {
    var unlocked = isUnlocked() || currentState === STATE.UNLOCKED;

    if (intent.action === "request_access" || intent.action === "collect_contact") {
      startContactFlow(
        intent.action === "request_access"
          ? "I can share portfolio access — what's your email?"
          : undefined
      );
      return;
    }

    if (intent.action === "deflect_private") {
      handleDeflectPrivate();
      return;
    }

    if (intent.action === "impact_answer") {
      answerImpact(query, unlocked);
      return;
    }

    if (intent.locked) {
      var companyId = intent.chunkId;
      var wantsImpact = KNOWLEDGE.wantsImpactMetrics(query);
      var wantsDepth = KNOWLEDGE.wantsCaseStudyDepth(query);
      var isOverview = KNOWLEDGE.isOverviewQuestion(query);

      if (wantsImpact) {
        answerImpact(query, unlocked);
        return;
      }

      if (!unlocked && (isOverview || !wantsDepth)) {
        var chips = ["Go deeper on " + companyId.charAt(0).toUpperCase() + companyId.slice(1)];
        if (!isOverview) chips.push("Enter password");
        botSay(getPublicTeaser(companyId), chips, KNOWLEDGE.getPublicChunkId(companyId));
        return;
      }

      if (!unlocked) {
        botSay(
          getPublicTeaser(companyId) +
            " The full case study has more process and detail — enter the portfolio password to go deeper, or request access.",
          ["Enter password", "Request access"],
          KNOWLEDGE.getPublicChunkId(companyId)
        );
        return;
      }
    }

    if (intent.answer) {
      botSay(intent.answer, null, intent.id);
      return;
    }

    if (intent.chunkId && KNOWLEDGE.CHUNKS[intent.chunkId]) {
      if (unlocked && KNOWLEDGE.wantsImpactMetrics(query)) {
        var impactId = KNOWLEDGE.getImpactChunkId(intent.chunkId);
        if (KNOWLEDGE.CHUNKS[impactId]) {
          botSay(KNOWLEDGE.CHUNKS[impactId], null, impactId);
          return;
        }
      }
      botSay(KNOWLEDGE.CHUNKS[intent.chunkId], null, intent.chunkId);
      return;
    }

    fallbackAnswer(query);
  }

  function fallbackAnswer(query) {
    var unlocked = isUnlocked() || currentState === STATE.UNLOCKED;

    if (KNOWLEDGE.wantsImpactMetrics(query)) {
      answerImpact(query, unlocked);
      return;
    }

    var results = KNOWLEDGE.searchChunks(query, unlocked, lastBotChunkId);

    if (results.length && results[0].score >= 2) {
      botSay(results[0].text, null, results[0].id);
      return;
    }

    if (unlocked) {
      deliverBotResponse(function () {
        return fetchAIComplete(query).then(function (aiReply) {
          if (aiReply) return { text: aiReply };
          if (results.length) return { text: results[0].text, chunkId: results[0].id };
          return {
            text:
              "I'm not sure I have a sharp answer for that on the site — try asking about my work at Raisin, OLX, N26, Gojek, mentoring, or how to get in touch.",
            chips: KNOWLEDGE.SUGGESTED_CHIPS.slice(0, 3),
          };
        });
      });
      return;
    }

    deliverBotResponse(function () {
      return fetchAIComplete(query).then(function (aiReply) {
        if (aiReply) return { text: aiReply };

        if (results.length) {
          return { text: results[0].text, chunkId: results[0].id };
        }

        return {
          text:
            "I'm not sure I have a sharp answer for that on the site — try asking about my work at Raisin, OLX, N26, Gojek, mentoring, or how to get in touch.",
          chips: KNOWLEDGE.SUGGESTED_CHIPS.slice(0, 3),
        };
      });
    });
  }

  function looksLikePassword(text) {
    var t = text.trim();
    return (
      !/\?/.test(t) &&
      t.length >= 8 &&
      t.length <= 48 &&
      t.split(/\s+/).length === 1 &&
      !isEmail(t) &&
      /^[\w@#$%^&*!\-_.]+$/.test(t)
    );
  }

  function attemptPasswordIfApplicable(text) {
    if (isUnlocked()) return false;
    if (currentState === STATE.COLLECT_EMAIL || currentState === STATE.COLLECT_INTENT) {
      return false;
    }
    if (/^(request access|enter password|yes, get in touch)$/i.test(text)) return false;

    var inAwait = currentState === STATE.AWAIT_PASSWORD;
    if (!inAwait && !looksLikePassword(text)) return false;

    tryPassword(text);
    return true;
  }

  function tryPassword(input) {
    deliverBotResponse(function () {
      var gate = global.PortfolioGate;
      if (!gate || !gate.verify) {
        return {
          text: "Password check isn't available in this browser context. Open the case study page to enter it there.",
        };
      }
      return gate.verify(input.trim()).then(function (ok) {
        if (ok) {
          grantUnlock();
          return {
            text:
              "You're in — ask me anything about Raisin, OLX, N26, or GoMart. Case study pages are unlocked for this session too.",
            chips: ["Tell me about Raisin", "OLX monetisation work"],
          };
        }
        currentState = STATE.AWAIT_PASSWORD;
        return {
          text: "That didn't match. Try again, or request access and I'll follow up.",
          chips: ["Request access"],
        };
      }).catch(function () {
        currentState = STATE.AWAIT_PASSWORD;
        return {
          text: "I couldn't verify that here — try again on https://vipulsaxena.com, or request access.",
          chips: ["Request access"],
        };
      });
    });
  }

  function isEmail(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
  }

  function handleUserInput(raw) {
    var text = (raw || "").trim();
    if (!text || isResponding) return;

    hideChips();
    addMessage("user", text);

    if (/^request access$/i.test(text)) {
      startContactFlow("I can share portfolio access — what's your email?");
      return;
    }

    if (/^enter password$/i.test(text)) {
      startPasswordFlow();
      return;
    }

    if (/^yes, get in touch$/i.test(text)) {
      startContactFlow();
      return;
    }

    if (currentState === STATE.COLLECT_EMAIL) {
      if (!isEmail(text)) {
        botSay("That doesn't look like an email — mind trying again?");
        return;
      }
      pendingEmail = text;
      currentState = STATE.COLLECT_INTENT;
      botSay("So, what is it about that you'd like to get in touch?");
      return;
    }

    if (currentState === STATE.COLLECT_INTENT) {
      completeContactFlow(text);
      return;
    }

    if (attemptPasswordIfApplicable(text)) return;

    if (isUnlocked()) currentState = STATE.UNLOCKED;

    var intent = KNOWLEDGE.matchIntent(text);
    if (intent) {
      answerFromIntent(intent, text);
      return;
    }

    fallbackAnswer(text);
  }

  function buildWidget(wrap) {
    wrapEl = wrap;
    wrap.innerHTML =
      '<div class="gfq-panel" id="vipul-chat-panel">' +
      '  <div class="vipul-chat-panel">' +
      '    <div class="vipul-chat-header">' +
      '      <div><p class="vipul-chat-header__title">Chat with Vipul <span class="vipul-chat-beta">Beta</span></p>' +
      '      <p class="vipul-chat-header__sub">Ask about my work, background, or getting in touch</p></div>' +
      '      <button type="button" class="vipul-chat-close" aria-label="Close chat">&times;</button>' +
      "    </div>" +
      '    <div class="vipul-chat-messages" role="log" aria-live="polite" aria-label="Chat messages"></div>' +
      '    <form class="vipul-chat-form">' +
      '      <input class="vipul-chat-input" type="text" placeholder="Type a message…" autocomplete="off" aria-label="Message" />' +
      '      <button type="submit" class="vipul-chat-send">Send</button>' +
      "    </form>" +
      "  </div>" +
      "</div>" +
      '<button type="button" class="gfq-badge vipul-chat-badge" aria-label="Chat with Vipul" aria-expanded="false">' +
      '  <img src="images/chat-icon.svg" alt="" width="26" height="26" />' +
      "</button>";

    els.panel = wrap.querySelector("#vipul-chat-panel");
    els.messages = wrap.querySelector(".vipul-chat-messages");
    els.form = wrap.querySelector(".vipul-chat-form");
    els.input = wrap.querySelector(".vipul-chat-input");
    els.send = wrap.querySelector(".vipul-chat-send");
    els.badge = wrap.querySelector(".gfq-badge");
    els.close = wrap.querySelector(".vipul-chat-close");

    els.badge.addEventListener("click", function () { toggle(); });
    els.close.addEventListener("click", function () { toggle(false); });
    els.form.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = els.input.value;
      els.input.value = "";
      handleUserInput(val);
    });

    if (isUnlocked()) currentState = STATE.UNLOCKED;
  }

  function toggle(open) {
    if (!els.panel) return;
    isOpen = open !== undefined ? open : !isOpen;
    els.panel.classList.toggle("panel-active", isOpen);
    if (wrapEl) wrapEl.classList.toggle("is-open", isOpen);
    if (els.badge) els.badge.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (isOpen) {
      ensureSession();
      if (els.messages && !els.messages.childElementCount) {
        botSay(
          "Hey — I'm Vipul. Ask me about my work, how I got to Berlin, case studies, or how to get in touch.",
          KNOWLEDGE.SUGGESTED_CHIPS
        );
      }
      if (els.input) els.input.focus();
    }
  }

  function open(opts) {
    opts = opts || {};
    toggle(true);
    if (opts.intent === "password" || opts.intent === "request_access") {
      setTimeout(function () {
        if (opts.intent === "password") startPasswordFlow();
        else startContactFlow("I can share portfolio access — what's your email?");
      }, 300);
    } else if (opts.intent === "contact") {
      setTimeout(function () { startContactFlow(); }, 300);
    } else if (opts.prefill) {
      setTimeout(function () { handleUserInput(opts.prefill); }, 300);
    }
  }

  function init() {
    if (!KNOWLEDGE) return;

    var wraps = document.querySelectorAll(".gfq-wrap");
    if (!wraps.length) return;

    wraps.forEach(function (wrap) {
      buildWidget(wrap);
    });

    sessionId = getSessionId();
    ensureSession();

    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("#footer-contact-trigger, [data-chat-open]");
      if (trigger) {
        e.preventDefault();
        open({ intent: trigger.getAttribute("data-chat-intent") || "contact" });
      }
    });

    document.querySelectorAll("[data-pw-request]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        open({ intent: "request_access" });
      });
    });
  }

  global.VipulChat = { open: open, toggle: toggle, init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
