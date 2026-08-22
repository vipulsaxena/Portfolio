(function (global) {
  "use strict";

  var CONFIG = global.ADMIN_CONFIG || {};
  var ready = false;
  var waiters = [];

  function apiUrl(path) {
    return (CONFIG.API_BASE_URL || "").replace(/\/$/, "") + path;
  }

  function api(path, options) {
    var token = null;
    try {
      token = sessionStorage.getItem("portfolioAdminToken");
    } catch (e) {}
    var headers = Object.assign({}, (options && options.headers) || {});
    if (token) headers.Authorization = "Bearer " + token;
    return fetch(apiUrl(path), Object.assign({ credentials: "include" }, options || {}, { headers: headers }));
  }

  function isAdminHome() {
    return /\/admin\/?$/.test(location.pathname.replace(/index\.html$/, ""));
  }

  function homeHref() {
    return isAdminHome() ? "./" : "../";
  }

  function show(el) {
    if (el) el.classList.remove("hidden");
  }

  function hide(el) {
    if (el) el.classList.add("hidden");
  }

  function els() {
    return {
      logoutBtn: document.getElementById("logout-btn"),
      loginView: document.getElementById("login-view"),
      loginForm: document.getElementById("login-form"),
      loginError: document.getElementById("login-error"),
      homeView: document.getElementById("admin-home"),
    };
  }

  function notifyReady() {
    ready = true;
    waiters.splice(0).forEach(function (fn) {
      fn();
    });
    document.dispatchEvent(new Event("admin:ready"));
  }

  function showAuthed() {
    var n = els();
    show(n.logoutBtn);
    hide(n.loginView);
    show(n.homeView);
    notifyReady();
  }

  function showGuest() {
    var n = els();
    hide(n.logoutBtn);
    hide(n.homeView);
    if (n.loginView) {
      show(n.loginView);
      return;
    }
    location.replace(homeHref());
  }

  function lock() {
    try {
      sessionStorage.removeItem("portfolioAdminToken");
    } catch (e) {}
    showGuest();
  }

  function checkAuth() {
    return api("/api/admin/me")
      .then(function (res) {
        return res.json().then(function (data) {
          return !!(res.ok && data.authenticated);
        });
      })
      .catch(function () {
        return false;
      });
  }

  function bind() {
    var n = els();
    if (n.loginForm) {
      n.loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        hide(n.loginError);
        var password = document.getElementById("password").value;
        api("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: password }),
        })
          .then(function (res) {
            if (!res.ok) throw new Error("invalid");
            return res.json();
          })
          .then(function (data) {
            if (data.token) {
              try {
                sessionStorage.setItem("portfolioAdminToken", data.token);
              } catch (e) {}
            }
            showAuthed();
          })
          .catch(function () {
            show(n.loginError);
            if (n.loginError) n.loginError.textContent = "Invalid password. Try again.";
          });
      });
    }

    if (n.logoutBtn) {
      n.logoutBtn.addEventListener("click", function () {
        api("/api/admin/logout", { method: "POST" }).finally(function () {
          try {
            sessionStorage.removeItem("portfolioAdminToken");
          } catch (e) {}
          if (isAdminHome()) {
            showGuest();
            var input = document.getElementById("password");
            if (input) input.value = "";
            return;
          }
          location.replace(homeHref());
        });
      });
    }

    checkAuth().then(function (ok) {
      if (ok) showAuthed();
      else showGuest();
    });
  }

  global.AdminGate = {
    api: api,
    lock: lock,
    whenReady: function (fn) {
      if (ready) fn();
      else waiters.push(fn);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})(window);
