import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

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
}

interface Book {
  id: string
  title: string
  author: string
  description: string
  rating_avg: number
  rating_count: number
  chapters: Chapter[]
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

  useEffect(() => {
    loadBook()
    loadComments()
    loadRatings()
    loadMyRating()
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
        headers: { Authorization: `Bearer ${token}` }
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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ book_id: bookId, content: newComment })
      })
      if (!res.ok) throw new Error('Failed to post comment')
      setNewComment('')
      loadComments()
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
        headers: { Authorization: `Bearer ${token}` }
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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ score: myRating, review: myReview })
      })
      if (!res.ok) throw new Error('Failed to submit rating')
      setShowRatingForm(false)
      loadRatings()
      loadMyRating()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit rating')
    }
  }

  const handleLike = async (commentId: string) => {
    try {
      const token = localStorage.getItem('mtr_token')
      await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      loadComments()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>Loading...</div>
  }

  if (!book) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Book not found</div>
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Book Info */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{book.title}</h1>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>by {book.author}</p>
        <p style={{ color: '#374151', lineHeight: 1.6 }}>{book.description}</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => navigate(`/books/${bookId}/read/${book.chapters[0]?.id}`)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            开始阅读
          </button>
          <button
            onClick={() => setShowRatingForm(!showRatingForm)}
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            {myRating > 0 ? `我的评分: ${myRating}⭐` : '评分'}
          </button>
        </div>
      </div>

      {/* Rating Section */}
      {showRatingForm && (
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>评分</h2>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setMyRating(star)}
                style={{
                  fontSize: '1.5rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: star <= myRating ? '#fbbf24' : '#d1d5db'
                }}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={myReview}
            onChange={(e) => setMyReview(e.target.value)}
            placeholder="写下你的书评（可选）..."
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              resize: 'vertical',
              marginBottom: '1rem'
            }}
          />
          <button
            onClick={handleSubmitRating}
            disabled={myRating < 1}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: myRating > 0 ? '#2563eb' : '#9ca3af',
              color: 'white',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: myRating > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            提交评分
          </button>
        </div>
      )}

      {/* Rating Stats */}
      {ratingStats && ratingStats.total_count > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            评分 ({ratingStats.avg_score}⭐ · {ratingStats.total_count} 人)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingStats.distribution[star] || 0
              const percent = ratingStats.total_count > 0 ? (count / ratingStats.total_count) * 100 : 0
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '2rem', fontSize: '0.875rem' }}>{star}⭐</span>
                  <div style={{ flex: 1, height: '0.5rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem' }}>
                    <div style={{ width: `${percent}%`, height: '100%', backgroundColor: '#fbbf24', borderRadius: '0.25rem' }} />
                  </div>
                  <span style={{ width: '3rem', fontSize: '0.875rem', color: '#6b7280' }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Chapter List */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>章节列表</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {book.chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => navigate(`/books/${bookId}/read/${chapter.id}`)}
              style={{
                padding: '0.75rem',
                textAlign: 'left',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              {chapter.title}
            </button>
          ))}
        </div>
      </div>

      {/* Rating Reviews */}
      {ratings.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>书评</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ratings.map((rating) => (
              <div key={rating.id} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 500 }}>{rating.username}</span>
                  <span style={{ color: '#fbbf24' }}>{'★'.repeat(rating.score)}{'☆'.repeat(5 - rating.score)}</span>
                </div>
                {rating.review && (
                  <p style={{ color: '#374151', lineHeight: 1.5 }}>{rating.review}</p>
                )}
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {new Date(rating.created_at * 1000).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>评论 ({comments.length})</h2>

        {/* Comment Input */}
        <div style={{ marginBottom: '1.5rem' }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              resize: 'vertical'
            }}
            placeholder="写下你的评论..."
          />
          <button
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: newComment.trim() ? '#2563eb' : '#9ca3af',
              color: 'white',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: newComment.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            发表评论
          </button>
        </div>

        {/* Comment List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {comments.map((comment) => (
            <div key={comment.id} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 500, color: '#374151' }}>{comment.username}</span>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {new Date(comment.created_at * 1000).toLocaleDateString()}
                </span>
              </div>
              <p style={{ color: '#374151', lineHeight: 1.5 }}>{comment.content}</p>
              <button
                onClick={() => handleLike(comment.id)}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                👍 {comment.likes}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
