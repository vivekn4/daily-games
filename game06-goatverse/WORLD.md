# WORLD.md — GOATVERSE: Hall of Legends

World Designer deliverable · game-design-team · 2026-10-15/16. Map data: `data/world.json` (loadable: vanilla JS `fetch('data/world.json')`). Preview: `map_preview.png`.

## 1. Design intent

The hub is a **home, not a menu** (brief pillar 2): a compact Pokémon-GBA-style town where eight themed districts ring the **Plaza of Eight Pillars**. Every district is built from its GOAT's real public history: Rosario's Grandoli pitch, Shivaji Park's nets, the Columbia Gym, a Kowloon dojo, a Basel lawn club, Cypress fairways, Compton's cracked courts, and Mount Paozu. The Hall is fading — pillars stay dim until their life is completed, and each relit pillar visibly changes the hub (§8). Exploration is open from minute one; only the *life portals* (one conversation each) and the two sealed doors (Tournament Gate, Vault stairs) are gated. Anti-soft-lock: every map is flood-fill verified reachable from spawn (§14); retries are always free.

## 2. Maps

| Map | Size (tiles) | Size (px @16) | Purpose |
| --- | --- | --- | --- |
| hub — Hall of Legends | 60 x 44 | 960 x 704 | Main town: plaza + 8 districts |
| underring — The Under-Ring Tunnels | 18 x 12 | 288 x 192 | Ali hidden mission (Bicycle Bell) |
| moonpool — Moon Pool Cavern | 16 x 12 | 256 x 192 | Goku hidden mission (Split Staff) |
| vault — The Archivist's Vault | 20 x 14 | 320 x 224 | 8 memento pedestals + Ninth Pillar (secret 9th scene) |
| arena — Tournament of Legends Arena | 26 x 18 | 416 x 288 | 8 trial stations, opens at 8 pillars |

## 3. ASCII map overview (generated from the real tile data — proof)

```
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
T........,...;..........,..............;..,................T
T...,....".........;,.....BBBBBBBB"T.......................T
T..BBBB.BBBB.BBBB.T.,.,L..B"..".TB..L........N..,..."......T
T..B..B.B..B.B..B....."...B...",.B,....,.,..AAAAAA..AAAAAA.T
T,.BDBB.BDBB.B..B......;..BBBDBBBB..........AAAAAA..AAAAAA.T
T...........,BDBB........"....*N....,.......AAAAAA..AAAAAA.T
T............FFFF"..,..N."........"".,.,..T.AAAAAA..AAAAAA.T
T........"....^*F,"....CCCCC...CCCCC..;,,...AAAAAA..AAAAAA.T
T............FFFF......FFPFF.."FFPFFT...,;.L.............L.T
T..,,,,,,,,,T....."....FFPFF...FFPFF.....,.....aaaaaaa"""".T
T..N,,,,,,,N.""N"."....CCCCC...CCCCC....."..,..aaaaaaa""N".T
T..N,,,P,,,N."b""PP..,."....".....,."......PP..aaaaaaa"b"".T
T..,,,,,,,,,."""".PPP......".PP..."......PPP...aaaaaaa"""".T
T.,...........,...".PP.......PPN......N,PP............,....T
T.........."...."..,.PP.N....PP........PP.......,..........T
T......."...,.........PPP....PD......PPP.;.................T
T.....L..;........,.....PPpppppppppLPP..;....,.............T
T..BBBBBB..,.............pppppOppppp..."...,GNGGGGGGGGGGG..T
T..B....B.FKKKF..........ppOpppppOpp....."..G*GGGGGGggggG.,T
T..B....BTKKPKK.;........pppppppbppp........GGSSGGGGggNgG..T
T..BBDBBB.KKPKK..PPPPPNPPPppppffppppPPNPPPPPGGSSGGGGggggG.,T
T..FFFFFFTFKKKF........PPpOpppffppOpPP......GGGGGGGGGGGGG..T
T;.F^;.....,,.;..........ppppppppppp...;....GGGGGGGGGGGGG..T
T..FFFFFF.SSSSSSS........pppbppppp*p.....,.,GGGGGSSSGGGGG..T
T....X....SSNSSSS....,...ppOpppppOpp.....,..GGGGGSSSGGGGG".T
T"..T.....SSSSSSS;.......pppppOppppp...,....BDBGGGGGGGGGG..T
T...T.....SSSSSSS.,..,..PPpppppppppLPP.,...,BBB..;.........T
T...,..............,..PPP,...PP......PPP..........;....,..,T
T.."..............,..PN...,..PPN...,..NPP......;...........T
T.................".PP.......PP..,.,....PP..,..."........,.T
T...BBBBBB.BBB....PPP....,.......BBB....;PPPF.FFTFF.F.BBBB.T
T...B....B"BDB...PP.....L........BDBT......PF.FF*FF;F.BBBB.T
T.,.B....B.FFF............,.......,.T...,...F.FFcFFcF.,N...T
T...BBDBBB..*F..."....MMMMMRR.....MMMMM...."....cccc.......T
T...dddddd.FFF""......MMMMMRN...T.MMMMM,......".cccc.,.....T
T.",dNddNd...W++W.....MMMMMRR.....MMMMM........;cccc.......T
T...dddddd.,.WWWW...,.MMMMMT.~~...MMMMM........,cccc....N..T
T.PLPPPPPPPPPPPLN.,...MMMMM..~~;..MMMMM....T....cccc..,b...T
T.PPPPPPPPPPPPPPP.....MMMMM..~~...MMMMM....."...cccc"..,...T
T...............;.....MMMMM+WWWW+.MMMMM...".,..........,.,.T
T,........"."..."...,.MMMMM.WWWW..MMMMM...;................T
T........,..........,.MMMMM.......MMMMM...,........,.....;.T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
```

