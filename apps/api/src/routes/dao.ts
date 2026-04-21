import { Hono } from 'hono'
import type { Env } from '../index'

const dao = new Hono<{ Bindings: Env }>()

// Auth middleware (optional for reading proposals)
dao.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const { verifyToken } = await import('../lib/jwt')
      const payload = await verifyToken(token)
      // @ts-ignore
      c.set('user', payload)
    } catch {
      // ignore invalid token
    }
  }
  await next()
})

function generateUUID(): string {
  const timestamp = Date.now()
  const timeHex = timestamp.toString(16).padStart(12, '0')
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `${timeHex.slice(0, 8)}-${timeHex.slice(8)}-7${random.slice(0, 3)}-${(parseInt(random.slice(3, 4), 16) & 0x3 | 0x8).toString(16)}${random.slice(4, 7)}-${random.slice(7, 15)}`
}

// GET /api/dao/proposals - List proposals
dao.get('/proposals', async (c) => {
  const db = c.env.DB
  const status = c.req.query('status') || 'active'
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit

  const results = await db.prepare(`
    SELECT p.*, u.username as proposer_name
    FROM proposals p
    JOIN users u ON p.proposer_id = u.id
    WHERE p.status = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(status, limit, offset).all()

  return c.json({ items: results.results || [] })
})

// GET /api/dao/proposals/:id - Get proposal details
dao.get('/proposals/:id', async (c) => {
  const db = c.env.DB
  const proposalId = c.req.param('id')

  const proposal = await db.prepare(`
    SELECT p.*, u.username as proposer_name
    FROM proposals p
    JOIN users u ON p.proposer_id = u.id
    WHERE p.id = ?
  `).bind(proposalId).first()

  if (!proposal) {
    return c.json({ error: 'PROPOSAL_NOT_FOUND' }, 404)
  }

  const votes = await db.prepare(`
    SELECT v.*, u.username
    FROM votes v
    JOIN users u ON v.voter_id = u.id
    WHERE v.proposal_id = ?
    ORDER BY v.created_at DESC
  `).bind(proposalId).all()

  return c.json({
    ...proposal,
    votes: votes.results || []
  })
})

// POST /api/dao/proposals - Create proposal
dao.post('/proposals', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string } | undefined
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }
  const db = c.env.DB
  const { title, description, type, voting_duration_days } = await c.req.json()

  if (!title || !description || !type) {
    return c.json({ error: 'MISSING_FIELDS' }, 400)
  }

  const now = Math.floor(Date.now() / 1000)
  const votingEnd = now + (voting_duration_days || 7) * 86400

  const proposalId = generateUUID()

  await db.prepare(`
    INSERT INTO proposals (id, title, description, type, proposer_id, status, votes_for, votes_against, voting_end_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(proposalId, title, description, type, user.userId, 'active', 0, 0, votingEnd, now).run()

  return c.json({
    id: proposalId,
    title,
    status: 'active',
    voting_end_at: votingEnd
  }, 201)
})

// POST /api/dao/proposals/:id/vote - Vote on proposal
dao.post('/proposals/:id/vote', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string } | undefined
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }
  const db = c.env.DB
  const proposalId = c.req.param('id')
  const { vote_type } = await c.req.json()

  if (!vote_type || !['for', 'against'].includes(vote_type)) {
    return c.json({ error: 'INVALID_VOTE_TYPE' }, 400)
  }

  // Check proposal is active
  const proposal = await db.prepare('SELECT status, voting_end_at FROM proposals WHERE id = ?')
    .bind(proposalId).first()

  if (!proposal) {
    return c.json({ error: 'PROPOSAL_NOT_FOUND' }, 404)
  }

  if ((proposal as any).status !== 'active') {
    return c.json({ error: 'PROPOSAL_NOT_ACTIVE' }, 400)
  }

  if ((proposal as any).voting_end_at < Math.floor(Date.now() / 1000)) {
    return c.json({ error: 'VOTING_ENDED' }, 400)
  }

  const now = Math.floor(Date.now() / 1000)

  try {
    await db.prepare(`
      INSERT INTO votes (id, proposal_id, voter_id, vote_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(generateUUID(), proposalId, user.userId, vote_type, now).run()

    // Update vote counts
    const voteColumn = vote_type === 'for' ? 'votes_for' : 'votes_against'
    await db.prepare(`
      UPDATE proposals SET ${voteColumn} = ${voteColumn} + 1 WHERE id = ?
    `).bind(proposalId).run()

    return c.json({ success: true })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'ALREADY_VOTED' }, 409)
    }
    throw err
  }
})

// POST /api/dao/proposals/:id/execute - Execute passed proposal (admin only)
dao.post('/proposals/:id/execute', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string } | undefined
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }
  const db = c.env.DB
  const proposalId = c.req.param('id')

  // Check admin
  const admin = await db.prepare('SELECT role FROM users WHERE id = ?')
    .bind(user.userId).first()

  if (!admin || (admin as any).role !== 'admin') {
    return c.json({ error: 'FORBIDDEN' }, 403)
  }

  const proposal = await db.prepare('SELECT * FROM proposals WHERE id = ?')
    .bind(proposalId).first()

  if (!proposal) {
    return c.json({ error: 'PROPOSAL_NOT_FOUND' }, 404)
  }

  if ((proposal as any).status !== 'active') {
    return c.json({ error: 'PROPOSAL_NOT_ACTIVE' }, 400)
  }

  const votesFor = (proposal as any).votes_for || 0
  const votesAgainst = (proposal as any).votes_against || 0
  const totalVotes = votesFor + votesAgainst

  // Simple majority
  const passed = totalVotes > 0 && votesFor > votesAgainst

  const now = Math.floor(Date.now() / 1000)

  await db.prepare(`
    UPDATE proposals SET status = ?, executed_at = ? WHERE id = ?
  `).bind(passed ? 'passed' : 'rejected', now, proposalId).run()

  return c.json({
    success: true,
    passed,
    votes_for: votesFor,
    votes_against: votesAgainst
  })
})

export default dao
