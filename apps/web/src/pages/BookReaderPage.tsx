import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

interface Chapter {
  id: string
  idx: number
  title: string
  word_count: number
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

export default function BookReaderPage() {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId: string }>()
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
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false)
  const [annotationNote, setAnnotationNote] = useState('')
  const [showAnnotations, setShowAnnotations] = useState(true)

  useEffect(() => {
    loadBook()
  }, [bookId])

  const loadBook = async () => {
    if (!bookId) return
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch(`/api/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load book')
      const data = await res.json()
      setBook(data)
      if (data.chapters?.length > 0) {
        loadChapter(data.chapters[0])
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
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load chapter')
      const data = await res.json()
      setChapterContent(data.chapter?.content || '')
      loadAnnotations(chapter.id)
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
    const startOffset = range.startOffset
    const endOffset = range.endOffset

    setSelectedText(text)
    setSelectionRange({ start: startOffset, end: endOffset })
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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          book_id: bookId,
          chapter_id: currentChapter.id,
          range_start: selectionRange.start,
          range_end: selectionRange.end,
          selected_text: selectedText,
          note: annotationNote
        })
      })
      if (!res.ok) throw new Error('Failed to create annotation')
      setAnnotationNote('')
      setShowAnnotationPanel(false)
      setSelectedText('')
      setSelectionRange(null)
      window.getSelection()?.removeAllRanges()
      loadAnnotations(currentChapter.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create annotation')
    }
  }

  const renderAnnotatedContent = () => {
    if (!showAnnotations || annotations.length === 0) {
      return chapterContent
    }
    // Simple annotation rendering - in production would use spans with ranges
    return chapterContent
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#ef4444' }}>{error || 'Book not found'}</p>
          <button onClick={() => navigate('/')} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Sidebar - Chapter List */}
      <div style={{
        width: '280px',
        backgroundColor: 'white',
        borderRight: '1px solid #e5e7eb',
        overflowY: 'auto',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 10,
        paddingTop: '3.5rem'
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{book.title}</h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{book.author}</p>
        </div>
        <div style={{ padding: '0.5rem 0' }}>
          {book.chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => loadChapter(chapter)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                textAlign: 'left',
                border: 'none',
                backgroundColor: currentChapter?.id === chapter.id ? '#eff6ff' : 'transparent',
                color: currentChapter?.id === chapter.id ? '#2563eb' : '#374151',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {chapter.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: '280px', flex: 1, padding: '2rem', maxWidth: '800px' }}>
        {currentChapter ? (
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {currentChapter.title}
            </h1>
            <div
              ref={contentRef}
              onMouseUp={handleTextSelection}
              style={{
                lineHeight: '1.8',
                fontSize: '1.125rem',
                color: '#374151',
                whiteSpace: 'pre-wrap',
                userSelect: 'text',
                cursor: 'text'
              }}
            >
              {renderAnnotatedContent() || 'Loading content...'}
            </div>

            {/* Annotation Panel */}
            {showAnnotationPanel && (
              <div style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                width: '320px',
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                padding: '1rem',
                zIndex: 50,
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  添加批注
                </h3>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginBottom: '0.75rem',
                  backgroundColor: '#fef3c7',
                  padding: '0.5rem',
                  borderRadius: '0.25rem'
                }}>
                  已选: "{selectedText.slice(0, 50)}{selectedText.length > 50 ? '...' : ''}"
                </p>
                <textarea
                  value={annotationNote}
                  onChange={(e) => setAnnotationNote(e.target.value)}
                  placeholder="写下你的批注..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    onClick={handleCreateAnnotation}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setShowAnnotationPanel(false)
                      setSelectedText('')
                      window.getSelection()?.removeAllRanges()
                    }}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: '#f3f4f6',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {/* Annotation List */}
            {annotations.length > 0 && (
              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                  批注 ({annotations.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {annotations.map((a) => (
                    <div key={a.id} style={{
                      padding: '0.75rem',
                      backgroundColor: '#fefce8',
                      borderRadius: '0.5rem',
                      borderLeft: `3px solid ${a.color || '#FFD700'}`
                    }}>
                      <p style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '0.25rem' }}>
                        "{a.selected_text.slice(0, 100)}{a.selected_text.length > 100 ? '...' : ''}"
                      </p>
                      {a.note && (
                        <p style={{ fontSize: '0.875rem', color: '#374151' }}>{a.note}</p>
                      )}
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        by {a.username}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '3rem',
              paddingTop: '2rem',
              borderTop: '1px solid #e5e7eb'
            }}>
              {currentChapter.idx > 0 && (
                <button
                  onClick={() => {
                    const prev = book.chapters.find(c => c.idx === currentChapter.idx - 1)
                    if (prev) loadChapter(prev)
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  ← Previous
                </button>
              )}
              {currentChapter.idx < book.chapters.length - 1 && (
                <button
                  onClick={() => {
                    const next = book.chapters.find(c => c.idx === currentChapter.idx + 1)
                    if (next) loadChapter(next)
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    marginLeft: 'auto'
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#6b7280' }}>Select a chapter to start reading</p>
          </div>
        )}
      </div>
    </div>
  )
}
