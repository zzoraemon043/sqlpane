import { useState } from 'react'
import type { TableSummary } from '../catalog/catalog'
import { useMessages } from '../i18n/i18nContext'

interface TableListProps {
  tables: TableSummary[]
  onRename: (from: string, to: string) => Promise<void>
  onDrop: (name: string) => Promise<void>
  onSelect?: (name: string) => void
}

export function TableList({ tables, onRename, onDrop, onSelect }: TableListProps) {
  const text = useMessages()
  const [editing, setEditing] = useState<string>()
  if (tables.length === 0) return <p className="muted">{text.noTables}</p>
  return (
    <ul className="table-list">
      {tables.map((table) =>
        editing === table.name ? (
          <li key={table.name}>
            <RenameForm
              initial={table.name}
              onCancel={() => setEditing(undefined)}
              onSubmit={async (name) => {
                await onRename(table.name, name)
                setEditing(undefined)
              }}
            />
          </li>
        ) : (
          <li key={table.name} className="table-list-item">
            <button type="button" className="link" onClick={() => onSelect?.(table.name)}>
              {table.name}
            </button>
            <span className="table-actions">
              <button type="button" className="small" onClick={() => setEditing(table.name)} aria-label={`${text.rename} ${table.name}`}>
                {text.rename}
              </button>
              <button type="button" className="small" onClick={() => onDrop(table.name)} aria-label={`${text.drop} ${table.name}`}>
                {text.drop}
              </button>
            </span>
          </li>
        ),
      )}
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
