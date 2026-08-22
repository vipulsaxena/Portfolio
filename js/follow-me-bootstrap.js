/**
 * Tiny Follow Me bootstrap. No-ops unless a present/follow session exists
 * or the URL carries ?f= / /f/:id. Ordinary visitors do not load follow-me.js.
 */
(function () {
  "use strict";
  var FOLLOW = "vipulFollow";
  var PRESENT = "vipulPresent";
  var GATES = [
    "raisinAccessGranted",
    "olxAccessGranted",
    "n26AccessGranted",
    "gomartAccessGranted",
  ];

  function grant() {
    try {
      GATES.forEach(function (k) {
        sessionStorage.setItem(k, "1");
      });
    } catch (e) {}
  }

  function capture() {
    try {
      var path = location.pathname.replace(/\/+$/, "");
      var m = path.match(/\/f\/([23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz]{6,16})$/);
      var q = new URLSearchParams(location.search).get("f");
      var id = (m && m[1]) || q;
      if (!id) return false;
      sessionStorage.setItem(
        FOLLOW,
        JSON.stringify({
          sessionId: String(id).toUpperCase(),
          participantId: null,
          following: false,
          paused: false,
        })
      );
      grant();
      return true;
    } catch (e) {
      return false;
    }
  }

  function hasSession() {
    try {
      if (sessionStorage.getItem(FOLLOW) || sessionStorage.getItem(PRESENT)) return true;
      var stored = localStorage.getItem(PRESENT);
      if (stored) {
        sessionStorage.setItem(PRESENT, stored);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  var path = location.pathname;
  var presentPage =
    /\/admin\/presentation(\/|$)/.test(path) ||
    (/\/present(\/|$|\.html)/.test(path) && path.indexOf("/admin") === -1);
  capture();
  if (hasSession()) grant();
  if (!presentPage && !hasSession()) return;

  var s = document.createElement("script");
  s.src = "/js/follow-me.js?v=17";
  (document.body || document.head).appendChild(s);
})();
