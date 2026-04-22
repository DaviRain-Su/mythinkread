import { useState } from 'react'

import React, { Suspense } from 'react'

// Kumo UI Button (lazy loaded)
const KumoButton = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.Button as unknown as React.ComponentType<any>,
  }))
)

const EDITORS = [
  ['M', '#8a5f3a'],
  ['T', '#2d3a52'],
  ['W', '#4a5c3f'],
  ['L', '#b5754a'],
] as const

const ACTIVITY = [
  ['T', '#2d3a52', 'suggested revision', '¶ 1 · epistemology'],
  ['L', '#b5754a', 'opened thread', '¶ 2 · cross-link'],
  ['W', '#4a5c3f', 'accepted', "T's edit · ¶ 4"],
  ['M', '#8a5f3a', 'linked', '[[Apology]] · new backlink'],
  ['T', '#2d3a52', 'added reference', 'Ch 11 ¶ 2'],
] as const

const REVISIONS = [
  ['#13', '4 hands', '2 min ago', 'pending'],
  ['#12', 'you', '4h ago', 'merged'],
  ['#11', 'wenlin', 'yesterday', 'merged'],
  ['#10', 'ai · auto', '2 days ago', 'merged'],
] as const

export default function WikiCoEditPage() {
  const [showBlink] = useState(true)

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--paper-2)' }}>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', overflow: 'hidden' }}>
        <main style={{ padding: '28px 48px 48px', overflow: 'auto' }} className="scroll">
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              padding: '8px 12px',
              background: 'var(--paper)',
              border: '1px solid var(--rule)',
              borderRadius: 2,
              marginBottom: 22,
            }}
          >
            <div style={{ display: 'flex' }}>
              {EDITORS.map(([c, bg], i) => (
                <div
                  key={i}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: bg,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: 10,
                    marginLeft: i ? -6 : 0,
                    border: '1.5px solid var(--paper)',
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.1em' }}>
              4 READERS CO-EDITING · LIVE
            </div>
            <div style={{ flex: 1 }} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 8px',
                background: 'oklch(0.92 0.06 145 / 0.4)',
                borderRadius: 2,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--moss)' }} />
              <span className="mono" style={{ fontSize: 9, color: 'var(--moss)', letterSpacing: '.14em' }}>
                SYNCED · IPFS
              </span>
            </div>
          </div>

          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.14em' }}>
            CONCEPTS / HOMESICKNESS.md · SHARED · REV 13
          </div>
          <div className="display" style={{ fontSize: 42, fontWeight: 300, letterSpacing: -0.8, marginTop: 8, lineHeight: 1 }}>
            Homesickness <span className="cjk" style={{ fontSize: 22, color: 'var(--ink-3)', fontWeight: 400 }}>· 思乡</span>
          </div>

          <div
            style={{
              marginTop: 28,
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              lineHeight: 1.8,
              color: 'var(--ink)',
              position: 'relative',
            }}
          >
            <p style={{ margin: '0 0 18px' }}>
              In <em>The Mirror of Moonfall</em>, homesickness is first offered by the children of Qingye as a{' '}
              <span
                style={{
                  background: 'oklch(0.92 0.06 145 / 0.4)',
                  padding: '0 2px',
                  borderBottom: '1.5px solid var(--moss)',
                  position: 'relative',
                }}
              >
                diagnosis for the moon
                {showBlink && (
                  <span
                    style={{
                      position: 'absolute',
                      display: 'inline-block',
                      marginLeft: 2,
                      width: 1,
                      height: 20,
                      background: '#4a5c3f',
                      animation: 'blink 1s infinite',
                    }}
                  />
                )}
              </span>
              . It is the first explanation in the book that involves a feeling rather than a measurement.
            </p>

            {/* Redline edit by Tao */}
            <div
              style={{
                position: 'relative',
                margin: '0 0 18px',
                padding: '10px 14px 10px 14px',
                borderLeft: '2px solid #2d3a52',
                background: 'oklch(0.94 0.03 260 / 0.3)',
                borderRadius: '0 2px 2px 0',
              }}
            >
              <div className="mono" style={{ fontSize: 9, color: '#2d3a52', letterSpacing: '.14em', marginBottom: 4 }}>
                T · TAO · SUGGESTING · 14s AGO
              </div>
              <p style={{ margin: 0 }}>
                <span style={{ textDecoration: 'line-through', color: 'var(--ink-4)', marginRight: 4 }}>
                  The book treats this gesture as its central epistemology.
                </span>
                <span style={{ background: 'oklch(0.88 0.08 260 / 0.5)', padding: '0 2px' }}>
                  The book treats this gesture — feeling-as-explanation — as a <em>rival</em> epistemology, never quite allowed to win.
                </span>
              </p>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <Suspense fallback={<button className="btn" style={{ fontSize: 10, padding: '3px 10px' }}>Accept</button>}>
                  <KumoButton style={{ fontSize: 10, padding: '3px 10px' }}>Accept</KumoButton>
                </Suspense>
                <Suspense fallback={<button className="btn ghost" style={{ fontSize: 10, padding: '3px 10px' }}>Discuss</button>}>
                  <KumoButton variant="ghost" style={{ fontSize: 10, padding: '3px 10px' }}>Discuss</KumoButton>
                </Suspense>
                <Suspense fallback={<button className="btn ghost" style={{ fontSize: 10, padding: '3px 10px' }}>Reject</button>}>
                  <KumoButton variant="ghost" style={{ fontSize: 10, padding: '3px 10px' }}>Reject</KumoButton>
                </Suspense>
                <div style={{ flex: 1 }} />
                <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>
                  2 agree · 1 dissent
                </span>
              </div>
            </div>

            <p style={{ margin: '0 0 18px', position: 'relative' }}>
              The diagnosis is offered by children, which the book will return to in chapter 8 — "the first to name a feeling is a child, or a mother."
              <span
                style={{
                  position: 'absolute',
                  right: -32,
                  top: 0,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#b5754a',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontFamily: 'var(--font-display)',
                }}
              >
                L
              </span>
            </p>

            {/* Sidebar comment thread */}
            <div
              style={{
                margin: '0 0 18px',
                padding: '12px 14px',
                background: 'var(--paper)',
                border: '1px solid var(--rule)',
                borderRadius: 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#b5754a',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: 10,
                  }}
                >
                  L
                </div>
                <div className="sans" style={{ fontSize: 12, fontWeight: 500 }}>
                  Lin Qi
                </div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>
                  2 MIN AGO · THREAD
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                Should we cross-link this to{' '}
                <span style={{ color: 'var(--indigo)', borderBottom: '1px solid var(--indigo)' }}>[[themes/Apology]]</span>? The children's diagnosis feels like the first apology the book makes on the mother's behalf.
              </p>
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px dashed var(--rule-2)',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#4a5c3f',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: 9,
                  }}
                >
                  W
                </div>
                <div className="sans" style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 500 }}>Wenlin:</span>
                  <span style={{ color: 'var(--ink-2)' }}>
                    {' '}
                    Yes. And maybe to [[concepts/Measurement]] — the children refuse measurement.
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <Suspense fallback={<button className="btn ghost" style={{ fontSize: 10, padding: '3px 10px' }}>Reply…</button>}>
                  <KumoButton variant="ghost" style={{ fontSize: 10, padding: '3px 10px' }}>Reply…</KumoButton>
                </Suspense>
                <Suspense fallback={<button className="btn ghost" style={{ fontSize: 10, padding: '3px 10px' }}>Resolve</button>}>
                  <KumoButton variant="ghost" style={{ fontSize: 10, padding: '3px 10px' }}>Resolve</KumoButton>
                </Suspense>
              </div>
            </div>

            <p style={{ margin: 0 }}>
              See also <span style={{ color: 'var(--indigo)', borderBottom: '1px solid var(--indigo)' }}>[[Measurement]]</span>,{' '}
              <span style={{ color: 'var(--indigo)', borderBottom: '1px solid var(--indigo)' }}>[[The Children]]</span>,{' '}
              <span style={{ color: 'var(--indigo)', borderBottom: '1px solid var(--indigo)' }}>[[Apology]]</span>.
            </p>
          </div>
        </main>

        <aside style={{ borderLeft: '1px solid var(--rule)', padding: '28px 22px', background: 'var(--paper)', overflow: 'auto' }} className="scroll">
          <div className="eyebrow">Activity · today</div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ACTIVITY.map(([u, c, v, t], i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: 10,
                    flexShrink: 0,
                  }}
                >
                  {u}
                </div>
                <div style={{ flex: 1, lineHeight: 1.45 }}>
                  <span style={{ color: 'var(--ink-3)' }}>{v}</span>
                  <div style={{ color: 'var(--ink-2)', marginTop: 1 }}>{t}</div>
                </div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)' }}>
                  {i * 3 + 1}m
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 26 }}>
            <div className="eyebrow">Revision history</div>
            <div style={{ marginTop: 12, position: 'relative', paddingLeft: 16 }}>
              <div style={{ position: 'absolute', left: 4, top: 4, bottom: 4, width: 1, background: 'var(--rule)' }} />
              {REVISIONS.map(([r, a, t, s], i) => (
                <div key={r} style={{ position: 'relative', paddingBottom: 12 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: -16,
                      top: 4,
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: i === 0 ? 'var(--terracotta)' : 'var(--paper)',
                      border: `1.5px solid ${i === 0 ? 'var(--terracotta)' : 'var(--ink-3)'}`,
                    }}
                  />
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-2)' }}>
                    {r} · {a}
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)' }}>
                    {t} · {s}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: 22,
              padding: 14,
              background: 'var(--paper-2)',
              border: '1px solid var(--rule)',
              borderRadius: 2,
            }}
          >
            <div className="eyebrow">Governance</div>
            <p style={{ margin: '8px 0 10px', fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Changes merge after <strong>3 approvals</strong> or <strong>48h without dissent</strong>. Full history signed to IPFS.
            </p>
            <Suspense fallback={<button className="btn ghost" style={{ width: '100%', fontSize: 11 }}>
              Change governance
            </button>}>
              <KumoButton variant="ghost" style={{ width: '100%', fontSize: 11 }}>
                Change governance
              </KumoButton>
            </Suspense>
          </div>
        </aside>
      </div>
      <style>{`@keyframes blink { 0%,49% {opacity:1} 50%,100% {opacity:0} }`}</style>
    </div>
  )
}
