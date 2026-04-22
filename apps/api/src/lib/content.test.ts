import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getContent } from './content'

vi.mock('./ipfs', () => ({
  getFromIPFS: vi.fn()
}))
vi.mock('./arweave', () => ({
  getFromArweave: vi.fn()
}))

import { getFromIPFS } from './ipfs'
import { getFromArweave } from './arweave'

function makeKv(seed: Record<string, string> = {}) {
  const store: Record<string, string> = { ...seed }
  return {
    async get(k: string): Promise<string | null> {
      return store[k] ?? null
    },
    async put(k: string, v: string): Promise<void> {
      store[k] = v
    },
    async delete(k: string): Promise<void> {
      delete store[k]
    },
    _store: store
  }
}

describe('getContent multi-level fallback', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns from KV cache when available', async () => {
    const kv = makeKv({ 'chapter:c1': 'cached body' })
    const env = { KV: kv } as unknown as Parameters<typeof getContent>[0]
    const body = await getContent(env, { cacheKey: 'chapter:c1', cid: 'ignored', arweaveTx: 'ignored' })
    expect(body).toBe('cached body')
    expect(getFromIPFS).not.toHaveBeenCalled()
    expect(getFromArweave).not.toHaveBeenCalled()
  })

  it('falls back to IPFS on cache miss and rewrites cache', async () => {
    const kv = makeKv()
    ;(getFromIPFS as unknown as { mockResolvedValueOnce: (v: string) => void }).mockResolvedValueOnce('ipfs body')
    const env = { KV: kv } as unknown as Parameters<typeof getContent>[0]
    const body = await getContent(env, { cacheKey: 'chapter:c2', cid: 'Qm123' })
    expect(body).toBe('ipfs body')
    expect(kv._store['chapter:c2']).toBe('ipfs body')
  })

  it('falls back to Arweave when IPFS fails', async () => {
    const kv = makeKv()
    ;(getFromIPFS as unknown as { mockRejectedValueOnce: (e: Error) => void }).mockRejectedValueOnce(new Error('ipfs down'))
    ;(getFromArweave as unknown as { mockResolvedValueOnce: (v: string) => void }).mockResolvedValueOnce('arweave body')
    const env = { KV: kv } as unknown as Parameters<typeof getContent>[0]
    const body = await getContent(env, { cacheKey: 'chapter:c3', cid: 'Qm', arweaveTx: 'tx' })
    expect(body).toBe('arweave body')
    expect(kv._store['chapter:c3']).toBe('arweave body')
  })

  it('throws when every layer misses', async () => {
    const kv = makeKv()
    ;(getFromIPFS as unknown as { mockRejectedValueOnce: (e: Error) => void }).mockRejectedValueOnce(new Error('ipfs down'))
    ;(getFromArweave as unknown as { mockRejectedValueOnce: (e: Error) => void }).mockRejectedValueOnce(new Error('arweave down'))
    const env = { KV: kv } as unknown as Parameters<typeof getContent>[0]
    await expect(getContent(env, { cacheKey: 'chapter:c4', cid: 'Qm', arweaveTx: 'tx' })).rejects.toThrow(/not found/i)
  })
})
