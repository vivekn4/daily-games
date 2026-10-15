'use strict';
// ---------- turn-based battle ----------

class BattleIntro {
  constructor(next) { this.t = 0; this.next = next; }
  update() {
    this.t++;
    if (this.t === 36) { Scenes.pop(this); this.next(); }
  }
  draw() {
    const t = this.t;
    if (t < 16) { if ((t >> 2) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(0, 0, SW, SH); } return; }
    const k = (t - 16) / 20;
    for (let y = 0; y < SH; y += 16) {
      const w = Math.min(SW, Math.max(0, (k * 1.6 - (y / SH) * 0.6)) * SW);
      rect((y / 16) % 2 ? SW - w : 0, y, w, 16, '#000');
    }
  }
}

const PARTY_POS = [[196, 22], [212, 58], [196, 94]];

class Battle {
  constructor(formation, opts, cb) {
    this.opts = opts; this.cb = cb;
    this.bg = 'bg_' + (opts.bg || 'field');
    this.enemies = [];
    const counts = {};
    formation.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const seen = {};
    formation.forEach((id, i) => {
      const d = ENEMIES[id];
      if (!d) throw new Error('Unknown enemy ' + id);
      seen[id] = (seen[id] || 0) + 1;
      const name = counts[id] > 1 ? d.name + ' ' + 'ABC'[seen[id] - 1] : d.name;
      this.enemies.push({
        d, id, name, hp: d.hp, maxhp: d.hp, mods: {}, status: null, alive: true, flash: 0, fade: 0, ox: 0, enemy: true,
        weak: d.weak, res: d.res, immune: d.immune,
      });
    });
    this.layout();
    this.heroes = party();
    for (const h of this.heroes) { h.mods = {}; h.defending = false; h.ox = 0; h.flash = 0; }
    this.pops = []; this.parts = []; this.topMsg = null; this.ui = null;
    this.runner = new Runner(this.flow());
    this.prevMusic = Audio8.currentName;
    Audio8.play(opts.music || (this.enemies.some(e => e.d.boss) ? 'boss' : 'battle'));
    Fade.a = 1; Fade.target = 0; Fade.speed = 0.1;
    this.shake = 0;
  }
  layout() {
    const n = this.enemies.length;
    const sizes = this.enemies.map(e => this.esize(e));
    if (n === 1) {
      const s = sizes[0];
      this.enemies[0].x = 84 - s / 2; this.enemies[0].y = 76 - s / 2;
    } else if (n === 2) {
      this.enemies[0].x = 22; this.enemies[0].y = 40;
      this.enemies[1].x = 96; this.enemies[1].y = 62;
    } else {
      this.enemies[0].x = 14; this.enemies[0].y = 58;
      this.enemies[1].x = 70; this.enemies[1].y = 16;
      this.enemies[2].x = 98; this.enemies[2].y = 82;
    }
  }
  esize(e) { const base = BOSS_IDX[e.d.sprite] !== undefined ? 32 : 24; return base * 2 * (e.d.scale || 1); }
  ecenter(e) { const s = this.esize(e); return [e.x + s / 2, e.y + s / 2]; }
  hcenter(i) { return [PARTY_POS[i][0] + 16, PARTY_POS[i][1] + 16]; }
  aliveE() { return this.enemies.filter(e => e.alive); }
  aliveH() { return this.heroes.filter(h => h.hp > 0); }

  // ---------- stat helpers ----------
  st(u) {
    if (u.enemy) return { atk: u.d.atk, def: u.d.def, mag: u.d.mag, mdef: u.d.mdef, spd: u.d.spd, maxhp: u.maxhp, ward: false, el: null };
    const s = stats(u);
    return { atk: s.atk, def: s.def, mag: s.mag, mdef: Math.round(s.def * 0.5 + s.mag * 0.5), spd: s.spd, maxhp: s.hp, maxmp: s.mp, ward: s.ward, el: s.el };
  }
  mod(u, k) { const m = u.mods[k]; return m ? 1 + 0.35 * m.v : 1; }
  hp(u) { return u.enemy ? u.hp : u.hp; }
  isAlive(u) { return u.enemy ? u.alive : u.hp > 0; }
  nameOf(u) { return u.enemy ? u.name : HEROES[u.id].name; }
  posOf(u) {
    if (u.enemy) return this.ecenter(u);
    return this.hcenter(this.heroes.indexOf(u));
  }

