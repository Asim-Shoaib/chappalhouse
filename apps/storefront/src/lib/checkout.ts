import type { Product } from './product'

export type CheckoutInput = {
  idempotencyKey: string
  customer: { name: string; phone: string; email?: string; addressLine: string; city: string; province?: string }
  items: Array<{ slug: string; size: number; quantity: number }>
  paymentMethod: 'cod' | 'safepay' | 'bank_transfer'
  policyAccepted: true
}

export class CheckoutValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, field: string, min: number, max: number) {
  if (typeof value !== 'string') throw new CheckoutValidationError(`${field} is required`)
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length < min || normalized.length > max) throw new CheckoutValidationError(`${field} is invalid`)
  return normalized
}

export function normalizePakistanPhone(value: string) {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('0092')) digits = digits.slice(4)
  else if (digits.startsWith('92')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  if (!/^3\d{9}$/.test(digits)) throw new CheckoutValidationError('Enter a valid Pakistan mobile number')
  return `+92${digits}`
}

export function parseCheckoutInput(value: unknown): CheckoutInput {
  if (!isRecord(value) || !isRecord(value.customer) || !Array.isArray(value.items)) throw new CheckoutValidationError('Invalid checkout request')
  if (value.items.length < 1 || value.items.length > 8) throw new CheckoutValidationError('Your cart must contain 1-8 items')
  const seen = new Set<string>()
  const items = value.items.map((item) => {
    if (!isRecord(item)) throw new CheckoutValidationError('Invalid cart item')
    const slug = text(item.slug, 'Product', 1, 120)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !Number.isInteger(item.size) || !Number.isInteger(item.quantity)) throw new CheckoutValidationError('Invalid cart item')
    const size = item.size as number
    const quantity = item.quantity as number
    if (size < 35 || size > 45 || quantity < 1 || quantity > 5) throw new CheckoutValidationError('Invalid size or quantity')
    const key = `${slug}:${size}`
    if (seen.has(key)) throw new CheckoutValidationError('Duplicate cart item')
    seen.add(key)
    return { slug, size, quantity }
  })
  if (value.paymentMethod !== 'cod' && value.paymentMethod !== 'safepay' && value.paymentMethod !== 'bank_transfer') throw new CheckoutValidationError('Choose a payment method')
  if (value.policyAccepted !== true) throw new CheckoutValidationError('Accept the store policies')
  const email = typeof value.customer.email === 'string' ? value.customer.email.trim().toLowerCase() : undefined
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) throw new CheckoutValidationError('Email is invalid')
  return {
    idempotencyKey: text(value.idempotencyKey, 'Checkout key', 8, 128),
    customer: {
      name: text(value.customer.name, 'Name', 2, 100),
      phone: normalizePakistanPhone(text(value.customer.phone, 'Phone', 10, 30)),
      email,
      addressLine: text(value.customer.addressLine, 'Address', 5, 300),
      city: text(value.customer.city, 'City', 2, 80),
      province: typeof value.customer.province === 'string' ? value.customer.province.trim().slice(0, 80) : undefined,
    },
    items,
    paymentMethod: value.paymentMethod,
    policyAccepted: true,
  }
}

export function priceCheckout(products: Product[], input: CheckoutInput) {
  const bySlug = new Map(products.map((product) => [product.slug, product]))
  let subtotalPaisa = 0
  const items = input.items.map((item) => {
    const product = bySlug.get(item.slug)
    const variant = product?.variants.find(({ size }) => size === item.size)
    // Validates that the product and size exist, not that a count covers the
    // order. Quantity is still capped in the cart, and a genuine shortfall is
    // handled in the WhatsApp confirmation rather than by refusing the order.
    if (!product || !variant) throw new CheckoutValidationError(`${item.slug}, size ${item.size} is no longer available`)
    subtotalPaisa += product.pricePaisa * item.quantity
    return { ...item, unitPricePaisa: product.pricePaisa }
  })
  return { items, subtotalPaisa }
}
