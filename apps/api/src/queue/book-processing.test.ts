import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleBookProcessing } from './book-processing'

// Mock the storage libs so we don't hit network
vi.mock('../lib/ipfs', () => ({
  uploadToIPFS: vi.fn(async (_env: unknown, _content: string, filename: string) => `cid-for-${filename}`),
  uploadJSONToIPFS: vi.fn(async (_env: unknown, _data: unknown, filename: string) => `cid-structured-${filename}`),
  getFromIPFS: vi.fn()
}))

vi.mock('../lib/arweave', () => ({
  uploadToArweave: vi.fn(async (_env: unknown, _content: string, tags?: Record<string, string>) => `tx-for-${tags?.['Chapter-Id'] ?? 'book'}`),
  uploadJSONToArweave: vi.fn(async (_env: unknown, _data: unknown, tags?: Record<string, string>) => `tx-structured-${tags?.['Book-Id'] ?? 'x'}`),
  getFromArweave: vi.fn()
}))

type Row = Record<string, unknown>

// A minimal in-memory D1 stub that tracks prepare/bind/run calls
function makeDb(seed: {
  bookId: string
  book: Row
  chapters: Row[]
}) {
  const updates: { sql: string; params: unknown[] }[] = []
  const chapters = seed.chapters.map((c) => ({ ...c }))
  const prepare = (sql: string) => {
    const normalized = sql.replace(/\s+/g, ' ').trim()
    return {
      bind(...params: unknown[]) {
        return {
          async first(): Promise<Row | null> {
            if (normalized.startsWith('SELECT title, description, author, tags, ai_mode, ai_ratio FROM books')) {
              return seed.book
            }
            return null
          },
          async all(): Promise<{ results: Row[] }> {
            if (normalized.startsWith('SELECT id, idx, title, content_cid, word_count FROM chapters')) {
              return { results: chapters }
            }
            return { results: [] }
          },
          async run(): Promise<{ success: boolean }> {
            updates.push({ sql: normalized, params })
            // Apply chapter update to our in-memory copy for assertion convenience
            if (normalized.startsWith('UPDATE chapters SET content_cid = ?, arweave_tx = ? WHERE id = ?')) {
              const [cid, tx, id] = params as [string, string, string]
              const ch = chapters.find((c) => c.id === id)
              if (ch) {
                ch.content_cid = cid
                ch.arweave_tx = tx
              }
            }
            return { success: true }
          }
        }
      }
    }
  }
  return {
    prepare,
    _updates: updates,
    _chapters: chapters
  }
}

function makeKv(drafts: Record<string, string>) {
  const puts: Record<string, string> = {}
  return {
    async get(key: string): Promise<string | null> {
      return drafts[key] ?? null
    },
    async put(key: string, value: string, _opts?: unknown): Promise<void> {
      puts[key] = value
    },
    async delete(_key: string): Promise<void> {},
    _puts: puts
  }
}

describe('handleBookProcessing', () => {
  const bookId = 'book-1'
  const chapterId1 = 'ch-1'
  const chapterId2 = 'ch-2'

  let db: ReturnType<typeof makeDb>
  let kv: ReturnType<typeof makeKv>
  let env: {
    DB: ReturnType<typeof makeDb>
    KV: ReturnType<typeof makeKv>
    PINATA_JWT: string
    BUNDLR_PRIVATE_KEY: string
    ENVIRONMENT: string
  }

  beforeEach(() => {
    vi.clearAllMocks()
    db = makeDb({
      bookId,
      book: {
        title: 'My Book',
        description: 'desc',
        author: 'alice',
        tags: JSON.stringify(['sci-fi']),
        ai_mode: 'ai_only',
        ai_ratio: 100
      },
      chapters: [
        { id: chapterId1, idx: 0, title: 'Ch 1', content_cid: '', word_count: 11 },
        { id: chapterId2, idx: 1, title: 'Ch 2', content_cid: '', word_count: 22 }
      ]
    })
    kv = makeKv({
      [`chapter:draft:${chapterId1}`]: 'Chapter one body text',
      [`chapter:draft:${chapterId2}`]: 'Chapter two body text'
    })
    env = {
      DB: db,
      KV: kv,
      PINATA_JWT: 'x',
      BUNDLR_PRIVATE_KEY: 'y',
      ENVIRONMENT: 'development'
    }
  })

  it('uploads every chapter body to IPFS and Arweave', async () => {
    await handleBookProcessing(env as unknown as Parameters<typeof handleBookProcessing>[0], {
      type: 'publish_book',
      bookId,
      userId: 'user-1'
    })

    const { uploadToIPFS } = await import('../lib/ipfs')
    const { uploadToArweave } = await import('../lib/arweave')
    // Each chapter should have been uploaded to both providers
    expect(uploadToIPFS).toHaveBeenCalledTimes(2)
    expect(uploadToArweave).toHaveBeenCalledTimes(2)
  })

  it('writes content_cid and arweave_tx to chapters table', async () => {
    await handleBookProcessing(env as unknown as Parameters<typeof handleBookProcessing>[0], {
      type: 'publish_book',
      bookId,
      userId: 'user-1'
    })

    // Both chapter rows should be updated with non-empty cid + tx.
    for (const ch of db._chapters) {
      expect(ch.content_cid).toBeTruthy()
      expect(ch.arweave_tx).toBeTruthy()
      expect(String(ch.content_cid)).not.toEqual('')
      expect(String(ch.arweave_tx)).not.toEqual('')
    }

    // A chapter-level UPDATE must have happened for each chapter.
    const chapterUpdates = db._updates.filter((u) =>
      u.sql.startsWith('UPDATE chapters SET content_cid = ?, arweave_tx = ? WHERE id = ?')
    )
    expect(chapterUpdates).toHaveLength(2)
  })

  it('marks book as published and caches structured content in KV', async () => {
    await handleBookProcessing(env as unknown as Parameters<typeof handleBookProcessing>[0], {
      type: 'publish_book',
      bookId,
      userId: 'user-1'
    })

    const bookUpdate = db._updates.find((u) => u.sql.includes("status = 'published'"))
    expect(bookUpdate).toBeDefined()

    // KV should have been populated with structured book content.
    expect(Object.keys(kv._puts).some((k) => k === `book:${bookId}`)).toBe(true)
  })

  it('marks book as publish_failed when KV draft is missing for a chapter', async () => {
    // Remove one draft to force failure
    kv = makeKv({ [`chapter:draft:${chapterId1}`]: 'only chapter one body' })
    env.KV = kv

    await expect(
      handleBookProcessing(env as unknown as Parameters<typeof handleBookProcessing>[0], {
        type: 'publish_book',
        bookId,
        userId: 'user-1'
      })
    ).rejects.toThrow(/draft|KV|chapter/i)

    const failedUpdate = db._updates.find((u) => u.sql.includes("status = 'publish_failed'"))
    expect(failedUpdate).toBeDefined()
  })
})
