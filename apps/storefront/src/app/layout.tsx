import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { PageViewTracker } from '@/components/Analytics'
import { CartProvider } from '@/components/CartProvider'
import { CartLink } from '@/components/CartLink'
import { getProducts } from '@/lib/catalog'

// Falls back to the production origin, not localhost. metadataBase turns the
// relative og:image into an absolute URL, and a localhost fallback shipped a
// share card that resolved to nobody's machine — every WhatsApp and Facebook
// share rendered without an image.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chappalhouse.live'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Chappal House — Handcrafted Khussa & Chappals in Islamabad',
    template: '%s | Chappal House',
  },
  description:
    'Hand-embroidered khussa and chappals for women, sized on WhatsApp before you order. Cash on delivery across Pakistan, delivered in 2 to 4 days.',
  keywords: [
    'khussa',
    'khussa online Pakistan',
    'chappal for women',
    'handmade khussa Islamabad',
    'cash on delivery shoes Pakistan',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    siteName: 'Chappal House',
    title: 'Chappal House — Handcrafted Khussa & Chappals',
    description:
      'Hand-embroidered khussa and chappals, photographed as real stock. Cash on delivery across Pakistan.',
    // A photograph of stock actually held, not the favicon. Social platforms
    // will not render an SVG, so this is a 1200x630 JPEG.
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Maroon khussa with gold embroidery' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chappal House — Handcrafted Khussa & Chappals',
    description:
      'Hand-embroidered khussa and chappals, photographed as real stock. Cash on delivery across Pakistan.',
    images: ['/og.jpg'],
  },
}

// Tells Google this is one business rather than a loose set of pages: it is
// what lets a result carry the shop's own logo and name instead of a generic
// globe, and what a knowledge panel is built from.
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  name: 'Chappal House',
  url: siteUrl,
  logo: `${siteUrl}/icon.svg`,
  image: `${siteUrl}/og.jpg`,
  description:
    'Hand-embroidered khussa and chappals for women, sourced in Lahore and shipped from Islamabad.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Islamabad',
    addressCountry: 'PK',
  },
  areaServed: { '@type': 'Country', name: 'Pakistan' },
  paymentAccepted: 'Cash on delivery, Easypaisa, JazzCash, bank transfer',
  currenciesAccepted: 'PKR',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const products = await getProducts()
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c'),
          }}
        />
        <CartProvider products={products}>
        <PageViewTracker />
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <header className="site-header">
          <div className="shell header-inner">
            <Link href="/" className="wordmark">
              Chappal House
            </Link>
            <nav className="nav" aria-label="Main navigation">
              <Link href="/khussa">Khussa</Link>
              <Link href="/chappals">Chappals</Link>
              <CartLink />
            </nav>
          </div>
        </header>

        <main id="content">{children}</main>

        <footer className="site-footer">
          <div className="shell footer-inner">
            <div>
              <p className="footer-mark">Chappal House</p>
              <p className="muted">
                Handcrafted khussa and chappals, sourced in Lahore, shipped from
                Islamabad.
              </p>
            </div>
            <ul className="footer-list">
              <li><Link href="/shipping">Shipping information</Link></li>
              <li><Link href="/returns">Returns and exchanges</Link></li>
              <li><Link href="/faq">Frequently asked questions</Link></li>
              <li><Link href="/privacy">Privacy policy</Link></li>
              <li><Link href="/terms">Terms of sale</Link></li>
            </ul>
          </div>
        </footer>
        </CartProvider>
      </body>
    </html>
  )
}
