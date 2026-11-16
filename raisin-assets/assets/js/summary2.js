/* ==========================================================================
   Summary v2 interactions — sticky journey nav (click-to-scroll + scrollspy).
   Reveal, counters, and quote carousel are handled globally by main.js.
   ========================================================================== */
(function () {
  "use strict";

  var navBtns = Array.prototype.slice.call(document.querySelectorAll(".journey-nav__btn"));
  var periods = Array.prototype.slice.call(document.querySelectorAll("[data-period]"));
  if (!navBtns.length || !periods.length) return;

  var isNavScrolling = false;
  var scrollGeneration = 0;
  var journeyMediaPrimed = false;
  var html = document.documentElement;

  function getStickyOffset() {
    var miniNav = document.querySelector(".mini-nav");
    var shellHeader = document.querySelector(".shell-header");
    var journeyNav = document.querySelector(".journey-nav");
    return (miniNav ? miniNav.getBoundingClientRect().height : (shellHeader ? shellHeader.getBoundingClientRect().height : 0)) +
           (journeyNav ? journeyNav.getBoundingClientRect().height : 0) + 8;
  }

  function syncScrollMargin() {
    html.style.setProperty("--journey-scroll-offset", Math.round(getStickyOffset()) + "px");
  }

  function preloadDeferredInSection(section) {
    section.querySelectorAll("[data-prototype-frame]").forEach(function (frame) {
      var dataSrc = frame.getAttribute("data-src");
      if (dataSrc && !frame.src) {
        frame.src = dataSrc;
        frame.removeAttribute("data-src");
      }
    });
    section.querySelectorAll("video[data-src]").forEach(function (video) {
      var dataSrc = video.getAttribute("data-src");
      if (dataSrc) {
        video.src = dataSrc;
        video.removeAttribute("data-src");
      }
    });
    section.querySelectorAll("img[loading=\"lazy\"]").forEach(function (img) {
      img.loading = "eager";
    });
  }

  function primeJourneyMedia() {
    if (journeyMediaPrimed) return;
    journeyMediaPrimed = true;
    periods.forEach(preloadDeferredInSection);
  }

  function setActivePeriod(name) {
    navBtns.forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-period-link") === name);
    });
  }

  function revealPeriodHead(section) {
    var head = section.querySelector(".period__head.reveal");
    if (head) head.classList.add("is-visible");
  }

  function scrollToJourneySection(target) {
    var gen = ++scrollGeneration;
    isNavScrolling = true;
    setActivePeriod(target.getAttribute("data-period"));

    syncScrollMargin();
    primeJourneyMedia();
    revealPeriodHead(target);

    html.classList.add("journey-nav-scrolling");
    html.style.overflowAnchor = "none";

    function snap() {
      if (gen !== scrollGeneration) return;
      target.scrollIntoView({ block: "start", behavior: "auto" });
    }

    function cleanup() {
      if (gen !== scrollGeneration) return;
      html.classList.remove("journey-nav-scrolling");
      html.style.overflowAnchor = "";
      setTimeout(function () {
        if (gen === scrollGeneration) isNavScrolling = false;
      }, 80);
    }

    /* Instant scroll only — smooth + correction loops caused overshoot and bounce. */
    requestAnimationFrame(function () {
      snap();
      requestAnimationFrame(function () {
        snap();
        cleanup();
      });
    });
  }

  syncScrollMargin();
  window.addEventListener("resize", syncScrollMargin, { passive: true });

  navBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var target = document.querySelector('[data-period="' + btn.getAttribute("data-period-link") + '"]');
      if (target) scrollToJourneySection(target);
    });
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        if (isNavScrolling) return;
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var name = entry.target.getAttribute("data-period");
            setActivePeriod(name);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    periods.forEach(function (p) { io.observe(p); });

    var periodPrimeIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          preloadDeferredInSection(entry.target);
          revealPeriodHead(entry.target);
        });
      },
      { rootMargin: "15% 0px 15% 0px", threshold: 0 }
    );
    periods.forEach(function (p) { periodPrimeIo.observe(p); });
  }

  /* Keep the active chapter visible inside the horizontally scrolling nav */
  var nav = document.querySelector(".journey-nav");
  if (nav && "MutationObserver" in window) {
    new MutationObserver(function () {
      var active = nav.querySelector(".journey-nav__btn.is-active");
      if (!active) return;
      var navBox = nav.getBoundingClientRect();
      var btnBox = active.getBoundingClientRect();
      if (btnBox.left < navBox.left || btnBox.right > navBox.right) {
        nav.scrollTo({
          left: active.offsetLeft - nav.clientWidth / 2 + active.offsetWidth / 2,
          behavior: "smooth"
        });
      }
    }).observe(nav, { subtree: true, attributes: true, attributeFilter: ["class"] });
  }
})();

/* ==========================================================================
   Hero bento grid — Framer-style hover (OtVos Grid component).
   Uniform grid; on hover only grid-template-columns/rows change via fr units.
   https://framer.com/m/Grid-Xtu4.js
   ========================================================================== */
