/* DEEPHOLD — util: seeded RNG, math helpers, tiny bus. UMD (browser + Node). */
(function (root, factory) {
  var U = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = U;
  else root.DeepUtil = U;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // mulberry32 — seeded RNG. seed displayed on HUD; same seed => same run.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Hash a string seed into uint32 (lets players type words as seeds).
  function hashSeed(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist(x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function pick(rng, arr) { return arr[(rng() * arr.length) | 0]; }
  function shuffle(rng, arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = (rng() * (i + 1)) | 0;
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function weightedPick(rng, pairs) { // [[weight, value], ...]
    var total = 0, i;
    for (i = 0; i < pairs.length; i++) total += pairs[i][0];
    var r = rng() * total;
    for (i = 0; i < pairs.length; i++) { r -= pairs[i][0]; if (r <= 0) return pairs[i][1]; }
    return pairs[pairs.length - 1][1];
  }

  function fmt(n) {
    n = Math.floor(n);
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return "" + n;
  }

  function getParam(name) {
    try {
      return new URLSearchParams(
        typeof location !== "undefined" ? location.search : ""
      ).get(name);
    } catch (e) { return null; }
  }

  // Tiny event bus for sim -> presentation decoupling.
  function Bus() { this.h = {}; }
  Bus.prototype.on = function (ev, fn) {
    (this.h[ev] = this.h[ev] || []).push(fn);
  };
  Bus.prototype.emit = function (ev, data) {
    var hs = this.h[ev];
    if (hs) for (var i = 0; i < hs.length; i++) { try { hs[i](data); } catch (e) {} }
  };

  return {
    mulberry32: mulberry32, hashSeed: hashSeed, clamp: clamp, lerp: lerp,
    dist: dist, pick: pick, shuffle: shuffle, weightedPick: weightedPick,
    fmt: fmt, getParam: getParam, Bus: Bus
  };
});