  // ---------- flow ----------
  *flow() {
    yield wait(16);
    const names = this.enemies.map(e => e.d.name);
    const uniq = [...new Set(names)];
    if (this.opts.intro) yield* this.say(this.opts.intro);
    else yield* this.say(uniq.length === 1 && names.length > 1 ? names.length + ' ' + uniq[0] + 's appear!' : uniq.join(' and ') + (names.length > 1 ? ' appear!' : ' appears!'));
    for (; ;) {
      const cmds = yield* this.commandPhase();
      if (cmds === 'run') {
        if (yield* this.tryRun()) { this.end('run'); return; }
        yield* this.enemyOnlyRound();
      } else {
        yield* this.round(cmds);
      }
      if (this.escaped) { this.end('run'); return; }
      const r = this.checkEnd();
      if (r) { yield* this.finish(r); return; }
    }
  }
  *say(msg, frames = 40) {
    this.topMsg = msg;
    let n = frames;
    yield waiter(w => { n--; if (n <= 0 || (n < frames - 8 && Input.isDown('ok'))) w.done = true; });
  }
  ask(mode, data) {
    const w = waiter();
    this.ui = { mode, ...data, w, nav: new ListNav(1, 6) };
    return w;
  }
  *commandPhase() {
    const cmds = [];
    let i = 0;
    const order = this.heroes.map((h, k) => k);
    while (i < order.length) {
      const h = this.heroes[order[i]];
      if (h.hp <= 0 || h.status === 'sleep') { cmds[i] = null; i++; continue; }
      this.active = h;
      this.topMsg = null;
      const r = yield this.ask('cmd', { hero: h });
      if (r === 'back') {
        // go back to previous hero who can act
        let j = i - 1;
        while (j >= 0 && (this.heroes[order[j]].hp <= 0 || this.heroes[order[j]].status === 'sleep')) j--;
        if (j >= 0) i = j;
        continue;
      }
      if (r === 'run') { this.active = null; return 'run'; }
      cmds[i] = { ...r, actor: h };
      i++;
    }
    this.active = null;
    return cmds.filter(Boolean);
  }
  *tryRun() {
    if (this.opts.noRun || this.enemies.some(e => e.d.boss)) { yield* this.say('Can\'t escape!'); return false; }
    const ps = this.aliveH().reduce((a, h) => a + this.st(h).spd, 0) / Math.max(1, this.aliveH().length);
    const es = this.aliveE().reduce((a, e) => a + e.d.spd, 0) / Math.max(1, this.aliveE().length);
    const p = clamp(0.55 + (ps - es) * 0.02, 0.3, 0.92);
    if (chance(p)) { Audio8.sfx('run'); yield* this.say('Escaped safely!', 30); return true; }
    yield* this.say('Couldn\'t get away!');
    return false;
  }
  enemyActions() {
    const acts = [];
    for (const e of this.aliveE()) {
      for (let k = 0; k < (e.d.acts2 || 1); k++) acts.push({ actor: e, type: 'enemy', second: k > 0 });
    }
    return acts;
  }
  *enemyOnlyRound() {
    for (const h of this.heroes) h.defending = false;
    const acts = this.enemyActions();
    for (const a of acts) { if (this.checkEnd()) return; yield* this.doAction(a); }
    yield* this.endRound();
  }
  *round(cmds) {
    for (const h of this.heroes) h.defending = false;
    for (const c of cmds) if (c.type === 'defend') c.actor.defending = true;
    const acts = cmds.concat(this.enemyActions());
    for (const a of acts) {
      const s = this.st(a.actor).spd * this.mod(a.actor, 'spd');
      a.init = a.type === 'defend' ? 9999 : s * (0.85 + Math.random() * 0.3) - (a.second ? 8 : 0);
    }
    acts.sort((a, b) => b.init - a.init);
    for (const a of acts) {
      if (this.checkEnd() || this.escaped) return;
      if (!this.isAlive(a.actor)) continue;
      yield* this.doAction(a);
    }
    yield* this.endRound();
  }
  *endRound() {
    const all = [...this.aliveH(), ...this.aliveE()];
    for (const u of all) {
      if (u.status === 'poison') {
        const dmg = Math.max(1, Math.floor(this.st(u).maxhp / 10));
        Audio8.sfx('poison');
        this.applyDamage(u, dmg, 'purple');
        yield* this.say(this.nameOf(u) + ' is hurt by poison!', 26);
        if (this.checkEnd()) return;
      }
      for (const k in u.mods) { u.mods[k].t--; if (u.mods[k].t <= 0) delete u.mods[k]; }
    }
  }
  checkEnd() {
    if (!this.aliveE().length) return 'win';
    if (!this.aliveH().length) return 'lose';
    return null;
  }

