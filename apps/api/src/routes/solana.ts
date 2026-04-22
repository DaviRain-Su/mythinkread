import { Hono } from 'hono'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import type { Env } from '../index'

const solana = new Hono<{ Bindings: Env }>()

const NONCE_TTL_SECONDS = 5 * 60 // 5 minutes
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function nonceKey(wallet: string): string {
  return `solana:nonce:${wallet}`
}

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  // base58 of 16 random bytes → ~22 chars, url-safe and printable in Phantom popups.
  return bs58.encode(bytes)
}

// Public auth middleware — applied to every subsequent route.
solana.use('*', async (c, next) => {
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

/**
 * GET /api/solana/nonce?wallet=<address>
 *
 * Issues a short-lived random nonce keyed by wallet address. The client
 * must sign this exact nonce with the wallet's private key and submit the
 * base58-encoded signature to POST /api/solana/link.
 */
solana.get('/nonce', async (c) => {
  const wallet = c.req.query('wallet')
  if (!wallet || !SOLANA_ADDRESS_REGEX.test(wallet)) {
    return c.json({ error: 'INVALID_WALLET' }, 400)
  }
  const nonce = randomNonce()
  await c.env.KV.put(nonceKey(wallet), nonce, { expirationTtl: NONCE_TTL_SECONDS })
  return c.json({
    nonce,
    message: nonce,
    expires_in: NONCE_TTL_SECONDS
  })
})

/**
 * POST /api/solana/link
 *
 * Body: { wallet_address, signature (base58), message }
 * Verifies that:
 *  - `message` matches the server-issued nonce still in KV
 *  - `signature` is a valid ed25519 signature of `message` under `wallet_address`'s public key
 * On success, stores the wallet address on the authenticated user and invalidates the nonce.
 */
solana.post('/link', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB

  let body: { wallet_address?: string; signature?: string; message?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'INVALID_JSON' }, 400)
  }

  const { wallet_address, signature, message } = body
  if (!wallet_address || !signature || !message) {
    return c.json({ error: 'MISSING_PARAMS' }, 400)
  }

  if (!SOLANA_ADDRESS_REGEX.test(wallet_address)) {
    return c.json({ error: 'INVALID_ADDRESS' }, 400)
  }

  // Hard reject the legacy placeholder — no one should ever accept this.
  if (signature === 'mock_signature') {
    return c.json({ error: 'MOCK_SIGNATURE_REJECTED' }, 400)
  }

  // The message the client signed MUST equal the nonce we issued.
  const storedNonce = await c.env.KV.get(nonceKey(wallet_address))
  if (!storedNonce) {
    return c.json({ error: 'NONCE_MISSING_OR_EXPIRED' }, 400)
  }
  if (storedNonce !== message) {
    return c.json({ error: 'NONCE_MISMATCH' }, 400)
  }

  // Decode the wallet identifier bytes (ed25519 verify key) and signature bytes.
  let walletBytes: Uint8Array
  let sigBytes: Uint8Array
  try {
    walletBytes = bs58.decode(wallet_address)
    sigBytes = bs58.decode(signature)
  } catch {
    return c.json({ error: 'INVALID_ENCODING' }, 400)
  }

  if (walletBytes.length !== 32 || sigBytes.length !== 64) {
    return c.json({ error: 'INVALID_KEY_OR_SIG_LENGTH' }, 400)
  }

  const ok = nacl.sign.detached.verify(
    new TextEncoder().encode(message),
    sigBytes,
    walletBytes
  )
  if (!ok) {
    return c.json({ error: 'SIGNATURE_VERIFICATION_FAILED' }, 400)
  }

  // Persist and consume the nonce.
  await db
    .prepare('UPDATE users SET wallet_address_v2 = ? WHERE id = ?')
    .bind(wallet_address, user.userId)
    .run()
  await c.env.KV.delete(nonceKey(wallet_address))

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

  const result = await db
    .prepare('SELECT wallet_address_v2 FROM users WHERE id = ?')
    .bind(user.userId)
    .first()

  return c.json({
    wallet_address: result?.wallet_address_v2 || null
  })
})

// POST /api/solana/unlink - Unlink wallet
solana.post('/unlink', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB

  await db
    .prepare('UPDATE users SET wallet_address_v2 = NULL WHERE id = ?')
    .bind(user.userId)
    .run()

  return c.json({ success: true })
})

// GET /api/solana/nfts/:wallet - Get NFT books owned by wallet (placeholder, unchanged)
solana.get('/nfts/:wallet', async (c) => {
  const wallet = c.req.param('wallet')
  const db = c.env.DB

  const books = await db
    .prepare(
      `SELECT b.*, u.username as creator_username
       FROM books b
       JOIN creators c ON b.creator_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE u.wallet_address_v2 = ? AND b.status = 'published'`
    )
    .bind(wallet)
    .all()

  return c.json({
    wallet,
    items: books.results || []
  })
})

// POST /api/solana/mint - Mint book as NFT (placeholder, unchanged)
solana.post('/mint/:bookId', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string }
  const db = c.env.DB
  const bookId = c.req.param('bookId')

  const book = await db
    .prepare(
      `SELECT b.* FROM books b
       JOIN creators c ON b.creator_id = c.id
       WHERE b.id = ? AND c.user_id = ?`
    )
    .bind(bookId, user.userId)
    .first()

  if (!book) {
    return c.json({ error: 'BOOK_NOT_FOUND' }, 404)
  }

  return c.json({
    success: true,
    message: 'NFT minting initiated',
    book_id: bookId
  })
})

export default solana
