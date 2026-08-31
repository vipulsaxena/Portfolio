/* OLX web-page interactions — bg toggle, audit, prototypes, CSAT arc */
(function () {
  "use strict";

  function emitWidgetChange(id, value) {
    if (!id) return;
    document.dispatchEvent(
      new CustomEvent("portfolio:widget-change", {
        bubbles: true,
        detail: { id: id, value: String(value) },
      })
    );
  }

  /* Background view toggle */
  (function () {
    var seg = document.getElementById("bgSeg");
    if (!seg) return;
    var btns = Array.from(seg.querySelectorAll("[data-bg]"));
    var shots = Array.from(document.querySelectorAll("[data-bg-shot]"));
    function activate(n) {
      btns.forEach(function (b) {
        b.setAttribute("aria-selected", String(b.dataset.bg === n));
      });
      shots.forEach(function (s) {
        s.classList.toggle("active", s.dataset.bgShot === n);
      });
      emitWidgetChange(seg.getAttribute("data-fm-widget") || "olx-bg", n);
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { activate(b.dataset.bg); });
    });
  })();

  /* UX audit */
  (function () {
    var list = document.getElementById("auditList");
    var stage = document.getElementById("auditStage");
    if (!list || !stage) return;
    var items = Array.from(list.querySelectorAll("[data-audit]"));
    var shots = Array.from(stage.querySelectorAll("[data-audit-shot]"));
    function activate(n) {
      items.forEach(function (it) {
        it.classList.toggle("active", it.dataset.audit === n);
      });
      shots.forEach(function (sh) {
        sh.classList.toggle("active", sh.dataset.auditShot === n);
      });
      emitWidgetChange(list.getAttribute("data-fm-widget"), n);
    }
    items.forEach(function (it) {
      var n = it.dataset.audit;
      it.addEventListener("mouseenter", function () { activate(n); });
      it.addEventListener("focus", function () { activate(n); });
      it.addEventListener("click", function () { activate(n); });
    });
  })();

  /* Variant A/B prototype cycling */
  (function () {
    var FRAMES = {
      a: [1, 2, 3, 4, 5].map(function (n) { return "assets/olx/va-" + n + ".png"; }),
      b: [1, 2, 3, 4, 5].map(function (n) { return "assets/olx/oob-" + n + ".png"; }),
    };
    var idx = { a: 0, b: 0 };
    function render(key) {
      var img = document.querySelector('[data-proto-img="' + key + '"]');
      var step = document.querySelector('[data-proto-step="' + key + '"]');
      if (!img || !FRAMES[key]) return;
      img.src = FRAMES[key][idx[key]];
      img.alt =
        "Variant " + (key === "a" ? "A" : "B") + " prototype, frame " + (idx[key] + 1) + " of 5";
      if (step) step.textContent = String(idx[key] + 1);
      var stage = document.querySelector('[data-proto-cycle="' + key + '"]');
      if (stage) {
        stage.setAttribute("data-fm-value", String(idx[key]));
        emitWidgetChange(stage.getAttribute("data-fm-widget"), idx[key]);
      }
      if (stage && typeof stage._protoRefreshLens === "function") {
        stage._protoRefreshLens();
      }
    }
    function next(key) {
      idx[key] = (idx[key] + 1) % FRAMES[key].length;
      render(key);
    }
    function reset(key) {
      idx[key] = 0;
      render(key);
    }
    window.PortfolioProto = {
      go: function (key, n) {
        if (!FRAMES[key]) return;
        var len = FRAMES[key].length;
        idx[key] = ((n % len) + len) % len;
        render(key);
      },
    };
    document.querySelectorAll("[data-proto-cycle]").forEach(function (btn) {
      btn.addEventListener("click", function () { next(btn.dataset.protoCycle); });
    });
    document.querySelectorAll("[data-proto-reset]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        reset(btn.dataset.protoReset);
      });
    });

    var ZOOM = 2.35;
    var canMagnify = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    function protoImageBox(img, root) {
      var rr = root.getBoundingClientRect();
      var ir = img.getBoundingClientRect();
      if (!ir.width || !ir.height) return null;
      return {
        left: ir.left - rr.left,
        top: ir.top - rr.top,
        width: ir.width,
        height: ir.height,
      };
    }
    function clearLens(stage) {
      stage.classList.remove("is-magnifying");
    }
    if (canMagnify) {
      document.querySelectorAll(".proto-stage").forEach(function (stage) {
        var inner = stage.querySelector(".proto-stage__inner");
        var img = stage.querySelector("[data-proto-img]");
        var lens = stage.querySelector(".proto-lens");
        if (!inner || !img || !lens) return;
        stage._protoMagnifyEnabled = true;
        var lensSize = function () { return lens.offsetWidth || 420; };
        var lastPointer = null;
        function updateLens(e) {
          if (!e || !stage._protoMagnifyEnabled) {
            clearLens(stage);
            return;
          }
          var sr = stage.getBoundingClientRect();
          var ir = inner.getBoundingClientRect();
          var x = e.clientX - ir.left;
          var y = e.clientY - ir.top;
          var box = protoImageBox(img, inner);
          if (!box) {
            clearLens(stage);
            return;
          }
          var ix = x - box.left;
          var iy = y - box.top;
          if (ix < 0 || iy < 0 || ix > box.width || iy > box.height) {
            clearLens(stage);
            return;
          }
          var size = lensSize();
          var half = size / 2;
          var lensX = e.clientX - sr.left;
          var lensY = e.clientY - sr.top;
          stage.classList.add("is-magnifying");
          lens.style.left = lensX - half + "px";
          lens.style.top = lensY - half + "px";
          lens.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
          lens.style.backgroundSize = box.width * ZOOM + "px " + box.height * ZOOM + "px";
          lens.style.backgroundPosition =
            -(ix * ZOOM - half) + "px " + -(iy * ZOOM - half) + "px";
        }
        function move(e) {
          lastPointer = { clientX: e.clientX, clientY: e.clientY };
          updateLens(e);
        }
        stage._protoRefreshLens = function () {
          if (lastPointer && stage.matches(":hover") && stage._protoMagnifyEnabled) {
            updateLens(lastPointer);
          } else if (!stage._protoMagnifyEnabled) {
            clearLens(stage);
          }
        };
        stage.addEventListener("mouseenter", move);
        stage.addEventListener("mousemove", move);
        stage.addEventListener("mouseleave", function () {
          lastPointer = null;
          clearLens(stage);
        });
        img.addEventListener("load", function () { stage._protoRefreshLens(); });
      });
    }

    document.querySelectorAll("[data-proto-magnify]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var key = btn.dataset.protoMagnify;
        var stage = document.querySelector('[data-proto-cycle="' + key + '"]');
        var on = btn.getAttribute("aria-pressed") !== "true";
        btn.setAttribute("aria-pressed", String(on));
        if (stage) {
          stage._protoMagnifyEnabled = on;
          if (!on && typeof stage._protoRefreshLens === "function") {
            stage._protoRefreshLens();
          }
        }
      });
    });
  })();

  /* CSAT arc animate on scroll */
  if ("IntersectionObserver" in window) {
    document.querySelectorAll(".csat-arc").forEach(function (arc) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            arc.classList.add("is-animated");
            obs.disconnect();
          }
        });
      }, { threshold: 0.4 });
      obs.observe(arc);
    });
  } else {
    document.querySelectorAll(".csat-arc").forEach(function (arc) {
      arc.classList.add("is-animated");
    });
  }

  /* Autoplay in-view videos */
  if ("IntersectionObserver" in window) {
    document.querySelectorAll("video[data-autoplay-inview]").forEach(function (video) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var p = video.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            video.pause();
          }
        });
      }, { threshold: 0.35 });
      obs.observe(video);
    });
  }
})();
