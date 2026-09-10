import { getSupabaseService } from '@/lib/server/supabase'
import { createSafepaySession } from '@/lib/payments/safepay'
import { receiptTokenFromRequest, receiptTokenHash } from '@/lib/server/receipt'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'JSON required' }, { status: 415 })
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > 1024) return Response.json({ error: 'Request too large' }, { status: 413 })

  try {
    const raw = await request.text()
    if (raw.length > 1024) return Response.json({ error: 'Request too large' }, { status: 413 })
    const body: unknown = JSON.parse(raw)
    if (!isRecord(body) || typeof body.orderRef !== 'string' || !/^CH-\d{4}-\d{6,}$/.test(body.orderRef)) return Response.json({ error: 'Payment attempt unavailable' }, { status: 400 })
    const receiptToken = receiptTokenFromRequest(request)
    if (!receiptToken) return Response.json({ error: 'Payment attempt unavailable' }, { status: 404 })
    const { client } = getSupabaseService()
    const attempt = await client.rpc('begin_storefront_payment_attempt', { p_access_token_hash: receiptTokenHash(receiptToken), p_order_ref: body.orderRef })
    if (attempt.error || !isRecord(attempt.data) || typeof attempt.data.order_ref !== 'string' || typeof attempt.data.amount_paisa !== 'number') return Response.json({ error: 'Payment attempt unavailable' }, { status: 409 })
    const site = process.env.NEXT_PUBLIC_SITE_URL
    if (!site) return Response.json({ error: 'Online payments are unavailable' }, { status: 503 })
    const returnUrl = new URL('/api/payments/safepay/return', site).toString()
    const cancelUrl = new URL('/checkout', site).toString()
    const existingTracker = typeof attempt.data.tracker_token === 'string' ? attempt.data.tracker_token : undefined
    const session = await createSafepaySession(attempt.data.order_ref, attempt.data.amount_paisa, returnUrl, cancelUrl, existingTracker)
    if (!existingTracker) {
      const completed = await client.rpc('complete_storefront_payment_attempt', { p_attempt_id: attempt.data.attempt_id, p_tracker_token: session.tracker })
      if (completed.error) return Response.json({ error: 'Unable to start payment' }, { status: 500 })
    }
    return Response.json({ redirectUrl: session.redirectUrl }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
  } catch {
    return Response.json({ error: 'Online payments are unavailable' }, { status: 503 })
  }
}
