/* =====================================================================
 * LANTERNVALE — dialogue data (EXPANDED 2026-10-15: full mission arcs)
 * Loaded by index.html. All villager dialogue with branching choices,
 * Alda's journal pages, tower-lighting beat text, tower-4 choice,
 * tower rites, quiet moments, ending epilogues.
 *
 * Node format:
 *   { id?, speaker, text, choices:[ { text, goto, effect? } ], end?, if? }
 * Choice effect strings the engine understands (autopilot-validated):
 *   "kind+1"      — Kindness +1 (ONLY stage-1 villager quests grant this)
 *   "flag:NAME"   — set story flag NAME
 *   "gear:waders|climbingkit|stormlantern"
 *   "quest:NAME"  — mark quest NAME as offered/started (engine: active)
 * Quest completion ("done") is set by ENGINE talkTo branches — never use
 * "done:" as an effect. Conditions on nodes: node.if = "flag:NAME" /
 * "done:NAME" / "kind>=N".
 * Goto targets must resolve within the SAME node array (engine findNode
 * searches s.nodes only). New stage arrays follow the questDone pattern;
 * see MISSIONS.md for the exact talkTo wiring per stage.
 * [VO] clips live in audio/vo/ (see STORY.md). New [VO] candidates are
 * flagged in STORY.md §5 for the Voice Director.
 * Villager names (user-picked 2026-10-15): Wewake, Meera, Vipul, Dev,
 * Shivangi. Do not rename.
 * =================================================================== */

