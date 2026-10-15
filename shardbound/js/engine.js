'use strict';
// ---------- core: canvas, assets, input, drawing, scenes ----------
const SW = 256, SH = 224, TS = 16;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const IMG = {};
let FRAME = 0;

function loadImages(names) {
  return Promise.all(names.map(n => new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => { IMG[n] = i; res(); };
    i.onerror = () => rej(new Error('Could not load ' + n));
    i.src = 'assets/' + n + '.png';
  })));
}

function resize() {
  const wrap = document.getElementById('wrap');
  const w = wrap.clientWidth, h = wrap.clientHeight;
  let s = Math.min(w / SW, h / SH);
  if (s >= 1) s = Math.max(1, Math.floor(s * 4) / 4);
  canvas.style.width = Math.floor(SW * s) + 'px';
  canvas.style.height = Math.floor(SH * s) + 'px';
}
window.addEventListener('resize', resize);

// ---------- input ----------
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right', KeyZ: 'ok', Space: 'ok', Enter: 'ok', KeyJ: 'ok',
  KeyX: 'cancel', Escape: 'cancel', Backspace: 'cancel', KeyK: 'cancel',
  ShiftLeft: 'run', ShiftRight: 'run', KeyM: 'mute',
};
const Input = {
  down: {}, prev: {}, pressed: {}, held: {}, touch: {}, pad: {}, latch: {},
  update() {
    const all = {};
    for (const k in this.down) if (this.down[k]) all[k] = true;
    for (const k in this.touch) if (this.touch[k]) all[k] = true;
    for (const k in this.latch) if (this.latch[k]) all[k] = true;
    this.latch = {};
    this.pollPad();
    for (const k in this.pad) if (this.pad[k]) all[k] = true;
    for (const a of ['up', 'down', 'left', 'right', 'ok', 'cancel', 'run', 'mute']) {
      const d = !!all[a];
      this.pressed[a] = d && !this.prev[a];
      this.held[a] = d ? (this.held[a] || 0) + 1 : 0;
      this.prev[a] = d;
    }
    if (this.pressed.mute) Audio8.toggleMute();
  },
  isDown(a) { return this.held[a] > 0; },
  hit(a) { return this.pressed[a]; },
  // menu-style repeat
  rep(a) { const h = this.held[a]; return h === 1 || (h > 18 && h % 5 === 0); },
  dirHeld() {
    for (const d of ['up', 'down', 'left', 'right']) if (this.held[d] > 0) return d;
    return null;
  },
  pollPad() {
    this.pad = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const b = i => p.buttons[i] && p.buttons[i].pressed;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (b(12) || ay < -0.5) this.pad.up = true;
      if (b(13) || ay > 0.5) this.pad.down = true;
      if (b(14) || ax < -0.5) this.pad.left = true;
      if (b(15) || ax > 0.5) this.pad.right = true;
      if (b(0)) this.pad.ok = true;
      if (b(1) || b(9)) this.pad.cancel = true;
      if (b(2) || b(7)) this.pad.run = true;
    }
  },
};
window.addEventListener('keydown', e => {
  const a = KEYMAP[e.code];
  if (a) { if (!e.repeat) Input.latch[a] = true; Input.down[a] = true; e.preventDefault(); }
  Audio8.unlock();
});
window.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) Input.down[a] = false; });
window.addEventListener('blur', () => { Input.down = {}; Input.touch = {}; });
// itch.io embeds the game in an iframe: a click must focus it and unlock audio
window.addEventListener('pointerdown', () => { window.focus(); Audio8.unlock(); });

function setupTouch() {
  const pad = document.getElementById('touch');
  if (!pad) return;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return;
  pad.style.display = 'block';
  for (const el of pad.querySelectorAll('[data-a]')) {
    const a = el.dataset.a;
    const on = e => { e.preventDefault(); Input.touch[a] = true; Input.latch[a] = true; el.classList.add('on'); Audio8.unlock(); };
    const off = e => { e.preventDefault(); Input.touch[a] = false; el.classList.remove('on'); };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
  }
}

