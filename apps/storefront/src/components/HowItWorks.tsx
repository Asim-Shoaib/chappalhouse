import { PaperShapes } from './PaperShapes'

/**
 * The three things a first-time buyer actually wants to know before paying a
 * stranger on Instagram: who holds the stock, what happens if the size is
 * wrong, and when it arrives. Sitting between the product grids because that
 * is where the hesitation happens — after they have found a pair they like.
 *
 * Each step is a cut-paper card with its own rest angle. On desktop HomeMotion
 * pins the section and plays them as a deck (each card lands, tape goes on,
 * the stack settles centred in the screen); on phones CSS sticks them into a
 * stack. With JS off or reduced motion it is this plain list. No numbering:
 * the order is the order on the page.
 */
const STEPS = [
  {
    title: 'Every pair is in hand',
    body: 'We photograph the actual stock in our Islamabad store. What you see on the page is what ships. No supplier catalogue, no pre-order.',
  },
  {
    title: 'Sizes confirmed on WhatsApp',
    body: 'Khussa runs narrow. Message us your usual size and we will tell you honestly whether to go up before you order, not after.',
  },
  {
    title: 'Pay when it reaches you',
    body: 'Cash on delivery across Pakistan, or transfer to Easypaisa, JazzCash, or bank if you prefer. Delivery is two to four days.',
  },
]

export function HowItWorks() {
  return (
    <section className="section how-band">
      <PaperShapes scene="how" />
      <div className="shell">
        <p className="eyebrow">Buying from us</p>
        <ol className="how-grid">
          {STEPS.map((step) => (
            <li key={step.title} className="how-card">
              <div className="how-face">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              <i className="how-tape" aria-hidden="true" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
