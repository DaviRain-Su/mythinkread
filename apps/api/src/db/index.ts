import type { Env } from '../index'

export function getDb(env: Env) {
  return env.DB
}

export async function migrate(env: Env) {
  const db = getDb(env)
  
  // Read migration file
  const migration = await import('./migrations/0001_initial.sql?raw')
  const statements = migration.default.split(';').filter(s => s.trim().length > 0)
  
  for (const statement of statements) {
    await db.exec(statement + ';')
  }
  
  return { applied: statements.length }
}
