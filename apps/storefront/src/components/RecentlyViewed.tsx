'use client'

import { useEffect, useState } from 'react'
import { ProductCard } from './ProductCard'
import type { Product } from '@/lib/product'

const key = 'chappal_recently_viewed'

export function RecentlyViewed({ products, currentSlug }: { products: Product[]; currentSlug: string }) {
  const [slugs, setSlugs] = useState<string[]>([])

  useEffect(() => {
    const previous = JSON.parse(localStorage.getItem(key) ?? '[]') as string[]
    setSlugs(previous.filter((slug) => slug !== currentSlug).slice(0, 4))
    localStorage.setItem(key, JSON.stringify([currentSlug, ...previous.filter((slug) => slug !== currentSlug)].slice(0, 8)))
  }, [currentSlug])

  const viewed = slugs.map((slug) => products.find((product) => product.slug === slug)).filter(Boolean) as Product[]
  if (viewed.length === 0) return null

  return (
    <section className="section recently-viewed" aria-labelledby="recently-viewed-title">
      <div className="section-head"><h2 id="recently-viewed-title">Recently viewed</h2></div>
      <div className="grid">{viewed.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
    </section>
  )
}
