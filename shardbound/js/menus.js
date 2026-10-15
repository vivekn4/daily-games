'use strict';
// ---------- menus: pause, items, skills, equip, status, save, options, shop ----------

class ListNav {
  constructor(n, visible = 8) { this.i = 0; this.top = 0; this.n = n; this.vis = visible; }
  update(cols = 1) {
    if (!this.n) return false;
    const old = this.i;
    if (Input.rep('up')) this.i = (this.i - cols + this.n) % this.n;
    if (Input.rep('down')) this.i = (this.i + cols) % this.n;
    if (cols > 1) {
      if (Input.rep('left')) this.i = Math.max(0, this.i - 1);
      if (Input.rep('right')) this.i = Math.min(this.n - 1, this.i + 1);
    }
    if (this.i !== old) Audio8.sfx('cursor');
    const row = Math.floor(this.i / cols);
    if (row < this.top) this.top = row;
    if (row >= this.top + this.vis) this.top = row - this.vis + 1;
    return this.i !== old;
  }
  setN(n) { this.n = n; if (this.i >= n) this.i = Math.max(0, n - 1); if (this.top > this.i) this.top = this.i; }
}

function drawPartyPanel(x, y, selIdx, showCursor) {
  win(x, y, 176, 186);
  party().forEach((h, i) => {
    const yy = y + 8 + i * 58;
    const s = stats(h);
    drawChar(HEROES[h.id].sprite, 'down', 0, x + 12, yy + 4);
    if (h.hp <= 0) { ctx.globalAlpha = 0.5; rect(x + 12, yy + 4, 16, 16, '#400'); ctx.globalAlpha = 1; }
    text(HEROES[h.id].name, x + 36, yy, 'white');
    text('Lv' + h.lv, x + 120, yy, 'yellow');
    text(HEROES[h.id].cls, x + 36, yy + 10, 'gray');
    const hpc = h.hp <= 0 ? 'red' : h.hp < s.hp / 4 ? 'yellow' : 'white';
    text('HP', x + 8, yy + 24, 'blue'); textR(h.hp + '/' + s.hp, x + 168, yy + 24, hpc);
    bar(x + 32, yy + 34, 136, h.hp, s.hp, '#58d854');
    text('MP', x + 8, yy + 40, 'blue'); textR(h.mp + '/' + s.mp, x + 168, yy + 40, 'white');
    if (h.status) text(h.status === 'poison' ? 'PSN' : 'SLP', x + 120, yy + 10, 'purple');
    if (showCursor && i === selIdx) cursor(x + 2, yy + 8);
  });
}

class PauseMenu {
  constructor() {
    this.opts = ['Items', 'Skills', 'Equip', 'Status', 'Save', 'Options', 'Quit'];
    this.nav = new ListNav(this.opts.length);
    this.pickHero = false; this.hnav = new ListNav(1);
  }
  update() {
    if (this.pickHero) {
      this.hnav.setN(G.party.length);
      this.hnav.update();
      if (Input.hit('cancel')) { Audio8.sfx('cancel'); this.pickHero = false; return; }
      if (Input.hit('ok')) {
        Audio8.sfx('ok');
        const h = party()[this.hnav.i];
        const o = this.opts[this.nav.i];
        if (o === 'Skills') Scenes.push(new SkillMenu(h));
        if (o === 'Equip') Scenes.push(new EquipMenu(h));
        if (o === 'Status') Scenes.push(new StatusMenu(this.hnav.i));
        this.pickHero = false;
      }
      return;
    }
    this.nav.update();
    if (Input.hit('cancel')) { Audio8.sfx('cancel'); Scenes.pop(this); return; }
    if (Input.hit('ok')) {
      Audio8.sfx('ok');
      const o = this.opts[this.nav.i];
      if (o === 'Items') Scenes.push(new ItemMenu());
      else if (o === 'Save') Scenes.push(new SaveMenu('save'));
      else if (o === 'Options') Scenes.push(new OptionsMenu());
      else if (o === 'Quit') Scenes.push(new ConfirmBox('Return to the title screen? Unsaved progress will be lost.', yes => { if (yes) { Scenes.clear(); Fade.a = 0; Scenes.push(new Title()); } }));
      else { this.pickHero = true; this.hnav.i = 0; }
    }
  }
  draw() {
    drawPartyPanel(0, 0, this.hnav.i, this.pickHero);
    win(176, 0, 80, 112);
    this.opts.forEach((o, i) => text(o, 192, 8 + i * 14, 'white'));
    cursor(180, 8 + this.nav.i * 14);
    win(176, 112, 80, 74);
    text('Gold', 184, 120, 'yellow'); textR(G.gold, 250, 132);
    text('Time', 184, 148, 'yellow'); textR(fmtTime(G.time), 250, 160);
    win(0, 186, SW, 38);
    const shards = ['shard_verdant', 'shard_tide', 'shard_frost', 'shard_ember'];
    text((MAPS[G.map] && MAPS[G.map].name) || '', 10, 192, 'white');
    text('Shards', 10, 206, 'gray');
    const cols = ['shardgreen', 'shardteal', 'shardblue', 'shardred'];
    shards.forEach((s, i) => { if (hasItem(s)) drawObj(cols[i], 64 + i * 14, 200); else rect(70 + i * 14, 207, 3, 3, '#445'); });
    if (G.flags.objective) { text(G.flags.objective.slice(0, 16), 120, 206, 'cyan'); }
  }
}

