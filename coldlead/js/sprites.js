/* COLD LEAD — sprites.js : original code-drawn noir pixel art.
   Procedural suspect portraits (seeded: no two alike), noir scene painters,
   clue icons. All original. Node-safe (drawing fns need a canvas ctx). */
"use strict";
(function () {
  var U = globalThis.ColdLeadUtil;

  var SKIN = ["#e8b98a", "#d19a6b", "#a06a42", "#7a4a2a", "#f0c8a0"];
  var HAIR = ["#1a1a1a", "#3a2a1a", "#6b4a2a", "#8a8a8a", "#c0c0c0", "#5a1a1a", "#d8b060"];
  var COAT = ["#2a2a3a", "#3a2a2a", "#1a2a3a", "#4a3a2a", "#2a3a2a", "#3a1a2a"];

  // Build a 24x28 pixel portrait spec from a seed string. Deterministic.
  function portraitSpec(seedStr) {
    var rng = U.RNG(U.hashStr(seedStr));
    return {
      skin: rng.pick(SKIN), hair: rng.pick(HAIR), coat: rng.pick(COAT),
      hairStyle: rng.int(0, 4),       // 0 flat, 1 side part, 2 slicked, 3 curly, 4 bald-ish
      eyes: rng.int(0, 2),            // 0 normal, 1 narrow, 2 heavy brow
      accessory: rng.int(0, 4),       // 0 none, 1 hat, 2 glasses, 3 earring, 4 scar
      bg: rng.pick(["#14141c", "#1c1414", "#101820", "#181420"])
    };
  }

  // ---- UPGRADED procedural portraits: 48x56 grid, noir lighting model ----
  // Deterministic per seed. Painterly female faces come from assets/faces
  // (ColdLeadAssets); this generator covers everyone else with a cohesive
  // pixel-noir look: directional key light (upper left), cyan rim light
  // (right edge), crushed shadows.
  var SKIN2 = ["#e8b98a", "#d9a06e", "#b07a4e", "#8a5a34", "#f0c8a0", "#6e4426"];
  var HAIR2 = ["#141414", "#2e2018", "#4a3220", "#6e6e6e", "#a8a8a8", "#5a1a1a", "#c89858", "#8a4a2a"];
  var COAT2 = ["#23232e", "#2e2222", "#1a2430", "#3a2e22", "#222e22", "#2e1a26", "#3a3a4a"];

  function portraitSpec(seedStr) {
    var rng = U.RNG(U.hashStr(seedStr));
    return {
      v2: true,
      skin: rng.pick(SKIN2), hair: rng.pick(HAIR2), coat: rng.pick(COAT2),
      jaw: rng.int(0, 2),          // 0 square, 1 round, 2 narrow
      hairStyle: rng.int(0, 7),    // 0 flat, 1 side part, 2 slicked, 3 curly, 4 balding, 5 bob, 6 long, 7 bun
      eyes: rng.int(0, 3),         // 0 deep-set, 1 narrow, 2 heavy brow, 3 tired bags
      nose: rng.int(0, 2),         // 0 straight, 1 broad, 2 hawk
      mouth: rng.int(0, 4),        // 0 thin, 1 full, 2 frown, 3 smirk, 4 grim
      facial: rng.int(0, 3),       // 0 none, 1 stubble, 2 mustache, 3 beard
      accessory: rng.int(0, 5),    // 0 none, 1 fedora, 2 glasses, 3 earring, 4 scar, 5 pearls
      bg: rng.pick(["#101018", "#181014", "#0e141c", "#141020", "#0c1210"]),
      rim: rng.pick(["#7fd8ff", "#ff9fd8", "#ffd88a", "#9fff9f"])
    };
  }

  function drawPortrait(ctx, spec, x, y, s) {
    if (!spec.v2) { drawPortraitLegacy(ctx, spec, x, y, s); return; }
    var px = s / 48, ox = x, oy = y;
    function R(gx, gy, gw, gh, c) { ctx.fillStyle = c; ctx.fillRect(ox + gx * px, oy + gy * px, gw * px, gh * px); }
    function sh(hex, amt) { return shade(hex, amt); }
    R(0, 0, 48, 56, spec.bg);
    var skin = spec.skin, hair = spec.hair;
    // ---- neck + shoulders/coat ----
    R(19, 42, 10, 6, sh(skin, -22));
    R(6, 46, 36, 10, spec.coat);
    R(6, 46, 36, 2, sh(spec.coat, 22));           // coat highlight top
    R(21, 46, 6, 4, "#cfcfcf");                    // shirt
    R(23, 46, 2, 10, "#5e1414");                   // tie
    R(6, 52, 36, 4, sh(spec.coat, -18));           // coat shadow
    // ---- head base ----
    var jw = [34, 30, 26][spec.jaw], jx = (48 - jw) / 2;
    R(jx, 12, jw, 30, skin);                       // face block
    // forehead key-light from upper left
    R(jx, 12, jw, 5, sh(skin, 16));
    R(jx, 12, 7, 30, sh(skin, 10));
    // shadow falloff on right side (noir)
    R(jx + jw - 8, 12, 8, 30, "rgba(8,8,16,0.42)");
    R(jx + jw - 4, 12, 4, 30, "rgba(8,8,16,0.35)");
    // jaw shaping
    if (spec.jaw === 0) { R(jx, 38, 4, 4, spec.bg); R(jx + jw - 4, 38, 4, 4, spec.bg); }
    else if (spec.jaw === 2) { R(jx, 36, 5, 6, spec.bg); R(jx + jw - 5, 36, 5, 6, spec.bg); R(jx + 5, 40, jw - 10, 2, sh(skin, -30)); }
    // ears
    R(jx - 2, 24, 2, 7, sh(skin, -28)); R(jx + jw, 24, 2, 7, sh(skin, -28));
    var ex = jx + 6, ex2 = jx + jw - 12;           // eye x positions
    // ---- eyes ----
    var ey = 24;
    function eye(exx) {
      R(exx, ey, 6, 3, "#f2ede2");                 // sclera
      R(exx + 2, ey, 3, 3, "#181410");             // iris/pupil
      R(exx + 2, ey, 1, 1, "#dfe8ff");             // catchlight
      R(exx, ey - 1, 6, 1, sh(hair, -10));         // upper lid line
    }
    eye(ex); eye(ex2);
    if (spec.eyes === 1) { R(ex, ey + 1, 6, 1, sh(skin, -8)); R(ex2, ey + 1, 6, 1, sh(skin, -8)); }  // narrow
    else if (spec.eyes === 2) { R(ex - 1, ey - 3, 8, 2, hair); R(ex2 - 1, ey - 3, 8, 2, hair); }      // heavy brow
    else if (spec.eyes === 3) { R(ex, ey + 3, 6, 1, sh(skin, -38)); R(ex2, ey + 3, 6, 1, sh(skin, -38)); } // bags
    else { R(ex - 1, ey - 2, 8, 1, sh(hair, -20)); R(ex2 - 1, ey - 2, 8, 1, sh(hair, -20)); }          // deep-set brow
    // ---- nose ----
    var nx = jx + jw / 2 - 1;
    if (spec.nose === 0) { R(nx, 28, 2, 6, sh(skin, -34)); R(nx, 33, 4, 2, sh(skin, -44)); }
    else if (spec.nose === 1) { R(nx - 1, 28, 4, 6, sh(skin, -30)); R(nx - 1, 33, 6, 2, sh(skin, -44)); }
    else { R(nx, 28, 2, 7, sh(skin, -36)); R(nx + 1, 34, 3, 2, sh(skin, -48)); }
    // ---- mouth ----
    var my = 38, mx = jx + jw / 2 - 4;
    if (spec.mouth === 0) R(mx, my, 8, 1, sh(skin, -52));
    else if (spec.mouth === 1) { R(mx - 1, my, 10, 2, "#8a4a42"); R(mx, my, 8, 1, "#a85a4e"); }
    else if (spec.mouth === 2) { R(mx, my + 1, 8, 1, sh(skin, -52)); R(mx, my, 2, 1, sh(skin, -52)); R(mx + 6, my, 2, 1, sh(skin, -52)); }
    else if (spec.mouth === 3) { R(mx, my, 8, 1, sh(skin, -52)); R(mx + 6, my - 1, 3, 1, sh(skin, -52)); }
    else { R(mx, my, 8, 2, sh(skin, -58)); }
    // ---- facial hair ----
    if (spec.facial === 1) { for (var sy = 34; sy < 42; sy += 2) R(jx + 4, sy, jw - 8, 1, "rgba(20,16,12,0.5)"); }
    else if (spec.facial === 2) { R(mx - 2, my - 3, 12, 2, sh(hair, -14)); }
    else if (spec.facial === 3) { R(jx + 4, 34, jw - 8, 8, sh(hair, -18)); R(mx, my, 8, 2, sh(skin, -52)); }
    // ---- hair ----
    var hs = spec.hairStyle;
    if (hs === 0) { R(jx - 1, 8, jw + 2, 6, hair); R(jx - 1, 12, 3, 10, hair); R(jx + jw - 2, 12, 3, 10, hair); }
    else if (hs === 1) { R(jx - 1, 8, jw + 2, 4, hair); R(jx - 1, 8, jw / 2, 7, hair); R(jx + jw - 2, 12, 3, 12, hair); }
    else if (hs === 2) { R(jx, 10, jw, 3, sh(hair, 18)); R(jx - 1, 12, 2, 6, hair); }
    else if (hs === 3) { R(jx - 3, 6, jw + 6, 7, hair); R(jx - 3, 12, 4, 8, hair); R(jx + jw - 1, 12, 4, 8, hair); R(jx + 4, 6, jw - 8, 2, sh(hair, 24)); }
    else if (hs === 4) { R(jx, 8, jw, 2, hair); R(jx - 1, 10, 3, 6, hair); R(jx + jw - 2, 10, 3, 6, hair); R(jx + 8, 12, jw - 16, 4, sh(skin, 8)); }
    else if (hs === 5) { R(jx - 2, 8, jw + 4, 6, hair); R(jx - 2, 12, 4, 18, hair); R(jx + jw - 2, 12, 4, 18, hair); }
    else if (hs === 6) { R(jx - 2, 8, jw + 4, 6, hair); R(jx - 2, 12, 4, 30, hair); R(jx + jw - 2, 12, 4, 30, hair); }
    else { R(jx - 1, 8, jw + 2, 5, hair); R(jx + jw / 2 - 4, 2, 8, 7, hair); }
    R(jx + 2, 8, jw - 4, 1, sh(hair, 30));          // hair sheen
    // ---- accessories ----
    var ac = spec.accessory;
    if (ac === 1) { R(jx - 4, 0, jw + 8, 7, "#1c1c22"); R(jx - 6, 6, jw + 12, 2, "#1c1c22"); R(jx - 4, 5, jw + 8, 2, "#3a3a44"); R(jx - 4, 2, jw + 8, 1, "rgba(140,180,220,0.35)"); }
    else if (ac === 2) { ctx.strokeStyle = "#c9cede"; ctx.lineWidth = Math.max(1.5, px); ctx.strokeRect(ox + (ex - 1) * px, oy + (ey - 2) * px, 8 * px, 6 * px); ctx.strokeRect(ox + (ex2 - 1) * px, oy + (ey - 2) * px, 8 * px, 6 * px); R(jx + jw / 2 - 1, ey, 2, 1, "#c9cede"); }
    else if (ac === 3) { R(jx + jw, 30, 2, 2, "#e8d060"); R(jx + jw, 32, 2, 3, "#a8842a"); }
    else if (ac === 4) { R(jx + jw - 12, 26, 2, 10, sh(skin, -62)); }
    else if (ac === 5) { for (var pi = 0; pi < 7; pi++) R(jx + 8 + pi * 3, 44, 2, 2, "#e8e2d2"); }
    // ---- noir rim light (right edge) ----
    ctx.fillStyle = spec.rim; ctx.globalAlpha = 0.28;
    ctx.fillRect(ox + (jx + jw) * px, oy + 8 * px, Math.max(1.5, px * 1.2), 36 * px);
    ctx.fillRect(ox + (jx - 2) * px, oy + 8 * px, Math.max(1, px * 0.7), 10 * px);
    ctx.globalAlpha = 1;
    // ---- vignette corners on portrait ----
    var vg = ctx.createRadialGradient(ox + s / 2, oy + s * 0.55, s * 0.2, ox + s / 2, oy + s * 0.55, s * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vg; ctx.fillRect(ox, oy, s, s * 56 / 48);
  }

  // Legacy 24x28 renderer (kept for any cached specs).
  function drawPortraitLegacy(ctx, spec, x, y, s) {
    var px = s / 24, ox = x, oy = y;
    function R(gx, gy, gw, gh, c) { ctx.fillStyle = c; ctx.fillRect(ox + gx * px, oy + gy * px, gw * px, gh * px); }
    R(0, 0, 24, 28, spec.bg);
    // coat / shoulders
    R(2, 20, 20, 8, spec.coat); R(9, 18, 6, 4, spec.skin);
    R(9, 20, 6, 2, "#d8d8d8"); // shirt
    R(11, 20, 2, 6, "#701818"); // tie
    // head
    R(7, 6, 10, 13, spec.skin);
    R(7, 6, 10, 2, shade(spec.skin, -18)); // forehead shadow
    // ears
    R(6, 11, 1, 3, shade(spec.skin, -25)); R(17, 11, 1, 3, shade(spec.skin, -25));
    // hair
    var h = spec.hair;
    if (spec.hairStyle === 0) { R(7, 4, 10, 3, h); R(6, 6, 1, 4, h); R(17, 6, 1, 4, h); }
    else if (spec.hairStyle === 1) { R(7, 4, 10, 2, h); R(7, 4, 5, 4, h); R(17, 6, 1, 5, h); }
    else if (spec.hairStyle === 2) { R(7, 5, 10, 2, h); }
    else if (spec.hairStyle === 3) { R(6, 4, 12, 3, h); R(6, 7, 2, 3, h); R(16, 7, 2, 3, h); }
    else { R(7, 4, 10, 1, h); R(6, 5, 2, 2, h); R(16, 5, 2, 2, h); }
    // eyes
    var ey = spec.eyes === 2 ? 11 : 10;
    R(9, ey, 2, 1, "#101010"); R(13, ey, 2, 1, "#101010");
    if (spec.eyes === 2) { R(8, 9, 4, 1, h); R(12, 9, 4, 1, h); }
    // nose + mouth
    R(11, 13, 2, 2, shade(spec.skin, -30));
    R(10, 16, 4, 1, shade(spec.skin, -45));
    // accessories
    if (spec.accessory === 1) { R(5, 1, 14, 3, "#202020"); R(4, 3, 16, 1, "#202020"); R(5, 2, 14, 1, "#404040"); }
    else if (spec.accessory === 2) { R(8, ey - 1, 4, 3, "rgba(0,0,0,0)"); ctx.strokeStyle = "#c8c8c8"; ctx.lineWidth = Math.max(1, px * 0.25); ctx.strokeRect(ox + 8 * px, oy + (ey - 1) * px, 4 * px, 3 * px); ctx.strokeRect(ox + 12 * px, oy + (ey - 1) * px, 4 * px, 3 * px); }
    else if (spec.accessory === 3) { R(17, 13, 1, 1, "#e8d060"); }
    else if (spec.accessory === 4) { R(14, 12, 1, 4, shade(spec.skin, -55)); }
    // noir rim light
    R(17, 6, 1, 13, "rgba(120,180,255,0.25)");
  }

  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, Math.min(255, (n >> 16) + amt));
    var g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    var b = Math.max(0, Math.min(255, (n & 255) + amt));
    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  }

  // ---- noir scene painters: (ctx, w, h, rng, t) ----
  function nightSky(ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#06060e"); g.addColorStop(0.7, "#0c0c1a"); g.addColorStop(1, "#141422");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  function windowGlow(ctx, x, y, w, h, color) {
    var g = ctx.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, w);
    g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(x - w, y - h, w * 3, h * 3);
  }
  function blinds(ctx, w, h, rng) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (var y = 0; y < h; y += 14) ctx.fillRect(0, y, w, 5);
  }
  function neonSign(ctx, x, y, text, color, t) {
    ctx.save();
    ctx.font = "bold 26px 'Courier New', monospace"; ctx.textAlign = "center";
    var flick = (Math.sin(t * 7 + x) > -0.92) ? 1 : 0.25;
    ctx.shadowColor = color; ctx.shadowBlur = 18 * flick;
    ctx.fillStyle = color; ctx.globalAlpha = 0.9 * flick;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  function silhouetteCity(ctx, w, h, rng) {
    ctx.fillStyle = "#080810";
    var x = 0;
    while (x < w) { var bw = 30 + rng.next() * 60, bh = 40 + rng.next() * 90; ctx.fillRect(x, h - bh, bw, bh); x += bw + 4; }
    ctx.fillStyle = "#e8d878";
    for (var i = 0; i < 40; i++) { if (rng.chance(0.5)) ctx.fillRect(rng.next() * w, h - 120 + rng.next() * 110, 3, 4); }
  }

  var SCENES = {
    club: function (ctx, w, h, rng, t) {
      nightSky(ctx, w, h);
      ctx.fillStyle = "#101018"; ctx.fillRect(0, h * 0.55, w, h * 0.45);
      // stage curtains
      ctx.fillStyle = "#4a1018";
      for (var i = 0; i < 8; i++) { var cx = (w / 8) * i; ctx.fillRect(cx, h * 0.12, w / 16, h * 0.45); }
      ctx.fillStyle = "#2a080c"; ctx.fillRect(0, h * 0.1, w, h * 0.05);
      // spotlight cone
      var g = ctx.createLinearGradient(w / 2, h * 0.15, w / 2, h * 0.8);
      g.addColorStop(0, "rgba(255,240,200,0.30)"); g.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(w / 2 - 30, h * 0.15); ctx.lineTo(w / 2 + 30, h * 0.15);
      ctx.lineTo(w / 2 + 130, h * 0.8); ctx.lineTo(w / 2 - 130, h * 0.8); ctx.fill();
      // mic silhouette
      ctx.fillStyle = "#000"; ctx.fillRect(w / 2 - 3, h * 0.42, 6, h * 0.2);
      ctx.beginPath(); ctx.arc(w / 2, h * 0.40, 12, 0, 7); ctx.fill();
      neonSign(ctx, w * 0.82, h * 0.22, "BLUE NOTE", "#ff4fd8", t);
      windowGlow(ctx, w / 2, h * 0.6, 200, 120, "rgba(255,220,160,0.25)");
    },
    theater: function (ctx, w, h, rng, t) {
      nightSky(ctx, w, h);
      ctx.fillStyle = "#1a0f0f"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#5a1a1a";
      for (var i = 0; i < 10; i++) { var cx = (w / 10) * i; ctx.fillRect(cx, 0, w / 20, h * 0.5); }
      ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, h * 0.5, w, h * 0.5);
      // footlights
      for (var j = 0; j < 12; j++) { windowGlow(ctx, (w / 12) * (j + 0.5), h * 0.52, 40, 26, "rgba(255,200,120,0.5)"); }
      // mask silhouettes
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.arc(w * 0.3, h * 0.3, 26, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(w * 0.7, h * 0.3, 26, 0, 7); ctx.fill();
      neonSign(ctx, w * 0.5, h * 0.14, "HARLOW", "#ffb14f", t);
    },
    warehouse: function (ctx, w, h, rng, t) {
      nightSky(ctx, w, h);
      ctx.fillStyle = "#12141a"; ctx.fillRect(0, h * 0.3, w, h * 0.7);
      // crates
      ctx.fillStyle = "#2e2118";
      for (var i = 0; i < 6; i++) { var cw = 70 + rng.next() * 60, ch = 60 + rng.next() * 50, cx = rng.next() * (w - cw), cy = h - ch - rng.next() * 60; ctx.fillRect(cx, cy, cw, ch); ctx.strokeStyle = "#1a120a"; ctx.strokeRect(cx, cy, cw, ch); }
      // hanging lamp cone
      var g = ctx.createLinearGradient(w * 0.6, 0, w * 0.6, h * 0.7);
      g.addColorStop(0, "rgba(255,230,170,0.35)"); g.addColorStop(1, "rgba(255,230,170,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(w * 0.6 - 12, 0); ctx.lineTo(w * 0.6 + 12, 0); ctx.lineTo(w * 0.6 + 90, h * 0.7); ctx.lineTo(w * 0.6 - 90, h * 0.7); ctx.fill();
      ctx.fillStyle = "#000"; ctx.fillRect(w * 0.6 - 14, 0, 28, 18);
      blinds(ctx, w, h, rng);
    },
    hotel: function (ctx, w, h, rng, t) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#141021"); g.addColorStop(1, "#241a30");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // art-deco panels
      ctx.strokeStyle = "#c8a84f"; ctx.lineWidth = 2;
      for (var i = 0; i < 5; i++) { var px = (w / 5) * i + 20; ctx.strokeRect(px, h * 0.15, w / 5 - 40, h * 0.5); }
      // chandelier glow
      windowGlow(ctx, w / 2, h * 0.3, 260, 160, "rgba(255,210,130,0.35)");
      ctx.fillStyle = "#c8a84f";
      for (var j = 0; j < 7; j++) { ctx.beginPath(); ctx.arc(w / 2 - 60 + j * 20, h * 0.3, 5, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, h * 0.72, w, h * 0.28);
      neonSign(ctx, w * 0.5, h * 0.1, "MERIDIAN", "#4fd8ff", t);
    },
    museum: function (ctx, w, h, rng, t) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0e1420"); g.addColorStop(1, "#1a2233");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // columns
      ctx.fillStyle = "#232c40";
      for (var i = 0; i < 4; i++) { var cx = (w / 4) * i + w / 8; ctx.fillRect(cx - 18, 0, 36, h * 0.7); ctx.fillRect(cx - 26, 0, 52, 14); }
      // display case glow
      windowGlow(ctx, w * 0.5, h * 0.62, 220, 120, "rgba(160,200,255,0.30)");
      ctx.strokeStyle = "#8a9ac0"; ctx.strokeRect(w * 0.5 - 90, h * 0.5, 180, 90);
      // statue silhouette in case
      ctx.fillStyle = "#0a0d14";
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.56, 18, 0, 7); ctx.fill();
      ctx.fillRect(w * 0.5 - 12, h * 0.58, 24, 34);
    },
    train: function (ctx, w, h, rng, t) {
      nightSky(ctx, w, h);
      silhouetteCity(ctx, w, h, rng);
      // carriage
      ctx.fillStyle = "#1c1c26"; ctx.fillRect(0, h * 0.35, w, h * 0.4);
      ctx.fillStyle = "#0a0a10"; ctx.fillRect(0, h * 0.35, w, 10);
      for (var i = 0; i < 8; i++) {
        var wx = 30 + i * ((w - 60) / 7);
        ctx.fillStyle = (i % 3 === 0) ? "#2a2a12" : "#f8e8b0";
        ctx.fillRect(wx, h * 0.42, 46, 60);
        ctx.fillStyle = "#000"; ctx.fillRect(wx, h * 0.42, 46, 8);
      }
      ctx.fillStyle = "#050508";
      for (var k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(60 + k * ((w - 120) / 5), h * 0.78, 26, 0, 7); ctx.fill(); }
      // speed lines
      ctx.strokeStyle = "rgba(160,200,255,0.25)"; ctx.lineWidth = 2;
      for (var s = 0; s < 8; s++) { var sy = rng.next() * h; ctx.beginPath(); ctx.moveTo(rng.next() * w, sy); ctx.lineTo(rng.next() * w + 120, sy); ctx.stroke(); }
      neonSign(ctx, w * 0.5, h * 0.18, "THE OWL", "#b14fff", t);
    }
  };

  // rain streaks overlay (signature VFX)
  function drawRain(ctx, w, h, drops, t) {
    ctx.save();
    ctx.strokeStyle = "rgba(170,200,255,0.35)"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      var y = (d.y + t * d.spd) % (h + 40);
      ctx.moveTo(d.x, y - 40); ctx.lineTo(d.x - 12, y);
    }
    ctx.stroke(); ctx.restore();
  }
  function makeRainDrops(rng, n, w) {
    var a = [];
    for (var i = 0; i < n; i++) a.push({ x: rng.next() * (w + 60) - 30, y: rng.next() * 700, spd: 500 + rng.next() * 500 });
    return a;
  }
  // film grain overlay
  function drawGrain(ctx, w, h, rng) {
    ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = "#fff";
    for (var i = 0; i < 60; i++) ctx.fillRect(rng.next() * w, rng.next() * h, 2, 2);
    ctx.restore();
  }

  // clue-kind icons: CC0 item sprites when loaded, drawn glyphs as fallback
  function drawClueIcon(ctx, kind, x, y, s) {
    var A = globalThis.ColdLeadAssets;
    var iconName = (A && A.iconFor) ? A.iconFor({ title: kind }) : "magnifying_glass";
    var img = A && A.get(iconName);
    if (img) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      var is = s * 1.6;
      ctx.drawImage(img, x - is / 2, y - is / 2, is, is);
      ctx.restore();
      return;
    }
    ctx.save(); ctx.translate(x, y);
    if (kind === "physical") { ctx.fillStyle = "#e8b64f"; ctx.fillRect(-s / 2, -s / 3, s, s * 0.66); ctx.fillStyle = "#7a5a1a"; ctx.fillRect(-s / 2, -s / 3, s, s * 0.2); }
    else if (kind === "testimonial") { ctx.fillStyle = "#4fd8ff"; ctx.beginPath(); ctx.arc(0, -s * 0.15, s * 0.28, 0, 7); ctx.fill(); ctx.fillRect(-s * 0.3, s * 0.05, s * 0.6, s * 0.35); }
    else { ctx.fillStyle = "#b14fff"; ctx.strokeStyle = "#b14fff"; ctx.lineWidth = 2; for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, s * (0.15 + i * 0.12), 0.4, 2.6); ctx.stroke(); } }
    ctx.restore();
  }

  // ---- unified suspect figure: painterly face for female names (CC-BY art),
  // upgraded procedural noir portrait otherwise. Deterministic per seed.
  // Draws into (x,y) with height h (faces are ~square); framed noir-style.
  function drawSuspectFigure(ctx, name, portraitSeed, x, y, h) {
    var A = globalThis.ColdLeadAssets;
    var female = A && A.isFemaleName(name);
    var faceName = (A && female) ? A.faceFor(portraitSeed) : null;
    var img = (A && faceName) ? A.get(faceName) : null;
    var w = h; // square-ish
    // frame
    ctx.save();
    ctx.fillStyle = "#08080f"; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.strokeStyle = "#3a4a6a"; ctx.lineWidth = 2; ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (img) {
      ctx.drawImage(img, x, y, w, h);
      // rim light to blend with procedural look
      ctx.fillStyle = "rgba(127,216,255,0.16)";
      ctx.fillRect(x + w - 8, y, 8, h);
    } else {
      // procedural: 48x56 grid drawn into square area (letterboxed)
      var s = w, ph = s * 56 / 48, py = y - (ph - h) / 2;
      drawPortrait(ctx, portraitSpec(portraitSeed), x, py, s);
    }
    // shared noir grade: shadow falloff + grain handled by FX pass
    var g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,8,0.38)");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.restore();
    // corner tick (case-file aesthetic)
    ctx.fillStyle = "#e8b64f";
    ctx.fillRect(x - 4, y - 4, 14, 3); ctx.fillRect(x - 4, y - 4, 3, 14);
  }

  globalThis.ColdLeadSprites = {
    portraitSpec: portraitSpec, drawPortrait: drawPortrait, drawSuspectFigure: drawSuspectFigure, shade: shade,
    SCENES: SCENES, drawRain: drawRain, makeRainDrops: makeRainDrops,
    drawGrain: drawGrain, drawClueIcon: drawClueIcon, neonSign: neonSign
  };
})();
