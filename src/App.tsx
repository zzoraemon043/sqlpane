import { useCallback, useRef, useState } from 'react'
import { dropTable, renameTable } from './catalog/catalog'
import { SqlEditor, type SqlEditorHandle } from './editor/SqlEditor'
import { useEngineState } from './engine/engineContext'
import { useMessages } from './i18n/i18nContext'
import { DropZone } from './workspace/DropZone'
import { ImportProgressBar } from './workspace/ImportProgressBar'
import { OpenFilesButton } from './workspace/OpenFilesButton'
import { OpenOutcomes } from './workspace/OpenOutcomes'
import { QueryLibrary } from './workspace/QueryLibrary'
import { ResultPanel } from './workspace/ResultPanel'
import { SaveQueryForm } from './workspace/SaveQueryForm'
import { TableList } from './workspace/TableList'
import { useCatalog } from './workspace/useCatalog'
import { useFileOpener } from './workspace/useFileOpener'
import { useQueryRunner } from './workspace/useQueryRunner'
import { useQueryStore } from './workspace/useQueryStore'

const starterSql = 'SELECT 42 AS answer;'

export function App() {
  const text = useMessages()
  const engineState = useEngineState()
  const engine = engineState.status === 'ready' ? engineState.engine : undefined
  const { tables, refresh } = useCatalog(engine)
  const { store, storageProblem } = useQueryStore()
  const [libraryRevision, setLibraryRevision] = useState(0)
  const editorRef = useRef<SqlEditorHandle>(null)
  const sqlRef = useRef(starterSql)
  const afterRun = useCallback(async () => {
    await refresh()
    setLibraryRevision((revision) => revision + 1)
  }, [refresh])
  const { state: runState, run } = useQueryRunner(engine, store, afterRun)
  const { openFiles, busyFile, scriptProgress, outcomes, clearOutcomes } = useFileOpener(engine, refresh)
  const runCurrent = useCallback(() => void run(editorRef.current?.runnableText() ?? ''), [run])

  return (
    <DropZone onFiles={(files) => void openFiles(files)} hint={text.dropHint}>
      <div className="app">
        <header className="app-header">
          <h1>sqlpane</h1>
          <p className="tagline">{text.appTagline}</p>
          <OpenFilesButton label={text.openFiles} onFiles={(files) => void openFiles(files)} disabled={!engine} />
        </header>
        {engineState.status !== 'ready' && (
          <p className={engineState.status === 'failed' ? 'error banner' : 'muted banner'} data-testid="engine-status">
            {engineState.status === 'failed' ? `${text.engineFailed} ${engineState.message}` : text.engineStarting}
          </p>
        )}
        {storageProblem && <p className="warning banner">{text.storageUnavailable}</p>}
        <div className="workspace">
          <aside className="sidebar">
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
            <QueryLibrary store={store} revision={libraryRevision} onPick={(sql) => editorRef.current?.setText(sql)} />
          </aside>
          <main className="main">
            {busyFile && (
              <p role="status">
                {text.loading} {busyFile}
              </p>
            )}
            {scriptProgress && <ImportProgressBar progress={scriptProgress} />}
            <OpenOutcomes outcomes={outcomes} onDismiss={clearOutcomes} />
            {tables.length === 0 && <p className="muted">{text.emptyWorkspace}</p>}
            <div className="toolbar">
              <button type="button" className="primary" onClick={runCurrent} disabled={!engine || runState.status === 'running'}>
                {text.run}
              </button>
              <button type="button" onClick={() => editorRef.current?.format()}>
                {text.format}
              </button>
              <SaveQueryForm
                onSave={async (name) => {
                  await store.saveQuery({ id: crypto.randomUUID(), name, sql: sqlRef.current, savedAt: Date.now() })
                  setLibraryRevision((revision) => revision + 1)
                }}
              />
            </div>
            <SqlEditor
              ref={editorRef}
              initialText={starterSql}
              tables={tables}
              label={text.editorLabel}
              placeholder={text.editorPlaceholder}
              onRun={runCurrent}
              onChange={(sql) => {
                sqlRef.current = sql
              }}
            />
            <ResultPanel state={runState} />
          </main>
        </div>
      </div>
    </DropZone>
  )
}
