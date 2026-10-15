/* Emberdeep — util: seeded RNG + math helpers. Browser-global + Node compatible. */
(function (g) {
  "use strict";

  // mulberry32 — small, fast, seedable.
  function RNG(seed) {
    var a = seed >>> 0;
    this.next = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  RNG.prototype.range = function (lo, hi) { return lo + this.next() * (hi - lo); };
  RNG.prototype.int = function (lo, hi) { return Math.floor(this.range(lo, hi + 1)); };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  RNG.prototype.chance = function (p) { return this.next() < p; };
  RNG.prototype.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(this.next() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  g.EmberUtil = { RNG: RNG, clamp: clamp, dist: dist, angleTo: angleTo, lerp: lerp };
})(typeof window !== "undefined" ? window : globalThis);
