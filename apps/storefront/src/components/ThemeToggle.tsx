'use client'

import { useEffect, useState } from 'react'

/**
 * Light/dark switch for the header: <ThemeToggle />, no props.
 *
 * The theme is html[data-theme="light" | "dark"]; unset means "follow the
 * system". The inline script in layout.tsx applies a saved choice before
 * paint, so this component only writes it. Which theme is showing is read from
 * the --dark token (0 or 1, set in globals.css), so CSS stays the one source
 * of truth and the label is right whether the theme came from the system or
 * from a click.
 *
 * The icon is a cut-paper sun and moon; their swap is pure CSS keyed on
 * --dark (".theme-toggle" in globals.css), so it also turns when the system
 * theme changes. During a click the root gets .theme-fade for 320ms, which
 * crossfades the body colours instead of snapping them.
 */

export const THEME_KEY = 'chappal-theme'

const isDark = () => getComputedStyle(document.documentElement).getPropertyValue('--dark').trim() === '1'

export function ThemeToggle() {
  // null until mounted: the server cannot know the theme.
  const [dark, setDark] = useState<boolean | null>(null)

  useEffect(() => {
    setDark(isDark())
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setDark(isDark())
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggle = () => {
    const root = document.documentElement
    const next = isDark() ? 'light' : 'dark'
    root.classList.add('theme-fade')
    root.dataset.theme = next
    try { localStorage.setItem(THEME_KEY, next) } catch {}
    setDark(next === 'dark')
    setTimeout(() => root.classList.remove('theme-fade'), 320)
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <g className="tt-sun">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} className="cut-tan" d="M11 1.6h2l-.4 3.4h-1.2z" transform={`rotate(${a} 12 12)`} />
          ))}
          <circle className="cut-shadow" cx="13.2" cy="13.2" r="5" />
          <circle className="cut-tan" cx="12" cy="12" r="5" />
        </g>
        <g className="tt-moon">
          <path className="cut-shadow" d="M14 4.8A7.5 7.5 0 1 0 19.2 14A6 6 0 0 1 14 4.8Z" transform="translate(1.2 1.2)" />
          <path className="cut-tan" d="M14 4.8A7.5 7.5 0 1 0 19.2 14A6 6 0 0 1 14 4.8Z" />
        </g>
      </svg>
    </button>
  )
}
