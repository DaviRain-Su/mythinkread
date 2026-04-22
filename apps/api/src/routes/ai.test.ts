import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Verifies that routes/ai.ts persists the original AI draft under
 * `draft:ai:<id>` with a 30d TTL and returns the id to the client.
 * Used by the F3 / A1.7-ai-ratio-gate publish gate.
 */

vi.mock('../lib/ai', () => ({
  generateText: vi.fn(async () => 'AI generated body'),
  generateContinuation: vi.fn(async () => 'AI continuation body'),
  generateRewrite: vi.fn(async () => 'AI rewrite body'),
  generateCoverDescription: vi.fn(async () => 'cover prompt'),
  moderateContent: vi.fn(async () => ({ safe: true }))
}))

import ai from './ai'
import { createToken } from '../lib/jwt'

function makeEnv() {
  const kvStore = new Map<string, string>()
  const kvPuts: Array<{ key: string; value: string; opts?: unknown }> = []
  return {
    ENVIRONMENT: 'development',
    JWT_SECRET: 'unit-test-secret',
    KV: {
      async get(k: string) {
        return kvStore.get(k) ?? null
      },
      async put(k: string, v: string, opts?: unknown) {
        kvStore.set(k, v)
        kvPuts.push({ key: k, value: v, opts })
      },
      async delete(k: string) {
        kvStore.delete(k)
      }
    },
    _kvStore: kvStore,
    _kvPuts: kvPuts
  }
}

async function authHeader(env: { ENVIRONMENT: string; JWT_SECRET: string }) {
  const token = await createToken(
    { userId: 'user-1', username: 'alice', role: 'creator' },
    env
  )
  return `Bearer ${token}`
}

describe('routes/ai — draft persistence', () => {
  let env: ReturnType<typeof makeEnv>

  beforeEach(() => {
    vi.clearAllMocks()
    env = makeEnv()
  })

  it('POST /generate returns a draft_id and writes draft:ai:<id> with 30d TTL', async () => {
    const auth = await authHeader(env)
    const res = await ai.fetch(
      new Request('http://x/generate', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Write a chapter about dragons.' })
      }),
      env as never
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as { draft_id: string; content: string }
    expect(body.content).toBe('AI generated body')
    expect(typeof body.draft_id).toBe('string')
    expect(body.draft_id.length).toBeGreaterThan(0)

    // KV should have the draft stored under the returned id with a
    // 30-day TTL (60*60*24*30 = 2592000 seconds).
    const draftPut = env._kvPuts.find((p) => p.key === `draft:ai:${body.draft_id}`)
    expect(draftPut).toBeDefined()
    expect(draftPut!.value).toBe('AI generated body')
    expect((draftPut!.opts as { expirationTtl?: number }).expirationTtl).toBe(30 * 24 * 60 * 60)
  })

  it('POST /continue returns a draft_id and stores the body', async () => {
    const auth = await authHeader(env)
    const res = await ai.fetch(
      new Request('http://x/continue', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ previous_text: 'Once upon a time…' })
      }),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { draft_id: string; content: string }
    expect(body.content).toBe('AI continuation body')
    expect(env._kvStore.get(`draft:ai:${body.draft_id}`)).toBe('AI continuation body')
  })

  it('POST /rewrite returns a draft_id and stores the body', async () => {
    const auth = await authHeader(env)
    const res = await ai.fetch(
      new Request('http://x/rewrite', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'A sentence to rewrite.', style: 'whimsical' })
      }),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { draft_id: string; content: string }
    expect(body.content).toBe('AI rewrite body')
    expect(env._kvStore.get(`draft:ai:${body.draft_id}`)).toBe('AI rewrite body')
  })

  it('issues distinct draft_ids across successive calls', async () => {
    const auth = await authHeader(env)
    const mkReq = () =>
      ai.fetch(
        new Request('http://x/generate', {
          method: 'POST',
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'Anything' })
        }),
        env as never
      )
    const [r1, r2] = await Promise.all([mkReq(), mkReq()])
    const [b1, b2] = await Promise.all([r1.json(), r2.json()]) as Array<{ draft_id: string }>
    expect(b1.draft_id).not.toEqual(b2.draft_id)
  })

  it('rejects unauthenticated requests with 401', async () => {
    const res = await ai.fetch(
      new Request('http://x/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'hi' })
      }),
      env as never
    )
    expect(res.status).toBe(401)
  })
})
