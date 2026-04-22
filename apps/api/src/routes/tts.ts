import { Hono } from 'hono'
import type { Env } from '../index'

const tts = new Hono<{ Bindings: Env }>()

// Auth middleware
tts.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const { verifyToken } = await import('../lib/jwt')
      const payload = await verifyToken(token, c.env)
      // @ts-ignore
      c.set('user', payload)
    } catch {
      // ignore
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

// POST /api/tts/generate - Generate TTS audio
tts.post('/generate', async (c) => {
  // @ts-ignore
  const user = c.get('user') as { userId: string } | undefined
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

  // Check cache
  const cached = await db.prepare(`
    SELECT * FROM tts_audio_cache 
    WHERE book_id = ? AND chapter_id = ? AND voice_id = ? AND text_hash = ? AND status = 'completed'
  `).bind(book_id || '', chapter_id || '', voice_id, textHash).first()

  if (cached) {
    return c.json({
      id: (cached as any).id,
      status: 'completed',
      audio_url: (cached as any).audio_url,
      duration: (cached as any).duration
    })
  }

  const cacheId = generateUUID()

  // In production, this would call a TTS service (ElevenLabs, Azure TTS, etc.)
  // For now, return a mock response without DB insert (avoiding FK issues)
  const mockAudioUrl = `https://mythinkread-assets.pages.dev/tts/${cacheId}.mp3`
  const mockDuration = Math.ceil(text.length / 5) // ~5 chars per second

  return c.json({
    id: cacheId,
    status: 'completed',
    audio_url: mockAudioUrl,
    duration: mockDuration
  })
})

// GET /api/tts/status/:id - Check TTS status
tts.get('/status/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')

  const record = await db.prepare(`
    SELECT * FROM tts_audio_cache WHERE id = ?
  `).bind(id).first()

  if (!record) {
    return c.json({ error: 'NOT_FOUND' }, 404)
  }

  return c.json({
    id: (record as any).id,
    status: (record as any).status,
    audio_url: (record as any).audio_url,
    duration: (record as any).duration
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
