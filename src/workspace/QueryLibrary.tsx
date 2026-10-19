import { useCallback, useEffect, useState } from 'react'
import { useMessages } from '../i18n/i18nContext'
import type { HistoryEntry, QueryStore, SavedQuery } from '../storage/queryStore'

interface QueryLibraryProps {
  store: QueryStore
  revision: number
  onPick: (sql: string) => void
}

export function QueryLibrary({ store, revision, onPick }: QueryLibraryProps) {
  const text = useMessages()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [saved, setSaved] = useState<SavedQuery[]>([])

  const reload = useCallback(async () => {
    const [nextHistory, nextSaved] = await Promise.all([store.listHistory(50), store.listSaved()])
    setHistory(nextHistory)
    setSaved(nextSaved)
  }, [store])

  useEffect(() => {
    let cancelled = false
    Promise.all([store.listHistory(50), store.listSaved()]).then(([nextHistory, nextSaved]) => {
      if (cancelled) return
      setHistory(nextHistory)
      setSaved(nextSaved)
    })
    return () => {
      cancelled = true
    }
  }, [store, revision])

  return (
    <div className="query-library">
      <section aria-label={text.savedQueries}>
        <h3>{text.savedQueries}</h3>
        {saved.length === 0 && <p className="muted">{text.noSavedQueries}</p>}
        <ul className="query-list">
          {saved.map((query) => (
            <li key={query.id}>
              <button type="button" className="link" onClick={() => onPick(query.sql)} title={query.sql}>
                {query.name}
              </button>
              <button
                type="button"
                className="small"
                aria-label={`${text.drop} ${query.name}`}
                onClick={async () => {
                  await store.deleteSaved(query.id)
                  await reload()
                }}
              >
                {text.drop}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label={text.history}>
        <h3>{text.history}</h3>
        {history.length === 0 && <p className="muted">{text.noHistory}</p>}
        <ul className="query-list">
          {history.map((entry) => (
            <li key={entry.id} className={entry.error ? 'failed' : undefined}>
              <button type="button" className="link code" onClick={() => onPick(entry.sql)} title={entry.sql}>
                {entry.sql.replace(/\s+/g, ' ').slice(0, 80)}
              </button>
              <span className="muted">
                {new Date(entry.ranAt).toLocaleTimeString()} · {Math.round(entry.durationMs)} ms
              </span>
            </li>
          ))}
        </ul>
        {history.length > 0 && (
          <button
            type="button"
            className="small"
            onClick={async () => {
              await store.clearHistory()
              await reload()
            }}
          >
            {text.clearHistory}
          </button>
        )}
      </section>
    </div>
  )
}
