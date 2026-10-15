/* COLD LEAD — casegen.js : seeded procedural case generator.
   Generates victim, location, suspects, motives, alibis, clues, timeline.
   LOGIC GUARANTEE: culprit has >=2 pointing clues; every innocent has >=1
   exonerating fact. verifyCase() asserts this (used by game + sim). */
"use strict";
(function () {
  var U = globalThis.ColdLeadUtil;

  var FIRST = ["Vera", "Sal", "Marta", "Eddie", "Louise", "Frank", "Ada", "Mickey", "Rosa", "Vincent", "Clara", "Otto", "Bea", "Harlan", "Nina", "Gus", "Iris", "Leo", "Pearl", "Dante", "Mabel", "Rocco", "June", "Silas", "Opal", "Rudy", "Cora", "Felix", "Lena", "Amos"];
  var LAST = ["Marlowe", "Vance", "Kovacs", "Delacroix", "Ferro", "Quill", "Blackwood", "Reyes", "Callahan", "Moreau", "Slade", "Venn", "Okafor", "Lindqvist", "Frost", "Gable", "Hart", "Ivers", "Jansen", "Kane", "Locke", "Morrow", "Nash", "Osborne", "Pike", "Quinn", "Rourke", "Stanton", "Thorne", "Vega"];
  var JOBS = ["jazz singer", "dock foreman", "antiques dealer", "theater director", "newspaper editor", "bank manager", "prizefighter", "radio host", "gallery owner", "hotelier", "bookie", "tailor to the mob"];

  var LOCATIONS = [
    { id: "club", name: "The Blue Note Jazz Club", painter: "club",
      scenes: [
        { id: "stage", name: "Stage", desc: "A single spotlight on an empty microphone. The piano lid is up, sheet music scattered." },
        { id: "office", name: "Back Office", desc: "A cramped office smelling of cigar smoke. Ledgers, a safe, a telephone." },
        { id: "alley", name: "Back Alley", desc: "Rain hammers the fire escape. A dumpster, a broken bottle, tire tracks in the mud." }
      ],
      roles: ["club owner", "singer", "bartender", "trumpet player", "bookie", "waitress"] },
    { id: "theater", name: "Harlow Theater", painter: "theater",
      scenes: [
        { id: "stage", name: "Stage", desc: "Footlights glare on painted canvas flats. A prop dagger lies center stage." },
        { id: "dressing", name: "Dressing Rooms", desc: "Mirrors ringed with bulbs, greasepaint, discarded costumes, a locked trunk." },
        { id: "box", name: "Box Office", desc: "Ticket stubs, a cash drawer, the night's receipts — and a torn review." }
      ],
      roles: ["director", "lead actress", "stagehand", "critic", "understudy", "producer"] },
    { id: "warehouse", name: "Pier 9 Warehouse", painter: "warehouse",
      scenes: [
        { id: "floor", name: "Warehouse Floor", desc: "Crates stacked to the rafters. A forklift idles. The manifest office glows." },
        { id: "office", name: "Foreman's Office", desc: "Shipping manifests, a wall safe, a half-eaten sandwich, a radio." },
        { id: "dock", name: "Loading Dock", desc: "Rain slicks the concrete. A moored freighter groans. Rope, pallets, oil stains." }
      ],
      roles: ["foreman", "dockworker", "customs inspector", "truck driver", "night watchman", "union rep"] },
    { id: "hotel", name: "Grand Meridian Hotel", painter: "hotel",
      scenes: [
        { id: "penthouse", name: "Penthouse Suite", desc: "Champagne on ice, a shattered glass, the city glittering below." },
        { id: "lobby", name: "Lobby", desc: "Marble, brass, and hushed voices. The register lies open on the desk." },
        { id: "service", name: "Service Corridor", desc: "Narrow, humming with pipes. Linen carts, a service elevator, a key rack." }
      ],
      roles: ["concierge", "maid", "business partner", "ex-spouse", "bellhop", "bartender"] },
    { id: "museum", name: "Blackwood Museum", painter: "museum",
      scenes: [
        { id: "gallery", name: "Main Gallery", desc: "An empty display case, glass lid ajar. Velvet ropes. One spotlight still on." },
        { id: "archive", name: "Archive Room", desc: "Flat files, catalog cards, a magnifier, the smell of old paper." },
        { id: "loading", name: "Loading Bay", desc: "A delivery van with the engine cold. Packing crates, straw, a clipboard." }
      ],
      roles: ["curator", "benefactor", "restorer", "guard", "art critic", "donor"] },
    { id: "train", name: "The Owl — Night Train", painter: "train",
      scenes: [
        { id: "sleeper", name: "Sleeper Car", desc: "Berth curtains drawn. A valise open, a ticket stub, a cold cup of coffee." },
        { id: "dining", name: "Dining Car", desc: "White tablecloths, silver gone dull, a wine list with a circled vintage." },
        { id: "platform", name: "Rear Platform", desc: "Wind and cinders. The rails scream below. A dropped glove, a torn timetable." }
      ],
      roles: ["conductor", "dining-car waiter", "fellow passenger", "porter", "ticket inspector", "lounge pianist"] }
  ];

  var MOTIVES = [
    { t: "owed the victim a small fortune in gambling debts", s: "strong" },
    { t: "was about to be exposed for skimming money", s: "strong" },
    { t: "stood to inherit the victim's share of the business", s: "strong" },
    { t: "had been fired by the victim last month", s: "strong" },
    { t: "was being blackmailed by the victim for years", s: "strong" },
    { t: "quarreled with the victim over money last week", s: "weak" },
    { t: "resented the victim's success, or so people say", s: "weak" },
    { t: "had a loud argument with the victim days ago", s: "weak" }
  ];
  var WEAPONS = ["revolver", "letter opener", "wrench", "silk scarf", "brass candlestick", "ice pick", "poison vial", "tire iron"];
  var PERSONALITIES = ["cooperative", "nervous", "hostile", "slick"];
  var ALIBI_TRUE = [
    "was tending the bar all evening — a dozen witnesses",
    "was on the telephone with the precinct about a noise complaint",
    "was playing cards in the back room with three regulars",
    "was on stage performing until midnight",
    "was signing for a delivery at the front desk",
    "was asleep in the staff quarters; the night clerk saw them"
  ];
  var ALIBI_FALSE = [
    "claims they were home alone reading",
    "claims they left before midnight, but nobody saw them go",
    "claims they were across town, but can't name a witness",
    "claims they never left the lounge — the lounge was empty"
  ];

  var WITNESS_PHRASES = [
    "swears they saw {s} near the {scene} around midnight",
    "heard {s} arguing with the victim earlier that night",
    "noticed {s}'s coat was damp, like they'd been out in the rain"
  ];

  function fullName(rng, used) {
    for (var tries = 0; tries < 40; tries++) {
      var n = rng.pick(FIRST) + " " + rng.pick(LAST);
      if (!used[n]) { used[n] = true; return n; }
    }
    return rng.pick(FIRST) + " " + rng.pick(LAST) + " " + (tries);
  }

  function generateCase(seed, caseNo, usedLocIds) {
    var rng = U.RNG(seed);
    var usedNames = {};
    var locPool = LOCATIONS.filter(function (l) { return usedLocIds.indexOf(l.id) < 0; });
    var loc = rng.pick(locPool.length ? locPool : LOCATIONS);
    var nSuspects = caseNo <= 1 ? 4 : (caseNo <= 3 ? 5 : 6);
    var roles = rng.shuffle(loc.roles).slice(0, nSuspects);

    var victim = { name: fullName(rng, usedNames), job: rng.pick(JOBS) };
    var weapon = rng.pick(WEAPONS);
    var suspects = roles.map(function (role, i) {
      return {
        id: "s" + i, name: fullName(rng, usedNames), role: role,
        personality: rng.pick(PERSONALITIES),
        motive: null, motiveStrength: "none",
        alibi: "", alibiTrue: true, corroboratedBy: null,
        secret: "", composure: 70, locked: false, cracked: false,
        portraitSeed: "p" + seed + "_" + i
      };
    });

    var culpritIdx = rng.int(0, suspects.length - 1);
    var culprit = suspects[culpritIdx];

    // motives: culprit strong; 1-2 innocents weak (red herrings)
    culprit.motive = rng.pick(MOTIVES.filter(function (m) { return m.s === "strong"; })).t;
    culprit.motiveStrength = "strong";
    var innocents = suspects.filter(function (s) { return s !== culprit; });
    var redCount = Math.min(innocents.length - 1, rng.int(1, 2));
    rng.shuffle(innocents).slice(0, redCount).forEach(function (s) {
      var m = rng.pick(MOTIVES.filter(function (x) { return x.s === "weak"; }));
      s.motive = m.t; s.motiveStrength = "weak";
    });

    // alibis
    culprit.alibi = rng.pick(ALIBI_FALSE); culprit.alibiTrue = false;
    innocents.forEach(function (s) {
      if (rng.chance(0.7)) {
        s.alibi = rng.pick(ALIBI_TRUE); s.alibiTrue = true;
        // corroborator: another innocent
        var others = innocents.filter(function (o) { return o !== s; });
        if (others.length) s.corroboratedBy = rng.pick(others).name;
      } else {
        s.alibi = rng.pick(ALIBI_FALSE); s.alibiTrue = false; // shaky but innocent
      }
    });

    // secrets
    var SECRETS_INNOCENT = [
      "has been skimming small amounts for months — unrelated to the murder",
      "was having an affair with someone at the " + loc.name,
      "owes money to people you don't want to meet",
      "lied about their past — the name isn't the one they were born with",
      "was planning to quit and leave Grayharbor tonight"
    ];
    suspects.forEach(function (s) {
      if (s === culprit) s.secret = "keeps a second set of books — and a temper to match";
      else s.secret = rng.pick(SECRETS_INNOCENT);
    });

    // ---- clues ----
    var clues = [], cid = 0;
    function addClue(o) {
      o.id = "c" + (cid++);
      o.found = false; o.labDone = false; o.labQueued = false;
      clues.push(o); return o;
    }
    var sceneIds = loc.scenes.map(function (s) { return s.id; });
    function anyScene() { return rng.pick(sceneIds); }

    // CULPRIT means clue (physical)
    addClue({
      kind: "physical", scene: anyScene(),
      title: "The " + weapon,
      text: "A " + weapon + ", wiped clean. But the grip is wrapped in tape — the same unusual tape " + culprit.name + " the " + culprit.role + " is known to use.",
      pointsTo: culprit.id, exonerates: null, tags: ["means"]
    });
    // CULPRIT alibi-breaker (testimonial from a witness innocent)
    var witness = rng.pick(innocents);
    addClue({
      kind: "testimonial", scene: anyScene(),
      title: "Witness account",
      text: witness.name + " " + rng.pick(WITNESS_PHRASES).replace("{s}", culprit.name).replace("{scene}", loc.scenes[0].name.toLowerCase()) + " — though " + culprit.name + " claims " + culprit.alibi + ".",
      pointsTo: culprit.id, exonerates: null, tags: ["opportunity"]
    });
    // CULPRIT forensic pointer (requires lab)
    addClue({
      kind: "forensic", scene: anyScene(), requiresLab: true,
      title: "Lab: prints on the " + weapon,
      text: "Dr. Venn's report: a partial print lifted from the " + weapon + " matches " + culprit.name + " on file.",
      pointsTo: culprit.id, exonerates: null, tags: ["means"]
    });

    // INNOCENT exonerations
    innocents.forEach(function (s) {
      if (s.corroboratedBy) {
        addClue({
          kind: "testimonial", scene: anyScene(),
          title: "Corroborated alibi",
          text: s.corroboratedBy + " confirms it: " + s.name + " " + s.alibi + ".",
          pointsTo: null, exonerates: s.id, tags: ["alibi"]
        });
      } else {
        // shaky alibi innocent: physical proof they weren't involved
        addClue({
          kind: "physical", scene: anyScene(),
          title: "Timestamped receipt",
          text: "A timestamped receipt puts " + s.name + " far from the scene at the critical hour. The alibi was shaky; the paper isn't.",
          pointsTo: null, exonerates: s.id, tags: ["alibi"]
        });
      }
    });

    // neutral forensic (lab flavor)
    addClue({
      kind: "forensic", scene: anyScene(), requiresLab: true,
      title: "Lab: fiber analysis",
      text: "Dr. Venn: gray wool fibers, common coat lining. Inconclusive — half of Grayharbor owns such a coat.",
      pointsTo: null, exonerates: null, tags: []
    });

    // red herring: innocent's weak motive looks bad
    var herringSus = innocents.filter(function (s) { return s.motiveStrength === "weak"; })[0];
    if (herringSus) {
      addClue({
        kind: "physical", scene: anyScene(),
        title: "An angry letter",
        text: "A furious unsent letter from " + herringSus.name + " to the victim. Dated three days ago — all bluster, no follow-through.",
        pointsTo: herringSus.id, exonerates: null, tags: ["redherring"]
      });
    }

    // composer calling card (cases 2+): meta-arc flavor
    var composer = caseNo >= 2;
    if (composer) {
      addClue({
        kind: "physical", scene: loc.scenes[0].id,
        title: "A white piano key",
        text: "Tucked where only the killer would leave it: a single white piano key, polished. You've seen this before. The papers call him the Pale Composer.",
        pointsTo: null, exonerates: null, tags: ["composer"]
      });
    }

    // timeline
    var timeline = [
      "21:40 — " + victim.name + " (" + victim.job + ") arrives at the " + loc.name + ".",
      "23:15 — raised voices heard near the " + loc.scenes[0].name.toLowerCase() + ".",
      "00:05 — the night watchman finds the body.",
      "00:20 — you get the call. Rain's coming down hard."
    ];

    return {
      seed: seed, caseNo: caseNo, location: loc, victim: victim,
      weapon: weapon, suspects: suspects, culpritId: culprit.id,
      clues: clues, timeline: timeline, composer: composer,
      brief: "Case " + caseNo + ": " + victim.name + ", " + victim.job + ", found dead at the " + loc.name + ". " + suspects.length + " persons of interest. Work it before dawn."
    };
  }

  function verifyCase(c) {
    var errors = [];
    var pointing = {};
    c.suspects.forEach(function (s) { pointing[s.id] = 0; });
    c.clues.forEach(function (cl) {
      if (cl.pointsTo && pointing[cl.pointsTo] !== undefined && cl.tags.indexOf("redherring") < 0) pointing[cl.pointsTo]++;
    });
    if ((pointing[c.culpritId] || 0) < 2)
      errors.push("culprit has fewer than 2 pointing clues");
    c.suspects.forEach(function (s) {
      if (s.id === c.culpritId) return;
      var ex = c.clues.some(function (cl) { return cl.exonerates === s.id; });
      if (!ex) errors.push("innocent " + s.name + " has no exonerating clue");
    });
    var sceneIds = c.location.scenes.map(function (s) { return s.id; });
    c.clues.forEach(function (cl) {
      if (sceneIds.indexOf(cl.scene) < 0) errors.push("clue " + cl.id + " bad scene");
    });
    var names = c.suspects.map(function (s) { return s.name; });
    if (new Set(names).size !== names.length) errors.push("duplicate suspect names");
    if (names.indexOf(c.victim.name) >= 0) errors.push("victim shares suspect name");
    return { ok: errors.length === 0, errors: errors, pointing: pointing };
  }

  globalThis.ColdLeadGen = { generateCase: generateCase, verifyCase: verifyCase, LOCATIONS: LOCATIONS };
})();
