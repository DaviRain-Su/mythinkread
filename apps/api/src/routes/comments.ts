import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { moderateContent } from '../lib/ai'
import type { Env } from '../index'

const comments = new Hono<{ Bindings: Env }>()

// Auth middleware
comments.use('*', async (c, next) => {
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

const commentSchema = z.object({
  book_id: z.string().min(1),
  chapter_id: z.string().optional(),
  parent_id: z.string().optional(),
  content: z.string().min(1).max(2000)
})

// POST /api/comments - Create comment
comments.post('/', zValidator('json', commentSchema), async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string; username: string }
  const db = c.env.DB
  const { book_id, chapter_id, parent_id, content } = c.req.valid('json')

  // AI content moderation
  const moderation = await moderateContent(c.env, content)
  if (!moderation.safe) {
    return c.json({ error: 'CONTENT_VIOLATION', reason: moderation.reason }, 400)
  }

  // Verify book exists
  const book = await db.prepare('SELECT id FROM books WHERE id = ?').bind(book_id).first()
  if (!book) {
    return c.json({ error: 'BOOK_NOT_FOUND' }, 404)
  }

  // Verify chapter if provided
  if (chapter_id) {
    const chapter = await db.prepare('SELECT id FROM chapters WHERE id = ? AND book_id = ?')
      .bind(chapter_id, book_id).first()
    if (!chapter) {
      return c.json({ error: 'CHAPTER_NOT_FOUND' }, 404)
    }
  }

  // Verify parent comment if provided
  if (parent_id) {
    const parent = await db.prepare('SELECT id FROM comments WHERE id = ?').bind(parent_id).first()
    if (!parent) {
      return c.json({ error: 'PARENT_COMMENT_NOT_FOUND' }, 404)
    }
  }

  const commentId = generateUUID()
  const now = Math.floor(Date.now() / 1000)

  await db.prepare(`
    INSERT INTO comments (id, user_id, book_id, chapter_id, parent_id, content, likes, is_deleted, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(commentId, user.userId, book_id, chapter_id || null, parent_id || null, content, 0, 0, now).run()

  return c.json({
    id: commentId,
    user_id: user.userId,
    username: user.username,
    content,
    likes: 0,
    created_at: now
  }, 201)
})

// GET /api/comments - List comments
comments.get('/', async (c) => {
  const db = c.env.DB
  const bookId = c.req.query('book_id')
  const chapterId = c.req.query('chapter_id')

  if (!bookId) {
    return c.json({ error: 'BOOK_ID_REQUIRED' }, 400)
  }

  let query = `
    SELECT c.*, u.username, u.display_name
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.book_id = ? AND c.is_deleted = 0
  `
  const params: (string | number)[] = [bookId]

  if (chapterId) {
    query += ' AND c.chapter_id = ?'
    params.push(chapterId)
  } else {
    query += ' AND c.chapter_id IS NULL'
  }

  query += ' ORDER BY c.created_at DESC LIMIT 50'

  const results = await db.prepare(query).bind(...params).all()

  return c.json({
    items: results.results || []
  })
})

// POST /api/comments/:id/like - Like comment
comments.post('/:id/like', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const commentId = c.req.param('id')

  const comment = await db.prepare('SELECT id FROM comments WHERE id = ?').bind(commentId).first()
  if (!comment) {
    return c.json({ error: 'COMMENT_NOT_FOUND' }, 404)
  }

  await db.prepare(`
    UPDATE comments SET likes = likes + 1 WHERE id = ?
  `).bind(commentId).run()

  return c.json({ success: true })
})

// DELETE /api/comments/:id - Soft delete comment
comments.delete('/:id', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const commentId = c.req.param('id')

  const comment = await db.prepare('SELECT user_id FROM comments WHERE id = ?').bind(commentId).first()
  if (!comment) {
    return c.json({ error: 'COMMENT_NOT_FOUND' }, 404)
  }

  if (comment.user_id !== user.userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 403)
  }

  await db.prepare('UPDATE comments SET is_deleted = 1 WHERE id = ?').bind(commentId).run()

  return c.json({ success: true })
})

export default comments
