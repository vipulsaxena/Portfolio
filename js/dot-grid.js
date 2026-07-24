/**
 * Magnetic dot grid — hero background (index.html).
 *
 * Upgrades the static CSS dot pattern into real dot nodes so each dot can
 * scale toward the cursor (closest = biggest), giving a subtle, tactile
 * "magnetic" field. Cheap: one rAF-batched pass on pointer move, transforms
 * only (GPU), and writes a dot's transform only when its scale changes.
 *
 * On first load the dots fade in row-by-row (CSS .dots-intro). Falls back to
 * the plain CSS pattern when JS is off, and does nothing under
 * prefers-reduced-motion beyond showing a static grid.
 */
(function () {
  "use strict";

  var field = document.querySelector(".patterns--dots");
  if (!field) return;

  var mm = window.matchMedia;
  var reduce = mm && mm("(prefers-reduced-motion: reduce)").matches;

  var SPACING = 22;    // px between dots (2.2rem at the 62.5% root)
  var RADIUS  = 170;   // px — cursor influence radius (wider = stronger field)
  var MAX     = 3.0;   // peak scale at the cursor
  var PULL    = 0.55;  // how hard dots are dragged toward the cursor (0..1)

  var hero = field.closest(".hero") || field.parentElement;
  var dots = [];      // { el, cx, cy, s }

  function build(intro) {
    var w = field.clientWidth;
    var h = field.clientHeight;
    // floor so the resting grid stays inside the band (overflow is visible now,
    // so we don't want extra half-rows spilling toward the heading / off-screen).
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
          s: 1, tx: 0, ty: 0
        });
      }
    }
    field.appendChild(frag);

    if (intro && !reduce) {
      field.classList.add("dots-intro");
      setTimeout(function () { field.classList.remove("dots-intro"); }, 900 + rows * 90);
    }
  }

  var mx = 0, my = 0, active = false, raf = 0;
  var lastCol = -1, lastRow = -1;

  function update() {
    raf = 0;
    var rect = field.getBoundingClientRect();
    var lx = mx - rect.left;
    var ly = my - rect.top;

    // Sound: a soft pluck each time the cursor crosses into a new dot cell
    // inside the field. Shares js/sonic.js, so it honours the "sound" toggle.
    if (active && lx >= 0 && ly >= 0 && lx <= rect.width && ly <= rect.height) {
      var col = Math.floor(lx / SPACING);
      var row = Math.floor(ly / SPACING);
      if (col !== lastCol || row !== lastRow) {
        lastCol = col; lastRow = row;
        if (window.Sonic && window.Sonic.gridTick) window.Sonic.gridTick(col + row);
      }
    } else {
      lastCol = lastRow = -1;
    }

    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      var s = 1, tx = 0, ty = 0;
      if (active) {
        var dx = lx - dot.cx;   // vector from the dot toward the cursor
        var dy = ly - dot.cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < RADIUS) {
          var f = 1 - dist / RADIUS;   // 0 at edge → 1 at the cursor
          s = 1 + f * (MAX - 1);       // grow
          var pull = f * PULL;         // drag toward the cursor
          tx = dx * pull;
          ty = dy * pull;
        }
      }
      if (s !== dot.s || tx !== dot.tx || ty !== dot.ty) {
        dot.s = s; dot.tx = tx; dot.ty = ty;
        dot.el.style.transform =
          "translate(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px) scale(" + s.toFixed(3) + ")";
      }
    }
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(update); }

  build(true);

  if (!reduce) {
    hero.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY; active = true; schedule();
    });
    hero.addEventListener("pointerleave", function () { active = false; schedule(); });
  }

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { build(false); }, 200);
  });
})();
