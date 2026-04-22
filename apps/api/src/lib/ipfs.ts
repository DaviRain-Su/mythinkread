import type { Env } from '../index'
import { requireSecret, devMockValue } from './env-guard'

const PINATA_API = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
const MAX_RETRIES = 3
const BASE_DELAY_MS = 500

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Upload content to IPFS via Pinata.
 * Returns the CID (Content Identifier).
 *
 * In production, missing PINATA_JWT throws.
 * In dev, missing PINATA_JWT returns a __DEV_MOCK__ CID and logs a warning.
 */
export async function uploadToIPFS(
  env: Env,
  content: string | Uint8Array,
  filename: string
): Promise<string> {
  const jwt = requireSecret(env, 'PINATA_JWT')
  if (!jwt) {
    return generateMockCid()
  }

  const formData = new FormData()
  const blob = new Blob([content], { type: 'application/octet-stream' })
  formData.append('file', blob, filename)
  formData.append('pinataMetadata', JSON.stringify({ name: filename }))

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(PINATA_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`
        },
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const text = await response.text().catch(() => 'unknown')
        throw new Error(`IPFS upload failed: ${response.status} — ${text}`)
      }

      const data = (await response.json()) as { IpfsHash: string }
      return data.IpfsHash
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
        await sleep(delay)
      }
    }
  }

  throw new Error(
    `IPFS upload failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
  )
}

/**
 * Get content from IPFS via public gateways.
 * Uses AbortController + AbortSignal.timeout instead of invalid `timeout` field.
 */
export async function getFromIPFS(cid: string): Promise<string> {
  const gateways = [
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`
  ]

  for (const gateway of gateways) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(gateway, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return await response.text()
      }
    } catch {
      continue
    }
  }

  throw new Error(`Failed to fetch content from IPFS: ${cid}`)
}

/**
 * Upload JSON content to IPFS.
 */
export async function uploadJSONToIPFS(
  env: Env,
  data: unknown,
  filename: string
): Promise<string> {
  const jsonString = JSON.stringify(data, null, 2)
  return uploadToIPFS(env, jsonString, filename)
}
