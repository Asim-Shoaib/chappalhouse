'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'
import { useCart } from './CartProvider'
import { formatPkr } from '@/lib/product'
import type { ManualAccount } from '@/lib/payments/manual'

async function json(response: Response): Promise<Record<string, unknown>> {
  try { return await response.json() as Record<string, unknown> } catch { return {} }
}

export function CheckoutForm({
  shippingPaisa,
  safepayEnabled,
  manualAccounts,
}: {
  shippingPaisa: number
  safepayEnabled: boolean
  manualAccounts: ManualAccount[]
}) {
  const router = useRouter()
  const { items, subtotalPaisa, isHydrated, clear } = useCart()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [method, setMethod] = useState('cod')
  const idempotencyKey = useRef<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    const paymentMethod = String(form.get('paymentMethod'))
    try {
      const orderItems = items.map(({ slug, size, quantity }) => ({ slug, size, quantity }))
      const customer = {
        name: String(form.get('name') ?? '').trim().replace(/\s+/g, ' '),
        phone: String(form.get('phone') ?? '').trim(),
        email: String(form.get('email') ?? '').trim().toLowerCase(),
        addressLine: String(form.get('addressLine') ?? '').trim().replace(/\s+/g, ' '),
        city: String(form.get('city') ?? '').trim().replace(/\s+/g, ' '),
        province: String(form.get('province') ?? '').trim().replace(/\s+/g, ' '),
      }
      const payload = { customer, items: orderItems, paymentMethod, policyAccepted: form.get('policyAccepted') === 'on' }
      const fingerprint = JSON.stringify(payload)
      const stored = sessionStorage.getItem('chappal_checkout_attempt')
      let previous: { fingerprint?: string; key?: string } = {}
      try { previous = stored ? JSON.parse(stored) as { fingerprint?: string; key?: string } : {} } catch {}
      idempotencyKey.current = previous.fingerprint === fingerprint && previous.key ? previous.key : crypto.randomUUID()
      sessionStorage.setItem('chappal_checkout_attempt', JSON.stringify({ fingerprint, key: idempotencyKey.current }))
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: idempotencyKey.current,
          ...payload,
        }),
      })
      const data = await json(response)
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Unable to place order')
      const orderRef = typeof data.orderRef === 'string' ? data.orderRef : ''
      if (paymentMethod === 'safepay') {
        const payment = await fetch('/api/payments/safepay/session', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderRef }),
        })
        const paymentData = await json(payment)
        if (!payment.ok || typeof paymentData.redirectUrl !== 'string') throw new Error(typeof paymentData.error === 'string' ? paymentData.error : 'Unable to start Safepay')
        location.assign(paymentData.redirectUrl)
        return
      }
      clear()
      sessionStorage.removeItem('chappal_checkout_attempt')
      router.push(
        paymentMethod === 'bank_transfer'
          ? `/order/transfer?ref=${encodeURIComponent(orderRef)}`
          : '/order/received',
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to place order')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isHydrated) return <div className="commerce-page"><h1>Checkout</h1><p className="muted">Loading...</p></div>
  if (items.length === 0) return <div className="commerce-page"><h1>Checkout</h1><p>Your cart is empty.</p><Link className="button" href="/cart">Return to cart</Link></div>

  return (
    <div className="commerce-page">
      <div className="commerce-head"><h1>Checkout</h1><p>No account needed.</p></div>
      <div className="commerce-layout">
        <form className="checkout-form" onSubmit={submit}>
          {error && <p className="form-error" role="alert">{error}</p>}
          <fieldset><legend>Delivery details</legend>
            <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>
            <label>Pakistan mobile number<input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" required minLength={10} maxLength={30} pattern="(?:\+?92|0092|0)?3[0-9 -]{9,12}" title="Enter a Pakistan mobile number, for example 0300 1234567" /></label>
            <label>Email <small>optional</small><input name="email" type="email" autoComplete="email" maxLength={254} /></label>
            <label>Address<textarea name="addressLine" autoComplete="street-address" rows={3} required minLength={5} maxLength={300} /></label>
            <div className="checkout-row"><label>City<input name="city" autoComplete="address-level2" required minLength={2} maxLength={80} /></label><label>Province<input name="province" autoComplete="address-level1" maxLength={80} /></label></div>
          </fieldset>
          <fieldset><legend>Payment</legend>
            <label className="payment-option">
              <input type="radio" name="paymentMethod" value="cod" defaultChecked onChange={() => setMethod('cod')} />
              <span>Cash on delivery<small>Pay the rider when your parcel arrives.</small></span>
            </label>
            {manualAccounts.length > 0 && (
              <label className="payment-option">
                <input type="radio" name="paymentMethod" value="bank_transfer" onChange={() => setMethod('bank_transfer')} />
                <span>
                  Easypaisa, JazzCash or bank transfer
                  <small>Send the total, then share the screenshot on WhatsApp.</small>
                </span>
              </label>
            )}
            {method === 'bank_transfer' && <ManualInstructions accounts={manualAccounts} />}
            {safepayEnabled && (
              <label className="payment-option">
                <input type="radio" name="paymentMethod" value="safepay" onChange={() => setMethod('safepay')} />
                <span>Pay online by card<small>Secure checkout through Safepay.</small></span>
              </label>
            )}
          </fieldset>
          <label className="policy-check"><input type="checkbox" name="policyAccepted" required /> I accept the <Link href="/returns">returns policy</Link>.</label>
          <button className="button" type="submit" disabled={submitting}>{submitting ? 'Placing order...' : 'Place order'}</button>
        </form>
        <aside className="order-summary"><h2>Order summary</h2><ul>{items.map((item) => <li key={`${item.slug}:${item.size}`}><span>{item.product.name}, size {item.size} × {item.quantity}</span><strong>{formatPkr(item.product.pricePaisa * item.quantity)}</strong></li>)}</ul><dl><div><dt>Subtotal</dt><dd>{formatPkr(subtotalPaisa)}</dd></div><div><dt>Delivery</dt><dd>{formatPkr(shippingPaisa)}</dd></div><div className="order-total"><dt>Total</dt><dd>{formatPkr(subtotalPaisa + shippingPaisa)}</dd></div></dl></aside>
      </div>
    </div>
  )
}

function ManualInstructions({ accounts }: { accounts: ManualAccount[] }) {
  return (
    <div className="manual-pay">
      <p className="manual-pay-lede">
        Send the order total to any one of these, then place the order. We confirm by
        WhatsApp once the payment shows up.
      </p>
      <ul>
        {accounts.map((entry) => (
          <li key={entry.id}>
            <span className="manual-pay-label">{entry.label}</span>
            {/* Account numbers are selectable and monospaced: buyers copy these
                by hand into a wallet app, so a mistyped digit is a lost order. */}
            <code>{entry.accountNumber}</code>
            <span className="manual-pay-name">{entry.accountName}</span>
          </li>
        ))}
      </ul>
      <p className="manual-pay-note">
        Your sizes are held for 24 hours. If payment does not arrive by then the pairs
        go back on sale.
      </p>
    </div>
  )
}
