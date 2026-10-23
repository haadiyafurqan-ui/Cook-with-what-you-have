#!/usr/bin/env python3
"""Kitchen SOS question pages that Google can find.

Reads approved Kitchen SOS questions (with at least one visible reply) from Supabase, using the same
public key the site uses, and writes a page for each one under kitchen-sos/questions/, plus a list
of them at kitchen-sos/questions/index.html. Run every day by .github/workflows/kitchen-sos-pages.yml,
so deleted or taken-down questions disappear within a day.

Only questions posted on or after CUTOFF appear: from that date the Privacy and disclaimer page says
that approved questions and their replies can appear in Google search.
Then run tools/build-pages.sh, which adds these pages to sitemap.xml.
"""
import html, json, os, re, shutil, sys, urllib.parse, urllib.request
from datetime import datetime

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "kitchen-sos", "questions")
CUTOFF = os.environ.get("SOS_CUTOFF") or "2026-10-24T00:00:00Z"
NAME = "Cook With What You Have"


def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()


cfg = read("community-config.js")
BASE = re.search(r'url:\s*"([^"]+)"', cfg).group(1).rstrip("/")
KEY = re.search(r'anonKey:\s*"([^"]+)"', cfg).group(1)
SITE = "https://" + read("CNAME").strip()

# ---------- fetch (before touching any files, so a failed fetch leaves the old pages in place) ----------
sel = ("id,title,body,tags,created_at,best_reply_id,author:profiles!posts_user_id_fkey(display_name),"
       "replies!replies_post_id_fkey(id,body,created_at,hidden,author:profiles(display_name))")
q = urllib.parse.urlencode({"select": sel, "status": "eq.approved", "kind": "eq.question",
                            "created_at": "gte." + CUTOFF, "order": "created_at.desc", "limit": "1000"}, safe="(),:!.")
req = urllib.request.Request(BASE + "/rest/v1/posts?" + q, headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
with urllib.request.urlopen(req, timeout=30) as r:
    posts = json.load(r)


def who(o):
    return ((o or {}).get("author") or {}).get("display_name") or "A home cook"


def day(ts):
    d = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    return f"{d.day} {d:%B %Y}"


def slug(s, pid):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60].rstrip("-")
    return (s or "question") + "-" + pid[:8]


questions = []
for p in posts:
    reps = [r for r in (p.get("replies") or []) if not r.get("hidden") and r.get("created_at", "") >= CUTOFF.replace("Z", "")]
    if not reps:
        continue  # a question with no answer yet isn't useful to anyone arriving from Google
    reps.sort(key=lambda r: (r["id"] != p.get("best_reply_id"), r["created_at"]))
    p["reps"] = reps
    p["slug"] = slug(p["title"] or "", p["id"])
    questions.append(p)

e = lambda s: html.escape(s or "", quote=True)
HEAD = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="color-scheme" content="light">\n')
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">\n'
         '<link rel="stylesheet" href="/assets/page.css">\n')
ICON = next((l for l in read("index.html").splitlines() if l.startswith('<link rel="icon"')), "")
TOP = (f'<header class="top"><div><a class="brand" href="/">{NAME}</a><nav class="nav" aria-label="Pages"><a href="/">Find a dish</a>'
       '<a href="/recipes/">All recipes</a><a href="/air-fryer/">Air fryer</a><a href="/plan-your-week/">Plan your week</a>'
       '<a href="/quizzes/">Quizzes</a><a href="/kitchen-sos/">Kitchen SOS</a></nav></div></header>\n')
FOOT = ('<footer class="foot"><div><p>Answers come from home cooks in the Kitchen SOS community and are checked by a moderator, '
        'but they are tips, not professional advice. If you posted here and want something removed, delete it in Kitchen SOS '
        'or tell us through the feedback box.</p><p><a href="/faq/">FAQ</a> · <a href="/about/">About</a> · '
        '<a href="/privacy/">Privacy and disclaimer</a></p></div></footer>\n')