(function () {
  "use strict";

  var heroApis = new WeakMap();
  var DESKTOP_MQ = window.matchMedia("(min-width: 901px)");
  var HOVER_MQ = window.matchMedia("(hover: hover) and (pointer: fine)");
  var REDUCE_MQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  var HOVER_SIZE = 4;
  var DEFAULT_COL_WEIGHTS = [1.28, 1.05, 0.92, 0.82];
  var DEFAULT_ROW_WEIGHTS = [1.0, 1.02, 0.96, 0.94];
  var MIDDLE_SQUEEZE_COLS = [0.85, 0.85, null, null];
  var ITEM_HOVER = [
    { col: 0, row: 0, size: 4 },
    { col: 2, row: 0, size: 6, squeezeCols: MIDDLE_SQUEEZE_COLS },
    { col: 2, row: 1, size: 7, squeezeRows: [0.5, null, 0.5, 0.5], squeezeCols: MIDDLE_SQUEEZE_COLS },
    { col: 0, row: 2, size: 4 },
    { col: 3, row: 0, size: 4 }
  ];

  function buildTracks(weights, hoverIndex, hoverSize, squeeze) {
    var parts = [];
    var i;
    for (i = 0; i < weights.length; i++) {
      var w = weights[i];
      if (squeeze && squeeze[i] != null) w *= squeeze[i];
      if (hoverIndex === i) w *= hoverSize;
      parts.push(w + "fr");
    }
    return parts.join(" ");
  }

  function initHeroBento(grid) {
    if (!grid || grid.dataset.heroBentoInit) return null;
    var items = Array.prototype.slice.call(grid.querySelectorAll(".hero-bento__item"));
    if (!items.length) return null;
    grid.dataset.heroBentoInit = "1";
    grid.removeAttribute("aria-hidden");

    var hoverId = -1;
    var hoverRaf = 0;
    var pressedItem = null;

    function enabled() {
      return DESKTOP_MQ.matches && HOVER_MQ.matches && !REDUCE_MQ.matches;
    }

    function syncHeroFm() {
      var wid = grid.getAttribute("data-fm-widget");
      if (!wid) return;
      var val = hoverId < 0 ? "none" : String(hoverId);
      document.dispatchEvent(
        new CustomEvent("portfolio:widget-change", {
          bubbles: true,
          detail: { id: wid, value: val },
        })
      );
    }

    function applyGrid() {
      if (!enabled()) {
        if (hoverId < 0 || !ITEM_HOVER[hoverId]) {
          grid.classList.remove("is-hovering");
          grid.removeAttribute("data-hover-item");
          grid.style.removeProperty("grid-template-columns");
          grid.style.removeProperty("grid-template-rows");
          syncHeroFm();
          return;
        }
        grid.classList.add("is-hovering");
        grid.dataset.hoverItem = String(hoverId);
        syncHeroFm();
        return;
      }

      if (hoverId < 0) {
        grid.classList.remove("is-hovering");
        grid.removeAttribute("data-hover-item");
        grid.style.gridTemplateColumns = buildTracks(DEFAULT_COL_WEIGHTS, -1, HOVER_SIZE);
        grid.style.gridTemplateRows = buildTracks(DEFAULT_ROW_WEIGHTS, -1, HOVER_SIZE);
        syncHeroFm();
        return;
      }

      var config = ITEM_HOVER[hoverId];
      grid.classList.add("is-hovering");
      grid.dataset.hoverItem = String(hoverId);
      grid.style.gridTemplateColumns = buildTracks(
        DEFAULT_COL_WEIGHTS,
        config.col,
        config.size,
        config.squeezeCols
      );
      grid.style.gridTemplateRows = buildTracks(
        DEFAULT_ROW_WEIGHTS,
        config.row,
        config.size,
        config.squeezeRows
      );
      syncHeroFm();
    }

    function onHover(id) {
      if (!enabled() || hoverId === id) return;
      hoverId = id;
      if (hoverRaf) cancelAnimationFrame(hoverRaf);
      hoverRaf = requestAnimationFrame(applyGrid);
    }

    function onHoverOff() {
      if (!enabled()) return;
      hoverId = -1;
      if (hoverRaf) cancelAnimationFrame(hoverRaf);
      hoverRaf = requestAnimationFrame(applyGrid);
    }

    function clearPress() {
      if (pressedItem) {
        pressedItem.classList.remove("is-pressed");
        pressedItem = null;
      }
    }

    function onPressStart(item, e) {
      if (REDUCE_MQ.matches) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      clearPress();
      pressedItem = item;
      item.classList.add("is-pressed");
    }

    function onPressEnd() {
      clearPress();
      syncHeroFm();
    }

    function setRemote(idStr, pressed) {
      if (idStr === "none" || idStr === "" || idStr == null) hoverId = -1;
      else hoverId = parseInt(idStr, 10);
      if (!Number.isFinite(hoverId)) hoverId = -1;
      applyGrid();
      items.forEach(function (item, i) {
        var on = !!pressed && i === hoverId;
        item.classList.toggle("is-pressed", on);
        if (on) pressedItem = item;
      });
      if (!pressed) pressedItem = null;
      syncHeroFm();
    }

    items.forEach(function (item, index) {
      item.addEventListener("mouseenter", function () {
        onHover(index);
      });
      item.addEventListener("pointerdown", function (e) {
        onPressStart(item, e);
      });
      item.addEventListener("pointerup", onPressEnd);
      item.addEventListener("pointercancel", onPressEnd);
      item.addEventListener("pointerleave", function () {
        if (pressedItem === item) clearPress();
      });
      item.addEventListener("contextmenu", function (e) {
        if (pressedItem === item) e.preventDefault();
      });
    });

    grid.addEventListener("mouseleave", onHoverOff);
    DESKTOP_MQ.addEventListener("change", applyGrid);
    applyGrid();

    var api = { set: setRemote, grid: grid };
    heroApis.set(grid, api);
    return api;
  }

  function activeHeroGrid() {
    var stageGrid = document.querySelector("#present-stage .hero-bento");
    if (stageGrid) return stageGrid;
    return document.querySelector(".hero-bento");
  }

  document.querySelectorAll(".hero-bento").forEach(initHeroBento);

  window.initHeroBento = initHeroBento;
  window.RaisinHero = {
    set: function (idStr, pressed) {
      var grid = activeHeroGrid();
      var api = grid && heroApis.get(grid);
      if (api) api.set(idStr, pressed);
    }
  };
})();

