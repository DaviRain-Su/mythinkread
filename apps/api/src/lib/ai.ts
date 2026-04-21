import type { Env } from '../index'

export interface AIGenerateOptions {
  prompt: string
  context?: string
  maxTokens?: number
  temperature?: number
}

export async function generateText(env: Env, options: AIGenerateOptions): Promise<string> {
  const { prompt, context = '', maxTokens = 2000, temperature = 0.7 } = options

  const systemPrompt = `You are a creative writing assistant for an AI-native book platform. 
You help authors generate novel chapters, outlines, and creative content.
Write in Chinese unless otherwise specified.
Be creative, engaging, and maintain narrative consistency.`

  const fullPrompt = context
    ? `Previous context:\n${context}\n\nNow write:\n${prompt}`
    : prompt

  try {
    const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullPrompt }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    }) as { response?: string }

    return response.response || ''
  } catch (err) {
    console.error('AI generation failed:', err)
    // Fallback: return a mock response for development
    return `[AI 生成模拟内容] 基于提示: "${prompt.slice(0, 50)}..."\n\n这里是模拟的 AI 生成内容。在生产环境中，这将由 Cloudflare Workers AI 生成真实的创意文本。\n\n提示: ${prompt}`
  }
}

export async function generateContinuation(env: Env, previousText: string, direction?: string, maxTokens = 2000): Promise<string> {
  const prompt = direction
    ? `Continue the following story. Direction: ${direction}\n\nPrevious text:\n${previousText}`
    : `Continue the following story naturally:\n\n${previousText}`

  return generateText(env, { prompt, maxTokens, temperature: 0.8 })
}

export async function generateRewrite(env: Env, text: string, style: string): Promise<string> {
  const prompt = `Rewrite the following text in a ${style} style:\n\n${text}`
  return generateText(env, { prompt, maxTokens: 4000, temperature: 0.9 })
}

export async function generateCoverDescription(env: Env, bookDescription: string): Promise<string> {
  const prompt = `Create a vivid, detailed image generation prompt for a book cover based on this description:\n\n${bookDescription}\n\nThe prompt should be in English and suitable for an AI image generator.`

  return generateText(env, { prompt, maxTokens: 500, temperature: 0.9 })
}

export async function moderateContent(env: Env, content: string): Promise<{ safe: boolean; reason?: string }> {
  try {
    const response = await env.AI.run('@cf/huggingface/distilbert-sst-2-int8', {
      text: content
    }) as { label?: string; score?: number }[]

    const toxic = response.find(r => r.label === 'NEGATIVE')
    if (toxic && toxic.score && toxic.score > 0.8) {
      return { safe: false, reason: 'Content may be toxic or inappropriate' }
    }

    return { safe: true }
  } catch {
    // If moderation fails, allow content (fail open for dev)
    return { safe: true }
  }
}
