'use client'

import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'

/**
 * Homepage motion, warm tactile / paper-craft. Mounted only by app/page.tsx;
 * everything it starts is undone on unmount, so /khussa and the rest of the
 * site carry no Lenis, ScrollTrigger, SplitText, classes or inline styles
 * from here.
 *
 * Rules this file keeps:
 *  - transform and opacity only (plus the --sh custom property, which is only
 *    ever read as an opacity);
 *  - the markup is complete and readable without JS. Hidden start states are
 *    written here, right before they play. The one exception is the hero,
 *    which is hidden before first paint by an inline script (see page.tsx and
 *    the "home-wait" rules in globals.css) because it is above the fold;
 *  - one writer per element (see the node chains in PaperShapes and the hero
 *    wrappers in page.tsx);
 *  - every matchMedia layer returns its own cleanup;
 *  - no scrubbed text on phones: a scrub rests half-faded wherever a finger
 *    stops, so phones get once-only entrances instead.
 */

const NO_RM = '(prefers-reduced-motion: no-preference)'
// A three-card stack plus its heading needs about 490px under the header, so the scenes need
// a viewport at least 580px tall; anything shorter gets plain landings instead.
// Desktop: pinned story band and pinned how-it-works deck.
const DECK = `${NO_RM} and (min-width: 900px) and (min-height: 580px)`
// Portrait phones: CSS sticky stack, no pins.
const PHONE = `${NO_RM} and (max-width: 899px) and (min-height: 580px)`
// Short screens (landscape phones, small windows): no room for a scene, plain landings.
const SHORT = `${NO_RM} and (max-height: 579px)`
const WIDE = `${NO_RM} and (min-width: 1100px) and (min-height: 501px)`
const COMPACT = `${NO_RM} and (max-width: 1099px), ${NO_RM} and (max-height: 500px)`
const FINE = `${NO_RM} and (hover: hover) and (pointer: fine)`

// Unit of scroll for the deck: one timeline unit is this fraction of a viewport.
const DECK_UNIT = 0.4
// The deck timeline in units. Card 1 sits alone, cards 2 and 3 rise, land (face
// steps onto its shadow, tape goes on) and the stack settles centred; the last
// HOLD units are the finished stack standing still (HOLD * DECK_UNIT = 30% of a viewport).
const HOLD = 0.75
const DECK_TOTAL = 4.9 + HOLD

/** One seeded stream per layer: a refresh or revert never re-rolls a scatter. */
const makeRnd = (seed: number) => {
  let s = seed
  return (a = 0, b = 1) => {
    s = (s * 16807) % 2147483647
    return a + (s / 2147483647) * (b - a)
  }
}

/** A random order of equally spaced start delays, shared by every tween that moves the same chars. */
const delaysFor = (n: number, step: number, rnd: () => number) => {
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx.map((k) => k * step)
}

/** Rest angle comes from CSS (--rest / --hero-rest / --rot / --tape), so the no-JS and reduced-motion look is the same. */
const restOf = (el: Element, name = '--rest') =>
  parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0

/**
 * Entrances start the moment an element's top edge reaches the bottom of the
 * screen, so anything on screen has always played (no blank strip at rest).
 * Only elements still wholly below the fold get a hidden start state.
 */
const belowFold = (el: Element) => el.getBoundingClientRect().top > innerHeight

/** Every split goes through one kit, so a layer's cleanup can revert them all. */
const makeKit = () => {
  const splits: SplitText[] = []
  return {
    mk: (target: Element, vars: SplitText.Vars) => {
      const s = SplitText.create(target, vars)
      splits.push(s)
      return s
    },
    revert: () => splits.splice(0).forEach((s) => s.revert()),
  }
}

/**
 * Recipe 7, softer: the card arrives offset up-left with no shadow, settles
 * onto its hard shadow and its rest angle. Batched so a row lands together.
 * When it has landed its inline styles are cleared (CSS holds the same rest
 * angle).
 */
function landCards(cards: HTMLElement[]) {
  const fresh = cards.filter((c) => belowFold(c))
  if (!fresh.length) return
  const rest = new Map(fresh.map((c) => [c, restOf(c)]))
  gsap.set(fresh, {
    opacity: 0,
    x: -3,
    y: -4,
    rotation: (i: number, el: HTMLElement) => rest.get(el)! + (i % 2 ? 3 : -3),
    '--sh': 0,
  })
  ScrollTrigger.batch(fresh, {
    start: 'top bottom',
    once: true,
    interval: 0.1,
    batchMax: 4,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        x: 0,
        y: 0,
        rotation: (_i: number, el: HTMLElement) => rest.get(el)!,
        '--sh': 1,
        duration: 0.35,
        ease: 'power2.out',
        stagger: 0.06,
        onComplete: () => {
          gsap.set(batch, { clearProps: 'opacity,transform,--sh' })
        },
      }),
  })
}

type Range = { start?: string | (() => string); end?: string | (() => string | number) }

