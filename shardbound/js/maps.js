'use strict';
// ---------- map definitions, NPCs, events and the story ----------
const MAPS = {};

function MK(id, ch, i = 0) {
  const a = MARKS[id] && MARKS[id][ch];
  if (!a || !a[i]) throw new Error('missing mark ' + id + ' ' + ch + ' ' + i);
  return { x: a[i][0], y: a[i][1] };
}
function MKS(id, ch) { return ((MARKS[id] && MARKS[id][ch]) || []).map(([x, y]) => ({ x, y })); }
function defMap(id, o) {
  const d = MAPDATA[id];
  if (!d) throw new Error('no map data ' + id);
  MAPS[id] = Object.assign({ warps: [], npcs: [], objs: [], chests: [], signs: [], crystals: [], triggers: [] }, o, { legend: LEGENDS[d.legend], rows: d.rows });
  return MAPS[id];
}
function chest(id, x, y, item, n) {
  const ok = (MARKS[id]['$'] || []).some(([a, b]) => a === x && b === y);
  if (!ok) throw new Error('no chest mark ' + id + ' ' + x + ',' + y);
  const c = { id: id + '_' + x + '_' + y, x, y };
  if (item === 'gold') c.gold = n; else { c.item = item; c.n = n || 1; }
  MAPS[id].chests.push(c);
}
function link(town, doorCh, inner, doorIdx = 0) {
  const d = MK(town, doorCh, doorIdx), e = MK(inner, '1');
  MAPS[town].warps.push({ x: d.x, y: d.y, to: inner, tx: e.x, ty: e.y - 1, dir: 'up' });
  MAPS[inner].warps.push({ x: e.x, y: e.y, to: town, tx: d.x, ty: d.y + 1, dir: 'down' });
}
function exitTo(id, ch, to, tx, ty, dir, extra) {
  for (const p of MKS(id, ch)) MAPS[id].warps.push(Object.assign({ x: p.x, y: p.y, to, tx, ty, dir }, extra || {}));
}
function stairs(id, ch, tile) {
  for (const p of MKS(id, ch)) MAPS[id].objs.push({ id: 'st_' + ch + p.x + '_' + p.y, x: p.x, y: p.y, tile, solid: false });
}
function npc(id, map, ch, sprite, talk, o = {}) {
  const p = typeof ch === 'string' ? MK(map, ch, o.i || 0) : ch;
  const t = typeof talk === 'function' ? talk : function* () { yield say(o.name || null, ...talk); };
  const n = Object.assign({ id, x: p.x, y: p.y, sprite, dir: o.dir || 'down', talk: t }, o);
  delete n.i;
  MAPS[map].npcs.push(n);
  return n;
}
function crystalsFrom(id) { for (const p of MKS(id, '*')) MAPS[id].crystals.push(p); }
function switchObj(map, ch, i, f, after) {
  const p = MK(map, ch, i);
  MAPS[map].objs.push({
    id: 'sw_' + f, x: p.x, y: p.y, sprite: () => flag(f) ? 'switchon' : 'switchoff',
    talk: function* () {
      if (flag(f)) { yield say(null, 'The lever is already pulled.'); return; }
      setFlag(f); Audio8.sfx('switch');
      yield wait(10);
      if (after) yield* after();
    },
  });
}
function gateObj(map, p, id, sprite, openFlag, lockedText, key) {
  MAPS[map].objs.push({
    id, x: p.x, y: p.y, sprite, show: () => !flag(openFlag),
    talk: function* () {
      if (key && hasItem(key)) {
        removeItem(key); setFlag(openFlag); Audio8.sfx('gate');
        yield shake(16, 2);
        yield say(null, 'You used the ' + ITEMS[key].name + '. The gate swings open!');
        return;
      }
      yield say(null, lockedText);
    },
  });
}
function* bothSwitches(a, b, gateFlag) {
  if (flag(a) && flag(b)) {
    setFlag(gateFlag); Audio8.sfx('gate');
    yield shake(30, 2);
    yield say(null, 'A heavy rumble echoes through the halls... somewhere, a gate has opened!');
  } else yield say(null, 'Click! Something shifted far away... but not enough.');
}
function* partyLine(who, ...lines) {
  if (!G.party.includes(who)) return;
  yield say(HEROES[who].name, ...lines);
}
function obj(map, o) { MAPS[map].objs.push(o); return o; }
function objective(t) { G.flags.objective = t; }

// ==========================================================================================
// PROLOGUE & CREDITS (used by main.js)
// ==========================================================================================
const PROLOGUE = [
  'A thousand years ago, a hunger from beyond the stars fell upon the land. It was called the Hollow.',
  'The first king of Aurel sealed it away beneath the Sunstone, a crystal of living light set high upon his castle.',
  'For a thousand years the Sunstone shone, and the kingdom knew peace.',
  'Last night, the Sunstone shattered. Four shards scattered across the land...',
  '...and a grey veil crept across the sky.',
];
const CREDITS = [
  'SHARDBOUND', '', '', { party: 1 }, '', '', 'STARRING', '', 'Aren  the Knight', 'Lyra  the Mage', 'Bram  the Cleric', '',
  'Prince Malgrath', 'Elara', 'King Aldric', '', '',
  'GAME BY', '', 'Vivek Nair', '', '',
  'DESIGN  CODE  ART  MUSIC', '', 'Made for itch.io', '', '',
  'FONT', '', 'Press Start 2P', 'by CodeMan38', '(SIL Open Font License)', '', '', { time: 1 }, '', '',
  'The sun rises over Aurel.', 'Thank you for playing!', '', '', '', 'THE END',
];

// ==========================================================================================
// HOME: Aren's house & Willowmere
// ==========================================================================================
defMap('aren_house', { name: 'Aren\'s House', music: 'town', noBanner: true,
  onEnter: function* () {
    if (flag('intro')) return;
    yield wait(40);
    yield emote('mom', '!');
    yield say('Maren', 'Aren! Oh, thank goodness you\'re up.', 'Did you feel that tremor last night? The whole valley shook... and the sky has gone grey as ash.');
    yield say('Aren', 'I felt it. What happened?');
    yield say('Maren', 'Nobody knows. But a royal rider came at dawn. Every guard trainee must report to Castle Aurel at once.', 'The castle is just north of the village. Follow the road out the north gate.');
    yield say('Maren', 'Take these with you. And Aren... come home safe.');
    yield* give('potion', 3);
    setFlag('intro'); objective('Go to the castle');
    yield say(null, 'Arrow keys: move.  Z / Enter: talk and confirm.  X / Esc: menu and cancel.  Hold Shift to run.');
  },
});
npc('mom', 'aren_house', 'A', 'woman', function* () {
  if (flag('boss_hollow')) yield say('Maren', 'My son, the hero of Aurel! I always knew.');
  else if (hasItem('shard_ember')) yield say('Maren', 'All four shards? Aren... I\'m so proud. Finish this and come home.');
  else if (G.party.includes('bram')) yield say('Maren', 'You\'ve made good friends. Eat something before you go! You look thin.');
  else if (G.party.includes('lyra')) yield say('Maren', 'Oh, and who is this lovely young mage? Do keep my son out of trouble, dear.');
  else yield say('Maren', 'The castle is north of the village. Hurry now!');
  if (G.party.includes('lyra') && !flag('mom_rest')) {
    setFlag('mom_rest');
    yield say('Maren', 'Rest a moment before you go.');
    yield* healAll();
  }
}, { dir: 'down' });

defMap('willowmere', { name: 'Willowmere', music: 'town' });
exitTo('willowmere', 'n', 'world', 8, 37, 'up');
exitTo('willowmere', 's', 'world', 8, 39, 'down');
MAPS.willowmere.signs.push({ ...MK('willowmere', 'q', 0), text: 'North: Castle Aurel.  West: Whisperwood.  East, past the river: Port Saltmere.' });
MAPS.willowmere.signs.push({ ...MK('willowmere', 'q', 1), text: 'Willowmere. Est. in the Age of the Sun. Please do not feed the slimes.' });
npc('child_locket', 'willowmere', 'A', 'child', function* () {
  if (flag('locket_given')) { yield say('Pip', 'I wear my locket every day now! Thank you, Aren!'); return; }
  if (hasItem('locket')) {
    yield say('Pip', 'My locket!! You found it in Whisperwood? Mama gave it to me before she went away...');
    removeItem('locket'); setFlag('locket_given');
    yield say('Pip', 'Here, take this charm. Papa says it keeps you safe. You need it more than me!');
    yield* give('guardcharm');
    return;
  }
  yield say('Pip', 'When the ground shook I ran into Whisperwood and dropped my silver locket somewhere...', 'It\'s too scary to go back. If you see it, could you bring it to me?');
});
npc('vill_woman', 'willowmere', 'E', 'woman', ['The sky went grey after the quake. The hens won\'t lay a single egg!'], { wander: true });
npc('vill_old', 'willowmere', 'J', 'fisher', function* () {
  if (flag('boss_goblin')) yield say('Old Tobin', 'The bridge is open again! My cousin in Saltmere will be glad to see the fish carts rolling.');
  else yield say('Old Tobin', 'Monsters have crept onto the roads. Keep a Potion handy, lad.', 'And if a fight goes badly, choose Defend. It halves the damage you take.');
});
npc('vill_farmer', 'willowmere', 'L', 'villager', ['The shop sells Iron Swords and a Ruby Rod. Better gear makes all the difference out there.'], { wander: true });
npc('vill_girl', 'willowmere', 'P', 'girl', ['Did you know you can save your journey from the menu anytime? Crystals heal you, too!']);
npc('vill_guard', 'willowmere', 'G', 'soldier', function* () {
  if (!flag('met_king')) yield say('Watchman', 'Trainee Aren! The castle\'s due north up the road. Watch out for wolves.');
  else yield say('Watchman', 'Whisperwood is north-west, past the castle. Follow the forest trail.');
});

