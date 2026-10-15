'use strict';
// ---------- game data: heroes, skills, items, equipment, enemies, shops ----------

const HEROES = {
  aren: {
    name: 'Aren', cls: 'Knight', sprite: 'aren', armor: 'heavy', weapon: 'sword',
    base: { hp: 62, mp: 8, atk: 12, def: 10, mag: 4, spd: 8 },
    grow: { hp: 14, mp: 1.6, atk: 2.7, def: 2.2, mag: 0.8, spd: 1.1 },
    learn: { 1: 'strike', 4: 'armorbreak', 7: 'cleave', 11: 'rally', 15: 'holyblade', 20: 'whirlwind', 24: 'sunbreak' },
    start: { weapon: 'bronzesword', armor: 'tunic', acc: null },
  },
  lyra: {
    name: 'Lyra', cls: 'Mage', sprite: 'lyra', armor: 'robe', weapon: 'staff',
    base: { hp: 40, mp: 22, atk: 6, def: 6, mag: 14, spd: 10 },
    grow: { hp: 8.5, mp: 4.6, atk: 1.0, def: 1.3, mag: 3.0, spd: 1.4 },
    learn: { 1: 'ember', 2: 'frost', 5: 'bolt', 7: 'sleep', 9: 'flamewave', 11: 'icestorm', 13: 'tempest', 15: 'weaken', 17: 'inferno', 19: 'glacier', 22: 'thunderlord', 25: 'starfall' },
    start: { weapon: 'oakstaff', armor: 'clothrobe', acc: null },
  },
  bram: {
    name: 'Bram', cls: 'Cleric', sprite: 'bram', armor: 'robe', weapon: 'mace',
    base: { hp: 52, mp: 16, atk: 10, def: 9, mag: 11, spd: 7 },
    grow: { hp: 11.5, mp: 3.6, atk: 1.9, def: 1.9, mag: 2.4, spd: 1.0 },
    learn: { 1: 'heal', 2: 'smite', 4: 'purify', 7: 'protect', 9: 'healall', 11: 'revive', 13: 'haste', 15: 'greatheal', 19: 'holynova', 23: 'sanctuary' },
    start: { weapon: 'ironmace', armor: 'silkrobe', acc: null },
  },
};

// exp needed to REACH level L (total)
function expFor(L) { return L <= 1 ? 0 : Math.round(10 * Math.pow(L - 1, 2.2)); }
const MAX_LV = 40;

