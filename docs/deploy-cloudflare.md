# Deploying to Cloudflare Workers

The storefront runs on Cloudflare Workers via the OpenNext adapter. Workers
runs the real Next.js server, so API routes, server actions and the security
headers in `next.config.mjs` all work — unlike static hosting, which cannot
run any of them.

Everything in the repo is already configured. What follows is the part that
needs your Cloudflare account and your domain.

---

## Before you start

You need:

- The Cloudflare account that will own the site
- `chappalhouse.live` — currently pointed at GitHub Pages, we move it here
- The real payment account numbers (Easypaisa, JazzCash, bank IBAN)

Roughly 30 minutes, most of it waiting for DNS.

---

## Deploys run in GitHub Actions, not from your machine

The build adapter does not support Windows. Its own documentation says to use
WSL, a Linux VM, or CI. We use CI: `.github/workflows/deploy.yml` builds on
Linux and deploys on every push to `main`.

This is better anyway — the deploy is reproducible, and typecheck plus the
full test suite have to pass before anything ships.

You will not run a deploy command. You set two secrets once, and pushes to
`main` deploy themselves.

---

### Status: deployed

Steps 1 and 2 are done — the token and secret are in place and the pipeline
is green end to end. The Worker is live at:

**https://chappalhouse.sheikhabdullah2240.workers.dev**

Every push to `main` redeploys it. Steps 1 and 2 are kept below for when the
token is rotated or the site moves to another account.

What is left: the environment variables in step 4, and pointing
`chappalhouse.live` at the Worker in step 5.

> **On `CLOUDFLARE_ACCOUNT_ID`:** an early run failed with API error 7003
> routing to `/accounts/<id>/workers/services/chappalhouse`. The workflow no
> longer passes an account id at all — the token is scoped to one account, so
> wrangler resolves it. Do not add the variable back.

---

## 1. Create a Cloudflare API token

**Cloudflare dashboard → My Profile → API Tokens → Create Token**

Use the **Edit Cloudflare Workers** template. Under Account Resources pick the
account that will own the site. Create it and copy the token — it is shown
once.

You also need your Account ID: it is on the right-hand side of the
**Workers & Pages** overview page.

---

## 2. Put both in GitHub

**GitHub repo → Settings → Secrets and variables → Actions → New repository
secret**

| Secret name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | your account ID |

Names must match exactly — the workflow reads them by name.

---

## 3. First deploy

Push to `main`, or go to **Actions → Deploy to Cloudflare Workers → Run
workflow** to trigger it by hand.

Watch it in the Actions tab. It typechecks, runs the tests, builds, and
deploys. First run takes a few minutes.

When it finishes, the Worker is live at
`https://chappalhouse.<your-subdomain>.workers.dev`. Open it — all 33 products
should be there.

Checkout will not work yet. That needs the environment variables in step 4.

---

## 3. Environment variables

Two kinds, and the distinction matters:

- **Variables** are stored in plaintext and visible to anyone with dashboard
  access.
- **Secrets** are encrypted and cannot be read back after saving.

Put every credential in Secrets. A service role key in a plaintext variable is
the same as publishing it.

### In the dashboard

**Workers & Pages → chappalhouse → Settings → Variables and Secrets**

Add these as **Variables** (plaintext):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://chappalhouse.live` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | your WhatsApp number, digits only, with country code (e.g. `923001234567`) |
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `SAFEPAY_ENVIRONMENT` | `sandbox` until you go live, then `production` |
| `SHIPPING_FEE_PAISA` | `25000` (Rs 250) |
| `MANUAL_PAYMENT_ACCOUNT_NAME` | account holder name |
| `MANUAL_PAYMENT_EASYPAISA` | Easypaisa number |
| `MANUAL_PAYMENT_JAZZCASH` | JazzCash number |
| `MANUAL_PAYMENT_BANK_NAME` | bank name |
| `MANUAL_PAYMENT_BANK_IBAN` | IBAN |

Add these as **Secrets** (encrypted):

