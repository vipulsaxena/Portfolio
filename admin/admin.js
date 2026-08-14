(function () {
  "use strict";

  var CONFIG = window.ADMIN_CONFIG || {};
  var HIGHLIGHT_LABELS = {
    wants_password: "Wants access",
    recruiting: "Recruiting",
    freelance: "Freelance",
    mentoring: "Mentoring",
    contact_info: "Left email",
    unlocked: "Unlocked",
    berlin_relocation: "Berlin / relocation",
  };

  var currentFilter = "";
  var loginView = document.getElementById("login-view");
  var inboxView = document.getElementById("inbox-view");
  var threadView = document.getElementById("thread-view");
  var logoutBtn = document.getElementById("logout-btn");
  var loginForm = document.getElementById("login-form");
  var loginError = document.getElementById("login-error");
  var sessionList = document.getElementById("session-list");
  var inboxEmpty = document.getElementById("inbox-empty");
  var threadSummary = document.getElementById("thread-summary");
  var threadMessages = document.getElementById("thread-messages");
  var backLink = document.getElementById("back-link");

  function apiUrl(path) {
    return (CONFIG.API_BASE_URL || "").replace(/\/$/, "") + path;
  }

  function api(path, options) {
    var token = null;
    try { token = sessionStorage.getItem("portfolioAdminToken"); } catch (e) {}
    var headers = Object.assign({}, (options && options.headers) || {});
    if (token) headers.Authorization = "Bearer " + token;
    return fetch(apiUrl(path), Object.assign({ credentials: "include" }, options || {}, { headers: headers }));
  }

  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  function timeAgo(iso) {
    if (!iso) return "";
    var diff = Date.now() - new Date(iso).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    return Math.floor(hrs / 24) + "d ago";
  }

  function renderBadges(highlights) {
    if (!highlights || !highlights.length) return "";
    return highlights
      .map(function (tag) {
        return '<span class="admin-badge">' + (HIGHLIGHT_LABELS[tag] || tag) + "</span>";
      })
      .join("");
  }

  function showLogin() {
    show(loginView);
    hide(inboxView);
    hide(threadView);
    hide(logoutBtn);
  }

  function showInbox() {
    hide(loginView);
    show(inboxView);
    hide(threadView);
    show(logoutBtn);
    loadSessions();
  }

  function showThread() {
    hide(loginView);
    hide(inboxView);
    show(threadView);
    show(logoutBtn);
  }

  function checkAuth() {
    return api("/api/admin/me").then(function (res) {
      return res.json().then(function (data) {
        return data.authenticated;
      });
    });
  }

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    hide(loginError);
    var password = document.getElementById("password").value;
    api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Invalid password");
        return res.json();
      })
      .then(function (data) {
        if (data.token) {
          try { sessionStorage.setItem("portfolioAdminToken", data.token); } catch (e) {}
        }
        showInbox();
      })
      .catch(function () {
        show(loginError);
        loginError.textContent = "Invalid password. Try again.";
      });
  });

  logoutBtn.addEventListener("click", function () {
    api("/api/admin/logout", { method: "POST" }).finally(function () {
      try { sessionStorage.removeItem("portfolioAdminToken"); } catch (e) {}
      showLogin();
    });
  });

  backLink.addEventListener("click", function (e) {
    e.preventDefault();
    history.pushState({}, "", "index.html");
    showInbox();
  });

  document.getElementById("filters").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-filter]");
    if (!btn) return;
    currentFilter = btn.getAttribute("data-filter") || "";
    document.querySelectorAll(".admin-filter").forEach(function (b) {
      b.classList.toggle("is-active", b === btn);
    });
    loadSessions();
  });

  function loadSessions() {
    var q = currentFilter ? "?filter=" + encodeURIComponent(currentFilter) : "";
    api("/api/admin/sessions" + q)
      .then(function (res) {
        if (res.status === 401) {
          showLogin();
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        var sessions = data.sessions || [];
        sessionList.innerHTML = "";
        if (!sessions.length) {
          show(inboxEmpty);
          return;
        }
        hide(inboxEmpty);
        sessions.forEach(function (s) {
          var card = document.createElement("a");
          card.className = "admin-session-card";
          card.href = "index.html?session=" + encodeURIComponent(s.id);
          card.innerHTML =
            '<div class="admin-session-card__top">' +
            '<span class="admin-session-card__email">' +
            (s.email || "Anonymous") +
            "</span>" +
            '<span class="admin-session-card__time">' +
            timeAgo(s.updated_at) +
            "</span></div>" +
            '<p class="admin-session-card__preview">' +
            (s.last_user_message || s.intent || "No messages yet") +
            "</p>" +
            '<div class="admin-badges">' +
            renderBadges(s.highlights) +
            "</div>";
          card.addEventListener("click", function (e) {
            e.preventDefault();
            openThread(s.id);
          });
          sessionList.appendChild(card);
        });
      });
  }

  function formatThreadMessage(m) {
    if (m.role === "system") {
      if (m.content === "Portfolio unlocked") {
        return {
          role: "note",
          label: "Session",
          content: "Portfolio unlocked",
          highlight: true,
        };
      }
      if (m.content.indexOf("Contact captured:") === 0) {
        return {
          role: "note",
          label: "Lead",
          content: m.content.replace("Contact captured:", "Contact saved:"),
          highlight: true,
        };
      }
      return {
        role: "note",
        label: "System",
        content: m.content,
        highlight: false,
      };
    }
    return {
      role: m.role,
      label: m.role,
      content: m.content,
      highlight: m.role === "user" && (m.tags || []).length > 0,
    };
  }

  function openThread(id) {
    history.pushState({}, "", "index.html?session=" + encodeURIComponent(id));
    api("/api/admin/sessions/" + encodeURIComponent(id))
      .then(function (res) {
        if (res.status === 401) {
          showLogin();
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        showThread();
        var s = data.session;
        threadSummary.innerHTML =
          "<dl>" +
          "<dt>Email</dt><dd>" + (s.email || "—") + "</dd>" +
          "<dt>Intent</dt><dd>" + (s.intent || "—") + "</dd>" +
          "<dt>Page</dt><dd>" + (s.page_first_seen || "—") + "</dd>" +
          "<dt>Unlocked</dt><dd>" + (s.unlocked_at ? "Yes" : "No") + "</dd>" +
          "<dt>Highlights</dt><dd><div class=\"admin-badges\">" + renderBadges(s.highlights) + "</div></dd>" +
          "</dl>";
        threadMessages.innerHTML = "";
        (data.messages || []).forEach(function (m) {
          var formatted = formatThreadMessage(m);
          if (!formatted) return;
          var div = document.createElement("div");
          div.className =
            "admin-msg admin-msg--" + formatted.role +
            (formatted.highlight ? " admin-msg--highlight" : "");
          div.innerHTML =
            '<div class="admin-msg__role">' + escapeHtml(formatted.label) + "</div>" +
            escapeHtml(formatted.content);
          threadMessages.appendChild(div);
        });
      });
  }

  function escapeHtml(str) {
    var d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function init() {
    var params = new URLSearchParams(location.search);
    var sessionId = params.get("session");

    checkAuth().then(function (ok) {
      if (!ok) {
        showLogin();
        return;
      }
      if (sessionId) openThread(sessionId);
      else showInbox();
    });
  }

  init();
})();
