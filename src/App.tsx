import { useState } from 'react'
import { dropTable, renameTable } from './catalog/catalog'
import { useEngineState } from './engine/engineContext'
import { useMessages } from './i18n/i18nContext'
import { DropZone } from './workspace/DropZone'
import { ImportProgressBar } from './workspace/ImportProgressBar'
import { OpenFilesButton } from './workspace/OpenFilesButton'
import { OpenOutcomes } from './workspace/OpenOutcomes'
import { TableList } from './workspace/TableList'
import { useCatalog } from './workspace/useCatalog'
import { useFileOpener } from './workspace/useFileOpener'

export function App() {
  const text = useMessages()
  const engineState = useEngineState()
  const engine = engineState.status === 'ready' ? engineState.engine : undefined
  const { tables, refresh } = useCatalog(engine)
  const { openFiles, busyFile, scriptProgress, outcomes, clearOutcomes } = useFileOpener(engine, refresh)
  const [sql, setSql] = useState('SELECT 42 AS answer')
  const [output, setOutput] = useState('')

  async function runQuery() {
    if (!engine) return
    try {
      const table = await engine.run(sql)
      setOutput(
        JSON.stringify(
          table.toArray().map((row) => row.toJSON()),
          (_, value) => (typeof value === 'bigint' ? value.toString() : value),
        ),
      )
      await refresh()
    } catch (error) {
      setOutput(String(error))
    }
  }

  return (
    <DropZone onFiles={(files) => void openFiles(files)} hint={text.dropHint}>
      <header className="app-header">
        <h1>sqlpane</h1>
        <OpenFilesButton label={text.openFiles} onFiles={(files) => void openFiles(files)} disabled={!engine} />
      </header>
      <p data-testid="engine-status" className="muted">
        {engineState.status === 'starting' ? text.engineStarting : engineState.status === 'failed' ? text.engineFailed : ''}
      </p>
      {busyFile && (
        <p role="status">
          {text.loading} {busyFile}
        </p>
      )}
      {scriptProgress && <ImportProgressBar progress={scriptProgress} />}
      <OpenOutcomes outcomes={outcomes} onDismiss={clearOutcomes} />
      <aside>
        <h2>{text.tables}</h2>
        <TableList
          tables={tables}
          onRename={async (from, to) => {
            if (!engine) return
            await renameTable(engine, from, to)
            await refresh()
          }}
          onDrop={async (name) => {
            if (!engine) return
            await dropTable(engine, name)
            await refresh()
          }}
        />
      </aside>
      <textarea aria-label="SQL" value={sql} onChange={(event) => setSql(event.target.value)} />
      <button type="button" onClick={runQuery} disabled={!engine}>
        Run
      </button>
      <pre data-testid="output">{output}</pre>
    </DropZone>
  )
}
