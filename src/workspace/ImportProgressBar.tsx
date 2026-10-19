import type { ImportProgress } from '../importer/importReport'
import { useMessages } from '../i18n/i18nContext'

export function ImportProgressBar({ progress }: { progress: ImportProgress }) {
  const text = useMessages()
  const total = progress.totalBytes ?? 0
  const percent = total > 0 ? Math.min(100, Math.round((progress.bytesRead / total) * 100)) : 0
  return (
    <div className="import-progress">
      <progress max={100} value={percent} aria-label={text.importProgress} />
      <span>
        {percent}% · {progress.statements.toLocaleString()} {text.statementsRead} · {progress.rowsInserted.toLocaleString()} {text.rowsImported}
      </span>
    </div>
  )
}
