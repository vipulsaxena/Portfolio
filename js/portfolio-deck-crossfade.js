/**
 * Stacked slide crossfade for OLX / N26 / GoMart presentation decks.
 * Timing: css/portfolio-deck-motion.css (--deck-dur).
 */
(function (global) {
  "use strict";

  var FADE_MS = 380;
  var reduceMq = global.matchMedia("(prefers-reduced-motion: reduce)");
  var leavingTimer = null;

  function apply(slides, prevIdx, nextIdx) {
    if (!slides || !slides.length) return;
    if (leavingTimer) {
      global.clearTimeout(leavingTimer);
      leavingTimer = null;
    }

    prevIdx = Math.max(0, Math.min(slides.length - 1, prevIdx));
    nextIdx = Math.max(0, Math.min(slides.length - 1, nextIdx));

    if (reduceMq.matches || prevIdx === nextIdx) {
      slides.forEach(function (s, idx) {
        s.classList.toggle("is-active", idx === nextIdx);
        s.classList.remove("is-leaving");
        if (idx === nextIdx) s.scrollTop = 0;
      });
      return;
    }

    var prev = slides[prevIdx];
    var next = slides[nextIdx];

    slides.forEach(function (s, idx) {
      if (idx !== prevIdx && idx !== nextIdx) {
        s.classList.remove("is-active", "is-leaving");
      }
    });

    if (prev) {
      prev.classList.remove("is-active");
      prev.classList.add("is-leaving");
    }

    if (next) {
      global.requestAnimationFrame(function () {
        global.requestAnimationFrame(function () {
          next.classList.add("is-active");
          next.classList.remove("is-leaving");
          next.scrollTop = 0;
        });
      });
    }

    if (prev && prevIdx !== nextIdx) {
      leavingTimer = global.setTimeout(function () {
        prev.classList.remove("is-leaving");
        leavingTimer = null;
      }, FADE_MS);
    }
  }

  global.PortfolioDeckCrossfade = {
    FADE_MS: FADE_MS,
    apply: apply,
  };
})(window);
