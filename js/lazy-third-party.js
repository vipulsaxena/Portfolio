/**
 * Defer third-party iframes until near the viewport — keeps the tab from
 * waiting on ADPList / Google Forms embeds during initial load.
 */
(function () {
  "use strict";

  var iframes = document.querySelectorAll("iframe[data-lazy-src]");
  if (!iframes.length) return;

  function load(el) {
    if (el.getAttribute("src")) return;
    var src = el.getAttribute("data-lazy-src");
    if (src) el.setAttribute("src", src);
  }

  if (!("IntersectionObserver" in window)) {
    iframes.forEach(load);
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        load(entry.target);
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "240px 0px", threshold: 0.01 }
  );

  iframes.forEach(function (el) {
    io.observe(el);
  });
})();
