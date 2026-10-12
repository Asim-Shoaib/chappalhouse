import { formatPkr } from '@/lib/product'

/**
 * The price as a manila swing tag: a notched end with a punched hole, a short
 * string through it, a slight rest tilt and a hard shadow. Server-safe.
 *
 *   <PriceTag paisa={product.pricePaisa} />            md
 *   <PriceTag paisa={product.pricePaisa} size="lg" />  product page
 *
 * The text is the plain formatted price (Rs 4,500), so it reads and indexes as
 * the price. Ink on manila uses tokens that do not swap between themes
 * (--invert-surface on --tan), 5:1 or better in both. Look: ".price-tag" in
 * globals.css.
 */
export function PriceTag({
  paisa,
  size = 'md',
  className,
}: {
  paisa: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <span className={`price-tag price-tag-${size}${className ? ` ${className}` : ''}`}>
      <span className="price-tag-face">{formatPkr(paisa)}</span>
    </span>
  )
}
