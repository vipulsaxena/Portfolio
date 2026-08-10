/**
 * Lazy-load password gate preview images (index modals + case-study page gates).
 */
(function () {
  "use strict";

  var previewsBooted = false;

  function markPreviewLoaded(img) {
    function reveal() {
      img.classList.add("is-loaded");
    }
    if (img.complete && img.naturalWidth > 0) reveal();
    else img.addEventListener("load", reveal, { once: true });
  }

  document.querySelectorAll("[data-preview-img]").forEach(function (img) {
    img.addEventListener("dragstart", function (e) {
      e.preventDefault();
    });
  });

  function loadCaseStudyPreviews() {
    if (previewsBooted) return;
    previewsBooted = true;
    document.querySelectorAll(".pw-preview picture").forEach(function (picture) {
      if (picture.dataset.loaded === "1") return;
      picture.querySelectorAll("source[data-srcset]").forEach(function (source) {
        source.srcset = source.dataset.srcset;
      });
      var img = picture.querySelector("[data-preview-img]");
      if (img && img.dataset.src && !img.getAttribute("src")) {
        img.src = img.dataset.src;
        markPreviewLoaded(img);
      }
      picture.dataset.loaded = "1";
    });
  }

  window.loadCaseStudyPreviews = loadCaseStudyPreviews;

  var pageGate = document.getElementById("raisinGate")
    || document.getElementById("n26Gate")
    || document.getElementById("olxGate")
    || document.getElementById("gomartGate");

  if (pageGate) {
    loadCaseStudyPreviews();
    return;
  }

  ["raisin-gate-trigger", "olx-gate-trigger", "n26-gate-trigger", "gomart-gate-trigger"].forEach(function (id) {
    var trigger = document.getElementById(id);
    if (!trigger) return;
    trigger.addEventListener("mouseenter", loadCaseStudyPreviews, { once: true });
    trigger.addEventListener("focus", loadCaseStudyPreviews, { once: true });
  });

  if ("requestIdleCallback" in window) {
    requestIdleCallback(loadCaseStudyPreviews, { timeout: 2500 });
  } else {
    setTimeout(loadCaseStudyPreviews, 2000);
  }
})();