const SKILLS = {
  // Aren
  strike: { name: 'Power Strike', mp: 3, kind: 'phys', tgt: 'enemy', pow: 1.8, fx: 'slash', desc: 'A heavy blow. 1.8x damage.' },
  armorbreak: { name: 'Armor Break', mp: 5, kind: 'phys', tgt: 'enemy', pow: 1.0, debuff: 'def', fx: 'slash', desc: 'Hit and lower DEF for 3 turns.' },
  cleave: { name: 'Cleave', mp: 6, kind: 'phys', tgt: 'enemies', pow: 0.9, fx: 'slash', desc: 'Strike every enemy.' },
  rally: { name: 'Rally', mp: 8, kind: 'buff', tgt: 'allies', buff: 'atk', fx: 'buff', desc: 'Raise party ATK for 3 turns.' },
  holyblade: { name: 'Holy Blade', mp: 12, kind: 'phys', tgt: 'enemy', pow: 2.6, el: 'holy', fx: 'holy', desc: 'Holy strike. 2.6x damage.' },
  whirlwind: { name: 'Whirlwind', mp: 15, kind: 'phys', tgt: 'enemies', pow: 1.5, fx: 'slash', desc: 'Spinning slash on all foes.' },
  sunbreak: { name: 'Sunbreaker', mp: 24, kind: 'phys', tgt: 'enemies', pow: 2.1, el: 'holy', fx: 'holy', desc: 'Radiant blow to all foes.' },
  // Lyra
  ember: { name: 'Ember', mp: 4, kind: 'mag', tgt: 'enemy', pow: 1.6, el: 'fire', fx: 'fire', desc: 'Fire damage to one foe.' },
  frost: { name: 'Frost', mp: 4, kind: 'mag', tgt: 'enemy', pow: 1.6, el: 'ice', fx: 'ice', desc: 'Ice damage to one foe.' },
  bolt: { name: 'Bolt', mp: 5, kind: 'mag', tgt: 'enemy', pow: 1.75, el: 'bolt', fx: 'bolt', desc: 'Lightning on one foe.' },
  sleep: { name: 'Sleep', mp: 5, kind: 'status', tgt: 'enemies', status: 'sleep', rate: 0.55, fx: 'dark', desc: 'May put all foes to sleep.' },
  flamewave: { name: 'Flame Wave', mp: 10, kind: 'mag', tgt: 'enemies', pow: 1.25, el: 'fire', fx: 'fire', desc: 'Fire on all foes.' },
  icestorm: { name: 'Ice Storm', mp: 10, kind: 'mag', tgt: 'enemies', pow: 1.25, el: 'ice', fx: 'ice', desc: 'Ice on all foes.' },
  tempest: { name: 'Tempest', mp: 12, kind: 'mag', tgt: 'enemies', pow: 1.35, el: 'bolt', fx: 'bolt', desc: 'Lightning on all foes.' },
  weaken: { name: 'Weaken', mp: 6, kind: 'debuff', tgt: 'enemy', debuff: 'def', fx: 'dark', desc: 'Lower a foe\'s DEF.' },
  inferno: { name: 'Inferno', mp: 16, kind: 'mag', tgt: 'enemy', pow: 3.0, el: 'fire', fx: 'fire', desc: 'Huge fire on one foe.' },
  glacier: { name: 'Glacier', mp: 16, kind: 'mag', tgt: 'enemy', pow: 3.0, el: 'ice', fx: 'ice', desc: 'Huge ice on one foe.' },
  thunderlord: { name: 'Thunderlord', mp: 18, kind: 'mag', tgt: 'enemy', pow: 3.2, el: 'bolt', fx: 'bolt', desc: 'Huge lightning on one foe.' },
  starfall: { name: 'Starfall', mp: 30, kind: 'mag', tgt: 'enemies', pow: 2.3, fx: 'star', desc: 'Stars rain on all foes.' },
  // Bram
  heal: { name: 'Heal', mp: 4, kind: 'heal', tgt: 'ally', pow: 2.0, base: 15, fx: 'heal', field: true, desc: 'Restore one ally\'s HP.' },
  smite: { name: 'Smite', mp: 5, kind: 'mag', tgt: 'enemy', pow: 1.6, el: 'holy', fx: 'holy', desc: 'Holy damage to one foe.' },
  purify: { name: 'Purify', mp: 3, kind: 'cure', tgt: 'ally', fx: 'heal', field: true, desc: 'Cure poison and sleep.' },
  protect: { name: 'Protect', mp: 8, kind: 'buff', tgt: 'allies', buff: 'def', fx: 'buff', desc: 'Raise party DEF for 3 turns.' },
  healall: { name: 'Healing Light', mp: 10, kind: 'heal', tgt: 'allies', pow: 1.3, base: 12, fx: 'heal', field: true, desc: 'Restore HP to the party.' },
  revive: { name: 'Revive', mp: 14, kind: 'revive', tgt: 'dead', fx: 'heal', field: true, desc: 'Revive a fallen ally.' },
  haste: { name: 'Haste', mp: 8, kind: 'buff', tgt: 'allies', buff: 'spd', fx: 'buff', desc: 'Raise party SPD for 3 turns.' },
  greatheal: { name: 'Greater Heal', mp: 12, kind: 'heal', tgt: 'ally', pow: 4.0, base: 40, fx: 'heal', field: true, desc: 'Restore lots of HP.' },
  holynova: { name: 'Holy Nova', mp: 20, kind: 'mag', tgt: 'enemies', pow: 1.9, el: 'holy', fx: 'holy', desc: 'Holy damage to all foes.' },
  sanctuary: { name: 'Sanctuary', mp: 28, kind: 'heal', tgt: 'allies', pow: 3.2, base: 60, cure: true, fx: 'heal', field: true, desc: 'Big party heal and cure.' },
};

