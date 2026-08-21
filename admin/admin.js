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
  var deleteThreadBtn = document.getElementById("delete-thread-btn");
  var toggleReadBtn = document.getElementById("toggle-read-btn");
  var currentSessionId = "";
  var currentSessionRead = false;

  var TRASH_ICON =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M3.5 4.5h9M6.5 4.5V3.2A.7.7 0 0 1 7.2 2.5h1.6a.7.7 0 0 1 .7.7v1.3M5 4.5l.4 8.2a1 1 0 0 0 1 .8h3.2a1 1 0 0 0 1-.8L11 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  var MAIL_CLOSED_ICON =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<rect x="2.5" y="3.5" width="11" height="9" rx="1.2" stroke="currentColor" stroke-width="1.4"/>' +
    '<path d="M3 4.5 8 8.2 13 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  var MAIL_OPEN_ICON =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M2.5 6.2 8 2.8l5.5 3.4V12a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V6.2Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M2.5 6.2 8 9.6l5.5-3.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

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
    currentSessionId = "";
    history.pushState({}, "", "index.html");
    showInbox();
  });

  deleteThreadBtn.addEventListener("click", function () {
    if (!currentSessionId) return;
    deleteConversation(currentSessionId, deleteThreadBtn).then(function (ok) {
      if (!ok) return;
      currentSessionId = "";
      history.pushState({}, "", "index.html");
      showInbox();
    });
  });

  toggleReadBtn.addEventListener("click", function () {
    if (!currentSessionId) return;
    setReadState(currentSessionId, !currentSessionRead, toggleReadBtn).then(function (ok) {
      if (!ok) return;
      currentSessionRead = !currentSessionRead;
      updateThreadReadButton();
    });
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
          var isUnread = !s.read;
          var card = document.createElement("div");
          card.className = "admin-session-card" + (isUnread ? " admin-session-card--unread" : "");

          var body = document.createElement("a");
          body.className = "admin-session-card__body";
          body.href = "index.html?session=" + encodeURIComponent(s.id);
          body.innerHTML =
            '<div class="admin-session-card__top">' +
            '<span class="admin-session-card__email">' +
            (isUnread ? '<span class="admin-unread-dot" aria-hidden="true"></span>' : "") +
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
          body.addEventListener("click", function (e) {
            e.preventDefault();
            openThread(s.id);
          });

          var actions = document.createElement("div");
          actions.className = "admin-session-card__actions";

          var readBtn = document.createElement("button");
          readBtn.type = "button";
          readBtn.className = "admin-icon-btn";
          readBtn.setAttribute("aria-label", isUnread ? "Mark as read" : "Mark as unread");
          readBtn.title = isUnread ? "Mark as read" : "Mark as unread";
          readBtn.innerHTML = isUnread ? MAIL_CLOSED_ICON : MAIL_OPEN_ICON;
          readBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            setReadState(s.id, isUnread, readBtn).then(function (ok) {
              if (ok) loadSessions();
            });
          });

          var delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "admin-icon-btn admin-icon-btn--danger";
          delBtn.setAttribute("aria-label", "Delete conversation");
          delBtn.title = "Delete conversation";
          delBtn.innerHTML = TRASH_ICON;
          delBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            deleteConversation(s.id, delBtn).then(function (ok) {
              if (ok) loadSessions();
            });
          });

          actions.appendChild(readBtn);
          actions.appendChild(delBtn);
          card.appendChild(body);
          card.appendChild(actions);
          sessionList.appendChild(card);
        });
      });
  }

  function orderThreadMessages(messages) {
    var chrono = (messages || []).slice().sort(function (a, b) {
      return (a.id || 0) - (b.id || 0);
    });
    var turns = [];
    var i = 0;
    while (i < chrono.length) {
      var turn = [];
      if (chrono[i].role === "user") {
        turn.push(chrono[i]);
        i += 1;
        while (i < chrono.length && chrono[i].role !== "user") {
          turn.push(chrono[i]);
          i += 1;
        }
      } else {
        while (i < chrono.length && chrono[i].role !== "user") {
          turn.push(chrono[i]);
          i += 1;
        }
      }
      if (turn.length) turns.push(turn);
    }
    turns.reverse();
    var out = [];
    turns.forEach(function (turn) {
      turn.forEach(function (m) {
        out.push(m);
      });
    });
    return out;
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

  function deleteConversation(id, btn) {
    if (!window.confirm("Delete this conversation? Messages cannot be recovered.")) {
      return Promise.resolve(false);
    }
    if (btn) btn.disabled = true;
    return api("/api/admin/sessions/" + encodeURIComponent(id), { method: "DELETE" })
      .then(function (res) {
        if (res.status === 401) {
          showLogin();
          return false;
        }
        if (!res.ok) throw new Error("Delete failed");
        return true;
      })
      .catch(function () {
        window.alert("Could not delete this conversation. Try again.");
        return false;
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  }

  function setReadState(id, read, btn) {
    if (btn) btn.disabled = true;
    return api("/api/admin/sessions/" + encodeURIComponent(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: read }),
    })
      .then(function (res) {
        if (res.status === 401) {
          showLogin();
          return false;
        }
        if (!res.ok) throw new Error("Update failed");
        return true;
      })
      .catch(function () {
        window.alert("Could not update read state. Try again.");
        return false;
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  }

  function updateThreadReadButton() {
    toggleReadBtn.textContent = currentSessionRead ? "Mark as unread" : "Mark as read";
    var statusEl = document.getElementById("thread-read-status");
    if (statusEl) statusEl.textContent = currentSessionRead ? "Read" : "Unread";
  }

  function openThread(id) {
    currentSessionId = id;
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
        currentSessionRead = !!s.read;
        updateThreadReadButton();
        threadSummary.innerHTML =
          "<dl>" +
          "<dt>Email</dt><dd>" + (s.email || "—") + "</dd>" +
          "<dt>Status</dt><dd id=\"thread-read-status\">" + (currentSessionRead ? "Read" : "Unread") + "</dd>" +
          "<dt>Intent</dt><dd>" + (s.intent || "—") + "</dd>" +
          "<dt>Page</dt><dd>" + (s.page_first_seen || "—") + "</dd>" +
          "<dt>Unlocked</dt><dd>" + (s.unlocked_at ? "Yes" : "No") + "</dd>" +
          "<dt>Highlights</dt><dd><div class=\"admin-badges\">" + renderBadges(s.highlights) + "</div></dd>" +
          "</dl>";
        threadMessages.innerHTML = "";
        (orderThreadMessages(data.messages || [])).forEach(function (m) {
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