defMap('willow_elder', { name: 'Elder\'s House', music: 'town', noBanner: true });
npc('rowan', 'willow_elder', 'A', 'elder', function* () {
  if (!flag('elder_gift')) {
    setFlag('elder_gift');
    yield say('Elder Rowan', 'Aren, my boy. So the Sunstone is broken... I prayed I\'d never live to see it.', 'The old tales say the Hollow cannot be killed, only sealed. While the Sunstone is broken, it grows stronger every day.');
    yield say('Elder Rowan', 'Take this. A village elder has little else to give.');
    yield* giveGold(100);
    return;
  }
  const n = ['shard_verdant', 'shard_tide', 'shard_frost', 'shard_ember'].filter(hasItem).length;
  if (n === 0) yield say('Elder Rowan', 'Go with courage, Aren.');
  else if (n < 4) yield say('Elder Rowan', 'You carry ' + n + ' shard' + (n > 1 ? 's' : '') + ' already? The light in them gives me hope.');
  else yield say('Elder Rowan', 'All four... Go to the King. The Sunstone must shine again.');
});
defMap('willow_inn', { name: 'Willowmere Inn', music: 'town', noBanner: true });
npc('inn_w', 'willow_inn', 'A', 'inn', function* () { yield* inn(15); });
npc('inn_w_guest', 'willow_inn', 'E', 'sailor', ['I\'m a sailor from Port Saltmere, stuck here till those goblins clear off the east bridge.', 'Saltmere\'s across the river, south-east. Lovely town.']);
defMap('willow_shop', { name: 'Willowmere Shop', music: 'town', noBanner: true });
npc('shop_w_items', 'willow_shop', 'A', 'merchant', function* () { yield say('Shopkeep', 'Welcome! Potions and remedies here.'); yield shop('willow_items'); });
npc('shop_w_arms', 'willow_shop', 'E', 'smith', function* () { yield say('Smith', 'Swords, rods and armor. Finest in Willowmere... the only in Willowmere.'); yield shop('willow_arms'); });
npc('shop_w_cust', 'willow_shop', 'J', 'villager', ['Equip new gear from the menu after you buy it! I forgot once and fought a wolf with a turnip.'], { wander: true });
defMap('willow_house1', { name: 'House', music: 'town', noBanner: true });
npc('h1', 'willow_house1', 'A', 'woman', ['My husband says slimes are weak to fire. Mages are so handy, aren\'t they?']);
defMap('willow_house2', { name: 'House', music: 'town', noBanner: true });
npc('h2', 'willow_house2', 'A', 'elder', ['In my day we only had one monster: the tax collector.', 'Hmph. Now look at the sky.']);
link('willowmere', '1', 'aren_house'); link('willowmere', '2', 'willow_elder'); link('willowmere', '3', 'willow_inn');
link('willowmere', '4', 'willow_shop'); link('willowmere', '5', 'willow_house1'); link('willowmere', '6', 'willow_house2');

// ==========================================================================================
// CASTLE AUREL
// ==========================================================================================
defMap('castle', { name: 'Castle Aurel', music: 'castle' });
exitTo('castle', 's', 'world', 12, 27, 'down');
npc('king', 'castle', 'A', 'king', function* () {
  const all = ['shard_verdant', 'shard_tide', 'shard_frost', 'shard_ember'].every(hasItem);
  if (flag('boss_hollow')) { yield say('King Aldric', 'Thank you, Aren. Aurel will never forget.'); return; }
  if (all && !flag('lightbridge')) { yield* finalCutscene(); return; }
  if (flag('lightbridge')) { yield say('King Aldric', 'The bridge of light will hold. Go now. End this.'); return; }
  if (hasItem('shard_verdant') && !flag('ch1_report')) {
    setFlag('ch1_report');
    yield say('King Aldric', 'The Verdant Shard! You have done well.', 'And you saw my brother? ...So he still walks among us. A shadow of the man he was.');
    yield say('King Aldric', 'Grave news: goblins have seized the east bridge. Their den lies south-east of Willowmere, on our side of the river.', 'Drive them out, and the road to Port Saltmere will open. Lyra senses a shard beneath the sea there.');
    objective('Goblin Den (SE)');
    yield say('Captain Hale', 'Here, take these. You\'ll need them more than my men.');
    yield* give('hipotion', 2);
    return;
  }
  yield say('King Aldric', 'Recover the shards, Aren. Aurel depends on you.');
});
npc('hale', 'castle', 'E', 'guard', function* () {
  if (!flag('met_king')) { yield say('Captain Hale', 'Approach the King, trainee.'); return; }
  yield say('Captain Hale', 'A soldier\'s advice: watch your MP, use Defend when hurt, and never pass up a crystal.', 'And Rally, once you learn it, makes the whole party hit harder.');
}, { dir: 'right' });
npc('lyra_npc', 'castle', 'J', 'lyra', ['...'], { dir: 'left', show: () => !flag('met_king') });
npc('scholar', 'castle', 'L', 'sage', ['Monsters have weaknesses, you know! Slimes, plants and beasts fear fire.', 'Bats and sea creatures hate lightning. Ice creatures melt before fire, and fire creatures before ice.', 'And the undead? Holy light. Always holy light.']);
npc('castle_shop', 'castle', 'N', 'soldier', function* () { yield say('Quartermaster', 'Supplies for the King\'s business.'); yield shop('castle_items'); });
npc('maid', 'castle', 'O', 'nun', function* () {
  yield say('Maid', 'You look exhausted, dear. Lie down on a bunk a moment.');
  yield* healAll();
});
npc('gate1', 'castle', 'Q', 'soldier', function* () {
  if (!flag('met_king')) yield say('Guard', 'Trainee Aren? The King awaits in the throne room. Go straight up the carpet.');
  else yield say('Guard', 'Good luck out there.');
});
npc('gate2', 'castle', 'V', 'soldier', ['Shadow-beasts came over the walls last night. We drove them back... barely.']);
npc('garden_guard', 'castle', 'Y', 'guard', ['The Captain took a claw to the shoulder protecting the King. He won\'t admit it hurts.'], { wander: true });
npc('castle_girl', 'castle', 'Z', 'girl', function* () {
  if (flag('boss_hollow')) yield say('Mira', 'The sky is blue again! You did it!');
  else yield say('Mira', 'Is the sky going to stay grey forever?');
}, { wander: true });
MAPS.castle.triggers.push({
  x: MK('castle', '!').x, y: MK('castle', '!').y, w: 2, h: 1, once: 'met_king', run: function* () {
    yield say('King Aldric', 'Aren of Willowmere. Come forward.');
    yield moveEnt('player', '2U');
    yield say('King Aldric', 'Last night my brother, Prince Malgrath, broke into the Sun Spire and struck the Sunstone.', 'It shattered. Four shards scattered across Aurel... and with its light gone, the Hollow stirs.');
    yield say('Captain Hale', 'The Hollow is a hunger from beyond the stars, sealed beneath the Sunstone a thousand years ago.', 'Shadow-beasts already roam the roads.');
    yield say('King Aldric', 'My knights are spread thin and Hale is wounded. I need someone swift and brave to recover the shards before Malgrath does.');
    yield say('Aren', 'I\'ll go, Your Majesty.');
    yield emote('lyra_npc', '!');
    yield say('Lyra', 'Then you\'ll need me! I\'m Lyra, court mage. Well... apprentice court mage.', 'I can sense the shards\' light. One fell north-west, deep in Whisperwood. The others felt like... sea, ice and fire.');
    yield say('King Aldric', 'Lyra is the best pupil Master Orin ever had. Take her with you.');
    yield moveEnt('lyra_npc', 'L D');
    G.flags.met_king = true;
    yield refresh();
    yield* join('lyra');
    yield say('King Aldric', 'Take my seal. Any soldier of Aurel will aid you. And some coin for the road.');
    yield* give('royalseal');
    yield* giveGold(200);
    objective('Whisperwood (NW)');
    yield say('Lyra', 'Whisperwood is north-west of the castle. There\'s an old trail into the trees. Let\'s go, Aren!');
  },
});
function* finalCutscene() {
  yield say('King Aldric', 'The four shards... all of them. Aren, Lyra, Bram, you have done the impossible.');
  yield say('Lyra', 'Your Majesty, the shards are calling to each other. I think they want to be whole.');
  yield say('King Aldric', 'Then let us bring them to the Sun Spire.');
  yield fadeOut(0.04);
  Audio8.sfx('shard');
  yield wait(60);
  yield say(null, 'The four shards rise from your hands and spin into a single blazing star.');
  Audio8.sfx('quake');
  yield shake(40, 3);
  yield say(null, 'A beam of light leaps from the Sun Spire across the land, striking the black lake at the heart of Aurel.');
  yield fadeIn(0.04);
  setFlag('lightbridge');
  objective('Hollow Citadel');
  yield say('King Aldric', 'The Sunstone is not yet whole. It needs its heart: the light the Hollow has swallowed.', 'But its beam has formed a bridge across the lake to the Hollow Citadel. Malgrath waits there.');
  yield say('Bram', 'Then we go. Together.');
  yield say('Captain Hale', 'Take these. The last of the royal stores.');
  yield* give('megalixir', 1);
  yield* give('phoenix', 3);
  yield say('King Aldric', 'Bring my brother home if you can, Aren. And if you cannot... forgive him, as I have.');
}

