/**
 * flyToCart(from, imageSrc, through?): a paper-framed print of the shoe lifts
 * off `from` (the main product photo) and flies into the header cart
 * ([data-cart-target], see CartLink), removes itself and the promise resolves.
 *
 *   await flyToCart(photoEl, photoSrc, addButton)
 *   add(product.slug, size)   // after the flight, so the cart bump lands with it
 *
 * With `through` (the add button) the print always passes BEHIND the button,
 * and the route before and after it is picked at random from five each
 * (never the same pick twice in a row): straight, weaving, a dip off the
 * screen edge, a loop, a spin (before); straight, weaving, a hop off the
 * screen edge, a spiral, a bounce (after). On phones it may also cross the
 * button either way. Routes keep to empty lanes so the print never crosses
 * text: the side margins outside the content column, the gap between photo
 * and buy column on desktop, and the space just past the screen edge.
 *
 * "Behind" is a clip: while the print overlaps the button, the overlapping
 * part is cut away (clip-path inset, in the print's own unscaled px; the
 * rotation is a whole turn for that stretch, so the clip is exact). Without
 * `through` it arcs straight to the cart.
 *
 * Never throws and always resolves: on the server, under reduced motion, or
 * with no cart on the page it resolves at once without flying. The card is
 * position: fixed, so it cannot widen the page. Transform, opacity and
 * clip-path only. Look: ".fly-card" in globals.css.
 */

const SIZE = 72 // card width in px at scale 1; height is SIZE * 1.22
const RATIO = 1.22
const H = SIZE * RATIO

/** A point on the route: card centre, scale, rotation (deg). */
type P = { cx: number; cy: number; s: number; r: number }

// The last picks, so two presses in a row never fly the same route.
let lastBefore = -1
let lastAfter = -1
const pick = (n: number, last: number) => {
  const i = Math.floor(Math.random() * (n - 1))
  return i >= last && last >= 0 ? i + 1 : i
}

/** n points from p (exclusive) to q (inclusive), straight. */
const line = (p: P, q: P, n = 4): P[] =>
  Array.from({ length: n }, (_, k) => {
    const u = (k + 1) / n
    return { cx: p.cx + (q.cx - p.cx) * u, cy: p.cy + (q.cy - p.cy) * u, s: p.s + (q.s - p.s) * u, r: p.r + (q.r - p.r) * u }
  })

/** From p to q with a sideways sine weave of amplitude amp (perpendicular to travel). */
const weave = (p: P, q: P, amp: number, waves = 2, n = 18): P[] => {
  const dx = q.cx - p.cx
  const dy = q.cy - p.cy
  const len = Math.hypot(dx, dy) || 1
  return line(p, q, n).map((pt, k) => {
    const w = Math.sin(((k + 1) / n) * Math.PI * 2 * waves) * amp
    return { ...pt, cx: pt.cx + (-dy / len) * w, cy: pt.cy + (dx / len) * w }
  })
}

/** One full loop of radius rad around a point beside c (dir -1 left, 1 right), back to c. */
const loop = (c: P, rad: number, dir: number, n = 14): P[] =>
  Array.from({ length: n }, (_, k) => {
    const a = ((k + 1) / n) * Math.PI * 2
    return { ...c, cx: c.cx + dir * (rad - rad * Math.cos(a)), cy: c.cy - rad * Math.sin(a) }
  })

