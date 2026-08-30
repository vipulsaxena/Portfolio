/**
 * Custom cursor — DOM follower with hover states.
 * Improvements vs typical portfolio cursors:
 * - Only enables on fine pointers with hover capability
 * - Uses transform updated synchronously on pointermove (no RAF lag)
 * - Does not hide the native cursor until the custom one is ready
 * - Restores native cursor over text fields
 * - Distinguishes internal / external / locked targets
 * - Interactive hover uses ekino-style liquid glass (SVG feDisplacementMap)
 */
(function () {
  "use strict";

  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!finePointer.matches) return;

  var CURSOR_LENS_PX = 44;
  var DISP_MAP_PX = CURSOR_LENS_PX * 2;
  var DISP_STRENGTH = 42;
  var DISP_CHROMA = 0.08;
  var FILTER_ID = "cursor-liquid-glass";

  var INTERACTIVE =
    'a[href], button:not([disabled]), [role="button"], summary';
  var NATIVE =
    'input, textarea, select, [contenteditable="true"]';
  var MEDIA =
    "img, video, canvas, picture, [data-lightbox]";

  var root = document.documentElement;
  var cursor = document.createElement("div");
  cursor.id = "custom-cursor";
  cursor.setAttribute("aria-hidden", "true");
  // Mount on <html>, not <body>: password gates hide body > * except the gate
  // dialog, which would hide the cursor while cursor:none stays active.
  root.appendChild(cursor);
  root.classList.add("has-custom-cursor");
  ensureLiquidGlassFilter();

  var visible = false;
  var iframePauseDepth = 0;

  function clampByte(v) {
    return Math.max(0, Math.min(255, Math.round(v)));
  }

  function smoothstep(edge0, edge1, x) {
    var t = (x - edge0) / (edge1 - edge0);
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return t * t * (3 - 2 * t);
  }

  function blurDisplacementMap(data, size, radius) {
    var out = new Uint8ClampedArray(data.length);
    var r = radius || 2;

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var rs = 0;
        var gs = 0;
        var bs = 0;
        var count = 0;

        for (var ky = -r; ky <= r; ky++) {
          for (var kx = -r; kx <= r; kx++) {
            var sx = x + kx;
            var sy = y + ky;
            if (sx < 0 || sy < 0 || sx >= size || sy >= size) continue;
            var si = (sy * size + sx) * 4;
            rs += data[si];
            gs += data[si + 1];
            bs += data[si + 2];
            count += 1;
          }
        }

        var di = (y * size + x) * 4;
        out[di] = rs / count;
        out[di + 1] = gs / count;
        out[di + 2] = bs / count;
        out[di + 3] = data[di + 3];
      }
    }

    return out;
  }

  function createDisplacementMapDataUrl() {
    var size = DISP_MAP_PX;
    var cx = size / 2;
    var cy = size / 2;
    var radius = size / 2 - 0.5;
    var raw = new Uint8ClampedArray(size * size * 4);

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var dx = x + 0.5 - cx;
        var dy = y + 0.5 - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var norm = dist / radius;
        var i = (y * size + x) * 4;

        if (norm > 1) {
          raw[i] = 128;
          raw[i + 1] = 128;
          raw[i + 2] = 128;
          raw[i + 3] = 255;
          continue;
        }

        var edge = smoothstep(0.42, 0.96, norm);
        var len = dist || 1;
        var ux = dx / len;
        var uy = dy / len;
        raw[i] = clampByte(128 + ux * DISP_STRENGTH * edge);
        raw[i + 1] = clampByte(128 + uy * DISP_STRENGTH * edge);
        raw[i + 2] = 128;
        raw[i + 3] = 255;
      }
    }

    var blurred = blurDisplacementMap(raw, size, 2);
    var canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.putImageData(new ImageData(blurred, size, size), 0, 0);
    return canvas.toDataURL("image/png");
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
    return el;
  }

  function ensureLiquidGlassFilter() {
    if (document.getElementById(FILTER_ID)) return;

    var mapUrl = createDisplacementMapDataUrl();
    if (!mapUrl) return;

    var svg = svgEl("svg", {
      id: "cursor-liquid-glass-defs",
      "aria-hidden": "true",
      width: "0",
      height: "0",
      style: "position:absolute;overflow:hidden"
    });

    var defs = svgEl("defs", {});
    var filter = svgEl("filter", {
      id: FILTER_ID,
      x: "0",
      y: "0",
      width: "100%",
      height: "100%",
      filterUnits: "objectBoundingBox",
      "color-interpolation-filters": "sRGB"
    });

    filter.appendChild(
      svgEl("feGaussianBlur", {
        in: "SourceGraphic",
        stdDeviation: "0.17",
        result: "blurred"
      })
    );

    var feImage = svgEl("feImage", {
      href: mapUrl,
      "xlink:href": mapUrl,
      x: "0",
      y: "0",
      width: String(CURSOR_LENS_PX),
      height: String(CURSOR_LENS_PX),
      preserveAspectRatio: "none",
      result: "dispMap"
    });
    filter.appendChild(feImage);

    var baseScale = -28;
    var scaleR = baseScale * (1 + DISP_CHROMA);
    var scaleG = baseScale;
    var scaleB = baseScale * (1 - DISP_CHROMA);

    filter.appendChild(
      svgEl("feDisplacementMap", {
        in: "blurred",
        in2: "dispMap",
        scale: String(scaleR),
        xChannelSelector: "R",
        yChannelSelector: "G",
        result: "dispR"
      })
    );
    filter.appendChild(
      svgEl("feDisplacementMap", {
        in: "blurred",
        in2: "dispMap",
        scale: String(scaleG),
        xChannelSelector: "R",
        yChannelSelector: "G",
        result: "dispG"
      })
    );
    filter.appendChild(
      svgEl("feDisplacementMap", {
        in: "blurred",
        in2: "dispMap",
        scale: String(scaleB),
        xChannelSelector: "R",
        yChannelSelector: "G",
        result: "dispB"
      })
    );
    filter.appendChild(
      svgEl("feColorMatrix", {
        in: "dispR",
        type: "matrix",
        values: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
        result: "chanR"
      })
    );
    filter.appendChild(
      svgEl("feColorMatrix", {
        in: "dispG",
        type: "matrix",
        values: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
        result: "chanG"
      })
    );
    filter.appendChild(
      svgEl("feColorMatrix", {
        in: "dispB",
        type: "matrix",
        values: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
        result: "chanB"
      })
    );
    filter.appendChild(
      svgEl("feComposite", {
        in: "chanR",
        in2: "chanG",
        operator: "arithmetic",
        k1: "0",
        k2: "1",
        k3: "1",
        k4: "0",
        result: "compRG"
      })
    );
    filter.appendChild(
      svgEl("feComposite", {
        in: "compRG",
        in2: "chanB",
        operator: "arithmetic",
        k1: "0",
        k2: "1",
        k3: "1",
        k4: "0"
      })
    );

    defs.appendChild(filter);
    svg.appendChild(defs);
    root.appendChild(svg);
    root.classList.add("has-cursor-liquid-glass");
  }

  function clearHoverClasses() {
    cursor.classList.remove(
      "is-hover",
      "is-external",
      "is-locked",
      "is-close",
      "is-chat"
    );
  }

  function pauseForIframe() {
    iframePauseDepth += 1;
    if (iframePauseDepth !== 1) return;
    setNative(true);
    clearHoverClasses();
  }

  function resumeFromIframe() {
    if (iframePauseDepth === 0) return;
    iframePauseDepth -= 1;
    if (iframePauseDepth !== 0) return;
    setNative(false);
  }

  function bindIframe(iframe) {
    if (!iframe || iframe.__customCursorBound) return;
    iframe.__customCursorBound = true;
    iframe.addEventListener("mouseenter", pauseForIframe);
    iframe.addEventListener("mouseleave", resumeFromIframe);
  }

  function bindAllIframes(rootEl) {
    var scope = rootEl && rootEl.querySelectorAll ? rootEl : document;
    if (rootEl instanceof HTMLIFrameElement) {
      bindIframe(rootEl);
      return;
    }
    scope.querySelectorAll("iframe").forEach(bindIframe);
  }

  function setPosition(clientX, clientY) {
    cursor.style.transform =
      "translate3d(" + clientX + "px," + clientY + "px,0) translate(-50%, -50%)";
  }

  function updateMediaBlend(target) {
    if (
      target &&
      target instanceof Element &&
      target.closest(".gfq-badge, .vipul-chat-badge")
    ) {
      cursor.classList.remove("is-over-media");
      return;
    }
    var overMedia =
      !!(target && target instanceof Element && target.closest(MEDIA));
    cursor.classList.toggle("is-over-media", overMedia);
  }

  function onMove(e) {
    if (!visible) {
      visible = true;
      cursor.classList.add("is-visible");
    }
    setPosition(e.clientX, e.clientY);
    classify(e.target);
  }

  function clearHover() {
    clearHoverClasses();
    iframePauseDepth = 0;
    root.classList.remove("custom-cursor-native");
    cursor.classList.remove("is-native", "is-over-media", "is-selecting");
  }

  function setNative(on) {
    cursor.classList.toggle("is-native", on);
    root.classList.toggle("custom-cursor-native", on);
    if (on) {
      cursor.classList.remove(
        "is-hover",
        "is-external",
        "is-locked",
        "is-close",
        "is-chat"
      );
    }
  }

  function isExternalLink(link) {
    if (!link || !link.href) return false;
    if (link.target === "_blank") return true;
    try {
      return new URL(link.href, location.href).origin !== location.origin;
    } catch (_) {
      return false;
    }
  }

  function isLockedCard(el) {
    return !!(el && el.closest && el.closest(".trg_cnt[data-company]"));
  }

  function isCloseControl(el) {
    return !!(el && el.closest && el.closest(".pw-close, .vipul-chat-close"));
  }

  function isChatBadge(el) {
    return !!(el && el.closest && el.closest(".gfq-badge, .vipul-chat-badge"));
  }

  function classify(target) {
    updateMediaBlend(target);

    if (!target || !(target instanceof Element)) {
      clearHover();
      return;
    }

    if (target.closest(NATIVE)) {
      setNative(true);
      return;
    }

    if (iframePauseDepth > 0) return;

    setNative(false);

    var interactive = target.closest(INTERACTIVE);
    if (!interactive) {
      clearHoverClasses();
      return;
    }

    if (isChatBadge(interactive)) {
      cursor.classList.add("is-hover", "is-chat");
      cursor.classList.remove("is-external", "is-locked", "is-close");
      return;
    }

    // Open chat panel chrome: keep close cursor; leave other panel UI alone
    if (interactive.closest(".gfq-wrap")) {
      if (isCloseControl(interactive)) {
        cursor.classList.add("is-hover", "is-close");
        cursor.classList.remove("is-external", "is-locked", "is-chat");
        return;
      }
      clearHoverClasses();
      return;
    }

    cursor.classList.add("is-hover");
    cursor.classList.remove("is-chat");

    if (isCloseControl(interactive)) {
      cursor.classList.add("is-close");
      cursor.classList.remove("is-external", "is-locked");
      return;
    }

    if (isLockedCard(interactive)) {
      cursor.classList.add("is-locked");
      cursor.classList.remove("is-external", "is-close");
      return;
    }

    var link =
      interactive.tagName === "A"
        ? interactive
        : interactive.closest("a[href]") || interactive.querySelector("a[href]");

    var forceInternal =
      !!(link && link.closest(".shell-footer-copy"));

    if (!forceInternal && isExternalLink(link)) {
      cursor.classList.add("is-external");
      cursor.classList.remove("is-locked", "is-close");
    } else {
      cursor.classList.remove("is-external", "is-locked", "is-close");
    }
  }

  function onOver(e) {
    classify(e.target);
  }

  function onOut(e) {
    var next = e.relatedTarget;
    if (next && next instanceof Element) {
      classify(next);
      return;
    }
    clearHover();
  }

  function onLeave() {
    visible = false;
    cursor.classList.remove("is-visible");
    clearHover();
  }

  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerover", onOver, { passive: true });
  document.addEventListener("pointerout", onOut, { passive: true });
  document.documentElement.addEventListener("mouseleave", onLeave);

  document.addEventListener(
    "pointerdown",
    function () {
      cursor.classList.add("is-selecting");
    },
    { passive: true }
  );

  document.addEventListener(
    "pointerup",
    function () {
      cursor.classList.remove("is-selecting");
    },
    { passive: true }
  );

  bindAllIframes(document);

  if ("MutationObserver" in window && document.body) {
    var iframeObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (!(node instanceof Element)) return;
          bindAllIframes(node);
        });
      });
    });
    iframeObserver.observe(document.body, { childList: true, subtree: true });
  }

  finePointer.addEventListener("change", function (mq) {
    if (!mq.matches) {
      root.classList.remove("has-custom-cursor", "custom-cursor-native", "has-cursor-liquid-glass");
      var defs = document.getElementById("cursor-liquid-glass-defs");
      if (defs) defs.remove();
      cursor.remove();
    }
  });
})();
