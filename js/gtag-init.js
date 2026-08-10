/**
 * Google Analytics — skipped on localhost so dev tab spinner can finish.
 * Production hosts load gtag.js as before.
 */
(function () {
  "use strict";

  var host = location.hostname;
  var isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local");

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  if (isLocal) return;

  window.gtag("js", new Date());
  window.gtag("config", "G-35LE56GGGS");
  window.gtag("config", "GT-5TN254F");

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=G-35LE56GGGS";
  document.head.appendChild(s);
})();
