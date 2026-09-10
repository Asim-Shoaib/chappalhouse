import Image from 'next/image'
import Link from 'next/link'
import { thumbUrl } from '@/lib/product'
import type { Product } from '@/lib/product'

/**
 * Edge-to-edge rail of real product photos, scrolling slowly on its own.
 *
 * The catalog carries far more photography than the two grids can show, and
 * that photography is the strongest thing the brand has — every shot is stock
 * actually held, not a supplier render. This puts it on the page between the
 * grids so scrolling turns up something new rather than running out.
 *
 * The animation is CSS-only and duplicated rather than JS-driven: a marquee
 * that runs on the compositor costs nothing per frame, where a scroll listener
 * would fire on every pixel of an already image-heavy page. `prefers-reduced-
 * motion` stops it and leaves a normal horizontal scroller.
 */
export function PhotoRail({ products }: { products: Product[] }) {
  // One shot per product. Taking two put the same name twice in a row, which
  // read as a rendering fault rather than a second angle — the rail is for
  // showing range, and the product page is where extra angles belong.
  const shots = products
    .filter((product) => product.images.length > 0)
    .map((product) => ({ image: product.images[0], product }))
    .slice(0, 14)

  if (shots.length < 6) return null

  // Duplicated so the strip can loop seamlessly; the copy is inert to
  // assistive tech and keyboard order.
  const loop = [...shots, ...shots]

  return (
    <section className="photo-rail" aria-label="From recent stock">
      <div className="photo-rail-track">
        {loop.map(({ image, product }, index) => {
          const isClone = index >= shots.length
          return (
            <Link
              key={`${product.slug}-${image}-${index}`}
              href={`/product/${product.slug}`}
              className="photo-rail-item"
              aria-hidden={isClone || undefined}
              tabIndex={isClone ? -1 : undefined}
            >
              <Image
                src={thumbUrl(image)}
                alt={isClone ? '' : product.name}
                width={260}
                height={325}
                sizes="260px"
              />
              <span className="photo-rail-name">{product.name}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
