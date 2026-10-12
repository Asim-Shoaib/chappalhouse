import Link from 'next/link'
import { getProducts, categoryLabel, type Product } from '@/lib/catalog'
import { Showcase } from '@/components/Showcase'
import { PhotoRail } from '@/components/PhotoRail'
import { HowItWorks } from '@/components/HowItWorks'
import { HomeMotion } from '@/components/HomeMotion'
import { HeroCollage } from '@/components/HeroCollage'
import { PaperShapes } from '@/components/PaperShapes'
import { TornEdge } from '@/components/TornEdge'
import '@/styles/home.css'

// Runs while the parser reaches it, before the hero is painted, so the hero
// text can start hidden without a visible-then-hidden flash. Reduced motion
// never gets the class. If the bundle never loads, globals.css reveals
// everything after 2s on its own. Client-side navigation back to "/" does not
// run this (scripts rendered by React do not execute); HomeMotion adds the
// class itself in a layout effect, which is also before paint.
const HOME_WAIT =
  "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('home-wait')}catch(e){}"

// The leaf that peeks out from behind a hero button on hover (styles/home.css).
const BTN_LEAF = (
  <i className="btn-leaf" aria-hidden="true">
    <svg viewBox="-17 -63 34 66" focusable="false">
      <path className="cut-shadow" d="M0 0C-14 -20 -12 -46 0 -60C12 -46 14 -20 0 0Z" transform="translate(2 2)" />
      <path className="cut-leaf" d="M0 0C-14 -20 -12 -46 0 -60C12 -46 14 -20 0 0Z" />
      <path className="cut-vein" d="M0 -4V-44" />
    </svg>
  </i>
)

/**
 * Seven covers for the hero board: the khussa that used to be the hero photo
 * first (same image and alt text), then chappals and khussa alternating, the
 * best photographed (most images) of each first.
 */
function boardItems(khussa: Product[], chappals: Product[]) {
  const lead = khussa.find((p) => p.images.length > 0)
  const best = (list: Product[]) =>
    list.filter((p) => p.images.length > 0 && p !== lead).sort((a, b) => b.images.length - a.images.length)
  const k = best(khussa)
  const c = best(chappals)
  const rest = Array.from({ length: Math.max(k.length, c.length) }, (_, i) => [c[i], k[i]]).flat()
  return [lead, ...rest]
    .filter((p): p is Product => Boolean(p))
    .slice(0, 7)
    .map((product, i) => ({
      product,
      image: product.images[0],
      alt:
        i === 0
          ? 'Hand-embroidered maroon khussa'
          : `${product.name}, ${categoryLabel(product.category).toLowerCase()} for women`,
    }))
}

export default async function HomePage() {
  const products = await getProducts()
  const khussa = products.filter((p) => p.category === 'khussa')
  const chappals = products.filter((p) => p.category === 'chappal')
  const board = boardItems(khussa, chappals)

  return (
    <div className="home">
      <script dangerouslySetInnerHTML={{ __html: HOME_WAIT }} />
      <section className="hero">
        <PaperShapes scene="hero" />
        <div className="shell hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Islamabad · Cash on delivery</p>
            <h1>
              Khussa worth{' '}
              <br />
              wearing twice
            </h1>
            <p>
              Hand-embroidered in Lahore&apos;s oldest workshops, sold at the
              price the workshop charges. No showroom markup.
            </p>
            <div className="hero-actions">
              <span className="hero-stamp">
                <Link href="/khussa" className="button">
                  Shop khussa
                  {BTN_LEAF}
                </Link>
              </span>
              <span className="hero-stamp">
                <Link href="/chappals" className="button button-quiet">
                  Shop chappals
                  {BTN_LEAF}
                </Link>
              </span>
            </div>
          </div>

          {board.length > 0 && <HeroCollage items={board} />}
        </div>
      </section>

      {/* The tree grows down through both product sections (components/homeTree.ts). */}
      <div className="grove">
        <svg className="home-tree" aria-hidden="true" focusable="false" />

        {khussa.length > 0 && (
          <section className="section showcase">
            <div className="shell">
              <div className="section-head">
                <h2>Khussa</h2>
                <Link href="/khussa" className="muted">
                  View all
                </Link>
              </div>
              <Showcase products={khussa} />
            </div>
          </section>
        )}

        <PhotoRail products={products} />

        {chappals.length > 0 && (
          <section className="section showcase">
            <div className="shell">
              <div className="section-head">
                <h2>Chappals</h2>
                <Link href="/chappals" className="muted">
                  View all
                </Link>
              </div>
              <Showcase products={chappals} />
            </div>
          </section>
        )}
      </div>

      <TornEdge tone="dark" />

      <section className="story-band story-strip">
        <PaperShapes scene="story" />
        <div className="shell story-grid">
          <p className="eyebrow">From Lahore, for your everyday</p>
          <div>
            <h2>Good shoes should have a story, not a showroom markup.</h2>
            <p>We work with Lahore workshops, photograph what is actually in stock, and keep the buying conversation human. Choose your pair, choose your size, and we confirm the rest on WhatsApp.</p>
          </div>
        </div>
      </section>

      {products.length > 0 && (
        <>
          <TornEdge tone="tint" />
          <HowItWorks />
        </>
      )}

      {products.length === 0 && (
        <section className="section">
          <div className="shell">
            <p className="muted">
              No catalog data. Run <code>node scripts/generate-catalog.mjs</code>.
            </p>
          </div>
        </section>
      )}

      <HomeMotion />
    </div>
  )
}
