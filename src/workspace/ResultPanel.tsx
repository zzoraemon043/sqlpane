import { useState } from 'react'
import { ChartPanel } from '../charts/ChartPanel'
import { useMessages } from '../i18n/i18nContext'
import type { QueryResult } from '../results/queryResult'
import { ResultGrid } from '../results/ResultGrid'
import { ExportButtons } from './ExportButtons'
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
  return <ResultTabs key={state.result.id} result={state.result} />
}

function ResultTabs({ result }: { result: QueryResult }) {
  const text = useMessages()
  const [view, setView] = useState<'table' | 'chart'>('table')
  const [rows, setRows] = useState<Int32Array>(() => Int32Array.from({ length: result.rowCount }, (_, index) => index))
  return (
    <div className="result-panel">
      <div className="result-toolbar">
        <div role="tablist" aria-label={text.resultView} className="tabs">
          <button type="button" role="tab" aria-selected={view === 'table'} onClick={() => setView('table')}>
            {text.viewTable}
          </button>
          <button type="button" role="tab" aria-selected={view === 'chart'} onClick={() => setView('chart')}>
            {text.viewChart}
          </button>
        </div>
        <ExportButtons result={result} rows={rows} />
      </div>
      <div hidden={view !== 'table'} className="result-view">
        <ResultGrid result={result} onViewChange={setRows} />
      </div>
      {view === 'chart' && <ChartPanel result={result} rows={rows} />}
    </div>
  )
}
