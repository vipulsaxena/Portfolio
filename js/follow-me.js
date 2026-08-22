/* Follow Me — overlay + realtime client. Loaded only during present/follow. */
(function (global) {
  "use strict";

  if (global.__vipulFollowMeStarted) return;
  global.__vipulFollowMeStarted = true;

  var PAGES = {
    index: "index.html",
    about: "about.html",
    olx: "olx.html",
    n26: "n26.html",
    gomart: "gomart.html",
    raisin: "raisin.html",
    goplay: "goplay.html",
    instalively: "instalively.html",
    "silent-ninja": "silent-ninja-redesign.html",
  };

  var FILE_TO_PAGE = {
    "": "index",
    "/": "index",
    "index.html": "index",
    "about.html": "about",
    "olx.html": "olx",
    "n26.html": "n26",
    "gomart.html": "gomart",
    "raisin.html": "raisin",
    "goplay.html": "goplay",
    "instalively.html": "instalively",
    "silent-ninja-redesign.html": "silent-ninja",
    "present": "index",
    "present/": "index",
    "present/index.html": "index",
    "presentation": "index",
    "presentation/": "index",
    "presentation/index.html": "index",
  };

  var FOLLOW_KEY = "vipulFollow";
  var PRESENT_KEY = "vipulPresent";
  var LOG_KEY = "vipulPresentLog";
  var GATES = [
    "raisinAccessGranted",
    "olxAccessGranted",
    "n26AccessGranted",
    "gomartAccessGranted",
  ];

  var apiBase =
    (global.VIPUL_CHAT_CONFIG && global.VIPUL_CHAT_CONFIG.API_BASE_URL) ||
    "https://portfolio-chat.vipul-saxena01.workers.dev";

  var role = null; /* presenter | audience */
  var sessionId = null;
  var presenterToken = null;
  var participantId = null;
  var following = false;
  var paused = false;
  var ended = false;
  var applyingRemote = false;
  var applyingRemoteTimer = null;
  var gestureDelta = 0;
  var gestureResetTimer = null;
  var touchStart = null;
  var lastRemoteTs = 0;
  var ws = null;
  var reconnectTimer = null;
  var reconnectDelay = 500;
  var pingTimer = null;
  var presenterAwayTimer = null;
  var scrollTimer = null;
  var lastSent = null;
  var counts = { connected: 0, following: 0, presenterConnected: true };
  var chip = null;
  var endedEl = null;
  var lastSection = null;
  var lastHighlight = null;
  var highlightTimer = null;
  var highlightClearTimer = null;

  var CASE_STUDY_PAGES = {
    olx: 1,
    n26: 1,
    gomart: 1,
    raisin: 1,
    goplay: 1,
    instalively: 1,
    "silent-ninja": 1,
  };

  function storageGet(key) {
    try {
      var raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, val) {
    try {
      sessionStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  function storageDel(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {}
  }

  function grantGates() {
    GATES.forEach(function (k) {
      try {
        sessionStorage.setItem(k, "1");
      } catch (e) {}
    });
  }

  function currentPageId() {
    var path = location.pathname.replace(/\/+$/, "");
    var file = path.split("/").pop() || "";
    if (isPresentPage()) return "present";
    if (path.indexOf("/admin") !== -1) return "admin";
    if (FILE_TO_PAGE[file]) return FILE_TO_PAGE[file];
    if (FILE_TO_PAGE[path]) return FILE_TO_PAGE[path];
    return "index";
  }

  function isPresentPage() {
    var path = location.pathname;
    if (/\/admin\/presentation(\/|$)/.test(path)) return true;
    if (/\/present(\/|$|\.html)/.test(path) && path.indexOf("/admin") === -1) return true;
    return false;
  }

  function isAdminPage() {
    return location.pathname.indexOf("/admin") !== -1;
  }

  function isPrivatePage() {
    return isPresentPage() || isAdminPage();
  }

  function isCaseStudyPage() {
    return !!CASE_STUDY_PAGES[currentPageId()];
  }

  function tabValue(el) {
    return (
      el.getAttribute("data-fm-value") ||
      el.getAttribute("data-tab") ||
      el.getAttribute("data-bg") ||
      el.getAttribute("data-persona-id") ||
      el.getAttribute("data-persona") ||
      el.getAttribute("data-research-view") ||
      ""
    );
  }

  function widgetTabs(root) {
    return root.querySelectorAll(
      '[role="tab"], [data-tab], [data-bg], [data-persona-id], [data-persona], [data-research-view]'
    );
  }

  function readWidgets() {
    var out = {};
    document.querySelectorAll("[data-fm-widget]").forEach(function (root) {
      var id = root.getAttribute("data-fm-widget");
      if (!id) return;
      var active =
        root.querySelector('[aria-selected="true"]') ||
        root.querySelector(".is-active") ||
        root.querySelector(".prototype-persona-tab--active");
      var val = active ? tabValue(active) : "";
      if (val) out[id] = val;
    });
    return Object.keys(out).length ? out : null;
  }

  function widgetsKey(w) {
    if (!w) return "";
    return Object.keys(w)
      .sort()
      .map(function (k) {
        return k + "=" + w[k];
      })
      .join("&");
  }

  function applyWidgets(widgets) {
    if (!widgets) return;
    holdRemote(400);
    Object.keys(widgets).forEach(function (id) {
      var root = document.querySelector('[data-fm-widget="' + id + '"]');
      if (!root) return;
      var want = widgets[id];
      var tabs = widgetTabs(root);
      for (var i = 0; i < tabs.length; i++) {
        if (tabValue(tabs[i]) !== want) continue;
        if (tabs[i].getAttribute("aria-selected") === "true" || tabs[i].classList.contains("is-active")) {
          return;
        }
        tabs[i].click();
        return;
      }
    });
  }

  function stampHighlightIds() {
    if (!isCaseStudyPage()) return;
    var n = 0;
    var nodes = document.querySelectorAll(
      "a, button, [data-lightbox], [data-audit], .why-proof__frame, [role='tab'], .audit-item"
    );
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest(".follow-chip, .follow-ended, .shell-header, .vipul-chat, .gfq-root, [data-fm-skip]")) {
        continue;
      }
      if (!el.getAttribute("data-fm-id")) {
        el.setAttribute("data-fm-id", "e" + n);
      }
      n++;
    }
  }

  function applyHighlight(id) {
    document.querySelectorAll(".fm-hit").forEach(function (el) {
      el.classList.remove("fm-hit");
    });
    clearTimeout(highlightClearTimer);
    if (!id || !isCaseStudyPage()) return;
    var el = document.querySelector('[data-fm-id="' + id + '"]');
    if (!el) return;
    el.classList.add("fm-hit");
    highlightClearTimer = setTimeout(function () {
      el.classList.remove("fm-hit");
    }, 1400);
  }

  function setPresenterHighlight(id) {
    lastHighlight = id;
    clearTimeout(highlightTimer);
    highlightTimer = setTimeout(function () {
      lastHighlight = null;
      broadcastLocal(true);
    }, 1400);
  }

  function hrefFor(page, slide) {
    var file = PAGES[page] || "index.html";
    var hash = slide ? "#" + slide : "";
    return "/" + file + hash;
  }

  function activeScroller() {
    var deck = global.PortfolioDeck;
    if (deck) {
      var slides = document.querySelectorAll(".slide");
      var idx = typeof deck.getIndex === "function" ? deck.getIndex() : 0;
      return slides[idx] || document.querySelector(".slide.is-active");
    }
    return document.scrollingElement || document.documentElement;
  }

  function readScrollRatio() {
    var el = activeScroller();
    if (!el) return null;
    var max = el.scrollHeight - el.clientHeight;
    if (max <= 4) return 0;
    return Math.max(0, Math.min(1, el.scrollTop / max));
  }

  function holdRemote(ms) {
    applyingRemote = true;
    clearTimeout(applyingRemoteTimer);
    applyingRemoteTimer = setTimeout(function () {
      applyingRemote = false;
    }, ms || 1000);
  }

  function writeScrollRatio(ratio) {
    if (ratio == null || !Number.isFinite(ratio)) return;
    var el = activeScroller();
    if (!el) return;
    var max = el.scrollHeight - el.clientHeight;
    if (max <= 4) return;
    holdRemote(1000);
    el.scrollTo({ top: ratio * max, behavior: "smooth" });
  }

  function raisinSection() {
    if (currentPageId() !== "raisin") return null;
    var ids = [
      "hero",
      "why",
      "journey-intro",
      "period-1",
      "period-2",
      "period-3",
      "period-4",
      "proof",
      "contact",
    ];
    var mid = window.innerHeight * 0.4;
    var best = null;
    var bestDist = Infinity;
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var r = el.getBoundingClientRect();
      var dist = Math.abs(r.top - mid);
      if (r.bottom > 80 && dist < bestDist) {
        bestDist = dist;
        best = id;
      }
    });
    return best;
  }

  function localState() {
    var page = currentPageId();
    if (page === "present" || page === "admin") return null;
    var slide = null;
    if (global.PortfolioDeck && typeof global.PortfolioDeck.getIndex === "function") {
      slide = global.PortfolioDeck.getIndex() + 1;
    }
    return {
      page: page,
      slide: slide,
      section: raisinSection(),
      scroll: readScrollRatio(),
      widgets: readWidgets(),
      highlight: isCaseStudyPage() ? lastHighlight : null,
      ts: Date.now(),
    };
  }

  function sameView(a, b) {
    if (!a || !b) return false;
    return (
      a.page === b.page &&
      a.slide === b.slide &&
      a.section === b.section &&
      widgetsKey(a.widgets) === widgetsKey(b.widgets) &&
      (a.highlight || "") === (b.highlight || "")
    );
  }

  function applyState(state) {
    if (!state || ended) return;
    if (!state.page || state.page === "present" || state.page === "admin") return;
    if (state.ts && state.ts < lastRemoteTs) return;
    lastRemoteTs = state.ts || Date.now();

    var here = currentPageId();
    if (here === "present" || here === "admin") return;

    if (state.page && state.page !== here) {
      grantGates();
      applyingRemote = true;
      location.assign(hrefFor(state.page, state.slide));
      return;
    }

    holdRemote(1000);
    var slideChanged = false;
    if (state.slide && global.PortfolioDeck && typeof global.PortfolioDeck.go === "function") {
      var idx = state.slide - 1;
      if (global.PortfolioDeck.getIndex() !== idx) {
        slideChanged = true;
        global.PortfolioDeck.go(idx);
      }
    }
    if (state.section && here === "raisin") {
      var el = document.getElementById(state.section);
      if (el && lastSection !== state.section) {
        lastSection = state.section;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (el && state.scroll != null) {
        writeScrollRatio(state.scroll);
      }
    } else if (state.scroll != null) {
      setTimeout(function () {
        writeScrollRatio(state.scroll);
      }, slideChanged ? 80 : 0);
    }
    applyWidgets(state.widgets);
    applyHighlight(state.highlight);
  }

  function wsUrl() {
    var http = apiBase.replace(/\/+$/, "");
    var proto = http.indexOf("https:") === 0 ? "wss:" : "ws:";
    var host = http.replace(/^https?:/, "");
    return proto + host + "/api/present/ws?session=" + encodeURIComponent(sessionId);
  }

  function send(msg) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
  }

  function persistAudience() {
    storageSet(FOLLOW_KEY, {
      sessionId: sessionId,
      participantId: participantId,
      following: following,
      paused: paused,
    });
  }

  function persistPresenter() {
    var val = { sessionId: sessionId, presenterToken: presenterToken };
    storageSet(PRESENT_KEY, val);
    try {
      localStorage.setItem(PRESENT_KEY, JSON.stringify(val));
    } catch (e) {}
  }

  function readPresenter() {
    var fromSession = storageGet(PRESENT_KEY);
    if (fromSession && fromSession.sessionId) return fromSession;
    try {
      var raw = localStorage.getItem(PRESENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearPresenter() {
    storageDel(PRESENT_KEY);
    try {
      localStorage.removeItem(PRESENT_KEY);
    } catch (e) {}
  }

  function readSessionLog() {
    try {
      var raw = localStorage.getItem(LOG_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function appendSessionLog(entry) {
    try {
      var list = readSessionLog();
      list.unshift(entry);
      localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, 40)));
    } catch (e) {}
  }

  function renderSessionLog() {
    var list = readSessionLog();
    if (!list.length) return "";
    var rows = list
      .map(function (item) {
        var when = item.endedAt ? new Date(item.endedAt).toLocaleString() : "";
        var dur = formatDuration(item.durationMs || 0);
        var peak = item.peakFollowing != null ? item.peakFollowing : item.following || 0;
        return (
          "<li>" +
          "<span class=\"present-log__when\">" +
          when +
          "</span>" +
          "<span class=\"present-log__meta\">" +
          dur +
          " · " +
          peak +
          " peak following</span>" +
          "</li>"
        );
      })
      .join("");
    return (
      '<section class="present-log" aria-label="Past presentations">' +
      "<h2>Session log</h2>" +
      "<ul>" +
      rows +
      "</ul>" +
      "</section>"
    );
  }

  function shareUrl() {
    return location.origin + "/f/" + sessionId;
  }

  function ensureCss() {
    if (document.getElementById("follow-me-css")) return;
    var link = document.createElement("link");
    link.id = "follow-me-css";
    link.rel = "stylesheet";
    link.href = "/css/follow-me.css";
    document.head.appendChild(link);
  }

  function setChipHtml(html) {
    ensureCss();
    if (!chip) {
      chip = document.createElement("div");
      chip.className = "follow-chip";
      chip.setAttribute("role", "status");
      document.body.appendChild(chip);
    }
    chip.hidden = false;
    chip.innerHTML = html;
    bindChip();
  }

  function hideChip() {
    if (chip) chip.hidden = true;
  }

  function bindChip() {
    var copyBtn = chip.querySelector("[data-fm-copy]");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var url = shareUrl();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            copyBtn.textContent = "Copied";
            setTimeout(function () {
              copyBtn.textContent = "Copy link";
            }, 1400);
          });
        } else {
          prompt("Share this link", url);
        }
      });
    }
    var endBtn = chip.querySelector("[data-fm-end]");
    if (endBtn) endBtn.addEventListener("click", function () { send({ type: "END" }); });
    var followBtn = chip.querySelector("[data-fm-follow]");
    if (followBtn) followBtn.addEventListener("click", startFollowing);
    var stopBtn = chip.querySelector("[data-fm-stop]");
    if (stopBtn) stopBtn.addEventListener("click", stopFollowing);
    var resumeBtn = chip.querySelector("[data-fm-resume]");
    if (resumeBtn) resumeBtn.addEventListener("click", resumeFollowing);
  }

  var USER_ICON =
    '<svg class="follow-nav-badge__icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';

  function updateNavBadge() {
    if (role !== "presenter" || ended) {
      var old = document.getElementById("follow-nav-badge");
      if (old) old.remove();
      return;
    }
    ensureCss();
    var el = document.getElementById("follow-nav-badge");
    if (!el) {
      var host = document.querySelector(".shell-actions") || document.querySelector(".shell-bar");
      if (!host) return;
      el = document.createElement("button");
      el.id = "follow-nav-badge";
      el.type = "button";
      el.className = "follow-nav-badge";
      host.appendChild(el);
    }
    var n = counts.following;
    var c = counts.connected;
    el.innerHTML =
      USER_ICON +
      '<span class="follow-nav-badge__count">' +
      n +
      "</span>";
    el.setAttribute(
      "aria-label",
      "Force everyone to follow. " + n + " following, " + c + " connected"
    );
    el.title = "Force follow · " + n + " following · " + c + " connected";
    el.classList.add("is-action");
    if (!el._fmBound) {
      el._fmBound = true;
      el.addEventListener("click", function () {
        send({ type: "FORCE_FOLLOW" });
      });
    }
  }

  function audienceCtaLabel() {
    if (following) return "Stop following";
    if (paused) return "Resume following";
    return "Follow Vipul";
  }

  function updateAudienceNav() {
    var existing = document.getElementById("follow-nav-cta");
    if (role !== "audience" || ended || isAdminPage()) {
      if (existing) existing.remove();
      return;
    }
    hideChip();
    ensureCss();
    var host = document.querySelector(".shell-actions") || document.querySelector(".shell-bar");
    if (!host) return;
    var el = existing;
    if (!el) {
      el = document.createElement("button");
      el.id = "follow-nav-cta";
      el.type = "button";
      el.className = "follow-nav-cta";
      host.appendChild(el);
      el.addEventListener("click", function () {
        if (following) stopFollowing();
        else if (paused) resumeFollowing();
        else startFollowing();
      });
    }
    el.textContent = audienceCtaLabel();
    el.classList.toggle("is-following", !!following);
    el.classList.toggle("is-paused", !!(paused && !following));
  }

  function updateLobby() {
    var connectedEl = document.getElementById("present-connected");
    var followingEl = document.getElementById("present-following");
    if (connectedEl) connectedEl.textContent = String(counts.connected);
    if (followingEl) followingEl.textContent = String(counts.following);
    var force = document.getElementById("present-force-follow");
    if (force && !force._fmBound) {
      force._fmBound = true;
      force.addEventListener("click", function () {
        send({ type: "FORCE_FOLLOW" });
      });
    }
  }

  function renderChip() {
    updateNavBadge();
    updateAudienceNav();
    updateLobby();
    if (ended) return;
    hideChip();
  }

  function formatDuration(ms) {
    var s = Math.max(0, Math.round((ms || 0) / 1000));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h) return h + "h " + m + "m";
    if (m) return m + "m " + sec + "s";
    return sec + "s";
  }

  function showEnded(stats) {
    ended = true;
    ensureCss();
    hideChip();
    var badge = document.getElementById("follow-nav-badge");
    if (badge) badge.remove();
    var cta = document.getElementById("follow-nav-cta");
    if (cta) cta.remove();
    storageDel(FOLLOW_KEY);
    var wasPresenter = role === "presenter";
    clearPresenter();
    role = wasPresenter ? "presenter-ended" : "audience-ended";

    if (!endedEl) {
      endedEl = document.createElement("div");
      endedEl.className = "follow-ended";
      document.body.appendChild(endedEl);
    }
    if (wasPresenter) {
      appendSessionLog({
        sessionId: sessionId,
        endedAt: Date.now(),
        durationMs: stats && stats.durationMs,
        connected: stats ? stats.connected : counts.connected,
        following: stats ? stats.following : counts.following,
        peakFollowing: stats && stats.peakFollowing != null ? stats.peakFollowing : counts.following,
        peakConnected: stats && stats.peakConnected != null ? stats.peakConnected : counts.connected,
      });
    }
    if (wasPresenter || isPresentPage()) {
      var duration = stats ? formatDuration(stats.durationMs) : "—";
      var followingN = stats ? stats.following : counts.following;
      var connectedN = stats ? stats.connected : counts.connected;
      var peakF = stats && stats.peakFollowing != null ? stats.peakFollowing : followingN;
      endedEl.innerHTML =
        '<div class="follow-ended__card">' +
        "<h2>Presentation ended</h2>" +
        '<ul class="follow-ended__stats">' +
        "<li><span>Session time</span><strong>" +
        duration +
        "</strong></li>" +
        "<li><span>Connected</span><strong>" +
        connectedN +
        "</strong></li>" +
        "<li><span>Following now</span><strong>" +
        followingN +
        "</strong></li>" +
        "<li><span>Peak following</span><strong>" +
        peakF +
        "</strong></li>" +
        "</ul>" +
        '<a class="follow-chip__btn" href="/admin/presentation/">Back to presentation</a>' +
        "</div>";
    } else {
      endedEl.innerHTML =
        '<div class="follow-ended__card">' +
        "<h2>This presentation has ended.</h2>" +
        '<a class="follow-chip__btn" href="/index.html">Continue exploring portfolio</a>' +
        "</div>";
    }
  }

  function startFollowing() {
    following = true;
    paused = false;
    persistAudience();
    send({ type: "FOLLOW" });
    renderChip();
    if (lastSent) applyState(lastSent);
  }

  function stopFollowing() {
    following = false;
    paused = false;
    persistAudience();
    send({ type: "UNFOLLOW" });
    renderChip();
  }

  function resumeFollowing() {
    following = true;
    paused = false;
    persistAudience();
    send({ type: "FOLLOW" });
    renderChip();
    if (lastSent) applyState(lastSent);
  }

  function pauseFollowing() {
    if (role !== "audience" || !following || applyingRemote || ended) return;
    following = false;
    paused = true;
    persistAudience();
    send({ type: "UNFOLLOW" });
    renderChip();
  }

  function onServerMessage(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === "ERROR") {
      if (msg.code === "not_found" || msg.code === "forbidden") showEnded(null);
      return;
    }
    if (msg.type === "ENDED") {
      showEnded(msg.stats || null);
      return;
    }
    if (msg.type === "SNAPSHOT") {
      if (msg.participantId) participantId = msg.participantId;
      counts.connected = msg.connected;
      counts.following = msg.following;
      counts.presenterConnected = msg.presenterConnected;
      if (msg.ended) {
        showEnded(msg.stats || null);
        return;
      }
      if (role === "audience") persistAudience();
      renderChip();
      lastSent = msg.state;
      if (role === "audience" && following && msg.state) applyState(msg.state);
      return;
    }
    if (msg.type === "COUNTS") {
      counts.connected = msg.connected;
      counts.following = msg.following;
      counts.presenterConnected = msg.presenterConnected;
      renderChip();
      clearTimeout(presenterAwayTimer);
      if (role === "audience" && msg.presenterConnected === false) {
        presenterAwayTimer = setTimeout(function () {
          if (chip && role === "audience") {
            var meta = chip.querySelector(".follow-chip__label");
            if (meta && !ended) meta.textContent = "Reconnecting…";
          }
        }, 4000);
      }
      return;
    }
    if (msg.type === "STATE") {
      lastSent = msg.state;
      if (role === "audience" && following) applyState(msg.state);
      return;
    }
    if (msg.type === "FORCE_FOLLOW") {
      if (role !== "audience" || ended) return;
      following = true;
      paused = false;
      persistAudience();
      renderChip();
      lastSent = msg.state || lastSent;
      if (lastSent) applyState(lastSent);
    }
  }

  function connect() {
    if (!sessionId || ended) return;
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    try {
      ws = new WebSocket(wsUrl());
    } catch (e) {
      scheduleReconnect();
      return;
    }
    ws.onopen = function () {
      reconnectDelay = 500;
      if (role === "presenter") {
        send({ type: "HELLO", role: "presenter", presenterToken: presenterToken });
        var st = localState();
        if (st) send({ type: "STATE", state: st });
      } else {
        send({
          type: "HELLO",
          role: "audience",
          participantId: participantId || undefined,
        });
        if (following) send({ type: "FOLLOW" });
      }
      clearInterval(pingTimer);
      pingTimer = setInterval(function () {
        send({ type: "PING" });
      }, 25000);
    };
    ws.onmessage = function (ev) {
      try {
        onServerMessage(JSON.parse(ev.data));
      } catch (e) {}
    };
    ws.onclose = function (ev) {
      clearInterval(pingTimer);
      ws = null;
      if (ended || ev.code === 1000 || ev.code === 4404 || ev.code === 4403) return;
      scheduleReconnect();
    };
    ws.onerror = function () {
      try {
        ws && ws.close();
      } catch (e) {}
    };
  }

  function scheduleReconnect() {
    if (ended) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(function () {
      reconnectDelay = Math.min(8000, reconnectDelay * 2);
      connect();
    }, reconnectDelay);
  }

  function broadcastLocal(immediate) {
    if (role !== "presenter" || ended) return;
    if (isPrivatePage()) return;
    var state = localState();
    if (!state) return;
    if (!immediate && lastSent && sameView(lastSent, state) && lastSent.scroll === state.scroll) {
      return;
    }
    lastSent = state;
    send({ type: "STATE", state: state });
  }

  function onDeckChange() {
    if (role === "presenter") broadcastLocal(true);
  }

  function onScroll() {
    if (applyingRemote) return;
    if (role === "audience") return;
    if (role !== "presenter") return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      broadcastLocal(false);
    }, 50);
  }

  function noteUserGesture(amount) {
    if (applyingRemote || role !== "audience" || !following || ended) return;
    gestureDelta += Math.abs(amount);
    clearTimeout(gestureResetTimer);
    gestureResetTimer = setTimeout(function () {
      gestureDelta = 0;
    }, 400);
    if (gestureDelta >= 80) {
      gestureDelta = 0;
      pauseFollowing();
    }
  }

  function onUserNavigate(e) {
    if (applyingRemote || role !== "audience" || !following) return;
    if (e.target && e.target.closest && e.target.closest(".follow-chip, .follow-ended, #present-app, .follow-nav-cta, .follow-nav-badge")) {
      return;
    }
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || href.indexOf("javascript:") === 0) return;
    try {
      var next = new URL(a.href, location.href);
      var herePath = location.pathname.replace(/\/+$/, "") || "/";
      var nextPath = next.pathname.replace(/\/+$/, "") || "/";
      if (next.origin !== location.origin || nextPath !== herePath) {
        pauseFollowing();
      }
    } catch (err) {}
  }

  function onPresenterPointer(e) {
    if (role !== "presenter" || ended || applyingRemote) return;
    if (!isCaseStudyPage()) return;
    if (e.target && e.target.closest && e.target.closest(".follow-chip, .follow-ended, .shell-header, .vipul-chat")) {
      return;
    }
    var el = e.target && e.target.closest ? e.target.closest("[data-fm-id]") : null;
    if (!el) return;
    setPresenterHighlight(el.getAttribute("data-fm-id"));
    broadcastLocal(true);
  }

  function onPresenterUi(e) {
    if (role !== "presenter" || ended || applyingRemote) return;
    if (!e.target || !e.target.closest) return;
    if (!e.target.closest("[data-fm-widget]")) return;
    setTimeout(function () {
      broadcastLocal(true);
    }, 0);
  }

  function wirePage() {
    window.addEventListener("portfolio:deck-change", onDeckChange);
    window.addEventListener(
      "scroll",
      onScroll,
      { passive: true, capture: true }
    );
    document.addEventListener(
      "scroll",
      function (e) {
        if (e.target && e.target.classList && e.target.classList.contains("slide")) onScroll();
      },
      true
    );
    document.addEventListener("click", onUserNavigate, true);
    document.addEventListener("pointerdown", onPresenterPointer, true);
    document.addEventListener("click", onPresenterUi, false);
    document.addEventListener("wheel", function (e) {
      noteUserGesture((e.deltaY || 0) + (e.deltaX || 0));
    }, { passive: true });
    document.addEventListener(
      "touchstart",
      function (e) {
        if (!e.touches || !e.touches[0]) return;
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      },
      { passive: true }
    );
    document.addEventListener(
      "touchmove",
      function (e) {
        if (!touchStart || !e.touches || !e.touches[0]) return;
        if (applyingRemote || role !== "audience" || !following || ended) return;
        var dx = e.touches[0].clientX - touchStart.x;
        var dy = e.touches[0].clientY - touchStart.y;
        if (Math.sqrt(dx * dx + dy * dy) >= 80) {
          touchStart = null;
          pauseFollowing();
        }
      },
      { passive: true }
    );
    document.addEventListener("touchend", function () { touchStart = null; }, { passive: true });
    window.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") connect();
    });
    window.addEventListener("pagehide", function () {
      if (ws) {
        try {
          ws.close();
        } catch (e) {}
      }
    });
  }

  function startPresenterSession(id, token) {
    role = "presenter";
    sessionId = id;
    presenterToken = token;
    grantGates();
    persistPresenter();
    renderChip();
    connect();
    setInterval(function () {
      if (role === "presenter") broadcastLocal(false);
    }, 2000);
  }

  function startAudienceSession(id, opts) {
    role = "audience";
    sessionId = id;
    opts = opts || {};
    participantId = opts.participantId || null;
    following = !!opts.following;
    paused = !!opts.paused;
    grantGates();
    persistAudience();
    renderChip();
    connect();
  }

  function captureQueryFollow() {
    var q = new URLSearchParams(location.search).get("f");
    if (!q) return null;
    return q.toUpperCase();
  }

  function showLobby(root, id) {
    root.innerHTML =
      '<div class="present-form present-lobby">' +
      "<h1>Presenting</h1>" +
      '<p class="present-lead">Share this link. Stay on this tab to watch people join — they will not see this page.</p>' +
      '<p class="present-url" id="present-share-url">' +
      location.origin +
      "/f/" +
      id +
      "</p>" +
      '<p class="present-stats">' +
      '<span><strong id="present-connected">0</strong> connected</span>' +
      '<button type="button" class="present-force" id="present-force-follow" title="Force everyone to follow">' +
      '<strong id="present-following">0</strong> following · tap to force follow' +
      "</button>" +
      "</p>" +
      '<div class="follow-chip__actions">' +
      '<button type="button" class="follow-chip__btn" data-fm-copy>Copy link</button>' +
      '<a class="follow-chip__btn follow-chip__btn--quiet" href="/index.html" target="_blank" rel="noopener">Open portfolio</a>' +
      '<button type="button" class="follow-chip__btn follow-chip__btn--danger" data-fm-end>End</button>' +
      "</div>" +
      "</div>";
    var copyBtn = root.querySelector("[data-fm-copy]");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var url = shareUrl();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            copyBtn.textContent = "Copied";
            setTimeout(function () {
              copyBtn.textContent = "Copy link";
            }, 1400);
          });
        } else {
          prompt("Share this link", url);
        }
      });
    }
    var endBtn = root.querySelector("[data-fm-end]");
    if (endBtn) endBtn.addEventListener("click", function () { send({ type: "END" }); });
    updateLobby();
  }

  function renderPresentPage() {
    var root = document.getElementById("present-app");
    if (!root) return;
    ensureCss();
    var existing = readPresenter();
    if (existing && existing.sessionId && existing.presenterToken) {
      showLobby(root, existing.sessionId);
      startPresenterSession(existing.sessionId, existing.presenterToken);
      return;
    }
    root.innerHTML =
      '<div class="present-form">' +
      "<h1>Follow Me</h1>" +
      "<p>Start a temporary session and share the link. Anyone with the link can follow along. This control page stays private.</p>" +
      '<p class="present-error" id="present-error" hidden></p>' +
      '<button type="button" class="follow-chip__btn" id="present-start">Start presentation</button>' +
      "</div>" +
      renderSessionLog();
    document.getElementById("present-start").addEventListener("click", function () {
      var btn = document.getElementById("present-start");
      var err = document.getElementById("present-error");
      err.hidden = true;
      btn.disabled = true;
      fetch(apiBase.replace(/\/+$/, "") + "/api/present/start", {
        method: "POST",
      })
        .then(function (r) {
          return r.json().then(function (j) {
            return { ok: r.ok, j: j };
          });
        })
        .then(function (res) {
          if (!res.ok) {
            btn.disabled = false;
            err.textContent = res.j.error === "rate_limited" ? "Too many sessions from this network. Try again later." : "Could not start. Try again.";
            err.hidden = false;
            return;
          }
          sessionId = res.j.sessionId;
          presenterToken = res.j.presenterToken;
          persistPresenter();
          showLobby(root, res.j.sessionId);
          startPresenterSession(res.j.sessionId, res.j.presenterToken);
        })
        .catch(function () {
          btn.disabled = false;
          err.textContent = "Could not reach the presentation service.";
          err.hidden = false;
        });
    });
  }

  /* boot */
  function boot() {
    stampHighlightIds();
    wirePage();

    if (isPresentPage()) {
      renderPresentPage();
      return;
    }

    if (isAdminPage()) {
      var adminPresent = readPresenter();
      if (adminPresent && adminPresent.sessionId && adminPresent.presenterToken) {
        startPresenterSession(adminPresent.sessionId, adminPresent.presenterToken);
      }
      return;
    }

    var present = readPresenter();
    var follow = storageGet(FOLLOW_KEY);
    var qid = captureQueryFollow();
    if (qid) {
      follow = follow || { sessionId: qid, participantId: null, following: false, paused: false };
      follow.sessionId = qid;
      storageSet(FOLLOW_KEY, follow);
    }

    if (present && present.sessionId && present.presenterToken) {
      startPresenterSession(present.sessionId, present.presenterToken);
      return;
    }
    if (follow && follow.sessionId) {
      startAudienceSession(follow.sessionId, follow);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
