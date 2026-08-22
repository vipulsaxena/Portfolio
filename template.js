/* =====================================================================
   Case Study Template — interactions (vanilla JS, no dependencies)
   Components are declarative via data-attributes so they're reusable:
     [data-nav-toggle] / [data-nav-menu]   mobile menu
     [data-scrollspy]                       active section highlighting
     [data-share]                           share / copy link
     [data-tabs] + [data-tab] + [data-panel]tabbed views
     [data-carousel] ...                    image carousel
     [data-compare]                         before/after slider
     [data-lightbox]                        click to expand
     [data-reveal]                          fade-up on scroll
   ===================================================================== */
(function () {
  "use strict";
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Mobile menu ---------- */
  (function mobileMenu() {
    const btn = $("[data-nav-toggle]");
    const menu = $("[data-nav-menu]");
    if (!btn || !menu) return;
    const toggle = (open) => {
      const isOpen = open ?? !menu.classList.contains("open");
      menu.classList.toggle("open", isOpen);
      btn.setAttribute("aria-expanded", String(isOpen));
    };
    btn.addEventListener("click", () => toggle());
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) toggle(false); });
  })();

  /* ---------- Scrollspy: highlight active nav link ---------- */
  (function scrollspy() {
    const links = $$("[data-scrollspy] .shell-link");
    if (!links.length) return;
    const map = new Map();
    links.forEach((l) => {
      const href = l.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      const sec = document.getElementById(href.slice(1));
      if (sec) map.set(sec, l);
    });
    const setActive = (link) => {
      links.forEach((l) => l.classList.toggle("is-active", l === link));
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setActive(map.get(en.target)); });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    map.forEach((_, sec) => io.observe(sec));
  })();

  /* ---------- Share / copy link ---------- */
  (function share() {
    $$("[data-share]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const data = { title: document.title, url: location.href };
        try {
          if (navigator.share) { await navigator.share(data); return; }
          await navigator.clipboard.writeText(location.href);
          const t = btn.textContent; btn.textContent = "Link copied ✓";
          setTimeout(() => (btn.textContent = t), 1600);
        } catch (_) { /* user cancelled */ }
      });
    });
  })();

  /* ---------- Tabs ---------- */
  (function tabs() {
    $$("[data-tabs]").forEach((root) => {
      const btns = $$("[data-tab]", root);
      const panels = $$("[data-panel]", root);
      const select = (i) => {
        btns.forEach((b) => {
          const on = b.dataset.tab === String(i);
          b.setAttribute("aria-selected", String(on));
          b.classList.toggle("bg-accent", on);
          b.classList.toggle("text-accink", on);
          b.classList.toggle("text-mute", !on);
        });
        panels.forEach((p) => (p.hidden = p.dataset.panel !== String(i)));
      };
      btns.forEach((b) => b.addEventListener("click", () => select(b.dataset.tab)));
      select(0);
    });
  })();

  /* ---------- Carousel ---------- */
  (function carousels() {
    $$("[data-carousel]").forEach((root) => {
      const track = $("[data-carousel-track]", root);
      const slides = $$(":scope > *", track);
      const dotsWrap = $("[data-carousel-dots]", root);
      const prev = $("[data-carousel-prev]", root);
      const next = $("[data-carousel-next]", root);
      if (!track || slides.length === 0) return;
      let i = 0;

      const dots = slides.map((_, idx) => {
        const d = document.createElement("button");
        d.className = "dot";
        d.setAttribute("aria-label", `Go to slide ${idx + 1}`);
        d.addEventListener("click", () => go(idx));
        dotsWrap && dotsWrap.appendChild(d);
        return d;
      });

      const go = (n) => {
        i = (n + slides.length) % slides.length;
        track.style.transform = `translateX(-${i * 100}%)`;
        dots.forEach((d, idx) => d.setAttribute("aria-current", String(idx === i)));
        root.setAttribute("data-fm-value", String(i));
        document.dispatchEvent(
          new CustomEvent("portfolio:widget-change", { bubbles: true, detail: { id: root.getAttribute("data-fm-widget"), value: String(i) } })
        );
      };
      window.PortfolioCarousel = window.PortfolioCarousel || {
        _fn: [],
        go: function (el, n) {
          this._fn.forEach(function (entry) {
            if (entry.el === el) entry.go(n);
          });
        },
      };
      window.PortfolioCarousel._fn.push({ el: root, go: go });
      document.dispatchEvent(new CustomEvent("portfolio:carousel-ready"));
      prev && prev.addEventListener("click", () => go(i - 1));
      next && next.addEventListener("click", () => go(i + 1));

      /* swipe */
      let x0 = null;
      track.addEventListener("pointerdown", (e) => { x0 = e.clientX; track.setPointerCapture(e.pointerId); });
      track.addEventListener("pointerup", (e) => {
        if (x0 === null) return;
        const dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
      });
      var startAt = parseInt(root.getAttribute("data-fm-value"), 10);
      go(Number.isFinite(startAt) ? startAt : 0);
    });
  })();

  /* ---------- Before / After compare slider ---------- */
  (function compare() {
    $$("[data-compare]").forEach((root) => {
      const after = $(".after-layer", root);
      const handle = $(".handle", root);
      if (!after || !handle) return;
      let dragging = false;

      const set = (clientX) => {
        const r = root.getBoundingClientRect();
        let p = ((clientX - r.left) / r.width) * 100;
        p = Math.max(0, Math.min(100, p));
        after.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
        handle.style.left = p + "%";
        root.setAttribute("data-fm-value", String(Math.round(p)));
      };
      const start = (e) => { dragging = true; set(e.clientX); root.setPointerCapture(e.pointerId); };
      const move  = (e) => { if (dragging) set(e.clientX); };
      const end   = () => { dragging = false; };

      root.addEventListener("pointerdown", start);
      root.addEventListener("pointermove", move);
      root.addEventListener("pointerup", end);
      root.addEventListener("pointercancel", end);
      /* init at 50% */
      requestAnimationFrame(() => {
        const r = root.getBoundingClientRect();
        set(r.left + r.width / 2);
      });
    });
  })();

  /* ---------- Lightbox ---------- */
  (function lightbox() {
    const box = $("#lightbox");
    if (!box) return;

    const close = () => {
      box.classList.remove("open");
      box.setAttribute("aria-hidden", "true");
      box.innerHTML = "";
    };

    /* Persistent close button — top-right, sized for web + touch */
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lightbox-close";
    closeBtn.setAttribute("aria-label", "Close image");
    closeBtn.innerHTML = "&times;";
    Object.assign(closeBtn.style, {
      position: "fixed",
      top: "max(0.75rem, env(safe-area-inset-top))",
      right: "max(0.75rem, env(safe-area-inset-right))",
      width: "44px",
      height: "44px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      font: "300 30px/1 system-ui, sans-serif",
      color: "#fff",
      background: "rgba(0,0,0,.5)",
      border: "1px solid rgba(255,255,255,.4)",
      borderRadius: "999px",
      cursor: "pointer",
      zIndex: "2",
    });
    closeBtn.addEventListener("click", (e) => { e.stopPropagation(); close(); });

    const open = (node) => {
      box.innerHTML = "";
      let content;
      if (node.tagName === "IMG") {
        content = document.createElement("img");
        content.src = node.currentSrc || node.src;
        content.alt = node.alt || "";
      } else {
        content = node.cloneNode(true);
        content.style.width = "min(92vw, 1200px)";
        content.style.maxHeight = "88vh";
      }
      box.appendChild(content);
      box.appendChild(closeBtn);
      box.classList.add("open");
      box.setAttribute("aria-hidden", "false");
    };

    $$("[data-lightbox]").forEach((el) => {
      el.style.cursor = "zoom-in";
      el.addEventListener("click", () => open(el));
    });
    box.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  })();

  /* ---------- Reveal on scroll ---------- */
  (function reveal() {
    const items = $$("[data-reveal]");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) { items.forEach((i) => i.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach((i) => io.observe(i));
  })();
})();
