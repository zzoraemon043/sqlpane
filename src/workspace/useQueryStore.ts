import { useEffect, useState } from 'react'
import { openQueryStore } from '../storage/indexedDbQueryStore'
import { createMemoryQueryStore, type QueryStore } from '../storage/queryStore'

export function useQueryStore() {
  const [store, setStore] = useState<QueryStore>(() => createMemoryQueryStore())
  const [storageProblem, setStorageProblem] = useState(false)

  useEffect(() => {
    let cancelled = false
    const factory = typeof indexedDB === 'undefined' ? undefined : indexedDB
    openQueryStore(factory, () => setStorageProblem(true)).then((opened) => {
      if (!cancelled) setStore(opened)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { store, storageProblem }
}
