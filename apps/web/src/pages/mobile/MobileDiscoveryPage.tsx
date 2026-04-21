import { useState } from 'react'
import { AIRatioBar, Badge, Cover } from '../../components/mtr/primitives'
import type { AIType, CoverBook } from '../../components/mtr/primitives'

interface DisplayBook extends CoverBook {
  id: string
  title: string
  zh?: string
  author: string
  type: AIType
  aiPct: number
  stars: number
}

const BOOKS: DisplayBook[] = [
  {
    id: 'mirror-of-moon',
    title: 'The Mirror of Moonfall',
    zh: '月落之镜',
    author: 'Aster-07 × Yu Wen',
    type: 'light',
    aiPct: 68,
    stars: 4.6,
    published: '2026·03',
    coverTop: '#2d3a52',
    coverBot: '#0d1421',
    coverInk: '#e8d9a8',
  },
  {
    id: 'garden-glass',
    title: 'A Garden Made of Glass',
    zh: '玻璃的花园',
    author: 'Lin Qi',
    type: 'heavy',
    aiPct: 22,
    stars: 4.8,
    published: '2026·01',
    coverTop: '#8a5f3a',
    coverBot: '#3a2212',
    coverInk: '#f0e4c7',
  },
  {
    id: 'nine-station',
    title: 'Nine-Station Local',
    zh: '九站慢车',
    author: 'Claude-4 × Tao',
    type: 'light',
    aiPct: 54,
    stars: 4.4,
    published: '2026·04',
    coverTop: '#4a5c3f',
    coverBot: '#1a2418',
    coverInk: '#dbe4c7',
  },
  {
    id: 'pure-archive',
    title: 'The Archive of Rain',
    zh: '雨之档案馆',
    author: 'Nebula-Gen',
    type: 'pure',
    aiPct: 96,
    stars: 4.2,
    published: '2026·02',
    coverTop: '#4a3a5c',
    coverBot: '#1d1428',
    coverInk: '#d9c9e6',
  },
]

const CATEGORIES = ['All', 'Pure AI', 'Light', 'Heavy', 'Mystery', 'Sci-Fi', 'Lit.'] as const

export default function MobileDiscoveryPage() {
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const featured = BOOKS[0]

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--paper)',
      }}
      className="mtr"
    >
      <div
        style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}
        className="phone-scroll"
      >
        {/* Header */}
        <div style={{ paddingTop: 14, marginBottom: 18 }}>
          <div className="eyebrow">Vol. 04 · Spring 2026</div>
          <div
            className="display"
            style={{
              fontSize: 30,
              fontWeight: 300,
              letterSpacing: -0.8,
              lineHeight: 1,
              marginTop: 6,
              textWrap: 'balance',
            }}
          >
            The reader of{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>
              machines
            </span>
            .
          </div>
          <div
            className="cjk"
            style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}
          >
            机器之书,人之读
          </div>
        </div>

        {/* Featured card */}
        <div
          style={{
            marginBottom: 22,
            padding: 14,
            background: 'var(--paper-2)',
            border: '1px solid var(--rule)',
            borderRadius: 2,
          }}
        >
          <div style={{ display: 'flex', gap: 14 }}>
            <Cover book={featured} size="md" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="eyebrow">This week&apos;s pick</div>
              <div
                className="display"
                style={{
                  fontSize: 18,
                  lineHeight: 1.15,
                  marginTop: 4,
                  letterSpacing: -0.2,
                }}
              >
                {featured.title}
              </div>
              <div
                className="cjk"
                style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}
              >
                {featured.zh}
              </div>
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Badge type={featured.type} sm />
                <AIRatioBar pct={featured.aiPct} hideLabel w={32} />
              </div>
            </div>
          </div>
        </div>

        {/* Category chips */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 18,
            overflowX: 'auto',
          }}
          className="phone-scroll"
        >
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`chip ${activeCategory === c ? 'active' : ''}`}
              style={{
                flexShrink: 0,
                cursor: 'pointer',
                background:
                  activeCategory === c ? 'var(--ink)' : 'var(--paper-2)',
                color:
                  activeCategory === c ? 'var(--paper)' : 'var(--ink-2)',
                border: '1px solid var(--rule)',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Book list */}
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          New from the archive
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {BOOKS.slice(1, 4).map((b, i) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                gap: 14,
                paddingBottom: 16,
                borderBottom: '1px solid var(--rule-2)',
              }}
            >
              <Cover book={b} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="mono"
                  style={{ fontSize: 9, color: 'var(--ink-4)' }}
                >
                  № {String(i + 2).padStart(3, '0')}
                </div>
                <div
                  className="display"
                  style={{
                    fontSize: 15,
                    lineHeight: 1.15,
                    letterSpacing: -0.2,
                    marginTop: 3,
                  }}
                >
                  {b.title}
                </div>
                <div
                  className="cjk"
                  style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}
                >
                  {b.zh}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <Badge type={b.type} sm />
                  <AIRatioBar pct={b.aiPct} hideLabel w={28} />
                  <span
                    className="mono"
                    style={{ fontSize: 9, color: 'var(--ink-3)' }}
                  >
                    ★ {b.stars}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
