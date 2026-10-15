/* LANTERNVALE js/world.js — seeded valley generation + data tables (v2).
   Follows DESIGN.md: 96x96 grid, 5 horizontal bands south->north, river N-S.
   Pure functions of seed; walkable() shared by game + autopilot. UMD. */
(function () {
  "use strict";
  var LV = (typeof globalThis !== "undefined" && globalThis.LV) || {};
  if (typeof globalThis !== "undefined") globalThis.LV = LV;
  var U = LV.util || (typeof require !== "undefined" ? require("./util.js") : null);

  var W = 96, H = 96, TILE = 24;
  var T = {
    MEADOW: 0, GROVEFLOOR: 1, PATH: 2, RIVER: 3, FORD: 4, BRIDGE: 5,
    BROKENBRIDGE: 6, CLIFF: 7, CLIFFPATH: 8, HOLLOWDARK: 9, TREE: 10,
    STONE: 11, SAND: 12, FLOWERS: 13, WOOD: 14, REED: 15, CHANNEL: 16
  };

  // bands: south -> north. rows 0-5 and 92-95 are soft edges (R1 owns 78-95).
  var REGIONS = [
    { id: 0, name: "Vale's Edge", r0: 78, r1: 95 },
    { id: 1, name: "Willowmarch", r0: 60, r1: 77 },
    { id: 2, name: "Ferryman's Reach", r0: 42, r1: 59 },
    { id: 3, name: "Deep Hollow", r0: 24, r1: 41 },
    { id: 4, name: "The Ridge", r0: 6, r1: 23 }
  ];

  var VO_BEATS = ["intro", "tower1", "tower2", "tower3", "tower4", "tower5",
    "deep_hollow", "journal_reveal", "wewake_walk",
    "ending_cartographer", "ending_longway", "ending_deeplight"];

  var FLORA = [
    { id: "poppy", name: "Sungold Poppy", note: "opens at dawn" },
    { id: "reed", name: "River Reed", note: "likes wet feet" },
    { id: "foxglove", name: "Foxglove", note: "tall, freckled, unbothered" },
    { id: "bracken", name: "Bracken Fern", note: "older than the towers" },
    { id: "clover", name: "Vale Clover", note: "four leaves if you're kind" },
    { id: "thistle", name: "High Thistle", note: "the ridge's purple crown" },
    { id: "willowherb", name: "Willowherb", note: "first back after rain" },
    { id: "mosscap", name: "Moss-cap", note: "grows on old stone" },
    { id: "bloom", name: "Deep-light Bloom", note: "only in true dark", night: true },
    { id: "moonpetal", name: "Moonpetal", note: "silver at midnight", night: true },
    { id: "fogmirror", name: "Fog-mirror Bloom", note: "brightest in fog or storm", night: true, fog: true },
    { id: "gloomcap", name: "Gloomcap", note: "the hollow's nightcap", night: true }
  ];
  var FAUNA = [
    { id: "kingfisher", name: "Kingfisher", note: "a blue exclamation" },
    { id: "otter", name: "River Otter", note: "owns the river, lets you visit" },
    { id: "deer", name: "Valley Deer", note: "shy until you're still" },
    { id: "squirrel", name: "Red Squirrel", note: "angry about nuts" },
    { id: "heron", name: "Grey Heron", note: "patience with legs" },
    { id: "frog", name: "Brook Frog", note: "sings when it rains" },
    { id: "firefly", name: "Firefly Swarm", note: "the valley's spare stars", night: true },
    { id: "moth", name: "Lantern Moth", note: "drawn to your light", night: true }
  ];
  var VILLAGERS = [
    { id: "dev", name: "Dev", role: "innkeeper", region: 0 },
    { id: "wewake", name: "Wewake", role: "shepherd", region: 0 },
    { id: "meera", name: "Meera", role: "botanist", region: 1 },
    { id: "vipul", name: "Vipul", role: "ferryman", region: 2 },
    { id: "shivangi", name: "Shivangi", role: "bridge-keeper", region: 4 }
  ];

  function idx(x, y) { return y * W + x; }
  function inB(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
  function regionAtRow(y) {
    for (var i = 0; i < REGIONS.length; i++) if (y >= REGIONS[i].r0 && y <= REGIONS[i].r1) return i;
    return y < 6 ? 4 : 0;
  }

  // ctx: {gear:{waders,climbing,stormlantern}, depth:1|2|3, bridgeR1:true,
  //        bridgeR3:true, ropeFixed:true, boulders:{id:[x,y]}}
  function walkable(world, x, y, ctx) {
    if (!inB(x, y)) return false;
    ctx = ctx || {};
    var gear = ctx.gear || {};
    var t = world.tiles[idx(x, y)];
    // boulders block their tile
    if (ctx.boulders) {
      for (var k in ctx.boulders) { var b = ctx.boulders[k]; if (b[0] === x && b[1] === y) return false; }
    }
    switch (t) {
      case T.RIVER: case T.FORD: case T.REED:
        var d = ctx.depth || 1;
        if (d === 1) return true;
        if (d === 2) return !!gear.waders;
        return false;
      case T.BROKENBRIDGE: return false;
      case T.BRIDGE: return true;
      case T.WOOD: return !!ctx.ropeFixed;
      case T.CLIFF: case T.TREE: return false;
      case T.CLIFFPATH: return !!gear.climbing;
      case T.HOLLOWDARK: return !!gear.stormlantern;
      default: return true;
    }
  }

  function stamp(tiles, x, y, t) { if (inB(x, y)) tiles[idx(x, y)] = t; }

  function carvePath(tiles, pts, avoidWater) {
    for (var s = 0; s < pts.length - 1; s++) {
      var ax = pts[s][0], ay = pts[s][1], bx = pts[s + 1][0], by = pts[s + 1][1];
      var steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2 + 1;
      for (var i = 0; i <= steps; i++) {
        var x = Math.round(ax + (bx - ax) * i / steps), y = Math.round(ay + (by - ay) * i / steps);
        for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 0; dy++) {
          if (!inB(x + dx, y + dy)) continue;
          var cur = tiles[idx(x + dx, y + dy)];
          if (avoidWater && (cur === T.RIVER || cur === T.CHANNEL)) continue;
          tiles[idx(x + dx, y + dy)] = T.PATH;
        }
      }
    }
  }

  function nearestWalkable(tiles, world, x, y, ctx, maxR) {
    for (var r = 0; r <= (maxR || 8); r++) {
      for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (inB(x + dx, y + dy) && walkable(world, x + dx, y + dy, ctx)) return [x + dx, y + dy];
      }
    }
    return null;
  }

  function generate(seed) {
    var terrainRng = U.mulberry32(seed ^ 0x9e37);
    var spawnRng = U.mulberry32(seed ^ 0x51f3);
    var ctxFull = { gear: { waders: true, climbing: true, stormlantern: true }, depth: 1, ropeFixed: true };
    var tiles = new Uint8Array(W * H);

    // base terrain: groves + flower patches
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var n = U.fbm(x * 0.07, y * 0.07, seed, 3);
      var m = U.fbm(x * 0.16 + 40, y * 0.16, seed + 7, 2);
      if (n > 0.60 && y > 10 && y < 80) tiles[idx(x, y)] = T.GROVEFLOOR;
      else if (m > 0.68) tiles[idx(x, y)] = T.FLOWERS;
    }
    // trees on grove floor (solid, walk between)
    for (var ty = 8; ty < 90; ty++) for (var tx = 2; tx < W - 2; tx++) {
      if (tiles[idx(tx, ty)] === T.GROVEFLOOR && U.hash2(tx, ty, seed + 99) > 0.82) tiles[idx(tx, ty)] = T.TREE;
    }

    // river: winding N-S band
    var phase = terrainRng() * 6.28, riverX = [];
    for (var ry = 0; ry < H; ry++) {
      var cx = 46 + Math.round(6 * Math.sin(ry * 0.06 + phase) + 8 * (U.fbm(3.3, ry * 0.05, seed + 55, 2) - 0.5));
      riverX[ry] = cx;
      for (var wdt = -2; wdt <= 2; wdt++) {
        var rt = Math.abs(wdt) <= 1 ? T.RIVER : (terrainRng() < 0.6 ? T.RIVER : T.REED);
        stamp(tiles, cx + wdt, ry, rt);
      }
    }
    // storm narrows (depth 3 in storm; never on critical path — placed off-trail)
    var narrows = [];
    for (var ni = 0; ni < 3; ni++) {
      var ny = [20, 55, 84][ni], nx = riverX[ny] + (ni % 2 ? 6 : -6);
      narrows.push({ x: nx, y: ny });
    }

    // R1 brook (E-W) with broken bridge
    var brookY = 86;
    for (var bxx = 12; bxx <= 32; bxx++) stamp(tiles, bxx, brookY, T.RIVER);
    var brookBridge = { x: 22, y: brookY, tiles: [] };
    for (var bbx = 20; bbx <= 24; bbx++) { stamp(tiles, bbx, brookY, T.BROKENBRIDGE); brookBridge.tiles.push([bbx, brookY]); }
    var r1planks = [];
    for (var pi = 0; pi < 3; pi++) {
      var px = 15 + Math.floor(spawnRng() * 14), py = brookY + 2 + Math.floor(spawnRng() * 4);
      var pp = nearestWalkable(tiles, { tiles: tiles }, px, py, ctxFull, 8);
      if (pp) r1planks.push({ x: pp[0], y: pp[1], taken: false });
    }

    // trail anchors south -> north (seeded jitter)
    var jr = function () { return Math.floor((terrainRng() - 0.5) * 6); };
    var anchors = [
      [24 + jr(), 93], [20 + jr(), 89], [26 + jr(), 84], [30 + jr(), 80],
      [28 + jr(), 75], [32 + jr(), 70], [34 + jr(), 65], [36 + jr(), 61],
      [38 + jr(), 57], [40 + jr(), 53]
    ];
    // R3 river crossing at row 50
    var crossY = 50, crossX = riverX[crossY];
    anchors.push([crossX - 6, crossY], [crossX, crossY], [crossX + 6, crossY]);
    anchors.push([crossX + 10 + jr(), 46], [62 + jr(), 42]);
    anchors.push([64 + jr(), 38], [66 + jr(), 33], [68 + jr(), 29]);
    anchors.push([70 + jr(), 24], [72 + jr(), 20], [76 + jr(), 16], [78, 13], [80, 12], [84, 9]);
    carvePath(tiles, anchors, true);

    // R3 bridge over river (broken until Vipul's quest)
    var bridgeR3 = { x: crossX, y: crossY, tiles: [] };
    for (var gx = -3; gx <= 3; gx++) { stamp(tiles, crossX + gx, crossY, T.BROKENBRIDGE); bridgeR3.tiles.push([crossX + gx, crossY]); }
    // bonus ford south of bridge
    var fordY = crossY + 8, fordX = riverX[fordY];
    for (var fdx = -2; fdx <= 2; fdx++) stamp(tiles, fordX + fdx, fordY, T.FORD);
    var ford = { x: fordX, y: fordY };

    // R4 hollow: FULL-WIDTH dark band (y 30-40) gated by storm-lantern.
    // The river sinks beneath the hollow here; the only way through is the dark trail.
    var hollow = { x0: 0, x1: 95, y0: 30, y1: 40, mouthX: 63, mouthY: 40 };
    for (var hxx = hollow.x0; hxx <= hollow.x1; hxx++) for (var hyy = hollow.y0; hyy <= hollow.y1; hyy++) {
      tiles[idx(hxx, hyy)] = T.HOLLOWDARK;
    }

    // R5 cliffs: FULL-WIDTH wall (y 14-26); the river falls as a cascade at its foot.
    // Only the carved cliff-path (stamped below) lets anyone through — with a climbing kit.
    var cliffBand = { x0: 0, x1: 95, y0: 14, y1: 26 };
    for (var cbx = cliffBand.x0; cbx <= cliffBand.x1; cbx++) for (var cby = cliffBand.y0; cby <= cliffBand.y1; cby++) {
      tiles[idx(cbx, cby)] = T.CLIFF;
    }
    // R5 nook: a cliff-walled pocket (x 80-95, y 6-13). The ONLY way in is
    // Shivangi's rope deck (WOOD, needs tensioning) at y=12.
    var ropeBridge = { tiles: [], x: 84, y: 12 };
    for (var nkx = 80; nkx <= 95; nkx++) for (var nky = 6; nky <= 13; nky++) tiles[idx(nkx, nky)] = T.CLIFF;
    for (var rbx = 80; rbx <= 88; rbx++) { stamp(tiles, rbx, 12, T.WOOD); ropeBridge.tiles.push([rbx, 12]); }
    for (var exx = 84; exx <= 90; exx++) for (var eyy = 8; eyy <= 11; eyy++) stamp(tiles, exx, eyy, T.STONE);
    var overlook = { x: 90, y: 8 };
    stamp(tiles, overlook.x, overlook.y, T.STONE);

    // gated-trail pass: re-carve the trail polyline through the bands.
    // (The band stamps overwrote the carved PATH, so we stamp along the
    // polyline directly: HOLLOWDARK in the hollow, CLIFFPATH in the cliffs.)
    (function () {
      for (var s = 0; s < anchors.length - 1; s++) {
        var ax = anchors[s][0], ay = anchors[s][1], bx = anchors[s + 1][0], by = anchors[s + 1][1];
        var steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2 + 1;
        for (var i = 0; i <= steps; i++) {
          var x = Math.round(ax + (bx - ax) * i / steps), y = Math.round(ay + (by - ay) * i / steps);
          for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 0; dy++) {
            var tx = x + dx, ty2 = y + dy;
            if (!inB(tx, ty2)) continue;
            if (ty2 >= hollow.y0 && ty2 <= hollow.y1) tiles[idx(tx, ty2)] = T.HOLLOWDARK;
            else if (ty2 >= cliffBand.y0 && ty2 <= cliffBand.y1) tiles[idx(tx, ty2)] = T.CLIFFPATH;
          }
        }
      }
    })();

    // towers (plaza at base)
    var towerDefs = [
      { region: 0, name: "Shepherd's Rest", near: [18, 82] },
      { region: 1, name: "Willowmarch Spire", near: [26, 64] },
      { region: 2, name: "Ferryman's Light", near: [crossX + 8, 52] },
      { region: 3, name: "Hollowheart", near: [70, 30] },
      { region: 4, name: "The Last Light", near: [86, 9], force: [86, 9] }
    ];
    var towers = towerDefs.map(function (td, i) {
      var p = td.force || nearestWalkable(tiles, { tiles: tiles }, td.near[0], td.near[1], ctxFull, 12) || td.near;
      stamp(tiles, p[0], p[1], T.STONE);
      return { id: i + 1, name: td.name, x: p[0], y: p[1], region: td.region, lit: false };
    });

    // villagers
    var hutSpots = [[20, 90], [28, 82], [32, 70], [crossX + 10, 48], [68, 28]];
    var villagers = VILLAGERS.map(function (v, i) {
      var p = nearestWalkable(tiles, { tiles: tiles }, hutSpots[i][0], hutSpots[i][1], ctxFull, 10) || hutSpots[i];
      return { id: v.id, name: v.name, role: v.role, region: v.region, x: p[0], y: p[1] };
    });

    // ---- puzzles ----
    // P1 boulders: R1 one-step, R2 two-step
    function boulderPuzzle(bx, by, sdx, sdy) {
      // pad 5x5 around (bx,by); socket at (bx+sdx, by+sdy)
      return { x: bx, y: by, sx: bx + sdx, sy: by + sdy, solved: false };
    }
    var boulders = [
      Object.assign({ id: "b1" }, boulderPuzzle(30, 79, 2, 0)),
      Object.assign({ id: "b2" }, boulderPuzzle(33, 66, 1, 1))
    ];
    // mark boulder tiles stone pad
    boulders.forEach(function (b) {
      for (var dx = -2; dx <= 2; dx++) for (var dy = -2; dy <= 2; dy++) {
        if (tiles[idx(b.x + dx, b.y + dy)] !== T.PATH) stamp(tiles, b.x + dx, b.y + dy, T.STONE);
      }
    });

    // P2 water channels: R2 (3 sluices), R5 (5 sluices). Solution by construction.
    function channelPuzzle(sx, sy, n, seedSalt) {
      var r = U.mulberry32(seed ^ seedSalt);
      var sluices = [];
      for (var i = 0; i < n; i++) {
        var sol = Math.floor(r() * 4), ori = Math.floor(r() * 4);
        if (ori === sol) ori = (ori + 1) % 4;
        sluices.push({ x: sx + i * 2, y: sy, ori: ori, sol: sol });
        stamp(tiles, sx + i * 2, sy, T.CHANNEL);
      }
      stamp(tiles, sx - 2, sy, T.CHANNEL); // spring
      stamp(tiles, sx + n * 2, sy, T.CHANNEL); // wheel
      return { spring: { x: sx - 2, y: sy }, wheel: { x: sx + n * 2, y: sy }, sluices: sluices, solved: false };
    }
    var channels = [
      Object.assign({ id: "chR2" }, channelPuzzle(28, 72, 3, 0xC2)),
      Object.assign({ id: "chR5" }, channelPuzzle(60, 28, 5, 0xC5))
    ];

    // P3 mirrors: forward-sim construction guarantees a solution.
    var DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    function traceBeam(src, emitDir, mirrors) {
      var x = src.x, y = src.y, d = emitDir, guard = 0;
      var segs = [];
      while (guard++ < 60) {
        var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        if (!inB(nx, ny)) break;
        segs.push([x, y, nx, ny]);
        var hit = null;
        for (var i = 0; i < mirrors.length; i++) if (mirrors[i].x === nx && mirrors[i].y === ny) hit = mirrors[i];
        x = nx; y = ny;
        if (hit) d = (((2 * hit.ori - d) % 8) + 8) % 8;
      }
      return { end: [x, y], segs: segs };
    }
    function mirrorPuzzle(sx, sy, emitDir, n, seedSalt) {
      var r = U.mulberry32(seed ^ seedSalt);
      for (var attempt = 0; attempt < 40; attempt++) {
        var mirrors = [], x = sx, y = sy, d = emitDir, ok = true;
        for (var i = 0; i < n; i++) {
          // step 3-5 tiles forward, then turn
          var steps = 3 + Math.floor(r() * 3);
          for (var s = 0; s < steps; s++) { x += DIRS[d][0]; y += DIRS[d][1]; }
          if (!inB(x, y) || x < 4 || y < 4 || x > W - 5 || y > H - 5) { ok = false; break; }
          var ori = Math.floor(r() * 8);
          mirrors.push({ x: x, y: y, ori: ori, sol: ori });
          d = (((2 * ori - d) % 8) + 8) % 8;
          if (d % 2 === 1) { /* diagonal ok */ }
        }
        if (!ok) continue;
        // dish at beam end
        var tr = traceBeam({ x: sx, y: sy }, emitDir, mirrors);
        var dish = { x: tr.end[0], y: tr.end[1] };
        if (!inB(dish.x, dish.y)) continue;
        // every mirror must be standable-adjacent (within 2 tiles of a walkable tile)
        var ctxM = { gear: { waders: true, climbing: true, stormlantern: true }, depth: 1, ropeFixed: true };
        var allOk = mirrors.every(function (m) {
          for (var ay = -2; ay <= 2; ay++) for (var ax = -2; ax <= 2; ax++) {
            if (walkable({ tiles: tiles }, m.x + ax, m.y + ay, ctxM)) return true;
          }
          return false;
        });
        if (!allOk) continue;
        // randomize starting orientations
        mirrors.forEach(function (m) { var o = Math.floor(r() * 8); m.ori = (o === m.sol) ? (o + 1) % 8 : o; });
        // verify solver can find it (it will: sol is known)
        return { src: { x: sx, y: sy }, emitDir: emitDir, mirrors: mirrors, dish: dish, solved: false, trace: traceBeam };
      }
      return null;
    }
    var mirrorsR3 = mirrorPuzzle(crossX - 12, 54, 0, 2, 0x33);
    var mirrorsR5 = mirrorPuzzle(58, 28, 0, 3, 0x35);
    // R4 lantern mirror: single mirror, source = marked circle (player stands with lantern at night)
    var lanternCircle = nearestWalkable(tiles, { tiles: tiles }, 66, 34, ctxFull, 8) || [66, 34];
    var mirrorsR4 = mirrorPuzzle(lanternCircle[0], lanternCircle[1], 0, 1, 0x34);
    // tower dish markers (flavor): receivers near towers
    towers[2].dish = mirrorsR3 ? mirrorsR3.dish : null;
    towers[3].dish = mirrorsR4 ? mirrorsR4.dish : null;
    towers[4].dish = mirrorsR5 ? mirrorsR5.dish : null;

    // ---- scatter: flora / fauna / echoes / vistas / quest spots ----
    function scatter(regionId, count, avoidHollowDark) {
      var out = [], guard = 0, rg = REGIONS[regionId];
      while (out.length < count && guard++ < 500) {
        var x = 4 + Math.floor(spawnRng() * (W - 8));
        var y = rg.r0 + Math.floor(spawnRng() * (rg.r1 - rg.r0));
        var t = tiles[idx(x, y)];
        if (t === T.RIVER || t === T.CLIFF || t === T.TREE || t === T.CHANNEL) continue;
        if (avoidHollowDark && t === T.HOLLOWDARK) continue;
        var p = nearestWalkable(tiles, { tiles: tiles }, x, y, ctxFull, 3);
        if (!p) continue;
        // keep off the trail center
        out.push({ x: p[0], y: p[1] });
      }
      return out;
    }
    var flora = [];
    FLORA.forEach(function (f, fi) {
      var regions = f.night ? [1, 2, 3] : [fi % 5, (fi + 2) % 5];
      var spots = [];
      regions.forEach(function (rg) { spots = spots.concat(scatter(rg, 2, false)); });
      spots.slice(0, 4).forEach(function (s) {
        flora.push({ id: f.id + "_" + s.x + "_" + s.y, name: f.name, note: f.note, x: s.x, y: s.y, night: !!f.night, fog: !!f.fog, found: false });
      });
    });
    var fauna = [];
    FAUNA.forEach(function (f, fi) {
      var regions = f.night ? [3] : [(fi * 2) % 5, (fi * 2 + 1) % 5];
      var spots = [];
      regions.forEach(function (rg) { spots = spots.concat(scatter(rg, 2, true)); });
      spots.slice(0, 3).forEach(function (s) {
        fauna.push({ id: f.id + "_" + s.x + "_" + s.y, name: f.name, note: f.note, x: s.x, y: s.y, hx: s.x, hy: s.y, night: !!f.night, seen: false, t: spawnRng() * 10, still: 0, pose: 0 });
      });
    });
    // echoes: 5 region stones + bloom heart (night, R4)
    var echoes = [];
    for (var ei = 0; ei < 5; ei++) {
      var es = scatter(ei, 1, true)[0] || { x: 20, y: 90 - ei * 18 };
      echoes.push({ id: "echo" + (ei + 1), x: es.x, y: es.y, night: false, found: false });
    }
    var heartSpot = nearestWalkable(tiles, { tiles: tiles }, 68, 35, ctxFull, 8) || [68, 35];
    echoes.push({ id: "echo_heart", name: "The bloom heart", x: heartSpot[0], y: heartSpot[1], night: true, found: false });

    var VISTA_DEFS = [
      { name: "Dawn over the Vale", region: 0, star: "dawn" },
      { name: "Wewake's high pasture", region: 0, star: null },
      { name: "The old oak bend", region: 1, star: null },
      { name: "Meera's greenhouse glade", region: 1, star: null },
      { name: "The ferry landing", region: 2, star: null },
      { name: "River's wide turn", region: 2, star: null },
      { name: "Hollow mouth", region: 3, star: null },
      { name: "The heart-glade", region: 3, star: null },
      { name: "Storm over the Vale", region: 4, star: "storm" },
      { name: "The Five Lights", region: 4, star: "fivelights" }
    ];
    var vistas = VISTA_DEFS.map(function (vd, i) {
      var s = scatter(vd.region, 1, true)[0] || { x: 30, y: 80 - vd.region * 18 };
      return { id: "vista" + (i + 1), name: vd.name, x: s.x, y: s.y, star: vd.star, found: false, postcard: false };
    });

    // quest spots
    var cloverSpot = scatter(0, 1, true)[0] || { x: 28, y: 84 };
    var recipeSpot = nearestWalkable(tiles, { tiles: tiles }, 17, 91, ctxFull, 8) || [17, 91];
    var coils = [], logs = [];
    var ctxNoClimb = { gear: { waders: true, climbing: false, stormlantern: true }, depth: 1, ropeFixed: true };
    for (var ci = 0; ci < 3; ci++) {
      var guard2 = 0;
      while (guard2++ < 300) {
        var qx = 55 + Math.floor(spawnRng() * 26), qy = 27 + Math.floor(spawnRng() * 3);
        var t = tiles[idx(qx, qy)];
        if (t === T.RIVER || t === T.CLIFF || t === T.TREE || t === T.CHANNEL) continue;
        var qp = nearestWalkable(tiles, { tiles: tiles }, qx, qy, ctxNoClimb, 3);
        if (!qp) continue;
        coils.push({ x: qp[0], y: qp[1], taken: false });
        break;
      }
    }
    for (var li = 0; li < 3; li++) { var ls = scatter(2, 1, true)[0]; if (ls) logs.push({ x: ls.x, y: ls.y, taken: false }); }
    // gear fallbacks (DESIGN 10.5)
    var gearFallback = {
      stormlantern: nearestWalkable(tiles, { tiles: tiles }, 20, 90, ctxFull, 6) || [20, 90],
      waders: nearestWalkable(tiles, { tiles: tiles }, crossX + 10, 48, ctxFull, 6) || [crossX + 10, 48],
      climbingkit: nearestWalkable(tiles, { tiles: tiles }, 78, 15, ctxFull, 6) || [78, 15]
    };

    // deterministic weather schedule: slots of 240s; 70% hold / 30% shift
    var wstates = ["clear", "fog", "rain"];
    function weatherAt(absSec, tower2lit) {
      var slot = Math.floor(absSec / 240);
      var r = U.mulberry32((seed ^ 0xBEA7) + slot * 131);
      var seq = ["clear"];
      for (var s = 1; s <= slot; s++) {
        var rr = U.mulberry32((seed ^ 0xBEA7) + s * 131);
        var prev = seq[s - 1], cur = prev;
        if (rr() < 0.30) {
          var opts = wstates.filter(function (w) { return w !== prev; });
          cur = opts[Math.floor(rr() * opts.length)];
        }
        seq.push(cur);
      }
      var st = seq[slot];
      if (st === "rain" && r() < 0.18 && tower2lit) st = "storm";
      return st;
    }

    return {
      seed: seed, tiles: tiles, anchors: anchors,
      spawn: { x: 24, y: 93 },
      riverX: riverX, narrows: narrows, ford: ford,
      brookBridge: brookBridge, r1planks: r1planks,
      bridgeR3: bridgeR3,
      hollow: hollow, lanternCircle: lanternCircle,
      cliffBand: cliffBand, ropeBridge: ropeBridge, overlook: overlook,
      towers: towers, villagers: villagers,
      boulders: boulders, channels: channels,
      mirrorsR3: mirrorsR3, mirrorsR4: mirrorsR4, mirrorsR5: mirrorsR5,
      flora: flora, fauna: fauna, echoes: echoes, vistas: vistas,
      clover: cloverSpot, recipePage: recipeSpot, coils: coils, logs: logs,
      gearFallback: gearFallback, weatherAt: weatherAt,
      traceBeam: traceBeam, DIRS: DIRS
    };
  }

  LV.world = {
    W: W, H: H, TILE: TILE, T: T, REGIONS: REGIONS, VO_BEATS: VO_BEATS,
    FLORA: FLORA, FAUNA: FAUNA, VILLAGERS: VILLAGERS,
    generate: generate, walkable: walkable, regionAtRow: regionAtRow, idx: idx
  };
  if (typeof module !== "undefined" && module.exports) module.exports = LV.world;
})();
