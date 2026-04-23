import { useState } from 'react'
import { Icon } from '../../components/mtr/primitives'
import React, { Suspense } from 'react'

// Kumo UI Button (lazy loaded)
const KumoButton = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.Button as unknown as React.ComponentType<Record<string, unknown>>,
  }))
)

const SPEAKERS = [
  { n: 'Ma Xiaonan', zh: '马小南', color: '#8a5f3a', speaking: true, role: 'host' },
  { n: 'Wenlin', zh: '文琳', color: '#4a5c3f', speaking: false, role: 'co-host' },
  { n: 'Tao', zh: '陶', color: '#2d3a52', speaking: true, role: 'speaker' },
  { n: 'Lin Qi', zh: '林绮', color: '#b5754a', speaking: false, role: 'speaker' },
  { n: 'Yu Wen', zh: '宇文', color: '#6c3a4a', speaking: false, role: 'speaker' },
] as const

const LISTENER_COLORS = ['#8a5f3a', '#4a5c3f', '#6c3a4a', '#2d3a52', '#b5754a', '#4a3a5c'] as const
const LISTENER_LABELS = ['H', 'K', 'R', 'S', 'V', 'M', 'P', 'T', 'E', 'Q', 'L', 'Z'] as const

const CHAT_MESSAGES = [
  ['@wenlin', 'the \'uselessly\' nails it.', 'now'],
  ['@lin_qi', '🪶 pinned the passage', '1m'],
  ['@mo_writer', 'reminds me of Han Kang, but cooler', '2m'],
  ['@ivy', 'joined the circle', '2m'],
  ['@tao', '🎤 took the mic', '3m'],
  ['@wenlin', 'I think the AI wrote this line, actually. The human came in and kept it.', '4m'],
  ['@ma_xiaonan', 'let\'s hear from heavy-collab fans next', '5m'],
] as const

