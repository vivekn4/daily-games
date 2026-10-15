/* Emberdeep — sprites: original pixel art as code. All sprites defined as
   string pixel-maps; '.' = transparent. Tolerant renderer pads ragged rows.
   No external assets, nothing ripped. */
(function (g) {
  "use strict";

  var PAL = {
    k: "#100c18", s: "#e8dcc8", c: "#b34724", C: "#7e2f16",
    g: "#f5c518", y: "#ffe9a8", e: "#1a1a1a", w: "#ffffff",
    r: "#c0392b", R: "#6e1f14", p: "#9b59b6", P: "#5e2f78",
    b: "#5b7fa6", n: "#8d99ae", N: "#3d4451", o: "#8a5a2b",
    O: "#54360f", v: "#46c46a", V: "#1e7a38", f: "#ff8c2e",
    F: "#e23c00", h: "#ff7d9c", d: "#3d5a80", D: "#22344a",
    a: "#ffd75e", x: "#cfd8dc"
  };

  var MAPS = {
    player: [
      "................",
      ".....kkkkk......",
      "....kcccccck....",
      "...kcccccccck...",
      "....kcssssck....",
      "....kcseseck....",
      "....kcssssck....",
      "...kcccccccck...",
      "....kcccccck....",
      "....kcccccck....",
      "....kccCCcck....",
      "....kccCCcck....",
      "...gkccCCcck....",
      "...ygkccccck....",
      "....kkkkkkkk....",
      "................"
    ],
    npc: [
      "................",
      ".....kkkkk......",
      "....knnnnnk.....",
      "...knnnnnnnk....",
      "....knssssnk....",
      "....knsesenk....",
      "....knssssnk....",
      "...knnnnnnnk....",
      "....knnnnnk.....",
      "....knnNNnnk....",
      "..o.knnNNnnk....",
      "..o.knnNNnnk....",
      "..o.knnNNnnk....",
      "..o..knnnnk.....",
      ".....kkkkk......",
      "................"
    ],
    rat: [
      "................",
      "................",
      "................",
      "................",
      "...kk...kk......",
      "..knnk.knnk.....",
      "..knnnnnnnk.....",
      "..knnennnnk.....",
      "..knnnnnnnnk....",
      "...knnnnnnnkss..",
      "...kkkkkkk..ss..",
      ".............ss.",
      "................",
      "................",
      "................",
      "................"
    ],
    imp: [
      "................",
      "..kk......kk....",
      "..krk....krk....",
      "...krk..krk.....",
      "...krrrrrrk.....",
      "...krwrrwrk.....",
      "...krrrrrrk.....",
      "....krrrrk......",
      "..k.krrrrk.k....",
      "..k.krrrrk.k....",
      "....krrrrk......",
      "....kk..kk......",
      "................",
      "................",
      "................",
      "................"
    ],
    knight: [
      "................",
      ".....kkkkk......",
      "....kdddddk.....",
      "...kdddddddk....",
      "...kddededk.....",
      "...kdddddddk....",
      "....kdddddk.....",
      "...kdddddddk....",
      "..kdkdddddkdk...",
      "..kdkdddddkdk...",
      "..kdkdddddkdk...",
      "...kdddddddk....",
      "...kkk...kkk....",
      "................",
      "................",
      "................"
    ],
    slime: [
      "................",
      "................",
      ".....kkkkk......",
      "...kkvvvvvkk....",
      "..kvvvvvvvvvk...",
      "..kvvwvvvwvvk...",
      "..kvvvvvvvvvk...",
      "..kvvVVVVVvvk...",
      "..kvvvvvvvvvk...",
      "...kvvvvvvvk....",
      "....kkkkkkk.....",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    slime_small: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "....kkkk........",
      "...kvvvvk.......",
      "...kvevek.......",
      "...kvvvvk.......",
      "....kkkk........",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    wisp: [
      ".....kk.........",
      "....kppk........",
      "...kppppk.......",
      "...kpwppk.......",
      "...kppppk.......",
      "....kpppk.......",
      "...kppPppk......",
      "...kpPpPpk......",
      "....kpPpk.......",
      "....kpppk.......",
      ".....kpk........",
      ".....kk.........",
      "................",
      "................",
      "................",
      "................"
    ],
    spitter: [
      "................",
      "................",
      ".....kkkk.......",
      "....kvvvvk......",
      "...kvvvvvvk.....",
      "...kvrrrrvk.....",
      "...kvrrrrvk.....",
      "...kvvvvvvk.....",
      "....kvvvvk......",
      "...vvkvvkvv.....",
      "..vvvkvvvkvvv...",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    chest: [
      "................",
      "................",
      "................",
      "................",
      "....kkkkkkkk....",
      "..kkooooooookk..",
      "..kooaaaaaook...",
      "..kooaaakaaook..",
      "..kkooooooookk..",
      "..kkkkkkkkkkkk..",
      "..kooooooooook..",
      "..koooakkkoook..",
      "..kooooooooook..",
      "..kkkkkkkkkkkk..",
      "................",
      "................"
    ],
    heart: [
      "................",
      "................",
      "..kk..kk........",
      ".khhkkhhk.......",
      ".khhhhhhhk......",
      ".khwhhhhhk......",
      ".khhhhhhhk......",
      "..khhhhhhk......",
      "...khhhhk.......",
      "....khhk........",
      ".....kk.........",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    potion_heal: [
      "................",
      "................",
      "................",
      ".....kk.........",
      ".....knk........",
      "....knrnk.......",
      "...kkrrrk.......",
      "..krrrrrrrk.....",
      "..krrwrrrrk.....",
      "..krrrrrrrk.....",
      "..krrrrrrrk.....",
      "...kkkkkkk......",
      "................",
      "................",
      "................",
      "................"
    ],
    potion_bomb: [
      "................",
      "................",
      "........f.......",
      ".......kf.......",
      ".....kkNNk......",
      "....kNNNNNk.....",
      "...kNNNNNNNk....",
      "...kNNwNNNNk....",
      "...kNNNNNNNk....",
      "....kNNNNNk.....",
      ".....kkkkk......",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    sword: [
      "................",
      "................",
      "............kk..",
      "...........kwwk.",
      "..........kwwk..",
      ".....k...kwwk...",
      ".....kk.kwwk....",
      "......kkwwk.....",
      ".....kkwwk......",
      "....kkwwk.......",
      "..aakkwk........",
      "..akk...........",
      "................",
      "................",
      "................",
      "................"
    ],
    charm: [
      "................",
      "................",
      "................",
      ".....kk.........",
      "....kppk........",
      "...kppppk.......",
      "...kpwppk.......",
      "...kppppk.......",
      "....kppk........",
      ".....kk.........",
      "....kkkk........",
      "...kwwwwk.......",
      "................",
      "................",
      "................",
      "................"
    ],
    stairs: [
      "................",
      "............kk..",
      "............kNk.",
      "..........kkkNk.",
      "..........kNNk..",
      "........kkkNk...",
      "........kNNk....",
      "......kkkNk.....",
      "......kNNk......",
      "....kkkNk.......",
      "....kNNk........",
      "..kkkNk.........",
      "..kNNk..........",
      "..kkk...........",
      "................",
      "................"
    ],
    floor0: [
      "................",
      "................",
      "................",
      ".....n..........",
      "................",
      "................",
      "................",
      "................",
      "................",
      "...........n....",
      "................",
      "................",
      "................",
      "..n.............",
      "................",
      "................"
    ],
    floor1: [
      "................",
      "................",
      "..........n.....",
      "................",
      "................",
      "................",
      "....n...........",
      "................",
      "................",
      "................",
      "................",
      ".............n..",
      "................",
      "................",
      "..n.............",
      "................"
    ],
    wall: [
      "nnnnnnnnnnnnnnnn",
      "nNNNNNNNNNNNNNNn",
      "nNNNNNNNNNNNNNNn",
      "nNNnnNNNNNNnnNNn",
      "nNNnnNNNNNNnnNNn",
      "nNNNNNNNNNNNNNNn",
      "nNNNNNNNNNNNNNNn",
      "nNNnnNNNNnnNNNNn",
      "nNNnnNNNNnnNNNNn",
      "nNNNNNNNNNNNNNNn",
      "nNNNNNNNNNNNNNNn",
      "nNNNNnNNNNNnNNNn",
      "nNNNNnNNNNNnNNNn",
      "nNNNNNNNNNNNNNNn",
      "nNNNNNNNNNNNNNNn",
      "nnnnnnnnnnnnnnnn"
    ],
    ember: [
      "................",
      ".....kk.........",
      "....kffk........",
      "...kffffk.......",
      "..kffwwffk......",
      "..kfffffffk.....",
      "...kfffffk......",
      "...kfffffk......",
      "....kfffk.......",
      ".....kfk........",
      ".....kk.........",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    // ---- bosses (24x24, king 32x32) ----
    boss_matriarch: [
      "........................",
      "...kk..............kk....",
      "..kook............kook...",
      "..koook..........koook...",
      "...kooooooooooooooook....",
      "....koooooooooooooook....",
      "....kooekoooooookeook....",
      "....koooooooooooooook....",
      "...koooRRRRRRRRRRooook...",
      "...kooRRRRRRRRRRRRoook...",
      "...kooRReRRRRRReRRoook...",
      "....koRRRRRRRRRRRRok.....",
      "....kooRRRRRRRRRRook.....",
      ".....kooRRRRRRRRook......",
      ".....kkooRRRRRRootk......",
      "......kkkooooookk........",
      "........kkkkkkkkooss.....",
      ".................ooss....",
      "..................oss....",
      "...................ss....",
      "........................",
      "........................",
      "........................",
      "........................"
    ],
    boss_archon: [
      "........................",
      "......ff........ff.......",
      ".....kffk......kffk......",
      ".....kffk......kffk......",
      "......kffkkkkkkffk.......",
      ".......kFFFFFFFFk........",
      ".......kFFFFFFFFk........",
      ".......kFFwFFwFFk........",
      ".......kFFFFFFFFk........",
      "........kFFFFFFk.........",
      ".....k..kFFFFFFk..k......",
      "....kFk.kFFFFFFk.kFk.....",
      "....kFk.kFFFFFFk.kFk.....",
      ".....k..kFFFFFFk..k......",
      "........kFFFFFFk.........",
      "........kFRRRRFk.........",
      "........kFRRRRFk.........",
      ".........kFFFFk..........",
      ".........kkkkkk..........",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................"
    ],
    boss_warden: [
      "........................",
      "........kkkkkkkk.........",
      ".......kDDDDDDDDk........",
      ".......kDkkkkkkDk........",
      "......kDDkkkkkkDDk.......",
      "......kDDkekkekeDDk......",
      "......kDDkkkkkkDDk.......",
      ".......kDDDDDDDDk........",
      "....kppkDDDDDDDDkppk.....",
      "....kpPkDDDDDDDDkPpk.....",
      "....kpPkDDDDDDDDkPpk.....",
      "....kppkDDDDDDDDkppk.....",
      ".......kDDDDDDDDk........",
      ".......kDDDxxDDDk........",
      ".......kDDDxxDDDk........",
      ".......kDDDDDDDDk........",
      "........kDDDDDDk.........",
      "........kkk..kkk.........",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................"
    ],
    boss_king: [
      "................................",
      "......aa..aa..aa..aa..aa.........",
      "......akaakaakaakaakaaka.........",
      "......aaaaaaaaaaaaaaaaa..........",
      ".......kkkkkkkkkkkkkkkk..........",
      "......kPPPPPPPPPPPPPPPPk.........",
      "......kPPxxxxxxxxxxPPk...........",
      "......kPPxkxkxxkxkxPPk...........",
      "......kPPxxxxxxxxxxPPk...........",
      "......kPPxxkxxxxkxxPPk...........",
      ".......kPPxxxxxxxxPPk............",
      "....k..kPPPkkkkkkPPPk..k.........",
      "...kPk.kPPPPPPPPPPPPk.kPk........",
      "...kPk.kPPPFffFPPPPk.kPk........",
      "....k..kPPPFffFPPPPk..k..........",
      ".......kPPPFffFPPPPk.............",
      ".......kPPPPPPPPPPPPk............",
      ".......kPPRRRRRRRRPPk............",
      ".......kPPRRRRRRRRPPk............",
      "........kPPRRRRPPk...............",
      "........kPPPPPPPPk...............",
      ".........kPPPPPPk................",
      ".........kkk..kkk...............",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................"
    ]
  };

  var cache = {};

  function build(name) {
    var rows = MAPS[name];
    if (!rows) return null;
    var w = 0, i;
    for (i = 0; i < rows.length; i++) w = Math.max(w, rows[i].length);
    var h = rows.length;
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    var cx = cv.getContext("2d");
    for (var y = 0; y < h; y++) {
      var row = rows[y];
      for (var x = 0; x < w; x++) {
        var ch = row[x] || ".";
        var col = PAL[ch];
        if (col) { cx.fillStyle = col; cx.fillRect(x, y, 1, 1); }
      }
    }
    return cv;
  }

  function get(name) {
    if (typeof document === "undefined") return null; // Node: no prerender
    if (!cache[name]) cache[name] = build(name);
    return cache[name];
  }

  // Draw centered at (x, y) in world units, scaled by `scale`. flipX mirrors.
  function draw(ctx, name, x, y, scale, flipX) {
    var img = get(name);
    if (!img) return;
    scale = scale || 2;
    var w = img.width * scale, h = img.height * scale;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (flipX) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function spriteSize(name) {
    var rows = MAPS[name] || [];
    var w = 0;
    for (var i = 0; i < rows.length; i++) w = Math.max(w, rows[i].length);
    return { w: w, h: rows.length };
  }

  g.EmberSprites = { draw: draw, get: get, size: spriteSize, names: Object.keys(MAPS) };
})(typeof window !== "undefined" ? window : globalThis);
