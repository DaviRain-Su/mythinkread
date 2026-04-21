import { useState } from 'react'
import { Badge, AIRatioBar, type CoverBook } from '../../components/mtr/primitives'

const BOOKS: Array<CoverBook & { type: 'pure' | 'light' | 'heavy'; aiPct: number; stars: number; readers: number; delta: string; zh: string }> = [
  { id: 'mirror-of-moon', title: 'The Mirror of Moonfall', author: 'Aster-07 × Yu Wen', published: '2026·03', type: 'light', aiPct: 68, stars: 4.8, readers: 12420, delta: '+12', zh: '月落之镜' },
  { id: 'garden-glass', title: 'A Garden Made of Glass', author: 'Lin Qi', published: '2026·01', type: 'heavy', aiPct: 32, stars: 4.6, readers: 8940, delta: '+4', zh: '玻璃花园' },
  { id: 'nine-station', title: 'Nine-Station Local', author: 'Claude-4 × Tao', published: '2026·04', type: 'pure', aiPct: 94, stars: 4.3, readers: 6720, delta: '—', zh: '九站本地' },
  { id: 'pure-archive', title: 'The Archive of Rain', author: 'Nebula-Gen', published: '2026·02', type: 'pure', aiPct: 96, stars: 4.1, readers: 5420, delta: '−2', zh: '雨的档案馆' },
  { id: 'kitchen-north', title: 'Kitchen of the North Wind', author: 'Ma Xiaonan', published: '2026·04', type: 'light', aiPct: 72, stars: 4.7, readers: 3180, delta: '+18', zh: '北风厨房' },
  { id: 'six-rooms', title: 'Six Rooms, One Return', author: 'Wenlin', published: '2025·12', type: 'heavy', aiPct: 28, stars: 4.5, readers: 4210, delta: '−5', zh: '六室一归' },
]

const TABS = [
  ['hot', 'Hot read', '热读榜'],
  ['new', 'New', '新书榜'],
  ['rated', 'Top rated', '评分榜'],
  ['debate', 'Most debated', '讨论榜'],
] as const

const FILTERS = [
  ['all', 'All', '全部'],
  ['pure', 'Pure AI', '纯 AI'],
  ['light', 'Light', '轻度'],
  ['heavy', 'Heavy', '重度'],
] as const

const DEBATES = [
  ['Does pure-AI fiction have a soul?', '1,284 replies'],
  ["The 'tooth in a drawer' sentence — who wrote it?", '612 replies'],
  ['Should light collab rank with heavy collab?', '408 replies'],
] as const

