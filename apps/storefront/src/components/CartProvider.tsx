'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { CART_STORAGE_KEY, parseCart, reconcileCart, serializeCart, type ReconciledCartItem } from '@/lib/cart'
import type { Product } from '@/lib/product'

type CartContextValue = {
  items: ReconciledCartItem[]
  itemCount: number
  subtotalPaisa: number
  isHydrated: boolean
  add: (slug: string, size: number, quantity?: number) => void
  remove: (slug: string, size: number) => void
  update: (slug: string, size: number, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ products, children }: { products: Product[]; children: ReactNode }) {
  const [items, setItems] = useState<ReconciledCartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    try {
      setItems(reconcileCart(parseCart(localStorage.getItem(CART_STORAGE_KEY)), products))
    } catch {
      setItems([])
    }
    setIsHydrated(true)
  }, [products])

  useEffect(() => {
    if (!isHydrated) return
    try { localStorage.setItem(CART_STORAGE_KEY, serializeCart(items)) } catch {}
  }, [isHydrated, items])

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) setItems(reconcileCart(parseCart(event.newValue), products))
    }
    addEventListener('storage', sync)
    return () => removeEventListener('storage', sync)
  }, [products])

  const add = (slug: string, size: number, quantity = 1) => setItems((current) => {
    const plain = current.map(({ slug, size, quantity }) => ({ slug, size, quantity }))
    const existing = plain.find((item) => item.slug === slug && item.size === size)
    if (existing) existing.quantity += quantity
    else plain.push({ slug, size, quantity })
    return reconcileCart(plain, products)
  })

  const remove = (slug: string, size: number) => setItems((current) => current.filter((item) => item.slug !== slug || item.size !== size))
  const update = (slug: string, size: number, quantity: number) => {
    if (quantity <= 0) return remove(slug, size)
    setItems((current) => reconcileCart(current.map((item) => item.slug === slug && item.size === size ? { slug, size, quantity } : item), products))
  }
  const clear = () => setItems([])
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotalPaisa = items.reduce((sum, item) => sum + item.product.pricePaisa * item.quantity, 0)

  return <CartContext.Provider value={{ items, itemCount, subtotalPaisa, isHydrated, add, remove, update, clear }}>{children}</CartContext.Provider>
}

export function useCart() {
  const cart = useContext(CartContext)
  if (!cart) throw new Error('useCart must be used inside CartProvider')
  return cart
}
