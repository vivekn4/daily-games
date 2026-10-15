/* COLD LEAD — main.js (part 1): boot, canvas, input, UI kit, typer,
   narration, settings, menus. */
"use strict";
(function () {
  var U = globalThis.ColdLeadUtil;
  var AU = function () { return globalThis.ColdLeadAudio; };
  var SP = function () { return globalThis.ColdLeadSprites; };
  var GM = function () { return globalThis.ColdLeadGame; };

  var W = 960, H = 600;
  var cv = null, ctx = null;
  var screen = "title";       // title|howto|settings|intro|brief|scene|interrogate|board|result|endingChoice|ending|pause
  var pausedFrom = null;
  var G = null;               // game state
  var settings = { textSpeed: 1, shake: true, mute: false, narrate: true };
  var UI = { buttons: [], focus: 0 };
  var shakeT = 0, flashT = 0, flashMsg = "";
  var rainDrops = null, grainSeed = 7;
  var dlg = null;             // interrogation view state
  var boardSel = { clue: null };
  var accuseSel = null;
  var resultT = 0;
  var endingText = null;
  var postDraw = null;

  // ---------- boot ----------
  function boot() {
    if (typeof document === "undefined") return;
    cv = document.getElementById("game");
    ctx = cv.getContext("2d");
    loadSettings();
    rainDrops = SP().makeRainDrops(U.RNG(99), 90, W + 80);
    fit();
    window.addEventListener("resize", fit);
    cv.addEventListener("mousedown", onTap);
    cv.addEventListener("touchstart", function (e) { e.preventDefault(); onTap(e.touches[0]); }, { passive: false });
    document.addEventListener("keydown", onKey);
    var q = parseQuery();
    if (q.scene) { debugScene(q.scene); }
    requestAnimationFrame(frame);
  }

  function parseQuery() {
    var o = {};
    if (typeof location !== "undefined" && location.search) {
      location.search.slice(1).split("&").forEach(function (p) {
        var kv = p.split("="); o[kv[0]] = decodeURIComponent(kv[1] || "");
      });
    }
    return o;
  }

  function fit() {
    var s = Math.min(window.innerWidth / W, window.innerHeight / H);
    cv.style.width = (W * s) + "px"; cv.style.height = (H * s) + "px";
  }
  function toGame(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  // ---------- settings persist ----------
  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem("coldlead_settings"));
      if (s) settings = Object.assign(settings, s);
    } catch (e) {}
    AU().setMuted(settings.mute);
  }
  function storeSettings() {
    try { localStorage.setItem("coldlead_settings", JSON.stringify(settings)); } catch (e) {}
  }

  // ---------- narration (speechSynthesis, toggleable) ----------
  function narrate(text) {
    if (!settings.narrate) return;
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0; u.pitch = 0.85;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function stopNarrate() { try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch (e) {} }

  // ---------- typewriter ----------
  var typer = {
    full: "", shown: 0, acc: 0, done: false,
    start: function (t) { this.full = t; this.shown = 0; this.acc = 0; this.done = false; },
    update: function (dt) {
      if (this.done) return;
      this.acc += dt * 45 * settings.textSpeed;
      var n = Math.floor(this.acc);
      if (n > 0) {
        var prev = this.shown;
        this.shown = Math.min(this.full.length, this.shown + n);
        this.acc -= n;
        if (this.shown > prev && this.shown % 3 === 0) AU().typeTick();
      }
      if (this.shown >= this.full.length) this.done = true;
    },
    skip: function () { this.shown = this.full.length; this.done = true; },
    text: function () { return this.full.slice(0, this.shown); }
  };

  // ---------- UI kit ----------
  function clearUI() { UI.buttons = []; UI.focus = 0; if (globalThis.CLMain) globalThis.CLMain.postDraw = null; }
  function button(id, x, y, w, h, label, opts) {
    opts = opts || {};
    UI.buttons.push({ id: id, x: x, y: y, w: w, h: h, label: label, opts: opts });
  }
  function drawButtons() {
    for (var i = 0; i < UI.buttons.length; i++) {
      var b = UI.buttons[i], hov = (i === UI.focus);
      if (b.opts.ghost) continue; // invisible hit-area; painted by postDraw
      ctx.save();
      ctx.fillStyle = b.opts.disabled ? "#1a1a22" : (hov ? "#2e3a55" : "#1c2233");
      ctx.strokeStyle = b.opts.accent || (hov ? "#e8b64f" : "#4a5a7a");
      ctx.lineWidth = hov ? 2.5 : 1.5;
      roundRect(b.x, b.y, b.w, b.h, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = b.opts.disabled ? "#555" : (b.opts.color || "#d8dce8");
      ctx.font = (b.opts.fontSize || 15) + "px 'Courier New', monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var lines = U.wrap(ctx, b.label, b.w - 14);
      var lh = (b.opts.fontSize || 15) + 3;
      var sy = b.y + b.h / 2 - (lines.length - 1) * lh / 2;
      for (var l = 0; l < lines.length; l++) ctx.fillText(lines[l], b.x + b.w / 2, sy + l * lh);
      ctx.restore();
    }
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function hitButton(p) {
    for (var i = UI.buttons.length - 1; i >= 0; i--) {
      var b = UI.buttons[i];
      if (!b.opts.disabled && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b.id;
    }
    return null;
  }

  function onTap(e) {
    AU().init();
    var p = toGame(e);
    var id = hitButton(p);
    if (id) { AU().uiSelect(); globalThis.CLMain.activate(id, p); }
  }
  function onKey(e) {
    AU().init();
    var k = e.key;
    if (k === "Escape") { togglePause(); return; }
    if (k === "m" || k === "M") { toggleMute(); return; }
    if (screen === "scene" && (k === "b" || k === "B")) { goBoard(); return; }
    if (k === "ArrowRight" || k === "ArrowDown" || k === "Tab") { UI.focus = (UI.focus + 1) % Math.max(1, UI.buttons.length); AU().uiMove(); e.preventDefault(); return; }
    if (k === "ArrowLeft" || k === "ArrowUp") { UI.focus = (UI.focus - 1 + UI.buttons.length) % Math.max(1, UI.buttons.length); AU().uiMove(); e.preventDefault(); return; }
    if ((k === "Enter" || k === " ") && UI.buttons.length) {
      var b = UI.buttons[UI.focus];
      if (b && !b.opts.disabled) { AU().uiSelect(); globalThis.CLMain.activate(b.id, null); }
      e.preventDefault(); return;
    }
    var n = parseInt(k, 10);
    if (n >= 1 && n <= UI.buttons.length) {
      var bb = UI.buttons[n - 1];
      if (bb && !bb.opts.disabled) { AU().uiSelect(); globalThis.CLMain.activate(bb.id, null); }
    }
  }

  function toggleMute() {
    settings.mute = !settings.mute; storeSettings(); AU().setMuted(settings.mute);
    flash("Sound " + (settings.mute ? "OFF" : "ON"));
  }
  function flash(msg) { flashMsg = msg; flashT = 1.6; }
  function togglePause() {
    if (screen === "pause") { screen = pausedFrom || "scene"; stopNarrate(); }
    else if (["scene", "interrogate", "board"].indexOf(screen) >= 0) { pausedFrom = screen; screen = "pause"; stopNarrate(); AU().uiSelect(); }
  }

  // ---------- frame ----------
  var lastT = 0;
  function frame(t) {
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    typer.update(dt);
    if (shakeT > 0) shakeT -= dt;
    if (flashT > 0) flashT -= dt;
    ctx.save();
    if (settings.shake && shakeT > 0) ctx.translate((Math.random() - 0.5) * 8 * shakeT, (Math.random() - 0.5) * 8 * shakeT);
    draw(dt, t / 1000);
    ctx.restore();
    // flash message
    if (flashT > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, flashT);
      ctx.fillStyle = "#000"; ctx.fillRect(W / 2 - 160, 60, 320, 36);
      ctx.strokeStyle = "#e8b64f"; ctx.strokeRect(W / 2 - 160, 60, 320, 36);
      ctx.fillStyle = "#e8b64f"; ctx.font = "15px 'Courier New', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(flashMsg, W / 2, 78); ctx.restore();
    }
    requestAnimationFrame(frame);
  }

  function draw(dt, t) {
    clearUI();
    ctx.fillStyle = "#06060c"; ctx.fillRect(-20, -20, W + 40, H + 40);
    var fn = SCREENS[screen] || SCREENS.title;
    fn(dt, t);
    drawButtons();
    if (globalThis.CLMain.postDraw) { var pd = globalThis.CLMain.postDraw; globalThis.CLMain.postDraw = null; pd(); }
    // signature VFX: film grain
    SP().drawGrain(ctx, W, H, U.RNG(grainSeed + ((t * 12) | 0)));
  }

  // expose for part 2
  globalThis.CLMain = {
    W: W, H: H, get screen() { return screen; }, set screen(s) { screen = s; },
    get G() { return G; }, set G(g) { G = g; },
    get settings() { return settings; },
    get dlg() { return dlg; }, set dlg(d) { dlg = d; },
    get boardSel() { return boardSel; }, set boardSel(b) { boardSel = b; },
    get accuseSel() { return accuseSel; }, set accuseSel(a) { accuseSel = a; },
    get resultT() { return resultT; }, set resultT(v) { resultT = v; },
    get endingText() { return endingText; }, set endingText(v) { endingText = v; },
    get postDraw() { return postDraw; }, set postDraw(v) { postDraw = v; },
    get pausedFrom() { return pausedFrom; }, set pausedFrom(v) { pausedFrom = v; },
    get rainDrops() { return rainDrops; },
    boot: boot, button: button, typer: typer, narrate: narrate, stopNarrate: stopNarrate,
    flash: flash, goBoard: null, activate: null, togglePause: togglePause,
    storeSettings: storeSettings, roundRect: roundRect, clearUI: clearUI,
    SCREENS: {}
  };
  var SCREENS = globalThis.CLMain.SCREENS;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
})();