Sub-maps (to scale):

```
underring 18x12
BBBBBBBBBBBBBBBBBB
B....BBBBBBBB....B
B.^..BBBBBBBB....B
B....BBBBBBBB....B
B............BBBBB
B..............BBB
B.............BBBB
B....BBBBBBBB....B
B....BBBWWBBB..N.B
B....BBBWWBBB..*.B
B....BBBBBBBB....B
BBBBBBBBBBBBBBBBBB

moonpool 16x12
MMMMMMMMMMMMMMMM
M..............M
M.R.....X....R.M
M.......*......M
M....WWW.WW....M
M....WWW.WW....M
M....~~W.WW....M
M....WWW.WW....M
M......+++.....M
M.R..........R.M
M.......^......M
MMMMMMMMMMMMMMMM

vault 20x14
BBBBBBBBBBBBBBBBBBBB
BLppppppppppppppppLB
BppppppppppppppppppB
BppppppppppppppppppB
BpppppppppfppppppppB
BpppppppppOppppppppB
BppppppppppppppppppB
BppppppppppppppppppB
BppppppppppppppppppB
BppNpNpNpNpNpNpNpNpB
BppppppppppppppppppB
BppppppppppppppppppB
BLpppppppp^pppppppLB
BBBBBBBBBBBBBBBBBBBB

arena 26x18
TTTTTTTTTTTTTTTTTTTTTTTTTT
TppppppppppppppppppppppppT
TppppppppppppXpppppppppppT
TppLppXppppppppppppXppLppT
TppppppppppffffppppppppppT
TppppppppppffffppppppppppT
TppppppppppppppppppppppppT
TpppppppppKKKKKKpppppppppT
TpppXpppppKKKKKKpppppXpppT
TpppppppppKKKKKKpppppppppT
TpppppppppKKKKKKpppppppppT
TppppppppppppppppppppppppT
TppppppppppppppppppppppppT
TpppppXppppppppppppXpppppT
TppLpppppppppXppppppppLppT
TppppppppppppppppppppppppT
TppppppppppppDpppppppppppT
TTTTTTTTTTTTTTTTTTTTTTTTTT

```

## 4. Districts

| District | Rect (x,y,w,h) | Theme / signature features |
| --- | --- | --- |
| Rosario Quarter (Messi) | [1, 1, 17, 15] | Argentine barrio: Grandoli pitch, napkin cafe, Celia's garden |
| Basel Lawn Club (Federer) | [22, 1, 38, 13] | Swiss alpine club: grass courts, clubhouse, trophy cabinet |
| Compton Courts (Serena) | [42, 1, 58, 15] | Public courts: cracked asphalt, Macci academy sign, memorial garden |
| Cypress Links (Tiger) | [42, 16, 58, 28] | Golf course: fairway, bunkers, 18th green, Navy tee marker |
| Bandra Nets (Sachin) | [42, 29, 58, 42] | Mumbai maidan: cricket oval, practice nets, Desert Storm mural |
| Mount Paozu (Goku) | [22, 30, 38, 42] | Training mountain: waterfall, hut, pure-heart stone, hidden cavern |
| Kowloon Dojo (Bruce) | [1, 29, 17, 42] | Hong Kong street + dojo: training yard, Be Water pond, storage shed |
| Louisville Gym (Ali) | [1, 16, 17, 28] | Gym + desert ground: outdoor ring, torch plinth, Schwinn memorial |

