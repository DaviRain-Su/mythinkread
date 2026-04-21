import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env } from '../index'

const solana = new Hono<{ Bindings: Env }>()

// Auth middleware
solana.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const { verifyToken } = await import('../lib/jwt')
    const payload = await verifyToken(token)
    // @ts-ignore
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'INVALID_TOKEN' }, 401)
  }
})

// POST /api/solana/link - Link Solana wallet
solana.post('/link', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const { wallet_address, signature, message } = await c.req.json()

  if (!wallet_address || !signature || !message) {
    return c.json({ error: 'MISSING_PARAMS' }, 400)
  }

  // Verify signature (simplified - in production use @solana/web3.js)
  // For now, accept any valid-looking address
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet_address)) {
    return c.json({ error: 'INVALID_ADDRESS' }, 400)
  }

  // Update user's wallet address
  await db.prepare(`
    UPDATE users SET wallet_address_v2 = ? WHERE id = ?
  `).bind(wallet_address, user.userId).run()

  return c.json({
    success: true,
    wallet_address
  })
})

// GET /api/solana/wallet - Get linked wallet
solana.get('/wallet', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB

  const result = await db.prepare(`
    SELECT wallet_address_v2 FROM users WHERE id = ?
  `).bind(user.userId).first()

  return c.json({
    wallet_address: result?.wallet_address_v2 || null
  })
})

// POST /api/solana/unlink - Unlink wallet
solana.post('/unlink', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB

  await db.prepare(`
    UPDATE users SET wallet_address_v2 = NULL WHERE id = ?
  `).bind(user.userId).run()

  return c.json({ success: true })
})

// GET /api/solana/nfts/:wallet - Get NFT books owned by wallet
solana.get('/nfts/:wallet', async (c) => {
  const wallet = c.req.param('wallet')
  const db = c.env.DB

  // Find books linked to this wallet
  // In production, this would query Solana blockchain for NFT ownership
  const books = await db.prepare(`
    SELECT b.*, u.username as creator_username
    FROM books b
    JOIN creators c ON b.creator_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE u.wallet_address_v2 = ? AND b.status = 'published'
  `).bind(wallet).all()

  return c.json({
    wallet,
    items: books.results || []
  })
})

// POST /api/solana/mint - Mint book as NFT (placeholder)
solana.post('/mint/:bookId', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const bookId = c.req.param('bookId')

  // Verify book exists and belongs to user
  const book = await db.prepare(`
    SELECT b.* FROM books b
    JOIN creators c ON b.creator_id = c.id
    WHERE b.id = ? AND c.user_id = ?
  `).bind(bookId, user.userId).first()

  if (!book) {
    return c.json({ error: 'BOOK_NOT_FOUND' }, 404)
  }

  // In production, this would:
  // 1. Upload metadata to Arweave/IPFS
  // 2. Call Metaplex to mint NFT
  // 3. Store mint address in database

  return c.json({
    success: true,
    message: 'NFT minting initiated',
    book_id: bookId,
    // mock_mint_address: 'MockMintAddress...'
  })
})

export default solana
