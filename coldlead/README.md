# COLD LEAD — Night Shift Detective

Game #2 in the daily itch.io series. A procedural noir mystery-detective
game: 5 seeded nights, each one a fully solvable murder case, threaded
with the Pale Composer meta-arc and 3 endings.

## Play

Open `index.html` in any modern browser (no build step, no dependencies).
Or serve it: `python3 -m http.server 8000` → http://localhost:8000/

## Structure

```
index.html        shell
js/util.js        seeded RNG, wrap, clock
js/audio.js       original WebAudio noir SFX set
js/sprites.js     procedural portraits, scene painters, rain/grain VFX
js/casegen.js     case generator + verifyCase() logic guarantee
js/dialogue.js    interrogation exchange engine
js/game.js        campaign state machine (clock, lab, board, scoring, endings)
js/main.js        canvas boot, input, UI kit, typer, narration, menus
js/main2.js       screens + flow
test/sim.js       node autopilot: 200-seed generator sweep + solver campaign
test/play.js      CDP interactive click-through QA
test/shoot.js     CDP screenshot rig (v3: setDocumentContent injection)
screenshots/      real headless captures
```

## QA

- `node test/sim.js` — 1000 generated cases, 0 logic failures; solver wins
  all 5 nights; endings reachable; wrong-accusation and lockout paths safe.
- `node test/play.js` — real mouse-click playthrough in headless Chromium:
  menus → intro → brief → scene → sweep → interrogate → board → pin →
  pause/resume, 0 JS errors. (Needs chrome on :9222; see test/shoot.js.)
- Screenshots are genuine captures from the running game.

## Design docs

- `PLAN.md` — architecture, bugs + mitigations, UI/UX, SFX/VFX plan
- `STORY.md` — premise, 5-beat spine, character sheets, endings
- `SPRITES.md` — asset credits (100% original code-drawn)
- `itch-page.md` — itch.io listing copy
