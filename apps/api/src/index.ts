import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import authRoutes from './routes/auth'
import aiRoutes from './routes/ai'
import bookRoutes from './routes/books'
import commentRoutes from './routes/comments'
import booklistRoutes from './routes/booklists'
import rankingRoutes from './routes/rankings'
import exportRoutes from './routes/export'
import socialRoutes from './routes/social'
import annotationRoutes from './routes/annotations'
import ratingRoutes from './routes/ratings'
import searchRoutes from './routes/search'
import notificationRoutes from './routes/notifications'
import solanaRoutes from './routes/solana'
import paymentRoutes from './routes/payments'
import recommendationRoutes from './routes/recommendations'
import i18nRoutes from './routes/i18n'
import adminRoutes from './routes/admin'
import analyticsRoutes from './routes/analytics'

import publicDomainRoutes from './routes/public-domain'
import blogRoutes from './routes/blog'
import collaborateRoutes from './routes/collaborate'
import ttsRoutes from './routes/tts'
import fsrsRoutes from './routes/fsrs'
import wikiRoutes from './routes/wiki'
import voiceRoutes from './routes/voice'

export interface Env {
  DB: D1Database
  KV: KVNamespace
  R2: R2Bucket
  QUEUE: Queue
  AI: Ai
  JWT_SECRET: string
  PINATA_JWT: string
  BUNDLR_PRIVATE_KEY: string
}

const app = new Hono<{ Bindings: Env }>()

app.use(logger())
app.use(cors({
  origin: ['http://localhost:3000', 'https://mythinkread.pages.dev'],
  credentials: true
}))

app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }))

app.route('/api/auth', authRoutes)
app.route('/api/ai', aiRoutes)
app.route('/api/books', bookRoutes)
app.route('/api/comments', commentRoutes)
app.route('/api/booklists', booklistRoutes)
app.route('/api/rankings', rankingRoutes)
app.route('/api/export', exportRoutes)
app.route('/api/social', socialRoutes)
app.route('/api/annotations', annotationRoutes)
app.route('/api/ratings', ratingRoutes)
app.route('/api/search', searchRoutes)
app.route('/api/notifications', notificationRoutes)
app.route('/api/solana', solanaRoutes)
app.route('/api/payments', paymentRoutes)
app.route('/api/recommendations', recommendationRoutes)
app.route('/api/i18n', i18nRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/analytics', analyticsRoutes)
app.route('/api/public-domain', publicDomainRoutes)
app.route('/api/blog', blogRoutes)
app.route('/api/collaborate', collaborateRoutes)
app.route('/api/tts', ttsRoutes)
app.route('/api/fsrs', fsrsRoutes)
app.route('/api/wiki', wikiRoutes)
app.route('/api/voice', voiceRoutes)

export default app
