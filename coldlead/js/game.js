/* COLD LEAD — game.js : campaign state machine, night clock, scenes, lab,
   deduction board, accusation, scoring, endings, save/load. Node-safe. */
"use strict";
(function () {
  var U = globalThis.ColdLeadUtil;
  var GEN = function () { return globalThis.ColdLeadGen; };
  var DLG = function () { return globalThis.ColdLeadDialogue; };

  var DAWN = 480; // minutes after 22:00 -> 06:00
  var COST = { travel: 20, sweep: 25, exchange: 10, lab: 60 };
  var SAVE_KEY = "coldlead_save_v1";

  var REYES_BRIEF = [
    "Another body, another rainy night. You're on the night shift now, detective — Grayharbor PD's finest hours.",
    "Work the scene, lean on the suspects, use the lab. But mind the clock: at 0600 the brass wants a name, right or wrong.",
    "Dr. Venn runs forensics. Marlow will show you the ropes on your first night. Don't embarrass me."
  ];

  function create(seed) {
    return {
      seed: seed >>> 0, night: 0, totalScore: 0, rep: 0,
      usedLocs: [], failedNights: [],
      case: null, time: 0, mode: "title",
      scene: null, sweeps: {}, found: [], lab: [],
      pins: {}, credibility: 3, asked: {},
      result: null, ending: null, log: [],
      over: false
    };
  }

  function log(G, msg) { G.log.push("[" + U.clockStr(G.time) + "] " + msg); }

  function startNight(G, nightNo) {
    var seed = (G.seed + nightNo * 7919) >>> 0;
    var c = GEN().generateCase(seed, nightNo, G.usedLocs);
    var v = GEN().verifyCase(c);
    if (!v.ok) throw new Error("bad case gen: " + v.errors.join("; "));
    G.case = c; G.night = nightNo;
    G.usedLocs.push(c.location.id);
    G.time = 0; G.mode = "brief";
    G.scene = c.location.scenes[0].id; G.sweeps = {};
    G.found = []; G.lab = []; G.pins = {};
    G.credibility = 3; G.asked = {}; G.result = null;
    log(G, "Night " + nightNo + " opened: " + c.brief);
    return c;
  }

  function advanceTime(G, mins) {
    G.time += mins;
    // lab completions
    G.lab.forEach(function (job) {
      if (!job.done && G.time >= job.doneAt) {
        job.done = true;
        var cl = clueById(G, job.clueId);
        cl.labDone = true;
        log(G, "Lab finished: " + cl.title);
      }
    });
    if (G.time >= DAWN && !G.result) {
      log(G, "Dawn. Time to file.");
    }
  }

  function clueById(G, id) {
    return G.case.clues.filter(function (c) { return c.id === id; })[0];
  }
  function susById(G, id) {
    return G.case.suspects.filter(function (s) { return s.id === id; })[0];
  }

  function doTravel(G, sceneId) {
    if (G.result) return { ok: false, msg: "Case closed." };
    if (G.scene === sceneId) return { ok: true, msg: "Already here." };
    advanceTime(G, COST.travel);
    G.scene = sceneId;
    log(G, "Traveled to " + sceneName(G, sceneId));
    return { ok: true, msg: "You head to the " + sceneName(G, sceneId) + ". (-" + COST.travel + "m)" };
  }
  function sceneName(G, id) {
    var s = G.case.location.scenes.filter(function (x) { return x.id === id; })[0];
    return s ? s.name : id;
  }

  function doSweep(G) {
    if (G.result) return { ok: false, msg: "Case closed." };
    var n = (G.sweeps[G.scene] || 0);
    if (n >= 2) return { ok: false, msg: "You've been over this scene twice. Nothing left." };
    advanceTime(G, COST.sweep);
    G.sweeps[G.scene] = n + 1;
    var hidden = G.case.clues.filter(function (c) {
      return c.scene === G.scene && !c.found && G.found.indexOf(c.id) < 0 && !c.secretLocked;
    });
    var found = [];
    // A full sweep turns the scene over completely: reveal everything present.
    // The time cost (25m) is the resource; the 2-sweep cap only matters for
    // bonus clues unlocked later via interrogation. This guarantees a thorough
    // player can always solve the case — no unwinnable states.
    hidden.forEach(function (c) {
      c.found = true; G.found.push(c.id); found.push(c);
    });
    // secret-locked bonus clues: unlocked via interrogation (secretLocked flag)
    log(G, "Swept " + sceneName(G, G.scene) + ", found " + found.length);
    if (!found.length) return { ok: true, found: [], msg: "Nothing but rain and shadows this pass." };
    return { ok: true, found: found, msg: "Found: " + found.map(function (c) { return c.title; }).join("; ") };
  }

  function unlockBonusClue(G, text, title) {
    // interrogation crack on an innocent can surface a bonus clue
    var c = {
      id: "cx" + G.found.length + "_" + G.time, kind: "testimonial",
      scene: G.scene, title: title || "A whispered tip",
      text: text, found: true, labDone: false, labQueued: false,
      pointsTo: null, exonerates: null, tags: ["bonus"]
    };
    G.case.clues.push(c); G.found.push(c.id);
    return c;
  }

  function doExchange(G, suspectId, topic, approach, bluffClueId) {
    if (G.result) return { ok: false, msg: "Case closed." };
    var s = susById(G, suspectId);
    if (!s) return { ok: false, msg: "No such suspect." };
    if (s.locked) return { ok: false, msg: s.name + " has lawyered up." };
    advanceTime(G, COST.exchange);
    var rng = U.RNG(G.seed + U.hashStr(suspectId + topic + approach + G.time));
    var bluffClue = bluffClueId ? clueById(G, bluffClueId) : null;
    var r = DLG().exchange(s, topic, approach, bluffClue, G.case, rng, G);
    s.composure = U.clamp(s.composure + (r.effects.composure || 0), 0, 100);
    if (r.effects.credibility) {
      G.credibility += r.effects.credibility;
      log(G, "Credibility now " + G.credibility);
      if (G.credibility <= 0) {
        G.result = caseResult(G, false, "benched", null);
        r.lines.push("Your captain pulls you off the interviews. The night is shot.");
        return { ok: true, lines: r.lines, benched: true };
      }
    }
    if (r.effects.crack && !s.crackedBonusGiven && s.id !== G.case.culpritId) {
      s.crackedBonusGiven = true;
      // cracked innocents sometimes give a bonus exonerating tip
      if (rng.chance(0.6)) {
        var bc = unlockBonusClue(G, s.name + ", shaken, adds: \"" + crackTip(G, s, rng) + "\"", "Shaken testimony");
        r.lines.push("Bonus clue logged: " + bc.title);
      }
    }
    var key = suspectId + ":" + topic;
    G.asked[key] = (G.asked[key] || 0) + 1;
    log(G, "Q " + s.name + " [" + topic + "/" + approach + "]");
    return { ok: true, lines: r.lines, effects: r.effects };
  }

  function crackTip(G, s, rng) {
    var others = G.case.suspects.filter(function (o) { return o.id !== s.id && o.id !== G.case.culpritId; });
    var o = others.length ? rng.pick(others) : null;
    var tips = [
      "Check the back office safe. I saw the victim arguing about money.",
      "The victim got a phone call around eleven. Sounded scared.",
      "Ask about the broken glass — it wasn't broken in a struggle."
    ];
    if (o) tips.push(o.name + " was nowhere near the scene, whatever they claim.");
    return rng.pick(tips);
  }

  function queueLab(G, clueId) {
    var c = clueById(G, clueId);
    if (!c || !c.found) return { ok: false, msg: "Clue not in hand." };
    if (!c.requiresLab) return { ok: false, msg: "Nothing for the lab in this one." };
    if (c.labQueued) return { ok: false, msg: "Already at the lab." };
    c.labQueued = true;
    G.lab.push({ clueId: clueId, doneAt: G.time + COST.lab, done: false });
    log(G, "Sent to lab: " + c.title + " (ready ~" + U.clockStr(G.time + COST.lab) + ")");
    return { ok: true, msg: "Dr. Venn takes the " + c.title.toLowerCase() + ". Results in about an hour." };
  }

  function strongLinks(G, suspectId) {
    var n = 0;
    Object.keys(G.pins).forEach(function (cid) {
      if (G.pins[cid] !== suspectId) return;
      var c = clueById(G, cid);
      if (c && c.pointsTo === suspectId && c.tags.indexOf("redherring") < 0) n++;
    });
    return n;
  }

  function pinClue(G, clueId, suspectId) {
    var c = clueById(G, clueId);
    if (!c || G.found.indexOf(clueId) < 0) return { ok: false, msg: "Clue not found yet." };
    if (c.requiresLab && !c.labDone) return { ok: false, msg: "Lab hasn't finished with this one." };
    G.pins[clueId] = suspectId;
    return { ok: true, msg: "Pinned." };
  }
  function unpinClue(G, clueId) { delete G.pins[clueId]; return { ok: true }; }

  function canAccuse(G, suspectId) {
    if (G.result) return { ok: false, msg: "Case closed." };
    var links = strongLinks(G, suspectId);
    if (links >= 2) return { ok: true, links: links };
    if (G.time >= DAWN && links >= 1)
      return { ok: true, links: links, risky: true };
    return { ok: false, msg: "You need at least 2 strong evidence links to name " + susById(G, suspectId).name + ". (Have " + links + ")" };
  }

  function accuse(G, suspectId) {
    var chk = canAccuse(G, suspectId);
    if (!chk.ok) return chk;
    var correct = suspectId === G.case.culpritId;
    G.result = caseResult(G, correct, correct ? "arrest" : "cold", suspectId);
    log(G, "Accused " + susById(G, suspectId).name + " — " + (correct ? "RIGHT" : "WRONG"));
    return { ok: true, correct: correct, result: G.result };
  }

  function caseResult(G, won, kind, accusedId) {
    var timeUsed = Math.min(G.time, DAWN);
    var score = 1000 - Math.floor(timeUsed / 10) * 10 - (3 - G.credibility) * 150;
    if (won) {
      var links = accusedId ? strongLinks(G, accusedId) : 0;
      score += links >= 3 ? 200 : 100;
      if (timeUsed < 240) score += 150;
    } else score = Math.max(50, Math.floor(score / 3));
    var rank = score >= 1150 ? "S" : score >= 950 ? "A" : score >= 700 ? "B" : "C";
    if (kind === "benched") rank = "D";
    G.totalScore += score;
    if (!won) G.failedNights.push(G.night);
    return { won: won, kind: kind, score: score, rank: rank, timeUsed: timeUsed, accusedId: accusedId };
  }

  function dawnFile(G) {
    // forced at dawn: accuse best-linked suspect or file unsolved
    if (G.result) return G.result;
    var best = null, bestN = 0;
    G.case.suspects.forEach(function (s) {
      var n = strongLinks(G, s.id);
      if (n > bestN) { bestN = n; best = s.id; }
    });
    if (best && bestN >= 1) return accuse(G, best).result;
    G.result = caseResult(G, false, "cold", null);
    log(G, "Filed unsolved at dawn.");
    return G.result;
  }

  // ---- endings (after night 5 correct accusation) ----
  function endingChoices() {
    return [
      { id: "arrest", label: "\"You're under arrest.\"",
        hint: "Read him his rights. By the book.",
        text: "The cuffs click like a final piano key. The Pale Composer smiles all the way to the wagon — but Grayharbor sleeps easier, and your name is on the commendation. Captain Reyes buys the coffee. For once, the rain feels clean." },
      { id: "walk", label: "\"Walk. For now.\"",
        hint: "Let him go — you can't prove the earlier ones.",
        text: "You open the door. He straightens his coat, nods once, and steps into the rain. A week later a white piano key arrives at the precinct, no note. Somewhere out there, the music hasn't stopped. Neither have you." },
      { id: "deal", label: "\"Tell me about my predecessor.\"",
        hint: "Trade sixty seconds for the truth.",
        text: "Sixty seconds. That's the deal. He talks — about the detective before you, the one who vanished in '49, the case the department buried. When the sixty seconds end, so does he, into the night. You got the truth. Whether it was worth the price, you'll decide every rainy night for the rest of your life." }
    ];
  }
  function chooseEnding(G, id) {
    var c = endingChoices().filter(function (e) { return e.id === id; })[0];
    G.ending = id;
    log(G, "Ending chosen: " + id);
    return c;
  }

  // ---- save / load ----
  function save(G) {
    try {
      var data = {
        v: 1, seed: G.seed, night: G.night, totalScore: G.totalScore, rep: G.rep,
        // locations used BEFORE this night, so continuing regenerates the same case
        usedLocs: G.usedLocs.slice(0, Math.max(0, G.night - 1)),
        failedNights: G.failedNights,
        settings: G.settings || null
      };
      if (typeof localStorage !== "undefined") localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  }
  function loadMeta() {
    try {
      if (typeof localStorage === "undefined") return null;
      var d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d || d.v !== 1) return null;
      return d;
    } catch (e) { return null; }
  }
  // Restore a saved campaign: fresh state positioned at the saved night
  // (the night restarts — same seed => identical case).
  function load(meta) {
    if (!meta) return null;
    var G = create(meta.seed);
    G.totalScore = meta.totalScore || 0;
    G.rep = meta.rep || 0;
    G.usedLocs = (meta.usedLocs || []).slice();
    G.failedNights = meta.failedNights || [];
    G.settings = meta.settings || null;
    startNight(G, meta.night);
    return G;
  }
  function clearSave() {
    try { if (typeof localStorage !== "undefined") localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  globalThis.ColdLeadGame = {
    create: create, startNight: startNight, doTravel: doTravel, doSweep: doSweep,
    doExchange: doExchange, queueLab: queueLab, pinClue: pinClue, unpinClue: unpinClue,
    strongLinks: strongLinks, canAccuse: canAccuse, accuse: accuse,
    dawnFile: dawnFile, advanceTime: advanceTime,
    clueById: clueById, susById: susById, sceneName: sceneName,
    endingChoices: endingChoices, chooseEnding: chooseEnding,
    save: save, loadMeta: loadMeta, load: load, clearSave: clearSave,
    REYES_BRIEF: REYES_BRIEF, DAWN: DAWN, COST: COST, SAVE_KEY: SAVE_KEY
  };
})();
