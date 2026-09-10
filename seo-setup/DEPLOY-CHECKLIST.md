# Deploy-day SEO checklist

Run top to bottom the day the domain goes live. Everything here is free.

---

## 0. Before you buy the domain

Check the domain has no toxic history — a burned domain inherits penalties.

- https://web.archive.org/ — enter the domain, look for spam/parked/foreign-language history
- Google `site:yourdomain.com` — if pages you didn't publish are indexed, it had a prior life

A clean never-registered domain has no history and no problem. A cheap expired domain with "existing authority" is usually cheap for a reason.

---

## 1. Install robots.txt

Pick ONE:

- **Next.js:** copy `robots.ts` to `app/robots.ts`, set `NEXT_PUBLIC_SITE_URL` in Vercel env vars
- **Anything else:** copy `robots.txt` to `public/robots.txt`, replace `https://example.com`

Never ship both — Next.js will serve the static file and silently ignore `robots.ts`.

**Verify after deploy:**
```bash
curl -s https://yourdomain.com/robots.txt
```
Must return your content, not a 404 and not a framework default.

---

## 2. Vercel-specific gotchas

Vercel does not block AI crawlers by default (unlike Cloudflare), but check these:

- **Deployment Protection** — Settings > Deployment Protection. If "Vercel Authentication" is on for Production, *every crawler gets a login wall* and your site cannot be indexed at all. This is the single most common Vercel indexing bug. Preview deployments should stay protected; production must be public.
- **Firewall / Bot Management** — Settings > Firewall. Confirm no rule challenges or blocks the AI user agents above.
- **`vercel.json` headers** — make sure nothing sets `X-Robots-Tag: noindex` globally. Search it:
  ```bash
  grep -r "noindex" . --include="*.json" --include="*.ts" --include="*.js"
  ```
- **Preview URLs** — `*.vercel.app` previews should carry `noindex` so they don't compete with production for rankings.

**Verify production isn't walled:**
```bash
curl -sI https://yourdomain.com | grep -iE "x-robots-tag|x-vercel-protection|^HTTP"
```
Want: `HTTP/2 200`. Bad: `401`, `403`, or any `x-robots-tag: noindex`.

---

## 3. If you ever put Cloudflare in front

Cloudflare **blocks AI crawlers by default** for new domains as of 2025 — this is the gate that silently costs visibility.

- Dashboard > your domain > **Security > Bots** > check "Block AI Scrapers and Crawlers" is **OFF**
- Dashboard > **Security > WAF** > confirm no managed rule challenges `GPTBot|OAI-SearchBot|PerplexityBot`

**Verify by impersonating a bot:**
```bash
curl -sI -A "OAI-SearchBot/1.0" https://yourdomain.com | head -1
curl -sI -A "PerplexityBot/1.0" https://yourdomain.com | head -1
curl -sI -A "GPTBot/1.1" https://yourdomain.com | head -1
```
All three must return `200`. A `403` means something is blocking them.

---

## 4. Sitemap

Next.js: add `app/sitemap.ts`. Static sites: generate at build.

**Verify:**
```bash
curl -s https://yourdomain.com/sitemap.xml | head -20
```
Every URL must return 200 — a sitemap full of 404s wastes crawl budget.

---

## 5. Google Search Console — do this first, it's the highest-value free thing

1. https://search.google.com/search-console
2. Add property > **Domain** type (covers all subdomains + protocols)
3. Verify via DNS TXT record at your registrar
4. Submit `https://yourdomain.com/sitemap.xml`
5. URL Inspection on your homepage > Request Indexing

Data takes 2-3 days to appear. 16-month history, ~50k page/keyword pairs per day, free forever.

---

## 6. Bing Webmaster Tools

https://www.bing.com/webmasters — import directly from GSC, one click.

Worth it for two reasons: Bing gives keyword volume data Google withholds, and **Bing powers ChatGPT's web index**, so Bing indexing feeds AI visibility.

---

## 7. Unlighthouse audit

Once production is live:

```bash
npx unlighthouse --site https://yourdomain.com
```

No install, no API key, no account. Opens a local dashboard, crawls every page it can discover, scores Performance / Accessibility / Best Practices / SEO.

Fix red items before chasing keywords — technical problems cap everything downstream.

---

## 8. Re-verify after any infra change

Adding a CDN, WAF, or proxy can silently reintroduce bot blocking. Re-run the
section 3 curl checks any time you change what sits in front of the origin.
