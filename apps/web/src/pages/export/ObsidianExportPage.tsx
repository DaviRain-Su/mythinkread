import { useState } from 'react'
import { Icon } from '../../components/mtr/primitives'

const INCLUDE_ITEMS = [
  ['Book Wiki (concepts, entities, themes, timeline)', true, '184 files · 2.1 MB'],
  ['Your highlights & notes', true, '142 notes · 612 highlights'],
  ['Chapter text (EPUB content)', false, 'needs author permission'],
  ['Relationship graph (Mermaid)', true, '5 graphs'],
  ['Audio transcripts', false, 'V2 · when available'],
  ['Community additions (accepted)', true, '14 entries'],
] as const

const FORMATS = [
  ['obsidian', 'Obsidian vault', true],
  ['zip', 'Markdown .zip', false],
  ['logseq', 'Logseq', false],
  ['roam', 'Roam EDN', false],
] as const

const OPTIONS = [
  ['YAML frontmatter (dates, tags, CID)', 'on'],
  ['Preserve [[wiki-links]]', 'on'],
  ['Embed cover + portrait PNGs', 'on'],
  ['Include Arweave TX in metadata', 'on'],
  ['Nest by folder (concepts/, entities/…)', 'on'],
  ['Append CC-BY-NC license', 'off'],
] as const

const VAULT_PREVIEW = `mirror-of-moonfall/
├─ _index.md
├─ concepts/
│  ├─ homesickness.md
│  ├─ seven-word-form.md
│  ├─ measurement.md
│  └─ …
├─ entities/
│  ├─ sen-yaolan.md
│  ├─ the-mother.md
│  ├─ qingye-village.md
│  └─ …
├─ themes/
├─ timeline/
│  └─ plot-clock.md
├─ analyses/           ← your notes
│  ├─ 2026-03-14.md
│  └─ on-sens-folding.md
├─ graphs/
│  └─ relations.mmd
└─ assets/cover.png`

const FILE_PREVIEW = `---
title: Sen Yaolan
zh: 森瑶岚
tags: [mtr/entity/persona, mtr/book/moonfall]
chapters: [1,2,3,4,6,7,11,17,19,24]
mtr_cid: bafybeihxyz4q…v5dlu
arweave_tx: WGvO4xn…bQtK
wiki_rev: 18
---

# Sen Yaolan · 森瑶岚

A disgraced astronomer... who returns to
[[qingye-village]] after fifteen years,
summoned by [[seven-word-letter]].

## Relationships
- [[the-mother]] — loves + unreconciled
- [[dr-rui]] — former colleague
- …`

