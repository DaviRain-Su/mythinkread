import { describe, it, expect, beforeEach, vi } from 'vitest'
import tts from './tts'
import { createToken } from '../lib/jwt'

/**
 * Verifies assertions:
 *  - A1.9-tts-persisted: POST /api/tts/generate inserts a row in tts_audio_cache
 *    and stores audio bytes in R2 under tts/<id>.mp3. Subsequent identical call
 *    hits the cache (no duplicate insert).
 *  - A2.4-tts-player-real: audio_url returned is an R2-backed URL (not the
 *    mythinkread-assets.pages.dev mock host).
 *  - Unauthenticated requests are rejected with 401.
 */

function makeEnv(overrides: Partial<Record<string, unknown>> = {}) {
  const kvStore = new Map<string, string>()
  const r2Store = new Map<string, { body: Uint8Array; contentType?: string }>()
  const dbRows: Array<Record<string, unknown>> = []

  const prepare = vi.fn((sql: string) => {
    const chain = {
      _args: [] as unknown[],
      bind(...args: unknown[]) {
        chain._args = args
        return chain
      },
      async first() {
        const normalized = sql.replace(/\s+/g, ' ').trim()
        // Cache hit lookup
        if (normalized.startsWith('SELECT * FROM tts_audio_cache WHERE book_id = ? AND chapter_id = ? AND voice_id = ? AND text_hash = ? AND status =')) {
          const [bookId, chapterId, voiceId, textHash] = chain._args as [string, string, string, string]
          const hit = dbRows.find(
            (r) =>
              r.book_id === bookId &&
              r.chapter_id === chapterId &&
              r.voice_id === voiceId &&
              r.text_hash === textHash &&
              r.status === 'completed'
          )
          return hit ?? null
        }
        // Status lookup
        if (normalized.startsWith('SELECT * FROM tts_audio_cache WHERE id = ?')) {
          const [id] = chain._args as [string]
          return dbRows.find((r) => r.id === id) ?? null
        }
        // Chapter segments lookup
        if (normalized.startsWith('SELECT * FROM tts_audio_cache WHERE chapter_id = ? AND voice_id = ? AND status =')) {
          const [chapterId, voiceId] = chain._args as [string, string]
          return {
            results: dbRows.filter(
              (r) => r.chapter_id === chapterId && r.voice_id === voiceId && r.status === 'completed'
            )
          }
        }
        return null
      },
      async all() {
        const normalized = sql.replace(/\s+/g, ' ').trim()
        if (normalized.startsWith('SELECT * FROM tts_audio_cache WHERE chapter_id = ? AND voice_id = ? AND status =')) {
          const [chapterId, voiceId] = chain._args as [string, string]
          return {
            results: dbRows.filter(
              (r) => r.chapter_id === chapterId && r.voice_id === voiceId && r.status === 'completed'
            )
          }
        }
        return { results: [] }
      },
      async run() {
        const normalized = sql.replace(/\s+/g, ' ').trim()
        if (
          normalized.startsWith('INSERT INTO tts_audio_cache') ||
          normalized.startsWith('INSERT OR IGNORE INTO tts_audio_cache')
        ) {
          const row: Record<string, unknown> = {}
          // Extract column names from SQL
          const colMatch = normalized.match(/\(([^)]+)\)/)
          const cols = colMatch ? colMatch[1].split(',').map((c) => c.trim()) : []
          cols.forEach((col, i) => {
            row[col] = chain._args[i]
          })
          dbRows.push(row)
        }
        if (normalized.startsWith('UPDATE tts_audio_cache SET status = ?')) {
          const [status, audioUrl, duration, completedAt, id] = chain._args as [
            string,
            string,
            number,
            number,
            string
          ]
          const row = dbRows.find((r) => r.id === id)
          if (row) {
            row.status = status
            row.audio_url = audioUrl
            row.duration = duration
            row.completed_at = completedAt
          }
        }
        return { success: true }
      }
    }
    return chain
  })

  return {
    ENVIRONMENT: 'development',
    JWT_SECRET: 'unit-test-secret',
    AZURE_TTS_KEY: '',
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
    R2: {
      async put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null, opts?: { httpMetadata?: { contentType?: string } }) {
        let body: Uint8Array
        if (value instanceof ReadableStream) {
          const reader = value.getReader()
          const chunks: Uint8Array[] = []
          while (true) {
            const { done, value: chunk } = await reader.read()
            if (done) break
            chunks.push(chunk)
          }
          const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
          body = new Uint8Array(totalLength)
          let offset = 0
          for (const c of chunks) {
            body.set(c, offset)
            offset += c.length
          }
        } else if (value instanceof ArrayBuffer) {
          body = new Uint8Array(value)
        } else if (ArrayBuffer.isView(value)) {
          body = new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
        } else if (typeof value === 'string') {
          body = new TextEncoder().encode(value)
        } else if (value instanceof Blob) {
          const ab = await value.arrayBuffer()
          body = new Uint8Array(ab)
        } else {
          body = new Uint8Array(0)
        }
        r2Store.set(key, { body, contentType: opts?.httpMetadata?.contentType })
      },
      async get(key: string) {
        const obj = r2Store.get(key)
        if (!obj) return null
        return {
          body: obj.body,
          httpMetadata: { contentType: obj.contentType }
        } as unknown as R2ObjectBody
      }
    },
    AI: {
      async run(_model: string, _inputs: Record<string, unknown>) {
        // Return a mock MP3-like binary (ID3 header)
        return new Uint8Array([0x49, 0x44, 0x33, 0x04])
      }
    } as unknown as Ai,
    _kvStore: kvStore,
    _r2Store: r2Store,
    _dbRows: dbRows,
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

