'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import '@/styles/catalog.css'

/**
 * Motion for the category pages and every product grid outside the homepage
 * (catalog, "You may also like", "Recently viewed"). Native scrolling, no Lenis.
 *
 * Rules this file keeps (the same as HomeMotion):
 *  - transform and opacity only, plus stroke-dashoffset for branch draws;
 *  - the markup is complete without JS and under reduced motion: every hidden
 *    start state is written here, right before it plays, and only inside the
 *    no-preference layer;
 *  - one writer per element. Node owners on a card (ProductCard):
 *      .pcard-cell    layout slide and fold-away exit   motion/react (CatalogControls)
 *      .pcard-lift    landing (x, y, rotation, opacity)  landCard
 *      .pcard-frame   rest tilt (CSS --tilt)
 *      .pcard-face    hover lift (CSS)
 *      .pcard-shadow  lands under the frame (x, y, opacity)
 *      .pcard-tape    tape goes on (opacity, scale, rotation)
 *      .price-tag     swings in on its string (rotation, opacity)
 *      .size-stamp    pressed on (scale, opacity); the face keeps its CSS hover
 *      .stem / .leaf-grow  branch draws, leaves open
 *      .leaf-sway     breeze (CSS, while the card carries .live)
 *  - every layer is a gsap.matchMedia context and is reverted on unmount, since
 *    these pages are reached by client navigation.
 */

const NO_RM = '(prefers-reduced-motion: no-preference)'

/** Anything with its top edge below the screen has not been seen yet, so it may start hidden. */
const belowFold = (el: Element) => el.getBoundingClientRect().top > innerHeight

const restOf = (el: Element, name: string) =>
  parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0

/** The stem draws up from the soil and the leaves open bottom to top as it passes them. */
function growBranch(svg: SVGSVGElement, duration: number) {
  const tl = gsap.timeline()
  const stems = Array.from(svg.querySelectorAll<SVGPathElement>('.stem, .stem-shadow'))
  const len = Math.ceil(stems[0]?.getTotalLength() ?? 0)
  if (len)
    tl.fromTo(
      stems,
      { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration, ease: 'power1.inOut' },
      0,
    )
  const buds = Array.from(svg.querySelectorAll<SVGGElement>('.leaf-grow'))
  buds.forEach((g, i) => {
    const bloom = g.classList.contains('bloom')
    // Origin first, on its own: set inside the tween, smoothOrigin would shift the leaf off its node.
    gsap.set(g, { transformOrigin: bloom ? '50% 50%' : '50% 100%' })
    tl.fromTo(
      g,
      { scale: 0, rotation: bloom ? -90 : (i % 2 ? 1 : -1) * 30 },
      { scale: 1, rotation: 0, duration: bloom ? 0.4 : 0.3, ease: 'back.out(2.2)' },
      (duration * (i + 1)) / (buds.length + 1),
    )
  })
  return tl
}

/**
 * One print lands on the board: it drops in offset and turned, settles onto its
 * hard shadow, the tape goes on, the sprig draws and opens, the name rises, the
 * price tag swings in on its string and the size stamps press on. k scales the
 * whole thing (a short entrance for cards already on screen). Built with
 * fromTo, so the hidden start state is written the moment this is called.
 */
function landCard(card: HTMLElement, k: number) {
  const lift = card.querySelector<HTMLElement>('.pcard-lift')
  const shadow = card.querySelector<HTMLElement>('.pcard-shadow')
  const tape = card.querySelector<HTMLElement>('.pcard-tape')
  const name = card.querySelector<HTMLElement>('.pcard-name')
  const tag = card.querySelector<HTMLElement>('.price-tag')
  const stamps = Array.from(card.querySelectorAll<HTMLElement>('.size-stamp'))
  const branch = card.querySelector<SVGSVGElement>('.branch')
  const parts = [lift, shadow, tape, name, tag, ...stamps].filter(Boolean) as HTMLElement[]
  const dir = restOf(card, '--tilt') < 0 ? -1 : 1

  const tl = gsap.timeline({
    defaults: { ease: 'power2.out' },
    // CSS holds the same rest pose, so the inline styles go once it has landed.
    onComplete: () => {
      gsap.set(parts, { clearProps: 'all' })
    },
  })
  if (lift)
    tl.fromTo(
      lift,
      { opacity: 0, x: -6, y: -22, rotation: dir * 5 },
      { opacity: 1, x: 0, y: 0, rotation: 0, duration: 0.55 * k, ease: 'power3.out' },
      0,
    )
  if (shadow) tl.fromTo(shadow, { opacity: 0, x: -4, y: -5 }, { opacity: 1, x: 0, y: 0, duration: 0.3 * k }, 0.25 * k)
  if (tape) {
    const tr = restOf(tape, '--tape')
    tl.fromTo(
      tape,
      { opacity: 0, scale: 1.2, rotation: tr + 8 },
      { opacity: 1, scale: 1, rotation: tr, duration: 0.3 * k, ease: 'back.out(2)' },
      0.42 * k,
    )
  }
  if (branch) tl.add(growBranch(branch, 0.75 * k), 0.2 * k)
  if (name) tl.fromTo(name, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 * k }, 0.32 * k)
  if (tag) {
    const rest = Number(gsap.getProperty(tag, 'rotation')) || 0
    gsap.set(tag, { transformOrigin: '0% 50%' }) // swings from its punched hole
    tl.fromTo(
      tag,
      { opacity: 0, rotation: rest - 22 },
      { opacity: 1, rotation: rest, duration: 0.8 * k, ease: 'elastic.out(1, 0.45)' },
      0.44 * k,
    )
  }
  if (stamps.length)
    tl.fromTo(
      stamps,
      { opacity: 0, scale: 1.4 },
      { opacity: 1, scale: 1, duration: 0.22 * k, ease: 'power3.in', stagger: 0.05 * k },
      0.52 * k,
    )
  return tl
}