export default function ObsidianExportPage() {
  const [selectedFormat, setSelectedFormat] = useState('obsidian')
  const [checked, setChecked] = useState<Record<string, boolean>>({
    'Book Wiki (concepts, entities, themes, timeline)': true,
    'Your highlights & notes': true,
    'Chapter text (EPUB content)': false,
    'Relationship graph (Mermaid)': true,
    'Audio transcripts': false,
    'Community additions (accepted)': true,
  })

  const toggle = (label: string) => {
    setChecked((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <div className="screen mtr" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--paper-2)', position: 'relative' }}>
      {/* Dimmed dashboard behind */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, padding: '32px 44px', opacity: 0.4, filter: 'blur(1px)', pointerEvents: 'none' }}>
          <div className="display" style={{ fontSize: 44, fontWeight: 300 }}>You have read for 142 hours.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginTop: 30 }}>
            {[
              ['42', 'BOOKS'],
              ['142h', 'TIME'],
              ['2,482', 'NOTES'],
              ['18', 'EXPORTS'],
            ].map(([v, k]) => (
              <div key={k}>
                <div className="display" style={{ fontSize: 36, fontWeight: 300 }}>{v}</div>
                <div className="mono" style={{ fontSize: 10 }}>{k}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'oklch(0.15 0.01 70 / 0.45)' }} />

        {/* Modal */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 860,
            maxWidth: 'calc(100% - 40px)',
            background: 'var(--paper)',
            border: '1px solid var(--ink)',
            borderRadius: 2,
            boxShadow: '0 20px 60px rgba(0,0,0,.25)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100% - 40px)',
            overflow: 'hidden',
          }}
        >
          {/* Modal header */}
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--paper-2)' }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: '#7c3aed',
                color: '#fff',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ◆
            </div>
            <div style={{ flex: 1 }}>
              <div className="display" style={{ fontSize: 20, fontWeight: 500, letterSpacing: -0.3 }}>Export to Obsidian</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                mirror-of-moonfall.mtr → Obsidian vault · Markdown + YAML + images
              </div>
            </div>
            <div style={{ cursor: 'pointer', padding: 6 }}>
              <Icon name="close" size={14} color="var(--ink-3)" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>
            {/* Left — options */}
            <div style={{ padding: 24, overflow: 'auto' }} className="scroll">
              <div className="eyebrow">What to include</div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {INCLUDE_ITEMS.map(([lbl, defaultOn, hint]) => {
                  const isOn = checked[lbl] ?? defaultOn
                  return (
                    <label
                      key={lbl}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '8px 10px',
                        background: isOn ? 'oklch(0.92 0.04 260 / .3)' : 'transparent',
                        borderRadius: 2,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isOn}
                        onChange={() => toggle(lbl)}
                        style={{ marginTop: 2, accentColor: '#7c3aed' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div className="sans" style={{ fontSize: 12.5, fontWeight: 500 }}>{lbl}</div>
                        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 2 }}>{hint}</div>
                      </div>
                    </label>
                  )
                })}
              </div>

              <div className="eyebrow" style={{ marginTop: 22 }}>Format</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {FORMATS.map(([k, l]) => {
                  const on = selectedFormat === k
                  return (
                    <span
                      key={k}
                      onClick={() => setSelectedFormat(k)}
                      className={`chip ${on ? 'active' : ''}`}
                      style={{
                        cursor: 'pointer',
                        background: on ? '#7c3aed' : 'var(--paper-2)',
                        color: on ? '#fff' : 'var(--ink-2)',
                        borderColor: on ? '#7c3aed' : 'var(--rule)',
                      }}
                    >
                      {l}
                    </span>
                  )
                })}
              </div>

              <div className="eyebrow" style={{ marginTop: 22 }}>Options</div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {OPTIONS.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                    <span className="sans" style={{ color: 'var(--ink-2)' }}>{k}</span>
                    <span className="mono" style={{ fontSize: 10, color: v === 'on' ? 'var(--moss)' : 'var(--ink-4)' }}>{v.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — preview */}
            <div style={{ padding: 24, background: 'var(--paper-2)', overflow: 'auto', borderLeft: '1px solid var(--rule)' }} className="scroll">
              <div className="eyebrow">Preview · vault structure</div>
              <pre
                style={{
                  margin: '10px 0 0',
                  padding: 14,
                  background: 'var(--ink)',
                  color: '#e8d9a8',
                  borderRadius: 2,
                  fontSize: 10.5,
                  lineHeight: 1.7,
                  fontFamily: 'var(--font-mono)',
                  overflow: 'auto',
                }}
              >
                {VAULT_PREVIEW}
              </pre>

              <div className="eyebrow" style={{ marginTop: 18 }}>entities/sen-yaolan.md · excerpt</div>
              <pre
                style={{
                  margin: '8px 0 0',
                  padding: 14,
                  background: 'var(--paper)',
                  border: '1px solid var(--rule)',
                  color: 'var(--ink-2)',
                  fontSize: 10.5,
                  lineHeight: 1.7,
                  fontFamily: 'var(--font-mono)',
                  overflow: 'auto',
                }}
              >
                {FILE_PREVIEW}
              </pre>
            </div>
          </div>

          {/* Modal footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--paper-2)' }}>
            <div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>EXPORT SIZE · 2.4 MB · 184 files · in ~2 sec</div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)' }}>you own this forever · signed with your key</div>
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn ghost">Cancel</button>
            <button className="btn accent" style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
              <Icon name="download" size={11} /> &nbsp;Download vault
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
