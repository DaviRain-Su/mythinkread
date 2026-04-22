import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

/**
 * Verifies assertion A1.4-password-kdf:
 *  - Uses a salted KDF (bcrypt/PBKDF2) with per-user random salt and work factor ≥ 10
 *  - Storage format includes algorithm, iterations, salt, and hash
 *  - Two users with the same plaintext get different stored hashes
 *  - verifyPassword returns true only for the matching password
 */
describe('password KDF', () => {
  it('produces a structured hash string that includes algorithm, iterations, and salt', async () => {
    const hash = await hashPassword('correct horse battery staple')
    // Format: $<alg>$<iterations>$<saltB64>$<hashB64>  (PBKDF2) or bcrypt $2a$10$...
    expect(hash.startsWith('$')).toBe(true)
    const parts = hash.split('$')
    // First element is empty string (before leading $)
    expect(parts.length).toBeGreaterThanOrEqual(4)
    // Algorithm is pbkdf2 or 2a/2b (bcrypt). Either way, it's NOT the old 64-char hex digest.
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(false)
  })

  it('never produces the old plain SHA-256 64-char hex digest', async () => {
    const hash = await hashPassword('password123')
    expect(hash).not.toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates a different hash for the same password each time (salted)', async () => {
    const pw = 'same-password-twice'
    const h1 = await hashPassword(pw)
    const h2 = await hashPassword(pw)
    expect(h1).not.toBe(h2)
  })

  it('encodes a work factor >= 10 (bcrypt cost or PBKDF2 iterations >= 100000)', async () => {
    const hash = await hashPassword('work-factor-check')
    const parts = hash.split('$')
    // PBKDF2 form: ['', 'pbkdf2-sha256', '100000', '<salt>', '<hash>']
    // bcrypt form: ['', '2a', '10', '<22 salt chars + 31 hash chars>']
    if (parts[1] === 'pbkdf2-sha256') {
      const iters = Number.parseInt(parts[2], 10)
      expect(iters).toBeGreaterThanOrEqual(100000)
    } else {
      // bcrypt
      const cost = Number.parseInt(parts[2], 10)
      expect(cost).toBeGreaterThanOrEqual(10)
    }
  })

  it('verifyPassword returns true for the correct password', async () => {
    const hash = await hashPassword('hunter2')
    const ok = await verifyPassword('hunter2', hash)
    expect(ok).toBe(true)
  })

  it('verifyPassword returns false for a wrong password', async () => {
    const hash = await hashPassword('hunter2')
    const ok = await verifyPassword('hunter3', hash)
    expect(ok).toBe(false)
  })

  it('verifyPassword returns false for obviously malformed stored hashes', async () => {
    const ok = await verifyPassword('anything', 'not-a-valid-hash-string')
    expect(ok).toBe(false)
  })
})