class ConfirmBox {
  constructor(msg, cb) { this.lines = wrapText(msg, 26); this.cb = cb; this.sel = 1; }
  update() {
    if (Input.rep('up') || Input.rep('down')) { this.sel = 1 - this.sel; Audio8.sfx('cursor'); }
    if (Input.hit('cancel')) { Audio8.sfx('cancel'); Scenes.pop(this); this.cb(false); }
    else if (Input.hit('ok')) { Audio8.sfx('ok'); Scenes.pop(this); this.cb(this.sel === 0); }
  }
  draw() {
    const h = this.lines.length * 12 + 44;
    win(16, 60, 224, h);
    this.lines.forEach((l, i) => text(l, 24, 68 + i * 12));
    const y = 72 + this.lines.length * 12;
    text('Yes', 48, y); text('No', 48, y + 12);
    cursor(36, y + this.sel * 12);
  }
}

// pick a party member as a target (field use)
class TargetPicker {
  constructor(title, onPick, allowDead = false, all = false) {
    this.title = title; this.onPick = onPick; this.nav = new ListNav(G.party.length); this.allowDead = allowDead; this.all = all;
  }
  update() {
    this.nav.update();
    if (Input.hit('cancel')) { Audio8.sfx('cancel'); Scenes.pop(this); return; }
    if (Input.hit('ok')) {
      const r = this.onPick(this.all ? party() : party()[this.nav.i]);
      if (r === 'close') Scenes.pop(this);
    }
  }
  draw() {
    drawPartyPanel(80, 0, this.nav.i, !this.all || (FRAME >> 3) % 2);
    if (this.all) party().forEach((h, i) => cursor(82, 16 + i * 58));
    win(0, 186, SW, 38);
    text(this.title, 10, 200);
  }
}

function applyItemField(id, h) {
  const it = ITEMS[id];
  if (!it || it.battleOnly || it.key) return false;
  const targets = Array.isArray(h) ? h : [h];
  let ok = false;
  for (const t of targets) {
    const s = stats(t);
    if (it.use === 'revive') { if (t.hp <= 0) { t.hp = Math.floor(s.hp / 2); ok = true; } continue; }
    if (t.hp <= 0) continue;
    if (it.use === 'heal' || it.use === 'healall') { if (t.hp < s.hp) { t.hp = Math.min(s.hp, t.hp + it.amt); ok = true; } }
    if (it.use === 'mp') { if (t.mp < s.mp) { t.mp = Math.min(s.mp, t.mp + it.amt); ok = true; } }
    if (it.use === 'cure') { if (t.status) { t.status = null; ok = true; } }
    if (it.use === 'full' || it.use === 'fullall') { if (t.hp < s.hp || t.mp < s.mp) { t.hp = s.hp; t.mp = s.mp; t.status = null; ok = true; } }
  }
  return ok;
}

