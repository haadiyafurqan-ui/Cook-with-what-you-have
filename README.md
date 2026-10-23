# Cook-with-what-you-have
Find recipes using the ingredients you already have.


## Community and app

The site can be installed on a phone like an app. The community board (photos, questions, sign-in and a weekly Top 3) is built in but switched off until you follow [COMMUNITY_SETUP.md](COMMUNITY_SETUP.md).

## Pages Google can find

Each section has its own address (`/plan-your-week/`, `/quizzes/`, `/kitchen-sos/`, `/air-fryer/`, `/faq/`, `/about/` and so on). Those pages are copies of `index.html` made by `tools/build-pages.sh`, which also writes `sitemap.xml`. **After changing `index.html`, run `bash tools/build-pages.sh`** (or install the hook once with `cp tools/pre-commit .git/hooks/pre-commit` and it runs on every commit). A GitHub check fails if the pages are out of date.
