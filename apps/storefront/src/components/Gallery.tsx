'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { imageUrl, thumbUrl } from '@/lib/product'

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])

  const go = (next: number, focusThumb = false) => {
    const wrapped = (next + images.length) % images.length
    setIndex(wrapped)
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
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          go(index + 1)
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault()
          go(index - 1)
        }
      }}
    >
      <div className="pdp-frame">
        {/* No `mode="wait"`: that fades the outgoing image to zero before the
            incoming one starts, exposing the frame background as a dark flash.
            Both images are stacked and cross-dissolve instead. */}
        <AnimatePresence initial={false}>
          <motion.div
            key={images[index]}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{
              opacity: { duration: 0.45, ease: [0.32, 0.72, 0, 1] },
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
              onClick={() => go(index - 1)}
              aria-label="Previous image"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              className="gallery-arrow gallery-arrow-next"
              onClick={() => go(index + 1)}
              aria-label="Next image"
            >
              <Chevron dir="right" />
            </button>
            <p className="gallery-count">
              {index + 1} / {images.length}
            </p>
          </>
        )}
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
                onClick={() => setIndex(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    go(i + 1, true)
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    go(i - 1, true)
                  }
                }}
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