class ItemMenu {
  constructor() { this.nav = new ListNav(0, 11); this.refresh(); }
  refresh() {
    const ids = Object.keys(G.items).filter(id => ITEMS[id]);
    ids.sort((a, b) => (!!ITEMS[a].key - !!ITEMS[b].key));
    const eq = Object.keys(G.items).filter(id => EQUIP[id]);
    this.list = ids.concat(eq);
    this.nav.setN(this.list.length);
  }
  update() {
    this.nav.update();
    if (Input.hit('cancel')) { Audio8.sfx('cancel'); Scenes.pop(this); return; }
    if (Input.hit('ok') && this.list.length) {
      const id = this.list[this.nav.i];
      const it = ITEMS[id];
      if (!it || it.key || it.battleOnly) { Audio8.sfx('buzz'); return; }
      Audio8.sfx('ok');
      const all = it.tgt === 'allies';
      Scenes.push(new TargetPicker('Use ' + it.name + ' on ' + (all ? 'the party' : 'whom?'), h => {
        if (!hasItem(id)) return 'close';
        if (applyItemField(id, h)) {
          removeItem(id); Audio8.sfx('heal'); this.refresh();
          if (!hasItem(id)) return 'close';
        } else Audio8.sfx('buzz');
      }, it.use === 'revive', all));
    }
  }
  draw() {
    win(0, 0, SW, 186);
    text('ITEMS', 12, 8, 'yellow');
    if (!this.list.length) text('Nothing here.', 24, 28, 'gray');
    for (let k = 0; k < this.nav.vis; k++) {
      const i = this.nav.top + k;
      if (i >= this.list.length) break;
      const id = this.list[i];
      const info = itemInfo(id);
      const col = ITEMS[id] ? (ITEMS[id].key ? 'cyan' : ITEMS[id].battleOnly ? 'gray' : 'white') : 'purple';
      text(info.name, 24, 24 + k * 14, col);
      if (!(ITEMS[id] && ITEMS[id].key)) textR('x' + G.items[id], 246, 24 + k * 14);
    }
    if (this.list.length) cursor(10, 24 + (this.nav.i - this.nav.top) * 14);
    win(0, 186, SW, 38);
    const id = this.list[this.nav.i];
    if (id) {
      const info = itemInfo(id);
      text(info.desc || equipDesc(info), 10, 194);
      if (EQUIP[id]) text('Equip from the Equip menu.', 10, 208, 'gray');
    }
  }
}

function equipDesc(e) {
  const parts = [];
  for (const k of ['atk', 'def', 'mag', 'spd', 'hp', 'mp']) if (e[k]) parts.push(k.toUpperCase() + '+' + e[k]);
  if (e.el) parts.push(e.el.toUpperCase());
  if (e.ward) parts.push('No PSN/SLP');
  return parts.join(' ');
}

class SkillMenu {
  constructor(h) { this.h = h; this.nav = new ListNav(h.skills.length, 9); }
  update() {
    this.nav.update();
    if (Input.hit('cancel')) { Audio8.sfx('cancel'); Scenes.pop(this); return; }
    if (Input.hit('ok') && this.h.skills.length) {
      const sk = SKILLS[this.h.skills[this.nav.i]];
      if (!sk.field || this.h.hp <= 0) { Audio8.sfx('buzz'); return; }
      if (this.h.mp < sk.mp) { Audio8.sfx('buzz'); return; }
      Audio8.sfx('ok');
      const all = sk.tgt === 'allies';
      Scenes.push(new TargetPicker(sk.name + (all ? ' on the party' : ' on whom?'), t => {
        if (this.h.mp < sk.mp) return 'close';
        const ts = Array.isArray(t) ? t : [t];
        let ok = false;
        for (const x of ts) {
          const s = stats(x);
          if (sk.kind === 'revive') { if (x.hp <= 0) { x.hp = Math.floor(s.hp / 2); ok = true; } continue; }
          if (x.hp <= 0) continue;
          if (sk.kind === 'heal' && x.hp < s.hp) { x.hp = Math.min(s.hp, x.hp + Math.round(stats(this.h).mag * sk.pow + sk.base)); ok = true; }
          if ((sk.kind === 'cure' || sk.cure) && x.status) { x.status = null; ok = true; }
        }
        if (ok) { this.h.mp -= sk.mp; Audio8.sfx('heal'); } else Audio8.sfx('buzz');
        if (this.h.mp < sk.mp) return 'close';
      }, sk.kind === 'revive', all));
    }
  }
  draw() {
    win(0, 0, SW, 186);
    text(HEROES[this.h.id].name + "'s Skills", 12, 8, 'yellow');
    textR('MP ' + this.h.mp + '/' + stats(this.h).mp, 248, 8);
    for (let k = 0; k < this.nav.vis; k++) {
      const i = this.nav.top + k;
      if (i >= this.h.skills.length) break;
      const sk = SKILLS[this.h.skills[i]];
      text(sk.name, 24, 26 + k * 16, sk.field ? 'white' : 'gray');
      textR(sk.mp, 246, 26 + k * 16, 'blue');
    }
    if (this.h.skills.length) cursor(10, 26 + (this.nav.i - this.nav.top) * 16);
    win(0, 186, SW, 38);
    const s = this.h.skills[this.nav.i];
    if (s) { text(SKILLS[s].desc, 10, 194); if (!SKILLS[s].field) text('Battle only', 10, 208, 'gray'); }
  }
}

