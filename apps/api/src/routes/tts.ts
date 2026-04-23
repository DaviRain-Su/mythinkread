import { Hono } from 'hono'
import type { Env, AuthedUser } from '../index'
import { requireSecret } from '../lib/env-guard'
import { recordUpload } from '../lib/cost-monitor'

interface TtsCacheRow {
  id?: string
  status?: string
  audio_url?: string
  duration?: number
}

const tts = new Hono<{ Bindings: Env; Variables: { user: AuthedUser; jwtPayload: AuthedUser } }>()

// Auth middleware (optional — sets user if present)
tts.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const { verifyToken } = await import('../lib/jwt')
      const payload = await verifyToken(token, c.env)
      c.set('user', payload as AuthedUser)
      c.set('jwtPayload', payload as AuthedUser)
    } catch {
      // ignore
    }
  }
  await next()
})

import { generateUUID } from '../lib/uuid'

function hashText(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

// GET /api/tts/voices - List available voices
tts.get('/voices', async (c) => {
  return c.json({
    voices: [
      { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', language: 'zh-CN', gender: 'female', style: '自然' },
      { id: 'zh-CN-YunxiNeural', name: '云希', language: 'zh-CN', gender: 'male', style: '自然' },
      { id: 'zh-CN-XiaoyiNeural', name: '晓伊', language: 'zh-CN', gender: 'female', style: '温柔' },
      { id: 'en-US-JennyNeural', name: 'Jenny', language: 'en-US', gender: 'female', style: 'natural' },
      { id: 'en-US-GuyNeural', name: 'Guy', language: 'en-US', gender: 'male', style: 'natural' }
    ]
  })
})

/**
 * Primary TTS path: Cloudflare Workers AI (@cf/microsoft/speecht5-tts).
 * Returns raw audio bytes.
 */
async function generateWithWorkersAI(env: Env, text: string): Promise<Uint8Array> {
  const result = await env.AI.run('@cf/microsoft/speecht5-tts', { text })
  // The binding may return a Uint8Array or an ArrayBuffer depending on runtime.
  if (result instanceof ArrayBuffer) {
    return new Uint8Array(result)
  }
  if (result instanceof Uint8Array) {
    return result
  }
  // Some versions wrap the response in an object with an `audio` field.
  const anyResult = result as unknown as Record<string, unknown>
  if (anyResult.audio instanceof ArrayBuffer) {
    return new Uint8Array(anyResult.audio)
  }
  if (anyResult.audio instanceof Uint8Array) {
    return anyResult.audio as Uint8Array
  }
  throw new Error('Unexpected Workers AI TTS response shape')
}

/**
 * Fallback TTS path: Azure TTS REST API.
 */
async function generateWithAzureTTS(key: string, text: string, voiceId: string): Promise<Uint8Array> {
  const region = 'eastasia'
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voiceId.startsWith('zh') ? 'zh-CN' : 'en-US'}">
      <voice name="${voiceId}">${escapeXml(text)}</voice>
    </speak>
  `
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      'User-Agent': 'MyThinkRead'
    },
    body: ssml.trim()
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Azure TTS failed (${response.status}): ${errText}`)
  }

  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// POST /api/tts/generate - Generate TTS audio
