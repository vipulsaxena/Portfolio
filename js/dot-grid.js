/**
 * Magnetic dot grid — hero background (index.html).
 *
 * Dots scale and pull toward the cursor. Dots in the influence zone tint from
 * the active AI color palette (js/custom.js → window.OrbPalette).
 */
(function () {
  "use strict";

  var field = document.querySelector(".patterns--dots");
  if (!field) return;

  var mm = window.matchMedia;
  var reduce = mm && mm("(prefers-reduced-motion: reduce)").matches;

  var SPACING = 22;
  var RADIUS  = 220;
  var MAX     = 3.2;   // peak scale at the cursor (was 4.0)
  var PULL    = 0.78;

  var DOT_IDLE =
    "radial-gradient(circle at center, #000 1px, transparent 1.4px)";

  var hero = field.closest(".hero") || field.parentElement;
  var dots = [];
  var palette = ["#3096FF", "#ffda08", "#603cba"];

  function syncPalette() {
    var p = window.OrbPalette;
    if (p && p.colors && p.colors.length) palette = p.colors.slice();
  }

  syncPalette();
  window.addEventListener("orb-palette-change", syncPalette);

  function hexChannels(hex) {
    var h = String(hex).replace("#", "");
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16)
    ];
  }

  function lerpChannel(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function paletteSmooth(ang) {
    var n = palette.length;
    if (n === 0) return [48, 150, 255];
    if (n === 1) return hexChannels(palette[0]);
    var t = (ang + Math.PI) / (Math.PI * 2);
    t = t - Math.floor(t);
    var f = t * n;
    var i = Math.floor(f) % n;
    var j = (i + 1) % n;
    var u = smoothstep(f - Math.floor(f));
    var a = hexChannels(palette[i]);
    var b = hexChannels(palette[j]);
    return [
      lerpChannel(a[0], b[0], u),
      lerpChannel(a[1], b[1], u),
      lerpChannel(a[2], b[2], u)
    ];
  }

  function coreBlend() {
    var n = palette.length;
    if (n === 0) return [48, 150, 255];
    var r = 0;
    var g = 0;
    var b = 0;
    for (var k = 0; k < n; k++) {
      var c = hexChannels(palette[k]);
      r += c[0];
      g += c[1];
      b += c[2];
    }
    return [r / n, g / n, b / n];
  }

  function pickRgb(dx, dy, f) {
    var ang = Math.atan2(dy, dx);
    var edge = paletteSmooth(ang);
    var core = coreBlend();
    var coh = smoothstep(Math.min(1, f * 1.05));
    coh = coh * coh;
    return [
      lerpChannel(edge[0], core[0], coh),
      lerpChannel(edge[1], core[1], coh),
      lerpChannel(edge[2], core[2], coh)
    ];
  }

  function dotColor(rgb, lift) {
    var rim = 1 - lift;
    var r = Math.round(rgb[0] * lift + 12 * rim);
    var g = Math.round(rgb[1] * lift + 12 * rim);
    var b = Math.round(rgb[2] * lift + 12 * rim);
    return (
      "radial-gradient(circle at center, rgb(" +
      r + "," + g + "," + b + ") 1.1px, transparent 1.55px)"
    );
  }

  function build(intro) {
    var w = field.clientWidth;
    var h = field.clientHeight;
    var cols = Math.max(1, Math.floor(w / SPACING));
    var rows = Math.max(1, Math.floor(h / SPACING));

    field.style.setProperty("--cols", cols);
    field.classList.add("dots-live");
    field.textContent = "";
    dots = [];

    var frag = document.createDocumentFragment();
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var d = document.createElement("span");
        d.className = "d";
        d.style.setProperty("--row", r);
        frag.appendChild(d);
        dots.push({
          el: d,
          cx: c * SPACING + SPACING / 2,
          cy: r * SPACING + SPACING / 2,
          s: 1,
          tx: 0,
          ty: 0,
          bg: DOT_IDLE
        });
      }
    }
    field.appendChild(frag);

    if (intro && !reduce) {
      field.classList.add("dots-intro");
      setTimeout(function () { field.classList.remove("dots-intro"); }, 900 + rows * 90);
    }
  }

  var mx = 0;
  var my = 0;
  var active = false;
  var raf = 0;
  var lastCol = -1;
  var lastRow = -1;

  function update() {
    raf = 0;
    syncPalette();
    var rect = field.getBoundingClientRect();
    var lx = mx - rect.left;
    var ly = my - rect.top;

    if (active && lx >= 0 && ly >= 0 && lx <= rect.width && ly <= rect.height) {
      var col = Math.floor(lx / SPACING);
      var row = Math.floor(ly / SPACING);
      if (col !== lastCol || row !== lastRow) {
        lastCol = col;
        lastRow = row;
        if (window.Sonic && window.Sonic.gridTick) window.Sonic.gridTick(col + row);
      }
    } else {
      lastCol = lastRow = -1;
    }

    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      var s = 1;
      var tx = 0;
      var ty = 0;
      var bg = DOT_IDLE;

      if (active) {
        var dx = lx - dot.cx;
        var dy = ly - dot.cy;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < RADIUS) {
          var f = 1 - dist / RADIUS;
          s = 1 + f * (MAX - 1);
          var pull = f * PULL;
          tx = dx * pull;
          ty = dy * pull;

          if (f > 0.08) {
            bg = dotColor(pickRgb(dx, dy, f), 0.25 + 0.75 * f);
          }
        }
      }

      if (s !== dot.s || tx !== dot.tx || ty !== dot.ty) {
        dot.s = s;
        dot.tx = tx;
        dot.ty = ty;
        dot.el.style.transform =
          "translate(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px) scale(" + s.toFixed(3) + ")";
      }
      if (bg !== dot.bg) {
        dot.bg = bg;
        dot.el.style.background = bg;
      }
    }
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(update);
  }

  build(true);

  if (!reduce) {
    hero.addEventListener("pointermove", function (e) {
      mx = e.clientX;
      my = e.clientY;
      active = true;
      schedule();
    });
    hero.addEventListener("pointerleave", function () {
      active = false;
      schedule();
    });
  }

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { build(false); }, 200);
  });
})();
