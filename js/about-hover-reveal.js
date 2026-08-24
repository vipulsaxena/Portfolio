/**
 * About hero — cursor-following photo on text hover.
 * Photo layer sits above text with mix-blend-mode: difference (CSS).
 */
(function () {
  "use strict";

  var stage = document.querySelector(".about-stage");
  if (!stage) return;

  var frame = stage.querySelector(".about-hover__frame");
  var displayImg = stage.querySelector(".about-hover__img");
  var sourceImgs = stage.querySelectorAll(".about-hover__sources img[data-hover]");
  if (!frame || !displayImg || !sourceImgs.length) return;

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ROTATIONS = [
    4, -4, 5, -3, 4, 3, -4, 5, -3, 4, -5, 5, -3, 4, -5
  ];

  var mouseX = 0;
  var mouseY = 0;
  var prevX = 0;
  var prevY = 0;
  var velocityX = 0;
  var velocityY = 0;
  var rafMoveId = null;

  function getSourceImg(index) {
    return stage.querySelector(".about-hover__sources img[data-hover=\"" + index + "\"]");
  }

  function setActiveImage(index) {
    var src = getSourceImg(index);
    if (!src) return;

    function apply() {
      displayImg.src = src.currentSrc || src.src;
      displayImg.alt = "";
    }

    if (src.complete && src.naturalWidth) {
      apply();
    } else {
      src.addEventListener("load", apply, { once: true });
    }
  }

  function setFrameRotation(index) {
    var deg = ROTATIONS[index - 1] || 0;
    if (reduceMotion) {
      frame.style.transform = "rotate(" + deg + "deg)";
      return;
    }
    frame.style.transform =
      "rotate(" + deg + "deg) skewX(" + velocityX * 0.04 + "deg) skewY(" + velocityY * 0.04 + "deg)";
  }

  function placeFrame(clientX, clientY) {
    if (!reduceMotion) {
      velocityX = clientX - prevX;
      velocityY = clientY - prevY;
      prevX = clientX;
      prevY = clientY;
    }

    var w = frame.offsetWidth;
    var h = frame.offsetHeight;
    frame.style.top = clientY - h / 2 + "px";
    frame.style.left = clientX - w / 2 + "px";

    var active = stage.querySelector(".about-hover:hover");
    if (active) {
      var match = active.className.match(/about-hover--(\d+)/);
      if (match) setFrameRotation(parseInt(match[1], 10));
    }
  }

  stage.querySelectorAll(".about-hover").forEach(function (span) {
    var match = span.className.match(/about-hover--(\d+)/);
    if (!match) return;
    var index = parseInt(match[1], 10);

    span.addEventListener("mouseenter", function () {
      setActiveImage(index);
      setFrameRotation(index);
    });
  });

  document.addEventListener(
    "mousemove",
    function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!rafMoveId) {
        rafMoveId = requestAnimationFrame(function () {
          placeFrame(mouseX, mouseY);
          rafMoveId = null;
        });
      }
    },
    { passive: true }
  );
})();
