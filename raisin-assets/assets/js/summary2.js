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

  var grid = document.querySelector(".hero-bento");
  if (!grid) return;

  var items = Array.prototype.slice.call(grid.querySelectorAll(".hero-bento__item"));
  if (!items.length) return;

  var DESKTOP_MQ = window.matchMedia("(min-width: 901px)");
  var HOVER_MQ = window.matchMedia("(hover: hover) and (pointer: fine)");
  var REDUCE_MQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  var HOVER_SIZE = 4;
  var hoverId = -1;

  var DEFAULT_COL_WEIGHTS = [1.28, 1.05, 0.92, 0.82];
  var DEFAULT_ROW_WEIGHTS = [1.0, 1.02, 0.96, 0.94];
  var MIDDLE_SQUEEZE_COLS = [0.85, 0.85, null, null];

  /* Per-tile hover: anchor track, expansion multiplier, optional row/col squeeze */
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

  function enabled() {
    return DESKTOP_MQ.matches && HOVER_MQ.matches && !REDUCE_MQ.matches;
  }

  function applyGrid() {
    if (!enabled()) {
      if (hoverId < 0 || !ITEM_HOVER[hoverId]) {
        grid.classList.remove("is-hovering");
        grid.removeAttribute("data-hover-item");
        grid.style.removeProperty("grid-template-columns");
        grid.style.removeProperty("grid-template-rows");
        return;
      }
      grid.classList.add("is-hovering");
      grid.dataset.hoverItem = String(hoverId);
      return;
    }

    if (hoverId < 0) {
      grid.classList.remove("is-hovering");
      grid.removeAttribute("data-hover-item");
      grid.style.gridTemplateColumns = buildTracks(DEFAULT_COL_WEIGHTS, -1, HOVER_SIZE);
      grid.style.gridTemplateRows = buildTracks(DEFAULT_ROW_WEIGHTS, -1, HOVER_SIZE);
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

  var hoverRaf = 0;

  items.forEach(function (item, index) {
    item.addEventListener("mouseenter", function () {
      onHover(index);
    });
  });

  grid.addEventListener("mouseleave", onHoverOff);
  DESKTOP_MQ.addEventListener("change", applyGrid);
  applyGrid();

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
  }

  window.RaisinHero = { set: setRemote };

  /* Click-hold — center zoom on the image (starts immediately on press) */
  var pressedItem = null;

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
  }

  items.forEach(function (item) {
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
})();

/* ==========================================================================
   Lightbox — section-scoped galleries; prev/next only when navigable
   ========================================================================== */
