# COLD LEAD — Voiceover Integration Guide

Human-sounding pre-generated narration for key story beats. Voice: **Meta AI
"Lily" (avocado_v2:Lily)** — feminine, smooth, smoky — at speed 95 (deliberate
hard-boiled noir pace). Source scripts live in `audio/vo_src/*.txt`; regenerate
with:

```
/opt/hatch/bin/tts speak --voice avocado_v2:Lily --speed 95 \
  --output audio/vo/<id>.mp3 --text-stdin < audio/vo_src/<id>.txt
```

## Files

- `audio/vo/*.mp3` — 11 clips, **2.06 MB total** (budget: 8 MB)
- `js/voiceover.js` — standalone module, exposes `window.VoiceOver`
- `audio/vo_src/*.txt` — narration source scripts

## Clip list (durations)

| id | file | duration | plays when |
|---|---|---|---|
| `intro` | intro.mp3 | 34.7s | title → New Game intro |
| `night1`..`night5` | night1.mp3 … night5.mp3 | 21.8–25.7s | each night's briefing screen |
| `composer_key` | composer_key.mp3 | 20.4s | night 2: white piano key clue examined |
| `composer_confront` | composer_confront.mp3 | 23.2s | night 5: Composer sits across the table |
| `ending_dawnbringer` | ending_dawnbringer.mp3 | 23.0s | ending choice "arrest" |
| `ending_ashen` | ending_ashen.mp3 | 21.9s | ending choice "walk" |
| `ending_inkbound` | ending_inkbound.mp3 | 22.6s | ending choice "deal" (60 seconds) |

## Wiring (integrator: apply these edits)

1. **Load the module.** In `index.html`, add after the other `<script>` tags:
   `<script src="js/voiceover.js"></script>`

2. **Toggle.** In `js/main.js`, next to the existing `narrate()`:
   - call `VoiceOver.setEnabled(settings.narrate)` whenever settings load or the
     `set:narrate` button toggles (js/main2.js:117, :506). Also call
     `VoiceOver.stop()` from `M.stopNarrate()`.

3. **Intro** (js/main2.js:565): after `M.narrate(INTRO_TXT);` add
   `VoiceOver.play('intro');`

4. **Night briefs** (js/main2.js:511, :531, :573): after `M.narrate(briefText(G));`
   add `VoiceOver.play('night' + G.night);`

5. **Composer key** (clue examine, js/main2.js:624 area, clue id with title
   "A white piano key" from js/casegen.js:236): when that clue's examine text is
   shown, add `VoiceOver.play('composer_key');`

6. **Composer confrontation** (night 5 interrogation open, js/main2.js:417
   "The Composer →" / screen showing `THE PALE COMPOSER` at :427): on entering
   that screen add `VoiceOver.play('composer_confront');`

7. **Endings** (js/main2.js:539, `GM().chooseEnding(G, parts[2])`): replace or
   follow `M.narrate(ch.text)` with `VoiceOver.playEnding(parts[2]);`
   (`arrest`→dawnbringer, `walk`→ashen, `deal`→inkbound).

8. **Fallback text (optional).** `VoiceOver.setFallbackText({intro: INTRO_TXT, ...})`
   so a missing/corrupt clip degrades to speechSynthesis instead of silence.

## Behavior notes

- `play(id)` stops any current clip first — starting a new beat never overlaps.
- If narration is OFF, `play()` is a no-op (toggle respected centrally).
- All errors are swallowed internally: no console errors, ever.
- Preload on title screen via `VoiceOver.preload()` to avoid first-play lag.
- The existing typewriter text keeps running in sync — voiceover is audio-only,
  no timing coupling required.
