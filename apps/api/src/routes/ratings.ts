import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env } from '../index'

const ratings = new Hono<{ Bindings: Env }>()

// Auth middleware
ratings.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const { verifyToken } = await import('../lib/jwt')
    const payload = await verifyToken(token)
    // @ts-ignore
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'INVALID_TOKEN' }, 401)
  }
})

function generateUUID(): string {
  const timestamp = Date.now()
  const timeHex = timestamp.toString(16).padStart(12, '0')
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `${timeHex.slice(0, 8)}-${timeHex.slice(8)}-7${random.slice(0, 3)}-${(parseInt(random.slice(3, 4), 16) & 0x3 | 0x8).toString(16)}${random.slice(4, 7)}-${random.slice(7, 15)}`
}

const ratingSchema = z.object({
  score: z.number().int().min(1).max(5),
  review: z.string().max(2000).optional()
})

// POST /api/ratings/:bookId - Rate a book
ratings.post('/:bookId', zValidator('json', ratingSchema), async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const bookId = c.req.param('bookId')
  const { score, review } = c.req.valid('json')

  // Verify book exists and is published
  const book = await db.prepare('SELECT id, creator_id, rating_avg, rating_count FROM books WHERE id = ? AND status = ?')
    .bind(bookId, 'published').first()
  if (!book) {
    return c.json({ error: 'BOOK_NOT_FOUND' }, 404)
  }

  const now = Math.floor(Date.now() / 1000)

  // Upsert rating
  await db.prepare(`
    INSERT INTO ratings (id, user_id, book_id, score, review, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, book_id) DO UPDATE SET
      score = excluded.score,
      review = excluded.review,
      updated_at = excluded.updated_at
  `).bind(generateUUID(), user.userId, bookId, score, review || null, now, now).run()

  // Recalculate book rating
  const ratingStats = await db.prepare(`
    SELECT AVG(score) as avg_score, COUNT(*) as count
    FROM ratings WHERE book_id = ?
  `).bind(bookId).first()

  await db.prepare(`
    UPDATE books SET rating_avg = ?, rating_count = ? WHERE id = ?
  `).bind(
    Math.round((ratingStats?.avg_score as number || 0) * 10) / 10,
    ratingStats?.count as number || 0,
    bookId
  ).run()

  // Create notification for book creator
  if (book.creator_id !== user.userId) {
    await db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, content, related_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      generateUUID(),
      book.creator_id,
      'like',
      '新书评分',
      `你的作品获得了 ${score} 星评分`,
      bookId,
      now
    ).run()
  }

  return c.json({ success: true, score, review })
})

// GET /api/ratings/:bookId - Get ratings for a book
ratings.get('/:bookId', async (c) => {
  const db = c.env.DB
  const bookId = c.req.param('bookId')
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit

  const results = await db.prepare(`
    SELECT r.*, u.username, u.display_name
    FROM ratings r
    JOIN users u ON r.user_id = u.id
    WHERE r.book_id = ?
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(bookId, limit, offset).all()

  const stats = await db.prepare(`
    SELECT 
      AVG(score) as avg_score,
      COUNT(*) as total_count,
      SUM(CASE WHEN score = 5 THEN 1 ELSE 0 END) as five_star,
      SUM(CASE WHEN score = 4 THEN 1 ELSE 0 END) as four_star,
      SUM(CASE WHEN score = 3 THEN 1 ELSE 0 END) as three_star,
      SUM(CASE WHEN score = 2 THEN 1 ELSE 0 END) as two_star,
      SUM(CASE WHEN score = 1 THEN 1 ELSE 0 END) as one_star
    FROM ratings WHERE book_id = ?
  `).bind(bookId).first()

  return c.json({
    items: results.results || [],
    stats: {
      avg_score: Math.round((stats?.avg_score as number || 0) * 10) / 10,
      total_count: stats?.total_count as number || 0,
      distribution: {
        5: stats?.five_star as number || 0,
        4: stats?.four_star as number || 0,
        3: stats?.three_star as number || 0,
        2: stats?.two_star as number || 0,
        1: stats?.one_star as number || 0
      }
    }
  })
})

// GET /api/ratings/my/:bookId - Get my rating for a book
ratings.get('/my/:bookId', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const bookId = c.req.param('bookId')

  const rating = await db.prepare(`
    SELECT * FROM ratings WHERE user_id = ? AND book_id = ?
  `).bind(user.userId, bookId).first()

  return c.json({ rating })
})

// DELETE /api/ratings/:bookId - Delete my rating
ratings.delete('/:bookId', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const bookId = c.req.param('bookId')

  await db.prepare('DELETE FROM ratings WHERE user_id = ? AND book_id = ?')
    .bind(user.userId, bookId).run()

  // Recalculate book rating
  const ratingStats = await db.prepare(`
    SELECT AVG(score) as avg_score, COUNT(*) as count
    FROM ratings WHERE book_id = ?
  `).bind(bookId).first()

  await db.prepare(`
    UPDATE books SET rating_avg = ?, rating_count = ? WHERE id = ?
  `).bind(
    Math.round((ratingStats?.avg_score as number || 0) * 10) / 10,
    ratingStats?.count as number || 0,
    bookId
  ).run()

  return c.json({ success: true })
})

export default ratings
