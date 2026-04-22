import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { generateText, generateContinuation, generateRewrite, generateCoverDescription, moderateContent } from '../lib/ai'
import type { Env } from '../index'

const ai = new Hono<{ Bindings: Env }>()

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

// Auth middleware
ai.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const { verifyToken } = await import('../lib/jwt')
    const payload = await verifyToken(token, c.env)
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'INVALID_TOKEN' }, 401)
  }
})

const generateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  type: z.enum(['chapter', 'outline', 'description']).default('chapter'),
  context: z.string().max(8000).optional(),
  max_tokens: z.number().min(100).max(4000).default(2000),
  temperature: z.number().min(0).max(1).default(0.7)
})

// POST /api/ai/generate
ai.post('/generate', zValidator('json', generateSchema), async (c) => {
  const user = c.get('user') as { userId: string; username: string }
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

    return c.json({
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
  const user = c.get('user') as { userId: string; username: string }
  const { previous_text, direction, max_tokens } = c.req.valid('json')

  const allowed = await checkRateLimit(c.env.KV, `ai:${user.userId}`, 10, 60)
  if (!allowed) {
    return c.json({ error: 'RATE_LIMIT_EXCEEDED' }, 429)
  }

  try {
    const content = await generateContinuation(c.env, previous_text, direction, max_tokens)
    return c.json({ content, tokens_used: content.length, finish_reason: 'stop' })
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
  const user = c.get('user') as { userId: string; username: string }
  const { text, style } = c.req.valid('json')

  const allowed = await checkRateLimit(c.env.KV, `ai:${user.userId}`, 10, 60)
  if (!allowed) {
    return c.json({ error: 'RATE_LIMIT_EXCEEDED' }, 429)
  }

  try {
    const content = await generateRewrite(c.env, text, style)
    return c.json({ content, tokens_used: content.length, finish_reason: 'stop' })
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
  const user = c.get('user') as { userId: string; username: string }
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
    }) as { image: string }

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
