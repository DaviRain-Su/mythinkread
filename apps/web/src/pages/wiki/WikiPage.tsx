import { useState } from 'react'
import { Icon, formatCID } from '../../components/mtr/primitives'
import { useLangStore } from '../../stores/langStore'

const WIKI_TREE = [
  ['concepts/', ['Homesickness', 'Seven-word form', 'Coordinates', 'Measurement']],
  ['entities/', ['Sen Yaolan', 'The Mother', 'Qingye Village', 'The Well', 'Ginkgo']],
  ['themes/', ['Apology', 'Unspoken inheritance', 'The moon as clock']],
  ['timeline/', ['Before (y15 ago)', 'The letter', 'Return', 'Midnight']],
  ['analyses/', ['My notes (14)', 'Public threads (82)']],
] as const

const TOC_ITEMS = [
  'Definition in-text',
  'Appearances (3)',
  'Relations',
  'Your analyses',
  'Community threads (82)',
] as const

const BACKLINKS = [
  ['themes/', 'Apology'],
  ['entities/', 'The Mother'],
  ['concepts/', 'Feeling-as-explanation'],
  ['analyses/', "On the children's diagnosis"],
] as const

const META_ROWS = [
  ['Compiled', 'Claude 4.5 · 2026·03·08'],
  ['Last edit', 'you · 4h ago'],
  ['Arweave TX', 'WGvO4xn…bQtK'],
  ['IPFS CID', formatCID('bafybeiwikihm8rma')],
  ['Size', '2.4 MB · 184 pages'],
  ['Revision', '#12'],
] as const

const APPEARANCES = [
  ['Ch 1 ¶ 5', 'The children in Qingye had begun calling the moon homesick.'],
  ['Ch 3 ¶ 11', 'She measured 41 nights of drift, and did not feel 41 feelings, but she felt one of them continuously.'],
  ['Ch 8 ¶ 2', 'Her mother had been homesick for a country that did not yet exist.'],
] as const

const GRAPH_NODES: Array<[number, number, string, string]> = [
  [100, 60, 'The Moon', 'entity'],
  [470, 60, 'The Children', 'entity'],
  [130, 190, 'Measurement', 'concept'],
  [430, 190, 'Sen Yaolan', 'entity'],
  [320, 40, 'Apology', 'theme'],
]

