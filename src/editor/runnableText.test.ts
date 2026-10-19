import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { runnableTextOf } from './runnableText'

const doc = 'SELECT 1;\nSELECT 2;'

describe('runnable text', () => {
  it('uses the selection when there is one', () => {
    const state = EditorState.create({ doc, selection: EditorSelection.single(7, 8) })
    expect(runnableTextOf(state)).toBe('1')
  })

  it('uses the statement under the cursor otherwise', () => {
    expect(runnableTextOf(EditorState.create({ doc, selection: EditorSelection.cursor(12) }))).toBe('SELECT 2;')
    expect(runnableTextOf(EditorState.create({ doc: '  ', selection: EditorSelection.cursor(1) }))).toBe('')
  })
})
