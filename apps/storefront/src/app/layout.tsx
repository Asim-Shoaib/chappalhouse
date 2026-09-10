import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { PageViewTracker } from '@/components/Analytics'
import { CartProvider } from '@/components/CartProvider'
import { CartLink } from '@/components/CartLink'
import { getProducts } from '@/lib/catalog'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Chappal House — Handcrafted Khussa & Chappals in Islamabad',
    template: '%s | Chappal House',
  },
  description:
    'Handcrafted khussa and chappals for women, delivered across Islamabad and Pakistan. Cash on delivery available.',
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    siteName: 'Chappal House',
    images: ['/icon.svg'],
  },
  twitter: { card: 'summary', images: ['/icon.svg'] },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const products = await getProducts()
  return (
    <html lang="en">
      <body>
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
