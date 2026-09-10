import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
const COOKIE = 'chappal_analytics_session'

type EventRow = { event_name: string; payload: Record<string, unknown>; occurred_at: string }
const sessionValue = (secret: string) => createHmac('sha256', secret).update('analytics-session').digest('base64url')
function equal(left: string, right: string) { const a=Buffer.from(left); const b=Buffer.from(right); return a.length===b.length && timingSafeEqual(a,b) }

async function signIn(formData: FormData) {
  'use server'
  const expected = process.env.ANALYTICS_DASHBOARD_TOKEN
  const supplied = String(formData.get('password') ?? '')
  if (!expected || !equal(supplied, expected)) redirect('/admin/analytics?error=1')
  const jar = await cookies()
  jar.set(COOKIE, sessionValue(expected), { httpOnly: true, secure: process.env.NODE_ENV==='production', sameSite: 'strict', path: '/admin/analytics', maxAge: 28800 })
  redirect('/admin/analytics')
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const secret = process.env.ANALYTICS_DASHBOARD_TOKEN
  const session = (await cookies()).get(COOKIE)?.value ?? ''
  if (!secret || !equal(session, sessionValue(secret))) {
    const { error } = await searchParams
    return <section className="shell info-page"><p className="eyebrow">Private area</p><h1>Store analytics</h1><form action={signIn} className="admin-login"><label>Dashboard password<input name="password" type="password" required /></label>{error && <p className="form-error">Incorrect password.</p>}<button className="button">Sign in</button></form></section>
  }

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return <section className="shell info-page"><h1>Analytics is not connected</h1><p>Add Supabase credentials.</p></section>
  const supabase=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
  const since=new Date(Date.now()-30*86400000).toISOString()
  const {data,error}=await supabase.from('analytics_events').select('event_name,payload,occurred_at').gte('occurred_at',since).order('occurred_at',{ascending:false}).limit(5000)
  if(error) return <section className="shell info-page"><h1>Analytics could not load</h1></section>
  const rows=(data??[]) as EventRow[]
  const count=(name:string)=>rows.filter(row=>row.event_name===name).length
  const products=new Map<string,number>()
  for(const row of rows.filter(row=>row.event_name==='product_view')) { const slug=typeof row.payload.slug==='string'?row.payload.slug:'unknown'; products.set(slug,(products.get(slug)??0)+1) }
  const top=[...products.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8)
  return <section className="shell analytics-page"><p className="eyebrow">Last 30 days</p><h1>Storefront signals</h1><div className="analytics-grid"><Metric label="Page views" value={count('page_view')}/><Metric label="Product views" value={count('product_view')}/><Metric label="WhatsApp clicks" value={count('whatsapp_click')}/><Metric label="Size selections" value={count('size_selected')}/></div><section className="analytics-panel"><h2>Most viewed products</h2>{top.length===0?<p className="muted">No views yet.</p>:<ol>{top.map(([slug,views])=><li key={slug}><span>{slug}</span><strong>{views}</strong></li>)}</ol>}</section></section>
}

function Metric({label,value}:{label:string;value:number}) { return <div className="metric"><span>{label}</span><strong>{value.toLocaleString('en-PK')}</strong></div> }
