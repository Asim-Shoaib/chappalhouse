import { InfoMotion } from '@/components/InfoMotion'
import { PaperWait } from '@/components/PaperWait'

export const metadata = { title: 'Returns and exchanges' }

export default function ReturnsPage() {
  return (
    <div className="shell info-wrap">
      <article className="info-page info-sheet">
        <PaperWait />
        <InfoMotion seed="returns" />
        <p className="eyebrow">A better fit, if needed</p>
        <h1>Returns and exchanges</h1>
        <p className="lede">We offer a 7-day size exchange so you can order with less guesswork.</p>
        <h2>Size exchange</h2>
        <p>Contact us within 7 days of delivery. The pair must be unworn, clean, and in its original packaging. Delivery charges for the exchange are paid by the customer.</p>
        <h2>What to do</h2>
        <p>Send your order details and a photo of the pair on WhatsApp. We will confirm the replacement size and next steps.</p>
        <h2>Not covered</h2>
        <p>Worn pairs, damage caused after delivery, and requests made after the 7-day window cannot be accepted as size exchanges.</p>
      </article>
    </div>
  )
}
