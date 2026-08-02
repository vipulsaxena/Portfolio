(function () {
  var AVATAR_DIR = "images/avatar_assets/";
  var DEFAULT_KEY = "default";
  var MORPH_MS = 560;

  var bio = document.querySelector(".about-bio");
  var layers = document.querySelectorAll(".avatar-morph__img");
  if (!bio || layers.length < 2) return;

  var activeLayer = 0;
  var currentKey = DEFAULT_KEY;
  var activeHit = null;
  var morphToken = 0;
  var cache = {};

  function avatarSrc(key) {
    return AVATAR_DIR + key + ".png";
  }

  function preload(key) {
    if (cache[key]) return cache[key];
    cache[key] = new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(key); };
      img.onerror = reject;
      img.src = avatarSrc(key);
    });
    return cache[key];
  }

  function setActiveHit(el) {
    document.querySelectorAll(".about-bio__hit.is-active").forEach(function (hit) {
      hit.classList.remove("is-active");
    });
    if (el) el.classList.add("is-active");
  }

  function waitForFade(layer, token) {
    return new Promise(function (resolve) {
      var done = false;

      function finish() {
        if (done || token !== morphToken) return;
        done = true;
        layer.removeEventListener("transitionend", onEnd);
        resolve();
      }

      function onEnd(e) {
        if (e.target !== layer || e.propertyName !== "opacity") return;
        finish();
      }

      layer.addEventListener("transitionend", onEnd);
      window.setTimeout(finish, MORPH_MS + 40);
    });
  }

  function morphTo(key, hit) {
    if (!key) key = DEFAULT_KEY;
    if (hit) {
      activeHit = hit;
      setActiveHit(hit);
    }

    if (key === currentKey) return;

    var token = ++morphToken;
    var src = avatarSrc(key);

    preload(key).then(function () {
      if (token !== morphToken) return;

      var nextLayer = activeLayer === 0 ? 1 : 0;
      var incoming = layers[nextLayer];
      var outgoing = layers[activeLayer];

      if (incoming.src !== src) {
        incoming.src = src;
      }

      if (incoming.decode) {
        return incoming.decode().catch(function () {});
      }
    }).then(function () {
      if (token !== morphToken) return;

      var nextLayer = activeLayer === 0 ? 1 : 0;
      var incoming = layers[nextLayer];
      var outgoing = layers[activeLayer];

      incoming.classList.add("is-active");
      outgoing.classList.remove("is-active");
      activeLayer = nextLayer;
      currentKey = key;

      return waitForFade(incoming, token);
    }).catch(function () {
      if (token !== morphToken) return;
      currentKey = key;
    });
  }

  Object.keys({
    default: 1,
    study: 1,
    artist: 1,
    designer: 1,
    coder: 1,
    seller: 1,
    storyteller: 1,
    gamer: 1,
    devil: 1,
    researcher: 1
  }).forEach(preload);

  bio.addEventListener("mouseover", function (e) {
    var hit = e.target.closest(".about-bio__hit[data-avatar]");
    if (!hit || !bio.contains(hit) || hit === activeHit) return;
    morphTo(hit.dataset.avatar, hit);
  });

  bio.addEventListener("mouseleave", function () {
    activeHit = null;
    setActiveHit(null);
  });

  bio.addEventListener("focusin", function (e) {
    var hit = e.target.closest(".about-bio__hit[data-avatar]");
    if (!hit || !bio.contains(hit)) return;
    morphTo(hit.dataset.avatar, hit);
  });

  bio.addEventListener("focusout", function (e) {
    if (bio.contains(e.relatedTarget)) return;
    activeHit = null;
    setActiveHit(null);
  });
})();
