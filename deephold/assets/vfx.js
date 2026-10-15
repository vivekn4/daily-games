/* ============================================================================
 * DEEPHOLD — vfx.js
 * Signature "abyssal" VFX identity: bioluminescent particle trails, pressure-
 * wave distortion rings, depth-fog gradient, sonar sweep transitions, plus
 * canvas shader passes (vignette, animated grain, glow bloom) and screen
 * shake. Vanilla JS, no dependencies. Works on the game's main 2D context.
 *
 * Usage:
 *   VFX.init(W, H)                 — once, with canvas size
 *   VFX.resize(W, H)               — on canvas resize
 *   VFX.update(dt)                 — call each frame (dt in seconds)
 *   VFX.renderBase(ctx)            — call AFTER world render, BEFORE shader
 *                                    passes: draws particles, rings, floaters
 *   VFX.shaderPass(ctx)            — call LAST: vignette + grain + glow
 *                                    (needs the canvas itself; see below)
 *   Spawners: VFX.trail(x,y,color), VFX.ring(x,y,color,maxR), VFX.sonar(x,y),
 *             VFX.explosion(x,y), VFX.bubbles(x,y,n), VFX.floater(x,y,text,c),
 *             VFX.flash(color,alpha), VFX.shake(mag), VFX.overcharge(x,y),
 *             VFX.reveal(x,y)      — lurker sonar-reveal ping
 * Shader pass requires the game to render the scene to an offscreen canvas
 * and then VFX.shaderPass(mainCtx, sceneCanvas) composites it with effects.
 * ========================================================================== */
