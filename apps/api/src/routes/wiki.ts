import { Hono } from 'hono'
import type { Env } from '../index'
import { verifyToken } from '../lib/jwt'

const wikiRoutes = new Hono<{ Bindings: Env }>()

// Optional auth middleware
async function optionalAuth(c: any, next: any) {
  const auth = c.req.header('Authorization')
  if (auth?.startsWith('Bearer ')) {
    const payload = await verifyToken(auth.slice(7), c.env)
    if (payload) c.set('jwtPayload' as never, payload)
  }
  await next()
}

// GET /api/wiki/books/:bookId/entries — list wiki entries for a book
wikiRoutes.get('/books/:bookId/entries', optionalAuth, async (c) => {
  const bookId = c.req.param('bookId')
  const category = c.req.query('category')
  const db = c.env.DB

  let sql = 'SELECT * FROM wiki_entries WHERE book_id = ? AND status = ?'
  const params: (string | number)[] = [bookId, 'active']

  if (category) {
    sql += ' AND category = ?'
    params.push(category)
  }

  sql += ' ORDER BY category, title'

  const { results } = await db.prepare(sql).bind(...params).all()

  return c.json({ items: results || [] })
})

// GET /api/wiki/books/:bookId/entries/:slug — get single entry
wikiRoutes.get('/books/:bookId/entries/:slug', optionalAuth, async (c) => {
  const bookId = c.req.param('bookId')
  const slug = c.req.param('slug')
  const db = c.env.DB

  const entry = await db
    .prepare('SELECT * FROM wiki_entries WHERE book_id = ? AND slug = ? AND status = ?')
    .bind(bookId, slug, 'active')
    .first()

  if (!entry) {
    return c.json({ error: 'Entry not found' }, 404)
  }

  // Get relations
  const { results: relations } = await db
    .prepare(
      `SELECT r.*, e.title as to_title, e.slug as to_slug, e.category as to_category
       FROM wiki_relations r
       JOIN wiki_entries e ON r.to_entry_id = e.id
       WHERE r.from_entry_id = ?`
    )
    .bind(entry.id)
    .all()

  // Get appearances
  const { results: appearances } = await db
    .prepare(
      `SELECT a.*, c.title as chapter_title, c.idx as chapter_idx
       FROM wiki_appearances a
       JOIN chapters c ON a.chapter_id = c.id
       WHERE a.entry_id = ?
       ORDER BY c.idx, a.paragraph_idx`
    )
    .bind(entry.id)
    .all()

  // Get revisions
  const { results: revisions } = await db
    .prepare('SELECT * FROM wiki_revisions WHERE entry_id = ? ORDER BY version DESC LIMIT 10')
    .bind(entry.id)
    .all()

  return c.json({
    entry,
    relations: relations || [],
    appearances: appearances || [],
    revisions: revisions || [],
  })
})

// POST /api/wiki/books/:bookId/entries — create entry (auth required)
wikiRoutes.post('/books/:bookId/entries', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const payload = await verifyToken(auth.slice(7), c.env)
  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401)
  }

  const bookId = c.req.param('bookId')
  const body = await c.req.json()
  const { slug, title, title_zh, category, content, summary } = body

  if (!slug || !title || !category || !content) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  const db = c.env.DB
  const now = Math.floor(Date.now() / 1000)
  const id = crypto.randomUUID()

  try {
    await db
      .prepare(
        `INSERT INTO wiki_entries (
          id, book_id, slug, title, title_zh, category, content, summary,
          ai_generated, created_by, version, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id, bookId, slug, title, title_zh || null, category, content, summary || null,
        0, payload.userId, 1, 'active', now, now
      )
      .run()

    // Create initial revision
    await db
      .prepare(
        `INSERT INTO wiki_revisions (id, entry_id, user_id, content, summary, version, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(crypto.randomUUID(), id, payload.userId, content, 'Initial version', 1, now)
      .run()

    return c.json({ id, slug, title }, 201)
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Slug already exists for this book' }, 409)
    }
    throw err
  }
})

