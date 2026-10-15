/* DEEPHOLD — story: dialogue spine. Writer (STORY.md) may edit text in place;
   branch keys and structure are stable — do not rename keys. */
(function (root) {
  "use strict";
  var STORY = {
    intro: [
      { who: "SYS", text: "MERIDIAN TRENCH RIG — 2,900 meters down. Night shift, day one of your 90-day rotation as chief." },
      { who: "OKAFOR", text: "Chief! Adaeze Okafor, foreman. Welcome to the bottom of the world. Thermal grid's green, drills are—" },
      { who: "VOSS", text: "Adaeze, hold on. Chief, I'm Dr. Ilya Voss, marine biology. My sonar array just went wrong in a way sonar doesn't go wrong." },
      { who: "VOSS", text: "Something is coming UP the trench wall. A lot of somethings. They're fast, and they are not afraid of the rig lights." },
      { who: "OKAFOR", text: "Then we do what this rig was built to do — hold. Chief, you've got hull pads, turrets, and my ROVs. Spend thermal cells, bolt guns to the hull, and do NOT let them reach the Pressure Core." },
      { who: "SYS", text: "TUTORIAL — Voss: place a HARPOON GUN on the flashing pad (click it, then build). Harvest a vent with your ROVs for extra cells. Then press START WAVE." }
    ],
    beats: {
      5: [
        { who: "VOSS", text: "Five waves down and I've been reading their bioluminescence between attacks. Chief... their glow pulses in a pattern." },
        { who: "VOSS", text: "Every family, every wave — the same shared signal in their eyes. This isn't random fauna behavior. Something is coordinating them. Or herding them." },
        { who: "OKAFOR", text: "Herding? Doc, they're trying to eat the rig." },
        { who: "VOSS", text: "Are they? Or are they running from something worse, and we're just in the way?" }
      ],
      10: [
        { who: "VOSS", text: "I decoded part of the pattern. It's not an attack call, Chief. It's a WARNING. They're screaming at each other to go up, away from—" },
        { who: "SYS", text: "SONAR CONTACT — massive. Rising fast. Designation: THE MAW." },
        { who: "OKAFOR", text: "Whatever drove that thing up here, I don't want to meet it. Guns hot, Chief. Hold the line!" }
      ],
      15: [
        { who: "OKAFOR", text: "Chief... the company uplink went dark an hour ago. No check-in, no weather, nothing. Meridian cut this sector loose." },
        { who: "VOSS", text: "They knew. They must have seen the trench surveys. They left us down here with whatever's climbing up." },
        { who: "OKAFOR", text: "Then we stop waiting for rescue and start planning to survive it. I've got an idea. You're not going to like it." }
      ],
      20: [
        { who: "VOSS", text: "The Dredge — it's not hunting us. Look at the pattern: it eats the drill tailings, the waste heat. We built a feeding station on top of its migration route." },
        { who: "OKAFOR", text: "Save the guilt for later, Doc. Chief, my moon-pool project is ready. It's a lure — built from THEIR signal. I drop it in the trench, and we call whatever's down there UP, into open water, on OUR terms." },
        { who: "VOSS", text: "Are you insane? You don't summon the thing everything else is fleeing! Chief, tell her — we study it, we don't ring the dinner bell!" }
      ],
      25: [
        { who: "SYS", text: "ALLEGANCE — the rig can't stay neutral anymore." },
        { who: "OKAFOR", text: "Chief. The lure is armed. One word and I drop it. We end this on our terms instead of waiting to be eaten in the dark." },
        { who: "VOSS", text: "And if what answers isn't something you can fight? Help me decode the full signal instead. Understanding is the only weapon that works down here." }
      ],
      29: [
        { who: "VOSS", text: "The full signal resolved an hour ago. It's not a warning anymore. It's a map — and a nursery song. Whatever's coming isn't a beast, Chief." },
        { who: "VOSS", text: "It's a thermal vent colossus. A living geothermal engine. And our drills cracked its nursery open two years ago. WE did this." },
        { who: "OKAFOR", text: "Then we finish it. One way or another, wave thirty ends tonight." }
      ]
    },
    taunts: {
      10: [
        { who: "VOSS", text: "Sonar reading: THE MAW. It's... it's not even looking at us. It's looking PAST us, down. It's terrified. Weapons free!" }
      ],
      20: [
        { who: "VOSS", text: "THE DREDGE. It filters the water for our drill waste — we're seasoning its food. It'll tear the hull apart getting to the heat exchangers. Aim for the glow clusters!" }
      ],
      30: [
        { who: "VOSS", text: "It's here. THE HEART OF THE TRENCH. Three thermal chambers — crack them one at a time or it'll vent plasma across the whole rig. This is it, Chief. Everything we've got." },
        { who: "OKAFOR", text: "For the rig! For the crew! HOLD THE LINE!" }
      ]
    },
    allegiance: {
      prompt: "The crew waits. Who do you stand with?",
      options: [
        { id: "voss", label: "Stand with VOSS — decode the signal, no lure.",
          response: [
            { who: "VOSS", text: "Thank you. We'll face it with eyes open." },
            { who: "OKAFOR", text: "...Fine. Your call, Chief. But if understanding fails, my lure's still armed." }
          ] },
        { id: "okafor", label: "Stand with OKAFOR — arm the moon-pool lure.",
          response: [
            { who: "OKAFOR", text: "Good. When it comes up, it'll come up where I want it." },
            { who: "VOSS", text: "I hope you're right. God help us if you're wrong." }
          ] }
      ]
    },
    endings: [
      { id: "seal", title: "SEAL THE TRENCH",
        consequence: "Collapse the vent with the rig's charges. The rig holds — but the colony below starves.",
        text: [
          { who: "SYS", text: "You give the order. The rig's deep charges drop into the vent field and the trench folds in on itself with a sound like the planet clearing its throat." },
          { who: "VOSS", text: "The signal's gone. They're scattering... they'll starve without the vent heat. We survived, Chief. I'm not sure we deserve to." },
          { who: "OKAFOR", text: "The rig holds. The crew's alive. That's the job. That's the whole job." },
          { who: "SYS", text: "ENDING: SEAL THE TRENCH — bittersweet. The rig holds. Somewhere below, the dark goes quiet." }
        ] },
      { id: "feed", title: "FEED THE HEART",
        consequence: "Route the Pressure Core into the trench. Limitless power — but the company will come back for it.",
        text: [
          { who: "SYS", text: "You open the Pressure Core's bypass and feed the Heart directly. The colossus stills... and the rig's gauges climb past every redline into numbers Meridian never dreamed of." },
          { who: "VOSS", text: "It's... calm. It's feeding, and it's letting us feed. A symbiosis. Do you understand what we've found down here?" },
          { who: "OKAFOR", text: "I understand the uplink just came back online. Meridian saw the power spike. They're already sending a fleet, Chief. Enjoy the quiet while it lasts." },
          { who: "SYS", text: "ENDING: FEED THE HEART — open-ended. The rig will never want for power again. Neither will anyone who takes it from you." }
        ] },
      { id: "descend", title: "DESCEND",
        consequence: "Take the moon-pool lure down yourself. The signal resolves into coordinates.",
        text: [
          { who: "SYS", text: "You clip the lure to your own harness, step into the moon pool, and drop — past the rig lights, past the last sonar ping, into the living dark." },
          { who: "VOSS", text: "(over the comm, fading) Chief... the pattern's resolving... it's not a warning, it's not a map, it's— those are COORDINATES. Chief? CHIEF—" },
          { who: "SYS", text: "The signal takes you gently, the way the trench takes everything: completely. Far below, something vast turns toward you — and begins, at last, to speak." },
          { who: "SYS", text: "ENDING: DESCEND — mystery. The coordinates point somewhere no chart has ever named." }
        ] }
    ]
  };
  root.DeepStory = STORY;
})(typeof self !== "undefined" ? self : this);