  // ---------- actions ----------
  *doAction(a) {
    const u = a.actor;
    if (u.status === 'sleep') {
      if (chance(0.34)) { u.status = null; yield* this.say(this.nameOf(u) + ' woke up!', 26); }
      else { yield* this.say(this.nameOf(u) + ' is fast asleep...', 26); return; }
      if (!u.enemy) return;
    }
    if (a.type === 'enemy') { yield* this.enemyTurn(u); return; }
    if (a.type === 'defend') return;
    if (a.type === 'attack') {
      const t = this.retarget(a.target, true);
      if (!t) return;
      yield* this.say(HEROES[u.id].name + ' attacks!', 14);
      yield* this.heroLunge(u);
      yield* this.physHit(u, t, 1, this.st(u).el);
      return;
    }
    if (a.type === 'skill') {
      const sk = SKILLS[a.skill];
      if (u.mp < sk.mp) { yield* this.say('Not enough MP!'); return; }
      u.mp -= sk.mp;
      yield* this.say(sk.name, 18);
      yield* this.useSkill(u, sk, a.target);
      return;
    }
    if (a.type === 'item') {
      if (!hasItem(a.item)) { yield* this.say('No ' + ITEMS[a.item].name + ' left!'); return; }
      removeItem(a.item);
      yield* this.say(HEROES[u.id].name + ' uses ' + ITEMS[a.item].name + '!', 20);
      yield* this.useItem(u, ITEMS[a.item], a.target);
    }
  }
  retarget(t, enemySide) {
    if (Array.isArray(t)) return t;
    if (t && this.isAlive(t)) return t;
    const pool = enemySide ? this.aliveE() : this.aliveH();
    return pool.length ? pick(pool) : null;
  }
  *heroLunge(h) {
    for (let k = 0; k < 6; k++) { h.ox = -k * 3; yield wait(1); }
    Audio8.sfx('swing');
  }
  *heroBack(h) { for (let k = 5; k >= 0; k--) { h.ox = -k * 3; yield wait(1); } }
  *physHit(u, t, pow, el) {
    const su = this.st(u), stt = this.st(t);
    const hitP = 0.95 - Math.max(0, (stt.spd - su.spd) * 0.004);
    if (!chance(hitP)) {
      Audio8.sfx('miss');
      this.popAt(t, 'Miss', 'white');
      yield wait(20);
      if (!u.enemy && !this.noBack) yield* this.heroBack(u);
      return;
    }
    const crit = chance(u.enemy ? 0.04 : 0.08);
    let dmg = dmgFormula(su.atk * this.mod(u, 'atk'), stt.def * this.mod(t, 'def'), pow);
    dmg *= (0.88 + Math.random() * 0.24) * elemMult(t, el) * (crit ? 1.6 : 1);
    if (t.defending) dmg *= 0.5;
    dmg = Math.max(elemMult(t, el) === 0 ? 0 : 1, Math.round(dmg));
    this.slashFx(t, el);
    Audio8.sfx(crit ? 'crit' : (t.enemy ? 'hit' : 'enemyhit'));
    if (crit) { this.shake = 10; this.popAt(t, 'Critical!', 'yellow', -12); }
    this.applyDamage(t, dmg, t.enemy ? 'white' : 'red', el);
    if (t.status === 'sleep' && dmg > 0) t.status = null;
    yield wait(22);
    if (!u.enemy && !this.noBack) yield* this.heroBack(u);
    if (!this.isAlive(t)) yield* this.killFx(t);
  }
  applyDamage(t, dmg, col, el) {
    const m = elemMult(t, el);
    if (t.enemy) { t.hp = Math.max(0, t.hp - dmg); t.flash = 10; if (t.hp <= 0) t.alive = false; }
    else { t.hp = Math.max(0, t.hp - dmg); t.flash = 10; if (t.hp <= 0) { t.status = null; t.mods = {}; } }
    this.popAt(t, m === 0 ? 'Immune' : String(dmg), m > 1 ? 'yellow' : col);
    if (m > 1) this.popAt(t, 'Weak!', 'orange', -12);
  }
  *killFx(t) {
    if (t.enemy) {
      Audio8.sfx('death');
      for (let k = 0; k <= 16; k++) { t.fade = k / 16; yield wait(1); }
      if (t.d.boss) this.shake = 20;
    } else {
      yield* this.say(HEROES[t.id].name + ' has fallen!', 30);
    }
  }
  popAt(t, s, col, dy = 0) {
    const [x, y] = this.posOf(t);
    this.pops.push({ x, y: y - 8 + dy, s, col, t: 0 });
  }
  heal(t, amt) {
    const max = this.st(t).maxhp;
    const before = t.hp;
    t.hp = Math.min(max, t.hp + amt);
    this.popAt(t, String(t.hp - before), 'green');
  }
  *useSkill(u, sk, target) {
    let targets;
    if (sk.tgt === 'enemies') targets = this.aliveE();
    else if (sk.tgt === 'allies') targets = this.aliveH();
    else if (sk.tgt === 'dead') targets = [target];
    else if (sk.tgt === 'ally') targets = [this.retarget(target, false)];
    else targets = [this.retarget(target, true)];
    targets = targets.filter(Boolean);
    if (!targets.length) return;
    const fx = sk.fx;
    if (sk.kind === 'phys') {
      yield* this.heroLunge(u);
      this.noBack = true;
      for (const t of targets) {
        if (!this.isAlive(t)) continue;
        if (sk.debuff) { t.mods[sk.debuff] = { v: -1, t: 3 }; }
        this.spellFx(fx === 'slash' ? null : fx, t);
        yield* this.physHit(u, t, sk.pow, sk.el || this.st(u).el);
        if (sk.debuff && this.isAlive(t)) { Audio8.sfx('debuff'); this.popAt(t, 'DEF down', 'purple', -12); yield wait(14); }
      }
      this.noBack = false;
      yield* this.heroBack(u);
      return;
    }
    if (sk.kind === 'mag') {
      Audio8.sfx(fx || 'holy');
      for (const t of targets) this.spellFx(fx, t);
      yield wait(24);
      for (const t of targets) {
        if (!this.isAlive(t)) continue;
        const su = this.st(u), stt = this.st(t);
        let dmg = dmgFormula(su.mag, stt.mdef, sk.pow) * (0.92 + Math.random() * 0.16) * elemMult(t, sk.el);
        dmg = Math.round(dmg);
        if (elemMult(t, sk.el) > 0) dmg = Math.max(1, dmg);
        this.applyDamage(t, dmg, 'white', sk.el);
      }
      Audio8.sfx('hit');
      yield wait(24);
      for (const t of targets) if (!this.isAlive(t) && t.fade === 0) yield* this.killFx(t);
      return;
    }
    if (sk.kind === 'heal') {
      Audio8.sfx('heal');
      for (const t of targets) { this.spellFx('heal', t); }
      yield wait(20);
      const mag = this.st(u).mag;
      for (const t of targets) {
        this.heal(t, Math.round((mag * sk.pow + (sk.base || 0)) * (0.95 + Math.random() * 0.1)));
        if (sk.cure) t.status = null;
      }
      yield wait(24);
      return;
    }
    if (sk.kind === 'revive') {
      const t = targets[0];
      if (t.hp > 0) { yield* this.say('It had no effect.'); return; }
      Audio8.sfx('heal'); this.spellFx('heal', t);
      yield wait(20);
      t.hp = Math.floor(this.st(t).maxhp / 2);
      this.popAt(t, 'Revived', 'green');
      yield wait(24);
      return;
    }
    if (sk.kind === 'cure') {
      const t = targets[0];
      Audio8.sfx('heal'); this.spellFx('heal', t);
      t.status = null; this.popAt(t, 'Cured', 'green');
      yield wait(24);
      return;
    }
    if (sk.kind === 'buff') {
      Audio8.sfx('buff');
      for (const t of targets) { t.mods[sk.buff] = { v: 1, t: 4 }; this.spellFx('buff', t); this.popAt(t, sk.buff.toUpperCase() + ' up', 'cyan'); }
      yield wait(30);
      return;
    }
    if (sk.kind === 'debuff') {
      Audio8.sfx('debuff');
      for (const t of targets) { t.mods[sk.debuff] = { v: -1, t: 3 }; this.spellFx('dark', t); this.popAt(t, sk.debuff.toUpperCase() + ' down', 'purple'); }
      yield wait(30);
      return;
    }
    if (sk.kind === 'status') {
      Audio8.sfx('dark');
      for (const t of targets) {
        this.spellFx('dark', t);
        if (!this.isAlive(t)) continue;
        if (t.d && t.d.noStatus) { this.popAt(t, 'Immune', 'white'); continue; }
        if (chance(sk.rate)) { t.status = sk.status; this.popAt(t, sk.status === 'sleep' ? 'Sleep' : 'Poison', 'purple'); }
        else this.popAt(t, 'Miss', 'white');
      }
      yield wait(30);
    }
  }
  *useItem(u, it, target) {
    const all = it.tgt === 'allies' ? this.aliveH() : it.tgt === 'enemies' ? this.aliveE() : [target];
    if (it.use === 'escape') {
      if (this.enemies.some(e => e.d.boss) || this.opts.noRun) { yield* this.say('It doesn\'t work here!'); return; }
      Audio8.sfx('run'); yield* this.say('The party slips away in the smoke!', 30);
      this.escaped = true; return;
    }
    if (it.use === 'bomb') {
      Audio8.sfx(it.el === 'ice' ? 'ice' : 'fire');
      for (const t of all) this.spellFx(it.el, t);
      yield wait(24);
      for (const t of all) { const d = Math.round(it.amt * (0.9 + Math.random() * 0.2) * elemMult(t, it.el)); this.applyDamage(t, d, 'white', it.el); }
      yield wait(24);
      for (const t of all) if (!this.isAlive(t) && t.fade === 0) yield* this.killFx(t);
      return;
    }
    for (const t of all) {
      if (!t) continue;
      const s = this.st(t);
      if (it.use === 'revive') {
        if (t.hp > 0) { yield* this.say('It had no effect.'); continue; }
        t.hp = Math.floor(s.maxhp / 2); this.popAt(t, 'Revived', 'green'); Audio8.sfx('heal'); this.spellFx('heal', t);
        continue;
      }
      if (t.hp <= 0) continue;
      this.spellFx('heal', t);
      if (it.use === 'heal' || it.use === 'healall') { Audio8.sfx('heal'); this.heal(t, it.amt); }
      if (it.use === 'mp') { Audio8.sfx('heal'); const b = t.mp; t.mp = Math.min(s.maxmp, t.mp + it.amt); this.popAt(t, (t.mp - b) + ' MP', 'blue'); }
      if (it.use === 'cure') { Audio8.sfx('heal'); t.status = null; this.popAt(t, 'Cured', 'green'); }
      if (it.use === 'full' || it.use === 'fullall') { Audio8.sfx('heal'); this.heal(t, s.maxhp); t.mp = s.maxmp; t.status = null; }
    }
    yield wait(30);
  }
  *enemyTurn(e) {
    const acts = e.d.acts;
    // bosses heal when low
    let choice;
    const low = e.hp < e.maxhp * 0.35;
    const pool = acts.filter(([a]) => !(a === 'mend' && !low) && !(a in ESKILLS && ESKILLS[a].kind === 'buff' && e.mods[ESKILLS[a].buff]));
    const tot = pool.reduce((s, a) => s + a[1], 0);
    let r = Math.random() * tot;
    for (const a of pool) { r -= a[1]; if (r <= 0) { choice = a[0]; break; } }
    choice = choice || 'atk';
    const targets = this.aliveH();
    if (!targets.length) return;
    // enemies prefer healthier front-liners slightly
    const t = pick(targets);
    e.ox = 8;
    if (choice === 'atk') {
      yield* this.say(e.name + ' attacks!', 14);
      yield* this.enemyLunge(e);
      yield* this.physHit(e, t, 1, null);
      return;
    }
    const sk = ESKILLS[choice];
    yield* this.say(e.name + ': ' + sk.name, 22);
    yield* this.enemyLunge(e);
    const tg = sk.tgt === 'all' ? targets : sk.tgt === 'self' ? [e] : [t];
    if (sk.kind === 'phys') {
      for (const x of tg) {
        if (!this.isAlive(x)) continue;
        yield* this.physHit(e, x, sk.pow, sk.el);
        if (sk.status && this.isAlive(x) && chance(sk.rate) && !this.st(x).ward && !x.status) {
          x.status = sk.status; Audio8.sfx('poison'); this.popAt(x, sk.status === 'poison' ? 'Poison' : 'Sleep', 'purple', -12);
          yield wait(14);
        }
      }
    } else if (sk.kind === 'mag') {
      Audio8.sfx(sk.fx || 'dark');
      for (const x of tg) this.spellFx(sk.fx, x);
      yield wait(22);
      let total = 0;
      for (const x of tg) {
        const stt = this.st(x);
        let dmg = dmgFormula(e.d.mag * this.mod(e, 'atk') ** 0.5, stt.mdef * this.mod(x, 'def'), sk.pow) * (0.9 + Math.random() * 0.2);
        if (x.defending) dmg *= 0.5;
        dmg = Math.max(1, Math.round(dmg));
        total += dmg;
        this.applyDamage(x, dmg, 'red', sk.el);
      }
      Audio8.sfx('enemyhit');
      if (sk.drain) { e.hp = Math.min(e.maxhp, e.hp + total); this.popAt(e, String(total), 'green'); }
      yield wait(24);
      for (const x of tg) if (!this.isAlive(x)) yield* this.killFx(x);
    } else if (sk.kind === 'heal') {
      Audio8.sfx('heal'); this.spellFx('heal', e);
      const amt = Math.round(e.maxhp * sk.pow);
      e.hp = Math.min(e.maxhp, e.hp + amt); this.popAt(e, String(amt), 'green');
      yield wait(26);
    } else if (sk.kind === 'buff') {
      Audio8.sfx('buff'); e.mods[sk.buff] = { v: 1, t: 3 }; this.spellFx('buff', e); this.popAt(e, sk.buff.toUpperCase() + ' up', 'cyan');
      yield wait(26);
    } else if (sk.kind === 'debuff') {
      Audio8.sfx('debuff');
      for (const x of tg) { x.mods[sk.debuff] = { v: -1, t: 3 }; this.spellFx('dark', x); this.popAt(x, sk.debuff.toUpperCase() + ' down', 'purple'); }
      yield wait(26);
    } else if (sk.kind === 'status') {
      Audio8.sfx('dark');
      for (const x of tg) {
        this.spellFx('dark', x);
        if (this.st(x).ward) { this.popAt(x, 'Warded', 'cyan'); continue; }
        if (chance(sk.rate) && !x.status) { x.status = sk.status; this.popAt(x, 'Sleep', 'purple'); }
        else this.popAt(x, 'Miss', 'white');
      }
      yield wait(26);
    }
    e.ox = 0;
  }
  *enemyLunge(e) {
    for (let k = 0; k < 5; k++) { e.ox = k * 2; yield wait(1); }
    for (let k = 5; k >= 0; k--) { e.ox = k * 2; yield wait(1); }
  }