The **Plaza of Eight Pillars** (rect [25, 17, 35, 27]) is the hub heart: the Fountain of Beginnings, the eight pillars in a ring, the sealed Tournament Gate to the north, the hidden Vault stairs, and signposts pointing at all eight districts.

## 5. Tile legend

| Tile | Name | Walkable |
| --- | --- | --- |
| `.` | grass | yes |
| `,` | grass tuft | yes |
| `"` | flowers | yes |
| `;` | tall grass | yes |
| `T` | tree | no |
| `R` | rock | no |
| `M` | mountain | no |
| `P` | dirt path | yes |
| `p` | plaza stone | yes |
| `W` | water | no |
| `~` | waterfall | no |
| `B` | building wall | no |
| `D` | door / gate | yes |
| `F` | fence | no |
| `#` | hedge | no |
| `f` | fountain | no |
| `O` | pillar | no |
| `S` | sand | yes |
| `G` | fairway | yes |
| `g` | putting green | yes |
| `C` | tennis court | yes |
| `c` | cricket pitch | yes |
| `K` | ring mat | yes |
| `d` | dojo floor | yes |
| `A` | asphalt court | yes |
| `a` | cracked asphalt | yes |
| `L` | lamppost | no |
| `+` | bridge | yes |
| `*` | sparkle point | yes |
| `N` | signpost | no |
| `b` | bench | no |
| `^` | stairs | yes |
| `X` | statue/plinth | no |

## 6. Points of interest

| ID | Name | XY | Type | Text |
| --- | --- | --- | --- | --- |
| fountain | Fountain of Beginnings | (30,21) | landmark | Eight pillars. Eight lives. One visitor. |
| sign_messi | Signpost | (24,15) | sign | Rosario Quarter <- |
| sign_federer | Signpost | (31,14) | sign | Basel Lawn Club ^ |
| sign_serena | Signpost | (38,14) | sign | Compton Courts -> |
| sign_tiger | Signpost | (38,21) | sign | Cypress Links -> |
| sign_sachin | Signpost | (38,29) | sign | Bandra Nets -> |
| sign_goku | Signpost | (31,29) | sign | Mount Paozu v |
| sign_bruce | Signpost | (22,29) | sign | Kowloon Dojo <- |
| sign_ali | Signpost | (22,21) | sign | Louisville Gym <- |
| celia_garden | Celia's Garden | (15,11) | memorial | For Celia - who pointed at the sky. |
| sabr_lane | SABR training lane | (23,7) | landmark | Sneak Attack By Roger: charge the second serve. |
| macci_sign | Rick Macci Academy | (45,3) | sign | Rick Macci Tennis Academy - champions made here. |
| yetunde_garden | Yetunde's Garden | (56,11) | memorial | For Yetunde - forever family. |
| navy_tee | Navy Course tee marker | (45,18) | landmark | Where Earl kept score. |
| flag_18 | 18th green flagstick | (54,20) | landmark | Sunday red. One putt. |
| desertstorm_mural | Desert Storm mural | (55,33) | landmark | Sharjah, April 1998 - 143 and 134. Two days. One legend. |
| father_bench | Ramesh's bench | (56,37) | memorial | For Ramesh - the first guide. |
| pureheart_stone | Pure-heart stone | (28,35) | landmark | Only the pure of heart may pass. |
| bewater_plaque | Be Water plaque | (16,38) | sign | Be water, my friend. |
| torch_plinth | Olympic torch plinth | (5,25) | landmark | Rome 1960 - gold at eighteen. |
| schwinn_rack | Schwinn memorial | (12,25) | memorial | Columbia Auditorium, October 1954 - it started with a stolen bicycle. |
| trophy_cabinet | Trophy cabinet | (31,6) | landmark | Twenty majors. One loose panel. |
| grandoli_pitch | Grandoli pitch | (7,11) | landmark | The Machine of '87 played here. |
| tournament_gate | Tournament Gate | (30,16) | gate | Sealed. The eight pillars must burn first. |
| pillar_federer | Pillar of Roger Federer | (30,18) | pillar | The pillar of Roger Federer - dim, waiting. |
| pillar_serena | Pillar of Serena Williams | (33,19) | pillar | The pillar of Serena Williams - dim, waiting. |
| pillar_tiger | Pillar of Tiger Woods | (34,22) | pillar | The pillar of Tiger Woods - dim, waiting. |
| pillar_sachin | Pillar of Sachin Tendulkar | (33,25) | pillar | The pillar of Sachin Tendulkar - dim, waiting. |
| pillar_goku | Pillar of Goku | (30,26) | pillar | The pillar of Goku - dim, waiting. |
| pillar_bruce | Pillar of Bruce Lee | (27,25) | pillar | The pillar of Bruce Lee - dim, waiting. |
| pillar_ali | Pillar of Muhammad Ali | (26,22) | pillar | The pillar of Muhammad Ali - dim, waiting. |
| pillar_messi | Pillar of Lionel Messi | (27,19) | pillar | The pillar of Lionel Messi - dim, waiting. |
| cafe_rincon | Café El Rincón | (14,8) | landmark | Café El Rincón's fenced yard - where a sporting director signed a boy on a napkin. |
| library_pavilion | The Hall Library | (34,24) | landmark | The Hall Library - Sachin's shelves. Sports section, second shelf. |
| food_stall | Goku's food stall | (30,32) | landmark | The mountain food stall - the reigning eating champion trains here too. |

