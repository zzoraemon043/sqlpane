import { useState, type DragEvent, type ReactNode } from 'react'

export function DropZone({ onFiles, hint, children }: { onFiles: (files: File[]) => void; hint: string; children: ReactNode }) {
  const [dragging, setDragging] = useState(false)

  function handleDragOver(event: DragEvent) {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    setDragging(true)
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) onFiles(files)
  }

  return (
    <div
      className="drop-zone"
      data-testid="drop-zone"
      onDragOver={handleDragOver}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false)
      }}
      onDrop={handleDrop}
    >
      {children}
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          {hint}
        </div>
      )}
    </div>
  )
}