// enemy skills
const ESKILLS = {
  bite: { name: 'Bite', kind: 'phys', tgt: 'one', pow: 1.3 },
  poisonbite: { name: 'Venom Bite', kind: 'phys', tgt: 'one', pow: 1.0, status: 'poison', rate: 0.5 },
  sting: { name: 'Sting', kind: 'phys', tgt: 'one', pow: 1.1, status: 'poison', rate: 0.4 },
  tackle: { name: 'Tackle', kind: 'phys', tgt: 'one', pow: 1.5 },
  slam: { name: 'Slam', kind: 'phys', tgt: 'all', pow: 0.8 },
  tail: { name: 'Tail Sweep', kind: 'phys', tgt: 'all', pow: 0.9 },
  crush: { name: 'Crush', kind: 'phys', tgt: 'one', pow: 2.0 },
  spore: { name: 'Sleep Spores', kind: 'status', tgt: 'all', status: 'sleep', rate: 0.3, fx: 'dark' },
  gaze: { name: 'Hypno Gaze', kind: 'status', tgt: 'one', status: 'sleep', rate: 0.6, fx: 'dark' },
  flame: { name: 'Flame', kind: 'mag', tgt: 'one', pow: 1.4, el: 'fire', fx: 'fire' },
  frost: { name: 'Frost', kind: 'mag', tgt: 'one', pow: 1.4, el: 'ice', fx: 'ice' },
  zap: { name: 'Zap', kind: 'mag', tgt: 'one', pow: 1.4, el: 'bolt', fx: 'bolt' },
  firebreath: { name: 'Fire Breath', kind: 'mag', tgt: 'all', pow: 0.95, el: 'fire', fx: 'fire' },
  icebreath: { name: 'Frost Breath', kind: 'mag', tgt: 'all', pow: 0.95, el: 'ice', fx: 'ice' },
  tidal: { name: 'Tidal Wave', kind: 'mag', tgt: 'all', pow: 1.0, fx: 'ice' },
  darkbolt: { name: 'Shadow Bolt', kind: 'mag', tgt: 'one', pow: 1.5, el: 'dark', fx: 'dark' },
  void: { name: 'Void Wave', kind: 'mag', tgt: 'all', pow: 1.15, el: 'dark', fx: 'dark' },
  drain: { name: 'Life Drain', kind: 'mag', tgt: 'one', pow: 1.2, drain: true, el: 'dark', fx: 'dark' },
  mend: { name: 'Mend', kind: 'heal', tgt: 'self', pow: 0.25, fx: 'heal' },
  harden: { name: 'Harden', kind: 'buff', tgt: 'self', buff: 'def', fx: 'buff' },
  roar: { name: 'Roar', kind: 'buff', tgt: 'self', buff: 'atk', fx: 'buff' },
  curse: { name: 'Curse', kind: 'debuff', tgt: 'all', debuff: 'def', fx: 'dark' },
  thorns: { name: 'Thorn Lash', kind: 'phys', tgt: 'all', pow: 0.85, status: 'poison', rate: 0.25 },
  roots: { name: 'Grasping Roots', kind: 'phys', tgt: 'one', pow: 1.6 },
  ink: { name: 'Ink Cloud', kind: 'debuff', tgt: 'all', debuff: 'atk', fx: 'dark' },
  tentacle: { name: 'Tentacle Whip', kind: 'phys', tgt: 'all', pow: 0.9 },
  maelstrom: { name: 'Maelstrom', kind: 'mag', tgt: 'all', pow: 1.3, fx: 'ice' },
  blizzard: { name: 'Blizzard', kind: 'mag', tgt: 'all', pow: 1.25, el: 'ice', fx: 'ice' },
  meteor: { name: 'Magma Rain', kind: 'mag', tgt: 'all', pow: 1.3, el: 'fire', fx: 'fire' },
  hellfire: { name: 'Hellfire', kind: 'mag', tgt: 'one', pow: 2.2, el: 'fire', fx: 'fire' },
  doom: { name: 'Hollow Crown', kind: 'mag', tgt: 'all', pow: 1.45, el: 'dark', fx: 'dark' },
  despair: { name: 'Despair', kind: 'debuff', tgt: 'all', debuff: 'atk', fx: 'dark' },
  oblivion: { name: 'Oblivion', kind: 'mag', tgt: 'all', pow: 1.7, el: 'dark', fx: 'dark' },
  rend: { name: 'Soul Rend', kind: 'phys', tgt: 'one', pow: 2.2 },
  warcry: { name: 'War Cry', kind: 'buff', tgt: 'self', buff: 'atk', fx: 'buff' },
};

