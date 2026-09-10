import { timingSafeEqual } from 'node:crypto'
import { getSupabaseService } from '@/lib/server/supabase'

export const runtime = 'nodejs'

function equal(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!secret || !equal(supplied, secret)) return new Response('Unauthorized', { status: 401 })
  try {
    const { data, error } = await getSupabaseService().client.rpc('release_expired_storefront_reservations', { p_limit: 250 })
    if (error) return Response.json({ error: 'Unable to release reservations' }, { status: 500 })
    return Response.json({ released: data })
  } catch {
    return Response.json({ error: 'Commerce database is unavailable' }, { status: 503 })
  }
}
