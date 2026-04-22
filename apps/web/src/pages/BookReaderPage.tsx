import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/mtr/primitives'
import BookFlip3D from '../components/mtr/BookFlip3D'
import { useToast } from '../components/KumoToastProvider'
import React from 'react'

// Kumo UI components (lazy loaded)
const KumoDialog = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.Dialog as unknown as React.ComponentType<any>,
  }))
)
const KumoTooltip = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.Tooltip as unknown as React.ComponentType<any>,
  }))
)


interface Chapter {
  id: string
  idx: number
  title: string
  word_count?: number
}

interface Book {
  id: string
  title: string
  author: string
  description: string
  chapters: Chapter[]
}

interface Annotation {
  id: string
  user_id: string
  username: string
  range_start: number
  range_end: number
  selected_text: string
  note: string
  color: string
}

type FontKey = 'serif' | 'sans' | 'mono'

const FONT_FAMILY: Record<FontKey, string> = {
  serif: 'var(--font-body)',
  sans: 'var(--font-sans)',
  mono: 'var(--font-mono)',
}

export default function BookReaderPage() {
  const { bookId } = useParams<{ bookId: string; chapterId: string }>()
  const navigate = useNavigate()
  const contentRef = useRef<HTMLDivElement>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null)
  const [chapterContent, setChapterContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedText, setSelectedText] = useState('')
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null)
  const [show3DFlip, setShow3DFlip] = useState(false)
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false)
  const [annotationNote, setAnnotationNote] = useState('')
  const [fontKey, setFontKey] = useState<FontKey>('serif')
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable')
  const { showToast } = useToast()
  const [showExitDialog, setShowExitDialog] = useState(false)

  useEffect(() => {
    void loadBook()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId])

  const loadBook = async () => {
    if (!bookId) return
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch(`/api/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load book')
      const data = (await res.json()) as Book
      setBook(data)
      if (data.chapters?.length > 0) {
        void loadChapter(data.chapters[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load book')
    } finally {
      setLoading(false)
    }
  }

  const loadChapter = async (chapter: Chapter) => {
    if (!bookId) return
    setCurrentChapter(chapter)
    setChapterContent('')
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch(`/api/books/${bookId}/read/${chapter.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load chapter')
      const data = await res.json()
      setChapterContent(data.chapter?.content || '')
      void loadAnnotations(chapter.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chapter')
    }
  }

  const loadAnnotations = async (chapterId: string) => {
    if (!bookId) return
    try {
      const res = await fetch(`/api/annotations?book_id=${bookId}&chapter_id=${chapterId}`)
      if (!res.ok) return
      const data = await res.json()
      setAnnotations(data.items || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setSelectedText('')
      setSelectionRange(null)
      setShowAnnotationPanel(false)
      return
    }
    const text = selection.toString().trim()
    if (text.length < 2) return
    const range = selection.getRangeAt(0)
    setSelectedText(text)
    setSelectionRange({ start: range.startOffset, end: range.endOffset })
    setShowAnnotationPanel(true)
  }, [])

  const handleCreateAnnotation = async () => {
    if (!bookId || !currentChapter || !selectionRange) return
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          book_id: bookId,
          chapter_id: currentChapter.id,
          range_start: selectionRange.start,
          range_end: selectionRange.end,
          selected_text: selectedText,
          note: annotationNote,
        }),
      })
      if (!res.ok) throw new Error('Failed to create annotation')
      setAnnotationNote('')
      setShowAnnotationPanel(false)
      setSelectedText('')
      setSelectionRange(null)
      window.getSelection()?.removeAllRanges()
      void loadAnnotations(currentChapter.id)
      showToast('Annotation saved successfully', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create annotation', 'error')
    }
  }

  if (loading) {
    return (
      <div style={centerStyle}>
        <div className="eyebrow">Loading…</div>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div style={centerStyle}>
        <div className="display" style={{ fontSize: 24 }}>
          {error || 'Book not found'}
        </div>
        <button className="btn ghost" style={{ marginTop: 20 }} onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    )
  }

  const totalPages = book.chapters.length
  const currentPage = (currentChapter?.idx ?? 0) + 1
  const densityStyle =
    density === 'compact'
      ? { fontSize: 17, lineHeight: 1.55 }
      : density === 'spacious'
      ? { fontSize: 21, lineHeight: 2.0 }
      : { fontSize: 19, lineHeight: 1.75 }

  return (
    <div
      style={{
        background: 'var(--paper-2)',
        color: 'var(--ink)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Chrome */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 28px',
          background: 'var(--paper)',
          borderBottom: '1px solid var(--rule)',
          gap: 14,
        }}
      >
        <button
          onClick={() => navigate(`/books/${book.id}`)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ink-3)',
            padding: 4,
          }}
        >
          <Icon name="left" size={14} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="display" style={{ fontSize: 15, fontWeight: 500 }}>
            {book.title}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 9,
              color: 'var(--ink-3)',
              letterSpacing: '.1em',
              textTransform: 'uppercase',
            }}
          >
            {currentChapter
              ? `Ch. ${String((currentChapter.idx ?? 0) + 1).padStart(2, '0')} · ${currentChapter.title}`
              : 'Select a chapter'}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
            {currentPage} / {totalPages} · {Math.round((currentPage / totalPages) * 100)}%
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--rule)' }} />
          {(['serif', 'sans', 'mono'] as FontKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setFontKey(k)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: FONT_FAMILY[k],
                color: fontKey === k ? 'var(--ink)' : 'var(--ink-4)',
                fontWeight: fontKey === k ? 500 : 400,
                borderBottom: fontKey === k ? '1px solid var(--ink)' : 'none',
                paddingBottom: 1,
              }}
            >
              Aa
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: 'var(--rule)' }} />
          {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className="chip"
              style={{
                background: density === d ? 'var(--ink)' : 'var(--paper)',
                color: density === d ? 'var(--paper)' : 'var(--ink-2)',
                border: '1px solid var(--rule)',
                cursor: 'pointer',
              }}
            >
              {d === 'compact' ? 'Tight' : d === 'spacious' ? 'Roomy' : 'Medium'}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: 'var(--rule)' }} />
          <button
            className="chip"
            onClick={() => setShow3DFlip(!show3DFlip)}
            style={{
              background: show3DFlip ? 'var(--terracotta)' : 'var(--paper)',
              color: show3DFlip ? '#fff' : 'var(--ink-2)',
              border: '1px solid var(--rule)',
              cursor: 'pointer',
            }}
          >
            3D
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--rule)' }} />
          <React.Suspense fallback={null}>
            <KumoTooltip content="Exit reader">
              <button
                className="chip"
                onClick={() => setShowExitDialog(true)}
                style={{
                  background: 'var(--paper)',
                  color: 'var(--ink-2)',
                  border: '1px solid var(--rule)',
                  cursor: 'pointer',
                }}
              >
                Exit
              </button>
            </KumoTooltip>
          </React.Suspense>
        </div>
      </div>

      {/* Exit Dialog */}
      {showExitDialog && (
        <React.Suspense fallback={null}>
          <KumoDialog
            open={showExitDialog}
            onOpenChange={setShowExitDialog}
            title="Exit Reader"
            description="Your reading progress has been saved. Are you sure you want to exit?"
            onConfirm={() => {
              setShowExitDialog(false)
              navigate(`/books/${book.id}`)
              showToast('Reading progress saved', 'success')
            }}
            onCancel={() => setShowExitDialog(false)}
          />
        </React.Suspense>
      )}

      {/* 3D Flip Animation */}
      {show3DFlip && book && (
        <BookFlip3D
          bookTitle={book.title}
          bookColor="#8a5f3a"
          onClose={() => setShow3DFlip(false)}
        />
      )}

      {/* Reading area */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '220px minmax(0, 1fr) 280px',
          overflow: 'hidden',
        }}
      >
        {/* Chapters */}
        <aside
          className="mtr-scroll"
          style={{
            padding: '28px 18px',
            borderRight: '1px solid var(--rule)',
            background: 'var(--paper)',
            overflow: 'auto',
          }}
        >
          <div className="eyebrow">Chapters</div>
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {book.chapters.map((ch, i) => {
              const active = currentChapter?.id === ch.id
              return (
                <button
                  key={ch.id}
                  onClick={() => loadChapter(ch)}
                  style={{
                    padding: '10px 12px',
                    fontSize: 12,
                    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    background: active ? 'var(--paper-2)' : 'transparent',
                    color: active ? 'var(--ink)' : 'var(--ink-3)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    border: 'none',
                    borderLeftWidth: 2,
                    borderLeftStyle: 'solid',
                    borderLeftColor: active ? 'var(--accent)' : 'transparent',
                    fontFamily: 'inherit',
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 9,
                      color: 'var(--ink-4)',
                      letterSpacing: '.1em',
                    }}
                  >
                    CH {String(i + 1).padStart(2, '0')}
                  </div>
                  <div
                    className="display"
                    style={{
                      fontSize: 12.5,
                      marginTop: 2,
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    {ch.title}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Body */}
        <main
          className="mtr-scroll"
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '48px 20px 80px',
            overflow: 'auto',
          }}
        >
          <div style={{ width: 620, maxWidth: '100%' }}>
            {currentChapter ? (
              <>
                <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 8 }}>
                  Chapter {String((currentChapter.idx ?? 0) + 1).padStart(2, '0')}
                </div>
                <h1
                  className="display"
                  style={{
                    textAlign: 'center',
                    fontSize: 38,
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                    marginBottom: 24,
                    lineHeight: 1.1,
                  }}
                >
                  {currentChapter.title}
                </h1>
                <div
                  ref={contentRef}
                  onMouseUp={handleTextSelection}
                  className="reader-body body-serif"
                  style={{
                    fontFamily: FONT_FAMILY[fontKey],
                    ...densityStyle,
                    color: 'var(--ink)',
                    textAlign: 'justify',
                    textWrap: 'pretty',
                    hyphens: 'auto',
                    whiteSpace: 'pre-wrap',
                    userSelect: 'text',
                    cursor: 'text',
                  }}
                >
                  {chapterContent || (
                    <div className="eyebrow" style={{ textAlign: 'center', padding: '40px 0' }}>
                      Loading chapter…
                    </div>
                  )}
                </div>

                {annotations.length > 0 && (
                  <>
                    <div className="ornament" style={{ marginTop: 40 }}>
                      ◆ ◆ ◆
                    </div>
                    <div
                      className="eyebrow"
                      style={{ marginTop: 12, textAlign: 'center' }}
                    >
                      {annotations.length} notes in the margin
                    </div>
                  </>
                )}

                {/* Chapter nav */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 60,
                    paddingTop: 24,
                    borderTop: '1px solid var(--rule)',
                  }}
                >
                  <button
                    className="btn ghost"
                    disabled={(currentChapter.idx ?? 0) <= 0}
                    onClick={() => {
                      const prev = book.chapters.find(
                        (c) => c.idx === (currentChapter.idx ?? 0) - 1,
                      )
                      if (prev) void loadChapter(prev)
                    }}
                  >
                    <Icon name="left" size={12} /> Previous
                  </button>
                  <button
                    className="btn accent"
                    disabled={(currentChapter.idx ?? 0) >= book.chapters.length - 1}
                    onClick={() => {
                      const next = book.chapters.find(
                        (c) => c.idx === (currentChapter.idx ?? 0) + 1,
                      )
                      if (next) void loadChapter(next)
                    }}
                  >
                    Next <Icon name="right" size={12} />
                  </button>
                </div>
              </>
            ) : (
              <div className="eyebrow" style={{ textAlign: 'center', padding: '60px 0' }}>
                Select a chapter to start reading
              </div>
            )}
          </div>
        </main>

        {/* Aside: notes */}
        <aside
          className="mtr-scroll"
          style={{
            padding: '28px 20px',
            borderLeft: '1px solid var(--rule)',
            background: 'var(--paper)',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            overflow: 'auto',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div className="eyebrow">Highlights</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                {annotations.length}
              </div>
            </div>
            {annotations.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--ink-4)',
                  fontStyle: 'italic',
                  lineHeight: 1.6,
                }}
              >
                Select any passage to highlight, note, or ask the book.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {annotations.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      borderLeft: `2px solid ${
                        a.color || 'oklch(0.82 0.10 85)'
                      }`,
                      paddingLeft: 10,
                    }}
                  >
                    <p
                      className="body-serif"
                      style={{
                        margin: 0,
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        color: 'var(--ink-2)',
                        fontStyle: 'italic',
                      }}
                    >
                      &ldquo;{a.selected_text.slice(0, 100)}
                      {a.selected_text.length > 100 ? '…' : ''}&rdquo;
                    </p>
                    {a.note && (
                      <p
                        style={{
                          margin: '6px 0 0',
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: 'var(--ink-2)',
                        }}
                      >
                        {a.note}
                      </p>
                    )}
                    <div
                      className="mono"
                      style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 6 }}
                    >
                      {a.username.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showAnnotationPanel && (
            <div
              style={{
                borderTop: '1px solid var(--rule-2)',
                paddingTop: 16,
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                New note
              </div>
              <div
                style={{
                  background: 'oklch(0.97 0.05 85)',
                  padding: '12px 14px',
                  borderRadius: 2,
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: 'var(--ink-2)',
                  fontStyle: 'italic',
                  marginBottom: 10,
                }}
              >
                &ldquo;{selectedText.slice(0, 140)}
                {selectedText.length > 140 ? '…' : ''}&rdquo;
              </div>
              <textarea
                value={annotationNote}
                onChange={(e) => setAnnotationNote(e.target.value)}
                placeholder="Write a note…"
                rows={3}
                className="mtr-input"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  className="btn accent"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={handleCreateAnnotation}
                >
                  Save
                </button>
                <button
                  className="btn ghost"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => {
                    setShowAnnotationPanel(false)
                    setSelectedText('')
                    window.getSelection()?.removeAllRanges()
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Bottom progress */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '10px 28px',
          borderTop: '1px solid var(--rule)',
          background: 'var(--paper)',
        }}
      >
        <Icon name="left" size={13} color="var(--ink-3)" />
        <div
          style={{
            flex: 1,
            height: 2,
            background: 'var(--rule)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${(currentPage / totalPages) * 100}%`,
              background: 'var(--ink)',
            }}
          />
        </div>
        <Icon name="right" size={13} color="var(--ink-3)" />
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--ink-3)',
            minWidth: 180,
            textAlign: 'right',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
          }}
        >
          {currentChapter
            ? `Ch ${currentPage} / ${totalPages}`
            : '—'}
        </div>
      </div>
    </div>
  )
}

const centerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '80vh',
  background: 'var(--paper)',
  color: 'var(--ink)',
}
