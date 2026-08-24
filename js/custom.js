import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@5.3.12/+esm";
import { KawaseBlurFilter } from "https://cdn.jsdelivr.net/npm/@pixi/filter-kawase-blur@3.2.0/+esm";

// Pixi + Kawase blur load from jsDelivr (+esm). Skypack was intermittently
// leaving module fetches pending, which kept the browser tab spinner running.

// return a random number within a range
function random(min, max) {
  return Math.random() * (max - min) + min;
}

// debounce a function so it only fires after `wait` ms of inactivity
function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// convert HSL (h:0-360, s/l:0-100) to a "#rrggbb" string (matches hsl-to-hex)
function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Compact 2D simplex noise (adapted from simplex-noise.js by Jonas Wagner, MIT)
function makeNoise2D(rand = Math.random) {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const grad = new Float64Array([
    1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 1, 0, -1
  ]);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const n = Math.floor((i + 1) * rand());
    const q = p[i];
    p[i] = p[n];
    p[n] = q;
  }
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod12[i] = perm[i] % 12;
  }
  return function noise2D(x, y) {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    let i1;
    let j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const gi0 = permMod12[ii + perm[jj]] * 2;
      t0 *= t0;
      n0 = t0 * t0 * (grad[gi0] * x0 + grad[gi0 + 1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const gi1 = permMod12[ii + i1 + perm[jj + j1]] * 2;
      t1 *= t1;
      n1 = t1 * t1 * (grad[gi1] * x1 + grad[gi1 + 1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const gi2 = permMod12[ii + 1 + perm[jj + 1]] * 2;
      t2 *= t2;
      n2 = t2 * t2 * (grad[gi2] * x2 + grad[gi2 + 1] * y2);
    }
    return 70 * (n0 + n1 + n2);
  };
}

// map a number from 1 range to another
function map(n, start1, end1, start2, end2) {
  return ((n - start1) / (end1 - start1)) * (end2 - start2) + start2;
}

// Create a new simplex noise instance
const noise2D = makeNoise2D();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Shared tempo for orb noise and the name wash (per Pixi ticker frame @ 60fps).
const ORB_INC = 0.0009;

// Authored trios — names describe the wash, not a single seed hue.
const LUMINESCENCE = [
  { name: "Dusk", hues: [222, 28, 268], sat: 84, light: 56 },
  { name: "Reef", hues: [188, 162, 16], sat: 82, light: 54 },
  { name: "Cinder", hues: [18, 352, 38], sat: 86, light: 55 },
  { name: "Orchard", hues: [128, 48, 348], sat: 80, light: 54 },
  { name: "Marine", hues: [210, 192, 232], sat: 84, light: 56 },
  { name: "Citrus", hues: [48, 78, 22], sat: 88, light: 56 },
  { name: "Twilight", hues: [268, 328, 222], sat: 82, light: 55 },
  { name: "Meadow", hues: [142, 52, 198], sat: 80, light: 54 },
  { name: "Ember", hues: [28, 8, 280], sat: 86, light: 55 },
  { name: "Ice", hues: [198, 218, 250], sat: 78, light: 58 }
];

class ColorPalette {
  constructor() {
    this.index = ~~random(0, LUMINESCENCE.length);
    this.applyPalette();
    this.setCustomProperties();
  }

  applyPalette() {
    const p = LUMINESCENCE[this.index];
    this.name = p.name;
    this.hue = p.hues[0];
    this.complimentaryHue1 = p.hues[1];
    this.complimentaryHue2 = p.hues[2];
    this.saturation = p.sat;
    this.lightness = p.light;
    this.baseColor = hslToHex(this.hue, this.saturation, this.lightness);
    this.complimentaryColor1 = hslToHex(
      this.complimentaryHue1,
      this.saturation,
      this.lightness
    );
    this.complimentaryColor2 = hslToHex(
      this.complimentaryHue2,
      this.saturation,
      this.lightness
    );
    this.colorChoices = [
      this.baseColor,
      this.complimentaryColor1,
      this.complimentaryColor2
    ];
  }

  next() {
    this.index = (this.index + 1) % LUMINESCENCE.length;
    this.applyPalette();
  }

  colorAt(i) {
    return this.colorChoices[i % this.colorChoices.length].replace("#", "0x");
  }

  setCustomProperties() {
    // set CSS custom properties so that the colors defined here can be used throughout the UI
    document.documentElement.style.setProperty("--hue", this.hue);
    document.documentElement.style.setProperty(
      "--hue-complimentary1",
      this.complimentaryHue1
    );
    document.documentElement.style.setProperty(
      "--hue-complimentary2",
      this.complimentaryHue2
    );

    // Same hexes / order as Luminescence dots (HUD) so the name matches the pill.
    document.documentElement.style.setProperty("--lum-text-1", this.baseColor);
    document.documentElement.style.setProperty(
      "--lum-text-2",
      this.complimentaryColor1
    );
    document.documentElement.style.setProperty(
      "--lum-text-3",
      this.complimentaryColor2
    );
  }
}

// Orb class
class Orb {
  // Pixi takes hex colors as hexidecimal literals (0x rather than a string with '#')
  constructor(fill = 0x000000) {
    // bounds = the area an orb is "allowed" to move within
    this.bounds = this.setBounds();
    // initialise the orb's { x, y } values to a random point within it's bounds
    this.x = random(this.bounds["x"].min, this.bounds["x"].max);
    this.y = random(this.bounds["y"].min, this.bounds["y"].max);

    // how large the orb is vs it's original radius (this will modulate over time)
    this.scale = 1;

    // what color is the orb?
    this.fill = fill;

    // the original radius of the orb, set relative to window height
    this.radius = random(window.innerHeight / 6, window.innerHeight / 3);

    // give each orb its own organic silhouette (circle / ellipse / polygon /
    // blob). Computed once and kept within `this.radius` so the overall size,
    // blur and opacity are identical to the original circular orbs.
    this.shapePoints = this.makeShapePoints();

    // starting points in "time" for the noise/self similar random values
    this.xOff = random(0, 1000);
    this.yOff = random(0, 1000);
    // how quickly the noise/self similar random values step through time
    this.inc = ORB_INC;

    // PIXI.Graphics is used to draw 2d primitives (in this case a circle) to the canvas
    this.graphics = new PIXI.Graphics();
    this.graphics.alpha = 0.7;

    // 250ms after the last window resize event, recalculate orb positions.
    window.addEventListener(
      "resize",
      debounce(() => {
        this.bounds = this.setBounds();
      }, 250)
    );
  }

  // Build a flat [x0, y0, x1, y1, ...] point list by sampling `n` angles.
  ring(n, fn) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const [x, y] = fn(a);
      out.push(x, y);
    }
    return out;
  }

  // Pick a random silhouette for this orb. Returns a flat point array for
  // PIXI.drawPolygon, or `null` to keep a perfect circle. All shapes stay
  // within `this.radius`, so size is unchanged — only the outline differs.
  makeShapePoints() {
    const r = this.radius;
    const t = Math.random();

    // ~20%: keep a clean circle
    if (t < 0.2) return null;

    // ~25%: ellipse (squished circle), random aspect + rotation
    if (t < 0.45) {
      const squish = random(0.5, 0.82);
      const rot = random(0, Math.PI);
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      return this.ring(72, (a) => {
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * squish * r;
        return [x * cos - y * sin, x * sin + y * cos];
      });
    }

    // ~25%: regular polygon, 3–6 sides, random rotation (blur softens corners)
    if (t < 0.7) {
      const sides = ~~random(3, 7);
      const rot = random(0, Math.PI * 2);
      const out = [];
      for (let i = 0; i < sides; i++) {
        const a = rot + (i / sides) * Math.PI * 2;
        out.push(Math.cos(a) * r, Math.sin(a) * r);
      }
      return out;
    }

    // ~30%: organic blob via two summed radial harmonics
    const base = 0.8;
    const amp1 = random(0.06, 0.14);
    const amp2 = random(0.03, 0.1);
    const k1 = ~~random(2, 4);
    const k2 = ~~random(3, 6);
    const ph1 = random(0, Math.PI * 2);
    const ph2 = random(0, Math.PI * 2);
    return this.ring(96, (a) => {
      const rr =
        r *
        (base +
          amp1 * (0.5 + 0.5 * Math.sin(a * k1 + ph1)) +
          amp2 * (0.5 + 0.5 * Math.sin(a * k2 + ph2)));
      return [Math.cos(a) * rr, Math.sin(a) * rr];
    });
  }

  setBounds() {
    // how far from the { x, y } origin can each orb move
    const maxDist =
      window.innerWidth < 1000 ? window.innerWidth / 3 : window.innerWidth / 5;
    // the { x, y } origin for each orb (the bottom right of the screen)
    const originX = window.innerWidth / 1.25;
    const originY =
      window.innerWidth < 1000
        ? window.innerHeight
        : window.innerHeight / 1.375;

    // allow each orb to move x distance away from it's x / y origin
    return {
      x: {
        min: originX - maxDist,
        max: originX + maxDist
      },
      y: {
        min: originY - maxDist,
        max: originY + maxDist
      }
    };
  }

  update() {
    this.xOff += this.inc;
    this.yOff += this.inc;

    const xNoise = noise2D(this.xOff, this.xOff);
    const yNoise = noise2D(this.yOff, this.yOff);
    const scaleNoise = noise2D(this.xOff, this.yOff);

    this.x = map(xNoise, -1, 1, this.bounds["x"].min, this.bounds["x"].max);
    this.y = map(yNoise, -1, 1, this.bounds["y"].min, this.bounds["y"].max);
    this.scale = map(scaleNoise, -1, 1, 0.78, 1);
  }

  render() {
    this.graphics.x = this.x;
    this.graphics.y = this.y;
    this.graphics.scale.set(this.scale);

    // clear anything currently drawn to graphics
    this.graphics.clear();

    // tell graphics to fill any shapes drawn after this with the orb's fill color
    this.graphics.beginFill(this.fill);
    // draw this orb's silhouette (polygon/ellipse/blob) or fall back to a circle
    if (this.shapePoints) {
      this.graphics.drawPolygon(this.shapePoints);
    } else {
      this.graphics.drawCircle(0, 0, this.radius);
    }
    // let graphics know we won't be filling in any more shapes
    this.graphics.endFill();
  }
}

