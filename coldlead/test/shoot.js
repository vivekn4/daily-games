/* COLD LEAD — CDP screenshot rig v2: fresh Target per scene. */
"use strict";
const http = require("http");
const fs = require("fs");

const SCENES = ["title", "brief", "scene", "interrogate", "board", "endingChoice"];

function cdp() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://127.0.0.1:9222/devtools/browser");
    let id = 0;
    const pending = {};
    ws.onopen = () => resolve({
      send(method, params) {
        return new Promise((res, rej) => {
          const i = ++id;
          pending[i] = { res, rej };
          ws.send(JSON.stringify({ id: i, method, params }));
        });
      },
      close() { ws.close(); }
    });
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending[m.id]) {
        if (m.error) pending[m.id].rej(new Error(m.error.message));
        else pending[m.id].res(m);
        delete pending[m.id];
      }
    };
    ws.onerror = reject;
  });
}

function pageShot(browser, scene) {
  return new Promise((resolve, reject) => {
    browser.send("Target.createTarget", { url: "http://127.0.0.1:8901/index.html?scene=" + scene })
      .then(async (r) => {
        const targetId = r.result.targetId;
        // attach via debugger URL from /json
        await new Promise((rr) => setTimeout(rr, 1500));
        const tabs = await new Promise((res, rej) => {
          http.get("http://127.0.0.1:9222/json", (res2) => {
            let d = "";
            res2.on("data", (c) => (d += c));
            res2.on("end", () => res(JSON.parse(d)));
          }).on("error", rej);
        });
        const t = tabs.find((x) => x.id === targetId);
        if (!t) throw new Error("target not found " + scene);
        const ws = new WebSocket(t.webSocketDebuggerUrl, { maxPayload: 64 * 1024 * 1024 });
        let pid = 0; const pp = {};
        ws.onopen = async () => {
          const send = (method, params) => new Promise((res2, rej2) => {
            const i = ++pid; pp[i] = { res2, rej2 };
            ws.send(JSON.stringify({ id: i, method, params }));
          });
          ws.onmessage = (ev) => {
            const m = JSON.parse(ev.data);
            if (m.id && pp[m.id]) { pp[m.id].res2(m); delete pp[m.id]; }
          };
          try {
            await new Promise((rr) => setTimeout(rr, 6000));
            await send("Emulation.setDeviceMetricsOverride", { width: 960, height: 600, deviceScaleFactor: 1, mobile: false });
            await new Promise((rr) => setTimeout(rr, 1200));
            const shot = await send("Page.captureScreenshot", { format: "png" });
            fs.writeFileSync("screenshots/" + scene + ".png", Buffer.from(shot.result.data, "base64"));
            console.log("shot " + scene);
            ws.close();
            await browser.send("Target.closeTarget", { targetId });
            resolve();
          } catch (e) { reject(e); }
        };
        ws.onerror = reject;
      }).catch(reject);
  });
}

(async () => {
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
  for (const s of SCENES) await pageShot(browser, s);
  browser.close();
  console.log("done");
  process.exit(0);
})().catch((e) => { console.error("SHOOT FAIL:", e.message); process.exit(1); });

/* legacy helper kept for reference */
function cdp_unused() { return null; }
