import type { Category } from '@/lib/product'

export function ProductDetails({ category }: { category: Category }) {
  return (
    <div className="product-details">
      <details open>
        <summary>Size guide</summary>
        <p>Measure from the back of your heel to the tip of your longest toe. If you are between sizes, choose the larger size.</p>
        <table className="size-guide">
          <caption className="sr-only">Footwear size guide</caption>
          <thead><tr><th>Size</th><th>Foot length</th></tr></thead>
          <tbody>
            <tr><td>36</td><td>23 cm</td></tr>
            <tr><td>37</td><td>23.7 cm</td></tr>
            <tr><td>38</td><td>24.3 cm</td></tr>
            <tr><td>39</td><td>25 cm</td></tr>
            <tr><td>40</td><td>25.7 cm</td></tr>
            <tr><td>41</td><td>26.3 cm</td></tr>
          </tbody>
        </table>
      </details>
      <details>
        <summary>About this pair</summary>
        <p>This {category === 'khussa' ? 'khussa' : 'chappal'} comes from a small Lahore batch and is photographed from stock held in Islamabad. Slight finishing differences can occur between handmade pairs.</p>
      </details>
      <details>
        <summary>Delivery and exchange</summary>
        <p>Islamabad orders usually arrive in 1-3 working days; other cities generally take 3-6 working days.</p>
        <p>Need another size? We offer a 7-day size exchange. The pair must be unworn and in its original packaging.</p>
      </details>
    </div>
  )
}
