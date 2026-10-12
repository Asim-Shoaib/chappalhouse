import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

/**
 * Shared paper-craft motion for the product, cart, checkout and policy pages
 * (PdpMotion, CommerceMotion, InfoMotion). Same language as HomeMotion: chars
 * tossed onto the board, branches drawn up from the soil, cards landing once.
 * Transform, opacity and stroke-dashoffset only. Every caller runs inside a
 * gsap.matchMedia layer, records its splits and reverts them on cleanup.
 */

export const NO_RM = '(prefers-reduced-motion: no-preference)'

export const registerPaper = () => gsap.registerPlugin(ScrollTrigger, SplitText)

/** System fonts here, but a split must still measure the font that will stay. */
export const fontsReady = () =>
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1100))])

/** Only elements wholly below the fold get a hidden start state. */
export const belowFold = (el: Element) => el.getBoundingClientRect().top > innerHeight

const seeded = (seed: number) => {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

/**
 * Chars drop onto the board in a shuffled order and land on small crooked
 * rest angles. The split is pushed onto `splits` so the caller reverts it.
 * Kerning and ligatures are off on these headings in CSS, so split and
 * unsplit text are the same width.
 */
export function dropChars(tl: gsap.core.Timeline, el: HTMLElement, splits: SplitText[], at = 0, seed = 11) {
  const split = SplitText.create(el, { type: 'words,chars', wordsClass: 'pw', charsClass: 'pc' })
  splits.push(split)
  const chars = split.chars as HTMLElement[]
  const rnd = seeded(seed)
  const order = chars.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const step = Math.min(0.026, 0.75 / Math.max(1, chars.length))
  const delay = order.map((k) => k * step)
  const rest = chars.map(() => (rnd() - 0.5) * 1.6)
  tl.fromTo(
    chars,
    { y: -54, rotation: (i: number) => (i % 2 ? 1 : -1) * (7 + rnd() * 4), scale: 1.14 },
    {
      y: 0,
      rotation: (i: number) => rest[i],
      scale: 1,
      duration: 0.58,
      ease: 'back.out(1.6)',
      stagger: (i: number) => delay[i],
    },
    at,
  ).fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'none', stagger: (i: number) => delay[i] }, at)
}

/**
 * A Branch (components/Branch.tsx) draws up from its root and its leaves open
 * as the stem passes them. Skips a branch that is not displayed. Leaf origins
 * are set on their own before the tween (never inside it, on SVG).
 */
export function growBranch(tl: gsap.core.Timeline, svg: SVGSVGElement, at = 0, duration = 1.2) {
  if (!svg.getBoundingClientRect().width) return
  const stems = Array.from(svg.querySelectorAll<SVGPathElement>('.stem, .stem-shadow'))
  const len = Math.ceil(stems[0]?.getTotalLength() ?? 0)
  if (len) {
    tl.fromTo(
      stems,
      { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration, ease: 'power1.inOut' },
      at,
    )
  }
  const buds = Array.from(svg.querySelectorAll<SVGGElement>('.leaf-grow'))
  buds.forEach((g, i) => {
    const bloom = g.classList.contains('bloom')
    gsap.set(g, { transformOrigin: bloom ? '50% 50%' : '50% 100%' })
    tl.fromTo(
      g,
      { scale: 0, rotation: bloom ? -90 : (i % 2 ? 1 : -1) * 30 },
      { scale: 1, rotation: 0, duration: bloom ? 0.36 : 0.3, ease: 'back.out(2.2)' },
      at + 0.1 + (duration * (i + 1)) / (buds.length + 1),
    )
  })
}

/**
 * Keyboard focus never lands on something still hidden: the first focusin
 * inside `box` finishes `anim` at once and detaches it from the scroll (a
 * scrubbed or scroll-started entrance stays finished). Returns the cleanup.
 */
export function finishOnFocus(box: Element | null | undefined, anim: gsap.core.Animation) {
  if (!box) return () => {}
  const finish = () => {
    anim.scrollTrigger?.kill(false, true)
    anim.progress(1)
  }
  box.addEventListener('focusin', finish, { once: true })
  return () => box.removeEventListener('focusin', finish)
}

/**
 * Elements below the fold land once as they reach the screen; the ones
 * already on screen are returned so the caller can play them in its intro.
 * Inline styles are cleared once landed, so CSS rest poses (the individual
 * `rotate` property) take over again. Keyboard focus inside one that has not
 * landed yet puts it straight at rest.
 */
export function landOnce(els: HTMLElement[], from: gsap.TweenVars, step = 0.07): HTMLElement[] {
  const fresh = els.filter(belowFold)
  if (fresh.length) {
    gsap.set(fresh, from)
    fresh.forEach((el) =>
      el.addEventListener(
        'focusin',
        () => {
          gsap.killTweensOf(el)
          gsap.set(el, { clearProps: 'opacity,transform' })
        },
        { once: true },
      ),
    )
    ScrollTrigger.batch(fresh, {
      start: 'top 96%',
      once: true,
      interval: 0.1,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          duration: 0.5,
          ease: 'back.out(1.4)',
          stagger: step,
          clearProps: 'opacity,transform',
        }),
    })
  }
  return els.filter((el) => !fresh.includes(el))
}

/**
 * A Branch drawn by the scroll instead of the clock: growBranch on a scrubbed
 * timeline, so the stem lengthens from its root as the reader scrolls past and
 * each leaf opens as the stem reaches it (a hanging, flipped Branch therefore
 * draws downward, its lowest leaf last). Its leaves sway (.live on the svg)
 * only while it is on screen. Positions are measured by ScrollTrigger on
 * refresh and resize, never per frame. Skips a branch that is not displayed.
 */
export function scrubBranch(svg: SVGSVGElement, vars: ScrollTrigger.Vars = {}) {
  if (!svg.getBoundingClientRect().width) return
  const tl = gsap.timeline({
    scrollTrigger: { trigger: svg, start: 'top 92%', end: 'bottom 40%', scrub: 0.6, ...vars },
  })
  growBranch(tl, svg, 0, 1)
  ScrollTrigger.create({
    trigger: svg,
    start: 'top bottom',
    end: 'bottom top',
    toggleClass: { targets: svg, className: 'live' },
  })
}
