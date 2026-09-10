import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProducts, type Category } from '@/lib/catalog'
import { CatalogControls } from '@/components/CatalogControls'
import { CategoryViewTracker } from '@/components/Analytics'

const ROUTES: Record<string, { category: Category; title: string; blurb: string }> = {
  khussa: {
    category: 'khussa',
    title: 'Khussa',
    blurb:
      'Hand-embroidered khussa from Lahore workshops. Made for mehndi, shaadi, and Eid.',
  },
  chappals: {
    category: 'chappal',
    title: 'Chappals',
    blurb: 'Everyday chappals and sandals — comfortable enough to wear all day.',
  },
}

export function generateStaticParams() {
  return Object.keys(ROUTES).map((category) => ({ category }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const route = ROUTES[category]
  if (!route) return {}

  return {
    title: `${route.title} for Women in Pakistan`,
    description: `${route.blurb} Cash on delivery across Pakistan.`,
    alternates: { canonical: `/${category}` },
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const route = ROUTES[category]
  if (!route) notFound()

  const products = (await getProducts()).filter((p) => p.category === route.category)

  return (
    <>
      <section className="hero">
        <CategoryViewTracker category={route.category} />
        <div className="shell hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">{products.length} designs</p>
            <h1>{route.title}</h1>
            <p>{route.blurb}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <CatalogControls products={products} />
        </div>
      </section>
    </>
  )
}
