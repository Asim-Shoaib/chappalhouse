export const metadata = { title: 'Terms of sale' }

export default function TermsPage() {
  return (
    <article className="shell info-page">
      <p className="eyebrow">Before you order</p>
      <h1>Terms of sale</h1>
      <p className="lede">These terms explain how website orders, payment, delivery, cancellations, and exchanges are handled.</p>
      <h2>Orders</h2>
      <p>Submitting checkout creates an order request. Cash on delivery orders are accepted after confirmation. Prepaid orders are accepted after the payment provider confirms payment and stock remains available.</p>
      <h2>Prices and stock</h2>
      <p>Prices are in Pakistani rupees. Checkout recalculates prices and stock before creating an order. We may cancel and refund an order if a stock discrepancy prevents fulfillment.</p>
      <h2>Refunds and exchanges</h2>
      <p>Approved prepaid refunds return through the original payment method. Size exchanges follow the published returns policy.</p>
    </article>
  )
}