// ---------- drawing ----------
const COL = {
  white: '#fcfcfc', gray: '#a0a0b0', dark: '#585868', yellow: '#f8d850', red: '#f85838', green: '#78f878',
  blue: '#78c8fc', purple: '#c8a0fc', orange: '#fca044', black: '#181020', cyan: '#58f8e8',
};
const FONT = {};
function buildFonts() {
  for (const k in COL) {
    const c = document.createElement('canvas');
    c.width = IMG.font.width; c.height = IMG.font.height;
    const x = c.getContext('2d');
    x.drawImage(IMG.font, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = COL[k];
    x.fillRect(0, 0, c.width, c.height);
    FONT[k] = c;
  }
}
function text(str, x, y, color = 'white', shadow = true) {
  str = String(str);
  x = Math.round(x); y = Math.round(y);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 32;
    if (code <= 0 || code > 94) continue;
    const sx = (code % 16) * 8, sy = (code >> 4) * 8;
    if (shadow) ctx.drawImage(FONT.black, sx, sy, 8, 8, x + i * 8 + 1, y + 1, 8, 8);
    ctx.drawImage(FONT[color] || FONT.white, sx, sy, 8, 8, x + i * 8, y, 8, 8);
  }
}
function textR(str, rx, y, color) { text(str, rx - String(str).length * 8, y, color); }
function textC(str, cx, y, color) { text(str, Math.round(cx - String(str).length * 4), y, color); }

function wrapText(str, maxChars) {
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      if ((line + (line ? ' ' : '') + w).length > maxChars) { if (line) out.push(line); line = w; }
      else line += (line ? ' ' : '') + w;
    }
    out.push(line);
  }
  return out;
}

function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

function win(x, y, w, h) {
  // classic blue RPG window
  rect(x + 1, y + 1, w - 2, h - 2, '#0c1048');
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#2838b8'); g.addColorStop(1, '#101860');
  ctx.fillStyle = g; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = '#fcfcfc';
  ctx.fillRect(x + 2, y, w - 4, 1); ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
  ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
  ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1);
  ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
  ctx.fillStyle = '#9098c8';
  ctx.fillRect(x + 2, y + 1, w - 4, 1); ctx.fillRect(x + 1, y + 2, 1, h - 4);
}

function cursor(x, y) {
  // little pointing hand
  const bob = (FRAME >> 3) % 2;
  x += bob;
  rect(x, y + 2, 6, 3, COL.black);
  rect(x + 1, y + 1, 5, 4, COL.white); rect(x + 6, y + 2, 2, 2, COL.white);
  rect(x, y + 3, 1, 1, COL.white);
  rect(x + 1, y + 4, 4, 1, COL.gray);
}

function bar(x, y, w, cur, max, col) {
  rect(x, y, w, 3, '#000020');
  rect(x, y, Math.max(0, Math.round(w * cur / Math.max(1, max))), 3, col);
}

const TILE_IDX = {}, OBJ_IDX = {}, CHAR_IDX = {}, ENEMY_IDX = {}, BOSS_IDX = {};
function buildIndexes() {
  MANIFEST.tiles.forEach((n, i) => TILE_IDX[n] = i);
  MANIFEST.objects.forEach((n, i) => OBJ_IDX[n] = i);
  MANIFEST.chars.forEach((n, i) => CHAR_IDX[n] = i);
  MANIFEST.enemies.forEach((n, i) => ENEMY_IDX[n] = i);
  MANIFEST.bosses.forEach((n, i) => BOSS_IDX[n] = i);
}
function drawTile(name, x, y) {
  const i = TILE_IDX[name];
  if (i === undefined) return;
  ctx.drawImage(IMG.tiles, (i % 16) * 16, (i >> 4) * 16, 16, 16, x, y, 16, 16);
}
function drawObj(name, x, y) {
  const i = OBJ_IDX[name];
  if (i === undefined) return;
  ctx.drawImage(IMG.objects, (i % 16) * 16, (i >> 4) * 16, 16, 16, x, y, 16, 16);
}
const DIR_I = { down: 0, up: 1, left: 2, right: 3 };
function drawChar(name, dir, frame, x, y) {
  const r = CHAR_IDX[name];
  if (r === undefined) return;
  ctx.drawImage(IMG.chars, (DIR_I[dir] * 3 + frame) * 16, r * 16, 16, 16, Math.round(x), Math.round(y), 16, 16);
}
function drawEnemy(id, x, y, scale = 1) {
  if (BOSS_IDX[id] !== undefined) {
    const i = BOSS_IDX[id];
    ctx.drawImage(IMG.bosses, i * 32, 0, 32, 32, Math.round(x), Math.round(y), 32 * scale, 32 * scale);
    return;
  }
  const i = ENEMY_IDX[id];
  ctx.drawImage(IMG.enemies, (i % 8) * 24, (i >> 3) * 24, 24, 24, Math.round(x), Math.round(y), 24 * scale, 24 * scale);
}
// silhouette/flash version of an enemy (white)
const flashCache = {};
function enemyCanvas(id, color) {
  const key = id + color;
  if (flashCache[key]) return flashCache[key];
  const boss = BOSS_IDX[id] !== undefined;
  const s = boss ? 32 : 24;
  const c = document.createElement('canvas'); c.width = s; c.height = s;
  const x = c.getContext('2d');
  if (boss) x.drawImage(IMG.bosses, BOSS_IDX[id] * 32, 0, 32, 32, 0, 0, 32, 32);
  else { const i = ENEMY_IDX[id]; x.drawImage(IMG.enemies, (i % 8) * 24, (i >> 3) * 24, 24, 24, 0, 0, 24, 24); }
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color; x.fillRect(0, 0, s, s);
  flashCache[key] = c;
  return c;
}

