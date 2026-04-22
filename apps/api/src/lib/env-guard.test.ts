import { describe, it, expect, vi } from 'vitest'
import { requireSecret } from './env-guard'
import type { Env } from '../index'

function makeEnv(partial: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    KV: {} as KVNamespace,
    R2: {} as R2Bucket,
    QUEUE: {} as Queue,
    AI: {} as Ai,
    JWT_SECRET: 'test',
    PINATA_JWT: 'test',
    BUNDLR_PRIVATE_KEY: 'test',
    ENVIRONMENT: 'development',
    ...partial
  } as Env
}

/**
 * Verifies assertion A1.8-storage-prod-strict (env-guard portion):
 *  - In production, missing secrets throw.
 *  - In dev, missing secrets return null (caller decides mock) and log a warning.
 */
describe('requireSecret', () => {
  it('returns the value when present', () => {
    const env = makeEnv({ ENVIRONMENT: 'development', PINATA_JWT: 'real-jwt' })
    expect(requireSecret(env, 'PINATA_JWT')).toBe('real-jwt')
  })

  it('throws in production when the secret is missing', () => {
    const env = makeEnv({ ENVIRONMENT: 'production', PINATA_JWT: undefined })
    expect(() => requireSecret(env, 'PINATA_JWT')).toThrow(/Missing required secret: PINATA_JWT/)
  })

  it('throws in production when the secret is empty string', () => {
    const env = makeEnv({ ENVIRONMENT: 'production', PINATA_JWT: '' })
    expect(() => requireSecret(env, 'PINATA_JWT')).toThrow(/Missing required secret: PINATA_JWT/)
  })

  it('logs a warning and returns null in development when missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const env = makeEnv({ ENVIRONMENT: 'development', BUNDLR_PRIVATE_KEY: undefined })
    const result = requireSecret(env, 'BUNDLR_PRIVATE_KEY')
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️ DEV MOCK'))
    warnSpy.mockRestore()
  })

  it('logs a warning and returns null when ENVIRONMENT is undefined (defaults to dev)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const env = makeEnv({ ENVIRONMENT: undefined, PINATA_JWT: undefined })
    const result = requireSecret(env, 'PINATA_JWT')
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️ DEV MOCK'))
    warnSpy.mockRestore()
  })
})
