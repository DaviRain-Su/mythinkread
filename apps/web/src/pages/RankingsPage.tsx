import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Book {
  id: string
  title: string
  author: string
  description: string
  rating_avg: number
  read_count: number
  created_at: number
}

export default function RankingsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'hot' | 'new' | 'rated'>('hot')
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRankings()
  }, [activeTab])

  const loadRankings = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/rankings/${activeTab}?period=weekly&limit=20`)
      if (!res.ok) throw new Error('Failed to load rankings')
      const data = await res.json()
      setBooks(data.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { key: 'hot' as const, label: '热读榜' },
    { key: 'new' as const, label: '新书榜' },
    { key: 'rated' as const, label: '评分榜' }
  ]

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>榜单</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              backgroundColor: activeTab === tab.key ? '#2563eb' : '#f3f4f6',
              color: activeTab === tab.key ? 'white' : '#4b5563'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rankings List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {books.map((book, index) => (
            <div
              key={book.id}
              onClick={() => navigate(`/books/${book.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                cursor: 'pointer'
              }}
            >
              {/* Rank Number */}
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.5rem',
                backgroundColor: index < 3 ? '#fef3c7' : '#f3f4f6',
                color: index < 3 ? '#92400e' : '#6b7280',
                fontWeight: 'bold',
                fontSize: '1.125rem'
              }}>
                {index + 1}
              </div>

              {/* Book Info */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{book.title}</h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{book.author}</p>
              </div>

              {/* Stats */}
              <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#6b7280' }}>
                <div>⭐ {book.rating_avg.toFixed(1)}</div>
                <div>👁 {book.read_count}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {books.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          暂无数据
        </div>
      )}
    </div>
  )
}