// ---------- scenes ----------
const Scenes = {
  stack: [],
  push(s) { this.stack.push(s); if (s.enter) s.enter(); return s; },
  pop(s) {
    const i = s ? this.stack.lastIndexOf(s) : this.stack.length - 1;
    if (i < 0) return;
    const [r] = this.stack.splice(i, 1);
    if (r.leave) r.leave();
    return r;
  },
  top() { return this.stack[this.stack.length - 1]; },
  clear() { while (this.stack.length) this.pop(); },
  find(type) { for (let i = this.stack.length - 1; i >= 0; i--) if (this.stack[i] instanceof type) return this.stack[i]; return null; },
};

// fade overlay
const Fade = { a: 0, target: 0, speed: 0.08, col: '#000' };
function updateFade() {
  if (Fade.a < Fade.target) Fade.a = Math.min(Fade.target, Fade.a + Fade.speed);
  else if (Fade.a > Fade.target) Fade.a = Math.max(Fade.target, Fade.a - Fade.speed);
}

// screen shake
const Shake = { t: 0, mag: 0 };

// ---------- script runner (generator based) ----------
// A script is a generator; it yields "waiters". A waiter is an object with
// done (bool), optional tick() called each frame, and optional result.
class Runner {
  constructor(gen) {
    this.gen = gen; this.wait = null; this.finished = false;
    this.step(undefined);
  }
  step(val) {
    for (let guard = 0; guard < 1000; guard++) {
      let r;
      try { r = this.gen.next(val); } catch (e) { console.error(e); this.finished = true; return; }
      if (r.done) { this.finished = true; this.result = r.value; return; }
      const w = r.value;
      if (w && !w.done) { this.wait = w; return; }
      val = w ? w.result : undefined;
    }
    // too many instant steps in one frame: resume next frame instead of stalling
    this.wait = { done: true, result: val };
  }
  update() {
    if (this.finished) return;
    if (this.wait) {
      if (this.wait.tick) this.wait.tick();
      if (!this.wait.done) return;
      const v = this.wait.result; this.wait = null; this.step(v);
    }
  }
}
function waiter(tick) { const w = { done: false, result: undefined }; if (tick) w.tick = () => tick(w); return w; }
function wait(frames) { let n = frames; return waiter(w => { if (--n <= 0) w.done = true; }); }
function fadeOut(speed = 0.08) { Fade.target = 1; Fade.speed = speed; return waiter(w => { if (Fade.a >= 1) w.done = true; }); }
function fadeIn(speed = 0.08) { Fade.target = 0; Fade.speed = speed; return waiter(w => { if (Fade.a <= 0) w.done = true; }); }
function shake(frames = 20, mag = 3) { Shake.t = frames; Shake.mag = mag; return wait(frames); }
function done(result) { return { done: true, result }; }

// ---------- utility ----------
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const chance = p => Math.random() < p;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
