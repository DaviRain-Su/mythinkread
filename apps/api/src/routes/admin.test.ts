import { describe, it, expect, beforeEach } from 'vitest'
import admin from './admin'
import { createToken } from '../lib/jwt'

/**
 * Verifies assertion A3.8-cost-monitor (admin endpoint part):
 *   GET /api/admin/storage-cost requires admin role and returns current month totals.
 */

function makeEnv(overrides: Partial<Record<string, unknown>> = {}) {
  const kvStore = new Map<string, string>()
  const userRows: Array<{ id: string; role: string }> = [
    { id: 'user-1', role: 'reader' },
    { id: 'user-2', role: 'admin' }
  ]

  const prepare = (sql: string) => {
    const chain = {
      _args: [] as unknown[],
      bind(...args: unknown[]) {
        chain._args = args
        return chain
      },
      async first() {
        if (sql.includes('SELECT role FROM users WHERE id = ?')) {
          const [userId] = chain._args as [string]
          const user = userRows.find((u) => u.id === userId)
          return user ?? null
        }
        return null
      },
      async all() {
        return { results: [] }
      },
      async run() {
        return { success: true }
      }
    }
    return chain
  }

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
    ...overrides
  }
}

async function authHeader(env: { ENVIRONMENT: string; JWT_SECRET: string }, userId = 'user-1', role = 'reader') {
  const token = await createToken({ userId, username: 'alice', role }, env)
  return `Bearer ${token}`
}

describe('GET /api/admin/storage-cost', () => {
  let env: ReturnType<typeof makeEnv>

  beforeEach(() => {
    env = makeEnv()
  })

  it('returns 401 without Authorization header', async () => {
    const res = await admin.fetch(
      new Request('http://x/storage-cost', { method: 'GET' }),
      env as never
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin user', async () => {
    const auth = await authHeader(env, 'user-1', 'reader')
    const res = await admin.fetch(
      new Request('http://x/storage-cost', {
        method: 'GET',
        headers: { Authorization: auth }
      }),
      env as never
    )
    expect(res.status).toBe(403)
  })

  it('returns current month totals for admin', async () => {
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    env._kvStore.set(`cost:${monthKey}:ipfs`, '5000')
    env._kvStore.set(`cost:${monthKey}:arweave`, '3000')
    env._kvStore.set(`cost:${monthKey}:r2`, '2000')

    const auth = await authHeader(env, 'user-2', 'admin')
    const res = await admin.fetch(
      new Request('http://x/storage-cost', {
        method: 'GET',
        headers: { Authorization: auth }
      }),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ipfs: number; arweave: number; r2: number; month: string }
    expect(body.ipfs).toBe(5000)
    expect(body.arweave).toBe(3000)
    expect(body.r2).toBe(2000)
    expect(body.month).toBe(monthKey)
  })

  it('returns zeroes when no cost data exists', async () => {
    const auth = await authHeader(env, 'user-2', 'admin')
    const res = await admin.fetch(
      new Request('http://x/storage-cost', {
        method: 'GET',
        headers: { Authorization: auth }
      }),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ipfs: number; arweave: number; r2: number }
    expect(body.ipfs).toBe(0)
    expect(body.arweave).toBe(0)
    expect(body.r2).toBe(0)
  })
})
