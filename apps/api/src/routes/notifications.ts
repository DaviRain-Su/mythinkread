import { Hono } from 'hono'
import type { Env } from '../index'

const notifications = new Hono<{ Bindings: Env }>()

// Auth middleware
notifications.use('*', async (c, next) => {
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

// GET /api/notifications - List notifications
notifications.get('/', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit
  const unreadOnly = c.req.query('unread') === 'true'

  let query = `
    SELECT * FROM notifications
    WHERE user_id = ?
  `
  const params: (string | number)[] = [user.userId]

  if (unreadOnly) {
    query += ' AND is_read = 0'
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const results = await db.prepare(query).bind(...params).all()

  // Get unread count
  const unreadCount = await db.prepare(`
    SELECT COUNT(*) as count FROM notifications
    WHERE user_id = ? AND is_read = 0
  `).bind(user.userId).first()

  return c.json({
    items: results.results || [],
    unread_count: unreadCount?.count as number || 0
  })
})

// POST /api/notifications/:id/read - Mark as read
notifications.post('/:id/read', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const notificationId = c.req.param('id')

  await db.prepare(`
    UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?
  `).bind(notificationId, user.userId).run()

  return c.json({ success: true })
})

// POST /api/notifications/read-all - Mark all as read
notifications.post('/read-all', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB

  await db.prepare(`
    UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0
  `).bind(user.userId).run()

  return c.json({ success: true })
})

// DELETE /api/notifications/:id - Delete notification
notifications.delete('/:id', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const notificationId = c.req.param('id')

  await db.prepare(`
    DELETE FROM notifications WHERE id = ? AND user_id = ?
  `).bind(notificationId, user.userId).run()

  return c.json({ success: true })
})

export default notifications
