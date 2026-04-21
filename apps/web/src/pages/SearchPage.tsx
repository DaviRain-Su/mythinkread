import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

interface SearchResult {
  books?: Array<{
    id: string
    title: string
    author: string
    description: string
    rating_avg: number
  }>
  creators?: Array<{
    id: string
    display_name: string
    bio: string
  }>
  booklists?: Array<{
    id: string
    title: string
    description: string
    username: string
  }>
}

export default function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [activeType, setActiveType] = useState(searchParams.get('type') || 'all')
  const [results, setResults] = useState<SearchResult>({})
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{ text: string; type: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const search = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${activeType}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data.results || {})
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [query, activeType])

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setQuery(q)
      search()
    }
  }, [searchParams])

  const loadSuggestions = async (input: string) => {
    if (input.length < 1) {
      setSuggestions([])
      return
    }
    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(input)}`)
      if (!res.ok) return
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleSearch = () => {
    if (!query.trim()) return
    setSearchParams({ q: query, type: activeType })
    setShowSuggestions(false)
  }

  const types = [
    { key: 'all', label: '全部' },
    { key: 'books', label: '书籍' },
    { key: 'creators', label: '作者' },
    { key: 'booklists', label: '书单' }
  ]

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>搜索</h1>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              loadSuggestions(e.target.value)
              setShowSuggestions(true)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索书名、作者、书单..."
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              fontSize: '1rem'
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            搜索
          </button>
        </div>

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            marginTop: '0.25rem',
            zIndex: 50,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(s.text)
                  setShowSuggestions(false)
                  setSearchParams({ q: s.text, type: activeType })
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f4f6'
                }}
              >
                <span>{s.text}</span>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '0.5rem' }}>
                  {s.type === 'book' ? '书籍' : s.type === 'creator' ? '作者' : '标签'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Type Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {types.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveType(t.key)
              if (query.trim()) setSearchParams({ q: query, type: t.key })
            }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeType === t.key ? '#2563eb' : '#f3f4f6',
              color: activeType === t.key ? 'white' : '#4b5563'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>搜索中...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Books */}
          {(activeType === 'all' || activeType === 'books') && results.books && results.books.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>书籍</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {results.books.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => navigate(`/books/${book.id}`)}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'white',
                      borderRadius: '0.75rem',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer'
                    }}
                  >
                    <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{book.title}</h3>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{book.author}</p>
                    <p style={{ fontSize: '0.875rem', color: '#fbbf24' }}>⭐ {book.rating_avg.toFixed(1)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Creators */}
          {(activeType === 'all' || activeType === 'creators') && results.creators && results.creators.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>作者</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {results.creators.map((creator) => (
                  <div
                    key={creator.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'white',
                      borderRadius: '0.75rem',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <h3 style={{ fontWeight: 600 }}>{creator.display_name}</h3>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{creator.bio || '暂无简介'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booklists */}
          {(activeType === 'all' || activeType === 'booklists') && results.booklists && results.booklists.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>书单</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {results.booklists.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => navigate(`/booklists/${list.id}`)}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'white',
                      borderRadius: '0.75rem',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer'
                    }}
                  >
                    <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{list.title}</h3>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{list.description || '暂无描述'}</p>
                    <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>by {list.username}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchParams.get('q') && !loading &&
            (!results.books?.length && !results.creators?.length && !results.booklists?.length) && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              未找到相关结果
            </div>
          )}
        </div>
      )}
    </div>
  )
}
