# Switching on the community

The community ("The kitchen table"), the Sign in button and the Top 3 cooks board are already part of the site, but
they stay **switched off and invisible** until you do the steps below. While they are off, the site looks and works
exactly as before. Nothing here costs anything until you choose to upgrade (see step 9).

Menu names in Supabase change from time to time. If something is called slightly differently, look for the closest match.

## What you get

- **Show & tell**: photo posts with likes and comments.
- **Ask a cook**: questions with replies. The person who asked picks a **Best answer**.
- **Top cooks this week**: a top 3 board. 2 points per approved post, 1 per like received, 5 when your reply is chosen as the best answer. Counts the last 7 days.
- **Sign in** with an emailed code (no passwords). Google sign-in is optional (step 5).
- **Moderation**: every new post waits for your approval. Anyone signed in can Report a post or reply, and 3 different reports hide it until you look.
- **Spam brakes**: 5 posts a day and 30 replies an hour per person. Photos are shrunk and stripped of location data before upload.
- **Delete my account** (removes the person's posts, replies and photos).
- **Installable app**: already live. People can add the site to their home screen (nothing to set up).

## Steps

### 1. Create the project
1. Go to <https://supabase.com> and sign up (free).
2. **New project**. Pick the region closest to your visitors (London or another EU region for the UK). Save the database password somewhere safe.

### 2. Create the tables and safety rules
1. In the project: **SQL Editor > New query**.
2. Open `supabase/schema.sql` from this repository, copy **all** of it, paste it in, and press **Run**.
3. You should see "Success". It is safe to run again later if you are unsure.

### 3. Make the sign-in emails show a code
The site signs people in with a short code, so the emails must contain it.
1. **Authentication > Emails** (or **Email Templates**).
2. Edit **Magic Link** and **Confirm signup**. In both, add this line where you like:
   `Your sign-in code is: {{ .Token }}`
3. Leave the rest of the template as it is. Save each one.

### 4. Tell Supabase your website address
**Authentication > URL Configuration**
- **Site URL**: `https://weareupzyl.com/`
- **Redirect URLs**: add the same address, and also `https://haadiyafurqan-ui.github.io/Cook-with-what-you-have/` for anyone using an old link.

If you later move to a different domain, change the Site URL and add the new address to Redirect URLs.

### 5. Google sign-in (optional, you can skip this)
Skip it and people simply use the emailed code. To add it later:
1. **Authentication > Providers > Google**, switch it on. Supabase shows a "callback URL".
2. In Google Cloud Console create an "OAuth client ID" (type: Web application), paste Supabase's callback URL as an authorised redirect URI, then copy the Client ID and Client secret back into Supabase.
3. In `community-config.js` change `google: false` to `google: true`.

### 6. Connect the site
1. **Project Settings > API**. Copy the **Project URL** and the **anon / public** key (newer projects may call it the "publishable" key).
2. Open `community-config.js` and paste them between the quotes:
   ```js
   window.CWWHY_COMMUNITY = {
     url: "https://xxxx.supabase.co",
     anonKey: "eyJ...",
     google: false
   };
   ```
3. Save and push to GitHub (or ask Claude to do it). A minute later the **Community** tab and **Sign in** button appear.

These two values are meant to be public. **Never** paste the `service_role` key anywhere in this repository.

### 7. Make yourself a moderator
1. On the live site, press **Sign in**, enter your email, type the code, and choose a display name.
2. In Supabase **SQL Editor**, run (with your own email):
   ```sql
   insert into public.moderators (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
3. Reload the site. A "Waiting for your approval" box appears at the top of the community page with Approve and Reject buttons.

To add another moderator later, run the same line with their email (they must have signed in once first).

### 8. Set up proper email sending before you launch
Supabase's built-in email sender has very low limits and is meant for testing, so people may not get their codes once real
visitors arrive. Before you tell anyone about the community:
**Authentication > Emails > SMTP Settings**, switch on custom SMTP and enter details from an email service such as Resend or Brevo
(both have free plans at small volumes; check their current limits).

### 9. Before a public launch
- **Upgrade to Supabase Pro** (about $25/month at the time of writing). Free projects pause after about a week without activity, which would take the community offline.
- Post a few real dishes yourself, and invite friends and family to be your first "founding cooks".
- Read your privacy notice and kitchen rules once (the privacy page gains a "Community accounts" section automatically when the community is on).
- Check Ofcom's guidance for small sites with user posts (UK Online Safety Act). Pre-approval, the Report button and quick deletion are the basics it asks for. This is not legal advice.
- Decide who deals with reports. You are the first moderator; the site tells people a moderator checks every post.

## Day to day
- **Approve or reject** new posts from the box at the top of the community page.
- **Delete** anything from the community page (moderators see Delete on every post and reply).
- **Reported content**: after 3 reports, a reply is hidden and a post goes back to "waiting". Review it in Supabase **Table editor** (`posts` or `replies`; for a hidden reply, set `hidden` back to false to restore it) and look at the `reports` table.
- **Switch it all off again**: empty the two values in `community-config.js`. The site returns to how it was, and your data stays in Supabase.
