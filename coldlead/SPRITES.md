# COLD LEAD — Sprite/Asset Credits

## External art (bundled locally in `assets/`, no hotlinking)

All external assets are used per their licenses, bundled inside the game
(the game is the product; raw files are not redistributed standalone).

### 1. Player detective character — "Detective" by jordyadan (CC0)
- Source: https://opengameart.org/content/detective
- Author: jordyadan · License: **CC0** (public domain, no attribution required)
- Files used: `assets/detective/det_idle.png`, `det_walk0–3.png`
  (frames sliced from `charzera.png`, 8-frame walk cycle + idle)
- Where: title screen (detective walking through the rain), brief screen
- Changes: none (used as-is, drawn with `imageSmoothingEnabled=false` for crisp pixels)

### 2. Female suspect portraits — "Woman Faceset" by Chibizilla (CC-BY 4.0)
- Source: https://opengameart.org/content/woman-faceset
- Author: Chibizilla · License: **CC-BY 4.0** (attribution required — credited here and in README)
- Files used: `assets/faces/face_f00.png` … `face_f07.png` (8 portraits, 96×96)
- Where: interrogation screen, deduction board, scene suspect row, accuse screen
  (assigned deterministically by suspect seed for female first names)
- Changes: noir grade applied at build time (grayscale → cool duotone,
  +35% contrast, −8% brightness); rim-light + frame drawn in-game

### 3. Clue icons — "16x16 Detective Items" by ARoachIFoundOnMyPillow (CC0)
- Source: https://opengameart.org/content/16x16-detective-items
- Author: ARoachIFoundOnMyPillow · License: **CC0** (public domain)
- Files used: `assets/items/*.png` (magnifying_glass, envelope, knife,
  newspaper, binoculars, bottle, coffin, bone_skull + 4 spares)
- Where: deduction-board evidence chips (mapped from clue titles)
- Changes: none

### CraftPix — license verified, downloads blocked
- CraftPix freebie license (https://craftpix.net/file-licenses/, section 2)
  was read and confirmed compatible with itch.io distribution: free assets
  may be used in unlimited personal/commercial game projects, including
  selling/distributing games with the assets; attribution appreciated but not
  required; raw source files may not be resold/redistributed standalone
  (bundling into the game is the intended use).
- **No CraftPix assets were used**: free downloads require a free CraftPix
  account (login wall, no guest download). The main agent may retry via
  browser; until then the game ships on the CC0/CC-BY art above.

## Procedural art (original, `js/sprites.js` + `js/fx.js`)

- **Male/other suspect portraits** — upgraded procedural generator (48×56
  grid, 4× the original fidelity): jaw shapes, 4 eye styles with catchlights,
  3 noses, 5 mouths, facial hair, 8 hairstyles, 6 accessories, noir lighting
  (upper-left key, cyan rim light, crushed shadows). Deterministic per seed —
  required by the seeded-case design (same seed = same faces).
- **Named characters** (Reyes, Marlow, Venn, Composer) use fixed seeds for
  consistent identity across nights.
- **Crime scenes** — 6 original painters (jazz club, theater, warehouse,
  hotel, museum, night train) + procedural texture overlays (seeded
  concrete/paper/metal noise in `js/fx.js`).
- **VFX** — rain, film grain, vignette, neon bloom, venetian-blind light
  slats, scanlines (style variants). Style A "Gritty Pixel Noir" is the
  shipped look; B "Ink & Shadow" and C "Neon Silhouette" are selectable via
  `?style=b|c` (B was the runner-up: dramatic but less readable; C rejected
  as too dark).
- **Audio** — 100% WebAudio-synthesized original SFX set (`js/audio.js`) +
  11 pre-generated human voiceover clips (`audio/vo/*.mp3`, Meta AI "Lily").

## Attribution summary (for the itch.io page / README)

- Detective character: jordyadan (CC0) — opengameart.org/content/detective
- Female portraits: Chibizilla (CC-BY 4.0) — opengameart.org/content/woman-faceset
- Item icons: ARoachIFoundOnMyPillow (CC0) — opengameart.org/content/16x16-detective-items
