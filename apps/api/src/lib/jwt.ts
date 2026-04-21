import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode('mythinkread-dev-secret-key-2026')

export async function createToken(payload: { userId: string; username: string; role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<{ userId: string; username: string; role: string }> {
  const { payload } = await jwtVerify(token, SECRET, { clockTolerance: 60 })
  return {
    userId: payload.userId as string,
    username: payload.username as string,
    role: payload.role as string
  }
}
