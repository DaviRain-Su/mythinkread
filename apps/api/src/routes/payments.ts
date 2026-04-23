import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import type { Env, AuthedUser } from '../index'

const payments = new Hono<{ Bindings: Env; Variables: { user: AuthedUser; jwtPayload: AuthedUser } }>()

payments.use('*', requireAuth)

import { generateUUID } from '../lib/uuid'

// GET /api/payments/books/:bookId - Check if user has purchased book
payments.get('/books/:bookId', async (c) => {
  // @ts-ignore
  const user = c.get('user')
  const db = c.env.DB
  const bookId = c.req.param('bookId')

  // Check if book is free (books table doesn't have price column yet, assume free)
  const book = await db.prepare('SELECT id FROM books WHERE id = ?')
    .bind(bookId).first()
  
  if (!book) {
    return c.json({ error: 'BOOK_NOT_FOUND' }, 404)
  }

  // For now, all books are free until price column is added
  const price = 0
  if (price === 0) {
    return c.json({ purchased: true, price: 0 })
  }

  // Check purchase record
  const purchase = await db.prepare(`
    SELECT * FROM purchases 
    WHERE user_id = ? AND book_id = ? AND status = 'completed'
  `).bind(user.userId, bookId).first()

  return c.json({
    purchased: !!purchase,
    price,
    purchase_date: purchase ? (purchase as any).created_at : null
  })
})

// POST /api/payments/books/:bookId - Create purchase
payments.post('/books/:bookId', async (c) => {
  // @ts-ignore
  const user = c.get('user')
  const db = c.env.DB
  const bookId = c.req.param('bookId')
  const { tx_hash } = await c.req.json()

  // Get book
  const book = await db.prepare('SELECT id, creator_id, title FROM books WHERE id = ?')
    .bind(bookId).first()
  
  if (!book) {
    return c.json({ error: 'BOOK_NOT_FOUND' }, 404)
  }

  // For now, all books are free
  const price = 0
  
  // If free, auto-complete
  if (price === 0) {
    return c.json({ success: true, price: 0, message: 'Free book' })
  }

  const now = Math.floor(Date.now() / 1000)

  // Create purchase record
  await db.prepare(`
    INSERT INTO purchases (id, user_id, book_id, amount, currency, tx_hash, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, book_id) DO UPDATE SET
      tx_hash = excluded.tx_hash,
      status = 'completed',
      created_at = excluded.created_at
  `).bind(generateUUID(), user.userId, bookId, price, 'USDC', tx_hash || null, 'completed', now).run()

  // Create notification for creator
  await db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, content, related_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    generateUUID(),
    (book as any).creator_id,
    'system',
    '书籍售出',
    `《${(book as any).title}》被购买，收入 ${price} USDC`,
    bookId,
    now
  ).run()

  return c.json({
    success: true,
    price,
    currency: 'USDC',
    tx_hash
  })
})

// GET /api/payments/history - Get purchase history
payments.get('/history', async (c) => {
  // @ts-ignore
  const user = c.get('user')
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit

  const results = await db.prepare(`
    SELECT p.*, b.title as book_title, b.author
    FROM purchases p
    JOIN books b ON p.book_id = b.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(user.userId, limit, offset).all()

  return c.json({ items: results.results || [] })
})

// GET /api/payments/sales - Get sales history (for creators)
payments.get('/sales', async (c) => {
  // @ts-ignore
  const user = c.get('user')
  const db = c.env.DB

  // Get creator ID
  const creator = await db.prepare('SELECT id FROM creators WHERE user_id = ?')
    .bind(user.userId).first()
  
  if (!creator) {
    return c.json({ items: [], total_revenue: 0 })
  }

  const results = await db.prepare(`
    SELECT p.*, b.title as book_title, u.username as buyer_name
    FROM purchases p
    JOIN books b ON p.book_id = b.id
    JOIN users u ON p.user_id = u.id
    WHERE b.creator_id = ? AND p.status = 'completed'
    ORDER BY p.created_at DESC
  `).bind((creator as any).id).all()

  const totalRevenue = await db.prepare(`
    SELECT SUM(p.amount) as total
    FROM purchases p
    JOIN books b ON p.book_id = b.id
    WHERE b.creator_id = ? AND p.status = 'completed'
  `).bind((creator as any).id).first()

  return c.json({
    items: results.results || [],
    total_revenue: (totalRevenue as any)?.total || 0
  })
})

export default payments