/* ==========================================================================
   Lightbox — portfolio-lightbox.js (section galleries + Follow Me sync)
   ========================================================================== */
(function () {
  "use strict";

  if (document.getElementById("present-stage")) return;

  var PL = window.PortfolioLightbox;
  var lightbox = document.querySelector(".lightbox");
  if (!PL || !lightbox) return;

  var api = PL.mountGallery(lightbox, { wrapGallery: false });
  if (!api) return;

  api.bindRoot(document);

  var TOUCH_MQ = window.matchMedia("(hover: none), (pointer: coarse)");

  document.querySelectorAll(".why-proof--zoom .why-proof__frame").forEach(function (frame) {
    frame.addEventListener("click", function () {
      if (!TOUCH_MQ.matches) return;
      var img = frame.querySelector("img");
      if (!img) return;
      api.openFromElement(img);
    });
  });

  document.querySelectorAll(".filmstrip").forEach(function (strip) {
    var dragState = { active: false, startX: 0, moved: false };

    strip.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      dragState.active = true;
      dragState.startX = e.clientX;
      dragState.moved = false;
    });

    strip.addEventListener("pointermove", function (e) {
      if (!dragState.active) return;
      if (Math.abs(e.clientX - dragState.startX) > 10) dragState.moved = true;
    });

    strip.addEventListener("pointerup", function () {
      dragState.active = false;
    });

    strip.addEventListener("pointercancel", function () {
      dragState.active = false;
    });

    strip.querySelectorAll(".filmstrip__item").forEach(function (item, index) {
      item.addEventListener("click", function (e) {
        if (dragState.moved) return;
        e.preventDefault();
        var img = item.querySelector("img");
        if (!img) return;
        var imgs = PL.getGalleryImages(img);
        api.openLightbox(imgs, index);
      });
    });
  });

  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("is-open")) return;
    var prevBtn = lightbox.querySelector(".lightbox__prev");
    var nextBtn = lightbox.querySelector(".lightbox__next");
    if (e.key === "ArrowLeft") {
      if (prevBtn && !prevBtn.hidden) {
        e.preventDefault();
        lightbox._portfolioLbStep(-1);
      }
    } else if (e.key === "ArrowRight") {
      if (nextBtn && !nextBtn.hidden) {
        e.preventDefault();
        lightbox._portfolioLbStep(1);
      }
    } else if (e.key === "Escape") {
      lightbox._portfolioLbClose();
    }
  });

  var swipeStartX = 0;
  var swipeStartY = 0;

  lightbox.addEventListener("touchstart", function (e) {
    if (!lightbox.classList.contains("is-open")) return;
    swipeStartX = e.changedTouches[0].clientX;
    swipeStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  lightbox.addEventListener("touchend", function (e) {
    if (!lightbox.classList.contains("is-open")) return;
    var dx = e.changedTouches[0].clientX - swipeStartX;
    var dy = e.changedTouches[0].clientY - swipeStartY;
    if (Math.abs(dx) < 44 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) lightbox._portfolioLbStep(1);
    else lightbox._portfolioLbStep(-1);
  }, { passive: true });
})();

/* ==========================================================================
   WoW beat — marquee track duplicate + matched scroll speed
   ========================================================================== */
(function () {
  "use strict";

  var MARQUEE_PX_PER_SEC = 42;

  function syncMarqueeSpeed(track) {
    var distance = track.scrollWidth / 2;
    if (!distance) return;
    track.style.animationDuration = (distance / MARQUEE_PX_PER_SEC) + "s";
  }

  function initTrack(track) {
    var sets = track.querySelectorAll(".wow-beat__marquee-set");
    if (!sets.length) return;
    if (sets.length === 1) {
      var clone = sets[0].cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    }
    syncMarqueeSpeed(track);
  }

  function initAll() {
    document.querySelectorAll(".wow-beat__marquee-track").forEach(initTrack);
  }

  initAll();
  window.addEventListener("load", initAll);

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      document.querySelectorAll(".wow-beat__marquee-track").forEach(syncMarqueeSpeed);
    }, 150);
  });

  document.querySelectorAll(".wow-beat img").forEach(function (img) {
    if (img.complete) return;
    img.addEventListener("load", function () {
      var track = img.closest(".wow-beat__marquee-track");
      if (track) syncMarqueeSpeed(track);
    }, { once: true });
  });
})();

