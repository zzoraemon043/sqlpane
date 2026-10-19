import { useRef } from 'react'

export const acceptedFileTypes = '.csv,.tsv,.tab,.txt,.json,.ndjson,.jsonl,.parquet,.xlsx,.db,.sqlite,.sqlite3,.sql'

export function OpenFilesButton({ label, onFiles, disabled }: { label: string; onFiles: (files: File[]) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className="primary" onClick={() => inputRef.current?.click()} disabled={disabled}>
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptedFileTypes}
        hidden
        data-testid="file-input"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length > 0) onFiles(files)
        }}
      />
    </>
  )
}
