# Running the storefront locally

## First time

```bash
npm install
node scripts/generate-catalog.mjs      # builds data/catalog.json from the stock sheet
npm run dev                            # http://localhost:3000
```

No Supabase or environment file is needed to see the site. The catalog is read
from `data/catalog.json`, which is generated from `docs/Chappal House.xlsx`.

## After a stock sheet changes

```bash
node scripts/generate-catalog.mjs "docs/batch2.xlsx"
```

Regenerates the seed. Restart `npm run dev` to pick it up.

## Once Supabase exists

Do not paste the SQL files into the SQL Editor. The schema goes in through a
Supabase CLI migration history, and stock is imported once per batch after
the schema is verified. [implementation-plan.md](implementation-plan.md) has
the steps and stop conditions. Copy the values from
[environment.md](environment.md) into `.env.local`.

The stock import is atomic and keyed by `--batch`; rerunning the same batch
does not add stock twice. Once stock is in, `src/lib/catalog.ts` swaps its
file read for a query against `public_products`.

## Tests

```bash
node --test scripts/import-stock.test.mjs
```

Verifies the sheet parser against the real batch 1 file: 23 products, 93 pairs,
18 chappal / 5 khussa. The live catalog has 33 products across both batches. If a future sheet changes shape, these fail loudly rather
than importing wrong stock counts.

## Images

Source HEIC lives in `assets/` and is never served directly. To regenerate:

```bash
node scripts/process-images.mjs        # 111 HEIC -> 222 WebP (full + thumb)
node scripts/verify-image-map.mjs      # checks assignments are valid
node scripts/generate-catalog.mjs      # merges photos into the catalog
```

`data/image-map.json` assigns photos to products by slug, first entry is the
cover. Edit it by hand when new photos arrive, then re-run the last two commands.

`verify-image-map.mjs` fails on an unknown slug, a missing file, or one photo
assigned to two products — run it before committing a map change.

Images are pre-sized, so `next.config.mjs` sets `images.unoptimized`. Re-running
Next's optimizer over already-optimized WebP burns CPU for no gain and makes dev
unusable with a full catalog on screen.

## Server / client boundary

Two modules, deliberately split:

- **`src/lib/product.ts`** — types and pure helpers (`formatPkr`, `imageUrl`,
  `totalStock`). No I/O, so client components may import it.
- **`src/lib/catalog.ts`** — reads `data/catalog.json` from disk. Marked
  `server-only`; importing it from a client component is a build error.

The split exists because `BuyPanel` is a client component that needs
`formatPkr`. Importing that from `catalog.ts` pulled `node:fs/promises` into the
browser bundle and broke every product page with `UnhandledSchemeError`. Keep
pure helpers in `product.ts`, and anything touching disk or the database in
`catalog.ts`.

## What is provisional

- **Prices** — `src/lib/catalog.ts` uses placeholder pricing (Rs 500 chappal,
  Rs 850 khussa). Batch 1 blended landed cost works out near Rs 540/pair, which
  contradicts the quoted Rs 350 chappal / Rs 450 khussa. Confirm against the
  invoice before these go live.
- **Photos** — real batch 1 photos are wired in, but they still need a reshoot
  before launch: a male hand appears in every frame, and competitor branding
  (B.Fit, Stylish Shoes, New Stylo, A.B.R) is legible on the insoles.
- **Two products have no photos** — `white-fancy` and `net` render a letter
  placeholder until shots exist.
- **Checkout** — the cart, `/checkout`, order, Safepay and manual-transfer
  routes are built but inert until the Supabase and Safepay values are set.
  The WhatsApp deep link on product pages works without them. The schema has
  phone OTP tables; the UI does not use them yet.
