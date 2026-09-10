import { cookies } from 'next/headers'
import Link from 'next/link'
import { getSupabaseService } from '@/lib/server/supabase'
import { receiptCookieName, receiptTokenHash } from '@/lib/server/receipt'
import { formatPkr } from '@/lib/product'
import { PrintReceiptButton } from '@/components/PrintReceiptButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Order receipt', robots: { index: false, follow: false } }

type ReceiptItem = { name: string; size: number; quantity: number; unitPricePaisa: number; lineTotalPaisa: number }
type Receipt = {
  orderRef: string
  placedAt: string
  customerName: string
  deliveryAddress: { addressLine: string; city: string; province: string | null }
  orderStatus: string
  paymentMethod: string
  paymentState: 'paid' | 'refunded' | 'cod_unpaid' | 'pending' | 'failed'
  currency: string
  subtotalPaisa: number
  shippingPaisa: number
  discountPaisa: number
  totalPaisa: number
  items: ReceiptItem[]
}

function isReceipt(value: unknown): value is Receipt {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const receipt = value as Record<string, unknown>
  if (typeof receipt.orderRef !== 'string' || typeof receipt.placedAt !== 'string' || Number.isNaN(Date.parse(receipt.placedAt)) || typeof receipt.customerName !== 'string' || typeof receipt.orderStatus !== 'string' || typeof receipt.paymentMethod !== 'string' || !['paid', 'refunded', 'cod_unpaid', 'pending', 'failed'].includes(String(receipt.paymentState)) || typeof receipt.currency !== 'string') return false
  if (![receipt.subtotalPaisa, receipt.shippingPaisa, receipt.discountPaisa, receipt.totalPaisa].every((amount) => typeof amount === 'number' && Number.isSafeInteger(amount) && amount >= 0)) return false
  if (!Array.isArray(receipt.items) || !receipt.items.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item) && typeof (item as Record<string, unknown>).name === 'string' && ['size', 'quantity', 'unitPricePaisa', 'lineTotalPaisa'].every((field) => typeof (item as Record<string, unknown>)[field] === 'number'))) return false
  if (typeof receipt.deliveryAddress !== 'object' || receipt.deliveryAddress === null || Array.isArray(receipt.deliveryAddress)) return false
  const address = receipt.deliveryAddress as Record<string, unknown>
  return typeof address.addressLine === 'string' && typeof address.city === 'string' && (address.province === null || typeof address.province === 'string')
}

async function getReceipts(): Promise<Receipt[]> {
  const token = (await cookies()).get(receiptCookieName())?.value
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return []
  try {
    const hash = receiptTokenHash(token)
    const { data, error } = await getSupabaseService().client.rpc('get_storefront_receipts', { p_access_token_hash: hash })
    if (error || !Array.isArray(data)) return []
    return data.filter(isReceipt)
  } catch {
    return []
  }
}

export default async function OrderReceived() {
  const receipts = await getReceipts()
  if (receipts.length === 0) return (
    <article className="shell order-received">
      <p className="eyebrow">Private receipt area</p>
      <h1>No receipt available</h1>
      <p>This browser does not have permission to view an active order receipt. Place an order or return using the same browser.</p>
      <Link className="button" href="/">Return to the shop</Link>
    </article>
  )

  return (
    <main className="shell receipts-page">
      <div className="receipts-head"><div><p className="eyebrow">Keep for your records</p><h1>Order receipt</h1></div><PrintReceiptButton /></div>
      {receipts.map((receipt, index) => <ReceiptDocument key={receipt.orderRef} receipt={receipt} primary={index === 0} />)}
      <p className="receipt-privacy">Saved PDFs contain personal delivery information. Store and share them carefully.</p>
    </main>
  )
}

function ReceiptDocument({ receipt, primary }: { receipt: Receipt; primary: boolean }) {
  const status = paymentCopy(receipt)
  return (
    <article className={`receipt-document ${primary ? 'receipt-primary' : 'receipt-previous'}`}>
      <header className="receipt-header"><div><p className="receipt-brand">Chappal House</p><p>Islamabad, Pakistan</p></div><div><strong>Order receipt</strong><span>{receipt.orderRef}</span><span>{new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(receipt.placedAt))}</span></div></header>
      <section className="receipt-status"><strong>{status.heading}</strong><p>{status.note}</p></section>
      <section className="receipt-delivery"><div><h2>Deliver to</h2><p><strong>{receipt.customerName}</strong><br />{receipt.deliveryAddress.addressLine}<br />{receipt.deliveryAddress.city}{receipt.deliveryAddress.province ? `, ${receipt.deliveryAddress.province}` : ''}</p></div><div><h2>Order status</h2><p>{labelStatus(receipt.orderStatus)}</p></div></section>
      <table className="receipt-items"><thead><tr><th>Item</th><th>Size</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>{receipt.items.map((item, index) => <tr key={`${item.name}-${item.size}-${index}`}><td>{item.name}</td><td>{item.size}</td><td>{item.quantity}</td><td>{formatPkr(item.unitPricePaisa)}</td><td>{formatPkr(item.lineTotalPaisa)}</td></tr>)}</tbody></table>
      <dl className="receipt-totals"><div><dt>Subtotal</dt><dd>{formatPkr(receipt.subtotalPaisa)}</dd></div><div><dt>Delivery</dt><dd>{formatPkr(receipt.shippingPaisa)}</dd></div>{receipt.discountPaisa > 0 && <div><dt>Discount</dt><dd>-{formatPkr(receipt.discountPaisa)}</dd></div>}<div className="receipt-grand-total"><dt>Total</dt><dd>{formatPkr(receipt.totalPaisa)}</dd></div></dl>
      <footer className="receipt-notes"><h2>Notes</h2><ol><li>This is an order receipt, not a tax invoice.</li><li>For cash on delivery, this receipt is not proof that payment was collected.</li><li>Online payment is valid only when this receipt shows &quot;Paid online&quot;. Returning from a payment page does not itself confirm payment.</li><li>Check the pair before wearing it. Size exchange requests must follow the published return policy and time limit.</li><li>Quote order reference {receipt.orderRef} when contacting support.</li></ol></footer>
    </article>
  )
}

function paymentCopy(receipt: Receipt) {
  if (receipt.paymentState === 'paid') return { heading: 'Paid online', note: 'Payment received via Safepay. This is an order/payment receipt, not a tax invoice.' }
  if (receipt.paymentState === 'refunded') return { heading: 'Payment refunded', note: 'The recorded payment was refunded. This document is not evidence that funds remain paid.' }
  if (receipt.paymentState === 'cod_unpaid') return { heading: 'Cash on delivery - unpaid', note: `${formatPkr(receipt.totalPaisa)} remains due to the courier. This records the order and is not proof of payment.` }
  if (receipt.paymentState === 'pending' && receipt.paymentMethod === 'bank_transfer') return { heading: 'Awaiting your transfer', note: `${formatPkr(receipt.totalPaisa)} is due by Easypaisa, JazzCash or bank transfer. Your order is confirmed by hand once we see the payment, so this is not proof of payment.` }
  if (receipt.paymentState === 'pending') return { heading: 'Payment pending', note: 'Returning from Safepay does not confirm payment. Payment is confirmed only after the signed Safepay notification is applied.' }
  return { heading: 'Payment not completed', note: 'No successful payment is recorded for this order.' }
}

function labelStatus(value: string) { return value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) }
