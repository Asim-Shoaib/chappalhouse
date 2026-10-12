import type { KeyboardEvent } from 'react'

/**
 * Sizes as small stitched paper stamps: a hard shadow under each and a dashed
 * stitch line inset from the edge. Look: ".size-stamp" in globals.css.
 *
 * SizeChips: read-only list, for cards and summaries. Sorted, duplicates dropped.
 *   <SizeChips sizes={product.variants.map((v) => v.size)} size="sm" />
 *
 * SizePicker: the selectable version, a radiogroup. Arrow keys move and select
 * (as native radios do), Home/End jump, one tab stop. The chosen stamp presses
 * down onto its shadow and a small check lands on it. Targets are 44px.
 *   <SizePicker sizes={sizes} value={selected} onChange={setSelected} name="size" />
 * `name` also posts the value through a hidden input when inside a form.
 * `label` names the group for screen readers (default "Available sizes").
 * No hooks, so the file stays server-safe; SizePicker itself is used from a
 * client component, since onChange is a function.
 */

const tidy = (sizes: number[]) => [...new Set(sizes)].sort((a, b) => a - b)

export function SizeChips({
  sizes,
  size = 'md',
  className,
}: {
  sizes: number[]
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <ul className={`size-stamps size-stamps-${size}${className ? ` ${className}` : ''}`} aria-label="Available sizes">
      {tidy(sizes).map((s) => (
        <li key={s} className="size-stamp">
          <span className="size-stamp-face">{s}</span>
        </li>
      ))}
    </ul>
  )
}

export function SizePicker({
  sizes,
  value,
  onChange,
  name,
  label = 'Available sizes',
}: {
  sizes: number[]
  value: number | null
  onChange: (size: number) => void
  name?: string
  label?: string
}) {
  const list = tidy(sizes)
  const current = value === null ? -1 : list.indexOf(value)
  // The one tab stop: the chosen stamp, else the first.
  const stop = current === -1 ? 0 : current

  const onKeyDown = (event: KeyboardEvent, i: number) => {
    const last = list.length - 1
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (i === last ? 0 : i + 1)
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (i === 0 ? last : i - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null
    if (next === null) return
    event.preventDefault()
    onChange(list[next])
    const stamp = event.currentTarget.parentElement?.children[next] as HTMLElement | undefined
    stamp?.focus()
  }

  return (
    <div className="size-stamps size-stamps-md size-picker" role="radiogroup" aria-label={label}>
      {list.map((s, i) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          tabIndex={i === stop ? 0 : -1}
          className="size-stamp"
          onClick={() => onChange(s)}
          onKeyDown={(event) => onKeyDown(event, i)}
        >
          <span className="size-stamp-face">{s}</span>
          <svg className="size-stamp-check" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <circle cx="8" cy="8" r="8" />
            <path d="M4.6 8.3l2.2 2.2 4.6-4.8" />
          </svg>
        </button>
      ))}
      {name && <input type="hidden" name={name} value={value ?? ''} />}
    </div>
  )
}
