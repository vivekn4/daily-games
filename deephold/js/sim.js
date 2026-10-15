/* DEEPHOLD — sim: pure game logic, zero DOM. UMD (browser + Node).
   Implements DESIGN.md (game designer spec): 6 tower families with designer
   stats/costs/overcharges, 5 enemy families + elites + 3 bosses, armor vs
   energy damage types, thermal-cell economy, power rerouting, manual mines,
   Pressure Core banking, AI director, seeded generation (mulberry32).
   Combat is deterministic: no RNG inside stepCombat; wave tables derive from
   dedicated RNG streams so the same seed replays identically. */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    var path = require("path");
    var U = require(path.join(__dirname, "util.js"));
    module.exports = factory(U);
  } else {
    root.DeepSim = factory(root.DeepUtil);
  }
})(typeof self !== "undefined" ? self : this, function (U) {
  "use strict";

  var VW = 960, VH = 640, CELL = 60; // DESIGN.md §3: 1 cell = 60px
  var HULL_Y = 150, CORE = { x: 480, y: 108 };
  var WAVES = 30;

  // ---------------- tower definitions (DESIGN.md §5) ----------------
  // dmgType: 'physical' (reduced by armor) | 'energy' (ignores armor)
  // NOTE (programmer balance pass, DESIGN.md §5): designer T1/T2 damage values
  // could not kill armored enemies within lane walk-time (e.g. Harpoon 8dmg vs
  // Mauler armor 4 = 4dmg/hit = 35s to kill a 140HP Mauler; autopilot gate
  // failed). T1/T2 damage raised ~50%, armor values trimmed; T3/costs/rates/
  // overcharges unchanged. Mechanics (armor vs energy) fully preserved.
  var TOWER_DEFS = {
    harpoon: { name: "Harpoon Gun", cost: 50, hp: 40, kind: "dps", dmgType: "physical",
      desc: "Single-target physical DPS.",
      tiers: [
        { dmg: 12, rate: 1.0, range: 210, targets: 1 },
        { cost: 40, dmg: 22, rate: 1.2, range: 210, targets: 1 },
        { A: { cost: 90, name: "Ballista", dmg: 40, rate: 1.4, range: 210, targets: 2 },
          B: { cost: 90, name: "Longshot", dmg: 90, rate: 0.7, range: 300, targets: 1, crit: 0.2 } }
      ],
      over: { name: "Rapid Loose", cd: 25, dur: 6, desc: "3x fire rate, 6s" } },
    flak: { name: "Flak Turret", cost: 70, hp: 40, kind: "dps", dmgType: "physical",
      desc: "Explosive physical AoE.",
      tiers: [
        { dmg: 9, rate: 0.8, range: 150, aoe: 60 },
        { cost: 60, dmg: 16, rate: 0.9, range: 150, aoe: 72 },
        { A: { cost: 120, name: "Depth Charge", dmg: 30, rate: 0.8, range: 150, aoe: 108, slow: { amt: 0.20, dur: 2 } },
          B: { cost: 120, name: "Shrapnel", dmg: 18, rate: 1.6, range: 150, aoe: 90, fragments: 3 } }
      ],
      over: { name: "Broadside", cd: 30, dur: 5, desc: "5x blast radius, 5s" } },
    tesla: { name: "Tesla Coil", cost: 80, hp: 40, kind: "dps", dmgType: "energy",
      desc: "Energy chain lightning + slow. Ignores armor.",
      tiers: [
        { dmg: 8, rate: 1.0, range: 180, chain: 3, slow: { amt: 0.30, dur: 1.5 } },
        { cost: 70, dmg: 14, rate: 1.0, range: 180, chain: 4, slow: { amt: 0.40, dur: 1.5 } },
        { A: { cost: 130, name: "Storm Lattice", dmg: 16, rate: 1.0, range: 180, chain: 6, slow: { amt: 0.50, dur: 2 } },
          B: { cost: 130, name: "Stasis Arc", dmg: 8, rate: 1.0, range: 180, chain: 3, slow: { amt: 0.70, dur: 3 }, stasisMark: 0.25 } }
      ],
      over: { name: "Surge", cd: 28, dur: 6, desc: "2x chain range, 2x damage, 6s" } },
    sonar: { name: "Sonar Array", cost: 60, hp: 40, kind: "support", dmgType: "energy",
      desc: "Reveals Lurkers, Marks targets (+damage taken), sonar pulse.",
      tiers: [
        { reveal: 240, marked: 0.20, pulse: 2 },
        { cost: 50, reveal: 300, marked: 0.30, pulse: 2 },
        { A: { cost: 110, name: "Trench Horn", reveal: 300, marked: 0.50, pulse: 8 },
          B: { cost: 110, name: "Ghost Net", reveal: 9999, marked: 0.30, pulse: 2, ghostSlow: 0.60 } }
      ],
      over: { name: "Deep Ping", cd: 35, dur: 8, desc: "Map-wide reveal + Marked 60%, 8s" } },
    mining: { name: "Mining Rig", cost: 60, hp: 40, kind: "support",
      desc: "Boosts cell drops; richer vent harvests.",
      tiers: [
        { dropBonus: 0.40, radius: 180, ventBonus: 2 },
        { cost: 50, dropBonus: 0.70, radius: 210, ventBonus: 2 },
        { A: { cost: 100, name: "Thermal Siphon", dropBonus: 1.20, radius: 240, ventBonus: 2, waveBonus: 3 },
          B: { cost: 100, name: "Vent Tapper", dropBonus: 0.70, radius: 240, ventBonus: 4, doubleHarvest: true } }
      ],
      over: { name: "Strike Pay", cd: 40, dur: 15, desc: "Kills drop 3x cells, 15s" } },
    sealer: { name: "Breach Sealer", cost: 50, hp: 60, kind: "support",
      desc: "Passively repairs hull. Always on.",
      tiers: [
        { repair: 1 / 6 },
        { cost: 40, repair: 1 / 4 },
        { A: { cost: 90, name: "Hull Weave", repair: 1 / 2.5 },
          B: { cost: 90, name: "Bulkhead", repair: 1 / 4, maxHull: 25 } }
      ],
      over: { name: "Emergency Weld", cd: 45, dur: 0, desc: "+10 hull instantly" } }
  };
  var FAM_ORDER = ["harpoon", "flak", "tesla", "sonar", "mining", "sealer"];

  // ---------------- enemies (DESIGN.md §4.1; speeds in px/s = cells/s * 60) ----------------
  // Armor trimmed in the same balance pass (see TOWER_DEFS note): the
  // armor/energy distinction is preserved, but values now allow T1/T2
  // towers to kill armored enemies within lane walk-time.
  var ENEMY_DEFS = {
    drifter: { name: "Drifter", hp: 30, speed: 72, armor: 0, hull: 2, cells: 4, cost: 1, glow: "#39e6ff" },
    lurker:  { name: "Lurker", hp: 60, speed: 60, armor: 0, hull: 4, cells: 7, cost: 2, glow: "#c07dff", stealth: true },
    spitter: { name: "Spitter", hp: 70, speed: 48, armor: 0, hull: 3, cells: 8, cost: 2, glow: "#7dff6a", ranged: true },
    mauler:  { name: "Mauler", hp: 140, speed: 36, armor: 3, hull: 6, cells: 10, cost: 3, glow: "#ff9a3c" },
    crab:    { name: "Siege Crab", hp: 220, speed: 27, armor: 1, hull: 10, cells: 14, cost: 5, glow: "#ff4d5e", siege: true }
  };

  var BOSS_DEFS = {
    10: { fam: "maw", name: "The Maw", hp: 2500, speed: 21, armor: 2, hull: 25, cells: 150, glow: "#ff4d5e",
          devour: { radius: 70, every: 8 }, spawner: { fam: "drifter", every: 20, n: 6 } },
    20: { fam: "dredge", name: "The Dredge", hp: 6000, speed: 18, armor: 6, hull: 25, cells: 250, glow: "#ff9a3c",
          slam: { radius: 120, dmg: 20, every: 15 }, spawner: { fam: "mauler", every: 25, n: 4 } },
    30: { fam: "heart", name: "Heart of the Trench", hp: 12000, speed: 15, armor: 0, hull: 40, cells: 400, glow: "#ff2d78",
          phases: [1.0, 0.66, 0.33], spawner: { fam: "mixed", every: 10, n: 2 } }
  };

  // ---------------- tech tree (DESIGN.md §12 referenced; full list) ----------------
  // Techs granted only by the wave-25 allegiance choice — never in random offers.
  var ALLEGIANCE_TECHS = ["harmonic-array", "moonpool-beacon", "rationed-pressure"];
  var TECH_DEFS = [
    { id: "overclock",   name: "Overclocked Winches", desc: "Towers fire 10% faster." },
    { id: "hullweave",   name: "Hull Weave",          desc: "+20 max hull integrity." },
    { id: "magnets",     name: "Cell Magnets",        desc: "+15% cell drops." },
    { id: "sonarnet",    name: "Sonar Net",           desc: "Sonar reveal radius +25%." },
    { id: "venttap",     name: "Vent Tapping",        desc: "Vents hold +2 cells per harvest." },
    { id: "rapidoc",     name: "Rapid Overcharge",    desc: "Overcharge cooldowns -20%." },
    { id: "reinforced",  name: "Reinforced Pads",     desc: "Towers +40 HP." },
    { id: "demolitions", name: "Demolitions",         desc: "Unlocks mines: 40 TC, manual detonation." },
    { id: "powergrid",   name: "Power Grid",          desc: "Overdrive sector +45% damage (was +30%)." },
    { id: "abyssal",     name: "Abyssal Rounds",      desc: "+25% damage vs armored enemies." },
    { id: "sealant",     name: "Emergency Sealant",   desc: "Start each wave at +6 hull." },
    { id: "coretaps",    name: "Core Taps",           desc: "Core buffs are 50% stronger." },
    { id: "longbarrel",  name: "Long Barrels",        desc: "Tower range +15%." },
    { id: "harmonic-array", name: "Harmonic Array",   desc: "Allegiance tech: all enemies revealed; lurkers slowed 25%." },
    { id: "moonpool-beacon", name: "Moon-Pool Beacon", desc: "Allegiance tech: +50% cell yield from kills." },
    { id: "rationed-pressure", name: "Rationed Pressure", desc: "Allegiance tech: +20% hull repair; overcharges cool 15% faster." }
  ];

  // ---------------- map generation ----------------
  function genMap(seed) {
    var rng = U.mulberry32((seed ^ 0x9e3779b9) >>> 0);
    var nLanes = 2 + (rng() < 0.55 ? 1 : 0);
    var lanes = [];
    for (var i = 0; i < nLanes; i++) {
      var baseX = 480 + (i - (nLanes - 1) / 2) * 235;
      var w1 = (rng() - 0.5) * 90, w2 = (rng() - 0.5) * 110, w3 = (rng() - 0.5) * 70;
      var topX = U.lerp(baseX, 480, 0.55);
      var pts = [
        { x: baseX + w1 * 0.4, y: 672 },
        { x: baseX + w1, y: 540 },
        { x: baseX + w2, y: 400 },
        { x: baseX + w3, y: 268 },
        { x: topX, y: HULL_Y + 22 }
      ];
      lanes.push({ pts: pts, len: pathLen(pts), junctions: [] });
    }
    for (var li = 0; li < nLanes; li++) {
      for (var w = 2; w <= 3; w++) {
        if (rng() < 0.45 && nLanes > 1) {
          var to = li + (rng() < 0.5 ? -1 : 1);
          if (to < 0) to = 1; if (to >= nLanes) to = nLanes - 2;
          if (to !== li) lanes[li].junctions.push({ at: w, to: to, chance: 0.5 });
        }
      }
    }
    var cand = [];
    var xs = [150, 305, 480, 655, 810], ys = [218, 305, 392, 479];
    for (var r = 0; r < ys.length; r++) for (var c = 0; c < xs.length; c++)
      cand.push({ x: xs[c] + (U.clamp(r * 37 + c * 13, 0, 40) - 20), y: ys[r] });
    U.shuffle(rng, cand);
    var pads = cand.slice(0, 13 + (rng() < 0.5 ? 1 : 0)).map(function (p) {
      return { x: p.x, y: p.y, sector: p.x < 340 ? "west" : (p.x < 620 ? "central" : "east"), tower: null, mine: null };
    });
    var nVents = 6 + ((rng() * 4) | 0); // 6–9 vents (§6)
    var vents = [];
    for (var v = 0; v < nVents; v++)
      vents.push({ x: 90 + rng() * 780, y: 560 + rng() * 55, harvested: 0 });
    return { lanes: lanes, pads: pads, vents: vents };
  }

  function pathLen(pts) {
    var L = 0;
    for (var i = 1; i < pts.length; i++) L += U.dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    return L;
  }
  function posAt(lane, d) {
    var pts = lane.pts, rem = U.clamp(d, 0, lane.len);
    for (var i = 1; i < pts.length; i++) {
      var sl = U.dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      if (rem <= sl) {
        var t = sl === 0 ? 0 : rem / sl;
        return { x: U.lerp(pts[i - 1].x, pts[i].x, t), y: U.lerp(pts[i - 1].y, pts[i].y, t), seg: i };
      }
      rem -= sl;
    }
    var l = pts[pts.length - 1];
    return { x: l.x, y: l.y, seg: pts.length - 1 };
  }

  // ---------------- state ----------------
  function create(seed) {
    seed = seed >>> 0;
    var map = genMap(seed);
    var S = {
      v: 1, seed: seed, map: map,
      phase: "prep",
      wave: 0,
      hull: 100, maxHull: 100, cells: 120, // §6: start 120 TC
      coreCharge: 0, coreRemainder: 0,     // §7: 100 TC banked = 1 charge
      coreRof: 0, coreYield: 0, coreRepair: 0,
      tech: [], techOffer: [],
      overdrive: null,                     // §7.2: 'west'|'central'|'east'|null
      powerCD: 0, surgeT: 0, surgeCD: 0,
      deepPingT: 0, strikeT: 0,            // sonar/mining overcharge timers
      towers: [],
      enemies: [], mines: [],
      strikes: [],                         // Heart P3 telegraphed strikes
      elapsed: 0, spawnQueue: [],
      liveCap: 120, backlog: [],            // §4: spawner pauses at cap
      tracers: [], rings: [],
      director: { leakHist: [], armorAdd: 0, speedMul: 1, dmgMul: 1, swarmMul: 1, siegeAdd: 0, cellBonus: 0, note: [] },
      story: { sided: null, beatsSeen: [], tut: 0 },
      stats: { kills: 0, cellsEarned: 0, overcharges: 0, wavesWon: 0, leaksTotal: 0, towersLost: 0 },
      bus: new U.Bus(),
      nextId: 1,
      ended: null
    };
    map.pads.forEach(function (p) { p.tower = null; p.mine = null; });
    return S;
  }

  // ---------------- director (brief's quality ratchet) ----------------
  function directorFor(S, wave) {
    var hist = S.director.leakHist;
    var leak = hist.length ? hist[hist.length - 1] : 0;
    var d = { armorAdd: 0, speedMul: 1, dmgMul: 1, swarmMul: 1, siegeAdd: 0, cellBonus: 0, note: [] };
    if (wave > 1) {
      if (leak >= 15) {
        d.armorAdd = 2; d.siegeAdd = 2; d.dmgMul = 1.1;
        d.note.push("HEAVY ARMOR — siege specialists inbound");
      } else if (leak >= 5) {
        d.speedMul = 1.12; d.dmgMul = 1.05;
        d.note.push("FASTER SWARMS — they learned the lanes");
      } else {
        d.swarmMul = 1.4; d.speedMul = 1.18; d.cellBonus = 0.20; d.siegeAdd = 1;
        d.note.push("CLEAN HOLD — bonus cells, but faster, angrier drifters");
      }
      if (wave >= 12) d.armorAdd += 1;
      if (wave >= 22) { d.speedMul *= 1.08; d.dmgMul *= 1.1; }
    }
    return d;
  }

  // ---------------- wave generation (seeded, replay-safe) ----------------
  function genWave(S, wave) {
    var rng = U.mulberry32((S.seed ^ Math.imul(wave, 7919)) >>> 0);
    var dir = directorFor(S, wave);
    var isBoss = !!BOSS_DEFS[wave];
    var budget = Math.round((8 + 3.2 * wave) * (isBoss ? 0.5 : 1));
    var weights = [[10 * dir.swarmMul, "drifter"]];
    if (wave >= 2) weights.push([5, "mauler"]);
    if (wave >= 3) weights.push([4, "spitter"]);
    if (wave >= 4) weights.push([4, "lurker"]);
    if (wave >= 5) weights.push([3 + dir.siegeAdd * 2, "crab"]);
    var comp = [];
    var b = budget, guard = 600;
    while (b > 0 && guard-- > 0) {
      var fam = U.weightedPick(rng, weights);
      var cost = ENEMY_DEFS[fam].cost;
      if (cost > b && fam !== "drifter") { fam = "drifter"; cost = 1; }
      comp.push(fam); b -= cost;
    }
    var elites = wave >= 6 ? Math.min(2 + ((wave / 5) | 0), 6) : 0;
    var eliteIdx = {};
    for (var e = 0; e < elites && comp.length; e++) eliteIdx[(rng() * comp.length) | 0] = true;
    // spawn groups 0.6–1.2s apart (seeded jitter), multi-lane from wave 4+
    var groups = [];
    var per = Math.max(2, Math.round(comp.length / 9));
    var t = 2, multi = wave >= 4;
    for (var i = 0; i < comp.length; i += per) {
      var units = comp.slice(i, i + per).map(function (f, k) {
        return { fam: f, elite: !!eliteIdx[i + k],
                 lane: multi ? (rng() * S.map.lanes.length) | 0 : (i / per) % S.map.lanes.length | 0 };
      });
      groups.push({ t: t, units: units });
      t += 0.6 + rng() * 0.6;
    }
    var boss = null;
    if (isBoss) {
      boss = { at: 6, lane: (S.map.lanes.length / 2) | 0 };
      groups.push({ t: 6, units: [{ fam: "__boss__", elite: false, lane: boss.lane }] });
      groups.sort(function (a, b) { return a.t - b.t; });
    }
    return { wave: wave, dir: dir, budget: budget, groups: groups, boss: boss, comp: comp };
  }

  function hpScale(wave) { return 1 + 0.065 * (wave - 1); } // §10 scaling (designer §10 was cut; documented here)

  function spawnEnemy(S, fam, elite, laneIdx, waveDef) {
    var id = S.nextId++;
    var dir = waveDef.dir, hs = hpScale(S.wave);
    var e;
    if (fam === "__boss__") {
      var bd = BOSS_DEFS[S.wave];
      e = { id: id, fam: bd.fam, name: bd.name, boss: true, glow: bd.glow,
        hp: bd.hp, maxHp: bd.hp, speed: bd.speed, armor: bd.armor, hull: bd.hull,
        cells: bd.cells, lane: laneIdx, dist: -30, mode: "walk",
        devour: bd.devour || null, devourT: 0,
        slam: bd.slam || null, slamT: 0,
        spawner: bd.spawner || null, spawnT: 0,
        phases: bd.phases || null, phase: 0, strikeT: 0,
        slowT: 0, slowAmt: 0, stunT: 0, revealedT: 0, elite: false };
    } else {
      var d = ENEMY_DEFS[fam];
      var isElite = !!elite;
      e = { id: id, fam: fam, name: d.name, boss: false, glow: d.glow,
        hp: d.hp * hs * (isElite ? 2.2 : 1),
        speed: d.speed * dir.speedMul * (isElite ? 1.1 : 1),
        armor: d.armor + dir.armorAdd,
        hull: d.hull * (isElite ? 2 : 1) * dir.dmgMul,
        cells: Math.round(d.cells * (isElite ? 2.5 : 1) * (1 + dir.cellBonus)),
        lane: laneIdx, dist: -20 - (id % 7) * 14, mode: "walk",
        stealth: !!d.stealth, ranged: !!d.ranged, siege: !!d.siege,
        slowT: 0, slowAmt: 0, stunT: 0, revealedT: 0, stasisT: 0,
        elite: isElite, atkT: 0 };
    }
    e.maxHp = e.hp;
    var p = posAt(S.map.lanes[e.lane], 0);
    e.x = p.x; e.y = p.y + 40;
    S.enemies.push(e);
    if (e.boss) S.bus.emit("bossSpawn", { name: e.name });
    return e;
  }

  // ---------------- combat ----------------
  function startCombat(S) {
    if (S.phase !== "prep") return false;
    S.wave += 1;
    var wd = genWave(S, S.wave);
    S.waveDef = wd;
    S.spawnQueue = wd.groups.slice();
    S.backlog = [];
    S.elapsed = 0;
    S.enemies = [];
    S.strikes = [];
    S.phase = "combat";
    S.leakStart = S.hull;
    if (S.tech.indexOf("sealant") >= 0) S.hull = Math.min(S.maxHull, S.hull + 6);
    S.bus.emit("waveStart", { wave: S.wave, boss: wd.boss });
    return true;
  }

  function enterPrep(S) {
    S.phase = "prep";
    S.enemies = []; S.spawnQueue = []; S.backlog = []; S.elapsed = 0;
    S.tracers = []; S.rings = []; S.strikes = [];
    S.towers.forEach(function (t) { t.hp = t.maxHp; t.overT = 0; });
    // unused mines refund 50% (§7.3)
    S.map.pads.forEach(function (p) {
      if (p.mine) { S.cells += 20; p.mine = null; }
    });
    S.mines = [];
    S.surgeT = 0; S.deepPingT = 0; S.strikeT = 0;
    S.overdrive = null; S.powerCD = 0;
    // Thermal Siphon passive (§5.5)
    S.towers.forEach(function (t) {
      if (t.fam === "mining" && t.tier === 3 && t.branch === "A") {
        var st = towerStatsRaw(t);
        if (st.waveBonus) { S.cells += st.waveBonus; S.stats.cellsEarned += st.waveBonus; }
      }
    });
    S.map.vents.forEach(function (v) { v.harvested = 0; });
    S.ventsHarvested = 0;
    var rng = U.mulberry32((S.seed ^ Math.imul(S.wave + 1, 104729) ^ 0x51ab) >>> 0);
    var remaining = TECH_DEFS.filter(function (t) {
      return S.tech.indexOf(t.id) < 0 && ALLEGIANCE_TECHS.indexOf(t.id) < 0; // allegiance-only
    });
    U.shuffle(rng, remaining);
    S.techOffer = remaining.slice(0, 3).map(function (t) { return t.id; });
    S.bus.emit("prep", { wave: S.wave + 1 });
  }

  function towerStatsRaw(t) {
    var def = TOWER_DEFS[t.fam];
    var st = def.tiers[t.tier - 1];
    return t.tier === 3 ? st[t.branch] : st;
  }

  function towerStats(S, t) {
    var def = TOWER_DEFS[t.fam];
    var st = towerStatsRaw(t);
    var out = {};
    for (var k in st) out[k] = st[k];
    var rateMul = 1 + (S.tech.indexOf("overclock") >= 0 ? 0.10 : 0) + S.coreRof;
    if (S.tech.indexOf("coretaps") >= 0) rateMul += S.coreRof * 0.5; // +50% stronger
    if (t.overT > 0 && t.fam === "harpoon") rateMul *= 3;   // Rapid Loose
    if (S.surgeT > 0) rateMul *= 1.5;
    if (out.rate) out.rate *= rateMul;
    // §7.2 power rerouting: overdrive sector +30% (powergrid: +45%), others 85%
    var od = S.overdrive;
    var odMul = !od ? 1.0 : (t.sector === od ?
      (S.tech.indexOf("powergrid") >= 0 ? 1.45 : 1.30) : 0.85);
    if (out.dmg) out.dmg *= odMul;
    if (out.pulse) out.pulse *= odMul;
    if (out.range) {
      if (S.tech.indexOf("longbarrel") >= 0) out.range *= 1.15;
      if (t.fam === "tesla" && t.overT > 0) out.chainRangeMul = 2; // Surge
    }
    if (out.reveal && S.tech.indexOf("sonarnet") >= 0) out.reveal *= 1.25;
    if (t.overT > 0 && t.fam === "flak") out.aoe = (out.aoe || 60) * 5; // Broadside
    if (t.overT > 0 && t.fam === "tesla") out.dmg = (out.dmg || 0) * 2; // Surge
    return out;
  }

  // §6: cell drops with mining-rig bonuses (cap +300%), magnets, core, Strike Pay
  function cellGain(S, base, tx, ty) {
    var bonus = 0;
    S.towers.forEach(function (t) {
      if (t.fam !== "mining") return;
      var st = towerStats(S, t);
      if (st.dropBonus && U.dist(t.x, t.y, tx, ty) < (st.radius || 180))
        bonus += st.dropBonus;
    });
    bonus = Math.min(bonus, 3.0); // §5.5 cap
    var mult = 1 + bonus + (S.tech.indexOf("magnets") >= 0 ? 0.15 : 0) +
      (S.tech.indexOf("moonpool-beacon") >= 0 ? 0.5 : 0) + S.coreYield;
    if (S.tech.indexOf("coretaps") >= 0) mult += S.coreYield * 0.5;
    var g = Math.max(1, Math.round(base * mult));
    if (S.strikeT > 0) g *= 3; // Strike Pay
    S.cells += g; S.stats.cellsEarned += g;
    return g;
  }

  // dmgType: 'physical' (armor applies) | 'energy' (ignores armor). §4.1/§5
  function damageEnemy(S, e, raw, dmgType, src) {
    if (e.hp <= 0) return;
    var abyssal = S.tech.indexOf("abyssal") >= 0 && e.armor > 0 ? 1.25 : 1;
    var marked = 0;
    S.towers.forEach(function (t) {
      if (t.fam !== "sonar") return;
      var st = towerStats(S, t);
      var ghostNet = (t.tier === 3 && t.branch === "B");
      if (ghostNet || U.dist(t.x, t.y, e.x, e.y) < (st.reveal || 240))
        marked = Math.max(marked, st.marked || 0);
    });
    if (S.deepPingT > 0) marked = Math.max(marked, 0.60);
    if (e.stasisT > 0) raw *= 1.25; // Stasis Arc
    var arm = (dmgType === "energy") ? 0 : e.armor;
    var dmg = Math.max(1, raw * abyssal * (1 + marked) - arm);
    // mines vs bosses: capped at 15% of boss max HP per detonation (§4.2)
    if (src === "mine" && e.boss) dmg = Math.min(dmg, e.maxHp * 0.15);
    e.hp -= dmg;
    e.revealedT = Math.max(e.revealedT, 1.5);
    if (e.hp <= 0) killEnemy(S, e);
  }

  function killEnemy(S, e) {
    var ix = S.enemies.indexOf(e);
    if (ix >= 0) S.enemies.splice(ix, 1);
    var g = cellGain(S, e.cells, e.x, e.y);
    S.stats.kills++;
    S.bus.emit("kill", { x: e.x, y: e.y, glow: e.glow, cells: g, boss: !!e.boss });
    if (e.boss) {
      S.bus.emit("bossDown", { name: e.name });
      if (S.wave === WAVES) { victory(S); return; }
    }
  }

  function hurtHull(S, amt, x, y) {
    if (S.ended) return;
    S.hull -= amt;
    S.stats.leaksTotal += amt;
    S.bus.emit("leak", { amt: amt, hull: S.hull, x: x, y: y });
    if (S.hull <= 0) { S.hull = 0; defeat(S); }
  }

  function defeat(S) {
    if (S.ended) return;
    S.ended = "defeat"; S.phase = "ended";
    S.bus.emit("gameover", { wave: S.wave });
  }
  function victory(S) {
    if (S.ended) return;
    S.ended = "victory"; S.phase = "ended";
    S.bus.emit("victory", { seed: S.seed });
  }

  // §4.1 stealth: invisible unless revealed; shimmer within 1 cell of a tower
  function isRevealed(S, e) {
    if (!e.stealth) return true;
    if (S.tech.indexOf("harmonic-array") >= 0) return true;
    if (e.revealedT > 0 || S.deepPingT > 0) return true;
    for (var i = 0; i < S.towers.length; i++) {
      var t = S.towers[i];
      if (t.fam === "sonar") {
        var st = towerStats(S, t);
        if (U.dist(t.x, t.y, e.x, e.y) < (st.reveal || 240)) return true;
      } else if (U.dist(t.x, t.y, e.x, e.y) < CELL) return true; // shimmer fallback
    }
    // Ghost Net: map-wide reveal handled by caller via marked loop; slow applied in step
    return false;
  }

  function nearestEnemies(S, x, y, range, n, opts) {
    opts = opts || {};
    var out = [];
    for (var i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      if (e.hp <= 0) continue;
      if (!opts.includeHidden && !isRevealed(S, e)) continue;
      var d = U.dist(x, y, e.x, e.y);
      if (d <= range) out.push({ e: e, d: d });
    }
    var mode = opts.mode || "first";
    out.sort(function (a, b) {
      if (mode === "strong") return (b.e.hp - a.e.hp) || (a.e.id - b.e.id);
      var da = U.dist(a.e.x, a.e.y, CORE.x, CORE.y), db = U.dist(b.e.x, b.e.y, CORE.x, CORE.y);
      return da - db || a.e.id - b.e.id;
    });
    return out.slice(0, n || 1).map(function (o) { return o.e; });
  }

  function fireTower(S, t, dt) {
    var st = towerStats(S, t);
    var def = TOWER_DEFS[t.fam];
    t.cd -= dt;
    if (t.cd > 0) return;
    if (t.fam === "sonar" || t.fam === "mining" || t.fam === "sealer") { t.cd = 0.5; return; }
    var targets = nearestEnemies(S, t.x, t.y, st.range, st.targets || 1, { mode: t.targetMode });
    if (!targets.length) { t.cd = 0.1; return; }
    t.cd = 1 / (st.rate || 1);
    var chainR = 130 * (st.chainRangeMul || 1);
    targets.forEach(function (e) {
      var ex = e.x, ey = e.y;
      S.tracers.push({ x1: t.x, y1: t.y - 10, x2: ex, y2: ey, color: def.dmgType === "energy" ? "#9df2ff" : "#ffd75e", life: 0.12 });
      if (st.aoe) {
        var aoe = st.aoe;
        S.rings.push({ x: ex, y: ey, r: 8, max: aoe, color: "#ffb14d", life: 0.35 });
        S.enemies.slice().forEach(function (o) {
          if (o.hp > 0 && U.dist(ex, ey, o.x, o.y) <= aoe) {
            damageEnemy(S, o, st.dmg, def.dmgType, t);
            applySlow(S, o, st, t);
            if (st.fragments) { // Shrapnel fragments
              for (var f = 0; f < st.fragments; f++) {
                var cand = S.enemies[(o.id + f * 7) % Math.max(1, S.enemies.length)];
                if (cand && cand.hp > 0 && U.dist(ex, ey, cand.x, cand.y) <= aoe)
                  damageEnemy(S, cand, st.dmg * 0.5, def.dmgType, t);
              }
            }
          }
        });
      } else if (st.chain) {
        var hit = [e];
        damageEnemy(S, e, st.dmg, def.dmgType, t);
        applySlow(S, e, st, t);
        var cx = ex, cy = ey;
        for (var c = 1; c < st.chain; c++) {
          var nx = nearestEnemies(S, cx, cy, chainR, 8, { mode: t.targetMode })
            .filter(function (o) { return hit.indexOf(o) < 0; })[0];
          if (!nx) break;
          S.tracers.push({ x1: cx, y1: cy, x2: nx.x, y2: nx.y, color: "#9df2ff", life: 0.12 });
          damageEnemy(S, nx, st.dmg, def.dmgType, t);
          applySlow(S, nx, st, t);
          hit.push(nx); cx = nx.x; cy = nx.y;
        }
      } else {
        var dmg = st.dmg;
        if (st.crit && ((e.id * 2654435761) >>> 0) / 4294967296 < st.crit) dmg *= 2; // Longshot crit (deterministic)
        damageEnemy(S, e, dmg, def.dmgType, t);
        applySlow(S, e, st, t);
      }
    });
    S.bus.emit("shot", { fam: t.fam, x: t.x, y: t.y });
  }

  function applySlow(S, e, st, t) {
    var amt = st.slow ? st.slow.amt : 0;
    if (e.boss) amt = Math.min(amt, 0.40); // §4.2: slow capped at 40% on bosses
    if (amt > 0) { e.slowT = st.slow.dur; e.slowAmt = Math.max(e.slowAmt, amt); }
    if (st.stasisMark) e.stasisT = 3;
  }

  function stepCombat(S, dt) {
    if (S.phase !== "combat" || S.ended) return;
    S.elapsed += dt;
    // spawn groups; §4: pause at 120 live cap, backlog drains
    while (S.spawnQueue.length && S.spawnQueue[0].t <= S.elapsed) {
      var g = S.spawnQueue.shift();
      g.units.forEach(function (u) {
        if (S.enemies.length >= S.liveCap) S.backlog.push(u);
        else spawnEnemy(S, u.fam, u.elite, u.lane, S.waveDef);
      });
    }
    if (S.backlog.length && S.enemies.length < S.liveCap) {
      var n = Math.min(S.backlog.length, S.liveCap - S.enemies.length);
      for (var bi = 0; bi < n; bi++) {
        var u = S.backlog.shift();
        spawnEnemy(S, u.fam, u.elite, u.lane, S.waveDef);
      }
    }
    // timers
    if (S.surgeT > 0) S.surgeT -= dt;
    if (S.surgeCD > 0) S.surgeCD -= dt;
    if (S.powerCD > 0) S.powerCD -= dt;
    if (S.deepPingT > 0) S.deepPingT -= dt;
    if (S.strikeT > 0) S.strikeT -= dt;
    S.towers.forEach(function (t) {
      if (t.overCD > 0) t.overCD -= dt * (S.tech.indexOf("rapidoc") >= 0 ? 1.25 : 1) *
        (S.tech.indexOf("rationed-pressure") >= 0 ? 1.15 : 1);
      if (t.overT > 0) t.overT -= dt;
    });
    // support passives: sealer repair (§5.6, always on) + core repair
    var repair = S.coreRepair;
    S.towers.forEach(function (t) {
      var st = towerStats(S, t);
      if (st.repair) repair += st.repair;
      if (t.fam === "sonar" && st.ghostSlow) { // Ghost Net: map-wide slow on revealed
        S.enemies.forEach(function (e) {
          if (e.stealth && isRevealed(S, e)) { e.slowT = Math.max(e.slowT, 0.5); e.slowAmt = Math.max(e.slowAmt, st.ghostSlow); }
        });
      }
    });
    if (S.tech.indexOf("coretaps") >= 0) repair += S.coreRepair * 0.5;
    if (S.tech.indexOf("rationed-pressure") >= 0) repair *= 1.2; // allegiance: +20% hull repair
    if (S.tech.indexOf("harmonic-array") >= 0) S.enemies.forEach(function (e) { // allegiance: lurkers hesitate
      if (e.stealth) { e.slowT = Math.max(e.slowT, 0.5); e.slowAmt = Math.max(e.slowAmt, 0.25); }
    });
    if (repair > 0 && S.hull < S.maxHull) S.hull = Math.min(S.maxHull, S.hull + repair * dt);
    // sonar pulse: energy dps to all in radius (§5.4)
    S.pulseAcc = (S.pulseAcc || 0) + dt;
    if (S.pulseAcc >= 1) {
      S.pulseAcc -= 1;
      S.towers.forEach(function (t) {
        if (t.fam !== "sonar") return;
        var st = towerStats(S, t);
        if (!st.pulse) return;
        S.enemies.slice().forEach(function (e) {
          var ghostNet = (t.tier === 3 && t.branch === "B");
          if (ghostNet || U.dist(t.x, t.y, e.x, e.y) < (st.reveal || 240))
            damageEnemy(S, e, st.pulse, "energy", t);
        });
      });
    }
    // telegraphed Heart strikes (§4.4)
    S.strikes.forEach(function (sk) {
      sk.t -= dt;
      if (sk.t <= 0 && !sk.done) {
        sk.done = true;
        var absorbed = S.towers.some(function (t) { return U.dist(t.x, t.y, sk.x, sk.y) <= 60; });
        if (absorbed) {
          S.towers.forEach(function (t) { if (U.dist(t.x, t.y, sk.x, sk.y) <= 60) damageTower(S, t, 10); });
          S.bus.emit("strikeAbsorbed", { x: sk.x, y: sk.y });
        } else {
          hurtHull(S, 8, sk.x, sk.y);
          S.bus.emit("strikeHit", { x: sk.x, y: sk.y });
        }
        S.rings.push({ x: sk.x, y: sk.y, r: 10, max: 120, color: "#ff2d78", life: 0.6 });
      }
    });
    S.strikes = S.strikes.filter(function (sk) { return !sk.done; });
    if (S.ended) return;
    // towers fire
    S.towers.forEach(function (t) { fireTower(S, t, dt); });
    if (S.ended) return;
    // enemies
    var laneArr = S.map.lanes;
    S.enemies.slice().forEach(function (e) {
      if (e.hp <= 0) return;
      if (e.slowT > 0) e.slowT -= dt; else e.slowAmt = 0;
      if (e.revealedT > 0) e.revealedT -= dt;
      if (e.stasisT > 0) e.stasisT -= dt;
      if (e.stunT > 0) { e.stunT -= dt; return; }
      // elite aura: +20% speed to allies within 2 cells (§4.1)
      var aura = 1;
      if (!e.elite) {
        for (var ai = 0; ai < S.enemies.length; ai++) {
          var al = S.enemies[ai];
          if (al.elite && al !== e && U.dist(al.x, al.y, e.x, e.y) <= 120) { aura = 1.2; break; }
        }
      }
      var sp = e.speed * (e.slowT > 0 ? (1 - e.slowAmt) : 1) * aura;
      // ---- boss specials ----
      if (e.boss && e.devour) { // The Maw devours adjacent towers
        e.devourT += dt;
        if (e.devourT >= e.devour.every) {
          e.devourT = 0;
          var victim = null, vd = 1e9;
          S.towers.forEach(function (t) {
            var d = U.dist(t.x, t.y, e.x, e.y);
            if (d < e.devour.radius && d < vd) { vd = d; victim = t; }
          });
          if (victim) {
            destroyTower(S, victim.pad, 0.5);
            S.bus.emit("devour", { x: victim.x, y: victim.y });
          }
        }
      }
      if (e.boss && e.slam) { // The Dredge slams towers
        e.slamT += dt;
        if (e.slamT >= e.slam.every) {
          e.slamT = 0;
          S.rings.push({ x: e.x, y: e.y, r: 20, max: e.slam.radius, color: "#ff9a3c", life: 0.6 });
          S.towers.slice().forEach(function (t) {
            if (U.dist(t.x, t.y, e.x, e.y) <= e.slam.radius) damageTower(S, t, e.slam.dmg);
          });
          S.bus.emit("slam", { x: e.x, y: e.y });
        }
      }
      if (e.boss && e.spawner) {
        e.spawnT += dt;
        if (e.spawnT >= e.spawner.every) {
          e.spawnT = 0;
          var fam = e.spawner.fam === "mixed"
            ? ["drifter", "lurker", "spitter", "mauler"][(e.id + ((S.elapsed / 10) | 0)) % 4]
            : e.spawner.fam;
          var cnt = e.fam === "heart" && e.phase >= 2 ? e.spawner.n * 2 : e.spawner.n; // P3 enrage
          for (var si = 0; si < cnt && S.enemies.length < S.liveCap; si++)
            spawnEnemy(S, fam, false, e.lane, S.waveDef);
        }
      }
      if (e.boss && e.phases) { // Heart phases
        var frac = e.hp / e.maxHp, ph = 0;
        for (var pi = 0; pi < e.phases.length; pi++) if (frac <= e.phases[pi]) ph = pi;
        if (ph > e.phase) {
          e.phase = ph;
          if (ph === 1) { e.armor = 6; S.bus.emit("phaseShift", { name: e.name, phase: 2 }); } // P2: armor 6
          if (ph === 2) { S.bus.emit("phaseShift", { name: e.name, phase: 3 }); }              // P3: enrage
          S.rings.push({ x: e.x, y: e.y, r: 20, max: 220, color: "#ff2d78", life: 0.8 });
        }
        if (e.phase >= 1) { // P2+: 30% speed aura to adds
          S.enemies.forEach(function (o) { if (!o.boss) o.heartAura = true; });
        }
        if (e.phase >= 2) { // P3: telegraphed hull strikes every 12s
          e.strikeT += dt;
          if (e.strikeT >= 12) {
            e.strikeT = 0;
            var secs = ["west", "central", "east"];
            var sec = secs[(e.id + S.strikes.length) % 3];
            var pads = S.map.pads.filter(function (p) { return p.sector === sec; });
            var pp = pads.length ? pads[(S.strikes.length * 7) % pads.length] : { x: 480, y: 300 };
            S.strikes.push({ x: pp.x, y: pp.y, t: 3, sector: sec, done: false });
            S.bus.emit("strikeWarn", { x: pp.x, y: pp.y, sector: sec });
          }
        }
      }
      var hAura = e.heartAura ? 1.3 : 1;
      // ---- movement / attack ----
      if (e.ranged) {
        // Spitter: stops 2.5 cells from nearest tower, shoots it (§4.3)
        var tw = null, bd = 1e9;
        S.towers.forEach(function (t) {
          var d = U.dist(e.x, e.y, t.x, t.y);
          if (d < bd) { bd = d; tw = t; }
        });
        if (tw && bd <= 150) {
          e.atkT += dt;
          if (e.atkT >= 1.5) { e.atkT = 0; damageTower(S, tw, 4); }
          return; // holding position, firing
        }
        moveAlong(S, e, sp * hAura * dt, laneArr);
      } else {
        moveAlong(S, e, sp * hAura * dt, laneArr);
      }
      if (S.ended) return;
    });
    // wave end?
    if (!S.spawnQueue.length && !S.backlog.length && !S.enemies.length && !S.ended) endCombat(S);
  }

  function moveAlong(S, e, step, laneArr) {
    e.dist += step;
    var lane = laneArr[e.lane];
    if (e.dist >= lane.len) {
      // LEAK (§4): deals hull damage, then despawns
      var dmg = e.hull * (e.siege ? 2 : 1); // Siege Crab ×2 at the Core
      hurtHull(S, dmg, e.x, e.y);
      var ix = S.enemies.indexOf(e);
      if (ix >= 0) S.enemies.splice(ix, 1);
      S.bus.emit("leaked", { fam: e.fam, x: e.x, y: e.y });
      return;
    }
    var pp = posAt(lane, e.dist);
    var j = null;
    for (var ji = 0; ji < lane.junctions.length; ji++) {
      var jj = lane.junctions[ji];
      if (!e["j" + ji] && pp.seg >= jj.at) {
        e["j" + ji] = true;
        if (((e.id * 2654435761) >>> 0) / 4294967296 < jj.chance) { j = jj; break; }
      }
    }
    if (j) { e.lane = j.to; lane = laneArr[e.lane]; e.dist = Math.min(e.dist, lane.len * 0.55); }
    var p2 = posAt(lane, e.dist);
    e.x = p2.x; e.y = p2.y;
  }

  function endCombat(S) {
    var leak = S.leakStart - S.hull;
    S.director.leakHist.push(leak);
    S.stats.wavesWon++;
    // §6: wave-clear bonus 20 + 5×wave
    var bonus = 20 + 5 * S.wave;
    S.cells += bonus; S.stats.cellsEarned += bonus;
    S.phase = "aftermath";
    S.bus.emit("waveEnd", { wave: S.wave, leak: leak, bonus: bonus });
  }

  // ---------------- towers: damage / destruction (§4.3) ----------------
  function towerInvested(S, t) {
    var def = TOWER_DEFS[t.fam];
    var spent = def.cost;
    if (t.tier >= 2) spent += def.tiers[1].cost;
    if (t.tier >= 3) spent += def.tiers[2][t.branch].cost;
    return spent;
  }
  function damageTower(S, t, dmg) {
    if (!t || t.hp <= 0) return;
    t.hp -= dmg;
    if (t.hp <= 0) destroyTower(S, t.pad, 0.5); // §4.3: destroyed, 50% auto-refund
    else S.bus.emit("towerHit", { fam: t.fam, x: t.x, y: t.y });
  }
  function destroyTower(S, padIdx, refundFrac) {
    var p = S.map.pads[padIdx];
    var t = p && p.tower;
    if (!t) return false;
    var refund = Math.floor(towerInvested(S, t) * refundFrac);
    S.cells += refund;
    p.tower = null;
    S.towers.splice(S.towers.indexOf(t), 1);
    S.stats.towersLost++;
    S.bus.emit("towerDestroyed", { fam: t.fam, x: t.x, y: t.y, refund: refund });
    return true;
  }

  // ---------------- player actions ----------------
  function padOf(S, i) { return S.map.pads[i] || null; }

  function buildTower(S, padIdx, fam) {
    var p = padOf(S, padIdx);
    if (!p || p.tower) return { ok: false, reason: p && p.tower ? "occupied" : "pad" };
    var def = TOWER_DEFS[fam];
    if (!def) return { ok: false, reason: "fam" };
    if (S.cells < def.cost) return { ok: false, reason: "cells" };
    if (S.towers.length >= 24) return { ok: false, reason: "cap" }; // §3: max 24 towers
    S.cells -= def.cost;
    var t = { id: S.nextId++, pad: padIdx, fam: fam, tier: 1, branch: null,
      x: p.x, y: p.y, sector: p.sector, cd: 0, overCD: 0, overT: 0,
      targetMode: "first",
      hp: def.hp + (S.tech.indexOf("reinforced") >= 0 ? 40 : 0) };
    t.maxHp = t.hp;
    p.tower = t; S.towers.push(t);
    S.bus.emit("build", { fam: fam, x: p.x, y: p.y });
    return { ok: true, tower: t };
  }

  function upgradeCost(S, t) {
    var def = TOWER_DEFS[t.fam];
    if (t.tier === 1) return def.tiers[1].cost;
    if (t.tier === 2) return { A: def.tiers[2].A.cost, B: def.tiers[2].B.cost };
    return null;
  }

  function upgradeTower(S, padIdx, branch) {
    var p = padOf(S, padIdx);
    var t = p && p.tower;
    if (!t) return { ok: false };
    if (t.tier >= 3) return { ok: false, reason: "max" };
    var cost;
    if (t.tier === 1) cost = TOWER_DEFS[t.fam].tiers[1].cost;
    else {
      if (branch !== "A" && branch !== "B") return { ok: false, reason: "branch" };
      cost = TOWER_DEFS[t.fam].tiers[2][branch].cost;
      t.branch = branch;
    }
    if (S.cells < cost) return { ok: false, reason: "cells" };
    S.cells -= cost; t.tier++;
    if (t.tier === 3 && t.fam === "sealer" && t.branch === "B") {
      S.maxHull += 25; S.hull = Math.min(S.maxHull, S.hull + 25); // Bulkhead
    }
    S.bus.emit("upgrade", { fam: t.fam, tier: t.tier, branch: t.branch });
    return { ok: true };
  }

  function sellTower(S, padIdx) {
    var p = padOf(S, padIdx);
    var t = p && p.tower;
    if (!t) return { ok: false };
    var refund = Math.floor(towerInvested(S, t) * 0.7); // §5: 70% refund
    if (t.fam === "sealer" && t.tier === 3 && t.branch === "B") {
      S.maxHull -= 25; S.hull = Math.min(S.hull, S.maxHull); // Bulkhead reverts
    }
    S.cells += refund;
    p.tower = null;
    S.towers.splice(S.towers.indexOf(t), 1);
    S.bus.emit("sell", { fam: t.fam, refund: refund });
    return { ok: true, refund: refund };
  }

  function toggleTargeting(S, padIdx) {
    var p = padOf(S, padIdx);
    var t = p && p.tower;
    if (!t) return { ok: false };
    t.targetMode = t.targetMode === "first" ? "strong" : "first"; // §5: First/Strong
    S.bus.emit("targeting", { fam: t.fam, mode: t.targetMode });
    return { ok: true, mode: t.targetMode };
  }

  function overcharge(S, padIdx) {
    var p = padOf(S, padIdx);
    var t = p && p.tower;
    if (!t || t.overCD > 0) return { ok: false };
    var def = TOWER_DEFS[t.fam];
    var cdMul = S.tech.indexOf("rapidoc") >= 0 ? 0.8 : 1;
    t.overCD = def.over.cd * cdMul;
    t.overT = def.over.dur || 0; // duration-based OCs; instant ones use dur 0
    S.stats.overcharges++;
    if (t.fam === "sonar") S.deepPingT = 8;          // Deep Ping
    else if (t.fam === "mining") S.strikeT = 15;     // Strike Pay
    else if (t.fam === "sealer") S.hull = Math.min(S.maxHull, S.hull + 10); // Emergency Weld
    S.bus.emit("overcharge", { fam: t.fam, x: t.x, y: t.y, name: def.over.name });
    return { ok: true };
  }

  // ---------------- mines (§7.3: Demolitions tech, 40 TC, max 3, manual detonation) ----------------
  function mineCost() { return 40; }
  function canMine(S) { return S.tech.indexOf("demolitions") >= 0; }
  function mineCount(S) {
    return S.map.pads.filter(function (p) { return p.mine; }).length;
  }
  function placeMine(S, padIdx) {
    if (S.phase !== "prep") return { ok: false, reason: "phase" };
    if (!canMine(S)) return { ok: false, reason: "tech" };
    var p = padOf(S, padIdx);
    if (!p || p.tower || p.mine) return { ok: false, reason: "pad" };
    if (mineCount(S) >= 3) return { ok: false, reason: "max" };
    if (S.cells < mineCost()) return { ok: false, reason: "cells" };
    S.cells -= mineCost();
    var m = { x: p.x, y: p.y, pad: padIdx, armed: true };
    p.mine = m; S.mines.push(m);
    S.bus.emit("minePlaced", { x: p.x, y: p.y });
    return { ok: true };
  }
  function detonateMine(S, padIdx) {
    var p = padOf(S, padIdx);
    var m = p && p.mine;
    if (!m || !m.armed || S.phase !== "combat") return { ok: false };
    m.armed = false;
    p.mine = null;
    S.mines.splice(S.mines.indexOf(m), 1);
    S.rings.push({ x: m.x, y: m.y, r: 10, max: 90, color: "#ff6a4d", life: 0.5 });
    S.enemies.slice().forEach(function (o) {
      if (o.hp > 0 && U.dist(m.x, m.y, o.x, o.y) <= 90)
        damageEnemy(S, o, 150, "physical", "mine"); // §7.3: 150 physical, boss-capped
    });
    S.bus.emit("mine", { x: m.x, y: m.y });
    return { ok: true };
  }

  // ---------------- vents (§6: 2 TC/harvest, once per prep) ----------------
  function harvestVent(S, ventIdx) {
    if (S.phase !== "prep") return { ok: false, reason: "phase" };
    var v = S.map.vents[ventIdx];
    if (!v) return { ok: false };
    var maxH = 1, bonus = 0;
    S.towers.forEach(function (t) {
      if (t.fam !== "mining") return;
      var st = towerStats(S, t);
      if (U.dist(t.x, t.y, v.x, v.y) < (st.radius || 180)) {
        bonus += st.ventBonus || 0;
        if (st.doubleHarvest) maxH = 2;
      }
    });
    if (v.harvested >= maxH) return { ok: false, reason: "harvested" };
    if (S.ventsHarvested >= 6) return { ok: false, reason: "rov" }; // ROV fleet limit
    v.harvested++; S.ventsHarvested++;
    var g = 2 + bonus + (S.tech.indexOf("venttap") >= 0 ? 2 : 0);
    S.cells += g; S.stats.cellsEarned += g;
    S.bus.emit("harvest", { x: v.x, y: v.y, cells: g });
    return { ok: true, cells: g };
  }

  // ---------------- Pressure Core (§7: 1:1 banking, 100 TC = 1 charge) ----------------
  function bankCells(S, amount) {
    amount = Math.max(0, Math.min(Math.floor(amount), Math.floor(S.cells)));
    if (amount <= 0) return { ok: false, reason: "amount" };
    S.cells -= amount;
    S.coreRemainder += amount;
    var charges = Math.floor(S.coreRemainder / 100);
    S.coreRemainder -= charges * 100;
    S.coreCharge += charges;
    S.bus.emit("bank", { charge: S.coreCharge });
    return { ok: true, charge: S.coreCharge, newCharges: charges };
  }
  var CORE_BUFFS = {
    rof: { name: "Overcharged Grid", desc: "+10% tower fire rate (global, stacks)" },
    yield: { name: "Siphon Yield", desc: "+10% cell drops (global, stacks)" },
    repair: { name: "Nano Hull", desc: "+0.3 hull repair/s (global, stacks)" }
  };
  function buyCoreBuff(S, which) {
    if (S.coreCharge < 1 || !CORE_BUFFS[which]) return { ok: false };
    S.coreCharge -= 1;
    var mult = S.tech.indexOf("coretaps") >= 0 ? 1.5 : 1; // +50% stronger
    if (which === "rof") S.coreRof += 0.10 * mult;
    else if (which === "yield") S.coreYield += 0.10 * mult;
    else if (which === "repair") S.coreRepair += 0.3 * mult;
    S.bus.emit("coreBuff", { which: which });
    return { ok: true };
  }

  function pickTech(S, techId) {
    if (S.techOffer.indexOf(techId) < 0) return { ok: false };
    S.tech.push(techId);
    S.techOffer = [];
    if (techId === "hullweave") { S.maxHull += 20; S.hull = Math.min(S.maxHull, S.hull + 20); }
    S.bus.emit("tech", { id: techId });
    return { ok: true };
  }

  // §7.2 power rerouting: one sector Overdrive (+30%), others 85%. CD 10s.
  function setOverdrive(S, sector) {
    if (S.powerCD > 0) return { ok: false, reason: "cd" };
    if (sector !== null && ["west", "central", "east"].indexOf(sector) < 0) return { ok: false };
    S.overdrive = (S.overdrive === sector) ? null : sector; // re-press toggles back to balanced
    S.powerCD = 10;
    S.bus.emit("power", { overdrive: S.overdrive });
    return { ok: true, overdrive: S.overdrive };
  }

  function powerSurge(S) {
    if (S.surgeCD > 0 || S.phase !== "combat") return { ok: false };
    S.surgeT = 10; S.surgeCD = 90;
    S.bus.emit("surge", {});
    return { ok: true };
  }

  // §6: repair 5 TC/HP (8 after wave 20 — hull fatigue)
  function repairCostPer(S) { return S.wave >= 20 ? 8 : 5; }
  function repairHull(S, amount) {
    var cpp = repairCostPer(S);
    amount = Math.min(amount, S.maxHull - S.hull, Math.floor(S.cells / cpp));
    if (amount <= 0) return { ok: false };
    S.cells -= amount * cpp; S.hull += amount;
    return { ok: true, repaired: amount };
  }

  // ---------------- serialization ----------------
  function serialize(S) {
    return JSON.stringify({
      v: 1, seed: S.seed, wave: S.wave, hull: Math.round(S.hull * 10) / 10,
      maxHull: S.maxHull, cells: Math.floor(S.cells),
      coreCharge: S.coreCharge, coreRemainder: S.coreRemainder,
      coreRof: S.coreRof, coreYield: S.coreYield, coreRepair: S.coreRepair,
      tech: S.tech.slice(), overdrive: S.overdrive,
      towers: S.towers.map(function (t) {
        return { pad: t.pad, fam: t.fam, tier: t.tier, branch: t.branch, targetMode: t.targetMode };
      }),
      story: S.story, stats: S.stats, director: { leakHist: S.director.leakHist.slice(-10) }
    });
  }

  function deserialize(json) {
    var d;
    try { d = JSON.parse(json); } catch (e) { return null; }
    if (!d || d.v !== 1 || typeof d.seed !== "number") return null;
    var S = create(d.seed >>> 0);
    S.wave = d.wave | 0; S.hull = d.hull; S.maxHull = d.maxHull; S.cells = d.cells;
    S.coreCharge = d.coreCharge || 0; S.coreRemainder = d.coreRemainder || 0;
    S.coreRof = d.coreRof || 0; S.coreYield = d.coreYield || 0; S.coreRepair = d.coreRepair || 0;
    S.tech = d.tech || []; S.overdrive = d.overdrive || null;
    S.story = d.story || S.story; S.stats = d.stats || S.stats;
    if (d.director && d.director.leakHist) S.director.leakHist = d.director.leakHist;
    (d.towers || []).forEach(function (td) {
      var p = padOf(S, td.pad);
      if (!p || p.tower || !TOWER_DEFS[td.fam]) return;
      var def = TOWER_DEFS[td.fam];
      var t = { id: S.nextId++, pad: td.pad, fam: td.fam, tier: td.tier || 1, branch: td.branch || null,
        x: p.x, y: p.y, sector: p.sector, cd: 0, overCD: 0, overT: 0,
        targetMode: td.targetMode || "first",
        hp: def.hp + (S.tech.indexOf("reinforced") >= 0 ? 40 : 0) };
      t.maxHp = t.hp;
      p.tower = t; S.towers.push(t);
    });
    enterPrep(S);
    S.wave = d.wave | 0;
    S.overdrive = d.overdrive || null; // enterPrep clears it; restore saved state
    return S;
  }

  return {
    VW: VW, VH: VH, CELL: CELL, HULL_Y: HULL_Y, CORE: CORE, WAVES: WAVES,
    TOWER_DEFS: TOWER_DEFS, ENEMY_DEFS: ENEMY_DEFS, TECH_DEFS: TECH_DEFS,
    BOSS_DEFS: BOSS_DEFS, FAM_ORDER: FAM_ORDER, CORE_BUFFS: CORE_BUFFS,
    create: create, genMap: genMap, genWave: genWave, directorFor: directorFor,
    startCombat: startCombat, stepCombat: stepCombat, enterPrep: enterPrep,
    buildTower: buildTower, upgradeTower: upgradeTower, sellTower: sellTower,
    destroyTower: destroyTower, damageTower: damageTower, toggleTargeting: toggleTargeting,
    overcharge: overcharge, placeMine: placeMine, detonateMine: detonateMine,
    canMine: canMine, mineCost: mineCost, mineCount: mineCount,
    harvestVent: harvestVent, bankCells: bankCells, buyCoreBuff: buyCoreBuff,
    pickTech: pickTech, setOverdrive: setOverdrive, powerSurge: powerSurge,
    repairHull: repairHull, repairCostPer: repairCostPer,
    towerStats: towerStats, towerStatsRaw: towerStatsRaw, upgradeCost: upgradeCost,
    isRevealed: isRevealed, cellGain: cellGain,
    serialize: serialize, deserialize: deserialize, posAt: posAt
  };
});
