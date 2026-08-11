/**
 * Liquid Glass — lightweight interactive glass surfaces.
 *
 * Performance-first: NO WebGL, NO SVG backdrop displacement, NO render loop.
 * The glass look is pure CSS (frosted backdrop + specular highlights). This
 * script only adds two cheap touches:
 *   - a cursor-follow sheen by updating --mx/--my CSS variables (rAF-batched)
 *   - a press/touch ripple element (single CSS keyframe, auto-removed)
 *
 * Ripples on all interactive elements site-wide (links, buttons, cards, etc.)
 * but skip the sound toggle. Card sheen stays on .liquid only. Sound is handled
 * separately by sonic.js (.liquid cards only).
 *
 * Respects prefers-reduced-motion (no sheen, no ripple).
 */
(function () {
  "use strict";

  var mm = window.matchMedia;
  var reduce = mm && mm("(prefers-reduced-motion: reduce)").matches;
  var coarse = mm && mm("(pointer: coarse)").matches;

  // Interactive elements that show a press ripple (site-wide).
  var RIPPLE_SEL = 'a, button, [role="button"], .liquid, .archive__item, .schematic__cell';

  function rippleAt(el, clientX, clientY) {
    if (reduce) return;
    var r = el.getBoundingClientRect();
    var px = clientX - r.left;
    var py = clientY - r.top;
    var s = document.createElement("span");
    s.className = "lg-ripple";
    s.style.left = px + "px";
    s.style.top = py + "px";
    el.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 650);
  }

  function rippleTarget(e) {
    var el = e.target && e.target.closest ? e.target.closest(RIPPLE_SEL) : null;
    if (!el || el.id === "sonic-toggle" || el.closest("#sonic-toggle")) return null;
    return el;
  }

  function initSheen() {
    var cards = document.querySelectorAll(".liquid");
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

      if (!coarse && !reduce) {
        card.addEventListener("pointerenter", function () { card.classList.add("lg-active"); });
        card.addEventListener("pointerleave", function () { card.classList.remove("lg-active"); });
        card.addEventListener("pointermove", move);
      }

      card.addEventListener("touchstart", function () {
        card.classList.add("lg-active");
      }, { passive: true });
      card.addEventListener("touchend", function () { card.classList.remove("lg-active"); }, { passive: true });
    });
  }

  function initRipple() {
    document.addEventListener("pointerdown", function (e) {
      var el = rippleTarget(e);
      if (!el) return;
      rippleAt(el, e.clientX, e.clientY);
    });
  }

  function init() {
    initSheen();
    initRipple();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
