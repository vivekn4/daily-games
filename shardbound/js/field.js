'use strict';
// ---------- field: maps, movement, entities, dialogue, script commands ----------

const SOLID_TILES = new Set([
  'water', 'black', 'lava', 'castlewall', 'templewall', 'citwall', 'housewall', 'roof', 'roofblue', 'rockwall',
  'icewall', 'volcwall', 'tree', 'pine', 'deadtree', 'mountain', 'snowmountain', 'rock', 'fence', 'sign', 'well',
  'statue', 'statuegold', 'counter', 'bed', 'table', 'shelf', 'barrel', 'pot', 'window', 'torch', 'crystalpillar',
]);
const ANIM_TILES = { water: ['water0', 'water1'], lava: ['lava0', 'lava1'], torch: ['torch0', 'torch1'] };
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

class Ent {
  constructor(o) {
    Object.assign(this, { dir: 'down', frame: 0, moving: false, speed: 1, path: null, wander: false, solid: true }, o);
    this.px = this.x * TS; this.py = this.y * TS;
    this.hx = this.x; this.hy = this.y; this.wt = rnd(60, 180); this.anim = 0;
  }
}

class Field {
  constructor() {
    this.ents = []; this.runner = null; this.banner = 0; this.encCounter = rnd(16, 30);
    this.queue = []; this.lastStepFrame = 0;
  }
  load(mapId, x, y, dir) {
    const m = MAPS[mapId];
    if (!m) throw new Error('No map ' + mapId);
    this.map = m; this.mapId = mapId;
    G.map = mapId; G.x = x; G.y = y; if (dir) G.dir = dir;
    this.h = m.rows.length; this.w = Math.max(...m.rows.map(r => r.length));
    this.grid = [];
    for (let j = 0; j < this.h; j++) {
      const row = [];
      for (let i = 0; i < this.w; i++) {
        const ch = m.rows[j][i] || ' ';
        let L = m.legend[ch] || m.legend[' '] || { t: 'black' };
        if (L.alt && flag(L.alt.flag)) L = { ...L, ...L.alt };
        const solid = L.solid !== undefined ? L.solid : (SOLID_TILES.has(L.t) || (L.o && SOLID_TILES.has(L.o)));
        row.push({ t: L.t, o: L.o, solid, ice: L.ice || L.t === 'icefloor', enc: L.enc !== false, ch });
      }
      this.grid.push(row);
    }
    this.player = new Ent({ id: 'player', x, y, dir: G.dir, sprite: G.party[0] });
    this.refreshEnts();
    this.banner = m.name && !m.noBanner ? 120 : 0;
    if (m.music) Audio8.play(typeof m.music === 'function' ? m.music() : m.music);
    this.encCounter = rnd(13, 26);
    if (m.onEnter) this.queue.push(m.onEnter);
  }
  refreshEnts() {
    const m = this.map;
    const keep = {};
    for (const e of this.ents) keep[e.id] = e;
    this.ents = [];
    for (const n of m.npcs || []) {
      if (n.show && !n.show()) continue;
      const old = keep[n.id];
      if (old && old.def === n) { this.ents.push(old); continue; }
      this.ents.push(new Ent({ ...n, def: n, kind: 'npc' }));
    }
    for (const o of m.objs || []) {
      if (o.show && !o.show()) continue;
      const old = keep[o.id];
      if (old && old.def === o) { this.ents.push(old); continue; }
      this.ents.push(new Ent({ solid: true, ...o, def: o, kind: 'obj' }));
    }
    for (const c of m.chests || []) {
      this.ents.push(new Ent({ id: 'chest_' + c.id, x: c.x, y: c.y, def: c, kind: 'chest' }));
    }
    for (const c of m.crystals || []) {
      this.ents.push(new Ent({ id: 'crystal_' + c.x + '_' + c.y, x: c.x, y: c.y, def: c, kind: 'crystal' }));
    }
  }
  ent(id) { return id === 'player' ? this.player : this.ents.find(e => e.id === id); }
  tile(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? null : this.grid[y][x]; }
  blocked(x, y, self) {
    const t = this.tile(x, y);
    if (!t || t.solid) return true;
    for (const e of this.ents) {
      if (e === self || !e.solid) continue;
      if ((e.x === x && e.y === y) || (e.moving && e.tx === x && e.ty === y)) return true;
    }
    if (self !== this.player) {
      const p = this.player;
      if ((p.x === x && p.y === y) || (p.moving && p.tx === x && p.ty === y)) return true;
    }
    return false;
  }
  startMove(e, dir) {
    e.dir = dir;
    const [dx, dy] = DIRS[dir];
    const nx = e.x + dx, ny = e.y + dy;
    if (this.blocked(nx, ny, e)) return false;
    e.moving = true; e.tx = nx; e.ty = ny;
    return true;
  }
  stepEnt(e) {
    if (!e.moving) return false;
    const sp = e === this.player ? (this.sliding ? 4 : (Input.isDown('run') ? 4 : 2)) : (e.fast ? 4 : 1);
    const gx = e.tx * TS, gy = e.ty * TS;
    e.px += Math.sign(gx - e.px) * Math.min(sp, Math.abs(gx - e.px));
    e.py += Math.sign(gy - e.py) * Math.min(sp, Math.abs(gy - e.py));
    e.anim++;
    if (e.px === gx && e.py === gy) { e.x = e.tx; e.y = e.ty; e.moving = false; return true; }
    return false;
  }
  update() {
    FRAME % 60 === 0 && (G.time += 1);
    if (this.banner > 0) this.banner--;
    // scripted / NPC movement
    for (const e of this.ents) {
      if (e.moving) this.stepEnt(e);
      else if (e.path && e.path.length) {
        const d = e.path.shift();
        if (d === 'wait') continue;
        if (d.startsWith('face:')) { e.dir = d.slice(5); continue; }
        if (!this.startMove(e, d)) { e.path.unshift(d); e.blockedFor = (e.blockedFor || 0) + 1; if (e.blockedFor > 90) { e.path = []; } }
        else e.blockedFor = 0;
      } else if (e.wander && !this.runner) {
        if (--e.wt <= 0) {
          e.wt = rnd(60, 200);
          const d = pick(['up', 'down', 'left', 'right']);
          const [dx, dy] = DIRS[d];
          if (Math.abs(e.x + dx - e.hx) <= 2 && Math.abs(e.y + dy - e.hy) <= 2) this.startMove(e, d);
          else e.dir = d;
        }
      }
    }
    // player scripted path
    const p = this.player;
    if (p.moving) {
      if (this.stepEnt(p)) this.onArrive();
    } else if (p.path && p.path.length) {
      const d = p.path.shift();
      if (d.startsWith('face:')) p.dir = d.slice(5);
      else if (d !== 'wait') { if (!this.startMove(p, d)) p.path = []; }
    }
    if (this.runner) {
      this.runner.update();
      if (this.runner.finished) { this.runner = null; this.refreshEnts(); }
      return;
    }
    if (this.queue.length) { this.run(this.queue.shift()); return; }
    if (p.moving || (p.path && p.path.length) || Fade.a > 0) return;
    // player input
    if (Input.hit('cancel')) { Audio8.sfx('ok'); Scenes.push(new PauseMenu()); return; }
    if (Input.hit('ok')) { this.interact(); return; }
    const d = Input.dirHeld();
    if (d) {
      if (p.dir !== d && Input.held[d] < 4 && !p.wasMoving) { p.dir = d; }
      else if (!this.startMove(p, d)) { p.dir = d; p.wasMoving = false; }
      else p.wasMoving = true;
    } else p.wasMoving = false;
  }
  onArrive() {
    const p = this.player;
    G.x = p.x; G.y = p.y; G.dir = p.dir; G.steps++;
    const t = this.tile(p.x, p.y);
    // ice sliding
    if (t && t.ice) {
      const [dx, dy] = DIRS[p.dir];
      if (!this.blocked(p.x + dx, p.y + dy, p)) {
        if (!this.checkStepEvents(p)) { this.sliding = true; this.startMove(p, p.dir); if (FRAME - this.lastStepFrame > 6) Audio8.sfx('slide'); this.lastStepFrame = FRAME; }
        return;
      }
    }
    this.sliding = false;
    if (this.checkStepEvents(p)) return;
    // encounters
    const enc = this.encounterHere(p.x, p.y);
    if (enc && t.enc) {
      this.encCounter -= SETTINGS.encounters === 0 ? 0.55 : 1;
      if (this.encCounter <= 0) {
        this.encCounter = rnd(13, 26);
        const grp = pick(GROUPS[enc.groups]);
        this.run(function* () { yield battle(grp, { bg: enc.bg }); });
      }
    }
  }
  checkStepEvents(p) {
    const m = this.map;
    for (const w of m.warps || []) {
      if (w.x === p.x && w.y === p.y && (!w.when || w.when())) {
        const self = this;
        this.sliding = false; p.moving = false;
        this.run(function* () {
          if (w.run) { const r = yield* w.run(); if (r === false) return; }
          Audio8.sfx(w.sfx || 'door');
          yield warp(w.to, w.tx, w.ty, w.dir || p.dir);
        });
        return true;
      }
    }
    for (const tr of m.triggers || []) {
      const inside = p.x >= tr.x && p.x < tr.x + (tr.w || 1) && p.y >= tr.y && p.y < tr.y + (tr.h || 1);
      if (!inside) continue;
      if (tr.once && flag(tr.once)) continue;
      if (tr.when && !tr.when()) continue;
      if (tr.once) setFlag(tr.once);
      this.sliding = false; p.moving = false;
      this.run(tr.run);
      return true;
    }
    return false;
  }
  encounterHere(x, y) {
    const m = this.map;
    if (m.encZones) {
      for (const z of m.encZones) if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return z;
      return null;
    }
    return m.enc || null;
  }
  interact() {
    const p = this.player;
    const [dx, dy] = DIRS[p.dir];
    let tx = p.x + dx, ty = p.y + dy;
    let target = this.ents.find(e => e.x === tx && e.y === ty && !(e.kind === 'obj' && !e.talk && !e.push));
    const t = this.tile(tx, ty);
    if (!target && t && t.o === 'counter') {
      tx += dx; ty += dy;
      target = this.ents.find(e => e.x === tx && e.y === ty && e.kind === 'npc');
    }
    if (target) {
      if (target.kind === 'npc' && target.talk) {
        const old = target.dir;
        if (!target.noFace) target.dir = OPP[p.dir];
        const self = this, tk = target.talk;
        this.run(function* () { yield* tk.call(target, target); if (!target.keepFace) target.dir = target.def.dir || old; });
        return;
      }
      if (target.kind === 'chest') { this.openChest(target.def); return; }
      if (target.kind === 'crystal') { this.run(crystalScript); return; }
      if (target.kind === 'obj') {
        if (target.push) { this.pushObj(target, p.dir); return; }
        if (target.talk) { const tk = target.talk; this.run(function* () { yield* tk.call(target, target); }); return; }
      }
    }
    const sign = (this.map.signs || []).find(s => s.x === tx && s.y === ty);
    if (sign) { this.run(function* () { yield say(null, ...[].concat(sign.text)); }); return; }
  }
  pushObj(o, dir) {
    const [dx, dy] = DIRS[dir];
    const nx = o.x + dx, ny = o.y + dy;
    if (this.blocked(nx, ny, o) || (this.map.pushStop && this.map.pushStop(nx, ny))) { Audio8.sfx('buzz'); return; }
    Audio8.sfx('push');
    o.moving = true; o.tx = nx; o.ty = ny; o.fast = true;
    if (o.onPush) { const op = o.onPush; const self = this; this.run(function* () { while (o.moving) yield wait(1); yield* op.call(o, o); }); }
  }
  openChest(c) {
    if (flag('chest_' + c.id)) { this.run(function* () { yield say(null, 'The chest is empty.'); }); return; }
    this.run(function* () {
      setFlag('chest_' + c.id);
      Audio8.sfx('chest');
      yield wait(12);
      if (c.gold) { G.gold += c.gold; yield say(null, 'Found ' + c.gold + ' gold!'); }
      else {
        addItem(c.item, c.n || 1);
        const nm = itemInfo(c.item).name;
        yield say(null, 'Found ' + nm + (c.n > 1 ? ' x' + c.n : '') + '!');
      }
    });
  }
  run(gen) {
    const self = this;
    this.runner = new Runner(gen.call ? gen.call(this) : gen);
    if (this.runner.finished) { this.runner = null; this.refreshEnts(); }
  }
  camera() {
    const p = this.player;
    let cx = p.px + 8 - SW / 2, cy = p.py + 8 - SH / 2;
    const mw = this.w * TS, mh = this.h * TS;
    cx = mw <= SW ? (mw - SW) / 2 : clamp(cx, 0, mw - SW);
    cy = mh <= SH ? (mh - SH) / 2 : clamp(cy, 0, mh - SH);
    return [Math.round(cx), Math.round(cy)];
  }
  draw() {
    rect(0, 0, SW, SH, '#000');
    const [cx, cy] = this.camera();
    const af = (FRAME >> 4) % 2;
    const x0 = Math.floor(cx / TS), y0 = Math.floor(cy / TS);
    for (let j = y0; j <= y0 + 15; j++) {
      for (let i = x0; i <= x0 + 17; i++) {
        const t = this.tile(i, j);
        if (!t) continue;
        const sx = i * TS - cx, sy = j * TS - cy;
        drawTile(ANIM_TILES[t.t] ? ANIM_TILES[t.t][af] : t.t, sx, sy);
        if (t.o) drawTile(ANIM_TILES[t.o] ? ANIM_TILES[t.o][af] : t.o, sx, sy);
      }
    }
    // entities
    const list = this.ents.concat([this.player]).sort((a, b) => a.py - b.py);
    for (const e of list) {
      const sx = e.px - cx, sy = e.py - cy;
      if (sx < -16 || sy < -16 || sx > SW || sy > SH) continue;
      if (e.kind === 'chest') drawObj(flag('chest_' + e.def.id) ? 'chestopen' : 'chest', sx, sy);
      else if (e.kind === 'crystal') {
        drawObj(af ? 'crystal1' : 'crystal0', sx, sy - ((FRAME >> 3) % 4 === 0 ? 1 : 0));
      } else if (e.kind === 'obj') {
        const spr = typeof e.sprite === 'function' ? e.sprite() : e.sprite;
        if (e.tile) drawTile(e.tile, sx, sy);
        if (e.enemy) {
          const big = BOSS_IDX[e.enemy] !== undefined ? 32 : 24;
          const bob = Math.round(Math.sin(FRAME / 18 + e.x) * 1.5);
          drawEnemy(e.enemy, sx + 8 - big / 2, sy + 16 - big + bob, 1);
        }
        if (spr) drawObj(spr, sx, sy);
        if (e.glow) { const g = (FRAME >> 2) % 8; if (g < 2) drawObj('sparkle', sx + 2, sy - 4); }
      } else {
        const moving = e.moving || (e === this.player && this.sliding);
        let fr = 0;
        if (moving && !(e === this.player && this.sliding)) fr = [0, 1, 0, 2][(e.anim >> 3) % 4];
        else if (e.kind === 'npc' && e.idle !== false && !e.wander) fr = 0;
        drawChar(e === this.player ? G.party[0] : e.sprite, e.dir, fr, sx, sy - 2);
        if (e.emote) this.drawEmote(e.emote, sx, sy - 14);
      }
    }
    if (this.map.dark) {
      // vignette for dark caves
      const p = this.player;
      const g = ctx.createRadialGradient(p.px - cx + 8, p.py - cy + 8, 30, p.px - cx + 8, p.py - cy + 8, 150);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,0.75)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
    }
    if (this.tint) { ctx.fillStyle = this.tint; ctx.fillRect(0, 0, SW, SH); }
    if (this.banner > 0 && this.map.name) {
      const a = Math.min(1, this.banner / 20, (120 - this.banner) / 10 + 0.01);
      ctx.globalAlpha = a;
      const w = this.map.name.length * 8 + 24;
      win((SW - w) / 2, 10, w, 22);
      textC(this.map.name, SW / 2, 17, 'white');
      ctx.globalAlpha = 1;
    }
  }
  drawEmote(e, x, y) {
    rect(x + 3, y, 10, 10, COL.white); rect(x + 2, y + 1, 12, 8, COL.white);
    rect(x + 6, y + 10, 3, 2, COL.white);
    text(e === '!' ? '!' : e === '?' ? '?' : '.', x + 4, y + 1, e === '!' ? 'red' : 'black', false);
  }
}

