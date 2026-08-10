/* ==========================================================================
   Shared interactions — nav, reveal-on-scroll, counters, quote carousel,
   before/after compare slider, lightbox. Vanilla JS, no dependencies.
   ========================================================================== */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Nav scroll state + mobile toggle ---------------- */
  var nav = document.querySelector(".site-nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var menuBtn = nav.querySelector(".site-nav__menu-btn");
    var links = nav.querySelector(".site-nav__links");
    if (menuBtn && links) {
      menuBtn.addEventListener("click", function () {
        menuBtn.classList.toggle("is-open");
        links.classList.toggle("is-open");
      });
      links.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
          menuBtn.classList.remove("is-open");
          links.classList.remove("is-open");
        });
      });
    }
  }

  /* ---------------------- Reveal on scroll --------------------------- */
  var revealEls = document.querySelectorAll(".reveal, .reveal-stagger");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* -------------------------- Stat counters --------------------------- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    var animateCount = function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
      var suffix = el.getAttribute("data-suffix") || "";
      var prefix = el.getAttribute("data-prefix") || "";
      if (reducedMotion) {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
        return;
      }
      var start = null;
      var duration = 1400;
      var step = function (ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = target * eased;
        el.textContent = prefix + value.toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    var cIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            cIo.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach(function (el) { cIo.observe(el); });
  }

  /* -------------------------- Quote carousels --------------------------- */
  document.querySelectorAll("[data-quote-carousel]").forEach(function (root) {
    var quotes = root.querySelectorAll(".quote");
    var dotsWrap = root.querySelector(".quote-carousel__dots");
    if (!quotes.length) return;
    var i = 0;
    quotes.forEach(function (q, idx) {
      if (dotsWrap) {
        var dot = document.createElement("button");
        dot.setAttribute("aria-label", "Show testimonial " + (idx + 1));
        dot.addEventListener("click", function () { show(idx); });
        dotsWrap.appendChild(dot);
      }
    });
    var dots = dotsWrap ? dotsWrap.querySelectorAll("button") : [];
    function show(idx) {
      i = idx;
      quotes.forEach(function (q, qi) { q.classList.toggle("is-active", qi === idx); });
      dots.forEach(function (d, di) { d.classList.toggle("is-active", di === idx); });
    }
    show(0);
    if (quotes.length > 1 && !reducedMotion) {
      setInterval(function () { show((i + 1) % quotes.length); }, 6500);
    }
  });

  /* ----------------------- Before / after compare ------------------------ */
  document.querySelectorAll(".compare").forEach(function (el) {
    var before = el.querySelector(".compare__before");
    var handle = el.querySelector(".compare__handle");
    function setPos(pct) {
      pct = Math.max(0, Math.min(100, pct));
      before.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
      handle.style.left = pct + "%";
    }
    var dragging = false;
    function posFromEvent(e) {
      var rect = el.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      return (x / rect.width) * 100;
    }
    el.addEventListener("pointerdown", function (e) { dragging = true; setPos(posFromEvent(e)); });
    window.addEventListener("pointermove", function (e) { if (dragging) setPos(posFromEvent(e)); });
    window.addEventListener("pointerup", function () { dragging = false; });
    el.addEventListener("click", function (e) {
      if (document.body.classList.contains("summary-v2") && e.pointerType === "touch") return;
      setPos(posFromEvent(e));
    });
    setPos(50);
  });

  /* ------------------------------- Lightbox -------------------------------- */
  var lightbox = document.querySelector(".lightbox");
  if (lightbox) {
    var lightboxImg = lightbox.querySelector(".lightbox__img") || lightbox.querySelector("img");
    var closeBtn = lightbox.querySelector(".lightbox__close");
    var prevBtn = lightbox.querySelector(".lightbox__prev");
    var nextBtn = lightbox.querySelector(".lightbox__next");
    var counter = lightbox.querySelector(".lightbox__counter");
    function setGalleryUi(on) {
      lightbox.classList.toggle("is-gallery", on);
      if (counter) counter.hidden = !on;
      if (prevBtn) prevBtn.hidden = !on;
      if (nextBtn) nextBtn.hidden = !on;
    }
    function openLightbox(src, alt) {
      setGalleryUi(false);
      lightboxImg.src = src;
      lightboxImg.alt = alt || "";
      lightbox.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }
    function closeLightbox() {
      lightbox.classList.remove("is-open");
      setGalleryUi(false);
      document.body.style.overflow = "";
    }
    document.querySelectorAll("[data-lightbox]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var img = trigger.tagName === "IMG" ? trigger : trigger.querySelector("img");
        if (!img) return;
        openLightbox(img.getAttribute("data-full") || img.src, img.alt);
      });
    });
    closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target.classList.contains("lightbox__stage")) closeLightbox();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });
  }

  /* --------------------------- Filmstrip drag-scroll ------------------------ */
  document.querySelectorAll(".filmstrip").forEach(function (strip) {
    var isDown = false;
    var startX = 0;
    var scrollLeft = 0;
    var dragged = false;

    strip.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      isDown = true;
      dragged = false;
      startX = e.clientX;
      scrollLeft = strip.scrollLeft;
      strip.style.cursor = "grabbing";
    });
    window.addEventListener("pointerup", function () {
      isDown = false;
      strip.style.cursor = "";
    });
    strip.addEventListener("pointermove", function (e) {
      if (!isDown) return;
      var delta = e.clientX - startX;
      if (Math.abs(delta) > 6) dragged = true;
      strip.scrollLeft = scrollLeft - delta;
    });
    strip.addEventListener("click", function (e) {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  });

  /* --------------------------- Autoplay video-in-view ------------------------ */
  var lazyVideos = document.querySelectorAll("video[data-autoplay-inview]");
  if ("IntersectionObserver" in window && lazyVideos.length) {
    var ensureVideoSrc = function (v) {
      var dataSrc = v.getAttribute("data-src");
      if (dataSrc && !v.getAttribute("src")) {
        v.src = dataSrc;
        v.removeAttribute("data-src");
      }
    };
    var vIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          ensureVideoSrc(v);
          v.play().catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });
    lazyVideos.forEach(function (v) {
      if (!v.getAttribute("preload")) v.setAttribute("preload", "none");
      vIo.observe(v);
    });
  }

  document.querySelectorAll("video[loop]").forEach(function (v) {
    v.addEventListener("ended", function () {
      v.currentTime = 0;
      v.play().catch(function () {});
    });
  });
})();
