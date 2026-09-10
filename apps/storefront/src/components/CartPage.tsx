'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCart } from './CartProvider'
import { formatPkr, thumbUrl } from '@/lib/product'

export function CartPage({ shippingPaisa }: { shippingPaisa: number }) {
  const { items, subtotalPaisa, isHydrated, remove, update } = useCart()

  if (!isHydrated) return <div className="commerce-page"><h1>Your cart</h1><p className="muted">Loading your cart...</p></div>
  if (items.length === 0) return (
    <div className="commerce-page">
      <h1>Your cart</h1>
      <div className="commerce-empty"><p>Your cart is empty.</p><Link className="button" href="/">Continue shopping</Link></div>
    </div>
  )

  return (
    <div className="commerce-page">
      <div className="commerce-head"><h1>Your cart</h1><p>Check your sizes and quantities before checkout.</p></div>
      <div className="commerce-layout">
        <ul className="cart-items">
          {items.map((item) => {
            const cover = item.product.images[0]
            return (
              <li className="cart-item" key={`${item.slug}:${item.size}`}>
                <Link href={`/product/${item.slug}`} className="cart-image">
                  {cover && <Image src={thumbUrl(cover)} width={180} height={225} alt="" />}
                </Link>
                <div className="cart-copy">
                  <h2><Link href={`/product/${item.slug}`}>{item.product.name}</Link></h2>
                  <p className="cart-meta">
                    Size {item.size}
                    {/* The unit price only earns its place once the line total
                        stops matching it — otherwise it is the same number
                        printed twice on one row. */}
                    {item.quantity > 1 && <> · {formatPkr(item.product.pricePaisa)} each</>}
                  </p>
                  <div className="cart-actions">
                    <Stepper item={item} update={update} />
                    <button type="button" className="cart-remove" onClick={() => remove(item.slug, item.size)}>
                      Remove
                    </button>
                  </div>
                </div>
                <strong className="cart-line-total">{formatPkr(item.product.pricePaisa * item.quantity)}</strong>
              </li>
            )
          })}
        </ul>
        <OrderSummary subtotalPaisa={subtotalPaisa} shippingPaisa={shippingPaisa} />
      </div>
    </div>
  )
}

type CartItem = ReturnType<typeof useCart>['items'][number]

function Stepper({
  item,
  update,
}: {
  item: CartItem
  update: (slug: string, size: number, quantity: number) => void
}) {
  const set = (quantity: number) => update(item.slug, item.size, quantity)
  const atMax = item.quantity >= item.maxQuantity

  return (
    <div className="qty">
      <button
        type="button"
        onClick={() => set(item.quantity - 1)}
        disabled={item.quantity <= 1}
        aria-label={`Reduce quantity of ${item.product.name}`}
      >
        &minus;
      </button>
      {/* aria-live so screen readers hear the new count after a tap, since the
          buttons themselves keep their labels. */}
      <span aria-live="polite">{item.quantity}</span>
      <button
        type="button"
        onClick={() => set(item.quantity + 1)}
        disabled={atMax}
        aria-label={
          atMax
            ? `Only ${item.maxQuantity} in stock`
            : `Increase quantity of ${item.product.name}`
        }
        title={atMax ? `Only ${item.maxQuantity} in stock` : undefined}
      >
        +
      </button>
    </div>
  )
}

function OrderSummary({ subtotalPaisa, shippingPaisa }: { subtotalPaisa: number; shippingPaisa: number }) {
  return (
    <aside className="order-summary">
      <h2>Order summary</h2>
      <dl>
        <div><dt>Subtotal</dt><dd>{formatPkr(subtotalPaisa)}</dd></div>
        <div><dt>Delivery</dt><dd>{formatPkr(shippingPaisa)}</dd></div>
        <div className="order-total"><dt>Total</dt><dd>{formatPkr(subtotalPaisa + shippingPaisa)}</dd></div>
      </dl>
      <Link href="/checkout" className="button">Checkout</Link>
      <Link href="/" className="quiet-link">Continue shopping</Link>
    </aside>
  )
}
