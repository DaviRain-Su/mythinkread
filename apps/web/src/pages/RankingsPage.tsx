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
      <h1 className="display" style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '1.5rem' }}>榜单</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={activeTab === tab.key ? 'chip active' : 'chip'}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
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
                background: 'var(--paper)',
                borderRadius: '2px',
                border: '1px solid var(--rule)',
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
                borderRadius: '2px',
                background: index < 3 ? 'var(--accent)' : 'var(--paper-2)',
                color: index < 3 ? 'var(--accent-ink)' : 'var(--ink-3)',
                fontWeight: 'bold',
                fontSize: '1.125rem'
              }}>
                {index + 1}
              </div>

              {/* Book Info */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--ink)' }}>{book.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--ink-3)' }}>{book.author}</p>
              </div>

              {/* Stats */}
              <div style={{ textAlign: 'right', fontSize: '0.875rem', color: 'var(--ink-3)' }}>
                <div>⭐ {book.rating_avg.toFixed(1)}</div>
                <div>👁 {book.read_count}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {books.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-3)' }}>
          暂无数据
        </div>
      )}
    </div>
  )
}
