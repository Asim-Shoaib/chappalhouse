import { describe, expect, it } from 'vitest'
import { normalizePakistanPhone, parseCheckoutInput, priceCheckout } from './checkout'
import type { Product } from './product'

const products: Product[] = [{ slug: 'classic', name: 'Classic', category: 'khussa', pricePaisa: 85000, variants: [{ size: 37, stockQty: 1 }], images: [] }]
const payload = { idempotencyKey: 'checkout-123', customer: { name: 'Ayesha Khan', phone: '0300 1234567', addressLine: 'House 10, Street 2', city: 'Islamabad' }, items: [{ slug: 'classic', size: 37, quantity: 1 }], paymentMethod: 'cod', policyAccepted: true }

describe('checkout', () => {
  it.each([['0300 1234567', '+923001234567'], ['+92 300 1234567', '+923001234567'], ['923001234567', '+923001234567']])('normalizes %s', (input, expected) => {
    expect(normalizePakistanPhone(input)).toBe(expected)
  })

  it('validates a Pakistan checkout', () => {
    expect(parseCheckoutInput(payload)).toMatchObject({ customer: { phone: '+923001234567' }, paymentMethod: 'cod' })
  })

  it('rejects duplicate cart lines', () => {
    expect(() => parseCheckoutInput({ ...payload, items: [payload.items[0], payload.items[0]] })).toThrow('Duplicate')
  })

  it('uses the server price, not the price the client sent', () => {
    expect(priceCheckout(products, parseCheckoutInput(payload))).toEqual({ items: [{ slug: 'classic', size: 37, quantity: 1, unitPricePaisa: 85000 }], subtotalPaisa: 85000 })
  })

  it('prices an order that exceeds the recorded count', () => {
    const scarce: Product[] = [{ ...products[0], variants: [{ size: 37, stockQty: 0 }] }]
    expect(priceCheckout(scarce, parseCheckoutInput(payload))).toMatchObject({ subtotalPaisa: 85000 })
  })

  it('rejects a size the product does not list', () => {
    const input = parseCheckoutInput({ ...payload, items: [{ slug: 'classic', size: 41, quantity: 1 }] })
    expect(() => priceCheckout(products, input)).toThrow('no longer available')
  })
})
