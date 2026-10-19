import { useCallback, useState } from 'react'
import type { SqlEngine } from '../engine/sqlEngine'
import { describeResult, type QueryResult } from '../results/queryResult'
import type { QueryStore } from '../storage/queryStore'

export type RunState =
  | { status: 'idle' }
  | { status: 'running'; sql: string }
  | { status: 'done'; result: QueryResult }
  | { status: 'error'; sql: string; message: string; elapsedMs: number }

export function useQueryRunner(engine: SqlEngine | undefined, store: QueryStore, onFinished: () => Promise<void>) {
  const [state, setState] = useState<RunState>({ status: 'idle' })

  const run = useCallback(
    async (sql: string) => {
      const trimmed = sql.trim()
      if (!engine || trimmed === '') return
      setState({ status: 'running', sql: trimmed })
      const started = performance.now()
      try {
        const table = await engine.run(trimmed)
        const elapsedMs = performance.now() - started
        const result = describeResult(trimmed, table, elapsedMs)
        setState({ status: 'done', result })
        await store.addHistory({ id: crypto.randomUUID(), sql: trimmed, ranAt: Date.now(), durationMs: elapsedMs, rowCount: result.rowCount })
      } catch (error) {
        const elapsedMs = performance.now() - started
        const message = error instanceof Error ? error.message : String(error)
        setState({ status: 'error', sql: trimmed, message, elapsedMs })
        await store.addHistory({ id: crypto.randomUUID(), sql: trimmed, ranAt: Date.now(), durationMs: elapsedMs, error: message })
      }
      await onFinished()
    },
    [engine, store, onFinished],
  )

  return { state, run }
}
