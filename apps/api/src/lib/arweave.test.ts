import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadToArweave, getFromArweave, uploadJSONToArweave } from './arweave'

/**
 * Verifies assertion A1.8-storage-prod-strict (Arweave portion):
 *  - In production, missing BUNDLR_PRIVATE_KEY throws.
 *  - In dev, missing BUNDLR_PRIVATE_KEY returns a __DEV_MOCK__ tx and logs warning.
 *  - Upload uses the modern Irys SDK with Solana payment.
 *  - Retries on transient errors (3x exponential backoff).
 */

function makeEnv(overrides: Partial<import('../index').Env> = {}) {
  // A valid-looking JSON keypair (64 bytes) so getIrysUploader can parse it.
  const dummyKeypair = JSON.stringify(Array.from({ length: 64 }, (_, i) => i))
  return {
    ENVIRONMENT: 'development',
    PINATA_JWT: 'test-jwt',
    BUNDLR_PRIVATE_KEY: dummyKeypair,
    JWT_SECRET: 'test-secret',
    DB: {} as D1Database,
    KV: {} as KVNamespace,
    R2: {} as R2Bucket,
    QUEUE: {} as Queue,
    AI: {} as Ai,
    ...overrides
  } as import('../index').Env
}

// Mock the Irys SDK modules so we never hit the network.
const mockUpload = vi.fn()
const mockWithWallet = vi.fn().mockReturnValue({ withRpc: vi.fn().mockReturnValue({ upload: mockUpload }) })
const mockUploader = vi.fn().mockReturnValue({ withWallet: mockWithWallet })
const mockSolana = vi.fn().mockReturnValue({})

vi.mock('@irys/upload', () => ({ Uploader: mockUploader }))
vi.mock('@irys/upload-solana', () => ({ Solana: mockSolana }))

describe('uploadToArweave', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUpload.mockReset()
    mockWithWallet.mockClear()
    mockUploader.mockClear()
    mockSolana.mockClear()
  })

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

  it('uploads via Irys SDK with Solana payment and tags', async () => {
    mockUpload.mockResolvedValueOnce({ id: 'real-tx-id-123' })

    const env = makeEnv()
    const tx = await uploadToArweave(env, 'chapter body', { 'App-Name': 'MyThinkRead', 'Content-Type': 'text/markdown' })

    expect(tx).toBe('real-tx-id-123')
    expect(mockUploader).toHaveBeenCalledTimes(1)
    expect(mockWithWallet).toHaveBeenCalledTimes(1)
    expect(mockUpload).toHaveBeenCalledTimes(1)

    const uploadCall = mockUpload.mock.calls[0]
    const uploadedData = uploadCall[0] as Uint8Array
    expect(new TextDecoder().decode(uploadedData)).toBe('chapter body')

    const uploadOpts = uploadCall[1] as { tags?: Array<{ name: string; value: string }> }
    expect(uploadOpts.tags).toEqual([
      { name: 'App-Name', value: 'MyThinkRead' },
      { name: 'Content-Type', value: 'text/markdown' }
    ])
  })

  it('retries up to 3 times on transient failure then throws', async () => {
    mockUpload
      .mockRejectedValueOnce(new Error('network 1'))
      .mockRejectedValueOnce(new Error('network 2'))
      .mockRejectedValueOnce(new Error('network 3'))

    const env = makeEnv()
    await expect(uploadToArweave(env, 'body')).rejects.toThrow(/Arweave upload failed after 3 attempts/)
    expect(mockUpload).toHaveBeenCalledTimes(3)
  })

  it('succeeds on retry after transient failures', async () => {
    mockUpload
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ id: 'retry-ok-tx' })

    const env = makeEnv()
    const tx = await uploadToArweave(env, 'body')
    expect(tx).toBe('retry-ok-tx')
    expect(mockUpload).toHaveBeenCalledTimes(2)
  })

  it('throws immediately on SDK error after exhausting retries', async () => {
    mockUpload.mockRejectedValue(new Error('SDK exploded'))

    const env = makeEnv()
    await expect(uploadToArweave(env, 'body')).rejects.toThrow(/Arweave upload failed after 3 attempts/)
    expect(mockUpload).toHaveBeenCalledTimes(3)
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
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUpload.mockReset()
    mockWithWallet.mockClear()
    mockUploader.mockClear()
    mockSolana.mockClear()
  })

  it('stringifies data and delegates to uploadToArweave', async () => {
    mockUpload.mockResolvedValueOnce({ id: 'json-tx' })

    const env = makeEnv()
    const tx = await uploadJSONToArweave(env, { hello: 'world' })
    expect(tx).toBe('json-tx')

    expect(mockUpload).toHaveBeenCalledTimes(1)
    const uploadCall = mockUpload.mock.calls[0]
    const uploadedData = uploadCall[0] as Uint8Array
    expect(new TextDecoder().decode(uploadedData)).toBe(JSON.stringify({ hello: 'world' }, null, 2))
  })
})
