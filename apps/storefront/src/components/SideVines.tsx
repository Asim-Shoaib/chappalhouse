'use client'

import { useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import gsap from 'gsap'
import { Branch, rndFor } from './Branch'
import { NO_RM, registerPaper, scrubBranch } from '@/lib/paperMotion'

/**
 * Cut-paper vines down the outer gutters on wide screens, every page. Mounted
 * once in layout.tsx; renders inside <main>, behind everything (z-index -1),
 * in the strip left and right of the 1180px .shell, sized to that strip
 * (globals.css "side vines"). Hidden under 1280px, where there is no strip.
 *
 * Seeded from the pathname: each page gets its own vines, the same on every
 * load, server and client alike. Placement is CSS percentages of the page
 * height, so nothing is measured here; ScrollTrigger measures on refresh and
 * resize. The homepage has its own tree in the content, so it gets fewer.
 *
 * Node owners (this file only):
 *   .side-vine .branch internals   drawn by the scroll       scrubBranch (scrub 0.6)
 *   .side-vine .branch.live        breeze while on screen    scrubBranch
 *   .side-vines.ready              lifts the pre-JS hold     here
 * No JS: the svgs stand fully drawn. Reduced motion: drawn and still.
 */

type Vine = { key: string; side: 'l' | 'r'; kind: 'main' | 'sprig'; hang: boolean; at: number }

function plan(path: string): Vine[] {
  const rnd = rndFor(`vines:${path}`)
  const per = path === '/' ? 2 : 3
  return (['l', 'r'] as const).flatMap((side) =>
    Array.from({ length: per }, (_, i): Vine => {
      const key = `${path}:${side}:${i}`
      // First hangs from the top of the page, last climbs from the foot,
      // any middle one hangs from somewhere near the middle.
      if (i === 0) return { key, side, kind: 'main', hang: true, at: Math.round(rnd(0, 4)) }
      if (i === per - 1) return { key, side, kind: rnd() < 0.7 ? 'main' : 'sprig', hang: false, at: Math.round(rnd(2, 10)) }
      return { key, side, kind: rnd() < 0.5 ? 'main' : 'sprig', hang: true, at: Math.round(rnd(34, 52)) }
    }),
  )
}

export function SideVines() {
  const path = usePathname() ?? '/'
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const box = ref.current
    if (!box) return
    registerPaper()
    const mm = gsap.matchMedia()
    mm.add(`(min-width: 1280px) and ${NO_RM}`, () => {
      box.querySelectorAll<SVGSVGElement>('.side-vine .branch').forEach((svg) => scrubBranch(svg))
    })
    // Start states are written (or not needed); the pre-JS hold can go.
    box.classList.add('ready')
    return () => mm.revert()
  }, [path])

  return (
    <div className="side-vines" aria-hidden="true" key={path} ref={ref}>
      {plan(path).map((v) => (
        <div
          key={v.key}
          className={`side-vine side-vine-${v.side}`}
          style={v.hang ? { top: `${v.at}%` } : { bottom: `${v.at}%` }}
        >
          <Branch seed={v.key} kind={v.kind} className={v.hang ? 'branch-hang' : undefined} />
        </div>
      ))}
    </div>
  )
}
