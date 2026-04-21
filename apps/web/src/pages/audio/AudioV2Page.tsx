import { useState } from 'react'
import { Icon } from '../../components/mtr/primitives'

const BOOK = {
  title: 'The Mirror of Moonfall',
  author: 'Aster-07 × Yu Wen',
}

const VOICES = [
  { n: 'Mo', d: 'warm baritone · EN', c: 'var(--moss)' },
  { n: 'Xiaolan', d: 'clear soprano · 中文', c: 'var(--indigo)' },
  { n: "Author's own", d: 'cloned · 12 min sample', c: 'var(--gold)' },
  { n: 'Ensemble', d: 'four voices · dialogue', c: 'var(--crimson)' },
] as const

const CHAPTER_QUEUE = [
  'The Letter of Seven Words',
  'What the Children Say',
  'A Measurement',
  'The Rope, The Well',
] as const

const WAVE_BARS = 160

export default function AudioV2Page() {
  const [isPlaying, setIsPlaying] = useState(true)
  const [activeChip, setActiveChip] = useState<string | null>('Auto-pause')

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--paper)' }}>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden' }}>
        {/* Main player */}
        <main
          style={{
            padding: '48px 56px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'radial-gradient(ellipse at top right, oklch(0.96 0.04 70) 0%, var(--paper) 60%)',
          }}
        >
          <div>
            <div className="eyebrow">Now listening · Chapter 1 of 24</div>
            <div className="display" style={{ fontSize: 52, fontWeight: 300, letterSpacing: -1.2, marginTop: 10, lineHeight: 1 }}>
              The Letter of <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>Seven Words</span>
            </div>
            <div className="cjk" style={{ fontSize: 20, color: 'var(--ink-3)', marginTop: 8 }}>七个字的信</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 64,
                  background: 'linear-gradient(160deg, #2d3a52, #0d1421)',
                  borderRadius: 2,
                }}
              />
              <div>
                <div className="sans" style={{ fontSize: 13, fontWeight: 500 }}>{BOOK.title}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>BY {BOOK.author.toUpperCase()}</div>
              </div>
            </div>
          </div>

          {/* Waveform */}
          <div style={{ margin: '48px 0 32px' }}>
            <svg viewBox="0 0 800 80" style={{ width: '100%', height: 80 }} preserveAspectRatio="none">
              {Array.from({ length: WAVE_BARS }).map((_, i) => {
                const seed = Math.sin(i * 1.3) * Math.cos(i * 0.7) * 0.5 + Math.sin(i * 0.4) * 0.3
                const h = Math.max(3, Math.abs(seed) * 70 + 8)
                const played = i < 42
                return (
                  <rect
                    key={i}
                    x={i * 5}
                    y={40 - h / 2}
                    width="3"
                    height={h}
                    fill={played ? 'var(--terracotta)' : 'var(--ink-4)'}
                    opacity={played ? 0.95 : 0.35}
                    rx="1"
                  />
                )
              })}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>02:14</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>– 06:48</span>
            </div>
          </div>

          {/* Controls */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-2)' }}>
                <Icon name="left" size={16} /><span className="mono" style={{ fontSize: 10 }}>15s</span>
              </div>
              <Icon name="left" size={22} />
              <button
                onClick={() => setIsPlaying((p) => !p)}
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(0,0,0,.15)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {isPlaying ? (
                  <svg width="22" height="22" viewBox="0 0 22 22"><rect x="5" y="3" width="4" height="16" fill="currentColor" /><rect x="13" y="3" width="4" height="16" fill="currentColor" /></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 22 22"><polygon points="5,3 19,11 5,19" fill="currentColor" /></svg>
                )}
              </button>
              <Icon name="right" size={22} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-2)' }}>
                <span className="mono" style={{ fontSize: 10 }}>15s</span><Icon name="right" size={16} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24 }}>
              {[
                ['1.0×'],
                ['Sleep · 30m'],
                ['Auto-pause'],
                ['Cast'],
              ].map(([lbl]) => (
                <div
                  key={lbl}
                  onClick={() => setActiveChip(activeChip === lbl ? null : lbl)}
                  className={`chip ${activeChip === lbl ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  {lbl}
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Sidebar */}
        <aside style={{ borderLeft: '1px solid var(--rule)', padding: '40px 26px', background: 'var(--paper-2)', overflow: 'auto' }} className="scroll">
          <div className="eyebrow">Narrator voice <span style={{ color: 'var(--terracotta)' }}>· V2 AI-cast</span></div>
          <div style={{ marginTop: 14, padding: '16px 18px', border: '1px solid var(--rule)', borderRadius: 2, background: 'var(--paper)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 30%, oklch(0.82 0.08 50), oklch(0.45 0.08 40))',
                }}
              />
              <div>
                <div className="display" style={{ fontSize: 16, fontWeight: 500 }}>Wen — slow, literary</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>FEMALE · CN/EN · VOICE-12</div>
              </div>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55, fontStyle: 'italic' }}>
              "Unhurried, breath-first. Leaves long pauses before proper names."
            </p>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="eyebrow">Try another voice</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {VOICES.map(({ n, d, c }) => (
                <div
                  key={n}
                  style={{
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    borderRadius: 2,
                    background: 'var(--paper)',
                    border: '1px solid var(--rule-2)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: c }} />
                  <div style={{ flex: 1 }}>
                    <div className="sans" style={{ fontSize: 12, fontWeight: 500 }}>{n}</div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{d}</div>
                  </div>
                  <Icon name="right" size={11} color="var(--ink-3)" />
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <div className="eyebrow">Live transcript</div>
            <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)' }}>
              <span style={{ opacity: 0.45 }}>The letter was seven words long. </span>
              <mark style={{ background: 'oklch(0.85 0.05 85 / 0.5)', padding: '0 3px' }}>Her mother had never been one to waste.</mark>
              <span style={{ opacity: 0.3 }}> Sen Yaolan read it on the train, then folded it…</span>
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <div className="eyebrow">Chapter queue</div>
            <div style={{ marginTop: 10 }}>
              {CHAPTER_QUEUE.map((t, i) => (
                <div
                  key={t}
                  style={{
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: i === 0 ? 'var(--paper)' : 'transparent',
                    borderLeft: i === 0 ? '2px solid var(--terracotta)' : '2px solid transparent',
                  }}
                >
                  <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ flex: 1 }}>
                    <div className="display" style={{ fontSize: 12, fontWeight: i === 0 ? 500 : 400 }}>{t}</div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)' }}>
                      {i === 0 ? '▶ 2:14 / 6:48' : `${[0, 12, 9, 14][i]} min`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
