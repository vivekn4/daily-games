/* LANTERNVALE js/story.js — WRITER INTEGRATION POINT.
   All dialogue, journal pages, beats, and ending copy live here.
   The Writer role owns this file; the engine only calls STORY.* accessors.
   Copy rules: warm, human, plain-spoken. No AI tells. Lines kept short. */
(function () {
  "use strict";
  var LV = (typeof globalThis !== "undefined" && globalThis.LV) || {};
  if (typeof globalThis !== "undefined") globalThis.LV = LV;

  var INTRO = [
    "The bus left you at Vale's Edge with a pack, a brass compass, and Alda's map — half ink, half blank.",
    "Five signal towers stand dark along the valley. Her note is folded into the corner:",
    "\u201CFinish the map. Light the towers. Come home by the long way.\u201D",
    "No hurry. The valley isn't going anywhere. Neither, it turns out, are you."
  ];

  var VILLAGERS = {
    maren: {
      greet: ["Well now. You must be Alda's girl. She talked about you — mostly how you'd get lost.", "Inn's warm, the tea's hot, and the valley's all yours. What can I do for you, love?"],
      questOffer: ["A favor before you wander off? Alda left a letter for Wewake the shepherd, years ago, and I never found a reason to walk it over.", "Take it to him in the pasture east of here. He'll pretend he isn't glad to see you."],
      questDone: ["You gave him the letter? Good. He read it twice, I'll wager. Men like Wewake read slow and feel fast."],
      idle: ["Rest when you're tired, love. The towers have waited this long."],
      choices: [
        { q: "Who was Alda, to you?", a: ["Oh, she mapped half my life. Drew my wedding, my roof, the winter the river froze. Said every map is a love letter with the mushy bits left out."] },
        { q: "Why did the towers go dark?", a: ["One by one, season by season. Nobody's fault, nothing broken. Alda used to smile when folks asked. You'll understand by the fifth one. Maybe."] }
      ]
    },
    wewake: {
      greet: ["Hup! Easy, girl — mind the ewes. ...Alda's apprentice? She wrote you'd come. Didn't say when. Typical Alda."],
      questOffer: ["Since you're here and vertical — I've lost Bramble's bell. Brass, loud, the sheep's mortified without it.", "Somewhere in the pasture. You find it, I'll dig out the old waders. River's not to be argued with barefoot."],
      questDone: ["The bell! Bramble, come hear yourself. ...Here. Waders, oiled and honest. Alda wore them the spring she mapped the fords."],
      idle: ["Walk soft through the flock. They remember kindness longer than people do."],
      choices: [
        { q: "Tell me about Alda.", a: ["She came through one lambing season and stayed for three. Drew every ewe by name. Said my pasture was 'a sentence the valley keeps rewriting.' Whatever that means."] },
        { q: "The towers — did they just fail?", a: ["Fail? Lad, nothing Alda built ever failed. They went dark the way a candle goes out when somebody cups it. On purpose, like."] }
      ]
    },
    meera: {
      greet: ["Oh! A person. Mind the foxglove — no, the other foxglove. You're Alda's map girl, aren't you? You've got her walk."],
      questOffer: ["I need a photograph of a deep-light bloom, at night, properly dark. They only wake when the valley truly sleeps.", "Bring me proof you've seen one and I'll lend you my climbing kit. The ridge path eats the unprepared."],
      questDone: ["Look at that. Blue as a held breath. ...Kit's yours. Mind your hands on the third pitch — the rock's honest but the moss lies."],
      idle: ["Press a flower when you find a new one. The journal remembers what the head forgets."],
      choices: [
        { q: "What is the deep light?", a: ["A bloom that drinks darkness. Lamplight kills it — even a match, held too close. That's why the hollow's the only place it thrives. Dark as a pocket in there."] },
        { q: "Did Alda know about it?", a: ["Knew? She mapped every patch and then — get this — never marked a single one. 'Some things,' she said, 'are for finding, not for finding again.'"] }
      ]
    },
    ilsa: {
      greet: ["Ferry's not running, love. Crank cog's gone walkabout — river took it downstream in the spring flood, bold as brass.", "Wren, is it? Alda spoke of you. Said you'd finish what she started. She always did talk like the ending was decided."],
      questOffer: ["Find my cog — it'll be snagged somewhere south along the bank, shining where it shouldn't — and I'll get you across.", "Or mend the old footbridge north of here, if you've a mind. Two planks. Your call entirely."],
      questDone: ["There's my girl. Hear that crank sing? ...Take the storm-lantern too. The hollow mouth swallows daylight whole; you'll want your own sun in there."],
      idle: ["River's moody today. She was moody in Alda's day too. Some things the map can't hurry."],
      choices: [
        { q: "You knew Alda well?", a: ["Forty years of ferrying her across. She paid in maps — drew my landings better than I knew them. Last crossing, she just... looked back at the towers. Smiled. Didn't say a word."] },
        { q: "Why a ferry AND a bridge?", a: ["Bridge is older. Ferry's kinder. Alda said a valley should make you choose your crossings. I think she just liked watching people decide."] }
      ]
    },
    petter: {
      greet: ["Shh — you'll stir them. ...Alda's girl! She sketched my hives once. Drew the bees bigger than the hive. Said they were 'the point.'"],
      questOffer: ["Could you carry this honey jar to Meera in the grove? My knees argue with the distance these days.", "Sealed tight. The bees supervise the handoff, so mind your manners."],
      questDone: ["Delivered safe? Good, good. The bees approve of you — they've stopped watching. That's their kindness, such as it is."],
      idle: ["Bees know every flower for a mile. If you're hunting blooms, follow a forager at dusk."],
      choices: [
        { q: "What did Alda map here?", a: ["The hollow, mostly. Came back quiet each time. 'Petter,' she said, 'the dark down there's alive.' I thought she meant the quiet. She meant the light."] }
      ]
    }
  };

  var ECHOES = [
    "Alda's hand, faded: \u201CDay 4. The valley walks you, if you let it. I stopped checking the time on day two.\u201D",
    "\u201CThe towers were never about ships or warnings. They were about being seen. A lit valley says: someone is home.\u201D",
    "\u201CTam's ewes know my step. I have been adopted by livestock. The map suffers; the heart does not.\u201D",
    "\u201CSable showed me the bloom tonight. I have seen cathedrals with less blue in them. I will keep this page unmarked.\u201D",
    "\u201CIlsa asked why I smile at the dark towers. I couldn't say it yet. Soon. When the last one goes out, I'll write it plain.\u201D",
    "\u201CIf you're reading this, Wren: the long way was the whole assignment. The map was just the excuse.\u201D"
  ];

  var SECOND_JOURNAL = [
    "Behind the ferryman's stove: a second journal, Alda's, bound in river-cloth.",
    "\u201CI dimmed the towers myself. One per season, so no one would notice all at once.\u201D",
    "\u201CNot broken. Dimmed. So travelers would slow down. So they'd meet Wewake, and Meera, and Ilsa. Everyone I loved here.\u201D",
    "\u201CIt was a goodbye gift, disguised as a chore. Forgive an old woman her theatrics.\u201D"
  ];

  var TOWER_BEATS = {
    1: ["The brazier catches on the third try — the way good things do.", "Light spills down the pasture. Somewhere below, a sheep bell rings, as if on cue.", "Tower one burns. The valley notices."],
    2: ["The sluice water sings up the tower stair as you climb.", "You light the brazier and the grove exhales — fireflies rising like sparks in reverse.", "Tower two burns. Meera will see it from her greenhouse and pretend not to cry."],
    3: ["From the east bank, the river runs copper under the new light.", "Ilsa's ferry lantern answers yours, small and steady, across the water.", "Tower three burns. The crossing feels less like a border now."],
    4: ["The deep light pulses below — blue, patient, older than the tower.", "You lift the lantern to the brazier... and the hollow holds its breath with you.", "Tower four burns. The bloom does not die. It simply waits, as it always has."],
    5: ["The last brazier. Your hands know the motion now.", "Five lights in a string along the dark valley — and between them, answering, the deep blue of the bloom.", "Tower five burns. The map is finished. The walk is not."]
  };

  var TOWER4_DARK = [
    "You lower the lantern. The brazier stays cold.",
    "Below, the deep light swells — grateful, or so it feels — painting the hollow blue.",
    "Some maps are drawn in light. This one, you decide, will be drawn in dark."
  ];

  var WEWAKE_WALK = [
    "Wewake falls into step beside you for a stretch, hands in his pockets.",
    "\u201CAlda as a young mapmaker? Restless as a colt. Drew the whole valley in one summer and got every river bend wrong.\u201D",
    "\u201CCame back the next year and did it right. Said the first map was 'how I wished it.' The second was 'how it is.'\u201D",
    "\u201CYou're doing the third kind now, lass. 'How it feels.' Rarest kind.\u201D",
    "He squeezes your shoulder once, and turns back at the stile."
  ];

  var HOLLOW_DISCOVERY = [
    "Past the hollow mouth, the dark goes down like water.",
    "Then — blue. Bloom after bloom opening in the black, each one a small held breath of light.",
    "The deep-light heart of the valley. Alda's unmarked page. You understand, all at once, why she kept the towers dark.",
    "Your journal hand is shaking. You press a bloom anyway. Some things are for finding."
  ];

  var ENDINGS = {
    cartographer: {
      title: "THE CARTOGRAPHER'S ENDING",
      lines: [
        "Your finished map hangs in Maren's inn, framed in river-oak.",
        "Travelers use it for years — to find the towers, the fords, the folk.",
        "In the margin, in Alda's hand, one line you didn't write but somehow earned:",
        "\u201CNow the map is yours to leave unfinished.\u201D"
      ]
    },
    longway: {
      title: "THE LONG WAY HOME",
      lines: [
        "You stay the winter. The valley keeps you the way it keeps its river — without asking.",
        "Tea with Maren. Lambing with Wewake. Blooms with Meera. Crossings with Ilsa. Hives with Petter.",
        "The map gets finished slowly, over years, in pencil. Some towers you light. Some evenings you don't.",
        "Alda's note, kept in your pocket until the paper gives out: come home by the long way. You did."
      ]
    },
    deeplight: {
      title: "THE DEEP LIGHT",
      lines: [
        "You leave the last tower dark on purpose, and map the dark instead.",
        "Your chart of the hollow — every bloom, every blue breath — becomes the valley's other map.",
        "Travelers come for the lights. They stay for the dark between them.",
        "Alda would have smiled that particular smile. The one that meant: you finally got it."
      ]
    },
    quiet: {
      title: "THE MAP, UNFINISHED",
      lines: [
        "Not every walk ends in a flourish. Some end in a good pair of boots and a quiet evening.",
        "The valley doesn't mind. It was never keeping score.",
        "Your map is unfinished — beautifully, honestly unfinished — and the long way home is still there whenever you want it."
      ]
    }
  };

  // Voiceover scripts (pre-generated human voice primary; speechSynthesis fallback reads these)
  var VO_TEXT = {
    intro: "Vale's Edge. The bus is gone, and the valley is exactly as Alda drew it — which is to say, not quite. Five dark towers. One unfinished map. And a note in her handwriting: Finish the map. Light the towers. Come home by the long way.",
    tower1: "Tower one. The brazier catches, and light spills down the pasture like something the valley has been holding in. Somewhere below, a sheep bell rings.",
    tower2: "Tower two. The grove exhales as the light takes — fireflies rising like sparks in reverse. Meera will see it from her greenhouse, and pretend not to cry.",
    tower3: "Tower three. From the east bank, the river runs copper under the new light. Across the water, Ilsa's ferry lantern answers — small, and steady.",
    tower4: "Tower four. Below, the deep light pulses — blue, patient, older than the tower itself. You lift the lantern, and the whole hollow holds its breath with you.",
    tower5: "The last brazier. Your hands know the motion now. Five lights in a string along the dark valley — and between them, answering back, the deep blue of the bloom.",
    hollow: "Past the hollow mouth, the dark goes down like water. Then — blue. Bloom after bloom, opening in the black. The deep-light heart of the valley. Alda's unmarked page.",
    journal: "Behind the ferryman's stove: a second journal. I dimmed the towers myself, she wrote. One per season. So travelers would slow down. So they'd meet everyone I loved here. A goodbye gift, disguised as a chore.",
    walk: "Wewake walks with you a while. Alda as a young mapmaker? Restless as a colt, he says. You're drawing the third kind of map now, lass. Not how you wished it. Not how it is. How it feels. The rarest kind.",
    "end-cartographer": "The cartographer's ending. Your finished map hangs in Maren's inn, framed in river-oak, and travelers use it for years. In the margin, in Alda's hand: now the map is yours to leave unfinished.",
    "end-longway": "The long way home. You stay the winter, and the valley keeps you the way it keeps its river — without asking. The map gets finished slowly, over years, in pencil.",
    "end-deeplight": "The deep light. You leave the last tower dark on purpose, and map the dark instead. Travelers come for the lights. They stay for the dark between them."
  };

  var HINTS = {
    boulder: "The boulder wants to go east, into the worn hollow. Push from the west side.",
    sluice: "Meera's sketch: left wheel two clicks sunwise, right wheel back to rest.",
    mirrors: "Moonwell light must touch each mirror's bright face, then the tower dish.",
    planks: "The bridge remembers its shape. It only needs its missing teeth.",
    ford: "Rain swells the river. Waders, dry days — or the old bridge, mended."
  };

  LV.story = {
    INTRO: INTRO, VILLAGERS: VILLAGERS, ECHOES: ECHOES, SECOND_JOURNAL: SECOND_JOURNAL,
    TOWER_BEATS: TOWER_BEATS, TOWER4_DARK: TOWER4_DARK, WEWAKE_WALK: WEWAKE_WALK,
    HOLLOW_DISCOVERY: HOLLOW_DISCOVERY, ENDINGS: ENDINGS, VO_TEXT: VO_TEXT, HINTS: HINTS
  };
  if (typeof module !== "undefined" && module.exports) module.exports = LV.story;
})();
