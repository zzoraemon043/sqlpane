const knownExtensions = /\.(csv|tsv|tab|txt|json|ndjson|jsonl|parquet|xlsx|db|sqlite|sqlite3|sql)$/i

export function tableNameFromFileName(fileName: string): string {
  const withoutFolders = fileName.split(/[\\/]/).pop() ?? fileName
  const withoutExtension = withoutFolders.replace(knownExtensions, '')
  const trimmed = withoutExtension.trim()
  return trimmed === '' ? 'table' : trimmed
}

export function uniqueTableName(wanted: string, existing: Iterable<string>): string {
  const taken = new Set([...existing].map((name) => name.toLowerCase()))
  if (!taken.has(wanted.toLowerCase())) return wanted
  for (let suffix = 2; ; suffix++) {
    const candidate = `${wanted}_${suffix}`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
}

export function uniqueColumnNames(rawNames: readonly string[]): string[] {
  const used = new Set<string>()
  return rawNames.map((raw, index) => {
    const base = raw.trim() === '' ? `column${index + 1}` : raw.trim()
    let candidate = base
    for (let suffix = 2; used.has(candidate.toLowerCase()); suffix++) candidate = `${base}_${suffix}`
    used.add(candidate.toLowerCase())
    return candidate
  })
}