/* ==========================================================================
   Tabs compare — IA + concept light/dark sliders
   ========================================================================== */
(function () {
  "use strict";

  var root = document.querySelector("[data-tabs-compare]");
  if (!root) return;

  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(root.querySelectorAll('[role="tabpanel"]'));
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
      var show = panel.getAttribute("data-tab-panel") === id;
      panel.hidden = !show;
    });
    var wid = root.getAttribute("data-fm-widget");
    if (wid) {
      root.setAttribute("data-fm-value", id || "");
      document.dispatchEvent(
        new CustomEvent("portfolio:widget-change", {
          bubbles: true,
          detail: { id: wid, value: id || "" },
        })
      );
    }
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
})();

/* ==========================================================================
   Lazy-load embedded prototypes (defer iframe src until in view)
   ========================================================================== */
(function () {
  "use strict";

  var shells = Array.prototype.slice.call(document.querySelectorAll("[data-prototype-shell]"));
  if (!shells.length) return;

  function loadFrame(frame) {
    if (!frame || frame.src || !frame.getAttribute("data-src")) return;
    frame.src = frame.getAttribute("data-src");
    frame.removeAttribute("data-src");
  }

  function sendPersonaToFrame(frame, personaId) {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ type: "persona-select", personaId: personaId }, "*");
  }

  function sendVariantToFrame(frame, variantId) {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ type: "variant-select", variant: variantId }, "*");
  }

  function initPrototypePersonas(shell) {
    var personaSwitcher = shell.querySelector("[data-prototype-personas]");
    var variantSwitcher = shell.querySelector("[data-prototype-variants]");
    var frame = shell.querySelector("[data-prototype-frame]");
    if (!frame || (!personaSwitcher && !variantSwitcher)) return;

    function syncFrameState() {
      if (variantSwitcher) {
        var vActive =
          variantSwitcher.querySelector("[data-variant-id].trade-off-switcher__tab--active") ||
          variantSwitcher.querySelector("[data-variant-id][aria-selected='true']") ||
          variantSwitcher.querySelector("[data-variant-id]");
        if (vActive) sendVariantToFrame(frame, vActive.getAttribute("data-variant-id"));
      }
      if (personaSwitcher) {
        var pActive =
          personaSwitcher.querySelector(".prototype-persona-tab--active") ||
          personaSwitcher.querySelector("[data-persona-id]");
        if (pActive) sendPersonaToFrame(frame, pActive.getAttribute("data-persona-id"));
      }
    }

    if (personaSwitcher) {
      var tabs = Array.prototype.slice.call(personaSwitcher.querySelectorAll("[data-persona-id]"));
      if (tabs.length) {
        function activateTab(tab) {
          tabs.forEach(function (btn) {
            var isActive = btn === tab;
            btn.classList.toggle("prototype-persona-tab--active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
          });
          sendPersonaToFrame(frame, tab.getAttribute("data-persona-id"));
        }

        personaSwitcher.addEventListener("click", function (e) {
          var tab = e.target.closest("[data-persona-id]");
          if (!tab || tabs.indexOf(tab) < 0) return;
          activateTab(tab);
        });
      }
    }

    if (variantSwitcher) {
      var variantTabs = Array.prototype.slice.call(variantSwitcher.querySelectorAll("[data-variant-id]"));
      if (variantTabs.length) {
        function activateVariant(tab) {
          variantTabs.forEach(function (btn) {
            var isActive = btn === tab;
            btn.classList.toggle("trade-off-switcher__tab--active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
          });
          sendVariantToFrame(frame, tab.getAttribute("data-variant-id"));
        }

        variantSwitcher.addEventListener("click", function (e) {
          var tab = e.target.closest("[data-variant-id]");
          if (!tab || variantTabs.indexOf(tab) < 0) return;
          activateVariant(tab);
        });
      }
    }

    frame.addEventListener("load", syncFrameState);
  }

  shells.forEach(initPrototypePersonas);

  /* Wide / narrow toggle (mirrors the deck) — wide view is off by default */
  document.querySelectorAll("[data-proto-wide-toggle]").forEach(function (toggle) {
    if (toggle.dataset.wideInit) return;
    toggle.dataset.wideInit = "1";
    var row = toggle.closest(".device-story__row");
    if (!row) return;
    toggle.addEventListener("click", function () {
      var on = toggle.getAttribute("aria-checked") !== "true";
      toggle.setAttribute("aria-checked", on ? "true" : "false");
      row.classList.toggle("is-proto-wide", on);
    });
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var shell = entry.target;
          loadFrame(shell.querySelector("[data-prototype-frame]"));
          io.unobserve(shell);
        });
      },
      { rootMargin: "200px 0px", threshold: 0.01 }
    );
    shells.forEach(function (shell) { io.observe(shell); });
    return;
  }

  shells.forEach(function (shell) {
    loadFrame(shell.querySelector("[data-prototype-frame]"));
  });
})();

/* ==========================================================================
   Pause heavy CSS marquees / filmstrips when off-screen (scroll perf)
   ========================================================================== */