/**
 * The product grid. Server-rendered children (cards are in the initial HTML);
 * after hydration it lands every card once. Cards on screen play a short
 * entrance at once, cards below the fold land a row at a time as they scroll
 * in. Cards added later (a filter, or Recently viewed filling in) are picked up
 * by a MutationObserver and land the same way. Keyboard focus on a card that
 * is still landing (or waiting to) finishes its landing at once.
 */
export function CardGrid({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const grid = ref.current
    if (!grid) return
    gsap.registerPlugin(ScrollTrigger)
    const mm = gsap.matchMedia()

    mm.add(NO_RM, (_ctx, contextSafe) => {
      const seen = new WeakSet<Element>()
      const landings = new WeakMap<Element, gsap.core.Timeline>()
      let refresh: gsap.core.Tween | null = null
      const onFocus = (event: FocusEvent) => {
        const card = (event.target as Element).closest('.pcard')
        if (card) landings.get(card)?.progress(1)
      }
      grid.addEventListener('focusin', onFocus)

      const scan = () => {
        const fresh = Array.from(grid.querySelectorAll<HTMLElement>('.pcard')).filter((c) => !seen.has(c))
        if (!fresh.length) return
        fresh.forEach((c) => {
          seen.add(c)
          // Leaves sway only while the card is on screen.
          ScrollTrigger.create({ trigger: c, start: 'top bottom', end: 'bottom top', toggleClass: 'live' })
        })
        fresh
          .filter((c) => !belowFold(c))
          .forEach((c, i) => landings.set(c, landCard(c, 0.65).delay(0.05 + Math.min(i, 7) * 0.06)))
        const later = fresh.filter(belowFold)
        if (!later.length) return
        later.forEach((c) => landings.set(c, landCard(c, 1).pause()))
        ScrollTrigger.batch(later, {
          start: 'top 92%',
          once: true,
          interval: 0.1,
          onEnter: (batch) =>
            batch.forEach((c, i) => gsap.delayedCall(i * 0.08, () => landings.get(c)?.play())),
        })
      }

      scan()
      // A filter moves, adds or removes cells; the cells slide by transform, so
      // trigger positions are measured again once the slide (0.45s) is done.
      const mo = new MutationObserver(
        contextSafe!(() => {
          scan()
          refresh?.kill()
          refresh = gsap.delayedCall(0.6, () => ScrollTrigger.refresh())
        }) as MutationCallback,
      )
      mo.observe(grid, { childList: true })

      return () => {
        mo.disconnect()
        grid.removeEventListener('focusin', onFocus)
        grid.querySelectorAll('.live').forEach((c) => c.classList.remove('live'))
      }
    })

    return () => mm.revert()
  }, [])

  return (
    <div ref={ref} className={`pcard-grid${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  )
}

/**
 * Category hero: the h1 chars drop onto the board (from above, turned, settling
 * with back.out, once), the count and blurb rise after, and the cut-paper
 * branches grow up the right of the hero. Renders nothing; it finds .cat-hero.
 * Anti-flash: the page renders <PaperWait /> before the hero, and this lifts
 * html.paper-wait once the start states are written (catalog.css holds the
 * intro hidden meanwhile, 2s at most).
 */
export function CatalogHeroMotion() {
  useLayoutEffect(() => {
    const hero = document.querySelector<HTMLElement>('.cat-hero')
    const h1 = hero?.querySelector<HTMLElement>('h1')
    if (!hero || !h1) return
    gsap.registerPlugin(SplitText)
    const html = document.documentElement
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: reduce)', () => {
      html.classList.remove('paper-wait')
    })

    mm.add(NO_RM, () => {
      html.classList.add('paper-wait') // client navigation: the inline script did not run
      const split = SplitText.create(h1, { type: 'chars', charsClass: 'cc' })
      const chars = split.chars as HTMLElement[]
      // Each char settles a hair off true, like letters laid by hand; seeded by position so it never jumps.
      const rest = chars.map((_, i) => +(((i * 7) % 5) * 0.4 - 0.8).toFixed(2))
      const after = Array.from(hero.querySelectorAll<HTMLElement>('.hero-copy > p'))

      const tl = gsap.timeline({ delay: 0.05 })
      tl.fromTo(
        chars,
        { yPercent: -110, opacity: 0, rotation: (i: number) => (i % 2 ? 1 : -1) * (8 + ((i * 3) % 4)) },
        {
          yPercent: 0,
          opacity: 1,
          rotation: (i: number) => rest[i],
          duration: 0.7,
          ease: 'back.out(1.4)',
          stagger: 0.05,
        },
        0,
      )
      if (after.length)
        tl.fromTo(
          after,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out', clearProps: 'opacity,transform' },
          0.4,
        )
      hero.querySelectorAll<SVGSVGElement>('.branch').forEach((svg, k) => tl.add(growBranch(svg, 1.1), 0.15 + k * 0.3))
      hero.classList.add('live')
      html.classList.remove('paper-wait') // start states are written, before paint

      return () => {
        html.classList.remove('paper-wait')
        split.revert()
        hero.classList.remove('live')
      }
    })

    return () => mm.revert()
  }, [])

  return null
}
