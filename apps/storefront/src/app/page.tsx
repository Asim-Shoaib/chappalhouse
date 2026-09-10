import Link from 'next/link'
import Image from 'next/image'
import { getProducts, imageUrl } from '@/lib/catalog'
import { ProductCard } from '@/components/ProductCard'
import { Reveal, RevealStagger } from '@/components/Reveal'
import { PhotoRail } from '@/components/PhotoRail'
import { HowItWorks } from '@/components/HowItWorks'

export default async function HomePage() {
  const products = await getProducts()
  const khussa = products.filter((p) => p.category === 'khussa')
  const chappals = products.filter((p) => p.category === 'chappal')
  const heroImage = khussa.find((p) => p.images.length > 0)?.images[0]

  return (
    <>
      <section className="hero">
        <div className="shell hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Islamabad · Cash on delivery</p>
            <h1>
              Khussa worth
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
            <div className="hero-figure">
              <Image
                src={imageUrl(heroImage)}
                alt="Hand-embroidered maroon khussa"
                width={1400}
                height={1750}
                priority
              />
            </div>
          )}
        </div>
      </section>

      <section className="story-band">
        <div className="shell story-grid">
          <p className="eyebrow">From Lahore, for your everyday</p>
          <div>
            <h2>Good shoes should have a story, not a showroom markup.</h2>
            <p>We work with Lahore workshops, photograph what is actually in stock, and keep the buying conversation human. Choose your pair, choose your size, and we confirm the rest on WhatsApp.</p>
          </div>
        </div>
      </section>

      {khussa.length > 0 && (
        <section className="section">
          <div className="shell">
            <Reveal>
              <div className="section-head">
                <h2>Khussa</h2>
                <Link href="/khussa" className="muted">
                  View all
                </Link>
              </div>
            </Reveal>
            <RevealStagger className="grid">
              {khussa.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </RevealStagger>
          </div>
        </section>
      )}

      <PhotoRail products={products} />

      {chappals.length > 0 && (
        <section className="section">
          <div className="shell">
            <Reveal>
              <div className="section-head">
                <h2>Chappals</h2>
                <Link href="/chappals" className="muted">
                  View all
                </Link>
              </div>
            </Reveal>
            <RevealStagger className="grid">
              {chappals.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </RevealStagger>
          </div>
        </section>
      )}

      {products.length > 0 && <HowItWorks />}

      {products.length === 0 && (
        <section className="section">
          <div className="shell">
            <p className="muted">
              No catalog data. Run <code>node scripts/generate-catalog.mjs</code>.
            </p>
          </div>
        </section>
      )}
    </>
  )
}