// ==========================================================================================
// WORLD
// ==========================================================================================
defMap('world', {
  name: 'Kingdom of Aurel', music: 'world', noBanner: true,
  encZones: [
    { x: 0, y: 0, w: 21, h: 21, groups: 'forest', bg: 'forest' },
    { x: 0, y: 21, w: 21, h: 27, groups: 'meadow', bg: 'field' },
    { x: 23, y: 10, w: 14, h: 17, groups: 'marsh', bg: 'swamp' },
    { x: 37, y: 0, w: 27, h: 23, groups: 'snow', bg: 'snowfield' },
    { x: 23, y: 26, w: 41, h: 22, groups: 'coast', bg: 'field' },
  ],
});
LEGENDS.world.L.alt = { flag: 'lightbridge', t: 'water', o: 'bridgev', solid: false };
MAPS.world.warps.push(
  { x: 8, y: 38, to: 'willowmere', tx: 14, ty: 1, dir: 'down' },
  { x: 12, y: 26, to: 'castle', tx: 15, ty: 28, dir: 'up' },
  { x: 6, y: 8, to: 'shrine1', tx: 17, ty: 26, dir: 'up' },
  {
    x: 18, y: 39, to: 'goblin1', tx: 4, ty: 22, dir: 'up', run: function* () {
      if (!flag('ch1_report')) { yield say(null, 'Goblin war-drums thunder inside the cave. You should see the King before charging in.'); return false; }
    },
  },
  { x: 36, y: 42, to: 'saltmere', tx: 16, ty: 1, dir: 'down' },
  {
    x: 48, y: 44, to: 'temple1', tx: 14, ty: 22, dir: 'up', run: function* () {
      if (!hasItem('tidebell')) { yield say(null, 'An ancient temple lies just beneath the waves. Its doors are completely flooded.'); return false; }
      if (!flag('tide_low')) {
        setFlag('tide_low');
        Audio8.sfx('holy');
        yield say(null, 'Aren rings the Tide Bell. A pure note rolls out over the water...');
        Audio8.sfx('quake');
        yield shake(30, 2);
        yield say(null, 'The waves draw back, revealing the temple steps!');
        yield* partyLine('bram', 'Praise the Light. Shall we?');
      }
    },
  },
  { x: 44, y: 9, to: 'frosthold', tx: 13, ty: 20, dir: 'up' },
  { x: 57, y: 5, to: 'cavern1', tx: 5, ty: 21, dir: 'up' },
  { x: 30, y: 16, to: 'citadel1', tx: 14, ty: 22, dir: 'up' },
);
for (const bx of [21, 22]) {
  obj('world', {
    id: 'barricade' + bx, x: bx, y: 33, sprite: 'gate', show: () => !flag('boss_goblin'),
    talk: function* () {
      yield say(null, 'A crude barricade of logs and spikes blocks the bridge. Goblin markings are scratched all over it.');
      if (flag('ch1_report')) yield* partyLine('lyra', 'The King said their den is south-east of Willowmere, near the river.');
    },
  });
}
obj('world', {
  id: 'rockslide', ...MK('world', 'p'), sprite: 'boulder', show: () => !flag('pass_open'),
  talk: function* () { yield say(null, 'A rockslide has buried the entrance to Frostfang Pass, the cave road north through the mountains.'); },
});
LEGENDS.world.J.alt = { flag: 'pass_boss', t: 'dirt', o: null, solid: false };
MAPS.world.warps.push({ ...MK('world', 'p'), to: 'pass1', tx: 14, ty: 20, dir: 'up' });
obj('world', {
  id: 'darkseal', ...MK('world', 'z'), sprite: 'gatered', show: () => !flag('lightbridge'),
  talk: function* () {
    yield say(null, 'A wall of black fog bars the way. It whispers in a voice like cold wind...');
    yield* partyLine('lyra', 'That\'s the Hollow\'s power. We can\'t get through without the Sunstone\'s light.');
  },
});

// ==========================================================================================
// WHISPERWOOD & VERDANT SHRINE
// ==========================================================================================
defMap('shrine1', { name: 'Whisperwood', music: 'dungeon', enc: { groups: 'forest', bg: 'forest' },
  onEnter: function* () {
    if (flag('ww_enter')) return;
    setFlag('ww_enter');
    yield* partyLine('lyra', 'The trees are twisted... The shard\'s raw light is warping the whole forest.');
  },
});
exitTo('shrine1', '<', 'world', 6, 9, 'down');
exitTo('shrine1', '>', 'shrine2', 12, 20, 'up');
chest('shrine1', 4, 20, 'potion', 3); chest('shrine1', 30, 20, 'locket'); chest('shrine1', 4, 9, 'ether'); chest('shrine1', 30, 10, 'chainmail');
npc('spirit1', 'shrine1', '@', 'spirit', ['...'], { show: () => G.flags.spirit1 === 1, name: 'Pale Girl' });
MAPS.shrine1.triggers.push({
  x: MK('shrine1', '!').x, y: MK('shrine1', '!').y, w: 3, h: 1, once: 'spirit1_seen', run: function* () {
    G.flags.spirit1 = 1; yield refresh();
    Audio8.sfx('holy');
    yield say('Pale Girl', '...you\'re looking for the green light, aren\'t you?', 'It\'s deeper in. The guardian is sick... it doesn\'t know what it\'s doing. Please help it.');
    yield say('Aren', 'Wait! Who are you?');
    G.flags.spirit1 = 2; yield refresh();
    Audio8.sfx('holy');
    yield flash('rgba(255,255,255,0.4)', 12);
    yield say('Lyra', 'She... vanished. Aren, I think that was a ghost.');
  },
});

defMap('shrine2', { name: 'Verdant Shrine', music: 'dungeon', enc: { groups: 'forest', bg: 'forest' } });
exitTo('shrine2', '<', 'shrine1', 17, 2, 'down');
crystalsFrom('shrine2');
chest('shrine2', 6, 13, 'gold', 150); chest('shrine2', 19, 14, 'hipotion'); chest('shrine2', 16, 17, 'antidote', 3);
switchObj('shrine2', '%', 0, 'sw1', function* () { yield* bothSwitches('sw1', 'sw2', 'shrine_gate'); });
switchObj('shrine2', '%', 1, 'sw2', function* () { yield* bothSwitches('sw1', 'sw2', 'shrine_gate'); });
for (const [k, p] of MKS('shrine2', '&').entries()) gateObj('shrine2', p, 'sgate' + k, 'gate', 'shrine_gate', 'A thick iron gate. There are two empty lever sockets carved beside it: one west, one east.');
obj('shrine2', { id: 'ped1', ...MK('shrine2', '^'), sprite: 'pedestal' });
obj('shrine2', { id: 'treant', ...MK('shrine2', '+'), enemy: 'treant', show: () => !flag('boss_treant') });
obj('shrine2', {
  id: 'shard1', ...MK('shrine2', '^'), sprite: 'shardgreen', glow: true, show: () => flag('boss_treant') && !hasItem('shard_verdant'),
  talk: function* () {
    Audio8.sfx('shard');
    yield* give('shard_verdant', 1, true);
    yield flash('rgba(120,255,120,0.4)', 20);
    yield say(null, 'Got the Verdant Shard!');
    yield say('Lyra', 'One down, three to go! It\'s warm... like holding a sunbeam.');
    G.flags.mal1 = 1; yield refresh();
    Audio8.sfx('dark');
    yield flash('rgba(80,0,120,0.5)', 20);
    yield say('Malgrath', 'So. My brother sends children to clean up after me.');
    yield say('Lyra', 'Prince Malgrath! Why would you destroy the Sunstone?!');
    yield say('Malgrath', 'Destroy it? No, girl. I opened a door that should never have been shut.', 'Keep your little shard for now. I will collect it soon enough.');
    G.flags.mal1 = 2; yield refresh();
    Audio8.sfx('dark');
    yield flash('rgba(80,0,120,0.5)', 20);
    yield say('Aren', 'He\'s gone...');
    yield say('Lyra', 'That was no illusion. His eyes were... empty. We should tell the King. Back to Castle Aurel!');
    objective('Report to King');
  },
});
npc('mal1', 'shrine2', { x: 12, y: 4 }, 'villain', ['...'], { show: () => G.flags.mal1 === 1, name: 'Malgrath' });
MAPS.shrine2.triggers.push({
  x: MK('shrine2', '!').x, y: MK('shrine2', '!').y, w: 2, h: 1, once: 'treant_fought', when: () => !flag('boss_treant'), run: function* () {
    Audio8.sfx('quake');
    yield shake(30, 2);
    yield say('Lyra', 'The Thornwood Ancient! It\'s the guardian of this forest... the shard\'s light has driven it mad!');
    yield say('Aren', 'Then we\'ll snap it out of it. Get ready!');
    yield battle(['treant'], { bg: 'forest' });
    setFlag('boss_treant');
    yield refresh();
    yield say(null, 'The Ancient sighs, and its branches grow still. Peace returns to the shrine.');
    yield* partyLine('lyra', 'Look! The shard is on the pedestal!');
  },
});

// ==========================================================================================
// GOBLIN DEN
// ==========================================================================================
defMap('goblin1', { name: 'Goblin Den', music: 'dungeon', enc: { groups: 'goblincamp', bg: 'cave' }, dark: true,
  onEnter: function* () { if (flag('gob_enter')) return; setFlag('gob_enter'); yield* partyLine('lyra', 'Ugh, it smells like wet dog and old cheese in here.'); },
});
exitTo('goblin1', '<', 'world', 18, 40, 'down');
exitTo('goblin1', '>', 'goblin2', 10, 14, 'up');
stairs('goblin1', '>', 'stairsdown');
chest('goblin1', 24, 17, 'gold', 200); chest('goblin1', 26, 20, 'silkrobe'); chest('goblin1', 26, 4, 'powerring'); chest('goblin1', 3, 20, 'potion', 4);
obj('goblin1', {
  id: 'cage', ...MK('goblin1', '%'), sprite: 'gate', show: () => !flag('gob_cage'),
  talk: function* () {
    yield say('Merchant', 'Help! Over here! Those brutes locked me up!');
    yield say(null, 'The cage door is lashed shut with rope. Aren cuts it loose.');
    Audio8.sfx('door');
    setFlag('gob_cage');
  },
});
npc('gob_merchant', 'goblin1', '@', 'merchant', function* () {
  if (flag('gob_merchant')) { yield say('Merchant', 'I\'m heading to Saltmere as soon as the bridge is clear. Come visit my stall!'); return; }
  setFlag('gob_merchant');
  yield say('Merchant', 'Free at last! They grabbed me on the bridge road and stole half my stock.', 'Here, they missed these. Take them, with my thanks!');
  yield* give('smoke', 2);
  yield* give('ether', 2);
}, { show: () => !flag('boss_goblin') });

