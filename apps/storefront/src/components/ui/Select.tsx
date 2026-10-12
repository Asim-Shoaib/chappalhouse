'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, stagger, useReducedMotion } from 'motion/react'

/**
 * A paper dropdown in place of a native <select>. Button + listbox pattern:
 * the button opens the list (click, Enter, Space, ArrowDown/Up), focus moves
 * to the list with aria-activedescendant, ArrowUp/Down Home/End move, Enter or
 * Space chooses, a letter jumps to the next option starting with it, Escape
 * or Tab closes, a click outside closes, and focus comes
 * back to the button whenever a choice or Escape closes it.
 *
 *   <Select
 *     label="Sort"
 *     value={sort}
 *     options={[{ value: 'featured', label: 'Featured' }, ...]}
 *     onChange={setSort}
 *   />
 *
 * The list unfolds like paper from its top edge (scaleY with a small rotation
 * settle, 0.28s) and the options follow 20ms apart; the chosen one carries a
 * tan check stamp. Reduced motion: it simply appears. `name` posts the value
 * through a hidden input when inside a form. Look: ".pselect" in globals.css.
 */

type Option = { value: string; label: string }

const EASE = [0.32, 0.72, 0, 1] as const

export function Select({
  label,
  value,
  options,
  onChange,
  name,
}: {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  name?: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const still = useReducedMotion()
  const chosen = Math.max(0, options.findIndex((o) => o.value === value))

  const show = (at = chosen) => {
    setActive(at)
    setOpen(true)
  }
  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) button.current?.focus()
  }
  const choose = (i: number) => {
    if (options[i] && options[i].value !== value) onChange(options[i].value)
    close(true)
  }

  useEffect(() => {
    if (!open) return
    list.current?.focus()
    // Not enough room below: scroll the page just enough for the whole list
    // (plus its shadow). offsetHeight, since the unfold scales it right now.
    if (list.current) {
      const below = list.current.getBoundingClientRect().top + list.current.offsetHeight + 16 - innerHeight
      if (below > 0) scrollBy({ top: below, behavior: still ? 'auto' : 'smooth' })
    }
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  const onButtonKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      show()
    }
  }

  const onListKey = (event: KeyboardEvent) => {
    const last = options.length - 1
    const move = (i: number) => {
      event.preventDefault()
      setActive(Math.min(last, Math.max(0, i)))
    }
    switch (event.key) {
      case 'ArrowDown': return move(active + 1)
      case 'ArrowUp': return move(active - 1)
      case 'Home': return move(0)
      case 'End': return move(last)
      case 'Enter':
      case ' ':
        event.preventDefault()
        return choose(active)
      case 'Escape':
        event.preventDefault()
        return close(true)
      case 'Tab':
        return close(false)
    }
    // Typeahead: a letter jumps to the next option that starts with it.
    if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const key = event.key.toLowerCase()
      for (let step = 1; step <= options.length; step++) {
        const i = (active + step) % options.length
        if (options[i].label.toLowerCase().startsWith(key)) return move(i)
      }
    }
  }

  const fold = still ? { duration: 0 } : { duration: 0.28, ease: EASE }

  return (
    <div className="pselect" ref={root}>
      <span className="pselect-label" id={`${id}-label`}>{label}</span>
      <button
        ref={button}
        type="button"
        id={`${id}-button`}
        className="pselect-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-button`}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={onButtonKey}
      >
        <span className="pselect-value">{options[chosen]?.label ?? ''}</span>
        <svg className="pselect-caret" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>
      {name && <input type="hidden" name={name} value={value} />}
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={list}
            id={`${id}-list`}
            className="pselect-list"
            role="listbox"
            tabIndex={-1}
            aria-labelledby={`${id}-label`}
            aria-activedescendant={`${id}-opt-${active}`}
            onKeyDown={onListKey}
            variants={{
              hidden: { opacity: 0, scaleY: 0.4, rotate: -1.5 },
              shown: { opacity: 1, scaleY: 1, rotate: 0, transition: { ...fold, delayChildren: still ? 0 : stagger(0.02) } },
            }}
            initial={still ? false : 'hidden'}
            animate="shown"
            exit={{ opacity: 0, scaleY: 0.6, transition: still ? { duration: 0 } : { duration: 0.16, ease: EASE } }}
            style={{ transformOrigin: '50% 0' }}
          >
            {options.map((o, i) => (
              <motion.li
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === chosen}
                className="pselect-option"
                data-active={i === active || undefined}
                variants={{ hidden: { opacity: 0, y: -4 }, shown: { opacity: 1, y: 0, transition: fold } }}
                onPointerMove={() => setActive(i)}
                onClick={() => choose(i)}
              >
                <span>{o.label}</span>
                {i === chosen && (
                  <svg className="pselect-check" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <circle cx="8" cy="8" r="8" />
                    <path d="M4.6 8.3l2.2 2.2 4.6-4.8" />
                  </svg>
                )}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
