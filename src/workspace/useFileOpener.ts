import { useCallback, useState } from 'react'
import type { SqlEngine } from '../engine/sqlEngine'
import type { LoadResult } from '../loaders/loadResult'
import { openFile, UnsupportedFileError, type OpenFileOptions } from '../loaders/openFile'
import { loadSqlJs } from '../loaders/sqlJsBrowser'

export type OpenOutcome =
  | { fileName: string; status: 'loaded'; result: LoadResult }
  | { fileName: string; status: 'unsupported'; reason: UnsupportedFileError['reason'] }
  | { fileName: string; status: 'failed'; message: string }

export type FileHandler = (file: File) => Promise<LoadResult> | undefined

export function useFileOpener(engine: SqlEngine | undefined, onTablesChanged: () => Promise<void>, specialHandler?: FileHandler) {
  const [busyFile, setBusyFile] = useState<string>()
  const [outcomes, setOutcomes] = useState<OpenOutcome[]>([])

  const openFiles = useCallback(
    async (files: readonly File[], options: OpenFileOptions = {}) => {
      if (!engine) return
      const collected: OpenOutcome[] = []
      for (const file of files) {
        setBusyFile(file.name)
        collected.push(await openOne(engine, file, options, specialHandler))
        await onTablesChanged()
      }
      setBusyFile(undefined)
      setOutcomes(collected)
    },
    [engine, onTablesChanged, specialHandler],
  )

  return { openFiles, busyFile, outcomes, clearOutcomes: () => setOutcomes([]) }
}

async function openOne(engine: SqlEngine, file: File, options: OpenFileOptions, specialHandler?: FileHandler): Promise<OpenOutcome> {
  try {
    const special = specialHandler?.(file)
    const result = special ? await special : await openFile({ engine, loadSqlJs }, file, options)
    return { fileName: file.name, status: 'loaded', result }
  } catch (error) {
    if (error instanceof UnsupportedFileError) return { fileName: file.name, status: 'unsupported', reason: error.reason }
    return { fileName: file.name, status: 'failed', message: error instanceof Error ? error.message : String(error) }
  }
}
