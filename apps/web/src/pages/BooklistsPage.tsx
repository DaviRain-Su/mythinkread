import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Booklist {
  id: string
  title: string
  description: string
  item_count: number
  likes: number
  username: string
  created_at: number
}

export default function BooklistsPage() {
  const navigate = useNavigate()
  const [booklists, setBooklists] = useState<Booklist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBooklists()
  }, [])

  const loadBooklists = async () => {
    try {
      const res = await fetch('/api/booklists?page=1&limit=50')
      if (!res.ok) throw new Error('Failed to load booklists')
      const data = await res.json()
      setBooklists(data.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>书单</h1>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        {booklists.map((booklist) => (
          <div
            key={booklist.id}
            onClick={() => navigate(`/booklists/${booklist.id}`)}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              cursor: 'pointer',
              border: '1px solid #e5e7eb'
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {booklist.title}
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '1rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {booklist.description || '暂无描述'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#9ca3af' }}>
              <span>by {booklist.username}</span>
              <span>{booklist.item_count} 本书</span>
            </div>
          </div>
        ))}
      </div>

      {booklists.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          暂无书单
        </div>
      )}
    </div>
  )
}
