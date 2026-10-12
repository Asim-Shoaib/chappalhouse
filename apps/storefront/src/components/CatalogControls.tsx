'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ProductCard } from './ProductCard'
import { CardGrid } from './CatalogMotion'
import { Select } from './ui/Select'
import { track } from '@/lib/analytics'
import type { Product } from '@/lib/product'

const EASE = [0.32, 0.72, 0, 1] as const

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
]

/**
 * Size filter and sort over the category's products. Cells slide to their new
 * place (motion/react layout, transform only), removed cells fold back off the
 * board, and new ones land through CardGrid like every other card.
 */
export function CatalogControls({ products }: { products: Product[] }) {
  const still = useReducedMotion()
  const [size, setSize] = useState('all')
  const [sort, setSort] = useState('featured')

  const sizes = useMemo(
    () => Array.from(new Set(products.flatMap((product) => product.variants.map((v) => v.size)))).sort(),
    [products],
  )

  const visible = useMemo(() => {
    const filtered = products.filter(
      (product) => size === 'all' || product.variants.some((variant) => String(variant.size) === size),
    )
    return [...filtered].sort((a, b) => {
      if (sort === 'price-low') return a.pricePaisa - b.pricePaisa
      if (sort === 'price-high') return b.pricePaisa - a.pricePaisa
      return products.indexOf(a) - products.indexOf(b)
    })
  }, [products, size, sort])

  const onChange = (kind: 'size' | 'sort', value: string) => {
    if (kind === 'size') setSize(value)
    else setSort(value)
    track('catalog_filter', { kind, value })
  }

  return (
    <>
      <div className="catalog-controls" role="region" aria-label="Filter and sort products">
        <Select
          label="Size"
          value={size}
          options={[
            { value: 'all', label: 'All sizes' },
            ...sizes.map((value) => ({ value: String(value), label: String(value) })),
          ]}
          onChange={(value) => onChange('size', value)}
        />
        <Select label="Sort" value={sort} options={SORTS} onChange={(value) => onChange('sort', value)} />
        <p className="catalog-result-count" aria-live="polite">{visible.length} designs</p>
      </div>
      <CardGrid className="catalog-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((product) => (
            <motion.div
              key={product.slug}
              className="pcard-cell"
              layout={still ? false : 'position'}
              initial={false}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              exit={still ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, rotateX: 80, y: -10 }}
              transition={{ duration: 0.28, ease: EASE, layout: { duration: 0.45, ease: EASE } }}
              style={{ transformOrigin: '50% 0', transformPerspective: 900 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </AnimatePresence>
      </CardGrid>
      {visible.length === 0 && (
        <div className="empty-state">
          <h2>No pairs in that size</h2>
          <p>Try another size or browse the full collection.</p>
          <button type="button" className="button button-quiet" onClick={() => setSize('all')}>Show all sizes</button>
        </div>
      )}
    </>
  )
}
