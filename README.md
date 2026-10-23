# Cook-with-what-you-have
Find recipes using the ingredients you already have.


## Community and app

The site can be installed on a phone like an app. The community board (photos, questions, sign-in and a weekly Top 3) is built in but switched off until you follow [COMMUNITY_SETUP.md](COMMUNITY_SETUP.md).

## Pages Google can find

Each section has its own address (`/plan-your-week/`, `/quizzes/`, `/kitchen-sos/`, `/air-fryer/`, `/faq/`, `/about/` and so on). Those pages are copies of `index.html` made by `tools/build-pages.sh`, which also writes a page for every dish under `/recipes/` (via `tools/recipes.awk`), `sitemap.xml` and `robots.txt`. The domain is set in one place, the `CNAME` file: change it and run the script to move everything. **After changing `index.html`, run `bash tools/build-pages.sh`** (or install the hook once with `cp tools/pre-commit .git/hooks/pre-commit` and it runs on every commit). A GitHub check fails if the pages are out of date.

Moving to a new domain: follow [DOMAIN_MOVE.md](DOMAIN_MOVE.md).

Kitchen SOS questions answered from 24 October 2026 get their own pages under `/kitchen-sos/questions/`, rebuilt daily by a GitHub job (`tools/build-sos.py`, `.github/workflows/kitchen-sos-pages.yml`). The job commits to `main`, so run `git pull` before starting new work.
