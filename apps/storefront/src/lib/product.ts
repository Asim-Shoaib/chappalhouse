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

// Availability is deliberately not modelled on the storefront. Restocking a
// size takes a day or two, so a "sold out" badge turns a short wait into a
// lost sale — the buyer leaves instead of asking. Every listed size is
// orderable, and a genuine gap is handled in the WhatsApp conversation.
//
// `stockQty` stays on the type because the ledger in packages/db still tracks
// real counts for reordering. Nothing in the storefront reads it to decide
// what a customer may buy.

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
