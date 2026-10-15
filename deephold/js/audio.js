/* DEEPHOLD — audio: 100% synthesized WebAudio palette. Unique to this game:
   sonar pings, pressure groans, hydraulic clanks, deep drones.
   Nothing shared with Emberdeep (embers) or Cold Lead (noir). */
(function (root) {
  "use strict";
  var A = {};
  var ctx = null, master = null, muted = false, ambientNodes = null;

  function ensure() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
      return true;
    } catch (e) { return false; }
  }

  A.unlock = function () {
    if (ensure() && ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
  };
  A.toggleMute = function () {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.9;
    try { localStorage.setItem("deephold_mute", muted ? "1" : "0"); } catch (e) {}
    return muted;
  };
  A.isMuted = function () { return muted; };
  try { muted = localStorage.getItem("deephold_mute") === "1"; } catch (e) {}

  function now() { return ctx.currentTime; }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function osc(type, f0, f1, t, dur, peak, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    env(g, t, 0.01, peak, dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.1);
    return o;
  }
  function noise(t, dur, peak, filterType, freq, q) {
    var len = Math.max(1, (dur + 0.05) * ctx.sampleRate) | 0;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = filterType || "lowpass";
    f.frequency.value = freq || 800; f.Q.value = q || 0.8;
    var g = ctx.createGain();
    env(g, t, 0.008, peak, dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.1);
  }
  function ready() { return ensure() && !muted; }

  // ---- signature sounds ----
  A.sonarPing = function () { // phase transitions, sonar towers
    if (!ready()) return;
    var t = now();
    osc("sine", 1250, 420, t, 0.7, 0.22);
    osc("sine", 2500, 840, t, 0.35, 0.06);
  };
  A.pressureGroan = function () { // wave start, boss spawn
    if (!ready()) return;
    var t = now();
    [52, 55.5, 69].forEach(function (f, i) {
      var o = osc("sawtooth", f, f * 0.82, t, 1.6, 0.10);
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.4 + i * 0.13; lg.gain.value = 6;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 1.8);
    });
    noise(t, 1.2, 0.05, "lowpass", 160);
  };
  A.hydraulicClank = function () { // tower place / upgrade
    if (!ready()) return;
    var t = now();
    noise(t, 0.12, 0.25, "bandpass", 2400, 3);
    osc("square", 220, 110, t, 0.14, 0.12);
    osc("square", 660, 440, t + 0.05, 0.1, 0.06);
  };
  A.harpoonFire = function () {
    if (!ready()) return;
    var t = now();
    noise(t, 0.07, 0.10, "highpass", 3000);
    osc("square", 900, 300, t, 0.09, 0.07);
  };
  A.flakBoom = function () {
    if (!ready()) return;
    var t = now();
    noise(t, 0.35, 0.22, "lowpass", 500);
    osc("sine", 160, 40, t, 0.4, 0.25);
  };
  A.teslaZap = function () {
    if (!ready()) return;
    var t = now();
    noise(t, 0.16, 0.14, "highpass", 4500);
    osc("sawtooth", 2400, 700, t, 0.12, 0.06);
  };
  A.mineDet = function () {
    if (!ready()) return;
    var t = now();
    osc("sine", 120, 28, t, 0.9, 0.4);
    noise(t, 0.8, 0.25, "lowpass", 900);
  };
  A.hullAlarm = function () { // hull < 30%
    if (!ready()) return;
    var t = now();
    for (var i = 0; i < 2; i++) {
      osc("square", 440, 440, t + i * 0.28, 0.14, 0.10);
      osc("square", 622, 622, t + i * 0.28 + 0.14, 0.14, 0.10);
    }
  };
  A.mutationMotif = function () { // mutation report appears — dissonant minor 2nd
    if (!ready()) return;
    var t = now();
    osc("triangle", 392, 392, t, 0.5, 0.14);
    osc("triangle", 415, 415, t + 0.12, 0.6, 0.14);
    osc("sine", 196, 190, t, 0.8, 0.10);
  };
  A.cellPickup = function () {
    if (!ready()) return;
    var t = now();
    [880, 1174, 1568].forEach(function (f, i) { osc("triangle", f, f, t + i * 0.05, 0.12, 0.08); });
  };
  A.techUnlock = function () {
    if (!ready()) return;
    var t = now();
    [523, 659, 784, 1046].forEach(function (f, i) { osc("triangle", f, f, t + i * 0.09, 0.25, 0.12); });
  };
  A.uiClick = function () {
    if (!ready()) return;
    osc("sine", 700, 500, now(), 0.06, 0.08);
  };
  A.harvestSfx = function () {
    if (!ready()) return;
    var t = now();
    noise(t, 0.3, 0.08, "bandpass", 900, 2);
    [330, 440, 550].forEach(function (f, i) { osc("sine", f, f * 1.2, t + i * 0.07, 0.15, 0.07); });
  };
  A.overchargeSfx = function () {
    if (!ready()) return;
    var t = now();
    osc("sawtooth", 180, 900, t, 0.35, 0.12);
    noise(t + 0.1, 0.25, 0.10, "highpass", 2000);
  };
  A.powerSfx = function () {
    if (!ready()) return;
    osc("sine", 200, 600, now(), 0.2, 0.10);
  };
  A.breachSfx = function () {
    if (!ready()) return;
    var t = now();
    noise(t, 0.5, 0.2, "lowpass", 300);
    osc("sawtooth", 90, 45, t, 0.6, 0.15);
  };
  A.victoryStinger = function () {
    if (!ready()) return;
    var t = now();
    [392, 523, 659, 784, 1046, 1318].forEach(function (f, i) { osc("triangle", f, f, t + i * 0.13, 0.4, 0.12); });
    A.sonarPing();
  };
  A.defeatStinger = function () {
    if (!ready()) return;
    var t = now();
    [330, 311, 294, 262, 220].forEach(function (f, i) { osc("sawtooth", f, f * 0.94, t + i * 0.22, 0.35, 0.10); });
    noise(t, 2.0, 0.08, "lowpass", 200);
  };
  A.bossRoar = function (fam) {
    if (!ready()) return;
    var t = now();
    if (fam === "maw") {
      osc("sawtooth", 70, 38, t, 1.4, 0.25);
      osc("sawtooth", 93, 50, t + 0.1, 1.2, 0.18);
      noise(t, 1.0, 0.12, "lowpass", 400);
    } else if (fam === "dredge") {
      noise(t, 1.6, 0.25, "lowpass", 700);
      osc("square", 55, 40, t, 1.5, 0.15);
    } else { // heart
      [41, 43, 82].forEach(function (f) { osc("sine", f, f * 0.9, t, 2.2, 0.16); });
      [220, 277, 330].forEach(function (f) { osc("sawtooth", f, f * 0.97, t + 0.3, 1.6, 0.05); });
    }
  };

  // ---- ambient deep-drone bed ----
  A.startAmbient = function () {
    if (!ensure() || ambientNodes) return;
    var t = now();
    var g = ctx.createGain(); g.gain.value = 0.0;
    g.gain.linearRampToValueAtTime(0.05, t + 4);
    g.connect(master);
    [41, 43.2].forEach(function (f) {
      var o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
      o.connect(g); o.start();
    });
    // water: slow-filtered brown-ish noise
    var len = 4 * ctx.sampleRate;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 240;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    var lg = ctx.createGain(); lg.gain.value = 120;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    var ng = ctx.createGain(); ng.gain.value = 0.5;
    src.connect(f); f.connect(ng); ng.connect(g); src.start();
    ambientNodes = { gain: g };
    // distant sonar ping every ~14s
    (function pingLoop() {
      if (!ambientNodes) return;
      setTimeout(function () {
        if (ambientNodes && !muted) {
          var tt = now();
          osc("sine", 1250, 420, tt, 1.4, 0.025);
        }
        pingLoop();
      }, 14000);
    })();
  };
  A.stopAmbient = function () {
    if (ambientNodes) { try { ambientNodes.gain.gain.linearRampToValueAtTime(0.0001, now() + 1); } catch (e) {} }
    ambientNodes = null;
  };

  root.DeepAudio = A;
})(typeof self !== "undefined" ? self : this);
