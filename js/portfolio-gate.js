/**
 * Client-side portfolio case-study gate — compares SHA-256 of entered password
 * to a stored hash (password is never stored in plaintext in source).
 * Not server-grade security; raises the bar above view-source plaintext.
 */
(function (global) {
  "use strict";

  var EXPECTED_SHA256 = "28f0ee33f463deb755ce881ff9987ab2e6cf13844f03246eaf775680d2ca0f92";

  function sha256Hex(text) {
    if (!global.crypto || !global.crypto.subtle) {
      return Promise.reject(new Error("Secure context required for password verification"));
    }
    var data = new TextEncoder().encode(text);
    return global.crypto.subtle.digest("SHA-256", data).then(function (buf) {
      return Array.from(new Uint8Array(buf))
        .map(function (b) { return b.toString(16).padStart(2, "0"); })
        .join("");
    });
  }

  function verifyPortfolioPassword(input) {
    return sha256Hex(String(input)).then(function (hash) {
      return hash === EXPECTED_SHA256;
    });
  }

  function grantSession(key) {
    try { sessionStorage.setItem(key, "1"); } catch (_) {}
  }

  global.PortfolioGate = {
    verify: verifyPortfolioPassword,
    grant: grantSession
  };
})(window);
