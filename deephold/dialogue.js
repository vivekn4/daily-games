// dialogue.js — DEEPHOLD (game03-deephold) story data.
// Programmer notes:
// - Load as a plain <script> before game code; global `DIALOGUE`.
// - Line: { who, text }. `who` keys match DIALOGUE.speakers; "SYSTEM" is
//   unvoiced narration text; CHIEF/VOSS/ADA lines are candidates for
//   speechSynthesis when the narration toggle is ON (skip SYSTEM).
// - Choice: { id, label, response: [lines], unlock: {techId, name, desc} }.
// - Boss taunts are arrays per boss; `heart.phases` is keyed per boss phase.
// - Endings: { id, title, tone, trigger, text, allyLine } — allyLine is
//   appended after the ending text and varies with the wave-25 allegiance.
const DIALOGUE = {
  meta: { game: "game03-deephold", title: "DEEPHOLD", version: 1 },

  speakers: {
    CHIEF:  { name: "Chief",           role: "Night chief (you)", color: "#7fd4ff" },
    VOSS:   { name: "Dr. Ilya Voss",   role: "Marine biologist",  color: "#8affc1" },
    ADA:    { name: "Foreman Okafor",  role: "Hull foreman",      color: "#ffc46b" },
    SYSTEM: { name: "",                role: "Narration",        color: "#9fb3c8" }
  },

  intro: [
    { who: "ADA", text: "Chief. Welcome to Meridian Trench Rig. Ninety days, starting — well. Now." },
    { who: "CHIEF", text: "Shift change in ten minutes, right?" },
    { who: "VOSS", text: "About the sonar — it's been reading wrong since 0200. Everything down there is moving UP. As a school. As a siege." },
    { who: "ADA", text: "First wave hits the lower hull in six minutes. Your turrets, your call, Chief. Whatever you need welded, I'm already welding it." },
    { who: "SYSTEM", text: "Survey phase: read the mutation report, place turrets, harvest the vents. Then hold the line." }
  ],

  beats: [
    {
      id: "beat1-signal", wave: 3, title: "The signal",
      lines: [
        { who: "VOSS", text: "Look at their eyes. Every species, same pattern — same blink, same interval. That's not instinct, Chief. That's a SIGNAL." },
        { who: "CHIEF", text: "Bioluminescence patterns. Mating call?" },
        { who: "VOSS", text: "I ran it against every known cephalopod grammar. It's not a mating call. It's the same frequency in all of them. I think they're all repeating something they HEARD." },
        { who: "ADA", text: "Down there? What's repeating things down there?" },
        { who: "VOSS", text: "I don't know yet. Keep shooting. I'll keep listening." }
      ]
    },
    {
      id: "beat2-warning", wave: 12, title: "The warning",
      lines: [
        { who: "VOSS", text: "It's decoded. The pattern is a warning call — the same one reef fish use when a shadow passes overhead. Something down there is screaming at the dark." },
        { who: "CHIEF", text: "A warning. To who?" },
        { who: "VOSS", text: "To each other. To everything below us. They are not invading the surface, Chief. They are EVACUATING." },
        { who: "ADA", text: "Evacuating from what?" },
        { who: "VOSS", text: "From whatever is coming up behind them." }
      ]
    },
    {
      id: "beat3-silent", wave: 17, title: "Cut loose",
      lines: [
        { who: "ADA", text: "Uplink's dead. Corporate line, the supply ship, all of it. We've been cut loose, Chief. Budget line item, redacted." },
        { who: "CHIEF", text: "So we're on our own with the end of the world." },
        { who: "ADA", text: "We were always on our own. The company just stopped pretending." },
        { who: "SYSTEM", text: "Okafor starts quietly diverting power to something in the moon pool. Voss notices. You notice. Nobody says anything yet." }
      ]
    },
    {
      id: "beat4-lure", wave: 22, title: "The moon-pool device",
      lines: [
        { who: "VOSS", text: "That's not a repair rig, Adaeze. I know what that coil is. You've built a LURE — tuned to the creatures' own signal." },
        { who: "ADA", text: "Then you know what it's for." },
        { who: "VOSS", text: "Chief, she wants to drop it into the trench. Broadcast the warning pattern at a hundred times strength. Call whatever is down there UP — into open water, on her terms, on our hull." },
        { who: "ADA", text: "On my terms, yes. Because waiting down here for it is suicide and you know it. We lure it up, we see it, we KILL it. That's the job. That has always been the job." },
        { who: "CHIEF", text: "So the plan is either poke the abyss, or mail it an invitation. Wonderful. I'll get the good china." }
      ]
    },
    {
      id: "climax-reveal", wave: 30, title: "The Heart of the Trench",
      lines: [
        { who: "VOSS", text: "Forget animal. Look at the thermal read — it's a vent colossus. A living geothermal engine, kilometers of it, dormant since before we had language." },
        { who: "ADA", text: "Then what woke it up?" },
        { who: "VOSS", text: "Our drills, Adaeze. Fifteen years of thermal boring. We cracked its nursery vents. Everything that climbed up here was fleeing US. The signal — the warning — it was about the rig. About what we did." }
      ]
    }
  ],

  bosses: {
    maw: {
      name: "The Maw", wave: 10,
      intro: "Sonar contact the size of a cargo ship, rising fast.",
      // Taunts are delivered as Voss's sonar readings, cycled during the fight.
      taunts: [
        "It's enormous. It's been down there a long time. And Chief — it's climbing straight past the rig. We're a rock in its road, and it is terrified.",
        "Readings spike every time it opens its jaw. The signal is INSIDE it. Chief, something put that signal in there.",
        "It's bleeding light. It's afraid. Nothing that big should be afraid."
      ]
    },
    dredge: {
      name: "The Dredge", wave: 20,
      intro: "It is dragging the trench floor up with it.",
      taunts: [
        "It's dragging the trench floor up with it — sediment, wreckage, old rig cable from before our company existed.",
        "The signal is louder behind it. Much louder. Whatever the Maw was running from, the Dredge was SENT.",
        "Its armor is growing between waves. It is adapting faster than our turrets. We have to adapt faster."
      ]
    },
    heart: {
      name: "The Heart of the Trench", wave: 30,
      intro: "It is not a beast. It is a living geothermal engine.",
      phases: {
        1: ["It's surfacing around the nursery vents. It's trying to seal the cracks we made. The thermal bloom reads like triage, not an attack — it's doing first aid down there."],
        2: ["It's turning toward the rig. It's ignoring the crew completely — every vector points at the drill string. It wants the drills stopped and doesn't know we're in the way."],
        3: ["The signal is resolving — it's coordinates now, clean and repeating. Chief. It's giving us a LOCATION. It wants to show us something down there."]
      }
    }
  },

  branching: {
    allegiance: {
      id: "allegiance", trigger: "wave 25 complete",
      prompt: [
        { who: "VOSS", text: "Please. The signal resolved further last night — it's not just a warning anymore. It has STRUCTURE. Coordinates. Whatever is down there might be trying to talk, and a lure is a war declaration." },
        { who: "ADA", text: "And if it's not talking, Chief? If it's just hungry? Then your friend's curiosity gets this crew killed. I need your answer. Now." }
      ],
      choices: [
        {
          id: "side-voss", label: "“Voss is right. Stand down the lure.”",
          response: [
            { who: "ADA", text: "...Understood, Chief. Lure stays dark. But if that thing comes up hungry, that's on your conscience, not mine." },
            { who: "VOSS", text: "Thank you. I'll keep the sonar wide open. If it talks again, we'll hear it first." }
          ],
          unlock: { techId: "harmonic-array", name: "Harmonic Array",
            desc: "Sonar tech: all enemies revealed, debuffed 25% — they hesitate." }
        },
        {
          id: "side-okafor", label: "“Ada's right. Finish the lure.”",
          response: [
            { who: "ADA", text: "Good. I'll have it tuned by wave 28. Whatever's down there, it'll come to US — on our hull, under our guns." },
            { who: "VOSS", text: "(quietly) ...Then I'll keep my readings to myself. Some things you shouldn't hear before a war." }
          ],
          unlock: { techId: "moonpool-beacon", name: "Moon-Pool Beacon",
            desc: "Economy tech: waves arrive faster but pre-tagged — +50% cell yield." }
        },
        {
          id: "side-neither", label: "“Nobody's touching anything until wave 30.”",
          response: [
            { who: "ADA", text: "Holding fire, then. Not brave, not clever — but it's your call, Chief. I'll respect the chain." },
            { who: "VOSS", text: "A delay isn't a decision. But I'll take the time. Maybe the signal says more by then." }
          ],
          unlock: { techId: "rationed-pressure", name: "Rationed Pressure",
            desc: "Defense tech: +20% hull repair, overcharges cool 15% faster." }
        }
      ]
    }
  },

  finalChoice: {
    trigger: "wave 30 complete (victory)",
    prompt: [
      { who: "SYSTEM", text: "The Heart of the Trench holds position at the nursery vents, waiting. The signal pulses — slow, patient. Your move, Chief." }
    ],
    choices: [
      { id: "seal",   label: "SEAL THE TRENCH — detonate the charges" },
      { id: "feed",   label: "FEED THE HEART — route the Pressure Core into the trench" },
      { id: "descend",label: "DESCEND — take the submersible down to parley" }
    ]
  },

  endings: {
    seal: {
      id: "seal", title: "Seal the Trench", tone: "bittersweet",
      trigger: "Choose SEAL THE TRENCH after wave 30.",
      text: "The charges go in a line down the vent field, and the trench closes like a held breath. The Heart sinks without a sound — nothing that large should sink quietly. The creatures scatter. The rig holds. On the sonar, Voss watches the nursery go dark, vent by vent. “We survived,” she says. She doesn't say what it cost.",
      allyLine: {
        "side-voss": "Voss keeps the last sonar print of the nursery. She never looks at it.",
        "side-okafor": "Okafor welds the moon-pool hatch shut herself. “Orders,” she says, and won't meet your eyes.",
        "side-neither": "Neither of them speaks on the ride up. The rig holds. That has to be enough."
      }
    },
    feed: {
      id: "feed", title: "Feed the Heart", tone: "open-ended",
      trigger: "Choose FEED THE HEART after wave 30.",
      text: "You open the Pressure Core and pour fifteen years of stored heat into the trench. The Heart DRINKS — and the whole rig lights up like a city. Infinite power. Free energy. Voss is laughing; Okafor is already calculating. And on the horizon, a company ship turns toward you, because a thing like this cannot be kept secret. It was never going to be kept secret.",
      allyLine: {
        "side-voss": "Voss's voice, soft: “We just made first contact AND a power plant. History won't know what to do with us.”",
        "side-okafor": "Okafor grins at the horizon. “Let them come. This time we negotiate from the rig that can't be turned off.”",
        "side-neither": "The crew gathers at the rail to watch the water glow. Nobody mentions the ship. Not yet."
      }
    },
    descend: {
      id: "descend", title: "Descend", tone: "mystery",
      trigger: "Choose DESCEND after wave 30.",
      text: "You clip the lure to the submersible and drop past the thermocline into water blacker than any night. The Heart MOVES ASIDE for you — and the coordinates resolve on your sonar, one waypoint at a time, leading down past the mapped floor. Voss's voice on the comm, small and far: “Chief... it's opening for you. Whatever's down there — it was waiting for someone to come.”",
      allyLine: {
        "side-voss": "“Bring back a word of it,” Voss whispers. “Any word at all.”",
        "side-okafor": "“Lure's hot and your hull's patched,” Okafor says. “Come back up, Chief. That's an order.”",
        "side-neither": "The comm goes quiet behind you. Ahead, the waypoints burn green in the dark."
      }
    }
  },

  death: {
    trigger: "Hull integrity reaches 0 on any wave.",
    lines: [
      { who: "SYSTEM", text: "The hull gives at sector four, then everywhere. Meridian Trench Rig goes dark at 3,900 meters." },
      { who: "SYSTEM", text: "The trench keeps what it takes." }
    ]
  }
};

// Expose as a real window property: `const` at script top level does NOT
// create window.DIALOGUE (global lexical binding only), and js/main.js
// prefers window.DIALOGUE over the built-in DeepStory.
window.DIALOGUE = DIALOGUE;
