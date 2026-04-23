import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import type { Env, AuthedUser } from '../index'

const annotations = new Hono<{ Bindings: Env; Variables: { user: AuthedUser; jwtPayload: AuthedUser } }>()

annotations.use('*', requireAuth)

import { generateUUID } from '../lib/uuid'

const annotationSchema = z.object({
  book_id: z.string().min(1),
  chapter_id: z.string().min(1),
  range_start: z.number().int().min(0),
  range_end: z.number().int().min(0),
  selected_text: z.string().min(1),
  note: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#FFD700'),
  is_public: z.boolean().default(true)
})

// POST /api/annotations - Create annotation
annotations.post('/', zValidator('json', annotationSchema), async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const { book_id, chapter_id, range_start, range_end, selected_text, note, color, is_public } = c.req.valid('json')

  // Verify chapter exists and belongs to book
  const chapter = await db.prepare('SELECT id FROM chapters WHERE id = ? AND book_id = ?')
    .bind(chapter_id, book_id).first()
  if (!chapter) {
    return c.json({ error: 'CHAPTER_NOT_FOUND' }, 404)
  }

  const annotationId = generateUUID()
  const now = Math.floor(Date.now() / 1000)

  await db.prepare(`
    INSERT INTO annotations (id, user_id, book_id, chapter_id, range_start, range_end, selected_text, note, color, is_public, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(annotationId, user.userId, book_id, chapter_id, range_start, range_end, selected_text, note || null, color, is_public ? 1 : 0, now).run()

  // Create activity
  await db.prepare(`
    INSERT INTO activities (id, user_id, type, book_id, annotation_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(generateUUID(), user.userId, 'annotate', book_id, annotationId, now).run()

  return c.json({
    id: annotationId,
    range_start,
    range_end,
    selected_text,
    note,
    color,
    created_at: now
  }, 201)
})

// GET /api/annotations - List annotations for a chapter
annotations.get('/', async (c) => {
  const db = c.env.DB
  const chapterId = c.req.query('chapter_id')
  const bookId = c.req.query('book_id')

  if (!chapterId || !bookId) {
    return c.json({ error: 'CHAPTER_ID_AND_BOOK_ID_REQUIRED' }, 400)
  }

  const results = await db.prepare(`
    SELECT a.*, u.username
    FROM annotations a
    JOIN users u ON a.user_id = u.id
    WHERE a.chapter_id = ? AND a.book_id = ? AND a.is_public = 1
    ORDER BY a.range_start ASC
  `).bind(chapterId, bookId).all()

  return c.json({ items: results.results || [] })
})

// GET /api/annotations/my - List my annotations
annotations.get('/my', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB

  const results = await db.prepare(`
    SELECT a.*, b.title as book_title, c.title as chapter_title
    FROM annotations a
    JOIN books b ON a.book_id = b.id
    JOIN chapters c ON a.chapter_id = c.id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `).bind(user.userId).all()

  return c.json({ items: results.results || [] })
})

// DELETE /api/annotations/:id - Delete annotation
annotations.delete('/:id', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const annotationId = c.req.param('id')

  const annotation = await db.prepare('SELECT user_id FROM annotations WHERE id = ?')
    .bind(annotationId).first()
  if (!annotation) {
    return c.json({ error: 'ANNOTATION_NOT_FOUND' }, 404)
  }

  if (annotation.user_id !== user.userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 403)
  }

  await db.prepare('DELETE FROM annotations WHERE id = ?').bind(annotationId).run()

  return c.json({ success: true })
})

export default annotations
