import { Hono } from 'hono'
import type { Env } from '../index'

const recommendations = new Hono<{ Bindings: Env }>()

// Auth middleware (optional for trending)
recommendations.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const { verifyToken } = await import('../lib/jwt')
      const payload = await verifyToken(token)
      // @ts-ignore
      c.set('user', payload)
    } catch {
      // ignore invalid token
    }
  }
  await next()
})

// GET /api/recommendations/for-you - Personalized recommendations
recommendations.get('/for-you', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string } | undefined
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }
  const db = c.env.DB
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)

  // Get user's reading history
  const readingHistory = await db.prepare(`
    SELECT DISTINCT b.id, b.tags, b.creator_id
    FROM reading_progress rp
    JOIN books b ON rp.book_id = b.id
    WHERE rp.user_id = ? AND b.status = 'published'
  `).bind(user.userId).all()

  // Get user's ratings
  const userRatings = await db.prepare(`
    SELECT book_id, score FROM ratings WHERE user_id = ?
  `).bind(user.userId).all()

  // Get preferred tags from history
  const tagCounts: Record<string, number> = {}
  for (const row of readingHistory.results || []) {
    const tags = (row as any).tags
    if (tags) {
      try {
        const tagList = JSON.parse(tags)
        for (const tag of tagList) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        }
      } catch {
        // ignore parse error
      }
    }
  }

  // Sort tags by frequency
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)

  let recommendedBooks: any[] = []

  if (topTags.length > 0) {
    // Build tag matching query
    const tagConditions = topTags.map(() => 'tags LIKE ?').join(' OR ')
    const tagParams = topTags.map(tag => `%${tag}%`)

    const tagResults = await db.prepare(`
      SELECT b.*, c.display_name as creator_name
      FROM books b
      JOIN creators c ON b.creator_id = c.id
      WHERE b.status = 'published'
        AND b.id NOT IN (
          SELECT book_id FROM reading_progress WHERE user_id = ?
        )
        AND (${tagConditions})
      ORDER BY b.rating_avg DESC, b.read_count DESC
      LIMIT ?
    `).bind(user.userId, ...tagParams, limit).all()

    recommendedBooks = tagResults.results || []
  }

  // If not enough tag-based recommendations, add popular books
  if (recommendedBooks.length < limit) {
    const remaining = limit - recommendedBooks.length
    const existingIds = recommendedBooks.map((b: any) => b.id)
    const idFilter = existingIds.length > 0
      ? `AND b.id NOT IN (${existingIds.map(() => '?').join(',')})`
      : ''

    const popularResults = await db.prepare(`
      SELECT b.*, c.display_name as creator_name
      FROM books b
      JOIN creators c ON b.creator_id = c.id
      WHERE b.status = 'published'
        AND b.id NOT IN (SELECT book_id FROM reading_progress WHERE user_id = ?)
        ${idFilter}
      ORDER BY b.read_count DESC, b.rating_avg DESC
      LIMIT ?
    `).bind(user.userId, ...existingIds, remaining).all()

    recommendedBooks = [...recommendedBooks, ...(popularResults.results || [])]
  }

  // Collaborative filtering: find similar users
  const similarUsers = await db.prepare(`
    SELECT r2.user_id, COUNT(*) as common_books
    FROM ratings r1
    JOIN ratings r2 ON r1.book_id = r2.book_id
    WHERE r1.user_id = ? AND r2.user_id != ?
      AND ABS(r1.score - r2.score) <= 1
    GROUP BY r2.user_id
    HAVING common_books >= 2
    ORDER BY common_books DESC
    LIMIT 10
  `).bind(user.userId, user.userId).all()

  if (similarUsers.results && similarUsers.results.length > 0) {
    const similarUserIds = similarUsers.results.map((u: any) => u.user_id)
    const userFilter = similarUserIds.map(() => '?').join(',')

    const collaborativeResults = await db.prepare(`
      SELECT b.*, c.display_name as creator_name,
             AVG(r.score) as predicted_score
      FROM books b
      JOIN ratings r ON b.id = r.book_id
      JOIN creators c ON b.creator_id = c.id
      WHERE b.status = 'published'
        AND r.user_id IN (${userFilter})
        AND b.id NOT IN (SELECT book_id FROM reading_progress WHERE user_id = ?)
        AND b.id NOT IN (${recommendedBooks.map(() => '?').join(',') || "''"})
      GROUP BY b.id
      ORDER BY predicted_score DESC, b.read_count DESC
      LIMIT 5
    `).bind(...similarUserIds, user.userId, ...recommendedBooks.map((b: any) => b.id)).all()

    recommendedBooks = [...recommendedBooks, ...(collaborativeResults.results || [])]
  }

  // Deduplicate
  const seen = new Set()
  recommendedBooks = recommendedBooks.filter((book: any) => {
    if (seen.has(book.id)) return false
    seen.add(book.id)
    return true
  })

  return c.json({
    items: recommendedBooks.slice(0, limit),
    based_on: {
      tags: topTags,
      similar_users: similarUsers.results?.length || 0
    }
  })
})

