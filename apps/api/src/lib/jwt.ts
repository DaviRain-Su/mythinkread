import { SignJWT, jwtVerify } from 'jose'

/**
 * JWT helpers.
 *
 * Security contract:
 *   - When `env.ENVIRONMENT === 'production'`, `env.JWT_SECRET` MUST be set
 *     to a non-empty string. Otherwise createToken / verifyToken throw.
 *   - In development (or test), we allow a stable dev-only fallback so
 *     local runs don't break, but we log a loud warning on first use.
 *
 * Callers pass `env` so we never read `process.env` (Cloudflare Workers
 * provide secrets via the binding object, not via globals).
 */

export type JwtPayload = { userId: string; username: string; role: string }

export type JwtEnv = {
  ENVIRONMENT?: string
  JWT_SECRET?: string
}

/**
 * Accept either a `JwtEnv` object (preferred — from `c.env`) or the raw
 * secret string (legacy call sites). `undefined` is also allowed, in which
 * case we fall through to dev-fallback / production-throw logic.
 */
type SecretArg = JwtEnv | string | undefined

function normalizeEnv(arg: SecretArg): JwtEnv {
  if (arg === undefined) return {}
  if (typeof arg === 'string') {
    return { ENVIRONMENT: undefined, JWT_SECRET: arg }
  }
  return arg
}

const DEV_FALLBACK_SECRET = 'mythinkread-dev-only-insecure-secret-DO-NOT-USE-IN-PROD'
let devWarningLogged = false

function resolveSecret(env?: JwtEnv): Uint8Array {
  const envName = env?.ENVIRONMENT
  const secret = env?.JWT_SECRET
  const inProduction = envName === 'production'

  if (!secret || secret.length === 0) {
    if (inProduction) {
      throw new Error(
        'JWT_SECRET is required in production. Set it via `wrangler secret put JWT_SECRET` before deploying.'
      )
    }
    if (!devWarningLogged) {
      devWarningLogged = true
      console.warn(
        '⚠️ JWT_SECRET is not set — using an insecure dev-only fallback. ' +
          'DO NOT deploy to production without setting JWT_SECRET.'
      )
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET)
  }

  return new TextEncoder().encode(secret)
}

export async function createToken(
  payload: JwtPayload,
  envOrSecret?: SecretArg
): Promise<string> {
  const key = resolveSecret(normalizeEnv(envOrSecret))
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function verifyToken(
  token: string,
  envOrSecret?: SecretArg
): Promise<JwtPayload> {
  const key = resolveSecret(normalizeEnv(envOrSecret))
  const { payload } = await jwtVerify(token, key, { clockTolerance: 60 })
  return {
    userId: payload.userId as string,
    username: payload.username as string,
    role: payload.role as string
  }
}