// ---------- items ----------
const ITEMS = {
  potion: { name: 'Potion', price: 20, use: 'heal', amt: 60, tgt: 'ally', desc: 'Restores 60 HP.' },
  hipotion: { name: 'Hi-Potion', price: 90, use: 'heal', amt: 220, tgt: 'ally', desc: 'Restores 220 HP.' },
  megapotion: { name: 'Mega Potion', price: 300, use: 'heal', amt: 700, tgt: 'ally', desc: 'Restores 700 HP.' },
  ether: { name: 'Ether', price: 120, use: 'mp', amt: 30, tgt: 'ally', desc: 'Restores 30 MP.' },
  hiether: { name: 'Hi-Ether', price: 380, use: 'mp', amt: 100, tgt: 'ally', desc: 'Restores 100 MP.' },
  phoenix: { name: 'Phoenix Plume', price: 300, use: 'revive', tgt: 'dead', desc: 'Revives with half HP.' },
  antidote: { name: 'Antidote', price: 12, use: 'cure', tgt: 'ally', desc: 'Cures poison and sleep.' },
  salve: { name: 'Party Salve', price: 350, use: 'healall', amt: 180, tgt: 'allies', desc: 'Restores 180 HP to all.' },
  elixir: { name: 'Elixir', price: 2000, use: 'full', tgt: 'ally', desc: 'Fully restores HP and MP.' },
  megalixir: { name: 'Megalixir', price: 5000, use: 'fullall', tgt: 'allies', desc: 'Fully restores the party.' },
  firebomb: { name: 'Fire Flask', price: 150, use: 'bomb', amt: 90, el: 'fire', tgt: 'enemies', battleOnly: true, desc: 'Burns all foes (90).' },
  frostbomb: { name: 'Frost Flask', price: 150, use: 'bomb', amt: 90, el: 'ice', tgt: 'enemies', battleOnly: true, desc: 'Freezes all foes (90).' },
  smoke: { name: 'Smoke Bomb', price: 40, use: 'escape', tgt: 'none', battleOnly: true, desc: 'Escape from a battle.' },
  // key items
  shard_verdant: { name: 'Verdant Shard', key: true, desc: 'A green shard of the Sunstone.' },
  shard_tide: { name: 'Tide Shard', key: true, desc: 'A sea-blue shard of the Sunstone.' },
  shard_frost: { name: 'Frost Shard', key: true, desc: 'An icy shard of the Sunstone.' },
  shard_ember: { name: 'Ember Shard', key: true, desc: 'A burning shard of the Sunstone.' },
  royalseal: { name: 'Royal Seal', key: true, desc: 'Proof you act for the King.' },
  tidebell: { name: 'Tide Bell', key: true, desc: 'Its chime calms the sea.' },
  oldkey: { name: 'Old Key', key: true, desc: 'Opens a locked gate.' },
  bluekey: { name: 'Sapphire Key', key: true, desc: 'Opens a blue gate.' },
  redkey: { name: 'Ruby Key', key: true, desc: 'Opens a red gate.' },
  locket: { name: 'Silver Locket', key: true, desc: 'A child\'s locket. Someone lost it.' },
  pearl: { name: 'Moon Pearl', key: true, desc: 'A glowing pearl from the deep.' },
  firebloom: { name: 'Fire Bloom', key: true, desc: 'A warm flower from a hot land.' },
  shipdeed: { name: 'Sailing Pass', key: true, desc: 'Captain Morrow will sail you.' },
};

// equipment: slot weapon/armor/acc ; who: list of hero ids
const EQUIP = {
  // swords
  bronzesword: { name: 'Bronze Sword', slot: 'weapon', who: ['aren'], atk: 6, price: 60 },
  ironsword: { name: 'Iron Sword', slot: 'weapon', who: ['aren'], atk: 13, price: 220 },
  steelsword: { name: 'Steel Sword', slot: 'weapon', who: ['aren'], atk: 22, price: 600 },
  mithrilsword: { name: 'Mithril Blade', slot: 'weapon', who: ['aren'], atk: 33, price: 1500 },
  flamebrand: { name: 'Flamebrand', slot: 'weapon', who: ['aren'], atk: 42, el: 'fire', price: 3000 },
  runeblade: { name: 'Runeblade', slot: 'weapon', who: ['aren'], atk: 50, mag: 6, price: 5200 },
  dawnbringer: { name: 'Dawnbringer', slot: 'weapon', who: ['aren'], atk: 68, el: 'holy', spd: 5, price: 9999 },
  // staves
  oakstaff: { name: 'Oak Staff', slot: 'weapon', who: ['lyra'], atk: 2, mag: 5, price: 50 },
  rubyrod: { name: 'Ruby Rod', slot: 'weapon', who: ['lyra'], atk: 4, mag: 11, price: 300 },
  sapphirerod: { name: 'Sapphire Rod', slot: 'weapon', who: ['lyra'], atk: 6, mag: 18, price: 850 },
  sagestaff: { name: 'Sage Staff', slot: 'weapon', who: ['lyra'], atk: 8, mag: 27, mp: 10, price: 2200 },
  archrod: { name: 'Archmage Rod', slot: 'weapon', who: ['lyra'], atk: 10, mag: 37, mp: 20, price: 4800 },
  starstaff: { name: 'Star Staff', slot: 'weapon', who: ['lyra'], atk: 14, mag: 50, mp: 30, price: 9999 },
  // maces
  oakcudgel: { name: 'Oak Cudgel', slot: 'weapon', who: ['bram'], atk: 5, mag: 2, price: 50 },
  ironmace: { name: 'Iron Mace', slot: 'weapon', who: ['bram'], atk: 12, mag: 5, price: 260 },
  silvermace: { name: 'Silver Mace', slot: 'weapon', who: ['bram'], atk: 19, mag: 9, price: 800 },
  holymace: { name: 'Holy Mace', slot: 'weapon', who: ['bram'], atk: 27, mag: 15, el: 'holy', price: 2100 },
  morningstar: { name: 'Morning Star', slot: 'weapon', who: ['bram'], atk: 37, mag: 20, price: 4600 },
  divinemace: { name: 'Divine Mace', slot: 'weapon', who: ['bram'], atk: 48, mag: 28, el: 'holy', price: 9999 },
  // heavy armour
  tunic: { name: 'Leather Tunic', slot: 'armor', who: ['aren'], def: 4, price: 40 },
  chainmail: { name: 'Chainmail', slot: 'armor', who: ['aren'], def: 10, price: 200 },
  ironarmor: { name: 'Iron Armor', slot: 'armor', who: ['aren'], def: 18, price: 560 },
  steelplate: { name: 'Steel Plate', slot: 'armor', who: ['aren'], def: 27, price: 1400 },
  mithrilmail: { name: 'Mithril Mail', slot: 'armor', who: ['aren'], def: 37, price: 3600 },
  dragonmail: { name: 'Dragon Mail', slot: 'armor', who: ['aren'], def: 50, hp: 80, price: 9999 },
  // robes
  clothrobe: { name: 'Cloth Robe', slot: 'armor', who: ['lyra', 'bram'], def: 3, price: 30 },
  silkrobe: { name: 'Silk Robe', slot: 'armor', who: ['lyra', 'bram'], def: 7, mag: 2, price: 160 },
  mysticrobe: { name: 'Mystic Robe', slot: 'armor', who: ['lyra', 'bram'], def: 13, mag: 4, price: 520 },
  sagerobe: { name: 'Sage Robe', slot: 'armor', who: ['lyra', 'bram'], def: 20, mag: 6, price: 1300 },
  starrobe: { name: 'Star Robe', slot: 'armor', who: ['lyra', 'bram'], def: 28, mag: 10, price: 3400 },
  holyvest: { name: 'Holy Vestment', slot: 'armor', who: ['lyra', 'bram'], def: 38, mag: 14, hp: 50, price: 9999 },
  // accessories
  powerring: { name: 'Power Ring', slot: 'acc', who: ['aren', 'lyra', 'bram'], atk: 7, price: 450 },
  guardcharm: { name: 'Guard Charm', slot: 'acc', who: ['aren', 'lyra', 'bram'], def: 7, price: 450 },
  swiftboots: { name: 'Swift Boots', slot: 'acc', who: ['aren', 'lyra', 'bram'], spd: 9, price: 650 },
  magependant: { name: 'Mage Pendant', slot: 'acc', who: ['aren', 'lyra', 'bram'], mag: 9, mp: 12, price: 750 },
  lifering: { name: 'Life Ring', slot: 'acc', who: ['aren', 'lyra', 'bram'], hp: 70, price: 900 },
  wardamulet: { name: 'Ward Amulet', slot: 'acc', who: ['aren', 'lyra', 'bram'], def: 4, ward: true, price: 1000 },
  heroring: { name: 'Hero\'s Ring', slot: 'acc', who: ['aren', 'lyra', 'bram'], atk: 10, def: 10, mag: 10, spd: 5, price: 9999 },
  seashell: { name: 'Sea Charm', slot: 'acc', who: ['aren', 'lyra', 'bram'], def: 5, mp: 15, price: 600 },
};

