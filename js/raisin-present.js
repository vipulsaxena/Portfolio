/* ==========================================================================
   Raisin presentation deck — clone beats from #present-source, one per slide.
   ========================================================================== */
(function (global) {
  "use strict";

  /** Slide crossfade — keep in sync with css/portfolio-deck-motion.css (--deck-dur) */
  var FADE_MS = 380;
  /** Coarse layout blocks only — mirrors OLX data-anim (not every copy line). */
  var PRESENT_ANIM_BLOCKS = [
    ".hero-split__content",
    ".present-gaps__stack",
    ".present-pullquote",
    ".track-key",
    ".period__head-copy",
    ".period__head-visual",
    ".period-split__visual",
    ".period-split__main",
    ".trade-off-switcher__left",
    ".trade-off-switcher__right",
    ".device-story__copy",
    ".device-story__row > .device-story__visual",
    ".device-story__row > .mobile-journey__visual",
    ".device-story__row > .tabs-compare",
    ".mobile-journey__prototype",
    ".ai-toolkit-copy",
    ".ai-toolkit-right",
    ".ai-journey__tools-head",
    ".ai-lab-tools-carousel",
    ".post-mvp-grid",
    ".proof-intro",
    ".proof-track--practice",
    ".proof-track--enablement",
    ".present-proof-quotes",
    ".present-coaching__left",
    ".present-coaching__visual",
    ".ai-cadence",
    ".present-thanks__inner"
  ];
  var REDUCE_MQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var MARQUEE_PX_PER_SEC = 42;

  var CHAPTER_LABELS = {
    setup: "Setup",
    "period-1": "01 · Wealth Hub",
    "period-2": "02 · Mobile",
    "period-3": "03 · Enablement",
    proof: "Proof",
    thanks: "Thanks"
  };

  var CHAPTER_SHORT = {
    setup: "S",
    "period-1": "01",
    "period-2": "02",
    "period-3": "03",
    proof: "P",
    thanks: "✓"
  };

  var CHAPTER_NAV_IDS = ["setup", "period-1", "period-2", "period-3", "proof"];

  /** Persist wizard step / A·B variant when leaving and re-entering a slide. */
  var presentInteractiveState = {};

  /** Remote-apply handlers for deck-only widgets (validation pan/zoom, etc.). */
  global.PortfolioPresentFm = global.PortfolioPresentFm || {
    _handlers: {},
    register: function (id, fn) {
      this._handlers[id] = fn;
    },
    apply: function (id, val) {
      var fn = this._handlers[id];
      if (fn) fn(val);
    },
  };

  function presentSlideIdFromNode(node) {
    if (!node) return "";
    var slide = node.closest ? node.closest(".present-slide[data-slide-id]") : null;
    return slide ? slide.getAttribute("data-slide-id") || "" : "";
  }

  function tradeoffSwitcherStateKey(switchRoot, slideId) {
    if (!slideId) return "";
    if (switchRoot.closest(".exploration-wizard__variant-switcher")) {
      var widgetId = switchRoot.getAttribute("data-fm-widget") || "";
      if (widgetId === "raisin-ideate-concept-ab") return slideId + ":concept-variant";
      return slideId + ":wireframe-variant";
    }
    return slideId + ":tradeoff-variant";
  }

  function emitWidgetChange(id, value) {
    if (!id) return;
    document.dispatchEvent(
      new CustomEvent("portfolio:widget-change", {
        bubbles: true,
        detail: { id: id, value: String(value) },
      })
    );
  }

  function ensureWhyWidget(root) {
    if (!root || !root.querySelector(".why-proof__frame[data-fm-why]")) return;
    var host = root.classList.contains("why-proof") ? root : root.querySelector(".why-proof");
    if (!host || host.getAttribute("data-fm-kind") === "why") return;
    host.setAttribute("data-fm-widget", "raisin-why");
    host.setAttribute("data-fm-kind", "why");
    if (!host.getAttribute("data-fm-value")) host.setAttribute("data-fm-value", "none");
  }

  function ensurePhaseWizardWidgets(root) {
    root.querySelectorAll("[data-phase-wizard]").forEach(function (wizardRoot) {
      if (wizardRoot.getAttribute("data-fm-widget")) return;
      if (wizardRoot.classList.contains("visual-system-wizard")) {
        wizardRoot.setAttribute("data-fm-widget", "raisin-visual-steps");
      } else if (wizardRoot.classList.contains("exploration-wizard")) {
        wizardRoot.setAttribute("data-fm-widget", "raisin-ideate-steps");
      }
      if (!wizardRoot.getAttribute("data-fm-widget")) return;
      wizardRoot.setAttribute("data-fm-kind", "phase");
      if (!wizardRoot.getAttribute("data-fm-value")) {
        wizardRoot.setAttribute("data-fm-value", wizardRoot.getAttribute("data-default") || "1");
      }
    });
  }

  function ensureTradeoffWidgets(root) {
    root.querySelectorAll("[data-trade-off-switcher]").forEach(function (switchRoot) {
      if (switchRoot.getAttribute("data-fm-widget")) return;
      if (switchRoot.closest(".exploration-wizard__variant-switcher")) {
        if (!switchRoot.getAttribute("data-fm-widget")) {
          var slideId = presentSlideIdFromNode(switchRoot);
          var wireframeWidgetId =
            slideId === "p3-ideation" ? "raisin-mobile-ideate-wireframe" : "raisin-ideate-wireframe";
          switchRoot.setAttribute("data-fm-widget", wireframeWidgetId);
        }
        switchRoot.setAttribute("data-fm-kind", "variant");
        if (!switchRoot.getAttribute("data-fm-value")) {
          switchRoot.setAttribute("data-fm-value", switchRoot.getAttribute("data-default") || "b");
        }
        return;
      }
      var beat = switchRoot.closest('[aria-label*="Trade-off 01"]');
      if (beat) {
        switchRoot.setAttribute("data-fm-widget", "raisin-tradeoff-01");
      } else {
        switchRoot.setAttribute("data-fm-widget", "raisin-tradeoff-02");
      }
      switchRoot.setAttribute("data-fm-kind", "variant");
      if (!switchRoot.getAttribute("data-fm-value")) {
        switchRoot.setAttribute("data-fm-value", switchRoot.getAttribute("data-default") || "b");
      }
    });
  }

  /* Presentation trim — hide web-depth copy; thesis/body max ~2 lines in deck. */
  var PRESENT_TRIM = {
    hero: [".hero__sub:not(.hero__sub--thesis)"],
    journey: [".lede--remit", ".rule--thick"],
    "p1-intro": [
      ".period__thesis:not(.period__thesis--present)",
      ".period__role",
      ".present-constraint-chips"
    ],
    "p1-baseline": [
      ".beat__text:not(.beat__text--present)",
      ".beat__support:not(.beat__support--present)",
      ".beat__stat",
      ".beat__eyebrow"
    ],
    "p1-co-creation": [
      ".beat__text:not(.beat__text--present)",
      ".beat__support:not(.beat__support--present)",
      ".beat__eyebrow",
      ".beat__subtitle",
      ".period-split__caption",
      ".research-stickies:not(.research-stickies--hmw-row)"
    ],
    "p1-exploration": [
      ".beat__text:not(.beat__text--present)",
      ".beat__support:not(.beat__support--present)",
      ".beat__eyebrow",
      ".wh-phase-breakdown"
    ],
    "p1-tradeoff-01": [
      ".beat__text:not(.beat__text--present)",
      ".beat__support:not(.beat__support--present)",
      ".beat__eyebrow",
      ".beat__stat",
      ".trade-off-switcher__left > .chip-row",
      ".trade-off__position",
      ".trade-off__outcome",
      ".trade-off__settled",
      ".trade-off-switcher__scope",
      ".trade-off-switcher__right .period-split__caption",
      ".beat__enablement"
    ],
    "p1-visual-system": [
      ".beat__text:not(.beat__text--present)",
      ".beat__support:not(.beat__support--present)",
      ".beat__eyebrow",
      ".wh-phase-breakdown"
    ],
    "p1-outcomes": [
      ".wealth-hub-constraints",
      ".beat__text",
      ".beat__caption",
      ".beat__support:not(.beat__support--present)",
      ".beat__eyebrow"
    ],
    "p4-cura": [".beat__text", ".beat__enablement"],
    "p3-intro": [".period__thesis:not(.period__thesis--present)", ".period__role"],
    "p3-desk-research": [
      ".device-story__eyebrow",
      ".device-story__title",
      ".device-story__text:not(.device-story__text--present):not(.beat__text--present)",
      ".device-story__text.device-story__text--present",
      ".beat__stat",
      ".beat__subtitle",
      ".beat__problem"
    ],
    "p3-parity": [
      ".device-story__eyebrow",
      ".device-story__title",
      ".device-story__text:not(.device-story__text--present):not(.beat__text--present)",
      ".device-story__text.device-story__text--present",
      ".beat__stat"
    ],
    "p3-ideation": [
      ".beat__text:not(.beat__text--present)",
      ".beat__support:not(.beat__support--present)",
      ".beat__eyebrow"
    ],
    "p3-maze": [
      ".beat__text:not(.beat__text--present)",
      ".beat__support:not(.beat__support--present)",
      ".beat__eyebrow",
      ".beat__stat",
      ".trade-off__position"
    ],
    "p3-visual-system": [
      ".beat__text:not(.beat__text--present)",
      ".beat__support:not(.beat__support--present)",
      ".beat__eyebrow"
    ],
    "p3-shipped": [
      ".device-story__eyebrow",
      ".device-story__title",
      ".device-story__text:not(.beat__text--present)",
      ".device-story__text.device-story__text--present",
      ".beat__stat"
    ],
    "p4-intro": [
      ".period__thesis:not(.period__thesis--present)",
      ".period__role",
      ".present-p4-enablement",
      ".present-p4-intro-stat",
      ".present-p4-intro-chips",
      ".period__meta .chip-row"
    ],
    "p4-toolkit": [
      ".ai-toolkit-card__text",
      ".ai-toolkit-grid__note",
      ".device-story__text:not(.device-story__text--present)"
    ],
    "p4-one-data": [
      ".device-story__text:not(.device-story__text--present)",
      ".period-split__caption"
    ],
    "p4-lab-tools": [".device-story__text:not(.device-story__text--present)"],
    "p4-coaching": [
      ".device-story__text:not(.device-story__text--present)",
      ".beat__stat"
    ],
    proof: [".proof-intro__lede:not(.proof-intro__lede--present)"]
  };

  var SLIDE_MANIFEST = [
    { id: "hero", chapter: "setup", selector: "#hero" },
    { id: "gaps", chapter: "setup", selector: "#why" },
    {
      id: "journey",
      chapter: "setup",
      selector: "#journey-intro",
      title: "How I structured the work"
    },
    { id: "p1-intro", chapter: "period-1", selector: "#period-1 .period__head" },
    { id: "p1-baseline", chapter: "period-1", selector: '[aria-label="Baseline research"]' },
    { id: "p1-co-creation", chapter: "period-1", selector: '[aria-label="Co-creation sprint"]' },
    { id: "p1-exploration", chapter: "period-1", selector: '[aria-label="Wealth Hub — ideation"]' },
    { id: "p1-tradeoff-01", chapter: "period-1", selector: '[aria-label="Validation — customer evidence closes landing conflicts"]' },
    { id: "p1-visual-system", chapter: "period-1", selector: '[aria-label="Wealth Hub visual system"]' },
    { id: "p1-outcomes", chapter: "period-1", selector: '[aria-label="After MVP launch — outcomes"]' },
    { id: "p3-intro", chapter: "period-2", selector: "#period-3 .period__head" },
    { id: "p3-desk-research", chapter: "period-2", selector: '[aria-label="Mobile — research"]' },
    { id: "p3-parity", chapter: "period-2", selector: '[aria-label="Mobile — parity"]' },
    { id: "p3-ideation", chapter: "period-2", selector: '[aria-label="Mobile — ideate"]' },
    { id: "p3-maze", chapter: "period-2", selector: '[aria-label="Mobile — validation"]' },
    { id: "p3-visual-system", chapter: "period-2", selector: '[aria-label="Mobile — visual design"]' },
    { id: "p3-shipped", chapter: "period-2", selector: '[aria-label="Mobile — launch"]' },
    { id: "p4-intro", chapter: "period-3", selector: "#period-4 .period__head" },
    { id: "p4-toolkit", chapter: "period-3", selector: "#period-4 .ai-journey__toolkit" },
    { id: "p4-one-data", chapter: "period-3", selector: "#period-4 .ai-journey__one-data" },
    { id: "p4-lab-tools", chapter: "period-3", selector: "#period-4 .ai-journey__tools" },
    {
      id: "p4-coaching",
      chapter: "period-3",
      compositeLayout: "coaching",
      composite: [
        "#period-4 .ai-journey__row[aria-label='Coaching on Cursor']",
        "#period-4 .ai-cadence"
      ]
    },
    {
      id: "proof",
      chapter: "proof",
      compositeLayout: "proof",
      composite: ["#proof", ".quote-marquee"],
      title: "What moved. What didn't. Both matter."
    },
    { id: "thanks", chapter: "thanks", selector: "#present-beat-thanks", title: "Thanks" }
  ];

  var source = document.getElementById("present-source");
  var stage = document.getElementById("present-stage");
  var deckTitle = document.getElementById("deckTitle");
  var progress = document.getElementById("progress");
  var curNum = document.getElementById("curNum");
  var totNum = document.getElementById("totNum");
  var chapWrap = document.getElementById("chapters");
  var backToCase = document.getElementById("backToCase");
  var prevBtns = Array.prototype.slice.call(document.querySelectorAll("[data-prev]"));
  var nextBtns = Array.prototype.slice.call(document.querySelectorAll("[data-next]"));

  if (!source || !stage) return;

  var N = SLIDE_MANIFEST.length;
  var i = 0;
  var currentSlideEl = null;
  var leavingTimer = null;
  var carouselCleanups = [];

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function stripIds(node) {
    if (node.id) node.removeAttribute("id");
    node.querySelectorAll("[id]").forEach(function (el) {
      el.removeAttribute("id");
    });
  }

  var FULL_BLEED_SLIDES = {
    "p4-cura": true
  };

  var SLIDE_LAYOUT = {
    gaps: "viewport",
    journey: "viewport",
    "p1-intro": "viewport",
    "p1-baseline": "viewport",
    "p1-co-creation": "viewport",
    "p1-exploration": "viewport",
    "p1-tradeoff-01": "viewport",
    "p1-visual-system": "viewport",
    "p1-outcomes": "viewport-split",
    "p3-intro": "viewport",
    "p3-desk-research": "viewport",
    "p3-parity": "viewport",
    "p3-ideation": "viewport",
    "p3-maze": "viewport",
    "p3-visual-system": "viewport",
    "p3-shipped": "viewport",
    "p4-intro": "viewport",
    "p4-toolkit": "viewport",
    "p4-one-data": "viewport",
    "p4-lab-tools": "viewport",
    "p4-coaching": "viewport",
    "p4-cura": "viewport",
    proof: "viewport"
  };

  function applyPresentTrim(root, entry) {
    if (!root || !entry) return;
    var selectors = PRESENT_TRIM[entry.id];
    if (!selectors || !selectors.length) return;
    selectors.forEach(function (sel) {
      root.querySelectorAll(sel).forEach(function (el) {
        el.classList.add("present-trim-hidden");
        el.hidden = true;
        el.setAttribute("aria-hidden", "true");
      });
    });
  }

  function applySlideLayout(node, entry) {
    if (!node || !entry) return;
    if (
      FULL_BLEED_SLIDES[entry.id] ||
      entry.id === "hero" ||
      entry.id === "thanks" ||
      entry.id === "p1-outcomes"
    ) {
      return;
    }
    var layout = SLIDE_LAYOUT[entry.id] || "scroll";
    node.classList.add("present-slide--layout-" + layout);
  }

  function slideHasPageInsets(node) {
    if (!node) return false;
    if (node.classList.contains("container")) return true;
    if (node.classList.contains("present-thanks")) return true;
    if (node.querySelector(":scope > .container")) return true;
    if (node.querySelector(":scope > .section > .container")) return true;
    if (node.querySelector(":scope > .hero-stage > .container")) return true;
    return false;
  }

  function ensurePageInsets(node, entry) {
    if (!node || !entry) return;
    if (FULL_BLEED_SLIDES[entry.id]) return;
    if (slideHasPageInsets(node)) return;
    node.classList.add("container");
  }

  function resolveSourceNode(entry) {
    if (entry.composite) return null;
    return source.querySelector(entry.selector);
  }

  function buildCompositeSlide(entry) {
    var layout = entry.compositeLayout || "releases";
    var isGaps = layout === "gaps";
    var isStack = layout === "stack";
    var isProof = layout === "proof";
    var isCoaching = layout === "coaching";
    var wrapper = document.createElement("div");
    wrapper.className = isGaps
      ? "present-beat-composite present-beat-gaps"
      : isStack
        ? "present-beat-composite present-beat-stack"
        : isProof
          ? "present-beat-composite present-beat-proof"
          : isCoaching
            ? "present-beat-composite present-beat-coaching"
            : "present-beat-composite present-beat-releases";
    if (isGaps) {
      wrapper.setAttribute("data-fm-widget", "raisin-why");
      wrapper.setAttribute("data-fm-kind", "why");
      wrapper.setAttribute("data-fm-value", "none");
    } else if (!isStack && !isProof && !isCoaching) {
      var bridge = document.createElement("p");
      bridge.className = "post-mvp-bridge present-beat-releases__bridge";
      bridge.textContent = "Shipped in sequence:";
      wrapper.appendChild(bridge);
    }
    if (isStack) {
      var stackInner = document.createElement("div");
      stackInner.className = "container present-beat-stack__inner";
      entry.composite.forEach(function (sel) {
        var node = source.querySelector(sel);
        if (!node) {
          console.warn("Present: missing composite node for", sel);
          return;
        }
        var clone = node.cloneNode(true);
        stripIds(clone);
        stackInner.appendChild(clone);
      });
      wrapper.appendChild(stackInner);
      return wrapper;
    }
    if (isProof) {
      entry.composite.forEach(function (sel) {
        var node = source.querySelector(sel);
        if (!node) {
          console.warn("Present: missing composite node for", sel);
          return;
        }
        var clone = node.cloneNode(true);
        stripIds(clone);
        if (sel === ".quote-marquee") {
          clone.classList.add("present-proof-quotes");
          clone.classList.remove("is-animation-paused");
          clone.removeAttribute("aria-hidden");
        }
        wrapper.appendChild(clone);
      });
      return wrapper;
    }
    if (isCoaching) {
      var leftCol = document.createElement("div");
      leftCol.className = "present-coaching__left";
      var rightCol = document.createElement("div");
      rightCol.className = "present-coaching__visual";

      entry.composite.forEach(function (sel) {
        var node = source.querySelector(sel);
        if (!node) {
          console.warn("Present: missing composite node for", sel);
          return;
        }
        var clone = node.cloneNode(true);
        stripIds(clone);

        var copy = clone.querySelector(".device-story__copy");
        var visual = clone.querySelector(
          ".ai-journey__visual, .mobile-journey__mockup--solo, .mobile-journey__mockup"
        );
        if (copy) {
          leftCol.appendChild(copy);
          if (visual) rightCol.appendChild(visual);
          return;
        }

        leftCol.appendChild(clone);
      });

      wrapper.appendChild(leftCol);
      wrapper.appendChild(rightCol);
      return wrapper;
    }
    var grid = document.createElement("div");
    grid.className = isGaps
      ? "present-beat-gaps__stack why-proofs"
      : "present-beat-releases__grid post-mvp-grid post-mvp-grid--releases";
    entry.composite.forEach(function (sel) {
      var node = source.querySelector(sel);
      if (!node) {
        console.warn("Present: missing composite node for", sel);
        return;
      }
      var clone = node.cloneNode(true);
      stripIds(clone);
      grid.appendChild(clone);
    });
    if (isGaps) {
      var container = document.createElement("div");
      container.className = "container";
      container.appendChild(grid);
      wrapper.appendChild(container);
    } else {
      wrapper.appendChild(grid);
    }
    return wrapper;
  }

  function slideTitle(root, entry) {
    if (entry && entry.title) return entry.title;
    if (!root) return "Raisin";
    var pick =
      root.querySelector(".why-hero__statement") ||
      root.querySelector("h1") ||
      root.querySelector("h2") ||
      root.querySelector(".beat__title") ||
      root.querySelector(".post-mvp-card__label") ||
      root.querySelector(".device-story__title") ||
      root.querySelector(".period__title");
    if (!pick) return "Raisin";
    var text = pick.textContent.replace(/\s+/g, " ").trim();
    return text.length > 72 ? text.slice(0, 69) + "…" : text;
  }

  function pauseVideos(root) {
    if (!root) return;
    root.querySelectorAll("video").forEach(function (v) {
      v.pause();
      if (v.hasAttribute("data-src") && v.src) {
        v.removeAttribute("src");
        v.load();
      }
    });
  }

  function promoteMedia(root) {
    root.querySelectorAll("video[data-src]").forEach(function (video) {
      var dataSrc = video.getAttribute("data-src");
      if (dataSrc && !video.getAttribute("src")) {
        video.src = dataSrc;
        video.removeAttribute("data-src");
      }
    });
    root.querySelectorAll("[data-prototype-frame]").forEach(function (frame) {
      var dataSrc = frame.getAttribute("data-src");
      if (dataSrc && !frame.src) {
        frame.src = dataSrc;
        frame.removeAttribute("data-src");
      }
    });
    root.querySelectorAll('img[loading="lazy"]').forEach(function (img) {
      img.loading = "eager";
    });
  }

  function playAutoplayVideos(root) {
    root.querySelectorAll("video[data-autoplay-inview]").forEach(function (v) {
      if (v.closest("[hidden]")) return;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
  }

  function revealAll(root) {
    root.querySelectorAll(".reveal, .reveal-stagger").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  function clearSlideAnim(root) {
    if (!root) return;
    root.querySelectorAll("[data-anim]").forEach(function (el) {
      el.removeAttribute("data-anim");
      el.style.removeProperty("--i");
    });
  }

  function assignSlideAnim(root) {
    clearSlideAnim(root);
    if (REDUCE_MQ.matches) return;
    var seen = new Set();
    var list = [];
    PRESENT_ANIM_BLOCKS.forEach(function (sel) {
      root.querySelectorAll(sel).forEach(function (el) {
        if (seen.has(el)) return;
        if (el.closest(".present-trim-hidden")) return;
        if (el.hasAttribute("hidden")) return;
        var st = window.getComputedStyle(el);
        if (st.display === "none" || st.visibility === "hidden") return;
        seen.add(el);
        list.push(el);
      });
    });
    list.sort(function (a, b) {
      if (a === b) return 0;
      var pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
    list.forEach(function (el, idx) {
      el.setAttribute("data-anim", "");
      el.style.setProperty("--i", String(idx));
    });
  }

  function initCompareSliders(root) {
    root.querySelectorAll(".compare").forEach(function (el) {
      if (el.dataset.presentCompareInit) return;
      el.dataset.presentCompareInit = "1";
      var before = el.querySelector(".compare__before");
      var handle = el.querySelector(".compare__handle");
      if (!before || !handle) return;
      el.addEventListener("dragstart", function (e) {
        e.preventDefault();
      });
      el.querySelectorAll("img").forEach(function (img) {
        img.setAttribute("draggable", "false");
        img.addEventListener("dragstart", function (e) {
          e.preventDefault();
        });
      });
      function setPos(pct) {
        pct = Math.max(0, Math.min(100, pct));
        before.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
        handle.style.left = pct + "%";
        el.setAttribute("data-fm-value", String(Math.round(pct)));
        emitWidgetChange(el.getAttribute("data-fm-widget"), Math.round(pct));
      }
      var dragging = false;
      function posFromEvent(e) {
        var rect = el.getBoundingClientRect();
        var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        return (x / rect.width) * 100;
      }
      el.addEventListener("pointerdown", function (e) {
        dragging = true;
        if (e.pointerId != null && el.setPointerCapture) {
          try {
            el.setPointerCapture(e.pointerId);
          } catch (err) {
            /* ignore */
          }
        }
        setPos(posFromEvent(e));
      });
      window.addEventListener("pointermove", function (e) {
        if (dragging) setPos(posFromEvent(e));
      });
      window.addEventListener("pointerup", function () {
        dragging = false;
      });
      el.addEventListener("click", function (e) {
        if (document.body.classList.contains("summary-v2") && e.pointerType === "touch") return;
        setPos(posFromEvent(e));
      });
      setPos(50);
    });
  }

  function tradeoffOptionsContainer(switchRoot) {
    if (!switchRoot) return null;
    var sel = switchRoot.getAttribute("data-trade-off-options");
    if (!sel) return switchRoot;
    var wizard = switchRoot.closest(".exploration-wizard");
    if (wizard) {
      var scoped = wizard.querySelector(sel);
      if (scoped) return scoped;
    }
    return document.querySelector(sel) || switchRoot;
  }

  function tradeoffOptionNodes(switchRoot) {
    var container = tradeoffOptionsContainer(switchRoot);
    if (!container) return [];
    return Array.prototype.slice.call(
      container.querySelectorAll(".trade-off__option[data-tradeoff-variant]")
    );
  }

  function activateTradeoffVariant(switchRoot, variant) {
    if (!switchRoot) return;
      var v = variant === "b" ? "b" : "a";
    switchRoot.querySelectorAll(".trade-off-switcher__tab[data-variant]").forEach(function (tab) {
        var on = tab.getAttribute("data-variant") === v;
        tab.classList.toggle("trade-off-switcher__tab--active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      });
      switchRoot.querySelectorAll("[data-variant-img]").forEach(function (media) {
        var on = media.getAttribute("data-variant-img") === v;
        media.classList.toggle("is-active", on);
      if (on) media.removeAttribute("hidden");
      else media.setAttribute("hidden", "");
        media.querySelectorAll("video").forEach(function (video) {
          if (on) {
            var dataSrc = video.getAttribute("data-src");
            if (dataSrc && !video.getAttribute("src")) {
              video.src = dataSrc;
              video.removeAttribute("data-src");
            }
            var p = video.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            video.pause();
          }
        });
      });
      if (!switchRoot.hasAttribute("data-trade-off-visual-only")) {
        switchRoot.querySelectorAll("[data-variant-panel]").forEach(function (panel) {
          var on = panel.getAttribute("data-variant-panel") === v;
          panel.classList.toggle("is-active", on);
          panel.hidden = !on;
        });
      }
      switchRoot.setAttribute("data-fm-value", v);
      emitWidgetChange(switchRoot.getAttribute("data-fm-widget"), v);
    tradeoffOptionNodes(switchRoot).forEach(function (opt) {
      var on = opt.getAttribute("data-tradeoff-variant") === v;
      opt.classList.toggle("trade-off__option--active", on);
      opt.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var slideId = presentSlideIdFromNode(switchRoot);
    var stateKey = tradeoffSwitcherStateKey(switchRoot, slideId);
    if (stateKey) presentInteractiveState[stateKey] = v;
    if (slideId === "p1-exploration") {
      var wizard = switchRoot.closest("[data-phase-wizard]");
      var activePhaseTab = wizard && wizard.querySelector(".trade-off-switcher__tab--active[data-step]");
      if (activePhaseTab && activePhaseTab.getAttribute("data-step") === "4") {
        presentInteractiveState[slideId + ":phase-step"] = v === "b" ? "5" : "4";
        updateSlideCounter();
      }
    }
    if (slideId === "p3-ideation" && switchRoot.classList.contains("mobile-ideation-concepts")) {
      presentInteractiveState[slideId + ":phase-step"] = v === "b" ? "2" : "1";
      updateSlideCounter();
    }
    var stepPanel = switchRoot.closest("[data-step-panel]");
    if (stepPanel) {
      stepPanel.querySelectorAll("[data-variant-caption]").forEach(function (cap) {
        var on = cap.getAttribute("data-variant-caption") === v;
        cap.hidden = !on;
      });
    }
  }

  function bindTradeOffSwitcher(switchRoot) {
    if (!switchRoot || switchRoot.dataset.presentTradeoffInit) return;
    var tabs = Array.prototype.slice.call(
      switchRoot.querySelectorAll(".trade-off-switcher__tab[data-variant]")
    );
    var options = tradeoffOptionNodes(switchRoot);
    if (!tabs.length && !options.length) return;
      switchRoot.dataset.presentTradeoffInit = "1";
    var slideId = presentSlideIdFromNode(switchRoot);
    var stateKey = tradeoffSwitcherStateKey(switchRoot, slideId);
    var initial =
      (stateKey && presentInteractiveState[stateKey]) || switchRoot.getAttribute("data-default") || "a";
    if (slideId === "p3-ideation" && switchRoot.classList.contains("mobile-ideation-concepts")) {
      var deckStep = presentInteractiveState[slideId + ":phase-step"];
      if (deckStep === "2") initial = "b";
      else if (deckStep === "1") initial = "a";
    }
    activateTradeoffVariant(switchRoot, initial);
    var optionHost = tradeoffOptionsContainer(switchRoot);
    var interactionRoot = optionHost && optionHost !== switchRoot ? optionHost : switchRoot;
    interactionRoot.addEventListener("click", function (e) {
      var option = e.target.closest(".trade-off__option[data-tradeoff-variant]");
      if (option && optionHost.contains(option)) {
        e.preventDefault();
        e.stopPropagation();
        activateTradeoffVariant(switchRoot, option.getAttribute("data-tradeoff-variant"));
        return;
      }
      var tab = e.target.closest(".trade-off-switcher__tab[data-variant]");
        if (!tab || !switchRoot.contains(tab)) return;
      e.preventDefault();
      e.stopPropagation();
      activateTradeoffVariant(switchRoot, tab.getAttribute("data-variant"));
    });
    interactionRoot.addEventListener("keydown", function (e) {
      var option = e.target.closest(".trade-off__option[data-tradeoff-variant]");
      if (option && optionHost.contains(option) && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        activateTradeoffVariant(switchRoot, option.getAttribute("data-tradeoff-variant"));
        return;
      }
      if (option && optionHost.contains(option) && !tabs.length && options.length) {
        var oidx = options.indexOf(option);
        if (oidx < 0) return;
        var onext = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") onext = options[(oidx + 1) % options.length];
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") onext = options[(oidx - 1 + options.length) % options.length];
        else if (e.key === "Home") onext = options[0];
        else if (e.key === "End") onext = options[options.length - 1];
        if (!onext) return;
        e.preventDefault();
        activateTradeoffVariant(switchRoot, onext.getAttribute("data-tradeoff-variant"));
        onext.focus();
        return;
      }
      var tab = e.target.closest(".trade-off-switcher__tab[data-variant]");
        if (!tab || !switchRoot.contains(tab)) return;
        var idx = tabs.indexOf(tab);
        if (idx < 0) return;
        var next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabs[(idx + 1) % tabs.length];
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = tabs[(idx - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
      activateTradeoffVariant(switchRoot, next.getAttribute("data-variant"));
        next.focus();
      });

    if (slideId === "p3-ideation" && switchRoot.classList.contains("mobile-ideation-concepts")) {
      var MOBILE_IDEATE_DECK_STEPS = 2;
      switchRoot._presentStepper = {
        count: MOBILE_IDEATE_DECK_STEPS,
        current: function () {
          return switchRoot.getAttribute("data-fm-value") === "b" ? 2 : 1;
        },
        activate: function (step) {
          var n = Math.max(1, Math.min(MOBILE_IDEATE_DECK_STEPS, parseInt(step, 10) || 1));
          activateTradeoffVariant(switchRoot, n === 2 ? "b" : "a");
        }
      };
      updateSlideCounter();
    }
  }

  function initTradeOffSwitchers(root) {
    if (!root) return;
    root.querySelectorAll("[data-trade-off-switcher]").forEach(bindTradeOffSwitcher);
  }

  /* Validation — interactive research board (card-driven zoom, drag/pinch pan, prototype toggle) */
  var VALIDATION_STEP_IDS = ["allocation", "landing", "attention"];
  var VALIDATION_PRESENT_STEPS = VALIDATION_STEP_IDS.length + 1;
  var VS_MAX_SCALE = 8;

  function initValidationConflicts(root) {
    if (!root) return;
    var host = root.querySelector("[data-validation-conflicts]");
    if (!host || host.dataset.validationInit) return;
    host.dataset.validationInit = "1";
    host.setAttribute("data-fm-widget", "raisin-validation-board");
    host.setAttribute("data-fm-kind", "validation");

    var fmSyncTimer = null;

    var stage = root.querySelector("[data-validation-stage]");
    var viewport = stage ? stage.querySelector("[data-vs-viewport]") : null;
    var canvas = stage ? stage.querySelector("[data-vs-canvas]") : null;
    var chip = stage ? stage.querySelector("[data-validation-chip]") : null;
    var videoWrap = stage ? stage.querySelector("[data-vs-video]") : null;
    var video = videoWrap ? videoWrap.querySelector("video") : null;
    var modeToggle = stage ? stage.querySelector("[data-vs-mode-toggle]") : null;
    var modeLabel = stage ? stage.querySelector("[data-vs-mode-label]") : null;
    var rail = host.querySelector("[data-vs-rail]");
    var cards = [].slice.call(host.querySelectorAll("[data-conflict-tab]"));
    var detailCopies = [].slice.call(host.querySelectorAll("[data-conflict-detail]"));
    var slideId = presentSlideIdFromNode(host);
    var stateKey = slideId ? slideId + ":phase-step" : "";
    var resultsPanel = host.querySelector("[data-validation-results]");
    var researchEnablement = host.querySelector("[data-validation-research-enablement]");
    var reduceMotion = REDUCE_MQ && REDUCE_MQ.matches;

    function syncValidationRightColumn() {
      var showResearch =
        stage && stage.getAttribute("data-mode") === "video";
      if (resultsPanel) resultsPanel.hidden = showResearch;
      if (researchEnablement) researchEnablement.hidden = !showResearch;
    }

    /* View state is resize-proof: scale + visible centre as fractions of the board */
    var view = { s: 1, cx: 0.5, cy: 0.5 };

    function clampView(v) {
      var s = Math.max(1, Math.min(VS_MAX_SCALE, v.s));
      var half = 0.5 / s;
      return {
        s: s,
        cx: Math.max(half, Math.min(1 - half, v.cx)),
        cy: Math.max(half, Math.min(1 - half, v.cy))
      };
    }

    function paint(animate) {
      if (!canvas || !viewport) return;
      var w = viewport.clientWidth;
      var h = viewport.clientHeight;
      var tx = w * (0.5 - view.cx * view.s);
      var ty = h * (0.5 - view.cy * view.s);
      canvas.style.transition =
        animate && !reduceMotion ? "transform 0.6s cubic-bezier(0.22, 0.7, 0.2, 1)" : "none";
      canvas.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + view.s + ")";
    }

    function setView(v, animate) {
      view = clampView(v);
      paint(animate);
    }

    function zoomAt(factor, px, py, animate) {
      /* px, py: pointer position inside the viewport as 0–1 */
      var s2 = Math.max(1, Math.min(VS_MAX_SCALE, view.s * factor));
      var ix = view.cx + (px - 0.5) / view.s;
      var iy = view.cy + (py - 0.5) / view.s;
      setView({ s: s2, cx: ix - (px - 0.5) / s2, cy: iy - (py - 0.5) / s2 }, animate);
      markFree();
    }

    function markFree() {
      if (chip) chip.classList.add("is-free");
    }

    function zoneView(card) {
      var direct = (card.getAttribute("data-view") || "").split(",").map(parseFloat);
      if (direct.length === 3 && !direct.some(isNaN)) {
        return {
          s: Math.max(1, Math.min(VS_MAX_SCALE, direct[0])),
          cx: direct[1],
          cy: direct[2]
        };
      }
      return { s: 1, cx: 0.5, cy: 0.5 };
    }

    function indexOfCard(id) {
      for (var k = 0; k < cards.length; k++) {
        if (cards[k].getAttribute("data-conflict-tab") === id) return k;
      }
      return 0;
    }

    function selectedId() {
      var active = cards.filter(function (c) {
        return c.classList.contains("is-active");
      })[0];
      return active ? active.getAttribute("data-conflict-tab") : cards[0].getAttribute("data-conflict-tab");
    }

    function pushValidationFm() {
      var tab = selectedId();
      var mode = stage ? stage.getAttribute("data-mode") : "board";
      var val =
        mode === "video"
          ? tab + "|video"
          : tab +
            "|board|" +
            [view.s, view.cx, view.cy]
              .map(function (n) {
                return Number(n).toFixed(4);
              })
              .join(",");
      if (host.getAttribute("data-fm-value") === val) return;
      host.setAttribute("data-fm-value", val);
      emitWidgetChange("raisin-validation-board", val);
    }

    function scheduleValidationFm() {
      clearTimeout(fmSyncTimer);
      fmSyncTimer = setTimeout(pushValidationFm, 70);
    }

    function selectCard(id, opts) {
      opts = opts || {};
      var card = cards[indexOfCard(id)];
      cards.forEach(function (c) {
        var on = c === card;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-selected", on ? "true" : "false");
        c.tabIndex = on ? 0 : -1;
      });
      detailCopies.forEach(function (copy) {
        var on = copy.getAttribute("data-conflict-detail") === card.getAttribute("data-conflict-tab");
        copy.classList.toggle("is-active", on);
        copy.setAttribute("aria-hidden", on ? "false" : "true");
      });
      if (opts.scroll !== false && rail && rail.scrollWidth > rail.clientWidth) {
        var left = card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2;
        if (typeof rail.scrollTo === "function") {
          rail.scrollTo({ left: left, behavior: reduceMotion ? "auto" : "smooth" });
        } else {
          rail.scrollLeft = left;
        }
      }
      if (stage && stage.getAttribute("data-mode") === "video") setMode("board");
      if (chip) {
        chip.textContent = card.getAttribute("data-chip") || "";
        chip.classList.remove("is-free");
      }
      if (opts.preserveView) {
        if (opts.view) setView(opts.view, false);
      } else {
        setView(zoneView(card), opts.animate !== false);
      }
      var stepIdx = VALIDATION_STEP_IDS.indexOf(card.getAttribute("data-conflict-tab"));
      if (stateKey) presentInteractiveState[stateKey] = String(stepIdx >= 0 ? stepIdx + 1 : VALIDATION_STEP_IDS.length);
      syncValidationRightColumn();
      updateSlideCounter();
      pushValidationFm();
    }

    /* Prototype toggle */
    function setMode(mode) {
      if (!stage) return;
      var isVideo = mode === "video";
      stage.setAttribute("data-mode", isVideo ? "video" : "board");
      if (modeToggle) modeToggle.setAttribute("aria-checked", isVideo ? "true" : "false");
      if (modeLabel) modeLabel.textContent = isVideo ? "Winning prototype" : "Research board";
      if (videoWrap) videoWrap.hidden = !isVideo;
      if (video) {
        if (isVideo) {
          var ds = video.getAttribute("data-src");
          if (ds && !video.getAttribute("src")) {
            video.src = ds;
            video.removeAttribute("data-src");
          }
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          video.pause();
        }
      }
      if (stateKey) {
        if (isVideo) {
          presentInteractiveState[stateKey] = String(VALIDATION_PRESENT_STEPS);
        } else {
          var activeId = selectedId();
          var stepIdx = VALIDATION_STEP_IDS.indexOf(activeId);
          presentInteractiveState[stateKey] = String(
            stepIdx >= 0 ? stepIdx + 1 : VALIDATION_STEP_IDS.length
          );
        }
      }
      syncValidationRightColumn();
      updateSlideCounter();
      pushValidationFm();
    }

    if (modeToggle) {
      modeToggle.addEventListener("click", function () {
        var isVideo = stage.getAttribute("data-mode") === "video";
        setMode(isVideo ? "board" : "video");
      });
    }

    /* Cards */
    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        selectCard(card.getAttribute("data-conflict-tab"));
      });
      card.addEventListener("keydown", function (e) {
        var idx = cards.indexOf(card);
        var target = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") target = (idx + 1) % cards.length;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") target = (idx - 1 + cards.length) % cards.length;
        else if (e.key === "Home") target = 0;
        else if (e.key === "End") target = cards.length - 1;
        if (target === null) return;
        e.preventDefault();
        e.stopPropagation();
        selectCard(cards[target].getAttribute("data-conflict-tab"));
        cards[target].focus();
      });
    });
    if (rail) {
      ["touchstart", "touchmove", "touchend"].forEach(function (type) {
        rail.addEventListener(type, function (e) { e.stopPropagation(); }, { passive: true });
      });
    }

    /* Pan + zoom gestures */
    if (viewport) {
      var pointers = {};
      var gesture = null;

      ["touchstart", "touchmove", "touchend"].forEach(function (type) {
        viewport.addEventListener(type, function (e) { e.stopPropagation(); }, { passive: true });
      });

      var activePointers = function () {
        return Object.keys(pointers).map(function (k) { return pointers[k]; });
      };
      var pinchMetrics = function (pts) {
        var dx = pts[0].x - pts[1].x;
        var dy = pts[0].y - pts[1].y;
        return { dist: Math.hypot(dx, dy) || 1, mx: (pts[0].x + pts[1].x) / 2, my: (pts[0].y + pts[1].y) / 2 };
      };
      var beginGesture = function () {
        var pts = activePointers();
        if (pts.length >= 2) {
          var m = pinchMetrics(pts);
          gesture = { type: "pinch", dist: m.dist, mx: m.mx, my: m.my };
        } else if (pts.length === 1) {
          gesture = { type: "pan", x: pts[0].x, y: pts[0].y };
        } else {
          gesture = null;
        }
      };

      viewport.addEventListener("pointerdown", function (e) {
        if (stage.getAttribute("data-mode") === "video") return;
        if (e.target.closest("[data-vs-controls]")) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
        viewport.classList.add("is-dragging");
        beginGesture();
      });
      viewport.addEventListener("pointermove", function (e) {
        if (!pointers[e.pointerId] || !gesture) return;
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        var rect = viewport.getBoundingClientRect();
        var pts = activePointers();
        if (gesture.type === "pan" && pts.length === 1) {
          var dx = pts[0].x - gesture.x;
          var dy = pts[0].y - gesture.y;
          gesture.x = pts[0].x;
          gesture.y = pts[0].y;
          setView({ s: view.s, cx: view.cx - dx / (rect.width * view.s), cy: view.cy - dy / (rect.height * view.s) }, false);
          markFree();
        } else if (gesture.type === "pinch" && pts.length >= 2) {
          var m = pinchMetrics(pts);
          var factor = m.dist / gesture.dist;
          /* zoom about the pinch midpoint, then follow its drift as a pan */
          var px = (gesture.mx - rect.left) / rect.width;
          var py = (gesture.my - rect.top) / rect.height;
          var s2 = Math.max(1, Math.min(VS_MAX_SCALE, view.s * factor));
          var ix = view.cx + (px - 0.5) / view.s;
          var iy = view.cy + (py - 0.5) / view.s;
          var cx2 = ix - (px - 0.5) / s2 - (m.mx - gesture.mx) / (rect.width * s2);
          var cy2 = iy - (py - 0.5) / s2 - (m.my - gesture.my) / (rect.height * s2);
          setView({ s: s2, cx: cx2, cy: cy2 }, false);
          gesture.dist = m.dist;
          gesture.mx = m.mx;
          gesture.my = m.my;
          markFree();
        }
      });
      var endPointer = function (e) {
        if (!pointers[e.pointerId]) return;
        delete pointers[e.pointerId];
        try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}
        beginGesture();
        if (!gesture) viewport.classList.remove("is-dragging");
        scheduleValidationFm();
      };
      viewport.addEventListener("pointerup", endPointer);
      viewport.addEventListener("pointercancel", endPointer);

      viewport.addEventListener(
        "wheel",
        function (e) {
          if (stage.getAttribute("data-mode") === "video") return;
          e.preventDefault();
          e.stopPropagation();
          var rect = viewport.getBoundingClientRect();
          var px = (e.clientX - rect.left) / rect.width;
          var py = (e.clientY - rect.top) / rect.height;
          var unit = e.deltaMode === 1 ? 16 : 1;
          var factor = Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.012 : 0.0025));
          zoomAt(factor, px, py, false);
          scheduleValidationFm();
        },
        { passive: false }
      );

      viewport.addEventListener("dblclick", function (e) {
        if (stage.getAttribute("data-mode") === "video") return;
        if (e.target.closest("[data-vs-controls]")) return;
        var rect = viewport.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;
        if (view.s > 1.6) {
          setView({ s: 1, cx: 0.5, cy: 0.5 }, true);
          markFree();
        } else {
          zoomAt(2.5, px, py, true);
        }
      });

      viewport.addEventListener("keydown", function (e) {
        if (stage.getAttribute("data-mode") === "video") return;
        var step = 0.12 / view.s;
        var handled = true;
        if (e.key === "+" || e.key === "=") zoomAt(1.4, 0.5, 0.5, true);
        else if (e.key === "-" || e.key === "_") zoomAt(1 / 1.4, 0.5, 0.5, true);
        else if (e.key === "0") { setView({ s: 1, cx: 0.5, cy: 0.5 }, true); markFree(); }
        else if (e.key === "ArrowLeft") { setView({ s: view.s, cx: view.cx - step, cy: view.cy }, true); markFree(); }
        else if (e.key === "ArrowRight") { setView({ s: view.s, cx: view.cx + step, cy: view.cy }, true); markFree(); }
        else if (e.key === "ArrowUp") { setView({ s: view.s, cx: view.cx, cy: view.cy - step }, true); markFree(); }
        else if (e.key === "ArrowDown") { setView({ s: view.s, cx: view.cx, cy: view.cy + step }, true); markFree(); }
        else handled = false;
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
        }
      });

      stage.querySelectorAll("[data-vs-zoom]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var kind = btn.getAttribute("data-vs-zoom");
          if (kind === "in") zoomAt(1.5, 0.5, 0.5, true);
          else if (kind === "out") zoomAt(1 / 1.5, 0.5, 0.5, true);
          else { setView({ s: 1, cx: 0.5, cy: 0.5 }, true); markFree(); }
          scheduleValidationFm();
        });
      });

      if (typeof ResizeObserver === "function") {
        new ResizeObserver(function () { paint(false); }).observe(viewport);
      }
    }

    host._presentStepper = {
      count: VALIDATION_PRESENT_STEPS,
      current: function () {
        if (stage && stage.getAttribute("data-mode") === "video") return VALIDATION_PRESENT_STEPS;
        var idx = VALIDATION_STEP_IDS.indexOf(selectedId());
        return idx >= 0 ? idx + 1 : VALIDATION_STEP_IDS.length;
      },
      activate: function (step) {
        var n = Math.max(1, Math.min(VALIDATION_PRESENT_STEPS, parseInt(step, 10) || 1));
        if (n === VALIDATION_PRESENT_STEPS) {
          var debateId = selectedId();
          if (VALIDATION_STEP_IDS.indexOf(debateId) < 0) {
            selectCard(VALIDATION_STEP_IDS[VALIDATION_STEP_IDS.length - 1], {
              animate: false,
              scroll: true
            });
          }
          setMode("video");
          return;
        }
        setMode("board");
        selectCard(VALIDATION_STEP_IDS[n - 1]);
      }
    };

    var saved = parseInt((stateKey && presentInteractiveState[stateKey]) || "1", 10) || 1;
    saved = Math.max(1, Math.min(VALIDATION_PRESENT_STEPS, saved));
    if (saved === VALIDATION_PRESENT_STEPS) {
      selectCard(VALIDATION_STEP_IDS[VALIDATION_STEP_IDS.length - 1], { animate: false, scroll: false });
      setMode("video");
    } else {
      selectCard(VALIDATION_STEP_IDS[saved - 1], { animate: false, scroll: false });
    }
    syncValidationRightColumn();

    global.PortfolioPresentFm.register("raisin-validation-board", function (val) {
      if (!val) return;
      var parts = val.split("|");
      var tab = parts[0];
      if (parts[1] === "video") {
        selectCard(tab, { animate: false, scroll: false, preserveView: true });
        setMode("video");
        return;
      }
      setMode("board");
      var nums = (parts[2] || "").split(",").map(parseFloat);
      var customView =
        nums.length === 3 && !nums.some(isNaN) ? { s: nums[0], cx: nums[1], cy: nums[2] } : null;
      selectCard(tab, {
        animate: false,
        scroll: false,
        preserveView: !!customView,
        view: customView,
      });
    });
  }

  var WIZARD_SCROLL_MAX_SCALE = 4;

  function initWizardScrollExplore(root) {
    if (!root) return;
    root.querySelectorAll("[data-wizard-scroll-viewport]").forEach(function (viewport) {
      if (viewport.dataset.wizardScrollInit) return;
      viewport.dataset.wizardScrollInit = "1";
      viewport.setAttribute("data-fm-widget", "raisin-visual-final-zoom");
      viewport.setAttribute("data-fm-kind", "panzoom");
      var canvas = viewport.querySelector("[data-wizard-scroll-canvas]");
      if (!canvas) return;
      var panFmTimer = null;
      var reduceMotion = REDUCE_MQ && REDUCE_MQ.matches;
      var scale = 1;
      var tx = 0;
      var ty = 0;
      var pointers = {};
      var gesture = null;

      function paint(animate) {
        canvas.style.transition =
          animate && !reduceMotion ? "transform 0.25s cubic-bezier(0.22, 0.7, 0.2, 1)" : "none";
        canvas.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
      }

      function clampPan() {
        var vw = viewport.clientWidth;
        var vh = viewport.clientHeight;
        var cw = canvas.offsetWidth * scale;
        var ch = canvas.offsetHeight * scale;
        var minX = Math.min(0, vw - cw);
        var minY = Math.min(0, vh - ch);
        tx = Math.max(minX, Math.min(0, tx));
        ty = Math.max(minY, Math.min(0, ty));
      }

      function setZoomed(on) {
        viewport.classList.toggle("is-zoomed", on);
        if (!on) {
          viewport.classList.remove("is-dragging");
          canvas.style.transform = "";
          canvas.style.transition = "";
        }
      }

      function setScale(next, anchorX, anchorY, animate) {
        var prev = scale;
        scale = Math.max(1, Math.min(WIZARD_SCROLL_MAX_SCALE, next));
        if (scale <= 1.01) {
          scale = 1;
          tx = 0;
          ty = 0;
          setZoomed(false);
          paint(false);
          return;
        }
        var ratio = scale / prev;
        tx = anchorX - ratio * (anchorX - tx);
        ty = anchorY - ratio * (anchorY - ty);
        setZoomed(true);
        viewport.scrollTop = 0;
        clampPan();
        paint(animate);
      }

      function reset(animate) {
        scale = 1;
        tx = 0;
        ty = 0;
        setZoomed(false);
        viewport.scrollTop = 0;
        viewport.scrollLeft = 0;
        paint(animate);
        pushPanFm();
      }

      function pushPanFm() {
        var val =
          scale > 1.01
            ? "z|" + [scale, tx, ty].map(function (n) { return String(Math.round(n)); }).join(",")
            : "s|" + Math.round(viewport.scrollLeft) + "," + Math.round(viewport.scrollTop);
        if (viewport.getAttribute("data-fm-value") === val) return;
        viewport.setAttribute("data-fm-value", val);
        emitWidgetChange("raisin-visual-final-zoom", val);
      }

      function schedulePanFm() {
        clearTimeout(panFmTimer);
        panFmTimer = setTimeout(pushPanFm, 70);
      }

      function zoomAt(factor, anchorX, anchorY, animate) {
        setScale(scale * factor, anchorX, anchorY, animate);
      }

      function activePointers() {
        return Object.keys(pointers).map(function (k) {
          return pointers[k];
        });
      }

      function pinchMetrics(pts) {
        var dx = pts[0].x - pts[1].x;
        var dy = pts[0].y - pts[1].y;
        return {
          dist: Math.hypot(dx, dy) || 1,
          mx: (pts[0].x + pts[1].x) / 2,
          my: (pts[0].y + pts[1].y) / 2
        };
      }

      function beginGesture() {
        var pts = activePointers();
        if (pts.length >= 2) {
          var m = pinchMetrics(pts);
          gesture = { type: "pinch", dist: m.dist, mx: m.mx, my: m.my, scale0: scale };
        } else if (pts.length === 1) {
          if (scale > 1.01) {
            gesture = { type: "pan", x: pts[0].x, y: pts[0].y };
          } else {
            gesture = {
              type: "scroll-pan",
              startX: pts[0].x,
              startY: pts[0].y,
              scrollL0: viewport.scrollLeft,
              scrollT0: viewport.scrollTop
            };
          }
        } else {
          gesture = null;
        }
      }

      ["touchstart", "touchmove", "touchend"].forEach(function (type) {
        viewport.addEventListener(
          type,
          function (e) {
            if (scale > 1.01) e.stopPropagation();
          },
          { passive: true }
        );
      });

      viewport.addEventListener("pointerdown", function (e) {
        if (e.target.closest("[data-wizard-scroll-controls]")) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        try {
          viewport.setPointerCapture(e.pointerId);
        } catch (_) {}
        beginGesture();
        if (gesture && (gesture.type === "pan" || gesture.type === "scroll-pan")) {
          viewport.classList.add("is-dragging");
        }
      });

      viewport.addEventListener("pointermove", function (e) {
        if (!pointers[e.pointerId] || !gesture) return;
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        var rect = viewport.getBoundingClientRect();
        var pts = activePointers();
        if (gesture.type === "scroll-pan" && pts.length === 1 && scale <= 1.01) {
          viewport.scrollLeft = gesture.scrollL0 - (pts[0].x - gesture.startX);
          viewport.scrollTop = gesture.scrollT0 - (pts[0].y - gesture.startY);
        } else if (gesture.type === "pan" && pts.length === 1 && scale > 1.01) {
          var dx = pts[0].x - gesture.x;
          var dy = pts[0].y - gesture.y;
          gesture.x = pts[0].x;
          gesture.y = pts[0].y;
          tx += dx;
          ty += dy;
          clampPan();
          paint(false);
        } else if (gesture.type === "pinch" && pts.length >= 2) {
          var m = pinchMetrics(pts);
          var factor = m.dist / gesture.dist;
          var ax = gesture.mx - rect.left - tx;
          var ay = gesture.my - rect.top - ty;
          setScale(gesture.scale0 * factor, ax, ay, false);
          gesture.dist = m.dist;
          gesture.mx = m.mx;
          gesture.my = m.my;
        }
      });

      function endPointer(e) {
        if (!pointers[e.pointerId]) return;
        delete pointers[e.pointerId];
        try {
          viewport.releasePointerCapture(e.pointerId);
        } catch (_) {}
        beginGesture();
        if (!gesture) viewport.classList.remove("is-dragging");
        schedulePanFm();
      }
      viewport.addEventListener("pointerup", endPointer);
      viewport.addEventListener("pointercancel", endPointer);

      viewport.addEventListener(
        "wheel",
        function (e) {
          if (e.ctrlKey || scale > 1.01) {
            e.preventDefault();
            e.stopPropagation();
            var rect = viewport.getBoundingClientRect();
            var ax = e.clientX - rect.left - tx;
            var ay = e.clientY - rect.top - ty;
            var unit = e.deltaMode === 1 ? 16 : 1;
            var factor = Math.exp(-e.deltaY * unit * 0.012);
            setScale(scale * factor, ax, ay, false);
            schedulePanFm();
            return;
          }
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            e.preventDefault();
            viewport.scrollLeft += e.deltaX;
            schedulePanFm();
          }
        },
        { passive: false }
      );

      viewport.addEventListener("dblclick", function (e) {
        e.preventDefault();
        var rect = viewport.getBoundingClientRect();
        var ax = e.clientX - rect.left - tx;
        var ay = e.clientY - rect.top - ty;
        if (scale > 1.35) reset(true);
        else setScale(2.25, ax, ay, true);
      });

      viewport.addEventListener("keydown", function (e) {
        var handled = true;
        var midX = viewport.clientWidth / 2;
        var midY = viewport.clientHeight / 2;
        if (e.key === "+" || e.key === "=") zoomAt(1.4, midX, midY, true);
        else if (e.key === "-" || e.key === "_") zoomAt(1 / 1.4, midX, midY, true);
        else if (e.key === "0") reset(true);
        else handled = false;
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
        }
      });

      var controlsRoot =
        viewport.closest(".exploration-wizard__asset-slot--scroll-explore") ||
        viewport.parentElement;
      var zoomBtns = controlsRoot
        ? controlsRoot.querySelectorAll("[data-wizard-zoom]")
        : [];
      zoomBtns.forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var kind = btn.getAttribute("data-wizard-zoom");
          var midX = viewport.clientWidth / 2;
          var midY = viewport.clientHeight / 2;
          if (kind === "in") zoomAt(1.5, midX, midY, true);
          else if (kind === "out") zoomAt(1 / 1.5, midX, midY, true);
          else reset(true);
        });
      });

      if (typeof ResizeObserver === "function") {
        new ResizeObserver(function () {
          if (scale > 1.01) clampPan();
          paint(false);
        }).observe(viewport);
      }

      pushPanFm();

      global.PortfolioPresentFm.register("raisin-visual-final-zoom", function (val) {
        if (!val) return;
        if (val.charAt(0) === "z") {
          var nums = val.slice(2).split(",").map(parseFloat);
          if (nums.length < 3 || nums.some(isNaN)) return;
          scale = nums[0];
          tx = nums[1];
          ty = nums[2];
          setZoomed(true);
          clampPan();
          paint(false);
          return;
        }
        if (val.charAt(0) === "s") {
          var scroll = val.slice(2).split(",").map(parseFloat);
          if (scroll.length < 2 || scroll.some(isNaN)) return;
          scale = 1;
          tx = 0;
          ty = 0;
          setZoomed(false);
          viewport.scrollLeft = scroll[0];
          viewport.scrollTop = scroll[1];
          paint(false);
        }
      });
    });
  }

  function syncWireframeVariantSwitcher(wizardRoot) {
    if (!wizardRoot) return;
    var switchRoot = wizardRoot.querySelector(".exploration-wizard__variant-switcher[data-trade-off-switcher]");
    if (!switchRoot) return;
    bindTradeOffSwitcher(switchRoot);
    var slideId = presentSlideIdFromNode(wizardRoot);
    var stateKey = tradeoffSwitcherStateKey(switchRoot, slideId);
    var initial =
      (stateKey && presentInteractiveState[stateKey]) || switchRoot.getAttribute("data-default") || "b";
    activateTradeoffVariant(switchRoot, initial);
  }

  var WEALTH_HUB_JOURNEY_STEPS = [
    { n: 1, label: "Listen" },
    { n: 2, label: "Synthesise" },
    { n: 3, label: "Ideation" },
    { n: 4, label: "Validation" },
    { n: 5, label: "Visual design" },
    { n: 6, label: "Launch" }
  ];

  var WEALTH_HUB_JOURNEY_SLIDE_IDS = {
    1: "p1-baseline",
    2: "p1-co-creation",
    3: "p1-exploration",
    4: "p1-tradeoff-01",
    5: "p1-visual-system",
    6: "p1-outcomes"
  };

  var MOBILE_JOURNEY_STEPS = [
    { n: 1, label: "Research" },
    { n: 2, label: "Parity" },
    { n: 3, label: "Ideation" },
    { n: 4, label: "Validation" },
    { n: 5, label: "Final pass" },
    { n: 6, label: "Launch" }
  ];

  var MOBILE_JOURNEY_SLIDE_IDS = {
    1: "p3-desk-research",
    2: "p3-parity",
    3: "p3-ideation",
    4: "p3-maze",
    5: "p3-visual-system",
    6: "p3-shipped"
  };

  function journeyManifestIndex(slideIdsMap, stepN) {
    var slideId = slideIdsMap[stepN];
    if (!slideId) return -1;
    for (var j = 0; j < SLIDE_MANIFEST.length; j++) {
      if (SLIDE_MANIFEST[j].id === slideId) return j;
    }
    return -1;
  }

  function wealthHubJourneyManifestIndex(stepN) {
    return journeyManifestIndex(WEALTH_HUB_JOURNEY_SLIDE_IDS, stepN);
  }

  function mobileJourneyManifestIndex(stepN) {
    return journeyManifestIndex(MOBILE_JOURNEY_SLIDE_IDS, stepN);
  }

  function journeyProgramFromStrip(strip) {
    return strip.getAttribute("data-journey-program") === "mobile" ? "mobile" : "wealth";
  }

  function applyWealthHubJourneyStrip(strip) {
    if (!strip) return;
    var current = parseInt(strip.getAttribute("data-journey-step"), 10) || 1;
    strip.querySelectorAll(".workflow-strip__step[data-journey-index]").forEach(function (el) {
      var n = parseInt(el.getAttribute("data-journey-index"), 10);
      el.classList.remove("workflow-strip__step--done", "workflow-strip__step--active", "workflow-strip__step--upcoming");
      if (n < current) el.classList.add("workflow-strip__step--done");
      else if (n === current) el.classList.add("workflow-strip__step--active");
      else el.classList.add("workflow-strip__step--upcoming");
    });
  }

  function renderWealthHubJourneyStrip(strip) {
    if (!strip || strip.dataset.journeyBuilt) return;
    var program = journeyProgramFromStrip(strip);
    var steps = program === "mobile" ? MOBILE_JOURNEY_STEPS : WEALTH_HUB_JOURNEY_STEPS;
    var slideIds = program === "mobile" ? MOBILE_JOURNEY_SLIDE_IDS : WEALTH_HUB_JOURNEY_SLIDE_IDS;
    var defaultLabel = program === "mobile" ? "Mobile journey" : "Wealth Hub journey";
    strip.dataset.journeyBuilt = "1";
    strip.classList.add("wealth-hub-journey");
    strip.setAttribute("role", "navigation");
    if (!strip.getAttribute("aria-label")) strip.setAttribute("aria-label", defaultLabel);
    strip.textContent = "";
    steps.forEach(function (step, idx) {
      if (idx > 0) {
        var arrow = document.createElement("span");
        arrow.className = "workflow-strip__arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";
        strip.appendChild(arrow);
      }
      var pill = document.createElement("button");
      pill.type = "button";
      pill.className = "workflow-strip__step";
      pill.setAttribute("data-journey-index", String(step.n));
      var targetIdx = journeyManifestIndex(slideIds, step.n);
      if (targetIdx >= 0) {
        pill.setAttribute("data-journey-slide-index", String(targetIdx));
        var targetTitle = SLIDE_MANIFEST[targetIdx].title;
        pill.setAttribute(
          "aria-label",
          "Go to step " + step.n + ": " + step.label + (targetTitle ? " — " + targetTitle : "")
        );
      } else {
        pill.setAttribute("aria-label", step.label);
      }
      var num = document.createElement("span");
      num.className = "workflow-strip__n";
      num.setAttribute("aria-hidden", "true");
      num.textContent = String(step.n);
      pill.appendChild(num);
      pill.appendChild(document.createTextNode(" " + step.label));
      strip.appendChild(pill);
    });
    applyWealthHubJourneyStrip(strip);
  }

  function initWealthHubJourneys(root) {
    root.querySelectorAll(".wealth-hub-journey[data-journey-step]").forEach(function (strip) {
      renderWealthHubJourneyStrip(strip);
      applyWealthHubJourneyStrip(strip);
    });
  }

  function bindWealthHubJourneyNavigation() {
    if (stage.dataset.wealthHubJourneyNavBound) return;
    stage.dataset.wealthHubJourneyNavBound = "1";
    stage.addEventListener("click", function (e) {
      var pill = e.target.closest(".wealth-hub-journey[data-journey-step] .workflow-strip__step[data-journey-index]");
      if (!pill || !stage.contains(pill)) return;
      var idxAttr = pill.getAttribute("data-journey-slide-index");
      var strip = pill.closest(".wealth-hub-journey[data-journey-step]");
      var program = strip ? journeyProgramFromStrip(strip) : "wealth";
      var slideIds = program === "mobile" ? MOBILE_JOURNEY_SLIDE_IDS : WEALTH_HUB_JOURNEY_SLIDE_IDS;
      var idx =
        idxAttr !== null && idxAttr !== ""
          ? parseInt(idxAttr, 10)
          : journeyManifestIndex(slideIds, parseInt(pill.getAttribute("data-journey-index"), 10));
      if (idx >= 0) {
        e.preventDefault();
        go(idx);
      }
    });
  }

  function initPhaseWizards(root) {
    root.querySelectorAll("[data-phase-wizard]").forEach(function (wizardRoot) {
      if (wizardRoot.dataset.presentPhaseWizardInit) return;
      wizardRoot.dataset.presentPhaseWizardInit = "1";
      var tabs = Array.prototype.slice.call(
        wizardRoot.querySelectorAll(
          ".phase-wizard__stepper .trade-off-switcher__tab[data-step], .exploration-wizard__stepper .trade-off-switcher__tab[data-step]"
        )
      );
      var panels = Array.prototype.slice.call(wizardRoot.querySelectorAll("[data-step-panel]"));
      if (!tabs.length || !panels.length) return;

      function syncIdeateStepCopy(wizardRoot, step) {
        var switcher = wizardRoot.closest(".trade-off-switcher");
        if (!switcher) return;
        var s = String(step);
        var copyRoot = switcher.querySelector(".ideate-step-copy");
        if (copyRoot) {
          copyRoot.querySelectorAll("[data-step-copy]").forEach(function (el) {
            el.hidden = el.getAttribute("data-step-copy") !== s;
          });
        }
        switcher.querySelectorAll("[data-step-headline]").forEach(function (el) {
          el.hidden = el.getAttribute("data-step-headline") !== s;
        });
        switcher.querySelectorAll("[data-step-support]").forEach(function (el) {
          el.hidden = el.getAttribute("data-step-support") !== s;
        });
        switcher.querySelectorAll("[data-step-caption]").forEach(function (el) {
          el.hidden = el.getAttribute("data-step-caption") !== s;
        });
        var blocksRoot = switcher.querySelector(".ideate-step-blocks");
        if (blocksRoot) {
          blocksRoot.querySelectorAll("[data-step-context]").forEach(function (el) {
            el.hidden = el.getAttribute("data-step-context") !== s;
          });
        } else {
          var conflict = switcher.querySelector(".ideate-conflict-tradeoff");
          if (conflict) conflict.hidden = s !== "4";
        }
      }

      function activateStep(step) {
        var s = String(step);
        var sNum = parseInt(s, 10);
        tabs.forEach(function (tab) {
          var on = tab.getAttribute("data-step") === s;
          tab.classList.toggle("is-done", parseInt(tab.getAttribute("data-step"), 10) < sNum);
          tab.classList.toggle("trade-off-switcher__tab--active", on);
          tab.setAttribute("aria-selected", on ? "true" : "false");
          tab.tabIndex = on ? 0 : -1;
        });
        panels.forEach(function (panel) {
          var on = panel.getAttribute("data-step-panel") === s;
          panel.classList.toggle("is-active", on);
          panel.hidden = !on;
          panel.querySelectorAll("video").forEach(function (video) {
            if (on) {
              var dataSrc = video.getAttribute("data-src");
              if (dataSrc && !video.getAttribute("src")) {
                video.src = dataSrc;
                video.removeAttribute("data-src");
              }
              var p = video.play();
              if (p && p.catch) p.catch(function () {});
            } else {
              video.pause();
            }
          });
        });
        wizardRoot.querySelectorAll(".wh-phase-breakdown__item").forEach(function (item) {
          var on = item.getAttribute("data-step") === s;
          item.classList.toggle("wh-phase-breakdown__item--active", on);
        });
        if (wizardRoot.classList.contains("exploration-wizard") || wizardRoot.classList.contains("visual-system-wizard")) {
          var slide = wizardRoot.closest(".present-slide");
          if (slide) bindLightboxInRoot(slide);
        }
        var slideId = presentSlideIdFromNode(wizardRoot);
        if (slideId) {
          if (slideId === "p1-exploration" && s === "4") {
            var switchRoot = wizardRoot.querySelector(
              ".exploration-wizard__variant-switcher[data-trade-off-switcher]"
            );
            var variant = switchRoot ? switchRoot.getAttribute("data-fm-value") || "a" : "a";
            presentInteractiveState[slideId + ":phase-step"] = variant === "b" ? "5" : "4";
          } else {
            presentInteractiveState[slideId + ":phase-step"] = s;
          }
        }
        var activePanel = wizardRoot.querySelector('[data-step-panel="' + s + '"]');
        if (activePanel && activePanel.querySelector(".exploration-wizard__variant-switcher")) {
          syncWireframeVariantSwitcher(wizardRoot);
          if (slideId === "p1-exploration" && s === "4") {
            var conceptRoot = wizardRoot.querySelector(
              ".exploration-wizard__variant-switcher[data-trade-off-switcher]"
            );
            var vAfter = conceptRoot ? conceptRoot.getAttribute("data-fm-value") || "a" : "a";
            presentInteractiveState[slideId + ":phase-step"] = vAfter === "b" ? "5" : "4";
          }
        }
        var wid = wizardRoot.getAttribute("data-fm-widget");
        if (wid) {
          wizardRoot.setAttribute("data-fm-value", s);
          emitWidgetChange(wid, s);
        }
        syncIdeateStepCopy(wizardRoot, s);
        updateSlideCounter();
      }

      var slideId = presentSlideIdFromNode(wizardRoot);
      var IDEATE_CONFLICT_DECK_STEPS = 5;

      function ideateConceptSwitcher() {
        return wizardRoot.querySelector(".exploration-wizard__variant-switcher[data-trade-off-switcher]");
      }

      function ideateTabStep() {
        var active = tabs.filter(function (t) {
          return t.classList.contains("trade-off-switcher__tab--active");
        })[0];
        return active ? parseInt(active.getAttribute("data-step"), 10) : 1;
      }

      function ideateDeckStep() {
        var tabStep = ideateTabStep();
        if (tabStep < 4) return tabStep;
        var switchRoot = ideateConceptSwitcher();
        var v = switchRoot ? switchRoot.getAttribute("data-fm-value") || "a" : "a";
        return v === "b" ? 5 : 4;
      }

      function activateIdeateDeckStep(deckStep) {
        deckStep = Math.max(1, Math.min(IDEATE_CONFLICT_DECK_STEPS, parseInt(deckStep, 10) || 1));
        if (deckStep <= 3) {
          activateStep(String(deckStep));
          return;
        }
        activateStep("4");
        var switchRoot = ideateConceptSwitcher();
        if (switchRoot) {
          bindTradeOffSwitcher(switchRoot);
          activateTradeoffVariant(switchRoot, deckStep === 5 ? "b" : "a");
        } else if (slideId) {
          presentInteractiveState[slideId + ":phase-step"] = String(deckStep);
          updateSlideCounter();
        }
      }

      wizardRoot._presentStepper =
        slideId === "p1-exploration"
          ? {
              count: IDEATE_CONFLICT_DECK_STEPS,
              current: ideateDeckStep,
              activate: activateIdeateDeckStep
            }
          : {
              count: tabs.length,
              current: function () {
                var active = tabs.filter(function (t) {
                  return t.classList.contains("trade-off-switcher__tab--active");
                })[0];
                return active ? parseInt(active.getAttribute("data-step"), 10) : 1;
              },
              activate: activateStep
            };

      var savedStep =
        slideId && presentInteractiveState[slideId + ":phase-step"]
          ? presentInteractiveState[slideId + ":phase-step"]
          : null;
      if (slideId === "p1-visual-system" && savedStep && parseInt(savedStep, 10) > tabs.length) {
        savedStep = String(tabs.length);
      }
      if (slideId === "p1-exploration" && savedStep === "5") {
        activateIdeateDeckStep(5);
      } else {
        activateStep(
          savedStep && savedStep !== "5"
            ? savedStep
            : wizardRoot.getAttribute("data-default") || "1"
        );
      }

      wizardRoot.addEventListener("click", function (e) {
        var variantTab = e.target.closest(
          ".exploration-wizard__variant-switcher .trade-off-switcher__tab[data-variant]"
        );
        if (variantTab && wizardRoot.contains(variantTab)) {
          var variantRoot = variantTab.closest("[data-trade-off-switcher]");
          if (variantRoot) {
            e.preventDefault();
            e.stopPropagation();
            bindTradeOffSwitcher(variantRoot);
            activateTradeoffVariant(variantRoot, variantTab.getAttribute("data-variant"));
          }
          return;
        }
        var tab = e.target.closest(".trade-off-switcher__tab[data-step]");
        if (tab && wizardRoot.contains(tab)) {
          var phaseStep = tab.getAttribute("data-step");
          activateStep(phaseStep);
          if (slideId === "p1-exploration" && phaseStep === "4") {
            var switchRoot = ideateConceptSwitcher();
            if (switchRoot) {
              bindTradeOffSwitcher(switchRoot);
              activateTradeoffVariant(switchRoot, "a");
            }
          }
          return;
        }
        var breakdown = e.target.closest(".wh-phase-breakdown__item[data-step]");
        if (breakdown && wizardRoot.contains(breakdown)) {
          var breakdownStep = breakdown.getAttribute("data-step");
          activateStep(breakdownStep);
          if (slideId === "p1-exploration" && breakdownStep === "4") {
            var switchRoot = ideateConceptSwitcher();
            if (switchRoot) {
              bindTradeOffSwitcher(switchRoot);
              activateTradeoffVariant(switchRoot, "a");
            }
          }
        }
      });

      wizardRoot.addEventListener("keydown", function (e) {
        var tab = e.target.closest(".trade-off-switcher__tab[data-step]");
        if (!tab || !wizardRoot.contains(tab)) return;
        var idx = tabs.indexOf(tab);
        if (idx < 0) return;
        var isNextKey = e.key === "ArrowRight" || e.key === "ArrowDown";
        var isPrevKey = e.key === "ArrowLeft" || e.key === "ArrowUp";
        /* At first/last sub-step, let the deck handler advance the slide instead of looping */
        if (isNextKey && idx >= tabs.length - 1) return;
        if (isPrevKey && idx <= 0) return;
        var next = null;
        if (isNextKey) next = tabs[idx + 1];
        else if (isPrevKey) next = tabs[idx - 1];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        activateStep(next.getAttribute("data-step"));
        next.focus();
      });
    });
  }

  function initExplorationWizards(root) {
    root.querySelectorAll("[data-exploration-wizard]").forEach(function (el) {
      if (!el.hasAttribute("data-phase-wizard")) el.setAttribute("data-phase-wizard", "");
      if (!el.getAttribute("data-journey-anchor")) el.setAttribute("data-journey-anchor", "3");
    });
    initPhaseWizards(root);
  }

  function initTabsCompare(root) {
    root.querySelectorAll("[data-tabs-compare]").forEach(function (tabsRoot) {
      if (tabsRoot.dataset.presentTabsInit) return;
      tabsRoot.dataset.presentTabsInit = "1";
      var tabs = Array.prototype.slice.call(tabsRoot.querySelectorAll('[role="tab"]'));
      var panels = Array.prototype.slice.call(tabsRoot.querySelectorAll('[role="tabpanel"]'));
      if (!tabs.length || !panels.length) return;
      function activateTab(tab) {
        var id = tab.getAttribute("data-tab");
        tabs.forEach(function (t) {
          var selected = t === tab;
          t.classList.toggle("is-active", selected);
          if (t.classList.contains("trade-off-switcher__tab")) {
            t.classList.toggle("trade-off-switcher__tab--active", selected);
          }
          t.setAttribute("aria-selected", selected ? "true" : "false");
          t.tabIndex = selected ? 0 : -1;
        });
        panels.forEach(function (panel) {
          panel.hidden = panel.getAttribute("data-tab-panel") !== id;
        });
        tabsRoot.setAttribute("data-fm-value", id || "");
        emitWidgetChange(tabsRoot.getAttribute("data-fm-widget"), id || "");
      }
      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          activateTab(tab);
        });
        tab.addEventListener("keydown", function (e) {
          var index = tabs.indexOf(tab);
          var next = -1;
          if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
          else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = tabs.length - 1;
          if (next >= 0) {
            e.preventDefault();
            activateTab(tabs[next]);
            tabs[next].focus();
          }
        });
      });
      var active = tabsRoot.querySelector('[role="tab"][aria-selected="true"]') || tabs[0];
      if (active) activateTab(active);
    });
  }

  function initPrototypePersonas(root) {
    root.querySelectorAll("[data-prototype-shell]").forEach(function (shell) {
      if (shell.dataset.presentProtoInit) return;
      shell.dataset.presentProtoInit = "1";
      var switcher = shell.querySelector("[data-prototype-personas]");
      var frame = shell.querySelector("[data-prototype-frame]");
      if (!switcher || !frame) return;
      var tabs = Array.prototype.slice.call(switcher.querySelectorAll("[data-persona-id]"));
      if (!tabs.length) return;
      function sendPersona(personaId) {
        if (!frame.contentWindow) return;
        frame.contentWindow.postMessage({ type: "persona-select", personaId: personaId }, "*");
      }
      function activateTab(tab) {
        tabs.forEach(function (btn) {
          var isActive = btn === tab;
          btn.classList.toggle("prototype-persona-tab--active", isActive);
          btn.classList.toggle("trade-off-switcher__tab--active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
          btn.tabIndex = isActive ? 0 : -1;
        });
        var personaId = tab.getAttribute("data-persona-id");
        sendPersona(personaId);
        switcher.setAttribute("data-fm-value", personaId || "");
        emitWidgetChange(switcher.getAttribute("data-fm-widget"), personaId || "");
      }
      switcher.addEventListener("click", function (e) {
        var tab = e.target.closest("[data-persona-id]");
        if (!tab || tabs.indexOf(tab) < 0) return;
        activateTab(tab);
      });
      frame.addEventListener("load", function () {
        var active = switcher.querySelector(".prototype-persona-tab--active") || tabs[0];
        if (active) sendPersona(active.getAttribute("data-persona-id"));
      });
    });
  }

  function syncMarqueeSpeed(track) {
    var distance = track.scrollWidth / 2;
    if (!distance) return;
    track.style.animationDuration = distance / MARQUEE_PX_PER_SEC + "s";
  }

  function initProofQuotesMarquee(root) {
    root.querySelectorAll(".present-proof-quotes, .quote-marquee").forEach(function (wrap) {
      wrap.classList.remove("is-animation-paused");
      var track = wrap.querySelector(".marquee__track");
      if (!track) return;
      track.classList.remove("is-animation-paused");
      syncMarqueeSpeed(track);
    });
  }

  function initWowMarquees(root) {
    root.querySelectorAll(".wow-beat__marquee-track").forEach(function (track) {
      var sets = track.querySelectorAll(".wow-beat__marquee-set");
      if (!sets.length) return;
      if (sets.length === 1) {
        var clone = sets[0].cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      }
      syncMarqueeSpeed(track);
      track.classList.remove("is-animation-paused");
    });
    root.querySelectorAll(".wow-beat, .cura-filmstrip, .quote-marquee, .present-proof-quotes").forEach(function (el) {
      el.classList.remove("is-animation-paused");
    });
    initProofQuotesMarquee(root);
  }

  function buildPostMvpCarouselControls(carouselRoot, slides, onSelect) {
    var nav = carouselRoot.querySelector(".post-mvp-carousel__nav");
    var dotsWrap;
    var prevBtn;
    var nextBtn;
    var dotsOnly = carouselRoot.hasAttribute("data-carousel-dots-only");

    if (!nav) {
      nav = document.createElement("div");
      nav.className = "post-mvp-carousel__nav";
      if (dotsOnly) nav.classList.add("post-mvp-carousel__nav--dots-only");

      if (!dotsOnly) {
      prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "post-mvp-carousel__prev";
      prevBtn.setAttribute("aria-label", "Previous slide");
      prevBtn.textContent = "←";
      }

      dotsWrap = document.createElement("div");
      dotsWrap.className = "post-mvp-carousel__dots";
      dotsWrap.setAttribute("role", "tablist");
      dotsWrap.setAttribute("aria-label", carouselRoot.getAttribute("aria-label") || "Carousel slides");

      if (!dotsOnly) {
      nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "post-mvp-carousel__next";
      nextBtn.setAttribute("aria-label", "Next slide");
      nextBtn.textContent = "→";
      }

      slides.forEach(function (_slide, slideIndex) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "post-mvp-carousel__dot";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", "Slide " + (slideIndex + 1));
        dot.addEventListener("click", function () {
          onSelect(slideIndex);
        });
        dotsWrap.appendChild(dot);
      });

      if (prevBtn) nav.appendChild(prevBtn);
      nav.appendChild(dotsWrap);
      if (nextBtn) nav.appendChild(nextBtn);
      carouselRoot.appendChild(nav);
    } else {
      dotsWrap = nav.querySelector(".post-mvp-carousel__dots");
      prevBtn = nav.querySelector(".post-mvp-carousel__prev");
      nextBtn = nav.querySelector(".post-mvp-carousel__next");
    }

    var dots = Array.prototype.slice.call(dotsWrap.querySelectorAll(".post-mvp-carousel__dot"));
    ensurePostMvpCarouselDotFills(dots);
    return {
      dots: dots,
      prev: prevBtn,
      next: nextBtn
    };
  }

  function ensurePostMvpCarouselDotFills(dots) {
    dots.forEach(function (dot) {
      if (dot.querySelector(".post-mvp-carousel__dot-fill")) return;
      var fill = document.createElement("span");
      fill.className = "post-mvp-carousel__dot-fill";
      fill.setAttribute("aria-hidden", "true");
      dot.appendChild(fill);
    });
  }

  function setPostMvpCarouselDotFillProgress(dots, activeIndex, ratio) {
    var clamped = Math.max(0, Math.min(1, ratio));
    dots.forEach(function (dot, dotIndex) {
      var fill = dot.querySelector(".post-mvp-carousel__dot-fill");
      if (!fill) return;
      fill.style.animation = "none";
      if (dotIndex === activeIndex) {
        fill.style.width = clamped * 100 + "%";
      } else {
        fill.style.width = "0%";
      }
    });
  }

  function registerPresentPostMvpCarousel(carouselRoot, goToRemote) {
    window.PortfolioCarousel = window.PortfolioCarousel || {
      _fn: [],
      go: function (el, n) {
        this._fn.forEach(function (entry) {
          if (entry.el === el) entry.go(n);
        });
      }
    };
    window.PortfolioCarousel._fn.push({
      el: carouselRoot,
      go: function (n) {
        goToRemote(n);
      }
    });
  }

  function syncPostMvpCarouselDots(dots, activeIndex) {
    dots.forEach(function (dot, dotIndex) {
      var isActive = dotIndex === activeIndex;
      dot.classList.toggle("is-active", isActive);
      if (isActive) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  function initCarousels(root) {
    root.querySelectorAll("[data-post-mvp-carousel]").forEach(function (carouselRoot) {
      if (carouselRoot.dataset.presentCarouselInit) return;
      carouselRoot.dataset.presentCarouselInit = "1";
      carouselRoot.querySelectorAll(":scope > .post-mvp-carousel__dots").forEach(function (el) {
        el.remove();
      });
      carouselRoot.querySelectorAll(":scope > .post-mvp-carousel__nav").forEach(function (el) {
        el.remove();
      });
      var track = carouselRoot.querySelector(".post-mvp-carousel__track");
      var slides = Array.prototype.slice.call(carouselRoot.querySelectorAll(".post-mvp-carousel__slide"));
      if (!track || slides.length < 2) return;
      var index = 0;
      var intervalMs = parseInt(carouselRoot.getAttribute("data-interval") || "4500", 10);
      carouselRoot.style.setProperty("--carousel-interval", intervalMs + "ms");
      var slideId = presentSlideIdFromNode(carouselRoot);
      if (slideId && !carouselRoot.getAttribute("data-fm-widget")) {
        carouselRoot.setAttribute("data-fm-widget", slideId + "-carousel");
        carouselRoot.setAttribute("data-fm-kind", "carousel");
        carouselRoot.setAttribute("data-fm-value", "0");
      }
      var autoEnabled = false;
      var cyclePaused = false;
      var cycleElapsed = 0;
      var cycleResumeAt = 0;
      var rafId = null;
      var reduceTimer = null;
      var controls = buildPostMvpCarouselControls(carouselRoot, slides, function (nextIndex) {
        goTo(nextIndex);
      });
      var dots = controls.dots;
      if (controls.prev) {
        controls.prev.addEventListener("click", function () {
          goTo(index - 1);
        });
      }
      if (controls.next) {
        controls.next.addEventListener("click", function () {
          goTo(index + 1);
        });
      }
      function cancelCycleRaf() {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
      function cycleTick() {
        rafId = null;
        if (!autoEnabled || cyclePaused) return;
        if (REDUCE_MQ.matches || carouselRoot.classList.contains("is-animation-paused")) {
          pauseAutoCycle();
          return;
        }
        var elapsed = cycleElapsed + (Date.now() - cycleResumeAt);
        setPostMvpCarouselDotFillProgress(dots, index, elapsed / intervalMs);
        if (elapsed >= intervalMs) {
          goTo(index + 1);
          return;
        }
        rafId = requestAnimationFrame(cycleTick);
      }
      function resetAutoCycle() {
        cycleElapsed = 0;
        cycleResumeAt = Date.now();
        setPostMvpCarouselDotFillProgress(dots, index, 0);
        cancelCycleRaf();
        if (autoEnabled && !cyclePaused && !REDUCE_MQ.matches && !carouselRoot.classList.contains("is-animation-paused")) {
          rafId = requestAnimationFrame(cycleTick);
        }
      }
      function clearReduceAdvanceTimer() {
        if (reduceTimer) {
          clearTimeout(reduceTimer);
          reduceTimer = null;
        }
      }
      function scheduleReduceAdvance() {
        clearReduceAdvanceTimer();
        var remaining = Math.max(0, intervalMs - cycleElapsed);
        reduceTimer = setTimeout(function () {
          reduceTimer = null;
          goTo(index + 1);
        }, remaining);
      }
      function pauseAutoCycle() {
        if (!autoEnabled) return;
        if (!cyclePaused) {
          cycleElapsed += Date.now() - cycleResumeAt;
          cyclePaused = true;
        }
        carouselRoot.classList.add("is-auto-advance-paused");
        cancelCycleRaf();
        clearReduceAdvanceTimer();
        setPostMvpCarouselDotFillProgress(
          dots,
          index,
          REDUCE_MQ.matches ? 1 : Math.min(1, cycleElapsed / intervalMs)
        );
      }
      function resumeAutoCycle() {
        if (!autoEnabled || !cyclePaused) return;
        if (carouselRoot.classList.contains("is-animation-paused")) return;
        cyclePaused = false;
        carouselRoot.classList.remove("is-auto-advance-paused");
        cycleResumeAt = Date.now();
        if (REDUCE_MQ.matches) {
          setPostMvpCarouselDotFillProgress(dots, index, 1);
          scheduleReduceAdvance();
          return;
        }
        rafId = requestAnimationFrame(cycleTick);
      }
      function enableAutoAdvance() {
        autoEnabled = true;
        cyclePaused = false;
        cycleElapsed = 0;
        cycleResumeAt = Date.now();
        carouselRoot.classList.remove("is-auto-advance-paused");
        cancelCycleRaf();
        clearReduceAdvanceTimer();
        if (REDUCE_MQ.matches) {
          setPostMvpCarouselDotFillProgress(dots, index, 1);
          scheduleReduceAdvance();
          return;
        }
        if (!carouselRoot.classList.contains("is-animation-paused")) {
          rafId = requestAnimationFrame(cycleTick);
        }
      }
      function disableAutoAdvance() {
        autoEnabled = false;
        pauseAutoCycle();
      }
      function goTo(nextIndex, opts) {
        opts = opts || {};
        var newIndex = (nextIndex + slides.length) % slides.length;
        var changed = newIndex !== index;
        index = newIndex;
        track.style.transform = "translate3d(-" + index * 100 + "%, 0, 0)";
        slides.forEach(function (slide, si) {
          slide.classList.toggle("is-active", si === index);
        });
        syncPostMvpCarouselDots(dots, index);
        carouselRoot.setAttribute("data-slide-index", String(index + 1));
        if (!opts.remote) {
          carouselRoot.setAttribute("data-fm-value", String(index));
          var widgetId = carouselRoot.getAttribute("data-fm-widget");
          if (widgetId) emitWidgetChange(widgetId, index);
        }
        if (changed || !opts.remote) {
          if (autoEnabled) resetAutoCycle();
        }
      }
      registerPresentPostMvpCarousel(carouselRoot, function (n) {
        goTo(n, { remote: true });
      });
      carouselRoot.classList.remove("is-animation-paused");
      goTo(0);
      enableAutoAdvance();
      carouselRoot.addEventListener("mouseenter", pauseAutoCycle);
      carouselRoot.addEventListener("mouseleave", resumeAutoCycle);
      carouselRoot.addEventListener("focusin", pauseAutoCycle);
      carouselRoot.addEventListener("focusout", resumeAutoCycle);
      carouselCleanups.push(disableAutoAdvance);
      carouselRoot._presentCarouselStop = disableAutoAdvance;
    });
  }

  function animateCounters(root) {
    root.querySelectorAll("[data-count]").forEach(function (el) {
      if (el.dataset.presentCountDone) return;
      el.dataset.presentCountDone = "1";
      var target = parseFloat(el.getAttribute("data-count"));
      var decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
      var suffix = el.getAttribute("data-suffix") || "";
      var prefix = el.getAttribute("data-prefix") || "";
      if (REDUCE_MQ.matches) {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
        return;
      }
      var start = null;
      var duration = 1400;
      function step(ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  var DUO_ZOOM_MS = 550;

  function listenTransformEnd(el, cb) {
    if (!el) {
      cb();
      return;
    }
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      el.removeEventListener("transitionend", onEnd);
      cb();
    }
    function onEnd(e) {
      if (e.propertyName !== "transform") return;
      finish();
    }
    el.addEventListener("transitionend", onEnd);
    setTimeout(finish, DUO_ZOOM_MS + 100);
  }

  function initGapsDuoZoom(root) {
    if (!root || !root.classList.contains("present-slide--gaps")) return;
    var media = root.querySelector(".why-proof__media--duo");
    if (!media || media.dataset.presentDuoZoom === "1") return;
    media.dataset.presentDuoZoom = "1";
    var frames = Array.prototype.slice.call(media.querySelectorAll(".why-proof__frame"));
    if (frames.length < 2) return;

    var active = null;
    var leaving = null;
    var locked = false;

    function setLocked(on) {
      locked = on;
      media.classList.toggle("is-duo-zoom-locked", on);
    }

    function clearClasses(frame) {
      if (!frame) return;
      frame.classList.remove("is-duo-zoom-active", "is-duo-zoom-leaving", "is-remote-hover");
    }

    function deactivate(frame, onDone) {
      if (!frame) {
        onDone();
        return;
      }
      leaving = frame;
      frame.classList.remove("is-duo-zoom-active", "is-remote-hover");
      frame.classList.add("is-duo-zoom-leaving");
      var animEl = frame.querySelector("img") || frame;
      listenTransformEnd(animEl, function () {
        clearClasses(frame);
        if (leaving === frame) leaving = null;
        onDone();
      });
    }

    function activate(frame) {
      frames.forEach(function (f) {
        if (f !== frame) clearClasses(f);
      });
      active = frame;
      frame.classList.add("is-duo-zoom-active", "is-remote-hover");
      frame.classList.remove("is-duo-zoom-leaving");
    }

    frames.forEach(function (frame) {
      frame.addEventListener("pointerenter", function () {
        if (locked) return;
        if (active === frame) return;
        if (active) {
          setLocked(true);
          var prev = active;
          active = null;
          deactivate(prev, function () {
            setLocked(false);
            activate(frame);
          });
          return;
        }
        activate(frame);
      });
      frame.addEventListener("pointerleave", function () {
        if (active !== frame || locked) return;
        setLocked(true);
        var prev = frame;
        active = null;
        deactivate(prev, function () {
          setLocked(false);
        });
      });
    });
  }

  function initPresentSlide(root) {
    if (!root) return;
    ensureWhyWidget(root);
    ensurePhaseWizardWidgets(root);
    ensureTradeoffWidgets(root);
    revealAll(root);
    root.querySelectorAll("[data-trade-off-switcher]").forEach(function (el) {
      delete el.dataset.presentTradeoffInit;
    });
    root.querySelectorAll("[data-exploration-wizard]").forEach(function (el) {
      delete el.dataset.presentExplorationInit;
    });
    initTradeOffSwitchers(root);
    initValidationConflicts(root);
    initWizardScrollExplore(root);
    initExplorationWizards(root);
    initWealthHubJourneys(root);
    promoteMedia(root);
    initCompareSliders(root);
    initTabsCompare(root);
    initPrototypePersonas(root);
    initCarousels(root);
    initWowMarquees(root);
    initGapsDuoZoom(root);
    if (root.classList.contains("present-slide--hero")) {
      var bento = root.querySelector(".hero-bento");
      if (bento) {
        bento.removeAttribute("data-hero-bento-init");
        bento.removeAttribute("aria-hidden");
      }
      if (window.initHeroBento) window.initHeroBento(bento);
    }
    if (root.classList.contains("present-slide--p4-cura")) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          root.querySelectorAll(".cura-filmstrip__track").forEach(syncMarqueeSpeed);
        });
      });
    }
    playAutoplayVideos(root);
    if (root.classList.contains("present-slide--proof") || root.querySelector(".proof-intro")) {
      animateCounters(root);
    }
    if (root.querySelector("[data-count]")) animateCounters(root);
    bindLightboxInRoot(root);
    document.dispatchEvent(new CustomEvent("portfolio:present-slide-ready", { bubbles: true }));
  }

  function cleanupCarousels() {
    carouselCleanups.forEach(function (stop) {
      stop();
    });
    carouselCleanups = [];
  }

  var presentLightboxApi = null;

  function closePresentLightbox() {
    if (presentLightboxApi) presentLightboxApi.close();
    else if (window.PortfolioLightbox) window.PortfolioLightbox.close();
  }

  function resetLightboxBindings(root) {
    if (!root) return;
    root.querySelectorAll("[data-lightbox]").forEach(function (el) {
      delete el.dataset.portfolioLbInit;
    });
    root.querySelectorAll(".exploration-wizard__asset-slot, .ai-tools-grid__frame").forEach(function (el) {
      delete el.dataset.portfolioLbSlotInit;
      delete el.dataset.portfolioLbInit;
    });
    root.querySelectorAll(".trade-off-switcher__media .wealth-hub-video-frame").forEach(function (el) {
      delete el.dataset.portfolioLbFrameInit;
    });
  }

  function ensurePresentLightboxApi() {
    if (presentLightboxApi) return presentLightboxApi;
    var PL = window.PortfolioLightbox;
    var lightbox = document.querySelector(".lightbox");
    if (!PL || !lightbox) return null;
    presentLightboxApi = PL.mountGallery(lightbox, { wrapGallery: true });
    return presentLightboxApi;
  }

  function bindLightboxInRoot(root) {
    var api = ensurePresentLightboxApi();
    if (!api) return;
    resetLightboxBindings(root);
    api.bindRoot(root, { force: true });
  }

  (function initPresentLightbox() {
    ensurePresentLightboxApi();
  })();

  function renderSlide(index) {
    var entry = SLIDE_MANIFEST[index];
    var clone;
    if (entry.composite) {
      clone = buildCompositeSlide(entry);
      var empty;
      if (entry.compositeLayout === "gaps") {
        empty = !clone.querySelector(".why-proof");
      } else if (entry.compositeLayout === "stack") {
        empty = !clone.querySelector(".period-split");
      } else if (entry.compositeLayout === "proof") {
        empty = !clone.querySelector(".proof-intro");
      } else if (entry.compositeLayout === "coaching") {
        empty = !clone.querySelector(".device-story__copy");
      } else {
        empty = !clone.querySelector(".post-mvp-card");
      }
      if (empty) {
        console.warn("Present: empty composite slide for", entry.id);
        return;
      }
    } else {
      var srcNode = resolveSourceNode(entry);
      if (!srcNode) {
        console.warn("Present: missing source for", entry.selector);
        return;
      }
      clone = srcNode.cloneNode(true);
      stripIds(clone);
    }

    var prev = currentSlideEl;
    if (prev) {
      prev.classList.remove("is-active");
      prev.classList.add("is-leaving");
      pauseVideos(prev);
      cleanupCarousels();
      clearSlideAnim(prev);
      clearTimeout(leavingTimer);
      leavingTimer = setTimeout(function () {
        if (prev.parentNode) prev.parentNode.removeChild(prev);
      }, FADE_MS);
    }

    ensurePageInsets(clone, entry);
    applySlideLayout(clone, entry);
    applyPresentTrim(clone, entry);
    clone.classList.add("present-slide", "present-slide--" + entry.id);
    clone.setAttribute("data-slide-id", entry.id);
    clone.setAttribute("aria-label", "Slide " + (index + 1));

    assignSlideAnim(clone);

    Array.prototype.slice.call(stage.children).forEach(function (child) {
      if (child !== prev && child.classList && child.classList.contains("present-slide")) {
        stage.removeChild(child);
      }
    });

    stage.appendChild(clone);
    currentSlideEl = clone;

    requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      clone.classList.add("is-active");
      initPresentSlide(clone);
      if (deckTitle) deckTitle.textContent = slideTitle(clone, entry) + " — Raisin";
      });
    });
  }

  var chapters = [];
  SLIDE_MANIFEST.forEach(function (s, idx) {
    var ch = chapters.find(function (c) {
      return c.id === s.chapter;
    });
    if (!ch) {
      ch = { id: s.chapter, label: CHAPTER_LABELS[s.chapter] || s.chapter, slides: [] };
      chapters.push(ch);
    }
    ch.slides.push(idx);
  });

  function chapterOf(idx) {
    return chapters.find(function (c) {
      return c.slides.indexOf(idx) >= 0;
    });
  }

  if (chapWrap) {
    chapters.forEach(function (ch) {
      if (CHAPTER_NAV_IDS.indexOf(ch.id) < 0) return;
      var b = document.createElement("button");
      b.className = "chapter-tab";
      b.type = "button";
      b.dataset.chapterId = ch.id;
      var dotsHtml = ch.slides
        .map(function (slideIdx) {
          return '<span class="ct-dot" data-slide="' + slideIdx + '" role="presentation"></span>';
        })
        .join("");
      b.innerHTML =
        '<span class="ct-num">' +
        (CHAPTER_SHORT[ch.id] || "") +
        '</span><span class="ct-label">' +
        ch.label +
        '</span><span class="ct-dots" aria-hidden="true">' +
        dotsHtml +
        "</span>";
      b.setAttribute("aria-label", ch.label);
      b.title = ch.label;
      b.addEventListener("click", function (e) {
        if (e.target.closest(".ct-dot")) return;
        go(ch.slides[0]);
      });
      chapWrap.appendChild(b);
    });

    chapWrap.addEventListener("click", function (e) {
      var dot = e.target.closest(".ct-dot");
      if (!dot) return;
      e.preventDefault();
      e.stopPropagation();
      var idx = parseInt(dot.getAttribute("data-slide"), 10);
      if (!isNaN(idx)) go(idx);
    });
  }

  var chapterTabs = chapWrap ? Array.prototype.slice.call(chapWrap.querySelectorAll(".chapter-tab")) : [];

  if (totNum) totNum.textContent = String(N);

  function updateChrome() {
    var ch = chapterOf(i);
    chapterTabs.forEach(function (t, ci) {
      var cur = chapters[ci] === ch;
      t.setAttribute("aria-current", String(cur));
      t.setAttribute("aria-label", chapters[ci].label);
      t.querySelectorAll(".ct-dot").forEach(function (dot) {
        var slideIdx = parseInt(dot.getAttribute("data-slide"), 10);
        dot.setAttribute("aria-current", String(cur && slideIdx === i));
      });
    });
    updateSlideCounter();
    if (progress) progress.style.width = ((i + 1) / N) * 100 + "%";
    prevBtns.forEach(function (b) {
      b.classList.toggle("is-hidden", i === 0);
      b.disabled = i === 0;
    });
    var onLast = i === N - 1;
    nextBtns.forEach(function (b) {
      b.classList.toggle("is-hidden", onLast);
      b.disabled = onLast;
    });
    if (backToCase) backToCase.classList.toggle("is-hidden", !onLast);
    if (history.replaceState) history.replaceState(null, "", "#" + (i + 1));
    window.PortfolioDeck = {
      pageId: "raisin",
      getIndex: function () {
        return i;
      },
      go: go
    };
    window.dispatchEvent(new CustomEvent("portfolio:deck-change", { detail: { slide: i + 1 } }));
  }

  function go(n) {
    var nextIdx = Math.max(0, Math.min(N - 1, n));
    if (nextIdx === i && currentSlideEl) return;
    closePresentLightbox();
    i = nextIdx;
    renderSlide(i);
    updateChrome();
  }

  /* Wealth Hub slides whose sub-steps are walked one by one with next / prev */
  var SUBSTEP_SLIDES = {
    "p1-exploration": true,
    "p1-visual-system": true,
    "p1-tradeoff-01": true,
    "p3-ideation": true
  };
  var SUBSTEP_LAST = {
    "p1-exploration": 5,
    "p1-visual-system": 3,
    "p1-tradeoff-01": VALIDATION_PRESENT_STEPS,
    "p3-ideation": 2
  };

  function lastSubstepForSlide(manifestIndex) {
    var entry = SLIDE_MANIFEST[manifestIndex];
    if (!entry || !SUBSTEP_SLIDES[entry.id]) return "1";
    return String(SUBSTEP_LAST[entry.id] || 1);
  }

  function activeSubstepper() {
    var entry = SLIDE_MANIFEST[i];
    if (!entry || !SUBSTEP_SLIDES[entry.id] || !currentSlideEl) return null;
    if (entry.id === "p3-ideation") {
      var mobileIdeate = currentSlideEl.querySelector(
        ".mobile-ideation-concepts[data-trade-off-switcher]"
      );
      if (mobileIdeate && mobileIdeate._presentStepper) return mobileIdeate._presentStepper;
    }
    var wizardRoot =
      currentSlideEl.querySelector("[data-phase-wizard]") ||
      currentSlideEl.querySelector("[data-validation-conflicts]");
    return wizardRoot && wizardRoot._presentStepper ? wizardRoot._presentStepper : null;
  }

  function updateSlideCounter() {
    if (!curNum) return;
    var stepper = activeSubstepper();
    curNum.textContent = String(i + 1) + (stepper ? "." + stepper.current() : "");
  }

  function enterSlide(n, step) {
    var entry = SLIDE_MANIFEST[n];
    if (entry && SUBSTEP_SLIDES[entry.id]) presentInteractiveState[entry.id + ":phase-step"] = step;
    go(n);
  }

  var next = function () {
    var stepper = activeSubstepper();
    if (stepper && stepper.current() < stepper.count) {
      stepper.activate(stepper.current() + 1);
      return;
    }
    if (i + 1 < N) enterSlide(i + 1, "1");
  };
  var prev = function () {
    var stepper = activeSubstepper();
    if (stepper && stepper.current() > 1) {
      stepper.activate(stepper.current() - 1);
      return;
    }
    if (i > 0) enterSlide(i - 1, lastSubstepForSlide(i - 1));
  };

  prevBtns.forEach(function (b) {
    b.addEventListener("click", prev);
  });
  nextBtns.forEach(function (b) {
    b.addEventListener("click", next);
  });

  document.addEventListener("keydown", function (e) {
    var lightbox = document.querySelector(".lightbox.is-open");
    if (lightbox) {
      if (e.key === "Escape") {
        e.preventDefault();
        closePresentLightbox();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (lightbox._portfolioLbStep) lightbox._portfolioLbStep(-1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (lightbox._portfolioLbStep) lightbox._portfolioLbStep(1);
        return;
      }
      return;
    }
    if (e.defaultPrevented) return;
    if (e.target.closest("input, textarea, iframe, [contenteditable]")) return;
    switch (e.key) {
      case "ArrowRight":
      case "PageDown":
        e.preventDefault();
        next();
        break;
      case " ":
        e.preventDefault();
        e.shiftKey ? prev() : next();
        break;
      case "ArrowLeft":
      case "PageUp":
        e.preventDefault();
        prev();
        break;
      case "Home":
        e.preventDefault();
        go(0);
        break;
      case "End":
        e.preventDefault();
        go(N - 1);
        break;
    }
  });

  var x0 = null;
  var y0 = null;
  var sdx = 0;
  var sdy = 0;
  var axis = null;
  stage.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length !== 1) {
        x0 = null;
        return;
      }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      sdx = sdy = 0;
      axis = null;
    },
    { passive: true }
  );
  stage.addEventListener(
    "touchmove",
    function (e) {
      if (x0 === null) return;
      sdx = e.touches[0].clientX - x0;
      sdy = e.touches[0].clientY - y0;
      if (!axis && (Math.abs(sdx) > 8 || Math.abs(sdy) > 8)) {
        axis = Math.abs(sdx) > Math.abs(sdy) ? "x" : "y";
      }
      if (axis === "x" && e.cancelable) e.preventDefault();
    },
    { passive: false }
  );
  stage.addEventListener(
    "touchend",
    function () {
      if (x0 === null) return;
      if (axis === "x" && Math.abs(sdx) > 45) (sdx < 0 ? next() : prev());
      x0 = y0 = null;
      axis = null;
    },
    { passive: true }
  );

  var fsBtn = document.querySelector("[data-fullscreen]");
  if (fsBtn) {
    fsBtn.addEventListener("click", function () {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    });
  }

  bindWealthHubJourneyNavigation();

  var start = parseInt((location.hash || "").replace("#", ""), 10);
  if (!isNaN(start) && start >= 1 && start <= N) i = start - 1;

  go(i);
})(window);
