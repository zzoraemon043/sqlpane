import { useEffect, useState } from 'react'
import { registerOfflineSupport, type OfflineStatus } from './offlineSupport'

export function useOfflineStatus(enabled: boolean): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>(enabled ? 'preparing' : 'unsupported')

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    registerOfflineSupport(import.meta.env.BASE_URL).then(
      (next) => {
        if (!cancelled) setStatus(next)
      },
      () => {
        if (!cancelled) setStatus('failed')
      },
    )
    return () => {
      cancelled = true
    }
  }, [enabled])

  return status
}
