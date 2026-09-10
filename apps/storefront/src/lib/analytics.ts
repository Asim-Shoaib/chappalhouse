'use client'

export type AnalyticsEvent =
  | 'page_view'
  | 'category_view'
  | 'product_view'
  | 'product_click'
  | 'size_selected'
  | 'whatsapp_click'
  | 'recommendation_impression'
  | 'recommendation_click'
  | 'catalog_filter'

type EventPayload = Record<string, string | number | boolean | null>

const visitorKey = 'chappal_visitor_id'
const sessionKey = 'chappal_session_id'

function id() {
  return crypto.randomUUID()
}

function getId(storage: Storage, key: string) {
  let value = storage.getItem(key)
  if (!value) {
    value = id()
    storage.setItem(key, value)
  }
  return value
}

export function track(event: AnalyticsEvent, payload: EventPayload = {}) {
  if (typeof window === 'undefined') return

  const body = JSON.stringify({
    event,
    payload,
    path: window.location.pathname,
    visitorId: getId(window.localStorage, visitorKey),
    sessionId: getId(window.sessionStorage, sessionKey),
  })

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }))
    return
  }

  void fetch('/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  })
}
