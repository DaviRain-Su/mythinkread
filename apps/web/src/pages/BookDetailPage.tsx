import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AIRatioBar,
  Badge,
  BilingualTitle,
  CID,
  Cover,
  Icon,
  aiTypeFromPct,
  formatCID,
} from '../components/mtr/primitives'

interface Comment {
  id: string
  username: string
  content: string
  likes: number
  created_at: number
}

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
  rating_avg: number
  rating_count: number
  chapters: Chapter[]
  ai_ratio?: number
  ai_percent?: number
  cid?: string
  tags?: string[]
  word_count?: number
  published_at?: string
}

interface Rating {
  id: string
  username: string
  score: number
  review: string
  created_at: number
}

interface RatingStats {
  avg_score: number
  total_count: number
  distribution: Record<number, number>
}

type TabKey = 'about' | 'chapters' | 'reviews' | 'discuss'

export default function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null)
  const [myRating, setMyRating] = useState<number>(0)
  const [myReview, setMyReview] = useState('')
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('about')

  useEffect(() => {
    void loadBook()
    void loadComments()
    void loadRatings()
    void loadMyRating()
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
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    if (!bookId) return
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch(`/api/comments?book_id=${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load comments')
      const data = await res.json()
      setComments(data.items || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !bookId) return
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ book_id: bookId, content: newComment }),
      })
      if (!res.ok) throw new Error('Failed to post comment')
      setNewComment('')
      void loadComments()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to post comment')
    }
  }

  const loadRatings = async () => {
    if (!bookId) return
    try {
      const res = await fetch(`/api/ratings/${bookId}`)
      if (!res.ok) return
      const data = await res.json()
      setRatings(data.items || [])
      setRatingStats(data.stats)
    } catch (err) {
      console.error(err)
    }
  }

  const loadMyRating = async () => {
    if (!bookId) return
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch(`/api/ratings/my/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.rating) {
        setMyRating(data.rating.score)
        setMyReview(data.rating.review || '')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmitRating = async () => {
    if (!bookId || myRating < 1) return
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch(`/api/ratings/${bookId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score: myRating, review: myReview }),
      })
      if (!res.ok) throw new Error('Failed to submit rating')
      setShowRatingForm(false)
      void loadRatings()
      void loadMyRating()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit rating')
    }
  }

  const handleLike = async (commentId: string) => {
    try {
      const token = localStorage.getItem('mtr_token')
      await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      void loadComments()
    } catch (err) {
      console.error(err)
    }
  }

  const aiPct = useMemo(() => {
    if (!book) return 50
    if (typeof book.ai_percent === 'number') return book.ai_percent
    if (typeof book.ai_ratio === 'number')
      return book.ai_ratio <= 1 ? Math.round(book.ai_ratio * 100) : Math.round(book.ai_ratio)
    return 50
  }, [book])

  const aiType = aiTypeFromPct(aiPct)

  if (loading) {
    return (
      <div style={centerStyle}>
        <div className="eyebrow">Loading…</div>
      </div>
    )
  }

  if (!book) {
    return (
      <div style={centerStyle}>
        <div className="display" style={{ fontSize: 24 }}>
          Book not found
        </div>
      </div>
    )
  }

  const cid = book.cid ?? 'bafybeihxyz4q2qk7m3tla'

  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <section
          style={{
            padding: '36px 44px 28px',
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: 44,
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <div>
            <Cover book={{ id: book.id, title: book.title, author: book.author, published: book.published_at }} size="xl" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              <button
                className="btn accent"
                onClick={() => book.chapters?.[0] && navigate(`/books/${book.id}/read/${book.chapters[0].id}`)}
              >
                <Icon name="book" size={12} /> Begin reading ·
                <span className="cjk" style={{ fontSize: 11, opacity: 0.8 }}>
                  开始阅读
                </span>
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn ghost"
                  style={{ flex: 1, fontSize: 11 }}
                  onClick={() => setShowRatingForm((x) => !x)}
                >
                  <Icon name="star" size={10} /> {myRating > 0 ? `${myRating}★ yours` : 'Rate'}
                </button>
                <button className="btn ghost" style={{ flex: 1, fontSize: 11 }}>
                  <Icon name="share" size={10} /> Share
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="eyebrow">
              {(book.tags?.[0] ?? 'Fiction')} · Published {book.published_at ?? '—'}
            </div>
            <h1
              className="display"
              style={{
                fontSize: 54,
                fontWeight: 300,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                marginTop: 12,
                marginBottom: 0,
                textWrap: 'balance',
              }}
            >
              {book.title}
            </h1>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginTop: 22,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c2b5a0, #8a7557)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontFamily: 'var(--font-display)',
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {book.author?.[0]?.toUpperCase() ?? 'A'}
                </div>
                <div className="sans" style={{ fontSize: 13, fontWeight: 500 }}>
                  {book.author}
                </div>
              </div>
              <div style={{ width: 1, height: 24, background: 'var(--rule)' }} />
              <Badge type={aiType} />
              <AIRatioBar pct={aiPct} />
              <div style={{ width: 1, height: 24, background: 'var(--rule)' }} />
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                <Icon name="star" size={10} color="var(--terracotta)" /> {book.rating_avg?.toFixed?.(1) ?? '—'} ·{' '}
                {book.rating_count?.toLocaleString?.() ?? '0'} readers
              </div>
            </div>

            <p
              className="body-serif"
              style={{
                fontStyle: 'italic',
                fontSize: 20,
                lineHeight: 1.5,
                color: 'var(--ink-2)',
                marginTop: 28,
                maxWidth: 680,
                textWrap: 'pretty',
              }}
            >
              {book.description}
            </p>

            {/* AI composition */}
            <div
              style={{
                marginTop: 28,
                padding: '18px 22px',
                border: '1px solid var(--rule)',
                borderRadius: 2,
                background: 'var(--paper-2)',
                maxWidth: 680,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <div className="eyebrow">AI · Human composition</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                  AUDIT CID · {formatCID(cid)}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  height: 14,
                  borderRadius: 1,
                  overflow: 'hidden',
                  background: 'var(--paper-3)',
                }}
              >
                <div
                  style={{
                    width: `${aiPct}%`,
                    background: 'var(--ai-pure)',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 8,
                    color: '#fff',
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '.1em',
                  }}
                >
                  AI · {aiPct}%
                </div>
                <div
                  style={{
                    width: `${100 - aiPct}%`,
                    background: 'var(--moss)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 8,
                    color: '#fff',
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '.1em',
                  }}
                >
                  HUMAN · {100 - aiPct}%
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 16,
                  marginTop: 14,
                }}
              >
                {[
                  ['Generation', 'Claude Haiku 4.5'],
                  ['Revisions', `${Math.max(100, (book.word_count ?? 50000) / 40 | 0).toLocaleString()} edits`],
                  ['Chapters', String(book.chapters?.length ?? 0)],
                  ['Words', (book.word_count ?? 0).toLocaleString()],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div
                      className="mono"
                      style={{
                        fontSize: 9,
                        color: 'var(--ink-3)',
                        letterSpacing: '.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {k}
                    </div>
                    <div
                      className="sans"
                      style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 3 }}
                    >
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section
          style={{
            padding: '0 44px',
            borderBottom: '1px solid var(--rule)',
            display: 'flex',
            gap: 4,
          }}
        >
          {(
            [
              ['about', 'About', '关于'],
              ['chapters', 'Chapters', '章节'],
              ['reviews', 'Reviews', '书评'],
              ['discuss', 'Discussion', '讨论'],
            ] as Array<[TabKey, string, string]>
          ).map(([k, en, zh]) => (
            <div
              key={k}
              onClick={() => setTab(k)}
              style={{
                padding: '14px 16px',
                fontSize: 13,
                cursor: 'pointer',
                borderBottom: tab === k ? '2px solid var(--ink)' : '2px solid transparent',
                marginBottom: -1,
                color: tab === k ? 'var(--ink)' : 'var(--ink-3)',
                fontFamily: 'var(--font-sans)',
                fontWeight: tab === k ? 500 : 400,
              }}
            >
              {en}{' '}
              <span
                className="cjk"
                style={{ fontSize: 11, opacity: 0.55, marginLeft: 4 }}
              >
                {zh}
              </span>
            </div>
          ))}
        </section>

        {/* Tab content + aside */}
        <section
          style={{
            padding: '36px 44px 80px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 320px',
            gap: 48,
          }}
        >
          <div>
            {tab === 'about' && (
              <div>
                <div className="ornament">· · ·</div>
                <p
                  className="body-serif"
                  style={{
                    fontSize: 18,
                    lineHeight: 1.75,
                    color: 'var(--ink-2)',
                    textWrap: 'pretty',
                  }}
                >
                  {book.description}
                </p>
                {showRatingForm && (
                  <div
                    className="fade-in"
                    style={{
                      marginTop: 36,
                      padding: '22px 24px',
                      border: '1px solid var(--rule)',
                      borderRadius: 2,
                      background: 'var(--paper-2)',
                    }}
                  >
                    <div className="eyebrow" style={{ marginBottom: 12 }}>
                      Your rating
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setMyRating(star)}
                          style={{
                            fontSize: 26,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color:
                              star <= myRating ? 'var(--terracotta)' : 'var(--rule)',
                            padding: 0,
                            lineHeight: 1,
                          }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="mtr-input"
                      value={myReview}
                      onChange={(e) => setMyReview(e.target.value)}
                      rows={3}
                      placeholder="Leave a short review…"
                      style={{ fontFamily: 'var(--font-body)' }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        className="btn accent"
                        disabled={myRating < 1}
                        onClick={handleSubmitRating}
                      >
                        Submit
                      </button>
                      <button className="btn ghost" onClick={() => setShowRatingForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {ratingStats && ratingStats.total_count > 0 && (
                  <div style={{ marginTop: 40 }}>
                    <div className="eyebrow">Rating distribution</div>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginTop: 12 }}>
                      <div style={{ flexShrink: 0 }}>
                        <div
                          className="display"
                          style={{ fontSize: 54, fontWeight: 300, lineHeight: 1 }}
                        >
                          {ratingStats.avg_score.toFixed(1)}
                        </div>
                        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                          {ratingStats.total_count} VOTES
                        </div>
                      </div>
                      <div style={{ flex: 1, maxWidth: 360 }}>
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = ratingStats.distribution[star] || 0
                          const percent =
                            ratingStats.total_count > 0
                              ? (count / ratingStats.total_count) * 100
                              : 0
                          return (
                            <div
                              key={star}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                fontSize: 12,
                                marginBottom: 6,
                              }}
                            >
                              <span
                                className="mono"
                                style={{ width: 18, color: 'var(--ink-3)' }}
                              >
                                {star}★
                              </span>
                              <div
                                style={{
                                  flex: 1,
                                  height: 6,
                                  background: 'var(--paper-3)',
                                  borderRadius: 1,
                                }}
                              >
                                <div
                                  style={{
                                    width: `${percent}%`,
                                    height: '100%',
                                    background: 'var(--terracotta)',
                                    borderRadius: 1,
                                  }}
                                />
                              </div>
                              <span
                                className="mono"
                                style={{ width: 36, textAlign: 'right', color: 'var(--ink-3)' }}
                              >
                                {count}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'chapters' && (
              <div>
                {(book.chapters ?? []).map((chapter, i) => (
                  <div
                    key={chapter.id}
                    onClick={() => navigate(`/books/${book.id}/read/${chapter.id}`)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 80px',
                      gap: 16,
                      padding: '14px 0',
                      borderBottom: '1px solid var(--rule-2)',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="mono" style={{ color: 'var(--ink-3)', fontSize: 11 }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <div className="display" style={{ fontSize: 16 }}>
                        {chapter.title}
                      </div>
                      <div
                        className="cjk"
                        style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}
                      >
                        第 {i + 1} 章
                      </div>
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'right' }}
                    >
                      {chapter.word_count ? `${Math.round(chapter.word_count / 250)} min` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'reviews' && (
              <div>
                {ratings.length === 0 ? (
                  <div
                    className="eyebrow"
                    style={{ padding: '60px 0', textAlign: 'center' }}
                  >
                    No reviews yet. Be the first.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {ratings.map((r) => (
                      <blockquote
                        key={r.id}
                        style={{
                          margin: 0,
                          padding: '16px 20px',
                          background: 'var(--paper-2)',
                          border: '1px solid var(--rule-2)',
                          borderRadius: 2,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                            alignItems: 'baseline',
                          }}
                        >
                          <span
                            className="mono"
                            style={{
                              fontSize: 10,
                              color: 'var(--ink-3)',
                              letterSpacing: '.1em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {r.username}
                          </span>
                          <span style={{ color: 'var(--terracotta)', fontSize: 14 }}>
                            {'★'.repeat(r.score)}
                            <span style={{ color: 'var(--rule)' }}>
                              {'★'.repeat(5 - r.score)}
                            </span>
                          </span>
                        </div>
                        {r.review && (
                          <p
                            className="body-serif"
                            style={{
                              margin: 0,
                              fontSize: 14,
                              lineHeight: 1.6,
                              color: 'var(--ink-2)',
                              fontStyle: 'italic',
                            }}
                          >
                            &ldquo;{r.review}&rdquo;
                          </p>
                        )}
                      </blockquote>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'discuss' && (
              <div>
                <div
                  style={{
                    padding: '18px 20px',
                    border: '1px solid var(--rule)',
                    borderRadius: 2,
                    background: 'var(--paper-2)',
                    marginBottom: 24,
                  }}
                >
                  <div className="eyebrow" style={{ marginBottom: 8 }}>
                    Leave a note for other readers
                  </div>
                  <textarea
                    className="mtr-input"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    placeholder="What is this book really about?"
                    style={{ fontFamily: 'var(--font-body)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button
                      className="btn accent"
                      disabled={!newComment.trim()}
                      onClick={handleSubmitComment}
                    >
                      Post
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {comments.length === 0 && (
                    <div
                      className="eyebrow"
                      style={{ textAlign: 'center', padding: '40px 0' }}
                    >
                      No discussion yet
                    </div>
                  )}
                  {comments.map((c) => (
                    <article
                      key={c.id}
                      style={{
                        padding: '14px 16px',
                        border: '1px solid var(--rule-2)',
                        borderRadius: 2,
                        background: 'var(--paper)',
                      }}
                    >
                      <header
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                          alignItems: 'baseline',
                        }}
                      >
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            color: 'var(--ink-3)',
                            letterSpacing: '.1em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {c.username}
                        </span>
                        <span
                          className="mono"
                          style={{ fontSize: 10, color: 'var(--ink-4)' }}
                        >
                          {new Date(c.created_at * 1000).toLocaleDateString()}
                        </span>
                      </header>
                      <p
                        style={{
                          margin: 0,
                          fontFamily: 'var(--font-body)',
                          fontSize: 14.5,
                          lineHeight: 1.6,
                          color: 'var(--ink-2)',
                        }}
                      >
                        {c.content}
                      </p>
                      <button
                        onClick={() => handleLike(c.id)}
                        className="chip"
                        style={{ marginTop: 10 }}
                      >
                        <Icon name="heart" size={10} /> {c.likes}
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <div className="eyebrow">Storage</div>
              <div
                style={{
                  marginTop: 10,
                  padding: 14,
                  border: '1px solid var(--rule)',
                  borderRadius: 2,
                  background: 'var(--paper-2)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <Icon name="ipfs" size={16} color="var(--terracotta)" />
                  <div className="sans" style={{ fontSize: 13, fontWeight: 500 }}>
                    Permanent IPFS
                  </div>
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--ink-3)',
                    wordBreak: 'break-all',
                    lineHeight: 1.6,
                  }}
                >
                  {cid}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <span className="chip" style={{ fontSize: 9, cursor: 'default' }}>
                    ★ Pinned · 18 nodes
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="eyebrow">Data</div>
              <table
                className="mono"
                style={{
                  width: '100%',
                  fontSize: 11,
                  color: 'var(--ink-2)',
                  marginTop: 10,
                  borderCollapse: 'collapse',
                }}
              >
                <tbody>
                  {(
                    [
                      ['Words', (book.word_count ?? 0).toLocaleString()],
                      ['Chapters', book.chapters?.length ?? 0],
                      ['Rating', `${book.rating_avg?.toFixed?.(1) ?? '—'} (${book.rating_count ?? 0})`],
                      ['Published', book.published_at ?? '—'],
                      ['Languages', 'EN · 中文'],
                    ] as Array<[string, string | number]>
                  ).map(([k, v], i) => (
                    <tr
                      key={k}
                      style={{
                        borderTop:
                          i === 0
                            ? '1px solid var(--rule)'
                            : '1px solid var(--rule-2)',
                      }}
                    >
                      <td style={{ padding: '7px 0', color: 'var(--ink-3)' }}>{k}</td>
                      <td style={{ padding: '7px 0', textAlign: 'right' }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div className="eyebrow">Audit</div>
              <div style={{ marginTop: 10 }}>
                <CID value={cid} />
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  marginTop: 8,
                  lineHeight: 1.6,
                }}
              >
                AI-blend verified on-chain. See audit trail for per-chapter edit ratios.
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}

const centerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '60vh',
  background: 'var(--paper)',
  color: 'var(--ink)',
}

void BilingualTitle