class EquipMenu {
  constructor(h) { this.h = h; this.slots = ['weapon', 'armor', 'acc']; this.nav = new ListNav(3); this.picking = false; this.pnav = new ListNav(0, 6); }
  options() {
    const slot = this.slots[this.nav.i];
    const list = Object.keys(G.items).filter(id => EQUIP[id] && EQUIP[id].slot === slot && EQUIP[id].who.includes(this.h.id));
    if (slot === 'acc' && this.h.equip.acc) list.unshift(null);
    return list;
  }
  update() {
    if (this.picking) {
      const opts = this.options();
      this.pnav.setN(opts.length);
      this.pnav.update();
      if (Input.hit('cancel')) { Audio8.sfx('cancel'); this.picking = false; return; }
      if (Input.hit('ok') && opts.length) {
        Audio8.sfx('ok');
        const slot = this.slots[this.nav.i];
        const id = opts[this.pnav.i];
        const cur = this.h.equip[slot];
        const sBefore = stats(this.h);
        if (cur) addItem(cur);
        if (id) removeItem(id);
        this.h.equip[slot] = id;
        const sAfter = stats(this.h);
        this.h.hp = Math.min(this.h.hp, sAfter.hp); this.h.mp = Math.min(this.h.mp, sAfter.mp);
        if (this.h.hp > 0 && sAfter.hp > sBefore.hp) this.h.hp += 0;
        this.picking = false;
      }
      return;
    }
    this.nav.update();
    if (Input.hit('cancel')) { Audio8.sfx('cancel'); Scenes.pop(this); return; }
    if (Input.hit('ok')) {
      if (!this.options().length) { Audio8.sfx('buzz'); return; }
      Audio8.sfx('ok'); this.picking = true; this.pnav.i = 0; this.pnav.top = 0;
    }
  }
  previewStats() {
    if (!this.picking) return null;
    const opts = this.options();
    if (!opts.length) return null;
    const slot = this.slots[this.nav.i];
    const copy = { ...this.h, equip: { ...this.h.equip, [slot]: opts[this.pnav.i] } };
    return stats(copy);
  }
  draw() {
    win(0, 0, SW, 82);
    drawChar(HEROES[this.h.id].sprite, 'down', 0, 10, 8);
    text(HEROES[this.h.id].name, 32, 12, 'yellow');
    const names = { weapon: 'Weapon', armor: 'Armor', acc: 'Access.' };
    this.slots.forEach((s, i) => {
      text(names[s], 24, 32 + i * 14, 'blue');
      const e = EQUIP[this.h.equip[s]];
      text(e ? e.name : '-', 96, 32 + i * 14);
    });
    cursor(10, 32 + this.nav.i * 14);
    // stats
    win(0, 82, 112, 104);
    const s = stats(this.h), p = this.previewStats();
    ['atk', 'def', 'mag', 'spd', 'hp', 'mp'].forEach((k, i) => {
      text(k.toUpperCase(), 8, 92 + i * 14, 'blue');
      textR(s[k], 64, 92 + i * 14);
      if (p && p[k] !== s[k]) { text('>', 68, 92 + i * 14, 'gray'); textR(p[k], 106, 92 + i * 14, p[k] > s[k] ? 'green' : 'red'); }
    });
    win(112, 82, 144, 104);
    if (this.picking) {
      const opts = this.options();
      for (let k = 0; k < this.pnav.vis; k++) {
        const i = this.pnav.top + k;
        if (i >= opts.length) break;
        const id = opts[i];
        text(id ? EQUIP[id].name.slice(0, 13) : '(remove)', 128, 92 + k * 14, id ? 'white' : 'gray');
      }
      cursor(116, 92 + (this.pnav.i - this.pnav.top) * 14);
    } else {
      const n = this.options().length;
      text(n ? n + ' item(s)' : 'Nothing to', 124, 92, 'gray');
      text(n ? 'available' : 'equip here', 124, 104, 'gray');
    }
    win(0, 186, SW, 38);
    if (this.picking) { const id = this.options()[this.pnav.i]; if (id) text(equipDesc(EQUIP[id]), 10, 200); }
    else { const e = EQUIP[this.h.equip[this.slots[this.nav.i]]]; if (e) text(equipDesc(e), 10, 200); }
  }
}

