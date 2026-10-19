import { useMessages } from '../i18n/i18nContext'
import type { OpenOutcome } from './useFileOpener'

export function OpenOutcomes({ outcomes, onDismiss }: { outcomes: OpenOutcome[]; onDismiss: () => void }) {
  const text = useMessages()
  if (outcomes.length === 0) return null
  return (
    <section className="notice" role="status" aria-label={text.loadedTables}>
      <ul>
        {outcomes.map((outcome, index) => (
          <li key={`${outcome.fileName}-${index}`}>
            <OutcomeLine outcome={outcome} />
          </li>
        ))}
      </ul>
      <button type="button" className="small" onClick={onDismiss}>
        {text.dismiss}
      </button>
    </section>
  )
}

function OutcomeLine({ outcome }: { outcome: OpenOutcome }) {
  const text = useMessages()
  if (outcome.status === 'loaded') {
    const tables = outcome.result.tables.map((table) => `${table.name} (${table.rowCount.toLocaleString()} ${text.rows})`)
    return (
      <>
        {text.loadedTables} {outcome.fileName}: {tables.join(', ')}
        {outcome.result.warnings.map((warning) => (
          <span key={warning} className="warning">
            {' '}
            {warning}
          </span>
        ))}
      </>
    )
  }
  if (outcome.status === 'unsupported') {
    return (
      <span className="error">
        {outcome.fileName}: {outcome.reason === 'backup' ? text.unsupportedBackup : text.unsupportedUnknown}
      </span>
    )
  }
  return (
    <span className="error">
      {text.loadFailed} {outcome.fileName}: {outcome.message}
    </span>
  )
}