export default function WikiPage() {
  const { lang } = useLangStore()
  const [activeToc, setActiveToc] = useState(0)
  const [selectedDir, setSelectedDir] = useState('concepts/')
  const [selectedItem, setSelectedItem] = useState('Homesickness')

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--paper-2)' }}>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '240px 1fr 340px', overflow: 'hidden' }}>
        {/* Left nav */}
        <aside style={{ borderRight: '1px solid var(--rule)', padding: '24px 14px', background: 'var(--paper)', overflow: 'auto' }} className="scroll">
          <div className="eyebrow">Mirror of Moonfall · Wiki</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 16 }}>
            <Icon name="sparkle" size={11} color="var(--terracotta)" />
            <div className="mono" style={{ fontSize: 9, color: 'var(--terracotta)' }}>LIVE · AI-MAINTAINED</div>
          </div>

          {WIKI_TREE.map(([dir, items]) => (
            <div key={dir} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="folder" size={11} color="var(--ink-3)" />
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', letterSpacing: '.05em' }}>{dir}</div>
              </div>
              <div style={{ marginLeft: 14, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2, borderLeft: '1px solid var(--rule-2)' }}>
                {items.map((it) => (
                  <div
                    key={it}
                    onClick={() => { setSelectedDir(dir); setSelectedItem(it) }}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      cursor: 'pointer',
                      color: dir === selectedDir && it === selectedItem ? 'var(--ink)' : 'var(--ink-3)',
                      fontWeight: dir === selectedDir && it === selectedItem ? 500 : 400,
                      background: dir === selectedDir && it === selectedItem ? 'var(--paper-2)' : 'transparent',
                    }}
                  >
                    {it}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button className="btn ghost" style={{ width: '100%', marginTop: 12, fontSize: 11 }}>
            <Icon name="download" size={10} /> &nbsp;{lang === 'zh' ? '导出到 Obsidian' : 'Export to Obsidian'}
          </button>
          <button
            className="btn accent"
            style={{ width: '100%', marginTop: 8, fontSize: 11 }}
            onClick={() => {
              const token = localStorage.getItem('mtr_token')
              fetch('/api/fsrs/cards', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  source_type: 'wiki',
                  source_id: `${selectedDir}${selectedItem}`,
                  front: selectedItem,
                  back: `Wiki concept from ${selectedDir}`,
                  context: `${selectedDir}${selectedItem}`,
                }),
              })
                .then(() => alert(lang === 'zh' ? '已添加到记忆卡片！' : 'Added to memory cards!'))
                .catch(console.error)
            }}
          >
            <Icon name="sparkle" size={10} /> &nbsp;{lang === 'zh' ? '加入记忆卡片' : 'Add to SRS'}
          </button>
        </aside>

        {/* Main content */}
        <main style={{ overflow: 'auto', padding: '40px 44px 60px' }} className="scroll">
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.14em' }}>CONCEPTS / HOMESICKNESS.md</div>
          <div className="display" style={{ fontSize: 44, fontWeight: 300, letterSpacing: -0.8, marginTop: 8, lineHeight: 1 }}>
            Homesickness
          </div>
          <div className="cjk" style={{ fontSize: 20, color: 'var(--ink-3)', marginTop: 6 }}>思乡</div>

          <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
            <span className="chip">a concept</span>
            <span className="chip">first seen · ch 1 ¶ 5</span>
            <span className="chip">cross-ref · moon, children, measurement</span>
            <span className="chip">wiki rev · 12</span>
          </div>

          <p style={{ fontSize: 17, lineHeight: 1.75, color: 'var(--ink)', marginTop: 26, fontFamily: 'var(--font-body)', textWrap: 'pretty' }}>
            In <em>The Mirror of Moonfall</em>, <strong>homesickness</strong> is first offered by the children of Qingye as a <mark className="hl gold">diagnosis for the moon</mark>. It is the first explanation in the book that involves a feeling rather than a measurement. The book treats this gesture — feeling-as-explanation — as its central epistemology.
          </p>

          {/* Relation graph */}
          <div style={{ marginTop: 30, padding: 24, background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 2, height: 260, position: 'relative' }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.1em', position: 'absolute', top: 12, left: 16 }}>RELATIONS</div>

            <svg viewBox="0 0 540 220" style={{ width: '100%', height: '100%' }}>
              {/* edges */}
              <path d="M 270 110 L 100 60" stroke="var(--rule)" strokeWidth="1" />
              <path d="M 270 110 L 470 60" stroke="var(--rule)" strokeWidth="1" />
              <path d="M 270 110 L 130 190" stroke="var(--rule)" strokeWidth="1" />
              <path d="M 270 110 L 430 190" stroke="var(--rule)" strokeWidth="1" />
              <path d="M 270 110 L 320 40" stroke="var(--rule)" strokeWidth="1" />
              <path d="M 100 60 L 320 40" stroke="var(--rule-2)" strokeWidth="1" strokeDasharray="2 3" />
              <path d="M 130 190 L 430 190" stroke="var(--rule-2)" strokeWidth="1" strokeDasharray="2 3" />

              {/* center node */}
              <circle cx="270" cy="110" r="42" fill="var(--terracotta)" opacity="0.9" />
              <text x="270" y="108" textAnchor="middle" fontFamily="var(--font-display)" fontSize="13" fill="#fff">Homesickness</text>
              <text x="270" y="122" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill="#fff" opacity="0.7">CONCEPT</text>

              {/* satellites */}
              {GRAPH_NODES.map(([x, y, t, k]) => (
                <g key={t}>
                  <circle cx={x} cy={y} r="26" fill="var(--paper-2)" stroke="var(--ink-3)" strokeWidth="1" />
                  <text x={x} y={y} textAnchor="middle" fontFamily="var(--font-display)" fontSize="11" fill="var(--ink)">{t}</text>
                  <text x={x} y={y + 12} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="7" fill="var(--ink-3)">{k}</text>
                </g>
              ))}
            </svg>
          </div>

          <h3 className="display" style={{ fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 8, letterSpacing: -0.3 }}>Appearances</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {APPEARANCES.map(([l, t]) => (
              <div key={l} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 18, padding: '10px 0', borderTop: '1px solid var(--rule-2)' }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.1em' }}>{l.toUpperCase()}</div>
                <p style={{ margin: 0, fontSize: 14, fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.55 }}>"{t}"</p>
              </div>
            ))}
          </div>

          <h3 className="display" style={{ fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 8, letterSpacing: -0.3 }}>
            Your analyses <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 400 }}>· 3 archived</span>
          </h3>
          <div style={{ padding: '16px 18px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 2 }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--terracotta)', letterSpacing: '.14em' }}>YOUR MARGINAL NOTE · 03.14</div>
            <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', fontStyle: 'italic' }}>
              "Is homesickness here a cause or an alibi? The children offer it; the book uses it; Sen half-accepts it. I suspect the book is working through whether feeling is ever a legitimate explanatory mechanism."
            </p>
          </div>
        </main>

        {/* Right meta */}
        <aside style={{ borderLeft: '1px solid var(--rule)', padding: '24px 20px', background: 'var(--paper)', overflow: 'auto' }} className="scroll">
          <div className="eyebrow">This page</div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {TOC_ITEMS.map((t, i) => (
              <div
                key={t}
                onClick={() => setActiveToc(i)}
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  color: activeToc === i ? 'var(--ink)' : 'var(--ink-3)',
                  borderLeft: activeToc === i ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {t}
              </div>
            ))}
          </div>

          <div className="eyebrow" style={{ marginTop: 26 }}>Backlinks</div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BACKLINKS.map(([d, t]) => (
              <div key={t} style={{ fontSize: 12, padding: '8px 10px', background: 'var(--paper-2)', borderRadius: 2, borderLeft: '2px solid var(--indigo)' }}>
                <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{d}</span>
                <div style={{ color: 'var(--ink-2)', marginTop: 2 }}>{t}</div>
              </div>
            ))}
          </div>

          <div className="eyebrow" style={{ marginTop: 26 }}>Wiki meta</div>
          <table className="mono" style={{ fontSize: 10, width: '100%', color: 'var(--ink-3)', marginTop: 8, borderCollapse: 'collapse' }}>
            <tbody>
              {META_ROWS.map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '5px 0' }}>{k}</td>
                  <td style={{ padding: '5px 0', textAlign: 'right', color: 'var(--ink-2)' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      </div>
    </div>
  )
}
