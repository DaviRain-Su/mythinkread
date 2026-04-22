import type { Env } from '../index'

/**
 * Prod-Strict / Dev-Mock helper.
 *
 * Returns the secret value if present and non-empty.
 * In production, throws immediately if missing.
 * In development, logs a warning and returns null so the caller can mock.
 */
export function requireSecret(env: Env, key: keyof Env): string | null {
  const v = (env as unknown as Record<string, unknown>)[key] as string | undefined
  if (v && v.length > 0) return v

  if (env.ENVIRONMENT === 'production') {
    throw new Error(`Missing required secret: ${String(key)}`)
  }

  console.warn(`⚠️ DEV MOCK: ${String(key)} not configured; using mock.`)
  return null
}
