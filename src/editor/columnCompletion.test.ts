import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import type { TableSummary } from '../catalog/catalog'
import { columnCompletions, columnCompletionSource } from './columnCompletion'

const tables: TableSummary[] = [
  { name: 'orders', columns: [{ name: 'id', type: 'INTEGER', nullable: false }, { name: 'customer', type: 'VARCHAR', nullable: true }] },
  { name: 'people', columns: [{ name: 'id', type: 'INTEGER', nullable: false }] },
]

function complete(doc: string, explicit = false) {
  const state = EditorState.create({ doc })
  return columnCompletionSource(tables)(new CompletionContext(state, doc.length, explicit))
}

describe('column completion', () => {
  it('lists each column once with the tables that have it', () => {
    expect(columnCompletions(tables).map(({ label, detail }) => `${label}:${detail}`)).toEqual(['id:orders, people', 'customer:orders'])
  })

  it('completes the word before the cursor', () => {
    const result = complete('SELECT cus')
    expect(result?.from).toBe(7)
    expect(result?.options.map((option) => option.label)).toContain('customer')
  })

  it('leaves qualified names to the schema completion', () => {
    expect(complete('SELECT orders.cu')).toBeNull()
  })

  it('stays quiet without a word unless asked', () => {
    expect(complete('SELECT ')).toBeNull()
    expect(complete('SELECT ', true)?.from).toBe(7)
  })
})
