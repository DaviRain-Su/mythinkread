import type { Env } from '../index'

export type RankingType = 'hot' | 'new' | 'rated' | 'trending'
export type RankingPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time'

const RANKING_TYPES: RankingType[] = ['hot', 'new', 'rated', 'trending']
const PERIODS: RankingPeriod[] = ['daily', 'weekly', 'monthly', 'all_time']

function periodSeconds(period: RankingPeriod): number {
  const now = Math.floor(Date.now() / 1000)
  switch (period) {
    case 'daily':
      return now - 24 * 60 * 60
    case 'weekly':
      return now - 7 * 24 * 60 * 60
    case 'monthly':
      return now - 30 * 24 * 60 * 60
    case 'all_time':
      return 0
  }
}

function generateUUID(): string {
  const timestamp = Date.now()
  const timeHex = timestamp.toString(16).padStart(12, '0')
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${timeHex.slice(0, 8)}-${timeHex.slice(8)}-7${random.slice(0, 3)}-${(parseInt(random.slice(3, 4), 16) & 0x3 | 0x8).toString(16)}${random.slice(4, 7)}-${random.slice(7, 15)}`
}

interface BookRow {
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
}

interface ActivityRow {
  id: string
  user_id: string
  type: string
  book_id: string
  created_at: number
}

/**
 * Recompute rankings for all types and periods.
 *
 * Strategy:
 *   - new:   ORDER BY published_at DESC
 *   - rated: ORDER BY rating_avg DESC, rating_count DESC
 *   - hot:   ORDER BY read_count DESC, rating_avg DESC
 *   - trending: weighted activity volume within the period window
 */
export async function recomputeRankings(env: Env): Promise<void> {
  const db = env.DB
  const now = Math.floor(Date.now() / 1000)

  // Load all published books
  const booksRes = await db
    .prepare(`SELECT * FROM books WHERE status = 'published'`)
    .all<BookRow>()
  const books = (booksRes.results ?? []) as BookRow[]

  // Load all activities (lightweight; could be filtered by period in future)
  const activitiesRes = await db
    .prepare(`SELECT * FROM activities`)
    .all<ActivityRow>()
  const activities = (activitiesRes.results ?? []) as ActivityRow[]

  // Pre-compute activity counts per book per period
  const activityCounts = new Map<string, Map<RankingPeriod, number>>()
  for (const act of activities) {
    const bookMap = activityCounts.get(act.book_id) ?? new Map<RankingPeriod, number>()
    for (const period of PERIODS) {
      const cutoff = periodSeconds(period)
      if (act.created_at >= cutoff) {
        bookMap.set(period, (bookMap.get(period) ?? 0) + 1)
      }
    }
    activityCounts.set(act.book_id, bookMap)
  }

  // Clear old rankings
  await db.prepare(`DELETE FROM rankings`).run()

  const limit = 100

  for (const type of RANKING_TYPES) {
    for (const period of PERIODS) {
      let scored: Array<{ book: BookRow; score: number }> = []

      if (type === 'new') {
        scored = books
          .filter((b) => b.published_at !== null)
          .map((b) => ({ book: b, score: b.published_at! }))
          .sort((a, b) => b.score - a.score)
      } else if (type === 'rated') {
        scored = books
          .filter((b) => b.rating_count > 0)
          .map((b) => ({
            book: b,
            score: b.rating_avg * 10000 + b.rating_count
          }))
          .sort((a, b) => b.score - a.score)
      } else if (type === 'hot') {
        scored = books
          .map((b) => ({
            book: b,
            score: b.read_count * 10 + b.rating_avg * 100
          }))
          .sort((a, b) => b.score - a.score)
      } else if (type === 'trending') {
        const cutoff = periodSeconds(period)
        scored = books
          .filter((b) => {
            const counts = activityCounts.get(b.id)
            const count = counts?.get(period) ?? 0
            return count > 0 || b.published_at === null || b.published_at >= cutoff
          })
          .map((b) => {
            const counts = activityCounts.get(b.id)
            const actCount = counts?.get(period) ?? 0
            const recency = b.published_at && b.published_at > cutoff ? (b.published_at - cutoff) / (now - cutoff + 1) : 0
            return {
              book: b,
              score: actCount * 100 + recency * 50 + b.read_count * 0.1
            }
          })
          .sort((a, b) => b.score - a.score)
      }

      const top = scored.slice(0, limit)
      for (const entry of top) {
        await db
          .prepare(
            `INSERT INTO rankings (id, type, book_id, score, period, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
          )
          .bind(
            generateUUID(),
            type,
            entry.book.id,
            entry.score,
            period,
            now
          )
          .run()
      }
    }
  }
}
