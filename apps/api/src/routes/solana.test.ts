import { describe, it, expect, beforeEach, vi } from 'vitest'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import solana from './solana'
import { createToken } from '../lib/jwt'

/**
 * Verifies assertions:
 *  - A1.6-solana-sig-verified: real ed25519 check; 'mock_signature' rejected with 400
 *  - F2(3): GET /api/solana/nonce issues a nonce that can be stored + later consumed
 */

function makeEnv(overrides: Partial<Record<string, unknown>> = {}) {
  const kvStore = new Map<string, string>()
  const userRow: { id: string; wallet_address_v2: string | null } = {
    id: 'user-1',
    wallet_address_v2: null
  }

  const prepare = vi.fn((sql: string) => {
    const chain = {
      _args: [] as unknown[],
      bind(...args: unknown[]) {
        chain._args = args
        return chain
      },
      async first() {
        if (sql.includes('SELECT wallet_address_v2')) {
          return { wallet_address_v2: userRow.wallet_address_v2 }
        }
        return null
      },
      async run() {
        if (sql.includes('UPDATE users SET wallet_address_v2 = ?')) {
          userRow.wallet_address_v2 = chain._args[0] as string | null
        }
        if (sql.includes('UPDATE users SET wallet_address_v2 = NULL')) {
          userRow.wallet_address_v2 = null
        }
        return { success: true }
      },
      async all() {
        return { results: [] }
      }
    }
    return chain
  })

  return {
    ENVIRONMENT: 'development',
    JWT_SECRET: 'unit-test-secret',
    DB: { prepare } as unknown,
    KV: {
      async get(k: string) {
        return kvStore.get(k) ?? null
      },
      async put(k: string, v: string, _opts?: unknown) {
        kvStore.set(k, v)
      },
      async delete(k: string) {
        kvStore.delete(k)
      }
    },
    _kvStore: kvStore,
    _userRow: userRow,
    ...overrides
  }
}

async function authHeader(env: { ENVIRONMENT: string; JWT_SECRET: string }) {
  const token = await createToken(
    { userId: 'user-1', username: 'alice', role: 'reader' },
    env
  )
  return `Bearer ${token}`
}

describe('POST /api/solana/link', () => {
  let env: ReturnType<typeof makeEnv>

  beforeEach(() => {
    env = makeEnv()
  })

  it('rejects literal "mock_signature" with 400', async () => {
    const auth = await authHeader(env)
    // Seed a valid-looking nonce that was issued
    const wallet = '11111111111111111111111111111111' // valid-looking base58-ish length
    env._kvStore.set(`solana:nonce:${wallet}`, 'nonce-abc')

    const res = await solana.fetch(
      new Request('http://x/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({
          wallet_address: wallet,
          signature: 'mock_signature',
          message: 'nonce-abc'
        })
      }),
      env as never
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/INVALID_SIGNATURE|MOCK_SIGNATURE_REJECTED|VERIFICATION_FAILED/)
  })

  it('accepts a real ed25519 signature signed over the issued nonce', async () => {
    const auth = await authHeader(env)
    const kp = nacl.sign.keyPair()
    const walletAddress = bs58.encode(kp.publicKey)

    // Simulate nonce issuance:
    const nonce = 'test-nonce-xyz-123'
    env._kvStore.set(`solana:nonce:${walletAddress}`, nonce)

    const messageBytes = new TextEncoder().encode(nonce)
    const sigBytes = nacl.sign.detached(messageBytes, kp.secretKey)
    const signatureB58 = bs58.encode(sigBytes)

    const res = await solana.fetch(
      new Request('http://x/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({
          wallet_address: walletAddress,
          signature: signatureB58,
          message: nonce
        })
      }),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; wallet_address: string }
    expect(body.success).toBe(true)
    expect(body.wallet_address).toBe(walletAddress)
    expect(env._userRow.wallet_address_v2).toBe(walletAddress)
  })

  it('rejects a signature that is valid bs58 but wrong for the keypair', async () => {
    const auth = await authHeader(env)
    const kpA = nacl.sign.keyPair()
    const kpB = nacl.sign.keyPair()
    const walletA = bs58.encode(kpA.publicKey)
    const nonce = 'attacker-nonce'
    env._kvStore.set(`solana:nonce:${walletA}`, nonce)

    // Sign with B but claim to be A
    const sig = nacl.sign.detached(new TextEncoder().encode(nonce), kpB.secretKey)
    const res = await solana.fetch(
      new Request('http://x/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({
          wallet_address: walletA,
          signature: bs58.encode(sig),
          message: nonce
        })
      }),
      env as never
    )
    expect(res.status).toBe(400)
  })

  it('rejects when the message does not match the stored nonce', async () => {
    const auth = await authHeader(env)
    const kp = nacl.sign.keyPair()
    const wallet = bs58.encode(kp.publicKey)
    env._kvStore.set(`solana:nonce:${wallet}`, 'real-nonce')

    const sig = nacl.sign.detached(new TextEncoder().encode('other-nonce'), kp.secretKey)
    const res = await solana.fetch(
      new Request('http://x/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({
          wallet_address: wallet,
          signature: bs58.encode(sig),
          message: 'other-nonce'
        })
      }),
      env as never
    )
    expect(res.status).toBe(400)
  })

  it('rejects missing parameters with 400', async () => {
    const auth = await authHeader(env)
    const res = await solana.fetch(
      new Request('http://x/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({ wallet_address: 'abc' })
      }),
      env as never
    )
    expect(res.status).toBe(400)
  })

  it('rejects unauthenticated requests with 401', async () => {
    const res = await solana.fetch(
      new Request('http://x/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: 'abc',
          signature: 'x',
          message: 'y'
        })
      }),
      env as never
    )
    expect(res.status).toBe(401)
  })
})

describe('GET /api/solana/nonce', () => {
  it('issues a random nonce for a given wallet and stores it in KV', async () => {
    const env = makeEnv()
    const auth = await authHeader(env)
    // Valid base58 Solana pubkey derived from a real keypair (32 bytes).
    const wallet = bs58.encode(nacl.sign.keyPair().publicKey)

    const res = await solana.fetch(
      new Request(`http://x/nonce?wallet=${wallet}`, {
        method: 'GET',
        headers: { Authorization: auth }
      }),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { nonce: string; message: string }
    expect(typeof body.nonce).toBe('string')
    expect(body.nonce.length).toBeGreaterThanOrEqual(16)
    expect(env._kvStore.get(`solana:nonce:${wallet}`)).toBe(body.nonce)
  })

  it('requires a wallet query parameter', async () => {
    const env = makeEnv()
    const auth = await authHeader(env)
    const res = await solana.fetch(
      new Request('http://x/nonce', {
        method: 'GET',
        headers: { Authorization: auth }
      }),
      env as never
    )
    expect(res.status).toBe(400)
  })
})
