# Environment variables

The single list of every variable the code reads. Locally they go in
`.env.local` in the repo root (never commit it). In production they go on the
Worker: **Workers & Pages → chappalhouse → Settings → Variables and Secrets**.

The site runs without any of them: the catalog is read from
`data/catalog.json`. Checkout, payments, receipts and the analytics dashboard
need the Supabase and Safepay values.

## Variables (plaintext on the Worker)

Anyone with dashboard access can read these. Nothing secret goes here.

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://chappalhouse.live`. Also the fallback in code, so sitemap and robots never point elsewhere |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | business number, digits only with country code, e.g. `923001234567` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `SAFEPAY_ENVIRONMENT` | `sandbox` until live, then `production` |
| `SHIPPING_FEE_PAISA` | `25000` (Rs 250). Also the default when unset |
| `MANUAL_PAYMENT_ACCOUNT_NAME` | account holder name, shared by all three methods so a buyer can confirm who they pay |
| `MANUAL_PAYMENT_EASYPAISA` | Easypaisa number |
| `MANUAL_PAYMENT_JAZZCASH` | JazzCash number |
| `MANUAL_PAYMENT_BANK_NAME` | bank name |
| `MANUAL_PAYMENT_BANK_IBAN` | IBAN |

Leave every `MANUAL_PAYMENT_*` blank to hide manual transfer at checkout.

## Secrets (encrypted on the Worker)

Cannot be read back after saving. Keep a copy in a password manager.

| Name | Source |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API. Bypasses all row-level security. Server-side only, never `NEXT_PUBLIC_` |
| `SAFEPAY_API_KEY` | Safepay dashboard |
| `SAFEPAY_SECRET_KEY` | Safepay dashboard |
| `SAFEPAY_WEBHOOK_SECRET` | Safepay dashboard, webhook settings |
| `RECEIPT_TOKEN_SECRET` | generate. Signs receipt links |
| `CRON_SECRET` | generate. Guards `/api/internal/release-reservations` |
| `ANALYTICS_DASHBOARD_TOKEN` | generate. Gates `/admin/analytics` |

Generate each of the last three separately:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`robots.ts` disallows `/admin/`, but that only asks crawlers to stay out. The
token is what actually protects the dashboard.

Variables and secrets take effect on the next deploy. Push to `main` or re-run
the workflow after changing them.

## Local only

| Name | Used by |
|---|---|
| `SUPABASE_URL` | `scripts/import-stock.mjs`. Same value as `NEXT_PUBLIC_SUPABASE_URL`. The Worker does not read it |

The stock importer also needs `SUPABASE_SERVICE_ROLE_KEY` in the shell that runs it.
