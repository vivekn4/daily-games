'use strict';
// ---------- title, prologue, game over, ending, main loop ----------

class Title {
  constructor() { this.t = 0; this.started = false; this.nav = new ListNav(3); Audio8.play('title'); }
  opts() { return ['New Game', 'Continue', 'Options']; }
  update() {
    this.t++;
    if (!this.started) {
      if (Input.hit('ok') || Input.hit('cancel')) { Audio8.unlock(); Audio8.play('title'); Audio8.sfx('ok'); this.started = true; this.nav.i = anySave() ? 1 : 0; }
      return;
    }
    this.nav.update();
    if (Input.hit('ok')) {
      const o = this.opts()[this.nav.i];
      if (o === 'New Game') { Audio8.sfx('ok'); startNewGame(); }
      else if (o === 'Continue') {
        if (!anySave()) { Audio8.sfx('buzz'); return; }
        Audio8.sfx('ok');
        Scenes.push(new SaveMenu('load', slot => continueGame(slot)));
      } else { Audio8.sfx('ok'); Scenes.push(new OptionsMenu()); }
    }
  }
  draw() {
    ctx.drawImage(IMG.title, 0, 0);
    // twinkle
    if ((this.t >> 3) % 6 === 0) rect(60 + (this.t % 120), 100, 1, 1, '#fff');
    textC('A tale of four shards', 128, 64, 'cyan');
    if (!this.started) {
      if ((this.t >> 5) % 2 === 0) textC('PRESS Z OR ENTER', 128, 172, 'white');
    } else {
      win(80, 160, 96, 54);
      this.opts().forEach((o, i) => text(o, 100, 168 + i * 14, o === 'Continue' && !anySave() ? 'gray' : 'white'));
      cursor(86, 168 + this.nav.i * 14);
    }
    text('v1.0', 4, 214, 'dark', false);
    textR('2026', 252, 214, 'dark');
  }
}

class Prologue {
  constructor(lines, done) { this.lines = lines; this.done = done; this.i = 0; this.t = 0; }
  update() {
    this.t++;
    if ((Input.hit('ok') && this.t > 20) || this.t > 330) {
      this.i++; this.t = 0;
      if (this.i >= this.lines.length) { Scenes.pop(this); this.done(); }
    }
    if (Input.hit('cancel')) { Scenes.pop(this); this.done(); }
  }
  draw() {
    rect(0, 0, SW, SH, '#000');
    const a = Math.min(1, this.t / 30);
    ctx.globalAlpha = a;
    const ls = wrapText(this.lines[this.i] || '', 28);
    ls.forEach((l, k) => textC(l, 128, 90 - ls.length * 6 + k * 14, 'white'));
    ctx.globalAlpha = 1;
    text('X/B: skip', 174, 212, 'dark', false);
  }
}

function startNewGame() {
  newGame();
  Scenes.clear();
  Audio8.play('sad');
  Scenes.push(new Prologue(PROLOGUE, () => {
    Scenes.clear();
    const f = new Field();
    Scenes.push(f);
    f.load(G.map, G.x, G.y, G.dir);
    Fade.a = 1; Fade.target = 0; Fade.speed = 0.04;
  }));
}
function continueGame(slot) {
  if (!loadGame(slot)) return;
  Scenes.clear();
  const f = new Field();
  Scenes.push(f);
  f.load(G.map, G.x, G.y, G.dir);
  Fade.a = 1; Fade.target = 0; Fade.speed = 0.06;
}

