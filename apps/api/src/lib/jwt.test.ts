import { describe, it, expect } from 'vitest'
import { createToken, verifyToken } from './jwt'

/**
 * Verifies assertion A1.5-jwt-fail-fast:
 *  - When JWT_SECRET is missing AND ENVIRONMENT === 'production', createToken/verifyToken
 *    must throw rather than silently signing with a hard-coded default.
 *  - With a valid secret, createToken → verifyToken round-trips the payload.
 */
describe('jwt secret handling', () => {
  it('throws in production when JWT_SECRET is missing', async () => {
    const env = { ENVIRONMENT: 'production', JWT_SECRET: '' } as {
      ENVIRONMENT: string
      JWT_SECRET: string
    }
    await expect(
      createToken({ userId: 'u', username: 'u', role: 'reader' }, env)
    ).rejects.toThrow(/JWT_SECRET/)
  })

  it('throws in production when JWT_SECRET is undefined', async () => {
    const env = { ENVIRONMENT: 'production' } as unknown as {
      ENVIRONMENT: string
      JWT_SECRET: string
    }
    await expect(
      createToken({ userId: 'u', username: 'u', role: 'reader' }, env)
    ).rejects.toThrow(/JWT_SECRET/)
  })

  it('round-trips a payload when a secret is provided', async () => {
    const env = { ENVIRONMENT: 'development', JWT_SECRET: 'unit-test-secret' }
    const token = await createToken(
      { userId: 'u1', username: 'alice', role: 'reader' },
      env
    )
    const payload = await verifyToken(token, env)
    expect(payload.userId).toBe('u1')
    expect(payload.username).toBe('alice')
    expect(payload.role).toBe('reader')
  })

  it('allows dev environment with a fallback secret but flags it', async () => {
    // In dev, no throw even if JWT_SECRET is empty. We simply must not crash.
    const env = { ENVIRONMENT: 'development', JWT_SECRET: '' }
    const token = await createToken(
      { userId: 'u2', username: 'bob', role: 'reader' },
      env
    )
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3)
  })

  it('verifyToken in production without JWT_SECRET throws', async () => {
    const env = { ENVIRONMENT: 'production', JWT_SECRET: '' }
    await expect(verifyToken('anything', env)).rejects.toThrow(/JWT_SECRET/)
  })
})
