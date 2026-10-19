import { useState } from 'react'
import { useMessages } from '../i18n/i18nContext'

export function SaveQueryForm({ onSave }: { onSave: (name: string) => Promise<void> }) {
  const text = useMessages()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}>
        {text.saveQuery}
      </button>
    )
  }
  return (
    <form
      className="inline-form"
      onSubmit={async (event) => {
        event.preventDefault()
        if (name.trim() === '') return
        await onSave(name.trim())
        setName('')
        setOpen(false)
      }}
    >
      <input aria-label={text.queryName} value={name} autoFocus onChange={(event) => setName(event.target.value)} />
      <button type="submit" className="primary">
        {text.save}
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        {text.cancel}
      </button>
    </form>
  )
}
