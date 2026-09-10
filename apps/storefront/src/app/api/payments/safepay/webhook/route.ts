import { createHmac, timingSafeEqual } from 'node:crypto'
import { getSupabaseService } from '@/lib/server/supabase'

export const runtime = 'nodejs'

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function equal(left: string, right: string) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b) }

export async function POST(request: Request) {
  const secret = process.env.SAFEPAY_WEBHOOK_SECRET
  const apiKey = process.env.SAFEPAY_API_KEY
  if (!secret || !apiKey) return new Response('Not configured', { status: 503 })
  const raw = await request.text()
  if (raw.length > 262144) return new Response('Too large', { status: 413 })
  const signature = request.headers.get('x-sfpy-signature')?.toLowerCase() ?? ''
  const expected = createHmac('sha512', secret).update(raw).digest('hex')
  if (!/^[a-f0-9]{128}$/.test(signature) || !equal(signature, expected)) return new Response('Invalid signature', { status: 401 })
  let event: unknown
  try { event = JSON.parse(raw) } catch { return new Response('Invalid JSON', { status: 400 }) }
  if (!isRecord(event) || event.type !== 'payment.succeeded' || !isRecord(event.data) || !isRecord(event.data.metadata)) return new Response(null, { status: 204 })
  if (event.merchant_api_key !== apiKey || typeof event.token !== 'string' || typeof event.data.tracker !== 'string' || typeof event.data.amount !== 'number' || event.data.currency !== 'PKR' || typeof event.data.metadata.order_id !== 'string') return new Response('Invalid event', { status: 400 })
  const { client } = getSupabaseService()
  const result = await client.rpc('apply_safepay_payment_succeeded', {
    p_event_id: event.token,
    p_order_ref: event.data.metadata.order_id,
    p_tracker_token: event.data.tracker,
    p_amount_paisa: event.data.amount,
    p_currency: event.data.currency,
    p_payload: event,
  })
  if (result.error) return new Response('Unable to apply event', { status: 500 })
  return new Response(null, { status: 204 })
}
