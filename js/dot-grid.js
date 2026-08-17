/**
 * Magnetic dot grid — hero background (index.html).
 *
 * Dots react to the cursor with soft easing (no spring) plus ripple waves on
 * fast movement. Clicking the hero flips the field between attract and repel.
 * Colors sync with AI palette (window.OrbPalette).
 *
 * There are several hundred dots, so the hot loop avoids per-dot allocation,
 * quantises colors into a lookup table, and skips DOM writes that would not
 * change what is already on screen.
 */
(function () {
  "use strict";

  var field = document.querySelector(".patterns--dots");
  if (!field) return;

  var mm = window.matchMedia;
  var reduce = mm && mm("(prefers-reduced-motion: reduce)").matches;

  var SPACING = 22;
  var FOLLOW_MIN = 0.07;
  var FOLLOW_MAX = 0.22;
  var FOLLOW_REST = 0.1;
  var RIPPLE_DECAY = 0.0013;
  var RIPPLE_LIFE = 3400;
  var MAX_RIPPLES = 8;
  var SETTLE = 0.04;

  // Color buckets. Tinting depends only on angle and influence, so the gradient
  // strings can be built once and reused instead of per dot, per frame.
  var ANG_STEPS = 48;
  var F_STEPS = 24;
  var ANG_SCALE = ANG_STEPS / (Math.PI * 2);
  var IDLE_INDEX = -1;

  var DOT_IDLE =
    "radial-gradient(circle at center, #000 1px, transparent 1.4px)";

  var hero = field.closest(".hero") || field.parentElement;
  var dots = [];
  var palette = ["#3096FF", "#ffda08", "#603cba"];
  var paletteRgb = [];
  var coreRgb = [48, 150, 255];
  var edgeTable = [];
  var bgCache = [];
  var ripples = [];

  // Scratch outputs — force and ripple math writes here rather than returning
  // a fresh vector for every dot on every frame.
  var outX = 0;
  var outY = 0;
  var ripX = 0;
  var ripY = 0;

  /* ---- Field modes ------------------------------------------------------
     radius : size of the impact zone
     max    : peak dot scale at the cursor
     force  : displacement for a dot, given the vector toward the cursor
     -------------------------------------------------------------------- */
  var MODES = [
    {
      id: "attract",
      radius: 220,
      max: 3.2,
      force: function (dx, dy, dist, f) {
        var p = f * 0.88;
        outX = dx * p;
        outY = dy * p;
      }
    },
    {
      id: "repel",
      radius: 220,
      max: 2.5,
      force: function (dx, dy, dist, f) {
        var p = f * 0.62;
        outX = -dx * p;
        outY = -dy * p;
      }
    }
  ];

  var mode = MODES[0];

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

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function paletteSmooth(ang) {
    var n = paletteRgb.length;
    if (n === 0) return [48, 150, 255];
    if (n === 1) return paletteRgb[0].slice();
    var t = (ang + Math.PI) / (Math.PI * 2);
    t = t - Math.floor(t);
    var f = t * n;
    var i = Math.floor(f) % n;
    var j = (i + 1) % n;
    var u = smoothstep(f - Math.floor(f));
    var a = paletteRgb[i];
    var b = paletteRgb[j];
    return [
      lerpChannel(a[0], b[0], u),
      lerpChannel(a[1], b[1], u),
      lerpChannel(a[2], b[2], u)
    ];
  }

  // Rebuilt only when the AI palette changes, never inside the render loop.
  function rebuildColors() {
    var i;
    var r = 0;
    var g = 0;
    var b = 0;

    paletteRgb = [];
    for (i = 0; i < palette.length; i++) {
      paletteRgb.push(hexChannels(palette[i]));
      r += paletteRgb[i][0];
      g += paletteRgb[i][1];
      b += paletteRgb[i][2];
    }

    if (paletteRgb.length) {
      coreRgb = [r / paletteRgb.length, g / paletteRgb.length, b / paletteRgb.length];
    }

    edgeTable = [];
    for (i = 0; i < ANG_STEPS; i++) {
      edgeTable.push(paletteSmooth(((i + 0.5) / ANG_STEPS) * Math.PI * 2 - Math.PI));
    }

    bgCache = [];
  }

  function syncPalette() {
    var p = window.OrbPalette;
    if (!p || !p.colors || !p.colors.length) return;
    palette = p.colors.slice();
    rebuildColors();
  }

  rebuildColors();
  syncPalette();
  window.addEventListener("orb-palette-change", syncPalette);

  function buildGradient(angIndex, fIndex) {
    var fv = (fIndex + 0.5) / F_STEPS;
    var edge = edgeTable[angIndex];
    var coh = smoothstep(Math.min(1, fv * 1.05));
    coh = coh * coh;
    var lift = 0.25 + 0.75 * fv;
    var rim = 1 - lift;
    var r = Math.round(lerpChannel(edge[0], coreRgb[0], coh) * lift + 12 * rim);
    var g = Math.round(lerpChannel(edge[1], coreRgb[1], coh) * lift + 12 * rim);
    var b = Math.round(lerpChannel(edge[2], coreRgb[2], coh) * lift + 12 * rim);
    return (
      "radial-gradient(circle at center, rgb(" +
      r + "," + g + "," + b + ") 1.1px, transparent 1.55px)"
    );
  }

  function colorIndex(dx, dy, f) {
    var a = ((Math.atan2(dy, dx) + Math.PI) * ANG_SCALE) | 0;
    if (a < 0) a = 0;
    else if (a >= ANG_STEPS) a = ANG_STEPS - 1;

    var fi = (f * F_STEPS) | 0;
    if (fi < 0) fi = 0;
    else if (fi >= F_STEPS) fi = F_STEPS - 1;

    return a * F_STEPS + fi;
  }

  function gradientAt(index) {
    var s = bgCache[index];
    if (s === undefined) {
      s = buildGradient((index / F_STEPS) | 0, index % F_STEPS);
      bgCache[index] = s;
    }
    return s;
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
          x: 0,
          y: 0,
          s: 1,
          ci: IDLE_INDEX,
          tf: ""
        });
      }
    }
    field.appendChild(frag);

    if (intro && !reduce) {
      field.classList.add("dots-intro");
      setTimeout(function () { field.classList.remove("dots-intro"); }, 900 + rows * 90);
    }
  }

  function pushRipple(x, y, amp) {
    ripples.push({ x: x, y: y, t: performance.now(), amp: amp });
    if (ripples.length > MAX_RIPPLES) ripples.shift();
  }

  function rippleOffset(dot, now, reach) {
    var i;
    var rip;
    var age;
    var rdx;
    var rdy;
    var rd;
    var wave;

    ripX = 0;
    ripY = 0;

    for (i = 0; i < ripples.length; i++) {
      rip = ripples[i];
      rdx = dot.cx - rip.x;
      if (rdx > reach || rdx < -reach) continue;
      rdy = dot.cy - rip.y;
      if (rdy > reach || rdy < -reach) continue;

      rd = Math.sqrt(rdx * rdx + rdy * rdy);
      if (rd > reach) continue;
      if (rd < 0.001) rd = 0.001;

      age = now - rip.t;
      wave =
        (Math.sin(rd * 0.065 - age * 0.008) * 0.72 +
          Math.sin(rd * 0.11 - age * 0.012) * 0.28) *
        rip.amp *
        Math.exp(-age * RIPPLE_DECAY) *
        (1 - rd / reach);

      ripX += (rdx / rd) * wave * 0.82;
      ripY += (rdy / rd) * wave * 0.82;
    }
  }

  var mx = 0;
  var my = 0;
  var plx = 0;
  var ply = 0;
  var active = false;
  var raf = 0;
  var lastCol = -1;
  var lastRow = -1;

  function setMode(next) {
    mode = next;
    field.setAttribute("data-dot-mode", mode.id);
    if (window.FieldMode) {
      if (window.FieldMode.id !== mode.id) window.FieldMode.setMode(mode.id);
    } else {
      window.dispatchEvent(
        new CustomEvent("field-mode-change", { detail: { mode: mode.id } })
      );
    }
  }

  function cycleMode() {
    var next = mode;
    if (MODES.length > 1) {
      while (next === mode) {
        next = MODES[Math.floor(Math.random() * MODES.length)];
      }
    }
    setMode(next);
  }

  function update() {
    raf = 0;

    var now = performance.now();
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

    var radius = mode.radius;
    var reach = radius * 1.2;
    var maxScale = mode.max;
    var moving = false;
    var live = 0;
    var i;
    var dot;
    var targetX;
    var targetY;
    var targetS;
    var ci;
    var dx;
    var dy;
    var dist;
    var f;
    var follow;
    var tf;

    // Drop expired ripples in place — filter() would allocate every frame.
    for (i = ripples.length - 1; i >= 0; i--) {
      if (now - ripples[i].t >= RIPPLE_LIFE) ripples.splice(i, 1);
    }
    live = ripples.length;
    if (live) moving = true;

    for (i = 0; i < dots.length; i++) {
      dot = dots[i];
      targetX = 0;
      targetY = 0;
      targetS = 1;
      ci = IDLE_INDEX;
      follow = FOLLOW_REST;

      // Box test first: most dots sit outside the zone, so they never reach
      // the square root or the force call.
      if (active) {
        dx = lx - dot.cx;
        if (dx < radius && dx > -radius) {
          dy = ly - dot.cy;
          if (dy < radius && dy > -radius) {
            dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < radius) {
              f = 1 - dist / radius;
              targetS = 1 + f * (maxScale - 1);

              mode.force(dx, dy, dist, f);
              targetX = outX;
              targetY = outY;
              follow = FOLLOW_MIN + f * (FOLLOW_MAX - FOLLOW_MIN);

              if (f > 0.08) ci = colorIndex(dx, dy, f);
            }
          }
        }
      }

      if (live && !reduce) {
        rippleOffset(dot, now, Math.max(reach, radius * 3.4));
        targetX += ripX;
        targetY += ripY;
      }

      if (reduce) {
        dot.x = targetX;
        dot.y = targetY;
        dot.s = targetS;
      } else {
        dot.x = lerp(dot.x, targetX, follow);
        dot.y = lerp(dot.y, targetY, follow);
        dot.s = lerp(dot.s, targetS, follow);

        if (
          Math.abs(targetX - dot.x) > SETTLE ||
          Math.abs(targetY - dot.y) > SETTLE ||
          Math.abs(targetS - dot.s) > 0.003
        ) {
          moving = true;
        }
      }

      tf =
        "translate3d(" + dot.x.toFixed(1) + "px," + dot.y.toFixed(1) + "px,0) scale(" +
        dot.s.toFixed(2) + ")";
      if (tf !== dot.tf) {
        dot.tf = tf;
        dot.el.style.transform = tf;
      }

      if (ci !== dot.ci) {
        dot.ci = ci;
        dot.el.style.background = ci === IDLE_INDEX ? DOT_IDLE : gradientAt(ci);
      }
    }

    if (active || moving) schedule();
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(update);
  }

  function onClick(e) {
    if (e.target.closest && e.target.closest("a, button, .tooltip")) return;
    cycleMode();
  }

  var initialMode = MODES[0];
  if (window.FieldMode && window.FieldMode.id) {
    for (var mi = 0; mi < MODES.length; mi++) {
      if (MODES[mi].id === window.FieldMode.id) {
        initialMode = MODES[mi];
        break;
      }
    }
  }

  setMode(initialMode);
  build(true);

  window.addEventListener("field-mode-change", function (e) {
    var id = e.detail && e.detail.mode;
    var i;
    if (!id || mode.id === id) return;
    for (i = 0; i < MODES.length; i++) {
      if (MODES[i].id === id) {
        mode = MODES[i];
        field.setAttribute("data-dot-mode", mode.id);
        break;
      }
    }
  });

  if (!reduce) {
    hero.addEventListener("pointermove", function (e) {
      var rect = field.getBoundingClientRect();
      var nlx = e.clientX - rect.left;
      var nly = e.clientY - rect.top;
      var mdx = nlx - plx;
      var mdy = nly - ply;
      var speed = Math.sqrt(mdx * mdx + mdy * mdy);

      if (plx || ply) {
        if (speed > 3) {
          pushRipple(nlx, nly, Math.min(speed * 0.28, 22));
        }
      }

      plx = nlx;
      ply = nly;
      mx = e.clientX;
      my = e.clientY;
      active = true;
      schedule();
    }, { passive: true });

    hero.addEventListener("pointerleave", function () {
      active = false;
      plx = 0;
      ply = 0;
      lastCol = lastRow = -1;
      schedule();
    }, { passive: true });
  } else {
    hero.addEventListener("pointermove", function (e) {
      mx = e.clientX;
      my = e.clientY;
      active = true;
      update();
    }, { passive: true });
    hero.addEventListener("pointerleave", function () {
      active = false;
      lastCol = lastRow = -1;
      update();
    }, { passive: true });
  }

  hero.addEventListener("click", onClick);

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      ripples = [];
      plx = 0;
      ply = 0;
      build(false);
    }, 200);
  });
})();
