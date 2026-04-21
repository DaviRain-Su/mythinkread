import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

interface BooklistItem {
  id: string
  book_id: string
  book_title: string
  author: string
  idx: number
}

interface Booklist {
  id: string
  title: string
  description: string
  username: string
  item_count: number
  likes: number
  created_at: number
  items: BooklistItem[]
}

export default function BooklistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [booklist, setBooklist] = useState<Booklist | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBooklist()
  }, [id])

  const loadBooklist = async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/booklists/${id}`)
      if (!res.ok) throw new Error('Failed to load booklist')
      const data = await res.json()
      setBooklist(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
  }

  if (!booklist) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>书单不存在</div>
  }

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Booklist Info */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          {booklist.title}
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          by {booklist.username} · {booklist.item_count} 本书
        </p>
        {booklist.description && (
          <p style={{ color: '#374151', lineHeight: 1.6 }}>{booklist.description}</p>
        )}
      </div>

      {/* Books */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {booklist.items.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(`/books/${item.book_id}`)}
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
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.5rem',
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              fontWeight: 'bold'
            }}>
              {item.idx + 1}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{item.book_title}</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{item.author}</p>
            </div>
          </div>
        ))}
      </div>

      {booklist.items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          书单为空
        </div>
      )}
    </div>
  )
}
