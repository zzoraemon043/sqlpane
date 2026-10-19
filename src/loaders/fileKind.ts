export type FileKind = 'csv' | 'tsv' | 'json' | 'ndjson' | 'parquet' | 'excel' | 'sqlite' | 'script' | 'backup' | 'unknown'

const kindByExtension: Record<string, FileKind> = {
  csv: 'csv',
  txt: 'csv',
  tsv: 'tsv',
  tab: 'tsv',
  json: 'json',
  ndjson: 'ndjson',
  jsonl: 'ndjson',
  parquet: 'parquet',
  xlsx: 'excel',
  db: 'sqlite',
  sqlite: 'sqlite',
  sqlite3: 'sqlite',
  sql: 'script',
  bak: 'backup',
  mdf: 'backup',
  ldf: 'backup',
  ibd: 'backup',
  frm: 'backup',
}

export function detectFileKind(fileName: string): FileKind {
  const extension = /\.([^.\\/]+)$/.exec(fileName)?.[1]?.toLowerCase() ?? ''
  return kindByExtension[extension] ?? 'unknown'
}

const sqliteMagic = 'SQLite format 3\u0000'

export function hasSqliteHeader(bytes: Uint8Array): boolean {
  if (bytes.length < sqliteMagic.length) return false
  for (let index = 0; index < sqliteMagic.length; index++) {
    if (bytes[index] !== sqliteMagic.charCodeAt(index)) return false
  }
  return true
}
