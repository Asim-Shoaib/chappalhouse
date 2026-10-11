import type { ReactNode } from 'react'

/**
 * Cut-paper decoration: a leaf, a circle, a scalloped label and a coin. Flat
 * fills from the existing tokens (--tan, and --accent-surface once per scene),
 * a hard offset shadow drawn as a second path (no blur, no filter). Purely
 * decorative, so aria-hidden. Each scene (hero, story band, how it works) mounts its own set, so the page reads as one system.
 *
 * Every animated concern has its own node, so no element has two writers:
 *   .shape        scroll parallax (y)               HomeMotion rideShapes
 *   .shape-bob    idle bob (y)                      HomeMotion bob
 *   .shape-drift  cursor drift (x, y)               HomeMotion cursor
 *   .shape-fly    story band fly-in (x, y, rot, o)  HomeMotion story timeline
 *   .sp           overscroll spin (CSS rotate)      HomeMotion spin
 *   .shape-in     scroll sway (rotation)            HomeMotion rideShapes
 */
type Kind = 'leaf' | 'dot' | 'label' | 'coin'

// [kind, position class, travel (data-s), sway (data-r), also shown on phones]
type Def = [Kind, string, number, number, boolean]

const SCENES = {
  hero: [
    ['leaf', 'sh-h1', 0.1, 18, false],
    ['coin', 'sh-h2', 0.06, 10, true],
  ],
  story: [
    ['leaf', 'sh-s1', 0.08, 22, true],
    ['dot', 'sh-s2', 0.14, 12, false],
    ['label', 'sh-s3', 0.05, 26, true],
    ['coin', 'sh-s4', 0.1, 8, false],
  ],
  how: [
    ['label', 'sh-w1', 0.06, 24, true],
    ['leaf', 'sh-w2', 0.1, 20, false],
    ['dot', 'sh-w3', 0.12, 12, false],
    ['coin', 'sh-w4', 0.08, 8, true],
    ['leaf', 'sh-w5', 0.14, 26, false],
  ],
} satisfies Record<string, Def[]>

const LEAF = 'M50 8C82 20 92 52 50 92C8 52 18 20 50 8Z'
const SCALLOP =
  'M50 16A8.8 8.8 0 0 1 67 20.56A8.8 8.8 0 0 1 79.44 33A8.8 8.8 0 0 1 84 50A8.8 8.8 0 0 1 79.44 67A8.8 8.8 0 0 1 67 79.44A8.8 8.8 0 0 1 50 84A8.8 8.8 0 0 1 33 79.44A8.8 8.8 0 0 1 20.56 67A8.8 8.8 0 0 1 16 50A8.8 8.8 0 0 1 20.56 33A8.8 8.8 0 0 1 33 20.56A8.8 8.8 0 0 1 50 16Z'

const ART: Record<Kind, ReactNode> = {
  leaf: (
    <g transform="rotate(-32 50 50)">
      <path className="cut-shadow" d={LEAF} transform="translate(3 4)" />
      <path className="cut-tan" d={LEAF} />
      <path className="cut-vein" d="M50 90V34" />
    </g>
  ),
  dot: (
    <>
      <circle className="cut-shadow" cx="53" cy="54" r="42" />
      <circle className="cut-accent" cx="50" cy="50" r="42" />
    </>
  ),
  label: (
    <>
      <path className="cut-shadow" d={SCALLOP} transform="translate(3 4)" />
      <path className="cut-tan" d={SCALLOP} />
      <circle className="cut-hole" cx="50" cy="30" r="4.5" />
    </>
  ),
  coin: (
    <>
      <circle className="cut-shadow" cx="53" cy="54" r="40" />
      <circle className="cut-tan" cx="50" cy="50" r="40" />
    </>
  ),
}

export function PaperShapes({ scene }: { scene: keyof typeof SCENES }) {
  return (
    <>
      {(SCENES[scene] as Def[]).map(([kind, cls, s, r, m]) => (
        <span
          key={cls}
          className={`shape ${cls}${m ? ' m' : ''}`}
          data-s={s}
          data-r={r}
          aria-hidden="true"
        >
          <i className="shape-bob">
            <i className="shape-drift">
              <i className="shape-fly">
                <i className="sp">
                  <svg className="shape-in" viewBox="0 0 100 100" focusable="false">
                    {ART[kind]}
                  </svg>
                </i>
              </i>
            </i>
          </i>
        </span>
      ))}
    </>
  )
}
