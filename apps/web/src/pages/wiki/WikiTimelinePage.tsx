import { useState } from 'react'

const TIMELINE_EVENTS = [
  ['2011', 'Departure', 'ch 9 flashback', 'var(--ai-pure)'],
  ['2013', 'First measurement', 'ch 3 flashback', 'var(--ink-3)'],
  ['2024', 'Letter written', 'ch 1 ¶ 1', 'var(--gold)'],
  ['04·01', 'Arrival', 'ch 2', 'var(--terracotta)'],
  ['04·04', 'The well', 'ch 4', 'var(--terracotta)'],
  ['04·07', 'Confession', 'ch 11', 'var(--crimson)'],
  ['04·12', 'Return home', 'ch 19', 'var(--moss)'],
  ['00:04', 'The naming', 'ch 24', 'var(--ink)'],
] as const

const KEY_EVENTS = [
  ['2011·summer', 'Sen leaves Qingye after argument with her mother', 'ch 9 · flashback · 4 pages', 'var(--ai-pure)'],
  ['2013·winter', "First 'drift' — 4 min lag in lunar rise", 'ch 3 · flashback · 2 pages', 'var(--ink-3)'],
  ['2024·oct', 'Mother writes the seven-word letter', 'ch 1 · opening', 'var(--gold)'],
  ['2026·04·01', 'Sen arrives at Qingye station', 'ch 2 · present', 'var(--terracotta)'],
  ['2026·04·04', 'Sen descends the well at midnight', 'ch 4 · climax of act 1', 'var(--terracotta)'],
  ['2026·04·07', 'Sen confronts Mme. Hou', 'ch 11 · midpoint', 'var(--crimson)'],
] as const

const FORESHADOWING = [
  ['Ch 1 ¶ 3', 'Ch 8 ¶ 2', "The 'five unspoken words'", 'Setup promises a reveal → payoff names them.'],
  ['Ch 3 ¶ 11', 'Ch 17 ¶ 4', 'The 4-minute drift', "Measurement detail → the mother's pulse detail."],
  ['Ch 4 ¶ 6', 'Ch 24 ¶ 9', 'The folded paper (twice)', 'Gesture planted early → returns as metaphor.'],
] as const

export default function WikiTimelinePage() {
  const [view, setView] = useState('story')

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--paper-2)' }}>
      <div className="scroll" style={{ flex: 1, padding: '36px 44px 60px', overflow: 'auto' }}>
        <div className="eyebrow">Mirror of Moonfall · Wiki · timeline/</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
          <div className="display" style={{ fontSize: 48, fontWeight: 300, letterSpacing: -1.2, lineHeight: 1 }}>
            The plot, as a clock.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              ['story', 'Story time'],
              ['chapter', 'Chapter order'],
              ['foreshadow', 'Foreshadowing view'],
            ].map(([k, l]) => (
              <span key={k} onClick={() => setView(k)} className={`chip ${view === k ? 'active' : ''}`} style={{ cursor: 'pointer' }}>
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* Horizontal timeline */}
        <div style={{ marginTop: 36, padding: 24, background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 2, position: 'relative' }}>
          <div style={{ position: 'relative', padding: '38px 0 24px' }}>
            <div style={{ position: 'absolute', top: 70, left: 0, right: 0, height: 2, background: 'var(--ink)' }} />

            {/* era markers */}
            <div style={{ position: 'absolute', top: 56, left: '8%', right: '62%', height: 10, background: 'oklch(0.88 0.04 60)', opacity: 0.5 }} />
            <div style={{ position: 'absolute', top: 56, left: '42%', right: '22%', height: 10, background: 'oklch(0.82 0.06 35)', opacity: 0.5 }} />
            <div style={{ position: 'absolute', top: 56, left: '82%', right: '0%', height: 10, background: 'oklch(0.78 0.08 148)', opacity: 0.5 }} />
            <div className="mono" style={{ position: 'absolute', top: 30, left: '8%', fontSize: 9, color: 'var(--ink-3)', letterSpacing: '.14em' }}>BEFORE · 15 years ago</div>
            <div className="mono" style={{ position: 'absolute', top: 30, left: '42%', fontSize: 9, color: 'var(--ink-3)', letterSpacing: '.14em' }}>RETURN · 2026·spring</div>
            <div className="mono" style={{ position: 'absolute', top: 30, left: '82%', fontSize: 9, color: 'var(--ink-3)', letterSpacing: '.14em' }}>MIDNIGHT · ch.24</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginTop: 60 }}>
              {TIMELINE_EVENTS.map(([t, title, chap, c], i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                  <div style={{ width: 12, height: 12, background: c, borderRadius: '50%', margin: '0 auto 10px', position: 'relative', zIndex: 2, border: '2px solid var(--paper)' }} />
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.08em' }}>{t}</div>
                  <div className="display" style={{ fontSize: 13, marginTop: 3, fontWeight: 500 }}>{title}</div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 2 }}>{chap}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Below: two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 36, marginTop: 40 }}>
          <div>
            <div className="eyebrow">Key events · story order</div>
            <div style={{ marginTop: 14 }}>
              {KEY_EVENTS.map(([t, e, c, color]) => (
                <div
                  key={t}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr 140px',
                    gap: 14,
                    padding: '12px 0',
                    borderBottom: '1px solid var(--rule-2)',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', marginRight: 6 }} />
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{t}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{e}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'right' }}>{c}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="eyebrow">Foreshadowing pairs · setup → payoff</div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {FORESHADOWING.map(([a, b, name, desc]) => (
                <div key={name} style={{ padding: 14, background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 2 }}>
                  <div className="sans" style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                  <p style={{ margin: '4px 0 10px', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>{desc}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="chip" style={{ background: 'oklch(0.88 0.05 35 / .4)' }}>SETUP · {a}</span>
                    <div style={{ flex: 1, height: 1, borderTop: '1px dashed var(--ink-3)', position: 'relative' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: -5,
                          fontSize: 10,
                          color: 'var(--terracotta)',
                          fontFamily: 'var(--font-mono)',
                          transform: 'translateX(-50%)',
                          background: 'var(--paper)',
                          padding: '0 4px',
                        }}
                      >
                        ⇢
                      </div>
                    </div>
                    <span className="chip" style={{ background: 'oklch(0.88 0.06 148 / .4)' }}>PAYOFF · {b}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
