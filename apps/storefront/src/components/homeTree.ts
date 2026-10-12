import { grow, rndFor } from './Branch'

/**
 * The homepage tree: one trunk that runs down the product sections (khussa,
 * the photo rail, chappals) and sends a limb to the top of every exhibit's
 * main branch, where that branch takes over and grows down beside the frame.
 *
 * Client only. page.tsx renders an empty <svg class="home-tree"> inside
 * .grove; with JS off there is no tree (the per-exhibit branches still stand
 * on their own), never half a tree. The geometry comes from measured exhibit
 * positions and is rebuilt only by measure() (refresh and resize), never per
 * frame. draw(front) is pure arithmetic on that geometry: everything above
 * `front` (grove px) is drawn, so draw(Infinity) is the whole tree, static.
 *
 * Layout. One column (phones, short landscape): the trunk keeps to the left
 * gutter (x 12 to 16px, left of the shell padding, so it never crosses a
 * heading, a name or a price) and every main branch stands on that side. Two
 * columns: the trunk runs down the centre gutter and bends round any section
 * heading wide enough to reach it; main branches face the gutter.
 *
 * Node owners (every one is written by this file only):
 *   .tree-trunk, .tree-limb   stroke draw (stroke-dashoffset)
 *   .leaf-grow                leaf opens (style.transform; CSS sets fill-box origin)
 *   .leaf-sway                breeze (CSS, runs while its .tree-node is .live)
 */

type Pt = { x: number; y: number }
type Leaf = { pos: SVGGElement; grow: SVGGElement; y: number; dir: number; t: number }

export type Tree = {
  /** One group per exhibit (its limb and three leaves), for the .live toggle. */
  nodes: SVGGElement[]
  /** Grove height at the last measure. */
  height: () => number
  /** The front (grove px) at which exhibit i's limb has reached its branch. */
  ready: (i: number) => number
  measure: () => void
  draw: (front: number) => void
  remove: () => void
}

const NS = 'http://www.w3.org/2000/svg'
const LEAF = 'M0 0C-14 -20 -12 -46 0 -60C12 -46 14 -20 0 0Z'
const STEP = 16 // px of trunk length per lookup sample
const r1 = (n: number) => Math.round(n * 10) / 10
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)
// back.out(1.7): a leaf opens just past full size and settles.
const pop = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2

