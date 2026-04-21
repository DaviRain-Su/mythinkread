import { Hono } from 'hono'
import type { Env } from '../index'

const search = new Hono<{ Bindings: Env }>()

// GET /api/search - Global search
search.get('/', async (c) => {
  const db = c.env.DB
  const query = c.req.query('q')
  const type = c.req.query('type') || 'all'
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit

  if (!query || query.trim().length < 1) {
    return c.json({ error: 'QUERY_REQUIRED' }, 400)
  }

  const searchTerm = `%${query.trim()}%`
  const results: Record<string, unknown[]> = {}

  // Search books
  if (type === 'all' || type === 'books') {
    const books = await db.prepare(`
      SELECT b.*, c.display_name as creator_name
      FROM books b
      JOIN creators c ON b.creator_id = c.id
      WHERE b.status = 'published'
        AND (b.title LIKE ? OR b.author LIKE ? OR b.description LIKE ? OR b.tags LIKE ?)
      ORDER BY b.rating_avg DESC, b.read_count DESC
      LIMIT ? OFFSET ?
    `).bind(searchTerm, searchTerm, searchTerm, searchTerm, limit, offset).all()
    results.books = books.results || []
  }

  // Search creators
  if (type === 'all' || type === 'creators') {
    const creators = await db.prepare(`
      SELECT c.*, u.username
      FROM creators c
      JOIN users u ON c.user_id = u.id
      WHERE c.display_name LIKE ? OR c.bio LIKE ?
      LIMIT ? OFFSET ?
    `).bind(searchTerm, searchTerm, limit, offset).all()
    results.creators = creators.results || []
  }

  // Search booklists
  if (type === 'all' || type === 'booklists') {
    const booklists = await db.prepare(`
      SELECT b.*, u.username
      FROM booklists b
      JOIN users u ON b.user_id = u.id
      WHERE b.is_public = 1
        AND (b.title LIKE ? OR b.description LIKE ? OR b.tags LIKE ?)
      LIMIT ? OFFSET ?
    `).bind(searchTerm, searchTerm, searchTerm, limit, offset).all()
    results.booklists = booklists.results || []
  }

  // Search tags
  if (type === 'all' || type === 'tags') {
    const tags = await db.prepare(`
      SELECT DISTINCT tags FROM books
      WHERE status = 'published' AND tags LIKE ?
      LIMIT ? OFFSET ?
    `).bind(searchTerm, limit, offset).all()
    results.tags = tags.results || []
  }

  return c.json({
    query: query.trim(),
    type,
    results
  })
})

// GET /api/search/suggestions - Search suggestions
search.get('/suggestions', async (c) => {
  const db = c.env.DB
  const query = c.req.query('q')

  if (!query || query.trim().length < 1) {
    return c.json({ suggestions: [] })
  }

  const searchTerm = `%${query.trim()}%`

  const [books, creators, tags] = await Promise.all([
    db.prepare(`
      SELECT title as text, 'book' as type, id
      FROM books WHERE status = 'published' AND title LIKE ?
      LIMIT 5
    `).bind(searchTerm).all(),
    db.prepare(`
      SELECT display_name as text, 'creator' as type, id
      FROM creators WHERE display_name LIKE ?
      LIMIT 5
    `).bind(searchTerm).all(),
    db.prepare(`
      SELECT DISTINCT tags as text, 'tag' as type, '' as id
      FROM books WHERE status = 'published' AND tags LIKE ?
      LIMIT 5
    `).bind(searchTerm).all()
  ])

  const suggestions = [
    ...(books.results || []),
    ...(creators.results || []),
    ...(tags.results || [])
  ]

  return c.json({ suggestions })
})

// GET /api/search/trending - Trending searches
search.get('/trending', async (c) => {
  // In production, this would query a search analytics table
  // For now, return popular tags and books
  const db = c.env.DB

  const trending = await db.prepare(`
    SELECT title, read_count
    FROM books WHERE status = 'published'
    ORDER BY read_count DESC
    LIMIT 10
  `).all()

  return c.json({
    trending: trending.results || []
  })
})

export default search
