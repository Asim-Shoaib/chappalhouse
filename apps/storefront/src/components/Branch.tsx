/**
 * Seeded cut-paper branch: a stem climbing a 120-wide viewBox with leaves on
 * alternating sides, and a paper flower on the tall one. Pure and server-safe;
 * the same seed draws the same branch on the server and the client.
 *
 *   <Branch seed={product.slug} kind="main" />   tall, 600 units, ends in a bloom
 *   <Branch seed={product.slug} kind="sprig" />  short, 300 units
 *
 * Styling lives in globals.css ("cut-paper branch") and works on any page; the
 * svg only sizes itself from its width, so the caller positions it. Node
 * classes stay stable because HomeMotion animates them:
 *   .stem        stroke draw (stroke-dashoffset)
 *   .leaf-grow   leaf opens (scale, rotation)
 *   .leaf-sway   breeze (CSS animation, runs inside any .live ancestor)
 */

/** Seeded stream from the key, so a branch never changes between server and client. */
export const rndFor = (key: string) => {
  let s = 7
  for (const c of key) s = (s * 31 + c.charCodeAt(0)) % 2147483647
  s = s || 1
  return (a = 0, b = 1) => {
    s = (s * 16807) % 2147483647
    return a + (s / 2147483647) * (b - a)
  }
}

const LEAF = 'M0 0C-14 -20 -12 -46 0 -60C12 -46 14 -20 0 0Z'
const r1 = (n: number) => Math.round(n * 10) / 10

type Leaf = { x: number; y: number; a: number; s: number; tone: 'tan' | 'leaf' }

/**
 * A stem climbing the 120-wide viewBox from the bottom, nodes jittered left and
 * right, smoothed with Catmull-Rom. A leaf sits on every node after the first,
 * on alternating sides; the tall branch ends in a paper flower.
 */
export function grow(key: string, height: number, nodes: number) {
  const rnd = rndFor(key)
  const pts = Array.from({ length: nodes }, (_, i) => {
    const t = i / (nodes - 1)
    return { x: i === 0 ? 60 : 60 + rnd(-24, 24) * (0.5 + t * 0.5), y: height - 6 - t * (height - 30) }
  })
  let d = `M${r1(pts[0].x)} ${r1(pts[0].y)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    d += `C${r1(p1.x + (p2.x - p0.x) / 6)} ${r1(p1.y + (p2.y - p0.y) / 6)} ${r1(p2.x - (p3.x - p1.x) / 6)} ${r1(p2.y - (p3.y - p1.y) / 6)} ${r1(p2.x)} ${r1(p2.y)}`
  }
  const first = rnd() < 0.5 ? -1 : 1
  const leaves: Leaf[] = pts.slice(1, -1).flatMap((p, i) => {
    const side = i % 2 ? -first : first
    const main: Leaf = {
      x: r1(p.x),
      y: r1(p.y),
      a: Math.round(side * rnd(38, 62)),
      s: +rnd(1.0, 1.3).toFixed(2),
      tone: rnd() < 0.72 ? 'leaf' : 'tan',
    }
    // Every other node carries a small second leaf on the far side.
    return i % 2
      ? [main]
      : [main, { x: main.x, y: main.y, a: Math.round(-side * rnd(20, 34)), s: +rnd(0.62, 0.8).toFixed(2), tone: 'leaf' as const }]
  })
  const tip = pts[pts.length - 1]
  return { d, leaves, tip: { x: r1(tip.x), y: r1(tip.y) } }
}

export function Branch({ seed, kind, className }: { seed: string; kind: 'main' | 'sprig'; className?: string }) {
  const h = kind === 'main' ? 600 : 300
  const { d, leaves, tip } = grow(`${seed}:${kind}`, h, kind === 'main' ? 7 : 4)
  return (
    <svg
      className={`branch branch-${kind}${className ? ` ${className}` : ''}`}
      viewBox={`0 0 120 ${h}`}
      aria-hidden="true"
      focusable="false"
    >
      <path className="stem-shadow" d={d} transform="translate(2 3)" />
      <path className="stem" d={d} />
      {leaves.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.a}) scale(${l.s})`}>
          <g className="leaf-grow">
            <g className="leaf-sway" style={{ animationDelay: `${-((i * 0.7) % 4)}s` }}>
              <path className="cut-shadow" d={LEAF} transform="translate(3 3)" />
              <path className={`cut-${l.tone}`} d={LEAF} />
              <path className="cut-vein" d="M0 -4V-44" />
            </g>
          </g>
        </g>
      ))}
      {kind === 'main' && (
        <g transform={`translate(${tip.x} ${tip.y})`}>
          <g className="leaf-grow bloom">
            {[0, 72, 144, 216, 288].map((a) => (
              <circle key={a} className="cut-accent" cx="0" cy="-9" r="7.5" transform={`rotate(${a})`} />
            ))}
            <circle className="cut-tan" r="5.5" />
          </g>
        </g>
      )}
    </svg>
  )
}
