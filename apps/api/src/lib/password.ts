/**
 * Password hashing — PBKDF2 via Web Crypto (supported in Cloudflare Workers).
 *
 * Storage format (self-describing so we can rotate algorithms later):
 *     $pbkdf2-sha256$<iterations>$<saltB64>$<hashB64>
 *
 * Work factor: 100,000 iterations of SHA-256 (well above the 10 cost-factor
 * that bcrypt treats as baseline in 2025). Per-user random 16-byte salt.
 *
 * verifyPassword performs a constant-time comparison on the derived bytes.
 */

const ALGORITHM = 'pbkdf2-sha256'
const ITERATIONS = 100_000
const KEY_LEN_BITS = 256 // 32 bytes
const SALT_LEN_BYTES = 16

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LEN_BITS
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN_BYTES))
  const derived = await pbkdf2(password, salt, ITERATIONS)
  return `$${ALGORITHM}$${ITERATIONS}$${bufToB64(salt)}$${bufToB64(derived)}`
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  if (typeof stored !== 'string' || !stored.startsWith('$')) return false
  const parts = stored.split('$')
  // ['', '<alg>', '<iters>', '<saltB64>', '<hashB64>']
  if (parts.length !== 5) return false
  const [, alg, itersStr, saltB64, hashB64] = parts
  if (alg !== ALGORITHM) return false
  const iterations = Number.parseInt(itersStr, 10)
  if (!Number.isFinite(iterations) || iterations < 1) return false

  let salt: Uint8Array
  let expected: Uint8Array
  try {
    salt = b64ToBytes(saltB64)
    expected = b64ToBytes(hashB64)
  } catch {
    return false
  }

  const derived = await pbkdf2(password, salt, iterations)
  return constantTimeEqual(derived, expected)
}
