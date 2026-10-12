'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { formatPkr, categoryLabel, thumbUrl, type Product } from '@/lib/product'
import { track } from '@/lib/analytics'
import { flyToCart } from '@/lib/flyToCart'
import { useCart } from './CartProvider'
import { SizePicker } from './ui/SizeChips'
import { announce } from './Keyboard'

export function BuyPanel({
  product,
  whatsappNumber,
}: {
  product: Product
  whatsappNumber: string
}) {
  const { add, itemCount } = useCart()
  // Preselect when there is only one size to choose — saves a tap and makes
  // the Add button live immediately.
  const [selected, setSelected] = useState<number | null>(
    product.variants.length === 1 ? product.variants[0].size : null,
  )

  const label = categoryLabel(product.category)
  const message =
    `Assalam o Alaikum! I'd like to order:\n\n` +
    `${product.name} (${label})\n` +
    (selected ? `Size: ${selected}\n` : '') +
    `Price: ${formatPkr(product.pricePaisa)}`

  const href = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : null
  const [added, setAdded] = useState(false)
  // Counts adds so the "Added" stamp lands again on every add, not just the first.
  const [stamps, setStamps] = useState(0)
  const still = useReducedMotion()
  const cover = product.images[0]
  // Read out once the add has rendered, so the count is the cart's real one.
  const said = useRef('')
  useEffect(() => {
    if (!said.current) return
    announce(`${said.current} ${itemCount} ${itemCount === 1 ? 'item' : 'items'}.`)
    said.current = ''
  }, [stamps, itemCount])

  return (
    <>
      <p className="field-label">
        Select size
        {selected && <span className="field-hint">Size {selected} selected</span>}
      </p>

      <SizePicker
        sizes={product.variants.map((v) => v.size)}
        value={selected}
        onChange={(size) => {
          setSelected(size)
          track('size_selected', { slug: product.slug, size })
        }}
      />

      <button
        className="button pdp-add"
        type="button"
        disabled={selected === null}
        data-added={added || undefined}
        onClick={async (event) => {
          if (selected === null) return
          const size = selected
          // The flight starts on this press, from the photo being shown, passes
          // behind this button and lands in the header bag; the add waits for it
          // so the bag bumps as the shoe arrives (CartLink). flyToCart never
          // throws and resolves at once under reduced motion.
          const button = event.currentTarget
          const shown = Array.from(document.querySelectorAll<HTMLImageElement>('.pdp-frame img')).pop()
          if (shown) await flyToCart(shown, shown.currentSrc || shown.src, button)
          else if (cover) await flyToCart(button, thumbUrl(cover))
          said.current = `Added ${product.name}, size ${size}, to your cart.`
          add(product.slug, size)
          setAdded(true)
          setStamps((n) => n + 1)
        }}
      >
        <motion.span
          key={stamps}
          className="pdp-add-label"
          initial={added && !still ? { opacity: 0, scale: 1.6, rotate: -12 } : false}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.34, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {added && (
            <svg className="pdp-add-check" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <circle cx="8" cy="8" r="8" />
              <path d="M4.6 8.3l2.2 2.2 4.6-4.8" />
            </svg>
          )}
          {added ? 'Added to cart' : 'Add to cart'}
        </motion.span>
      </button>
      {!selected && <p className="button-note">Choose a size to add this pair.</p>}
      {href && (
        <a
          className="whatsapp-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            track('whatsapp_click', {
              slug: product.slug,
              size: selected,
            })
          }
        >
          <WhatsappMark /> Ask on WhatsApp
        </a>
      )}
    </>
  )
}

function WhatsappMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.896 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.464 3.488" />
    </svg>
  )
}
