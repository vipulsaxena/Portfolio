/* Shared page-level lightbox (not browser fullscreen). Follow Me sync via data-fm-id. */
(function (global) {
  "use strict";

  var GALLERY_CONTAINERS =
    ".beat__media, .findings-visuals, .why-proof__media, .mock-panel, .research-banner__img, .post-mvp-card__visual, .post-mvp-carousel, .period-split__visual, .ai-tools-grid";

  var applyingRemote = false;
  var currentFmId = null;
  var mounted = [];

  function emitChange() {
    document.dispatchEvent(new CustomEvent("portfolio:lightbox-change", { bubbles: true }));
  }

  function fmIdOf(el) {
    return el && el.getAttribute ? el.getAttribute("data-fm-id") : null;
  }

  function imagesInContainer(container) {
    if (container.classList.contains("why-proof__media")) {
      return Array.prototype.slice.call(container.querySelectorAll("img"));
    }
    return Array.prototype.slice.call(container.querySelectorAll("img[data-lightbox]"));
  }

  function explorationStageGallery(el) {
    var stage = el && el.closest ? el.closest(".exploration-wizard__stage") : null;
    if (!stage) return null;
    var steps = Array.prototype.slice.call(stage.querySelectorAll("[data-step-panel]"));
    steps.sort(function (a, b) {
      return Number(a.getAttribute("data-step-panel")) - Number(b.getAttribute("data-step-panel"));
    });
    var out = [];
    steps.forEach(function (step) {
      step.querySelectorAll("img[data-lightbox], video[data-lightbox]").forEach(function (node) {
        out.push(node);
      });
    });
    return out.length ? out : null;
  }

  function getGalleryImages(el) {
    if (!el) return [];
    var exploration = explorationStageGallery(el);
    if (exploration) return exploration;
    var strip = el.closest(".filmstrip");
    if (strip) return Array.prototype.slice.call(strip.querySelectorAll(".filmstrip__item img"));
    var container = el.closest(GALLERY_CONTAINERS);
    if (container) {
      var scoped = imagesInContainer(container);
      if (scoped.length > 1) return scoped;
    }
    return [el];
  }

  function gallerySlideFmId(gallery, index) {
    if (!gallery || index < 0 || index >= gallery.length) return null;
    var slide = gallery[index];
    return fmIdOf(slide) || null;
  }

  function setCurrentFromGallery(gallery, index) {
    currentFmId = gallerySlideFmId(gallery, index);
  }

  function isOpenGallery(lightbox) {
    return lightbox && lightbox.classList.contains("is-open");
  }

  function isExplorationLightboxMediaVisible(media) {
    if (!media || !media.getAttribute || !media.hasAttribute("data-lightbox")) return false;
    var node = media;
    while (node && node !== document.documentElement) {
      if (node.hidden) return false;
      node = node.parentElement;
    }
    return true;
  }

  function lightboxMediaInAssetSlot(slot) {
    if (!slot) return null;
    var visibleVariant = slot.querySelector(".trade-off-switcher__media:not([hidden])");
    if (visibleVariant) {
      var inVariant = visibleVariant.querySelector("img[data-lightbox], video[data-lightbox]");
      if (inVariant && isExplorationLightboxMediaVisible(inVariant)) return inVariant;
    }
    var all = slot.querySelectorAll("img[data-lightbox], video[data-lightbox]");
    for (var i = 0; i < all.length; i++) {
      if (isExplorationLightboxMediaVisible(all[i])) return all[i];
    }
    return null;
  }

  function explorationLightboxTargetFromEvent(e) {
    if (!e || !e.target || !e.target.closest) return null;
    if (e.target.closest(".trade-off-switcher__tab, .exploration-wizard__variant-tabs")) return null;
    var media = e.target.closest(
      ".exploration-wizard__stage img[data-lightbox], .exploration-wizard__stage video[data-lightbox]"
    );
    if (media && isExplorationLightboxMediaVisible(media)) return media;
    var slot = e.target.closest(".exploration-wizard__stage .exploration-wizard__asset-slot");
    if (!slot) return null;
    return lightboxMediaInAssetSlot(slot);
  }

  function registerExplorationWizardLightboxDelegate() {
    if (document.documentElement.dataset.portfolioLbExplorationDelegate) return;
    document.documentElement.dataset.portfolioLbExplorationDelegate = "1";
    document.addEventListener(
      "click",
      function (e) {
        var media = explorationLightboxTargetFromEvent(e);
        if (!media) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        global.PortfolioLightbox.openFromElement(media);
      },
      true
    );
  }

  function findMountedApiForLightbox(lightbox) {
    for (var m = 0; m < mounted.length; m++) {
      if (mounted[m].lightbox === lightbox) return mounted[m];
    }
    return null;
  }

  function mountGallery(lightbox, options) {
    if (!lightbox) return null;
    var existing = findMountedApiForLightbox(lightbox);
    if (existing) return existing;
    if (lightbox.dataset.portfolioLbMounted) {
      delete lightbox.dataset.portfolioLbMounted;
    }
    lightbox.dataset.portfolioLbMounted = "1";

    options = options || {};
    var wrapGallery = !!options.wrapGallery;

    var lightboxImg = lightbox.querySelector(".lightbox__img") || lightbox.querySelector("img");
    var lightboxVideo = lightbox.querySelector(".lightbox__video");
    var closeBtn = lightbox.querySelector(".lightbox__close");
    var prevBtn = lightbox.querySelector(".lightbox__prev");
    var nextBtn = lightbox.querySelector(".lightbox__next");
    var counter = lightbox.querySelector(".lightbox__counter");
    if (!lightboxImg) {
      delete lightbox.dataset.portfolioLbMounted;
      return null;
    }

    var gallery = null;
    var galleryIndex = 0;
    var silent = false;

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
        if (multi) counter.textContent = galleryIndex + 1 + " / " + gallery.length;
      }
      if (prevBtn) {
        if (wrapGallery) {
          prevBtn.hidden = !multi;
          prevBtn.disabled = false;
        } else {
          var hasPrev = multi && galleryIndex > 0;
          prevBtn.hidden = !hasPrev;
          prevBtn.disabled = !hasPrev;
        }
      }
      if (nextBtn) {
        if (wrapGallery) {
          nextBtn.hidden = !multi;
          nextBtn.disabled = false;
        } else {
          var hasNext = multi && galleryIndex < gallery.length - 1;
          nextBtn.hidden = !hasNext;
          nextBtn.disabled = !hasNext;
        }
      }
    }

    function showSlide() {
      if (!gallery || !gallery.length) return;
      var slide = gallery[galleryIndex];
      if (isVideoSlide(slide) && lightboxVideo) {
        lightbox.classList.add("is-video");
        lightboxImg.hidden = true;
        lightboxVideo.hidden = false;
        var src =
          slide.currentSrc || slide.getAttribute("src") || slide.getAttribute("data-src") || slide.src || "";
        lightboxVideo.src = src;
        lightboxVideo.muted = true;
        lightboxVideo.setAttribute("muted", "");
        lightboxVideo.playsInline = true;
        lightboxVideo.setAttribute("playsinline", "");
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
      setCurrentFromGallery(gallery, galleryIndex);
      updateNav();
    }

    function openLightbox(imgs, startIndex, opts) {
      opts = opts || {};
      silent = !!opts.silent;
      gallery = imgs;
      galleryIndex = startIndex;
      showSlide();
      lightbox.classList.add("is-open");
      document.body.style.overflow = "hidden";
      if (!silent && !applyingRemote) emitChange();
    }

    function closeLightbox(opts) {
      opts = opts || {};
      silent = !!opts.silent;
      if (!lightbox.classList.contains("is-open")) {
        currentFmId = null;
        return;
      }
      lightbox.classList.remove("is-open", "is-gallery", "is-video");
      resetLightboxMedia();
      gallery = null;
      galleryIndex = 0;
      if (prevBtn) {
        prevBtn.hidden = true;
        prevBtn.disabled = true;
      }
      if (nextBtn) {
        nextBtn.hidden = true;
        nextBtn.disabled = true;
      }
      if (counter) counter.hidden = true;
      document.body.style.overflow = "";
      currentFmId = null;
      if (!silent && !applyingRemote) emitChange();
    }

    function step(delta) {
      if (!gallery || gallery.length < 2) return;
      var nextIndex;
      if (wrapGallery) {
        nextIndex = (galleryIndex + delta + gallery.length) % gallery.length;
      } else {
        nextIndex = galleryIndex + delta;
        if (nextIndex < 0 || nextIndex >= gallery.length) return;
      }
      galleryIndex = nextIndex;
      showSlide();
      if (!applyingRemote) emitChange();
    }

    function openFromElement(el, opts) {
      if (!el) return;
      if (el.tagName === "VIDEO") {
        var dataSrc = el.getAttribute("data-src");
        if (dataSrc && !el.getAttribute("src")) {
          el.src = dataSrc;
          el.removeAttribute("data-src");
        }
        var videoGallery = getGalleryImages(el);
        var videoIndex = Math.max(0, videoGallery.indexOf(el));
        openLightbox(videoGallery, videoIndex, opts);
        return;
      }
      var imgs = getGalleryImages(el);
      var index = Math.max(0, imgs.indexOf(el));
      openLightbox(imgs, index, opts);
    }

    function bindRoot(root, opts) {
      if (!root) return;
      opts = opts || {};
      var force = !!opts.force;
      root.querySelectorAll("img[data-lightbox]").forEach(function (img) {
        if (img.dataset.portfolioLbInit && !force) return;
        img.dataset.portfolioLbInit = "1";
        img.style.cursor = "pointer";
        img.addEventListener(
          "click",
          function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            openFromElement(img);
          },
          true
        );
      });
      root.querySelectorAll(".ai-tools-grid__frame").forEach(function (frame) {
        if (frame.dataset.portfolioLbInit) return;
        var img = frame.querySelector("img[data-lightbox]");
        if (!img || img.dataset.portfolioLbInit) return;
        frame.dataset.portfolioLbInit = "1";
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
          openLightbox(imgs, index);
        });
      });
      root.querySelectorAll("video[data-lightbox]").forEach(function (video) {
        if (video.dataset.portfolioLbInit && !force) return;
        video.dataset.portfolioLbInit = "1";
        video.style.cursor = "zoom-in";
        video.addEventListener(
          "click",
          function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            openFromElement(video);
          },
          true
        );
      });
      root.querySelectorAll(".exploration-wizard__asset-slot").forEach(function (slot) {
        if (slot.dataset.portfolioLbSlotInit && !force) return;
        if (!lightboxMediaInAssetSlot(slot)) return;
        slot.dataset.portfolioLbSlotInit = "1";
        slot.style.cursor = "zoom-in";
        slot.addEventListener(
          "click",
          function (e) {
            if (e.target.closest(".trade-off-switcher__tab, .exploration-wizard__variant-tabs")) return;
            if (e.target.closest("img[data-lightbox], video[data-lightbox]")) return;
            var media = lightboxMediaInAssetSlot(slot);
            if (!media) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            openFromElement(media);
          },
          true
        );
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        closeLightbox();
      });
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

    lightbox._portfolioLbStep = step;
    lightbox._portfolioLbClose = closeLightbox;

    var api = {
      lightbox: lightbox,
      openFromElement: openFromElement,
      openLightbox: openLightbox,
      close: closeLightbox,
      bindRoot: bindRoot,
      isOpen: function () {
        return isOpenGallery(lightbox);
      },
    };
    mounted.push(api);
    return api;
  }

  function mountSimple(lb, lbImg) {
    if (!lb || !lbImg || lb.dataset.portfolioLbMounted) return;
    lb.dataset.portfolioLbMounted = "1";

    function openFromImg(img, opts) {
      opts = opts || {};
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || "";
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
      currentFmId = fmIdOf(img);
      if (!opts.silent && !applyingRemote) emitChange();
    }

    function closeSimple(opts) {
      opts = opts || {};
      if (!lb.classList.contains("open")) {
        currentFmId = null;
        return;
      }
      lb.classList.remove("open");
      lb.setAttribute("aria-hidden", "true");
      currentFmId = null;
      if (!opts.silent && !applyingRemote) emitChange();
    }

    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-lightbox]");
      if (t && t.tagName === "IMG") {
        e.preventDefault();
        openFromImg(t);
        return;
      }
      if (e.target === lb || e.target === lbImg) closeSimple();
    });

    var api = {
      lightbox: lb,
      openFromElement: function (el, opts) {
        if (el && el.tagName === "IMG") openFromImg(el, opts);
      },
      close: closeSimple,
      bindRoot: function () {},
      isOpen: function () {
        return lb.classList.contains("open");
      },
    };
    mounted.push(api);
    return api;
  }

  function activeApi() {
    for (var i = mounted.length - 1; i >= 0; i--) {
      if (mounted[i].isOpen()) return mounted[i];
    }
    return null;
  }

  global.PortfolioLightbox = {
    isApplyingRemote: function () {
      return applyingRemote;
    },
    getState: function () {
      var api = activeApi();
      if (!api) return null;
      return currentFmId;
    },
    apply: function (fmId) {
      applyingRemote = true;
      try {
        if (!fmId) {
          mounted.forEach(function (api) {
            api.close({ silent: true });
          });
          return;
        }
        var el = document.querySelector('[data-fm-id="' + fmId + '"]');
        if (!el) return;
        mounted.forEach(function (api) {
          if (api.isOpen()) api.close({ silent: true });
        });
        for (var i = 0; i < mounted.length; i++) {
          mounted[i].openFromElement(el, { silent: true });
          if (mounted[i].isOpen()) break;
        }
      } finally {
        applyingRemote = false;
      }
    },
    close: function (opts) {
      opts = opts || {};
      var api = activeApi();
      if (api) api.close(opts);
      else currentFmId = null;
    },
    openFromElement: function (el, opts) {
      if (!el) return;
      for (var i = 0; i < mounted.length; i++) {
        if (!mounted[i].openFromElement) continue;
        mounted[i].openFromElement(el, opts);
        if (mounted[i].isOpen()) return;
      }
    },
    isOpen: function () {
      return !!activeApi();
    },
    mountGallery: mountGallery,
    mountSimple: mountSimple,
    getGalleryImages: getGalleryImages,
  };

  function autoMountLegacy() {
    var legacy = document.getElementById("lightbox");
    if (!legacy || legacy.dataset.portfolioLbMounted) return;
    var img = legacy.querySelector("img");
    if (img) mountSimple(legacy, img);
  }

  registerExplorationWizardLightboxDelegate();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMountLegacy);
  } else {
    autoMountLegacy();
  }
})(window);
