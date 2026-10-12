'use client'

import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import type { SplitText } from 'gsap/SplitText'
import { NO_RM, dropChars, fontsReady, growBranch, landOnce, registerPaper, scrubBranch } from '@/lib/paperMotion'
import '@/styles/paper-pages.css'

/**
 * Product page intro, once on load. Node owners:
 *   h1 chars         drop onto the board        here (SplitText, reverted on cleanup)
 *   .eyebrow         fades down                 here
 *   .price-tag       swings in on its string    here (CSS rest angle after)
 *   .pdp-tape        tape goes on               here
 *   .pdp-branch      draws up, leaves open      here (+ .live breeze, CSS)
 *   .pdp-vine        drawn down by the scroll   here (scrubBranch; .live while on screen)
 *   .trust li        stamps land                here, on scroll if below the fold
 *   .product-details details   land on scroll   here
 *   .pdp-image-wrap  paper shuffle              Gallery (motion/react)
 *   .pdp-add-label   "Added" stamp              BuyPanel (motion/react)
 * Reduced motion and no JS: the static page, branches drawn.
 */
export function PdpMotion() {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>('.pdp')
    if (!root) return
    const html = document.documentElement
    registerPaper()
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: reduce)', () => {
      html.classList.remove('paper-wait')
    })

    mm.add(NO_RM, (ctx) => {
      html.classList.add('paper-wait') // client navigation: the inline script did not run
      let alive = true
      const splits: SplitText[] = []
      const stage = root.querySelector<HTMLElement>('.pdp-stage')
      stage?.classList.add('live')

      fontsReady().then(() => {
        if (!alive) return
        ctx.add(() => {
          const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
          const h1 = root.querySelector<HTMLElement>('h1')
          const eyebrow = root.querySelector<HTMLElement>('.eyebrow')
          const tag = root.querySelector<HTMLElement>('.pdp-price .price-tag')
          const tape = root.querySelector<HTMLElement>('.pdp-tape')

          if (eyebrow) tl.fromTo(eyebrow, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4 }, 0)
          if (h1) dropChars(tl, h1, splits, 0.08)
          if (tag) {
            gsap.set(tag, { transformOrigin: '0% 50%' })
            tl.fromTo(
              tag,
              { opacity: 0, rotation: -18, y: -12 },
              { opacity: 1, rotation: -1.5, y: 0, duration: 0.7, ease: 'back.out(2.2)', clearProps: 'opacity,transform' },
              0.55,
            )
          }
          if (tape) tl.fromTo(tape, { opacity: 0, scale: 0.9, rotation: 6 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.28 }, 0.3)
          root.querySelectorAll<SVGSVGElement>('.pdp-branch').forEach((svg) => growBranch(tl, svg, 0.2, 1.3))

          // Hanging vines lengthen as the reader scrolls past them. The one at the
          // top is half grown on load and finishes once its foot leaves the screen.
          ;(root.parentElement ?? root).querySelectorAll<SVGSVGElement>('.pdp-vine').forEach((svg) =>
            scrubBranch(svg, svg.classList.contains('pdp-vine-gap') ? { start: 'top 60%', end: 'bottom top' } : {}),
          )

          // Trust stamps and the detail sections land once; the ones already on screen join the intro.
          const stamps = landOnce(Array.from(root.querySelectorAll<HTMLElement>('.trust li')), {
            opacity: 0,
            y: -14,
            rotation: (i: number) => (i % 2 ? 5 : -5),
            scale: 1.08,
          })
          if (stamps.length)
            tl.fromTo(
              stamps,
              { opacity: 0, y: -14, rotation: (i: number) => (i % 2 ? 5 : -5), scale: 1.08 },
              { opacity: 1, y: 0, rotation: 0, scale: 1, duration: 0.45, ease: 'back.out(1.6)', stagger: 0.08, clearProps: 'opacity,transform' },
              0.8,
            )
          const details = landOnce(Array.from(root.querySelectorAll<HTMLElement>('.product-details details')), {
            opacity: 0,
            y: 18,
          })
          if (details.length)
            tl.fromTo(details, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, clearProps: 'opacity,transform' }, 0.7)

          // Start states are written; the anti-flash hold can go in the same task.
          html.classList.remove('paper-wait')
        })
      })

      return () => {
        alive = false
        html.classList.remove('paper-wait')
        stage?.classList.remove('live')
        splits.splice(0).forEach((s) => s.revert())
      }
    })

    return () => mm.revert()
  }, [])

  return null
}
