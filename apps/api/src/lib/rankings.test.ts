import { describe, it, expect, beforeEach } from 'vitest'
import { recomputeRankings } from './rankings'

/**
 * Verifies assertion A1.10-rankings-cron:
 *   scheduled() handler calls recomputeRankings which updates rankings rows
 *   for hot/new/rated/trending across daily/weekly/monthly/all_time windows.
 */

function makeEnv(seed: {
  books?: Array<{
    id: string
    creator_id: string
    title: string
    author: string
    status: string
    rating_avg: number
    rating_count: number
    read_count: number
    published_at: number | null
    created_at: number
  }>
  activities?: Array<{
    id: string
    user_id: string
    type: string
    book_id: string
    created_at: number
  }>
}) {
  const kvStore = new Map<string, string>()
  const dbRows: {
    books: Array<Record<string, unknown>>
    activities: Array<Record<string, unknown>>
    rankings: Array<Record<string, unknown>>
  } = {
    books: seed.books ? seed.books.map((b) => ({ ...b })) : [],
    activities: seed.activities ? seed.activities.map((a) => ({ ...a })) : [],
    rankings: []
  }

  const prepare = (sql: string) => {
    const chain = {
      _args: [] as unknown[],
      bind(...args: unknown[]) {
        chain._args = args
        return chain
      },
      async first() {
        return null
      },
      async all() {
        const normalized = sql.replace(/\s+/g, ' ').trim()
        if (normalized.includes('FROM books')) {
          // Respect WHERE status = 'published' if present
          if (normalized.includes("status = 'published'")) {
            return { results: dbRows.books.filter((b) => b.status === 'published') }
          }
          return { results: dbRows.books }
        }
        if (normalized.includes('FROM activities')) {
          return { results: dbRows.activities }
        }
        if (normalized.includes('FROM rankings')) {
          return { results: dbRows.rankings }
        }
        return { results: [] }
      },
      async run() {
        const normalized = sql.replace(/\s+/g, ' ').trim()
        if (normalized.startsWith('DELETE FROM rankings')) {
          dbRows.rankings = []
        }
        if (normalized.startsWith('INSERT INTO rankings')) {
          const [id, type, bookId, score, period, updatedAt] = chain._args as [
            string,
            string,
            string,
            number,
            string,
            number
          ]
          dbRows.rankings.push({
            id,
            type,
            book_id: bookId,
            score,
            period,
            updated_at: updatedAt
          })
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
    _kvStore: kvStore,
    _dbRows: dbRows
  }
}

describe('recomputeRankings', () => {
  beforeEach(() => {
    // no shared mutable state
  })

  it('inserts rankings rows for all types and periods', async () => {
    const now = Math.floor(Date.now() / 1000)
    const env = makeEnv({
      books: [
        {
          id: 'b1',
          creator_id: 'c1',
          title: 'Book One',
          author: 'Alice',
          status: 'published',
          rating_avg: 4.5,
          rating_count: 10,
          read_count: 100,
          published_at: now - 60,
          created_at: now - 120
        },
        {
          id: 'b2',
          creator_id: 'c2',
          title: 'Book Two',
          author: 'Bob',
          status: 'published',
          rating_avg: 3.0,
          rating_count: 5,
          read_count: 50,
          published_at: now - 3600,
          created_at: now - 7200
        }
      ]
    })

    await recomputeRankings(env as never)

    // Should have entries for hot, new, rated, trending × daily, weekly, monthly, all_time
    const rankings = env._dbRows.rankings
    const types = ['hot', 'new', 'rated', 'trending']
    const periods = ['daily', 'weekly', 'monthly', 'all_time']

    for (const type of types) {
      for (const period of periods) {
        const found = rankings.filter(
          (r) => r.type === type && r.period === period
        )
        expect(found.length).toBeGreaterThanOrEqual(1)
      }
    }

    // At least one ranking should reference b1 (higher metrics)
    const b1Ranks = rankings.filter((r) => r.book_id === 'b1')
    expect(b1Ranks.length).toBeGreaterThanOrEqual(1)
  })

  it('only includes published books', async () => {
    const now = Math.floor(Date.now() / 1000)
    const env = makeEnv({
      books: [
        {
          id: 'b1',
          creator_id: 'c1',
          title: 'Published',
          author: 'Alice',
          status: 'published',
          rating_avg: 5,
          rating_count: 100,
          read_count: 1000,
          published_at: now - 60,
          created_at: now - 120
        },
        {
          id: 'b2',
          creator_id: 'c2',
          title: 'Draft',
          author: 'Bob',
          status: 'draft',
          rating_avg: 5,
          rating_count: 100,
          read_count: 1000,
          published_at: null,
          created_at: now - 120
        }
      ]
    })

    await recomputeRankings(env as never)

    const bookIds = new Set(env._dbRows.rankings.map((r) => r.book_id as string))
    expect(bookIds.has('b1')).toBe(true)
    expect(bookIds.has('b2')).toBe(false)
  })

  it('orders rated by rating_avg then rating_count', async () => {
    const now = Math.floor(Date.now() / 1000)
    const env = makeEnv({
      books: [
        {
          id: 'b-low',
          creator_id: 'c1',
          title: 'Low',
          author: 'A',
          status: 'published',
          rating_avg: 3,
          rating_count: 1,
          read_count: 0,
          published_at: now - 60,
          created_at: now - 120
        },
        {
          id: 'b-high',
          creator_id: 'c2',
          title: 'High',
          author: 'B',
          status: 'published',
          rating_avg: 5,
          rating_count: 50,
          read_count: 0,
          published_at: now - 60,
          created_at: now - 120
        }
      ]
    })

    await recomputeRankings(env as never)

    const rated = env._dbRows.rankings
      .filter((r) => r.type === 'rated')
      .sort((a, b) => (b.score as number) - (a.score as number))
    expect(rated[0]?.book_id).toBe('b-high')
  })

  it('uses activity volume for trending within the period window', async () => {
    const now = Math.floor(Date.now() / 1000)
    const env = makeEnv({
      books: [
        {
          id: 'b-trend',
          creator_id: 'c1',
          title: 'Trending',
          author: 'A',
          status: 'published',
          rating_avg: 3,
          rating_count: 1,
          read_count: 10,
          published_at: now - 60,
          created_at: now - 120
        },
        {
          id: 'b-quiet',
          creator_id: 'c2',
          title: 'Quiet',
          author: 'B',
          status: 'published',
          rating_avg: 3,
          rating_count: 1,
          read_count: 10,
          published_at: now - 60,
          created_at: now - 120
        }
      ],
      activities: [
        { id: 'a1', user_id: 'u1', type: 'read', book_id: 'b-trend', created_at: now - 10 },
        { id: 'a2', user_id: 'u2', type: 'comment', book_id: 'b-trend', created_at: now - 20 },
        { id: 'a3', user_id: 'u3', type: 'like_book', book_id: 'b-trend', created_at: now - 30 }
      ]
    })

    await recomputeRankings(env as never)

    const trending = env._dbRows.rankings
      .filter((r) => r.type === 'trending')
      .sort((a, b) => (b.score as number) - (a.score as number))
    expect(trending[0]?.book_id).toBe('b-trend')
  })
})
