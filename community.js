/* Cook With What You Have: community board (photos, questions, replies, top cooks).
   Switched off unless community-config.js has a Supabase url and anon key. */
(function () {
  "use strict";
  var cfg = window.CWWHY_COMMUNITY || {};
  var ON = !!(cfg.url && cfg.anonKey);
  var API = { on: ON, sync: function () {}, render: function () {} };
  window.CWWHY_COMM = API;
  if (!ON) return;

  var SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.js";
  var BUCKET = "post-photos";
  var AVC = ["#C0392B", "#B35F00", "#4A6046", "#2B231F", "#8A4B7A", "#1F5F7A", "#9A3B2E"];

  var S = {
    sb: null, sdkFail: false, user: null, profile: null, isMod: false, profLoading: false,
    tab: "show", posts: [], replies: {}, counts: {}, mine: {}, top: null,
    loaded: false, loading: false, err: "", open: {}, drafts: {},
    composer: false, kind: "photo", sent: false, busy: false, file: null, preview: "", cTitle: "", cBody: "", cTags: "", cMsg: "",
    modal: false, step: "choose", email: "", name: "", agree: false, mMsg: "", mBusy: false, menu: false, limit: 60,
    exLiked: {}, solvedNow: null
  };

  /* ---------- small helpers ---------- */
  var q = function (id) { return document.getElementById(id); };
  var h = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var say = function (m) { if (typeof toast === "function") toast(m); };
  var colour = function (n) { var t = 0, s = String(n || "?"); for (var i = 0; i < s.length; i++) t = (t * 31 + s.charCodeAt(i)) >>> 0; return AVC[t % AVC.length]; };
  var ini = function (n) { return h(String(n || "?").trim().charAt(0).toUpperCase() || "?"); };
  var pageOpen = function () { var e = q("p-community"); return !!e && !e.hidden; };
  function ago(iso) {
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) { var m = Math.floor(s / 60); return m + (m === 1 ? " minute ago" : " minutes ago"); }
    if (s < 86400) { var hr = Math.floor(s / 3600); return hr + (hr === 1 ? " hour ago" : " hours ago"); }
    if (s < 172800) return "Yesterday";
    if (s < 604800) return Math.floor(s / 86400) + " days ago";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  var nameOf = function (row) { return (row && row.profiles && row.profiles.display_name) || "A cook"; };
  var mineP = function (p) { return S.user && p.user_id === S.user.id; };
  function photoUrl(path) {
    try { return S.sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl; } catch (e) { return ""; }
  }
  var ICON = {
    cam: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.2" r="3.6"/></svg>',
    ask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5M12 16.4v.1"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-3-7z"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>'
  };
  function medal(rank) {
    var c = ["#E6B422", "#B8BEC4", "#C9803E"][rank - 1];
    return '<svg class="cm-medal" viewBox="0 0 40 40" role="img" aria-label="Rank ' + rank + '"><circle cx="20" cy="20" r="18" fill="' + c + '"/><circle cx="20" cy="20" r="18" fill="none" stroke="#2B231F" stroke-opacity=".25" stroke-width="2"/><circle cx="20" cy="20" r="13" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/><text x="20" y="26" text-anchor="middle" font-family="Fraunces,Georgia,serif" font-weight="700" font-size="17" fill="#2B231F">' + rank + '</text></svg>';
  }

  /* ---------- little animations (all skipped for people who ask for reduced motion) ---------- */
  var EX = window.CWWHY_EXAMPLES || null;
  var calm = function () { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); };
  var hoursSince = function (iso) { return Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  /* "Still hot": steam on posts that are getting likes quickly. Only real like counts and post age go in. */
  function heatOf(likes, hours) {
    if (hours > 48 || likes < 2) return "";
    var s = likes / Math.pow(1 + hours / 3, 1.5);
    return s >= 2.5 ? "hot" : s >= 1.2 ? "warm" : "";
  }
  function steamSvg(heat) {
    if (!heat) return "";
    var o = heat === "hot" ? .95 : .6, xs = heat === "hot" ? [200, 162, 238] : [200], out = "";
    xs.forEach(function (x, i) { out += '<path style="--d:' + (i * .9) + "s;--o:" + o + '" d="M' + x + ' 150q-14 -18 0 -36q14 -18 0 -36q-14 -18 0 -36"/>'; });
    return '<svg class="cm-steam" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + out + "</svg>" + (heat === "hot" ? '<span class="cm-hotag">still hot!</span>' : "");
  }

  /* Sounds go through the site's own sound engine, so the pot's mute button controls them too. */
  var SFX = (function () {
    var buf = null;
    function ac() { try { var s = window.CWWHY_SND; return s && s.on ? s.ctx() : null; } catch (e) { return null; } }
    function tone(f, o) {
      var c = ac(); if (!c) return; o = o || {};
      var t = c.currentTime + (o.t || 0), d = o.dur || .12, osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || "sine"; osc.frequency.setValueAtTime(f, t); if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + d);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(o.g || .1, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      osc.connect(g); g.connect(c.destination); osc.start(t); osc.stop(t + d + .03);
    }
    function noise(o) {
      var c = ac(); if (!c) return;
      if (!buf) { buf = c.createBuffer(1, c.sampleRate, c.sampleRate); var a = buf.getChannelData(0); for (var i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; }
      var t = c.currentTime + (o.t || 0), d = o.dur || .2, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
      s.buffer = buf; s.loop = true; fl.type = o.type || "highpass"; fl.frequency.setValueAtTime(o.f || 3000, t); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + d); fl.Q.value = o.q || .8;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(o.g || .1, t + (o.a || .005)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      s.connect(fl); fl.connect(g); g.connect(c.destination); s.start(t, Math.random() * .5); s.stop(t + d + .03);
    }
    return {
      pop: function () { tone(480, { f2: 920, dur: .09, g: .12 }); },
      sizzle: function () { noise({ dur: .3, g: .025, f: 5200 }); for (var i = 0; i < 5; i++) noise({ t: Math.random() * .25, dur: .02, g: .045, type: "bandpass", f: 2500 + Math.random() * 3500, q: 3 }); },
      soft: function () { tone(620, { f2: 420, dur: .07, g: .05 }); },
      clink: function () { [1250, 2830, 4120].forEach(function (f, i) { tone(f, { dur: .3 - i * .06, g: .04 / (i + 1) }); }); },
      clatter: function () { [0, .07, .13, .2].forEach(function (t, i) { tone(1180 * (1 + (Math.random() - .5) * .05), { t: t, dur: .12, g: .035 / (i + 1) }); }); },
      whoosh: function () { noise({ dur: .4, g: .05, type: "bandpass", f: 380, f2: 2600, q: 1.1, a: .12 }); },
      blub: function () { tone(160 + Math.random() * 90, { f2: 380 + Math.random() * 140, dur: .08, g: .06 }); },
      ding: function () { tone(1318.5, { dur: 1, g: .06 }); tone(1975.5, { dur: .7, g: .025 }); },
      thud: function () { tone(150, { f2: 46, dur: .26, g: .3 }); noise({ dur: .09, g: .12, type: "lowpass", f: 1200 }); },
      coin: function () { tone(988, { dur: .09, g: .05, type: "triangle" }); tone(1319, { t: .08, dur: .3, g: .05, type: "triangle" }); }
    };
  })();

  function fx() {
    var l = q("cm-fx");
    if (!l) { l = document.createElement("div"); l.id = "cm-fx"; l.setAttribute("aria-hidden", "true"); document.body.appendChild(l); }
    return l;
  }
  var ANISE = (function () { var p = []; for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 3.6 : 10.5; p.push((Math.cos(a) * r).toFixed(1) + " " + (Math.sin(a) * r).toFixed(1)); } return '<svg viewBox="-12 -12 24 24"><path d="M' + p.join("L") + 'Z" fill="#7A4A2A"/><circle r="2.4" fill="#C9803E"/></svg>'; })();
  var SPICE = [
    '<svg viewBox="-12 -12 24 24"><path d="M-8 -6Q6 -10 8 6Q9 13 4 10Q6 1 -7 -2Z" fill="#C0392B"/><path d="M-8 -6Q-11 -7 -12 -10" fill="none" stroke="#3F7A2E" stroke-width="2.4" stroke-linecap="round"/></svg>',
    '<svg viewBox="-12 -12 24 24"><ellipse rx="5" ry="9" fill="#8DB04A"/><path d="M0 -8Q2 0 0 8" fill="none" stroke="#5E7F2C" stroke-width="1.4"/></svg>',
    ANISE,
    '<svg viewBox="-12 -12 24 24"><ellipse rx="2.6" ry="6.5" fill="#8B6B3D" transform="rotate(24)"/></svg>',
    '<svg viewBox="-12 -12 24 24"><circle r="5" fill="#E6B422"/></svg>',
    '<svg viewBox="-12 -12 24 24"><path d="M0 9C-9 3 -11 -3 -7 -7C-4 -9.5 -1 -8 0 -5.5C1 -8 4 -9.5 7 -7C11 -3 9 3 0 9Z" fill="#C0392B"/></svg>'
  ];
  /* tiny chillies, cardamom, star anise, cumin and haldi thrown out of a like */
  function burst(x, y, n, far) {
    var layer = fx();
    for (var i = 0; i < n; i++) {
      var el = document.createElement("span"), s = rnd(14, 22) * (far ? 1.15 : 1);
      el.className = "cm-pt"; el.innerHTML = SPICE[i % SPICE.length];
      el.style.cssText = "width:" + s + "px;height:" + s + "px;left:" + (x - s / 2) + "px;top:" + (y - s / 2) + "px";
      layer.appendChild(el);
      var a = i / n * Math.PI * 2 + rnd(-.35, .35), d = far ? rnd(50, 110) : rnd(38, 80), dx = Math.cos(a) * d, dy = Math.sin(a) * d, rot = rnd(-220, 220);
      el.animate([
        { transform: "translate(0px,0px) rotate(0deg) scale(.2)", opacity: 1 },
        { transform: "translate(" + dx * .78 + "px," + (dy * .78 - 12) + "px) rotate(" + rot * .6 + "deg) scale(1.05)", opacity: 1, offset: .45 },
        { transform: "translate(" + dx + "px," + (dy + 24) + "px) rotate(" + rot + "deg) scale(.7)", opacity: 0 }
      ], { duration: rnd(700, 980), easing: "cubic-bezier(.16,.8,.3,1)", fill: "forwards" }).onfinish = (function (e) { return function () { e.remove(); }; })(el);
    }
  }
  function likeBtn(action, id, on, n) {
    return '<button type="button" class="cm-act' + (on ? " on" : "") + '" data-cm="' + action + '" data-id="' + id + '" aria-pressed="' + on + '" aria-label="' + (on ? "Unlike" : "Like") + " this post. " + n + ' likes">' + ICON.heart + '<span class="cm-odo">' + n + "</span></button>";
  }
  /* after a re-render: pop the new heart, roll the number, throw the spices */
  function celebrate(id, was, liked) {
    var b = document.querySelector('#p-community [data-id="' + id + '"][aria-pressed]'); if (!b) return;
    var ic = b.querySelector("svg"), o = b.querySelector(".cm-odo"), to = +o.textContent, up = liked;
    if (calm()) return;
    o.innerHTML = "<span>" + was + "</span><span>" + to + "</span>";
    o.children[0].animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(" + (up ? -110 : 110) + "%)", opacity: 0 }], { duration: 260, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" });
    o.children[1].animate([{ transform: "translateY(" + (up ? 110 : -110) + "%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 340, easing: "cubic-bezier(.3,1.4,.4,1)", fill: "both" })
      .onfinish = function () { o.textContent = to; };
    if (!liked) { ic.animate([{ transform: "scale(1)" }, { transform: "scale(.8)" }, { transform: "scale(1)" }], { duration: 260 }); SFX.soft(); return; }
    ic.animate([{ transform: "scale(1)" }, { transform: "scale(.55)", offset: .25 }, { transform: "scale(1.4)", offset: .6 }, { transform: "scale(1)" }], { duration: 480, easing: "ease-out" });
    var r = ic.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, ring = document.createElement("span");
    ring.className = "cm-ring"; ring.style.cssText = "left:" + (x - 23) + "px;top:" + (y - 23) + "px;width:46px;height:46px"; fx().appendChild(ring);
    ring.animate([{ transform: "scale(.3)", opacity: .9 }, { transform: "scale(1.7)", opacity: 0 }], { duration: 480, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = function () { ring.remove(); };
    burst(x, y, 12); SFX.pop(); SFX.sizzle();
  }
  function bigHeart(id, x, y) {
    var ph = document.querySelector('#p-community [data-dbl="' + id + '"]'); if (!ph || calm()) return;
    var r = ph.getBoundingClientRect(), el = document.createElement("span");
    el.className = "cm-bigh";
    el.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" fill="#C0392B" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    el.style.left = (x - r.left) + "px"; el.style.top = (y - r.top) + "px"; ph.appendChild(el);
    el.animate([{ transform: "scale(0) rotate(-14deg)", opacity: 0 }, { transform: "scale(1.25) rotate(6deg)", opacity: 1, offset: .28 }, { transform: "scale(.94) rotate(-2deg)", opacity: 1, offset: .42 }, { transform: "scale(1) rotate(0deg)", opacity: 1, offset: .68 }, { transform: "translateY(-34px) scale(1.08)", opacity: 0 }], { duration: 950, easing: "ease-out" }).onfinish = function () { el.remove(); };
    burst(x, y, 16, true);
  }

  /* the SOLVED stamp; its worn-ink mask lives once in the page (added in start()) */
  var STAMP_MASK = (function () { var r = 14, s = "", rr = function () { r = (r * 9301 + 49297) % 233280; return r / 233280; }; for (var i = 0; i < 70; i++) s += '<circle cx="' + (rr() * 176).toFixed(1) + '" cy="' + (rr() * 68).toFixed(1) + '" r="' + (.5 + rr() * 1.9).toFixed(1) + '" fill="#000"/>'; return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><mask id="cm-stampmask"><rect width="176" height="68" fill="#fff"/>' + s + "</mask></defs></svg>"; })();
  var STAMP = '<svg class="cm-stamp" viewBox="0 0 176 68" aria-hidden="true"><g mask="url(#cm-stampmask)"><rect x="3" y="3" width="170" height="62" rx="9" fill="none" stroke="#C0392B" stroke-width="4.5"/><rect x="10" y="10" width="156" height="48" rx="5" fill="none" stroke="#C0392B" stroke-width="1.8"/><text x="88" y="45.5" text-anchor="middle" fill="#C0392B" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="29" letter-spacing="5">SOLVED</text></g></svg>';
  function slam(id) {
    var card = document.querySelector('#p-community [data-post="' + id + '"]'), st = card && card.querySelector(".cm-stamp");
    if (!st || calm()) return;
    st.animate([
      { transform: "translateY(-30px) rotate(-24deg) scale(2.6)", opacity: 0 },
      { transform: "translateY(0px) rotate(-9deg) scale(1)", opacity: .88, offset: .78 },
      { transform: "translateY(0px) rotate(-9deg) scale(.94)", opacity: .88, offset: .88 },
      { transform: "translateY(0px) rotate(-9deg) scale(1)", opacity: .88 }
    ], { duration: 310, easing: "cubic-bezier(.55,0,.9,.4)", fill: "backwards" });
    setTimeout(function () {
      SFX.thud();
      card.animate([0, -7, 6, -4, 3, -1.5, 0].map(function (x) { return { transform: "translate(" + x + "px," + Math.abs(x) * .3 + "px)" }; }), { duration: 360, easing: "ease-out" });
      var cr = card.getBoundingClientRect(), sr = st.getBoundingClientRect(), sx = sr.left - cr.left + sr.width / 2, sy = sr.top - cr.top + sr.height / 2;
      for (var i = 0; i < 10; i++) {
        var a = rnd(0, Math.PI * 2), d = rnd(62, 76), z = rnd(2.5, 6), sp = document.createElement("span");
        sp.className = "cm-splat"; sp.style.cssText = "left:" + (sx + Math.cos(a) * d - z / 2) + "px;top:" + (sy + Math.sin(a) * d * .45 - z / 2) + "px;width:" + z + "px;height:" + z + "px";
        card.appendChild(sp);
        sp.animate([{ transform: "scale(0)" }, { transform: "scale(1.3)", offset: .5 }, { transform: "scale(1)" }], { duration: 180, delay: i * 8, fill: "backwards" });
      }
      var best = card.querySelector(".cm-rp.best"), av = best && best.querySelector(".cm-av");
      if (!av) return;
      var r = av.getBoundingClientRect(), who = (best.querySelector("b") || {}).textContent || "", pl = document.createElement("span");
      pl.className = "cm-plus"; pl.textContent = "+5 pts for " + who.split(" ")[0];
      pl.style.left = (r.left - 6) + "px"; pl.style.top = (r.top - 6) + "px"; fx().appendChild(pl);
      SFX.coin();
      pl.animate([{ transform: "translateY(0) scale(.6)", opacity: 0 }, { transform: "translateY(-26px) scale(1.06)", opacity: 1, offset: .25 }, { transform: "translateY(-38px) scale(1)", opacity: 1, offset: .7 }, { transform: "translateY(-58px) scale(1)", opacity: 0 }], { duration: 1600, easing: "ease-out" }).onfinish = function () { pl.remove(); };
    }, 240);
  }

  /* the homepage pot in layers (steam, opening, body, lid) so a post can drop inside it */
  var PVB = '80 40 240 250';
  var POT = '<svg class="st" viewBox="' + PVB + '"><g fill="none" stroke="#9C918A" stroke-width="5" stroke-linecap="round"><path style="--d:0s" d="M170 84q-12 -16 0 -32q12 -16 0 -32"/><path style="--d:1s" d="M200 78q-12 -16 0 -32q12 -16 0 -32"/><path style="--d:2s" d="M230 84q-12 -16 0 -32q12 -16 0 -32"/></g></svg>' +
    '<svg class="bk" viewBox="' + PVB + '"><ellipse cx="200" cy="281" rx="112" ry="7" fill="#2B231F" opacity=".14"/><ellipse cx="200" cy="150" rx="95" ry="16" fill="#120D0B"/><ellipse cx="200" cy="152" rx="86" ry="11" fill="#C0392B"/></svg>' +
    '<svg class="fr" viewBox="' + PVB + '"><rect x="88" y="165" width="24" height="12" rx="6" fill="#2B231F"/><rect x="288" y="165" width="24" height="12" rx="6" fill="#2B231F"/><path d="M105 150A95 16 0 0 0 295 150L285 262Q285 272 274 272L126 272Q115 272 115 262Z" fill="#2B231F"/><rect x="112" y="204" width="176" height="10" fill="#C0392B"/><path d="M105 150A95 16 0 0 0 295 150" fill="none" stroke="#F7F3EE" stroke-opacity=".35" stroke-width="3"/></svg>' +
    '<span class="lid"><svg viewBox="' + PVB + '" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible"><path d="M105 146Q200 56 295 146Z" fill="#2B231F"/><ellipse cx="200" cy="146" rx="95" ry="6" fill="#2B231F"/><rect x="194" y="95" width="12" height="9" fill="#C0392B"/><circle cx="200" cy="93" r="8" fill="#C0392B"/></svg></span>';
  /* the sent post flies into the pot, the lid rattles while it simmers, then the "waiting" chip lands */
  function intoPot(node, r0) {
    var sent = q("p-community").querySelector(".cm-sent"), pot = sent && sent.querySelector(".cm-pot");
    if (!pot || !node || calm() || !node.animate) return Promise.resolve();
    var chip = sent.querySelector(".cm-wchip"), lid = pot.querySelector(".lid"), pr = pot.getBoundingClientRect();
    var OPEN = "translate(9%,-30%) rotate(17deg)", CLOSED = "translate(0%,0%) rotate(0deg)";
    chip.style.visibility = "hidden";
    node.style.cssText = "position:absolute;margin:0;z-index:6;pointer-events:none;left:" + (r0.left - pr.left) + "px;top:" + (r0.top - pr.top) + "px;width:" + r0.width + "px";
    pot.appendChild(node);
    var dx = pr.width * .5 - (r0.left - pr.left + r0.width / 2), dy = pr.height * .44 - (r0.top - pr.top + r0.height / 2), s = Math.min(.3, pr.width * .5 / r0.width);
    SFX.clink();
    lid.animate([{ transform: CLOSED }, { transform: OPEN }], { duration: 300, easing: "cubic-bezier(.2,1.4,.4,1)", fill: "forwards" });
    setTimeout(SFX.whoosh, 150);
    setTimeout(function () { node.style.zIndex = "2"; }, 1000);
    return node.animate([
      { transform: "translate(0px,0px) scale(1) rotate(0deg)", opacity: 1 },
      { transform: "translate(0px,-14px) scale(1.02) rotate(-2deg)", opacity: 1, offset: .12 },
      { transform: "translate(" + dx * .6 + "px," + (dy - 130) + "px) scale(" + (1 + s) / 2 + ") rotate(10deg)", opacity: 1, offset: .55 },
      { transform: "translate(" + dx + "px," + (dy - 18) + "px) scale(" + s + ") rotate(3deg)", opacity: 1, offset: .82 },
      { transform: "translate(" + dx + "px," + (dy + 24) + "px) scale(" + s * .7 + ") rotate(0deg)", opacity: 0 }
    ], { duration: 1200, easing: "cubic-bezier(.35,0,.25,1)", fill: "forwards" }).finished.then(function () {
      node.remove();
      lid.animate([{ transform: OPEN, easing: "cubic-bezier(.55,0,1,.45)" }, { transform: CLOSED, offset: .5, easing: "cubic-bezier(0,.55,.45,1)" }, { transform: "translate(0%,-5%) rotate(2.5deg)", offset: .68, easing: "cubic-bezier(.55,0,1,.45)" }, { transform: CLOSED, offset: .84 }, { transform: CLOSED }], { duration: 480, fill: "forwards" });
      setTimeout(SFX.clatter, 240);
      var kf = []; for (var i = 0; i <= 12; i++) kf.push({ transform: i === 12 ? CLOSED : "translate(" + (i % 2 ? 1 : -1) * rnd(.3, 1) + "%," + (-rnd(.5, 2.6)) + "%) rotate(" + (i % 2 ? 1 : -1) * rnd(1, 3.4) + "deg)" });
      return wait(450).then(function () {
        lid.animate(kf, { duration: 1400 });
        var t0 = Date.now();
        return (function bubble() {
          if (Date.now() - t0 > 1400 || !pot.isConnected) return null;
          var side = Math.random() < .5 ? -1 : 1, z = rnd(6, 14), b = document.createElement("span");
          b.className = "cm-bub"; b.style.cssText = "left:" + (pr.width * (.5 + side * rnd(.18, .4)) - z / 2) + "px;top:" + (pr.height * .42 - z / 2) + "px;width:" + z + "px;height:" + z + "px";
          pot.appendChild(b);
          b.animate([{ transform: "translate(0,0) scale(.4)", opacity: 0 }, { transform: "translate(" + side * rnd(4, 14) + "px," + (-rnd(16, 30)) + "px) scale(1)", opacity: 1, offset: .4 }, { transform: "translate(" + side * rnd(10, 26) + "px," + (-rnd(44, 74)) + "px) scale(1.4)", opacity: 0 }], { duration: rnd(600, 900), easing: "ease-out" }).onfinish = function () { b.remove(); };
          if (Math.random() < .7) SFX.blub();
          return wait(rnd(100, 170)).then(bubble);
        })();
      });
    }).then(function () {
      if (!chip.isConnected) return;
      SFX.ding(); chip.style.visibility = "";
      chip.animate([{ opacity: 0, transform: "scale(.5)" }, { opacity: 1, transform: "scale(1.12)", offset: .6 }, { opacity: 1, transform: "scale(1)" }], { duration: 380, easing: "ease-out" });
    }).catch(function () { if (chip.isConnected) chip.style.visibility = ""; });
  }

  /* ---------- styles (only added when the feature is on) ---------- */
  var CSS = [
    ".cm-bar{display:flex;align-items:center;gap:8px;position:relative}.cm-bar[hidden]{display:none}",
    ".hb{display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:flex-end}.hb .lang{margin:0}",
    ".cm-si{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 18px;border:2px solid #2B231F;border-radius:999px;background:#fff;color:#2B231F;font:600 14px 'Inter',system-ui,sans-serif;cursor:pointer}",
    ".cm-si svg,.cm-btn svg,.cm-tab svg,.cm-act svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}",
    ".cm-si:hover{background:#2B231F;color:#fff}",
    ".cm-me{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px 0 6px;border:1px solid rgba(43,35,31,.3);border-radius:999px;background:#fff;color:#2B231F;font:600 14px 'Inter',system-ui,sans-serif;cursor:pointer;max-width:200px}",
    ".cm-me span.n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".cm-av{flex:none;width:28px;height:28px;border-radius:50%;color:#fff;display:grid;place-items:center;font:700 13px 'Inter',sans-serif}",
    ".cm-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:30;min-width:220px;background:#fff;border:1px solid rgba(43,35,31,.16);border-radius:16px;box-shadow:0 12px 30px rgba(43,35,31,.22);padding:6px;display:flex;flex-direction:column}",
    ".cm-menu button{text-align:left;border:0;background:none;padding:12px 14px;border-radius:10px;font:600 14px 'Inter',sans-serif;color:#2B231F;cursor:pointer;min-height:44px}",
    ".cm-menu button:hover{background:#F7F3EE}.cm-menu .d{color:#C0392B}",
    ".cm-hero{background:#F7F3EE;border:1px solid rgba(43,35,31,.16);border-radius:24px;padding:26px 24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:18px}",
    ".cm-hand{font:600 26px/1 Caveat,'Bradley Hand','Segoe Print',cursive;color:#C0392B}",
    ".cm-h1{font:700 clamp(32px,7vw,44px)/1.05 'Fraunces',Georgia,serif;letter-spacing:-1.3px;margin:6px 0 8px}",
    ".cm-p{margin:0;color:#675C55;font-size:15px;line-height:1.55}",
    ".cm-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 24px;border:0;border-radius:14px;background:#C0392B;color:#fff;font:700 15px 'Inter',system-ui,sans-serif;cursor:pointer}",
    ".cm-btn.ghost{background:#fff;color:#2B231F;border:2px solid #2B231F}.cm-btn.dark{background:#2B231F}.cm-btn.light{background:#fff;color:#2B231F}",
    ".cm-btn[disabled]{opacity:.45;cursor:not-allowed}",
    ".cm-btn.sm{min-height:44px;padding:0 18px;font-size:14px;border-radius:12px}",
    ".cm-cols{display:flex;flex-wrap:wrap;gap:26px;margin-top:24px;align-items:flex-start}",
    ".cm-main{flex:999 1 520px;min-width:0}.cm-side{flex:1 1 270px;min-width:0;display:flex;flex-direction:column;gap:16px}",
    ".cm-tabs{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px}",
    ".cm-tab{display:inline-flex;align-items:center;gap:9px;min-height:46px;padding:0 20px;border:1px solid rgba(43,35,31,.3);border-radius:999px;background:#fff;color:#2B231F;font:600 15px 'Inter',sans-serif;cursor:pointer}",
    ".cm-tab[aria-selected=true]{background:#2B231F;color:#fff;border-color:#2B231F}",
    ".cm-grid{display:flex;flex-wrap:wrap;gap:18px}.cm-grid>.cm-card{flex:1 1 280px;min-width:0}",
    ".cm-list{display:flex;flex-direction:column;gap:16px}",
    ".cm-card{background:#fff;border:1px solid rgba(43,35,31,.16);border-radius:22px;overflow:hidden;box-shadow:0 6px 18px rgba(43,35,31,.08)}",
    ".cm-ph{background:#EAE4DC;aspect-ratio:4/3;display:grid;place-items:center;overflow:hidden}.cm-ph img{width:100%;height:100%;object-fit:cover;display:block}",
    ".cm-bd{padding:16px 18px 18px;display:flex;flex-direction:column;gap:12px}",
    ".cm-who{display:flex;align-items:center;gap:10px;min-width:0}.cm-who b{font-size:15px}.cm-who small{display:block;font-size:12.5px;color:#675C55}",
    ".cm-txt{margin:0;font-size:15px;line-height:1.5;white-space:pre-line;overflow-wrap:anywhere}",
    ".cm-t{margin:0;font:600 24px/1.15 'Fraunces',Georgia,serif;letter-spacing:-.5px;overflow-wrap:anywhere}",
    ".cm-tags{display:flex;flex-wrap:wrap;gap:6px}.cm-tags span{font-size:12.5px;font-weight:600;background:#F7F3EE;border:1px solid rgba(43,35,31,.16);border-radius:999px;padding:3px 10px;color:#675C55}",
    ".cm-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}",
    ".cm-act{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:0 14px;border:2px solid rgba(43,35,31,.16);border-radius:999px;background:#fff;color:#2B231F;font:700 14px 'Inter',sans-serif;cursor:pointer}",
    ".cm-act.on{border-color:#C0392B;background:#FBEDEB}.cm-act.on svg{fill:#C0392B;stroke:#C0392B}",
    ".cm-link{border:0;background:none;color:#675C55;font:600 13px 'Inter',sans-serif;text-decoration:underline;cursor:pointer;min-height:44px;padding:0 6px}",
    ".cm-chip{display:inline-block;font-size:12.5px;font-weight:700;border-radius:999px;padding:3px 12px}",
    ".cm-chip.ok{background:#E3F1E8;color:#14502F}.cm-chip.open{background:#FDEBD3;color:#7A3F00}.cm-chip.wait{background:#FFF1B8;color:#5C4400}.cm-chip.no{background:#F8E1DE;color:#8A2A20}",
    ".cm-meta{font-size:13px;color:#675C55}",
    ".cm-thread{border-top:1px solid rgba(43,35,31,.16);padding-top:14px;display:flex;flex-direction:column;gap:10px}",
    ".cm-rp{border-radius:14px;padding:12px 14px;background:#F7F3EE}.cm-rp.best{background:#E3F1E8}",
    ".cm-rp .top{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:8px;margin-bottom:4px;font-size:14px}",
    ".cm-rp .cm-av{width:26px;height:26px;font-size:12px}",
    ".cm-best{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:#14502F;background:#fff;border-radius:999px;padding:2px 10px}",
    ".cm-best svg{width:12px;height:12px;fill:none;stroke:#14502F;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}",
    ".cm-form{display:flex;flex-wrap:wrap;gap:10px;align-items:center}",
    ".cm-in,.cm-ta{font:inherit;color:#2B231F;background:#fff;border:2px solid rgba(43,35,31,.2);border-radius:12px;padding:0 14px;min-height:48px;min-width:0;width:100%;box-sizing:border-box}",
    ".cm-ta{padding:12px 14px;resize:vertical}.cm-form .cm-in{flex:1 1 220px;width:auto}",
    ".cm-lb{display:block;font-size:13px;font-weight:600;color:#675C55;margin-bottom:6px}",
    ".cm-comp{margin-top:18px;background:#fff;border:2px solid #2B231F;border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:16px}",
    ".cm-kinds{display:flex;flex-wrap:wrap;gap:10px}",
    ".cm-kind{min-height:46px;padding:0 20px;border:2px solid rgba(43,35,31,.16);border-radius:12px;background:#fff;color:#2B231F;font:600 15px 'Inter',sans-serif;cursor:pointer}.cm-kind[aria-pressed=true]{border-color:#C0392B;background:#FBEDEB;font-weight:700}",
    ".cm-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:130px;border:2px dashed rgba(43,35,31,.35);border-radius:16px;background:#F7F3EE;color:#675C55;text-align:center;padding:16px;cursor:pointer}.cm-drop svg{width:34px;height:34px;fill:none;stroke:#2B231F;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}",
    ".cm-drop input{position:absolute;width:1px;height:1px;opacity:0}.cm-drop:focus-within{outline:3px solid #C0392B;outline-offset:2px}",
    ".cm-prev{display:flex;align-items:center;gap:12px}.cm-prev img{width:96px;height:72px;object-fit:cover;border-radius:12px}",
    ".cm-note{border-radius:16px;padding:14px 16px;font-size:14px}.cm-note.good{background:#E3F1E8;color:#14502F}.cm-note.bad{background:#F8E1DE;color:#8A2A20}.cm-note.info{background:#F7F3EE;color:#2B231F}",
    ".cm-queue{margin-top:18px;border:2px solid #E67E22;background:#FFF8EC;border-radius:22px;padding:18px;display:flex;flex-direction:column;gap:12px}",
    ".cm-queue h3{margin:0;font:600 20px 'Fraunces',Georgia,serif}",
    ".cm-q{background:#fff;border-radius:16px;padding:12px;display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}.cm-q img{width:120px;height:90px;object-fit:cover;border-radius:12px}.cm-q .x{flex:1 1 200px;min-width:0}",
    ".cm-box{border-radius:22px;padding:22px}",
    ".cm-top3{background:linear-gradient(160deg,#FFF4D6,#FBE3B0);border:1px solid rgba(43,35,31,.16)}",
    ".cm-top3 h2,.cm-rules h2{margin:0 0 4px;font:600 22px/1.15 'Fraunces',Georgia,serif;letter-spacing:-.4px}",
    ".cm-lead{display:flex;flex-direction:column;gap:8px;margin:14px 0 10px;padding:0;list-style:none}",
    ".cm-lead li{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.75);border-radius:16px;padding:10px 14px}",
    ".cm-lead li:first-child{background:#fff;box-shadow:0 4px 12px rgba(43,35,31,.14)}",
    ".cm-medal{flex:none;width:38px;height:38px}.cm-lead li:first-child .cm-medal{width:46px;height:46px}",
    ".cm-lead .nm{flex:1;min-width:0;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cm-lead .pt{font-weight:700;font-size:14px;color:#675C55;white-space:nowrap}",
    ".cm-small{font-size:12.5px;color:#675C55;line-height:1.45;margin:0}",
    ".cm-ask{background:#2B231F;color:#fff;display:flex;flex-direction:column;gap:10px}.cm-ask .cm-hand{color:#F2B866}",
    ".cm-ask .t{font:600 22px/1.15 'Fraunces',Georgia,serif;letter-spacing:-.4px}.cm-ask p{margin:0;font-size:14px;opacity:.88}",
    ".cm-rules{background:#fff;border:1px solid rgba(43,35,31,.16)}.cm-rules ul{margin:10px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:9px;font-size:14.5px}",
    ".cm-rules li{display:flex;gap:10px}.cm-rules li svg{flex:none;width:18px;height:18px;margin-top:3px;fill:none;stroke:#2E7D4F;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}",
    ".cm-empty{background:#F7F3EE;border:1px dashed rgba(43,35,31,.3);border-radius:20px;padding:26px 22px;text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center}",
    ".cm-ov{position:fixed;inset:0;z-index:70;background:rgba(43,35,31,.55);display:grid;place-items:center;padding:16px;overflow:auto}",
    ".cm-md{position:relative;background:#fff;border-radius:26px;padding:28px 24px 24px;width:min(440px,100%);box-sizing:border-box;box-shadow:0 20px 50px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:14px;max-height:calc(100vh - 32px);overflow:auto}",
    ".cm-x{position:absolute;right:12px;top:12px;width:44px;height:44px;border:1px solid rgba(43,35,31,.16);border-radius:50%;background:#F7F3EE;display:grid;place-items:center;cursor:pointer;padding:0}.cm-x svg{width:18px;height:18px;fill:none;stroke:#2B231F;stroke-width:2.4;stroke-linecap:round}",
    ".cm-dots{display:flex;gap:6px;margin-right:56px}.cm-dots i{flex:1;height:6px;border-radius:3px;background:#EAE4DC}.cm-dots i.on{background:#C0392B}",
    ".cm-md h2{margin:0;font:600 27px/1.1 'Fraunces',Georgia,serif;letter-spacing:-.6px}",
    ".cm-or{display:flex;align-items:center;gap:12px;color:#675C55;font-size:13px;font-weight:600}.cm-or:before,.cm-or:after{content:'';flex:1;height:1px;background:rgba(43,35,31,.16)}",
    ".cm-chk{display:flex;gap:12px;align-items:flex-start;font-size:14px}.cm-chk input{flex:none;width:24px;height:24px;margin:2px 0 0;accent-color:#C0392B}",
    ".cm-load{padding:28px;text-align:center;color:#675C55}",
    /* examples, steam, likes, stamp and the pot */
    ".cm-card{position:relative}.cm-ph{position:relative;touch-action:manipulation;-webkit-user-select:none;user-select:none}.cm-ph>svg{width:100%;height:100%;display:block}",
    ".cm-ex,.cm-hotag{position:absolute;top:10px;z-index:2;font:700 18px/1 Caveat,'Bradley Hand','Segoe Print',cursive;color:#C0392B;background:#fff;border:1.5px dashed #C0392B;border-radius:8px;padding:3px 9px 4px;box-shadow:0 2px 6px rgba(43,35,31,.14);pointer-events:none}",
    ".cm-ex{left:10px;transform:rotate(-4deg)}.cm-hotag{right:10px;transform:rotate(4deg)}.cm-qtop .cm-ex{position:static;transform:rotate(-3deg);margin-left:auto}",
    ".cm-exnote{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;margin:0 0 16px;background:#F7F3EE;border:1px dashed rgba(43,35,31,.3);border-radius:16px;padding:12px 14px 12px 16px;font-size:14px;color:#2B231F}",
    ".cm-gap{height:22px}",
    ".cm-card.cm-hot{box-shadow:0 0 0 2px rgba(192,57,43,.4),0 12px 24px rgba(192,57,43,.16)}",
    ".cm-steam{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;overflow:visible}.cm-steam path{fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;opacity:calc(var(--o) * .7);filter:drop-shadow(0 1px 2px rgba(43,35,31,.4))}",
    ".cm-odo{display:inline-grid;overflow:hidden;height:1.25em;line-height:1.25em;font-variant-numeric:tabular-nums}.cm-odo>span{grid-area:1/1}",
    "#cm-fx{position:fixed;inset:0;pointer-events:none;z-index:80;overflow:hidden}.cm-pt{position:absolute;left:0;top:0}.cm-pt svg{display:block;width:100%;height:100%}.cm-ring{position:absolute;border:3px solid #C0392B;border-radius:50%}",
    ".cm-bigh{position:absolute;width:100px;height:100px;margin:-50px 0 0 -50px;z-index:3;pointer-events:none;filter:drop-shadow(0 6px 14px rgba(0,0,0,.28))}.cm-bigh svg{display:block;width:100%;height:100%}",
    ".cm-solved .cm-qtop{padding-right:118px}.cm-stamp{position:absolute;right:14px;top:8px;width:112px;height:44px;transform:translateY(0) rotate(-9deg) scale(1);opacity:.88;pointer-events:none;z-index:2}",
    ".cm-splat{position:absolute;border-radius:50%;background:#C0392B;pointer-events:none;z-index:2;opacity:.6}",
    ".cm-plus{position:absolute;display:inline-flex;font:800 14px/1 'Inter',sans-serif;color:#5C4400;background:#FFF4D6;border:2px solid #E6B422;border-radius:999px;padding:6px 11px;white-space:nowrap}",
    ".cm-sent{position:relative;flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px}.cm-sent .note{flex:1 1 260px;display:grid;gap:10px;justify-items:start}",
    ".cm-big{font:700 40px/1 Caveat,'Bradley Hand','Segoe Print',cursive;color:#C0392B;transform:rotate(-3deg)}",
    ".cm-pot{position:relative;flex:none;width:170px;height:177px;margin:0 auto}.cm-pot>svg,.cm-pot>.lid{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible}",
    ".cm-pot .st{z-index:0}.cm-pot .bk{z-index:1}.cm-pot .fr{z-index:3}.cm-pot .lid{z-index:4;transform-origin:50% 42%}.cm-pot .st path{opacity:.45}",
    ".cm-bub{position:absolute;border-radius:50%;border:2px solid rgba(43,35,31,.42);background:rgba(255,255,255,.65);z-index:6;pointer-events:none}",
    /* Kitchen SOS strip on the homepage and the live dot in the nav */
    ".sosbar{margin:18px 0 26px;display:flex;flex-wrap:wrap;align-items:center;gap:12px 18px;background:#2B231F;color:#fff;border-radius:22px;padding:14px 16px 14px 14px}.sosbar[hidden]{display:none}",
    ".sos-badge{flex:none;display:grid;place-items:center;align-content:center;gap:3px;width:56px;height:56px;border-radius:16px;background:#C0392B;font:800 12px/1 'Inter',sans-serif;letter-spacing:.06em;box-shadow:inset 0 -4px 0 rgba(0,0,0,.18)}.sos-badge svg{width:22px;height:22px;fill:none;stroke:#fff;stroke-width:2.2}",
    ".sos-t{flex:1 1 260px;min-width:0}.sos-t b{display:flex;align-items:center;gap:8px;font:600 19px/1.2 'Fraunces',Georgia,serif;color:#fff}.sosbar .sos-t p{margin:3px 0 0;font-size:13.5px;color:rgba(255,255,255,.88);line-height:1.45}.sos-t p em{font-style:normal;font-weight:700;color:#F2B866}",
    ".sos-go{flex:none;display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 18px;border:0;border-radius:12px;background:#fff;color:#2B231F;font:700 14px 'Inter',sans-serif;cursor:pointer}.sos-go svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}",
    ".sos-live{position:relative;display:inline-block;width:8px;height:8px;border-radius:50%;background:#C0392B;flex:none}.sos-live:after{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid #C0392B;opacity:0}",
    ".nav .navsos{display:inline-flex;align-items:center;gap:7px}.nav .sos-ct{font:700 11px/1 'Inter',sans-serif;background:#2B231F;color:#fff;border-radius:999px;padding:3px 6px}.nav button.on .sos-ct{background:#fff;color:#C0392B}.nav button.on .sos-live{background:#fff}",
    "@media(max-width:620px){.sosbar{padding:12px}.sos-go{flex:1 1 100%;justify-content:center}}",
    "@media(prefers-reduced-motion:no-preference){.sos-live:after{animation:cmPing 1.8s ease-out infinite}@keyframes cmPing{0%{opacity:.8;transform:scale(.4)}100%{opacity:0;transform:scale(1.5)}}}",
    "@media(prefers-reduced-motion:no-preference){.cm-steam path,.cm-pot .st path{opacity:0;animation:cmWisp 2.8s ease-in-out infinite;animation-delay:var(--d,0s)}@keyframes cmWisp{0%{opacity:0;transform:translateY(16px)}30%{opacity:var(--o,.75)}75%{opacity:calc(var(--o,.75) * .4)}100%{opacity:0;transform:translateY(-12px)}}}",
    "@media(prefers-reduced-motion:no-preference){.cm-card{animation:cmIn .35s ease-out both}@keyframes cmIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}}",
    "@media(max-width:620px){.cm-hero{padding:20px 16px}.cm-me{max-width:150px}}"
  ].join("\n");

  /* ---------- the Supabase client (loaded only when needed) ---------- */
  var sdkP = null;
  function ensure() {
    if (S.sb) return Promise.resolve(S.sb);
    if (sdkP) return sdkP;
    sdkP = new Promise(function (res) {
      function done() {
        try {
          S.sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
          S.sb.auth.onAuthStateChange(function (ev, session) { setTimeout(function () { applySession(session); }, 0); });
          S.sb.auth.getSession().then(function (r) { applySession(r && r.data && r.data.session); });
          res(S.sb);
        } catch (e) { S.sdkFail = true; res(null); }
      }
      if (window.supabase && window.supabase.createClient) return done();
      var sc = document.createElement("script");
      sc.src = SDK; sc.async = true; sc.onload = done;
      sc.onerror = function () { S.sdkFail = true; sdkP = null; res(null); render(); };
      document.head.appendChild(sc);
    });
    return sdkP;
  }
  function hasStoredSession() {
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^sb-.*-auth-token$/.test(k)) return true; } } catch (e) {}
    return false;
  }

  /* ---------- sign-in state ---------- */
  function applySession(session) {
    var u = (session && session.user) || null, changed = (u && u.id) !== (S.user && S.user.id);
    S.user = u;
    if (!u) {
      S.profile = null; S.isMod = false;
      if (changed) { S.mine = {}; paintBar(); if (pageOpen()) { S.loaded = false; render(); } }
      return;
    }
    if ((!changed && S.profile) || S.profLoading) return;
    if (/[?&]code=/.test(location.search)) {
      try { var url = new URL(location.href); url.searchParams.delete("code"); history.replaceState(history.state, "", url.pathname + url.search + url.hash); } catch (e) {}
    }
    S.profLoading = true;
    var sb = S.sb;
    sb.from("profiles").select("display_name").eq("id", u.id).maybeSingle().then(function (r) {
      S.profile = (r && r.data) || null;
      return S.profile ? sb.rpc("is_moderator") : { data: false };
    }).then(function (r) {
      S.isMod = !!(r && r.data);
    }).catch(function () {}).then(function () {
      S.profLoading = false;
      paintBar();
      var wasModal = S.modal, after = null;
      try { after = sessionStorage.getItem("cwwhy_after"); sessionStorage.removeItem("cwwhy_after"); } catch (e) {}
      if (!S.profile) { S.modal = true; S.step = "name"; S.mMsg = ""; renderModal(); }
      else {
        if (wasModal) closeModal();
        if (after && typeof go === "function") go("community");
        if (wasModal || after) say("Welcome back, " + S.profile.display_name + "!");
      }
      S.loaded = false;
      if (pageOpen()) render();
    });
  }
  function signedIn() { return !!(S.user && S.profile); }
  function need() {
    if (signedIn()) return true;
    openModal(S.user ? "name" : "choose");
    return false;
  }

  /* ---------- header bar ---------- */
  function paintBar() {
    var b = q("cm-bar"); if (!b) return;
    if (S.user && S.profile) {
      var n = S.profile.display_name;
      b.innerHTML = '<button type="button" class="cm-me" data-cm="menu" aria-haspopup="true" aria-expanded="' + S.menu + '"><span class="cm-av" style="background:' + colour(n) + '" aria-hidden="true">' + ini(n) + '</span><span class="n">' + h(n) + '</span></button>' +
        (S.menu ? '<div class="cm-menu" role="menu"><button type="button" role="menuitem" data-cm="signout">Sign out</button><button type="button" role="menuitem" class="d" data-cm="delacct">Delete my account</button></div>' : "");
    } else {
      b.innerHTML = '<button type="button" class="cm-si" data-cm="signin">' + ICON.user + 'Sign in</button>';
    }
  }

  /* ---------- sign-in dialog ---------- */
  var lastFocus = null;
  function openModal(step) {
    lastFocus = document.activeElement; S.modal = true; S.step = step || "choose"; S.mMsg = ""; S.mBusy = false;
    ensure().then(function () { renderModal(); });
    renderModal();
  }
  function closeModal() {
    S.modal = false; var o = q("cm-ov"); if (o) o.remove();
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  }
  function renderModal() {
    var o = q("cm-ov");
    if (!S.modal) { if (o) o.remove(); return; }
    var step = S.step, idx = { choose: 1, code: 2, name: 3 }[step] || 1, body = "";
    var dots = '<div class="cm-dots" role="img" aria-label="Step ' + idx + ' of 3"><i class="on"></i><i class="' + (idx >= 2 ? "on" : "") + '"></i><i class="' + (idx >= 3 ? "on" : "") + '"></i></div>';
    var msg = S.mMsg ? '<div class="cm-note bad" role="alert">' + h(S.mMsg) + "</div>" : "";
    if (S.sdkFail) {
      body = '<h2 id="cm-mt">Sign-in is unavailable</h2><p class="cm-p">We could not reach the sign-in service. Please check your connection and try again in a moment.</p><button type="button" class="cm-btn dark" data-cm="close">Close</button>';
    } else if (step === "choose") {
      body = '<h2 id="cm-mt">Sign in or create an account</h2>' +
        (cfg.google ? '<button type="button" class="cm-btn ghost" data-cm="google"' + (S.mBusy ? " disabled" : "") + '>' + ICON.user + 'Continue with Google</button><div class="cm-or">or use your email</div>' : "") +
        '<form data-cm-form="email"><label class="cm-lb" for="cm-email">Email address</label><input class="cm-in" id="cm-email" type="email" autocomplete="email" inputmode="email" required placeholder="you@example.com" value="' + h(S.email) + '">' +
        '<button type="submit" class="cm-btn" style="width:100%;margin-top:12px"' + (S.mBusy ? " disabled" : "") + '>' + (S.mBusy ? "Sending..." : "Email me a sign-in link") + "</button></form>" + msg +
        '<p class="cm-small">No password needed. We email you a sign-in link (or a short code to type in). By continuing you agree to the kitchen rules and the <a href="#privacy" data-n="privacy" style="color:inherit">privacy notice</a>. You must be 13 or older.</p>';
    } else if (step === "code") {
      body = '<h2 id="cm-mt">Check your email</h2><p class="cm-p">We sent an email to <b style="color:#2B231F">' + h(S.email) + '</b>. Tap the <b>Sign in</b> link in it, opening it in this same browser. If your email shows a code instead, type it below.</p>' +
        '<form data-cm-form="code"><label class="cm-lb" for="cm-code">Sign-in code</label><input class="cm-in" id="cm-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required placeholder="123456" style="letter-spacing:4px;font-size:20px">' +
        '<button type="submit" class="cm-btn" style="width:100%;margin-top:12px"' + (S.mBusy ? " disabled" : "") + '>' + (S.mBusy ? "Checking..." : "Sign in") + "</button></form>" + msg +
        '<div class="cm-row"><button type="button" class="cm-link" data-cm="resend">Send a new email</button><button type="button" class="cm-link" data-cm="back">Use a different email</button></div>';
    } else {
      body = '<h2 id="cm-mt">What should we call you?</h2><p class="cm-p">This is the name other cooks see next to your posts. Your email is never shown.</p>' +
        '<form data-cm-form="name"><label class="cm-lb" for="cm-name">Display name</label><input class="cm-in" id="cm-name" type="text" maxlength="30" minlength="2" required placeholder="e.g. Sana R." value="' + h(S.name) + '" autocomplete="nickname">' +
        '<div class="cm-chk" style="margin-top:14px"><input id="cm-agree" type="checkbox"' + (S.agree ? " checked" : "") + '><label for="cm-agree">I am 13 or older and I agree to the kitchen rules: be kind, share my own photos and keep personal details out of posts.</label></div>' +
        '<button type="submit" class="cm-btn" style="width:100%;margin-top:14px"' + (S.mBusy ? " disabled" : "") + '>' + (S.mBusy ? "Joining..." : "Join Kitchen SOS") + "</button></form>" + msg;
    }
    var html = '<div class="cm-md" role="document"><button type="button" class="cm-x" data-cm="close" aria-label="Close">' + ICON.x + "</button>" + (S.sdkFail ? "" : dots) + body + "</div>";
    var had = o && o.contains(document.activeElement) ? document.activeElement.id : "";
    if (!o) { o = document.createElement("div"); o.id = "cm-ov"; o.className = "cm-ov"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-labelledby", "cm-mt"); document.body.appendChild(o); }
    o.innerHTML = html;
    var f = (had && q(had)) || o.querySelector("input:not([type=checkbox])") || o.querySelector("button.cm-btn");
    if (f && f.focus) f.focus();
  }

  /* ---------- sign-in actions ---------- */
  function sbReady() { return ensure().then(function (sb) { if (!sb) { S.sdkFail = true; renderModal(); } return sb; }); }
  function sendCode(email) {
    S.mBusy = true; S.mMsg = ""; S.email = email; renderModal();
    sbReady().then(function (sb) {
      if (!sb) return;
      return sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } }).then(function (r) {
        S.mBusy = false;
        if (r.error) { S.mMsg = /rate|seconds|too many/i.test(r.error.message) ? "Please wait a minute before asking for another code." : "We could not send a code to that address. Please check it and try again."; }
        else S.step = "code";
        renderModal();
      });
    }).catch(function () { S.mBusy = false; S.mMsg = "Something went wrong. Please try again."; renderModal(); });
  }
  function checkCode(code) {
    S.mBusy = true; S.mMsg = ""; renderModal();
    sbReady().then(function (sb) {
      if (!sb) return;
      return sb.auth.verifyOtp({ email: S.email, token: code.trim(), type: "email" }).then(function (r) {
        S.mBusy = false;
        if (r.error) { S.mMsg = "That code did not work. Check it and try again, or ask for a new one."; renderModal(); }
        /* success: onAuthStateChange takes it from here */
      });
    }).catch(function () { S.mBusy = false; S.mMsg = "Something went wrong. Please try again."; renderModal(); });
  }
  function google() {
    S.mBusy = true; renderModal();
    sbReady().then(function (sb) {
      if (!sb) return;
      try { sessionStorage.setItem("cwwhy_after", "1"); } catch (e) {}
      return sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } }).then(function (r) {
        if (r && r.error) { S.mBusy = false; S.mMsg = "Google sign-in is not available right now. You can use your email instead."; renderModal(); }
      });
    });
  }
  function saveName(name, agree) {
    name = name.trim().replace(/\s+/g, " "); S.name = name; S.agree = agree;
    if (name.length < 2 || name.length > 30) { S.mMsg = "Please choose a name between 2 and 30 characters."; renderModal(); return; }
    if (!agree) { S.mMsg = "Please tick the box to continue."; renderModal(); return; }
    S.mBusy = true; S.mMsg = ""; renderModal();
    S.sb.from("profiles").insert({ id: S.user.id, display_name: name }).then(function (r) {
      S.mBusy = false;
      if (r.error) { S.mMsg = r.error.code === "23505" ? "That name is already taken. Please try another." : "We could not save your name. Please try again."; renderModal(); return; }
      S.profile = { display_name: name }; S.isMod = false;
      paintBar(); closeModal(); say("Welcome, " + name + "!"); S.loaded = false; if (pageOpen()) render();
    });
  }
  function signOut() {
    S.menu = false;
    if (!S.sb) return;
    S.sb.auth.signOut().then(function () { S.user = null; S.profile = null; S.isMod = false; S.mine = {}; paintBar(); say("You are signed out."); S.loaded = false; if (pageOpen()) render(); });
  }
  function deleteAccount() {
    S.menu = false; paintBar();
    if (!window.confirm("Delete your account?\n\nThis permanently removes your account, posts, replies and photos. It cannot be undone.")) return;
    var sb = S.sb, uid = S.user.id;
    sb.storage.from(BUCKET).list(uid, { limit: 1000 }).then(function (r) {
      var files = ((r && r.data) || []).map(function (f) { return uid + "/" + f.name; });
      return files.length ? sb.storage.from(BUCKET).remove(files) : null;
    }).catch(function () {}).then(function () {
      return sb.rpc("delete_my_account");
    }).then(function (r) {
      if (r && r.error) { say("We could not delete your account. Please try again."); return; }
      return sb.auth.signOut().then(function () { S.user = null; S.profile = null; S.isMod = false; S.mine = {}; paintBar(); S.loaded = false; say("Your account has been deleted."); if (pageOpen()) render(); });
    });
  }

  /* ---------- loading the board ---------- */
  function load() {
    if (S.loading) return;
    S.loading = true; S.err = ""; render();
    ensure().then(function (sb) {
      if (!sb) throw new Error("sdk");
      var uid = S.user && S.user.id;
      return sb.from("posts").select("id,user_id,kind,title,body,image_path,tags,status,best_reply_id,created_at,profiles!posts_user_id_fkey(display_name)").order("created_at", { ascending: false }).limit(S.limit).then(function (r) {
        if (r.error) throw r.error;
        S.posts = r.data || [];
        var ids = S.posts.map(function (p) { return p.id; });
        return Promise.all([
          ids.length ? sb.from("replies").select("id,post_id,user_id,body,created_at,profiles!replies_user_id_fkey(display_name)").in("post_id", ids).order("created_at", { ascending: true }) : { data: [] },
          ids.length ? sb.rpc("post_like_counts", { p_ids: ids }) : { data: [] },
          uid ? sb.from("likes").select("post_id") : { data: [] },
          sb.rpc("top_cooks_this_week")
        ]);
      });
    }).then(function (rs) {
      S.replies = {}; (rs[0].data || []).forEach(function (r) { (S.replies[r.post_id] = S.replies[r.post_id] || []).push(r); });
      S.counts = {}; (rs[1].data || []).forEach(function (c) { S.counts[c.post_id] = c.n; });
      S.mine = {}; (rs[2].data || []).forEach(function (l) { S.mine[l.post_id] = true; });
      S.top = rs[3].error ? null : (rs[3].data || []);
      S.loaded = true;
    }).catch(function () {
      S.err = "We could not load the community just now. Please try again.";
    }).then(function () { S.loading = false; render(); });
  }

  /* ---------- page ---------- */
  function repliesBlock(p) {
    var list = S.replies[p.id] || [], isQ = p.kind === "question", mineQ = mineP(p), parts = [];
    list.forEach(function (r) {
      var best = p.best_reply_id === r.id, mineR = S.user && r.user_id === S.user.id, n = nameOf(r), acts = [];
      if (isQ && mineQ && !mineR && !best) acts.push('<button type="button" class="cm-link" data-cm="best" data-id="' + p.id + '" data-r="' + r.id + '">Mark as best answer</button>');
      if (!mineR) acts.push('<button type="button" class="cm-link" data-cm="report" data-t="reply" data-id="' + r.id + '">Report</button>');
      if (mineR || S.isMod) acts.push('<button type="button" class="cm-link" data-cm="del" data-t="reply" data-id="' + r.id + '">Delete</button>');
      parts.push('<div class="cm-rp' + (best ? " best" : "") + '"><div class="top"><span class="cm-av" style="background:' + colour(n) + '" aria-hidden="true">' + ini(n) + "</span><b>" + h(n) + '</b><span class="cm-meta">' + ago(r.created_at) + "</span>" +
        (best ? '<span class="cm-best">' + ICON.ok + "Best answer</span>" : "") + '</div><div class="cm-txt">' + h(r.body) + "</div>" + (acts.length ? '<div class="cm-row">' + acts.join("") + "</div>" : "") + "</div>");
    });
    if (!list.length) parts.push('<p class="cm-meta" style="margin:0">' + (isQ ? "No replies yet. Be the first to help." : "No comments yet.") + "</p>");
    if (p.status === "approved") {
      if (signedIn()) {
        parts.push('<div class="cm-form"><label class="cm-lb" for="cm-r-' + p.id + '" style="position:absolute;width:1px;height:1px;overflow:hidden">Write a reply</label><input class="cm-in" id="cm-r-' + p.id + '" data-cm-draft="' + p.id + '" type="text" maxlength="1000" placeholder="' + (isQ ? "Write a reply and help them out" : "Write a comment") + '" value="' + h(S.drafts[p.id] || "") + '"><button type="button" class="cm-btn sm" data-cm="reply" data-id="' + p.id + '">' + ICON.send + "Reply</button></div>");
      } else {
        parts.push('<div><button type="button" class="cm-btn sm ghost" data-cm="signin">Sign in to reply</button></div>');
      }
    }
    return '<div class="cm-thread">' + parts.join("") + "</div>";
  }
  function statusChip(p) {
    if (p.status === "pending") return '<span class="cm-chip wait">Waiting for approval</span>';
    if (p.status === "rejected") return '<span class="cm-chip no">Not approved</span>';
    return "";
  }
  function actions(p) {
    var n = S.counts[p.id] || 0, on = !!S.mine[p.id], rc = (S.replies[p.id] || []).length, open = !!S.open[p.id], isQ = p.kind === "question", out = [];
    if (p.status === "approved") {
      out.push(likeBtn("like", p.id, on, n));
      out.push('<button type="button" class="cm-act" data-cm="toggle" data-id="' + p.id + '" aria-expanded="' + open + '">' + ICON.chat + (open ? "Hide" : rc + (isQ ? (rc === 1 ? " reply" : " replies") : (rc === 1 ? " comment" : " comments"))) + "</button>");
    }
    var more = [];
    if (S.user && !mineP(p) && p.status === "approved") more.push('<button type="button" class="cm-link" data-cm="report" data-t="post" data-id="' + p.id + '">Report</button>');
    if (mineP(p) || S.isMod) more.push('<button type="button" class="cm-link" data-cm="del" data-t="post" data-id="' + p.id + '">Delete</button>');
    return '<div class="cm-row">' + out.join("") + more.join("") + "</div>";
  }
  function photoCard(p) {
    var n = nameOf(p), tags = (p.tags || []).map(function (t) { return "<span>" + h(t) + "</span>"; }).join("");
    var heat = p.status === "approved" ? heatOf(S.counts[p.id] || 0, hoursSince(p.created_at)) : "";
    return '<article class="cm-card' + (heat === "hot" ? " cm-hot" : "") + '" data-post="' + p.id + '"><div class="cm-ph"' + (p.status === "approved" ? ' data-dbl="' + p.id + '"' : "") + ">" + (p.image_path ? '<img src="' + h(photoUrl(p.image_path)) + '" alt="Photo of a dish shared by ' + h(n) + '" loading="lazy">' : "") + steamSvg(heat) + "</div>" +
      '<div class="cm-bd"><div class="cm-who"><span class="cm-av" style="background:' + colour(n) + '" aria-hidden="true">' + ini(n) + '</span><div style="min-width:0"><b>' + h(n) + "</b><small>" + ago(p.created_at) + "</small></div></div>" +
      statusChip(p) + '<p class="cm-txt">' + h(p.body) + "</p>" + (tags ? '<div class="cm-tags">' + tags + "</div>" : "") + actions(p) + (S.open[p.id] && p.status === "approved" ? repliesBlock(p) : "") + "</div></article>";
  }
  function threadCard(p) {
    var n = nameOf(p), solved = !!p.best_reply_id, rc = (S.replies[p.id] || []).length;
    return '<article class="cm-card' + (solved ? " cm-solved" : "") + '" data-post="' + p.id + '">' + (solved ? STAMP : "") + '<div class="cm-bd"><div class="cm-row cm-qtop">' + (p.status === "approved" ?'<span class="cm-chip ' + (solved ? "ok" : "open") + '">' + (solved ? "Solved" : "Open") + "</span>" : statusChip(p)) +
      '<span class="cm-meta">' + h(n) + " &middot; " + ago(p.created_at) + (p.status === "approved" ? " &middot; " + rc + (rc === 1 ? " reply" : " replies") : "") + "</span></div>" +
      '<h2 class="cm-t">' + h(p.title) + '</h2><p class="cm-txt">' + h(p.body) + "</p>" +
      (p.image_path ? '<div style="max-width:320px"><div class="cm-ph" style="border-radius:14px"><img src="' + h(photoUrl(p.image_path)) + '" alt="Photo attached to this question" loading="lazy"></div></div>' : "") +
      actions(p) + (S.open[p.id] && p.status === "approved" ? repliesBlock(p) : "") + "</div></article>";
  }
  function queueBlock() {
    var pend = S.posts.filter(function (p) { return p.status === "pending"; });
    if (!S.isMod) return "";
    if (!pend.length) return '<section class="cm-queue" aria-label="Posts waiting for approval"><h3>Waiting for your approval</h3><p class="cm-meta" style="margin:0">Nothing to review. You are all caught up.</p></section>';
    return '<section class="cm-queue" aria-label="Posts waiting for approval"><h3>Waiting for your approval (' + pend.length + ")</h3>" + pend.map(function (p) {
      var n = nameOf(p);
      return '<div class="cm-q">' + (p.image_path ? '<img src="' + h(photoUrl(p.image_path)) + '" alt="Photo to review">' : "") + '<div class="x"><b>' + h(n) + '</b> <span class="cm-meta">' + (p.kind === "question" ? "asked a question" : "shared a photo") + " &middot; " + ago(p.created_at) + "</span>" + (p.title ? '<div style="font-weight:700;margin-top:4px">' + h(p.title) + "</div>" : "") + '<p class="cm-txt" style="margin-top:4px">' + h(p.body) + '</p><div class="cm-row" style="margin-top:8px"><button type="button" class="cm-btn sm" data-cm="mod" data-v="approved" data-id="' + p.id + '">Approve</button><button type="button" class="cm-btn sm ghost" data-cm="mod" data-v="rejected" data-id="' + p.id + '">Reject</button></div></div></div>';
    }).join("") + "</section>";
  }
  function composerBlock() {
    if (!S.composer) return "";
    if (S.sent) return '<section class="cm-comp cm-sent" aria-label="Post sent"><div class="note" role="status"><div class="cm-big">Simmering!</div><p class="cm-p" style="color:#2B231F">Thanks! A moderator taste-tests every post before it goes live, usually within a few hours. You can see yours below with a "Waiting for approval" label.</p><span class="cm-chip wait cm-wchip">Waiting for approval</span><button type="button" class="cm-btn dark sm" data-cm="comp-close">Close</button></div><div class="cm-pot" aria-hidden="true">' + POT + "</div></section>";
    var photo = S.kind === "photo";
    return '<section class="cm-comp" aria-label="Create a post"><div class="cm-row" style="justify-content:space-between"><h2 class="cm-t" style="font-size:24px">What would you like to post?</h2><button type="button" class="cm-x" style="position:static" data-cm="comp-close" aria-label="Close">' + ICON.x + "</button></div>" +
      '<div class="cm-kinds"><button type="button" class="cm-kind" data-cm="kind" data-v="photo" aria-pressed="' + photo + '">Show what I cooked</button><button type="button" class="cm-kind" data-cm="kind" data-v="question" aria-pressed="' + !photo + '">Ask for help</button></div>' +
      (!photo ? '<div><label class="cm-lb" for="cm-ct">What is going wrong?</label><input class="cm-in" id="cm-ct" data-cm-c="cTitle" maxlength="140" placeholder="e.g. My curry came out too salty" value="' + h(S.cTitle) + '"></div>' : "") +
      '<div><span class="cm-lb">' + (photo ? "Photo of your dish (required)" : "Photo (optional, it helps people answer)") + '</span><label class="cm-drop" for="cm-file">' +
      (S.preview ? '<span class="cm-prev"><img src="' + h(S.preview) + '" alt="Preview of your photo"><span>' + h(S.file ? S.file.name : "") + '</span></span><span style="font-size:13px">Tap to choose a different photo</span>' : ICON.cam + '<span style="font-weight:600;color:#2B231F">Add a photo</span><span style="font-size:13px">JPG, PNG or WebP. Location data is removed automatically.</span>') +
      '<input id="cm-file" type="file" accept="image/jpeg,image/png,image/webp"></label></div>' +
      '<div><label class="cm-lb" for="cm-cb">Tell us more</label><textarea class="cm-ta" id="cm-cb" data-cm-c="cBody" rows="3" maxlength="1000" placeholder="' + (photo ? "What did you cook with? How did it go?" : "What did you cook with? What happened?") + '">' + h(S.cBody) + "</textarea></div>" +
      '<div><label class="cm-lb" for="cm-tg">Tags (optional, up to 3, separated by commas)</label><input class="cm-in" id="cm-tg" data-cm-c="cTags" maxlength="80" placeholder="e.g. Dinner, Karahi" value="' + h(S.cTags) + '"></div>' +
      (S.cMsg ? '<div class="cm-note bad" role="alert">' + h(S.cMsg) + "</div>" : "") +
      '<div class="cm-row" style="justify-content:space-between"><p class="cm-small" style="max-width:420px">Posts are checked by a moderator before they appear. Please be kind and keep personal details out.</p><button type="button" class="cm-btn" data-cm="submit"' + (S.busy ? " disabled" : "") + ">" + (S.busy ? "Sending..." : "Send for approval") + "</button></div></section>";
  }
  function topBlock() {
    var t = S.top, body;
    if (t && t.length) {
      body = '<ol class="cm-lead">' + t.map(function (r, i) { return "<li>" + medal(i + 1) + '<span class="nm">' + h(r.display_name) + '</span><span class="pt">' + r.points + " pts</span></li>"; }).join("") + "</ol>";
    } else {
      body = '<p class="cm-p" style="margin:12px 0;color:#2B231F">Nobody is on the board yet. Share a dish or help someone out and you could be first.</p>';
    }
    return '<section class="cm-box cm-top3" aria-labelledby="cm-top-h"><div class="cm-hand">this week&rsquo;s stars</div><h2 id="cm-top-h">Top cooks this week</h2>' + body +
      '<p class="cm-small">2 points for each approved post, 1 for each like you get, and 5 when your reply is chosen as the best answer. Counts the last 7 days.</p></section>';
  }
  /* ---------- example posts (from community-examples.js), shown until the board has some real ones ---------- */
  var EX_UNTIL = 6;
  function exAgo(hrs) {
    if (hrs < 1) return Math.max(1, Math.round(hrs * 60)) + " minutes ago";
    if (hrs < 24) { var n = Math.round(hrs); return n + (n === 1 ? " hour ago" : " hours ago"); }
    if (hrs < 48) return "Yesterday";
    return Math.floor(hrs / 24) + " days ago";
  }
  function exReplies(e, isQ) {
    var parts = e.replies.map(function (r, i) {
      var best = isQ && e.best === i;
      return '<div class="cm-rp' + (best ? " best" : "") + '"><div class="top"><span class="cm-av" style="background:' + colour(r[0]) + '" aria-hidden="true">' + ini(r[0]) + "</span><b>" + h(r[0]) + "</b>" + (best ? '<span class="cm-best">' + ICON.ok + "Best answer</span>" : "") + '</div><div class="cm-txt">' + h(r[1]) + "</div></div>";
    });
    parts.push('<div class="cm-row"><button type="button" class="cm-btn sm ghost" data-cm="' + (isQ ? "askNow" : "new") + '" data-v="' + (isQ ? "question" : "photo") + '">' + (isQ ? "Ask your own question" : "Share your own dish") + '</button><span class="cm-meta">Replies on examples are just for show.</span></div>');
    return '<div class="cm-thread">' + parts.join("") + "</div>";
  }
  function exActions(e, isQ) {
    var on = !!S.exLiked[e.id], n = e.likes + (on ? 1 : 0), rc = e.replies.length, open = !!S.open[e.id];
    return '<div class="cm-row">' + likeBtn("exlike", e.id, on, n) + '<button type="button" class="cm-act" data-cm="toggle" data-id="' + e.id + '" aria-expanded="' + open + '">' + ICON.chat + (open ? "Hide" : rc + (isQ ? (rc === 1 ? " reply" : " replies") : (rc === 1 ? " comment" : " comments"))) + "</button></div>";
  }
  function exPhotoCard(e) {
    var heat = heatOf(e.likes + (S.exLiked[e.id] ? 1 : 0), e.hours), tags = e.tags.map(function (t) { return "<span>" + h(t) + "</span>"; }).join("");
    return '<article class="cm-card' + (heat === "hot" ? " cm-hot" : "") + '" data-post="' + e.id + '"><div class="cm-ph" data-dbl="' + e.id + '"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Drawing of ' + h(e.who) + '&rsquo;s example dish"><use href="#cx-ph-' + e.ph + '"/></svg>' + steamSvg(heat) + '<span class="cm-ex">example</span></div>' +
      '<div class="cm-bd"><div class="cm-who"><span class="cm-av" style="background:' + colour(e.who) + '" aria-hidden="true">' + ini(e.who) + '</span><div style="min-width:0"><b>' + h(e.who) + "</b><small>" + exAgo(e.hours) + "</small></div></div>" +
      '<p class="cm-txt">' + h(e.body) + '</p><div class="cm-tags">' + tags + "</div>" + exActions(e, false) + (S.open[e.id] ? exReplies(e, false) : "") + "</div></article>";
  }
  function exThreadCard(e) {
    var solved = e.best >= 0, rc = e.replies.length;
    return '<article class="cm-card' + (solved ? " cm-solved" : "") + '" data-post="' + e.id + '">' + (solved ? STAMP : "") + '<div class="cm-bd"><div class="cm-row cm-qtop"><span class="cm-chip ' + (solved ? "ok" : "open") + '">' + (solved ? "Solved" : "Open") + '</span><span class="cm-meta">' + h(e.who) + " &middot; " + exAgo(e.hours) + " &middot; " + rc + (rc === 1 ? " reply" : " replies") + '</span><span class="cm-ex">example</span></div>' +
      '<h2 class="cm-t">' + h(e.title) + '</h2><p class="cm-txt">' + h(e.body) + "</p>" + exActions(e, true) + (S.open[e.id] ? exReplies(e, true) : "") + "</div></article>";
  }
  function examplesBlock(show, realCount) {
    var approved = S.posts.filter(function (p) { return p.kind === (show ? "photo" : "question") && p.status === "approved"; }).length;
    if (!EX || approved >= EX_UNTIL) return "";
    var list = show ? EX.photos : EX.questions;
    return (realCount ? '<div class="cm-gap"></div>' : "") +
      '<div class="cm-exnote"><span>These are examples so you can see how it works. Real posts from cooks show up ' + (realCount ? "above" : "here") + '.</span><button type="button" class="cm-btn sm" data-cm="' + (show ? "new" : "askNow") + '" data-v="' + (show ? "photo" : "question") + '">' + ICON.plus + (show ? "Share a dish" : "Ask for help") + "</button></div>" +
      '<div class="' + (show ? "cm-grid" : "cm-list") + '">' + list.map(show ? exPhotoCard : exThreadCard).join("") + "</div>";
  }

  function render() {
    var el = q("p-community"); if (!el || el.hidden) return;
    if (!S.loaded && !S.loading && !S.err && !S.sdkFail) { load(); return; }
    var show = S.tab === "show";
    var feed = S.posts.filter(function (p) { return p.kind === (show ? "photo" : "question") && (p.status === "approved" || mineP(p)); });
    var content, ex = S.loaded ? examplesBlock(show, feed.length) : "";
    if (S.sdkFail || S.err) content = '<div class="cm-empty"><p class="cm-p" style="color:#2B231F">' + h(S.err || "We could not reach Kitchen SOS just now. Please check your connection and try again.") + '</p><button type="button" class="cm-btn sm" data-cm="retry">Try again</button></div>';
    else if (S.loading && !S.loaded) content = '<div class="cm-load" role="status">Loading Kitchen SOS...</div>';
    else if (!feed.length && !ex) content = '<div class="cm-empty"><p class="cm-p" style="color:#2B231F">' + (show ? "No dishes shared yet. Be the first to show what you cooked." : "No questions yet. Stuck on something? Ask for help.") + '</p><button type="button" class="cm-btn sm" data-cm="new">' + (show ? "Share a dish" : "Ask a question") + "</button></div>";
    else content = (feed.length ? '<div class="' + (show ? "cm-grid" : "cm-list") + '">' + feed.map(show ? photoCard : threadCard).join("") + "</div>" : "") + ex;
    var focusId = document.activeElement && el.contains(document.activeElement) ? document.activeElement.id : "";
    var sel = null; try { if (focusId && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) sel = [document.activeElement.selectionStart, document.activeElement.selectionEnd]; } catch (e) {}
    el.innerHTML = '<div class="cm"><section class="cm-hero"><div style="flex:1 1 320px;min-width:0"><div class="cm-hand">stuck mid-recipe?</div><h2 class="cm-h1">Kitchen SOS</h2><p class="cm-p">Something gone wrong with the pot still on the stove? Ask, and real cooks reply. Cooked something you&rsquo;re proud of? Show it off too.</p></div><button type="button" class="cm-btn" data-cm="new">' + ICON.plus + "New post</button></section>" +
      composerBlock() + queueBlock() +
      '<div class="cm-cols"><div class="cm-main"><div class="cm-tabs" role="tablist" aria-label="Kitchen SOS sections"><button type="button" class="cm-tab" role="tab" data-cm="tab" data-v="show" aria-selected="' + show + '">' + ICON.cam + 'Show &amp; tell</button><button type="button" class="cm-tab" role="tab" data-cm="tab" data-v="ask" aria-selected="' + !show + '">' + ICON.ask + "Ask for help</button></div>" + content + "</div>" +
      '<aside class="cm-side">' + topBlock() +
      '<section class="cm-box cm-ask"><div class="cm-hand">cooking right now?</div><div class="t">Stuck halfway through a recipe?</div><p>Post what is happening, with a photo if you can. Other cooks reply while your pot is still on the stove.</p><button type="button" class="cm-btn light" data-cm="askNow">Ask for help now</button></section>' +
      '<section class="cm-box cm-rules"><h2>Kitchen rules</h2><ul><li>' + ICON.ok + "Be kind. Everyone started with burnt rice.</li><li>" + ICON.ok + "Share your own photos, not someone else&rsquo;s.</li><li>" + ICON.ok + "Keep addresses and phone numbers out of posts.</li><li>" + ICON.ok + "No ads or spam. Use Report on anything that feels off.</li></ul></section></aside></div></div>";
    if (focusId) { var f = q(focusId); if (f) { f.focus(); try { if (sel) f.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
  }

  /* ---------- actions on posts ---------- */
  function reloadSoon() { S.loaded = false; render(); }
  function toggleLike(id) {
    if (!need()) return;
    var on = !!S.mine[id], uid = S.user.id, sb = S.sb, was = S.counts[id] || 0;
    S.mine[id] = !on; S.counts[id] = Math.max(0, was + (on ? -1 : 1)); render(); celebrate(id, was, !on);
    var req = on ? sb.from("likes").delete().eq("post_id", id).eq("user_id", uid) : sb.from("likes").insert({ post_id: id, user_id: uid });
    req.then(function (r) {
      if (r.error && r.error.code !== "23505") { S.mine[id] = on; S.counts[id] = Math.max(0, (S.counts[id] || 0) + (on ? 1 : -1)); render(); say("Could not save your like. Please try again."); }
    });
  }
  function sendReply(id) {
    if (!need()) return;
    var text = (S.drafts[id] || "").trim();
    if (!text) { say("Please write something first."); return; }
    S.sb.from("replies").insert({ post_id: id, user_id: S.user.id, body: text }).select("id,post_id,user_id,body,created_at").single().then(function (r) {
      if (r.error) { say(/replying very quickly/i.test(r.error.message) ? "You are replying very quickly. Please wait a little." : "Could not send your reply. Please try again."); return; }
      var row = r.data; row.profiles = { display_name: S.profile.display_name };
      (S.replies[id] = S.replies[id] || []).push(row); S.drafts[id] = ""; render();
    });
  }
  function markBest(id, rid) {
    S.sb.rpc("mark_best_answer", { p_post: id, p_reply: rid }).then(function (r) {
      if (r.error) { say("Could not mark that reply. Please try again."); return; }
      S.posts.forEach(function (p) { if (p.id === id) p.best_reply_id = rid; });
      S.open[id] = true; render(); slam(id); say("Marked as the best answer. Thank you!");
      /* refresh the weekly board once the stamp has landed, so the helper's +5 shows up */
      setTimeout(function () { S.sb.rpc("top_cooks_this_week").then(function (t) { if (!t.error) { S.top = t.data || []; render(); } }); }, 2000);
    });
  }
  function exLike(id) {
    var e = (EX.photos.concat(EX.questions)).filter(function (x) { return x.id === id; })[0]; if (!e) return;
    var on = !!S.exLiked[id], was = e.likes + (on ? 1 : 0);
    S.exLiked[id] = !on; render(); celebrate(id, was, !on);
  }
  function report(t, id) {
    if (!need()) return;
    var row = { user_id: S.user.id }; row[t === "post" ? "post_id" : "reply_id"] = id;
    S.sb.from("reports").insert(row).then(function (r) {
      if (r.error && r.error.code === "23505") say("You have already reported this.");
      else if (r.error) say("Could not send your report. Please try again.");
      else say("Thanks. A moderator will take a look.");
    });
  }
  function del(t, id) {
    if (!window.confirm("Delete this " + (t === "post" ? "post" : "reply") + "? This cannot be undone.")) return;
    var sb = S.sb, p = t === "post" ? S.posts.filter(function (x) { return x.id === id; })[0] : null;
    sb.from(t === "post" ? "posts" : "replies").delete().eq("id", id).then(function (r) {
      if (r.error) { say("Could not delete. Please try again."); return; }
      if (p && p.image_path) sb.storage.from(BUCKET).remove([p.image_path]);
      say("Deleted."); reloadSoon();
    });
  }
  function moderate(id, status) {
    S.sb.from("posts").update({ status: status }).eq("id", id).then(function (r) {
      if (r.error) { say("Could not update that post."); return; }
      say(status === "approved" ? "Approved." : "Rejected."); reloadSoon();
    });
  }

  /* ---------- creating a post ---------- */
  function shrink(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, hh = img.naturalHeight, k = Math.min(1, 1600 / Math.max(w, hh)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(hh * k));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        var qy = 0.82;
        (function enc() { c.toBlob(function (b) { if (!b) return rej(new Error("encode")); if (b.size > 4.5 * 1048576 && qy > 0.4) { qy -= 0.15; return enc(); } res(b); }, "image/jpeg", qy); })();
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("image")); };
      img.src = url;
    });
  }
  function submitPost() {
    if (S.busy) return;
    if (!need()) return;
    var kind = S.kind, title = S.cTitle.trim(), body = S.cBody.trim();
    var tags = S.cTags.split(",").map(function (t) { return t.trim().slice(0, 20); }).filter(Boolean).slice(0, 3);
    if (kind === "question" && title.length < 3) { S.cMsg = "Please say what is going wrong (at least 3 characters)."; render(); return; }
    if (kind === "photo" && !S.file) { S.cMsg = "Please add a photo of your dish."; render(); return; }
    if (body.length < 3) { S.cMsg = "Please tell us a little more (at least 3 characters)."; render(); return; }
    S.busy = true; S.cMsg = ""; render();
    var sb = S.sb, uid = S.user.id, path = null;
    var up = S.file ? shrink(S.file).then(function (blob) {
      path = uid + "/" + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)) + ".jpg";
      return sb.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
    }).then(function (r) { if (r.error) throw r.error; }) : Promise.resolve();
    up.then(function () {
      return sb.from("posts").insert({ user_id: uid, kind: kind, title: kind === "question" ? title : null, body: body, image_path: path, tags: tags });
    }).then(function (r) {
      if (r.error) throw r.error;
      /* keep the filled-in form so it can fly into the pot, then show the sent state */
      var old = q("p-community").querySelector(".cm-comp"), r0 = old && old.getBoundingClientRect();
      S.sent = true; S.busy = false; S.cTitle = ""; S.cBody = ""; S.cTags = ""; S.file = null;
      render();
      /* the post is saved by now, so nothing below may fall through to the error branch (which deletes the photo) */
      /* a background tab pauses animations, so never wait more than a few seconds for it */
      return Promise.race([intoPot(old, r0).catch(function () {}), wait(6000)]).then(function () {
        try {
          if (old && old.isConnected) old.remove();
          if (S.preview) { try { URL.revokeObjectURL(S.preview); } catch (e) {} } S.preview = "";
          S.loaded = false; render();
        } catch (e) {}
      });
    }).catch(function (e) {
      if (path) sb.storage.from(BUCKET).remove([path]);
      S.busy = false;
      S.cMsg = /posting limit/i.test(e && e.message || "") ? "You have reached today's posting limit. Please try again tomorrow." : (e && e.message === "image" ? "That photo could not be read. Please try a different one." : "Could not send your post. Please try again.");
      render();
    });
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var nv = e.target.closest && e.target.closest("[data-n]");
    if (nv && S.modal) closeModal();
    if (S.menu && !(e.target.closest && e.target.closest(".cm-bar"))) { S.menu = false; paintBar(); }
    if (e.target.id === "cm-ov") { closeModal(); return; }
    var b = e.target.closest && e.target.closest("[data-cm]"); if (!b) return;
    var a = b.dataset.cm, id = b.dataset.id, v = b.dataset.v;
    switch (a) {
      case "signin": openModal("choose"); break;
      case "sosgo": API.ask(); break;
      case "menu": S.menu = !S.menu; paintBar(); break;
      case "signout": signOut(); break;
      case "delacct": deleteAccount(); break;
      case "close": closeModal(); break;
      case "google": google(); break;
      case "back": S.step = "choose"; S.mMsg = ""; renderModal(); break;
      case "resend": if (S.email) sendCode(S.email); break;
      case "tab": S.tab = v; render(); break;
      case "new": case "askNow": if (a === "askNow") { S.tab = "ask"; S.kind = "question"; } else if (v) S.kind = v; S.composer = true; S.sent = false; render(); var c = q("p-community").querySelector(".cm-comp"); if (c && c.scrollIntoView) c.scrollIntoView({ block: "start", behavior: "smooth" }); break;
      case "comp-close": S.composer = false; S.sent = false; render(); break;
      case "kind": S.kind = v; S.cMsg = ""; render(); break;
      case "submit": submitPost(); break;
      case "like": toggleLike(id); break;
      case "exlike": exLike(id); break;
      case "toggle": S.open[id] = !S.open[id]; render(); break;
      case "reply": sendReply(id); break;
      case "best": markBest(id, b.dataset.r); break;
      case "report": report(b.dataset.t, id); break;
      case "del": del(b.dataset.t, id); break;
      case "mod": moderate(id, v); break;
      case "retry": S.err = ""; S.sdkFail = false; S.loaded = false; render(); break;
    }
  });
  document.addEventListener("submit", function (e) {
    var f = e.target.closest && e.target.closest("[data-cm-form]"); if (!f) return;
    e.preventDefault();
    var kind = f.dataset.cmForm;
    if (kind === "email") { var em = q("cm-email").value.trim(); if (em) sendCode(em); }
    else if (kind === "code") checkCode(q("cm-code").value);
    else if (kind === "name") saveName(q("cm-name").value, q("cm-agree").checked);
  });
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.cmDraft) S.drafts[t.dataset.cmDraft] = t.value;
    else if (t.dataset && t.dataset.cmC) S[t.dataset.cmC] = t.value;
    else if (t.id === "cm-email") S.email = t.value;
    else if (t.id === "cm-name") S.name = t.value;
    else if (t.id === "cm-agree") S.agree = t.checked;
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "cm-agree") S.agree = t.checked;
    if (t.id === "cm-file" && t.files && t.files[0]) {
      var f = t.files[0];
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { S.cMsg = "Please choose a JPG, PNG or WebP photo."; render(); return; }
      if (f.size > 20 * 1048576) { S.cMsg = "That photo is too large. Please choose one under 20 MB."; render(); return; }
      if (S.preview) { try { URL.revokeObjectURL(S.preview); } catch (x) {} }
      S.file = f; S.preview = URL.createObjectURL(f); S.cMsg = ""; render();
    }
  });
  /* double-tap a photo to like it (never unlikes, like Instagram) */
  var lastTap = { t: 0, id: "", x: 0, y: 0 };
  document.addEventListener("pointerup", function (e) {
    var ph = e.target.closest && e.target.closest("#p-community [data-dbl]"); if (!ph) return;
    var id = ph.dataset.dbl, now = Date.now();
    if (lastTap.id === id && now - lastTap.t < 340 && Math.abs(e.clientX - lastTap.x) < 36 && Math.abs(e.clientY - lastTap.y) < 36) {
      lastTap.t = 0;
      var ex = id.indexOf("ex-") === 0, liked = ex ? S.exLiked[id] : S.mine[id];
      if (ex || signedIn()) bigHeart(id, e.clientX, e.clientY);
      if (!liked) { if (ex) exLike(id); else toggleLike(id); } else SFX.pop();
    } else lastTap = { t: now, id: id, x: e.clientX, y: e.clientY };
  });
  document.addEventListener("dblclick", function (e) { if (e.target.closest && e.target.closest("#p-community [data-dbl]")) e.preventDefault(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (S.modal) { closeModal(); } else if (S.menu) { S.menu = false; paintBar(); } return; }
    if (e.key === "Enter" && e.target.dataset && e.target.dataset.cmDraft) { e.preventDefault(); sendReply(e.target.dataset.cmDraft); return; }
    if (e.key === "Tab" && S.modal) {
      var o = q("cm-ov"); if (!o) return;
      var els = [].slice.call(o.querySelectorAll("button:not([disabled]),input,a[href]")).filter(function (x) { return x.offsetParent !== null; });
      if (!els.length) return;
      var first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- hooks used by the main page ---------- */
  function addPrivacy() {
    var po = q("priv-out"); if (!po || po.querySelector(".cm-priv")) return;
    po.insertAdjacentHTML("beforeend", '<div class="cm-priv"><h3>Kitchen SOS accounts</h3><p>The weekly plan and ticked ingredients are still kept only on your own device. If you also choose to join Kitchen SOS, we store your email address, display name, posts, replies, likes and any photos you upload, using Supabase. Your email address is never shown to other people. Posts, replies, display names and photos are public. Photos have their location data removed before they are uploaded. Posts are checked by a moderator before they appear, and anyone signed in can report a post or reply. You can delete your own posts and replies at any time, and you can delete your account and everything you posted from the menu next to your name. You must be 13 or older to join.</p></div>');
  }
  /* ---------- Kitchen SOS on the homepage: the newest open question, read straight from the database rules
     (approved questions are public), without loading the full sign-in library ---------- */
  var SOS = { open: 0, latest: null, asked: false };
  var LIFEBUOY = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/></svg>';
  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  function paintSos() {
    var el = q("sosbar"); if (!el) return;
    var n = SOS.open, l = SOS.latest, ru = typeof lang !== "undefined" && lang === "ru";
    el.innerHTML = '<span class="sos-badge" aria-hidden="true">' + LIFEBUOY + "SOS</span>" +
      '<div class="sos-t"><b>' + (n ? '<span class="sos-live" aria-hidden="true"></span>' + (ru ? "Recipe beech mein atak gayi? Kitchen SOS khula hai" : "Stuck mid-recipe? Kitchen SOS is open") : ru ? "Recipe beech mein atak gayi? Kitchen SOS se poochein" : "Stuck mid-recipe? Ask Kitchen SOS") + "</b>" +
      "<p>" + (n && l ? "<em>" + n + (ru ? " sawal" : n === 1 ? " question" : " questions") + "</em>" + (ru ? " jawab ke intezar mein" : " waiting for a cook") + " &middot; " + h(nameOf(l)) + ": &ldquo;" + h(l.title) + "&rdquo;" : ru ? "Asli cooks jawab dete hain, aksar jab aap ki deg abhi chulhe par hi hoti hai." : "Real cooks reply, often while your pot is still on the stove.") + "</p></div>" +
      '<button type="button" class="sos-go" data-cm="sosgo">' + (ru ? "Madad maangein" : "Ask for help") + ARROW + "</button>";
    el.hidden = false;
  }
  function peek() {
    if (SOS.asked || !window.fetch) return; SOS.asked = true;
    fetch(cfg.url + "/rest/v1/posts?select=title,best_reply_id,created_at,profiles!posts_user_id_fkey(display_name)&kind=eq.question&status=eq.approved&order=created_at.desc&limit=30", { headers: { apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { var open = (rows || []).filter(function (p) { return !p.best_reply_id; }); SOS.open = open.length; SOS.latest = open[0] || null; })
      .catch(function () {})
      .then(function () { paintSos(); API.sync(); });
  }
  /* open Kitchen SOS with a question ready to write, e.g. from "Ask Kitchen SOS for a swap" on a dish */
  API.ask = function (title) {
    S.tab = "ask"; S.kind = "question"; S.composer = true; S.sent = false; S.cMsg = ""; if (title) S.cTitle = title.slice(0, 140);
    if (typeof go === "function") go("community");
    setTimeout(function () { var c = q("p-community") && q("p-community").querySelector(".cm-comp"); if (c && c.scrollIntoView) c.scrollIntoView({ block: "start" }); var f = q("cm-cb"); if (f) f.focus(); }, 80);
  };
  document.addEventListener("click", function (e) {
    var sa = e.target.closest && e.target.closest("[data-sosask]"); if (!sa) return;
    e.stopPropagation(); API.ask("No " + String(sa.dataset.ing || "").toLowerCase() + " for " + sa.dataset.dish + ". What can I use instead?");
  }, true);

  API.sync = function () {
    var n = q("t-community"); if (n) { n.hidden = false; n.classList.add("navsos"); n.innerHTML = (SOS.open ? '<span class="sos-live" aria-hidden="true"></span>' : "") + "Kitchen SOS" + (SOS.open ? '<span class="sos-ct" aria-label="' + SOS.open + ' open questions">' + SOS.open + "</span>" : ""); }
    var b = q("cm-bar"); if (b && b.hidden) { b.hidden = false; paintBar(); }
    addPrivacy(); paintSos();
  };
  API.render = render;

  /* ---------- start ---------- */
  function start() {
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    document.body.insertAdjacentHTML("afterbegin", STAMP_MASK + (EX ? EX.sprite() : ""));
    paintSos(); setTimeout(peek, 700);
    API.sync();
    if (hasStoredSession() || /[?&]code=/.test(location.search) || /^#community/.test(location.hash)) ensure();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
