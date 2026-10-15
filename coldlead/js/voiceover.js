/* COLD LEAD — human voiceover module.
 * Pre-generated narration clips (Meta AI TTS, "Lily" voice) for key story beats.
 * Respects the game's narration on/off toggle; falls back to speechSynthesis
 * only when a clip is missing or fails to load.
 *
 * INTEGRATION (see VOICEOVER.md): the game wires M.narrate() call sites to
 * VoiceOver.play(id). This file is standalone — no changes to existing code.
 */
(function () {
  "use strict";

  var BASE = "audio/vo/";

  // Clip id -> filename
  var CLIPS = {
    intro: "intro.mp3",
    night1: "night1.mp3",
    night2: "night2.mp3",
    night3: "night3.mp3",
    night4: "night4.mp3",
    night5: "night5.mp3",
    composer_key: "composer_key.mp3",
    composer_confront: "composer_confront.mp3",
    ending_dawnbringer: "ending_dawnbringer.mp3",
    ending_ashen: "ending_ashen.mp3",
    ending_inkbound: "ending_inkbound.mp3"
  };

  var enabled = true;          // mirrors settings.narrate (set via setEnabled)
  var cache = {};              // id -> HTMLAudioElement
  var current = null;          // currently playing element
  var fallbackText = {};       // id -> text for speechSynthesis fallback (set via setFallbackText)

  function el(id) {
    try {
      if (!cache[id] && CLIPS[id]) {
        var a = new Audio();
        a.preload = "auto";
        var inline = globalThis.__CL_VO_DATA && globalThis.__CL_VO_DATA[id];
        a.src = inline || (BASE + CLIPS[id]);
        cache[id] = a;
      }
      return cache[id] || null;
    } catch (e) { return null; }
  }

  function stop() {
    try {
      if (current) { current.pause(); current.currentTime = 0; }
      current = null;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    } catch (e) {}
  }

  // Play a clip by id. Returns true if a clip was started.
  function play(id) {
    stop();
    if (!enabled) return false;
    var a = el(id);
    if (a) {
      try {
        current = a;
        a.currentTime = 0;
        var p = a.play();
        if (p && p.catch) p.catch(function () { speakFallback(id); });
        return true;
      } catch (e) { /* fall through to fallback */ }
    }
    speakFallback(id);
    return false;
  }

  function speakFallback(id) {
    try {
      var text = fallbackText[id];
      if (!text || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0; u.pitch = 0.85;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function preload() {
    try {
      Object.keys(CLIPS).forEach(function (id) { el(id); });
    } catch (e) {}
  }

  function setEnabled(v) { enabled = !!v; if (!enabled) stop(); }
  function isEnabled() { return enabled; }
  function setFallbackText(map) { try { fallbackText = map || {}; } catch (e) {} }

  // Ending-choice id ("arrest"|"walk"|"deal") -> voiceover clip id
  var ENDING_VO = { arrest: "ending_dawnbringer", walk: "ending_ashen", deal: "ending_inkbound" };
  function playEnding(choiceId) { return play(ENDING_VO[choiceId] || "ending_ashen"); }

  try {
    window.VoiceOver = {
      CLIPS: CLIPS,
      play: play,
      playEnding: playEnding,
      stop: stop,
      preload: preload,
      setEnabled: setEnabled,
      isEnabled: isEnabled,
      setFallbackText: setFallbackText
    };
  } catch (e) {}
})();
