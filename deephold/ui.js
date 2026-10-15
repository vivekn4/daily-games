/* Deephold — UI/UX module: menus, HUD, dialogue, tutorial, settings.
 *
 * Self-contained: no dependencies, vanilla canvas 2D. Owned by the UI/UX
 * designer. The programmer wires it into the game loop per UI.md.
 *
 * Exposed as window.DUI with:
 *   - UI.create(canvas)      -> ui instance (state machine + draw + input)
 *   - UI.SETTINGS / COLORS / FONTS / LAYOUT constants
 *   - loadSettings/saveSettings/persisted settings
 *
 * Canvas contract: 960 x 640 (same as Emberdeep for pipeline consistency).
 */
(function () {
  "use strict";

  var VW = 960, VH = 640;

  /* ---------- color-blind-safe abyssal palette ----------
   * Okabe-Ito inspired: meaning is never carried by red/green alone.
   * Every danger state also gets text + shape (blink/icon) cues.      */
  var C = {
    bg0: "#020a13", bg1: "#072032", bg2: "#0b3049",
    panel: "rgba(4,18,30,0.92)", panelEdge: "#1d4e6b",
    ink: "#eaf6ff", dim: "#9fb8c9", faint: "#5f7d90",
    cyan: "#35b6ff",      // primary accent / selection
    teal: "#4de3c2",      // success / economy positive
    gold: "#ffc53d",      // warnings, overcharge ready, key labels
    orange: "#ff7a4d",    // hull danger / elite threat (not red)
    purple: "#b48cf2",    // tech tree / narrative
    deep: "#0a2233"
  };

  var F = {
    title: "bold 64px Georgia, 'Times New Roman', serif",
    h1: "bold 30px system-ui, sans-serif",
    h2: "bold 20px system-ui, sans-serif",
    body: "16px system-ui, sans-serif",
    small: "13px system-ui, sans-serif",
    tiny: "11px system-ui, sans-serif",
    hud: "bold 15px system-ui, sans-serif",
    mono: "13px ui-monospace, Menlo, Consolas, monospace"
  };

  /* ---------- persisted settings ---------- */
  var SET_KEY = "deephold.settings.v1";
  var SAVE_KEY = "deephold.save.v1";

  var DEFAULTS = { textSpeed: "normal", shake: true, mute: false, narration: true };

  function loadSettings() {
    var s = {};
    for (var k in DEFAULTS) s[k] = DEFAULTS[k];
    try {
      var raw = localStorage.getItem(SET_KEY);
      if (raw) {
        var j = JSON.parse(raw);
        for (var k2 in DEFAULTS) if (typeof j[k2] === typeof DEFAULTS[k2]) s[k2] = j[k2];
      }
    } catch (e) { /* storage unavailable -> defaults */ }
    return s;
  }
  function saveSettings(s) {
    try { localStorage.setItem(SET_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  }

  var TEXT_CPS = { slow: 14, normal: 28, fast: 60 }; // chars per second

  /* ---------- layout ---------- */
  var L = {
    topBarH: 54,
    hudPad: 12,
    leftPanelW: 200,
    rightPanelW: 150,
    dlgH: 150,
    hintH: 34
  };

  /* ---------- small helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function text(ctx, s, x, y, font, color, align, maxW) {
    ctx.font = font; ctx.fillStyle = color;
    ctx.textAlign = align || "left"; ctx.textBaseline = "alphabetic";
    if (maxW) ctx.fillText(s, x, y, maxW); else ctx.fillText(s, x, y);
  }
  function wrap(ctx, s, font, maxW) {
    // returns array of lines; words never overflow maxW
    ctx.font = font;
    var words = String(s).split(/\s+/), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + " " + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function panel(ctx, x, y, w, h, edge) {
    ctx.fillStyle = C.panel;
    roundRect(ctx, x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = edge || C.panelEdge; ctx.lineWidth = 2; ctx.stroke();
  }
  // abyssal backdrop shared by all menu screens: depth fog + sonar sweep + motes
  function drawBackdrop(ctx, t) {
    var g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, "#041420"); g.addColorStop(0.55, C.bg1); g.addColorStop(1, C.bg0);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    // drifting motes (cheap particle ambience, deterministic-ish by time)
    ctx.fillStyle = "rgba(53,182,255,0.10)";
    for (var i = 0; i < 60; i++) {
      var px = (i * 167.3 + t * (8 + (i % 5))) % VW;
      var py = (i * 311.7 + t * (5 + (i % 3))) % VH;
      ctx.fillRect(px, py, 2, 2);
    }
    // sonar sweep line from the rig center-bottom
    var cx = VW / 2, cy = VH + 120;
    var ang = (t * 0.5) % (Math.PI * 2);
    ctx.save(); ctx.globalAlpha = 0.12;
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, VH, ang - Math.PI / 2, ang - Math.PI / 2 + 0.05); ctx.stroke();
    ctx.restore();
    // depth-fog vignette
    var v = ctx.createRadialGradient(VW / 2, VH / 2, 240, VW / 2, VH / 2, 560);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(1,6,10,0.75)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
  }
  // VN signature splash corner (portfolio standing rule)
  function drawVN(ctx) {
    text(ctx, "a VN production", VW - 14, VH - 12, F.tiny, C.faint, "right");
  }
  // depth-fog fade helper for scene transitions
  function sceneFade(ctx, fade) {
    if (fade <= 0) return;
    ctx.fillStyle = "rgba(1,6,10," + clamp(fade, 0, 1).toFixed(3) + ")";
    ctx.fillRect(0, 0, VW, VH);
  }

  /* ---------- key bindings (documented contract, also in UI.md) ---------- */
  var KEYS = {
    up: ["ArrowUp", "KeyW"], down: ["ArrowDown", "KeyS"],
    left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"],
    confirm: ["Enter", "Space"], pause: ["Escape", "KeyP"],
    mute: ["KeyM"], build: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6"],
    overcharge: ["KeyQ", "KeyW2", "KeyE", "KeyR", "KeyT", "KeyY"],
    harvest: ["KeyH"], bank: ["KeyB"], report: ["Tab"], repair: ["KeyF"]
  };
  // NOTE: overcharge KeyW2 placeholder fixed below (KeyW was bound to cursor up)
  KEYS.overcharge = ["KeyQ", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU"];

  function match(code, list) { return list.indexOf(code) >= 0; }

  /* ---------- tutorial: first-60-seconds onboarding ----------
   * The game fires tutorialEvent(name) at gameplay moments; UI decides
   * which hint beat shows. Beats are idempotent and survive pause.
   * Waves 1 tutorial target: player has placed a tower, harvested a vent,
   * banked cells, and started the siege within ~60s.                      */
  var TUT_BEATS = [
    { id: "t_surv", when: "phase_survey", until: "tower_placed",
      text: "SURVEY PHASE — pick a glowing hull socket, press [1] to bolt on a Harpoon Gun." },
    { id: "t_tower", when: "tower_placed", until: "vent_harvested",
      text: "Tower up! Now harvest — move the cursor to a thermal vent and press [H] to send an ROV." },
    { id: "t_vent", when: "vent_harvested", until: "cells_banked",
      text: "Cells collected. Press [B] to bank surplus into the Pressure Core for a global buff." },
    { id: "t_bank", when: "cells_banked", until: "siege_started",
      text: "Core humming. Press [Space] to begin the SIEGE — the trench is already climbing." },
    { id: "t_siege", when: "siege_started", until: "overcharge_used",
      text: "They're on the hull! Press [Q]/[E]/[R]… to OVERCHARGE a turret when it's swarmed." },
    { id: "t_over", when: "overcharge_used", until: "wave_cleared",
      text: "Beautiful. Hold the line — damaged sectors repair themselves between waves. Watch hull % top-left." },
    { id: "t_wave", when: "wave_cleared", until: "tech_picked",
      text: "Wave down. Cells banked. Pick 1 tech node [1/2/3] — choose one that fixes what hurt you." },
    { id: "t_tech", when: "tech_picked", until: "never",
      final: true, ttl: 15,
      text: "You're on your own from here, Chief. Read the mutation report each wave [Tab]. Good luck." }
  ];

  function Tutorial() {
    return { fired: {}, active: null, done: false, ttl: 0 };
  }

  /* ---------- main UI instance ---------- */
  function create(canvas) {
    var ctx = canvas.getContext("2d");
    var settings = loadSettings();

    var ui = {
      screen: "title",        // title|howto|settings|pause|hudless(none)|gameover|victory
      menuIdx: 0, pauseIdx: 0, howtoPage: 0, setIdx: 0,
      seedText: "", seedFocus: false,
      fade: 1,                // scene fade in
      t: 0,
      settings: settings,
      tut: Tutorial(),
      lastHint: "",
      blink: 0,
      narrationLine: null,    // {speaker, text} fed to speechSynthesis by game
      tapRegions: [],         // filled by programmer for touch hit-testing
      callbacks: {
        newGame: null, continueGame: null, quitToTitle: null,
        restart: null, resume: null, toggleMute: null, overcharge: null
      }
    };

    /* ===== input ===== */
    function setMenu(list, idx) {
      var n = list.length;
      ui.menuIdx = ((idx % n) + n) % n;
      ui.blink = 0;
    }
    function titleItems() {
      var items = ["New Dive", "Continue"];
      items.push("How to Play");
      items.push("Settings");
      return items;
    }
    ui.canContinue = function () { return hasSave(); };

    function handleKeyTitle(code) {
      if (match(code, KEYS.up)) setMenu(titleItems(), ui.menuIdx - 1);
      else if (match(code, KEYS.down)) setMenu(titleItems(), ui.menuIdx + 1);
      else if (match(code, KEYS.confirm)) {
        var it = titleItems()[ui.menuIdx];
        if (it === "New Dive") { ui.seedFocus = true; ui.screen = "seed"; ui.menuIdx = 0; }
        else if (it === "Continue") { if (ui.canContinue()) fire("continueGame"); else ui.shake = 0.3; }
        else if (it === "How to Play") { ui.screen = "howto"; ui.howtoPage = 0; }
        else if (it === "Settings") { ui.screen = "settings"; ui.setIdx = 0; }
      }
    }
    function handleKeySeed(code, ch) {
      if (code === "Escape") { ui.seedFocus = false; ui.screen = "title"; return; }
      if (code === "Enter") { fire("newGame", ui.seedText || null); ui.screen = "title"; return; }
      if (code === "Backspace") { ui.seedText = ui.seedText.slice(0, -1); return; }
      if (ch && /^[0-9a-zA-Z]$/.test(ch) && ui.seedText.length < 12) ui.seedText += ch;
    }
    var PAUSE_ITEMS = ["Resume", "Restart Run", "Mute: ", "Quit to Title"];
    function pauseItems() {
      var items = ["Resume", "Restart Run"];
      items.push("Sound: " + (ui.settings.mute ? "OFF" : "ON"));
      items.push("Quit to Title");
      return items;
    }
    function handleKeyPause(code) {
      if (match(code, KEYS.up)) ui.pauseIdx = (ui.pauseIdx + PAUSE_ITEMS.length - 1) % PAUSE_ITEMS.length;
      else if (match(code, KEYS.down)) ui.pauseIdx = (ui.pauseIdx + 1) % PAUSE_ITEMS.length;
      else if (match(code, KEYS.pause)) fire("resume");
      else if (match(code, KEYS.confirm)) {
        if (ui.pauseIdx === 0) fire("resume");
        else if (ui.pauseIdx === 1) { if (confirm2()) fire("restart"); }
        else if (ui.pauseIdx === 2) { toggleMute(); }
        else if (ui.pauseIdx === 3) { if (confirm2()) fire("quitToTitle"); }
      }
    }
    function confirm2() { return true; } // placeholder: game wires its own confirm dialog if desired
    function handleKeySettings(code) {
      var rows = setRows();
      if (match(code, KEYS.up)) ui.setIdx = (ui.setIdx + rows.length - 1) % rows.length;
      else if (match(code, KEYS.down)) ui.setIdx = (ui.setIdx + 1) % rows.length;
      else if (code === "Escape") { saveSettings(ui.settings); ui.screen = "title"; }
      else if (code === "ArrowLeft" || code === "ArrowRight") {
        var row = rows[ui.setIdx];
        row.cycle(code === "ArrowLeft" ? -1 : 1);
        saveSettings(ui.settings);
        if (row.id === "mute") fire("toggleMute");
      }
    }
    function setRows() {
      var s = ui.settings;
      return [
        { id: "text", label: "Text speed", val: function () { return s.textSpeed; },
          cycle: function (d) { s.textSpeed = cyc(["slow", "normal", "fast"], s.textSpeed, d); } },
        { id: "shake", label: "Screen shake", val: function () { return s.shake ? "ON" : "OFF"; },
          cycle: function () { s.shake = !s.shake; } },
        { id: "mute", label: "Sound", val: function () { return s.mute ? "MUTED" : "ON"; },
          cycle: function () { s.mute = !s.mute; } },
        { id: "narr", label: "Voice narration", val: function () { return s.narration ? "ON" : "OFF"; },
          cycle: function () { s.narration = !s.narration; } }
      ];
    }
    function cyc(arr, cur, d) {
      var i = arr.indexOf(cur); i = (i + d + arr.length) % arr.length; return arr[i];
    }
    function toggleMute() {
      ui.settings.mute = !ui.settings.mute;
      saveSettings(ui.settings);
      fire("toggleMute");
    }
    function fire(name, arg) {
      var cb = ui.callbacks[name];
      if (cb) cb(arg);
    }

    ui.onKey = function (code, ch) {
      ui.blink = 0;
      if (ui.screen === "title") handleKeyTitle(code);
      else if (ui.screen === "seed") handleKeySeed(code, ch);
      else if (ui.screen === "howto") {
        if (code === "Escape") ui.screen = "title";
        else if (code === "ArrowRight") ui.howtoPage = Math.min(ui.howtoPage + 1, HOWTO_PAGES.length - 1);
        else if (code === "ArrowLeft") ui.howtoPage = Math.max(ui.howtoPage - 1, 0);
      }
      else if (ui.screen === "settings") handleKeySettings(code);
      else if (ui.screen === "pause") handleKeyPause(code);
      // in gameplay screens the game consumes keys; UI only handles pause/mute/report hotkeys
      else if (ui.screen === "game") {
        if (match(code, KEYS.pause)) fire("pause");
        else if (match(code, KEYS.mute)) toggleMute();
        else return false; // let the game have it
      }
      return true;
    };

    /* ===== tutorial ===== */
    ui.tutorialReset = function () { ui.tut = Tutorial(); };
    ui.tutorialDismiss = function () { ui.tut.active = null; ui.tut.done = true; ui.tut.ttl = 0; };
    ui.tutorialEvent = function (name) {
      var T = ui.tut;
      if (T.done) return; // completed tutorials stay completed
      if (T.fired[name]) { updateTutActive(name); return; }
      T.fired[name] = true;
      updateTutActive(name);
    };
    function updateTutActive(latest) {
      // active beat = first beat whose `when` fired and `until` not fired
      var T = ui.tut, active = null;
      for (var i = 0; i < TUT_BEATS.length; i++) {
        var b = TUT_BEATS[i];
        if (T.fired[b.when] && !T.fired[b.until]) { active = b; break; }
      }
      T.active = active;
      if (active && active.final) T.ttl = active.ttl;
      if (!active) T.done = true;
    }

    /* ===== dialogue ===== */
    var dlg = { speaker: "", text: "", shown: 0, chars: 0, choices: null, sel: 0, done: false, raw: "" };
    ui.dialogue = dlg;
    ui.say = function (speaker, text, choices) {
      dlg.speaker = speaker; dlg.raw = text; dlg.text = text;
      dlg.shown = 0; dlg.chars = text.length;
      dlg.choices = choices || null; dlg.sel = 0; dlg.done = false;
      // narration hook: game reads ui.narrationLine when set
      ui.narrationLine = ui.settings.narration ? { speaker: speaker, text: text } : null;
    };
    ui.dlgVisible = function () { return dlg.text.length > 0 && !dlg.done; };
    ui.dlgAdvance = function () {
      var cps = TEXT_CPS[ui.settings.textSpeed] || TEXT_CPS.normal;
      if (dlg.shown < dlg.chars) { dlg.shown = dlg.chars; return null; } // skip typewriter
      if (dlg.choices) return dlg.sel;                                  // choice index chosen
      dlg.done = true; dlg.text = ""; ui.narrationLine = null;
      return "next";
    };
    ui.dlgChoose = function (d) {
      if (!dlg.choices) return;
      dlg.sel = clamp(dlg.sel + d, 0, dlg.choices.length - 1);
    };

    /* ===== update ===== */
    ui.update = function (dt) {
      ui.t += dt; ui.blink += dt;
      ui.fade = Math.max(0, ui.fade - dt * 1.5);
      // final tutorial beat auto-completes after its TTL
      var T = ui.tut;
      if (T.active && T.active.final && !T.done) {
        T.ttl -= dt;
        if (T.ttl <= 0) { T.active = null; T.done = true; }
      }
      var cps = TEXT_CPS[ui.settings.textSpeed] || TEXT_CPS.normal;
      if (dlg.text && dlg.shown < dlg.chars) dlg.shown = Math.min(dlg.chars, dlg.shown + dt * cps);
    };

    /* ===== draw: menu screens ===== */
    function menuList(ctx, items, x, y, sel, disabled) {
      for (var i = 0; i < items.length; i++) {
        var isSel = (i === sel);
        var dis = disabled && disabled[i];
        var col = dis ? C.faint : (isSel ? C.gold : C.ink);
        var label = (isSel ? "▶ " : "  ") + items[i] + (isSel ? " ◀" : "");
        text(ctx, label, x, y + i * 40, F.h2, col, "center");
      }
    }

    ui.drawTitle = function () {
      drawBackdrop(ctx, ui.t);
      // rig silhouette hint: dark hull arc
      ctx.strokeStyle = "#123b55"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(VW / 2, VH + 340, 460, Math.PI * 1.18, Math.PI * 1.82); ctx.stroke();
      // title
      text(ctx, "DEEPHOLD", VW / 2, 150, F.title, C.cyan, "center");
      ctx.save(); ctx.shadowColor = C.cyan; ctx.shadowBlur = 24;
      text(ctx, "DEEPHOLD", VW / 2, 150, F.title, C.cyan, "center");
      ctx.restore();
      text(ctx, "The trench is rising. Hold the rig.", VW / 2, 192, F.body, C.dim, "center");
      var items = titleItems();
      var dis = [false, !ui.canContinue(), false, false];
      menuList(ctx, items, VW / 2, 280, ui.menuIdx, dis);
      if (!ui.canContinue())
        text(ctx, "(no saved run yet)", VW / 2, 280 + 1 * 40 + 22, F.small, C.faint, "center");
      drawVN(ctx);
      text(ctx, "deep-sea tower defense · 30 waves · 3 endings", VW / 2, VH - 40, F.small, C.faint, "center");
      text(ctx, "v1.0", 14, VH - 12, F.tiny, C.faint, "left");
      sceneFade(ctx, ui.fade);
    };

    ui.drawSeed = function () {
      drawBackdrop(ctx, ui.t);
      text(ctx, "NEW DIVE", VW / 2, 180, F.h1, C.cyan, "center");
      text(ctx, "Enter a seed for a replayable trench — or leave blank for a fresh one.", VW / 2, 230, F.body, C.dim, "center");
      panel(ctx, VW / 2 - 180, 270, 360, 52);
      text(ctx, ui.seedText + (Math.floor(ui.t * 2) % 2 ? "▌" : " "), VW / 2 - 160, 304, F.h2, C.ink, "left");
      text(ctx, "[Enter] dive   ·   [Esc] back", VW / 2, 380, F.small, C.dim, "center");
      text(ctx, "Same seed + same choices = same waves, vents, and tech offers.", VW / 2, 410, F.small, C.faint, "center");
      drawVN(ctx);
      sceneFade(ctx, ui.fade);
    };

    var HOWTO_PAGES = [
      { h: "The Loop", lines: [
        "Each wave has two phases:",
        "",
        "SURVEY (prepare): read the mutation report, place / upgrade /",
        "sell turrets, send ROVs to harvest thermal vents [H],",
        "bank surplus cells into the Pressure Core [B].",
        "",
        "SIEGE (defend): creatures climb the hull toward the Core.",
        "You can't aim — you manage: trigger turret OVERCHARGES,",
        "reroute power between hull sectors, detonate mines.",
        "",
        "AFTERMATH: collect cells, repair hull, pick 1 tech node.",
        "Press [Space] to start the siege when you're ready."
      ]},
      { h: "Controls", lines: [
        "[WASD / Arrows]  move cursor",
        "[Enter / Space]  confirm · place · advance dialogue",
        "[1]–[6]          build tower family at selected socket",
        "[Q][E][R][T][Y][U]  overcharge turrets 1–6 (siege phase)",
        "[H]              harvest vent with ROV",
        "[B]              bank cells into Pressure Core",
        "[F]              repair breached sector",
        "[Tab]            mutation report (what's coming)",
        "[Esc]/[P]        pause      [M] mute",
        "",
        "Touch: tap sockets, vents, and tower buttons directly.",
        "D-pad moves the cursor, ACTION confirms."
      ]},
      { h: "Towers & Overcharge", lines: [
        "1 Harpoon Gun — single-target DPS",
        "2 Flak Turret — area damage",
        "3 Tesla Coil — chains + slows",
        "4 Sonar Array — reveals stealth + debuffs",
        "5 Mining Rig — boosts harvest and cell drops",
        "6 Breach Sealer — passively repairs hull",
        "",
        "Each tower has an OVERCHARGE — a burst of power with a",
        "cooldown. Timing an overcharge on a swarm is the skill",
        "that wins runs. Watch the cooldown rings on the right edge."
      ]},
      { h: "The Trench Adapts", lines: [
        "The AI director mutates every wave: new resistances, speeds,",
        "and siege behavior — announced by Dr. Voss before each wave.",
        "",
        "Bleeding hull? Expect armor and siege specialists.",
        "Holding clean? Expect fast swarmers — and bonus cells.",
        "",
        "Bosses at waves 10 / 20 / 30. Survive all 30 to reach",
        "the Heart of the Trench — then choose your ending."
      ]}
    ];
    ui.drawHowto = function () {
      drawBackdrop(ctx, ui.t);
      var p = HOWTO_PAGES[ui.howtoPage];
      panel(ctx, 120, 80, VW - 240, VH - 180);
      text(ctx, "HOW TO PLAY — " + p.h, VW / 2, 130, F.h1, C.gold, "center");
      ctx.textAlign = "left";
      var y = 175;
      for (var i = 0; i < p.lines.length; i++) {
        text(ctx, p.lines[i], 160, y, F.body, i === 0 && p.lines[i] === p.h ? C.gold : C.ink, "left");
        y += 24;
      }
      text(ctx, "◀ " + (ui.howtoPage + 1) + "/" + HOWTO_PAGES.length + " ▶", VW / 2, VH - 66, F.small, C.dim, "center");
      text(ctx, "[←/→] page   ·   [Esc] back", VW / 2, VH - 44, F.small, C.dim, "center");
      sceneFade(ctx, ui.fade);
    };

    ui.drawSettings = function () {
      drawBackdrop(ctx, ui.t);
      panel(ctx, 230, 120, VW - 460, 340);
      text(ctx, "SETTINGS", VW / 2, 170, F.h1, C.gold, "center");
      var rows = setRows();
      for (var i = 0; i < rows.length; i++) {
        var sel = (i === ui.setIdx);
        var y = 220 + i * 48;
        text(ctx, rows[i].label, 280, y, F.h2, sel ? C.gold : C.ink, "left");
        text(ctx, "◀ " + String(rows[i].val()).toUpperCase() + " ▶", VW - 280, y, F.h2, sel ? C.cyan : C.dim, "right");
        if (sel) { ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; roundRect(ctx, 255, y - 26, VW - 510, 38, 8); ctx.stroke(); }
      }
      text(ctx, "[←/→] change   ·   [Esc] save & back", VW / 2, 440, F.small, C.dim, "center");
      sceneFade(ctx, ui.fade);
    };

    ui.drawPause = function () {
      // dim the frozen game frame underneath
      ctx.fillStyle = "rgba(1,6,10,0.72)"; ctx.fillRect(0, 0, VW, VH);
      panel(ctx, VW / 2 - 190, 150, 380, 300);
      text(ctx, "PAUSED", VW / 2, 205, F.h1, C.gold, "center");
      text(ctx, "the trench waits for no one", VW / 2, 232, F.small, C.dim, "center");
      menuList(ctx, pauseItems(), VW / 2, 290, ui.pauseIdx);
      text(ctx, "[Esc] resume", VW / 2, 414, F.small, C.dim, "center");
    };

    ui.drawGameOver = function (stats) {
      drawBackdrop(ctx, ui.t);
      text(ctx, "THE RIG IS LOST", VW / 2, 200, F.h1, C.orange, "center");
      text(ctx, "wave " + (stats ? stats.wave : "?") + " of 30", VW / 2, 250, F.body, C.dim, "center");
      text(ctx, "The trench takes another station. The signal continues.", VW / 2, 290, F.body, C.ink, "center");
      text(ctx, "[Enter] new dive   ·   [Esc] title", VW / 2, 360, F.small, C.dim, "center");
      drawVN(ctx);
    };
    ui.drawVictory = function (ending) {
      drawBackdrop(ctx, ui.t);
      text(ctx, "THE TRENCH HOLDS", VW / 2, 200, F.h1, C.teal, "center");
      text(ctx, "ending: " + (ending || "unknown"), VW / 2, 250, F.body, C.gold, "center");
      text(ctx, "[Enter] dive again   ·   [Esc] title", VW / 2, 330, F.small, C.dim, "center");
      drawVN(ctx);
    };

    /* ===== draw: HUD (gameplay) =====
     * G is a snapshot the game builds each frame (see UI.md for fields).
     * The UI never mutates game state.                               */
    ui.drawHUD = function (G) {
      if (!G) return;
      // --- top bar ---
      ctx.fillStyle = C.panel; ctx.fillRect(0, 0, VW, L.topBarH);
      ctx.strokeStyle = C.panelEdge; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, L.topBarH); ctx.lineTo(VW, L.topBarH); ctx.stroke();

      // wave + phase
      var phaseCol = G.phase === "siege" ? C.orange : (G.phase === "survey" ? C.cyan : C.teal);
      text(ctx, "WAVE " + G.wave + "/30", 14, 24, F.hud, phaseCol, "left");
      text(ctx, String(G.phase || "").toUpperCase() + (G.phaseT != null ? " " + Math.ceil(G.phaseT) + "s" : ""),
           14, 44, F.small, C.dim, "left");

      // hull integrity (color-blind safe: cyan bar -> orange + text at low)
      var hw = 220, hx = 200, hy = 16, hhp = clamp(G.hull / G.hullMax, 0, 1);
      var danger = hhp < 0.35;
      ctx.fillStyle = "#03101c"; ctx.fillRect(hx, hy, hw, 18);
      ctx.fillStyle = danger ? (Math.floor(ui.t * 4) % 2 ? C.orange : "#8f3a1e") : C.cyan;
      ctx.fillRect(hx, hy, hw * hhp, 18);
      ctx.strokeStyle = C.panelEdge; ctx.lineWidth = 1; ctx.strokeRect(hx, hy, hw, 18);
      text(ctx, "HULL " + Math.ceil(hhp * 100) + "%" + (danger ? " — BREACH!" : ""), hx, 48, F.small, danger ? C.orange : C.ink, "left");

      // cells + seed
      text(ctx, "⚡ " + (G.cells != null ? G.cells : 0), VW - 170, 26, F.hud, C.gold, "right");
      if (G.coreLevel) text(ctx, "Core Lv" + G.coreLevel, VW - 170, 46, F.small, C.purple, "right");
      text(ctx, "seed " + (G.seed != null ? G.seed : "—"), VW - 14, 26, F.tiny, C.faint, "right");

      // --- left tower roster (survey phase) ---
      if (G.phase === "survey" && G.towers) {
        panel(ctx, 10, 66, L.leftPanelW - 14, 6 * 44 + 16);
        text(ctx, "BUILD [1–6]", 18, 90, F.small, C.gold, "left");
        for (var i = 0; i < G.towers.length && i < 6; i++) {
          var tw = G.towers[i], y = 108 + i * 44;
          var sel = G.selTower === i;
          if (sel) { ctx.fillStyle = "rgba(53,182,255,0.18)"; roundRect(ctx, 14, y - 18, L.leftPanelW - 26, 40, 6); ctx.fill(); }
          var afford = G.cells >= tw.cost;
          text(ctx, (i + 1) + " " + tw.name, 22, y, F.small, afford ? C.ink : C.faint, "left");
          text(ctx, "⚡" + tw.cost, L.leftPanelW - 22, y, F.small, afford ? C.gold : C.faint, "right");
        }
      }

      // --- right overcharge column (siege phase) ---
      if (G.phase === "siege" && G.ocs) {
        var keys = ["Q", "E", "R", "T", "Y", "U"];
        panel(ctx, VW - L.rightPanelW, 66, L.rightPanelW - 10, 6 * 44 + 40);
        text(ctx, "OVERCHARGE", VW - 80, 90, F.small, C.gold, "center");
        for (var j = 0; j < G.ocs.length && j < 6; j++) {
          var oc = G.ocs[j], oy = 112 + j * 44;
          var ready = oc.cd <= 0;
          ctx.fillStyle = "#03101c"; ctx.fillRect(VW - L.rightPanelW + 12, oy - 16, L.rightPanelW - 40, 32);
          if (!ready) { // cooldown sweep
            var frac = clamp(oc.cd / oc.cdMax, 0, 1);
            ctx.fillStyle = "rgba(20,60,90,0.9)";
            ctx.fillRect(VW - L.rightPanelW + 12, oy - 16, (L.rightPanelW - 40) * frac, 32);
          }
          text(ctx, keys[j] + " " + oc.name, VW - L.rightPanelW + 20, oy + 5, F.small, ready ? C.gold : C.faint, "left");
        }
      }

      // --- phase banner flash ---
      if (G.banner && G.bannerT > 0) {
        var a = clamp(G.bannerT, 0, 1);
        ctx.save(); ctx.globalAlpha = a;
        text(ctx, G.banner, VW / 2, 120, F.h1, C.gold, "center");
        if (G.bannerSub) text(ctx, G.bannerSub, VW / 2, 150, F.body, C.ink, "center");
        ctx.restore();
      }

      // --- tutorial hint (bottom center) ---
      if (ui.tut.active) {
        panel(ctx, VW / 2 - 330, VH - L.hintH - 14, 660, L.hintH + 8, C.cyan);
        text(ctx, ui.tut.active.text, VW / 2, VH - 20, F.small, C.ink, "center", 640);
      } else if (G.hint) {
        text(ctx, G.hint, VW / 2, VH - 20, F.small, C.dim, "center");
      }

      // --- mutation report card (Tab toggles / auto in survey) ---
      if (G.reportOpen && G.mutations) ui.drawMutationReport(G.mutations, G.wave);

      // --- dialogue ---
      if (ui.dlgVisible()) ui.drawDialogue();

      // VN credit
      drawVN(ctx);
    };

    /* mutation report card: readable-at-a-glance director telegraph */
    ui.drawMutationReport = function (muts, wave) {
      var w = 560, h = 150 + muts.length * 30;
      var x = VW / 2 - w / 2, y = 130;
      panel(ctx, x, y, w, h, C.purple);
      text(ctx, "MUTATION REPORT — WAVE " + wave, VW / 2, y + 34, F.h2, C.purple, "center");
      text(ctx, "Dr. Voss, sonar desk", VW / 2, y + 58, F.small, C.dim, "center");
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i], my = y + 92 + i * 30;
        var icon = m.severity === "high" ? "▲" : (m.severity === "boss" ? "◆" : "●");
        var col = m.severity === "high" ? C.orange : (m.severity === "boss" ? C.purple : C.cyan);
        text(ctx, icon + "  " + m.title, x + 28, my, F.body, col, "left");
        text(ctx, m.detail, x + 320, my, F.small, C.dim, "left", w - 340);
      }
      text(ctx, "[Tab] dismiss", VW / 2, y + h - 18, F.small, C.dim, "center");
    };

    /* dialogue box with typewriter + branching choices */
    ui.drawDialogue = function () {
      var y = VH - L.dlgH - 8;
      panel(ctx, 40, y, VW - 80, L.dlgH, C.panelEdge);
      // speaker tab
      ctx.fillStyle = C.gold;
      roundRect(ctx, 60, y - 16, Math.max(90, ctx.measureText(dlg.speaker).width + 40), 30, 6); ctx.fill();
      text(ctx, dlg.speaker, 60 + (Math.max(90, ctx.measureText(dlg.speaker).width + 40)) / 2, y + 5,
           F.hud, "#04121f", "center");
      var body = dlg.raw.slice(0, Math.floor(dlg.shown));
      var lines = wrap(ctx, body, F.body, VW - 160);
      for (var i = 0; i < lines.length && i < 3; i++)
        text(ctx, lines[i], 70, y + 42 + i * 24, F.body, C.ink, "left");
      if (dlg.shown < dlg.chars) {
        text(ctx, "(typing…)", VW - 70, y + L.dlgH - 16, F.small, C.dim, "right");
      } else if (dlg.choices) {
        for (var c = 0; c < dlg.choices.length; c++) {
          var sel = (c === dlg.sel);
          text(ctx, (sel ? "▶ " : "   ") + (c + 1) + ". " + dlg.choices[c],
               70, y + 78 + c * 22, F.body, sel ? C.gold : C.dim, "left", VW - 160);
        }
      } else {
        if (Math.floor(ui.t * 2) % 2) text(ctx, "▼ Space", VW - 70, y + L.dlgH - 16, F.small, C.gold, "right");
      }
    };

    /* ===== touch overlay (drawn when touch device) ===== */
    ui.touchMode = false;
    ui.drawTouch = function () {
      if (!ui.touchMode) return;
      // d-pad left-bottom
      var cx = 96, cy = VH - 120, s = 44;
      ctx.fillStyle = "rgba(53,182,255,0.18)";
      [[0, -s], [0, s], [-s, 0], [s, 0]].forEach(function (o) {
        ctx.beginPath(); ctx.arc(cx + o[0], cy + o[1], 26, 0, Math.PI * 2); ctx.fill();
      });
      ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill();
      text(ctx, "▲", cx, cy - s + 6, F.h2, C.ink, "center");
      text(ctx, "▼", cx, cy + s + 6, F.h2, C.ink, "center");
      text(ctx, "◀", cx - s, cy + 6, F.h2, C.ink, "center");
      text(ctx, "▶", cx + s, cy + 6, F.h2, C.ink, "center");
      // action button right-bottom
      ctx.fillStyle = "rgba(255,197,61,0.25)";
      ctx.beginPath(); ctx.arc(VW - 96, VH - 120, 44, 0, Math.PI * 2); ctx.fill();
      text(ctx, "TAP", VW - 96, VH - 112, F.h2, C.gold, "center");
      // pause button top-right
      text(ctx, "II", VW - 24, 78, F.hud, C.dim, "center");
    };
    // tap hit-testing: returns region id; game consumes
    ui.tap = function (x, y) {
      if (!ui.touchMode) return null;
      var d = function (ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); };
      var cx = 96, cy = VH - 120, s = 44;
      if (d(x, y, cx, cy - s) < 28) return "up";
      if (d(x, y, cx, cy + s) < 28) return "down";
      if (d(x, y, cx - s, cy) < 28) return "left";
      if (d(x, y, cx + s, cy) < 28) return "right";
      if (d(x, y, VW - 96, VH - 120) < 48) return "action";
      if (x > VW - 60 && y > 56 && y < 100) return "pause";
      return "field";
    };

    /* ===== screen dispatcher ===== */
    ui.draw = function (G) {
      ctx.save();
      // screen shake (respects setting; game passes shakeAmp on hits)
      if (ui.settings.shake && G && G.shakeAmp) {
        var a = G.shakeAmp;
        ctx.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
      }
      if (ui.screen === "title") ui.drawTitle();
      else if (ui.screen === "seed") ui.drawSeed();
      else if (ui.screen === "howto") ui.drawHowto();
      else if (ui.screen === "settings") ui.drawSettings();
      else if (ui.screen === "game") { ui.drawHUD(G); }
      else if (ui.screen === "gameover") ui.drawGameOver(G && G.stats);
      else if (ui.screen === "victory") ui.drawVictory(G && G.ending);
      if (ui.screen === "pause") { ui.drawHUD(G); ui.drawPause(); ui.drawTouch(); }
      else ui.drawTouch();
      ctx.restore();
    };

    ui.toggleMute = toggleMute;
    ui.loadSettings = loadSettings; ui.saveSettings = saveSettings;
    ui.hasSave = hasSave;
    ui.W = VW; ui.H = VH; ui.COLORS = C; ui.FONTS = F; ui.LAYOUT = L; ui.KEYS = KEYS;

    // expose internals for QA/autopilot
    ui._beats = TUT_BEATS;
    ui._howtoPages = HOWTO_PAGES;
    ui._text = text; ui._panel = panel;

    return ui;
  }

  window.DUI = { create: create, loadSettings: loadSettings, saveSettings: saveSettings,
                 hasSave: hasSave, COLORS: C, FONTS: F, LAYOUT: L, KEYS: KEYS,
                 TUT_BEATS: TUT_BEATS, VW: VW, VH: VH };
})();
