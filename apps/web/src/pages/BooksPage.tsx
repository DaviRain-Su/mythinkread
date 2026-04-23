import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Book {
  id: string
  title: string
  author: string
  description: string
  word_count: number
  chapter_count: number
  rating_avg: number
  read_count: number
  ai_mode: string
  created_at: number
}

export default function BooksPage() {
  const navigate = useNavigate()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const token = localStorage.getItem('mtr_token')
        const res = await fetch('/api/books?page=1&limit=50', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (!res.ok) throw new Error('Failed to load books')
        const data = await res.json()
        setBooks(data.items || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadBooks()
  }, [])

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(search.toLowerCase()) ||
    book.author.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 className="display" style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '1.5rem' }}>书库</h1>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索书名或作者..."
          className="mtr-input"
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem'
          }}
        />
      </div>

      {/* Book Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem'
      }}>
        {filteredBooks.map((book) => (
          <div
            key={book.id}
            onClick={() => navigate(`/books/${book.id}`)}
            style={{
              background: 'var(--paper)',
              borderRadius: '2px',
              padding: '1.5rem',
              cursor: 'pointer',
              border: '1px solid var(--rule)',
              transition: 'box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--ink)' }}>
              {book.title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-3)', marginBottom: '0.75rem' }}>
              {book.author}
            </p>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--ink-2)',
              lineHeight: 1.5,
              marginBottom: '1rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {book.description || '暂无简介'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--ink-4)' }}>
              <span>{book.chapter_count} 章</span>
              <span>{book.word_count} 字</span>
              <span>⭐ {book.rating_avg.toFixed(1)}</span>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <span className="chip" style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem'
              }}>
                {book.ai_mode === 'ai_only' ? '纯 AI' : book.ai_mode === 'light_hybrid' ? '轻度人机' : '重度人机'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredBooks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-3)' }}>
          暂无书籍
        </div>
      )}
    </div>
  )
}
