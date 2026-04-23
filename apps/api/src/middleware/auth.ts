import type { MiddlewareHandler } from 'hono'
import type { Env, AuthedUser } from '../index'

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: { user: AuthedUser; jwtPayload: AuthedUser } }> = async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }
  try {
    const { verifyToken } = await import('../lib/jwt')
    const payload = await verifyToken(header.slice(7), c.env)
    c.set('user', payload as AuthedUser)
    c.set('jwtPayload', payload as AuthedUser)
    await next()
  } catch {
    return c.json({ error: 'INVALID_TOKEN' }, 401)
  }
}

export const requireAdmin: MiddlewareHandler<{ Bindings: Env; Variables: { user: AuthedUser; jwtPayload: AuthedUser } }> = async (c, next) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'FORBIDDEN' }, 403)
  }
  await next()
}
