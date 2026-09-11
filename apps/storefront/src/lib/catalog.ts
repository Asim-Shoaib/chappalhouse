import 'server-only'

// Imported rather than read from disk at request time. The storefront runs on
// Cloudflare Workers, which has no filesystem and no meaningful cwd, so a
// readFile here returned an empty catalog and every product page 404'd. As a
// static import the seed is bundled at build time, which also removes a file
// read from the hot path.
import seed from '@root/data/catalog.json'
import type { Category, Product } from './product'

export type { Category, Variant, Product } from './product'
export {
  formatPkr,
  imageUrl,
  thumbUrl,
  categoryLabel,
} from './product'

// RETAIL prices — what the customer pays. Not landed cost.
//
// Chappal was previously set to 50000 (Rs 500), which is the *cost* per pair,
// so every chappal was listed at break-even. Rs 500 retail against a ~350-540
// landed cost leaves too little to absorb Pakistan's 18-20% COD return rate:
// one refused parcel wipes out the margin on several delivered ones.
//
// Rs 650 chappal is Abdullah's call — competitive against Instagram sellers and
// comfortably under the Rs 1000 impulse threshold. Margin is thin at the top of
// the cost range: if chappals really land at 540, a 20% return rate leaves
// close to nothing, so the batch 1 invoice needs checking before scaling spend.
// Khussa at Rs 850 matches the quoted retail.
const RETAIL_PRICE_PAISA: Record<Category, number> = {
  chappal: 65000,
  khussa: 85000,
}

const DISPLAY_NAMES: Record<string, string> = {
  'white-fancy': 'White Fancy',
  'blusih-grey-sandal': 'Bluish Grey Sandal',
  pink: 'Pink Embroidered Khussa',
  white: 'White Embroidered Khussa',
  classic: 'Classic Khussa',
  net: 'Net Khussa',
  mahroon: 'Maroon Khussa',
}

type SeedProduct = {
  name: string
  slug: string
  category: Category
  counts: Record<string, number>
  total: number
  images?: string[]
}

/**
 * Serves the catalog from the generated seed so the storefront runs before
 * Supabase is provisioned. Once the database is live this is replaced by a
 * query against `public_products`.
 *
 * Async because callers await it and the Supabase version will genuinely be
 * async; the seed itself is already in memory.
 */
export async function getProducts(): Promise<Product[]> {
  // Through `unknown`: tsc infers a literal type per entry from the JSON, so
  // each product's `counts` carries only the sizes that product happens to
  // stock. That union does not overlap Record<string, number> structurally,
  // even though the data is exactly right.
  return (seed as unknown as SeedProduct[]).map((p) => ({
    slug: p.slug,
    name: DISPLAY_NAMES[p.slug] ?? p.name,
    category: p.category,
    pricePaisa: RETAIL_PRICE_PAISA[p.category],
    variants: Object.entries(p.counts)
      .map(([size, stockQty]) => ({ size: Number(size), stockQty }))
      .sort((a, b) => a.size - b.size),
    images: p.images ?? [],
  }))
}

export async function getProduct(slug: string): Promise<Product | null> {
  const products = await getProducts()
  return products.find((p) => p.slug === slug) ?? null
}
