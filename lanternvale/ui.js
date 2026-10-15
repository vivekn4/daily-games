/* LANTERNVALE — UI/UX module: menus, HUD, journal, photo mode, dialogue, tutorial, settings.
 *
 * Self-contained: no dependencies, vanilla canvas 2D. Owned by the UI/UX designer.
 * The programmer wires it into the game loop per UI.md.
 *
 * Exposed as window.LUI with:
 *   - LUI.create(canvas)      -> ui instance (state machine + draw + input)
 *   - LUI.SETTINGS / COLORS / FONTS / LAYOUT constants
 *   - LUI.loadSettings / LUI.saveSettings / LUI.hasSave
 *
 * Canvas contract: 960 x 640 (pipeline standard). Designed for the cozy
 * golden-hour aesthetic: warm cream panels, dark umber ink, lantern-gold
 * accents. Every meaning is carried by text + shape, never color alone
 * (color-blind safe: gold/teal/leaf/umber instead of red/green).
 */
(function () {
  "use strict";

  var VW = 960, VH = 640;

  /* ---------- cozy golden-hour palette (color-blind safe) ----------
   * Danger states don't exist in LANTERNVALE (no fail state), so the
   * palette is all warmth + information. Icons always have a label.   */
  var C = {
    bg0: "#f7e8c9", bg1: "#f3d9a8", bg2: "#e9c58c",     // parchment skies for menu backdrop
    panel: "rgba(253,246,232,0.96)", panelEdge: "#c8a15a",
    ink: "#3a2c1c", dim: "#6f5a3e", faint: "#9a8264",
    gold: "#b97e1e",        // primary accent / selection / beacon lit
    lantern: "#e07b39",     // lantern-orange: interactive, never alert-only
    leaf: "#4f7d36",        // flora / positive (paired with labels)
    teal: "#2f7f7a",        // water / river / echoes
    dusk: "#5f5a8f",        // night / deep light (paired with star icon)
    night: "#1d2138",       // night HUD ink
    nightPanel: "rgba(24,27,52,0.94)",
    cream: "#fdf6e8"
  };

  var F = {
    title: "bold 58px Georgia, 'Times New Roman', serif",
    titleSmall: "bold 40px Georgia, 'Times New Roman', serif",
    h1: "bold 26px system-ui, sans-serif",
    h2: "bold 19px system-ui, sans-serif",
    body: "16px system-ui, sans-serif",
    bodySerif: "italic 17px Georgia, 'Times New Roman', serif",
    small: "13px system-ui, sans-serif",
    tiny: "11px system-ui, sans-serif",
    hud: "bold 14px system-ui, sans-serif",
    mono: "13px ui-monospace, Menlo, Consolas, monospace"
  };

  /* ---------- persisted settings ---------- */
  var SET_KEY = "lanternvale.settings.v1";
  var SAVE_KEY = "lanternvale_save_v1";

  var DEFAULTS = { textSpeed: "normal", shake: false, mute: false, narration: true };
  var TEXT_CPS = { slow: 16, normal: 30, fast: 64 }; // chars per second

  function loadSettings() {
    var s = {}, k;
    for (k in DEFAULTS) s[k] = DEFAULTS[k];
    try {
      var raw = localStorage.getItem(SET_KEY);
      if (raw) {
        var j = JSON.parse(raw);
        for (k in DEFAULTS) if (typeof j[k] === typeof DEFAULTS[k]) s[k] = j[k];
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

  /* ---------- layout ---------- */
  var L = {
    topBarH: 44,
    hudPad: 10,
    dlgH: 148,
    hintH: 40,
    journalTabs: ["Map", "Flora", "Fauna", "Echoes", "Vistas", "Photos"],
    // touch controls (canvas coords)
    dpad: { x: 100, y: 540, r: 30 },
    action: { x: 860, y: 540, r: 46 }
  };

  /* ---------- tiny helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function wrap(ctx, text, maxW) {
    var words = String(text).split(" "), lines = [], line = "";
    for (var i = 0; i < words.length; i++) {
      var t = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  function fmtClock(dayT) {
    // dayT 0..1 across the 24-min cycle; 0 = dawn
    var h = Math.floor(dayT * 24);
    var m = Math.floor((dayT * 24 - h) * 60);
    if (m < 10) m = "0" + m;
    return h + ":" + m;
  }
  function phaseOf(dayT) {
    if (dayT < 0.22) return "dawn";
    if (dayT < 0.55) return "day";
    if (dayT < 0.72) return "dusk";
    return "night";
  }

  /* ================================================================
   *  UI instance
   * ================================================================ */
  function create(canvas) {
    var ctx = canvas.getContext("2d");
    var ui = {
      screen: "title",        // title|seed|howto|settings|game|pause|journal|photo|ending
      settingsFrom: "title",
      settings: loadSettings(),
      t: 0,                   // global anim clock (seconds)
      menuIdx: 0, howtoPage: 0, setIdx: 0,
      seedStr: "",
      dlg: null,              // { speaker, text, choices, shown, sel, narrate }
      narrationLine: null,
      voRequest: null,        // VO beat id requested (gated by narration toggle)
      touchMode: ("ontouchstart" in window),
      tut: { done: {}, active: null, ttl: 0 },
      photos: [],             // { url, caption, label } in-memory; saved by game
      photo: { open: false, zoom: 1, panX: 0, panY: 0 },
      snapRequest: null,      // {zoom, panX, panY} consumed by game on Space
      journalTab: 0,
      banner: null,           // { text, sub, t }  t counts down 1 -> 0
      endingData: null,       // { title, epilogue, stats } for ending screen
      fade: 1, fadeTo: 1,
      callbacks: {},
      isNight: false
    };

    /* ---------- VO / narration ---------- */
    ui.requestVO = function (beatId) {
      // Only fires when narration is on; game plays audio/vo/<beat>.mp3,
      // falling back to speechSynthesis of the same text.
      if (!ui.settings.narration) return;
      ui.voRequest = beatId;
    };
    ui.consumeVO = function () {
      var b = ui.voRequest; ui.voRequest = null; return b;
    };

    /* ---------- dialogue ---------- */
    ui.say = function (speaker, text, choices, opts) {
      opts = opts || {};
      ui.dlg = {
        speaker: speaker, text: text, choices: choices || null,
        shown: 0, sel: 0, done: false,
        narrate: opts.narrate === true
      };
      ui.screen = "game"; // dialogue rides over the game screen
    };
    ui.dlgVisible = function () { return !!ui.dlg; };
    ui.dlgChoose = function (d) {
      if (!ui.dlg || !ui.dlg.choices) return;
      ui.dlg.sel = clamp(ui.dlg.sel + d, 0, ui.dlg.choices.length - 1);
    };
    // Returns: null (just finished typewriter) | "next" (closed) | number (choice idx)
    ui.dlgAdvance = function () {
      if (!ui.dlg) return null;
      if (ui.dlg.shown < ui.dlg.text.length) {
        ui.dlg.shown = ui.dlg.text.length;
        ui._maybeNarrate();
        return null;
      }
      var ch = ui.dlg.choices, sel = ch ? ui.dlg.sel : -1;
      ui.dlg = null;
      return ch ? sel : "next";
    };
    ui._maybeNarrate = function () {
      if (ui.dlg && ui.dlg.narrate && ui.settings.narration && !ui.narrationLine) {
        ui.narrationLine = ui.dlg.text; // game speaks it (VO clip or speechSynthesis), then clears
      }
    };

    /* ---------- tutorial (first-60-seconds onboarding, event-driven) ---------- */
    var BEATS = [
      { id: "walk", ev: "arrived", title: "The walk begins",
        text: "Move with WASD or the arrow keys. There is no hurry here — nothing is chasing you. Nothing can." },
      { id: "compass", ev: "first_steps", title: "Your compass",
        text: "The brass compass shows which way YOU face — never where to go. Alda wrote: take the long way. It's kinder." },
      { id: "wewake", ev: "met_wewake", title: "A fellow traveler",
        text: "Someone walks these hills too. Walk close and press SPACE to say hello. Everyone here knows something." },
      { id: "journal", ev: "near_tower1", title: "Your journal",
        text: "Press J any time to open your journal. The map draws itself as you wander — every step fills it in." },
      { id: "tower", ev: "near_tower1", title: "The first dark tower",
        text: "A tower with no light. Reach its door, climb, and press SPACE to light the beacon. Warm it back up." },
      { id: "kind", ev: "kindness_gained", title: "Kindness",
        text: "A small good deed, and the valley noticed. Kindness is remembered — it changes how your story ends." },
      { id: "farewell", ev: "tower1_lit", title: "One light burning",
        text: "One beacon lit, four to go. When you're ready — the valley is wide. Come home by the long way." }
    ];
    ui.tutorialReset = function () { ui.tut = { done: {}, queue: [], active: null, ttl: 0 }; };
    // Fires every unfired beat matching ev, in order: first becomes active,
    // the rest queue up and show one after another as each TTL expires.
    // Returns the beat that just became active (or null).
    ui.tutorialEvent = function (ev) {
      var fired = null;
      for (var i = 0; i < BEATS.length; i++) {
        var b = BEATS[i];
        if (b.ev === ev && !ui.tut.done[b.id]) {
          ui.tut.done[b.id] = true;
          if (!ui.tut.active && !fired) { ui.tut.active = b; ui.tut.ttl = 14; fired = b; }
          else ui.tut.queue.push(b);
        }
      }
      return fired || ui.tut.active;
    };
    ui.tutorialDismiss = function () { ui.tut.active = null; ui.tut.ttl = 0; };
    ui._tutorialNext = function () {
      if (ui.tut.queue.length) {
        var b = ui.tut.queue.shift();
        ui.tut.active = b; ui.tut.ttl = 14;
      }
    };

    /* ---------- banner ---------- */
    ui.showBanner = function (text, sub) { ui.banner = { text: text, sub: sub || "", t: 1 }; };

    /* ---------- input: menus consume keys; gameplay consumes the rest ----------
     * Returns true when the key was consumed (caller must not also handle it). */
    ui.onKey = function (code, key) {
      var s = ui.screen, cb = ui.callbacks;
      // global: M toggles mute anywhere EXCEPT while typing a seed name
      if (code === "KeyM" && s !== "seed") {
        ui.settings.mute = !ui.settings.mute;
        saveSettings(ui.settings);
        if (cb.toggleMute) cb.toggleMute();
        return true;
      }
      // dialogue takes precedence in game screen
      if (s === "game" && ui.dlgVisible()) {
        if (code === "Space" || code === "Enter") { ui.dlgAdvance(); return true; }
        if (code === "ArrowUp") { ui.dlgChoose(-1); return true; }
        if (code === "ArrowDown") { ui.dlgChoose(1); return true; }
        if (/^[1-9]$/.test(key)) {
          if (ui.dlg && ui.dlg.choices && +key - 1 < ui.dlg.choices.length) {
            ui.dlg.sel = +key - 1; ui.dlgAdvance();
          }
          return true;
        }
        return false;
      }
      if (s === "title") {
        var n = 4, has = hasSave();
        if (code === "ArrowUp" || code === "KeyW") { ui.menuIdx = (ui.menuIdx + n - 1) % n; return true; }
        if (code === "ArrowDown" || code === "KeyS") { ui.menuIdx = (ui.menuIdx + 1) % n; return true; }
        if (code === "Enter" || code === "Space") {
          if (ui.menuIdx === 0) { ui.screen = "seed"; ui.seedStr = ""; }
          else if (ui.menuIdx === 1 && has && cb.continueGame) cb.continueGame();
          else if (ui.menuIdx === 2) { ui.screen = "howto"; ui.howtoPage = 0; }
          else if (ui.menuIdx === 3) { ui.settingsFrom = "title"; ui.screen = "settings"; ui.setIdx = 0; }
          return true;
        }
        return true; // menus consume everything
      }
      if (s === "seed") {
        if (code === "Enter" || code === "Space") {
          if (cb.newGame) cb.newGame(ui.seedStr || null);
          return true;
        }
        if (code === "Backspace") { ui.seedStr = ui.seedStr.slice(0, -1); return true; }
        if (code === "Escape") { ui.screen = "title"; return true; }
        if (/^[a-zA-Z0-9]$/.test(key) && ui.seedStr.length < 12) { ui.seedStr += key; return true; }
        return true;
      }
      if (s === "howto") {
        if (code === "ArrowLeft" || code === "KeyA") { ui.howtoPage = clamp(ui.howtoPage - 1, 0, 2); return true; }
        if (code === "ArrowRight" || code === "KeyD") { ui.howtoPage = clamp(ui.howtoPage + 1, 0, 2); return true; }
        if (code === "Escape" || code === "Enter" || code === "Space") { ui.screen = "title"; return true; }
        return true;
      }
      if (s === "settings") {
        var rows = ["textSpeed", "shake", "mute", "narration"];
        if (code === "ArrowUp" || code === "KeyW") { ui.setIdx = (ui.setIdx + rows.length - 1) % rows.length; return true; }
        if (code === "ArrowDown" || code === "KeyS") { ui.setIdx = (ui.setIdx + 1) % rows.length; return true; }
        if (code === "ArrowLeft" || code === "KeyA") { ui._cycleSetting(rows[ui.setIdx], -1); return true; }
        if (code === "ArrowRight" || code === "KeyD") { ui._cycleSetting(rows[ui.setIdx], 1); return true; }
        if (code === "Escape") {
          saveSettings(ui.settings);
          ui.screen = ui.settingsFrom; // back to title or pause
          if (ui.screen === "pause" && cb.pauseRefresh) cb.pauseRefresh();
          return true;
        }
        return true;
      }
      if (s === "game") {
        if (code === "Escape" || code === "KeyP") {
          if (ui.tut.active) ui.tutorialDismiss();
          ui.menuIdx = 0; ui.screen = "pause";
          if (cb.pause) cb.pause();
          return true;
        }
        if (code === "KeyJ" || code === "Tab") {
          ui.tutorialEvent("opened_journal");
          ui.screen = "journal"; ui.journalTab = 0;
          return true;
        }
        if (code === "KeyC" || code === "F12") { // C = camera / photo mode
          ui.openPhoto();
          return true;
        }
        return false;
      }
      if (s === "journal") {
        if (code === "Escape" || code === "KeyJ" || code === "Tab") { ui.screen = "game"; return true; }
        if (code === "ArrowLeft" || code === "KeyA") { ui.journalTab = (ui.journalTab + L.journalTabs.length - 1) % L.journalTabs.length; ui.journalScroll = 0; return true; }
        if (code === "ArrowRight" || code === "KeyD") { ui.journalTab = (ui.journalTab + 1) % L.journalTabs.length; ui.journalScroll = 0; return true; }
        if (code === "ArrowUp" || code === "KeyW") { ui.journalScroll = Math.max(0, (ui.journalScroll || 0) - 1); return true; }
        if (code === "ArrowDown" || code === "KeyS") { ui.journalScroll = (ui.journalScroll || 0) + 1; return true; }
        return true;
      }
      if (s === "photo") {
        if (code === "Escape") { ui.photo.open = false; ui.screen = "game"; return true; }
        if (code === "Space" || code === "Enter") {
          ui.snapRequest = { zoom: ui.photo.zoom, panX: ui.photo.panX, panY: ui.photo.panY };
          return true;
        }
        if (code === "Equal" || code === "NumpadAdd") { ui.photo.zoom = clamp(ui.photo.zoom + 0.2, 1, 3); return true; }
        if (code === "Minus" || code === "NumpadSubtract") { ui.photo.zoom = clamp(ui.photo.zoom - 0.2, 1, 3); return true; }
        return false; // WASD pans the viewfinder (gameplay keys)
      }
      if (s === "pause") {
        var items = ui._pauseItems();
        if (code === "ArrowUp" || code === "KeyW") { ui.menuIdx = (ui.menuIdx + items.length - 1) % items.length; return true; }
        if (code === "ArrowDown" || code === "KeyS") { ui.menuIdx = (ui.menuIdx + 1) % items.length; return true; }
        if (code === "Enter" || code === "Space") { ui._pauseSelect(); return true; }
        if (code === "Escape") { if (cb.resume) cb.resume(); return true; }
        return true;
      }
      if (s === "ending") {
        if (code === "Enter" || code === "Space" || code === "Escape") {
          if (ui.endingHasMore()) { ui.endingPage++; return true; }
          if (cb.quitToTitle) cb.quitToTitle();
          return true;
        }
        return true;
      }
      return false;
    };
    ui._cycleSetting = function (id, d) {
      var s = ui.settings;
      if (id === "textSpeed") {
        var order = ["slow", "normal", "fast"];
        s.textSpeed = order[(order.indexOf(s.textSpeed) + d + order.length) % order.length];
      }
      if (id === "shake") s.shake = !s.shake;
      if (id === "mute") { s.mute = !s.mute; if (ui.callbacks.toggleMute) ui.callbacks.toggleMute(); }
      if (id === "narration") s.narration = !s.narration;
      saveSettings(s);
    };
    ui._pauseItems = function () {
      return [
        "Resume",
        "Restart Walk",
        "Sound: " + (ui.settings.mute ? "MUTED" : "ON"),
        "Settings",
        "Quit to Title"
      ];
    };
    ui._pauseSelect = function () {
      var cb = ui.callbacks, i = ui.menuIdx;
      if (i === 0 && cb.resume) cb.resume();
      else if (i === 1 && cb.restart) cb.restart();
      else if (i === 2) ui._cycleSetting("mute", 1);
      else if (i === 3) { ui.settingsFrom = "pause"; ui.screen = "settings"; ui.setIdx = 0; }
      else if (i === 4 && cb.quitToTitle) cb.quitToTitle();
    };

    /* ---------- touch ----------
     * ui.tap(x, y) with canvas coords. Returns:
     *  "up"|"down"|"left"|"right"|"action" (gameplay d-pad/buttons)
     *  "pause"|"journal"|"photo" (HUD buttons) | "menu"/"set"/"dlg" (UI handles)
     *  null (nothing hit). */
    ui.tap = function (x, y) {
      var s = ui.screen;
      function inMenuTap() { return true; } // menus: game maps tap -> Enter at highlight? handled via ui.menuTap below
      if (s === "game" && !ui.dlgVisible()) {
        var d = L.dpad, a = L.action;
        if (Math.hypot(x - d.x, y - d.y) < d.r * 2.2) {
          var dx = x - d.x, dy = y - d.y;
          if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
          return dy > 0 ? "down" : "up";
        }
        if (Math.hypot(x - a.x, y - a.y) < a.r) return "action";
        // HUD quick buttons: journal (top-right), photo, pause
        if (x > VW - 150 && y < 60) return "pause";
        if (x > VW - 230 && y < 60) return "photo";
        if (x > VW - 310 && y < 60) return "journal";
        return null;
      }
      if (s === "game" && ui.dlgVisible()) { ui.dlgAdvance(); return "dlg"; }
      if (s === "photo") {
        // snap button zone: bottom center (matches drawn button at VH-80)
        if (Math.hypot(x - VW / 2, y - (VH - 80)) < 52) {
          ui.snapRequest = { zoom: ui.photo.zoom, panX: ui.photo.panX, panY: ui.photo.panY };
          return "snap";
        }
        if (x > VW - 80 && y < 60) { ui.photo.open = false; ui.screen = "game"; return "close"; }
        return null;
      }
      if (s === "journal") {
        // tab taps
        var tw = (VW - 200) / L.journalTabs.length;
        if (y > 118 && y < 158) {
          var idx = Math.floor((x - 100) / tw);
          if (idx >= 0 && idx < L.journalTabs.length) { ui.journalTab = idx; return "tab"; }
        }
        if (x > VW - 80 && y < 60) { ui.screen = "game"; return "close"; }
        return null;
      }
      // menu screens: return a virtual menu event; game forwards to menuTap
      return "menu";
    };
    // Tap-to-select on menu rows: y-index of the tapped row -> onKey(Enter)
    ui.menuTap = function (rowIdx) {
      ui.menuIdx = rowIdx;
      ui.onKey("Enter", "Enter");
    };

    /* ---------- photo capture ---------- */
    ui.addPhoto = function (dataURL, caption, entryLabel) {
      ui.photos.push({ url: dataURL, caption: caption || "", label: entryLabel || "", at: Date.now() });
      if (ui.photo.open) { ui.photo.open = false; ui.screen = "game"; }
      return ui.photos.length;
    };
    ui.getPhotos = function () { return ui.photos.map(function (p) { return { url: p.url, caption: p.caption, label: p.label }; }); };
    ui.setPhotos = function (list) { ui.photos = (list || []).slice(0, 24); };
    ui.openPhoto = function () {
      ui.photo.open = true; ui.photo.zoom = 1; ui.photo.panX = 0; ui.photo.panY = 0;
      ui.screen = "photo";
    };

    /* ---------- update ---------- */
    ui.update = function (dt) {
      ui.t += dt;
      // fade
      if (ui.fade < ui.fadeTo) ui.fade = Math.min(ui.fadeTo, ui.fade + dt * 3);
      else if (ui.fade > ui.fadeTo) ui.fade = Math.max(ui.fadeTo, ui.fade - dt * 3);
      // tutorial TTL -> next queued beat, or dismiss
      if (ui.tut.active) {
        ui.tut.ttl -= dt;
        if (ui.tut.ttl <= 0) { ui.tut.active = null; ui._tutorialNext(); }
      } else if (ui.tut.queue && ui.tut.queue.length) ui._tutorialNext();
      // banner countdown
      if (ui.banner) { ui.banner.t -= dt / 3; if (ui.banner.t <= 0) ui.banner = null; }
      // dialogue typewriter
      if (ui.dlg && ui.dlg.shown < ui.dlg.text.length) {
        var cps = TEXT_CPS[ui.settings.textSpeed] || 30;
        ui.dlg.shown = Math.min(ui.dlg.text.length, ui.dlg.shown + cps * dt);
        if (ui.dlg.shown >= ui.dlg.text.length) ui._maybeNarrate();
      }
    };

    /* ================================================================
     *  DRAW
     * ================================================================ */
    ui.draw = function (snap) {
      snap = snap || {};
      ui.isNight = phaseOf(snap.dayT != null ? snap.dayT : 0.35) === "night";
      var s = ui.screen;
      if (s === "title" || s === "seed" || s === "howto" || s === "settings" || s === "ending") {
        ui.drawBackdrop(snap);
      }
      if (s === "title") ui.drawTitle();
      else if (s === "seed") ui.drawSeed();
      else if (s === "howto") ui.drawHowto();
      else if (s === "settings") ui.drawSettings();
      else if (s === "game") { ui.drawHUD(snap); ui.drawTutorial(); if (ui.dlgVisible()) ui.drawDialogue(); }
      else if (s === "journal") { ui.drawHUD(snap); ui.drawJournal(snap); }
      else if (s === "photo") { ui.drawPhotoMode(snap); }
      else if (s === "pause") { ui.drawHUD(snap); ui.drawPause(); }
      else if (s === "ending") ui.drawEnding(snap);
      // fade overlay
      if (ui.fade < 1) {
        ctx.fillStyle = "rgba(20,14,8," + (1 - ui.fade) + ")";
        ctx.fillRect(0, 0, VW, VH);
      }
    };

    /* ---------- animated menu backdrop: drifting pollen, low sun, hills ---------- */
    ui.drawBackdrop = function (snap) {
      var dayT = snap.dayT != null ? snap.dayT : 0.32;
      var phase = phaseOf(dayT);
      var sky = phase === "night" ? ["#1d2138", "#3a3560"]
        : phase === "dawn" ? ["#f9c89b", "#fbe7c6"]
        : phase === "dusk" ? ["#e89a5f", "#f7d9a8"]
        : ["#a8d4e8", "#f7e8c9"];
      var g = ctx.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, sky[0]); g.addColorStop(0.62, sky[1]); g.addColorStop(0.621, "#7aa05a"); g.addColorStop(1, "#4f7d36");
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      // sun / moon
      var sx = VW * 0.72 + Math.sin(ui.t * 0.05) * 8, sy = VH * (phase === "night" ? 0.10 : 0.22);
      ctx.fillStyle = phase === "night" ? "rgba(240,240,255,0.9)" : "rgba(255,236,170,0.95)";
      ctx.beginPath(); ctx.arc(sx, sy, phase === "night" ? 26 : 34, 0, 7); ctx.fill();
      // soft hills
      ctx.fillStyle = phase === "night" ? "rgba(40,52,80,0.9)" : "rgba(90,140,90,0.85)";
      for (var h = 0; h < 3; h++) {
        ctx.beginPath();
        ctx.moveTo(0, VH * 0.66 + h * 26);
        for (var x = 0; x <= VW; x += 40)
          ctx.lineTo(x, VH * 0.66 + h * 26 + Math.sin((x + h * 300 + ui.t * 6) * 0.008) * 22);
        ctx.lineTo(VW, VH); ctx.lineTo(0, VH); ctx.closePath(); ctx.fill();
      }
      // drifting pollen / fireflies
      ctx.fillStyle = phase === "night" ? "rgba(190,220,255,0.8)" : "rgba(255,240,190,0.85)";
      for (var i = 0; i < 46; i++) {
        var px = (i * 211.3 + ui.t * (6 + (i % 5))) % VW;
        var py = (i * 97.7 + Math.sin(ui.t * 0.7 + i) * 22 + VH) % VH;
        ctx.globalAlpha = 0.35 + 0.3 * Math.sin(ui.t * 1.4 + i * 2.1);
        ctx.fillRect(px, py, 3, 3);
      }
      ctx.globalAlpha = 1;
      // distant signal tower silhouette (the unlit one)
      ctx.fillStyle = phase === "night" ? "#14172e" : "#5a4632";
      var tx = VW * 0.16;
      ctx.fillRect(tx - 10, VH * 0.34, 20, VH * 0.32);
      ctx.beginPath(); ctx.moveTo(tx - 22, VH * 0.34); ctx.lineTo(tx + 22, VH * 0.34); ctx.lineTo(tx, VH * 0.26); ctx.closePath(); ctx.fill();
    };

    function menuPanel(x, y, w, h) {
      ctx.fillStyle = C.panel; rr(ctx, x, y, w, h, 18); ctx.fill();
      ctx.strokeStyle = C.panelEdge; ctx.lineWidth = 2.5; rr(ctx, x, y, w, h, 18); ctx.stroke();
    }
    function menuItem(cx, y, label, selected, opts) {
      opts = opts || {};
      ctx.textAlign = "center";
      if (selected) {
        ctx.fillStyle = C.gold; rr(ctx, cx - 210, y - 24, 420, 40, 10); ctx.fill();
        ctx.fillStyle = "#fffdf4";
      } else {
        ctx.fillStyle = opts.disabled ? C.faint : C.ink;
      }
      ctx.font = F.h2;
      ctx.fillText(label, cx, y + 5);
    }

    /* ---------- title ---------- */
    ui.drawTitle = function () {
      var cx = VW / 2;
      // lantern glow behind title
      var g = ctx.createRadialGradient(cx, 168, 10, cx, 168, 300);
      g.addColorStop(0, "rgba(255,220,140,0.55)"); g.addColorStop(1, "rgba(255,220,140,0)");
      ctx.fillStyle = g; ctx.fillRect(cx - 300, 0, VW, 340);
      ctx.textAlign = "center";
      ctx.font = F.title; ctx.fillStyle = "#3a2c1c";
      ctx.fillText("LANTERNVALE", cx, 168);
      ctx.font = F.bodySerif; ctx.fillStyle = C.dim;
      ctx.fillText("No enemies. No clock. Just the walk.", cx, 202);
      var has = hasSave();
      var items = ["Begin a New Walk", has ? "Continue Your Walk" : "Continue (no saved walk)", "How to Play", "Settings"];
      for (var i = 0; i < items.length; i++)
        menuItem(cx, 296 + i * 54, items[i], ui.menuIdx === i, { disabled: i === 1 && !has });
      // footer: controls hint + seed + VN
      ctx.font = F.small; ctx.fillStyle = C.dim;
      ctx.fillText("WASD / arrows to walk · SPACE to talk & light · J journal · C camera", cx, VH - 56);
      ctx.font = F.tiny; ctx.fillStyle = C.faint;
      ctx.fillText("a quiet walking game · seed & save stored on this device only", cx, VH - 36);
      ctx.fillText("VN", cx, VH - 16);
    };

    /* ---------- seed entry ---------- */
    ui.drawSeed = function () {
      menuPanel(VW / 2 - 250, 170, 500, 250);
      ctx.textAlign = "center";
      ctx.font = F.h1; ctx.fillStyle = C.ink;
      ctx.fillText("Name your walk", VW / 2, 226);
      ctx.font = F.body; ctx.fillStyle = C.dim;
      ctx.fillText("A word or two — the same name grows", VW / 2, 258);
      ctx.fillText("the same valley. Leave blank for a new one.", VW / 2, 282);
      // seed box
      ctx.fillStyle = C.cream; rr(ctx, VW / 2 - 180, 306, 360, 48, 8); ctx.fill();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(ctx, VW / 2 - 180, 306, 360, 48, 8); ctx.stroke();
      ctx.font = F.mono; ctx.fillStyle = C.ink;
      var shown = ui.seedStr + (Math.floor(ui.t * 2) % 2 ? "▌" : " ");
      ctx.fillText(shown || " ", VW / 2, 338);
      ctx.font = F.small; ctx.fillStyle = C.dim;
      ctx.fillText("letters & numbers only · ENTER to set out · ESC to go back", VW / 2, 392);
    };

    /* ---------- how to play (3 pages) ---------- */
    var HOWTO = [
      { title: "Walking the Vale",
        lines: [
          "You are Wren, an apprentice mapmaker. Five signal",
          "towers have gone dark across the valley. Walk to each",
          "one, and light its beacon.",
          "",
          "WASD or ARROW KEYS ... walk      SPACE / ENTER ... talk, read, light",
          "J ........................... journal      C .................. camera",
          "ESC / P ................. pause        M .................. mute",
          "",
          "There are no enemies, no timers, and no way to lose.",
          "The journey is the game."
        ] },
      { title: "Your Journal & Camera",
        lines: [
          "Press J to open your travel journal. It holds:",
          "  · a hand-drawn map that fills itself in as you wander",
          "  · a compendium: 12 flora, 8 fauna, 6 echoes, 10 vistas",
          "  · your photographs — pin your favorite views",
          "",
          "Some things only appear at certain times: rain swells",
          "the river, night wakes the deep-light blooms, dawn fog",
          "hides far landmarks. The valley notices when you do."
        ] },
      { title: "Towers, Light & Kindness",
        lines: [
          "Five villagers each have a small ask. Helping them",
          "raises your KINDNESS — and kindness is remembered",
          "when your story ends.",
          "",
          "Three tools open new ground:",
          "  · WADERS .............. cross the swollen river fords",
          "  · CLIMBING KIT ........ take the cliff paths",
          "  · STORM-LANTERN ... walk the unlit deep hollow",
          "",
          "Your compass shows your heading — never your",
          "destination. Follow the long way. It's kinder."
        ] }
    ];
    ui.drawHowto = function () {
      var p = HOWTO[ui.howtoPage];
      menuPanel(110, 90, VW - 220, 440);
      ctx.textAlign = "center";
      ctx.font = F.h1; ctx.fillStyle = C.gold;
      ctx.fillText(p.title, VW / 2, 150);
      ctx.font = F.body; ctx.fillStyle = C.ink;
      var y = 196;
      for (var i = 0; i < p.lines.length; i++, y += 26) ctx.fillText(p.lines[i], VW / 2, y);
      // page dots
      for (var d = 0; d < 3; d++) {
        ctx.fillStyle = d === ui.howtoPage ? C.gold : C.faint;
        ctx.beginPath(); ctx.arc(VW / 2 - 24 + d * 24, 500, d === ui.howtoPage ? 7 : 5, 0, 7); ctx.fill();
      }
      ctx.font = F.small; ctx.fillStyle = C.dim;
      ctx.fillText("◀ A/D to turn pages · ESC to go back ▶", VW / 2, 528);
    };

    /* ---------- settings ---------- */
    ui.drawSettings = function () {
      menuPanel(VW / 2 - 260, 130, 520, 340);
      ctx.textAlign = "center";
      ctx.font = F.h1; ctx.fillStyle = C.ink;
      ctx.fillText("Settings", VW / 2, 188);
      var rows = [
        ["Text speed", { slow: "Slow", normal: "Normal", fast: "Fast" }[ui.settings.textSpeed], "how fast words appear"],
        ["Screen shake", ui.settings.shake ? "ON" : "OFF", "gentle camera sway"],
        ["Sound", ui.settings.mute ? "MUTED" : "ON", "M toggles anywhere"],
        ["Voice narration", ui.settings.narration ? "ON" : "OFF", "spoken story beats"]
      ];
      for (var i = 0; i < rows.length; i++) {
        var y = 244 + i * 52, sel = ui.setIdx === i;
        if (sel) { ctx.fillStyle = "rgba(185,126,30,0.18)"; rr(ctx, VW / 2 - 220, y - 26, 440, 42, 10); ctx.fill(); }
        ctx.textAlign = "left"; ctx.font = F.h2; ctx.fillStyle = sel ? C.gold : C.ink;
        ctx.fillText(rows[i][0], VW / 2 - 205, y + 6);
        ctx.textAlign = "right"; ctx.font = F.body;
        ctx.fillText("◀  " + rows[i][1] + "  ▶", VW / 2 + 205, y + 6);
        ctx.textAlign = "left"; ctx.font = F.tiny; ctx.fillStyle = C.faint;
        ctx.fillText(rows[i][2], VW / 2 - 205, y + 22);
      }
      ctx.textAlign = "center"; ctx.font = F.small; ctx.fillStyle = C.dim;
      ctx.fillText("↑↓ choose · ←→ change · ESC saves & goes back", VW / 2, 452);
    };

    /* ---------- pause ---------- */
    ui.drawPause = function () {
      ctx.fillStyle = ui.isNight ? "rgba(10,12,30,0.62)" : "rgba(40,26,12,0.55)";
      ctx.fillRect(0, 0, VW, VH);
      menuPanel(VW / 2 - 220, 130, 440, 380);
      ctx.textAlign = "center";
      ctx.font = F.titleSmall; ctx.fillStyle = C.ink;
      ctx.fillText("Rest a while", VW / 2, 190);
      ctx.font = F.bodySerif; ctx.fillStyle = C.dim;
      ctx.fillText("the valley will keep", VW / 2, 218);
      var items = ui._pauseItems();
      for (var i = 0; i < items.length; i++) menuItem(VW / 2, 276 + i * 48, items[i], ui.menuIdx === i);
    };

    /* ---------- HUD (minimal: compass, time+weather, towers, journal buttons) ---------- */
    ui.drawHUD = function (snap) {
      var night = ui.isNight;
      // top bar
      ctx.fillStyle = night ? C.nightPanel : "rgba(253,246,232,0.88)";
      ctx.fillRect(0, 0, VW, L.topBarH);
      ctx.strokeStyle = C.panelEdge; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, L.topBarH); ctx.lineTo(VW, L.topBarH); ctx.stroke();
      var ink = night ? "#eef" : C.ink;
      ctx.font = F.hud; ctx.fillStyle = ink; ctx.textAlign = "left";
      // compass: heading rose (heading only — never points at a target)
      var hd = snap.compassHeading != null ? snap.compassHeading : 0;
      ctx.save();
      ctx.translate(30, L.topBarH / 2); ctx.rotate(hd);
      ctx.strokeStyle = night ? "#eef" : C.gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.stroke();
      ctx.fillStyle = C.lantern;
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(4, 0); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = ink; ctx.font = F.tiny; ctx.textAlign = "center";
      ctx.fillText("COMPASS", 30, L.topBarH - 6);
      // time + weather
      var dayT = snap.dayT != null ? snap.dayT : 0.35;
      var wicon = { clear: "☀", fog: "≈", rain: "☂", stormglow: "✦" }[snap.weather] || "☀";
      ctx.font = F.hud; ctx.textAlign = "left"; ctx.fillStyle = ink;
      ctx.fillText(phaseOf(dayT) + " · " + fmtClock(dayT) + "  " + wicon + " " + (snap.weather || "clear"), 58, 27);
      // beacons lit: five tower glyphs
      var lit = snap.towersLit != null ? snap.towersLit : 0, total = snap.towersTotal || 5;
      ctx.textAlign = "right"; ctx.font = F.small; ctx.fillStyle = ink;
      ctx.fillText("BEACONS", VW - 310, 27);
      for (var i = 0; i < total; i++) {
        var tx = VW - 228 + i * 26;
        if (i < lit) {
          ctx.fillStyle = C.gold;
          ctx.beginPath(); ctx.arc(tx, 22, 7, 0, 7); ctx.fill();
          ctx.fillStyle = "rgba(255,236,170," + (0.5 + 0.4 * Math.sin(ui.t * 3 + i)) + ")";
          ctx.beginPath(); ctx.arc(tx, 22, 11, 0, 7); ctx.fill();
        } else {
          ctx.strokeStyle = night ? "#889" : C.faint; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(tx, 22, 7, 0, 7); ctx.stroke();
        }
      }
      // quick buttons (keyboard hints; touch zones mirrored in ui.tap)
      ctx.font = F.hud; ctx.fillStyle = ink; ctx.textAlign = "center";
      if (ui.touchMode) {
        // visible touch buttons for the tap zones in ui.tap()
        var by = L.topBarH / 2;
        ctx.strokeStyle = night ? "#889" : C.panelEdge; ctx.lineWidth = 2;
        ctx.fillStyle = night ? "#ccd" : C.ink; ctx.font = "bold 13px system-ui, sans-serif";
        function tbtn(x, glyph, label) {
          ctx.beginPath(); ctx.arc(x, by, 15, 0, 7); ctx.stroke();
          ctx.fillText(glyph, x, by + 5);
          ctx.font = "10px system-ui, sans-serif"; ctx.fillText(label, x, L.topBarH - 5);
          ctx.font = "bold 13px system-ui, sans-serif";
        }
        tbtn(VW - 96, "❚❚", "pause");
        tbtn(VW - 196, "◉", "photo");
        tbtn(VW - 276, "✎", "journal");
      } else {
        ctx.fillText("[J] Journal", VW - 96, 27);
      }
      // seed, tiny
      ctx.font = F.tiny; ctx.fillStyle = night ? "#99a" : C.faint;
      ctx.textAlign = "left"; ctx.fillText("seed " + (snap.seed || "—"), L.hudPad, VH - 8);
      ctx.textAlign = "right"; ctx.fillText("VN", VW - L.hudPad, VH - 8);
      // kindness heart (shown once >0; label, not color alone)
      if (snap.kindness > 0) {
        ctx.fillStyle = night ? "#eef" : C.lantern; ctx.font = F.small; ctx.textAlign = "right";
        ctx.fillText("♥ kindness " + snap.kindness + "/5", VW - 300, VH - 8);
      }
      // banner
      if (ui.banner) {
        var a = clamp(ui.banner.t, 0, 1);
        ctx.globalAlpha = a;
        ctx.textAlign = "center";
        ctx.font = F.h1; ctx.fillStyle = night ? "#fff" : C.ink;
        ctx.fillText(ui.banner.text, VW / 2, 130);
        if (ui.banner.sub) { ctx.font = F.bodySerif; ctx.fillStyle = night ? "#ccd" : C.dim; ctx.fillText(ui.banner.sub, VW / 2, 160); }
        ctx.globalAlpha = 1;
      }
      // touch controls
      if (ui.touchMode) ui.drawTouch();
    };

    ui.drawTouch = function () {
      var d = L.dpad, a = L.action;
      ctx.globalAlpha = 0.5;
      // d-pad
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 2.2, 0, 7); ctx.stroke();
      ctx.font = F.h2; ctx.fillStyle = C.ink; ctx.textAlign = "center";
      ctx.fillText("▲", d.x, d.y - d.r - 6);
      ctx.fillText("▼", d.x, d.y + d.r + 20);
      ctx.fillText("◀", d.x - d.r - 22, d.y + 6);
      ctx.fillText("▶", d.x + d.r + 14, d.y + 6);
      // action
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 7); ctx.stroke();
      ctx.fillText("✦", a.x, a.y + 8);
      ctx.globalAlpha = 1;
    };

    /* ---------- tutorial hint bar (bottom) ---------- */
    ui.drawTutorial = function () {
      if (!ui.tut.active) return;
      var b = ui.tut.active;
      ctx.fillStyle = ui.isNight ? "rgba(24,27,52,0.94)" : C.panel;
      rr(ctx, VW / 2 - 330, VH - L.hintH - 44, 660, 76, 14); ctx.fill();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 2;
      rr(ctx, VW / 2 - 330, VH - L.hintH - 44, 660, 76, 14); ctx.stroke();
      ctx.textAlign = "center";
      ctx.font = F.h2; ctx.fillStyle = ui.isNight ? "#ffe9b0" : C.gold;
      ctx.fillText("✦ " + b.title + " ✦", VW / 2, VH - L.hintH - 16);
      ctx.font = F.small; ctx.fillStyle = ui.isNight ? "#eef" : C.ink;
      var lines = wrap(ctx, b.text, 620);
      for (var i = 0; i < Math.min(2, lines.length); i++)
        ctx.fillText(lines[i], VW / 2, VH - L.hintH + 6 + i * 18);
    };

    /* ---------- dialogue ---------- */
    ui.drawDialogue = function () {
      var d = ui.dlg; if (!d) return;
      var w = VW - 120;
      // measure first so the box can grow to fit long bodies + all choices
      ctx.font = F.body;
      var shown0 = d.text.slice(0, Math.floor(d.shown));
      var mLines = wrap(ctx, shown0, w - 60);
      var bodyN = Math.min(4, mLines.length);
      var choiceN = (d.choices && d.shown >= d.text.length) ? d.choices.length : 0;
      var needH = 44 + bodyN * 26 + choiceN * 24 + 26;
      var h = Math.max(L.dlgH, Math.min(needH, VH - 150));
      var x = 60, y = VH - h - 20;
      ctx.fillStyle = ui.isNight ? C.nightPanel : C.panel;
      rr(ctx, x, y, w, h, 14); ctx.fill();
      ctx.strokeStyle = C.panelEdge; ctx.lineWidth = 2;
      rr(ctx, x, y, w, h, 14); ctx.stroke();
      // speaker tab
      ctx.font = F.h2; ctx.textAlign = "left";
      var sw = ctx.measureText(d.speaker).width + 40;
      ctx.fillStyle = C.gold; rr(ctx, x + 18, y - 30, sw, 36, 10); ctx.fill();
      ctx.fillStyle = "#fffdf4"; ctx.fillText(d.speaker, x + 38, y - 4);
      // body (typewriter)
      ctx.font = F.body; ctx.fillStyle = ui.isNight ? "#eef" : C.ink;
      var shown = d.text.slice(0, Math.floor(d.shown));
      var lines = wrap(ctx, shown, w - 60);
      var maxBody = Math.min(bodyN, Math.floor((h - 44 - choiceN * 24 - 10) / 26));
      for (var i = 0; i < Math.min(maxBody, lines.length); i++) ctx.fillText(lines[i], x + 30, y + 44 + i * 26);
      // choices (all of them — the box grew to fit)
      if (d.choices && d.shown >= d.text.length) {
        for (var c = 0; c < d.choices.length; c++) {
          var cy = y + 44 + maxBody * 26 + c * 24;
          if (cy > y + h - 12) break;
          ctx.font = F.body; ctx.textAlign = "left";
          ctx.fillStyle = c === d.sel ? C.gold : (ui.isNight ? "#cdd" : C.dim);
          ctx.fillText((c === d.sel ? "▶ " : "   ") + (c + 1) + ". " + d.choices[c], x + 30, cy);
        }
      } else {
        ctx.font = F.tiny; ctx.fillStyle = ui.isNight ? "#99a" : C.faint; ctx.textAlign = "right";
        ctx.fillText(d.shown < d.text.length ? "SPACE ▸" : "SPACE ▸ continue", x + w - 24, y + h - 14);
      }
    };

    /* ---------- journal ---------- */
    ui.drawJournal = function (snap) {
      ctx.fillStyle = ui.isNight ? "rgba(10,12,30,0.72)" : "rgba(40,26,12,0.55)";
      ctx.fillRect(0, 0, VW, VH);
      var jx = 90, jy = 100, jw = VW - 180, jh = VH - 190;
      var night = ui.isNight;
      ctx.fillStyle = night ? C.nightPanel : C.panel;
      rr(ctx, jx, jy, jw, jh, 16); ctx.fill();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3; rr(ctx, jx, jy, jw, jh, 16); ctx.stroke();
      ctx.textAlign = "center";
      ctx.font = F.titleSmall; ctx.fillStyle = night ? "#ffe9b0" : C.ink;
      ctx.fillText("Wren's Journal", VW / 2, jy + 46);
      // tabs
      var tabs = L.journalTabs, tw = (jw - 40) / tabs.length;
      for (var i = 0; i < tabs.length; i++) {
        var tx = jx + 20 + i * tw;
        if (i === ui.journalTab) {
          ctx.fillStyle = C.gold; rr(ctx, tx, jy + 62, tw - 6, 34, 8); ctx.fill();
          ctx.fillStyle = "#fffdf4";
        } else ctx.fillStyle = night ? "#cdd" : C.dim;
        ctx.font = F.h2; ctx.fillText(tabs[i], tx + (tw - 6) / 2, jy + 86);
      }
      ui._drawJournalTab(snap, jx + 30, jy + 116, jw - 60, jh - 140, night);
      ctx.font = F.small; ctx.fillStyle = night ? "#99a" : C.faint;
      ctx.fillText("A/D or ◀ ▶ tabs · W/S scroll · J or ESC to close", VW / 2, jy + jh - 14);
      // visible touch close button (top-right)
      ctx.fillStyle = night ? "rgba(20,22,44,0.85)" : "rgba(255,253,244,0.9)";
      ctx.beginPath(); ctx.arc(VW - 50, 34, 20, 0, 7); ctx.fill();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(VW - 50, 34, 20, 0, 7); ctx.stroke();
      ctx.fillStyle = night ? "#ffe9b0" : C.ink; ctx.font = F.h2; ctx.textAlign = "center";
      ctx.fillText("×", VW - 50, 42); ctx.textAlign = "left";
    };
    ui._drawJournalTab = function (snap, x, y, w, h, night) {
      var ink = night ? "#eef" : C.ink, dim = night ? "#99a" : C.dim;
      var tab = L.journalTabs[ui.journalTab];
      var j = snap.journal || {};
      ctx.textAlign = "left"; ctx.font = F.body;
      if (tab === "Map") {
        var regions = j.regions || [];
        ctx.fillStyle = dim; ctx.font = F.small;
        ctx.fillText("The map draws itself as you wander.", x, y);
        for (var i = 0; i < regions.length; i++) {
          var ry = y + 36 + i * 34;
          ctx.font = F.body; ctx.fillStyle = regions[i].visited ? ink : dim;
          ctx.fillText((regions[i].lit ? "◆ " : "◇ ") + regions[i].name, x + 10, ry);
          if (!regions[i].visited) ctx.fillText("— uncharted", x + 260, ry);
        }
      } else if (tab === "Photos") {
        var ps = ui.photos;
        ctx.fillStyle = dim; ctx.font = F.small;
        ctx.fillText(ps.length ? "Pin your favorite views (C to snap a photo)." : "No photographs yet. Press C to open the camera.", x, y);
        for (var p = 0; p < Math.min(4, ps.length); p++) {
          var px = x + p * ((w - 30) / 4), pw = (w - 30) / 4 - 10;
          try {
            var img = ui._photoImg(ps[p].url);
            if (img) ctx.drawImage(img, px, y + 14, pw, pw * 0.66);
          } catch (e) {}
          ctx.strokeStyle = C.panelEdge; ctx.strokeRect(px, y + 14, pw, pw * 0.66);
          ctx.fillStyle = ink; ctx.font = F.tiny;
          var cap = wrap(ctx, ps[p].caption || ps[p].label || "a quiet view", pw - 8);
          for (var li = 0; li < Math.min(2, cap.length); li++) ctx.fillText(cap[li], px + 4, y + 24 + pw * 0.66 + li * 14);
        }
      } else {
        // compendium tabs: Flora / Fauna / Echoes / Vistas (scrollable, notes wrapped)
        var key = tab.toLowerCase(), list = j[key] || [];
        var found = 0;
        for (var e = 0; e < list.length; e++) if (list[e].found) found++;
        ctx.font = F.h2; ctx.fillStyle = ink;
        ctx.fillText(found + " / " + list.length + " found", x, y);
        var scroll = ui.journalScroll || 0;
        var rowY = y + 32, drawn = 0, skipped = 0;
        for (var r = 0; r < list.length; r++) {
          var noteLines = (list[r].found && list[r].note) ? wrap(ctx, list[r].note, w - 260) : [];
          var rowH = 30 + Math.min(2, noteLines.length) * 15;
          if (skipped < scroll) { skipped++; continue; }
          var ey = rowY;
          if (ey + rowH > y + h - 6) break;
          ctx.font = F.body;
          ctx.fillStyle = list[r].found ? ink : dim;
          ctx.fillText((list[r].found ? "✦ " : "· ") + (list[r].found ? list[r].name : "something undiscovered"), x + 10, ey);
          if (noteLines.length) {
            ctx.font = F.small; ctx.fillStyle = dim;
            for (var nl = 0; nl < Math.min(2, noteLines.length); nl++) ctx.fillText(noteLines[nl], x + 240, ey + 2 + nl * 15);
            ctx.font = F.body;
          }
          rowY += rowH; drawn++;
        }
        // scroll indicators (auto-clamp runaway scroll)
        if (drawn === 0 && list.length > 0 && scroll > 0) { ui.journalScroll = scroll - 1; }
        ctx.font = F.small; ctx.fillStyle = dim; ctx.textAlign = "center";
        if (scroll > 0) ctx.fillText("▲ more above (W/S)", x + w / 2, y + 14);
        if (rowY >= y + h - 6 && skipped + drawn < list.length) ctx.fillText("▼ more below (W/S)", x + w / 2, y + h - 2);
        ctx.textAlign = "left";
      }
    };
    ui._photoImg = function (url) {
      ui._photoCache = ui._photoCache || {};
      if (!ui._photoCache[url]) {
        var im = new Image();
        im.src = url;
        ui._photoCache[url] = im;
      }
      var im2 = ui._photoCache[url];
      return (im2.complete && im2.naturalWidth) ? im2 : null;
    };

    /* ---------- photo mode ---------- */
    ui.drawPhotoMode = function (snap) {
      // The game draws its frozen frame first (behind this overlay).
      // Viewfinder frame:
      var night = ui.isNight;
      ctx.fillStyle = night ? "rgba(8,10,26,0.5)" : "rgba(20,12,6,0.42)";
      // letterbox bars
      var bh = 56;
      ctx.fillRect(0, 0, VW, bh); ctx.fillRect(0, VH - bh, VW, bh);
      // corner marks (rule-of-thirds feel)
      ctx.strokeStyle = night ? "#ffe9b0" : C.gold; ctx.lineWidth = 3;
      var m = 26, cl = 44;
      function corner(x, y, dx, dy) {
        ctx.beginPath(); ctx.moveTo(x + dx * cl, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * cl); ctx.stroke();
      }
      corner(m + 40, bh + m + 20, 1, 1); corner(VW - m - 40, bh + m + 20, -1, 1);
      corner(m + 40, VH - bh - m - 20, 1, -1); corner(VW - m - 40, VH - bh - m - 20, -1, -1);
      // top bar: zoom + hint
      ctx.textAlign = "center"; ctx.font = F.hud; ctx.fillStyle = "#fff";
      ctx.fillText("📷  zoom " + ui.photo.zoom.toFixed(1) + "×   ·   +/- zoom · WASD pan · SPACE to snap · ESC to leave", VW / 2, 36);
      // visible touch close button (top-right)
      ctx.fillStyle = "rgba(20,22,30,0.7)";
      ctx.beginPath(); ctx.arc(VW - 50, 34, 20, 0, 7); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(VW - 50, 34, 20, 0, 7); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = F.h2;
      ctx.fillText("×", VW - 50, 42);
      // bottom: snap button + photo count
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(VW / 2, VH - 80, 34, 0, 7); ctx.fill();
      ctx.fillStyle = C.lantern;
      ctx.beginPath(); ctx.arc(VW / 2, VH - 80, 26, 0, 7); ctx.fill();
      ctx.fillStyle = night ? "#ccd" : C.ink; ctx.font = F.small;
      ctx.fillText(ui.photos.length + " kept", VW / 2, VH - 22);
    };

    /* ---------- ending screen ---------- */
    ui.showEnding = function (title, epilogue, stats) {
      ui.endingData = { title: title, epilogue: epilogue, stats: stats || {} };
      ui.endingPage = 0;
      ui.screen = "ending";
      ui.fadeTo = 1; ui.fade = 0;
    };
    ui.endingHasMore = function () {
      var d = ui.endingData; if (!d) return false;
      ctx.font = F.bodySerif;
      var lines = wrap(ctx, d.epilogue, 640);
      return (ui.endingPage + 1) * 9 < lines.length;
    };
    ui.drawEnding = function (snap) {
      ctx.textAlign = "center";
      var d = ui.endingData || { title: "The walk ends", epilogue: "", stats: {} };
      ctx.font = F.titleSmall; ctx.fillStyle = ui.isNight ? "#ffe9b0" : "#3a2c1c";
      ctx.fillText(d.title, VW / 2, 150);
      ctx.font = F.bodySerif; ctx.fillStyle = ui.isNight ? "#eef" : C.ink;
      var lines = wrap(ctx, d.epilogue, 640);
      var perPage = 9, page = ui.endingPage || 0;
      var start = page * perPage;
      var pageLines = lines.slice(start, start + perPage);
      for (var i = 0; i < pageLines.length; i++) ctx.fillText(pageLines[i], VW / 2, 210 + i * 28);
      var lastPage = start + perPage >= lines.length;
      if (!lastPage) {
        // more to read — stats + end card wait for the final page
        ctx.font = F.small; ctx.fillStyle = ui.isNight ? "#99a" : C.faint;
        ctx.fillText("SPACE ▸ to keep reading", VW / 2, VH - 60);
        return;
      }
      // stats (pinned on-screen)
      var sy = Math.min(210 + pageLines.length * 28 + 40, VH - 190);
      ctx.font = F.hud; ctx.fillStyle = ui.isNight ? "#ccd" : C.dim;
      var s = d.stats;
      ctx.fillText("beacons " + (s.beacons != null ? s.beacons : "—") + "/5    ·    compendium " +
        (s.compendium != null ? s.compendium : "—") + "%    ·    kindness " +
        (s.kindness != null ? s.kindness : "—") + "/5    ·    seed " + (s.seed || "—"), VW / 2, sy);
      // end card (standing order: like, comment, subscribe, share — fresh bridge line)
      ctx.font = F.body; ctx.fillStyle = ui.isNight ? "#eef" : C.ink;
      ctx.fillText("If the vale felt like home, tell the innkeeper — er, the internet:", VW / 2, sy + 60);
      ctx.font = F.h2; ctx.fillStyle = C.gold;
      ctx.fillText("like · comment · subscribe · share", VW / 2, sy + 92);
      ctx.font = F.small; ctx.fillStyle = ui.isNight ? "#99a" : C.faint;
      ctx.fillText("press ENTER to return to the title", VW / 2, VH - 60);
      ctx.fillText("VN", VW / 2, VH - 30);
    };

    return ui;
  }

  /* ---------- exports ---------- */
  var LUI = {
    create: create,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    hasSave: hasSave,
    COLORS: C, FONTS: F, LAYOUT: L,
    VW: VW, VH: VH,
    KEYS: [
      ["WASD / Arrows", "walk"], ["Space / Enter", "talk · read · light · confirm"],
      ["J", "journal"], ["C", "camera"], ["Tab", "journal"], ["Esc / P", "pause"],
      ["M", "mute"], ["1-9", "dialogue choices"], ["+/-", "camera zoom"]
    ]
  };
  if (typeof window !== "undefined") window.LUI = LUI;
  if (typeof module !== "undefined" && module.exports) module.exports = LUI;
})();
