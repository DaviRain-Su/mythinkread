import { Hono } from 'hono'
import { generateUUID } from '../lib/uuid'
import type { Env, AuthedUser } from '../index'

interface BlogConfigRow {
  user_id: string
  is_public?: number
  auto_publish_comment?: number
  auto_publish_annotation?: number
  title?: string
  description?: string
  theme?: string
  avatar_cid?: string
  social_links?: string
  auto_publish_ai_summary?: number
  subdomain?: string
}

interface UserInfoRow {
  username?: string
  display_name?: string
}

interface PostRow {
  id: string
  user_id: string
  type: string
  title: string
  content: string
  source_book_id?: string | null
  source_chapter_id?: string | null
  source_comment_id?: string | null
  source_annotation_id?: string | null
  tags?: string | null
  is_public?: number
  created_at?: number
  updated_at?: number
  book_title?: string
  chapter_title?: string
  book_id?: string
  chapter_id?: string
  selected_text?: string
  note?: string
}

const blog = new Hono<{ Bindings: Env; Variables: { user: AuthedUser; jwtPayload: AuthedUser } }>()

// Auth middleware
blog.use('*', async (c, next) => {
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

// GET /api/blog/config - Get blog config
blog.get('/config', async (c) => {
  const user = c.get('user') as { userId: string } | undefined
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const db = c.env.DB
  const config = await db.prepare(`
    SELECT * FROM user_blog_configs WHERE user_id = ?
  `).bind(user.userId).first<BlogConfigRow>()

  if (!config) {
    // Create default config
    const now = Math.floor(Date.now() / 1000)
    const userInfo = await db.prepare('SELECT username, display_name FROM users WHERE id = ?')
      .bind(user.userId).first<UserInfoRow>()

    const subdomain = userInfo?.username || `user-${user.userId.slice(0, 8)}`

    await db.prepare(`
      INSERT INTO user_blog_configs (id, user_id, subdomain, title, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(generateUUID(), user.userId, subdomain, userInfo?.display_name || subdomain, '', now, now).run()

    const newConfig = await db.prepare(`
      SELECT * FROM user_blog_configs WHERE user_id = ?
    `).bind(user.userId).first()

    return c.json({ config: newConfig })
  }

  return c.json({ config })
})

// PUT /api/blog/config - Update blog config
blog.put('/config', async (c) => {
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
  `).bind(userId).first<BlogConfigRow>()

  const currentUser = c.get('user') as { userId: string } | undefined
  const isOwner = currentUser?.userId === userId

  if (!isOwner && (!blogConfig || blogConfig.is_public !== 1)) {
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
  `).bind((config as unknown as BlogConfigRow).user_id).all()

  return c.json({
    config,
    posts: posts.results || []
  })
})

// POST /api/blog/generate - Auto-generate blog posts from user activity
blog.post('/generate', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const db = c.env.DB
  const { types } = await c.req.json()

  const config = await db.prepare(`
    SELECT * FROM user_blog_configs WHERE user_id = ?
  `).bind(user.userId).first<BlogConfigRow>()

  if (!config) {
    return c.json({ error: 'BLOG_NOT_CONFIGURED' }, 400)
  }

  const generatedPosts: Array<{ id: string; type: string }> = []
  const now = Math.floor(Date.now() / 1000)

  // Generate from comments
  if (types?.includes('comment') && config.auto_publish_comment === 1) {
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
      const row = comment as unknown as PostRow
      await db.prepare(`
        INSERT INTO user_blog_posts (id, user_id, type, title, content, source_book_id, source_comment_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(postId, user.userId, 'comment', `评论《${row.book_title}》`, row.content, row.source_book_id || row.book_id || null, row.id, now, now).run()
      generatedPosts.push({ id: postId, type: 'comment' })
    }
  }

  // Generate from annotations
  if (types?.includes('annotation') && config.auto_publish_annotation === 1) {
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
      const row = annotation as unknown as PostRow
      const content = `**原文：** ${row.selected_text ?? ''}\n\n**批注：** ${row.note || ''}`
      await db.prepare(`
        INSERT INTO user_blog_posts (id, user_id, type, title, content, source_book_id, source_chapter_id, source_annotation_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(postId, user.userId, 'annotation', `批注《${row.book_title}》- ${row.chapter_title}`, content, row.source_book_id || row.book_id || null, row.source_chapter_id || row.chapter_id || null, row.id, now, now).run()
      generatedPosts.push({ id: postId, type: 'annotation' })
    }
  }

  return c.json({
    generated: generatedPosts.length,
    posts: generatedPosts
  })
})

export default blog
