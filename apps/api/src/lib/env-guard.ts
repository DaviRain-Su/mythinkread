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

/**
 * Generates a deterministic-looking mock value for development.
 * Prefixes with __DEV_MOCK__ so tests and logs can identify it.
 */
export function devMockValue(length = 44): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(Math.ceil(length / 2))))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `__DEV_MOCK__${hex.slice(0, length)}`
}
