# COLD LEAD — Story Bible

> *"Disco Elysium's interrogation chess meets a 1940s radio noir, but the
> killer has been scoring your whole career."*

**Inspirations (idea-bank cross, per STORY_REGISTRY):** classic detective
fiction (Chandler/Hammett), the interrogation systems of *Disco Elysium* /
*LA Noire*, and the "calling card" serial-killer trope (Zodiac letters,
the Black Dahlia mythos). No dungeon crawling, no JRPG party — a clean
genre rotation from Emberdeep and Shardbound.

## Premise

**Grayharbor, present day, 11:47 PM.** You are the new **night-shift
detective** — five nights, five bodies, one clock that never stops. Each
night a fresh procedurally-built murder drops in your lap: victim, scene,
4–6 suspects, motives, alibis, one culprit. Solve it by 06:00 or the file
goes cold.

Threaded through the five nights is **the Pale Composer** — a killer who
leaves a white piano key at his scenes and has been watching *you*. Night
5, he stops watching and sits down across the table.

## The five-beat spine

1. **Hook (Night 1):** A body under the pier lights. Captain Reyes: *"I
   need a name by dawn — the right one."* You learn the loop: search,
   question, pin, accuse.
2. **Turn 1 (Night 2):** A white piano key at the scene. Marlow goes quiet:
   *"That's his. The Composer. He's never left one twice."* The nights stop
   being random.
3. **Midpoint (Night 3):** The Composer calls the precinct and asks for you
   by name. He knows about the cold case that got you transferred to nights.
   Reyes benches the Composer talk — *"We solve the body in front of us."*
4. **Turn 2 (Night 4):** A key arrives in an envelope addressed to you,
   no body attached. *"One more rehearsal, detective."* He's choosing the
   venue for the finale: he's going to kill someone you failed to save.
5. **Climax (Night 5):** The victim is connected to your old cold case.
   You solve it — and the Composer is *in the chair*, waiting. Three
   endings: arrest him, let him walk, or trade sixty seconds for the truth.

## Character sheets

- **You (the Detective):** Night shift, new to Grayharbor, transferred after
  a cold case you couldn't close. Want: a clean solve record. Need: to stop
  solving *at* people and start listening. Voice: dry, tired, precise.
  Gameplay hook: you.
- **Capt. D. Reyes:** Your boss. Want: closed cases, no headlines. Need: to
  trust a detective again after the last one burned her. Voice: clipped.
  Calls you "detective", never your name. *"Dawn doesn't negotiate."*
  Gameplay hook: briefing, ranks your work, benches you at 0 credibility.
- **Det. Ada Marlow:** Your partner on night 1, then phone backup. Want: to
  keep you alive (career-wise). Need: to admit she's scared of the Composer
  case too. Voice: warm static, gallows humor. *"I've seen rookies drown in
  shallower rain than this."* Gameplay hook: tutorializes the board.
- **Dr. Petra Venn:** Forensic pathologist. Want: evidence handled right.
  Need: sleep. Voice: precise, impatient, secretly kind. *"An hour. Don't
  call before the hour."* Gameplay hook: the lab queue.
- **The Pale Composer:** The arc villain. Want: an audience worthy of his
  "compositions". Need: to be *understood* — every key is a note in a song
  only you can hear. Voice: courteous, musical metaphors, never raises his
  voice. *"Every city is an instrument, detective. I merely tune it."*
  Gameplay hook: the meta-arc; the final interrogation.

## Procedural case content (what the generator writes)

- 6 noir locations × 3 scenes (jazz club, theater, warehouse, hotel,
  museum, night train), 6 victim/suspect roles, motive/alibi/clue/secret
  pools (~200 authored lines), personality-driven interrogation dialogue
  (~120 lines across 4 personalities × 3 approaches × 5 topics).
- **Logic guarantee:** every case verifies — culprit has ≥2 pointing clues
  (means + broken alibi), every innocent has ≥1 exonerating fact.

## Branching dialogue

Interrogation is topic × approach × personality: **Press** (fast, risky —
composure damage, lockout), **Empathize** (slow, safe — opens secrets),
**Bluff** (gamble a clue — cracks lies or costs credibility). Suspects
remember how you treat them *within a night*; secrets unlock bonus clues.

## Endings (all surfaced in-game, Night 5)

1. **ARREST HIM** — *"The music stops."* The cuffs click. Cleanest ending;
   the city sleeps. (+Composer epilogue: he smiles all the way down.)
2. **LET HIM WALK** — *"The last note."* You trade justice for the name of
   the person who ordered your old cold case buried. The Composer vanishes.
3. **60 SECONDS** — *"Encore."* You give him one minute of your undivided
   attention. He tells you everything — and you understand him, which is
   worse. (Unlocks the "He Composed You" epilogue card.)

## Narration

All story text (intro, briefings, endings) is narrated via
**speechSynthesis** with an in-game toggle (Settings → Voice narration),
plus typewriter text at 3 speeds. Dialogue lines are text-only by design
(interrogation is reading the room, not listening to it).
