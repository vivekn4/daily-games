# DEEPHOLD — Story Script

## Premise
**Meridian Trench Rig** is a deep-sea thermal-energy station anchored at
3,900 meters above a trench that does not appear on any chart. You are the
new **night chief**, arriving for a 90-day rotation. Night 1, ten minutes
before shift change, the sonar goes wrong — and the abyss starts sending
things *up*.

## Characters
- **The Chief (you)** — night-shift chief engineer. Practical, dry-witted,
  the kind of person who fixes things before breakfast and argues with
  equipment. Speaks in short sentences.
- **Dr. Ilya Voss** — marine biologist, 15 years out here. Sees patterns in
  everything, usually right, always three sentences ahead of the room. The
  story's interpreter: boss "taunts" arrive as her sonar readings.
- **Foreman Adaeze Okafor** — hull foreman, built half this rig with her own
  hands. Loyal to the crew first, the company second, and the abyss not at
  all. Quietly building something in the moon pool.

## Intro crawl (in-game dialogue, wave 1 pre-survey)
> **ADA:** Chief. Welcome to Meridian. Ninety days, starting — well. Now.
>
> **CHIEF:** Shift change in ten minutes, right?
>
> **VOSS:** About the sonar — it's been reading wrong since 0200. Everything
> down there is moving *up*. As a school. As a siege.
>
> **ADA:** First wave hits the lower hull in six minutes. Your turrets,
> your call, Chief. Whatever you need welded, I'm already welding it.

## Beat 1 — waves 1–5: The signal
After wave 3, Voss pulls you to the sonar room.

> **VOSS:** Look at their eyes. Every species, same pattern — same blink,
> same interval. That's not instinct, Chief. That's a *signal*.
>
> **CHIEF:** Bioluminescence patterns. Mating call?
>
> **VOSS:** I ran it against every known cephalopod grammar. It's not a
> mating call. *(beat)* It's the same frequency in all of them. I think
> they're all repeating something they *heard*.
>
> **ADA:** Down there? What's repeating things down there?
>
> **VOSS:** I don't know yet. Keep shooting. I'll keep listening.

## Boss: The Maw (wave 10) — Voss sonar reads
- "It's enormous. It's been down there a long time. It is not attacking us — it is *climbing past* us, and we are in the way."
- "Readings spike every time it opens its jaw. The signal is *inside* it. Chief, something put that signal in there."
- "It's bleeding light. It's afraid. Nothing that big should be afraid."

## Beat 2 — waves 11–15: The warning
After wave 12, Voss decodes the pattern.

> **VOSS:** It's decoded. The pattern isn't an attack order. It's a warning
> call. The same one reef fish use when a shadow passes overhead.
>
> **CHIEF:** A warning. To who?
>
> **VOSS:** To each other. To everything below us. They are not invading the
> surface, Chief. They are *evacuating*.
>
> **ADA:** Evacuating from what?
>
> **VOSS:** ...From whatever is coming up behind them.

## Beat 3 — waves 16–20: The company goes silent
After wave 17, the uplink dies.

> **ADA:** Uplink's dead. Corporate line, the supply ship, all of it. We've
> been cut loose, Chief. Budget line item, redacted.
>
> **CHIEF:** So we're on our own with the end of the world.
>
> **ADA:** We were always on our own. The company just stopped pretending.
>
> *(Okafor starts quietly diverting power to something in the moon pool. Voss
> notices. You notice. Nobody says anything yet.)*

## Boss: The Dredge (wave 20) — Voss sonar reads
- "It's dragging the trench floor up with it — sediment, wreckage, old rig cable from before our company existed."
- "The signal is louder behind it. Much louder. Whatever the Maw was running from, the Dredge was *sent*."
- "Its armor is growing between waves. It is adapting faster than our turrets. We have to adapt faster."

## Beat 4 — waves 21–24: The moon-pool device
After wave 22, Voss confronts Okafor — in front of you.

> **VOSS:** That's not a repair rig, Adaeze. I know what that coil is. You've
> built a lure — tuned to the creatures' own signal.
>
> **ADA:** Then you know what it's for.
>
> **VOSS:** Chief, she wants to *drop it into the trench*. Broadcast the
> warning pattern at a hundred times strength. Call whatever is down there
> *up into the open water* — on her terms, on our hull.
>
> **ADA:** On my terms, yes. Because waiting down here for it is suicide and
> you know it. We lure it up, we see it, we *kill* it. That's the job. That
> has always been the job.

## Branching choice (after wave 25 — THE ALLEGIANCE)
The argument comes to a head. Both of them turn to you. The choice locks a
unique tier-3 tech for the final waves and colors the ending text.

> **VOSS:** Please. The signal resolved further last night — it's not just a
> warning anymore. It has *structure*. Coordinates. Whatever is down there
> might be trying to *talk*, and a lure is a war declaration.
>
> **ADA:** And if it's not talking, Chief? If it's just hungry? Then your
> friend's curiosity gets this crew killed. I need your answer. Now.

**Player choices:**
1. **"Voss is right. Stand down the lure."** → unlocks *Harmonic Array*
   (Sonar tech: +reveals, creatures debuffed 25% — they hesitate).
   Okafor complies, but she does not forgive you quickly.
2. **"Ada's right. Finish the lure."** → unlocks *Moon-Pool Beacon*
   (Economy tech: the lure draws extra creatures but they arrive
   pre-tagged — +50% cell yield, waves arrive faster).
   Voss goes quiet. She keeps working, but she stops telling you what she
   hears.
3. **"Nobody's touching anything until wave 30."** → unlocks *Rationed
   Pressure* (Defense tech: +20% hull repair, overcharges cool 15% faster).
   Both of them hate it. Both of them respect it.

