import { Hono } from 'hono'
import type { Env } from '../index'
import { verifyToken } from '../lib/jwt'

const voiceRoutes = new Hono<{ Bindings: Env }>()

// Middleware: require auth
voiceRoutes.use('*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = auth.slice(7)
  const payload = await verifyToken(token, c.env.JWT_SECRET)
  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401)
  }
  c.set('jwtPayload' as never, payload)
  await next()
})

// GET /api/voice/rooms — list voice rooms
voiceRoutes.get('/rooms', async (c) => {
  const bookId = c.req.query('book_id')
  const status = c.req.query('status') || 'live'
  const db = c.env.DB

  let sql = `SELECT r.*, u.username as host_name, u.display_name as host_display_name,
             (SELECT COUNT(*) FROM voice_room_participants WHERE room_id = r.id AND left_at IS NULL) as participant_count
             FROM voice_rooms r
             JOIN users u ON r.host_id = u.id
             WHERE r.status = ?`
  const params: (string | number)[] = [status]

  if (bookId) {
    sql += ' AND r.book_id = ?'
    params.push(bookId)
  }

  sql += ' ORDER BY r.scheduled_at DESC LIMIT 50'

  const { results } = await db.prepare(sql).bind(...params).all()

  return c.json({ items: results || [] })
})

// POST /api/voice/rooms — create a voice room
voiceRoutes.post('/rooms', async (c) => {
  const payload = c.get('jwtPayload' as never) as { userId: string }
  const body = await c.req.json()
  const { book_id, chapter_id, title, description, scheduled_at } = body

  if (!book_id || !title) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  const db = c.env.DB
  const now = Math.floor(Date.now() / 1000)
  const id = crypto.randomUUID()

  await db
    .prepare(
      `INSERT INTO voice_rooms (id, book_id, chapter_id, title, description, host_id, status, scheduled_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, book_id, chapter_id || null, title, description || null, payload.userId, 'scheduled', scheduled_at || now, now, now)
    .run()

  // Add host as participant
  await db
    .prepare(
      `INSERT INTO voice_room_participants (id, room_id, user_id, role, joined_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), id, payload.userId, 'host', now)
    .run()

  return c.json({ id, title, status: 'scheduled' }, 201)
})

// GET /api/voice/rooms/:id — get room details
voiceRoutes.get('/rooms/:id', async (c) => {
  const roomId = c.req.param('id')
  const db = c.env.DB

  const room = await db
    .prepare(
      `SELECT r.*, u.username as host_name, u.display_name as host_display_name
       FROM voice_rooms r
       JOIN users u ON r.host_id = u.id
       WHERE r.id = ?`
    )
    .bind(roomId)
    .first()

  if (!room) {
    return c.json({ error: 'Room not found' }, 404)
  }

  // Get participants
  const { results: participants } = await db
    .prepare(
      `SELECT p.*, u.username, u.display_name, u.avatar_cid
       FROM voice_room_participants p
       JOIN users u ON p.user_id = u.id
       WHERE p.room_id = ? AND p.left_at IS NULL
       ORDER BY p.joined_at`
    )
    .bind(roomId)
    .all()

  // Get recent messages
  const { results: messages } = await db
    .prepare(
      `SELECT m.*, u.username, u.display_name
       FROM voice_room_messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.room_id = ?
       ORDER BY m.created_at DESC
       LIMIT 50`
    )
    .bind(roomId)
    .all()

  return c.json({
    room,
    participants: participants || [],
    messages: (messages || []).reverse(),
  })
})

// POST /api/voice/rooms/:id/join — join a room
voiceRoutes.post('/rooms/:id/join', async (c) => {
  const payload = c.get('jwtPayload' as never) as { userId: string }
  const roomId = c.req.param('id')
  const db = c.env.DB
  const now = Math.floor(Date.now() / 1000)

  // Check if already in room
  const existing = await db
    .prepare('SELECT * FROM voice_room_participants WHERE room_id = ? AND user_id = ?')
    .bind(roomId, payload.userId)
    .first()

  if (existing) {
    // Rejoin
    await db
      .prepare('UPDATE voice_room_participants SET left_at = NULL WHERE id = ?')
      .bind(existing.id)
      .run()
    return c.json({ success: true, role: existing.role })
  }

  await db
    .prepare(
      `INSERT INTO voice_room_participants (id, room_id, user_id, role, joined_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), roomId, payload.userId, 'listener', now)
    .run()

  // Add system message
  await db
    .prepare(
      `INSERT INTO voice_room_messages (id, room_id, user_id, content, message_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), roomId, payload.userId, 'joined the circle', 'system', now)
    .run()

  return c.json({ success: true, role: 'listener' })
})

