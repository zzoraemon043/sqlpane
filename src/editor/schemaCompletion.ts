import type { SQLNamespace } from '@codemirror/lang-sql'
import type { TableSummary } from '../catalog/catalog'

export function completionSchema(tables: readonly TableSummary[]): SQLNamespace {
  const schema: Record<string, string[]> = {}
  for (const table of tables) schema[table.name] = table.columns.map((column) => column.name)
  return schema
}
