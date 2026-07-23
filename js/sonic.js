/**
 * Sonic — a muted, native Web Audio feedback layer.
 *
 * Subtle, quiet micro-tones on hover (cards + clickable elements), press, and
 * Spline canvas interaction. No external libraries or audio files — everything
 * is synthesised. Lazy AudioContext (created on first user gesture per browser
 * autoplay policy). Mute toggle in the header + Ctrl+M, persisted in
 * localStorage. Respects prefers-reduced-motion (starts muted).
 */
(function () {
  "use strict";

  var KEY = "sonic-muted";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  // default: ON, unless reduced-motion is requested or the user muted before
  var muted = stored === null ? reduceMotion : stored === "1";

  var ctx = null;
  var master = null;
  var lastTone = 0;

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.06; // keep everything quiet
    master.connect(ctx.destination);
    return ctx;
  }

  function tone(freq, dur, type, vol, glideTo) {
    if (muted) return;
    var c = ensureCtx();
    if (!c) return;
    if (c.state === "suspended") c.resume();

    var now = c.currentTime;
    // light throttle so rapid hovers don't stack into noise
    if (now - lastTone < 0.03) return;
    lastTone = now;

    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, now);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, now + dur);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol || 0.5, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // Distinct sounds
  // Soft, warm rising blip on hover (sine, D4 → A4) — gentle and on-brand.
  function hover()     { tone(294, 0.1, "sine", 0.3, 440); }
  function click()     { tone(880, 0.09, "triangle", 0.6, 1320); }
  function splineTone(){ tone(220, 0.18, "sine", 0.4, 330); }

  /* ---------------------------------------------------------------- toggle -- */
  function buildToggle() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "sonic-toggle";
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
    btn.setAttribute("aria-label", "Toggle interface sound");
    render(btn);
    btn.addEventListener("click", function () { setMuted(!muted); if (!muted) click(); });
    var host = document.getElementById("cta-cluster") || document.body;
    host.appendChild(btn);
    return btn;
  }

  function render(btn) {
    btn.innerHTML = '<span class="dot"></span>' + (muted ? "sound: off" : "sound: on");
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
  }

  var toggleEl = null;
  function setMuted(v) {
    muted = v;
    try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch (e) {}
    if (toggleEl) render(toggleEl);
  }

  /* ----------------------------------------------------------------- wire --- */
  function init() {
    toggleEl = buildToggle();

    // Hover feedback — cards + every clickable element on the page. Delegated so
    // nested markup and dynamically-added nodes are covered without stacking the
    // sound (only fires when the pointer enters a *new* matching element).
    var hoverSel = 'a, button, [role="button"], .liquid, .archive__item, .schematic__cell';
    var lastHoverEl = null;
    document.addEventListener("pointerover", function (e) {
      var match = e.target && e.target.closest ? e.target.closest(hoverSel) : null;
      if (!match) { lastHoverEl = null; return; }
      if (match !== lastHoverEl) { lastHoverEl = match; hover(); }
    });

    // Click feedback.
    var clickSel = ".liquid a, .liquid button, .button, a.hotlinks, .archive__item a, .trg_cnt";
    document.querySelectorAll(clickSel).forEach(function (el) {
      el.addEventListener("pointerdown", click);
    });

    // Spline 3D canvas (about page)
    var spline = document.querySelector("spline-viewer, .spline-3d, .outter_box");
    if (spline) {
      spline.addEventListener("pointerdown", splineTone, { passive: true });
    }

    // Ctrl+M / Cmd+M toggle
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        setMuted(!muted);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
