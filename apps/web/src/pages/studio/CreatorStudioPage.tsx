import { useState } from 'react'
import { Icon, Badge, AI_BADGES, type AIType } from '../../components/mtr/primitives'

type TabKey = 'compose' | 'generate' | 'publish'

interface MemoryEntry {
  name: string
  description: string
  type: AIType
}

const MEMORIES: MemoryEntry[] = [
  { name: 'Sen Yaolan', description: 'protagonist · astronomer · 34', type: 'pure' },
  { name: 'Qingye Village', description: 'setting · mountain · fictional', type: 'light' },
  { name: 'The Mother', description: 'character · off-stage until ch.8', type: 'heavy' },
  { name: 'The Moon Phenomenon', description: 'core premise · -4min/day', type: 'pure' },
  { name: 'The Seven-Word Letter', description: 'artifact · MacGuffin', type: 'heavy' },
  { name: 'Ginkgo trees', description: 'recurring motif', type: 'light' },
]

const CHAPTER_GROUPS = [
  {
    label: 'FRONT',
    items: ['Cover', 'Dedication', "Author's note"],
  },
  {
    label: 'PART I',
    items: [
      '1. The Letter of Seven Words',
      '2. What the Children Say',
      '3. A Measurement',
      '4. The Rope, The Well',
    ],
  },
  {
    label: 'PART II',
    items: [
      '5. Mother, Not Yet',
      '6. Qingye at Noon',
      '7. An Apology Shaped Like Weather',
    ],
  },
]

const STYLES = ['literary', 'mystery', 'lyric', 'epic', 'cozy', 'sci-fi']
const LENGTHS = ['800w', '2k', '5k', 'full chapter']

const HEALTH_METRICS = [
  ['Lore consistency', 98, 'var(--moss)'],
  ['Pacing index', 74, 'var(--gold)'],
  ['Voice drift', 12, 'var(--crimson)'],
  ['Cliché density', 21, 'var(--ink-3)'],
] as const

