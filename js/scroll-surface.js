/**
 * Scroll-driven surface mode — index & about.
 * Hero + footer: luminescence (orb canvas visible).
 * Middle content (Featured work / Experiences): plain white surface.
 */
(function () {
  "use strict";

  var plainStart =
    document.getElementById("featured-work") ||
    document.getElementById("experiences");
  var footer = document.querySelector(".shell-footer");
  if (!plainStart || !footer) return;

  var root = document.documentElement;
  var PLAIN_THRESHOLD = 0.55;
  var FOOTER_THRESHOLD = 0.75;

  function update() {
    var vh = window.innerHeight;
    var plainTop = plainStart.getBoundingClientRect().top;
    var footerTop = footer.getBoundingClientRect().top;

    var inPlain = plainTop < vh * PLAIN_THRESHOLD;
    var atFooter = footerTop < vh * FOOTER_THRESHOLD;

    root.classList.toggle("is-plain-surface", inPlain && !atFooter);
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();
})();
