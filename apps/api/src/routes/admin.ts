import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import type { Env, AuthedUser } from '../index'

const admin = new Hono<{ Bindings: Env; Variables: { user: AuthedUser; jwtPayload: AuthedUser } }>()

admin.use('*', requireAuth)
admin.use('*', async (c, next) => {
  const user = c.get('user')
  const db = c.env.DB
  const row = await db.prepare('SELECT role FROM users WHERE id = ?')
    .bind(user.userId).first()
  if (!row || (row as { role?: string }).role !== 'admin') {
    return c.json({ error: 'FORBIDDEN' }, 403)
  }
  await next()
})

// GET /api/admin/dashboard - Dashboard stats
admin.get('/dashboard', async (c) => {
  const db = c.env.DB

  const [
    userCount,
    bookCount,
    chapterCount,
    commentCount,
    readingCount,
    purchaseCount,
    recentUsers,
    recentBooks,
    recentActivities
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM users').first(),
    db.prepare('SELECT COUNT(*) as count FROM books').first(),
    db.prepare('SELECT COUNT(*) as count FROM chapters').first(),
    db.prepare('SELECT COUNT(*) as count FROM comments WHERE is_deleted = 0').first(),
    db.prepare('SELECT COUNT(*) as count FROM reading_progress').first(),
    db.prepare('SELECT COUNT(*) as count FROM purchases WHERE status = ?').bind('completed').first(),
    db.prepare(`
      SELECT id, username, display_name, role, created_at 
      FROM users ORDER BY created_at DESC LIMIT 10
    `).all(),
    db.prepare(`
      SELECT b.id, b.title, b.status, b.created_at, c.display_name as creator_name
      FROM books b
      JOIN creators c ON b.creator_id = c.id
      ORDER BY b.created_at DESC LIMIT 10
    `).all(),
    db.prepare(`
      SELECT a.*, u.username
      FROM activities a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC LIMIT 20
    `).all()
  ])

  return c.json({
    stats: {
      total_users: (userCount as { count?: number })?.count || 0,
      total_books: (bookCount as { count?: number })?.count || 0,
      total_chapters: (chapterCount as { count?: number })?.count || 0,
      total_comments: (commentCount as { count?: number })?.count || 0,
      total_reading_sessions: (readingCount as { count?: number })?.count || 0,
      total_purchases: (purchaseCount as { count?: number })?.count || 0
    },
    recent_users: recentUsers.results || [],
    recent_books: recentBooks.results || [],
    recent_activities: recentActivities.results || []
  })
})

// GET /api/admin/users - List all users
admin.get('/users', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
  const offset = (page - 1) * limit
  const role = c.req.query('role')

  let query = 'SELECT id, username, email, display_name, role, wallet_address_v2, created_at FROM users WHERE 1=1'
  const params: (string | number)[] = []

  if (role) {
    query += ' AND role = ?'
    params.push(role)
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const results = await db.prepare(query).bind(...params).all()
  const total = await db.prepare('SELECT COUNT(*) as count FROM users').first()

  return c.json({
    items: results.results || [],
    total: (total as { count?: number })?.count || 0,
    page,
    limit
  })
})

// POST /api/admin/users/:id/role - Update user role
admin.post('/users/:id/role', async (c) => {
  const db = c.env.DB
  const userId = c.req.param('id')
  const { role } = await c.req.json()

  if (!['reader', 'creator', 'admin'].includes(role)) {
    return c.json({ error: 'INVALID_ROLE' }, 400)
  }

  await db.prepare('UPDATE users SET role = ? WHERE id = ?')
    .bind(role, userId).run()

  return c.json({ success: true })
})

// GET /api/admin/books - List all books
admin.get('/books', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
  const offset = (page - 1) * limit
  const status = c.req.query('status')

  let query = `
    SELECT b.*, c.display_name as creator_name
    FROM books b
    JOIN creators c ON b.creator_id = c.id
    WHERE 1=1
  `
  const params: (string | number)[] = []

  if (status) {
    query += ' AND b.status = ?'
    params.push(status)
  }

  query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const results = await db.prepare(query).bind(...params).all()
  const total = await db.prepare('SELECT COUNT(*) as count FROM books').first()

  return c.json({
    items: results.results || [],
    total: (total as { count?: number })?.count || 0,
    page,
    limit
  })
})

// POST /api/admin/books/:id/status - Update book status
admin.post('/books/:id/status', async (c) => {
  const db = c.env.DB
  const bookId = c.req.param('id')
  const { status } = await c.req.json()

  if (!['draft', 'published', 'archived'].includes(status)) {
    return c.json({ error: 'INVALID_STATUS' }, 400)
  }

  await db.prepare('UPDATE books SET status = ? WHERE id = ?')
    .bind(status, bookId).run()

  return c.json({ success: true })
})

// GET /api/admin/comments - List all comments
admin.get('/comments', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
  const offset = (page - 1) * limit

  const results = await db.prepare(`
    SELECT c.*, u.username, b.title as book_title
    FROM comments c
    JOIN users u ON c.user_id = u.id
    JOIN books b ON c.book_id = b.id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all()

  return c.json({ items: results.results || [] })
})

// DELETE /api/admin/comments/:id - Delete comment
admin.delete('/comments/:id', async (c) => {
  const db = c.env.DB
  const commentId = c.req.param('id')

  await db.prepare('UPDATE comments SET is_deleted = 1 WHERE id = ?')
    .bind(commentId).run()

  return c.json({ success: true })
})

// GET /api/admin/audit-logs - View audit logs
admin.get('/audit-logs', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
  const offset = (page - 1) * limit

  const results = await db.prepare(`
    SELECT al.*, u.username
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all()

  return c.json({ items: results.results || [] })
})

// GET /api/admin/storage-cost - Current month storage cost totals (admin only)
admin.get('/storage-cost', async (c) => {
  const { getMonthlyTotals } = await import('../lib/cost-monitor')
  const totals = await getMonthlyTotals(c.env)
  return c.json(totals)
})

export default admin
