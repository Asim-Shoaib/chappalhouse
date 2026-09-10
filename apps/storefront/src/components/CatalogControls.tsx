'use client'

import { useMemo, useState } from 'react'
import { ProductCard } from './ProductCard'
import { track } from '@/lib/analytics'
import type { Product } from '@/lib/product'

export function CatalogControls({ products }: { products: Product[] }) {
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
        <label>
          <span>Size</span>
          <select value={size} onChange={(event) => onChange('size', event.target.value)}>
            <option value="all">All sizes</option>
            {sizes.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select value={sort} onChange={(event) => onChange('sort', event.target.value)}>
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </label>
        <p className="catalog-result-count" aria-live="polite">{visible.length} designs</p>
      </div>
      {visible.length > 0 ? (
        <div className="grid">
          {visible.map((product) => <ProductCard key={product.slug} product={product} />)}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No pairs in that size</h2>
          <p>Try another size or browse the full collection.</p>
          <button type="button" className="button button-quiet" onClick={() => setSize('all')}>Show all sizes</button>
        </div>
      )}
    </>
  )
}
