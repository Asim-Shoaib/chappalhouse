import { CheckoutForm } from '@/components/CheckoutForm'
import { CommerceMotion } from '@/components/CommerceMotion'
import { shippingFeePaisa } from '@/lib/cart'
import { isSafepayConfigured } from '@/lib/payments/safepay'
import { manualAccounts } from '@/lib/payments/manual'

export const metadata = { title: 'Checkout' }

export default function CheckoutPage() {
  return (
    <div className="shell commerce-scope">
      <CommerceMotion />
      <CheckoutForm
        shippingPaisa={shippingFeePaisa(process.env.SHIPPING_FEE_PAISA)}
        safepayEnabled={isSafepayConfigured()}
        // Read on the server so the account numbers are rendered into the page
        // rather than shipped as a client-readable config blob.
        manualAccounts={manualAccounts()}
      />
    </div>
  )
}