| Name | Where it comes from |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | same page. Bypasses all row-level security — treat like a root password |
| `SAFEPAY_API_KEY` | Safepay dashboard |
| `SAFEPAY_SECRET_KEY` | Safepay dashboard |
| `SAFEPAY_WEBHOOK_SECRET` | Safepay dashboard, webhook settings |
| `RECEIPT_TOKEN_SECRET` | generate one (below). Signs receipt links |
| `CRON_SECRET` | generate one. Guards the internal cleanup endpoint |
| `ANALYTICS_DASHBOARD_TOKEN` | generate one. Gates `/admin/analytics` |

To generate the three you invent yourself, run this three times and use a
different output for each:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep them somewhere safe — a password manager, not a text file. You cannot
read a secret back out of Cloudflare after saving it.

### Then redeploy

Variables only take effect on the next deploy. Push any commit to `main`, or
re-run the workflow from the Actions tab.

---

## 4. Point the domain at the Worker

`chappalhouse.live` currently serves the GitHub Pages placeholder. This moves
it.

### If the domain is already on Cloudflare

**Workers & Pages → chappalhouse → Settings → Domains & Routes → Add →
Custom domain**

Enter `chappalhouse.live`. Add `www.chappalhouse.live` the same way if you
want both. Cloudflare creates the DNS records and issues the certificate
automatically — usually a few minutes.

### If the domain is not on Cloudflare yet

1. **Add a site** in the Cloudflare dashboard, enter `chappalhouse.live`,
   choose the Free plan.
2. Cloudflare shows two nameservers. Set those at your registrar, replacing
   what is there. Propagation takes anywhere from minutes to 24 hours.
3. Once the domain shows **Active**, follow the steps above.

### After it resolves

Remove the old GitHub Pages binding so the two do not fight:

- In the `chappalhouse` GitHub repo: **Settings → Pages → Custom domain** —
  clear the field.
- Delete the `CNAME` file from the repo root.

Do this only after `https://chappalhouse.live` is serving the Worker. Until
then `CNAME` is what keeps the domain attached to the current placeholder.

---

## 5. Verify

Open `https://chappalhouse.live` and check:

- [ ] Homepage loads, photo rail scrolls
- [ ] Both category pages list products
- [ ] A product page opens and the size chips respond
- [ ] The two products with 3D (`nude-braided-slide`,
      `mint-embroidered-khussa`) show the viewer
- [ ] Add to cart, then the cart page shows the line
- [ ] Checkout reaches the payment step
- [ ] Padlock shows in the address bar

Check the headers are being applied:

```bash
curl -sI https://chappalhouse.live | grep -i "x-frame-options\|x-content-type"
```

Both should be present. If they are missing, the Worker is not serving the
request — check the custom domain binding.

---

## Day to day

Push to `main`. The workflow typechecks, tests, builds and deploys. If any
check fails, nothing ships.

```bash
npm run dev --workspace=apps/storefront
```

is still the local loop for building features.

`npm run preview` would test against the real Workers runtime, but it runs the
same adapter build that does not work on Windows — use CI, or WSL if you want
it locally.

Live logs from the deployed Worker:

```bash
cd apps/storefront && npx wrangler tail
```

That works on Windows; only the build step does not.

---

## Cost

The free tier covers 100,000 requests per day. A shop doing a few hundred
orders a month will not approach that. There is no commercial-use restriction
on the Workers free tier, which is why this is not Vercel — their Hobby plan
forbids commercial use and the paid tier starts at $20/month.

---

## If something breaks

**Products missing, pages 404** — the catalog seed is imported at build time.
Rebuild and redeploy after editing `data/catalog.json`.

**Checkout fails** — a missing secret. Check every row in the Secrets table
above, then redeploy. Secrets added after a deploy do not apply until the next
one.

**Domain shows the old placeholder** — DNS has not moved yet, or GitHub Pages
still holds the custom domain. Clear it in the repo settings.

**Build fails on `node:` imports** — `nodejs_compat` must be in
`compatibility_flags` in `wrangler.jsonc`. It is set; do not remove it.
