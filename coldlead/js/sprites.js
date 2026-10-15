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

  // Draw portrait into ctx at (x,y) size s (square-ish, 24x28 grid).
  function drawPortrait(ctx, spec, x, y, s) {
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

  // clue-kind icons
  function drawClueIcon(ctx, kind, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    if (kind === "physical") { ctx.fillStyle = "#e8b64f"; ctx.fillRect(-s / 2, -s / 3, s, s * 0.66); ctx.fillStyle = "#7a5a1a"; ctx.fillRect(-s / 2, -s / 3, s, s * 0.2); }
    else if (kind === "testimonial") { ctx.fillStyle = "#4fd8ff"; ctx.beginPath(); ctx.arc(0, -s * 0.15, s * 0.28, 0, 7); ctx.fill(); ctx.fillRect(-s * 0.3, s * 0.05, s * 0.6, s * 0.35); }
    else { ctx.fillStyle = "#b14fff"; ctx.strokeStyle = "#b14fff"; ctx.lineWidth = 2; for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, s * (0.15 + i * 0.12), 0.4, 2.6); ctx.stroke(); } }
    ctx.restore();
  }

  globalThis.ColdLeadSprites = {
    portraitSpec: portraitSpec, drawPortrait: drawPortrait, shade: shade,
    SCENES: SCENES, drawRain: drawRain, makeRainDrops: makeRainDrops,
    drawGrain: drawGrain, drawClueIcon: drawClueIcon, neonSign: neonSign
  };
})();
