/* Emberdeep — game core: roguelike dungeon RPG.
   10 seeded floors, XP/levels/builds, loot, 7 enemy types, elites,
   bosses on 3/6/9, final boss on 10, 3 endings. Canvas-optional: pure logic
   runs headless in Node (sprites/audio guarded). */
(function (g) {
  "use strict";
  var U = g.EmberUtil, D = g.EmberDungeon;

  var TILE = D.TILE;
  var FLOORS = 10;
  var BOSS_FLOORS = { 3: "matriarch", 6: "archon", 9: "warden" };

  // ---------------- data ----------------
  var ENEMIES = {
    rat:    { hp: 22, dmg: 8,  speed: 95,  xp: 6,  r: 11, unlock: 1, name: "Gloomrat" },
    slime:  { hp: 34, dmg: 10, speed: 55,  xp: 8,  r: 13, unlock: 1, name: "Mire Slime" },
    imp:    { hp: 26, dmg: 9,  speed: 80,  xp: 10, r: 11, unlock: 2, name: "Cinderimp" },
    knight: { hp: 60, dmg: 14, speed: 75,  xp: 14, r: 13, unlock: 3, name: "Hollow Knight" },
    wisp:   { hp: 30, dmg: 12, speed: 130, xp: 14, r: 10, unlock: 4, name: "Wisp" },
    spitter:{ hp: 44, dmg: 10, speed: 0,   xp: 16, r: 13, unlock: 5, name: "Spitter" }
  };

  var WEAPONS = [
    { name: "Rusty Sword",  mult: 1.0, rate: 1.0, range: 54, special: null,   minFloor: 1 },
    { name: "Iron Sword",   mult: 1.5, rate: 1.1, range: 58, special: null,   minFloor: 2 },
    { name: "Ember Blade",  mult: 2.0, rate: 1.1, range: 60, special: "burn", minFloor: 4 },
    { name: "Wraith Edge",  mult: 2.6, rate: 1.0, range: 62, special: "leech",minFloor: 6 },
    { name: "Dawnbrand",    mult: 3.4, rate: 1.2, range: 66, special: "crit", minFloor: 8 }
  ];

  var CHARMS = [
    { id: "boots",   name: "Swift Boots",  desc: "+15% move speed" },
    { id: "heart",   name: "Heartstone",   desc: "+25 max HP" },
    { id: "leech",   name: "Leech Totem",  desc: "Heal 3 on kill" },
    { id: "thorns",  name: "Thornmail",    desc: "Reflect 40% contact damage" },
    { id: "lantern", name: "Old Lantern",  desc: "+light, +magnet range" }
  ];

  var LEVEL_POOL = [
    { id: "might", name: "Might",      desc: "+25% damage",          apply: function (p) { p.dmgMult *= 1.25; } },
    { id: "vit",   name: "Vitality",   desc: "+20 max HP, heal 20",  apply: function (p) { p.maxhp += 20; p.hp = Math.min(p.maxhp, p.hp + 20); } },
    { id: "swift", name: "Swiftness",  desc: "+12% move speed",      apply: function (p) { p.speed *= 1.12; } },
    { id: "focus", name: "Focus",      desc: "+20% attack speed",    apply: function (p) { p.atkRate *= 1.2; } },
    { id: "crit",  name: "Cruel Edge", desc: "+10% crit chance",     apply: function (p) { p.crit += 0.10; } },
    { id: "regen", name: "Regrowth",   desc: "Regenerate 1 HP/s",    apply: function (p) { p.regen += 1; } }
  ];

  var BOSSES = {
    matriarch: { name: "Gloom Matriarch", hp: 420,  dmg: 16, speed: 85, r: 26, sprite: "boss_matriarch",
      taunts: ["MY CHILDREN HUNGER, LITTLE LIGHT.", "THE DARK HAS TEETH. I AM ITS JAW."] },
    archon: { name: "Cinder Archon", hp: 780,  dmg: 20, speed: 70, r: 26, sprite: "boss_archon",
      taunts: ["BURN WITH ME, LANTERN-BEARER.", "YOUR EMBER IS ALREADY MINE."] },
    warden: { name: "Hollow Warden", hp: 1250, dmg: 26, speed: 90, r: 26, sprite: "boss_warden",
      taunts: ["TRESPASSER. THE KING DOES NOT BARGAIN.", "KNEEL, OR BE KNELT."] },
    king: { name: "The Hollow King", hp: 1750, dmg: 30, speed: 80, r: 34, sprite: "boss_king",
      taunts: ["YOU CARRY LIGHT INTO MY THROAT, CHILD?", "I WAS A KING WHEN YOUR VILLAGE WAS SPARKS.", "ENOUGH. DROWN IN THE DARK."] }
  };

  var ENDINGS = [
    { id: "dawn", title: "Ending — Dawn",
      text: "You lift the Ember high and the dark recoils. Cinderhold glows again by winter. Old Maren weeps into her soup. The dungeon seals itself behind you, and for the first time in years, the lanterns stay lit." },
    { id: "emberlord", title: "Ending — Emberlord",
      text: "Power hums in your palm, warm as a second heart. Why give it back? You turn from the stairs and descend deeper, the dark parting like a crowd. Somewhere above, the lanterns go out one by one." },
    { id: "release", title: "Ending — Release",
      text: "You dash the Ember on the throne and the Hollow King exhales — a sound like wind through a door. The dark thins, ordinary and quiet. No kings, no embers, no more dungeon. Just morning." }
  ];

  // ---------------- state ----------------
  function create(seed) {
    var rng = new U.RNG(seed);
    var G = {
      seed: seed, rng: rng, state: "title", floor: 0,
      dungeon: null, player: null, enemies: [], projs: [], pickups: [],
      chests: [], particles: [], floaters: [], npc: null, stairs: null,
      boss: null, bossActive: false, ember: null,
      timeMs: 0, kills: 0, chestsOpened: 0,
      dialogue: [], afterDialogue: null, levelChoices: [], events: [],
      cam: { x: 0, y: 0 }, shake: 0,
      talkedMaren: false, ending: null, stats: null, banner: null, bannerT: 0
    };
    G.ev = function (t, d) { G.events.push({ t: t, d: d || {} }); };
    return G;
  }

  function newPlayer() {
    return {
      x: 0, y: 0, r: 11, hp: 100, maxhp: 100, level: 1, xp: 0, xpNext: 24,
      dmgMult: 1, baseDmg: 14, speed: 165, atkRate: 1, atkCd: 0,
      crit: 0.05, lifesteal: 0, regen: 0, thorns: 0, magnet: 52, light: 230,
      weapon: 0, charms: [], healPot: 1, bombPot: 1, healCd: 0,
      facing: 1, walkT: 0, iframes: 0, swingT: 0, swingA: 0, moving: false
    };
  }

  function scaleFor(floor) {
    return { hp: 1 + 0.38 * (floor - 1), dmg: 1 + 0.16 * (floor - 1) };
  }

  function spawnEnemy(G, type, x, y, elite) {
    var b = ENEMIES[type], s = scaleFor(G.floor);
    var e = {
      kind: "enemy", type: type, name: b.name, x: x, y: y, r: b.r,
      hp: b.hp * s.hp, maxhp: b.hp * s.hp, dmg: b.dmg * s.dmg, speed: b.speed,
      xp: b.xp, elite: !!elite, t: G.rng.range(0, 2), t2: 0, state: "idle",
      kx: 0, ky: 0, flash: 0, burnT: 0, burnDps: 0, touchCd: 0, tx: x, ty: y
    };
    if (elite) { e.hp *= 2.2; e.maxhp = e.hp; e.dmg *= 1.5; e.xp *= 3; e.r *= 1.35; e.speed *= 1.1; }
    G.enemies.push(e);
    return e;
  }

  function setupFloor(G, floor) {
    G.floor = floor;
    var isBoss = !!BOSS_FLOORS[floor] || floor === 10;
    G.dungeon = D.generate(G.rng, floor, { bossArena: isBoss });
    G.enemies = []; G.projs = []; G.pickups = []; G.chests = [];
    G.particles = []; G.floaters = []; G.boss = null; G.bossActive = false; G.ember = null;
    var d = G.dungeon, T = D.TILE;
    var sx = (d.start.x + 0.5) * T, sy = (d.start.y + 0.5) * T;
    if (!G.player) G.player = newPlayer();
    G.player.x = sx; G.player.y = sy;
    G.stairs = { x: (d.stairs.x + 0.5) * T, y: (d.stairs.y + 0.5) * T, open: !isBoss };
    G.npc = (floor === 1 && !G.talkedMaren) ? { x: sx + 70, y: sy - 40, name: "Old Maren" } : null;

    if (!isBoss) {
      var types = Object.keys(ENEMIES).filter(function (t) { return ENEMIES[t].unlock <= floor; });
      d.rooms.forEach(function (rm, ri) {
        if (ri === 0) return;
        var n = G.rng.int(2, Math.min(3 + floor, 8));
        for (var i = 0; i < n; i++) {
          var spot = D.randomFloorTile(d, G.rng);
          if (U.dist(spot.x, spot.y, G.stairs.x, G.stairs.y) < 3 * T) continue;
          spawnEnemy(G, G.rng.pick(types), spot.x, spot.y, floor >= 2 && G.rng.chance(0.07));
        }
      });
      var nc = G.rng.int(2, 4);
      for (var ci = 0; ci < nc; ci++) {
        var cs = D.randomFloorTile(d, G.rng);
        G.chests.push({ x: cs.x, y: cs.y, opened: false });
      }
    } else {
      var bossType = floor === 10 ? "king" : BOSS_FLOORS[floor];
      var b = BOSSES[bossType];
      var sc = 1 + 0.12 * Math.max(0, floor - 3);
      var bx = (d.rooms[0].cx + 0.5) * T, by = (d.rooms[0].cy - 3) * T;
      G.boss = {
        kind: "boss", type: bossType, name: b.name, x: bx, y: by, r: b.r,
        hp: b.hp * sc, maxhp: b.hp * sc, dmg: b.dmg, speed: b.speed,
        xp: 120, elite: false, t: 0, t2: 0, t3: 0, state: "dormant",
        kx: 0, ky: 0, flash: 0, burnT: 0, burnDps: 0, touchCd: 0,
        tauntIdx: 0, phase: 1, sprite: b.sprite, taunts: b.taunts, minions: 0
      };
      G.enemies.push(G.boss);
    }
    G.state = "play";
  }

  function startRun(G) {
    G.player = newPlayer();
    G.timeMs = 0; G.kills = 0; G.chestsOpened = 0; G.talkedMaren = false; G.ending = null;
    G.dialogue = [
      { who: "", text: "The Ember is gone. Without it, Cinderhold will freeze by winter's end." },
      { who: "", text: "The Hollow King took it deep into Emberdeep. Ten floors down." },
      { who: "Ash", text: "Then I'd better get walking. Keep a lantern lit for me." }
    ];
    G.state = "dialogue";
    G.afterDialogue = function () { setupFloor(G, 1); };
  }

  // ---------------- loot ----------------
  function chestLoot(G, chest) {
    var r = G.rng, f = G.floor, out = [];
    var roll = r.next();
    if (roll < 0.30) {
      var tiers = [];
      for (var i = 0; i < WEAPONS.length; i++) if (WEAPONS[i].minFloor <= f && i > G.player.weapon) tiers.push(i);
      out.push(tiers.length ? { kind: "weapon", tier: tiers[0] } : { kind: "heart" });
    } else if (roll < 0.55 && G.player.charms.length < 3) {
      var avail = CHARMS.filter(function (c) {
        return !G.player.charms.some(function (h) { return h.id === c.id; });
      });
      out.push(avail.length ? { kind: "charm", charm: r.pick(avail) } : { kind: "potion_heal" });
    } else if (roll < 0.75) out.push({ kind: "potion_heal" });
    else if (roll < 0.90) out.push({ kind: "potion_bomb" });
    else out.push({ kind: "heart" });
    out.forEach(function (p, i) {
      G.pickups.push({ kind: p.kind, tier: p.tier, charm: p.charm, x: chest.x + (i - 0.5) * 26, y: chest.y - 10, bob: r.range(0, 6), t: 0 });
    });
    G.ev("chest");
  }

  function hasCharm(pl, id) { return pl.charms.some(function (c) { return c.id === id; }); }

  function applyPickup(G, p) {
    var pl = G.player;
    if (p.kind === "heart") { pl.hp = Math.min(pl.maxhp, pl.hp + 25); G.ev("heart"); }
    else if (p.kind === "potion_heal") { pl.healPot = Math.min(3, pl.healPot + 1); G.ev("pickup"); }
    else if (p.kind === "potion_bomb") { pl.bombPot = Math.min(3, pl.bombPot + 1); G.ev("pickup"); }
    else if (p.kind === "weapon") {
      if (p.tier > pl.weapon) { pl.weapon = p.tier; G.ev("pickup"); addFloater(G, pl.x, pl.y - 24, WEAPONS[p.tier].name + "!", "#ffd75e"); }
      else pl.hp = Math.min(pl.maxhp, pl.hp + 10);
    }
    else if (p.kind === "charm") {
      if (pl.charms.length < 3) {
        pl.charms.push(p.charm);
        if (p.charm.id === "heart") { pl.maxhp += 25; pl.hp += 25; }
        if (p.charm.id === "lantern") { pl.light += 90; pl.magnet += 46; }
        G.ev("pickup"); addFloater(G, pl.x, pl.y - 24, p.charm.name + "!", "#c39bd3");
      } else pl.hp = Math.min(pl.maxhp, pl.hp + 10);
    }
    else if (p.kind === "ember") { G.state = "ending_choice"; G.ev("win"); }
  }

  function addFloater(G, x, y, text, color) {
    G.floaters.push({ x: x, y: y, text: String(text), color: color || "#fff", t: 0 });
  }
  function burst(G, x, y, color, n) {
    for (var i = 0; i < (n || 8); i++) {
      var a = G.rng.range(0, Math.PI * 2), s = G.rng.range(40, 170);
      G.particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: G.rng.range(0.25, 0.6), color: color });
    }
  }
  function banner(G, text, sub) { G.banner = { text: text, sub: sub || "" }; G.bannerT = 2.6; }

  // ---------------- combat ----------------
  function playerDmg(G) {
    var pl = G.player, w = WEAPONS[pl.weapon];
    return pl.baseDmg * w.mult * pl.dmgMult;
  }

  function damageEnemy(G, e, raw, kx, ky) {
    if (e.hp <= 0 || G.state !== "play") return;
    var pl = G.player;
    var crit = G.rng.next() < (pl.crit + (WEAPONS[pl.weapon].special === "crit" ? 0.15 : 0));
    var dmg = raw * (crit ? 2 : 1);
    e.hp -= dmg;
    e.flash = 0.12;
    var kb = e.kind === "boss" ? 0.15 : 1; // bosses barely budge
    e.kx += (kx || 0) * kb; e.ky += (ky || 0) * kb;
    addFloater(G, e.x + G.rng.range(-8, 8), e.y - e.r - 6, Math.round(dmg) + (crit ? "!" : ""), crit ? "#ffd75e" : "#ffffff");
    if (WEAPONS[pl.weapon].special === "burn") { e.burnT = 3; e.burnDps = Math.max(2, dmg * 0.15); }
    var leech = pl.lifesteal + (WEAPONS[pl.weapon].special === "leech" ? 0.10 : 0);
    if (leech > 0) pl.hp = Math.min(pl.maxhp, pl.hp + dmg * leech);
    G.ev("hit");
    if (e.hp <= 0) killEnemy(G, e);
  }

  function killEnemy(G, e) {
    e.hp = 0;
    var pl = G.player;
    G.kills++;
    burst(G, e.x, e.y, e.kind === "boss" ? "#ffd75e" : "#c0392b", e.kind === "boss" ? 40 : 10);
    G.ev("enemyDie");
    gainXp(G, e.xp);
    if (hasCharm(pl, "leech")) pl.hp = Math.min(pl.maxhp, pl.hp + 3);
    // drops
    if (e.kind === "boss") { bossDown(G, e); return; }
    var r = G.rng.next();
    if (e.elite) {
      var tiers = [];
      for (var i = 0; i < WEAPONS.length; i++) if (WEAPONS[i].minFloor <= G.floor && i > pl.weapon) tiers.push(i);
      if (tiers.length) G.pickups.push({ kind: "weapon", tier: tiers[0], x: e.x, y: e.y, bob: 0, t: 0 });
      else if (pl.charms.length < 3) {
        var av = CHARMS.filter(function (c) { return !hasCharm(pl, c.id); });
        if (av.length) G.pickups.push({ kind: "charm", charm: G.rng.pick(av), x: e.x, y: e.y, bob: 0, t: 0 });
      } else G.pickups.push({ kind: "heart", x: e.x, y: e.y, bob: 0, t: 0 });
      G.pickups.push({ kind: "heart", x: e.x + 20, y: e.y, bob: 0, t: 0 });
    } else if (r < 0.22) {
      G.pickups.push({ kind: "heart", x: e.x, y: e.y, bob: 0, t: 0 });
    } else if (r < 0.27) {
      G.pickups.push({ kind: G.rng.chance(0.5) ? "potion_heal" : "potion_bomb", x: e.x, y: e.y, bob: 0, t: 0 });
    }
    // slime split (small ones don't re-split)
    if (e.type === "slime" && !e.noSplit) {
      for (var i = 0; i < 2; i++) {
        var s = spawnEnemy(G, "slime", e.x + G.rng.range(-16, 16), e.y + G.rng.range(-16, 16), false);
        s.hp = s.maxhp = 14 * scaleFor(G.floor).hp; s.r = 8; s.speed = 110; s.dmg *= 0.6; s.xp = 3; s.noSplit = true;
      }
    }
  }

  function bossDown(G, e) {
    banner(G, e.name + " FALLS", G.floor === 10 ? "The Ember is yours." : "The way down lies open.");
    G.ev("bossDown");
    if (G.floor === 10) {
      G.ember = { kind: "ember", x: e.x, y: e.y, bob: 0, t: 0 };
      G.pickups.push(G.ember);
    } else {
      G.stairs.open = true;
      for (var i = 0; i < 3; i++) {
        G.pickups.push({ kind: "heart", x: e.x + G.rng.range(-40, 40), y: e.y + G.rng.range(-30, 30), bob: 0, t: 0 });
      }
      var tiers = [];
      for (var w = 0; w < WEAPONS.length; w++) if (WEAPONS[w].minFloor <= G.floor + 1 && w > G.player.weapon) tiers.push(w);
      if (tiers.length) G.pickups.push({ kind: "weapon", tier: tiers[0], x: e.x, y: e.y - 40, bob: 0, t: 0 });
    }
  }

  function hurtPlayer(G, dmg, sx, sy, enemy) {
    var pl = G.player;
    if (pl.iframes > 0 || G.state !== "play" || pl.hp <= 0) return;
    if (enemy && pl.thorns + (hasCharm(pl, "thorns") ? 0.4 : 0) > 0) {
      var refl = dmg * (pl.thorns + (hasCharm(pl, "thorns") ? 0.4 : 0));
      damageEnemy(G, enemy, refl, 0, 0);
    }
    pl.hp -= dmg;
    pl.iframes = 0.8;
    var a = U.angleTo(sx, sy, pl.x, pl.y);
    pl.x += Math.cos(a) * 14; pl.y += Math.sin(a) * 14;
    D.collide(G.dungeon, pl, pl.r);
    G.shake = Math.min(10, 4 + dmg * 0.15);
    addFloater(G, pl.x, pl.y - 24, "-" + Math.round(dmg), "#ff7d9c");
    G.ev("hurt");
    burst(G, pl.x, pl.y, "#ff7d9c", 6);
    if (pl.hp <= 0) {
      pl.hp = 0;
      G.state = "dead";
      G.stats = makeStats(G);
      G.ev("lose");
    }
  }

  function gainXp(G, n) {
    var pl = G.player;
    pl.xp += n;
    while (pl.xp >= pl.xpNext) {
      pl.xp -= pl.xpNext;
      pl.level++;
      pl.xpNext = Math.round(24 * Math.pow(pl.level, 1.45));
      G.pendingLevels = (G.pendingLevels || 0) + 1;
    }
    if (G.pendingLevels > 0 && G.state === "play") triggerLevelUp(G);
  }

  function triggerLevelUp(G) {
    var pool = LEVEL_POOL.slice();
    G.rng.shuffle(pool);
    G.levelChoices = pool.slice(0, 3);
    G.state = "levelup";
    G.ev("levelup");
  }

  function chooseUpgrade(G, i) {
    var c = G.levelChoices[i];
    if (!c) return;
    c.apply(G.player);
    addFloater(G, G.player.x, G.player.y - 30, c.name + "!", "#9b59b6");
    G.pendingLevels = Math.max(0, (G.pendingLevels || 1) - 1);
    if (G.pendingLevels > 0) triggerLevelUp(G);
    else { G.levelChoices = []; G.state = "play"; }
  }

  function makeStats(G) {
    return {
      seed: G.seed, floor: G.floor, level: G.player.level, kills: G.kills,
      chests: G.chestsOpened, timeMin: Math.round(G.timeMs / 60000 * 10) / 10,
      weapon: WEAPONS[G.player.weapon].name,
      charms: G.player.charms.map(function (c) { return c.name; })
    };
  }

  // ---------------- enemy AI ----------------
  function shootAt(G, e, tx, ty, speed, dmg) {
    var a = U.angleTo(e.x, e.y, tx, ty);
    G.projs.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg: dmg, r: 6, life: 4, color: "#ff8c2e", enemy: true });
    G.ev("shoot");
  }

  function updateEnemy(G, e, dt) {
    var pl = G.player, r = G.rng;
    e.t += dt; e.t2 -= dt; e.t3 -= dt; e.flash -= dt; e.touchCd -= dt;
    // knockback decay
    e.x += e.kx * dt; e.y += e.ky * dt;
    e.kx *= Math.pow(0.001, dt); e.ky *= Math.pow(0.001, dt);
    // burn
    if (e.burnT > 0) {
      e.burnT -= dt;
      e.hp -= e.burnDps * dt;
      if (e.hp <= 0) { killEnemy(G, e); return; }
    }
    var d = U.dist(e.x, e.y, pl.x, pl.y);
    var a = U.angleTo(e.x, e.y, pl.x, pl.y);

    function moveToward(tx, ty, sp) {
      var aa = U.angleTo(e.x, e.y, tx, ty);
      e.x += Math.cos(aa) * sp * dt; e.y += Math.sin(aa) * sp * dt;
    }

    if (e.kind === "boss") { updateBoss(G, e, dt, d, a); }
    else if (e.type === "rat" || e.type === "slime") { if (d > e.r + pl.r + 2) moveToward(pl.x, pl.y, e.speed); }
    else if (e.type === "imp") {
      if (d < 190) moveToward(pl.x - Math.cos(a) * 60, pl.y - Math.sin(a) * 60, e.speed);
      else if (d > 300) moveToward(pl.x, pl.y, e.speed);
      if (e.t2 <= 0 && d < 420) { shootAt(G, e, pl.x, pl.y, 175, e.dmg); e.t2 = 2.4; }
    }
    else if (e.type === "knight") {
      if (e.state === "idle") {
        e.tx += Math.cos(e.t) * 20 * dt; e.ty += Math.sin(e.t * 1.3) * 20 * dt;
        moveToward(e.tx, e.ty, 30);
        if (d < 280 && e.t2 <= 0) { e.state = "tele"; e.t3 = 0.6; e.flash = 0.6; }
      } else if (e.state === "tele") {
        e.t3 -= dt;
        if (e.t3 <= 0) { e.state = "charge"; e.t3 = 0.5; e.ca = a; G.ev("shoot"); }
      } else if (e.state === "charge") {
        e.t3 -= dt;
        e.x += Math.cos(e.ca) * 340 * dt; e.y += Math.sin(e.ca) * 340 * dt;
        if (e.t3 <= 0) { e.state = "idle"; e.t2 = 2.6; }
      }
    }
    else if (e.type === "wisp") {
      if (e.state === "idle" || e.state === "orbit") {
        e.state = "orbit";
        var oa = e.t * 2.1;
        moveToward(pl.x + Math.cos(oa) * 150, pl.y + Math.sin(oa) * 150, e.speed);
        if (e.t2 <= 0) { e.state = "tele"; e.t3 = 0.4; e.flash = 0.4; }
      } else if (e.state === "tele") {
        e.t3 -= dt;
        if (e.t3 <= 0) { e.state = "dash"; e.t3 = 0.38; e.ca = a; }
      } else if (e.state === "dash") {
        e.t3 -= dt;
        e.x += Math.cos(e.ca) * 430 * dt; e.y += Math.sin(e.ca) * 430 * dt;
        if (e.t3 <= 0) { e.state = "orbit"; e.t2 = 2.4; }
      }
    }
    else if (e.type === "spitter") {
      if (e.t2 <= 0 && d < 460) {
        for (var i = 0; i < 6; i++) {
          var sa = (i / 6) * Math.PI * 2 + e.t;
          G.projs.push({ x: e.x, y: e.y, vx: Math.cos(sa) * 130, vy: Math.sin(sa) * 130, dmg: e.dmg, r: 6, life: 4, color: "#46c46a", enemy: true });
        }
        G.ev("shoot"); e.t2 = 3.0;
      }
    }

    D.collide(G.dungeon, e, e.r);
    // contact damage
    if (d < e.r + pl.r && e.touchCd <= 0) {
      hurtPlayer(G, e.dmg, e.x, e.y, e);
      e.touchCd = 0.9;
    }
  }

  function bossTaunt(G, e) {
    var frac = e.hp / e.maxhp;
    var idx = frac < 0.33 ? 2 : frac < 0.66 ? 1 : 0;
    if (idx >= e.tauntIdx && e.taunts[idx]) {
      e.tauntIdx = idx + 1;
      banner(G, e.name.toUpperCase(), e.taunts[idx]);
      G.ev("bossRoar");
    }
  }

  function updateBoss(G, e, dt, d, a) {
    var pl = G.player, r = G.rng;
    // activation
    if (e.state === "dormant") {
      if (d < 400) {
        e.state = "fight"; G.bossActive = true;
        banner(G, e.name.toUpperCase(), e.taunts[0]);
        G.ev("bossRoar");
      }
      return;
    }
    bossTaunt(G, e);
    var frac = e.hp / e.maxhp;

    function moveToward(sp) { e.x += Math.cos(a) * sp * dt; e.y += Math.sin(a) * sp * dt; }
    function minions() { var n = 0; G.enemies.forEach(function (x) { if (x !== e && x.hp > 0) n++; }); return n; }

    if (e.type === "matriarch") {
      if (e.t2 <= 0 && minions() < 6) {
        for (var i = 0; i < 2; i++) spawnEnemy(G, "rat", e.x + r.range(-60, 60), e.y + r.range(-60, 60), false);
        e.t2 = 8;
      }
      // charge cycle like knight
      if (e.state === "fight") {
        if (d > 120) moveToward(e.speed);
        if (d < 300 && e.t3 <= 0) { e.state = "tele"; e.t2s = 0.6; e.flash = 0.6; }
      } else if (e.state === "tele") {
        e.t2s -= dt;
        if (e.t2s <= 0) { e.state = "charge"; e.t2s = 0.5; e.ca = a; }
      } else if (e.state === "charge") {
        e.t2s -= dt;
        e.x += Math.cos(e.ca) * 380 * dt; e.y += Math.sin(e.ca) * 380 * dt;
        if (e.t2s <= 0) { e.state = "fight"; e.t3 = 3; }
      }
      e.t3 -= dt;
    }
    else if (e.type === "archon") {
      // spiral fire
      if (e.t2 <= 0) {
        var base = e.t * 2.4;
        for (var i = 0; i < 3; i++) {
          var sa = base + (i / 3) * Math.PI * 2;
          G.projs.push({ x: e.x, y: e.y, vx: Math.cos(sa) * 150, vy: Math.sin(sa) * 150, dmg: e.dmg * 0.7, r: 6, life: 5, color: "#ff8c2e", enemy: true });
        }
        e.t2 = 0.75;
      }
      if (e.t3 <= 0) { // aimed burst
        for (var b = 0; b < 3; b++) (function (k) {
          setTimeoutSafe(G, k * 0.15, function () { shootAt(G, e, pl.x, pl.y, 220, e.dmg); });
        })(b);
        e.t3 = 5.5;
      }
      if (d > 200) moveToward(e.speed * 0.7);
      if (r.next() < dt * 0.25 && minions() < 4) spawnEnemy(G, "imp", e.x + r.range(-80, 80), e.y + r.range(-80, 80), false);
    }
    else if (e.type === "warden") {
      if (e.state === "fight") {
        if (d > 140) moveToward(e.speed);
        if (e.t2 <= 0) { e.state = "tele"; e.t2s = 0.5; e.flash = 0.5; e.dashes = 3; }
        if (e.t3 <= 0) { // shockwave ring
          for (var i = 0; i < 10; i++) {
            var sa2 = (i / 10) * Math.PI * 2;
            G.projs.push({ x: e.x, y: e.y, vx: Math.cos(sa2) * 170, vy: Math.sin(sa2) * 170, dmg: e.dmg * 0.6, r: 6, life: 4, color: "#9b59b6", enemy: true });
          }
          G.ev("shoot"); e.t3 = 9;
        }
        if (r.next() < dt * 0.12 && minions() < 3) spawnEnemy(G, "knight", e.x + r.range(-80, 80), e.y + r.range(-80, 80), false);
      } else if (e.state === "tele") {
        e.t2s -= dt;
        if (e.t2s <= 0) { e.state = "dash"; e.t2s = 0.4; e.ca = a; }
      } else if (e.state === "dash") {
        e.t2s -= dt;
        e.x += Math.cos(e.ca) * 460 * dt; e.y += Math.sin(e.ca) * 460 * dt;
        if (e.t2s <= 0) {
          e.dashes--;
          if (e.dashes > 0) { e.state = "tele"; e.t2s = 0.35; e.ca = a; }
          else { e.state = "fight"; e.t2 = 3.5; }
        }
      }
    }
    else if (e.type === "king") {
      var phase = frac < 0.33 ? 3 : frac < 0.66 ? 2 : 1;
      e.phase = phase;
      var spd = e.speed * (phase === 3 ? 1.5 : 1);
      if (d > 170) moveToward(spd);
      if (e.t2 <= 0) {
        if (phase === 1) shootAt(G, e, pl.x, pl.y, 210, e.dmg);
        else {
          var base2 = e.t * (phase === 3 ? 3.2 : 2.2);
          for (var s2 = 0; s2 < (phase === 3 ? 8 : 5); s2++) {
            var sa3 = base2 + (s2 / (phase === 3 ? 8 : 5)) * Math.PI * 2;
            G.projs.push({ x: e.x, y: e.y, vx: Math.cos(sa3) * 160, vy: Math.sin(sa3) * 160, dmg: e.dmg * 0.5, r: 7, life: 5, color: "#e23c00", enemy: true });
          }
          G.ev("shoot");
        }
        e.t2 = phase === 3 ? 1.05 : 1.9;
      }
      if (phase >= 2 && e.t3 <= 0) {
        if (minions() < 4) for (var wI = 0; wI < 2; wI++) spawnEnemy(G, "wisp", e.x + r.range(-90, 90), e.y + r.range(-90, 90), false);
        e.t3 = 11;
      }
    }
  }

  // setTimeout replacement that works headless: queue delayed callbacks on the game
  function setTimeoutSafe(G, delay, fn) {
    G.delayed = G.delayed || [];
    G.delayed.push({ t: delay, fn: fn });
  }

  // ---------------- master update ----------------
  function update(G, dt, input) {
    dt = Math.min(dt, 0.05);
    input = input || {};
    if (G.bannerT > 0) { G.bannerT -= dt; if (G.bannerT <= 0) G.banner = null; }

    // delayed callbacks (headless-safe setTimeout)
    if (G.delayed && G.delayed.length) {
      for (var di = G.delayed.length - 1; di >= 0; di--) {
        G.delayed[di].t -= dt;
        if (G.delayed[di].t <= 0) { var fn = G.delayed[di].fn; G.delayed.splice(di, 1); try { fn(); } catch (e) {} }
      }
    }

    if (G.state === "dialogue") {
      if (input.advP) {
        G.dialogue.shift();
        G.ev("ui");
        if (!G.dialogue.length) {
          var cb = G.afterDialogue; G.afterDialogue = null;
          if (cb) cb();
        }
      }
      return;
    }
    if (G.state === "levelup") {
      if (input.choice != null && input.choice >= 0) chooseUpgrade(G, input.choice);
      return;
    }
    if (G.state === "ending_choice") {
      if (input.choice != null && input.choice >= 0 && input.choice < ENDINGS.length) {
        G.ending = ENDINGS[input.choice];
        G.state = "win";
        G.stats = makeStats(G);
        G.ev("win");
      }
      return;
    }
    if (G.state !== "play") return;

    G.timeMs += dt * 1000;
    var pl = G.player, d = G.dungeon;

    // --- player movement ---
    var mx = input.mx || 0, my = input.my || 0;
    var ml = Math.sqrt(mx * mx + my * my);
    pl.moving = ml > 0.1;
    if (pl.moving) {
      mx /= Math.max(1, ml); my /= Math.max(1, ml);
      pl.x += mx * pl.speed * dt; pl.y += my * pl.speed * dt;
      pl.walkT += dt * 10;
      pl.facing = mx < -0.1 ? -1 : mx > 0.1 ? 1 : pl.facing;
    }
    D.collide(d, pl, pl.r);
    pl.iframes -= dt; pl.atkCd -= dt; pl.healCd -= dt; pl.swingT -= dt;
    if (pl.regen > 0) pl.hp = Math.min(pl.maxhp, pl.hp + pl.regen * dt);

    // auto-drink heal potion at low HP
    if (pl.hp < pl.maxhp * 0.35 && pl.healPot > 0 && pl.healCd <= 0) useHeal(G);
    if (input.healP) useHeal(G);
    if (input.bombP) useBomb(G);

    // --- melee attack (soft-aim at nearest enemy) ---
    if (input.attack && pl.atkCd <= 0) {
      var w = WEAPONS[pl.weapon];
      var best = null, bestD = 220;
      for (var ei = 0; ei < G.enemies.length; ei++) {
        var en = G.enemies[ei];
        if (en.hp <= 0) continue;
        var dd = U.dist(pl.x, pl.y, en.x, en.y);
        if (dd < bestD) { bestD = dd; best = en; }
      }
      var aimA = best ? U.angleTo(pl.x, pl.y, best.x, best.y) : (pl.facing === 1 ? 0 : Math.PI);
      pl.swingA = aimA; pl.swingT = 0.18; pl.atkCd = 0.45 / (pl.atkRate * w.rate);
      G.ev("swing");
      for (var hi = 0; hi < G.enemies.length; hi++) {
        var he = G.enemies[hi];
        if (he.hp <= 0) continue;
        var hd = U.dist(pl.x, pl.y, he.x, he.y);
        if (hd > w.range + he.r) continue;
        var ha = U.angleTo(pl.x, pl.y, he.x, he.y);
        var da = Math.abs(angDiff(ha, aimA));
        if (da < 1.1) {
          damageEnemy(G, he, playerDmg(G), Math.cos(ha) * 160, Math.sin(ha) * 160);
        }
      }
      if (G.state !== "play") return; // thorns may have ended things
    }

    // --- enemies ---
    for (var i = G.enemies.length - 1; i >= 0; i--) {
      var e = G.enemies[i];
      if (e.hp <= 0 || !isFinite(e.x + e.y)) { G.enemies.splice(i, 1); continue; }
      updateEnemy(G, e, dt);
      if (G.state !== "play") return;
    }

    // --- projectiles ---
    for (var pi = G.projs.length - 1; pi >= 0; pi--) {
      var pr = G.projs[pi];
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
      var dead = pr.life <= 0;
      var ptx = Math.floor(pr.x / TILE), pty = Math.floor(pr.y / TILE);
      if (!D.isFloor(d, ptx, pty)) dead = true;
      if (!dead && pr.enemy) {
        if (U.dist(pr.x, pr.y, pl.x, pl.y) < pr.r + pl.r) {
          hurtPlayer(G, pr.dmg, pr.x - pr.vx, pr.y - pr.vy, null);
          dead = true;
          if (G.state !== "play") return;
        }
      }
      if (dead) G.projs.splice(pi, 1);
    }

    // --- pickups (magnet) ---
    for (var ki = G.pickups.length - 1; ki >= 0; ki--) {
      var pk = G.pickups[ki];
      pk.t += dt;
      var pd = U.dist(pk.x, pk.y, pl.x, pl.y);
      if (pd < pl.magnet) {
        var pa = U.angleTo(pk.x, pk.y, pl.x, pl.y);
        pk.x += Math.cos(pa) * 260 * dt; pk.y += Math.sin(pa) * 260 * dt;
      }
      if (pd < 20) { applyPickup(G, pk); G.pickups.splice(ki, 1); }
      if (G.state !== "play") return;
    }

    // --- chests ---
    for (var ci = 0; ci < G.chests.length; ci++) {
      var ch = G.chests[ci];
      if (!ch.opened && U.dist(ch.x, ch.y, pl.x, pl.y) < 30) {
        ch.opened = true; G.chestsOpened++;
        chestLoot(G, ch);
      }
    }

    // --- NPC ---
    if (G.npc && !G.talkedMaren && U.dist(G.npc.x, G.npc.y, pl.x, pl.y) < 56) {
      G.talkedMaren = true;
      G.dialogue = [
        { who: "Old Maren", text: "Ash! You actually came down. Brave or boiled, I can't tell." },
        { who: "Old Maren", text: "Listen: swing with SPACE. Walk into chests to open them. Stairs go down." },
        { who: "Old Maren", text: "Take my old lantern — it drinks the dark. And come back alive, you hear?" }
      ];
      G.state = "dialogue";
      G.afterDialogue = function () {
        var pl2 = G.player;
        if (!hasCharm(pl2, "lantern")) {
          pl2.charms.push(CHARMS[4]);
          pl2.light += 90; pl2.magnet += 46;
          addFloater(G, pl2.x, pl2.y - 24, "Old Lantern!", "#c39bd3");
        }
        G.state = "play";
      };
      return;
    }

    // --- stairs ---
    if (G.stairs.open && U.dist(G.stairs.x, G.stairs.y, pl.x, pl.y) < 26) {
      G.ev("stairs");
      if (G.floor >= FLOORS) return; // safety; floor 10 has no stairs
      setupFloor(G, G.floor + 1);
      return;
    }

    // --- particles / floaters ---
    for (var fi = G.floaters.length - 1; fi >= 0; fi--) {
      var fl = G.floaters[fi];
      fl.t += dt; fl.y -= 34 * dt;
      if (fl.t > 1.1) G.floaters.splice(fi, 1);
    }
    for (var qi = G.particles.length - 1; qi >= 0; qi--) {
      var pt = G.particles[qi];
      pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= Math.pow(0.05, dt); pt.vy *= Math.pow(0.05, dt);
      if (pt.t > pt.life) G.particles.splice(qi, 1);
    }

    // camera
    var vw = 960, vh = 640;
    G.cam.x = U.clamp(pl.x - vw / 2, 0, Math.max(0, d.W * TILE - vw));
    G.cam.y = U.clamp(pl.y - vh / 2, 0, Math.max(0, d.H * TILE - vh));
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);
  }

  function angDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function useHeal(G) {
    var pl = G.player;
    if (pl.healPot <= 0 || pl.healCd > 0 || pl.hp >= pl.maxhp) return;
    pl.healPot--; pl.healCd = 2;
    pl.hp = Math.min(pl.maxhp, pl.hp + pl.maxhp * 0.45);
    addFloater(G, pl.x, pl.y - 24, "+" + Math.round(pl.maxhp * 0.45), "#46c46a");
    burst(G, pl.x, pl.y, "#46c46a", 10);
    G.ev("heart");
  }

  function useBomb(G) {
    var pl = G.player;
    if (pl.bombPot <= 0 || G.state !== "play") return;
    pl.bombPot--;
    G.ev("shoot"); G.shake = 8;
    burst(G, pl.x, pl.y, "#ff8c2e", 24);
    for (var i = G.enemies.length - 1; i >= 0; i--) {
      var e = G.enemies[i];
      if (e.hp > 0 && U.dist(pl.x, pl.y, e.x, e.y) < 110 + e.r) {
        var a = U.angleTo(pl.x, pl.y, e.x, e.y);
        damageEnemy(G, e, 70 + 15 * G.floor, Math.cos(a) * 260, Math.sin(a) * 260);
      }
    }
  }

  // ---------------- debug scenes (screenshots) ----------------
  function debugStage(G, name) {
    if (name === "combat") {
      if (G.floor !== 1) setupFloor(G, 1);
      G.state = "play";
      var pl = G.player;
      var spots = [[120, 0], [-110, 60], [40, -130]];
      ["rat", "imp", "slime"].forEach(function (t, i) {
        var e = spawnEnemy(G, t, pl.x + spots[i][0], pl.y + spots[i][1], false);
        e.hp = Math.max(1, e.hp - 10);
      });
      pl.hp = 72;
      burst(G, pl.x + 60, pl.y - 20, "#ff8c2e", 12);
      addFloater(G, pl.x + 60, pl.y - 50, "24", "#fff");
    } else if (name === "boss") {
      setupFloor(G, 10);
      G.state = "play";
      var k = G.boss;
      k.state = "fight"; G.bossActive = true;
      k.hp = k.maxhp * 0.55;
      G.player.x = k.x; G.player.y = k.y + 260;
      G.player.hp = 80;
      banner(G, k.name.toUpperCase(), k.taunts[2]);
    }
  }

  g.EmberGame = {
    create: create, startRun: startRun, setupFloor: setupFloor, update: update,
    chooseUpgrade: chooseUpgrade, useHeal: useHeal, useBomb: useBomb,
    debugStage: debugStage, makeStats: makeStats,
    FLOORS: FLOORS, WEAPONS: WEAPONS, CHARMS: CHARMS, ENDINGS: ENDINGS, BOSSES: BOSSES,
    ENEMIES: ENEMIES, LEVEL_POOL: LEVEL_POOL
  };
})(typeof window !== "undefined" ? window : globalThis);
