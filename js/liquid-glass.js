/**
 * Liquid Glass — lightweight interactive glass surfaces.
 *
 * Performance-first: NO WebGL, NO SVG backdrop displacement, NO render loop.
 * The glass look is pure CSS (frosted backdrop + specular highlights). This
 * script only adds two cheap touches:
 *   - a cursor-follow sheen by updating --mx/--my CSS variables (rAF-batched)
 *   - a press/touch ripple element (single CSS keyframe, auto-removed)
 *
 * Respects prefers-reduced-motion (no sheen, no ripple).
 */
(function () {
  "use strict";

  var mm = window.matchMedia;
  var reduce = mm && mm("(prefers-reduced-motion: reduce)").matches;
  var coarse = mm && mm("(pointer: coarse)").matches;

  function init() {
    var cards = document.querySelectorAll(".liquid");
    if (!cards.length) return;

    cards.forEach(function (card) {
      var raf = 0, mx = 0, my = 0;

      function apply() {
        raf = 0;
        card.style.setProperty("--mx", mx + "px");
        card.style.setProperty("--my", my + "px");
      }
      function move(e) {
        var r = card.getBoundingClientRect();
        mx = e.clientX - r.left;
        my = e.clientY - r.top;
        if (!raf) raf = requestAnimationFrame(apply);
      }

      // Desktop cursor sheen
      if (!coarse && !reduce) {
        card.addEventListener("pointerenter", function () { card.classList.add("lg-active"); });
        card.addEventListener("pointerleave", function () { card.classList.remove("lg-active"); });
        card.addEventListener("pointermove", move);
      }

      function ripple(e) {
        if (reduce) return;
        var r = card.getBoundingClientRect();
        var px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        var py = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
        var s = document.createElement("span");
        s.className = "lg-ripple";
        s.style.left = px + "px";
        s.style.top = py + "px";
        card.appendChild(s);
        setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 650);
      }

      card.addEventListener("pointerdown", ripple);
      card.addEventListener("touchstart", function (e) {
        card.classList.add("lg-active");
        ripple(e);
      }, { passive: true });
      card.addEventListener("touchend", function () { card.classList.remove("lg-active"); }, { passive: true });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
