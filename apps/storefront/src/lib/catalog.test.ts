import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getProducts } from './catalog'
import { hasModel } from './product'

// Guards the seed file itself. The catalog is hand-edited whenever stock
// arrives, so these check the shape a page depends on rather than any
// particular product: a broken image path or a duplicate slug only shows up
// as a 404 or a silently dropped page otherwise.
describe('catalog seed', () => {
  it('loads every product with the fields a page needs', async () => {
    const products = await getProducts()
    expect(products.length).toBeGreaterThan(0)
    for (const product of products) {
      expect(product.slug, product.name).toMatch(/^[a-z0-9-]+$/)
      expect(product.name.trim(), product.slug).not.toBe('')
      expect(['chappal', 'khussa']).toContain(product.category)
      expect(product.pricePaisa, product.slug).toBeGreaterThan(0)
      expect(product.images.length, product.slug).toBeGreaterThan(0)
    }
  })

  it('has no duplicate slugs', async () => {
    const slugs = (await getProducts()).map((p) => p.slug)
    expect(slugs).toHaveLength(new Set(slugs).size)
  })

  it('keeps sizes sorted and in a wearable range', async () => {
    for (const product of await getProducts()) {
      const sizes = product.variants.map((v) => v.size)
      expect(sizes, product.slug).toEqual([...sizes].sort((a, b) => a - b))
      for (const size of sizes) {
        expect(size, product.slug).toBeGreaterThanOrEqual(35)
        expect(size, product.slug).toBeLessThanOrEqual(45)
      }
    }
  })

  it('points every image at a file that exists', async () => {
    const dir = join(process.cwd(), 'public', 'products')
    const missing: string[] = []
    for (const product of await getProducts()) {
      for (const image of product.images) {
        if (!existsSync(join(dir, `${image}.webp`))) missing.push(`${product.slug}/${image}.webp`)
        if (!existsSync(join(dir, `${image}-thumb.webp`))) missing.push(`${product.slug}/${image}-thumb.webp`)
      }
    }
    expect(missing).toEqual([])
  })

  it('ships a mesh for every product the viewer claims to support', async () => {
    const dir = join(process.cwd(), 'public', 'models')
    const modelled = (await getProducts()).filter((p) => hasModel(p.slug))
    expect(modelled.length).toBeGreaterThan(0)
    for (const product of modelled) {
      expect(existsSync(join(dir, `${product.slug}.glb`)), product.slug).toBe(true)
    }
  })
})
