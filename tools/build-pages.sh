#!/usr/bin/env bash
# Makes a page at each section's own address (plan-your-week/index.html, faq/index.html and so on)
# so Google can list them, plus sitemap.xml.
#
# Each page is a copy of index.html with its own title, description and address, the right
# section open, and a short block of plain text that Google can read before any script runs.
# The site's script removes that block as soon as it starts, so visitors see the normal page.
#
# Run it after every change to index.html:   bash tools/build-pages.sh
# (the git pre-commit hook in tools/pre-commit runs it for you, and GitHub checks it on every push)
set -euo pipefail
export LC_ALL=C
cd "$(dirname "$0")/.."

SITE="https://weareupzyl.com"
NAME="Cook With What You Have"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
URLS=""

esc() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g'; }

# links to every section, so Google can find its way from any page to all the others
LINKS='<p><a href="/">Find a dish</a> · <a href="/plan-your-week/">Plan your week</a> · <a href="/air-fryer/">Air fryer recipes</a> · <a href="/quizzes/">Quizzes</a> · <a href="/kitchen-sos/">Kitchen SOS</a> · <a href="/faq/">FAQ</a> · <a href="/about/">About</a></p>'

# the [question, answer] pairs from a list like FAQ or PRIV in index.html, one "question<TAB>answer" per line
pairs() {
  grep -m1 "^const $1={en:\[" index.html | sed -e "s/^const $1={en:\[\[\"//" -e 's/"\]\],ru:.*$//' \
    | sed -e 's/"\], \["/\n/g' | sed -e 's/", "/\t/'
}

# page <folder> <section> <robots> <title> <description> <readable text file>
page() {
  local dir="$1" sec="$2" robots="$3" title="$4" desc="$5" pre="$6"
  mkdir -p "$dir"
  TITLE="$(printf '%s' "$title" | esc)" DESC="$(printf '%s' "$desc" | esc)" URL="$SITE/$dir/" SEC="$sec" ROBOTS="$robots" \
  awk -v pre="$pre" '
    BEGIN { while ((getline l < pre) > 0) txt = txt l "\n"; open = "<section id=\"p-" ENVIRON["SEC"] "\"" }
    /^<title>/ { print "<title>" ENVIRON["TITLE"] "</title>"; next }
    /^<meta name="description"/ { print "<meta name=\"description\" content=\"" ENVIRON["DESC"] "\">"; if (ENVIRON["ROBOTS"] != "") print "<meta name=\"robots\" content=\"" ENVIRON["ROBOTS"] "\">"; next }
    /^<meta property="og:title"/ { print "<meta property=\"og:title\" content=\"" ENVIRON["TITLE"] "\">"; next }
    /^<meta property="og:description"/ { print "<meta property=\"og:description\" content=\"" ENVIRON["DESC"] "\">"; next }
    /^<meta property="og:url"/ { print "<meta property=\"og:url\" content=\"" ENVIRON["URL"] "\">"; next }
    /^<link rel="canonical"/ { print "<link rel=\"canonical\" href=\"" ENVIRON["URL"] "\">"; next }
    {
      line = $0
      if (ENVIRON["SEC"] != "home" && index(line, "<section id=\"p-home\">") == 1) line = "<section id=\"p-home\" hidden>" substr(line, 22)
      i = index(line, open)
      if (i) {
        rest = substr(line, i + length(open)); j = index(rest, ">"); attrs = substr(rest, 1, j - 1); sub(/ hidden$/, "", attrs)
        line = substr(line, 1, i - 1) open attrs ">" "<div class=\"seo-pre\">" txt "</div>" substr(rest, j + 1)
      }
      print line
    }' index.html > "$dir/index.html"
  [ "$robots" = "" ] && URLS="$URLS $SITE/$dir/"
  return 0
}

