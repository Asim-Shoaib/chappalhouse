import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProduct, getProducts, formatPkr } from '@/lib/catalog'
import { hasModel } from '@/lib/product'
import { BuyPanel } from '@/components/BuyPanel'
import { Gallery } from '@/components/Gallery'
import { ModelViewer } from '@/components/ModelViewer'
import { ProductViewTracker } from '@/components/Analytics'
import { Recommendations } from '@/components/Recommendations'
import { recommendProducts } from '@/lib/recommendations'
import { ProductDetails } from '@/components/ProductDetails'
import { RecentlyViewed } from '@/components/RecentlyViewed'

export async function generateStaticParams() {
  const products = await getProducts()
  return products.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return {}

  const label = product.category === 'khussa' ? 'Khussa' : 'Chappal'
  return {
    title: `${product.name} — ${label}`,
    description: `${product.name}, handcrafted ${label.toLowerCase()} for women. ${formatPkr(product.pricePaisa)}. Cash on delivery across Pakistan.`,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      images: product.images[0] ? [`/products/${product.images[0]}.webp`] : [],
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  const label = product.category === 'khussa' ? 'Khussa' : 'Chappal'
  const recommendations = recommendProducts(await getProducts(), product)

  // Product schema drives both rich results and AI answer citations.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    category: label,
    brand: { '@type': 'Brand', name: 'Chappal House' },
    offers: {
      '@type': 'Offer',
      price: (product.pricePaisa / 100).toFixed(0),
      priceCurrency: 'PKR',
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <div className="shell">
      <script
        type="application/ld+json"
        // Product names originate from the stock sheet. Escaping `<` prevents a
        // name containing "</script>" from closing this tag early.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <div className="pdp">
        <ProductViewTracker slug={product.slug} category={product.category} />
        <div className="pdp-media">
          <Gallery
            images={product.images}
            alt={`${product.name} — handcrafted ${label.toLowerCase()} for women`}
          />
          {hasModel(product.slug) && (
            <ModelViewer slug={product.slug} name={product.name} />
          )}
        </div>

        <div>
          <p className="eyebrow">{label}</p>
          <h1>{product.name}</h1>
          <p className="pdp-price">{formatPkr(product.pricePaisa)}</p>

          <BuyPanel
            product={product}
            whatsappNumber={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''}
          />

          <ProductDetails category={product.category} />

          <ul className="trust">
            <li>Cash on delivery across Pakistan</li>
            <li>We confirm every order by WhatsApp before dispatch</li>
            <li>7-day size exchange</li>
            <li>Flat Rs 250 delivery estimate</li>
          </ul>
        </div>
      </div>
      <Recommendations products={recommendations} source={`product:${product.slug}`} />
      <RecentlyViewed products={await getProducts()} currentSlug={product.slug} />
    </div>
  )
}
