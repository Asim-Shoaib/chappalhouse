'use client'

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import type { SplitText } from 'gsap/SplitText'
import { NO_RM, dropChars, fontsReady, growBranch, registerPaper } from '@/lib/paperMotion'
import '@/styles/paper-pages.css'

/**
 * Cart and checkout entrance, once: the h1 chars drop, then the rest of the
 * page fades up (the checkout form as one piece; nothing moves inside its
 * fields). The cart lines themselves are CartPage's (motion/react).
 *
 * Both pages render a loading state until the stored cart is read, so this
 * waits for the real page (a .commerce-page without the .muted loading line)
 * and starts in the same task React inserts it, before it paints. Rendered
 * as a sibling of the page component, inside the .commerce-scope wrapper.
 * Keyboard focus inside the page puts everything at rest at once (before the
 * fonts are in, the entrance is dropped; after, it is finished).
 */
export function CommerceMotion() {
  const marker = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const scope = marker.current?.closest<HTMLElement>('.commerce-scope')
    if (!scope) return
    registerPaper()
    const mm = gsap.matchMedia()

    mm.add(NO_RM, (ctx) => {
      let alive = true
      let focused = false
      let unfocus = () => {}
      let mo: MutationObserver | null = null
      const splits: SplitText[] = []

      const start = () => {
        const page = scope.querySelector<HTMLElement>('.commerce-page')
        if (!page || page.querySelector(':scope > .muted')) return false
        mo?.disconnect()
        const h1 = page.querySelector<HTMLElement>('h1')
        const rest = Array.from(
          page.querySelectorAll<HTMLElement>(
            '.commerce-head > p, .checkout-form, .order-summary, .commerce-empty, :scope > p, :scope > .button',
          ),
        )
        ctx.add(() => {
          // Held until the split can measure the final font.
          if (h1) gsap.set(h1, { visibility: 'hidden' })
          gsap.set(rest, { opacity: 0, y: 24 })
        })
        let tl: gsap.core.Timeline | null = null
        const onFocus = () => {
          focused = true
          if (tl) tl.progress(1)
          else gsap.set([...rest, ...(h1 ? [h1] : [])], { clearProps: 'opacity,transform,visibility' })
        }
        page.addEventListener('focusin', onFocus, { once: true })
        unfocus = () => page.removeEventListener('focusin', onFocus)
        fontsReady().then(() => {
          if (!alive || focused) return
          ctx.add(() => {
            const intro = (tl = gsap.timeline({ defaults: { ease: 'power2.out' } }))
            if (h1) {
              gsap.set(h1, { visibility: 'visible' })
              dropChars(intro, h1, splits, 0, 23)
            }
            intro.to(rest, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, clearProps: 'opacity,transform' }, 0.25)
            page.querySelectorAll<SVGSVGElement>('.paper-branch').forEach((svg, k) => growBranch(intro, svg, 0.3 + k * 0.2, 1.1))
          })
        })
        return true
      }

      if (!start()) {
        mo = new MutationObserver(() => {
          start()
        })
        mo.observe(scope, { childList: true, subtree: true })
      }

      return () => {
        alive = false
        unfocus()
        mo?.disconnect()
        splits.splice(0).forEach((s) => s.revert())
      }
    })

    return () => mm.revert()
  }, [])

  return <span ref={marker} hidden />
}
