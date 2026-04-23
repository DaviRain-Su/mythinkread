import { useState } from 'react'
import { Icon } from '../../components/mtr/primitives'

const ENTITIES = [
  ['● Sen Yaolan', 'persona'],
  ['○ The Mother', 'persona · off-stage'],
  ['○ Qingye Village', 'place'],
  ['○ The Well', 'object'],
  ['○ The Ginkgo Row', 'symbol'],
  ['○ Mme. Hou', 'persona'],
  ['○ Uncle Bao', 'persona'],
] as const

const ATTRIBUTES = [
  ['Occupation', 'Astronomer · defrocked from Observatory № 4'],
  ['Hometown', 'Qingye Village · mountain, fictional'],
  ['Degree', 'Ph.D., Lunar Metrology'],
  ['Signature item', 'A folded 7-word letter'],
  ['Defining tic', 'Folds paper in one direction, then the other'],
  ['Voice', 'Quiet, precise, reluctantly warm'],
  ['First appears', 'Ch. 1 · ¶ 1'],
  ['Last named', 'Ch. 24 · ¶ 14'],
] as const

const ARC = [
  ['Ch 1', 'return', 'Reluctance'],
  ['Ch 6', 'measurement', 'First belief'],
  ['Ch 11', 'confession', 'Breakdown'],
  ['Ch 17', 'reconciliation', 'Softening'],
  ['Ch 24', 'naming', 'Arrival'],
] as const

const QUOTES = [
  ['Ch 3', 'I was trained to measure the moon, not to name its moods.'],
  ['Ch 11', 'I had thought I came back for her. I came back because no one else knew the shape of what I missed.'],
] as const

const BACKLINKS = [
  ['concepts/', 'Homesickness'],
  ['concepts/', 'Measurement'],
  ['themes/', 'Unspoken inheritance'],
  ['entities/', 'The Mother'],
  ['timeline/', '2026 · return'],
  ['analyses/', "On Sen's folding"],
] as const

const APPEARANCE_BARS = [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1] as const

const ARC_COLORS = [
  'oklch(0.48 0.14 25)',
  'oklch(0.58 0.14 35)',
  'oklch(0.72 0.10 85)',
  'oklch(0.75 0.08 148)',
  'oklch(0.48 0.07 148)',
] as const

