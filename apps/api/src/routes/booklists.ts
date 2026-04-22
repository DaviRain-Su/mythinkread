import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env } from '../index'

const booklists = new Hono<{ Bindings: Env }>()

// Auth middleware
booklists.use('*', async (c, next) => {
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

const booklistSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  is_public: z.boolean().default(true)
})

// POST /api/booklists - Create booklist
booklists.post('/', zValidator('json', booklistSchema), async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const { title, description, tags, is_public } = c.req.valid('json')
  const now = Math.floor(Date.now() / 1000)

  const booklistId = generateUUID()

  await db.prepare(`
    INSERT INTO booklists (id, user_id, title, description, tags, is_public, item_count, likes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(booklistId, user.userId, title, description || null, tags ? JSON.stringify(tags) : null, is_public ? 1 : 0, 0, 0, now).run()

  return c.json({
    id: booklistId,
    title,
    item_count: 0,
    created_at: now
  }, 201)
})

// GET /api/booklists - List booklists
booklists.get('/', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit

  const results = await db.prepare(`
    SELECT b.*, u.username
    FROM booklists b
    JOIN users u ON b.user_id = u.id
    WHERE b.is_public = 1
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all()

  return c.json({
    items: results.results || []
  })
})

// GET /api/booklists/:id - Get booklist details
booklists.get('/:id', async (c) => {
  const db = c.env.DB
  const booklistId = c.req.param('id')

  const booklist = await db.prepare(`
    SELECT b.*, u.username
    FROM booklists b
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ?
  `).bind(booklistId).first()

  if (!booklist) {
    return c.json({ error: 'BOOKLIST_NOT_FOUND' }, 404)
  }

  const items = await db.prepare(`
    SELECT bi.*, bo.title as book_title, bo.author
    FROM booklist_items bi
    JOIN books bo ON bi.book_id = bo.id
    WHERE bi.booklist_id = ?
    ORDER BY bi.idx
  `).bind(booklistId).all()

  return c.json({
    ...booklist,
    items: items.results || []
  })
})

// POST /api/booklists/:id/items - Add book to booklist
booklists.post('/:id/items', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const booklistId = c.req.param('id')
  const { book_id } = await c.req.json()

  // Verify booklist belongs to user
  const booklist = await db.prepare('SELECT user_id FROM booklists WHERE id = ?')
    .bind(booklistId).first()

  if (!booklist) {
    return c.json({ error: 'BOOKLIST_NOT_FOUND' }, 404)
  }

  if (booklist.user_id !== user.userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 403)
  }

  // Verify book exists
  const book = await db.prepare('SELECT id FROM books WHERE id = ?').bind(book_id).first()
  if (!book) {
    return c.json({ error: 'BOOK_NOT_FOUND' }, 404)
  }

  const itemId = generateUUID()
  const now = Math.floor(Date.now() / 1000)

  // Get next index
  const maxIdx = await db.prepare(`
    SELECT MAX(idx) as max_idx FROM booklist_items WHERE booklist_id = ?
  `).bind(booklistId).first()
  const idx = ((maxIdx?.max_idx as number) || -1) + 1

  await db.prepare(`
    INSERT INTO booklist_items (id, booklist_id, book_id, idx, added_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(itemId, booklistId, book_id, idx, now).run()

  // Update item count
  await db.prepare(`
    UPDATE booklists SET item_count = item_count + 1 WHERE id = ?
  `).bind(booklistId).run()

  return c.json({ success: true }, 201)
})

export default booklists
