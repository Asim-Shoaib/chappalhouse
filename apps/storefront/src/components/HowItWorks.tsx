import { Reveal } from './Reveal'

/**
 * The three things a first-time buyer actually wants to know before paying a
 * stranger on Instagram: who holds the stock, what happens if the size is
 * wrong, and when it arrives. Sitting between the product grids because that
 * is where the hesitation happens — after they have found a pair they like.
 */
const STEPS = [
  {
    n: '01',
    title: 'Every pair is in hand',
    body: 'We photograph the actual stock in our Islamabad store. What you see on the page is what ships — no supplier catalogue, no pre-order.',
  },
  {
    n: '02',
    title: 'Sizes confirmed on WhatsApp',
    body: 'Khussa runs narrow. Message us your usual size and we will tell you honestly whether to go up before you order, not after.',
  },
  {
    n: '03',
    title: 'Pay when it reaches you',
    body: 'Cash on delivery across Pakistan, or transfer to Easypaisa, JazzCash, or bank if you prefer. Delivery is two to four days.',
  },
]

export function HowItWorks() {
  return (
    <section className="section how-band">
      <div className="shell">
        <Reveal>
          <p className="eyebrow">Buying from us</p>
        </Reveal>
        <ol className="how-grid">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.n} delay={index * 0.08}>
              <span className="how-n">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