const DIALOGUE = {

/* ------------------------------- WEW AKE -------------------------------
 * Shepherd of Vale's Edge (R1). Questline: the ram (exists) -> the fence
 * line -> lambing night -> the last walk (Beat 4). Theme: steadiness;
 * the valley gives you its stories if you sit still long enough. */
wewake: {
  meet: [
    { speaker: "Wewake", text: "You're Alda's apprentice. I'd know that compass anywhere — she dropped it in the north pasture once and blamed a sheep. (Beat.) Mind the flock. They bite mapmakers.", choices: [
      { text: "\"I'm Wren. I was told the towers are broken.\"", goto: "t_towers" },
      { text: "\"Nice sheep. Are they all yours?\"", goto: "t_sheep" },
      { text: "\"I don't have time to chat.\"", goto: "t_brusque" }
    ]},
    { id: "t_towers", speaker: "Wewake", text: "Broken? Huh. First one went dark the autumn she left. Second in winter. That's not breaking, that's a schedule. But you're the mapmaker, not me.", choices: [
      { text: "\"A schedule? What do you mean?\"", goto: "t_schedule" },
      { text: "\"Never mind. How do I get up to the first tower?\"", goto: "t_towerpath" }
    ]},
    { id: "t_sheep", speaker: "Wewake", text: "Forty head. This one's Bramble, that one's Mayor — don't ask — and the big ram sulking at the back is Clover. Was. Clover's gone missing since yesterday. Probably tangled himself in the high brambles again. He's got no sense and all the confidence.", choices: [
      { text: "\"I'll help you find him.\"", goto: "t_quest", effect: "quest:wewake_ram" },
      { text: "\"Good luck with that.\"", goto: "t_luck" }
    ]},
    { id: "t_schedule", speaker: "Wewake", text: "I mean what I said. Ask Meera in the groves if you want dates — she writes everything down. She writes down what the sheep eat, too. I don't ask why anymore.", choices: [
      { text: "\"I'll head to the groves after the tower.\"", goto: "t_towerpath" }
    ]},
    { id: "t_brusque", speaker: "Wewake", text: "...Right. Well. The path to the tower's up past the high pasture. Watch the brambles. (Beat.) Come back when you've got a minute. The valley rewards people who have a minute.", effect: "flag:brusque_wewake", choices: [], end: true },
    { id: "t_luck", speaker: "Wewake", text: "Luck's got nothing to do with it. Bleating carries uphill. If you hear him, you'll know. (Beat.) Offer stands.", choices: [], end: true },
    { id: "t_quest", speaker: "Wewake", text: "Ha. Careful — he'll headbutt you out of gratitude. High pasture, follow the bleating. Bring him back and I'll show you the short way up to the tower. The real short way, not the mapmaker's short way.", choices: [], end: true },
    { id: "t_towerpath", speaker: "Wewake", text: "Up past the pasture, follow the old lamp posts — the dead ones. You'll find the tower. And Wren? If you hear bleating up there, that's Clover. Bring him home.", choices: [
      { text: "\"Who kept the tower, before?\"", goto: "t_keeper" }
    ]},

    /* --- the tower's keeper (tower 1 story) --- */
    { id: "t_keeper", speaker: "Wewake", text: "Bram kept Shepherd's Rest thirty years. Never let the lamp go out — not in storms, not in the wolf winter. When he died, the guild sent a boy with a flint and no stories. The boy did fine. But Bram... Bram said the old words every lighting.", choices: [
      { text: "\"What were the old words?\"", goto: "t_keeper2" }
    ]},
    { id: "t_keeper2", speaker: "Wewake", text: "\"For the road, for the walkers, for the ones coming home.\" That's all. Thirty years, same words. You'll say them with me at the lighting. Not optional. Traditional.", choices: [], end: true },

    /* --- ram returned --- */
    { id: "t_ramdone", if: "done:wewake_ram", speaker: "Wewake", text: "He's home. Ate half my lunch as a thank-you. You're all right, mapmaker. The short way to the tower: through the lambing gate, second stile, don't mind the nettles. I'll walk with you as far as the rope bridge later, when the time comes.", choices: [], end: true },

    /* --- STAGE 2: the fence line (offered after ram quest done) --- */
    { id: "t_fence_offer", speaker: "Wewake", text: "Storm took down three posts on the east fence line. I can set them, but tamping needs two people — one to hold plumb, one to tamp. Pip's no good at it. He leans. You free?", choices: [
      { text: "\"I'll hold the posts.\"", goto: "t_fence_accept", effect: "quest:wewake_fence" },
      { text: "\"Not today.\"", goto: "t_fence_defer" }
    ]},
    { id: "t_fence_accept", speaker: "Wewake", text: "Good. East line, past the lambing gate — three posts marked with red twine. That's my system. Hold each one straight while I tamp. You'll get muddy. That's the job, not a side effect.", choices: [], end: true },
    { id: "t_fence_defer", speaker: "Wewake", text: "Fair. Fences wait better than sheep do. East line, red twine — offer stands whenever your hands are free.", choices: [], end: true },
    { id: "t_fence_mid", speaker: "Wewake", text: "East line. Red twine. Three posts. The sheep are judging your pace, and frankly so am I.", choices: [], end: true },

    /* --- STAGE 3: lambing night (offered after fence done + tower 2 lit) --- */
    { id: "t_lamb_offer", speaker: "Wewake", text: "Wren. Dusk — the grey ewe — she's lambing tonight, and it's her first. I could use a second pair of hands. Steady hands. Yours.", choices: [
      { text: "\"I'll be there.\"", goto: "t_lamb_accept", effect: "quest:wewake_lambing" },
      { text: "\"I don't know anything about lambing.\"", goto: "t_lamb_unsure" }
    ]},
    { id: "t_lamb_unsure", speaker: "Wewake", text: "Nobody does, until they do. You hold the lantern steady and don't fuss. Ewes can smell fuss. That's the whole trade.", choices: [
      { text: "\"All right. Tonight.\"", goto: "t_lamb_accept", effect: "quest:wewake_lambing" },
      { text: "\"Not tonight.\"", goto: "t_lamb_defer" }
    ]},
    { id: "t_lamb_accept", speaker: "Wewake", text: "Tonight, then. The lambing pen, after dusk. Bring steady hands and leave your hurry at the gate.", choices: [], end: true },
    { id: "t_lamb_defer", speaker: "Wewake", text: "She'll manage. Probably. (Beat.) Lambs don't schedule, Wren. Tonight, or not.", choices: [], end: true },
    { id: "t_lamb_mid", speaker: "Wewake", text: "Tonight. The pen. Steady hands. And Wren — bring some of Dev's stew if you're passing. For after. For me, not the ewe.", choices: [], end: true },

    /* --- tower 4 reactions --- */
    { id: "t_t4_lit", if: "flag:tower4_lit", speaker: "Wewake", text: "Well. The fourth's burning. (He nods slowly.) Meera told me about the bloom. Hard choice, well chosen — or well chosen, hard choice. Either order. You can always walk back up there, you know. Nothing's finished.", choices: [], end: true },
    { id: "t_t4_dark", if: "flag:tower4_dark", speaker: "Wewake", text: "Dark, then. (A slow nod.) Alda would've... well. She did a lot of things I'd have argued with, and she was right about most of them. The bloom's still breathing. That's something.", choices: [], end: true }
  ],

  questDone: [
    { speaker: "Wren", text: "(You untangle Clover from the brambles. He headbutts your knee, hard, then follows you down like a dog.)", choices: [
      { text: "Lead Clover back to Wewake.", goto: "tq_done" }
    ]},
    { id: "tq_done", speaker: "Wewake", text: "There he is. You beautiful idiot. (He scratches Clover's ears.) Kindness suits you, Wren. Here — the lambing-gate shortcut's yours whenever. And remember this face, because when the towers are lit, I'm walking the last stretch with you.", effect: "kind+1", choices: [], end: true }
  ],

  /* --- STAGE 2 done: the whistle --- */
  fenceDone: [
    { speaker: "Wewake", text: "Straight as Alda's handwriting, every one. (He presses a carved wooden whistle into your hand.) Shepherd's whistle. Blow it when you're lonely out there — Pip'll come running. He likes you. Don't let it go to your head.", effect: "flag:whistle flag:pip_follows", choices: [
      { text: "\"Thank you, Wewake.\"", goto: "t_whistle2" }
    ]},
    { id: "t_whistle2", speaker: "Wewake", text: "Two short blasts for 'come.' One long for 'go on, then.' He knows the difference. Mostly.", choices: [], end: true }
  ],

  /* --- STAGE 3 done: the lambing (scene plays at the pen at night) --- */
  lambingDone: [
    { speaker: "Wren", text: "(The lamb comes just after midnight — grey as dusk, loud as a bell. Dusk licks it clean while Wewake laughs quietly into his sleeve.)", choices: [
      { text: "(Watch.)", goto: "t_lambdone2" }
    ]},
    { id: "t_lambdone2", speaker: "Wewake", text: "A ewe-lamb. Look at her. (He's quiet a long time.) Alda was here for a lambing, once. Thirty years back. She drew Dusk's grandmother while she waited — said the valley gives you its stories if you sit still long enough. (He unfolds a creased sketch.) Keep it. It's yours now.", effect: "flag:lambing_done flag:alda_sketch", choices: [], end: true }
  ],

  /* --- Beat 4 walker-talker stretch (linear, short) --- */
  wewakeWalk: [
    { speaker: "Wewake", text: "Alda mapped these pastures when she was younger than you. Got lost three times in one week. Named a sheep after the guild master out of spite.", choices: [ { text: "(Keep walking.)", goto: "tw2" } ]},
    { id: "tw2", speaker: "Wewake", text: "She used to say a map's just a letter to whoever walks it next. You're the letter, Wren. Don't rush the ending.", choices: [], end: true }
  ],

  /* --- Beat 4 variant: Wren earned the walk (fence + lambing done) --- */
  wewakeWalkVeteran: [
    { speaker: "Wewake", text: "Clover's fine, by the way. Ate through another fence panel yesterday. The east line held, though — your posts. Still straight.", choices: [ { text: "(Keep walking.)", goto: "twv2" } ]},
    { id: "twv2", speaker: "Wewake", text: "Alda mapped these pastures when she was younger than you. Got lost three times in one week. Named a sheep after the guild master out of spite. (Beat.) She'd have liked you, Wren. Not the apprentice — you.", choices: [ { text: "(Keep walking.)", goto: "twv3" } ]},
    { id: "twv3", speaker: "Wewake", text: "When we get to the bridge — let Shivangi fuss. She fusses because she cares and she'll deny it. Like someone else I know. (He almost smiles.) Walk on, mapmaker.", choices: [], end: true }
  ],

  /* --- ambient barks (see MISSIONS.md for the bark system spec) --- */
  barks: [
    { if: "flag:tower1_lit", speaker: "Wewake", text: "Still burning. Good. Bram would've approved of the words." },
    { if: "flag:brusque_wewake", speaker: "Wewake", text: "You've warmed up since the first day. The valley does that to people." },
    { if: "flag:whistle", speaker: "Wewake", text: "Pip's been asking after you. He asks by staring at the road." },
    { if: "flag:lambing_done", speaker: "Wewake", text: "Dusk's lamb is huge now. Rude, like her namesake. Takes after you." },
    { speaker: "Wewake", text: "Mind the flock. They bite mapmakers. (Beat.) It's tradition." }
  ],

  repeat: [
    { speaker: "Wewake", text: "Towers first, then tea. That's the order. Clover says hello, by the way. He says it with his head.", choices: [], end: true }
  ]
},

/* ------------------------------- MEERA -------------------------------
 * Botanist of the Mistfall groves (R2). Questline: the blooms (exists) ->
 * the rain-cap census -> the hollow promise -> the seed vault.
 * Theme: science in service of love; she measures what she can't bear
 * to lose. */
meera: {
  meet: [
    { speaker: "Meera", text: "Oh good, a person. You've got Alda's walk — you must be the apprentice. I'm Meera, I study things that glow and everyone thinks I'm joking. I'm not joking. Have you seen the deep light yet?", choices: [
      { text: "\"The what?\"", goto: "s_what" },
      { text: "\"Wewake mentioned you write everything down.\"", goto: "s_dates" },
      { text: "\"I need to get to the second tower.\"", goto: "s_tower" }
    ]},
    { id: "s_what", speaker: "Meera", text: "The deep light. Bioluminescent bloom — blue at the edges, like the ground's dreaming. It only wakes in true dark. Which is interesting, because the towers went dark one per season, and the blooms got bolder every time. I have charts. Nobody wants to see the charts.", choices: [
      { text: "\"I'd like to see the charts.\"", goto: "s_charts" },
      { text: "\"One per season? That's what Wewake said.\"", goto: "s_dates" }
    ]},
    { id: "s_charts", speaker: "Meera", text: "You would? Oh, you're going to fit in fine here. (She unrolls a chart covered in ink.) Autumn, winter, spring, summer — each tower dimmed right on the equinox. That's not weather, Wren. That's a decision. Anyway — I need three blooms logged for my field notes, at night, in the hollow. You walk at night anyway, don't you? Everyone says mapmakers do.", choices: [
      { text: "\"I'll log three blooms for you.\"", goto: "s_quest", effect: "quest:meera_blooms" },
      { text: "\"Maybe later.\"", goto: "s_later" }
    ]},
    { id: "s_dates", speaker: "Meera", text: "Autumn: tower one. Winter: tower two. Spring: tower three, summer: four. Like clockwork, except clocks don't dim signal towers. I wrote to the guild twice. They wrote back 'noted.' Guilds.", choices: [
      { text: "\"I'll keep that in mind.\"", goto: "s_tower" }
    ]},
    { id: "s_later", speaker: "Meera", text: "Later's fine. The blooms aren't going anywhere — that's the whole point of them. Come find me at night, in the hollow. Bring your eyes.", effect: "flag:meera_deferred", choices: [], end: true },
    { id: "s_quest", speaker: "Meera", text: "Three blooms, night only, don't touch — they bruise. Use your photo mode or just note the spots. Do that and I'll mark every bloom site on your map. And Wren? Whatever you decide about the fourth tower... I know things. Ask me at the hollow.", choices: [], end: true },
    { id: "s_tower", speaker: "Meera", text: "Second tower's through the groves, past the big fallen oak. Mind the mirror alignment on the way up — Alda set those mirrors herself and she was very particular. If the light doesn't catch, you're standing wrong, not the mirror.", choices: [
      { text: "\"What was the second tower for?\"", goto: "s_spirehistory" }
    ]},

    /* --- the Spire's history (tower 2 story) --- */
    { id: "s_spirehistory", speaker: "Meera", text: "The Spire's the oldest — built when the valley road was the only road. The keepers used to grind lenses here; there's still glass in the soil. I find bits when I'm digging. I keep them in a jar labeled 'not specimens.'", choices: [
      { text: "\"Can I see the jar?\"", goto: "s_jar" }
    ]},
    { id: "s_jar", speaker: "Meera", text: "(She produces a jar of glass shards.) Two hundred years of some keeper's mistakes. I like it better than the charts, honestly. Somebody tried. That's the whole story.", choices: [], end: true },

    /* --- the lamplight truth, at the hollow at night --- */
    { id: "s_truth", if: "flag:saw_hollow_night", speaker: "Meera", text: "You see it now. The bloom dies under lamplight — a week of tower light and the hollow goes grey. That's why she kept them dark, Wren. The fourth tower stands right over the hollow. Light it, and this ends. Leave it dark, and... well. It's your map. I'll support either. Loudly, in writing, if you need me to.", choices: [], end: true },

    /* --- STAGE 2: the rain-cap census (offered after blooms done) --- */
    { id: "s_shroom_offer", speaker: "Meera", text: "Blooms are logged. Now — rain-caps. Four of them, and they're weather snobs: rain or fog only. They're for Dev's winter stores, and I owe her for approximately one thousand bowls of stew. Bring me four and I'll press one for you with your name on it.", choices: [
      { text: "\"I'll find four rain-caps.\"", goto: "s_shroom_accept", effect: "quest:meera_shrooms" },
      { text: "\"Rain or fog only? Really?\"", goto: "s_shroom_why" }
    ]},
    { id: "s_shroom_why", speaker: "Meera", text: "Really. They fruit when the air's wet and sulk otherwise. Like Vipul. (Beat.) Four caps, rain or fog. I'll make it worth your while — your name, in Latin, in my field book.", choices: [
      { text: "\"Deal.\"", goto: "s_shroom_accept", effect: "quest:meera_shrooms" },
      { text: "\"Later.\"", goto: "s_shroom_defer" }
    ]},
    { id: "s_shroom_accept", speaker: "Meera", text: "Check the grove floor after rain — they glow faintly, which is cheating, but I'll allow it. And Wren? Don't eat any. I know that look. Don't.", choices: [], end: true },
    { id: "s_shroom_defer", speaker: "Meera", text: "They'll wait. Mushrooms are patient. It's their whole thing.", choices: [], end: true },
    { id: "s_shroom_mid", speaker: "Meera", text: "Four rain-caps. Rain or fog. The grove floor, after weather. Go on — I'll be here, labeling things.", choices: [], end: true },

    /* --- STAGE 3: the hollow promise (offered after shrooms + hollow seen) --- */
    { id: "s_promise_offer", speaker: "Meera", text: "Walk with me to the hollow tonight. Not for samples — I want to show you the oldest cluster, and I want to ask you something. In that order.", choices: [
      { text: "\"Tonight, then.\"", goto: "s_promise_accept", effect: "quest:meera_promise" },
      { text: "\"Ask me now.\"", goto: "s_promise_now" }
    ]},
    { id: "s_promise_now", speaker: "Meera", text: "Not here. Some things need the dark around them to be said right. Tonight. The hollow.", choices: [
      { text: "\"All right. Tonight.\"", goto: "s_promise_accept", effect: "quest:meera_promise" }
    ]},
    { id: "s_promise_accept", speaker: "Meera", text: "After dusk. Come to the hollow mouth — I'll be there. Bring your hardest decision. You'll know which one.", choices: [], end: true },
    { id: "s_promise_mid", speaker: "Meera", text: "Tonight. The hollow mouth. Don't bring the lantern — just your eyes.", choices: [], end: true },

    /* --- STAGE 4: the seed vault (offered after tower 4 resolved) --- */
    { id: "s_seeds_dark", if: "flag:tower4_dark", speaker: "Meera", text: "The hollow's safe, and I'm building a seed vault — so the bloom never has to be lucky again. Come see. Bring your journal; I want to press the first sheet with you.", choices: [
      { text: "\"Show me the vault.\"", goto: "s_seeds_accept", effect: "quest:meera_seeds" }
    ]},
    { id: "s_seeds_lit", if: "flag:tower4_lit", speaker: "Meera", text: "The hollow's gone grey. (She's matter-of-fact; she's allowed to be sad later.) But I kept seeds — I always keep seeds. Help me press and catalog them? So it's not really gone.", choices: [
      { text: "\"Of course.\"", goto: "s_seeds_accept", effect: "quest:meera_seeds" }
    ]},
    { id: "s_seeds_accept", speaker: "Meera", text: "My camp, whenever. Bring patience — pressing takes a steady hand and a heavier book than you'd think.", choices: [], end: true },
    { id: "s_seeds_mid", speaker: "Meera", text: "The vault's at my camp. Steady hands, heavy books. You know the drill by now.", choices: [], end: true },

    /* --- tower 2 aftermath --- */
    { id: "s_after2", if: "flag:tower2_lit", speaker: "Meera", text: "Two lights. The charts say the next dimming would've been spring — tower three. (Beat.) Whatever you're walking into at the hollow, Wren — come see me first. I mean that.", choices: [], end: true },

    /* --- tower 4 reactions --- */
    { id: "s_t4_lit", if: "flag:tower4_lit", speaker: "Meera", text: "The hollow's grey this morning. (She doesn't look at you when she says it, which tells you everything.) But — you came back here. That counts. It counts with me.", choices: [], end: true },
    { id: "s_t4_dark", if: "flag:tower4_dark", speaker: "Meera", text: "Twice! (She grins, sudden and bright.) The mother cluster bloomed twice last night — twice! I measured. Alda would've... she'd have pretended not to care and cared enormously.", choices: [], end: true }
  ],

  questDone: [
    { speaker: "Meera", text: "Three blooms! (She nearly drops her notebook.) Look at these notes — you're a naturalist and you didn't even know. Here, bloom sites, all marked on your map. And take this — I treated your lantern glass. It'll burn steadier in the hollow's damp.", effect: "kind+1", choices: [], end: true }
  ],

  /* --- STAGE 2 done: Wren's Folly --- */
  shroomDone: [
    { speaker: "Meera", text: "Four! Oh, you're good at this. (She presses one into your journal, labels it in careful script.) \"Wren's Folly\" — named for the botanist, which is you, and for where it grows, which is wherever maps say 'probably fine.' Take the rest to Dev — tell her they're for the stores.", effect: "flag:wrens_folly", choices: [
      { text: "\"Wren's Folly? Really?\"", goto: "s_sq2" }
    ]},
    { id: "s_sq2", speaker: "Meera", text: "It's a proud tradition. I named a lichen after Vipul once. He still doesn't know. (Beat.) Don't tell him.", choices: [], end: true }
  ],

  /* --- STAGE 3 done: the promise (at the hollow mouth, at night) [VO-15] --- */
  promiseDone: [
    { speaker: "Meera", text: "There. The mother cluster — oldest in the hollow. Alda found it first; she brought me here when I was nineteen. Your age. (Beat.) Whatever you decide about the fourth tower — decide it here, looking at this, not at the map. Promise me that much.", choices: [
      { text: "\"I promise.\"", goto: "s_promise_kept" },
      { text: "\"I can't promise that.\"", goto: "s_promise_cant" }
    ]},
    { id: "s_promise_kept", speaker: "Meera", text: "Good. (She squeezes your arm.) And Wren — whichever you choose, I'll support it. Loudly. In writing. With charts.", effect: "flag:meera_promise_kept", choices: [], end: true },
    { id: "s_promise_cant", speaker: "Meera", text: "Honest. I respect honest. (Beat.) Then just... come back here before you decide. That's all I ask. The bloom's a better counselor than I am.", effect: "flag:meera_promise_open", choices: [], end: true }
  ],

  /* --- STAGE 4 done: the vault --- */
  seedsDone: [
    { speaker: "Meera", text: "(An afternoon of pressing: blue petals between journal pages, labels in her careful hand.) There. The valley's dark, filed and kept. (She hands you a folded packet.) Bloom seeds, for your journal. If you ever find a dark hollow of your own — you'll know what to do.", effect: "flag:bloom_seeds", choices: [], end: true }
  ],

  /* --- ambient barks --- */
  barks: [
    { if: "flag:tower2_lit", speaker: "Meera", text: "Two lights and counting. The charts have never been this happy." },
    { if: "flag:meera_deferred", speaker: "Meera", text: "You came back! 'Later' finally arrived. I kept your charts warm." },
    { if: "flag:wrens_folly", speaker: "Meera", text: "How's Wren's Folly doing? Still follying, I hope." },
    { if: "flag:saw_hollow_night", speaker: "Meera", text: "Night's the best time for the hollow. Day's the best time for everything else. That's the whole schedule, really." },
    { speaker: "Meera", text: "Don't touch the blooms — they bruise. Look with your eyes, not your hands. (Beat.) I say this to everyone. Nobody listens." }
  ],

  repeat: [
    { speaker: "Meera", text: "Night's the best time for the hollow. Day's the best time for everything else. That's the whole schedule, really.", choices: [], end: true }
  ]
},

/* ------------------------------- VIPUL -------------------------------
 * Ferryman of the old ford (R3), retired. Questline: the bridge (exists)
 * -> the second journal (exists, expanded with Wren's crisis) -> the
 * long letter -> one last dusk. Theme: usefulness after retirement; the
 * hands remember what the knees can't. */
vipul: {
  meet: [
    { speaker: "Vipul", text: "Ferry's not running. River took the ropes in the spring storm and I'm seventy-one and done arguing with water. You're Alda's girl, aren't you? You've got her eyebrows. Sit. You're going to tell me about the towers.", choices: [
      { text: "\"The towers went dark one by one. I'm relighting them.\"", goto: "o_towers" },
      { text: "\"I need to cross the river to reach tower three.\"", goto: "o_cross" },
      { text: "\"Did you know Alda well?\"", goto: "o_alda" }
    ]},
    { id: "o_towers", speaker: "Vipul", text: "One by one. Autumn, winter, spring, summer. I ran this ferry forty years by those lights, and I watched each one go out like a held breath. The guild says 'broken lamps.' I say the guild couldn't find its own backside with a map. Which reminds me — you need to cross. The footbridge is out too.", choices: [
      { text: "\"Can we fix the bridge?\"", goto: "o_bridge" },
      { text: "\"What was the ferry like, when the lights burned?\"", goto: "o_ferrydays" }
    ]},
    { id: "o_cross", speaker: "Vipul", text: "Everyone needs to cross the river, that's the river's whole tragedy. Footbridge lost two planks and a railing in the storm. Bring me three good driftwood logs and we'll fix it together — I've still got the tools, and you've still got young knees.", choices: [
      { text: "\"I'll find the driftwood.\"", goto: "o_quest", effect: "quest:vipul_bridge" },
      { text: "\"Is there another way across?\"", goto: "o_otherway" }
    ]},
    { id: "o_alda", speaker: "Vipul", text: "Knew her? She mapped this river when I was still handsome. She used to ride the ferry just to argue with me about the current. (Beat.) She left something in my hut. Told me to hide it until the third tower was lit. I'm old, not forgetful. Mostly.", choices: [
      { text: "\"What did she leave?\"", goto: "o_journal_tease" }
    ]},
    { id: "o_bridge", speaker: "Vipul", text: "That's the spirit. Three driftwood logs, straight ones, from the east bank. Then you and I are going to do some light carpentry and you are going to pretend you know what a mortise is.", choices: [
      { text: "\"I'll find the driftwood.\"", goto: "o_quest", effect: "quest:vipul_bridge" }
    ]},
    { id: "o_otherway", speaker: "Vipul", text: "Swim it, and I'll fish you out and charge you for the rescue. The bridge is the way. Three logs. Go on.", effect: "flag:vipul_swim", choices: [], end: true },
    { id: "o_quest", speaker: "Vipul", text: "Straight ones, mind. The river keeps the crooked ones for itself — it's got opinions. When you've got three, come back and we'll make a bridge out of them and out of spite.", choices: [], end: true },
    { id: "o_journal_tease", speaker: "Vipul", text: "A journal. Her second one — the one the guild never saw. 'Until the third tower's lit,' she said, 'and not a minute before, Vipul, and I mean it.' So. Light the third tower, then we'll talk.", choices: [], end: true },

    /* --- the ferry days (tower 3 story) --- */
    { id: "o_ferrydays", speaker: "Vipul", text: "Forty years, sun and ice. I knew every passenger's business and kept all of it. The tower lights were my timetable — third light meant the evening crossing, fourth meant last. When they went dark, I kept the schedule anyway. For a while. Then the river took the ropes and I took the hint.", choices: [
      { text: "\"You miss it.\"", goto: "o_ferrydays2" }
    ]},
    { id: "o_ferrydays2", speaker: "Vipul", text: "I miss being useful. There's a difference. (Beat.) Fixing that bridge with you — that was the best morning I've had in a year. Don't tell the river.", choices: [], end: true },

    /* --- after tower 3 lit: the second journal --- */
    { id: "o_journal", if: "flag:tower3_lit", speaker: "Vipul", text: "Third tower's lit. I saw it from the hut. (He pulls a oilcloth-wrapped journal from under his bunk.) Here. Her handwriting. Read it sitting down — she always did have a way of rearranging a room.", choices: [
      { text: "Read Alda's second journal.", goto: "o_journal_read" }
    ]},
    { id: "o_journal_read", speaker: "Alda (journal)", text: "\"If you're reading this, the third tower's lit, which means Vipul finally stopped hiding my journal — thank you, Vipul, you stubborn old rock. The towers weren't broken. I dimmed them myself. The ridge tower first, before the first frost — I needed one dark place to think — then one per season, autumn to summer. You'd never meet anyone if the road was lit. You'd walk it at speed and call it a day and be poorer for it. So slow down, Wren. Meet them all. Light the towers last.\"", effect: "flag:knows_truth", choices: [
      { text: "\"She planned all of this.\"", goto: "o_after" }
    ]},
    { id: "o_after", speaker: "Vipul", text: "She planned everything except me dying before I could tell you myself, probably. (Beat.) Take the waders, too — river's yours now. And Wren? She was right about you. I can tell.", effect: "gear:waders", choices: [], end: true },

    /* --- STAGE 2b: Wren's crisis (after the reveal, once per run) --- */
    { id: "o_crisis", speaker: "Vipul", text: "You've read it twice now. I can tell — you've got the look. So. What do you make of her? Of all of it?", choices: [
      { text: "\"She lied to the whole valley.\"", goto: "o_crisis_a" },
      { text: "\"She loved the whole valley.\"", goto: "o_crisis_b" },
      { text: "\"I don't know what to feel.\"", goto: "o_crisis_c" }
    ]},
    { id: "o_crisis_a", speaker: "Vipul", text: "Aye. She did. And I'd rather be lied to by Alda than told the truth by the guild. (Beat.) She gave us four seasons of each other, Wren. That's not nothing. That's nearly everything.", effect: "flag:crisis_done", choices: [], end: true },
    { id: "o_crisis_b", speaker: "Vipul", text: "Aye. That too. Both can be true — she wrote that somewhere, didn't she? Clever woman. Annoying, but clever.", effect: "flag:crisis_done", choices: [], end: true },
    { id: "o_crisis_c", speaker: "Vipul", text: "Good. Feel it all the way to the fifth tower and then decide. That's what the walk is for — it's not for maps. The maps are just the excuse.", effect: "flag:crisis_done", choices: [], end: true },

    /* --- STAGE 3: the long letter (offered after the reveal) --- */
    { id: "o_letter_offer", speaker: "Vipul", text: "I wrote a letter. Forty years Dev fed me every winter and I never said thank you properly — not in words. Take it to her. Walk it. Don't hurry. That's rather the point.", choices: [
      { text: "\"I'll walk it to her.\"", goto: "o_letter_accept", effect: "quest:vipul_letter flag:letter_carried" },
      { text: "\"Why can't you take it yourself?\"", goto: "o_letter_why" }
    ]},
    { id: "o_letter_why", speaker: "Vipul", text: "These knees? The inn's a day's walk and I'd be a week. Besides — (he looks away) — I want her to have time to read it twice before she sees my face. Take it. Please.", choices: [
      { text: "\"I'll walk it to her.\"", goto: "o_letter_accept", effect: "quest:vipul_letter flag:letter_carried" }
    ]},
    { id: "o_letter_accept", speaker: "Vipul", text: "It's sealed. Don't steam it open, mapmaker — I know your kind. Give it to Dev herself, not the bar. And Wren? Walk the long way. You'll understand by the third mile.", choices: [], end: true },
    { id: "o_letter_mid", speaker: "Vipul", text: "Dev. The inn. Walk it. And if she cries, pretend you didn't see — she's proud.", choices: [], end: true },
    { id: "o_letter_after", if: "done:vipul_letter", speaker: "Vipul", text: "She liked it? (His voice does something complicated.) Forty years, and I finally said it right. Good. That's... good.", choices: [], end: true },

    /* --- STAGE 4: one last dusk (offered after letter done) --- */
    { id: "o_dusk_offer", speaker: "Vipul", text: "One more thing. Take me to the tower base at dusk. These knees won't climb, but I want to stand under the third light — the one I ran by for forty years. Just stand there. Will you?", choices: [
      { text: "\"At dusk. I'll take you.\"", goto: "o_dusk_accept", effect: "quest:vipul_dusk" },
      { text: "\"The path's rough for old knees.\"", goto: "o_dusk_knees" }
    ]},
    { id: "o_dusk_knees", speaker: "Vipul", text: "Old knees have gotten me this far. Dusk. Tower base. I'll bring a coat and my dignity.", choices: [
      { text: "\"Dusk, then.\"", goto: "o_dusk_accept", effect: "quest:vipul_dusk" }
    ]},
    { id: "o_dusk_accept", speaker: "Vipul", text: "Meet me at the tower-three base at dusk. Not dark — dusk, when the light's gold and the river goes quiet. That's when I used to make the evening crossing.", choices: [], end: true },
    { id: "o_dusk_mid", speaker: "Vipul", text: "Dusk. Tower base. Gold light, quiet river. Don't be late — I'm old and I nap.", choices: [], end: true },

    /* --- tower 4 reactions --- */
    { id: "o_t4_lit", if: "flag:tower4_lit", speaker: "Vipul", text: "(He puffs his pipe, watching the northern sky.) Well. Alda dimmed them for a reason and you lit it for a reason. Reasons can coexist. It's practically the valley motto.", choices: [], end: true },
    { id: "o_t4_dark", if: "flag:tower4_dark", speaker: "Vipul", text: "(A long puff. He doesn't look surprised.) Huh. You know, I ran forty years by those lights, and I'm telling you: the dark between them was always the best part. Don't quote me.", choices: [], end: true }
  ],

  /* --- STAGE 4 done: the dusk visit (at tower-3 base, at dusk) [VO-14] --- */
  duskDone: [
    { speaker: "Vipul", text: "(He stands under the lit tower as dusk settles, and doesn't speak for a long time. The beacon turns on above him, gold against the blue.) There she is. Forty years, and I never once stood under it. Always on the water, looking up.", choices: [
      { text: "(Stand with him.)", goto: "o_dusk2" }
    ]},
    { id: "o_dusk2", speaker: "Vipul", text: "Alda used to ride the evening crossing just to argue about the current. (He laughs, wetly.) Go on, then. Light the rest. And Wren — when you're old and someone's apprentice comes asking — be kinder than the river was to me.", effect: "flag:vipul_blessing", choices: [], end: true }
  ],

  /* --- ambient barks --- */
  barks: [
    { if: "flag:tower3_lit", speaker: "Vipul", text: "Third light's burning. I can see it from the hut. Forty years, and it still gets me." },
    { if: "flag:vipul_swim", speaker: "Vipul", text: "Still not swimming it, I see. Wise. The river respects restraint." },
    { if: "flag:knows_truth", speaker: "Vipul", text: "She planned it all. (Beat.) I hid that journal for a year. Hardest thing I ever didn't do." },
    { if: "flag:vipul_blessing", speaker: "Vipul", text: "Dusk at the tower. Best evening I've had since the ferry. Don't tell the river." },
    { speaker: "Vipul", text: "River's up after rain, down in sun. Plan your crossings like you plan your life: loosely." }
  ],

  repeat: [
    { speaker: "Vipul", text: "River's up after rain, down in sun. Plan your crossings like you plan your life: loosely.", choices: [], end: true }
  ]
},

/* ------------------------------- DEV -------------------------------
 * Innkeeper of the Lantern Inn, Vale's Edge (R1). Questline: the recipe
 * page (exists) -> the corner table -> winter stores -> the bell.
 * Theme: feeding people is how she loves; the inn is the valley's heart. */
dev: {
  meet: [
    { speaker: "Dev", text: "You must be Wren. Alda wrote about you — 'my apprentice, hopeless with pencils, good with people.' Sit down, you're too thin. Stew's on. Now: which tower are you lighting first, and have you eaten?", choices: [
      { text: "\"Tower one. And... I could eat.\"", goto: "m_stew" },
      { text: "\"Did Alda stay here often?\"", goto: "m_alda" },
      { text: "\"I need supplies for the road.\"", goto: "m_supplies" }
    ]},
    { id: "m_stew", speaker: "Dev", text: "Everyone can eat. That's the rule of the inn and frankly of life. (She ladles stew.) This was Alda's favorite, except it's not right — the recipe book's missing a page, has been since spring, and I've been guessing the herb ever since. It's close. It's not right.", choices: [
      { text: "\"I'll find the missing page.\"", goto: "m_quest", effect: "quest:dev_recipe" },
      { text: "\"It tastes fine to me.\"", goto: "m_fine" }
    ]},
    { id: "m_alda", speaker: "Dev", text: "Every season, regular as rent. She'd sit in that corner with her journal and order stew and correct my map of the valley from memory. Once she redrew my kitchen. I framed it. (Beat.) She talked about you the last time. Said you were ready. I believed her, and I don't believe people.", choices: [
      { text: "\"I hope she's right.\"", goto: "m_stew2" },
      { text: "\"Why's it called the Lantern Inn?\"", goto: "m_lanterninn" }
    ]},
    { id: "m_stew2", speaker: "Dev", text: "She's right about stew herbs, usually. Except the missing page. Which brings me back to my problem — root cellar, torn page, probably behind the turnip barrels. Find it and I'll owe you a lantern.", choices: [
      { text: "\"I'll find the missing page.\"", goto: "m_quest", effect: "quest:dev_recipe" }
    ]},
    { id: "m_fine", speaker: "Dev", text: "\"Fine\" is the enemy of right, and don't you forget it. The page is in the root cellar. Bring it back and I'll show you what this stew is supposed to taste like.", effect: "flag:dev_fine", choices: [
      { text: "\"All right, I'll look.\"", goto: "m_quest", effect: "quest:dev_recipe" }
    ]},
    { id: "m_supplies", speaker: "Dev", text: "Supplies! Yes. Bread, cheese, dried apples — and a lecture about eating them in that order. But first, the cellar: my recipe page is down there somewhere, and I can't make proper trail food until the stew's right. Priorities.", choices: [
      { text: "\"I'll find the missing page.\"", goto: "m_quest", effect: "quest:dev_recipe" }
    ]},
    { id: "m_quest", speaker: "Dev", text: "Root cellar, behind the turnip barrels, mind the spider — she's retired, she won't bother you. The page is torn at the corner; you'll know it by Alda's handwriting in the margin. She always wrote 'more thyme than you'd think.'", choices: [], end: true },

    /* --- the Lantern Inn's name --- */
    { id: "m_lanterninn", speaker: "Dev", text: "The Lantern Inn! Named for the towers, obviously — when all five burned, you could see the inn's windows answer from the ridge. My grandmother kept a lamp in the window every night the towers were dark. 'So the road knows we're here,' she'd say. I still do it.", choices: [
      { text: "\"I saw the lamp.\"", goto: "m_lanterninn2" }
    ]},
    { id: "m_lanterninn2", speaker: "Dev", text: "Then you know. (She beams.) Alda loved that lamp. Said it was the sixth tower. She was joking. Mostly.", choices: [], end: true },

    /* --- tower 1 aftermath: the bell --- */
    { id: "m_bell1", if: "flag:tower1_lit", speaker: "Dev", text: "(The inn bell is ringing as you come down.) That was me! First tower in a year — I rang it till my arm gave out. Vipul heard it at the ford, probably. Whole valley heard it.", choices: [], end: true },

    /* --- STAGE 2: the corner table (offered after recipe done) --- */
    { id: "m_table_offer", speaker: "Dev", text: "Alda's corner table wobbles. Been wobbling since spring — I've been folding menus under it like an animal. There's a proper wedge somewhere; I lent it to... hmm. Find it and fix my table, would you?", choices: [
      { text: "\"I'll find the wedge.\"", goto: "m_table_accept", effect: "quest:dev_table" },
      { text: "\"Where did you lend it?\"", goto: "m_table_where" }
    ]},
    { id: "m_table_where", speaker: "Dev", text: "If I knew that, I'd fetch it myself. Check behind the woodpile — things migrate there. Everything I lose ends up behind the woodpile. It's the inn's lost property.", choices: [
      { text: "\"Behind the woodpile. Got it.\"", goto: "m_table_accept", effect: "quest:dev_table" }
    ]},
    { id: "m_table_accept", speaker: "Dev", text: "Behind the woodpile, probably. Wedge, table leg, steady. Alda's chair deserves better than menus.", choices: [], end: true },
    { id: "m_table_mid", speaker: "Dev", text: "Woodpile. Wedge. Table. In that order. The chair's getting impatient.", choices: [], end: true },

    /* --- STAGE 3: winter stores (offered after table done + tower 3 lit) --- */
    { id: "m_stores_offer", speaker: "Dev", text: "Winter's coming and my cellar's embarrassing. Five things: dried apples from the Mistfall grove, smoked fish from Vipul's old smoke-shed, honey from the wild hive on the hollow trail, cheese from the Vale's Edge dairy — and Meera's bringing mushrooms. You bring the rest.", choices: [
      { text: "\"I'll stock the cellar.\"", goto: "m_stores_accept", effect: "quest:dev_stores" },
      { text: "\"That's a lot of walking.\"", goto: "m_stores_walk" }
    ]},
    { id: "m_stores_walk", speaker: "Dev", text: "It's the long way, yes. You're walking it anyway — you're a mapmaker. Just pick things up as you go. The cellar's behind the inn; set them inside.", choices: [
      { text: "\"Fine. The long way.\"", goto: "m_stores_accept", effect: "quest:dev_stores" }
    ]},
    { id: "m_stores_accept", speaker: "Dev", text: "Apples, fish, honey, cheese — and Meera's mushrooms when she has them. Five things. The valley'll eat well this winter because of you.", choices: [], end: true },
    { id: "m_stores_mid", speaker: "Dev", text: "Apples, fish, honey, cheese, mushrooms. Cellar's behind the inn. How many is that now? Count on your fingers, I won't tell.", choices: [], end: true },

    /* --- STAGE 4: the bell (offered after stores done + tower 4 resolved) --- */
    { id: "m_bell_offer", speaker: "Dev", text: "When you light the fifth — I'll ring the inn bell. And I'm hanging a lantern out front with your name on it. Not 'Wren the mapmaker.' Just Wren. So the valley knows who walked it.", choices: [
      { text: "\"I'd like that.\"", goto: "m_bell_yes" }
    ]},
    { id: "m_bell_yes", speaker: "Dev", text: "Then it's decided. Fifth light, bell, lantern. (She shoos you.) Go on. Walk.", effect: "flag:dev_lantern_named", choices: [], end: true },

    /* --- tower 4 reactions --- */
    { id: "m_t4_lit", if: "flag:tower4_lit", speaker: "Dev", text: "(She ladles stew without asking.) Sit. Eat. Meera came by, quiet. Whatever you chose, you chose it hungry, and that's no way to decide anything.", choices: [], end: true },
    { id: "m_t4_dark", if: "flag:tower4_dark", speaker: "Dev", text: "(She grins, already reaching for the good cheese.) Alda's girl, all right. Sit — I've been saving this for a decision like that.", choices: [], end: true }
  ],

  questDone: [
    { speaker: "Dev", text: "That's it! That's the page! 'More thyme than you'd think' — see, I told you. (She hugs you; it rearranges your spine.) Right. As promised: my old storm-lantern. Burns steady in any weather, and you'll need it — the deep hollow eats ordinary lamps. And you're eating here free from now on. Don't argue.", effect: "kind+1 gear:stormlantern", choices: [], end: true }
  ],

  /* --- Vipul's letter delivered (engine: talk to Dev carrying the letter) --- */
  letterDone: [
    { speaker: "Dev", text: "(She reads Vipul's letter standing up, then sits down hard.) Forty years. Forty years he ate here and never said a word, and now — (she wipes her eyes furiously) — now he writes it down and sends a child to deliver it. That man.", choices: [
      { text: "\"He wanted you to have time to read it twice.\"", goto: "m_letter2" }
    ]},
    { id: "m_letter2", speaker: "Dev", text: "(She laughs through it.) He knows me. (She takes a brass bell down from the shelf.) His ferry bell — he left it here years ago. Keep it. Ring it when the fifth lights, so he hears it from here.", effect: "flag:ferry_bell", choices: [], end: true }
  ],

  /* --- STAGE 2 done: the table --- */
  tableDone: [
    { speaker: "Dev", text: "Steady! (She sits and bounces experimentally.) Oh, that's better. That's — (she goes quiet) — she redrew my kitchen, you know. Framed it. Said my stove was 'a cartographic emergency.' (Beat.) Her chair's yours now. Sit in it whenever. Argue about stew herbs.", effect: "flag:alda_chair", choices: [], end: true }
  ],

  /* --- STAGE 3 done: the cellar --- */
  storesDone: [
    { speaker: "Dev", text: "Look at that cellar! (She packs a parcel, brisk and pleased.) Trail food for the ridge — Alda always said the last tower's earned on a full stomach. And take this: her stew page. The real one, with the thyme note. It's yours now.", effect: "flag:stores_trailfood", choices: [
      { text: "\"Thank you, Dev.\"", goto: "m_stores2" }
    ]},
    { id: "m_stores2", speaker: "Dev", text: "Eat it on the ridge. And Wren — when you come back down, the chair's yours. The stew's yours. The inn's yours. That's how it works here.", choices: [], end: true }
  ],

  /* --- ambient barks --- */
  barks: [
    { if: "flag:tower1_lit", speaker: "Dev", text: "First tower in a year! I rang that bell till my arm gave out." },
    { if: "flag:dev_fine", speaker: "Dev", text: "You said 'fine' once about my stew. I've never forgiven you. (She's joking. Mostly.)" },
    { if: "flag:alda_chair", speaker: "Dev", text: "Alda's chair's yours, remember. Sit. Argue about herbs." },
    { if: "flag:ferry_bell", speaker: "Dev", text: "Ring Vipul's bell when the fifth lights. He'll hear it. Old ears, sharp heart." },
    { if: "flag:knows_truth", speaker: "Dev", text: "She dimmed them herself. (She shakes her head, fond.) That woman. That wonderful, infuriating woman." },
    { speaker: "Dev", text: "Eat something before you go. No, that apple doesn't count. Sit. Two minutes." }
  ],

  repeat: [
    { speaker: "Dev", text: "Eat something before you go. No, that apple doesn't count. Sit. Two minutes.", choices: [], end: true }
  ]
},

/* ------------------------------ SHIVANGI ------------------------------
 * Bridge-keeper of the high rope bridge (R5), former bridgewright
 * apprentice. Questline: the coils (exists) -> the red-ink plans ->
 * the toll-bell -> the application. Theme: finishing what you quit;
 * the difference between building it wrong and being wrong. */
shivangi: {
  meet: [
    { speaker: "Shivangi", text: "Whoa — hold up at the bridge. It'll hold you, probably, but 'probably' is doing a lot of work in that sentence. I'm Shivangi. I keep this bridge the way you keep a map: nervously. You're the mapmaker, right? Alda's kid?", choices: [
      { text: "\"Apprentice, technically. I need to cross to tower five.\"", goto: "v_tower" },
      { text: "\"'Nervously' isn't filling me with confidence.\"", goto: "v_conf" },
      { text: "\"Did you know Alda?\"", goto: "v_alda" }
    ]},
    { id: "v_tower", speaker: "Shivangi", text: "Tower five. Of course it's tower five, it's never tower one with you people. The bridge needs re-tensioning before I'd trust it with the full crossing — and I dropped three rope coils in the cliff scrub yesterday being graceful. Find the coils, help me tension it, and I'll get you across. Also I'll lend you my climbing kit. It's seen things.", choices: [
      { text: "\"I'll find the coils.\"", goto: "v_quest", effect: "quest:shivangi_coils" },
      { text: "\"Can't I just... climb around?\"", goto: "v_climb" }
    ]},
    { id: "v_conf", speaker: "Shivangi", text: "Confidence is for people who don't maintain rope bridges. I maintain a rope bridge. Anyway — three coils, cliff scrub, then we tension it together. Deal?", choices: [
      { text: "\"Deal.\"", goto: "v_quest", effect: "quest:shivangi_coils" }
    ]},
    { id: "v_alda", speaker: "Shivangi", text: "She redrew my bridge plans when I was apprenticed. In red ink. All over. I was furious for a week and then I rebuilt it her way and it stopped swaying. (Beat.) I never finished the trade, you know. Bridgewright dropout. You're looking at the valley's only bridge-keeper with imposter syndrome.", choices: [
      { text: "\"We're both apprentices at something, then.\"", goto: "v_tower" },
      { text: "\"Why'd you leave the trade?\"", goto: "v_quit" }
    ]},
    { id: "v_climb", speaker: "Shivangi", text: "The cliff path needs a climbing kit, which I have and you don't, which is convenient for both of us. Coils first. Then kit. Then bridge. Then tower five. This is what passes for a plan around here.", effect: "flag:shivangi_climb", choices: [
      { text: "\"Fine. Coils first.\"", goto: "v_quest", effect: "quest:shivangi_coils" }
    ]},
    { id: "v_quest", speaker: "Shivangi", text: "Cliff scrub, east side — look for the red twine I tied on them, which is the one competent thing I did yesterday. Bring all three and we'll tension the bridge together. Try not to fall off anything. I have paperwork for that.", choices: [], end: true },

    /* --- why she quit --- */
    { id: "v_quit", speaker: "Shivangi", text: "Three years into the bridgewright trade. Then one day my master looked at my tension calculations and said, 'Shivangi, you're very creative,' which is master-code for 'find another trade.' So I came here. The bridge doesn't care about my calculations. It just sways.", choices: [
      { text: "\"We're both apprentices at something.\"", goto: "v_quit2" }
    ]},
    { id: "v_quit2", speaker: "Shivangi", text: "Yeah. Yeah. (Beat.) Don't tell anyone I said this, but I miss it. The math. The... finishing things.", choices: [], end: true },

    /* --- STAGE 2: the red-ink plans (offered after coils done) --- */
    { id: "v_plans_offer", speaker: "Shivangi", text: "Found something in the hut — Alda's notes on my bridge. In red ink. All over my beautiful plans. She was right about the sway, damn her. Help me rebuild the north section her way?", choices: [
      { text: "\"Let's rebuild it her way.\"", goto: "v_plans_accept", effect: "quest:shivangi_plans" },
      { text: "\"Red ink, huh?\"", goto: "v_plans_ink" }
    ]},
    { id: "v_plans_ink", speaker: "Shivangi", text: "Red ink. Everywhere. 'Sway indicates tension imbalance' — in the margins, like my bridge personally offended her. (Beat.) She was right. I hate that.", choices: [
      { text: "\"Let's rebuild it.\"", goto: "v_plans_accept", effect: "quest:shivangi_plans" }
    ]},
    { id: "v_plans_accept", speaker: "Shivangi", text: "North section. Her notes are in the hut — try to ignore the red. I'll get the tools. And Wren? If this works... maybe I'm not as done with the trade as I thought.", choices: [], end: true },
    { id: "v_plans_mid", speaker: "Shivangi", text: "North section, Alda's notes, red ink. Read them and weep, then help me rebuild.", choices: [], end: true },

    /* --- STAGE 3: the toll-bell (offered after plans done) --- */
    { id: "v_bell_offer", speaker: "Shivangi", text: "Lost my toll-bell in the cliff scrub. Brass, loud, embarrassing. Find it and I'll ring it when you light tower five — so the valley hears the bridge held.", choices: [
      { text: "\"I'll find the bell.\"", goto: "v_bell_accept", effect: "quest:shivangi_bell" },
      { text: "\"How do you lose a bell?\"", goto: "v_bell_how" }
    ]},
    { id: "v_bell_how", speaker: "Shivangi", text: "With talent and dedication. Cliff scrub, east side. It rings when the wind's right, so listen.", choices: [
      { text: "\"I'll listen for it.\"", goto: "v_bell_accept", effect: "quest:shivangi_bell" }
    ]},
    { id: "v_bell_accept", speaker: "Shivangi", text: "East cliff scrub. Listen for it — it rings in the wind. Bring it back and I'll owe you a very loud thank-you.", choices: [], end: true },
    { id: "v_bell_mid", speaker: "Shivangi", text: "Cliff scrub. East. Listen for the wind ringing it. It's out there, mocking me.", choices: [], end: true },

    /* --- STAGE 4: the application (offered after bell done, before the ridge) --- */
    { id: "v_apply_offer", speaker: "Shivangi", text: "I'm re-applying to the bridgewrights. They want a sketch of the bridge 'as built.' You're the mapmaker — will you draw it? Properly. No red ink unless it's warranted.", choices: [
      { text: "\"I'll draw your bridge.\"", goto: "v_apply_accept", effect: "quest:shivangi_apply" }
    ]},
    { id: "v_apply_accept", speaker: "Shivangi", text: "Stand on the south bank, get the whole span. Make the tensioning look... competent. It is competent now. Mostly.", choices: [], end: true },
    { id: "v_apply_mid", speaker: "Shivangi", text: "South bank. Whole span. Make me look good — the bridgewrights are judgy.", choices: [], end: true },

    /* --- tower 4 reactions --- */
    { id: "v_t4_lit", if: "flag:tower4_lit", speaker: "Shivangi", text: "(She tests a rope, unnecessarily.) Meera explained about the bloom. Tough call. For what it's worth — bridges are also about knowing what to leave unbuilt.", choices: [], end: true },
    { id: "v_t4_dark", if: "flag:tower4_dark", speaker: "Shivangi", text: "(She grins.) You know what? Good. Some things you finish by not finishing them. I would know — I'm an expert in not finishing. Recovering expert.", choices: [], end: true }
  ],

  questDone: [
    { speaker: "Shivangi", text: "All three! Okay. Okay! Stand here, hold this, pull when I say — (creaking, rope sounds, a very relieved bridge) — there. Solid. Here's the climbing kit. And Wren? When you light tower five... take a second up there. The view's the whole point. Alda taught me that, in red ink.", effect: "kind+1 gear:climbingkit", choices: [], end: true }
  ],

  /* --- STAGE 2 done: the rebuild --- */
  plansDone: [
    { speaker: "Shivangi", text: "(An afternoon of work: rope, timber, Alda's red-ink notes weighted with a stone.) There. Steady as a table. (She's quiet.) I quit because I thought I wasn't good enough. Turns out I was just building it wrong. There's a difference. I'm still mad about the red ink, though.", effect: "flag:plans_kept", choices: [], end: true }
  ],

  /* --- STAGE 3 done: the bell (Pip variant if Wren has the whistle) --- */
  bellDone: [
    { speaker: "Shivangi", text: "My bell! (She rings it — it echoes off the cliffs.) Oh, that's the sound. That's the job. When you light the fifth, I'll ring it till my arm falls off. The valley's going to hear this bridge held.", effect: "flag:tollbell_found", choices: [], end: true }
  ],
  bellDonePip: [
    { speaker: "Shivangi", text: "(Pip trots up with the brass bell in his mouth, enormously pleased with himself.) Your dog found my bell. Your dog! (She rings it.) When you light the fifth, I'll ring it till my arm falls off. Tell Pip he's invited.", effect: "flag:tollbell_found", choices: [], end: true }
  ],

  /* --- STAGE 4 done: the sketch --- */
  applyDone: [
    { speaker: "Shivangi", text: "(She studies your sketch a long time.) It's good. It's really good. (She folds it carefully.) If they take me back, I'm finishing the trade. And Wren — thank you. For the bridge, and for not treating me like a dropout.", effect: "flag:sketch_done", choices: [], end: true }
  ],

  /* --- ambient barks --- */
  barks: [
    { if: "flag:tower5_rite", speaker: "Shivangi", text: "Five lights. The bridge held. I held. We're both doing great." },
    { if: "flag:shivangi_climb", speaker: "Shivangi", text: "Still want to climb around? The kit's yours now. Go wild. Carefully." },
    { if: "flag:plans_kept", speaker: "Shivangi", text: "North section's solid. Alda's red ink and my rope. Best collaboration I've had." },
    { if: "flag:sketch_done", speaker: "Shivangi", text: "Sent the application. Whatever happens — I finished something. That's new." },
    { speaker: "Shivangi", text: "Bridge is holding. I'm as surprised as you are. Cross safe." }
  ],

  repeat: [
    { speaker: "Shivangi", text: "Bridge is holding. I'm as surprised as you are. Cross safe.", choices: [], end: true }
  ]
},

/* ------------------------- TOWER LIGHTING BEATS -------------------------
 * Short in-world text shown at each lighting (the [VO] narration covers
 * the emotional beat; this is the moment-to-moment text).
 * Beats are looked up via DIALOGUE.towerBeats["tower"+id] in finishLighting
 * and DIALOGUE.towerBeats["tower4_dark"/"tower4_lit"] in resolveTower4. */
towerBeats: {
  tower1: { speaker: "Wren", text: "The lamp catches on the second strike. Light runs down the valley like water. Somewhere below, a shepherd waves." },
  tower2: { speaker: "Wren", text: "Two beacons now, answering each other across the groves. Meera's charts were right about one thing: this was always meant to be a chain." },
  tower3: { speaker: "Wren", text: "Vipul stands in the wind with tears going sideways and denies everything. Three lights. The valley looks stitched together." },
  tower4_lit: { speaker: "Wren", text: "The fourth beacon catches. Below, the bloom folds back into the dark like a held breath. I can come back. Nothing here is finished." },
  tower4_dark: { speaker: "Wren", text: "I lower the flint. The tower stays dark, and the hollow keeps breathing blue beneath me. The map will have one honest blank spot." },
  tower5: { speaker: "Wren", text: "Five lights. The beacon sweeps cliff to cliff, and every window in Vale's Edge answers. Somebody rings the inn bell. I laugh, which surprises me." }
},

/* ------------------------- TOWER RITES -------------------------
 * Lighting-ceremony dialogues, one per tower (tower 4's ceremony IS the
 * choice scene). Spec (integrator): before the lightSeq starts at each
 * tower, if the rite flag is unset, play the rite array via
 * startDialogueTree(key, null, DIALOGUE.towerRites.towerN) then set the
 * flag; the lighting proceeds after the rite closes. */
towerRites: {
  tower1: [
    { speaker: "Wewake", text: "Hold on. Before you strike it — Bram's words. He said them every lighting for thirty years, and I'll not have the first lighting in a year go without. Repeat after me.", choices: [ { text: "\"I'm ready.\"", goto: "t1r2" } ]},
    { id: "t1r2", speaker: "Wewake", text: "\"For the road —\" (say it) \"— for the walkers —\" (good) \"— for the ones coming home.\" There. Now strike it.", choices: [ { text: "(Strike the flint.)", goto: "t1r3" } ]},
    { id: "t1r3", speaker: "Wren", text: "(The lamp catches. Light runs down the valley like water.) For the ones coming home.", effect: "flag:tower1_rite", choices: [], end: true }
  ],
  tower2: [
    { speaker: "Meera", text: "Wait — before you light it. They were built to be seen from each other, like a chain of people keeping each other's lights in sight. Strike it, then look south. The first one will answer.", choices: [ { text: "(Strike the flint.)", goto: "t2r2" } ]},
    { id: "t2r2", speaker: "Wren", text: "(The beacon catches — and far south, through the groves, the first tower's light lifts in answer.)", choices: [ { text: "\"It's answering.\"", goto: "t2r3" } ]},
    { id: "t2r3", speaker: "Meera", text: "That's the trick of it. Nobody's light is just their own.", effect: "flag:tower2_rite", choices: [], end: true }
  ],
  tower3: [
    { speaker: "Vipul", text: "Hold on. Forty years I watched these lit from the water. Let an old man do the honors — give me the flint.", choices: [ { text: "(Hand him the flint.)", goto: "t3r2" } ]},
    { id: "t3r2", speaker: "Vipul", text: "(His hands shake — then steady, the way old hands do when it matters.) For the evening crossing. For every passenger I ever kept dry.", choices: [ { text: "(Watch.)", goto: "t3r3" } ]},
    { id: "t3r3", speaker: "Wren", text: "(He strikes. The beacon catches, and Vipul cries, and denies it later.)", effect: "flag:tower3_rite", choices: [], end: true }
  ],
  tower5: [
    { speaker: "Wewake", text: "Last one. (He looks at the others — Meera, Vipul, Dev, Shivangi, all come up for this.) We do it proper. One word each.", choices: [ { text: "(Nod.)", goto: "t5r2" } ]},
    { id: "t5r2", speaker: "Wewake", text: "For the road.", choices: [ { text: "(Meera steps forward.)", goto: "t5r3" } ]},
    { id: "t5r3", speaker: "Meera", text: "For the dark between.", choices: [ { text: "(Vipul steps forward.)", goto: "t5r4" } ]},
    { id: "t5r4", speaker: "Vipul", text: "For the walkers.", choices: [ { text: "(Dev steps forward.)", goto: "t5r5" } ]},
    { id: "t5r5", speaker: "Dev", text: "For the ones coming home.", choices: [ { text: "(Shivangi steps forward.)", goto: "t5r6" } ]},
    { id: "t5r6", speaker: "Shivangi", text: "For finishing.", choices: [ { text: "(Strike the flint.)", goto: "t5r7" } ]},
    { id: "t5r7", speaker: "Wren", text: "(Five lights. The beacon sweeps cliff to cliff — and below, bells answer: the inn's, the bridge's, all of them.)", effect: "flag:tower5_rite", choices: [], end: true }
  ]
},

/* ------------------------- TOWER 4 CHOICE SCENE -------------------------
 * Triggered at the deep hollow at night after meeting Meera's truth. */
tower4Choice: [
  { speaker: "Meera", text: "This is it, then. The fourth tower, right over the hollow. Light it — the map, the job, Alda's note. Or leave it dark, and the bloom lives. There's no wrong answer. There's just the one you'll think about on the walk home.", choices: [
    { text: "\"I need a minute.\"", goto: "c_delib" },
    { text: "Light the tower. (The map. The job.)", goto: "c_lit", effect: "flag:tower4_lit" },
    { text: "Leave it dark. (The bloom. Alda's wish.)", goto: "c_dark", effect: "flag:tower4_dark" }
  ]},
  { id: "c_delib", speaker: "Wren", text: "(The tower above. The bloom below. Alda's note in my pocket: light the towers. Alda's journal in my pack: I dimmed them myself. Both her. Both true.)", choices: [
    { text: "\"What would you do?\"", goto: "c_delib2" }
  ]},
  { id: "c_delib2", speaker: "Meera", text: "Me? I'd leave it dark. But I'm biased — I measure things for a living, and I can't measure what the bloom's worth. You decide it as a mapmaker: what does the map need to be honest?", choices: [
    { text: "Light the tower. (The map. The job.)", goto: "c_lit", effect: "flag:tower4_lit" },
    { text: "Leave it dark. (The bloom. Alda's wish.)", goto: "c_dark", effect: "flag:tower4_dark" }
  ]},
  { id: "c_lit", speaker: "Wren", text: "I strike the flint. The beacon catches — and below, the blue folds away into the dark. Meera squeezes my shoulder. \"You can come back,\" she says. \"Nothing here is finished.\" She's right. I hate that she's right.", choices: [], end: true },
  { id: "c_dark", speaker: "Wren", text: "I put the flint away. The tower stands dark against the stars, and the hollow breathes blue beneath it, unbothered. \"Alda would approve,\" Meera whispers. I think she's right. I hope she's right.", choices: [], end: true }
],

/* ------------------------- QUIET MOMENTS -------------------------
 * Hidden optional scenes for explorers. Spec (integrator): each is an
 * interactable (or proximity + condition trigger) that plays its array
 * ONCE via startDialogueTree("quietMoments", null, DIALOGUE.quietMoments.X)
 * and sets its flag. No rewards except the moment + journal sketch note. */
quietMoments: {
  fox: [
    { speaker: "Wren", text: "(Dawn in the meadow. A fox crosses the path ahead — and stops. It looks at you for a long moment, the way wild things do when they're deciding what you are.)", choices: [ { text: "(Stand still.)", goto: "qm_fox2" } ]},
    { id: "qm_fox2", speaker: "Wren", text: "(You stand still. The fox sits down, scratches its ear, and decides you're probably fine. It trots on. The journal gets a sketch: 'fox, dawn, unbothered.')", effect: "flag:qm_fox", choices: [], end: true }
  ],
  rain: [
    { speaker: "Wren", text: "(Rain on Vipul's bridge. The river runs fast and brown below, and the rain makes a sound like the valley thinking out loud.)", choices: [ { text: "(Listen.)", goto: "qm_rain2" } ]},
    { id: "qm_rain2", speaker: "Wren", text: "(You listen. Somewhere upstream, Vipul's probably listening too. The valley's loudest when it's raining and nobody's talking.)", effect: "flag:qm_rain", choices: [], end: true }
  ],
  stars: [
    { speaker: "Wren", text: "(Night on the ridge. The sky is absurd with stars — the kind you only get far from lamplight. You lie back on the cold stone.)", choices: [ { text: "(Name them.)", goto: "qm_stars2" } ]},
    { id: "qm_stars2", speaker: "Wren", text: "(That one's Wewake — stubborn, low to the horizon. That bright one's Meera. The flickering one is Vipul, obviously. Dev's the warm one. Shivangi's the one that looks like it's holding its breath.)", effect: "flag:qm_stars", choices: [ { text: "(And Alda?)", goto: "qm_stars3" } ]},
    { id: "qm_stars3", speaker: "Wren", text: "(Alda's the dark between them. The map you navigate by. You fall asleep, just for a minute. Nobody minds.)", choices: [], end: true }
  ],
  pencil: [
    { speaker: "Wren", text: "(At the bloom heart, half-buried in the moss: a pencil, chewed at the end, brass ferrule green with age. Alda's. She was still bad at sharpening them too.)", choices: [ { text: "(Take it.)", goto: "qm_pencil2" } ]},
    { id: "qm_pencil2", speaker: "Wren", text: "(You put it in your pocket next to her note. Two relics. You're starting a collection.)", effect: "flag:qm_pencil", choices: [], end: true }
  ]
},

/* ------------------------------ ENDINGS ------------------------------
 * Title card + epilogue text shown with the [VO] narration.
 * Priority (DESIGN.md §8): deeplight > cartographer (>=29/36) >
 * longway (kindness>=4) > quiet (fallback). */
endings: {
  cartographer: {
    title: "THE CARTOGRAPHER'S ENDING",
    condition: "All 5 beacons lit AND compendium ≥ 80%",
    card: "They hung Wren's map in the Lantern Inn, over the fireplace. Travelers use it still — and write in the margins."
  },
  longway: {
    title: "THE LONG WAY HOME",
    condition: "All 5 beacons lit AND kindness ≥ 4",
    card: "Wren stayed the winter. The map got finished slowly, over tea. Nobody at the guild minded."
  },
  deeplight: {
    title: "THE DEEP LIGHT",
    condition: "Bloom heart discovered at night AND tower 4 left dark",
    card: "The last tower stays dark. The map has one blank spot, drawn with a little star: \"Unfinished — on purpose.\""
  },
  quiet: {
    title: "THE QUIET WALK",
    condition: "Any other outcome (always achievable)",
    card: "Not every walk ends in a flourish. Some end in good boots and a quiet evening — and the valley keeps a smaller, warmer memory."
  }
},

/* ------------------------- ENDING EPILOGUES -------------------------
 * Fuller epilogues that reflect the player's specific journey. Spec
 * (integrator): in doEnding, build the epilogue as E.card + "\\n\\n" +
 * epilogueBase + inserts whose `if` passes condTrue(). Format:
 * { base, inserts: [ { if, text } ] }. See MISSIONS.md §7 for the exact
 * wiring snippet. */
endingEpilogues: {
  cartographer: {
    base: "They hung my map in the Lantern Inn, over the fireplace, where the travelers can see it. It's wrong in places — I know exactly where — but people use it, and write notes in the margins, and every spring somebody adds a correction. Alda would have hated that and loved it.",
    inserts: [
      { if: "done:wewake_fence", text: "Wewake's fence line is drawn in — three posts, straight as Alda's handwriting, with a note: 'held plumb by the mapmaker.'" },
      { if: "done:wewake_lambing", text: "In the margin by the high pasture there's a lamb, grey as dusk, copied from Alda's sketch." },
      { if: "done:meera_shrooms", text: "'Wren's Folly' is pressed into the compendium margin, labeled in Meera's careful hand." },
      { if: "done:vipul_letter", text: "Vipul's ferry bell hangs by the inn door. Travelers ring it for luck." },
      { if: "done:dev_table", text: "Alda's corner table is drawn steady, with a note: 'no longer wobbles.'" },
      { if: "done:dev_stores", text: "The winter stores are marked on the map: 'in case of hunger, knock.'" },
      { if: "done:shivangi_plans", text: "The rope bridge is drawn twice — as found, and as Shivangi rebuilt it." },
      { if: "done:shivangi_apply", text: "Pinned to the map's edge: Shivangi's bridgewright acceptance, with a sketch of the bridge 'as built.'" },
      { if: "flag:qm_pencil", text: "One blank spot in the hollow, drawn with a little star: 'Unfinished — on purpose.'" }
    ]
  },
  longway: {
    base: "I stayed the winter. It wasn't a decision so much as a series of small non-decisions: one more stew at Dev's, one more lambing season, one more spring. The map got finished slowly, over tea, one page at a time, and nobody at the guild minded.",
    inserts: [
      { if: "done:wewake_lambing", text: "Lambing season with Wewake — Dusk's lamb grew huge and rude, like its namesake. Like its mapmaker." },
      { if: "done:dev_stores", text: "Dev's winter stores fed half the valley. She took full credit. She deserved it." },
      { if: "done:meera_seeds", text: "Spring with Meera's seed vault — the first pressed sheet went up on the inn wall." },
      { if: "done:vipul_dusk", text: "Vipul told his ferry stories all winter. Some of them were even true." },
      { if: "done:shivangi_apply", text: "Word came in spring: the bridgewrights took Shivangi back. The whole inn rang bells." },
      { if: "flag:dev_lantern_named", text: "The lantern with my name on it still hangs outside the inn. Dev relights it every dusk." }
    ]
  },
  deeplight: {
    base: "The last tower stays dark. I tell the guild the lamp's cracked beyond mending, which is almost true — the truth is I chose the bloom. On a clear night you can stand in the hollow and watch the valley breathe blue.",
    inserts: [
      { if: "done:meera_seeds", text: "Meera's seed vault is full. The dark is filed and kept, for whatever comes next." },
      { if: "done:vipul_dusk", text: "Vipul understands. 'Some lights,' he said, 'you keep by not lighting them.'" },
      { if: "flag:qm_pencil", text: "Alda's pencil is in my pocket. I'm still bad at sharpening them too." },
      { if: "flag:meera_promise_kept", text: "I kept my promise — I decided it looking at the bloom, not the map." }
    ]
  },
  quiet: {
    base: "Not every walk ends in a flourish. Some end in good boots and a quiet evening. The valley doesn't mind — it was never keeping score. But it remembers: a fence post by the east line, carved with two sets of initials — A. and W. Alda carved hers decades ago; Wren adds hers beside it. The next traveler will find it and wonder, and walk a little slower.",
    inserts: [
      { if: "kind>=2", text: "You helped where you could. The valley noticed — it always notices." },
      { if: "done:wewake_ram", text: "Clover headbutted the fence post once, in approval. It counts." },
      { if: "flag:qm_fox", text: "A fox crosses the meadow at dawn, unbothered, as always. Some things don't need a map." }
    ]
  }
},

/* --------------------------- ALDA'S JOURNAL ---------------------------
 * Collectible pages found through the game (handwritten flavor).
 * NOTE (integrator): game.js hardcodes alda1/alda2/alda5 text and only
 * places those three interactables. The full set below (alda_1..alda_9)
 * should be wired: see MISSIONS.md §6 for placement of alda_6..alda_9. */
journalPages: [
  { id: "alda_1", found: "Vale's Edge inn room", text: "\"Day one of the last map. The valley hasn't changed, which means I've changed, which means the map will be better this time. Wren — if you're reading the guild copy, the real journal is with Vipul. You know which one you are.\"" },
  { id: "alda_2", found: "Tower 1 base", text: "\"First tower dimmed. It felt like blowing out a birthday candle and making a wish I can't tell anyone. The wish is: let them walk slow.\"" },
  { id: "alda_3", found: "Mistfall groves", text: "\"Meera's blooms are bolder every season the towers stay dark. I was right and I'm sorry. Both can be true — write that down, it's the whole trade.\"" },
  { id: "alda_4", found: "Vipul's hut (second journal)", text: "\"I dimmed them myself. The ridge tower first, before the first frost — I needed one dark place to think — then one per season, autumn to summer. You'd never meet anyone if the road was lit. So slow down, Wren. Meet them all. Light the towers last.\"" },
  { id: "alda_5", found: "The ridge (final page)", text: "\"You came home by the long way. Now the map is yours to leave unfinished. — A.\"" },
  { id: "alda_6", found: "Dev's root cellar", text: "\"Dev — turnips, apples, the good cheese. And don't serve the soft cheese to travelers again, I mean it. — A.\" (On the back of Dev's stores list, in Alda's hand. She never could keep out of anyone's kitchen.)" },
  { id: "alda_7", found: "Vipul's hut (folded into the second journal)", text: "\"Vipul — you were right about the current. I was right about everything else. Don't argue; I'm writing this down so it's official. — A.\" (Unsent. He kept it anyway.)" },
  { id: "alda_8", found: "The bloom heart", text: "\"I sat down without deciding to. Some places you stand in; some you sit down in. I am sitting. The bloom doesn't care about the map. I think that's why I love it. — A.\"" },
  { id: "alda_9", found: "Tower 5 base", text: "\"The fifth lamp gums up — four seasons of dust. Clean it with your sleeve, like I taught you. Don't look down while you climb. Look at the valley. That's the point. — A.\"" }
]

};

/* Export for Node (autopilot harness) and browser. */
if (typeof module !== "undefined" && module.exports) module.exports = DIALOGUE;