  // ---------- effects ----------
  slashFx(t, el) {
    const [x, y] = this.posOf(t);
    const col = el === 'fire' ? '#fca044' : el === 'holy' ? '#fcfcb0' : '#fcfcfc';
    for (let k = 0; k < 8; k++) this.parts.push({ x: x - 12 + k * 3, y: y - 12 + k * 3, vx: 0, vy: 0, life: 10, col, s: 2 });
  }
  spellFx(fx, t) {
    if (!fx) return;
    const [x, y] = this.posOf(t);
    const P = o => this.parts.push(o);
    if (fx === 'fire') for (let k = 0; k < 26; k++) P({ x: x + rnd(-14, 14), y: y + rnd(-4, 16), vx: rnd(-5, 5) / 10, vy: -rnd(5, 18) / 10, life: rnd(18, 34), col: pick(['#fca044', '#f83800', '#f8d850']), s: rnd(2, 3), delay: rnd(0, 10) });
    if (fx === 'ice') for (let k = 0; k < 14; k++) P({ x: x + rnd(-16, 16), y: y - 40 - rnd(0, 20), vx: 0, vy: 3, life: rnd(14, 22), col: pick(['#a4e4fc', '#fcfcfc', '#3cbcfc']), s: 3, shard: true, stop: y + rnd(-10, 10), delay: rnd(0, 10) });
    if (fx === 'bolt') { this.bolt = { x, y, t: 18 }; for (let k = 0; k < 10; k++) P({ x, y, vx: rnd(-20, 20) / 10, vy: rnd(-20, 20) / 10, life: 16, col: '#f8f878', s: 2 }); }
    if (fx === 'holy') for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; P({ x, y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, life: 22, col: pick(['#fcfcfc', '#fcfcb0']), s: 2 }); }
    if (fx === 'dark') for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; P({ x: x + Math.cos(a) * 24, y: y + Math.sin(a) * 24, vx: -Math.cos(a) * 1.3, vy: -Math.sin(a) * 1.3, life: 18, col: pick(['#9878f8', '#6844fc', '#283048']), s: 3 }); }
    if (fx === 'heal') for (let k = 0; k < 16; k++) P({ x: x + rnd(-12, 12), y: y + rnd(0, 16), vx: 0, vy: -rnd(6, 14) / 10, life: rnd(20, 30), col: pick(['#78f878', '#fcfcfc', '#b8f8b8']), s: 2, plus: true, delay: rnd(0, 8) });
    if (fx === 'buff') for (let k = 0; k < 12; k++) P({ x: x + rnd(-12, 12), y: y + 14, vx: 0, vy: -1.6, life: 20, col: '#58f8e8', s: 2 });
    if (fx === 'star') for (let k = 0; k < 10; k++) P({ x: x + rnd(-30, 30) + 40, y: y - 60 - rnd(0, 30), vx: -2, vy: 3, life: 26, col: pick(['#f8d850', '#fcfcfc']), s: 3, delay: rnd(0, 12) });
  }

  // ---------- finish ----------
  *finish(r) {
    this.topMsg = null;
    if (r === 'lose') {
      Audio8.play('gameover');
      yield* this.say('The party has fallen...', 90);
      if (this.opts.canLose) { this.end('lose'); return; }
      this.end('lose', true);
      return;
    }
    if (this.escaped) { this.end('run'); return; }
    Audio8.play('victory');
    let exp = 0, gold = 0;
    const drops = [];
    for (const e of this.enemies) {
      exp += e.d.exp; gold += e.d.gold;
      if (e.d.drop && chance(e.d.drop[1])) drops.push(e.d.drop[0]);
    }
    G.gold += gold; G.battles = (G.battles || 0) + 1;
    const living = this.aliveH();
    const share = exp;
    this.victory = { exp: share, gold };
    yield* this.say('Victory!', 30);
    const lines = ['Gained ' + share + ' EXP and ' + gold + ' gold.'];
    for (const h of this.heroes) {
      const msgs = gainExp(h, share);
      if (msgs.length) Audio8.sfx('levelup');
      lines.push(...msgs);
    }
    for (const d of drops) { addItem(d); lines.push('Found ' + ITEMS[d].name + '!'); }
    for (const l of lines) yield* this.waitKey(l);
    this.end('win');
  }
  *waitKey(msg) {
    this.topMsg = msg;
    yield wait(10);
    yield waiter(w => { if (Input.hit('ok') || Input.hit('cancel')) w.done = true; });
  }
  end(r, gameover) {
    this.result = r;
    const self = this;
    this.ending = { t: 0, gameover };
  }
  // ---------- UI ----------
  updateUI() {
    const ui = this.ui;
    if (!ui) return;
    const h = ui.hero;
    if (ui.mode === 'cmd') {
      const opts = ['Attack', 'Skill', 'Item', 'Defend', 'Run'];
      ui.nav.setN(opts.length); ui.nav.update();
      if (Input.hit('cancel')) { Audio8.sfx('cancel'); this.resolve('back'); return; }
      if (Input.hit('ok')) {
        const o = opts[ui.nav.i];
        if (o === 'Attack') { Audio8.sfx('ok'); this.pushUI('target', { side: 'enemy', then: t => ({ type: 'attack', target: t }) }); }
        else if (o === 'Skill') {
          if (!h.skills.length) { Audio8.sfx('buzz'); return; }
          Audio8.sfx('ok'); this.pushUI('skill', {});
        } else if (o === 'Item') {
          const list = Object.keys(G.items).filter(id => ITEMS[id] && !ITEMS[id].key);
          if (!list.length) { Audio8.sfx('buzz'); return; }
          Audio8.sfx('ok'); this.pushUI('item', { list });
        } else if (o === 'Defend') { Audio8.sfx('ok'); this.resolve({ type: 'defend' }); }
        else if (o === 'Run') { Audio8.sfx('ok'); this.resolve('run'); }
      }
      return;
    }
    if (ui.mode === 'skill') {
      ui.nav.setN(h.skills.length); ui.nav.vis = 4; ui.nav.update(2);
      const sk = SKILLS[h.skills[ui.nav.i]];
      this.topMsg = sk.desc;
      if (Input.hit('cancel')) { Audio8.sfx('cancel'); this.popUI(); return; }
      if (Input.hit('ok')) {
        if (h.mp < sk.mp) { Audio8.sfx('buzz'); return; }
        Audio8.sfx('ok');
        const id = h.skills[ui.nav.i];
        this.chooseTarget(sk.tgt, t => ({ type: 'skill', skill: id, target: t }));
      }
      return;
    }
    if (ui.mode === 'item') {
      ui.list = ui.list.filter(id => hasItem(id));
      ui.nav.setN(ui.list.length); ui.nav.vis = 4; ui.nav.update(2);
      const id = ui.list[ui.nav.i];
      if (id) this.topMsg = ITEMS[id].desc;
      if (Input.hit('cancel')) { Audio8.sfx('cancel'); this.popUI(); return; }
      if (Input.hit('ok') && id) {
        Audio8.sfx('ok');
        const it = ITEMS[id];
        const tg = it.tgt === 'none' ? 'none' : it.tgt;
        this.chooseTarget(tg, t => ({ type: 'item', item: id, target: t }));
      }
      return;
    }
    if (ui.mode === 'target') {
      const pool = ui.side === 'enemy' ? this.aliveE() : ui.side === 'dead' ? this.heroes : this.heroes;
      if (!ui.all) {
        ui.nav.setN(pool.length);
        if (Input.rep('up') || Input.rep('left')) { ui.nav.i = (ui.nav.i + pool.length - 1) % pool.length; Audio8.sfx('cursor'); }
        if (Input.rep('down') || Input.rep('right')) { ui.nav.i = (ui.nav.i + 1) % pool.length; Audio8.sfx('cursor'); }
        const t = pool[ui.nav.i];
        if (t) this.topMsg = this.nameOf(t);
      } else this.topMsg = ui.side === 'enemy' ? 'All enemies' : 'All allies';
      if (Input.hit('cancel')) { Audio8.sfx('cancel'); this.popUI(); return; }
      if (Input.hit('ok')) {
        Audio8.sfx('ok');
        const t = ui.all ? null : pool[ui.nav.i];
        this.topMsg = null;
        this.resolve(ui.then(t));
      }
    }
  }
  chooseTarget(tgt, then) {
    if (tgt === 'enemy') this.pushUI('target', { side: 'enemy', then });
    else if (tgt === 'enemies') this.pushUI('target', { side: 'enemy', all: true, then });
    else if (tgt === 'ally' || tgt === 'dead') {
      this.pushUI('target', { side: 'ally', then });
      this.ui.nav.i = this.heroes.indexOf(this.active);
      if (tgt === 'dead') { const d = this.heroes.findIndex(x => x.hp <= 0); if (d >= 0) this.ui.nav.i = d; }
    } else if (tgt === 'allies') this.pushUI('target', { side: 'ally', all: true, then });
    else this.resolve(then(null));
  }
  pushUI(mode, data) {
    const prev = this.ui;
    this.ui = { mode, ...data, hero: prev.hero, w: prev.w, prev, nav: new ListNav(1, 6) };
    if (mode === 'target' && data.side === 'enemy') this.ui.nav.i = 0;
  }
  popUI() { this.topMsg = null; this.ui = this.ui.prev || this.ui; }
  resolve(r) { const w = this.ui.w; this.ui = null; this.topMsg = null; w.result = r; w.done = true; }

  update() {
    if (this.ending) {
      this.ending.t++;
      Fade.target = 1; Fade.speed = 0.08;
      if (Fade.a >= 1) {
        Scenes.pop(this);
        if (this.ending.gameover) { Scenes.clear(); Scenes.push(new GameOver()); return; }
        for (const h of this.heroes) { delete h.mods; delete h.defending; delete h.ox; delete h.flash; if (h.status === 'sleep') h.status = null; }
        const f = field();
        if (f && f.map.music && !this.opts.keepMusic) Audio8.play(typeof f.map.music === 'function' ? f.map.music() : f.map.music);
        Fade.target = 0;
        this.cb(this.result);
      }
      return;
    }
    if (this.ui) this.updateUI();
    this.runner.update();
    for (const p of this.pops) p.t++;
    this.pops = this.pops.filter(p => p.t < 50);
    for (const p of this.parts) {
      if (p.delay > 0) { p.delay--; continue; }
      p.x += p.vx; p.y += p.vy; p.life--;
      if (p.shard && p.y >= p.stop) { p.vy = 0; }
    }
    this.parts = this.parts.filter(p => p.life > 0);
    if (this.bolt) { this.bolt.t--; if (this.bolt.t <= 0) this.bolt = null; }
    for (const e of this.enemies) if (e.flash > 0) e.flash--;
    for (const h of this.heroes) if (h.flash > 0) h.flash--;
    if (this.shake > 0) this.shake--;
  }
  draw() {
    const sx = this.shake ? rnd(-3, 3) : 0, sy = this.shake ? rnd(-2, 2) : 0;
    ctx.save(); ctx.translate(sx, sy);
    ctx.drawImage(IMG[this.bg] || IMG.bg_field, 0, 0);
    // enemies
    for (const e of this.enemies) {
      if (!e.alive && e.fade >= 1) continue;
      const size = this.esize(e), sc = size / (BOSS_IDX[e.d.sprite] !== undefined ? 32 : 24);
      const bob = e.d.boss ? Math.round(Math.sin(FRAME / 20) * 2) : 0;
      const x = e.x + (e.ox || 0), y = e.y + bob;
      if (e.fade > 0) {
        ctx.globalAlpha = 1 - e.fade;
        ctx.drawImage(enemyCanvas(e.d.sprite, '#f83800'), x, y + e.fade * 6, size, size * (1 - e.fade * 0.3));
        ctx.globalAlpha = 1;
        continue;
      }
      if (e.flash > 0 && (e.flash >> 1) % 2) ctx.drawImage(enemyCanvas(e.d.sprite, '#fcfcfc'), x, y, size, size);
      else drawEnemy(e.d.sprite, x, y, sc);
      if (e.status === 'sleep') text('Z', x + size - 8, y - 4 - ((FRAME >> 4) % 2) * 3, 'blue');
      if (e.status === 'poison') text('*', x + size - 8, y + 4, 'purple');
    }
    // heroes
    this.heroes.forEach((h, i) => {
      const [px, py] = PARTY_POS[i];
      const act = this.active === h;
      const x = px + (h.ox || 0) - (act ? 8 : 0), y = py;
      ctx.save();
      if (h.hp <= 0) {
        ctx.translate(x + 16, y + 26); ctx.rotate(-Math.PI / 2); ctx.scale(2, 2);
        ctx.globalAlpha = 0.7; drawChar(HEROES[h.id].sprite, 'left', 0, -8, -8);
      } else {
        ctx.translate(x, y); ctx.scale(2, 2);
        if (h.flash > 0 && (h.flash >> 1) % 2) ctx.globalAlpha = 0.3;
        const fr = act ? [0, 1, 0, 2][(FRAME >> 3) % 4] : (h.hp < this.st(h).maxhp / 4 ? 1 : 0);
        drawChar(HEROES[h.id].sprite, 'left', fr, 0, 0);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      if (h.status === 'sleep' && h.hp > 0) text('Z', x - 4, y - 2 - ((FRAME >> 4) % 2) * 3, 'blue');
      if (h.status === 'poison' && h.hp > 0) text('*', x - 4, y + 6, 'purple');
      if (h.defending && h.hp > 0) text('D', x + 30, y, 'cyan');
    });
    // particles
    for (const p of this.parts) {
      if (p.delay > 0) continue;
      ctx.fillStyle = p.col;
      if (p.plus) { ctx.fillRect(p.x - 2, p.y, 5, 1); ctx.fillRect(p.x, p.y - 2, 1, 5); }
      else if (p.shard) { ctx.fillRect(p.x, p.y - 4, 2, 8); ctx.fillRect(p.x - 1, p.y - 1, 4, 2); }
      else ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    if (this.bolt && (this.bolt.t >> 1) % 2) {
      ctx.strokeStyle = '#f8f878'; ctx.lineWidth = 2; ctx.beginPath();
      let bx = this.bolt.x, by = 0; ctx.moveTo(bx, by);
      while (by < this.bolt.y) { by += 10; bx = this.bolt.x + rnd(-8, 8); ctx.lineTo(bx, by); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,200,0.25)'; ctx.fillRect(0, 0, SW, 144);
    }
    // damage pops
    for (const p of this.pops) {
      const yy = p.y - Math.min(10, p.t) + (p.t > 10 && p.t < 16 ? (p.t - 10) / 2 : p.t >= 16 ? 3 : 0);
      textC(p.s, p.x, yy, p.col);
    }
    ctx.restore();
    this.drawHUD();
  }
  drawHUD() {
    // bottom: enemy list + party status
    win(0, 144, 96, 80);
    const groups = {};
    for (const e of this.aliveE()) groups[e.d.name] = (groups[e.d.name] || 0) + 1;
    Object.entries(groups).slice(0, 4).forEach(([n, c], i) => {
      text(n.slice(0, 9), 6, 152 + i * 16, 'white');
      if (c > 1) text(c, 84, 152 + i * 16, 'yellow');
    });
    if (this.enemies.length === 1 && this.enemies[0].d.boss && this.enemies[0].alive) {
      const e = this.enemies[0];
      bar(6, 166, 84, e.hp, e.maxhp, '#f83800');
    }
    win(96, 144, 160, 80);
    this.heroes.forEach((h, i) => {
      const y = 152 + i * 22;
      const s = this.st(h);
      const act = this.active === h;
      text(HEROES[h.id].name, 104, y, act ? 'yellow' : h.hp <= 0 ? 'red' : 'white');
      textR(h.hp, 206, y, h.hp <= 0 ? 'red' : h.hp < s.maxhp / 4 ? 'yellow' : 'white');
      textR(h.mp, 248, y, 'blue');
      bar(104, y + 10, 104, h.hp, s.maxhp, '#58d854');
      bar(214, y + 10, 34, h.mp, s.maxmp, '#3cbcfc');
      if (h.status) text(h.status === 'poison' ? 'P' : 'Z', 160, y, 'purple');
    });
    // command windows
    const ui = this.ui;
    if (ui) {
      if (ui.mode === 'cmd' || (ui.prev && ui.prev.mode === 'cmd' && ui.mode === 'target' && ui.side === 'enemy' && !ui.prev.prev)) {
        const base = ui.mode === 'cmd' ? ui : ui.prev;
        win(0, 144, 96, 80);
        ['Attack', 'Skill', 'Item', 'Defend', 'Run'].forEach((o, i) => text(o, 22, 151 + i * 14, o === 'Run' && (this.opts.noRun || this.enemies.some(e => e.d.boss)) ? 'gray' : 'white'));
        if (ui.mode === 'cmd') cursor(8, 151 + base.nav.i * 14);
      }
      const listUI = ui.mode === 'skill' || ui.mode === 'item' ? ui : (ui.prev && (ui.prev.mode === 'skill' || ui.prev.mode === 'item') ? ui.prev : null);
      if (listUI) {
        win(0, 144, SW, 80);
        const h = ui.hero;
        const items = listUI.mode === 'skill' ? h.skills : listUI.list;
        const top = listUI.nav.top;
        for (let k = 0; k < 8; k++) {
          const i = top * 2 + k;
          if (i >= items.length) break;
          const x = (k % 2) * 128, y = 152 + (k >> 1) * 16;
          if (listUI.mode === 'skill') {
            const sk = SKILLS[items[i]];
            text(sk.name.slice(0, 11), x + 18, y, h.mp >= sk.mp ? 'white' : 'gray');
            textR(sk.mp, x + 124, y, 'blue');
          } else {
            const it = ITEMS[items[i]];
            text(it.name.slice(0, 11), x + 18, y);
            textR(G.items[items[i]] || 0, x + 124, y, 'yellow');
          }
        }
        if (ui === listUI) cursor((listUI.nav.i % 2) * 128 + 4, 152 + ((listUI.nav.i >> 1) - top) * 16);
        if (listUI.mode === 'skill') text('MP ' + h.mp, 196, 140, 'blue');
      }
      if (ui.mode === 'target') {
        const pool = ui.side === 'enemy' ? this.aliveE() : this.heroes;
        const list = ui.all ? pool : [pool[ui.nav.i]];
        for (const t of list) {
          if (!t) continue;
          if (t.enemy) { cursor(t.x - 10, t.y + this.esize(t) / 2 - 4); }
          else { const i = this.heroes.indexOf(t); cursor(PARTY_POS[i][0] - 14, PARTY_POS[i][1] + 12); }
        }
      }
    }
    if (this.topMsg) {
      win(0, 0, SW, 22);
      textC(this.topMsg.slice(0, 31), SW / 2, 7);
    }
  }
}