Moon Pool Cavern:

| ID | Name | XY | Type | Text |
| --- | --- | --- | --- | --- |
| paozu_shrine | The Paozu shrine | (8,2) | landmark | The Paozu shrine - Gramps' staff rests here. |

The Vault holds the **Ninth Pillar** POI (10,5): *"For the visitor who lived them all."*

## 7. NPCs

| ID | Name | XY | Role | Patrol |
| --- | --- | --- | --- | --- |
| goat_messi | Lionel Messi | (7,7) | goat | - |
| goat_federer | Roger Federer | (29,7) | goat | - |
| goat_serena | Serena Williams | (50,9) | goat | - |
| goat_tiger | Tiger Woods | (50,22) | goat | - |
| goat_sachin | Sachin Tendulkar | (49,36) | goat | - |
| goat_goku | Goku | (31,33) | goat | - |
| goat_bruce | Bruce Lee | (6,36) | goat | - |
| goat_ali | Muhammad Ali | (12,20) | goat | - |
| keeper_messi | Senor Gomez, kit man | (12,7) | keeper | - |
| keeper_federer | Herr Keller, groundskeeper | (25,7) | keeper | - |
| keeper_serena | Coach Dee | (46,9) | keeper | - |
| keeper_tiger | Caddie Joe | (48,22) | keeper | - |
| keeper_sachin | Raju, groundskeeper | (46,34) | keeper | - |
| keeper_goku | Old Fisher | (29,35) | keeper | - |
| keeper_bruce | Ah Fai, student | (7,36) | keeper | - |
| keeper_ali | Keeper Sam | (6,23) | keeper | - |
| kid_messi | Rosario kid | (5,10) | ambient | [3, 10, 9, 13] |
| fan_messi | Traveling fan | (10,12) | ambient | [8, 11, 12, 13] |
| ballkid_fed | Ball kid | (33,10) | ambient | [31, 8, 35, 11] |
| fan_fed | Tennis fan | (24,11) | ambient | [23, 8, 27, 11] |
| kid_serena1 | Court kid | (45,6) | ambient | [44, 4, 49, 8] |
| kid_serena2 | Court kid | (55,6) | ambient | [52, 4, 57, 8] |
| junior_tiger | Junior golfer | (52,24) | ambient | [49, 22, 55, 26] |
| fan_tiger | Golf fan | (46,25) | ambient | [44, 23, 48, 26] |
| kid_sachin1 | Gully kid | (45,37) | ambient | [43, 35, 47, 40] |
| kid_sachin2 | Gully kid | (53,35) | ambient | [52, 33, 56, 38] |
| villager_goku | Villager | (33,34) | ambient | [31, 32, 35, 36] |
| sparkid_goku | Sparring kid | (30,32) | ambient | [28, 31, 32, 34] |
| student_bruce | Dojo student | (5,35) | ambient | [4, 35, 9, 37] |
| tea_bruce | Tea vendor | (10,38) | ambient | - |
| sparkid_ali1 | Gym kid | (11,21) | ambient | [10, 19, 14, 22] |
| sparkid_ali2 | Gym kid | (13,21) | ambient | [10, 19, 14, 22] |
| archivist | The Archivist | (30,24) | archivist | [26, 18, 34, 26] |

Roles: `goat` = the legend (life-portal intro + hidden-mission hint 1 for their memento); `keeper` = district memory-keeper (hidden-mission rumor, hint 1, logged to journal); `archivist` = the wandering Archivist in the plaza (hint 2 for every mission); `ambient` = flavor chatter, seeded lines. Givers for the 16 side missions are drawn from this cast (§10).

## 8. Hub evolution — one completed life = one lit pillar + district change

Per-pillar changes (data: `hub_evolution` in world.json):