class StatusMenu {
  constructor(i) { this.i = i; }
  update() {
    if (Input.hit('cancel') || Input.hit('ok')) { Audio8.sfx('cancel'); Scenes.pop(this); }
    if (Input.rep('left') || Input.rep('up')) { this.i = (this.i + G.party.length - 1) % G.party.length; Audio8.sfx('cursor'); }
    if (Input.rep('right') || Input.rep('down')) { this.i = (this.i + 1) % G.party.length; Audio8.sfx('cursor'); }
  }
  draw() {
    const h = party()[this.i], d = HEROES[h.id], s = stats(h);
    win(0, 0, SW, SH);
    ctx.save(); ctx.translate(16, 12); ctx.scale(2, 2); drawChar(d.sprite, 'down', 0, 0, 0); ctx.restore();
    text(d.name, 60, 14, 'yellow'); text(d.cls, 60, 26, 'gray'); text('Lv ' + h.lv, 180, 14);
    text('HP', 16, 56, 'blue'); textR(h.hp + '/' + s.hp, 120, 56);
    text('MP', 16, 70, 'blue'); textR(h.mp + '/' + s.mp, 120, 70);
    const ks = [['ATK', 'atk'], ['DEF', 'def'], ['MAG', 'mag'], ['SPD', 'spd']];
    ks.forEach(([l, k], i) => { text(l, 140, 56 + i * 14, 'blue'); textR(s[k], 240, 56 + i * 14); });
    text('EXP', 16, 98, 'blue'); textR(h.exp, 120, 98);
    text('Next', 16, 112, 'blue'); textR(h.lv >= MAX_LV ? '-' : expFor(h.lv + 1) - h.exp, 120, 112);
    text('Equipment', 16, 136, 'yellow');
    ['weapon', 'armor', 'acc'].forEach((sl, i) => { const e = EQUIP[h.equip[sl]]; text(e ? e.name : '-', 24, 150 + i * 12); });
    text('Skills: ' + h.skills.length, 150, 136, 'yellow');
    if (h.status) text(h.status.toUpperCase(), 150, 150, 'purple');
    text('<  >  switch hero', 16, 204, 'gray');
  }
}

class OptionsMenu {
  constructor() { this.nav = new ListNav(4); }
  update() {
    this.nav.update();
    if (Input.hit('cancel') || Input.hit('ok')) { Audio8.sfx('cancel'); saveSettings(); Scenes.pop(this); return; }
    const d = Input.rep('left') ? -1 : Input.rep('right') ? 1 : 0;
    if (!d) return;
    Audio8.sfx('cursor');
    const i = this.nav.i;
    if (i === 0) SETTINGS.music = clamp(Math.round((SETTINGS.music + d * 0.1) * 10) / 10, 0, 1);
    if (i === 1) SETTINGS.sfx = clamp(Math.round((SETTINGS.sfx + d * 0.1) * 10) / 10, 0, 1);
    if (i === 2) SETTINGS.textSpeed = clamp(SETTINGS.textSpeed + d, 0, 3);
    if (i === 3) SETTINGS.encounters = clamp(SETTINGS.encounters + d, 0, 1);
    Audio8.setVolumes(SETTINGS.music, SETTINGS.sfx);
  }
  draw() {
    win(16, 40, 224, 120);
    text('OPTIONS', 32, 50, 'yellow');
    const rows = [
      ['Music', Math.round(SETTINGS.music * 10)],
      ['Sound', Math.round(SETTINGS.sfx * 10)],
      ['Text', ['Slow', 'Normal', 'Fast', 'Instant'][SETTINGS.textSpeed]],
      ['Battles', SETTINGS.encounters ? 'Normal' : 'Fewer'],
    ];
    rows.forEach(([l, v], i) => { text(l, 40, 72 + i * 16); text('< ' + v + ' >', 136, 72 + i * 16, 'cyan'); });
    cursor(28, 72 + this.nav.i * 16);
    text('M key mutes', 40, 140, 'gray');
  }
}

