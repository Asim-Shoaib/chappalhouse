import { createHash, createHmac } from 'node:crypto'
import { getProducts } from '@/lib/catalog'
import { CheckoutValidationError, parseCheckoutInput, priceCheckout } from '@/lib/checkout'
import { getSupabaseService } from '@/lib/server/supabase'
import { shippingFeePaisa } from '@/lib/cart'
import { deriveReceiptToken, receiptTokenFromRequest, receiptTokenHash, setReceiptCookie } from '@/lib/server/receipt'
import { NextRequest, NextResponse } from 'next/server'
import { isSafepayConfigured } from '@/lib/payments/safepay'
import { isManualPaymentConfigured } from '@/lib/payments/manual'

export const runtime = 'nodejs'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'JSON required' }, { status: 415 })

  let input
  try {
    const raw = await request.text()
    if (raw.length > 32768) return Response.json({ error: 'Request too large' }, { status: 413 })
    input = parseCheckoutInput(JSON.parse(raw))
  } catch (error) {
    return Response.json({ error: error instanceof CheckoutValidationError ? error.message : 'Invalid checkout request' }, { status: 400 })
  }

  if (input.paymentMethod === 'safepay' && !isSafepayConfigured()) return Response.json({ error: 'Online payments are unavailable' }, { status: 503 })
  if (input.paymentMethod === 'bank_transfer' && !isManualPaymentConfigured()) return Response.json({ error: 'Bank transfer is unavailable' }, { status: 503 })

  try {
    const { client, serviceKey } = getSupabaseService()
    const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const keyHash = createHmac('sha256', serviceKey).update(`checkout:${ip}`).digest('hex')
    const limited = await client.rpc('consume_storefront_rate_limit', { p_key_hash: keyHash, p_limit: 8, p_window_seconds: 600 })
    if (limited.error) return Response.json({ error: 'Checkout is temporarily unavailable' }, { status: 503 })
    if (limited.data !== true) return Response.json({ error: 'Too many checkout attempts. Try again later.' }, { status: 429 })
    const phoneKeyHash = createHmac('sha256', serviceKey).update(`checkout-phone:${input.customer.phone}`).digest('hex')
    const phoneLimited = await client.rpc('consume_storefront_rate_limit', { p_key_hash: phoneKeyHash, p_limit: 5, p_window_seconds: 3600 })
    if (phoneLimited.error) return Response.json({ error: 'Checkout is temporarily unavailable' }, { status: 503 })
    if (phoneLimited.data !== true) return Response.json({ error: 'Too many checkout attempts for this phone. Try again later.' }, { status: 429 })
    const priced = priceCheckout(await getProducts(), input)
    const shippingPaisa = shippingFeePaisa(process.env.SHIPPING_FEE_PAISA)
    const requestHash = createHash('sha256').update(JSON.stringify({ customer: input.customer, items: priced.items, paymentMethod: input.paymentMethod, shippingPaisa })).digest('hex')
    const receiptToken = receiptTokenFromRequest(request) ?? deriveReceiptToken(input.idempotencyKey)
    const accessTokenHash = receiptTokenHash(receiptToken)
    const { data, error } = await client.rpc('create_storefront_order', {
      p_idempotency_key: input.idempotencyKey,
      p_request_hash: requestHash,
      p_access_token_hash: accessTokenHash,
      p_customer: input.customer,
      p_items: input.items,
      p_payment_method: input.paymentMethod,
      p_expected_subtotal_paisa: priced.subtotalPaisa,
      p_shipping_paisa: shippingPaisa,
    })
    if (error) return Response.json({ error: /stock|price|idempotency|unavailable/i.test(error.message) ? error.message : 'Unable to place order' }, { status: /stock|price|idempotency|unavailable/i.test(error.message) ? 409 : 500 })
    if (!isRecord(data) || typeof data.order_ref !== 'string') return Response.json({ error: 'Unable to place order' }, { status: 500 })
    const response = NextResponse.json({
      orderRef: data.order_ref,
      status: data.status,
      paymentStatus: data.payment_status,
      subtotalPaisa: data.subtotal_paisa,
      shippingPaisa: data.shipping_paisa,
      totalPaisa: data.total_paisa,
    }, { status: data.existing === true ? 200 : 201 })
    response.headers.set('Cache-Control', 'no-store')
    setReceiptCookie(response, receiptToken)
    return response
  } catch (error) {
    return Response.json({ error: error instanceof CheckoutValidationError ? error.message : 'Checkout is not configured yet' }, { status: error instanceof CheckoutValidationError ? 409 : 503 })
  }
}
