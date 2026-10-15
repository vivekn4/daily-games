/* COLD LEAD — main2.js : screens (render + flow). Loaded after main.js. */
"use strict";
(function () {
  var U = globalThis.ColdLeadUtil, AU = function () { return globalThis.ColdLeadAudio; };
  var SP = function () { return globalThis.ColdLeadSprites; };
  var GM = function () { return globalThis.ColdLeadGame; };
  var DLG = function () { return globalThis.ColdLeadDialogue; };
  var M = globalThis.CLMain, SCREENS = M.SCREENS, W = M.W, H = M.H;

  function ctx() { return document.getElementById("game").getContext("2d"); }
  function button(id, x, y, w, h, label, opts) { M.button(id, x, y, w, h, label, opts); }
  function C() { return M.G; }

  // ---------- shared painters ----------
  function noirBg(c, t, seedN) {
    var rng = U.RNG(seedN || 7);
    SP().SCENES.club && null;
    c.fillStyle = "#06060e"; c.fillRect(0, 0, W, H);
    SP().drawRain(c, W, H, M.rainDrops, t);
  }
  function titleText(c, txt, x, y, size, color, glow) {
    c.save(); c.font = "bold " + size + "px 'Courier New', monospace";
    c.textAlign = "center"; c.textBaseline = "middle";
    if (glow) { c.shadowColor = glow; c.shadowBlur = 24; }
    c.fillStyle = color; c.fillText(txt, x, y); c.restore();
  }
  function drawHUD(c) {
    var G = C(); if (!G || !G.case) return;
    c.fillStyle = "#0a0a12"; c.fillRect(0, 0, W, 46);
    c.strokeStyle = "#2a3a5a"; c.beginPath(); c.moveTo(0, 46); c.lineTo(W, 46); c.stroke();
    c.fillStyle = "#e8b64f"; c.font = "bold 15px 'Courier New', monospace"; c.textAlign = "left"; c.textBaseline = "middle";
    c.fillText("NIGHT " + G.night + "/5", 14, 23);
    var late = G.time >= 420;
    c.fillStyle = late ? "#ff5a5a" : "#d8dce8";
    c.fillText("◷ " + U.clockStr(G.time), 130, 23);
    if (late && Math.floor(performance.now() / 500) % 2 === 0) AU().heartbeat();
    c.fillStyle = "#d8dce8";
    c.fillText("Cred " + "●".repeat(Math.max(0, G.credibility)) + "○".repeat(Math.max(0, 3 - G.credibility)), 260, 23);
    c.fillText("Clues " + G.found.length, 400, 23);
    var labN = G.lab.filter(function (j) { return !j.done; }).length;
    c.fillText("Lab " + (labN ? labN + "…" : "—"), 510, 23);
    button("hud:board", 640, 8, 100, 30, "Board [B]");
    button("hud:menu", 750, 8, 100, 30, "Menu");
    button("hud:mute", 860, 8, 86, 30, M.settings.mute ? "Unmute" : "Mute");
  }
  function captionBar(c, text, y) {
    c.fillStyle = "rgba(5,5,12,0.88)"; c.fillRect(40, y, W - 80, 96);
    c.strokeStyle = "#4a5a7a"; c.strokeRect(40, y, W - 80, 96);
    c.fillStyle = "#d8dce8"; c.font = "15px 'Courier New', monospace"; c.textAlign = "left"; c.textBaseline = "top";
    var lines = U.wrap(c, text, W - 110);
    for (var i = 0; i < Math.min(lines.length, 4); i++) c.fillText(lines[i], 56, y + 12 + i * 20);
  }

  // ---------- TITLE ----------
  SCREENS.title = function (dt, t) {
    var c = ctx();
    noirBg(c, t, 11);
    var rng = U.RNG(12);
    // city silhouette
    c.fillStyle = "#080810";
    var x = 0; while (x < W) { var bw = 40 + rng.next() * 70, bh = 60 + rng.next() * 120; c.fillRect(x, H - bh - 60, bw, bh); x += bw + 6; }
    SP().neonSign(c, W / 2, 150, "COLD LEAD", "#ff4fd8", t);
    titleText(c, "NIGHT SHIFT DETECTIVE", W / 2, 205, 20, "#8a9ac0");
    titleText(c, "Five nights. Five bodies. One truth.", W / 2, 245, 15, "#5a6a8a");
    var meta = GM().loadMeta();
    var y = 320;
    button("menu:new", W / 2 - 130, y, 260, 44, "▶  New Game"); y += 56;
    if (meta) { button("menu:continue", W / 2 - 130, y, 260, 44, "Continue — Night " + meta.night); y += 56; }
    button("menu:howto", W / 2 - 130, y, 260, 44, "How to Play"); y += 56;
    button("menu:settings", W / 2 - 130, y, 260, 44, "Settings");
    titleText(c, "seeded procedural cases · every clue matters · v1.0", W / 2, H - 30, 12, "#3a4a6a");
  };

  // ---------- HOW TO ----------
  var HOWTO = [
    "You are the night shift. Each night a body drops and the clock starts: 22:00 to 06:00.",
    "",
    "SEARCH scenes for clues. QUESTION suspects — press, empathize, or bluff with evidence.",
    "Send forensics to Dr. Venn's LAB early; results take an hour.",
    "PIN evidence to suspects on the DEDUCTION BOARD. Two strong links let you NAME THE KILLER.",
    "Wrong name, wrong night: the case goes cold. Three credibility strikes and the captain benches you.",
    "At dawn you file SOMETHING. Make it count, detective."
  ];
  SCREENS.howto = function (dt, t) {
    var c = ctx(); noirBg(c, t, 13);
    titleText(c, "HOW TO PLAY", W / 2, 70, 26, "#e8b64f");
    c.fillStyle = "#d8dce8"; c.font = "15px 'Courier New', monospace"; c.textAlign = "left"; c.textBaseline = "top";
    var y = 130;
    HOWTO.forEach(function (l) { c.fillText(l, 90, y); y += 26; });
    button("menu:back", W / 2 - 110, H - 90, 220, 44, "← Back");
  };

  // ---------- SETTINGS ----------
  SCREENS.settings = function (dt, t) {
    var c = ctx(); noirBg(c, t, 14);
    titleText(c, "SETTINGS", W / 2, 70, 26, "#e8b64f");
    var s = M.settings, y = 150;
    button("set:textspeed", W / 2 - 200, y, 400, 44, "Text speed: " + ["Slow", "Normal", "Fast"][s.textSpeed]); y += 58;
    button("set:shake", W / 2 - 200, y, 400, 44, "Screen shake: " + (s.shake ? "ON" : "OFF")); y += 58;
    button("set:mute", W / 2 - 200, y, 400, 44, "Sound: " + (s.mute ? "OFF" : "ON")); y += 58;
    button("set:narrate", W / 2 - 200, y, 400, 44, "Voice narration: " + (s.narrate ? "ON" : "OFF")); y += 58;
    button("menu:back", W / 2 - 110, y + 10, 220, 44, "← Back");
  };

  // ---------- INTRO ----------
  var INTRO_TXT = "Grayharbor. 11:47 PM. Rain like static on a dead channel.\n\n" +
    "They found the first one under the pier lights an hour ago. Captain Reyes wants a name by dawn — any name won't do. Not for you.\n\n" +
    "You're the new night-shift detective. Five nights ahead of you. And somewhere out there, somebody is leaving white piano keys where the bodies fall.\n\n" +
    "The papers call him the Pale Composer. Tonight, you call him: unfinished business.";
  SCREENS.intro = function (dt, t) {
    var c = ctx(); noirBg(c, t, 15);
    titleText(c, "COLD LEAD", W / 2, 70, 30, "#ff4fd8", "#ff4fd8");
    c.fillStyle = "#d8dce8"; c.font = "16px 'Courier New', monospace"; c.textAlign = "left"; c.textBaseline = "top";
    var lines = M.typer.text().split("\n"), y = 130;
    lines.forEach(function (l) { U.wrap(c, l, W - 160).forEach(function (wl) { c.fillText(wl, 80, y); y += 24; }); y += 8; });
    if (M.typer.done) button("intro:go", W / 2 - 130, H - 100, 260, 48, "Begin Night 1 →", { accent: "#e8b64f" });
    else button("intro:skip", W / 2 - 130, H - 100, 260, 48, "Skip ▸▸");
  };

  // ---------- BRIEF ----------
  SCREENS.brief = function (dt, t) {
    var c = ctx(), G = C(); noirBg(c, t, 16);
    titleText(c, "PRECINCT — NIGHT " + G.night, W / 2, 60, 24, "#e8b64f");
    // Reyes portrait (fixed seed)
    SP().drawPortrait(c, SP().portraitSpec("reyes"), 80, 110, 120);
    c.fillStyle = "#8a9ac0"; c.font = "14px 'Courier New', monospace"; c.textAlign = "left";
    c.fillText("CAPT. D. REYES", 80, 250);
    c.fillStyle = "#d8dce8"; c.font = "15px 'Courier New', monospace";
    var txt = M.typer.text(), lines = [], y = 110;
    txt.split("\n").forEach(function (l) { U.wrap(c, l, W - 300).forEach(function (wl) { lines.push(wl); }); });
    for (var i = 0; i < Math.min(lines.length, 12); i++) { c.fillText(lines[i], 230, y); y += 22; }
    if (M.typer.done) {
      captionBar(c, "CASE FILE: " + G.case.brief, H - 200);
      button("brief:go", W / 2 - 130, H - 90, 260, 48, "Hit the streets →", { accent: "#e8b64f" });
    } else button("brief:skip", W / 2 - 130, H - 90, 260, 48, "Skip ▸▸");
  };

  // ---------- SCENE ----------
  SCREENS.scene = function (dt, t) {
    var c = ctx(), G = C(); if (!G || !G.case) return;
    if (G.result) { M.screen = "result"; M.resultT = 0; return; }
    drawHUD(c);
    var loc = G.case.location;
    var sc = loc.scenes.filter(function (s) { return s.id === G.scene; })[0];
    // paint scene
    c.save(); c.beginPath(); c.rect(0, 46, W, 300); c.clip();
    SP().SCENES[loc.painter](c, W, 300, U.RNG(U.hashStr(G.scene)), t);
    SP().drawRain(c, W, 346, M.rainDrops, t);
    c.restore();
    // hotspots (flavor) — dots painted over their hit-areas via postDraw
    var hs = hotspotDefs(G);
    hs.forEach(function (h, i) {
      button("scene:hot:" + i, h.x - 22, 46 + h.y - 22, 44, 44, "", { ghost: true });
    });
    M.postDraw = (function (hotspots, tNow) {
      return function () {
        hotspots.forEach(function (h, i) {
          var pulse = 3 + Math.sin(tNow * 4 + i) * 1.5;
          c.fillStyle = "rgba(232,182,79,0.9)";
          c.beginPath(); c.arc(h.x, 46 + h.y, 6 + pulse, 0, 7); c.fill();
          c.fillStyle = "#06060c"; c.font = "bold 11px 'Courier New', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
          c.fillText("?", h.x, 46 + h.y);
        });
        // mini portraits over suspect buttons
        var sx2 = 40;
        G.case.suspects.forEach(function (s) {
          SP().drawPortrait(c, SP().portraitSpec(s.portraitSeed), sx2 + 6, 538, 44);
          sx2 += 156;
        });
      };
    })(hs, t);
    titleText(c, sc.name.toUpperCase() + " — " + loc.name, W / 2, 66, 16, "#e8d878");
    captionBar(c, sc.desc, 352);
    // travel tabs
    var tx = 40;
    loc.scenes.forEach(function (s) {
      button("scene:travel:" + s.id, tx, 462, 150, 34, (s.id === G.scene ? "● " : "") + s.name,
        s.id === G.scene ? { accent: "#e8b64f" } : {});
      tx += 160;
    });
    button("scene:sweep", 540, 462, 180, 34, "🔍 Search (" + (G.sweeps[G.scene] || 0) + "/2)");
    button("scene:lab", 730, 462, 190, 34, "Lab (" + G.lab.filter(function (j) { return !j.done; }).length + "…)");
    // suspects row
    c.fillStyle = "#8a9ac0"; c.font = "13px 'Courier New', monospace"; c.textAlign = "left"; c.textBaseline = "middle";
    c.fillText("PERSONS OF INTEREST — tap to question:", 40, 520);
    var sx = 40;
    var susData = [];
    G.case.suspects.forEach(function (s) {
      var locked = s.locked, cracked = s.cracked;
      button("scene:sus:" + s.id, sx, 534, 148, 56, "",
        { fontSize: 12, accent: locked ? "#ff5a5a" : (cracked ? "#4fd88a" : undefined) });
      susData.push({ s: s, x: sx });
      sx += 156;
    });
    var _pd = M.postDraw;
    M.postDraw = (function (prev, list) {
      return function () {
        if (prev) prev();
        list.forEach(function (sd) {
          SP().drawPortrait(c, SP().portraitSpec(sd.s.portraitSeed), sd.x + 6, 538, 44);
          c.fillStyle = sd.s.locked ? "#ff8a8a" : "#d8dce8";
          c.font = "12px 'Courier New', monospace"; c.textAlign = "left"; c.textBaseline = "middle";
          var nm = sd.s.name.split(" ");
          c.fillText(nm[0], sd.x + 56, 556);
          c.fillText(nm[1] ? nm[1][0] + "." : "", sd.x + 56, 572);
        });
      };
    })(_pd, susData);
  };
  function hotspotDefs(G) {
    var rng = U.RNG(U.hashStr("hs" + G.scene));
    var a = [];
    for (var i = 0; i < 3; i++) a.push({ x: 120 + rng.next() * (W - 240), y: 90 + rng.next() * 160 });
    return a;
  }
  var HOT_LINES = [
    "Rain drums on the glass. Somewhere below, the city keeps its secrets.",
    "You make a note. Everything is evidence until it isn't.",
    "A good detective looks twice. You look three times."
  ];

  // ---------- INTERROGATE ----------
  SCREENS.interrogate = function (dt, t) {
    var c = ctx(), G = C(), d = M.dlg; if (!d) { M.screen = "scene"; return; }
    if (G.result) { M.screen = "result"; M.resultT = 0; return; }
    drawHUD(c);
    var s = GM().susById(G, d.suspectId);
    noirBg(c, t, 21);
    SP().drawPortrait(c, SP().portraitSpec(s.portraitSeed), 60, 90, 190);
    c.fillStyle = "#e8b64f"; c.font = "bold 16px 'Courier New', monospace"; c.textAlign = "left"; c.textBaseline = "middle";
    c.fillText(s.name.toUpperCase(), 60, 300);
    c.fillStyle = "#8a9ac0"; c.font = "13px 'Courier New', monospace";
    c.fillText(s.role + " · " + s.personality + (s.locked ? " · LAWYERED UP" : ""), 60, 324);
    // composure bar
    c.fillStyle = "#222"; c.fillRect(60, 340, 190, 10);
    c.fillStyle = s.composure > 40 ? "#4fd88a" : "#ff5a5a";
    c.fillRect(60, 340, 190 * s.composure / 100, 10);
    c.fillStyle = "#8a9ac0"; c.font = "12px 'Courier New', monospace"; c.fillText("composure", 60, 360);
    // dialogue log
    c.fillStyle = "rgba(5,5,12,0.9)"; c.fillRect(280, 70, W - 320, 250);
    c.strokeStyle = "#4a5a7a"; c.strokeRect(280, 70, W - 320, 250);
    c.font = "14px 'Courier New', monospace"; c.textAlign = "left"; c.textBaseline = "top";
    var lines = [];
    d.lines.slice(-9).forEach(function (l) { U.wrap(c, l, W - 350).forEach(function (wl) { lines.push(wl); }); });
    c.fillStyle = "#d8dce8";
    for (var i = 0; i < Math.min(lines.length, 12); i++) c.fillText(lines[i], 294, 82 + i * 19);
    // topics
    var tx = 280, topics = DLG().TOPICS;
    topics.forEach(function (tp) {
      var locked2 = tp === "secret" && !d.secretOpen;
      button("int:topic:" + tp, tx, 336, 118, 32, tp.toUpperCase(),
        { fontSize: 12, disabled: locked2 || s.locked, accent: d.topic === tp ? "#e8b64f" : undefined });
      tx += 126;
    });
    // approaches
    var ax = 280;
    [["press", "PRESS"], ["empathize", "EMPATHIZE"], ["bluff", "BLUFF"]].forEach(function (pr) {
      button("int:approach:" + pr[0], ax, 376, 150, 36, pr[1],
        { accent: d.approach === pr[0] ? "#ff8a4f" : undefined, disabled: s.locked });
      ax += 160;
    });
    if (d.approach === "bluff" && !s.locked) {
      c.fillStyle = "#8a9ac0"; c.font = "13px 'Courier New', monospace"; c.textAlign = "left"; c.textBaseline = "middle";
      c.fillText("Bluff with which evidence?", 280, 430);
      var bx = 280, shown = 0;
      G.found.forEach(function (cid) {
        if (shown >= 4) return;
        var cl = GM().clueById(G, cid);
        button("int:bluff:" + cid, bx, 444, 150, 40, cl.title, { fontSize: 11 });
        bx += 160; shown++;
      });
      if (!shown) { c.fillStyle = "#ff5a5a"; c.fillText("No evidence yet — search scenes first.", 280, 460); }
    }
    button("int:back", 60, 520, 190, 44, "← Back to scene");
    if (!d.secretOpen) {
      var hasSecretClue = G.found.some(function (cid) {
        var cl = GM().clueById(G, cid);
        return cl.tags.indexOf("composer") < 0 && (cl.pointsTo === s.id || cl.exonerates === s.id);
      });
      if (hasSecretClue) { d.secretOpen = true; }
    }
  };

  // ---------- BOARD ----------
  SCREENS.board = function (dt, t) {
    var c = ctx(), G = C(); if (!G || !G.case) return;
    if (G.result) { M.screen = "result"; M.resultT = 0; return; }
    drawHUD(c);
    noirBg(c, t, 22);
    titleText(c, "DEDUCTION BOARD", W / 2, 72, 20, "#e8b64f");
    c.fillStyle = "#8a9ac0"; c.font = "13px 'Courier New', monospace"; c.textAlign = "center";
    c.fillText("tap evidence, then tap a suspect to pin it · need 2 strong links to accuse", W / 2, 98);
    // suspects
    var sx = 40;
    var cardData = [];
    G.case.suspects.forEach(function (s) {
      var links = GM().strongLinks(G, s.id);
      var sel = M.boardSel.clue ? true : false;
      button("board:sus:" + s.id, sx, 116, 146, 120, "",
        { accent: sel ? "#4fd8ff" : undefined });
      cardData.push({ s: s, links: links, x: sx });
      sx += 154;
    });
    M.postDraw = function () {
      cardData.forEach(function (cd) {
        SP().drawPortrait(c, SP().portraitSpec(cd.s.portraitSeed), cd.x + 8, 122, 56);
        c.fillStyle = "#d8dce8"; c.font = "12px 'Courier New', monospace"; c.textAlign = "left"; c.textBaseline = "top";
        var nm = cd.s.name.split(" ");
        c.fillText(nm[0], cd.x + 72, 126);
        c.fillText(nm[1] || "", cd.x + 72, 142);
        c.fillStyle = cd.links >= 2 ? "#4fd88a" : "#8a9ac0";
        c.fillText("links: " + cd.links + "/2", cd.x + 72, 162);
        c.fillStyle = "#5a6a8a"; c.font = "11px 'Courier New', monospace";
        c.fillText(cd.s.locked ? "lawyered" : cd.s.personality, cd.x + 72, 182);
      });
    };
    // evidence chips
    titleText(c, "EVIDENCE (" + G.found.length + ")", 110, 268, 14, "#8a9ac0");
    var ex = 40, ey = 288, per = 0;
    var chipData = [];
    G.found.forEach(function (cid) {
      var cl = GM().clueById(G, cid);
      if (per >= 8) { per = 0; ey += 52; ex = 40; }
      var pinned = G.pins[cid];
      button("board:clue:" + cid, ex, ey, 200, 44, (pinned ? "📌 " : "") + cl.title,
        { fontSize: 11, accent: M.boardSel.clue === cid ? "#e8b64f" : undefined });
      chipData.push({ cl: cl, x: ex, y: ey });
      ex += 210; per++;
    });
    var _pd2 = M.postDraw;
    M.postDraw = (function (prev, list) {
      return function () {
        if (prev) prev();
        list.forEach(function (cd) { SP().drawClueIcon(c, cd.cl.kind, cd.x + 16, cd.y + 22, 18); });
      };
    })(_pd2, chipData);
    // detail of selected clue
    if (M.boardSel.clue) {
      var cl2 = GM().clueById(G, M.boardSel.clue);
      c.fillStyle = "rgba(5,5,12,0.94)"; c.fillRect(60, 400, W - 120, 130);
      c.strokeStyle = "#e8b64f"; c.strokeRect(60, 400, W - 120, 130);
      c.fillStyle = "#e8b64f"; c.font = "bold 14px 'Courier New', monospace"; c.textAlign = "left"; c.textBaseline = "top";
      c.fillText(cl2.title + "  [" + cl2.kind + "]" + (cl2.requiresLab ? (cl2.labDone ? " · LAB DONE" : " · LAB PENDING") : ""), 76, 412);
      c.fillStyle = "#d8dce8"; c.font = "13px 'Courier New', monospace";
      U.wrap(c, cl2.text, W - 170).slice(0, 3).forEach(function (l, i) { c.fillText(l, 76, 436 + i * 18); });
      if (cl2.requiresLab && !cl2.labQueued)
        button("board:lab:" + cl2.id, W - 220, 480, 140, 36, "Send to lab", { fontSize: 12 });
    }
    button("board:accuse", W / 2 - 130, H - 56, 260, 40, "⚖ NAME THE KILLER", { accent: "#ff5a5a" });
    button("board:back", 40, H - 56, 140, 40, "← Scene");
  };

  // ---------- ACCUSE ----------
  SCREENS.accuse = function (dt, t) {
    var c = ctx(), G = C();
    noirBg(c, t, 23);
    titleText(c, "NAME THE KILLER", W / 2, 90, 26, "#ff5a5a", "#ff5a5a");
    if (!M.accuseSel) {
      titleText(c, "Who did it?", W / 2, 150, 16, "#d8dce8");
      var sy = 190;
      G.case.suspects.forEach(function (s) {
        var chk = GM().canAccuse(G, s.id);
        button("accuse:pick:" + s.id, W / 2 - 200, sy, 400, 44,
          s.name + "  (" + GM().strongLinks(G, s.id) + " links)" + (chk.risky ? " — RISKY" : ""),
          { disabled: !chk.ok });
        sy += 54;
      });
      button("accuse:no", W / 2 - 110, H - 80, 220, 44, "Not yet");
    } else {
      var s2 = GM().susById(G, M.accuseSel);
      SP().drawPortrait(c, SP().portraitSpec(s2.portraitSeed), W / 2 - 60, 170, 120);
      titleText(c, "Accuse " + s2.name + "?", W / 2, 330, 20, "#d8dce8");
      titleText(c, GM().strongLinks(G, s2.id) + " strong evidence links", W / 2, 360, 14, "#8a9ac0");
      button("accuse:yes", W / 2 - 230, 420, 200, 48, "ACCUSE", { accent: "#ff5a5a" });
      button("accuse:no", W / 2 + 30, 420, 200, 48, "Back");
    }
  };

  // ---------- RESULT ----------
  SCREENS.result = function (dt, t) {
    var c = ctx(), G = C(), r = G.result;
    M.resultT += dt;
    noirBg(c, t, 24);
    if (r.won) {
      titleText(c, "CASE CLOSED", W / 2, 120, 34, "#4fd88a", "#4fd88a");
      AU().solved && null;
    } else {
      titleText(c, r.kind === "benched" ? "BENCHED" : "CASE COLD", W / 2, 120, 34, "#ff5a5a", "#ff5a5a");
    }
    titleText(c, "RANK " + r.rank + "   ·   +" + r.score + " pts", W / 2, 180, 20, "#e8b64f");
    c.fillStyle = "#d8dce8"; c.font = "15px 'Courier New', monospace"; c.textAlign = "center";
    var msg = r.won
      ? "The cuffs click. " + GM().susById(G, r.accusedId).name + " is going away for " + G.case.victim.name + "."
      : (r.kind === "benched" ? "The captain pulled you off the interviews. The trail went cold."
        : "The wrong name — or no name. The file goes in the drawer marked COLD.");
    U.wrap(c, msg, W - 200).forEach(function (l, i) { c.fillText(l, W / 2, 230 + i * 24); });
    c.fillText("Time used: " + Math.floor(r.timeUsed / 60) + "h " + (r.timeUsed % 60) + "m", W / 2, 320);
    if (M.resultT > 1.2) {
      if (G.night >= 5 && r.won) button("result:ending", W / 2 - 130, 400, 260, 48, "The Composer →", { accent: "#e8b64f" });
      else if (G.night >= 5) button("result:menu", W / 2 - 130, 400, 260, 48, "Title");
      else button("result:next", W / 2 - 130, 400, 260, 48, "Night " + (G.night + 1) + " →", { accent: "#e8b64f" });
    }
  };

  // ---------- ENDING ----------
  SCREENS.endingChoice = function (dt, t) {
    var c = ctx(), G = C();
    noirBg(c, t, 25);
    titleText(c, "THE PALE COMPOSER", W / 2, 80, 26, "#b14fff", "#b14fff");
    c.fillStyle = "#d8dce8"; c.font = "15px 'Courier New', monospace"; c.textAlign = "center";
    var lead = "He's in the chair. The evidence holds. Rain on the precinct windows.\nHe looks at you the way a conductor looks at an orchestra — and waits.";
    lead.split("\n").forEach(function (l, i) { c.fillText(l, W / 2, 140 + i * 24); });
    var y = 230;
    GM().endingChoices().forEach(function (ch) {
      button("end:choose:" + ch.id, W / 2 - 260, y, 520, 60, ch.label + "\n" + ch.hint, { fontSize: 14 });
      y += 74;
    });
  };
  SCREENS.ending = function (dt, t) {
    var c = ctx(), G = C();
    noirBg(c, t, 26);
    titleText(c, "EPILOGUE", W / 2, 70, 26, "#e8b64f");
    c.fillStyle = "#d8dce8"; c.font = "16px 'Courier New', monospace"; c.textAlign = "left"; c.textBaseline = "top";
    var y = 120;
    M.typer.text().split("\n").forEach(function (l) {
      U.wrap(c, l, W - 160).forEach(function (wl) { c.fillText(wl, 80, y); y += 26; }); y += 6;
    });
    if (M.typer.done) {
      titleText(c, "Campaign score: " + G.totalScore, W / 2, H - 140, 16, "#e8b64f");
      button("end:new", W / 2 - 260, H - 100, 240, 48, "New campaign");
      button("end:replay", W / 2 + 20, H - 100, 240, 48, "Replay seed " + G.seed);
    }
  };

  // ---------- PAUSE ----------
  SCREENS.pause = function (dt, t) {
    var c = ctx();
    c.fillStyle = "rgba(4,4,10,0.85)"; c.fillRect(0, 0, W, H);
    titleText(c, "PAUSED", W / 2, 120, 30, "#e8b64f");
    var y = 210;
    button("pause:resume", W / 2 - 130, y, 260, 44, "Resume"); y += 56;
    button("pause:restart", W / 2 - 130, y, 260, 44, "Restart night"); y += 56;
    button("pause:mute", W / 2 - 130, y, 260, 44, M.settings.mute ? "Unmute" : "Mute"); y += 56;
    button("pause:quit", W / 2 - 130, y, 260, 44, "Quit to title");
  };

  // ---------- debug scene hooks (?scene=) ----------
  function debugScene(name) {
    var seed = 424242;
    M.G = GM().create(seed);
    M.G.settings = M.settings;
    if (name === "title") { M.screen = "title"; return; }
    GM().startNight(M.G, 1);
    if (name === "brief") { M.screen = "brief"; M.typer.start("Test briefing."); return; }
    if (name === "scene") { M.screen = "scene"; return; }
    if (name === "interrogate") {
      M.screen = "interrogate";
      M.dlg = { suspectId: M.G.case.suspects[0].id, topic: "alibi", approach: "press", lines: ["You: \"Let's go over that alibi again.\"", "Suspect: \"I told you everything.\""], secretOpen: true };
      return;
    }
    if (name === "board") {
      M.screen = "board";
      // pre-find some clues for the shot
      M.G.case.clues.slice(0, 5).forEach(function (cl) { cl.found = true; M.G.found.push(cl.id); });
      return;
    }
    if (name === "ending") {
      M.screen = "endingChoice"; return;
    }
    M.screen = "scene";
  }

  // ---------- activate dispatcher ----------
  function activate(id, p) {
    var G = M.G, parts = id.split(":");
    switch (parts[0]) {
      case "menu":
        if (parts[1] === "new") startNew();
        else if (parts[1] === "continue") continueGame();
        else if (parts[1] === "howto") M.screen = "howto";
        else if (parts[1] === "settings") M.screen = "settings";
        else if (parts[1] === "back") M.screen = "title";
        break;
      case "set":
        if (parts[1] === "textspeed") M.settings.textSpeed = (M.settings.textSpeed + 1) % 3;
        else if (parts[1] === "shake") M.settings.shake = !M.settings.shake;
        else if (parts[1] === "mute") { M.settings.mute = !M.settings.mute; AU().setMuted(M.settings.mute); }
        else if (parts[1] === "narrate") { M.settings.narrate = !M.settings.narrate; if (!M.settings.narrate) M.stopNarrate(); }
        M.storeSettings();
        break;
      case "intro":
        if (parts[1] === "skip") M.typer.skip();
        else { GM().startNight(G, 1); M.screen = "brief"; M.typer.start(briefText(G)); M.narrate(briefText(G)); }
        break;
      case "brief":
        if (parts[1] === "skip") M.typer.skip();
        else { M.screen = "scene"; M.stopNarrate(); AU().startRain(); AU().startMusic(); }
        break;
      case "hud":
        if (parts[1] === "board") goBoard();
        else if (parts[1] === "menu") M.togglePause();
        else if (parts[1] === "mute") { M.settings.mute = !M.settings.mute; AU().setMuted(M.settings.mute); M.storeSettings(); }
        break;
      case "scene":
        handleScene(parts, p); break;
      case "int":
        handleInterrogate(parts); break;
      case "board":
        handleBoard(parts); break;
      case "accuse":
        handleAccuse(parts); break;
      case "result":
        if (parts[1] === "next") { GM().save(G); GM().startNight(G, G.night + 1); M.screen = "brief"; M.typer.start(briefText(G)); M.narrate(briefText(G)); }
        else if (parts[1] === "ending") { M.screen = "endingChoice"; }
        else if (parts[1] === "menu") { M.screen = "title"; }
        break;
      case "end":
        if (parts[1] === "choose") {
          var ch = GM().chooseEnding(G, parts[2]);
          M.endingText = ch.text; M.screen = "ending";
          M.typer.start(ch.text); M.narrate(ch.text);
          GM().save(G);
        } else if (parts[1] === "new") startNew();
        else if (parts[1] === "replay") { var s = G.seed; startNew(s); }
        break;
      case "pause":
        if (parts[1] === "resume") M.togglePause();
        else if (parts[1] === "restart") { GM().startNight(G, G.night); M.screen = "brief"; M.typer.start(briefText(G)); }
        else if (parts[1] === "mute") { M.settings.mute = !M.settings.mute; AU().setMuted(M.settings.mute); M.storeSettings(); }
        else if (parts[1] === "quit") { GM().save(G); M.screen = "title"; }
        break;
    }
  }

  function briefText(G) {
    var t = GM().REYES_BRIEF.join("\n\n");
    if (G.night === 1) t += "\n\nMarlow's with you tonight. Listen to her — she knows the drill.";
    if (G.failedNights.length) t += "\n\nAnd detective… the cold ones from before? The Composer's laughing. Don't give him another.";
    return t;
  }

  function startNew(seed) {
    seed = (seed === undefined) ? ((Math.random() * 0xffffffff) >>> 0) : seed;
    M.G = GM().create(seed);
    M.G.settings = M.settings;
    M.screen = "intro";
    M.typer.start(INTRO_TXT); M.narrate(INTRO_TXT);
    AU().startRain();
  }
  function continueGame() {
    var meta = GM().loadMeta();
    if (!meta) return;
    M.G = GM().load(meta);
    M.G.settings = M.settings;
    M.screen = "brief"; M.typer.start(briefText(M.G)); M.narrate(briefText(M.G));
  }
  function goBoard() {
    if (["scene", "interrogate"].indexOf(M.screen) < 0) return;
    M.boardSel = { clue: null }; M.screen = "board"; M.stopNarrate();
  }
  M.goBoard = goBoard; M.activate = activate;

  function handleScene(parts, p) {
    var G = M.G;
    if (parts[1] === "travel") {
      var r = GM().doTravel(G, parts[2]); AU().footstep(); M.flash(r.msg);
    } else if (parts[1] === "sweep") {
      var r2 = GM().doSweep(G);
      if (r2.ok && r2.found.length) { AU().flashbulb(); r2.found.forEach(function () {}); }
      M.flash(r2.msg);
      if (G.result) { M.screen = "result"; M.resultT = 0; }
    } else if (parts[1] === "sus") {
      M.dlg = { suspectId: parts[2], topic: "alibi", approach: "press", bluffMode: false, lines: ["You take a seat across from " + GM().susById(G, parts[2]).name + "."], secretOpen: false };
      M.screen = "interrogate";
    } else if (parts[1] === "lab") {
      var pend = G.lab.filter(function (j) { return !j.done; });
      M.flash(pend.length ? pend.length + " at the lab…" : "Nothing at the lab. Send forensics from the board.");
    } else if (parts[1] === "hot") {
      M.flash(U.RNG(U.hashStr("hot" + parts[2])).pick(HOT_LINES));
    }
  }

  function handleInterrogate(parts) {
    var G = M.G, d = M.dlg;
    if (parts[1] === "back") { M.screen = "scene"; return; }
    if (parts[1] === "topic") { d.topic = parts[2]; return; }
    if (parts[1] === "approach") {
      d.approach = parts[2];
      if (parts[2] !== "bluff") fireExchange(G, d, null);
      return;
    }
    if (parts[1] === "bluff") {
      fireExchange(G, d, parts[2]);
    }
  }
  function fireExchange(G, d, bluffClueId) {
    var r = GM().doExchange(G, d.suspectId, d.topic, d.approach, bluffClueId);
    if (!r.ok) { M.flash(r.msg); return; }
    d.lines = d.lines.concat(r.lines);
    if (r.effects && r.effects.lock) { if (M.settings.shake) {} }
    if (G.result) { M.screen = "result"; M.resultT = 0; AU().failed(); }
  }

  function handleBoard(parts) {
    var G = M.G;
    if (parts[1] === "clue") {
      M.boardSel.clue = (M.boardSel.clue === parts[2]) ? null : parts[2];
      AU().paper();
    } else if (parts[1] === "sus") {
      if (M.boardSel.clue) {
        GM().pinClue(G, M.boardSel.clue, parts[2]);
        M.boardSel.clue = null; AU().uiSelect();
      }
    } else if (parts[1] === "lab") {
      var r = GM().queueLab(G, parts[2]);
      M.flash(r.msg); if (r.ok) AU().phoneRing();
    } else if (parts[1] === "accuse") { M.accuseSel = null; M.screen = "accuse"; }
    else if (parts[1] === "back") { M.screen = "scene"; }
  }
  function handleAccuse(parts) {
    var G = M.G;
    if (parts[1] === "pick") { M.accuseSel = parts[2]; }
    else if (parts[1] === "no") { M.accuseSel = null; M.screen = "board"; }
    else if (parts[1] === "yes") {
      var r = GM().accuse(G, M.accuseSel);
      if (!r.ok) { M.flash(r.msg); return; }
      AU().sting();
      if (M.settings.shake) { /* shake handled in frame */ }
      M.screen = "result"; M.resultT = 0;
      if (r.correct) AU().solved(); else AU().failed();
      GM().save(G);
    }
  }

  globalThis.CLMain2 = true;
})();
