'use strict';
// ---------- game state, party maths, inventory, save/load ----------
let G = null;
const SAVE_KEY = 'shardbound_v1_slot';
const SETTINGS_KEY = 'shardbound_v1_settings';
let SETTINGS = { music: 0.8, sfx: 0.9, textSpeed: 2, encounters: 1 };

function newGame() {
  G = {
    party: [], heroes: {}, gold: 120, items: { potion: 4, antidote: 2 }, flags: {},
    map: 'aren_house', x: 4, y: 4, dir: 'down', time: 0, steps: 0, chapter: 0, battles: 0,
  };
  addHero('aren', 1);
}

function addHero(id, lv) {
  const d = HEROES[id];
  const h = { id, lv, exp: expFor(lv), hp: 1, mp: 0, equip: { ...d.start }, status: null, skills: [] };
  for (let l = 1; l <= lv; l++) if (d.learn[l]) h.skills.push(d.learn[l]);
  G.heroes[id] = h;
  if (!G.party.includes(id)) G.party.push(id);
  const s = stats(h); h.hp = s.hp; h.mp = s.mp;
  return h;
}

function hero(id) { return G.heroes[id]; }
function party() { return G.party.map(id => G.heroes[id]); }

function stats(h) {
  const d = HEROES[h.id];
  const s = {};
  for (const k of ['hp', 'mp', 'atk', 'def', 'mag', 'spd']) s[k] = Math.floor(d.base[k] + d.grow[k] * (h.lv - 1));
  s.ward = false; s.el = null;
  for (const slot of ['weapon', 'armor', 'acc']) {
    const e = EQUIP[h.equip[slot]];
    if (!e) continue;
    for (const k of ['hp', 'mp', 'atk', 'def', 'mag', 'spd']) if (e[k]) s[k] += e[k];
    if (e.ward) s.ward = true;
    if (slot === 'weapon' && e.el) s.el = e.el;
  }
  return s;
}

function gainExp(h, n) {
  const msgs = [];
  if (h.hp <= 0) return msgs;
  h.exp += n;
  while (h.lv < MAX_LV && h.exp >= expFor(h.lv + 1)) {
    const before = stats(h);
    h.lv++;
    const after = stats(h);
    h.hp += after.hp - before.hp; h.mp += after.mp - before.mp;
    msgs.push(HEROES[h.id].name + ' reached Lv ' + h.lv + '!');
    const sk = HEROES[h.id].learn[h.lv];
    if (sk && !h.skills.includes(sk)) { h.skills.push(sk); msgs.push(HEROES[h.id].name + ' learned ' + SKILLS[sk].name + '!'); }
  }
  return msgs;
}

function healParty() {
  for (const h of party()) { const s = stats(h); h.hp = s.hp; h.mp = s.mp; h.status = null; }
}

function avgLevel() {
  const p = party();
  return Math.round(p.reduce((a, h) => a + h.lv, 0) / p.length);
}

// inventory
function addItem(id, n = 1) { G.items[id] = (G.items[id] || 0) + n; }
function hasItem(id) { return (G.items[id] || 0) > 0; }
function removeItem(id, n = 1) {
  G.items[id] = (G.items[id] || 0) - n;
  if (G.items[id] <= 0) delete G.items[id];
}
function itemCount(id) { return G.items[id] || 0; }
function isEquipped(id) { return party().some(h => Object.values(h.equip).includes(id)); }

// flags
function flag(f) { return !!G.flags[f]; }
function setFlag(f, v = true) { G.flags[f] = v; }

// ---------- saving ----------
function saveGame(slot) {
  try {
    const meta = {
      lv: hero('aren').lv, place: (MAPS[G.map] && MAPS[G.map].name) || '', time: G.time,
      party: G.party.slice(), shards: ['shard_verdant', 'shard_tide', 'shard_frost', 'shard_ember'].filter(hasItem).length,
    };
    localStorage.setItem(SAVE_KEY + slot, JSON.stringify({ meta, G }));
    return true;
  } catch (e) { return false; }
}
function loadGame(slot) {
  try {
    const raw = localStorage.getItem(SAVE_KEY + slot);
    if (!raw) return false;
    G = JSON.parse(raw).G;
    return true;
  } catch (e) { return false; }
}
function saveMeta(slot) {
  try {
    const raw = localStorage.getItem(SAVE_KEY + slot);
    return raw ? JSON.parse(raw).meta : null;
  } catch (e) { return null; }
}
function anySave() { for (let i = 1; i <= 3; i++) if (saveMeta(i)) return true; return false; }
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); } catch (e) { /* storage blocked */ } }
function loadSettings() {
  try { const r = localStorage.getItem(SETTINGS_KEY); if (r) SETTINGS = { ...SETTINGS, ...JSON.parse(r) }; } catch (e) { /* storage blocked */ }
  Audio8.setVolumes(SETTINGS.music, SETTINGS.sfx);
}
