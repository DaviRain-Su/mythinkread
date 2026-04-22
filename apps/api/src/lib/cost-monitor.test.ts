import { describe, it, expect, beforeEach } from 'vitest'
import { recordUpload, getMonthlyTotals } from './cost-monitor'

/**
 * Verifies assertion A3.8-cost-monitor:
 *   recordUpload increments KV correctly under cost:<YYYY-MM>:<kind>.
 *   getMonthlyTotals returns the current month totals.
 */

function makeEnv() {
  const kvStore = new Map<string, string>()
  return {
    ENVIRONMENT: 'development',
    JWT_SECRET: 'unit-test-secret',
    DB: { prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [] }), run: async () => ({ success: true }) }) }) } as unknown,
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
    _kvStore: kvStore
  }
}

describe('recordUpload', () => {
  let env: ReturnType<typeof makeEnv>

  beforeEach(() => {
    env = makeEnv()
  })

  it('increments KV for ipfs uploads', async () => {
    await recordUpload(env as never, 'ipfs', 1024)
    const now = new Date()
    const key = `cost:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}:ipfs`
    const val = env._kvStore.get(key)
    expect(val).toBe('1024')
  })

  it('increments KV for arweave uploads', async () => {
    await recordUpload(env as never, 'arweave', 2048)
    const now = new Date()
    const key = `cost:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}:arweave`
    const val = env._kvStore.get(key)
    expect(val).toBe('2048')
  })

  it('increments KV for r2 uploads', async () => {
    await recordUpload(env as never, 'r2', 4096)
    const now = new Date()
    const key = `cost:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}:r2`
    const val = env._kvStore.get(key)
    expect(val).toBe('4096')
  })

  it('accumulates multiple uploads of the same kind', async () => {
    await recordUpload(env as never, 'ipfs', 1000)
    await recordUpload(env as never, 'ipfs', 2500)
    const now = new Date()
    const key = `cost:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}:ipfs`
    const val = env._kvStore.get(key)
    expect(val).toBe('3500')
  })
})

describe('getMonthlyTotals', () => {
  let env: ReturnType<typeof makeEnv>

  beforeEach(() => {
    env = makeEnv()
  })

  it('returns zeroes when no data exists', async () => {
    const totals = await getMonthlyTotals(env as never)
    expect(totals.ipfs).toBe(0)
    expect(totals.arweave).toBe(0)
    expect(totals.r2).toBe(0)
  })

  it('returns current month totals for all kinds', async () => {
    await recordUpload(env as never, 'ipfs', 1000)
    await recordUpload(env as never, 'arweave', 2000)
    await recordUpload(env as never, 'r2', 3000)

    const totals = await getMonthlyTotals(env as never)
    expect(totals.ipfs).toBe(1000)
    expect(totals.arweave).toBe(2000)
    expect(totals.r2).toBe(3000)
  })
})