function itemInfo(id) { return ITEMS[id] || EQUIP[id]; }

// ---------- enemies ----------
const T_HP = [0, 18, 30, 46, 80, 115, 160, 205, 265, 330, 400, 480, 570, 650];
const T_EXP = [0, 6, 9, 14, 30, 46, 64, 84, 102, 108, 118, 128, 145, 162];
const T_GOLD = [0, 5, 8, 12, 18, 26, 36, 48, 62, 78, 96, 116, 140, 160];
const ENEMIES = {};
function E(id, tier, o = {}) {
  const t = tier, ti = Math.floor(t), tf = t - ti;
  const lerp = arr => arr[ti] + (arr[Math.min(arr.length - 1, ti + 1)] - arr[ti]) * tf;
  ENEMIES[id] = {
    id, name: o.name || MANIFEST.enemyNames[id] || MANIFEST.bossNames[id] || id, tier: t,
    hp: Math.round(lerp(T_HP) * (o.hp || 1)),
    atk: Math.round((10 + 9.5 * (t - 1)) * (o.atk || 1)),
    def: Math.round((3 + 4.5 * (t - 1)) * (o.def || 1)),
    mag: Math.round((7 + 7.5 * (t - 1)) * (o.mag || 1)),
    mdef: Math.round((3 + 4.5 * (t - 1)) * (o.mdef || o.def || 1)),
    spd: Math.round((5 + 3 * (t - 1)) * (o.spd || 1)),
    exp: Math.round(lerp(T_EXP) * (o.exp || 1)),
    gold: Math.round(lerp(T_GOLD) * (o.gold || 1)),
    weak: o.weak || [], res: o.res || [], immune: o.immune || [],
    acts: o.acts || [['atk', 1]], drop: o.drop || null, boss: !!o.boss, acts2: o.acts2 || 1,
    noStatus: !!o.boss || !!o.noStatus, sprite: o.sprite || id, scale: o.scale || 1,
  };
}
// tier 1-2: fields of Aurel
E('slime', 1, { weak: ['fire'], drop: ['potion', 0.15] });
E('bat', 1.3, { hp: 0.8, spd: 1.5, acts: [['atk', 3], ['bite', 1]], weak: ['bolt'] });
E('wolf', 1.6, { atk: 1.1, spd: 1.3, acts: [['atk', 3], ['bite', 1]], weak: ['fire'], drop: ['potion', 0.12] });
E('goblin', 1.8, { acts: [['atk', 4], ['tackle', 1]], drop: ['antidote', 0.2], gold: 1.3 });
// tier 2-3: Whisperwood
E('shroom', 2.3, { hp: 1.1, acts: [['atk', 3], ['spore', 1]], weak: ['fire'], drop: ['antidote', 0.25] });
E('vine', 2.6, { acts: [['atk', 2], ['poisonbite', 2]], weak: ['fire'], res: ['bolt'] });
E('viper', 2.8, { spd: 1.3, acts: [['atk', 2], ['poisonbite', 2]], weak: ['ice'], drop: ['antidote', 0.2] });
E('wisp', 3, { hp: 0.8, def: 0.6, mdef: 1.4, acts: [['zap', 2], ['atk', 1]], weak: ['holy'], res: ['bolt'], drop: ['ether', 0.08] });
E('beetle', 3.2, { def: 1.5, acts: [['atk', 3], ['harden', 1]], weak: ['fire'], res: [], drop: ['potion', 0.2] });
// tier 3-4: goblin camp & east road
E('hobgoblin', 3.8, { hp: 1.2, atk: 1.15, acts: [['atk', 3], ['crush', 1]], drop: ['hipotion', 0.08], gold: 1.4 });
E('crab', 4.2, { def: 1.6, mdef: 0.8, acts: [['atk', 3], ['harden', 1]], weak: ['bolt'], res: ['ice'], drop: ['potion', 0.25] });
// tier 5-6: Sunken Temple
E('fishman', 5, { acts: [['atk', 3], ['tackle', 1]], weak: ['bolt'], res: ['ice'], drop: ['ether', 0.1] });
E('naga', 5.6, { acts: [['atk', 2], ['poisonbite', 1], ['frost', 1]], weak: ['bolt'], res: ['ice'], drop: ['antidote', 0.25] });
E('jelly', 5.4, { def: 0.7, mdef: 1.3, acts: [['atk', 2], ['frost', 1]], weak: ['fire', 'bolt'], res: ['ice'], drop: ['ether', 0.08] });
E('specter', 6, { hp: 0.8, def: 0.6, mdef: 1.4, acts: [['darkbolt', 2], ['drain', 1]], weak: ['holy'], immune: [], res: ['ice'], drop: ['ether', 0.12] });
// tier 6-8: snowfields & Crystal Caverns
E('snowwolf', 6.5, { spd: 1.3, acts: [['atk', 3], ['bite', 2]], weak: ['fire'], res: ['ice'], drop: ['hipotion', 0.1] });
E('icebat', 6.8, { hp: 0.8, spd: 1.5, acts: [['atk', 2], ['frost', 1]], weak: ['fire', 'bolt'], res: ['ice'] });
E('frostbloom', 7, { acts: [['frost', 2], ['spore', 1], ['atk', 1]], weak: ['fire'], immune: ['ice'], drop: ['ether', 0.12] });
E('frostbones', 7.4, { hp: 1.1, acts: [['atk', 3], ['crush', 1]], weak: ['fire', 'holy'], res: ['ice'], drop: ['phoenix', 0.06] });
E('icegolem', 7.8, { hp: 1.5, def: 1.4, spd: 0.6, acts: [['atk', 2], ['slam', 1], ['icebreath', 1]], weak: ['fire'], immune: ['ice'], drop: ['hipotion', 0.2], exp: 1.3 });
// tier 8-10: Ember Isle & Ember Peak
E('fireant', 8.4, { def: 1.3, acts: [['atk', 3], ['sting', 1]], weak: ['ice'], res: ['fire'], drop: ['antidote', 0.25] });
E('salamander', 8.8, { acts: [['atk', 2], ['flame', 2]], weak: ['ice'], immune: ['fire'], drop: ['hipotion', 0.12] });
E('hellhound', 9.2, { spd: 1.3, acts: [['atk', 2], ['bite', 1], ['firebreath', 1]], weak: ['ice'], res: ['fire'], drop: ['hipotion', 0.12] });
E('imp', 8.6, { hp: 0.8, spd: 1.4, acts: [['flame', 2], ['atk', 1], ['zap', 1]], weak: ['holy', 'ice'], drop: ['ether', 0.15] });
E('ooze', 9.4, { def: 0.7, mdef: 1.4, acts: [['atk', 2], ['flame', 1]], weak: ['ice'], immune: ['fire'] });
E('firebat', 9.4, { hp: 0.8, spd: 1.5, acts: [['atk', 2], ['flame', 1]], weak: ['ice'], immune: ['fire'] });
E('flamewisp', 9.8, { hp: 0.85, def: 0.6, mdef: 1.4, acts: [['flame', 2], ['firebreath', 1]], weak: ['ice', 'holy'], immune: ['fire'], drop: ['ether', 0.15] });
E('ashbones', 9.8, { hp: 1.1, acts: [['atk', 3], ['crush', 1]], weak: ['holy', 'ice'], res: ['fire'], drop: ['phoenix', 0.06] });
E('lavagolem', 10.2, { hp: 1.5, def: 1.4, spd: 0.6, acts: [['atk', 2], ['slam', 1], ['firebreath', 1]], weak: ['ice'], immune: ['fire'], drop: ['hipotion', 0.2], exp: 1.3 });
E('cultknight', 10.4, { hp: 1.2, def: 1.2, acts: [['atk', 3], ['flame', 1], ['warcry', 1]], weak: ['ice', 'holy'], res: ['fire'], drop: ['hiether', 0.06], gold: 1.5 });
// tier 11-13: Hollow Citadel & Ashen Marsh
E('sporelord', 10.6, { hp: 1.1, acts: [['atk', 2], ['spore', 1], ['poisonbite', 1]], weak: ['fire'], drop: ['antidote', 0.3] });
E('eye', 10.8, { hp: 0.9, acts: [['gaze', 1], ['zap', 2], ['atk', 1]], weak: ['bolt'], drop: ['ether', 0.15] });
E('shade', 11.4, { hp: 0.85, spd: 1.4, acts: [['darkbolt', 2], ['atk', 1]], weak: ['holy'], res: ['ice'], drop: ['hiether', 0.06] });
E('dreadeye', 11.8, { hp: 0.95, acts: [['gaze', 1], ['darkbolt', 2], ['curse', 1]], weak: ['holy', 'bolt'], drop: ['ether', 0.2] });
E('voidooze', 12, { def: 0.7, mdef: 1.5, acts: [['atk', 2], ['drain', 1]], weak: ['holy', 'fire'], res: ['ice', 'bolt'], drop: ['hipotion', 0.2] });
E('knight', 12.3, { hp: 1.25, def: 1.3, acts: [['atk', 3], ['rend', 1], ['warcry', 1]], weak: ['holy', 'bolt'], drop: ['megapotion', 0.08], gold: 1.4 });
E('obsidian', 12.6, { hp: 1.6, def: 1.5, spd: 0.6, acts: [['atk', 2], ['slam', 1], ['void', 1]], weak: ['holy'], res: ['fire', 'ice'], drop: ['megapotion', 0.12], exp: 1.4 });

