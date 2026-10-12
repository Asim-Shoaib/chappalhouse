import { CartPage } from '@/components/CartPage'
import { CommerceMotion } from '@/components/CommerceMotion'
import { shippingFeePaisa } from '@/lib/cart'

export const metadata = { title: 'Your cart' }

export default function CartRoute() {
  return (
    <div className="shell commerce-scope cart-scope">
      <CommerceMotion />
      <CartPage shippingPaisa={shippingFeePaisa(process.env.SHIPPING_FEE_PAISA)} />
    </div>
  )
}
