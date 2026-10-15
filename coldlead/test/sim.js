/* COLD LEAD — autopilot sim: verifies case logic guarantees across seeds,
   then plays a full 5-night campaign with a solver strategy.
   Usage: node test/sim.js [seed] */
"use strict";
require("../js/util.js");
require("../js/casegen.js");
require("../js/dialogue.js");
require("../js/game.js");

var GEN = globalThis.ColdLeadGen, GM = globalThis.ColdLeadGame;
var failures = 0;
function assert(cond, msg) { if (!cond) { failures++; console.log("FAIL: " + msg); } }

// ---- 1. generator logic guarantees across 200 seeds x 5 nights ----
var SEEDS = 200, genFails = 0, totalCases = 0;
for (var s = 0; s < SEEDS; s++) {
  var used = [];
  for (var night = 1; night <= 5; night++) {
    var c = GEN.generateCase((s * 100003 + night * 7919) >>> 0, night, used);
    used.push(c.location.id);
    var v = GEN.verifyCase(c);
    totalCases++;
    if (!v.ok) { genFails++; if (genFails < 4) console.log("seed " + s + " night " + night + ": " + v.errors.join("; ")); }
  }
}
console.log("gen: " + totalCases + " cases, " + genFails + " logic failures");
assert(genFails === 0, "case generator logic guarantees");

// ---- 2. solver plays a full campaign ----
function solveNight(G) {
  var cs = G.case;
  // sweep every scene once (reveals all)
  cs.location.scenes.forEach(function (sc) { GM.doTravel(G, sc.id); GM.doSweep(G); });
  // queue all forensic clues at the lab
  G.found.forEach(function (cid) {
    var cl = GM.clueById(G, cid);
    if (cl.requiresLab) GM.queueLab(G, cid);
  });
  // interrogate everyone: empathize all topics (safe), then bluff culprit with pointers
  cs.suspects.forEach(function (su) {
    ["alibi", "motive", "victim", "others"].forEach(function (t) {
      GM.doExchange(G, su.id, t, "empathize", null);
    });
  });
  // fast-forward to let lab finish (simulate waiting by sweeping nothing — just advance)
  GM.advanceTime(G, 120);
  // pin every pointing clue to its suspect
  G.found.forEach(function (cid) {
    var cl = GM.clueById(G, cid);
    if (cl.pointsTo && cl.tags.indexOf("redherring") < 0) GM.pinClue(G, cid, cl.pointsTo);
  });
  // accuse the culprit
  var chk = GM.canAccuse(G, cs.culpritId);
  assert(chk.ok, "solver can accuse culprit (links=" + (chk.links || 0) + ")");
  var r = GM.accuse(G, cs.culpritId);
  assert(r.ok && r.correct, "solver accusation correct");
  return r;
}

var seed = parseInt(process.argv[2] || "777", 10) >>> 0;
var G = GM.create(seed);
var ranks = [];
for (var n = 1; n <= 5; n++) {
  GM.startNight(G, n);
  var res = solveNight(G);
  ranks.push(res.result.rank);
  console.log("night " + n + ": " + (res.correct ? "SOLVED" : "FAILED") +
    " rank=" + res.result.rank + " score=" + res.result.score +
    " time=" + res.result.timeUsed + "m culprit=" + G.case.culpritId);
  assert(res.correct, "night " + n + " solved by solver");
}
// endings reachable after night-5 win
var choices = GM.endingChoices();
assert(choices.length === 3, "3 endings offered");
choices.forEach(function (ch) {
  var e = GM.chooseEnding(G, ch.id);
  assert(e && e.text.length > 100, "ending text present: " + ch.id);
});
console.log("campaign score: " + G.totalScore + " ranks: " + ranks.join(","));

// ---- 3. wrong accusation path ----
var G2 = GM.create(4242);
GM.startNight(G2, 1);
G2.case.location.scenes.forEach(function (sc) { GM.doTravel(G2, sc.id); GM.doSweep(G2); });
var innocent = G2.case.suspects.filter(function (s) { return s.id !== G2.case.culpritId; })[0];
// pin two REAL pointing clues to the innocent anyway (pins don't check truth)
var ptrs = G2.found.map(function (cid) { return GM.clueById(G2, cid); })
  .filter(function (cl) { return cl.pointsTo === G2.case.culpritId && cl.tags.indexOf("redherring") < 0; });
ptrs.slice(0, 2).forEach(function (cl) { GM.pinClue(G2, cl.id, innocent.id); });
// NOTE: pins point at culprit, so strongLinks(innocent) counts only pins whose
// clue.pointsTo === innocent -> 0. canAccuse should refuse.
var chk2 = GM.canAccuse(G2, innocent.id);
assert(!chk2.ok, "cannot accuse with 0 strong links (pins are evidence-bound)");

// ---- 4. press-lockout path doesn't soft-lock ----
var G3 = GM.create(999);
GM.startNight(G3, 1);
var s0 = G3.case.suspects[0];
for (var i = 0; i < 12 && !s0.locked; i++) GM.doExchange(G3, s0.id, "alibi", "press", null);
// locked or not, other suspects remain available
var othersOk = G3.case.suspects.slice(1).every(function (s) { return !s.locked; });
assert(othersOk, "lockout is per-suspect, never global");

console.log(failures === 0 ? "ALL SIM CHECKS PASSED" : failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
