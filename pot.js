/* The living pot on the homepage: a gas knob, ingredients that splash in and float, a ladle to stir,
   a tadka to pour, and a lid that builds up to three pressure seetis. It reads and fills the same
   ingredient list as the rest of the page (the global `sel`), and every sound is made in the browser.
   It pauses while it is off screen. */
(function () {
  "use strict";
  var cv = document.getElementById("potc");
  if (!cv || !cv.getContext || typeof sel === "undefined") return;
  var x = cv.getContext("2d");
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var Rn = function (a, b) { return a + Math.random() * (b - a); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var Lg = function () { return lang == "en" ? 0 : 1; };
  var nm = function (id) { return ING[id] ? ING[id][Lg()].replace(/\s*\(.*\)$/, "").toLowerCase() : id; };

  var TX = {
    en: { idle: "Tap a sticker to drop it in. Turn the gas, stir, or drag the tadka.", inn: function (a, n) { return a + " is in. " + (n ? "<b>" + n + "</b> " + (n == 1 ? "dish" : "dishes") + " ready." : "Add a little more."); },
      out: function (a) { return "Took the " + a + " out."; }, tadka: "<b>Tadka lagaya!</b> Hear that sizzle?", lidon: "Lid on. Turn the heat up and count the seetis.", press: "Pressure is building…",
      seeti: function (n) { return "Seeti " + n + "! " + (3 - n) + " more to go."; }, three: "Three seetis. Dinner is ready!", stir: "Keep stirring…", lidoff: "Lid off.", gason: "Gas on. Whoomp.", gasoff: "Gas off.",
      mixed: "Perfectly mixed! How about", served: "3 seetis! Ready to serve", again: "Or how about", show: "Show me", other: "Another idea", all: "you have everything for it", min: "min",
      cnt: function (n) { return n ? "You can cook <em>" + n + "</em> " + (n == 1 ? "dish" : "dishes") + " with what’s in the pot" : sel.size && nearN ? "Nothing complete yet, but <em>" + nearN + "</em> " + (nearN == 1 ? "dish is" : "dishes are") + " 1 item away" : "Tap what you have and watch the pot fill up"; },
      knob: "turn the gas", pan: "drag the tadka", ladle: "drag the ladle to stir", cover: "tap the lid to cover", up: "turn the heat up for a seeti", of: function (n) { return "seeti " + n + " of 3"; }, ready: "DISHES READY", nodish: "Add a few more things and the pot will suggest a dish." },
    ru: { idle: "Sticker tap karein, deg mein gir jayega. Chulha jalayein, chamcha chalayein ya tarka daalein.", inn: function (a, n) { return a + " daal diya. " + (n ? "<b>" + n + "</b> dishes tayyar." : "Thora aur daalein."); },
      out: function (a) { return a + " nikaal diya."; }, tadka: "<b>Tarka lag gaya!</b> Yeh awaaz suni?", lidon: "Dhakkan lag gaya. Aanch tez karein aur seetiyan ginein.", press: "Pressure ban raha hai…",
      seeti: function (n) { return "Seeti " + n + "! Abhi " + (3 - n) + " aur."; }, three: "Teen seetiyan. Khana tayyar!", stir: "Chalate rahein…", lidoff: "Dhakkan hata diya.", gason: "Chulha jal gaya.", gasoff: "Chulha band.",
      mixed: "Khoob mix hua! Yeh banayein", served: "3 seetiyan! Tayyar hai", again: "Ya phir yeh", show: "Dikhayein", other: "Koi aur", all: "sab kuch maujood hai", min: "min",
      cnt: function (n) { return n ? "Deg ki cheezon se <em>" + n + "</em> dishes ban sakti hain" : sel.size && nearN ? "Abhi koi dish poori nahi, lekin <em>" + nearN + "</em> " + (nearN == 1 ? "dish" : "dishes") + " mein sirf 1 cheez kam hai" : "Jo ghar mein hai tap karein, deg bharti jayegi"; },
      knob: "chulha jalayein", pan: "tarka kheenchein", ladle: "chamcha ghuma kar hilayein", cover: "dhakkan ke liye tap karein", up: "seeti ke liye aanch tez karein", of: function (n) { return "seeti " + n + " / 3"; }, ready: "DISHES TAYYAR", nodish: "Thori aur cheezein daalein, deg koi dish batayegi." }
  };
  var t_ = function () { return TX[lang == "en" ? "en" : "ru"]; };

  /* ================= sound: synthesised, through a small room reverb ================= */
  var A = {
    on: +LS.get("cwwhy_snd", 1) !== 0, ctx: null,
    init: function () {
      if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
      if (!this.on) return;
      try {
        var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        var c = this.ctx = new C(), i, ch;
        this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 4; this.comp.connect(c.destination);
        this.master = c.createGain(); this.master.gain.value = .85; this.master.connect(this.comp);
        var len = c.sampleRate * 1.4, ir = c.createBuffer(2, len, c.sampleRate);
        for (ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
        this.verb = c.createConvolver(); this.verb.buffer = ir; this.wet = c.createGain(); this.wet.gain.value = .22; this.verb.connect(this.wet); this.wet.connect(this.master);
        var nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), w = nb.getChannelData(0); for (i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1; this.white = nb;
        var bb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), b = bb.getChannelData(0), last = 0; for (i = 0; i < b.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; } this.brown = bb;
        this.gas = this.loop(this.white, "bandpass", 1500, .7); this.roar = this.loop(this.brown, "lowpass", 260, .7); this.swish = this.loop(this.white, "bandpass", 600, 1.3); this.simmer = this.loop(this.brown, "bandpass", 520, 1.6);
      } catch (e) { this.ctx = null; }
    },
    out: function (node, wet) { node.connect(this.master); if (wet === undefined) wet = 1; if (wet) { var s = this.ctx.createGain(); s.gain.value = wet; node.connect(s); s.connect(this.verb); } },
    loop: function (buf, type, f, q) { var c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = buf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; s.connect(fl); fl.connect(g); this.out(g, .5); s.start(); return { g: g, fl: fl }; },
    set: function (bed, v, f) { if (!this.ctx || !bed) return; var t = this.ctx.currentTime; bed.g.gain.setTargetAtTime(this.on ? v : 0, t, .08); if (f) bed.fl.frequency.setTargetAtTime(f, t, .05); },
    ok: function () { return this.ctx && this.on; },
    tone: function (f, o) { if (!this.ok()) return; o = o || {}; var c = this.ctx, t = c.currentTime + (o.t || 0), d = o.d || .15, os = c.createOscillator(), g = c.createGain(); os.type = o.type || "sine"; os.frequency.setValueAtTime(f, t); if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + (o.sweep || d)); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(o.g || .1, t + (o.a || .004)); g.gain.exponentialRampToValueAtTime(.0001, t + d); os.connect(g); this.out(g, o.wet === undefined ? .6 : o.wet); os.start(t); os.stop(t + d + .05); },
    noise: function (o) { if (!this.ok()) return; o = o || {}; var c = this.ctx, t = c.currentTime + (o.t || 0), d = o.d || .1, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = o.brown ? this.brown : this.white; fl.type = o.type || "bandpass"; fl.frequency.setValueAtTime(o.f || 2000, t); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + d); fl.Q.value = o.q || 1; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(o.g || .1, t + (o.a || .003)); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl); fl.connect(g); this.out(g, o.wet === undefined ? .5 : o.wet); s.start(t, Math.random() * 1.5); s.stop(t + d + .05); },
    clank: function (base, g, t) { var self = this; base = base || 560; g = g || .12; t = t || 0; [1, 2.76, 5.4, 8.93].forEach(function (m, i) { self.tone(base * m * Rn(.99, 1.01), { t: t, d: .5 / (i + 1) + .05, g: g / (i * 1.6 + 1), wet: .9 }); }); this.noise({ t: t, d: .025, f: 3500, q: .6, g: g * .8 }); },
    click: function () { this.noise({ d: .012, f: 4200, q: 2, g: .12, wet: .2 }); this.tone(2600, { d: .02, g: .03, wet: .2 }); },
    ignite: function () { var self = this; [0, .13, .25].forEach(function (t) { self.noise({ t: t, d: .01, f: 5200, q: 3, g: .3, wet: .3 }); self.tone(3400, { t: t, d: .015, g: .05, type: "square", wet: .2 }); }); this.noise({ t: .34, d: .7, type: "lowpass", f: 180, f2: 1600, q: .7, g: .55, a: .03, brown: true, wet: .7 }); this.tone(70, { t: .34, f2: 45, d: .35, g: .25, wet: .4 }); },
    douse: function () { this.noise({ d: .35, type: "lowpass", f: 900, f2: 120, g: .18, brown: true }); },
    bubble: function (size) { size = size || 1; var f = Rn(260, 520) / size; this.tone(f, { f2: f * Rn(2.2, 3.2), sweep: .045, d: .09, g: Rn(.05, .11), wet: .5 }); this.noise({ d: .006, f: 2600, g: .04, wet: .3 }); },
    plop: function (size) { size = size || 1; this.tone(130 / size, { f2: 55, d: .16, g: .32, wet: .4 }); this.tone(320 / size, { f2: 900 / size, sweep: .06, d: .1, g: .14, t: .01 }); this.noise({ d: .14, f: 900, f2: 400, q: 1.2, g: .12, t: .01, wet: .6 }); for (var i = 0; i < 4; i++) this.bubble(Rn(1.4, 2.2)); },
    whoosh: function (d, g) { d = d || .45; this.noise({ d: d, f: 300, f2: 3200, q: 1.1, g: g || .1, a: d * .45, wet: .5 }); },
    sizzle: function () {
      if (!this.ok()) return; var i, t;
      this.noise({ d: .12, f: 3000, q: .5, g: .5 });
      this.noise({ d: 2.8, type: "highpass", f: 2600, q: .5, g: .2, a: .04, wet: .35 });
      this.noise({ d: 2.2, type: "lowpass", f: 700, q: .7, g: .1, a: .03, brown: true });
      for (i = 0; i < 170; i++) { t = Math.pow(Math.random(), 1.8) * 2.6; this.noise({ t: t, d: Rn(.002, .006), f: Rn(2000, 7500), q: Rn(2, 6), g: Rn(.08, .32) * (1 - t / 3), wet: .25 }); }
      for (i = 0; i < 18; i++) this.tone(Rn(1300, 2600), { t: Rn(.05, 1.4), d: .018, g: Rn(.04, .09), type: "triangle", wet: .3 });
    },
    seeti: function () {
      if (!this.ok()) return; var c = this.ctx, t = c.currentTime, d = 1.7;
      var o1 = c.createOscillator(), o2 = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), bp = c.createBiquadFilter(), g = c.createGain();
      o1.type = "sawtooth"; o2.type = "sawtooth"; o1.frequency.setValueAtTime(2650, t); o1.frequency.linearRampToValueAtTime(3150, t + d * .8); o2.frequency.setValueAtTime(2690, t); o2.frequency.linearRampToValueAtTime(3200, t + d * .8);
      lfo.frequency.value = 7; lg.gain.value = 45; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
      bp.type = "bandpass"; bp.frequency.setValueAtTime(2900, t); bp.frequency.linearRampToValueAtTime(3300, t + d); bp.Q.value = 9;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.16, t + .3); g.gain.setValueAtTime(.16, t + d - .45); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o1.connect(bp); o2.connect(bp); bp.connect(g); this.out(g, .7);
      [o1, o2, lfo].forEach(function (o) { o.start(t); o.stop(t + d + .05); });
      this.noise({ d: d, type: "highpass", f: 3800, q: .4, g: .14, a: .2 }); this.noise({ d: .08, f: 1200, g: .2 });
    },
    rattle: function (p) { this.clank(Rn(620, 760), .04 + p * .06); },
    ta: function () { var self = this; this.whoosh(.6, .12); [659.3, 987.8, 1318.5, 1975.5].forEach(function (f, i) { self.tone(f, { t: .08 + i * .07, d: 1.6, g: .07 / (1 + i * .3), wet: 1 }); }); },
    tock: function () { this.tone(880, { d: .05, g: .05, type: "triangle", wet: .3 }); },
    quiet: function () { var self = this; [this.gas, this.roar, this.swish, this.simmer].forEach(function (b) { self.set(b, 0); }); }
  };
  /* one shared sound switch for the whole site (Kitchen SOS uses it too) */
  window.CWWHY_SND = { get on() { return A.on; }, ctx: function () { A.init(); return A.ctx; } };

  /* ================= ingredient drawings ================= */
  var INK = "#2B231F";
  var COLS = { pyaz: "#C77D8F", tamatar: "#C0392B", aloo: "#D9AE62", anda: "#F6EFD9", murghi: "#D9883F", masoor: "#E9A23A", chawal: "#F4EEDF", hmirch: "#4C8C2B", dhaniya: "#3E8A35", dahi: "#FBF8F0" };
  function colOf(id) { if (COLS[id]) return COLS[id]; var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return "hsl(" + (h % 360) + " 52% 58%)"; }
  function sprite(id, cx, cy, s, rot) {
    x.save(); x.translate(cx, cy); x.rotate(rot || 0); x.lineWidth = Math.max(1, s * .09); x.strokeStyle = INK; x.lineJoin = "round";
    var fs = function () { x.fill(); x.stroke(); }, i, a, r;
    switch (id) {
      case "tamatar": x.fillStyle = "#C0392B"; x.beginPath(); x.arc(0, 0, s, 0, 7); fs(); x.fillStyle = "#3F7A2E"; x.beginPath(); for (i = 0; i < 5; i++) { a = i / 5 * 6.283 - 1.57; x.lineTo(Math.cos(a) * s * .5, -s * .82 + Math.sin(a) * s * .3); x.lineTo(Math.cos(a + .63) * s * .15, -s * .82 + Math.sin(a + .63) * s * .1); } x.closePath(); x.fill(); x.fillStyle = "rgba(255,255,255,.45)"; x.beginPath(); x.ellipse(-s * .4, -s * .25, s * .22, s * .14, -.6, 0, 7); x.fill(); break;
      case "pyaz": x.fillStyle = "#C77D8F"; x.beginPath(); x.moveTo(0, -s * 1.15); x.bezierCurveTo(s * .4, -s * .6, s * 1.05, -s * .4, s * .95, s * .2); x.bezierCurveTo(s * .9, s * .9, -s * .9, s * .9, -s * .95, s * .2); x.bezierCurveTo(-s * 1.05, -s * .4, -s * .4, -s * .6, 0, -s * 1.15); fs(); x.strokeStyle = "rgba(255,255,255,.55)"; x.beginPath(); x.moveTo(-s * .2, -s * .6); x.quadraticCurveTo(-s * .45, 0, -s * .2, s * .6); x.moveTo(s * .25, -s * .55); x.quadraticCurveTo(s * .5, 0, s * .25, s * .6); x.stroke(); break;
      case "aloo": x.fillStyle = "#D9AE62"; x.beginPath(); x.ellipse(0, 0, s * 1.05, s * .78, .3, 0, 7); fs(); x.fillStyle = "#8A6430"; [[-.4, -.2], [.35, .15], [0, .35]].forEach(function (p) { x.beginPath(); x.arc(p[0] * s, p[1] * s, s * .07, 0, 7); x.fill(); }); break;
      case "anda": x.fillStyle = "#FBF8F0"; x.beginPath(); x.ellipse(0, 0, s * .78, s, 0, 0, 7); fs(); x.fillStyle = "rgba(255,255,255,.9)"; x.beginPath(); x.ellipse(-s * .25, -s * .35, s * .18, s * .28, -.3, 0, 7); x.fill(); break;
      case "murghi": x.fillStyle = "#D9883F"; x.beginPath(); x.ellipse(-s * .2, -s * .1, s * .85, s * .7, -.5, 0, 7); fs(); x.strokeStyle = "#F3EAD9"; x.lineWidth = s * .32; x.lineCap = "round"; x.beginPath(); x.moveTo(s * .3, s * .35); x.lineTo(s * .85, s * .9); x.stroke(); x.fillStyle = "#F3EAD9"; x.strokeStyle = INK; x.lineWidth = Math.max(1, s * .09); x.beginPath(); x.arc(s * .95, s, s * .22, 0, 7); fs(); break;
      case "masoor": for (i = 0; i < 7; i++) { a = i * 2.4; r = i ? s * .55 : 0; x.fillStyle = i % 2 ? "#E9A23A" : "#F2B84E"; x.beginPath(); x.ellipse(Math.cos(a) * r, Math.sin(a) * r, s * .36, s * .26, a, 0, 7); fs(); } break;
      case "chawal": x.fillStyle = "#FFFBF1"; for (i = 0; i < 8; i++) { a = i * 2.3; r = i ? s * .55 : 0; x.beginPath(); x.ellipse(Math.cos(a) * r, Math.sin(a) * r, s * .42, s * .15, a * 1.7, 0, 7); fs(); } break;
      case "hmirch": x.fillStyle = "#4C8C2B"; x.beginPath(); x.moveTo(-s * 1.1, -s * .2); x.quadraticCurveTo(0, -s * .55, s * 1.1, s * .25); x.quadraticCurveTo(0, s * .25, -s * 1.1, s * .2); x.closePath(); fs(); break;
      case "dhaniya": [[-.45, 0, "#3E8A35"], [.4, -.15, "#57A548"], [0, .42, "#48953C"], [0, -.42, "#4E9A3E"]].forEach(function (p) { x.fillStyle = p[2]; x.beginPath(); x.arc(p[0] * s, p[1] * s, s * .42, 0, 7); fs(); }); break;
      case "dahi": x.fillStyle = "#FBF8F0"; x.beginPath(); x.moveTo(-s, s * .3); x.bezierCurveTo(-s, -s * .5, -s * .2, -s * .4, 0, -s * .9); x.bezierCurveTo(s * .2, -s * .4, s, -s * .5, s, s * .3); x.quadraticCurveTo(0, s * .7, -s, s * .3); fs(); break;
      default: x.fillStyle = colOf(id); x.beginPath(); x.ellipse(0, 0, s * .95, s * .78, .4, 0, 7); fs(); x.fillStyle = "rgba(255,255,255,.4)"; x.beginPath(); x.ellipse(-s * .3, -s * .25, s * .25, s * .15, -.5, 0, 7); x.fill();
    }
    x.restore();
  }

  /* ================= scene ================= */
  var W = 560, H = 500, CX = 280, RY = 232, MRX = 136, MRY = 24, SY = RY + 6, dpr = 1;
  function fit() { dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
  fit(); addEventListener("resize", fit);
  var KNOB = { x: 160, y: 470, r: 17 }, PAN_REST = { x: 66, y: 412 };
  var LID_OFF = { x: 150, y: -70, r: .62 };
  var S0 = {
    heat: .32, knobA: lerp(-2.36, 2.36, .32), lit: true,
    lidOn: false, lid: { x: 150, y: -70, r: .62 }, lidT: { x: 150, y: -70, r: .62 },
    floats: [], falling: [], ripples: [], bubbles: [], parts: [], steam: [],
    omega: 0, mix: 0, slosh: 0, sloshV: 0, flash: 0, pressure: 0, seetis: 0, jet: 0, weightUp: 0, bump: 0,
    pan: { x: PAN_REST.x, y: PAN_REST.y, tilt: 0, full: true, drag: false, pour: 0 },
    ladle: null, used: { knob: false, pan: false, lid: false, stir: false }, t: 0, revealing: false, visible: true
  };
  var P = S0;
  var pending = {};   /* ingredient id -> where its sticker was, so it can fly from there */
  var known = null;

  function newFloat(id) { return { id: id, a: Rn(0, 6.283), r: Math.sqrt(Rn(.05, .85)), rot: Rn(0, 6.283), ph: Rn(0, 6.283), s: Rn(10, 13) }; }
  function soupColor() {
    var parts = [["tamatar", [192, 57, 43]], ["masoor", [233, 162, 58]], ["moong", [225, 190, 70]], ["dahi", [240, 226, 205]], ["doodh", [245, 238, 225]], ["chawal", [238, 226, 200]], ["murghi", [205, 120, 60]], ["palak", [80, 125, 50]]].filter(function (p) { return sel.has(p[0]); });
    var col = parts.length ? parts.reduce(function (a, p) { return a.map(function (v, i) { return v + p[1][i]; }); }, [0, 0, 0]).map(function (v) { return v / parts.length; }) : [176, 110, 60];
    if (P.flash > 0) col = col.map(function (v) { return lerp(v, 255, P.flash * .35); });
    return col;
  }
  var rgb = function (c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a === undefined ? 1 : a) + ")"; };
  function round(a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function bodyPath() { x.beginPath(); x.moveTo(CX - MRX - 4, RY); x.lineTo(158, 392); x.quadraticCurveTo(160, 405, 174, 405); x.lineTo(386, 405); x.quadraticCurveTo(400, 405, 402, 392); x.lineTo(CX + MRX + 4, RY); x.ellipse(CX, RY, MRX + 4, MRY + 1, 0, 0, Math.PI, false); x.closePath(); }
  var nearN = 0;
  function count() {
    var n = 0; nearN = 0;
    for (var i = 0; i < D.length; i++) { var miss = 0, ks = D[i][1].split(","); for (var j = 0; j < ks.length && miss < 2; j++) if (!sel.has(ks[j])) miss++; if (!miss) n++; else if (miss == 1 && ks.length > 1) nearN++; }
    return n;
  }

  function drawFlames(t) {
    if (!P.lit || P.heat <= .01) return; var h = P.heat;
    for (var i = 0; i < 9; i++) {
      var fx = 196 + i * 21, fl = Math.sin(t * 18 + i * 1.7) * .12 + Math.sin(t * 31 + i) * .08, fh = (10 + h * 34) * (1 + fl), fw = 6 + h * 3;
      x.fillStyle = h > .66 ? "#E8452C" : "#C0392B"; x.beginPath(); x.moveTo(fx - fw, 428); x.quadraticCurveTo(fx - fw * .6, 428 - fh * .55, fx, 428 - fh); x.quadraticCurveTo(fx + fw * .6, 428 - fh * .55, fx + fw, 428); x.fill();
      x.fillStyle = h > .5 ? "#FFB15C" : "#F7F3EE"; x.beginPath(); x.moveTo(fx - fw * .45, 428); x.quadraticCurveTo(fx, 428 - fh * .7, fx + fw * .45, 428); x.fill();
      x.fillStyle = "rgba(90,140,255,.55)"; x.beginPath(); x.ellipse(fx, 427, fw * .7, 2.4, 0, 0, 7); x.fill();
    }
  }
  function drawStove() {
    x.fillStyle = "rgba(43,35,31,.12)"; x.beginPath(); x.ellipse(CX, 494, 230, 6, 0, 0, 7); x.fill();
    x.fillStyle = INK; round(70, 428, 420, 22, 8); x.fill();
    x.fillStyle = "#3A302B"; round(96, 450, 368, 38, 9); x.fill();
    x.fillStyle = "rgba(247,243,238,.55)"; x.font = "700 10px Inter, sans-serif"; x.textAlign = "center"; x.fillText(lang == "en" ? "HEAT" : "AANCH", KNOB.x + 50, 474);
    for (var i = 0; i < 5; i++) { x.fillStyle = P.heat > i / 5 + .02 ? "#F2C14E" : "rgba(247,243,238,.18)"; x.beginPath(); x.arc(KNOB.x + 30 + i * 9, 463, 2.6, 0, 7); x.fill(); }
    x.save(); x.translate(KNOB.x, KNOB.y); x.fillStyle = "#E9E2D8"; x.beginPath(); x.arc(0, 0, KNOB.r, 0, 7); x.fill(); x.strokeStyle = INK; x.lineWidth = 2; x.stroke();
    x.rotate(P.knobA); x.fillStyle = INK; round(-3, -KNOB.r + 2, 6, KNOB.r, 3); x.fill(); x.restore();
    x.fillStyle = "#5A4F49"; x.beginPath(); x.arc(400, KNOB.y, 12, 0, 7); x.fill();
  }
  function drawPotBack(t) {
    x.fillStyle = INK; round(106, 258, 40, 17, 8.5); x.fill(); round(414, 258, 40, 17, 8.5); x.fill();
    x.fillStyle = "#120D0B"; x.beginPath(); x.ellipse(CX, RY, MRX + 4, MRY + 1, 0, 0, 7); x.fill();
    x.save(); x.beginPath(); x.ellipse(CX, RY, MRX, MRY, 0, 0, 7); x.clip();
    var col = soupColor(), sl = P.slosh, g = x.createLinearGradient(0, SY - 20, 0, SY + 20);
    g.addColorStop(0, rgb(col.map(function (v) { return v * 1.08; }))); g.addColorStop(1, rgb(col.map(function (v) { return v * .78; })));
    x.fillStyle = g; x.beginPath(); x.ellipse(CX + sl * 5, SY, MRX - 6, MRY - 4, sl * .04, 0, 7); x.fill();
    if (P.ladle && Math.abs(P.omega) > .2) { x.strokeStyle = "rgba(255,255,255,.28)"; x.lineWidth = 3; x.beginPath(); for (var i = 0; i < 60; i++) { var a = -P.t * P.omega * 1.4 + i * .19, rr = i / 60; x.lineTo(CX + Math.cos(a) * rr * (MRX - 14), SY + Math.sin(a) * rr * (MRY - 7)); } x.stroke(); }
    P.ripples.forEach(function (r) { var k = r.t, rx = 4 + k * 70 * r.s; x.strokeStyle = "rgba(255,255,255," + ((1 - k) * .55) + ")"; x.lineWidth = 2; x.beginPath(); x.ellipse(r.x, r.y, rx, rx * .2, 0, 0, 7); x.stroke(); });
    P.bubbles.forEach(function (b) { var k = b.t / b.life; x.fillStyle = "rgba(255,255,255," + (.55 - k * .2) + ")"; x.strokeStyle = "rgba(43,35,31,.25)"; x.lineWidth = 1; x.beginPath(); x.ellipse(b.x, b.y, b.r * (.4 + k), b.r * (.4 + k) * .7, 0, 0, 7); x.fill(); x.stroke(); });
    P.floats.slice().sort(function (a, b) { return Math.sin(a.a) * a.r - Math.sin(b.a) * b.r; }).forEach(function (f) { var px = CX + sl * 5 + Math.cos(f.a) * f.r * (MRX - 22), py = SY + Math.sin(f.a) * f.r * (MRY - 9) + Math.sin(t * 2.4 + f.ph) * 1.6 - 3; sprite(f.id, px, py, f.s * (.85 + (Math.sin(f.a) * f.r + 1) * .1), f.rot); });
    x.restore();
  }
  function drawPotFront() {
    bodyPath(); var g = x.createLinearGradient(140, 0, 420, 0); g.addColorStop(0, "#3B312C"); g.addColorStop(.35, INK); g.addColorStop(1, "#1D1714"); x.fillStyle = g; x.fill();
    x.save(); bodyPath(); x.clip(); x.fillStyle = "#C0392B"; x.fillRect(100, 318, 360, 14); x.strokeStyle = "rgba(247,243,238,.12)"; x.lineWidth = 9; x.lineCap = "round"; x.beginPath(); x.moveTo(176, 262); x.lineTo(172, 388); x.stroke(); x.restore();
    x.strokeStyle = "rgba(247,243,238,.35)"; x.lineWidth = 3; x.beginPath(); x.ellipse(CX, RY, MRX + 4, MRY + 1, 0, 0, Math.PI, false); x.stroke();
    x.fillStyle = "#fff"; x.textAlign = "center"; x.font = "700 58px Fraunces, Georgia, serif"; x.fillText(String(count()), CX, 384 - P.bump * 4);
    x.font = "700 10.5px Inter, sans-serif"; x.globalAlpha = .85; x.fillText(t_().ready, CX, 398); x.globalAlpha = 1;
  }
  function drawLid() {
    var L = P.lid, jit = P.lidOn && P.pressure > .45 ? (Math.random() - .5) * (P.pressure - .45) * 5 : 0;
    x.save(); x.translate(CX + L.x, RY + L.y - Math.abs(jit) * 1.5); x.rotate(L.r + jit * .02);
    x.fillStyle = INK; x.beginPath(); x.moveTo(-MRX - 6, 0); x.quadraticCurveTo(0, -84, MRX + 6, 0); x.closePath(); x.fill();
    x.strokeStyle = "rgba(247,243,238,.3)"; x.lineWidth = 3; x.beginPath(); x.moveTo(-MRX + 4, -6); x.quadraticCurveTo(0, -78, MRX - 4, -6); x.stroke();
    x.fillStyle = INK; x.beginPath(); x.ellipse(0, 0, MRX + 6, 6, 0, 0, 7); x.fill();
    x.fillStyle = "#C0392B"; round(-6, -52, 12, 10, 2); x.fill(); x.beginPath(); x.arc(0, -55, 10, 0, 7); x.fill();
    var wy = -66 - P.weightUp * 7 + (P.lidOn && P.pressure > .3 ? Math.sin(P.t * 46) * P.pressure * 2.2 : 0);
    x.fillStyle = "#5A4F49"; round(-7, wy - 10, 14, 13, 4); x.fill(); x.fillStyle = "#F2C14E"; x.beginPath(); x.arc(0, wy - 11, 3, 0, 7); x.fill();
    x.restore();
  }
  function drawPan() {
    var p = P.pan; x.save(); x.translate(p.x, p.y); x.rotate(-p.tilt);
    x.strokeStyle = "#5A4F49"; x.lineWidth = 7; x.lineCap = "round"; x.beginPath(); x.moveTo(-26, -2); x.lineTo(-58, -14); x.stroke();
    x.fillStyle = "#7A6D66"; x.beginPath(); x.ellipse(0, 0, 30, 11, 0, 0, 7); x.fill(); x.strokeStyle = INK; x.lineWidth = 2; x.stroke();
    if (p.full) { x.fillStyle = "#E6A62A"; x.beginPath(); x.ellipse(0, -2, 24, 7, 0, 0, 7); x.fill(); x.fillStyle = "#5B3D20"; for (var i = 0; i < 9; i++) { x.beginPath(); x.ellipse(-16 + i * 4, -2 + Math.sin(i * 2) * 3, 1.6, .9, i, 0, 7); x.fill(); } x.fillStyle = "#8A1C10"; x.beginPath(); x.ellipse(8, -3, 6, 2, .3, 0, 7); x.fill(); }
    x.restore();
  }
  function drawLadle() {
    var L = P.ladle;
    /* when nobody is stirring, the ladle rests in the pot so people can see there is one to grab */
    if (!L) { if (P.lidOn) return; L = { x: CX + 62, y: SY + 2 }; }
    x.strokeStyle = "#A97C50"; x.lineWidth = 8; x.lineCap = "round"; x.beginPath(); x.moveTo(L.x, L.y); x.lineTo(L.x + 70, L.y - 150); x.stroke();
    x.strokeStyle = "#C9A173"; x.lineWidth = 3; x.beginPath(); x.moveTo(L.x + 4, L.y - 6); x.lineTo(L.x + 68, L.y - 146); x.stroke();
    x.fillStyle = "#A97C50"; x.beginPath(); x.ellipse(L.x, L.y + 2, 17, 8, 0, 0, 7); x.fill(); x.strokeStyle = INK; x.lineWidth = 2; x.stroke();
  }
  function drawParts() {
    P.parts.forEach(function (p) { x.globalAlpha = clamp(1 - p.t / p.life, 0, 1);
      if (p.kind === "smoke") { var r = p.r * (1 + p.t * 2.2), g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, "rgba(120,110,104,.5)"); g.addColorStop(1, "rgba(120,110,104,0)"); x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, r, 0, 7); x.fill(); }
      else { x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill(); } });
    x.globalAlpha = 1;
    P.steam.forEach(function (p) { var k = p.t / p.life, r = p.r * (1 + k * 2.6), g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, "rgba(255,255,255," + ((1 - k) * p.a) + ")"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, r, 0, 7); x.fill(); });
  }
  function drawHints(t) {
    var tx = t_();
    var pulse = function (px, py, rad, label, lx, ly, align) { var k = (t * .9) % 1; x.strokeStyle = "rgba(192,57,43," + (1 - k) + ")"; x.lineWidth = 2.5; x.beginPath(); x.arc(px, py, rad + k * 16, 0, 7); x.stroke(); x.fillStyle = "#C0392B"; x.font = "700 20px Caveat, cursive"; x.textAlign = align; x.lineJoin = "round"; x.lineWidth = 5; x.strokeStyle = "#F7F3EE"; x.strokeText(label, lx, ly); x.fillText(label, lx, ly); };
    if (!P.used.knob) pulse(KNOB.x, KNOB.y, KNOB.r + 2, tx.knob, KNOB.x - 44, KNOB.y + 6, "right");
    if (!P.used.pan && P.pan.full && !P.pan.drag) pulse(P.pan.x, P.pan.y, 30, tx.pan, P.pan.x - 40, P.pan.y - 52, "left");
    x.font = "700 20px Caveat, cursive"; x.textAlign = "center"; x.fillStyle = "#C0392B";
    if (!P.used.lid && !P.lidOn) x.fillText(tx.cover, CX + 170, 52);
    if (!P.used.stir && !P.lidOn && !P.ladle) pulse(CX + 62, SY + 2, 18, tx.ladle, CX - 60, RY - 52, "center");
    if (P.lidOn && P.heat < .55 && !P.revealing) x.fillText(tx.up, CX, 120);
    if (P.lidOn && P.seetis) { x.fillStyle = INK; x.font = "700 26px Caveat, cursive"; x.fillText(tx.of(P.seetis), CX + 150, 140); }
    if (P.mix > .02 && !P.lidOn) { x.strokeStyle = "#C0392B"; x.lineWidth = 5; x.lineCap = "round"; x.beginPath(); x.ellipse(CX, RY, MRX + 18, MRY + 14, 0, -Math.PI / 2, -Math.PI / 2 + P.mix * 6.283); x.stroke(); }
  }
  function render(t) {
    x.clearRect(0, 0, W, H);
    x.setLineDash([3, 9]); x.strokeStyle = "rgba(43,35,31,.12)"; x.lineWidth = 2; x.beginPath(); x.arc(CX, 250, 222, 0, 7); x.stroke(); x.setLineDash([]);
    drawFlames(t); drawStove(); drawPotBack(t); drawPotFront();
    P.falling.forEach(function (f) { sprite(f.id, f.x, f.y, f.s, f.rot); });
    drawLid(); drawLadle(); drawPan(); drawParts(); drawHints(t);
  }

  /* ================= page text ================= */
  var hint = function (h) { var e = document.getElementById("pothint"); if (e) e.innerHTML = h; };
  var lastN = -1;
  function setCount() {
    var n = count(); if (n !== lastN) { if (lastN >= 0) { P.bump = 1; A.tock(); } lastN = n; }
    var e = document.getElementById("potcnt"); if (e) e.innerHTML = t_().cnt(n);
  }
  function pick() {
    var ready = [], near = [];
    D.forEach(function (d) { var ks = d[1].split(","), miss = ks.filter(function (k) { return !sel.has(k); }); if (!miss.length) ready.push({ d: d, miss: miss }); else if (miss.length === 1 && ks.length > 1 && sel.size) near.push({ d: d, miss: miss }); });
    var l = ready.length ? ready : near; return l.length ? l[Math.floor(Math.random() * l.length)] : null;
  }
  function reveal(title) {
    var r = pick(), el = document.getElementById("potrv"), tx = t_();
    if (!r) { P.revealing = false; hint(tx.nodish); return; }
    P.revealing = true; A.ta();
    el.innerHTML = "<small>" + esc(title) + "</small><b>" + esc(r.d[0]) + "</b><p>" + r.d[2] + " " + tx.min + (r.miss.length ? "" : " · " + tx.all) + "</p>" + (r.miss.length ? '<span class="ms">' + esc(T[lang].miss) + ": " + esc(ING[r.miss[0]][Lg()]) + "</span>" : "") +
      '<div class="rw"><button type="button" class="go" data-pshow="' + esc(r.d[0]) + '">' + tx.show + '</button><button type="button" data-pagain="1">' + tx.other + "</button></div>";
    el.hidden = false;
    if (!calm && el.animate) el.animate([{ transform: "translateX(-50%) translateY(90px) scale(.5)", opacity: 0 }, { transform: "translateX(-50%) translateY(0) scale(1.05)", opacity: 1, offset: .7 }, { transform: "translateX(-50%) scale(1)", opacity: 1 }], { duration: 560, easing: "ease-out" });
  }
  document.getElementById("potrv").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.pagain) { P.revealing = false; reveal(t_().again); return; }
    if (b.dataset.pshow) { this.hidden = true; P.revealing = false; S = b.dataset.pshow; refresh(); jump("h-res"); }
  });

  /* ================= keeping the pot in step with the page's ingredient list ================= */
  function splashAt(px, py, n, col, power) { power = power || 1; if (calm) n = Math.ceil(n / 3); for (var i = 0; i < n; i++) P.parts.push({ kind: "drop", x: px + Rn(-8, 8), y: py, vx: Rn(-110, 110) * power, vy: Rn(-260, -120) * power, r: Rn(2, 4.5), c: rgb(col.map(function (v) { return v * Rn(.85, 1.1); })), t: 0, life: Rn(.6, 1), g: 900 }); P.ripples.push({ x: px, y: py, t: 0, s: power }); }
  function puffSteam(px, py, a) { P.steam.push({ x: px, y: py, vx: Rn(-12, 12), vy: Rn(-70, -35) * (a || 1), r: Rn(8, 15), a: Rn(.35, .6), t: 0, life: Rn(1.4, 2.4) }); }
  function openLid(quiet) { if (!P.lidOn) return; P.lidOn = false; P.lidT = { x: LID_OFF.x, y: LID_OFF.y, r: LID_OFF.r }; P.pressure = 0; P.seetis = 0; if (!quiet) { A.clank(520, .14); A.whoosh(.5, .08); } for (var i = 0; i < 12; i++) puffSteam(Rn(CX - 110, CX + 110), RY - 4, 1.4); }
  function closeLid() { if (P.lidOn) return; P.lidOn = true; P.lidT = { x: 0, y: 0, r: 0 }; P.ladle = null; setTimeout(function () { A.clank(430, .16); setTimeout(function () { A.clank(470, .06); }, 110); setTimeout(function () { A.clank(500, .03); }, 200); }, 220); }
  function canvasPoint(cx, cy) { var r = cv.getBoundingClientRect(); return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H }; }
  function onScreen() { var r = cv.getBoundingClientRect(); return r.bottom > 40 && r.top < innerHeight - 40; }
  function drop(id, from) {
    if (P.lidOn) openLid();
    var tx = CX + Rn(-60, 60), T0 = .75, s;
    if (from) { s = canvasPoint(from.x, from.y); } else s = { x: Rn(CX - 80, CX + 80), y: -30 };
    var vx = (tx - s.x) / T0, vy = (SY - s.y) / T0 - .5 * 1500 * T0;
    P.falling.push({ id: id, x: s.x, y: s.y, vx: vx, vy: vy, rot: Rn(0, 6), vr: Rn(-8, 8), s: 15 });
    A.whoosh(.3, .05);
  }
  function land(f) {
    var tx = clamp(f.x, CX - MRX + 30, CX + MRX - 30);
    splashAt(tx, SY, 14, soupColor(), 1); A.plop(f.id === "chawal" || GR.daal[1].indexOf(f.id) >= 0 ? 1.4 : 1); P.sloshV += Rn(-2, 2); P.omega += Rn(-.4, .4);
    if (sel.has(f.id)) { var fl = newFloat(f.id); fl.a = Math.atan2(Rn(-1, 1), (tx - CX) / (MRX - 22)); fl.r = clamp(Math.abs(tx - CX) / (MRX - 22), .1, .85); P.floats.push(fl); while (P.floats.length > 22) P.floats.shift(); }
    setCount(); hint(t_().inn(esc(nm(f.id)), count()));
  }
  function sync() {
    var key = Array.from(sel).sort().join(","); if (key === known) return;
    var have = {}; P.floats.forEach(function (f) { have[f.id] = 1; }); P.falling.forEach(function (f) { have[f.id] = 1; });
    var removed = [];
    P.floats = P.floats.filter(function (f) { if (sel.has(f.id)) return true; removed.push(f.id); return false; });
    P.falling = P.falling.filter(function (f) { return sel.has(f.id); });
    var added = Array.from(sel).filter(function (id) { return !have[id]; });
    var live = !!P.started;
    added.forEach(function (id, i) {
      if (live && P.visible && onScreen() && !calm) setTimeout(function () { drop(id, pending[id]); delete pending[id]; }, i * 90);
      else { P.floats.push(newFloat(id)); delete pending[id]; }
    });
    if (removed.length && P.visible) { splashAt(CX, SY, 6, soupColor(), .6); A.bubble(.8); hint(t_().out(esc(nm(removed[0])))); }
    if (!sel.size) P.floats = [];
    known = key; P.started = true; setCount();
  }
  /* remember where a sticker was tapped, before the page re-renders it */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-i]"); if (!b || !b.closest("#p-home")) return;
    A.init(); var r = b.getBoundingClientRect(); if (!sel.has(b.dataset.i)) pending[b.dataset.i] = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, true);

  function seeti() {
    P.seetis++; P.jet = 1.3; P.weightUp = 1; A.seeti(); P.pressure = .3;
    hint(P.seetis < 3 ? t_().seeti(P.seetis) : t_().three);
    if (P.seetis >= 3) setTimeout(function () { openLid(); for (var i = 0; i < 26; i++) puffSteam(Rn(CX - 120, CX + 120), RY - Rn(0, 20), 2); reveal(t_().served); P.seetis = 0; }, 1800);
  }
  function pour() {
    var p = P.pan; if (!p.full) return; p.full = false; p.pour = 1; P.used.pan = true; if (P.lidOn) openLid();
    hint(t_().tadka);
    setTimeout(function () { A.sizzle(); P.flash = 1; P.sloshV += 3; var i;
      for (i = 0; i < (calm ? 10 : 34); i++) P.parts.push({ kind: "spark", x: CX + Rn(-90, 90), y: SY, vx: Rn(-160, 160), vy: Rn(-420, -160), r: Rn(1.2, 2.6), c: ["#FFB15C", "#F2C14E", "#FFFFFF", "#E8452C"][i % 4], t: 0, life: Rn(.5, 1.1), g: 700 });
      for (i = 0; i < (calm ? 6 : 22); i++) P.parts.push({ kind: "smoke", x: CX + Rn(-100, 100), y: SY - Rn(0, 20), vx: Rn(-20, 20), vy: Rn(-90, -40), r: Rn(12, 22), t: 0, life: Rn(1.6, 2.8), g: -10 });
      for (i = 0; i < 6; i++) P.ripples.push({ x: CX + Rn(-70, 70), y: SY + Rn(-6, 6), t: Rn(0, .3), s: 1.3 });
    }, 360);
    setTimeout(function () { p.pour = 0; }, 1500);
    setTimeout(function () { p.full = true; }, 5200);
  }

  /* ================= simulation ================= */
  var last = performance.now(), nextBubble = 0, nextRattle = 0;
  function step(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    sync();
    if (!P.visible || document.hidden) { A.quiet(); return; }
    P.t += dt; var t = P.t, h = P.lit ? P.heat : 0, i;
    ["x", "y", "r"].forEach(function (k) { P.lid[k] += (P.lidT[k] - P.lid[k]) * Math.min(1, dt * 9); });
    for (i = P.falling.length - 1; i >= 0; i--) { var f = P.falling[i]; f.vy += 1500 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      if (f.vy > 0 && f.y > SY - 4 && Math.abs(f.x - CX) < MRX + 10) { P.falling.splice(i, 1); land(f); }
      else if (f.y > H + 40) { P.falling.splice(i, 1); if (sel.has(f.id)) P.floats.push(newFloat(f.id)); } }
    P.omega *= Math.pow(.35, dt);
    P.floats.forEach(function (fl) { fl.a += (P.omega * (1.25 - fl.r * .6) + .05) * dt; fl.rot += P.omega * dt * .6; });
    if (P.ladle) { var sp = Math.abs(P.omega); P.mix = clamp(P.mix + sp * dt * .16, 0, 1); A.set(A.swish, Math.min(.22, sp * .06), 380 + sp * 260); if (P.mix >= 1 && !P.revealing) { P.mix = 0; reveal(t_().mixed); } }
    else { A.set(A.swish, 0); P.mix = Math.max(0, P.mix - dt * .08); }
    P.sloshV += -P.slosh * 30 * dt; P.sloshV *= Math.pow(.2, dt); P.slosh += P.sloshV * dt;
    P.flash = Math.max(0, P.flash - dt * .7); P.bump = Math.max(0, P.bump - dt * 4); P.weightUp = Math.max(0, P.weightUp - dt * .7);
    A.set(A.gas, h * .045, 1200 + h * 900); A.set(A.roar, h * h * .16); A.set(A.simmer, P.lidOn ? h * .03 : h * h * .09);
    if (!P.lidOn) {
      if (h > .12 && now > nextBubble) { P.bubbles.push({ x: CX + Rn(-1, 1) * (MRX - 30), y: SY + Rn(-1, 1) * (MRY - 10), r: Rn(3, 7) * (.6 + h), t: 0, life: Rn(.25, .6) }); nextBubble = now + Rn(30, 260) / (h * h * 3 + .2); }
      if (Math.random() < dt * (1.2 + h * 9) * (calm ? .3 : 1)) puffSteam(CX + Rn(-100, 100), SY - 6, .6 + h);
    } else {
      P.pressure = clamp(P.pressure + (h > .55 ? (h - .5) * .62 : -.12) * dt, 0, 1);
      if (P.pressure > .45 && now > nextRattle) { A.rattle(P.pressure); nextRattle = now + Rn(70, 220) / P.pressure; }
      if (Math.random() < dt * P.pressure * 5) puffSteam(CX + (Math.random() < .5 ? -1 : 1) * Rn(120, 140), RY - 2, .8);
      if (P.pressure >= 1 && !P.revealing) seeti();
    }
    if (P.jet > 0) { P.jet -= dt; for (i = 0; i < 3; i++) P.steam.push({ x: CX + Rn(-4, 4) + P.lid.x, y: RY - 82 + P.lid.y, vx: Rn(-20, 20), vy: Rn(-420, -300), r: Rn(5, 9), a: .75, t: 0, life: Rn(.5, .9) }); }
    for (i = P.bubbles.length - 1; i >= 0; i--) { var b = P.bubbles[i]; b.t += dt; if (b.t >= b.life) { P.bubbles.splice(i, 1); A.bubble(b.r > 6 ? .8 : 1.2); P.ripples.push({ x: b.x, y: b.y, t: .3, s: .25 }); if (Math.random() < .3) splashAt(b.x, b.y, 2, soupColor(), .35); } }
    for (i = P.ripples.length - 1; i >= 0; i--) { P.ripples[i].t += dt * 1.1; if (P.ripples[i].t >= 1) P.ripples.splice(i, 1); }
    for (i = P.parts.length - 1; i >= 0; i--) { var p = P.parts[i]; p.t += dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === "drop" && p.vy > 0 && p.y > SY && Math.abs(p.x - CX) < MRX) p.t = p.life; if (p.t >= p.life) P.parts.splice(i, 1); }
    for (i = P.steam.length - 1; i >= 0; i--) { var s = P.steam[i]; s.t += dt; s.x += (s.vx + Math.sin(t * 2 + s.y * .03) * 14) * dt; s.y += s.vy * dt; if (s.t >= s.life) P.steam.splice(i, 1); }
    if (P.steam.length > 160) P.steam.splice(0, P.steam.length - 160);
    var pn = P.pan;
    if (pn.pour) { pn.tilt += (1.05 - pn.tilt) * dt * 8; if (Math.random() < .8) P.parts.push({ kind: "drop", x: pn.x + 24, y: pn.y - 4, vx: Rn(-20, 20), vy: Rn(20, 80), r: Rn(2, 3.4), c: Math.random() < .25 ? "#5B3D20" : "#E6A62A", t: 0, life: 1, g: 1200 }); }
    else if (!pn.drag) { pn.tilt += (0 - pn.tilt) * dt * 6; pn.x += (PAN_REST.x - pn.x) * dt * 6; pn.y += (PAN_REST.y - pn.y) * dt * 6; }
    render(t);
  }
  var lastFrame = 0;
  function frame(now) { lastFrame = now; step(now); requestAnimationFrame(frame); }
  setInterval(function () { var n = performance.now(); if (n - lastFrame > 250) step(n); }, 40);
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { P.visible = es[0].isIntersecting; }, { threshold: .05 }).observe(cv);

  /* ================= input on the pot ================= */
  var pt = function (e) { return canvasPoint(e.clientX, e.clientY); };
  var inMouth = function (p) { return Math.pow((p.x - CX) / (MRX + 10), 2) + Math.pow((p.y - SY) / (MRY + 40), 2) < 1; };
  var onLid = function (p) { return P.lidOn ? (p.y > RY - 90 && p.y < RY + 8 && Math.abs(p.x - CX) < MRX + 8) : (Math.hypot(p.x - (CX + P.lid.x), p.y - (RY + P.lid.y - 30)) < 110); };
  var drag = null;
  cv.addEventListener("pointerdown", function (e) {
    A.init(); var p = pt(e); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    if (Math.hypot(p.x - KNOB.x, p.y - KNOB.y) < KNOB.r + 16) { drag = { k: "knob", a0: Math.atan2(p.y - KNOB.y, p.x - KNOB.x) }; P.used.knob = true; return; }
    if (P.pan.full && !P.pan.pour && Math.hypot(p.x - P.pan.x, p.y - P.pan.y) < 44) { drag = { k: "pan", dx: P.pan.x - p.x, dy: P.pan.y - p.y }; P.pan.drag = true; A.clank(1400, .04); return; }
    if (onLid(p)) { drag = { k: "lid", p: p }; return; }
    if (!P.lidOn && inMouth(p)) { drag = { k: "stir", p: p, la: Math.atan2((p.y - SY) / (MRY - 4), (p.x - CX) / (MRX - 6)), moved: false }; P.ladle = { x: p.x, y: Math.min(p.y, SY + 8) }; P.used.stir = true; A.clank(1900, .05); return; }
    drag = null;
  });
  cv.addEventListener("pointermove", function (e) {
    var p = pt(e), d;
    if (!drag) { cv.style.cursor = Math.hypot(p.x - KNOB.x, p.y - KNOB.y) < KNOB.r + 16 || (Math.hypot(p.x - P.pan.x, p.y - P.pan.y) < 44 && P.pan.full) ? "grab" : (onLid(p) || inMouth(p)) ? "pointer" : "default"; return; }
    if (drag.k === "knob") {
      var a = Math.atan2(p.y - KNOB.y, p.x - KNOB.x); d = a - drag.a0; if (d > Math.PI) d -= 6.283; if (d < -Math.PI) d += 6.283; drag.a0 = a;
      var before = P.heat; P.knobA = clamp(P.knobA + d, -2.36, 2.36); P.heat = (P.knobA + 2.36) / 4.72;
      if (Math.floor(before * 12) !== Math.floor(P.heat * 12)) A.click();
      if (before < .02 && P.heat >= .02 && !P.lit) { P.lit = true; A.ignite(); hint(t_().gason); }
      if (P.heat < .02 && P.lit) { P.lit = false; A.douse(); hint(t_().gasoff); }
      if (P.heat >= .02) P.lit = true;
      if (P.lidOn && P.heat > .55) hint(t_().press);
    } else if (drag.k === "pan") { P.pan.x = clamp(p.x + drag.dx, 30, W - 30); P.pan.y = clamp(p.y + drag.dy, 20, H - 30); P.pan.tilt = Math.abs(P.pan.x - CX) < MRX && P.pan.y < SY ? .45 : 0; }
    else if (drag.k === "stir") {
      drag.moved = drag.moved || Math.hypot(p.x - drag.p.x, p.y - drag.p.y) > 4;
      P.ladle = { x: clamp(p.x, CX - MRX + 26, CX + MRX - 26), y: clamp(p.y, SY - 14, SY + 10) };
      var a2 = Math.atan2((p.y - SY) / (MRY - 4), (p.x - CX) / (MRX - 6)); d = a2 - drag.la; if (d > Math.PI) d -= 6.283; if (d < -Math.PI) d += 6.283; drag.la = a2;
      P.omega = clamp(P.omega + d * 2.4, -7, 7); if (Math.random() < Math.abs(d) * 3) P.ripples.push({ x: P.ladle.x, y: P.ladle.y, t: .2, s: .4 });
      if (Math.abs(P.omega) > 1.2 && !P.revealing) hint(t_().stir);
    }
  });
  var up = function (e) {
    if (!drag) return; var p = pt(e), k = drag.k;
    if (k === "pan") { P.pan.drag = false; if (Math.abs(P.pan.x - CX) < MRX + 20 && P.pan.y < SY + 30) pour(); else A.clank(1300, .03); }
    if (k === "lid" && Math.hypot(p.x - drag.p.x, p.y - drag.p.y) < 10) { P.used.lid = true; if (P.lidOn) { openLid(); hint(t_().lidoff); } else { closeLid(); hint(P.heat > .55 ? t_().press : t_().lidon); } }
    if (k === "stir") { if (!drag.moved) { splashAt(p.x, SY, 5, soupColor(), .5); A.bubble(.9); A.bubble(1.3); P.sloshV += Rn(-1.5, 1.5); } P.ladle = null; }
    drag = null;
  };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

  /* sound switch */
  var sb = document.getElementById("potsnd");
  function syncSnd() { if (!sb) return; sb.setAttribute("aria-pressed", String(A.on)); sb.setAttribute("aria-label", A.on ? (lang == "en" ? "Sound on. Tap to mute" : "Awaaz on. Band karne ke liye tap karein") : (lang == "en" ? "Sound off. Tap to unmute" : "Awaaz band. On karne ke liye tap karein")); }
  if (sb) sb.addEventListener("click", function () { A.on = !A.on; LS.set("cwwhy_snd", A.on ? 1 : 0); syncSnd(); if (A.on) { A.init(); A.tock(); } else A.quiet(); });

  /* the sticky "show dishes" button stays out of the way while the pot (or the dishes) are on screen */
  var liveEl = document.getElementById("live"), heroIn = true, resIn = false;
  function liveState() { if (liveEl) liveEl.classList.toggle("gone", heroIn || resIn); }
  if ("IntersectionObserver" in window) {
    var hero = document.querySelector("#p-home .hero"), res = document.getElementById("out");
    if (hero) new IntersectionObserver(function (es) { heroIn = es[0].isIntersecting; liveState(); }, { threshold: .2 }).observe(hero);
    if (res) new IntersectionObserver(function (es) { resIn = es[0].isIntersecting; liveState(); }, { rootMargin: "0px 0px -35% 0px" }).observe(res);
  }

  window.potSync = function () { setCount(); syncSnd(); if (!P.revealing) hint(t_().idle); };
  syncSnd(); setCount(); hint(t_().idle);
  requestAnimationFrame(frame);
})();
