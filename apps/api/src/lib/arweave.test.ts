import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadToArweave, getFromArweave, uploadJSONToArweave } from './arweave'

/**
 * Verifies assertion A1.8-storage-prod-strict (Arweave portion):
 *  - In production, missing BUNDLR_PRIVATE_KEY throws.
 *  - In dev, missing BUNDLR_PRIVATE_KEY returns a __DEV_MOCK__ tx and logs warning.
 *  - Upload uses a Workers-compatible path (Irys REST bundler / direct arweave.net tx).
 *  - No invalid `timeout` field in fetch RequestInit.
 */

function makeEnv(overrides: Partial<import('../index').Env> = {}) {
  return {
    ENVIRONMENT: 'development',
    PINATA_JWT: 'test-jwt',
    BUNDLR_PRIVATE_KEY: 'test-private-key',
    JWT_SECRET: 'test-secret',
    DB: {} as D1Database,
    KV: {} as KVNamespace,
    R2: {} as R2Bucket,
    QUEUE: {} as Queue,
    AI: {} as Ai,
    ...overrides
  } as import('../index').Env
}

describe('uploadToArweave', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('throws in production when BUNDLR_PRIVATE_KEY is missing', async () => {
    const env = makeEnv({ ENVIRONMENT: 'production', BUNDLR_PRIVATE_KEY: '' })
    await expect(uploadToArweave(env, 'hello')).rejects.toThrow(/Missing required secret: BUNDLR_PRIVATE_KEY/)
  })

  it('returns __DEV_MOCK__ tx in dev when BUNDLR_PRIVATE_KEY is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const env = makeEnv({ BUNDLR_PRIVATE_KEY: '' })
    const tx = await uploadToArweave(env, 'hello')
    expect(tx).toMatch(/^__DEV_MOCK__[0-9a-f]{16}$/)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️ DEV MOCK'))
    warnSpy.mockRestore()
  })

  it('uploads via Irys REST bundler with correct headers and tags', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'real-tx-id-123' })
    } as Response)

    const env = makeEnv()
    const tx = await uploadToArweave(env, 'chapter body', { 'App-Name': 'MyThinkRead', 'Content-Type': 'text/markdown' })

    expect(tx).toBe('real-tx-id-123')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://node1.bundlr.network/tx/matic')
    expect(init?.method).toBe('POST')

    const headers = init?.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/octet-stream')
    expect(headers['x-irys-public-key']).toBe('test-private-key')

    // Ensure no invalid `timeout` field is present in RequestInit
    expect(init).not.toHaveProperty('timeout')

    fetchSpy.mockRestore()
  })

  it('retries up to 3 times on transient failure then throws', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('network 1'))
      .mockRejectedValueOnce(new Error('network 2'))
      .mockRejectedValueOnce(new Error('network 3'))

    const env = makeEnv()
    await expect(uploadToArweave(env, 'body')).rejects.toThrow(/Arweave upload failed after 3 attempts/)
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    fetchSpy.mockRestore()
  })

  it('succeeds on retry after transient failures', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'retry-ok-tx' })
      } as Response)

    const env = makeEnv()
    const tx = await uploadToArweave(env, 'body')
    expect(tx).toBe('retry-ok-tx')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    fetchSpy.mockRestore()
  })

  it('throws immediately on non-2xx response after exhausting retries', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => 'Bad Gateway'
    } as Response)

    const env = makeEnv()
    await expect(uploadToArweave(env, 'body')).rejects.toThrow(/Arweave upload failed after 3 attempts/)
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    fetchSpy.mockRestore()
  })
})

describe('getFromArweave', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('fetches content from arweave.net', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => 'arweave content'
    } as Response)

    const content = await getFromArweave('tx123')
    expect(content).toBe('arweave content')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://arweave.net/tx123')
    expect(init).not.toHaveProperty('timeout')
    fetchSpy.mockRestore()
  })

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404
    } as Response)

    await expect(getFromArweave('tx123')).rejects.toThrow(/Failed to fetch from Arweave/)
  })
})

describe('uploadJSONToArweave', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('stringifies data and delegates to uploadToArweave', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'json-tx' })
    } as Response)

    const env = makeEnv()
    const tx = await uploadJSONToArweave(env, { hello: 'world' })
    expect(tx).toBe('json-tx')

    const [, init] = fetchSpy.mock.calls[0]
    const body = init?.body as ArrayBufferView
    expect(new TextDecoder().decode(body as unknown as ArrayBufferView)).toBe(JSON.stringify({ hello: 'world' }, null, 2))
    fetchSpy.mockRestore()
  })
})
