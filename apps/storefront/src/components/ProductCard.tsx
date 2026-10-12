'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import {
  imageUrl,
  thumbUrl,
  categoryLabel,
  type Product,
} from '@/lib/product'
import { track } from '@/lib/analytics'
import { Branch, rndFor } from './Branch'
import { PriceTag } from './ui/PriceTag'
import { SizeChips } from './ui/SizeChips'
import '@/styles/catalog.css'

/**
 * A pair as a print pinned to the board, the homepage exhibit at grid size: the
 * whole photo on a paper mat, tape, a hard shadow and a rest tilt (seeded per
 * slug), a cut-paper sprig beside it (.pcard-flip puts it on the left), then
 * the name, the price tag and the size stamps.
 * Lives in a CardGrid (CatalogMotion.tsx), which lands it; node owners are
 * listed there. Look: styles/catalog.css.
 *
 * prefetch is off: a grid of cards prefetching every product page is more
 * than the Worker should take at once.
 */
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
  // Rest pose seeded by the slug, so a print keeps its tilt, tape and sprig side wherever a filter moves it.
  const rnd = rndFor(product.slug)
  const flip = rnd() < 0.5
  const pose = {
    '--tilt': `${((flip ? 1 : -1) * rnd(0.6, 1.6)).toFixed(2)}deg`,
    '--tape': `${((flip ? -1 : 1) * rnd(2, 3.5)).toFixed(2)}deg`,
  } as CSSProperties

  return (
    <article className={flip ? 'pcard pcard-flip' : 'pcard'} style={pose}>
      <Link
        href={`/product/${product.slug}`}
        prefetch={false}
        className="pcard-link"
        onClick={() =>
          track(placement === 'recommendation' ? 'recommendation_click' : 'product_click', {
            slug: product.slug,
            placement,
            source: recommendationSource ?? null,
          })
        }
      >
        <div className="pcard-stage">
          <Branch seed={product.slug} kind="sprig" />
          <div className="pcard-lift">
            <div className="pcard-frame">
              <i className="pcard-shadow" aria-hidden="true" />
              <span className="pcard-face">
                {cover ? (
                  // Plain img: images are unoptimized, so next/image would not emit a srcset; this one picks the 600 or 1400 file
                  <img
                    src={thumbUrl(cover)}
                    srcSet={`${thumbUrl(cover)} 600w, ${imageUrl(cover)} 1400w`}
                    sizes="(min-width: 1100px) 22vw, (min-width: 700px) 28vw, 42vw"
                    width={600}
                    height={800}
                    loading="lazy"
                    decoding="async"
                    alt={`${product.name} — ${categoryLabel(product.category).toLowerCase()} for women`}
                  />
                ) : (
                  <span className="card-placeholder" aria-hidden="true">
                    {product.name.charAt(0)}
                  </span>
                )}
              </span>
              <i className="pcard-tape" aria-hidden="true" />
            </div>
          </div>
        </div>
        <p className="pcard-name">{product.name}</p>
        <div className="pcard-meta">
          <PriceTag paisa={product.pricePaisa} size="sm" />
          <SizeChips sizes={product.variants.map((v) => v.size)} size="sm" />
        </div>
      </Link>
    </article>
  )
}
