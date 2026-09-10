'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/analytics'

export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    track('page_view', { pathname })
  }, [pathname])

  return null
}

export function CategoryViewTracker({ category }: { category: string }) {
  useEffect(() => {
    track('category_view', { category })
  }, [category])

  return null
}

export function ProductViewTracker({ slug, category }: { slug: string; category: string }) {
  useEffect(() => {
    track('product_view', { slug, category })
  }, [slug, category])

  return null
}

export function RecommendationTracker({
  source,
  products,
}: {
  source: string
  products: string[]
}) {
  useEffect(() => {
    track('recommendation_impression', {
      source,
      products: products.join(','),
    })
  }, [products, source])

  return null
}