export default function WikiEntityPage() {
  const [selectedIdx, setSelectedIdx] = useState(0)

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--paper-2)' }}>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '240px 1fr 320px', overflow: 'hidden' }}>
        {/* Left */}
        <aside style={{ borderRight: '1px solid var(--rule)', padding: '24px 14px', background: 'var(--paper)', overflow: 'auto' }} className="scroll">
          <div className="eyebrow">Mirror of Moonfall · Wiki</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 16 }}>
            <Icon name="sparkle" size={11} color="var(--terracotta)" />
            <div className="mono" style={{ fontSize: 9, color: 'var(--terracotta)' }}>LIVE · AI-MAINTAINED</div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', letterSpacing: '.14em', padding: '10px 4px 4px' }}>ENTITIES/</div>
            {ENTITIES.map(([t, d], i) => (
              <div
                key={t}
                onClick={() => setSelectedIdx(i)}
                style={{
                  padding: '8px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  borderLeft: i === selectedIdx ? '2px solid var(--accent)' : '2px solid transparent',
                  background: i === selectedIdx ? 'var(--paper-2)' : 'transparent',
                  color: i === selectedIdx ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: i === selectedIdx ? 500 : 400,
                }}
              >
                <div>{t}</div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 2 }}>{d}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main style={{ overflow: 'auto', padding: '40px 44px 60px' }} className="scroll">
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.14em' }}>ENTITIES / PERSONA / SEN-YAOLAN.md</div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 28, marginTop: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 140,
                height: 180,
                background: 'linear-gradient(160deg, #2d3a52, #0d1421)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: 10,
                color: '#e8d9a8',
                borderRadius: 2,
                border: '1px solid var(--rule)',
              }}
            >
              <div className="mono" style={{ fontSize: 8, letterSpacing: '.2em', opacity: 0.7 }}>PORTRAIT · AI</div>
              <div className="display" style={{ fontSize: 16, fontWeight: 400, marginTop: 4 }}>Sen Yaolan</div>
              <div className="cjk" style={{ fontSize: 10, opacity: 0.8 }}>森瑶岚</div>
            </div>
            <div>
              <div className="display" style={{ fontSize: 44, fontWeight: 300, letterSpacing: -0.8, lineHeight: 1 }}>Sen Yaolan</div>
              <div className="cjk" style={{ fontSize: 18, color: 'var(--ink-3)', marginTop: 4 }}>森瑶岚 · sēn yáo lán</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <span className="chip">protagonist</span>
                <span className="chip">astronomer</span>
                <span className="chip">age 34</span>
                <span className="chip">introvert</span>
                <span className="chip">ch 1 — 24</span>
                <span className="chip">wiki rev #18</span>
              </div>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: 'var(--ink)', marginTop: 18, fontFamily: 'var(--font-body)', textWrap: 'pretty' }}>
                A disgraced astronomer who measures the distance between things she can see and things she can no longer name. She returns to{' '}
                <a style={{ color: 'var(--terracotta)', borderBottom: '1px dotted var(--terracotta)', textDecoration: 'none' }}>Qingye Village</a> after fifteen years, summoned by{' '}
                <a style={{ color: 'var(--terracotta)', borderBottom: '1px dotted var(--terracotta)', textDecoration: 'none' }}>a letter of seven words</a>.
              </p>
            </div>
          </div>

          {/* Stat rows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 36 }}>
            <div>
              <div className="eyebrow">Attributes</div>
              <table className="mono" style={{ width: '100%', fontSize: 11, marginTop: 10, borderCollapse: 'collapse' }}>
                <tbody>
                  {ATTRIBUTES.map(([k, v], i) => (
                    <tr key={k} style={{ borderTop: i ? '1px solid var(--rule-2)' : '1px solid var(--rule)' }}>
                      <td style={{ padding: '8px 0', color: 'var(--ink-3)', width: 140 }}>{k}</td>
                      <td style={{ padding: '8px 0', color: 'var(--ink-2)' }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div className="eyebrow">Relationship graph</div>
              <div style={{ marginTop: 10, padding: 12, background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 2, height: 260 }}>
                <svg viewBox="0 0 380 220" style={{ width: '100%', height: '100%' }}>
                  <path d="M 190 110 L 60 50" stroke="var(--rule)" />
                  <path d="M 190 110 L 320 50" stroke="var(--rule)" />
                  <path d="M 190 110 L 60 180" stroke="var(--rule)" />
                  <path d="M 190 110 L 320 180" stroke="var(--rule)" />
                  <path d="M 190 110 L 190 30" stroke="var(--rule)" />

                  <text x="120" y="80" fontFamily="var(--font-mono)" fontSize="8" fill="var(--terracotta)">loves + unreconciled</text>
                  <text x="220" y="80" fontFamily="var(--font-mono)" fontSize="8" fill="var(--ink-3)">former colleague</text>
                  <text x="95" y="148" fontFamily="var(--font-mono)" fontSize="8" fill="var(--ink-3)">mentored by</text>
                  <text x="225" y="148" fontFamily="var(--font-mono)" fontSize="8" fill="var(--ink-3)">observes</text>

                  <circle cx="190" cy="110" r="34" fill="var(--terracotta)" />
                  <text x="190" y="108" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill="#fff">Sen Yaolan</text>
                  <text x="190" y="122" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill="#fff" opacity="0.7">SELF</text>

                  {[
                    [60, 50, 'The Mother', 'off-stage'],
                    [320, 50, 'Dr. Rui', 'colleague'],
                    [60, 180, 'Mme. Hou', 'elder'],
                    [320, 180, 'The Moon', 'entity'],
                    [190, 30, 'Uncle Bao', 'family'],
                  ].map(([x, y, n, k]) => (
                    <g key={n}>
                      <circle cx={x as number} cy={y as number} r="22" fill="var(--paper-2)" stroke="var(--ink-3)" />
                      <text x={x as number} y={y as number} textAnchor="middle" fontFamily="var(--font-display)" fontSize="10" fill="var(--ink)">{n}</text>
                      <text x={x as number} y={(y as number) + 11} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="7" fill="var(--ink-3)">{k}</text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>

          {/* Arc */}
          <h3 className="display" style={{ fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 8 }}>Character arc</h3>
          <div style={{ position: 'relative', padding: '24px 0 16px' }}>
            <div style={{ position: 'absolute', top: 36, left: 8, right: 8, height: 2, background: 'var(--rule)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {ARC.map(([c, act, mood], i) => (
                <div key={c} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      background: ARC_COLORS[i],
                      borderRadius: '50%',
                      margin: '14px auto 12px',
                      position: 'relative',
                      zIndex: 2,
                      border: '2px solid var(--paper-2)',
                    }}
                  />
                  <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '.14em' }}>{c.toUpperCase()}</div>
                  <div className="display" style={{ fontSize: 14, marginTop: 2 }}>{act}</div>
                  <div className="sans" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{mood}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quotes */}
          <h3 className="display" style={{ fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 8 }}>Notable quotes</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {QUOTES.map(([c, q]) => (
              <blockquote key={c} style={{ margin: 0, padding: '16px 18px', background: 'var(--paper)', border: '1px solid var(--rule-2)' }}>
                <div className="mono" style={{ fontSize: 9, color: 'var(--terracotta)', letterSpacing: '.14em' }}>{c.toUpperCase()}</div>
                <p style={{ margin: '6px 0 0', fontSize: 14, fontFamily: 'var(--font-body)', fontStyle: 'italic', lineHeight: 1.55, color: 'var(--ink-2)' }}>"{q}"</p>
              </blockquote>
            ))}
          </div>
        </main>

        {/* Right */}
        <aside style={{ borderLeft: '1px solid var(--rule)', padding: '24px 20px', background: 'var(--paper)', overflow: 'auto' }} className="scroll">
          <div className="eyebrow">Appearances</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6 }}>14 chapters · 612 paragraphs</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 2 }}>
            {APPEARANCE_BARS.map((v, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 22,
                  background: v ? 'var(--terracotta)' : 'var(--paper-3)',
                  opacity: v ? 0.4 + ((i * 37) % 60) / 100 : 1,
                }}
              />
            ))}
          </div>
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>CH 1</span>
            <span>CH 24</span>
          </div>

          <div className="eyebrow" style={{ marginTop: 22 }}>Backlinks · 28</div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {BACKLINKS.map(([d, t]) => (
              <div key={t} style={{ padding: '8px 10px', background: 'var(--paper-2)', borderLeft: '2px solid var(--indigo)', fontSize: 12 }}>
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{d}</div>
                <div style={{ color: 'var(--ink-2)', marginTop: 2 }}>{t}</div>
              </div>
            ))}
          </div>

          <div className="eyebrow" style={{ marginTop: 22 }}>Community additions</div>
          <div style={{ marginTop: 8, padding: 10, background: 'var(--paper-2)', borderRadius: 2, borderLeft: '2px solid var(--moss)' }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>@WENLIN · 2 days ago · accepted by LLM</div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5, fontStyle: 'italic' }}>
              Added 'voice' field — 'reluctantly warm' captures her shift in ch. 17.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
