/**
 * Magnetic dot grid — hero background (index.html).
 *
 * Dots react to the cursor with soft easing (no spring) plus ripple waves on
 * fast movement. Clicking the hero swaps to a random field mode — each mode
 * changes the force direction, the shape of the impact zone, or its intensity.
 * Colors sync with AI palette (window.OrbPalette).
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
  var RIPPLE_DECAY = 0.002;
  var MAX_RIPPLES = 8;
  var SETTLE = 0.04;

  var DOT_IDLE =
    "radial-gradient(circle at center, #000 1px, transparent 1.4px)";

  var hero = field.closest(".hero") || field.parentElement;
  var dots = [];
  var palette = ["#3096FF", "#ffda08", "#603cba"];
  var ripples = [];

  // Force functions write here instead of allocating a vector each dot/frame.
  var outX = 0;
  var outY = 0;

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
    },
    {
      id: "vortex",
      radius: 260,
      max: 3.4,
      force: function (dx, dy, dist, f) {
        var p = f * 0.95;
        outX = -dy * p;
        outY = dx * p;
      }
    },
    {
      // Each dot is placed on its own orbit around the cursor: pulled inward
      // and revolved over time, faster the closer it sits, so the dots wind
      // around the pointer instead of the whole grid shearing.
      id: "spiral",
      radius: 160,
      max: 2.4,
      force: function (dx, dy, dist, f, dot, now) {
        var ease = f * f;
        var ang = Math.atan2(-dy, -dx) + ease * 0.75 + now * 0.0005 * ease;
        var orbit = dist * (1 - ease * 0.3);
        outX = dx + Math.cos(ang) * orbit;
        outY = dy + Math.sin(ang) * orbit;
      }
    }
  ];

  var mode = MODES[0];

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

  function lerp(a, b, t) {
    return a + (b - a) * t;
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

  function influence(dist) {
    var t = 1 - dist / mode.radius;
    return t > 0 ? t : 0;
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

  function pushRipple(x, y, amp) {
    ripples.push({ x: x, y: y, t: performance.now(), amp: amp });
    if (ripples.length > MAX_RIPPLES) ripples.shift();
  }

  function rippleOffset(dot, now) {
    var wx = 0;
    var wy = 0;
    var i;
    var rip;
    var age;
    var rdx;
    var rdy;
    var rd;
    var falloff;
    var wave;

    for (i = 0; i < ripples.length; i++) {
      rip = ripples[i];
      age = now - rip.t;
      if (age > 2600) continue;

      rdx = dot.cx - rip.x;
      rdy = dot.cy - rip.y;
      rd = Math.sqrt(rdx * rdx + rdy * rdy) || 0.001;
      falloff = Math.max(0, 1 - rd / (mode.radius * 1.2));
      wave =
        Math.sin(rd * 0.07 - age * 0.009) *
        rip.amp *
        Math.exp(-age * RIPPLE_DECAY) *
        falloff;

      wx += (rdx / rd) * wave * 0.55;
      wy += (rdy / rd) * wave * 0.55;
    }

    return { x: wx, y: wy };
  }

  var mx = 0;
  var my = 0;
  var plx = 0;
  var ply = 0;
  var active = false;
  var raf = 0;

  function setMode(next) {
    mode = next;
    field.setAttribute("data-dot-mode", mode.id);
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
    syncPalette();
    var now = performance.now();
    var rect = field.getBoundingClientRect();
    var lx = mx - rect.left;
    var ly = my - rect.top;
    var moving = false;
    var i;
    var dot;
    var targetX;
    var targetY;
    var targetS;
    var bg;
    var dx;
    var dy;
    var dist;
    var f;
    var follow;
    var rip;

    ripples = ripples.filter(function (r) { return now - r.t < 2800; });
    if (ripples.length) moving = true;

    for (i = 0; i < dots.length; i++) {
      dot = dots[i];
      targetX = 0;
      targetY = 0;
      targetS = 1;
      bg = DOT_IDLE;
      follow = FOLLOW_REST;

      if (active) {
        dx = lx - dot.cx;
        dy = ly - dot.cy;
        dist = Math.sqrt(dx * dx + dy * dy);
        f = influence(dist);

        if (f > 0) {
          targetS = 1 + f * (mode.max - 1);

          mode.force(dx, dy, dist, f, dot, now);
          targetX = outX;
          targetY = outY;
          follow = FOLLOW_MIN + f * (FOLLOW_MAX - FOLLOW_MIN);

          if (f > 0.08) {
            bg = dotColor(pickRgb(dx, dy, f), 0.25 + 0.75 * f);
          }
        }
      }

      if (!reduce && ripples.length) {
        rip = rippleOffset(dot, now);
        targetX += rip.x;
        targetY += rip.y;
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

      dot.el.style.transform =
        "translate3d(" + dot.x.toFixed(2) + "px," + dot.y.toFixed(2) + "px,0) scale(" + dot.s.toFixed(3) + ")";

      if (bg !== dot.bg) {
        dot.bg = bg;
        dot.el.style.background = bg;
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
    if (!reduce) {
      var rect = field.getBoundingClientRect();
      pushRipple(e.clientX - rect.left, e.clientY - rect.top, 20);
      schedule();
    } else {
      update();
    }
  }

  setMode(MODES[0]);
  build(true);

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
    });

    hero.addEventListener("pointerleave", function () {
      active = false;
      plx = 0;
      ply = 0;
      schedule();
    });
  } else {
    hero.addEventListener("pointermove", function (e) {
      mx = e.clientX;
      my = e.clientY;
      active = true;
      update();
    });
    hero.addEventListener("pointerleave", function () {
      active = false;
      update();
    });
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