// POST /api/voice/rooms/:id/leave — leave a room
voiceRoutes.post('/rooms/:id/leave', async (c) => {
  const payload = c.get('jwtPayload' as never) as { userId: string }
  const roomId = c.req.param('id')
  const db = c.env.DB
  const now = Math.floor(Date.now() / 1000)

  await db
    .prepare('UPDATE voice_room_participants SET left_at = ? WHERE room_id = ? AND user_id = ?')
    .bind(now, roomId, payload.userId)
    .run()

  return c.json({ success: true })
})

// POST /api/voice/rooms/:id/request-mic — request to speak
voiceRoutes.post('/rooms/:id/request-mic', async (c) => {
  const payload = c.get('jwtPayload' as never) as { userId: string }
  const roomId = c.req.param('id')
  const db = c.env.DB

  await db
    .prepare('UPDATE voice_room_participants SET role = ? WHERE room_id = ? AND user_id = ?')
    .bind('speaker', roomId, payload.userId)
    .run()

  return c.json({ success: true, role: 'speaker' })
})

// POST /api/voice/rooms/:id/messages — send a message
voiceRoutes.post('/rooms/:id/messages', async (c) => {
  const payload = c.get('jwtPayload' as never) as { userId: string }
  const roomId = c.req.param('id')
  const body = await c.req.json()
  const { content, message_type = 'text' } = body

  if (!content) {
    return c.json({ error: 'Content required' }, 400)
  }

  const db = c.env.DB
  const now = Math.floor(Date.now() / 1000)
  const id = crypto.randomUUID()

  await db
    .prepare(
      `INSERT INTO voice_room_messages (id, room_id, user_id, content, message_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, roomId, payload.userId, content, message_type, now)
    .run()

  return c.json({ id, content, created_at: now }, 201)
})

// POST /api/voice/rooms/:id/start — start the room (host only)
voiceRoutes.post('/rooms/:id/start', async (c) => {
  const payload = c.get('jwtPayload' as never) as { userId: string }
  const roomId = c.req.param('id')
  const db = c.env.DB
  const now = Math.floor(Date.now() / 1000)

  const room = await db.prepare('SELECT * FROM voice_rooms WHERE id = ?').bind(roomId).first()
  if (!room) return c.json({ error: 'Room not found' }, 404)
  if (room.host_id !== payload.userId) return c.json({ error: 'Only host can start' }, 403)

  await db
    .prepare('UPDATE voice_rooms SET status = ?, started_at = ?, updated_at = ? WHERE id = ?')
    .bind('live', now, now, roomId)
    .run()

  return c.json({ success: true, status: 'live' })
})

// POST /api/voice/rooms/:id/end — end the room (host only)
voiceRoutes.post('/rooms/:id/end', async (c) => {
  const payload = c.get('jwtPayload' as never) as { userId: string }
  const roomId = c.req.param('id')
  const db = c.env.DB
  const now = Math.floor(Date.now() / 1000)

  const room = await db.prepare('SELECT * FROM voice_rooms WHERE id = ?').bind(roomId).first()
  if (!room) return c.json({ error: 'Room not found' }, 404)
  if (room.host_id !== payload.userId) return c.json({ error: 'Only host can end' }, 403)

  await db
    .prepare('UPDATE voice_rooms SET status = ?, ended_at = ?, updated_at = ? WHERE id = ?')
    .bind('ended', now, now, roomId)
    .run()

  // Mark all participants as left
  await db
    .prepare('UPDATE voice_room_participants SET left_at = ? WHERE room_id = ? AND left_at IS NULL')
    .bind(now, roomId)
    .run()

  return c.json({ success: true, status: 'ended' })
})

export default voiceRoutes
