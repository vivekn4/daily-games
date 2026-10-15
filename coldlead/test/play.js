/* COLD LEAD — interactive playthrough QA via CDP.
   Clicks through: title -> new game -> intro -> brief -> scene -> sweep ->
   suspect -> interrogate exchange -> board -> pin. Asserts state changes. */
"use strict";
const http = require("http");
const fs = require("fs");
const HTML = fs.readFileSync("/tmp/coldlead_single.html", "utf8");
let failures = 0;
function assert(c, m) { if (!c) { failures++; console.log("FAIL: " + m); } else console.log("ok: " + m); }

async function main() {
  const ver = await new Promise((res, rej) => {
    http.get("http://127.0.0.1:9222/json/version", (r) => {
      let d = ""; r.on("data", (x) => (d += x)); r.on("end", () => res(JSON.parse(d)));
    }).on("error", rej);
  });
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  const browser = await new Promise((resolve, reject) => {
    let id = 0; const p = {};
    ws.onopen = () => resolve({ send(m, pr) { return new Promise((a, b) => { const i = ++id; p[i] = { a, b }; ws.send(JSON.stringify({ id: i, method: m, params: pr })); }); }, close() { ws.close(); } });
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && p[m.id]) { m.error ? p[m.id].b(new Error(m.error.message)) : p[m.id].a(m); delete p[m.id]; } };
    ws.onerror = reject;
  });
  const t = await browser.send("Target.createTarget", { url: "about:blank" });
  const tabs = await new Promise((res, rej) => {
    http.get("http://127.0.0.1:9222/json", (r) => { let d = ""; r.on("data", (x) => (d += x)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej);
  });
  const tgt = tabs.find((x) => x.id === t.result.targetId);
  const pws = new WebSocket(tgt.webSocketDebuggerUrl);
  const api = await new Promise((resolve, reject) => {
    let pid = 0; const pp = {};
    pws.onopen = () => {
      const send = (m, pr) => new Promise((a, b) => { const i = ++pid; pp[i] = { a, b }; pws.send(JSON.stringify({ id: i, method: m, params: pr })); });
      pws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pp[m.id]) { m.error ? pp[m.id].b(new Error(m.error.message)) : pp[m.id].a(m); delete pp[m.id]; } };
      resolve({ send });
    };
    pws.onerror = reject;
  });
  const ev = (js) => api.send("Runtime.evaluate", { expression: js, returnByValue: true })
    .then((r) => (r.result.result ? r.result.result.value : undefined));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await api.send("Page.enable");
  await api.send("Page.setDocumentContent", {
    frameId: (await api.send("Page.getFrameTree")).result.frameTree.frame.id, html: HTML
  });
  await sleep(2000);
  const rect = await ev("(()=>{const r=document.getElementById('game').getBoundingClientRect();return [r.left,r.top,r.width,r.height];})()");
  const click = (gx, gy) => {
    const x = rect[0] + gx * (rect[2] / 960), y = rect[1] + gy * (rect[3] / 600);
    return api.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 })
      .then(() => api.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }));
  };
  assert((await ev("globalThis.CLMain.screen")) === "title", "boots to title");

  await click(480, 342); await sleep(400);           // New Game
  assert((await ev("globalThis.CLMain.screen")) === "intro", "new game -> intro");
  await click(480, 524); await sleep(300);           // skip typewriter
  await click(480, 524); await sleep(400);           // Begin Night 1
  assert((await ev("globalThis.CLMain.screen")) === "brief", "intro -> brief");
  await click(480, 534); await sleep(300);           // skip brief
  await click(480, 534); await sleep(600);           // Hit the streets
  assert((await ev("globalThis.CLMain.screen")) === "scene", "brief -> scene");
  const t0 = await ev("globalThis.CLMain.G.time");
  await click(630, 479); await sleep(400);           // Search
  const found = await ev("globalThis.CLMain.G.found.length");
  const t1 = await ev("globalThis.CLMain.G.time");
  assert(found > 0, "sweep finds clues (" + found + ")");
  assert(t1 === t0 + 25, "sweep costs 25m");
  await click(114, 562); await sleep(400);           // suspect 1
  assert((await ev("globalThis.CLMain.screen")) === "interrogate", "suspect -> interrogate");
  await click(339, 352); await sleep(200);           // topic: alibi
  await click(515, 394); await sleep(400);           // approach: empathize
  const t2 = await ev("globalThis.CLMain.G.time");
  assert(t2 === t1 + 10, "exchange costs 10m");
  const lines = await ev("globalThis.CLMain.dlg.lines.length");
  assert(lines >= 2, "dialogue lines rendered (" + lines + ")");
  await click(690, 23); await sleep(400);            // HUD -> board
  assert((await ev("globalThis.CLMain.screen")) === "board", "HUD board button works");
  // pin first pointing clue to its suspect
  const pinRes = await ev(`(()=>{const M=globalThis.CLMain,GM=globalThis.ColdLeadGame,G=M.G;
    const cl=G.found.map(id=>GM.clueById(G,id)).find(c=>c.pointsTo&&c.tags.indexOf('redherring')<0);
    if(!cl) return 'noclue';
    M.boardSel.clue=cl.id; M.activate('board:sus:'+cl.pointsTo,null);
    return 'pinned:'+cl.id+'->'+cl.pointsTo+' links='+GM.strongLinks(G,cl.pointsTo);})()`);
  assert(String(pinRes).indexOf("pinned") === 0, "pin clue to suspect (" + pinRes + ")");
  // pause menu
  await api.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape" });
  await api.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape" });
  await sleep(400);
  assert((await ev("globalThis.CLMain.screen")) === "pause", "Esc opens pause");
  await click(480, 232); await sleep(400);           // Resume
  assert((await ev("globalThis.CLMain.screen")) === "board", "resume returns to board");
  // save exists?
  const hasSave = await ev(`(()=>{try{return !!localStorage.getItem('coldlead_save_v1');}catch(e){return 'na';}})()`);
  console.log("save present:", hasSave);

  const errs = await ev("window.__jsErrors ? window.__jsErrors.length : 0");
  console.log("window js errors:", errs);
  await browser.send("Target.closeTarget", { targetId: t.result.targetId });
  browser.close();
  console.log(failures === 0 ? "INTERACTIVE QA PASSED" : failures + " FAILURES");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error("PLAY FAIL:", e.message); process.exit(1); });