export default function VoiceRoomPage() {
  const [micRequested, setMicRequested] = useState(false)

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--ink)', color: 'var(--paper)' }}>
      {/* Minimal top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 28px', borderBottom: '1px solid rgba(255,255,255,.12)' }}>
        <Icon name="left" size={14} color="#fff" />
        <div style={{ marginLeft: 14 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '.14em', opacity: 0.6 }}>MIRROR CIRCLE · LIVE</div>
          <div className="display" style={{ fontSize: 16, fontWeight: 500 }}>The Mirror of Moonfall · ch 1 – 4 discussion</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'oklch(0.72 0.18 30)' }} />
          <div className="mono" style={{ fontSize: 10, opacity: 0.8 }}>LIVE · 00:42:18 · 184 listening</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }}>
        {/* Stage */}
        <main style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', overflow: 'auto' }} className="scroll">
          <div className="eyebrow" style={{ color: 'var(--paper-3)', opacity: 0.7 }}>On stage · 5 speakers</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginTop: 18 }}>
            {SPEAKERS.map((s) => (
              <div key={s.n} style={{ textAlign: 'center', position: 'relative' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {s.speaking && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: -6,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${s.color} 0%, transparent 70%)`,
                        opacity: 0.6,
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'relative',
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: s.color,
                      border: s.speaking ? '2.5px solid oklch(0.72 0.13 85)' : '2px solid rgba(255,255,255,.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontFamily: 'var(--font-display)',
                      fontSize: 24,
                      fontWeight: 500,
                    }}
                  >
                    {s.n[0]}
                  </div>
                  {s.speaking && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        background: 'oklch(0.72 0.13 85)',
                        color: 'var(--ink)',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="mic" size={10} color="var(--ink)" />
                    </div>
                  )}
                </div>
                <div className="display" style={{ fontSize: 13, fontWeight: 500, marginTop: 10 }}>{s.n}</div>
                <div className="cjk" style={{ fontSize: 10, opacity: 0.6 }}>{s.zh}</div>
                <div className="mono" style={{ fontSize: 8, opacity: 0.55, letterSpacing: '.14em', marginTop: 4 }}>{s.role.toUpperCase()}</div>

                {/* Waveform under speaking speakers */}
                {s.speaking && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 8, alignItems: 'flex-end', height: 18 }}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 2,
                          height: 6 + Math.abs(Math.sin(i + s.n.length)) * 10,
                          background: 'oklch(0.72 0.13 85)',
                          borderRadius: 1,
                          opacity: 0.8,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quote card */}
          <div
            style={{
              marginTop: 36,
              padding: '24px 28px',
              background: 'linear-gradient(165deg, oklch(0.25 0.02 60), oklch(0.15 0.01 70))',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 2,
            }}
          >
            <div className="mono" style={{ fontSize: 9, letterSpacing: '.14em', color: 'oklch(0.72 0.13 85)' }}>NOW DISCUSSING · CH 1 ¶ 3 · shared by @tao</div>
            <p
              style={{
                margin: '12px 0 0',
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                lineHeight: 1.45,
                fontStyle: 'italic',
                color: 'var(--paper)',
                textWrap: 'pretty',
              }}
            >
              "The remaining five words she kept privately, the way one keeps a tooth in a drawer: uselessly, but with a conviction that it may one day matter."
            </p>
            <div className="cjk" style={{ fontSize: 13, color: 'var(--paper-3)', opacity: 0.7, marginTop: 10 }}>
              剩下的五个字她私藏着,像人把一颗牙齿放在抽屉里。
            </div>
          </div>

          {/* Live caption */}
          <div style={{ marginTop: 24 }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: '.14em', opacity: 0.7 }}>LIVE CAPTION · TAO · SPEAKING NOW</div>
            <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.65, color: 'var(--paper-2)', fontFamily: 'var(--font-body)' }}>
              "The thing that gets me is the <em>uselessly</em>. You'd expect a sentence about a tooth-in-a-drawer to be about hope, or mystery, or grief. And it is — but the author has the nerve to name its uselessness out loud, in the same breath as the conviction that it may one day matter. That's a very AI move actually…"
              <span className="mono" style={{ fontSize: 10, opacity: 0.5, marginLeft: 6 }}>··· still typing</span>
            </p>
          </div>

          <div style={{ flex: 1 }} />

          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, padding: '20px 0 8px' }}>
            <button
              onClick={() => setMicRequested((v) => !v)}
              style={{
                padding: '14px 22px',
                borderRadius: 40,
                border: 0,
                background: micRequested ? 'oklch(0.72 0.13 85)' : 'oklch(0.22 0.01 70)',
                color: micRequested ? 'var(--ink)' : '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
              }}
            >
              <Icon name="mic" size={14} color={micRequested ? 'var(--ink)' : '#fff'} /> &nbsp;{micRequested ? 'Mic requested' : 'Request the mic'}
            </button>
            <button
              style={{
                padding: '14px 22px',
                borderRadius: 40,
                border: 0,
                background: 'oklch(0.28 0.01 70)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
              }}
            >
              <Icon name="highlight" size={13} color="#fff" /> &nbsp;Drop a highlight
            </button>
            <button
              style={{
                padding: '14px 22px',
                borderRadius: 40,
                border: 0,
                background: 'oklch(0.40 0.14 25)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
              }}
            >
              Leave circle
            </button>
          </div>
        </main>

        {/* Side: listeners + chat */}
        <aside style={{ background: 'oklch(0.12 0.01 70)', borderLeft: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 20px 10px' }}>
            <div className="eyebrow" style={{ color: 'var(--paper-3)', opacity: 0.7 }}>Listeners · 184</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: LISTENER_COLORS[i % LISTENER_COLORS.length],
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {LISTENER_LABELS[i]}
                </div>
              ))}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,.08)',
                  color: 'var(--paper-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                +172
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,.08)',
              padding: '14px 20px',
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
            className="scroll"
          >
            <div className="eyebrow" style={{ color: 'var(--paper-3)', opacity: 0.7 }}>Chat & reactions</div>
            {CHAT_MESSAGES.map(([u, m, t], i) => (
              <div key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>
                <span className="mono" style={{ color: 'oklch(0.72 0.13 85)' }}>{u}</span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--paper-3)', opacity: 0.5, marginLeft: 6 }}>{t}</span>
                <div style={{ color: 'var(--paper)', opacity: 0.85, marginTop: 1 }}>{m}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '12px 16px', display: 'flex', gap: 8 }}>
            <div
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'rgba(255,255,255,.05)',
                borderRadius: 2,
                fontSize: 12,
                color: 'var(--paper-3)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Say something…
            </div>
            <Suspense fallback={<button className="btn" style={{ background: 'oklch(0.72 0.13 85)', color: 'var(--ink)', border: 0, fontSize: 11 }}>Send</button>}>
              <KumoButton style={{ background: 'oklch(0.72 0.13 85)', color: 'var(--ink)', border: 0, fontSize: 11 }}>
                Send
              </KumoButton>
            </Suspense>
          </div>
        </aside>
      </div>
    </div>
  )
}
