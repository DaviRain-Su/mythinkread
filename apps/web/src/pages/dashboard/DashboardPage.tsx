import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon, Cover, type CoverBook } from '../../components/mtr/primitives'
import React, { Suspense } from 'react'

// Kumo UI Button (lazy loaded)
const KumoButton = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.Button as unknown as React.ComponentType<any>,
  }))
)

const BOOKS: CoverBook[] = [
  { id: 'mirror-of-moon', title: 'The Mirror of Moonfall', author: 'Aster-07 × Yu Wen', published: '2026·03' },
  { id: 'garden-glass', title: 'A Garden Made of Glass', author: 'Lin Qi', published: '2026·01' },
  { id: 'nine-station', title: 'Nine-Station Local', author: 'Claude-4 × Tao', published: '2026·04' },
]

const STATS = [
  ['42', 'BOOKS FINISHED', '12 pure AI · 18 light · 12 heavy'],
  ['142h', 'READING TIME', 'avg · 23 min/day · longest streak 34d'],
  ['2,482', 'NOTES & HIGHLIGHTS', '184 public · 2,298 private'],
  ['18', 'DATA EXPORTS', '3 API tokens · 1 obsidian sync'],
] as const

const VITALS = [
  ['Avg. session', '23 min'],
  ['Best time', '22:14 — midnight'],
  ['Longest streak', '34 days'],
  ['Reading speed', '312 wpm · literary'],
] as const

const THIRD_PARTIES = [
  ['Obsidian Sync', 'read · notes, highlights', '✓'],
  ['Personal GPT', 'read · whole archive', '✓'],
  ['Readwise', 'read · highlights only', 'revoked'],
] as const

const HEAT_COLORS = [
  'var(--paper-3)',
  'oklch(0.86 0.04 60)',
  'oklch(0.74 0.08 45)',
  'oklch(0.62 0.11 35)',
  'oklch(0.48 0.14 30)',
] as const