class SaveMenu {
  constructor(mode, cb) { this.mode = mode; this.cb = cb; this.nav = new ListNav(3); this.msg = null; this.msgT = 0; }
  update() {
    if (this.msgT > 0) { if (--this.msgT === 0 || Input.hit('ok')) { this.close(); } return; }
    this.nav.update();
    if (Input.hit('cancel')) { Audio8.sfx('cancel'); this.close(); return; }
    if (Input.hit('ok')) {
      const slot = this.nav.i + 1;
      if (this.mode === 'save') {
        const doSave = () => {
          if (saveGame(slot)) { Audio8.sfx('save'); this.msg = 'Saved to slot ' + slot + '.'; }
          else { Audio8.sfx('buzz'); this.msg = 'Could not save (storage blocked).'; }
          this.msgT = 70;
        };
        if (saveMeta(slot)) Scenes.push(new ConfirmBox('Overwrite slot ' + slot + '?', y => { if (y) doSave(); }));
        else doSave();
      } else {
        if (!saveMeta(slot)) { Audio8.sfx('buzz'); return; }
        Audio8.sfx('ok');
        Scenes.pop(this);
        if (this.cb) this.cb(slot);
      }
    }
  }
  close() { Scenes.pop(this); if (this.cb && this.mode === 'save') this.cb(); }
  draw() {
    win(8, 16, 240, 192);
    text(this.mode === 'save' ? 'SAVE GAME' : 'LOAD GAME', 24, 26, 'yellow');
    for (let i = 0; i < 3; i++) {
      const m = saveMeta(i + 1);
      const y = 48 + i * 50;
      win(24, y, 216, 44);
      text('Slot ' + (i + 1), 34, y + 8, 'cyan');
      if (m) {
        text(m.place.slice(0, 16), 100, y + 8);
        text('Lv ' + m.lv, 34, y + 24); text(fmtTime(m.time), 100, y + 24);
        m.party.forEach((p, k) => drawChar(HEROES[p].sprite, 'down', 0, 170 + k * 18, y + 22));
        const cols = ['shardgreen', 'shardteal', 'shardblue', 'shardred'];
        for (let k = 0; k < m.shards; k++) drawObj(cols[k], 190 + k * 10, y);
      } else text('- empty -', 100, y + 16, 'gray');
    }
    cursor(12, 64 + this.nav.i * 50);
    if (this.msgT > 0) { win(40, 96, 176, 28); textC(this.msg, 128, 106); }
  }
}

