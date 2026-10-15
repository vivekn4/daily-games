/* LANTERNVALE js/voiceover.js — pre-generated human narration wiring.
   Plays audio/vo/<id>.mp3 for the 17 story beats; speechSynthesis fallback
   (text only) when a clip is missing. Never the primary voice.
   API: window.VoiceOver.play(id) | .stop() | .setEnabled(b) | .speakText(t) */
(function () {
  "use strict";
  var enabled = true, current = null;

  var FALLBACK = {
    intro: "Vale's Edge. Five dark towers. One unfinished map. And a note in Alda's handwriting: Finish the map. Light the towers. Come home by the long way.",
    tower1: "Tower one. The brazier catches, and light spills down the pasture like something the valley has been holding in.",
    tower2: "Tower two. The grove exhales as the light takes. Two beacons now, answering each other across the trees.",
    tower3: "Tower three. From the east bank, the river runs copper under the new light. Three lights. The valley looks stitched together.",
    tower4: "Tower four. The deep light pulses below — blue, patient, older than the tower. The hollow holds its breath with you.",
    tower5: "The last brazier. Five lights in a string along the dark valley — and between them, answering back, the deep blue of the bloom.",
    deep_hollow: "Past the hollow mouth, the dark goes down like water. Then — blue. Bloom after bloom, opening in the black.",
    journal_reveal: "A second journal, in Alda's hand. I dimmed the towers myself, one per season. So travelers would slow down. So they'd meet everyone I loved here.",
    wewake_walk: "Wewake walks with you a while, and talks about Alda as a young mapmaker. You're drawing the third kind of map now, lass. How it feels. The rarest kind.",
    ending_cartographer: "The cartographer's ending. Your finished map hangs in the Lantern Inn, and travelers use it for years.",
    ending_longway: "The long way home. You stay the winter, and the valley keeps you the way it keeps its river — without asking.",
    ending_deeplight: "The deep light. You leave the last tower dark on purpose, and map the dark instead.",
    ending_quiet: "Not every walk ends in a flourish. Some end in good boots and a quiet evening. I carved my initials next to Alda's and walked home the long way.",
    vipul_dusk: "I stood with Vipul under the third tower while dusk settled. Forty years he'd watched that light from the water. He'd never once stood under it. Be kinder than the river was to me, he said.",
    hollow_promise: "Meera took me to the mother cluster — the oldest bloom in the hollow — and asked me for a promise. Just to decide looking at the bloom, not at the map. I promised.",
    star_map: "I lay on the cold stone of the ridge and named the stars after everyone. Wewake, low and stubborn. Meera, bright. Vipul, flickering. Dev, warm. Shivangi, holding her breath. And Alda — the dark between them, the map you navigate by.",
    lambing: "The lamb came just after midnight — grey as dusk, loud as a bell. Wewake laughed quietly into his sleeve. This is what he does. He stays."
  };

  function stopCurrent() {
    if (current) { try { current.pause(); } catch (e) {} current = null; }
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
  }

  function speakText(text) {
    if (!enabled || !text) return;
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95; u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  window.VoiceOver = {
    setEnabled: function (b) { enabled = !!b; if (!enabled) stopCurrent(); },
    isEnabled: function () { return enabled; },
    stop: stopCurrent,
    speakText: speakText,
    play: function (id) {
      stopCurrent();
      if (!enabled || !id) return;
      var done = false;
      try {
        var a = new Audio("audio/vo/" + id + ".mp3");
        current = a;
        a.addEventListener("error", function () {
          if (done) return; done = true;
          if (current === a) current = null;
          speakText(FALLBACK[id]);
        });
        var pr = a.play();
        if (pr && pr.catch) pr.catch(function () {
          if (done) return; done = true;
          if (current === a) current = null;
          speakText(FALLBACK[id]);
        });
        a.addEventListener("ended", function () { if (current === a) current = null; });
      } catch (e) { speakText(FALLBACK[id]); }
    }
  };
})();
