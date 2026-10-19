import { useMessages } from '../i18n/i18nContext'
import { useOfflineStatus } from './useOfflineStatus'

export function OfflineBadge() {
  const text = useMessages()
  const status = useOfflineStatus(import.meta.env.PROD)
  if (status === 'unsupported') return null
  const label = status === 'ready' ? text.offlineReady : status === 'failed' ? text.offlineFailed : text.offlinePreparing
  return (
    <span className={`offline-badge ${status}`} data-testid="offline-status" data-status={status}>
      {label}
    </span>
  )
}
