# Deploying to Cloudflare Workers

The storefront runs on Cloudflare Workers via the OpenNext adapter. Workers
runs the real Next.js server, so API routes, server actions and the security
headers in `next.config.mjs` all work, unlike static hosting.

## Status

The pipeline is green and the Worker is live at
**https://chappalhouse.sheikhabdullah2240.workers.dev**. Every push to `main`
redeploys it.

Left to do: the environment variables (step 3) and pointing
`chappalhouse.live` at the Worker (step 4). After that, run the go-live
checks (step 5).

## Deploys run in GitHub Actions, not from your machine

The build adapter does not support Windows; its documentation says to use
WSL, a Linux VM, or CI. `.github/workflows/deploy.yml` builds on Linux and
deploys on every push to `main`. Typecheck and the full test suite must pass
before anything ships, and a newer push cancels an in-flight deploy.

You never run a deploy command.

## 1. Create a Cloudflare API token

**Cloudflare dashboard → My Profile → API Tokens → Create Token.** Use the
**Edit Cloudflare Workers** template and pick the account that owns the site
under Account Resources. The token is shown once.

## 2. Put it in GitHub

**GitHub repo → Settings → Secrets and variables → Actions → New repository
secret**: name `CLOUDFLARE_API_TOKEN`, value the token. That is the only
secret the workflow needs.

> **Do not add `CLOUDFLARE_ACCOUNT_ID`.** An early run passed it and failed
> with API error 7003 routing to `/accounts/<id>/workers/services/chappalhouse`.
> The token is scoped to one account, so wrangler resolves the account itself.

Steps 1 and 2 are done. Repeat them only to rotate the token or move
accounts. To deploy by hand: **Actions → Deploy to Cloudflare Workers → Run
workflow**.

## 3. Environment variables

Set every row in [environment.md](environment.md) on the Worker, putting
credentials under Secrets, not Variables. A service role key in a plaintext
variable is the same as publishing it. Then push or re-run the workflow;
values apply only on the next deploy.

## 4. Point the domain at the Worker

`chappalhouse.live` currently serves the GitHub Pages placeholder
(`index.html` and `CNAME` in the repo root).

**If the domain is already on Cloudflare:** Workers & Pages → chappalhouse →
Settings → Domains & Routes → Add → Custom domain. Enter `chappalhouse.live`,
and `www.chappalhouse.live` too if wanted. DNS records and the certificate
are created automatically, usually within minutes.

**If it is not:** Add a site in the dashboard, enter `chappalhouse.live`,
choose Free, set the two nameservers it shows at your registrar, wait for
**Active** (minutes to 24 hours), then do the step above.

**Once `https://chappalhouse.live` serves the Worker**, and not before, clear
**Settings → Pages → Custom domain** in the GitHub repo and delete `CNAME`
and `index.html` from the repo root. Until then `CNAME` is what keeps the
domain on the placeholder.

## 5. Go-live checks

### The shop works

- [ ] Homepage loads, photo rail scrolls
- [ ] Both category pages list products (33 in the current catalog)
- [ ] A product page opens and the size chips respond
- [ ] `nude-braided-slide` and `mint-embroidered-khussa` show the 3D viewer
- [ ] Add to cart, the cart page shows the line
- [ ] Checkout reaches the payment step
- [ ] Padlock shows in the address bar

```bash
curl -sI https://chappalhouse.live | grep -i "x-frame-options\|x-content-type"
```

Both headers must be present. If not, the Worker is not serving the request:
check the custom domain binding.

### Crawlers can reach it

The domain is now on Cloudflare, which **blocks AI crawlers by default** on
new domains. That silently costs visibility in ChatGPT, Perplexity and
Claude answers, which `src/app/robots.ts` explicitly allows.

- Dashboard → the domain → **Security → Bots**: "Block AI Scrapers and
  Crawlers" must be **OFF**.
- **Security → WAF**: no managed rule challenges
  `GPTBot|OAI-SearchBot|PerplexityBot`.

```bash
curl -s https://chappalhouse.live/robots.txt
curl -s https://chappalhouse.live/sitemap.xml | head -20
curl -sI -A "OAI-SearchBot/1.0" https://chappalhouse.live | head -1
curl -sI -A "PerplexityBot/1.0" https://chappalhouse.live | head -1
curl -sI -A "GPTBot/1.1" https://chappalhouse.live | head -1
```

robots and sitemap must return the app's content. All three bot requests
must return `200`; a `403` means something is blocking them. Re-run these
after any change to what sits in front of the Worker (WAF rule, proxy, CDN).

Do not add a `public/robots.txt`: Next.js would serve it and silently ignore
`robots.ts`.

### Search consoles

1. [Google Search Console](https://search.google.com/search-console): add a
   **Domain** property, verify with the DNS TXT record (easy now that DNS is
   on Cloudflare), submit `https://chappalhouse.live/sitemap.xml`, then
   URL Inspection on the homepage → Request Indexing. Data appears in 2–3 days.
2. [Bing Webmaster Tools](https://www.bing.com/webmasters): import from GSC
   in one click. Bing powers ChatGPT's web index.
3. Audit every page, and fix red items before chasing keywords:

   ```bash
   npx unlighthouse --site https://chappalhouse.live
   ```

## Day to day

Push to `main`. If any check fails, nothing ships.

```bash
npm run dev                              # local loop, http://localhost:3000
cd apps/storefront && npx wrangler tail  # live Worker logs, works on Windows
```

`npm run preview` would test against the real Workers runtime, but it runs
the same adapter build that fails on Windows. Use CI, or WSL.

## Cost

The free tier covers 100,000 requests per day with no commercial-use
restriction. That is why this is not Vercel: its Hobby plan forbids
commercial use and paid starts at $20/month.

## If something breaks

- **Products missing, pages 404**: the catalog is imported at build time.
  Redeploy after editing `data/catalog.json`.
- **Checkout fails**: a missing secret. Check every row in
  [environment.md](environment.md), then redeploy.
- **Domain shows the old placeholder**: DNS has not moved, or GitHub Pages
  still holds the custom domain.
- **Build fails on `node:` imports**: `nodejs_compat` must stay in
  `compatibility_flags` in `wrangler.jsonc`.
