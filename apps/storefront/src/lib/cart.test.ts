import { describe, expect, it } from 'vitest'
import { parseCart, reconcileCart, serializeCart } from './cart'
import type { Product } from './product'

const products: Product[] = [{ slug: 'bow-pink', name: 'Bow Pink', category: 'chappal', pricePaisa: 65000, variants: [{ size: 37, stockQty: 2 }, { size: 38, stockQty: 0 }], images: [] }]

describe('cart', () => {
  it('round trips versioned cart data', () => {
    const items = [{ slug: 'bow-pink', size: 37, quantity: 2 }]
    expect(parseCart(serializeCart(items))).toEqual(items)
  })

  it('recovers from malformed storage', () => {
    expect(parseCart('{broken')).toEqual([])
    expect(parseCart(JSON.stringify({ version: 2, items: [] }))).toEqual([])
  })

  it('caps quantities at the per-line maximum', () => {
    expect(reconcileCart([
      { slug: 'bow-pink', size: 37, quantity: 9 },
    ], products)).toMatchObject([{ slug: 'bow-pink', size: 37, quantity: 5, maxQuantity: 5 }])
  })

  it('keeps a listed size regardless of its recorded count', () => {
    expect(reconcileCart([
      { slug: 'bow-pink', size: 38, quantity: 1 },
    ], products)).toMatchObject([{ slug: 'bow-pink', size: 38, quantity: 1 }])
  })

  it('drops a line whose size is not listed', () => {
    expect(reconcileCart([
      { slug: 'bow-pink', size: 41, quantity: 1 },
    ], products)).toEqual([])
  })
})
