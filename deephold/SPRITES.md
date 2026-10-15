# SPRITES.md — Deephold asset provenance

Every visual asset in this game, its source, author, and license.
Rule: code-drawn original art first; external assets only from approved
sources (Kenney CC0, OpenGameArt CC0/CC-BY, CraftPix free). Nothing here
violates that rule.

## Code-drawn original pixel art (by Squirt, for this game — no license needed)
`assets/art.js` — 100% original, drawn as pixel maps for DEEPHOLD:

| Asset | Sprites | Notes |
|---|---|---|
| Tower families (6) | `tower_{harpoon,flak,tesla,sonar,mining,sealer}_t{1,2,3}{A,B}` — 36 total | 16×16 top-down; tier accents stamped in code (t2 armor corners, t3 branch motifs) |
| Enemy families (5) | `enemy_{drifter,mauler,spitter,lurker,crab}_f{0..2}` (+ `_elite` gold-outline variants) — 30 total | 16×16 top-down swimmers, 3-frame undulation (crab has 4 leg frames) |
| Bosses (3) | `boss_{maw,dredge,heart}_f{0..2}` — 9 total | 32×32: The Maw (ring-jaw), The Dredge (drill leviathan), Heart of the Trench (vent colossus) |
| Rig structures | `hull_0/1`, `core_f0/1`, `moonpool`, `vent_f0/1/2`, `rov_f0/1`, `mine`, `powernode` | Hull plate tiles, Pressure Core, moon pool, thermal vents, harvest ROV, mines, power nodes |
| Projectiles | `proj_harpoon`, `proj_flak`, `proj_arc_f0/1` | |
| Backgrounds | `Art.bg(seed,w,h)` — procedural | Seeded depth-fog gradient + rock-spire silhouettes + marine snow |

VFX system `assets/vfx.js` is also original code (particles, pressure rings,
sonar sweeps, vignette, grain, glow bloom, screen shake).

## AI-generated (original for this game)
| Asset | Source | License |
|---|---|---|
| `cover.png` (630×500) | Generated via Muse media pipeline from an original prompt written for DEEPHOLD, then palette-quantized (28 colors) into the game's abyssal palette | Original work for this game; free to use commercially |

## External packs (NOT bundled — recommendation for UI/HUD)
The sprite set above covers gameplay. For menus/HUD icons, the UI/UX
designer is advised to use the Kenney packs already on disk (all CC0 1.0,
no attribution required):
- `~/workspace/game-assets/ui-pack` — buttons, panels, Kenney Future font — https://kenney.nl/assets/ui-pack
- `~/workspace/game-assets/game-icons` — HUD/tower icons — https://kenney.nl/assets/game-icons
- `~/workspace/game-assets/particle-pack` — extra particle sprites if needed — https://kenney.nl/assets/particle-pack

If any Kenney file is copied into this game dir, record the exact filename
and pack here before shipping.

## License summary
No GPL/LGPL/NC/SA assets. No ripped sprites. No hotlinking — everything is
bundled locally.