(function () {
  "use strict";

  if (!("IntersectionObserver" in window)) return;

  var animatedRoots = document.querySelectorAll(".wow-beat, .cura-filmstrip, .quote-marquee");
  if (!animatedRoots.length) return;

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("is-animation-paused", !entry.isIntersecting);
      });
    },
    { rootMargin: "100px 0px", threshold: 0 }
  );

  animatedRoots.forEach(function (el) { io.observe(el); });
})();

/* ==========================================================================
   Trade-off A/B switchers (Wealth Hub bets)
   ========================================================================== */
(function () {
  "use strict";

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

  function activateVariant(root, variant, silent) {
    var v = variant === "b" ? "b" : "a";
    root.querySelectorAll("[data-variant]").forEach(function (tab) {
      if (!tab.matches(".trade-off-switcher__tab")) return;
      var on = tab.getAttribute("data-variant") === v;
      tab.classList.toggle("trade-off-switcher__tab--active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    root.querySelectorAll("[data-variant-img]").forEach(function (img) {
      var on = img.getAttribute("data-variant-img") === v;
      img.classList.toggle("is-active", on);
      img.hidden = !on;
    });
    if (!root.hasAttribute("data-trade-off-visual-only")) {
      root.querySelectorAll("[data-variant-panel]").forEach(function (panel) {
        var on = panel.getAttribute("data-variant-panel") === v;
        panel.classList.toggle("is-active", on);
        panel.hidden = !on;
      });
    }
    root.querySelectorAll("[data-variant-img]").forEach(function (media) {
      var on = media.getAttribute("data-variant-img") === v;
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
    root.setAttribute("data-fm-value", v);
    var optContainer = tradeoffOptionsContainer(root);
  Array.prototype.slice
    .call((optContainer || root).querySelectorAll(".trade-off__option[data-tradeoff-variant]"))
    .forEach(function (opt) {
      var on = opt.getAttribute("data-tradeoff-variant") === v;
      opt.classList.toggle("trade-off__option--active", on);
      opt.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (silent) return;
    var wid = root.getAttribute("data-fm-widget");
    if (wid) {
      document.dispatchEvent(
        new CustomEvent("portfolio:widget-change", {
          bubbles: true,
          detail: { id: wid, value: v },
        })
      );
    }
  }

  document.querySelectorAll("[data-trade-off-switcher]").forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll(".trade-off-switcher__tab"));
    var optContainer = tradeoffOptionsContainer(root);
    var hasOptions =
      optContainer && optContainer.querySelector(".trade-off__option[data-tradeoff-variant]");
    if (!tabs.length && !hasOptions) return;

    activateVariant(root, root.getAttribute("data-default") || "a", true);

    /* Concept cards that live outside the media root (e.g. in the copy column) */
    if (hasOptions && optContainer !== root) {
      optContainer.addEventListener("click", function (e) {
        var option = e.target.closest(".trade-off__option[data-tradeoff-variant]");
        if (!option || !optContainer.contains(option)) return;
        activateVariant(root, option.getAttribute("data-tradeoff-variant"));
      });
      optContainer.addEventListener("keydown", function (e) {
        var option = e.target.closest(".trade-off__option[data-tradeoff-variant]");
        if (!option || !optContainer.contains(option)) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        activateVariant(root, option.getAttribute("data-tradeoff-variant"));
      });
    }

    root.addEventListener("click", function (e) {
      var option = e.target.closest(".trade-off__option[data-tradeoff-variant]");
      if (option) {
        var optRoot = tradeoffOptionsContainer(root);
        if (optRoot && optRoot.contains(option)) {
          activateVariant(root, option.getAttribute("data-tradeoff-variant"));
          return;
        }
      }
      var tab = e.target.closest(".trade-off-switcher__tab");
      if (!tab || !root.contains(tab)) return;
      if (tab.hasAttribute("data-step")) return;
      activateVariant(root, tab.getAttribute("data-variant"));
    });

    root.addEventListener("keydown", function (e) {
      var option = e.target.closest(".trade-off__option[data-tradeoff-variant]");
      if (option && root.contains(option) && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        activateVariant(root, option.getAttribute("data-tradeoff-variant"));
        return;
      }
      var tab = e.target.closest(".trade-off-switcher__tab");
      if (!tab || !root.contains(tab)) return;
      var idx = tabs.indexOf(tab);
      if (idx < 0) return;
      var next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        next = tabs[(idx + 1) % tabs.length];
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        next = tabs[(idx - 1 + tabs.length) % tabs.length];
      } else if (e.key === "Home") {
        next = tabs[0];
      } else if (e.key === "End") {
        next = tabs[tabs.length - 1];
      }
      if (!next) return;
      e.preventDefault();
      activateVariant(root, next.getAttribute("data-variant"));
      next.focus();
    });
  });
})();

/* ==========================================================================
   Post-MVP release carousels — auto-rotate, loop, pause off-screen
   ========================================================================== */
(function () {
  "use strict";

  var carousels = document.querySelectorAll("[data-post-mvp-carousel]");
  if (!carousels.length) return;

  var REDUCE_MQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  function buildPostMvpCarouselControls(carouselRoot, slideCount, onSelect) {
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

      for (var dotIndex = 0; dotIndex < slideCount; dotIndex += 1) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "post-mvp-carousel__dot";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", "Slide " + (dotIndex + 1));
        dot.addEventListener("click", function (selectedIndex) {
          return function () {
            onSelect(selectedIndex);
          };
        }(dotIndex));
        dotsWrap.appendChild(dot);
      }

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

  carousels.forEach(function (root) {
    var track = root.querySelector(".post-mvp-carousel__track");
    var slides = Array.prototype.slice.call(root.querySelectorAll(".post-mvp-carousel__slide"));
    if (!track || slides.length < 2) return;

    var index = 0;
    var intervalMs = parseInt(root.getAttribute("data-interval") || "4500", 10);
    var timer = null;
    var isVisible = true;
    var controls = buildPostMvpCarouselControls(root, slides.length, function (nextIndex) {
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
      track.style.transform = "translate3d(-" + (index * 100) + "%, 0, 0)";
      slides.forEach(function (slide, i) {
        slide.classList.toggle("is-active", i === index);
      });
      syncPostMvpCarouselDots(dots, index);
      root.setAttribute("data-slide-index", String(index + 1));
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function start() {
      stop();
      if (REDUCE_MQ.matches || !isVisible || root.classList.contains("is-animation-paused")) return;
      timer = setInterval(function () {
        goTo(index + 1);
      }, intervalMs);
    }

    goTo(0);
    start();

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            isVisible = entry.isIntersecting;
            root.classList.toggle("is-animation-paused", !entry.isIntersecting);
            if (isVisible) start();
            else stop();
          });
        },
        { rootMargin: "80px 0px", threshold: 0.15 }
      );
      io.observe(root);
    }

    REDUCE_MQ.addEventListener("change", start);
  });
})();

