import Link from 'next/link'
import Image from 'next/image'
import { getProducts, imageUrl } from '@/lib/catalog'
import { ProductCard } from '@/components/ProductCard'
import { PhotoRail } from '@/components/PhotoRail'
import { HowItWorks } from '@/components/HowItWorks'
import { HomeMotion } from '@/components/HomeMotion'
import { PaperShapes } from '@/components/PaperShapes'
import { TornEdge } from '@/components/TornEdge'

// Runs while the parser reaches it, before the hero is painted, so the hero
// text can start hidden without a visible-then-hidden flash. Reduced motion
// never gets the class. If the bundle never loads, globals.css reveals
// everything after 2s on its own. Client-side navigation back to "/" does not
// run this (scripts rendered by React do not execute); HomeMotion adds the
// class itself in a layout effect, which is also before paint.
const HOME_WAIT =
  "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('home-wait')}catch(e){}"

export default async function HomePage() {
  const products = await getProducts()
  const khussa = products.filter((p) => p.category === 'khussa')
  const chappals = products.filter((p) => p.category === 'chappal')
  const heroImage = khussa.find((p) => p.images.length > 0)?.images[0]

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
              <Link href="/khussa" className="button">
                Shop khussa
              </Link>
              <Link href="/chappals" className="button button-quiet">
                Shop chappals
              </Link>
            </div>
          </div>

          {heroImage && (
            <div className="hero-lift">
              <div className="hero-tilt">
                <div className="hero-figure">
                  <i className="paper-shadow" aria-hidden="true" />
                  <div className="hero-card">
                    <Image
                      src={imageUrl(heroImage)}
                      alt="Hand-embroidered maroon khussa"
                      width={1400}
                      height={1750}
                      priority
                    />
                  </div>
                  <i className="tape tape-a" aria-hidden="true" />
                  <i className="tape tape-b" aria-hidden="true" />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <TornEdge tone="dark" />

      <section className="story-band">
        <PaperShapes scene="story" />
        <div className="shell story-grid">
          <p className="eyebrow">From Lahore, for your everyday</p>
          <div>
            <h2>Good shoes should have a story, not a showroom markup.</h2>
            <p>We work with Lahore workshops, photograph what is actually in stock, and keep the buying conversation human. Choose your pair, choose your size, and we confirm the rest on WhatsApp.</p>
          </div>
        </div>
      </section>

      <TornEdge tone="paper" />

      {khussa.length > 0 && (
        <section className="section sec-grid">
          <PaperShapes scene="grid-a" />
          <div className="shell">
            <div className="section-head">
              <h2>Khussa</h2>
              <Link href="/khussa" className="muted">
                View all
              </Link>
            </div>
            <div className="grid">
              {khussa.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <PhotoRail products={products} />

      {chappals.length > 0 && (
        <section className="section sec-grid">
          <PaperShapes scene="grid-b" />
          <div className="shell">
            <div className="section-head">
              <h2>Chappals</h2>
              <Link href="/chappals" className="muted">
                View all
              </Link>
            </div>
            <div className="grid">
              {chappals.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

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
