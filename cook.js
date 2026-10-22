/* Cook mode: a full-screen stove for one dish.
   - "Start cooking" on a dish opens it. The method is split into short steps (from the recipe wording);
     each step with cooking time has its own timer, the flame to use, and what to look for ("ready when...").
   - When a timer ends it beeps (even if the pot's sounds are off), vibrates, and asks "Is it ready?":
     "Yes" starts the next step in one tap, "Not yet" gives it 5 more minutes. Halfway it nudges you with a tip.
   - "Cooking rice, roti or chai too?" adds a second thing on the stove. You pick how long it needs, and
     whether to start it now or "finish together": it counts down to when to put it on so it is ready
     at the same time as the dish.
   - Timers use real clock times, so they stay right if the phone sleeps. They survive a page refresh,
     and when cook mode is closed a small bar shows the next alarm and opens it again.
   - Step times, flame and "ready when" lines are worked out from each recipe's wording, so they are good
     guesses, not measurements. */
function cookBtn(name, cls) {
  var ru = typeof lang !== "undefined" && lang !== "en";
  return '<button type="button" class="' + (cls || "share") + ' ckgo" data-cook="' + String(name).replace(/"/g, "&quot;") + '">▶ ' + (ru ? "Pakana shuru karein" : "Start cooking") + "</button>";
}
(function () {
  "use strict";
  var KEY = "cwwhy_cook", MAXSIDE = 3;
  var S = null, root = null, dock = null, shown = false, sheet = null, iv = 0, lock = null, actx = null, titled = false;
  function L() { return typeof lang !== "undefined" && lang !== "en" ? "ru" : "en"; }

  var TX = {
    en: {
      go: "Start cooking", back: "Back to the recipe", ready: "Ready by about", voice: "Read aloud", voiceOn: "Reading aloud", step: "Step", of: "of",
      low: "Low flame", med: "Medium flame", high: "High flame", lid: " · lid on", idle: function (m) { return "Tap play to start " + m + " min"; },
      cooking: "Cooking. Tap pause to stop.", paused: "Paused", done: "Done", readyWhen: "Ready when", less: "One minute less", more: "One minute more",
      start: "Start timer", pause: "Pause", resume: "Resume", again: "Start again", timesUp: "Time's up!", isReady: "Is it ready?", check: "Check that",
      yesT: function (n, m) { return "Yes, start step " + n + " · " + m + " min"; }, yesG: function (n) { return "Yes, go to step " + n; }, yesA: "Yes, all done",
      now: function (t) { return "Now: " + t; }, notYet: "Not yet, give it 5 more minutes", nextStep: "Done · next step", lastStep: "All done",
      finished: "Khana tayyar hai. Enjoy!", closeIt: "Close", recipe: "The recipe", along: "Alongside", add: "Cooking rice, roti or chai too?",
      halfway: "Halfway.", stepHalf: function (n) { return "Step " + n + ", halfway."; }, nameHalf: function (n) { return n + ", halfway."; }, gotIt: "Got it",
      sTitle: "What else is on the stove?", howLong: "How long?", when: "When should it start?", startNow: "Start now", startNowSub: "The timer starts as soon as you add it.",
      tog: "Finish together", togSub: function (t, d) { return "Put it on in " + t + ", so it is ready with " + d + "."; }, togNo: function (d) { return d + " finishes first, so this would start now."; },
      addTog: function (t) { return "Add · put it on in " + t; }, addNow: "Add and start now", putIn: "Put it on in", readyWith: function (d) { return "Ready together with " + d; },
      putOn: function (n) { return "Put the " + n + " on now"; }, thenTap: "Then tap the button", itsOn: "It's on", cookingS: "Cooking", sDone: "Done!", takeOff: "Take it off",
      minShort: "min", remove: "Remove this timer", clear: "Stop cooking and clear timers", clearQ: "Stop cooking and clear all timers?", close: "Close",
      dockNext: function (t) { return "Next alarm in " + t; }, dockRing: "Time's up", dockPaused: "Timers paused", open: "Open", minutes: "min", mins: "min"
    },
    ru: {
      go: "Pakana shuru karein", back: "Wapas recipe par", ready: "Tayyar hoga lagbhag", voice: "Awaaz", voiceOn: "Awaaz on", step: "Qadam", of: "/",
      low: "Halki aanch", med: "Darmiyani aanch", high: "Tez aanch", lid: " · dhakkan band", idle: function (m) { return m + " min shuru karne ke liye play dabayein"; },
      cooking: "Pak raha hai. Rokne ke liye pause dabayein.", paused: "Ruka hua", done: "Ho gaya", readyWhen: "Tayyar jab", less: "Ek minute kam", more: "Ek minute zyada",
      start: "Timer chalayein", pause: "Rokein", resume: "Phir chalayein", again: "Dobara shuru", timesUp: "Waqt khatam!", isReady: "Kya tayyar hai?", check: "Dekhein ke",
      yesT: function (n, m) { return "Haan, qadam " + n + " shuru · " + m + " min"; }, yesG: function (n) { return "Haan, qadam " + n + " par jayein"; }, yesA: "Haan, sab ho gaya",
      now: function (t) { return "Ab: " + t; }, notYet: "Abhi nahi, 5 minute aur dein", nextStep: "Ho gaya · agla qadam", lastStep: "Sab ho gaya",
      finished: "Khana tayyar hai. Enjoy!", closeIt: "Band karein", recipe: "Recipe", along: "Saath mein", add: "Chawal, roti ya chai bhi bana rahe hain?",
      halfway: "Aadha waqt.", stepHalf: function (n) { return "Qadam " + n + ", aadha waqt."; }, nameHalf: function (n) { return n + ", aadha waqt."; }, gotIt: "Theek hai",
      sTitle: "Choolhe par aur kya hai?", howLong: "Kitna waqt?", when: "Kab shuru karein?", startNow: "Abhi shuru", startNowSub: "Add karte hi timer shuru ho jayega.",
      tog: "Saath tayyar", togSub: function (t, d) { return t + " baad chadhayein, taake " + d + " ke saath tayyar ho."; }, togNo: function (d) { return d + " pehle tayyar hoga, is liye yeh abhi shuru hoga."; },
      addTog: function (t) { return "Add · " + t + " baad chadhayein"; }, addNow: "Add karein aur abhi shuru", putIn: "Chadhane mein", readyWith: function (d) { return d + " ke saath tayyar"; },
      putOn: function (n) { return n + " abhi chadhayein"; }, thenTap: "Phir button dabayein", itsOn: "Chadh gaya", cookingS: "Pak raha hai", sDone: "Ho gaya!", takeOff: "Utar lein",
      minShort: "min", remove: "Yeh timer hatayein", clear: "Pakana khatam, timers saaf", clearQ: "Pakana khatam karke sab timers saaf karein?", close: "Band karein",
      dockNext: function (t) { return "Agla alarm " + t + " mein"; }, dockRing: "Waqt khatam", dockPaused: "Timers ruke hue", open: "Kholein", minutes: "min", mins: "min"
    }
  };
  function X() { return TX[L()]; }
  var KINDS = [
    { id: "rice", en: "Rice", ru: "Chawal", min: 12, opts: [10, 12, 15, 20], cue: "the grains are soft", mid: "Check the water level." },
    { id: "roti", en: "Roti", ru: "Roti", min: 10, opts: [6, 10, 15], cue: "they puff up and brown in spots", mid: "" },
    { id: "chai", en: "Chai", ru: "Chai", min: 8, opts: [5, 8, 10], cue: "it turns a deep colour", mid: "" },
    { id: "daal", en: "Daal", ru: "Daal", min: 30, opts: [20, 30, 45], cue: "the daal is soft and blends easily", mid: "Give it a stir so it does not stick." },
    { id: "other", en: "Other dish", ru: "Aur kuch", min: 10, opts: [5, 10, 15, 30], cue: "it looks done", mid: "" }
  ];
  function kind(id) { for (var i = 0; i < KINDS.length; i++) if (KINDS[i].id === id) return KINDS[i]; return KINDS[4]; }
  function kname(id) { return kind(id)[L()]; }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(sec) {
    sec = Math.max(0, Math.ceil(sec - 1e-6));
    var h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
    return h ? h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s : m + ":" + (s < 10 ? "0" : "") + s;
  }
  function clock(sec) { return new Date(Date.now() + sec * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  function now() { return Date.now(); }

  /* ---------- recipe -> steps ---------- */
  var SC = {};
  function shortOf(t) {
    var s = t.replace(/[.!?]+$/, "").replace(/\s*\(.*?\)\s*/g, " ").split(/\s+(?:with|and|until|then|in|on|for|over|into)\s+|,/i)[0].trim();
    var w = s.split(/\s+/).slice(0, 3).join(" ");
    return w.length > 16 ? w.slice(0, 15) + "…" : w;
  }
  function cueFix(c) {
    if (/^(the|a|an|no|it|they|you|all|both)\b/i.test(c) || /\b(is|are|rise|rises|separate|separates|turn|turns|puff|puffs|thicken|thickens|reduce|reduces|dries|melts|leaves)\b/i.test(c)) return c;
    return "it is " + c;
  }
  function mkStep(t, secs) {
    var lid = /\b(cover(ed)?|lid|dum|steam(ed)?)\b/i.test(t) && !/\buncover/i.test(t);
    var low = /\b(simmer|on low|low (flame|heat)|dum|slow(ly)?)\b|until (nearly |almost )?(tender|soft)/i.test(t), high = /\b(high (flame|heat)|on high|stir-fry|deep-fry|sear|char)\b/i.test(t);
    var lvl = !secs ? 0 : high ? 3 : (low || lid) ? 1 : 2, cue = "", mid = "";
    if (secs) {
      var m = /until ([^.;,(]+)/i.exec(t);
      cue = m ? cueFix(m[1].trim()) : /fry|brown|saut|bhun|tarka|tadka/i.test(t) ? "it smells fragrant and turns golden" : /boil/i.test(t) ? "it is boiling steadily" : /simmer|cook|dum|steam/i.test(t) ? "it is cooked through" : "it looks done";
    }
    if (secs >= 300) {
      mid = /fry|brown|saut|bhun|tarka|tadka/i.test(t) ? "Stir so it does not catch at the bottom." : /boil/i.test(t) ? "Check the water level." : (lid || /simmer|cook/i.test(t)) ? "Give it a stir. Add a splash of water if it looks dry." : "";
    }
    return { text: t, secs: secs, lvl: lvl, lid: lid && !!secs, cue: cue, mid: mid, short: shortOf(t) };
  }
  function dishSteps(d) {
    if (SC[d[0]]) return SC[d[0]];
    var parts = [];
    (how(d).match(/[^.!?]+[.!?]*/g) || []).forEach(function (s) {
      s.split(/;\s*|,\s*(?:and\s+)?then\s+|,\s+(?=add\s)|\s+and\s+(?=(?:boil|simmer|bake|grill|steam)\b)/i).forEach(function (p) {
        p = p.trim().replace(/[.!?,]+$/, "");
        if (p) parts.push(p.charAt(0).toUpperCase() + p.slice(1) + ".");
      });
    });
    var LONG = /until (?:tender|soft|cooked|done|thick|the oil|the daal|it thickens|dry|reduced)|simmer|pressure|\bdum\b|on low|covered|cover and|\bbake|\broast|slow|\bcook (?:the )?(?:chicken|gosht|qeema|keema|mutton|beef|meat|daal|chanay|chickpeas)/i;
    var QUICK = /stir-fry|\btoss|on high|until glossy|scrambl|tarka|tadka|\bmelt|\bheat (?:the )?(?:oil|ghee|butter|pan)/i;
    var COOK = /\b(?:fry|fried|boil|cook|brown|steam|grill|toast|saut|bhun|caramel|reduce|thicken|poach|char|sear)|\bmake .*\b(?:gravy|halwa|sauce|syrup|custard)/i;
    var PREP = /\b(?:knead|mix|chop|marinate|shape|grate|blend|whisk|beat|slice|wash|rinse|peel|soak|stuff|roll)/i;
    var steps = parts.map(function (t) {
      var s = 0, m, re = /(\d+(?:\.\d+)?)(?:\s*(?:to|-|–|or)\s*\d+(?:\.\d+)?)?\s*(?:more\s+)?(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;
      while ((m = re.exec(t))) s += parseFloat(m[1]) * (/^s/i.test(m[2]) ? 1 : /^h/i.test(m[2]) ? 3600 : 60);
      var k = s || /^serve/i.test(t) ? "" : /overnight/i.test(t) ? "prep" : LONG.test(t) ? "long" : QUICK.test(t) ? "quick" : COOK.test(t) ? "cook" : PREP.test(t) ? "prep" : "";
      return { t: t, s: s >= 60 ? Math.round(s / 60) * 60 : Math.round(s), k: k };
    });
    function n(k) { return steps.filter(function (x) { return x.k === k; }).length; }
    var fix = steps.reduce(function (a, x) { return a + x.s; }, 0) / 60, share = d[2] - fix - 5 * (n("prep") + n("quick"));
    steps.forEach(function (x) {
      var m = x.k === "quick" ? 5 : x.k === "cook" ? (n("long") ? 5 : Math.max(5, Math.min(20, share / n("cook")))) : x.k === "long" ? Math.max(10, Math.min(240, (share - 5 * n("cook")) / n("long"))) : 0;
      if (m) x.s = (m < 10 ? Math.round(m) : Math.round(m / 5) * 5) * 60;
    });
    return (SC[d[0]] = steps.map(function (x) { return mkStep(x.t, x.s); }));
  }
  function findDish(name) { for (var i = 0; i < D.length; i++) if (D[i][0] === name) return D[i]; return null; }

  /* ---------- session ---------- */
  function newSession(name) {
    var d = findDish(name); if (!d) return null;
    var steps = dishSteps(d);
    return {
      dish: name, steps: steps, cur: 0, voice: false, nudge: null, ringSince: 0, alarmAt: 0, sides: [],
      t: steps.map(function (s) { return { st: "idle", dur: s.secs, left: s.secs, end: 0, nudged: false }; })
    };
  }
  function rem(t) { return t.st === "run" ? Math.max(0, (t.end - now()) / 1000) : t.left; }
  function mainLeft() { var a = 0; S.steps.forEach(function (s, i) { if (S.t[i].st !== "done") a += rem(S.t[i]); }); return a; }
  function sideRem(sd) { return sd.phase === "run" ? Math.max(0, (sd.end - now()) / 1000) : sd.phase === "pause" ? sd.left : 0; }
  function waitSecs(sd) { return Math.max(0, mainLeft() - sd.dur); }
  function horizon() {
    var h = mainLeft();
    S.sides.forEach(function (sd) {
      var v = sd.phase === "wait" ? waitSecs(sd) + sd.dur : sd.phase === "due" ? sd.dur : (sd.phase === "run" || sd.phase === "pause") ? sideRem(sd) : 0;
      if (v > h) h = v;
    });
    return h;
  }
  function ringing() {
    if (!S) return false;
    for (var i = 0; i < S.t.length; i++) if (S.t[i].st === "ring") return true;
    for (var j = 0; j < S.sides.length; j++) if (S.sides[j].phase === "due" || S.sides[j].phase === "ring") return true;
    return false;
  }
  function running() {
    if (!S) return false;
    for (var i = 0; i < S.t.length; i++) if (S.t[i].st === "run") return true;
    for (var j = 0; j < S.sides.length; j++) if (S.sides[j].phase === "run" || S.sides[j].phase === "wait") return true;
    return false;
  }
  function active() {
    if (!S) return false;
    for (var i = 0; i < S.t.length; i++) if (S.t[i].st === "run" || S.t[i].st === "pause" || S.t[i].st === "ring") return true;
    return S.sides.length > 0;
  }
  function nextAlarm() {
    var a = null;
    function take(v) { if (a === null || v < a) a = v; }
    S.t.forEach(function (t) { if (t.st === "run") take(rem(t)); });
    S.sides.forEach(function (sd) { if (sd.phase === "wait") take(waitSecs(sd)); else if (sd.phase === "run") take(sideRem(sd)); });
    return a;
  }
  function allDone() {
    return S.t[S.t.length - 1].st === "done" && !S.t.some(function (t) { return t.st === "run" || t.st === "pause" || t.st === "ring"; });
  }

  /* ---------- storage ---------- */
  function save() {
    try {
      if (!S || !active()) { localStorage.removeItem(KEY); return; }
      localStorage.setItem(KEY, JSON.stringify({ dish: S.dish, cur: S.cur, t: S.t, sides: S.sides, voice: S.voice, at: now() }));
    } catch (e) {}
  }
  function restore() {
    try {
      var j = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!j || now() - j.at > 8 * 3600 * 1000) { localStorage.removeItem(KEY); return; }
      var s = newSession(j.dish);
      if (!s || !j.t || j.t.length !== s.steps.length) { localStorage.removeItem(KEY); return; }
      s.t = j.t; s.sides = j.sides || []; s.cur = j.cur || 0; s.voice = !!j.voice;
      S = s;
      if (!active()) { S = null; localStorage.removeItem(KEY); }
    } catch (e) { S = null; }
  }

  /* ---------- sound, voice, screen ---------- */
  function ac() {
    if (!actx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { actx = new C(); } catch (e) { return null; } }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(f, at, d, v) {
    var a = ac(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), s = a.currentTime + at;
    o.type = "triangle"; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, s); g.gain.exponentialRampToValueAtTime(v, s + .012); g.gain.exponentialRampToValueAtTime(.0001, s + d);
    o.connect(g); g.connect(a.destination); o.start(s); o.stop(s + d + .03);
  }
  function alarm() { [0, .26, .52, .78].forEach(function (t) { tone(1500, t, .22, .14); }); try { navigator.vibrate && navigator.vibrate([200, 100, 200, 100, 400]); } catch (e) {} }
  function ding() { tone(880, 0, .4, .1); tone(1320, .16, .5, .08); }
  function say(t, force) {
    if (!S || (!force && !S.voice)) return;
    try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t); u.rate = .95; speechSynthesis.speak(u); } catch (e) {}
  }
  function awake() {
    try {
      var on = running();
      if (on && !lock && navigator.wakeLock && document.visibilityState === "visible") {
        navigator.wakeLock.request("screen").then(function (l) { lock = l; l.addEventListener("release", function () { lock = null; }); }).catch(function () {});
      } else if (!on && lock) { var l = lock; lock = null; l.release(); }
    } catch (e) {}
  }

  /* ---------- drawing ---------- */
  var FLAME = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="#E8743B"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z"></path></svg>';
  function flameLabel(s) { var x = X(); return [x.low, x.low, x.med, x.high][s.lvl] + (s.lid ? x.lid : ""); }
  function potSvg(lvl, lit, lid, bub, px) {
    var Lh = [0, 7, 12, 18][lvl] || 10, W = [0, 4, 5, 6][lvl] || 5;
    var d = "M100 30 C " + (100 + W) + " " + (30 - Lh * .4) + " " + (100 + W * .4) + " " + (30 - Lh * .9) + " 100 " + (30 - Lh) + " C " + (100 - W * .4) + " " + (30 - Lh * .9) + " " + (100 - W) + " " + (30 - Lh * .4) + " 100 30 Z";
    var fl = "";
    if (lit) for (var a = 0; a < 12; a++) fl += '<g transform="rotate(' + (a * 30) + ' 100 100)"><path class="ck-fl" d="' + d + '" fill="' + (a % 2 ? "#E8743B" : "#F2C14E") + '"/></g>';
    var b = bub ? '<circle class="ck-bb" cx="84" cy="88" r="7" fill="#C97B4E"/><circle class="ck-bb" cx="116" cy="104" r="6" fill="#C97B4E" style="animation-delay:.6s"/><circle class="ck-bb" cx="96" cy="120" r="5" fill="#C97B4E" style="animation-delay:1.1s"/>' : "";
    var l = lid ? '<circle cx="100" cy="100" r="63" fill="#5A4D46"/><circle cx="100" cy="100" r="52" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2"/><circle cx="100" cy="100" r="9" fill="#C0392B"/>' : "";
    return '<svg viewBox="0 0 200 200" width="' + px + '" height="' + px + '" aria-hidden="true"><circle cx="100" cy="100" r="94" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="2"/>' + fl +
      '<circle cx="100" cy="100" r="70" fill="#4A3F39"/><circle cx="100" cy="100" r="60" fill="#8E4524"/><circle cx="112" cy="80" r="9" fill="#D9B77E"/><circle cx="82" cy="112" r="8" fill="#D9B77E"/><circle cx="98" cy="96" r="6" fill="#5B2A16"/>' + b + l + "</svg>";
  }
  var I = {
    back: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    voice: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    eye: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="#6FCF97" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:1px"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    tip: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M4 20c6-1 10-5 12-12M14 4l4 4"/><path d="M3 21h18"/></svg>',
    plus: '<svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="32" cy="32" r="26" stroke-dasharray="4 5"/><path d="M32 22v20M22 32h20" stroke-width="2.6" stroke-linecap="round"/></svg>'
  };
  function btn(act, k, cls, label, inner) {
    return '<button type="button" class="' + cls + '" data-ck="' + act + '"' + (k != null ? ' data-k="' + esc(k) + '"' : "") + ' data-fk="' + act + ":" + (k == null ? "" : esc(k)) + '"' + (label ? ' aria-label="' + esc(label) + '"' : "") + ">" + inner + "</button>";
  }

  function chipsHtml() {
    var x = X();
    return '<div class="ck-chips">' + S.steps.map(function (s, i) {
      var t = S.t[i], c = "ck-chip" + (i === S.cur ? " cur" : t.st === "done" ? " dn" : t.st === "run" || t.st === "ring" ? " on" : "");
      var top = t.st === "done" ? x.done : t.st === "run" ? fmt(rem(t)) : x.step + " " + (i + 1);
      return btn("chip", i, c, x.step + " " + (i + 1) + ": " + s.short, '<small data-lv="chip:' + i + '">' + top + "</small><span>" + esc(s.short) + "</span>");
    }).join("") + "</div>";
  }
  function panelHtml() {
    var x = X(), i = S.cur, s = S.steps[i], t = S.t[i], n = S.steps.length;
    if (allDone()) {
      return '<section class="ck-panel"><div class="ck-ph"><span class="ck-eb">' + esc(S.dish) + '</span></div><div class="ck-pot">' + potSvg(0, false, false, false, 150) +
        '</div><div class="ck-pc"><div class="ck-fin">' + x.finished + "</div>" + btn("finish", null, "ck-yes", "", x.closeIt) + "</div></section>";
    }
    var ring = t.st === "ring", run = t.st === "run", paused = t.st === "pause";
    var head = '<div class="ck-ph"><span class="ck-eb">' + x.step + " " + (i + 1) + " " + x.of + " " + n + "</span>" + (s.secs ? '<span class="ck-flp">' + FLAME + flameLabel(s) + "</span>" : "") + "</div>";
    var pot = '<div class="ck-pot' + (ring ? " ring" : "") + '">' + potSvg(s.lvl, run, s.lid && !!s.secs, run && !s.lid, 176) + "</div>";
    var body;
    if (ring) {
      var nx = S.steps[i + 1];
      var yes = nx ? (nx.secs ? x.yesT(i + 2, Math.round(nx.secs / 60)) : x.yesG(i + 2)) : x.yesA;
      body = '<div class="ck-tu">' + x.timesUp + '</div><div class="ck-call"><span><b>' + x.isReady + "</b> " + x.check + " " + esc(s.cue) + '.</span></div>' +
        btn("yes", null, "ck-yes hot", "", "<span>" + yes + "</span>" + (nx ? "<small>" + x.now(esc(nx.text)) + "</small>" : "")) + btn("not", null, "ck-not", "", x.notYet);
    } else if (!s.secs) {
      var last = i === n - 1;
      body = '<div class="ck-tx">' + esc(s.text) + "</div>" + btn("next", null, "ck-yes", "", last ? x.lastStep : x.nextStep);
    } else {
      var label = t.st === "done" ? x.again : run ? x.pause : paused ? x.resume : x.start;
      var status = t.st === "done" ? x.done : run ? x.cooking : paused ? x.paused : x.idle(Math.round(t.dur / 60));
      body = '<div class="ck-time" data-lv="time">' + fmt(rem(t)) + '</div><div class="ck-stat">' + status + '</div><div class="ck-tx">' + esc(s.text) + "</div>" +
        '<div class="ck-call">' + I.eye + "<span><b>" + x.readyWhen + "</b> " + esc(s.cue) + "</span></div>" +
        '<div class="ck-ctl">' + btn("minus", null, "ck-pm", x.less, "−1") + btn("toggle", null, "ck-play", label, run ? I.pause : I.play) + btn("plus", null, "ck-pm", x.more, "+1") + "</div>";
    }
    return '<section class="ck-panel' + (ring ? " ring" : "") + '">' + head + pot + '<div class="ck-pc">' + body + "</div></section>";
  }
  function recipeHtml() {
    var x = X();
    return '<div class="ck-rec"><div class="ck-lab">' + x.recipe + "</div>" + S.steps.map(function (s, i) {
      var t = S.t[i], c = "ck-row" + (i === S.cur ? " cur" : "");
      var chip = t.st === "ring" ? x.timesUp : t.st === "done" ? x.done : t.st === "run" ? fmt(rem(t)) : s.secs ? Math.round(t.dur / 60) + " " + x.minShort : "";
      var meta = s.secs ? flameLabel(s) + " · " + x.readyWhen.toLowerCase() + " " + esc(s.cue) : "";
      return btn("chip", i, c, x.step + " " + (i + 1), '<span class="ck-n' + (t.st === "done" ? " dn" : t.st === "ring" ? " rg" : "") + '">' + (t.st === "done" ? "✓" : i + 1) + '</span><span class="ck-rt"><b>' + esc(s.text) + "</b>" + (meta ? "<small>" + meta + "</small>" : "") + '</span><span class="ck-rc" data-lv="row:' + i + '">' + chip + "</span>");
    }).join("") + "</div>";
  }
  function sideHtml(sd) {
    var x = X(), nm = kname(sd.kind), id = sd.id, hot = sd.phase === "due" || sd.phase === "ring";
    var label = nm + " · " + Math.round(sd.dur / 60) + " " + x.minShort, name, time, note = "", pct = 0, btns;
    var bx = btn("side-x", id, "ck-sx", x.remove, I.x);
    if (sd.phase === "wait") {
      name = x.putIn; time = fmt(waitSecs(sd)); note = x.readyWith(esc(S.dish));
      btns = btn("side-go", id, "ck-sb", "", x.startNow) + bx;
    } else if (sd.phase === "due") {
      name = x.putOn(nm.toLowerCase()); time = "0:00"; note = x.thenTap; pct = 100;
      btns = btn("side-go", id, "ck-sb", "", x.itsOn);
    } else if (sd.phase === "ring") {
      name = x.sDone; time = "0:00"; note = x.check + " " + esc(kind(sd.kind).cue); pct = 100;
      btns = btn("side-done", id, "ck-sb", "", x.takeOff);
    } else {
      var r = sideRem(sd); name = sd.phase === "run" ? x.cookingS : x.paused; time = fmt(r); pct = Math.round((1 - r / sd.dur) * 100);
      btns = btn("side-go", id, "ck-sb", "", sd.phase === "run" ? x.pause : x.resume) + bx;
    }
    return '<div class="ck-sc' + (hot ? " hot" : "") + '"><span class="ck-sl">' + esc(label) + '</span><span class="ck-sn">' + esc(name) + '</span><b class="ck-st" data-lv="st:' + id + '">' + time +
      '</b><div class="ck-sbar"><i data-lb="sb:' + id + '" style="width:' + pct + '%"></i></div><span class="ck-snt">' + (note || "&nbsp;") + '</span><div class="ck-sbs">' + btns + "</div></div>";
  }
  function alongHtml() {
    var x = X();
    return '<div class="ck-along"><div class="ck-lab">' + x.along + '</div><div class="ck-sgrid">' + S.sides.map(sideHtml).join("") +
      (S.sides.length < MAXSIDE ? btn("sheet-open", null, "ck-add", "", I.plus + "<span>" + x.add + "</span>") : "") + "</div></div>";
  }
  function nudgeHtml() {
    if (!S.nudge || ringing() || sheet) return "";
    var x = X();
    return '<div class="ck-nudge" role="status">' + I.tip + "<div><b>" + esc(S.nudge.title) + "</b> " + esc(S.nudge.text) + "</div>" + btn("nudge-x", null, "ck-nx", x.gotIt, x.gotIt) + "</div>";
  }
  function sheetHtml() {
    if (!sheet) return "";
    var x = X(), k = kind(sheet.kind), wait = mainLeft() - sheet.min * 60, tog = wait > 0, mode = tog ? sheet.mode : "now";
    var chips = KINDS.map(function (q) { return btn("sh-kind", q.id, "ck-shc" + (q.id === sheet.kind ? " on" : ""), "", q.id === "other" ? (L() === "ru" ? "Aur" : "Other") : q[L()]); }).join("");
    var pres = k.opts.map(function (m) { return btn("sh-min", m, "ck-shp" + (m === sheet.min ? " on" : ""), "", m + " " + x.minShort); }).join("");
    function mode_(id, title, sub, ok) {
      return '<button type="button" class="ck-shm' + (mode === id ? " on" : "") + '" data-ck="sh-mode" data-k="' + id + '" data-fk="sh-mode:' + id + '"' + (ok ? "" : ' aria-disabled="true"') + '><i></i><span><b>' + title + "</b><small>" + sub + "</small></span></button>";
    }
    return '<div class="ck-shb" data-ck="sheet-x"><div class="ck-sheet" role="dialog" aria-modal="true" aria-label="' + esc(x.sTitle) + '"><div class="ck-sht"><b>' + x.sTitle + "</b>" + btn("sheet-x", null, "ck-ib", x.close, I.x) + "</div>" +
      '<div class="ck-shr">' + chips + '</div><div class="ck-shl"><span>' + x.howLong + '</span><div class="ck-step">' + btn("sh-minus", null, "ck-pm s", x.less, "−") + "<b>" + sheet.min + " " + x.minShort + "</b>" + btn("sh-plus", null, "ck-pm s", x.more, "+") + '</div></div><div class="ck-shr">' + pres + "</div>" +
      '<div class="ck-shl"><span>' + x.when + '</span></div><div class="ck-shg">' + mode_("now", x.startNow, x.startNowSub, true) + mode_("together", x.tog, tog ? x.togSub(fmt(wait), esc(S.dish)) : x.togNo(esc(S.dish)), tog) + "</div>" +
      btn("sh-add", null, "ck-cta", "", mode === "together" ? x.addTog(fmt(wait)) : x.addNow) + "</div></div>";
  }
  function render() {
    if (!S || !root) return;
    if (!shown) { renderDock(); return; }
    var x = X(), fk = null;
    if (document.activeElement && root.contains(document.activeElement)) fk = document.activeElement.getAttribute("data-fk");
    var sc = root.scrollTop;
    root.innerHTML = '<div class="ck-w"><div class="ck-top">' + btn("close", null, "ck-ib", x.back, I.back) + '<div class="ck-ttl"><b>' + esc(S.dish) + "</b><span>" + x.ready + ' <b data-lv="ready">' + clock(horizon()) + "</b></span></div>" +
      '<button type="button" class="ck-vo" data-ck="voice" data-fk="voice:" aria-pressed="' + (S.voice ? "true" : "false") + '">' + I.voice + (S.voice ? x.voiceOn : x.voice) + "</button></div>" +
      '<div class="ck-grid"><main class="ck-main">' + chipsHtml() + panelHtml() + '</main><aside class="ck-aside">' + recipeHtml() + alongHtml() + "</aside></div>" +
      '<button type="button" class="ck-clr" data-ck="clear" data-fk="clear:">' + x.clear + "</button></div>" + nudgeHtml() + sheetHtml();
    root.scrollTop = sc;
    if (fk) { var e = root.querySelector('[data-fk="' + fk + '"]'); if (e) e.focus(); }
    renderDock();
  }
  function renderDock() {
    if (!dock) return;
    var on = S && active() && !shown;
    dock.hidden = !on;
    if (!on) return;
    var x = X(), r = ringing();
    dock.className = "ck-dock" + (r ? " hot" : "");
    dock.innerHTML = '<span class="ck-dd"></span><span class="ck-dt">' + esc(S.dish) + ' · <b data-lv="dock">' + dockText() + '</b></span><span class="ck-do">' + x.open + "</span>";
  }
  function dockText() {
    var x = X();
    if (ringing()) return x.dockRing;
    var a = nextAlarm();
    return a === null ? x.dockPaused : x.dockNext(fmt(a));
  }

  /* ---------- live updates (no re-render) ---------- */
  function live() {
    if (!S) return;
    var x = X(), map = {}, bars = {};
    map.ready = clock(horizon()); map.dock = dockText();
    S.steps.forEach(function (s, i) {
      var t = S.t[i];
      if (t.st === "run") { map["chip:" + i] = fmt(rem(t)); map["row:" + i] = fmt(rem(t)); }
      if (i === S.cur && t.st !== "ring") map.time = fmt(rem(t));
    });
    S.sides.forEach(function (sd) {
      if (sd.phase === "wait") map["st:" + sd.id] = fmt(waitSecs(sd));
      else if (sd.phase === "run") { var r = sideRem(sd); map["st:" + sd.id] = fmt(r); bars["sb:" + sd.id] = Math.round((1 - r / sd.dur) * 100) + "%"; }
    });
    [root, dock].forEach(function (el) {
      if (!el) return;
      var a = el.querySelectorAll("[data-lv]");
      for (var i = 0; i < a.length; i++) { var v = map[a[i].getAttribute("data-lv")]; if (v != null && a[i].textContent !== v) a[i].textContent = v; }
      var b = el.querySelectorAll("[data-lb]");
      for (var j = 0; j < b.length; j++) { var w = bars[b[j].getAttribute("data-lb")]; if (w != null && b[j].style.width !== w) b[j].style.width = w; }
    });
    var n = nextAlarm();
    if (running() && n !== null) { try { document.title = fmt(n) + " · " + T[lang].t; titled = true; } catch (e) {} }
    else if (titled) { titled = false; try { document.title = T[lang].t; } catch (e) {} }
  }
  function tick() {
    if (!S) { clearInterval(iv); iv = 0; return; }
    var t0 = now(), changed = false;
    function startRing() { if (!S.ringSince) S.ringSince = t0; alarm(); S.alarmAt = t0; changed = true; }
    S.steps.forEach(function (s, i) {
      var t = S.t[i]; if (t.st !== "run") return;
      var left = (t.end - t0) / 1000, x = X();
      if (s.mid && s.secs >= 300 && !t.nudged && left > 0 && left <= t.dur / 2) {
        t.nudged = true; S.nudge = { text: s.mid, at: t0, title: i === S.cur ? x.halfway : x.stepHalf(i + 1) }; ding(); say("Halfway. " + s.mid); changed = true;
      }
      if (left <= 0) {
        t.st = "ring"; t.left = 0; S.cur = i; startRing();
        var nx = S.steps[i + 1];
        say("Time's up. Check that " + s.cue + "." + (nx ? " Next: " + nx.text : ""));
      }
    });
    S.sides.forEach(function (sd) {
      var x = X(), nm = kname(sd.kind);
      if (sd.phase === "wait") {
        if (mainLeft() - sd.dur <= 0) { sd.phase = "due"; startRing(); say("Time to put the " + nm.toLowerCase() + " on."); }
      } else if (sd.phase === "run") {
        var left = (sd.end - t0) / 1000, k = kind(sd.kind);
        if (k.mid && !sd.nudged && left > 0 && left <= sd.dur / 2) { sd.nudged = true; S.nudge = { text: k.mid, at: t0, title: x.nameHalf(nm) }; ding(); say(nm + ", halfway. " + k.mid); changed = true; }
        if (left <= 0) { sd.phase = "ring"; startRing(); say(nm + " is done. Check that " + k.cue + "."); }
      }
    });
    if (ringing() && t0 - S.alarmAt >= 3000 && t0 - S.ringSince < 30000) { alarm(); S.alarmAt = t0; }
    if (S.nudge && t0 - S.nudge.at > 15000) { S.nudge = null; changed = true; }
    if (changed) { render(); save(); awake(); } else live();
    if (!active()) { awake(); }
  }
  function ensureTick() { if (!iv) iv = setInterval(tick, 250); }
  function update() {
    if (!S) return;
    if (!ringing()) S.ringSince = 0;
    render(); save(); awake(); ensureTick(); live();
  }

  /* ---------- actions ---------- */
  function startT(t) { t.st = "run"; t.end = now() + t.left * 1000; }
  function curT() { return S.t[S.cur]; }
  function sideById(id) { for (var i = 0; i < S.sides.length; i++) if (S.sides[i].id === id) return S.sides[i]; return null; }
  function act(a, k) {
    ac();
    var x = X();
    if (a === "close") return hide();
    if (a === "reopen") return show();
    if (!S) return;
    if (a === "voice") { S.voice = !S.voice; if (S.voice) say("I will read each step aloud.", true); else { try { speechSynthesis.cancel(); } catch (e) {} } }
    else if (a === "chip") S.cur = +k;
    else if (a === "toggle") {
      var t = curT(), s = S.steps[S.cur]; if (!s.secs) return;
      if (t.st === "run") { t.left = rem(t); t.st = "pause"; }
      else { if (t.st === "done") { t.left = t.dur; t.nudged = false; } startT(t); }
    } else if (a === "minus" || a === "plus") {
      var u = curT(), r = Math.max(60, rem(u) + (a === "plus" ? 60 : -60));
      if (u.st === "run") u.end = now() + r * 1000; else u.left = r;
      u.dur = Math.max(60, u.dur + (a === "plus" ? 60 : -60));
    } else if (a === "yes") {
      var i = S.cur; S.t[i].st = "done";
      var nx = S.steps[i + 1];
      if (nx) { S.cur = i + 1; var nt = S.t[i + 1]; if (nx.secs) { nt.left = nt.dur; nt.nudged = false; startT(nt); } say("Step " + (i + 2) + ". " + nx.text); }
    } else if (a === "not") { var n = curT(); n.left = 300; n.nudged = true; startT(n); }
    else if (a === "next") { var j = S.cur; S.t[j].st = "done"; if (S.steps[j + 1]) S.cur = j + 1; }
    else if (a === "finish") { if (!S.sides.length) return clearAll(); return hide(); }
    else if (a === "clear") { if (confirm(x.clearQ)) clearAll(); return; }
    else if (a === "sheet-open") sheet = { kind: "rice", min: 12, mode: "together" };
    else if (a === "sheet-x") sheet = null;
    else if (a === "sh-kind") { sheet.kind = k; sheet.min = kind(k).min; }
    else if (a === "sh-min") sheet.min = +k;
    else if (a === "sh-minus") sheet.min = Math.max(1, sheet.min - 1);
    else if (a === "sh-plus") sheet.min = Math.min(180, sheet.min + 1);
    else if (a === "sh-mode") { if (k === "together" && mainLeft() - sheet.min * 60 <= 0) return; sheet.mode = k; }
    else if (a === "sh-add") {
      var tog = sheet.mode === "together" && mainLeft() - sheet.min * 60 > 0;
      var sd = { id: sheet.kind + "-" + now().toString(36), kind: sheet.kind, dur: sheet.min * 60, phase: tog ? "wait" : "run", end: 0, left: sheet.min * 60, nudged: false };
      if (!tog) sd.end = now() + sd.dur * 1000;
      S.sides.push(sd); sheet = null;
    } else if (a === "side-go") {
      var g = sideById(k); if (!g) return;
      if (g.phase === "wait" || g.phase === "due") { g.phase = "run"; g.left = g.dur; g.end = now() + g.dur * 1000; }
      else if (g.phase === "run") { g.left = sideRem(g); g.phase = "pause"; }
      else if (g.phase === "pause") { g.phase = "run"; g.end = now() + g.left * 1000; }
    } else if (a === "side-x" || a === "side-done") S.sides = S.sides.filter(function (q) { return q.id !== k; });
    else if (a === "nudge-x") S.nudge = null;
    update();
  }
  function clearAll() {
    S = null; sheet = null; save(); awake();
    if (titled) { titled = false; try { document.title = T[lang].t; } catch (e) {} }
    hide();
  }
  function show() {
    if (!S || !root) return;
    shown = true; root.hidden = false; document.body.style.overflow = "hidden";
    render(); ensureTick(); live();
    var b = root.querySelector('[data-ck="close"]'); if (b) b.focus();
  }
  function hide() {
    shown = false; sheet = null;
    if (root) { root.hidden = true; root.innerHTML = ""; }
    document.body.style.overflow = "";
    renderDock();
    if (S && !active()) { /* nothing running: keep the place but drop the bar */ }
  }
  function open(name) {
    if (S && S.dish !== name && active()) {
      var q = L() === "ru" ? S.dish + " abhi pak raha hai. Uske timers hata kar " + name + " shuru karein?" : S.dish + " is still cooking. Replace it with " + name + "?";
      if (!confirm(q)) return;
    }
    if (!S || S.dish !== name) { S = newSession(name); if (!S) return; }
    show(); save();
  }

  /* ---------- setup ---------- */
  var CSS = ".acts .share.ckprime,.ckprime{background:var(--red);color:#fff;border-color:var(--red);cursor:pointer;font-weight:700}.ckprime:hover{background:#A93226;color:#fff}.pw-tnlink.ckprime{border-radius:999px;padding:0 16px;min-height:44px;text-decoration:none}" +
    "#ck{position:fixed;inset:0;z-index:80;background:#fff;color:var(--ink);overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}#ck[hidden]{display:none}#ck button{font-family:inherit;cursor:pointer}" +
    ".ck-w{max-width:1120px;margin:0 auto;padding:12px 14px calc(28px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:12px}" +
    ".ck-top{display:flex;align-items:center;gap:10px}.ck-ib{width:44px;height:44px;flex:none;border-radius:50%;border:1px solid var(--line);background:#fff;color:var(--ink);display:grid;place-items:center;padding:0}" +
    ".ck-ttl{flex:1;min-width:0}.ck-ttl>b{display:block;font:600 21px/1.1 Fraunces,Georgia,serif}.ck-ttl span{font-size:12.5px;color:var(--mut)}.ck-ttl span b{color:var(--ink)}" +
    ".ck-vo{height:44px;flex:none;display:flex;align-items:center;gap:6px;padding:0 14px;border-radius:999px;border:1.5px solid rgba(43,35,31,.25);background:#fff;color:var(--ink);font-size:12.5px;font-weight:700}.ck-vo[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:#fff}" +
    ".ck-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;align-items:start}.ck-main{display:flex;flex-direction:column;gap:10px;min-width:0}.ck-aside{display:flex;flex-direction:column;gap:14px;min-width:0}" +
    ".ck-chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.ck-chip{flex:1 0 78px;min-height:48px;border-radius:12px;border:1px solid var(--line);background:var(--stone);color:var(--ink);padding:4px 9px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;text-align:left}" +
    ".ck-chip small{font-size:10.5px;font-weight:700;opacity:.8}.ck-chip span{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.ck-chip.cur{background:var(--ink);color:#fff;border-color:var(--ink)}.ck-chip.dn{background:#E3F1E8;color:#14502F;border-color:#BFE0CB}.ck-chip.on{background:#FBEDEB;color:#A93226;border-color:#F1C4BE}" +
    ".ck-panel{border-radius:28px;background:#2B231F;color:#fff;padding:16px 18px 20px;display:flex;flex-direction:column;gap:10px;text-align:center;transition:background .3s}.ck-panel.ring{background:#C0392B}" +
    ".ck-ph{display:flex;align-items:center;justify-content:space-between;gap:8px}.ck-eb{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#F2C14E}.ring .ck-eb{color:#fff}" +
    ".ck-flp{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;background:rgba(255,255,255,.12);border-radius:999px;padding:5px 11px}.ck-pot{align-self:center}.ck-pot.ring{animation:ckp .6s ease-in-out infinite}" +
    ".ck-pc{display:flex;flex-direction:column;gap:10px;min-width:0}.ck-time{font:700 54px/1 Inter,sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-2px}.ck-stat{font-size:13px;color:rgba(255,255,255,.75)}" +
    ".ck-tx{font:600 19px/1.3 Fraunces,Georgia,serif}.ck-call{display:flex;align-items:flex-start;gap:8px;justify-content:center;text-align:left;background:rgba(255,255,255,.1);border-radius:14px;padding:10px 12px;font-size:13.5px;line-height:1.4}.ring .ck-call{background:rgba(0,0,0,.2);font-size:15px}" +
    ".ck-ctl{display:flex;align-items:center;justify-content:center;gap:22px;margin-top:4px}.ck-pm{flex:none;width:52px;height:52px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font-size:14px;font-weight:700;padding:0}.ck-pm.s{width:44px;height:44px;border-color:rgba(43,35,31,.25);color:var(--ink);font-size:16px}" +
    ".ck-play{flex:none;width:76px;height:76px;border-radius:50%;border:0;background:#F2C14E;color:#2B231F;display:grid;place-items:center;padding:0;box-shadow:0 10px 24px rgba(0,0,0,.35)}.ck-fin{font:600 30px/1.1 Caveat,cursive;color:#F2C14E}" +
    ".ck-tu{font:600 30px/1.05 Fraunces,Georgia,serif}.ck-yes{min-height:56px;border:0;border-radius:16px;background:#F2C14E;color:#2B231F;font-size:15.5px;font-weight:700;padding:8px 14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}.ck-yes small{font-size:12.5px;font-weight:500}.ck-yes.hot{background:#fff;color:#C0392B;min-height:60px}.ck-yes.hot small{color:#2B231F}" +
    ".ck-not{min-height:48px;border:1.5px solid rgba(255,255,255,.7);border-radius:16px;background:transparent;color:#fff;font-size:14.5px;font-weight:700}" +
    ".ck-lab{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--red);margin-bottom:6px}.ck-rec{display:none;flex-direction:column;gap:6px}.ck-row{display:flex;align-items:flex-start;gap:12px;border:2px solid var(--line);border-radius:16px;background:#fff;color:var(--ink);padding:10px 14px;text-align:left;min-height:60px}.ck-row.cur{border-color:var(--ink);background:var(--stone)}" +
    ".ck-n{flex:none;width:28px;height:28px;border-radius:50%;background:#EAE4DC;display:grid;place-items:center;font-size:12px;font-weight:700;margin-top:1px}.ck-n.dn{background:#2E7D4F;color:#fff}.ck-n.rg{background:#C0392B;color:#fff}.ck-row.cur .ck-n:not(.dn):not(.rg){background:var(--ink);color:#fff}" +
    ".ck-rt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.ck-rt b{font-size:14px;line-height:1.4}.ck-rt small{font-size:12px;color:var(--mut);line-height:1.35}.ck-rc{flex:none;font-size:12.5px;font-weight:700;color:var(--mut);font-variant-numeric:tabular-nums;padding-top:4px}" +
    ".ck-sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.ck-sc{box-sizing:border-box;min-height:170px;border-radius:20px;background:#2B231F;color:#fff;border:2px solid transparent;padding:12px;display:flex;flex-direction:column;gap:3px}.ck-sc.hot{background:#C0392B;animation:ckp .6s ease-in-out infinite}" +
    ".ck-sl{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.75}.ck-sn{font-size:14px;font-weight:700;line-height:1.2}.ck-st{font:700 32px/1.15 Inter,sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-1px;color:#F2C14E}.hot .ck-st{color:#fff}" +
    ".ck-sbar{height:4px;border-radius:2px;background:rgba(255,255,255,.18);overflow:hidden}.ck-sbar i{display:block;height:4px;background:#F2C14E;transition:width .9s linear}.hot .ck-sbar i{background:#fff}.ck-snt{font-size:11.5px;line-height:1.3;opacity:.8;min-height:15px}" +
    ".ck-sbs{margin-top:auto;display:flex;gap:6px}.ck-sb{flex:1;min-width:0;min-height:44px;border:0;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;font-size:13px;font-weight:700;padding:0 8px}.hot .ck-sb{background:#fff;color:#C0392B}.ck-sx{width:44px;height:44px;flex:none;border:0;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;display:grid;place-items:center;padding:0}" +
    ".ck-add{box-sizing:border-box;min-height:170px;border:1.5px dashed rgba(43,35,31,.35);border-radius:20px;background:transparent;color:var(--mut);font-size:13px;font-weight:600;line-height:1.35;padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}.ck-add:hover{border-color:var(--ink);color:var(--ink)}" +
    ".ck-clr{align-self:center;border:0;background:none;color:var(--mut);font-size:13px;text-decoration:underline;min-height:44px;padding:0 12px}" +
    ".ck-nudge{position:fixed;left:50%;transform:translateX(-50%);top:84px;z-index:3;width:calc(100% - 32px);max-width:560px;display:flex;align-items:center;gap:10px;background:#F2C14E;color:#2B231F;border-radius:16px;padding:12px 10px 12px 14px;box-shadow:0 10px 24px rgba(43,35,31,.3);font-size:14.5px;line-height:1.35;animation:cks .3s ease-out}.ck-nudge>div{flex:1}.ck-nx{min-height:44px;flex:none;border:0;border-radius:999px;background:rgba(43,35,31,.14);color:#2B231F;font-size:13px;font-weight:700;padding:0 16px}" +
    ".ck-shb{position:fixed;inset:0;z-index:5;background:rgba(43,35,31,.5);display:flex;align-items:flex-end;justify-content:center}.ck-sheet{width:100%;max-width:560px;max-height:100%;overflow:auto;background:#fff;color:var(--ink);border-radius:28px 28px 0 0;padding:16px 16px calc(20px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:10px;animation:cku .25s ease-out}" +
    ".ck-sht{display:flex;align-items:center;justify-content:space-between}.ck-sht b{font:600 22px/1.1 Fraunces,Georgia,serif}.ck-shr{display:flex;flex-wrap:wrap;gap:8px}.ck-shc,.ck-shp{min-height:44px;padding:0 16px;border-radius:999px;border:1.5px solid rgba(43,35,31,.25);background:#fff;color:var(--ink);font-size:14px;font-weight:700}.ck-shp{border-radius:14px;padding:0 14px;font-size:13.5px}.ck-shc.on{background:var(--ink);border-color:var(--ink);color:#fff}.ck-shp.on{background:#FBEDEB;border-color:var(--red);color:#A93226}" +
    ".ck-shl{display:flex;align-items:center;justify-content:space-between;margin-top:4px}.ck-shl>span{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mut)}.ck-step{display:flex;align-items:center;gap:8px}.ck-step b{min-width:64px;text-align:center;font-size:19px;font-variant-numeric:tabular-nums}" +
    ".ck-shg{display:flex;flex-direction:column;gap:8px}.ck-shm{box-sizing:border-box;min-height:62px;display:flex;align-items:center;gap:12px;text-align:left;border-radius:16px;border:2px solid rgba(43,35,31,.18);background:#fff;color:var(--ink);padding:8px 14px}.ck-shm[aria-disabled=true]{opacity:.5}.ck-shm i{flex:none;width:20px;height:20px;box-sizing:border-box;border-radius:50%;border:2px solid rgba(43,35,31,.4)}.ck-shm.on{border-color:var(--red);background:#FBEDEB}.ck-shm.on i{border-color:var(--red);background:var(--red)}.ck-shm span{display:flex;flex-direction:column;gap:2px}.ck-shm b{font-size:14.5px}.ck-shm small{font-size:12.5px;color:var(--mut);line-height:1.35}" +
    ".ck-cta{min-height:56px;border:0;border-radius:16px;background:var(--red);color:#fff;font-size:15.5px;font-weight:700;margin-top:2px}" +
    ".ck-dock{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:60;max-width:calc(100vw - 24px);min-height:48px;display:flex;align-items:center;gap:10px;border:0;border-radius:999px;background:#2B231F;color:#fff;padding:6px 8px 6px 16px;box-shadow:0 10px 26px rgba(43,35,31,.35);font:600 13.5px/1.2 Inter,sans-serif;cursor:pointer}.ck-dock[hidden]{display:none}.ck-dock.hot{background:#C0392B;animation:ckp .6s ease-in-out infinite}" +
    ".ck-dd{width:9px;height:9px;border-radius:50%;background:#F2C14E;flex:none}.hot .ck-dd{background:#fff}.ck-dt{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ck-dt b{font-variant-numeric:tabular-nums}.ck-do{flex:none;background:#F2C14E;color:#2B231F;border-radius:999px;padding:8px 14px;font-weight:700}.hot .ck-do{background:#fff;color:#C0392B}" +
    ".ck-fl{transform-box:fill-box;transform-origin:50% 100%;animation:ckf .4s ease-in-out infinite alternate}.ck-bb{transform-box:fill-box;transform-origin:center;animation:ckb 1.6s ease-out infinite}" +
    "@keyframes ckf{0%{transform:scaleY(1)}100%{transform:scaleY(.72)}}@keyframes ckb{0%{transform:scale(.4);opacity:0}40%{opacity:.9}100%{transform:scale(1.2);opacity:0}}@keyframes ckp{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}@keyframes cks{from{opacity:0;transform:translate(-50%,-8px)}to{opacity:1;transform:translate(-50%,0)}}@keyframes cku{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}" +
    "@media(min-width:700px){.ck-w{padding:20px 36px 32px}.ck-chips{display:none}.ck-rec{display:flex}.ck-panel{display:grid;grid-template-columns:250px minmax(0,1fr);grid-template-areas:'pot ph' 'pot pc';text-align:left;padding:28px 34px;column-gap:32px;row-gap:12px;align-items:center}.ck-ph{grid-area:ph}.ck-pot{grid-area:pot}.ck-pot svg{width:250px;height:250px}.ck-pc{grid-area:pc}.ck-time{font-size:76px;letter-spacing:-3px}.ck-tx{font-size:24px}.ck-call{justify-content:flex-start}.ck-ctl{justify-content:flex-start}.ck-yes,.ck-not{align-self:stretch}.ck-shb{align-items:center}.ck-sheet{border-radius:28px;max-width:560px}.ck-nudge{top:96px}}" +
    "@media(min-width:1100px){.ck-grid{grid-template-columns:minmax(0,1fr) 400px}}" +
    "@media(prefers-reduced-motion:reduce){.ck-fl,.ck-bb,.ck-pot.ring,.ck-sc.hot,.ck-dock.hot{animation:none}}@media print{#ck,.ck-dock{display:none!important}}";

  function init() {
    if (typeof D === "undefined" || typeof how === "undefined") return;
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement("div"); root.id = "ck"; root.hidden = true; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Cook mode"); document.body.appendChild(root);
    document.addEventListener("focusin", function (e) {
      if (!shown || !root || root.contains(e.target)) return;
      var f = root.querySelector("[data-fk]"); if (f) f.focus();
    });
    dock = document.createElement("button"); dock.type = "button"; dock.className = "ck-dock"; dock.hidden = true; dock.setAttribute("data-ck", "reopen"); document.body.appendChild(dock);
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ck]"); if (!b) return;
      if (b.getAttribute("data-ck") === "sheet-x" && e.target !== b && !b.classList.contains("ck-ib")) return;
      act(b.getAttribute("data-ck"), b.getAttribute("data-k"));
    });
    dock.addEventListener("click", function () { act("reopen"); });
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-cook]");
      if (b) { e.preventDefault(); open(b.getAttribute("data-cook")); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !shown) return;
      if (sheet) { sheet = null; render(); } else hide();
    });
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") { if (S) tick(); awake(); } });
    restore();
    if (S) { ensureTick(); renderDock(); tick(); }
  }
  window.CWWHY_COOK = { open: open, close: function () { hide(); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
