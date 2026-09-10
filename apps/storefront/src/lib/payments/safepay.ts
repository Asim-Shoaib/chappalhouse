import 'server-only'

type Config = { secret: string; apiKey: string; environment: 'sandbox' | 'production'; apiBase: string; checkoutBase: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function safepayConfig(): Config {
  const secret = process.env.SAFEPAY_SECRET_KEY
  const apiKey = process.env.SAFEPAY_API_KEY
  const environment = process.env.SAFEPAY_ENVIRONMENT
  if (!secret || !apiKey || (environment !== 'sandbox' && environment !== 'production')) throw new Error('Safepay is not configured')
  return {
    secret, apiKey, environment,
    apiBase: environment === 'sandbox' ? 'https://sandbox.api.getsafepay.com' : 'https://api.getsafepay.com',
    checkoutBase: environment === 'sandbox' ? 'https://sandbox.api.getsafepay.com/embedded/' : 'https://getsafepay.com/embedded/',
  }
}

export function isSafepayConfigured() {
  return Boolean(
    process.env.SAFEPAY_SECRET_KEY &&
    process.env.SAFEPAY_API_KEY &&
    process.env.SAFEPAY_WEBHOOK_SECRET &&
    (process.env.SAFEPAY_ENVIRONMENT === 'sandbox' || process.env.SAFEPAY_ENVIRONMENT === 'production') &&
    process.env.NEXT_PUBLIC_SITE_URL
  )
}

async function post(config: Config, path: string, body: Record<string, unknown>) {
  const response = await fetch(`${config.apiBase}${path}`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'x-sfpy-merchant-secret': config.secret },
    body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(12000),
  })
  const data: unknown = await response.json()
  if (!response.ok) throw new Error('Safepay rejected the payment request')
  return data
}

export async function createSafepaySession(orderRef: string, amountPaisa: number, returnUrl: string, cancelUrl: string, existingTracker?: string) {
  const config = safepayConfig()
  const trackerResponse = existingTracker ? null : await post(config, '/order/payments/v3/', {
      merchant_api_key: config.apiKey, intent: 'CYBERSOURCE', mode: 'payment', entry_mode: 'raw',
      currency: 'PKR', amount: amountPaisa, metadata: { order_id: orderRef, source: 'hosted' }, include_fees: false,
    })
  const passportResponse = await post(config, '/client/passport/v1/token', {})
  if (!existingTracker && (!isRecord(trackerResponse) || !isRecord(trackerResponse.data) || !isRecord(trackerResponse.data.tracker) || typeof trackerResponse.data.tracker.token !== 'string')) throw new Error('Safepay did not return a tracker')
  if (!isRecord(passportResponse) || typeof passportResponse.data !== 'string') throw new Error('Safepay did not return a passport')
  const tracker = existingTracker ?? (trackerResponse as { data: { tracker: { token: string } } }).data.tracker.token
  const url = new URL(config.checkoutBase)
  url.search = new URLSearchParams({ environment: config.environment, tracker, tbt: passportResponse.data, source: 'hosted', order_id: orderRef, redirect_url: returnUrl, cancel_url: cancelUrl }).toString()
  return { tracker, redirectUrl: url.toString() }
}
