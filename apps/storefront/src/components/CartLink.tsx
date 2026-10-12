'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCart } from './CartProvider'

/**
 * Header cart: a cut-paper shopping bag in the top-right corner with a round
 * paper tag for the count (shown only when the cart holds something).
 *
 * The link carries [data-cart-target], which is where flyToCart lands a shoe.
 * Nothing needs to call into this component: whenever the cart count rises
 * (an add on this page or in another tab), the bag bumps and the tag pops on
 * its own. For a flight, call add() after `await flyToCart(...)` so the bump
 * lands with the shoe. Reduced motion skips the bump; the count still changes.
 */

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
const BAG = 'M5 8.5h14l-1 12H6z'

export function CartLink() {
  const { itemCount, isHydrated } = useCart()
  const count = isHydrated ? itemCount : 0
  const bag = useRef<SVGSVGElement>(null)
  const tag = useRef<HTMLSpanElement>(null)
  // null until the stored cart is read, so restoring it on load is not a "rise".
  const prev = useRef<number | null>(null)

  useEffect(() => {
    if (!isHydrated) return
    const was = prev.current
    prev.current = itemCount
    if (was === null || itemCount <= was) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    bag.current?.animate(
      [
        { transform: 'scale(1) rotate(0deg)' },
        { transform: 'scale(1.18) rotate(-7deg)', offset: 0.4 },
        { transform: 'scale(1) rotate(0deg)' },
      ],
      { duration: 450, easing: EASE },
    )
    tag.current?.animate(
      [
        { transform: 'scale(0.4)', opacity: 0 },
        { transform: 'scale(1.25)', opacity: 1, offset: 0.55 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 450, easing: EASE },
    )
  }, [isHydrated, itemCount])

  return (
    <Link
      href="/cart"
      className="cart-link"
      data-cart-target=""
      aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
    >
      <svg ref={bag} className="cart-bag" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path className="cut-shadow" d={BAG} transform="translate(1.5 1.5)" />
        <path className="cut-tan" d={BAG} />
        <path className="cart-fold" d="M5.6 11.2h12.8" />
        <path className="cart-handle" d="M9 10V7a3 3 0 0 1 6 0v3" />
      </svg>
      {count > 0 && (
        <span ref={tag} className="cart-count" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
