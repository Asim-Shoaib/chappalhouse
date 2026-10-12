'use client'

import { useEffect } from 'react'

/**
 * Site-wide keyboard bits, mounted once in the layout:
 *  - the one polite live region; call announce('...') to have it read out
 *    (the cart add in BuyPanel, a removal in CartPage);
 *  - Escape closes the open <details> that holds focus and hands focus back
 *    to its summary. Widgets that own Escape (Select) preventDefault first.
 * No single-letter shortcuts: they collide with screen reader keys.
 */

const ID = 'announcer'

export function announce(message: string) {
  const region = document.getElementById(ID)
  if (!region) return
  // Emptied first and refilled next frame, so the same message twice is read twice.
  region.textContent = ''
  requestAnimationFrame(() => {
    region.textContent = message
  })
}

export function Keyboard() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const open = (document.activeElement as HTMLElement | null)?.closest<HTMLDetailsElement>('details[open]')
      if (!open) return
      open.open = false
      open.querySelector<HTMLElement>(':scope > summary')?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return <p id={ID} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
}
