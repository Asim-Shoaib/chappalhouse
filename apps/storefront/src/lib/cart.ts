import type { Product } from './product'

export const CART_STORAGE_KEY = 'chappal_cart'
export const CART_VERSION = 1
export const MAX_CART_QUANTITY = 5
export const DEFAULT_SHIPPING_FEE_PAISA = 25000

export type CartItem = {
  slug: string
  size: number
  quantity: number
}

export type ReconciledCartItem = CartItem & {
  product: Product
  maxQuantity: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseCart(raw: string | null): CartItem[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || value.version !== CART_VERSION || !Array.isArray(value.items)) return []

    const items: CartItem[] = []
    for (const candidate of value.items.slice(0, 8)) {
      if (!isRecord(candidate)) continue
      const slug = typeof candidate.slug === 'string' ? candidate.slug.trim() : ''
      const size = candidate.size
      const quantity = candidate.quantity
      if (!slug || slug.length > 120 || !Number.isInteger(size) || !Number.isInteger(quantity)) continue
      if ((size as number) < 35 || (size as number) > 45 || (quantity as number) < 1) continue

      const existing = items.find((item) => item.slug === slug && item.size === size)
      if (existing) existing.quantity = Math.min(existing.quantity + (quantity as number), MAX_CART_QUANTITY)
      else items.push({ slug, size: size as number, quantity: Math.min(quantity as number, MAX_CART_QUANTITY) })
    }
    return items
  } catch {
    return []
  }
}

export function serializeCart(items: readonly CartItem[]) {
  return JSON.stringify({
    version: CART_VERSION,
    items: items.map(({ slug, size, quantity }) => ({ slug, size, quantity })),
  })
}

export function reconcileCart(items: readonly CartItem[], products: readonly Product[]): ReconciledCartItem[] {
  const bySlug = new Map(products.map((product) => [product.slug, product]))
  return items.flatMap((item) => {
    const product = bySlug.get(item.slug)
    const variant = product?.variants.find(({ size }) => size === item.size)
    // A size that is listed can be ordered. Restocking is quick enough that a
    // zero count is not a reason to silently drop the line — see the note on
    // `inStock` in lib/product.ts.
    if (!product || !variant) return []
    const maxQuantity = MAX_CART_QUANTITY
    return [{ ...item, quantity: Math.min(item.quantity, maxQuantity), product, maxQuantity }]
  })
}

export function shippingFeePaisa(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return DEFAULT_SHIPPING_FEE_PAISA
  const fee = Number(value)
  return Number.isSafeInteger(fee) ? fee : DEFAULT_SHIPPING_FEE_PAISA
}
