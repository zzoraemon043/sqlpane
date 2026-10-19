import { useState } from 'react'
import type { TableSummary } from '../catalog/catalog'
import { useMessages } from '../i18n/i18nContext'

interface TableListProps {
  tables: TableSummary[]
  onRename: (from: string, to: string) => Promise<void>
  onDrop: (name: string) => Promise<void>
  onPreview: (name: string) => void
}

export function TableList({ tables, onRename, onDrop, onPreview }: TableListProps) {
  const text = useMessages()
  const [editing, setEditing] = useState<string>()
  if (tables.length === 0) return <p className="muted">{text.noTables}</p>
  return (
    <ul className="table-list" aria-label={text.tables}>
      {tables.map((table) => (
        <li key={table.name}>
          {editing === table.name ? (
            <RenameForm
              initial={table.name}
              onCancel={() => setEditing(undefined)}
              onSubmit={async (name) => {
                await onRename(table.name, name)
                setEditing(undefined)
              }}
            />
          ) : (
            <details className="table-entry">
              <summary>
                <span className="table-name">{table.name}</span>
                <span className="muted"> {table.columns.length}</span>
              </summary>
              <div className="table-actions">
                <button type="button" className="small" onClick={() => onPreview(table.name)} aria-label={`${text.preview} ${table.name}`}>
                  {text.preview}
                </button>
                <button type="button" className="small" onClick={() => setEditing(table.name)} aria-label={`${text.rename} ${table.name}`}>
                  {text.rename}
                </button>
                <button type="button" className="small" onClick={() => onDrop(table.name)} aria-label={`${text.drop} ${table.name}`}>
                  {text.drop}
                </button>
              </div>
              <ul className="column-list" aria-label={text.columnsOf(table.name)}>
                {table.columns.map((column) => (
                  <li key={column.name}>
                    <span className="column-name">{column.name}</span>
                    <span className="column-type">
                      {column.type}
                      {column.nullable ? '' : ' NOT NULL'}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </li>
      ))}
    </ul>
  )
}

function RenameForm({ initial, onSubmit, onCancel }: { initial: string; onSubmit: (name: string) => Promise<void>; onCancel: () => void }) {
  const text = useMessages()
  const [name, setName] = useState(initial)
  const [error, setError] = useState<string>()
  return (
    <form
      className="rename-form"
      onSubmit={async (event) => {
        event.preventDefault()
        try {
          await onSubmit(name)
        } catch (failure) {
          setError(failure instanceof Error ? failure.message.split('\n')[0] : String(failure))
        }
      }}
    >
      <input aria-label={text.renameTable} value={name} autoFocus onChange={(event) => setName(event.target.value)} />
      <button type="submit" className="small">
        {text.save}
      </button>
      <button type="button" className="small" onClick={onCancel}>
        {text.cancel}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