/* ==========================================================================
   Phase wizards (exploration / visual-system steppers)
   ========================================================================== */
(function () {
  "use strict";

  function playVideoInPanel(video) {
    var dataSrc = video.getAttribute("data-src");
    if (dataSrc && !video.getAttribute("src")) {
      video.src = dataSrc;
      video.removeAttribute("data-src");
    }
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  document.querySelectorAll("[data-phase-wizard]").forEach(function (wizardRoot) {
    if (wizardRoot.dataset.phaseWizardInit) return;
    wizardRoot.dataset.phaseWizardInit = "1";

    var tabs = Array.prototype.slice.call(
      wizardRoot.querySelectorAll(
        ".phase-wizard__stepper .trade-off-switcher__tab[data-step], .exploration-wizard__stepper .trade-off-switcher__tab[data-step]"
      )
    );
    var panels = Array.prototype.slice.call(wizardRoot.querySelectorAll("[data-step-panel]"));
    if (!tabs.length || !panels.length) return;

    function activateStep(step) {
      var s = String(step);
      tabs.forEach(function (tab) {
        var on = tab.getAttribute("data-step") === s;
        tab.classList.toggle("trade-off-switcher__tab--active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (panel) {
        var on = panel.getAttribute("data-step-panel") === s;
        panel.classList.toggle("is-active", on);
        panel.hidden = !on;
        panel.querySelectorAll("video").forEach(function (video) {
          if (on) playVideoInPanel(video);
          else video.pause();
        });
      });
      wizardRoot.querySelectorAll(".wh-phase-breakdown__item").forEach(function (item) {
        var on = item.getAttribute("data-step") === s;
        item.classList.toggle("wh-phase-breakdown__item--active", on);
      });
      wizardRoot.querySelectorAll("[data-step-headline]").forEach(function (el) {
        var on = el.getAttribute("data-step-headline") === s;
        el.hidden = !on;
      });
      wizardRoot.querySelectorAll("[data-step-caption]").forEach(function (el) {
        var on = el.getAttribute("data-step-caption") === s;
        el.hidden = !on;
      });
      wizardRoot.querySelectorAll("[data-step-copy]").forEach(function (el) {
        var on = el.getAttribute("data-step-copy") === s;
        el.hidden = !on;
      });
      wizardRoot.querySelectorAll("[data-step-context]").forEach(function (el) {
        var on = el.getAttribute("data-step-context") === s;
        el.hidden = !on;
      });
      var wid = wizardRoot.getAttribute("data-fm-widget");
      if (wid) {
        wizardRoot.setAttribute("data-fm-value", s);
        document.dispatchEvent(
          new CustomEvent("portfolio:widget-change", {
            bubbles: true,
            detail: { id: wid, value: s },
          })
        );
      }
    }

    activateStep(wizardRoot.getAttribute("data-default") || "1");

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        activateStep(tab.getAttribute("data-step"));
      });
    });

    wizardRoot.addEventListener("click", function (e) {
      if (e.target.closest(".exploration-wizard__variant-switcher .trade-off-switcher__tab[data-variant]")) {
        return;
      }
      var tab = e.target.closest(".trade-off-switcher__tab[data-step]");
      if (tab && wizardRoot.contains(tab)) {
        activateStep(tab.getAttribute("data-step"));
        return;
      }
      var breakdown = e.target.closest(".wh-phase-breakdown__item[data-step]");
      if (breakdown && wizardRoot.contains(breakdown)) {
        activateStep(breakdown.getAttribute("data-step"));
      }
    });

    wizardRoot.addEventListener("keydown", function (e) {
      var tab = e.target.closest(".trade-off-switcher__tab[data-step]");
      if (!tab || !wizardRoot.contains(tab)) return;
      var idx = tabs.indexOf(tab);
      if (idx < 0) return;
      var next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabs[(idx + 1) % tabs.length];
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = tabs[(idx - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      activateStep(next.getAttribute("data-step"));
      next.focus();
    });
  });
})();