def page(path, title, desc, url, body, ld=None, robots=""):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(HEAD + f"<title>{e(title)}</title>\n<meta name=\"description\" content=\"{e(desc)}\">\n")
        if robots:
            f.write(f'<meta name="robots" content="{robots}">\n')
        f.write(f'<link rel="canonical" href="{url}">\n<meta property="og:type" content="article">\n'
                f'<meta property="og:title" content="{e(title)}">\n<meta property="og:description" content="{e(desc)}">\n'
                f'<meta property="og:url" content="{url}">\n<meta property="og:site_name" content="{NAME}">\n'
                f'<meta property="og:image" content="{SITE}/og-image.png?v=3">\n{ICON}\n{FONTS}')
        if ld:
            f.write('<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace("</", "<\\/") + "</script>\n")
        f.write("</head>\n<body>\n" + TOP + "<main>\n" + body + "</main>\n" + FOOT + "</body>\n</html>\n")


if os.path.isdir(OUT):
    shutil.rmtree(OUT)

for p in questions:
    url = f"{SITE}/kitchen-sos/questions/{p['slug']}/"
    reps, best = p["reps"], p.get("best_reply_id")
    desc = re.sub(r"\s+", " ", p["body"] or "").strip()
    desc = (desc[:150].rsplit(" ", 1)[0] + "…") if len(desc) > 155 else desc
    answers = []
    for r in reps:
        a = {"@type": "Answer", "text": r["body"], "dateCreated": r["created_at"], "url": f"{url}#a-{r['id'][:8]}",
             "author": {"@type": "Person", "name": who(r)}, "upvoteCount": 0}
        answers.append((r, a))
    qld = {"@type": "Question", "name": p["title"], "text": p["body"], "answerCount": len(reps), "dateCreated": p["created_at"],
           "author": {"@type": "Person", "name": who(p)}}
    acc = [a for r, a in answers if r["id"] == best]
    sug = [a for r, a in answers if r["id"] != best]
    if acc:
        qld["acceptedAnswer"] = acc[0]
    if sug:
        qld["suggestedAnswer"] = sug
    tags = "".join(f'<span class="pill">{e(t)}</span>' for t in (p.get("tags") or []))
    lis = ""
    for r in reps:
        isbest = r["id"] == best
        cls = ' class="best"' if isbest else ""
        badge = '<span class="badge">Best answer</span>' if isbest else ""
        lis += (f'<li id="a-{r["id"][:8]}"{cls}><p class="who"><b>{e(who(r))}</b> · {day(r["created_at"])}{badge}</p>'
                f'<p>{e(r["body"])}</p></li>\n')
    n = len(reps)
    body = (f'<p class="crumb"><a href="/kitchen-sos/">Kitchen SOS</a> › <a href="/kitchen-sos/questions/">Questions</a></p>\n'
            f'<h1>{e(p["title"])}</h1>\n<p class="qmeta">Asked by {e(who(p))} · {day(p["created_at"])}</p>\n'
            + (f'<div class="pills">{tags}</div>\n' if tags else "")
            + f'<p class="qbody">{e(p["body"])}</p>\n<h2>{n} answer{"s" if n != 1 else ""}</h2>\n<ul class="ans">\n{lis}</ul>\n'
            '<div class="acts"><a class="btn go" href="/kitchen-sos/">Ask your own question</a><a class="btn" href="/recipes/">Browse recipes</a></div>\n')
    page(os.path.join(OUT, p["slug"], "index.html"), f'{p["title"]} | Kitchen SOS | {NAME}', desc, url, body,
         {"@context": "https://schema.org", "@type": "QAPage", "mainEntity": qld})

# ---------- the list of all questions ----------
url = f"{SITE}/kitchen-sos/questions/"
if questions:
    items = "".join(f'<li><a href="/kitchen-sos/questions/{p["slug"]}/">{e(p["title"])}</a><small>{len(p["reps"])} '
                    f'answer{"s" if len(p["reps"]) != 1 else ""} · {day(p["created_at"])}</small></li>\n' for p in questions)
    body = (f'<p class="crumb"><a href="/kitchen-sos/">Kitchen SOS</a></p>\n<h1>Kitchen SOS questions</h1>\n'
            '<p class="lede">Cooking questions from home cooks, answered by the Kitchen SOS community.</p>\n'
            f'<ul class="qlist">\n{items}</ul>\n<div class="acts"><a class="btn go" href="/kitchen-sos/">Ask your own question</a></div>\n')
    page(os.path.join(OUT, "index.html"), f"Kitchen SOS Questions: Cooking Help from Home Cooks | {NAME}",
         "Real cooking questions from home cooks, from fixing a salty curry to swapping a missing ingredient, answered by the Kitchen SOS community.",
         url, body)
else:
    page(os.path.join(OUT, "index.html"), f"Kitchen SOS Questions | {NAME}", "Cooking questions answered by home cooks.", url,
         '<h1>Kitchen SOS questions</h1>\n<p class="lede">Answered questions will appear here soon. '
         '<a href="/kitchen-sos/">Ask Kitchen SOS</a> in the meantime.</p>\n', robots="noindex")

print(f"Kitchen SOS: {len(questions)} answered question page(s) from {len(posts)} approved question(s) since {CUTOFF}")
sys.exit(0)
