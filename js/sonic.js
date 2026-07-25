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

  function tone(freq, dur, type, vol, glideTo, force) {
    if (muted) return;
    var c = ensureCtx();
    if (!c) return;
    if (c.state === "suspended") c.resume();

    var now = c.currentTime;
    // light throttle so rapid hovers don't stack into noise; `force` lets the
    // click confirm through even if a hover tone just fired on pointer-enter.
    if (!force && now - lastTone < 0.03) return;
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
  // Click shares the hover's warm sine timbre, pitched a step up and a touch
  // louder (G4 → D5) so it reads as a satisfying "confirm" from the same family.
  function click()     { tone(392, 0.12, "sine", 0.5, 587, true); }
  function splineTone(){ tone(220, 0.18, "sine", 0.4, 330); }

  // Soft bass pluck for the hero dot-grid — a low, rounded tone played per dot
  // the cursor crosses (see js/dot-grid.js). A quick downward pitch drop gives
  // it a bassy "thump"; its own light throttle keeps a fast sweep musical.
  var GRID_NOTES = [130.81, 146.83, 164.81, 196.00, 220.00]; // C3 D3 E3 G3 A3 (bass)
  var lastGrid = 0;
  function gridTick(idx) {
    if (muted) return;
    var c = ensureCtx();
    if (!c) return;
    if (c.state === "suspended") c.resume();
    var now = c.currentTime;
    if (now - lastGrid < 0.045) return; // ~max 22 ticks/sec on a fast sweep
    lastGrid = now;
    var n = ((idx % GRID_NOTES.length) + GRID_NOTES.length) % GRID_NOTES.length;
    var freq = GRID_NOTES[n];
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = "sine"; // clean, round low end
    osc.frequency.setValueAtTime(freq * 1.4, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.06); // bass drop
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.2, now + 0.006); // bass reads quieter, so a touch louder
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  // Futuristic, space-like hover shimmer for the .post-cover component
  // (about page). Two slightly detuned sines sweep upward for an airy, wide
  // sci-fi glide, with a soft high sparkle on top and a long, breathy release.
  var lastSpace = 0;
  function spaceTone() {
    if (muted) return;
    var c = ensureCtx();
    if (!c) return;
    if (c.state === "suspended") c.resume();
    var now = c.currentTime;
    if (now - lastSpace < 0.12) return; // don't stack on rapid re-entry
    lastSpace = now;

    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.14, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    g.connect(master);

    [-6, 6].forEach(function (det) { // detuned pair = shimmer/beating
      var o = c.createOscillator();
      o.type = "sine";
      o.detune.setValueAtTime(det, now);
      o.frequency.setValueAtTime(392, now);                        // G4
      o.frequency.exponentialRampToValueAtTime(1046.5, now + 0.5); // sweep up to C6
      o.connect(g);
      o.start(now);
      o.stop(now + 0.62);
    });

    var s = c.createOscillator(); // sparkle on top
    var sg = c.createGain();
    s.type = "triangle";
    s.frequency.setValueAtTime(1568, now); // G6
    sg.gain.setValueAtTime(0.0001, now);
    sg.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
    sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    s.connect(sg);
    sg.connect(master);
    s.start(now);
    s.stop(now + 0.42);
  }

  // Minimal public API so other scripts (e.g. the hero dot grid) share this one
  // AudioContext, the quiet master level, and the mute toggle.
  window.Sonic = {
    gridTick: gridTick,
    spaceTone: spaceTone,
    tone: tone,
    isMuted: function () { return muted; }
  };

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

    // Click feedback — mirrors the hover coverage so every element that plays a
    // hover tone also plays a matching click tone. Delegated so nested markup
    // and dynamically-added nodes are covered too.
    document.addEventListener("pointerdown", function (e) {
      var match = e.target && e.target.closest ? e.target.closest(hoverSel) : null;
      if (match) click();
    });

    // Spline 3D canvas (about page)
    var spline = document.querySelector("spline-viewer, .spline-3d, .outter_box");
    if (spline) {
      spline.addEventListener("pointerdown", splineTone, { passive: true });
    }

    // Futuristic hover tone — only while the pointer is over the .post-cover
    // component (about page). Fires once on entry, and again on re-entry.
    var lastCover = null;
    document.addEventListener("pointerover", function (e) {
      var match = e.target && e.target.closest ? e.target.closest(".post-cover") : null;
      if (!match) { lastCover = null; return; }
      if (match !== lastCover) { lastCover = match; spaceTone(); }
    });

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
