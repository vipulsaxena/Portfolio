/**
 * Load Spline viewer after idle so the scene does not compete with first paint.
 */
(function () {
  "use strict";

  if (!document.querySelector("spline-viewer")) return;

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
