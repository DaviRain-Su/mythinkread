import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Book {
  id: string
  title: string
  author: string
  description: string
  rating_avg: number
  read_count: number
  cover_cid: string
}

export default function RecommendationsPage() {
  const navigate = useNavigate()
  const [forYou, setForYou] = useState<Book[]>([])
  const [trending, setTrending] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecommendations()
  }, [])

  const loadRecommendations = async () => {
    try {
      const token = localStorage.getItem('mtr_token')
      
      // Load personalized recommendations
      const forYouRes = await fetch('/api/recommendations/for-you?limit=10', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (forYouRes.ok) {
        const data = await forYouRes.json()
        setForYou(data.items || [])
      }

      // Load trending
      const trendingRes = await fetch('/api/recommendations/trending?limit=10')
      if (trendingRes.ok) {
        const data = await trendingRes.json()
        setTrending(data.items || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const BookCard = ({ book }: { book: Book }) => (
    <div
      onClick={() => navigate(`/books/${book.id}`)}
      style={{
        padding: '1rem',
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1rem' }}>
        {book.title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
        {book.author}
      </p>
      <p style={{
        fontSize: '0.875rem',
        color: '#374151',
        lineHeight: 1.5,
        marginBottom: '0.75rem',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {book.description || '暂无简介'}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#9ca3af' }}>
        <span>⭐ {book.rating_avg?.toFixed(1) || '0.0'}</span>
        <span>👁 {book.read_count || 0}</span>
      </div>
    </div>
  )

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem' }}>
        推荐
      </h1>

      {/* For You */}
      {forYou.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
            为你推荐
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1rem'
          }}>
            {forYou.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      )}

      {/* Trending */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          热门趋势
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1rem'
        }}>
          {trending.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </div>
    </div>
  )
}
