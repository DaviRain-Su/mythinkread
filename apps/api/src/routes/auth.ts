import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createToken } from '../lib/jwt'
import { hashPassword, verifyPassword } from '../lib/password'
import type { Env } from '../index'

const auth = new Hono<{ Bindings: Env }>()

// Generate UUID v7
function generateUUID(): string {
  const timestamp = Date.now()
  const timeHex = timestamp.toString(16).padStart(12, '0')
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `${timeHex.slice(0, 8)}-${timeHex.slice(8)}-7${random.slice(0, 3)}-${(parseInt(random.slice(3, 4), 16) & 0x3 | 0x8).toString(16)}${random.slice(4, 7)}-${random.slice(7, 15)}`
}

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/),
  password: z.string().min(8).max(100),
  email: z.string().email().optional()
})

const loginSchema = z.object({
  username: z.string(),
  password: z.string()
})

// POST /api/auth/register
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { username, password, email } = c.req.valid('json')
  const db = c.env.DB
  const now = Math.floor(Date.now() / 1000)

  // Check if username exists
  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
  if (existing) {
    return c.json({ error: 'USERNAME_EXISTS' }, 409)
  }

  // Check if email exists
  if (email) {
    const existingEmail = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (existingEmail) {
      return c.json({ error: 'EMAIL_EXISTS' }, 409)
    }
  }

  const userId = generateUUID()
  const passwordHash = await hashPassword(password)

  await db.prepare(`
    INSERT INTO users (id, username, email, display_name, role, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(userId, username, email || null, username, 'reader', passwordHash, now, now).run()

  return c.json({
    id: userId,
    username,
    display_name: username,
    role: 'reader',
    created_at: now
  }, 201)
})

// POST /api/auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json')
  const db = c.env.DB

  const user = await db.prepare(`
    SELECT id, username, display_name, role, password_hash
    FROM users WHERE username = ?
  `).bind(username).first()

  if (!user) {
    return c.json({ error: 'INVALID_CREDENTIALS' }, 401)
  }

  const valid = await verifyPassword(password, user.password_hash as string)
  if (!valid) {
    return c.json({ error: 'INVALID_CREDENTIALS' }, 401)
  }

  const token = await createToken({
    userId: user.id as string,
    username: user.username as string,
    role: user.role as string
  })

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role
    }
  })
})

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  // Client-side token removal
  return c.json({ success: true })
})

// GET /api/auth/me
auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const token = authHeader.slice(7)
  
  try {
    const { createToken } = await import('../lib/jwt')
    const { verifyToken } = await import('../lib/jwt')
    const payload = await verifyToken(token)
    
    const db = c.env.DB
    const user = await db.prepare(`
      SELECT id, username, display_name, role
      FROM users WHERE id = ?
    `).bind(payload.userId).first()

    if (!user) {
      return c.json({ error: 'USER_NOT_FOUND' }, 404)
    }

    return c.json({ user })
  } catch {
    return c.json({ error: 'INVALID_TOKEN' }, 401)
  }
})

export default auth
