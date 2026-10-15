/* Emberdeep — dungeon: seeded procedural generation.
   Grid of tiles: 0 = wall, 1 = floor. Rooms placed randomly, connected by
   L-corridors (spanning tree + extra loops). Flood-fill verifies that the
   stairs tile is reachable from the start tile; otherwise an emergency
   corridor is carved (bounded attempts, then regen). */
(function (g) {
  "use strict";
  var U = g.EmberUtil;

  var TILE = 32;

  function generate(rng, floor, opts) {
    opts = opts || {};
    var W = 56, H = 40;
    var grid, rooms, start, stairs;

    for (var attempt = 0; attempt < 12; attempt++) {
      grid = new Uint8Array(W * H); // 0 wall
      rooms = [];
      var nRooms = opts.bossArena ? 1 : U.clamp(8 + Math.floor(floor * 0.7), 8, 14);
      var tries = 0;
      while (rooms.length < nRooms && tries < 400) {
        tries++;
        var rw = rng.int(5, 11), rh = rng.int(4, 9);
        var rx = rng.int(2, W - rw - 2), ry = rng.int(2, H - rh - 2);
        var overlap = false;
        for (var i = 0; i < rooms.length; i++) {
          var r = rooms[i];
          if (rx < r.x + r.w + 2 && rx + rw + 2 > r.x && ry < r.y + r.h + 2 && ry + rh + 2 > r.y) { overlap = true; break; }
        }
        if (overlap) continue;
        if (opts.bossArena) { rx = Math.floor(W / 2 - rw / 2); ry = Math.floor(H / 2 - rh / 2); rw = 17; rh = 13; }
        rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2) });
        if (opts.bossArena) break;
      }
      if (!rooms.length) continue;

      function carve(x, y) { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) grid[y * W + x] = 1; }
      function carveRoom(r) { for (var y = r.y; y < r.y + r.h; y++) for (var x = r.x; x < r.x + r.w; x++) carve(x, y); }
      rooms.forEach(carveRoom);

      function corridor(x0, y0, x1, y1) {
        var x = x0, y = y0;
        var firstX = rng.chance(0.5);
        function hTo(tx) { while (x !== tx) { x += Math.sign(tx - x); carve(x, y); carve(x, y + 1); carve(x, y - 1); } }
        function vTo(ty) { while (y !== ty) { y += Math.sign(ty - y); carve(x, y); carve(x - 1, y); carve(x + 1, y); } }
        if (firstX) { hTo(x1); vTo(y1); } else { vTo(y1); hTo(x1); }
      }

      // spanning tree over room order, then a few extra loops
      var order = rng.shuffle(rooms.slice());
      for (var c = 1; c < order.length; c++) corridor(order[c - 1].cx, order[c - 1].cy, order[c].cx, order[c].cy);
      for (var l = 0; l < Math.floor(order.length / 3); l++) {
        var a = rng.pick(order), b = rng.pick(order);
        if (a !== b) corridor(a.cx, a.cy, b.cx, b.cy);
      }

      start = { x: rooms[0].cx, y: rooms[0].cy };
      // stairs in the room farthest from start (by room-center distance)
      var far = rooms[0], farD = -1;
      rooms.forEach(function (r) {
        var d = U.dist(start.x, start.y, r.cx, r.cy);
        if (d > farD) { farD = d; far = r; }
      });
      stairs = { x: far.cx, y: far.cy };
      if (far === rooms[0] && rooms.length > 1) { stairs = { x: rooms[1].cx, y: rooms[1].cy }; }

      if (isConnected(grid, W, H, start, stairs)) break;
      // emergency: carve straight-ish corridor start->stairs and re-check
      corridor(start.x, start.y, stairs.x, stairs.y);
      if (isConnected(grid, W, H, start, stairs)) break;
      // else loop retries with a fresh layout
    }

    return { grid: grid, W: W, H: H, rooms: rooms, start: start, stairs: stairs, tile: TILE };
  }

  function isConnected(grid, W, H, a, b) {
    if (!grid[a.y * W + a.x] || !grid[b.y * W + b.x]) return false;
    var seen = new Uint8Array(W * H);
    var stack = [a.y * W + a.x];
    seen[stack[0]] = 1;
    while (stack.length) {
      var i = stack.pop();
      if (i === b.y * W + b.x) return true;
      var x = i % W, y = Math.floor(i / W);
      var nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (var k = 0; k < 4; k++) {
        var nx = nb[k][0], ny = nb[k][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        var j = ny * W + nx;
        if (!seen[j] && grid[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    return false;
  }

  function isFloor(d, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= d.W || ty >= d.H) return false;
    return d.grid[ty * d.W + tx] === 1;
  }

  // circle-vs-tiles collision resolve: push entity out of walls.
  // Entities are hard-clamped to the dungeon bounds first, so a fast
  // knockback/dash can never tunnel outside the map and run away.
  function collide(d, e, radius) {
    var r = radius || 10;
    e.x = U.clamp(e.x, TILE, (d.W - 1) * TILE);
    e.y = U.clamp(e.y, TILE, (d.H - 1) * TILE);
    var tx0 = Math.floor((e.x - r) / TILE), tx1 = Math.floor((e.x + r) / TILE);
    var ty0 = Math.floor((e.y - r) / TILE), ty1 = Math.floor((e.y + r) / TILE);
    for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
      if (isFloor(d, tx, ty)) continue;
      var nx = U.clamp(e.x, tx * TILE, tx * TILE + TILE);
      var ny = U.clamp(e.y, ty * TILE, ty * TILE + TILE);
      var dx = e.x - nx, dy = e.y - ny;
      var dd2 = dx * dx + dy * dy;
      if (dd2 >= r * r) continue;
      if (dd2 === 0) {
        // center inside the tile: push out along the least-penetrating axis
        var left = e.x - tx * TILE, right = tx * TILE + TILE - e.x;
        var top = e.y - ty * TILE, bot = ty * TILE + TILE - e.y;
        var m = Math.min(left, right, top, bot);
        if (m === left) e.x = tx * TILE - r;
        else if (m === right) e.x = tx * TILE + TILE + r;
        else if (m === top) e.y = ty * TILE - r;
        else e.y = ty * TILE + TILE + r;
      } else {
        var dd = Math.sqrt(dd2);
        e.x = nx + (dx / dd) * r;
        e.y = ny + (dy / dd) * r;
      }
    }
    e.x = U.clamp(e.x, TILE, (d.W - 1) * TILE);
    e.y = U.clamp(e.y, TILE, (d.H - 1) * TILE);
  }

  function randomFloorTile(d, rng, margin) {
    margin = margin || 2;
    for (var i = 0; i < 200; i++) {
      var x = rng.int(margin, d.W - margin - 1), y = rng.int(margin, d.H - margin - 1);
      if (isFloor(d, x, y)) return { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, tx: x, ty: y };
    }
    return { x: (d.start.x + 0.5) * TILE, y: (d.start.y + 0.5) * TILE, tx: d.start.x, ty: d.start.y };
  }

  g.EmberDungeon = {
    TILE: TILE, generate: generate, isConnected: isConnected,
    isFloor: isFloor, collide: collide, randomFloorTile: randomFloorTile
  };
})(typeof window !== "undefined" ? window : globalThis);