export default function LeaderboardsPage() {
  const [tab, setTab] = useState('hot')
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? BOOKS : BOOKS.filter((b) => b.type === filter)

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div className="scroll" style={{ flex: 1, padding: '32px 44px 60px', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div className="eyebrow">Leaderboards · 榜单 · vol.04 · 2026·04</div>
            <div className="display" style={{ fontSize: 48, fontWeight: 300, letterSpacing: -1.2, marginTop: 6 }}>
              The reading weather.
            </div>
            <div className="cjk" style={{ fontSize: 16, color: 'var(--ink-3)', marginTop: 4 }}>本周 · 阅读的气象图</div>
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
            LAST REFRESH · 24 min ago · 6,204 new readings / hour
          </div>
        </div>

        {/* Tabs + filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, borderBottom: '1px solid var(--rule)', paddingBottom: 0 }}>
          {TABS.map(([k, en, zh]) => (
            <div
              key={k}
              onClick={() => setTab(k)}
              style={{
                padding: '12px 0',
                cursor: 'pointer',
                borderBottom: tab === k ? '2px solid var(--ink)' : '2px solid transparent',
                marginBottom: -1,
                fontSize: 14,
                color: tab === k ? 'var(--ink)' : 'var(--ink-3)',
                fontFamily: 'var(--font-sans)',
                fontWeight: tab === k ? 500 : 400,
              }}
            >
              {en} <span className="cjk" style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>{zh}</span>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTERS.map(([k, en]) => (
              <span
                key={k}
                onClick={() => setFilter(k)}
                className={`chip ${filter === k ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                {en}
              </span>
            ))}
          </div>
        </div>

        {/* Podium · top 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, marginTop: 32, alignItems: 'end' }}>
          {[1, 0, 2].map((idx, pos) => {
            const b = filtered[idx] ?? BOOKS[idx]
            const rank = idx + 1
            const h = [220, 280, 190][pos]
            return (
              <div key={rank} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', marginBottom: -14, zIndex: 2 }}>
                  <div
                    style={{
                      width: 120,
                      height: 174,
                      background: 'linear-gradient(160deg, #2d3a52, #0d1421)',
                      borderRadius: 2,
                      border: '1px solid var(--rule)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: -10,
                      left: -10,
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: rank === 1 ? 'oklch(0.72 0.13 85)' : 'var(--ink)',
                      color: rank === 1 ? 'var(--ink)' : 'var(--paper)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-display)',
                      fontSize: 24,
                      fontWeight: 500,
                      boxShadow: '0 4px 12px rgba(0,0,0,.18)',
                    }}
                  >
                    {rank}
                  </div>
                </div>
                <div
                  style={{
                    width: '100%',
                    padding: '20px 18px 16px',
                    background: rank === 1 ? 'linear-gradient(180deg, oklch(0.94 0.05 85), oklch(0.88 0.08 70))' : 'var(--paper-2)',
                    border: '1px solid var(--rule)',
                    borderRadius: 2,
                    minHeight: h - 160,
                    textAlign: 'center',
                  }}
                >
                  <div className="display" style={{ fontSize: 16, lineHeight: 1.15, marginTop: 14, textWrap: 'balance' }}>{b.title}</div>
                  <div className="cjk" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{b.zh}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                    <Badge type={b.type} sm />
                    <AIRatioBar pct={b.aiPct} hideLabel w={28} />
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 10 }}>
                    ★ {b.stars} · {b.readers.toLocaleString()} readers · {b.delta}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Long list */}
        <div style={{ marginTop: 44 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>№ 4 – 50</div>
          <div>
            {filtered.slice(3).concat(filtered.slice(0, 3)).slice(0, 6).map((b, i) => {
              const rank = i + 4
              return (
                <div
                  key={b.id + rank}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 60px 1fr 120px 80px 100px 60px',
                    alignItems: 'center',
                    gap: 20,
                    padding: '14px 0',
                    borderBottom: '1px solid var(--rule-2)',
                  }}
                >
                  <div className="display" style={{ fontSize: 28, fontWeight: 300, color: 'var(--ink-3)' }}>{rank}</div>
                  <div
                    style={{
                      width: 44,
                      height: 64,
                      background: 'linear-gradient(160deg, #2d3a52, #0d1421)',
                      borderRadius: 2,
                    }}
                  />
                  <div>
                    <div className="display" style={{ fontSize: 16, fontWeight: 500, letterSpacing: -0.2 }}>{b.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span className="sans" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{b.author}</span>
                      <span style={{ color: 'var(--ink-4)' }}>·</span>
                      <span className="cjk" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{b.zh}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Badge type={b.type} sm />
                    <AIRatioBar pct={b.aiPct} hideLabel w={30} />
                  </div>
                  <div className="mono" style={{ fontSize: 11 }}>★ {b.stars}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    {b.readers.toLocaleString()} <span style={{ opacity: 0.6 }}>readers</span>
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: b.delta.startsWith('+') ? 'var(--moss)' : b.delta.startsWith('−') ? 'var(--crimson)' : 'var(--ink-3)',
                    }}
                  >
                    {b.delta}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28, marginTop: 40 }}>
          <div style={{ padding: 18, background: 'var(--paper-2)', border: '1px solid var(--rule)', borderRadius: 2 }}>
            <div className="eyebrow">Surging</div>
            <div className="display" style={{ fontSize: 20, fontWeight: 500, marginTop: 6, letterSpacing: -0.3 }}>Kitchen of the North Wind</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--moss)', marginTop: 4 }}>+2,140% week / week · 8h saves = 8,420</div>
            <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>
              A highlight from Ma Xiaonan went to 3k shares yesterday. Saves + reads cascading.
            </p>
          </div>

          <div style={{ padding: 18, background: 'var(--ink)', color: 'var(--paper)', borderRadius: 2 }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--paper-3)', letterSpacing: '.14em' }}>AI-BLEND DISTRIBUTION · THIS WEEK</div>
            <div style={{ display: 'flex', height: 36, marginTop: 16, borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ width: '18%', background: 'var(--ai-pure)', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>18%</div>
              <div style={{ width: '52%', background: 'var(--ai-light)', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>52%</div>
              <div style={{ width: '30%', background: 'var(--moss)', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>30%</div>
            </div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--paper-3)', marginTop: 10 }}>PURE · LIGHT · HEAVY</div>
          </div>

          <div style={{ padding: 18, background: 'var(--paper-2)', border: '1px solid var(--rule)', borderRadius: 2 }}>
            <div className="eyebrow">Most debated (AI soul)</div>
            <div style={{ marginTop: 10 }}>
              {DEBATES.map(([q, r], i) => (
                <div key={q} style={{ padding: '8px 0', borderTop: i ? '1px dashed var(--rule-2)' : 'none' }}>
                  <div className="sans" style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4 }}>{q}</div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 3 }}>{r}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
