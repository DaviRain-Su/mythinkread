import type { Env } from '../index'
import { getFromIPFS } from './ipfs'
import { getFromArweave } from './arweave'

const KV_CACHE_TTL = 7 * 24 * 60 * 60 // 7 days

/**
 * Get content with multi-level fallback:
 * 1. KV Cache
 * 2. IPFS (hot storage)
 * 3. Arweave (permanent storage)
 * 4. Re-pin to IPFS if recovered from Arweave
 */
export async function getContent(
  env: Env,
  options: {
    cid?: string
    arweaveTx?: string
    cacheKey?: string
  }
): Promise<string> {
  const { cid, arweaveTx, cacheKey } = options

  // Level 1: KV Cache
  if (cacheKey) {
    const cached = await env.KV.get(cacheKey)
    if (cached) {
      console.log(`Cache hit: ${cacheKey}`)
      return cached
    }
  }

  // Level 2: IPFS
  if (cid) {
    try {
      const content = await getFromIPFS(cid)
      console.log(`IPFS hit: ${cid}`)
      // Write back to cache
      if (cacheKey) {
        await env.KV.put(cacheKey, content, { expirationTtl: KV_CACHE_TTL })
      }
      return content
    } catch {
      console.warn(`IPFS miss: ${cid}, falling back to Arweave`)
    }
  }

  // Level 3: Arweave
  if (arweaveTx) {
    try {
      const content = await getFromArweave(arweaveTx)
      console.log(`Arweave hit: ${arweaveTx}`)
      // Write back to cache
      if (cacheKey) {
        await env.KV.put(cacheKey, content, { expirationTtl: KV_CACHE_TTL })
      }
      // TODO: Async re-pin to IPFS
      return content
    } catch {
      console.error(`Arweave miss: ${arweaveTx}`)
    }
  }

  throw new Error('Content not found in any storage layer')
}

/**
 * Get book structured content
 */
export async function getBookContent(env: Env, bookId: string, cid?: string, arweaveTx?: string): Promise<unknown> {
  const cacheKey = `book:content:${bookId}`
  const content = await getContent(env, { cid, arweaveTx, cacheKey })
  return JSON.parse(content)
}

/**
 * Get chapter content
 */
export async function getChapterContent(env: Env, chapterId: string, cid?: string, arweaveTx?: string): Promise<string> {
  const cacheKey = `chapter:content:${chapterId}`
  return getContent(env, { cid, arweaveTx, cacheKey })
}

/**
 * Preload content into cache
 */
export async function preloadContent(env: Env, key: string, content: string): Promise<void> {
  await env.KV.put(key, content, { expirationTtl: KV_CACHE_TTL })
}
