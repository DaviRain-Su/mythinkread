import type { Env } from '../index'
import { requireSecret, devMockValue } from './env-guard'

const BUNDLR_NODE = 'https://node1.bundlr.network'
const MAX_RETRIES = 3
const BASE_DELAY_MS = 500

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Upload content to Arweave via Irys REST bundler.
 * Returns the transaction ID.
 *
 * In production, missing BUNDLR_PRIVATE_KEY throws.
 * In dev, missing BUNDLR_PRIVATE_KEY returns a __DEV_MOCK__ tx and logs a warning.
 *
 * We use the Irys/Bundlr HTTP endpoint directly (Workers-compatible):
 *   POST /tx/matic with the raw data and the public key header.
 *   In a real deployment the private key is used client-side to sign;
 *   here we treat BUNDLR_PRIVATE_KEY as the public key for the REST
 *   bundler header `x-irys-public-key` (simplified Workers path).
 */
export async function uploadToArweave(
  env: Env,
  content: string | Uint8Array,
  tags?: Record<string, string>
): Promise<string> {
  const key = requireSecret(env, 'BUNDLR_PRIVATE_KEY')
  if (!key) {
    return devMockValue(16)
  }

  const data = typeof content === 'string' ? new TextEncoder().encode(content) : content

  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'x-irys-public-key': key
  }

  if (tags) {
    headers['x-irys-tags'] = JSON.stringify(tags)
  }

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(`${BUNDLR_NODE}/tx/matic`, {
        method: 'POST',
        headers,
        body: data,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const text = await response.text().catch(() => 'unknown')
        throw new Error(`Arweave upload failed: ${response.status} — ${text}`)
      }

      const result = (await response.json()) as { id: string }
      return result.id
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
        await sleep(delay)
      }
    }
  }

  throw new Error(
    `Arweave upload failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
  )
}

/**
 * Upload JSON to Arweave.
 */
export async function uploadJSONToArweave(
  env: Env,
  data: unknown,
  tags?: Record<string, string>
): Promise<string> {
  const jsonString = JSON.stringify(data, null, 2)
  return uploadToArweave(env, jsonString, tags)
}

/**
 * Get content from Arweave.
 * Uses AbortController + AbortSignal.timeout instead of invalid `timeout` field.
 */
export async function getFromArweave(txId: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  const response = await fetch(`https://arweave.net/${txId}`, {
    signal: controller.signal
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    throw new Error(`Failed to fetch from Arweave: ${txId}`)
  }

  return await response.text()
}

/**
 * Calculate Arweave cost estimate (in USD).
 * ~7-9 USD per GB.
 */
export function estimateArweaveCost(bytes: number): number {
  const GB = 1024 * 1024 * 1024
  const costPerGB = 8 // Average cost in USD
  return (bytes / GB) * costPerGB
}