(function (global) {
  'use strict';

  var W = 960, H = 640;
  var particles = [], rings = [], floaters = [], sweeps = [];
  var shakeT = 0, shakeMag = 0, flashA = 0, flashColor = '#46f2cf';
  var grain = null, grainT = 0;
  var tGlobal = 0;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function init(w, h) {
    W = w; H = h;
    // pre-render 4 grain tiles (animated by cycling)
    grain = [];
    for (var t = 0; t < 4; t++) {
      var c = document.createElement('canvas');
      c.width = 160; c.height = 160;
      var x = c.getContext('2d');
      var img = x.createImageData(160, 160);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = (Math.random() * 255) | 0;
        img.data[i] = img.data[i+1] = img.data[i+2] = v;
        img.data[i+3] = 22; // subtle
      }
      x.putImageData(img, 0, 0);
      grain.push(c);
    }
  }

  /* ---------------- spawners ---------------- */
  function trail(x, y, color, n) {
    n = n || 1;
    for (var i = 0; i < n; i++) {
      particles.push({
        kind: 'dot', x: x + rnd(-3, 3), y: y + rnd(-3, 3),
        vx: rnd(-14, 14), vy: rnd(-30, -6),
        life: rnd(0.35, 0.8), age: 0, size: rnd(1.5, 3.2), color: color || '#46f2cf'
      });
    }
  }
  function bubbles(x, y, n) {
    for (var i = 0; i < (n || 8); i++) {
      particles.push({
        kind: 'bubble', x: x + rnd(-8, 8), y: y + rnd(-4, 4),
        vx: rnd(-8, 8), vy: rnd(-46, -20),
        life: rnd(0.6, 1.4), age: 0, size: rnd(1.5, 4), color: 'rgba(159,179,200,0.5)'
      });
    }
  }
  function explosion(x, y, color) {
    color = color || '#46f2cf';
    for (var i = 0; i < 26; i++) {
      var a = rnd(0, Math.PI * 2), sp = rnd(40, 200);
      particles.push({
        kind: 'dot', x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rnd(0.3, 0.9), age: 0, size: rnd(1.5, 4), color: color
      });
    }
    ring(x, y, color, 70);
    bubbles(x, y, 10);
    shake(Math.min(7, 2 + 0));
  }
  function ring(x, y, color, maxR) {
    rings.push({ x: x, y: y, color: color || '#46f2cf', r: 4, maxR: maxR || 60,
                 age: 0, life: 0.55, width: 3 });
  }
  function sonar(x, y) { // sonar sweep transition: expanding double ring
    sweeps.push({ x: x, y: y, r: 10, maxR: Math.max(W, H) * 0.75, age: 0, life: 1.1 });
  }
  function reveal(x, y) { // lurker sonar-reveal ping (violet)
    rings.push({ x: x, y: y, color: '#b46bff', r: 6, maxR: 46, age: 0, life: 0.7, width: 2 });
    trail(x, y, '#b46bff', 6);
  }
  function overcharge(x, y) {
    ring(x, y, '#ffcf4d', 56);
    for (var i = 0; i < 14; i++) trail(x + rnd(-10, 10), y + rnd(-10, 10), '#ffcf4d');
    flash('#ffcf4d', 0.10);
  }
  function floater(x, y, text, color) {
    floaters.push({ x: x, y: y, text: text, color: color || '#eaf7ff', age: 0, life: 1.1 });
  }
  function flash(color, alpha) { flashColor = color; flashA = Math.max(flashA, alpha); }
  function shake(mag) { shakeMag = Math.max(shakeMag, mag); shakeT = 0.35; }

  /* ---------------- update ---------------- */
  function update(dt) {
    tGlobal += dt;
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.age += dt;
      if (p.age >= p.life) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= (1 - 1.6 * dt); p.vy *= (1 - 1.2 * dt);
      if (p.kind === 'bubble') p.vy -= 30 * dt;
    }
    for (var j = rings.length - 1; j >= 0; j--) {
      var r = rings[j];
      r.age += dt;
      if (r.age >= r.life) { rings.splice(j, 1); continue; }
      var k = r.age / r.life;
      r.r = 4 + (r.maxR - 4) * (1 - Math.pow(1 - k, 3)); // ease-out
    }
    for (var s = sweeps.length - 1; s >= 0; s--) {
      var sw = sweeps[s];
      sw.age += dt;
      if (sw.age >= sw.life) { sweeps.splice(s, 1); continue; }
      sw.r = 10 + (sw.maxR - 10) * (sw.age / sw.life);
    }
    for (var f = floaters.length - 1; f >= 0; f--) {
      var fl = floaters[f];
      fl.age += dt;
      if (fl.age >= fl.life) floaters.splice(f, 1);
    }
    if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeMag = 0; }
    if (flashA > 0) flashA = Math.max(0, flashA - dt * 0.9);
    grainT += dt;
  }

  /* ---------------- base render (additive glows) ---------------- */
  function renderBase(ctx) {
    ctx.save();
    // screen shake offset
    if (shakeMag > 0) {
      var m = shakeMag * (shakeT / 0.35);
      ctx.translate(rnd(-m, m), rnd(-m, m));
    }
    ctx.globalCompositeOperation = 'lighter';
    // particles
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i], k = 1 - p.age / p.life;
      ctx.globalAlpha = k;
      if (p.kind === 'bubble') {
        ctx.strokeStyle = p.color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.2832); ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    // pressure rings
    for (var j = 0; j < rings.length; j++) {
      var r = rings[j], rk = 1 - r.age / r.life;
      ctx.globalAlpha = rk * 0.9;
      ctx.strokeStyle = r.color; ctx.lineWidth = r.width * rk + 0.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.2832); ctx.stroke();
      // inner echo ring — the "pressure-wave distortion" signature
      ctx.globalAlpha = rk * 0.35;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 0.72, 0, 6.2832); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // sonar sweeps (screen transition)
    for (var s = 0; s < sweeps.length; s++) {
      var sw = sweeps[s], sk = sw.age / sw.life;
      var g2 = ctx.createRadialGradient(sw.x, sw.y, sw.r * 0.7, sw.x, sw.y, sw.r);
      g2.addColorStop(0, 'rgba(70,242,207,0)');
      g2.addColorStop(0.85, 'rgba(70,242,207,' + (0.28 * (1 - sk)) + ')');
      g2.addColorStop(1, 'rgba(70,242,207,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(70,242,207,' + (0.8 * (1 - sk)) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, 6.2832); ctx.stroke();
    }
    // damage floaters
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px monospace';
    for (var f = 0; f < floaters.length; f++) {
      var fl = floaters[f], fk = 1 - fl.age / fl.life;
      ctx.globalAlpha = fk;
      ctx.fillStyle = fl.color;
      ctx.fillText(fl.text, fl.x, fl.y - fl.age * 34);
    }
    ctx.globalAlpha = 1;
    // full-screen flash
    if (flashA > 0) {
      ctx.globalAlpha = flashA;
      ctx.fillStyle = flashColor;
      ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* ---------------- shader pass: vignette + grain + glow bloom ---------------- */
  // Call LAST each frame: composites the finished scene (drawn to an
  // offscreen canvas by the game) onto the visible canvas with the
  // signature abyssal grade.
  function shaderPass(mainCtx, scene) {
    mainCtx.save();
    mainCtx.imageSmoothingEnabled = false;
    mainCtx.drawImage(scene, 0, 0);
    // glow bloom: cheap two-pass — draw bright areas additively at low alpha
    mainCtx.save();
    mainCtx.globalCompositeOperation = 'lighter';
    mainCtx.globalAlpha = 0.16;
    mainCtx.drawImage(scene, -2, -2, W + 4, H + 4);
    mainCtx.globalAlpha = 0.10;
    mainCtx.drawImage(scene, 2, 2, W - 4, H - 4);
    mainCtx.restore();
    // vignette — the "looking down into the trench" frame
    var vg = mainCtx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.36, W/2, H/2, Math.max(W,H)*0.72);
    vg.addColorStop(0, 'rgba(2,6,12,0)');
    vg.addColorStop(1, 'rgba(2,6,12,0.55)');
    mainCtx.fillStyle = vg;
    mainCtx.fillRect(0, 0, W, H);
    // depth-fog top light: faint cyan wash from the rig lights
    var fog = mainCtx.createLinearGradient(0, 0, 0, H * 0.5);
    fog.addColorStop(0, 'rgba(70,242,207,0.05)');
    fog.addColorStop(1, 'rgba(70,242,207,0)');
    mainCtx.fillStyle = fog;
    mainCtx.fillRect(0, 0, W, H * 0.5);
    // animated grain (cycles 4 tiles, tiled)
    if (grain) {
      var tile = grain[Math.floor(grainT * 12) % 4];
      mainCtx.save();
      mainCtx.globalAlpha = 0.5;
      var pat = mainCtx.createPattern(tile, 'repeat');
      mainCtx.fillStyle = pat;
      mainCtx.fillRect(0, 0, W, H);
      mainCtx.restore();
    }
    mainCtx.restore();
  }

  global.VFX = {
    init: init, resize: init, update: update,
    renderBase: renderBase, shaderPass: shaderPass,
    trail: trail, bubbles: bubbles, explosion: explosion,
    ring: ring, sonar: sonar, reveal: reveal, overcharge: overcharge,
    floater: floater, flash: flash, shake: shake,
    particleCount: function () { return particles.length; }
  };
})(typeof window !== 'undefined' ? window : this);
