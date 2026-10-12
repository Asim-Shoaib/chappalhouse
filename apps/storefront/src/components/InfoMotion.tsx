'use client'

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import type { SplitText } from 'gsap/SplitText'
import { Branch } from './Branch'
import { NO_RM, dropChars, finishOnFocus, fontsReady, growBranch, landOnce, registerPaper } from '@/lib/paperMotion'
import '@/styles/paper-pages.css'

/**
 * Policy pages (shipping, returns, faq, privacy, terms): the article is a
 * sheet pinned to the board. Drop it first inside the article, after
 * <PaperWait />: it renders the tape and the margin branch (desktop only,
 * in the gutter) and plays the intro once:
 *   h1 chars         drop onto the board
 *   eyebrow, lede    fade down after them
 *   .info-tape       tape goes on
 *   .info-branch     grows down the margin (the svg hangs flipped in CSS)
 *   h2 + its paragraphs, faq items   land once as they scroll in
 * Words and markup stay server-rendered; reduced motion and no JS get the
 * static sheet with the branch drawn. Keyboard focus inside the sheet finishes
 * the intro, and inside a block that has not landed, lands it at once.
 */
export function InfoMotion({ seed }: { seed: string }) {
  const tape = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const sheet = tape.current?.closest<HTMLElement>('.info-sheet')
    if (!sheet) return
    const html = document.documentElement
    registerPaper()
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: reduce)', () => {
      html.classList.remove('paper-wait')
    })

    mm.add(NO_RM, (ctx) => {
      html.classList.add('paper-wait')
      sheet.classList.add('live')
      let alive = true
      let unfocus = () => {}
      const splits: SplitText[] = []

      fontsReady().then(() => {
        if (!alive) return
        ctx.add(() => {
          const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
          const h1 = sheet.querySelector<HTMLElement>('h1')
          const intro = Array.from(sheet.querySelectorAll<HTMLElement>(':scope > .eyebrow, :scope > .lede'))
          if (h1) dropChars(tl, h1, splits, 0.05)
          if (intro.length) tl.fromTo(intro, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.12 }, 0.35)
          if (tape.current)
            tl.fromTo(tape.current, { opacity: 0, scale: 0.9, rotation: 6 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.28 }, 0.2)
          const branch = sheet.querySelector<SVGSVGElement>('.info-branch')
          if (branch) growBranch(tl, branch, 0.3, 1.6)

          // Each h2 and the paragraphs under it land together; faq items one by one.
          const blocks = Array.from(sheet.querySelectorAll<HTMLElement>(':scope > h2, :scope > details'))
          const landing = landOnce(blocks, { opacity: 0, y: 22, rotation: -1.2 }, 0)
          const now: HTMLElement[] = [...landing]
          blocks.forEach((h2) => {
            if (h2.tagName !== 'H2') return
            const group: HTMLElement[] = []
            for (let el = h2.nextElementSibling; el && el.tagName === 'P'; el = el.nextElementSibling)
              group.push(el as HTMLElement)
            if (!group.length) return
            if (landing.includes(h2)) now.push(...group)
            else landOnceWith(h2, group)
          })
          if (now.length)
            tl.fromTo(
              now,
              { opacity: 0, y: 22 },
              { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, clearProps: 'opacity,transform' },
              0.6,
            )

          unfocus = finishOnFocus(sheet, tl)
          html.classList.remove('paper-wait')
        })
      })

      return () => {
        alive = false
        unfocus()
        html.classList.remove('paper-wait')
        sheet.classList.remove('live')
        splits.splice(0).forEach((s) => s.revert())
      }
    })

    return () => mm.revert()
  }, [])

  return (
    <>
      <i ref={tape} className="info-tape" aria-hidden="true" />
      <Branch seed={seed} kind="main" className="paper-branch info-branch" />
    </>
  )
}

/** Paragraphs follow their heading: hidden with it, landing just after it on the same trigger. */
function landOnceWith(h2: HTMLElement, group: HTMLElement[]) {
  gsap.set(group, { opacity: 0, y: 22 })
  const tween = gsap.to(group, {
    opacity: 1,
    y: 0,
    duration: 0.5,
    stagger: 0.07,
    delay: 0.12,
    ease: 'power2.out',
    clearProps: 'opacity,transform',
    scrollTrigger: { trigger: h2, start: 'top 96%', once: true },
  })
  // A link in one of these paragraphs focused before they land: they land now.
  group.forEach((p) => finishOnFocus(p, tween))
}
