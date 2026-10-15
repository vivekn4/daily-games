/* =========================================================================
 * DEEPHOLD — Sound Design module
 * A unique WebAudio-synthesized SFX set for Deephold (game03-deephold).
 * ZERO audio files: every sound is synthesized live with the Web Audio API.
 * Palette: deep-sea pressure — sonar pings, pressure groans, hydraulic
 * clanks, bioluminescent shimmer, hull-steel resonance, deep-drum ambience.
 * Nothing here is recycled from Emberdeep or Cold Lead.
 *
 * Usage:
 *   DeepholdAudio.init()            // call on first user gesture
 *   DeepholdAudio.play('harpoon')   // play any sound by name
 *   DeepholdAudio.setMuted(true)
 *   DeepholdAudio.startAmbient()    // deep trench ambience loop
 *   DeepholdAudio.stopAmbient()
 *   DeepholdAudio.test()            // QA hook: plays every sound in sequence
 *
 * Exposed for QA: DeepholdAudio.sounds -> array of registered sound names.
 * ========================================================================= */
(function (root) {
  'use strict';

  var ctx = null;
  var master = null;      // master gain (muted by toggle)
  var sfxBus = null;      // effects bus
  var ambBus = null;      // ambience bus (duckable under stingers)
  var muted = false;
  var noiseBuf = null;    // shared white-noise buffer
  var ambTimer = null;    // ambient event scheduler
  var ambNodes = null;    // running ambient nodes (for stop)
  var lastPlay = {};      // per-sound throttle stamps (avoid machine-gun overlap)

  /* ------------------------------- core -------------------------------- */

  function ensureCtx() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.85;
    sfxBus.connect(master);
    ambBus = ctx.createGain();
    ambBus.gain.value = 0.5;
    ambBus.connect(master);
    // shared 2s white-noise buffer
    var len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  // Classic ADSR-ish envelope on a param. All times relative to `t`.
  function env(param, t, peak, a, d, s, r) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + a);
    param.exponentialRampToValueAtTime(Math.max(0.0001, s), t + a + d);
    param.setValueAtTime(Math.max(0.0001, s), t + a + d + 0.01);
    param.exponentialRampToValueAtTime(0.0001, t + a + d + r);
  }

  // One-shot oscillator: {type, f0, f1, t, dur, peak, a, d, s, r, bus, detune}
  function tone(o) {
    var c = ensureCtx(); if (!c) return;
    var t = (o.t != null ? o.t : c.currentTime);
    var osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(Math.max(1, o.f0), t);
    if (o.f1 != null && o.f1 !== o.f0) {
      if (o.exp) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur);
      else osc.frequency.linearRampToValueAtTime(Math.max(1, o.f1), t + o.dur);
    }
    if (o.detune) osc.detune.value = o.detune;
    var g = c.createGain();
    env(g.gain, t, o.peak != null ? o.peak : 0.5, o.a != null ? o.a : 0.005,
        o.d != null ? o.d : o.dur * 0.4, o.s != null ? o.s : 0.0001,
        o.r != null ? o.r : o.dur * 0.5);
    osc.connect(g);
    g.connect(o.bus || sfxBus);
    osc.start(t);
    osc.stop(t + o.dur + 0.1);
  }

  // Filtered noise burst: {t, dur, peak, type, freq, q, a, r, bus, sweepTo}
  function noise(o) {
    var c = ensureCtx(); if (!c) return;
    var t = (o.t != null ? o.t : c.currentTime);
    var src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    src.playbackRate.value = o.rate || 1;
    var f = c.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 800, t);
    if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(10, o.sweepTo), t + o.dur);
    f.Q.value = o.q != null ? o.q : 1;
    var g = c.createGain();
    env(g.gain, t, o.peak != null ? o.peak : 0.5, o.a != null ? o.a : 0.005,
        o.d != null ? o.d : o.dur * 0.3, 0.0001, o.r != null ? o.r : o.dur * 0.6);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t);
    src.stop(t + o.dur + 0.1);
  }

  // Metallic "clank": inharmonic partials struck at once (steel resonance).
  function clank(t, base, peak, dur) {
    var partials = [1, 1.51, 2.09, 2.94, 3.97];
    for (var i = 0; i < partials.length; i++) {
      tone({
        t: t, type: 'square', f0: base * partials[i], f1: base * partials[i] * 0.985,
        dur: dur, peak: peak / (i + 1.5), a: 0.002, d: dur * 0.15, s: 0.0001,
        r: dur * 0.8
      });
    }
  }

  // Sonar ping: pure sine with a fast attack and long watery tail,
  // plus a faint harmonic an octave up.
  function ping(t, freq, peak, dur) {
    tone({ t: t, type: 'sine', f0: freq, f1: freq * 0.98, dur: dur,
           peak: peak, a: 0.004, d: dur * 0.2, s: 0.0001, r: dur * 0.75 });
    tone({ t: t + 0.005, type: 'sine', f0: freq * 2, f1: freq * 1.96, dur: dur * 0.6,
           peak: peak * 0.25, a: 0.004, d: dur * 0.2, s: 0.0001, r: dur * 0.6 });
  }

  // Pressure groan: low sine sweep down + slow noise swell through lowpass.
  function groan(t, f0, f1, dur, peak) {
    tone({ t: t, type: 'sine', f0: f0, f1: f1, dur: dur, peak: peak,
           a: dur * 0.25, d: dur * 0.4, s: 0.0001, r: dur * 0.35, exp: true });
    tone({ t: t + 0.05, type: 'triangle', f0: f0 * 1.5, f1: f1 * 1.45, dur: dur * 0.9,
           peak: peak * 0.4, a: dur * 0.3, d: dur * 0.4, s: 0.0001, r: dur * 0.3, exp: true });
    noise({ t: t, dur: dur, peak: peak * 0.35, type: 'lowpass', freq: 220,
            sweepTo: 90, a: dur * 0.3, r: dur * 0.5 });
  }

  // Bubble / bioluminescent blip: short upward sine chirp with vibrato.
  function blip(t, f0, f1, dur, peak) {
    var c = ensureCtx(); if (!c) return;
    var osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var lfo = c.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 30;
    var lfoG = c.createGain(); lfoG.gain.value = f0 * 0.06;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    var g = c.createGain();
    env(g.gain, t, peak, 0.008, dur * 0.5, 0.0001, dur * 0.4);
    osc.connect(g); g.connect(sfxBus);
    osc.start(t); lfo.start(t);
    osc.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  }

  /* ------------------------- throttle helper --------------------------- */
  // Returns true if this sound may play now (min interval `ms` between plays).
  function gate(name, ms) {
    var now = Date.now();
    if (lastPlay[name] && now - lastPlay[name] < ms) return false;
    lastPlay[name] = now;
    return true;
  }

  /* ------------------------------- sounds ------------------------------ */
  // Every sound is a function(t) that schedules itself at time t.
  var S = {};

  // --- UI ---------------------------------------------------------------
  S.ui_hover = function (t) {
    blip(t, 2400, 2900, 0.06, 0.12);
  };
  S.ui_click = function (t) {
    ping(t, 1320, 0.25, 0.14);
    blip(t + 0.03, 1760, 2100, 0.07, 0.15);
  };
  S.ui_confirm = function (t) {           // positive confirm: rising sonar pair
    ping(t, 990, 0.28, 0.18);
    ping(t + 0.11, 1485, 0.28, 0.22);
  };
  S.ui_back = function (t) {              // falling chirp
    blip(t, 1200, 700, 0.12, 0.2);
  };
  S.ui_tab = function (t) {               // soft filtered tick
    noise({ t: t, dur: 0.05, peak: 0.2, type: 'highpass', freq: 3000, q: 0.7 });
    blip(t + 0.01, 1800, 2200, 0.05, 0.1);
  };
  S.ui_error = function (t) {             // muted double buzz through metal
    tone({ t: t, type: 'sawtooth', f0: 160, f1: 120, dur: 0.14, peak: 0.22,
           a: 0.005, d: 0.05, s: 0.0001, r: 0.08 });
    tone({ t: t + 0.16, type: 'sawtooth', f0: 140, f1: 105, dur: 0.16, peak: 0.22,
           a: 0.005, d: 0.06, s: 0.0001, r: 0.1 });
  };

  // --- Actions (player economy / build) ----------------------------------
  S.place_tower = function (t) {          // hydraulic bolt + steel clank
    noise({ t: t, dur: 0.16, peak: 0.35, type: 'lowpass', freq: 500, sweepTo: 140,
            a: 0.004, r: 0.12 });
    clank(t + 0.05, 320, 0.5, 0.28);
  };
  S.upgrade_tower = function (t) {         // ratcheting rise + lock-in clank
    for (var i = 0; i < 4; i++) {
      blip(t + i * 0.06, 500 + i * 220, 620 + i * 260, 0.06, 0.18);
    }
    clank(t + 0.26, 520, 0.45, 0.3);
  };
  S.sell_tower = function (t) {           // reverse ratchet, lower clank
    for (var i = 0; i < 3; i++) {
      blip(t + i * 0.06, 900 - i * 200, 800 - i * 200, 0.06, 0.16);
    }
    clank(t + 0.2, 240, 0.4, 0.25);
  };
  S.harvest_vent = function (t) {          // thermal hiss + rising bubble stream
    noise({ t: t, dur: 0.5, peak: 0.22, type: 'highpass', freq: 2500,
            sweepTo: 5200, a: 0.15, r: 0.3 });
    for (var i = 0; i < 5; i++) {
      blip(t + 0.06 + i * 0.07, 400 + i * 140, 700 + i * 200, 0.08, 0.12);
    }
  };
  S.bank_cells = function (t) {           // deep coin-drop into the Core
    blip(t, 900, 1400, 0.08, 0.2);
    tone({ t: t + 0.08, type: 'sine', f0: 220, f1: 110, dur: 0.4, peak: 0.4,
           a: 0.01, d: 0.1, s: 0.0001, r: 0.28, exp: true });
  };
  S.cell_collect = function (t) {         // tiny bioluminescent pickup
    if (!gate('cell_collect', 90)) return;
    blip(t, 1500 + Math.random() * 500, 2600, 0.07, 0.14);
  };
  S.tech_unlock = function (t) {          // shimmer arpeggio, glassy
    var notes = [660, 880, 1174, 1568];
    for (var i = 0; i < notes.length; i++) {
      ping(t + i * 0.09, notes[i], 0.22, 0.35);
    }
  };

  // --- Tower fire --------------------------------------------------------
  S.harpoon_fire = function (t) {         // pneumatic launch: thump + hiss
    if (!gate('harpoon_fire', 70)) return;
    tone({ t: t, type: 'sine', f0: 180, f1: 60, dur: 0.12, peak: 0.5,
           a: 0.004, d: 0.04, s: 0.0001, r: 0.07, exp: true });
    noise({ t: t, dur: 0.1, peak: 0.2, type: 'bandpass', freq: 2200, q: 0.8 });
  };
  S.flak_fire = function (t) {            // dull underwater boom
    if (!gate('flak_fire', 90)) return;
    tone({ t: t, type: 'sine', f0: 120, f1: 38, dur: 0.3, peak: 0.55,
           a: 0.005, d: 0.08, s: 0.0001, r: 0.22, exp: true });
    noise({ t: t, dur: 0.22, peak: 0.28, type: 'lowpass', freq: 700, sweepTo: 120 });
  };
  S.tesla_zap = function (t) {            // crackling arc
    if (!gate('tesla_zap', 90)) return;
    noise({ t: t, dur: 0.12, peak: 0.4, type: 'highpass', freq: 4000, q: 2 });
    tone({ t: t, type: 'sawtooth', f0: 2400, f1: 300, dur: 0.1, peak: 0.28,
           a: 0.003, d: 0.03, s: 0.0001, r: 0.06, exp: true });
  };
  S.sonar_pulse = function (t) {          // reveal sweep: wide ping + echo
    ping(t, 880, 0.3, 0.5);
    ping(t + 0.35, 880, 0.15, 0.5);
    ping(t + 0.7, 880, 0.07, 0.5);
  };
  S.overcharge_ready = function (t) {     // charged shimmer, rising
    for (var i = 0; i < 5; i++) {
      blip(t + i * 0.05, 1000 + i * 300, 1300 + i * 350, 0.05, 0.12);
    }
  };
  S.overcharge_fire = function (t) {       // unleashed: pressure surge
    groan(t, 90, 45, 0.7, 0.55);
    noise({ t: t, dur: 0.5, peak: 0.3, type: 'bandpass', freq: 900,
            sweepTo: 250, q: 1.2 });
    clank(t + 0.1, 200, 0.5, 0.4);
  };
  S.mine_arm = function (t) {
    clank(t, 700, 0.3, 0.15);
    blip(t + 0.12, 2000, 2400, 0.06, 0.14);
  };
  S.mine_detonate = function (t) {        // big muffled depth-charge
    tone({ t: t, type: 'sine', f0: 90, f1: 28, dur: 0.8, peak: 0.7,
           a: 0.004, d: 0.15, s: 0.0001, r: 0.6, exp: true });
    noise({ t: t, dur: 0.7, peak: 0.4, type: 'lowpass', freq: 900, sweepTo: 60 });
    groan(t + 0.05, 70, 35, 0.9, 0.4);
  };
  S.reroute_power = function (t) {         // electrical whoosh, low
    noise({ t: t, dur: 0.35, peak: 0.28, type: 'bandpass', freq: 400,
            sweepTo: 1600, q: 1.5, a: 0.05, r: 0.25 });
  };

  // --- Enemy / combat feedback -------------------------------------------
  S.enemy_hit = function (t) {            // wet organic thud
    if (!gate('enemy_hit', 60)) return;
    noise({ t: t, dur: 0.08, peak: 0.3, type: 'lowpass', freq: 900 });
    blip(t, 300 + Math.random() * 150, 180, 0.08, 0.2);
  };
  S.enemy_die_small = function (t) {      // small pop + sinking blip
    if (!gate('enemy_die_small', 80)) return;
    blip(t, 700, 250, 0.14, 0.25);
    noise({ t: t, dur: 0.06, peak: 0.2, type: 'highpass', freq: 3500 });
  };
  S.enemy_die_large = function (t) {      // crushing groan + burst
    groan(t, 160, 60, 0.5, 0.45);
    noise({ t: t, dur: 0.3, peak: 0.3, type: 'lowpass', freq: 600, sweepTo: 100 });
  };
  S.spitter_shot = function (t) {         // enemy ranged: acid spit
    if (!gate('spitter_shot', 120)) return;
    blip(t, 500, 150, 0.16, 0.22);
    noise({ t: t, dur: 0.1, peak: 0.15, type: 'bandpass', freq: 1200, q: 2 });
  };
  S.lurker_reveal = function (t) {        // stealth breaks: glassy ping + shimmer
    ping(t, 1568, 0.25, 0.3);
    for (var i = 0; i < 3; i++) {
      blip(t + 0.05 + i * 0.04, 2200 + i * 300, 2600 + i * 350, 0.05, 0.1);
    }
  };

  // --- Hull / rig state ---------------------------------------------------
  S.hull_breach = function (t) {          // tearing metal + pressure alarm
    noise({ t: t, dur: 0.5, peak: 0.45, type: 'bandpass', freq: 1800,
            sweepTo: 500, q: 1, a: 0.01, r: 0.3 });
    clank(t + 0.05, 150, 0.6, 0.5);
    tone({ t: t + 0.3, type: 'square', f0: 440, f1: 415, dur: 0.5, peak: 0.2,
           a: 0.01, d: 0.15, s: 0.0001, r: 0.3 });
  };
  S.hull_alarm = function (t) {           // two-tone diving bell klaxon
    for (var i = 0; i < 2; i++) {
      tone({ t: t + i * 0.5, type: 'square', f0: 392, f1: 392, dur: 0.22,
             peak: 0.22, a: 0.01, d: 0.05, s: 0.18, r: 0.05 });
      tone({ t: t + i * 0.5 + 0.24, type: 'square', f0: 311, f1: 311, dur: 0.22,
             peak: 0.22, a: 0.01, d: 0.05, s: 0.18, r: 0.05 });
    }
  };
  S.leak = function (t) {                 // persistent hissing leak
    if (!gate('leak', 400)) return;
    noise({ t: t, dur: 0.4, peak: 0.14, type: 'highpass', freq: 5000, q: 0.5,
            a: 0.1, r: 0.25 });
  };
  S.repair = function (t) {               // welding: sizzle + soft clanks
    noise({ t: t, dur: 0.5, peak: 0.2, type: 'highpass', freq: 6000, a: 0.05, r: 0.4 });
    clank(t + 0.1, 500, 0.3, 0.2);
    clank(t + 0.3, 620, 0.3, 0.2);
  };
  S.pressure_core_hum = function (t) {    // Core online: deep chord bloom
    tone({ t: t, type: 'sine', f0: 55, f1: 55, dur: 1.2, peak: 0.4,
           a: 0.3, d: 0.4, s: 0.0001, r: 0.5 });
    tone({ t: t, type: 'sine', f0: 82.5, f1: 82.5, dur: 1.2, peak: 0.25,
           a: 0.35, d: 0.4, s: 0.0001, r: 0.45 });
    tone({ t: t, type: 'sine', f0: 110, f1: 110, dur: 1.2, peak: 0.18,
           a: 0.4, d: 0.4, s: 0.0001, r: 0.4 });
  };

  // --- Wave flow ----------------------------------------------------------
  S.wave_start = function (t) {           // dive horn: foghorn through water
    groan(t, 130, 65, 1.4, 0.5);
    groan(t + 0.15, 196, 98, 1.2, 0.35);
  };
  S.wave_clear = function (t) {           // relief: sonar triad rising
    ping(t, 784, 0.25, 0.3);
    ping(t + 0.16, 988, 0.25, 0.3);
    ping(t + 0.32, 1175, 0.28, 0.45);
  };
  S.boss_warning = function (t) {         // the trench itself speaks
    groan(t, 60, 30, 2.2, 0.6);
    for (var i = 0; i < 3; i++) {
      tone({ t: t + 0.5 + i * 0.45, type: 'square', f0: 98, f1: 92, dur: 0.3,
             peak: 0.3, a: 0.02, d: 0.1, s: 0.0001, r: 0.18 });
    }
    noise({ t: t, dur: 2.0, peak: 0.12, type: 'lowpass', freq: 200, sweepTo: 70,
            a: 0.5, r: 1.2 });
  };
  S.boss_die = function (t) {             // colossal death: long pressure release
    groan(t, 120, 25, 2.5, 0.6);
    noise({ t: t + 0.2, dur: 1.8, peak: 0.35, type: 'lowpass', freq: 800,
            sweepTo: 50, a: 0.2, r: 1.2 });
    for (var i = 0; i < 4; i++) {
      clank(t + 0.3 + i * 0.35, 110 - i * 12, 0.5, 0.6);
    }
    ping(t + 1.6, 1568, 0.2, 0.6);
  };
  S.mutation_alert = function (t) {        // the director's motif: dissonant sonar
    ping(t, 1108, 0.28, 0.35);
    ping(t + 0.22, 1174, 0.28, 0.35);   // minor 2nd rub = "wrong"
    ping(t + 0.44, 1108, 0.22, 0.5);
    groan(t + 0.1, 90, 60, 0.8, 0.25);
  };
  S.countdown_tick = function (t) {       // prep-phase tick
    if (!gate('countdown_tick', 300)) return;
    ping(t, 2093, 0.12, 0.08);
  };
  S.countdown_go = function (t) {         // final tick: lower, longer
    ping(t, 1568, 0.25, 0.25);
  };

  // --- Narrative beats ----------------------------------------------------
  S.story_beat = function (t) {           // soft chime bed for dialogue scenes
    ping(t, 1319, 0.18, 0.6);
    ping(t + 0.3, 1760, 0.14, 0.7);
    tone({ t: t, type: 'sine', f0: 65, f1: 60, dur: 1.4, peak: 0.2,
           a: 0.4, d: 0.5, s: 0.0001, r: 0.5 });
  };
  S.branching_choice = function (t) {     // decision: two tones, unresolved
    ping(t, 988, 0.22, 0.4);
    ping(t + 0.28, 1046, 0.22, 0.55);
  };

  // --- Endings & stingers ---------------------------------------------------
  S.victory = function (t) {              // SEAL THE TRENCH: triumphant, then somber
    var seq = [523, 659, 784, 1046, 784, 659];
    for (var i = 0; i < seq.length; i++) {
      ping(t + i * 0.14, seq[i], 0.3, 0.4);
    }
    groan(t + 0.9, 110, 55, 1.6, 0.35);   // the colony's cost underneath
  };
  S.victory_feed = function (t) {         // FEED THE HEART: warm endless swell
    tone({ t: t, type: 'sine', f0: 110, f1: 110, dur: 2.4, peak: 0.4,
           a: 0.6, d: 0.8, s: 0.0001, r: 1.0 });
    tone({ t: t + 0.2, type: 'sine', f0: 165, f1: 165, dur: 2.2, peak: 0.3,
           a: 0.7, d: 0.7, s: 0.0001, r: 0.8 });
    tone({ t: t + 0.4, type: 'sine', f0: 220, f1: 220, dur: 2.0, peak: 0.24,
           a: 0.8, d: 0.6, s: 0.0001, r: 0.6 });
    for (var i = 0; i < 6; i++) {
      blip(t + 0.3 + i * 0.3, 1800 + i * 200, 2200 + i * 250, 0.12, 0.08);
    }
  };
  S.victory_descend = function (t) {       // DESCEND: ping into the deep
    ping(t, 1568, 0.25, 0.5);
    ping(t + 0.5, 1175, 0.22, 0.6);
    ping(t + 1.0, 784, 0.2, 0.8);
    groan(t + 1.2, 80, 30, 2.0, 0.35);
    ping(t + 2.4, 2093, 0.12, 1.2);       // coordinates resolving, far away
  };
  S.defeat = function (t) {               // the rig falls: crush + silence
    groan(t, 100, 28, 2.0, 0.6);
    clank(t + 0.2, 90, 0.7, 0.8);
    clank(t + 0.7, 70, 0.7, 0.9);
    noise({ t: t + 0.4, dur: 1.6, peak: 0.35, type: 'lowpass', freq: 500,
            sweepTo: 40, a: 0.1, r: 1.2 });
    ping(t + 2.2, 880, 0.1, 1.5);          // one last sonar, unanswered
  };
  S.game_over = S.defeat;

  /* ---------------------------- ambience -------------------------------- */
  // Deep trench bed: slow sub-pulse + whale-like filtered noise + sparse sonar.
  // Runs on ambBus so UI ducking/stingers can sit above it.
  function startAmbient() {
    var c = ensureCtx(); if (!c || ambTimer) return;
    var t0 = c.currentTime + 0.1;
    // Layer 1: slow 48s-cycle sub drone (two detuned sines through lowpass)
    var droneG = c.createGain(); droneG.gain.value = 0.16;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 120;
    var o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = 41;
    var o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 41.7;
    o1.connect(lp); o2.connect(lp); lp.connect(droneG); droneG.connect(ambBus);
    o1.start(t0); o2.start(t0);
    // Layer 2: slow breathing LFO on the drone gain (pressure swells)
    var lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 1 / 24;
    var lfoG = c.createGain(); lfoG.gain.value = 0.07;
    lfo.connect(lfoG); lfoG.connect(droneG.gain);
    lfo.start(t0);
    // Layer 3: looping filtered noise = distant current (bandpassed, wandering)
    var nsrc = c.createBufferSource(); nsrc.buffer = noiseBuf; nsrc.loop = true;
    var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 240;
    bp.Q.value = 0.6;
    var ng = c.createGain(); ng.gain.value = 0.05;
    var wlfo = c.createOscillator(); wlfo.type = 'sine'; wlfo.frequency.value = 1 / 37;
    var wlfoG = c.createGain(); wlfoG.gain.value = 130;
    wlfo.connect(wlfoG); wlfoG.connect(bp.frequency);
    nsrc.connect(bp); bp.connect(ng); ng.connect(ambBus);
    nsrc.start(t0); wlfo.start(t0);
    ambNodes = [o1, o2, lfo, nsrc, wlfo];
    // Layer 4: sparse random deep pings + occasional groans (scheduled)
    function schedule() {
      var now = c.currentTime;
      var r = Math.random();
      if (r < 0.55) {
        var fq = [660, 740, 880, 988][Math.floor(Math.random() * 4)];
        ping(now + 0.1, fq, 0.06, 1.2);
      } else if (r < 0.8) {
        for (var i = 0; i < 3; i++) {
          blip(now + 0.1 + i * 0.18, 1200 + Math.random() * 800,
               1800 + Math.random() * 900, 0.15, 0.04);
        }
      } else {
        groan(now + 0.1, 70 + Math.random() * 40, 35, 3.5, 0.1);
      }
      ambTimer = setTimeout(schedule, 9000 + Math.random() * 14000);
    }
    ambTimer = setTimeout(schedule, 2500);
    // Fade the bed in gently
    ambBus.gain.setValueAtTime(0.0001, t0);
    ambBus.gain.exponentialRampToValueAtTime(0.5, t0 + 4);
  }

  function stopAmbient() {
    if (ambTimer) { clearTimeout(ambTimer); ambTimer = null; }
    if (ambNodes) {
      var t = ctx.currentTime;
      ambBus.gain.cancelScheduledValues(t);
      ambBus.gain.setValueAtTime(Math.max(0.0001, ambBus.gain.value), t);
      ambBus.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      var nodes = ambNodes; ambNodes = null;
      setTimeout(function () {
        for (var i = 0; i < nodes.length; i++) {
          try { nodes[i].stop(); } catch (e) {}
          try { nodes[i].disconnect(); } catch (e) {}
        }
        ambBus.gain.value = 0.5;
      }, 1400);
    }
  }

  /* ------------------------------ public -------------------------------- */

  var api = {
    sounds: Object.keys(S),

    init: function () { ensureCtx(); return !!ctx; },

    play: function (name) {
      var c = ensureCtx(); if (!c || !S[name]) return false;
      S[name](c.currentTime + 0.01);
      return true;
    },

    setMuted: function (m) {
      muted = !!m;
      var c = ensureCtx(); if (!c) return;
      master.gain.setTargetAtTime(muted ? 0.0001 : 0.9, c.currentTime, 0.03);
    },

    isMuted: function () { return muted; },

    // Temporarily dip ambience under a stinger (e.g. victory/defeat).
    duckAmbient: function (dur) {
      if (!ctx || !ambTimer) return;
      var t = ctx.currentTime;
      ambBus.gain.cancelScheduledValues(t);
      ambBus.gain.setValueAtTime(ambBus.gain.value, t);
      ambBus.gain.exponentialRampToValueAtTime(0.12, t + 0.4);
      ambBus.gain.exponentialRampToValueAtTime(0.5, t + (dur || 3) + 0.8);
    },

    startAmbient: startAmbient,
    stopAmbient: stopAmbient,

    // QA hook: plays every registered sound in sequence, ~0.9s apart,
    // logging each name to the console. In headless runs the log still
    // proves the scheduler reached every sound without throwing.
    test: function () {
      var c = ensureCtx(); if (!c) { console.log('[audio] no AudioContext'); return; }
      var names = Object.keys(S);
      console.log('[audio] testing ' + names.length + ' sounds...');
      var t = c.currentTime + 0.2;
      names.forEach(function (n, i) {
        (function (name, tt) {
          setTimeout(function () {
            console.log('[audio] test: ' + name);
            try { S[name](tt); } catch (e) { console.error('[audio] FAILED: ' + name, e); }
          }, i * 900);
        })(n, t + i * 0.9);
      });
      setTimeout(function () { console.log('[audio] test complete'); }, names.length * 900 + 500);
    }
  };

  root.DeepholdAudio = api;
})(typeof window !== 'undefined' ? window : this);