defMap('goblin2', { name: 'Grukk\'s Hall', music: 'dungeon', dark: true });
exitTo('goblin2', '<', 'goblin1', 20, 5, 'down');
crystalsFrom('goblin2');
chest('goblin2', 14, 2, 'hipotion', 2); chest('goblin2', 7, 2, 'gold', 300);
obj('goblin2', { id: 'grukk', ...MK('goblin2', '+'), enemy: 'hobgoblin', show: () => !flag('boss_goblin') });
MAPS.goblin2.triggers.push({
  x: MK('goblin2', '!').x, y: MK('goblin2', '!').y, w: 4, h: 1, once: 'grukk_talk', when: () => !flag('boss_goblin'), run: function* () {
    yield say('Goblin King', 'HRAAAH! Who dares enter the hall of GRUKK?!');
    yield say('Lyra', 'We dare! Get your goblins off the bridge!');
    yield say('Goblin King', 'Shiny-robe lady paid Grukk lots of gold to guard bridge! Nobody passes!', 'GRUKK SMASH!');
    yield battle(['goblinking'], { bg: 'cave' });
    setFlag('boss_goblin');
    yield refresh();
    yield say('Goblin King', 'Ow... ow ow ow. Grukk give up! Bridge is yours! Grukk go live in swamp now...');
    yield say(null, 'The Goblin King flees, wailing, into the dark.');
    yield say('Aren', 'A robed woman paid them to hold the bridge? Malgrath has allies.');
    yield say('Lyra', 'Then let\'s not keep the sea shard waiting. Port Saltmere is across the bridge, to the south-east.');
    objective('Port Saltmere (SE)');
  },
});

// ==========================================================================================
// PORT SALTMERE
// ==========================================================================================
defMap('saltmere', { name: 'Port Saltmere', music: 'town',
  onEnter: function* () {
    if (!flag('salt_arrive')) {
      setFlag('salt_arrive');
      yield* partyLine('lyra', 'Port Saltmere! Smell that sea air.', 'The sea shard\'s light feels close. Somewhere out past the beach...');
      return;
    }
    if (flag('boss_kraken') && !flag('pass_open')) {
      yield wait(20);
      yield say('Messenger', 'Shard-bearers! Message from Frosthold!', 'Sage Orin asks for you. Our soldiers have dug out the rockslide at Frostfang Pass, the cave road north through the mountains.');
      yield say('Messenger', 'Careful, though. Something big has made its den in there.');
      yield* partyLine('lyra', 'Master Orin! He\'ll know what to do. Frosthold is north, through Frostfang Pass.');
      setFlag('pass_open');
      objective('Frosthold (N)');
    }
  },
});
exitTo('saltmere', 'n', 'world', 36, 41, 'up');
MAPS.saltmere.signs.push({ ...MK('saltmere', 'q'), text: 'Port Saltmere. Gateway to the Southern Sea. Mind the gulls.' });
npc('captain', 'saltmere', 'A', 'sailor', function* () {
  if (flag('ship_ok')) {
    const r = yield ask('Captain Morrow', 'The Gull is ready! Sail for Ember Isle?', ['Set sail', 'Not yet'], 1);
    if (r !== 0) { yield say('Captain Morrow', 'Take your time. She\'ll be waiting.'); return; }
    yield* sail('ember_isle', 6, 19, 'right');
    return;
  }
  if (flag('boss_kraken')) { yield say('Captain Morrow', 'The sea\'s calm again! I owe you everything.', 'If you ever need passage anywhere, my ship is yours. Just say the word.'); return; }
  yield say('Captain Morrow', 'No ship leaves this port, friend. Something huge stirs beneath the waves since the quake.', 'Lost two boats already. Tentacles big as a mast!');
}, { dir: 'up' });
npc('fisher_pearl', 'saltmere', 'E', 'fisher', function* () {
  if (flag('pearl_given')) { yield say('Fisher Dan', 'My lucky pearl is home again. The fish practically jump into my net!'); return; }
  if (hasItem('pearl')) {
    removeItem('pearl'); setFlag('pearl_given');
    yield say('Fisher Dan', 'My Moon Pearl! You fished it out of the temple? You beauty!', 'Take this charm. Sailors swear by it.');
    yield* give('seashell');
    return;
  }
  yield say('Fisher Dan', 'The quake knocked my Moon Pearl right out of my boat. It sank near the old temple.', 'If you ever go down there... keep an eye out, eh?');
});
npc('salt_sailor', 'saltmere', 'J', 'sailor', ['The chapel\'s full of injured sailors. Sister Marisa and Brother Bram tend them day and night.']);
npc('salt_woman', 'saltmere', 'L', 'woman', ['The fish-men started coming ashore after a light fell into the sea. Horrid, slimy things.'], { wander: true });
npc('salt_child', 'saltmere', 'P', 'child', ['I wanna be a sailor! Or a knight! Or a knight sailor!'], { wander: true });
npc('salt_dock', 'saltmere', 'G', 'villager', function* () {
  if (flag('gob_merchant')) yield say('Dockhand', 'That merchant you rescued set up in the tavern. Sells flasks that go boom!');
  else yield say('Dockhand', 'Shipments haven\'t come in for days. If this keeps up, we\'ll all be eating seaweed.');
});
npc('salt_oldsailor', 'saltmere', 'T', 'fisher', ['Out past the eastern beach lies the Sunken Temple, swallowed by the sea long ago.', 'Legend says the chapel\'s Tide Bell can make the waters part. Only a legend, mind.']);
function* sail(map, x, y, dir) {
  yield fadeOut(0.04);
  Audio8.stop();
  Audio8.sfx('run');
  yield wait(30);
  yield say(null, 'The Gull slices across the waves...');
  yield warp(map, x, y, dir);
}

defMap('salt_inn', { name: 'Seagull Inn', music: 'town', noBanner: true });
npc('inn_s', 'salt_inn', 'A', 'inn', function* () { yield* inn(30); });
npc('inn_s_g', 'salt_inn', 'E', 'soldier', ['The King\'s seal? Then you\'re the shard-bearers! Good luck. The sea shard is said to be in the temple to the east.']);
defMap('salt_shop', { name: 'Saltmere Market', music: 'town', noBanner: true });
npc('shop_s_items', 'salt_shop', 'A', 'merchant', function* () { yield say('Shopkeep', 'Fresh stock, straight off the... well, the last boat.'); yield shop('salt_items'); });
npc('shop_s_arms', 'salt_shop', 'E', 'smith', function* () { yield say('Smith', 'Steel forged with sea-salt. Strongest in the south.'); yield shop('salt_arms'); });
defMap('salt_house', { name: 'House', music: 'town', noBanner: true });
npc('salt_h', 'salt_house', 'A', 'woman', ['My husband was a lighthouse keeper. He says the lighthouse light dimmed when the Sunstone broke.', 'Everything that shines has gone a little greyer.']);
defMap('salt_tavern', { name: 'Salty Dog Tavern', music: 'town', noBanner: true });
npc('tav_keep', 'salt_tavern', 'A', 'inn', ['Welcome to the Salty Dog! We\'re out of everything but fish soup and gossip.'], { dir: 'down' });
npc('tav_patron', 'salt_tavern', 'E', 'sailor', ['I heard Frosthold up north is buried in snow, even in summer.', 'And there\'s an island to the east where the ground itself burns. Ember Isle, they call it.']);
npc('tav_merchant', 'salt_tavern', 'J', 'merchant', function* () {
  yield say('Merchant', 'My rescuers! For you, a special selection. Flasks of fire and frost!');
  const w = waiter();
  Scenes.push(new ShopMenu(['firebomb', 'frostbomb', 'smoke', 'antidote'], () => { w.done = true; }));
  yield w;
}, { show: () => flag('gob_merchant') });
defMap('salt_chapel', { name: 'Chapel of the Tide', music: 'town', noBanner: true });
npc('bram_npc', 'salt_chapel', 'J', 'bram', function* () {
  yield say('Bram', 'Easy, friend... there. Rest now.');
  yield emote('bram_npc', '!');
  yield say('Bram', 'Oh! Travellers? Forgive me. I am Bram, brother of this chapel. We have had many wounded since the quake.');
  yield say('Lyra', 'We\'re looking for a shard of the Sunstone. I think it fell into the sea near here.');
  yield say('Marisa', 'The Sunken Temple... The sea has been angry ever since a blue light fell into its depths.');
  Audio8.sfx('door');
  yield say('Sailor', 'Sister! Brother Bram! Fish-men are crawling up onto the beach again!');
  yield say('Bram', 'Not again! I will not let them hurt anyone else.', 'Friends, will you fight beside me?');
  G.flags.bram_joined = true;
  yield* join('bram');
  yield warp('saltmere', 18, 17, 'down');
  yield say('Bram', 'There they are! For Saltmere!');
  yield battle(['fishman', 'fishman', 'crab'], { bg: 'field' });
  setFlag('pier_attack');
  yield say('Bram', 'Hah! That will teach them. Your blade is sharp, Aren, and your magic sharper, Lyra.', 'These creatures come from the temple. If the shard lies there, I am coming with you. The Light wills it, and my mace agrees.');
  yield say('Bram', 'Sister Marisa keeps the old Tide Bell in the chapel. Let us ask her for it.');
  objective('Talk to Marisa');
}, { dir: 'left', show: () => !flag('bram_joined') });
npc('marisa', 'salt_chapel', 'E', 'nun', function* () {
  if (flag('pier_attack') && !hasItem('tidebell')) {
    yield say('Marisa', 'Bram told me everything. You saved us all today.', 'This is the Tide Bell. It has rung for Saltmere\'s sailors for three hundred years. Ring it at the temple and the sea will listen.');
    yield* give('tidebell');
    yield say('Marisa', 'The temple lies on the beach east of town. And Bram... come back to us.');
    yield say('Bram', 'I always do, Sister.');
    objective('Sunken Temple (E)');
    return;
  }
  if (!flag('bram_joined')) { yield say('Marisa', 'Please, keep your voice low. These sailors need rest.'); return; }
  yield say('Marisa', 'May the Light guide you. Let me tend your wounds.');
  yield* healAll();
}, { dir: 'down' });
npc('wounded', 'salt_chapel', { x: 10, y: 4 }, 'sailor', ['Ngh... tentacles... everywhere...'], { dir: 'left' });
link('saltmere', '1', 'salt_inn'); link('saltmere', '2', 'salt_shop'); link('saltmere', '3', 'salt_house');
link('saltmere', '4', 'salt_chapel'); link('saltmere', '5', 'salt_tavern');

