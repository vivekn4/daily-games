/* Emberdeep — audio: tiny WebAudio synth SFX. No files. Safe no-op in Node. */
(function (g) {
  "use strict";
  var ctx = null, muted = false;

  function ac() {
    if (ctx) return ctx;
    try {
      var AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    var c = ac(); if (!c) return;
    try {
      var o = c.createOscillator(), gn = c.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), c.currentTime + dur);
      gn.gain.setValueAtTime(vol || 0.12, c.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(gn); gn.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur + 0.02);
    } catch (e) {}
  }
  function noise(dur, vol) {
    if (muted) return;
    var c = ac(); if (!c) return;
    try {
      var len = Math.floor(c.sampleRate * dur);
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = c.createBufferSource(); src.buffer = buf;
      var gn = c.createGain(); gn.gain.value = vol || 0.1;
      src.connect(gn); gn.connect(c.destination); src.start();
    } catch (e) {}
  }

  var S = {
    unlock: function () { ac(); if (ctx && ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} } },
    toggleMute: function () { muted = !muted; return muted; },
    swing: function () { noise(0.08, 0.06); tone(300, 0.08, "sawtooth", 0.05, 120); },
    hit: function () { tone(180, 0.1, "square", 0.1, 90); noise(0.06, 0.08); },
    enemyDie: function () { tone(220, 0.18, "square", 0.09, 40); },
    hurt: function () { tone(140, 0.2, "sawtooth", 0.12, 60); },
    pickup: function () { tone(660, 0.09, "sine", 0.1, 990); },
    heart: function () { tone(520, 0.12, "sine", 0.1, 780); },
    chest: function () { tone(330, 0.1, "triangle", 0.1); setTimeout(function () { tone(495, 0.14, "triangle", 0.1); }, 90); },
    levelup: function () { var n = [392, 494, 587, 784]; n.forEach(function (f, i) { setTimeout(function () { tone(f, 0.14, "triangle", 0.11); }, i * 80); }); },
    stairs: function () { tone(240, 0.25, "sine", 0.1, 480); },
    shoot: function () { tone(880, 0.07, "sawtooth", 0.04, 440); },
    bossRoar: function () { tone(90, 0.5, "sawtooth", 0.14, 45); noise(0.4, 0.1); },
    win: function () { var n = [523, 659, 784, 1047, 1319]; n.forEach(function (f, i) { setTimeout(function () { tone(f, 0.2, "triangle", 0.12); }, i * 110); }); },
    lose: function () { var n = [330, 262, 196, 131]; n.forEach(function (f, i) { setTimeout(function () { tone(f, 0.25, "sawtooth", 0.1); }, i * 140); }); },
    ui: function () { tone(700, 0.05, "sine", 0.07); }
  };

  g.EmberAudio = S;
})(typeof window !== "undefined" ? window : globalThis);