export default function CreatorStudioPage() {
  const [tab, setTab] = useState<TabKey>('compose')
  const [promptText, setPromptText] = useState(
    'A disgraced astronomer returns to her mountain village where the moon has begun falling four minutes earlier each night. Each chapter is a measurement she takes.'
  )
  const [style, setStyle] = useState('literary')
  const [consistency, setConsistency] = useState(82)
  const [lengthIdx, setLengthIdx] = useState(2)
  const [confirmCopyright, setConfirmCopyright] = useState(true)
  const [confirmIPFS, setConfirmIPFS] = useState(true)
  const [confirmWiki, setConfirmWiki] = useState(false)

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr 300px', overflow: 'hidden' }}>
        {/* ─── Left sidebar: Manuscript tree ─── */}
        <aside
          style={{
            borderRight: '1px solid var(--rule)',
            padding: '22px 14px',
            background: 'var(--paper-2)',
            overflow: 'auto',
          }}
          className="scroll"
        >
          <div className="eyebrow">Manuscript</div>
          <div className="display" style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>
            The Mirror of Moonfall
          </div>
          <div className="cjk" style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 18 }}>
            月落之镜 · Draft 14
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {CHAPTER_GROUPS.map((grp) => (
              <div key={grp.label}>
                <div
                  className="mono"
                  style={{
                    fontSize: 9,
                    color: 'var(--ink-4)',
                    letterSpacing: '.14em',
                    padding: '10px 4px 4px',
                  }}
                >
                  {grp.label}
                </div>
                {grp.items.map((it, i) => {
                  const active = grp.label === 'PART I' && i === 0
                  return (
                    <div
                      key={it}
                      style={{
                        padding: '6px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                        color: active ? 'var(--ink)' : 'var(--ink-3)',
                        background: active ? 'var(--paper)' : 'transparent',
                        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span className="mono" style={{ fontSize: 9, color: 'var(--ink-4)' }}>
                        {active ? '●' : '○'}
                      </span>
                      {it}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <button className="btn ghost" style={{ width: '100%', marginTop: 18, fontSize: 11 }}>
            <Icon name="plus" size={10} /> &nbsp;New chapter
          </button>
        </aside>

        {/* ─── Main area ─── */}
        <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', padding: '0 32px', borderBottom: '1px solid var(--rule)', gap: 4 }}>
            {[
              ['compose', 'Compose', '写作'],
              ['generate', 'AI Generate', '生成'],
              ['publish', 'Publish', '发布'],
            ].map(([k, en, zh]) => (
              <div
                key={k}
                onClick={() => setTab(k as TabKey)}
                style={{
                  padding: '14px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                  borderBottom: tab === k ? '2px solid var(--ink)' : '2px solid transparent',
                  marginBottom: -1,
                  color: tab === k ? 'var(--ink)' : 'var(--ink-3)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: tab === k ? 500 : 400,
                }}
              >
                {en}
                <span className="cjk" style={{ fontSize: 11, opacity: 0.55, marginLeft: 6 }}>
                  {zh}
                </span>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                autosaved · 00:14 ago
              </div>
              <button className="btn ghost" style={{ fontSize: 11 }}>
                Preview
              </button>
              <button className="btn" style={{ fontSize: 11 }}>
                Commit draft
              </button>
            </div>
          </div>

          {/* ── Compose tab ── */}
          {tab === 'compose' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                padding: '32px 40px',
                overflow: 'auto',
              }}
              className="scroll"
            >
              <div style={{ width: 640, maxWidth: '100%' }}>
                <div
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.14em' }}
                >
                  CHAPTER 1 · DRAFT 7
                </div>
                <input
                  defaultValue="The Letter of Seven Words"
                  style={{
                    border: 0,
                    outline: 0,
                    background: 'transparent',
                    fontFamily: 'var(--font-display)',
                    fontSize: 38,
                    fontWeight: 400,
                    letterSpacing: -0.6,
                    width: '100%',
                    marginTop: 8,
                    color: 'var(--ink)',
                  }}
                />
                <input
                  defaultValue="七个字的信"
                  className="cjk"
                  style={{
                    border: 0,
                    outline: 0,
                    background: 'transparent',
                    fontSize: 16,
                    color: 'var(--ink-3)',
                    width: '100%',
                    marginTop: 6,
                  }}
                />
                <div
                  style={{
                    fontSize: 17,
                    lineHeight: 1.85,
                    color: 'var(--ink)',
                    marginTop: 32,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <p>
                    The letter was{' '}
                    <span style={{ background: 'oklch(0.85 0.05 148 / 0.5)', padding: '0 2px' }}>
                      seven words long
                    </span>
                    . Her mother had never been one to waste.
                  </p>
                  <p>
                    Sen Yaolan read it on the train, then folded it, then read it again, then folded
                    it in exactly the opposite way{' '}
                    <span style={{ color: 'var(--ink-4)', borderBottom: '1px dashed var(--ink-4)' }}>
                      because folding it the first way had made her feel like she was closing
                      something her mother had left open
                    </span>
                    .
                  </p>
                  <p>
                    The coordinates pointed to the old well behind the house. The time was four
                    minutes past midnight.{' '}
                    <span style={{ background: 'oklch(0.90 0.08 35 / 0.4)' }}>
                      The remaining five words she kept privately, the way one keeps a tooth in a
                      drawer
                    </span>
                    : uselessly, but with a conviction that it may one day matter.
                  </p>

                  {/* AI Continuation */}
                  <div
                    style={{
                      border: '1px dashed var(--ink-4)',
                      padding: '14px 18px',
                      margin: '18px 0',
                      background: 'var(--paper-2)',
                      borderRadius: 2,
                    }}
                  >
                    <div
                      className="mono"
                      style={{
                        fontSize: 9,
                        color: 'var(--terracotta)',
                        letterSpacing: '.14em',
                        marginBottom: 6,
                      }}
                    >
                      ✦ AI CONTINUATION · hover to accept / reject
                    </div>
                    <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--ink-2)' }}>
                      Outside the train window the country returned to her in pieces. A hill she had
                      once drawn. A river she had mispronounced until the age of eleven. A copse of
                      ginkgo trees that had, during her entire childhood, been on the other side of
                      the road.
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button className="btn" style={{ fontSize: 10, padding: '4px 10px' }}>
                        Accept
                      </button>
                      <button className="btn ghost" style={{ fontSize: 10, padding: '4px 10px' }}>
                        Revise
                      </button>
                      <button className="btn ghost" style={{ fontSize: 10, padding: '4px 10px' }}>
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── AI Generate tab ── */}
          {tab === 'generate' && (
            <div
              style={{ flex: 1, padding: '32px 40px', overflow: 'auto' }}
              className="scroll"
            >
              <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <div className="eyebrow">Prompt</div>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: 16,
                    border: '1px solid var(--rule)',
                    borderRadius: 2,
                    background: 'var(--paper-2)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: 'var(--ink)',
                    minHeight: 120,
                    resize: 'vertical',
                    outline: 0,
                  }}
                />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 16,
                    marginTop: 20,
                  }}
                >
                  {/* Style chips */}
                  <div>
                    <div className="eyebrow">Style</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {STYLES.map((s) => (
                        <span
                          key={s}
                          onClick={() => setStyle(s)}
                          className={`chip ${style === s ? 'active' : ''}`}
                          style={{ cursor: 'pointer' }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Consistency slider */}
                  <div>
                    <div className="eyebrow">Consistency · lockstep with lore</div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={consistency}
                      onChange={(e) => setConsistency(+e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: 10,
                        accentColor: 'var(--terracotta)',
                      }}
                    />
                    <div
                      className="mono"
                      style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}
                    >
                      {consistency}% · keeps 184 memories
                    </div>
                  </div>

                  {/* Length options */}
                  <div>
                    <div className="eyebrow">Length</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {LENGTHS.map((s, i) => (
                        <span
                          key={s}
                          onClick={() => setLengthIdx(i)}
                          className={`chip ${i === lengthIdx ? 'active' : ''}`}
                          style={{ cursor: 'pointer' }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <button className="btn accent">
                    <Icon name="sparkle" size={11} /> &nbsp;Generate · 5,000 words
                  </button>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                    EST · 42 sec · $0.06
                  </div>
                </div>

                {/* Memory grid */}
                <div
                  style={{
                    marginTop: 30,
                    border: '1px solid var(--rule)',
                    borderRadius: 2,
                    padding: 20,
                    background: 'var(--paper-2)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <div className="eyebrow">Memory (automatically maintained)</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                      184 entries · vectorized
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 12,
                      marginTop: 14,
                    }}
                  >
                    {MEMORIES.map((m) => (
                      <div
                        key={m.name}
                        style={{
                          padding: 10,
                          background: 'var(--paper)',
                          borderRadius: 2,
                          border: '1px solid var(--rule-2)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: AI_BADGES[m.type].color,
                            }}
                          />
                          <div className="sans" style={{ fontSize: 12, fontWeight: 500 }}>
                            {m.name}
                          </div>
                        </div>
                        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                          {m.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Publish tab ── */}
          {tab === 'publish' && (
            <div
              style={{ flex: 1, padding: '32px 40px', overflow: 'auto' }}
              className="scroll"
            >
              <div style={{ maxWidth: 680, margin: '0 auto' }}>
                <div className="eyebrow">Publish to MyThinkRead</div>
                <div
                  className="display"
                  style={{
                    fontSize: 32,
                    fontWeight: 400,
                    letterSpacing: -0.4,
                    marginTop: 6,
                  }}
                >
                  Declare your AI blend.
                </div>

                {/* AI-human composition audit */}
                <div
                  style={{
                    marginTop: 24,
                    padding: 20,
                    border: '1px solid var(--rule)',
                    borderRadius: 2,
                    background: 'var(--paper-2)',
                  }}
                >
                  <div className="eyebrow">Measured revision</div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      marginTop: 10,
                    }}
                  >
                    <div className="display" style={{ fontSize: 42, fontWeight: 300 }}>
                      32%
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          height: 10,
                          borderRadius: 1,
                          overflow: 'hidden',
                          background: 'var(--paper-3)',
                        }}
                      >
                        <div style={{ width: '68%', background: 'var(--ai-pure)' }} />
                        <div style={{ width: '32%', background: 'var(--moss)' }} />
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: 'var(--ink-3)',
                          marginTop: 6,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>AI-originated · 68%</span>
                        <span>Human-edited · 32%</span>
                      </div>
                    </div>
                    <Badge type="light" />
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: 'var(--ink-3)',
                      marginTop: 12,
                      lineHeight: 1.7,
                    }}
                  >
                    MEASURED ACROSS 4,120 edits · 18 sessions · 14 days <br />
                    ✓ MEETS THRESHOLD · publishable as LIGHT COLLAB
                  </div>
                </div>

                {/* Checkboxes */}
                <div style={{ marginTop: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={confirmCopyright}
                      onChange={(e) => setConfirmCopyright(e.target.checked)}
                    />
                    <span className="sans" style={{ fontSize: 13 }}>
                      I confirm all content is AI-generated or human-edited. No third-party
                      copyrighted text.
                    </span>
                  </label>
                  <label
                    style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}
                  >
                    <input
                      type="checkbox"
                      checked={confirmIPFS}
                      onChange={(e) => setConfirmIPFS(e.target.checked)}
                    />
                    <span className="sans" style={{ fontSize: 13 }}>
                      Mint to IPFS as permanent content-addressed book (CID).
                    </span>
                  </label>
                  <label
                    style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}
                  >
                    <input
                      type="checkbox"
                      checked={confirmWiki}
                      onChange={(e) => setConfirmWiki(e.target.checked)}
                    />
                    <span className="sans" style={{ fontSize: 13 }}>
                      Allow community Wiki contributions.
                    </span>
                  </label>
                </div>

                {/* CID preview + Publish button */}
                <div
                  style={{
                    marginTop: 26,
                    padding: 18,
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    borderRadius: 2,
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: 'var(--paper-3)',
                      letterSpacing: '.14em',
                    }}
                  >
                    PREVIEW CID · NOT YET MINTED
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 12, marginTop: 8, wordBreak: 'break-all' }}
                  >
                    bafybeihxyz4q2qk7m3tla
                    <span style={{ opacity: 0.5 }}>qetxzp4jkmn6y8h2v5dlu</span>
                  </div>
                  <button className="btn accent" style={{ marginTop: 16 }}>
                    ✦ Publish + Mint
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ─── Right sidebar: Health / AI comments / Session ─── */}
        <aside
          style={{
            borderLeft: '1px solid var(--rule)',
            padding: '22px 18px',
            background: 'var(--paper-2)',
            overflow: 'auto',
          }}
          className="scroll"
        >
          {/* Health metrics */}
          <div className="eyebrow">Health</div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {HEALTH_METRICS.map(([k, v, c]) => (
              <div key={k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span className="sans" style={{ color: 'var(--ink-2)' }}>{k}</span>
                  <span className="mono" style={{ color: 'var(--ink-3)' }}>{v}</span>
                </div>
                <div
                  style={{
                    height: 3,
                    background: 'var(--paper-3)',
                    marginTop: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${v}%`,
                      height: '100%',
                      background: c as string,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* AI comments */}
          <div style={{ marginTop: 26 }}>
            <div className="eyebrow">AI comments</div>
            <div
              style={{
                marginTop: 10,
                padding: 12,
                background: 'var(--paper)',
                border: '1px solid var(--rule-2)',
                borderRadius: 2,
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  color: 'var(--terracotta)',
                  letterSpacing: '.14em',
                }}
              >
                ¶ 3 · CONTINUITY
              </div>
              <p
                style={{
                  fontSize: 12,
                  margin: '6px 0 0',
                  lineHeight: 1.55,
                  color: 'var(--ink-2)',
                }}
              >
                Chapter 2 says the well is 11 meters deep. Here you imply the mother reached the
                bottom in 8 seconds — that would be fine, but chapter 7 describes a climbable slope.
                Pick one.
              </p>
            </div>
            <div
              style={{
                marginTop: 10,
                padding: 12,
                background: 'var(--paper)',
                border: '1px solid var(--rule-2)',
                borderRadius: 2,
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  color: 'var(--moss)',
                  letterSpacing: '.14em',
                }}
              >
                ¶ 5 · VOICE
              </div>
              <p
                style={{
                  fontSize: 12,
                  margin: '6px 0 0',
                  lineHeight: 1.55,
                  color: 'var(--ink-2)',
                }}
              >
                Your strongest line today. Mark as &quot;pinned style sample&quot;?
              </p>
            </div>
          </div>

          {/* Session stats */}
          <div style={{ marginTop: 24 }}>
            <div className="eyebrow">Session</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginTop: 10,
              }}
            >
              <div>
                <div className="display" style={{ fontSize: 22 }}>
                  1,204
                </div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>
                  WORDS TODAY
                </div>
              </div>
              <div>
                <div className="display" style={{ fontSize: 22 }}>
                  02:41
                </div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>
                  ACTIVE
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