// ==========================================================================================
// SUNKEN TEMPLE
// ==========================================================================================
defMap('temple1', { name: 'Sunken Temple', music: 'temple', enc: { groups: 'temple', bg: 'temple' },
  onEnter: function* () { if (flag('t_enter')) return; setFlag('t_enter'); yield* partyLine('bram', 'I have sailed past this beach a hundred times and never knew what lay beneath. Stay close.'); },
});
exitTo('temple1', '<', 'world', 48, 43, 'up');
exitTo('temple1', '>', 'temple2', 15, 23, 'up');
stairs('temple1', '>', 'stairsdown');
crystalsFrom('temple1');
chest('temple1', 26, 14, 'bluekey'); chest('temple1', 8, 15, 'ether', 2); chest('temple1', 17, 20, 'potion', 5);
switchObj('temple1', '%', 0, 'tsw1', function* () { Audio8.sfx('gate'); yield shake(16, 2); yield say(null, 'Water drains somewhere to the east. A gate grinds open!'); });
gateObj('temple1', MK('temple1', '&'), 'tgate1', 'gate', 'tsw1', 'An iron gate, slick with seaweed. A lever must control it.');
for (const [k, p] of MKS('temple1', 'B').entries()) gateObj('temple1', p, 'tblue' + k, 'gateblue', 'tblue', 'A gate with a sapphire lock. It needs a key.', 'bluekey');

defMap('temple2', { name: 'Sunken Temple B2', music: 'temple', enc: { groups: 'temple', bg: 'temple' } });
exitTo('temple2', '<', 'temple1', 14, 3, 'down');
exitTo('temple2', '>', 'temple3', 10, 15, 'up');
stairs('temple2', '>', 'stairsdown');
crystalsFrom('temple2');
chest('temple2', 2, 20, 'mysticrobe'); chest('temple2', 29, 22, 'gold', 500); chest('temple2', 6, 9, 'pearl'); chest('temple2', 26, 16, 'phoenix', 2);
switchObj('temple2', '%', 0, 'tsw2a', function* () { yield* bothSwitches('tsw2a', 'tsw2b', 'tgate2'); });
switchObj('temple2', '%', 1, 'tsw2b', function* () { yield* bothSwitches('tsw2a', 'tsw2b', 'tgate2'); });
for (const [k, p] of MKS('temple2', '&').entries()) gateObj('temple2', p, 'tg2' + k, 'gate', 'tgate2', 'The gate won\'t budge. Two levers, west and east, must both be pulled.');

defMap('temple3', { name: 'Abyssal Sanctum', music: 'temple' });
exitTo('temple3', '<', 'temple2', 16, 3, 'down');
crystalsFrom('temple3');
obj('temple3', { id: 'ped2', ...MK('temple3', '^'), sprite: 'pedestal', show: () => flag('boss_kraken') });
obj('temple3', { id: 'kraken', ...MK('temple3', '+'), enemy: 'kraken', show: () => !flag('boss_kraken') });
npc('elara2', 'temple3', { x: 7, y: 10 }, 'spirit', ['...'], { show: () => G.flags.sp2 === 1, name: 'Pale Girl' });
obj('temple3', {
  id: 'shard2', ...MK('temple3', '^'), sprite: 'shardteal', glow: true, show: () => flag('boss_kraken') && !hasItem('shard_tide'),
  talk: function* () {
    Audio8.sfx('shard');
    yield* give('shard_tide', 1, true);
    yield flash('rgba(120,255,255,0.4)', 20);
    yield say(null, 'Got the Tide Shard!');
    G.flags.sp2 = 1; yield refresh();
    Audio8.sfx('holy');
    yield say('Pale Girl', 'You found another one... Papa will be so angry.');
    yield say('Lyra', 'You\'re the girl from Whisperwood! Wait... "Papa"?');
    yield say('Pale Girl', 'My name is Elara. Papa was sad for so long after I got sick and went away...', 'Then a voice under the Sunstone promised him it could bring me back.');
    yield say('Elara', 'But the voice lies. It\'s using him, like a puppet. Please... save my Papa.');
    G.flags.sp2 = 2; yield refresh();
    yield flash('rgba(255,255,255,0.4)', 12);
    yield say('Bram', 'A ghost child... Light keep her.');
    yield say('Lyra', 'Elara... Prince Malgrath\'s daughter died of the grey fever ten years ago. Everyone at the castle knows the story.');
    yield say('Aren', 'So the Hollow tricked him into breaking the seal. We have to stop it.');
    objective('Back to Saltmere');
  },
});
MAPS.temple3.triggers.push({
  x: MK('temple3', '!').x, y: MK('temple3', '!').y, w: 6, h: 1, once: 'kraken_talk', when: () => !flag('boss_kraken'), run: function* () {
    Audio8.sfx('quake');
    yield shake(30, 3);
    yield say('Bram', 'By the Light... that is what has been sinking the ships!');
    yield say('Lyra', 'The shard is inside it! I can see it glowing!');
    yield battle(['kraken'], { bg: 'temple' });
    setFlag('boss_kraken');
    yield refresh();
    yield say(null, 'The Kraken sinks into the deep, and the Tide Shard settles onto an altar at the water\'s edge.');
  },
});

// ==========================================================================================
// FROSTFANG PASS
// ==========================================================================================
defMap('pass1', { name: 'Frostfang Pass', music: 'dungeon', enc: { groups: 'pass', bg: 'icecave' },
  onEnter: function* () { if (flag('p_enter')) return; setFlag('p_enter'); yield* partyLine('bram', 'Brr! The wind howls through these tunnels like a hungry wolf.'); },
});
exitTo('pass1', '<', 'world', 44, 26, 'down');
exitTo('pass1', '>', 'pass2', 12, 18, 'up');
stairs('pass1', '>', 'stairsup');
chest('pass1', 2, 17, 'hipotion', 2); chest('pass1', 27, 12, 'guardcharm'); chest('pass1', 4, 2, 'gold', 600);
defMap('pass2', { name: 'Frostfang Heights', music: 'dungeon', enc: { groups: 'pass', bg: 'icecave' } });
exitTo('pass2', '<', 'pass1', 25, 4, 'down');
exitTo('pass2', '>', 'world', 44, 22, 'up', { when: () => flag('pass_boss') });
crystalsFrom('pass2');
chest('pass2', 4, 12, 'ether', 3); chest('pass2', 21, 9, 'frostbomb', 2);
obj('pass2', { id: 'pgolem', ...MK('pass2', '+'), enemy: 'icegolem', show: () => !flag('pass_boss') });
MAPS.pass2.triggers.push({
  x: MK('pass2', '!').x, y: MK('pass2', '!').y, w: 2, h: 1, once: 'pgolem_talk', when: () => !flag('pass_boss'), run: function* () {
    Audio8.sfx('quake');
    yield shake(24, 2);
    yield say('Lyra', 'That\'s no rock! It\'s a golem made of ice, and it\'s blocking the way out!');
    yield say('Bram', 'Fire, Lyra! Melt it down!');
    yield battle(['frostgolem'], { bg: 'icecave' });
    setFlag('pass_boss');
    yield refresh();
    yield say(null, 'The golem shatters into a thousand glittering pieces. Cold daylight spills in from the exit ahead.');
    yield say('Aren', 'The road to Frosthold is open. I bet the soldiers can clear a path over the ridge now, too.');
  },
});

