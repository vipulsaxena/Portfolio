/* ==========================================================================
   GoMart summary-v2 interactions
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Persona tabs ---------- */
  var PERSONAS = {
    reliable: {
      label: "Reliable",
      person: "Kimmy",
      role: "A consistent, routine grocery planner",
      analogy: "The Toyota of groceries",
      quote: "I buy the same things every week — same brands, same quantities. I just need it to work every time without surprises.",
      insight: "Wants predictable quality and delivery — but platforms treat every order like a first-time discovery journey.",
      proposition: "GoMart, nailing your groceries",
      benefit: "Using data and impeccable service to perfectly execute your groceries plan.",
      pillars: [
        "Rigorous processes that reduce errors & incidents",
        "Highest quality & freshness guarantee on all products",
        "Transparency on costs, promos & offers",
      ],
    },
    advanced: {
      label: "Advanced",
      person: "Matahari",
      role: "A particular, expert consumer",
      analogy: "The Android of groceries",
      quote: "For chicken, I like going to the wet market — I can choose the size, maturity, and request how it's cleaned and cut. I can even bargain directly with the seller.",
      insight: "Very particular about getting the exact product at the right price — but shopping platforms aren't as advanced as she is.",
      proposition: "GoMart, groceries done exactly my way",
      benefit: "Using advanced tools & data to tailor your shopping to your specific needs.",
      pillars: [
        "Enhanced comparison & evaluation tools for stores, brands, products",
        "Best-in-class service that tailors orders to specific needs",
        "Curation of the most relevant offers & promos",
      ],
    },
    effective: {
      label: "Effective",
      person: "Greg",
      role: "A diligent, efficient grocery planner",
      analogy: "The iPhone of groceries",
      quote: "I organize my shopping list in an excel sheet by category, product, brand of choice, substitution options, and store alternatives — it helps me ensure I get everything I need.",
      insight: "Plans perfectly so he doesn't waste time & effort in-store. But platforms are messy and unintuitive — they don't streamline the process.",
      proposition: "GoMart, helping you shop in a breeze",
      benefit: "Using data and the most intuitive product experience to streamline grocery shopping.",
      pillars: [
        "An autonomous platform that requires minimum steps to order",
        "Quick & efficient shoppers & drivers who don't need guidance",
        "Curation of the most relevant offers & promos",
      ],
    },
  };

  var tabs = document.getElementById("personaTabs");
  var panel = document.getElementById("personaPanel");
  if (tabs && panel) {
    function renderPanel(key) {
      var p = PERSONAS[key];
      if (!p) return;
      var pillarsHtml = p.pillars
        .map(function (pill) {
          return '<li class="chip-row__item"><span aria-hidden="true">→</span> ' + pill + "</li>";
        })
        .join("");
      panel.innerHTML =
        '<div class="gomart-persona-panel__head">' +
        '<div><p class="gomart-persona-panel__name"><strong>' +
        p.person +
        " · " +
        p.label +
        '</strong></p><p class="gomart-persona-panel__role">' +
        p.role +
        "</p></div>" +
        '<span class="gomart-persona-panel__analogy">' +
        p.analogy +
        "</span></div>" +
        '<blockquote class="gomart-persona-panel__quote">"' +
        p.quote +
        '"</blockquote>' +
        '<p class="gomart-persona-panel__insight"><strong>Insight:</strong> ' +
        p.insight +
        "</p>" +
        '<p class="gomart-persona-panel__prop"><strong>' +
        p.proposition +
        "</strong></p>" +
        '<p class="gomart-persona-panel__benefit">' +
        p.benefit +
        "</p>" +
        '<ul class="chip-row chip-row--list">' +
        pillarsHtml +
        "</ul>";
    }

    function setPersona(key) {
      if (!PERSONAS[key]) return;
      tabs.querySelectorAll("[data-persona]").forEach(function (b) {
        b.setAttribute("aria-selected", String(b.dataset.persona === key));
      });
      renderPanel(key);
      tabs.setAttribute("data-fm-value", key);
      document.dispatchEvent(
        new CustomEvent("portfolio:widget-change", {
          bubbles: true,
          detail: { id: tabs.getAttribute("data-fm-widget"), value: key },
        })
      );
    }

    tabs.querySelectorAll("[data-persona]").forEach(function (b) {
      b.addEventListener("click", function () {
        setPersona(b.dataset.persona);
      });
    });
    setPersona("reliable");
  }

  /* ---------- Research board toggle + magnifier ---------- */
  var researchSeg = document.getElementById("researchSeg");
  var researchImg = document.getElementById("researchBoardImg");
  var researchStage = document.getElementById("researchStage");
  var researchMagToggle = document.getElementById("researchMagToggle");
  var researchViews = {
    flow: { src: "assets/gomart/research-flow.png", alt: "Desk-research flow analysis — Discovery to Consideration journey across Gojek home, GoMart home, search, merchant, and cart" },
    funnel: { src: "assets/gomart/research-funnel-board.png", alt: "Funnel board — drop-off rates from Gojek home through GoMart home, search, merchant, and cart" },
  };

  if (researchSeg && researchImg) {
    researchSeg.querySelectorAll("[data-research-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var view = btn.getAttribute("data-research-view");
        var data = researchViews[view];
        if (!data) return;
        researchSeg.querySelectorAll("[data-research-view]").forEach(function (b) {
          b.setAttribute("aria-selected", String(b === btn));
        });
        researchImg.src = data.src;
        researchImg.alt = data.alt;
        researchSeg.setAttribute("data-fm-value", view);
        document.dispatchEvent(
          new CustomEvent("portfolio:widget-change", {
            bubbles: true,
            detail: { id: researchSeg.getAttribute("data-fm-widget"), value: view },
          })
        );
      });
    });
  }

  if (researchStage && researchImg && researchMagToggle) {
    var lens = researchStage.querySelector(".proto-lens");
    var magOn = true;

    function setMag(on) {
      magOn = on;
      researchMagToggle.setAttribute("aria-pressed", String(on));
      researchMagToggle.setAttribute("aria-label", on ? "Magnifier on, click to turn off" : "Magnifier off, click to turn on");
      if (!on) researchStage.classList.remove("is-magnifying");
    }

    researchMagToggle.addEventListener("click", function () {
      setMag(!magOn);
    });
    setMag(true);

    function updateLens(e) {
      if (!magOn || !lens) return;
      var inner = researchStage.querySelector(".proto-stage__inner");
      var img = researchImg;
      if (!inner || !img.naturalWidth) return;
      var stageRect = researchStage.getBoundingClientRect();
      var imgRect = img.getBoundingClientRect();
      var x = e.clientX - stageRect.left;
      var y = e.clientY - stageRect.top;
      var relX = (e.clientX - imgRect.left) / imgRect.width;
      var relY = (e.clientY - imgRect.top) / imgRect.height;
      relX = Math.max(0, Math.min(1, relX));
      relY = Math.max(0, Math.min(1, relY));
      var lensSize = lens.offsetWidth;
      lens.style.left = x - lensSize / 2 + "px";
      lens.style.top = y - lensSize / 2 + "px";
      var zoom = 2.2;
      lens.style.backgroundImage = "url(" + (img.currentSrc || img.src) + ")";
      lens.style.backgroundSize = imgRect.width * zoom + "px " + imgRect.height * zoom + "px";
      lens.style.backgroundPosition = -(relX * imgRect.width * zoom - lensSize / 2) + "px " + -(relY * imgRect.height * zoom - lensSize / 2) + "px";
    }

    researchStage.addEventListener("pointermove", updateLens);
    researchStage.addEventListener("pointerenter", function (e) {
      if (magOn) researchStage.classList.add("is-magnifying");
      updateLens(e);
    });
    researchStage.addEventListener("pointerleave", function () {
      researchStage.classList.remove("is-magnifying");
    });
  }

  /* ---------- Nav carousel ---------- */
  var CAPTIONS = [
    "Navbar needs exploration — shopping modes & tab priorities",
    "Release 3 · stimulus tested · June 2021",
    "Explore — homepage structure, search bar, categories, reorder widget",
    "Merchant — store grouping, favourites, branch selection",
    "Promo — deal browsing, strike prices, loyalty content",
    "Order — ongoing vs history tabs, reorder shortcuts",
    "Search — the Release 3 hypothesis that didn't hold",
  ];

  document.querySelectorAll("[data-nav-carousel]").forEach(function (root) {
    var viewport = root.querySelector(".nav-carousel__viewport");
    var track = root.querySelector("[data-nav-carousel-track]");
    var slides = track ? Array.prototype.slice.call(track.children) : [];
    var dotsWrap = root.querySelector("[data-nav-carousel-dots]");
    var prev = root.querySelector("[data-nav-carousel-prev]");
    var next = root.querySelector("[data-nav-carousel-next]");
    var caption = root.querySelector("[data-nav-carousel-caption]");
    var countEl = root.querySelector("[data-nav-carousel-count]");
    if (!track || !slides.length) return;

    var i = 0;
    var dots = slides.map(function (_, idx) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "nav-carousel__dot";
      d.setAttribute("role", "tab");
      d.setAttribute("aria-label", "Screen " + (idx + 1) + ": " + (CAPTIONS[idx] || ""));
      d.addEventListener("click", function () {
        go(idx);
      });
      if (dotsWrap) dotsWrap.appendChild(d);
      return d;
    });

    function go(n) {
      i = (n + slides.length) % slides.length;
      track.style.transform = "translateX(-" + i * 100 + "%)";
      dots.forEach(function (d, idx) {
        var on = idx === i;
        d.setAttribute("aria-current", String(on));
        d.setAttribute("aria-selected", String(on));
      });
      if (caption) caption.textContent = CAPTIONS[i] || "";
      if (countEl) countEl.textContent = i + 1 + " / " + slides.length;
      root.setAttribute("data-fm-value", String(i));
      document.dispatchEvent(
        new CustomEvent("portfolio:widget-change", {
          bubbles: true,
          detail: { id: root.getAttribute("data-fm-widget"), value: String(i) },
        })
      );
    }

    window.PortfolioCarousel = window.PortfolioCarousel || { _fn: [], go: function (el, n) { this._fn.forEach(function (e) { if (e.el === el) e.go(n); }); } };
    window.PortfolioCarousel._fn.push({ el: root, go: go });

    if (prev) prev.addEventListener("click", function () { go(i - 1); });
    if (next) next.addEventListener("click", function () { go(i + 1); });

    var x0 = null;
    var SWIPE = 40;
    if (viewport) {
      viewport.addEventListener("pointerdown", function (e) {
        x0 = e.clientX;
        viewport.setPointerCapture(e.pointerId);
      });
      viewport.addEventListener("pointerup", function (e) {
        if (x0 === null) return;
        var dx = e.clientX - x0;
        x0 = null;
        if (Math.abs(dx) > SWIPE) go(dx < 0 ? i + 1 : i - 1);
      });
      viewport.addEventListener("pointercancel", function () {
        x0 = null;
      });
    }

    var startAt = parseInt(root.getAttribute("data-fm-value"), 10);
    go(Number.isFinite(startAt) ? startAt : 0);
    document.dispatchEvent(new CustomEvent("portfolio:carousel-ready"));
  });

  /* ---------- Compare slider ---------- */
  document.querySelectorAll("[data-gomart-compare]").forEach(function (root) {
    var after = root.querySelector(".after-layer");
    var handle = root.querySelector(".handle");
    if (!after || !handle) return;
    var dragging = false;

    function set(clientX) {
      var r = root.getBoundingClientRect();
      var p = ((clientX - r.left) / r.width) * 100;
      p = Math.max(0, Math.min(100, p));
      after.style.clipPath = "inset(0 " + (100 - p) + "% 0 0)";
      handle.style.left = p + "%";
      root.setAttribute("data-fm-value", String(Math.round(p)));
    }

    root.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      dragging = true;
      set(e.clientX);
      root.setPointerCapture(e.pointerId);
    });
    root.addEventListener("pointermove", function (e) {
      if (dragging) {
        e.preventDefault();
        set(e.clientX);
      }
    });
    var end = function () {
      dragging = false;
    };
    root.addEventListener("pointerup", end);
    root.addEventListener("pointercancel", end);
    root.addEventListener("dragstart", function (e) {
      e.preventDefault();
    });

    requestAnimationFrame(function () {
      var r = root.getBoundingClientRect();
      set(r.left + r.width / 2);
    });
  });

  /* ---------- Autoplay videos in view ---------- */
  var vids = Array.prototype.slice.call(document.querySelectorAll("video[data-autoplay-inview]"));
  if (vids.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: [0, 0.5, 1] }
    );
    vids.forEach(function (v) {
      io.observe(v);
    });
  }
})();
