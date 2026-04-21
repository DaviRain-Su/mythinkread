import { useState } from 'react'
import { Icon } from '../../components/mtr/primitives'

const XL_CHAPTERS = [
  { n: 1, title: 'The Letter of Seven Words', zh: '七个字的信', min: 8, pct: 70 },
  { n: 2, title: 'What the Children Say', zh: '孩子们说', min: 12, pct: 65 },
  { n: 3, title: 'A Measurement', zh: '一次测量', min: 9, pct: 72 },
  { n: 4, title: 'The Rope, The Well', zh: '绳与井', min: 14, pct: 68 },
  { n: 5, title: 'Mother, Not Yet', zh: '母亲,尚未', min: 11, pct: 60 },
  { n: 6, title: 'Qingye at Noon', zh: '晴野之午', min: 10, pct: 75 },
  { n: 7, title: 'An Apology Shaped Like Weather', zh: '形如天气的致歉', min: 13, pct: 64 },
  { n: 8, title: 'The Moon Is Homesick', zh: '月亮思乡', min: 16, pct: 62 },
  { n: 9, title: 'Coordinates', zh: '坐标', min: 7, pct: 80 },
  { n: 10, title: 'The Return', zh: '归来', min: 12, pct: 66 },
] as const

const BOOK = {
  title: 'The Mirror of Moonfall',
  author: 'Aster-07 × Yu Wen',
}

const BOOKMARKS = [
  ['p. 14', 'The seven words'],
  ['p. 38', 'Ginkgo — first mention'],
  ['p. 52', 'The well'],
  ['p. 84', "Mother's voice, finally"],
] as const

const LEFT_PAGE_TEXT = [
  'The train arrived earlier than scheduled. Qingye station had not changed, which was its own kind of insult — fifteen years should leave a mark, but here the tiles were the same color of dust, the bench was the same splintered bench, and the station-master was, impossibly, the same man.',
  'He nodded at her as if she had been gone a weekend. She nodded back with the same calibration.',
  '"Your mother," he said. A full stop, not a question.',
  '"Yes," Sen said. Also a full stop.',
  "He did not offer condolences. The villagers of Qingye, she remembered, did not believe in condolences for the living.",
  'She walked. The road to the house had lengthened, or she had grown smaller — she could not tell yet which. The ginkgos were exactly where they had always been.',
]

const RIGHT_PAGE_TEXT = [
  'The house was the color of paper left in a drawer. It had always been that color, she realized, and she had always thought of that color as the color of paper left in a drawer — as if the house were the archetype and the paper the metaphor.',
  'The door was unlocked. In Qingye, doors were not locked; in Qingye, doors were closed, which was a different proposition.',
  "Her sister was not there. Her sister had written to say she would not be there. Her sister had written, in fact, a letter much longer than their mother's, explaining why.",
]

