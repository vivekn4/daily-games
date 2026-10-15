/* COLD LEAD — assets.js : external sprite loading + noir pre-grading.
   Loads CC0/CC-BY art (see SPRITES.md), pre-renders noir-graded variants,
   exposes ColdLeadAssets.get(name). Fully offline (bundled PNGs).
   Fails soft: if anything fails to load, the game falls back to procedural art. */
"use strict";
(function () {
  var MANIFEST = {
    // painterly female suspect portraits (Chibizilla, CC-BY 4.0, noir-graded at build)
    faces: ["face_f00", "face_f01", "face_f02", "face_f03", "face_f04", "face_f05", "face_f06", "face_f07"],
    // player detective (jordyadan, CC0)
    detective: ["det_idle", "det_walk0", "det_walk1", "det_walk2", "det_walk3"],
    // clue icons (ARoachIFoundOnMyPillow, CC0)
    items: ["magnifying_glass", "envelope", "knife", "newspaper", "binoculars", "bottle", "coffin", "bone_skull"]
  };
  var PATHS = { faces: "assets/faces/", detective: "assets/detective/", items: "assets/items/" };

  var cache = {};       // name -> HTMLImageElement
  var failed = {};      // name -> true
  var readyResolve;
  var ready = new Promise(function (res) { readyResolve = res; });

  function loadOne(cat, name) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () { cache[name] = img; res(true); };
      img.onerror = function () { failed[name] = true; res(false); };
      var inline = globalThis.__CL_ASSET_DATA && globalThis.__CL_ASSET_DATA[name];
      img.src = inline || (PATHS[cat] + name + ".png");
    });
  }

  function loadAll() {
    var jobs = [];
    Object.keys(MANIFEST).forEach(function (cat) {
      MANIFEST[cat].forEach(function (name) { jobs.push(loadOne(cat, name)); });
    });
    Promise.all(jobs).then(function () { readyResolve(true); });
  }

  // Female first names in the generator (keep in sync with casegen.js FIRST).
  var FEMALE = { Vera: 1, Marta: 1, Louise: 1, Ada: 1, Rosa: 1, Clara: 1, Bea: 1, Nina: 1, Iris: 1, Pearl: 1, June: 1, Opal: 1, Cora: 1, Lena: 1, Mabel: 1 };

  function isFemaleName(fullName) {
    var first = (fullName || "").split(" ")[0];
    return !!FEMALE[first];
  }

  // Deterministic face pick for a suspect: seed hash -> 0..7
  function faceFor(seedStr) {
    var U = globalThis.ColdLeadUtil;
    var h = U.hashStr("face:" + seedStr);
    return "face_f" + String(h % 8).padStart(2, "0");
  }

  // Map a clue kind/item to an icon sprite name (fallback: null -> drawn glyph)
  var CLUE_ICON = {
    envelope: "envelope", letter: "envelope", note: "envelope", document: "newspaper",
    newspaper: "newspaper", article: "newspaper",
    knife: "knife", weapon: "knife",
    bottle: "bottle", poison: "bottle",
    bone_skull: "bone_skull", remains: "bone_skull",
    coffin: "coffin",
    magnifying_glass: "magnifying_glass"
  };
  function iconFor(clue) {
    if (!clue) return "magnifying_glass";
    var t = (clue.title || "").toLowerCase();
    for (var k in CLUE_ICON) { if (t.indexOf(k.replace("_", " ")) >= 0 || t.indexOf(k) >= 0) return CLUE_ICON[k]; }
    return "magnifying_glass";
  }

  if (document.readyState === "complete" || document.readyState === "interactive") loadAll();
  else document.addEventListener("DOMContentLoaded", loadAll);

  globalThis.ColdLeadAssets = {
    ready: ready,
    get: function (name) { return cache[name] || null; },
    has: function (name) { return !!cache[name]; },
    isFemaleName: isFemaleName,
    faceFor: faceFor,
    iconFor: iconFor,
    stats: function () {
      return { loaded: Object.keys(cache).length, failed: Object.keys(failed) };
    }
  };
})();
