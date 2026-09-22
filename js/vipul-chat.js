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

  var GREETED_KEY = "vipulChatGreeted";
  var TRANSCRIPT_KEY = "vipulChatTranscript";
  var TOPIC_KEY = "vipulChatTopicCompany";
  var LAST_CHUNK_KEY = "vipulChatLastChunk";
  var CAPTURED_EMAIL_KEY = "vipulChatCapturedEmail";
  var LAST_USER_QUESTION_KEY = "vipulChatLastQuestion";

  var currentState = STATE.IDLE;
  var sessionId = null;
  var pendingEmail = "";
  var isOpen = false;
  var isResponding = false;
  var speakQueue = [];
  var lastBotChunkId = null;
  var topicCompany = null;
  var recentHistory = [];
  var wrapEl = null;
  var els = {};
  var restoringTranscript = false;
  var pendingLockedCompany = null;
  var pendingLockedFromRequest = false;
  var accessRequestActive = false;
  var accessRequestCompany = null;

  function storageGet(key, useLocal) {
    try {
      return (useLocal ? localStorage : sessionStorage).getItem(key);
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, value, useLocal) {
    try {
      (useLocal ? localStorage : sessionStorage).setItem(key, value);
    } catch (e) {}
  }

  function storageRemove(key, useLocal) {
    try {
      (useLocal ? localStorage : sessionStorage).removeItem(key);
    } catch (e) {}
  }

  function getSessionId() {
    return storageGet(CONFIG.SESSION_KEY, true);
  }

  function setSessionId(id) {
    sessionId = id;
    storageSet(CONFIG.SESSION_KEY, id, true);
  }

  function isUnlocked() {
    return (
      storageGet(CONFIG.UNLOCK_KEY, false) === "1" ||
      storageGet(CONFIG.UNLOCK_KEY, true) === "1"
    );
  }

  function grantUnlock() {
    storageSet(CONFIG.UNLOCK_KEY, "1", false);
    storageSet(CONFIG.UNLOCK_KEY, "1", true);
    currentState = STATE.UNLOCKED;
    syncPatchSession({ unlocked_at: new Date().toISOString() });
  }

  function getCapturedEmail() {
    return storageGet(CAPTURED_EMAIL_KEY, false);
  }

  function setCapturedEmail(email) {
    storageSet(CAPTURED_EMAIL_KEY, email, false);
  }

  function loadTopicState() {
    topicCompany = storageGet(TOPIC_KEY, false);
    lastBotChunkId = storageGet(LAST_CHUNK_KEY, false);
  }

  function resetTopicState() {
    topicCompany = null;
    lastBotChunkId = null;
    storageRemove(TOPIC_KEY, false);
    storageRemove(LAST_CHUNK_KEY, false);
  }

  function setTopicFromChunkId(chunkId) {
    if (!chunkId) return;
    lastBotChunkId = chunkId;
    storageSet(LAST_CHUNK_KEY, chunkId, false);
    var company = KNOWLEDGE.getCompanyFromChunkId(chunkId);
    if (company) {
      topicCompany = company;
      storageSet(TOPIC_KEY, company, false);
    }
  }

  function saveTranscript() {
    if (!els.messages || restoringTranscript) return;
    var items = [];
    els.messages.querySelectorAll(".vipul-chat-msg").forEach(function (node) {
      var role = "bot";
      if (node.classList.contains("vipul-chat-msg--user")) role = "user";
      items.push({ role: role, text: node.textContent || "" });
    });
    try {
      sessionStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(items));
    } catch (e) {}
  }

  function restoreTranscript() {
    if (!els.messages) return;
    var raw;
    try {
      raw = sessionStorage.getItem(TRANSCRIPT_KEY);
    } catch (e) {
      return;
    }
    if (!raw) return;

    var items;
    try {
      items = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!items.length) return;

    restoringTranscript = true;
    els.messages.innerHTML = "";
    recentHistory = [];
    items.forEach(function (item) {
      if (item.role === "user") {
        var userDiv = document.createElement("div");
        userDiv.className = "vipul-chat-msg vipul-chat-msg--user";
        userDiv.textContent = item.text;
        els.messages.appendChild(userDiv);
        pushHistory("user", item.text, true);
      } else {
        var turn = document.createElement("div");
        turn.className = "vipul-chat-turn";
        var msg = document.createElement("div");
        msg.className = "vipul-chat-msg vipul-chat-msg--bot";
        msg.textContent = item.text;
        turn.appendChild(msg);
        els.messages.appendChild(turn);
        pushHistory("bot", item.text, true);
      }
    });
    restoringTranscript = false;
    scrollMessages();
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

  var sessionCommitted = false;

  function allocSessionId() {
    if (sessionId) return sessionId;
    var stored = getSessionId();
    if (stored) {
      sessionId = stored;
      return sessionId;
    }
    var id = crypto.randomUUID();
    setSessionId(id);
    return id;
  }

  function markSessionCommitted() {
    sessionCommitted = true;
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function isRetryableSyncResponse(res) {
    if (!res) return true;
    var status = res.status;
    return status === 429 || status >= 500;
  }

  function syncMessage(role, content, tags, attempt) {
    if (restoringTranscript) return Promise.resolve(true);
    if (role !== "user" && !sessionCommitted) return Promise.resolve(true);
    attempt = attempt || 0;
    allocSessionId();
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
    }).then(function (res) {
      if (res && res.ok) {
        if (role === "user" && String(content).trim()) markSessionCommitted();
        return true;
      }
      if (isRetryableSyncResponse(res) && attempt < 4) {
        return delay(Math.min(1000 * Math.pow(2, attempt), 8000)).then(function () {
          return syncMessage(role, content, tags, attempt + 1);
        });
      }
      console.warn("[vipul-chat] message sync failed:", role, res && res.status);
      return false;
    });
  }

  function syncPatchSession(patch, attempt) {
    attempt = attempt || 0;
    allocSessionId();
    return apiFetch("/api/chat/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ sessionId: sessionId, page: getPageName() }, patch)),
    }).then(function (res) {
      if (res && res.ok) {
        markSessionCommitted();
        return true;
      }
      if (isRetryableSyncResponse(res) && attempt < 4) {
        return delay(Math.min(1000 * Math.pow(2, attempt), 8000)).then(function () {
          return syncPatchSession(patch, attempt + 1);
        });
      }
      console.warn("[vipul-chat] session patch failed:", res && res.status);
      return false;
    });
  }

  function getPageName() {
    var p = global.location.pathname.split("/").pop();
    return p || "index.html";
  }

  function scrollMessages() {
    if (els.messages) els.messages.scrollTop = els.messages.scrollHeight;
  }

  function pushHistory(role, content, skipStore) {
    recentHistory.push({ role: role, content: content });
    if (recentHistory.length > 12) recentHistory = recentHistory.slice(-12);
    if (role === "user" && !skipStore && !KNOWLEDGE.isFrustration(content)) {
      storageSet(LAST_USER_QUESTION_KEY, content, false);
    }
  }

  function getLastUserQuestion() {
    return storageGet(LAST_USER_QUESTION_KEY, false) || "";
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
    saveTranscript();
  }

  function clearActiveChips() {
    if (!els.messages) return;
    els.messages.querySelectorAll(".vipul-chat-chips").forEach(function (node) {
      node.remove();
    });
  }

  function addBotTurn(text, chips, chunkId) {
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
    if (chunkId) setTopicFromChunkId(chunkId);
    syncMessage("bot", text);
    saveTranscript();
  }

  function hideChips() {
    clearActiveChips();
  }

  function setSendEnabled(enabled) {
    if (els.send) els.send.disabled = !enabled;
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
    return 1000 + Math.floor(Math.random() * 2000);
  }

  function deliverBotResponse(getResponse) {
    if (isResponding) {
      return new Promise(function (resolve) {
        speakQueue.push(function () {
          deliverBotResponse(getResponse).then(resolve, resolve);
        });
      });
    }
    isResponding = true;
    setSendEnabled(false);
    showTyping();

    var delayP = new Promise(function (resolve) {
      setTimeout(resolve, randomDelay());
    });

    return Promise.all([delayP, Promise.resolve(getResponse())])
      .then(function (results) { return results[1]; })
      .then(function (payload) {
        hideTyping();
        if (!payload || !payload.text) return;
        addBotTurn(
          payload.text,
          payload.chips && payload.chips.length ? payload.chips : null,
          payload.chunkId || null
        );
      })
      .finally(function () {
        isResponding = false;
        setSendEnabled(true);
        if (els.input && isOpen) els.input.focus();
        if (speakQueue.length) {
          var next = speakQueue.shift();
          next();
        }
      });
  }

  function botSay(text, chips, chunkId) {
    return deliverBotResponse(function () {
      return { text: text, chips: chips, chunkId: chunkId || null };
    });
  }

  function historyForModel(query) {
    var history = recentHistory.slice(-6);
    var last = history[history.length - 1];
    if (last && last.role === "user" && last.content === query) {
      history = history.slice(0, -1);
    }
    return history;
  }

  function fetchAIComplete(query) {
    return apiFetch("/api/chat/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: query,
        unlocked: isUnlocked() || currentState === STATE.UNLOCKED,
        history: historyForModel(query),
        topicCompany: topicCompany,
      }),
    }).then(function (res) {
      if (!res || !res.ok) return null;
      return res.json().then(function (data) {
        if (data && data.reply && !data.fallback) return data.reply;
        return null;
      });
    });
  }

  function accessPurposePrompt() {
    var label = accessRequestCompany
      ? KNOWLEDGE.getCompanyLabel(accessRequestCompany)
      : "this";
    return (
      "What do you need access to the " +
      label +
      " case study for — hiring, a portfolio review, a reference, or something else?"
    );
  }

  function startAccessRequestFlow(companyId) {
    clearActiveChips();
    accessRequestActive = true;
    accessRequestCompany = companyId || topicCompany || null;
    if (accessRequestCompany) {
      topicCompany = accessRequestCompany;
      storageSet(TOPIC_KEY, accessRequestCompany, false);
    }
    var label = accessRequestCompany
      ? KNOWLEDGE.getCompanyLabel(accessRequestCompany)
      : "portfolio";
    if (getCapturedEmail()) {
      pendingEmail = getCapturedEmail();
      currentState = STATE.COLLECT_INTENT;
      botSay(
        "I already have your email (" + getCapturedEmail() + "). " + accessPurposePrompt(),
        null
      );
      return;
    }
    currentState = STATE.COLLECT_EMAIL;
    botSay("I can share access to the " + label + " case study — what's your email?", []);
  }

  function startContactFlow(prefill) {
    clearActiveChips();
    accessRequestActive = false;
    accessRequestCompany = null;
    if (getCapturedEmail()) {
      botSay(
        "I already have your email (" +
          getCapturedEmail() +
          "). Tell me what you'd like to discuss and I'll follow up. You can also enter the portfolio password anytime if you have it.",
        isUnlocked() ? null : ["Enter password"]
      );
      currentState = STATE.COLLECT_INTENT;
      pendingEmail = getCapturedEmail();
      return;
    }
    currentState = STATE.COLLECT_EMAIL;
    botSay(prefill || "Happy to connect — what's your email?", []);
  }

  function isCollectEscape(text) {
    return /^(cancel|never mind|nevermind|stop|enter password|i have the password)$/i.test(text.trim());
  }

  function startPasswordFlow() {
    clearActiveChips();
    if (isUnlocked()) {
      botSay(
        "You're already unlocked in this browser session — ask me anything about Raisin, OLX, N26, or GoMart.",
        ["Tell me about Raisin", "OLX monetisation work"]
      );
      return;
    }
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

  function handleFrustration(currentText) {
    resetTopicState();
    var named = currentText && KNOWLEDGE.getCompanyFromQuery(currentText);
    if (named) {
      processQuery(currentText, true);
      return;
    }
    botSay(
      "Sorry that missed the mark — name a project (GoPlay, Raisin, N26, OLX, GoMart) or ask about background, hobbies, or getting in touch.",
      KNOWLEDGE.SUGGESTED_CHIPS.slice(0, 3)
    );
  }

  function completeContactFlow(intentText) {
    var email = pendingEmail;
    var wasAccess = accessRequestActive;
    var companyLabel = accessRequestCompany
      ? KNOWLEDGE.getCompanyLabel(accessRequestCompany)
      : null;
    var intent =
      wasAccess && companyLabel
        ? companyLabel + " case study access — " + intentText
        : intentText;
    syncPatchSession({ email: email, intent: intent });
    setCapturedEmail(email);
    pendingEmail = "";
    accessRequestActive = false;
    accessRequestCompany = null;
    currentState = isUnlocked() ? STATE.UNLOCKED : STATE.IDLE;

    var reply = wasAccess
      ? "Thanks — I'll follow up at " + email + " with access details."
      : "Thanks — I'll reply at " + email + " soon.";
    var chips = null;

    if (!isUnlocked()) {
      reply += " You can enter the portfolio password anytime if you already have it.";
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

    if (intent.action === "request_access") {
      if (unlocked) {
        botSay(
          "You already have portfolio access in this browser session — ask me about Raisin, OLX, N26, or GoMart anytime.",
          ["Tell me about Raisin"]
        );
        return;
      }
      startAccessRequestFlow(topicCompany);
      return;
    }

    if (intent.action === "collect_contact") {
      startContactFlow();
      return;
    }

    if (intent.action === "deflect_private") {
      handleDeflectPrivate();
      return;
    }

    if (intent.id === "work_impact") {
      var impactCompany = KNOWLEDGE.getCompanyFromQuery(query) || topicCompany;
      if (impactCompany && KNOWLEDGE.isLockedProject(impactCompany)) {
        var impactChunkId = KNOWLEDGE.getImpactChunkId(impactCompany);
        if (!unlocked) {
          botSay(
            getPublicTeaser(impactCompany) +
              " Impact details are in the password-gated case study — enter the portfolio password to go deeper, or request access.",
            ["Enter password", "Request access"],
            KNOWLEDGE.getPublicChunkId(impactCompany)
          );
          return;
        }
        if (KNOWLEDGE.CHUNKS[impactChunkId]) {
          botSay(KNOWLEDGE.CHUNKS[impactChunkId], null, impactChunkId);
          return;
        }
      }
      fallbackAnswer(query);
      return;
    }

    if (intent.locked || (intent.chunkId && KNOWLEDGE.COMPANIES.indexOf(intent.chunkId) !== -1)) {
      var companyId = intent.chunkId;
      var detailId = KNOWLEDGE.pickCompanyChunkId(companyId, query, unlocked);
      if (KNOWLEDGE.isLockedProject(companyId) && !unlocked) {
        botSay(
          getPublicTeaser(companyId) +
            " The full case study is password-gated — enter the portfolio password to go deeper, or request access.",
          ["Enter password", "Request access"],
          KNOWLEDGE.getPublicChunkId(companyId)
        );
        return;
      }
      if (detailId && KNOWLEDGE.CHUNKS[detailId]) {
        botSay(KNOWLEDGE.CHUNKS[detailId], null, detailId);
        return;
      }
      botSay(KNOWLEDGE.CHUNKS[companyId], null, companyId);
      return;
    }

    if (intent.answer) {
      botSay(intent.answer, null, intent.id);
      return;
    }

    if (intent.chunkId && KNOWLEDGE.CHUNKS[intent.chunkId]) {
      botSay(KNOWLEDGE.CHUNKS[intent.chunkId], null, intent.chunkId);
      return;
    }

    fallbackAnswer(query);
  }

  function fallbackAnswer(query) {
    var unlocked = isUnlocked() || currentState === STATE.UNLOCKED;

    // 1. Primary path: Delegate to Workers AI LLM Endpoint
    deliverBotResponse(function () {
      return fetchAIComplete(query).then(function (aiReply) {
        if (aiReply) return { text: aiReply };

        // 2. Backup path: Search local static knowledge chunks if AI Endpoint fails or times out
        var results = KNOWLEDGE.searchChunks(query, unlocked, lastBotChunkId, topicCompany);
        if (results.length && results[0].score >= 1) {
          var top = results[0];
          var topCompany = KNOWLEDGE.getCompanyFromChunkId(top.id);
          var named = KNOWLEDGE.getCompanyFromQuery(query);
          var weakSticky =
            topCompany &&
            !named &&
            !KNOWLEDGE.wantsTopicFollowUp(query) &&
            top.score < 2;
          if (!weakSticky) {
            return { text: top.text, chunkId: top.id };
          }
        }

        // 3. Absolute last resort fallback
        return {
          text: "I'm not sure I have a sharp answer for that on the site — try asking about my work, case studies, or how to get in touch.",
          chips: KNOWLEDGE.SUGGESTED_CHIPS.slice(0, 3),
        };
      });
    });
  }

  function answerFromTopic(query) {
    var unlocked = isUnlocked() || currentState === STATE.UNLOCKED;
    if (!topicCompany || !KNOWLEDGE.wantsTopicFollowUp(query)) return false;
    var chunkId = KNOWLEDGE.pickCompanyChunkId(topicCompany, query, unlocked);
    if (!chunkId || !KNOWLEDGE.CHUNKS[chunkId]) return false;
    if (KNOWLEDGE.isLockedProject(topicCompany) && !unlocked) {
      botSay(
        getPublicTeaser(topicCompany) +
          " The full case study is password-gated — enter the portfolio password to go deeper, or request access.",
        ["Enter password", "Request access"],
        KNOWLEDGE.getPublicChunkId(topicCompany)
      );
      return true;
    }
    botSay(KNOWLEDGE.CHUNKS[chunkId], null, chunkId);
    return true;
  }

  function processQuery(rawText, isRetry) {
    var rawCompany = KNOWLEDGE.getCompanyFromQuery(rawText);

    if (KNOWLEDGE.shouldResetTopic(rawText) && !rawCompany) {
      resetTopicState();
    } else if (KNOWLEDGE.shouldResetTopic(rawText) && rawCompany) {
      if (
        /\b(hobb(y|ies)|free time|reading|password|hire|get in touch|all projects|list (down )?(the |your )?projects)\b/i.test(
          rawText
        )
      ) {
        resetTopicState();
      } else {
        topicCompany = rawCompany;
        storageSet(TOPIC_KEY, rawCompany, false);
      }
    } else if (rawCompany) {
      topicCompany = rawCompany;
      storageSet(TOPIC_KEY, rawCompany, false);
    }

    if (!isRetry && KNOWLEDGE.isFrustration(rawText)) {
      handleFrustration(rawText);
      return;
    }

    var intent = KNOWLEDGE.matchIntent(rawText);
    if (intent && intent.action) {
      answerFromIntent(intent, rawText);
      return;
    }

    answerWithModel(rawText);
  }

  function syncLocalPayload(query) {
    var unlocked = isUnlocked() || currentState === STATE.UNLOCKED;
    var intent = KNOWLEDGE.matchIntent(query);

    if (intent && !intent.action) {
      if (intent.id === "work_impact") {
        var impactCompany = KNOWLEDGE.getCompanyFromQuery(query) || topicCompany;
        if (impactCompany && KNOWLEDGE.isLockedProject(impactCompany)) {
          var impactChunkId = KNOWLEDGE.getImpactChunkId(impactCompany);
          if (!unlocked) {
            return {
              text:
                getPublicTeaser(impactCompany) +
                " Impact details are in the password-gated case study — enter the portfolio password to go deeper, or request access.",
              chips: ["Enter password", "Request access"],
              chunkId: KNOWLEDGE.getPublicChunkId(impactCompany),
            };
          }
          if (KNOWLEDGE.CHUNKS[impactChunkId]) {
            return { text: KNOWLEDGE.CHUNKS[impactChunkId], chunkId: impactChunkId };
          }
        }
      } else if (intent.locked || (intent.chunkId && KNOWLEDGE.COMPANIES.indexOf(intent.chunkId) !== -1)) {
        var companyId = intent.chunkId;
        var detailId = KNOWLEDGE.pickCompanyChunkId(companyId, query, unlocked);
        if (KNOWLEDGE.isLockedProject(companyId) && !unlocked) {
          return {
            text:
              getPublicTeaser(companyId) +
              " The full case study is password-gated — enter the portfolio password to go deeper, or request access.",
            chips: ["Enter password", "Request access"],
            chunkId: KNOWLEDGE.getPublicChunkId(companyId),
          };
        }
        if (detailId && KNOWLEDGE.CHUNKS[detailId]) {
          return { text: KNOWLEDGE.CHUNKS[detailId], chunkId: detailId };
        }
        if (KNOWLEDGE.CHUNKS[companyId]) {
          return { text: KNOWLEDGE.CHUNKS[companyId], chunkId: companyId };
        }
      } else if (intent.answer) {
        return { text: intent.answer, chunkId: intent.id };
      } else if (intent.chunkId && KNOWLEDGE.CHUNKS[intent.chunkId]) {
        return { text: KNOWLEDGE.CHUNKS[intent.chunkId], chunkId: intent.chunkId };
      }
    }

    if (topicCompany && KNOWLEDGE.wantsTopicFollowUp(query)) {
      var topicChunk = KNOWLEDGE.pickCompanyChunkId(topicCompany, query, unlocked);
      if (topicChunk && KNOWLEDGE.CHUNKS[topicChunk]) {
        if (KNOWLEDGE.isLockedProject(topicCompany) && !unlocked) {
          return {
            text:
              getPublicTeaser(topicCompany) +
              " The full case study is password-gated — enter the portfolio password to go deeper, or request access.",
            chips: ["Enter password", "Request access"],
            chunkId: KNOWLEDGE.getPublicChunkId(topicCompany),
          };
        }
        return { text: KNOWLEDGE.CHUNKS[topicChunk], chunkId: topicChunk };
      }
    }

    var results = KNOWLEDGE.searchChunks(query, unlocked, lastBotChunkId, topicCompany);
    if (results.length && results[0].score >= 1) {
      var top = results[0];
      var topCompany = KNOWLEDGE.getCompanyFromChunkId(top.id);
      var named = KNOWLEDGE.getCompanyFromQuery(query);
      var weakSticky =
        topCompany && !named && !KNOWLEDGE.wantsTopicFollowUp(query) && top.score < 2;
      if (!weakSticky) return { text: top.text, chunkId: top.id };
    }

    return {
      text: "I'm not sure I have a sharp answer for that on the site — try asking about my work, case studies, or how to get in touch.",
      chips: KNOWLEDGE.SUGGESTED_CHIPS.slice(0, 3),
    };
  }

  function answerWithModel(query) {
    var intent = KNOWLEDGE.matchIntent(query);
    deliverBotResponse(function () {
      return fetchAIComplete(query)
        .then(function (aiReply) {
          if (aiReply) {
            return {
              text: aiReply,
              chunkId: intent && intent.chunkId ? intent.chunkId : null,
            };
          }
          return syncLocalPayload(query);
        })
        .catch(function () {
          return syncLocalPayload(query);
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
    if (isConversationalAsk(text)) return false;
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
              "You're in — ask me anything about Raisin, OLX, N26, or GoMart. The case study pages stay password-gated — use Unlock on the card to open them.",
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
          text: "I couldn't verify that here — try again, or request access and I'll follow up.",
          chips: ["Request access"],
        };
      });
    });
  }

  function isEmail(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
  }

  function isFlowControl(text) {
    return /^(request access|enter password|i have the password|yes, get in touch|cancel|never mind|nevermind|stop)$/i.test(
      text.trim()
    );
  }

  function isSuggestedPrompt(text) {
    var normalized = text.trim().toLowerCase();
    var chips = KNOWLEDGE.SUGGESTED_CHIPS || [];
    for (var i = 0; i < chips.length; i++) {
      if (chips[i].toLowerCase() === normalized) return true;
    }
    return (
      /^tell me about\b/i.test(text) ||
      /^what are you working on\b/i.test(text) ||
      /^what was the customer problem\??$/i.test(text) ||
      /^olx monetisation work$/i.test(text)
    );
  }

  function isConversationalAsk(text) {
    if (!text || isFlowControl(text) || isEmail(text)) return false;
    if (isSuggestedPrompt(text)) return true;
    if (/\?/.test(text)) return true;
    if (KNOWLEDGE.looksLikeWorkQuestion(text)) return true;
    var intent = KNOWLEDGE.matchIntent(text);
    return !!(intent && !intent.action);
  }

  function isFormState() {
    return (
      currentState === STATE.COLLECT_EMAIL ||
      currentState === STATE.COLLECT_INTENT ||
      currentState === STATE.AWAIT_PASSWORD
    );
  }

  function exitFormMode() {
    pendingEmail = "";
    accessRequestActive = false;
    accessRequestCompany = null;
    if (isFormState()) {
      currentState = isUnlocked() ? STATE.UNLOCKED : STATE.IDLE;
    }
  }

  function leaveFormAndAnswer(text) {
    var email = pendingEmail;
    if (email) {
      syncPatchSession({ email: email, intent: text });
      setCapturedEmail(email);
    }
    exitFormMode();
    processQuery(text, false);
  }

  function handleUserInput(raw) {
    var text = (raw || "").trim();
    if (!text || isResponding) return;

    hideChips();
    addMessage("user", text);

    if (/^request access$/i.test(text)) {
      if (isUnlocked()) {
        botSay(
          "You already have portfolio access in this browser session — ask me about Raisin, OLX, N26, or GoMart.",
          ["Tell me about Raisin"]
        );
        return;
      }
      startAccessRequestFlow(topicCompany);
      return;
    }

    if (/^enter password$/i.test(text) || /^i have the password$/i.test(text)) {
      pendingEmail = "";
      accessRequestActive = false;
      accessRequestCompany = null;
      startPasswordFlow();
      return;
    }

    if (/^yes, get in touch$/i.test(text)) {
      startContactFlow();
      return;
    }

    if (currentState === STATE.COLLECT_EMAIL || currentState === STATE.COLLECT_INTENT) {
      if (/^(cancel|never mind|nevermind|stop)$/i.test(text.trim())) {
        pendingEmail = "";
        accessRequestActive = false;
        accessRequestCompany = null;
        currentState = isUnlocked() ? STATE.UNLOCKED : STATE.IDLE;
        botSay("No problem — ask me anything else, or enter the portfolio password if you have it.", [
          "Enter password",
        ]);
        return;
      }
      if (isCollectEscape(text)) {
        pendingEmail = "";
        accessRequestActive = false;
        accessRequestCompany = null;
        currentState = isUnlocked() ? STATE.UNLOCKED : STATE.IDLE;
        startPasswordFlow();
        return;
      }
      if (currentState === STATE.COLLECT_EMAIL && looksLikePassword(text) && !isConversationalAsk(text)) {
        accessRequestActive = false;
        accessRequestCompany = null;
        currentState = STATE.IDLE;
        tryPassword(text);
        return;
      }
    }

    if (
      isConversationalAsk(text) &&
      (currentState === STATE.COLLECT_EMAIL ||
        currentState === STATE.COLLECT_INTENT ||
        currentState === STATE.AWAIT_PASSWORD)
    ) {
      leaveFormAndAnswer(text);
      return;
    }

    if (currentState === STATE.COLLECT_EMAIL) {
      if (!isEmail(text)) {
        botSay("That doesn't look like an email — mind trying again? Or say cancel, or enter the portfolio password.");
        return;
      }
      pendingEmail = text;
      currentState = STATE.COLLECT_INTENT;
      botSay(
        accessRequestActive
          ? accessPurposePrompt()
          : "So, what is it about that you'd like to get in touch?"
      );
      return;
    }

    if (currentState === STATE.COLLECT_INTENT) {
      completeContactFlow(text);
      return;
    }

    if (attemptPasswordIfApplicable(text)) return;

    if (isUnlocked()) currentState = STATE.UNLOCKED;

    processQuery(text, false);
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
      '<button type="button" class="gfq-badge vipul-chat-badge" aria-label="Chat with Vipul" data-tip="Chat with Vipul" aria-expanded="false">' +
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
    restoreTranscript();
  }

  function hasGreetedThisTab() {
    return storageGet(GREETED_KEY, false) === "1";
  }

  function markGreetedThisTab() {
    storageSet(GREETED_KEY, "1", false);
  }

  function hasTranscript() {
    try {
      var raw = sessionStorage.getItem(TRANSCRIPT_KEY);
      if (!raw) return false;
      var items = JSON.parse(raw);
      return items && items.length > 0;
    } catch (e) {
      return false;
    }
  }

  function greetLockedCaseStudy(companyId) {
    if (!companyId || !KNOWLEDGE.isLockedProject(companyId)) return;
    topicCompany = companyId;
    storageSet(TOPIC_KEY, companyId, false);
    markGreetedThisTab();
    var label = KNOWLEDGE.getCompanyLabel(companyId);
    if (isUnlocked()) {
      botSay(
        "Hey — I'm Vipul. You're already unlocked in this browser session, so I can talk through " +
          label +
          " in detail. What would you like to know?",
        ["Tell me about " + label, "What was the customer problem?"]
      );
      return;
    }
    botSay(
      "Hey — I'm Vipul. The " +
        label +
        " case study is locked. Share your email and I'll send access — or enter the password if you already have it.",
      ["Request access", "Enter password"]
    );
  }

  function toggle(open, options) {
    options = options || {};
    if (!els.panel) return;
    isOpen = open !== undefined ? open : !isOpen;
    els.panel.classList.toggle("panel-active", isOpen);
    if (wrapEl) wrapEl.classList.toggle("is-open", isOpen);
    if (els.badge) els.badge.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (isOpen) {
      if (pendingLockedCompany) {
        var lockedCompany = pendingLockedCompany;
        var fromRequest = pendingLockedFromRequest;
        pendingLockedCompany = null;
        pendingLockedFromRequest = false;
        if (fromRequest) {
          markGreetedThisTab();
          var label = KNOWLEDGE.getCompanyLabel(lockedCompany);
          if (isUnlocked()) {
            topicCompany = lockedCompany;
            storageSet(TOPIC_KEY, lockedCompany, false);
            botSay(
              "You're already unlocked in this browser session. Ask me about " + label + ".",
              ["Tell me about " + label]
            );
          } else {
            startAccessRequestFlow(lockedCompany);
          }
        } else {
          greetLockedCaseStudy(lockedCompany);
        }
      } else if (!options.skipGreet && els.messages && !els.messages.childElementCount && !hasGreetedThisTab() && !hasTranscript()) {
        markGreetedThisTab();
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
    var company = opts.company && String(opts.company).toLowerCase();
    if (company && KNOWLEDGE.isLockedProject(company)) {
      pendingLockedCompany = company;
      pendingLockedFromRequest = opts.intent === "request_access";
      toggle(true);
      return;
    }
    var intent = opts.intent || "chat";
    var formOpen = intent === "password" || intent === "request_access" || intent === "contact";

    if (intent === "chat") {
      var stuckInForm = isFormState();
      if (stuckInForm) {
        exitFormMode();
        clearActiveChips();
      }
      toggle(true);
      if (stuckInForm) {
        botSay(
          "Ask me anything about the work. If you still want a follow-up, leave your email whenever you're ready.",
          KNOWLEDGE.SUGGESTED_CHIPS.slice(0, 3)
        );
      }
      return;
    }

    toggle(true, { skipGreet: formOpen });
    if (intent === "password" || intent === "request_access") {
      setTimeout(function () {
        if (intent === "password") startPasswordFlow();
        else if (isUnlocked()) {
          botSay("You already have portfolio access in this session.", ["Tell me about Raisin"]);
        } else {
          startAccessRequestFlow(topicCompany);
        }
      }, 300);
    } else if (intent === "contact") {
      setTimeout(function () { startContactFlow(); }, 300);
    } else if (opts.prefill) {
      setTimeout(function () { handleUserInput(opts.prefill); }, 300);
    }
  }

  function init() {
    if (!KNOWLEDGE) return;

    loadTopicState();

    var wraps = document.querySelectorAll(".gfq-wrap");
    if (!wraps.length) return;

    wraps.forEach(function (wrap) {
      buildWidget(wrap);
    });

    sessionId = getSessionId();

    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("#footer-contact-trigger, [data-chat-open]");
      if (trigger) {
        e.preventDefault();
        open({ intent: trigger.getAttribute("data-chat-intent") || "chat" });
      }
    });

    document.querySelectorAll("[data-pw-request]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var modal = btn.closest(".pw-modal");
        var company = modal && modal.getAttribute("data-company");
        if (modal) {
          modal.classList.remove("open");
          modal.setAttribute("aria-hidden", "true");
        }
        if (company) open({ company: company, intent: "request_access" });
        else open({ intent: "request_access" });
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