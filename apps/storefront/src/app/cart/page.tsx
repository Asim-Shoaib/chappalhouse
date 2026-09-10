import { CartPage } from '@/components/CartPage'
import { shippingFeePaisa } from '@/lib/cart'

export const metadata = { title: 'Your cart' }

export default function CartRoute() {
  return <div className="shell"><CartPage shippingPaisa={shippingFeePaisa(process.env.SHIPPING_FEE_PAISA)} /></div>
}
