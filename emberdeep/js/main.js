/* Emberdeep — main: input, rendering, HUD, overlays, boot. */
(function () {
  "use strict";
  var U = window.EmberUtil, S = window.EmberSprites, A = window.EmberAudio,
      D = window.EmberDungeon, GM = window.EmberGame;

  var VW = 960, VH = 640;
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var ui = document.getElementById("ui");
  var lightCv = document.createElement("canvas");
  lightCv.width = VW; lightCv.height = VH;
  var lctx = lightCv.getContext("2d");

  var params = new URLSearchParams(location.search);
  var seed = (parseInt(params.get("seed"), 10) >>> 0) || ((Math.random() * 1e9) | 0);
  var scene = params.get("scene") || null;

  var G = GM.create(seed);
  window.__game = G;

  // ---------------- input ----------------
  var keys = {};
  var input = { mx: 0, my: 0, attack: false, attackP: false, advP: false, healP: false, bombP: false, choice: -1 };
  var touch = { up: false, down: false, left: false, right: false, atk: false };

  function pollKeys() {
    var mx = 0, my = 0;
    if (keys.KeyA || keys.ArrowLeft || touch.left) mx -= 1;
    if (keys.KeyD || keys.ArrowRight || touch.right) mx += 1;
    if (keys.KeyW || keys.ArrowUp || touch.up) my -= 1;
    if (keys.KeyS || keys.ArrowDown || touch.down) my += 1;
    input.mx = mx; input.my = my;
    input.attack = !!(keys.Space || touch.atk);
  }

  window.addEventListener("keydown", function (e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].indexOf(e.code) >= 0) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true;
    A.unlock();
    if (e.code === "Space") { input.attackP = true; input.advP = true; }
    if (e.code === "Enter") { input.advP = true; onEnter(); }
    if (e.code === "KeyQ") input.healP = true;
    if (e.code === "KeyE") input.bombP = true;
    if (e.code === "Digit1") input.choice = 0;
    if (e.code === "Digit2") input.choice = 1;
    if (e.code === "Digit3") input.choice = 2;
    if (e.code === "KeyM") toggleMute();
    if ((e.code === "Escape" || e.code === "KeyP") && (G.state === "play" || G.state === "paused")) togglePause();
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });

  function onEnter() {
    if (G.state === "title") startGame();
    else if (G.state === "dead" || G.state === "win") newRun((Math.random() * 1e9) | 0);
  }

  // touch controls
  if ("ontouchstart" in window) {
    document.getElementById("touch").style.display = "block";
    function bind(id, down, up) {
      var el = document.getElementById(id);
      el.addEventListener("touchstart", function (e) { e.preventDefault(); A.unlock(); down(); }, { passive: false });
      el.addEventListener("touchend", function (e) { e.preventDefault(); if (up) up(); }, { passive: false });
    }
    bind("t-up", function () { touch.up = true; }, function () { touch.up = false; });
    bind("t-down", function () { touch.down = true; }, function () { touch.down = false; });
    bind("t-left", function () { touch.left = true; }, function () { touch.left = false; });
    bind("t-right", function () { touch.right = true; }, function () { touch.right = false; });
    bind("t-atk", function () { touch.atk = true; input.attackP = true; input.advP = true; }, function () { touch.atk = false; });
    bind("t-heal", function () { input.healP = true; });
    bind("t-bomb", function () { input.bombP = true; });
  }

  function toggleMute() {
    var m = A.toggleMute();
    document.getElementById("mutebtn").textContent = m ? "🔇" : "🔊";
  }
  function togglePause() {
    if (G.state === "play") { G.state = "paused"; }
    else if (G.state === "paused") { G.state = "play"; }
    renderUI(true);
  }

  // ---------------- audio events ----------------
  var AUDIO_MAP = {
    swing: "swing", hit: "hit", enemyDie: "enemyDie", hurt: "hurt",
    pickup: "pickup", heart: "heart", chest: "chest", levelup: "levelup",
    stairs: "stairs", shoot: "shoot", bossRoar: "bossRoar",
    win: "win", lose: "lose", ui: "ui", bossDown: "bossRoar"
  };
  function drainEvents() {
    for (var i = 0; i < G.events.length; i++) {
      var fn = A[AUDIO_MAP[G.events[i].t]];
      if (fn) fn();
    }
    G.events.length = 0;
  }

  // ---------------- rendering ----------------
  function drawSprite(name, x, y, scale, flip) {
    S.draw(ctx, name, x - G.cam.x, y - G.cam.y, scale || 2, flip);
  }

  function enemySprite(e) {
    if (e.kind === "boss") return e.sprite;
    if (e.type === "slime" && e.r < 10) return "slime_small";
    return e.type;
  }

  function render() {
    ctx.save();
    ctx.clearRect(0, 0, VW, VH);
    ctx.fillStyle = "#07060c";
    ctx.fillRect(0, 0, VW, VH);
    if (G.state === "title") { renderTitleBg(); ctx.restore(); return; }
    if (!G.dungeon) { ctx.restore(); return; }

    var shx = G.shake ? (Math.random() - 0.5) * G.shake : 0;
    var shy = G.shake ? (Math.random() - 0.5) * G.shake : 0;
    ctx.translate(-G.cam.x + shx, -G.cam.y + shy);

    var d = G.dungeon, T = D.TILE;
    var x0 = Math.max(0, Math.floor(G.cam.x / T) - 1), x1 = Math.min(d.W - 1, Math.ceil((G.cam.x + VW) / T) + 1);
    var y0 = Math.max(0, Math.floor(G.cam.y / T) - 1), y1 = Math.min(d.H - 1, Math.ceil((G.cam.y + VH) / T) + 1);
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
      var px = tx * T, py = ty * T;
      if (d.grid[ty * d.W + tx]) {
        drawTile((tx + ty) % 2 ? "floor1" : "floor0", px + T / 2, py + T / 2);
      } else {
        drawTile("wall", px + T / 2, py + T / 2);
      }
    }
    ctx.translate(G.cam.x - shx, G.cam.y - shy); // back to screen space for entity draw helper

    // stairs
    if (G.stairs) {
      if (G.stairs.open) {
        drawSprite("stairs", G.stairs.x, G.stairs.y, 2);
        if (Math.floor(performance.now() / 400) % 2 === 0) {
          ctx.fillStyle = "rgba(255,215,94,0.25)";
          ctx.fillRect(G.stairs.x - G.cam.x - 16, G.stairs.y - G.cam.y - 16, 32, 32);
        }
      }
    }
    // chests
    G.chests.forEach(function (c) {
      ctx.globalAlpha = c.opened ? 0.45 : 1;
      drawSprite("chest", c.x, c.y, 2);
      ctx.globalAlpha = 1;
    });
    // npc
    if (G.npc) drawSprite("npc", G.npc.x, G.npc.y + Math.sin(performance.now() / 500) * 2, 2);
    // pickups
    G.pickups.forEach(function (p) {
      var bob = Math.sin(p.t * 4 + p.bob) * 3;
      var spr = p.kind === "heart" ? "heart" : p.kind === "potion_heal" ? "potion_heal" :
        p.kind === "potion_bomb" ? "potion_bomb" : p.kind === "weapon" ? "sword" :
        p.kind === "charm" ? "charm" : "ember";
      if (p.kind === "ember") {
        ctx.fillStyle = "rgba(255,140,46," + (0.25 + 0.15 * Math.sin(p.t * 5)) + ")";
        ctx.beginPath(); ctx.arc(p.x - G.cam.x, p.y - G.cam.y + bob, 26, 0, 7); ctx.fill();
      }
      if (p.elite) {}
      drawSprite(spr, p.x, p.y + bob, 2);
    });
    // enemies
    G.enemies.forEach(function (e) {
      if (e.hp <= 0) return;
      if (e.elite) {
        ctx.strokeStyle = "rgba(255,215,94,0.8)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x - G.cam.x, e.y - G.cam.y, e.r + 6, 0, 7); ctx.stroke();
      }
      var bob = (e.type === "wisp") ? Math.sin(e.t * 6) * 4 : 0;
      drawSprite(enemySprite(e), e.x, e.y + bob, 2, e.x < G.player.x);
      if (e.flash > 0) {
        ctx.fillStyle = "rgba(255,255,255," + Math.min(0.8, e.flash * 5) + ")";
        var s = S.size(enemySprite(e));
        ctx.fillRect(e.x - G.cam.x - s.w, e.y - G.cam.y - s.h + bob, s.w * 2, s.h * 2);
      }
      if ((e.elite || e.kind === "boss" || e.maxhp > 90) && e.kind !== "boss") {
        var w = 44;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(e.x - G.cam.x - w / 2, e.y - G.cam.y - e.r - 14, w, 6);
        ctx.fillStyle = "#c0392b";
        ctx.fillRect(e.x - G.cam.x - w / 2, e.y - G.cam.y - e.r - 14, w * Math.max(0, e.hp / e.maxhp), 6);
      }
    });
    // player
    var pl = G.player;
    if (pl) {
      var pw = Math.sin(pl.walkT) * (pl.moving ? 2 : 0);
      if (pl.iframes > 0 && Math.floor(performance.now() / 90) % 2 === 0) ctx.globalAlpha = 0.45;
      drawSprite("player", pl.x, pl.y + pw, 2, pl.facing < 0);
      ctx.globalAlpha = 1;
      if (pl.swingT > 0) {
        ctx.strokeStyle = "rgba(255,215,94," + (pl.swingT / 0.18) + ")";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(pl.x - G.cam.x, pl.y - G.cam.y, WEAPONS0range(), pl.swingA - 1.1, pl.swingA + 1.1);
        ctx.stroke();
      }
    }
    // projectiles
    G.projs.forEach(function (p) {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x - G.cam.x, p.y - G.cam.y, p.r, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath(); ctx.arc(p.x - G.cam.x, p.y - G.cam.y, p.r * 0.4, 0, 7); ctx.fill();
    });
    // particles
    G.particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - G.cam.x - 2, p.y - G.cam.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;
    // floaters
    ctx.textAlign = "center"; ctx.font = "bold 15px system-ui,sans-serif";
    G.floaters.forEach(function (f) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / 1.1);
      ctx.fillStyle = "#000";
      ctx.fillText(f.text, f.x - G.cam.x + 1, f.y - G.cam.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x - G.cam.x, f.y - G.cam.y);
    });
    ctx.globalAlpha = 1;

    applyLighting();
    renderHUD();
    if (G.banner) renderBanner();
    ctx.restore();
  }

  function WEAPONS0range() { return GM.WEAPONS[G.player.weapon].range; }

  function drawTile(name, cx, cy) {
    var img = S.get(name);
    if (!img) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, cx - 16, cy - 16, 32, 32);
  }

  function renderTitleBg() {
    ctx.fillStyle = "#0b0912";
    ctx.fillRect(0, 0, VW, VH);
    // drifting embers
    var t = performance.now() / 1000;
    for (var i = 0; i < 40; i++) {
      var x = (i * 197 + t * (20 + (i % 5) * 8)) % VW;
      var y = (i * 331 - t * (14 + (i % 7) * 5)) % VH;
      if (y < 0) y += VH;
      ctx.fillStyle = "rgba(255,140,46," + (0.15 + 0.2 * ((i * 13) % 10) / 10) + ")";
      ctx.fillRect(x, y, 3, 3);
    }
  }

  function applyLighting() {
    var pl = G.player;
    lctx.clearRect(0, 0, VW, VH);
    lctx.fillStyle = "rgba(4,3,10,0.78)";
    lctx.fillRect(0, 0, VW, VH);
    lctx.globalCompositeOperation = "destination-out";
    var px = pl.x - G.cam.x, py = pl.y - G.cam.y;
    var grd = lctx.createRadialGradient(px, py, 20, px, py, pl.light);
    grd.addColorStop(0, "rgba(0,0,0,1)");
    grd.addColorStop(0.7, "rgba(0,0,0,0.85)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    lctx.fillStyle = grd;
    lctx.beginPath(); lctx.arc(px, py, pl.light, 0, 7); lctx.fill();
    lctx.globalCompositeOperation = "source-over";
    ctx.drawImage(lightCv, 0, 0);
  }

  function renderHUD() {
    var pl = G.player;
    ctx.textAlign = "left";
    // HP bar
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(14, 12, 220, 46, 10); ctx.fill();
    ctx.fillStyle = "#3d1117";
    ctx.fillRect(24, 22, 180, 12);
    ctx.fillStyle = pl.hp / pl.maxhp > 0.35 ? "#c0392b" : "#ff5b5b";
    ctx.fillRect(24, 22, 180 * Math.max(0, pl.hp / pl.maxhp), 12);
    ctx.fillStyle = "#f0e6d2"; ctx.font = "bold 12px system-ui,sans-serif";
    ctx.fillText("HP " + Math.ceil(pl.hp) + "/" + pl.maxhp + "  ·  Lv " + pl.level, 24, 50);
    // XP bar
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(14, 62, 220, 8);
    ctx.fillStyle = "#9b59b6";
    ctx.fillRect(14, 62, 220 * Math.min(1, pl.xp / pl.xpNext), 8);
    // floor + weapon + potions
    ctx.fillStyle = "#f0e6d2"; ctx.font = "13px system-ui,sans-serif";
    var wname = GM.WEAPONS[pl.weapon].name;
    ctx.fillText("Floor " + G.floor + "/10   ·   " + wname, 14, 92);
    ctx.fillText("🧪 " + pl.healPot + " (Q)    💣 " + pl.bombPot + " (E)", 14, 112);
    // seed
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(240,230,210,0.5)";
    ctx.fillText("seed " + G.seed, VW - 14, 24);
    ctx.textAlign = "left";
    // boss bar
    if (G.bossActive && G.boss && G.boss.hp > 0) {
      var bw = 420;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(VW / 2 - bw / 2, 14, bw, 20);
      ctx.fillStyle = "#7a1f16";
      ctx.fillRect(VW / 2 - bw / 2 + 2, 16, (bw - 4) * Math.max(0, G.boss.hp / G.boss.maxhp), 16);
      ctx.fillStyle = "#f0e6d2"; ctx.font = "bold 13px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(G.boss.name, VW / 2, 30);
      ctx.textAlign = "left";
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function renderBanner() {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 120, VW, 84);
    ctx.fillStyle = "#ffd75e"; ctx.font = "bold 30px Georgia,serif";
    ctx.fillText(G.banner.text, VW / 2, 156);
    ctx.fillStyle = "#f0e6d2"; ctx.font = "italic 16px Georgia,serif";
    ctx.fillText(G.banner.sub, VW / 2, 184);
    ctx.textAlign = "left";
  }

  // ---------------- DOM overlays ----------------
  var lastUI = "";
  function renderUI(force) {
    var key = G.state + "|" + (G.dialogue.length ? G.dialogue[0].text : "") + "|" + G.levelChoices.length + "|" + (G.ending ? G.ending.id : "");
    if (!force && key === lastUI) return;
    lastUI = key;
    var h = "";
    if (G.state === "title") {
      h = '<div class="panel"><h1>EMBERDEEP</h1>' +
        '<p class="tag">A tiny roguelike dungeon quest.<br>Ten floors. One ember. Three endings.</p>' +
        '<p class="ctl">WASD / arrows — move · SPACE — attack<br>Q — heal potion · E — bomb · M — mute · P — pause</p>' +
        '<button class="big" id="b-start">⚔ Begin the Descent</button>' +
        '<p class="seed">seed ' + G.seed + ' · <a href="#" id="b-reseed">new seed</a></p></div>';
    } else if (G.state === "dialogue" && G.dialogue.length) {
      var d = G.dialogue[0];
      h = '<div class="dlg"><p class="who">' + esc(d.who || "❖") + '</p><p>' + esc(d.text) + '</p>' +
        '<p class="hint">SPACE / tap — continue</p></div>';
    } else if (G.state === "levelup") {
      h = '<div class="panel"><h2>LEVEL UP — choose a gift</h2><div class="cards">';
      G.levelChoices.forEach(function (c, i) {
        h += '<button class="card" data-i="' + i + '"><b>' + (i + 1) + '. ' + esc(c.name) + '</b><span>' + esc(c.desc) + '</span></button>';
      });
      h += '</div></div>';
    } else if (G.state === "ending_choice") {
      h = '<div class="panel"><h2>THE EMBER IS YOURS</h2><p class="tag">The Hollow King is silent. The crystal pulses like a heart. What will you do?</p><div class="cards">';
      GM.ENDINGS.forEach(function (e, i) {
        h += '<button class="card" data-e="' + i + '"><b>' + (i + 1) + '. ' + esc(e.title.replace("Ending — ", "")) + '</b></button>';
      });
      h += '</div></div>';
    } else if (G.state === "win" || G.state === "dead") {
      var s = G.stats || {}, won = G.state === "win";
      h = '<div class="panel"><h1>' + (won ? "✦ " + esc(G.ending.title) + " ✦" : "YOU DIED") + '</h1>' +
        (won ? '<p class="tag">' + esc(G.ending.text) + '</p>' : '<p class="tag">The dark keeps the ember. The village keeps waiting.</p>') +
        '<p class="stats">Floor ' + s.floor + '/10 · Level ' + s.level + ' · ' + s.kills + ' kills<br>' +
        Math.round((s.timeMin || 0) * 10) / 10 + ' min · ' + esc(s.weapon || "") + '<br>seed ' + s.seed + '</p>' +
        '<button class="big" id="b-again">↻ New run</button> ' +
        '<button id="b-retry">Retry seed ' + s.seed + '</button></div>';
    } else if (G.state === "paused") {
      h = '<div class="panel"><h2>Paused</h2><p class="ctl">WASD — move · SPACE — attack · Q/E — potions</p>' +
        '<button class="big" id="b-resume">Resume</button> ' +
        '<button id="b-quit">Quit to title</button></div>';
    }
    ui.innerHTML = h;
    ui.style.display = h ? "flex" : "none";
    // wire buttons
    function on(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener("click", function (e) { e.preventDefault(); A.unlock(); A.ui(); fn(); }); }
    on("b-start", startGame);
    on("b-reseed", function () { newRun((Math.random() * 1e9) | 0); });
    on("b-again", function () { newRun((Math.random() * 1e9) | 0); });
    on("b-retry", function () { newRun(G.seed); });
    on("b-resume", togglePause);
    on("b-quit", function () { G.state = "title"; renderUI(true); });
    Array.prototype.forEach.call(ui.querySelectorAll(".card[data-i]"), function (el) {
      el.addEventListener("click", function () { GM.chooseUpgrade(G, parseInt(el.getAttribute("data-i"), 10)); renderUI(true); });
    });
    Array.prototype.forEach.call(ui.querySelectorAll(".card[data-e]"), function (el) {
      el.addEventListener("click", function () { input.choice = parseInt(el.getAttribute("data-e"), 10); });
    });
    if (G.state === "dialogue") {
      ui.addEventListener("click", advOnce);
    }
  }
  function advOnce() { input.advP = true; ui.removeEventListener("click", advOnce); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function startGame() { GM.startRun(G); renderUI(true); }
  function newRun(ns) {
    seed = ns >>> 0;
    G = GM.create(seed);
    window.__game = G;
    lastUI = "";
    if (scene) bootScene();
    else { G.state = "title"; }
    renderUI(true);
  }

  // ---------------- boot / scenes ----------------
  function bootScene() {
    // screenshot scenes: skip menus, jump straight in
    GM.setupFloor(G, 1);
    if (scene === "boss" || scene === "combat") GM.debugStage(G, scene);
    renderUI(true);
  }

  document.getElementById("mutebtn").addEventListener("click", function (e) { e.preventDefault(); A.unlock(); toggleMute(); });
  ui.addEventListener("touchstart", function () { A.unlock(); }, { passive: true });

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    pollKeys();
    try {
      GM.update(G, dt, input);
    } catch (err) {
      if (!window.__errLogged) { window.__errLogged = true; console.error("GAME ERROR", err); }
    }
    drainEvents();
    render();
    renderUI(false);
    input.attackP = false; input.advP = false; input.healP = false; input.bombP = false; input.choice = -1;
    requestAnimationFrame(frame);
  }

  if (scene) bootScene();
  renderUI(true);
  requestAnimationFrame(frame);
})();