// bosses
E('treant', 3.3, { boss: true, hp: 11.5, atk: 1.0, def: 1.2, acts: [['atk', 3], ['thorns', 2], ['roots', 2], ['mend', 1]], weak: ['fire'], res: ['bolt', 'ice'], exp: 9, gold: 8 });
E('goblinking', 4.4, { boss: true, name: 'Goblin King', sprite: 'hobgoblin', scale: 2, hp: 8.5, atk: 0.94, acts: [['atk', 3], ['crush', 2], ['warcry', 1], ['slam', 2]], exp: 9, gold: 10 });
E('kraken', 6.6, { boss: true, hp: 9.5, atk: 0.85, mag: 0.85, acts: [['tentacle', 3], ['maelstrom', 2], ['ink', 1], ['atk', 2]], acts2: 2, weak: ['bolt'], res: ['ice', 'fire'], exp: 10, gold: 10 });
E('wyrm', 8.7, { boss: true, hp: 9.5, atk: 0.76, mag: 0.76, acts: [['atk', 2], ['blizzard', 2], ['tail', 2], ['icebreath', 1], ['roar', 1]], acts2: 2, weak: ['fire'], immune: ['ice'], exp: 10, gold: 10 });
E('demon', 10.8, { boss: true, hp: 10, atk: 0.86, mag: 0.86, acts: [['atk', 2], ['hellfire', 2], ['meteor', 2], ['roar', 1], ['curse', 1]], acts2: 2, weak: ['ice', 'holy'], immune: ['fire'], exp: 10, gold: 10 });
E('king', 12.8, { boss: true, hp: 8.3, def: 1.1, atk: 0.8, mag: 0.8, acts: [['atk', 3], ['rend', 2], ['doom', 2], ['despair', 1], ['darkbolt', 2]], acts2: 2, weak: ['holy'], res: ['ice', 'fire', 'bolt'], exp: 8, gold: 6 });
E('frostgolem', 6.9, { boss: true, name: 'Frostfang Golem', sprite: 'icegolem', scale: 2, hp: 9.5, def: 1.2, atk: 0.95, mag: 0.9, acts: [['atk', 3], ['slam', 2], ['icebreath', 2], ['harden', 1]], weak: ['fire'], immune: ['ice'], exp: 7, gold: 8 });
E('hollow', 13.2, { boss: true, hp: 10, atk: 0.77, mag: 0.77, acts: [['oblivion', 2], ['drain', 2], ['void', 2], ['gaze', 1], ['curse', 1], ['rend', 2]], acts2: 2, weak: ['holy'], exp: 0, gold: 0 });