function generateHeatmapData(): number[][] {
  return Array.from({ length: 52 }, () =>
    Array.from({ length: 7 }, () => Math.max(0, Math.min(4, Math.round(Math.random() * 4 - 0.7))))
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [days] = useState(generateHeatmapData)
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

  const tooltipPos = useMemo(() => {
    if (!hoveredCell) return null
    const [weekIdx, dayIdx] = hoveredCell.split('-').map(Number)
    return { weekIdx, dayIdx }
  }, [hoveredCell])

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div className="scroll" style={{ flex: 1, overflow: 'auto', padding: '36px 44px 60px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <div className="eyebrow">{t('dashboard.yearReview')}</div>
            <div className="display" style={{ fontSize: 54, fontWeight: 300, letterSpacing: -1.5, marginTop: 6 }}>
              {t('dashboard.hoursRead', { hours: 142 })}
            </div>
            <div className="cjk" style={{ fontSize: 18, color: 'var(--ink-3)', marginTop: 4 }}>
              {t('dashboard.statsSummary', { books: 42, words: '1,204,000', notes: 2482, exports: 18 })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Suspense fallback={<button className="btn ghost"><Icon name="download" size={11} /> &nbsp;Export JSON</button>}>
              <KumoButton variant="ghost"><Icon name="download" size={11} /> &nbsp;Export JSON</KumoButton>
            </Suspense>
            <Suspense fallback={<button className="btn ghost"><Icon name="download" size={11} /> &nbsp;Export CSV</button>}>
              <KumoButton variant="ghost"><Icon name="download" size={11} /> &nbsp;Export CSV</KumoButton>
            </Suspense>
            <Suspense fallback={<button className="btn"><Icon name="globe" size={11} /> &nbsp;API key</button>}>
              <KumoButton><Icon name="globe" size={11} /> &nbsp;API key</KumoButton>
            </Suspense>
          </div>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            borderTop: '2px solid var(--ink)',
            borderBottom: '1px solid var(--rule)',
            marginBottom: 32,
          }}
        >
          {STATS.map(([v, k, d], i) => (
            <div key={k} style={{ padding: '22px 24px', borderLeft: i ? '1px solid var(--rule)' : 'none' }}>
              <div className="display" style={{ fontSize: 40, fontWeight: 300, letterSpacing: -1 }}>{v}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.14em', marginTop: 2 }}>
                {k}
              </div>
              <div className="sans" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>{d}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 40 }}>
          <section>
            {/* Heatmap */}
            <div className="eyebrow">Year at a glance · minutes read per day</div>
            <div style={{ display: 'flex', gap: 2, marginTop: 14, position: 'relative' }}>
              {days.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {week.map((v, di) => (
                    <div
                      key={di}
                      onMouseEnter={() => setHoveredCell(`${wi}-${di}`)}
                      onMouseLeave={() => setHoveredCell(null)}
                      style={{
                        width: 10,
                        height: 10,
                        background: HEAT_COLORS[v],
                        borderRadius: 1,
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              ))}
              {tooltipPos && (
                <div
                  style={{
                    position: 'absolute',
                    left: tooltipPos.weekIdx * 12 + 14,
                    top: tooltipPos.dayIdx * 12 - 28,
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    padding: '4px 8px',
                    borderRadius: 2,
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                  }}
                >
                  {days[tooltipPos.weekIdx][tooltipPos.dayIdx] * 15 + Math.floor(Math.random() * 15)} min
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)' }}>LESS</div>
              {[0, 1, 2, 3, 4].map((v) => (
                <div key={v} style={{ width: 10, height: 10, background: HEAT_COLORS[v], borderRadius: 1 }} />
              ))}
              <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)' }}>MORE</div>
            </div>

            <hr className="rule-h" style={{ margin: '32px 0' }} />

            {/* AI-blend distribution */}
            <div className="eyebrow">Your AI-blend distribution</div>
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: 'flex',
                  height: 40,
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid var(--rule)',
                }}
              >
                <div
                  style={{
                    width: '28%',
                    background: 'var(--ai-pure)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 14px',
                    color: '#fff',
                  }}
                >
                  <div>
                    <div className="display" style={{ fontSize: 18, lineHeight: 1 }}>12</div>
                    <div className="mono" style={{ fontSize: 9, letterSpacing: '.14em' }}>PURE AI</div>
                  </div>
                </div>
                <div
                  style={{
                    width: '43%',
                    background: 'var(--ai-light)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 14px',
                    color: '#fff',
                  }}
                >
                  <div>
                    <div className="display" style={{ fontSize: 18, lineHeight: 1 }}>18</div>
                    <div className="mono" style={{ fontSize: 9, letterSpacing: '.14em' }}>LIGHT COLLAB</div>
                  </div>
                </div>
                <div
                  style={{
                    width: '29%',
                    background: 'var(--moss)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 14px',
                    color: '#fff',
                  }}
                >
                  <div>
                    <div className="display" style={{ fontSize: 18, lineHeight: 1 }}>12</div>
                    <div className="mono" style={{ fontSize: 9, letterSpacing: '.14em' }}>HEAVY HUMAN</div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="rule-h" style={{ margin: '32px 0' }} />

            {/* Most marginalia'd */}
            <div className="eyebrow">Most marginalia'd</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 14 }}>
              {BOOKS.slice(0, 3).map((b, i) => (
                <div key={b.id}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div className="display" style={{ fontSize: 34, fontWeight: 300, color: 'var(--ink-4)', lineHeight: 1 }}>
                      №{i + 1}
                    </div>
                    <Cover book={b} size="sm" />
                  </div>
                  <div className="display" style={{ fontSize: 15, marginTop: 10, fontWeight: 500, lineHeight: 1.2 }}>
                    {b.title}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
                    {[142, 98, 61][i]} notes · {[412, 284, 214][i]} highlights
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sidebar */}
          <aside>
            <div style={{ padding: 20, background: 'var(--ink)', color: 'var(--paper)', borderRadius: 2 }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--paper-3)', letterSpacing: '.14em' }}>
                DATA SOVEREIGNTY
              </div>
              <div className="display" style={{ fontSize: 22, fontWeight: 500, marginTop: 8, lineHeight: 1.2 }}>
                You own this. Every byte.
              </div>
              <p style={{ margin: '10px 0 14px', fontSize: 12, lineHeight: 1.55, color: 'var(--paper-2)', opacity: 0.85 }}>
                Your reading history, highlights, notes and annotations are stored as a portable{' '}
                <span className="mono">.mtr</span> archive. Take it with you — to Obsidian, to a local AI, to a future we haven't written yet.
              </p>
              <div className="mono" style={{ fontSize: 10, color: 'var(--paper-3)', wordBreak: 'break-all' }}>
                you.mtr · 24.8 MB · last sync 2m ago
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <div className="eyebrow">Authorized third parties</div>
              <div style={{ marginTop: 10 }}>
                {THIRD_PARTIES.map(([n, s, st]) => (
                  <div
                    key={n}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: '1px solid var(--rule-2)',
                    }}
                  >
                    <div>
                      <div className="sans" style={{ fontSize: 12, fontWeight: 500 }}>{n}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{s}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: st === '✓' ? 'var(--moss)' : 'var(--crimson)' }}>
                      {st}
                    </div>
                  </div>
                ))}
              </div>
              <Suspense fallback={<button className="btn ghost" style={{ width: '100%', marginTop: 12, fontSize: 11 }}>
                <Icon name="plus" size={10} /> &nbsp;Authorize new integration
              </button>}>
                <KumoButton variant="ghost" style={{ width: '100%', marginTop: 12, fontSize: 11 }}>
                  <Icon name="plus" size={10} /> &nbsp;Authorize new integration
                </KumoButton>
              </Suspense>
            </div>

            <div style={{ marginTop: 26 }}>
              <div className="eyebrow">Reading vitals</div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {VITALS.map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingBottom: 8,
                      borderBottom: '1px dashed var(--rule-2)',
                    }}
                  >
                    <span className="sans" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{k}</span>
                    <span className="display" style={{ fontSize: 14, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
