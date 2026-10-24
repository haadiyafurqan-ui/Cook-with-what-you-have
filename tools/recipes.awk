# Writes a small page for every dish (recipes/<name>/index.html) and an index of all of them
# (recipes/index.html), from the dish list in index.html. Run by tools/build-pages.sh.
# Plain POSIX awk, so it gives the same result on Windows (Git Bash) and on GitHub's Linux check.
# Prints each page's address so build-pages.sh can add it to the sitemap.

function h(s) { gsub(/&/, "\\&amp;", s); gsub(/</, "\\&lt;", s); gsub(/>/, "\\&gt;", s); gsub(/"/, "\\&quot;", s); return s }
function js(s) { gsub(/\\/, "\\\\", s); gsub(/"/, "\\\"", s); gsub(/</, "\\u003c", s); return s }
function slug(s) { s = tolower(s); gsub(/[^a-z0-9]+/, "-", s); gsub(/^-+|-+$/, "", s); return s }
function upto(s, c,   i) { i = index(s, c); return i ? substr(s, 1, i - 1) : s }
function after(s, c,   i) { i = index(s, c); return i ? substr(s, i + length(c)) : "" }
function lower1(s) { return tolower(substr(s, 1, 1)) substr(s, 2) }
# split a method into steps, one sentence each
function steps(s, out,   n, p, i, t, c) {
  n = split(s, p, /\. /); c = 0
  for (i = 1; i <= n; i++) { t = p[i]; if (t == "") continue; if (i < n) t = t "."; out[++c] = t }
  return c
}
function pills(i,   t, k, s) {
  s = "<span class=\"pill tm\">" dmin[i] " min</span>" (dn[i] in oven ? "<span class=\"pill ovn\">Needs an oven</span>" : "")
  for (k = 1; k <= ncat; k++) if (incat[i, ck[k]]) s = s "<a class=\"pill\" href=\"/recipes/" cs[ck[k]] "/\">" h(clab[ck[k]]) "</a>"
  if (veg[i]) s = s "<span class=\"pill\">Vegetarian</span>"
  return s
}

BEGIN { site = ENVIRON["SITE"]; NAME = ENVIRON["NAME"]; QMAX = 20
  # the dish drawings in images/dishes, one <name>.jpg per dish (see tools/make-dish-images.md); IMGS lists the ones that exist
  if (ENVIRON["IMGS"] != "") while ((getline l < ENVIRON["IMGS"]) > 0) hasimg[l] = 1
  if (ENVIRON["THUMBS"] != "") while ((getline l < ENVIRON["THUMBS"]) > 0) hasthumb[l] = 1
  # each category's page: its heading, a line about it, and the dish whose picture stands for it on recipes/
  split("breakfast|Breakfast & Sehri Recipes|Desi breakfast and sehri ideas: parathas, anday, halwa puri, chanay and quick bites to start the day.|Aloo ke Parathay;" \
    "main|Lunch & Dinner Recipes|Everyday Pakistani lunch and dinner: salans, gosht and sabzi, daal chawal, plus Chinese, Italian and continental favourites.|Chicken Karahi;" \
    "iftar|Iftar & Snack Recipes|Iftar and tea-time snacks: samosas, pakoras, rolls, chaat, kababs and sandwiches.|Aloo Samosa;" \
    "airfryer|Air Fryer Recipes|Pakistani and desi dishes you can make in an air fryer, each with the temperature, time and when to turn it.|Chicken Tikka;" \
    "dessert|Dessert Recipes|Desi sweets and bakes: kheer, halwa, custard, cakes, brownies and Eid favourites.|Gulab Jamun;" \
    "soups|Soups & Sides|Soups, raitas, chutneys and sides to go with your meal.|Chicken Corn Soup;" \
    "special|Special Occasion Recipes|For Eid, BBQ nights and guests: biryani, qorma, tikka, kababs and more.|Biryani;" \
    "quick|Quick Recipes (20 Minutes or Less)|Dishes that take about 20 minutes or less, for busy days.|Masala Omelette", rows, ";")
  for (i in rows) { split(rows[i], a, "|"); ctitle[a[1]] = a[2]; cintro[a[1]] = a[3]; crep[a[1]] = a[4] }
  mlab["fry"] = "Fry"; mlab["oven"] = "Oven"; mlab["grill"] = "Grill"; mlab["pan"] = "Pan"; mlab["stove"] = "Stove"
  mtit["fry"] = "Fried"; mtit["oven"] = "Oven"; mtit["grill"] = "Grilled"; mtit["pan"] = "Pan"; mtit["stove"] = "Stove"
  mhead["fry"] = "The usual way: fried"; mhead["oven"] = "In the oven"; mhead["grill"] = "On the grill"; mhead["pan"] = "In a pan"; mhead["stove"] = "On the stove"
}

# ---------- read the data out of index.html ----------
/^<link rel="icon"/ { icon = $0 }
/^const ING=\{/ { s = $0; while (match(s, /[a-z]+:\["[^"]*", ?"[^"]*"\]/)) { m = substr(s, RSTART, RLENGTH); s = substr(s, RSTART + RLENGTH)
    k = upto(m, ":"); m = after(m, "[\""); en[k] = upto(m, "\""); m = after(m, ","); m = after(m, "\""); ur[k] = upto(m, "\"") } }
/^const SW=\{/ { s = $0; while (match(s, /[a-z]+:"[^"]*"/)) { m = substr(s, RSTART, RLENGTH); s = substr(s, RSTART + RLENGTH); k = upto(m, ":"); sw[k] = upto(after(m, "\""), "\"") } }
/^const TPL=\{/ { intpl = 1; next }
intpl && /^\};/ { intpl = 0 }
intpl && /^[A-Z]+:"/ { k = upto($0, ":"); tpl[k] = upto(after($0, "\""), "\"") }
/^const D=\[/ { ind = 1; next }
ind && /^\];/ { ind = 0 }
ind && /^\["/ { n++; s = after($0, "[\""); dn[n] = upto(s, "\""); s = after(s, "\",\""); ding[n] = upto(s, "\""); s = after(s, "\",")
  dmin[n] = upto(s, ","); s = after(s, ",\""); dtag[n] = upto(s, "\""); s = after(s, "\",\""); m = upto(s, "\"]")
  if (m ~ /^[A-Z]+\|/) { k = upto(m, "|"); t = tpl[k]; v = after(m, "|"); i = index(t, "{v}"); m = substr(t, 1, i - 1) v substr(t, i + 3) }
  dhow[n] = m; byname[dn[n]] = n }
