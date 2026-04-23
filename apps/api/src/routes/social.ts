import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { generateUUID } from '../lib/uuid'
import type { Env, AuthedUser } from '../index'

const social = new Hono<{ Bindings: Env; Variables: { user: AuthedUser; jwtPayload: AuthedUser } }>()

social.use('*', requireAuth)

// POST /api/social/follow/:userId - Follow a user
social.post('/follow/:userId', async (c) => {
  const user = c.get('user')
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
  const user = c.get('user')
  const db = c.env.DB
  const targetUserId = c.req.param('userId')

  await db.prepare(`
    DELETE FROM follows WHERE follower_id = ? AND following_id = ?
  `).bind(user.userId, targetUserId).run()

  return c.json({ success: true })
})

// GET /api/social/following - List following
social.get('/following', async (c) => {
  const user = c.get('user')
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
  const user = c.get('user')
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
  const user = c.get('user')
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
  const user = c.get('user')
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