// PUT /api/wiki/books/:bookId/entries/:slug — update entry
wikiRoutes.put('/books/:bookId/entries/:slug', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const payload = await verifyToken(auth.slice(7), c.env)
  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401)
  }

  const bookId = c.req.param('bookId')
  const slug = c.req.param('slug')
  const body = await c.req.json()
  const { title, title_zh, content, summary } = body

  const db = c.env.DB
  const now = Math.floor(Date.now() / 1000)

  // Get current entry
  const entry = await db
    .prepare('SELECT * FROM wiki_entries WHERE book_id = ? AND slug = ?')
    .bind(bookId, slug)
    .first()

  if (!entry) {
    return c.json({ error: 'Entry not found' }, 404)
  }

  const newVersion = (entry.version as number) + 1

  await db
    .prepare(
      `UPDATE wiki_entries SET
        title = COALESCE(?, title),
        title_zh = COALESCE(?, title_zh),
        content = COALESCE(?, content),
        summary = COALESCE(?, summary),
        version = ?,
        updated_at = ?
      WHERE id = ?`
    )
    .bind(title, title_zh, content, summary, newVersion, now, entry.id)
    .run()

  // Create revision
  await db
    .prepare(
      `INSERT INTO wiki_revisions (id, entry_id, user_id, content, summary, version, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      entry.id,
      payload.userId,
      content || entry.content,
      body.change_summary || 'Updated',
      newVersion,
      now
    )
    .run()

  return c.json({ success: true, version: newVersion })
})

// POST /api/wiki/books/:bookId/relations — create relation
wikiRoutes.post('/books/:bookId/relations', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const payload = await verifyToken(auth.slice(7), c.env)
  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401)
  }

  const bookId = c.req.param('bookId')
  const body = await c.req.json()
  const { from_entry_id, to_entry_id, relation_type, context } = body

  if (!from_entry_id || !to_entry_id || !relation_type) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  const db = c.env.DB
  const now = Math.floor(Date.now() / 1000)

  try {
    await db
      .prepare(
        `INSERT INTO wiki_relations (id, book_id, from_entry_id, to_entry_id, relation_type, context, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(crypto.randomUUID(), bookId, from_entry_id, to_entry_id, relation_type, context || null, now)
      .run()

    return c.json({ success: true }, 201)
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Relation already exists' }, 409)
    }
    throw err
  }
})

// GET /api/wiki/books/:bookId/graph — get knowledge graph
wikiRoutes.get('/books/:bookId/graph', optionalAuth, async (c) => {
  const bookId = c.req.param('bookId')
  const db = c.env.DB

  const { results: entries } = await db
    .prepare('SELECT id, slug, title, category FROM wiki_entries WHERE book_id = ? AND status = ?')
    .bind(bookId, 'active')
    .all()

  const { results: relations } = await db
    .prepare(
      `SELECT r.from_entry_id, r.to_entry_id, r.relation_type,
              fe.title as from_title, te.title as to_title
       FROM wiki_relations r
       JOIN wiki_entries fe ON r.from_entry_id = fe.id
       JOIN wiki_entries te ON r.to_entry_id = te.id
       WHERE r.book_id = ?`
    )
    .bind(bookId)
    .all()

  return c.json({
    nodes: entries || [],
    edges: relations || [],
  })
})

// GET /api/wiki/books/:bookId/timeline — get timeline entries
wikiRoutes.get('/books/:bookId/timeline', optionalAuth, async (c) => {
  const bookId = c.req.param('bookId')
  const db = c.env.DB

  const { results } = await db
    .prepare(
      `SELECT * FROM wiki_entries
       WHERE book_id = ? AND category = ? AND status = ?
       ORDER BY title`
    )
    .bind(bookId, 'timeline', 'active')
    .all()

  return c.json({ items: results || [] })
})

// GET /api/wiki/search — search wiki entries
wikiRoutes.get('/search', optionalAuth, async (c) => {
  const q = c.req.query('q')
  const bookId = c.req.query('book_id')
  const db = c.env.DB

  if (!q) {
    return c.json({ items: [] })
  }

  let sql = `SELECT * FROM wiki_entries WHERE status = ? AND (title LIKE ? OR content LIKE ? OR title_zh LIKE ?)`
  const params: (string | number)[] = ['active', `%${q}%`, `%${q}%`, `%${q}%`]

  if (bookId) {
    sql += ' AND book_id = ?'
    params.push(bookId)
  }

  sql += ' ORDER BY title LIMIT 20'

  const { results } = await db.prepare(sql).bind(...params).all()

  return c.json({ items: results || [], query: q })
})

export default wikiRoutes
