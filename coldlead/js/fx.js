/* COLD LEAD — fx.js : shader pass stack + procedural textures.
   All canvas 2D, dependency-free, deterministic (seeded). Static layers are
   pre-rendered once; only rain/grain animate per frame.
   Style variants (?style=a|b|c): a=gritty pixel noir, b=ink & shadow, c=neon silhouette. */
"use strict";
(function () {
  var U = globalThis.ColdLeadUtil;
  var W = 960, H = 600;

  function mkCanvas(w, h) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    return c;
  }

  // ---- procedural textures (seeded value-noise) ----
  function noiseCanvas(seed, w, h, opts) {
    opts = opts || {};
    var cv = mkCanvas(w, h), c = cv.getContext("2d");
    var rng = U.RNG(seed);
    var img = c.createImageData(w, h), d = img.data;
    var scale = opts.scale || 1, contrast = opts.contrast || 1, base = opts.base || 0;
    // simple multi-octave value noise via random grid + bilinear interp
    var gw = Math.ceil(w / 3 / scale) + 2, gh = Math.ceil(h / 3 / scale) + 2;
    var grid = [];
    for (var j = 0; j < gh; j++) { grid[j] = []; for (var i = 0; i < gw; i++) grid[j][i] = rng.next(); }
    function n2(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var a = grid[yi][xi], b = grid[yi][xi + 1], cc = grid[yi + 1][xi], dd = grid[yi + 1][xi + 1];
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      return a + (b - a) * u + (cc - a) * v + (a - b - cc + dd) * u * v;
    }
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var n = n2(x / 8 / scale, y / 8 / scale) * 0.65 + n2(x / 3 / scale, y / 3 / scale) * 0.35;
        var v = Math.max(0, Math.min(255, (base + (n - 0.5) * 2 * contrast * 127)));
        var k = (y * w + x) * 4;
        d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    return cv;
  }

  var TEX = {};
  function textures() {
    if (TEX.paper) return TEX;
    TEX.paper = noiseCanvas(101, 480, 300, { scale: 2.2, contrast: 0.16, base: 128 });     // dialogue/case files
    TEX.concrete = noiseCanvas(202, 480, 300, { scale: 1.1, contrast: 0.42, base: 96 });  // scenes: asphalt
    TEX.metal = noiseCanvas(303, 480, 60, { scale: 3.5, contrast: 0.22, base: 128 });      // deduction board
    TEX.vignette = (function () {
      var cv = mkCanvas(W, H), c = cv.getContext("2d");
      var g = c.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.52)");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      return cv;
    })();
    TEX.scanlines = (function () {
      var cv = mkCanvas(W, H), c = cv.getContext("2d");
      c.fillStyle = "rgba(0,0,0,0.10)";
      for (var y = 0; y < H; y += 4) c.fillRect(0, y, W, 1.5);
      return cv;
    })();
    TEX.blinds = (function () {
      var cv = mkCanvas(W, H), c = cv.getContext("2d");
      var g = c.createLinearGradient(0, 0, W, H * 0.3);
      g.addColorStop(0, "rgba(255,240,210,0.10)"); g.addColorStop(1, "rgba(255,240,210,0)");
      c.fillStyle = g;
      for (var y = 0; y < H; y += 46) c.fillRect(0, y, W, 20);
      return cv;
    })();
    return TEX;
  }

  // Multiply-blend a texture over a rect (uses globalCompositeOperation).
  function overlayTex(c, tex, x, y, w, h, alpha, mode) {
    c.save();
    c.globalAlpha = alpha == null ? 0.5 : alpha;
    c.globalCompositeOperation = mode || "overlay";
    c.drawImage(tex, x, y, w, h);
    c.restore();
  }

  // ---- neon bloom: draw a radial glow copy behind bright text/shapes ----
  function bloom(c, x, y, r, color, alpha) {
    c.save();
    c.globalCompositeOperation = "lighter";
    var g = c.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
    c.globalAlpha = alpha == null ? 0.5 : alpha;
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.restore();
  }

  // ---- animated film grain (light, per-frame) ----
  function grain(c, t, strength) {
    var rng = U.RNG(Math.floor(t * 24) * 7919 + 5);
    c.save();
    c.globalAlpha = strength || 0.06;
    c.fillStyle = "#ffffff";
    for (var i = 0; i < 90; i++) c.fillRect(rng.next() * W, rng.next() * H, 2, 2);
    c.fillStyle = "#000000";
    for (var j = 0; j < 60; j++) c.fillRect(rng.next() * W, rng.next() * H, 2, 2);
    c.restore();
  }

  // ---- style post-process (applied to main canvas copy) ----
  var post = mkCanvas(W, H);
  function applyStyle(c, style, t) {
    if (!style || style === "a") return; // A: native
    var pc = post.getContext("2d");
    pc.clearRect(0, 0, W, H);
    pc.drawImage(c.canvas, 0, 0);
    var img = pc.getImageData(0, 0, W, H), d = img.data;
    var i, r, g, b, v;
    if (style === "b") {
      // INK & SHADOW: posterize to 4 tones, crush blacks, cool paper whites
      for (i = 0; i < d.length; i += 4) {
        r = d[i]; g = d[i + 1]; b = d[i + 2];
        v = (r * 0.35 + g * 0.45 + b * 0.2) / 255;
        var tone = v < 0.22 ? 0 : v < 0.45 ? 1 : v < 0.68 ? 2 : 3;
        var pal = [[6, 6, 12], [38, 42, 62], [112, 124, 150], [214, 220, 232]][tone];
        d[i] = pal[0]; d[i + 1] = pal[1]; d[i + 2] = pal[2];
      }
    } else if (style === "c") {
      // NEON SILHOUETTE: darken mids hard, push neon hues, lift glow
      for (i = 0; i < d.length; i += 4) {
        r = d[i]; g = d[i + 1]; b = d[i + 2];
        v = (r * 0.3 + g * 0.5 + b * 0.2) / 255;
        var k = Math.pow(v, 2.6);
        // teal-magenta duotone
        d[i] = Math.min(255, k * 255 * 0.9 + (r > 150 && g < 110 ? 60 : 0));
        d[i + 1] = k * 200;
        d[i + 2] = Math.min(255, k * 255 * 1.1 + (b > 150 && r < 110 ? 60 : 0));
      }
    }
    pc.putImageData(img, 0, 0);
    c.clearRect(0, 0, W, H);
    c.drawImage(post, 0, 0);
  }

  function styleFromQuery() {
    try {
      if (globalThis.__CL_Q && globalThis.__CL_Q.style) return globalThis.__CL_Q.style;
      var m = /[?&]style=([abc])/.exec(location.search);
      return m ? m[1] : "a";
    } catch (e) { return "a"; }
  }

  globalThis.ColdLeadFX = {
    textures: textures, overlayTex: overlayTex, bloom: bloom, grain: grain,
    applyStyle: applyStyle, styleFromQuery: styleFromQuery, W: W, H: H
  };
})();