*(Dialogue responses for each choice are in `dialogue.js` →
`branching.allegiance.choices`.)*

## Climax (wave 30): The Heart of the Trench
The final boss rises — and it is not a beast.

> **VOSS:** Chief — it's not an animal. Look at the thermal read. It's a
> *vent colossus*. A living geothermal engine, kilometers of it, and it's
> been dormant since before we had language.
>
> **ADA:** Then what woke it up?
>
> **VOSS:** *(quietly)* Our drills, Adaeze. Fifteen years of thermal boring.
> We cracked its nursery vents. Everything that climbed up here was fleeing
> *us*. The signal — the warning — it was about the rig. About what we did.

## Boss: The Heart of the Trench (wave 30, 3 phases) — Voss sonar reads
- Phase 1: "It's surfacing around the nursery vents. It's trying to seal the cracks we made. We're reading that as an attack — it's *first aid*."
- Phase 2: "It's turning toward the rig. Not the crew — the drill string. It wants the drills stopped. It doesn't know we're in the way."
- Phase 3: "The signal is resolving — it's coordinates now, clean and repeating. Chief. It's giving us a *location*. It wants to show us something down there."

## The final choice (after wave 30 — all three always available)
The Heart holds position, waiting. Your move, Chief.

1. **SEAL THE TRENCH** — Detonate the rig's demolition charges along the
   vent field. The trench collapses; the Heart sinks; the creatures scatter
   into the deep. The rig holds. The colony below starves without the vents.
2. **FEED THE HEART** — Route the Pressure Core into the trench. The colossus
   wakes as the rig's eternal engine — infinite thermal power. But the
   company will come back for a thing like this. They always come back.
3. **DESCEND** — Take Okafor's lure (finished or not), drop it over the side,
   and ride the moon-pool submersible down yourself to parley. The signal
   pattern finally resolves into coordinates. What is down there?

## Endings
- **Seal the Trench (bittersweet):** The charges go in a line down the vent
  field, and the trench closes like a held breath. The Heart sinks without a
  sound — nothing that large should sink quietly. The creatures scatter. The
  rig holds. On the sonar, Voss watches the nursery go dark, vent by vent.
  "We survived," she says. She doesn't say what it cost.
- **Feed the Heart (open-ended):** You open the Pressure Core and pour fifteen
  years of stored heat into the trench. The Heart *drinks* — and the whole
  rig lights up like a city. Infinite power. Free energy. Voss is laughing;
  Okafor is already calculating. And on the horizon, a company ship turns
  toward you, because a thing like this cannot be kept secret. It was never
  going to be kept secret.
- **Descend (mystery):** You clip the lure to the submersible and drop past
  the thermocline into water blacker than any night. The Heart moves aside
  for you — *moves aside* — and the coordinates resolve on your sonar, one
  waypoint at a time, leading down past the mapped floor. Voss's voice on
  the comm, small and far: "Chief... it's opening for you. Whatever's down
  there — it was waiting for someone to *come*."

## Death text (rig lost)
> The hull gives at sector four, then everywhere. Meridian Trench Rig goes
> dark at 3,900 meters.
>
> The trench keeps what it takes.
> *(run stats + seed; "New rotation" / "Retry seed")*

## Story flowchart
```mermaid
flowchart TD
    INTRO[Intro: night chief arrives, wave 1] --> B1[Beat 1 (w1-5): the shared signal]
    B1 --> MAW[Wave 10 boss: THE MAW]
    MAW --> B2[Beat 2 (w11-15): the pattern is a WARNING]
    B2 --> B3[Beat 3 (w16-20): company uplink dies; Okafor builds the lure]
    B3 --> DREDGE[Wave 20 boss: THE DREDGE]
    DREDGE --> B4[Beat 4 (w21-24): the lure revealed]
    B4 --> CHOICE{Wave 25: ALLEGIANCE CHOICE}
    CHOICE -->|Voss| T1[Harmonic Array tech]
    CHOICE -->|Okafor| T2[Moon-Pool Beacon tech]
    CHOICE -->|Neither| T3[Rationed Pressure tech]
    T1 --> CLIMAX
    T2 --> CLIMAX
    T3 --> CLIMAX
    CLIMAX[Wave 30 boss: HEART OF THE TRENCH - the rig caused it] --> FINAL{Final choice}
    FINAL --> E1[SEAL THE TRENCH - bittersweet]
    FINAL --> E2[FEED THE HEART - open-ended]
    FINAL --> E3[DESCEND - mystery]
```

## Registry compliance
- Premise (deep-sea industrial siege defense) ≠ Emberdeep (dying ember
  descent) / Shardbound (sunstone shard quest) / Cold Lead (serial-killer
  nights).
- Twist ("attackers" are fleeing; the rig's own drilling woke it) ≠
  Emberdeep (keeper-boss) / Shardbound (ghost-daughter) / Cold Lead (killer
  across the table).
- Archetypes (night-chief engineer, marine biologist, foreman) ≠ lone
  wanderer / guard-mage-cleric party / night-shift detective.

## Idea source log
- `~/workspace/tools/idea-feed/idea-feed.py` (idea bank): deep-sea
  survival/defense cluster surfaced repeatedly in October feeds.
- r/gameideas: recurring "tower defense with a story that changes the
  genre's grammar" threads; "enemies that are fleeing, not attacking"
  twist appeared in a highly-upvoted October post.
- Final pick: deep-sea rig siege defense + "the attackers are fleeing"
  reversal, chosen for genre rotation (no dungeon RPG / JRPG / detective
  overlap) and for the 30-wave systems spine that carries 90+ minutes.
