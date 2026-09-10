'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * Scroll-entry reveal. Wrap anything; no animation code at the call site.
 *
 *   <Reveal><h2>Khussa</h2></Reveal>
 *   <Reveal delay={0.08}>…</Reveal>
 *
 * Honours prefers-reduced-motion by rendering the content statically.
 */
export function Reveal({
  children,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  as?: 'div' | 'section' | 'li'
}) {
  const reduced = useReducedMotion()
  const Tag = motion[as]

  if (reduced) return <Tag>{children}</Tag>

  return (
    <Tag
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{
        duration: 0.72,
        delay,
        ease: [0.32, 0.72, 0, 1],
      }}
    >
      {children}
    </Tag>
  )
}

/**
 * Staggers direct children as they enter the viewport. Used for product grids,
 * where cards should cascade rather than all appear at once.
 */
export function RevealStagger({
  children,
  step = 0.05,
  className,
}: {
  children: ReactNode
  step?: number
  className?: string
}) {
  const reduced = useReducedMotion()

  if (reduced) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '-48px' }}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: step } },
      }}
    >
      {children}
    </motion.div>
  )
}

export const revealItem = {
  hidden: { opacity: 0, y: 20 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.32, 0.72, 0, 1] as const },
  },
}