/* ==========================================================================
   Validation rail + board / prototype toggle (Wealth Hub)
   ========================================================================== */
(function () {
  "use strict";

  document.querySelectorAll("[data-validation-conflicts]").forEach(function (host) {
    if (host.dataset.validationInit) return;
    host.dataset.validationInit = "1";

    var beat = host.closest(".wealth-hub-beat");
    var stage = beat ? beat.querySelector("[data-validation-stage]") : null;
    var videoWrap = stage ? stage.querySelector("[data-vs-video]") : null;
    var video = videoWrap ? videoWrap.querySelector("video") : null;
    var modeToggle = stage ? stage.querySelector("[data-vs-mode-toggle]") : null;
    var modeLabel = stage ? stage.querySelector("[data-vs-mode-label]") : null;
    var viewport = stage ? stage.querySelector("[data-vs-viewport]") : null;
    var canvas = stage ? stage.querySelector("[data-vs-canvas]") : null;
    var chip = stage ? stage.querySelector("[data-validation-chip]") : null;
    var rail = host.querySelector("[data-vs-rail]");
    var cards = Array.prototype.slice.call(host.querySelectorAll("[data-conflict-tab]"));
    var detailCopies = Array.prototype.slice.call(host.querySelectorAll("[data-conflict-detail]"));
    var resultsPanel = host.querySelector("[data-validation-results]");
    var researchEnablement = host.querySelector("[data-validation-research-enablement]");
    var reduceMq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var VS_MAX_SCALE = 8;

    function syncColumns() {
      var showResearch = stage && stage.getAttribute("data-mode") === "video";
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
      var calm = reduceMq && reduceMq.matches;
      canvas.style.transition = animate && !calm ? "transform 0.6s cubic-bezier(0.22, 0.7, 0.2, 1)" : "none";
      canvas.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + view.s + ")";
    }

    function setView(v, animate) {
      view = clampView(v);
      paint(animate);
    }

    function markFree() {
      if (chip) chip.classList.add("is-free");
    }

    function zoomAt(factor, px, py, animate) {
      /* px, py: pointer position inside the viewport as 0–1 */
      var s2 = Math.max(1, Math.min(VS_MAX_SCALE, view.s * factor));
      var ix = view.cx + (px - 0.5) / view.s;
      var iy = view.cy + (py - 0.5) / view.s;
      setView({ s: s2, cx: ix - (px - 0.5) / s2, cy: iy - (py - 0.5) / s2 }, animate);
      markFree();
    }

    function zoneView(card) {
      var direct = (card.getAttribute("data-view") || "").split(",").map(parseFloat);
      if (direct.length === 3 && !direct.some(isNaN)) {
        return { s: Math.max(1, Math.min(VS_MAX_SCALE, direct[0])), cx: direct[1], cy: direct[2] };
      }
      return { s: 1, cx: 0.5, cy: 0.5 };
    }

    function selectCard(id, opts) {
      opts = opts || {};
      var card = cards.filter(function (c) {
        return c.getAttribute("data-conflict-tab") === id;
      })[0];
      if (!card) return;
      cards.forEach(function (c) {
        var on = c === card;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-selected", on ? "true" : "false");
        c.tabIndex = on ? 0 : -1;
      });
      detailCopies.forEach(function (copy) {
        var on = copy.getAttribute("data-conflict-detail") === id;
        copy.classList.toggle("is-active", on);
        copy.setAttribute("aria-hidden", on ? "false" : "true");
      });
      if (stage && stage.getAttribute("data-mode") === "video") setMode("board");
      if (chip) {
        chip.textContent = card.getAttribute("data-chip") || "";
        chip.classList.remove("is-free");
      }
      setView(zoneView(card), opts.animate !== false);
    }

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
      syncColumns();
    }

    if (modeToggle) {
      modeToggle.addEventListener("click", function () {
        var isVideo = stage.getAttribute("data-mode") === "video";
        setMode(isVideo ? "board" : "video");
      });
    }

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
        selectCard(cards[target].getAttribute("data-conflict-tab"));
        cards[target].focus();
      });
    });

    /* Pan + zoom gestures on the board (drag, pinch, ctrl/⌘-wheel, keys, controls) */
    if (viewport && stage) {
      var pointers = {};
      var gesture = null;
      var inVideo = function () {
        return stage.getAttribute("data-mode") === "video";
      };
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
        if (inVideo()) return;
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
      };
      viewport.addEventListener("pointerup", endPointer);
      viewport.addEventListener("pointercancel", endPointer);

      /* Plain wheel scrolls the page; pinch / ctrl / ⌘ + wheel zooms the board */
      viewport.addEventListener(
        "wheel",
        function (e) {
          if (inVideo() || !(e.ctrlKey || e.metaKey)) return;
          e.preventDefault();
          var rect = viewport.getBoundingClientRect();
          var px = (e.clientX - rect.left) / rect.width;
          var py = (e.clientY - rect.top) / rect.height;
          var unit = e.deltaMode === 1 ? 16 : 1;
          zoomAt(Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.012 : 0.0025)), px, py, false);
        },
        { passive: false }
      );

      viewport.addEventListener("dblclick", function (e) {
        if (inVideo() || e.target.closest("[data-vs-controls]")) return;
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
        if (inVideo()) return;
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
        if (handled) e.preventDefault();
      });

      stage.querySelectorAll("[data-vs-zoom]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var kind = btn.getAttribute("data-vs-zoom");
          if (kind === "in") zoomAt(1.5, 0.5, 0.5, true);
          else if (kind === "out") zoomAt(1 / 1.5, 0.5, 0.5, true);
          else { setView({ s: 1, cx: 0.5, cy: 0.5 }, true); markFree(); }
        });
      });

      if (typeof ResizeObserver === "function") {
        new ResizeObserver(function () { paint(false); }).observe(viewport);
      } else {
        window.addEventListener("resize", function () { paint(false); });
      }
    }

    /* Initial state: first card active, board already panned to it */
    var initial = cards.filter(function (c) { return c.classList.contains("is-active"); })[0] || cards[0];
    if (initial) selectCard(initial.getAttribute("data-conflict-tab"), { animate: false, scroll: false });
    syncColumns();
  });
})();

