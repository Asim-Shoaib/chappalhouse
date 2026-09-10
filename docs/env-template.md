# Environment variables

Create `.env.local` in the repo root with these keys. Never commit it.

```bash
# --- Supabase ---
# URL and anon key are safe in the browser; RLS is what protects the data.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Service role key bypasses ALL row level security. Server-side only.
# Never prefix it with NEXT_PUBLIC_ and never import it into a client component.
SUPABASE_SERVICE_ROLE_KEY=

# --- Site ---
NEXT_PUBLIC_SITE_URL=https://thechappalhouse.com
SHIPPING_FEE_PAISA=25000
# At least 32 random characters. Protects private receipt browser sessions.
RECEIPT_TOKEN_SECRET=

# --- Safepay hosted checkout ---
SAFEPAY_ENVIRONMENT=sandbox
SAFEPAY_SECRET_KEY=
SAFEPAY_API_KEY=
SAFEPAY_WEBHOOK_SECRET=
# --- Manual payment (Easypaisa / JazzCash / bank transfer) ---
# No merchant account or NTN needed. Leave every value blank to hide the option
# at checkout. The holder name is shared by all three so a buyer can confirm who
# they are paying before sending.
MANUAL_PAYMENT_ACCOUNT_NAME=
MANUAL_PAYMENT_EASYPAISA=
MANUAL_PAYMENT_JAZZCASH=
MANUAL_PAYMENT_BANK_NAME=
MANUAL_PAYMENT_BANK_IBAN=

# Protects the reservation cleanup endpoint used by a deployment cron.
CRON_SECRET=

# --- WhatsApp ---
# Business number, international format, digits only, no + or spaces.
NEXT_PUBLIC_WHATSAPP_NUMBER=92XXXXXXXXXX

# --- Manual payment (launch method, 0% fees) ---
NEXT_PUBLIC_BANK_NAME=
NEXT_PUBLIC_BANK_ACCOUNT_TITLE=
NEXT_PUBLIC_BANK_IBAN=
NEXT_PUBLIC_EASYPAISA_NUMBER=

# --- SMS / OTP order verification ---
# Provider TBD. WhatsApp OTP gets ~98% open rate vs ~70% for SMS.
SMS_API_KEY=
SMS_SENDER_ID=

# --- Analytics ---
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_META_PIXEL_ID=

# --- Private analytics dashboard ---
ANALYTICS_DASHBOARD_TOKEN=
```

## Where each value comes from

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page, `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, `service_role` key — treat as a password |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | the business WhatsApp line |
| Bank / Easypaisa | whichever account receives manual transfers |
| `SMS_API_KEY` | SMS provider, once chosen |

Set the same keys in Vercel under Project Settings > Environment Variables before
the first production deploy.
