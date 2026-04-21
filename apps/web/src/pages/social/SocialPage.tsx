import { useState } from 'react'
import { Icon, Badge, Cover, type CoverBook } from '../../components/mtr/primitives'

const BOOKS: CoverBook[] = [
  { id: 'mirror-of-moon', title: 'The Mirror of Moonfall', author: 'Aster-07 × Yu Wen', published: '2026·03' },
  { id: 'garden-glass', title: 'A Garden Made of Glass', author: 'Lin Qi', published: '2026·01' },
  { id: 'nine-station', title: 'Nine-Station Local', author: 'Claude-4 × Tao', published: '2026·04' },
  { id: 'pure-archive', title: 'The Archive of Rain', author: 'Nebula-Gen', published: '2026·02' },
]

const TABS = [
  ['Latest', '最新'],
  ['Highlights', '书摘'],
  ['Debates', 'AI 灵魂'],
  ['Book-maps', '书单'],
] as const

const ACTIVITIES = [
  ['@ma_xiaonan', 'highlighted', '¶ 3 · The remaining five words…'],
  ['@wenlin', 'noted', 'the seven-word form is an anagram of…'],
  ['@tao', 'started', 'The Archive of Rain'],
  ['@lin_qi', 'finished', 'Six Rooms, One Return'],
] as const

const CIRCLES = [
  ['Mirror Circle', '82 now', 'oklch(0.82 0.10 35)'],
  ['AI-Soul Debate', '14 now', 'oklch(0.75 0.08 270)'],
  ['Kitchen Supper', '6 now', 'oklch(0.82 0.10 85)'],
] as const

