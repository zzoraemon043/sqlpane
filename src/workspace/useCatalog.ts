import { useCallback, useEffect, useState } from 'react'
import { describeTables, type TableSummary } from '../catalog/catalog'
import type { SqlEngine } from '../engine/sqlEngine'

export function useCatalog(engine: SqlEngine | undefined) {
  const [tables, setTables] = useState<TableSummary[]>([])

  useEffect(() => {
    if (!engine) return
    let cancelled = false
    describeTables(engine).then((described) => {
      if (!cancelled) setTables(described)
    })
    return () => {
      cancelled = true
    }
  }, [engine])

  const refresh = useCallback(async () => {
    if (engine) setTables(await describeTables(engine))
  }, [engine])

  return { tables, refresh }
}
