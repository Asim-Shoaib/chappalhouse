'use client'

import Link from 'next/link'
import { useCart } from './CartProvider'

export function CartLink() {
  const { itemCount, isHydrated } = useCart()
  const count = isHydrated ? itemCount : 0
  return (
    <Link href="/cart" className="cart-link" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
      Cart {count > 0 && <span aria-hidden="true">({count})</span>}
    </Link>
  )
}
