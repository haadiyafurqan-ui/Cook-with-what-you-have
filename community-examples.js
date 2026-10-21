/* Kitchen SOS: example posts shown while the board is still quiet (fewer than 6 approved posts of a kind),
   and the drawings used as their photos. Examples are always marked "example" on the page, the names are
   made up, and nothing done to an example (likes, replies) is saved anywhere. */
(function () {
  "use strict";

  function prng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* One hidden <svg> holding every dish, drawn top-down. Each photo is used with <use href="#cx-ph-NAME">. */
  function sprite() {
    var r = prng(20261021);
    var f = function (n) { return Math.round(n * 10) / 10; };
    var ang = function () { return f(r() * 360); };
    var disk = function (rad) { var a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad; return [f(Math.cos(a) * d), f(Math.sin(a) * d)]; };
    var box = function (w, h) { return [f((r() - .5) * w), f((r() - .5) * h)]; };
    function blob(cx, cy, rad, j, n) {
      j = j == null ? .22 : j; n = n || 7;
      var p = [], i, d;
      for (i = 0; i < n; i++) { var a = i / n * Math.PI * 2 + r() * .3, q = rad * (1 + (r() * 2 - 1) * j); p.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
      d = "M" + f(p[0][0]) + " " + f(p[0][1]);
      for (i = 0; i < n; i++) {
        var p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
        d += "C" + f(p1[0] + (p2[0] - p0[0]) / 6) + " " + f(p1[1] + (p2[1] - p0[1]) / 6) + " " + f(p2[0] - (p3[0] - p1[0]) / 6) + " " + f(p2[1] - (p3[1] - p1[1]) / 6) + " " + f(p2[0]) + " " + f(p2[1]);
      }
      return d + "Z";
    }
    function strokes(n, rad, len) {
      var d = "";
      for (var i = 0; i < n; i++) { var xy = disk(rad), a = r() * Math.PI * 2, L = len[0] + r() * (len[1] - len[0]); d += "M" + xy[0] + " " + xy[1] + "l" + f(Math.cos(a) * L) + " " + f(Math.sin(a) * L); }
      return d;
    }
    var leaf = function (x, y, s) { return '<g transform="translate(' + x + " " + y + ") rotate(" + ang() + ") scale(" + (s || 1) + ')"><circle cx="-3" r="3.4" fill="#3E8A35"/><circle cx="3" cy="-1" r="3.1" fill="#57A548"/><circle cy="3" r="2.9" fill="#48953C"/></g>'; };
    var plate = function (rad) { return '<circle r="' + rad + '" fill="url(#cx-plate)"/><circle r="' + rad + '" fill="none" stroke="#D2C8BA" stroke-width="2"/>'; };
    var i, xy, k, p, h, d, a, b, c;

    var defs =
      '<radialGradient id="cx-iron" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#6E5E55"/><stop offset=".55" stop-color="#2B231F"/><stop offset="1" stop-color="#110C0A"/></radialGradient>' +
      '<radialGradient id="cx-curry" cx=".42" cy=".38" r=".75"><stop offset="0" stop-color="#E5823F"/><stop offset=".6" stop-color="#C5501F"/><stop offset="1" stop-color="#9A3613"/></radialGradient>' +
      '<radialGradient id="cx-steel" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="#FAFBFC"/><stop offset=".65" stop-color="#D3D7DB"/><stop offset="1" stop-color="#A7ADB3"/></radialGradient>' +
      '<radialGradient id="cx-paratha" cx=".4" cy=".38" r=".7"><stop offset="0" stop-color="#F2CF8C"/><stop offset=".72" stop-color="#DCA24C"/><stop offset="1" stop-color="#B9792C"/></radialGradient>' +
      '<radialGradient id="cx-plate" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".75" stop-color="#F2EDE5"/><stop offset="1" stop-color="#DCD3C6"/></radialGradient>' +
      '<radialGradient id="cx-halwa" cx=".42" cy=".38" r=".75"><stop offset="0" stop-color="#E86E36"/><stop offset=".7" stop-color="#C9501F"/><stop offset="1" stop-color="#A63E17"/></radialGradient>' +
      '<radialGradient id="cx-daal" cx=".42" cy=".38" r=".75"><stop offset="0" stop-color="#F6CB55"/><stop offset=".75" stop-color="#E5A62D"/><stop offset="1" stop-color="#C98B1E"/></radialGradient>' +
      '<linearGradient id="cx-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#CFA274"/><stop offset="1" stop-color="#AE7C51"/></linearGradient>' +
      '<pattern id="cx-ging" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" fill="#FBF6EF"/><rect width="18" height="36" fill="#C0392B" fill-opacity=".15"/><rect width="36" height="18" fill="#C0392B" fill-opacity=".15"/></pattern>';

    /* chicken karahi */
    k = '<path d="M-120 -22C-148 -22 -148 22 -120 22" fill="none" stroke="#1C1512" stroke-width="12" stroke-linecap="round"/><path d="M120 -22C148 -22 148 22 120 22" fill="none" stroke="#1C1512" stroke-width="12" stroke-linecap="round"/><circle r="122" fill="url(#cx-iron)"/><circle r="108" fill="#17110E"/><circle r="102" fill="url(#cx-curry)"/><ellipse cx="-30" cy="-42" rx="48" ry="15" fill="#F7A25A" opacity=".22" transform="rotate(-22 -30 -42)"/>';
    for (i = 0; i < 8; i++) { xy = disk(64); k += '<path d="' + blob(xy[0], xy[1], 17 + r() * 8, .3) + '" fill="#E2A465"/><path d="' + blob(xy[0] + 3, xy[1] + 3, 8 + r() * 5, .4) + '" fill="#C26F2C" opacity=".55"/>'; }
    var tom = ""; for (i = 0; i < 7; i++) { xy = disk(84); tom += "M" + xy[0] + " " + xy[1] + "q6 -7 13 -1"; }
    k += '<path d="' + tom + '" fill="none" stroke="#B5261A" stroke-width="4" stroke-linecap="round"/><path d="' + strokes(16, 84, [12, 18]) + '" stroke="#F7DE98" stroke-width="2.6" stroke-linecap="round" fill="none"/>';
    for (i = 0; i < 3; i++) { xy = disk(62); k += '<g transform="translate(' + xy[0] + " " + xy[1] + ") rotate(" + ang() + ')"><path d="M-22 0Q0 -8 22 0Q0 6 -22 0Z" fill="#4C8C2B"/><path d="M-17 -.5Q0 -4 17 -.5" fill="none" stroke="#93C95A" stroke-width="2" stroke-linecap="round"/></g>'; }
    for (i = 0; i < 16; i++) { xy = disk(86); k += leaf(xy[0], xy[1]); }

    /* aloo ke parathay */
    p = '<circle r="128" fill="url(#cx-steel)"/><circle r="114" fill="#E2E5E8"/><circle r="114" fill="none" stroke="#BFC4C9" stroke-width="2"/>';
    [[-16, 12], [10, -8], [-2, 2]].forEach(function (o) { p += '<circle cx="' + o[0] + '" cy="' + o[1] + '" r="92" fill="url(#cx-paratha)" stroke="#B57A33" stroke-width="2"/>'; });
    p += '<g transform="translate(-2 2)"><circle r="68" fill="none" stroke="#C48A3A" stroke-opacity=".5" stroke-width="2.2" stroke-dasharray="46 14 20 26 34 12"/><circle r="44" fill="none" stroke="#C48A3A" stroke-opacity=".45" stroke-width="2" stroke-dasharray="30 12 18 20"/>';
    for (i = 0; i < 24; i++) { xy = disk(80); p += '<path d="' + blob(xy[0], xy[1], 2.5 + r() * 5.5, .45, 6) + '" fill="#9B5A20" opacity="' + f(.3 + r() * .4) + '"/>'; }
    p += '<g transform="rotate(-14)"><rect x="-15" y="-11" width="30" height="22" rx="5" fill="#FBE6A0"/><rect x="-11" y="-8" width="12" height="5" rx="2.5" fill="#fff" opacity=".6"/></g></g>';

    /* gajar ka halwa */
    h = plate(124) + '<circle r="106" fill="#E7DFD3"/><circle r="96" fill="url(#cx-halwa)"/>';
    h += '<path d="' + strokes(110, 90, [5, 12]) + '" stroke="#EF8C52" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".85"/><path d="' + strokes(80, 90, [5, 11]) + '" stroke="#A83A15" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".7"/>';
    for (i = 0; i < 9; i++) { xy = disk(72); h += '<ellipse cx="' + xy[0] + '" cy="' + xy[1] + '" rx="8.5" ry="3.2" fill="#F5E8CC" stroke="#D8C397" stroke-width=".8" transform="rotate(' + ang() + " " + xy[0] + " " + xy[1] + ')"/>'; }
    for (i = 0; i < 10; i++) { xy = disk(74); h += '<ellipse cx="' + xy[0] + '" cy="' + xy[1] + '" rx="6.5" ry="2.4" fill="#9CC057" transform="rotate(' + ang() + " " + xy[0] + " " + xy[1] + ')"/>'; }

    /* daal with tadka */
    d = '<circle r="124" fill="#A94B27"/><circle r="114" fill="#C26539"/><circle r="101" fill="url(#cx-daal)"/><path d="M-64 14C-46 -44 44 -56 66 -2C78 40 14 68 -24 44" fill="none" stroke="#D38E1E" stroke-width="7" stroke-linecap="round" opacity=".45"/>';
    d += '<path d="' + blob(4, -4, 46, .3, 8) + '" fill="#C9481A" opacity=".5"/><path d="' + strokes(48, 58, [4, 6]) + '" stroke="#5B3D20" stroke-width="2.6" stroke-linecap="round" fill="none"/>';
    for (i = 0; i < 6; i++) { xy = disk(70); d += '<ellipse cx="' + xy[0] + '" cy="' + xy[1] + '" rx="5.5" ry="4.5" fill="#F6ECD5" stroke="#C9A36A" stroke-width="1.2"/>'; }
    for (i = 0; i < 3; i++) { xy = disk(48); d += '<g transform="translate(' + xy[0] + " " + xy[1] + ") rotate(" + ang() + ')"><path d="M-18 -3.5Q4 -9 18 0Q4 7 -18 3.5Z" fill="#8A1C10"/><path d="M-18 0l-6 -3" stroke="#5B3D20" stroke-width="2.6" stroke-linecap="round"/></g>'; }
    for (i = 0; i < 9; i++) { xy = disk(84); d += leaf(xy[0], xy[1]); }

    /* aloo anday */
    a = plate(124) + '<path d="' + blob(0, 0, 98, .1, 9) + '" fill="#B2401B"/><path d="' + blob(-4, -6, 82, .14, 8) + '" fill="#C9572A" opacity=".75"/>';
    for (i = 0; i < 9; i++) { xy = disk(78); a += '<g transform="translate(' + xy[0] + " " + xy[1] + ") rotate(" + ang() + ')"><rect x="-10" y="-10" width="20" height="20" rx="6" fill="#ECC66F" stroke="#C99A3E" stroke-width="1.6"/></g>'; }
    [[-42, -30], [40, -36], [-30, 42], [44, 32]].forEach(function (o) { a += '<g transform="translate(' + f(o[0] + r() * 8 - 4) + " " + f(o[1] + r() * 8 - 4) + ") rotate(" + ang() + ')"><ellipse rx="25" ry="19" fill="#FCF9F2" stroke="#E2D7C5" stroke-width="1.6"/><circle cx="3" r="10.5" fill="#F3B52D"/></g>'; });
    for (i = 0; i < 10; i++) { xy = disk(86); a += leaf(xy[0], xy[1]); }

    var sym = function (id, body) { return '<symbol id="cx-d-' + id + '" viewBox="-150 -150 300 300">' + body + "</symbol>"; };
    var dishes = sym("karahi", k) + sym("paratha", p) + sym("halwa", h) + sym("daal", d) + sym("anday", a);

    /* set each dish on a table to make a 4:3 "photo" */
    var use = function (id, cx, cy, s) { return '<use href="#cx-d-' + id + '" x="' + (cx - s / 2) + '" y="' + (cy - s / 2) + '" width="' + s + '" height="' + s + '"/>'; };
    var wood = '<rect width="400" height="300" fill="url(#cx-wood)"/><path d="M0 40C120 46 260 30 400 42M0 104C140 96 250 112 400 100M0 170C110 178 280 160 400 172M0 236C150 228 260 246 400 232" fill="none" stroke="#9C6A44" stroke-opacity=".3" stroke-width="2"/>';
    var ging = '<rect width="400" height="300" fill="url(#cx-ging)"/>';
    var specks = ""; for (i = 0; i < 60; i++) { xy = box(400, 300); specks += "M" + f(xy[0] + 200) + " " + f(xy[1] + 150) + "l.4 .4"; }
    var stone = '<rect width="400" height="300" fill="#E9E2D8"/><path d="' + specks + '" stroke="#CFC4B6" stroke-width="2.4" stroke-linecap="round"/>';
    var slate = '<rect width="400" height="300" fill="#3A302B"/>';
    var bowl = function (x, y, rad, fill) { return '<g transform="translate(' + x + " " + y + ')"><circle r="' + rad + '" fill="url(#cx-plate)"/><circle r="' + f(rad * .8) + '" fill="' + fill + '"/></g>'; };
    var spots = ""; for (i = 0; i < 16; i++) { xy = disk(56); spots += '<path d="' + blob(xy[0], xy[1], 2.5 + r() * 4.5, .45, 6) + '" fill="#9B5A20" opacity="' + f(.3 + r() * .35) + '"/>'; }
    var ph = {
      karahi: ging + leaf(40, 252) + leaf(362, 40) + use("karahi", 200, 152, 290),
      paratha: wood + use("paratha", 160, 150, 270) + bowl(338, 78, 44, "#F6F2E9") + bowl(342, 226, 34, "#9A2E12"),
      halwa: slate + use("halwa", 196, 150, 282) + '<g transform="translate(348 214) rotate(-35)"><ellipse rx="15" ry="22" fill="url(#cx-steel)"/><rect x="-4" y="18" width="8" height="74" rx="4" fill="url(#cx-steel)"/></g>',
      daal: stone + '<g transform="translate(344 100)"><circle r="68" fill="url(#cx-paratha)" stroke="#B57A33" stroke-width="2"/>' + spots + "</g>" + use("daal", 158, 156, 272),
      anday: ging + leaf(366, 252) + use("anday", 200, 150, 282)
    };
    var photos = Object.keys(ph).map(function (id) { return '<symbol id="cx-ph-' + id + '" viewBox="0 0 400 300">' + ph[id] + "</symbol>"; }).join("");
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' + defs + "</defs>" + dishes + photos + "</svg>";
  }

  /* hours: how long ago it was "posted", used for the age label and the steam. */
  window.CWWHY_EXAMPLES = {
    sprite: sprite,
    photos: [
      { id: "ex-p1", who: "Sana R.", hours: 2, ph: "karahi", body: "Only had 2 tomatoes, so I added a spoon of yoghurt to the karahi. Honestly better than usual.", tags: ["Dinner", "Karahi"], likes: 24,
        replies: [["Bilal K.", "Yoghurt in karahi is a game changer. Did it split?"], ["Sana R.", "Nope! I took it off the heat first and stirred fast."]] },
      { id: "ex-p2", who: "Ayesha M.", hours: 20, ph: "halwa", body: "The carrots were going soft in the fridge, so I made halwa. My whole flat smells like a shaadi now.", tags: ["Dessert", "Leftovers"], likes: 41,
        replies: [["Zara A.", "Okay, I need this recipe."], ["Ayesha M.", "It's the one on the site! I used a bit less sugar."]] },
      { id: "ex-p3", who: "Zara A.", hours: 26, ph: "anday", body: "Ghar mein sirf aloo aur anday thay, to Aloo Anday bana liye. Ammi ne bhi tareef ki!", tags: ["Lunch"], likes: 29,
        replies: [["Hamza S.", "Ammi approved is the best review there is."]] },
      { id: "ex-p4", who: "Bilal K.", hours: 50, ph: "paratha", body: "Leftover boiled potatoes and the last of the atta. Sunday breakfast sorted, and the third one actually came out round.", tags: ["Breakfast", "Paratha"], likes: 18,
        replies: [["Tom H.", "How do you stop the filling bursting out?"], ["Bilal K.", "Mash it really smooth and roll gently from the middle."]] },
      { id: "ex-p5", who: "Tom H.", hours: 75, ph: "daal", body: "First time cooking Pakistani food. The daal here was so easy, and the tadka sizzle is the best sound in the world.", tags: ["Beginner", "Daal"], likes: 15,
        replies: [["Farah J.", "Welcome! Try the chana pulao next."]] }
    ],
    questions: [
      { id: "ex-q1", who: "Hamza S.", hours: 0.4, title: "My salan is too salty and guests arrive in 30 minutes!", body: "Chicken salan for 6 people. I salted it twice by mistake. Can I save it?", likes: 6, best: -1,
        replies: [["Bilal K.", "Drop a raw potato in for 10 minutes. It soaks up the salt."], ["Farah J.", "Add a chopped tomato and a splash of water (or a spoon of yoghurt) and simmer for 5 minutes. A squeeze of lemon at the end hides the rest. The potato trick barely works."]] },
      { id: "ex-q2", who: "Mariam T.", hours: 3, title: "How much water for basmati so my pulao doesn't go mushy?", body: "Every time I make pulao it turns into khichdi. I'm using 2 cups of rice.", likes: 11, best: 0,
        replies: [["Farah J.", "Soak the rice for 30 minutes and drain it. Use about 1½ cups of water for each cup of rice, and stop stirring once it boils. Lid on, lowest heat, 10 minutes."], ["Sana R.", "And don't lift the lid to check! I learnt that the hard way."]] },
      { id: "ex-q3", who: "Tom H.", hours: 22, title: "Why won't my roti puff up?", body: "They taste fine but stay flat. I'm using chapati flour and a frying pan.", likes: 4, best: -1,
        replies: [["Ayesha M.", "Make the dough a bit softer and let it rest for 20 minutes."], ["Sana R.", "Once both sides have brown spots, hold it over the gas flame with tongs. It puffs up in seconds."]] }
    ]
  };
})();