class GameOver {
  constructor() { this.t = 0; this.nav = new ListNav(2); Fade.a = 0; Fade.target = 0; }
  update() {
    this.t++;
    if (this.t < 60) return;
    this.nav.update();
    if (Input.hit('ok')) {
      Audio8.sfx('ok');
      if (this.nav.i === 0 && anySave()) Scenes.push(new SaveMenu('load', slot => continueGame(slot)));
      else { Scenes.clear(); Scenes.push(new Title()); }
    }
  }
  draw() {
    rect(0, 0, SW, SH, '#000');
    const a = Math.min(1, this.t / 60);
    ctx.globalAlpha = a;
    textC('GAME OVER', 128, 80, 'red');
    textC('The darkness spreads...', 128, 100, 'gray');
    ctx.globalAlpha = 1;
    if (this.t >= 60) {
      text('Load Game', 92, 140, anySave() ? 'white' : 'gray'); text('Title', 92, 156);
      cursor(78, 140 + this.nav.i * 16);
    }
  }
}

class Ending {
  constructor(cb) { this.cb = cb; this.y = SH + 10; this.t = 0; Audio8.play('ending'); }
  update() {
    this.t++;
    this.y -= Input.isDown('ok') ? 1.5 : 0.35;
    const h = CREDITS.length * 16;
    if (this.y < -h + 100) {
      this.y = -h + 100;
      if (Input.hit('ok') && this.t > 200) { Scenes.pop(this); this.cb(); }
    }
  }
  draw() {
    rect(0, 0, SW, SH, '#05030c');
    for (let i = 0; i < 40; i++) rect((i * 97 + (this.t >> 2)) % SW, (i * 53) % SH, 1, 1, i % 3 ? '#556' : '#aac');
    CREDITS.forEach((c, i) => {
      const y = this.y + i * 16;
      if (y < -10 || y > SH) return;
      if (typeof c === 'string') textC(c, 128, y, c === c.toUpperCase() && c.length > 2 ? 'yellow' : 'white');
      else if (c.party) { G.party.forEach((p, k) => { ctx.save(); ctx.translate(92 + k * 28, y - 8); ctx.scale(2, 2); drawChar(HEROES[p].sprite, 'down', [0, 1, 0, 2][((this.t >> 3) + k) % 4], 0, 0); ctx.restore(); }); }
      else if (c.time) textC('Clear time ' + fmtTime(G.time), 128, y, 'cyan');
    });
  }
}

// ---------- boot & loop ----------
let last = 0, acc = 0;
function loop(ts) {
  const dt = Math.min(100, ts - (last || ts));
  last = ts; acc += dt;
  let steps = 0;
  while (acc >= 1000 / 60 && steps < 4) {
    acc -= 1000 / 60; steps++;
    FRAME++;
    Input.update();
    const top = Scenes.top();
    if (top && top.update) top.update();
    updateFade();
  }
  ctx.save();
  if (Shake.t > 0) { Shake.t--; ctx.translate(rnd(-Shake.mag, Shake.mag), rnd(-Shake.mag, Shake.mag)); }
  rect(0, 0, SW, SH, '#000');
  // draw from the lowest opaque scene up
  let start = 0;
  for (let i = Scenes.stack.length - 1; i >= 0; i--) { const s = Scenes.stack[i]; if (s instanceof Field || s instanceof Battle || s instanceof Title || s instanceof GameOver || s instanceof Prologue || s instanceof Ending) { start = i; break; } }
  for (let i = start; i < Scenes.stack.length; i++) Scenes.stack[i].draw();
  ctx.restore();
  if (Fade.a > 0) { ctx.globalAlpha = Fade.a; rect(0, 0, SW, SH, Fade.col); ctx.globalAlpha = 1; }
  requestAnimationFrame(loop);
}

async function boot() {
  resize();
  setupTouch();
  const names = ['font', 'tiles', 'objects', 'chars', 'enemies', 'bosses', 'title', ...MANIFEST.bgs.map(b => 'bg_' + b)];
  try { await loadImages(names); }
  catch (e) {
    ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.fillText(String(e.message), 8, 20);
    return;
  }
  buildIndexes(); buildFonts();
  loadSettings();
  const hide = document.getElementById('loading'); if (hide) hide.style.display = 'none';
  Scenes.push(new Title());
  requestAnimationFrame(loop);
}
window.addEventListener('load', boot);
