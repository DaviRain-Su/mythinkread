import type { Env } from '../index'

export function getDb(env: Env) {
  return env.DB
}

export async function migrate(env: Env) {
  const db = getDb(env)

  // Read migration file via dynamic import with explicit extension handling.
  // Vite handles *.sql?raw, but tsc does not; we cast to avoid TS2307.
  const migration = (await import(
    /* @vite-ignore */
    './migrations/0001_initial.sql?raw' as string
  )) as { default: string }
  const statements = migration.default.split(';').filter((s: string) => s.trim().length > 0)

  for (const statement of statements) {
    await db.exec(statement + ';')
  }

  return { applied: statements.length }
}