/^const AFSAM="/ { afsam = upto(after($0, "\""), "\"") }
/^const AF=\{/ { inaf = 1; next }
inaf && /^"[^"]+":\["/ { nm = upto(after($0, "\""), "\""); s = after($0, "\":[\"")
  afm[nm] = upto(s, "\""); s = after(s, "\","); afmin[nm] = upto(s, ","); s = after(s, ",\""); afhow[nm] = upto(s, "\""); s = after(s, "\"")
  if (s ~ /^,AFSAM/) aftip[nm] = "AFSAM"; else aftip[nm] = upto(after(s, ",\""), "\"")
  affirst[nm] = (s ~ /,1\]/); hasaf[nm] = 1
  if ($0 ~ /\]\};$/) inaf = 0 }
/^const NOAF=\{/ { s = $0; while (match(s, /[a-z]:\[[^]]*\]/)) { m = substr(s, RSTART, RLENGTH); s = substr(s, RSTART + RLENGTH)
    k = upto(m, ":"); c = split(upto(after(m, "[\""), "\"]"), a, /","/); for (i = 1; i <= c; i++) noaf[a[i]] = k } }
/^const OVEN=\[/ { c = split(upto(after($0, "[\""), "\"]"), a, /","/); for (i = 1; i <= c; i++) oven[a[i]] = 1 }
/^const AFX=\{en:\{/ { inafx = 1 }
inafx && /^ ru:\{/ { inafx = 0 }
inafx { s = $0; while (match(s, /[a-zA-Z]+:"[^"]*"/)) { m = substr(s, RSTART, RLENGTH); s = substr(s, RSTART + RLENGTH); k = upto(m, ":"); if (!(k in afx)) afx[k] = upto(after(m, "\""), "\"") } }
/^const CATS=\{/ { incats = 1; next }
incats && /^[a-z]+:\["/ { k = upto($0, ":"); ck[++ncat] = k; clab[k] = upto(after($0, ",[\""), "\"")
  t = $0; sub(/\]\]\}?;?,?$/, "", t); t = substr(t, match(t, /\[[^[]*$/) + 1); gsub(/"/, "", t); ctags[k] = "," t ","
  if ($0 ~ /};$/) incats = 0 }

# ---------- write the pages ----------
END {
  for (i = 1; i <= n; i++) {
    veg[i] = ("," dtag[i] ",") ~ /,Veg,/
    for (k = 1; k <= ncat; k++) { c = ck[k]; incat[i, c] = 0
      if (c == "airfryer") incat[i, c] = hasaf[dn[i]]
      else if (c == "quick") incat[i, c] = (dmin[i] + 0 <= QMAX)
      else { cnt = split(dtag[i], a, ","); for (j = 1; j <= cnt; j++) if (index(ctags[c], "," a[j] ",")) incat[i, c] = 1 } }
    main1[i] = ""; for (k = 1; k <= ncat; k++) if (incat[i, ck[k]] && ck[k] != "airfryer" && ck[k] != "quick") { main1[i] = ck[k]; break }
    sl[i] = slug(dn[i]); ord[i] = i
  }
  # each category gets recipes/<name>/, named from its heading without the part in brackets ("Quick (20 min or less)" is quick)
  for (k = 1; k <= ncat; k++) { t = clab[ck[k]]; sub(/ *\(.*\)/, "", t); cs[ck[k]] = slug(t) }
  # dishes in A to Z order
  for (i = 2; i <= n; i++) { v = ord[i]; j = i - 1; while (j > 0 && tolower(dn[ord[j]]) > tolower(dn[v])) { ord[j + 1] = ord[j]; j-- } ord[j + 1] = v }

  head1 = "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"color-scheme\" content=\"light\">\n"
  css = "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"><link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin><link href=\"https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;600;700&display=swap\" rel=\"stylesheet\">\n<link rel=\"stylesheet\" href=\"/assets/page.css\">\n"
  top ="<header class=\"top\"><div><a class=\"brand\" href=\"/\">" NAME "</a><nav class=\"nav\" aria-label=\"Pages\"><a href=\"/\">Find a dish</a><a href=\"/recipes/\">All recipes</a><a href=\"/air-fryer/\">Air fryer</a><a href=\"/plan-your-week/\">Plan your week</a><a href=\"/quizzes/\">Quizzes</a><a href=\"/kitchen-sos/\">Kitchen SOS</a></nav></div></header>\n"
  foot = "<footer class=\"foot\"><div><p>These are short home-style guides, not full recipes: amounts and timings are approximate, so cook it your way and adjust to taste. This site does not check allergens, so read every label if anyone you cook for has an allergy.</p><p><a href=\"/faq/\">FAQ</a> · <a href=\"/about/\">About</a> · <a href=\"/privacy/\">Privacy and disclaimer</a></p></div></footer>\n"

  for (i = 1; i <= n; i++) {
    nm = dn[i]; url = site "/recipes/" sl[i] "/"; af = hasaf[nm]
    cnt = split(ding[i], ig, ",")
    ilist = ""; for (j = 1; j <= cnt; j++) ilist = ilist (j > 1 ? (j == cnt ? " and " : ", ") : "") tolower(en[ig[j]])
    title = nm " Recipe" (af ? (affirst[nm] ? " (Air Fryer or " mtit[afm[nm]] ")" : " (" mtit[afm[nm]] " or Air Fryer)") : "") " | " NAME
    desc = nm " recipe with " ilist ". Ready in about " dmin[i] " minutes." (af ? " Includes air fryer temperature and time." : "") " A short, home-style guide."
    cuisine = ("," dtag[i] ",") ~ /,Chinese,/ ? "Chinese" : ("," dtag[i] ",") ~ /,Italian,/ ? "Italian" : ("," dtag[i] ",") ~ /,Continental,/ ? "Continental" : "Pakistani"
    f = "recipes/" sl[i] "/index.html"
    if (ENVIRON["MODE"] == "dirs") { print "recipes/" sl[i]; continue }

    # what Google reads as a recipe
    ld = "{\"@context\":\"https://schema.org\",\"@type\":\"Recipe\",\"name\":\"" js(nm) "\",\"description\":\"" js(desc) "\",\"url\":\"" url "\""
    ld = ld ",\"author\":{\"@type\":\"Person\",\"name\":\"Haadiya\"},\"publisher\":{\"@type\":\"Organization\",\"name\":\"" NAME "\",\"url\":\"" site "/\"}"
    img = ((sl[i] ".jpg") in hasimg) ? site "/images/dishes/" sl[i] ".jpg" : ""
    if (img != "") ld = ld ",\"image\":[\"" img "\"]"
    ld = ld ",\"totalTime\":\"PT" dmin[i] "M\",\"recipeCuisine\":\"" cuisine "\",\"recipeCategory\":\"" js(main1[i] != "" ? clab[main1[i]] : clab["quick"]) "\""
    ld = ld ",\"keywords\":\"" js(nm (af ? ", air fryer " tolower(nm) : "") ", " tolower(cuisine) " recipe, home cooking") "\""
    if (veg[i]) ld = ld ",\"suitableForDiet\":\"https://schema.org/VegetarianDiet\""
    ld = ld ",\"recipeIngredient\":["; for (j = 1; j <= cnt; j++) ld = ld (j > 1 ? "," : "") "\"" js(en[ig[j]]) "\""; ld = ld "]"
    delete st; c = steps(dhow[i], st); ld = ld ",\"recipeInstructions\":["
    for (j = 1; j <= c; j++) ld = ld (j > 1 ? "," : "") "{\"@type\":\"HowToStep\",\"text\":\"" js(st[j]) "\"}"
    ld = ld "]}"

    printf "%s<title>%s</title>\n<meta name=\"description\" content=\"%s\">\n<link rel=\"canonical\" href=\"%s\">\n", head1, h(title), h(desc), url > f
    printf "<meta property=\"og:type\" content=\"article\">\n<meta property=\"og:title\" content=\"%s\">\n<meta property=\"og:description\" content=\"%s\">\n<meta property=\"og:url\" content=\"%s\">\n<meta property=\"og:site_name\" content=\"%s\">\n%s<meta name=\"twitter:card\" content=\"summary_large_image\">\n", h(title), h(desc), url, NAME, \
      img != "" ? "<meta property=\"og:image\" content=\"" img "\">\n<meta property=\"og:image:width\" content=\"1200\">\n<meta property=\"og:image:height\" content=\"720\">\n<meta property=\"og:image:alt\" content=\"A drawing of " h(nm) "\">\n" : "<meta property=\"og:image\" content=\"" site "/og-image.png?v=3\">\n" > f
    printf "%s\n%s<script type=\"application/ld+json\">%s</script>\n</head>\n<body>\n%s<main>\n", icon, css, ld, top > f
    crumb = main1[i] != "" ? " › <a href=\"/recipes/" cs[main1[i]] "/\">" h(clab[main1[i]]) "</a>" : ""
    printf "<p class=\"crumb\"><a href=\"/recipes/\">Recipes</a>%s</p>\n<h1>%s</h1>\n<div class=\"pills\">%s</div>\n", crumb, h(nm), pills(i) > f
    if (img != "") printf "<img class=\"hero\" src=\"/images/dishes/%s.jpg\" width=\"1200\" height=\"720\" alt=\"A drawing of %s\">\n", sl[i], h(nm) > f
    printf "<p class=\"lede\">A short home-style guide to %s%s. Basics like salt, oil, haldi, red chilli, cumin, garam masala, ginger-garlic, vinegar, chilli sauce and ketchup are assumed.</p>\n", h(nm), af ? ", with steps for the usual way and for the air fryer" : "" > f

    printf "<h2>Ingredients</h2>\n<ul class=\"ing\">\n" > f
    for (j = 1; j <= cnt; j++) { k = ig[j]; nmk = en[k]; if (ur[k] != "" && tolower(ur[k]) != tolower(nmk) && index(tolower(nmk), tolower(ur[k])) == 0) nmk = nmk " (" ur[k] ")"
      printf "<li>%s%s</li>\n", h(nmk), (k in sw) ? "<small>No " h(tolower(en[k])) "? Use " h(sw[k]) ".</small>" : "" > f }
    printf "</ul>\n" > f

    delete st; c = steps(dhow[i], st)
    printf "<h2>%s</h2>\n<ol class=\"st\">\n", af ? mhead[afm[nm]] : "Method" > f
    for (j = 1; j <= c; j++) printf "<li>%s</li>\n", h(st[j]) > f
    printf "</ol>\n" > f
    if (af) {
      delete st; c = steps(afhow[nm], st)
      printf "<h2>In the air fryer (about %s min)</h2>\n<ol class=\"st\">\n", afmin[nm] > f
      for (j = 1; j <= c; j++) printf "<li>%s</li>\n", h(st[j]) > f
      printf "</ol>\n" > f
      t = aftip[nm]; if (t == "AFSAM") t = afsam; else if (substr(t, 1, 1) == "@") t = afx[substr(t, 2)]
      if (t != "") printf "<p class=\"tip\"><b>Air fryer tip:</b> %s</p>\n", h(t) > f
      printf "<p class=\"tip\"><b>Air fryer basics:</b> %s</p>\n", h(afx["basics"]) > f
    } else if (nm in noaf) printf "<p class=\"no\"><b>Not for the air fryer.</b> %s</p>\n", h(afx[noaf[nm]]) > f

    q = nm; gsub(/ /, "%20", q); gsub(/&/, "%26", q)
    wa = nm " (" dmin[i] " min)%0A" url; gsub(/ /, "%20", wa); gsub(/&/, "%26", wa)
    printf "<div class=\"acts\"><a class=\"btn go\" href=\"/?dish=%s&amp;cook=1\">Start cooking with step timers</a><a class=\"btn\" href=\"/?dish=%s\">Open in the app</a><a class=\"btn\" href=\"https://wa.me/?text=%s\" target=\"_blank\" rel=\"noopener\">Share on WhatsApp</a></div>\n", q, q, wa > f

    # a few more dishes from the same category, so readers (and Google) can keep going
    c = main1[i]; if (c == "") c = "quick"
    printf "<h2>More from %s</h2>\n<ul class=\"more\">\n", h(clab[c]) > f
    for (p = 1; p <= n; p++) if (ord[p] == i) break
    shown = 0; for (j = 1; j < n && shown < 6; j++) { o = ord[(p + j - 1) % n + 1]; if (incat[o, c]) { printf "<li><a href=\"/recipes/%s/\">%s</a></li>\n", sl[o], h(dn[o]) > f; shown++ } }
    printf "</ul>\n<p><a href=\"/recipes/\">See all %d recipes</a></p>\n</main>\n%s</body>\n</html>\n", n, foot > f
    close(f)
    print url
  }

  if (ENVIRON["MODE"] == "dirs") { for (k = 1; k <= ncat; k++) print "recipes/" cs[ck[k]]; exit }
  # ---------- a page for each category: recipes/<category>/, a grid of picture cards ----------
  for (k = 1; k <= ncat; k++) { c = ck[k]; cnt = 0; for (p = 1; p <= n; p++) if (incat[ord[p], c]) cnt++; ccount[c] = cnt
    f = "recipes/" cs[c] "/index.html"; url = site "/recipes/" cs[c] "/"
    o = byname[crep[c]]; cimg = (o && ((sl[o] ".jpg") in hasimg)) ? site "/images/dishes/" sl[o] ".jpg" : site "/og-image.png?v=3"
    title = ctitle[c] ": " cnt " Pakistani Home-Style Dishes | " NAME
    desc = cintro[c] " " cnt " short recipes, many with air fryer steps."
    printf "%s<title>%s</title>\n<meta name=\"description\" content=\"%s\">\n<link rel=\"canonical\" href=\"%s\">\n<meta property=\"og:title\" content=\"%s\">\n<meta property=\"og:description\" content=\"%s\">\n<meta property=\"og:url\" content=\"%s\">\n<meta property=\"og:image\" content=\"%s\">\n%s\n%s</head>\n<body>\n%s<main>\n", head1, h(title), h(desc), url, h(title), h(desc), url, cimg, icon, css, top > f
    printf "<p class=\"crumb\"><a href=\"/recipes/\">Recipes</a></p>\n<h1>%s</h1>\n<p class=\"lede\">%s %d dishes.%s</p>\n<ul class=\"grid\">\n", h(ctitle[c]), h(cintro[c]), cnt, \
      c == "airfryer" ? " Or <a href=\"/air-fryer/\">open them in the app</a> to switch any dish between the air fryer and the usual way." : "" > f
    for (p = 1; p <= n; p++) { o = ord[p]; if (incat[o, c]) printf "%s", card(o) > f }
    printf "</ul>\n<p><a href=\"/recipes/\">All recipes</a> · <a href=\"/\">Tick what is in your kitchen</a> and see what you can cook right now.</p>\n</main>\n%s</body>\n</html>\n", foot > f
    close(f); print url }

  # ---------- recipes/index.html: the categories as cards, then every dish A to Z ----------
  f = "recipes/index.html"; url = site "/recipes/"
  title = "All Recipes: " n " Pakistani and Desi Home-Style Dishes | " NAME
  desc = "Every recipe on " NAME ": " n " home-style dishes for breakfast and sehri, lunch and dinner, iftar, desserts and Eid, many with air fryer steps."
  printf "%s<title>%s</title>\n<meta name=\"description\" content=\"%s\">\n<link rel=\"canonical\" href=\"%s\">\n<meta property=\"og:title\" content=\"%s\">\n<meta property=\"og:description\" content=\"%s\">\n<meta property=\"og:url\" content=\"%s\">\n<meta property=\"og:image\" content=\"%s/og-image.png?v=3\">\n%s\n%s</head>\n<body>\n%s<main>\n", head1, h(title), h(desc), url, h(title), h(desc), url, site, icon, css, top > f
  printf "<h1>All recipes</h1>\n<p class=\"lede\">%d short, home-style recipes. Or <a href=\"/\">tick what is in your kitchen</a> and see what you can cook right now.</p>\n<ul class=\"grid\">\n", n > f
  for (k = 1; k <= ncat; k++) { c = ck[k]; o = byname[crep[c]]
    printf "<li><a class=\"dc\" href=\"/recipes/%s/\">%s<b>%s</b><small>%d dishes</small></a></li>\n", cs[c], thumb(o), h(clab[c]), ccount[c] > f }
  printf "</ul>\n<h2>All recipes A to Z</h2>\n<ul class=\"az\">\n" > f
  for (p = 1; p <= n; p++) { o = ord[p]; printf "<li><a href=\"/recipes/%s/\">%s</a></li>\n", sl[o], h(dn[o]) > f }
  printf "</ul>\n</main>\n%s</body>\n</html>\n", foot > f
  close(f)
  print url
}
function thumb(o) { return (sl[o] ".jpg") in hasthumb ? "<img src=\"/images/dishes/thumbs/" sl[o] ".jpg\" width=\"480\" height=\"288\" loading=\"lazy\" alt=\"\">" : "<span class=\"noimg\"></span>" }
function card(o) { return "<li><a class=\"dc\" href=\"/recipes/" sl[o] "/\">" thumb(o) "<b>" h(dn[o]) "</b><small>" dmin[o] " min" (veg[o] ? " · Vegetarian" : "") (dn[o] in oven ? " · Needs an oven" : "") "</small></a></li>\n" }
