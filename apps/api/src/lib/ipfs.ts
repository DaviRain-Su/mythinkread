import type { Env } from '../index'

/**
 * Upload content to IPFS via Pinata
 * Returns the CID (Content Identifier)
 */
export async function uploadToIPFS(env: Env, content: string | Uint8Array, filename: string): Promise<string> {
  const PINATA_JWT = env.PINATA_JWT || ''
  
  if (!PINATA_JWT) {
    // Development fallback: return a mock CID
    console.warn('PINATA_JWT not configured, using mock CID')
    return `Qm${Array.from(crypto.getRandomValues(new Uint8Array(22)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}`
  }

  const formData = new FormData()
  const blob = new Blob([content], { type: 'application/json' })
  formData.append('file', blob, filename)
  formData.append('pinataMetadata', JSON.stringify({ name: filename }))

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PINATA_JWT}`
    },
    body: formData
  })

  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.status}`)
  }

  const data = await response.json() as { IpfsHash: string }
  return data.IpfsHash
}

/**
 * Get content from IPFS via Cloudflare Gateway
 */
export async function getFromIPFS(cid: string): Promise<string> {
  const gateways = [
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`
  ]

  for (const gateway of gateways) {
    try {
      const response = await fetch(gateway, { timeout: 5000 })
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
 * Upload JSON content to IPFS
 */
export async function uploadJSONToIPFS(env: Env, data: unknown, filename: string): Promise<string> {
  const jsonString = JSON.stringify(data, null, 2)
  return uploadToIPFS(env, jsonString, filename)
}
