# Design system

Every token lives in `apps/storefront/src/app/globals.css` under `:root`.
Never write a raw px/rem font-size, a raw section padding, or a bare
`transition: … ease` — use the tokens so the whole site scales as one system.

## Type scale

Fluid, ratio 1.25 (major third). Each step interpolates between a 360px phone
and a 1440px desktop, so no media query is needed to resize text.

| Token | Phone → Desktop | Used for |
|---|---|---|
| `--text-2xs` | 11 → 12px | Micro labels |
| `--text-xs` | 12 → 13px | Eyebrows, stock notes |
| `--text-sm` | 14 → 15px | Nav, meta, footer |
| `--text-base` | 16 → 17px | Body |
| `--text-md` | 18 → 20px | Lead paragraphs, price |
| `--text-lg` | 22 → 26px | Wordmark, card names |
| `--text-xl` | 28 → 36px | Section headings |
| `--text-2xl` | 36 → 52px | Page headings |
| `--text-3xl` | 44 → 72px | Hero |

## Space scale

Same base unit as type, so vertical rhythm stays coherent.

| Token | Value | Used for |
|---|---|---|
| `--space-3xs` … `--space-lg` | 4 → 32px | Component padding, gaps |
| `--space-xl` | 40 → 56px | Grid row gaps, footer |
| `--space-2xl` | 56 → 96px | Section padding |
| `--space-3xl` | 80 → 144px | Hero padding |

Sections sit at `--space-2xl` or higher on purpose. Cramped vertical rhythm is
the single clearest tell of a template build.

## Motion

Three curves, three durations. Everything uses one of them.

| Token | Value | Used for |
|---|---|---|
| `--ease-out-soft` | `cubic-bezier(0.32, 0.72, 0, 1)` | Entrances, hovers — mass and settle |
| `--ease-in-out-soft` | `cubic-bezier(0.65, 0, 0.35, 1)` | Symmetric state changes |
| `--dur-fast` | 180ms | Hover, focus |
| `--dur-mid` | 380ms | State changes |
| `--dur-slow` | 720ms | Scroll entrances, image scale |

`linear` and `ease-in-out` are banned — they read as mechanical.

`prefers-reduced-motion: reduce` collapses all three durations to 1ms and kills
animations globally. Motion components also check `useReducedMotion()` and
render static markup, so no animation is merely fast-forwarded.

## Reveal components

Scroll entrances with no animation code at the call site.

```tsx
import { Reveal, RevealStagger } from '@/components/Reveal'

<Reveal>            <h2>Khussa</h2>        </Reveal>
<Reveal delay={0.08}>…</Reveal>

<RevealStagger className="grid">
  {products.map((p) => <ProductCard key={p.slug} product={p} />)}
</RevealStagger>
```

`RevealStagger` cascades its direct children. A child opts in by spreading
`revealItem` into its own `motion.div` variants — see `ProductCard.tsx`.

Both fire once (`viewport={{ once: true }}`), so nothing re-animates on scroll
back. Animation is limited to `opacity` and `transform`, which stay on the GPU
and never trigger layout.

## Colour

Warm and earthy, drawn from the product rather than a stock e-commerce palette.
Both schemes are defined; `prefers-color-scheme: dark` swaps them.

| Token | Light | Dark |
|---|---|---|
| `--paper` | `#faf6f0` cream | `#14100c` near-black |
| `--paper-raised` | `#ffffff` | `#1e1811` |
| `--ink` | `#23190f` espresso | `#f2e9dc` |
| `--ink-soft` | `#6b5b4a` | `#a8967f` |
| `--line` | `#e4dace` | `#332a20` |
| `--accent` | `#7c2230` maroon | `#d4737f` |
| `--tan` | `#b8814a` leather | `#c99a63` |

To retune the palette, paste the six core values into
[realtimecolors.com](https://realtimecolors.com) and preview against a real
layout before editing `globals.css`.

## Tools in use

- **Motion for React** (`motion/react`) — installed, drives `Reveal`
- **taste-skill** — `high-end-visual-design`, `design-taste-frontend` and four
  others, installed globally at `~/.claude/skills/`
- **GSAP skills** — eight official skill docs installed globally. GSAP itself is
  not a dependency; Motion covers current needs. Add GSAP only if a timeline,
  pinned scroll section, or SplitText effect is actually required.
- **Haikei** (haikei.app) — SVG background generator, if a section ever needs a
  texture. Not used yet; the photography carries the page.

Not connected in this session, despite being asked for: GSAP MCP, 21st.dev MCP.
shadcn/ui is a CLI rather than an MCP and has not been added — the component
count here is small enough that hand-written CSS stays lighter.
