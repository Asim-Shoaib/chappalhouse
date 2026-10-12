'use client'

import Link from 'next/link'
import { imageUrl, thumbUrl, categoryLabel, type Product } from '@/lib/product'
import { track } from '@/lib/analytics'
import { Branch } from './Branch'
import { PriceTag } from './ui/PriceTag'
import { SizeChips } from './ui/SizeChips'

/**
 * Homepage showcase: every pair gets its own framed portrait, a cut-paper
 * branch beside it (on the side the homepage tree runs, which joins its top)
 * and a short sprig on the other side. The photo is shown whole (object-fit:
 * contain in a 3:4 frame, which is the photos' own shape), so a phone never
 * crops the shoe. The plate carries the name, the price as a swing tag and
 * the sizes as stitched stamps.
 *
 * Static and complete without JS. HomeMotion draws the branches, opens the
 * leaves and presents each frame as it crosses the screen. Node owners:
 *   .exhibit-lift   scroll scrub (y, rotation, scale)   HomeMotion exhibits
 *   .exhibit-frame  rest tilt (CSS --tilt)
 *   .frame-face     hover lift (CSS)
 *   .ex-tape        tape goes on (opacity, scale)        HomeMotion exhibits
 *   .stem           stroke draw (stroke-dashoffset)      HomeMotion exhibits (driven by the tree)
 *   .leaf-grow      leaf opens (scale, rotation)         HomeMotion exhibits (driven by the tree)
 *   .leaf-sway      breeze (CSS animation, .live only)
 *   .exhibit-plate h3  lands (opacity, y)                HomeMotion exhibits
 *   .price-tag      swings in on its string (rotation, opacity)
 *   .size-stamp     presses on (scale, opacity)
 * data-seed lets the tree find the top of the main branch (the same seeded stem).
 */

export function Showcase({ products }: { products: Product[] }) {
  return (
    <ol className="exhibits">
      {products.map((p) => {
        const cover = p.images[0]
        return (
          <li key={p.slug} className="exhibit" data-seed={p.slug}>
            <Link
              href={`/product/${p.slug}`}
              className="exhibit-link"
              onClick={() => track('product_click', { slug: p.slug, placement: 'showcase', source: null })}
            >
              <div className="exhibit-stage">
                <Branch seed={p.slug} kind="main" />
                <Branch seed={p.slug} kind="sprig" />
                <div className="exhibit-lift">
                  <div className="exhibit-frame">
                    <i className="frame-shadow" aria-hidden="true" />
                    <span className="frame-face">
                      {cover ? (
                        // Plain img: images are unoptimized, so next/image would not emit a srcset; this one picks the 600 or 1400 file
                        <img
                          src={thumbUrl(cover)}
                          srcSet={`${thumbUrl(cover)} 600w, ${imageUrl(cover)} 1400w`}
                          sizes="(min-width: 900px) 30vw, 70vw"
                          width={600}
                          height={800}
                          loading="lazy"
                          decoding="async"
                          alt={`${p.name} — ${categoryLabel(p.category).toLowerCase()} for women`}
                        />
                      ) : (
                        <span className="card-placeholder" aria-hidden="true">
                          {p.name.charAt(0)}
                        </span>
                      )}
                    </span>
                    <i className="ex-tape" aria-hidden="true" />
                  </div>
                </div>
              </div>
              <div className="exhibit-plate">
                <h3>{p.name}</h3>
                <div className="plate-tags">
                  <PriceTag paisa={p.pricePaisa} />
                  {p.variants.length > 0 && <SizeChips sizes={p.variants.map((v) => v.size)} size="sm" />}
                </div>
              </div>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
