import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { generateText, generateContinuation, generateRewrite, generateCoverDescription, moderateContent } from '../lib/ai'
import type { Env, AuthedUser } from '../index'

const ai = new Hono<{ Bindings: Env; Variables: { user: AuthedUser; jwtPayload: AuthedUser } }>()

/**
 * TTL for AI draft snapshots in KV.
 *
 * Rationale: authors may iterate on a chapter for days/weeks between
 * "generate draft" and "publish book". 30 days gives plenty of room
 * while bounding storage cost. See PRD Task 3.4 — the publish-time
 * human/AI edit-ratio gate relies on these snapshots being present.
 */
const AI_DRAFT_TTL_SECONDS = 30 * 24 * 60 * 60

/**
 * Generate a short, URL-safe draft id. Kept separate from chapter UUIDs
 * because a draft can exist before the chapter row is created.
 */
function generateDraftId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}

/**
 * Persist an AI-generated body under `draft:ai:<id>` with 30d TTL and
 * return the id. Callers forward the id to the client which in turn
 * passes it to `POST /books/:bookId/chapters` so we can look the draft
 * up again at publish time.
 */
async function saveAiDraft(env: Env, body: string): Promise<string> {
  const id = generateDraftId()
  await env.KV.put(`draft:ai:${id}`, body, { expirationTtl: AI_DRAFT_TTL_SECONDS })
  return id
}

// Rate limiting helper
async function checkRateLimit(kv: KVNamespace, key: string, limit: number, window: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000)
  const windowStart = Math.floor(now / window) * window
  const rateKey = `rate:${key}:${windowStart}`

  const current = await kv.get(rateKey)
  const count = current ? parseInt(current) : 0

  if (count >= limit) {
    return false
  }

  await kv.put(rateKey, (count + 1).toString(), { expirationTtl: window })
  return true
}

ai.use('*', requireAuth)

const generateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  type: z.enum(['chapter', 'outline', 'description']).default('chapter'),
  context: z.string().max(8000).optional(),
  max_tokens: z.number().min(100).max(4000).default(2000),
  temperature: z.number().min(0).max(1).default(0.7)
})

// POST /api/ai/generate
ai.post('/generate', zValidator('json', generateSchema), async (c) => {
  const user = c.get('user')
  const { prompt, context, max_tokens, temperature } = c.req.valid('json')

  // Rate limit: 10 requests per minute per user
  const allowed = await checkRateLimit(c.env.KV, `ai:${user.userId}`, 10, 60)
  if (!allowed) {
    return c.json({ error: 'RATE_LIMIT_EXCEEDED' }, 429)
  }

  try {
    const content = await generateText(c.env, {
      prompt,
      context,
      maxTokens: max_tokens,
      temperature
    })

    // Persist the original AI draft so the publish-time edit-ratio gate
    // can compare it to the final author-edited body (PRD Task 3.4).
    const draft_id = await saveAiDraft(c.env, content)

    return c.json({
      draft_id,
      content,
      tokens_used: content.length,
      finish_reason: 'stop'
    })
  } catch (err) {
    console.error('AI generation error:', err)
    return c.json({ error: 'AI_SERVICE_UNAVAILABLE' }, 503)
  }
})

const continueSchema = z.object({
  previous_text: z.string().min(1).max(8000),
  direction: z.string().max(1000).optional(),
  max_tokens: z.number().min(100).max(4000).default(2000)
})

// POST /api/ai/continue
ai.post('/continue', zValidator('json', continueSchema), async (c) => {
  const user = c.get('user')
  const { previous_text, direction, max_tokens } = c.req.valid('json')

  const allowed = await checkRateLimit(c.env.KV, `ai:${user.userId}`, 10, 60)
  if (!allowed) {
    return c.json({ error: 'RATE_LIMIT_EXCEEDED' }, 429)
  }

  try {
    const content = await generateContinuation(c.env, previous_text, direction, max_tokens)
    const draft_id = await saveAiDraft(c.env, content)
    return c.json({ draft_id, content, tokens_used: content.length, finish_reason: 'stop' })
  } catch (err) {
    console.error('AI continuation error:', err)
    return c.json({ error: 'AI_SERVICE_UNAVAILABLE' }, 503)
  }
})

const rewriteSchema = z.object({
  text: z.string().min(1).max(8000),
  style: z.string().min(1).max(100)
})

// POST /api/ai/rewrite
ai.post('/rewrite', zValidator('json', rewriteSchema), async (c) => {
  const user = c.get('user')
  const { text, style } = c.req.valid('json')

  const allowed = await checkRateLimit(c.env.KV, `ai:${user.userId}`, 10, 60)
  if (!allowed) {
    return c.json({ error: 'RATE_LIMIT_EXCEEDED' }, 429)
  }

  try {
    const content = await generateRewrite(c.env, text, style)
    const draft_id = await saveAiDraft(c.env, content)
    return c.json({ draft_id, content, tokens_used: content.length, finish_reason: 'stop' })
  } catch (err) {
    console.error('AI rewrite error:', err)
    return c.json({ error: 'AI_SERVICE_UNAVAILABLE' }, 503)
  }
})

const coverSchema = z.object({
  description: z.string().min(1).max(2000)
})

// POST /api/ai/cover
ai.post('/cover', zValidator('json', coverSchema), async (c) => {
  const user = c.get('user')
  const { description } = c.req.valid('json')

  const allowed = await checkRateLimit(c.env.KV, `ai:${user.userId}`, 10, 60)
  if (!allowed) {
    return c.json({ error: 'RATE_LIMIT_EXCEEDED' }, 429)
  }

  try {
    const prompt = await generateCoverDescription(c.env, description)

    // Generate image using Stable Diffusion
    const imageResponse = await c.env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
      prompt: prompt
    }) as unknown as { image: string }

    // Convert base64 to binary and store in R2
    const imageBuffer = Uint8Array.from(atob(imageResponse.image), c => c.charCodeAt(0))
    const imageKey = `covers/${Date.now()}-${user.userId}.png`
    await c.env.R2.put(imageKey, imageBuffer, {
      httpMetadata: { contentType: 'image/png' }
    })

    // Get public URL
    const imageUrl = `${c.req.url.split('/api')[0]}/assets/${imageKey}`

    return c.json({
      image_url: imageUrl,
      prompt_used: prompt
    })
  } catch (err) {
    console.error('Cover generation error:', err)
    return c.json({ error: 'AI_SERVICE_UNAVAILABLE' }, 503)
  }
})

// POST /api/ai/moderate
ai.post('/moderate', async (c) => {
  const { content } = await c.req.json()

  if (!content || typeof content !== 'string') {
    return c.json({ error: 'INVALID_CONTENT' }, 400)
  }

  const result = await moderateContent(c.env, content)
  return c.json(result)
})

export default ai
