/* ==========================================================================
   Raisin presentation deck — clone beats from #present-source, one per slide.
   ========================================================================== */
(function () {
  "use strict";

  var FADE_MS = 300;
  var REDUCE_MQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var MARQUEE_PX_PER_SEC = 42;

  var CHAPTER_LABELS = {
    setup: "Setup",
    "period-1": "01 · A home for their wealth",
    "period-2": "02 · Better product, Better process",
    "period-3": "03 · Mobile and the horizon",
    "period-4": "04 · Design × AI",
    proof: "Proof",
    finale: "The brand, built out",
    thanks: "Thanks"
  };

  var CHAPTER_SHORT = {
    setup: "0",
    "period-1": "01",
    "period-2": "02",
    "period-3": "03",
    "period-4": "04",
    proof: "P",
    finale: "B",
    thanks: "✓"
  };

  /* Presentation trim — hide web-depth copy; thesis/body max ~2 lines in deck. */
  var PRESENT_TRIM = {
    hero: [".hero__sub"],
    "gap-01": [".why-proof__text:not(.why-proof__text--present)"],
    "gap-02": [".why-proof__text:not(.why-proof__text--present)"],
    "gap-03": [".why-proof__text:not(.why-proof__text--present)"],
    journey: [".lede--remit", ".why-hero__body", ".rule--thick", ".lede:not(.lede--present-short)"],
    "p1-intro": [".period__thesis:not(.period__thesis--present)"],
    "p1-baseline": [
      ".beat__text:not(.beat__text--problem)",
      ".chip-row",
      ".beat__needs",
      ".beat__subtitle"
    ],
    "p1-co-creation": [".beat__text", ".research-stickies", ".period-split__caption"],
    "p1-tradeoff-01": [
      ".trade-off__label",
      ".trade-off__options",
      ".trade-off__position",
      ".trade-off__outcome",
      ".beat__enablement",
      ".trade-off-switcher__scope",
      ".period-split__caption",
      ".beat__text"
    ],
    "p1-tradeoff-02": [
      ".trade-off__label",
      ".trade-off__options",
      ".trade-off__position",
      ".beat__enablement",
      ".period-split__caption",
      ".beat__text"
    ],
    "p1-outcomes": [".wealth-hub-constraints", ".beat__text", ".beat__caption"],
    "p2-intro": [".period__thesis:not(.period__thesis--present)"],
    "p2-wow": [".wow-beat__content .beat__text", ".wow-beat__content .enablement-label", ".wow-beat__content .beat__stat + .beat__stat"],
    "p3-intro": [".period__thesis:not(.period__thesis--present)"],
    "p3-desk-research": [".device-story__text:not(.device-story__text--present)"],
    "p3-parity": [".device-story__text:not(.device-story__text--present)"],
    "p3-prototype": [
      ".device-story__text:not(.device-story__text--present)",
      ".trade-off--compact",
      ".beat__enablement",
      ".period-split__caption"
    ],
    "p3-maze": [".device-story__text:not(.device-story__text--present)", ".beat__enablement"],
    "p3-shipped": [".device-story__text:not(.device-story__text--present)", ".mobile-shipped-reviews"],
    "p3-cura": [".beat__text", ".beat__enablement"],
    "p4-intro": [".period__thesis:not(.period__thesis--present)"],
    "p4-origin": [".device-story__text:not(.device-story__text--present)", ".beat__enablement"],
    "p4-toolkit": [".ai-toolkit-card__text"],
    "p4-lab-tools": [".device-story__text:not(.device-story__text--present)", ".period-split__caption"],
    "p4-coaching": [
      ".device-story__text:not(.device-story__text--present)",
      ".ai-cadence-card__text"
    ],
    proof: [".proof-intro__lede:not(.proof-intro__lede--present)"]
  };

  var SLIDE_MANIFEST = [
    { id: "hero", chapter: "setup", selector: "#hero" },
    { id: "gap-01", chapter: "setup", selector: "#why .why-proof:nth-child(1)" },
    { id: "gap-02", chapter: "setup", selector: "#why .why-proof.why-proof--zoom-full" },
    { id: "gap-03", chapter: "setup", selector: "#why .why-proof:nth-child(3)" },
    { id: "journey", chapter: "setup", selector: "#journey-intro" },
    { id: "p1-intro", chapter: "period-1", selector: "#period-1 .period__head" },
    { id: "p1-baseline", chapter: "period-1", selector: '[aria-label="Baseline research"]' },
    { id: "p1-co-creation", chapter: "period-1", selector: '[aria-label="Co-creation sprint"]' },
    { id: "p1-tradeoff-01", chapter: "period-1", selector: '[aria-label="Trade-off 01 — user research, treemap vs donut"]' },
    { id: "p1-tradeoff-02", chapter: "period-1", selector: '[aria-label="Trade-off 02 — catalogue list vs asset-class hierarchy"]' },
    { id: "p1-outcomes", chapter: "period-1", selector: '[aria-label="After MVP launch — outcomes"]' },
    { id: "p2-intro", chapter: "period-2", selector: "#period-2 .period__head" },
    { id: "p2-release-01", chapter: "period-2", selector: "#period-2 .post-mvp-card:nth-of-type(1)" },
    { id: "p2-release-02", chapter: "period-2", selector: "#period-2 .post-mvp-card:nth-of-type(2)" },
    { id: "p2-release-03", chapter: "period-2", selector: "#period-2 .post-mvp-card:nth-of-type(3)" },
    { id: "p2-release-04", chapter: "period-2", selector: "#period-2 .post-mvp-card:nth-of-type(4)" },
    { id: "p2-wow", chapter: "period-2", selector: "#period-2 .beat--wow" },
    { id: "p3-intro", chapter: "period-3", selector: "#period-3 .period__head" },
    { id: "p3-desk-research", chapter: "period-3", selector: "#period-3 .mobile-journey__row:first-child" },
    { id: "p3-parity", chapter: "period-3", selector: "#period-3 .mobile-journey__row:nth-child(2)" },
    { id: "p3-prototype", chapter: "period-3", selector: "#period-3 .mobile-journey__row--prototype" },
    { id: "p3-maze", chapter: "period-3", selector: "#period-3 .mobile-journey__row:nth-child(4)" },
    { id: "p3-shipped", chapter: "period-3", selector: "#period-3 .mobile-journey__shipped" },
    { id: "p3-cura", chapter: "period-3", selector: "#period-3 .beat--cura" },
    { id: "p4-intro", chapter: "period-4", selector: "#period-4 .period__head" },
    { id: "p4-origin", chapter: "period-4", selector: "#period-4 .ai-journey__row:first-child" },
    { id: "p4-toolkit", chapter: "period-4", selector: "#period-4 .ai-journey__toolkit" },
    { id: "p4-lab-tools", chapter: "period-4", selector: "#period-4 .ai-journey__tools" },
    {
      id: "p4-coaching",
      chapter: "period-4",
      compositeLayout: "coaching",
      composite: [
        "#period-4 .device-story__row--reverse.ai-journey__row",
        "#period-4 .ai-cadence"
      ]
    },
    {
      id: "proof",
      chapter: "proof",
      compositeLayout: "proof",
      composite: ["#proof", ".quote-marquee"],
      title: "Proof"
    },
    { id: "brand-finale", chapter: "finale", selector: ".brand-finale", title: "The brand, built out" },
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
    "p2-wow": true,
    "p3-cura": true,
    "brand-finale": true
  };

  var SLIDE_LAYOUT = {
    "gap-01": "viewport",
    "gap-02": "viewport",
    "gap-03": "viewport",
    journey: "viewport",
    "p1-intro": "viewport",
    "p1-baseline": "viewport",
    "p1-co-creation": "viewport",
    "p1-tradeoff-01": "viewport",
    "p1-tradeoff-02": "viewport",
    "p1-outcomes": "viewport-split",
    "p2-intro": "viewport",
    "p2-release-01": "viewport",
    "p2-release-02": "viewport",
    "p2-release-03": "viewport",
    "p2-release-04": "viewport",
    "p3-intro": "viewport",
    "p3-desk-research": "viewport",
    "p3-parity": "viewport",
    "p3-prototype": "viewport-split",
    "p3-maze": "viewport",
    "p3-shipped": "viewport",
    "p3-cura": "viewport",
    "p2-wow": "viewport",
    "p4-intro": "viewport",
    "p4-origin": "viewport",
    "p4-toolkit": "viewport",
    "p4-lab-tools": "viewport",
    "p4-coaching": "viewport",
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
      entry.id === "brand-finale" ||
      entry.id === "p1-outcomes" ||
      entry.id === "p3-prototype"
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

  function initTradeOffSwitchers(root) {
    function activateVariant(switchRoot, variant) {
      var v = variant === "b" ? "b" : "a";
      switchRoot.querySelectorAll("[data-variant]").forEach(function (tab) {
        if (!tab.matches(".trade-off-switcher__tab")) return;
        var on = tab.getAttribute("data-variant") === v;
        tab.classList.toggle("trade-off-switcher__tab--active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      });
      switchRoot.querySelectorAll("[data-variant-img]").forEach(function (media) {
        var on = media.getAttribute("data-variant-img") === v;
        media.classList.toggle("is-active", on);
        media.hidden = !on;
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
    }

    root.querySelectorAll("[data-trade-off-switcher]").forEach(function (switchRoot) {
      if (switchRoot.dataset.presentTradeoffInit) return;
      switchRoot.dataset.presentTradeoffInit = "1";
      var tabs = Array.prototype.slice.call(switchRoot.querySelectorAll(".trade-off-switcher__tab"));
      if (!tabs.length) return;
      activateVariant(switchRoot, switchRoot.getAttribute("data-default") || "a");
      switchRoot.addEventListener("click", function (e) {
        var tab = e.target.closest(".trade-off-switcher__tab");
        if (!tab || !switchRoot.contains(tab)) return;
        activateVariant(switchRoot, tab.getAttribute("data-variant"));
      });
      switchRoot.addEventListener("keydown", function (e) {
        var tab = e.target.closest(".trade-off-switcher__tab");
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
        activateVariant(switchRoot, next.getAttribute("data-variant"));
        next.focus();
      });
    });
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
          t.setAttribute("aria-selected", selected ? "true" : "false");
          t.tabIndex = selected ? 0 : -1;
        });
        panels.forEach(function (panel) {
          panel.hidden = panel.getAttribute("data-tab-panel") !== id;
        });
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
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        sendPersona(tab.getAttribute("data-persona-id"));
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

    if (!nav) {
      nav = document.createElement("div");
      nav.className = "post-mvp-carousel__nav";

      prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "post-mvp-carousel__prev";
      prevBtn.setAttribute("aria-label", "Previous slide");
      prevBtn.textContent = "←";

      dotsWrap = document.createElement("div");
      dotsWrap.className = "post-mvp-carousel__dots";
      dotsWrap.setAttribute("role", "tablist");
      dotsWrap.setAttribute("aria-label", carouselRoot.getAttribute("aria-label") || "Carousel slides");

      nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "post-mvp-carousel__next";
      nextBtn.setAttribute("aria-label", "Next slide");
      nextBtn.textContent = "→";

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

      nav.appendChild(prevBtn);
      nav.appendChild(dotsWrap);
      nav.appendChild(nextBtn);
      carouselRoot.appendChild(nav);
    } else {
      dotsWrap = nav.querySelector(".post-mvp-carousel__dots");
      prevBtn = nav.querySelector(".post-mvp-carousel__prev");
      nextBtn = nav.querySelector(".post-mvp-carousel__next");
    }

    return {
      dots: Array.prototype.slice.call(dotsWrap.querySelectorAll(".post-mvp-carousel__dot")),
      prev: prevBtn,
      next: nextBtn
    };
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
      var timer = null;
      var controls = buildPostMvpCarouselControls(carouselRoot, slides, function (nextIndex) {
        goTo(nextIndex);
        start();
      });
      var dots = controls.dots;
      if (controls.prev) {
        controls.prev.addEventListener("click", function () {
          goTo(index - 1);
          start();
        });
      }
      if (controls.next) {
        controls.next.addEventListener("click", function () {
          goTo(index + 1);
          start();
        });
      }
      function goTo(nextIndex) {
        index = (nextIndex + slides.length) % slides.length;
        track.style.transform = "translate3d(-" + index * 100 + "%, 0, 0)";
        slides.forEach(function (slide, si) {
          slide.classList.toggle("is-active", si === index);
        });
        syncPostMvpCarouselDots(dots, index);
        carouselRoot.setAttribute("data-slide-index", String(index + 1));
      }
      function stop() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }
      function start() {
        stop();
        if (REDUCE_MQ.matches || carouselRoot.classList.contains("is-animation-paused")) return;
        timer = setInterval(function () {
          goTo(index + 1);
        }, intervalMs);
      }
      carouselRoot.classList.remove("is-animation-paused");
      goTo(0);
      start();
      carouselRoot.addEventListener("mouseenter", stop);
      carouselRoot.addEventListener("mouseleave", start);
      carouselRoot.addEventListener("focusin", stop);
      carouselRoot.addEventListener("focusout", start);
      carouselCleanups.push(stop);
      carouselRoot._presentCarouselStop = stop;
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

  function initPresentSlide(root) {
    if (!root) return;
    revealAll(root);
    root.querySelectorAll("[data-trade-off-switcher]").forEach(function (el) {
      delete el.dataset.presentTradeoffInit;
    });
    initTradeOffSwitchers(root);
    promoteMedia(root);
    initCompareSliders(root);
    initTabsCompare(root);
    initPrototypePersonas(root);
    initCarousels(root);
    initWowMarquees(root);
    if (root.classList.contains("present-slide--hero")) {
      var bento = root.querySelector(".hero-bento");
      if (bento) {
        bento.removeAttribute("data-hero-bento-init");
        bento.removeAttribute("aria-hidden");
      }
      if (window.initHeroBento) window.initHeroBento(bento);
    }
    if (root.classList.contains("present-slide--p2-wow") || root.classList.contains("present-slide--p3-cura")) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          root.querySelectorAll(".wow-beat__marquee-track, .cura-filmstrip__track").forEach(syncMarqueeSpeed);
        });
      });
    }
    playAutoplayVideos(root);
    if (root.classList.contains("present-slide--proof") || root.querySelector(".proof-intro")) {
      animateCounters(root);
    }
    if (root.querySelector("[data-count]")) animateCounters(root);
    bindLightboxInRoot(root);
  }

  function cleanupCarousels() {
    carouselCleanups.forEach(function (stop) {
      stop();
    });
    carouselCleanups = [];
  }

  var GALLERY_CONTAINERS =
    ".beat__media, .findings-visuals, .why-proof__media, .mock-panel, .research-banner__img, .post-mvp-card__visual, .post-mvp-carousel, .period-split__visual, .ai-tools-grid";

  function imagesInContainer(container) {
    if (container.classList.contains("why-proof__media")) {
      return Array.prototype.slice.call(container.querySelectorAll("img"));
    }
    return Array.prototype.slice.call(container.querySelectorAll("img[data-lightbox]"));
  }

  function getGalleryImages(img) {
    var strip = img.closest(".filmstrip");
    if (strip) return Array.prototype.slice.call(strip.querySelectorAll(".filmstrip__item img"));
    var container = img.closest(GALLERY_CONTAINERS);
    if (container) {
      var scoped = imagesInContainer(container);
      if (scoped.length > 1) return scoped;
    }
    return [img];
  }

  function closePresentLightbox() {
    var lightbox = document.querySelector(".lightbox");
    if (!lightbox || !lightbox.classList.contains("is-open")) return;
    var lbVideo = lightbox.querySelector(".lightbox__video");
    lightbox.classList.remove("is-open", "is-gallery", "is-video");
    document.body.style.overflow = "";
    if (lbVideo) {
      lbVideo.pause();
      lbVideo.hidden = true;
      lbVideo.removeAttribute("src");
    }
  }

  function openPresentLightbox(imgs, startIndex) {
    var lightbox = document.querySelector(".lightbox");
    if (!lightbox) return;
    var lbImg = lightbox.querySelector(".lightbox__img");
    var lbVideo = lightbox.querySelector(".lightbox__video");
    var prevBtn = lightbox.querySelector(".lightbox__prev");
    var nextBtn = lightbox.querySelector(".lightbox__next");
    var counter = lightbox.querySelector(".lightbox__counter");
    if (!lbImg) return;

    var gallery = imgs;
    var galleryIndex = startIndex;

    function isVideoSlide(slide) {
      return slide && slide.tagName === "VIDEO";
    }

    function updateNav() {
      var multi = gallery.length > 1;
      lightbox.classList.toggle("is-gallery", multi);
      if (counter) {
        counter.hidden = !multi;
        if (multi) counter.textContent = galleryIndex + 1 + " / " + gallery.length;
      }
      if (prevBtn) {
        prevBtn.hidden = !multi;
        prevBtn.disabled = false;
      }
      if (nextBtn) {
        nextBtn.hidden = !multi;
        nextBtn.disabled = false;
      }
    }

    function showSlide() {
      var slide = gallery[galleryIndex];
      if (isVideoSlide(slide) && lbVideo) {
        lightbox.classList.add("is-video");
        lbImg.hidden = true;
        lbVideo.hidden = false;
        lbVideo.src = slide.currentSrc || slide.getAttribute("src") || slide.getAttribute("data-src") || "";
        lbVideo.play().catch(function () {});
      } else {
        lightbox.classList.remove("is-video");
        if (lbVideo) {
          lbVideo.pause();
          lbVideo.hidden = true;
          lbVideo.removeAttribute("src");
        }
        lbImg.hidden = false;
        lbImg.src = slide.getAttribute("data-full") || slide.src;
        lbImg.alt = slide.alt || "";
      }
      updateNav();
    }

    function step(delta) {
      if (gallery.length <= 1) return;
      galleryIndex = (galleryIndex + delta + gallery.length) % gallery.length;
      showSlide();
    }

    if (lightbox._presentLbStep) {
      prevBtn && prevBtn.removeEventListener("click", lightbox._presentLbPrev);
      nextBtn && nextBtn.removeEventListener("click", lightbox._presentLbNext);
    }
    lightbox._presentLbPrev = function () {
      step(-1);
    };
    lightbox._presentLbNext = function () {
      step(1);
    };
    lightbox._presentLbStep = step;
    if (prevBtn) prevBtn.addEventListener("click", lightbox._presentLbPrev);
    if (nextBtn) nextBtn.addEventListener("click", lightbox._presentLbNext);

    showSlide();
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function bindLightboxInRoot(root) {
    root.querySelectorAll("img[data-lightbox]").forEach(function (img) {
      if (img.dataset.presentLbInit) return;
      img.dataset.presentLbInit = "1";
      img.style.cursor = "pointer";
      img.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var imgs = getGalleryImages(img);
        var index = Math.max(0, imgs.indexOf(img));
        openPresentLightbox(imgs, index);
      });
    });
    root.querySelectorAll(".ai-tools-grid__frame").forEach(function (frame) {
      if (frame.dataset.presentLbInit) return;
      var img = frame.querySelector("img[data-lightbox]");
      if (!img || img.dataset.presentLbInit) return;
      frame.dataset.presentLbInit = "1";
      frame.style.cursor = "pointer";
      frame.addEventListener("click", function (e) {
        if (e.target === img) return;
        e.preventDefault();
        e.stopPropagation();
        var grid = frame.closest(".ai-tools-grid");
        var imgs = grid
          ? Array.prototype.slice.call(grid.querySelectorAll("img[data-lightbox]"))
          : [img];
        var index = Math.max(0, imgs.indexOf(img));
        openPresentLightbox(imgs, index);
      });
    });
    root.querySelectorAll("video[data-lightbox]").forEach(function (video) {
      if (video.dataset.presentLbInit) return;
      video.dataset.presentLbInit = "1";
      video.addEventListener("click", function (e) {
        e.preventDefault();
        var dataSrc = video.getAttribute("data-src");
        if (dataSrc && !video.getAttribute("src")) {
          video.src = dataSrc;
          video.removeAttribute("data-src");
        }
        openPresentLightbox([video], 0);
      });
    });
  }

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
        empty = !clone.querySelector(".device-story__copy") || !clone.querySelector(".ai-cadence");
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

    stage.innerHTML = "";
    stage.appendChild(clone);
    currentSlideEl = clone;

    requestAnimationFrame(function () {
      clone.classList.add("is-active");
      initPresentSlide(clone);
      if (deckTitle) deckTitle.textContent = slideTitle(clone, entry) + " — Raisin";
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

  if (totNum) totNum.textContent = pad(N);

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
    if (curNum) curNum.textContent = pad(i + 1);
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
    i = nextIdx;
    renderSlide(i);
    updateChrome();
  }

  var next = function () {
    go(i + 1);
  };
  var prev = function () {
    go(i - 1);
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
        if (lightbox._presentLbStep) lightbox._presentLbStep(-1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (lightbox._presentLbStep) lightbox._presentLbStep(1);
        return;
      }
      return;
    }
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

  var start = parseInt((location.hash || "").replace("#", ""), 10);
  if (!isNaN(start) && start >= 1 && start <= N) i = start - 1;

  (function initPresentLightboxChrome() {
    var lightboxEl = document.querySelector(".lightbox");
    if (!lightboxEl || lightboxEl.dataset.presentLbChromeInit) return;
    lightboxEl.dataset.presentLbChromeInit = "1";
    var closeBtn = lightboxEl.querySelector(".lightbox__close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        closePresentLightbox();
      });
    }
    lightboxEl.addEventListener("click", function (e) {
      if (e.target === lightboxEl || e.target.classList.contains("lightbox__stage")) {
        closePresentLightbox();
      }
    });
  })();

  go(i);
})();
