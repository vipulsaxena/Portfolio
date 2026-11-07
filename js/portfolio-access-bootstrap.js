/**
 * Early <head> gate resolution for password-gated case studies.
 * Requires js/portfolio-gate.js immediately before this script.
 */
(function (global) {
  "use strict";

  var Gate = global.PortfolioGate;
  if (!Gate || !Gate.applyUrlAccessGrant) return;

  function navType() {
    try {
      var e = performance.getEntriesByType && performance.getEntriesByType("navigation");
      if (e && e.length) return e[0].type;
      if (performance.navigation) {
        return ["navigate", "reload", "back_forward"][performance.navigation.type] || "navigate";
      }
    } catch (_) {}
    return "navigate";
  }

  function resolveAllow(storageKey) {
    if (Gate.applyUrlAccessGrant()) return true;

    var allow = false;
    try {
      if (sessionStorage.getItem("vipulFollow") || sessionStorage.getItem("vipulPresent")) {
        sessionStorage.setItem(storageKey, "1");
        allow = true;
      } else {
        var internal = false;
        try {
          internal = !!document.referrer && new URL(document.referrer).origin === location.origin;
        } catch (_) {}
        var t = navType();
        var external = t !== "reload" && t !== "back_forward" && !internal;
        if (external) sessionStorage.removeItem(storageKey);
        else allow = sessionStorage.getItem(storageKey) === "1";
      }
    } catch (_) {}

    return allow;
  }

  global.PortfolioAccessBootstrap = {
    run: function (opts) {
      var key = opts && opts.key;
      var lockedClass = opts && opts.lockedClass;
      if (!key) return;

      var allow = resolveAllow(key);
      global.__gateAllow = allow;
      if (lockedClass) {
        if (allow) document.documentElement.classList.remove(lockedClass);
        else document.documentElement.classList.add(lockedClass);
      }
    },
  };
})(window);
