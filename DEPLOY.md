# Deploying the Gear Hub marketing site

This `web/` folder is a **pre-built static site** — plain HTML/CSS, no server, no build step on
the host. The sub-pages are generated locally:

```bash
node web/_build/build.mjs    # regenerates feature/solution/pricing/blog/404 pages
```

`web/index.html`, `web/assets/`, `web/terms.html`, `web/privacy.html` are committed as-is.
Deploy the **contents of `web/`** as the site root so `/assets/site.css`, `/sitemap.xml` etc.
resolve correctly.

---

## Option A — Netlify (easiest)

Config: `netlify.toml` + `_headers` + `_redirects` (already in this folder).

1. Push the repo to GitHub, or drag-and-drop the `web/` folder at https://app.netlify.com/drop.
2. If connecting a repo: set **Base directory** = `web`, **Publish directory** = `web`, **Build command** = empty.
3. Add your custom domain `gearhub.in` under Domain settings; Netlify provisions HTTPS automatically.

## Option B — Cloudflare Pages

Uses the same `_headers` and `_redirects` files.

1. Create a Pages project from the repo.
2. **Build command**: leave empty. **Build output directory**: `web`.
3. Add `gearhub.in` as a custom domain (Cloudflare handles DNS + TLS).

## Option C — Vercel

Config: `vercel.json` (clean URLs + trailing slash + headers).

1. Import the repo at https://vercel.com/new.
2. **Root Directory**: `web`. **Framework Preset**: Other. **Build command**: empty. **Output**: `web` (or leave default since there's no build).
3. Add the `gearhub.in` domain in Project → Settings → Domains.

## Option D — GitHub Pages / S3 / any static host

Upload the contents of `web/` to the web root. Ensure the host serves
`/<folder>/index.html` for `/<folder>/` (most do). Point the `404.html` as the not-found page
if the host supports it.

---

## What the configs do (all hosts)

- **Clean URLs / trailing slash** — `/pricing/` serves `pricing/index.html`.
- **Caching** — `/assets/*` cached 1 year (immutable); HTML always revalidated so edits go live.
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Redirect** — old `/landing.html` → `/` (301), preserving any existing inbound links.
- **404** — custom branded `404.html`.

---

## Before you go live — checklist

- [ ] Point `gearhub.in` DNS at the host; confirm HTTPS works.
- [ ] Confirm the app subdomain `app.gearhub.in` is live (all CTAs link to `https://app.gearhub.in/?signup=1`).
- [ ] Add a real **`/assets/og-cover.png`** (1200×630) and **`/assets/logo.png`** — they're referenced in
      meta tags and JSON-LD but not yet created. Until then social-share previews have no image.
- [ ] Submit `https://gearhub.in/sitemap.xml` in Google Search Console + Bing Webmaster Tools.
- [ ] Re-run `node web/_build/build.mjs` whenever you edit a generated page or add a blog article,
      and add the new article's URL to `sitemap.xml`.
