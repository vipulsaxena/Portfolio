/**
 * Custom cursor — DOM follower with hover states.
 * Improvements vs typical portfolio cursors:
 * - Only enables on fine pointers with hover capability
 * - Uses transform updated synchronously on pointermove (no RAF lag)
 * - Does not hide the native cursor until the custom one is ready
 * - Restores native cursor over text fields
 * - Distinguishes internal / external / locked targets
 */
(function () {
  "use strict";

  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!finePointer.matches) return;

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

  var visible = false;
  var iframePauseDepth = 0;

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
      root.classList.remove("has-custom-cursor", "custom-cursor-native");
      cursor.remove();
    }
  });
})();
