import Link from 'next/link'
import { manualAccounts, MANUAL_PAYMENT_WINDOW_HOURS } from '@/lib/payments/manual'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Send your payment',
  robots: { index: false, follow: false },
}

export default async function OrderTransfer({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams
  const accounts = manualAccounts()
  // The reference is echoed back into the page, so only accept the shape the
  // order function actually generates rather than any arbitrary string.
  const orderRef = typeof ref === 'string' && /^[A-Za-z0-9-]{6,32}$/.test(ref) ? ref : null
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/[^\d]/g, '')

  return (
    <article className="shell order-received">
      <p className="eyebrow">Order placed — payment pending</p>
      <h1>Send your payment</h1>

      {orderRef && (
        <p className="transfer-ref">
          Your order reference is <strong>{orderRef}</strong>. Quote it when you send the
          screenshot.
        </p>
      )}

      {accounts.length === 0 ? (
        <p>
          We will message you on WhatsApp with payment details shortly.
        </p>
      ) : (
        <>
          <p>
            Transfer the order total to any one of these accounts, then send us the
            screenshot. We confirm your order once the payment lands.
          </p>
          <ul className="transfer-accounts">
            {accounts.map((entry) => (
              <li key={entry.id}>
                <span className="manual-pay-label">{entry.label}</span>
                <code>{entry.accountNumber}</code>
                <span className="manual-pay-name">{entry.accountName}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="transfer-window">
        Your sizes are held for {MANUAL_PAYMENT_WINDOW_HOURS} hours. If payment does not
        arrive by then, the pairs go back on sale.
      </p>

      <div className="transfer-actions">
        {whatsapp && (
          <a
            className="button"
            href={`https://wa.me/${whatsapp}${
              orderRef ? `?text=${encodeURIComponent(`Payment for order ${orderRef}`)}` : ''
            }`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Send screenshot on WhatsApp
          </a>
        )}
        <Link className="quiet-link" href="/order/received">
          View your receipt
        </Link>
      </div>
    </article>
  )
}