// Create PixiJS app
const app = new PIXI.Application({
  // render to <canvas class="orb-canvas"></canvas>
  view: document.querySelector(".orb-canvas"),
  // auto adjust size to fit the current window
  resizeTo: window,
  // transparent background, we will be creating a gradient background later using CSS
  transparent: true
});

// Use the blur filter bundled inside pixi.js so it shares the same @pixi/core
// as the renderer. (A standalone @pixi/filter-* import pulls in a second,
// mismatched core and throws here, which previously aborted the whole script
// and left the "AI Colors" button dead.)
// Kawase blur gives the wide, even, soft spread used on the live site
// (a Gaussian PIXI.filters.BlurFilter falls off too fast and looks sharp).
const kawaseBlur = new KawaseBlurFilter(40, 10, true);
app.stage.filters = [kawaseBlur];

// Create colour palette
const colorPalette = new ColorPalette();

// Create orbs
const orbs = [];

for (let i = 0; i < 10; i++) {
  const orb = new Orb(colorPalette.colorAt(i));

  app.stage.addChild(orb.graphics);

  orbs.push(orb);
}

const heroGreeting = document.querySelector(".hero-greeting.text-gradient");
let heroWashPhase = 0;

function tickHeroWash(delta = 1) {
  if (reduceMotion) return;
  // Same step as Orb.inc — one full colour loop when phase advances by 1.
  heroWashPhase = (heroWashPhase + ORB_INC * delta) % 1;
  const pos = (heroWashPhase * 100).toFixed(3) + "% 0";
  if (heroGreeting) heroGreeting.style.backgroundPosition = pos;
  document.querySelectorAll(".about-hover:hover").forEach(function (el) {
    el.style.backgroundPosition = pos;
  });
}

