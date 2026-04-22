import { describe, it, expect, beforeEach, vi } from 'vitest'
import books from './books'
import { createToken } from '../lib/jwt'

/**
 * Verifies assertion A1.7-ai-ratio-gate (PRD Task 3.4):
 *
 *   `POST /api/books/:id/publish` must compute the Levenshtein-based
 *   edit ratio between the stored AI draft and the final chapter body
 *   when `ai_mode != 'ai_only'`. If ratio < 0.20, reject with HTTP 422
 *   and `{ error: 'AI_RATIO_TOO_LOW', measured, required: 0.20 }`.
 */

type BookRow = {
  id: string
  status: string
  ai_mode: string
  creator_user_id: string
}

type ChapterRow = {
  id: string
  book_id: string
  idx: number
}

function makeEnv(seed: {
  book: BookRow
  chapters: ChapterRow[]
  kv?: Record<string, string>
}) {
  const kvStore = new Map<string, string>(Object.entries(seed.kv ?? {}))
  const queueSends: unknown[] = []
  const bookUpdates: Array<{ sql: string; params: unknown[] }> = []

  // Minimal D1 stub: matches the SQL shapes in routes/books.ts.
  const prepare = (sql: string) => {
    const normalized = sql.replace(/\s+/g, ' ').trim()
    const chain = {
      _args: [] as unknown[],
      bind(...args: unknown[]) {
        chain._args = args
        return chain
      },
      async first() {
        // Authorization + ownership check used by the publish route.
        if (normalized.startsWith('SELECT b.* FROM books b JOIN creators c ON b.creator_id = c.id WHERE b.id = ? AND c.user_id = ?')) {
          const [bookId, userId] = chain._args as [string, string]
          if (bookId !== seed.book.id || userId !== seed.book.creator_user_id) return null
          return {
            id: seed.book.id,
            status: seed.book.status,
            ai_mode: seed.book.ai_mode
          }
        }
        return null
      },
      async all() {
        if (normalized.startsWith('SELECT id FROM chapters WHERE book_id = ? ORDER BY idx')) {
          return { results: seed.chapters.map((c) => ({ id: c.id })) }
        }
        return { results: [] }
      },
      async run() {
        if (normalized.startsWith("UPDATE books SET status = 'publishing'")) {
          bookUpdates.push({ sql: normalized, params: chain._args })
          seed.book.status = 'publishing'
        }
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
    QUEUE: {
      async send(msg: unknown) {
        queueSends.push(msg)
      }
    },
    _kvStore: kvStore,
    _queueSends: queueSends,
    _bookUpdates: bookUpdates
  }
}

async function authHeader(env: { ENVIRONMENT: string; JWT_SECRET: string }, userId = 'user-1') {
  const token = await createToken(
    { userId, username: 'alice', role: 'creator' },
    env
  )
  return `Bearer ${token}`
}

describe('POST /api/books/:id/publish — AI edit-ratio gate (F3)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects with 422 AI_RATIO_TOO_LOW when hybrid book edited < 20%', async () => {
    const aiDraft = 'The sun rose slowly over the quiet village, painting the rooftops gold.'
    // Author only changed a few characters at the end — ratio ≈ 0.04.
    const finalBody = 'The sun rose slowly over the quiet village, painting the rooftops red!'

    const env = makeEnv({
      book: {
        id: 'book-1',
        status: 'draft',
        ai_mode: 'light_hybrid',
        creator_user_id: 'user-1'
      },
      chapters: [{ id: 'ch-1', book_id: 'book-1', idx: 0 }],
      kv: {
        'chapter:ai-draft:ch-1': 'draft-xyz',
        'draft:ai:draft-xyz': aiDraft,
        'chapter:draft:ch-1': finalBody
      }
    })

    const auth = await authHeader(env)
    const res = await books.fetch(
      new Request('http://x/book-1/publish', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' }
      }),
      env as never
    )

    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string; measured: number; required: number }
    expect(body.error).toBe('AI_RATIO_TOO_LOW')
    expect(body.required).toBe(0.20)
    expect(body.measured).toBeGreaterThanOrEqual(0)
    expect(body.measured).toBeLessThan(0.20)
    // Must not have dispatched a publish job.
    expect(env._queueSends).toHaveLength(0)
    // Status must not have been flipped to publishing.
    expect(env._bookUpdates).toHaveLength(0)
  })

  it('accepts (202/200) when hybrid book edited > 20% vs the AI draft', async () => {
    const aiDraft = 'The sun rose slowly over the quiet village, painting the rooftops gold.'
    const finalBody = 'Dawn crept through the fog, and the old fisherman pushed his boat out to sea.'

    const env = makeEnv({
      book: {
        id: 'book-1',
        status: 'draft',
        ai_mode: 'heavy_hybrid',
        creator_user_id: 'user-1'
      },
      chapters: [{ id: 'ch-1', book_id: 'book-1', idx: 0 }],
      kv: {
        'chapter:ai-draft:ch-1': 'draft-xyz',
        'draft:ai:draft-xyz': aiDraft,
        'chapter:draft:ch-1': finalBody
      }
    })

    const auth = await authHeader(env)
    const res = await books.fetch(
      new Request('http://x/book-1/publish', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' }
      }),
      env as never
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; id: string }
    expect(body.status).toBe('publishing')
    expect(body.id).toBe('book-1')
    // Should have enqueued the publish job.
    expect(env._queueSends).toEqual([
      { type: 'publish_book', bookId: 'book-1', userId: 'user-1' }
    ])
  })

  it('does NOT apply the gate when ai_mode is ai_only', async () => {
    const aiDraft = 'An AI-only book body.'
    const finalBody = aiDraft // identical — ratio 0, would fail the gate if applied

    const env = makeEnv({
      book: {
        id: 'book-1',
        status: 'draft',
        ai_mode: 'ai_only',
        creator_user_id: 'user-1'
      },
      chapters: [{ id: 'ch-1', book_id: 'book-1', idx: 0 }],
      kv: {
        'chapter:ai-draft:ch-1': 'draft-xyz',
        'draft:ai:draft-xyz': aiDraft,
        'chapter:draft:ch-1': finalBody
      }
    })

    const auth = await authHeader(env)
    const res = await books.fetch(
      new Request('http://x/book-1/publish', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' }
      }),
      env as never
    )

    expect(res.status).toBe(200)
    expect(env._queueSends).toHaveLength(1)
  })

  it('does not penalise chapters that were 100% human-written (no ai_draft_id stored)', async () => {
    // Two chapters: one mapped to an AI draft (small edit), one purely human.
    // Weighted aggregate should still be dominated by the AI-mapped chapter,
    // which is < 20% so we expect a 422.
    const aiDraft = 'Exactly the same sentence, with a tiny tweak.'
    const finalAi = 'Exactly the same sentence, with a tiny tweek.' // 1 char change
    const humanOnly = 'An entirely human-written second chapter that has no ai_draft_id.'

    const env = makeEnv({
      book: {
        id: 'book-1',
        status: 'draft',
        ai_mode: 'light_hybrid',
        creator_user_id: 'user-1'
      },
      chapters: [
        { id: 'ch-1', book_id: 'book-1', idx: 0 },
        { id: 'ch-2', book_id: 'book-1', idx: 1 }
      ],
      kv: {
        'chapter:ai-draft:ch-1': 'draft-xyz',
        'draft:ai:draft-xyz': aiDraft,
        'chapter:draft:ch-1': finalAi,
        // Note: no `chapter:ai-draft:ch-2` — the human chapter is skipped.
        'chapter:draft:ch-2': humanOnly
      }
    })

    const auth = await authHeader(env)
    const res = await books.fetch(
      new Request('http://x/book-1/publish', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' }
      }),
      env as never
    )

    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('AI_RATIO_TOO_LOW')
  })

  it('allows hybrid book to publish when no ai_draft_id was ever stored (fully human)', async () => {
    const env = makeEnv({
      book: {
        id: 'book-1',
        status: 'draft',
        ai_mode: 'light_hybrid',
        creator_user_id: 'user-1'
      },
      chapters: [{ id: 'ch-1', book_id: 'book-1', idx: 0 }],
      kv: {
        'chapter:draft:ch-1': 'Entirely hand-written chapter body.'
      }
    })

    const auth = await authHeader(env)
    const res = await books.fetch(
      new Request('http://x/book-1/publish', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' }
      }),
      env as never
    )

    expect(res.status).toBe(200)
    expect(env._queueSends).toHaveLength(1)
  })

  it('returns 401 without an Authorization header', async () => {
    const env = makeEnv({
      book: {
        id: 'book-1',
        status: 'draft',
        ai_mode: 'light_hybrid',
        creator_user_id: 'user-1'
      },
      chapters: [{ id: 'ch-1', book_id: 'book-1', idx: 0 }]
    })

    const res = await books.fetch(
      new Request('http://x/book-1/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }),
      env as never
    )
    expect(res.status).toBe(401)
  })
})
