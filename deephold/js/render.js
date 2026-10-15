/* DEEPHOLD — render: canvas renderer + signature abyssal VFX.
   - depth-fog gradient + marine snow + god rays
   - bioluminescent enemy trails (pooled particles)
   - pressure-wave rings, sonar sweep transitions, hull-damage vignette + shake
   Sprites pre-rendered once to offscreen canvases. */
(function (root) {
  "use strict";
  var R = {};
  var U = root.DeepUtil, SP = root.DeepSprites;

  var VW = 960, VH = 640;
  var spriteCache = {};
  var particles = [];
  var MAXP = 420;
  var snow = [];
  var shake = { t: 0, mag: 0 };
  var sweep = null; // {t, dur} sonar sweep transition
  var flashes = [];

  function makeSprite(sp, scale) {
    var cv = document.createElement("canvas");
    cv.width = sp.w * scale; cv.height = sp.h * scale;
    var c = cv.getContext("2d");
    for (var y = 0; y < sp.h; y++) {
      var row = sp.rows[y] || "";
      for (var x = 0; x < sp.w; x++) {
        var ch = row.charAt(x);
        if (ch === "." || ch === " ") continue;
        var col = sp.pal[ch];
        if (!col || col === 0) continue;
        c.fillStyle = col;
        c.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return cv;
  }

  R.init = function () {
    for (var k in SP) {
      if (!SP.hasOwnProperty(k)) continue;
      var big = (k.indexOf("e_maw") === 0 || k.indexOf("e_dredge") === 0 || k.indexOf("e_heart") === 0);
      spriteCache[k] = makeSprite(SP[k], big ? 3 : 3);
    }
    var rng = U.mulberry32(1337);
    for (var i = 0; i < 90; i++)
      snow.push({ x: rng() * VW, y: rng() * VH, s: 0.6 + rng() * 1.6, v: 6 + rng() * 14, a: 0.08 + rng() * 0.2 });
  };

  R.sprite = function (k) { return spriteCache[k]; };

  R.towerSpriteKey = function (t) {
    var base = "t_" + t.fam + "_" + t.tier;
    if (t.tier === 3) base += t.branch;
    return spriteCache[base] ? base : "t_" + t.fam + "_1";
  };
  R.enemySpriteKey = function (e) {
    if (e.boss) return "e_" + e.fam;
    return spriteCache["e_" + e.fam] ? "e_" + e.fam : "e_drifter";
  };

  R.addShake = function (mag, dur) {
    if (R.shakeEnabled === false) return;
    shake.mag = Math.max(shake.mag, mag); shake.t = Math.max(shake.t, dur);
  };
  R.sonarSweep = function (dur) { sweep = { t: 0, dur: dur || 1.2 }; };
  R.flash = function (color, alpha) { flashes.push({ color: color, a: alpha, t: 0.35 }); };

  function spawnP(x, y, vx, vy, life, size, color, glow) {
    if (particles.length >= MAXP) particles.shift();
    particles.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, size: size, color: color, glow: !!glow });
  }
  R.burst = function (x, y, color, n, spd) {
    n = n || 14; spd = spd || 90;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random() * 0.7);
      spawnP(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.4 + Math.random() * 0.5, 1.5 + Math.random() * 2, color, true);
    }
  };
  R.trail = function (x, y, color) {
    spawnP(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 12, -14 - Math.random() * 10,
      0.7 + Math.random() * 0.5, 1.2 + Math.random() * 1.6, color, true);
  };

  function drawSprite(c, key, x, y, flip) {
    var cv = spriteCache[key];
    if (!cv) return;
    c.save();
    c.translate(Math.round(x), Math.round(y));
    if (flip) c.scale(-1, 1);
    c.drawImage(cv, -cv.width / 2, -cv.height / 2);
    c.restore();
  }
  R.drawSprite = drawSprite;

  R.render = function (c, S, ui) {
    c.save();
    // INTEGRATION: artist's Art module (assets/art.js) — animated top-down
    // sprites when present; built-in DeepSprites otherwise.
    var useArt = !!(window.Art && window.Art.get);
    var frame = Math.floor(performance.now() / 280) % 3;
    function drawTowerArt(t, x, y) {
      if (!useArt) return false;
      try {
        var nm = "tower_" + t.fam + "_t" + t.tier + (t.tier === 3 ? t.branch : "");
        var cv = window.Art.get(nm, { tier: t.tier, branch: t.branch, frame: frame });
        if (!cv) return false;
        c.drawImage(cv, Math.round(x - cv.width), Math.round(y - cv.height));
        return true;
      } catch (e) { return false; }
    }
    function drawEnemyArt(e, x, y) {
      if (!useArt) return false;
      try {
        var nm = e.boss ? "boss_" + e.fam + "_f" + frame
                        : "enemy_" + e.fam + "_f" + frame + (e.elite ? "_elite" : "");
        var cv = window.Art.get(nm, { frame: frame, elite: e.elite });
        if (!cv) return false;
        c.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height / 2));
        return true;
      } catch (e2) { return false; }
    }
    // screen shake
    if (shake.t > 0) {
      shake.t -= 1 / 60;
      var m = shake.mag * (shake.t > 0 ? 1 : 0);
      c.translate((Math.random() - 0.5) * m * 2, (Math.random() - 0.5) * m * 2);
      if (shake.t <= 0) shake.mag = 0;
    }
    // ---- depth fog background ----
    var g = c.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, "#06121f");
    g.addColorStop(0.35, "#04101c");
    g.addColorStop(0.7, "#020a14");
    g.addColorStop(1, "#01050c");
    c.fillStyle = g;
    c.fillRect(-20, -20, VW + 40, VH + 40);
    // god rays from rig lights
    c.save();
    c.globalAlpha = 0.05;
    c.fillStyle = "#9df2ff";
    for (var ri = 0; ri < 3; ri++) {
      var rx = 300 + ri * 180;
      c.beginPath();
      c.moveTo(rx - 30, 150); c.lineTo(rx + 30, 150);
      c.lineTo(rx + 90, VH); c.lineTo(rx - 90, VH);
      c.closePath(); c.fill();
    }
    c.restore();
    // marine snow
    c.fillStyle = "#cfe8ff";
    for (var si = 0; si < snow.length; si++) {
      var sn = snow[si];
      sn.y += sn.v / 60; sn.x += Math.sin(sn.y * 0.02) * 0.3;
      if (sn.y > VH) { sn.y = -4; sn.x = Math.random() * VW; }
      c.globalAlpha = sn.a;
      c.fillRect(sn.x, sn.y, sn.s, sn.s);
    }
    c.globalAlpha = 1;

    // ---- lanes ----
    c.lineWidth = 26; c.lineCap = "round";
    S.map.lanes.forEach(function (lane, li) {
      c.strokeStyle = "rgba(20,34,54,0.9)";
      c.beginPath();
      lane.pts.forEach(function (p, i) { i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); });
      c.stroke();
      c.strokeStyle = "rgba(57,230,255,0.10)";
      c.lineWidth = 10;
      c.stroke();
      c.lineWidth = 26;
    });

    // ---- vents ----
    S.map.vents.forEach(function (v) {
      drawSprite(c, "vent", v.x, v.y);
      if (!v.harvested && S.phase === "prep") {
        c.globalAlpha = 0.6 + 0.4 * Math.sin(performance.now() / 300);
        c.fillStyle = "#ffd75e";
        c.font = "bold 13px sans-serif"; c.textAlign = "center";
        c.fillText("+2 TC", v.x, v.y - 26);
        c.globalAlpha = 1;
      }
    });

    // ---- rig hull deck ----
    c.fillStyle = "#1b2338";
    c.fillRect(60, 128, 840, 46);
    c.fillStyle = "#2b3550";
    c.fillRect(60, 128, 840, 10);
    c.fillStyle = "#10162a";
    for (var hx = 80; hx < 900; hx += 40) c.fillRect(hx, 140, 18, 22);
    // hull lights
    for (var hl = 100; hl < 900; hl += 160) {
      c.fillStyle = "rgba(255,209,94," + (0.5 + 0.3 * Math.sin(performance.now() / 500 + hl)) + ")";
      c.fillRect(hl, 130, 8, 6);
    }
    // Pressure Core
    drawSprite(c, "core", 480, 108);
    c.globalAlpha = 0.35 + 0.15 * Math.sin(performance.now() / 400);
    c.strokeStyle = "#39e6ff"; c.lineWidth = 2;
    c.beginPath(); c.arc(480, 108, 44, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;

    // ---- pads ----
    S.map.pads.forEach(function (p, i) {
      var sel = ui && ui.cursorPad === i;
      drawSprite(c, sel ? "padSel" : "pad", p.x, p.y);
      if (p.mine) drawSprite(c, "mine", p.x, p.y);
    });

    // ---- towers ----
    var FAMCOLOR = { harpoon: "#ffcf4d", flak: "#ff4d5e", tesla: "#46f2cf",
      sonar: "#3fb8cf", mining: "#ff8c42", sealer: "#eaf7ff" };
    S.towers.forEach(function (t) {
      var key = R.towerSpriteKey(t);
      if (!drawTowerArt(t, t.x, t.y - 8)) drawSprite(c, key, t.x, t.y - 8);
      var fc = FAMCOLOR[t.fam]; // family identity: glow base + marker dot
      if (fc) {
        c.globalAlpha = 0.30;
        c.fillStyle = fc;
        c.beginPath(); c.ellipse(t.x, t.y + 8, 22, 8, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
        c.fillStyle = fc;
        c.beginPath(); c.arc(t.x - 20, t.y - 26, 3.2, 0, Math.PI * 2); c.fill();
      }
      if (t.overT > 0) { // overcharge glow
        c.globalAlpha = 0.5 + 0.3 * Math.sin(performance.now() / 90);
        c.strokeStyle = "#ffd75e"; c.lineWidth = 2;
        c.beginPath(); c.arc(t.x, t.y - 8, 30, 0, Math.PI * 2); c.stroke();
        c.globalAlpha = 1;
      }
      if (t.disabled) {
        c.fillStyle = "rgba(255,60,60,0.75)";
        c.font = "bold 16px sans-serif"; c.textAlign = "center";
        c.fillText("✕", t.x, t.y - 26);
      } else if (t.hp < t.maxHp) {
        c.fillStyle = "#0a0e1a"; c.fillRect(t.x - 16, t.y - 34, 32, 4);
        c.fillStyle = t.hp < t.maxHp * 0.5 ? "#ff4d5e" : "#7dff6a";
        c.fillRect(t.x - 16, t.y - 34, 32 * t.hp / t.maxHp, 4);
      }
      if (t.overCD <= 0 && (t.fam === "harpoon" || t.fam === "flak" || t.fam === "tesla" || t.fam === "sonar" || t.fam === "mining" || t.fam === "sealer")) {
        // overcharge-ready pip
        c.fillStyle = "#ffd75e";
        c.beginPath(); c.arc(t.x + 20, t.y - 26, 3.5, 0, Math.PI * 2); c.fill();
      }
      if (ui && ui.selectedPad === t.pad) {
        c.strokeStyle = "#ffd75e"; c.lineWidth = 2;
        c.strokeRect(t.x - 26, t.y - 40, 52, 56);
      }
    });

    // ---- enemies + biolum trails ----
    var DS = root.DeepSim;
    S.enemies.forEach(function (e) {
      var hidden = e.stealth && DS && !DS.isRevealed(S, e);
      if (Math.random() < 0.5 && !hidden) R.trail(e.x, e.y, e.glow);
      c.save();
      if (hidden) c.globalAlpha = 0.22;
      var pulse = 1 + 0.06 * Math.sin(performance.now() / 240 + e.id);
      c.translate(e.x, e.y); c.scale(pulse, pulse);
      if (!drawEnemyArt(e, 0, 0)) {
        var cv = spriteCache[R.enemySpriteKey(e)];
        if (cv) c.drawImage(cv, -cv.width / 2, -cv.height / 2);
      }
      // elite ring
      if (e.elite) {
        c.strokeStyle = "#ffd75e"; c.lineWidth = 2;
        c.beginPath(); c.arc(0, 0, 22, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
      // hp bar for tough enemies
      if (e.maxHp > 120 && e.hp < e.maxHp) {
        var w = e.boss ? 90 : 34;
        c.fillStyle = "#0a0e1a"; c.fillRect(e.x - w / 2, e.y - (e.boss ? 46 : 26), w, 5);
        c.fillStyle = e.boss ? "#ff2d78" : "#ff6a4d";
        c.fillRect(e.x - w / 2, e.y - (e.boss ? 46 : 26), w * Math.max(0, e.hp / e.maxHp), 5);
      }
      if (e.boss) {
        c.fillStyle = "#ffd0e2"; c.font = "bold 13px sans-serif"; c.textAlign = "center";
        c.fillText(e.name.toUpperCase(), e.x, e.y - 54);
      }
    });

    // ---- tracers ----
    for (var ti = S.tracers.length - 1; ti >= 0; ti--) {
      var tr = S.tracers[ti];
      tr.life -= 1 / 60;
      if (tr.life <= 0) { S.tracers.splice(ti, 1); continue; }
      c.globalAlpha = Math.min(1, tr.life * 8);
      c.strokeStyle = tr.color; c.lineWidth = 2;
      c.beginPath(); c.moveTo(tr.x1, tr.y1); c.lineTo(tr.x2, tr.y2); c.stroke();
    }
    c.globalAlpha = 1;

    // ---- particles ----
    for (var pi = particles.length - 1; pi >= 0; pi--) {
      var p = particles[pi];
      p.life -= 1 / 60;
      if (p.life <= 0) { particles.splice(pi, 1); continue; }
      p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 8 / 60;
      c.globalAlpha = p.life / p.max * 0.9;
      c.fillStyle = p.color;
      if (p.glow) { c.shadowColor = p.color; c.shadowBlur = 8; }
      c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      c.shadowBlur = 0;
    }
    c.globalAlpha = 1;

    // ---- pressure rings ----
    for (var gi = S.rings.length - 1; gi >= 0; gi--) {
      var gr = S.rings[gi];
      gr.life -= 1 / 60;
      if (gr.life <= 0) { S.rings.splice(gi, 1); continue; }
      var t = 1 - gr.life / 0.6;
      var rr = gr.r + (gr.max - gr.r) * t;
      c.globalAlpha = (1 - t) * 0.8;
      c.strokeStyle = gr.color; c.lineWidth = 3;
      c.beginPath(); c.arc(gr.x, gr.y, rr, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = (1 - t) * 0.4;
      c.lineWidth = 8;
      c.beginPath(); c.arc(gr.x, gr.y, rr * 0.85, 0, Math.PI * 2); c.stroke();
    }
    c.globalAlpha = 1;

    // ---- Heart telegraphed strikes (§4.4) ----
    (S.strikes || []).forEach(function (sk) {
      var a = 0.35 + 0.3 * Math.sin(performance.now() / 150);
      c.strokeStyle = "rgba(255,45,120," + a.toFixed(2) + ")";
      c.lineWidth = 3;
      c.beginPath(); c.arc(sk.x, sk.y, 60, 0, Math.PI * 2); c.stroke();
      c.fillStyle = "rgba(255,45,120," + (a * 0.5).toFixed(2) + ")";
      c.font = "bold 13px sans-serif"; c.textAlign = "center";
      c.fillText("⚠ " + Math.ceil(sk.t) + "s", sk.x, sk.y - 70);
    });

    // ---- sonar sweep transition ----
    if (sweep) {
      sweep.t += 1 / 60;
      var st = sweep.t / sweep.dur;
      if (st >= 1) sweep = null;
      else {
        var ang = st * Math.PI * 2;
        var grd = c.createConicGradient ? c.createConicGradient(ang, 480, 320) : null;
        c.save();
        c.globalAlpha = 0.25 * (1 - st);
        if (grd) {
          grd.addColorStop(0, "#39e6ff"); grd.addColorStop(0.12, "transparent");
          grd.addColorStop(1, "transparent");
          c.fillStyle = grd;
        } else c.fillStyle = "rgba(57,230,255,0.12)";
        c.fillRect(0, 0, VW, VH);
        c.restore();
      }
    }
    // ---- flashes ----
    for (var fi = flashes.length - 1; fi >= 0; fi--) {
      var f = flashes[fi];
      f.t -= 1 / 60;
      if (f.t <= 0) { flashes.splice(fi, 1); continue; }
      c.globalAlpha = f.a * (f.t / 0.35);
      c.fillStyle = f.color;
      c.fillRect(0, 0, VW, VH);
    }
    c.globalAlpha = 1;

    // ---- hull damage vignette ----
    if (S.hull < 40 && !S.ended) {
      var va = (40 - S.hull) / 40 * (0.25 + 0.12 * Math.sin(performance.now() / 300));
      var vg = c.createRadialGradient(480, 320, 220, 480, 320, 520);
      vg.addColorStop(0, "rgba(255,30,40,0)");
      vg.addColorStop(1, "rgba(255,30,40," + va.toFixed(3) + ")");
      c.fillStyle = vg;
      c.fillRect(0, 0, VW, VH);
    }

    // ---- HUD (canvas) ----
    drawHUD(c, S, ui);
    c.restore();
  };

  // ---- ambient abyssal scene behind the title (no sim state needed) ----
  var ambMotes = null;
  R.renderAmbient = function (c) {
    var now = performance.now();
    if (!ambMotes) {
      ambMotes = [];
      var rng = U.mulberry32(4242);
      for (var i = 0; i < 26; i++)
        ambMotes.push({ x: rng() * VW, y: rng() * VH, r: 1 + rng() * 2.4,
          hue: rng(), ph: rng() * 6.28, sp: 4 + rng() * 10 });
    }
    var g = c.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, "#06121f"); g.addColorStop(0.35, "#04101c");
    g.addColorStop(0.7, "#020a14"); g.addColorStop(1, "#01050c");
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    // god rays
    c.save(); c.globalAlpha = 0.05; c.fillStyle = "#9df2ff";
    for (var ri = 0; ri < 3; ri++) {
      var rx = 300 + ri * 180;
      c.beginPath();
      c.moveTo(rx - 30, 150); c.lineTo(rx + 30, 150);
      c.lineTo(rx + 90, VH); c.lineTo(rx - 90, VH);
      c.closePath(); c.fill();
    }
    c.restore();
    // marine snow
    c.fillStyle = "#cfe8ff";
    for (var si = 0; si < snow.length; si++) {
      var sn = snow[si];
      sn.y += sn.v / 60; sn.x += Math.sin(sn.y * 0.02) * 0.3;
      if (sn.y > VH) { sn.y = -4; sn.x = Math.random() * VW; }
      c.globalAlpha = sn.a;
      c.fillRect(sn.x, sn.y, sn.s, sn.s);
    }
    c.globalAlpha = 1;
    // drifting bioluminescent motes
    for (var mi = 0; mi < ambMotes.length; mi++) {
      var m = ambMotes[mi];
      m.y -= m.sp / 60; m.x += Math.sin(now / 2400 + m.ph) * 0.25;
      if (m.y < -6) { m.y = VH + 6; m.x = Math.random() * VW; }
      var tw = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(now / 700 + m.ph));
      c.globalAlpha = tw;
      c.fillStyle = m.hue < 0.6 ? "#46f2cf" : (m.hue < 0.85 ? "#ffcf4d" : "#b46bff");
      c.beginPath(); c.arc(m.x, m.y, m.r, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    // slow sonar sweep
    var cyc = (now / 9000) % 1;
    var ang = cyc * Math.PI * 2;
    c.save();
    c.globalAlpha = 0.10 * (1 - cyc);
    if (c.createConicGradient) {
      var grd = c.createConicGradient(ang, 480, 320);
      grd.addColorStop(0, "#39e6ff"); grd.addColorStop(0.10, "transparent");
      grd.addColorStop(1, "transparent");
      c.fillStyle = grd;
    } else c.fillStyle = "rgba(57,230,255,0.06)";
    c.fillRect(0, 0, VW, VH);
    c.restore();
    c.globalAlpha = 1;
  };

  function bar(c, x, y, w, h, frac, col, bg) {
    c.fillStyle = bg || "#0a0e1a";
    c.fillRect(x, y, w, h);
    c.fillStyle = col;
    c.fillRect(x, y, w * U.clamp(frac, 0, 1), h);
    c.strokeStyle = "rgba(255,255,255,0.25)"; c.lineWidth = 1;
    c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function drawHUD(c, S, ui) {
    // top bar
    c.fillStyle = "rgba(4,10,18,0.82)";
    c.fillRect(0, 0, VW, 34);
    c.fillStyle = "#cfe8ff"; c.font = "bold 13px sans-serif"; c.textAlign = "left";
    c.fillText("HULL", 12, 22);
    bar(c, 58, 11, 150, 13, S.hull / S.maxHull, S.hull > 50 ? "#7dff6a" : S.hull > 25 ? "#ffd75e" : "#ff4d5e");
    c.fillStyle = "#cfe8ff";
    c.fillText(Math.ceil(S.hull) + "/" + S.maxHull, 212, 22);
    c.fillStyle = "#ffd75e";
    c.fillText("⬢ " + U.fmt(S.cells), 300, 22);
    c.fillStyle = "#39e6ff";
    c.fillText("◈ " + Math.floor(S.coreCharge), 400, 22);
    c.fillStyle = "#cfe8ff";
    var wv = S.phase === "prep" ? S.wave + 1 : Math.max(1, S.wave);
    c.fillText("WAVE " + wv + "/30", 500, 22);
    c.fillStyle = "#5a6f9e"; c.font = "11px sans-serif";
    c.fillText("seed " + S.seed, 600, 22);
    // §7.2 power sectors: overdrive highlighted
    c.font = "bold 11px sans-serif"; c.textAlign = "center";
    var secs = [["west", "W", 690], ["central", "C", 736], ["east", "E", 782]];
    secs.forEach(function (s) {
      var od = S.overdrive === s[0];
      c.fillStyle = od ? "#ffd75e" : "#5a6f9e";
      c.fillText(s[1] + (od ? "▲" : ""), s[2], 22);
    });
    if (S.deepPingT > 0) { c.fillStyle = "#39e6ff"; c.fillText("PING", 830, 22); }
    if (S.strikeT > 0) { c.fillStyle = "#ffd75e"; c.fillText("3x$", 868, 22); }
    c.textAlign = "left";
    // phase banner
    if (S.phase === "prep") {
      c.fillStyle = "#39e6ff"; c.font = "bold 13px sans-serif";
      c.fillText("◈ SURVEY — build (1-6), harvest vents, [B]ank, [S]tart wave" +
        (root.DeepSim && root.DeepSim.canMine(S) ? "" : " · mines need Demolitions"), 12, 52);
    } else if (S.phase === "combat") {
      c.fillStyle = "#ff9a3c"; c.font = "bold 13px sans-serif";
      var alive = S.enemies.length, left = S.spawnQueue.reduce(function (a, b) { return a + b.units.length; }, 0) + S.backlog.length;
      c.fillText("◈ SIEGE — hostiles: " + alive + " | incoming: " + left +
        (S.surgeCD <= 0 ? " | [G] surge ready" : "") +
        " | overdrive: [Q]west [W]central [E]east", 12, 52);
    }
    // selected tower info line
    if (ui && ui.selectedPad != null) {
      var p = S.map.pads[ui.selectedPad];
      if (p && p.tower) {
        var t = p.tower;
        var D2 = root.DeepSim.TOWER_DEFS[t.fam];
        c.fillStyle = "rgba(4,10,18,0.85)";
        c.fillRect(10, VH - 66, 560, 56);
        c.fillStyle = "#ffd75e"; c.font = "bold 13px sans-serif";
        var nm = towerName(t);
        c.fillText(nm + "  [O]vercharge " + (t.overCD > 0 ? Math.ceil(t.overCD) + "s" : "READY") +
          "  [U]pgrade  [X]sell  [T]arget:" + t.targetMode, 20, VH - 44);
        c.fillStyle = "#8fa3d4"; c.font = "12px sans-serif";
        c.fillText(t.hp + "/" + t.maxHp + " HP · " + D2.over.name + ": " + D2.over.desc +
          " · sector " + t.sector, 20, VH - 24);
      } else if (p && p.mine) {
        c.fillStyle = "rgba(4,10,18,0.85)";
        c.fillRect(10, VH - 66, 400, 56);
        c.fillStyle = "#ff6a4d"; c.font = "bold 13px sans-serif";
        c.fillText("Armed mine — [SPACE] detonate (150 dmg)", 20, VH - 40);
      } else if (p && !p.tower) {
        c.fillStyle = "rgba(4,10,18,0.85)";
        c.fillRect(10, VH - 66, 460, 56);
        c.fillStyle = "#39e6ff"; c.font = "bold 13px sans-serif";
        c.fillText("Empty pad — [1-6] build · [I] mine (40 TC" +
          (root.DeepSim && root.DeepSim.canMine(S) ? "" : ", needs Demolitions") + ")", 20, VH - 44);
        c.fillStyle = "#8fa3d4"; c.font = "12px sans-serif";
        c.fillText("1 Harpoon(50) 2 Flak(70) 3 Tesla(80) 4 Sonar(60) 5 Mining(60) 6 Sealer(50)", 20, VH - 24);
      }
    }
    // cursor hint
    if (ui && ui.cursorPad != null && S.phase !== "ended") {
      var cp = S.map.pads[ui.cursorPad];
      if (cp) {
        c.strokeStyle = "rgba(255,215,94,0.8)"; c.lineWidth = 2;
        c.strokeRect(cp.x - 24, cp.y - 30, 48, 44);
      }
    }
  }

  function towerName(t) {
    var D = root.DeepSim.TOWER_DEFS[t.fam];
    if (t.tier < 3) return D.name + " T" + t.tier;
    return D.tiers[2][t.branch].name;
  }
  R.towerName = towerName;

  R.shakeEnabled = true;
  root.DeepRender = R;
})(typeof self !== "undefined" ? self : this);
