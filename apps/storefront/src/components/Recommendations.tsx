import { ProductCard } from './ProductCard'
import { RecommendationTracker } from './Analytics'
import type { Product } from '@/lib/product'

export function Recommendations({
  products,
  source,
}: {
  products: Product[]
  source: string
}) {
  if (products.length === 0) return null

  return (
    <section className="section recommendations" aria-labelledby="recommendations-title">
        <RecommendationTracker
          source={source}
          products={products.map((product) => product.slug)}
        />
        <div className="section-head">
          <h2 id="recommendations-title">You may also like</h2>
        </div>
        <div className="grid">
          {products.map((product) => (
            <ProductCard
              key={product.slug}
              product={product}
              placement="recommendation"
              recommendationSource={source}
            />
          ))}
        </div>
    </section>
  )
}
