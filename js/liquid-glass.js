/**
 * Liquid Glass — lightweight interactive glass surfaces.
 *
 * Performance-first: NO WebGL, NO SVG backdrop displacement, NO render loop.
 * The glass look is pure CSS (frosted backdrop + specular highlights). This
 * script only adds cheap touches:
 *   - a cursor-follow sheen by updating --mx/--my CSS variables (rAF-batched)
 *   - a cursor-position 3D tilt on .liquid and .lg-tilt cards (4deg max)
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

  var RIPPLE_SEL = 'a, button, [role="button"], .liquid, .archive__item, .schematic__cell';
  var TILT_SEL = ".liquid, .lg-tilt";
  var MAX_TILT = 4;
  var TILT_PERSPECTIVE = 1000;
  var TILT_FOLLOW = 0.16;
  var TILT_RETURN = 0.14;
  var TILT_EPS = 0.02;
  // Stay active slightly outside the card rect so edge pixels don't flicker.
  var STICKY_PAD = 16;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function smoothAxis(n) {
    var a = clamp(n, -1, 1);
    return a * (2 - Math.abs(a));
  }

  function inRect(x, y, r, pad) {
    var p = pad || 0;
    return (
      x >= r.left - p &&
      x <= r.right + p &&
      y >= r.top - p &&
      y <= r.bottom + p
    );
  }

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

  function setTilt(card, rotateX, rotateY) {
    if (Math.abs(rotateX) < TILT_EPS && Math.abs(rotateY) < TILT_EPS) {
      card.style.removeProperty("transform");
      return;
    }
    card.style.transform =
      "perspective(" + TILT_PERSPECTIVE + "px) rotateX(" +
      rotateX.toFixed(3) + "deg) rotateY(" + rotateY.toFixed(3) + "deg)";
  }

  function initCardMotion() {
    var cards = document.querySelectorAll(TILT_SEL);
    if (!cards.length || coarse || reduce) {
      cards.forEach(function (card) {
        card.addEventListener("touchstart", function () {
          card.classList.add("lg-active");
        }, { passive: true });
        card.addEventListener("touchend", function () {
          card.classList.remove("lg-active");
        }, { passive: true });
      });
      return;
    }

    var states = [];
    var activeState = null;
    var loopId = 0;

    function needsTick(state) {
      if (state.active) return true;
      return (
        Math.abs(state.curX - state.tgtX) > TILT_EPS ||
        Math.abs(state.curY - state.tgtY) > TILT_EPS
      );
    }

    function scheduleLoop() {
      if (loopId) return;
      loopId = requestAnimationFrame(tick);
    }

    function tick() {
      loopId = 0;
      var running = false;

      states.forEach(function (state) {
        if (!needsTick(state)) return;
        running = true;

        var ease = state.active ? TILT_FOLLOW : TILT_RETURN;
        state.curX = lerp(state.curX, state.tgtX, ease);
        state.curY = lerp(state.curY, state.tgtY, ease);

        if (
          Math.abs(state.curX - state.tgtX) < TILT_EPS &&
          Math.abs(state.curY - state.tgtY) < TILT_EPS
        ) {
          state.curX = state.tgtX;
          state.curY = state.tgtY;
          if (!state.active) state.card.style.removeProperty("will-change");
        }

        setTilt(state.card, state.curX, state.curY);
      });

      if (running) scheduleLoop();
    }

    function updateTarget(state, clientX, clientY) {
      var r = state.card.getBoundingClientRect();
      var w = r.width || 1;
      var h = r.height || 1;
      var mx = clamp(clientX - r.left, 0, w);
      var my = clamp(clientY - r.top, 0, h);
      var nx = smoothAxis((mx / w) * 2 - 1);
      var ny = smoothAxis((my / h) * 2 - 1);
      state.tgtX = -ny * MAX_TILT;
      state.tgtY = nx * MAX_TILT;
      if (state.isLiquid) {
        state.card.style.setProperty("--mx", mx + "px");
        state.card.style.setProperty("--my", my + "px");
      }
    }

    function activate(state) {
      if (state.active) return;
      state.active = true;
      state.card.classList.add("lg-active");
      state.card.style.willChange = "transform";
    }

    function deactivate(state) {
      if (!state.active && state.tgtX === 0 && state.tgtY === 0) return;
      state.active = false;
      state.tgtX = 0;
      state.tgtY = 0;
      state.card.classList.remove("lg-active");
      scheduleLoop();
    }

    function findCardAt(x, y) {
      var hit = document.elementFromPoint(x, y);
      if (!hit || !hit.closest) return null;
      var card = hit.closest(TILT_SEL);
      if (!card) return null;
      var r = card.getBoundingClientRect();
      if (!inRect(x, y, r, 0)) return null;
      for (var i = 0; i < states.length; i++) {
        if (states[i].card === card) return states[i];
      }
      return null;
    }

    function onPointerMove(e) {
      var x = e.clientX;
      var y = e.clientY;

      if (activeState) {
        var rect = activeState.card.getBoundingClientRect();
        if (inRect(x, y, rect, STICKY_PAD)) {
          updateTarget(activeState, x, y);
          scheduleLoop();
          return;
        }
        deactivate(activeState);
        activeState = null;
      }

      var next = findCardAt(x, y);
      if (!next) return;
      activeState = next;
      activate(next);
      updateTarget(next, x, y);
      scheduleLoop();
    }

    function releaseAll() {
      if (activeState) {
        deactivate(activeState);
        activeState = null;
      }
    }

    cards.forEach(function (card) {
      states.push({
        card: card,
        isLiquid: card.classList.contains("liquid"),
        active: false,
        curX: 0,
        curY: 0,
        tgtX: 0,
        tgtY: 0
      });

      card.addEventListener("touchstart", function () {
        card.classList.add("lg-active");
      }, { passive: true });
      card.addEventListener("touchend", function () {
        card.classList.remove("lg-active");
      }, { passive: true });
    });

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerdown", onPointerMove, { passive: true });
    window.addEventListener("blur", releaseAll);
    document.addEventListener("pointerout", function (e) {
      if (!e.relatedTarget) releaseAll();
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
    initCardMotion();
    initRipple();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