// ---------- dialogue box ----------
class TextBox {
  constructor(name, pages, w, choices) {
    this.name = name; this.w = w; this.choices = choices;
    this.lines = [];
    const per = 4;
    const all = [];
    for (const p of pages) {
      const ls = wrapText(p, 29);
      for (let i = 0; i < ls.length; i += per) all.push(ls.slice(i, i + per));
    }
    this.pages = all.length ? all : [['']];
    this.pi = 0; this.chars = 0; this.sel = 0;
    this.speed = [0.6, 1.2, 2.5, 99][SETTINGS.textSpeed] || 1.2;
  }
  get pageText() { return this.pages[this.pi].join('\n'); }
  update() {
    const total = this.pageText.length;
    const last = this.pi === this.pages.length - 1;
    if (this.chars < total) {
      const before = Math.floor(this.chars);
      this.chars += this.speed;
      if (Math.floor(this.chars) !== before && Math.floor(this.chars) % 3 === 0 && this.speed < 50) Audio8.sfx('cursor');
      if (Input.hit('ok') || Input.hit('cancel')) this.chars = total;
      return;
    }
    if (last && this.choices) {
      if (Input.rep('up')) { this.sel = (this.sel + this.choices.length - 1) % this.choices.length; Audio8.sfx('cursor'); }
      if (Input.rep('down')) { this.sel = (this.sel + 1) % this.choices.length; Audio8.sfx('cursor'); }
      if (Input.hit('ok')) { Audio8.sfx('ok'); this.finish(this.sel); }
      else if (Input.hit('cancel') && this.cancelIdx !== undefined) { Audio8.sfx('cancel'); this.finish(this.cancelIdx); }
      return;
    }
    if (Input.hit('ok') || Input.hit('cancel')) {
      if (last) this.finish();
      else { this.pi++; this.chars = 0; }
    }
  }
  finish(r) { Scenes.pop(this); this.w.result = r; this.w.done = true; }
  draw() {
    const y = 150;
    win(0, y, SW, 74);
    if (this.name) {
      const nw = this.name.length * 8 + 12;
      win(4, y - 14, nw, 16);
      text(this.name, 10, y - 10, 'yellow');
    }
    let n = Math.floor(this.chars);
    const lines = this.pages[this.pi];
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i].slice(0, Math.max(0, n));
      n -= lines[i].length + 1;
      text(s, 12, y + 10 + i * 14);
    }
    const last = this.pi === this.pages.length - 1;
    if (this.chars >= this.pageText.length) {
      if (last && this.choices) {
        const cw = Math.max(...this.choices.map(c => c.length)) * 8 + 28;
        const ch = this.choices.length * 14 + 10;
        win(SW - cw - 4, y - ch - 2, cw, ch);
        this.choices.forEach((c, i) => text(c, SW - cw + 16, y - ch + 5 + i * 14));
        cursor(SW - cw + 4, y - ch + 5 + this.sel * 14);
      } else if ((FRAME >> 4) % 2) {
        rect(SW - 16, y + 62, 6, 2, COL.white); rect(SW - 15, y + 64, 4, 1, COL.white); rect(SW - 14, y + 65, 2, 1, COL.white);
      }
    }
  }
}

