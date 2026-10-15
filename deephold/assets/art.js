/* ============================================================================
 * DEEPHOLD — art.js
 * Code-drawn pixel-art sprite set + procedural abyssal backgrounds.
 * Vanilla JS, no dependencies. Renders once to offscreen canvases at load;
 * the game blits cached canvases with integer scaling (nearest-neighbor).
 *
 * Palette: "ABYSSAL" — deep-sea industrial + bioluminescent accents.
 * Integration:
 *   Art.init()                       -> builds all sprites (call once)
 *   Art.get(name, opts)              -> cached HTMLCanvasElement
 *        opts: {tier:1|2|3, branch:'A'|'B', frame:0..n, elite:bool}
 *   Art.bg(seed, w, h)               -> seeded water/parallax background canvas
 *   Art.PAL                          -> palette object (for programmer use)
 * Sprite scale in-game: 2x (16px -> 32px) for towers/enemies, bosses 2x.
 * ========================================================================== */
(function (global) {
  'use strict';

  /* ---------------- Palette: ABYSSAL (16 colors) ---------------- */
  var PAL = {
    K: '#04090f', // near-black (outlines, trench dark)
    D: '#0a1826', // deep water
    N: '#10293f', // navy
    B: '#1b4a6b', // mid blue
    T: '#2a7d8f', // teal
    C: '#46f2cf', // bio cyan (bright)
    c: '#189a80', // bio cyan (dim)
    G: '#ffcf4d', // bio gold (bright)
    g: '#a87f24', // bio gold (dim)
    W: '#eaf7ff', // white-blue
    w: '#9fb3c8', // steel light
    S: '#5a6b7d', // steel dark
    s: '#2c3641', // steel darker
    R: '#ff4d5e', // warning red
    r: '#8f2430', // dark red
    P: '#b46bff', // bio violet (lurker/stealth)
    M: '#ff8c42', // magma orange (vents)
    m: '#8f4418', // dark magma
  };
  // '.' = transparent

  /* ---------------- Sprite compiler ---------------- */
  var cache = {};
  function compile(name, rows) {
    var h = rows.length, w = rows[0].length;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    for (var y = 0; y < h; y++) {
      var row = rows[y];
      for (var xx = 0; xx < w; xx++) {
        var col = PAL[row[xx]];
        if (col) { x.fillStyle = col; x.fillRect(xx, y, 1, 1); }
      }
    }
    cache[name] = c;
    return c;
  }
  function px(c, x, y, col) { // stamp a pixel by palette key
    var g = c.getContext('2d');
    g.fillStyle = PAL[col];
    g.fillRect(x, y, 1, 1);
  }

  /* ============ TOWER BASES (top-down, 16x16) ============ */
  // Every tower family: base ring + family silhouette. Tier accents are
  // stamped by stampTier() — tier2 = armor corners, tier3A = gold war-chevrons
  // (damage branch), tier3B = cyan control ring (utility branch).

  var TOWERS = {
  harpoon: [
    '................',
    '......KKKK......',
    '.....KwwwwK.....',
    '....KwwGGwwK....',
    '....KwGGGGwK....',
    '....KwwGGwwK....',
    '.....KwwwwK.....',
    '....KKsSSsKK....',
    '...KsSSSSSSsK...',
    '..KsSSsSSsSSsK..',
    '..KsSssssssSsK..',
    '..KsSsKKKKsSsK..',
    '...KsSK....KSK..',
    '....KK......KK..',
    '................',
    '................',
  ],
  flak: [
    '................',
    '.....KKKKKK.....',
    '....KwwwwwwK....',
    '...KwwKwwKwwK...',
    '...KwKwRRwKwK...',
    '...KwwKwwKwwK...',
    '....KwwwwwwK....',
    '....KsSSSSsK....',
    '...KsSSSSSSsK...',
    '..KsSSsSSsSSsK..',
    '..KsSssssssSsK..',
    '..KssssssssssK..',
    '...KssssssssK...',
    '....KKKKKKKK....',
    '................',
    '................',
  ],
  tesla: [
    '................',
    '......KKKK......',
    '.....KCCCCK.....',
    '....KCCWWCCK....',
    '....KCWCCWCK....',
    '....KCCWWCCK....',
    '.....KCCCCK.....',
    '......KKKK......',
    '....KKsSSsKK....',
    '...KsSSSSSSsK...',
    '..KsSSsSSsSSsK..',
    '..KsSssssssSsK..',
    '..KssssssssssK..',
    '...KssssssssK...',
    '....KKKKKKKK....',
    '................',
  ],
  sonar: [
    '................',
    '.....KKKKKK.....',
    '....KTTTTTTK....',
    '...KTTKCCKTTK...',
    '...KTKCCCCKTK...',
    '...KTTKCCKTTK...',
    '....KTTTTTTK....',
    '.....KKKKKK.....',
    '....KKsSSsKK....',
    '...KsSSSSSSsK...',
    '..KsSSsSSsSSsK..',
    '..KsSssssssSsK..',
    '..KssssssssssK..',
    '...KssssssssK...',
    '....KKKKKKKK....',
    '................',
  ],
  mining: [
    '................',
    '......KKKK......',
    '.....KMMMMK.....',
    '.....KMmmMK.....',
    '.....KMMMMK.....',
    '......KKKK......',
    '....KKsSSsKK....',
    '...KssSSSSssK...',
    '..KssSSggSSssK..',
    '..KsSggGGggSsK..',
    '..KsSgGGGGgSsK..',
    '..KssggGGggssK..',
    '...KssssssssK...',
    '....KKKKKKKK....',
    '................',
    '................',
  ],
  sealer: [
    '................',
    '......KKKK......',
    '.....KWWWWK.....',
    '.....KWccWK.....',
    '.....KWWWWK.....',
    '.....KWWWWK.....',
    '....KKWWWWKK....',
    '...KssWWWWssK...',
    '..KsssWWWWsssK..',
    '..KssWWccWWssK..',
    '..KssWccccWssK..',
    '..KssWWccWWssK..',
    '...KssWWWWssK...',
    '....KKKKKKKK....',
    '................',
    '................',
  ]};

  // Tier accent stamping: tier2 -> steel armor corners; tier3 -> branch motif.
  function stampTier(c, tier, branch) {
    if (tier < 2) return;
    // armor corners
    px(c, 1, 1, 'S'); px(c, 14, 1, 'S'); px(c, 1, 14, 'S'); px(c, 14, 14, 'S');
    px(c, 2, 1, 'w'); px(c, 13, 1, 'w'); px(c, 1, 13, 'w'); px(c, 14, 13, 'w');
    if (tier < 3) return;
    if (branch === 'A') { // damage: gold war-chevrons + red tips
      var pts = [[7,0],[8,0],[6,1],[9,1],[5,2],[10,2]];
      pts.forEach(function(p){ px(c,p[0],p[1],'G'); });
      px(c,7,1,'R'); px(c,8,1,'R');
    } else { // utility: cyan control ring
      var ring = [[5,0],[6,0],[9,0],[10,0],[4,1],[11,1],[3,2],[12,2]];
      ring.forEach(function(p){ px(c,p[0],p[1],'C'); });
      px(c,4,0,'P'); px(c,11,0,'P');
    }
  }

  /* ============ ENEMIES (top-down swimmers, 16x16, 3 frames) ============ */
  // Frames undulate the glow/tentacle pixels — 3 frames reads as swimming
  // with positional bob in-engine. Elite = gold outline stamp (see get()).

  var ENEMIES = {
  drifter: [ // small jelly swarmer, cyan
  [
    '................',
    '......KKKK......',
    '.....KCCCCK.....',
    '....KCCWWCCK....',
    '....KCCCCCCK....',
    '.....KCCCCK.....',
    '......KKKK......',
    '.....Kc..cK.....',
    '.....Kc..cK.....',
    '......c..c......',
    '.....Kc..cK.....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '.....KKKKKK.....',
    '....KCCCCCCK....',
    '...KCCWWWWCCK...',
    '...KCCCCCCCCK...',
    '....KCCCCCCK....',
    '.....KKKKKK.....',
    '......c..c......',
    '.....Kc..cK.....',
    '.....Kc..cK.....',
    '......c..c......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '......KKKK......',
    '.....KCCCCK.....',
    '....KCCWWCCK....',
    '....KCCCCCCK....',
    '.....KCCCCK.....',
    '......KKKK......',
    '......c..c......',
    '......c..c......',
    '.....Kc..cK.....',
    '.....Kc..cK.....',
    '......c..c......',
    '................',
    '................',
    '................',
    '................',
  ]],
  mauler: [ // armored bruiser, steel + red eyes
  [
    '................',
    '....KKKKKKKK....',
    '...KSSSSSSSSK...',
    '..KSsSSssSSsSK..',
    '..KSsSWSSWSsSK..',
    '..KSsSRRRSsSK...',
    '..KSsSSssSSsSK..',
    '...KSSSSSSSSK...',
    '....KsSSSSsK....',
    '...KKsSSSSsKK...',
    '..KRKsSSSSsKRK..',
    '..KRRKSSSSKRRK..',
    '...KKKKKKKKKK...',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '....KKKKKKKK....',
    '...KSSSSSSSSK...',
    '..KSsSSssSSsSK..',
    '..KSsSWSSWSsSK..',
    '..KSsSRRRSsSK...',
    '..KSsSSssSSsSK..',
    '...KSSSSSSSSK...',
    '....KsSSSSsK....',
    '....KsSSSSsK....',
    '..KRKsSSSSsKRK..',
    '..KRRKSSSSKRRK..',
    '...KKKKKKKKKK...',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '....KKKKKKKK....',
    '...KSSSSSSSSK...',
    '..KSsSSssSSsSK..',
    '..KSsSWSSWSsSK..',
    '..KSsSRRRSsSK...',
    '..KSsSSssSSsSK..',
    '...KSSSSSSSSK...',
    '....KsSSSSsK....',
    '...KKsSSSSsKK...',
    '....KsSSSSsK....',
    '..KRRKSSSSKRRK..',
    '...KKKKKKKKKK...',
    '................',
    '................',
    '................',
  ]],
  spitter: [ // ranged cone-snail, violet
  [
    '................',
    '......KKKK......',
    '.....KPPPPK.....',
    '....KPPPPPPK....',
    '....KPPWWPPK....',
    '....KPPPPPPK....',
    '.....KPPPPK.....',
    '......KPPK......',
    '......KPPK......',
    '.....KPPPPK.....',
    '....KPPPPPPK....',
    '....KPPccPPK....',
    '.....KKKKKK.....',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '......KKKK......',
    '.....KPPPPK.....',
    '....KPPPPPPK....',
    '....KPPWWPPK....',
    '....KPPPPPPK....',
    '.....KPPPPK.....',
    '......KPPK......',
    '.....KPPPPK.....',
    '....KPPPPPPK....',
    '...KPPPPPPPPK...',
    '...KPPccccPPK...',
    '....KKKKKKKK....',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '......KKKK......',
    '.....KPPPPK.....',
    '....KPPPPPPK....',
    '....KPPWWPPK....',
    '....KPPPPPPK....',
    '.....KPPPPK.....',
    '......KPPK......',
    '......KPPK......',
    '......KPPK......',
    '....KPPPPPPK....',
    '....KPPccPPK....',
    '.....KKKKKK.....',
    '................',
    '................',
    '................',
  ]],
  lurker: [ // stealth eel — dim by design, revealed by sonar
  [
    '................',
    '................',
    '....KKKKKKKK....',
    '...KPppppppK....',
    '...KpPpppppK....',
    '...KppppppPK....',
    '....KKKKKKKK....',
    '.....KppppK.....',
    '.....KpPpK......',
    '.....KpppK......',
    '......KpK.......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '................',
    '.....KKKKKK.....',
    '....KPppppK.....',
    '....KpPpppK.....',
    '....KppppPK.....',
    '.....KKKKKK.....',
    '......KppK......',
    '......KpPK......',
    '......KppK......',
    '.......KpK......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '................',
    '....KKKKKKKK....',
    '...KPppppppK....',
    '...KpPpppppK....',
    '...KppppppPK....',
    '....KKKKKKKK....',
    '......KppK......',
    '......KpPK......',
    '......KppK......',
    '.......KpK......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ]],
  crab: [ // siege crab — bulky, orange claws (4 leg frames)
  [
    '................',
    '..KK........KK..',
    '.KMMK......KMMK.',
    '.KMMMK....KMMMK.',
    '..KMMMK..KMMMK..',
    '...KKKKKKKKKK...',
    '..KSSSSSSSSSSK..',
    '.KSsSWSSSSWSsSK.',
    '.KSsSRRSSRRsSSK.',
    '.KSsSSSSSSSSsSK.',
    '..KSSSSSSSSSSK..',
    '...KsSSSSSSsK...',
    '..KsKsSSSSsKsK..',
    '..K.KsSSSSsK.K..',
    '....KKKKKKKK....',
    '................',
  ],
  [
    '................',
    '..KK........KK..',
    '.KMMK......KMMK.',
    '.KMMMK....KMMMK.',
    '..KMMMK..KMMMK..',
    '...KKKKKKKKKK...',
    '..KSSSSSSSSSSK..',
    '.KSsSWSSSSWSsSK.',
    '.KSsSRRSSRRsSSK.',
    '.KSsSSSSSSSSsSK.',
    '..KSSSSSSSSSSK..',
    '...KsSSSSSSsK...',
    '...KsSSSSSSsK...',
    '..KsKsSSSSsKsK..',
    '....KKKKKKKK....',
    '................',
  ],
  [
    '................',
    '...KK......KK...',
    '..KMMK....KMMK..',
    '..KMMMK..KMMMK..',
    '...KMMMKMMMK....',
    '...KKKKKKKKKK...',
    '..KSSSSSSSSSSK..',
    '.KSsSWSSSSWSsSK.',
    '.KSsSRRSSRRsSSK.',
    '.KSsSSSSSSSSsSK.',
    '..KSSSSSSSSSSK..',
    '...KsSSSSSSsK...',
    '..KsKsSSSSsKsK..',
    '....KsSSSSsK....',
    '....KKKKKKKK....',
    '................',
  ],
  [
    '................',
    '..KK........KK..',
    '.KMMK......KMMK.',
    '.KMMMK....KMMMK.',
    '..KMMMK..KMMMK..',
    '...KKKKKKKKKK...',
    '..KSSSSSSSSSSK..',
    '.KSsSWSSSSWSsSK.',
    '.KSsSRRSSRRsSSK.',
    '.KSsSSSSSSSSsSK.',
    '..KSSSSSSSSSSK..',
    '...KsSSSSSSsK...',
    '....KsSSSSsK....',
    '..KsKsSSSSsKsK..',
    '....KKKKKKKK....',
    '................',
  ]]};

  /* ============ BOSSES (32x32, 3 frames each) ============ */
  var BOSSES = {
  maw: [ // THE MAW — giant ring-jaw (wave 10)
  [
    '................................',
    '............KKKKKKKK............',
    '.........KKKSSSSSSSSKKK.........',
    '.......KKSSsSSSSSSSSsSSKK.......',
    '......KSSsSSSSSSSSSSSSsSSK......',
    '.....KSsSSsSSSSSSSSSSsSSsSK.....',
    '....KSsSsSSSSSSSSSSSSSSsSsSK....',
    '....KsSsSSSSSSSSSSSSSSSSsSsK....',
    '...KSsSSSSSSSSSSSSSSSSSSSSsSK...',
    '...KsSSSSSSKKKKKKKKKKSSSSSSsK...',
    '...KsSSSSSKWWWWWWWWWWKSSSSSsK...',
    '...KsSSSSKWWRRRRRRRRWWKSSSSsK...',
    '...KsSSSSKWWRWWWWWWWRWKSSSSsK...',
    '...KsSSSSKWWRWWWWWWWRWKSSSSsK...',
    '...KsSSSSKWWRRRRRRRRWWKSSSSsK...',
    '...KsSSSSSKWWWWWWWWWWKSSSSSsK...',
    '...KsSSSSSSKKKKKKKKKKSSSSSSsK...',
    '...KSsSSSSSSSSSSSSSSSSSSSSsSK...',
    '....KsSsSSSSSSSSSSSSSSSSsSsK....',
    '....KSsSsSSSSSSSSSSSSSSsSsSK....',
    '.....KSsSSsSSSSSSSSSSsSSsSK.....',
    '......KSSsSSSSSSSSSSSSsSSK......',
    '.......KKSSsSSSSSSSSsSSKK.......',
    '.........KKKSSSSSSSSKKK.........',
    '............KKKKKKKK............',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  [
    '................................',
    '............KKKKKKKK............',
    '.........KKKSSSSSSSSKKK.........',
    '.......KKSSsSSSSSSSSsSSKK.......',
    '......KSSsSSSSSSSSSSSSsSSK......',
    '.....KSsSSsSSSSSSSSSSsSSsSK.....',
    '....KSsSsSSSSSSSSSSSSSSsSsSK....',
    '....KsSsSSSSKKKKKKKKSSSSsSsK....',
    '...KSsSSSSSKWWWWWWWWKSSSSSsSK...',
    '...KsSSSSSKWWRRRRRRWWKSSSSSsK...',
    '...KsSSSSKWWRWWWWWWWRWKSSSSsK...',
    '...KsSSSSKWWRWWWWWWWRWKSSSSsK...',
    '...KsSSSSKWWRWWWWWWWRWKSSSSsK...',
    '...KsSSSSKWWRRRRRRWWKSSSSSsK...',
    '...KsSSSSSKWWWWWWWWKSSSSSsK...',
    '....KsSsSSSSKKKKKKKKSSSSsSsK....',
    '....KSsSsSSSSSSSSSSSSSSsSsSK....',
    '.....KSsSSsSSSSSSSSSSsSSsSK.....',
    '......KSSsSSSSSSSSSSSSsSSK......',
    '.......KKSSsSSSSSSSSsSSKK.......',
    '.........KKKSSSSSSSSKKK.........',
    '............KKKKKKKK............',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  [
    '................................',
    '............KKKKKKKK............',
    '.........KKKSSSSSSSSKKK.........',
    '.......KKSSsSSSSSSSSsSSKK.......',
    '......KSSsSSSSSSSSSSSSsSSK......',
    '.....KSsSSsSSSSSSSSSSsSSsSK.....',
    '....KSsSsSSSSSSSSSSSSSSsSsSK....',
    '....KsSsSSSSSSSSSSSSSSSSsSsK....',
    '...KSsSSSSSSSSKKKKKKSSSSsSSK....',
    '...KsSSSSSSKWWWWWWWWKSSSSSsK....',
    '...KsSSSSKWWRWWWWWWRRWKSSSsK....',
    '...KsSSSSKWRRWWWWWWRRWKSSSsK....',
    '...KsSSSSKWRRWWWWWWRRWKSSSsK....',
    '...KsSSSSKWWRWWWWWWRRWKSSSsK....',
    '...KsSSSSSSKWWWWWWWWKSSSSSsK....',
    '...KSsSSSSSSSSKKKKKKSSSSsSSK....',
    '....KsSsSSSSSSSSSSSSSSSSsSsK....',
    '....KSsSsSSSSSSSSSSSSSSsSsSK....',
    '.....KSsSSsSSSSSSSSSSsSSsSK.....',
    '......KSSsSSSSSSSSSSSSsSSK......',
    '.......KKSSsSSSSSSSSsSSKK.......',
    '.........KKKSSSSSSSSKKK.........',
    '............KKKKKKKK............',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ]],
  dredge: [ // THE DREDGE — armored leviathan with drill snout (wave 20)
  [
    '................................',
    '................................',
    '..........KKKKKKKKKKKK..........',
    '........KKSSSSSSSSSSSSKK........',
    '.......KSSsSSssSSssSSsSSK.......',
    '......KSsSSsSSSSSSSSsSSsSK......',
    '......KsSSSSsSSSSSSsSSSSsK......',
    '......KsSSsSSSSSSSSSSsSSsK......',
    '......KsSSSSsSSSSSSsSSSSsK......',
    '.......KSSsSSSSSSSSSSsSSK.......',
    '........KSSSSSSSSSSSSSSK........',
    '.........KSSsSSssSSsSSK.........',
    '..........KSSSSSSSSSSK..........',
    '...........KSSsSSsSSK...........',
    '...........KSSSSSSSK............',
    '............KSSsSSK.............',
    '..........KKKKKKKKKK............',
    '.........KMMMMMMMMMMK...........',
    '.........KMmMMMMMMmMK...........',
    '.........KMMMMMMMMMMK...........',
    '..........KMMmMMmMMK............',
    '...........KKKKKKKK.............',
    '......KK...............KK.......',
    '.....KRRK.............KRRK......',
    '.....KRRK.............KRRK......',
    '......KK...............KK.......',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  [
    '................................',
    '................................',
    '..........KKKKKKKKKKKK..........',
    '........KKSSSSSSSSSSSSKK........',
    '.......KSSsSSssSSssSSsSSK.......',
    '......KSsSSsSSSSSSSSsSSsSK......',
    '......KsSSSSsSSSSSSsSSSSsK......',
    '......KsSSsSRRSSSSRSsSSsK.......',
    '......KsSSSSsSSSSSSsSSSSsK......',
    '.......KSSsSSSSSSSSSSsSSK.......',
    '........KSSSSSSSSSSSSSSK........',
    '.........KSSsSSssSSsSSK.........',
    '..........KSSSSSSSSSSK..........',
    '...........KSSsSSsSSK...........',
    '...........KSSSSSSSK............',
    '............KSSsSSK.............',
    '..........KKKKKKKKKK............',
    '.........KMMMMMMMMMMK...........',
    '.........KMmMWWMMMmMK...........',
    '.........KMMMMMMMMMMK...........',
    '..........KMMmMMmMMK............',
    '...........KKKKKKKK.............',
    '....KK.................KK.......',
    '...KRRK...............KRRK......',
    '...KRRK...............KRRK......',
    '....KK.................KK.......',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  [
    '................................',
    '................................',
    '..........KKKKKKKKKKKK..........',
    '........KKSSSSSSSSSSSSKK........',
    '.......KSSsSSssSSssSSsSSK.......',
    '......KSsSSsSSSSSSSSsSSsSK......',
    '......KsSSSSsSSSSSSsSSSSsK......',
    '......KsSSsSSSSSSSSSSsSSsK......',
    '......KsSSSSsSSSSSSsSSSSsK......',
    '.......KSSsSSSSSSSSSSsSSK.......',
    '........KSSSSSSSSSSSSSSK........',
    '.........KSSsSSssSSsSSK.........',
    '..........KSSSSSSSSSSK..........',
    '...........KSSsSSsSSK...........',
    '...........KSSSSSSSK............',
    '............KSSsSSK.............',
    '..........KKKKKKKKKK............',
    '.........KMMMMMMMMMMK...........',
    '.........KMmMMMMMMmMK...........',
    '.........KMMWMMMMWMMK...........',
    '..........KMMmMMmMMK............',
    '...........KKKKKKKK.............',
    '......KK...............KK.......',
    '.....KRRK.............KRRK......',
    '.....KRRK.............KRRK......',
    '......KK...............KK.......',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ]],
  heart: [ // HEART OF THE TRENCH — thermal vent colossus (wave 30)
  [
    '................................',
    '................................',
    '..........KK....KK....KK........',
    '.........KMMK..KMMK..KMMK.......',
    '.........KMMK..KMMK..KMMK.......',
    '..........KK....KK....KK........',
    '.......KKKKKKKKKKKKKKKKKK.......',
    '......KssssssssssssssssssK......',
    '.....KssMssssssssssssssMssK.....',
    '.....KsMMsssssssssssssMMsK......',
    '....KssMsssssKKKKKsssssMssK.....',
    '....KsMMssssKMMMMMMKsssMMsK.....',
    '....KsMssssKMMmMMMmMKsssMsK.....',
    '....KsMsssKMMmMMMMmMMKssMsK.....',
    '....KsMsssKMmMMMMMMmMKsMsK......',
    '....KsMMssKMMmMCCMmMMKsMMsK.....',
    '....KssMssKMMmMMMMmMMKsMssK.....',
    '....KssMsssKMMmMMMmMKssMssK.....',
    '.....KsMMssKMMMMMMMKsMMsK.......',
    '.....KssMsssKKKKKKssMssK........',
    '......KssssssssssssssssK........',
    '.......KKKKKKKKKKKKKKKK.........',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  [
    '................................',
    '................................',
    '..........KK....KK....KK........',
    '.........KMMK..KMMK..KMMK.......',
    '.........KWWMK.KWWMK.KWWMK......',
    '..........KK....KK....KK........',
    '.......KKKKKKKKKKKKKKKKKK.......',
    '......KssssssssssssssssssK......',
    '.....KssMssssssssssssssMssK.....',
    '.....KsMMsssssssssssssMMsK......',
    '....KssMsssssKKKKKsssssMssK.....',
    '....KsMMssssKMMMMMMKsssMMsK.....',
    '....KsMssssKMMWWMMmMKsssMsK.....',
    '....KsMsssKMMWMMMMWMMKssMsK.....',
    '....KsMsssKMWMMMMMMWMKsMsK......',
    '....KsMMssKMWMmCCmMWMKsMMsK.....',
    '....KssMssKMWMMMMMMWMKsMssK.....',
    '....KssMsssKMMWMMWMMKssMssK.....',
    '.....KsMMssKMMMMMMMKsMMsK.......',
    '.....KssMsssKKKKKKssMssK........',
    '......KssssssssssssssssK........',
    '.......KKKKKKKKKKKKKKKK.........',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  [
    '................................',
    '................................',
    '.........KK....KK....KK.........',
    '........KMMK..KMMK..KMMK........',
    '........KMMK..KMMK..KMMK........',
    '.........KK....KK....KK.........',
    '.......KKKKKKKKKKKKKKKKKK.......',
    '......KssssssssssssssssssK......',
    '.....KssMssssssssssssssMssK.....',
    '.....KsMMsssssssssssssMMsK......',
    '....KssMsssssKKKKKsssssMssK.....',
    '....KsMMssssKMMMMMMKsssMMsK.....',
    '....KsMssssKMMmMMMmMKsssMsK.....',
    '....KsMsssKMMmMCCMmMMKssMsK.....',
    '....KsMsssKMmMCCCCmMKsMsK.......',
    '....KsMMssKMMmMCCMmMMKsMMsK.....',
    '....KssMssKMMmMMMMmMMKsMssK.....',
    '....KssMsssKMMmMMMmMKssMssK.....',
    '.....KsMMssKMMMMMMMKsMMsK.......',
    '.....KssMsssKKKKKKssMssK........',
    '......KssssssssssssssssK........',
    '.......KKKKKKKKKKKKKKKK.........',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ]]};

  /* ============ RIG STRUCTURES ============ */
  var STRUCT = {
  hull: [ // 16x16 hull plate tile (2 variants)
  [
    'KKKKKKKKKKKKKKKK',
    'KssSSssSSssSSssK',
    'KsSwSSssSSssSwSK',
    'KssSSssSSssSSssK',
    'KssSSssSSssSSssK',
    'KsSwSSssSSssSwSK',
    'KssSSssSSssSSssK',
    'KssSSssSSssSSssK',
    'KsSwSSssSSssSwSK',
    'KssSSssSSssSSssK',
    'KssSSssSSssSSssK',
    'KsSwSSssSSssSwSK',
    'KssSSssSSssSSssK',
    'KssSSssSSssSSssK',
    'KsSwSSssSSssSwSK',
    'KKKKKKKKKKKKKKKK',
  ],
  [
    'KKKKKKKKKKKKKKKK',
    'KsSSssSSssSSssSK',
    'KssSwSSssSSwssSK',
    'KsSSssSSssSSssSK',
    'KsSSssSSssSSssSK',
    'KssSwSSssSSwssSK',
    'KsSSssSSssSSssSK',
    'KsSSssSSssSSssSK',
    'KssSwSSssSSwssSK',
    'KsSSssSSssSSssSK',
    'KsSSssSSssSSssSK',
    'KssSwSSssSSwssSK',
    'KsSSssSSssSSssSK',
    'KsSSssSSssSSssSK',
    'KssSwSSssSSwssSK',
    'KKKKKKKKKKKKKKKK',
  ]],
  core: [ // Pressure Core 24x24 (2 frames)
  [
    '........................',
    '.........KKKKKK.........',
    '.......KKWWWWWWKK.......',
    '......KWWCCCCCCWWK......',
    '.....KWCCCCCCCCCCWK.....',
    '....KWCCCWWWWWWCCCKW....',
    '....KCCWWCCCCCCWWCCK....',
    '...KWCCWCCCCCCCCWCCWK...',
    '...KCCWCCCCCCCCCCWCCK...',
    '...KCCWCCCCWWCCCCWCCK...',
    '...KCCWCCCWWWWCCCWCCK...',
    '...KCCWCCCWWWWCCCWCCK...',
    '...KCCWCCCCWWCCCCWCCK...',
    '...KCCWCCCCCCCCCCWCCK...',
    '...KWCCWCCCCCCCCWCCWK...',
    '....KCCWWCCCCCCWWCCK....',
    '....KWCCCWWWWWWCCCKW....',
    '.....KWCCCCCCCCCCWK.....',
    '......KWWCCCCCCWWK......',
    '.......KKWWWWWWKK.......',
    '.........KKKKKK.........',
    '........................',
    '........................',
    '........................',
  ],
  [
    '........................',
    '.........KKKKKK.........',
    '.......KKWWWWWWKK.......',
    '......KWWccccccWWK......',
    '.....KWccccccccccWK.....',
    '....KWccWWWWWWWWccWK....',
    '....KcWWCCccccCCWWcK....',
    '...KWcWCCccccccCCWcWK...',
    '...KcWCCccccccccCCWcK...',
    '...KcWCCcccWWcccCCWcK...',
    '...KcWCCccWWWWccCCWcK...',
    '...KcWCCccWWWWccCCWcK...',
    '...KcWCCcccWWcccCCWcK...',
    '...KcWCCccccccccCCWcK...',
    '...KWcWCCccccccCCWcWK...',
    '....KcWWCCccccCCWWcK....',
    '....KWccWWWWWWWWccWK....',
    '.....KWccccccccccWK.....',
    '......KWWccccccWWK......',
    '.......KKWWWWWWKK.......',
    '.........KKKKKK.........',
    '........................',
    '........................',
    '........................',
  ]],
  moonpool: [ // 24x24 moon pool (lure device site)
  [
    '........................',
    '.....KKKKKKKKKKKKKK.....',
    '....KssssssssssssssK....',
    '...KssKKKKKKKKKKKKssK...',
    '..KsKNNNNNNNNNNNNNNKssK..',
    '..KsKNTTTTTTTTTTTTNKssK..',
    '.KsSKNTTPPPPPPPPTTNKssK.',
    '.KsSKNTPPPPPPPPPPPTNKsK.',
    '.KsSKNTPWWWWWWWWPTNKssK.',
    '.KsSKNTPWPPPPPPWPTNKssK.',
    '.KsSKNTPWPPGGPPWPTNKssK.',
    '.KsSKNTPWPPPPPPWPTNKssK.',
    '.KsSKNTPWWWWWWWWPTNKssK.',
    '.KsSKNTPPPPPPPPPPPTNKsK.',
    '.KsSKNTTPPPPPPPPTTNKssK.',
    '..KsKNTTTTTTTTTTTTNKssK..',
    '..KsKNNNNNNNNNNNNNNKssK..',
    '...KssKKKKKKKKKKKKssK...',
    '....KssssssssssssssK....',
    '.....KKKKKKKKKKKKKK.....',
    '........................',
    '........................',
    '........................',
    '........................',
  ]],
  vent: [ // thermal vent 16x16 (3 bubble frames)
  [
    '................',
    '................',
    '......K..K......',
    '.....KMK.KMK....',
    '......K..K......',
    '....KKKKKKKK....',
    '...KmmmmmmmmK...',
    '..KmmMmmmmMmmK..',
    '..KmMmmmmmmMmmK.',
    '..KmmmmmmmmmmK..',
    '..KmmMmmmmMmmK..',
    '...KmmmmmmmmK...',
    '....KKKKKKKK....',
    '...KssssssssK...',
    '...KssssssssK...',
    '....KKKKKKKK....',
  ],
  [
    '................',
    '......K..K......',
    '.....KMK.KMK....',
    '......K..K......',
    '....KKKKKKKK....',
    '...KmmmmmmmmK...',
    '..KmmMmmmmMmmK..',
    '..KmMmmmmmmMmmK.',
    '..KmmmmmmmmmmK..',
    '..KmmMmmmmMmmK..',
    '...KmmmmmmmmK...',
    '....KKKKKKKK....',
    '...KssssssssK...',
    '...KssssssssK...',
    '....KKKKKKKK....',
    '................',
  ],
  [
    '......K..K......',
    '.....KMK.KMK....',
    '......K..K......',
    '....KKKKKKKK....',
    '...KmmmmmmmmK...',
    '..KmmMmmmmMmmK..',
    '..KmMmmmmmmMmmK.',
    '..KmmmmmmmmmmK..',
    '..KmmMmmmmMmmK..',
    '...KmmmmmmmmK...',
    '....KKKKKKKK....',
    '...KssssssssK...',
    '...KssssssssK...',
    '....KKKKKKKK....',
    '................',
    '................',
  ]],
  rov: [ // harvest ROV 16x16 (2 frames: thruster flicker)
  [
    '................',
    '................',
    '.....KKKKKK.....',
    '....KTTTTTTK....',
    '...KTTWTTTTTK...',
    '...KTTTTTTTTK...',
    '....KTTTTTTK....',
    '.....KKKKKK.....',
    '....KssKKssK....',
    '...Ks..KK..sK...',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '................',
    '.....KKKKKK.....',
    '....KTTTTTTK....',
    '...KTTWTTTTTK...',
    '...KTTTTTTTTK...',
    '....KTTTTTTK....',
    '.....KKKKKK.....',
    '....KssKKssK....',
    '...KCs.KK..CK...',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ]],
  mine: [ // pre-placed mine 12x12
  [
    '............',
    '.....KK.....',
    '....KRRK....',
    '...KRRRRK...',
    '..KRKRRKRK..',
    '..KRRRRRRK..',
    '..KRRRRRRK..',
    '..KRKRRKRK..',
    '...KRRRRK...',
    '....KRRK....',
    '.....KK.....',
    '............',
  ]],
  powernode: [ // hull power reroute node 12x12
  [
    '............',
    '....KKKK....',
    '...KCCCCK...',
    '...KCCCK....',
    '..KCCCK.....',
    '..KCCK......',
    '..KCCK......',
    '..KCCCK.....',
    '...KCCCK....',
    '...KCCCCK...',
    '....KKKK....',
    '............',
  ]]};

  /* ============ PROJECTILES (drawn by engine, shapes here) ============ */
  var PROJ = {
  harpoon: [ // 8x8
    '....KK..',
    '...KGGK.',
    '...KGGK.',
    'KKKKGGKK',
    '...KGGK.',
    '...KGGK.',
    '....KK..',
    '........',
  ],
  flak: [ // 8x8 shell
    '........',
    '..KKKK..',
    '.KWWWWK.',
    '.KWRRWK.',
    '.KWRRWK.',
    '.KWWWWK.',
    '..KKKK..',
    '........',
  ],
  arc: [ // tesla arc 8x8 (2 frames)
  [
    '...CC...',
    '..C.C...',
    '..C..C..',
    '.C...C..',
    'C....C..',
    '.C...C..',
    '..C.C...',
    '...C....',
  ],
  [
    '...C....',
    '...C.C..',
    '..C...C.',
    '..C..C..',
    '.C....C.',
    '.C...C..',
    '..C.C...',
    '...CC...',
  ]]};

  /* ============ BUILD EVERYTHING ============ */
  function stampElite(c) { // gold outline for elites
    var x = c.getContext('2d');
    x.fillStyle = PAL.G;
    var w = c.width, h = c.height, d = x.getImageData(0, 0, w, h).data;
    function solid(px_, py_) {
      if (px_ < 0 || py_ < 0 || px_ >= w || py_ >= h) return false;
      return d[(py_ * w + px_) * 4 + 3] > 0;
    }
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
      if (!solid(xx, yy) && (solid(xx-1,yy)||solid(xx+1,yy)||solid(xx,yy-1)||solid(xx,yy+1)))
        x.fillRect(xx, yy, 1, 1);
    }
  }

  function init() {
    if (init.done) return;
    init.done = true;
    // towers x 3 tiers x 2 branches
    Object.keys(TOWERS).forEach(function (fam) {
      [1, 2, 3].forEach(function (tier) {
        ['A', 'B'].forEach(function (branch) {
          var c = compile('tower_' + fam + '_t' + tier + branch, TOWERS[fam]);
          stampTier(c, tier, branch);
        });
      });
    });
    // enemies x frames (+ elite variants)
    Object.keys(ENEMIES).forEach(function (fam) {
      ENEMIES[fam].forEach(function (rows, i) {
        compile('enemy_' + fam + '_f' + i, rows);
        var c = compile('enemy_' + fam + '_elite_f' + i, rows);
        stampElite(c);
      });
    });
    // bosses x frames
    Object.keys(BOSSES).forEach(function (b) {
      BOSSES[b].forEach(function (rows, i) { compile('boss_' + b + '_f' + i, rows); });
    });
    // structures
    STRUCT.hull.forEach(function (rows, i) { compile('hull_' + i, rows); });
    STRUCT.core.forEach(function (rows, i) { compile('core_f' + i, rows); });
    compile('moonpool', STRUCT.moonpool[0]);
    STRUCT.vent.forEach(function (rows, i) { compile('vent_f' + i, rows); });
    STRUCT.rov.forEach(function (rows, i) { compile('rov_f' + i, rows); });
    compile('mine', STRUCT.mine[0]);
    compile('powernode', STRUCT.powernode[0]);
    // projectiles
    compile('proj_harpoon', PROJ.harpoon);
    compile('proj_flak', PROJ.flak);
    PROJ.arc.forEach(function (rows, i) { compile('proj_arc_f' + i, rows); });
  }

  /* ============ Seeded abyssal background ============ */
  // Layers: vertical depth-fog gradient + dark rock-spire silhouettes
  // (2 parallax depths) + faint marine snow. Per-seed variety.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function bg(seed, w, h) {
    var rng = mulberry32(seed);
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    // depth-fog gradient: rig-lit top -> crushing black bottom
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0d2237');
    g.addColorStop(0.45, '#081728');
    g.addColorStop(1, '#02060c');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // rock spires: far layer (dark) + near layer (darker)
    [[0.10, '#0a1a2c', 0.55], [0.22, '#060f1c', 0.85]].forEach(function (layer) {
      var n = 5 + Math.floor(rng() * 4), px_ = 0;
      x.fillStyle = layer[1];
      for (var i = 0; i < n; i++) {
        var sw = w * (0.10 + rng() * 0.22);
        var sh = h * layer[2] * (0.35 + rng() * 0.65);
        var bx = px_ + rng() * w * 0.05;
        x.beginPath();
        x.moveTo(bx, h);
        x.lineTo(bx + sw * 0.28, h - sh);
        x.lineTo(bx + sw * 0.62, h - sh * (0.55 + rng() * 0.3));
        x.lineTo(bx + sw, h);
        x.closePath(); x.fill();
        px_ += sw * 0.9;
      }
    });
    // marine snow
    x.fillStyle = 'rgba(159,179,200,0.35)';
    for (var s = 0; s < 130; s++) {
      var sz = rng() < 0.85 ? 1 : 2;
      x.fillRect(Math.floor(rng() * w), Math.floor(rng() * h), sz, sz);
    }
    return c;
  }

  /* ============ Public API ============ */
  var Art = {
    PAL: PAL,
    init: init,
    get: function (name) { return cache[name]; },
    names: function () { return Object.keys(cache); },
    bg: bg,
    // draw helper: blits sprite with integer scale, nearest neighbor
    draw: function (ctx, name, dx, dy, scale) {
      var c = cache[name];
      if (!c) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c, Math.round(dx), Math.round(dy), c.width * scale, c.height * scale);
    },
    // elite aura: draw gold underglow behind an enemy canvas
    drawElite: function (ctx, name, dx, dy, scale, t) {
      var c = cache[name];
      if (!c) return;
      ctx.save();
      ctx.shadowColor = '#ffcf4d';
      ctx.shadowBlur = 14 + Math.sin(t * 6) * 5;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c, Math.round(dx), Math.round(dy), c.width * scale, c.height * scale);
      ctx.restore();
    },
  };
  global.Art = Art;
})(typeof window !== 'undefined' ? window : this);
