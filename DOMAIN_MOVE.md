# Moving to a new domain

A checklist for the day you switch from weareupzyl.com to a new domain. Do the steps in order.
Plan for about an hour, plus up to a day for the new address to work everywhere.

## Before the day

- [ ] **Buy the new domain** and add it to Cloudflare (the same account that holds weareupzyl.com).
- [ ] **Keep weareupzyl.com renewed for at least a year**, so links already shared on WhatsApp and Instagram keep working.

## On the day

### 1. Point the new domain at GitHub Pages (Cloudflare)
In Cloudflare, open the **new** domain > **DNS** and add the same records weareupzyl.com has today.
Keep them **DNS only (grey cloud)**, like now, so GitHub can issue the HTTPS certificate.

### 2. Change the domain in the site (one file)
1. Put the new domain in the `CNAME` file, on its own line, with no `https://` and no `/` (for example `newname.com`).
2. Run `bash tools/build-pages.sh`. It updates `index.html`, every section and recipe page, `sitemap.xml` and `robots.txt`.
3. Commit and push.

### 3. GitHub Pages settings
Repository > **Settings > Pages**: the custom domain should now show the new name.
Wait until **Enforce HTTPS** can be ticked (the certificate can take from a few minutes to a day), then tick it.

### 4. Kitchen SOS sign-in (Supabase), or sign-in will break
Supabase > **Authentication > URL Configuration**:
- **Site URL**: `https://NEWDOMAIN/`
- **Redirect URLs**: add `https://NEWDOMAIN/`. Leave the old addresses in place for now.

If Google sign-in is switched on, also add the new domain under **Authorised JavaScript origins** in Google Cloud Console.

### 5. Send the old domain to the new one
In Cloudflare, open **weareupzyl.com**:
- Turn its DNS records to **Proxied (orange cloud)**.
- **Rules > Redirect Rules**: send everything to `https://NEWDOMAIN` with the same path, as a **301 (permanent)** redirect.

Then weareupzyl.com/recipes/aloo-samosa/ lands on NEWDOMAIN/recipes/aloo-samosa/.

### 6. Check it works
- [ ] The new domain opens with the padlock (HTTPS).
- [ ] `https://NEWDOMAIN/plan-your-week/` and a recipe page open.
- [ ] An old weareupzyl.com link lands on the same page on the new domain.
- [ ] Kitchen SOS: sign in with an emailed code.
- [ ] Share a dish on WhatsApp: the preview shows the new address.

### 7. Google Search Console
1. Add the new domain as a **Domain** property and verify it (Search Console gives a TXT record to add in Cloudflare).
2. **Sitemaps**: submit `https://NEWDOMAIN/sitemap.xml`.
3. If weareupzyl.com was ever added to Search Console, use **Settings > Change of address** on it.

## Also update
- The **Site URL** line in `COMMUNITY_SETUP.md`.
- Instagram, WhatsApp, TikTok and YouTube bios.
