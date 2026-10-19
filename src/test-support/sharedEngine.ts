import { afterAll, beforeAll } from 'vitest'
import type { SqlEngine } from '../engine/sqlEngine'
import { createNodeEngine } from './nodeEngine'

export function startSharedEngine(): () => SqlEngine {
  let engine: SqlEngine | undefined
  beforeAll(async () => {
    engine = await createNodeEngine()
  })
  afterAll(async () => {
    await engine?.close()
  })
  return () => {
    if (!engine) throw new Error('engine not started')
    return engine
  }
}

export async function selectRows(engine: SqlEngine, sql: string): Promise<Record<string, unknown>[]> {
  const table = await engine.run(sql)
  return table.toArray().map((row) => {
    const plain: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row.toJSON() as Record<string, unknown>)) {
      plain[key] = typeof value === 'bigint' ? Number(value) : value
    }
    return plain
  })
}
