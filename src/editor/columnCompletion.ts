import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import type { TableSummary } from '../catalog/catalog'

export function columnCompletions(tables: readonly TableSummary[]): Completion[] {
  const byName = new Map<string, string[]>()
  for (const table of tables) {
    for (const column of table.columns) byName.set(column.name, [...(byName.get(column.name) ?? []), table.name])
  }
  return [...byName.entries()].map(([name, owners]) => ({ label: name, type: 'property', detail: owners.join(', '), boost: -1 }))
}

export function columnCompletionSource(tables: readonly TableSummary[]) {
  const options = columnCompletions(tables)
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/[\p{L}\p{N}_]+/u)
    if (!word && !context.explicit) return null
    const before = context.state.sliceDoc(Math.max(0, (word?.from ?? context.pos) - 1), word?.from ?? context.pos)
    if (before === '.') return null
    return { from: word?.from ?? context.pos, options, validFor: /^[\p{L}\p{N}_]*$/u }
  }
}