tts.post('/generate', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const db = c.env.DB
  const { book_id, chapter_id, text, voice_id } = await c.req.json()

  if (!text || !voice_id) {
    return c.json({ error: 'MISSING_PARAMS' }, 400)
  }

  const textHash = hashText(text)
  const now = Math.floor(Date.now() / 1000)

  interface TtsCacheRow {
    id?: string
    status?: string
    audio_url?: string
    duration?: number
  }

  // Check cache
  const cached = await db.prepare(`
    SELECT * FROM tts_audio_cache 
    WHERE book_id = ? AND chapter_id = ? AND voice_id = ? AND text_hash = ? AND status = 'completed'
  `).bind(book_id || '', chapter_id || '', voice_id, textHash).first<TtsCacheRow>()

  if (cached) {
    return c.json({
      id: cached.id,
      status: 'completed',
      audio_url: cached.audio_url,
      duration: cached.duration
    })
  }

  const cacheId = generateUUID()
  const r2Key = `tts/${cacheId}.mp3`

  // Insert pending row first so the FK issue is avoided (we don't FK to books/chapters).
  // The schema already has no FK on tts_audio_cache.book_id / chapter_id, so this is safe.
  await db.prepare(`
    INSERT INTO tts_audio_cache (id, book_id, chapter_id, voice_id, text_hash, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(cacheId, book_id || null, chapter_id || null, voice_id, textHash, 'pending', now).run()

  let audioBytes: Uint8Array
  let isMock = false

  try {
    const azureKey = requireSecret(c.env, 'AZURE_TTS_KEY')
    if (azureKey) {
      audioBytes = await generateWithAzureTTS(azureKey, text, voice_id)
    } else {
      audioBytes = await generateWithWorkersAI(c.env, text)
    }
  } catch (err) {
    // In development without keys, fall back to a tiny silent MP3 stub so the flow works end-to-end.
    if (c.env.ENVIRONMENT !== 'production') {
      console.warn(`⚠️ DEV MOCK: TTS generation failed (${(err as Error).message}); using silent stub.`)
      audioBytes = new Uint8Array([0x49, 0x44, 0x33, 0x04])
      isMock = true
    } else {
      await db.prepare(`UPDATE tts_audio_cache SET status = 'failed' WHERE id = ?`).bind(cacheId).run()
      throw err
    }
  }

  // Store in R2
  await c.env.R2.put(r2Key, audioBytes, { httpMetadata: { contentType: 'audio/mpeg' } })

  // Track R2 storage cost.
  await recordUpload(c.env, 'r2', audioBytes.length)

  // Build public URL. In production this should be a custom domain or R2 public bucket URL.
  // We use a convention: if R2_PUBLIC_URL is set in env (not in typings yet), use it;
  // otherwise fall back to a placeholder pattern that the frontend can resolve via a Worker route.
  const publicBase = c.env.R2_PUBLIC_URL || `https://r2.mythinkread.workers.dev`
  const audioUrl = `${publicBase}/${r2Key}`
  const duration = isMock ? Math.ceil(text.length / 5) : estimateDuration(text)

  // Update row to completed
  await db.prepare(`
    UPDATE tts_audio_cache SET status = ?, audio_url = ?, duration = ?, completed_at = ? WHERE id = ?
  `).bind('completed', audioUrl, duration, now, cacheId).run()

  return c.json({
    id: cacheId,
    status: 'completed',
    audio_url: audioUrl,
    duration
  })
})

function estimateDuration(text: string): number {
  // Rough heuristic: ~5 chars per second for CJK, ~12 for Latin.
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || []).length
  const otherCount = text.length - cjkCount
  const seconds = Math.ceil(cjkCount / 5 + otherCount / 12)
  return Math.max(1, seconds)
}

// GET /api/tts/status/:id - Check TTS status
tts.get('/status/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')

  const record = await db.prepare(`
    SELECT * FROM tts_audio_cache WHERE id = ?
  `).bind(id).first<TtsCacheRow>()

  if (!record) {
    return c.json({ error: 'NOT_FOUND' }, 404)
  }

  return c.json({
    id: record.id,
    status: record.status,
    audio_url: record.audio_url,
    duration: record.duration
  })
})

// GET /api/tts/chapter/:chapterId - Get chapter TTS segments
tts.get('/chapter/:chapterId', async (c) => {
  const db = c.env.DB
  const chapterId = c.req.param('chapterId')
  const voiceId = c.req.query('voice_id') || 'zh-CN-XiaoxiaoNeural'

  const segments = await db.prepare(`
    SELECT * FROM tts_audio_cache 
    WHERE chapter_id = ? AND voice_id = ? AND status = 'completed'
    ORDER BY created_at ASC
  `).bind(chapterId, voiceId).all()

  return c.json({ segments: segments.results || [] })
})

export default tts
