import { useState } from 'react'
import { Icon } from '../../components/mtr/primitives'

const EDIT_BREAKDOWN = [
  ['Insertions', '+18,240 words', 'oklch(0.60 0.11 148)', 44],
  ['Rewrites', '24,112 words changed', 'oklch(0.58 0.14 35)', 58],
  ['Deletions', '−9,340 words', 'oklch(0.48 0.14 25)', 22],
  ['Structural moves', '284 paragraph reorders', 'oklch(0.45 0.09 265)', 14],
] as const

const AI_DECLARATION = [
  ['Model used', 'Claude Haiku 4.5'],
  ['Draft mode', 'AI-first · human-edited'],
  ['Auto-classified as', 'Light collab (50–90% AI)'],
  ['Third-party copyright', 'none declared'],
  ['Creator attestation', 'signed · 2026·04·21'],
] as const

const MODERATION_ITEMS = [
  ['Content policy scan', 'pass', 'Workers AI · llama guard'],
  ['Third-party text match', '0 hits', 'fingerprint check'],
  ['Edit measurement', '32%', 'diff vs. first draft'],
  ['Author attestation', 'signed', 'creator confirmed'],
] as const

const STATS = [
  ['4,120', 'EDITS MADE'],
  ['14 days', 'TIMESPAN'],
  ['184,200', 'WORDS TOTAL'],
  ['58,946', 'WORDS REWRITTEN'],
] as const

export default function PublishGatePage() {
  const [editPct] = useState(32)
  const threshold = 20
  const passing = editPct >= threshold

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div className="scroll" style={{ flex: 1, padding: '40px 44px 60px', overflow: 'auto' }}>
        <div className="eyebrow">Creator Studio · Publish gate</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48, marginTop: 10 }}>
          <div>
            <div className="display" style={{ fontSize: 50, fontWeight: 300, letterSpacing: -1.4, lineHeight: 1, textWrap: 'balance' }}>
              Every MTR book must cross <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>the line of the hand</span>.
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink-2)', fontFamily: 'var(--font-body)', marginTop: 20, maxWidth: 560 }}>
              You may generate freely. You must also edit. We measure edits — insertions, deletions, rewrites, deliberate cuts — and only books with at least <strong>20% human revision</strong> can be minted to IPFS.
            </p>
            <div className="cjk" style={{ fontSize: 16, color: 'var(--ink-3)', marginTop: 10 }}>
              AI 初稿 · 人工显著编辑 · ≥20% 修改率 · 方可发布
            </div>

            {/* Big gauge */}
            <div style={{ marginTop: 36, padding: 28, background: 'var(--paper-2)', border: '1px solid var(--rule)', borderRadius: 2 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div className="eyebrow">Measured human revision</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>LIVE · recomputed every save</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 18 }}>
                <div
                  className="display"
                  style={{
                    fontSize: 88,
                    fontWeight: 200,
                    letterSpacing: -3,
                    lineHeight: 0.9,
                    color: passing ? 'var(--moss)' : 'var(--crimson)',
                  }}
                >
                  {editPct}%
                </div>
                <div style={{ flex: 1, marginBottom: 10 }}>
                  <div style={{ position: 'relative', height: 22, background: 'var(--paper-3)', borderRadius: 1 }}>
                    {/* threshold marker */}
                    <div style={{ position: 'absolute', left: `${threshold}%`, top: -4, height: 30, borderLeft: '1px dashed var(--ink-2)' }}>
                      <div
                        className="mono"
                        style={{
                          position: 'absolute',
                          bottom: 'calc(100% + 2px)',
                          transform: 'translateX(-50%)',
                          fontSize: 9,
                          color: 'var(--ink-2)',
                          letterSpacing: '.12em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        THRESHOLD · 20%
                      </div>
                    </div>
                    {/* filled */}
                    <div
                      style={{
                        width: `${editPct}%`,
                        height: '100%',
                        background: passing
                          ? 'linear-gradient(90deg, oklch(0.74 0.07 148), oklch(0.60 0.11 148))'
                          : 'linear-gradient(90deg, oklch(0.68 0.16 30), oklch(0.54 0.18 30))',
                        borderRadius: 1,
                      }}
                    />
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, marginTop: 22, borderTop: '1px solid var(--rule-2)' }}>
                {STATS.map(([v, k], i) => (
                  <div key={k} style={{ padding: '14px 10px', borderLeft: i ? '1px solid var(--rule-2)' : 'none' }}>
                    <div className="display" style={{ fontSize: 22, fontWeight: 400 }}>{v}</div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '.14em', marginTop: 3 }}>{k}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit breakdown */}
            <div style={{ marginTop: 28 }}>
              <div className="eyebrow">What counts · edit breakdown</div>
              <div style={{ marginTop: 12 }}>
                {EDIT_BREAKDOWN.map(([k, v, c, w]) => (
                  <div
                    key={k}
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid var(--rule-2)',
                      display: 'grid',
                      gridTemplateColumns: '160px 1fr 60px',
                      gap: 16,
                      alignItems: 'center',
                    }}
                  >
                    <div className="sans" style={{ fontSize: 13, fontWeight: 500 }}>{k}</div>
                    <div style={{ height: 4, background: 'var(--paper-3)', position: 'relative' }}>
                      <div style={{ width: `${w}%`, height: '100%', background: c as string }} />
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'right' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ padding: 22, background: passing ? 'var(--moss)' : 'var(--crimson)', color: '#fff', borderRadius: 2 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '.14em', opacity: 0.8 }}>{passing ? '✓ GATE PASSED' : '✗ GATE NOT PASSED'}</div>
              <div className="display" style={{ fontSize: 26, fontWeight: 500, marginTop: 8, lineHeight: 1.15 }}>
                {passing ? 'Ready to mint as Light collab.' : "Keep editing — you're under the line."}
              </div>
              <div className="cjk" style={{ fontSize: 12, marginTop: 8, opacity: 0.85 }}>
                {passing ? '可以作为轻度人机协作发布' : '修改率未达到 20% 门槛'}
              </div>
              <button className="btn" style={{ marginTop: 16, background: '#fff', color: 'var(--ink)', fontSize: 12 }} disabled={!passing}>
                {passing ? 'Mint to IPFS + Arweave' : '—'}
              </button>
            </div>

            <div>
              <div className="eyebrow">AI declaration</div>
              <div style={{ padding: 16, border: '1px solid var(--rule)', borderRadius: 2, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {AI_DECLARATION.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span className="sans" style={{ color: 'var(--ink-3)' }}>{k}</span>
                    <span className="mono" style={{ color: 'var(--ink-2)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="eyebrow">Moderation pipeline</div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {MODERATION_ITEMS.map(([k, s, d]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--paper-2)', borderRadius: 2 }}>
                    <Icon name="check" size={11} color="var(--moss)" />
                    <div style={{ flex: 1 }}>
                      <div className="sans" style={{ fontSize: 12, fontWeight: 500 }}>{k}</div>
                      <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{d}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--moss)' }}>{s}</div>
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