// ==========================================================================================
// FROSTHOLD
// ==========================================================================================
defMap('frosthold', { name: 'Frosthold', music: 'town',
  onEnter: function* () { if (flag('frost_arrive')) return; setFlag('frost_arrive'); yield* partyLine('lyra', 'Frosthold... Master Orin\'s home. I haven\'t been back in years.', 'His house is at the top of the village.'); },
});
exitTo('frosthold', 's', 'world', 44, 10, 'down');
MAPS.frosthold.signs.push({ ...MK('frosthold', 'q'), text: 'Frosthold. Warmth within, frost without.' });
npc('frost_guard', 'frosthold', 'A', 'soldier', ['The Crystal Caverns are north-east of here. A dragon\'s roar has been shaking icicles off the roofs.']);
npc('frost_child', 'frosthold', 'E', 'child', function* () {
  if (flag('bloom_given')) { yield say('Nils', 'Our house is toasty now! Grandma made you this... wait, I already gave it to you. Thank you!'); return; }
  if (hasItem('firebloom')) {
    removeItem('firebloom'); setFlag('bloom_given');
    yield say('Nils', 'A Fire Bloom! It\'s warm! Grandma, look, look!', 'Grandma says to give you this. It was Grandpa\'s, from when he was a hero too!');
    yield* give('heroring');
    return;
  }
  yield say('Nils', 'I\'m sooo cold... Grandma says only a Fire Bloom from a hot, faraway island could warm our house.');
});
npc('frost_woman', 'frosthold', 'J', 'woman', ['Orin has been pacing his study for days, muttering about shards and the Hollow.'], { wander: true });
npc('frost_old', 'frosthold', 'L', 'elder', ['Ice creatures shatter under fire, young ones. Remember that in the caverns.']);
npc('frost_hunter', 'frosthold', 'P', 'fisher', ['I hunt snow wolves for their pelts. These days, they hunt me.']);
npc('frost_girl', 'frosthold', 'G', 'girl', ['Wheee! Once you start sliding on ice you can\'t stop until you bump into something!', 'Try it on the pond! It\'s good practice for the Crystal Caverns.']);
defMap('frost_sage', { name: 'Orin\'s Study', music: 'town', noBanner: true });
npc('orin', 'frost_sage', 'A', 'sage', function* () {
  if (!flag('met_orin')) {
    setFlag('met_orin');
    yield say('Sage Orin', 'Lyra! My brightest pupil. And these must be the shard-bearers I keep hearing about.');
    yield say('Lyra', 'Master Orin! We met a ghost, Elara, Malgrath\'s daughter. She says the Hollow is using him!');
    yield say('Sage Orin', '...Then it is worse than I feared.', 'When Elara died, Malgrath came to me. He begged me to find a way to bring her back. I told him there was none. I was wrong to send him away.');
    yield say('Sage Orin', 'The Hollow feeds on grief. It must have whispered to him through the cracks in the old seal.', 'Now it wears him like a crown. While he lives, the Hollow has a body in our world.');
    yield say('Sage Orin', 'The frost shard fell into the Crystal Caverns, north-east of town. Its light woke the Frost Wyrm that sleeps there.');
    yield say('Sage Orin', 'The caverns are paved with ice. Plan each slide carefully, or you\'ll go round in circles.', 'Take these. Fire is the wyrm\'s bane.');
    yield* give('firebomb', 3);
    objective('Crystal Caverns');
    return;
  }
  if (hasItem('shard_frost') && !flag('ship_ok')) {
    setFlag('ship_ok');
    yield say('Sage Orin', 'The Frost Shard! Three of four. Remarkable.', 'The last shard fell on Ember Isle, east across the sea. A fire cult has risen there, worshipping something they call Ignaroth.');
    yield say('Bram', 'Captain Morrow in Saltmere promised us passage! He can sail us there.');
    yield say('Sage Orin', 'Then go. And Lyra... I am proud of you.');
    objective('Sail from Saltmere');
    return;
  }
  if (flag('ship_ok')) { yield say('Sage Orin', 'Ember Isle lies across the sea. Captain Morrow\'s ship sails from Saltmere.'); return; }
  yield say('Sage Orin', 'The Crystal Caverns are north-east. Fire melts ice. Think before you slide.');
});
defMap('frost_inn', { name: 'Hearthfire Inn', music: 'town', noBanner: true });
npc('inn_f', 'frost_inn', 'A', 'inn', function* () { yield* inn(60); });
npc('inn_f_g', 'frost_inn', 'E', 'soldier', ['I came up with the soldiers who cleared the pass. Cold enough to freeze your thoughts out here.']);
defMap('frost_shop', { name: 'Frosthold Trading Post', music: 'town', noBanner: true });
npc('shop_f_items', 'frost_shop', 'A', 'merchant', function* () { yield say('Shopkeep', 'Cold out, isn\'t it? Need anything?'); yield shop('frost_items'); });
npc('shop_f_arms', 'frost_shop', 'E', 'smith', function* () { yield say('Smith', 'Mithril from the deep mines. Light as snow, hard as glacier ice.'); yield shop('frost_arms'); });
defMap('frost_house1', { name: 'House', music: 'town', noBanner: true });
npc('fh1', 'frost_house1', 'A', 'woman', ['My grandson Nils is always cold. I wish I could find him a Fire Bloom.']);
defMap('frost_house2', { name: 'House', music: 'town', noBanner: true });
npc('fh2', 'frost_house2', 'A', 'villager', ['A mage, a knight and a cleric walk into the Crystal Caverns... I forget the rest. It\'s probably a sad ending.']);
link('frosthold', '1', 'frost_sage'); link('frosthold', '2', 'frost_inn'); link('frosthold', '3', 'frost_shop');
link('frosthold', '4', 'frost_house1'); link('frosthold', '5', 'frost_house2');

// ==========================================================================================
// CRYSTAL CAVERNS
// ==========================================================================================
defMap('cavern1', { name: 'Crystal Caverns', music: 'ice', enc: { groups: 'icecave', bg: 'icecave' },
  onEnter: function* () {
    if (flag('c_enter')) return; setFlag('c_enter');
    yield* partyLine('lyra', 'The floor is solid ice! Once we start sliding, we won\'t stop until we hit something.');
    yield* partyLine('bram', 'Rocks will stop us. Plan the path before you slide, friends.');
  },
});
exitTo('cavern1', '<', 'world', 57, 6, 'down');
exitTo('cavern1', '>', 'cavern2', 17, 23, 'up');
stairs('cavern1', '>', 'stairsdown');
chest('cavern1', 2, 19, 'hipotion', 3); chest('cavern1', 26, 19, 'gold', 800); chest('cavern1', 27, 1, 'swiftboots');
defMap('cavern2', { name: 'Crystal Caverns B2', music: 'ice', enc: { groups: 'icecave', bg: 'icecave' } });
exitTo('cavern2', '<', 'cavern1', 22, 17, 'up');
exitTo('cavern2', '>', 'cavern3', 11, 15, 'up');
stairs('cavern2', '>', 'stairsdown');
crystalsFrom('cavern2');
chest('cavern2', 4, 3, 'firebomb', 3); chest('cavern2', 29, 6, 'steelplate'); chest('cavern2', 28, 22, 'phoenix', 2); chest('cavern2', 29, 15, 'magependant');
defMap('cavern3', { name: 'Wyrm\'s Lair', music: 'ice' });
exitTo('cavern3', '<', 'cavern2', 26, 15, 'down');
crystalsFrom('cavern3');
obj('cavern3', { id: 'ped3', ...MK('cavern3', '^'), sprite: 'pedestal', show: () => flag('boss_wyrm') });
obj('cavern3', { id: 'wyrm', ...MK('cavern3', '+'), enemy: 'wyrm', show: () => !flag('boss_wyrm') });
npc('mal3', 'cavern3', { x: 11, y: 5 }, 'villain', ['...'], { show: () => G.flags.mal3 === 1, name: 'Malgrath' });
obj('cavern3', {
  id: 'shard3', ...MK('cavern3', '^'), sprite: 'shardblue', glow: true, show: () => flag('boss_wyrm') && !hasItem('shard_frost'),
  talk: function* () {
    Audio8.sfx('shard');
    yield* give('shard_frost', 1, true);
    yield flash('rgba(160,220,255,0.4)', 20);
    yield say(null, 'Got the Frost Shard!');
    G.flags.mal3 = 1; yield refresh();
    Audio8.sfx('dark');
    yield flash('rgba(80,0,120,0.5)', 20);
    yield say('Malgrath', 'Three shards. You are persistent, I will give you that.');
    yield say('Aren', 'Elara asked us to save you! The Hollow is lying to you!');
    yield say('Malgrath', '...Do not speak her name. You know nothing.', 'Gather the last shard if you wish. It only saves me the trouble.');
    G.flags.mal3 = 2; yield refresh();
    yield flash('rgba(80,0,120,0.5)', 20);
    yield say('Lyra', 'He flinched when you said her name. Some part of him is still in there.');
    yield say('Bram', 'Then there is hope for him yet. Let us return to Orin.');
    objective('Back to Frosthold');
  },
});
MAPS.cavern3.triggers.push({
  x: MK('cavern3', '!').x, y: MK('cavern3', '!').y, w: 6, h: 1, once: 'wyrm_talk', when: () => !flag('boss_wyrm'), run: function* () {
    Audio8.sfx('quake');
    yield shake(30, 3);
    yield say('Frost Wyrm', 'WHO DISTURBS MY THOUSAND-YEAR SLEEP? THE BURNING STONE IS MINE.');
    yield say('Lyra', 'It\'s swallowed the shard\'s power! Fire, Aren! Use fire!');
    yield battle(['wyrm'], { bg: 'icecave' });
    setFlag('boss_wyrm');
    yield refresh();
    yield say(null, 'The Frost Wyrm curls into the ice and falls back into its long sleep.');
  },
});