describe('POST /api/tts/generate', () => {
  let env: ReturnType<typeof makeEnv>

  beforeEach(() => {
    vi.restoreAllMocks()
    env = makeEnv()
  })

  it('rejects unauthenticated requests with 401', async () => {
    const res = await tts.fetch(
      new Request('http://x/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'hello', voice_id: 'zh-CN-XiaoxiaoNeural' })
      }),
      env as never
    )
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('UNAUTHORIZED')
  })

  it('returns 400 when text or voice_id is missing', async () => {
    const auth = await authHeader(env)
    const res = await tts.fetch(
      new Request('http://x/generate', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '', voice_id: 'zh-CN-XiaoxiaoNeural' })
      }),
      env as never
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('MISSING_PARAMS')
  })

  it('first generate path: creates DB row, stores audio in R2, returns real URL', async () => {
    const auth = await authHeader(env)
    const res = await tts.fetch(
      new Request('http://x/generate', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: 'book-1',
          chapter_id: 'ch-1',
          text: 'Hello world this is a test.',
          voice_id: 'zh-CN-XiaoxiaoNeural'
        })
      }),
      env as never
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as { id: string; status: string; audio_url: string; duration: number }
    expect(body.status).toBe('completed')
    expect(body.audio_url).not.toContain('mythinkread-assets.pages.dev')
    expect(body.audio_url).toContain('tts/')
    expect(body.audio_url).toContain('.mp3')
    expect(body.duration).toBeGreaterThan(0)

    // DB row inserted
    expect(env._dbRows).toHaveLength(1)
    const row = env._dbRows[0]
    expect(row.status).toBe('completed')
    expect(row.audio_url).toBe(body.audio_url)
    expect(row.duration).toBe(body.duration)

    // R2 object stored
    const r2Key = `tts/${body.id}.mp3`
    expect(env._r2Store.has(r2Key)).toBe(true)
    const r2Obj = env._r2Store.get(r2Key)!
    expect(r2Obj.body.length).toBeGreaterThan(0)
    expect(r2Obj.contentType).toBe('audio/mpeg')
  })

  it('cache-hit path: returns existing row without duplicate insert', async () => {
    const auth = await authHeader(env)
    const payload = {
      book_id: 'book-1',
      chapter_id: 'ch-1',
      text: 'Hello world this is a test.',
      voice_id: 'zh-CN-XiaoxiaoNeural'
    }

    // First call
    const res1 = await tts.fetch(
      new Request('http://x/generate', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }),
      env as never
    )
    expect(res1.status).toBe(200)
    const body1 = (await res1.json()) as { id: string; audio_url: string }

    // Second call with identical text+voice
    const res2 = await tts.fetch(
      new Request('http://x/generate', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }),
      env as never
    )
    expect(res2.status).toBe(200)
    const body2 = (await res2.json()) as { id: string; audio_url: string }

    // Same ID and URL
    expect(body2.id).toBe(body1.id)
    expect(body2.audio_url).toBe(body1.audio_url)

    // Only one DB row
    expect(env._dbRows).toHaveLength(1)
  })

  it('falls back to Azure TTS when AZURE_TTS_KEY is present', async () => {
    const azureEnv = makeEnv({ AZURE_TTS_KEY: 'azure-test-key' })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(8),
      headers: new Headers()
    } as Response)

    const auth = await authHeader(azureEnv)
    const res = await tts.fetch(
      new Request('http://x/generate', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: 'book-2',
          chapter_id: 'ch-2',
          text: 'Azure fallback test.',
          voice_id: 'zh-CN-XiaoxiaoNeural'
        })
      }),
      azureEnv as never
    )

    expect(res.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toContain('tts.speech.microsoft.com')
    expect(init?.method).toBe('POST')
    const headers = init?.headers as Record<string, string>
    expect(headers['Ocp-Apim-Subscription-Key']).toBe('azure-test-key')

    fetchSpy.mockRestore()
  })
})