// encounter formations by area
const GROUPS = {
  meadow: [['slime'], ['slime', 'slime'], ['bat', 'slime'], ['bat', 'bat'], ['wolf'], ['slime', 'slime', 'slime'], ['goblin'], ['wolf', 'slime']],
  forest: [['shroom', 'shroom'], ['vine', 'viper'], ['wolf', 'wolf'], ['wisp', 'shroom'], ['viper', 'viper'], ['goblin', 'goblin'], ['vine', 'shroom', 'vine'], ['beetle'], ['wisp', 'wisp']],
  goblincamp: [['goblin', 'goblin', 'goblin'], ['hobgoblin'], ['hobgoblin', 'goblin'], ['bat', 'bat', 'bat'], ['goblin', 'beetle'], ['hobgoblin', 'bat']],
  coast: [['crab'], ['crab', 'wolf'], ['beetle', 'beetle'], ['hobgoblin', 'wolf'], ['viper', 'crab'], ['wolf', 'wolf', 'wolf']],
  temple: [['fishman', 'fishman'], ['naga'], ['jelly', 'jelly'], ['fishman', 'jelly'], ['crab', 'crab'], ['naga', 'fishman'], ['specter'], ['jelly', 'fishman', 'jelly']],
  pass: [['snowwolf'], ['icebat', 'icebat'], ['crab', 'snowwolf'], ['frostbloom'], ['specter'], ['wolf', 'wolf', 'snowwolf'], ['naga', 'icebat']],
  snow: [['snowwolf', 'snowwolf'], ['icebat', 'icebat'], ['frostbloom'], ['snowwolf', 'icebat'], ['specter', 'icebat'], ['frostbloom', 'snowwolf']],
  icecave: [['icebat', 'icebat', 'icebat'], ['frostbones', 'frostbones'], ['icegolem'], ['jelly', 'frostbones'], ['frostbloom', 'icebat'], ['snowwolf', 'frostbones'], ['icegolem', 'icebat']],
  emberisle: [['fireant', 'fireant'], ['salamander'], ['imp', 'imp'], ['hellhound'], ['fireant', 'imp'], ['salamander', 'fireant']],
  volcano: [['ooze', 'ooze'], ['firebat', 'firebat', 'firebat'], ['flamewisp', 'ooze'], ['ashbones', 'ashbones'], ['lavagolem'], ['cultknight'], ['hellhound', 'firebat'], ['cultknight', 'imp']],
  marsh: [['sporelord', 'sporelord'], ['eye', 'eye'], ['shade', 'sporelord'], ['eye', 'shade'], ['voidooze']],
  citadel: [['knight'], ['shade', 'shade'], ['dreadeye', 'voidooze'], ['knight', 'shade'], ['obsidian'], ['voidooze', 'voidooze'], ['dreadeye', 'dreadeye'], ['knight', 'dreadeye']],
};