// GET /api/recommendations/similar/:bookId - Similar books
recommendations.get('/similar/:bookId', async (c) => {
  const db = c.env.DB
  const bookId = c.req.param('bookId')
  const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50)

  // Get book details
  const book = await db.prepare(`
    SELECT tags, creator_id FROM books WHERE id = ? AND status = 'published'
  `).bind(bookId).first()

  if (!book) {
    return c.json({ error: 'BOOK_NOT_FOUND' }, 404)
  }

  const tags = (book as any).tags
  let tagList: string[] = []
  if (tags) {
    try {
      tagList = JSON.parse(tags)
    } catch {
      tagList = []
    }
  }

  // Same author
  const sameAuthor = await db.prepare(`
    SELECT b.*, c.display_name as creator_name
    FROM books b
    JOIN creators c ON b.creator_id = c.id
    WHERE b.creator_id = ? AND b.id != ? AND b.status = 'published'
    ORDER BY b.rating_avg DESC
    LIMIT ?
  `).bind((book as any).creator_id, bookId, 3).all()

  // Same tags
  let sameTags: any[] = []
  if (tagList.length > 0) {
    const tagConditions = tagList.map(() => 'tags LIKE ?').join(' OR ')
    const tagParams = tagList.map(tag => `%${tag}%`)

    const tagResults = await db.prepare(`
      SELECT b.*, c.display_name as creator_name
      FROM books b
      JOIN creators c ON b.creator_id = c.id
      WHERE b.id != ? AND b.status = 'published'
        AND (${tagConditions})
      ORDER BY b.rating_avg DESC, b.read_count DESC
      LIMIT ?
    `).bind(bookId, ...tagParams, limit).all()

    sameTags = tagResults.results || []
  }

  // Popular in same genre (fallback)
  const popular = await db.prepare(`
    SELECT b.*, c.display_name as creator_name
    FROM books b
    JOIN creators c ON b.creator_id = c.id
    WHERE b.id != ? AND b.status = 'published'
    ORDER BY b.read_count DESC
    LIMIT ?
  `).bind(bookId, 3).all()

  // Combine and deduplicate
  const seen = new Set([bookId])
  const combined = [
    ...(sameAuthor.results || []),
    ...sameTags,
    ...(popular.results || [])
  ].filter((b: any) => {
    if (seen.has(b.id)) return false
    seen.add(b.id)
    return true
  })

  return c.json({
    items: combined.slice(0, limit),
    categories: {
      same_author: (sameAuthor.results || []).length,
      same_tags: sameTags.length,
      popular: (popular.results || []).length
    }
  })
})

// GET /api/recommendations/trending - Trending now
recommendations.get('/trending', async (c) => {
  const db = c.env.DB
  const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50)

  const results = await db.prepare(`
    SELECT b.*, c.display_name as creator_name
    FROM books b
    JOIN creators c ON b.creator_id = c.id
    WHERE b.status = 'published'
    ORDER BY b.read_count DESC, b.rating_avg DESC
    LIMIT ?
  `).bind(limit).all()

  return c.json({ items: results.results || [] })
})

export default recommendations
