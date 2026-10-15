# EMBERDEEP — Sprite Manifest

All in-game sprites are **original pixel art defined as code** in
`js/sprites.js` (string pixel-maps, 16×16 for actors/tiles, 24×24 for
mini-bosses, 32×32 for the final boss). No external assets, nothing ripped,
nothing AI-generated at sprite scale — every pixel placed by hand in the map
definitions, which also guarantees a consistent palette and crisp rendering
with `imageSmoothingEnabled = false`.

## Actors (16×16)
| Sprite | Description |
|---|---|
| `player` | Ash: hooded figure in a terracotta cloak, lantern in hand |
| `npc` | Old Maren: grey cloak, walking staff |
| `rat` | Gloomrat: grey blob-rat with ears and tail |
| `imp` | Cinderimp: small red horned demon |
| `knight` | Hollow Knight: blue-grey armor, glowing eyes |
| `slime` / `slime_small` | Mire Slime: green blob (splits on death) |
| `wisp` | Wisp: purple flame spirit |
| `spitter` | Spitter: stationary thorned plant turret |

## Bosses
| Sprite | Size | Description |
|---|---|---|
| `boss_matriarch` | 24×24 | Gloom Matriarch: giant brood-rat, red eyes |
| `boss_archon` | 24×24 | Cinder Archon: horned fire lord |
| `boss_warden` | 24×24 | Hollow Warden: caped knight-captain |
| `boss_king` | 32×32 | The Hollow King: crowned skeletal king, purple shroud |

## Tiles & objects (16×16, drawn at 2× = 32px)
`floor0`, `floor1` (two speckle variants), `wall`, `stairs`, `chest`,
`heart`, `potion_heal`, `potion_bomb`, `sword` (weapon pickup),
`charm` (amulet pickup), `ember` (goal crystal).

## Other art sources
- **Cover art** (`cover/`): AI-generated pixel-art illustration via the media
  pipeline (original composition, no text), resized to itch.io's 630×500.
- **Screenshots** (`screenshots/`): captured from the real running game via
  headless Chromium + puppeteer-core (title, combat, boss). Genuine gameplay.
- **Audio:** all SFX synthesized with WebAudio oscillators/noise (`js/audio.js`).
  No audio files.
