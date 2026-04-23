import { useState } from 'react'
import { Icon } from '../../components/mtr/primitives'
import React, { Suspense } from 'react'

// Kumo UI Button (lazy loaded)
const KumoButton = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.Button as unknown as React.ComponentType<Record<string, unknown>>,
  }))
)

const STEPS = 5

const MODES = [
  ['pure', 'Pure AI', 'I generate and publish. Minimal edits.', '≥90% AI', 'var(--ai-pure)'],
  ['light', 'Light collab', 'AI first, I revise liberally. My preferred default.', '50–90% AI · recommended', 'var(--ai-light)'],
  ['heavy', 'Heavy human', 'I write the soul. AI is a research assistant.', '<50% AI', 'var(--ai-heavy)'],
] as const

export default function OnboardingPage() {
  const [step] = useState(3)
  const [selectedMode, setSelectedMode] = useState('light')

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--paper)' }}>
      {/* Mini chrome */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 28px', borderBottom: '1px solid var(--rule)' }}>
        <div className="display" style={{ fontSize: 15, fontWeight: 500, letterSpacing: -0.2 }}>
          mythink<span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>read</span>
        </div>
        <div style={{ flex: 1 }} />
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>SETUP · {step}/{STEPS}</div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
        {/* Left — narrative */}
        <section style={{ padding: '60px 56px', borderRight: '1px solid var(--rule)', background: 'var(--paper-2)', display: 'flex', flexDirection: 'column', overflow: 'auto' }} className="scroll">
          <div className="eyebrow">A warm welcome · 01 of 05</div>

          <div className="display" style={{ fontSize: 56, fontWeight: 300, letterSpacing: -1.5, lineHeight: 1, marginTop: 14, textWrap: 'balance' }}>
            You are writing <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>with</span> the machines, not against them.
          </div>
          <div className="cjk" style={{ fontSize: 20, color: 'var(--ink-3)', marginTop: 12 }}>你与机器合作而写 · 不是与之对抗</div>

          <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, lineHeight: 1.75, color: 'var(--ink-2)', marginTop: 24, maxWidth: 520, textWrap: 'pretty' }}>
            MyThinkRead is an AI-native publishing platform. Every book here is either generated or co-authored with AI — <em>and published with the exact proportions disclosed</em>. Readers choose what they want to read; writers own what they make.
          </p>

          {/* Progress */}
          <div style={{ marginTop: 'auto', paddingTop: 48 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: STEPS }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, background: i < step ? 'var(--ink)' : 'var(--rule)' }} />
              ))}
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.14em', marginTop: 10 }}>
              SETUP · 03 OF 05 · PICK YOUR WORKING MODE
            </div>
          </div>
        </section>

        {/* Right — interactive step */}
        <section style={{ padding: '50px 56px', display: 'flex', flexDirection: 'column', overflow: 'auto' }} className="scroll">
          <div className="eyebrow">Step 03 · Your working mode</div>
          <div className="display" style={{ fontSize: 32, fontWeight: 400, marginTop: 6, letterSpacing: -0.4, lineHeight: 1.1 }}>
            How much will the machine carry?
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 8, fontFamily: 'var(--font-body)', maxWidth: 480 }}>
            Pick a default blend. You can change it per book; MTR always measures what you actually did and labels the result.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
            {MODES.map(([k, n, desc, range, c]) => {
              const isSelected = selectedMode === k
              return (
                <div
                  key={k}
                  onClick={() => setSelectedMode(k)}
                  style={{
                    padding: '18px 20px',
                    border: isSelected ? '2px solid var(--ink)' : '1px solid var(--rule)',
                    borderRadius: 2,
                    background: isSelected ? 'var(--paper-2)' : 'var(--paper)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div style={{ width: 10, height: 54, background: c, borderRadius: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <div className="display" style={{ fontSize: 18, fontWeight: 500, letterSpacing: -0.2 }}>{n}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{range}</div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 3, fontFamily: 'var(--font-body)' }}>{desc}</div>
                  </div>
                  {isSelected && (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="check" size={11} color="var(--paper)" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 24, padding: 16, background: 'oklch(0.95 0.03 80)', borderLeft: '3px solid var(--gold)', borderRadius: 2 }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '.14em' }}>⟡ EARLY CREATOR PERK</div>
            <div className="sans" style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.5 }}>
              Founder-100 creators: free audio for your first 3 books · priority Wiki compilation · V2 token allocation pre-reserved.
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 14 }}>
            <Suspense fallback={<button className="btn ghost">← Back</button>}>
              <KumoButton variant="ghost">← Back</KumoButton>
            </Suspense>
            <div style={{ flex: 1 }} />
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>AUTOSAVED · Creator profile @your_handle</div>
            <Suspense fallback={<button className="btn accent">Continue · pick your first book →</button>}>
              <KumoButton>Continue · pick your first book →</KumoButton>
            </Suspense>
          </div>
        </section>
      </div>
    </div>
  )
}