function tickOrbs(delta) {
  orbs.forEach((orb) => {
    orb.update();
    orb.render();
  });
  tickHeroWash(delta);
}

if (!reduceMotion) {
  app.ticker.add(tickOrbs);
} else {
  orbs.forEach((orb) => {
    orb.update();
    orb.render();
  });
}

function updateColorBadge() {
  const name = colorPalette.name;
  const colors = colorPalette.colorChoices;
  document.querySelectorAll(".overlay__btn--colors").forEach((btn) => {
    const dots = btn.querySelectorAll(".dot");
    dots.forEach((dot, i) => {
      if (colors[i]) dot.style.background = colors[i];
    });
    const nameEl = btn.querySelector(".color-name");
    if (nameEl) nameEl.textContent = name;
    btn.setAttribute("aria-label", `Luminescence: ${name}. Click to cycle palettes.`);
  });
}

function publishOrbPalette() {
  window.OrbPalette = {
    base: colorPalette.baseColor,
    colors: colorPalette.colorChoices.slice()
  };
  window.dispatchEvent(
    new CustomEvent("orb-palette-change", { detail: window.OrbPalette })
  );
}

updateColorBadge();
publishOrbPalette();

const colorsBtns = document.querySelectorAll(".overlay__btn--colors");
colorsBtns.forEach((colorsBtn) => {
  colorsBtn.addEventListener("click", () => {
    colorPalette.next();
    colorPalette.setCustomProperties();

    orbs.forEach((orb, i) => {
      orb.fill = colorPalette.colorAt(i);
    });

    updateColorBadge();
    publishOrbPalette();
  });
});
