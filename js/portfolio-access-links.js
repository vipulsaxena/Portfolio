/**
 * Preserve ?password= on same-origin navigations while URL access is active.
 */
(function () {
  "use strict";

  document.addEventListener(
    "click",
    function (e) {
      var Gate = window.PortfolioGate;
      if (!Gate || !Gate.activeUrlPassword) return;
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var a = e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      if (!Gate.activeUrlPassword()) return;

      var raw = a.getAttribute("href");
      if (!raw || raw === "#" || raw.charAt(0) === "#" || /^javascript:/i.test(raw)) return;

      var next = Gate.appendAccessParam(raw);
      if (next !== raw) a.setAttribute("href", next);
    },
    true
  );
})();