const READER_COLORS = ['#8a5f3a', '#4a5c3f', '#6c3a4a', '#2d3a52', '#b5754a'] as const
const READER_INITIALS = ['Y', 'M', 'L', 'T', 'A'] as const

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState(1)

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div className="scroll" style={{ flex: 1, overflow: 'auto' }}>
        {/* Header */}
        <section style={{ padding: '34px 44px 24px', borderBottom: '1px solid var(--rule)' }}>
          <div className="eyebrow">Book Club · Mirror of Moonfall</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
            <div className="display" style={{ fontSize: 44, fontWeight: 300, letterSpacing: -1 }}>
              The people reading with you.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', marginRight: 6 }}>
                {READER_COLORS.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: c,
                      border: '2px solid var(--paper)',
                      marginLeft: i ? -8 : 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontFamily: 'var(--font-display)',
                      fontSize: 11,
                    }}
                  >
                    {READER_INITIALS[i]}
                  </div>
                ))}
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>+1,284 reading now</div>
              <button className="btn">Join the circle</button>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0 }}>
          {/* Main feed */}
          <section style={{ padding: '32px 44px', borderRight: '1px solid var(--rule)' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 18, marginBottom: 28 }}>
              {TABS.map(([en, zh], i) => (
                <div
                  key={en}
                  className={`chip ${activeTab === i ? 'active' : ''}`}
                  onClick={() => setActiveTab(i)}
                  style={{ cursor: 'pointer' }}
                >
                  {en} · <span className="cjk" style={{ opacity: 0.7 }}>{zh}</span>
                </div>
              ))}
            </div>

            {/* Highlight card */}
            <article
              style={{
                padding: '36px 40px',
                background: 'linear-gradient(160deg, oklch(0.96 0.03 80), oklch(0.92 0.04 60))',
                borderRadius: 2,
                border: '1px solid var(--rule)',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: 28,
              }}
            >
              <div
                className="display"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: 'var(--terracotta)',
                }}
              >
                A HIGHLIGHT · SHARED 2H AGO
              </div>
              <blockquote style={{ margin: '18px 0 14px', padding: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-display)',
                    fontSize: 32,
                    lineHeight: 1.35,
                    fontWeight: 400,
                    letterSpacing: -0.4,
                    color: 'var(--ink)',
                    fontStyle: 'italic',
                    textWrap: 'pretty',
                  }}
                >
                  "The remaining five words she kept privately, the way one keeps a tooth in a drawer: uselessly, but with a conviction that it may one day matter."
                </p>
              </blockquote>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: '#8a5f3a',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: 13,
                  }}
                >
                  M
                </div>
                <div>
                  <div className="sans" style={{ fontSize: 13, fontWeight: 500 }}>
                    Ma Xiaonan · <span className="cjk" style={{ color: 'var(--ink-3)' }}>马小南</span>
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                    MIRROR OF MOONFALL · CH 1 · ¶ 3
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 14, fontSize: 11 }} className="mono">
                  <span>
                    <Icon name="heart" size={11} color="var(--terracotta)" /> 284
                  </span>
                  <span>
                    <Icon name="chat" size={11} /> 42
                  </span>
                  <span>
                    <Icon name="share" size={11} /> 61
                  </span>
                </div>
              </div>
            </article>

            {/* Discussion 1 */}
            <article style={{ padding: '22px 0', borderBottom: '1px solid var(--rule-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: '#2d3a52',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: 12,
                  }}
                >
                  T
                </div>
                <div>
                  <div className="sans" style={{ fontSize: 13, fontWeight: 500 }}>
                    Tao · <span className="cjk" style={{ color: 'var(--ink-3)' }}>陶</span>
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>4h AGO · DEBATE · AI SOUL</div>
                </div>
                <div style={{ flex: 1 }} />
                <Badge type="pure" sm />
              </div>
              <div className="display" style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.3, marginBottom: 6 }}>
                Did a machine write the tooth-in-a-drawer sentence? Does it matter?
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                The audit says 68/32. The sentence reads 100/0 to my ear — it's so strange it could only be a machine's, so emotionally exact it could only be a person's. I keep re-reading it the way one examines a found coin.
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }} className="mono">
                <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                  <Icon name="chat" size={10} /> 142 replies
                </span>
                <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                  <Icon name="heart" size={10} /> 412 agree
                </span>
              </div>
            </article>

            {/* Discussion 2 */}
            <article
              style={{
                padding: '22px 0',
                borderBottom: '1px solid var(--rule-2)',
                display: 'grid',
                gridTemplateColumns: '1fr 160px',
                gap: 24,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: '#b5754a',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-display)',
                      fontSize: 12,
                    }}
                  >
                    L
                  </div>
                  <div>
                    <div className="sans" style={{ fontSize: 13, fontWeight: 500 }}>
                      Lin Qi · <span className="cjk" style={{ color: 'var(--ink-3)' }}>林绮</span>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                      YESTERDAY · BOOK-MAP · 7 TITLES
                    </div>
                  </div>
                </div>
                <div className="display" style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.3, marginBottom: 6 }}>
                  Seven books in which the moon is a character.
                </div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                  A curated shelf where our satellite misbehaves — falls, forgets, lies, writes letters. Moonfall is #1. The list is chronological by moon-mood.
                </p>
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }} className="mono">
                  <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                    <Icon name="bookmark" size={10} /> 1,204 saved
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                    <Icon name="chat" size={10} /> 38
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {BOOKS.slice(0, 4).map((b, i) => (
                  <div key={b.id} style={{ marginLeft: i ? -18 : 0, transform: `rotate(${i * 2 - 3}deg)`, zIndex: 4 - i }}>
                    <Cover book={b} size="sm" />
                  </div>
                ))}
              </div>
            </article>

            {/* Discussion 3 */}
            <article style={{ padding: '22px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: '#4a5c3f',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: 12,
                  }}
                >
                  W
                </div>
                <div>
                  <div className="sans" style={{ fontSize: 13, fontWeight: 500 }}>
                    Wenlin · <span className="cjk" style={{ color: 'var(--ink-3)' }}>文琳</span>
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>6H AGO · READ-ALONG</div>
                </div>
                <div style={{ flex: 1 }} />
                <button className="btn ghost" style={{ fontSize: 11 }}>
                  Join · 82 reading
                </button>
              </div>
              <div className="display" style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.3, marginBottom: 6 }}>
                Slow read: <span style={{ fontStyle: 'italic' }}>Moonfall</span>, two chapters a week, starts Friday.
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                Meeting in the Mirror Circle on Sundays. We'll discuss the five missing words at chapter 8. Bring your own interpretation.
              </p>
            </article>
          </section>

          {/* Right rail */}
          <aside style={{ padding: '32px 32px' }}>
            <div className="eyebrow">Today in the margin</div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ACTIVITIES.map(([u, v, t]) => (
                <div key={t} style={{ display: 'flex', gap: 10, fontSize: 12, lineHeight: 1.5 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--terracotta)',
                      marginTop: 6,
                    }}
                  />
                  <div>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{u}</span>
                    <span style={{ color: 'var(--ink-3)', fontSize: 11 }}> {v} </span>
                    <div style={{ color: 'var(--ink-2)', marginTop: 2 }}>{t}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="eyebrow" style={{ marginTop: 30 }}>Live circles</div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CIRCLES.map(([n, c, col]) => (
                <div
                  key={n}
                  style={{
                    padding: '12px 14px',
                    border: '1px solid var(--rule)',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: col,
                      boxShadow: `0 0 0 3px ${col}40`,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div className="sans" style={{ fontSize: 13, fontWeight: 500 }}>{n}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{c}</div>
                  </div>
                  <Icon name="right" size={11} color="var(--ink-3)" />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