/** Recipe 10: shapes ride their host's scroll (y) and sway (rotation). max caps y where there is no gutter. */
function rideShapes(host: HTMLElement, shapes: HTMLElement[], o: Range & { max?: number } = {}) {
  if (!shapes.length) return
  const reach = (s: number) => Math.min(((innerHeight + host.offsetHeight) * s) / 2, o.max ?? Infinity)
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: host,
      start: o.start ?? 'top bottom',
      end: o.end ?? 'bottom top',
      scrub: true,
      invalidateOnRefresh: true,
      refreshPriority: -1,
    },
  })
  shapes.forEach((el) => {
    const s = Number(el.dataset.s)
    const r = Number(el.dataset.r)
    const sway = el.querySelector('.shape-in')
    tl.fromTo(el, { y: () => reach(s) }, { y: () => -reach(s) }, 0)
    if (sway) tl.fromTo(sway, { rotation: -r / 2 }, { rotation: r / 2 }, 0)
  })
}

/** The deck and the phone stack both need every card one height and a peek strip that keeps each h3 readable. */
function fitCards(scene: HTMLElement, cards: HTMLElement[]) {
  scene.style.removeProperty('--dh')
  scene.style.removeProperty('--dp')
  let dh = 0
  let band = 0
  cards.forEach((c) => {
    dh = Math.max(dh, c.offsetHeight)
    const h3 = c.querySelector<HTMLElement>('h3')
    if (h3) band = Math.max(band, h3.offsetTop + h3.offsetHeight)
  })
  const dp = Math.ceil(band + 22)
  scene.style.setProperty('--dh', `${Math.ceil(dh)}px`)
  scene.style.setProperty('--dp', `${dp}px`)
  return { dh: Math.ceil(dh), dp }
}

