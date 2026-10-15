/* DEEPHOLD — main: boot, fixed-step loop, input, state machine, story flow,
   ?scene= hooks, save/continue, tutorial, VN signature.
   INTEGRATION ADAPTERS (other roles' deliverables — graceful fallback):
   - window.DIALOGUE (writer's dialogue.js) preferred over built-in DeepStory
   - window.Art (artist's assets/art.js) preferred over built-in DeepSprites (see render.js)
   - window.DeepholdAudio (sound designer's audio.js) preferred over built-in DeepAudio (see sfx())
   - window.VFX (artist's assets/vfx.js) preferred over built-in VFX (see render.js)
   The game runs standalone on built-ins when those files are absent. */
(function () {
  "use strict";
  var U = window.DeepUtil, SIM = window.DeepSim, R = window.DeepRender,
      UI = window.DeepUI, A = window.DeepAudio;

  // ---- SFX facade: designer's DeepholdAudio.play(name) first, built-in fallback ----
  var SFXMAP = {
    build: "place_tower", upgrade: "upgrade_tower", sell: "sell_tower",
    overcharge: "overcharge", minePlaced: "mine_place", mine: "mine_detonate",
    harvest: "harvest", bank: "bank", coreBuff: "core_buff", tech: "tech_unlock",
    power: "power_reroute", surge: "power_surge", waveStart: "wave_start",
    victory: "victory", defeat: "defeat", leak: "hull_hit", breach: null,
    kill: null, shot_harpoon: "harpoon", shot_flak: "flak", shot_tesla: "tesla",
    sonarPing: "sonar_pulse", mutation: "mutation", alarm: "hull_alarm",
    bossRoar: "boss_roar", slam: "slam", devour: "devour", strikeWarn: "strike_warn",
    uiClick: "ui_confirm", towerDestroyed: "tower_destroyed"
  };
  function sfx(key) {
    try {
      if (window.DeepholdAudio && SFXMAP[key]) { window.DeepholdAudio.play(SFXMAP[key]); return; }
    } catch (e) {}
    // built-in fallback
    try {
      if (key === "build" || key === "upgrade") A.hydraulicClank();
      else if (key === "shot_harpoon") A.harpoonFire();
      else if (key === "shot_flak") A.flakBoom();
      else if (key === "shot_tesla") A.teslaZap();
      else if (key === "mine") A.mineDet();
      else if (key === "mutation") A.mutationMotif();
      else if (key === "alarm") A.hullAlarm();
      else if (key === "victory") A.victoryStinger();
      else if (key === "defeat") A.defeatStinger();
      else if (key === "sonarPing") A.sonarPing();
      else if (key === "waveStart") A.pressureGroan();
      else if (key === "bossRoar") A.bossRoar("maw");
      else if (key === "slam") A.bossRoar("dredge");
      else if (key === "harvest") A.harvestSfx();
      else if (key === "overcharge" || key === "surge" || key === "power") A.overchargeSfx();
      else if (key === "tech" || key === "coreBuff") A.techUnlock();
      else if (key === "bank") A.powerSfx();
      else A.uiClick();
    } catch (e) {}
  }

  // ---- STORY adapter: writer's DIALOGUE first, built-in DeepStory fallback ----
  function story() {
    if (window.DIALOGUE) return adaptDialogue(window.DIALOGUE);
    return window.DeepStory;
  }
  var _storyCache = null;
  function adaptDialogue(D) {
    if (_storyCache) return _storyCache;
    var beats = {};
    var taunts = {};
    function asLines(arr, who) {
      return (arr || []).map(function (t) { return { who: who || "VOSS", text: t }; });
    }
    function promptHtml(p) {
      if (!p) return "";
      if (typeof p === "string") return p;
      if (Array.isArray(p)) return p.map(function (l) {
        var who = l.who === "VOSS" ? "Voss" : l.who === "ADA" ? "Okafor" : l.who === "CHIEF" ? "Chief" : "Rig";
        return "<b>" + who + ":</b> " + String(l.text).replace(/&/g, "&amp;").replace(/</g, "&lt;");
      }).join("<br><br>");
      return "";
    }
    if (D.bosses) {
      if (D.bosses.maw && D.bosses.maw.taunts) taunts[10] = asLines(D.bosses.maw.taunts);
      if (D.bosses.dredge && D.bosses.dredge.taunts) taunts[20] = asLines(D.bosses.dredge.taunts);
      if (D.bosses.heart && D.bosses.heart.phases) {
        var hp = [];
        [1, 2, 3].forEach(function (p) { hp = hp.concat(asLines(D.bosses.heart.phases[p])); });
        if (hp.length) taunts[30] = hp;
      }
    } else {
      if (D.maw) taunts[10] = asLines([].concat(D.maw.taunt || D.maw.lines || []));
      if (D.dredge) taunts[20] = asLines([].concat(D.dredge.taunt || D.dredge.lines || []));
      if (D.heart) taunts[30] = asLines([].concat(D.heart.taunt || D.heart.lines || []));
    }
    var _beats = D.beats || [];
    if (!Array.isArray(_beats)) _beats = [];
    _beats.forEach(function (b) { beats[b.wave] = b.lines; });
    var algSrc = (D.branching && D.branching.allegiance) || D.allegiance || null;
    var alg;
    if (algSrc && algSrc.choices) {
      alg = {
        prompt: promptHtml(algSrc.prompt),
        options: (algSrc.choices || []).map(function (o) {
          return { id: o.id, label: o.label, response: o.response || [], unlock: o.unlock || null };
        })
      };
    } else {
      alg = {
        prompt: promptHtml((D.allegiance || {}).prompt),
        options: (((D.allegiance || {}).options) || []).map(function (o) {
          return { id: o.id, label: o.label, response: o.response || [], unlock: o.unlock || null };
        })
      };
    }
    var endings = [];
    if (D.endings) {
      Object.keys(D.endings).forEach(function (k) {
        var e = D.endings[k];
        var et = e.text;
        var elines = Array.isArray(et) ? et :
          (typeof et === "string" && et ? [{ who: "SYSTEM", text: et }] : []);
        endings.push({
          id: k, title: e.title, consequence: e.tone || "",
          text: elines,
          ally: e.allyLine || null
        });
      });
    }
    _storyCache = {
      intro: D.intro || [],
      beats: beats,
      taunts: taunts,
      allegiance: alg,
      endings: endings,
      _adapted: true
    };
    return _storyCache;
  }

  var VW = 960, VH = 640;
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");

  var params = new URLSearchParams(location.search);
  var seedParam = params.get("seed");
  var seed = seedParam != null ?
    (/^\d+$/.test(seedParam) ? (parseInt(seedParam, 10) >>> 0) : U.hashSeed(seedParam)) :
    ((Math.random() * 1e9) | 0) >>> 0;
  var scene = params.get("scene") || null;

  var S = null;
  var app = "boot"; // title|dialogue|prep|combat|aftermath|choice|ended
  var paused = false;
  var ui = { cursorPad: 0, selectedPad: null, cursorList: [] };
  var alarmT = 0;
  var tut = { step: 0, done: false, skipped: false };

  // ---------------- input ----------------
  var keys = {};
  var input = { up: false, down: false, left: false, right: false, actP: false, overP: false, waveP: false };

  function rebuildCursor() {
    ui.cursorList = [];
    if (!S) return;
    S.map.pads.forEach(function (p, i) { ui.cursorList.push({ type: "pad", i: i }); });
    if (S.phase === "prep") S.map.vents.forEach(function (v, i) { ui.cursorList.push({ type: "vent", i: i }); });
  }
  function cursorTarget() { return ui.cursorList[ui.cursorPad] || null; }
  function moveCursor(dir) {
    if (!ui.cursorList.length) return;
    ui.cursorPad = (ui.cursorPad + dir + ui.cursorList.length) % ui.cursorList.length;
    var t = cursorTarget();
    ui.selectedPad = t && t.type === "pad" ? t.i : null;
    sfx("uiClick");
  }

  window.addEventListener("keydown", function (e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].indexOf(e.code) >= 0) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true;
    A.unlock();
    if (window.DeepholdAudio && window.DeepholdAudio.init) { try { window.DeepholdAudio.init(); } catch (x) {} }
    if (e.code === "ArrowLeft" || e.code === "KeyA") moveCursor(-1);
    if (e.code === "ArrowRight" || e.code === "KeyD") moveCursor(1);
    if (e.code === "ArrowUp" || e.code === "KeyW") moveCursor(-1);
    if (e.code === "ArrowDown") moveCursor(1);
    if (e.code === "Space" || e.code === "Enter") onConfirm();
    if (e.code === "Escape" || e.code === "KeyP") togglePause();
    if (e.code === "KeyM") toggleMuteKey();
    if (e.code === "KeyT") onTargeting();
    if (app === "prep" || app === "combat") {
      if (/^Digit[1-6]$/.test(e.code)) onBuildKey(parseInt(e.code.slice(5), 10) - 1);
      if (e.code === "KeyO") onOvercharge();
      if (e.code === "KeyU") onUpgrade();
      if (e.code === "KeyX") onSell();
      if (e.code === "KeyI") onMine();
      if (e.code === "KeyV") onHarvest();
      if (e.code === "KeyB") onBank();
      if (e.code === "Digit7") buyBuff("rof");
      if (e.code === "Digit8") buyBuff("yield");
      if (e.code === "Digit9") buyBuff("repair");
    }
    if (e.code === "KeyS" && app === "prep") onStartWave();
    if (e.code === "KeyG" && app === "combat") { if (SIM.powerSurge(S)) { sfx("surge"); R.sonarSweep(0.8); } }
    // §7.2 power rerouting: Q/C/E or Z/C → west/central/east (W stays cursor-up)
    if (app === "combat" || app === "prep") {
      if (e.code === "KeyQ" || e.code === "KeyZ") onPower("west");
      if (e.code === "KeyC") onPower("central");
      if (e.code === "KeyE") onPower("east");
    }
    // re-open Voss's mutation report (Tab)
    if (e.code === "Tab" && (app === "prep" || app === "combat") && UI._lastMut) {
      e.preventDefault();
      UI.showMutationCard(UI._lastMut.notes, UI._lastMut.wave);
    }
    if (app === "techpick" && /^Digit[1-3]$/.test(e.code) && UI._techPick) UI._techPick(parseInt(e.code.slice(5), 10) - 1);
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });

  function onConfirm() {
    if (UI.dialogueActive()) { UI.advanceDialogue(); return; }
    if (app === "title") return;
    if (app !== "prep" && app !== "combat") return;
    var t = cursorTarget();
    if (!t) return;
    if (t.type === "vent") { onHarvest(); return; }
    var p = S.map.pads[t.i];
    if (p.mine && app === "combat") { // manual detonation (§7.3)
      if (SIM.detonateMine(S, t.i).ok) { sfx("mine"); R.addShake(5, 0.4); }
      return;
    }
    ui.selectedPad = t.i;
    sfx("uiClick");
    tutAdvance("select");
  }
  function onBuildKey(famIdx) {
    if (app !== "prep") { UI.toast("Build during the survey phase"); return; }
    var t = cursorTarget();
    if (!t || t.type !== "pad") { UI.toast("Select an empty hull pad first"); return; }
    var fam = SIM.FAM_ORDER[famIdx];
    var r = SIM.buildTower(S, t.i, fam);
    if (r.ok) {
      sfx("build"); R.burst(S.map.pads[t.i].x, S.map.pads[t.i].y, "#ffd75e", 10, 60);
      ui.selectedPad = t.i;
      tutAdvance("build");
    }
    else UI.toast(r.reason === "cells" ? "Not enough thermal cells" :
      r.reason === "cap" ? "Tower cap reached (24)" : "Pad occupied");
  }
  function onUpgrade() {
    var pi = ui.selectedPad;
    if (pi == null) return;
    var p = S.map.pads[pi];
    if (!p || !p.tower) return;
    var t = p.tower;
    if (t.tier === 2) {
      var D = SIM.TOWER_DEFS[t.fam];
      UI.showChoice("UPGRADE — " + R.towerName(t), "Choose the tier-3 branch (irreversible):",
        [{ label: "A — " + D.tiers[2].A.name + " (" + D.tiers[2].A.cost + " TC)" },
         { label: "B — " + D.tiers[2].B.name + " (" + D.tiers[2].B.cost + " TC)" }],
        function (i) {
          var r = SIM.upgradeTower(S, pi, i === 0 ? "A" : "B");
          if (r.ok) { sfx("upgrade"); R.burst(p.x, p.y, "#39e6ff", 12, 70); }
          else UI.toast("Not enough thermal cells");
        });
      return;
    }
    var r = SIM.upgradeTower(S, pi);
    if (r.ok) { sfx("upgrade"); R.burst(p.x, p.y, "#39e6ff", 12, 70); }
    else UI.toast(r.reason === "max" ? "Already at max tier" : "Not enough thermal cells");
  }
  function onSell() {
    var pi = ui.selectedPad;
    if (pi == null) return;
    var r = SIM.sellTower(S, pi);
    if (r.ok) { sfx("sell"); UI.toast("Salvaged +" + r.refund + " TC"); }
  }
  function onTargeting() {
    var pi = ui.selectedPad;
    if (pi == null || (app !== "prep" && app !== "combat")) return;
    var r = SIM.toggleTargeting(S, pi);
    if (r.ok) UI.toast("Targeting: " + r.mode.toUpperCase());
  }
  function onOvercharge() {
    var pi = ui.selectedPad;
    if (pi == null) { UI.toast("Select a tower first"); return; }
    var p = S.map.pads[pi];
    if (p.mine && app === "combat") { // mine selected → detonate
      if (SIM.detonateMine(S, pi).ok) { sfx("mine"); R.addShake(5, 0.4); }
      return;
    }
    if (SIM.overcharge(S, pi).ok) {
      sfx("overcharge");
      R.rings.push({ x: p.x, y: p.y, r: 10, max: 90, color: "#ffd75e", life: 0.5 });
      tutAdvance("overcharge");
    } else UI.toast("Overcharge not ready");
  }
  function onMine() {
    if (app !== "prep") { UI.toast("Place mines during survey"); return; }
    var t = cursorTarget();
    if (!t || t.type !== "pad") return;
    var r = SIM.placeMine(S, t.i);
    if (r.ok) { sfx("minePlaced"); UI.toast("Mine armed — detonate with SPACE in siege"); }
    else UI.toast(r.reason === "tech" ? "Requires Demolitions tech" :
      r.reason === "max" ? "Max 3 mines" :
      r.reason === "cells" ? "Mines cost 40 TC" : "Can't place here");
  }
  function onHarvest() {
    var t = cursorTarget();
    var vi = t && t.type === "vent" ? t.i : -1;
    if (vi < 0) { UI.toast("Select a glowing vent"); return; }
    var r = SIM.harvestVent(S, vi);
    if (r.ok) {
      sfx("harvest");
      var v = S.map.vents[vi];
      R.burst(v.x, v.y - 10, "#ffd75e", 12, 70);
      tutAdvance("harvest");
    } else UI.toast(r.reason === "rov" ? "ROV fleet busy" : "Vent already harvested");
  }
  function onBank() {
    var r = SIM.bankCells(S, Math.max(0, S.cells - 100));
    if (r.ok) {
      sfx("bank");
      UI.toast("Core: " + S.coreCharge + " charge" + (S.coreCharge === 1 ? "" : "s") +
        " — [7] rate [8] yield [9] repair (100 TC = 1 charge)");
    } else UI.toast("No spare cells to bank");
  }
  function buyBuff(which) {
    if (app !== "prep" && app !== "combat") return;
    if (SIM.buyCoreBuff(S, which).ok) {
      sfx("coreBuff");
      var n = SIM.CORE_BUFFS[which].name;
      UI.toast(n + " online — charges left: " + S.coreCharge);
    } else UI.toast("Need 1 core charge (bank 100 TC with B)");
  }
  function onPower(sector) {
    var r = SIM.setOverdrive(S, sector);
    if (r.ok) {
      sfx("power");
      R.sonarSweep(0.5);
      UI.toast(r.overdrive ? "OVERDRIVE: " + r.overdrive.toUpperCase() + " (+30%)" : "Power balanced");
    }
  }
  function onStartWave() {
    if (app !== "prep") return;
    var w = S.wave + 1;
    var ST = story();
    function begin() {
      if (SIM.startCombat(S)) {
        app = "combat";
        UI.hide();
        R.sonarSweep(1.2); sfx("sonarPing");
        setTimeout(function () { sfx("waveStart"); }, 600);
        rebuildCursor();
        if (tut.step === 2 && !tut.done && !tut.skipped) {
          UI.toast("Select a tower and press O to OVERCHARGE when the swarm peaks", 7000);
        }
      }
    }
    if (ST.taunts && ST.taunts[w] && !S.story.beatsSeen.includes("taunt" + w)) {
      S.story.beatsSeen.push("taunt" + w);
      app = "dialogue";
      UI.showDialogue(ST.taunts[w], begin, "taunt" + w);
    } else begin();
  }
  function toggleMuteKey() {
    var m = A.toggleMute();
    try { if (window.DeepholdAudio) window.DeepholdAudio.setMuted(m); } catch (e) {}
    UI.settings.mute = m;
    try { localStorage.setItem("deephold_settings", JSON.stringify(UI.settings)); } catch (e) {}
    UI.toast(m ? "Muted" : "Sound on");
  }
  function togglePause() {
    if (app !== "prep" && app !== "combat" && app !== "aftermath") return;
    if (paused) { paused = false; UI.hide(); }
    else {
      paused = true;
      UI.showPause({
        resume: togglePause,
        restart: function () { paused = false; restartWave(); },
        quit: function () { paused = false; toTitle(); }
      });
    }
  }
  function restartWave() {
    var raw = null;
    try { raw = localStorage.getItem("deephold_save_v1"); } catch (e) {}
    var loaded = raw ? SIM.deserialize(raw) : null;
    if (loaded && loaded.seed === S.seed) { S = loaded; }
    else { newRun(S.seed, true); return; }
    app = "prep"; UI.hide(); rebuildCursor();
    UI.toast("Wave restarted from last save");
  }

  // ---- tutorial (§2 onboarding): 3 prompts, wait-for-completion, skippable ----
  function tutPrompt() {
    if (tut.done || tut.skipped || S.wave !== 0) return;
    var msgs = [
      "Place a HARPOON GUN on the flashing pad — press 1",
      "Harvest a vent — move to the glowing vent, press SPACE",
      null // shown at first combat
    ];
    if (tut.step < 2 && msgs[tut.step]) UI.toast("VOSS: " + msgs[tut.step], 9000);
  }
  function tutAdvance(kind) {
    if (tut.done || tut.skipped) return;
    if (tut.step === 0 && kind === "build") { tut.step = 1; tutPrompt(); }
    else if (tut.step === 1 && kind === "harvest") { tut.step = 2; S.story.tut = 1; }
    else if (tut.step === 2 && kind === "overcharge") { tut.done = true; S.story.tut = 2; UI.toast("Tutorial complete — hold the rig, Chief."); }
  }

  // canvas tap
  canvas.addEventListener("pointerdown", function (e) {
    A.unlock();
    if (window.DeepholdAudio && window.DeepholdAudio.init) { try { window.DeepholdAudio.init(); } catch (x) {} }
    if (UI.dialogueActive()) { UI.advanceDialogue(); return; }
    if (!S || (app !== "prep" && app !== "combat")) return;
    var r = canvas.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width * VW;
    var y = (e.clientY - r.top) / r.height * VH;
    var best = null, bd = 44;
    S.map.pads.forEach(function (p, i) {
      var d = U.dist(x, y, p.x, p.y);
      if (d < bd) { bd = d; best = { type: "pad", i: i }; }
    });
    if (app === "prep") S.map.vents.forEach(function (v, i) {
      var d = U.dist(x, y, v.x, v.y);
      if (d < bd) { bd = d; best = { type: "vent", i: i }; }
    });
    // mines are tappable in combat too
    if (app === "combat") S.mines.forEach(function (m) {
      var d = U.dist(x, y, m.x, m.y);
      if (d < bd) { bd = d; best = { type: "mine", i: m.pad }; }
    });
    if (best) {
      ui.cursorPad = ui.cursorList.findIndex(function (c) { return c.type === best.type && c.i === best.i; });
      if (ui.cursorPad < 0) ui.cursorPad = 0;
      if (best.type === "pad") ui.selectedPad = best.i;
      else if (best.type === "vent") onHarvest();
      else if (best.type === "mine") { if (SIM.detonateMine(S, best.i).ok) { sfx("mine"); R.addShake(5, 0.4); } }
      sfx("uiClick");
    }
  });

  // ---------------- sim event wiring ----------------
  function wireEvents() {
    S.bus.on("shot", function (d) { sfx("shot_" + d.fam); });
    S.bus.on("kill", function (d) { R.burst(d.x, d.y, d.glow, d.boss ? 40 : 10, d.boss ? 160 : 80); });
    S.bus.on("leak", function (d) {
      sfx("leak");
      R.addShake(Math.min(6, 2 + d.amt), 0.3);
      if (d.amt >= 4) R.flash("rgba(255,40,50,1)", 0.10);
    });
    S.bus.on("leaked", function () {});
    S.bus.on("mine", function () { R.addShake(5, 0.4); });
    S.bus.on("towerDestroyed", function (d) {
      sfx("towerDestroyed");
      R.burst(d.x, d.y, "#ff4d5e", 16, 90);
      UI.toast("Turret destroyed! (+" + d.refund + " TC salvage)");
      if (ui.selectedPad != null && !S.map.pads[ui.selectedPad].tower) ui.selectedPad = null;
    });
    S.bus.on("devour", function (d) { sfx("devour"); R.addShake(7, 0.5); UI.toast("THE MAW devoured a turret!"); });
    S.bus.on("slam", function (d) { sfx("slam"); R.addShake(8, 0.6); R.flash("rgba(255,154,60,1)", 0.10); });
    S.bus.on("phaseShift", function (d) { sfx("bossRoar"); UI.toast(d.name + " — PHASE " + d.phase); });
    S.bus.on("bossSpawn", function () { sfx("bossRoar"); R.sonarSweep(1.4); });
    S.bus.on("strikeWarn", function (d) { sfx("strikeWarn"); UI.toast("⚠ HEART STRIKE incoming — " + d.sector + " sector! Cover it!"); });
    S.bus.on("strikeHit", function () { R.addShake(9, 0.7); R.flash("rgba(255,45,120,1)", 0.15); });
    S.bus.on("waveEnd", onWaveEnd);
    S.bus.on("gameover", onDefeat);
    S.bus.on("victory", onVictory);
  }

  // ---------------- flow ----------------
  function newRun(newSeed, skipIntro) {
    S = SIM.create(newSeed);
    wireEvents();
    SIM.enterPrep(S);
    ui.cursorPad = 0; ui.selectedPad = null;
    tut = { step: 0, done: false, skipped: S.story.tut === 2 };
    if (S.story.tut === 2) tut.done = true;
    rebuildCursor();
    window.__S = S;
    if (skipIntro) { toPrep(false); return; }
    app = "dialogue";
    R.sonarSweep(1.4);
    UI.showDialogue(story().intro, function () { toPrep(true); tutPrompt(); }, "intro");
  }

  function toPrep(showMutation) {
    app = "prep";
    UI.hide();
    rebuildCursor();
    if (showMutation && S.wave >= 0) {
      var dir = SIM.directorFor(S, S.wave + 1);
      if (dir.note.length) UI.showMutationCard(dir.note, S.wave + 1, 8000);
    }
    saveGame();
  }

  function onWaveEnd(d) {
    sfx("uiClick");
    UI.toast("Wave " + d.wave + " held! Leak: " + Math.round(d.leak) + " · bonus +" + d.bonus + " TC");
    app = "aftermath";
    var ST = story();
    var lines = ST.beats[d.wave];
    function afterStory() {
      if (d.wave === 25 && !S.story.sided) { allegianceChoice(afterAllegiance); return; }
      afterAllegiance();
    }
    function afterAllegiance() {
      if (S.techOffer.length) {
        app = "techpick";
        UI.showTechChoice(S.techOffer, function (id) {
          SIM.pickTech(S, id);
          SIM.enterPrep(S);
          toPrep(true);
        });
      } else { SIM.enterPrep(S); toPrep(true); }
    }
    var beatKey = "beat" + d.wave;
    if (lines && !S.story.beatsSeen.includes(beatKey)) {
      S.story.beatsSeen.push(beatKey);
      app = "dialogue";
      UI.showDialogue(lines, afterStory, beatKey);
    } else afterStory();
  }

  function allegianceChoice(next) {
    app = "choice";
    var alg = story().allegiance;
    UI.showChoice("WAVE 25 — ALLEGIANCE", alg.prompt,
      alg.options.map(function (o) { return { label: o.label }; }),
      function (i) {
        var opt = alg.options[i];
        S.story.sided = opt.id;
        if (opt.unlock && opt.unlock.techId && S.tech.indexOf(opt.unlock.techId) < 0) {
          S.tech.push(opt.unlock.techId);
          try { if (S.bus) S.bus.emit("tech", { id: opt.unlock.techId }); } catch (e) {}
          UI.toast("TECH UNLOCKED — " + opt.unlock.name + ": " + opt.unlock.desc, 6000);
          sfx("tech");
        }
        UI._choicePick = null;
        app = "dialogue";
        var resp = opt.response || [];
        // writer's allyLine variant: appended by ending renderer
        UI.showDialogue(resp, next, "alleg-" + opt.id);
      });
  }

  function onDefeat() {
    app = "ended";
    sfx("defeat");
    UI.showEndScreens(S.stats, S.seed, {
      retry: function () { newRun(S.seed, true); },
      new: function () { newRun(((Math.random() * 1e9) | 0) >>> 0, false); },
      title: toTitle
    });
    try { localStorage.removeItem("deephold_save_v1"); } catch (e) {}
  }

  function onVictory() {
    app = "choice";
    sfx("victory");
    var ST = story();
    UI.showChoice("THE HEART IS STILL — CHOOSE",
      "The colossus is beaten. The trench waits for your decision.",
      ST.endings.map(function (e) { return { label: e.title + " — " + e.consequence }; }),
      function (i) {
        var e = ST.endings[i];
        UI._choicePick = null;
        app = "dialogue";
        var lines = (e.text || []).slice();
        if (e.ally && S.story.sided) {
          var al = typeof e.ally === "object" ?
            (e.ally[S.story.sided] || e.ally["side-voss"] || e.ally.voss) : e.ally;
          if (al) lines.push(typeof al === "string" ? { who: "SYS", text: al } : al);
        }
        UI.showDialogue(lines, function () { endScreen(true); }, "end-" + e.id);
      });
  }

  function endScreen(won) {
    app = "ended";
    UI.showEndScreens(S.stats, S.seed, {
      retry: function () { newRun(S.seed, true); },
      new: function () { newRun(((Math.random() * 1e9) | 0) >>> 0, false); },
      title: toTitle
    });
    try { localStorage.removeItem("deephold_save_v1"); } catch (e) {}
    if (won) {
      setTimeout(function () {
        var p = document.querySelector("#ui .panel");
        if (p) {
          var b = document.createElement("button");
          b.className = "big"; b.textContent = "∞ ENDLESS MODE";
          b.style.marginTop = "10px";
          b.addEventListener("click", function () {
            S.ended = null; S.phase = "prep";
            SIM.enterPrep(S);
            UI.toast("ENDLESS — the director is uncapped. Good luck, Chief.");
            toPrep(false);
          });
          p.appendChild(b);
        }
      }, 50);
    }
  }

  function toTitle() {
    app = "title";
    paused = false;
    UI.stopNarrate();
    var raw = null;
    try { raw = localStorage.getItem("deephold_save_v1"); } catch (e) {}
    var sv = raw ? SIM.deserialize(raw) : null;
    UI.showTitle(!!sv, seed, {
      new: function () { newRun(((Math.random() * 1e9) | 0) >>> 0, false); },
      cont: function () { continueGame(sv); },
      wave: sv ? sv.wave : 0
    });
  }

  function continueGame(sv) {
    S = sv; wireEvents();
    ui.cursorPad = 0; ui.selectedPad = null;
    tut = { step: 2, done: true, skipped: true };
    window.__S = S;
    toPrep(true);
    UI.toast("Expedition resumed — wave " + (S.wave + 1));
  }

  function saveGame() {
    try { localStorage.setItem("deephold_save_v1", SIM.serialize(S)); } catch (e) {}
  }

  // ---------------- scene hooks (?scene=) ----------------
  function applyScene() {
    if (!scene) { toTitle(); return; }
    var scSeed = 12345;
    if (scene === "title") { toTitle(); return; }
    if (scene === "story") { newRun(scSeed, false); return; }
    if (scene === "prep") { newRun(scSeed, true); return; }
    if (scene === "combat") {
      newRun(scSeed, true);
      S.cells = 900;
      SIM.buildTower(S, 2, "harpoon"); SIM.buildTower(S, 5, "flak");
      SIM.buildTower(S, 7, "tesla"); SIM.buildTower(S, 1, "sonar");
      SIM.upgradeTower(S, 2); SIM.upgradeTower(S, 5);
      if (SIM.canMine(S) === false) { S.tech.push("demolitions"); }
      SIM.placeMine(S, 3);
      SIM.startCombat(S);
      app = "combat"; UI.hide(); rebuildCursor();
      return;
    }
    if (scene === "boss") {
      newRun(scSeed, true);
      S.cells = 4000;
      var fams = ["harpoon", "harpoon", "flak", "flak", "tesla", "tesla", "sonar", "sealer", "mining", "harpoon"];
      S.map.pads.forEach(function (p, i) {
        if (i < fams.length) {
          SIM.buildTower(S, i, fams[i]);
          SIM.upgradeTower(S, i);
          if (i < 4) SIM.upgradeTower(S, i, i % 2 ? "A" : "B");
        }
      });
      S.wave = 9;
      SIM.enterPrep(S);
      SIM.startCombat(S); // wave 10 — the Maw
      app = "combat"; UI.hide(); rebuildCursor();
      for (var i = 0; i < 160; i++) SIM.stepCombat(S, 0.05);
      return;
    }
    if (scene === "ending") {
      newRun(scSeed, true);
      S.ended = "victory"; S.phase = "ended"; S.wave = 30;
      S.stats.wavesWon = 30; S.stats.kills = 1500;
      app = "choice";
      var ST = story();
      UI.showChoice("THE HEART IS STILL — CHOOSE",
        "The colossus is beaten. The trench waits for your decision.",
        ST.endings.map(function (e) { return { label: e.title + " — " + e.consequence }; }),
        function (i) {
          var e = ST.endings[i];
          UI.showDialogue(e.text || [], function () { endScreen(true); }, "end-" + e.id);
        });
      return;
    }
    toTitle();
  }

  // ---------------- main loop ----------------
  var last = performance.now(), acc = 0;
  var STEP = 1 / 20;
  function frame(t) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    if (!paused && S && app === "combat" && !UI.dialogueActive()) {
      acc += dt;
      var n = 0;
      while (acc >= STEP && n < 8) { SIM.stepCombat(S, STEP); acc -= STEP; n++; }
      if (n === 8) acc = 0;
      if (S.hull < S.maxHull * 0.3 && S.hull > 0) {
        alarmT -= dt;
        if (alarmT <= 0) { alarmT = 5; sfx("alarm"); }
      }
    }
    if (app === "title" && R.renderAmbient) {
      try { R.renderAmbient(ctx); }
      catch (err) { if (!window.__renderErr) { window.__renderErr = err; console.error(err); } }
    } else if (S) {
      try { R.render(ctx, S, ui); }
      catch (err) { if (!window.__renderErr) { window.__renderErr = err; console.error(err); } }
    }
  }

  // ---------------- boot ----------------
  // INTEGRATION: artist's Art module (assets/art.js) — init if present.
  try { if (window.Art && window.Art.init) window.Art.init(); } catch (e) {}
  try { if (window.VFX && window.VFX.init) window.VFX.init(VW, VH); } catch (e) {}
  R.init();
  UI.init();
  UI.initTouch(input);
  setInterval(function () {
    if (input.actP) { input.actP = false; onConfirm(); }
    if (input.overP) { input.overP = false; onOvercharge(); }
    if (input.waveP) { input.waveP = false; if (app === "prep") onStartWave(); }
  }, 60);
  if (UI.settings.mute && !A.isMuted()) A.toggleMute();
  // tutorial skip button (§2: always visible during tutorial)
  var tutSkip = document.getElementById("tutskip");
  setInterval(function () {
    var show = S && S.wave === 0 && !tut.done && !tut.skipped &&
      (app === "prep" || app === "combat") && !UI.dialogueActive();
    tutSkip.style.display = show ? "block" : "none";
  }, 300);
  tutSkip.addEventListener("click", function () {
    tut.skipped = true; S.story.tut = 2;
    UI.toast("Tutorial skipped — hold the rig, Chief.");
  });
  var splash = document.getElementById("splash");
  if (splash) {
    splash.style.display = "flex";
    setTimeout(function () {
      splash.style.display = "none";
      applyScene();
      try {
        if (window.DeepholdAudio) { /* init on first gesture */ }
        else A.startAmbient();
      } catch (e) {}
    }, 1400);
  } else { applyScene(); }
  window.__game = { get S() { return S; }, get app() { return app; }, newRun: newRun, sfx: sfx,
    allegianceChoice: allegianceChoice, onDefeat: onDefeat, continueGame: continueGame };
  requestAnimationFrame(frame);
})();