// ---------- script commands (used by map scripts) ----------
function field() { return Scenes.find(Field); }
function say(name, ...pages) {
  const w = waiter();
  Scenes.push(new TextBox(name, pages, w));
  return w;
}
function ask(name, textStr, choices, cancelIdx) {
  const w = waiter();
  const tb = new TextBox(name, [textStr], w, choices);
  tb.cancelIdx = cancelIdx;
  Scenes.push(tb);
  return w;
}
function* give(item, n = 1, silent) {
  addItem(item, n);
  Audio8.sfx(ITEMS[item] && ITEMS[item].key ? 'key' : 'item');
  if (!silent) yield say(null, 'Received ' + itemInfo(item).name + (n > 1 ? ' x' + n : '') + '!');
}
function* giveGold(n) { G.gold += n; Audio8.sfx('coin'); yield say(null, 'Received ' + n + ' gold!'); }
function* join(id, lv) {
  const l = lv || Math.max(1, avgLevel());
  addHero(id, l);
  Audio8.sfx('levelup');
  yield say(null, HEROES[id].name + ' the ' + HEROES[id].cls + ' joined the party!');
}
function battle(formation, opts = {}) {
  const w = waiter();
  const f = field();
  Audio8.sfx('encounter');
  Scenes.push(new BattleIntro(() => {
    const b = new Battle(formation, opts, r => { w.result = r; w.done = true; });
    Scenes.push(b);
  }));
  return w;
}
function warp(map, x, y, dir) {
  const w = waiter();
  let stage = 0;
  w.tick = () => {
    if (stage === 0) { Fade.target = 1; Fade.speed = 0.1; if (Fade.a >= 1) stage = 1; }
    else if (stage === 1) {
      const f = field();
      f.load(map, x, y, dir);
      stage = 2;
    } else if (stage === 2) { Fade.target = 0; if (Fade.a <= 0) w.done = true; }
  };
  return w;
}
function moveEnt(id, steps, noWait) {
  const f = field();
  const e = f.ent(id);
  if (!e) return done();
  const map = { U: 'up', D: 'down', L: 'left', R: 'right', W: 'wait' };
  const path = [];
  for (const tok of steps.split(' ')) {
    if (!tok) continue;
    if (tok.startsWith('f')) { path.push('face:' + map[tok[1]]); continue; }
    const m = /^(\d*)([UDLRW])$/.exec(tok);
    const n = m[1] ? +m[1] : 1;
    for (let i = 0; i < n; i++) path.push(map[m[2]]);
  }
  e.path = (e.path || []).concat(path);
  if (noWait) return done();
  return waiter(w => { if (!e.moving && (!e.path || !e.path.length)) w.done = true; });
}
function face(id, dir) { const e = field().ent(id); if (e) e.dir = dir; return done(); }
function emote(id, em, frames = 40) {
  const e = field().ent(id);
  if (!e) return done();
  e.emote = em;
  let n = frames;
  return waiter(w => { if (--n <= 0) { e.emote = null; w.done = true; } });
}
function setEntPos(id, x, y) {
  const e = field().ent(id);
  if (!e) return done();
  e.x = x; e.y = y; e.px = x * TS; e.py = y * TS; e.moving = false;
  if (e === field().player) { G.x = x; G.y = y; }
  return done();
}
function refresh() { field().refreshEnts(); return done(); }
function music(n) { Audio8.play(n); return done(); }
function sfx(n) { Audio8.sfx(n); return done(); }
function flash(col = '#fff', frames = 16) {
  const f = field();
  let n = frames;
  return waiter(w => { n--; f.tint = n % 4 < 2 ? col : null; if (n <= 0) { f.tint = null; w.done = true; } });
}
function tint(col) { field().tint = col; return done(); }
function* healAll(msg = true) {
  healParty();
  Audio8.sfx('heal');
  yield flash('rgba(120,255,160,0.35)', 20);
  if (msg) yield say(null, 'The party\'s HP and MP were fully restored.');
}
function shop(list) {
  const w = waiter();
  Scenes.push(new ShopMenu(SHOPS[list], () => { w.done = true; }));
  return w;
}
function* inn(price, keeper = 'Innkeeper') {
  const r = yield ask(keeper, 'Welcome, travellers! A night\'s rest is ' + price + ' gold. Will you stay?', ['Stay', 'Leave'], 1);
  if (r !== 0) { yield say(keeper, 'Safe travels, then.'); return; }
  if (G.gold < price) { yield say(keeper, 'Oh dear, you can\'t afford it.'); return; }
  G.gold -= price;
  const prev = Audio8.currentName;
  yield fadeOut(0.05);
  Audio8.stop();
  healParty();
  Audio8.sfx('save');
  yield wait(80);
  if (prev) Audio8.play(prev);
  yield fadeIn(0.05);
  yield say(keeper, 'Good morning! You look well rested.');
}
function* crystalScript() {
  Audio8.sfx('heal');
  healParty();
  yield flash('rgba(120,200,255,0.35)', 20);
  const r = yield ask(null, 'The crystal\'s light restores your party. Save your progress?', ['Save', 'Not now'], 1);
  if (r === 0) {
    const w = waiter();
    Scenes.push(new SaveMenu('save', () => { w.done = true; }));
    yield w;
  }
}
function* gameEnd() {
  const w = waiter();
  Scenes.push(new Ending(() => { w.done = true; }));
  yield w;
}
