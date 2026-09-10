import { describe, expect, it } from 'vitest'
import { recommendProducts } from './recommendations'
import type { Product } from './product'

const make = (over: Partial<Product> & Pick<Product, 'slug'>): Product => ({
  name: over.slug,
  category: 'chappal',
  pricePaisa: 65000,
  variants: [{ size: 38, stockQty: 1 }],
  images: ['img_1'],
  ...over,
})

const current = make({ slug: 'current', category: 'khussa', pricePaisa: 85000 })

describe('recommendProducts', () => {
  it('never recommends the product being viewed', () => {
    const out = recommendProducts([current, make({ slug: 'other' })], current)
    expect(out.map((p) => p.slug)).toEqual(['other'])
  })

  it('recommends a product whose recorded count is zero', () => {
    const empty = make({ slug: 'empty', variants: [{ size: 38, stockQty: 0 }] })
    expect(recommendProducts([current, empty], current).map((p) => p.slug)).toEqual(['empty'])
  })

  it('ranks same category above a near price match', () => {
    const sameCategory = make({ slug: 'khussa-pick', category: 'khussa', pricePaisa: 40000 })
    const nearPrice = make({ slug: 'chappal-pick', pricePaisa: 85000 })
    const out = recommendProducts([current, nearPrice, sameCategory], current)
    expect(out.map((p) => p.slug)).toEqual(['khussa-pick', 'chappal-pick'])
  })

  it('honours the limit', () => {
    const many = Array.from({ length: 8 }, (_, i) => make({ slug: `p${i}` }))
    expect(recommendProducts([current, ...many], current)).toHaveLength(4)
  })

  it('breaks score ties by name so the order is stable', () => {
    const b = make({ slug: 'b-slug', name: 'Beta' })
    const a = make({ slug: 'a-slug', name: 'Alpha' })
    expect(recommendProducts([current, b, a], current).map((p) => p.name)).toEqual(['Alpha', 'Beta'])
  })
})
