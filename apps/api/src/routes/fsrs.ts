import { Hono } from 'hono'
import type { Env } from '../index'
import { verifyToken } from '../lib/jwt'
import {
  Grade,
  initState,
  review,
  nextInterval,
  retrievability,
  DEFAULT_WEIGHTS,
  serializeWeights,
  type FSRSState,
} from '../lib/fsrs'

const fsrsRoutes = new Hono<{ Bindings: Env }>()

// Middleware: require auth
fsrsRoutes.use('*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = auth.slice(7)
  const payload = await verifyToken(token, c.env)
  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401)
  }
  c.set('jwtPayload' as never, payload)
  await next()
})

// GET /api/fsrs/cards — list user's memory cards
fsrsRoutes.get('/cards', async (c) => {
  const payload = c.get('jwtPayload' as never) as { userId: string }
  const userId = payload.userId
  const bookId = c.req.query('book_id')
  const dueOnly = c.req.query('due') === '1'
  const now = Math.floor(Date.now() / 1000)

  const db = c.env.DB

  let sql = 'SELECT * FROM memory_cards WHERE user_id = ?'
  const params: (string | number)[] = [userId]

  if (bookId) {
    sql += ' AND book_id = ?'
    params.push(bookId)
  }

  if (dueOnly) {
    sql += ' AND fsrs_next_review <= ?'
    params.push(now)
  }

  sql += ' ORDER BY fsrs_next_review ASC'

  const { results } = await db.prepare(sql).bind(...params).all()

  return c.json({
    items: results || [],
    total: (results || []).length,
  })
})

