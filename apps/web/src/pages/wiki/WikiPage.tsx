import { useState } from 'react'
import { Icon, formatCID } from '../../components/mtr/primitives'
import { useTranslation } from 'react-i18next'
import WikiGraph3D from '../../components/mtr/WikiGraph3D'
import React from 'react'

// Kumo UI Date Picker (lazy loaded)
const DatePicker = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.DatePicker as unknown as React.ComponentType<any>,
  }))
)

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



export default function WikiPage() {
  const { t } = useTranslation()
  const [activeToc, setActiveToc] = useState(0)
  const [selectedDir, setSelectedDir] = useState('concepts/')
  const [selectedItem, setSelectedItem] = useState('Homesickness')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)

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
            <Icon name="download" size={10} /> &nbsp;{t('wiki.exportToObsidian')}
          </button>
          <button
            className="btn ghost"
            style={{ width: '100%', marginTop: 8, fontSize: 11 }}
            onClick={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={10} /> &nbsp;{t('wiki.timelineDate')}
          </button>
          {showDatePicker && (
            <React.Suspense fallback={<div style={{ height: 40, background: 'var(--paper-2)', borderRadius: 2, marginTop: 8 }} />}>
              <DatePicker
                value={selectedDate}
                onChange={(date: Date) => {
                  setSelectedDate(date)
                  setShowDatePicker(false)
                }}
                placeholder={t('wiki.selectDate')}
              />
            </React.Suspense>
          )}
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
                .then(() => alert(t('wiki.addedToCards')))
                .catch(console.error)
            }}
          >
            <Icon name="sparkle" size={10} /> &nbsp;{t('wiki.addToSRS')}
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

          {/* 3D Relation Graph */}
          <div style={{ marginTop: 30 }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.1em', marginBottom: 10 }}>
              3D KNOWLEDGE GRAPH
            </div>
            <WikiGraph3D
              nodes={[
                { id: 'homesickness', title: 'Homesickness', category: 'concept', x: 0, y: 0, z: 0, fsrs_s: 5.2, fsrs_r: 0.85 },
                { id: 'moon', title: 'The Moon', category: 'entity', x: -3, y: 2, z: -1, fsrs_s: 8.1, fsrs_r: 0.92 },
                { id: 'children', title: 'The Children', category: 'entity', x: 3, y: 2, z: 1, fsrs_s: 3.4, fsrs_r: 0.45 },
                { id: 'measurement', title: 'Measurement', category: 'concept', x: -2, y: -2, z: 2, fsrs_s: 6.7, fsrs_r: 0.78 },
                { id: 'sen-yaolan', title: 'Sen Yaolan', category: 'entity', x: 2, y: -2, z: -2, fsrs_s: 4.1, fsrs_r: 0.62 },
                { id: 'apology', title: 'Apology', category: 'theme', x: 0, y: 3, z: -3, fsrs_s: 2.8, fsrs_r: 0.35 },
              ]}
              edges={[
                { from: 'homesickness', to: 'moon', type: 'references' },
                { from: 'homesickness', to: 'children', type: 'explains' },
                { from: 'homesickness', to: 'measurement', type: 'contradicts' },
                { from: 'homesickness', to: 'sen-yaolan', type: 'appears_in' },
                { from: 'homesickness', to: 'apology', type: 'related_to' },
                { from: 'moon', to: 'apology', type: 'related_to' },
                { from: 'measurement', to: 'sen-yaolan', type: 'related_to' },
              ]}
              onNodeClick={(node) => console.log('Clicked:', node.title)}
            />
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