/* ==========================================================================
   Web-parity prototype scale + Final-interface scroll / zoom
   ========================================================================== */
(function () {
  "use strict";

  /* Scale the 1440-wide prototype to fit its frame (no cropped desktop layout) */
  var presentStage = document.getElementById("present-stage");
  document.querySelectorAll("[data-prototype-viewport]").forEach(function (viewport) {
    if (presentStage && viewport.closest("#present-source")) return;
    if (viewport.dataset.scaleInit) return;
    viewport.dataset.scaleInit = "1";
    var designWidth = parseFloat(viewport.getAttribute("data-viewport-width")) || 1440;
    function apply() {
      var w = viewport.clientWidth;
      if (w) viewport.style.setProperty("--proto-scale", String(w / designWidth));
    }
    apply();
    if ("ResizeObserver" in window) new ResizeObserver(apply).observe(viewport);
    else window.addEventListener("resize", apply);
  });

  /* Final interface: native scroll + button / keyboard zoom + drag-to-pan */
  var MAX_SCALE = 3;
  document.querySelectorAll("[data-wizard-scroll-viewport]").forEach(function (viewport) {
    if (viewport.dataset.wizardScrollInit) return;
    viewport.dataset.wizardScrollInit = "1";
    var canvas = viewport.querySelector("[data-wizard-scroll-canvas]");
    var slot = viewport.parentElement;
    var controls = slot ? slot.querySelector("[data-wizard-scroll-controls]") : null;
    if (!canvas) return;
    var scale = 1;

    function setScale(next) {
      var prev = scale;
      scale = Math.max(1, Math.min(MAX_SCALE, next));
      var cx = (viewport.scrollLeft + viewport.clientWidth / 2) / (canvas.offsetWidth || 1);
      var cy = (viewport.scrollTop + viewport.clientHeight / 2) / (canvas.offsetHeight || 1);
      canvas.style.width = scale * 100 + "%";
      viewport.classList.toggle("is-zoomed", scale > 1.01);
      if (scale === prev) return;
      viewport.scrollLeft = cx * canvas.offsetWidth - viewport.clientWidth / 2;
      viewport.scrollTop = cy * canvas.offsetHeight - viewport.clientHeight / 2;
    }
    function reset() {
      setScale(1);
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }

    if (controls) {
      controls.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-wizard-zoom]");
        if (!btn) return;
        var kind = btn.getAttribute("data-wizard-zoom");
        if (kind === "in") setScale(scale * 1.35);
        else if (kind === "out") setScale(scale / 1.35);
        else reset();
      });
    }

    viewport.addEventListener("keydown", function (e) {
      if (e.key === "+" || e.key === "=") { e.preventDefault(); setScale(scale * 1.35); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); setScale(scale / 1.35); }
      else if (e.key === "0") { e.preventDefault(); reset(); }
    });

    viewport.addEventListener(
      "wheel",
      function (e) {
        if (!e.ctrlKey) return;
        e.preventDefault();
        setScale(scale * Math.exp(-e.deltaY * 0.01));
      },
      { passive: false }
    );

    var drag = null;
    viewport.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, l: viewport.scrollLeft, t: viewport.scrollTop };
      viewport.classList.add("is-dragging");
      try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
    });
    viewport.addEventListener("pointermove", function (e) {
      if (!drag) return;
      viewport.scrollLeft = drag.l - (e.clientX - drag.x);
      viewport.scrollTop = drag.t - (e.clientY - drag.y);
    });
    function end(e) {
      if (!drag) return;
      drag = null;
      viewport.classList.remove("is-dragging");
      try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    viewport.addEventListener("pointerup", end);
    viewport.addEventListener("pointercancel", end);
  });
})();