# ---------- Plan your week ----------
cat > "$TMP/plan" <<'EOF'
<h2>Plan your week of home cooking</h2>
<p>A free weekly meal planner for Pakistani and desi home cooking. Pick a dish for each day, or let the site plan the week around the ingredients already in your kitchen, keeping it balanced between chicken, gosht, daal, sabzi and more.</p>
<p>Mark busy days for quick dishes, lock the days you have decided, and drag a day to move it. Add leftover days, empty days or a day you order in. You get reminders for anything to soak or marinate the night before, and a shopping list sorted by shop: sabzi wala, butcher, kiryana and dairy. Print it or send it on WhatsApp.</p>
<p>No sign-up. Your plan stays on your own phone.</p>
EOF
echo "$LINKS" >> "$TMP/plan"
page plan-your-week plan "" "Weekly Meal Planner for Pakistani Home Cooking | $NAME" \
  "Plan a week of Pakistani home cooking around what's already in your kitchen. Busy-day picks, soak and marinate reminders, and a shopping list sorted by shop. Free, no sign-up." "$TMP/plan"

# ---------- Quizzes ----------
cat > "$TMP/quiz" <<'EOF'
<h2>Fun cooking quizzes</h2>
<p>Four short, free quizzes for home cooks. Each takes about a minute, and you can share your result on WhatsApp.</p>
<ul>
<li><a href="/quizzes/kitchen-personality/">What's your kitchen personality?</a> Six kitchen personalities, and one dish that matches you.</li>
<li><a href="/quizzes/which-spice-are-you/">Which spice are you?</a> Hot, warm or a little mysterious?</li>
<li><a href="/quizzes/what-to-bake/">What should you bake this weekend?</a> Can't decide? We'll pick your perfect weekend bake.</li>
<li><a href="/quizzes/cooking-terms/">How well do you know your cooking terms?</a> Simmer, sauté, julienne: beat all 8 to earn the title Head chef.</li>
</ul>
<p>Your answers are not saved or sent anywhere.</p>
EOF
echo "$LINKS" >> "$TMP/quiz"
page quizzes quiz "" "Fun Cooking Quizzes: Kitchen Personality, Spice and Baking | $NAME" \
  "Free one-minute cooking quizzes: find your kitchen personality, which spice you are, what to bake this weekend, and test your cooking terms. Share your result on WhatsApp." "$TMP/quiz"

quiz() { # quiz <folder> <title> <description> <heading> <text>
  printf '<h2>%s</h2>\n<p>%s</p>\n<p>Free, takes about a minute, and your answers are not saved. <a href="/quizzes/">See all quizzes</a>.</p>\n%s\n' "$4" "$5" "$LINKS" > "$TMP/q"
  page "quizzes/$1" quiz "" "$2" "$3" "$TMP/q"
}
quiz kitchen-personality "What's Your Kitchen Personality? Free Cooking Quiz | $NAME" \
  "Are you the Biryani Boss, the Last-Minute Genius or the Comfort Cook? Answer six quick questions to find your kitchen personality and a dish that matches you." \
  "What's your kitchen personality?" \
  "Answer six quick questions about how you cook and find out which of six kitchen personalities you are: the Biryani Boss, the Last-Minute Genius, the Meal-Prep Queen, the Comfort Cook, the Fusion Explorer or the Sweet Tooth. You also get one dish that matches you perfectly, with the recipe."
quiz which-spice-are-you "Which Spice Are You? Fun Desi Kitchen Quiz | $NAME" \
  "Are you haldi, elaichi or garam masala? Take this fun one-minute desi kitchen quiz to find out which spice you are, then share it on WhatsApp." \
  "Which spice are you?" \
  "Are you hot, warm or a little mysterious? Answer a few quick questions and find out which spice from the desi masala dabba matches your personality: haldi, zeera, elaichi, garam masala, hing, chilli, dalchini or kali mirch."
quiz what-to-bake "What Should You Bake This Weekend? Baking Quiz | $NAME" \
  "Can't decide what to bake? Answer a few quick questions and get your perfect weekend bake, from cookies and brownies to bread and cake." \
  "What should you bake this weekend?" \
  "Can't decide what to bake? Tell us your mood, your time and what you have, and we'll pick your perfect weekend bake, with a short recipe to follow."
quiz cooking-terms "Cooking Terms Quiz: Simmer, Sauté, Julienne and More | $NAME" \
  "How well do you know your cooking terms? Test yourself on simmer, sauté, julienne and more. Get all 8 right to earn the title Head chef." \
  "How well do you know your cooking terms?" \
  "Simmer, sauté, julienne, blanch: eight quick questions on the words recipes use. Learn what each one means as you go, and get all 8 right to earn the title Head chef."

