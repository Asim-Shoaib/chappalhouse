/**
 * Torn-paper divider: a strip with a jagged top edge that lies over the bottom
 * of the section above. Zero height in the flow, so it never moves anything;
 * the SVG hangs upward from the seam. Static decoration (aria-hidden), two
 * layers so the edge reads as paper with a kraft under-layer, not a zigzag.
 *
 *   dark   the story strip's colour (product grids to the strip)
 *   paper  the page colour
 *   tint   the how-it-works band's tint (story strip to how it works)
 */
function jag(seed: number, amp: number, base: number) {
  let s = seed
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const pts: string[] = []
  let x = 0
  while (x < 1200) {
    pts.push(`${x.toFixed(1)} ${(base - rnd() * amp).toFixed(1)}`)
    x += 9 + rnd() * 24
  }
  pts.push(`1200 ${(base - rnd() * amp).toFixed(1)}`)
  return `M0 33L${pts.join('L')}L1200 33Z`
}

// Computed once at module load: the same two edges on every strip, mirrored
// per tone so neighbouring dividers do not look stamped.
const UNDER = jag(7, 15, 15)
const OVER = jag(31, 12, 19)

export function TornEdge({ tone }: { tone: 'dark' | 'paper' | 'tint' }) {
  return (
    <div className={`torn torn-${tone}`} aria-hidden="true">
      <svg viewBox="0 0 1200 32" preserveAspectRatio="none" focusable="false">
        <path className="torn-under" d={UNDER} />
        <path className="torn-over" d={OVER} />
      </svg>
    </div>
  )
}