export default function ReaderXLPage() {
  const [page, setPage] = useState(4)
  const total = 312

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--paper-2)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 28px', background: 'var(--paper)', borderBottom: '1px solid var(--rule)' }}>
        <Icon name="left" size={14} color="var(--ink-3)" />
        <div style={{ marginLeft: 14 }}>
          <div className="display" style={{ fontSize: 15, fontWeight: 500 }}>{BOOK.title}</div>
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '.1em' }}>PAGINATED VIEW · 10 CHAPTERS</div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>p. {page}–{page + 1} / {total} · {Math.round((page / total) * 100)}%</div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr 1fr 220px', gap: 0, overflow: 'hidden' }}>
        {/* Left: TOC */}
        <aside style={{ borderRight: '1px solid var(--rule)', background: 'var(--paper)', overflow: 'auto', padding: '22px 14px' }} className="scroll">
          <div className="eyebrow">Contents · 目录</div>
          <div style={{ marginTop: 14 }}>
            {XL_CHAPTERS.map((c) => (
              <div
                key={c.n}
                style={{
                  padding: '8px 10px',
                  marginBottom: 2,
                  cursor: 'pointer',
                  borderLeft: c.n === 1 ? '2px solid var(--terracotta)' : '2px solid transparent',
                  background: c.n === 1 ? 'var(--paper-2)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span className="mono" style={{ fontSize: 9, color: 'var(--ink-4)' }}>{String(c.n).padStart(2, '0')}</span>
                  <div style={{ flex: 1 }}>
                    <div className="display" style={{ fontSize: 12.5, fontWeight: c.n === 1 ? 500 : 400, lineHeight: 1.2 }}>{c.title}</div>
                    <div className="cjk" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{c.zh}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={{ flex: 1, height: 2, background: 'var(--paper-3)' }}>
                    <div style={{ width: c.n === 1 ? '42%' : '0%', height: '100%', background: 'var(--terracotta)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 8, color: 'var(--ink-4)' }}>{c.min}m</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Two-page spread: left page */}
        <main style={{ display: 'flex', justifyContent: 'flex-end', padding: '30px 24px 24px 40px', overflow: 'auto' }} className="scroll">
          <div style={{ width: '100%', maxWidth: 420, fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.75, color: 'var(--ink)' }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', textAlign: 'center', letterSpacing: '.14em', marginBottom: 18 }}>
              — {page} —
            </div>
            {LEFT_PAGE_TEXT.map((p, i) => (
              <p key={i} style={{ margin: '0 0 14px' }}>
                {i === 5 ? (
                  <>
                    She walked. <mark className="hl gold">The road to the house had lengthened</mark>, or she had grown smaller — she could not tell yet which. The ginkgos were exactly where they had always been.
                  </>
                ) : (
                  p
                )}
              </p>
            ))}
          </div>
        </main>

        {/* Two-page spread: right page */}
        <main style={{ display: 'flex', justifyContent: 'flex-start', padding: '30px 40px 24px 24px', borderLeft: '1px dashed var(--rule)', overflow: 'auto' }} className="scroll">
          <div style={{ width: '100%', maxWidth: 420, fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.75, color: 'var(--ink)' }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', textAlign: 'center', letterSpacing: '.14em', marginBottom: 18 }}>
              — {page + 1} —
            </div>
            {RIGHT_PAGE_TEXT.map((p, i) => (
              <p key={i} style={{ margin: '0 0 14px' }}>{p}</p>
            ))}
            <div className="ornament" style={{ color: 'var(--ink-4)', margin: '20px 0', textAlign: 'center' }}>◆ ◆ ◆</div>
            <p style={{ margin: '0 0 14px' }}>
              At four minutes past midnight she stood behind the house with a flashlight and the folded letter and the slow, unhurried heart of someone who has arrived at a place she has been walking toward for fifteen years.
            </p>
            <p style={{ margin: '0 0 14px' }}>The well was deeper than she remembered.</p>
          </div>
        </main>

        {/* Right rail */}
        <aside style={{ borderLeft: '1px solid var(--rule)', background: 'var(--paper)', overflow: 'auto', padding: '22px 16px' }} className="scroll">
          <div className="eyebrow">This spread</div>
          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--paper-2)', borderLeft: '2px solid oklch(0.82 0.10 85)' }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>¶ 6 · p.{page}</div>
            <p style={{ margin: '4px 0 0', fontSize: 11, fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.5 }}>
              "The road to the house had lengthened…"
            </p>
          </div>

          <div className="eyebrow" style={{ marginTop: 22 }}>Your bookmarks</div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BOOKMARKS.map(([p, t]) => (
              <div key={p} style={{ fontSize: 12, display: 'flex', gap: 8, color: 'var(--ink-2)' }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', minWidth: 34 }}>{p}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22 }}>
            <div className="eyebrow">Chapter audio</div>
            <div style={{ marginTop: 10, padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="8" height="10" viewBox="0 0 8 10"><polygon points="0,0 8,5 0,10" fill="currentColor" /></svg>
              </div>
              <div>
                <div className="display" style={{ fontSize: 12, fontWeight: 500 }}>Listen from here</div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>WEN · 6:42 remaining</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 28px', borderTop: '1px solid var(--rule)', background: 'var(--paper)' }}>
        <div
          onClick={() => setPage((p) => Math.max(1, p - 2))}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}
        >
          <Icon name="left" size={13} /><span className="sans" style={{ fontSize: 12 }}>Previous</span>
        </div>
        <div style={{ flex: 1, position: 'relative', height: 8 }}>
          <div style={{ position: 'absolute', inset: '3px 0', background: 'var(--rule)' }} />
          <div style={{ position: 'absolute', left: 0, top: 3, bottom: 3, width: `${(page / total) * 100}%`, background: 'var(--ink)' }} />
          {XL_CHAPTERS.map((c, i) => (
            <div key={c.n} style={{ position: 'absolute', left: `${(i / XL_CHAPTERS.length) * 100}%`, top: 0, width: 2, height: 8, background: 'var(--paper)' }} />
          ))}
        </div>
        <div
          onClick={() => setPage((p) => Math.min(total, p + 2))}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}
        >
          <span className="sans" style={{ fontSize: 12 }}>Next</span><Icon name="right" size={13} />
        </div>
      </div>
    </div>
  )
}