/** Catmull-Rom through the points as cubic Beziers, the smoothing Branch uses for its stems. */
const smooth = (pts: Pt[]) => {
  let d = `M${r1(pts[0].x)} ${r1(pts[0].y)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    d += `C${r1(p1.x + (p2.x - p0.x) / 6)} ${r1(p1.y + (p2.y - p0.y) / 6)} ${r1(p2.x - (p3.x - p1.x) / 6)} ${r1(p2.y - (p3.y - p1.y) / 6)} ${r1(p2.x)} ${r1(p2.y)}`
  }
  return d
}

function make<K extends keyof SVGElementTagNameMap>(tag: K, parent: Element, cls?: string) {
  const el = document.createElementNS(NS, tag)
  if (cls) el.setAttribute('class', cls)
  parent.appendChild(el)
  return el
}

/** A stem as Branch draws it: a soft shadow path under the stroke. */
const stem = (parent: Element, cls: string) => {
  const shadow = make('path', parent, `stem-shadow ${cls}`)
  shadow.setAttribute('transform', 'translate(2 3)')
  return [shadow, make('path', parent, `stem ${cls}`)]
}

/** The same cut-paper leaf as Branch: position, open, sway, each its own node. */
function leaf(parent: SVGGElement, tone: 'leaf' | 'tan', delay: number): Leaf {
  const pos = make('g', parent)
  const g = make('g', pos, 'leaf-grow')
  const sway = make('g', g, 'leaf-sway')
  sway.style.animationDelay = `${delay}s`
  const shadow = make('path', sway, 'cut-shadow')
  shadow.setAttribute('d', LEAF)
  shadow.setAttribute('transform', 'translate(3 3)')
  make('path', sway, `cut-${tone}`).setAttribute('d', LEAF)
  make('path', sway, 'cut-vein').setAttribute('d', 'M0 -4V-44')
  return { pos, grow: g, y: 0, dir: 1, t: -1 }
}

const dash = (paths: SVGPathElement[], len: number) =>
  paths.forEach((p) => (p.style.strokeDasharray = `${len + 1} ${len + 1}`))

export function plantTree(svg: SVGSVGElement, exhibits: HTMLElement[]): Tree {
  const grove = svg.parentElement as HTMLElement
  const n = exhibits.length
  const trunk = stem(svg, 'tree-trunk')
  const nodes = exhibits.map(() => make('g', svg, 'tree-node'))
  const limbs = nodes.map((g) => stem(g, 'tree-limb'))
  // Two leaves at each fork and one halfway to the next.
  const leaves = nodes.flatMap((g, i) =>
    [0, 1, 2].map((k) => leaf(g, (i * 3 + k) % 4 === 3 ? 'tan' : 'leaf', -(((i * 3 + k) * 0.7) % 4))),
  )

  let H = 0
  let len = 0
  let ys: number[] = [] // ys[k]: the lowest y the trunk reaches within its first k * STEP px
  const anchors: Pt[] = []
  const limbLen: number[] = []
  const limbSpan: number[] = []
  const limbAt: number[] = []
  let trunkAt = -1
  let last = NaN

  /** Trunk length drawn when the front is at y. */
  const lenAt = (y: number) => {
    if (y >= ys[ys.length - 1]) return len
    let lo = 0
    let hi = ys.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (ys[mid] < y) lo = mid + 1
      else hi = mid
    }
    return Math.min(len, lo * STEP)
  }

  const measure = () => {
    if (!n) return
    const g = grove.getBoundingClientRect()
    const W = grove.clientWidth
    H = grove.offsetHeight
    const rnd = rndFor('home-tree')
    const stages = exhibits.map((ex) => ex.querySelector('.exhibit-stage')!.getBoundingClientRect())
    const twoCol = stages.some((s) => Math.abs(s.left - stages[0].left) > 40)
    const mid = W / 2
    const tips = exhibits.map((ex, i) => {
      // The top of the main branch (its bloom), from the same seeded stem the server drew.
      const b = ex.querySelector('.branch-main')!.getBoundingClientRect()
      const t = grow(`${ex.dataset.seed}:main`, 600, 7).tip
      const s = b.width / 120
      const tip = { x: b.left - g.left + t.x * s, y: b.top - g.top + t.y * s }
      const side = Math.sign(tip.x - mid) || 1
      anchors[i] = twoCol
        ? { x: mid + side * 10, y: tip.y - 56 }
        : { x: 14 + (i % 2 ? 2 : -2), y: tip.y - 40 }
      return tip
    })

    const pts: Pt[] = [{ x: twoCol ? mid : 14, y: 0 }, ...anchors]
    grove.querySelectorAll('.section-head h2').forEach((h) => {
      const r = h.getBoundingClientRect()
      // The glyphs overhang the box (line-height under 1), about 0.1em each way.
      const over = parseFloat(getComputedStyle(h).fontSize) * 0.15
      const top = r.top - g.top - over - 12
      const bot = r.bottom - g.top + over + 6
      // A limb rises a little above its fork, so a fork just under a heading
      // drops clear of it. One column: the trunk keeps to the gutter, but the
      // fork's two leaves stand about 32px tall over the heading's first letter.
      const clear = bot + 12
      if (!twoCol) {
        const low = bot + 36
        anchors.forEach((a, i) => {
          if (a.y > top && a.y < low) a.y = Math.min(low, tips[i].y - 8)
        })
        return
      }
      if (r.left - g.left - 6 < mid + 12 && r.right - g.left + 16 > mid - 12) {
        const x = r.right - g.left + 40
        pts.push({ x, y: top })
        // A fork that would sit beside the heading moves onto the bend instead,
        // so neither the trunk nor its limb crosses the words.
        const near = anchors.filter((a) => a.y > top && a.y < bot + 40)
        near.forEach((a) => {
          a.x = x
          a.y = Math.max(a.y, clear)
        })
        if (!near.length) pts.push({ x, y: bot })
      }
    })
    const bottom = Math.max(...stages.map((s) => s.bottom - g.top))
    pts.push({ x: anchors[n - 1].x, y: Math.min(H - 8, bottom + 40) })
    pts.sort((a, b) => a.y - b.y)

    const d = smooth(pts)
    trunk.forEach((p) => p.setAttribute('d', d))
    len = trunk[1].getTotalLength()
    ys = []
    let lowest = -Infinity
    for (let s = 0; s < len + STEP; s += STEP) {
      lowest = Math.max(lowest, trunk[1].getPointAtLength(Math.min(s, len)).y)
      ys.push(lowest)
    }
    dash(trunk, len)

    const forks = anchors.map((a) => lenAt(a.y))
    anchors.forEach((A, i) => {
      const F = tips[i]
      // Out from the trunk, then down onto the bloom, arriving vertically so the branch carries on.
      const d = `M${r1(A.x)} ${r1(A.y)}C${r1(A.x + (F.x - A.x) * 0.6)} ${r1(A.y - 6)} ${r1(F.x)} ${r1(A.y + 4)} ${r1(F.x)} ${r1(F.y)}`
      limbs[i].forEach((p) => p.setAttribute('d', d))
      limbLen[i] = limbs[i][1].getTotalLength()
      limbSpan[i] = Math.max(70, Math.abs(F.x - A.x) * 0.6)
      limbAt[i] = -1
      dash(limbs[i], limbLen[i])

      const side = Math.sign(F.x - A.x) || 1
      const half = trunk[1].getPointAtLength((forks[i] + (forks[i + 1] ?? len)) / 2)
      const place = (lf: Leaf, p: Pt, a: number, s: number) => {
        lf.pos.setAttribute('transform', `translate(${r1(p.x)} ${r1(p.y)}) rotate(${Math.round(a)}) scale(${s.toFixed(2)})`)
        lf.y = p.y
        lf.dir = Math.sign(a)
        lf.t = -1
      }
      const [a, b, c] = leaves.slice(i * 3, i * 3 + 3)
      place(a, A, side * rnd(40, 58), rnd(0.55, 0.68))
      place(b, A, -side * rnd(22, 34), rnd(0.4, 0.5))
      place(c, half, (i % 2 ? 1 : -1) * rnd(36, 54), rnd(0.5, 0.62))
    })
    trunkAt = -1
    last = NaN
  }

  const draw = (front: number) => {
    if (!n || !len || front === last) return
    last = front
    const t = lenAt(front)
    if (t !== trunkAt) {
      trunkAt = t
      trunk.forEach((p) => (p.style.strokeDashoffset = `${len - t}`))
    }
    anchors.forEach((A, i) => {
      const k = clamp01((front - A.y) / limbSpan[i])
      if (k === limbAt[i]) return
      limbAt[i] = k
      limbs[i].forEach((p) => (p.style.strokeDashoffset = `${limbLen[i] * (1 - k)}`))
    })
    leaves.forEach((lf) => {
      const k = clamp01((front - lf.y) / 40)
      if (k === lf.t) return
      lf.t = k
      lf.grow.style.transform = k >= 1 ? '' : `rotate(${r1((1 - k) * -lf.dir * 30)}deg) scale(${pop(k).toFixed(3)})`
    })
  }

  return {
    nodes,
    height: () => H,
    ready: (i) => anchors[i].y + limbSpan[i],
    measure,
    draw,
    remove: () => {
      trunk.forEach((p) => p.remove())
      nodes.forEach((g) => g.remove())
    },
  }
}