export function flyToCart(from: Element, imageSrc: string, through?: Element): Promise<void> {
  let card: HTMLDivElement | undefined
  try {
    if (typeof window === 'undefined') return Promise.resolve()
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve()
    const target = document.querySelector('[data-cart-target]')
    if (!target) return Promise.resolve()
    const a = from.getBoundingClientRect()
    const b = target.getBoundingClientRect()
    if (!b.width || !b.height || !a.width) return Promise.resolve()

    const s1 = Math.max(0.2, (b.height * 0.6) / H)
    const photo: P = { cx: a.left + a.width / 2, cy: a.top + a.height / 2, s: a.width / SIZE, r: -0.4 }
    const btn = through?.getBoundingClientRect()

    // Phases: before the button, the pass behind it, after it. The pass is
    // flagged so it runs at constant speed and is sampled densely.
    let before: P[] = []
    let pass: P[] = []
    let after: P[] = []

    if (btn && btn.width) {
      // Content edges of the button's column; the lanes are the margins outside them.
      const shell = through!.closest('.shell') ?? document.body
      const sb = shell.getBoundingClientRect()
      const cs = getComputedStyle(shell)
      const left = sb.left + parseFloat(cs.paddingLeft || '0')
      const right = sb.right - parseFloat(cs.paddingRight || '0')
      const sideBySide = a.right <= btn.left + 4
      const laneWR = innerWidth - right
      const laneWL = left
      const tw = Math.max(16, Math.min(36, (btn.height * 0.8) / RATIO, laneWR - 6, sideBySide ? 99 : laneWL - 6))
      const ts = tw / SIZE
      const th = H * ts
      const cy = btn.top + btn.height / 2
      const laneR = (right + innerWidth) / 2
      const laneL = left / 2
      // Desktop: the photo is left, so it always enters from the left. Phones: either way.
      const fromLeft = sideBySide || Math.random() < 0.5
      const dir = fromLeft ? -1 : 1
      const laneIn = fromLeft ? laneL : laneR
      const laneOut = fromLeft ? laneR : laneL
      const laneOutW = fromLeft ? laneWR : laneWL
      const edgeIn = fromLeft ? -tw : innerWidth + tw
      const edgeOut = fromLeft ? innerWidth + tw : -tw
      // How far the print may stray sideways inside a lane without leaving it
      // (a print turned by r degrees needs more room, so narrow lanes get no
      // spins or loops and only a slight tilt: the phone margins are ~24px).
      const room = (w: number) => Math.max(0, (w - tw * 1.15) / 2 - 2)
      const wide = (w: number) => w >= tw * 1.7 + 8
      const tilt = (w: number) => (wide(w) ? 8 : 2)
      const E: P = { cx: fromLeft ? btn.left - tw / 2 - 2 : btn.right + tw / 2 + 2, cy, s: ts, r: 0 }
      const X: P = { cx: fromLeft ? btn.right + tw / 2 + 2 : btn.left - tw / 2 - 2, cy, s: ts, r: 0 }

      // ---- before: photo to the button's near edge ----
      const bi = pick(5, lastBefore)
      lastBefore = bi
      if (sideBySide) {
        // Run across the gap between the columns, on the button's row.
        const S0: P = { cx: photo.cx, cy: Math.min(Math.max(cy, a.top + th), a.bottom - th), s: ts, r: -4 }
        const S: P = { cx: a.right - tw / 2 - 6, cy, s: ts, r: -8 }
        const gap = Math.max(16, btn.left - a.right)
        const routes: (() => P[])[] = [
          () => [S0, ...line(S0, S, 3), ...line(S, E, 3)],
          () => [S0, ...line(S0, S, 3), ...weave(S, E, Math.min(btn.height * 0.6, 28), 2)],
          () => {
            const low: P = { ...S, cx: (S.cx + E.cx) / 2, cy: cy + Math.min(120, innerHeight - cy - th) , r: 10 }
            return [S0, ...line(S0, S, 3), ...line(S, low, 5), ...line(low, E, 5)]
          },
          () => [S0, ...line(S0, S, 3), ...line(S, { ...E, cx: (S.cx + E.cx) / 2 }, 3), ...loop({ ...E, cx: (S.cx + E.cx) / 2 }, Math.min(30, gap / 2), 1), ...line({ ...E, cx: (S.cx + E.cx) / 2 }, E, 3)],
          () => [S0, ...line(S0, { ...S, r: 0 }, 3), ...line({ ...S, r: 0 }, { ...E, r: 360 }, 10)],
        ]
        before = routes[bi]()
      } else {
        // Shrink into the near margin beside the photo, then down (or up) the margin.
        const laneW = fromLeft ? laneWL : laneWR
        const py = Math.min(Math.max(photo.cy, a.top + th, -th), a.bottom - th, innerHeight + th)
        // Shrink in place over the photo, then cross the photo (nothing else
        // is at that height) into the margin.
        const S0: P = { cx: photo.cx, cy: py, s: ts, r: dir * 2 }
        // The photo is often scrolled off the top: then the print stays past the
        // screen edge until it is below the header, so the wordmark is never crossed.
        const hb = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 64
        const S: P = { cx: laneIn, cy: Math.max(py, hb + th), s: ts, r: dir * tilt(laneW) }
        const L: P = { cx: laneIn, cy, s: ts, r: 0 }
        let head = [S0, ...line(S0, S, 4)]
        if (py < hb + th) {
          const e1: P = { ...S0, cx: edgeIn }
          const e2: P = { ...e1, cy: S.cy }
          head = [S0, ...line(S0, e1, 3), ...line(e1, e2, 3), ...line(e2, S, 2)]
        }
        const offscreen = () => {
          const out: P = { ...S, cx: edgeIn, cy: (py + cy) / 2, r: dir * 14 }
          const back: P = { ...L, cx: edgeIn }
          return [...head, ...line(S, out, 4), ...line(out, back, 4), ...line(back, E, 4)]
        }
        const routes: (() => P[])[] = [
          () => [...head, ...line(S, L, 6), ...line(L, E, 2)],
          () => [...head, ...weave(S, L, room(laneW), 2), ...line(L, E, 2)],
          offscreen,
          () => {
            if (room(laneW) < 6) return offscreen()
            const mid: P = { ...L, cy: (py + cy) / 2 }
            return [...head, ...line(S, mid, 4), ...loop(mid, room(laneW), -dir), ...line(mid, L, 4), ...line(L, E, 2)]
          },
          () => {
            if (!wide(laneW)) return offscreen()
            return [...head, ...line({ ...S, r: 0 }, { ...L, r: dir * -360 }, 10), ...line({ ...L, r: dir * -360 }, { ...E, r: dir * -360 }, 2)]
          },
        ]
        before = routes[bi]()
      }

      // ---- the pass behind the button, at a whole turn so the clip is exact ----
      const turn = before[before.length - 1].r
      pass = line({ ...E, r: turn }, { ...X, r: turn }, 36)

      // ---- after: out of the far edge, up a margin, into the cart ----
      const ai = pick(5, lastAfter)
      lastAfter = ai
      const cart: P = { cx: b.left + b.width / 2, cy: b.top + b.height / 2, s: s1, r: turn + 14 }
      const O: P = { cx: laneOut, cy, s: ts, r: turn }
      // Top of the lane. Out the right margin: just under the cart, then in.
      // Out the left margin (phones): off the top of the screen, across, and
      // down into the cart from above, so it never crosses the page.
      const tail = (p: P): P[] => {
        if (laneOut > innerWidth / 2) {
          const T: P = { ...p, cx: laneOut, cy: Math.max(b.bottom + th, 0) + 6 }
          return [...line(p, T, 6), ...line(T, cart, 3)]
        }
        // Leave the left margin below the header, off the left edge, so the
        // wordmark is never crossed; come back over the top into the cart.
        const hb = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 64
        const T: P = { ...p, cx: laneOut, cy: hb + th }
        const off: P = { ...T, cx: -tw * 1.5 }
        const up: P = { ...off, cy: -th * 2 }
        const over: P = { ...up, cx: cart.cx }
        return [...line(p, T, 6), ...line(T, off, 2), ...line(off, up, 3), ...line(up, over, 4), ...line(over, cart, 3)]
      }
      const X0: P = { ...X, r: turn }
      const routes: (() => P[])[] = [
        () => [...line(X0, O, 2), ...tail(O)],
        () => {
          // Weave up the margin to where the plain tail would turn, then follow it.
          const hb = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 64
          const T: P = { ...O, cy: laneOut > innerWidth / 2 ? Math.max(b.bottom + th, 0) + 6 : hb + th }
          return [...line(X0, O, 2), ...weave(O, T, room(laneOutW), 2), ...tail(T).slice(6)]
        },
        () => {
          const out: P = { ...O, cx: edgeOut, cy: cy - Math.min(140, cy * 0.4), r: turn + dir * -12 }
          // Out the right edge: back in just under the cart. Out the left edge:
          // up past the top of the screen, across, and down into the cart, so the
          // header is never crossed.
          if (laneOut > innerWidth / 2) {
            const back: P = { ...out, cy: Math.max(b.bottom + th, 0) + 6 }
            return [...line(X0, out, 5), ...line(out, back, 5), ...line(back, cart, 4)]
          }
          const up: P = { ...out, cy: -th * 2 }
          const over: P = { ...up, cx: cart.cx }
          return [...line(X0, out, 5), ...line(out, up, 5), ...line(up, over, 4), ...line(over, cart, 3)]
        },
        () => {
          if (!wide(laneOutW)) {
            const dip: P = { ...O, cy: cy + Math.min(36, innerHeight - cy - th) }
            return [...line(X0, dip, 3), ...line(dip, O, 3), ...tail(O)]
          }
          const spun: P = { ...O, r: turn + dir * -360 }
          return [...line(X0, O, 2), ...tail(spun).map((pt, k, all) => ({ ...pt, r: turn + dir * -360 * ((k + 1) / all.length) + (k === all.length - 1 ? 14 : 0) }))]
        },
        () => {
          const dip: P = { ...O, cy: cy + Math.min(36, innerHeight - cy - th) }
          return [...line(X0, dip, 3), ...line(dip, O, 3), ...tail(O)]
        },
      ]
      after = routes[ai]()
    } else {
      const mid: P = { cx: a.left + a.width * 0.6, cy: Math.min(a.top, b.top) + 40, s: 0.9, r: 4 }
      const cart: P = { cx: b.left + b.width / 2, cy: b.top + b.height / 2, s: s1, r: 14 }
      after = [...line(photo, mid, 6), ...line(mid, cart, 6)]
    }

    // Time: before 0 to 0.42, pass to 0.62, after to 1; inside a phase by
    // distance, eased in and out over the phase (the pass runs at constant speed).
    const ease = (u: number) => u * u * (3 - 2 * u)
    const pts: { p: P; t: number }[] = [{ p: photo, t: 0 }]
    const phase = (list: P[], t0: number, t1: number, eased: boolean) => {
      if (!list.length) return
      let prev = pts[pts.length - 1].p
      const d = list.map((p) => {
        const step = Math.hypot(p.cx - prev.cx, p.cy - prev.cy) + Math.abs(p.r - prev.r) * 0.3
        prev = p
        return step
      })
      const total = d.reduce((x, y) => x + y, 0) || 1
      let acc = 0
      list.forEach((p, i) => {
        acc += d[i]
        const u = acc / total
        pts.push({ p, t: t0 + (t1 - t0) * (eased ? ease(u) : u) })
      })
    }
    if (pass.length) {
      phase(before, 0, 0.42, true)
      phase(pass, 0.42, 0.62, false)
      phase(after, 0.62, 1, true)
    } else phase(after, 0, 1, true)

    // The part of the card over the button is cut away (it is "behind" it).
    const clipFor = (x: number, y: number, s: number) => {
      if (!btn) return 'inset(0px 0px 0px 0px)'
      const w = SIZE * s
      const h = H * s
      const ol = Math.max(x, btn.left)
      const or = Math.min(x + w, btn.right)
      const vertical = y < btn.bottom && y + h > btn.top
      if (!vertical || or <= ol) return 'inset(0px 0px 0px 0px)'
      if (ol <= x + 0.5 && or >= x + w - 0.5) return `inset(0px 0px 0px ${SIZE}px)`
      if (ol > x) return `inset(0px ${((x + w - ol) / s).toFixed(1)}px 0px 0px)`
      return `inset(0px 0px 0px ${((or - x) / s).toFixed(1)}px)`
    }

    let lastT = -1
    const frames: Keyframe[] = []
    for (const { p, t } of pts) {
      const offset = Math.min(1, Math.max(lastT + 1e-4, t))
      lastT = offset
      // transform-origin is the card's centre, so its centre lands on (cx, cy)
      // when translated by the centre minus half the UNSCALED box; the clip
      // works on the visible (scaled) box.
      const tx = p.cx - SIZE / 2
      const ty = p.cy - H / 2
      frames.push({
        offset,
        transform: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${p.r.toFixed(2)}deg) scale(${p.s.toFixed(4)})`,
        clipPath: clipFor(p.cx - (SIZE * p.s) / 2, p.cy - (H * p.s) / 2, p.s),
        // Fades only as it drops into the bag.
        opacity: offset < 0.975 ? 1 : 1 - (offset - 0.975) / 0.025,
      })
    }
    frames[frames.length - 1].offset = 1

    card = document.createElement('div')
    card.className = 'fly-card'
    card.setAttribute('aria-hidden', 'true')
    card.style.transformOrigin = '50% 50%'
    const img = document.createElement('img')
    img.src = imageSrc
    img.alt = ''
    card.append(img)
    document.body.append(card)

    const anim = card.animate(frames, { duration: btn ? 1300 : 750, easing: 'linear', fill: 'forwards' })
    const done = () => card?.remove()
    return anim.finished.then(done, done)
  } catch {
    card?.remove()
    return Promise.resolve()
  }
}