// POST /api/fsrs/cards — create a new memory card
fsrsRoutes.post('/cards', async (c) => {
  const payload = c.get('jwtPayload' as never) as { userId: string }
  const userId = payload.userId
  const body = await c.req.json()

  const {
    source_type,
    source_id,
    book_id,
    chapter_id,
    front,
    back,
    context,
  } = body

  if (!source_type || !source_id || !front) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  const db = c.env.DB
  const now = Math.floor(Date.now() / 1000)
  const id = crypto.randomUUID()

  // Initialize with Good (grade 3) as default
  const initialState = initState(Grade.Good)

  await db
    .prepare(
      `INSERT INTO memory_cards (
        id, user_id, source_type, source_id, book_id, chapter_id,
        front, back, context,
        fsrs_d, fsrs_s, fsrs_r, fsrs_last_review, fsrs_next_review,
        fsrs_reps, fsrs_lapses, fsrs_state, fsrs_w, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      userId,
      source_type,
      source_id,
      book_id || null,
      chapter_id || null,
      front,
      back || null,
      context || null,
      initialState.d,
      initialState.s,
      initialState.r,
      initialState.lastReview,
      initialState.nextReview,
      initialState.reps,
      initialState.lapses,
      initialState.state,
      serializeWeights(DEFAULT_WEIGHTS),
      now,
      now
    )
    .run()

  return c.json({
    id,
    state: initialState,
  }, 201)
})

// POST /api/fsrs/cards/:id/review — submit a review
fsrsRoutes.post('/cards/:id/review', async (c) => {
  const payload = c.get('jwtPayload' as never) as { userId: string }
  const userId = payload.userId
  const cardId = c.req.param('id')
  const body = await c.req.json()
  const grade = body.grade as Grade

  if (!grade || grade < 1 || grade > 4) {
    return c.json({ error: 'Invalid grade (1-4)' }, 400)
  }

  const db = c.env.DB

  // Get current card state
  const card = await db
    .prepare('SELECT * FROM memory_cards WHERE id = ? AND user_id = ?')
    .bind(cardId, userId)
    .first()

  if (!card) {
    return c.json({ error: 'Card not found' }, 404)
  }

  // Build current state
  const currentState: FSRSState = {
    d: card.fsrs_d as number,
    s: card.fsrs_s as number,
    r: card.fsrs_r as number,
    lastReview: card.fsrs_last_review as number,
    nextReview: card.fsrs_next_review as number,
    reps: card.fsrs_reps as number,
    lapses: card.fsrs_lapses as number,
    state: card.fsrs_state as number,
  }

  // Deserialize weights
  const weights = JSON.parse((card.fsrs_w as string) || '[]')
  const effectiveWeights = weights.length >= 21 ? weights : DEFAULT_WEIGHTS

  // Calculate review result
  const result = review(currentState, grade, effectiveWeights)
  const now = Math.floor(Date.now() / 1000)

  // Update card
  await db
    .prepare(
      `UPDATE memory_cards SET
        fsrs_d = ?, fsrs_s = ?, fsrs_r = ?,
        fsrs_last_review = ?, fsrs_next_review = ?,
        fsrs_reps = ?, fsrs_lapses = ?, fsrs_state = ?,
        updated_at = ?
      WHERE id = ?`
    )
    .bind(
      result.state.d,
      result.state.s,
      result.state.r,
      result.state.lastReview,
      result.state.nextReview,
      result.state.reps,
      result.state.lapses,
      result.state.state,
      now,
      cardId
    )
    .run()

  // Log review
  const reviewId = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO fsrs_reviews (
        id, card_id, user_id, grade, elapsed_days, scheduled_days,
        fsrs_d_before, fsrs_s_before, fsrs_r_before,
        fsrs_d_after, fsrs_s_after, fsrs_r_after,
        reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      reviewId,
      cardId,
      userId,
      grade,
      result.elapsedDays,
      result.scheduledDays,
      currentState.d,
      currentState.s,
      currentState.r,
      result.state.d,
      result.state.s,
      result.state.r,
      now
    )
    .run()

  return c.json({
    card_id: cardId,
    grade,
    result,
    new_state: result.state,
  })
})

// GET /api/fsrs/due — get today's due cards with stats
fsrsRoutes.get('/due', async (c) => {
  const payload = c.get('jwtPayload' as never) as { userId: string }
  const userId = payload.userId
  const now = Math.floor(Date.now() / 1000)
  const db = c.env.DB

  // Get due cards
  const { results: dueCards } = await db
    .prepare(
      `SELECT * FROM memory_cards
       WHERE user_id = ? AND fsrs_next_review <= ?
       ORDER BY fsrs_next_review ASC
       LIMIT 50`
    )
    .bind(userId, now)
    .all()

  // Get stats
  const { results: stats } = await db
    .prepare(
      `SELECT
        COUNT(*) as total_cards,
        SUM(CASE WHEN fsrs_next_review <= ? THEN 1 ELSE 0 END) as due_now,
        SUM(CASE WHEN fsrs_next_review <= ? + 86400 THEN 1 ELSE 0 END) as due_tomorrow,
        AVG(fsrs_d) as avg_difficulty,
        AVG(fsrs_s) as avg_stability
      FROM memory_cards WHERE user_id = ?`
    )
    .bind(now, now, userId)
    .all()

  return c.json({
    due_cards: dueCards || [],
    stats: stats?.[0] || {},
    today: new Date(now * 1000).toISOString().split('T')[0],
  })
})

// DELETE /api/fsrs/cards/:id
fsrsRoutes.delete('/cards/:id', async (c) => {
  const payload = c.get('jwtPayload' as never) as { userId: string }
  const userId = payload.userId
  const cardId = c.req.param('id')

  await c.env.DB
    .prepare('DELETE FROM memory_cards WHERE id = ? AND user_id = ?')
    .bind(cardId, userId)
    .run()

  return c.json({ success: true })
})

// POST /api/fsrs/cards/:id/suspend — suspend/resume card
fsrsRoutes.post('/cards/:id/suspend', async (c) => {
  const payload = c.get('jwtPayload' as never) as { userId: string }
  const userId = payload.userId
  const cardId = c.req.param('id')
  const body = await c.req.json()
  const suspended = body.suspended ?? true

  // Set next_review to far future if suspended
  const nextReview = suspended
    ? Math.floor(Date.now() / 1000) + 365 * 86400 // 1 year
    : Math.floor(Date.now() / 1000)

  await c.env.DB
    .prepare('UPDATE memory_cards SET fsrs_next_review = ? WHERE id = ? AND user_id = ?')
    .bind(nextReview, cardId, userId)
    .run()

  return c.json({ success: true, suspended })
})

export default fsrsRoutes
