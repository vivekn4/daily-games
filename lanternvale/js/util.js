/* LANTERNVALE js/util.js — seeded RNG, noise, pathfinding helpers.
   UMD: works in browser (globalThis.LV) and Node (module.exports). */
(function () {
  "use strict";
  var LV = (typeof globalThis !== "undefined" && globalThis.LV) || {};
  if (typeof globalThis !== "undefined") globalThis.LV = LV;

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // deterministic int hash -> [0,1)
  function hash2(x, y, seed) {
    var h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // smooth value noise in [0,1]
  function vnoise(x, y, seed) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var s = xf * xf * (3 - 2 * xf), t = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
    var c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    return a + (b - a) * s + (c - a) * t + (a - b - c + d) * s * t;
  }

  function fbm(x, y, seed, oct) {
    var v = 0, amp = 0.5, f = 1, norm = 0;
    for (var i = 0; i < (oct || 3); i++) {
      v += amp * vnoise(x * f, y * f, seed + i * 101);
      norm += amp; amp *= 0.5; f *= 2.03;
    }
    return v / norm;
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

  // BFS on walkable(x,y,gear) -> returns path array of [x,y] or null
  function bfs(sx, sy, tx, ty, walkable, W, H) {
    if (sx === tx && sy === ty) return [[sx, sy]];
    var prev = new Int32Array(W * H).fill(-1);
    var qx = [sx], qy = [sy], head = 0;
    prev[sy * W + sx] = sy * W + sx;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (head < qx.length) {
      var x = qx[head], y = qy[head]; head++;
      for (var d = 0; d < 4; d++) {
        var nx = x + dirs[d][0], ny = y + dirs[d][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        var idx = ny * W + nx;
        if (prev[idx] !== -1) continue;
        if (!walkable(nx, ny)) continue;
        prev[idx] = y * W + x;
        if (nx === tx && ny === ty) {
          var path = [[tx, ty]], c = idx;
          while (c !== sy * W + sx) { path.push([c % W, Math.floor(c / W)]); c = prev[c]; }
          path.push([sx, sy]); path.reverse();
          return path;
        }
        qx.push(nx); qy.push(ny);
      }
    }
    return null;
  }

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function ri(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }

  LV.util = { mulberry32: mulberry32, hash2: hash2, vnoise: vnoise, fbm: fbm, clamp: clamp, lerp: lerp, dist: dist, bfs: bfs, pick: pick, ri: ri };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = LV.util;
  }
})();
