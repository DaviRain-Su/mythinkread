import { Hono } from 'hono'
import type { Env } from '../index'

const export_ = new Hono<{ Bindings: Env }>()

// Auth middleware
export_.use('*', async (c, next) => {
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

// GET /api/export/reading - Export reading data
export_.get('/reading', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB

  const progress = await db.prepare(`
    SELECT rp.*, b.title as book_title, b.author
    FROM reading_progress rp
    JOIN books b ON rp.book_id = b.id
    WHERE rp.user_id = ?
  `).bind(user.userId).all()

  return c.json({
    user_id: user.userId,
    export_at: Math.floor(Date.now() / 1000),
    reading_progress: progress.results || []
  })
})

// GET /api/export/annotations - Export annotations
export_.get('/annotations', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB

  const annotations = await db.prepare(`
    SELECT a.*, b.title as book_title, c.title as chapter_title
    FROM annotations a
    JOIN books b ON a.book_id = b.id
    JOIN chapters c ON a.chapter_id = c.id
    WHERE a.user_id = ?
  `).bind(user.userId).all()

  return c.json({
    user_id: user.userId,
    export_at: Math.floor(Date.now() / 1000),
    annotations: annotations.results || []
  })
})

// GET /api/export/all - Export all data
export_.get('/all', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB

  const [progress, annotations, comments] = await Promise.all([
    db.prepare(`
      SELECT rp.*, b.title as book_title, b.author
      FROM reading_progress rp
      JOIN books b ON rp.book_id = b.id
      WHERE rp.user_id = ?
    `).bind(user.userId).all(),
    db.prepare(`
      SELECT a.*, b.title as book_title, c.title as chapter_title
      FROM annotations a
      JOIN books b ON a.book_id = b.id
      JOIN chapters c ON a.chapter_id = c.id
      WHERE a.user_id = ?
    `).bind(user.userId).all(),
    db.prepare(`
      SELECT c.*, b.title as book_title
      FROM comments c
      JOIN books b ON c.book_id = b.id
      WHERE c.user_id = ?
    `).bind(user.userId).all()
  ])

  return c.json({
    user_id: user.userId,
    export_at: Math.floor(Date.now() / 1000),
    reading_progress: progress.results || [],
    annotations: annotations.results || [],
    comments: comments.results || []
  })
})

export default export_
