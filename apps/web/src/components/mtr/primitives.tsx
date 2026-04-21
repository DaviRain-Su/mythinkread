import type { CSSProperties, ReactNode } from 'react'

export type AIType = 'pure' | 'light' | 'heavy'

export const AI_BADGES: Record<AIType, { label: string; zh: string; range: string; color: string }> = {
  pure: { label: 'Pure AI', zh: '纯 AI', range: '≥90%', color: 'var(--ai-pure)' },
  light: { label: 'Light collab', zh: '轻度人机', range: '50–90%', color: 'var(--ai-light)' },
  heavy: { label: 'Heavy human', zh: '重度人机', range: '<50%', color: 'var(--ai-heavy)' },
}

export function aiTypeFromPct(pct: number | undefined | null): AIType {
  const v = typeof pct === 'number' ? pct : 50
  if (v >= 90) return 'pure'
  if (v >= 50) return 'light'
  return 'heavy'
}

const ICONS: Record<string, ReactNode> = {
  search: <><circle cx="7.5" cy="7.5" r="5" /><path d="M11.5 11.5L15 15" /></>,
  book: <><path d="M3 3h5a3 3 0 013 3v9a3 3 0 00-3-3H3z"/><path d="M15 3h-5a3 3 0 00-3 3v9a3 3 0 013-3h5z"/></>,
  pen: <><path d="M2 14l2-.5L13 4.5 11.5 3 2.5 12z"/><path d="M13 4.5L14.5 3l-1.5-1.5L11.5 3"/></>,
  sparkle: <path d="M9 2l1.5 5.5L16 9l-5.5 1.5L9 16l-1.5-5.5L2 9l5.5-1.5z"/>,
  chat: <path d="M2 4a2 2 0 012-2h10a2 2 0 012 2v7a2 2 0 01-2 2H7l-3 3v-3H4a2 2 0 01-2-2z"/>,
  chart: <><path d="M2 14h14"/><path d="M4 14V8M8 14V4M12 14v-7"/></>,
  grid: <><rect x="2" y="2" width="5" height="5"/><rect x="11" y="2" width="5" height="5"/><rect x="2" y="11" width="5" height="5"/><rect x="11" y="11" width="5" height="5"/></>,
  list: <path d="M2 4h14M2 9h14M2 14h14"/>,
  bookmark: <path d="M4 2h10v14l-5-3-5 3z"/>,
  heart: <path d="M9 15s-5-3-5-7a3 3 0 015-2 3 3 0 015 2c0 4-5 7-5 7z"/>,
  arrow: <><path d="M3 9h12M11 5l4 4-4 4"/></>,
  left: <path d="M11 4L5 9l6 5"/>,
  right: <path d="M7 4l6 5-6 5"/>,
  up: <path d="M4 11l5-6 5 6"/>,
  down: <path d="M4 7l5 6 5-6"/>,
  close: <path d="M4 4l10 10M14 4L4 14"/>,
  plus: <path d="M9 3v12M3 9h12"/>,
  check: <path d="M3 9l4 4 8-9"/>,
  eye: <><path d="M1.5 9s3-5.5 7.5-5.5S16.5 9 16.5 9 13.5 14.5 9 14.5 1.5 9 1.5 9z"/><circle cx="9" cy="9" r="2"/></>,
  ipfs: <><path d="M9 1.5L2 5.5v7L9 16.5l7-4v-7z"/><path d="M2 5.5L9 9.5l7-4M9 9.5v7"/></>,
  headphones: <><path d="M3 10a6 6 0 0112 0v4H3z"/><rect x="2" y="10" width="3" height="5"/><rect x="13" y="10" width="3" height="5"/></>,
  highlight: <><path d="M3 14l3-1 8-8-2-2-8 8z"/><path d="M13 2l2 2"/><path d="M2 16h5"/></>,
  note: <><path d="M3 3h9l3 3v9H3z"/><path d="M12 3v3h3"/><path d="M6 9h6M6 12h4"/></>,
  star: <path d="M9 1l2.5 5 5.5.8-4 3.9.9 5.5L9 13.6 4.1 16.2 5 10.7 1 6.8l5.5-.8z"/>,
  moon: <path d="M13 9.5a5.5 5.5 0 11-6-5.5A4.5 4.5 0 0013 9.5z"/>,
  sun: <><circle cx="9" cy="9" r="3"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.5 3.5l1.4 1.4M13.1 13.1l1.4 1.4M3.5 14.5l1.4-1.4M13.1 4.9l1.4-1.4"/></>,
  globe: <><circle cx="9" cy="9" r="7"/><path d="M2 9h14M9 2c2 2 3 4.5 3 7s-1 5-3 7c-2-2-3-4.5-3-7s1-5 3-7z"/></>,
  share: <><circle cx="4" cy="9" r="2"/><circle cx="14" cy="4" r="2"/><circle cx="14" cy="14" r="2"/><path d="M5.7 8l6.6-3M5.7 10l6.6 3"/></>,
  filter: <path d="M2 3h14l-5 7v5l-4-2v-3z"/>,
  menu: <path d="M2 5h14M2 9h14M2 13h14"/>,
  download: <path d="M9 2v9M5 8l4 4 4-4M3 15h12"/>,
  bell: <><path d="M5 13V8a4 4 0 018 0v5"/><path d="M3 13h12"/><path d="M8 15a1 1 0 002 0"/></>,
}

