import { createHmac } from 'node:crypto'
import { getSupabaseService } from '@/lib/server/supabase'

const EVENTS = new Set([
  'page_view',
  'category_view',
  'product_view',
  'product_click',
  'size_selected',
  'whatsapp_click',
  'recommendation_impression',
  'recommendation_click',
  'catalog_filter',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validPayload(payload: Record<string, unknown>) {
  return Object.entries(payload).length <= 12 && Object.entries(payload).every(([key, value]) => (
    key.length <= 64 &&
    (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) &&
    (typeof value !== 'string' || value.length <= 512)
  ))
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return new Response('Forbidden', { status: 403 })
  if (!request.headers.get('content-type')?.startsWith('application/json')) return new Response('JSON required', { status: 415 })
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 16384) return new Response('Payload too large', { status: 413 })

  let body: unknown
  try {
    const raw = await request.text()
    if (raw.length > 16384) return new Response('Payload too large', { status: 413 })
    body = JSON.parse(raw)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!isRecord(body)) return new Response('Invalid event', { status: 400 })

  const { event, payload, path, visitorId, sessionId } = body
  if (
    typeof event !== 'string' ||
    !EVENTS.has(event) ||
    !isRecord(payload) ||
    !validPayload(payload) ||
    typeof path !== 'string' ||
    typeof visitorId !== 'string' ||
    typeof sessionId !== 'string' ||
    visitorId.length > 80 ||
    sessionId.length > 80 ||
    path.length > 512 ||
    !path.startsWith('/')
  ) {
    return new Response('Invalid event', { status: 400 })
  }

  try {
    const { client, serviceKey } = getSupabaseService()
    const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const keyHash = createHmac('sha256', serviceKey).update(`analytics:${ip}:${visitorId}`).digest('hex')
    const limited = await client.rpc('consume_storefront_rate_limit', { p_key_hash: keyHash, p_limit: 120, p_window_seconds: 600 })
    if (limited.error) return new Response('Unable to record event', { status: 503 })
    if (limited.data !== true) return new Response('Too many events', { status: 429 })
    const { error } = await client.from('analytics_events').insert({
      event_name: event,
      payload,
      path,
      visitor_id: visitorId,
      session_id: sessionId,
    })

    if (error) return new Response('Unable to record event', { status: 500 })
  } catch {
    if (process.env.NODE_ENV === 'production') return new Response('Analytics unavailable', { status: 503 })
    console.info('[analytics]', event, payload)
  }

  return new Response(null, { status: 204 })
}
