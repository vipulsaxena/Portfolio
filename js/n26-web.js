/* ==========================================================================
   N26 web mode — journey nav, video replay, autoplay-in-view
   Reveal + lightbox handled by raisin-assets/main.js + summary2.js
   ========================================================================== */
(function () {
  "use strict";

  /* Video autoplay when in viewport */
  var vids = Array.prototype.slice.call(document.querySelectorAll("video[data-autoplay-inview]"));
  if ("IntersectionObserver" in window && vids.length) {
    var vIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting && e.intersectionRatio >= 0.4) {
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: [0, 0.4, 0.75] }
    );
    vids.forEach(function (v) { vIo.observe(v); });
  }

  /* Play again buttons */
  document.querySelectorAll("[data-replay]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var card = btn.closest(".n26-hypo-row") || btn.closest(".n26-launch-phones") || btn.closest(".n26-outcome-visual") || btn.parentElement;
      var v = card && card.querySelector("video");
      if (!v) return;
      v.currentTime = 0;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
  });
})();
