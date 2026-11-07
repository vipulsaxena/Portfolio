/**
 * Client-side portfolio case-study gate — compares SHA-256 of entered password
 * to a stored hash (password is never stored in plaintext in source).
 * Not server-grade security; raises the bar above view-source plaintext.
 */
(function (global) {
  "use strict";

  var ACCESS_PARAM = "password";
  var CHAT_UNLOCK_KEY = "portfolioChatUnlocked";
  var GATE_KEYS = [
    "raisinAccessGranted",
    "olxAccessGranted",
    "n26AccessGranted",
    "gomartAccessGranted",
  ];
  var EXPECTED_SHA256 = "28f0ee33f463deb755ce881ff9987ab2e6cf13844f03246eaf775680d2ca0f92";

  /** Synchronous SHA-256 (UTF-8) → lowercase hex — for early <head> URL checks. */
  function sha256HexSync(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var i;
    var j;
    var result = "";
    var words = [];
    var asciiBitLength = ascii.length * 8;

    var hash = [];
    var k = [];
    var primeCounter = 0;
    function isPrime(n) {
      for (var f = 2; f <= Math.sqrt(n); f++) {
        if (n % f === 0) return false;
      }
      return n > 1;
    }
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (isPrime(candidate)) {
        if (primeCounter < 8) hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    ascii += "\x80";
    while (ascii.length % 64 < 56) ascii += "\x00";
    for (i = 0; i < ascii.length; i += 1) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return "";
      words[i >> 2] |= j << ((3 - (i % 4)) * 8);
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;

    for (j = 0; j < words.length; ) {
      var w = words.slice(j, (j += 16));
      var oldHash = hash.slice(0);

      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15];
        var w2 = w[i - 2];
        var a = hash[0];
        var e = hash[4];
        var temp1 =
          hash[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & hash[5]) ^ (~e & hash[6])) +
          k[i] +
          (w[i] =
            i < 16
              ? w[i]
              : (w[i - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[i - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0);
        var temp2 =
          (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
        hash = hash.slice(0, 8);
      }

      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }

    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? "0" : "") + b.toString(16);
      }
    }
    return result;
  }

  function sha256Hex(text) {
    if (!global.crypto || !global.crypto.subtle) {
      return Promise.reject(new Error("Secure context required for password verification"));
    }
    var data = new TextEncoder().encode(text);
    return global.crypto.subtle.digest("SHA-256", data).then(function (buf) {
      return Array.from(new Uint8Array(buf))
        .map(function (b) {
          return b.toString(16).padStart(2, "0");
        })
        .join("");
    });
  }

  function verifyPortfolioPassword(input) {
    return sha256Hex(String(input)).then(function (hash) {
      return hash === EXPECTED_SHA256;
    });
  }

  function verifySync(input) {
    try {
      return sha256HexSync(String(input)) === EXPECTED_SHA256;
    } catch (_) {
      return false;
    }
  }

  function grantSession(key) {
    try {
      sessionStorage.setItem(key, "1");
    } catch (_) {}
  }

  function grantAllGates() {
    GATE_KEYS.forEach(grantSession);
    grantSession(CHAT_UNLOCK_KEY);
  }

  function passwordFromSearch(search) {
    try {
      return new URLSearchParams(search || global.location.search).get(ACCESS_PARAM);
    } catch (_) {
      return null;
    }
  }

  function activeUrlPassword(loc) {
    loc = loc || global.location;
    var pw = passwordFromSearch(loc.search);
    if (!pw || !verifySync(pw)) return null;
    return pw;
  }

  function appendAccessParam(href, loc) {
    loc = loc || global.location;
    var pw = activeUrlPassword(loc);
    if (!pw) return href;
    try {
      var url = new URL(href, loc.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") return href;
      if (url.origin !== loc.origin) return href;
      if (!url.searchParams.has(ACCESS_PARAM)) url.searchParams.set(ACCESS_PARAM, pw);
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return href;
    }
  }

  /** True when this page load has a valid ?password= (does not write sessionStorage). */
  function hasUrlAccess(loc) {
    return !!activeUrlPassword(loc);
  }

  function applyUrlAccessGrant(loc) {
    loc = loc || global.location;
    var ok = hasUrlAccess(loc);
    global.__portfolioUrlAccess = ok;
    return ok;
  }

  global.PortfolioGate = {
    ACCESS_PARAM: ACCESS_PARAM,
    CHAT_UNLOCK_KEY: CHAT_UNLOCK_KEY,
    GATE_KEYS: GATE_KEYS,
    verify: verifyPortfolioPassword,
    verifySync: verifySync,
    grant: grantSession,
    grantAll: grantAllGates,
    passwordFromSearch: passwordFromSearch,
    activeUrlPassword: activeUrlPassword,
    hasUrlAccess: hasUrlAccess,
    appendAccessParam: appendAccessParam,
    applyUrlAccessGrant: applyUrlAccessGrant,
  };
})(window);
