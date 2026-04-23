import type { Env } from '../index'
import { requireSecret, devMockValue } from './env-guard'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 500

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Lazy-load the Irys uploader so we only import the SDK when needed.
 * This keeps the module graph light and avoids top-level await issues
 * in the Cloudflare Workers runtime.
 */
async function getIrysUploader(key: string) {
  const { Uploader } = await import('@irys/upload')
  const { Solana } = await import('@irys/upload-solana')
  // BUNDLR_PRIVATE_KEY is expected to be a JSON array (Solana keypair bytes)
  const privateKey = JSON.parse(key) as number[]
  const irysUploader = await Uploader(Solana)
    .withWallet(privateKey)
    // Use a public Solana RPC; override via IRYS_SOLANA_RPC if desired.
    .withRpc('https://api.mainnet-beta.solana.com')
  return irysUploader
}

/**
 * Upload content to Arweave via the modern Irys SDK with Solana payment.
 * Returns the transaction ID.
 *
 * In production, missing BUNDLR_PRIVATE_KEY throws.
 * In dev, missing BUNDLR_PRIVATE_KEY returns a __DEV_MOCK__ tx and logs a warning.
 *
 * The BUNDLR_PRIVATE_KEY env var should contain a JSON-serialised Solana
 * keypair (the same format output by `solana-keygen new`). It is used to
 * sign and pay for Irys uploads on Solana mainnet.
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

  // Convert flat Record<string,string> tags to Irys tag array
  const irysTags = tags
    ? Object.entries(tags).map(([name, value]) => ({ name, value }))
    : undefined

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const irysUploader = await getIrysUploader(key)
      // The Irys SDK expects a Buffer (Node.js Buffer) or string, not a plain Uint8Array.
      // In Workers we can create a Buffer-like object via the global Buffer polyfill,
      // but since Cloudflare Workers don't expose Node's Buffer by default we pass the
      // raw Uint8Array cast to `any` — the SDK accepts it at runtime.
      const receipt = await irysUploader.upload(data as unknown as Buffer, { tags: irysTags })
      return receipt.id
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
