import { useEffect, useState, type ReactNode } from 'react'
import { EngineContext, type EngineState } from './engineContext'
import type { SqlEngine } from './sqlEngine'

export function EngineProvider({ create, children }: { create: () => Promise<SqlEngine>; children: ReactNode }) {
  const [state, setState] = useState<EngineState>({ status: 'starting' })

  useEffect(() => {
    let cancelled = false
    let started: SqlEngine | undefined
    create().then(
      (engine) => {
        started = engine
        if (cancelled) void engine.close()
        else setState({ status: 'ready', engine })
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'failed', message: String(error) })
      },
    )
    return () => {
      cancelled = true
      if (started) void started.close()
    }
  }, [create])

  return <EngineContext.Provider value={state}>{children}</EngineContext.Provider>
}
