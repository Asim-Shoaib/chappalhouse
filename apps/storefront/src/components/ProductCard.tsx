'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'
import {
  formatPkr,
  thumbUrl,
  categoryLabel,
  type Product,
} from '@/lib/product'
import { revealItem } from './Reveal'
import { track } from '@/lib/analytics'

export function ProductCard({
  product,
  placement = 'catalog',
  recommendationSource,
}: {
  product: Product
  placement?: 'catalog' | 'recommendation'
  recommendationSource?: string
}) {
  const cover = product.images[0]

  return (
    <motion.div variants={revealItem}>
      <Link
        href={`/product/${product.slug}`}
        className="card"
        onClick={() =>
          track(placement === 'recommendation' ? 'recommendation_click' : 'product_click', {
            slug: product.slug,
            placement,
            source: recommendationSource ?? null,
          })
        }
      >
        <div className="card-frame">
          {cover ? (
            <Image
              src={thumbUrl(cover)}
              alt={`${product.name} — ${categoryLabel(product.category).toLowerCase()} for women`}
              width={600}
              height={750}
              className="card-image"
            />
          ) : (
            <span className="card-placeholder" aria-hidden="true">
              {product.name.charAt(0)}
            </span>
          )}
        </div>
        <p className="card-name">{product.name}</p>
        <div className="card-meta">
          <span className="price">{formatPkr(product.pricePaisa)}</span>
        </div>
      </Link>
    </motion.div>
  )
}
