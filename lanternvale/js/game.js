/* LANTERNVALE js/game.js — engine: loop, input, simulation, render, save.
   Integrates: world gen (world.js), writer dialogue (dialogue.js), UI (ui.js),
   audio (LanternvaleAudio), VO (voiceover.js). Browser only. */
(function () {
  "use strict";
  var W2 = LV.world, U = LV.util;
  var TILE = W2.TILE, GW = W2.W, GH = W2.H, T = W2.T;

  var canvas, ctx, ui, G = null;
  var VW = 960, VH = 640;
  var DAY_LEN = 1440; // 24-min cycle
  var SAVE_KEY = "lanternvale_save_v1";

  // dialogue advance result capture (ui.onKey discards it)
  var lastDlgResult = null;

  /* ================= boot ================= */
  function qs(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) % 900000 + 100000;
  }

  function boot() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    ui = LUI.create(canvas);
    var origAdvance = ui.dlgAdvance.bind(ui);
    ui.dlgAdvance = function () { var r = origAdvance(); lastDlgResult = r; return r; };

    var s = ui.settings;
    LanternvaleAudio.init();
    LanternvaleAudio.setMuted(!!s.mute);
    if (window.VoiceOver) VoiceOver.setEnabled(!!s.narration);

    ui.callbacks.newGame = function (seedStr) { startRun(seedStr || null); };
    ui.callbacks.continueGame = function () { loadRun(); };
    ui.callbacks.quitToTitle = function () { saveRun(); VoiceOver.stop(); ui.screen = "title"; ui.menuIdx = 0; };
    ui.callbacks.restart = function () { if (G) startRun(G.seedName); };
    ui.callbacks.resume = function () { ui.screen = "game"; };
    ui.callbacks.toggleMute = function () { LanternvaleAudio.setMuted(!!ui.settings.mute); };
    ui.callbacks.pause = function () { saveRun(); };
    ui.callbacks.pauseRefresh = function () {
      LanternvaleAudio.setMuted(!!ui.settings.mute);
      if (window.VoiceOver) VoiceOver.setEnabled(!!ui.settings.narration);
    };

    window.addEventListener("keydown", function (e) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"].indexOf(e.code) >= 0) e.preventDefault();
      if (e.repeat) return;
      LanternvaleAudio.init();
      var consumed = ui.onKey(e.code, e.key);
      if (!consumed) gameKey(e.code, e.key, true);
    });
    window.addEventListener("keyup", function (e) { gameKey(e.code, e.key, false); });
    // touch: d-pad hold + tap mapping
    var touchHeld = {};
    canvas.addEventListener("touchstart", function (e) {
      e.preventDefault(); LanternvaleAudio.init();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i], r = canvas.getBoundingClientRect();
        var x = (t.clientX - r.left) * VW / r.width, y = (t.clientY - r.top) * VH / r.height;
        var res = ui.tap(x, y);
        if (res === "up" || res === "down" || res === "left" || res === "right") touchHeld[res] = t.identifier;
        else if (res === "action") gameKey("Space", " ", true);
        else if (res === "pause") { ui.menuIdx = 0; ui.screen = "pause"; }
        else if (res === "journal") { ui.screen = "journal"; ui.journalTab = 0; }
        else if (res === "photo") ui.openPhoto();
        else if (res === "snap" && ui.screen === "photo") ui.snapRequest = { zoom: ui.photo.zoom, panX: ui.photo.panX, panY: ui.photo.panY };
        else if (res === "close" && ui.screen === "photo") { ui.photo.open = false; ui.screen = "game"; }
        else if (res === "menu" && typeof ui.menuTap === "function") ui.menuTap(ui.menuIdx);
      }
    }, { passive: false });
    canvas.addEventListener("touchend", function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var id = e.changedTouches[i].identifier;
        for (var k in touchHeld) if (touchHeld[k] === id) delete touchHeld[k];
      }
      gameKey("Space", " ", false);
    });
    G_touchHeld = touchHeld;

    // ?scene= hooks
    var scene = qs("scene");
    if (scene) applyScene(scene);

    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (ui.screen === "game" || ui.screen === "photo" || ui.screen === "pause") updateGame(dt);
      ui.update(dt);
      pumpVO();
      render();
      ui.draw(buildSnapshot());
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  var G_touchHeld = {};

  /* ================= run lifecycle ================= */
  function newState(seed, seedName) {
    var world = W2.generate(seed);
    return {
      seed: seed, seedName: seedName, world: world,
      px: world.spawn.x * TILE + TILE / 2, py: world.spawn.y * TILE + TILE / 2,
      dir: 0, moving: false, walkPhase: 0, stillT: 0,
      clock: 0.25 * DAY_LEN, weather: "clear", weatherT: 0, stormForced: false, weatherOverride: null,
      gear: { waders: false, climbing: false, stormlantern: false },
      beacons: [false, false, false, false, false], tower4dark: null,
      kindness: 0, quests: {}, flags: {},
      comp: { flora: {}, fauna: {}, echoes: {}, vistas: {} }, aldaPages: [],
      carrying: { plank: 0, log: 0, coil: 0, shroom: 0, stores: [] }, hasRecipe: false,
      fenceMended: 0, storesStocked: 0, expTaken: {},
      bloomsLogged: 0,
      boulders: {}, sluices: {}, mirrors: {}, channelsSolved: {}, mirrorsSolved: {},
      bridgeR1: false, bridgeR3: false, ropeFixed: false,
      clover: { x: world.clover.x * TILE + 12, y: world.clover.y * TILE + 12, found: false, following: false, t: 0 },
      regionsVisited: [false, false, false, false, false],
      playtime: 0, distance: 0, stepT: 0,
      lightSeq: null, dlg: null, photoCam: null,
      tutMoved: false, wewakeWalkDone: false, introDone: false,
      camX: 0, camY: 0, terrainDirty: true, swayT: 0,
      gearFallbackTaken: {}, barkNext: {}, barkLast: {}
    };
  }

  function startRun(seedName) {
    var seed = seedName ? hashSeed(String(seedName)) : (100000 + Math.floor(Math.random() * 900000));
    if (!seedName) seedName = "vale" + (seed % 10000);
    G = newState(seed, String(seedName));
    ui.tutorialReset();
    ui.setPhotos([]);
    ui.screen = "game";
    ui.fadeTo = 1; ui.fade = 0;
    LanternvaleAudio.startAmbient();
    ui.tutorialEvent("arrived");
    // intro: Alda's note + VO
    ui.requestVO("intro");
    sayLine("Alda's note", "Finish the map. Light the towers. Come home by the long way. — A.", null, { simple: true });
    saveRun();
  }

  function saveRun() {
    if (!G) return;
    try {
      var d = {
        v: 1, seed: G.seed, seedName: G.seedName,
        px: Math.round(G.px), py: Math.round(G.py), clock: Math.round(G.clock),
        gear: G.gear, beacons: G.beacons, tower4dark: G.tower4dark,
        kindness: G.kindness, quests: G.quests, flags: G.flags,
        comp: G.comp, aldaPages: G.aldaPages,
        carrying: G.carrying, hasRecipe: G.hasRecipe, bloomsLogged: G.bloomsLogged,
        fenceMended: G.fenceMended, storesStocked: G.storesStocked, expTaken: G.expTaken,
        boulders: G.boulders, sluices: G.sluices, mirrors: G.mirrors,
        channelsSolved: G.channelsSolved, mirrorsSolved: G.mirrorsSolved,
        bridgeR1: G.bridgeR1, bridgeR3: G.bridgeR3, ropeFixed: G.ropeFixed,
        clover: { found: G.clover.found, following: G.clover.following },
        regionsVisited: G.regionsVisited, playtime: Math.round(G.playtime),
        distance: Math.round(G.distance), wewakeWalkDone: G.wewakeWalkDone, introDone: G.introDone,
        gearFallbackTaken: G.gearFallbackTaken,
        barkNext: G.barkNext, barkLast: G.barkLast,
        photos: ui.getPhotos(), tutDone: ui.tut.done,
        planksTaken: G.world.r1planks.map(function (p) { return p.taken; }),
        logsTaken: G.world.logs.map(function (p) { return p.taken; }),
        coilsTaken: G.world.coils.map(function (p) { return p.taken; })
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    } catch (e) {}
  }

  function loadRun() {
    var raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
    if (!raw) return;
    var d;
    try { d = JSON.parse(raw); } catch (e) { return; }
    if (!d || d.v !== 1 || !d.seed) return;
    G = newState(d.seed, d.seedName || "vale");
    G.px = d.px; G.py = d.py; G.clock = d.clock || G.clock;
    G.gear = d.gear; G.beacons = d.beacons; G.tower4dark = d.tower4dark;
    G.kindness = d.kindness; G.quests = d.quests; G.flags = d.flags;
    G.comp = d.comp; G.aldaPages = d.aldaPages || [];
    G.carrying = d.carrying; G.hasRecipe = d.hasRecipe; G.bloomsLogged = d.bloomsLogged || 0;
    if (G.carrying.shroom == null) G.carrying.shroom = 0;
    if (!G.carrying.stores) G.carrying.stores = [];
    G.fenceMended = d.fenceMended || 0; G.storesStocked = d.storesStocked || 0;
    G.expTaken = d.expTaken || {};
    G.boulders = d.boulders || {}; G.sluices = d.sluices || {}; G.mirrors = d.mirrors || {};
    G.channelsSolved = d.channelsSolved || {}; G.mirrorsSolved = d.mirrorsSolved || {};
    G.bridgeR1 = d.bridgeR1; G.bridgeR3 = d.bridgeR3; G.ropeFixed = d.ropeFixed;
    G.clover.found = d.clover.found; G.clover.following = d.clover.following;
    G.regionsVisited = d.regionsVisited; G.playtime = d.playtime || 0; G.distance = d.distance || 0;
    G.wewakeWalkDone = d.wewakeWalkDone; G.introDone = true;
    G.gearFallbackTaken = d.gearFallbackTaken || {};
    G.barkNext = d.barkNext || {}; G.barkLast = d.barkLast || {};
    // re-apply world-state flags onto the regenerated world
    var w = G.world;
    G.beacons.forEach(function (b, i) { w.towers[i].lit = !!b; });
    Object.keys(G.boulders).forEach(function (id) {
      var b = w.boulders.filter(function (x) { return x.id === id; })[0];
      if (b) { b.x = G.boulders[id].x; b.y = G.boulders[id].y; b.solved = G.boulders[id].solved; }
    });
    Object.keys(G.sluices).forEach(function (id) {
      var ch = w.channels.filter(function (x) { return x.id === id; })[0];
      if (ch) ch.sluices.forEach(function (s, i) { s.ori = G.sluices[id][i]; });
    });
    Object.keys(G.mirrors).forEach(function (id) {
      var mz = { mR3: w.mirrorsR3, mR4: w.mirrorsR4, mR5: w.mirrorsR5 }[id];
      if (mz) mz.mirrors.forEach(function (m, i) { m.ori = G.mirrors[id][i]; });
    });
    (d.planksTaken || []).forEach(function (t, i) { if (w.r1planks[i]) w.r1planks[i].taken = t; });
    (d.logsTaken || []).forEach(function (t, i) { if (w.logs[i]) w.logs[i].taken = t; });
    (d.coilsTaken || []).forEach(function (t, i) { if (w.coils[i]) w.coils[i].taken = t; });
    ui.setPhotos(d.photos || []);
    ui.tut.done = d.tutDone || {};
    ui.screen = "game";
    ui.fadeTo = 1; ui.fade = 0;
    LanternvaleAudio.startAmbient();
    stampFixedBridges();
    applyBeaconLighting();
  }

  /* ================= snapshot for ui.draw ================= */
  function compendiumPct() {
    var found = 0;
    ["flora", "fauna", "echoes", "vistas"].forEach(function (k) {
      for (var id in G.comp[k]) if (G.comp[k][id]) found++;
    });
    return Math.round(found / 36 * 100);
  }
  function buildSnapshot() {
    var snap = { dayT: 0.3, weather: "clear", compassHeading: 0, towersLit: 0, towersTotal: 5, kindness: 0, seed: 0, journal: null };
    if (!G) return snap;
    var w = G.world;
    snap.dayT = (G.clock % DAY_LEN) / DAY_LEN;
    snap.weather = G.weather === "storm" ? "stormglow" : G.weather;
    snap.compassHeading = [Math.PI, 0, Math.PI / 2, -Math.PI / 2][G.dir] || 0;
    snap.towersLit = G.beacons.filter(Boolean).length;
    snap.kindness = G.kindness;
    snap.seed = G.seed;
    var flora = W2.FLORA.map(function (f) {
      return { name: f.name, found: !!G.comp.flora[f.id], note: f.note + (f.night ? " · night" : "") };
    });
    var fauna = W2.FAUNA.map(function (f) {
      return { name: f.name, found: !!G.comp.fauna[f.id], note: f.note };
    });
    var echoes = w.echoes.map(function (e, i) {
      var label = e.id === "echo_heart" ? "The bloom heart" : "Echo stone " + (i + 1);
      return { name: label, found: !!G.comp.echoes[e.id], note: e.id === "echo_heart" ? "it glows at night" : "Alda was here" };
    });
    G.aldaPages.forEach(function (p) { echoes.push({ name: p.title, found: true, note: p.text }); });
    var vistas = w.vistas.map(function (v) {
      var note = v.star === "dawn" ? "needs a dawn postcard" : v.star === "storm" ? "needs a storm postcard" : v.star === "fivelights" ? "needs all five lights, at night" : "";
      return { name: v.name, found: !!G.comp.vistas[v.id], note: note };
    });
    snap.journal = {
      regions: W2.REGIONS.map(function (r, i) {
        return { name: r.name, visited: !!G.regionsVisited[i], lit: !!G.beacons[i] };
      }),
      flora: flora, fauna: fauna, echoes: echoes, vistas: vistas
    };
    return snap;
  }

  /* ================= input ================= */
  var keys = {};
  function gameKey(code, key, down) {
    keys[code] = down;
    if (!G || !down) return;
    if (ui.screen !== "game") return;
    if (ui.dlgVisible()) return; // dialogue consumes
    if (code === "Space" || code === "Enter") doInteract();
  }
  function keyDown(c) { return !!keys[c] || !!G_touchHeld[{ ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[c]]; }
  function moveInput() {
    var dx = 0, dy = 0;
    if (keyDown("ArrowLeft") || keyDown("KeyA")) dx -= 1;
    if (keyDown("ArrowRight") || keyDown("KeyD")) dx += 1;
    if (keyDown("ArrowUp") || keyDown("KeyW")) dy -= 1;
    if (keyDown("ArrowDown") || keyDown("KeyS")) dy += 1;
    // photo screen: pan viewfinder instead of walking
    if (ui.screen === "photo" && ui.photo.open) {
      ui.photo.panX += dx * 14; ui.photo.panY += dy * 14;
      return null;
    }
    if (dx || dy) {
      var l = Math.hypot(dx, dy); dx /= l; dy /= l;
      G.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
      return { dx: dx, dy: dy };
    }
    return null;
  }

  /* ================= helpers ================= */
  function tileAtPx(px, py) {
    return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) };
  }
  function walkCtx() {
    var b = {};
    G.world.boulders.forEach(function (bd) {
      var s = G.boulders[bd.id] || { x: bd.x, y: bd.y };
      b[bd.id] = [s.x, s.y];
    });
    return {
      gear: G.gear, depth: riverDepth(), bridgeR3: G.bridgeR3, ropeFixed: G.ropeFixed,
      boulders: b
    };
  }
  function riverDepth() {
    if (G.weather === "rain") return 2;
    if (G.weather === "storm") return 2;
    return 1;
  }
  function canStand(px, py) {
    var r = 9;
    var pts = [[px - r, py - r], [px + r, py - r], [px - r, py + r], [px + r, py + r]];
    var ctxw = walkCtx();
    for (var i = 0; i < pts.length; i++) {
      var t = tileAtPx(pts[i][0], pts[i][1]);
      if (!W2.walkable(G.world, t.x, t.y, ctxw)) return false;
    }
    return true;
  }
  function boulderAt(tx, ty) {
    var found = null;
    G.world.boulders.forEach(function (bd) {
      var s = G.boulders[bd.id] || { x: bd.x, y: bd.y };
      if (s.x === tx && s.y === ty) found = bd;
    });
    return found;
  }
  function phaseOfDay() {
    var d = (G.clock % DAY_LEN) / DAY_LEN;
    if (d < 0.22) return "dawn"; if (d < 0.55) return "day";
    if (d < 0.72) return "dusk"; return "night";
  }
  function isNight() { return phaseOfDay() === "night"; }
  function isDawn() { return phaseOfDay() === "dawn"; }

  function pumpVO() {
    var beat = ui.consumeVO();
    if (beat && window.VoiceOver) VoiceOver.play(beat);
    if (ui.narrationLine) {
      var line = ui.narrationLine; ui.narrationLine = null;
      if (window.VoiceOver) VoiceOver.speakText(line);
    }
  }

  /* ================= update ================= */
  var saveT = 0, padT = 0;
  function updateGame(dt) {
    if (!G) return;
    var frozen = ui.screen !== "game" || ui.dlgVisible() || !!G.lightSeq;
    // clock runs in game screen (dialogue keeps time, photo freezes, pause: we still update HUD but freeze sim)
    if (ui.screen === "game" && !ui.photo.open) {
      G.clock += dt; G.playtime += dt;
      updateWeather(dt);
      if (!frozen) updatePlayer(dt);
      updateFauna(dt);
      updateClover(dt);
      updateTriggers();
      updateLightSeq(dt);
    }
    // ambient audio follows weather + water proximity
    padT += dt;
    if (padT > 8) { padT = 0; LanternvaleAudio.setDayPhase(isNight() ? "night" : "day"); }
    var t = tileAtPx(G.px, G.py), tl = G.world.tiles[W2.idx(t.x, t.y)];
    // camera
    var tx = U.clamp(G.px - VW / 2, 0, GW * TILE - VW), ty = U.clamp(G.py - VH / 2, 0, GH * TILE - VH);
    G.camX += (tx - G.camX) * Math.min(1, dt * 4);
    G.camY += (ty - G.camY) * Math.min(1, dt * 4);
    // photo viewfinder pan (WASD) — updatePlayer is frozen in photo mode
    if (ui.screen === "photo" && ui.photo.open) {
      var pdx = 0, pdy = 0;
      if (keyDown("ArrowLeft") || keyDown("KeyA")) pdx -= 1;
      if (keyDown("ArrowRight") || keyDown("KeyD")) pdx += 1;
      if (keyDown("ArrowUp") || keyDown("KeyW")) pdy -= 1;
      if (keyDown("ArrowDown") || keyDown("KeyS")) pdy += 1;
      ui.photo.panX += pdx * 14; ui.photo.panY += pdy * 14;
    }
    // dialogue session pump
    pumpDialogue();
    // snap request (photo mode)
    if (ui.snapRequest) { var sr = ui.snapRequest; ui.snapRequest = null; doSnap(sr); }
    // autosave
    saveT += dt;
    if (saveT > 20) { saveT = 0; saveRun(); }
  }

  function updateWeather(dt) {
    G.weatherT += dt;
    var w;
    if (G.weatherOverride) w = G.weatherOverride;
    else w = G.world.weatherAt(G.clock, G.beacons[1]);
    if (w !== G.weather) {
      G.weather = w; G.weatherT = 0;
      LanternvaleAudio.setWeather(w);
      if (w === "rain") LanternvaleAudio.play("wind_gust");
      if (w === "storm") LanternvaleAudio.play("thunder_distant");
    }
    // force one storm-glow in the R4/R5 window (DESIGN 4.7)
    if (!G.stormForced && G.beacons[2] && !G.weatherOverride) {
      var rg = W2.regionAtRow(tileAtPx(G.px, G.py).y);
      if (rg >= 3 && G.weatherT > 60) { G.weatherOverride = "storm"; G.stormForced = true; }
    }
    if (G.weatherOverride === "storm" && G.weatherT > 150) G.weatherOverride = null;
  }

  function updatePlayer(dt) {
    var mv = moveInput();
    G.moving = !!mv;
    if (mv) {
      if (!G.tutMoved) { G.tutMoved = true; ui.tutorialEvent("first_steps"); }
      var speed = 96;
      var t = tileAtPx(G.px, G.py), tl = G.world.tiles[W2.idx(t.x, t.y)];
      if (tl === T.PATH) speed *= 1.1;
      if ((tl === T.RIVER || tl === T.FORD || tl === T.REED) && riverDepth() === 1) speed *= 0.6;
      var nx = G.px + mv.dx * speed * dt, ny = G.py + mv.dy * speed * dt;
      // boulder push: walking into a boulder tile attempts a push
      var pushed = false;
      if (canStand(nx, G.py)) { G.px = nx; } else { pushed = tryPush(mv.dx, 0) || pushed; }
      if (canStand(G.px, ny)) { G.py = ny; } else { pushed = tryPush(0, mv.dy) || pushed; }
      G.walkPhase += dt * 10;
      G.stillT = 0;
      G.distance += speed * dt;
      // footsteps
      G.stepT -= dt;
      if (G.stepT <= 0) {
        G.stepT = 0.34;
        var s2 = { 2: "step_gravel", 1: "step_grass", 0: "step_grass", 13: "step_grass", 11: "step_stone", 5: "step_wood", 14: "step_wood", 3: "step_water", 4: "step_water", 15: "step_water", 12: "step_gravel" }[tl] || "step_grass";
        LanternvaleAudio.play(s2);
      }
    } else {
      G.stillT += dt;
    }
  }

  function tryPush(dx, dy) {
    if (!dx && !dy) return false;
    var t = tileAtPx(G.px + dx * TILE, G.py + dy * TILE);
    var bd = boulderAt(t.x, t.y);
    if (!bd || bd.solved) return false;
    // push target tile
    var nx = t.x + Math.sign(dx), ny = t.y + Math.sign(dy);
    var s = G.boulders[bd.id] || { x: bd.x, y: bd.y };
    // socket reached?
    var ctxw = walkCtx();
    delete ctxw.boulders[bd.id]; // allow target check without self
    if (!W2.walkable(G.world, nx, ny, ctxw) || boulderAt(nx, ny)) return false;
    // boulder pads are open stone; only allow pushes within 3 of socket
    if (Math.abs(nx - bd.sx) > 3 || Math.abs(ny - bd.sy) > 3) return false;
    G.boulders[bd.id] = { x: nx, y: ny };
    LanternvaleAudio.play("boulder_nudge");
    if (nx === bd.sx && ny === bd.sy) {
      bd.solved = true; G.boulders[bd.id].solved = true;
      LanternvaleAudio.play("boulder_settle");
      ui.showBanner("The boulder settles", "the way opens");
      saveRun();
    }
    return true;
  }

  function updateFauna(dt) {
    var w = G.world, night = isNight();
    w.fauna.forEach(function (f) {
      f.t += dt;
      if (f.pose > 0) { f.pose -= dt; return; }
      // curiosity: player still within 120px
      var d = U.dist(G.px, G.py, f.x * TILE, f.y * TILE);
      if (G.stillT > 2 && d < 120 && d > 30) { f.pose = 6; return; }
      if (Math.floor(f.t) !== Math.floor(f.t - dt)) {
        // wander
        if (Math.random() < 0.3) {
          var a = Math.random() * 6.28, nx = f.x + Math.round(Math.cos(a)), ny = f.y + Math.round(Math.sin(a));
          if (Math.abs(nx - f.hx) + Math.abs(ny - f.hy) < 6 && W2.walkable(w, nx, ny, walkCtx())) { f.x = nx; f.y = ny; }
        }
      }
    });
  }

  function updateClover(dt) {
    var c = G.clover;
    if (!c.found || !c.following) return;
    c.t += dt;
    var tx = G.px - Math.cos(0) * 30, ty = G.py + 24;
    var dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
    if (d > 40) { c.x += dx / d * 70 * dt; c.y += dy / d * 70 * dt; }
  }

  function updateTriggers() {
    var w = G.world, t = tileAtPx(G.px, G.py);
    var rg = W2.regionAtRow(t.y);
    if (!G.regionsVisited[rg]) {
      G.regionsVisited[rg] = true;
      var names = ["I", "II", "III", "IV", "V"];
      ui.showBanner("REGION " + names[rg] + " — " + W2.REGIONS[rg].name, rg === 0 ? "the walk begins" : "the map fills in");
      LanternvaleAudio.play("vista_chime");
      saveRun();
    }
    // tutorial: near tower 1
    if (!G.flags.tut_tower1) {
      var t1 = w.towers[0];
      if (U.dist(G.px, G.py, t1.x * TILE, t1.y * TILE) < 420) {
        G.flags.tut_tower1 = true;
        ui.tutorialEvent("near_tower1");
      }
    }
    // tutorial: met wewake
    if (!G.flags.tut_wewake) {
      var wewake = w.villagers[1];
      if (U.dist(G.px, G.py, wewake.x * TILE, wewake.y * TILE) < 200) {
        G.flags.tut_wewake = true;
        ui.tutorialEvent("met_wewake");
      }
    }
    // deep hollow first night visit
    if (!G.flags.saw_hollow_night && isNight()) {
      var hh = w.hollow;
      if (t.x >= hh.x0 && t.x <= hh.x1 && t.y >= hh.y0 && t.y <= hh.y1) {
        G.flags.saw_hollow_night = true;
        ui.requestVO("deep_hollow");
        sayLine("Wren", "Past the hollow mouth, the dark goes down like water. Then — blue. Bloom after bloom, opening in the black.", null, { simple: true });
        LanternvaleAudio.play("deeplight_discover");
      }
    }
    // wewake walk stretch: first rope-bridge crossing
    if (!G.wewakeWalkDone && !G.beacons[4]) {
      var rb = w.ropeBridge;
      if (Math.abs(t.x - rb.x) < 4 && Math.abs(t.y - rb.y) < 3 && G.ropeFixed) {
        G.wewakeWalkDone = true;
        var walkArr = (G.quests.wewake_fence === "done" && G.quests.wewake_lambing === "done") ? DIALOGUE.wewake.wewakeWalkVeteran : DIALOGUE.wewake.wewakeWalk;
        startDialogueTree("wewake", null, walkArr);
        ui.requestVO("wewake_walk");
      }
    }
    // overlook -> ending
    if (G.beacons[4] && !G.flags.ended) {
      var ov = w.overlook;
      if (U.dist(G.px, G.py, ov.x * TILE, ov.y * TILE) < 60) {
        G.flags.ended = true;
        doEnding();
      }
    }
    // gear fallbacks (DESIGN 10.5)
    checkGearFallback("stormlantern", G.beacons[0]);
    checkGearFallback("waders", G.beacons[2]);
    checkGearFallback("climbingkit", G.beacons[3]);
    // quiet moments: fox at dawn (R1 meadow), rain on Vipul's bridge (expansion §3)
    if (!G.flags.qm_fox && isDawn() && G.playtime > 120) {
      var t1r = w.towers[0];
      if (U.dist(G.px, G.py, (t1r.x - 4) * TILE, (t1r.y + 6) * TILE) < 90) {
        G.flags.qm_fox = true;
        startDialogueTree("quietMoments", null, DIALOGUE.quietMoments.fox);
        saveRun();
      }
    }
    if (!G.flags.qm_rain && (G.weather === "rain" || G.weather === "storm")) {
      var b3 = w.bridgeR3;
      if (U.dist(G.px, G.py, b3.x * TILE, b3.y * TILE) < 110) {
        G.flags.qm_rain = true;
        startDialogueTree("quietMoments", null, DIALOGUE.quietMoments.rain);
        saveRun();
      }
    }
    // ambient barks (expansion §4): the valley notices you
    if (!G.dlg) {
      for (var bvi = 0; bvi < w.villagers.length; bvi++) {
        var bv = w.villagers[bvi];
        var bnext = G.barkNext[bv.id] || 0;
        if (G.playtime >= bnext) {
          G.barkNext[bv.id] = G.playtime + 75 + Math.random() * 45;
          if (U.dist(G.px, G.py, bv.x * TILE + 12, bv.y * TILE + 12) < 300) {
            var barks = DIALOGUE[bv.id] && DIALOGUE[bv.id].barks;
            if (barks) {
              for (var bki = 0; bki < barks.length; bki++) {
                var bk = barks[bki];
                if (bk.if && !condTrue(bk.if)) continue;
                var blast = G.barkLast[bv.id];
                if (blast && blast.text === bk.text && G.playtime - blast.t < 600) continue;
                G.barkLast[bv.id] = { text: bk.text, t: G.playtime };
                ui.showBanner(bk.speaker, bk.text);
                break;
              }
            }
          }
        }
      }
    }
  }

  function checkGearFallback(gear, unlocked) {
    // callers pass the effect-style id ("climbingkit"); the live field is G.gear.climbing
    var g = gear === "climbingkit" ? "climbing" : gear;
    if (!unlocked || G.gear[g] || G.gearFallbackTaken[g]) return;
    var w = G.world, p = w.gearFallback[gear];
    if (U.dist(G.px, G.py, p[0] * TILE, p[1] * TILE) < 48) {
      G.gearFallbackTaken[g] = true;
      G.gear[g] = true;
      var names = { waders: "Waders", climbing: "Climbing kit", stormlantern: "Storm-lantern" };
      ui.showBanner(names[g] || gear, "left where you'd find it");
      LanternvaleAudio.play("gear_" + (g === "stormlantern" ? "lantern" : g === "climbing" ? "climb" : "waders"));
      saveRun();
    }
  }

  /* ================= lighting sequence ================= */
  function updateLightSeq(dt) {
    var ls = G.lightSeq;
    if (!ls) return;
    ls.t += dt;
    if (ls.stage === "climb" && ls.t > 1.2) { ls.stage = "strike"; ls.t = 0; LanternvaleAudio.play("flint_strike"); }
    else if (ls.stage === "strike" && ls.t > 0.8) {
      ls.stage = "ignite"; ls.t = 0;
      LanternvaleAudio.play("lantern_ignite");
      LanternvaleAudio.play("beacon_light");
    }
    else if (ls.stage === "ignite" && ls.t > 5.0) {
      finishLighting(ls.tower);
      G.lightSeq = null;
    }
  }

  function finishLighting(tower) {
    var id = tower.id;
    if (id === 4) {
      // tower-4 choice (reversible): clear both flags so the new choice resolves cleanly
      G.flags.tower4_lit = false; G.flags.tower4_dark = false;
      startDialogueTree("tower4Choice", null);
      return;
    }
    tower.lit = true; G.beacons[id - 1] = true;
    G.flags["tower" + id + "_lit"] = true;
    ui.requestVO("tower" + id);
    var beat = DIALOGUE.towerBeats && DIALOGUE.towerBeats["tower" + id];
    if (beat) sayLine(beat.speaker, beat.text, null, { simple: true });
    ui.showBanner("BEACON LIT", tower.name + " — the valley glows a little warmer");
    if (id === 1) ui.tutorialEvent("tower1_lit");
    applyBeaconLighting();
    saveRun();
  }

  function applyBeaconLighting() {
    G.terrainDirty = true;
  }
  function stampFixedBridges() {
    var w = G.world;
    if (G.bridgeR1) w.brookBridge.tiles.forEach(function (t) { w.tiles[W2.idx(t[0], t[1])] = T.BRIDGE; });
    if (G.bridgeR3) w.bridgeR3.tiles.forEach(function (t) { w.tiles[W2.idx(t[0], t[1])] = T.BRIDGE; });
    G.terrainDirty = true;
  }

  /* ================= dialogue runner ================= */
  function sayLine(speaker, text, choices, opts) {
    ui.say(speaker, text, choices || null, opts || {});
    lastDlgResult = "open";
  }
  function condTrue(c) {
    if (!c) return true;
    if (c.indexOf("flag:") === 0) return !!G.flags[c.slice(5)];
    if (c.indexOf("done:") === 0) return G.quests[c.slice(5)] === "done";
    if (c.indexOf("kind>=") === 0) return G.kindness >= parseInt(c.slice(6), 10);
    return true;
  }
  function applyEffect(eff) {
    if (!eff) return;
    eff.split(" ").forEach(function (e) {
      if (e === "kind+1") {
        G.kindness = Math.min(5, G.kindness + 1);
        LanternvaleAudio.play("kindness_chime");
        ui.showBanner("Kindness " + G.kindness + "/5", "the valley noticed");
        ui.tutorialEvent("kindness_gained");
      } else if (e.indexOf("flag:") === 0) {
        G.flags[e.slice(5)] = true;
      } else if (e.indexOf("gear:") === 0) {
        var g = e.slice(5);
        var map = { waders: "waders", climbingkit: "climbing", stormlantern: "stormlantern" };
        if (map[g]) {
          G.gear[map[g]] = true;
          var names = { waders: "Waders", climbing: "Climbing kit", stormlantern: "Storm-lantern" };
          ui.showBanner(names[g], "new ground opens");
          LanternvaleAudio.play("gear_" + (g === "stormlantern" ? "lantern" : g === "climbingkit" ? "climb" : "waders"));
        }
      } else if (e.indexOf("quest:") === 0) {
        var q = e.slice(6);
        if (!G.quests[q]) { G.quests[q] = "active"; LanternvaleAudio.play("quest_accept"); }
      }
    });
    saveRun();
  }
  function findNode(nodes, id) {
    for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i];
    return null;
  }
  function showNode() {
    var s = G.dlg;
    if (!s) return;
    var node = s.node;
    if (node.if && !condTrue(node.if)) { endDialogue(); return; }
    if (node.effect && !node._effApplied) { node._effApplied = true; applyEffect(node.effect); }
    var choices = node.choices && node.choices.length ? node.choices.map(function (c) { return c.text; }) : null;
    sayLine(node.speaker, node.text, choices, { narrate: false });
    lastDlgResult = "open";
  }
  function startDialogueTree(treeKey, startId, nodesOverride) {
    var tree = DIALOGUE[treeKey];
    if (!tree) return;
    var nodes = nodesOverride || (Array.isArray(tree) ? tree : tree.meet);
    var node = startId ? findNode(nodes, startId) : nodes[0];
    if (!node) return;
    G.dlg = { treeKey: treeKey, nodes: nodes, node: node, tree: tree };
    lastDlgResult = "open";
    showNode();
  }
  function endDialogue() {
    var s = G.dlg; G.dlg = null; lastDlgResult = null;
    if (s && s.treeKey === "tower4Choice") resolveTower4();
    if (s && s.onDone) s.onDone();
  }
  function resolveTower4() {
    var tower = G.world.towers[3];
    if (G.flags.tower4_dark) { tower.lit = false; G.beacons[3] = false; G.tower4dark = true; G.flags.tower4_lit = false; }
    else { tower.lit = true; G.beacons[3] = true; G.tower4dark = false; G.flags.tower4_lit = true; G.flags.tower4_dark = false; }
    G.flags.tower3_lit = G.flags.tower3_lit; // no-op clarity
    ui.requestVO("tower4");
    var beat = DIALOGUE.towerBeats && DIALOGUE.towerBeats[G.tower4dark ? "tower4_dark" : "tower4_lit"];
    if (beat) sayLine(beat.speaker, beat.text, null, { simple: true });
    ui.showBanner(G.tower4dark ? "The tower stays dark" : "BEACON LIT",
      G.tower4dark ? "the hollow keeps breathing blue" : "Hollowheart — the valley glows a little warmer");
    applyBeaconLighting();
    saveRun();
  }
  function pumpDialogue() {
    var s = G.dlg;
    if (!s) return;
    if (ui.dlgVisible()) return; // still showing
    var r = lastDlgResult;
    if (r === "open" || r === null || r === undefined) return;
    var node = s.node;
    if (typeof r === "number" && node.choices && node.choices[r]) {
      var ch = node.choices[r];
      applyEffect(ch.effect);
      if (ch.goto) {
        var nx = findNode(s.nodes, ch.goto);
        if (nx) { s.node = nx; lastDlgResult = "open"; showNode(); return; }
      }
      endDialogue(); return;
    }
    // "next": advance linear or end
    if (node.end || !node.choices || !node.choices.length) { endDialogue(); return; }
    endDialogue();
  }

  // pick the right opening node per villager, honoring quest state + flags
  function talkTo(vid) {
    LanternvaleAudio.play("villager_greet");
    var Q = G.quests;
    if (vid === "wewake") {
      if (Q.wewake_ram === "ready" || (Q.wewake_ram === "active" && G.clover.following)) { Q.wewake_ram = "done"; G.clover.following = false; startDialogueTree("wewake", null, DIALOGUE.wewake.questDone); return; }
      // expansion: fence + lambing questlines, tower-4 reactions
      if (Q.wewake_fence === "active" && G.fenceMended >= 3) { Q.wewake_fence = "done"; startDialogueTree("wewake", null, DIALOGUE.wewake.fenceDone); return; }
      if (Q.wewake_fence === "active") { startDialogueTree("wewake", "t_fence_mid"); return; }
      if (Q.wewake_ram === "done" && !Q.wewake_fence) { startDialogueTree("wewake", "t_fence_offer"); return; }
      if (Q.wewake_lambing === "active" && G.flags.lambing_scene) { Q.wewake_lambing = "done"; startDialogueTree("wewake", null, DIALOGUE.wewake.lambingDone); return; }
      if (Q.wewake_lambing === "active") { startDialogueTree("wewake", "t_lamb_mid"); return; }
      if (Q.wewake_fence === "done" && !Q.wewake_lambing && G.flags.tower2_lit) { startDialogueTree("wewake", "t_lamb_offer"); return; }
      if (G.flags.tower4_lit && !G.flags.wewake_t4) { G.flags.wewake_t4 = true; startDialogueTree("wewake", "t_t4_lit"); return; }
      if (G.flags.tower4_dark && !G.flags.wewake_t4) { G.flags.wewake_t4 = true; startDialogueTree("wewake", "t_t4_dark"); return; }
      if (Q.wewake_ram === "done") { startDialogueTree("wewake", "t_ramdone"); return; }
      startDialogueTree("wewake", null); return;
    }
    if (vid === "meera") {
      if (Q.meera_blooms === "active" && G.bloomsLogged >= 3) {
        Q.meera_blooms = "done";
        startDialogueTree("meera", null, DIALOGUE.meera.questDone); return;
      }
      // expansion: shroom census, hollow promise, seed vault, aftermath + t4 reactions
      if (Q.meera_shrooms === "active" && G.carrying.shroom >= 4) { Q.meera_shrooms = "done"; G.carrying.shroom = 0; startDialogueTree("meera", null, DIALOGUE.meera.shroomDone); return; }
      if (Q.meera_shrooms === "active") { startDialogueTree("meera", "s_shroom_mid"); return; }
      if (Q.meera_blooms === "done" && !Q.meera_shrooms) { startDialogueTree("meera", "s_shroom_offer"); return; }
      if (Q.meera_promise === "active") { startDialogueTree("meera", "s_promise_mid"); return; }
      if (Q.meera_shrooms === "done" && !Q.meera_promise && G.flags.saw_hollow_night) { startDialogueTree("meera", "s_promise_offer"); return; }
      if (Q.meera_seeds === "active") { Q.meera_seeds = "done"; startDialogueTree("meera", null, DIALOGUE.meera.seedsDone); return; }
      if (!Q.meera_seeds && (G.flags.tower4_lit || G.flags.tower4_dark) && Q.meera_promise === "done") { startDialogueTree("meera", G.flags.tower4_dark ? "s_seeds_dark" : "s_seeds_lit"); return; }
      if (G.flags.tower2_lit && !G.flags.meera_after2) { G.flags.meera_after2 = true; startDialogueTree("meera", "s_after2"); return; }
      if (G.flags.saw_hollow_night && !G.flags.meera_truth) {
        G.flags.meera_truth = true;
        startDialogueTree("meera", "s_truth"); return;
      }
      if (G.flags.tower4_lit && !G.flags.meera_t4) { G.flags.meera_t4 = true; startDialogueTree("meera", "s_t4_lit"); return; }
      if (G.flags.tower4_dark && !G.flags.meera_t4) { G.flags.meera_t4 = true; startDialogueTree("meera", "s_t4_dark"); return; }
      startDialogueTree("meera", null); return;
    }
    if (vid === "vipul") {
      if (G.flags.tower3_lit && !G.flags.knows_truth) { startDialogueTree("vipul", "o_journal"); return; }
      if (Q.vipul_bridge === "active" && G.carrying.log >= 3) {
        G.carrying.log = 0; Q.vipul_bridge = "done"; G.bridgeR3 = true; stampFixedBridges();
        LanternvaleAudio.play("quest_complete");
        applyEffect("kind+1 gear:waders");
        sayLine("Vipul", "Straight ones, every one. (He sights down a log like a rifle.) Right — hold that end. Together now... there. A bridge out of driftwood and spite.", null, { simple: true });
        ui.showBanner("The footbridge stands", "the river is crossed");
        saveRun(); return;
      }
      // expansion: crisis, letter questline, dusk scene, tower-4 reactions
      if (G.flags.knows_truth && !G.flags.crisis_done) { startDialogueTree("vipul", "o_crisis"); return; }
      if (Q.vipul_letter === "active") { startDialogueTree("vipul", "o_letter_mid"); return; }
      if (G.flags.knows_truth && !Q.vipul_letter && Q.vipul_bridge === "done") { startDialogueTree("vipul", "o_letter_offer"); return; }
      if (Q.vipul_dusk === "active") { startDialogueTree("vipul", "o_dusk_mid"); return; }
      if (Q.vipul_letter === "done" && !Q.vipul_dusk) { startDialogueTree("vipul", "o_dusk_offer"); return; }
      if (G.flags.tower4_lit && !G.flags.vipul_t4) { G.flags.vipul_t4 = true; startDialogueTree("vipul", "o_t4_lit"); return; }
      if (G.flags.tower4_dark && !G.flags.vipul_t4) { G.flags.vipul_t4 = true; startDialogueTree("vipul", "o_t4_dark"); return; }
      startDialogueTree("vipul", null); return;
    }
    if (vid === "dev") {
      if (Q.dev_recipe === "active" && G.hasRecipe) {
        G.hasRecipe = false;
        Q.dev_recipe = "done";
        startDialogueTree("dev", null, DIALOGUE.dev.questDone); return;
      }
      // expansion: letter delivery (Vipul->Dev interweave), table, stores, bell, reactions
      if (Q.vipul_letter === "active" && G.flags.letter_carried) { Q.vipul_letter = "done"; G.flags.letter_carried = false; startDialogueTree("dev", null, DIALOGUE.dev.letterDone); return; }
      if (Q.dev_table === "active" && G.flags.wedge_found) { Q.dev_table = "done"; startDialogueTree("dev", null, DIALOGUE.dev.tableDone); return; }
      if (Q.dev_table === "active") { startDialogueTree("dev", "m_table_mid"); return; }
      if (Q.dev_recipe === "done" && !Q.dev_table) { startDialogueTree("dev", "m_table_offer"); return; }
      if (Q.dev_stores === "active" && G.storesStocked >= 5) { Q.dev_stores = "done"; startDialogueTree("dev", null, DIALOGUE.dev.storesDone); return; }
      if (Q.dev_stores === "active") {
        if (G.flags.wrens_folly && !G.flags.wrens_folly_counted) { G.flags.wrens_folly_counted = true; G.storesStocked++; }
        startDialogueTree("dev", "m_stores_mid"); return;
      }
      if (Q.dev_table === "done" && !Q.dev_stores && G.flags.tower3_lit) { startDialogueTree("dev", "m_stores_offer"); return; }
      if (Q.dev_stores === "done" && !G.flags.dev_lantern_named && (G.flags.tower4_lit || G.flags.tower4_dark)) { startDialogueTree("dev", "m_bell_offer"); return; }
      if (G.flags.tower1_lit && !G.flags.dev_bell1) { G.flags.dev_bell1 = true; startDialogueTree("dev", "m_bell1"); return; }
      if (G.flags.tower4_lit && !G.flags.dev_t4) { G.flags.dev_t4 = true; startDialogueTree("dev", "m_t4_lit"); return; }
      if (G.flags.tower4_dark && !G.flags.dev_t4) { G.flags.dev_t4 = true; startDialogueTree("dev", "m_t4_dark"); return; }
      startDialogueTree("dev", null); return;
    }
    if (vid === "shivangi") {
      if (Q.shivangi_coils === "active" && G.carrying.coil >= 3) {
        G.carrying.coil = 0; G.ropeFixed = true; G.terrainDirty = true;
        Q.shivangi_coils = "done";
        startDialogueTree("shivangi", null, DIALOGUE.shivangi.questDone); return;
      }
      // expansion: plans, toll-bell, application questlines + tower-4 reactions
      if (Q.shivangi_plans === "active" && G.flags.plans_read) { Q.shivangi_plans = "done"; startDialogueTree("shivangi", null, DIALOGUE.shivangi.plansDone); return; }
      if (Q.shivangi_plans === "active") { startDialogueTree("shivangi", "v_plans_mid"); return; }
      if (Q.shivangi_coils === "done" && !Q.shivangi_plans) { startDialogueTree("shivangi", "v_plans_offer"); return; }
      if (Q.shivangi_bell === "active" && G.flags.bell_found) {
        Q.shivangi_bell = "done";
        var bellArr = (G.flags.whistle && G.flags.pip_follows && G.flags.bell_found_pip) ? DIALOGUE.shivangi.bellDonePip : DIALOGUE.shivangi.bellDone;
        startDialogueTree("shivangi", null, bellArr); return;
      }
      if (Q.shivangi_bell === "active") { startDialogueTree("shivangi", "v_bell_mid"); return; }
      if (Q.shivangi_plans === "done" && !Q.shivangi_bell) { startDialogueTree("shivangi", "v_bell_offer"); return; }
      if (Q.shivangi_apply === "active" && G.flags.sketch_made) { Q.shivangi_apply = "done"; startDialogueTree("shivangi", null, DIALOGUE.shivangi.applyDone); return; }
      if (Q.shivangi_apply === "active") { startDialogueTree("shivangi", "v_apply_mid"); return; }
      if (Q.shivangi_bell === "done" && !Q.shivangi_apply) { startDialogueTree("shivangi", "v_apply_offer"); return; }
      if (G.flags.tower4_lit && !G.flags.shivangi_t4) { G.flags.shivangi_t4 = true; startDialogueTree("shivangi", "v_t4_lit"); return; }
      if (G.flags.tower4_dark && !G.flags.shivangi_t4) { G.flags.shivangi_t4 = true; startDialogueTree("shivangi", "v_t4_dark"); return; }
      startDialogueTree("shivangi", null); return;
    }
  }

  /* ================= interaction ================= */
  function nearestInteractable() {
    var w = G.world, best = null, bd = 48;
    function consider(x, y, kind, ref) {
      var d = U.dist(G.px, G.py, x, y);
      if (d <= bd) { bd = d; best = { kind: kind, ref: ref, x: x, y: y }; }
    }
    w.villagers.forEach(function (v) { consider(v.x * TILE + 12, v.y * TILE + 12, "villager", v); });
    w.towers.forEach(function (t) { consider(t.x * TILE + 12, t.y * TILE + 12, "tower", t); });
    w.boulders.forEach(function (b) {
      var s = G.boulders[b.id] || { x: b.x, y: b.y };
      if (!b.solved) consider(s.x * TILE + 12, s.y * TILE + 12, "boulder", b);
    });
    w.channels.forEach(function (ch) {
      if (G.channelsSolved[ch.id]) return;
      ch.sluices.forEach(function (s) { consider(s.x * TILE + 12, s.y * TILE + 12, "sluice", { ch: ch, s: s }); });
    });
    [{ m: w.mirrorsR3, id: "mR3" }, { m: w.mirrorsR4, id: "mR4" }, { m: w.mirrorsR5, id: "mR5" }].forEach(function (o) {
      if (!o.m || G.mirrorsSolved[o.id]) return;
      o.m.mirrors.forEach(function (m) { consider(m.x * TILE + 12, m.y * TILE + 12, "mirror", { mz: o.m, id: o.id, m: m }); });
    });
    w.r1planks.forEach(function (p) { if (!p.taken) consider(p.x * TILE + 12, p.y * TILE + 12, "plank", p); });
    w.logs.forEach(function (p) { if (!p.taken) consider(p.x * TILE + 12, p.y * TILE + 12, "log", p); });
    w.coils.forEach(function (p) { if (!p.taken) consider(p.x * TILE + 12, p.y * TILE + 12, "coil", p); });
    if (!G.bridgeR1) w.brookBridge.tiles.forEach(function (t) { consider(t[0] * TILE + 12, t[1] * TILE + 12, "bridgeR1", null); });
    if (!G.bridgeR3) w.bridgeR3.tiles.forEach(function (t) { consider(t[0] * TILE + 12, t[1] * TILE + 12, "bridgeR3", null); });
    w.flora.forEach(function (f) { if (!G.comp.flora[f.id.split("_")[0]]) consider(f.x * TILE + 12, f.y * TILE + 12, "flora", f); });
    w.echoes.forEach(function (e) { if (!G.comp.echoes[e.id]) consider(e.x * TILE + 12, e.y * TILE + 12, "echo", e); });
    if (!G.clover.found) consider(G.clover.x, G.clover.y, "clover", null);
    if (!G.hasRecipe && G.quests.dev_recipe === "active") consider(w.recipePage[0] * TILE + 12, w.recipePage[1] * TILE + 12, "recipe", null);
    // gear fallbacks
    ["stormlantern", "waders", "climbingkit"].forEach(function (g) {
      var need = (g === "stormlantern" && G.beacons[0]) || (g === "waders" && G.beacons[2]) || (g === "climbingkit" && G.beacons[3]);
      if (need && !G.gear[g === "climbingkit" ? "climbing" : g] && !G.gearFallbackTaken[g]) {
        var p = w.gearFallback[g];
        consider(p[0] * TILE + 12, p[1] * TILE + 12, "gearfb", g);
      }
    });
    // alda pages: 9 total (DIALOGUE.journalPages ids alda_1..alda_9, expansion §6)
    if (G.aldaPages.length < 9) {
      var dv0 = w.villagers[0], mm2 = w.villagers[2], vp3 = w.villagers[3];
      var eh = null;
      w.echoes.forEach(function (e) { if (e.id === "echo_heart") eh = e; });
      if (!G.flags.alda_1) consider(dv0.x * TILE + 12, dv0.y * TILE - 30, "alda", "alda_1");
      if (!G.flags.alda_2 && G.beacons[0]) consider(w.towers[0].x * TILE + 12, w.towers[0].y * TILE + 40, "alda", "alda_2");
      if (!G.flags.alda_3) consider((mm2.x + 2) * TILE + 12, (mm2.y - 2) * TILE + 12, "alda", "alda_3");
      if (!G.flags.alda_4 && G.flags.knows_truth) consider(vp3.x * TILE + 12, (vp3.y + 1) * TILE + 12, "alda", "alda_4");
      if (!G.flags.alda_5 && G.beacons[4]) consider(w.overlook.x * TILE, w.overlook.y * TILE, "alda", "alda_5");
      if (!G.flags.alda_6) consider((dv0.x + 2) * TILE + 12, (dv0.y + 2) * TILE + 12, "alda", "alda_6");
      if (!G.flags.alda_7 && G.flags.knows_truth) consider((vp3.x + 1) * TILE + 12, (vp3.y + 1) * TILE + 12, "alda", "alda_7");
      if (!G.flags.alda_8 && isNight() && eh) consider(eh.x * TILE + 12, eh.y * TILE + 12, "alda", "alda_8");
      if (!G.flags.alda_9) consider(w.towers[4].x * TILE + 12, (w.towers[4].y + 2) * TILE + 12, "alda", "alda_9");
    }
    // ---- expansion interactables (MISSIONS.md §2/§3/§5) ----
    var Q2 = G.quests;
    var vDev = w.villagers[0], vWew = w.villagers[1], vMee = w.villagers[2], vVip = w.villagers[3], vShi = w.villagers[4];
    function expTaken(id) { return !!(G.expTaken && G.expTaken[id]); }
    // Wewake S2: fence posts (east line, red twine)
    if (Q2.wewake_fence === "active") {
      for (var fpi = 0; fpi < 3; fpi++) {
        if (!expTaken("fence" + fpi)) consider((vWew.x + 4 + fpi * 2) * TILE + 12, (vWew.y + fpi) * TILE + 12, "fence", fpi);
      }
    }
    // Meera S2: rain-cap mushrooms (rain/fog only, R2 grove floor)
    if (Q2.meera_shrooms === "active" && (G.weather === "rain" || G.weather === "fog" || G.weather === "storm") && G.carrying.shroom < 4) {
      var shSpots = [[-4, 2], [3, -3], [5, 3], [-2, -4], [1, 5], [-5, -1]];
      for (var shi = 0; shi < shSpots.length; shi++) {
        if (!expTaken("shroom" + shi)) consider((vMee.x + shSpots[shi][0]) * TILE + 12, (vMee.y + shSpots[shi][1]) * TILE + 12, "shroom", shi);
      }
    }
    // Dev S3: winter stores items + cellar deposit
    if (Q2.dev_stores === "active") {
      var storeDefs = [
        { id: "apples", x: vMee.x - 4, y: vMee.y + 2 },
        { id: "fish", x: vVip.x + 3, y: vVip.y - 2 },
        { id: "honey", x: 66, y: 44 },
        { id: "cheese", x: vDev.x - 3, y: vDev.y + 3 }
      ];
      storeDefs.forEach(function (sd) {
        if (!expTaken("store_" + sd.id) && G.carrying.stores.indexOf(sd.id) < 0) consider(sd.x * TILE + 12, sd.y * TILE + 12, "storeitem", sd);
      });
      if (G.carrying.stores.length) consider((vDev.x + 2) * TILE + 12, (vDev.y + 2) * TILE + 12, "cellar", null);
    }
    // Wewake S3: lambing pen (night)
    if (Q2.wewake_lambing === "active" && isNight() && !G.flags.lambing_scene) {
      consider((vWew.x - 4) * TILE + 12, (vWew.y - 3) * TILE + 12, "lambpen", null);
    }
    // Dev S2: wedge behind woodpile
    if (Q2.dev_table === "active" && !G.flags.wedge_found) consider((vDev.x + 4) * TILE + 12, (vDev.y + 1) * TILE + 12, "wedge", null);
    // Shivangi S2: Alda's notes in her hut
    if (Q2.shivangi_plans === "active" && !G.flags.plans_read) consider((vShi.x + 1) * TILE + 12, (vShi.y + 1) * TILE + 12, "plans", null);
    // Shivangi S3: toll-bell (east cliff scrub)
    if (Q2.shivangi_bell === "active" && !G.flags.bell_found) consider(74 * TILE + 12, 22 * TILE + 12, "bell", null);
    // Shivangi S4: sketch the bridge (south bank)
    if (Q2.shivangi_apply === "active" && !G.flags.sketch_made) consider(84 * TILE + 12, 16 * TILE + 12, "sketch", null);
    // quiet moment: star map (lie down at ridge, night, before tower 5)
    if (isNight() && !G.beacons[4] && !G.flags.qm_stars) consider(89 * TILE + 12, 10 * TILE + 12, "liedown", null);
    // second entities
    if (Q2.meera_promise === "active" && isNight()) consider(63 * TILE + 12, 40 * TILE + 12, "hollowmeera", null);
    if (Q2.vipul_dusk === "active" && phaseOfDay() === "dusk") consider(w.towers[2].x * TILE + 12, (w.towers[2].y + 2) * TILE + 12, "vipuldusk", null);
    return best;
  }

  function doInteract() {
    var it = nearestInteractable();
    if (!it) return;
    var w = G.world;
    LanternvaleAudio.play("ui_click");
    switch (it.kind) {
      case "villager": talkTo(it.ref.id); break;
      case "tower": interactTower(it.ref); break;
      case "boulder": {
        var b = it.ref, s = G.boulders[b.id] || { x: b.x, y: b.y };
        // nudge toward socket
        var dx = Math.sign(b.sx - s.x), dy = Math.sign(b.sy - s.y);
        if (dx && canPushTo(b, s.x + dx, s.y)) pushBoulder(b, s.x + dx, s.y);
        else if (dy && canPushTo(b, s.x, s.y + dy)) pushBoulder(b, s.x, s.y + dy);
        else sayLine("Wren", "It won't budge that way. Boulders are stubborn like that.", null, { simple: true });
        break;
      }
      case "sluice": {
        var sl = it.ref;
        sl.s.ori = (sl.s.ori + 1) % 4;
        LanternvaleAudio.play("mirror_turn");
        var ch = sl.ch;
        G.sluices[ch.id] = ch.sluices.map(function (x) { return x.ori; });
        if (ch.sluices.every(function (x) { return x.ori === x.sol; })) {
          G.channelsSolved[ch.id] = true; ch.solved = true;
          LanternvaleAudio.play("water_pour");
          ui.showBanner("Water runs true", "the old channel wakes");
          saveRun();
        }
        break;
      }
      case "mirror": {
        var mo = it.ref;
        mo.m.ori = (mo.m.ori + 1) % 8;
        LanternvaleAudio.play("mirror_turn");
        G.mirrors[mo.id] = mo.mz.mirrors.map(function (x) { return x.ori; });
        var tr = w.traceBeam(mo.mz.src, mo.mz.emitDir, mo.mz.mirrors);
        if (tr.end[0] === mo.mz.dish.x && tr.end[1] === mo.mz.dish.y) {
          G.mirrorsSolved[mo.id] = true; mo.mz.solved = true;
          LanternvaleAudio.play("mirror_align");
          ui.showBanner("Light finds its mark", "the receiver glows");
          saveRun();
        }
        break;
      }
      case "plank": it.ref.taken = true; G.carrying.plank++; LanternvaleAudio.play("bridge_plank"); ui.showBanner("Plank shouldered", G.carrying.plank + " of 3"); break;
      case "log": it.ref.taken = true; G.carrying.log++; LanternvaleAudio.play("bridge_plank"); ui.showBanner("Driftwood log", G.carrying.log + " of 3 — bring them to Vipul"); break;
      case "coil": it.ref.taken = true; G.carrying.coil++; LanternvaleAudio.play("bridge_plank"); ui.showBanner("Rope coil", G.carrying.coil + " of 3 — bring them to Shivangi"); break;
      case "bridgeR1":
        if (G.carrying.plank >= 3) {
          G.carrying.plank -= 3; G.bridgeR1 = true; stampFixedBridges();
          LanternvaleAudio.play("quest_complete");
          ui.showBanner("The brook bridge stands", "the way north opens");
          saveRun();
        } else sayLine("Wren", "Three good planks would mend this. They're scattered by the brook.", null, { simple: true });
        break;
      case "bridgeR3":
        sayLine("Wren", "The bridge is out. Vipul wants three driftwood logs — or I could ask him about it.", null, { simple: true });
        break;
      case "flora": inspectFlora(it.ref); break;
      case "echo": readEcho(it.ref); break;
      case "clover":
        G.clover.found = true; G.clover.following = true;
        LanternvaleAudio.play("quest_accept");
        sayLine("Wren", "(You untangle Clover from the brambles. He headbutts your knee, hard, then follows you like a dog.) Lead him back to Wewake.", null, { simple: true });
        break;
      case "recipe":
        G.hasRecipe = true;
        LanternvaleAudio.play("page_turn");
        sayLine("Wren", "(Behind the turnip barrels: the torn page, Alda's handwriting in the margin — \"more thyme than you'd think.\") Bring it to Dev.", null, { simple: true });
        break;
      case "gearfb": checkGearFallback(it.ref, true); break;
      case "alda": readAldaPage(it.ref); break;
      // ---- expansion interactables ----
      case "fence": {
        G.expTaken["fence" + it.ref] = true; G.fenceMended++;
        LanternvaleAudio.play("bridge_plank");
        ui.showBanner(G.fenceMended >= 3 ? "The east line stands" : "Fence post mended", G.fenceMended + " of 3 — bring the news to Wewake");
        saveRun(); break;
      }
      case "shroom": {
        G.expTaken["shroom" + it.ref] = true; G.carrying.shroom++;
        LanternvaleAudio.play("flora_log");
        ui.showBanner("Rain-cap", G.carrying.shroom + " of 4 — bring them to Meera");
        saveRun(); break;
      }
      case "storeitem": {
        G.expTaken["store_" + it.ref.id] = true; G.carrying.stores.push(it.ref.id);
        LanternvaleAudio.play("page_turn");
        var sNames = { apples: "Orchard apples", fish: "Smoked fish", honey: "Hive honey", cheese: "Dairy cheese" };
        ui.showBanner(sNames[it.ref.id] || "Winter stores", "stow it in Dev's cellar");
        saveRun(); break;
      }
      case "cellar": {
        var depN = G.carrying.stores.length;
        G.carrying.stores = []; G.storesStocked += depN;
        LanternvaleAudio.play("quest_complete");
        ui.showBanner("Cellar stocked", G.storesStocked + " of 5 — tell Dev");
        saveRun(); break;
      }
      case "lambpen": {
        G.flags.lambing_scene = true;
        ui.requestVO("lambing");
        LanternvaleAudio.play("flora_log");
        sayLine("Wren", "(The pen is warm with breath. Wewake nods at the ewe, at you, at the lantern. No fuss. Just steady hands.)", null, { simple: true });
        saveRun(); break;
      }
      case "wedge": {
        G.flags.wedge_found = true;
        LanternvaleAudio.play("page_turn");
        sayLine("Wren", "(Behind the woodpile: the missing wedge, exactly where Dev lent it and exactly where she forgot.) Bring it to Dev.", null, { simple: true });
        saveRun(); break;
      }
      case "plans": {
        G.flags.plans_read = true;
        LanternvaleAudio.play("page_turn");
        sayLine("Wren", "(Alda's notes, in red ink, all over Shivangi's beautiful plans. She was right about the sway. Bring the news back.)", null, { simple: true });
        saveRun(); break;
      }
      case "bell": {
        G.flags.bell_found = true;
        if (G.flags.whistle && G.flags.pip_follows) G.flags.bell_found_pip = true;
        LanternvaleAudio.play("mirror_align");
        ui.showBanner("The toll-bell", G.flags.bell_found_pip ? "Pip found it first" : "it rings in the wind");
        saveRun(); break;
      }
      case "sketch": {
        G.flags.sketch_made = true;
        LanternvaleAudio.play("page_turn");
        sayLine("Wren", "(You sketch the bridge the way it should be — Alda's red-ink corrections and all. Show Shivangi.)", null, { simple: true });
        saveRun(); break;
      }
      case "liedown": {
        G.flags.qm_stars = true;
        ui.requestVO("star_map");
        startDialogueTree("quietMoments", null, DIALOGUE.quietMoments.stars);
        saveRun(); break;
      }
      case "hollowmeera": {
        G.quests.meera_promise = "done";
        ui.requestVO("hollow_promise");
        startDialogueTree("meera", null, DIALOGUE.meera.promiseDone);
        saveRun(); break;
      }
      case "vipuldusk": {
        G.quests.vipul_dusk = "done";
        ui.requestVO("vipul_dusk");
        startDialogueTree("vipul", null, DIALOGUE.vipul.duskDone);
        saveRun(); break;
      }
    }
  }

  function canPushTo(b, nx, ny) {
    var ctxw = walkCtx();
    delete ctxw.boulders[b.id];
    if (!W2.walkable(G.world, nx, ny, ctxw) || boulderAt(nx, ny)) return false;
    return Math.abs(nx - b.sx) <= 3 && Math.abs(ny - b.sy) <= 3;
  }
  function pushBoulder(b, nx, ny) {
    G.boulders[b.id] = { x: nx, y: ny };
    LanternvaleAudio.play("boulder_nudge");
    if (nx === b.sx && ny === b.sy) {
      b.solved = true; G.boulders[b.id].solved = true;
      LanternvaleAudio.play("boulder_settle");
      ui.showBanner("The boulder settles", "the way opens");
      saveRun();
    }
  }

  function inspectFlora(f) {
    var base = f.id.split("_")[0];
    if (f.night && !isNight()) { sayLine("Wren", "Something sleeps here. Meera's notes say it only wakes in true dark.", null, { simple: true }); return; }
    if (f.fog && !(G.weather === "fog" || G.weather === "storm")) {
      // still loggable, but note the condition
    }
    G.comp.flora[base] = true;
    LanternvaleAudio.play("flora_log");
    var nm = W2.FLORA.filter(function (x) { return x.id === base; })[0];
    ui.showBanner(nm ? nm.name : "New flora", "pressed into the journal");
    if (base === "bloom" || base === "moonpetal" || base === "fogmirror" || base === "gloomcap") {
      G.bloomsLogged++;
      LanternvaleAudio.play("night_bloom_open");
      if (G.quests.meera_blooms === "active" && G.bloomsLogged >= 3)
        ui.showBanner("Three blooms logged", "bring your notes to Meera");
    }
    saveRun();
  }

  function readEcho(e) {
    G.comp.echoes[e.id] = true;
    LanternvaleAudio.play("echo_log");
    var texts = {
      echo1: "Alda: \u201CThe valley walks you, if you let it. I stopped checking the time on day two.\u201D",
      echo2: "Alda: \u201CThe towers were never about warnings. They were about being seen. A lit valley says: someone is home.\u201D",
      echo3: "Alda: \u201COlin asked why I smile at the dark towers. I couldn't say it yet. Soon.\u201D",
      echo4: "Alda: \u201CSable showed me the bloom tonight. Cathedrals have less blue in them. This page stays unmarked.\u201D",
      echo5: "Alda: \u201CIf you're reading this, Wren: the long way was the whole assignment. The map was just the excuse.\u201D",
      echo_heart: "The bloom heart. Blue as a held breath. You understand, all at once, why she kept the towers dark."
    };
    if (e.id === "echo_heart") {
      G.flags.bloomHeart = true;
      LanternvaleAudio.play("deeplight_discover");
      ui.showBanner("The bloom heart", "the valley's secret, found");
      // quiet moment: Alda's pencil (expansion §3) — plays once, in place of the echo text
      if (!G.flags.qm_pencil && DIALOGUE.quietMoments && DIALOGUE.quietMoments.pencil) {
        G.flags.qm_pencil = true;
        startDialogueTree("quietMoments", null, DIALOGUE.quietMoments.pencil);
        saveRun(); return;
      }
    }
    sayLine(e.id === "echo_heart" ? "The bloom heart" : "Echo stone", texts[e.id] || "...", null, { simple: true });
    saveRun();
  }

  function readAldaPage(kind) {
    // kind like "alda_3"; full texts live in DIALOGUE.journalPages (expansion §6)
    if (G.flags[kind]) return;
    var pg = null;
    (DIALOGUE.journalPages || []).forEach(function (p) { if (p.id === kind) pg = p; });
    if (!pg) return;
    G.flags[kind] = true;
    G.aldaPages.push({ title: "Alda's page — " + (pg.found || kind), text: pg.text });
    LanternvaleAudio.play("page_turn");
    sayLine("Alda's journal", pg.text, null, { simple: true });
    saveRun();
  }

  function towerGateHint(id) {
    var w = G.world;
    if (id === 1 && !w.boulders[0].solved) return "The stair is blocked by a fallen boulder. It wants pushing — east, into the worn hollow.";
    if (id === 2 && !G.channelsSolved.chR2) return "The tower door is barred by the old sluice mechanism. The water channel needs all three sluices running true.";
    if (id === 3 && !G.bridgeR3) return "The tower stands across the river. Vipul's footbridge is the way over.";
    if (id === 4 && !G.mirrorsSolved.mR4) return "A mirror platform guards the stair. Stand in the marked circle at night and turn the mirror until the light finds the dish.";
    if (id === 4 && !G.gear.stormlantern) return "The hollow swallows ordinary lamps. You'll want a storm-lantern — Dev at the inn owes you one, if you find her recipe page.";
    if (id === 5 && !G.ropeFixed) return "Shivangi's rope bridge hangs slack. Three rope coils, cliff scrub, red twine — then she'll tension it.";
    if (id === 5 && !G.gear.climbing) return "The cliff path needs a climbing kit. Shivangi lends hers when the bridge is tensioned.";
    if (id === 5 && (!G.channelsSolved.chR5 || !G.mirrorsSolved.mR5)) return "The old wheel-and-mirror engine guards the last stair. Water first, then light.";
    return null;
  }

  function interactTower(tower) {
    var id = tower.id;
    if (id === 4 && (tower.lit || G.flags.tower4_dark || G.flags.tower4_lit)) {
      // reversible choice, any visit: clear both flags so the new choice resolves cleanly
      G.flags.tower4_lit = false; G.flags.tower4_dark = false;
      startDialogueTree("tower4Choice", null);
      return;
    }
    if (tower.lit) { sayLine("Wren", "The beacon burns steady. " + tower.name + " is awake.", null, { simple: true }); return; }
    var hint = towerGateHint(id);
    if (hint) { sayLine("Wren", hint, null, { simple: true }); return; }
    // tower rite ceremony (expansion): play the rite dialogue first, then light
    if (!G.flags["tower" + id + "_rite"] && DIALOGUE.towerRites && DIALOGUE.towerRites["tower" + id]) {
      startDialogueTree("towerRites", null, DIALOGUE.towerRites["tower" + id]);
      if (G.dlg) {
        (function (tid, tw) {
          G.dlg.onDone = function () {
            G.flags["tower" + tid + "_rite"] = true;
            G.lightSeq = { stage: "climb", t: 0, tower: tw };
            ui.showBanner("Climbing " + tw.name, "the wind is kinder up here");
            saveRun();
          };
        })(id, tower);
      }
      return;
    }
    // begin lighting sequence
    G.lightSeq = { stage: "climb", t: 0, tower: tower };
    ui.showBanner("Climbing " + tower.name, "the wind is kinder up here");
  }

  // tower-4 choice resolves in endDialogue -> resolveTower4()

  /* ================= photo mode ================= */
  function doSnap(sr) {
    // render the frozen viewfinder region to a thumbnail
    var zw = VW / sr.zoom, zh = VH / sr.zoom;
    var cx = G.photoCam ? G.photoCam.x : G.camX + VW / 2, cy = G.photoCam ? G.photoCam.y : G.camY + VH / 2;
    var sx = U.clamp(cx + sr.panX - zw / 2, 0, GW * TILE - zw), sy = U.clamp(cy + sr.panY - zh / 2, 0, GH * TILE - zh);
    // score: find best subject in frame
    var scored = scorePhoto(sx, sy, zw, zh);
    var thumb = document.createElement("canvas");
    thumb.width = 160; thumb.height = 107;
    var tctx = thumb.getContext("2d");
    renderWorldTo(tctx, sx, sy, 160, 107, zw, zh, true);
    var url = thumb.toDataURL("image/png");
    var label = scored.label || "";
    var caption = scored.caption;
    ui.addPhoto(url, caption, label);
    LanternvaleAudio.play("shutter");
    // photo challenge P5: Dev's line for the inn at dusk
    if (label === "photo:inn-dusk" && !G.flags.dev_photo_wall) {
      G.flags.dev_photo_wall = true;
      ui.showBanner("Dev", "That's going on the inn wall.");
    }
    // compendium consequences
    if (scored.faunaId) {
      G.comp.fauna[scored.faunaId] = true;
      LanternvaleAudio.play("fauna_log");
      ui.showBanner("Photographed: " + scored.faunaName, scored.score >= 3 ? "a postcard!" : "logged in the journal");
    }
    if (scored.vistaId && !G.comp.vistas[scored.vistaId]) {
      var v = G.world.vistas.filter(function (x) { return x.id === scored.vistaId; })[0];
      var ok = true;
      if (v.star === "dawn" && !isDawn()) ok = false;
      if (v.star === "storm" && G.weather !== "storm") ok = false;
      if (v.star === "fivelights" && !(G.beacons.filter(Boolean).length === 5 && isNight())) ok = false;
      if (ok && scored.score >= (v.star ? 3 : 2)) {
        G.comp.vistas[v.id] = true; v.found = true; v.postcard = scored.score >= 3;
        LanternvaleAudio.play("vista_chime");
        ui.showBanner(v.name, scored.score >= 3 ? "a postcard!" : "logged in the journal");
      } else if (ok) {
        ui.showBanner(v.name, v.star ? "needs a postcard-quality shot" : "logged");
        if (!v.star) { G.comp.vistas[v.id] = true; v.found = true; }
      }
    }
    if (scored.bloomId) {
      var f = G.world.flora.filter(function (x) { return x.id === scored.bloomId; })[0];
      if (f) inspectFlora(f);
    }
    saveRun();
  }

  function scorePhoto(sx, sy, zw, zh) {
    var w = G.world, best = null, bs = -1;
    function subjFrame(px, py) {
      var fx = (px - sx) / zw, fy = (py - sy) / zh;
      var framed = Math.abs(fx - 0.5) < 0.15 && Math.abs(fy - 0.5) < 0.15;
      var inFrame = fx > 0.05 && fx < 0.95 && fy > 0.05 && fy < 0.95;
      return { framed: framed, inFrame: inFrame };
    }
    // fauna
    w.fauna.forEach(function (f) {
      var base = f.id.split("_")[0];
      if (G.comp.fauna[base] && f.pose <= 0) return;
      if (f.night && !isNight()) return;
      var px = f.x * TILE + 12, py = f.y * TILE + 12;
      var sf = subjFrame(px, py);
      if (!sf.inFrame) return;
      var score = 1 + (sf.framed ? 1 : 0) + (f.pose > 0 ? 1 : 0);
      if (score > bs) { bs = score; best = { score: score, faunaId: base, faunaName: f.name, caption: f.name + " — " + (score >= 3 ? "a postcard" : "a keepsake") }; }
    });
    // vistas
    w.vistas.forEach(function (v) {
      var px = v.x * TILE + 12, py = v.y * TILE + 12;
      var sf = subjFrame(px, py);
      if (!sf.inFrame) return;
      var score = 1 + (sf.framed ? 1 : 0);
      var lightOk = true;
      if (v.star === "dawn" && !isDawn()) lightOk = false;
      if (v.star === "storm" && G.weather !== "storm") lightOk = false;
      if (v.star === "fivelights" && !(G.beacons.filter(Boolean).length === 5 && isNight())) lightOk = false;
      if (lightOk) score += 1;
      if (score > bs) { bs = score; best = { score: score, vistaId: v.id, caption: v.name + (score >= 3 ? " — a postcard" : "") }; }
    });
    // night blooms
    w.flora.forEach(function (f) {
      if (!f.night || !isNight()) return;
      var px = f.x * TILE + 12, py = f.y * TILE + 12;
      var sf = subjFrame(px, py);
      if (!sf.inFrame) return;
      var score = 1 + (sf.framed ? 1 : 0) + 1;
      if (score > bs) { bs = score; best = { score: score, bloomId: f.id, caption: f.name + " — night bloom" }; }
    });
    // photo challenge labels (expansion §3): detect the 5 challenge conditions
    if (best && best.score > 0) {
      var dv = w.villagers[0], ov = w.overlook, b3 = w.bridgeR3;
      var nearT = function (tx, ty, r) { return U.dist(G.px, G.py, tx * TILE + 12, ty * TILE + 12) < r; };
      if (isDawn() && nearT(b3.x, b3.y + 8, 150)) best.label = "photo:dawn-ford";
      else if (G.weather === "storm" && nearT(ov.x, ov.y, 220)) best.label = "photo:storm-vale";
      else if (G.beacons.filter(Boolean).length === 5 && isNight() && nearT(ov.x, ov.y, 220)) best.label = "photo:five-lights";
      else if (G.flags.pip_follows) best.label = "photo:pip";
      else if (phaseOfDay() === "dusk" && nearT(dv.x, dv.y, 170)) best.label = "photo:inn-dusk";
    }
    return best || { score: 0, caption: "a quiet moment" };
  }

  /* ================= endings ================= */
  function compendiumCount() {
    var n = 0;
    ["flora", "fauna", "echoes", "vistas"].forEach(function (k) { for (var id in G.comp[k]) if (G.comp[k][id]) n++; });
    return n;
  }
  function doEnding() {
    var n = compendiumCount(), beacons = G.beacons.filter(Boolean).length;
    var key, vo;
    if (G.flags.bloomHeart && G.tower4dark === true) { key = "deeplight"; vo = "ending_deeplight"; }
    else if (beacons === 5 && n >= 29) { key = "cartographer"; vo = "ending_cartographer"; }
    else if (beacons === 5 && G.kindness >= 4) { key = "longway"; vo = "ending_longway"; }
    else { key = "quiet"; vo = "ending_quiet"; }
    var E = DIALOGUE.endings[key] || DIALOGUE.endings.cartographer;
    // modular epilogue builder (expansion §7): base + conditional inserts
    var epilogue = E.card;
    var EE = DIALOGUE.endingEpilogues && DIALOGUE.endingEpilogues[key];
    if (EE) {
      epilogue += "\n\n" + EE.base;
      (EE.inserts || []).forEach(function (ins) {
        if (condTrue(ins.if)) epilogue += " " + ins.text;
      });
    }
    ui.requestVO(vo || "ending_quiet");
    saveRun();
    ui.showEnding(E.title, epilogue, {
      beacons: beacons, compendium: compendiumPct(), kindness: G.kindness, seed: G.seed
    });
    LanternvaleAudio.play("ending_" + (key === "quiet" ? "longway" : key));
  }

  /* ================= rendering ================= */
  var terrainCv = null, lightCv = null;
  var particles = [];

  var TILE_COLORS = {};
  TILE_COLORS[T.MEADOW] = "#9dc08b"; TILE_COLORS[T.GROVEFLOOR] = "#7ba768";
  TILE_COLORS[T.PATH] = "#d9c08f"; TILE_COLORS[T.RIVER] = "#5f9db8";
  TILE_COLORS[T.FORD] = "#8fc3d4"; TILE_COLORS[T.BRIDGE] = "#a9805a";
  TILE_COLORS[T.BROKENBRIDGE] = "#8a6a4a"; TILE_COLORS[T.CLIFF] = "#8d8578";
  TILE_COLORS[T.CLIFFPATH] = "#b3a88f"; TILE_COLORS[T.HOLLOWDARK] = "#3d4a5a";
  TILE_COLORS[T.TREE] = "#5d8a52"; TILE_COLORS[T.STONE] = "#b9b2a4";
  TILE_COLORS[T.SAND] = "#e3d3a3"; TILE_COLORS[T.FLOWERS] = "#a8c78f";
  TILE_COLORS[T.WOOD] = "#9a744e"; TILE_COLORS[T.REED] = "#7fb3a8";
  TILE_COLORS[T.CHANNEL] = "#6fa8c0";

  function buildTerrain() {
    var w = G.world;
    terrainCv = document.createElement("canvas");
    terrainCv.width = GW * TILE; terrainCv.height = GH * TILE;
    var c = terrainCv.getContext("2d");
    var rng = U.mulberry32(w.seed ^ 0x77);
    for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) {
      var t = w.tiles[W2.idx(x, y)];
      var base = TILE_COLORS[t] || "#9dc08b";
      c.fillStyle = base;
      c.fillRect(x * TILE, y * TILE, TILE, TILE);
      // speckle
      var sp = U.hash2(x, y, w.seed + 5);
      if (sp > 0.72) {
        c.fillStyle = "rgba(0,0,0,0.08)";
        c.fillRect(x * TILE + (sp * 97) % 20, y * TILE + (sp * 61) % 20, 3, 3);
      }
      if (t === T.FLOWERS && sp > 0.4) {
        c.fillStyle = ["#e8e8f0", "#f2c14e", "#d97b8f"][(x + y) % 3];
        c.fillRect(x * TILE + 6 + (sp * 40) % 10, y * TILE + 6 + (sp * 30) % 10, 4, 4);
      }
      if (t === T.RIVER || t === T.CHANNEL) {
        c.fillStyle = "rgba(255,255,255,0.10)";
        c.fillRect(x * TILE + ((y * 7) % 18), y * TILE + 4, 8, 2);
      }
      if (t === T.TREE) {
        c.fillStyle = "#4a7342";
        c.beginPath(); c.arc(x * TILE + 12, y * TILE + 10, 10, 0, 7); c.fill();
        c.fillStyle = "#5d8a52";
        c.beginPath(); c.arc(x * TILE + 9, y * TILE + 7, 6, 0, 7); c.fill();
        c.fillStyle = "#6b4a2f"; c.fillRect(x * TILE + 10, y * TILE + 12, 4, 8);
      }
      if (t === T.PATH && rng() > 0.8) {
        c.fillStyle = "rgba(120,90,50,0.25)";
        c.fillRect(x * TILE + 4 + rng() * 14, y * TILE + 8 + rng() * 8, 5, 3);
      }
    }
    // broken bridges: draw gaps
    c.fillStyle = "#5f9db8";
    w.brookBridge.tiles.forEach(function (t2) {
      if (!G.bridgeR1) c.fillRect(t2[0] * TILE, t2[1] * TILE, TILE, TILE);
    });
    w.bridgeR3.tiles.forEach(function (t2) {
      if (!G.bridgeR3) c.fillRect(t2[0] * TILE, t2[1] * TILE, TILE, TILE);
    });
    G.terrainDirty = false;
  }

  // pixel-art helper
  function px(c, map, pal, x, y, s, flip) {
    for (var r = 0; r < map.length; r++) {
      var row = map[r];
      for (var i = 0; i < row.length; i++) {
        var ch = flip ? row[row.length - 1 - i] : row[i];
        if (ch === "." || ch === " ") continue;
        c.fillStyle = pal[ch] || "#f0f";
        c.fillRect(x + i * s, y + r * s, s, s);
      }
    }
  }
  var WREN_DOWN = [
    ".....hh.....",
    "....hhhh....",
    "...hffffh...",
    "...hffffh...",
    "....ffff....",
    ".....bb.....",
    "...bbbbbb...",
    "..bbbbbBbb..",
    "..b.bb.bb...",
    "..b.bb.bb...",
    "...ll..ll...",
    "...ll..ll...",
    "..lll..lll.."
  ];
  var WREN_UP = [
    ".....hh.....",
    "....hhhh....",
    "...hhhhhh...",
    "...hhhhhh...",
    "....bbbb....",
    ".....bb.....",
    "...bbbbbb...",
    "..bbbbbBbb..",
    "..b.bb.bb...",
    "..b.bb.bb...",
    "...ll..ll...",
    "...ll..ll...",
    "..lll..lll.."
  ];
  var WREN_PAL = { h: "#7a5230", f: "#f2c89b", b: "#4f6b8a", B: "#e8a34e", l: "#3a2c1c" };
  var VILLAGER_MAP = [
    ".....hh.....",
    "....hhhh....",
    "...hffffh...",
    "...hffffh...",
    "....ffff....",
    ".....cc.....",
    "...cccccc...",
    "..ccccccc...",
    "..c.cc.cc...",
    "...cc.cc....",
    "...ll..ll...",
    "..lll..lll.."
  ];

  function drawWren(c, x, y, dir, phase, moving) {
    var bob = moving ? Math.round(Math.sin(phase) * 1.5) : 0;
    var map = dir === 1 ? WREN_UP : WREN_DOWN;
    var flip = dir === 2;
    px(c, map, WREN_PAL, x - 11, y - 24 + bob, 2, flip);
    // lantern glow in hand at night
    if (phaseOfDay() === "night" || phaseOfDay() === "dusk") {
      c.fillStyle = "rgba(255,190,90,0.9)";
      c.fillRect(x + (dir === 2 ? -16 : 12), y - 12 + bob, 4, 5);
    }
  }
  function drawVillager(c, v, x, y) {
    var pals = {
      dev: { h: "#8a8a8a", f: "#f2c89b", c: "#a34e5e", l: "#3a2c1c" },
      wewake: { h: "#4a3520", f: "#e8b88b", c: "#6b7a4a", l: "#3a2c1c" },
      meera: { h: "#2f1f18", f: "#f2c89b", c: "#3f6b4f", l: "#3a2c1c" },
      vipul: { h: "#cccccc", f: "#e8b88b", c: "#4a5a6b", l: "#3a2c1c" },
      shivangi: { h: "#6b3a20", f: "#f2c89b", c: "#7a5a3a", l: "#3a2c1c" }
    };
    px(c, VILLAGER_MAP, pals[v.id] || pals.wewake, x - 11, y - 22, 2, false);
    // talk cue while tutorial beat active
    if (ui.tut.active && ui.tut.active.id === "wewake" && v.id === "wewake") {
      c.fillStyle = "#e8a34e";
      c.font = "bold 14px system-ui"; c.textAlign = "center";
      c.fillText("✦", x, y - 30 + Math.sin(ui.t * 4) * 3);
    }
  }
  function drawTower(c, t, x, y, time) {
    // stone tower
    c.fillStyle = "#9a938a";
    c.fillRect(x - 14, y - 64, 28, 64);
    c.fillStyle = "#847d73";
    c.fillRect(x - 14, y - 64, 28, 6);
    c.fillRect(x - 18, y - 70, 36, 8);
    c.fillStyle = "#6b655c";
    c.fillRect(x - 4, y - 20, 8, 20); // door
    for (var i = 0; i < 4; i++) { c.fillStyle = "rgba(0,0,0,0.12)"; c.fillRect(x - 14, y - 56 + i * 14, 28, 2); }
    // brazier
    c.fillStyle = "#4a443c";
    c.fillRect(x - 8, y - 78, 16, 8);
    if (t.lit) {
      var fl = 0.7 + 0.3 * Math.sin(time * 6 + t.id);
      var g = c.createRadialGradient(x, y - 84, 4, x, y - 84, 46 * fl);
      g.addColorStop(0, "rgba(255,200,110,0.95)");
      g.addColorStop(0.4, "rgba(255,160,70,0.45)");
      g.addColorStop(1, "rgba(255,140,50,0)");
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y - 84, 46 * fl, 0, 7); c.fill();
      c.fillStyle = "#ffd98a";
      c.beginPath(); c.arc(x, y - 82, 6 * fl, 0, 7); c.fill();
    } else {
      // tutorial ring highlight on tower 1
      if (t.id === 1 && ui.tut.active && ui.tut.active.id === "tower") {
        c.strokeStyle = "rgba(232,163,78," + (0.5 + 0.3 * Math.sin(time * 3)) + ")";
        c.lineWidth = 3;
        c.beginPath(); c.arc(x, y - 30, 34 + 4 * Math.sin(time * 3), 0, 7); c.stroke();
      }
      c.fillStyle = "#3a352f";
      c.fillRect(x - 5, y - 80, 10, 4);
    }
  }
  function drawFlora(c, f, x, y, time, night) {
    var colors = { poppy: "#f2c14e", reed: "#6b9a5a", foxglove: "#d97b8f", bracken: "#4f7d36", clover: "#5da24f", thistle: "#9a6bc2", willowherb: "#e88fb0", mosscap: "#8a9a7a", bloom: "#6fb7ff", moonpetal: "#dfe8ff", fogmirror: "#9fe8ff", gloomcap: "#7a8fd0" };
    var base = f.id.split("_")[0];
    var col = colors[base] || "#7fbf6a";
    var glow = f.night && night;
    if (glow) {
      var g = c.createRadialGradient(x, y - 6, 1, x, y - 6, 16 + 4 * Math.sin(time * 2 + x));
      g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y - 6, 20, 0, 7); c.fill();
    }
    c.fillStyle = "#3f6b3a";
    c.fillRect(x - 1, y - 10, 2, 10);
    c.fillStyle = col;
    c.beginPath(); c.arc(x, y - 12, glow ? 5 : 4, 0, 7); c.fill();
    if (base === "foxglove" || base === "thistle") { c.fillRect(x - 2, y - 22, 4, 10); c.beginPath(); c.arc(x, y - 24, 4, 0, 7); c.fill(); }
  }
  function drawFauna(c, f, x, y, time) {
    var base = f.id.split("_")[0];
    c.fillStyle = "#3a2c1c";
    if (base === "deer") {
      c.fillStyle = "#9a7350";
      c.fillRect(x - 8, y - 14, 16, 10); c.fillRect(x + 6, y - 20, 6, 8); c.fillRect(x - 6, y - 4, 3, 6); c.fillRect(x + 4, y - 4, 3, 6);
      c.strokeStyle = "#9a7350"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x + 7, y - 20); c.lineTo(x + 4, y - 26); c.moveTo(x + 10, y - 20); c.lineTo(x + 12, y - 26); c.stroke();
    } else if (base === "heron") {
      c.fillStyle = "#8a94a0"; c.fillRect(x - 6, y - 16, 12, 6); c.fillRect(x + 4, y - 26, 3, 12);
      c.fillStyle = "#f0f0f0"; c.fillRect(x + 4, y - 28, 7, 4);
    } else if (base === "kingfisher") {
      c.fillStyle = "#2f8fc2"; c.beginPath(); c.arc(x, y - 8, 5, 0, 7); c.fill();
      c.fillStyle = "#e07b39"; c.fillRect(x - 3, y - 6, 6, 3);
    } else if (base === "otter" || base === "frog") {
      c.fillStyle = base === "otter" ? "#7a5a40" : "#5da24f";
      c.beginPath(); c.ellipse(x, y - 5, 8, 4, 0, 0, 7); c.fill();
    } else if (base === "squirrel") {
      c.fillStyle = "#b25a30"; c.beginPath(); c.arc(x, y - 8, 5, 0, 7); c.fill();
      c.fillRect(x + 3, y - 14, 3, 8);
    } else if (base === "firefly") {
      c.fillStyle = "rgba(255,240,160," + (0.5 + 0.5 * Math.sin(time * 5 + x)) + ")";
      c.beginPath(); c.arc(x + Math.sin(time + y) * 6, y - 10 + Math.cos(time * 1.3 + x) * 4, 2.5, 0, 7); c.fill();
    } else if (base === "moth") {
      c.fillStyle = "#dfe8ff";
      var wob = Math.sin(time * 8) * 3;
      c.beginPath(); c.ellipse(x - 3, y - 10, 4, 6, -0.4 + wob * 0.05, 0, 7); c.fill();
      c.beginPath(); c.ellipse(x + 3, y - 10, 4, 6, 0.4 - wob * 0.05, 0, 7); c.fill();
    }
    if (f.pose > 0) {
      c.fillStyle = "#e8a34e"; c.font = "bold 12px system-ui"; c.textAlign = "center";
      c.fillText("!", x, y - 30);
    }
  }
  function drawBoulder(c, x, y) {
    c.fillStyle = "#8d8578";
    c.beginPath(); c.arc(x, y - 10, 13, 0, 7); c.fill();
    c.fillStyle = "#a39c8e";
    c.beginPath(); c.arc(x - 4, y - 14, 6, 0, 7); c.fill();
  }
  function drawSluice(c, s, x, y, solved) {
    c.fillStyle = "#6b4a2f";
    c.fillRect(x - 10, y - 16, 20, 16);
    c.strokeStyle = solved ? "#6fb7ff" : "#e8a34e";
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(x, y - 8);
    var a = s.ori * Math.PI / 2;
    c.lineTo(x + Math.cos(a) * 8, y - 8 + Math.sin(a) * 8); c.stroke();
    if (solved) { c.fillStyle = "rgba(111,183,255,0.5)"; c.fillRect(x - 10, y - 16, 20, 16); }
  }
  function drawMirror(c, m, x, y, solved) {
    c.fillStyle = "#8d8578";
    c.fillRect(x - 8, y - 4, 16, 4);
    c.save(); c.translate(x, y - 12); c.rotate(m.ori * Math.PI / 4);
    c.fillStyle = solved ? "#bfe8ff" : "#dfe8f0";
    c.fillRect(-2, -10, 4, 20);
    c.fillStyle = "rgba(255,255,255,0.6)"; c.fillRect(-2, -10, 1, 20);
    c.restore();
  }
  function drawBeam(c, mz, time) {
    var tr = G.world.traceBeam(mz.src, mz.emitDir, mz.mirrors);
    c.strokeStyle = "rgba(255,240,180,0.75)";
    c.lineWidth = 3;
    c.setLineDash([8, 6]);
    c.lineDashOffset = -time * 30;
    c.beginPath();
    tr.segs.forEach(function (s) { c.moveTo(s[0] * TILE + 12, s[1] * TILE + 12); c.lineTo(s[2] * TILE + 12, s[3] * TILE + 12); });
    c.stroke();
    c.setLineDash([]);
    // dish
    c.fillStyle = "#e8a34e";
    c.beginPath(); c.arc(mz.dish.x * TILE + 12, mz.dish.y * TILE + 12, 7, 0, 7); c.fill();
  }

  function renderWorldTo(c, sx, sy, dw, dh, zw, zh, forPhoto) {
    var w = G.world, time = ui.t;
    var scale = dw / zw;
    c.save();
    c.scale(scale, scale);
    c.translate(-sx, -sy);
    if (G.terrainDirty || !terrainCv) buildTerrain();
    c.drawImage(terrainCv, 0, 0);
    var night = phaseOfDay() === "night";
    var x0 = Math.max(0, Math.floor(sx / TILE) - 1), x1 = Math.min(GW - 1, Math.ceil((sx + zw) / TILE) + 1);
    var y0 = Math.max(0, Math.floor(sy / TILE) - 1), y1 = Math.min(GH - 1, Math.ceil((sy + zh) / TILE) + 1);
    // channels water flow
    w.channels.forEach(function (ch) {
      var solved = G.channelsSolved[ch.id];
      ch.sluices.forEach(function (s, i) {
        drawSluice(c, s, s.x * TILE + 12, s.y * TILE + 12, solved);
      });
      if (solved) {
        c.strokeStyle = "rgba(111,183,255,0.8)"; c.lineWidth = 6;
        c.beginPath();
        c.moveTo(ch.spring.x * TILE + 12, ch.spring.y * TILE + 12);
        c.lineTo(ch.wheel.x * TILE + 12, ch.wheel.y * TILE + 12);
        c.stroke();
      }
    });
    // mirrors + beams
    [{ m: w.mirrorsR3, id: "mR3" }, { m: w.mirrorsR4, id: "mR4" }, { m: w.mirrorsR5, id: "mR5" }].forEach(function (o) {
      if (!o.m) return;
      drawBeam(c, o.m, time);
      o.m.mirrors.forEach(function (m) { drawMirror(c, m, m.x * TILE + 12, m.y * TILE + 12, G.mirrorsSolved[o.id]); });
    });
    // boulders + sockets
    w.boulders.forEach(function (b) {
      var s = G.boulders[b.id] || { x: b.x, y: b.y };
      if (!b.solved) {
        c.strokeStyle = "rgba(232,163,78,0.7)"; c.lineWidth = 2;
        c.strokeRect(b.sx * TILE + 2, b.sy * TILE + 2, TILE - 4, TILE - 4);
      }
      drawBoulder(c, s.x * TILE + 12, s.y * TILE + 12);
    });
    // pickups
    function pickup(p, color, glyph) {
      var bobY = Math.sin(time * 3 + p.x) * 2;
      c.fillStyle = color; c.font = "bold 13px system-ui"; c.textAlign = "center";
      c.fillText(glyph, p.x * TILE + 12, p.y * TILE + 8 + bobY);
    }
    w.r1planks.forEach(function (p) { if (!p.taken) pickup(p, "#9a744e", "▬"); });
    w.logs.forEach(function (p) { if (!p.taken) pickup(p, "#7a5a40", "🪵".length ? "≡" : "≡"); });
    w.coils.forEach(function (p) { if (!p.taken) pickup(p, "#c2a15a", "◎"); });
    // expansion markers
    (function () {
      var vD = w.villagers[0], vW = w.villagers[1], vM = w.villagers[2], vV = w.villagers[3], vS = w.villagers[4];
      function et(id) { return !!(G.expTaken && G.expTaken[id]); }
      var QQ = G.quests;
      if (QQ.wewake_fence) {
        for (var i = 0; i < 3; i++) {
          var md = et("fence" + i);
          c.fillStyle = md ? "#6b8a4a" : "#8a6a4a"; c.font = "bold 14px system-ui"; c.textAlign = "center";
          c.fillText(md ? "│" : "╱", (vW.x + 4 + i * 2) * TILE + 12, (vW.y + i) * TILE + 10);
        }
      }
      if (QQ.meera_shrooms === "active" && (G.weather === "rain" || G.weather === "fog" || G.weather === "storm") && G.carrying.shroom < 4) {
        var sh2 = [[-4, 2], [3, -3], [5, 3], [-2, -4], [1, 5], [-5, -1]];
        sh2.forEach(function (sp, si) { if (!et("shroom" + si)) pickup({ x: vM.x + sp[0], y: vM.y + sp[1] }, "#b48ac2", "♣"); });
      }
      if (QQ.dev_stores === "active") {
        var sd2 = [
          { id: "apples", x: vM.x - 4, y: vM.y + 2, c: "#c25a4a", g: "●" },
          { id: "fish", x: vV.x + 3, y: vV.y - 2, c: "#7a8a99", g: "≋" },
          { id: "honey", x: 66, y: 44, c: "#e0a83c", g: "⬢" },
          { id: "cheese", x: vD.x - 3, y: vD.y + 3, c: "#e8d27a", g: "◐" }
        ];
        sd2.forEach(function (s2) {
          if (!et("store_" + s2.id) && G.carrying.stores.indexOf(s2.id) < 0) pickup({ x: s2.x, y: s2.y }, s2.c, s2.g);
        });
        if (G.carrying.stores.length) pickup({ x: vD.x + 2, y: vD.y + 2 }, "#a9805a", "▣");
      }
      if (QQ.wewake_lambing === "active" && !G.flags.lambing_scene) pickup({ x: vW.x - 4, y: vW.y - 3 }, "#d9c08f", "⌂");
      if (QQ.dev_table === "active" && !G.flags.wedge_found) pickup({ x: vD.x + 4, y: vD.y + 1 }, "#8a6a4a", "◣");
      if (QQ.shivangi_plans === "active" && !G.flags.plans_read) pickup({ x: vS.x + 1, y: vS.y + 1 }, "#e8e8f0", "✎");
      if (QQ.shivangi_bell === "active" && !G.flags.bell_found) pickup({ x: 74, y: 22 }, "#c2a15a", "♪");
      if (QQ.shivangi_apply === "active" && !G.flags.sketch_made) pickup({ x: 84, y: 16 }, "#e8e8f0", "✎");
      if (DIALOGUE.quietMoments && !G.flags.qm_stars && !G.beacons[4]) {
        c.fillStyle = "rgba(255,233,176,0.8)"; c.font = "12px system-ui"; c.textAlign = "center";
        c.fillText("☆", 89 * TILE + 12, 10 * TILE + 8);
      }
      if (QQ.meera_promise === "active") {
        c.fillStyle = "rgba(111,183,255,0.9)"; c.font = "bold 13px system-ui"; c.textAlign = "center";
        c.fillText("✦", 63 * TILE + 12, 40 * TILE + 8);
      }
      if (QQ.vipul_dusk === "active") {
        c.fillStyle = "rgba(232,163,78,0.9)"; c.font = "bold 13px system-ui"; c.textAlign = "center";
        c.fillText("✦", w.towers[2].x * TILE + 12, (w.towers[2].y + 2) * TILE + 8);
      }
    })();
    // flora
    for (var fi = 0; fi < w.flora.length; fi++) {
      var f = w.flora[fi];
      if (f.x < x0 || f.x > x1 || f.y < y0 || f.y > y1) continue;
      if (f.night && !night) continue;
      drawFlora(c, f, f.x * TILE + 12, f.y * TILE + 12, time, night);
    }
    // echoes
    w.echoes.forEach(function (e) {
      if (G.comp.echoes[e.id]) return;
      if (e.night && !night) return;
      var ex = e.x * TILE + 12, ey = e.y * TILE + 12;
      var pulse = 0.6 + 0.4 * Math.sin(time * 2 + e.x);
      c.fillStyle = e.id === "echo_heart" ? "rgba(111,183,255," + pulse + ")" : "rgba(47,127,122," + pulse + ")";
      c.beginPath(); c.arc(ex, ey - 8, e.id === "echo_heart" ? 8 : 5, 0, 7); c.fill();
      c.fillStyle = "#3a2c1c"; c.font = "10px system-ui"; c.textAlign = "center";
      c.fillText(e.id === "echo_heart" ? "✦" : "◈", ex, ey - 4);
    });
    // towers
    w.towers.forEach(function (t) { drawTower(c, t, t.x * TILE + 12, t.y * TILE + 12, time); });
    // villagers
    w.villagers.forEach(function (v) { drawVillager(c, v, v.x * TILE + 12, v.y * TILE + 12); });
    // clover the ram
    if (!G.clover.found || G.clover.following) {
      var cl = G.clover;
      c.fillStyle = "#e8e0d0";
      c.beginPath(); c.ellipse(cl.x, cl.y - 8, 10, 6, 0, 0, 7); c.fill();
      c.fillStyle = "#d8cdb8"; c.beginPath(); c.arc(cl.x + 8, cl.y - 12, 5, 0, 7); c.fill();
      c.strokeStyle = "#c2b49a"; c.lineWidth = 2;
      c.beginPath(); c.arc(cl.x + 5, cl.y - 14, 4, 2.5, 5.5); c.stroke();
      if (!G.clover.found) {
        c.fillStyle = "#e8a34e"; c.font = "bold 11px system-ui"; c.textAlign = "center";
        c.fillText("♪", cl.x, cl.y - 24 + Math.sin(time * 4) * 2);
      }
    }
    // fauna
    w.fauna.forEach(function (f) {
      if (f.night && !night) return;
      if (G.weather === "rain" && !f.night) return; // fauna hide in rain
      drawFauna(c, f, f.x * TILE + 12, f.y * TILE + 12, time);
    });
    // player
    drawWren(c, G.px, G.py, G.dir, G.walkPhase, G.moving);
    // interact prompt
    if (!forPhoto && ui.screen === "game" && !ui.dlgVisible()) {
      var it = nearestInteractable();
      if (it) {
        c.fillStyle = "rgba(20,16,10,0.75)";
        c.font = "bold 12px system-ui"; c.textAlign = "center";
        var label = { villager: "talk", tower: "tower", boulder: "push", sluice: "turn", mirror: "turn", flora: "inspect", echo: "read", clover: "help", recipe: "take", plank: "take", log: "take", coil: "take", bridgeR1: "mend", bridgeR3: "bridge", gearfb: "take", alda1: "read", alda2: "read", alda5: "read" }[it.kind] || "SPACE";
        c.fillText("SPACE · " + label, it.x, it.y - 34);
      }
    }
    // particles: pollen / fireflies / rain / fog
    drawParticles(c, sx, sy, zw, zh, time, night);
    c.restore();
    // lighting + grade overlays (screen space)
    drawLighting(c, dw, dh, night);
  }

  function drawParticles(c, sx, sy, zw, zh, time, night) {
    var n = night ? 40 : 60;
    c.fillStyle = night ? "rgba(255,240,160,0.8)" : "rgba(255,250,230,0.55)";
    for (var i = 0; i < n; i++) {
      var px2 = ((i * 173.3 + time * (night ? 12 : 20)) % (zw + 40)) + sx - 20;
      var py2 = ((i * 97.7 + Math.sin(time * 0.7 + i) * 30) % (zh + 40)) + sy - 20;
      c.fillRect(px2, py2, night ? 2.5 : 2, night ? 2.5 : 2);
    }
    if (G.weather === "rain" || G.weather === "storm") {
      c.strokeStyle = "rgba(180,210,230,0.5)"; c.lineWidth = 1.5;
      for (var r = 0; r < 70; r++) {
        var rx = ((r * 211.7 + time * 500) % (zw + 60)) + sx - 30;
        var ry = ((r * 137.3 + time * 900) % (zh + 60)) + sy - 30;
        c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 4, ry + 12); c.stroke();
      }
    }
    if (G.weather === "fog") {
      for (var f2 = 0; f2 < 6; f2++) {
        var fx = ((f2 * 331.7 + time * 14) % (zw + 300)) + sx - 150;
        var fy = sy + ((f2 * 197.3) % zh);
        var g = c.createRadialGradient(fx, fy, 10, fx, fy, 130);
        g.addColorStop(0, "rgba(230,235,240,0.35)"); g.addColorStop(1, "rgba(230,235,240,0)");
        c.fillStyle = g;
        c.beginPath(); c.arc(fx, fy, 130, 0, 7); c.fill();
      }
    }
  }

  function drawLighting(c, dw, dh, night) {
    var d = (G.clock % DAY_LEN) / DAY_LEN;
    // golden-hour grade by phase
    var grade = null, alpha = 0;
    if (d < 0.22) { grade = "255,170,90"; alpha = 0.16; }        // dawn
    else if (d < 0.55) { grade = "255,210,140"; alpha = 0.10; }  // day
    else if (d < 0.72) { grade = "255,140,80"; alpha = 0.20; }   // dusk
    if (grade) { c.fillStyle = "rgba(" + grade + "," + alpha + ")"; c.fillRect(0, 0, dw, dh); }
    if (G.weather === "storm") { c.fillStyle = "rgba(90,160,140,0.14)"; c.fillRect(0, 0, dw, dh); }
    if (G.weather === "fog") { c.fillStyle = "rgba(220,228,235,0.10)"; c.fillRect(0, 0, dw, dh); }
    if (night || d >= 0.72 || d < 0.22) {
      // night darkness with light holes (viewport-space approx: use camera)
      if (!lightCv) { lightCv = document.createElement("canvas"); lightCv.width = VW; lightCv.height = VH; }
      var lc = lightCv.getContext("2d");
      lc.clearRect(0, 0, VW, VH);
      var darkA = d < 0.22 ? 0.35 : 0.62;
      lc.fillStyle = "rgba(12,16,40," + darkA + ")";
      lc.fillRect(0, 0, VW, VH);
      lc.globalCompositeOperation = "destination-out";
      function hole(wx, wy, r, a) {
        var vx = wx - G.camX, vy = wy - G.camY;
        var g = lc.createRadialGradient(vx, vy, 4, vx, vy, r);
        g.addColorStop(0, "rgba(0,0,0," + a + ")"); g.addColorStop(1, "rgba(0,0,0,0)");
        lc.fillStyle = g; lc.beginPath(); lc.arc(vx, vy, r, 0, 7); lc.fill();
      }
      hole(G.px, G.py, 150, 0.85); // lantern
      G.world.towers.forEach(function (t) { if (t.lit) hole(t.x * TILE + 12, t.y * TILE - 40, 190, 0.9); });
      G.world.flora.forEach(function (f) { if (f.night) hole(f.x * TILE + 12, f.y * TILE, 60, 0.55); });
      G.world.villagers.forEach(function (v) { hole(v.x * TILE + 12, v.y * TILE, 80, 0.4); });
      lc.globalCompositeOperation = "source-over";
      c.drawImage(lightCv, 0, 0, dw, dh);
    }
    // god rays in day
    if (!night && d >= 0.22 && d < 0.72 && G.weather === "clear") {
      c.save(); c.globalAlpha = 0.07; c.fillStyle = "#fff8e0";
      for (var i = 0; i < 4; i++) {
        var rx2 = (i * 260 + G.camX * 0.3) % (dw + 200) - 100;
        c.beginPath();
        c.moveTo(rx2, 0); c.lineTo(rx2 + 60, 0); c.lineTo(rx2 - 40, dh); c.lineTo(rx2 - 100, dh);
        c.closePath(); c.fill();
      }
      c.restore();
    }
  }

  function render() {
    ctx.clearRect(0, 0, VW, VH);
    if (!G) return;
    if (ui.screen === "photo" && ui.photo.open) {
      // frozen frame + pan
      if (!G.photoCam) G.photoCam = { x: G.camX + VW / 2, y: G.camY + VH / 2 };
      var zw = VW / ui.photo.zoom, zh = VH / ui.photo.zoom;
      var sx = U.clamp(G.photoCam.x + ui.photo.panX - zw / 2, 0, GW * TILE - zw);
      var sy = U.clamp(G.photoCam.y + ui.photo.panY - zh / 2, 0, GH * TILE - zh);
      renderWorldTo(ctx, sx, sy, VW, VH, zw, zh, false);
    } else {
      G.photoCam = null;
      var sway = ui.settings.shake ? Math.sin(G.swayT += 0.016) * 3 : 0;
      renderWorldTo(ctx, G.camX, G.camY + sway * 0, VW, VH, VW, VH, false);
    }
  }

  /* ================= ?scene= hooks ================= */
  function applyScene(scene) {
    // applied after boot when G may not exist yet: defer via ui.screen + lazy init
    setTimeout(function () {
      if (scene === "title" || scene === "seed" || scene === "howto" || scene === "settings") {
        ui.screen = scene; return;
      }
      if (!G) startRun("sceneseed");
      var w = G.world;
      if (scene === "night") G.clock = 0.85 * DAY_LEN;
      if (scene === "storm") { G.weatherOverride = "storm"; G.weather = "storm"; }
      if (scene === "tower1") { var t = w.towers[0]; G.px = t.x * TILE; G.py = (t.y + 3) * TILE; }
      if (scene === "hollow") {
        G.gear.stormlantern = true;
        G.px = w.hollow.mouthX * TILE; G.py = w.hollow.mouthY * TILE;
        G.clock = 0.85 * DAY_LEN;
      }
      if (scene === "dialogue") { var v = w.villagers[1]; G.px = v.x * TILE; G.py = (v.y + 2) * TILE; talkTo("wewake"); }
      if (scene === "journal") ui.screen = "journal";
      if (scene === "photo") ui.openPhoto();
      if (scene === "pause") { ui.screen = "pause"; ui.menuIdx = 0; }
      if (scene === "ending") {
        G.beacons = [true, true, true, true, true];
        w.towers.forEach(function (t2) { t2.lit = true; });
        G.kindness = 5;
        W2.FLORA.forEach(function (f) { G.comp.flora[f.id] = true; });
        W2.FAUNA.forEach(function (f) { G.comp.fauna[f.id] = true; });
        w.echoes.forEach(function (e) { G.comp.echoes[e.id] = true; });
        w.vistas.forEach(function (v) { G.comp.vistas[v.id] = true; });
        G.clock = 0.85 * DAY_LEN;
        doEnding();
      }
      if (scene === "game") ui.screen = "game";
    }, 300);
  }

  // debug handle for QA's CDP click-through (?debug=1)
  function exposeDebug() {
    if (qs("debug") !== "1") return;
    window.LV_DEBUG = {
      pos: function () { return G ? { x: Math.round(G.px), y: Math.round(G.py) } : null; },
      tile: function () { return G ? tileAtPx(G.px, G.py) : null; },
      teleport: function (tx, ty) { if (G) { G.px = tx * TILE + 12; G.py = ty * TILE + 12; } },
      teleportPx: function (x, y) { if (G) { G.px = x; G.py = y; } },
      interact: function () { doInteract(); },
      state: function () {
        return G ? {
          beacons: G.beacons, kindness: G.kindness, gear: G.gear,
          quests: G.quests, flags: G.flags, compendium: compendiumCount(),
          weather: G.weather, clock: Math.round(G.clock),
          carrying: G.carrying, blooms: G.bloomsLogged,
          fenceMended: G.fenceMended, storesStocked: G.storesStocked,
          playtime: Math.round(G.playtime)
        } : null;
      },
      tower: function (i) { var t = G.world.towers[i]; return { x: t.x, y: t.y, lit: t.lit }; },
      boulder: function (id) { var b = G.world.boulders.filter(function (x) { return x.id === id; })[0]; var s = G.boulders[id] || { x: b.x, y: b.y, solved: !!b.solved }; return { x: s.x, y: s.y, solved: !!s.solved, sx: b.sx, sy: b.sy }; },
      clover: function () { return { x: Math.round(G.clover.x), y: Math.round(G.clover.y), found: G.clover.found, following: G.clover.following }; },
      nearest: function () { var it = nearestInteractable(); return it ? { kind: it.kind, d: Math.round(U.dist(G.px, G.py, it.x, it.y)) } : null; },
      villager: function (id) { var v = G.world.villagers.filter(function (x) { return x.id === id; })[0]; return { x: v.x, y: v.y }; },
      give: function (k, v) { if (G) { if (k === "gear") G.gear[v] = true; else G[k] = v; } },
      key: function (code, down) { gameKey(code, "", !!down); },
      screen: function () { return ui.screen; },
      photos: function () { return ui.getPhotos().length; },
      sluice: function (id, i) { var ch = G.world.channels.filter(function (x) { return x.id === id; })[0]; return { ori: ch.sluices[i].ori, sol: ch.sluices[i].sol }; },
      mirror: function (id, i) { var mz = { mR3: G.world.mirrorsR3, mR4: G.world.mirrorsR4, mR5: G.world.mirrorsR5 }[id]; return { ori: mz.mirrors[i].ori, sol: mz.mirrors[i].sol }; },
      sluiceSolved: function (id) { return !!G.channelsSolved[id]; },
      mirrorSolved: function (id) { return !!G.mirrorsSolved[id]; },
      dlgOpen: function () { return ui.dlgVisible(); },
      dlgText: function () { return ui.dlg ? ui.dlg.text : null; },
      dlgSpeaker: function () { return ui.dlg ? ui.dlg.speaker : null; },
      dlgChoices: function () { return ui.dlg && ui.dlg.choices ? ui.dlg.choices.slice() : []; },
      dlgAdvance: function () { ui.dlgAdvance(); },
      dlgChoose: function (i) { if (ui.dlg && ui.dlg.choices) { ui.dlg.sel = i; ui.dlgAdvance(); } },
      talkTo: function (vid) { talkTo(vid); },
      setQuests: function (o) { if (G) G.quests = o; },
      setFlags: function (o) { if (G) Object.assign(G.flags, o); },
      setClockFrac: function (f) { if (G) G.clock = f * DAY_LEN; },
      setWeather: function (wth) { if (G) { G.weather = wth; G.weatherOverride = wth; } },
      setFence: function (n) { if (G) G.fenceMended = n; },
      setShroom: function (n) { if (G) G.carrying.shroom = n; },
      setStores: function (n) { if (G) G.storesStocked = n; },
      giveStores: function (arr) { if (G) G.carrying.stores = arr; },
      doEndingNow: function () { doEnding(); },
      interactTower: function (i) { interactTower(G.world.towers[i]); },
      setPlaytime: function (v) { if (G) G.playtime = v; },
      setRopeFixed: function (v) { if (G) G.ropeFixed = !!v; },
      ropeBridge: function () { var b = G.world.ropeBridge; return { x: b.x, y: b.y }; },
      solveBoulder: function (id) {
        var b = G.world.boulders.filter(function (x) { return x.id === id; })[0];
        if (b) { b.solved = true; G.boulders[id] = { x: b.sx, y: b.sy, solved: true }; }
      },
      bridgePos: function () { var b = G.world.bridgeR3; return { x: b.x, y: b.y }; }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { boot(); exposeDebug(); });
  else { boot(); exposeDebug(); }
})();