export function HomeMotion() {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>('.home')
    if (!root) return
    const $ = (s: string) => root.querySelector<HTMLElement>(s)
    const $$ = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s))
    const html = document.documentElement
    const header = document.querySelector<HTMLElement>('.site-header')
    const hh = () => (header ? header.offsetHeight : 91)

    gsap.registerPlugin(ScrollTrigger, SplitText)
    ScrollTrigger.config({ ignoreMobileResize: true }) // the phone address bar must not trigger refreshes
    const mm = gsap.matchMedia()

    // Shared between layers.
    const fx = { vel: 0 }
    const pins: { story: ScrollTrigger | null; deck: ScrollTrigger | null } = { story: null, deck: null }
    const hero = {
      chars: [] as HTMLElement[],
      rest: [] as number[],
      done: false,
      waiters: new Set<() => void>(),
    }
    const fonts = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1150))])
    // Splits and measurements wait for fonts, inside the layer's context, unless the layer already ended.
    const afterFonts = (ctx: gsap.Context, alive: () => boolean, fn: () => void) => {
      fonts.then(() => {
        if (alive()) ctx.add(fn)
      })
    }

    // Reduced motion: nothing is hidden, moved or looped. The page is the static markup.
    mm.add('(prefers-reduced-motion: reduce)', () => {
      html.classList.remove('home-wait')
    })

    // ---------------------------------------------------------------------
    // Layer 1: every width. Hero intro, showcase, rail, spin.
    // ---------------------------------------------------------------------
    mm.add(NO_RM, (ctx) => {
      const undo: Array<() => void> = []
      let dead = false
      undo.push(() => {
        dead = true
      })
      const kit = makeKit()
      undo.push(kit.revert)

      html.classList.add('home-wait') // no-op on first load (inline script already did); needed after client navigation
      html.classList.add('home-live') // overscroll-behavior: none, for the spin
      const unwait = () => html.classList.remove('home-wait')
      undo.push(unwait, () => html.classList.remove('home-live'))

      // The header height drives the pinned scenes (--hh), kept live.
      const setHH = () => root.style.setProperty('--hh', `${hh()}px`)
      setHH()
      let ro: ResizeObserver | null = null
      if (header && 'ResizeObserver' in window) {
        ro = new ResizeObserver(setHH)
        ro.observe(header)
      }
      undo.push(() => {
        ro?.disconnect()
        root.style.removeProperty('--hh')
      })

      // Page-wide scroll velocity: read by the rail. Decays between scroll events.
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        refreshPriority: -100,
        onUpdate: (self) => {
          fx.vel = self.getVelocity()
        },
      })
      const decay = (_t: number, ms: number) => {
        fx.vel *= Math.exp((-Math.min(ms, 64) / 1000) * 7)
      }
      gsap.ticker.add(decay)
      undo.push(() => gsap.ticker.remove(decay))

      // ---- hero: chars tossed onto the board, card pinned with tape -------
      const heroIntro = () => {
        const h1 = $('.hero h1')
        const lede = $$('.hero-copy > :not(h1)')
        const figure = $('.hero-figure')
        const face = $('.hero-card')
        const shadow = $('.paper-shadow')
        const tapes = $$('.tape')
        // The 2s CSS fallback already revealed the hero (a very slow bundle): do not hide it again to replay.
        if (h1 && getComputedStyle(h1).visibility === 'visible') return
        const rnd = makeRnd(11)
        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })

        if (h1) {
          const chars = kit.mk(h1, { type: 'words,chars', wordsClass: 'hw', charsClass: 'hc' })
            .chars as HTMLElement[]
          const rest = chars.map(() => +rnd(-0.8, 0.8).toFixed(2))
          const d = delaysFor(chars.length, 0.025, rnd)
          tl.fromTo(
            chars,
            {
              y: -60,
              rotation: (i: number) => (i % 2 ? 1 : -1) * (8 + rnd() * 4),
              scale: 1.15,
            },
            {
              y: 0,
              rotation: (i: number) => rest[i],
              scale: 1,
              duration: 0.6,
              ease: 'back.out(1.6)',
              stagger: (i: number) => d[i],
            },
            0,
          ).fromTo(
            chars,
            { opacity: 0 },
            { opacity: 1, duration: 0.12, ease: 'none', stagger: (i: number) => d[i] },
            0,
          )
          tl.eventCallback('onComplete', () => {
            hero.chars = chars
            hero.rest = rest
            hero.done = true
            hero.waiters.forEach((w) => w())
          })
        }

        if (figure && face && shadow) {
          // Recipe 7 soft landing: offset up-left, no shadow, steps onto the hard shadow and settles.
          const rest = restOf(figure, '--hero-rest')
          tl.fromTo(figure, { rotation: rest + 3 }, { rotation: rest, duration: 0.35 }, 0.15)
            .fromTo(face, { x: -3, y: -4 }, { x: 0, y: 0, duration: 0.35 }, 0.15)
            .fromTo(shadow, { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.15)
            // Tape goes on once the card has landed.
            .fromTo(
              tapes,
              {
                scale: 0.9,
                opacity: 0,
                rotation: (i: number, el: Element) => restOf(el, '--rot') + (i % 2 ? 6 : -6),
              },
              {
                scale: 1,
                opacity: 1,
                rotation: (_i: number, el: Element) => restOf(el, '--rot'),
                duration: 0.25,
                stagger: 0.08,
              },
              0.5,
            )
        }

        // Eyebrow, paragraph, buttons: one short fade.
        tl.fromTo(
          lede,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, clearProps: 'opacity,transform' },
          0.35,
        )
      }
      undo.push(() => {
        hero.chars = []
        hero.rest = []
        hero.done = false
        hero.waiters.clear()
      })

      // ---- photo rail: base drift, scroll velocity speeds it and sets its direction -----
      const railSetup = () => {
        const track = $('.photo-rail-track')
        const section = $('.photo-rail')
        const items = $$('.photo-rail-item')
        if (!track || !section || items.length < 4) return
        const half = items.length / 2
        let period = 0
        let x = 0
        let push = 0
        let hover = 1
        let hoverTo = 1
        let live = false
        const measure = () => {
          // One whole copy, gaps included: the loop is seamless.
          period = items[half].offsetLeft - items[0].offsetLeft
        }
        measure()
        root.classList.add('rail-js') // CSS animation off; the ticker drives the track
        const onEnter = () => (hoverTo = 0)
        const onLeave = () => (hoverTo = 1)
        section.addEventListener('mouseenter', onEnter)
        section.addEventListener('mouseleave', onLeave)
        section.addEventListener('focusin', onEnter)
        section.addEventListener('focusout', onLeave)
        const st = ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => (live = self.isActive),
        })
        ScrollTrigger.addEventListener('refresh', measure)
        const tick = (_t: number, ms: number) => {
          if (!live || !period) return
          const dt = Math.min(ms, 64) / 1000
          push += (gsap.utils.clamp(-3, 3, fx.vel / 500) - push) * Math.min(1, dt * 10)
          hover += (hoverTo - hover) * Math.min(1, dt * 6)
          // Base: one copy per 64s, left. Velocity adds to it and can turn it round while scrolling up.
          x = (((x + (period / 64) * (1 + push) * hover * dt) % period) + period) % period
          gsap.set(track, { x: -x })
        }
        gsap.ticker.add(tick)
        undo.push(() => {
          gsap.ticker.remove(tick)
          ScrollTrigger.removeEventListener('refresh', measure)
          st.kill()
          section.removeEventListener('mouseenter', onEnter)
          section.removeEventListener('mouseleave', onLeave)
          section.removeEventListener('focusin', onEnter)
          section.removeEventListener('focusout', onLeave)
          gsap.set(track, { clearProps: 'transform' })
          root.classList.remove('rail-js')
        })
      }

      // ---- showcase: each pair is presented as it crosses the screen ----
      // The branch draws up from the soil and its leaves open bottom to top;
      // the frame rises, straightens onto its rest tilt, holds through the
      // middle of the screen and leans away as it leaves. Tape and the name
      // plate land once. No text is scrubbed.
      const exhibitsSetup = () => {
        $$('.exhibit').forEach((ex, n) => {
          const stage = ex.querySelector<HTMLElement>('.exhibit-stage')
          const lift = ex.querySelector<HTMLElement>('.exhibit-lift')
          const tape = ex.querySelector<HTMLElement>('.ex-tape')
          const plate = Array.from(ex.querySelectorAll<HTMLElement>('.exhibit-plate > *'))
          if (!stage || !lift) return
          const dir = n % 2 ? 1 : -1 // leans towards its main branch

          gsap.fromTo(
            lift,
            { y: 70, rotation: dir * 4, scale: 0.9 },
            {
              keyframes: [
                { y: 0, rotation: 0, scale: 1, duration: 0.42, ease: 'power2.out' },
                { duration: 0.22 },
                { y: -36, rotation: -dir * 2, scale: 0.96, duration: 0.36, ease: 'power1.in' },
              ],
              ease: 'none',
              scrollTrigger: {
                trigger: stage,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.6,
                refreshPriority: -1,
              },
            },
          )

          const grow = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: stage,
              start: 'top 92%',
              end: 'center 52%',
              scrub: 0.6,
              refreshPriority: -1,
            },
          })
          ex.querySelectorAll<SVGSVGElement>('.branch').forEach((svg, k) => {
            const stems = Array.from(svg.querySelectorAll<SVGPathElement>('.stem, .stem-shadow'))
            const len = Math.ceil(stems[0]?.getTotalLength() ?? 0)
            if (len) grow.fromTo(stems, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1 }, k * 0.15)
            // DOM order is bottom to top, so leaves open as the stem passes them.
            const buds = Array.from(svg.querySelectorAll<SVGGElement>('.leaf-grow'))
            buds.forEach((g, i) => {
              const bloom = g.classList.contains('bloom')
              // Origin first, on its own: set inside the tween, smoothOrigin would
              // shift the leaf off its node to compensate for the change.
              gsap.set(g, { transformOrigin: bloom ? '50% 50%' : '50% 100%' })
              grow.fromTo(
                g,
                { scale: 0, rotation: bloom ? -90 : (i % 2 ? 1 : -1) * 30 },
                {
                  scale: 1,
                  rotation: 0,
                  duration: bloom ? 0.3 : 0.24,
                  ease: 'back.out(2.2)',
                },
                k * 0.15 + 0.12 + (0.78 * (i + 1)) / (buds.length + 1),
              )
            })
          })

          // Leaves sway only while the pair is on screen.
          ScrollTrigger.create({
            trigger: ex,
            start: 'top bottom',
            end: 'bottom top',
            toggleClass: 'live',
            refreshPriority: -1,
          })

          const once = [tape, ...plate].filter(Boolean) as HTMLElement[]
          if (!once.length || !belowFold(ex)) return
          const tr = tape ? restOf(tape, '--rot') : 0
          if (tape) gsap.set(tape, { opacity: 0, scale: 0.9, rotation: tr + 6 })
          if (plate.length) gsap.set(plate, { opacity: 0, y: 14 })
          ScrollTrigger.create({
            trigger: stage,
            start: 'top 62%',
            once: true,
            refreshPriority: -1,
            onEnter: () => {
              if (tape)
                gsap.to(tape, { opacity: 1, scale: 1, rotation: tr, duration: 0.3, ease: 'power2.out', clearProps: 'opacity,transform' })
              if (plate.length)
                gsap.to(plate, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out', delay: 0.1, clearProps: 'opacity,transform' })
            },
          })
        })
        undo.push(() => {
          gsap.set($$('.exhibit-lift, .ex-tape, .exhibit-plate > *, .branch .leaf-grow'), { clearProps: 'all' })
          gsap.set($$('.branch .stem, .branch .stem-shadow'), { clearProps: 'strokeDasharray,strokeDashoffset' })
          $$('.exhibit').forEach((ex) => ex.classList.remove('live'))
        })
      }

      // ---- overscroll spin: at the page ends the page holds still and the paper shapes keep turning ----
      const spinSetup = () => {
        const spinners = $$('.shape .sp')
        if (!spinners.length) return
        const dirs = spinners.map((_, i) => (i % 2 ? -1 : 1))
        let spinV = 0
        let spinA = 0
        let touchY = 0
        const atLimit = (dy: number) =>
          (dy < 0 && scrollY <= 0.5) || (dy > 0 && scrollY >= ScrollTrigger.maxScroll(window) - 0.5)
        const push = (dy: number) => {
          if (atLimit(dy)) spinV = gsap.utils.clamp(-900, 900, spinV + dy * 2.2)
        }
        const onWheel = (e: WheelEvent) => push(e.deltaY)
        const onStart = (e: TouchEvent) => {
          touchY = e.touches[0].clientY
        }
        const onMove = (e: TouchEvent) => {
          const y = e.touches[0].clientY
          push(touchY - y)
          touchY = y
        }
        addEventListener('wheel', onWheel, { passive: true })
        addEventListener('touchstart', onStart, { passive: true })
        addEventListener('touchmove', onMove, { passive: true })
        const tick = (_t: number, ms: number) => {
          if (Math.abs(spinV) < 4) {
            spinV = 0
            return
          }
          const dt = Math.min(ms, 64) / 1000
          spinA = (spinA + spinV * dt) % 3600
          spinV *= Math.exp(-dt * 4.6)
          spinners.forEach((el, i) => (el.style.rotate = `${(spinA * dirs[i]).toFixed(1)}deg`))
        }
        gsap.ticker.add(tick)
        undo.push(() => {
          gsap.ticker.remove(tick)
          removeEventListener('wheel', onWheel)
          removeEventListener('touchstart', onStart)
          removeEventListener('touchmove', onMove)
          spinners.forEach((el) => el.style.removeProperty('rotate'))
        })
      }

      afterFonts(
        ctx,
        () => !dead,
        () => {
          try {
            heroIntro()
          } finally {
            unwait() // the hero's start states are inline now, so the class can go with no frame in between
          }
          exhibitsSetup()
          railSetup()
          spinSetup()
          ScrollTrigger.refresh()
        },
      )

      return () => undo.splice(0).reverse().forEach((f) => f())
    })

    // ---------------------------------------------------------------------
    // Fine pointer: Lenis smooth wheel, hero card tilt, shape drift.
    // Touch and coarse pointers keep native scrolling.
    // ---------------------------------------------------------------------
    mm.add(FINE, () => {
      const lenis = new Lenis()
      lenis.on('scroll', ScrollTrigger.update)
      const raf = (t: number) => lenis.raf(t * 1000) // one loop: GSAP's ticker drives Lenis
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)

      const tilt = $('.hero-tilt')
      const heroEl = $('.hero')
      const figure = $('.hero-figure')
      const drifts = $$('.shape-drift')
      if (tilt) gsap.set(tilt, { transformPerspective: 900 })
      const rx = tilt ? gsap.quickTo(tilt, 'rotationX', { duration: 0.7, ease: 'power3.out' }) : null
      const ry = tilt ? gsap.quickTo(tilt, 'rotationY', { duration: 0.7, ease: 'power3.out' }) : null
      const moves = drifts.map((el, i) => ({
        x: gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3.out' }),
        k: 0.5 + (i % 4) * 0.17,
        dir: i % 2 ? -1 : 1,
      }))
      let px = 0
      let py = 0
      let frame = 0
      const apply = () => {
        frame = 0
        const nx = (px / innerWidth - 0.5) * 2
        const ny = (py / innerHeight - 0.5) * 2
        moves.forEach((m) => {
          m.x(nx * 12 * m.k * m.dir)
          m.y(ny * 12 * m.k)
        })
        if (rx && ry && heroEl && figure) {
          const hb = heroEl.getBoundingClientRect()
          if (py >= hb.top && py <= hb.bottom) {
            const fb = figure.getBoundingClientRect()
            const dx = gsap.utils.clamp(-1, 1, (px - (fb.left + fb.width / 2)) / (innerWidth / 2))
            const dy = gsap.utils.clamp(-1, 1, (py - (fb.top + fb.height / 2)) / (innerHeight / 2))
            ry(dx * 4)
            rx(-dy * 4)
          } else {
            rx(0)
            ry(0)
          }
        }
      }
      const onMove = (e: PointerEvent) => {
        if (e.pointerType && e.pointerType !== 'mouse') return
        px = e.clientX
        py = e.clientY
        if (!frame) frame = requestAnimationFrame(apply)
      }
      const reset = () => {
        moves.forEach((m) => {
          m.x(0)
          m.y(0)
        })
        rx?.(0)
        ry?.(0)
      }
      addEventListener('pointermove', onMove, { passive: true })
      document.addEventListener('mouseleave', reset)
      return () => {
        removeEventListener('pointermove', onMove)
        document.removeEventListener('mouseleave', reset)
        if (frame) cancelAnimationFrame(frame)
        gsap.ticker.remove(raf)
        // destroy() leaves a 400ms native-scroll timer armed that re-adds
        // html.lenis on the next page; stop() resets first so it fires as a no-op.
        lenis.stop()
        lenis.destroy()
        gsap.ticker.lagSmoothing(500, 33)
      }
    })

    // ---------------------------------------------------------------------
    // Desktop: the story band is the page's one loud moment (pinned, chars
    // assemble on scrub, shapes fly in); the hero leaves char by char; section
    // heads assemble on scrub; how it works is a pinned deck.
    // ---------------------------------------------------------------------
    mm.add(DECK, (ctx) => {
      const undo: Array<() => void> = []
      let dead = false
      undo.push(() => {
        dead = true
      })
      const kit = makeKit()
      undo.push(kit.revert)
      root.classList.add('deck-on')
      undo.push(() => root.classList.remove('deck-on'))

      // ---- hero exit: chars peel up and scatter, the card tilts further and lifts ----
      const heroExit = () => {
        const chars = hero.chars
        const rest = hero.rest
        const h1 = $('.hero h1')
        const heroEl = $('.hero')
        const lift = $('.hero-lift')
        if (!chars.length || !h1 || !heroEl) return
        const rnd = makeRnd(23)
        const seed = chars.map(() => [rnd(), rnd(-1, 1)])
        const d = delaysFor(chars.length, 0.3 / Math.max(1, chars.length - 1), rnd)
        gsap
          .timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: h1,
              start: () => `top ${Math.round(innerHeight * 0.34)}px`,
              end: () => `bottom ${hh()}px`,
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          })
          .fromTo(
            chars,
            { y: 0, rotation: (i: number) => rest[i] },
            {
              y: (i: number) => -(30 + seed[i][0] * 50),
              rotation: (i: number) => seed[i][1] * 15,
              ease: 'power2.in',
              duration: 1,
              stagger: (i: number) => d[i],
            },
            0,
          )
          // opacity to 0 over the last 40% of the exit
          .fromTo(
            chars,
            { opacity: 1 },
            { opacity: 0, duration: 0.4, stagger: (i: number) => d[i] },
            0.9,
          )
        if (lift)
          gsap.fromTo(
            lift,
            { y: 0, rotation: 0 },
            {
              y: -90,
              rotation: -3,
              ease: 'none',
              scrollTrigger: {
                trigger: heroEl,
                start: 0,
                end: 'bottom top',
                scrub: 0.6,
                invalidateOnRefresh: true,
              },
            },
          )
      }
      // The exit only exists once the intro has finished with these chars: one owner at a time.
      let exitReady = false
      const waiter = () => {
        if (dead || exitReady) return
        exitReady = true
        ctx.add(heroExit)
      }
      if (hero.done) waiter()
      else hero.waiters.add(waiter)
      undo.push(() => hero.waiters.delete(waiter))

      const hdrH = () => hh()

      // ---- story band: pinned once, chars assemble on scrub, shapes fly in from the gutters ----
      const storyPinned = () => {
        const band = $('.story-band')
        const h2 = $('.story-band h2')
        if (!band || !h2) return
        const rnd = makeRnd(37)
        const pin = ScrollTrigger.create({
          trigger: band,
          start: () => `top ${hdrH()}px`,
          end: () => `+=${Math.round(innerHeight)}`,
          pin: true,
          invalidateOnRefresh: true,
          refreshPriority: 10,
        })
        pins.story = pin
        undo.push(() => {
          pins.story = null
        })
        const chars = kit.mk(h2, { type: 'words,chars', wordsClass: 'sw', charsClass: 'sc' })
          .chars as HTMLElement[]
        const rest = chars.map(() => +rnd(-0.8, 0.8).toFixed(2))
        const d = delaysFor(chars.length, 0.02, rnd)
        const off = chars.map(() => [
          (rnd() < 0.5 ? -1 : 1) * rnd(20, 90),
          (rnd() < 0.5 ? -1 : 1) * rnd(60, 150),
          (rnd() < 0.5 ? -1 : 1) * rnd(12, 28),
        ])
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: band,
            start: 'top 78%',
            // done a quarter of a screen before the pin lets go, so the finished line holds
            end: () => pin.end - Math.round(innerHeight * 0.25),
            scrub: 0.6,
            refreshPriority: 8,
          },
        })
        tl.fromTo(
          chars,
          {
            x: (i: number) => off[i][0],
            y: (i: number) => off[i][1],
            rotation: (i: number) => off[i][2],
            scale: 0.85,
          },
          {
            x: 0,
            y: 0,
            rotation: (i: number) => rest[i],
            scale: 1,
            ease: 'back.out(1.5)',
            duration: 1,
            stagger: (i: number) => d[i],
          },
          0,
        ).fromTo(
          chars,
          { opacity: 0 },
          { opacity: 1, duration: 0.15, ease: 'none', stagger: (i: number) => d[i] },
          0,
        )
        // Shapes fly in from their own side of the band and settle (their own node, .shape-fly).
        const flies = $$('.story-band .shape-fly')
        const bandMid = () => band.getBoundingClientRect().left + band.offsetWidth / 2
        flies.forEach((el, i) => {
          const sb = el.getBoundingClientRect()
          const dir = sb.left + sb.width / 2 < bandMid() ? -1 : 1
          tl.fromTo(
            el,
            {
              x: dir * Math.min(innerWidth * 0.4, 520),
              y: (i % 2 ? 1 : -1) * (80 + i * 30),
              rotation: dir * (40 + i * 10),
              opacity: 0,
            },
            { x: 0, y: 0, rotation: 0, opacity: 1, duration: 1, ease: 'power3.out' },
            0.1 + i * 0.12,
          )
        })
      }

      // ---- section heads: big display words, chars drop onto the board as the section enters ----
      const headsScrub = () => {
        const rnd = makeRnd(41)
        $$('.section-head h2').forEach((h2) => {
          const chars = kit.mk(h2, { type: 'chars', charsClass: 'dc' }).chars as HTMLElement[]
          const rest = chars.map(() => +rnd(-0.8, 0.8).toFixed(2))
          gsap
            .timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: h2,
                start: 'top 98%',
                end: 'top 68%',
                scrub: 0.6,
              },
            })
            .fromTo(
              chars,
              { yPercent: -100, rotation: (i: number) => (i % 2 ? 1 : -1) * (8 + ((i * 3) % 4)) },
              {
                yPercent: 0,
                rotation: (i: number) => rest[i],
                ease: 'back.out(1.4)',
                duration: 1,
                stagger: 0.1,
              },
              0,
            )
            .fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.25, stagger: 0.1 }, 0)
        })
      }

      // ---- how it works: a pinned deck, the whole fanned stack centred in the free screen ----
      const deck = () => {
        const scene = $('.how-band')
        const grid = $('.how-grid')
        const cards = $$('.how-card')
        if (!scene || !grid || cards.length < 2) return
        let P = 0
        const fit = () => {
          P = fitCards(scene, cards).dp
        }
        fit()
        ScrollTrigger.addEventListener('refreshInit', fit)
        undo.push(() => {
          ScrollTrigger.removeEventListener('refreshInit', fit)
          scene.style.removeProperty('--dh')
          scene.style.removeProperty('--dp')
        })
        // The y a card starts at so it is wholly below the scene (and clipped by it).
        const yBelow = () => scene.clientHeight - grid.offsetTop + 40
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: scene,
            start: () => `top ${hdrH()}px`,
            end: () => `+=${Math.round(DECK_TOTAL * DECK_UNIT * innerHeight)}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            refreshPriority: 9,
          },
        })
        pins.deck = tl.scrollTrigger ?? null
        undo.push(() => {
          pins.deck = null
        })
        tl.to({}, { duration: DECK_TOTAL }, 0)

        const [c0, c1, c2] = cards
        const faces = cards.map((c) => c.querySelector<HTMLElement>('.how-face'))
        const tapes = cards.map((c) => c.querySelector<HTMLElement>('.how-tape'))
        // Peek rule: each card lands exactly P below the one before it, and both always move
        // together, so the earlier card's title band is never covered. Card 1 starts alone and
        // centred (y = P in a stage of height card + 2P); every added card shifts the whole stack
        // up P/2, which keeps its bounding box centred; the finished stack is y = 0, P, 2P.
        const RISE = 0.9
        const R = [0.4, 2.8] // when cards 2 and 3 start to rise
        const L = R.map((t) => t + RISE) // when they land
        const S = L.map((t) => t + 0.6) // when the stack settles
        const eio = 'power2.inOut'

        // Landing: rise from below with a rotation settle from rest +-3, face steps onto its
        // hard shadow (recipe 7, softer), tape goes on after.
        const land = (card: HTMLElement, k: number, from: number, to: () => number) => {
          const face = faces[k]
          const tape = tapes[k]
          const rest = restOf(card)
          tl.fromTo(
            card,
            { y: yBelow, rotation: rest + (k % 2 ? -3 : 3) },
            { y: to, rotation: rest, duration: RISE, ease: 'power3.out' },
            from,
          )
          if (face) tl.fromTo(face, { x: -3, y: -4 }, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' }, from + RISE)
          tl.fromTo(card, { '--sh': 0 }, { '--sh': 1, duration: 0.3, ease: 'power2.out' }, from + RISE)
          if (tape) {
            const tr = restOf(tape, '--tape')
            tl.fromTo(
              tape,
              { scale: 0.9, opacity: 0, rotation: tr + 6 },
              { scale: 1, opacity: 1, rotation: tr, duration: 0.25, ease: 'power2.out' },
              from + RISE + 0.3,
            )
          }
        }

        // Card 1 sits alone and centred, then shifts up and shrinks as the others arrive.
        tl.fromTo(c0, { y: () => P, scale: 1 }, { y: () => P / 2, scale: 0.98, duration: 0.6, ease: eio }, S[0])
        tl.fromTo(c0, { y: () => P / 2, scale: 0.98 }, { y: 0, scale: 0.96, duration: 0.6, ease: eio, immediateRender: false }, S[1])

        land(c1, 1, R[0], () => 2 * P)
        tl.fromTo(c1, { y: () => 2 * P }, { y: () => 1.5 * P, duration: 0.6, ease: eio, immediateRender: false }, S[0])
        tl.fromTo(c1, { y: () => 1.5 * P, scale: 1 }, { y: () => P, scale: 0.98, duration: 0.6, ease: eio, immediateRender: false }, S[1])

        land(c2, 2, R[1], () => 2.5 * P)
        tl.fromTo(c2, { y: () => 2.5 * P }, { y: () => 2 * P, duration: 0.6, ease: eio, immediateRender: false }, S[1])
      }

      afterFonts(
        ctx,
        () => !dead,
        () => {
          storyPinned()
          headsScrub()
          deck()
          ScrollTrigger.refresh()
        },
      )

      return () => undo.splice(0).reverse().forEach((f) => f())
    })

    // ---------------------------------------------------------------------
    // Phones (portrait): no pins, no scrubbed text. Chars assemble once on
    // entry; how it works is a CSS sticky stack sized by fitCards.
    // ---------------------------------------------------------------------
    const entryChars = (kit: ReturnType<typeof makeKit>, rnd: (a?: number, b?: number) => number) => {
      const story = () => {
        const h2 = $('.story-band h2')
        if (!h2 || !belowFold(h2)) return
        const chars = kit.mk(h2, { type: 'words,chars', wordsClass: 'sw', charsClass: 'sc' })
          .chars as HTMLElement[]
        const rest = chars.map(() => +rnd(-0.8, 0.8).toFixed(2))
        const d = delaysFor(chars.length, 0.02, rnd)
        gsap
          .timeline({ scrollTrigger: { trigger: h2, start: 'top bottom', once: true } })
          .fromTo(
            chars,
            // a short drop: the gap above the headline is 24px, so chars never land on the eyebrow
            { y: -12, rotation: (i: number) => (i % 2 ? 1 : -1) * (10 + rnd() * 6), scale: 0.7 },
            {
              y: 0,
              rotation: (i: number) => rest[i],
              scale: 1,
              duration: 0.6,
              ease: 'back.out(1.6)',
              stagger: (i: number) => d[i],
            },
            0,
          )
          .fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'none', stagger: (i: number) => d[i] }, 0)
      }
      const heads = () => {
        $$('.section-head h2').forEach((h2) => {
          if (!belowFold(h2)) return
          const chars = kit.mk(h2, { type: 'chars', charsClass: 'dc' }).chars as HTMLElement[]
          const rest = chars.map(() => +rnd(-0.8, 0.8).toFixed(2))
          const fs = parseFloat(getComputedStyle(h2).fontSize)
          gsap
            .timeline({ scrollTrigger: { trigger: h2, start: 'top bottom', once: true } })
            .fromTo(
              chars,
              { y: -fs * 0.6, rotation: (i: number) => (i % 2 ? 1 : -1) * (8 + ((i * 3) % 4)) },
              { y: 0, rotation: (i: number) => rest[i], duration: 0.6, ease: 'back.out(1.4)', stagger: 0.05 },
              0,
            )
            .fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.05 }, 0)
        })
      }
      story()
      heads()
    }

    mm.add(PHONE, (ctx) => {
      const undo: Array<() => void> = []
      let dead = false
      undo.push(() => {
        dead = true
      })
      const kit = makeKit()
      undo.push(kit.revert)
      const scene = $('.how-band')
      const cards = $$('.how-card')
      root.classList.add('stack-on')
      undo.push(() => root.classList.remove('stack-on'))
      afterFonts(
        ctx,
        () => !dead,
        () => {
          entryChars(kit, makeRnd(53))
          if (scene && cards.length) {
            const fit = () => {
              fitCards(scene, cards)
            }
            fit()
            ScrollTrigger.addEventListener('refreshInit', fit)
            undo.push(() => {
              ScrollTrigger.removeEventListener('refreshInit', fit)
              scene.style.removeProperty('--dh')
              scene.style.removeProperty('--dp')
            })
          }
          ScrollTrigger.refresh()
        },
      )
      return () => undo.splice(0).reverse().forEach((f) => f())
    })

    // Short landscape: no room for a pinned scene or a sticky stack. Plain landings.
    mm.add(SHORT, (ctx) => {
      const undo: Array<() => void> = []
      let dead = false
      undo.push(() => {
        dead = true
      })
      const kit = makeKit()
      undo.push(kit.revert)
      afterFonts(
        ctx,
        () => !dead,
        () => {
          entryChars(kit, makeRnd(59))
          landCards($$('.how-card'))
          ScrollTrigger.refresh()
        },
      )
      return () => undo.splice(0).reverse().forEach((f) => f())
    })

    // ---------------------------------------------------------------------
    // Shapes: parallax and sway per host; wide screens have gutters and bob,
    // compact ones keep a short reach. Pinned hosts ride their pin's range.
    // ---------------------------------------------------------------------
    const hostsOf = () => {
      const hosts = new Map<HTMLElement, HTMLElement[]>()
      $$('.shape').forEach((s) => {
        const h = s.parentElement as HTMLElement
        hosts.set(h, [...(hosts.get(h) ?? []), s])
      })
      return hosts
    }
    const rangeFor = (host: HTMLElement): Range => {
      if (host.classList.contains('story-band'))
        return { end: () => pins.story?.end ?? 'bottom top' }
      if (host.classList.contains('how-band'))
        return { end: () => pins.deck?.end ?? 'bottom top' }
      return {}
    }

    mm.add(WIDE, (ctx) => {
      let dead = false
      const bobs: gsap.core.Tween[] = []
      fonts.then(() => {
        if (dead) return
        ctx.add(() => {
          hostsOf().forEach((shapes, host) => {
            rideShapes(host, shapes, rangeFor(host))
            const nodes = shapes.map((s) => s.querySelector('.shape-bob'))
            const bob = gsap.fromTo(
              nodes,
              { y: -2 },
              { y: 2, duration: 3.5, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.5, paused: true },
            )
            bobs.push(bob)
            // no loop while the scene is off screen
            ScrollTrigger.create({
              trigger: host,
              start: 'top bottom',
              end: 'bottom top',
              onToggle: (self) => (self.isActive ? bob.play() : bob.pause()),
            })
          })
        })
      })
      return () => {
        dead = true
      }
    })
    mm.add(COMPACT, (ctx) => {
      let dead = false
      fonts.then(() => {
        if (dead) return
        ctx.add(() =>
          hostsOf().forEach((shapes, host) =>
            rideShapes(
              host,
              shapes.filter((s) => s.classList.contains('m')),
              { ...rangeFor(host), max: 16 },
            ),
          ),
        )
      })
      return () => {
        dead = true
      }
    })

    return () => {
      mm.revert()
      html.classList.remove('home-wait')
    }
  }, [])

  return null
}
