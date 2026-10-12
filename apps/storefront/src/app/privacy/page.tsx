import { InfoMotion } from '@/components/InfoMotion'
import { PaperWait } from '@/components/PaperWait'

export const metadata = { title: 'Privacy policy' }

export default function PrivacyPage() {
  return (
    <div className="shell info-wrap">
      <article className="info-page info-sheet">
        <PaperWait />
        <InfoMotion seed="privacy" />
        <p className="eyebrow">Your information</p>
        <h1>Privacy policy</h1>
        <p className="lede">We collect the information needed to process orders, provide support, prevent misuse, and understand how the shop is used.</p>
        <h2>Order information</h2>
        <p>Checkout collects your name, phone number, optional email address, delivery address, ordered products, and payment method. We use this information to confirm, deliver, support, and account for your order.</p>
        <h2>Payments</h2>
        <p>Online card and wallet details are entered on Safepay&apos;s hosted checkout. Chappal House does not receive or store your full payment credentials.</p>
        <h2>Sharing</h2>
        <p>Order details may be shared with payment, messaging, and delivery providers only as needed to complete and support the order.</p>
      </article>
    </div>
  )
}
