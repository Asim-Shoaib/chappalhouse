'use client'

import Link from 'next/link'
import { thumbUrl, type Product } from '@/lib/product'
import { track } from '@/lib/analytics'
import { Branch } from './Branch'

/**
 * The hero board: real stock pinned up as taped prints, each at its own rest
 * angle, overlapping, with cut-paper branches weaving between and behind
 * them. Every photo is shown whole (3:4 frame, object-fit: contain on the
 * photo mat), so no shoe is cropped. Slot positions, sizes, angles and
 * stacking are CSS (.cl-1 to .cl-8 in styles/home.css), so the board is
 * complete without JS.
 *
 * Node owners:
 *   .collage     desktop scroll exit (y, rotation)         HomeMotion heroExit
 *   .cl-drift    cursor drift at its own depth (x, y)      HomeMotion fine pointer
 *   .cl-deal     dealt onto the board (x, y, rot, opacity) HomeMotion heroIntro
 *   .cl-frame    rest angle (CSS --r), hover lift (CSS)
 *   .cl-face     steps onto its shadow (x, y)              HomeMotion heroIntro
 *   .cl-shadow   shadow appears (opacity)                  HomeMotion heroIntro
 *   .cl-tape     tape goes on (opacity, scale, rotation)   HomeMotion heroIntro
 *   .stem, .leaf-grow inside .branch                       HomeMotion heroIntro
 */
export function HeroCollage({ items }: { items: { product: Product; image: string; alt: string }[] }) {
  return (
    <div className="collage">
      <Branch seed="hero-a" kind="main" className="cl-branch cl-branch-a" />
      <Branch seed="hero-b" kind="sprig" className="cl-branch cl-branch-b" />
      <Branch seed="hero-c" kind="main" className="cl-branch cl-branch-c" />
      {items.map(({ product, image, alt }, i) => (
        <Link
          key={product.slug}
          href={`/product/${product.slug}`}
          prefetch={false}
          className={`cl-item cl-${i + 1}`}
          onClick={() => track('product_click', { slug: product.slug, placement: 'hero', source: null })}
        >
          <span className="cl-drift">
            <span className="cl-deal">
              <span className="cl-frame">
                <i className="cl-shadow" aria-hidden="true" />
                <span className="cl-face">
                  <img
                    src={thumbUrl(image)}
                    width={600}
                    height={800}
                    alt={alt}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : undefined}
                    decoding="async"
                  />
                </span>
                <i className="cl-tape" aria-hidden="true" />
              </span>
            </span>
          </span>
        </Link>
      ))}
    </div>
  )
}
