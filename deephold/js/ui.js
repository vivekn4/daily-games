/* DEEPHOLD — ui: DOM menus + dialogue + HUD panels + touch controls.
   Narrator: tries bundled VO clip audio/vo/<id>.mp3 first (Voice Director
   deliverable), falls back to speechSynthesis only if the clip is missing. */
(function (root) {
  "use strict";
  var UI = {};
  var U = root.DeepUtil;

  var el = function (id) { return document.getElementById(id); };
  var uiRoot = null, dlgBox = null, toastBox = null;

  var settings = { textSpeed: "normal", shake: true, mute: false, narration: true };
  try {
    var s = JSON.parse(localStorage.getItem("deephold_settings") || "{}");
    for (var k in settings) if (s[k] !== undefined) settings[k] = s[k];
  } catch (e) {}
  function saveSettings() {
    try { localStorage.setItem("deephold_settings", JSON.stringify(settings)); } catch (e) {}
  }
  UI.settings = settings;

  UI.init = function () {
    uiRoot = el("ui");
    dlgBox = el("dlg");
    toastBox = el("toast");
    if (root.DeepRender) root.DeepRender.shakeEnabled = settings.shake;
  };

  function panel(html) {
    uiRoot.innerHTML = '<div class="panel">' + html + "</div>";
    uiRoot.style.display = "flex";
  }
  UI.hide = function () { uiRoot.innerHTML = ""; uiRoot.style.display = "none"; };
  UI.visible = function () { return uiRoot.style.display !== "none"; };

  function btn(label, fn, cls) {
    return '<button class="' + (cls || "") + '" data-b="' + label + '">' + label + "</button>";
  }
  function wire(obj) {
    var bs = uiRoot.querySelectorAll("button");
    for (var i = 0; i < bs.length; i++) (function (b) {
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (root.DeepAudio) root.DeepAudio.unlock(), root.DeepAudio.uiClick();
        obj[b.getAttribute("data-b")]();
      });
    })(bs[i]);
  }

  // ---------------- title ----------------
  UI.showTitle = function (hasSave, seed, cbs) {
    panel(
      '<h1>DEEPHOLD</h1>' +
      '<div class="tag">The trench is rising. Hold the rig.<br>' +
      "Deep-sea tower defense — 30 waves, 6 tower families, an AI director that adapts to YOU.</div>" +
      '<div class="ctl">Arrows / WASD — move cursor · Space — select / detonate mine · 1-6 — build · O — overcharge · U — upgrade · T — targeting<br>' +
      "Q/C/E — sector overdrive · G — power surge · S — launch wave · B — bank cells · X — sell · I — mine · V — harvest · 7/8/9 — buffs<br>" +
      "Tab — re-open mutation report · M — mute · Esc — pause<br>" +
      "Tap pads, vents and mines directly on touch screens.</div>" +
      btn("⚓ NEW EXPEDITION", "new", "big") +
      (hasSave ? btn("CONTINUE — wave " + cbs.wave, "cont") : "") +
      btn("HOW TO PLAY", "how") + btn("SETTINGS", "set") +
      '<div class="seed">a VN game · seed ' + seed + "</div>"
    );
    var wmap = {
      "⚓ NEW EXPEDITION": cbs.new,
      "HOW TO PLAY": function () { UI.showHowto(function () { UI.showTitle(hasSave, seed, cbs); }); },
      "SETTINGS": function () { UI.showSettings(function () { UI.showTitle(hasSave, seed, cbs); }); }
    };
    if (hasSave) wmap["CONTINUE — wave " + cbs.wave] = cbs.cont;
    wire(wmap);
  };

  UI.showHowto = function (back) {
    panel(
      "<h2>HOW TO PLAY</h2>" +
      '<div class="tag" style="text-align:left">' +
      "◈ <b>Survey phase:</b> read Voss's mutation report, build turrets on hull pads (1-6), " +
      "send ROVs to harvest thermal vents (click them), bank spare cells into the Pressure Core (B, 100 TC = 1 charge).<br>" +
      "◈ <b>Siege phase:</b> creatures climb the hull lanes toward the Core. You can't aim — " +
      "trigger turret <b>Overcharges (O)</b>, set a sector to <b>Overdrive</b> with <b>Q/C/E</b> " +
      "(+30% damage there, 85% elsewhere), and hit <b>G</b> for a Power Surge.<br>" +
      "◈ <b>Lurkers</b> are invisible — build a <b>Sonar Array</b> (they shimmer near towers). " +
      "<b>Spitters</b> stop and snipe your turrets (40 HP — they die for good, 50% salvage). " +
      "<b>Maulers</b> wear armor: physical bounces off, <b>Tesla</b> energy ignores it.<br>" +
      "◈ <b>Mines</b> need the Demolitions tech: 40 TC each, max 3, detonate manually with SPACE.<br>" +
      "◈ <b>T</b> toggles a tower between First and Strong targeting. <b>X</b> sells the selected tower (70% refund). " +
      "Repair costs 5 TC/HP (8 after wave 20).<br>" +
      "◈ After each wave: repair, pick 1 of 3 tech nodes, spend. Bosses at waves 10 / 20 / 30. " +
      "Hold the rig through wave 30 to choose your ending." +
      "</div>" + btn("← BACK", "back", "big")
    );
    wire({ "← BACK": back });
  };

  UI.showSettings = function (back) {
    function lbl() {
      return "<h2>SETTINGS</h2>" +
        '<div class="tag" style="text-align:left">' +
        "Text speed: <b>" + settings.textSpeed + "</b><br>" +
        "Screen shake: <b>" + (settings.shake ? "ON" : "OFF") + "</b><br>" +
        "Narration voice: <b>" + (settings.narration ? "ON" : "OFF") + "</b><br>" +
        "Mute: <b>" + (settings.mute ? "ON" : "OFF") + "</b></div>" +
        btn("TEXT SPEED", "ts") + btn("SHAKE", "sh") + btn("NARRATION", "na") + btn("MUTE", "mu") +
        "<br>" + btn("← BACK", "back", "big");
    }
    panel(lbl());
    wire({
      "TEXT SPEED": function () {
        settings.textSpeed = settings.textSpeed === "slow" ? "normal" : settings.textSpeed === "normal" ? "fast" : "slow";
        saveSettings(); UI.showSettings(back);
      },
      "SHAKE": function () {
        settings.shake = !settings.shake; saveSettings();
        if (root.DeepRender) root.DeepRender.shakeEnabled = settings.shake;
        UI.showSettings(back);
      },
      "NARRATION": function () { settings.narration = !settings.narration; saveSettings(); UI.showSettings(back); },
      "MUTE": function () {
        settings.mute = !settings.mute; saveSettings();
        if (root.DeepAudio) { var m = root.DeepAudio.isMuted(); if (m !== settings.mute) root.DeepAudio.toggleMute(); }
        UI.showSettings(back);
      },
      "← BACK": back
    });
  };

  // ---------------- pause ----------------
  UI.showPause = function (cbs) {
    panel("<h2>⏸ PAUSED</h2>" +
      btn("RESUME", "r", "big") + btn("SETTINGS", "s") + btn("RESTART WAVE", "rw") +
      btn("QUIT TO TITLE", "q") +
      '<div class="ctl">M — mute · Esc — resume</div>');
    wire({
      "RESUME": cbs.resume, "SETTINGS": function () { UI.showSettings(function () { UI.showPause(cbs); }); },
      "RESTART WAVE": cbs.restart, "QUIT TO TITLE": cbs.quit
    });
  };

  // ---------------- dialogue (typewriter + narration) ----------------
  var dlgState = null;
  UI.showDialogue = function (lines, onDone, idPrefix) {
    // lines: [{who, text}] — ids assigned as idPrefix-i for VO lookup
    dlgBox.style.display = "block";
    dlgState = { lines: lines, i: 0, ci: 0, done: false, onDone: onDone, idPrefix: idPrefix || "dlg" };
    renderDlgLine();
  };
  UI.dialogueActive = function () { return !!dlgState; };
  UI.advanceDialogue = function () {
    if (!dlgState) return;
    var L = dlgState.lines[dlgState.i];
    if (dlgState.ci < L.text.length) { dlgState.ci = L.text.length; renderDlgLine(); }
    else {
      UI.stopNarrate();
      dlgState.i++;
      if (dlgState.i >= dlgState.lines.length) {
        var cb = dlgState.onDone; dlgState = null;
        dlgBox.style.display = "none";
        if (cb) cb();
      } else { dlgState.ci = 0; renderDlgLine(); }
    }
  };
  function speedMs() {
    return settings.textSpeed === "fast" ? 8 : settings.textSpeed === "slow" ? 42 : 20;
  }
  var dlgTimer = null;
  function renderDlgLine() {
    var st = dlgState, L = st.lines[st.i];
    var who = L.who === "VOSS" ? "DR. ILYA VOSS" : L.who === "OKAFOR" ? "FOREMAN OKAFOR" :
      L.who === "CHIEF" ? "CHIEF (YOU)" : "RIG SYSTEMS";
    var port = L.who === "VOSS" ? "port_voss" : L.who === "OKAFOR" ? "port_okafor" : null;
    if (dlgTimer) clearInterval(dlgTimer);
    dlgTimer = setInterval(function () {
      if (!dlgState) { clearInterval(dlgTimer); return; }
      if (dlgState.ci < L.text.length) {
        dlgState.ci++;
        paintDlg(who, port, L.text.slice(0, dlgState.ci));
      } else clearInterval(dlgTimer);
    }, speedMs());
    paintDlg(who, port, L.text.slice(0, st.ci));
    UI.narrate(st.idPrefix + "-" + st.i, L.text);
  }
  function paintDlg(who, port, text) {
    var cv = port && root.DeepRender ? portraitURL(port) : "";
    dlgBox.innerHTML =
      '<div class="who">' + who + "</div>" +
      '<div class="drow">' +
      (cv ? '<img class="port" src="' + cv + '">' : "") +
      '<p class="dtext">' + escapeHtml(text) + "</p></div>" +
      '<div class="hint">SPACE / click — continue</div>';
  }
  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  var portCache = {};
  function portraitURL(key) {
    if (portCache[key]) return portCache[key];
    var cv = root.DeepRender.sprite(key);
    var c2 = document.createElement("canvas");
    c2.width = 60; c2.height = 60;
    c2.getContext("2d").drawImage(cv, 0, 0, 60, 60);
    portCache[key] = c2.toDataURL();
    return portCache[key];
  }

  // ---- narrator: VO clip first, speechSynthesis fallback ----
  var curAudio = null, voMiss = {};
  UI.narrate = function (id, text) {
    UI.stopNarrate();
    if (!settings.narration) return;
    if (voMiss[id]) { speakFallback(text); return; }
    try {
      var a = new Audio("audio/vo/" + id + ".mp3");
      curAudio = a;
      a.oncanplay = function () { a.play().catch(function () {}); };
      a.onerror = function () { voMiss[id] = true; speakFallback(text); };
      // if the file 404s quickly, onerror fires; give it a moment before fallback
      a.load();
    } catch (e) { speakFallback(text); }
  };
  function speakFallback(text) {
    if (!settings.narration) return;
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05; u.pitch = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  UI.stopNarrate = function () {
    if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; }
    try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch (e) {}
  };

  // ---------------- tech choice ----------------
  UI.showTechChoice = function (offer, onPick) {
    var T = root.DeepSim.TECH_DEFS;
    var cards = offer.map(function (id, i) {
      var t = T.filter(function (x) { return x.id === id; })[0];
      return '<button class="card" data-b="' + i + '"><b>' + t.name + "</b><span>" + t.desc + "</span></button>";
    }).join("");
    panel("<h2>TECH UNLOCK — choose one</h2>" +
      '<div class="cards">' + cards + "</div>" +
      '<div class="hint">1 / 2 / 3 or click</div>');
    var bs = uiRoot.querySelectorAll(".card");
    function pick(i) {
      if (root.DeepAudio) root.DeepAudio.techUnlock();
      UI.hide(); onPick(offer[i]);
    }
    for (var i = 0; i < bs.length; i++) (function (b, i) {
      b.addEventListener("click", function (ev) { ev.stopPropagation(); pick(i); });
    })(bs[i], i);
    UI._techPick = pick;
  };

  // ---------------- mutation report card ----------------
  UI.showMutationCard = function (notes, wave, autoMs) {
    UI._lastMut = { notes: notes, wave: wave }; // Tab re-opens the report
    var box = el("mutcard");
    box.innerHTML = "<b>VOSS — SONAR REPORT · WAVE " + wave + "</b><br>" +
      notes.map(function (n) { return "◈ " + escapeHtml2(n); }).join("<br>");
    box.style.display = "block";
    if (root.DeepAudio) root.DeepAudio.mutationMotif();
    if (UI._mutT) clearTimeout(UI._mutT);
    UI._mutT = setTimeout(function () { box.style.display = "none"; }, autoMs || 7000);
  };
  function escapeHtml2(s) { return ("" + s).replace(/</g, "&lt;"); }

  // ---------------- allegiance / endings ----------------
  UI.showChoice = function (title, prompt, options, onPick) {
    var cards = options.map(function (o, i) {
      return '<button class="card" data-b="' + i + '"><b>' + o.label + "</b></button>";
    }).join("");
    panel("<h2>" + title + "</h2>" + '<div class="tag">' + prompt + "</div>" +
      '<div class="cards">' + cards + "</div>");
    var bs = uiRoot.querySelectorAll(".card");
    for (var i = 0; i < bs.length; i++) (function (b, i) {
      b.addEventListener("click", function (ev) { ev.stopPropagation(); UI.hide(); onPick(i); });
    })(bs[i], i);
    UI._choicePick = onPick;
  };

  UI.showEndScreens = function (stats, seed, cbs) {
    var s = stats;
    panel("<h2>RIG STATUS REPORT</h2>" +
      '<div class="stats">Waves held: <b>' + s.wavesWon + " / 30</b><br>" +
      "Kills: <b>" + s.kills + "</b> · Cells earned: <b>" + s.cellsEarned + "</b><br>" +
      "Overcharges fired: <b>" + s.overcharges + "</b> · Hull leaked total: <b>" + Math.round(s.leaksTotal) + "</b><br>" +
      "Seed: <b>" + seed + "</b></div>" +
      btn("↻ RETRY THIS SEED", "r", "big") + btn("⚓ NEW EXPEDITION", "n") + btn("TITLE", "t"));
    wire({ "↻ RETRY THIS SEED": cbs.retry, "⚓ NEW EXPEDITION": cbs.new, "TITLE": cbs.title });
  };

  UI.toast = function (msg, ms) {
    toastBox.textContent = msg;
    toastBox.style.display = "block";
    if (UI._toastT) clearTimeout(UI._toastT);
    UI._toastT = setTimeout(function () { toastBox.style.display = "none"; }, ms || 2600);
  };

  // ---------------- touch controls ----------------
  UI.initTouch = function (input) {
    if (!("ontouchstart" in window)) return;
    el("touch").style.display = "block";
    function bind(id, down, up) {
      var n = el(id);
      n.addEventListener("touchstart", function (e) {
        e.preventDefault();
        if (root.DeepAudio) root.DeepAudio.unlock();
        down();
      }, { passive: false });
      n.addEventListener("touchend", function (e) { e.preventDefault(); if (up) up(); }, { passive: false });
    }
    bind("t-up", function () { input.up = true; }, function () { input.up = false; });
    bind("t-down", function () { input.down = true; }, function () { input.down = false; });
    bind("t-left", function () { input.left = true; }, function () { input.left = false; });
    bind("t-right", function () { input.right = true; }, function () { input.right = false; });
    bind("t-act", function () { input.actP = true; }, null);
    bind("t-over", function () { input.overP = true; }, null);
    bind("t-wave", function () { input.waveP = true; }, null);
  };

  root.DeepUI = UI;
})(typeof self !== "undefined" ? self : this);
