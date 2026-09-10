// Shared product types and pure helpers. No filesystem or database access, so
// this is safe to import from client components — unlike catalog.ts, which
// reads from disk and must stay server-only.

export type Category = 'chappal' | 'khussa'

export type Variant = {
  size: number
  stockQty: number
}

export type Product = {
  slug: string
  name: string
  category: Category
  pricePaisa: number
  variants: Variant[]
  images: string[]
}

export const formatPkr = (paisa: number) =>
  `Rs ${Math.round(paisa / 100).toLocaleString('en-PK')}`

export const imageUrl = (name: string) => `/products/${name}.webp`
export const thumbUrl = (name: string) => `/products/${name}-thumb.webp`

// Availability is not modelled on the storefront. Restocking a size takes a
// day or two, so a "sold out" badge turns a short wait into a lost sale — the
// buyer leaves instead of asking. Every listed size is orderable, and the
// WhatsApp sizing conversation is where a genuine gap gets handled.
//
// `stockQty` stays on the type: checkout and the cart still reserve against
// real numbers once Supabase is live. This is a display decision, not an
// inventory one.
export const inStock = (_p: Product) => true

export const totalStock = (p: Product) =>
  p.variants.reduce((sum, v) => sum + v.stockQty, 0)

export const categoryLabel = (c: Category) =>
  c === 'khussa' ? 'Khussa' : 'Chappal'

// Products with a verified 3D mesh. Meshes are generated from the batch-2
// photos and reviewed by eye before being listed here — a reconstruction that
// warps the shoe is worse for a buyer than no 3D view at all, so this stays a
// hand-maintained allowlist rather than a directory scan.
const MODEL_SLUGS = new Set([
  'nude-braided-slide',
  'mint-embroidered-khussa',
])

export const hasModel = (slug: string) => MODEL_SLUGS.has(slug)
