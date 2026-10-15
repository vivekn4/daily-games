'use strict';
// ---------- 8-bit synth: pulse/triangle/noise music sequencer + sfx ----------
const NOTE_BASE = { c: 0, 'c#': 1, d: 2, 'd#': 3, e: 4, f: 5, 'f#': 6, g: 7, 'g#': 8, a: 9, 'a#': 10, b: 11 };
function noteFreq(n) {
  const m = /^([a-g]#?)(\d)$/.exec(n);
  if (!m) return 0;
  const midi = 12 * (+m[2] + 1) + NOTE_BASE[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function parseSeq(str) {
  // tokens "c4:2" (note, steps) ; "r:4" rest ; drums "k:2" "s:2" "h:1"
  const ev = []; let t = 0;
  for (const tok of str.replace(/\|/g, ' ').split(/\s+/)) {
    if (!tok) continue;
    const [n, l] = tok.split(':');
    const len = +(l || 1);
    if (n !== 'r') ev.push({ t, n, len });
    t += len;
  }
  return { ev, len: t };
}

const MUSIC = {};
function track(name, bpm, chans, loop = true) { MUSIC[name] = { bpm, chans, loop }; }
const R = (s, n) => Array(n).fill(s).join(' ');

// --- Title / main theme (C major, heroic)
const THEME_MEL = 'e5:4 g5:4 c6:6 b5:2 | a5:4 g5:4 e5:8 | f5:4 a5:4 d6:6 c6:2 | b5:8 g5:8 | e5:4 g5:4 c6:6 d6:2 | e6:4 d6:4 c6:4 a5:4 | b5:4 g5:4 a5:4 b5:4 | c6:12 r:4';
const THEME_BASS = [
  R('c3:2 g3:2', 4), R('a2:2 e3:2', 4), R('f2:2 c3:2', 4), R('g2:2 d3:2', 4),
  R('c3:2 g3:2', 4), R('a2:2 e3:2', 4), R('g2:2 d3:2', 4), R('c3:2 g3:2', 4)].join(' | ');
const THEME_HARM = 'c5:8 e5:8 | c5:8 e5:8 | a4:8 c5:8 | b4:8 d5:8 | c5:8 e5:8 | c5:8 e5:8 | b4:8 d5:8 | e5:12 r:4';
track('title', 112, [
  { w: 'p25', v: 0.16, s: THEME_MEL },
  { w: 'p50', v: 0.06, s: THEME_HARM },
  { w: 'tri', v: 0.22, s: THEME_BASS },
]);
track('ending', 84, [
  { w: 'p25', v: 0.15, s: THEME_MEL },
  { w: 'p50', v: 0.06, s: THEME_HARM },
  { w: 'tri', v: 0.2, s: THEME_BASS },
]);

// --- Town (F major, cosy)
track('town', 104, [
  { w: 'p25', v: 0.14, s: 'a4:2 c5:2 f5:4 e5:2 d5:2 c5:4 | a#4:2 d5:2 f5:4 e5:4 c5:4 | a4:2 c5:2 f5:4 g5:2 a5:2 g5:4 | f5:2 e5:2 d5:2 e5:2 f5:8 | d5:2 f5:2 a#5:4 a5:2 g5:2 f5:4 | c5:2 e5:2 g5:4 f5:2 e5:2 d5:4 | a4:2 c5:2 f5:4 e5:2 g5:2 a5:2 g5:2 | f5:12 r:4' },
  { w: 'tri', v: 0.2, s: [R('f3:4', 4), R('a#2:4', 4), R('f3:4', 4), R('c3:4 c3:4 f3:4 f3:4', 1), R('a#2:4', 4), R('c3:4', 4), R('f3:4 f3:4 c3:4 c3:4', 1), R('f3:4', 4)].join(' ') },
  { w: 'p50', v: 0.05, s: R('f4:2 a4:2 c5:2 a4:2', 2) + ' ' + R('d4:2 f4:2 a#4:2 f4:2', 2) + ' ' + R('f4:2 a4:2 c5:2 a4:2', 2) + ' ' + R('e4:2 g4:2 c5:2 g4:2', 2) + ' ' + R('d4:2 f4:2 a#4:2 f4:2', 2) + ' ' + R('e4:2 g4:2 c5:2 g4:2', 2) + ' ' + R('f4:2 a4:2 c5:2 a4:2', 4) },
]);

// --- Castle (regal, G major, slow march)
track('castle', 92, [
  { w: 'p25', v: 0.14, s: 'g4:4 d5:4 b4:2 c5:2 d5:4 | e5:4 d5:4 c5:4 b4:4 | a4:4 c5:4 e5:4 d5:2 c5:2 | b4:8 d5:8 | g5:4 f#5:4 e5:4 d5:4 | c5:4 e5:4 d5:4 b4:4 | a4:4 d5:4 c5:2 b4:2 a4:4 | g4:12 r:4' },
  { w: 'tri', v: 0.2, s: R('g2:4 d3:4', 2) + ' ' + R('c3:4 g3:4', 2) + ' ' + R('a2:4 e3:4', 2) + ' ' + R('d3:4 a3:4', 2) + ' ' + R('e3:4 b3:4', 2) + ' ' + R('c3:4 g3:4', 2) + ' ' + R('d3:4 a3:4', 2) + ' ' + R('g2:4 d3:4', 2) },
  { w: 'noise', v: 0.04, s: R('k:4 h:4 s:4 h:4', 8) },
]);

// --- Overworld (D major, adventurous)
track('world', 132, [
  { w: 'p25', v: 0.14, s: 'd5:3 a4:1 d5:2 e5:2 f#5:4 e5:2 d5:2 | c#5:2 a4:2 e5:4 a4:8 | b4:3 g4:1 b4:2 c#5:2 d5:4 e5:2 f#5:2 | e5:6 c#5:2 a4:8 | d5:3 a4:1 d5:2 e5:2 f#5:4 g5:2 a5:2 | b5:4 a5:2 g5:2 f#5:4 e5:4 | g5:2 f#5:2 e5:2 d5:2 c#5:2 d5:2 e5:4 | d5:12 r:4' },
  { w: 'p50', v: 0.05, s: 'f#4:8 a4:8 | e4:8 c#4:8 | d4:8 g4:8 | a4:8 e4:8 | f#4:8 a4:8 | g4:8 b4:8 | a4:8 g4:8 | f#4:12 r:4' },
  { w: 'tri', v: 0.22, s: R('d3:2 a3:2', 4) + ' ' + R('a2:2 e3:2', 4) + ' ' + R('g2:2 d3:2', 4) + ' ' + R('a2:2 e3:2', 4) + ' ' + R('d3:2 a3:2', 4) + ' ' + R('g2:2 d3:2', 4) + ' ' + R('a2:2 e3:2', 4) + ' ' + R('d3:2 a3:2', 4) },
  { w: 'noise', v: 0.05, s: R('k:2 h:2 s:2 h:2', 16) },
]);

// --- Dungeon (A minor, mysterious)
track('dungeon', 108, [
  { w: 'p25', v: 0.12, s: 'a4:4 r:2 c5:2 b4:4 e4:4 | a4:2 b4:2 c5:2 d5:2 e5:8 | f5:4 r:2 e5:2 d5:4 a4:4 | g#4:12 r:4 | a4:4 r:2 c5:2 b4:4 e4:4 | f4:2 g4:2 a4:2 b4:2 c5:8 | d5:4 c5:2 b4:2 c5:4 b4:4 | a4:12 r:4' },
  { w: 'tri', v: 0.22, s: R('a2:2 r:2', 4) + ' ' + R('a2:2 r:2', 4) + ' ' + R('d3:2 r:2', 4) + ' ' + R('e3:2 r:2', 4) + ' ' + R('a2:2 r:2', 4) + ' ' + R('f2:2 r:2', 4) + ' ' + R('e2:2 r:2', 4) + ' ' + R('a2:2 r:2', 4) },
  { w: 'p50', v: 0.04, s: R('e5:1 r:3', 32) },
]);
// --- Ice cavern (E minor, sparkly)
track('ice', 96, [
  { w: 'p12', v: 0.11, s: 'e5:2 b5:2 g5:2 b5:2 e5:2 b5:2 g5:2 b5:2 | d5:2 a5:2 f#5:2 a5:2 d5:2 a5:2 f#5:2 a5:2 | c5:2 g5:2 e5:2 g5:2 c5:2 g5:2 e5:2 g5:2 | b4:2 f#5:2 d#5:2 f#5:2 b4:2 f#5:2 d#5:2 f#5:2' },
  { w: 'p25', v: 0.12, s: 'e4:8 g4:8 | f#4:8 a4:8 | g4:8 e4:8 | f#4:12 r:4' },
  { w: 'tri', v: 0.2, s: 'e3:16 | d3:16 | c3:16 | b2:16' },
]);
// --- Volcano (driving, D minor)
track('volcano', 126, [
  { w: 'p25', v: 0.13, s: 'd5:2 d5:2 f5:2 d5:2 g5:2 f5:2 e5:2 c5:2 | d5:4 a4:4 c5:4 a4:4 | a#4:2 a#4:2 d5:2 a#4:2 f5:2 e5:2 d5:2 c5:2 | a4:8 c#5:8' },
  { w: 'tri', v: 0.22, s: R('d3:2', 8) + ' ' + R('d3:2', 8) + ' ' + R('a#2:2', 8) + ' ' + R('a2:2', 8) },
  { w: 'noise', v: 0.06, s: R('k:2 h:1 h:1 s:2 h:2', 8) },
]);
// --- Temple (watery, D dorian)
track('temple', 100, [
  { w: 'p25', v: 0.12, s: 'd5:4 e5:2 f5:2 a5:4 g5:4 | f5:2 e5:2 d5:4 c5:8 | a#4:4 d5:4 f5:4 e5:2 d5:2 | e5:12 r:4 | d5:4 e5:2 f5:2 a5:4 c6:4 | a#5:2 a5:2 g5:4 f5:8 | e5:4 g5:4 f5:2 e5:2 c#5:4 | d5:12 r:4' },
  { w: 'tri', v: 0.2, s: R('d3:4 a3:4', 2) + ' ' + R('c3:4 g3:4', 2) + ' ' + R('a#2:4 f3:4', 2) + ' ' + R('a2:4 e3:4', 2) + ' ' + R('d3:4 a3:4', 2) + ' ' + R('g2:4 d3:4', 2) + ' ' + R('a2:4 e3:4', 2) + ' ' + R('d3:4 a3:4', 2) },
  { w: 'p12', v: 0.04, s: R('a5:1 r:1 d6:1 r:1', 32) },
]);
// --- Citadel (C minor, ominous)
track('citadel', 96, [
  { w: 'p25', v: 0.12, s: 'c5:4 d#5:4 g5:4 f#5:4 | f5:4 d#5:2 d5:2 d#5:8 | g#4:4 c5:4 d#5:4 d5:2 c5:2 | b4:12 r:4 | c5:4 d#5:4 g5:4 c6:4 | b5:4 g#5:4 g5:4 f5:4 | d#5:4 d5:4 c5:4 b4:4 | c5:12 r:4' },
  { w: 'tri', v: 0.22, s: R('c3:2 c3:2 r:4', 2) + ' ' + R('c3:2 c3:2 r:4', 2) + ' ' + R('g#2:2 g#2:2 r:4', 2) + ' ' + R('g2:2 g2:2 r:4', 2) + ' ' + R('c3:2 c3:2 r:4', 2) + ' ' + R('g#2:2 g#2:2 r:4', 2) + ' ' + R('g2:2 g2:2 r:4', 2) + ' ' + R('c3:2 c3:2 r:4', 2) },
  { w: 'noise', v: 0.04, s: R('k:8 s:8', 8) },
]);

// --- Battle (E minor, fast)
track('battle', 160, [
  { w: 'p25', v: 0.14, s: 'e5:2 r:1 e5:1 g5:2 e5:2 a5:2 g5:2 f#5:2 d5:2 | e5:4 b4:4 e5:2 f#5:2 g5:4 | a5:2 r:1 a5:1 c6:2 a5:2 b5:2 a5:2 g5:2 f#5:2 | g5:4 f#5:4 d#5:8 | e5:2 r:1 e5:1 g5:2 e5:2 a5:2 g5:2 f#5:2 d5:2 | e5:4 b4:4 e5:2 g5:2 b5:4 | c6:2 b5:2 a5:2 g5:2 f#5:2 g5:2 a5:2 f#5:2 | e5:12 r:4' },
  { w: 'p50', v: 0.05, s: 'b4:8 c5:8 | b4:8 e5:8 | c5:8 e5:8 | b4:8 f#4:8 | b4:8 c5:8 | b4:8 g4:8 | a4:8 d#5:8 | e5:12 r:4' },
  { w: 'tri', v: 0.22, s: R('e3:1 e3:1 e4:1 e3:1', 8) + ' ' + R('a2:1 a2:1 a3:1 a2:1', 4) + ' ' + R('b2:1 b2:1 b3:1 b2:1', 4) + ' ' + R('e3:1 e3:1 e4:1 e3:1', 8) + ' ' + R('a2:1 a2:1 a3:1 a2:1', 4) + ' ' + R('b2:1 b2:1 b3:1 b2:1', 4) },
  { w: 'noise', v: 0.06, s: R('k:2 h:2 s:2 h:2', 16) },
]);
// --- Boss (D minor, intense)
track('boss', 168, [
  { w: 'p25', v: 0.14, s: 'd5:2 d5:2 a5:2 d5:2 g5:2 d5:2 f5:2 e5:2 | d5:2 d5:2 a5:2 d5:2 a#5:4 a5:4 | c5:2 c5:2 g5:2 c5:2 f5:2 c5:2 e5:2 d5:2 | c#5:4 e5:4 a5:8 | d6:4 c6:4 a#5:4 a5:4 | g5:4 a5:4 a#5:8 | a5:2 g5:2 f5:2 e5:2 f5:2 e5:2 d5:2 c#5:2 | d5:12 r:4' },
  { w: 'p50', v: 0.05, s: R('d4:2 a4:2', 8) + ' ' + R('c4:2 g4:2', 4) + ' ' + R('a3:2 e4:2', 4) + ' ' + R('a#3:2 f4:2', 4) + ' ' + R('g3:2 d4:2', 4) + ' ' + R('a3:2 e4:2', 4) + ' ' + R('d4:2 a4:2', 4) },
  { w: 'tri', v: 0.24, s: R('d3:1 d3:1 d4:1 d3:1', 8) + ' ' + R('c3:1 c3:1 c4:1 c3:1', 4) + ' ' + R('a2:1 a2:1 a3:1 a2:1', 4) + ' ' + R('a#2:1 a#2:1 a#3:1 a#2:1', 4) + ' ' + R('g2:1 g2:1 g3:1 g2:1', 4) + ' ' + R('a2:1 a2:1 a3:1 a2:1', 4) + ' ' + R('d3:1 d3:1 d4:1 d3:1', 4) },
  { w: 'noise', v: 0.07, s: R('k:1 h:1 k:1 h:1 s:2 h:2', 16) },
]);
// --- Final boss (C minor)
track('final', 172, [
  { w: 'p25', v: 0.14, s: 'c5:2 d#5:2 g5:2 c6:2 b5:2 g5:2 g#5:2 g5:2 | f5:2 g5:2 g#5:2 g5:2 f5:2 d#5:2 d5:2 b4:2 | c5:2 d#5:2 g5:2 c6:2 d6:2 d#6:2 d6:2 c6:2 | b5:4 g5:4 d6:8 | g#5:4 g5:4 f5:4 d#5:4 | f5:4 d#5:4 d5:4 b4:4 | c5:2 d5:2 d#5:2 f5:2 g5:2 g#5:2 b5:2 d6:2 | c6:12 r:4' },
  { w: 'p50', v: 0.05, s: R('g4:2 c5:2', 8) + ' ' + R('g4:2 c5:2', 4) + ' ' + R('g4:2 b4:2', 4) + ' ' + R('g#4:2 c5:2', 4) + ' ' + R('g4:2 b4:2', 4) + ' ' + R('g4:2 c5:2', 8) },
  { w: 'tri', v: 0.24, s: R('c3:1 c3:1 c4:1 c3:1', 8) + ' ' + R('c3:1 c3:1 c4:1 c3:1', 4) + ' ' + R('g2:1 g2:1 g3:1 g2:1', 4) + ' ' + R('g#2:1 g#2:1 g#3:1 g#2:1', 4) + ' ' + R('g2:1 g2:1 g3:1 g2:1', 4) + ' ' + R('c3:1 c3:1 c4:1 c3:1', 8) },
  { w: 'noise', v: 0.07, s: R('k:1 h:1 s:1 h:1', 32) },
]);
track('victory', 150, [
  { w: 'p25', v: 0.15, s: 'c5:2 c5:2 c5:2 c5:6 g#4:6 a#4:6 c5:3 a#4:1 c5:12 r:8' },
  { w: 'p50', v: 0.07, s: 'e4:2 e4:2 e4:2 e4:6 c4:6 d4:6 e4:3 d4:1 e4:12 r:8' },
  { w: 'tri', v: 0.2, s: 'c3:2 c3:2 c3:2 c3:6 g#2:6 a#2:6 c3:4 c3:12 r:8' },
], false);
track('gameover', 70, [
  { w: 'p25', v: 0.13, s: 'e5:4 d5:4 c5:4 b4:4 a4:8 g#4:8 a4:16 r:16' },
  { w: 'tri', v: 0.2, s: 'a2:16 e2:16 a2:16 r:16' },
], false);
track('sad', 76, [
  { w: 'p25', v: 0.12, s: 'a4:4 c5:4 e5:4 d5:4 | c5:4 b4:4 a4:8 | f4:4 a4:4 c5:4 b4:4 | g#4:12 r:4' },
  { w: 'tri', v: 0.2, s: 'a2:16 | a2:16 | f2:16 | e2:16' },
]);

const Audio8 = {
  ctx: null, master: null, music: null, sfxBus: null, muted: false, current: null,
  timer: null, waves: {}, noiseBuf: null, musicVol: 0.8, sfxVol: 0.9,
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7; this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain(); this.music.gain.value = this.musicVol; this.music.connect(this.master);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.sfxVol; this.sfxBus.connect(this.master);
    for (const [k, duty] of [['p12', 0.125], ['p25', 0.25], ['p50', 0.5]]) {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
      this.waves[k] = this.ctx.createPeriodicWave(re, im);
    }
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.pending) { const p = this.pending; this.pending = null; this.play(p); }
  },
  setVolumes(m, s) {
    this.musicVol = m; this.sfxVol = s;
    if (this.music) this.music.gain.value = m;
    if (this.sfxBus) this.sfxBus.gain.value = s;
  },
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.7;
  },
  osc(type, freq, t0, dur, vol, bus, slideTo) {
    const c = this.ctx;
    const o = c.createOscillator();
    if (this.waves[type]) o.setPeriodicWave(this.waves[type]);
    else o.type = type === 'tri' ? 'triangle' : type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.006);
    g.gain.setValueAtTime(vol * 0.85, t0 + Math.max(0.01, dur * 0.6));
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    o.connect(g); g.connect(bus);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(t0, dur, vol, bus, hp = 1000) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
  },
  play(name) {
    if (this.currentName === name) return;
    this.stop();
    this.currentName = name;
    if (!this.ctx) { this.pending = name; return; }
    const tr = MUSIC[name];
    if (!tr) return;
    const step = 60 / tr.bpm / 4;
    const chans = tr.chans.map(ch => ({ ...ch, seq: parseSeq(ch.s), i: 0, loopStart: 0 }));
    const loopLen = Math.max(...chans.map(c => c.seq.len));
    const start = this.ctx.currentTime + 0.08;
    for (const c of chans) c.loopStart = start;
    const self = this;
    const id = {};
    this.current = id;
    const sched = () => {
      if (self.current !== id) return;
      const until = self.ctx.currentTime + 0.25;
      for (const c of chans) {
        for (let guard = 0; guard < 200; guard++) {
          if (c.i >= c.seq.ev.length) {
            if (!tr.loop) break;
            c.i = 0; c.loopStart += loopLen * step;
          }
          const e = c.seq.ev[c.i];
          if (!e) break;
          const t0 = c.loopStart + e.t * step;
          if (t0 > until) break;
          const dur = e.len * step * 0.92;
          if (t0 >= self.ctx.currentTime - 0.05) {
            if (c.w === 'noise') {
              if (e.n === 'k') self.osc('tri', 120, t0, 0.09, c.v * 2.4, self.music, 40);
              else if (e.n === 's') self.noise(t0, 0.12, c.v * 1.4, self.music, 1500);
              else self.noise(t0, 0.03, c.v * 0.8, self.music, 6000);
            } else {
              self.osc(c.w, noteFreq(e.n), t0, dur, c.v, self.music);
            }
          }
          c.i++;
        }
      }
    };
    sched();
    this.timer = setInterval(sched, 50);
  },
  stop() {
    this.current = null; this.currentName = null; this.pending = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.music && this.ctx) {
      // quick fade so scheduled notes cut cleanly
      const old = this.music;
      old.gain.setValueAtTime(old.gain.value, this.ctx.currentTime);
      old.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
      setTimeout(() => old.disconnect(), 400);
      this.music = this.ctx.createGain(); this.music.gain.value = this.musicVol; this.music.connect(this.master);
    }
  },
  sfx(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, b = this.sfxBus, O = (...a) => this.osc(...a);
    switch (name) {
      case 'cursor': O('p50', 880, t, 0.03, 0.08, b); break;
      case 'ok': O('p25', 660, t, 0.04, 0.1, b); O('p25', 990, t + 0.04, 0.06, 0.1, b); break;
      case 'cancel': O('p25', 440, t, 0.04, 0.1, b); O('p25', 330, t + 0.04, 0.06, 0.1, b); break;
      case 'buzz': O('p50', 110, t, 0.15, 0.12, b); break;
      case 'hit': this.noise(t, 0.12, 0.35, b, 600); O('p50', 200, t, 0.08, 0.1, b, 60); break;
      case 'crit': this.noise(t, 0.2, 0.45, b, 300); O('p25', 400, t, 0.15, 0.14, b, 80); break;
      case 'enemyhit': this.noise(t, 0.16, 0.3, b, 300); O('tri', 150, t, 0.12, 0.25, b, 50); break;
      case 'miss': O('p12', 900, t, 0.1, 0.06, b, 1400); break;
      case 'swing': this.noise(t, 0.06, 0.12, b, 4000); break;
      case 'fire': this.noise(t, 0.5, 0.3, b, 200); O('p50', 300, t, 0.4, 0.08, b, 80); break;
      case 'ice': for (let i = 0; i < 6; i++) O('p12', 1500 + i * 220, t + i * 0.04, 0.08, 0.07, b); break;
      case 'bolt': this.noise(t, 0.35, 0.4, b, 2000); O('p25', 1200, t, 0.25, 0.09, b, 100); break;
      case 'holy': for (let i = 0; i < 8; i++) O('p25', [523, 659, 784, 1047][i % 4] * (i < 4 ? 1 : 2), t + i * 0.05, 0.12, 0.07, b); break;
      case 'dark': O('p50', 220, t, 0.5, 0.12, b, 55); this.noise(t, 0.5, 0.15, b, 100); break;
      case 'heal': for (let i = 0; i < 5; i++) O('tri', [523, 659, 784, 1047, 1319][i], t + i * 0.06, 0.12, 0.2, b); break;
      case 'buff': O('p25', 400, t, 0.3, 0.1, b, 1200); break;
      case 'debuff': O('p25', 1000, t, 0.3, 0.1, b, 200); break;
      case 'poison': O('p50', 300, t, 0.08, 0.1, b); O('p50', 240, t + 0.1, 0.12, 0.1, b); break;
      case 'item': O('p25', 784, t, 0.08, 0.1, b); O('p25', 1047, t + 0.08, 0.08, 0.1, b); O('p25', 1319, t + 0.16, 0.16, 0.1, b); break;
      case 'chest': for (let i = 0; i < 4; i++) O('p25', [392, 523, 659, 784][i], t + i * 0.07, 0.1, 0.1, b); O('p25', 1047, t + 0.3, 0.3, 0.1, b); break;
      case 'key': O('p25', 1319, t, 0.08, 0.1, b); O('p25', 1568, t + 0.08, 0.2, 0.1, b); break;
      case 'coin': O('p25', 988, t, 0.06, 0.1, b); O('p25', 1319, t + 0.06, 0.15, 0.1, b); break;
      case 'stairs': for (let i = 0; i < 5; i++) O('p50', 600 - i * 80, t + i * 0.05, 0.06, 0.08, b); break;
      case 'door': this.noise(t, 0.1, 0.2, b, 800); O('tri', 180, t, 0.1, 0.2, b, 90); break;
      case 'encounter': for (let i = 0; i < 10; i++) O('p25', 200 + (i % 2) * 300 + i * 40, t + i * 0.035, 0.05, 0.08, b); break;
      case 'run': for (let i = 0; i < 6; i++) O('p12', 1200 - i * 150, t + i * 0.04, 0.05, 0.07, b); break;
      case 'death': O('p25', 600, t, 0.3, 0.1, b, 60); this.noise(t, 0.3, 0.2, b, 400); break;
      case 'switch': O('p50', 300, t, 0.05, 0.1, b); O('p50', 600, t + 0.05, 0.08, 0.1, b); break;
      case 'gate': this.noise(t, 0.4, 0.2, b, 200); O('tri', 90, t, 0.4, 0.25, b, 45); break;
      case 'save': for (let i = 0; i < 6; i++) O('p25', [523, 784, 659, 1047, 784, 1319][i], t + i * 0.08, 0.12, 0.08, b); break;
      case 'levelup': for (let i = 0; i < 7; i++) O('p25', [523, 659, 784, 659, 784, 1047, 1319][i], t + i * 0.07, i === 6 ? 0.4 : 0.08, 0.1, b); break;
      case 'shard': for (let i = 0; i < 12; i++) O(i % 2 ? 'p12' : 'p25', 523 * Math.pow(2, i / 6), t + i * 0.07, 0.2, 0.08, b); break;
      case 'quake': this.noise(t, 1.2, 0.4, b, 60); O('tri', 50, t, 1.2, 0.3, b, 30); break;
      case 'slide': O('p12', 700, t, 0.12, 0.05, b, 900); break;
      case 'push': this.noise(t, 0.15, 0.2, b, 200); break;
    }
  },
};
