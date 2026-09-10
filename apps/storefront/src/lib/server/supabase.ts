import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function getSupabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Checkout is not configured yet')
  return { client: createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }), serviceKey: key }
}
