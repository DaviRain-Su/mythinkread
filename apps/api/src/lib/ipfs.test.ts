import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadToIPFS, getFromIPFS, uploadJSONToIPFS } from './ipfs'

/**
 * Verifies assertion A1.8-storage-prod-strict (IPFS portion):
 *  - In production, missing PINATA_JWT throws.
 *  - In dev, missing PINATA_JWT returns a __DEV_MOCK__ CID and logs warning.
 *  - Pinata upload uses multipart with metadata.
 *  - Retries on transient errors (3x exponential backoff).
 *  - No invalid `timeout` field in fetch RequestInit.
 */

function makeEnv(overrides: Partial<import('../index').Env> = {}) {
  return {
    ENVIRONMENT: 'development',
    PINATA_JWT: 'test-jwt',
    BUNDLR_PRIVATE_KEY: 'test-key',
    JWT_SECRET: 'test-secret',
    DB: {} as D1Database,
    KV: {} as KVNamespace,
    R2: {} as R2Bucket,
    QUEUE: {} as Queue,
    AI: {} as Ai,
    ...overrides
  } as import('../index').Env
}

describe('uploadToIPFS', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('throws in production when PINATA_JWT is missing', async () => {
    const env = makeEnv({ ENVIRONMENT: 'production', PINATA_JWT: '' })
    await expect(uploadToIPFS(env, 'hello', 'file.md')).rejects.toThrow(/Missing required secret: PINATA_JWT/)
  })

  it('returns __DEV_MOCK__ CID in dev when PINATA_JWT is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const env = makeEnv({ PINATA_JWT: '' })
    const cid = await uploadToIPFS(env, 'hello', 'file.md')
    expect(cid).toMatch(/^__DEV_MOCK__[0-9a-f]{44}$/)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️ DEV MOCK'))
    warnSpy.mockRestore()
  })

  it('uploads via Pinata with multipart metadata on success', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ IpfsHash: 'QmRealCid123' })
    } as Response)

    const env = makeEnv()
    const cid = await uploadToIPFS(env, 'chapter body', 'book-1-ch-1.md')

    expect(cid).toBe('QmRealCid123')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://api.pinata.cloud/pinning/pinFileToIPFS')
    expect(init?.method).toBe('POST')
    const headers = init?.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer test-jwt')

    const body = init?.body as FormData
    expect(body.get('file')).toBeInstanceOf(Blob)
    const metadata = body.get('pinataMetadata')
    expect(typeof metadata === 'string' ? metadata : '').toBe('{"name":"book-1-ch-1.md"}')

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
    await expect(uploadToIPFS(env, 'body', 'file.md')).rejects.toThrow(/IPFS upload failed after 3 attempts/)
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    fetchSpy.mockRestore()
  })

  it('succeeds on retry after transient failures', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ IpfsHash: 'QmRetryOk' })
      } as Response)

    const env = makeEnv()
    const cid = await uploadToIPFS(env, 'body', 'file.md')
    expect(cid).toBe('QmRetryOk')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    fetchSpy.mockRestore()
  })

  it('throws immediately on non-2xx Pinata response after exhausting retries', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    } as Response)

    const env = makeEnv()
    await expect(uploadToIPFS(env, 'body', 'file.md')).rejects.toThrow(/IPFS upload failed after 3 attempts/)
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    fetchSpy.mockRestore()
  })
})

describe('getFromIPFS', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('fetches content from the first successful gateway', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce({
        ok: true,
        text: async () => 'ipfs content'
      } as Response)

    const content = await getFromIPFS('Qm123')
    expect(content).toBe('ipfs content')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    // Ensure no invalid `timeout` field is present in RequestInit
    for (const [, init] of fetchSpy.mock.calls) {
      expect(init).not.toHaveProperty('timeout')
    }
    fetchSpy.mockRestore()
  })

  it('throws when all gateways fail', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'))
    await expect(getFromIPFS('Qm123')).rejects.toThrow(/Failed to fetch content from IPFS/)
  })
})

describe('uploadJSONToIPFS', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('stringifies data and delegates to uploadToIPFS', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ IpfsHash: 'QmJson' })
    } as Response)

    const env = makeEnv()
    const cid = await uploadJSONToIPFS(env, { hello: 'world' }, 'data.json')
    expect(cid).toBe('QmJson')

    const [, init] = fetchSpy.mock.calls[0]
    const body = init?.body as FormData
    const fileEntry = body.get('file')
    expect(fileEntry).toBeInstanceOf(Blob)
    const blob = fileEntry as unknown as Blob
    expect(await blob.text()).toBe(JSON.stringify({ hello: 'world' }, null, 2))
    fetchSpy.mockRestore()
  })
})
