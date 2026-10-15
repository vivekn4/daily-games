/* LANTERNVALE — audio.js
   Unique WebAudio-synthesized SFX set for "Lanternvale" (game04).
   Zero audio files; everything is synthesized live.
   Nothing recycled from Emberdeep (ember/combat), Cold Lead (noir/rain/
   typewriter) or Deephold (sonar/steel/trench).

   Design language: "a warm morning in a valley." Three families:
     1. WOOD & PAPER — the journal voice. UI is wooden knocks, page
        swishes, journal stamps: the traveler writing things down.
     2. WATER & WIND — the valley voice. Brook babble, wind through grass,
        dawn birds, night crickets: the world talking to itself.
     3. BRASS & LIGHT — the lantern voice. Flint strikes, ignites, the
        beacon choir swell, the deep-light FM chimes: every lit thing
        sings a little.

   Usage:
     LanternvaleAudio.init();                 // unlock on first gesture
     LanternvaleAudio.play("step_grass");
     LanternvaleAudio.startAmbient();          // wind+brook+day layer bed
     LanternvaleAudio.setWeather("rain");     // clear|fog|rain|storm
     LanternvaleAudio.setDayPhase("night");   // dawn|day|dusk|night
     LanternvaleAudio.setMuted(true);
     LanternvaleAudio.list();                  // all sound names (QA hook)
     LanternvaleAudio.demo();                  // plays a test sequence (QA hook)

   Node-safe: every entry no-ops gracefully when AudioContext is absent.
*/
(function (root) {
  "use strict";

  var ctx = null;
  var master = null;       // master gain -> compressor -> destination
  var sfxBus = null;       // one-shot sounds
  var ambBus = null;       // ambient layers
  var muted = false;
  var noiseBuf = null;     // shared white-noise buffer
  var amb = null;          // ambient layer handles
  var weather = "clear";
  var dayPhase = "day";

  /* ---------- core ---------- */

  function ac() {
    if (ctx) return ctx;
    try {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      comp.connect(ctx.destination);
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(comp);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.9;
      sfxBus.connect(master);
      ambBus = ctx.createGain();
      ambBus.gain.value = 0.7;
      ambBus.connect(master);
      // shared 2s white-noise buffer
      var len = Math.floor(ctx.sampleRate * 2);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function ready() {
    if (muted) return false;
    return !!ac();
  }
  function t0() { return ctx.currentTime; }

  function adsr(g, t, a, peak, decay, sustain, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + decay);
    g.gain.setValueAtTime(Math.max(sustain, 0.0001), t + a + decay + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay + rel);
  }

  function tone(o) {
    // {freq, dur, type, vol, slideTo, attack, dest, delay}
    if (!ready()) return;
    var t = t0() + (o.delay || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), t + o.dur);
    var a = o.attack || 0.005;
    adsr(g, t, a, o.vol || 0.15, o.dur, 0.0001, o.dur * 0.4 + 0.05);
    osc.connect(g); g.connect(o.dest || sfxBus);
    osc.start(t); osc.stop(t + a + o.dur * 1.5 + 0.3);
  }

  function noiseHit(o) {
    // {dur, freq, q, vol, type(filter), attack, slideTo, dest, delay}
    if (!ready()) return;
    var t = t0() + (o.delay || 0);
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = o.type || "bandpass";
    f.frequency.setValueAtTime(o.freq || 1000, t);
    if (o.slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t + o.dur);
    f.Q.value = o.q || 1;
    var g = ctx.createGain();
    adsr(g, t, o.attack || 0.004, o.vol || 0.15, o.dur, 0.0001, o.dur * 0.4 + 0.05);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
    src.start(t); src.stop(t + o.dur * 2 + 0.3);
  }

  // Wooden knock: short filtered triangle burst + thump partial.
  function knock(freq, vol, delay, bright) {
    tone({ freq: freq, dur: 0.07, type: "triangle", vol: vol, slideTo: freq * 0.55, delay: delay });
    noiseHit({ dur: 0.05, freq: bright ? 2600 : 1400, q: 2, vol: (vol || 0.15) * 0.5, delay: delay });
  }

  // Soft FM bell: warm chime with long singing decay.
  function bell(freq, vol, dur, delay) {
    if (!ready()) return;
    var t = t0() + (delay || 0);
    var car = ctx.createOscillator(), mod = ctx.createOscillator();
    var mg = ctx.createGain(), g = ctx.createGain();
    car.type = "sine"; car.frequency.value = freq;
    mod.type = "sine"; mod.frequency.value = freq * 2.01;
    mg.gain.setValueAtTime(freq * 1.4, t);
    mg.gain.exponentialRampToValueAtTime(1, t + (dur || 2.2));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 2.2));
    mod.connect(mg); mg.connect(car.frequency);
    car.connect(g); g.connect(sfxBus);
    car.start(t); mod.start(t);
    car.stop(t + (dur || 2.2) + 0.2); mod.stop(t + (dur || 2.2) + 0.2);
  }

  /* ---------- ambient bed ---------- */

  function makeLoop(filterType, freq, q, vol) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q || 1;
    var g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(ambBus);
    src.start();
    return { src: src, filter: f, gain: g };
  }

  function startAmbient() {
    if (!ac() || amb) return;
    amb = {};
    // wind through grass: soft bandpassed noise with slow breathing LFO
    amb.wind = makeLoop("bandpass", 420, 0.6, 0.0);
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.type = "sine"; lfo.frequency.value = 0.09;
    lg.gain.value = 0.05;
    lfo.connect(lg); lg.connect(amb.wind.gain.gain);
    lfo.start(); amb.windLfo = lfo;
    amb.windBase = 0.10;
    // brook babble: brighter, burblier noise with a second LFO
    amb.brook = makeLoop("bandpass", 1500, 0.8, 0.0);
    var blfo = ctx.createOscillator(), blg = ctx.createGain();
    blfo.type = "sine"; blfo.frequency.value = 1.7;
    blg.gain.value = 0.02;
    blfo.connect(blg); blg.connect(amb.brook.filter.frequency);
    blfo.start(); amb.brookLfo = blfo;
    amb.brookBase = 0.045;
    // gentle rain hiss (kept low; storms use thunder too)
    amb.rain = makeLoop("highpass", 5200, 0.7, 0.0);
    // night crickets: looped chirp texture built from pulses
    amb.crickets = null;
    // warm pad drone: two detuned soft triangles, very low
    var p1 = ctx.createOscillator(), p2 = ctx.createOscillator(), pg = ctx.createGain();
    p1.type = "triangle"; p2.type = "triangle";
    p1.frequency.value = 110; p2.frequency.value = 110.6;
    pg.gain.value = 0.028;
    var pf = ctx.createBiquadFilter(); pf.type = "lowpass"; pf.frequency.value = 600;
    p1.connect(pf); p2.connect(pf); pf.connect(pg); pg.connect(ambBus);
    p1.start(); p2.start();
    amb.pad = { src: p1, src2: p2, gain: pg };
    applyAmbientMix();
  }

  function stopAmbient() {
    if (!amb) return;
    try {
      ["wind", "brook", "rain"].forEach(function (k) {
        if (amb[k]) { try { amb[k].src.stop(); } catch (e) {} }
      });
      ["windLfo", "brookLfo"].forEach(function (k) {
        if (amb[k]) { try { amb[k].stop(); } catch (e) {} }
      });
      if (amb.pad) { try { amb.pad.src.stop(); } catch (e) {} try { amb.pad.src2.stop(); } catch (e) {} }
      if (amb.crickets) { try { amb.crickets.src.stop(); } catch (e) {} try { amb.crickets.timer && clearInterval(amb.crickets.timer); } catch (e) {} }
    } catch (e) {}
    amb = null;
  }

  function rampTo(param, v, dur) {
    if (!param) return;
    try {
      param.cancelScheduledValues(t0());
      param.setValueAtTime(param.value, t0());
      param.linearRampToValueAtTime(v, t0() + (dur || 2));
    } catch (e) {}
  }

  function applyAmbientMix() {
    if (!amb) return;
    var windT = 0.10, brookT = 0.045, rainT = 0.0, cricketsOn = false, padT = 0.028;
    if (weather === "fog") { windT = 0.06; brookT = 0.06; }
    else if (weather === "rain") { windT = 0.13; brookT = 0.07; rainT = 0.06; }
    else if (weather === "storm") { windT = 0.20; brookT = 0.09; rainT = 0.11; }
    if (dayPhase === "night") { cricketsOn = true; padT = 0.02; brookT *= 1.2; }
    else if (dayPhase === "dusk") { windT *= 0.8; }
    rampTo(amb.wind.gain.gain, windT, 3);
    rampTo(amb.brook.gain.gain, brookT, 3);
    rampTo(amb.rain.gain.gain, rainT, 3);
    rampTo(amb.pad.gain.gain, padT, 3);
    if (cricketsOn && !amb.crickets) startCrickets();
    if (!cricketsOn && amb.crickets) stopCrickets();
  }

  function startCrickets() {
    // sparse high chirp pulses, looped while night lasts
    var src = ctx.createOscillator(), g = ctx.createGain();
    src.type = "sine"; src.frequency.value = 4300;
    g.gain.value = 0.0;
    src.connect(g); g.connect(ambBus);
    src.start();
    var timer = setInterval(function () {
      if (muted || !amb) return;
      var t = t0();
      for (var i = 0; i < 3; i++) {
        g.gain.setValueAtTime(0.0001, t + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.012, t + i * 0.07 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.05);
      }
    }, 1400);
    amb.crickets = { src: src, timer: timer };
  }
  function stopCrickets() {
    if (!amb.crickets) return;
    try { amb.crickets.src.stop(); } catch (e) {}
    try { clearInterval(amb.crickets.timer); } catch (e) {}
    amb.crickets = null;
  }

  function setWeather(w) {
    weather = w;
    applyAmbientMix();
    if (w === "storm") thunderDistant();
  }
  function setDayPhase(p) {
    dayPhase = p;
    applyAmbientMix();
  }

  /* ---------- sound definitions ---------- */

  var S = {
    /* lifecycle */
    init: function () {
      ac();
      if (ctx && ctx.state === "suspended") {
        try { ctx.resume(); } catch (e) {}
      }
    },
    setMuted: function (m) {
      muted = !!m;
      if (muted) stopAmbient();
    },
    isMuted: function () { return muted; },

    /* ambient control */
    startAmbient: startAmbient,
    stopAmbient: stopAmbient,
    setWeather: setWeather,
    setDayPhase: setDayPhase,
    duckAmbient: function (dur, to) {
      if (!amb || !ctx) return;
      var t = t0(), d = dur || 1.5, v = (to === undefined ? 0.15 : to);
      rampTo(ambBus.gain, v, 0.4);
      setTimeout(function () { rampTo(ambBus.gain, 0.7, d); }, d * 1000 * 0.6);
    },

    /* ----- UI: wood & paper ----- */
    ui_hover: function () {
      tone({ freq: 1180, dur: 0.04, type: "sine", vol: 0.05 });
    },
    ui_click: function () { knock(660, 0.14); },
    ui_confirm: function () {
      knock(660, 0.14);
      knock(880, 0.14, 0.09);
    },
    ui_back: function () { knock(440, 0.12); },
    ui_tab: function () {
      // paper swipe
      noiseHit({ dur: 0.16, freq: 3200, q: 0.8, vol: 0.10, type: "highpass", slideTo: 1800 });
    },
    journal_open: function () {
      // leather cover thump + pages
      noiseHit({ dur: 0.10, freq: 300, q: 1, vol: 0.16, type: "lowpass" });
      noiseHit({ dur: 0.22, freq: 3800, q: 0.7, vol: 0.08, type: "highpass", delay: 0.10 });
    },
    journal_close: function () {
      noiseHit({ dur: 0.08, freq: 260, q: 1, vol: 0.18, type: "lowpass" });
      tone({ freq: 180, dur: 0.08, type: "triangle", vol: 0.08, delay: 0.02 });
    },
    page_turn: function () {
      noiseHit({ dur: 0.19, freq: 4200, q: 0.7, vol: 0.09, type: "highpass", slideTo: 2400 });
    },
    journal_entry: function () {
      // pencil scribble + soft stamp
      noiseHit({ dur: 0.28, freq: 2600, q: 1.4, vol: 0.06, type: "bandpass", slideTo: 3400 });
      knock(520, 0.10, 0.30);
    },
    compass_tick: function () {
      bell(1568, 0.05, 0.9);
    },

    /* ----- footsteps: terrain textures ----- */
    step_grass: function () {
      // soft swish
      noiseHit({ dur: 0.13, freq: 900, q: 0.7, vol: 0.10, type: "bandpass", slideTo: 500 });
    },
    step_gravel: function () {
      // gritty crunch
      noiseHit({ dur: 0.09, freq: 2400, q: 1.2, vol: 0.13 });
      noiseHit({ dur: 0.05, freq: 5200, q: 1.5, vol: 0.06, delay: 0.03 });
    },
    step_wood: function () { knock(300, 0.13); },
    step_stone: function () { knock(180, 0.12); },
    step_water: function () {
      // wading splash
      noiseHit({ dur: 0.20, freq: 1800, q: 0.8, vol: 0.13, type: "bandpass", slideTo: 700 });
      tone({ freq: 300, dur: 0.10, type: "sine", vol: 0.05, slideTo: 180 });
    },

    /* ----- water & wind ----- */
    ford_splash: function () {
      noiseHit({ dur: 0.35, freq: 2200, q: 0.7, vol: 0.16, type: "bandpass", slideTo: 600 });
      noiseHit({ dur: 0.25, freq: 900, q: 1, vol: 0.10, type: "bandpass", delay: 0.12 });
    },
    water_pour: function () {
      // channel puzzle: routing water
      noiseHit({ dur: 0.6, freq: 1300, q: 0.9, vol: 0.12, type: "bandpass", slideTo: 2600, attack: 0.15 });
      tone({ freq: 520, dur: 0.5, type: "sine", vol: 0.04, slideTo: 880, attack: 0.2 });
    },
    wind_gust: function () {
      noiseHit({ dur: 1.1, freq: 380, q: 0.5, vol: 0.10, type: "bandpass", slideTo: 700, attack: 0.35 });
    },

    /* ----- lantern & beacons ----- */
    flint_strike: function () {
      // two flint clicks
      noiseHit({ dur: 0.03, freq: 6800, q: 2, vol: 0.16 });
      noiseHit({ dur: 0.03, freq: 7400, q: 2, vol: 0.14, delay: 0.14 });
    },
    lantern_ignite: function () {
      // whoosh bloom into a warm settle
      noiseHit({ dur: 0.45, freq: 500, q: 0.8, vol: 0.14, type: "bandpass", slideTo: 2400, attack: 0.08 });
      tone({ freq: 220, dur: 0.9, type: "triangle", vol: 0.08, slideTo: 330, delay: 0.15, attack: 0.25 });
      bell(1319, 0.07, 2.0, 0.30);
    },
    lantern_latch: function () {
      knock(980, 0.11);
      tone({ freq: 1960, dur: 0.06, type: "sine", vol: 0.05, delay: 0.05 });
    },
    beacon_light: function () {
      // the tower moment: ignite -> rising swell -> choir bloom
      S.lantern_ignite();
      // D major: D3 A3 D4 F#4 — warm resolution for the lit tower
      var chord = [293.66, 440.0, 587.33, 739.99];
      chord.forEach(function (f, i) {
        tone({ freq: f, dur: 2.6, type: "triangle", vol: 0.07, delay: 0.7 + i * 0.12, attack: 1.2 });
        tone({ freq: f * 2, dur: 2.0, type: "sine", vol: 0.03, delay: 1.0 + i * 0.12, attack: 1.4 });
      });
      bell(587.33, 0.09, 3.2, 1.6);
      bell(880.0, 0.07, 3.6, 2.0);
    },
    beacon_chime_distant: function () {
      // other lit towers answering at night
      bell(783.99, 0.035, 3.0);
      bell(1046.5, 0.028, 3.4, 0.5);
    },

    /* ----- deep light (night bloom) ----- */
    deeplight_chime: function () {
      // soft FM bell motif, pentatonic descent — the valley's secret voice
      var seq = [880.0, 783.99, 659.26, 587.33];
      seq.forEach(function (f, i) {
        bell(f, 0.09, 2.6, i * 0.42);
      });
    },
    deeplight_discover: function () {
      S.deeplight_chime();
      bell(1174.66, 0.06, 4.0, 1.8);
      noiseHit({ dur: 1.4, freq: 6000, q: 0.6, vol: 0.04, type: "highpass", attack: 0.6, delay: 0.6 });
    },
    night_bloom_open: function () {
      // a single flower opening: tiny pop + chime
      tone({ freq: 500, dur: 0.08, type: "sine", vol: 0.08, slideTo: 900 });
      bell(987.77, 0.07, 2.2, 0.10);
    },

    /* ----- puzzles ----- */
    boulder_nudge: function () {
      // stone scrape + low rumble
      noiseHit({ dur: 0.5, freq: 240, q: 1, vol: 0.16, type: "lowpass", slideTo: 120, attack: 0.1 });
      tone({ freq: 70, dur: 0.5, type: "sine", vol: 0.10, slideTo: 45, attack: 0.12 });
    },
    boulder_settle: function () {
      noiseHit({ dur: 0.18, freq: 180, q: 1, vol: 0.18, type: "lowpass" });
      tone({ freq: 55, dur: 0.25, type: "sine", vol: 0.12, slideTo: 38 });
    },
    mirror_turn: function () {
      tone({ freq: 1200, dur: 0.12, type: "sine", vol: 0.06, slideTo: 1600 });
      knock(1500, 0.06, 0.02);
    },
    mirror_align: function () {
      // light locks on: glass shimmer
      bell(1568, 0.06, 1.8);
      bell(2093, 0.05, 2.2, 0.18);
      noiseHit({ dur: 0.5, freq: 7000, q: 1, vol: 0.03, type: "highpass", attack: 0.3 });
    },
    bridge_plank: function () {
      knock(240, 0.15);
      tone({ freq: 160, dur: 0.14, type: "triangle", vol: 0.08, slideTo: 110, delay: 0.03 });
    },
    bridge_creak: function () {
      tone({ freq: 180, dur: 0.35, type: "sawtooth", vol: 0.035, slideTo: 140, attack: 0.12 });
    },

    /* ----- gear ----- */
    gear_waders: function () {
      // squelch + buckle
      noiseHit({ dur: 0.14, freq: 700, q: 1, vol: 0.12, type: "bandpass", slideTo: 300 });
      knock(900, 0.09, 0.12);
    },
    gear_climb: function () {
      // carabiner clicks
      knock(1900, 0.10);
      knock(2400, 0.09, 0.10);
    },
    gear_lantern: function () {
      S.flint_strike();
      S.lantern_latch();
    },

    /* ----- compendium & photo ----- */
    shutter: function () {
      // soft camera click
      noiseHit({ dur: 0.03, freq: 4000, q: 1.5, vol: 0.14 });
      noiseHit({ dur: 0.05, freq: 1800, q: 1.5, vol: 0.10, delay: 0.06 });
    },
    compendium_stamp: function () {
      knock(500, 0.16);
      noiseHit({ dur: 0.08, freq: 2200, q: 1, vol: 0.08, delay: 0.02 });
    },
    vista_chime: function () {
      // discovered a vista: open major lift
      bell(659.26, 0.08, 2.4);
      bell(987.77, 0.06, 2.8, 0.35);
    },
    flora_log: function () {
      bell(1046.5, 0.06, 1.6);
    },
    fauna_log: function () {
      // two-note animal call-ish
      tone({ freq: 1300, dur: 0.10, type: "sine", vol: 0.07, slideTo: 1700 });
      tone({ freq: 1500, dur: 0.10, type: "sine", vol: 0.06, slideTo: 1100, delay: 0.14 });
    },
    echo_log: function () {
      // "echoes" of the valley: a remembered voice fragment
      tone({ freq: 392, dur: 0.4, type: "triangle", vol: 0.07, attack: 0.15 });
      tone({ freq: 523.25, dur: 0.5, type: "triangle", vol: 0.06, delay: 0.25, attack: 0.2 });
    },

    /* ----- villagers ----- */
    villager_greet: function () {
      // warm wooden pluck, two notes
      tone({ freq: 523.25, dur: 0.25, type: "triangle", vol: 0.11 });
      tone({ freq: 659.26, dur: 0.3, type: "triangle", vol: 0.10, delay: 0.16 });
      knock(660, 0.06, 0.02);
    },
    quest_accept: function () {
      tone({ freq: 587.33, dur: 0.2, type: "triangle", vol: 0.10 });
      tone({ freq: 783.99, dur: 0.35, type: "triangle", vol: 0.10, delay: 0.15 });
    },
    quest_complete: function () {
      var seq = [523.25, 587.33, 659.26, 783.99];
      seq.forEach(function (f, i) {
        tone({ freq: f, dur: 0.3, type: "triangle", vol: 0.10, delay: i * 0.12 });
      });
    },
    kindness_chime: function () {
      // kindness rises: one high warm bell
      bell(1318.5, 0.07, 2.6);
    },
    dialogue_blip: function () {
      tone({ freq: 740, dur: 0.05, type: "sine", vol: 0.05 });
    },

    /* ----- day/night ----- */
    dawn_birds: function () {
      // three small birdsong phrases
      var phrases = [
        [2200, 2600, 2100], [2800, 2400, 3000], [2000, 2300]
      ];
      phrases.forEach(function (ph, pi) {
        ph.forEach(function (f, i) {
          tone({ freq: f, dur: 0.09, type: "sine", vol: 0.045, slideTo: f * 1.25, delay: pi * 0.55 + i * 0.13 });
        });
      });
    },
    thunder_distant: function () {
      tone({ freq: 60, dur: 1.8, type: "sine", vol: 0.14, slideTo: 30, attack: 0.3 });
      noiseHit({ dur: 1.6, freq: 110, q: 0.7, vol: 0.07, type: "lowpass", attack: 0.35 });
    },

    /* ----- endings ----- */
    ending_cartographer: function () {
      // resolved, bright: finished map
      var seq = [523.25, 659.26, 783.99, 1046.5, 1318.5];
      seq.forEach(function (f, i) {
        bell(f, 0.08, 3.0, i * 0.3);
      });
      S.page_turn_delayed();
    },
    page_turn_delayed: function () {
      var self = this;
      setTimeout(function () { S.page_turn(); }, 1700);
    },
    ending_longway: function () {
      // warm, unhurried: staying the winter
      var seq = [392.0, 440.0, 523.25, 587.33];
      seq.forEach(function (f, i) {
        tone({ freq: f, dur: 0.9, type: "triangle", vol: 0.09, delay: i * 0.55, attack: 0.35 });
      });
      bell(784.0, 0.05, 4.0, 2.2);
    },
    ending_deeplight: function () {
      // soft night motif: the dark, mapped
      S.deeplight_chime();
      bell(440.0, 0.06, 4.0, 1.9);
    },

    /* ---------- QA test hook ---------- */
    list: function () {
      return Object.keys(S).filter(function (k) {
        return typeof S[k] === "function" &&
          ["init", "setMuted", "isMuted", "startAmbient", "stopAmbient",
           "setWeather", "setDayPhase", "duckAmbient", "list", "demo", "play",
           "page_turn_delayed"].indexOf(k) === -1;
      }).sort();
    },
    play: function (name) {
      if (typeof S[name] === "function") { S[name](); return true; }
      return false;
    },
    demo: function () {
      // Plays a short showcase sequence for QA / sound checks.
      var seq = [
        "ui_click", "page_turn", "step_grass", "step_wood", "ford_splash",
        "flint_strike", "lantern_ignite", "villager_greet", "quest_complete",
        "mirror_align", "vista_chime", "deeplight_chime", "beacon_light",
        "ending_cartographer"
      ];
      seq.forEach(function (n, i) {
        setTimeout(function () { S.play(n); }, i * 900);
      });
      return seq;
    }
  };

  // standalone thunder used by setWeather("storm")
  function thunderDistant() { S.thunder_distant(); }

  root.LanternvaleAudio = S;
})(typeof window !== "undefined" ? window : globalThis);
