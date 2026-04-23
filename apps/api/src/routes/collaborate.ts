import { Hono } from 'hono'
import { generateUUID } from '../lib/uuid'
import type { Env, AuthedUser } from '../index'

interface DocRow {
  id: string
  book_id: string
  chapter_id?: string | null
  title: string
  content: string
  created_by: string
  created_at: number
  updated_at: number
  version?: number
  status?: string
  creator_name?: string
}



const collaborate = new Hono<{ Bindings: Env; Variables: { user: AuthedUser; jwtPayload: AuthedUser } }>()

// Auth middleware
collaborate.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const { verifyToken } = await import('../lib/jwt')
      const payload = await verifyToken(token, c.env)
      c.set('user', payload as AuthedUser)
    } catch {
      // ignore
    }
  }
  await next()
})

// GET /api/collaborate/docs/:bookId - List collaborative docs for a book
collaborate.get('/docs/:bookId', async (c) => {
  const db = c.env.DB
  const bookId = c.req.param('bookId')

  const results = await db.prepare(`
    SELECT d.*, u.username as creator_name
    FROM collaborative_docs d
    JOIN users u ON d.created_by = u.id
    WHERE d.book_id = ? AND d.status = 'active'
    ORDER BY d.updated_at DESC
  `).bind(bookId).all()

  return c.json({ items: results.results || [] })
})

// POST /api/collaborate/docs - Create a collaborative doc
collaborate.post('/docs', async (c) => {
  const user = c.get('user') as { userId: string } | undefined
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const db = c.env.DB
  const { book_id, chapter_id, title, content } = await c.req.json()

  const now = Math.floor(Date.now() / 1000)
  const docId = generateUUID()

  await db.prepare(`
    INSERT INTO collaborative_docs (id, book_id, chapter_id, title, content, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(docId, book_id, chapter_id || null, title, content || '', user.userId, now, now).run()

  // Add creator as admin collaborator
  await db.prepare(`
    INSERT INTO doc_collaborators (id, doc_id, user_id, role, joined_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(generateUUID(), docId, user.userId, 'admin', now).run()

  return c.json({ id: docId, title }, 201)
})

// GET /api/collaborate/docs/:docId - Get doc with operations
collaborate.get('/docs/:docId', async (c) => {
  const db = c.env.DB
  const docId = c.req.param('docId')

  const doc = await db.prepare(`
    SELECT d.*, u.username as creator_name
    FROM collaborative_docs d
    JOIN users u ON d.created_by = u.id
    WHERE d.id = ?
  `).bind(docId).first<DocRow>()

  if (!doc) {
    return c.json({ error: 'DOC_NOT_FOUND' }, 404)
  }

  const collaborators = await db.prepare(`
    SELECT c.*, u.username, u.display_name
    FROM doc_collaborators c
    JOIN users u ON c.user_id = u.id
    WHERE c.doc_id = ?
  `).bind(docId).all()

  return c.json({
    ...doc,
    collaborators: collaborators.results || []
  })
})

// POST /api/collaborate/docs/:docId/operations - Submit operation
collaborate.post('/docs/:docId/operations', async (c) => {
  const user = c.get('user') as { userId: string } | undefined
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const db = c.env.DB
  const docId = c.req.param('docId')
  const { operation, position, content: opContent } = await c.req.json()

  // Check if user is a collaborator
  const collaborator = await db.prepare(`
    SELECT role FROM doc_collaborators WHERE doc_id = ? AND user_id = ?
  `).bind(docId, user.userId).first<{ role?: string }>()

  if (!collaborator) {
    return c.json({ error: 'NOT_A_COLLABORATOR' }, 403)
  }

  const now = Math.floor(Date.now() / 1000)

  // Get current version
  const doc = await db.prepare('SELECT version FROM collaborative_docs WHERE id = ?')
    .bind(docId).first<{ version?: number }>()

  const currentVersion = doc?.version || 1
  const newVersion = currentVersion + 1

  // Store operation
  await db.prepare(`
    INSERT INTO doc_operations (id, doc_id, user_id, operation, position, content, version, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(generateUUID(), docId, user.userId, operation, position || 0, opContent || '', newVersion, now).run()

  // Update doc content and version
  if (operation === 'insert') {
    await db.prepare(`
      UPDATE collaborative_docs 
      SET content = substr(content, 1, ?) || ? || substr(content, ? + 1),
          version = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(position, opContent, position, newVersion, now, docId).run()
  } else if (operation === 'delete') {
    await db.prepare(`
      UPDATE collaborative_docs 
      SET content = substr(content, 1, ?) || substr(content, ? + ? + 1),
          version = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(position, position, (opContent || '').length, newVersion, now, docId).run()
  }

  return c.json({ version: newVersion })
})

// GET /api/collaborate/docs/:docId/operations - Get operations since version
collaborate.get('/docs/:docId/operations', async (c) => {
  const db = c.env.DB
  const docId = c.req.param('docId')
  const sinceVersion = parseInt(c.req.query('since') || '0')

  const operations = await db.prepare(`
    SELECT o.*, u.username
    FROM doc_operations o
    JOIN users u ON o.user_id = u.id
    WHERE o.doc_id = ? AND o.version > ?
    ORDER BY o.version ASC
  `).bind(docId, sinceVersion).all()

  return c.json({ operations: operations.results || [] })
})

// POST /api/collaborate/docs/:docId/collaborators - Add collaborator
collaborate.post('/docs/:docId/collaborators', async (c) => {
  const user = c.get('user') as { userId: string } | undefined
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const db = c.env.DB
  const docId = c.req.param('docId')
  const { user_id, role } = await c.req.json()

  // Check if current user is admin
  const currentUser = await db.prepare(`
    SELECT role FROM doc_collaborators WHERE doc_id = ? AND user_id = ?
  `).bind(docId, user.userId).first<{ role?: string }>()

  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: 'FORBIDDEN' }, 403)
  }

  const now = Math.floor(Date.now() / 1000)

  await db.prepare(`
    INSERT INTO doc_collaborators (id, doc_id, user_id, role, joined_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(doc_id, user_id) DO UPDATE SET role = excluded.role
  `).bind(generateUUID(), docId, user_id, role || 'editor', now).run()

  return c.json({ success: true })
})

export default collaborate
