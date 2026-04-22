import type { Env } from '../index'

export type StorageKind = 'ipfs' | 'arweave' | 'r2'

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function kvKey(month: string, kind: StorageKind): string {
  return `cost:${month}:${kind}`
}

/**
 * Record an upload of `bytes` for the given storage `kind`.
 * Persists a monthly running total in KV under `cost:<YYYY-MM>:<kind>`.
 */
export async function recordUpload(
  env: Env,
  kind: StorageKind,
  bytes: number
): Promise<void> {
  const month = currentMonthKey()
  const key = kvKey(month, kind)
  const existing = await env.KV.get(key)
  const total = (existing ? parseInt(existing, 10) : 0) + bytes
  await env.KV.put(key, String(total))
}

/**
 * Return the current month's totals for all storage kinds.
 */
export async function getMonthlyTotals(env: Env): Promise<{
  ipfs: number
  arweave: number
  r2: number
  month: string
}> {
  const month = currentMonthKey()
  const kinds: StorageKind[] = ['ipfs', 'arweave', 'r2']
  const totals = { ipfs: 0, arweave: 0, r2: 0, month }

  for (const kind of kinds) {
    const val = await env.KV.get(kvKey(month, kind))
    totals[kind] = val ? parseInt(val, 10) : 0
  }

  return totals
}