- **Messi's pillar lit:**
  - String lights appear across Rosario Quarter (lamp tiles lit at dusk).
  - Two kid NPCs spawn in the plaza kicking a ball.
  - Cafe El Rincon gains a 'napkin framed on the wall' POI.
- **Sachin's pillar lit:**
  - Bunting strung across Bandra Nets; 'Sachin, Sachin' chant ambience near the oval.
  - Firework sparkles over the cricket oval at dusk.
  - Mural wall plaque text updates: '...and the wait was worth it.'
- **Ali's pillar lit:**
  - Olympic torch plinth lights with an eternal flame VFX.
  - Gym kids chant 'Ali, bomaye!' on approach.
  - Desert training ground gains a second ring (sparring).
- **Bruce's pillar lit:**
  - Dojo lanterns lit along the Hong Kong street.
  - Be Water pond gains koi sparkles; plaque glows.
  - Training dummies replaced by a live sparring partner NPC.
- **Federer's pillar lit:**
  - Clubhouse flower boxes bloom (flower tiles added).
  - Ball kids rally on the grass courts (ambient animation).
  - Trophy cabinet plaque: '20. The gentleman's game, perfected.'
- **Tiger's pillar lit:**
  - Sunday-red flag on the 18th green; flagstick glows.
  - Pro shop hut opens: vendor NPC sells palette-swap costumes.
  - Fist-pump statue POI added near the green.
- **Serena's pillar lit:**
  - Court three's chalk lines repainted in gold.
  - Yetunde's garden blooms; new bench dialogue.
  - Catsuit tribute banner at the Macci academy sign.
- **Goku's pillar lit:**
  - Waterfall glows at dusk; pure-heart stone pulses.
  - A drifting cloud (Nimbus homage, original art) circles the peak.
  - Training hut gains a weighted-gear rack POI.

Hub phases (presentation direction for the Screen Designer / Music Supervisor, per STORY.md §1):
- **Phase 0 — Fading (0 pillars):** grey-blue grade, quiet music, legends restless.
- **Phase 1 — Stirring (1–3 pillars):** color returns in patches; new NPC lines; legends start showing up to watch your challenges.
- **Phase 2 — Burning (4–7 pillars):** the town feels alive — festival lights, the Archivist's plaza stall gains wares, legends spar and laugh.
- **Phase 3 — Blaze (8 pillars):** the Tournament of Legends opens; the sky itself changes.

## 9. Hidden missions (8) + childhood mementos — fair-hinting design

**Fair-hinting rules (secrets are discoverable, never impossible):**
1. A mission activates only after talking to its GOAT once (`met_<goat>`), so the player knows whose memory they are chasing.
2. Exactly two hints per mission: hint 1 from the district memory-keeper (logged to the Rumors journal), hint 2 from the wandering Archivist in the plaza (also logged).
3. After both hints, the sparkle point renders with a soft glow + chime when nearby (discoverable but not trivial). Interact radius = adjacent tiles; no pixel-hunting.
4. The Rumors journal always lists found hints verbatim — nothing relies on memory.
5. All 8 mementos → the Vault stairs appear in the plaza → the secret 9th scene (the Hall builds a pillar for the *player*).
6. No memento is ever locked behind the Tournament Gate or the Vault — every sparkle is reachable with 0 pillars lit (verified by flood-fill, §14).

| Mission | GOAT | Sparkle | Memento | Hint 1 (keeper) | Hint 2 (Archivist) |
| --- | --- | --- | --- | --- | --- |
| The Napkin | messi | hub (15,8) | The Napkin | Rexach signed the boy on a napkin in a little restaurant - the family kept everything from… | Some fool filed a treasure under 'miscellaneous.' The cafe's fenced yard, Rosario Quarter.… |
| The Ball-Boy Medal | federer | hub (30,6) | The Ball-Boy Medal | 1993, Swiss Indoors - a ball boy got a medal from Michael Stich himself. Roger never forgo… | A champion's first medal was not won - it was given. Clubhouse porch, Basel Lawn Club.… |
| Page One of the Plan | serena | hub (34,24) | Page One of the Plan | Richard wrote it all down - seventy-eight pages, starting at page one. Sachin keeps a copy… | A father's handwriting. Seventy-eight pages. Start at one - the library shelves by the pla… |
| Earl's Old Glove | tiger | hub (45,19) | Earl's Old Glove | Earl's old glove - he left it on the driving-range bench at the Navy tee, before dawn roun… | A glove worn soft by a father's hands - old Navy tee, Cypress Links.… |
| The One-Rupee Coin | sachin | hub (48,32) | The One-Rupee Coin | Achrekar sir put a one-rupee coin on the off-stump - bowlers who got the boy kept it. The … | A coin worth one rupee, worth a billion memories - middle stump, Bandra nets.… |
| The Cha-Cha Medal | bruce | hub (12,34) | The Cha-Cha Medal | Before Jeet Kune Do, there was the cha-cha - Hong Kong champion, 1958. Sifu kept the medal… | A dancer's medal in a fighter's dojo - check the storage shed, Kowloon.… |
| The Bicycle Bell | ali | underring (15,9) | The Bicycle Bell | Before the gloves, there was a red-and-white Schwinn. Stolen, October '54. The champ never… | The gym's cellar stairs go down further than the gym. Listen for the bell.… |
| The Split Staff | goku | moonpool (8,3) | The Split Staff | Gramps' old staff - Goku broke it training as a boy and kept it anyway. It is at the mount… | Behind the waterfall on Mount Paozu - the water hides a door.… |

