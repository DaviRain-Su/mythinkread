import { Hono } from 'hono'
import type { Env } from '../index'

const rankings = new Hono<{ Bindings: Env }>()

// GET /api/rankings/:type - Get rankings
rankings.get('/:type', async (c) => {
  const db = c.env.DB
  const type = c.req.param('type')
  const period = c.req.query('period') || 'weekly'
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)

  // Validate type
  const validTypes = ['hot', 'new', 'rated', 'trending']
  if (!validTypes.includes(type)) {
    return c.json({ error: 'INVALID_TYPE' }, 400)
  }

  // Validate period
  const validPeriods = ['daily', 'weekly', 'monthly', 'all_time']
  if (!validPeriods.includes(period)) {
    return c.json({ error: 'INVALID_PERIOD' }, 400)
  }

  // For new books, use created_at
  if (type === 'new') {
    const results = await db.prepare(`
      SELECT b.*, c.display_name as creator_name
      FROM books b
      JOIN creators c ON b.creator_id = c.id
      WHERE b.status = 'published'
      ORDER BY b.published_at DESC
      LIMIT ?
    `).bind(limit).all()

    return c.json({
      type,
      period,
      items: results.results || []
    })
  }

  // For rated books, use rating_avg
  if (type === 'rated') {
    const results = await db.prepare(`
      SELECT b.*, c.display_name as creator_name
      FROM books b
      JOIN creators c ON b.creator_id = c.id
      WHERE b.status = 'published' AND b.rating_count > 0
      ORDER BY b.rating_avg DESC, b.rating_count DESC
      LIMIT ?
    `).bind(limit).all()

    return c.json({
      type,
      period,
      items: results.results || []
    })
  }

  // For hot/trending, use read_count and other metrics
  const results = await db.prepare(`
    SELECT b.*, c.display_name as creator_name
    FROM books b
    JOIN creators c ON b.creator_id = c.id
    WHERE b.status = 'published'
    ORDER BY b.read_count DESC, b.rating_avg DESC
    LIMIT ?
  `).bind(limit).all()

  return c.json({
    type,
    period,
    items: results.results || []
  })
})

export default rankings