class ShopMenu {
  constructor(list, cb) { this.list = list; this.cb = cb; this.mode = null; this.top = new ListNav(3); this.nav = new ListNav(list.length, 8); this.qty = 1; this.qtyMode = false; }
  sellList() { return Object.keys(G.items).filter(id => { const i = itemInfo(id); return i && !i.key && i.price; }); }
  update() {
    if (this.qtyMode) {
      const id = this.cur;
      const price = this.mode === 'buy' ? itemInfo(id).price : Math.floor(itemInfo(id).price / 2);
      const max = this.mode === 'buy' ? Math.max(1, Math.min(99, Math.floor(G.gold / price))) : itemCount(id);
      if (Input.rep('up') || Input.rep('right')) { this.qty = Math.min(max, this.qty + (Input.rep('right') ? 10 : 1)); Audio8.sfx('cursor'); }
      if (Input.rep('down') || Input.rep('left')) { this.qty = Math.max(1, this.qty - (Input.rep('left') ? 10 : 1)); Audio8.sfx('cursor'); }
      if (Input.hit('cancel')) { Audio8.sfx('cancel'); this.qtyMode = false; return; }
      if (Input.hit('ok')) {
        if (this.mode === 'buy') {
          if (G.gold < price * this.qty) { Audio8.sfx('buzz'); return; }
          G.gold -= price * this.qty; addItem(id, this.qty);
        } else { G.gold += price * this.qty; removeItem(id, this.qty); }
        Audio8.sfx('coin'); this.qtyMode = false;
      }
      return;
    }
    if (!this.mode) {
      this.top.update();
      if (Input.hit('cancel')) { Audio8.sfx('cancel'); Scenes.pop(this); this.cb(); return; }
      if (Input.hit('ok')) {
        Audio8.sfx('ok');
        if (this.top.i === 2) { Scenes.pop(this); this.cb(); return; }
        this.mode = this.top.i === 0 ? 'buy' : 'sell';
        this.nav = new ListNav(this.mode === 'buy' ? this.list.length : this.sellList().length, 8);
      }
      return;
    }
    const items = this.mode === 'buy' ? this.list : this.sellList();
    this.nav.setN(items.length);
    this.nav.update();
    if (Input.hit('cancel')) { Audio8.sfx('cancel'); this.mode = null; return; }
    if (Input.hit('ok') && items.length) {
      const id = items[this.nav.i];
      const info = itemInfo(id);
      if (this.mode === 'buy' && G.gold < info.price) { Audio8.sfx('buzz'); return; }
      Audio8.sfx('ok');
      this.cur = id; this.qty = 1;
      if (EQUIP[id] && this.mode === 'buy') {
        G.gold -= info.price; addItem(id); Audio8.sfx('coin');
      } else this.qtyMode = true;
    }
  }
  draw() {
    win(0, 0, SW, 30);
    ['Buy', 'Sell', 'Leave'].forEach((o, i) => text(o, 24 + i * 80, 11, this.mode && this.top.i === i ? 'yellow' : 'white'));
    if (!this.mode) cursor(12 + this.top.i * 80, 11);
    win(176, 30, 80, 30); textR(G.gold + 'G', 248, 41, 'yellow');
    win(0, 30, 176, 156);
    const items = this.mode === 'sell' ? this.sellList() : this.list;
    for (let k = 0; k < 9; k++) {
      const i = (this.mode ? this.nav.top : 0) + k;
      if (i >= items.length || k >= 8) break;
      const id = items[i]; const info = itemInfo(id);
      const price = this.mode === 'sell' ? Math.floor(info.price / 2) : info.price;
      const col = this.mode !== 'sell' && G.gold < price ? 'gray' : 'white';
      text(info.name.slice(0, 13), 20, 40 + k * 17, col);
      textR(price, 170, 40 + k * 17, 'yellow');
    }
    if (this.mode) cursor(8, 40 + (this.nav.i - this.nav.top) * 17);
    // side panel: owned + who can equip / stat preview
    win(176, 60, 80, 126);
    const id = this.mode ? items[this.nav.i] : null;
    if (id) {
      text('Have', 184, 68, 'gray'); textR(itemCount(id), 250, 68);
      const e = EQUIP[id];
      if (e) {
        party().forEach((h, k) => {
          const can = e.who.includes(h.id);
          drawChar(HEROES[h.id].sprite, 'down', 0, 184, 84 + k * 32);
          if (!can) { text('--', 206, 88 + k * 32, 'gray'); return; }
          const s = stats(h);
          const copy = { ...h, equip: { ...h.equip, [e.slot]: id } };
          const p = stats(copy);
          const key = e.slot === 'weapon' ? (e.mag && h.id === 'lyra' ? 'mag' : 'atk') : e.slot === 'armor' ? 'def' : Object.keys(e).find(k => ['atk', 'def', 'mag', 'spd', 'hp'].includes(k)) || 'def';
          const dlt = p[key] - s[key];
          const eqd = h.equip[e.slot] === id;
          text(eqd ? 'E' : (dlt >= 0 ? '+' : '') + dlt, 206, 88 + k * 32, eqd ? 'cyan' : dlt > 0 ? 'green' : dlt < 0 ? 'red' : 'white');
          text(key.toUpperCase(), 206, 98 + k * 32, 'gray');
        });
      }
    }
    win(0, 186, SW, 38);
    if (id) text(itemInfo(id).desc || equipDesc(itemInfo(id)), 10, 200);
    else text('Welcome! What do you need?', 10, 200);
    if (this.qtyMode) {
      const price = this.mode === 'buy' ? itemInfo(this.cur).price : Math.floor(itemInfo(this.cur).price / 2);
      win(40, 80, 176, 56);
      text(itemInfo(this.cur).name, 52, 90, 'yellow');
      text('Qty  < ' + this.qty + ' >', 52, 106);
      textR(price * this.qty + 'G', 206, 120, 'yellow');
    }
  }
}
