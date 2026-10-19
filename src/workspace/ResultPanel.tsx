import { useMessages } from '../i18n/i18nContext'
import { ResultGrid } from '../results/ResultGrid'
import type { RunState } from './useQueryRunner'

export function ResultPanel({ state }: { state: RunState }) {
  const text = useMessages()
  if (state.status === 'idle') return null
  if (state.status === 'running') return <p role="status">{text.running}</p>
  if (state.status === 'error') {
    return (
      <div className="query-error" role="alert">
        <strong>{text.queryFailed}</strong>
        <pre>{state.message}</pre>
      </div>
    )
  }
  const { result } = state
  return (
    <div className="result-panel">
      <ResultGrid key={result.id} result={result} />
    </div>
  )
}
