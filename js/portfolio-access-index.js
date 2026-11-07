/**
 * Homepage: grant from ?password=, optional ?open=company, direct navigation when unlocked.
 */
(function () {
  "use strict";

  var COMPANY_PAGES = {
    raisin: "raisin.html",
    olx: "olx.html",
    n26: "n26.html",
    gomart: "gomart.html",
  };

  function gate() {
    return window.PortfolioGate;
  }

  function hasGateSession(G) {
    try {
      return G.GATE_KEYS.some(function (k) {
        return sessionStorage.getItem(k) === "1";
      });
    } catch (_) {
      return false;
    }
  }

  function portfolioUnlocked(G) {
    if (G && G.hasUrlAccess && G.hasUrlAccess()) return true;
    return G && hasGateSession(G);
  }

  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function navigateToCaseStudy(company) {
    var G = gate();
    var dest = COMPANY_PAGES[company];
    if (!dest) return;
    var href = G && G.appendAccessParam ? G.appendAccessParam(dest) : dest;
    location.assign(href);
  }

  onReady(function () {
    document.addEventListener(
      "click",
      function (e) {
        var a = e.target.closest(".trg_cnt[data-company] a");
        if (a && (a.getAttribute("href") === "#" || a.getAttribute("href") === "")) {
          e.preventDefault();
        }
      },
      true
    );

    var G = gate();
    if (!G) return;

    G.applyUrlAccessGrant();

    var params = new URLSearchParams(location.search);
    var open = (params.get("open") || "").toLowerCase();
    if (open && COMPANY_PAGES[open] && portfolioUnlocked(G)) {
      location.replace(G.appendAccessParam(COMPANY_PAGES[open]));
      return;
    }

    if (!portfolioUnlocked(G)) return;

    document.addEventListener(
      "click",
      function (e) {
        if (e.button !== 0) return;
        var card = e.target.closest(".trg_cnt[data-company]");
        if (!card) return;
        var company = card.getAttribute("data-company");
        if (!company || !COMPANY_PAGES[company]) return;
        if (!portfolioUnlocked(gate())) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        navigateToCaseStudy(company);
      },
      true
    );
  });
})();