# ---------- Kitchen SOS ----------
cat > "$TMP/sos" <<'EOF'
<h2>Kitchen SOS: ask real home cooks</h2>
<p>Stuck mid-recipe? Kitchen SOS is a friendly community where you can ask a cooking question and real home cooks reply, often while your pot is still on the stove.</p>
<p>Ask what to use when you are missing an ingredient, how to fix a curry that is too salty or too runny, or whether your dish is ready. You can also share photos of what you cooked and see what others are making.</p>
EOF
echo "$LINKS" >> "$TMP/sos"
page kitchen-sos community "" "Kitchen SOS: Ask Home Cooks Your Cooking Questions | $NAME" \
  "Stuck mid-recipe? Ask Kitchen SOS and real home cooks reply, often while your pot is still on the stove. Ingredient swaps, fixes for salty or runny curries, and cooking photos." "$TMP/sos"

# ---------- Air fryer (the Home page with the Air Fryer category open) ----------
afn="$(awk '/^const AF=\{/{on=1;next} on&&/^"/{sub(/^"/,"");sub(/".*/,"");print} on&&/\};$/{exit}' index.html | sort | paste -sd, - | sed 's/,/, /g')"
afc="$(printf '%s' "$afn" | tr ',' '\n' | grep -c .)"
{ echo "<h2>Air fryer recipes for Pakistani and desi home cooking</h2>"
  echo "<p>$afc home-style dishes you can make in an air fryer, from samosas, spring rolls and shami kabab to chicken tikka, seekh kabab, wings, fries and brownies. Every dish shows the air fryer temperature, time and when to turn it, plus a tip where it helps. Switch any dish back to the usual way, frying, oven or grill, with one tap.</p>"
  echo "<p>Air fryer basics: heat the air fryer for 3 to 5 minutes first, don't fill the basket more than halfway, brush or spray a little oil, and turn or shake halfway.</p>"
  echo "<p>Dishes: $afn.</p>"
  echo "$LINKS"; } > "$TMP/af"
page air-fryer home "" "Air Fryer Recipes: Pakistani and Desi Dishes | $NAME" \
  "$afc Pakistani and desi dishes in the air fryer: samosas, spring rolls, shami kabab, chicken tikka, seekh kabab, wings, fries and more, with temperature, time and tips." "$TMP/af"

# ---------- FAQ and Privacy, written out from the lists in index.html ----------
{ echo "<h2>Frequently asked questions</h2>"
  pairs FAQ | awk -F'\t' '{print "<h3>" $1 "</h3><p>" $2 "</p>"}'
  echo "$LINKS"; } > "$TMP/faq"
page faq faq "" "Frequently Asked Questions | $NAME" \
  "How Cook With What You Have works: ticking ingredients, the weekly planner, air fryer dishes, printing your plan, Roman Urdu and the quizzes." "$TMP/faq"

{ echo "<h2>Privacy and disclaimer</h2>"
  pairs PRIV | awk -F'\t' '{print "<h3>" $1 "</h3><p>" $2 "</p>"}'
  echo "$LINKS"; } > "$TMP/priv"
page privacy privacy "" "Privacy and Disclaimer | $NAME" \
  "What this site stores (nothing about you on its servers unless you send feedback or join Kitchen SOS), and the disclaimer for its recipes." "$TMP/priv"

# ---------- About ----------
about="$(grep -m1 -o 'ab_p:`[^`]*`' index.html | sed -e 's/^ab_p:`//' -e 's/`$//')"
printf '<h2>About Cook With What You Have</h2>\n<p>%s</p>\n%s\n' "$about" "$LINKS" > "$TMP/about"
page about about "" "About | $NAME" \
  "Cook With What You Have is a free site that helps you decide what to cook with the ingredients already in your kitchen, made by Haadiya." "$TMP/about"

# ---------- Feedback (a page so the link works, but kept out of Google) ----------
printf '<h2>Feedback</h2>\n' > "$TMP/fb"
page feedback feedback "noindex" "Feedback | $NAME" "Tell us what you think of Cook With What You Have." "$TMP/fb"

# ---------- sitemap.xml ----------
{ echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  echo "  <url><loc>$SITE/</loc></url>"
  for u in $URLS; do echo "  <url><loc>$u</loc></url>"; done
  echo '</urlset>'; } > sitemap.xml

echo "Built $(printf '%s' "$URLS" | wc -w | tr -d ' ') pages and sitemap.xml"
