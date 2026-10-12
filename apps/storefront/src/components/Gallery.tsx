'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { imageUrl, thumbUrl } from '@/lib/product'
import { Branch } from './Branch'

const EASE = [0.32, 0.72, 0, 1] as const

// Paper shuffle: the outgoing print tilts away to the side it leaves by, the
// incoming one slides in from the other side and settles. `d` is +1 for next.
const shuffle = {
  enter: (d: number) => ({ opacity: 0, x: d * 28, rotate: d * 2.5, scale: 0.98 }),
  center: { opacity: 1, x: 0, rotate: 0, scale: 1 },
  exit: (d: number) => ({ opacity: 0, x: d * -36, rotate: d * -4, scale: 0.97 }),
}

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [[index, dir], setView] = useState<[number, number]>([0, 1])
  const reduced = useReducedMotion()
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null)

  const go = (next: number, focusThumb = false, d = next < index ? -1 : 1) => {
    const wrapped = (next + images.length) % images.length
    setView([wrapped, d])
    if (focusThumb) thumbRefs.current[wrapped]?.focus()
  }

  // Warm the neighbouring full-size images so stepping through the gallery
  // never waits on a network fetch — an unloaded image is the other half of
  // the "black flash" problem.
  useEffect(() => {
    if (images.length < 2) return
    const neighbours = [
      images[(index + 1) % images.length],
      images[(index - 1 + images.length) % images.length],
    ]
    for (const name of neighbours) {
      const img = new window.Image()
      img.src = imageUrl(name)
    }
  }, [index, images])

  if (images.length === 0) {
    return (
      <div className="pdp-frame">
        <span className="card-placeholder" aria-hidden="true">
          {alt.charAt(0)}
        </span>
      </div>
    )
  }

  return (
    <div
      className="gallery"
      // Left/Right step, Home/End jump, from any control in the gallery (the
      // arrows, a thumb). On a thumb, focus follows to the new image's thumb.
      onKeyDown={(event) => {
        const { key } = event
        const to =
          key === 'ArrowRight' ? index + 1
          : key === 'ArrowLeft' ? index - 1
          : key === 'Home' ? 0
          : key === 'End' ? images.length - 1
          : null
        if (to === null || images.length < 2) return
        event.preventDefault()
        const onThumb = (event.target as HTMLElement).classList.contains('thumb')
        go(to, onThumb, key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : undefined)
      }}
    >
      <div className="pdp-stage">
        <Branch seed={images[0]} kind="main" className="paper-branch pdp-branch pdp-branch-main" />
        <Branch seed={images[0]} kind="sprig" className="paper-branch pdp-branch pdp-branch-sprig" />
        <div className="pdp-sheet">
          <div
            className="pdp-frame"
            // Swipe on touch: pan-y (+ pinch-zoom) in CSS keeps vertical scrolling native and
            // leaves horizontal moves to us, so pointerup always arrives.
            onPointerDown={(e) => {
              if (e.pointerType !== 'mouse' && images.length > 1)
                swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
            }}
            onPointerUp={(e) => {
              const s = swipe.current
              swipe.current = null
              if (!s || s.id !== e.pointerId) return
              const dx = e.clientX - s.x
              const dy = e.clientY - s.y
              if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                const d = dx < 0 ? 1 : -1
                go(index + d, false, d)
              }
            }}
            onPointerCancel={() => {
              swipe.current = null
            }}
          >
            {/* No `mode="wait"`: that fades the outgoing image to zero before the
                incoming one starts, exposing the frame background as a dark flash.
                Both images are stacked and cross-dissolve instead, with a
                paper shuffle on top (see `shuffle`). */}
            <AnimatePresence initial={false} custom={dir}>
              <motion.div
                key={images[index]}
                custom={dir}
                variants={shuffle}
                initial={reduced ? false : 'enter'}
                animate="center"
                exit={reduced ? undefined : 'exit'}
                transition={{
                  opacity: { duration: 0.45, ease: EASE },
                  default: { duration: 0.55, ease: EASE },
                }}
                className="pdp-image-wrap"
              >
                <Image
                  src={imageUrl(images[index])}
                  alt={`${alt} — view ${index + 1} of ${images.length}`}
                  width={1400}
                  height={1750}
                  priority={index === 0}
                  className="pdp-image"
                />
              </motion.div>
            </AnimatePresence>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-arrow gallery-arrow-prev"
                  onClick={() => go(index - 1, false, -1)}
                  aria-label="Previous image"
                >
                  <Chevron dir="left" />
                </button>
                <button
                  type="button"
                  className="gallery-arrow gallery-arrow-next"
                  onClick={() => go(index + 1, false, 1)}
                  aria-label="Next image"
                >
                  <Chevron dir="right" />
                </button>
                <p className="gallery-count" aria-live="polite" aria-atomic="true">
                  <span aria-hidden="true">
                    {index + 1} / {images.length}
                  </span>
                  <span className="sr-only">
                    Image {index + 1} of {images.length}
                  </span>
                </p>
              </>
            )}
          </div>
          <i className="pdp-tape" aria-hidden="true" />
          <span className="pdp-plate" aria-hidden="true">
            {alt.split(' — ')[0]}
          </span>
        </div>
      </div>

      {images.length > 1 && (
        <ul className="thumbs" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img}>
              <button
                type="button"
                ref={(el) => {
                  thumbRefs.current[i] = el
                }}
                className="thumb"
                data-active={i === index}
                aria-label={`View image ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                // One tab stop for the strip (the shown image); arrows move along it.
                tabIndex={i === index ? 0 : -1}
                onClick={() => go(i)}
              >
                <Image
                  src={thumbUrl(img)}
                  alt=""
                  width={600}
                  height={750}
                  loading="lazy"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
