import { Hono } from 'hono'
import type { Env } from '../index'

const blog = new Hono<{ Bindings: Env }>()

function generateUUID(): string {
  const timestamp = Date.now()
  const timeHex = timestamp.toString(16).padStart(12, '0')
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `${timeHex.slice(0, 8)}-${timeHex.slice(8)}-7${random.slice(0, 3)}-${(parseInt(random.slice(3, 4), 16) & 0x3 | 0x8).toString(16)}${random.slice(4, 7)}-${random.slice(7, 15)}`
}

// Auth middleware
blog.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const { verifyToken } = await import('../lib/jwt')
      const payload = await verifyToken(token, c.env)
      // @ts-ignore
      c.set('user', payload)
    } catch {
      // ignore
    }
  }
  await next()
})

// GET /api/blog/config - Get blog config
blog.get('/config', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string } | undefined
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const db = c.env.DB
  const config = await db.prepare(`
    SELECT * FROM user_blog_configs WHERE user_id = ?
  `).bind(user.userId).first()

  if (!config) {
    // Create default config
    const now = Math.floor(Date.now() / 1000)
    const userInfo = await db.prepare('SELECT username, display_name FROM users WHERE id = ?')
      .bind(user.userId).first()
    
    const subdomain = (userInfo as any)?.username || `user-${user.userId.slice(0, 8)}`
    
    await db.prepare(`
      INSERT INTO user_blog_configs (id, user_id, subdomain, title, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(generateUUID(), user.userId, subdomain, (userInfo as any)?.display_name || subdomain, '', now, now).run()

    const newConfig = await db.prepare(`
      SELECT * FROM user_blog_configs WHERE user_id = ?
    `).bind(user.userId).first()

    return c.json({ config: newConfig })
  }

  return c.json({ config })
})

// PUT /api/blog/config - Update blog config
blog.put('/config', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string } | undefined
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const db = c.env.DB
  const updates = await c.req.json()
  const now = Math.floor(Date.now() / 1000)

  const allowedFields = ['title', 'description', 'theme', 'avatar_cid', 'social_links', 'is_public', 'auto_publish_comment', 'auto_publish_annotation', 'auto_publish_ai_summary']
  const setClause = allowedFields
    .filter(f => updates[f] !== undefined)
    .map(f => `${f} = ?`)
    .join(', ')

  if (setClause) {
    const values = allowedFields
      .filter(f => updates[f] !== undefined)
      .map(f => typeof updates[f] === 'object' ? JSON.stringify(updates[f]) : updates[f])

    await db.prepare(`
      UPDATE user_blog_configs SET ${setClause}, updated_at = ? WHERE user_id = ?
    `).bind(...values, now, user.userId).run()
  }

  return c.json({ success: true })
})

// GET /api/blog/posts - List blog posts
blog.get('/posts', async (c) => {
  const db = c.env.DB
  const userId = c.req.query('user_id')
  const type = c.req.query('type')
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit

  if (!userId) {
    return c.json({ error: 'USER_ID_REQUIRED' }, 400)
  }

  // Check blog is public or user is owner
  const blogConfig = await db.prepare(`
    SELECT is_public FROM user_blog_configs WHERE user_id = ?
  `).bind(userId).first()

  // @ts-ignore
  const currentUser = c.get('user') as { userId: string } | undefined
  const isOwner = currentUser?.userId === userId

  if (!isOwner && (!blogConfig || (blogConfig as any).is_public !== 1)) {
    return c.json({ error: 'BLOG_NOT_PUBLIC' }, 403)
  }

  let query = `
    SELECT p.*, b.title as book_title
    FROM user_blog_posts p
    LEFT JOIN books b ON p.source_book_id = b.id
    WHERE p.user_id = ? AND p.is_public = 1
  `
  const params: (string | number)[] = [userId]

  if (type) {
    query += ' AND p.type = ?'
    params.push(type)
  }

  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const results = await db.prepare(query).bind(...params).all()

  return c.json({ items: results.results || [] })
})

// POST /api/blog/posts - Create blog post
blog.post('/posts', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string } | undefined
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const db = c.env.DB
  const { title, content, type, source_book_id, source_chapter_id, source_comment_id, source_annotation_id, tags } = await c.req.json()

  const now = Math.floor(Date.now() / 1000)
  const postId = generateUUID()

  await db.prepare(`
    INSERT INTO user_blog_posts (id, user_id, type, title, content, source_book_id, source_chapter_id, source_comment_id, source_annotation_id, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(postId, user.userId, type, title, content, source_book_id || null, source_chapter_id || null, source_comment_id || null, source_annotation_id || null, tags ? JSON.stringify(tags) : null, now, now).run()

  return c.json({ id: postId, title, type }, 201)
})

// GET /api/blog/:subdomain - Public blog page
blog.get('/:subdomain', async (c) => {
  const db = c.env.DB
  const subdomain = c.req.param('subdomain')

  const config = await db.prepare(`
    SELECT c.*, u.username, u.display_name
    FROM user_blog_configs c
    JOIN users u ON c.user_id = u.id
    WHERE c.subdomain = ? AND c.is_public = 1
  `).bind(subdomain).first()

  if (!config) {
    return c.json({ error: 'BLOG_NOT_FOUND' }, 404)
  }

  const posts = await db.prepare(`
    SELECT p.*, b.title as book_title
    FROM user_blog_posts p
    LEFT JOIN books b ON p.source_book_id = b.id
    WHERE p.user_id = ? AND p.is_public = 1
    ORDER BY p.created_at DESC
    LIMIT 20
  `).bind((config as any).user_id).all()

  return c.json({
    config,
    posts: posts.results || []
  })
})

// POST /api/blog/generate - Auto-generate blog posts from user activity
blog.post('/generate', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string } | undefined
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const db = c.env.DB
  const { types } = await c.req.json()

  const config = await db.prepare(`
    SELECT * FROM user_blog_configs WHERE user_id = ?
  `).bind(user.userId).first()

  if (!config) {
    return c.json({ error: 'BLOG_NOT_CONFIGURED' }, 400)
  }

  const generatedPosts = []
  const now = Math.floor(Date.now() / 1000)

  // Generate from comments
  if (types?.includes('comment') && (config as any).auto_publish_comment === 1) {
    const comments = await db.prepare(`
      SELECT c.*, b.title as book_title
      FROM comments c
      JOIN books b ON c.book_id = b.id
      WHERE c.user_id = ? AND c.is_deleted = 0
      AND c.id NOT IN (SELECT source_comment_id FROM user_blog_posts WHERE user_id = ? AND type = 'comment')
      ORDER BY c.created_at DESC
      LIMIT 10
    `).bind(user.userId, user.userId).all()

    for (const comment of comments.results || []) {
      const postId = generateUUID()
      await db.prepare(`
        INSERT INTO user_blog_posts (id, user_id, type, title, content, source_book_id, source_comment_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(postId, user.userId, 'comment', `评论《${(comment as any).book_title}》`, (comment as any).content, (comment as any).book_id, (comment as any).id, now, now).run()
      generatedPosts.push({ id: postId, type: 'comment' })
    }
  }

  // Generate from annotations
  if (types?.includes('annotation') && (config as any).auto_publish_annotation === 1) {
    const annotations = await db.prepare(`
      SELECT a.*, b.title as book_title, c.title as chapter_title
      FROM annotations a
      JOIN books b ON a.book_id = b.id
      JOIN chapters c ON a.chapter_id = c.id
      WHERE a.user_id = ? AND a.is_public = 1
      AND a.id NOT IN (SELECT source_annotation_id FROM user_blog_posts WHERE user_id = ? AND type = 'annotation')
      ORDER BY a.created_at DESC
      LIMIT 10
    `).bind(user.userId, user.userId).all()

    for (const annotation of annotations.results || []) {
      const postId = generateUUID()
      const content = `**原文：** ${(annotation as any).selected_text}\n\n**批注：** ${(annotation as any).note || ''}`
      await db.prepare(`
        INSERT INTO user_blog_posts (id, user_id, type, title, content, source_book_id, source_chapter_id, source_annotation_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(postId, user.userId, 'annotation', `批注《${(annotation as any).book_title}》- ${(annotation as any).chapter_title}`, content, (annotation as any).book_id, (annotation as any).chapter_id, (annotation as any).id, now, now).run()
      generatedPosts.push({ id: postId, type: 'annotation' })
    }
  }

  return c.json({
    generated: generatedPosts.length,
    posts: generatedPosts
  })
})

export default blog
