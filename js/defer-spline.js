/**
 * Load Spline viewer after idle (production) or skip on localhost — the
 * runtime + scene fetch can keep the browser tab spinner going indefinitely.
 */
(function () {
  "use strict";

  if (!document.querySelector("spline-viewer")) return;

  var host = location.hostname;
  var isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local");

  if (isLocal) return;

  function load() {
    var s = document.createElement("script");
    s.type = "module";
    s.src = "https://unpkg.com/@splinetool/viewer@1.0.76/build/spline-viewer.js";
    document.head.appendChild(s);
  }

  if ("requestIdleCallback" in window) {
    requestIdleCallback(load, { timeout: 4000 });
  } else {
    window.addEventListener("load", function () {
      setTimeout(load, 1);
    });
  }
})();