Full hint text + memory flashbacks are in `data/world.json` (`hidden_missions[].hint1/hint2/memory`). Finding a memento unlocks its hidden-mission challenge (a story-flavored easy win at Bronze-tier params per CHALLENGES.md §11); completing it plays the memory scene.

## 10. Side missions (16, 2 per GOAT — hub-based, STORY.md §3)

Each side mission is given by a hub NPC and played at a fixed hub site. Unlock: talk to the GOAT once (`met_<goat>`). Sites are flood-fill verified (§14).

| # | GOAT | Mission | Giver | Site | Setup |
| --- | --- | --- | --- | --- | --- |
| S1 | messi | The Machine of '87 | kid_messi | (29,22) | A hub kid found an old youth-league ball. Keep-away in the plaza. |
| S2 | messi | Free-Kick at Dusk | keeper_messi | (28,21) | Bend one past the fountain keeper before the lights come on. |
| S3 | sachin | The Coin Challenge | kid_sachin1 | (48,33) | Achrekar's game, hub rules: a coin on the stump, the kids bowl at you. |
| S4 | sachin | Ten Straight Drives | keeper_sachin | (48,34) | Time ten perfect straight drives at the nets. |
| S5 | ali | Rhymes for the Weigh-In | keeper_ali | (12,21) | Help Ali write a prediction rhyme - pick the punchiest line of three. |
| S6 | ali | Shadowbox with the Champ | sparkid_ali1 | (13,21) | Mirror the Ali Shuffle for sixty seconds without tripping. |
| S7 | bruce | The Cha-Cha Step | goat_bruce | (7,35) | Rhythm minigame - he won a title in this, do not embarrass yourself. |
| S8 | bruce | Board Breaking | student_bruce | (6,36) | Focus meter, one strike, no hesitation. |
| S9 | federer | Ball-Boy Shift | ballkid_fed | (29,10) | Fetch drills at the hub courts - be where the ball is before it is. |
| S10 | federer | The Tweener | keeper_federer | (26,7) | Land the between-the-legs trick shot three times. |
| S11 | tiger | Sunday Red | keeper_tiger | (48,22) | His lucky red shirt has gone missing before the dawn round. Hub fetch quest. |
| S12 | tiger | The Putt That Wouldn't Drop | fan_tiger | (53,20) | Ten straight putts, wind rising. |
| S13 | serena | The Beads | kid_serena1 | (45,6) | A kid wants cornrow beads like the '99 final. Find the bead box. |
| S14 | serena | Second Serve | keeper_serena | (50,10) | Ace streak - the most feared serve in history, your hands. |
| S15 | goku | The Endless Appetite | villager_goku | (30,32) | Eating contest at the food stall. The reigning champ is Goku. Good luck. |
| S16 | goku | Catch the Old Master | sparkid_goku | (31,33) | Chase minigame - tag Goku before he finishes his noodles. |

