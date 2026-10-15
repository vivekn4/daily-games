/* COLD LEAD — dialogue.js : interrogation engine.
   Topics x Approaches against suspect personalities. State-driven, Node-safe. */
"use strict";
(function () {
  var TOPICS = ["alibi", "motive", "victim", "others", "secret"];

  var TONE = {
    cooperative: { open: "Sure, detective. Ask away.", press: "Hey — I'm cooperating here!", crack: "…All right. All right! I'll tell you." },
    nervous: { open: "I—I already told the officers everything.", press: "Please, I can't— I need a lawyer? No, no, I'm fine—", crack: "Don't look at me like that! Fine, listen…" },
    hostile: { open: "Make it quick. I got nothing to say to cops.", press: "You got a warrant for these questions, or just a big mouth?", crack: "…Tch. Fine. But this stays between us." },
    slick: { open: "Detective. Charmed, I'm sure.", press: "Careful. My attorney loves this kind of fishing.", crack: "Well played. Off the record, then…" }
  };

  // Build the factual answer for a topic (slots filled from case + suspect)
  function factFor(topic, suspect, cs, rng) {
    var v = cs.victim;
    switch (topic) {
      case "alibi":
        return { claim: "I " + suspect.alibi + ".", truth: suspect.alibiTrue,
          contra: suspect.alibiTrue ? null : "their alibi doesn't hold" };
      case "motive":
        if (suspect.motiveStrength === "none")
          return { claim: "Motive? I had no quarrel with " + v.name + ".", truth: true, contra: null };
        return { claim: "So we argued. That doesn't make me a killer.", truth: true, contra: "motive: " + suspect.motive };
      case "victim":
        return { claim: v.name + " was " + (rng.chance(0.5) ? "well-liked, far as I knew." : "trouble. Everybody knew it."),
          truth: true, contra: null };
      case "others": {
        var other = rng.pick(cs.suspects.filter(function (s) { return s.id !== suspect.id; }));
        return { claim: "Ask " + other.name + " where they were. That one's hiding something.",
          truth: true, contra: null, deflectTo: other.id };
      }
      case "secret":
        return { claim: "Everyone's got secrets, detective. Mine's my own.", truth: false, contra: "secret: " + suspect.secret };
    }
    return { claim: "…", truth: true, contra: null };
  }

  // One interrogation exchange. Returns {lines:[], effects:{...}}.
  // approach: 'press' | 'empathize' | 'bluff'; bluffClue: clue object or null
  function exchange(suspect, topic, approach, bluffClue, cs, rng, state) {
    var lines = [], fx = { composure: 0, reveal: null, lock: false, credibility: 0, crack: false };
    var tone = TONE[suspect.personality];
    var fact = factFor(topic, suspect, cs, rng);

    if (suspect.locked) {
      lines.push(suspect.name + ": \"My lawyer does my talking now, detective.\"");
      return { lines: lines, effects: fx };
    }

    if (approach === "bluff") {
      if (!bluffClue) { lines.push("You need a piece of evidence to bluff with."); return { lines: lines, effects: fx }; }
      var hits = bluffHits(bluffClue, suspect, topic, cs);
      if (hits) {
        fx.crack = true; fx.reveal = fact.contra || ("cracked: " + topic);
        lines.push("You slide the " + bluffClue.title.toLowerCase() + " across the table.");
        lines.push(suspect.name + ": \"" + tone.crack + "\"");
        lines.push("Revealed: " + (fact.contra || "they break"));
        suspect.cracked = true;
      } else {
        fx.credibility = -1;
        lines.push("You push the " + bluffClue.title.toLowerCase() + " forward. It lands flat.");
        lines.push(suspect.name + ": \"Is that supposed to mean something?\" (Credibility −1)");
      }
      return { lines: lines, effects: fx };
    }

    if (approach === "press") {
      var risk = suspect.personality === "hostile" ? 0.45 : suspect.personality === "slick" ? 0.35 : 0.2;
      fx.composure = -(12 + rng.int(0, 10));
      lines.push("You lean in. \"" + pressQ(topic, suspect, cs) + "\"");
      if (suspect.composure + fx.composure < 18 && rng.chance(risk)) {
        fx.lock = true; suspect.locked = true;
        lines.push(suspect.name + ": \"" + tone.press + " I'm done talking. Lawyer. Now.\"");
        lines.push("⚠ " + suspect.name + " has lawyered up — no more questions tonight.");
      } else {
        lines.push(suspect.name + ": \"" + fact.claim + "\"");
        if (topic === "secret" || (topic === "motive" && suspect.motiveStrength !== "none" && rng.chance(0.5))) {
          fx.reveal = fact.contra; if (fact.contra) lines.push("Noted: " + fact.contra);
        }
      }
      return { lines: lines, effects: fx };
    }

    // empathize
    var warm = suspect.personality === "nervous" || suspect.personality === "cooperative";
    fx.composure = warm ? 10 : 4;
    lines.push("You soften your voice. \"" + empathQ(topic, suspect, cs) + "\"");
    lines.push(suspect.name + ": \"" + fact.claim + "\"");
    if (warm && rng.chance(0.55) && fact.contra) {
      fx.reveal = fact.contra; lines.push("They let slip: " + fact.contra);
    } else if (!warm && rng.chance(0.2) && fact.contra) {
      fx.reveal = fact.contra; lines.push("A flicker: " + fact.contra);
    }
    return { lines: lines, effects: fx };
  }

  function bluffHits(clue, suspect, topic, cs) {
    // a bluff lands if the clue points at this suspect (or exonerates someone else
    // while pressing motive/alibi), matching the topic loosely
    if (clue.pointsTo === suspect.id) return true;
    if (clue.exonerates && clue.exonerates !== suspect.id && (topic === "alibi" || topic === "others")) return true;
    if (clue.tags && clue.tags.indexOf("composer") >= 0) return false;
    return false;
  }

  function pressQ(topic, suspect, cs) {
    var v = cs.victim.name;
    return {
      alibi: "Let's go over that alibi again. Slowly this time.",
      motive: "You and " + v + " — I hear there was bad blood. Talk.",
      victim: "What was " + v + " to you, really?",
      others: "Who here do YOU think did it? No games.",
      secret: "Everybody's hiding something. What's yours?"
    }[topic];
  }
  function empathQ(topic, suspect, cs) {
    var v = cs.victim.name;
    return {
      alibi: "I know it's been a long night. Just walk me through where you were.",
      motive: "Whatever happened between you and " + v + " — I want your side.",
      victim: "Tell me about " + v + ". Help me understand them.",
      others: "Off the record — who should I be looking at?",
      secret: "Something's weighing on you. You can tell me."
    }[topic];
  }

  globalThis.ColdLeadDialogue = {
    TOPICS: TOPICS, exchange: exchange, pressQ: pressQ, empathQ: empathQ
  };
})();
