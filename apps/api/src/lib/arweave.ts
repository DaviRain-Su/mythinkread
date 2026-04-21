import type { Env } from '../index'

/**
 * Upload content to Arweave via Bundlr/Irys
 * Returns the transaction ID
 */
export async function uploadToArweave(env: Env, content: string | Uint8Array, tags?: Record<string, string>): Promise<string> {
  const BUNDLR_NODE = 'https://node1.bundlr.network'
  const BUNDLR_PRIVATE_KEY = env.BUNDLR_PRIVATE_KEY || ''

  if (!BUNDLR_PRIVATE_KEY) {
    // Development fallback: return a mock transaction ID
    console.warn('BUNDLR_PRIVATE_KEY not configured, using mock tx')
    return `mock-tx-${Date.now()}-${Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}`
  }

  // Prepare data
  const data = typeof content === 'string' ? new TextEncoder().encode(content) : content

  // Create transaction
  const response = await fetch(`${BUNDLR_NODE}/tx/matic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Authorization': `Bearer ${BUNDLR_PRIVATE_KEY}`
    },
    body: data
  })

  if (!response.ok) {
    throw new Error(`Arweave upload failed: ${response.status}`)
  }

  const result = await response.json() as { id: string }
  return result.id
}

/**
 * Upload JSON to Arweave
 */
export async function uploadJSONToArweave(env: Env, data: unknown, tags?: Record<string, string>): Promise<string> {
  const jsonString = JSON.stringify(data, null, 2)
  return uploadToArweave(env, jsonString, tags)
}

/**
 * Get content from Arweave
 */
export async function getFromArweave(txId: string): Promise<string> {
  const response = await fetch(`https://arweave.net/${txId}`, {
    timeout: 15000
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch from Arweave: ${txId}`)
  }

  return await response.text()
}

/**
 * Calculate Arweave cost estimate (in USD)
 * ~7-9 USD per GB
 */
export function estimateArweaveCost(bytes: number): number {
  const GB = 1024 * 1024 * 1024
  const costPerGB = 8 // Average cost in USD
  return (bytes / GB) * costPerGB
}
