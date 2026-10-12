'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'
import { useCart } from './CartProvider'
import { announce } from './Keyboard'
import { formatPkr, thumbUrl } from '@/lib/product'
import { CART_STORAGE_KEY } from '@/lib/cart'
import { Branch } from './Branch'
import { PriceTag } from './ui/PriceTag'

const EASE = [0.32, 0.72, 0, 1] as const

/**
 * Rendered inside the cart and checkout loading placeholders, which reserve a
 * filled cart's height (globals.css .commerce-loading). On a hard load the
 * parser runs it before the placeholder paints: an empty stored cart drops
 * the reservation, so the short empty state does not pull the footer up.
 */
const HOLD = `try{var c=JSON.parse(localStorage.getItem('${CART_STORAGE_KEY}')||'null');if(!(c&&c.items&&c.items.length))document.documentElement.classList.add('cart-none')}catch(e){}`
export const CartHold = () => <script dangerouslySetInnerHTML={{ __html: HOLD }} />

/**
 * Each line is a paper slip with a framed print of the pair (shown whole).
 * Node owners (motion/react): a .cart-slip lands on mount, folds away on
 * remove (popLayout, so the slips below close the gap by layout transform);
 * the quantity number flips on change. CommerceMotion owns the h1, the
 * summary receipt and the empty state's entrance.
 * Keyboard: focus inside a slip that is still landing snaps it to rest (same
 * motion values, duration 0). After a remove, focus goes to the next line's
 * name (else the one above, else "Continue shopping") and the removal is read out.
 */
export function CartPage({ shippingPaisa }: { shippingPaisa: number }) {
  const { items, subtotalPaisa, isHydrated, remove, update } = useCart()
  const still = useReducedMotion()
  // Key of the line to focus after a remove; '' means the cart is now empty.
  const refocus = useRef<string | null>(null)

  useEffect(() => {
    const key = refocus.current
    if (key === null) return
    refocus.current = null
    const target = key
      ? document.querySelector<HTMLElement>(`[data-line="${CSS.escape(key)}"] h2 a`)
      : document.querySelector<HTMLElement>('.cart-empty .button')
    target?.focus()
  }, [items])

  const removeLine = (i: number) => {
    const item = items[i]
    const next = items[i + 1] ?? items[i - 1]
    refocus.current = next ? `${next.slug}:${next.size}` : ''
    remove(item.slug, item.size)
    announce(`Removed ${item.product.name}, size ${item.size}, from your cart.`)
  }

  if (!isHydrated) return <div className="commerce-page commerce-loading"><CartHold /><h1>Your cart</h1><p className="muted">Loading your cart...</p></div>
  if (items.length === 0) return (
    <div className="commerce-page">
      <h1>Your cart</h1>
      <div className="commerce-empty cart-empty">
        <div className="cart-empty-art live" aria-hidden="true">
          <Branch seed="empty-cart" kind="sprig" className="paper-branch" />
          <Branch seed="empty-cart" kind="main" className="paper-branch" />
          <Branch seed="empty-cart-2" kind="sprig" className="paper-branch" />
        </div>
        <p>Your cart is empty.</p>
        <Link className="button" href="/">Continue shopping</Link>
      </div>
    </div>
  )

  return (
    <div className="commerce-page">
      <div className="commerce-head"><h1>Your cart</h1><p>Check your sizes and quantities before checkout.</p></div>
      <div className="commerce-layout">
        <ul className="cart-items">
          <AnimatePresence mode="popLayout">
            {items.map((item, i) => {
              const cover = item.product.images[0]
              return (
                <motion.li
                  layout={still ? false : 'position'}
                  className="cart-item cart-slip"
                  key={`${item.slug}:${item.size}`}
                  data-line={`${item.slug}:${item.size}`}
                  onFocus={(event) => void animate(event.currentTarget, { opacity: 1, y: 0, rotate: 0 }, { duration: 0 })}
                  initial={still ? false : { opacity: 0, y: 22, rotate: i % 2 ? 1.2 : -1.2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0, transition: { duration: 0.5, ease: EASE, delay: 0.15 + i * 0.07 } }}
                  // Folds back on its top edge and goes.
                  exit={still ? undefined : { opacity: 0, rotateX: -78, scaleY: 0.7, transition: { duration: 0.34, ease: EASE } }}
                  transition={{ layout: { duration: 0.42, ease: EASE } }}
                  style={{ transformOrigin: '50% 0%', transformPerspective: 900 }}
                >
                  {/* Same page as the name link below: one tab stop per line. */}
                  <Link href={`/product/${item.slug}`} className="cart-image" tabIndex={-1} aria-hidden="true">
                    {cover && <Image src={thumbUrl(cover)} width={180} height={240} alt="" />}
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
                      <Stepper item={item} update={update} still={!!still} />
                      <button
                        type="button"
                        className="cart-remove"
                        onClick={() => removeLine(i)}
                        aria-label={`Remove ${item.product.name}, size ${item.size}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <strong className="cart-line-total">
                    <PriceTag paisa={item.product.pricePaisa * item.quantity} size="sm" />
                  </strong>
                </motion.li>
              )
            })}
          </AnimatePresence>
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
  still,
}: {
  item: CartItem
  update: (slug: string, size: number, quantity: number) => void
  still: boolean
}) {
  const set = (quantity: number) => update(item.slug, item.size, quantity)
  const atMax = item.quantity >= item.maxQuantity
  // A button that disables itself would drop focus to the page; hand it to the other one.
  const less = useRef<HTMLButtonElement>(null)
  const more = useRef<HTMLButtonElement>(null)

  return (
    <div className="qty">
      <button
        ref={less}
        type="button"
        onClick={() => {
          set(item.quantity - 1)
          if (item.quantity - 1 <= 1) more.current?.focus()
        }}
        disabled={item.quantity <= 1}
        aria-label={`Reduce quantity of ${item.product.name}`}
      >
        &minus;
      </button>
      {/* aria-live so screen readers hear the new count after a tap, since the
          buttons themselves keep their labels. */}
      <span aria-live="polite">
        <motion.span
          key={item.quantity}
          className="qty-count"
          initial={still ? false : { opacity: 0, y: -8, scale: 1.3 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.26, ease: EASE }}
        >
          {item.quantity}
        </motion.span>
      </span>
      <button
        ref={more}
        type="button"
        onClick={() => {
          set(item.quantity + 1)
          if (item.quantity + 1 >= item.maxQuantity) less.current?.focus()
        }}
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
    <aside className="order-summary cart-receipt">
      <div className="cart-receipt-paper">
        <h2>Order summary</h2>
        <dl>
          <div><dt>Subtotal</dt><dd>{formatPkr(subtotalPaisa)}</dd></div>
          <div><dt>Delivery</dt><dd>{formatPkr(shippingPaisa)}</dd></div>
          <div className="order-total"><dt>Total</dt><dd>{formatPkr(subtotalPaisa + shippingPaisa)}</dd></div>
        </dl>
        <Link href="/checkout" className="button">Checkout</Link>
        <Link href="/" className="quiet-link">Continue shopping</Link>
      </div>
    </aside>
  )
}
