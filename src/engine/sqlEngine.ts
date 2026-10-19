import type { Table } from 'apache-arrow'

export type FileSource = File | Uint8Array

export interface SqlEngine {
  run(sql: string): Promise<Table>
  registerFile(name: string, source: FileSource): Promise<void>
  dropFile(name: string): Promise<void>
  readFile(name: string): Promise<Uint8Array>
  insertArrowIpc(tableName: string, ipcBytes: Uint8Array): Promise<void>
  close(): Promise<void>
}

export const engineStartupStatements = [
  'SET autoinstall_known_extensions = false',
  'SET autoload_known_extensions = false',
]