Payoff lines per mission live in STORY.md §3. Challenge twists (time trial, perfect streak, mirror mode, coach's drill, rival rematch) per CHALLENGES.md §11.

## 11. Chapter backdrops (per-GOAT, per-chapter — for Screen/Art Director)

Full data: `chapter_backdrops` in world.json (56 entries: era, scene, palette, signature motif). Summary of signature motifs:

| GOAT | Ch1 | Ch2 | Ch3 | Ch4 | Ch5 | Ch6 | Ch7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| messi | chalk goalposts | paper napkin on a table | number 30 shirt | number 10, five beaten markers | four Ballon d'Ors | the trophy, walked past | World Cup trophy |
| sachin | one-rupee coin on the stump | debut cap, bloodied shirt (tasteful) | the straight drive | desert rose | the carried bat | raised bat: 100 | teammates' shoulders |
| ali | bicycle bell | speed bag | Olympic torch | the absent title belt | the ropes | Thrilla banner | the torch, held high (respectful) |
| bruce | cha-cha trophy | wooden dummy | the signed rules paper | Kato mask | nunchaku | yellow jumpsuit | 'Be Water' plaque |
| federer | ball-boy medal | the temper jar | the first trophy | tweener silhouette | 9–7 in the fifth | the larger racket head | the twentieth trophy |
| tiger | the tiny red shirt | the 12-stroke board | the Tiger Slam | the one-legged swing | the scorecard | sunrise | the red shirt on the line |
| serena | the 78-page binder | the 1999 trophy | the Serena Slam | the empty bench (respectful) | the unseeded draw sheet | the catsuit banner | evolved, not retired |
| goku | the split staff | the tournament banner | the rival's headband | the open hand | the saved village bell | the refused crown | wooden training staffs |

## 12. Fast travel / warp gating

| Warp | XY | Unlock |
| --- | --- | --- |
| Plaza Fountain | (30,24) | always |
| Rosario Quarter Gate | (18,13) | first step into the district (Pokémon Fly-style) |
| Basel Lawn Club Gate | (29,13) | first step into the district (Pokémon Fly-style) |
| Compton Courts Gate | (43,12) | first step into the district (Pokémon Fly-style) |
| Cypress Links Gate | (43,21) | first step into the district (Pokémon Fly-style) |
| Bandra Nets Gate | (43,32) | first step into the district (Pokémon Fly-style) |
| Mount Paozu Gate | (29,30) | first step into the district (Pokémon Fly-style) |
| Kowloon Dojo Gate | (17,32) | first step into the district (Pokémon Fly-style) |
| Louisville Gym Gate | (17,21) | first step into the district (Pokémon Fly-style) |
| Tournament Arena Gate | (13,16) arena | pillars_lit == 8 |
| Archivist's Vault stairs | (32,23) hub (hidden) | mementos == 8 |

Doors are all two-way; secret-area exits are never locked. Pause menu → Warp lists unlocked nodes only.

## 13. Gating summary (for the Game Designer)

**Save flags:** met_<goat> (talk to GOAT once), life_<goat>_complete, visited_<zone> (first step into district rect), pillars_lit (0-8), mementos (0-8)

- All 8 districts walkable from game start - exploration is never gated.
- Life portals require met_<goat> only (one conversation).
- Story NEVER gates behind medals or golds (per brief).
- District warp unlocks on visited_<zone> (Pokemon Fly-style).
- Tournament Gate requires pillars_lit == 8.
- Vault stairs (hidden) require mementos == 8.
- Secret-area exits are always open; retry is always free.

Life portals (story handoff, `to_map: "story"`):


| Portal | XY | Requires |
| --- | --- | --- |
| Messi's life | (7,11) | met_messi |
| Federer's life | (29,5) | met_federer |
| Serena's life | (46,6) | met_serena |
| Tiger's life | (53,20) | met_tiger |
| Sachin's life | (50,36) | met_sachin |
| Goku's life | (34,32) | met_goku |
| Bruce's life | (6,34) | met_bruce |
| Ali's life | (13,20) | met_ali |

Sealed doors:

| Door | XY | Requires |
| --- | --- | --- |
| Tournament Gate | (30,16) | pillars_lit == 8 |
| Vault stairs (hidden) | (32,23) | mementos == 8 |

## 14. Art Director coordination — tile → GBA palette guidance

Tiles are ORIGINAL (never Nintendo rips). Suggested FireRed/LeafGreen-style palette per tile code (16-bit, saturated, dark outlines on sprites):


| Tiles | Palette note |
| --- | --- |
| `.` `,` `;` | Grass: clean bright green base (#56A34A-ish); tufts darker, tall grass olive |
| `"` | Flowers: pink/white/yellow clusters on grass |
| `T` `#` | Trees/hedges: deep green canopy, near-black outline, 2-tone cel |
| `P` | Dirt path: warm tan with darker edge speckles |
| `p` | Plaza stone: cool light grey-blue slabs with seams |
| `W` `~` | Water: deep blue; waterfall animated white-blue |
| `B` `D` | Buildings: warm stucco/plaster walls, terracotta roof trim; doors golden |
| `F` | Fences: dark wood |
| `O` | Pillars: pale marble — dim = grey-blue, lit = warm gold glow |
| `f` | Fountain: stone + animated water |
| `S` | Sand: pale desert yellow |
| `G` `g` | Fairway/green: two manicured greens, green has mow stripes |
| `C` | Tennis court: lawn green with white lines |
| `c` | Cricket pitch: straw/tan strip on green |
| `K` | Ring mat: canvas blue-grey with corner colors |
| `d` | Dojo floor: warm wood planks |
| `A` `a` | Asphalt: grey; cracked = darker with crack lines |
| `L` `N` `b` `X` | Props: iron lamppost, wooden sign, bench, stone plinth |
| `M` `R` | Mountain/rock: blue-grey stone, snowless |
| `+` `^` `*` | Bridge: wood; stairs: stone; sparkle: animated gold glint |

The 8 hero sprites are LOCKED (user-approved v2, `assets/sprites/<goat>/`) — use them as-is. Dialogue portraits (Character Designer) should cameo-match the locked likeness at each life portal.

## 15. Narrative reconciliation notes (for the Narrative Writer / Integrator)

The world's memento set adopts the STORY.md §4 + `js/dialogue-data.js` memento NAMES (single source of truth). Four placements were adapted so no memento is progression-locked:
- **The Napkin (Messi):** STORY.md says "Hall archive, bottom drawer" — but the only archive is the Vault, which is memento-gated (circular). Placed at **Café El Rincón's miscellaneous drawer** (15,8), Rosario Quarter. The Archivist's line *"Some fool filed a treasure under 'miscellaneous.'"* survives verbatim — the café has the drawer.
- **The Ball-Boy Medal (Federer):** STORY.md says "under a seat in the hub arena" — the arena is pillar-gated (would lock a memento behind all 8 lives). Placed in the **clubhouse trophy cabinet, loose panel** (30,6), Basel Lawn Club.
- **Page One of the Plan (Serena):** STORY.md says "library sports section" — no library existed. Added **The Hall Library** (Sachin's shelves, plaza pavilion at 34,24); sparkle is the tennis manual on the sports shelf.
- **Earl's Old Glove (Tiger):** STORY.md says "driving-range bench, dawn only" — kept at the Navy-tee bench (45,19) but **always available** (dawn-only would punish players without a day/night clock; the dawn flavor stays in the memory text).
- **The Bicycle Bell (Ali):** the lost-and-found crate was moved down the gym's cellar stairs years ago — sparkle stays in the Under-Ring Tunnels (15,9).
- **The Cha-Cha Medal (Bruce):** the dojo storage shed has the curtain (12,34); hint-giver is Ah Fai the student (no band leader exists in the hub).
- **The Split Staff (Goku):** at the Paozu shrine behind the waterfall (moonpool 8,3); added the shrine plinth POI (8,2).
- **The One-Rupee Coin (Sachin):** unchanged — off-stump at the nets (48,32), exactly as written.

Action for Narrative Writer: patch STORY.md §4 spot/hint-source lines to match the above (one line each); `js/dialogue-data.js` memento `spot` fields likewise. No story beats change.

## 16. Validation report (generated by `world_validate.py`, deterministic)

- Every tile character is in the legend, across all 5 maps; all row lengths match.
- Hub flood-fill from spawn (29,31): every POI (or an adjacent tile for blocked POIs), every NPC, every warp, every door, all 6 hub sparkles, and all 16 side-mission sites reachable.
- Sub-map flood-fills: underring / moonpool / vault / arena — all doors, sparkles, POIs, and arena trial stations reachable from each map's entry.
- Door destinations: every `to_x/to_y` lands on a walkable tile in-bounds (fixed: moonpool exit previously landed on a waterfall tile; underring return now lands exactly on the gym cellar stairs).
- Counts: 8 pillars, 8 hidden missions, 8 unique mementos, 16 side missions (all givers valid NPCs, all sites walkable + reachable), 33 NPCs, 9 district warps + arena/vault gates, 56 chapter backdrops.
- `VALIDATION: PASS` — zero issues.

## 17. Files for downstream roles

- `data/world.json` — the loadable world: `legend`, `maps` (tiles/zones/pois/npcs/warps/doors/secrets/pillars/stations/spawn), `hidden_missions`, `side_missions`, `chapter_backdrops`, `hub_evolution`, `gating`.
- `map_preview.png` — color preview render (local only, not for GitHub).
- Suggested `?scene=` hooks for QA screenshots: `?scene=title`, `?scene=hub`, `?scene=vault`, `?scene=arena`, `?scene=underring`, `?scene=moonpool`.

---

*World Designer sign-off: map data is deterministic, flood-fill verified, reconciled with STORY.md/dialogue-data.js, and ready for the Developer, Game Designer, Narrative Writer, Character Designer (portrait cameo spots at each life portal), Screen Designer (chapter backdrops §11), Music Supervisor (hub phases §8), and Art Director (§14).*