export function Icon({
  name,
  size = 14,
  stroke = 1.6,
  color = 'currentColor',
  style,
}: {
  name: keyof typeof ICONS | string
  size?: number
  stroke?: number
  color?: string
  style?: CSSProperties
}) {
  const path = ICONS[name]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {path ?? null}
    </svg>
  )
}

export function AIRatioBar({
  pct,
  hideLabel,
  w = 44,
}: {
  pct: number
  hideLabel?: boolean
  w?: number
}) {
  const aiW = Math.max(6, Math.min(94, pct))
  const huW = 100 - aiW
  return (
    <span className="ai-bar" title={`${pct}% AI · ${100 - pct}% human`}>
      <span className="track" style={{ width: w }}>
        <span className="ai" style={{ width: `${aiW}%` }} />
        <span className="hu" style={{ width: `${huW}%` }} />
      </span>
      {!hideLabel && (
        <span>
          {pct}
          <span style={{ opacity: 0.5 }}>/</span>
          {100 - pct}
        </span>
      )}
    </span>
  )
}

export function Badge({ type, sm, cn }: { type: AIType; sm?: boolean; cn?: boolean }) {
  const b = AI_BADGES[type]
  if (!b) return null
  return (
    <span
      className="chip"
      style={{
        padding: sm ? '2px 6px' : '3px 8px',
        fontSize: sm ? 9 : 10,
        borderColor: 'var(--rule)',
        color: 'var(--ink-2)',
        cursor: 'default',
      }}
    >
      <span className="dot" style={{ background: b.color, width: sm ? 5 : 6, height: sm ? 5 : 6 }} />
      {cn ? b.zh : b.label}
    </span>
  )
}

/**
 * Derive a deterministic gradient cover from a string seed (book id / title).
 * This lets us render editorial covers for any book even without curated art.
 */
function seedPalette(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const palettes = [
    { top: '#2d3a52', bot: '#0d1421', ink: '#e8d9a8' },
    { top: '#8a5f3a', bot: '#3a2212', ink: '#f0e4c7' },
    { top: '#4a5c3f', bot: '#1a2418', ink: '#dbe4c7' },
    { top: '#4a3a5c', bot: '#1d1428', ink: '#d9c9e6' },
    { top: '#b5754a', bot: '#5a2f18', ink: '#fbead0' },
    { top: '#6c3a4a', bot: '#2a1020', ink: '#f4d5dc' },
    { top: '#3f5c5c', bot: '#142424', ink: '#cbe0e0' },
    { top: '#7a5a2a', bot: '#2d1f0a', ink: '#f6e4c0' },
  ]
  return palettes[h % palettes.length]
}

export interface CoverBook {
  id: string
  title: string
  author?: string
  published?: string
  coverTop?: string
  coverBot?: string
  coverInk?: string
}

export function Cover({
  book,
  size = 'md',
  style,
}: {
  book: CoverBook
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  style?: CSSProperties
}) {
  const widths = { xs: 44, sm: 64, md: 110, lg: 160, xl: 240 }
  const w = widths[size]
  const h = Math.round(w * 1.45)
  const palette = seedPalette(book.id || book.title)
  const top = book.coverTop ?? palette.top
  const bot = book.coverBot ?? palette.bot
  const ink = book.coverInk ?? palette.ink
  const sizeClass = size === 'sm' || size === 'xs' ? 'sm' : size === 'lg' ? 'lg' : size === 'xl' ? 'xl' : ''
  return (
    <div
      className={`cover ${sizeClass}`}
      style={
        {
          width: w,
          height: h,
          '--cover-top': top,
          '--cover-bot': bot,
          '--cover-ink': ink,
          '--cover-bg': `linear-gradient(160deg, ${top}, ${bot})`,
          ...style,
        } as CSSProperties
      }
    >
      {size !== 'xs' && size !== 'sm' && (
        <div className="c-meta">MTR · {book.published ?? '2026'}</div>
      )}
      <div>
        <div className="c-title">{book.title}</div>
        {size !== 'xs' && size !== 'sm' && book.author && (
          <div className="c-author" style={{ marginTop: 6 }}>
            {book.author}
          </div>
        )}
      </div>
    </div>
  )
}

export function formatCID(cid: string) {
  if (!cid) return ''
  if (cid.length <= 18) return cid
  return `${cid.slice(0, 10)}…${cid.slice(-6)}`
}

export function CID({ value, short = true }: { value: string; short?: boolean }) {
  return (
    <span className="cid">
      <span style={{ opacity: 0.55 }}>ipfs:</span> {short ? formatCID(value) : value}
    </span>
  )
}

export function BilingualTitle({
  en,
  zh,
  size = 22,
  align = 'left',
}: {
  en: string
  zh?: string
  size?: number
  align?: 'left' | 'center' | 'right'
}) {
  return (
    <div style={{ textAlign: align, lineHeight: 1.1 }}>
      <div
        className="display"
        style={{ fontSize: size, fontWeight: 400, letterSpacing: `${-0.01 * size}px` }}
      >
        {en}
      </div>
      {zh && (
        <div
          className="cjk"
          style={{
            fontSize: size * 0.55,
            color: 'var(--ink-3)',
            letterSpacing: '0.05em',
            marginTop: 4,
          }}
        >
          {zh}
        </div>
      )}
    </div>
  )
}
