/**
 * Google Analytics + Microsoft Clarity — skipped on localhost so dev tab spinner can finish.
 * Production hosts load gtag.js and Clarity as before.
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

  (function (c, l, a, r, i, t, y) {
    c[a] =
      c[a] ||
      function () {
        (c[a].q = c[a].q || []).push(arguments);
      };
    t = l.createElement(r);
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", "y5aklh0g36");
})();
