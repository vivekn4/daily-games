/* COLD LEAD — CDP screenshot rig v3: injects single-file HTML via
   Page.setDocumentContent (no network -> no PNA block), drives scenes via
   Runtime.evaluate on the exposed CLMain API. */
"use strict";
const http = require("http");
const fs = require("fs");

const HTML = fs.readFileSync("/tmp/coldlead_single.html", "utf8");

const SCENES = {
  title: `M.screen='title'`,
  brief: `(()=>{M.G=GM.create(424242);GM.startNight(M.G,1);M.screen='brief';M.typer.start("Test briefing line one. Test briefing line two.");})()`,
  scene: `(()=>{M.G=GM.create(424242);GM.startNight(M.G,1);M.screen='scene';})()`,
  interrogate: `(()=>{M.G=GM.create(424242);GM.startNight(M.G,1);M.screen='interrogate';M.dlg={suspectId:M.G.case.suspects[0].id,topic:'alibi',approach:'press',lines:["You: 'Let us go over that alibi again.'",M.G.case.suspects[0].name+": 'I told you everything I know.'"],secretOpen:true};})()`,
  board: `(()=>{M.G=GM.create(424242);GM.startNight(M.G,1);M.G.case.clues.slice(0,6).forEach(cl=>{cl.found=true;M.G.found.push(cl.id);});M.screen='board';})()`,
  endingChoice: `(()=>{M.G=GM.create(424242);for(let n=1;n<=5;n++)GM.startNight(M.G,n);M.G.result={won:true,kind:'arrest',score:1000,rank:'S',timeUsed:300,accusedId:M.G.case.culpritId};M.screen='endingChoice';})()`
};

async function main() {
  const ver = await new Promise((res, rej) => {
    http.get("http://127.0.0.1:9222/json/version", (r) => {
      let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d)));
    }).on("error", rej);
  });
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  const browser = await new Promise((resolve, reject) => {
    let id = 0; const pending = {};
    ws.onopen = () => resolve({
      send(method, params) {
        return new Promise((res2, rej2) => {
          const i = ++id; pending[i] = { res2, rej2 };
          ws.send(JSON.stringify({ id: i, method, params }));
        });
      },
      close() { ws.close(); }
    });
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending[m.id]) {
        if (m.error) pending[m.id].rej2(new Error(m.error.message));
        else pending[m.id].res2(m);
        delete pending[m.id];
      }
    };
    ws.onerror = reject;
  });

  for (const [name, setupJs] of Object.entries(SCENES)) {
    const t = await browser.send("Target.createTarget", { url: "about:blank" });
    const targetId = t.result.targetId;
    const tabs = await new Promise((res, rej) => {
      http.get("http://127.0.0.1:9222/json", (r) => {
        let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d)));
      }).on("error", rej);
    });
    const tgt = tabs.find((x) => x.id === targetId);
    const pws = new WebSocket(tgt.webSocketDebuggerUrl, { maxPayload: 128 * 1024 * 1024 });
    await new Promise((res, rej) => {
      let pid = 0; const pp = {};
      pws.onopen = async () => {
        const send = (method, params) => new Promise((res2, rej2) => {
          const i = ++pid; pp[i] = { res2, rej2 };
          pws.send(JSON.stringify({ id: i, method, params }));
        });
        pws.onmessage = (ev) => {
          const m = JSON.parse(ev.data);
          if (m.id && pp[m.id]) {
            if (m.error) pp[m.id].rej2(new Error(m.error.message));
            else pp[m.id].res2(m);
            delete pp[m.id];
          }
        };
        try {
          await send("Page.enable");
          await send("Runtime.enable");
          await send("Page.setDocumentContent", { frameId: (await send("Page.getFrameTree")).result.frameTree.frame.id, html: HTML });
          await new Promise((r) => setTimeout(r, 2500));
          // console errors
          const ev = await send("Runtime.evaluate", {
            expression: `(()=>{try{const M=globalThis.CLMain,GM=globalThis.ColdLeadGame;${setupJs};return "ok:"+M.screen;}catch(e){return "ERR:"+e.message;}})()`,
            returnByValue: true, awaitPromise: false
          });
          console.log(name, "->", ev.result.result.value);
          await new Promise((r) => setTimeout(r, 2500));
          await send("Emulation.setDeviceMetricsOverride", { width: 960, height: 600, deviceScaleFactor: 1, mobile: false });
          await new Promise((r) => setTimeout(r, 800));
          const shot = await send("Page.captureScreenshot", { format: "png" });
          fs.writeFileSync("screenshots/" + name + ".png", Buffer.from(shot.result.data, "base64"));
          console.log("shot " + name);
          pws.close();
          await browser.send("Target.closeTarget", { targetId });
          res();
        } catch (e) { rej(e); }
      };
      pws.onerror = rej;
    });
  }
  browser.close();
  console.log("done");
  process.exit(0);
}
main().catch((e) => { console.error("SHOOT FAIL:", e.message); process.exit(1); });
