import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env, AuthedUser } from '../index'

const books = new Hono<{ Bindings: Env; Variables: { user: AuthedUser; jwtPayload: AuthedUser } }>()

// Auth middleware
books.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const { verifyToken } = await import('../lib/jwt')
    const payload = await verifyToken(token, c.env)
    c.set('user', payload as AuthedUser)
    await next()
  } catch {
    return c.json({ error: 'INVALID_TOKEN' }, 401)
  }
})

// Generate UUID v7
function generateUUID(): string {
  const timestamp = Date.now()
  const timeHex = timestamp.toString(16).padStart(12, '0')
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `${timeHex.slice(0, 8)}-${timeHex.slice(8)}-7${random.slice(0, 3)}-${(parseInt(random.slice(3, 4), 16) & 0x3 | 0x8).toString(16)}${random.slice(4, 7)}-${random.slice(7, 15)}`
}

const createBookSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  ai_mode: z.enum(['ai_only', 'light_hybrid', 'heavy_hybrid']).default('ai_only')
})

// POST /api/books - Create a new book draft
books.post('/', zValidator('json', createBookSchema), async (c) => {
  const user = c.get('user')
  const { title, description, tags, ai_mode } = c.req.valid('json')
  const db = c.env.DB
  const now = Math.floor(Date.now() / 1000)

  // Check if user is a creator, if not create creator profile
  let creator = await db.prepare('SELECT id FROM creators WHERE user_id = ?').bind(user.userId).first()
  
  if (!creator) {
    const creatorId = generateUUID()
    await db.prepare(`
      INSERT INTO creators (id, user_id, display_name, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(creatorId, user.userId, user.username, now).run()
    creator = { id: creatorId }
  }

  const bookId = generateUUID()
  
  await db.prepare(`
    INSERT INTO books (id, creator_id, title, author, description, ai_mode, tags, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    bookId,
    creator.id,
    title,
    user.username,
    description || null,
    ai_mode,
    tags ? JSON.stringify(tags) : null,
    'draft',
    now,
    now
  ).run()

  return c.json({
    id: bookId,
    title,
    status: 'draft',
    created_at: now
  }, 201)
})

// GET /api/books - List books
books.get('/', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit

  const books = await db.prepare(`
    SELECT b.*, c.display_name as creator_name
    FROM books b
    JOIN creators c ON b.creator_id = c.id
    WHERE b.status = 'published'
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all()

  const count = await db.prepare(`
    SELECT COUNT(*) as total FROM books WHERE status = 'published'
  `).first()

  return c.json({
    items: books.results || [],
    pagination: {
      page,
      limit,
      total: count?.total || 0,
      total_pages: Math.ceil((count?.total as number || 0) / limit)
    }
  })
})

// GET /api/books/:id - Get book details
books.get('/:id', async (c) => {
  const db = c.env.DB
  const bookId = c.req.param('id')

  const book = await db.prepare(`
    SELECT b.*, c.display_name as creator_name, c.verified as creator_verified
    FROM books b
    JOIN creators c ON b.creator_id = c.id
    WHERE b.id = ?
  `).bind(bookId).first()

  if (!book) {
    return c.json({ error: 'BOOK_NOT_FOUND' }, 404)
  }

  // Get chapters
  const chapters = await db.prepare(`
    SELECT id, idx, title, word_count, created_at
    FROM chapters
    WHERE book_id = ?
    ORDER BY idx
  `).bind(bookId).all()

  return c.json({
    ...book,
    chapters: chapters.results || []
  })
})

// POST /api/books/:id/chapters - Add a chapter
const chapterSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  idx: z.number().optional(),
  // Optional reference to the AI draft the author started from.
  // Required by the publish-time edit-ratio gate when the book's
  // `ai_mode != 'ai_only'` (PRD Task 3.4).
  ai_draft_id: z.string().min(1).max(64).optional()
})

books.post('/:id/chapters', zValidator('json', chapterSchema), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const bookId = c.req.param('id')
  const { title, content, idx, ai_draft_id } = c.req.valid('json')

  // Verify book exists and belongs to user
  const book = await db.prepare(`
    SELECT b.* FROM books b
    JOIN creators c ON b.creator_id = c.id
    WHERE b.id = ? AND c.user_id = ?
  `).bind(bookId, user.userId).first()

  if (!book) {
    return c.json({ error: 'BOOK_NOT_FOUND_OR_UNAUTHORIZED' }, 404)
  }

  const chapterId = generateUUID()
  const now = Math.floor(Date.now() / 1000)
  
  // Calculate idx if not provided
  let chapterIdx: number
  if (idx !== undefined) {
    chapterIdx = idx
  } else {
    const result = await db.prepare(`
      SELECT MAX(idx) as max_idx FROM chapters WHERE book_id = ?
    `).bind(bookId).first()
    // MAX() returns NULL (→ null) when no rows exist. Note: `0 || -1` is `-1`
    // in JS, so we must branch explicitly on null/undefined.
    const maxIdx = result?.max_idx as number | null | undefined
    chapterIdx = (maxIdx === null || maxIdx === undefined) ? 0 : maxIdx + 1
  }

  const wordCount = content.length

  // Store content in KV for now (will be uploaded to IPFS/Arweave during publish)
  await c.env.KV.put(`chapter:draft:${chapterId}`, content, { expirationTtl: 7 * 24 * 60 * 60 })
  console.log(`Stored draft content for chapter ${chapterId} in KV`)

  // Remember which AI draft (if any) this chapter was derived from so
  // the publish gate can compute edit-ratio. We store the pointer (not
  // the body) so we share a single KV copy of the original AI output.
  if (ai_draft_id) {
    await c.env.KV.put(`chapter:ai-draft:${chapterId}`, ai_draft_id, {
      expirationTtl: 30 * 24 * 60 * 60
    })
  }

  await db.prepare(`
    INSERT INTO chapters (id, book_id, idx, title, content_cid, word_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(chapterId, bookId, chapterIdx, title, null, wordCount, now).run()

  // Update book chapter count and word count
  await db.prepare(`
    UPDATE books 
    SET chapter_count = chapter_count + 1, word_count = word_count + ?, updated_at = ?
    WHERE id = ?
  `).bind(wordCount, now, bookId).run()

  return c.json({
    id: chapterId,
    book_id: bookId,
    idx: chapterIdx,
    title,
    word_count: wordCount,
    created_at: now
  }, 201)
})

// Minimum human edit ratio across all chapters required to publish a
// hybrid book (PRD Task 3.4). Below this, the system is effectively
// republishing raw AI output under a hybrid label — rejected with 422.
const AI_EDIT_RATIO_THRESHOLD = 0.20

// POST /api/books/:id/publish - Publish book (triggers async processing)
books.post('/:id/publish', async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const bookId = c.req.param('id')

  // Verify book exists and belongs to user
  const book = await db.prepare(`
    SELECT b.* FROM books b
    JOIN creators c ON b.creator_id = c.id
    WHERE b.id = ? AND c.user_id = ?
  `).bind(bookId, user.userId).first<{
    id: string
    status: string
    ai_mode: string
  }>()

  if (!book) {
    return c.json({ error: 'BOOK_NOT_FOUND_OR_UNAUTHORIZED' }, 404)
  }

  if (book.status !== 'draft') {
    return c.json({ error: 'BOOK_NOT_DRAFT' }, 400)
  }

  // Load chapters now — we need them for the edit-ratio check below and
  // for the "no chapters" guard. `id` is required; `word_count` lets us
  // guarantee a stable order + provides a sanity check.
  const chaptersRes = await db.prepare(`
    SELECT id FROM chapters WHERE book_id = ? ORDER BY idx
  `).bind(bookId).all<{ id: string }>()
  const chapters = chaptersRes.results ?? []

  if (chapters.length === 0) {
    return c.json({ error: 'NO_CHAPTERS' }, 400)
  }

  // ── Human/AI edit-ratio gate (PRD Task 3.4) ────────────────────────
  //
  // For any `ai_mode` other than `ai_only`, the author is declaring a
  // hybrid or human-written book. We require the author to have visibly
  // changed ≥ 20% of the original AI draft, otherwise we reject with
  // HTTP 422 so the upstream UI can surface the constraint.
  if (book.ai_mode !== 'ai_only') {
    const { aggregateEditRatio } = await import('../lib/edit-ratio')

    const pairs: Array<{ draft: string; final: string }> = []
    for (const ch of chapters) {
      const aiDraftId = await c.env.KV.get(`chapter:ai-draft:${ch.id}`)
      if (!aiDraftId) {
        // No AI draft recorded for this chapter — treat as 100% human.
        // (Fully human-written chapters shouldn't lower the ratio.)
        continue
      }
      const aiDraft = await c.env.KV.get(`draft:ai:${aiDraftId}`)
      const finalBody = await c.env.KV.get(`chapter:draft:${ch.id}`)
      if (!aiDraft || !finalBody) {
        // Missing side of the comparison → skip rather than over-penalise.
        continue
      }
      pairs.push({ draft: aiDraft, final: finalBody })
    }

    if (pairs.length > 0) {
      const ratio = aggregateEditRatio(pairs)
      if (ratio < AI_EDIT_RATIO_THRESHOLD) {
        return c.json(
          {
            error: 'AI_RATIO_TOO_LOW',
            measured: ratio,
            required: AI_EDIT_RATIO_THRESHOLD
          },
          422
        )
      }
    }
  }

  // Update status to publishing
  const now = Math.floor(Date.now() / 1000)
  await db.prepare(`
    UPDATE books SET status = 'publishing', updated_at = ? WHERE id = ?
  `).bind(now, bookId).run()

  // Send to queue for async processing
  await c.env.QUEUE.send({
    type: 'publish_book',
    bookId,
    userId: user.userId
  })

  return c.json({
    id: bookId,
    status: 'publishing',
    message: 'Book is being processed and will be available shortly'
  })
})

// GET /api/books/:id/read/:chapterId - Get chapter content for reading
books.get('/:id/read/:chapterId', async (c) => {
  const db = c.env.DB
  const bookId = c.req.param('id')
  const chapterId = c.req.param('chapterId')

  // Get chapter info (allow reading draft books for the author).
  // `c.content_cid` / `c.arweave_tx` are the per-chapter storage pointers
  // populated by the book-processing queue consumer at publish time.
  const chapter = await db.prepare(`
    SELECT c.id, c.idx, c.title, c.word_count,
           c.content_cid AS chapter_cid, c.arweave_tx AS chapter_arweave_tx,
           b.status, b.creator_id
    FROM chapters c
    JOIN books b ON c.book_id = b.id
    WHERE c.id = ? AND c.book_id = ?
  `).bind(chapterId, bookId).first()

  if (!chapter) {
    return c.json({ error: 'CHAPTER_NOT_FOUND' }, 404)
  }

  // Check if book is published or user is the author
  if (chapter.status !== 'published') {
    // Check if user is the author
    const authHeader = c.req.header('Authorization')
    let isAuthor = false
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { verifyToken } = await import('../lib/jwt')
        const token = authHeader.slice(7)
        const payload = await verifyToken(token, c.env)
        const creator = await db.prepare('SELECT id FROM creators WHERE user_id = ?').bind(payload.userId).first()
        isAuthor = creator?.id === chapter.creator_id
      } catch {
        // Ignore auth errors
      }
    }
    if (!isAuthor) {
      return c.json({ error: 'BOOK_NOT_PUBLISHED' }, 403)
    }
  }

  try {
    let content: string

    // For draft books, get content from KV
    if (chapter.status !== 'published') {
      const draftContent = await c.env.KV.get(`chapter:draft:${chapterId}`)
      content = draftContent ?? ''
    } else {
      // For published books, use the per-chapter multi-level fallback
      //  1. KV cache key `chapter:<id>` (populated by the consumer on publish)
      //  2. IPFS (Pinata) via chapter.content_cid
      //  3. Arweave via chapter.arweave_tx
      const { getContent } = await import('../lib/content')
      content = await getContent(c.env, {
        cid: (chapter.chapter_cid as string | null) ?? undefined,
        arweaveTx: (chapter.chapter_arweave_tx as string | null) ?? undefined,
        cacheKey: `chapter:${chapterId}`
      })
    }

    // Get reading progress if authenticated
    let progress = null
    const authHeader = c.req.header('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { verifyToken } = await import('../lib/jwt')
        const token = authHeader.slice(7)
        const payload = await verifyToken(token, c.env)
        const readingProgress = await db.prepare(`
          SELECT position, percent, is_finished
          FROM reading_progress
          WHERE user_id = ? AND book_id = ? AND chapter_id = ?
        `).bind(payload.userId, bookId, chapterId).first()
        if (readingProgress) {
          progress = readingProgress
        }
      } catch {
        // Ignore auth errors for reading
      }
    }

    return c.json({
      chapter: {
        id: chapter.id,
        idx: chapter.idx,
        title: chapter.title,
        content,
        word_count: chapter.word_count
      },
      progress: progress || {
        position: 0,
        percent: 0,
        is_finished: false
      }
    })
  } catch (err) {
    console.error('Failed to get chapter content:', err)
    return c.json({ error: 'CONTENT_UNAVAILABLE' }, 503)
  }
})

// POST /api/books/:id/progress - Update reading progress
books.post('/:id/progress', async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const bookId = c.req.param('id')

  const { chapter_id, position, percent, is_finished } = await c.req.json()
  const now = Math.floor(Date.now() / 1000)

  // Upsert reading progress
  await db.prepare(`
    INSERT INTO reading_progress (id, user_id, book_id, chapter_id, position, percent, is_finished, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, book_id) DO UPDATE SET
      chapter_id = excluded.chapter_id,
      position = excluded.position,
      percent = excluded.percent,
      is_finished = excluded.is_finished,
      updated_at = excluded.updated_at
  `).bind(
    generateUUID(),
    user.userId,
    bookId,
    chapter_id || null,
    position || 0,
    percent || 0,
    is_finished ? 1 : 0,
    now
  ).run()

  return c.json({ success: true })
})

export default books
