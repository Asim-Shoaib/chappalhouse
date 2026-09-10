import { type Product } from './product'

export function recommendProducts(
  products: Product[],
  current: Product,
  limit = 4,
) {
  return products
    .filter((product) => product.slug !== current.slug)
    .map((product) => ({
      product,
      score:
        (product.category === current.category ? 4 : 0) +
        (Math.abs(product.pricePaisa - current.pricePaisa) <= 10000 ? 2 : 0) +
        (product.images.length > 0 ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, limit)
    .map(({ product }) => product)
}
