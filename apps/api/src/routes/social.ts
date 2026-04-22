import { Hono } from 'hono'
import type { Env } from '../index'

const social = new Hono<{ Bindings: Env }>()

// Auth middleware
social.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const { verifyToken } = await import('../lib/jwt')
    const payload = await verifyToken(token, c.env)
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

// POST /api/social/follow/:userId - Follow a user
social.post('/follow/:userId', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const targetUserId = c.req.param('userId')

  if (user.userId === targetUserId) {
    return c.json({ error: 'CANNOT_FOLLOW_SELF' }, 400)
  }

  // Check target user exists
  const targetUser = await db.prepare('SELECT id FROM users WHERE id = ?')
    .bind(targetUserId).first()
  if (!targetUser) {
    return c.json({ error: 'USER_NOT_FOUND' }, 404)
  }

  const now = Math.floor(Date.now() / 1000)

  try {
    await db.prepare(`
      INSERT INTO follows (id, follower_id, following_id, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(generateUUID(), user.userId, targetUserId, now).run()

    // Create activity
    await db.prepare(`
      INSERT INTO activities (id, user_id, type, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(generateUUID(), user.userId, 'follow', targetUserId, now).run()

    return c.json({ success: true })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'ALREADY_FOLLOWING' }, 409)
    }
    throw err
  }
})

// DELETE /api/social/follow/:userId - Unfollow a user
social.delete('/follow/:userId', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const targetUserId = c.req.param('userId')

  await db.prepare(`
    DELETE FROM follows WHERE follower_id = ? AND following_id = ?
  `).bind(user.userId, targetUserId).run()

  return c.json({ success: true })
})

// GET /api/social/following - List following
social.get('/following', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB

  const results = await db.prepare(`
    SELECT u.id, u.username, u.display_name, f.created_at
    FROM follows f
    JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ?
    ORDER BY f.created_at DESC
  `).bind(user.userId).all()

  return c.json({ items: results.results || [] })
})

// GET /api/social/followers - List followers
social.get('/followers', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB

  const results = await db.prepare(`
    SELECT u.id, u.username, u.display_name, f.created_at
    FROM follows f
    JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = ?
    ORDER BY f.created_at DESC
  `).bind(user.userId).all()

  return c.json({ items: results.results || [] })
})

// GET /api/social/feed - Activity feed
social.get('/feed', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit

  // Get activities from followed users
  const results = await db.prepare(`
    SELECT a.*, u.username, u.display_name,
           b.title as book_title
    FROM activities a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN books b ON a.book_id = b.id
    WHERE a.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = ?
    ) OR a.user_id = ?
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(user.userId, user.userId, limit, offset).all()

  return c.json({ items: results.results || [] })
})

// POST /api/social/activities - Create activity (internal use)
social.post('/activities', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const { type, book_id, content } = await c.req.json()

  const now = Math.floor(Date.now() / 1000)
  const activityId = generateUUID()

  await db.prepare(`
    INSERT INTO activities (id, user_id, type, book_id, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(activityId, user.userId, type, book_id || null, content || null, now).run()

  return c.json({ id: activityId }, 201)
})

export default social
