/* LANTERNVALE js/assets.js — ARTIST INTEGRATION POINT (asset loader).
   The artist's PNG set (see SPRITES.md, assets/) is catalogued here.
   Engine default mode is "code" (code-drawn art, zero network); the
   integrator flips Assets.mode = "png" and the draw functions in
   js/game.js consult Assets.get(name) with code-drawn fallback.
   Manifest keys match the logical sprite names used by game.js. */
(function () {
  "use strict";
  var LV = (typeof globalThis !== "undefined" && globalThis.LV) || {};
  if (typeof globalThis !== "undefined") globalThis.LV = LV;

  var MANIFEST = {
    // terrain tiles (64x64)
    "tile.meadow": "assets/tiles/meadow.png",
    "tile.grove": "assets/tiles/grove_floor.png",
    "tile.path": "assets/tiles/path.png",
    "tile.cliff": "assets/tiles/cliff.png",
    "tile.hollow": "assets/tiles/hollow_ground.png",
    "tile.ford": "assets/tiles/ford.png",
    "tile.river0": "assets/tiles/river_0.png",
    "tile.river1": "assets/tiles/river_1.png",
    "tile.river2": "assets/tiles/river_2.png",
    "tile.river3": "assets/tiles/river_3.png",
    // characters (walk strips)
    "wren.south": "assets/chars/wren_south.png",
    "wren.north": "assets/chars/wren_north.png",
    "wren.east": "assets/chars/wren_east.png",
    "wren.west": "assets/chars/wren_west.png",
    "npc.wewake": "assets/chars/wewake.png",
    "npc.meera": "assets/chars/meera.png",
    "npc.vipul": "assets/chars/ferryman.png",
    "npc.dev": "assets/chars/innkeeper.png",
    "npc.shivangi": "assets/chars/child.png",
    // towers (72x104, lit + unlit)
    "tower.1.lit": "assets/towers/tower1_lit.png",
    "tower.1.unlit": "assets/towers/tower1_unlit.png",
    "tower.2.lit": "assets/towers/tower2_lit.png",
    "tower.2.unlit": "assets/towers/tower2_unlit.png",
    "tower.3.lit": "assets/towers/tower3_lit.png",
    "tower.3.unlit": "assets/towers/tower3_unlit.png",
    "tower.4.lit": "assets/towers/tower4_lit.png",
    "tower.4.unlit": "assets/towers/tower4_unlit.png",
    "tower.5.lit": "assets/towers/tower5_lit.png",
    "tower.5.unlit": "assets/towers/tower5_unlit.png",
    // fx
    "fx.bloom1": "assets/fx/bloom_1.png",
    "fx.bloom2": "assets/fx/bloom_2.png",
    "fx.bloom3": "assets/fx/bloom_3.png",
    "fx.pollen": "assets/fx/pollen.png",
    "fx.glow": "assets/fx/glow_dot.png",
    "fx.rain": "assets/fx/rain_tile.png",
    "fx.fog": "assets/fx/fog_bank.png",
    "fx.godray": "assets/fx/godray.png",
    // ui
    "ui.compass": "assets/ui/compass.png",
    "ui.journal": "assets/ui/journal.png",
    "ui.audio_on": "assets/ui/audio_on.png",
    "ui.audio_off": "assets/ui/audio_off.png"
  };

  var cache = {};
  var Assets = {
    mode: "code", // "code" | "png"  (integrator flips to "png")
    manifest: MANIFEST,
    get: function (name) { return cache[name] || null; },
    load: function (names) {
      // loads named sprites; resolves with {name: Image|null}. Never rejects.
      if (typeof window === "undefined" || typeof Image === "undefined") return Promise.resolve({});
      var list = names || Object.keys(MANIFEST);
      return Promise.all(list.map(function (n) {
        return new Promise(function (res) {
          var img = new Image();
          img.onload = function () { cache[n] = img; res(); };
          img.onerror = function () { res(); }; // code-drawn fallback stays
          img.src = MANIFEST[n];
        });
      })).then(function () { return cache; });
    },
    preloadAll: function () {
      if (Assets.mode !== "png") return Promise.resolve({});
      return Assets.load();
    }
  };

  LV.assets = Assets;
  if (typeof module !== "undefined" && module.exports) module.exports = Assets;
})();
