import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import type { Env, AuthedUser } from '../index'

const analytics = new Hono<{ Bindings: Env; Variables: { user: AuthedUser; jwtPayload: AuthedUser } }>()

analytics.use('*', requireAuth)

// GET /api/analytics/overview - Overview stats
analytics.get('/overview', async (c) => {
  const db = c.env.DB
  const days = parseInt(c.req.query('days') || '30')
  const since = Math.floor(Date.now() / 1000) - days * 86400

  const [
    newUsers,
    activeReaders,
    totalReads,
    newBooks,
    newComments,
    avgRating,
    topBooks,
    topCreators,
    dailyStats
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM users WHERE created_at > ?')
      .bind(since).first(),
    db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM reading_progress WHERE updated_at > ?
    `).bind(since).first(),
    db.prepare(`
      SELECT SUM(read_count) as total FROM books WHERE created_at > ?
    `).bind(since).first(),
    db.prepare('SELECT COUNT(*) as count FROM books WHERE created_at > ?')
      .bind(since).first(),
    db.prepare('SELECT COUNT(*) as count FROM comments WHERE created_at > ?')
      .bind(since).first(),
    db.prepare('SELECT AVG(score) as avg FROM ratings').first(),
    db.prepare(`
      SELECT b.id, b.title, b.read_count, b.rating_avg, c.display_name as creator_name
      FROM books b
      JOIN creators c ON b.creator_id = c.id
      WHERE b.status = 'published'
      ORDER BY b.read_count DESC
      LIMIT 10
    `).all(),
    db.prepare(`
      SELECT c.id, c.display_name, c.total_books, c.total_reads
      FROM creators c
      ORDER BY c.total_reads DESC
      LIMIT 10
    `).all(),
    db.prepare(`
      SELECT 
        date(created_at, 'unixepoch') as date,
        COUNT(*) as new_users,
        SUM(CASE WHEN role = 'creator' THEN 1 ELSE 0 END) as new_creators
      FROM users
      WHERE created_at > ?
      GROUP BY date(created_at, 'unixepoch')
      ORDER BY date DESC
      LIMIT 30
    `).bind(since).all()
  ])

  return c.json({
    period: { days, since },
    new_users: (newUsers as any)?.count || 0,
    active_readers: (activeReaders as any)?.count || 0,
    total_reads: (totalReads as any)?.total || 0,
    new_books: (newBooks as any)?.count || 0,
    new_comments: (newComments as any)?.count || 0,
    avg_rating: Math.round((avgRating as any)?.avg * 10) / 10 || 0,
    top_books: topBooks.results || [],
    top_creators: topCreators.results || [],
    daily_stats: dailyStats.results || []
  })
})

// GET /api/analytics/books/:bookId - Book analytics
analytics.get('/books/:bookId', async (c) => {
  const db = c.env.DB
  const bookId = c.req.param('bookId')

  const [
    book,
    totalReaders,
    completionRate,
    avgProgress,
    ratings,
    annotations
  ] = await Promise.all([
    db.prepare(`
      SELECT b.*, c.display_name as creator_name
      FROM books b
      JOIN creators c ON b.creator_id = c.id
      WHERE b.id = ?
    `).bind(bookId).first(),
    db.prepare('SELECT COUNT(*) as count FROM reading_progress WHERE book_id = ?')
      .bind(bookId).first(),
    db.prepare(`
      SELECT 
        SUM(CASE WHEN is_finished = 1 THEN 1 ELSE 0 END) as finished,
        COUNT(*) as total
      FROM reading_progress WHERE book_id = ?
    `).bind(bookId).first(),
    db.prepare('SELECT AVG(percent) as avg FROM reading_progress WHERE book_id = ?')
      .bind(bookId).first(),
    db.prepare(`
      SELECT 
        AVG(score) as avg_score,
        COUNT(*) as total_count,
        SUM(CASE WHEN score = 5 THEN 1 ELSE 0 END) as five_star
      FROM ratings WHERE book_id = ?
    `).bind(bookId).first(),
    db.prepare('SELECT COUNT(*) as count FROM annotations WHERE book_id = ?')
      .bind(bookId).first()
  ])

  if (!book) {
    return c.json({ error: 'BOOK_NOT_FOUND' }, 404)
  }

  const completion = (completionRate as any)?.total > 0
    ? Math.round(((completionRate as any)?.finished / (completionRate as any)?.total) * 100)
    : 0

  return c.json({
    book,
    readers: {
      total: (totalReaders as any)?.count || 0,
      completion_rate: completion,
      avg_progress: Math.round((avgProgress as any)?.avg * 10) / 10 || 0
    },
    ratings: {
      avg_score: Math.round((ratings as any)?.avg_score * 10) / 10 || 0,
      total_count: (ratings as any)?.total_count || 0,
      five_star_count: (ratings as any)?.five_star || 0
    },
    annotations: (annotations as any)?.count || 0
  })
})

// GET /api/analytics/creator - Creator analytics
analytics.get('/creator', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB

  const creator = await db.prepare('SELECT id FROM creators WHERE user_id = ?')
    .bind(user.userId).first()

  if (!creator) {
    return c.json({ error: 'NOT_A_CREATOR' }, 403)
  }

  const creatorId = (creator as any).id

  const [
    totalBooks,
    totalReads,
    totalRevenue,
    bookStats,
    readerGrowth
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM books WHERE creator_id = ?')
      .bind(creatorId).first(),
    db.prepare('SELECT SUM(read_count) as total FROM books WHERE creator_id = ?')
      .bind(creatorId).first(),
    db.prepare(`
      SELECT SUM(p.amount) as total
      FROM purchases p
      JOIN books b ON p.book_id = b.id
      WHERE b.creator_id = ? AND p.status = 'completed'
    `).bind(creatorId).first(),
    db.prepare(`
      SELECT 
        b.id, b.title, b.read_count, b.rating_avg, b.rating_count,
        COUNT(DISTINCT rp.user_id) as unique_readers
      FROM books b
      LEFT JOIN reading_progress rp ON b.id = rp.book_id
      WHERE b.creator_id = ?
      GROUP BY b.id
      ORDER BY b.read_count DESC
    `).bind(creatorId).all(),
    db.prepare(`
      SELECT 
        date(rp.updated_at, 'unixepoch') as date,
        COUNT(DISTINCT rp.user_id) as readers
      FROM reading_progress rp
      JOIN books b ON rp.book_id = b.id
      WHERE b.creator_id = ?
      GROUP BY date(rp.updated_at, 'unixepoch')
      ORDER BY date DESC
      LIMIT 30
    `).bind(creatorId).all()
  ])

  return c.json({
    total_books: (totalBooks as any)?.count || 0,
    total_reads: (totalReads as any)?.total || 0,
    total_revenue: (totalRevenue as any)?.total || 0,
    book_stats: bookStats.results || [],
    reader_growth: readerGrowth.results || []
  })
})

export default analytics
