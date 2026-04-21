import { Hono } from 'hono'
import type { Env } from '../index'

const publicDomain = new Hono<{ Bindings: Env }>()

// GET /api/public-domain/books - List public domain books
publicDomain.get('/books', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit
  const category = c.req.query('category')
  const language = c.req.query('language') || 'zh'

  let query = `
    SELECT * FROM public_domain_books
    WHERE status = 'published' AND language = ?
  `
  const params: (string | number)[] = [language]

  if (category) {
    query += ' AND category = ?'
    params.push(category)
  }

  query += ' ORDER BY published_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const results = await db.prepare(query).bind(...params).all()

  const categories = await db.prepare(`
    SELECT DISTINCT category, COUNT(*) as count
    FROM public_domain_books
    WHERE status = 'published' AND language = ?
    GROUP BY category
  `).bind(language).all()

  return c.json({
    items: results.results || [],
    categories: categories.results || []
  })
})

// GET /api/public-domain/books/:id - Get public domain book
publicDomain.get('/books/:id', async (c) => {
  const db = c.env.DB
  const bookId = c.req.param('id')

  const book = await db.prepare(`
    SELECT * FROM public_domain_books WHERE id = ?
  `).bind(bookId).first()

  if (!book) {
    return c.json({ error: 'BOOK_NOT_FOUND' }, 404)
  }

  const chapters = await db.prepare(`
    SELECT id, idx, title, word_count FROM public_domain_chapters
    WHERE book_id = ? ORDER BY idx
  `).bind(bookId).all()

  return c.json({
    ...book,
    chapters: chapters.results || []
  })
})

// GET /api/public-domain/books/:id/read/:chapterId - Read chapter
publicDomain.get('/books/:id/read/:chapterId', async (c) => {
  const db = c.env.DB
  const bookId = c.req.param('id')
  const chapterId = c.req.param('chapterId')

  const chapter = await db.prepare(`
    SELECT * FROM public_domain_chapters WHERE id = ? AND book_id = ?
  `).bind(chapterId, bookId).first()

  if (!chapter) {
    return c.json({ error: 'CHAPTER_NOT_FOUND' }, 404)
  }

  // Fetch content from KV/IPFS
  let content = ''
  try {
    const contentCid = (chapter as any).content_cid
    if (contentCid) {
      content = await c.env.KV.get(`pd:${contentCid}`) || ''
    }
  } catch {
    content = ''
  }

  return c.json({
    chapter: {
      ...chapter,
      content
    }
  })
})

// POST /api/public-domain/import - Import a public domain book (admin only)
publicDomain.post('/import', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const { verifyToken } = await import('../lib/jwt')
    const payload = await verifyToken(token)
    
    const db = c.env.DB
    const user = await db.prepare('SELECT role FROM users WHERE id = ?')
      .bind(payload.userId).first()
    
    if (!user || (user as any).role !== 'admin') {
      return c.json({ error: 'FORBIDDEN' }, 403)
    }

    const { title, author, description, content, source, source_url, language, publish_year, category, tags } = await c.req.json()

    const now = Math.floor(Date.now() / 1000)
    const bookId = `pd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // Store content in KV
    const contentKey = `pd:${bookId}`
    await c.env.KV.put(contentKey, content)

    // Calculate word count
    const wordCount = content.length

    await db.prepare(`
      INSERT INTO public_domain_books (id, title, author, description, content_cid, source, source_url, language, publish_year, category, tags, word_count, imported_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(bookId, title, author, description, contentKey, source, source_url, language, publish_year, category, tags ? JSON.stringify(tags) : null, wordCount, now).run()

    return c.json({ id: bookId, title, status: 'imported' }, 201)
  } catch {
    return c.json({ error: 'INVALID_TOKEN' }, 401)
  }
})

// GET /api/public-domain/sources - List available sources
publicDomain.get('/sources', async (c) => {
  return c.json({
    sources: [
      { id: 'gutenberg', name: 'Project Gutenberg', url: 'https://www.gutenberg.org', languages: ['en', 'zh'] },
      { id: 'wikisource', name: 'Wikisource', url: 'https://zh.wikisource.org', languages: ['zh'] },
      { id: 'ctext', name: 'Chinese Text Project', url: 'https://ctext.org', languages: ['zh', 'en'] },
      { id: 'shuge', name: '书格', url: 'https://www.shuge.org', languages: ['zh'] }
    ]
  })
})

export default publicDomain
