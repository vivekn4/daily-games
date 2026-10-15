/* COLD LEAD — audio.js : original noir WebAudio sound set.
   All synthesized live. Nothing carried over from Emberdeep. Node-safe. */
"use strict";
(function () {
  var ctx = null, master = null, muted = false, rainNodes = null, musicNodes = null;

  function ac() {
    if (ctx) return ctx;
    var AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    return ctx;
  }
  function now() { return ctx ? ctx.currentTime : 0; }
  function env(g, t0, a, peak, d, sustain) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t0 + a + d);
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (muted || !ac()) return;
    var t = now(), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    env(g, t, 0.005, vol || 0.15, dur, 0.0001);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  function noiseBurst(dur, filterFreq, vol, type) {
    if (muted || !ac()) return;
    var t = now(), len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = type || "bandpass"; f.frequency.value = filterFreq;
    var g = ctx.createGain(); env(g, t, 0.004, vol || 0.2, dur, 0.0001);
    src.connect(f); f.connect(g); g.connect(master); src.start(t);
  }

  var S = {
    init: function () { ac(); if (ctx && ctx.state === "suspended") ctx.resume(); },
    setMuted: function (m) { muted = m; if (m) { S.stopRain(); S.stopMusic(); } },
    isMuted: function () { return muted; },

    // ---- rain ambience: looped filtered noise, soft patter ----
    startRain: function () {
      if (muted || !ac() || rainNodes) return;
      var len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900;
      var g = ctx.createGain(); g.gain.value = 0.05;
      src.connect(hp); hp.connect(g); g.connect(master); src.start();
      rainNodes = { src: src, g: g };
    },
    stopRain: function () { if (rainNodes) { try { rainNodes.src.stop(); } catch (e) {} rainNodes = null; } },

    // ---- distant thunder: low rumble swell ----
    thunder: function () {
      if (muted || !ac()) return;
      var t = now(), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(55, t);
      o.frequency.exponentialRampToValueAtTime(28, t + 1.6);
      env(g, t, 0.25, 0.28, 1.6, 0.0001);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 2.2);
      noiseBurst(1.2, 120, 0.10, "lowpass");
    },

    // ---- walking-bass jazz loop: smoky club underscore ----
    startMusic: function () {
      if (muted || !ac() || musicNodes) return;
      var bassLine = [110, 0, 130.8, 0, 98, 0, 123.5, 116.5]; // A2 C3 G2 B2...
      var step = 0, timer = null;
      function tick() {
        if (muted) return;
        var f = bassLine[step % bassLine.length]; step++;
        if (f > 0) {
          var t = now(), o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
          o.type = "triangle"; o.frequency.value = f;
          fl.type = "lowpass"; fl.frequency.value = 500;
          env(g, t, 0.01, 0.16, 0.34, 0.0001);
          o.connect(fl); fl.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5);
          if (step % 8 === 0) { // brushed ride ping
            var t2 = now(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
            o2.type = "sine"; o2.frequency.value = 3200;
            env(g2, t2, 0.002, 0.03, 0.08, 0.0001);
            o2.connect(g2); g2.connect(master); o2.start(t2); o2.stop(t2 + 0.15);
          }
        }
      }
      timer = setInterval(tick, 420);
      musicNodes = { timer: timer };
    },
    stopMusic: function () { if (musicNodes) { clearInterval(musicNodes.timer); musicNodes = null; } },

    // ---- one-shots ----
    uiMove: function () { blip(660, 0.05, "square", 0.06); },
    uiSelect: function () { blip(520, 0.07, "square", 0.10); blip(780, 0.09, "square", 0.08); },
    typeTick: function () { noiseBurst(0.03, 2400, 0.05, "highpass"); },
    flashbulb: function () { noiseBurst(0.12, 5000, 0.22, "highpass"); blip(1800, 0.05, "sine", 0.10); },
    phoneRing: function () { blip(1250, 0.16, "sine", 0.12); setTimeout(function(){blip(1250,0.16,"sine",0.12);},220); },
    paper: function () { noiseBurst(0.18, 1800, 0.10, "bandpass"); },
    footstep: function () { noiseBurst(0.07, 300, 0.10, "lowpass"); },
    siren: function () { blip(700, 1.4, "triangle", 0.05, 950); },
    heartbeat: function () { blip(58, 0.12, "sine", 0.30); setTimeout(function(){blip(52,0.14,"sine",0.26);},180); },
    sting: function () { // accusation sting
      blip(110, 0.9, "sawtooth", 0.20, 55); blip(220, 0.9, "sawtooth", 0.12, 110);
      noiseBurst(0.5, 800, 0.12, "lowpass");
    },
    dawnBell: function () { blip(880, 1.2, "sine", 0.14); blip(1320, 1.0, "sine", 0.08); },
    solved: function () { var n=[392,494,587,784]; n.forEach(function(f,i){setTimeout(function(){blip(f,0.25,"triangle",0.14);},i*140);}); },
    failed: function () { var n=[330,262,196]; n.forEach(function(f,i){setTimeout(function(){blip(f,0.3,"triangle",0.14);},i*180);}); }
  };

  globalThis.ColdLeadAudio = S;
})();