(function () {
  "use strict";

  var lightbox = document.querySelector(".lightbox");
  if (!lightbox) return;

  var lightboxImg = lightbox.querySelector(".lightbox__img") || lightbox.querySelector("img");
  var lightboxVideo = lightbox.querySelector(".lightbox__video");
  var closeBtn = lightbox.querySelector(".lightbox__close");
  var prevBtn = lightbox.querySelector(".lightbox__prev");
  var nextBtn = lightbox.querySelector(".lightbox__next");
  var counter = lightbox.querySelector(".lightbox__counter");
  if (!lightboxImg) return;

  var gallery = null;
  var galleryIndex = 0;
  var TOUCH_MQ = window.matchMedia("(hover: none), (pointer: coarse)");

  var GALLERY_CONTAINERS = ".beat__media, .findings-visuals, .why-proof__media, .mock-panel, .research-banner__img, .post-mvp-card__visual, .post-mvp-carousel, .period-split__visual";

  function imagesInContainer(container) {
    if (container.classList.contains("why-proof__media")) {
      return Array.prototype.slice.call(container.querySelectorAll("img"));
    }
    return Array.prototype.slice.call(container.querySelectorAll("img[data-lightbox]"));
  }

  function getGalleryImages(img) {
    var strip = img.closest(".filmstrip");
    if (strip) {
      return Array.prototype.slice.call(strip.querySelectorAll(".filmstrip__item img"));
    }

    var container = img.closest(GALLERY_CONTAINERS);
    if (container) {
      var scoped = imagesInContainer(container);
      if (scoped.length > 1) return scoped;
    }

    return [img];
  }

  function isVideoSlide(slide) {
    return slide && slide.tagName === "VIDEO";
  }

  function resetLightboxMedia() {
    if (lightboxVideo) {
      lightboxVideo.pause();
      lightboxVideo.hidden = true;
      lightboxVideo.removeAttribute("src");
      lightboxVideo.load();
    }
    lightboxImg.hidden = false;
    lightboxImg.removeAttribute("src");
    lightboxImg.alt = "";
    lightbox.classList.remove("is-video");
  }

  function updateNav() {
    var multi = gallery && gallery.length > 1;

    lightbox.classList.toggle("is-gallery", !!multi);

    if (counter) {
      counter.hidden = !multi;
      if (multi) counter.textContent = (galleryIndex + 1) + " / " + gallery.length;
    }

    if (prevBtn) {
      var hasPrev = multi && galleryIndex > 0;
      prevBtn.hidden = !hasPrev;
      prevBtn.disabled = !hasPrev;
    }

    if (nextBtn) {
      var hasNext = multi && galleryIndex < gallery.length - 1;
      nextBtn.hidden = !hasNext;
      nextBtn.disabled = !hasNext;
    }
  }

  function showSlide() {
    if (!gallery || !gallery.length) return;
    var slide = gallery[galleryIndex];

    if (isVideoSlide(slide) && lightboxVideo) {
      lightbox.classList.add("is-video");
      lightboxImg.hidden = true;
      lightboxImg.removeAttribute("src");
      lightboxVideo.hidden = false;
      lightboxVideo.src = slide.currentSrc || slide.getAttribute("src") || slide.getAttribute("data-src") || slide.src;
      lightboxVideo.setAttribute("title", slide.getAttribute("title") || "");
      lightboxVideo.muted = slide.muted;
      lightboxVideo.loop = slide.loop;
      lightboxVideo.play().catch(function () {});
    } else {
      lightbox.classList.remove("is-video");
      if (lightboxVideo) {
        lightboxVideo.pause();
        lightboxVideo.hidden = true;
        lightboxVideo.removeAttribute("src");
        lightboxVideo.load();
      }
      lightboxImg.hidden = false;
      lightboxImg.src = slide.getAttribute("data-full") || slide.src;
      lightboxImg.alt = slide.alt || "";
    }

    updateNav();
  }

  function openLightbox(imgs, startIndex) {
    gallery = imgs;
    galleryIndex = startIndex;
    showSlide();
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox.classList.contains("is-open")) return;
    lightbox.classList.remove("is-open");
    lightbox.classList.remove("is-gallery");
    resetLightboxMedia();
    gallery = null;
    galleryIndex = 0;
    if (prevBtn) { prevBtn.hidden = true; prevBtn.disabled = true; }
    if (nextBtn) { nextBtn.hidden = true; nextBtn.disabled = true; }
    if (counter) counter.hidden = true;
    document.body.style.overflow = "";
  }

  function step(delta) {
    if (!gallery || gallery.length < 2) return;
    var nextIndex = galleryIndex + delta;
    if (nextIndex < 0 || nextIndex >= gallery.length) return;
    galleryIndex = nextIndex;
    showSlide();
  }

  function openFromImage(img) {
    var imgs = getGalleryImages(img);
    var index = Math.max(0, imgs.indexOf(img));
    openLightbox(imgs, index);
  }

  /* data-lightbox — override main.js; group by section when multiple images */
  document.querySelectorAll("img[data-lightbox]").forEach(function (img) {
    img.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      openFromImage(img);
    }, true);
  });

  document.querySelectorAll("video[data-lightbox]").forEach(function (video) {
    video.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var dataSrc = video.getAttribute("data-src");
      if (dataSrc && !video.getAttribute("src")) {
        video.src = dataSrc;
        video.removeAttribute("data-src");
      }
      openLightbox([video], 0);
    }, true);
  });

  /* Why proof rows — touch-only lightbox, same section gallery */
  document.querySelectorAll(".why-proof--zoom .why-proof__frame").forEach(function (frame) {
    frame.addEventListener("click", function () {
      if (!TOUCH_MQ.matches) return;
      var img = frame.querySelector("img");
      if (!img) return;
      openFromImage(img);
    });
  });

  /* Filmstrip — click to open section gallery */
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
        var imgs = getGalleryImages(item.querySelector("img"));
        openLightbox(imgs, index);
      });
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      closeLightbox();
    }, true);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      step(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      step(1);
    });
  }

  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox || e.target.classList.contains("lightbox__stage")) closeLightbox();
  });

  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "ArrowLeft") {
      if (prevBtn && !prevBtn.hidden) { e.preventDefault(); step(-1); }
    } else if (e.key === "ArrowRight") {
      if (nextBtn && !nextBtn.hidden) { e.preventDefault(); step(1); }
    } else if (e.key === "Escape") {
      closeLightbox();
    }
  });

  /* Swipe between gallery slides on touch */
  var swipeStartX = 0;
  var swipeStartY = 0;

  lightbox.addEventListener("touchstart", function (e) {
    if (!lightbox.classList.contains("is-open")) return;
    swipeStartX = e.changedTouches[0].clientX;
    swipeStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  lightbox.addEventListener("touchend", function (e) {
    if (!lightbox.classList.contains("is-open") || !gallery || gallery.length < 2) return;
    var dx = e.changedTouches[0].clientX - swipeStartX;
    var dy = e.changedTouches[0].clientY - swipeStartY;
    if (Math.abs(dx) < 44 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) step(1);
    else step(-1);
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

  function initPrototypePersonas(shell) {
    var switcher = shell.querySelector("[data-prototype-personas]");
    var frame = shell.querySelector("[data-prototype-frame]");
    if (!switcher || !frame) return;

    var tabs = Array.prototype.slice.call(switcher.querySelectorAll("[data-persona-id]"));
    if (!tabs.length) return;

    function activateTab(tab) {
      tabs.forEach(function (btn) {
        var isActive = btn === tab;
        btn.classList.toggle("prototype-persona-tab--active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      sendPersonaToFrame(frame, tab.getAttribute("data-persona-id"));
    }

    switcher.addEventListener("click", function (e) {
      var tab = e.target.closest("[data-persona-id]");
      if (!tab || tabs.indexOf(tab) < 0) return;
      activateTab(tab);
    });

    frame.addEventListener("load", function () {
      var active = switcher.querySelector(".prototype-persona-tab--active") || tabs[0];
      if (active) sendPersonaToFrame(frame, active.getAttribute("data-persona-id"));
    });
  }

  shells.forEach(initPrototypePersonas);

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

  function activateVariant(root, variant) {
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
  }

  document.querySelectorAll("[data-trade-off-switcher]").forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll(".trade-off-switcher__tab"));
    if (!tabs.length) return;

    activateVariant(root, root.getAttribute("data-default") || "a");

    root.addEventListener("click", function (e) {
      var tab = e.target.closest(".trade-off-switcher__tab");
      if (!tab || !root.contains(tab)) return;
      activateVariant(root, tab.getAttribute("data-variant"));
    });

    root.addEventListener("keydown", function (e) {
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

  carousels.forEach(function (root) {
    var track = root.querySelector(".post-mvp-carousel__track");
    var slides = Array.prototype.slice.call(root.querySelectorAll(".post-mvp-carousel__slide"));
    if (!track || slides.length < 2) return;

    var index = 0;
    var intervalMs = parseInt(root.getAttribute("data-interval") || "4500", 10);
    var timer = null;
    var isVisible = true;

    function goTo(nextIndex) {
      index = (nextIndex + slides.length) % slides.length;
      track.style.transform = "translate3d(-" + (index * 100) + "%, 0, 0)";
      slides.forEach(function (slide, i) {
        slide.classList.toggle("is-active", i === index);
      });
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
