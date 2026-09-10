export const metadata = { title: 'Frequently asked questions' }

const questions = [
  ['How do I place an order?', 'Choose your size, add the pair to your cart, and complete the guest checkout. You do not need an account.'],
  ['Do you offer cash on delivery?', 'Yes. Cash on delivery is available across Pakistan.'],
  ['How do I choose my size?', 'Use the size guide on each product page. Measure your foot from heel to longest toe, then choose the closest size.'],
  ['Where are the shoes made?', 'Our khussa and chappals are sourced from workshops in Lahore and shipped from Islamabad.'],
  ['Can I pay online?', 'Safepay is offered at checkout when online payments are configured. The order is only marked paid after Safepay confirms the payment.'],
]

export default function FaqPage() {
  return (
    <article className="shell info-page">
      <p className="eyebrow">Questions, answered plainly</p>
      <h1>Frequently asked questions</h1>
      {questions.map(([question, answer]) => (
        <details key={question}>
          <summary>{question}</summary>
          <p>{answer}</p>
        </details>
      ))}
    </article>
  )
}