// ==========================================================================================
// EMBER ISLE & CINDERREACH
// ==========================================================================================
defMap('ember_isle', { name: 'Ember Isle', music: 'world', enc: { groups: 'emberisle', bg: 'volcano' },
  onEnter: function* () {
    if (flag('isle_arrive')) return; setFlag('isle_arrive');
    yield say('Captain Morrow', 'Ember Isle. The air tastes of ash. I\'ll wait at the dock. Step onto it when you want to head home.');
    yield* partyLine('lyra', 'I can feel the last shard... it\'s up on that volcano. But there\'s a town first. Cinderreach.');
    objective('Cinderreach');
  },
});
MAPS.ember_isle.warps.push(
  {
    x: 5, y: 19, to: 'saltmere', tx: 20, ty: 22, dir: 'down', sfx: 'run', run: function* () {
      const r = yield ask('Captain Morrow', 'Back to Saltmere?', ['Set sail', 'Stay'], 1);
      if (r !== 0) return false;
      yield say(null, 'The Gull carries you back across the sea...');
    },
  },
  { x: 10, y: 12, to: 'cinderreach', tx: 1, ty: 9, dir: 'right' },
  { x: 24, y: 5, to: 'volcano1', tx: 7, ty: 22, dir: 'up' },
);
defMap('cinderreach', { name: 'Cinderreach', music: 'town',
  onEnter: function* () {
    if (flag('cinder_arrive')) return; setFlag('cinder_arrive');
    yield* partyLine('bram', 'Look at the people... they are terrified. And those red robes everywhere...');
  },
});
exitTo('cinderreach', 'W', 'ember_isle', 11, 12, 'right');
MAPS.cinderreach.signs.push({ ...MK('cinderreach', 'q'), text: 'Cinderreach. By order of the Pyre: all hail Ignaroth, the Flame Eternal.' });
npc('cult_g1', 'cinderreach', 'A', 'cultist', function* () {
  if (flag('boss_demon')) { yield say('Former Cultist', 'We were fools. Vask promised power... the beast only wanted to burn.'); return; }
  yield say('Cultist', 'Begone, outsider! High Pyre-Priest Vask has taken the holy ember to the summit for the Rite of Flames!');
});
npc('cult_g2', 'cinderreach', 'E', 'cultist', function* () {
  if (flag('boss_demon')) { yield say('Former Cultist', 'The hall is open now. The acolytes inside want to thank you.'); return; }
  yield say('Cultist', 'Soon Ignaroth will rise and burn the unworthy from this world. Glory to the Flame!');
});
npc('cinder_man', 'cinderreach', 'J', 'villager', ['The cult took over when a burning shard fell from the sky. Their leader Vask carried it up Ember Peak.', 'He means to summon some fire beast with it. Ember Peak is north-east of town.']);
npc('cinder_woman', 'cinderreach', 'L', 'woman', ['Ice magic works wonders against the fire creatures up the mountain. Lucky for you if you\'ve got a mage!'], { wander: true });
npc('bloom_girl', 'cinderreach', 'P', 'girl', function* () {
  if (hasItem('firebloom') || flag('bloom_given')) { yield say('Ash', 'Fire Blooms grow in the warm ash. Pretty, aren\'t they?'); return; }
  const r = yield ask('Ash', 'Fire Blooms! They stay warm for years. Only 100 gold! Want one?', ['Buy (100G)', 'No thanks'], 1);
  if (r !== 0) { yield say('Ash', 'Okay! They\'re here if you change your mind.'); return; }
  if (G.gold < 100) { yield say('Ash', 'Aww, you don\'t have enough gold.'); return; }
  G.gold -= 100;
  yield* give('firebloom');
  yield* partyLine('lyra', 'That little boy in Frosthold wanted one of these!');
});
npc('cinder_old', 'cinderreach', 'G', 'elder', ['Before the cult, this was a mining town. Good honest people. Now everyone is too scared to speak.']);
npc('cinder_cultist', 'cinderreach', 'T', 'cultist', function* () {
  if (flag('boss_demon')) { yield say('Former Cultist', 'I\'m taking off this robe and going back to the mines. Thank you.'); return; }
  yield say('Cultist', 'Glory to Ignaroth! ...Please don\'t tell Vask I yawned during the morning chant.');
}, { wander: true });
defMap('cinder_inn', { name: 'Ashen Rest Inn', music: 'town', noBanner: true });
npc('inn_c', 'cinder_inn', 'A', 'inn', function* () { yield* inn(100); });
npc('inn_c_g', 'cinder_inn', 'E', 'smith', ['The cultists up the mountain carry Ruby Keys. They lock their gates with them.']);
defMap('cinder_shop', { name: 'Cinderreach Market', music: 'town', noBanner: true });
npc('shop_c_items', 'cinder_shop', 'A', 'merchant', function* () { yield say('Shopkeep', 'Supplies, quick, before the cult sees I\'m open.'); yield shop('cinder_items'); });
npc('shop_c_arms', 'cinder_shop', 'E', 'smith', function* () { yield say('Smith', 'The best steel on the isle, quenched in lava.'); yield shop('cinder_arms'); });
defMap('cinder_hall', { name: 'Hall of the Pyre', music: 'town', noBanner: true });
npc('acolyte', 'cinder_hall', 'A', 'cultist', function* () {
  if (flag('acolyte_gift')) { yield say('Acolyte', 'Go well, heroes. May your light never fade.'); return; }
  setFlag('acolyte_gift');
  yield say('Acolyte', 'You destroyed Ignaroth and freed us from Vask\'s madness.', 'This was the cult\'s greatest treasure. Please, take it. It should heal, not hoard.');
  yield* give('megalixir');
});
defMap('cinder_house1', { name: 'House', music: 'town', noBanner: true });
npc('ch1', 'cinder_house1', 'A', 'woman', ['My son joined the cult. He said Vask would make us strong. Please... bring the light back.']);
defMap('cinder_house2', { name: 'House', music: 'town', noBanner: true });
npc('ch2', 'cinder_house2', 'A', 'smith', ['I used to forge pickaxes. Now they make me forge chains. Give that Vask a good thump for me.']);
link('cinderreach', '1', 'cinder_inn'); link('cinderreach', '2', 'cinder_shop'); link('cinderreach', '4', 'cinder_house1'); link('cinderreach', '5', 'cinder_house2');
{
  const d = MK('cinderreach', '3'), e = MK('cinder_hall', '1');
  MAPS.cinderreach.warps.push({
    x: d.x, y: d.y, to: 'cinder_hall', tx: e.x, ty: e.y - 1, dir: 'up', run: function* () {
      if (!flag('boss_demon')) { yield say(null, 'The great doors are barred from inside.'); return false; }
    },
  });
  MAPS.cinder_hall.warps.push({ x: e.x, y: e.y, to: 'cinderreach', tx: d.x, ty: d.y + 1, dir: 'down' });
}

// ==========================================================================================
// EMBER PEAK
// ==========================================================================================
defMap('volcano1', { name: 'Ember Peak', music: 'volcano', enc: { groups: 'volcano', bg: 'volcano' },
  onEnter: function* () { if (flag('v_enter')) return; setFlag('v_enter'); yield* partyLine('lyra', 'It\'s so hot my hat is wilting. Let\'s find that shard fast.'); },
});
exitTo('volcano1', '<', 'ember_isle', 24, 6, 'down');
exitTo('volcano1', '>', 'volcano2', 15, 23, 'up');
stairs('volcano1', '>', 'stairsdown');
chest('volcano1', 2, 2, 'redkey'); chest('volcano1', 27, 2, 'frostbomb', 3); chest('volcano1', 27, 21, 'sagerobe'); chest('volcano1', 4, 10, 'gold', 1200);
gateObj('volcano1', MK('volcano1', '&'), 'vred', 'gatered', 'vred', 'A gate with a ruby lock blocks the bridge.', 'redkey');
defMap('volcano2', { name: 'Ember Peak 2F', music: 'volcano', enc: { groups: 'volcano', bg: 'volcano' } });
exitTo('volcano2', '<', 'volcano1', 24, 19, 'left');
exitTo('volcano2', '>', 'volcano3', 11, 17, 'up');
stairs('volcano2', '>', 'stairsdown');
crystalsFrom('volcano2');
chest('volcano2', 2, 3, 'flamebrand'); chest('volcano2', 29, 3, 'lifering'); chest('volcano2', 11, 20, 'hiether'); chest('volcano2', 21, 20, 'megapotion', 2);
switchObj('volcano2', '%', 0, 'vsw1', function* () { yield* bothSwitches('vsw1', 'vsw2', 'vgate2'); });
switchObj('volcano2', '%', 1, 'vsw2', function* () { yield* bothSwitches('vsw1', 'vsw2', 'vgate2'); });
for (const [k, p] of MKS('volcano2', '&').entries()) gateObj('volcano2', p, 'vg2' + k, 'gatered', 'vgate2', 'The gate is sealed by two levers somewhere on this floor.');
for (const [k, p] of MKS('volcano2', '@').entries()) {
  const f = 'vguard' + k;
  npc('vguard' + k, 'volcano2', p, 'cultist', function* () {
    yield say('Ember Guard', 'Heretics! None shall disturb the treasures of the Pyre!');
    yield battle(['cultknight', 'imp'], { bg: 'volcano' });
    setFlag(f);
    yield say(null, 'The cultists flee down the mountain.');
  }, { show: () => !flag(f), dir: k === 0 ? 'right' : 'left' });
}
defMap('volcano3', { name: 'Summit of Flames', music: 'volcano' });
exitTo('volcano3', '<', 'volcano2', 15, 4, 'down');
crystalsFrom('volcano3');
obj('volcano3', { id: 'ped4', ...MK('volcano3', '^'), sprite: 'pedestal' });
obj('volcano3', { id: 'demon', ...MK('volcano3', '+'), enemy: 'demon', show: () => G.flags.vask >= 1 && !flag('boss_demon') });
npc('vask', 'volcano3', '@', 'cultist', ['...'], { show: () => !G.flags.vask || G.flags.vask < 2, name: 'Vask', dir: 'up' });
obj('volcano3', {
  id: 'shard4', ...MK('volcano3', '^'), sprite: 'shardred', glow: true, show: () => flag('boss_demon') && !hasItem('shard_ember'),
  talk: function* () {
    Audio8.sfx('shard');
    yield* give('shard_ember', 1, true);
    yield flash('rgba(255,160,80,0.4)', 20);
    yield say(null, 'Got the Ember Shard!');
    yield say('Lyra', 'That\'s all four! The shards are humming... like they\'re singing to each other.');
    yield say('Bram', 'Then let us bring them home to the King.');
    yield say('Aren', 'Back to Saltmere, then on to Castle Aurel. Let\'s end this.');
    objective('Return to King');
  },
});
MAPS.volcano3.triggers.push({
  x: MK('volcano3', '!').x, y: MK('volcano3', '!').y, w: 6, h: 1, once: 'vask_talk', when: () => !flag('boss_demon'), run: function* () {
    yield face('vask', 'down');
    yield say('Vask', 'Too late, little lambs! The Ember Shard has opened the burning gate!', 'Rise, IGNAROTH! Rise and reward your faithful servant!');
    G.flags.vask = 1; yield refresh();
    Audio8.sfx('quake');
    yield shake(40, 3);
    yield say('Ignaroth', 'WHO CALLS ME FROM THE BURNING DARK?');
    yield say('Vask', 'I do, great one! I, Vask, your most faithful! Burn these heretics, and—');
    yield say('Ignaroth', 'FAITHFUL? I SERVE THE HOLLOW, LITTLE PRIEST. AND THE HOLLOW... IS HUNGRY.');
    Audio8.sfx('fire');
    yield flash('rgba(255,120,0,0.6)', 20);
    G.flags.vask = 2; yield refresh();
    yield say('Bram', 'He... he burned his own priest to ash!');
    yield say('Aren', 'Lyra, every ice spell you have!');
    yield battle(['demon'], { bg: 'volcano' });
    setFlag('boss_demon');
    yield refresh();
    yield say(null, 'Ignaroth collapses into cinders. The Ember Shard drops onto the altar, still glowing.');
  },
});

