# COLD LEAD — Night Shift Detective (game #2, 2026-10-14)

## Concept
Procedural noir detective game. You are the night-shift detective at Grayharbor
PD. Each night (case) is procedurally generated from a seed: a victim, a cast
of suspects with motives and alibis, crime scenes full of clues, and exactly
one culprit whose guilt is logically provable. Work the case before dawn:
search scenes, interrogate suspects, run forensics, pin evidence on the
deduction board, and name the killer. A 5-night campaign builds a serial arc —
**The Pale Composer** — with 3 endings.

Genre rotation: mystery-detective (Emberdeep was roguelike dungeon RPG).

## Playtime math (honest)
5 cases × 12–18 min each (scene sweeps, interrogations, lab waits, board work,
accusation) ≈ 60–90 min per campaign. Wrong accusations, cold cases, replays on
new seeds, and chasing S-ranks push total content past 90 min. Itch page states
"a full 5-night campaign runs 60–90+ minutes".

## Architecture (vanilla canvas + JS, no build step)
```
game02-coldlead/
  index.html          shell, canvas 960x600 (scaled), ?scene= hooks
  js/util.js          mulberry32, RNG helpers, text utils
  js/audio.js         ColdLeadAudio — fresh WebAudio set (see below)
  js/sprites.js       code pixel-art: procedural suspect portraits, scenes,
                      icons, detective; noir palette
  js/casegen.js       ColdLeadGen — seeded case generator (the engine heart)
  js/dialogue.js      interrogation engine: topics × approaches, personalities
  js/game.js          state machine: campaign, night clock, scenes, board,
                      lab, accusation, endings, scoring, save
  js/main.js          boot, input (kbd+touch), menus, settings, narration
  STORY.md SPRITES.md itch-page.md README.md
  test/sim.js         node autopilot: generates cases across seeds, asserts
                      logic guarantees, plays solver strategy, checks endings
```

## Systems (the 90-minute engine)
1. **Seeded case generator** — victim / location / suspects / motives / alibis /
   clues / timeline all from mulberry32. Seed shown; same-seed replay.
   LOGIC GUARANTEE (asserted in sim): culprit has ≥2 pointing clues
   (means + broken alibi); every innocent has ≥1 exonerating fact.
2. **Night clock** — 22:00→06:00. Travel 20m, scene sweep 25m, interrogation
   30m, forensic lab 60m (queued, completes in background). Dawn = forced file.
3. **Interrogation** — topics (Alibi / Motive / Victim / Others / Secret) ×
   approaches (Press / Empathize / Bluff-with-clue). Personalities
   (cooperative, nervous, hostile, slick) change outcomes. Composure meter;
   over-press → suspect lawyers up (locked for the night). Correct bluff →
   crack (reveals secret). Wrong bluff → credibility −1 (3 = chief benches you
   for the night).
4. **Deduction board** — pin clues to suspects; links scored; accusation needs
   ≥2 strong links to one suspect. Wrong accusation → case goes cold.
5. **Forensics lab** — Dr. Venn analyzes physical clues; results arrive later,
   creating time-management tension (queue early!).
6. **Reputation & ranks** — per-case score → S/A/B/C; campaign total.
7. **Meta-arc** — composer calling card (white piano key motif) appears from
   case 2; case 5 is the trap; final choice → 3 endings.

## Story spine (STORY.md)
Grayharbor, rain. Detective (you), Captain Reyes (gruff/fair), Dr. Ilsa Venn
(forensics, dry wit), Marlow (partner, tutorial voice). 5 beats + 3 endings:
arrest / he walks / the deal. Branching dialogue in interrogations; key beats
narrated via speechSynthesis with toggle + subtitles.

## Presentation
- **SFX (all new, never from Emberdeep):** rain loop (filtered noise), distant
  thunder, typewriter tick, phone ring, walking-bass jazz loop, distant siren,
  paper shuffle, footsteps, UI blip, accusation sting, dawn bell, heartbeat.
- **Signature VFX:** rain particles + neon reflections, venetian-blind light
  shafts, film grain, typewriter text reveal, flashbulb on clue found.
- **Menus:** title (New Game / Continue / How to Play), pause (Resume / Restart
  Night / Mute / Quit), settings (text speed, screen shake, narration voice).

## Likely bugs + mitigations
| Risk | Mitigation |
|---|---|
| Generator makes culprit unprovable | Sim asserts ≥2 pointing clues + innocent exonerations on 200 seeds |
| Accusation soft-lock (can't reach 2 links) | Board shows link counts; lab + crack paths always add links; sim plays solver |
| Interrogation dead-ends (all locked) | Lockout is per-suspect, never all; scenes always yield clues |
| Time runs out with no recourse | Clock visible; warn at 04:00; dawn accusation allowed with 1 link (risky) |
| Dialogue template reads robotic | Slot-filled templates + authored per-case hooks; read-through pass |
| Canvas text overflow | wrap() helper everywhere; fixed dialogue box height with scroll |
| Save corruption | Versioned save key; try/catch + validate on load; Continue hidden if invalid |
| speechSynthesis absent | Feature-detect; toggle hidden if unavailable |
| Touch targets too small | ≥44px buttons; tap = click; layout review on screenshots |

## UI/UX thinking
- **Readability:** dark noir scenes, warm desk-lamp palette for UI; suspects as
  distinct procedural portraits; clue icons color-coded by kind.
- **HUD:** clock, credibility pips, clue count, board link count — calm, top bar.
- **Juice:** rain, neon flicker, flashbulb, typewriter, screen shake (toggle),
  sting on accusation, heartbeat under 60 min left.
- **Onboarding:** case 1 is a 4-suspect tutorial with Marlow coaching each
  mechanic; How to Play from title.
- **Endings:** final choice = 3 clear options with one-line consequences;
  ending card + campaign stats + seed + New Game / Replay seed.

## QA plan
- `node test/sim.js`: 200 seeds × case-gen logic guarantees; autopilot solver
  plays all 5 cases; asserts no exceptions, cases solvable, endings reachable.
- Headless chromium screenshots: `?scene=title|scene|interrogate|board|ending`.
- Console-error check on every screenshot run.
