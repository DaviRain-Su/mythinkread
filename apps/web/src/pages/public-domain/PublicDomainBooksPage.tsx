import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Book {
  id: string
  title: string
  author: string
  description: string
  category: string
  publish_year: number
  word_count: number
}

interface Category {
  category: string
  count: number
}

export default function PublicDomainBooksPage() {
  const navigate = useNavigate()
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBooks()
  }, [activeCategory])

  const loadBooks = async () => {
    try {
      const url = activeCategory
        ? `/api/public-domain/books?category=${activeCategory}`
        : '/api/public-domain/books'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load books')
      const data = await res.json()
      setBooks(data.items || [])
      setCategories(data.categories || [])
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
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        公版书库
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        收录来自 Project Gutenberg、Wikisource、书格等平台的公版图书
      </p>

      {/* Categories */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveCategory('')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeCategory === '' ? '#2563eb' : '#f3f4f6',
            color: activeCategory === '' ? 'white' : '#4b5563'
          }}
        >
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat.category}
            onClick={() => setActiveCategory(cat.category)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeCategory === cat.category ? '#2563eb' : '#f3f4f6',
              color: activeCategory === cat.category ? 'white' : '#4b5563'
            }}
          >
            {cat.category} ({cat.count})
          </button>
        ))}
      </div>

      {/* Books Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem'
      }}>
        {books.map((book) => (
          <div
            key={book.id}
            onClick={() => navigate(`/public-domain/${book.id}`)}
            style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
              cursor: 'pointer'
            }}
          >
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{book.title}</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              {book.author}
            </p>
            <p style={{
              fontSize: '0.875rem',
              color: '#374151',
              lineHeight: 1.5,
              marginBottom: '1rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {book.description || '暂无简介'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#9ca3af' }}>
              <span>{book.publish_year}年</span>
              <span>{book.word_count} 字</span>
            </div>
          </div>
        ))}
      </div>

      {books.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          暂无公版图书
        </div>
      )}
    </div>
  )
}