// ==========================================================================================
// HOLLOW CITADEL
// ==========================================================================================
defMap('citadel1', { name: 'Hollow Citadel', music: 'citadel', enc: { groups: 'citadel', bg: 'citadel' },
  onEnter: function* () {
    if (flag('cit_enter')) return; setFlag('cit_enter');
    yield say('Lyra', 'This place... it feels like the inside of a nightmare.');
    yield say('Bram', 'Stay together. Whatever happens.');
  },
});
exitTo('citadel1', '<', 'world', 30, 17, 'down');
exitTo('citadel1', '>', 'citadel2', 15, 23, 'up');
stairs('citadel1', '>', 'stairsup');
crystalsFrom('citadel1');
chest('citadel1', 3, 12, 'megapotion', 2); chest('citadel1', 26, 12, 'hiether', 2);
npc('elara_camp', 'citadel1', '@', 'spirit', function* () {
  if (!flag('camp_talk')) {
    setFlag('camp_talk');
    yield say('Elara', 'You came! I knew you would.', 'The Hollow can\'t see this corner. I\'ll keep it safe for you. Rest by the crystal whenever you need.');
    yield say('Elara', 'I found some things the shadows dropped. You can have them... for a few coins. Ghosts need gold too!');
  }
  yield shop('camp_items');
}, { name: 'Elara' });
switchObj('citadel1', '%', 0, 'csw1', function* () { yield* bothSwitches('csw1', 'csw2', 'cgate1'); });
switchObj('citadel1', '%', 1, 'csw2', function* () { yield* bothSwitches('csw1', 'csw2', 'cgate1'); });
for (const [k, p] of MKS('citadel1', '&').entries()) gateObj('citadel1', p, 'cg1' + k, 'gate', 'cgate1', 'A gate of black iron. Two levers, west and east, hold it shut.');

defMap('citadel2', { name: 'Hollow Citadel 2F', music: 'citadel', enc: { groups: 'citadel', bg: 'citadel' } });
exitTo('citadel2', '<', 'citadel1', 14, 4, 'down');
exitTo('citadel2', '>', 'citadel3', 14, 22, 'up');
stairs('citadel2', '>', 'stairsup');
crystalsFrom('citadel2');
chest('citadel2', 3, 19, 'bluekey'); chest('citadel2', 28, 3, 'elixir'); chest('citadel2', 3, 3, 'starrobe'); chest('citadel2', 28, 19, 'gold', 3000);
gateObj('citadel2', MK('citadel2', '&'), 'cblue', 'gateblue', 'cblue', 'A gate with a sapphire lock.', 'bluekey');

defMap('citadel3', { name: 'Hollow Citadel 3F', music: 'citadel', enc: { groups: 'citadel', bg: 'citadel' } });
exitTo('citadel3', '<', 'citadel2', 16, 3, 'down');
exitTo('citadel3', '>', 'citadel4', 10, 21, 'up');
stairs('citadel3', '>', 'stairsup');
chest('citadel3', 3, 3, 'dawnbringer'); chest('citadel3', 10, 3, 'starstaff'); chest('citadel3', 19, 3, 'divinemace');
chest('citadel3', 26, 3, 'dragonmail'); chest('citadel3', 6, 16, 'holyvest'); chest('citadel3', 23, 16, 'megalixir');
for (const [k, p] of MKS('citadel3', '&').entries()) {
  const f = 'cknight' + k;
  obj('citadel3', {
    id: 'cknight' + k, x: p.x, y: p.y, enemy: 'knight', show: () => !flag(f),
    talk: function* () {
      yield say('Hollow Knight', 'NONE... SHALL... PASS...');
      yield battle(['knight', 'knight'], { bg: 'citadel' });
      setFlag(f);
      yield say(null, 'The Hollow Knights crumble into black dust.');
    },
  });
}
npc('elara3', 'citadel3', '@', 'spirit', function* () {
  yield say('Elara', 'Papa is just up these stairs. The Hollow is strongest there.', 'Please... make sure you\'re ready. I\'ll be with you when it matters most.');
}, { name: 'Elara' });

defMap('citadel4', { name: 'Throne of the Hollow', music: () => flag('boss_hollow') ? 'sad' : 'citadel' });
exitTo('citadel4', '<', 'citadel3', 15, 4, 'down');
crystalsFrom('citadel4');
npc('malgrath', 'citadel4', '+', 'villain', ['...'], { show: () => !flag('boss_hollow'), name: 'Malgrath' });
npc('elara4', 'citadel4', '@', 'spirit', ['...'], { show: () => G.flags.elara4 === 1, name: 'Elara', dir: 'up' });
MAPS.citadel4.triggers.push({
  x: 3, y: MK('citadel4', '!').y, w: 16, h: 1, once: 'final_talk', run: function* () {
    Audio8.stop();
    yield wait(30);
    yield say('Malgrath', 'So. My brother\'s champions, come at last.', 'Do you know what it is to lose everything, boy? To watch the only light in your life go out?');
    yield say('Aren', 'Elara told us everything. The Hollow lied to you, Malgrath!');
    yield say('Malgrath', '...Elara? You lie! She is GONE! The voice promised... it PROMISED she would come back!');
    Audio8.sfx('dark');
    yield flash('rgba(60,0,90,0.6)', 24);
    yield say('Malgrath', 'WE ARE THE HOLLOW. THE PRINCE IS ONLY A CROWN WE WEAR.', 'AND YOU HAVE BROUGHT US THE SHARDS. HOW KIND.');
    yield say('Lyra', 'Its voice is coming out of him! Aren, Bram, now!');
    yield battle(['king'], { bg: 'citadel', music: 'final' });
    Audio8.play('sad');
    yield say('Malgrath', 'Ngh... the voice... it\'s tearing itself free of me...');
    Audio8.sfx('quake');
    yield shake(50, 4);
    yield flash('rgba(0,0,0,0.8)', 30);
    yield say('The Hollow', 'FOOLISH FLESH. WE NEED NO VESSEL NOW. WE WILL DEVOUR THE SUN ITSELF.');
    G.flags.elara4 = 1; yield refresh();
    Audio8.sfx('holy');
    yield flash('rgba(255,255,255,0.6)', 24);
    yield say('Elara', 'Papa! I\'m here! I was always here!', 'Everyone... take my light!');
    yield* healAll(false);
    yield say(null, 'Elara\'s light surrounds the party. HP and MP fully restored!');
    yield battle(['hollow'], { bg: 'citadel', music: 'final' });
    setFlag('boss_hollow');
    Audio8.play('sad');
    yield say(null, 'With a scream like a dying star, the Hollow tears apart into nothing.');
    yield say('Malgrath', 'Elara... is it truly you?');
    yield say('Elara', 'It\'s me, Papa. You don\'t have to be sad anymore. It\'s time to come home. Both of us.');
    yield say('Malgrath', 'Aren... tell my brother I am sorry. For all of it.', 'The Hollow\'s stolen light has returned to the Sunstone. Let the sun rise again.');
    Audio8.sfx('holy');
    yield flash('rgba(255,255,220,0.8)', 40);
    G.flags.elara4 = 2;
    yield refresh();
    yield say('Bram', 'They\'re gone... together. Go in peace, both of you.');
    yield say('Lyra', 'Aren... look up. The citadel is crumbling into light!');
    yield fadeOut(0.03);
    yield* endingScene();
  },
});
function* endingScene() {
  yield warp('castle', 15, 5, 'up');
  Audio8.play('castle');
  yield say('King Aldric', 'The sky... it is blue again. The sun has risen over Aurel for the first time in weeks.');
  yield say('Aren', 'Your Majesty... Prince Malgrath asked me to tell you he was sorry. He and Elara are at peace now.');
  yield say('King Aldric', '...Thank you. I lost my brother long ago. Today, at least, I have him back in my heart.', 'Aren, Lyra, Bram: Aurel owes you everything. Let there be a feast that lasts a week!');
  yield say('Lyra', 'A week?! Master Orin is going to make me write a report about all of this...');
  yield say('Bram', 'I will bless the food. Twice, to be safe.');
  yield say('Aren', 'I should go home. My mother is waiting.');
  setFlag('cleared');
  yield* gameEnd();
  Scenes.clear();
  Scenes.push(new Title());
}
