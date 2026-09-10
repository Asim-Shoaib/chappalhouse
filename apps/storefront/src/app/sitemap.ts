import type { MetadataRoute } from 'next'
import { getProducts } from '@/lib/catalog'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts()

  return [
    { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/khussa`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/chappals`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/shipping`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/returns`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    ...products.map((p) => ({
      url: `${baseUrl}/product/${p.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