const SHOPS = {
  willow_items: ['potion', 'antidote', 'smoke'],
  willow_arms: ['ironsword', 'rubyrod', 'chainmail', 'silkrobe'],
  castle_items: ['potion', 'antidote', 'ether'],
  salt_items: ['potion', 'hipotion', 'ether', 'antidote', 'phoenix', 'smoke', 'frostbomb'],
  salt_arms: ['steelsword', 'sapphirerod', 'silvermace', 'ironarmor', 'mysticrobe', 'powerring', 'guardcharm', 'seashell'],
  frost_items: ['hipotion', 'ether', 'antidote', 'phoenix', 'firebomb', 'smoke'],
  frost_arms: ['mithrilsword', 'sagestaff', 'holymace', 'steelplate', 'sagerobe', 'swiftboots', 'magependant'],
  cinder_items: ['hipotion', 'megapotion', 'ether', 'hiether', 'phoenix', 'salve', 'frostbomb'],
  cinder_arms: ['runeblade', 'archrod', 'morningstar', 'mithrilmail', 'starrobe', 'lifering', 'wardamulet'],
  camp_items: ['hipotion', 'megapotion', 'hiether', 'phoenix', 'salve', 'antidote'],
};

// ---------- combat math (shared with balance sim) ----------
function dmgFormula(A, D, pow) {
  A = Math.max(1, A * pow);
  return (A * A) / (A + Math.max(0, D));
}
function elemMult(target, el) {
  if (!el) return 1;
  if (target.immune && target.immune.includes(el)) return 0;
  if (target.weak && target.weak.includes(el)) return 1.5;
  if (target.res && target.res.includes(el)) return 0.5;
  return 1;
}
